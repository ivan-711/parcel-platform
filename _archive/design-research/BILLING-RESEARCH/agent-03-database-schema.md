# Agent 03 — Database Schema Design for Billing & Subscriptions

> Research document for Parcel billing infrastructure
> Generated: 2026-03-28

---

## 1. Current State of the Database

Parcel's existing schema uses a consistent pattern across all models:

- **Base mixin** (`TimestampMixin`): UUID primary key via `UUID(as_uuid=True)`, `created_at`, `updated_at`
- **Ownership**: `user_id` FK + optional `team_id` FK on user-owned tables
- **Soft deletes**: `deleted_at` nullable DateTime (used on `deals`)
- **JSONB**: Used for flexible calculator inputs/outputs and document metadata
- **Enums**: PostgreSQL-native enums via `sqlalchemy.Enum` (e.g., `userrole`, `dealstrategy`, `pipelinestage`)
- **Alembic**: Linear migration chain, each migration has `upgrade()` + `downgrade()`, uses `op.add_column` / `op.create_table` patterns
- **Engine**: Sync SQLAlchemy 2 with `psycopg2-binary`, `declarative_base()`, `sessionmaker`

Existing tables: `users`, `teams`, `team_members`, `deals`, `pipeline_entries`, `documents`, `chat_messages`, `portfolio_entries`, `password_reset_tokens`.

The User model currently has no billing-related columns. There is no subscription or payment infrastructure.

---

## 2. Schema Design Decisions

### 2.1 One-to-One vs One-to-Many Subscriptions

**Decision: One active subscription per user, but store full history.**

A user always has exactly one "current" subscription (including Free tier). However, the `subscriptions` table should allow multiple rows per user because:

- Users upgrade, downgrade, cancel, and re-subscribe over time
- Stripe creates a new subscription object on re-subscribe after cancellation
- You need historical data for support, analytics, and revenue reporting
- Trial-to-paid conversion is a new subscription row, not a mutation

The query pattern is: `WHERE user_id = ? AND status IN ('active', 'trialing') ORDER BY created_at DESC LIMIT 1`. A partial unique index enforces at most one active subscription per user at the database level.

### 2.2 Stripe as Source of Truth vs Local State Machine

**Decision: Stripe is the source of truth. The local DB is a synchronized cache.**

The local `subscriptions` table mirrors Stripe's state, updated exclusively via webhooks. Application code reads the local DB for fast access (no Stripe API call on every request), but never transitions state locally without a Stripe event to back it.

Why this matters:
- Stripe handles payment retry logic, dunning, proration, tax — your DB should not try to replicate this
- If local state diverges from Stripe, Stripe wins. A nightly reconciliation job can catch drift
- The `webhook_events` table provides a full audit log of every Stripe event processed

The one exception: the initial "trial" state can be set locally at signup before Stripe is involved, then reconciled when the Stripe subscription is actually created.

### 2.3 Stripe IDs Storage Strategy

Stripe IDs are stored as indexed `String` columns, never as foreign keys (they reference an external system). Every Stripe ID column is prefixed with `stripe_` for clarity.

| Column | Table | Example Value |
|--------|-------|---------------|
| `stripe_customer_id` | `users` | `cus_R4x8qZ2bN1mK` |
| `stripe_subscription_id` | `subscriptions` | `sub_1Ox2yZ3aBcDeFg` |
| `stripe_price_id` | `subscription_plans` | `price_1Ox2yZ3aBcDeFg` |
| `stripe_product_id` | `subscription_plans` | `prod_R4x8qZ2bN1mK` |
| `stripe_payment_method_id` | `payment_methods` | `pm_1Ox2yZ3aBcDeFg` |
| `stripe_invoice_id` | `invoices` | `in_1Ox2yZ3aBcDeFg` |

---

## 3. Complete SQLAlchemy Model Code

### 3.1 Additions to the User Model

Two columns added to the existing `users` table — no structural change to the model file, just two new columns:

```python
# Add to backend/models/users.py — User class

# Billing (added by billing migration)
stripe_customer_id = Column(String, unique=True, nullable=True, index=True)
plan_tier = Column(
    Enum("free", "starter", "pro", "team", name="plantier"),
    nullable=False,
    default="free",
    server_default="free",
)
```

`plan_tier` is a denormalized convenience column — the canonical source is the `subscriptions` table, but having it on `users` avoids a JOIN on every authenticated request that checks feature access. It is updated by webhook handlers whenever subscription status changes.

### 3.2 subscription_plans Table

This table is a reference/lookup table seeded once and updated rarely. It mirrors the Stripe Product + Price objects.

