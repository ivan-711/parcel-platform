# Billing Database Schema -- Final Implementation Design

> Generated 2026-03-28 from research agents 03, 04, 16, 17 and codebase analysis.
> Targets: SQLAlchemy 2 (sync), PostgreSQL, Alembic, existing Parcel patterns.

---

## 1. Relationship Diagram

```
                         +---------------------+
                         |       users         |
                         |---------------------|
                         | id (UUID PK)        |
                         | name                |
                         | email (unique)      |
                         | password_hash       |
                         | role                |
                         | team_id (FK teams)  |
                         | email_notifications |
                     +-->| stripe_customer_id  |<--- NEW
                     |   | plan_tier           |<--- NEW
                     |   | created_at          |
                     |   | updated_at          |
                     |   +---------------------+
                     |       |   |   |    |
          +----------+       |   |   |    +---------------------------+
          |                  |   |   |                                |
          v                  v   |   v                                v
+-------------------+  +----+---+---+---+  +-------------------+  +-------------------+
| subscription_plans|  |subscriptions  |  | invoices          |  | usage_records     |
|-------------------|  |---------------|  |-------------------|  |-------------------|
| id (UUID PK)     |<-| plan_id (FK)  |  | id (UUID PK)      |  | id (UUID PK)      |
| name              |  | id (UUID PK)  |->| subscription_id   |  | user_id (FK)      |
| tier (enum)       |  | user_id (FK)  |  | user_id (FK)      |  | usage_type (enum) |
| billing_interval  |  | stripe_sub_id |  | stripe_invoice_id |  | quantity           |
| price_cents       |  | stripe_cust_id|  | amount_due        |  | period_start       |
| stripe_product_id |  | status (enum) |  | amount_paid       |  | period_end         |
| stripe_price_id   |  | current_period|  | status (enum)     |  | resource_id        |
| limits (JSONB)    |  | trial_start/  |  | paid_at           |  | resource_type      |
| is_active         |  |   trial_end   |  | line_items (JSONB)|  | created_at         |
| created_at        |  | canceled_at   |  | created_at        |  | updated_at         |
| updated_at        |  | ended_at      |  | updated_at        |  +-------------------+
+-------------------+  | metadata(JSONB|  +-------------------+
                       | created_at    |
                       | updated_at    |        +-------------------+
                       +---------------+        | payment_methods   |
                                                |-------------------|
+-------------------+                           | id (UUID PK)      |
| webhook_events    |                           | user_id (FK)      |
|-------------------|                           | stripe_pm_id      |
| id (UUID PK)     |                           | card_brand         |
| stripe_event_id   |                           | card_last_four     |
| event_type        |                           | card_exp_month     |
| payload (JSONB)   |                           | card_exp_year      |
| processed         |                           | is_default         |
| processed_at      |                           | created_at         |
| error             |                           | updated_at         |
| retry_count       |                           +-------------------+
| created_at        |
| updated_at        |
+-------------------+


+-------------------+        +--------------------+
| teams             |        | team_invitations   |
|-------------------| <------|--------------------|
| id (UUID PK)     |  (FK)  | id (UUID PK)       |
| name              |        | team_id (FK)       |
| created_by (FK)   |        | email              |
| slug              |<-- NEW | role (enum)        |
| stripe_customer_id|<-- NEW | invited_by (FK)    |
| stripe_sub_id     |<-- NEW | token_hash         |
| plan              |<-- NEW | status (enum)      |
| seat_limit        |<-- NEW | expires_at         |
| deleted_at        |<-- NEW | accepted_at        |
| created_at        |        | created_at         |
| updated_at        |        | updated_at         |
+-------------------+        +--------------------+
```

**Key relationships:**
- `users` 1:N `subscriptions` (history), but partial unique index enforces max 1 active
- `subscriptions` N:1 `subscription_plans` (which plan is subscribed to)
- `users` 1:N `invoices`, `subscriptions` 1:N `invoices`
- `users` 1:N `usage_records` (metered events)
- `users` 1:N `payment_methods`
- `teams` 1:N `team_invitations`
- `webhook_events` is standalone (no FK -- references external Stripe system)

---

## 2. PostgreSQL Enum Definitions

These are created BEFORE any table that references them. Declared as module-level SQLAlchemy `Enum` objects so models and migrations share the same type.

```python
# backend/core/billing/enums.py

import sqlalchemy as sa

PlanTier = sa.Enum(
    "free", "starter", "pro", "team",
    name="plantier",
)

BillingInterval = sa.Enum(
    "month", "year",
    name="billinginterval",
)

SubscriptionStatus = sa.Enum(
    "trialing",       # 14-day trial, no payment method required
    "active",         # Paid and current
    "past_due",       # Payment failed, in Stripe's retry/dunning period
    "canceled",       # User canceled; access continues until period end
    "unpaid",         # All retries exhausted; access revoked
    "incomplete",     # Initial payment failed at checkout
    "paused",         # Manually paused (future use)
    name="subscriptionstatus",
)

InvoiceStatus = sa.Enum(
    "draft", "open", "paid", "void", "uncollectible",
    name="invoicestatus",
)

UsageType = sa.Enum(
    "ai_message",        # Chat messages sent to Claude
    "deal_analysis",     # Running a calculator analysis
    "deal_created",      # Saving a new deal
    "document_upload",   # Uploading a document
    "pdf_export",        # Generating a PDF report
    "offer_letter",      # AI offer letter generation
    name="usagetype",
)

InvitationStatus = sa.Enum(
    "pending", "accepted", "expired", "revoked",
    name="invitationstatus",
)
```

---

## 3. Complete SQLAlchemy 2 Model Code

### 3.1 Modifications to Existing User Model

Add two columns to `backend/models/users.py`. No structural changes to existing columns or relationships.

