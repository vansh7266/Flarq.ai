"""Normalize resume / JD raw text for downstream LLM parsing."""

from __future__ import annotations

import re
import unicodedata


def normalize_whitespace(text: str) -> str:
    collapsed = re.sub(r"\s+", " ", text)
    return collapsed.strip()


def clean_extracted_text(raw_text: str) -> str:
    """Remove excessive whitespace, control characters, and fix common encoding glitches."""
    if not raw_text:
        return ""

    normalized = unicodedata.normalize("NFKC", raw_text)
    normalized = normalized.replace("\x00", "")
    normalized = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", " ", normalized)
    normalized = re.sub(r"[ \t]+\n", "\n", normalized)
    normalized = re.sub(r"\n{3,}", "\n\n", normalized)
    normalized = re.sub(r"[ \t]{2,}", " ", normalized)
    return normalized.strip()
