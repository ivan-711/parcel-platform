"""Pydantic schemas for sequences, steps, enrollments, and analytics."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Step schemas
# ---------------------------------------------------------------------------


class SequenceStepRequest(BaseModel):
    channel: str = Field(..., pattern="^(sms|email)$")
    delay_days: int = Field(0, ge=0)
    delay_hours: int = Field(0, ge=0)
    subject: Optional[str] = None
    body_template: str = Field(..., min_length=1)


class UpdateStepRequest(BaseModel):
    channel: Optional[str] = Field(None, pattern="^(sms|email)$")
    delay_days: Optional[int] = Field(None, ge=0)
    delay_hours: Optional[int] = Field(None, ge=0)
    subject: Optional[str] = None
    body_template: Optional[str] = Field(None, min_length=1)


class StepResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    sequence_id: UUID
    step_order: int
    channel: str
    delay_days: int
    delay_hours: int
    subject: Optional[str] = None
    body_template: str
    deleted_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Sequence schemas
# ---------------------------------------------------------------------------


class CreateSequenceRequest(BaseModel):
    name: str = Field(..., min_length=1)
    description: Optional[str] = None
    stop_on_reply: bool = True
    stop_on_deal_created: bool = False
    steps: list[SequenceStepRequest] = []


class UpdateSequenceRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1)
    description: Optional[str] = None
    status: Optional[str] = None
    stop_on_reply: Optional[bool] = None
    stop_on_deal_created: Optional[bool] = None


class SequenceResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    created_by: UUID
    name: str
    description: Optional[str] = None
    status: str
    trigger_type: Optional[str] = None
    stop_on_reply: bool
    stop_on_deal_created: bool
    total_enrolled: int
    total_completed: int
    total_replied: int
    deleted_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    steps: list[StepResponse] = []


class SequenceListItem(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    status: str
    step_count: int
    total_enrolled: int
    total_completed: int
    total_replied: int
    reply_rate: float
    created_at: datetime


# ---------------------------------------------------------------------------
# Enrollment schemas
# ---------------------------------------------------------------------------


class EnrollRequest(BaseModel):
    contact_id: UUID
    property_id: Optional[UUID] = None
    deal_id: Optional[UUID] = None


class BulkEnrollRequest(BaseModel):
    contact_ids: list[UUID] = Field(..., max_length=50)
    property_id: Optional[UUID] = None
    deal_id: Optional[UUID] = None


class EnrollmentResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    sequence_id: UUID
    contact_id: UUID
    property_id: Optional[UUID] = None
    deal_id: Optional[UUID] = None
    created_by: UUID
    status: str
    current_step: int
    next_send_at: Optional[datetime] = None
    enrolled_at: datetime
    completed_at: Optional[datetime] = None
    stopped_at: Optional[datetime] = None
    stopped_reason: Optional[str] = None
    deleted_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    contact_name: str


# ---------------------------------------------------------------------------
# Analytics schema
# ---------------------------------------------------------------------------


class SequenceAnalytics(BaseModel):
    total_enrolled: int = 0
    active: int = 0
    completed: int = 0
    replied: int = 0
    stopped: int = 0
    failed: int = 0
    reply_rate: float = 0.0
    completion_rate: float = 0.0
