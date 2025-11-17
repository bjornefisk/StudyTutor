# Hybrid Retrieval Validation Plan

These steps help ensure the new BM25 + vector fusion behaves as intended and that existing functionality keeps working when lexical search is unavailable or disabled.

## Prerequisites
- Run `python ingest.py` so `storage/faiss.index` and `storage/metadata.jsonl` are up to date.
- Install backend dependencies (now including `rank-bm25`) via `pip install -r requirements.txt`.
- Ensure the FastAPI server is not running before rebuilding indices.

## Test Matrix

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 1 | Keyword boost | a) Start backend with default settings.<br>b) Ask `/chat` a query that contains an exact identifier (e.g., a specific function or acronym known to exist in one chunk). | Response sources should include the chunk that contains the exact keyword with noticeably higher ranking than before hybrid (verify via server logs or comparing to prior behavior). |
| 2 | Code-like token | Query `/chat` for a camelCase variable or snake_case constant that is present verbatim in a document chunk. | Returned sources should include the chunk containing the exact token even if embeddings were previously missing it. |
| 3 | Multi-query blend | Send a broad conceptual question that triggers `USE_MULTI_QUERY=true` and inspect logs for `Multi-query retrieval` output. | Logs show multi-query dedup still works and final sources include both semantic and lexical hits. |
| 4 | Toggle hybrid off | Restart backend with `USE_HYBRID_RETRIEVAL=false`. Repeat scenario #1. | Rankings revert to prior behavior; lexical-only boosts disappear, confirming toggle works. |
| 5 | Missing dependency fallback | Temporarily uninstall `rank-bm25` (or run inside a venv without it) and restart backend. | Startup log shows a warning (`rank-bm25 not installed; hybrid retrieval will fall back...`) and `/chat` continues to respond using pure vector search. |
| 6 | Notes suggestions | Call `/notes/suggestions` with content containing an exact keyword/acronym. | Suggestions reflect BM25 boosts similarly to `/chat`. |

## Optional Scripted Check
Use the helper snippet below to probe retrieval without hitting the HTTP API:

```bash
python - <<'PY'
from tutor.core.indexing import load_index_and_meta
from tutor.core.embeddings import get_embedder
from tutor.core.retrieval import retrieve
from tutor.core.config import TOP_K, USE_HYBRID_RETRIEVAL, RRF_K

index, metas, bm25, tokenized = load_index_and_meta()
embed_fn = get_embedder()
query = "<replace with exact keyword or identifier>"
results = retrieve(
    query,
    index,
    metas,
    embed_fn,
    k=TOP_K,
    use_multi_query=False,
    bm25=bm25,
    bm25_corpus=tokenized,
    use_hybrid=USE_HYBRID_RETRIEVAL,
    rrf_k=RRF_K,
)
for score, meta in results:
    print(round(score, 4), meta.get("source"), meta.get("page"), meta.get("text", "")[:120])
PY
```

Run the snippet twice—once with `USE_HYBRID_RETRIEVAL=true` (default) and once with the env var set to `false`—and confirm that exact-match documents appear higher when hybrid mode is on.
