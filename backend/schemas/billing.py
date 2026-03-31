from datetime import datetime
from enum import Enum
from typing import Optional, List

from pydantic import BaseModel, Field, field_validator


class PlanTierEnum(str, Enum):
    """Available billing plans."""

    FREE = "free"
    STARTER = "starter"
    PRO = "pro"
    TEAM = "team"


class IntervalEnum(str, Enum):
    """Billing interval options."""

    MONTHLY = "monthly"
    ANNUAL = "annual"


# -- Requests --


class CheckoutRequest(BaseModel):
    """Request to create a Stripe Checkout session."""

    plan: PlanTierEnum
    interval: IntervalEnum = IntervalEnum.MONTHLY

    @field_validator("plan")
    @classmethod
    def plan_must_be_paid(cls, v: PlanTierEnum) -> PlanTierEnum:
        if v == PlanTierEnum.FREE:
            raise ValueError("Cannot create checkout for the free plan")
        return v


class CancelRequest(BaseModel):
    """Request to cancel an active subscription."""

    reason: Optional[str] = Field(None, max_length=500)
    immediate: bool = False


# -- Responses --


class CheckoutResponse(BaseModel):
    """Stripe Checkout session URL."""

    checkout_url: str


class PortalResponse(BaseModel):
    """Stripe Customer Portal URL."""

    portal_url: str


class UsageMetricResponse(BaseModel):
    """Single usage metric with current count and limit."""

    metric: str
    display_name: str
    current: int
    limit: Optional[int] = None
    resets_at: Optional[datetime] = None
    warning: bool = False


class BillingStatusResponse(BaseModel):
    """Full billing status for the authenticated user."""

    plan: str
    status: Optional[str] = None
    interval: Optional[str] = None
    current_period_end: Optional[datetime] = None
    cancel_at_period_end: bool = False
    trial_ends_at: Optional[datetime] = None
    trial_active: bool = False
    usage: List[UsageMetricResponse]


class CancelResponse(BaseModel):
    """Result of a cancellation request."""

    status: str
    cancel_at: Optional[datetime] = None
    message: str
