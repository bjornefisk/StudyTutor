from __future__ import annotations

import logging
from typing import Any, Callable, Dict, List, Optional

import numpy as np

from .config import LLM_BACKEND, OLLAMA_MODEL, OPENROUTER_API_KEY, OPENROUTER_BASE_URL, OPENROUTER_CHAT_MODEL

logger = logging.getLogger(__name__)


DOMAIN_SYSTEM_PROMPT = """You are Study Tutor, an AI-powered, document-grounded tutoring assistant.

PDF INPUT CAPABILITES: ENABLED

Your primary purpose is to help students understand and learn from their own study materials using Retrieval-Augmented Generation (RAG).

────────────────────────────────────────────
CORE BEHAVIOR
────────────────────────────────────────────

• You ONLY answer questions using the context provided from the user’s indexed documents or the wikimedia API.
• If the retrieved context is insufficient, unclear, or missing, explicitly say so.
• Never hallucinate facts, definitions, or explanations not grounded in the provided documents.
• Prefer accuracy and clarity over verbosity.
• Explain concepts in a tutor-like manner: step-by-step, intuitive, and student-friendly.

────────────────────────────────────────────
DOCUMENT-AWARE ANSWERING
────────────────────────────────────────────

• Treat retrieved documents as the source of truth.
• Synthesize answers across multiple documents when relevant.
• Preserve original meaning — do not reinterpret content beyond what the documents support.
• When multiple interpretations exist, present them clearly and neutrally.

────────────────────────────────────────────
CITATIONS & TRACEABILITY
────────────────────────────────────────────

• Always cite your sources when answering.
• Citations must reference the provided document metadata (file name, section, page, or chunk ID if available).
• If multiple sources support a claim, cite all relevant sources.
• If a statement cannot be cited, do not include it.

────────────────────────────────────────────
TUTORING STYLE
────────────────────────────────────────────

• Assume the user is a student trying to learn, not just retrieve facts.
• Break down complex ideas into:
  - Simple explanations
  - Key definitions
  - Examples (only if supported by the documents)
• Use clear formatting (bullet points, numbered steps) when helpful.
• Avoid unnecessary jargon unless it appears in the source material.

────────────────────────────────────────────
LIMITATIONS & HONESTY
────────────────────────────────────────────

• If a question goes beyond the scope of the indexed materials, say:
  “This isn’t covered in your uploaded documents.”
• Do NOT rely on general world knowledge unless it is explicitly present in the retrieved context.
• Do NOT fabricate citations or sources.

────────────────────────────────────────────
TECHNICAL CONTEXT (FOR BEHAVIOR ALIGNMENT)
────────────────────────────────────────────

• This system uses a document index built from PDFs, Word files, Markdown, and text notes.
• Answers are generated using RAG with LLMs such as Llama 3.3 70B (via OpenRouter) or local Ollama models.
• Backend: FastAPI
• Frontend: Next.js + React + TypeScript

You are not a general-purpose chatbot.
You are a focused, document-grounded study assistant.
Your goal is to help the user learn accurately from their own materials.
"""


def generate_multi_expert_response(
    question: str,
    context: str,
    llm_call_fn: Callable[[str], str]
) -> str:
    """
    Run the question through 3 expert perspectives and merge responses.
    
    Perspectives:
    1. Teacher - Focuses on clear explanation and pedagogy
    2. Researcher - Emphasizes depth, nuance, and connections
    3. Peer Tutor - Uses relatable language and examples
    
    Args:
        question: User's question
        context: Retrieved context from RAG
        llm_call_fn: Function to call the LLM with a prompt
        
    Returns:
        Merged expert response
    """
    experts = [
        {
            "name": "Teacher",
            "prompt": f"""{DOMAIN_SYSTEM_PROMPT}

As an experienced TEACHER, your goal is to explain concepts clearly and systematically.
Focus on:
- Breaking down the topic into logical steps
- Using clear, precise language
- Highlighting key concepts students should remember
- Providing structure to aid learning

Context:
{context}

Question: {question}

Provide a clear, structured explanation as a teacher would:"""
        },
        {
            "name": "Researcher",
            "prompt": f"""{DOMAIN_SYSTEM_PROMPT}

As a RESEARCHER, your goal is to provide deep, nuanced understanding.
Focus on:
- Exploring underlying principles and mechanisms
- Making connections to related concepts
- Addressing subtleties and edge cases
- Providing comprehensive context

Context:
{context}

Question: {question}

Provide an in-depth, research-oriented analysis:"""
        },
        {
            "name": "Peer Tutor",
            "prompt": f"""{DOMAIN_SYSTEM_PROMPT}

As a PEER TUTOR, your goal is to make the material relatable and accessible.
Focus on:
- Using everyday language and analogies
- Relating concepts to common experiences
- Anticipating confusion points
- Making the material engaging and memorable

Context:
{context}

Question: {question}

Explain this in a friendly, relatable way:"""
        }
    ]
    
    expert_responses = []
    for expert in experts:
        try:
            response = llm_call_fn(expert["prompt"])
            expert_responses.append({
                "name": expert["name"],
                "response": response
            })
            logger.info(f"Got response from {expert['name']} perspective")
        except Exception as exc:
            logger.error(f"Failed to get {expert['name']} perspective: {exc}")
            continue
    
    if not expert_responses:
        logger.error("All expert perspectives failed, falling back to simple prompt")
        return llm_call_fn(f"{DOMAIN_SYSTEM_PROMPT}\n\nContext:\n{context}\n\nQuestion: {question}\n\nAnswer:")
    
    merge_prompt = f"""You have received three expert perspectives on the following question:

Question: {question}

Expert Perspectives:
"""
    for i, exp in enumerate(expert_responses, 1):
        merge_prompt += f"\n{i}. {exp['name']}'s Perspective:\n{exp['response']}\n"
    
    merge_prompt += """
Your task is to synthesize these perspectives into a single, comprehensive answer that:
- Combines the strengths of each perspective
- Maintains clarity while providing depth
- Resolves any contradictions or overlaps
- Presents a unified, coherent response

Synthesized answer:"""
    
    try:
        merged = llm_call_fn(merge_prompt)
        return merged
    except Exception as exc:
        logger.error(f"Failed to merge expert responses: {exc}, returning first expert")
        return expert_responses[0]["response"]


