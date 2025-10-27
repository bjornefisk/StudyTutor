"""
Document Ingestion Pipeline

This module handles the ingestion and indexing of study materials for the AI Tutor.
It processes PDFs, DOCX, TXT, and Markdown files, extracts text, chunks it into
manageable pieces, generates embeddings, and builds a FAISS vector index for
semantic search.

The ingestion process also supports PubChem compound lookups for chemistry-related
materials by reading compound names or CIDs from pubchem.txt files.
"""

import json
import logging
import os
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Tuple

import faiss
import numpy as np
import tiktoken
from docx import Document
from dotenv import load_dotenv
from pypdf import PdfReader

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

load_dotenv()

DATA_DIR = "data"
STORE_DIR = "storage"
META_PATH = os.path.join(STORE_DIR, "metadata.jsonl")
INDEX_PATH = os.path.join(STORE_DIR, "faiss.index")
CONFIG_PATH = os.path.join(STORE_DIR, "config.json")
PUBCHEM_CACHE_DIR = os.path.join(STORE_DIR, "pubchem_cache")

EMBED_BACKEND = os.getenv("EMBEDDINGS_BACKEND", "sbert").lower()
OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_EMBED_MODEL = os.getenv("OPENROUTER_EMBED_MODEL", "thenlper/gte-large")
OPENROUTER_SITE_URL = os.getenv("OPENROUTER_SITE_URL")
OPENROUTER_APP_NAME = os.getenv("OPENROUTER_APP_NAME", "CourseTutor-MVP")

