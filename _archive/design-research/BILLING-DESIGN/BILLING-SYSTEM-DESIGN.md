# Parcel Billing System -- Definitive Design Document

> **Date:** 2026-03-28
> **Author:** Chief Architect (reconciled from 19 agent designs + adversarial critique)
> **Scope:** MVP billing for a solo founder, buildable in 10-12 working days
> **Stack:** FastAPI + SQLAlchemy 2 (sync) + PostgreSQL (Railway) | React 18 + TypeScript + Vite (Vercel) | Stripe Checkout + Customer Portal

---

## Contradiction Resolutions

Before anything else, here are the canonical answers for every conflict identified by Agent 19.

| Conflict | Resolution | Rationale |
|----------|-----------|-----------|
| **Plan tier naming** | `PlanTier` enum: `free`, `starter`, `pro`, `team`. Column name: `plan_tier`. No `pro_trial`, no `solo_pro`, no `demo` in the enum. | `demo` is checked via `is_demo_user()`, not stored. `pro_trial` is replaced by a `trial_ends_at` column. Starter is included in the enum for future use but not gated at MVP (only Free/Pro enforced). |
| **Usage tracking** | ONE table: `usage_records` with columns `user_id, metric, period_start, count, created_at`. | Agent 04's `usage_events` and Agent 12's `ai_usage_log` are merged into Agent 01's `usage_records`. |
| **Webhook endpoint path** | `POST /webhooks/stripe` -- mounted WITHOUT the `/api/v1` prefix. | Stripe cannot present a JWT. The webhook router is mounted directly on the app, not behind auth middleware. |
| **Trial management** | LOCAL trial via `trial_ends_at` on User. No Stripe subscription during trial. No `pro_trial` plan value. | Simplest approach. Feature gating checks: if `trial_ends_at > now AND no active subscription`, treat user as Pro. No cron job needed. |
| **Feature limits** | ONE authoritative table in Section 5 below. Agent 04's `TierLimits` is canonical. | All conflicting numbers from Agents 05, 06, 07 are overridden. |
| **Config class** | ONE class: `StripeSettings` in `backend/core/billing/config.py` per Agent 02. | Agent 05's `BillingConfig` is discarded. Field names use UPPER_CASE matching env vars. |
| **Column name** | `plan_tier` on User model (not `plan`). | Matches Agent 01's schema. All code references `user.plan_tier`. |
| **Webhook model** | Agent 01's simpler `WebhookEvent` (no `api_version`, `idempotency_key`, `source_ip`). | Extra columns add no MVP value. Single-layer idempotency via `stripe_event_id` uniqueness is sufficient. |
| **Subscription status enum** | `trialing, active, past_due, canceled, unpaid, incomplete, paused`. No `incomplete_expired`. | If Stripe sends `incomplete_expired`, the webhook handler maps it to `canceled` before storing. |

---

## 1. System Overview

### Architecture

```
  Browser (Vercel)                  Railway Backend                    Stripe
  ================                  ===============                    ======

  PricingPage ──POST /billing/checkout──► billing router ──create_checkout_session──► Checkout
       │                                      │                              │
       │◄───── { checkout_url } ◄─────────────┘                              │
       │                                                                     │
       └───── redirect to Stripe Checkout ──────────────────────────────────►│
                                                                             │
                          POST /webhooks/stripe ◄──── webhook events ◄───────┘
                                  │
                     ┌────────────┴────────────┐
                     │  Verify signature        │
                     │  Store in webhook_events │
                     │  Dispatch to handler     │
                     │  Update subscriptions    │
                     │  Update user.plan_tier   │
                     └─────────────────────────┘
                                  │
                     GET /auth/me (frontend polls)
                                  │
                     ┌────────────┴────────────┐
                     │  Returns user with       │
                     │  plan_tier, trial_ends_at│
                     │  ► Frontend re-renders   │
                     │    gates and badges       │
                     └─────────────────────────┘
```

### Component List

| Component | File Path | Purpose |
|-----------|-----------|---------|
| Stripe config | `backend/core/billing/config.py` | Pydantic settings for Stripe keys, price IDs |
| Stripe exceptions | `backend/core/billing/exceptions.py` | Error hierarchy wrapping Stripe SDK errors |
| Stripe service | `backend/core/billing/stripe_service.py` | All Stripe API calls (create customer, checkout, portal, cancel) |
| Tier config | `backend/core/billing/tier_config.py` | `Tier` enum, `TierLimits` dataclass, `TIER_LIMITS` dict |
| Tier gate | `backend/core/billing/tier_gate.py` | FastAPI dependencies: `require_tier`, `require_feature`, `require_quota` |
| Webhook router | `backend/routers/webhooks.py` | Stripe webhook receiver, signature verification, dispatch |
| Billing router | `backend/routers/billing.py` | `/billing/checkout`, `/billing/portal`, `/billing/cancel`, `/billing/status`, `/billing/usage` |
| Billing schemas | `backend/schemas/billing.py` | Pydantic request/response models |
| Subscription model | `backend/models/subscriptions.py` | SQLAlchemy model |
| Usage records model | `backend/models/usage_records.py` | SQLAlchemy model |
| Webhook events model | `backend/models/webhook_events.py` | SQLAlchemy model |
| Billing types (FE) | `frontend/src/types/billing.ts` | TypeScript interfaces |
| Billing hooks (FE) | `frontend/src/hooks/useBilling.ts` | TanStack Query hooks |
| Billing store (FE) | `frontend/src/stores/billingStore.ts` | Zustand store for plan/usage |
| PricingPage (FE) | `frontend/src/pages/PricingPage.tsx` | Plan selection and checkout |
| PaywallOverlay (FE) | `frontend/src/components/billing/PaywallOverlay.tsx` | Feature gate modal |
| TrialBanner (FE) | `frontend/src/components/billing/TrialBanner.tsx` | Trial countdown in sidebar |
| PlanBadge (FE) | `frontend/src/components/billing/PlanBadge.tsx` | Current plan badge in sidebar |
| BillingSettings (FE) | `frontend/src/pages/settings/BillingSettings.tsx` | Settings > Billing tab |

### Data Flow: User Upgrades to Pro

1. User clicks "Upgrade to Pro" on PricingPage
2. Frontend calls `POST /api/v1/billing/checkout { plan: "pro", interval: "monthly" }`
3. Backend creates Stripe Customer (if needed), then creates Checkout Session
4. Backend returns `{ checkout_url }` to frontend
5. Frontend redirects to Stripe Checkout
6. User completes payment on Stripe
7. Stripe redirects user to `/settings?billing=success`
8. Stripe fires `checkout.session.completed` webhook to `POST /webhooks/stripe`
9. Webhook handler: verifies signature, stores event, fetches subscription from Stripe, creates `subscriptions` row, sets `user.plan_tier = "pro"`
10. Frontend detects `?billing=success`, calls `GET /api/v1/auth/me`, gets updated `plan_tier`
11. Feature gates re-evaluate, paywalls disappear, success toast shown

---

## 2. Database Schema

### 2.1 Modifications to Existing Tables

**Users table** -- add 3 columns:

```python
# Add to backend/models/users.py

from sqlalchemy import Column, DateTime, Enum, String
from sqlalchemy.orm import relationship

PlanTier = Enum("free", "starter", "pro", "team", name="plantier")

# New columns on User class:
stripe_customer_id = Column(String, unique=True, nullable=True, index=True)
plan_tier = Column(PlanTier, nullable=False, default="free", server_default="free")
trial_ends_at = Column(DateTime, nullable=True)

# New relationships:
subscriptions = relationship("Subscription", back_populates="user")
usage_records = relationship("UsageRecord", back_populates="user")
```

**Why `plan_tier` on User?** Denormalized convenience. Every authenticated request needs the tier for feature gating. Reading it from the user row (already loaded by `get_current_user`) avoids a JOIN. Updated atomically by webhook handlers.

