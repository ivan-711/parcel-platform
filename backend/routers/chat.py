"""Chat router — SSE streaming AI chat + history retrieval."""

import json
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from core.ai.chat_specialist import stream_chat_response
from core.demo import is_demo_user
from core.demo.chat_service import get_seeded_history
from core.security.jwt import get_current_user
from database import get_db
from models.chat_messages import ChatMessage
from models.deals import Deal
from models.documents import Document
from models.users import User
from schemas.chat import ChatRequest, ChatHistoryResponse, ChatMessageResponse

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
    return (
        f"\n\n[DEAL CONTEXT]\n"
        f"Address: {deal.address}\n"
        f"Strategy: {deal.strategy}\n"
        f"Inputs: {json.dumps(deal.inputs)}\n"
        f"Outputs: {json.dumps(deal.outputs)}\n"
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
async def chat(
    body: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    """Stream an AI response to a chat message. Saves both messages to DB.

    Context types:
      - general: No context injection. General real estate Q&A.
      - deal: Loads the Deal record and appends inputs/outputs/risk_score
        to the user message as a [DEAL CONTEXT] block.
      - document: Loads the Document record (must be status='complete') and
        injects ai_summary, risk_flags, key_terms, and extracted_numbers
        into the system prompt. Returns a graceful SSE error if the document
        is not found or not yet processed.
    """
    sse_headers = {"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}

    # --- Document context: early validation + graceful SSE error -----------
    document_system_context: str | None = None

    if body.context_type == "document" and body.context_id:
        doc = db.query(Document).filter(
            Document.id == body.context_id,
            Document.user_id == current_user.id,
        ).first()

        if not doc or doc.status != "complete":
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

        document_system_context = _build_document_system_context(doc)

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
                )
                db.add(assistant_msg)
                db.commit()
        yield 'data: {"done": true}\n\n'

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers=sse_headers,
    )


@router.get("/history/", response_model=ChatHistoryResponse)
async def get_chat_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ChatHistoryResponse:
    """Return last 50 chat messages for the current user in chronological order.

    Demo users receive fixture-based seeded history instead of a DB query.
    """
    if is_demo_user(current_user):
        return get_seeded_history()

    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.user_id == current_user.id)
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
                created_at=m.created_at.isoformat(),
            )
            for m in messages_asc
        ]
    )
