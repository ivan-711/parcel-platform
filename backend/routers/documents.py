"""Documents router — upload, list, get, status, and delete documents."""

import os
import uuid
from uuid import UUID

import math

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from core.billing.tier_gate import require_quota, record_usage
from core.security.jwt import get_current_user
from core.storage.s3_service import delete_file, generate_presigned_url, upload_file
from database import get_db
from models.documents import Document
from models.document_chunks import DocumentChunk
from models.users import User
from schemas.documents import (
    DocumentListItem,
    DocumentResponse,
    DocumentStatusResponse,
    PaginatedDocuments,
)

router = APIRouter(prefix="/documents", tags=["documents"])

ALLOWED_TYPES = {"pdf", "jpg", "jpeg", "png", "docx"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

CONTENT_TYPE_MAP = {
    "pdf": "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
}


@router.post("/", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile,
    property_id: UUID = Query(None, description="Optional property to link the document to"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _quota: None = Depends(require_quota("document_uploads_per_month")),
) -> DocumentResponse:
    """Upload a document for AI processing.

    Accepts PDF, DOCX, JPG, JPEG, PNG up to 10 MB.
    Stores in S3, creates DB record, queues Dramatiq background processing.
    """
    # Validate file type by extension
    ext = ""
    if file.filename and "." in file.filename:
        ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": f"File type '.{ext}' not allowed. Accepted: pdf, jpg, jpeg, png, docx",
                "code": "INVALID_FILE_TYPE",
            },
        )

    # Validate property ownership if property_id is provided
    if property_id:
        from models.properties import Property
        prop = db.query(Property).filter(
            Property.id == property_id,
            Property.created_by == current_user.id,
            Property.is_deleted == False,  # noqa: E712
        ).first()
        if not prop:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "Invalid property_id", "code": "INVALID_PROPERTY"},
            )

    # Read file bytes BEFORE background task (UploadFile closes after response)
    file_bytes = await file.read()

    # Validate size
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "File size exceeds 10 MB limit", "code": "FILE_TOO_LARGE"},
        )

    # Generate S3 key and upload
    s3_key = f"documents/{current_user.id}/{uuid.uuid4()}/{file.filename}"
    content_type = CONTENT_TYPE_MAP.get(ext, "application/octet-stream")
    upload_file(file_bytes, s3_key, content_type)

    # Create DB record
    doc = Document(
        user_id=current_user.id,
        property_id=property_id,
        original_filename=file.filename or "unnamed",
        file_type=ext,
        file_size_bytes=len(file_bytes),
        s3_key=s3_key,
        s3_bucket=os.getenv("AWS_S3_BUCKET_NAME", ""),
        status="pending",
        embedding_status="pending",
    )
    db.add(doc)
    record_usage(current_user.id, "document_uploads_per_month", db)
    db.commit()
    db.refresh(doc)

    # Dispatch Dramatiq task for background processing
    from core.tasks.document_processing import process_document_metadata
    process_document_metadata.send(str(doc.id))

    from core.telemetry import track_event
    track_event(current_user.id, "document_uploaded", {
        "file_type": ext,
        "property_id": str(property_id) if property_id else None,
    })

    # Return with presigned URL
    result = DocumentResponse.model_validate(doc)
    result.presigned_url = generate_presigned_url(s3_key)
    return result


@router.get("/", response_model=PaginatedDocuments)
async def list_documents(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PaginatedDocuments:
    """List documents for the current user with pagination, newest first."""
    base_query = (
        db.query(Document)
        .filter(Document.user_id == current_user.id)
        .order_by(Document.created_at.desc())
    )
    total = base_query.count()
    pages = max(1, math.ceil(total / per_page))
    offset = (page - 1) * per_page
    docs = base_query.offset(offset).limit(per_page).all()

    items = []
    for d in docs:
        item = DocumentListItem.model_validate(d)
        # Truncate ai_summary to 150 chars for list view
        if item.ai_summary and len(item.ai_summary) > 150:
            item.ai_summary = item.ai_summary[:150]
        item.presigned_url = generate_presigned_url(d.s3_key)
        items.append(item)

    return PaginatedDocuments(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        pages=pages,
    )


@router.get("/{document_id}/status", response_model=DocumentStatusResponse)
async def get_document_status(
    document_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DocumentStatusResponse:
    """Lightweight status check for polling during document processing."""
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc or doc.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Document not found", "code": "DOC_NOT_FOUND"},
        )

    chunks_count = (
        db.query(DocumentChunk)
        .filter(DocumentChunk.document_id == document_id)
        .count()
    )

    return DocumentStatusResponse(
        status=doc.status,
        embedding_status=doc.embedding_status,
        embedding_meta=doc.embedding_meta,
        chunks_count=chunks_count,
    )


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DocumentResponse:
    """Return full document details including AI analysis results."""
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc or doc.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Document not found", "code": "DOC_NOT_FOUND"},
        )
    result = DocumentResponse.model_validate(doc)
    result.presigned_url = generate_presigned_url(doc.s3_key)
    return result


@router.delete("/{document_id}")
async def delete_document(
    document_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """Delete a document from S3 and the database."""
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc or doc.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Document not found", "code": "DOC_NOT_FOUND"},
        )
    delete_file(doc.s3_key)
    db.delete(doc)
    db.commit()
    return {"message": "Document deleted"}