**Why `trial_ends_at` on User?** Local trial management. Set to `now + 14 days` at registration. Feature gating checks this field. No cron job, no `pro_trial` plan value, no Stripe subscription during trial.

### 2.2 New Tables

#### subscriptions

```python
# backend/models/subscriptions.py

import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from database import Base
from models.base import TimestampMixin

SubscriptionStatus = Enum(
    "trialing", "active", "past_due", "canceled",
    "unpaid", "incomplete", "paused",
    name="subscriptionstatus",
)


class Subscription(TimestampMixin, Base):
    __tablename__ = "subscriptions"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    stripe_subscription_id = Column(String, unique=True, nullable=True, index=True)
    stripe_customer_id = Column(String, nullable=True, index=True)
    status = Column(SubscriptionStatus, nullable=False, default="active")
    plan_tier = Column(String(20), nullable=False, default="free")

    current_period_start = Column(DateTime, nullable=True)
    current_period_end = Column(DateTime, nullable=True)
    trial_start = Column(DateTime, nullable=True)
    trial_end = Column(DateTime, nullable=True)

    cancel_at_period_end = Column(Boolean, nullable=False, default=False, server_default="false")
    canceled_at = Column(DateTime, nullable=True)
    cancel_reason = Column(String, nullable=True)
    ended_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="subscriptions")
```

#### usage_records

```python
# backend/models/usage_records.py

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from database import Base
from models.base import TimestampMixin


class UsageRecord(TimestampMixin, Base):
    __tablename__ = "usage_records"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    metric = Column(String(50), nullable=False)  # "analyses", "ai_messages", "documents", "deals"
    period_start = Column(DateTime, nullable=False)
    count = Column(Integer, nullable=False, default=1, server_default="1")

    user = relationship("User", back_populates="usage_records")
```

**Hot query index** (created in migration):
```sql
CREATE INDEX ix_usage_records_user_metric_period
ON usage_records (user_id, metric, period_start);
```

#### webhook_events

```python
# backend/models/webhook_events.py

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB

from database import Base
from models.base import TimestampMixin


class WebhookEvent(TimestampMixin, Base):
    __tablename__ = "webhook_events"

    stripe_event_id = Column(String, unique=True, nullable=False, index=True)
    event_type = Column(String, nullable=False, index=True)
    payload = Column(JSONB, nullable=False)
    processed = Column(Boolean, nullable=False, default=False, server_default="false")
    processed_at = Column(DateTime, nullable=True)
    error = Column(Text, nullable=True)
    retry_count = Column(Integer, nullable=False, default=0, server_default="0")
```

### 2.3 Index Summary

| Table | Index | Columns | Type | Purpose |
|-------|-------|---------|------|---------|
| users | `ix_users_stripe_customer_id` | `stripe_customer_id` | UNIQUE | Webhook: find user by Stripe customer |
| subscriptions | `ix_subscriptions_user_id` | `user_id` | B-TREE | Find user's subscriptions |
| subscriptions | `ix_subscriptions_stripe_sub_id` | `stripe_subscription_id` | UNIQUE | Webhook: find by Stripe sub ID |
| subscriptions | `ix_subscriptions_one_active` | `user_id` WHERE status IN ('active','trialing','past_due') | PARTIAL UNIQUE | Enforce one active sub per user |
| usage_records | `ix_usage_records_user_metric_period` | `user_id, metric, period_start` | COMPOSITE | Quota check COUNT query |
| webhook_events | `ix_webhook_events_stripe_id` | `stripe_event_id` | UNIQUE | Idempotency check |
| webhook_events | `ix_webhook_events_processed` | `processed` | B-TREE | Find unprocessed events |

### 2.4 Single Alembic Migration

```python
"""add billing infrastructure

Revision ID: bill_001
Revises: <current_head>
Create Date: 2026-03-28
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision: str = "bill_001"
down_revision: Union[str, Sequence[str], None] = None  # Set to current head
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # -- Enums --
    plantier = sa.Enum("free", "starter", "pro", "team", name="plantier")
    plantier.create(op.get_bind(), checkfirst=True)

    substatus = sa.Enum(
        "trialing", "active", "past_due", "canceled",
        "unpaid", "incomplete", "paused",
        name="subscriptionstatus",
    )
    substatus.create(op.get_bind(), checkfirst=True)

    # -- Users: add billing columns --
    op.add_column("users", sa.Column("stripe_customer_id", sa.String(), nullable=True))
    op.add_column("users", sa.Column(
        "plan_tier", plantier, nullable=False, server_default="free",
    ))
    op.add_column("users", sa.Column("trial_ends_at", sa.DateTime(), nullable=True))
    op.create_unique_constraint("uq_users_stripe_customer_id", "users", ["stripe_customer_id"])
    op.create_index("ix_users_stripe_customer_id", "users", ["stripe_customer_id"])

    # -- subscriptions --
    op.create_table(
        "subscriptions",
        sa.Column("id", UUID(as_uuid=True), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("user_id", UUID(as_uuid=True), nullable=False),
        sa.Column("stripe_subscription_id", sa.String(), nullable=True),
        sa.Column("stripe_customer_id", sa.String(), nullable=True),
        sa.Column("status", substatus, nullable=False, server_default="active"),
        sa.Column("plan_tier", sa.String(20), nullable=False, server_default="free"),
        sa.Column("current_period_start", sa.DateTime(), nullable=True),
        sa.Column("current_period_end", sa.DateTime(), nullable=True),
        sa.Column("trial_start", sa.DateTime(), nullable=True),
        sa.Column("trial_end", sa.DateTime(), nullable=True),
        sa.Column("cancel_at_period_end", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("canceled_at", sa.DateTime(), nullable=True),
        sa.Column("cancel_reason", sa.String(), nullable=True),
        sa.Column("ended_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_subscriptions_user_id", "subscriptions", ["user_id"])
    op.create_index("ix_subscriptions_stripe_sub_id", "subscriptions", ["stripe_subscription_id"], unique=True)
    op.create_index("ix_subscriptions_stripe_cust_id", "subscriptions", ["stripe_customer_id"])

    # Partial unique: one active subscription per user
    op.execute("""
        CREATE UNIQUE INDEX ix_subscriptions_one_active
        ON subscriptions (user_id)
        WHERE status IN ('active', 'trialing', 'past_due')
    """)

    # -- usage_records --
    op.create_table(
        "usage_records",
        sa.Column("id", UUID(as_uuid=True), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("user_id", UUID(as_uuid=True), nullable=False),
        sa.Column("metric", sa.String(50), nullable=False),
        sa.Column("period_start", sa.DateTime(), nullable=False),
        sa.Column("count", sa.Integer(), nullable=False, server_default="1"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_usage_records_user_id", "usage_records", ["user_id"])
    op.create_index("ix_usage_records_user_metric_period", "usage_records", ["user_id", "metric", "period_start"])

    # -- webhook_events --
    op.create_table(
        "webhook_events",
        sa.Column("id", UUID(as_uuid=True), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("stripe_event_id", sa.String(), nullable=False),
        sa.Column("event_type", sa.String(), nullable=False),
        sa.Column("payload", JSONB(), nullable=False),
        sa.Column("processed", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("processed_at", sa.DateTime(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("retry_count", sa.Integer(), nullable=False, server_default="0"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_webhook_events_stripe_id", "webhook_events", ["stripe_event_id"], unique=True)
    op.create_index("ix_webhook_events_event_type", "webhook_events", ["event_type"])
    op.create_index("ix_webhook_events_processed", "webhook_events", ["processed"])

    # -- Seed existing users as free tier --
    op.execute("UPDATE users SET plan_tier = 'free' WHERE plan_tier IS NULL")


def downgrade() -> None:
    op.drop_table("webhook_events")
    op.drop_table("usage_records")
    op.execute("DROP INDEX IF EXISTS ix_subscriptions_one_active")
    op.drop_table("subscriptions")
    op.drop_index("ix_users_stripe_customer_id", table_name="users")
    op.drop_constraint("uq_users_stripe_customer_id", "users", type_="unique")
    op.drop_column("users", "trial_ends_at")
    op.drop_column("users", "plan_tier")
    op.drop_column("users", "stripe_customer_id")
    sa.Enum(name="subscriptionstatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="plantier").drop(op.get_bind(), checkfirst=True)
```

