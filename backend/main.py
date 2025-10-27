"""FastAPI backend exposing the tutor RAG capabilities.

This module provides a REST API for the AI Tutor application, handling:
- Chat interactions with document-based Q&A
- File uploads and document ingestion
- Session management and history
- Health monitoring and status checks
- AI-powered question suggestions

The API uses FastAPI with async/await patterns and includes proper error handling,
CORS configuration, and background task processing for document ingestion.
"""
from __future__ import annotations

import logging
import os
import uuid
from datetime import datetime
from pathlib import Path
from threading import Lock
from typing import Callable, List, Optional

from fastapi import BackgroundTasks, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from tutor.core.config import DATA_DIR, TOP_K, USE_MULTI_QUERY, NUM_QUERY_VARIATIONS
from tutor.core.embeddings import get_embedder
from tutor.core.indexing import load_index_and_meta
from tutor.core.llm import llm_answer
from tutor.core.retrieval import build_prompt, retrieve
from tutor.core.storage import (
    append_chat_message,
    ensure_app_dirs,
    list_chat_sessions,
    load_chat,
)
from tutor.core.suggestions import build_suggestions

ensure_app_dirs()

app = FastAPI(
    title="Tutor RAG Backend",
    description="Backend API for the Tutor application",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        # Add production frontend origins here, e.g. "https://your-app.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


_RESOURCE_LOCK = Lock()
_INDEX = None
_METAS: List[dict] = []
_EMBED_FN: Optional[Callable[[List[str]], object]] = None


def refresh_resources(force_reload: bool = False) -> None:
    """Load or reload the FAISS index, metadata, and embedder."""
    global _INDEX, _METAS, _EMBED_FN
    with _RESOURCE_LOCK:
        _INDEX, _METAS = load_index_and_meta(force_reload=force_reload)
        _EMBED_FN = get_embedder()


refresh_resources()


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="User prompt")
    session_id: Optional[str] = Field(default=None, description="Existing session identifier")
    top_k: Optional[int] = Field(default=None, ge=1, le=20, description="Override number of retrieved chunks")
    use_multi_query: Optional[bool] = Field(default=None, description="Enable multi-query retrieval for better results")


class Source(BaseModel):
    source: str
    page: int
    chunk_index: int
    score: float
    text: str


class ChatResponse(BaseModel):
    reply: str
    sources: List[Source]
    session_id: str
    timestamp: str


class SessionDescriptor(BaseModel):
    id: str
    timestamp: str
    path: Optional[str]


class SessionCreate(BaseModel):
    session_id: Optional[str] = None


class SuggestionRequest(BaseModel):
    prefix: str = ""
    limit: int = Field(default=6, ge=1, le=25)


def _assert_index_ready() -> None:
    if _INDEX is None or not _METAS or _EMBED_FN is None:
        raise HTTPException(
            status_code=503,
            detail="Vector index not loaded. Upload documents and run ingestion first.",
        )


@app.get("/")
async def root() -> dict:
    """Basic readiness probe."""
    return {
        "status": "ok",
        "index_loaded": _INDEX is not None,
        "documents": len(_METAS),
    }


@app.get("/health")
async def health() -> dict:
    """Detailed health information."""
    return {
        "status": "healthy" if _INDEX is not None else "degraded",
        "documents": len(_METAS),
        "embedding_backend": os.getenv("EMBEDDINGS_BACKEND", "sbert"),
        "llm_backend": os.getenv("LLM_BACKEND", "ollama"),
    }


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    _assert_index_ready()

    session_id = request.session_id or uuid.uuid4().hex[:12]
    prompt = request.message.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt must not be empty.")

    append_chat_message(session_id, "user", prompt)

    k = request.top_k or TOP_K
    use_mq = request.use_multi_query if request.use_multi_query is not None else USE_MULTI_QUERY

    hits = retrieve(
        prompt, 
        _INDEX, 
        _METAS, 
        _EMBED_FN, 
        k=k, 
        use_multi_query=use_mq,
        num_query_variations=NUM_QUERY_VARIATIONS
    )
    context_chunks = [meta for _, meta in hits]
    prompt_payload = build_prompt(context_chunks, prompt)
    answer = llm_answer(prompt_payload)

    timestamp = datetime.utcnow().isoformat() + "Z"
    append_chat_message(session_id, "assistant", answer)

    sources = [
        Source(
            source=meta["source"],
            page=int(meta.get("page", 0)),
            chunk_index=int(meta.get("chunk_index", -1)),
            score=float(score),
            text=(meta.get("text", "")[:200] + "...") if len(meta.get("text", "")) > 200 else meta.get("text", ""),
        )
        for score, meta in hits
    ]

    return ChatResponse(
        reply=answer,
        sources=sources,
        session_id=session_id,
        timestamp=timestamp,
    )