```python
"""User model — represents a registered Parcel user."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from database import Base
from models.base import TimestampMixin

UserRole = Enum("wholesaler", "investor", "agent", name="userrole")
PlanTier = Enum("free", "starter", "pro", "team", name="plantier")


class User(TimestampMixin, Base):
    """A registered user of the Parcel platform."""

    __tablename__ = "users"

    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(UserRole, nullable=False, default="investor")
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=True)
    email_notifications = Column(
        Boolean, nullable=False, default=True, server_default="true"
    )

    # --- Billing (added by billing migration) ---
    stripe_customer_id = Column(
        String, unique=True, nullable=True, index=True
    )
    plan_tier = Column(
        PlanTier,
        nullable=False,
        default="free",
        server_default="free",
    )

    # Relationships
    deals = relationship("Deal", back_populates="user", foreign_keys="Deal.user_id")
    team_memberships = relationship("TeamMember", back_populates="user", foreign_keys="TeamMember.user_id")
    pipeline_entries = relationship("PipelineEntry", back_populates="user", foreign_keys="PipelineEntry.user_id")
    documents = relationship("Document", back_populates="user", foreign_keys="Document.user_id")
    chat_messages = relationship("ChatMessage", back_populates="user")
    portfolio_entries = relationship("PortfolioEntry", back_populates="user", foreign_keys="PortfolioEntry.user_id")
    subscriptions = relationship("Subscription", back_populates="user")
    invoices = relationship("Invoice", back_populates="user")
    usage_records = relationship("UsageRecord", back_populates="user")
    payment_methods = relationship("PaymentMethod", back_populates="user")
```

**Why `plan_tier` on the User model directly?**
This is a **denormalized convenience column**. The canonical source of truth is the `subscriptions` table (and ultimately Stripe). But every authenticated request needs to know the user's tier for feature gating. Reading it from the user row (already loaded by `get_current_user`) avoids a JOIN on every request. It is updated atomically by webhook handlers whenever subscription status changes.

---

### 3.2 Modifications to Existing Team Model

Add billing columns and soft delete to `backend/models/teams.py`.

```python
"""Team model — represents a group of users collaborating on deals."""

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from database import Base
from models.base import TimestampMixin


class Team(TimestampMixin, Base):
    """A team that groups users together for collaborative deal analysis."""

    __tablename__ = "teams"

    name = Column(String(120), nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # --- Billing (added by billing migration) ---
    slug = Column(String(120), unique=True, nullable=True, index=True)
    stripe_customer_id = Column(String(255), nullable=True, unique=True)
    stripe_subscription_id = Column(String(255), nullable=True, unique=True)
    plan = Column(
        Enum("free", "solo_pro", "team", name="teamplan"),
        nullable=False,
        default="free",
        server_default="free",
    )
    seat_limit = Column(Integer, nullable=False, default=1, server_default="1")

    # Branding (Team tier only)
    brand_logo_url = Column(String(500), nullable=True)
    brand_company_name = Column(String(200), nullable=True)
    brand_primary_color = Column(String(7), nullable=True)  # hex "#6366F1"

    # Soft delete
    deleted_at = Column(DateTime, nullable=True)

    # Relationships
    members = relationship("TeamMember", back_populates="team")
    invitations = relationship("TeamInvitation", back_populates="team")
    deals = relationship("Deal", back_populates="team", foreign_keys="Deal.team_id")
```

---

### 3.3 SubscriptionPlan Model (NEW)

```python
# backend/models/subscription_plans.py

"""SubscriptionPlan model -- defines available billing plans and their limits."""

from sqlalchemy import Boolean, Column, Enum, Integer, String, Text
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
    is_active = Column(Boolean, nullable=False, default=True, server_default="true")

    # Pricing
    price_cents = Column(Integer, nullable=False)           # 6900 = $69.00
    currency = Column(String(3), nullable=False, default="usd", server_default="usd")

    # Stripe mapping
    stripe_product_id = Column(String, nullable=True, unique=True)
    stripe_price_id = Column(String, nullable=True, unique=True)

    # Feature limits (JSONB for flexibility as limits evolve)
    # Keys:
    #   analyses_per_month: int | null (null = unlimited)
    #   saved_deals: int | null
    #   ai_messages_per_month: int | null
    #   document_uploads_per_month: int | null
    #   ai_chat_enabled: bool
    #   pdf_export: bool
    #   pipeline_enabled: bool
    #   portfolio_enabled: bool
    #   offer_letter: bool
    #   share_deals: bool
    #   team_seats: int | null
    #   custom_branding: bool
    limits = Column(JSONB, nullable=False, default=dict, server_default="{}")

    description = Column(Text, nullable=True)

    # Relationships
    subscriptions = relationship("Subscription", back_populates="plan")
```

**Why JSONB for limits instead of individual columns?** Feature limits change as the product evolves. Adding a new gated feature (e.g., `api_calls_per_month`) is a data update to the JSONB column, not a schema migration. The application layer validates limit keys at runtime via the `TierLimits` dataclass in `backend/core/billing/tier_config.py`.

---

### 3.4 Subscription Model (NEW)

```python
# backend/models/subscriptions.py

"""Subscription model -- tracks a user's billing subscription lifecycle."""

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, String, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from sqlalchemy import Index

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
    """A user's subscription to a Parcel plan, synchronized with Stripe.

    One user may have multiple rows (upgrade, cancel, re-subscribe history),
    but a partial unique index enforces at most one active subscription.
    """

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

    # State (Stripe is source of truth; updated exclusively via webhooks)
    status = Column(
        SubscriptionStatus, nullable=False, default="trialing", server_default="trialing"
    )

    # Period tracking
    current_period_start = Column(DateTime, nullable=True)
    current_period_end = Column(DateTime, nullable=True)
    trial_start = Column(DateTime, nullable=True)
    trial_end = Column(DateTime, nullable=True)

    # Cancellation
    canceled_at = Column(DateTime, nullable=True)
    cancel_at_period_end = Column(Boolean, nullable=False, default=False, server_default="false")
    ended_at = Column(DateTime, nullable=True)
    cancel_reason = Column(String, nullable=True)

    # Overflow metadata from Stripe
    metadata = Column(JSONB, nullable=True)

    # Relationships
    user = relationship("User", back_populates="subscriptions")
    plan = relationship("SubscriptionPlan", back_populates="subscriptions")
    invoices = relationship("Invoice", back_populates="subscription")

    __table_args__ = (
        # Partial unique index: enforce at most one active/trialing/past_due
        # subscription per user. Defined via raw DDL in migration because
        # SQLAlchemy's Index() with postgresql_where requires text().
        # See migration for the actual CREATE INDEX statement.
    )
```

**Key constraint:** The partial unique index `ix_subscriptions_one_active_per_user` is created in the migration using raw SQL because SQLAlchemy's `Index` with `postgresql_where` on enum values requires `text()`. This guarantees at the database level that a user cannot have two active subscriptions simultaneously.

---

### 3.5 Invoice Model (NEW)