```python
"""SubscriptionPlan model — defines available billing plans and their limits."""

from sqlalchemy import Boolean, Column, Enum, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB

from database import Base
from models.base import TimestampMixin

PlanTier = Enum("free", "starter", "pro", "team", name="plantier")
BillingInterval = Enum("month", "year", name="billinginterval")


class SubscriptionPlan(TimestampMixin, Base):
    """A billing plan available for purchase (maps to a Stripe Price)."""

    __tablename__ = "subscription_plans"

    # Identity
    name = Column(String(50), nullable=False)              # "Pro Monthly"
    tier = Column(PlanTier, nullable=False)                 # "pro"
    billing_interval = Column(BillingInterval, nullable=False)  # "month"
    is_active = Column(Boolean, nullable=False, default=True)

    # Pricing
    price_cents = Column(Integer, nullable=False)           # 6900 = $69.00
    currency = Column(String(3), nullable=False, default="usd")

    # Stripe mapping
    stripe_product_id = Column(String, nullable=True, unique=True)
    stripe_price_id = Column(String, nullable=True, unique=True)

    # Feature limits (JSONB for flexibility as limits evolve)
    limits = Column(JSONB, nullable=False, default=dict)
    # Example:
    # {
    #   "deals_per_month": 5,          # Free=3, Starter=15, Pro=unlimited, Team=unlimited
    #   "ai_messages_per_month": 25,   # Free=10, Starter=100, Pro=500, Team=2000
    #   "analyses_per_month": 5,       # Free=3, Starter=15, Pro=unlimited, Team=unlimited
    #   "document_uploads": 5,         # Free=3, Starter=25, Pro=unlimited, Team=unlimited
    #   "team_members": 0,             # Free=0, Starter=0, Pro=0, Team=10
    #   "export_pdf": false,           # Free=false, Starter=true, Pro=true, Team=true
    #   "portfolio_tracking": false,   # Free=false, Starter=true, Pro=true, Team=true
    #   "offer_letter_ai": false,      # Free=false, Starter=false, Pro=true, Team=true
    # }

    description = Column(Text, nullable=True)
```

**Why JSONB for limits instead of individual columns?** Because feature limits change as the product evolves. Adding a new limit (e.g., `api_calls_per_month`) is a data update, not a schema migration. The application layer validates limit keys at runtime.

### 3.3 subscriptions Table

```python
"""Subscription model — tracks a user's billing subscription lifecycle."""

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from database import Base
from models.base import TimestampMixin

SubscriptionStatus = Enum(
    "trialing",        # 14-day trial, no payment method
    "active",          # Paid and current
    "past_due",        # Payment failed, in retry/dunning period
    "canceled",        # User canceled, access until period end
    "unpaid",          # All retries exhausted, access revoked
    "incomplete",      # Initial payment failed at checkout
    "paused",          # Manually paused (future use)
    name="subscriptionstatus",
)


class Subscription(TimestampMixin, Base):
    """A user's subscription to a Parcel plan, synchronized with Stripe."""

    __tablename__ = "subscriptions"

    # Ownership
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    plan_id = Column(
        UUID(as_uuid=True),
        ForeignKey("subscription_plans.id"),
        nullable=False,
    )

    # Stripe mapping
    stripe_subscription_id = Column(String, unique=True, nullable=True, index=True)
    stripe_customer_id = Column(String, nullable=True, index=True)

    # State
    status = Column(SubscriptionStatus, nullable=False, default="trialing")

    # Period tracking
    current_period_start = Column(DateTime, nullable=True)
    current_period_end = Column(DateTime, nullable=True)
    trial_start = Column(DateTime, nullable=True)
    trial_end = Column(DateTime, nullable=True)
    canceled_at = Column(DateTime, nullable=True)
    cancel_at_period_end = Column(Boolean, nullable=False, default=False)
    ended_at = Column(DateTime, nullable=True)

    # Metadata
    cancel_reason = Column(String, nullable=True)
    metadata = Column(JSONB, nullable=True)  # Overflow for Stripe metadata

    # Relationships
    user = relationship("User", backref="subscriptions")
    plan = relationship("SubscriptionPlan")
```

**Critical index — enforce one active subscription per user:**

```python
from sqlalchemy import Index

# Partial unique index: only one active/trialing subscription per user
Index(
    "ix_subscriptions_one_active_per_user",
    Subscription.user_id,
    unique=True,
    postgresql_where=(
        Subscription.status.in_(["trialing", "active", "past_due"])
    ),
)
```

This is added in the `__table_args__` or via Alembic migration directly.

### 3.4 invoices Table