SBERT_MODEL = os.getenv("SBERT_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
OLLAMA_EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")

CHUNK_TOKENS = int(os.getenv("CHUNK_TOKENS", "800"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "80"))

def ensure_dirs() -> None:
    """Create necessary directories if they don't exist."""
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(STORE_DIR, exist_ok=True)
    os.makedirs(PUBCHEM_CACHE_DIR, exist_ok=True)

def read_pdf(path: str) -> List[Tuple[int, str]]:
    """Extract text from PDF pages."""
    try:
        reader = PdfReader(path)
        pages = []
        for i, p in enumerate(reader.pages):
            try:
                text = p.extract_text() or ""
            except (AttributeError, KeyError) as exc:
                logger.warning("Failed to extract text from page %d of %s: %s", i + 1, path, exc)
                text = ""
            text = text.strip()
            if text:
                pages.append((i + 1, text))
        return pages
    except (FileNotFoundError, PermissionError, OSError) as exc:
        logger.error("Failed to read PDF %s: %s", path, exc)
        return []

def read_text_file(path: str) -> List[Tuple[int, str]]:
    """Read a .txt or .md file as a single 'page'."""
    try:
        with open(path, "r", encoding="utf-8") as f:
            text = f.read().strip()
        return [(1, text)] if text else []
    except (FileNotFoundError, PermissionError, UnicodeDecodeError) as exc:
        logger.error("Failed to read text file %s: %s", path, exc)
        return []

def read_docx(path: str) -> List[Tuple[int, str]]:
    """Extract text from a DOCX document."""
    try:
        doc = Document(path)
        paras = [p.text.strip() for p in doc.paragraphs if p.text and p.text.strip()]
        text = "\n\n".join(paras).strip()
        return [(1, text)] if text else []
    except (FileNotFoundError, PermissionError, OSError) as exc:
        logger.error("Failed to read DOCX %s: %s", path, exc)
        return []

def tokenize(text: str) -> List[int]:
    """Convert text to tokens using tiktoken encoding."""
    enc = tiktoken.get_encoding("cl100k_base")
    return enc.encode(text)

def detokenize(tokens: List[int]) -> str:
    """Convert tokens back to text using tiktoken encoding."""
    enc = tiktoken.get_encoding("cl100k_base")
    return enc.decode(tokens)

def chunk_text(text: str, max_tokens: int = 350, overlap: int = 60) -> List[str]:
    """
    Split text into overlapping chunks based on token count.
    
    Args:
        text: The text to chunk
        max_tokens: Maximum tokens per chunk
        overlap: Number of tokens to overlap between chunks
        
    Returns:
        List of text chunks
    """
    toks = tokenize(text)
    chunks = []
    start = 0
    while start < len(toks):
        end = min(start + max_tokens, len(toks))
        chunk = detokenize(toks[start:end]).strip()
        if chunk:
            chunks.append(chunk)
        if end == len(toks):
            break
        start = max(0, end - overlap)
        if start >= len(toks):
            break
    return chunks

# -------------------- PubChem utilities --------------------
def _read_lines(path: str) -> List[str]:
    if not os.path.exists(path):
        return []
    with open(path, "r", encoding="utf-8") as f:
        return [ln.strip() for ln in f if ln.strip() and not ln.strip().startswith("#")]

def _resolve_pubchem_cid(query: str) -> Optional[Tuple[int, str]]:
    """Resolve a user query (CID or name) to a PubChem CID. Returns (cid, display_name)."""
    # Normalize and handle common CID formats like "CID 5793", "cid:2244"
    raw = query.strip()
    low = raw.lower()
    import re
    m = re.match(r"^cid\s*:?\s*(\d+)$", low)
    if m:
        try:
            cid = int(m.group(1))
            return cid, f"CID {cid}"
        except (ValueError, OverflowError):
            pass
    # If it's an integer string already
    try:
        cid = int(raw)
        return cid, f"CID {cid}"
    except (ValueError, OverflowError):
        pass

    import requests
    # Try name -> CID
    url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{requests.utils.quote(query)}/cids/TXT"
    try:
        r = requests.get(url, timeout=30)
        if r.status_code == 200 and r.text.strip():
            first_line = r.text.strip().splitlines()[0].strip()
            cid = int(first_line)
            return cid, query
    except (requests.RequestException, ValueError, KeyError, json.JSONDecodeError):
        return None
    return None

def _extract_text_from_pug_view(record: Dict) -> str:
    """Flatten PubChem PUG View JSON into readable text."""
    lines: List[str] = []

    def add_info_value(val: Dict):
        # Value may contain StringWithMarkup -> list of {String, Markup}
        if not isinstance(val, dict):
            return
        if "StringWithMarkup" in val and isinstance(val["StringWithMarkup"], list):
            for itm in val["StringWithMarkup"]:
                s = itm.get("String")
                if s:
                    lines.append(s)

    def walk_sections(secs: List[Dict], depth: int = 0):
        for sec in secs or []:
            heading = sec.get("TOCHeading")
            if heading:
                lines.append(("#" * max(1, depth + 1)) + " " + heading)
            infos = sec.get("Information") or []
            for info in infos:
                desc = info.get("Description")
                if desc:
                    lines.append(desc)
                val = info.get("Value")
                if val:
                    add_info_value(val)
            children = sec.get("Section")
            if children:
                walk_sections(children, depth + 1)

    try:
        rec = record.get("Record", {})
        secs = rec.get("Section") or []
        walk_sections(secs, 0)
    except (KeyError, TypeError, AttributeError):
        pass
    return "\n\n".join([ln for ln in lines if ln and isinstance(ln, str)])

def _fetch_pubchem_text(cid: int) -> Optional[str]:
    # Check cache first
    cache_path = os.path.join(PUBCHEM_CACHE_DIR, f"{cid}.txt")
    try:
        if os.path.exists(cache_path):
            with open(cache_path, "r", encoding="utf-8") as f:
                cached = f.read().strip()
                if cached:
                    return cached
    except (KeyError, TypeError, AttributeError):
        pass

    import requests
    url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/compound/{cid}/JSON"
    try:
        r = requests.get(url, timeout=30)
        if r.status_code != 200:
            return None
        data = r.json()
        text = _extract_text_from_pug_view(data)
        if text:
            try:
                with open(cache_path, "w", encoding="utf-8") as f:
                    f.write(text)
            except (OSError, IOError):
                pass
        return text or None
    except (requests.RequestException, ValueError, KeyError, json.JSONDecodeError):
        return None

def get_embedder():
    backend = EMBED_BACKEND
    if backend == "openrouter":
        from openai import OpenAI
        client = OpenAI(base_url=OPENROUTER_BASE_URL, api_key=OPENROUTER_API_KEY)
        def embed(texts: List[str]) -> np.ndarray:
            resp = client.embeddings.create(
                model=OPENROUTER_EMBED_MODEL,
                input=texts,
                extra_headers={
                    "HTTP-Referer": OPENROUTER_SITE_URL or "",
                    "X-Title": OPENROUTER_APP_NAME,
                },
            )
            vecs = [d.embedding for d in resp.data]
            return np.array(vecs, dtype="float32")
        return embed

    if backend == "ollama":
        import requests
        model = OLLAMA_EMBED_MODEL
        def embed(texts: List[str]) -> np.ndarray:
            out = []
            for t in texts:
                r = requests.post(
                    "http://localhost:11434/api/embeddings",
                    json={"model": model, "prompt": t},
                    timeout=120,
                )
                r.raise_for_status()
                out.append(r.json()["embedding"])
            return np.array(out, dtype="float32")
        return embed

    if backend == "sbert":
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer(SBERT_MODEL)
        def embed(texts: List[str]) -> np.ndarray:
            vecs = model.encode(texts, normalize_embeddings=True)
            return np.array(vecs, dtype="float32")
        return embed

    raise ValueError(f"Unknown EMBEDDINGS_BACKEND: {backend}")

def load_or_create_index(dim: int):
    if os.path.exists(INDEX_PATH):
        index = faiss.read_index(INDEX_PATH)
        if index.d != dim:
            raise ValueError(f"Index dim {index.d} != embed dim {dim}")
        return index
    base = faiss.IndexFlatIP(dim)  # cosine with normalized vectors
    return faiss.IndexIDMap2(base)

def normalize_rows(x: np.ndarray):
    norms = np.linalg.norm(x, axis=1, keepdims=True) + 1e-12
    return x / norms

def append_metadata(records: List[Dict]):
    with open(META_PATH, "a", encoding="utf-8") as f:
        for r in records:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

def count_metadata() -> int:
    if not os.path.exists(META_PATH):
        return 0
    with open(META_PATH, "r", encoding="utf-8") as f:
        return sum(1 for _ in f)

def ingest() -> None:
    """
    Main ingestion function that processes all documents and builds the search index.
    
    This function:
    1. Discovers all supported files in the data/ directory
    2. Extracts text from PDFs, DOCX, TXT, and MD files
    3. Processes PubChem compound queries from pubchem.txt files
    4. Chunks all text into manageable pieces
    5. Generates embeddings for all chunks
    6. Builds a FAISS vector index for semantic search
    7. Saves metadata and configuration
    """
    ensure_dirs()
    embed = get_embedder()

    # Recursively discover files under data/
    files: List[str] = []
    for root, _dirs, fnames in os.walk(DATA_DIR):
        for fn in fnames:
            lower = fn.lower()
            # Do not ingest pubchem.txt itself as a document
            if lower == "pubchem.txt":
                continue
            if lower.endswith((".pdf", ".txt", ".md", ".docx")):
                files.append(os.path.join(root, fn))

    # Collect all pubchem.txt files under data/ (root and subfolders)
    pubchem_queries: List[str] = []
    for root, _dirs, fnames in os.walk(DATA_DIR):
        if "pubchem.txt" in fnames:
            pubchem_queries.extend(_read_lines(os.path.join(root, "pubchem.txt")))

    all_chunks, metas = [], []
    # Ingest PDFs
    for fp in files:
        lower = fp.lower()
        if lower.endswith(".pdf"):
            pages = read_pdf(fp)
        elif lower.endswith(".docx"):
            pages = read_docx(fp)
        else:
            pages = read_text_file(fp)
        # Use path relative to data/ for clearer source labels
        try:
            title = os.path.relpath(fp, DATA_DIR)
        except (OSError, ValueError):
            title = os.path.basename(fp)
        for page_num, text in pages:
            chunks = chunk_text(text, CHUNK_TOKENS, CHUNK_OVERLAP)
            for i, ch in enumerate(chunks):
                metas.append({
                    "id": str(uuid.uuid4()),
                    "source": title,
                    "page": page_num,
                    "chunk_index": i,
                    "text": ch,
                })
                all_chunks.append(ch)

    # Ingest PubChem compounds
    pubchem_ingested = 0
    pubchem_resolve_fail = 0
    pubchem_fetch_fail = 0
    for q in pubchem_queries:
        resolved = _resolve_pubchem_cid(q)
        if not resolved:
            pubchem_resolve_fail += 1
            continue
        cid, display_name = resolved
        text = _fetch_pubchem_text(cid)
        if not text:
            pubchem_fetch_fail += 1
            continue
        chunks = chunk_text(text, CHUNK_TOKENS, CHUNK_OVERLAP)
        for i, ch in enumerate(chunks):
            metas.append({
                "id": str(uuid.uuid4()),
                "source": f"PubChem {display_name}",
                "page": 1,
                "chunk_index": i,
                "text": ch,
            })
            all_chunks.append(ch)
        pubchem_ingested += 1

    if not all_chunks:
        logger.warning("No text extracted. Add PDFs to data/ or queries to data/pubchem.txt")
        print("No text extracted. Add PDFs to data/ or queries to data/pubchem.txt")
        return

    logger.info("Embedding %d chunks", len(all_chunks))
    vecs = embed(all_chunks)
    vecs = normalize_rows(vecs)

    dim = vecs.shape[1]
    index = load_or_create_index(dim)

    start_id = count_metadata()
    ids = np.arange(start_id, start_id + vecs.shape[0]).astype("int64")

    # Ensure IndexIDMap2 for adding ids
    if not isinstance(index, faiss.IndexIDMap2):
        index = faiss.IndexIDMap2(index)

    index.add_with_ids(vecs, ids)

    append_metadata(metas)
    faiss.write_index(index, INDEX_PATH)
    logger.info("Saved index to %s with %d vectors", INDEX_PATH, vecs.shape[0])
    
    # Write/update index fingerprint config
    try:
        # Determine model name based on backend
        if EMBED_BACKEND == "openrouter":
            model_name = OPENROUTER_EMBED_MODEL
        elif EMBED_BACKEND == "sbert":
            model_name = SBERT_MODEL
        elif EMBED_BACKEND == "ollama":
            model_name = OLLAMA_EMBED_MODEL
        else:
            model_name = "unknown"
        cfg = {
            "created_at": datetime.utcnow().isoformat() + "Z",
            "embed_backend": EMBED_BACKEND,
            "embed_model": model_name,
            "dim": int(index.d),
            "meta_path": META_PATH,
            "index_path": INDEX_PATH,
            "pubchem_cache": PUBCHEM_CACHE_DIR,
        }
        with open(CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(cfg, f, ensure_ascii=False, indent=2)
        logger.info("Wrote index fingerprint to %s", CONFIG_PATH)
    except (OSError, IOError, json.JSONEncodeError) as exc:
        logger.warning("Failed to write index config: %s", exc)
    
    logger.info("Ingested %d chunks from %d documents and %d PubChem entries", len(all_chunks), len(files), pubchem_ingested)
    print(f"Ingested {len(all_chunks)} chunks from {len(files)} documents and {pubchem_ingested} PubChem entries into {INDEX_PATH}")
    print(f"Metadata: {META_PATH}")
    if pubchem_resolve_fail or pubchem_fetch_fail:
        logger.warning("PubChem warnings: resolve_failed=%d, fetch_failed=%d", pubchem_resolve_fail, pubchem_fetch_fail)
        print(f"PubChem warnings: resolve_failed={pubchem_resolve_fail}, fetch_failed={pubchem_fetch_fail}")

if __name__ == "__main__":
    ingest()