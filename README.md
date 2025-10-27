# AI Tutor

A local-first AI study companion that helps you learn from your own materials. Upload your PDFs, textbooks, or notes, and chat with an AI tutor that actually knows your content. Everything runs on your machine - no data leaves your computer.

## What makes this different?

Most AI tutors are generic. This one learns from *your* materials. Upload your course PDFs, lecture notes, or textbooks, and get personalized answers based on your actual content. Perfect for students who want AI help that's actually relevant to their coursework.

### ✨ Key Features

- **💬 Intelligent Chat**: RAG-powered conversations that reference your actual study materials
- **📚 AI Flashcard Generation**: Automatically extract key concepts and create study flashcards from your documents
- **📝 Smart Note-Taking**: Live note-taking with AI-powered suggestions from your documents
- **📥 Anki Export**: Export flashcard decks to Anki format (.apkg) for spaced repetition
- **🎴 Built-in Review Mode**: Study flashcards with flip animations and track your progress
- **🔗 Automatic Citations**: Notes automatically link to source documents with proper citations
- **📂 Document Management**: Upload PDFs, DOCX, TXT, and Markdown files
- **🎯 Multi-Query Retrieval**: Improved answer accuracy with parallel query variations
- **🌓 Modern UI**: Beautiful dark/light theme with responsive design

## Quick Start

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Add your study materials:**
   - Drop PDFs, DOCX, TXT, or Markdown files into the `data/` folder
   - Run `python ingest.py` to build the search index

3. **Start chatting:**
   ```bash
   streamlit run app.py
   ```

That's it! Open your browser and start asking questions about your materials.

## Architecture Overview

This is a full-stack RAG (Retrieval-Augmented Generation) application:

- **Backend** (`backend/`): FastAPI server handling chat, file uploads, and document processing
- **Frontend** (`frontend/`): Modern Next.js interface for chatting and file management  
- **Core Engine** (`tutor/core/`): Python modules for embeddings, search, and LLM integration
- **CLI Tool** (`quick.cli.py`): Terminal-based alternative if you prefer command line

## Detailed Setup

### Backend Setup

1. **Create virtual environment:**
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate          # Windows: .venv\Scripts\activate
   python -m pip install --upgrade pip
   pip install -r backend/requirements.txt
   ```

2. **Configure your environment:**
   ```bash
   cp .env-EXAMPLE .env
   # Edit .env with your preferred backends and API keys
   ```

3. **Process your documents:**
   ```bash
   python ingest.py
   ```

4. **Start the API server:**
   ```bash
   uvicorn backend.main:app --reload
   ```

### Frontend Setup

1. **Install Node.js dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure API connection:**
   ```bash
   cp .env.example .env.local
   # Adjust NEXT_PUBLIC_API_URL if needed
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open http://localhost:3000** and start chatting!

## Configuration Options

### Embedding Models

Choose how to generate embeddings for your documents:

```bash
# Local sentence-transformer (default, no API key needed)
EMBEDDINGS_BACKEND=sbert
SBERT_MODEL=sentence-transformers/all-MiniLM-L6-v2

# Hosted embeddings via OpenRouter (better quality, requires API key)
EMBEDDINGS_BACKEND=openrouter
OPENROUTER_API_KEY=<YOUR_OPENROUTER_API_KEY>
OPENROUTER_EMBED_MODEL=thenlper/gte-large

# Local embeddings via Ollama (requires Ollama running)
EMBEDDINGS_BACKEND=ollama
OLLAMA_EMBED_MODEL=nomic-embed-text
```

### Language Models

Choose your AI tutor's brain:

```bash
# Hosted models via OpenRouter (recommended for best results)
LLM_BACKEND=openrouter
OPENROUTER_CHAT_MODEL=openrouter/auto

# Local models via Ollama (completely private, requires Ollama)
LLM_BACKEND=ollama
OLLAMA_MODEL=llama3
```

### Document Processing

Fine-tune how your documents are processed:

```bash
TOP_K=5             # How many document chunks to use for each answer
CHUNK_TOKENS=800    # Size of each text chunk
CHUNK_OVERLAP=80    # Overlap between chunks for better context
```

### Multi-Query Retrieval (NEW!)

Improve answer quality by 30-40% with multi-query retrieval. This feature automatically generates multiple variations of your question and combines results for better accuracy:

```bash
USE_MULTI_QUERY=true           # Enable/disable multi-query retrieval (default: true)
NUM_QUERY_VARIATIONS=3         # Number of query variations to generate (default: 3)
```

**How it works:**
- Takes your question and generates 2-3 alternative phrasings
- Searches with each variation to capture different perspectives
- Combines and ranks results for comprehensive answers
- Automatically falls back to single-query if LLM is unavailable

**Example:** Asking "What is photosynthesis?" also searches for "Explain photosynthesis" and "photosynthesis definition and process" to ensure complete coverage.

### Flashcard Generation

The AI tutor uses **multi-pass deep analysis** to generate conceptual flashcards that test true understanding, not just memorization. Unlike RAG-based chat, flashcards send the **full document** to the LLM for comprehensive comprehension.