```python
"""Invoice model — records every billing event for audit and customer support."""

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from database import Base
from models.base import TimestampMixin

InvoiceStatus = Enum(
    "draft", "open", "paid", "void", "uncollectible",
    name="invoicestatus",
)


class Invoice(TimestampMixin, Base):
    """A billing invoice, mirrored from Stripe for local querying and support."""

    __tablename__ = "invoices"

    # Ownership
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    subscription_id = Column(
        UUID(as_uuid=True),
        ForeignKey("subscriptions.id"),
        nullable=True,  # One-time charges have no subscription
    )

    # Stripe mapping
    stripe_invoice_id = Column(String, unique=True, nullable=True, index=True)
    stripe_charge_id = Column(String, nullable=True)
    stripe_payment_intent_id = Column(String, nullable=True)

    # Amounts (all in cents)
    amount_due = Column(Integer, nullable=False)       # What was owed
    amount_paid = Column(Integer, nullable=False, default=0)  # What was collected
    currency = Column(String(3), nullable=False, default="usd")

    # Status
    status = Column(InvoiceStatus, nullable=False, default="draft")
    paid_at = Column(DateTime, nullable=True)

    # Period this invoice covers
    period_start = Column(DateTime, nullable=True)
    period_end = Column(DateTime, nullable=True)

    # PDF
    hosted_invoice_url = Column(String, nullable=True)  # Stripe-hosted invoice page
    invoice_pdf_url = Column(String, nullable=True)      # Direct PDF download link

    # Line items stored as JSONB (denormalized from Stripe)
    line_items = Column(JSONB, nullable=True)
    # Example: [{"description": "Pro Monthly", "amount": 6900, "quantity": 1}]

    # Relationships
    user = relationship("User", backref="invoices")
    subscription = relationship("Subscription", backref="invoices")
```

### 3.5 payment_methods Table

```python
"""PaymentMethod model — stores tokenized card metadata for display purposes."""

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from database import Base
from models.base import TimestampMixin


class PaymentMethod(TimestampMixin, Base):
    """A user's payment method — stores only Stripe token + display metadata."""

    __tablename__ = "payment_methods"

    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    stripe_payment_method_id = Column(
        String, unique=True, nullable=False, index=True
    )

    # Display-only metadata (safe to store, not sensitive)
    card_brand = Column(String(20), nullable=True)     # "visa", "mastercard"
    card_last_four = Column(String(4), nullable=True)   # "4242"
    card_exp_month = Column(Integer, nullable=True)     # 12
    card_exp_year = Column(Integer, nullable=True)      # 2028
    is_default = Column(Boolean, nullable=False, default=False)

    # Relationships
    user = relationship("User", backref="payment_methods")
```

**No raw card numbers, CVVs, or full PANs are ever stored.** Only Stripe-tokenized references and display metadata (last four, brand, expiry). This keeps Parcel firmly in PCI SAQ-A scope.

### 3.6 usage_records Table

```python
"""UsageRecord model — tracks metered feature consumption per billing period."""

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from database import Base
from models.base import TimestampMixin

UsageType = Enum(
    "ai_message",        # Chat messages sent to Claude
    "deal_analysis",     # Running a calculator analysis
    "deal_created",      # Saving a new deal
    "document_upload",   # Uploading a document
    "pdf_export",        # Generating a PDF report
    "offer_letter",      # AI offer letter generation
    name="usagetype",
)


class UsageRecord(TimestampMixin, Base):
    """A single metered usage event, bucketed by billing period for limit enforcement."""

    __tablename__ = "usage_records"

    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )

    usage_type = Column(UsageType, nullable=False)
    quantity = Column(Integer, nullable=False, default=1)

    # Billing period this usage falls within
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)

    # Optional context (which deal, which chat session, etc.)
    resource_id = Column(UUID(as_uuid=True), nullable=True)
    resource_type = Column(String(50), nullable=True)  # "deal", "chat_session", "document"

    # Relationships
    user = relationship("User", backref="usage_records")
```

**Composite index for the hot query — "how many X has this user used this period?":**

```python
Index(
    "ix_usage_records_user_type_period",
    UsageRecord.user_id,
    UsageRecord.usage_type,
    UsageRecord.period_start,
)
```

**Usage counting query pattern:**

```python
from sqlalchemy import func

def get_usage_count(db, user_id: UUID, usage_type: str, period_start: datetime) -> int:
    """Return total usage of a given type within the current billing period."""
    result = db.query(func.coalesce(func.sum(UsageRecord.quantity), 0)).filter(
        UsageRecord.user_id == user_id,
        UsageRecord.usage_type == usage_type,
        UsageRecord.period_start == period_start,
    ).scalar()
    return result
```

### 3.7 webhook_events Table

```python
"""WebhookEvent model — idempotent log of every Stripe webhook processed."""

from sqlalchemy import Boolean, Column, DateTime, String, Text
from sqlalchemy.dialects.postgresql import JSONB

from database import Base
from models.base import TimestampMixin


class WebhookEvent(TimestampMixin, Base):
    """Immutable audit record of a Stripe webhook event delivery."""

    __tablename__ = "webhook_events"

    # Stripe event identity (used for idempotency)
    stripe_event_id = Column(String, unique=True, nullable=False, index=True)
    event_type = Column(String, nullable=False, index=True)

    # Full payload for debugging and replay
    payload = Column(JSONB, nullable=False)

    # Processing status
    processed = Column(Boolean, nullable=False, default=False)
    processed_at = Column(DateTime, nullable=True)
    error = Column(Text, nullable=True)  # Error message if processing failed
    retry_count = Column(Integer, nullable=False, default=0)
```

