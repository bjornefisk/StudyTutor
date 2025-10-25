# StudyTutor

A local-first AI study companion built on retrieval-augmented generation (RAG). Ingest your own notes, textbooks, or PDFs, then chat through a modern Next.js interface backed by a FastAPI server that keeps everything private and on-device.

## Architecture
- FastAPI backend (`backend/`) exposes chat, ingestion, upload, session, and suggestion endpoints. It orchestrates embeddings, FAISS search, and LLM calls through modules in `tutor/core`.
- Next.js 14 frontend (`frontend/`) provides the chat UI, document upload panel, and session history. Requests are proxied to the backend via `NEXT_PUBLIC_API_URL`.
- Shared Python tooling (`tutor/`, `ingest.py`, `quick.cli.py`) handles ingestion, storage, and model adapters; the CLI offers a lightweight alternative interface if you prefer the terminal.

## Prerequisites
- Python 3.10+ on macOS, Linux, or Windows
- Node.js 18+ and npm for the frontend
- Optional: Ollama for fully local LLMs, or an OpenRouter API key for hosted models

## Backend setup
1. Create a virtual environment and install dependencies:
	```bash
	python3 -m venv .venv
	source .venv/bin/activate          # Windows: .venv\Scripts\activate
	python -m pip install --upgrade pip
	pip install -r backend/requirements.txt
	```
2. Configure environment variables:
	```bash
	cp .env-EXAMPLE .env
	# Edit .env with your preferred backends and API keys
	```
3. Ingest documents whenever you add or change files in `data/` (PDF, DOCX, TXT, MD). Optional: populate `data/pubchem.txt` with compound names or CIDs for chemistry lookups.
	```bash
	python ingest.py
	```
4. Run the API:
	```bash
	uvicorn backend.main:app --reload
	```

## Frontend setup
1. Install dependencies:
	```bash
	cd frontend
	npm install
	```
2. Configure the API base URL:
	```bash
	cp .env.example .env.local
	# Adjust NEXT_PUBLIC_API_URL if the backend runs on a different host or port
	```
3. Start the development server:
	```bash
	npm run dev
	```
4. Open http://localhost:3000 and begin chatting. Keep the FastAPI server running in a separate terminal.

## Configuration reference
Key variables (full list in `.env-EXAMPLE`):

Embeddings
```bash
# Local sentence-transformer (default)
EMBEDDINGS_BACKEND=sbert
SBERT_MODEL=sentence-transformers/all-MiniLM-L6-v2

# Hosted embeddings via OpenRouter
EMBEDDINGS_BACKEND=openrouter
OPENROUTER_API_KEY=<YOUR_OPENROUTER_API_KEY>
OPENROUTER_EMBED_MODEL=thenlper/gte-large

# Local embeddings via Ollama
EMBEDDINGS_BACKEND=ollama
OLLAMA_EMBED_MODEL=nomic-embed-text
```

LLM
```bash
# Hosted models via OpenRouter
LLM_BACKEND=openrouter
OPENROUTER_CHAT_MODEL=openrouter/auto

# Local models via Ollama
LLM_BACKEND=ollama
OLLAMA_MODEL=llama3
```

Ingestion and retrieval
```bash
TOP_K=5             # number of chunks retrieved for answers
CHUNK_TOKENS=800    # chunk size used during ingestion
CHUNK_OVERLAP=80    # overlap between chunks
```

Text-to-Speech (optional)
```bash
TTS_BACKEND=off     # default, disables TTS
TTS_BACKEND=pyttsx3 # offline synthesis (requires system voice support)
```

## Running the CLI (optional)
The legacy CLI still works if you prefer terminal-based interactions:
```bash
python quick.cli.py "What is the difference between X and Y?"
```

## Troubleshooting
- Empty answers: confirm `python ingest.py` ran after adding files to `data/`.
- OpenRouter errors: double-check the API key and model names in `.env`.
- Ollama timeouts: ensure Ollama is running locally and the requested model is pulled.
- Backend rebuilds: delete `storage/` to regenerate the FAISS index with new embeddings.

## Security notes
- Never commit real API keys. `.env` and `.env.*` remain ignored by git.
- Rotate any leaked keys immediately.
- For deployments, inject secrets through environment variables or a secret manager.