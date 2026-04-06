"""Pydantic schemas for the AI chat endpoints."""

from __future__ import annotations

import uuid
from typing import Optional

from pydantic import BaseModel


class ChatHistoryMessage(BaseModel):
    """A single message passed as context history."""

    role: str
    content: str


class ChatRequest(BaseModel):
    """Request body for POST /chat/."""

    message: str
    context_type: str = "general"
    context_id: Optional[uuid.UUID] = None
    history: list[ChatHistoryMessage] = []
    session_id: str = "default"


class ChatMessageResponse(BaseModel):
    """A persisted chat message returned from the history endpoint."""

    id: uuid.UUID
    role: str
    content: str
    context_type: Optional[str]
    citations: Optional[list[dict]] = None
    created_at: str

    model_config = {"from_attributes": True}


class ChatHistoryResponse(BaseModel):
    """Response wrapper for GET /chat/history/."""

    messages: list[ChatMessageResponse]


class ChatSessionItem(BaseModel):
    """A single chat session summary."""

    session_id: str
    title: str
    last_message_at: str
    message_count: int


class ChatSessionsResponse(BaseModel):
    """Response wrapper for GET /chat/sessions/."""

    sessions: list[ChatSessionItem]
