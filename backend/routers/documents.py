"""Documents router — upload, list, get, and delete documents."""

import os
import uuid
from uuid import UUID

import math

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from core.billing.tier_gate import require_quota, record_usage
from core.documents.processor import process_document
from core.security.jwt import get_current_user
from core.storage.s3_service import delete_file, generate_presigned_url, upload_file
from database import get_db
from models.documents import Document
from models.users import User
from schemas.documents import DocumentListItem, DocumentResponse, PaginatedDocuments

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
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _quota: None = Depends(require_quota("document_uploads_per_month")),
) -> DocumentResponse:
    """Upload a document for AI processing.

    Accepts PDF, DOCX, JPG, JPEG, PNG up to 10 MB.
    Stores in S3, creates DB record, queues background AI analysis.
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
        original_filename=file.filename or "unnamed",
        file_type=ext,
        file_size_bytes=len(file_bytes),
        s3_key=s3_key,
        s3_bucket=os.getenv("AWS_S3_BUCKET_NAME", ""),
        status="pending",
    )
    db.add(doc)
    record_usage(current_user.id, "document_uploads_per_month", db)
    db.commit()
    db.refresh(doc)

    # Queue background AI processing (pass document_id as string + file bytes)
    background_tasks.add_task(process_document, str(doc.id), file_bytes, ext)

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
