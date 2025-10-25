import os, sys
import numpy as np
import faiss
from tutor.core.indexing import load_index_and_meta
from tutor.core.embeddings import get_embedder
from tutor.core.retrieval import retrieve, build_prompt
from tutor.core.llm import llm_answer
from tutor.core.config import TOP_K

if __name__ == "__main__":
    index, metas = load_index_and_meta()
    if not index or not metas:
        print("No index found. Put PDFs in data/, run: python ingest.py")
        sys.exit(1)
    embed = get_embedder()
    q = " ".join(sys.argv[1:]) or input("Q: ").strip()
    if not q:
        sys.exit(0)
    hits = retrieve(q, index, metas, embed, k=int(os.getenv("TOP_K", str(TOP_K))))
    ctx = [m for _, m in hits]
    prompt = build_prompt(ctx, q)
    print("\nAnswer:\n")
    print(llm_answer(prompt))
    print("\nSources:")
    for m in ctx:
        print(f"- {m['source']} p.{m['page']} (chunk {m['chunk_index']})")