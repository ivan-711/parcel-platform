"""Document processor — background AI analysis using Claude."""

import base64
import json
import logging
import os
import re

from anthropic import Anthropic

from database import SessionLocal
from models.documents import Document

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are a real estate document analyst. Extract and analyze the "
    "key information from this document. Always respond with valid JSON "
    "only — no markdown, no explanation, just the JSON object."
)

USER_PROMPT = (
    "Analyze this real estate document and return a JSON object with "
    "exactly these fields:\n"
    "{\n"
    '  "document_type": one of "purchase_agreement"|"lease"|'
    '"inspection_report"|"title_report"|"assignment_contract"|"other",\n'
    '  "parties": array of {"name": string, "role": string} for each party,\n'
    '  "summary": "2-3 sentence summary of what this document is and '
    'its key purpose",\n'
    '  "risk_flags": array of {\n'
    '    "severity": "high"|"medium"|"low",\n'
    '    "description": "one sentence describing the risk",\n'
    '    "quote": "the exact text from the document that triggered this flag '
    '(max 100 chars, truncate with ... if longer)"\n'
    "  } — include all unusual clauses, missing protections, unfavorable "
    "terms, and anything a real estate investor should review carefully. "
    "Empty array if none found.,\n"
    '  "extracted_numbers": object with any financial figures found — '
    "use snake_case keys like purchase_price, earnest_money_deposit, "
    "closing_date (as ISO string), inspection_period_days, loan_amount, "
    "interest_rate, monthly_payment, assignment_fee, list_price, "
    "square_footage, lot_size — only include keys where values are "
    "explicitly stated in the document,\n"
    '  "key_terms": array of strings — important conditions, contingencies, '
    "deadlines, or special provisions\n"
    "}\n\n"
    "Document text:\n"
)


def process_document(document_id: str, file_bytes: bytes, file_type: str) -> None:
    """Background task: extract text or encode image, call Claude, store results.

    CRITICAL: Creates its own DB session — the request session is already closed
    by the time this background task runs.
    """
    db = SessionLocal()
    try:
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            logger.error("Document %s not found", document_id)
            return

        doc.status = "processing"
        db.commit()

        # Build Claude messages based on file type
        if file_type in ("jpg", "jpeg", "png"):
            media_type = "image/jpeg" if file_type in ("jpg", "jpeg") else "image/png"
            b64_data = base64.b64encode(file_bytes).decode("utf-8")
            messages = [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": b64_data,
                            },
                        },
                        {
                            "type": "text",
                            "text": USER_PROMPT + "[See attached image]",
                        },
                    ],
                }
            ]
        else:
            # PDF or DOCX — extract text
            if file_type == "pdf":
                from core.documents.extractor import extract_text_from_pdf

                text = extract_text_from_pdf(file_bytes)
            elif file_type == "docx":
                from core.documents.extractor import extract_text_from_docx

                text = extract_text_from_docx(file_bytes)
            else:
                text = ""

            if not text.strip():
                doc.status = "failed"
                doc.processing_error = "Could not extract text from document"
                db.commit()
                return

            messages = [{"role": "user", "content": USER_PROMPT + text}]

        # Call Claude
        client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        response = client.messages.create(
            model="claude-opus-4-5",
            max_tokens=2000,
            system=SYSTEM_PROMPT,
            messages=messages,
        )

        raw = response.content[0].text

        # Strip markdown code fences if present before parsing
        raw = re.sub(r"^```(?:json)?\s*", "", raw.strip())
        raw = re.sub(r"\s*```$", "", raw.strip())

        result = json.loads(raw)

        # Update document with parsed results
        doc.document_type = result.get("document_type")
        doc.parties = result.get("parties")
        doc.ai_summary = result.get("summary")
        doc.risk_flags = result.get("risk_flags")
        doc.extracted_numbers = result.get("extracted_numbers")
        doc.key_terms = result.get("key_terms")
        doc.status = "complete"
        db.commit()

    except json.JSONDecodeError as e:
        logger.error("JSON parse error for document %s: %s", document_id, e)
        _mark_failed(db, document_id, f"AI response parsing failed: {e}")
    except Exception as e:
        logger.error("Processing failed for document %s: %s", document_id, e)
        _mark_failed(db, document_id, str(e))
    finally:
        db.close()


def _mark_failed(db, document_id: str, error_msg: str) -> None:
    """Set document status to failed with error message. Does not re-raise."""
    try:
        doc = db.query(Document).filter(Document.id == document_id).first()
        if doc:
            doc.status = "failed"
            doc.processing_error = error_msg[:1000]
            db.commit()
    except Exception:
        pass
