"""Retrieval and prompting utilities."""
from __future__ import annotations
import logging
from typing import Any, Callable, Dict, List
import numpy as np

logger = logging.getLogger(__name__)


def retrieve(
    query: str,
    index: Any,
    metas: List[Dict],
    embed_fn: Callable[[List[str]], np.ndarray],
    k: int = 3,
) -> list[tuple[float, Dict]]:
    """Retrieve top-k most relevant chunks using FAISS similarity search."""
    if not query.strip():
        logger.warning("Empty query provided to retrieve()")
        return []
    
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
