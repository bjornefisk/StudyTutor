"""Index loading and metadata utilities."""
from __future__ import annotations

import json
import logging
import os
from threading import Lock
from typing import List, Optional, Tuple

import faiss

from .config import CONFIG_PATH, EMBED_BACKEND, INDEX_PATH, META_PATH


_CACHE_LOCK = Lock()
_INDEX_CACHE: Optional[Tuple[Optional[faiss.Index], List[dict]]] = None


def _log_index_mismatch(mismatches: list[str]) -> None:
    """Log helpful guidance when embedding settings drift."""
    if not mismatches:
        return
    logging.warning(
        "Index was built with different embedding settings. Consider re-ingesting.\n%s",
        "\n".join([f"- {m}" for m in mismatches]),
    )


def load_index_and_meta(force_reload: bool = False) -> Tuple[Optional[faiss.Index], List[dict]]:
    """Load the FAISS index and metadata from disk with lightweight caching."""
    global _INDEX_CACHE

    with _CACHE_LOCK:
        if not force_reload and _INDEX_CACHE is not None:
            return _INDEX_CACHE

        if not (os.path.exists(INDEX_PATH) and os.path.exists(META_PATH)):
            _INDEX_CACHE = (None, [])
            return _INDEX_CACHE

        index = faiss.read_index(INDEX_PATH)
        metas: list[dict] = []
        with open(META_PATH, "r", encoding="utf-8") as meta_file:
            for line in meta_file:
                metas.append(json.loads(line))

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
        except Exception as exc:  # pragma: no cover - best-effort diagnostics
            logging.debug("Index metadata validation failed: %s", exc)

        _INDEX_CACHE = (index, metas)
        return _INDEX_CACHE
