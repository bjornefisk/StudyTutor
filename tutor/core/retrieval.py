"""Retrieval and prompting utilities."""
from __future__ import annotations
import logging
from typing import Any, Callable, Dict, List, Optional
import numpy as np

logger = logging.getLogger(__name__)


def retrieve(
    query: str,
    index: Any,
    metas: List[Dict],
    embed_fn: Callable[[List[str]], np.ndarray],
    k: int = 3,
    use_multi_query: bool = False,
    num_query_variations: int = 3,
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
        
    Returns:
        List of (score, metadata) tuples
    """
    if not query.strip():
        logger.warning("Empty query provided to retrieve()")
        return []
    
    # Multi-query retrieval
    if use_multi_query:
        try:
            from .multi_query import generate_multi_queries, deduplicate_results
            
            # Generate query variations
            queries = generate_multi_queries(query, num_queries=num_query_variations, use_llm=True)
            logger.info("Generated %d query variations for multi-query retrieval", len(queries))
            
            # Retrieve results for each query variation
            all_results: List[tuple[float, Dict]] = []
            for q in queries:
                try:
                    qv = embed_fn([q])
                    sims, ids = index.search(np.asarray(qv, dtype="float32"), k)
                    
                    for score, idx in zip(sims[0], ids[0]):
                        if idx == -1:
                            continue
                        if 0 <= idx < len(metas):
                            all_results.append((float(score), metas[idx]))
                except Exception as exc:
                    logger.warning("Query variation '%s' failed: %s", q[:50], exc)
                    continue
            
            # Deduplicate and re-rank
            if all_results:
                results = deduplicate_results(all_results, top_k=k)
                logger.info("Multi-query retrieval: %d total results -> %d after deduplication", 
                           len(all_results), len(results))
                return results
            else:
                logger.warning("Multi-query retrieval returned no results, falling back to single query")
                # Fall through to single query
        except Exception as exc:
            logger.error("Multi-query retrieval failed: %s, falling back to single query", exc)
            # Fall through to single query
    
    # Standard single-query retrieval
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