def expand_query_with_planning(
    question: str,
    llm_call_fn: Callable[[str], str]
) -> List[str]:
    """
    Expand user query into subqueries for comprehensive retrieval.
    
    This technique:
    - Decomposes complex questions into simpler subquestions
    - Identifies prerequisite knowledge needed
    - Plans retrieval strategy
    
    Args:
        question: Original user question
        llm_call_fn: Function to call the LLM
        
    Returns:
        List of expanded queries/subqueries
    """
    planning_prompt = f"""Given this student question, break it down into 2-4 simpler subquestions that would help answer it comprehensively.

Think about:
- What prerequisite concepts need to be understood?
- What are the key components of the question?
- What related information would provide helpful context?

Original question: {question}

Generate 2-4 focused subquestions (one per line, no numbering):"""
    
    try:
        response = llm_call_fn(planning_prompt)
        
        import re
        subqueries = [question]
        
        for line in response.split('\n'):
            line = line.strip()
            line = re.sub(r'^\d+[\.\)]\s*', '', line)
            line = re.sub(r'^[-•*]\s*', '', line)
            
            if line and len(line) > 10 and line not in subqueries:
                subqueries.append(line)
        
        logger.info(f"Expanded query into {len(subqueries)} subqueries")
        return subqueries[:5]
        
    except Exception as exc:
        logger.error(f"Query planning failed: {exc}")
        return [question]


def apply_self_critique(
    draft_answer: str,
    question: str,
    context: str,
    llm_call_fn: Callable[[str], str]
) -> str:
    """
    Apply self-critique to refine and improve the answer.
    
    This technique:
    - Reviews the draft for clarity and accuracy
    - Removes unnecessary verbosity
    - Ensures grounding in provided context
    - Tightens language and structure
    
    Args:
        draft_answer: Initial answer to critique
        question: Original question
        context: Source context
        llm_call_fn: Function to call the LLM
        
    Returns:
        Refined answer
    """
    critique_prompt = f"""You are an editor reviewing a tutor's answer for quality and clarity.

Original Question: {question}

Available Context:
{context[:500]}... [truncated]

Draft Answer:
{draft_answer}

Review this answer and provide an improved version that:
1. Removes any unnecessary verbosity or repetition
2. Ensures all claims are grounded in the provided context
3. Improves clarity and readability
4. Maintains appropriate length (2-4 sentences for simple questions, more for complex ones)
5. Uses precise, academic language
6. Fixes any logical issues or ambiguities

If the draft is already excellent, you may return it with minimal changes.

Improved Answer:"""
    
    try:
        refined = llm_call_fn(critique_prompt)
        
        if len(refined.strip()) < 20:
            logger.warning("Self-critique produced too-short answer, returning draft")
            return draft_answer
        
        logger.info("Applied self-critique refinement")
        return refined
        
    except Exception as exc:
        logger.error(f"Self-critique failed: {exc}, returning draft")
        return draft_answer


def advanced_rag_answer(
    question: str,
    context_chunks: List[Dict],
    llm_call_fn: Callable[[str], str],
    use_multi_expert: bool = True,
    use_query_planning: bool = True,
    use_self_critique: bool = True
) -> str:
    """
    Complete advanced RAG pipeline with all prompt engineering techniques.
    
    Pipeline:
    1. Domain-scoped system prompt (always applied)
    2. Multi-expert perspectives (optional)
    3. RAG with query planning (handled upstream in retrieval)
    4. Self-critique refinement (optional)
    
    Args:
        question: User's question
        context_chunks: Retrieved context from RAG
        llm_call_fn: Function to call the LLM
        use_multi_expert: Whether to use multi-expert merging
        use_query_planning: Whether query planning was used (informational)
        use_self_critique: Whether to apply self-critique
        
    Returns:
        Final refined answer
    """
    # Format context
    context = "\n\n---\n\n".join([
        f"Source: {c.get('source', 'Unknown')} (p.{c.get('page', '?')})\n{c.get('text', '')}"
        for c in context_chunks
    ])
    
    if use_multi_expert:
        logger.info("Using multi-expert role prompting")
        draft = generate_multi_expert_response(question, context, llm_call_fn)
    else:
        simple_prompt = f"""{DOMAIN_SYSTEM_PROMPT}

Context:
{context}

Question: {question}

Answer:"""
        draft = llm_call_fn(simple_prompt)
    
    if use_self_critique:
        logger.info("Applying self-critique refinement")
        final = apply_self_critique(draft, question, context, llm_call_fn)
    else:
        final = draft
    
    return final