The `stripe_event_id` unique constraint provides **idempotency** — if Stripe retries a webhook delivery, the handler checks for an existing row and skips reprocessing. This is critical because Stripe guarantees at-least-once delivery, not exactly-once.

---

## 4. Billing Period Tracking for Usage Resets

Usage limits reset at the start of each billing period. The period boundaries come from two sources:

### For Stripe-managed subscriptions (Starter, Pro, Team):
The `current_period_start` and `current_period_end` on the `subscriptions` table are updated every time Stripe fires `invoice.paid` or `customer.subscription.updated`. When recording usage, the application stamps each `UsageRecord` with the subscription's current period boundaries.

### For Free tier users (no Stripe subscription):
Free users have no Stripe subscription object. Their billing period is a rolling calendar month anchored to their `created_at` date. The application computes:

```python
from datetime import datetime
from dateutil.relativedelta import relativedelta

def get_free_tier_period(user_created_at: datetime, now: datetime):
    """Calculate the current billing period for a free-tier user."""
    anchor_day = min(user_created_at.day, 28)  # Clamp to avoid month-end issues
    period_start = now.replace(day=anchor_day, hour=0, minute=0, second=0, microsecond=0)
    if period_start > now:
        period_start -= relativedelta(months=1)
    period_end = period_start + relativedelta(months=1)
    return period_start, period_end
```

### Usage check flow (called before any metered action):

```python
def check_usage_limit(db, user, usage_type: str) -> bool:
    """Return True if the user is within their plan limits for this usage type."""
    # 1. Get the user's active subscription + plan
    sub = get_active_subscription(db, user.id)
    if sub is None:
        # Free tier
        period_start, period_end = get_free_tier_period(user.created_at, datetime.utcnow())
        plan = get_plan_by_tier("free")
    else:
        period_start = sub.current_period_start
        period_end = sub.current_period_end
        plan = sub.plan

    # 2. Look up the limit for this usage type
    limit = plan.limits.get(usage_type_to_limit_key(usage_type))
    if limit is None or limit == -1:  # -1 = unlimited
        return True

    # 3. Count current usage
    current = get_usage_count(db, user.id, usage_type, period_start)
    return current < limit
```

---

## 5. Index Definitions (Consolidated)

All indexes below are defined either in `__table_args__` on the model or in the Alembic migration:

```python
# --- users table (additions) ---
# stripe_customer_id already defined as unique=True, index=True in column def

# --- subscriptions table ---
Index("ix_subscriptions_user_id", "user_id")
Index("ix_subscriptions_stripe_subscription_id", "stripe_subscription_id", unique=True)
Index("ix_subscriptions_stripe_customer_id", "stripe_customer_id")
Index("ix_subscriptions_status", "status")

# Partial unique: one active subscription per user
Index(
    "ix_subscriptions_one_active_per_user",
    "user_id",
    unique=True,
    postgresql_where=text("status IN ('trialing', 'active', 'past_due')"),
)

# --- invoices table ---
Index("ix_invoices_user_id", "user_id")
Index("ix_invoices_stripe_invoice_id", "stripe_invoice_id", unique=True)
Index("ix_invoices_subscription_id", "subscription_id")
Index("ix_invoices_status", "status")

# --- usage_records table ---
Index("ix_usage_records_user_type_period", "user_id", "usage_type", "period_start")
Index("ix_usage_records_user_id", "user_id")

# --- payment_methods table ---
Index("ix_payment_methods_user_id", "user_id")
Index("ix_payment_methods_stripe_id", "stripe_payment_method_id", unique=True)

# --- webhook_events table ---
Index("ix_webhook_events_stripe_event_id", "stripe_event_id", unique=True)
Index("ix_webhook_events_event_type", "event_type")
Index("ix_webhook_events_processed", "processed")
```

**Query coverage analysis:**

| Common Query | Index Used |
|---|---|
| "Get user by Stripe customer ID" | `ix_users_stripe_customer_id` (unique) |
| "Get active subscription for user" | `ix_subscriptions_one_active_per_user` (partial unique) |
| "Look up subscription by Stripe ID" (webhook) | `ix_subscriptions_stripe_subscription_id` (unique) |
| "Get invoices for user" (billing page) | `ix_invoices_user_id` |
| "Find invoice by Stripe ID" (webhook) | `ix_invoices_stripe_invoice_id` (unique) |
| "Count AI messages used this period" | `ix_usage_records_user_type_period` (composite) |
| "Check idempotency for webhook" | `ix_webhook_events_stripe_event_id` (unique) |
| "Find unprocessed webhooks" (retry job) | `ix_webhook_events_processed` |

---

## 6. Soft Delete vs Hard Delete for Canceled Subscriptions

**Decision: Never delete subscription rows. Use status transitions + `ended_at` timestamp.**

Canceled subscriptions are set to `status='canceled'` with `canceled_at` populated. When the subscription period actually expires, `ended_at` is set. The row stays in the database permanently.

