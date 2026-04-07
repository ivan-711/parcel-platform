"""Schemas for the quick analysis endpoint."""

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class QuickAnalysisRequest(BaseModel):
    """Request to analyze a property by address."""
    address: str = Field(..., min_length=5, max_length=500)
    strategy: Optional[str] = Field(None, description="Investment strategy. Defaults to buy_and_hold.")


class ProviderStatusResponse(BaseModel):
    """Status of a single data provider's enrichment attempt."""
    provider: str
    status: str
    latency_ms: int = 0
    error: Optional[str] = None
    fields_populated: list[str] = []


class PropertyResponse(BaseModel):
    """Property data returned from enrichment."""
    id: UUID
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    zip_code: str
    county: Optional[str] = None
    property_type: Optional[str] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    sqft: Optional[int] = None
    lot_sqft: Optional[int] = None
    year_built: Optional[int] = None
    status: str
    data_sources: Optional[dict] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ScenarioResponse(BaseModel):
    """AnalysisScenario data returned from enrichment."""
    id: UUID
    property_id: UUID
    strategy: str
    purchase_price: Optional[float] = None
    after_repair_value: Optional[float] = None
    repair_cost: Optional[float] = None
    monthly_rent: Optional[float] = None
    down_payment_pct: Optional[float] = None
    interest_rate: Optional[float] = None
    loan_term_years: Optional[int] = None
    outputs: dict = {}
    source_confidence: Optional[dict] = None
    ai_narrative: Optional[str] = None
    ai_narrative_generated_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class NarrativeResponse(BaseModel):
    """AI narrative metadata."""
    narrative: Optional[str] = None
    confidence: str = "medium"
    assumptions_stated: list[str] = []
    risks_flagged: list[str] = []
    missing_data: list[str] = []
    tokens_used: int = 0
    latency_ms: int = 0


class RegenerateNarrativeRequest(BaseModel):
    """Request to regenerate a scenario's AI narrative."""
    experience_level: Optional[str] = Field(None, description="beginner | intermediate | experienced")


class EnrichmentDetails(BaseModel):
    """Details about the enrichment process."""
    status: str  # complete | partial | failed | existing
    is_existing: bool = False
    fields_populated: dict[str, Any] = {}
    fields_missing: list[str] = []
    confidence: dict[str, str] = {}
    provider_statuses: dict[str, ProviderStatusResponse] = {}
    latency_ms: int = 0


class QuickAnalysisResponse(BaseModel):
    """Response from POST /api/analysis/quick."""
    property: PropertyResponse
    scenario: Optional[ScenarioResponse] = None
    enrichment: EnrichmentDetails
    narrative: Optional[NarrativeResponse] = None
    deal_id: Optional[UUID] = None


class CompareRequest(BaseModel):
    property_id: Optional[UUID] = None
    inputs: dict


class StrategyResult(BaseModel):
    strategy: str
    key_metric: Optional[float] = None
    key_metric_label: str
    roi: Optional[float] = None
    risk_score: int = 50
    time_horizon: str
    break_even_months: Optional[int] = None
    five_year_total_return: Optional[float] = None
    monthly_cash_flow: Optional[float] = None
    verdict: str
    outputs: dict = {}


class CompareResponse(BaseModel):
    strategies: list[StrategyResult] = []
    recommendation: str = ""
    recommendation_reason: str = ""