### 2.5 Updated models/__init__.py

```python
from models.users import User
from models.teams import Team
from models.team_members import TeamMember
from models.deals import Deal
from models.pipeline_entries import PipelineEntry
from models.documents import Document
from models.chat_messages import ChatMessage
from models.portfolio_entries import PortfolioEntry
from models.password_reset_tokens import PasswordResetToken
from models.subscriptions import Subscription
from models.usage_records import UsageRecord
from models.webhook_events import WebhookEvent

__all__ = [
    "User", "Team", "TeamMember", "Deal", "PipelineEntry", "Document",
    "ChatMessage", "PortfolioEntry", "PasswordResetToken",
    "Subscription", "UsageRecord", "WebhookEvent",
]
```

---

## 3. API Contract

All billing endpoints live in `backend/routers/billing.py` and are mounted at `/api/v1`. The webhook endpoint lives in `backend/routers/webhooks.py` and is mounted at the app root (no prefix).

### 3.1 Pydantic Schemas

```python
# backend/schemas/billing.py

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class PlanTierEnum(str, Enum):
    FREE = "free"
    STARTER = "starter"
    PRO = "pro"
    TEAM = "team"


class IntervalEnum(str, Enum):
    MONTHLY = "monthly"
    ANNUAL = "annual"


# -- Requests --

class CheckoutRequest(BaseModel):
    plan: PlanTierEnum
    interval: IntervalEnum = IntervalEnum.MONTHLY

    @field_validator("plan")
    @classmethod
    def plan_must_be_paid(cls, v: PlanTierEnum) -> PlanTierEnum:
        if v == PlanTierEnum.FREE:
            raise ValueError("Cannot create checkout for the free plan")
        return v


class CancelRequest(BaseModel):
    reason: Optional[str] = Field(None, max_length=500)
    immediate: bool = False


# -- Responses --

class CheckoutResponse(BaseModel):
    checkout_url: str


class PortalResponse(BaseModel):
    portal_url: str


class UsageMetricResponse(BaseModel):
    metric: str
    display_name: str
    current: int
    limit: Optional[int] = None  # None = unlimited
    resets_at: Optional[datetime] = None
    warning: bool = False


class BillingStatusResponse(BaseModel):
    plan: str
    status: Optional[str] = None
    interval: Optional[str] = None
    current_period_end: Optional[datetime] = None
    cancel_at_period_end: bool = False
    trial_ends_at: Optional[datetime] = None
    trial_active: bool = False
    usage: list[UsageMetricResponse]


class CancelResponse(BaseModel):
    status: str
    cancel_at: Optional[datetime] = None
    message: str
```

### 3.2 Endpoints

| Method | Path | Auth | Rate Limit | Request | Response | Purpose |
|--------|------|------|------------|---------|----------|---------|
| `POST` | `/api/v1/billing/checkout` | JWT | 5/min | `CheckoutRequest` | `CheckoutResponse` | Create Stripe Checkout Session |
| `POST` | `/api/v1/billing/portal` | JWT | 5/min | -- | `PortalResponse` | Create Stripe Customer Portal session |
| `POST` | `/api/v1/billing/cancel` | JWT | 3/min | `CancelRequest` | `CancelResponse` | Cancel subscription at period end |
| `GET` | `/api/v1/billing/status` | JWT | 30/min | -- | `BillingStatusResponse` | Current plan, status, usage, trial info |
| `POST` | `/webhooks/stripe` | Stripe sig | 120/min | raw body | `{"status": "ok"}` | Receive Stripe webhook events |

### 3.3 Error Responses

All billing errors follow the existing `{"error": "message", "code": "ERROR_CODE"}` pattern.

| Code | HTTP Status | When |
|------|-------------|------|
| `TIER_REQUIRED` | 402 | Feature requires higher plan |
| `FEATURE_GATED` | 402 | Boolean feature disabled for tier |
| `QUOTA_EXCEEDED` | 402 | Metered limit reached |
| `NO_STRIPE_CUSTOMER` | 400 | User has no Stripe customer (portal) |
| `NO_SUBSCRIPTION` | 400 | No active subscription to cancel |
| `BILLING_ERROR` | 500 | Stripe API failure |
| `WEBHOOK_CONFIG_ERROR` | 500 | Missing webhook secret |
| `INVALID_SIGNATURE` | 400 | Webhook signature verification failed |

---

## 4. Stripe Integration

### 4.1 Configuration

```python
# backend/core/billing/config.py

from __future__ import annotations

import logging
from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings

logger = logging.getLogger(__name__)


class StripeSettings(BaseSettings):
    STRIPE_SECRET_KEY: str
    STRIPE_WEBHOOK_SECRET: str

    # Price IDs -- MVP: Pro only. Starter/Team added later.
    STRIPE_PRICE_PRO_MONTHLY: str = ""
    STRIPE_PRICE_PRO_ANNUAL: str = ""
    STRIPE_PRICE_STARTER_MONTHLY: str = ""
    STRIPE_PRICE_STARTER_ANNUAL: str = ""
    STRIPE_PRICE_TEAM_MONTHLY: str = ""
    STRIPE_PRICE_TEAM_ANNUAL: str = ""

    ENVIRONMENT: str = "development"
    FRONTEND_URL: str = "http://localhost:5173"
    TRIAL_PERIOD_DAYS: int = 14

    model_config = {"env_file": ".env", "extra": "ignore"}

    @field_validator("STRIPE_SECRET_KEY")
    @classmethod
    def _validate_secret_key(cls, v: str) -> str:
        if not v.startswith(("sk_test_", "sk_live_")):
            raise ValueError("STRIPE_SECRET_KEY must start with 'sk_test_' or 'sk_live_'")
        return v

    @field_validator("STRIPE_WEBHOOK_SECRET")
    @classmethod
    def _validate_webhook_secret(cls, v: str) -> str:
        if not v.startswith("whsec_"):
            raise ValueError("STRIPE_WEBHOOK_SECRET must start with 'whsec_'")
        return v

    @property
    def is_live(self) -> bool:
        return self.STRIPE_SECRET_KEY.startswith("sk_live_")

    def get_price_id(self, plan: str, interval: str) -> str:
        key = f"STRIPE_PRICE_{plan.upper()}_{interval.upper()}"
        price_id: str = getattr(self, key, "")
        if not price_id:
            raise ValueError(f"No Stripe Price ID for {plan}/{interval}. Set {key}.")
        return price_id

    @property
    def price_to_plan_map(self) -> dict[str, str]:
        mapping: dict[str, str] = {}
        for plan in ("starter", "pro", "team"):
            for interval in ("monthly", "annual"):
                pid = getattr(self, f"STRIPE_PRICE_{plan.upper()}_{interval.upper()}", "")
                if pid:
                    mapping[pid] = plan
        return mapping


@lru_cache(maxsize=1)
def get_stripe_settings() -> StripeSettings:
    return StripeSettings()  # type: ignore[call-arg]
```

### 4.2 Exception Hierarchy

