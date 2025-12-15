"""Wikimedia API Integration for Knowledge Retrieval.

This module provides a production-ready client for fetching factual content
from Wikipedia/Wiktionary to augment the RAG context window.

Key Features:
- User-Agent policy compliance
- Maxlag handling with automatic retry
- Circuit breaker pattern
- Connection pooling with HTTP/2
- Rate limiting
"""
from __future__ import annotations

import asyncio
import hashlib
import logging
import re
import time
from datetime import datetime, timedelta
from enum import Enum
from typing import Optional
from urllib.parse import quote_plus

logger = logging.getLogger(__name__)

# Will be imported after httpx is installed
try:
    import httpx
except ImportError:
    httpx = None


class CircuitState(Enum):
    """Circuit breaker states."""
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


class CircuitBreakerOpenError(Exception):
    """Raised when circuit breaker is open."""
    pass


class CircuitBreaker:
    """Circuit breaker to prevent cascade failures."""
    
    def __init__(
        self,
        failure_threshold: int = 5,
        timeout: int = 60,
        success_threshold: int = 2,
    ):
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.success_threshold = success_threshold
        
        self.state = CircuitState.CLOSED
        self.failures = 0
        self.successes = 0
        self.last_failure_time: Optional[datetime] = None
        self._lock = asyncio.Lock()
    
    async def call(self, func, *args, **kwargs):
        """Execute function with circuit breaker protection."""
        async with self._lock:
            if self.state == CircuitState.OPEN:
                if self.last_failure_time and datetime.now() - self.last_failure_time > timedelta(seconds=self.timeout):
                    logger.info("Circuit breaker transitioning to HALF_OPEN")
                    self.state = CircuitState.HALF_OPEN
                else:
                    raise CircuitBreakerOpenError("Wikimedia API circuit is OPEN")
        
        try:
            result = await func(*args, **kwargs)
            await self._on_success()
            return result
        except Exception as exc:
            await self._on_failure()
            raise exc
    
    async def _on_success(self):
        async with self._lock:
            if self.state == CircuitState.HALF_OPEN:
                self.successes += 1
                if self.successes >= self.success_threshold:
                    logger.info("Circuit breaker CLOSED after recovery")
                    self.state = CircuitState.CLOSED
                    self.failures = 0
                    self.successes = 0
            else:
                self.failures = 0
    
    async def _on_failure(self):
        async with self._lock:
            self.failures += 1
            self.last_failure_time = datetime.now()
            
            if self.failures >= self.failure_threshold:
                logger.error(f"Circuit breaker OPEN after {self.failures} failures")
                self.state = CircuitState.OPEN
                self.successes = 0


class RateLimiter:
    """Token bucket rate limiter."""
    
    def __init__(self, calls_per_second: float):
        self.rate = calls_per_second
        self.tokens = calls_per_second
        self.last_update = datetime.now()
        self._lock = asyncio.Lock()
    
    async def acquire(self) -> None:
        """Wait until a token is available."""
        async with self._lock:
            now = datetime.now()
            elapsed = (now - self.last_update).total_seconds()
            self.tokens = min(self.rate, self.tokens + elapsed * self.rate)
            self.last_update = now
            
            if self.tokens < 1.0:
                wait_time = (1.0 - self.tokens) / self.rate
                await asyncio.sleep(wait_time)
                self.tokens = 0.0
            else:
                self.tokens -= 1.0


def sanitize_search_term(query: str) -> str:
    """Prepare search term for Wikimedia API.
    
    Args:
        query: Raw search query
        
    Returns:
        Sanitized query safe for API use
    """
    # Remove MediaWiki markup
    query = re.sub(r'\[\[|\]\]|\{\{|\}\}', '', query)
    
    # Strip dangerous characters
    query = re.sub(r'[<>"\']', '', query)
    
    # Collapse whitespace
    query = ' '.join(query.split())
    
    # Limit length (API max ~300 chars)
    if len(query) > 300:
        query = query[:300].rsplit(' ', 1)[0]
    
    return query.strip()