```python
# backend/models/invoices.py

"""Invoice model -- records every billing event for audit and customer support."""

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String
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
        index=True,
    )

    # Stripe mapping
    stripe_invoice_id = Column(String, unique=True, nullable=True, index=True)
    stripe_charge_id = Column(String, nullable=True)
    stripe_payment_intent_id = Column(String, nullable=True)

    # Amounts (all in cents, never floating point)
    amount_due = Column(Integer, nullable=False)          # What was owed
    amount_paid = Column(Integer, nullable=False, default=0, server_default="0")
    currency = Column(String(3), nullable=False, default="usd", server_default="usd")

    # Status
    status = Column(InvoiceStatus, nullable=False, default="draft", server_default="draft")
    paid_at = Column(DateTime, nullable=True)

    # Period this invoice covers
    period_start = Column(DateTime, nullable=True)
    period_end = Column(DateTime, nullable=True)

    # Stripe-hosted URLs
    hosted_invoice_url = Column(String, nullable=True)    # Stripe-hosted invoice page
    invoice_pdf_url = Column(String, nullable=True)        # Direct PDF download link

    # Line items (denormalized from Stripe for fast display)
    # Example: [{"description": "Pro Monthly", "amount": 6900, "quantity": 1}]
    line_items = Column(JSONB, nullable=True)

    # Relationships
    user = relationship("User", back_populates="invoices")
    subscription = relationship("Subscription", back_populates="invoices")
```

---

### 3.6 PaymentMethod Model (NEW)

```python
# backend/models/payment_methods.py

"""PaymentMethod model -- stores tokenized card metadata for display purposes.

No raw card numbers, CVVs, or full PANs are ever stored. Only Stripe-tokenized
references and display metadata (last four, brand, expiry). This keeps Parcel
firmly in PCI SAQ-A scope.
"""

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from database import Base
from models.base import TimestampMixin


class PaymentMethod(TimestampMixin, Base):
    """A user's payment method -- stores only Stripe token + display metadata."""

    __tablename__ = "payment_methods"

    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    stripe_payment_method_id = Column(
        String, unique=True, nullable=False, index=True
    )

    # Display-only metadata (safe to store, not PCI-sensitive)
    card_brand = Column(String(20), nullable=True)      # "visa", "mastercard"
    card_last_four = Column(String(4), nullable=True)    # "4242"
    card_exp_month = Column(Integer, nullable=True)      # 12
    card_exp_year = Column(Integer, nullable=True)       # 2028
    is_default = Column(Boolean, nullable=False, default=False, server_default="false")

    # Relationships
    user = relationship("User", back_populates="payment_methods")
```

---

### 3.7 UsageRecord Model (NEW)

```python
# backend/models/usage_records.py

"""UsageRecord model -- tracks metered feature consumption per billing period.

Each row represents one usage event (one analysis, one chat message, one upload).
Counting is done via SUM(quantity) grouped by (user_id, usage_type, period_start).
"""

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
    quantity = Column(Integer, nullable=False, default=1, server_default="1")

    # Billing period this usage falls within (from subscription or computed for free tier)
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)

    # Optional context (which deal, which chat session, which document)
    resource_id = Column(UUID(as_uuid=True), nullable=True)
    resource_type = Column(String(50), nullable=True)  # "deal", "chat_session", "document"

    # Relationships
    user = relationship("User", back_populates="usage_records")
```

**Hot query:** "How many AI messages has user X used this billing period?"

```sql
SELECT COALESCE(SUM(quantity), 0)
FROM usage_records
WHERE user_id = $1
  AND usage_type = 'ai_message'
  AND period_start = $2;
```

Served by composite index `ix_usage_records_user_type_period` on `(user_id, usage_type, period_start)`.

---

### 3.8 WebhookEvent Model (NEW)

```python
# backend/models/webhook_events.py

"""WebhookEvent model -- idempotent log of every Stripe webhook processed.

The stripe_event_id unique constraint provides idempotency -- if Stripe retries
a webhook delivery, the handler checks for an existing row and skips reprocessing.
This is critical because Stripe guarantees at-least-once delivery, not exactly-once.
"""

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
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
    processed = Column(Boolean, nullable=False, default=False, server_default="false")
    processed_at = Column(DateTime, nullable=True)
    error = Column(Text, nullable=True)       # Error message if processing failed
    retry_count = Column(Integer, nullable=False, default=0, server_default="0")
```

**No soft delete, no FKs.** This table is append-only and immutable. Rows are never updated after `processed=True` is set (except `retry_count` on failure). There are no foreign keys because it references an external system (Stripe).

---

### 3.9 TeamInvitation Model (NEW)

```python
# backend/models/team_invitations.py

"""TeamInvitation model -- tracks team member invitations with secure token verification."""

from sqlalchemy import Column, DateTime, Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from database import Base
from models.base import TimestampMixin

InvitationStatus = Enum(
    "pending", "accepted", "expired", "revoked",
    name="invitationstatus",
)


class TeamInvitation(TimestampMixin, Base):
    """An invitation for a user to join a team, verified via hashed token."""

    __tablename__ = "team_invitations"

    team_id = Column(
        UUID(as_uuid=True), ForeignKey("teams.id"), nullable=False, index=True
    )
    email = Column(String(255), nullable=False)
    role = Column(
        Enum("admin", "member", name="inviterole"),
        nullable=False,
        default="member",
    )
    invited_by = Column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    token_hash = Column(String(64), nullable=False, unique=True)  # SHA-256 of invite token
    status = Column(InvitationStatus, nullable=False, default="pending", server_default="pending")
    expires_at = Column(DateTime, nullable=False)
    accepted_at = Column(DateTime, nullable=True)

    # Relationships
    team = relationship("Team", back_populates="invitations")
    inviter = relationship("User", foreign_keys=[invited_by])
```

---

### 3.10 Updated `models/__init__.py`