```python
# backend/core/billing/exceptions.py

class BillingError(Exception):
    def __init__(self, message: str, code: str = "BILLING_ERROR") -> None:
        self.message = message
        self.code = code
        super().__init__(message)

class StripeTransientError(BillingError):
    def __init__(self, message: str) -> None:
        super().__init__(message, code="STRIPE_TRANSIENT")

class StripeCardError(BillingError):
    def __init__(self, message: str, decline_code: str | None = None) -> None:
        self.decline_code = decline_code
        super().__init__(message, code="CARD_DECLINED")

class StripeInvalidRequestError(BillingError):
    def __init__(self, message: str) -> None:
        super().__init__(message, code="STRIPE_INVALID_REQUEST")

class CustomerNotFoundError(BillingError):
    def __init__(self, user_id: str) -> None:
        super().__init__(f"No Stripe customer for user {user_id}", code="NO_STRIPE_CUSTOMER")

class SubscriptionNotFoundError(BillingError):
    def __init__(self, user_id: str) -> None:
        super().__init__(f"No subscription for user {user_id}", code="NO_SUBSCRIPTION")
```

### 4.3 Stripe Service

The service is stateless. Every Stripe SDK call passes `api_key` explicitly (never set globally). Transient failures are retried with exponential backoff (3 attempts, 0.5s/1s/2s).

Key methods:

| Method | Purpose |
|--------|---------|
| `get_or_create_customer(db, user)` | Idempotent customer creation, saves `stripe_customer_id` |
| `create_checkout_session(db, user, plan, interval)` | Returns Stripe Checkout URL |
| `create_portal_session(user)` | Returns Stripe Customer Portal URL |
| `cancel_subscription(db, user, immediately=False)` | Cancel at period end (default) or immediately |

**Checkout Session creation:**
- Uses `client_reference_id=str(user.id)` for reliable user resolution in webhooks
- Sets `subscription_data.metadata.parcel_user_id` and `parcel_plan` for plan resolution
- `allow_promotion_codes=True` for future coupon support
- Success URL: `{FRONTEND_URL}/settings?billing=success&session_id={CHECKOUT_SESSION_ID}`
- Cancel URL: `{FRONTEND_URL}/settings?billing=canceled`

### 4.4 Webhook Handler

```
POST /webhooks/stripe
  1. Validate STRIPE_WEBHOOK_SECRET is configured (500 if not)
  2. Read raw body bytes (MUST be raw, not re-serialized)
  3. Verify stripe-signature header via stripe.Webhook.construct_event()
  4. Extract event_id, event_type, data_object
  5. Check idempotency: query webhook_events for existing stripe_event_id
  6. Store raw event in webhook_events (processed=false)
  7. Dispatch to handler (try/except -- errors logged, not re-raised)
  8. Mark processed=true on success, increment retry_count on failure
  9. ALWAYS return 200 (prevents Stripe retry storms for app bugs)
```

**Handled events (MVP):**

| Event | Handler Action |
|-------|---------------|
| `checkout.session.completed` | Link Stripe customer to user, create/update Subscription row, set `user.plan_tier` |
| `customer.subscription.updated` | Fetch latest state from Stripe, update Subscription row, update `user.plan_tier` |
| `customer.subscription.deleted` | Set Subscription status to `canceled`, set `user.plan_tier = "free"` |
| `invoice.payment_failed` | Set Subscription status to `past_due` |

**Concurrency safety:** Each handler acquires a PostgreSQL advisory lock keyed on a deterministic hash of user_id (`int(hashlib.sha256(user_id.encode()).hexdigest(), 16) % (2**31 - 1)`) before modifying user/subscription state. This prevents race conditions when multiple events for the same user arrive simultaneously.

**Fetch-on-receive:** Handlers fetch the canonical subscription state from Stripe via `stripe.Subscription.retrieve()` instead of trusting the event payload. This eliminates event ordering issues.

---

## 5. Feature Gating

### 5.1 Tier Hierarchy and Limits (Authoritative Table)

```python
# backend/core/billing/tier_config.py

from dataclasses import dataclass
from enum import IntEnum
from typing import Optional


class Tier(IntEnum):
    FREE = 0
    STARTER = 1
    PRO = 2
    TEAM = 3

    @classmethod
    def from_str(cls, value: str) -> "Tier":
        try:
            return cls[value.upper()]
        except (KeyError, AttributeError):
            return cls.FREE


@dataclass(frozen=True)
class TierLimits:
    analyses_per_month: Optional[int]
    saved_deals: Optional[int]
    ai_messages_per_month: Optional[int]
    document_uploads_per_month: Optional[int]
    ai_chat_enabled: bool
    pdf_export: bool
    pipeline_enabled: bool
    portfolio_enabled: bool
    offer_letter: bool
    compare_deals: bool
    team_seats: Optional[int]
```

| Feature | Free | Starter ($29) | Pro ($69) | Team ($149) |
|---------|------|---------------|-----------|-------------|
| `analyses_per_month` | 3 | 25 | None (unlimited) | None |
| `saved_deals` | 5 | 50 | None | None |
| `ai_messages_per_month` | 0 | 30 | 150 | 500 |
| `document_uploads_per_month` | 0 | 5 | 25 | None |
| `ai_chat_enabled` | False | True | True | True |
| `pdf_export` | False | True | True | True |
| `pipeline_enabled` | False | True | True | True |
| `portfolio_enabled` | False | False | True | True |
| `offer_letter` | False | False | True | True |
| `compare_deals` | False | False | True | True |
| `team_seats` | None | None | None | 5 |

**MVP enforcement:** Only Free and Pro limits are actively enforced. Starter is defined but users cannot purchase it yet (no Stripe Price ID configured). Team is deferred.

**Trial users:** Feature gating checks `trial_ends_at`. If `user.trial_ends_at > now AND user.plan_tier == "free" AND no active subscription`, the user is treated as `Tier.PRO` for gating purposes.

**Demo users:** `is_demo_user(user)` returns True -> treated as `Tier.PRO`. Billing endpoints (`/billing/*`) reject demo users with 403.

### 5.2 Gate Dependencies (FastAPI)

Three gate types, all implemented as FastAPI `Depends()`:

```python
# Usage in routers:

# Hard tier gate
@router.post("/portfolio/")
async def add_portfolio_entry(
    ...,
    _gate: None = Depends(require_tier(Tier.PRO)),
):

# Boolean feature gate
@router.post("/chat/")
async def chat(
    ...,
    _gate: None = Depends(require_feature("ai_chat_enabled")),
):

# Metered quota gate
@router.post("/deals/")
async def create_deal(
    ...,
    _gate: None = Depends(require_quota("analyses_per_month")),
):
```

All gates raise `HTTPException(402)` with structured body matching the `TIER_REQUIRED`, `FEATURE_GATED`, or `QUOTA_EXCEEDED` error codes.

### 5.3 Usage Tracking

One table (`usage_records`), one pattern. Usage is recorded AFTER the business action succeeds, within the same DB transaction.

```python
def record_usage(user_id: UUID, metric: str, period_start: datetime, db: Session) -> None:
    db.add(UsageRecord(user_id=user_id, metric=metric, period_start=period_start))
    # Do NOT commit here -- caller's transaction handles it
```

Counting:
```python
def get_usage_count(user_id: UUID, metric: str, period_start: datetime, db: Session) -> int:
    from models.usage_records import UsageRecord
    return (
        db.query(UsageRecord)
        .filter(
            UsageRecord.user_id == user_id,
            UsageRecord.metric == metric,
            UsageRecord.period_start >= period_start,
        )
        .count()
    ) or 0
```

**Billing period:** If user has an active subscription, use `subscription.current_period_start`. Otherwise, fall back to 1st of current month UTC.

**Metrics tracked:** `"analyses"`, `"ai_messages"`, `"documents"`, `"deals"` (for saved_deals, counts all non-deleted deals, not per-period).

---

## 6. Frontend Architecture

### 6.1 TypeScript Types

