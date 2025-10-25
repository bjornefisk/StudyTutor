"""Text-to-speech helper."""
from __future__ import annotations
from pathlib import Path as _Path
from typing import Optional
from .config import TTS_BACKEND


def synthesize_tts(text: str) -> bytes:
    """Synthesize speech to WAV bytes using the configured backend. Returns empty bytes on failure or if disabled."""
    if not text or TTS_BACKEND == "off":
        return b""
    if TTS_BACKEND == "pyttsx3":
        try:
            import pyttsx3, tempfile
            engine = pyttsx3.init()
            try:
                rate = engine.getProperty("rate")
                engine.setProperty("rate", int(rate * 0.95))
            except Exception:
                pass
            with tempfile.TemporaryDirectory() as td:
                out = _Path(td) / "out.wav"
                engine.save_to_file(text, str(out))
                engine.runAndWait()
                return out.read_bytes() if out.exists() else b""
        except Exception:
            return b""
    return b""
