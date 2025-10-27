"""
AI Tutor CLI Interface

A command-line interface for the AI Tutor that allows quick question-answering
without the web interface. Perfect for terminal-based workflows or quick lookups.

Usage:
    python quick.cli.py "What is the difference between X and Y?"
"""

import os
import sys
from typing import List

import faiss
import numpy as np

from tutor.core.config import TOP_K, USE_MULTI_QUERY, NUM_QUERY_VARIATIONS
from tutor.core.embeddings import get_embedder
from tutor.core.indexing import load_index_and_meta
from tutor.core.llm import llm_answer
from tutor.core.retrieval import build_prompt, retrieve

if __name__ == "__main__":
    # Load the vector index and metadata
    index, metas = load_index_and_meta()
    if not index or not metas:
        print("No index found. Put PDFs in data/, run: python ingest.py")
        sys.exit(1)
    
    # Initialize the embedding function
    embed = get_embedder()
    
    # Get the question from command line args or prompt user
    q = " ".join(sys.argv[1:]) or input("Q: ").strip()
    if not q:
        sys.exit(0)
    
    # Retrieve relevant document chunks
    hits = retrieve(
        q, 
        index, 
        metas, 
        embed, 
        k=int(os.getenv("TOP_K", str(TOP_K))),
        use_multi_query=USE_MULTI_QUERY,
        num_query_variations=NUM_QUERY_VARIATIONS
    )
    ctx = [m for _, m in hits]
    
    # Build the prompt and get the answer
    prompt = build_prompt(ctx, q)
    print("\nAnswer:\n")
    print(llm_answer(prompt))
    
    # Show source citations
    print("\nSources:")
    for m in ctx:
        print(f"- {m['source']} p.{m['page']} (chunk {m['chunk_index']})")