```typescript
// frontend/src/types/billing.ts

export type PlanTier = 'free' | 'starter' | 'pro' | 'team'
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'unpaid'
export type BillingCycle = 'monthly' | 'annual'

export const PLAN_RANK: Record<PlanTier, number> = { free: 0, starter: 1, pro: 2, team: 3 }

export function hasAccess(current: PlanTier, required: PlanTier): boolean {
  return PLAN_RANK[current] >= PLAN_RANK[required]
}

export interface UsageMetric {
  metric: string
  display_name: string
  current: number
  limit: number | null   // null = unlimited
  resets_at: string | null
  warning: boolean
}

export interface BillingStatus {
  plan: PlanTier
  status: SubscriptionStatus | null
  interval: BillingCycle | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  trial_ends_at: string | null
  trial_active: boolean
  usage: UsageMetric[]
}

export interface CheckoutRequest {
  plan: 'starter' | 'pro' | 'team'
  interval: BillingCycle
}

export interface CheckoutResponse {
  checkout_url: string
}

export interface PortalResponse {
  portal_url: string
}

export type GatedFeature =
  | 'ai_chat' | 'pdf_export' | 'pipeline' | 'portfolio'
  | 'offer_letter' | 'compare_deals' | 'document_upload'

export const FEATURE_LABELS: Record<GatedFeature, { label: string; tier: PlanTier; description: string }> = {
  ai_chat:         { label: 'AI Deal Chat',          tier: 'pro', description: 'Ask AI questions about your deals' },
  pdf_export:      { label: 'PDF Reports',           tier: 'pro', description: 'Download branded PDF deal reports' },
  pipeline:        { label: 'Deal Pipeline',         tier: 'pro', description: 'Organize deals across pipeline stages' },
  portfolio:       { label: 'Portfolio Tracking',     tier: 'pro', description: 'Track closed deals and cash flow' },
  offer_letter:    { label: 'Offer Letter Generator', tier: 'pro', description: 'Generate professional offer letters' },
  compare_deals:   { label: 'Deal Comparison',       tier: 'pro', description: 'Compare deals side-by-side' },
  document_upload: { label: 'Document AI',           tier: 'pro', description: 'Upload and analyze deal documents' },
}
```

### 6.2 Extend User Type

Add to the existing `User` interface in `frontend/src/types/index.ts`:

```typescript
export interface User {
  // ... existing fields ...
  plan_tier: PlanTier
  trial_ends_at: string | null
}
```

### 6.3 TanStack Query Hooks

```typescript
// frontend/src/hooks/useBilling.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { BillingStatus, CheckoutRequest, CheckoutResponse, PortalResponse } from '@/types/billing'

export function useBillingStatus() {
  return useQuery<BillingStatus>({
    queryKey: ['billing', 'status'],
    queryFn: () => api.get<BillingStatus>('/api/v1/billing/status'),
    staleTime: 60_000,       // 1 minute
    refetchOnWindowFocus: true,
  })
}

export function useCheckout() {
  return useMutation<CheckoutResponse, Error, CheckoutRequest>({
    mutationFn: (req) => api.post<CheckoutResponse>('/api/v1/billing/checkout', req),
    onSuccess: (data) => {
      window.location.href = data.checkout_url
    },
  })
}

export function usePortal() {
  return useMutation<PortalResponse, Error, void>({
    mutationFn: () => api.post<PortalResponse>('/api/v1/billing/portal'),
    onSuccess: (data) => {
      window.location.href = data.portal_url
    },
  })
}

export function useCancelSubscription() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (req: { reason?: string; immediate?: boolean }) =>
      api.post('/api/v1/billing/cancel', req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing'] })
      qc.invalidateQueries({ queryKey: ['me'] })
    },
  })
}
```

### 6.4 Component Hierarchy

```
AppShell
├── Sidebar
│   ├── PlanBadge (shows "Free", "Pro", or "Trial: X days left")
│   └── TrialBanner (amber/red countdown when trial_ends_at approaching)
│
├── PricingPage (/pricing)
│   ├── BillingCycleToggle (monthly/annual switch, default annual)
│   ├── PricingCard (Free) -- "Current plan" or "Downgrade"
│   ├── PricingCard (Pro) -- "Most popular" badge, indigo glow
│   └── PricingCard (Team) -- "Coming Soon" badge
│
├── BillingSettings (/settings, billing tab)
│   ├── CurrentPlanCard (plan name, status, period end)
│   ├── UsageMeters (progress bars for each metered resource)
│   ├── ManageButton -> Stripe Customer Portal
│   └── CancelButton -> CancelModal
│
├── PaywallOverlay (rendered by FeatureGate wrapper)
│   ├── Feature icon + description
│   ├── "Upgrade to Pro" primary CTA
│   └── "Compare plans" link to /pricing
│
└── SuccessOverlay (shown when ?billing=success detected)
    ├── Confetti animation (canvas)
    ├── "Welcome to Pro!" heading
    └── Feature list of what's now unlocked
```

### 6.5 Route Guards

The `FeatureGate` component wraps any route or component that requires a specific tier:

```typescript
// frontend/src/components/billing/FeatureGate.tsx

interface FeatureGateProps {
  feature: GatedFeature
  children: React.ReactNode
  fallback?: React.ReactNode  // defaults to PaywallOverlay
}
```

When the user's `plan_tier` does not meet the required tier for the feature, `FeatureGate` renders `PaywallOverlay` instead of `children`. Session-scoped dismissal: each paywall modal is shown max once per feature per session.

### 6.6 402 Error Handling in api.ts

Add to the existing `request()` function in `frontend/src/lib/api.ts`:

```typescript
if (res.status === 402) {
  const error = await res.json()
  // Dispatch to billing store so PaywallOverlay can react
  useBillingStore.getState().setPaywallError(error)
  throw new PaywallError(error)
}
```

---

## 7. Trial & Billing Lifecycle

### 7.1 Trial State Machine

```
Registration
    │
    ▼
Set user.plan_tier = "free"
Set user.trial_ends_at = now + 14 days
Create Stripe Customer (best-effort, lazy fallback at checkout)
    │
    ▼
TRIAL ACTIVE (days 0-10)
  • Feature gating treats user as Pro
  • Sidebar shows "Pro Trial: X days left" (muted)
    │
    ▼ (day 11+)
TRIAL EXPIRING (days 11-14)
  • Sidebar shows amber/red countdown
  • Upgrade CTA becomes prominent
    │
    ├── User upgrades ──► CONVERTED (plan_tier set by webhook)
    │
    ▼ (day 14)
TRIAL EXPIRED
  • Feature gating treats user as Free
  • plan_tier remains "free" (it was never changed)
  • trial_ends_at is now in the past
  • Paywalls appear on gated features
    │
    ├── User upgrades later ──► CONVERTED
    │
    ▼
FREE USER (permanent until they subscribe)
```

**No cron job needed.** Trial expiration is computed at request time:

```python
def get_effective_tier(user: User) -> Tier:
    """Determine the user's effective tier including trial status."""
    if is_demo_user(user):
        return Tier.PRO

    tier = Tier.from_str(user.plan_tier)

    # Active trial upgrades free users to Pro
    if tier == Tier.FREE and user.trial_ends_at:
        if user.trial_ends_at > datetime.utcnow():
            return Tier.PRO

    return tier
```

### 7.2 Subscription State Machine

```
CHECKOUT COMPLETED
    │
    ▼
  active ◄────────────┐
    │                  │
    │ payment fails    │ retry succeeds
    ▼                  │
  past_due ────────────┘
    │
    │ all retries fail
    ▼
  unpaid ──► user.plan_tier = "free"
    │
    │ user re-subscribes
    ▼
  (new subscription via checkout)

  active/past_due
    │
    │ user cancels
    ▼
  canceled (cancel_at_period_end = true)
    │
    │ period ends (webhook: subscription.deleted)
    ▼
  user.plan_tier = "free"
```

### 7.3 Dunning (MVP)

MVP dunning is minimal. Stripe handles retries.

