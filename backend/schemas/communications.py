"""Pydantic schemas for communication send endpoints and thread view."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class SendSMSRequest(BaseModel):
    contact_id: UUID
    body: str = Field(..., min_length=1, max_length=1600)
    deal_id: Optional[UUID] = None
    property_id: Optional[UUID] = None


class SendEmailRequest(BaseModel):
    contact_id: UUID
    subject: str = Field(..., min_length=1)
    body_html: str = Field(..., min_length=1)
    body_text: Optional[str] = None
    deal_id: Optional[UUID] = None
    property_id: Optional[UUID] = None


class CommunicationResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: UUID
    channel: str
    direction: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    status: str = "logged"
    error_message: Optional[str] = None
    external_id: Optional[str] = None
    contact_id: Optional[UUID] = None
    deal_id: Optional[UUID] = None
    property_id: Optional[UUID] = None
    cost_cents: Optional[int] = None
    occurred_at: datetime
    created_at: datetime


class ThreadContact(BaseModel):
    id: UUID
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None


class ThreadResponse(BaseModel):
    contact: ThreadContact
    messages: list[CommunicationResponse]
    total: int
