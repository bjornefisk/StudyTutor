# 🎓 AI Tutor - Your Personal Study Companion

<div align="center">

**A local-first AI study companion that learns from YOUR materials**

[![Python](https://img.shields.io/badge/Python-3.9+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.0-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge)](http://makeapullrequest.com)

</div>

---

## 🌟 What Makes This Different?

Most AI tutors are **generic**. This one learns from ***your*** materials. Upload your course PDFs, lecture notes, or textbooks, and get personalized answers based on your actual content. Perfect for students who want AI help that's actually relevant to their coursework.

### ✨ Key Features

| Feature | Description |
|---------|-------------|
| 💬 **Intelligent Chat** | RAG-powered conversations that reference your actual study materials |
| 📚 **AI Flashcard Generation** | Multi-pass deep analysis creates conceptual questions, not memorization |
| 📝 **Smart Note-Taking** | Live RAG-powered suggestions as you write |
| 🔗 **Automatic Citations** | Notes link to source documents with page numbers |
| 📥 **Anki Export** | Export flashcard decks to Anki format (.apkg) |
| 🎴 **Review Mode** | Built-in spaced repetition with progress tracking |
| 🎯 **Multi-Query Retrieval** | 30-40% better accuracy with parallel query variations |
| 🔒 **Privacy-First** | Everything runs locally - your data never leaves your machine |

---

## 🚀 Quick Start

### Prerequisites

- Python 3.9 or higher
- Node.js 18 or higher
- (Optional) Ollama for local LLM inference
- (Optional) OpenRouter API key for hosted models

### 1️⃣ Clone & Install Backend

```bash
# Clone the repository
git clone https://github.com/yourusername/tutorV2.git
cd tutorV2

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r backend/requirements.txt
```

### 2️⃣ Configure Environment

```bash
# Copy example env file
cp .env-EXAMPLE .env

# Edit .env with your settings
# Minimum required: Choose LLM backend (ollama or openrouter)
```

### 3️⃣ Add Study Materials & Build Index

```bash
# Add your PDFs, DOCX, TXT, or MD files to data/ folder
cp /path/to/your/materials/*.pdf data/

# Build the search index
python ingest.py
```

### 4️⃣ Start Backend

```bash
uvicorn backend.main:app --reload
```

### 5️⃣ Install & Start Frontend

```bash
# In a new terminal
cd frontend
npm install

# Configure frontend (optional)
cp .env.example .env.local

# Start dev server
npm run dev
```

### 6️⃣ Open & Use

Open **http://localhost:3000** in your browser and start learning! 🎉

---

## 🛠️ Tech Stack

### Backend
- **[FastAPI](https://fastapi.tiangolo.com/)** - High-performance async API framework
- **[LangChain](https://python.langchain.com/)** - LLM orchestration (optional)
- **[FAISS](https://github.com/facebookresearch/faiss)** - Vector similarity search
- **[Sentence Transformers](https://www.sbert.net/)** - Document embeddings
- **[PyPDF2](https://pypdf2.readthedocs.io/)** - PDF text extraction
- **[python-docx](https://python-docx.readthedocs.io/)** - DOCX processing

### Frontend
- **[Next.js 14](https://nextjs.org/)** - React framework with App Router
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript
- **[TailwindCSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[Axios](https://axios-http.com/)** - HTTP client
- **[React Hooks](https://reactjs.org/docs/hooks-intro.html)** - State management

### AI/ML
- **[Ollama](https://ollama.ai/)** - Local LLM inference (optional)
- **[OpenRouter](https://openrouter.ai/)** - Hosted LLM API (optional)
- **Embedding Models**: sentence-transformers, OpenAI, Ollama

### Storage
- **JSON** - Notes and flashcards
- **JSONL** - Chat history
- **FAISS Index** - Vector embeddings

---

## 📚 Features Deep Dive

### 💬 RAG-Powered Chat

<details>
<summary>Click to expand</summary>

**What is RAG?**
Retrieval-Augmented Generation combines document search with LLM generation for accurate, source-grounded answers.

**How it works:**
1. Your question → Embedding model → Vector
2. Vector similarity search → Find relevant document chunks
3. Chunks + Question → LLM → Grounded answer
4. Citations show which documents were used

**Multi-Query Retrieval:**
- Generates 2-3 variations of your question
- Searches with each variation
- Combines and ranks results
- 30-40% better accuracy

</details>

### 📚 AI Flashcard Generation

<details>
<summary>Click to expand</summary>

**Unlike traditional flashcards, these test UNDERSTANDING, not memorization.**

**Two-Pass AI System:**
1. **Concept Extraction**: AI reads full document, identifies key concepts
2. **Question Generation**: Creates conceptual questions testing understanding

**Example Quality:**
- ❌ Bad: "What is mitosis?" (memorization)
- ✅ Good: "How does mitosis ensure genetic consistency in daughter cells?" (understanding)

**Difficulty Levels:**
- **Easy**: Foundational understanding (definitions, basic concepts)
- **Medium**: Application & analysis (how/why questions) ⭐ Recommended
- **Hard**: Synthesis & evaluation (complex problem-solving)

**Features:**
- Analyzes full documents (no length limit)
- Multi-pass deep comprehension
- Built-in review mode with flip animations
- Progress tracking & spaced repetition
- Export to Anki (.apkg format)

</details>

### 📝 Smart Note-Taking

<details>
<summary>Click to expand</summary>

**Active learning meets RAG: Write notes while AI suggests related content.**

**How it works:**
1. Start typing your notes
2. AI searches your documents in real-time
3. Relevant passages appear in sidebar
4. Click to link sources automatically
5. Export with proper citations

**Features:**
- Real-time suggestions (1-second debounce)
- Relevance scoring (High/Medium/Low)
- Source snippets with page numbers
- Tag organization
- Search & filter
- Markdown support
- Auto-citation tracking
- Bulk export

**Why it's powerful:**
- Combines writing (retention) with retrieval (comprehension)
- Discover connections across documents
- Build comprehensive study guides
- Perfect for research with auto-citations

</details>

---

## ⚙️ Configuration

### LLM Backend Options

<details>
<summary>Option 1: Ollama (Local, Private)</summary>

```bash
# Install Ollama
curl https://ollama.ai/install.sh | sh

# Pull a model
ollama pull llama3

# Configure .env
LLM_BACKEND=ollama
OLLAMA_MODEL=llama3
```

✅ Completely private  
✅ No API costs  
✅ Fast on good hardware  
❌ Requires powerful machine  

</details>

<details>
<summary>Option 2: OpenRouter (Hosted, High Quality)</summary>

```bash
# Get API key from openrouter.ai
# Configure .env
LLM_BACKEND=openrouter
OPENROUTER_API_KEY=your_key_here
OPENROUTER_CHAT_MODEL=openrouter/auto
```

✅ High quality responses  
✅ Works on any machine  
✅ Access to latest models  
❌ Requires API key  
❌ Pay per use  

</details>

### Embedding Options

```bash
# Local (Default) - No API key needed
EMBEDDINGS_BACKEND=sbert
SBERT_MODEL=sentence-transformers/all-MiniLM-L6-v2

# Ollama - Requires Ollama running
EMBEDDINGS_BACKEND=ollama
OLLAMA_EMBED_MODEL=nomic-embed-text

# OpenRouter - Better quality, requires API key
EMBEDDINGS_BACKEND=openrouter
OPENROUTER_EMBED_MODEL=thenlper/gte-large
```

### Document Processing

```bash
TOP_K=5                    # Chunks per answer
CHUNK_TOKENS=800           # Chunk size
CHUNK_OVERLAP=80           # Overlap for context
USE_MULTI_QUERY=true       # Better retrieval
NUM_QUERY_VARIATIONS=3     # Query variations
```

---

## 📖 Usage Guide

### Chat Mode
1. Click **💬 Chat** tab
2. Type your question
3. Get answers with source citations
4. Toggle Multi-Query for better results

### Flashcard Generation
1. Click **📚 Flashcards** tab
2. Click "Generate New Deck"
3. Select documents
4. Choose difficulty (Easy/Medium/Hard)
5. Set number of cards
6. Click "Generate Flashcards"
7. Study with built-in review mode
8. Export to Anki if desired

### Note-Taking
1. Click **📝 Notes** tab
2. Click "New Note"
3. Start typing your notes
4. Watch suggestions populate in sidebar
5. Click suggestions to link sources
6. Add tags for organization
7. Export as markdown with citations

---

## 🏗️ Project Structure

```
tutorV2/
├── backend/
│   ├── main.py                 # FastAPI application
│   └── requirements.txt        # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── app/               # Next.js App Router
│   │   ├── components/        # React components
│   │   ├── lib/               # API client & utilities
│   │   └── types/             # TypeScript definitions
│   ├── package.json
│   └── tailwind.config.js
├── tutor/
│   └── core/
│       ├── config.py          # Configuration
│       ├── embeddings.py      # Embedding generation
│       ├── indexing.py        # FAISS indexing
│       ├── llm.py             # LLM backends
│       ├── retrieval.py       # RAG retrieval
│       ├── flashcards.py      # Flashcard generation
│       ├── notes.py           # Note-taking system
│       └── storage.py         # Data persistence
├── data/                      # Your study materials
├── storage/                   # Vector index & data
│   ├── faiss.index           # FAISS vector store
│   ├── metadata.jsonl        # Document metadata
│   ├── chats/                # Chat history
│   ├── flashcards/           # Flashcard decks
│   └── notes/                # Study notes
├── ingest.py                 # Document processing
└── quick.cli.py              # CLI interface
```

---

## 🔧 Troubleshooting

### Common Issues

<details>
<summary>Backend won't start</summary>

```bash
# Check Python version
python --version  # Should be 3.9+

# Reinstall dependencies
pip install -r backend/requirements.txt

# Check if port 8000 is available
lsof -i :8000
```

</details>

<details>
<summary>Empty or poor answers</summary>

1. Ensure you ran `python ingest.py` after adding documents
2. Check documents actually contain text (not scanned images)
3. Try increasing `TOP_K` in `.env`
4. Enable multi-query retrieval

</details>

<details>
<summary>Flashcard generation fails</summary>

1. Check LLM backend is running (Ollama) or API key is valid (OpenRouter)
2. Ensure documents have sufficient content
3. Check backend logs for errors
4. Try with fewer cards first

</details>

<details>
<summary>Frontend connection errors</summary>

```bash
# Check backend is running
curl http://localhost:8000/health

# Check CORS settings in backend/main.py
# Verify NEXT_PUBLIC_API_URL in frontend/.env.local
```

</details>

<details>
<summary>Ollama timeout errors</summary>

```bash
# Check Ollama is running
ollama list

# Pull the model
ollama pull llama3

# Start Ollama server
ollama serve
```

</details>

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes**
4. **Run tests** (if applicable)
5. **Commit** (`git commit -m 'Add amazing feature'`)
6. **Push** (`git push origin feature/amazing-feature`)
7. **Open a Pull Request**

### Development Guidelines

- Follow existing code style
- Add tests for new features
- Update documentation
- Keep commits atomic and well-described

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **[FastAPI](https://fastapi.tiangolo.com/)** for the incredible backend framework
- **[Next.js](https://nextjs.org/)** team for the amazing React framework
- **[FAISS](https://github.com/facebookresearch/faiss)** by Meta AI for vector search
- **[Sentence Transformers](https://www.sbert.net/)** for embedding models
- **[Ollama](https://ollama.ai/)** for making local LLMs accessible
- **[OpenRouter](https://openrouter.ai/)** for unified LLM API access

---

## 🔒 Security & Privacy

- ✅ **Local-first** - All processing on your machine (with local models)
- ✅ **No telemetry** - Zero data collection
- ✅ **API keys secured** - `.env` files gitignored
- ✅ **Full data ownership** - Your documents, your notes, your data
- ⚠️ **Hosted models** - If using OpenRouter, data sent to their API

**Recommendation**: Use Ollama for complete privacy.

---

## ⭐ Star History

If you find this project useful, please consider giving it a star! ⭐

---

<div align="center">

</div>
