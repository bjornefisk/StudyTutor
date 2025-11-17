"""Index loading and metadata utilities."""
from __future__ import annotations

import json
import logging
import os
import re
from threading import Lock
from typing import Any, List, Optional, Tuple

import faiss

from .config import CONFIG_PATH, EMBED_BACKEND, INDEX_PATH, META_PATH

logger = logging.getLogger(__name__)

try:  # rank-bm25 is optional; degrade gracefully if missing
    from rank_bm25 import BM25Okapi
except ImportError:  # pragma: no cover - executed only when dependency missing
    BM25Okapi = None  # type: ignore[assignment]


_CACHE_LOCK = Lock()
_BM25_WARNING_EMITTED = False
_INDEX_CACHE: Optional[Tuple[Optional[faiss.Index], List[dict], Optional[Any], Optional[List[List[str]]]]] = None


def _tokenize_for_bm25(text: str) -> list[str]:
    """Simplistic tokenizer that keeps alphanumerics/underscores for code-friendly matching."""
    if not text:
        return []
    return [token.lower() for token in re.findall(r"[A-Za-z0-9_]+", text)]


def _build_bm25_resources(metas: list[dict]) -> tuple[Optional[Any], Optional[list[list[str]]]]:
    """Create BM25 index + tokenized corpus when rank_bm25 is available."""
    global _BM25_WARNING_EMITTED

    if BM25Okapi is None:
        if not _BM25_WARNING_EMITTED:
            logger.warning(
                "rank-bm25 not installed; hybrid retrieval will fall back to vector-only search."
            )
            _BM25_WARNING_EMITTED = True
        return None, None

    if not metas:
        return None, []

    tokenized_corpus = [_tokenize_for_bm25(meta.get("text", "")) for meta in metas]
    if not any(tokenized_corpus):
        logger.info("BM25 corpus empty; skipping lexical index build.")
        return None, tokenized_corpus

    try:
        bm25 = BM25Okapi(tokenized_corpus)  # type: ignore[operator]
    except Exception as exc:  # pragma: no cover - defensive programming
        logger.warning("Failed to initialize BM25 index: %s", exc)
        return None, tokenized_corpus

    return bm25, tokenized_corpus


def _log_index_mismatch(mismatches: list[str]) -> None:
    """Log helpful guidance when embedding settings drift."""
    if not mismatches:
        return
    logging.warning(
        "Index was built with different embedding settings. Consider re-ingesting.\n%s",
        "\n".join([f"- {m}" for m in mismatches]),
    )


def load_index_and_meta(
    force_reload: bool = False,
) -> Tuple[Optional[faiss.Index], List[dict], Optional[Any], Optional[List[List[str]]]]:
    """Load FAISS index, metadata, and BM25 resources from disk with lightweight caching."""
    global _INDEX_CACHE

    with _CACHE_LOCK:
        if not force_reload and _INDEX_CACHE is not None:
            return _INDEX_CACHE

        if not (os.path.exists(INDEX_PATH) and os.path.exists(META_PATH)):
            _INDEX_CACHE = (None, [], None, None)
            return _INDEX_CACHE

        index = faiss.read_index(INDEX_PATH)
        metas: list[dict] = []
        with open(META_PATH, "r", encoding="utf-8") as meta_file:
            for line in meta_file:
                metas.append(json.loads(line))

        bm25_index, tokenized_corpus = _build_bm25_resources(metas)

        try:
            if os.path.exists(CONFIG_PATH):
                from .config import OLLAMA_EMBED_MODEL, OPENROUTER_EMBED_MODEL, SBERT_MODEL

                with open(CONFIG_PATH, "r", encoding="utf-8") as cfg_file:
                    cfg = json.load(cfg_file)

                if EMBED_BACKEND == "openrouter":
                    current_model = OPENROUTER_EMBED_MODEL
                elif EMBED_BACKEND == "sbert":
                    current_model = SBERT_MODEL
                elif EMBED_BACKEND == "ollama":
                    current_model = OLLAMA_EMBED_MODEL
                else:
                    current_model = "unknown"

                mismatches: list[str] = []
                if cfg.get("embed_backend") != EMBED_BACKEND:
                    mismatches.append(
                        f"backend: stored={cfg.get('embed_backend')} current={EMBED_BACKEND}"
                    )
                if str(cfg.get("embed_model")) != str(current_model):
                    mismatches.append(
                        f"model: stored={cfg.get('embed_model')} current={current_model}"
                    )
                if int(cfg.get("dim", index.d)) != int(index.d):
                    mismatches.append(
                        f"dim: stored={cfg.get('dim')} current={index.d}"
                    )
                _log_index_mismatch(mismatches)
        except Exception as exc:
            logging.debug("Index metadata validation failed: %s", exc)

        _INDEX_CACHE = (index, metas, bm25_index, tokenized_corpus)
        return _INDEX_CACHE