1. Enable **Stripe Smart Retries** in Dashboard (zero code)
2. Enable **Automatic Card Updater** in Dashboard
3. On `invoice.payment_failed` webhook: set subscription `status = "past_due"`
4. Frontend: show yellow banner when `status == "past_due"` with "Update payment method" linking to Stripe Portal
5. On `customer.subscription.deleted` (after all retries fail): set `user.plan_tier = "free"`

Custom dunning emails, grace periods, and restricted access phases are deferred.

---

## 8. Email System

### 8.1 MVP Emails

Using Resend (already in `requirements.txt`). Sent via FastAPI `BackgroundTasks` -- no queue system.

| Email | Trigger | From | When |
|-------|---------|------|------|
| Welcome | Registration | `Ivan from Parcel <ivan@parceldesk.io>` | Immediate |
| Trial ending | `trial_ends_at - 3 days` | `Ivan from Parcel <ivan@parceldesk.io>` | Daily check or webhook |
| Trial expired | `trial_ends_at` passed | `Ivan from Parcel <ivan@parceldesk.io>` | Daily check |
| Payment success | `invoice.paid` webhook | `Parcel <billing@parceldesk.io>` | Immediate |
| Payment failed | `invoice.payment_failed` webhook | `Parcel <billing@parceldesk.io>` | Immediate |
| Subscription canceled | User confirms cancel | `Parcel <billing@parceldesk.io>` | Immediate |
| Plan upgraded | `checkout.session.completed` webhook | `Parcel <billing@parceldesk.io>` | Immediate |

### 8.2 Trial Email Trigger

No cron job. Two approaches, pick one:

**Option A (recommended for MVP):** Check `trial_ends_at` in the `/auth/me` response. The frontend shows the trial banner. For the "3 days left" email, add a flag `trial_warning_email_sent` (boolean) to User. On each `/auth/me` call, if `trial_ends_at - now <= 3 days AND not trial_warning_email_sent`, send the email and flip the flag. This piggybacks on natural user activity.

**Option B:** External cron hitting `POST /internal/cron/trial-emails` (protected by `INTERNAL_CRON_SECRET` header). Daily at midnight UTC, query users where `trial_ends_at BETWEEN now AND now + 3 days` and send emails. Use when Option A misses inactive users.

### 8.3 Email Service

```python
# backend/services/email_service.py

import logging
import os

import resend

logger = logging.getLogger(__name__)

_RESEND_READY = False

def _ensure_resend() -> bool:
    global _RESEND_READY
    if _RESEND_READY:
        return True
    api_key = os.getenv("RESEND_API_KEY", "")
    if not api_key:
        logger.warning("RESEND_API_KEY not set -- email disabled")
        return False
    resend.api_key = api_key
    _RESEND_READY = True
    return True

def send_email(to: str, subject: str, html: str, from_addr: str | None = None) -> bool:
    if not _ensure_resend():
        return False
    try:
        resend.Emails.send({
            "from": from_addr or "Ivan from Parcel <ivan@parceldesk.io>",
            "to": [to],
            "subject": subject,
            "html": html,
        })
        return True
    except Exception as e:
        logger.error("Email send failed: %s", e)
        return False
```

---

## 9. Team Features (DEFERRED)

Per Agent 19's recommendation, Team features are deferred until Pro has validated market demand (target: 5+ users requesting team features).

**What ships now:**
- Team tier appears on the pricing page as "Coming Soon" with features listed
- The `PlanTier` enum includes `"team"` for forward compatibility
- The `TierLimits` config includes Team limits
- No Stripe Price ID configured for Team (checkout will error if somehow triggered)

**Design preserved for future:**
- Team model gets billing columns (`stripe_customer_id`, `stripe_subscription_id`, `plan`, `seat_limit`)
- Invitation system with SHA-256 hashed tokens
- RBAC: `owner`, `admin`, `member` roles on TeamMember
- Shared AI message pool across team members
- Custom branding (logo, company name, primary color)
- Team is the billing entity (Stripe customer lives on Team, not User)

**Migration approach when ready:**
1. Add billing columns to existing `teams` table
2. Add `team_invitations` table
3. Create Team Stripe Products/Prices
4. Build invitation flow and RBAC middleware
5. Estimated effort: 3-5 days

---

## 10. Testing Plan

### 10.1 Backend Tests

All billing tests in `backend/tests/test_billing.py`. Stripe SDK is mocked at the module boundary.

**Test categories:**

| Category | Tests | What's Tested |
|----------|-------|---------------|
| Stripe service | 6 | Customer creation, checkout session, portal session, cancel, retry logic, error wrapping |
| Webhook handler | 8 | Signature verification, idempotency, checkout.completed provisioning, subscription.updated state changes, subscription.deleted downgrade, payment_failed, duplicate rejection, missing signature |
| Feature gating | 10 | `require_tier` blocks/allows, `require_feature` blocks/allows, `require_quota` blocks at limit, trial user gets Pro access, demo user bypasses, expired trial gets Free |
| Billing endpoints | 6 | POST checkout (success + free plan rejection), POST portal (no customer error), POST cancel (success + no subscription error), GET status (free user, pro user, trial user) |
| Usage tracking | 4 | Record usage, count usage by period, quota enforcement, concurrent usage race condition |

**Fixtures:**

```python
@pytest.fixture
def free_user(db):
    """User on free tier with no trial."""
    user = User(name="Free", email="free@test.com", password_hash="...", plan_tier="free")
    db.add(user); db.commit(); db.refresh(user)
    return user

@pytest.fixture
def trial_user(db):
    """User on free tier with active 14-day trial."""
    user = User(
        name="Trial", email="trial@test.com", password_hash="...",
        plan_tier="free", trial_ends_at=datetime.utcnow() + timedelta(days=10),
    )
    db.add(user); db.commit(); db.refresh(user)
    return user

@pytest.fixture
def pro_user(db):
    """Paying Pro user with active subscription."""
    user = User(
        name="Pro", email="pro@test.com", password_hash="...",
        plan_tier="pro", stripe_customer_id="cus_test_pro",
    )
    db.add(user); db.commit(); db.refresh(user)
    sub = Subscription(
        user_id=user.id, stripe_subscription_id="sub_test_pro",
        stripe_customer_id="cus_test_pro", status="active", plan_tier="pro",
        current_period_start=datetime.utcnow(),
        current_period_end=datetime.utcnow() + timedelta(days=30),
    )
    db.add(sub); db.commit()
    return user
```

### 10.2 Stripe Test Mode Validation

Before going live, manually test these flows with Stripe test cards:

| Test | Card | Expected |
|------|------|----------|
| Successful checkout | `4242 4242 4242 4242` | Subscription active, user.plan_tier = "pro" |
| Declined card | `4000 0000 0000 0002` | Checkout fails gracefully, user stays free |
| 3D Secure required | `4000 0025 0000 3155` | User completes 3DS, subscription activates |
| Cancel at period end | -- | Subscription stays active until period_end, then deleted |
| Payment failure + retry | `4000 0000 0000 0341` | invoice.payment_failed fires, status -> past_due |

### 10.3 Frontend Tests (Vitest)

- `PlanBadge` renders correct label for each tier
- `TrialBanner` shows countdown, hidden when trial expired, hidden for paid users
- `PaywallOverlay` renders feature name and upgrade CTA
- `FeatureGate` renders children for Pro users, overlay for Free users
- `useBillingStatus` hook fetches and caches correctly
- 402 error handling dispatches to billing store

---

## 11. Rollout Plan

### Phase 0: Pre-Launch Setup (Day 0)

1. Create Stripe account, complete business verification, stay in TEST MODE
2. Create Pro product + monthly/annual prices via `stripe_setup.py` script
3. Set environment variables on Railway (test keys): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_PRO_ANNUAL`
4. Register webhook endpoint in Stripe Dashboard: `https://api.parceldesk.io/webhooks/stripe`
5. Set `VITE_STRIPE_PUBLISHABLE_KEY` on Vercel (test key)
6. For local dev: `stripe listen --forward-to localhost:8000/webhooks/stripe`
7. Add `stripe` to `backend/requirements.txt`