Why:
- **Audit trail**: Customer support needs full billing history. "Why was I charged in February?" requires the subscription row.
- **Revenue analytics**: MRR calculations, churn analysis, and cohort reporting need historical data.
- **Re-subscription**: When a user re-subscribes, a new row is created. The old row's `ended_at` shows when the previous subscription ended. This creates a clean timeline.
- **Legal**: Tax jurisdictions may require invoice/subscription records for 5-10 years.

The `deleted_at` pattern from `deals` is intentionally **not** used on billing tables. There is no "soft delete" — subscriptions are either active or they have a terminal status. The `webhook_events` table is append-only and immutable.

---

## 7. Alembic Migration Strategy

The billing schema is introduced in **two migrations** to keep each one focused and safely reversible:

### Migration 1: Add Stripe columns to users + create reference tables

```python
"""add billing infrastructure — plans, stripe IDs on users

Revision ID: e5f8a2c47d19
Revises: d4a7e3b58f12
Create Date: 2026-03-28
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "e5f8a2c47d19"
down_revision: Union[str, Sequence[str], None] = "d4a7e3b58f12"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add billing columns to users and create subscription_plans table."""

    # --- Enums ---
    plantier = sa.Enum("free", "starter", "pro", "team", name="plantier")
    plantier.create(op.get_bind(), checkfirst=True)

    billinginterval = sa.Enum("month", "year", name="billinginterval")
    billinginterval.create(op.get_bind(), checkfirst=True)

    # --- Users table: add Stripe + plan columns ---
    op.add_column(
        "users",
        sa.Column("stripe_customer_id", sa.String(), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column(
            "plan_tier",
            plantier,
            nullable=False,
            server_default="free",
        ),
    )
    op.create_unique_constraint(
        "uq_users_stripe_customer_id", "users", ["stripe_customer_id"]
    )
    op.create_index(
        "ix_users_stripe_customer_id", "users", ["stripe_customer_id"]
    )

    # --- subscription_plans table ---
    op.create_table(
        "subscription_plans",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("name", sa.String(50), nullable=False),
        sa.Column("tier", plantier, nullable=False),
        sa.Column("billing_interval", billinginterval, nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("price_cents", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="usd"),
        sa.Column("stripe_product_id", sa.String(), nullable=True),
        sa.Column("stripe_price_id", sa.String(), nullable=True),
        sa.Column("limits", JSONB(), nullable=False, server_default="{}"),
        sa.Column("description", sa.Text(), nullable=True),
        sa.UniqueConstraint("stripe_product_id", name="uq_plans_stripe_product_id"),
        sa.UniqueConstraint("stripe_price_id", name="uq_plans_stripe_price_id"),
    )


def downgrade() -> None:
    """Remove billing columns and subscription_plans table."""
    op.drop_table("subscription_plans")
    op.drop_index("ix_users_stripe_customer_id", table_name="users")
    op.drop_constraint("uq_users_stripe_customer_id", "users", type_="unique")
    op.drop_column("users", "plan_tier")
    op.drop_column("users", "stripe_customer_id")

    # Drop enums
    sa.Enum(name="billinginterval").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="plantier").drop(op.get_bind(), checkfirst=True)
```

### Migration 2: Create transactional billing tables