```python
# backend/models/__init__.py

"""Re-export all models so Alembic can discover them via Base.metadata."""

from models.users import User
from models.teams import Team
from models.team_members import TeamMember
from models.deals import Deal
from models.pipeline_entries import PipelineEntry
from models.documents import Document
from models.chat_messages import ChatMessage
from models.portfolio_entries import PortfolioEntry
from models.password_reset_tokens import PasswordResetToken

# Billing models
from models.subscription_plans import SubscriptionPlan
from models.subscriptions import Subscription
from models.invoices import Invoice
from models.payment_methods import PaymentMethod
from models.usage_records import UsageRecord
from models.webhook_events import WebhookEvent
from models.team_invitations import TeamInvitation

__all__ = [
    "User",
    "Team",
    "TeamMember",
    "Deal",
    "PipelineEntry",
    "Document",
    "ChatMessage",
    "PortfolioEntry",
    "PasswordResetToken",
    # Billing
    "SubscriptionPlan",
    "Subscription",
    "Invoice",
    "PaymentMethod",
    "UsageRecord",
    "WebhookEvent",
    "TeamInvitation",
]
```

---

## 4. Complete Index Definitions

All indexes are created in the Alembic migration. This is the consolidated list with purpose annotations.

| Table | Index Name | Columns | Type | Purpose |
|---|---|---|---|---|
| `users` | `ix_users_stripe_customer_id` | `stripe_customer_id` | UNIQUE | Lookup user by Stripe customer ID in webhook handlers |
| `subscription_plans` | `uq_plans_stripe_product_id` | `stripe_product_id` | UNIQUE | Prevent duplicate Stripe products |
| `subscription_plans` | `uq_plans_stripe_price_id` | `stripe_price_id` | UNIQUE | Prevent duplicate Stripe prices |
| `subscriptions` | `ix_subscriptions_user_id` | `user_id` | B-TREE | Find subscriptions for a user |
| `subscriptions` | `ix_subscriptions_stripe_subscription_id` | `stripe_subscription_id` | UNIQUE | Webhook: look up by Stripe sub ID |
| `subscriptions` | `ix_subscriptions_stripe_customer_id` | `stripe_customer_id` | B-TREE | Webhook: look up by Stripe cust ID |
| `subscriptions` | `ix_subscriptions_status` | `status` | B-TREE | Filter by status |
| `subscriptions` | `ix_subscriptions_one_active_per_user` | `user_id` WHERE status IN (...) | PARTIAL UNIQUE | **Critical:** enforce one active sub per user |
| `invoices` | `ix_invoices_user_id` | `user_id` | B-TREE | Billing page: list user invoices |
| `invoices` | `ix_invoices_stripe_invoice_id` | `stripe_invoice_id` | UNIQUE | Webhook: idempotent upsert |
| `invoices` | `ix_invoices_subscription_id` | `subscription_id` | B-TREE | List invoices for a subscription |
| `invoices` | `ix_invoices_status` | `status` | B-TREE | Filter unpaid invoices |
| `payment_methods` | `ix_payment_methods_user_id` | `user_id` | B-TREE | List user payment methods |
| `payment_methods` | `ix_payment_methods_stripe_id` | `stripe_payment_method_id` | UNIQUE | Webhook: idempotent upsert |
| `usage_records` | `ix_usage_records_user_id` | `user_id` | B-TREE | General user lookup |
| `usage_records` | `ix_usage_records_user_type_period` | `user_id, usage_type, period_start` | COMPOSITE | **Hot path:** quota check COUNT query |
| `webhook_events` | `ix_webhook_events_stripe_event_id` | `stripe_event_id` | UNIQUE | **Critical:** idempotency check |
| `webhook_events` | `ix_webhook_events_event_type` | `event_type` | B-TREE | Filter events by type |
| `webhook_events` | `ix_webhook_events_processed` | `processed` | B-TREE | Retry job: find unprocessed events |
| `teams` | `ix_teams_slug` | `slug` | UNIQUE | URL-safe team lookup |
| `teams` | `uq_teams_stripe_customer_id` | `stripe_customer_id` | UNIQUE | Webhook: lookup team by Stripe cust |
| `teams` | `uq_teams_stripe_subscription_id` | `stripe_subscription_id` | UNIQUE | Webhook: lookup team by Stripe sub |
| `team_invitations` | `ix_team_invitations_team_id` | `team_id` | B-TREE | List invitations for a team |
| `team_invitations` | `ix_team_invitations_token_hash` | `token_hash` | UNIQUE | Accept flow: look up by token hash |

---

## 5. Alembic Migration -- Migration 1: Plans + User Billing Columns + Team Extensions

