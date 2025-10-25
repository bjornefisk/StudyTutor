"""Centralized configuration and constants."""
from __future__ import annotations
import os

STORE_DIR = "storage"
META_PATH = os.path.join(STORE_DIR, "metadata.jsonl")
INDEX_PATH = os.path.join(STORE_DIR, "faiss.index")
CHATS_DIR = os.path.join(STORE_DIR, "chats")
DATA_DIR = "data"
CONFIG_PATH = os.path.join(STORE_DIR, "config.json")

TTS_BACKEND = os.getenv("TTS_BACKEND", "off").lower()  # off | pyttsx3

def _default_embed_backend() -> str:
	env_choice = os.getenv("EMBEDDINGS_BACKEND")
	if env_choice:
		return env_choice.lower()
	# If no explicit choice, prefer OpenRouter only when key is present; else SBERT.
	return "openrouter" if os.getenv("OPENROUTER_API_KEY") else "sbert"

EMBED_BACKEND = _default_embed_backend()
LLM_BACKEND = os.getenv("LLM_BACKEND", "ollama").lower()

OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_CHAT_MODEL = os.getenv("OPENROUTER_CHAT_MODEL", "openrouter/auto")
OPENROUTER_EMBED_MODEL = os.getenv("OPENROUTER_EMBED_MODEL", "thenlper/gte-large")
OPENROUTER_SITE_URL = os.getenv("OPENROUTER_SITE_URL")
OPENROUTER_APP_NAME = os.getenv("OPENROUTER_APP_NAME", "CourseTutor-MVP")

SBERT_MODEL = os.getenv("SBERT_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")
OLLAMA_EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")

TOP_K = int(os.getenv("TOP_K", "3"))
