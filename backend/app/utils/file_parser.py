"""Binary resume extraction: PDF (pdfminer.six → PyPDF2) and DOCX (python-docx)."""

from __future__ import annotations

import io
import zipfile
from typing import Literal

ResumeKind = Literal["pdf", "docx"]


class UnsupportedResumeFormatError(ValueError):
    pass


def _is_probably_pdf(data: bytes) -> bool:
    return len(data) >= 4 and data.startswith(b"%PDF")


def _is_probably_docx(data: bytes) -> bool:
    if len(data) < 4 or data[:2] != b"PK":
        return False
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as zf:
            names = {n.lower() for n in zf.namelist()}
            return "word/document.xml" in names
    except zipfile.BadZipFile:
        return False


def detect_resume_kind(data: bytes, filename: str) -> ResumeKind:
    lower = filename.lower()
    if lower.endswith(".pdf") and _is_probably_pdf(data):
        return "pdf"
    if lower.endswith(".docx") and _is_probably_docx(data):
        return "docx"
    if _is_probably_pdf(data):
        return "pdf"
    if _is_probably_docx(data):
        return "docx"
    raise UnsupportedResumeFormatError(
        "Unsupported or corrupted file. Upload a PDF or DOCX resume."
    )


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract plain text from PDF bytes (pdfminer.six preferred, PyPDF2 fallback)."""
    buffer = io.BytesIO(file_bytes)
    try:
        from pdfminer.high_level import extract_text as pdfminer_extract

        text = pdfminer_extract(buffer) or ""
        if text.strip():
            return text
    except Exception:  # noqa: BLE001 — fallback path
        pass

    buffer.seek(0)
    try:
        from PyPDF2 import PdfReader

        reader = PdfReader(buffer)
        parts: list[str] = []
        for page in reader.pages:
            extracted = page.extract_text() or ""
            parts.append(extracted)
        return "\n".join(parts)
    except Exception as exc:  # noqa: BLE001
        raise UnsupportedResumeFormatError("Could not read PDF text.") from exc


def extract_text_from_docx(file_bytes: bytes) -> str:
    from docx import Document

    try:
        document = Document(io.BytesIO(file_bytes))
        return "\n".join(paragraph.text for paragraph in document.paragraphs)
    except Exception as exc:  # noqa: BLE001
        raise UnsupportedResumeFormatError("Could not read DOCX text.") from exc


def extract_resume_text(file_bytes: bytes, filename: str) -> str:
    kind = detect_resume_kind(file_bytes, filename)
    if kind == "pdf":
        return extract_text_from_pdf(file_bytes)
    return extract_text_from_docx(file_bytes)
