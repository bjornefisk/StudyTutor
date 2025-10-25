"""Storage utilities: directories and chat logs."""
from __future__ import annotations
import json
from datetime import datetime
from pathlib import Path
from typing import List, Tuple
from .config import STORE_DIR, CHATS_DIR, DATA_DIR

# Cache for session summaries
_session_summaries_cache: dict[str, str] = {}


def ensure_app_dirs() -> None:
    Path(STORE_DIR).mkdir(parents=True, exist_ok=True)
    Path(CHATS_DIR).mkdir(parents=True, exist_ok=True)
    Path(DATA_DIR).mkdir(parents=True, exist_ok=True)


def list_chat_sessions() -> list[tuple[str, datetime, Path]]:
    ensure_app_dirs()
    sessions: list[tuple[str, datetime, Path]] = []
    for p in Path(CHATS_DIR).glob("*.jsonl"):
        try:
            ts = datetime.fromtimestamp(p.stat().st_mtime)
            sessions.append((p.stem, ts, p))
        except Exception:
            continue
    sessions.sort(key=lambda x: x[1], reverse=True)
    return sessions


def load_chat(session_id: str) -> list[dict]:
    path = Path(CHATS_DIR) / f"{session_id}.jsonl"
    messages: list[dict] = []
    if not path.exists():
        return messages
    try:
        with path.open("r", encoding="utf-8") as f:
            for line in f:
                try:
                    messages.append(json.loads(line))
                except Exception:
                    pass
    except Exception:
        return []
    return messages


def append_chat_message(session_id: str, role: str, content: str) -> None:
    ensure_app_dirs()
    path = Path(CHATS_DIR) / f"{session_id}.jsonl"
    rec = {
        "ts": datetime.utcnow().isoformat() + "Z",
        "role": role,
        "content": content,
    }
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(rec, ensure_ascii=False) + "\n")


def get_session_summary(session_id: str) -> str | None:
    """Get cached summary for a session, or None if not available."""
    if session_id in _session_summaries_cache:
        return _session_summaries_cache[session_id]
    
    # Try loading from metadata file
    metadata_path = Path(CHATS_DIR) / f"{session_id}.meta.json"
    if metadata_path.exists():
        try:
            with metadata_path.open("r", encoding="utf-8") as f:
                data = json.load(f)
                summary = data.get("summary")
                if summary:
                    _session_summaries_cache[session_id] = summary
                    return summary
        except Exception:
            pass
    return None


def save_session_summary(session_id: str, summary: str) -> None:
    """Save a summary for a session."""
    ensure_app_dirs()
    _session_summaries_cache[session_id] = summary
    metadata_path = Path(CHATS_DIR) / f"{session_id}.meta.json"
    try:
        with metadata_path.open("w", encoding="utf-8") as f:
            json.dump({"summary": summary, "updated": datetime.utcnow().isoformat() + "Z"}, f, ensure_ascii=False)
    except Exception:
        pass


def generate_session_summary(session_id: str) -> str:
    """Generate a concise summary from the first few messages of a chat session."""
    messages = load_chat(session_id)
    if not messages:
        return "Empty conversation"
    
    # Get first user message for context
    first_user_msg = None
    for msg in messages[:5]:
        if msg.get("role") == "user":
            first_user_msg = msg.get("content", "")
            break
    
    if not first_user_msg:
        return "New conversation"
    
    # Create a short summary (max 50 chars, one line)
    summary = first_user_msg.strip()
    
    # Clean up and truncate
    summary = summary.replace("\n", " ").replace("\r", " ")
    if len(summary) > 50:
        summary = summary[:47] + "..."
    
    return summary if summary else "New conversation"