```python
"""add subscriptions, invoices, payment_methods, usage_records, webhook_events

Revision ID: f7a9b3d58e21
Revises: e5f8a2c47d19
Create Date: 2026-03-28
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy import text

revision: str = "f7a9b3d58e21"
down_revision: Union[str, Sequence[str], None] = "e5f8a2c47d19"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create all billing transaction tables."""

    # --- Enums ---
    substatus = sa.Enum(
        "trialing", "active", "past_due", "canceled", "unpaid",
        "incomplete", "paused",
        name="subscriptionstatus",
    )
    substatus.create(op.get_bind(), checkfirst=True)

    invstatus = sa.Enum(
        "draft", "open", "paid", "void", "uncollectible",
        name="invoicestatus",
    )
    invstatus.create(op.get_bind(), checkfirst=True)

    usagetype = sa.Enum(
        "ai_message", "deal_analysis", "deal_created",
        "document_upload", "pdf_export", "offer_letter",
        name="usagetype",
    )
    usagetype.create(op.get_bind(), checkfirst=True)

    # --- subscriptions ---
    op.create_table(
        "subscriptions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("plan_id", UUID(as_uuid=True), sa.ForeignKey("subscription_plans.id"), nullable=False),
        sa.Column("stripe_subscription_id", sa.String(), nullable=True),
        sa.Column("stripe_customer_id", sa.String(), nullable=True),
        sa.Column("status", substatus, nullable=False, server_default="trialing"),
        sa.Column("current_period_start", sa.DateTime(), nullable=True),
        sa.Column("current_period_end", sa.DateTime(), nullable=True),
        sa.Column("trial_start", sa.DateTime(), nullable=True),
        sa.Column("trial_end", sa.DateTime(), nullable=True),
        sa.Column("canceled_at", sa.DateTime(), nullable=True),
        sa.Column("cancel_at_period_end", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("ended_at", sa.DateTime(), nullable=True),
        sa.Column("cancel_reason", sa.String(), nullable=True),
        sa.Column("metadata", JSONB(), nullable=True),
    )
    op.create_index("ix_subscriptions_user_id", "subscriptions", ["user_id"])
    op.create_index(
        "ix_subscriptions_stripe_subscription_id",
        "subscriptions",
        ["stripe_subscription_id"],
        unique=True,
    )
    op.create_index(
        "ix_subscriptions_stripe_customer_id",
        "subscriptions",
        ["stripe_customer_id"],
    )
    op.create_index("ix_subscriptions_status", "subscriptions", ["status"])

    # Partial unique index — max one active subscription per user
    op.execute(text(
        """CREATE UNIQUE INDEX ix_subscriptions_one_active_per_user
           ON subscriptions (user_id)
           WHERE status IN ('trialing', 'active', 'past_due')"""
    ))

    # --- invoices ---
    op.create_table(
        "invoices",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("subscription_id", UUID(as_uuid=True), sa.ForeignKey("subscriptions.id"), nullable=True),
        sa.Column("stripe_invoice_id", sa.String(), nullable=True),
        sa.Column("stripe_charge_id", sa.String(), nullable=True),
        sa.Column("stripe_payment_intent_id", sa.String(), nullable=True),
        sa.Column("amount_due", sa.Integer(), nullable=False),
        sa.Column("amount_paid", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("currency", sa.String(3), nullable=False, server_default="usd"),
        sa.Column("status", invstatus, nullable=False, server_default="draft"),
        sa.Column("paid_at", sa.DateTime(), nullable=True),
        sa.Column("period_start", sa.DateTime(), nullable=True),
        sa.Column("period_end", sa.DateTime(), nullable=True),
        sa.Column("hosted_invoice_url", sa.String(), nullable=True),
        sa.Column("invoice_pdf_url", sa.String(), nullable=True),
        sa.Column("line_items", JSONB(), nullable=True),
    )
    op.create_index("ix_invoices_user_id", "invoices", ["user_id"])
    op.create_index("ix_invoices_stripe_invoice_id", "invoices", ["stripe_invoice_id"], unique=True)
    op.create_index("ix_invoices_subscription_id", "invoices", ["subscription_id"])
    op.create_index("ix_invoices_status", "invoices", ["status"])

    # --- payment_methods ---
    op.create_table(
        "payment_methods",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("stripe_payment_method_id", sa.String(), nullable=False),
        sa.Column("card_brand", sa.String(20), nullable=True),
        sa.Column("card_last_four", sa.String(4), nullable=True),
        sa.Column("card_exp_month", sa.Integer(), nullable=True),
        sa.Column("card_exp_year", sa.Integer(), nullable=True),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.create_index("ix_payment_methods_user_id", "payment_methods", ["user_id"])
    op.create_index(
        "ix_payment_methods_stripe_id",
        "payment_methods",
        ["stripe_payment_method_id"],
        unique=True,
    )

    # --- usage_records ---
    op.create_table(
        "usage_records",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("usage_type", usagetype, nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("period_start", sa.DateTime(), nullable=False),
        sa.Column("period_end", sa.DateTime(), nullable=False),
        sa.Column("resource_id", UUID(as_uuid=True), nullable=True),
        sa.Column("resource_type", sa.String(50), nullable=True),
    )
    op.create_index("ix_usage_records_user_id", "usage_records", ["user_id"])
    op.create_index(
        "ix_usage_records_user_type_period",
        "usage_records",
        ["user_id", "usage_type", "period_start"],
    )

    # --- webhook_events ---
    op.create_table(
        "webhook_events",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("stripe_event_id", sa.String(), nullable=False),
        sa.Column("event_type", sa.String(), nullable=False),
        sa.Column("payload", JSONB(), nullable=False),
        sa.Column("processed", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("processed_at", sa.DateTime(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("retry_count", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_index(
        "ix_webhook_events_stripe_event_id",
        "webhook_events",
        ["stripe_event_id"],
        unique=True,
    )
    op.create_index("ix_webhook_events_event_type", "webhook_events", ["event_type"])
    op.create_index("ix_webhook_events_processed", "webhook_events", ["processed"])


def downgrade() -> None:
    """Drop all billing transaction tables and enums."""
    op.drop_table("webhook_events")
    op.drop_table("usage_records")
    op.drop_table("payment_methods")
    op.drop_table("invoices")
    op.drop_table("subscriptions")

    sa.Enum(name="usagetype").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="invoicestatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="subscriptionstatus").drop(op.get_bind(), checkfirst=True)
```

### Migration safety principles:

