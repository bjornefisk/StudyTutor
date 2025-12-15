"""Basic tests for Wikimedia integration.

Run with: 
  cd /Users/charliefurlow/Desktop/StudyTutor
  PYTHONPATH=. pytest tests/test_wikimedia.py -v
"""
import sys
from pathlib import Path

# Add project root to Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from tutor.core.wikimedia_retriever import (
    sanitize_search_term,
    clean_wikitext,
    WikimediaRetriever,
    CircuitBreaker,
    RateLimiter,
    CircuitBreakerOpenError,
)
from tutor.core.cache_manager import TTLCache, cache_key
from tutor.core.knowledge_sources import should_query_wikimedia


class TestSanitization:
    """Test input sanitization."""
    
    @pytest.mark.parametrize("dirty,clean", [
        ("[[Albert Einstein]]", "Albert Einstein"),
        ("{{template}}", ""),
        ("<script>alert('xss')</script>", "scriptalert'xss'/script"),
        ("what is   DNA  ", "what is DNA"),
        ("a" * 400, "a" * 300),  # Truncation
    ])
    def test_sanitize_search_term(self, dirty, clean):
        result = sanitize_search_term(dirty)
        assert result == clean or result.startswith(clean[:50])
    
    @pytest.mark.parametrize("text,expected", [
        ("{{infobox}} Text", "Text"),
        ("[[Link|Display]]", "Display"),
        ("[[Target]]", "Target"),
        ("<!-- comment --> Text", "Text"),
    ])
    def test_clean_wikitext(self, text, expected):
        assert clean_wikitext(text).strip() == expected


class TestCacheManager:
    """Test TTL cache."""
    
    def test_cache_get_set(self):
        cache = TTLCache(max_size=10, ttl_seconds=60)
        
        cache.set("key1", {"data": "value1"})
        assert cache.get("key1") == {"data": "value1"}
        assert cache.get("nonexistent") is None
    
    def test_cache_eviction(self):
        cache = TTLCache(max_size=2, ttl_seconds=60)
        
        cache.set("key1", {"data": "v1"})
        cache.set("key2", {"data": "v2"})
        cache.set("key3", {"data": "v3"})  # Should evict key1
        
        assert cache.get("key1") is None
        assert cache.get("key2") == {"data": "v2"}
        assert cache.get("key3") == {"data": "v3"}
    
    def test_cache_stats(self):
        cache = TTLCache()
        
        cache.set("key1", {"data": "v1"})
        cache.get("key1")  # Hit
        cache.get("key2")  # Miss
        
        stats = cache.stats()
        assert stats["hits"] == 1
        assert stats["misses"] == 1
        assert stats["hit_ratio"] == 0.5
    
    def test_cache_key_generation(self):
        key1 = cache_key("Python programming", "query", "en")
        key2 = cache_key("Python programming", "query", "en")
        key3 = cache_key("Python Programming", "query", "en")  # Different case
        key4 = cache_key("Python programming", "parse", "en")  # Different action
        
        assert key1 == key2
        assert key1 == key3  # Case insensitive
        assert key1 != key4  # Different action


class TestCircuitBreaker:
    """Test circuit breaker pattern."""
    
    @pytest.mark.asyncio
    async def test_circuit_opens_after_failures(self):
        circuit = CircuitBreaker(failure_threshold=3, timeout=1)
        
        async def failing_func():
            raise ValueError("Test error")
        
        # First 3 failures
        for _ in range(3):
            with pytest.raises(ValueError):
                await circuit.call(failing_func)
        
        # Circuit should be open now
        with pytest.raises(CircuitBreakerOpenError):
            await circuit.call(failing_func)
    
    @pytest.mark.asyncio
    async def test_circuit_closes_after_success(self):
        import asyncio
        
        circuit = CircuitBreaker(failure_threshold=2, timeout=1, success_threshold=1)
        
        call_count = [0]
        
        async def sometimes_failing():
            call_count[0] += 1
            if call_count[0] <= 2:
                raise ValueError("Failing")
            return "success"
        
        # Fail twice to open circuit
        for _ in range(2):
            with pytest.raises(ValueError):
                await circuit.call(sometimes_failing)
        
        # Wait for timeout
        await asyncio.sleep(1.5)
        
        # Should transition to HALF_OPEN and then CLOSED on success
        result = await circuit.call(sometimes_failing)
        assert result == "success"


class TestRateLimiter:
    """Test rate limiting."""
    
    @pytest.mark.asyncio
    async def test_rate_limiting(self):
        import time
        
        limiter = RateLimiter(calls_per_second=2.0)  # 2 calls/second
        
        start = time.time()
        
        # Make 3 calls
        for _ in range(3):
            await limiter.acquire()
        
        elapsed = time.time() - start
        
        # Should take at least 0.5 seconds (3 calls at 2/sec = 1.5s total, 0.5s wait)
        assert elapsed >= 0.4  # Allow some margin


class TestKnowledgeSources:
    """Test knowledge source routing."""
    
    @pytest.mark.parametrize("query,should_use", [
        ("What is photosynthesis?", True),
        ("Who is Albert Einstein?", True),
        ("Define quantum mechanics", True),
        ("Explain the theory of relativity", True),
        ("Tell me about Marie Curie", True),
        ("How do I fix this bug?", False),
        ("calculate 2 + 2", False),
        ("Einstein Theory", True),  # Capitalized words
    ])
    def test_should_query_wikimedia(self, query, should_use):
        result = should_query_wikimedia(query)
        assert result == should_use


class TestWikimediaRetriever:
    """Test Wikimedia retriever client."""
    
    def test_user_agent_validation(self):
        # Valid User-Agent
        retriever = WikimediaRetriever(
            user_agent="StudyTutorRAG/2.0 (https://example.com; test@example.com)"
        )
        assert retriever.user_agent is not None
        
        # Invalid User-Agent (too short)
        with pytest.raises(ValueError, match="User-Agent"):
            WikimediaRetriever(user_agent="short")
        
        # Invalid User-Agent (no email)
        with pytest.raises(ValueError, match="User-Agent"):
            WikimediaRetriever(user_agent="StudyTutorRAG/2.0 (https://example.com)")
    
    def test_url_building(self):
        retriever = WikimediaRetriever(
            user_agent="StudyTutorRAG/2.0 (https://example.com; test@example.com)"
        )
        
        url = retriever._build_url("query", {
            "titles": "Python",
            "prop": "extracts",
        })
        
        assert "action=query" in url
        assert "titles=Python" in url
        assert "prop=extracts" in url
        assert "format=json" in url
        assert "formatversion=2" in url
    
    def test_invalid_action(self):
        retriever = WikimediaRetriever(
            user_agent="StudyTutorRAG/2.0 (https://example.com; test@example.com)"
        )
        
        with pytest.raises(ValueError, match="not allowed"):
            retriever._build_url("invalid_action", {})
    
    def test_param_whitelist(self):
        retriever = WikimediaRetriever(
            user_agent="StudyTutorRAG/2.0 (https://example.com; test@example.com)"
        )
        
        # Should ignore unknown parameters
        url = retriever._build_url("query", {
            "titles": "Python",
            "unknown_param": "should_be_ignored",
        })
        
        assert "titles=Python" in url
        assert "unknown_param" not in url


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
