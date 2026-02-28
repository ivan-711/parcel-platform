"""Pydantic schemas for AI chat messages and session history."""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ChatHistoryItem(BaseModel):
    """A single message in the chat history provided for context."""

    role: str  # user | assistant
    content: str


class ChatMessageRequest(BaseModel):
    """Request body for sending a message to the AI chat specialist."""

    message: str
    context_type: Optional[str] = None   # general | deal | document
    context_id: Optional[uuid.UUID] = None
    history: list[ChatHistoryItem] = []


class ChatMessageResponse(BaseModel):
    """Response returned after a chat message is persisted."""

    id: uuid.UUID
    role: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}
