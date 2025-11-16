"""Embedding backends and factory."""
from __future__ import annotations
import logging
import numpy as np
from typing import Callable, List
from .config import (
    EMBED_BACKEND,
    OPENROUTER_BASE_URL,
    OPENROUTER_API_KEY,
    OPENROUTER_EMBED_MODEL,
    OPENROUTER_SITE_URL,
    OPENROUTER_APP_NAME,
    OLLAMA_EMBED_MODEL,
    SBERT_MODEL,
)

logger = logging.getLogger(__name__)


def get_embedder() -> Callable[[List[str]], np.ndarray]:
    backend = EMBED_BACKEND
    
    if backend == "openrouter":
        if not OPENROUTER_API_KEY:
            logger.warning("OPENROUTER_API_KEY not set; falling back to SBERT embeddings")
            from sentence_transformers import SentenceTransformer
            model = SentenceTransformer(SBERT_MODEL)

            def embed(texts: List[str]) -> np.ndarray:
                arr = model.encode(texts, normalize_embeddings=True)
                return np.array(arr, dtype="float32")

            return embed
        
        from openai import OpenAI
        client = OpenAI(base_url=OPENROUTER_BASE_URL, api_key=OPENROUTER_API_KEY)

        def embed(texts: List[str]) -> np.ndarray:
            try:
                resp = client.embeddings.create(
                    model=OPENROUTER_EMBED_MODEL,
                    input=texts,
                    extra_headers={
                        "HTTP-Referer": OPENROUTER_SITE_URL or "",
                        "X-Title": OPENROUTER_APP_NAME,
                    },
                )
                arr = np.array([d.embedding for d in resp.data], dtype="float32")
                norms = np.linalg.norm(arr, axis=1, keepdims=True) + 1e-12
                return arr / norms
            except Exception as exc:
                logger.error("OpenRouter embeddings failed: %s", exc)
                raise

        return embed

    if backend == "ollama":
        import requests
        model = OLLAMA_EMBED_MODEL

        def embed(texts: List[str]) -> np.ndarray:
            out = []
            for t in texts:
                try:
                    r = requests.post(
                        "http://localhost:11434/api/embeddings",
                        json={"model": model, "prompt": t},
                        timeout=120,
                    )
                    r.raise_for_status()
                    out.append(r.json()["embedding"])
                except requests.exceptions.RequestException as exc:
                    logger.error("Ollama embedding request failed for text chunk: %s", exc)
                    raise
            arr = np.array(out, dtype="float32")
            norms = np.linalg.norm(arr, axis=1, keepdims=True) + 1e-12
            return arr / norms

        return embed

    if backend == "sbert":
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer(SBERT_MODEL)

        def embed(texts: List[str]) -> np.ndarray:
            arr = model.encode(texts, normalize_embeddings=True)
            return np.array(arr, dtype="float32")

        return embed

    raise ValueError(f"Unknown EMBEDDINGS_BACKEND: {backend}")
