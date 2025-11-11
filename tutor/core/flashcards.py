"""Flashcard generation and management."""
from __future__ import annotations

import json
import logging
import os
import tempfile
import uuid
import zipfile
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from .config import STORE_DIR
from .llm import llm_answer

logger = logging.getLogger(__name__)

FLASHCARDS_DIR = os.path.join(STORE_DIR, "flashcards")


def ensure_flashcards_dir() -> None:
    """Ensure the flashcards directory exists."""
    Path(FLASHCARDS_DIR).mkdir(parents=True, exist_ok=True)


def _extract_key_concepts(text: str, num_concepts: int = 5) -> List[str]:
    prompt = f"""Analyze this educational material and identify the {num_concepts} MOST IMPORTANT concepts, theories, or ideas.

Focus on:
- Core principles and theories
- Important relationships between ideas
- Key processes or mechanisms
- Critical comparisons or contrasts
- Foundational concepts that build understanding

Material to analyze:
{text}

Return ONLY a JSON array of concept descriptions (no markdown, no explanations):
{{
  "concepts": [
    "Brief description of concept 1",
    "Brief description of concept 2"
  ]
}}"""
    
    try:
        response = llm_answer(prompt, max_tokens=1000)
        response = response.strip()
        
        if response.startswith("```"):
            lines = response.split("\n")
            response = "\n".join(lines[1:-1]) if len(lines) > 2 else response
            response = response.replace("```json", "").replace("```", "").strip()
        
        if not response.startswith("{"):
            json_start = response.find("{")
            if json_start > 0:
                response = response[json_start:]
        
        data = json.loads(response)
        concepts = data.get("concepts", [])
        logger.info(f"Extracted {len(concepts)} key concepts")
        return concepts[:num_concepts]
    except Exception as e:
        logger.warning(f"Failed to extract concepts: {e}. Proceeding with direct generation.")
        return []


