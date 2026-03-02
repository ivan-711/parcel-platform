"""Pydantic schemas for dashboard stats and activity feed endpoints."""

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel


class ActivityItem(BaseModel):
    """A single event in the dashboard activity feed."""

    id: UUID
    activity_type: str
    text: str
    timestamp: datetime
    metadata: dict[str, Any]


class ActivityFeedResponse(BaseModel):
    """Response for GET /api/v1/dashboard/activity/."""

    activities: list[ActivityItem]


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
    closed_deals: int
    deals_by_strategy: dict[str, int]
    pipeline_by_stage: dict[str, int]
    recent_deals: list[RecentDealItem]