### Phase 1: Backend Billing (Days 1-4)

- Deploy migration (new tables + user columns)
- Deploy billing config, exceptions, Stripe service
- Deploy webhook router (mounted at `/webhooks/stripe`)
- Deploy billing router (mounted at `/api/v1/billing/*`)
- Deploy feature gating middleware
- Modify `/auth/register` to set `trial_ends_at = now + 14 days`
- Modify `/auth/me` response to include `plan_tier` and `trial_ends_at`
- Gate existing endpoints: chat (ai_chat_enabled), pipeline (pipeline_enabled), portfolio (require_tier PRO), documents (document_uploads_per_month), PDF export (pdf_export), offer letter (offer_letter)
- Run Stripe CLI webhook tests locally

### Phase 2: Frontend Billing (Days 5-8)

- Add billing types to `frontend/src/types/billing.ts`
- Add `plan_tier` and `trial_ends_at` to User type
- Build `useBilling.ts` hooks
- Build PricingPage (Free/Pro, monthly/annual toggle)
- Build PaywallOverlay component
- Build FeatureGate wrapper
- Build PlanBadge for sidebar
- Build TrialBanner for sidebar
- Build BillingSettings tab in Settings page
- Build SuccessOverlay for post-checkout
- Handle `?billing=success` and `?billing=canceled` query params
- Handle 402 errors in api.ts
- Add `/pricing` route to App.tsx

### Phase 3: Integration Testing (Days 9-10)

- Full end-to-end test with Stripe test cards
- Test: register -> trial active -> features unlocked -> upgrade -> checkout -> webhook -> features persist
- Test: trial expiration -> features locked -> upgrade -> features unlocked
- Test: cancel -> keep access until period end -> downgrade to free
- Test: payment failure -> past_due banner -> update via portal -> recovered
- Test: demo account cannot access billing endpoints
- Test: concurrent webhook handling (advisory locks)
- Write pytest test suite for all billing code

### Phase 4: Soft Launch (Days 11-12)

- Switch to Stripe LIVE mode: create live products/prices, update env vars
- Use an environment variable `BILLING_ENABLED=true` (simple, no feature flag table)
- Test with Ivan's account using a real card
- Invite 2-3 beta testers
- Monitor webhook_events table for errors
- Monitor Railway logs for billing errors
- Verify Stripe Dashboard shows customers, subscriptions, invoices correctly

### Phase 5: General Availability

- Remove `BILLING_ENABLED` check (or set to true for all)
- All new registrations get 14-day Pro trial
- Existing free users see upgrade prompts
- Monitor: conversion rate, trial-to-paid, churn, webhook error rate

### Rollback Plan

If critical billing bug in production:
1. Set `BILLING_ENABLED=false` in Railway env vars (instant, no deploy)
2. All feature gates fall back to free-tier behavior
3. Existing paid subscribers retain access (their `plan_tier` is already set in DB)
4. New checkouts are disabled
5. Fix the bug, re-enable

---

## 12. Implementation Order

This is the exact sequence of tasks. Each numbered item is one Claude Code prompt or focused work session.

### Sprint 1: Backend Foundation (Days 1-3)

| # | Task | Depends On | Est. |
|---|------|-----------|------|
| 1 | Add `stripe` to `backend/requirements.txt` | -- | 5 min |
| 2 | Create `backend/core/billing/__init__.py`, `config.py`, `exceptions.py` | 1 | 1 hr |
| 3 | Create `backend/core/billing/tier_config.py` (Tier enum, TierLimits, TIER_LIMITS) | -- | 1 hr |
| 4 | Create `backend/models/subscriptions.py`, `usage_records.py`, `webhook_events.py` | -- | 1 hr |
| 5 | Update `backend/models/__init__.py` to export new models | 4 | 10 min |
| 6 | Create Alembic migration `bill_001` (add columns to users, create 3 new tables) | 4 | 1 hr |
| 7 | Run migration locally, verify tables created | 6 | 15 min |
| 8 | Add `stripe_customer_id`, `plan_tier`, `trial_ends_at` columns to User model | -- | 30 min |
| 9 | Add new relationships to User model (`subscriptions`, `usage_records`) | 4, 8 | 15 min |
| 10 | Create `backend/core/billing/stripe_service.py` (StripeService class) | 2 | 2 hr |
| 11 | Create `backend/core/billing/tier_gate.py` (require_tier, require_feature, require_quota) | 3 | 2 hr |
| 12 | Create `backend/schemas/billing.py` (Pydantic models) | -- | 1 hr |

### Sprint 2: Backend Routes (Days 3-5)

| # | Task | Depends On | Est. |
|---|------|-----------|------|
| 13 | Create `backend/routers/webhooks.py` (webhook receiver + handlers) | 10, 4 | 3 hr |
| 14 | Create `backend/routers/billing.py` (checkout, portal, cancel, status) | 10, 12 | 2 hr |
| 15 | Mount webhook router in `main.py` (no prefix) | 13 | 10 min |
| 16 | Mount billing router in `main.py` (under `/api/v1`) | 14 | 10 min |
| 17 | Modify `/auth/register` to set `trial_ends_at` | 8 | 30 min |
| 18 | Modify `/auth/me` response to include `plan_tier`, `trial_ends_at` | 8, 12 | 30 min |
| 19 | Add feature gates to existing endpoints (chat, pipeline, portfolio, documents, PDF, offer letter) | 11 | 2 hr |
| 20 | Add usage tracking calls to gated endpoints (record_usage after success) | 11 | 1 hr |
| 21 | Protect billing endpoints from demo user access | 14 | 30 min |
| 22 | Create `backend/scripts/stripe_setup.py` (create products/prices in Stripe) | 2 | 1 hr |

### Sprint 3: Frontend (Days 5-8)

| # | Task | Depends On | Est. |
|---|------|-----------|------|
| 23 | Create `frontend/src/types/billing.ts` | -- | 1 hr |
| 24 | Add `plan_tier`, `trial_ends_at` to User type in `types/index.ts` | -- | 15 min |
| 25 | Create `frontend/src/hooks/useBilling.ts` (TanStack Query hooks) | 23 | 1 hr |
| 26 | Create `frontend/src/components/billing/PlanBadge.tsx` | 24 | 1 hr |
| 27 | Create `frontend/src/components/billing/TrialBanner.tsx` | 24, 25 | 1.5 hr |
| 28 | Create `frontend/src/components/billing/PaywallOverlay.tsx` | 23 | 2 hr |
| 29 | Create `frontend/src/components/billing/FeatureGate.tsx` | 28 | 1 hr |
| 30 | Create `frontend/src/pages/PricingPage.tsx` (Free/Pro cards, monthly/annual toggle) | 23, 25 | 3 hr |
| 31 | Create `frontend/src/pages/settings/BillingSettings.tsx` (current plan, usage, manage, cancel) | 25 | 3 hr |
| 32 | Add SuccessOverlay component for post-checkout celebration | -- | 1 hr |
| 33 | Handle `?billing=success` and `?billing=canceled` in Settings page | 32 | 30 min |
| 34 | Add 402 error handling to `api.ts` | 28 | 30 min |
| 35 | Integrate PlanBadge into AppShell sidebar | 26 | 30 min |
| 36 | Integrate TrialBanner into AppShell sidebar | 27 | 30 min |
| 37 | Wrap gated pages/components with FeatureGate | 29 | 2 hr |
| 38 | Add `/pricing` route to App.tsx | 30 | 15 min |

### Sprint 4: Testing & Launch (Days 9-12)