```python
"""add billing infrastructure -- plans table, user billing columns, team extensions

Revision ID: e5f8a2c47d19
Revises: d4a7e3b58f12
Create Date: 2026-03-28

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers, used by Alembic.
revision: str = "e5f8a2c47d19"
down_revision: Union[str, Sequence[str], None] = "d4a7e3b58f12"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add billing columns to users/teams and create subscription_plans table."""

    # ── Enums ──────────────────────────────────────────────────────────────
    plantier = sa.Enum("free", "starter", "pro", "team", name="plantier")
    plantier.create(op.get_bind(), checkfirst=True)

    billinginterval = sa.Enum("month", "year", name="billinginterval")
    billinginterval.create(op.get_bind(), checkfirst=True)

    teamplan = sa.Enum("free", "solo_pro", "team", name="teamplan")
    teamplan.create(op.get_bind(), checkfirst=True)

    invitationstatus = sa.Enum(
        "pending", "accepted", "expired", "revoked", name="invitationstatus"
    )
    invitationstatus.create(op.get_bind(), checkfirst=True)

    inviterole = sa.Enum("admin", "member", name="inviterole")
    inviterole.create(op.get_bind(), checkfirst=True)

    # ── Users table: add Stripe + plan columns ────────────────────────────
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

    # ── Teams table: add billing + branding columns ───────────────────────
    op.add_column("teams", sa.Column("slug", sa.String(120), nullable=True))
    op.add_column(
        "teams", sa.Column("stripe_customer_id", sa.String(255), nullable=True)
    )
    op.add_column(
        "teams", sa.Column("stripe_subscription_id", sa.String(255), nullable=True)
    )
    op.add_column(
        "teams",
        sa.Column("plan", teamplan, nullable=False, server_default="free"),
    )
    op.add_column(
        "teams",
        sa.Column("seat_limit", sa.Integer(), nullable=False, server_default="1"),
    )
    op.add_column(
        "teams", sa.Column("brand_logo_url", sa.String(500), nullable=True)
    )
    op.add_column(
        "teams", sa.Column("brand_company_name", sa.String(200), nullable=True)
    )
    op.add_column(
        "teams", sa.Column("brand_primary_color", sa.String(7), nullable=True)
    )
    op.add_column("teams", sa.Column("deleted_at", sa.DateTime(), nullable=True))

    op.create_unique_constraint(
        "uq_teams_slug", "teams", ["slug"]
    )
    op.create_index("ix_teams_slug", "teams", ["slug"])
    op.create_unique_constraint(
        "uq_teams_stripe_customer_id", "teams", ["stripe_customer_id"]
    )
    op.create_unique_constraint(
        "uq_teams_stripe_subscription_id", "teams", ["stripe_subscription_id"]
    )

    # ── subscription_plans table ──────────────────────────────────────────
    op.create_table(
        "subscription_plans",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("name", sa.String(50), nullable=False),
        sa.Column("tier", plantier, nullable=False),
        sa.Column("billing_interval", billinginterval, nullable=False),
        sa.Column(
            "is_active", sa.Boolean(), nullable=False, server_default="true"
        ),
        sa.Column("price_cents", sa.Integer(), nullable=False),
        sa.Column(
            "currency", sa.String(3), nullable=False, server_default="usd"
        ),
        sa.Column("stripe_product_id", sa.String(), nullable=True),
        sa.Column("stripe_price_id", sa.String(), nullable=True),
        sa.Column("limits", JSONB(), nullable=False, server_default="{}"),
        sa.Column("description", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "stripe_product_id", name="uq_plans_stripe_product_id"
        ),
        sa.UniqueConstraint(
            "stripe_price_id", name="uq_plans_stripe_price_id"
        ),
    )

    # ── team_invitations table ────────────────────────────────────────────
    op.create_table(
        "team_invitations",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "team_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("role", inviterole, nullable=False, server_default="member"),
        sa.Column(
            "invited_by",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column(
            "status",
            invitationstatus,
            nullable=False,
            server_default="pending",
        ),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("accepted_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"]),
        sa.ForeignKeyConstraint(["invited_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_team_invitations_team_id", "team_invitations", ["team_id"]
    )
    op.create_index(
        "ix_team_invitations_token_hash",
        "team_invitations",
        ["token_hash"],
        unique=True,
    )


def downgrade() -> None:
    """Remove billing columns and reference tables."""
    # Drop tables (reverse dependency order)
    op.drop_index("ix_team_invitations_token_hash", table_name="team_invitations")
    op.drop_index("ix_team_invitations_team_id", table_name="team_invitations")
    op.drop_table("team_invitations")
    op.drop_table("subscription_plans")

    # Teams: drop billing columns
    op.drop_constraint("uq_teams_stripe_subscription_id", "teams", type_="unique")
    op.drop_constraint("uq_teams_stripe_customer_id", "teams", type_="unique")
    op.drop_index("ix_teams_slug", table_name="teams")
    op.drop_constraint("uq_teams_slug", "teams", type_="unique")
    op.drop_column("teams", "deleted_at")
    op.drop_column("teams", "brand_primary_color")
    op.drop_column("teams", "brand_company_name")
    op.drop_column("teams", "brand_logo_url")
    op.drop_column("teams", "seat_limit")
    op.drop_column("teams", "plan")
    op.drop_column("teams", "stripe_subscription_id")
    op.drop_column("teams", "stripe_customer_id")
    op.drop_column("teams", "slug")

    # Users: drop billing columns
    op.drop_index("ix_users_stripe_customer_id", table_name="users")
    op.drop_constraint("uq_users_stripe_customer_id", "users", type_="unique")
    op.drop_column("users", "plan_tier")
    op.drop_column("users", "stripe_customer_id")

    # Drop enums
    sa.Enum(name="inviterole").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="invitationstatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="teamplan").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="billinginterval").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="plantier").drop(op.get_bind(), checkfirst=True)
```

---

## 6. Alembic Migration -- Migration 2: Transactional Billing Tables

