"""Suggestion utilities for building contextual question suggestions."""
from __future__ import annotations
from typing import Dict, List


def build_suggestions(metas: List[Dict], prefix: str = "", limit: int = 3) -> list[str]:
    try:
        from collections import Counter
        import os
        import re

        file_counter: Counter[str] = Counter()
        for meta in metas[:500]:
            source = str(meta.get("source", "")).strip()
            if not source:
                continue
            base = os.path.splitext(os.path.basename(source))[0]
            pretty = re.sub(r"[_\-]+", " ", base).strip()
            if pretty:
                file_counter[pretty] += 1

        top_files = [name for name, _count in file_counter.most_common(limit)]

        suggestions: list[str] = []
        templates = [
            "Overview of {name}",
            "Key points from {name}",
            "Questions about {name}",
        ]

        for name in top_files:
            for template in templates:
                if len(suggestions) >= limit:
                    break
                suggestions.append(template.format(name=name))

        if not suggestions:
            suggestions = [
                "Overview of uploaded materials",
                "Key points from recent files",
                "Questions about your notes",
            ][:limit]

        if prefix:
            lowered_prefix = prefix.strip().lower()
            suggestions = [s for s in suggestions if s.lower().startswith(lowered_prefix)]

        return suggestions[:limit]
    except Exception:
        return []
