"""Pydantic schemas for the dashboard stats endpoint."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class RecentDealItem(BaseModel):
    """A recent deal summary for the dashboard feed."""

    id: UUID
    address: str
    strategy: str
    risk_score: Optional[int] = None
    status: str
    created_at: datetime
    outputs: dict

    model_config = {"from_attributes": True}


class DashboardStatsResponse(BaseModel):
    """Aggregated dashboard stats for the authenticated user."""

    total_deals: int
    active_pipeline_deals: int
    deals_by_strategy: dict[str, int]
    pipeline_by_stage: dict[str, int]
    recent_deals: list[RecentDealItem]