```python
"""add subscriptions, invoices, payment_methods, usage_records, webhook_events

Revision ID: f7a9b3d58e21
Revises: e5f8a2c47d19
Create Date: 2026-03-28

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision: str = "f7a9b3d58e21"
down_revision: Union[str, Sequence[str], None] = "e5f8a2c47d19"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create all billing transaction tables."""

    # ── Enums ──────────────────────────────────────────────────────────────
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

    # ── subscriptions ─────────────────────────────────────────────────────
    op.create_table(
        "subscriptions",
        sa.Column(
            "id",
            UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "user_id",
            UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "plan_id",
            UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("stripe_subscription_id", sa.String(), nullable=True),
        sa.Column("stripe_customer_id", sa.String(), nullable=True),
        sa.Column(
            "status", substatus, nullable=False, server_default="trialing"
        ),
        sa.Column("current_period_start", sa.DateTime(), nullable=True),
        sa.Column("current_period_end", sa.DateTime(), nullable=True),
        sa.Column("trial_start", sa.DateTime(), nullable=True),
        sa.Column("trial_end", sa.DateTime(), nullable=True),
        sa.Column("canceled_at", sa.DateTime(), nullable=True),
        sa.Column(
            "cancel_at_period_end",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
        sa.Column("ended_at", sa.DateTime(), nullable=True),
        sa.Column("cancel_reason", sa.String(), nullable=True),
        sa.Column("metadata", JSONB(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["plan_id"], ["subscription_plans.id"]),
        sa.PrimaryKeyConstraint("id"),
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

    # Partial unique index: max one active/trialing/past_due subscription per user.
    # This MUST be raw SQL because SQLAlchemy's Index(..., postgresql_where=...)
    # does not handle enum IN() cleanly across all Alembic versions.
    op.execute(text(
        """CREATE UNIQUE INDEX ix_subscriptions_one_active_per_user
           ON subscriptions (user_id)
           WHERE status IN ('trialing', 'active', 'past_due')"""
    ))

    # ── invoices ──────────────────────────────────────────────────────────
    op.create_table(
        "invoices",
        sa.Column(
            "id",
            UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("user_id", UUID(as_uuid=True), nullable=False),
        sa.Column("subscription_id", UUID(as_uuid=True), nullable=True),
        sa.Column("stripe_invoice_id", sa.String(), nullable=True),
        sa.Column("stripe_charge_id", sa.String(), nullable=True),
        sa.Column("stripe_payment_intent_id", sa.String(), nullable=True),
        sa.Column("amount_due", sa.Integer(), nullable=False),
        sa.Column(
            "amount_paid", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column(
            "currency", sa.String(3), nullable=False, server_default="usd"
        ),
        sa.Column(
            "status", invstatus, nullable=False, server_default="draft"
        ),
        sa.Column("paid_at", sa.DateTime(), nullable=True),
        sa.Column("period_start", sa.DateTime(), nullable=True),
        sa.Column("period_end", sa.DateTime(), nullable=True),
        sa.Column("hosted_invoice_url", sa.String(), nullable=True),
        sa.Column("invoice_pdf_url", sa.String(), nullable=True),
        sa.Column("line_items", JSONB(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["subscription_id"], ["subscriptions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_invoices_user_id", "invoices", ["user_id"])
    op.create_index(
        "ix_invoices_stripe_invoice_id",
        "invoices",
        ["stripe_invoice_id"],
        unique=True,
    )
    op.create_index(
        "ix_invoices_subscription_id", "invoices", ["subscription_id"]
    )
    op.create_index("ix_invoices_status", "invoices", ["status"])

    # ── payment_methods ───────────────────────────────────────────────────
    op.create_table(
        "payment_methods",
        sa.Column(
            "id",
            UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("user_id", UUID(as_uuid=True), nullable=False),
        sa.Column(
            "stripe_payment_method_id", sa.String(), nullable=False
        ),
        sa.Column("card_brand", sa.String(20), nullable=True),
        sa.Column("card_last_four", sa.String(4), nullable=True),
        sa.Column("card_exp_month", sa.Integer(), nullable=True),
        sa.Column("card_exp_year", sa.Integer(), nullable=True),
        sa.Column(
            "is_default",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_payment_methods_user_id", "payment_methods", ["user_id"]
    )
    op.create_index(
        "ix_payment_methods_stripe_id",
        "payment_methods",
        ["stripe_payment_method_id"],
        unique=True,
    )

    # ── usage_records ─────────────────────────────────────────────────────
    op.create_table(
        "usage_records",
        sa.Column(
            "id",
            UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("user_id", UUID(as_uuid=True), nullable=False),
        sa.Column("usage_type", usagetype, nullable=False),
        sa.Column(
            "quantity", sa.Integer(), nullable=False, server_default="1"
        ),
        sa.Column("period_start", sa.DateTime(), nullable=False),
        sa.Column("period_end", sa.DateTime(), nullable=False),
        sa.Column("resource_id", UUID(as_uuid=True), nullable=True),
        sa.Column("resource_type", sa.String(50), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_usage_records_user_id", "usage_records", ["user_id"]
    )
    op.create_index(
        "ix_usage_records_user_type_period",
        "usage_records",
        ["user_id", "usage_type", "period_start"],
    )

    # ── webhook_events ────────────────────────────────────────────────────
    op.create_table(
        "webhook_events",
        sa.Column(
            "id",
            UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("stripe_event_id", sa.String(), nullable=False),
        sa.Column("event_type", sa.String(), nullable=False),
        sa.Column("payload", JSONB(), nullable=False),
        sa.Column(
            "processed",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
        sa.Column("processed_at", sa.DateTime(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column(
            "retry_count", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_webhook_events_stripe_event_id",
        "webhook_events",
        ["stripe_event_id"],
        unique=True,
    )
    op.create_index(
        "ix_webhook_events_event_type", "webhook_events", ["event_type"]
    )
    op.create_index(
        "ix_webhook_events_processed", "webhook_events", ["processed"]
    )


def downgrade() -> None:
    """Drop all billing transaction tables and enums (reverse dependency order)."""
    # Drop indexes then tables
    op.drop_index("ix_webhook_events_processed", table_name="webhook_events")
    op.drop_index("ix_webhook_events_event_type", table_name="webhook_events")
    op.drop_index(
        "ix_webhook_events_stripe_event_id", table_name="webhook_events"
    )
    op.drop_table("webhook_events")

    op.drop_index(
        "ix_usage_records_user_type_period", table_name="usage_records"
    )
    op.drop_index("ix_usage_records_user_id", table_name="usage_records")
    op.drop_table("usage_records")

    op.drop_index(
        "ix_payment_methods_stripe_id", table_name="payment_methods"
    )
    op.drop_index("ix_payment_methods_user_id", table_name="payment_methods")
    op.drop_table("payment_methods")

    op.drop_index("ix_invoices_status", table_name="invoices")
    op.drop_index("ix_invoices_subscription_id", table_name="invoices")
    op.drop_index("ix_invoices_stripe_invoice_id", table_name="invoices")
    op.drop_index("ix_invoices_user_id", table_name="invoices")
    op.drop_table("invoices")

    # Drop partial unique index by name before dropping subscriptions table
    op.execute(
        text("DROP INDEX IF EXISTS ix_subscriptions_one_active_per_user")
    )
    op.drop_index("ix_subscriptions_status", table_name="subscriptions")
    op.drop_index(
        "ix_subscriptions_stripe_customer_id", table_name="subscriptions"
    )
    op.drop_index(
        "ix_subscriptions_stripe_subscription_id", table_name="subscriptions"
    )
    op.drop_index("ix_subscriptions_user_id", table_name="subscriptions")
    op.drop_table("subscriptions")

    # Drop enums
    sa.Enum(name="usagetype").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="invoicestatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="subscriptionstatus").drop(op.get_bind(), checkfirst=True)
```

---

## 7. Seed Data for subscription_plans

This is NOT in the migration -- it runs at application startup or via a separate data migration/management command. Plans should be seeded once and updated via admin tooling or Stripe webhook sync.