1. **Always additive first**: New columns are `nullable=True` or have `server_default`. Existing code keeps working because it ignores the new columns.
2. **Enums created with `checkfirst=True`**: Safe if migration is re-run or if enum was partially created.
3. **Downgrades drop in reverse dependency order**: `webhook_events` before `usage_records` before `invoices` before `subscriptions` (respects foreign key constraints).
4. **No data mutations in migrations**: Seeding `subscription_plans` rows is done in a separate data migration or application startup, not in the schema migration.
5. **Deployed in stages**: Migration 1 ships first. Backend code is updated to handle the new columns. Then Migration 2 ships with the transactional tables.

---

## 8. Subscription State Machine

The subscription lifecycle is driven by Stripe webhooks. The local DB reflects these states:

```
                    signup (no card)
                         |
                         v
                    [trialing] -----> trial_end webhook -----> [canceled]
                         |                                         ^
                    card added +                                   |
                    checkout.session.completed                     |
                         |                                         |
                         v                                         |
    invoice.paid --> [active] -----> user cancels ----------> [canceled]
         ^               |              (cancel_at_period_end=true,
         |               |               access continues until period_end)
         |               v
         |          [past_due] -----> all retries fail -----> [unpaid]
         |               |
         |               v
         +---- invoice.paid (retry succeeds, back to active)
```

**Webhook events that trigger state transitions:**

| Stripe Event | Local Action |
|---|---|
| `customer.subscription.created` | Insert new `subscriptions` row with status from event |
| `customer.subscription.updated` | Update status, period dates, cancel flags |
| `customer.subscription.deleted` | Set `status='canceled'`, `ended_at=now` |
| `invoice.paid` | Update subscription status to `active`, update period dates, insert `invoices` row |
| `invoice.payment_failed` | Update subscription to `past_due`, insert `invoices` row with `status='open'` |
| `customer.subscription.trial_will_end` | (Optional) Trigger email reminder, no DB state change |
| `payment_method.attached` | Insert `payment_methods` row |
| `payment_method.detached` | Delete `payment_methods` row |
| `checkout.session.completed` | Link Stripe customer/subscription IDs to user, update `plan_tier` |

---

## 9. Audit Trail and Billing History for Customer Support

The schema provides three layers of audit trail:

### Layer 1: `webhook_events` (raw event log)
Every Stripe event is stored verbatim in JSONB. This is the "black box flight recorder" for billing. Support can look up any event by `stripe_event_id` or filter by `event_type`. The full payload is preserved even if Parcel's processing logic changes later.

### Layer 2: `invoices` (billing history)
The user-facing billing history page reads from this table. Each row includes `hosted_invoice_url` (Stripe-hosted page the user can view) and `invoice_pdf_url` (downloadable receipt). `line_items` JSONB captures what was charged.

### Layer 3: `subscriptions` (subscription timeline)
Multiple rows per user over time create a complete subscription timeline. Support can see: when they started a trial, when they converted, when they upgraded/downgraded, when they canceled, and why (`cancel_reason`).

**Example support query — "Show me everything about this user's billing":**

```python
def get_billing_history(db, user_id: UUID):
    """Full billing audit for customer support."""
    subscriptions = (
        db.query(Subscription)
        .filter(Subscription.user_id == user_id)
        .order_by(Subscription.created_at.desc())
        .all()
    )
    invoices = (
        db.query(Invoice)
        .filter(Invoice.user_id == user_id)
        .order_by(Invoice.created_at.desc())
        .all()
    )
    payment_methods = (
        db.query(PaymentMethod)
        .filter(PaymentMethod.user_id == user_id)
        .all()
    )
    return {
        "subscriptions": subscriptions,
        "invoices": invoices,
        "payment_methods": payment_methods,
    }
```

---

## 10. Entity Relationship Diagram (Text)

```
users
  |--- 1:N --- subscriptions --- N:1 --- subscription_plans
  |--- 1:N --- invoices -------- N:1 --- subscriptions
  |--- 1:N --- payment_methods
  |--- 1:N --- usage_records
  |
  |--- 1:N --- deals (existing)
  |--- 1:N --- chat_messages (existing)
  |--- 1:N --- documents (existing)
  |--- 1:N --- pipeline_entries (existing)
  |--- 1:N --- portfolio_entries (existing)

webhook_events (standalone, no FK — references Stripe, not local entities)
```

---

## 11. Seed Data for subscription_plans

This is run once after the migration, either via a data migration or a management command:

