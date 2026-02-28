"""Pydantic schemas for document upload and AI processing responses."""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class DocumentListItem(BaseModel):
    """Compact document summary for list responses."""

    id: uuid.UUID
    filename: str
    doc_type: str
    processing_status: str
    deal_id: Optional[uuid.UUID]
    created_at: datetime

    model_config = {"from_attributes": True}


class RiskFlag(BaseModel):
    """A single AI-identified risk clause in a document."""

    clause: str
    severity: str  # low | medium | high
    explanation: str


class KeyTerm(BaseModel):
    """A key term extracted by AI from a document."""

    term: str
    value: str
    page: Optional[int] = None


class DocumentResponse(BaseModel):
    """Full document response including AI-extracted data."""

    id: uuid.UUID
    user_id: uuid.UUID
    team_id: Optional[uuid.UUID]
    filename: str
    file_url: str
    file_type: str
    doc_type: str
    ai_summary: Optional[str]
    ai_risk_flags: Optional[list[RiskFlag]]
    ai_key_terms: Optional[list[KeyTerm]]
    processing_status: str
    deal_id: Optional[uuid.UUID]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
