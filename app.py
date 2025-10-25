import os, json
import uuid
from datetime import datetime
from pathlib import Path
import numpy as np
import faiss
import streamlit as st
from dotenv import load_dotenv
from tutor.ui.theme import inject_css
from tutor.core.suggestions import build_suggestions
from tutor.core.config import (
    STORE_DIR, META_PATH, INDEX_PATH, CHATS_DIR, DATA_DIR, CONFIG_PATH,
    TTS_BACKEND, EMBED_BACKEND, LLM_BACKEND,
    OPENROUTER_BASE_URL, OPENROUTER_API_KEY, OPENROUTER_CHAT_MODEL, OPENROUTER_EMBED_MODEL, OPENROUTER_SITE_URL, OPENROUTER_APP_NAME,
    SBERT_MODEL, OLLAMA_MODEL, OLLAMA_EMBED_MODEL, TOP_K,
)
from tutor.core.storage import ensure_app_dirs, list_chat_sessions, load_chat, append_chat_message, get_session_summary, save_session_summary, generate_session_summary
from tutor.core.indexing import load_index_and_meta
from tutor.core.tts import synthesize_tts as _synthesize_tts
from tutor.core.embeddings import get_embedder
from tutor.core.llm import llm_answer
from tutor.core.retrieval import retrieve, build_prompt

load_dotenv()

 

def _build_suggestions(metas, prefix: str = "", limit: int = 10):
    # Backwards shim to keep call sites unchanged
    return build_suggestions(metas, prefix=prefix, limit=limit)

st.set_page_config(page_title="AI Tutor", page_icon="🎓", layout="centered", initial_sidebar_state="collapsed")
ensure_app_dirs()

# Initialize theme state
if "dark_mode" not in st.session_state:
    st.session_state.dark_mode = True

# Theme toggle in sidebar
with st.sidebar:
    st.markdown("### ⚙️ Settings")
    theme_label = "🌙 Dark Mode" if st.session_state.dark_mode else "☀️ Light Mode"
    if st.button(theme_label, use_container_width=True):
        st.session_state.dark_mode = not st.session_state.dark_mode
        st.rerun()
    
    st.markdown("---")
    st.markdown(f"**Embedding**: {EMBED_BACKEND}")
    st.markdown(f"**LLM**: {LLM_BACKEND}")
    if TTS_BACKEND != "off":
        st.session_state.setdefault("speak_answer", False)
        st.session_state["speak_answer"] = st.checkbox("🔊 Text-to-Speech", value=st.session_state["speak_answer"])

# Inject theme CSS
inject_css(dark_mode=st.session_state.dark_mode)

# Header
st.markdown("""
    <div class='app-header'>
        <div class='app-logo'>🎓</div>
        <div class='app-title'>AI Tutor</div>
        <div class='app-subtitle'>Your personal study assistant, running locally on your machine</div>
    </div>
""", unsafe_allow_html=True)

# Always-visible upload + ingest controls
with st.expander("📁 Upload Study Materials", expanded=False):
    st.caption("Upload PDFs, DOCX, TXT, or Markdown files. Click Ingest to index them for Q&A.")
    up_files = st.file_uploader("", type=["pdf","docx","txt","md"], accept_multiple_files=True, label_visibility="collapsed")
    saved = 0
    if up_files:
        for uf in up_files:
            try:
                dest = Path(DATA_DIR) / uf.name
                with dest.open("wb") as f:
                    f.write(uf.getbuffer())
                saved += 1
            except Exception:
                pass
        if saved:
            st.success(f"✓ Saved {saved} file(s) to data/")
    col1, col2 = st.columns([1,3])
    with col1:
        do_ingest = st.button("🔄 Ingest", use_container_width=True)
    with col2:
        st.caption("Builds a searchable index of your materials")
    # Show current files remembered on disk
    existing = []
    try:
        for p in Path(DATA_DIR).rglob("*"):
            if p.is_file() and p.suffix.lower() in {".pdf",".docx",".txt",".md"}:
                existing.append(str(p.relative_to(DATA_DIR)))
    except Exception:
        existing = []
    if existing:
        st.markdown("<div class='glass-card'>", unsafe_allow_html=True)
        st.caption("Saved files")
        st.markdown("<div class='chips'>" + "".join([f"<span class='chip'>{rel}</span>" for rel in sorted(existing)[:200]]) + "</div>", unsafe_allow_html=True)
        if len(existing) > 200:
            st.markdown("<div class='caption-muted'>Showing first 200 files…</div>", unsafe_allow_html=True)
        st.markdown("</div>", unsafe_allow_html=True)
    if do_ingest:
        import subprocess, sys
        with st.spinner("🔄 Ingesting documents..."):
            try:
                subprocess.check_call([sys.executable, "ingest.py"])
                st.success("✅ Ingestion complete! Ready for Q&A.")
                st.cache_resource.clear()  # <-- force reload cached resources
                st.rerun()
            except Exception as exc:
                st.error(f"❌ Ingestion failed: {exc}")
                st.rerun()
            except Exception as e:
                st.error(f"Ingestion failed: {e}")

# Load index and embedder after possible ingestion
index, metas = load_index_and_meta()
embed_fn = get_embedder()

if not index or not metas:
    st.info("✨ Upload files above and click Ingest to enable Q&A.")

st.divider()

# ========== Modern chat interface ==========
st.markdown("---")
st.markdown("### 💬 Chat")

# Session selection and load history
sessions = list_chat_sessions()

