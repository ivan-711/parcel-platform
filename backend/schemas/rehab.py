# backend/schemas/rehab.py
"""Pydantic schemas for rehab project and item endpoints."""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class CreateRehabProjectRequest(BaseModel):
    property_id: UUID
    name: str = Field(..., min_length=1)
    deal_id: Optional[UUID] = None
    status: str = "planning"
    start_date: Optional[date] = None
    target_completion: Optional[date] = None
    notes: Optional[str] = None
    import_bricked: bool = False


class UpdateRehabProjectRequest(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[date] = None
    target_completion: Optional[date] = None
    actual_completion: Optional[date] = None
    notes: Optional[str] = None


class RehabItemResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    project_id: UUID
    created_by: UUID
    category: str
    description: str
    estimated_cost: Optional[Decimal] = None
    actual_cost: Optional[Decimal] = None
    status: str
    contractor_name: Optional[str] = None
    contractor_bid: Optional[Decimal] = None
    priority: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class RehabProjectResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    property_id: UUID
    deal_id: Optional[UUID] = None
    created_by: UUID
    team_id: Optional[UUID] = None
    name: str
    status: str
    estimated_budget: Optional[Decimal] = None
    actual_spent: Optional[Decimal] = None
    start_date: Optional[date] = None
    target_completion: Optional[date] = None
    actual_completion: Optional[date] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    # Computed
    item_count: int = 0
    total_estimated: float = 0
    total_actual: float = 0
    budget_variance: float = 0
    completion_pct: float = 0
    property_address: str = ""


class RehabProjectDetailResponse(RehabProjectResponse):
    items: list[RehabItemResponse] = []


class CreateRehabItemRequest(BaseModel):
    category: str
    description: str = Field(..., min_length=1)
    estimated_cost: Optional[Decimal] = None
    actual_cost: Optional[Decimal] = None
    status: str = "planned"
    contractor_name: Optional[str] = None
    contractor_bid: Optional[Decimal] = None
    priority: str = "normal"
    notes: Optional[str] = None


class UpdateRehabItemRequest(BaseModel):
    category: Optional[str] = None
    description: Optional[str] = None
    estimated_cost: Optional[Decimal] = None
    actual_cost: Optional[Decimal] = None
    status: Optional[str] = None
    contractor_name: Optional[str] = None
    contractor_bid: Optional[Decimal] = None
    priority: Optional[str] = None
    notes: Optional[str] = None


class BulkCreateItemsRequest(BaseModel):
    items: list[CreateRehabItemRequest]


class CategorySummary(BaseModel):
    category: str
    estimated: float
    actual: float
    variance: float
    item_count: int
    completed_count: int


class ProjectSummaryResponse(BaseModel):
    total_estimated: float
    total_actual: float
    total_variance: float
    overall_completion_pct: float
    by_category: list[CategorySummary] = []
