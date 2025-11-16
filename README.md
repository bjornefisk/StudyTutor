# Study Tutor

[![Python](https://img.shields.io/badge/Python-3.9+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.x-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

Document-based Q&A system. Index your PDFs and notes to answer questions with RAG retrieval.

## Setup

### Prerequisites
- Python 3.9+
- Node.js 18+
- **OpenRouter API key** (recommended for Llama 3.3 70B) or [Ollama](https://ollama.ai/) for local models

### 1) Backend
```bash
# From repo root
python3 -m venv .venv
source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r backend/requirements.txt

# Configure LLM (choose one)
# Option A: OpenRouter (recommended - uses Llama 3.3 70B free tier)
export OPENROUTER_API_KEY="your-key-here"
export LLM_BACKEND="openrouter"

# Option B: Local Ollama
export LLM_BACKEND="ollama"
export OLLAMA_MODEL="llama3"

# Add study materials and build index
mkdir -p data
cp /path/to/files/*.{pdf,docx,txt,md} data/  # as applicable
python ingest.py

# Run API (default: http://127.0.0.1:8000)
uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

### 2) Frontend
```bash
cd frontend
npm install

# Optional: point to a non-default backend
# echo "NEXT_PUBLIC_API_URL=http://127.0.0.1:8000" > .env.local

npm run dev  # default: http://localhost:3000
```

Open the app in your browser and start learning with AI-enhanced tutoring!
