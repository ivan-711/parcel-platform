"""Chat router — SSE streaming AI chat + history retrieval."""

import json
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from core.ai.chat_specialist import build_rag_context, stream_chat_response
from core.ai.rag_retrieval import retrieve_relevant_chunks
from core.ai.sanitize import sanitize_for_prompt
from core.billing.tier_gate import require_feature, require_quota, record_usage
from core.demo import is_demo_user
from core.demo.chat_service import get_seeded_history
from core.security.jwt import get_current_user
from database import get_db
from limiter import limiter
from models.chat_messages import ChatMessage
from models.deals import Deal
from models.documents import Document
from models.users import User
from schemas.chat import (
    ChatRequest,
    ChatHistoryResponse,
    ChatMessageResponse,
    ChatSessionItem,
    ChatSessionsResponse,
)

router = APIRouter(prefix="/chat", tags=["chat"])


def _build_context_block(
    context_type: str,
    context_id: Optional[uuid.UUID],
    current_user: User,
    db: Session,
) -> str:
    """Load deal context and return an injection block appended to the user message.

    Document context is handled separately via _build_document_system_context
    and injected into the system prompt instead.
    """
    if not context_id or context_type != "deal":
        return ""

    deal = db.query(Deal).filter(
        Deal.id == context_id,
        Deal.deleted_at.is_(None),
    ).first()
    if not deal or deal.user_id != current_user.id:
        raise HTTPException(
            status_code=404,
            detail={"error": "Deal not found", "code": "DEAL_NOT_FOUND"},
        )
    # Sanitize all user-sourced fields to prevent prompt injection
    safe_address = sanitize_for_prompt(deal.address or "", max_length=300)
    safe_strategy = sanitize_for_prompt(deal.strategy or "", max_length=100)
    safe_inputs = sanitize_for_prompt(json.dumps(deal.inputs or {}), max_length=2000)
    safe_outputs = sanitize_for_prompt(json.dumps(deal.outputs or {}), max_length=2000)
    return (
        f"\n\n[DEAL CONTEXT]\n"
        f"Address: {safe_address}\n"
        f"Strategy: {safe_strategy}\n"
        f"Inputs: {safe_inputs}\n"
        f"Outputs: {safe_outputs}\n"
        f"Risk Score: {deal.risk_score}\n"
        f"[/DEAL CONTEXT]\n"
    )


def _build_document_system_context(doc: Document) -> str:
    """Build a rich document context block for injection into the system prompt."""
    lines = [
        "DOCUMENT CONTEXT:",
        f'The user is asking about a document they uploaded: "{doc.original_filename}" ({doc.document_type or "unknown"}).',
        "",
        "AI Summary:",
        doc.ai_summary or "No summary available.",
        "",
        "Risk Flags:",
    ]

    for flag in doc.risk_flags or []:
        severity = flag.get("severity", "unknown").upper()
        desc = flag.get("description", "")
        quote = flag.get("quote", "")
        lines.append(f"- [{severity}] {desc} (quote: '{quote}')")

    lines.append("")
    lines.append("Key Terms:")
    for term in doc.key_terms or []:
        lines.append(f"- {term}")

    lines.append("")
    lines.append("Extracted Financial Numbers:")
    for key, value in (doc.extracted_numbers or {}).items():
        lines.append(f"{key}: {value}")

    lines.append("")
    lines.append(
        "Answer questions about this document based on the above analysis. "
        "If asked about something not covered in the analysis, say so directly."
    )

    return "\n".join(lines)