```python
SEED_PLANS = [
    {
        "name": "Free",
        "tier": "free",
        "billing_interval": "month",
        "price_cents": 0,
        "limits": {
            "deals_per_month": 3,
            "ai_messages_per_month": 10,
            "analyses_per_month": 3,
            "document_uploads": 3,
            "team_members": 0,
            "export_pdf": False,
            "portfolio_tracking": False,
            "offer_letter_ai": False,
        },
    },
    {
        "name": "Starter Monthly",
        "tier": "starter",
        "billing_interval": "month",
        "price_cents": 2900,
        "limits": {
            "deals_per_month": 15,
            "ai_messages_per_month": 100,
            "analyses_per_month": 15,
            "document_uploads": 25,
            "team_members": 0,
            "export_pdf": True,
            "portfolio_tracking": True,
            "offer_letter_ai": False,
        },
    },
    {
        "name": "Pro Monthly",
        "tier": "pro",
        "billing_interval": "month",
        "price_cents": 6900,
        "limits": {
            "deals_per_month": -1,
            "ai_messages_per_month": 500,
            "analyses_per_month": -1,
            "document_uploads": -1,
            "team_members": 0,
            "export_pdf": True,
            "portfolio_tracking": True,
            "offer_letter_ai": True,
        },
    },
    {
        "name": "Team Monthly",
        "tier": "team",
        "billing_interval": "month",
        "price_cents": 14900,
        "limits": {
            "deals_per_month": -1,
            "ai_messages_per_month": 2000,
            "analyses_per_month": -1,
            "document_uploads": -1,
            "team_members": 10,
            "export_pdf": True,
            "portfolio_tracking": True,
            "offer_letter_ai": True,
        },
    },
]
```

(`-1` means unlimited. The application layer checks `if limit == -1: return True`.)

---

## RECOMMENDATIONS FOR PARCEL

### Priority 1 — Do First (Blocks Everything Else)

1. **Add `stripe_customer_id` and `plan_tier` to `users` immediately.** This is the smallest, safest change and unblocks all other billing work. Deploy Migration 1 alone, verify it in production, then proceed. The `plan_tier` column with `server_default='free'` means existing users are auto-classified correctly with zero data backfill.

2. **Create the `subscription_plans` table and seed it with the four tiers.** This is a reference table with no runtime writes. It can be deployed and verified independently. Seeding it early lets you wire up the frontend pricing page to real data.

3. **Create the `webhook_events` table before integrating Stripe.** This must exist before the first webhook arrives. It provides idempotency (preventing duplicate processing) and a complete audit trail from day one. If anything goes wrong during Stripe integration, you can replay events from this table.

### Priority 2 — Core Billing Flow

4. **Deploy the `subscriptions` table with the partial unique index.** The `ix_subscriptions_one_active_per_user` partial unique index is the single most important data integrity constraint in the billing system. It prevents the "two active subscriptions" bug that plagues many SaaS apps. Test this constraint explicitly in your test suite.

5. **Deploy `invoices` and `payment_methods` together.** These are read-heavy tables populated by webhooks. They power the user-facing billing settings page. The `invoices` table stores Stripe-hosted URLs so you never need to generate invoice PDFs yourself.

6. **Use JSONB for plan limits, not individual columns.** This is a deliberate trade-off: you lose database-level constraint enforcement but gain the ability to add new feature limits without schema migrations. At Parcel's current stage, product velocity matters more than schema rigidity. Validate limit keys in application code with a Pydantic model.

### Priority 3 — Usage Tracking

7. **Deploy `usage_records` and wire it into existing endpoints.** Add usage recording calls to: the chat endpoint (ai_message), the analyzer endpoint (deal_analysis), the deal creation endpoint (deal_created), the document upload endpoint (document_upload), and the PDF export endpoint (pdf_export). Each call is a single INSERT — keep it fast.

8. **Use the composite index `(user_id, usage_type, period_start)` for limit checks.** This index covers the hot path: "has this user exceeded their limit for this action in the current billing period?" The query hits the index directly and never needs a table scan. At Parcel's scale this will be sub-millisecond, but the index ensures it stays fast at 100k+ users.

9. **Stamp every `UsageRecord` with the billing period boundaries at write time.** Do not compute period boundaries at query time. By storing `period_start` and `period_end` on each record, the counting query is a simple equality filter on `period_start`, not a range scan. This also makes the data self-documenting: you can always tell which billing period a usage event belongs to.

### Priority 4 — Operational Safety

10. **Never hard-delete billing rows.** Subscriptions, invoices, and webhook events are permanent records. Use status fields (`canceled`, `void`, `unpaid`) instead of deletion. This is non-negotiable for financial audit compliance and customer support.

11. **Run a nightly reconciliation job that compares local subscription state to Stripe.** Call `stripe.Subscription.retrieve()` for every `status IN ('active', 'trialing', 'past_due')` row and compare. Log discrepancies. This catches missed webhooks, network failures, and bugs in your webhook handler. It is your safety net.

12. **Index `webhook_events.processed` to power a retry queue.** A background job should periodically query `WHERE processed = false AND retry_count < 5` and re-attempt processing. Stripe webhook delivery is at-least-once, but your server can crash mid-processing. The retry queue ensures eventual consistency.

13. **Split the Alembic migration into two files as shown above.** Migration 1 (users columns + plans table) and Migration 2 (transactional tables) should be separate commits. This lets you deploy incrementally, verify each step, and roll back safely if something breaks. Never bundle a schema change to an existing table with new table creation in the same migration.
