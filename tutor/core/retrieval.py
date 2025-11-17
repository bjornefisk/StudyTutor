"""Retrieval and prompting utilities."""
from __future__ import annotations
import logging
import re
from typing import Any, Callable, Dict, List, Optional
import numpy as np

from .config import RRF_K

logger = logging.getLogger(__name__)


def retrieve(
    query: str,
    index: Any,
    metas: List[Dict],
    embed_fn: Callable[[List[str]], np.ndarray],
    k: int = 3,
    use_multi_query: bool = False,
    num_query_variations: int = 3,
    *,
    bm25: Optional[Any] = None,
    bm25_corpus: Optional[List[List[str]]] = None,
    use_hybrid: bool = True,
    rrf_k: Optional[int] = None,
) -> list[tuple[float, Dict]]:
    """
    Retrieve top-k most relevant chunks using FAISS similarity search.
    
    Args:
        query: The user's search query
        index: FAISS index
        metas: Document metadata list
        embed_fn: Embedding function
        k: Number of results to return
        use_multi_query: Whether to use multi-query retrieval
        num_query_variations: Number of query variations to generate
        
    Keyword Args:
        bm25: Optional BM25 index for lexical scoring
        bm25_corpus: Tokenized corpus aligned with metas for BM25 search
        use_hybrid: Toggle to enable/disable hybrid retrieval
        rrf_k: Override Reciprocal Rank Fusion constant

    Returns:
        List of (score, metadata) tuples
    """
    if not query.strip():
        logger.warning("Empty query provided to retrieve()")
        return []
    
    hybrid_enabled = bool(use_hybrid and bm25 is not None and bm25_corpus)
    rrf_constant = rrf_k or RRF_K

    if use_multi_query:
        try:
            from .multi_query import generate_multi_queries, deduplicate_results
            
            queries = generate_multi_queries(query, num_queries=num_query_variations, use_llm=True)
            logger.info("Generated %d query variations for multi-query retrieval", len(queries))
            
            all_results: List[tuple[float, Dict]] = []
            for q in queries:
                results = _single_query_retrieve(
                    q,
                    index,
                    metas,
                    embed_fn,
                    k,
                    hybrid_enabled,
                    bm25,
                    bm25_corpus,
                    rrf_constant,
                )
                all_results.extend(results)
            
            if all_results:
                results = deduplicate_results(all_results, top_k=k)
                logger.info("Multi-query retrieval: %d total results -> %d after deduplication", 
                           len(all_results), len(results))
                return results
            else:
                logger.warning("Multi-query retrieval returned no results, falling back to single query")
        except Exception as exc:
            logger.error("Multi-query retrieval failed: %s, falling back to single query", exc)
    
    return _single_query_retrieve(
        query,
        index,
        metas,
        embed_fn,
        k,
        hybrid_enabled,
        bm25,
        bm25_corpus,
        rrf_constant,
    )


def build_prompt(context_chunks: List[Dict], question: str) -> str:
    """Construct a RAG prompt from retrieved context and user question."""
    if not context_chunks:
        logger.warning("No context chunks provided; building prompt with empty context")
    
    joined = "\n\n---\n\n".join(
        [
            f"Source: {c.get('source', 'Unknown')} (p.{c.get('page', '?')})\n{c.get('text', '')}"
            for c in context_chunks
        ]
    )
    return (
        "You are a helpful tutor. Use ONLY the provided context to answer the question.\n"
        "If unsure, say you don't know. Be concise (2-3 sentences).\n\n"
        f"Context:\n{joined}\n\nQuestion: {question}\nAnswer:"
    )


def _single_query_retrieve(
    query: str,
    index: Any,
    metas: List[Dict],
    embed_fn: Callable[[List[str]], np.ndarray],
    k: int,
    hybrid_enabled: bool,
    bm25: Optional[Any],
    bm25_corpus: Optional[List[List[str]]],
    rrf_constant: int,
) -> list[tuple[float, Dict]]:
    vector_hits = _vector_search(query, index, metas, embed_fn, k)

    lexical_hits: list[tuple[float, Dict]] = []
    if hybrid_enabled and bm25 is not None and bm25_corpus:
        lexical_hits = _lexical_search(query, bm25, metas, k)

    if vector_hits and lexical_hits:
        return _rrf_fuse(vector_hits, lexical_hits, k, rrf_constant)
    if lexical_hits:
        return lexical_hits[:k]
    return vector_hits


def _vector_search(
    query: str,
    index: Any,
    metas: List[Dict],
    embed_fn: Callable[[List[str]], np.ndarray],
    k: int,
) -> list[tuple[float, Dict]]:
    try:
        qv = embed_fn([query])
        sims, ids = index.search(np.asarray(qv, dtype="float32"), k)
    except Exception as exc:
        logger.error("FAISS search failed: %s", exc)
        return []

    results: list[tuple[float, Dict]] = []
    for score, idx in zip(sims[0], ids[0]):
        if idx == -1:
            continue
        if 0 <= idx < len(metas):
            results.append((float(score), metas[idx]))
        else:
            logger.warning("Retrieved index %d out of bounds (total metas: %d)", idx, len(metas))
    return results


def _lexical_search(
    query: str,
    bm25: Any,
    metas: List[Dict],
    k: int,
) -> list[tuple[float, Dict]]:
    tokens = _tokenize(query)
    if not tokens:
        return []

    try:
        scores = bm25.get_scores(tokens)
    except Exception as exc:
        logger.warning("BM25 scoring failed: %s", exc)
        return []

    if scores is None or len(scores) == 0:
        return []

    ranked_indices = np.argsort(scores)[::-1][:k]
    hits: list[tuple[float, Dict]] = []
    for idx in ranked_indices:
        if 0 <= idx < len(metas):
            hits.append((float(scores[idx]), metas[idx]))
    return hits


def _rrf_fuse(
    vector_hits: list[tuple[float, Dict]],
    lexical_hits: list[tuple[float, Dict]],
    k: int,
    rrf_constant: int,
) -> list[tuple[float, Dict]]:
    fused: dict[str, dict[str, Any]] = {}

    def add_contributions(hits: list[tuple[float, Dict]]) -> None:
        for rank, (_, meta) in enumerate(hits, start=1):
            chunk_id = _chunk_identifier(meta)
            if chunk_id not in fused:
                fused[chunk_id] = {"meta": meta, "score": 0.0}
            fused[chunk_id]["score"] += 1.0 / (rrf_constant + rank)

    add_contributions(vector_hits)
    add_contributions(lexical_hits)

    ordered = sorted(
        ((entry["score"], entry["meta"]) for entry in fused.values()),
        key=lambda item: item[0],
        reverse=True,
    )
    return ordered[:k]


def _tokenize(text: str) -> list[str]:
    if not text:
        return []
    return [token.lower() for token in re.findall(r"[A-Za-z0-9_]+", text)]


def _chunk_identifier(meta: Dict) -> str:
    chunk_id = meta.get("id")
    if chunk_id:
        return str(chunk_id)
    return f"{meta.get('source', '')}_{meta.get('page', 0)}_{meta.get('chunk_index', 0)}"