@app.post("/upload")
async def upload(files: List[UploadFile] = File(...)) -> dict:
    ensure_app_dirs()
    saved: list[str] = []
    errors: list[str] = []

    for file in files:
        suffix = Path(file.filename or "").suffix.lower()
        if suffix not in {".pdf", ".docx", ".txt", ".md"}:
            errors.append(f"{file.filename}: unsupported file type")
            continue
        try:
            target = Path(DATA_DIR) / (file.filename or uuid.uuid4().hex)
            target.parent.mkdir(parents=True, exist_ok=True)
            content = await file.read()
            target.write_bytes(content)
            saved.append(target.name)
        except (OSError, IOError, PermissionError) as exc:
            logging.exception("Failed saving uploaded file %s", file.filename)
            errors.append(f"{file.filename}: {exc}")

    return {"saved": saved, "errors": errors, "count": len(saved)}


@app.post("/ingest")
async def ingest_endpoint(background_tasks: BackgroundTasks) -> dict:
    from ingest import ingest as run_ingest  # Local import keeps startup fast

    def _ingest_job() -> None:
        try:
            run_ingest()
        except Exception as exc:  # Background task - log but don't crash
            logging.exception("Ingestion failed: %s", exc)
            return
        refresh_resources(force_reload=True)

    background_tasks.add_task(_ingest_job)
    return {"status": "started", "message": "Ingestion kicked off in the background."}


@app.get("/files")
async def list_files() -> dict:
    ensure_app_dirs()
    data_dir = Path(DATA_DIR)
    files: list[dict] = []
    if data_dir.exists():
        for path in data_dir.rglob("*"):
            if path.is_file() and path.suffix.lower() in {".pdf", ".docx", ".txt", ".md"}:
                files.append(
                    {
                        "name": str(path.relative_to(data_dir)),
                        "size": path.stat().st_size,
                        "modified": datetime.fromtimestamp(path.stat().st_mtime).isoformat() + "Z",
                    }
                )
    return {"files": files, "count": len(files)}


@app.get("/sessions")
async def sessions() -> dict:
    ensure_app_dirs()
    results: list[SessionDescriptor] = []
    for sid, ts, path in list_chat_sessions():
        results.append(
            SessionDescriptor(
                id=sid,
                timestamp=ts.isoformat() + "Z",
                path=str(path),
            )
        )
    return {"sessions": results}


@app.get("/sessions/{session_id}")
async def session_history(session_id: str) -> dict:
    ensure_app_dirs()
    messages = load_chat(session_id)
    if not messages:
        raise HTTPException(status_code=404, detail="Session not found.")
    return {"session_id": session_id, "messages": messages}


@app.post("/sessions/new")
async def new_session(payload: SessionCreate) -> dict:
    session_id = payload.session_id or uuid.uuid4().hex[:12]
    timestamp = datetime.utcnow().isoformat() + "Z"
    return {"session_id": session_id, "created": timestamp}


@app.delete("/sessions/{session_id}")
async def delete_session(session_id: str) -> dict:
    ensure_app_dirs()
    from tutor.core.config import CHATS_DIR

    path = Path(CHATS_DIR) / f"{session_id}.jsonl"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Session not found.")
    path.unlink()
    return {"status": "deleted", "session_id": session_id}


@app.options("/suggestions")
async def preflight_suggestions() -> dict:
    return {}


@app.post("/suggestions")
async def suggestions(request: SuggestionRequest) -> dict:
    if not _METAS:
        return {"suggestions": []}
    try:
        suggestions = build_suggestions(_METAS, prefix=request.prefix, limit=request.limit)
        return {"suggestions": suggestions}
    except Exception as exc:  # Suggestion generation is optional - don't fail the request
        logging.debug("Suggestion generation failed: %s", exc)
        return {"suggestions": []}


if __name__ == "__main__":  # pragma: no cover
    import uvicorn

    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
