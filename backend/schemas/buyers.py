"""Pydantic schemas for buyer and buy box endpoints."""

from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class BuyBoxResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: UUID
    contact_id: UUID
    created_by: UUID
    name: str
    is_active: bool
    target_markets: Optional[list[str]] = None
    max_distance_miles: Optional[int] = None
    min_price: Optional[Decimal] = None
    max_price: Optional[Decimal] = None
    min_arv: Optional[Decimal] = None
    max_arv: Optional[Decimal] = None
    min_cash_flow: Optional[Decimal] = None
    min_cap_rate: Optional[Decimal] = None
    min_coc_return: Optional[Decimal] = None
    max_repair_cost: Optional[Decimal] = None
    property_types: Optional[list[str]] = None
    min_bedrooms: Optional[int] = None
    min_bathrooms: Optional[int] = None
    min_sqft: Optional[int] = None
    max_year_built: Optional[int] = None
    min_year_built: Optional[int] = None
    strategies: Optional[list[str]] = None
    funding_type: Optional[str] = None
    can_close_days: Optional[int] = None
    proof_of_funds: bool = False
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class CreateBuyBoxRequest(BaseModel):
    name: str = Field(..., min_length=1)
    is_active: bool = True
    target_markets: Optional[list[str]] = None
    min_price: Optional[Decimal] = None
    max_price: Optional[Decimal] = None
    min_arv: Optional[Decimal] = None
    max_arv: Optional[Decimal] = None
    min_cash_flow: Optional[Decimal] = None
    min_cap_rate: Optional[Decimal] = None
    min_coc_return: Optional[Decimal] = None
    max_repair_cost: Optional[Decimal] = None
    property_types: Optional[list[str]] = None
    min_bedrooms: Optional[int] = None
    min_bathrooms: Optional[int] = None
    min_sqft: Optional[int] = None
    max_year_built: Optional[int] = None
    min_year_built: Optional[int] = None
    strategies: Optional[list[str]] = None
    funding_type: Optional[str] = None
    can_close_days: Optional[int] = None
    proof_of_funds: bool = False
    notes: Optional[str] = None


class UpdateBuyBoxRequest(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None
    target_markets: Optional[list[str]] = None
    min_price: Optional[Decimal] = None
    max_price: Optional[Decimal] = None
    min_arv: Optional[Decimal] = None
    max_arv: Optional[Decimal] = None
    min_cash_flow: Optional[Decimal] = None
    min_cap_rate: Optional[Decimal] = None
    min_coc_return: Optional[Decimal] = None
    max_repair_cost: Optional[Decimal] = None
    property_types: Optional[list[str]] = None
    min_bedrooms: Optional[int] = None
    min_bathrooms: Optional[int] = None
    min_sqft: Optional[int] = None
    max_year_built: Optional[int] = None
    min_year_built: Optional[int] = None
    strategies: Optional[list[str]] = None
    funding_type: Optional[str] = None
    can_close_days: Optional[int] = None
    proof_of_funds: Optional[bool] = None
    notes: Optional[str] = None


class BuyerListItem(BaseModel):
    id: UUID
    first_name: str
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    contact_type: Optional[str] = None
    buy_boxes: list[BuyBoxResponse] = []
    deal_count: int = 0
    last_communication: Optional[str] = None
    funding_type: Optional[str] = None
    has_pof: bool = False


class BuyerDetailResponse(BuyerListItem):
    notes: Optional[str] = None
    tags: Optional[list[str]] = None
    total_deals_closed: int = 0
    total_deal_volume: float = 0


class QuickAddBuyerRequest(BaseModel):
    first_name: str = Field(..., min_length=1)
    last_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    company: Optional[str] = None
    funding_type: Optional[str] = None
    proof_of_funds: bool = False
    buy_box: CreateBuyBoxRequest


class MatchingPropertyItem(BaseModel):
    id: UUID
    address: str
    city: str
    state: str
    zip_code: str
    purchase_price: Optional[float] = None
    after_repair_value: Optional[float] = None
    property_type: Optional[str] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    sqft: Optional[int] = None
    strategy: Optional[str] = None