```python
# backend/core/billing/seed_plans.py

"""Seed the subscription_plans table with Parcel's initial plan definitions.

Run once after migrations: python -m core.billing.seed_plans
Or call seed_plans(db) from application startup.
"""

import uuid
from datetime import datetime

from database import SessionLocal
from models.subscription_plans import SubscriptionPlan


PLANS = [
    # ── Free ──────────────────────────────────────────────────────────
    {
        "name": "Free",
        "tier": "free",
        "billing_interval": "month",
        "is_active": True,
        "price_cents": 0,
        "limits": {
            "analyses_per_month": 3,
            "saved_deals": 5,
            "ai_messages_per_month": 0,
            "document_uploads_per_month": 3,
            "ai_chat_enabled": False,
            "pdf_export": False,
            "pipeline_enabled": False,
            "portfolio_enabled": False,
            "offer_letter": False,
            "share_deals": False,
            "team_seats": None,
            "custom_branding": False,
        },
        "description": "Get started with basic deal analysis.",
    },
    # ── Starter Monthly ───────────────────────────────────────────────
    {
        "name": "Starter Monthly",
        "tier": "starter",
        "billing_interval": "month",
        "is_active": True,
        "price_cents": 2900,
        "limits": {
            "analyses_per_month": 15,
            "saved_deals": 25,
            "ai_messages_per_month": 30,
            "document_uploads_per_month": 15,
            "ai_chat_enabled": True,
            "pdf_export": True,
            "pipeline_enabled": False,
            "portfolio_enabled": False,
            "offer_letter": True,
            "share_deals": True,
            "team_seats": None,
            "custom_branding": False,
        },
        "description": "For active investors analyzing multiple deals per month.",
    },
    # ── Starter Yearly ────────────────────────────────────────────────
    {
        "name": "Starter Yearly",
        "tier": "starter",
        "billing_interval": "year",
        "is_active": True,
        "price_cents": 27900,  # ~$23.25/mo, ~20% savings
        "limits": {
            "analyses_per_month": 15,
            "saved_deals": 25,
            "ai_messages_per_month": 30,
            "document_uploads_per_month": 15,
            "ai_chat_enabled": True,
            "pdf_export": True,
            "pipeline_enabled": False,
            "portfolio_enabled": False,
            "offer_letter": True,
            "share_deals": True,
            "team_seats": None,
            "custom_branding": False,
        },
        "description": "Starter plan, billed annually. Save ~20%.",
    },
    # ── Pro Monthly ───────────────────────────────────────────────────
    {
        "name": "Pro Monthly",
        "tier": "pro",
        "billing_interval": "month",
        "is_active": True,
        "price_cents": 6900,
        "limits": {
            "analyses_per_month": None,       # unlimited
            "saved_deals": None,              # unlimited
            "ai_messages_per_month": 150,
            "document_uploads_per_month": None,
            "ai_chat_enabled": True,
            "pdf_export": True,
            "pipeline_enabled": True,
            "portfolio_enabled": True,
            "offer_letter": True,
            "share_deals": True,
            "team_seats": None,
            "custom_branding": False,
        },
        "description": "Unlimited analyses with pipeline and portfolio tracking.",
    },
    # ── Pro Yearly ────────────────────────────────────────────────────
    {
        "name": "Pro Yearly",
        "tier": "pro",
        "billing_interval": "year",
        "is_active": True,
        "price_cents": 66900,  # ~$55.75/mo, ~19% savings
        "limits": {
            "analyses_per_month": None,
            "saved_deals": None,
            "ai_messages_per_month": 150,
            "document_uploads_per_month": None,
            "ai_chat_enabled": True,
            "pdf_export": True,
            "pipeline_enabled": True,
            "portfolio_enabled": True,
            "offer_letter": True,
            "share_deals": True,
            "team_seats": None,
            "custom_branding": False,
        },
        "description": "Pro plan, billed annually. Save ~19%.",
    },
    # ── Team Monthly ──────────────────────────────────────────────────
    {
        "name": "Team Monthly",
        "tier": "team",
        "billing_interval": "month",
        "is_active": True,
        "price_cents": 14900,  # $149/mo base (includes 5 seats)
        "limits": {
            "analyses_per_month": None,
            "saved_deals": None,
            "ai_messages_per_month": 500,
            "document_uploads_per_month": None,
            "ai_chat_enabled": True,
            "pdf_export": True,
            "pipeline_enabled": True,
            "portfolio_enabled": True,
            "offer_letter": True,
            "share_deals": True,
            "team_seats": 5,
            "custom_branding": True,
        },
        "description": "Collaborate with your team. 5 seats included, $29/additional seat.",
    },
    # ── Team Yearly ───────────────────────────────────────────────────
    {
        "name": "Team Yearly",
        "tier": "team",
        "billing_interval": "year",
        "is_active": True,
        "price_cents": 143900,  # ~$119.92/mo, ~20% savings
        "limits": {
            "analyses_per_month": None,
            "saved_deals": None,
            "ai_messages_per_month": 500,
            "document_uploads_per_month": None,
            "ai_chat_enabled": True,
            "pdf_export": True,
            "pipeline_enabled": True,
            "portfolio_enabled": True,
            "offer_letter": True,
            "share_deals": True,
            "team_seats": 5,
            "custom_branding": True,
        },
        "description": "Team plan, billed annually. Save ~20%.",
    },
]


def seed_plans(db=None):
    """Insert plan rows if they don't already exist. Idempotent."""
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    try:
        existing = {p.name for p in db.query(SubscriptionPlan.name).all()}
        for plan_data in PLANS:
            if plan_data["name"] not in existing:
                plan = SubscriptionPlan(
                    id=uuid.uuid4(),
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                    **plan_data,
                )
                db.add(plan)
        db.commit()
    finally:
        if close_db:
            db.close()


if __name__ == "__main__":
    seed_plans()
    print("Plans seeded successfully.")
```

---

## 8. Usage Counting Query Patterns

These are the two hot-path query patterns used by the billing gating system.

### 8a. Period-based usage (analyses, AI messages, uploads)

```python
from sqlalchemy import func
from uuid import UUID
from datetime import datetime


def get_usage_count(
    db, user_id: UUID, usage_type: str, period_start: datetime
) -> int:
    """Return total usage of a given type within the current billing period.

    Uses the composite index (user_id, usage_type, period_start).
    Expected latency: < 1ms for typical usage volumes.
    """
    from models.usage_records import UsageRecord

    result = db.query(
        func.coalesce(func.sum(UsageRecord.quantity), 0)
    ).filter(
        UsageRecord.user_id == user_id,
        UsageRecord.usage_type == usage_type,
        UsageRecord.period_start == period_start,
    ).scalar()
    return result
```

### 8b. Total-count usage (saved deals -- not period-based)

```python
def get_saved_deals_count(db, user_id: UUID) -> int:
    """Return the number of non-deleted deals for a user.

    This is a total count, not period-based. Free tier limits total saved deals.
    """
    from models.deals import Deal

    return db.query(Deal).filter(
        Deal.user_id == user_id,
        Deal.deleted_at.is_(None),
    ).count()
```

### 8c. Free-tier period computation

Free-tier users have no Stripe subscription, so their billing period is a rolling calendar month anchored to their `created_at` date.