@router.post("/", status_code=200)
@limiter.limit("10/minute")
async def chat(
    request: Request,
    body: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _feat: None = Depends(require_feature("ai_chat_enabled")),
    _quota: None = Depends(require_quota("ai_messages_per_month")),
) -> StreamingResponse:
    """Stream an AI response to a chat message. Saves both messages to DB.

    Context types:
      - general: No context injection. General real estate Q&A.
      - deal: Loads the Deal record and appends inputs/outputs/risk_score
        to the user message as a [DEAL CONTEXT] block.
      - document: Loads the Document record. If RAG embeddings are ready,
        retrieves relevant chunks with citations. Otherwise falls back to
        metadata summary injection.
    """
    sse_headers = {"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}

    # --- Document context: early validation + RAG retrieval -----------------
    document_system_context: str | None = None
    citation_data: list[dict] | None = None

    if body.context_type == "document" and body.context_id:
        doc = db.query(Document).filter(
            Document.id == body.context_id,
            Document.user_id == current_user.id,
        ).first()

        if not doc or doc.status not in ("complete", "processing"):
            def _doc_error_stream():
                msg = (
                    "This document hasn't finished processing yet, or "
                    "couldn't be found. Please try again after analysis completes."
                )
                yield f"data: {json.dumps({'delta': msg})}\n\n"
                yield 'data: {"done": true}\n\n'

            return StreamingResponse(
                _doc_error_stream(),
                media_type="text/event-stream",
                headers=sse_headers,
            )

        # Try RAG first (if embeddings are ready)
        if doc.embedding_status == "complete":
            try:
                chunks = retrieve_relevant_chunks(
                    query=body.message,
                    user_id=current_user.id,
                    db=db,
                    document_ids=[doc.id],
                )
                if chunks:
                    document_system_context = build_rag_context(chunks, doc)
                    citation_data = [
                        {
                            "chunk_id": str(c.chunk_id),
                            "document_id": str(c.document_id),
                            "document_name": c.source_filename,
                            "content_preview": c.content[:200],
                            "relevance_score": round(c.relevance_score, 3),
                            "page_number": (c.metadata or {}).get("approx_page"),
                        }
                        for c in chunks
                    ]
            except Exception:
                import logging
                logging.getLogger(__name__).exception(
                    "RAG retrieval failed for document %s, falling back to metadata",
                    body.context_id,
                )

        # Fall back to metadata summary if RAG not available or failed
        if not document_system_context and doc.status == "complete":
            document_system_context = _build_document_system_context(doc)
            if doc.embedding_status == "complete":
                # RAG was available but failed — note this in context
                document_system_context += (
                    "\n\nNote: Using document summary — "
                    "full search temporarily unavailable."
                )

    # --- Deal context: appended to user message ----------------------------
    context_block = _build_context_block(
        body.context_type, body.context_id, current_user, db
    )
    assembled_message = body.message + context_block
    history_dicts = [{"role": m.role, "content": m.content} for m in body.history]

    # Skip persistence for demo users — streaming still works normally
    _demo = is_demo_user(current_user)

    if not _demo:
        # Persist user message before streaming starts
        user_msg = ChatMessage(
            user_id=current_user.id,
            session_id=body.session_id,
            role="user",
            content=body.message,
            context_type=body.context_type if body.context_type != "general" else None,
            context_id=body.context_id,
        )
        db.add(user_msg)
        db.commit()

    # Capture citation_data in closure for the generator
    _citation_data = citation_data

    def event_generator():
        full_reply: list[str] = []
        try:
            for chunk in stream_chat_response(
                assembled_message,
                history_dicts,
                system_context=document_system_context,
            ):
                full_reply.append(chunk)
                yield f"data: {json.dumps({'delta': chunk})}\n\n"
        finally:
            # Persist assistant message after stream completes (skip for demo)
            if full_reply and not _demo:
                assistant_msg = ChatMessage(
                    user_id=current_user.id,
                    session_id=body.session_id,
                    role="assistant",
                    content="".join(full_reply),
                    context_type=body.context_type if body.context_type != "general" else None,
                    context_id=body.context_id,
                    citations=_citation_data,
                )
                db.add(assistant_msg)
                record_usage(current_user.id, "ai_messages_per_month", db)
                db.commit()

        # Include citations in the done event
        done_payload: dict = {"done": True}
        if _citation_data:
            done_payload["citations"] = _citation_data
        yield f"data: {json.dumps(done_payload)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers=sse_headers,
    )


@router.get("/history/", response_model=ChatHistoryResponse)
@limiter.limit("30/minute")
async def get_chat_history(
    request: Request,
    session_id: Optional[str] = Query(None),
    context_type: Optional[str] = Query(None),
    context_id: Optional[uuid.UUID] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ChatHistoryResponse:
    """Return last 50 chat messages for the current user in chronological order.

    Optionally filter by session_id and/or context_type + context_id.
    Demo users receive fixture-based seeded history instead of a DB query.
    """
    if is_demo_user(current_user):
        return get_seeded_history()

    query = db.query(ChatMessage).filter(ChatMessage.user_id == current_user.id)
    if session_id:
        query = query.filter(ChatMessage.session_id == session_id)

    # Context isolation: scope messages to the requested context.
    # - "general" (or None): only messages with no context_type set
    # - "deal"/"document": must match both context_type AND context_id
    if context_type and context_type != "general":
        query = query.filter(ChatMessage.context_type == context_type)
        if context_id:
            query = query.filter(ChatMessage.context_id == context_id)
    else:
        # General chat: exclude deal/document messages
        query = query.filter(
            (ChatMessage.context_type == None) | (ChatMessage.context_type == "general")  # noqa: E711
        )

    messages = (
        query
        .order_by(ChatMessage.created_at.desc())
        .limit(50)
        .all()
    )
    messages_asc = list(reversed(messages))
    return ChatHistoryResponse(
        messages=[
            ChatMessageResponse(
                id=m.id,
                role=m.role,
                content=m.content,
                context_type=m.context_type,
                citations=m.citations,
                created_at=m.created_at.isoformat(),
            )
            for m in messages_asc
        ]
    )


@router.get("/sessions/", response_model=ChatSessionsResponse)
@limiter.limit("30/minute")
async def get_chat_sessions(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ChatSessionsResponse:
    """List chat sessions grouped by session_id with metadata."""
    rows = (
        db.query(
            ChatMessage.session_id,
            func.min(ChatMessage.content).label("first_message"),
            func.max(ChatMessage.created_at).label("last_message_at"),
            func.count(ChatMessage.id).label("message_count"),
        )
        .filter(
            ChatMessage.user_id == current_user.id,
            ChatMessage.role == "user",
        )
        .group_by(ChatMessage.session_id)
        .order_by(func.max(ChatMessage.created_at).desc())
        .limit(50)
        .all()
    )

    sessions = [
        ChatSessionItem(
            session_id=row.session_id,
            title=row.first_message[:80] if row.first_message else "New conversation",
            last_message_at=row.last_message_at.isoformat(),
            message_count=row.message_count,
        )
        for row in rows
    ]

    return ChatSessionsResponse(sessions=sessions)
