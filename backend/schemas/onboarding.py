"""Schemas for onboarding endpoints."""

from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class PersonaRequest(BaseModel):
    """Request to set the user's onboarding persona."""
    persona: str = Field(..., description="One of: wholesale, flip, buy_and_hold, creative_finance, brrrr, hybrid, agent, beginner")


class OnboardingPropertyResponse(BaseModel):
    """Property data in onboarding response."""
    id: UUID
    address_line1: str
    city: str
    state: str
    zip_code: str
    property_type: Optional[str] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    sqft: Optional[int] = None
    year_built: Optional[int] = None
    is_sample: bool = True

    model_config = {"from_attributes": True}


class OnboardingScenarioResponse(BaseModel):
    """Scenario data in onboarding response."""
    id: UUID
    property_id: UUID
    strategy: str
    purchase_price: Optional[float] = None
    after_repair_value: Optional[float] = None
    repair_cost: Optional[float] = None
    monthly_rent: Optional[float] = None
    outputs: dict = {}
    ai_narrative: Optional[str] = None
    is_sample: bool = True

    model_config = {"from_attributes": True}


class PersonaResponse(BaseModel):
    """Response after setting persona and creating sample data."""
    persona: str
    sample_property: OnboardingPropertyResponse
    sample_scenarios: list[OnboardingScenarioResponse]


class OnboardingStatusResponse(BaseModel):
    """Onboarding status for the current user."""
    completed: bool
    persona: Optional[str] = None
    has_sample_data: bool = False
    has_real_data: bool = False
    real_property_count: int = 0
