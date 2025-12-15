"""Knowledge source orchestration for hybrid retrieval.

Coordinates between local vector DB and external knowledge sources
(like Wikipedia) to provide comprehensive context.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any, Callable, Dict, List, Optional

import numpy as np

from .config import WIKIMEDIA_ENABLED
from .cache_manager import wikimedia_cache, cache_key

logger = logging.getLogger(__name__)

# Lazy import to avoid circular dependency
_wikimedia_retriever = None


def should_query_wikimedia(query: str) -> bool:
    """Determine if query would benefit from Wikipedia data.
    
    Args:
        query: User query
        
    Returns:
        True if Wikimedia should be queried
    """
    if not WIKIMEDIA_ENABLED:
        return False
    
    query_lower = query.lower()
    
    # Trigger patterns
    triggers = [
        "what is",
        "who is",
        "define",
        "explain",
        "describe",
        "tell me about",
    ]
    
    # Check if query starts with trigger phrase
    for trigger in triggers:
        if query_lower.startswith(trigger):
            return True
    
    # Check for likely named entities (capitalized multi-word phrases)
    # Exclude single letter words like "I" which are often capitalized for grammar
    words = query.split()
    capitalized = sum(1 for w in words if len(w) > 1 and w[0].isupper())
    if capitalized >= 2:  # At least 2 capitalized words (excluding "I") suggests named entity
        return True
    
    return False


async def search_wikipedia_cached(query: str) -> Optional[dict]:
    """Search Wikipedia with caching.
    
    Args:
        query: Search query
        
    Returns:
        Wikipedia content or None
    """
    global _wikimedia_retriever
    
    if not WIKIMEDIA_ENABLED:
        return None
    
    # Check cache first
    key = cache_key(query)
    cached = wikimedia_cache.get(key)
    if cached is not None:
        logger.debug(f"Wikipedia cache hit for: {query}")
        return cached
    
    logger.debug(f"Wikipedia cache miss for: {query}")
    
    # Lazy import and initialize retriever
    if _wikimedia_retriever is None:
        try:
            from .wikimedia_retriever import WikimediaRetriever
            from .config import (
                WIKIMEDIA_API_ENDPOINT,
                WIKIMEDIA_USER_AGENT,
                WIKIMEDIA_TIMEOUT_SECONDS,
                WIKIMEDIA_MAX_EXTRACT_LENGTH,
                WIKIMEDIA_RATE_LIMIT_CALLS_PER_SECOND,
            )
            
            _wikimedia_retriever = WikimediaRetriever(
                api_endpoint=WIKIMEDIA_API_ENDPOINT,
                user_agent=WIKIMEDIA_USER_AGENT,
                timeout=WIKIMEDIA_TIMEOUT_SECONDS,
                max_extract_length=WIKIMEDIA_MAX_EXTRACT_LENGTH,
                rate_limit=WIKIMEDIA_RATE_LIMIT_CALLS_PER_SECOND,
            )
        except Exception as e:
            logger.error(f"Failed to initialize Wikimedia retriever: {e}")
            return None
    
    # Fetch from API
    try:
        async with _wikimedia_retriever as retriever:
            result = await retriever.search(query)
            
            if result:
                # Cache successful result
                wikimedia_cache.set(key, result)
                logger.info(f"Wikipedia fetch successful: {result.get('title')}")
            
            return result
    except Exception as e:
        logger.error(f"Wikipedia search failed: {e}")
        return None


async def hybrid_retrieve(
    query: str,
    index: Any,
    metas: List[Dict],
    embed_fn: Callable[[List[str]], np.ndarray],
    k: int = 3,
    use_multi_query: bool = False,
    num_query_variations: int = 3,
    bm25: Optional[Any] = None,
    bm25_corpus: Optional[List[List[str]]] = None,
    use_hybrid: bool = True,
    rrf_k: Optional[int] = None,
) -> tuple[list[tuple[float, Dict]], Optional[dict]]:
    """Retrieve from both local DB and Wikipedia in parallel.
    
    Args:
        query: Search query
        index: FAISS index
        metas: Document metadata
        embed_fn: Embedding function
        k: Number of results
        use_multi_query: Enable multi-query retrieval
        num_query_variations: Number of query variations
        bm25: BM25 index
        bm25_corpus: BM25 corpus
        use_hybrid: Enable hybrid retrieval
        rrf_k: RRF constant
        
    Returns:
        Tuple of (local_results, wikipedia_result)
    """
    from .retrieval import retrieve
    
    # Run local and Wikipedia retrieval in parallel
    local_task = asyncio.create_task(
        asyncio.to_thread(
            retrieve,
            query,
            index,
            metas,
            embed_fn,
            k=k,
            use_multi_query=use_multi_query,
            num_query_variations=num_query_variations,
            bm25=bm25,
            bm25_corpus=bm25_corpus,
            use_hybrid=use_hybrid,
            rrf_k=rrf_k,
        )
    )
    
    wiki_result = None
    if should_query_wikimedia(query):
        wiki_task = asyncio.create_task(search_wikipedia_cached(query))
        
        try:
            local_results, wiki_result = await asyncio.gather(
                local_task, wiki_task, return_exceptions=True
            )
            
            # Handle exceptions
            if isinstance(local_results, Exception):
                logger.error(f"Local retrieval failed: {local_results}")
                local_results = []
            
            if isinstance(wiki_result, Exception):
                logger.error(f"Wikipedia retrieval failed: {wiki_result}")
                wiki_result = None
        except Exception as e:
            logger.error(f"Hybrid retrieval failed: {e}")
            local_results = await local_task
            wiki_result = None
    else:
        local_results = await local_task
    
    return local_results, wiki_result


def format_wikipedia_source(wiki_data: dict) -> dict:
    """Format Wikipedia result as a source citation.
    
    Args:
        wiki_data: Wikipedia API response
        
    Returns:
        Formatted source dict compatible with chat response
    """
    return {
        "source": f"Wikipedia: {wiki_data['title']}",
        "page": 0,  # Not applicable for Wikipedia
        "chunk_index": 0,
        "score": 0.95,  # High confidence for Wikipedia
        "text": wiki_data["extract"],
        "source_type": "wikipedia",
        "url": wiki_data["url"],
        "title": wiki_data["title"],
        "license": wiki_data["license"],
        "license_url": wiki_data["license_url"],
        "revid": wiki_data.get("revid"),
        "attribution": (
            f"{wiki_data['title']}. Retrieved from {wiki_data['url']}. "
            f"Licensed under {wiki_data['license']}."
        ),
    }