def clean_wikitext(text: str) -> str:
    """Remove MediaWiki markup from plain text extracts.
    
    Args:
        text: Text potentially containing wiki markup
        
    Returns:
        Cleaned plain text
    """
    if not text:
        return ""
    
    # Remove templates
    text = re.sub(r'\{\{[^}]+\}\}', '', text)
    
    # Convert links: [[target|display]] -> display, [[target]] -> target
    text = re.sub(r'\[\[([^|\]]+\|)?([^\]]+)\]\]', r'\2', text)
    
    # Remove HTML comments
    text = re.sub(r'<!--.*?-->', '', text, flags=re.DOTALL)
    
    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text)
    
    return text.strip()


class WikimediaRetriever:
    """Async client for Wikimedia API with production hardening."""
    
    def __init__(
        self,
        api_endpoint: str = "https://en.wikipedia.org/w/api.php",
        user_agent: str = None,
        timeout: float = 10.0,
        max_extract_length: int = 500,
        rate_limit: float = 1.0,
    ):
        """Initialize Wikimedia retriever.
        
        Args:
            api_endpoint: Base URL for MediaWiki API
            user_agent: User-Agent header (required by Wikimedia policy)
            timeout: Request timeout in seconds
            max_extract_length: Maximum extract text length
            rate_limit: Maximum requests per second
        """
        if httpx is None:
            raise ImportError(
                "httpx is required for Wikimedia integration. "
                "Install with: pip install httpx[http2]"
            )
        
        self.api_endpoint = api_endpoint
        self.timeout = timeout
        self.max_extract_length = max_extract_length
        
        # Validate User-Agent
        if not user_agent or len(user_agent) < 20 or "@" not in user_agent:
            raise ValueError(
                "WIKIMEDIA_USER_AGENT must include project name, URL, and contact email. "
                "See https://meta.wikimedia.org/wiki/User-Agent_policy"
            )
        
        self.user_agent = user_agent
        self._client: Optional[httpx.AsyncClient] = None
        self.circuit_breaker = CircuitBreaker()
        self.rate_limiter = RateLimiter(rate_limit)
    
    async def __aenter__(self):
        """Async context manager entry."""
        self._client = httpx.AsyncClient(
            http2=True,
            limits=httpx.Limits(
                max_keepalive_connections=10,
                max_connections=20,
                keepalive_expiry=30.0,
            ),
            timeout=httpx.Timeout(self.timeout, connect=5.0),
            headers={"User-Agent": self.user_agent},
        )
        return self
    
    async def __aexit__(self, *args):
        """Async context manager exit."""
        if self._client:
            await self._client.aclose()
    
    def _build_url(self, action: str, params: dict) -> str:
        """Build API URL with validated parameters.
        
        Args:
            action: API action (query, parse, opensearch)
            params: Additional parameters
            
        Returns:
            Full URL with query string
        """
        ALLOWED_ACTIONS = {"query", "parse", "opensearch"}
        if action not in ALLOWED_ACTIONS:
            raise ValueError(f"Action '{action}' not allowed")
        
        safe_params = {
            "action": action,
            "format": "json",
            "formatversion": "2",
        }
        
        PARAM_WHITELIST = {
            "query": {"titles", "prop", "redirects", "exintro", "explaintext", "rvprop", "maxlag"},
            "parse": {"page", "prop", "redirects", "maxlag"},
            "opensearch": {"search", "limit", "namespace", "maxlag"},
        }
        
        for key, value in params.items():
            if key not in PARAM_WHITELIST.get(action, set()):
                logger.warning(f"Ignoring unknown parameter: {key}")
                continue
            safe_params[key] = str(value)
        
        query_string = "&".join(f"{k}={quote_plus(str(v))}" for k, v in safe_params.items())
        return f"{self.api_endpoint}?{query_string}"
    
    async def _fetch_with_maxlag(
        self,
        url: str,
        max_retries: int = 3,
    ) -> Optional[dict]:
        """Fetch API with maxlag backoff handling.
        
        Args:
            url: Full API URL
            max_retries: Maximum retry attempts
            
        Returns:
            JSON response or None on failure
        """
        if not self._client:
            raise RuntimeError("Client not initialized. Use 'async with' context manager.")
        
        for attempt in range(max_retries):
            try:
                resp = await self._client.get(url)
                
                if resp.status_code == 503:
                    retry_after = int(resp.headers.get("Retry-After", 5))
                    logger.warning(
                        f"Maxlag triggered (attempt {attempt + 1}/{max_retries}). "
                        f"Retrying after {retry_after}s"
                    )
                    await asyncio.sleep(retry_after)
                    continue
                
                resp.raise_for_status()
                return resp.json()
                
            except httpx.TimeoutException:
                logger.warning(f"Timeout on attempt {attempt + 1}/{max_retries}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(2 ** attempt)
                continue
            except httpx.HTTPStatusError as e:
                if e.response.status_code >= 500 and attempt < max_retries - 1:
                    logger.warning(f"Server error {e.response.status_code}, retrying...")
                    await asyncio.sleep(2 ** attempt)
                    continue
                raise
        
        return None
    
    def _parse_response(self, data: dict) -> Optional[dict]:
        """Extract content from MediaWiki API response.
        
        Args:
            data: JSON response from API
            
        Returns:
            Parsed content or None if invalid
        """
        if not data or "query" not in data:
            logger.info("Empty response from Wikimedia API")
            return None
        
        pages = data.get("query", {}).get("pages", [])
        if not pages:
            logger.info("No pages found in Wikimedia response")
            return None
        
        page = pages[0]
        
        if "missing" in page or "invalid" in page:
            logger.info(f"Page not found: {page.get('title', 'unknown')}")
            return None
        
        extract = clean_wikitext(page.get("extract", ""))
        if len(extract.strip()) < 50:
            logger.warning("Wikipedia extract too short, skipping")
            return None
        
        # Truncate to max length
        if len(extract) > self.max_extract_length:
            extract = extract[:self.max_extract_length].rsplit('.', 1)[0] + '.'
        
        # Get revision info for attribution
        revisions = page.get("revisions", [])
        revid = revisions[0].get("revid") if revisions else None
        
        title = page.get("title", "")
        
        return {
            "title": title,
            "extract": extract,
            "url": f"https://en.wikipedia.org/wiki/{title.replace(' ', '_')}",
            "pageid": page.get("pageid"),
            "revid": revid,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "license": "CC BY-SA 3.0",
            "license_url": "https://creativecommons.org/licenses/by-sa/3.0/",
        }
    
    async def search(self, query: str) -> Optional[dict]:
        """Search Wikipedia for a topic.
        
        Args:
            query: Search query
            
        Returns:
            Parsed Wikipedia content or None
        """
        # Rate limiting
        await self.rate_limiter.acquire()
        
        # Sanitize input
        clean_query = sanitize_search_term(query)
        if not clean_query:
            logger.warning("Empty query after sanitization")
            return None
        
        # Build URL
        url = self._build_url("query", {
            "titles": clean_query,
            "prop": "extracts|revisions",
            "rvprop": "ids",
            "exintro": "true",
            "explaintext": "true",
            "redirects": "true",
            "maxlag": "5",
        })
        
        # Execute with circuit breaker
        try:
            data = await self.circuit_breaker.call(self._fetch_with_maxlag, url)
            if data:
                return self._parse_response(data)
            return None
        except CircuitBreakerOpenError:
            logger.warning("Circuit breaker open, skipping Wikimedia request")
            return None
        except Exception as e:
            logger.error(f"Wikimedia search failed: {e}")
            return None
