"""Pydantic schemas for transaction endpoints."""

from datetime import date
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class CreateTransactionRequest(BaseModel):
    property_id: UUID
    amount: Decimal = Field(..., gt=0)
    transaction_date: date
    category: str  # income | expense | transfer
    transaction_type: str  # rent, mortgage, insurance, etc.
    description: Optional[str] = None
    notes: Optional[str] = None
    is_recurring: bool = False
    recurrence_interval: Optional[str] = None  # monthly | quarterly | annually
    deal_id: Optional[UUID] = None


class UpdateTransactionRequest(BaseModel):
    amount: Optional[Decimal] = Field(None, gt=0)
    transaction_date: Optional[date] = None
    category: Optional[str] = None
    transaction_type: Optional[str] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    deal_id: Optional[UUID] = None


class TransactionResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    property_id: UUID
    deal_id: Optional[UUID] = None
    created_by: UUID
    team_id: Optional[UUID] = None
    transaction_type: str
    amount: Decimal
    description: Optional[str] = None
    occurred_at: date
    category: Optional[str] = None
    vendor: Optional[str] = None
    is_deleted: bool
    created_at: str
    updated_at: str
    # Computed
    property_address: Optional[str] = None


class PaginatedTransactions(BaseModel):
    items: list[TransactionResponse]
    total: int
    page: int
    per_page: int
    pages: int


class MonthlySummary(BaseModel):
    month: str
    income: float
    expenses: float
    net: float


class CategorySummary(BaseModel):
    category: str
    total: float


class PropertySummary(BaseModel):
    property_id: UUID
    address: str
    income: float
    expenses: float
    net: float


class TransactionSummaryResponse(BaseModel):
    by_month: list[MonthlySummary] = []
    by_category: list[CategorySummary] = []
    by_property: list[PropertySummary] = []


class BulkCreateRequest(BaseModel):
    transactions: list[CreateTransactionRequest]


class BulkCreateResponse(BaseModel):
    created: int
    errors: list[str] = []
