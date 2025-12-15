#!/usr/bin/env python3
"""
Simple standalone test for Wikimedia integration.
Run with: python tests/test_wikimedia_simple.py
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_imports():
    """Test that all modules can be imported."""
    print("Testing imports...")
    
    try:
        from tutor.core.wikimedia_retriever import WikimediaRetriever
        print("  ✓ wikimedia_retriever")
    except ImportError as e:
        print(f"  ✗ wikimedia_retriever: {e}")
        return False
    
    try:
        from tutor.core.cache_manager import TTLCache
        print("  ✓ cache_manager")
    except ImportError as e:
        print(f"  ✗ cache_manager: {e}")
        return False
    
    try:
        from tutor.core.knowledge_sources import should_query_wikimedia
        print("  ✓ knowledge_sources")
    except ImportError as e:
        print(f"  ✗ knowledge_sources: {e}")
        return False
    
    return True


def test_sanitization():
    """Test input sanitization."""
    print("\nTesting sanitization...")
    
    from tutor.core.wikimedia_retriever import sanitize_search_term, clean_wikitext
    
    tests = [
        ("[[Albert Einstein]]", "Albert Einstein"),
        ("{{template}}", ""),
        ("what is   DNA  ", "what is DNA"),
    ]
    
    passed = 0
    for dirty, expected in tests:
        result = sanitize_search_term(dirty)
        if result == expected:
            print(f"  ✓ '{dirty}' → '{result}'")
            passed += 1
        else:
            print(f"  ✗ '{dirty}' → '{result}' (expected '{expected}')")
    
    print(f"  {passed}/{len(tests)} passed")
    return passed == len(tests)


def test_cache():
    """Test cache functionality."""
    print("\nTesting cache...")
    
    from tutor.core.cache_manager import TTLCache, cache_key
    
    cache = TTLCache(max_size=10, ttl_seconds=60)
    
    # Test set/get
    cache.set("key1", {"data": "value1"})
    result = cache.get("key1")
    
    if result == {"data": "value1"}:
        print("  ✓ Cache set/get works")
    else:
        print(f"  ✗ Cache set/get failed: {result}")
        return False
    
    # Test stats
    stats = cache.stats()
    if "hit_ratio" in stats:
        print(f"  ✓ Cache stats work (hit_ratio: {stats['hit_ratio']})")
    else:
        print("  ✗ Cache stats failed")
        return False
    
    # Test cache key generation
    key1 = cache_key("Python programming")
    key2 = cache_key("Python programming")
    
    if key1 == key2:
        print(f"  ✓ Cache key generation consistent: {key1}")
    else:
        print(f"  ✗ Cache key inconsistent: {key1} != {key2}")
        return False
    
    return True


def test_query_detection():
    """Test Wikipedia query detection."""
    print("\nTesting query detection...")
    
    from tutor.core.knowledge_sources import should_query_wikimedia
    
    tests = [
        ("What is photosynthesis?", True),
        ("Who is Albert Einstein?", True),
        ("Define quantum mechanics", True),
        ("How do I fix this bug?", False),
        ("Einstein Theory", True),
    ]
    
    passed = 0
    for query, expected in tests:
        result = should_query_wikimedia(query)
        if result == expected:
            print(f"  ✓ '{query}' → {result}")
            passed += 1
        else:
            print(f"  ✗ '{query}' → {result} (expected {expected})")
    
    print(f"  {passed}/{len(tests)} passed")
    return passed == len(tests)


def test_user_agent_validation():
    """Test User-Agent validation."""
    print("\nTesting User-Agent validation...")
    
    from tutor.core.wikimedia_retriever import WikimediaRetriever
    
    # Valid User-Agent
    try:
        retriever = WikimediaRetriever(
            user_agent="StudyTutorRAG/2.0 (https://example.com; test@example.com)"
        )
        print("  ✓ Valid User-Agent accepted")
    except ValueError:
        print("  ✗ Valid User-Agent rejected")
        return False
    
    # Invalid User-Agent (too short)
    try:
        retriever = WikimediaRetriever(user_agent="short")
        print("  ✗ Invalid User-Agent accepted (should reject)")
        return False
    except ValueError:
        print("  ✓ Short User-Agent rejected")
    
    # Invalid User-Agent (no email)
    try:
        retriever = WikimediaRetriever(
            user_agent="StudyTutorRAG/2.0 (https://example.com)"
        )
        print("  ✗ User-Agent without email accepted (should reject)")
        return False
    except ValueError:
        print("  ✓ User-Agent without email rejected")
    
    return True


def test_url_building():
    """Test URL building."""
    print("\nTesting URL building...")
    
    from tutor.core.wikimedia_retriever import WikimediaRetriever
    
    retriever = WikimediaRetriever(
        user_agent="StudyTutorRAG/2.0 (https://example.com; test@example.com)"
    )
    
    url = retriever._build_url("query", {
        "titles": "Python",
        "prop": "extracts",
    })
    
    required_parts = ["action=query", "titles=Python", "prop=extracts", "format=json"]
    
    passed = 0
    for part in required_parts:
        if part in url:
            passed += 1
        else:
            print(f"  ✗ Missing in URL: {part}")
    
    if passed == len(required_parts):
        print(f"  ✓ URL building correct: {url}")
        return True
    else:
        print(f"  ✗ URL building failed ({passed}/{len(required_parts)} parts)")
        return False


def main():
    """Run all tests."""
    print("=" * 60)
    print("Wikimedia Integration - Simple Tests")
    print("=" * 60)
    
    tests = [
        ("Imports", test_imports),
        ("Sanitization", test_sanitization),
        ("Cache", test_cache),
        ("Query Detection", test_query_detection),
        ("User-Agent Validation", test_user_agent_validation),
        ("URL Building", test_url_building),
    ]
    
    passed = 0
    failed = 0
    
    for name, test_func in tests:
        try:
            if test_func():
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"\n  ✗ Exception in {name}: {e}")
            import traceback
            traceback.print_exc()
            failed += 1
    
    print("\n" + "=" * 60)
    print("Test Results")
    print("=" * 60)
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    
    if failed == 0:
        print("\n✓ All tests passed!")
        return 0
    else:
        print(f"\n✗ {failed} test(s) failed")
        return 1


if __name__ == "__main__":
    sys.exit(main())
