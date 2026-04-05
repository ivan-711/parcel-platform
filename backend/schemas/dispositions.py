"""Pydantic schemas for disposition match scoring and buyer packets."""

from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ── Match scoring ─────────────────────────────────────────

class MatchBreakdown(BaseModel):
    location: int
    financial: int
    property: int
    strategy: int


class PropertyMatchResult(BaseModel):
    contact_id: UUID
    buyer_name: str
    company: Optional[str] = None
    buy_box_id: UUID
    buy_box_name: str
    score: int
    match_level: str
    breakdown: MatchBreakdown
    reasons: list[str]
    funding_type: Optional[str] = None
    has_pof: bool = False
    can_close_days: Optional[int] = None


class PropertyInfo(BaseModel):
    id: UUID
    address: str
    city: str
    state: str
    zip_code: str
    strategy: Optional[str] = None
    purchase_price: Optional[float] = None


class PropertyMatchResponse(BaseModel):
    property: PropertyInfo
    matches: list[PropertyMatchResult]


class BuyerMatchResult(BaseModel):
    property_id: UUID
    address: str
    city: str
    state: str
    zip_code: str
    strategy: Optional[str] = None
    purchase_price: Optional[float] = None
    buy_box_name: str
    score: int
    match_level: str
    breakdown: MatchBreakdown


class BuyerInfo(BaseModel):
    id: UUID
    name: str
    company: Optional[str] = None


class BuyerMatchResponse(BaseModel):
    buyer: BuyerInfo
    matches: list[BuyerMatchResult]


class MatchPreviewRequest(BaseModel):
    property_id: UUID
    buy_box_id: UUID


class MatchPreviewResponse(BaseModel):
    score: int
    match_level: str
    breakdown: MatchBreakdown
    reasons: list[str]


# ── Buyer packets ─────────────────────────────────────────

class CreatePacketRequest(BaseModel):
    property_id: UUID
    scenario_id: UUID
    title: Optional[str] = None
    asking_price: Optional[Decimal] = None
    assignment_fee: Optional[Decimal] = None
    notes_to_buyer: Optional[str] = None


class PacketResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: UUID
    property_id: UUID
    scenario_id: UUID
    title: str
    share_token: str
    share_url: str
    asking_price: Optional[float] = None
    assignment_fee: Optional[float] = None
    notes_to_buyer: Optional[str] = None
    is_public: bool
    view_count: int
    last_viewed_at: Optional[str] = None
    send_count: int = 0
    created_at: datetime
    updated_at: datetime


class PacketListItem(BaseModel):
    id: UUID
    title: str
    share_url: str
    property_address: str
    asking_price: Optional[float] = None
    view_count: int = 0
    send_count: int = 0
    created_at: datetime


class SharedPacketResponse(BaseModel):
    title: str
    packet_data: dict
    asking_price: Optional[float] = None
    assignment_fee: Optional[float] = None
    notes_to_buyer: Optional[str] = None
    created_at: datetime


class SendPacketRequest(BaseModel):
    buyer_contact_ids: list[UUID] = Field(..., max_length=50)
    message: Optional[str] = None


class SendPacketResponse(BaseModel):
    sent_count: int
    buyer_names: list[str]
