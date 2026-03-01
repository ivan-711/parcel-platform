"""Document text extraction — PDF and DOCX to plain text."""

import io

MAX_TEXT_LENGTH = 50_000  # Claude context limit safety


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text from a PDF file using pdfplumber.

    Opens from bytes via io.BytesIO. Extracts text from all pages,
    joins with newlines. Truncates to 50,000 characters max.
    Returns empty string on failure.
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
        return full_text[:MAX_TEXT_LENGTH]
    except Exception:
        return ""


def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract text from a DOCX file using python-docx.

    Loads from bytes via io.BytesIO. Extracts all paragraph text,
    joins with newlines. Truncates to 50,000 characters.
    Returns empty string on failure.
    """
    try:
        from docx import Document as DocxDocument

        doc = DocxDocument(io.BytesIO(file_bytes))
        full_text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
        return full_text[:MAX_TEXT_LENGTH]
    except Exception:
        return ""
