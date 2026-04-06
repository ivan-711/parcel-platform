"""Pydantic schemas for document upload and AI processing responses."""

import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class DocumentResponse(BaseModel):
    """Full document object returned for GET /documents/:id and POST /documents."""

    id: uuid.UUID
    user_id: uuid.UUID
    property_id: Optional[uuid.UUID] = None
    original_filename: str
    file_type: str
    file_size_bytes: int
    status: str
    embedding_status: str = "pending"
    embedding_meta: Optional[dict[str, Any]] = None
    document_type: Optional[str]
    parties: Optional[list[dict[str, str]]]
    ai_summary: Optional[str]
    risk_flags: Optional[list[dict[str, str]]]
    extracted_numbers: Optional[dict[str, Any]]
    key_terms: Optional[list[str]]
    processing_error: Optional[str]
    created_at: datetime
    updated_at: datetime
    presigned_url: Optional[str] = None

    model_config = {"from_attributes": True}


class DocumentStatusResponse(BaseModel):
    """Lightweight status check for polling during processing."""

    status: str
    embedding_status: str
    embedding_meta: Optional[dict[str, Any]] = None
    chunks_count: int = 0


class DocumentListItem(BaseModel):
    """Compact document summary for GET /documents list responses."""

    id: uuid.UUID
    original_filename: str
    file_type: str
    file_size_bytes: int
    status: str
    embedding_status: str = "pending"
    document_type: Optional[str]
    ai_summary: Optional[str]
    created_at: datetime
    presigned_url: Optional[str] = None

    model_config = {"from_attributes": True}


class PaginatedDocuments(BaseModel):
    """Paginated document list response for GET /documents."""

    items: list[DocumentListItem]
    total: int
    page: int
    per_page: int
    pages: int
