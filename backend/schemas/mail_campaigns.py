"""Pydantic schemas for direct mail campaign management."""

import uuid
from datetime import date, datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------


class CreateCampaignRequest(BaseModel):
    """Create a new mail campaign in draft status."""

    name: str = Field(..., min_length=1)
    mail_type: str  # postcard_4x6 | postcard_6x9 | postcard_6x11 | letter
    description: Optional[str] = None
    template_front_html: Optional[str] = None
    template_back_html: Optional[str] = None
    from_address: Optional[dict[str, Any]] = None
    scheduled_date: Optional[date] = None


class UpdateCampaignRequest(BaseModel):
    """Update a draft campaign — all fields optional."""

    name: Optional[str] = Field(None, min_length=1)
    description: Optional[str] = None
    mail_type: Optional[str] = None
    template_front_html: Optional[str] = None
    template_back_html: Optional[str] = None
    from_address: Optional[dict[str, Any]] = None
    scheduled_date: Optional[date] = None


class RecipientInput(BaseModel):
    """A single recipient to add to a campaign."""

    to_address: dict[str, Any]  # required: {line1, city, state, zip}
    to_name: Optional[str] = None
    contact_id: Optional[uuid.UUID] = None
    property_id: Optional[uuid.UUID] = None


class AddRecipientsRequest(BaseModel):
    """Batch-add recipients to a draft campaign (max 500)."""

    recipients: list[RecipientInput] = Field(..., max_length=500)


class QuickSendRequest(BaseModel):
    """Send a single mail piece directly (no campaign required)."""

    mail_type: str  # postcard_4x6 | postcard_6x9 | postcard_6x11 | letter
    to_address: dict[str, Any]
    to_name: Optional[str] = None
    from_address: dict[str, Any]
    template_front_html: str
    template_back_html: Optional[str] = None


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class RecipientResponse(BaseModel):
    """Single recipient record returned from the API."""

    id: uuid.UUID
    campaign_id: uuid.UUID
    contact_id: Optional[uuid.UUID] = None
    property_id: Optional[uuid.UUID] = None
    to_name: Optional[str] = None
    to_address: dict[str, Any]
    address_verified: bool
    deliverability: Optional[str] = None
    lob_mail_id: Optional[str] = None
    status: str
    cost_cents: Optional[int] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class CampaignResponse(BaseModel):
    """Full campaign object with recipients included."""

    id: uuid.UUID
    created_by: uuid.UUID
    team_id: Optional[uuid.UUID] = None
    name: str
    description: Optional[str] = None
    status: str
    mail_type: str
    template_front_html: Optional[str] = None
    template_back_html: Optional[str] = None
    from_address: Optional[dict[str, Any]] = None
    scheduled_date: Optional[date] = None
    sent_at: Optional[datetime] = None
    total_recipients: int
    total_sent: int
    total_delivered: int
    total_returned: int
    total_cost_cents: int
    deleted_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    recipients: list[RecipientResponse] = []

    model_config = {"from_attributes": True}


class CampaignListItem(BaseModel):
    """Compact campaign summary for list responses."""

    id: uuid.UUID
    name: str
    status: str
    mail_type: str
    total_recipients: int
    total_sent: int
    total_delivered: int
    total_returned: int
    total_cost_cents: int
    scheduled_date: Optional[date] = None
    sent_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class VerifyResponse(BaseModel):
    """Address verification summary returned after verifying a campaign's recipients."""

    total: int
    deliverable: int
    undeliverable: int
    no_match: int


class CampaignAnalytics(BaseModel):
    """Delivery analytics for a sent campaign."""

    campaign_id: uuid.UUID
    total_sent: int
    total_delivered: int
    total_returned: int
    delivery_rate: float  # 0.0 – 1.0
    return_rate: float    # 0.0 – 1.0
    total_cost_cents: int