**How It Works:**
1. **Pass 1 - Concept Extraction**: AI reads the entire document and identifies key concepts, theories, and relationships
2. **Pass 2 - Conceptual Questions**: AI generates questions that test understanding, application, and analysis of those concepts

**Usage:**
1. Navigate to the **Flashcards** tab in the web interface
2. Click "Generate New Deck"
3. Select the documents you want to create flashcards from
4. Choose difficulty level (easy, medium, or hard)
5. Set the number of cards to generate
6. Click "Generate Flashcards"

**Difficulty Levels:**
- **Easy**: Basic understanding and recall of core concepts
  - Question types: definitions, basic "what is" questions, simple examples
  - Tests foundational understanding
  
- **Medium**: Application and analysis of concepts ⭐ Recommended
  - Question types: how/why questions, applications, comparisons, cause-effect
  - Tests analytical thinking and connections between ideas
  
- **Hard**: Synthesis, evaluation, and deep analysis
  - Question types: synthesis across concepts, critical analysis, predictions, complex problem-solving
  - Tests expert-level understanding with nuanced thinking

**What Makes This Different:**
- ❌ **NOT**: "What is photosynthesis?" (simple recall)
- ✅ **YES**: "Why do plants perform photosynthesis in daylight but not at night?" (conceptual understanding)

- ❌ **NOT**: "Define mitosis" (memorization)
- ✅ **YES**: "How does mitosis ensure genetic consistency in daughter cells?" (application)

**Features:**
- **Deep Comprehension**: Analyzes full documents (no length limit), not just excerpts
- **Conceptual Questions**: Tests understanding, not memorization
- **Multi-Pass Analysis**: Identifies concepts first, then generates targeted questions
- **Review Mode**: Built-in flashcard review with flip animations
- **Progress Tracking**: Tracks review count and accuracy for each card
- **Spaced Repetition**: Automatically schedules next review based on performance
- **Anki Export**: Export decks to `.apkg` format for use in Anki
- **Source Tracking**: Each card links back to the source document

**Example Use Cases:**
- Generate conceptual understanding questions from lecture slides
- Create application-based flashcards from textbook chapters
- Test synthesis and analysis of complex topics
- Build exam prep decks that match professor question styles

### Smart Note-Taking

The AI tutor includes an intelligent note-taking system that bridges active learning with your RAG system. As you take notes, the AI suggests related content from your uploaded documents in real-time.

**How It Works:**
1. **Live Suggestions**: As you type, the system uses RAG to find relevant content from your documents
2. **Auto-Linking**: Click suggestions to automatically link source documents to your notes
3. **Citation Tracking**: All linked sources are tracked with page numbers and relevance scores
4. **Export with Citations**: Export notes as markdown with properly formatted citations

**Usage:**
1. Navigate to the **Notes** tab in the web interface
2. Click "New Note"
3. Start typing your notes
4. Watch the sidebar populate with related content from your documents
5. Click suggestions to add them as sources
6. Export notes with citations when done

**Features:**
- **Real-Time Suggestions**: Suggestions update as you type (1-second debounce)
- **Relevance Scoring**: High/Medium/Low relevance indicators
- **Source Preview**: See snippets from source documents
- **Tag Organization**: Organize notes with custom tags
- **Search & Filter**: Find notes by content or tags
- **Markdown Support**: Full markdown formatting in note editor
- **Bulk Export**: Export all notes as a single markdown document
- **Smart Citations**: Automatic deduplication and formatting

**Why This is Powerful:**
- **Active Learning**: Combines writing (retention) with retrieval (RAG)
- **Connected Knowledge**: See how concepts relate across documents
- **Study Guide Creation**: Build comprehensive study guides with citations
- **Research Notes**: Perfect for research papers with auto-citations

**Example Workflow:**
1. Upload lecture slides and textbook chapters
2. Create notes while studying
3. AI suggests related concepts from other materials
4. Link sources to build comprehensive understanding
5. Export notes with citations for exam review

### Text-to-Speech (Optional)

Add voice output to responses:

```bash
TTS_BACKEND=off     # Default, no voice
TTS_BACKEND=pyttsx3 # Offline synthesis (requires system voice support)
```

## Using the CLI

Prefer the terminal? The CLI tool works great for quick questions:

```bash
python quick.cli.py "What is the difference between X and Y?"
```

## Troubleshooting

**Empty or poor answers:**
- Make sure you ran `python ingest.py` after adding files to `data/`
- Check that your documents actually contain text (some PDFs are image-only)

**OpenRouter errors:**
- Verify your API key is correct in `.env`
- Check that the model names match what's available on OpenRouter

**Ollama timeouts:**
- Ensure Ollama is running: `ollama serve`
- Pull the model: `ollama pull llama3`

**Backend rebuilds:**
- Delete `storage/` folder to regenerate the FAISS index
- Useful when switching embedding models

## Security & Privacy

- **Never commit API keys** - `.env` files are gitignored for a reason
- **Rotate leaked keys immediately** if they're accidentally exposed
- **For production deployments**, use environment variables or secret managers
- **All processing happens locally** - your documents never leave your machine unless you choose hosted backends

## Contributing

Found a bug or want to add a feature? Feel free to open an issue or submit a pull request. This project is designed to be easily extensible - the modular architecture makes it simple to add new backends or improve existing functionality.