```python
from datetime import datetime
from dateutil.relativedelta import relativedelta


def get_free_tier_period(user_created_at: datetime, now: datetime = None):
    """Calculate the current billing period for a free-tier user.

    Anchored to the user's account creation day (clamped to 28 to avoid
    month-end edge cases).
    """
    if now is None:
        now = datetime.utcnow()
    anchor_day = min(user_created_at.day, 28)
    period_start = now.replace(
        day=anchor_day, hour=0, minute=0, second=0, microsecond=0
    )
    if period_start > now:
        period_start -= relativedelta(months=1)
    period_end = period_start + relativedelta(months=1)
    return period_start, period_end
```

---

## 9. Design Decisions Log

| Decision | Choice | Rationale |
|---|---|---|
| Subscription history | One-to-many (multiple rows per user) | Need upgrade/downgrade/cancel history for support, analytics, and revenue reporting |
| Source of truth | Stripe via webhooks | Stripe handles payment retry, dunning, proration, tax. Local DB is a synchronized read cache |
| Plan limits storage | JSONB on `subscription_plans` | New limits are data updates, not schema migrations. Runtime validation via `TierLimits` dataclass |
| `plan_tier` on User model | Denormalized from subscriptions | Avoids a JOIN on every authenticated request. Updated atomically by webhook handlers |
| Usage counting | PostgreSQL COUNT with composite index | No Redis needed at Parcel's scale. Transactional consistency: usage event rolls back if action fails |
| Soft delete on billing tables | No -- use status transitions | Billing rows are never deleted. Canceled subs get `status='canceled'` + `ended_at`. Required for audit/tax |
| Partial unique index | `WHERE status IN ('trialing', 'active', 'past_due')` | Database-level enforcement of one active subscription per user. Application code cannot violate this |
| Webhook idempotency | `stripe_event_id` unique constraint on `webhook_events` | Stripe guarantees at-least-once delivery. Unique constraint prevents duplicate processing |
| Money storage | Integer cents (not floats/decimals) | Avoids floating point rounding. `6900` = `$69.00`. Consistent with Stripe's API |
| Team billing entity | Extend existing `teams` table | Every paying account is a "team" (solo = 1 seat). Avoids two billing code paths |
| Team invitation security | SHA-256 hash of token stored, raw token in email link | Same pattern as `password_reset_tokens`. Raw token never stored in DB |

---

## CRITICAL DECISIONS

These are choices that need Ivan's explicit input before implementation begins.

### 1. Pricing Tiers and Amounts
The seed data above uses placeholder prices from the research docs:
- **Free:** $0 (3 analyses/mo, 5 deals, no AI chat)
- **Starter:** $29/mo (15 analyses/mo, 25 deals, 30 AI messages/mo)
- **Pro:** $69/mo (unlimited analyses/deals, 150 AI messages/mo, pipeline + portfolio)
- **Team:** $149/mo base + $29/extra seat (unlimited, 500 AI messages/mo, 5 seats, branding)

**Need confirmation:** Are these the final prices? The tier names (Free/Starter/Pro/Team) vs the two-tier model (Free/Pro) mentioned in agent-17?

### 2. Four Tiers vs Two Tiers
Agent-04 (feature gating) defines four tiers: Free, Starter, Pro, Team. Agent-17 (codebase integration) references only Free and Pro. The schema supports four tiers via the `plantier` enum. **Which tier structure ships at launch?** If only Free + Pro at launch, we can seed plans for just those two and add Starter/Team later without a migration (the enum already includes them).

### 3. Trial Period
The schema supports `trial_start`/`trial_end` on subscriptions and `trialing` status. **What is the trial duration?** 14 days is coded as the default in the research, but this needs confirmation. Also: does the trial require a payment method upfront (Stripe's `payment_behavior: 'default_incomplete'`) or is it no-card-required?

### 4. Team Billing Entity vs User Billing Entity
The schema has billing columns on BOTH `users` (individual `stripe_customer_id`, `plan_tier`) AND `teams` (team `stripe_customer_id`, `stripe_subscription_id`, `plan`). **Which is the billing entity?**
- **Option A (recommended):** User is the billing entity for Free/Starter/Pro. Team is the billing entity for Team tier only. Webhook handlers check both.
- **Option B:** Always use the team as billing entity (every user is a 1-person team). Simpler but requires auto-creating a team on registration.

### 5. TeamMember Role Rename
Existing `team_members.role` enum has values: `owner`, `analyst`, `viewer`. Agent-16 proposes renaming to `owner`, `admin`, `member`. **Should we rename existing enum values?** This requires an Alembic migration that runs `ALTER TYPE teammemberrole RENAME VALUE 'analyst' TO 'admin'` (PostgreSQL 10+). Existing team data will be affected.

### 6. `teams.slug` -- Required or Optional?
The schema adds `slug` as nullable to avoid breaking existing team rows. **Should it be required going forward?** If so, a data migration needs to backfill slugs for existing teams (e.g., slugify the team name). The slug enables URL-friendly team references like `/teams/acme-investments`.

### 7. Demo Account Plan Tier
Agent-17 recommends setting the demo user's `plan_tier` to `"demo"` -- a special value that bypasses all billing gates. **Should `"demo"` be added to the `plantier` enum?** Alternative: keep demo user as `plan_tier="pro"` and rely on the existing `is_demo_user()` check to bypass billing. The enum change is cleaner but adds a tier value that is not a real billing plan.

### 8. `payment_methods` Table -- Needed at Launch?
Stripe Checkout + Billing Portal handle all payment method management server-side. The `payment_methods` table stores card display metadata for showing "Visa ending in 4242" in the Parcel UI. **Is this needed at launch, or can it be added later?** Removing it from the initial migration simplifies the schema by one table.

### 9. Annual Billing at Launch?
The schema and seed data include yearly plans. **Does Parcel launch with monthly-only or both monthly + yearly?** If monthly-only at launch, we can skip seeding yearly plan rows and simplify the initial Stripe product/price setup.

### 10. Usage Record Granularity
The current design creates one `usage_records` row per event (one row per chat message, one per analysis). An alternative is a counter-based approach: one row per `(user_id, usage_type, period_start)` with an incrementing `quantity` field. **Which approach?**
- **Event-based (current):** More rows, easier to audit, supports linking to `resource_id`/`resource_type`
- **Counter-based:** Fewer rows, simpler queries, but loses individual event audit trail

The schema supports both patterns -- the `quantity` field defaults to 1 for event-based but can be incremented for counter-based. This is a code-level decision, not a schema change.
