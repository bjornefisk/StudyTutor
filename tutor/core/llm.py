"""LLM backend calls."""
from __future__ import annotations
import logging
import os
from .config import (
    LLM_BACKEND,
    OPENROUTER_BASE_URL,
    OPENROUTER_API_KEY,
    OPENROUTER_CHAT_MODEL,
    OPENROUTER_SITE_URL,
    OPENROUTER_APP_NAME,
    OLLAMA_MODEL,
)

logger = logging.getLogger(__name__)


def _call_ollama(prompt: str, max_tokens: int = 220) -> str:
    """Call local Ollama chat API."""
    import requests

    try:
        r = requests.post(
            "http://localhost:11434/api/chat",
            json={
                "model": os.getenv("OLLAMA_MODEL", OLLAMA_MODEL),
                "messages": [
                    {"role": "system", "content": "You are a helpful tutor."},
                    {"role": "user", "content": prompt},
                ],
                "options": {"temperature": 0.2, "num_predict": max_tokens},
                "stream": False,
            },
            timeout=120,
        )
        r.raise_for_status()
        data = r.json()
        return data.get("message", {}).get("content", "").strip()
    except requests.exceptions.RequestException as exc:
        logger.error("Ollama request failed: %s", exc)
        return f"Error calling Ollama: {exc}"


def llm_answer(prompt: str, max_tokens: int = 220) -> str:
    if LLM_BACKEND == "ollama":
        return _call_ollama(prompt, max_tokens)

    if LLM_BACKEND == "openrouter":
        if not OPENROUTER_API_KEY:
            logger.warning("OPENROUTER_API_KEY not set; falling back to Ollama")
            return _call_ollama(prompt, max_tokens)

        from openai import OpenAI

        client = OpenAI(base_url=OPENROUTER_BASE_URL, api_key=OPENROUTER_API_KEY)
        try:
            resp = client.chat.completions.create(
                model=OPENROUTER_CHAT_MODEL,
                messages=[
                    {"role": "system", "content": "You are a helpful tutor."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.2,
                max_tokens=max_tokens,
                extra_headers={
                    "HTTP-Referer": OPENROUTER_SITE_URL or "",
                    "X-Title": OPENROUTER_APP_NAME,
                },
            )
            content = resp.choices[0].message.content
            if content and not content.lstrip().lower().startswith("<!doctype html"):
                return content.strip()
            logger.warning("OpenRouter returned non-text content; falling back to Ollama")
        except Exception as exc:
            logger.error("OpenRouter request failed: %s; falling back to Ollama", exc)

        return _call_ollama(prompt, max_tokens)

    raise ValueError(f"Unknown LLM_BACKEND: {LLM_BACKEND}")
