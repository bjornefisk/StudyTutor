"""Smart note-taking system with RAG-powered suggestions.

This module provides functionality for:
- Creating and managing study notes
- Live suggestions from uploaded documents
- Automatic citation tracking
- Export with proper references
"""
from __future__ import annotations

import json
import logging
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from .config import STORE_DIR

logger = logging.getLogger(__name__)

NOTES_DIR = os.path.join(STORE_DIR, "notes")


def ensure_notes_dir() -> None:
    """Ensure the notes directory exists."""
    Path(NOTES_DIR).mkdir(parents=True, exist_ok=True)


def create_note(
    title: str,
    content: str,
    tags: List[str] = None,
    linked_sources: List[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Create a new note with automatic citation tracking.
    
    Args:
        title: Note title
        content: Note content (markdown supported)
        tags: Optional list of tags
        linked_sources: Optional list of source citations
        
    Returns:
        Created note dictionary
    """
    ensure_notes_dir()
    
    note_id = uuid.uuid4().hex[:12]
    timestamp = datetime.utcnow().isoformat() + "Z"
    
    note = {
        "id": note_id,
        "title": title,
        "content": content,
        "tags": tags or [],
        "linked_sources": linked_sources or [],
        "created_at": timestamp,
        "updated_at": timestamp,
        "word_count": len(content.split()),
    }
    
    note_path = Path(NOTES_DIR) / f"{note_id}.json"
    with open(note_path, "w", encoding="utf-8") as f:
        json.dump(note, f, indent=2, ensure_ascii=False)
    
    logger.info(f"Created note '{title}' [{note_id}]")
    return note


def update_note(
    note_id: str,
    title: Optional[str] = None,
    content: Optional[str] = None,
    tags: Optional[List[str]] = None,
    linked_sources: Optional[List[Dict[str, Any]]] = None
) -> Optional[Dict[str, Any]]:
    """Update an existing note.
    
    Args:
        note_id: Note identifier
        title: New title (optional)
        content: New content (optional)
        tags: New tags (optional)
        linked_sources: New linked sources (optional)
        
    Returns:
        Updated note dictionary or None if not found
    """
    note = get_note(note_id)
    if not note:
        return None
    
    # Update fields
    if title is not None:
        note["title"] = title
    if content is not None:
        note["content"] = content
        note["word_count"] = len(content.split())
    if tags is not None:
        note["tags"] = tags
    if linked_sources is not None:
        note["linked_sources"] = linked_sources
    
    note["updated_at"] = datetime.utcnow().isoformat() + "Z"
    
    # Save
    note_path = Path(NOTES_DIR) / f"{note_id}.json"
    with open(note_path, "w", encoding="utf-8") as f:
        json.dump(note, f, indent=2, ensure_ascii=False)
    
    logger.info(f"Updated note [{note_id}]")
    return note


def get_note(note_id: str) -> Optional[Dict[str, Any]]:
    """Get a specific note by ID.
    
    Args:
        note_id: Note identifier
        
    Returns:
        Note dictionary or None if not found
    """
    note_path = Path(NOTES_DIR) / f"{note_id}.json"
    if not note_path.exists():
        return None
    
    with open(note_path, "r", encoding="utf-8") as f:
        return json.load(f)


def list_notes(
    tags: Optional[List[str]] = None,
    search: Optional[str] = None
) -> List[Dict[str, Any]]:
    """List all notes with optional filtering.
    
    Args:
        tags: Filter by tags (optional)
        search: Search in title and content (optional)
        
    Returns:
        List of note dictionaries sorted by updated_at (newest first)
    """
    ensure_notes_dir()
    notes = []
    
    for note_path in Path(NOTES_DIR).glob("*.json"):
        try:
            with open(note_path, "r", encoding="utf-8") as f:
                note = json.load(f)
                
                # Filter by tags
                if tags and not any(tag in note.get("tags", []) for tag in tags):
                    continue
                
                # Filter by search
                if search:
                    search_lower = search.lower()
                    if (search_lower not in note.get("title", "").lower() and
                        search_lower not in note.get("content", "").lower()):
                        continue
                
                notes.append(note)
        except Exception as e:
            logger.warning(f"Failed to load note {note_path}: {e}")
            continue
    
    # Sort by updated_at descending
    notes.sort(key=lambda n: n.get("updated_at", ""), reverse=True)
    return notes


def delete_note(note_id: str) -> bool:
    """Delete a note.
    
    Args:
        note_id: Note identifier
        
    Returns:
        True if deleted, False if not found
    """
    note_path = Path(NOTES_DIR) / f"{note_id}.json"
    if not note_path.exists():
        return False
    
    note_path.unlink()
    logger.info(f"Deleted note [{note_id}]")
    return True


def add_source_to_note(
    note_id: str,
    source: str,
    page: int,
    chunk_index: int,
    text: str,
    score: float
) -> Optional[Dict[str, Any]]:
    """Add a source citation to a note.
    
    Args:
        note_id: Note identifier
        source: Source document name
        page: Page number
        chunk_index: Chunk index
        text: Cited text snippet
        score: Relevance score
        
    Returns:
        Updated note or None if note not found
    """
    note = get_note(note_id)
    if not note:
        return None
    
    # Create citation
    citation = {
        "source": source,
        "page": page,
        "chunk_index": chunk_index,
        "text": text[:200],  # Limit to 200 chars
        "score": score,
        "added_at": datetime.utcnow().isoformat() + "Z"
    }
    
    # Add if not duplicate
    linked_sources = note.get("linked_sources", [])
    if not any(
        s["source"] == source and s["chunk_index"] == chunk_index
        for s in linked_sources
    ):
        linked_sources.append(citation)
        note["linked_sources"] = linked_sources
        note["updated_at"] = datetime.utcnow().isoformat() + "Z"
        
        # Save
        note_path = Path(NOTES_DIR) / f"{note_id}.json"
        with open(note_path, "w", encoding="utf-8") as f:
            json.dump(note, f, indent=2, ensure_ascii=False)
    
    return note


def export_note_with_citations(note_id: str) -> Optional[str]:
    """Export a note as markdown with proper citations.
    
    Args:
        note_id: Note identifier
        
    Returns:
        Markdown content with citations or None if not found
    """
    note = get_note(note_id)
    if not note:
        return None
    
    # Build markdown
    lines = []
    lines.append(f"# {note['title']}")
    lines.append("")
    lines.append(f"*Created: {note['created_at']}*")
    lines.append(f"*Updated: {note['updated_at']}*")
    
    if note.get("tags"):
        lines.append(f"*Tags: {', '.join(note['tags'])}*")
    
    lines.append("")
    lines.append("---")
    lines.append("")
    
    # Content
    lines.append(note["content"])
    lines.append("")
    
    # Citations
    if note.get("linked_sources"):
        lines.append("---")
        lines.append("")
        lines.append("## Sources & References")
        lines.append("")
        
        # Group by source document
        by_source = {}
        for citation in note["linked_sources"]:
            source = citation["source"]
            if source not in by_source:
                by_source[source] = []
            by_source[source].append(citation)
        
        for source, citations in by_source.items():
            lines.append(f"### {source}")
            for citation in citations:
                page_info = f"Page {citation['page']}" if citation['page'] > 0 else "N/A"
                lines.append(f"- **{page_info}**: {citation['text']}")
            lines.append("")
    
    # Metadata footer
    lines.append("---")
    lines.append("")
    lines.append(f"*Exported from AI Tutor on {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}*")
    
    return "\n".join(lines)


def export_all_notes() -> str:
    """Export all notes as a single markdown document.
    
    Returns:
        Combined markdown content
    """
    notes = list_notes()
    
    if not notes:
        return "# Study Notes\n\nNo notes available.\n"
    
    lines = []
    lines.append("# Study Notes Collection")
    lines.append("")
    lines.append(f"*Exported: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}*")
    lines.append(f"*Total Notes: {len(notes)}*")
    lines.append("")
    lines.append("---")
    lines.append("")
    
    for i, note in enumerate(notes, 1):
        lines.append(f"## {i}. {note['title']}")
        lines.append("")
        lines.append(f"*Created: {note['created_at']} | Updated: {note['updated_at']}*")
        if note.get("tags"):
            lines.append(f"*Tags: {', '.join(note['tags'])}*")
        lines.append("")
        lines.append(note["content"])
        lines.append("")
        
        if note.get("linked_sources"):
            lines.append("**Sources:**")
            for citation in note["linked_sources"][:5]:  # Limit to top 5
                lines.append(f"- {citation['source']} (Page {citation['page']})")
            lines.append("")
        
        lines.append("---")
        lines.append("")
    
    return "\n".join(lines)

