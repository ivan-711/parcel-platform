"""Chat router — SSE streaming AI chat + history retrieval."""

import json
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from core.ai.chat_specialist import stream_chat_response
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
    """Load deal or document context and return an injection block string."""
    if not context_id or context_type == "general":
        return ""

    if context_type == "deal":
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

    if context_type == "document":
        doc = db.query(Document).filter(Document.id == context_id).first()
        if not doc or doc.user_id != current_user.id:
            raise HTTPException(
                status_code=404,
                detail={"error": "Document not found", "code": "DOC_NOT_FOUND"},
            )
        return (
            f"\n\n[DOCUMENT CONTEXT]\n"
            f"Filename: {doc.filename}\n"
            f"Summary: {doc.ai_summary or 'Not yet processed'}\n"
            f"Key Terms: {json.dumps(doc.ai_key_terms or [])}\n"
            f"Risk Flags: {json.dumps(doc.ai_risk_flags or [])}\n"
            f"[/DOCUMENT CONTEXT]\n"
        )

    return ""


@router.post("/", status_code=200)
async def chat(
    body: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    """Stream an AI response to a chat message. Saves both messages to DB."""
    context_block = _build_context_block(
        body.context_type, body.context_id, current_user, db
    )
    assembled_message = body.message + context_block
    history_dicts = [{"role": m.role, "content": m.content} for m in body.history]

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
            for chunk in stream_chat_response(assembled_message, history_dicts):
                full_reply.append(chunk)
                yield f"data: {json.dumps({'delta': chunk})}\n\n"
        finally:
            # Persist assistant message after stream completes (or on error)
            if full_reply:
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
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/history/", response_model=ChatHistoryResponse)
async def get_chat_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ChatHistoryResponse:
    """Return last 50 chat messages for the current user in chronological order."""
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
