"""LLM backend calls with advanced prompt engineering."""
from __future__ import annotations
import logging
import os
from typing import Dict, List
import requests
try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

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

DEFAULT_MODEL = "meta-llama/llama-3.3-70b-instruct:free"


def _call_ollama(prompt: str, max_tokens: int = 512, system_prompt: str = "") -> str:
    """Call local Ollama chat API."""
    try:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        r = requests.post(
            "http://localhost:11434/api/chat",
            json={
                "model": os.getenv("OLLAMA_MODEL", OLLAMA_MODEL),
                "messages": messages,
                "options": {"temperature": 0.3, "num_predict": max_tokens},
                "stream": False,
            },
            timeout=180,
        )
        r.raise_for_status()
        data = r.json()
        return data.get("message", {}).get("content", "").strip()
    except requests.exceptions.RequestException as exc:
        logger.error("Ollama request failed: %s", exc)
        return f"Error calling Ollama: {exc}"


def _call_openrouter(prompt: str, max_tokens: int = 512, system_prompt: str = "", model: str = "") -> str:
    """Call OpenRouter API (with Llama 3.3 8B default)."""
    if not OPENROUTER_API_KEY:
        logger.warning("OPENROUTER_API_KEY not set; falling back to Ollama")
        return _call_ollama(prompt, max_tokens, system_prompt)

    if OpenAI is None:
        logger.error("OpenAI client not installed. Please install 'openai' package.")
        return _call_ollama(prompt, max_tokens, system_prompt)

    client = OpenAI(base_url=OPENROUTER_BASE_URL, api_key=OPENROUTER_API_KEY)
    
    # Use Llama 3.3 8B by default, or user-specified model
    selected_model = model or os.getenv("OPENROUTER_CHAT_MODEL") or DEFAULT_MODEL
    
    try:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        resp = client.chat.completions.create(
            model=selected_model,
            messages=messages,
            temperature=0.3,
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

    return _call_ollama(prompt, max_tokens, system_prompt)


def llm_call(prompt: str, max_tokens: int = 512, system_prompt: str = "") -> str:
    """
    Generic LLM call function for use with advanced prompting techniques.
    
    Args:
        prompt: User prompt or formatted prompt
        max_tokens: Maximum tokens to generate
        system_prompt: System prompt (if supported by backend)
        
    Returns:
        LLM response text
    """
    if LLM_BACKEND == "ollama":
        return _call_ollama(prompt, max_tokens, system_prompt)
    elif LLM_BACKEND == "openrouter":
        return _call_openrouter(prompt, max_tokens, system_prompt)
    else:
        raise ValueError(f"Unknown LLM_BACKEND: {LLM_BACKEND}")


def llm_answer(prompt: str, max_tokens: int = 512, use_advanced: bool = True, context_chunks: List[Dict] = None) -> str:
    """
    Main entry point for generating answers.
    
    Args:
        prompt: Either a formatted prompt or a question (if use_advanced=True with context_chunks)
        max_tokens: Maximum tokens
        use_advanced: Whether to use advanced prompt engineering techniques
        context_chunks: Context for advanced RAG (required if use_advanced=True)
        
    Returns:
        Generated answer
    """
    # If using advanced techniques, delegate to advanced_prompting module
    if use_advanced and context_chunks is not None:
        try:
            from .advanced_prompting import advanced_rag_answer
            
            # Extract question from prompt if it's formatted
            # Assume prompt format: "...Context:...\n\nQuestion: {question}\nAnswer:"
            question = prompt
            if "Question:" in prompt:
                question = prompt.split("Question:")[-1].replace("Answer:", "").strip()
            
            return advanced_rag_answer(
                question=question,
                context_chunks=context_chunks,
                llm_call_fn=lambda p: llm_call(p, max_tokens=max_tokens),
                use_multi_expert=True,
                use_self_critique=True
            )
        except Exception as exc:
            logger.error(f"Advanced prompting failed: {exc}, falling back to standard")
            # Fall through to standard
    
    # Standard behavior (backward compatibility)
    if LLM_BACKEND == "ollama":
        return _call_ollama(prompt, max_tokens)
    elif LLM_BACKEND == "openrouter":
        return _call_openrouter(prompt, max_tokens)
    else:
        raise ValueError(f"Unknown LLM_BACKEND: {LLM_BACKEND}")

