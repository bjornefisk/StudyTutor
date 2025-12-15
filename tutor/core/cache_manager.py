"""Cache manager for external API responses."""
from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timedelta
from typing import Optional

logger = logging.getLogger(__name__)


class TTLCache:
    """Time-to-live cache with LRU eviction."""
    
    def __init__(self, max_size: int = 500, ttl_seconds: int = 86400):
        """Initialize cache.
        
        Args:
            max_size: Maximum number of entries
            ttl_seconds: Time-to-live in seconds (default 24h)
        """
        self.max_size = max_size
        self.ttl = timedelta(seconds=ttl_seconds)
        self._cache: dict[str, tuple[datetime, dict]] = {}
        self._hits = 0
        self._misses = 0
    
    def get(self, key: str) -> Optional[dict]:
        """Retrieve value from cache.
        
        Args:
            key: Cache key
            
        Returns:
            Cached value or None if expired/missing
        """
        if key not in self._cache:
            self._misses += 1
            return None
        
        timestamp, value = self._cache[key]
        if datetime.now() - timestamp > self.ttl:
            del self._cache[key]
            self._misses += 1
            return None
        
        self._hits += 1
        return value
    
    def set(self, key: str, value: dict) -> None:
        """Store value in cache.
        
        Args:
            key: Cache key
            value: Value to cache
        """
        # LRU eviction if at capacity
        if len(self._cache) >= self.max_size:
            oldest_key = min(self._cache.items(), key=lambda x: x[1][0])[0]
            del self._cache[oldest_key]
            logger.debug(f"Evicted cache entry: {oldest_key}")
        
        self._cache[key] = (datetime.now(), value)
    
    def invalidate(self, key: str) -> None:
        """Remove entry from cache.
        
        Args:
            key: Cache key to invalidate
        """
        self._cache.pop(key, None)
    
    def clear(self) -> None:
        """Clear all cache entries."""
        self._cache.clear()
        self._hits = 0
        self._misses = 0
        logger.info("Cache cleared")
    
    def stats(self) -> dict:
        """Get cache statistics.
        
        Returns:
            Dictionary with hit/miss counts and ratio
        """
        total = self._hits + self._misses
        hit_ratio = self._hits / total if total > 0 else 0.0
        
        return {
            "hits": self._hits,
            "misses": self._misses,
            "total_requests": total,
            "hit_ratio": hit_ratio,
            "size": len(self._cache),
            "max_size": self.max_size,
        }


def cache_key(query: str, action: str = "query", lang: str = "en") -> str:
    """Generate cache key for Wikimedia request.
    
    Args:
        query: Search query
        action: API action
        lang: Language code
        
    Returns:
        SHA256 hash (16 chars)
    """
    payload = f"{action}:{lang}:{query.lower().strip()}"
    return hashlib.sha256(payload.encode()).hexdigest()[:16]


# Global cache instance
wikimedia_cache = TTLCache()
