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

# Wikimedia API Configuration
WIKIMEDIA_ENABLED = os.getenv("WIKIMEDIA_ENABLED", "true").lower() in ("true", "1", "yes")
WIKIMEDIA_API_ENDPOINT = os.getenv(
    "WIKIMEDIA_API_ENDPOINT",
    "https://en.wikipedia.org/w/api.php"
)
WIKIMEDIA_LANGUAGE = os.getenv("WIKIMEDIA_LANGUAGE", "en")
WIKIMEDIA_MAX_EXTRACT_LENGTH = int(os.getenv("WIKIMEDIA_MAX_EXTRACT_LENGTH", "500"))
WIKIMEDIA_TIMEOUT_SECONDS = float(os.getenv("WIKIMEDIA_TIMEOUT_SECONDS", "10.0"))
WIKIMEDIA_CACHE_TTL_SECONDS = int(os.getenv("WIKIMEDIA_CACHE_TTL_SECONDS", "86400"))
WIKIMEDIA_RATE_LIMIT_CALLS_PER_SECOND = float(
    os.getenv("WIKIMEDIA_RATE_LIMIT_CALLS_PER_SECOND", "1.0")
)
WIKIMEDIA_USER_AGENT = os.getenv(
    "WIKIMEDIA_USER_AGENT",
    "StudyTutorRAG/2.0 (https://github.com/user/StudyTutor; studytutor@example.com)"
)

OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_CHAT_MODEL = os.getenv("OPENROUTER_CHAT_MODEL", "meta-llama/llama-3.3-70b-instruct:free")
OPENROUTER_EMBED_MODEL = os.getenv("OPENROUTER_EMBED_MODEL", "thenlper/gte-large")
OPENROUTER_SITE_URL = os.getenv("OPENROUTER_SITE_URL")
OPENROUTER_APP_NAME = os.getenv("OPENROUTER_APP_NAME", "CourseTutor-MVP")

SBERT_MODEL = os.getenv("SBERT_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")
OLLAMA_EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")

TOP_K = int(os.getenv("TOP_K", "3"))

# Multi-query retrieval settings
USE_MULTI_QUERY = os.getenv("USE_MULTI_QUERY", "true").lower() in ("true", "1", "yes")
NUM_QUERY_VARIATIONS = int(os.getenv("NUM_QUERY_VARIATIONS", "3"))

# Hybrid retrieval settings
USE_HYBRID_RETRIEVAL = os.getenv("USE_HYBRID_RETRIEVAL", "true").lower() in ("true", "1", "yes")
RRF_K = int(os.getenv("RRF_K", "60"))