# Generate labels with summaries
session_options = ["💭 Current conversation"]
session_map = {}
for idx, (sid, ts, _p) in enumerate(sessions):
    summary = get_session_summary(sid)
    if not summary:
        # Generate summary if not cached
        summary = generate_session_summary(sid)
        save_session_summary(sid, summary)
    # Format: "Summary - Date Time"
    label = f"📝 {summary} · {ts.strftime('%b %d, %H:%M')}"
    session_options.append(label)
    session_map[label] = (sid, idx)

col_s1, col_s2 = st.columns([3,1])
with col_s1:
    selected = st.selectbox("Previous conversations", options=session_options, index=0, label_visibility="collapsed")
with col_s2:
    if st.button("➕ New", use_container_width=True):
        st.session_state.chat_session_id = uuid.uuid4().hex[:12]
        st.session_state.messages = []
        st.rerun()

if "chat_session_id" not in st.session_state:
    st.session_state.chat_session_id = uuid.uuid4().hex[:12]
if "messages" not in st.session_state:
    st.session_state.messages = []

# Load selected session history for viewing
view_messages = []
if selected != "💭 Current conversation" and selected in session_map:
    sid, idx = session_map[selected]
    view_messages = load_chat(sid)
else:
    view_messages = st.session_state.messages

# Render messages as chat bubbles with timestamps and markdown
for m in view_messages[-200:]:
    role = m.get("role", "assistant")
    content = m.get("content", "")
    ts = m.get("ts")
    with st.chat_message("user" if role == "user" else "assistant"):
        st.markdown(
            f"<div class='bubble {('user' if role=='user' else 'assistant')}'>"
            + (f"<span class='ts'>{ts}</span>" if ts else "")
            + content
            + "</div>",
            unsafe_allow_html=True,
        )

# Suggestion helper UI (above input)
with st.expander("💡 Question Suggestions", expanded=False):
    st.caption("Get AI-powered question suggestions based on your study materials")
    suggestions_prefix = st.text_input("Filter suggestions (optional)", value="", placeholder="What is...")
    try:
        suggs = _build_suggestions(metas, prefix=suggestions_prefix, limit=6)
    except Exception:
        suggs = []
    if suggs:
        cols = st.columns(2)
        for i, s in enumerate(suggs):
            # render as pill-styled buttons
            if cols[i % 2].button(s, key=f"sugg_{i}", use_container_width=True):
                if "messages" not in st.session_state:
                    st.session_state.messages = []
                user_msg = {"ts": datetime.utcnow().isoformat() + "Z", "role": "user", "content": s}
                st.session_state.messages.append(user_msg)
                append_chat_message(st.session_state.chat_session_id, "user", s)
                
                # Generate summary for first message
                if len(st.session_state.messages) == 1:
                    summary = generate_session_summary(st.session_state.chat_session_id)
                    save_session_summary(st.session_state.chat_session_id, summary)
                
                st.session_state["_pending_prompt"] = s
                st.rerun()
    else:
        st.info("No suggestions available. Upload and ingest materials first.")

# Sticky input at bottom
pending = st.session_state.pop("_pending_prompt", None) if "_pending_prompt" in st.session_state else None
prompt_text = pending or st.chat_input("💭 Ask me anything about your study materials...")
if prompt_text is not None and prompt_text.strip():
    if not (index and metas):
        st.warning("⚠️ Please upload files and click Ingest first to enable Q&A.")
    else:
        # Append user message
        user_msg = {"ts": datetime.utcnow().isoformat() + "Z", "role": "user", "content": prompt_text}
        st.session_state.messages.append(user_msg)
        append_chat_message(st.session_state.chat_session_id, "user", prompt_text)
        
        # Generate summary for first message in session
        if len(st.session_state.messages) == 1:
            summary = generate_session_summary(st.session_state.chat_session_id)
            save_session_summary(st.session_state.chat_session_id, summary)

        # Typing indicator
        with st.chat_message("assistant"):
            tip = st.empty()
            tip.markdown("_✨ Thinking..._")
            try:
                hits = retrieve(prompt_text, index, metas, embed_fn, k=TOP_K)
                context = [m for _, m in hits]
                prompt = build_prompt(context, prompt_text)
                ans = llm_answer(prompt)
                # Append citations inline
                if context:
                    cites = "\n\n" + "\n".join([
                        f"- Source: **{m['source']}**, p.{m['page']} (chunk {m['chunk_index']})" for m in context
                    ])
                    ans = ans.strip() + cites
            finally:
                tip.empty()
            # Optionally synthesize audio
            if st.session_state.get("speak_answer"):
                audio = _synthesize_tts(ans)
                if audio:
                    st.audio(audio, format="audio/wav")
            asst_msg = {"ts": datetime.utcnow().isoformat() + "Z", "role": "assistant", "content": ans}
            st.session_state.messages.append(asst_msg)
            append_chat_message(st.session_state.chat_session_id, "assistant", ans)
            st.markdown(ans)

# Footer status
st.markdown("---")
status_col1, status_col2, status_col3 = st.columns(3)
with status_col1:
    index_status = "🟢 Ready" if (index and metas) else "🟡 Not indexed"
    st.markdown(f"**Index**: {index_status}")
with status_col2:
    doc_count = len(metas) if metas else 0
    st.markdown(f"**Documents**: {doc_count} chunks")
with status_col3:
    msg_count = len(st.session_state.messages) if "messages" in st.session_state else 0
    st.markdown(f"**Messages**: {msg_count}")