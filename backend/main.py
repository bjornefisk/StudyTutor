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
from typing import Any, Callable, List, Optional

from fastapi import BackgroundTasks, FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from tutor.core.config import (
    DATA_DIR,
    TOP_K,
    USE_MULTI_QUERY,
    NUM_QUERY_VARIATIONS,
    USE_HYBRID_RETRIEVAL,
    RRF_K,
)
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
from tutor.core.notes import (
    create_note,
    update_note,
    get_note,
    list_notes,
    delete_note,
    add_source_to_note,
    export_note_with_citations,
    export_all_notes,
)

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
        "http://localhost:3002",
        "http://127.0.0.1:3002",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


_RESOURCE_LOCK = Lock()
_INDEX = None
_METAS: List[dict] = []
_BM25 = None
_BM25_CORPUS = None
_EMBED_FN: Optional[Callable[[List[str]], Any]] = None


def refresh_resources(force_reload: bool = False) -> None:
    """Load or reload FAISS, BM25 resources, and the embedder."""
    global _INDEX, _METAS, _BM25, _BM25_CORPUS, _EMBED_FN
    with _RESOURCE_LOCK:
        _INDEX, _METAS, _BM25, _BM25_CORPUS = load_index_and_meta(force_reload=force_reload)
        _EMBED_FN = get_embedder()


refresh_resources()


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="User prompt")
    session_id: Optional[str] = Field(default=None, description="Existing session identifier")
    top_k: Optional[int] = Field(default=None, ge=1, le=20, description="Override number of retrieved chunks")
    use_multi_query: Optional[bool] = Field(default=None, description="Enable multi-query retrieval for better results")
    use_wikipedia: Optional[bool] = Field(default=None, description="Enable Wikipedia knowledge augmentation")


class Source(BaseModel):
    source: str
    page: int
    chunk_index: int
    score: float
    text: str
    source_type: str = "local"
    url: Optional[str] = None
    title: Optional[str] = None
    license: Optional[str] = None
    license_url: Optional[str] = None
    revid: Optional[int] = None
    attribution: Optional[str] = None


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


class NoteCreate(BaseModel):
    title: str = Field(..., min_length=1, description="Note title")
    content: str = Field(default="", description="Note content (markdown supported)")
    tags: List[str] = Field(default_factory=list, description="Tags for organization")
    linked_sources: List[dict] = Field(default_factory=list, description="Linked source citations")


class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[List[str]] = None
    linked_sources: Optional[List[dict]] = None


class NoteSuggestionRequest(BaseModel):
    content: str = Field(..., description="Current note content to get suggestions for")
    top_k: int = Field(default=3, ge=1, le=10, description="Number of suggestions to return")


class AddSourceRequest(BaseModel):
    source: str
    page: int
    chunk_index: int
    text: str
    score: float


