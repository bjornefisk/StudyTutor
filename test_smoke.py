#!/usr/bin/env python3
"""Quick smoke test to validate core modules work."""
import sys
from pathlib import Path

def test_imports():
    """Verify all core modules can be imported."""
    print("Testing imports...")
    try:
        from tutor.core.config import EMBED_BACKEND, LLM_BACKEND, TOP_K
        from tutor.core.storage import ensure_app_dirs, list_chat_sessions
        from tutor.core.indexing import load_index_and_meta
        from tutor.core.embeddings import get_embedder
        from tutor.core.llm import llm_answer
        from tutor.core.retrieval import retrieve, build_prompt
        from tutor.core.suggestions import build_suggestions
        from tutor.core.tts import synthesize_tts
        from tutor.ui.theme import inject_css
        print("✓ All imports successful")
        return True
    except Exception as exc:
        print(f"✗ Import failed: {exc}")
        return False

def test_config():
    """Verify config values are sane."""
    print("\nTesting configuration...")
    try:
        from tutor.core.config import EMBED_BACKEND, LLM_BACKEND, TOP_K, DATA_DIR, STORE_DIR
        print(f"  EMBED_BACKEND: {EMBED_BACKEND}")
        print(f"  LLM_BACKEND: {LLM_BACKEND}")
        print(f"  TOP_K: {TOP_K}")
        print(f"  DATA_DIR: {DATA_DIR}")
        print(f"  STORE_DIR: {STORE_DIR}")
        print("✓ Configuration looks good")
        return True
    except Exception as exc:
        print(f"✗ Config check failed: {exc}")
        return False

def test_storage():
    """Verify storage directories can be created."""
    print("\nTesting storage...")
    try:
        from tutor.core.storage import ensure_app_dirs
        ensure_app_dirs()
        from tutor.core.config import DATA_DIR, STORE_DIR, CHATS_DIR
        assert Path(DATA_DIR).exists(), f"{DATA_DIR} not created"
        assert Path(STORE_DIR).exists(), f"{STORE_DIR} not created"
        assert Path(CHATS_DIR).exists(), f"{CHATS_DIR} not created"
        print("✓ Storage directories created successfully")
        return True
    except Exception as exc:
        print(f"✗ Storage test failed: {exc}")
        return False

def test_embedder():
    """Verify embedder can be instantiated."""
    print("\nTesting embedder...")
    try:
        from tutor.core.embeddings import get_embedder
        embed_fn = get_embedder()
        # Test with a simple phrase
        result = embed_fn(["Hello world"])
        assert result.shape[0] == 1, "Expected 1 embedding vector"
        print(f"✓ Embedder works (dim={result.shape[1]})")
        return True
    except Exception as exc:
        print(f"✗ Embedder test failed: {exc}")
        return False

def test_index_loading():
    """Verify index loading works (even if no index exists)."""
    print("\nTesting index loading...")
    try:
        from tutor.core.indexing import load_index_and_meta
        index, metas = load_index_and_meta()
        if index is None:
            print("  ℹ No index found (run 'python ingest.py' to create one)")
        else:
            print(f"✓ Index loaded ({len(metas)} chunks)")
        return True
    except Exception as exc:
        print(f"✗ Index loading failed: {exc}")
        return False

def main():
    """Run all smoke tests."""
    print("=" * 60)
    print("Running smoke tests for tutorV2")
    print("=" * 60)
    
    results = [
        test_imports(),
        test_config(),
        test_storage(),
        test_embedder(),
        test_index_loading(),
    ]
    
    print("\n" + "=" * 60)
    if all(results):
        print("✓ All tests passed!")
        print("=" * 60)
        return 0
    else:
        print("✗ Some tests failed. Check the output above for details.")
        print("=" * 60)
        return 1

if __name__ == "__main__":
    sys.exit(main())