| # | Task | Depends On | Est. |
|---|------|-----------|------|
| 39 | Write backend billing tests (`test_billing.py`) | 13, 14, 11 | 3 hr |
| 40 | Run full test suite, fix any regressions | 39 | 1 hr |
| 41 | Create Stripe test-mode products/prices using `stripe_setup.py` | 22 | 30 min |
| 42 | Set Railway env vars (test mode) | 41 | 15 min |
| 43 | Register webhook endpoint in Stripe Dashboard | 42 | 15 min |
| 44 | Deploy backend to Railway (staging or production with test keys) | 42, 43 | 30 min |
| 45 | Set Vercel env vars | -- | 15 min |
| 46 | Deploy frontend to Vercel | 45 | 15 min |
| 47 | End-to-end testing: register, trial, upgrade, cancel, payment failure | 44, 46 | 3 hr |
| 48 | Switch to Stripe LIVE mode: create live products, update env vars | 47 | 1 hr |
| 49 | Test with real card (Ivan's account) | 48 | 30 min |
| 50 | General availability | 49 | -- |

---

## 13. Deferred Features

| Feature | Why Deferred | When to Build | Design Notes |
|---------|-------------|---------------|--------------|
| **Starter tier** | MVP validates Pro demand first. Starter exists as pricing anchor only. | When Pro conversion < 15% and data shows price sensitivity. | Already in enum and tier config. Just needs Stripe Price IDs and frontend card. |
| **Team tier + RBAC** | 2-3 weeks of work for a feature ~5% of users need. | When 5+ users request team features. | Full design in Agent 14. Billing entity shifts to Team model. |
| **Onboarding wizard** | Can be added after measuring activation drop-off. | When registration-to-first-analysis completion < 60%. | Full design in Agent 09. |
| **Custom dunning emails** | Stripe Smart Retries + built-in emails handle this at launch. | At 200+ subscribers with measurable involuntary churn. | Full design in Agent 11. |
| **Cancellation save offers** | No churn data to optimize against. | After 20+ cancellations with reason data. | Full design in Agent 10. |
| **Subscription pause** | Nice-to-have retention tool. | When "temporary project ended" is a top cancellation reason. | Stripe supports natively via `pause_collection`. |
| **Invoice history page** | Stripe Customer Portal shows this. | When users complain about the redirect. | Just needs a `GET /billing/invoices` endpoint + frontend table. |
| **A/B testing** | Statistically meaningless below 3,000 users per variant. | At 5,000+ active users. | No infrastructure needed -- hardcode everything. |
| **Cost anomaly detection** | Manual monitoring via Anthropic Dashboard suffices. | At 500+ users with AI usage. | Full design in Agent 12 Section 8. |
| **Referral system** | Growth feature, not billing. | When organic growth plateaus. | Use Stripe coupon codes. |
| **Email queue** | FastAPI BackgroundTasks suffices at current volumes. | At 1,000+ emails/day. | Full design in Agent 13 Section 8. |
| **subscription_plans DB table** | Hardcoded config is simpler for 2 plans. | When adding dynamic pricing, A/B price testing, or 5+ plans. | Full design in Agent 01. |
| **payment_methods table** | Stripe Customer Portal handles payment method management. | When building a custom billing page with inline card display. | Full design in Agent 01 Section 3.6. |
| **Annual <-> Monthly switching** | Handle via Stripe Customer Portal. | When users request in-app billing interval changes. | Proration logic in Agent 07. |

---

## 14. Open Questions

| # | Question | Recommended Default | Impact |
|---|----------|-------------------|--------|
| 1 | **Trial duration:** 14 days or 7 days? | 14 days. Industry standard for SaaS. Longer trial = higher activation. | Sets `trial_ends_at` offset at registration. |
| 2 | **Pro price:** $69/mo or $49/mo? | Start at $69/mo. Can always drop price; raising it alienates early adopters. | Sets Stripe Price. Can change without code changes. |
| 3 | **Annual discount:** 20% off or "2 months free" (17%)? | 20% for Pro ($55/mo annual). Crosses the $60 psychological threshold. | Sets Stripe annual Price. |
| 4 | **Free tier AI:** 0 messages or 5 messages? | 0 messages. AI is the main upsell driver. Teasing 5 messages reduces urgency. | Sets `ai_messages_per_month` in `TIER_LIMITS[Tier.FREE]`. |
| 5 | **Existing users:** Start everyone on trial or grandfather as free? | Grandfather as free (no trial). Trial is for new signups only. Existing users see upgrade prompts. | Migration sets all existing `plan_tier = "free"`, `trial_ends_at = NULL`. |
| 6 | **Webhook endpoint:** `POST /webhooks/stripe` or `POST /api/v1/billing/webhook`? | `POST /webhooks/stripe` (no API prefix). Cleaner, matches Stripe convention. | Must match Stripe Dashboard webhook URL exactly. |
| 7 | **Cron for trial emails:** Piggyback on `/auth/me` calls or external cron? | Piggyback on `/auth/me` for MVP. Add external cron later if inactive users are missed. | Determines if we need Railway cron service ($5/mo). |
| 8 | **Demo account billing:** Hard-block all billing endpoints? | Yes. Demo user gets 403 on all `/billing/*` endpoints. | Add `if is_demo_user(user): raise 403` check in billing router. |

---

## Appendix: New Dependencies

Add to `backend/requirements.txt`:

```
stripe>=8.0.0
```

No other new dependencies needed for MVP. `resend` is already installed. `python-slugify` is deferred with Team features.

## Appendix: Environment Variables

### Backend (Railway)

```bash
# Stripe (REQUIRED for billing)
STRIPE_SECRET_KEY=sk_test_...          # or sk_live_... in production
STRIPE_WEBHOOK_SECRET=whsec_...        # from Stripe Dashboard or CLI
STRIPE_PRICE_PRO_MONTHLY=price_...     # Pro monthly price ID
STRIPE_PRICE_PRO_ANNUAL=price_...      # Pro annual price ID

# Optional (for future tiers)
STRIPE_PRICE_STARTER_MONTHLY=
STRIPE_PRICE_STARTER_ANNUAL=
STRIPE_PRICE_TEAM_MONTHLY=
STRIPE_PRICE_TEAM_ANNUAL=

# Existing (already configured)
ENVIRONMENT=production
FRONTEND_URL=https://parceldesk.io
RESEND_API_KEY=re_...
```

### Frontend (Vercel)

```bash
# No Stripe keys needed on frontend!
# Checkout redirects to Stripe's hosted page.
# No @stripe/stripe-js dependency needed.
```

## Appendix: File Tree (New Files)

```
backend/
├── core/
│   └── billing/
│       ├── __init__.py
│       ├── config.py          # StripeSettings
│       ├── exceptions.py      # BillingError hierarchy
│       ├── stripe_service.py  # StripeService class
│       ├── tier_config.py     # Tier enum, TierLimits, TIER_LIMITS
│       └── tier_gate.py       # require_tier, require_feature, require_quota
├── models/
│   ├── subscriptions.py       # Subscription model
│   ├── usage_records.py       # UsageRecord model
│   └── webhook_events.py      # WebhookEvent model
├── routers/
│   ├── billing.py             # /billing/* endpoints
│   └── webhooks.py            # /webhooks/stripe endpoint
├── schemas/
│   └── billing.py             # Pydantic request/response models
├── scripts/
│   └── stripe_setup.py        # One-time Stripe product/price creation
└── services/
    └── email_service.py       # Resend email wrapper

frontend/src/
├── types/
│   └── billing.ts             # Billing TypeScript types
├── hooks/
│   └── useBilling.ts          # TanStack Query billing hooks
├── components/
│   └── billing/
│       ├── PlanBadge.tsx       # Sidebar plan indicator
│       ├── TrialBanner.tsx     # Trial countdown
│       ├── PaywallOverlay.tsx  # Feature gate modal
│       ├── FeatureGate.tsx     # Wrapper component
│       └── SuccessOverlay.tsx  # Post-checkout celebration
└── pages/
    ├── PricingPage.tsx         # /pricing route
    └── settings/
        └── BillingSettings.tsx # Settings billing tab
```