def _assert_index_ready() -> None:
    if _INDEX is None or not _METAS or _EMBED_FN is None:
        raise HTTPException(
            status_code=503,
            detail=(
                "Vector index not loaded. Upload documents and run ingestion first. "
                "(Hybrid BM25 index is optional and will be used automatically when available.)"
            ),
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
    from tutor.core.config import WIKIMEDIA_ENABLED
    
    health_data = {
        "status": "healthy" if _INDEX is not None else "degraded",
        "documents": len(_METAS),
        "embedding_backend": os.getenv("EMBEDDINGS_BACKEND", "sbert"),
        "llm_backend": os.getenv("LLM_BACKEND", "ollama"),
        "wikimedia_enabled": WIKIMEDIA_ENABLED,
    }
    
    # Add cache stats if Wikipedia is enabled
    if WIKIMEDIA_ENABLED:
        try:
            from tutor.core.cache_manager import wikimedia_cache
            health_data["wikimedia_cache"] = wikimedia_cache.stats()
        except Exception as e:
            logger.warning(f"Failed to get cache stats: {e}")
    
    return health_data


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
    use_wiki = request.use_wikipedia if request.use_wikipedia is not None else True

    if _EMBED_FN is None:
        raise HTTPException(status_code=503, detail="Embedding function not initialized.")

    from tutor.core.advanced_prompting import expand_query_with_planning
    from tutor.core.llm import llm_call
    
    try:
        expanded_queries = expand_query_with_planning(
            prompt,
            llm_call_fn=lambda p: llm_call(p, max_tokens=150)
        )
        logging.info(f"Query planning: expanded into {len(expanded_queries)} queries")
    except Exception as exc:
        logging.warning(f"Query planning failed: {exc}, using original query")
        expanded_queries = [prompt]
    
    # Use hybrid retrieval with Wikipedia
    all_hits = []
    wiki_result = None
    
    if use_wiki:
        from tutor.core.knowledge_sources import hybrid_retrieve, format_wikipedia_source
        
        for query in expanded_queries:
            local_hits, wiki_data = await hybrid_retrieve(
                query,
                _INDEX,
                _METAS,
                _EMBED_FN,
                k=k,
                use_multi_query=use_mq,
                num_query_variations=NUM_QUERY_VARIATIONS,
                bm25=_BM25,
                bm25_corpus=_BM25_CORPUS,
                use_hybrid=USE_HYBRID_RETRIEVAL,
                rrf_k=RRF_K,
            )
            all_hits.extend(local_hits)
            
            # Store Wikipedia result (only need one)
            if wiki_data and not wiki_result:
                wiki_result = wiki_data
    else:
        # Use original retrieval
        for query in expanded_queries:
            hits = retrieve(
                query, 
                _INDEX, 
                _METAS, 
                _EMBED_FN, 
                k=k, 
                use_multi_query=use_mq,
                num_query_variations=NUM_QUERY_VARIATIONS,
                bm25=_BM25,
                bm25_corpus=_BM25_CORPUS,
                use_hybrid=USE_HYBRID_RETRIEVAL,
                rrf_k=RRF_K,
            )
            all_hits.extend(hits)
    
    from tutor.core.multi_query import deduplicate_results
    hits = deduplicate_results(all_hits, top_k=k)
    
    context_chunks = [meta for _, meta in hits]
    
    # Add Wikipedia content to context if available
    if wiki_result:
        context_chunks.append({
            "source": f"Wikipedia: {wiki_result['title']}",
            "page": 0,
            "text": wiki_result["extract"],
        })
    
    answer = llm_answer(
        prompt, 
        max_tokens=512, 
        use_advanced=True, 
        context_chunks=context_chunks
    )

    timestamp = datetime.utcnow().isoformat() + "Z"
    append_chat_message(session_id, "assistant", answer)

    sources = [
        Source(
            source=meta["source"],
            page=int(meta.get("page", 0)),
            chunk_index=int(meta.get("chunk_index", -1)),
            score=float(score),
            text=(meta.get("text", "")[:200] + "...") if len(meta.get("text", "")) > 200 else meta.get("text", ""),
            source_type="local",
        )
        for score, meta in hits
    ]
    
    # Add Wikipedia source if available
    if wiki_result:
        from tutor.core.knowledge_sources import format_wikipedia_source
        wiki_source = format_wikipedia_source(wiki_result)
        sources.append(Source(**wiki_source))

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
        except Exception as exc:
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


@app.get("/files/content/{path:path}")
async def get_file_content(path: str):
    """Serve raw file content for previews and downloads.

    The provided path is interpreted relative to DATA_DIR. Path traversal is prevented
    by resolving the absolute path and ensuring it remains within DATA_DIR.
    """
    ensure_app_dirs()
    base = Path(DATA_DIR).resolve()
    target = (base / path).resolve()

    if not str(target).startswith(str(base)):
        raise HTTPException(status_code=400, detail="Invalid file path")

    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    suffix = target.suffix.lower()
    media_type = "application/octet-stream"
    if suffix == ".pdf":
        media_type = "application/pdf"
    elif suffix == ".txt":
        media_type = "text/plain; charset=utf-8"
    elif suffix == ".md":
        media_type = "text/markdown; charset=utf-8"
    elif suffix == ".docx":
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

    return FileResponse(path=str(target), media_type=media_type, filename=target.name)


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


# ============================================================================
# Note-Taking Endpoints
# ============================================================================

@app.post("/notes")
async def create_note_endpoint(request: NoteCreate) -> dict:
    """Create a new note."""
    note = create_note(
        title=request.title,
        content=request.content,
        tags=request.tags,
        linked_sources=request.linked_sources
    )
    return note


@app.get("/notes")
async def list_notes_endpoint(
    tags: Optional[str] = None,
    search: Optional[str] = None
) -> dict:
    """List all notes with optional filtering."""
    tag_list = tags.split(",") if tags else None
    notes = list_notes(tags=tag_list, search=search)
    return {"notes": notes, "count": len(notes)}


@app.get("/notes/{note_id}")
async def get_note_endpoint(note_id: str) -> dict:
    """Get a specific note."""
    note = get_note(note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


@app.put("/notes/{note_id}")
async def update_note_endpoint(note_id: str, request: NoteUpdate) -> dict:
    """Update a note."""
    note = update_note(
        note_id=note_id,
        title=request.title,
        content=request.content,
        tags=request.tags,
        linked_sources=request.linked_sources
    )
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


@app.delete("/notes/{note_id}")
async def delete_note_endpoint(note_id: str) -> dict:
    """Delete a note."""
    success = delete_note(note_id)
    if not success:
        raise HTTPException(status_code=404, detail="Note not found")
    return {"status": "deleted", "note_id": note_id}


@app.post("/notes/{note_id}/sources")
async def add_source_to_note_endpoint(note_id: str, request: AddSourceRequest) -> dict:
    """Add a source citation to a note."""
    note = add_source_to_note(
        note_id=note_id,
        source=request.source,
        page=request.page,
        chunk_index=request.chunk_index,
        text=request.text,
        score=request.score
    )
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


@app.post("/notes/suggestions")
async def get_note_suggestions(request: NoteSuggestionRequest) -> dict:
    """Get RAG-based suggestions for note content.
    
    This uses the existing retrieval system to find related content
    from uploaded documents based on what the user is currently writing.
    """
    _assert_index_ready()
    
    if not request.content or len(request.content.strip()) < 10:
        return {"suggestions": []}
    
    # Use the last 500 characters for context
    query_text = request.content[-500:].strip()
    
    try:
        if _EMBED_FN is None:
            raise HTTPException(status_code=503, detail="Embedding function not initialized.")
        
        # Use existing RAG retrieval
        hits = retrieve(
            query_text,
            _INDEX,
            _METAS,
            _EMBED_FN,
            k=request.top_k,
            use_multi_query=False,  # Fast retrieval for live suggestions
            bm25=_BM25,
            bm25_corpus=_BM25_CORPUS,
            use_hybrid=USE_HYBRID_RETRIEVAL,
            rrf_k=RRF_K,
        )
        
        suggestions = []
        for score, meta in hits:
            suggestions.append({
                "source": meta["source"],
                "page": int(meta.get("page", 0)),
                "chunk_index": int(meta.get("chunk_index", -1)),
                "text": meta.get("text", "")[:300],  # First 300 chars
                "score": float(score),
                "relevance": "high" if score > 0.8 else "medium" if score > 0.6 else "low"
            })
        
        return {"suggestions": suggestions, "count": len(suggestions)}
    except Exception as e:
        logging.error(f"Failed to generate suggestions: {e}")
        return {"suggestions": [], "error": str(e)}


@app.get("/notes/{note_id}/export")
async def export_note_endpoint(note_id: str):
    """Export a note as markdown with citations."""
    from fastapi.responses import Response
    
    markdown = export_note_with_citations(note_id)
    if not markdown:
        raise HTTPException(status_code=404, detail="Note not found")
    
    note = get_note(note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    filename = f"{note['title'].replace(' ', '_')}.md"
    
    return Response(
        content=markdown,
        media_type="text/markdown",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


@app.get("/notes/export/all")
async def export_all_notes_endpoint():
    """Export all notes as a single markdown document."""
    from fastapi.responses import Response
    
    markdown = export_all_notes()
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"all_notes_{timestamp}.md"
    
    return Response(
        content=markdown,
        media_type="text/markdown",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


# ============================================================================
# Wikimedia Cache Management
# ============================================================================

@app.get("/admin/cache/stats")
async def get_cache_stats() -> dict:
    """Get Wikimedia cache statistics."""
    from tutor.core.config import WIKIMEDIA_ENABLED
    
    if not WIKIMEDIA_ENABLED:
        raise HTTPException(status_code=400, detail="Wikimedia integration is disabled")
    
    try:
        from tutor.core.cache_manager import wikimedia_cache
        return wikimedia_cache.stats()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get cache stats: {e}")


@app.post("/admin/cache/clear")
async def clear_cache() -> dict:
    """Clear Wikimedia cache."""
    from tutor.core.config import WIKIMEDIA_ENABLED
    
    if not WIKIMEDIA_ENABLED:
        raise HTTPException(status_code=400, detail="Wikimedia integration is disabled")
    
    try:
        from tutor.core.cache_manager import wikimedia_cache
        wikimedia_cache.clear()
        return {
            "status": "cleared",
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear cache: {e}")


if __name__ == "__main__":  # pragma: no cover
    import uvicorn

    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
