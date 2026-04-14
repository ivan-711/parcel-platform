"""Document text extraction — PDF and DOCX to plain text."""

import io
from dataclasses import dataclass

MAX_TEXT_LENGTH = 100_000  # Increased from 50k; Dramatiq processes async


@dataclass
class ExtractionResult:
    """Result of text extraction with truncation metadata."""
    text: str
    total_chars: int
    was_truncated: bool
    extracted_chars: int


def extract_text_from_pdf(file_bytes: bytes) -> ExtractionResult:
    """Extract text from a PDF file using pdfplumber.

    Opens from bytes via io.BytesIO. Extracts text from all pages,
    joins with newlines. Truncates to MAX_TEXT_LENGTH characters.
    Returns ExtractionResult with truncation metadata.
    """
    try:
        import pdfplumber

        text_parts = []
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
        full_text = "\n".join(text_parts)
        total_chars = len(full_text)
        was_truncated = total_chars > MAX_TEXT_LENGTH
        return ExtractionResult(
            text=full_text[:MAX_TEXT_LENGTH],
            total_chars=total_chars,
            was_truncated=was_truncated,
            extracted_chars=min(total_chars, MAX_TEXT_LENGTH),
        )
    except Exception:
        return ExtractionResult(text="", total_chars=0, was_truncated=False, extracted_chars=0)


def extract_text_from_docx(file_bytes: bytes) -> ExtractionResult:
    """Extract text from a DOCX file using python-docx.

    Loads from bytes via io.BytesIO. Extracts all paragraph text,
    joins with newlines. Truncates to MAX_TEXT_LENGTH characters.
    Returns ExtractionResult with truncation metadata.
    """
    try:
        from docx import Document as DocxDocument

        doc = DocxDocument(io.BytesIO(file_bytes))
        full_text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
        total_chars = len(full_text)
        was_truncated = total_chars > MAX_TEXT_LENGTH
        return ExtractionResult(
            text=full_text[:MAX_TEXT_LENGTH],
            total_chars=total_chars,
            was_truncated=was_truncated,
            extracted_chars=min(total_chars, MAX_TEXT_LENGTH),
        )
    except Exception:
        return ExtractionResult(text="", total_chars=0, was_truncated=False, extracted_chars=0)