def generate_flashcards_from_text(
    text: str,
    document_name: str,
    num_cards: int = 10,
    difficulty: str = "medium"
) -> List[Dict[str, Any]]:
    difficulty_config = {
        "easy": {
            "description": "Basic understanding and recall of core concepts",
            "question_types": "definitions, basic 'what is' questions, simple examples",
            "depth": "foundational understanding"
        },
        "medium": {
            "description": "Application and analysis of concepts",
            "question_types": "how/why questions, applications, comparisons, cause-effect",
            "depth": "analytical thinking and connections between ideas"
        },
        "hard": {
            "description": "Synthesis, evaluation, and deep analysis",
            "question_types": "synthesis across concepts, critical analysis, predictions, complex problem-solving",
            "depth": "expert-level understanding with nuanced thinking"
        }
    }
    
    config = difficulty_config.get(difficulty, difficulty_config["medium"])
    
    logger.info(f"Analyzing document ({len(text)} characters) for key concepts...")
    concepts = _extract_key_concepts(text[:20000], num_concepts=max(5, num_cards // 2))
    
    concept_context = ""
    if concepts:
        concept_context = "\n\nKey concepts identified in the material:\n" + "\n".join(f"- {c}" for c in concepts)
    
    prompt = f"""You are an expert educator creating CONCEPTUAL study flashcards that test TRUE UNDERSTANDING, not memorization.

Your goal: Create {num_cards} flashcards that test {config['description']}.

IMPORTANT INSTRUCTIONS:
- DO NOT ask questions that are directly stated in the text
- DO NOT ask for exact definitions word-for-word
- DO ask questions that require UNDERSTANDING the concept
- DO ask questions that test APPLICATION of ideas
- DO ask questions that explore RELATIONSHIPS between concepts
- Focus on: {config['question_types']}
- Test: {config['depth']}

Question style examples:
❌ BAD: "What is photosynthesis?" (just recall)
✅ GOOD: "Why do plants perform photosynthesis in daylight but not at night?"

❌ BAD: "Define mitosis" (memorization)
✅ GOOD: "How does mitosis ensure genetic consistency in daughter cells?"

❌ BAD: "What are the three branches of government?" (listed in text)
✅ GOOD: "Why does separation of powers prevent tyranny in democratic systems?"
{concept_context}

Material to create flashcards from:
{text}

Return EXACTLY {num_cards} flashcards in this JSON format (respond with ONLY valid JSON, no markdown):
{{
  "flashcards": [
    {{
      "front": "Conceptual question that tests understanding (how/why/explain/analyze)",
      "back": "Comprehensive answer with reasoning and connections",
      "tags": ["concept1", "concept2"]
    }}
  ]
}}"""

    try:
        max_tokens = min(4000, num_cards * 250 + 500)
        response = llm_answer(prompt, max_tokens=max_tokens)
        
        if not response or len(response.strip()) < 10:
            logger.error(f"LLM returned empty or very short response: '{response}'")
            raise ValueError("LLM returned empty response. Check if your LLM backend (Ollama/OpenRouter) is running.")
        
        response = response.strip()
        original_response = response
        
        if response.startswith("```"):
            lines = response.split("\n")
            response = "\n".join(lines[1:-1]) if len(lines) > 2 else response
            response = response.replace("```json", "").replace("```", "").strip()
        
        if not response.startswith("{"):
            json_start = response.find("{")
            if json_start > 0:
                response = response[json_start:]
        
        data = json.loads(response)
        flashcards_raw = data.get("flashcards", [])
        
        if not flashcards_raw:
            logger.error(f"LLM response had no flashcards. Response: {original_response[:500]}")
            raise ValueError("LLM did not generate any flashcards. Try with different documents or check LLM configuration.")
        
        flashcards = []
        for idx, card in enumerate(flashcards_raw):
            if "front" in card and "back" in card:
                flashcards.append({
                    "id": uuid.uuid4().hex[:12],
                    "front": card["front"].strip(),
                    "back": card["back"].strip(),
                    "tags": card.get("tags", []) + [document_name],
                    "source_document": document_name,
                    "created_at": datetime.utcnow().isoformat() + "Z",
                    "difficulty": difficulty,
                    "review_count": 0,
                    "correct_count": 0,
                    "last_reviewed": None,
                    "next_review": None,
                })
            else:
                logger.warning(f"Skipping invalid flashcard at index {idx}: missing 'front' or 'back'")
        
        if not flashcards:
            logger.error(f"All flashcards were invalid. Raw data: {flashcards_raw}")
            raise ValueError("All generated flashcards were invalid (missing required fields).")
        
        logger.info(f"Generated {len(flashcards)} flashcards from {document_name}")
        return flashcards
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse LLM response as JSON: {e}")
        logger.error(f"Response was: {response[:1000]}")
        raise ValueError(f"LLM response was not valid JSON. Error: {str(e)}")
    except Exception as e:
        logger.error(f"Error generating flashcards: {e}")
        if isinstance(e, ValueError):
            raise  # Re-raise ValueError with our custom message
        raise ValueError(f"Failed to generate flashcards: {str(e)}")


def save_flashcard_deck(
    deck_name: str,
    flashcards: List[Dict[str, Any]],
    deck_id: Optional[str] = None
) -> str:
    """Save a flashcard deck to storage.
    
    Args:
        deck_name: Name of the deck
        flashcards: List of flashcard dictionaries
        deck_id: Optional existing deck ID (creates new if not provided)
        
    Returns:
        The deck ID
    """
    ensure_flashcards_dir()
    
    deck_id = deck_id or uuid.uuid4().hex[:12]
    deck_path = Path(FLASHCARDS_DIR) / f"{deck_id}.json"
    
    deck_data = {
        "id": deck_id,
        "name": deck_name,
        "created_at": datetime.utcnow().isoformat() + "Z",
        "updated_at": datetime.utcnow().isoformat() + "Z",
        "card_count": len(flashcards),
        "flashcards": flashcards
    }
    
    with open(deck_path, "w", encoding="utf-8") as f:
        json.dump(deck_data, f, indent=2, ensure_ascii=False)
    
    logger.info(f"Saved deck '{deck_name}' with {len(flashcards)} cards to {deck_path}")
    return deck_id


def load_flashcard_deck(deck_id: str) -> Optional[Dict[str, Any]]:
    """Load a flashcard deck from storage.
    
    Args:
        deck_id: The deck identifier
        
    Returns:
        Deck data dictionary or None if not found
    """
    deck_path = Path(FLASHCARDS_DIR) / f"{deck_id}.json"
    if not deck_path.exists():
        return None
    
    with open(deck_path, "r", encoding="utf-8") as f:
        return json.load(f)


def list_flashcard_decks() -> List[Dict[str, Any]]:
    """List all available flashcard decks.
    
    Returns:
        List of deck summary dictionaries
    """
    ensure_flashcards_dir()
    decks = []
    
    for deck_path in Path(FLASHCARDS_DIR).glob("*.json"):
        try:
            with open(deck_path, "r", encoding="utf-8") as f:
                deck_data = json.load(f)
                decks.append({
                    "id": deck_data["id"],
                    "name": deck_data["name"],
                    "card_count": deck_data["card_count"],
                    "created_at": deck_data["created_at"],
                    "updated_at": deck_data.get("updated_at", deck_data["created_at"])
                })
        except Exception as e:
            logger.warning(f"Failed to load deck {deck_path}: {e}")
            continue
    
    # Sort by updated_at descending
    decks.sort(key=lambda d: d.get("updated_at", ""), reverse=True)
    return decks


def update_flashcard_review(
    deck_id: str,
    card_id: str,
    correct: bool
) -> bool:
    """Update flashcard review statistics.
    
    Args:
        deck_id: The deck identifier
        card_id: The card identifier
        correct: Whether the review was correct
        
    Returns:
        True if update successful, False otherwise
    """
    deck = load_flashcard_deck(deck_id)
    if not deck:
        return False
    
    for card in deck["flashcards"]:
        if card["id"] == card_id:
            card["review_count"] = card.get("review_count", 0) + 1
            if correct:
                card["correct_count"] = card.get("correct_count", 0) + 1
            card["last_reviewed"] = datetime.utcnow().isoformat() + "Z"
            
            # Simple spaced repetition: next review based on accuracy
            accuracy = card["correct_count"] / card["review_count"]
            if accuracy >= 0.8:
                days_delay = 7  # Review in a week if doing well
            elif accuracy >= 0.6:
                days_delay = 3  # Review in 3 days if okay
            else:
                days_delay = 1  # Review tomorrow if struggling
            
            from datetime import timedelta
            next_review = datetime.utcnow() + timedelta(days=days_delay)
            card["next_review"] = next_review.isoformat() + "Z"
            
            break
    
    # Update deck metadata
    deck["updated_at"] = datetime.utcnow().isoformat() + "Z"
    
    # Save back to disk
    deck_path = Path(FLASHCARDS_DIR) / f"{deck_id}.json"
    with open(deck_path, "w", encoding="utf-8") as f:
        json.dump(deck, f, indent=2, ensure_ascii=False)
    
    return True


def delete_flashcard_deck(deck_id: str) -> bool:
    """Delete a flashcard deck.
    
    Args:
        deck_id: The deck identifier
        
    Returns:
        True if deletion successful, False if deck not found
    """
    deck_path = Path(FLASHCARDS_DIR) / f"{deck_id}.json"
    if not deck_path.exists():
        return False
    
    deck_path.unlink()
    logger.info(f"Deleted deck {deck_id}")
    return True


def export_to_anki(deck_id: str) -> Optional[bytes]:
    """Export a flashcard deck to Anki .apkg format.
    
    Args:
        deck_id: The deck identifier
        
    Returns:
        Bytes of the .apkg file, or None if deck not found
    """
    deck = load_flashcard_deck(deck_id)
    if not deck:
        return None
    
    try:
        # Create temporary directory for Anki package
        with tempfile.TemporaryDirectory() as tmpdir:
            tmppath = Path(tmpdir)
            
            # Anki uses a SQLite database, but we'll use a simplified text-based format
            # that can be imported via Anki's "Import from text file" feature
            # This is more reliable than generating a full .apkg
            
            # Create a TSV file (tab-separated values) for Anki import
            anki_txt = []
            anki_txt.append("# Deck: " + deck["name"])
            anki_txt.append("# Separator: Tab")
            anki_txt.append("# Tags column: 3")
            anki_txt.append("")
            
            for card in deck["flashcards"]:
                # Format: Front\tBack\tTags
                front = card["front"].replace("\t", " ").replace("\n", "<br>")
                back = card["back"].replace("\t", " ").replace("\n", "<br>")
                tags = " ".join(card.get("tags", []))
                anki_txt.append(f"{front}\t{back}\t{tags}")
            
            txt_content = "\n".join(anki_txt)
            
            # Create a .txt file for Anki import
            txt_path = tmppath / f"{deck['name']}_anki_import.txt"
            txt_path.write_text(txt_content, encoding="utf-8")
            
            # Create a zip file with .apkg extension (Anki format)
            apkg_path = tmppath / f"{deck['name']}.apkg"
            with zipfile.ZipFile(apkg_path, "w", zipfile.ZIP_DEFLATED) as zipf:
                # Add the import instructions
                zipf.writestr("import_instructions.txt", 
                    "Import this deck in Anki:\n"
                    "1. Open Anki\n"
                    "2. File -> Import\n"
                    "3. Select the .txt file from this package\n"
                    "4. Make sure 'Fields separated by: Tab' is selected\n"
                    "5. Map the first field to Front, second to Back\n"
                    "6. Click Import\n")
                
                # Add the actual flashcard data
                zipf.write(txt_path, txt_path.name)
            
            # Read the .apkg file
            return apkg_path.read_bytes()
            
    except Exception as e:
        logger.error(f"Failed to export deck to Anki: {e}")
        return None

