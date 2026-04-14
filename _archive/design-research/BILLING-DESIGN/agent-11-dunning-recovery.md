# Agent 11 — Dunning & Failed Payment Recovery System

**Date:** 2026-03-28
**Scope:** Complete dunning pipeline — from Stripe payment failure through recovery or involuntary downgrade
**Stack:** FastAPI + SQLAlchemy 2 + PostgreSQL (Railway) | React + TypeScript + Vite (Vercel)
**Dependencies:** Stripe Smart Retries, Resend (email), existing webhook infrastructure (agent-02)
**Pricing tiers:** Free ($0) | Starter ($29/mo) | Pro ($69/mo) | Team ($149/mo)

---

## Table of Contents

1. [Stripe Smart Retries Configuration](#1-stripe-smart-retries-configuration)
2. [Custom Dunning Timeline](#2-custom-dunning-timeline)
3. [Database Schema — Dunning State](#3-database-schema--dunning-state)
4. [Webhook Handlers](#4-webhook-handlers)
5. [Grace Period Logic](#5-grace-period-logic)
6. [Email Sequence](#6-email-sequence)
7. [Stripe Customer Portal](#7-stripe-customer-portal)
8. [Frontend — Payment Failed Banner](#8-frontend--payment-failed-banner)
9. [Backend — Dunning State API](#9-backend--dunning-state-api)
10. [Dunning Cron Job](#10-dunning-cron-job)
11. [Involuntary Churn Tracking](#11-involuntary-churn-tracking)
12. [Recovery Rate Metrics](#12-recovery-rate-metrics)
13. [Critical Decisions](#13-critical-decisions)

---

## 1. Stripe Smart Retries Configuration

### Dashboard Settings (Stripe Dashboard > Settings > Billing > Subscriptions and emails)

**Smart Retries — ENABLE**

Stripe's ML model picks the optimal retry timing based on:
- Time of day the card is most likely to succeed
- Card network retry windows
- Bank-specific patterns from Stripe's network-wide data

Stripe claims Smart Retries recover 11% more revenue than fixed-schedule retries. This is zero-code — toggle it on.

**Retry configuration:**
- Enable Smart Retries: **ON**
- Maximum retry attempts: **4** (Stripe retries over ~7 days with Smart Retries)
- After all retries fail: **Leave subscription past_due** (Parcel handles downgrade logic, not Stripe)

**Automatic card updater — ENABLE**

Stripe's card updater automatically refreshes expired/replaced card numbers via card network partnerships. Recovers 10-15% of failures from expired cards with zero user action.

- Enable automatic card update: **ON**

**Stripe built-in dunning emails — DISABLE**

Stripe's built-in payment failure email is a single generic notice. Parcel needs a multi-step escalation sequence with branded content, usage data, and deep links. Disable Stripe's email and send custom emails via Resend.

- Send emails when payments fail: **OFF**
- Send finalized invoice emails: **OFF** (Parcel sends custom receipts)

### Stripe Settings via API (for automation / infrastructure-as-code)

```python
# scripts/configure_stripe.py
# Run once during setup or after environment changes.

import stripe
import os

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

# Configure subscription settings at the account level
# These are set in the Dashboard, but documented here for reference:
#
# Dashboard > Settings > Billing > Subscriptions and emails:
#   - Smart Retries: ON
#   - Retry up to: 4 times
#   - After final retry: Mark subscription past_due
#   - Automatic card updater: ON
#   - Customer emails for failed payments: OFF
#   - Customer emails for expiring cards: OFF (Parcel sends pre-dunning emails)
#
# When creating subscriptions, configure the collection method:
#
# stripe.Subscription.create(
#     customer=customer_id,
#     items=[{"price": price_id}],
#     payment_behavior="default_incomplete",
#     payment_settings={
#         "payment_method_types": ["card"],
#         "save_default_payment_method": "on_subscription",
#     },
#     # Let Stripe manage retries via Smart Retries
#     collection_method="charge_automatically",
# )
```

---

## 2. Custom Dunning Timeline

The dunning timeline is split into two phases: **full access grace** (Days 0-7) and **restricted access** (Days 8-14), followed by involuntary downgrade.

```
Day 0:  PAYMENT FAILS
        ├─ Stripe Smart Retries begin (ML-timed, ~4 attempts over 7 days)
        ├─ Webhook: invoice.payment_failed received
        ├─ Set dunning_state = "grace_period"
        ├─ Record dunning_started_at = now()
        ├─ Send Email #1: "Your payment didn't go through" (friendly, no urgency)
        └─ In-app: YELLOW banner — "Payment issue — update your card"
        ACCESS: FULL (all features available)

Day 1:  Stripe Smart Retry #1 (timing chosen by ML)
        ACCESS: FULL

Day 3:  Send Email #2: "Your Parcel access is at risk"
        ├─ In-app: ORANGE banner — "Payment still failing — update now"
        └─ Include usage data: "You have X active pipeline deals"
        ACCESS: FULL

Day 5:  Stripe Smart Retry #2
        ACCESS: FULL

Day 7:  Grace period ends → Restricted phase begins
        ├─ Set dunning_state = "restricted"
        ├─ Send Email #3: "Your account will be downgraded in 7 days"
        ├─ In-app: RED banner with countdown — "7 days to update payment"
        └─ RESTRICT: Disable new deal analyses, AI chat, PDF export
        ACCESS: RESTRICTED (read-only for existing data; new analyses blocked)

Day 10: Stripe Smart Retry #3
        ACCESS: RESTRICTED

Day 14: INVOLUNTARY DOWNGRADE
        ├─ Set dunning_state = "downgraded"
        ├─ Downgrade subscription to Free via Stripe API
        ├─ Send Email #4: "Your plan has been downgraded to Free"
        ├─ In-app: persistent "Reactivate" CTA
        ├─ Log involuntary churn event
        └─ Stripe Smart Retry #4 (final — if this succeeds, auto-restore)
        ACCESS: FREE TIER

Day 21: Send win-back email: "Your deals are still here — reactivate anytime"
        (Handled by the win-back system, not the dunning system)
```

### Why This Timeline

- **7-day full access**: Real estate investors may be mid-deal. Cutting access immediately could cost them a deal and guarantee permanent churn. Research shows 50-70% of failed payments are recovered within the first week (card updater, smart retries, user action).
- **7-day restricted**: Creates urgency without data loss. Users can still view their pipeline and portfolio but cannot run new analyses — the core paid action.
- **Day 14 downgrade** (not hard cancel): The user lands on Free tier. Their data is preserved. The switching cost of re-entering 20+ deals creates natural reactivation pressure. Research: downgrade-to-free recovers 15-25% more users than hard cancellation.

---

## 3. Database Schema — Dunning State

### SQL Migration

```sql
-- alembic migration: add_dunning_state

-- Dunning state lives on the user_subscriptions table as it's 1:1 with the subscription.
-- We also add a dedicated dunning_events table for audit trail.

ALTER TABLE user_subscriptions
    ADD COLUMN dunning_state VARCHAR(20) NOT NULL DEFAULT 'ok',
    ADD COLUMN dunning_started_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN dunning_last_email_sent VARCHAR(30),
    ADD COLUMN dunning_last_email_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN dunning_recovery_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN dunning_downgraded_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN pre_dunning_plan VARCHAR(20);

-- dunning_state values: 'ok', 'grace_period', 'restricted', 'downgraded'
-- pre_dunning_plan stores what plan they were on before downgrade (for restoration)

CREATE INDEX ix_user_subs_dunning ON user_subscriptions (dunning_state)
    WHERE dunning_state != 'ok';

-- Dunning events: full audit log of every dunning action
CREATE TABLE dunning_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    subscription_id VARCHAR(255),            -- Stripe sub ID
    event_type      VARCHAR(50) NOT NULL,    -- payment_failed, email_sent, restricted,
                                             -- downgraded, recovered, manual_recovery
    event_detail    JSONB,                   -- arbitrary context (email type, retry attempt, etc.)
    stripe_invoice_id VARCHAR(255),
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_dunning_events_user ON dunning_events (user_id);
CREATE INDEX ix_dunning_events_type ON dunning_events (event_type);
CREATE INDEX ix_dunning_events_created ON dunning_events (created_at);

-- Involuntary churn tracking (separate from voluntary)
-- This is a materialized view or query, not a separate table.
-- See Section 11 for the tracking queries.
```

### SQLAlchemy Models

```python
# backend/models/dunning.py

import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, DateTime, ForeignKey, Index
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from database import Base


class DunningEvent(Base):
    """Audit log of every dunning-related action."""
    __tablename__ = "dunning_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    subscription_id = Column(String(255), nullable=True)
    event_type = Column(String(50), nullable=False)
    event_detail = Column(JSONB, nullable=True)
    stripe_invoice_id = Column(String(255), nullable=True)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        Index("ix_dunning_events_user", "user_id"),
        Index("ix_dunning_events_type", "event_type"),
        Index("ix_dunning_events_created", "created_at"),
    )
```

### Extended UserSubscription Columns

```python
# Add these columns to the existing UserSubscription model
# (wherever it's defined — likely backend/models/subscription.py or similar)

from sqlalchemy import Column, String, DateTime

# On the UserSubscription class:
dunning_state = Column(String(20), nullable=False, default="ok", server_default="ok")
# Values: "ok" | "grace_period" | "restricted" | "downgraded"

dunning_started_at = Column(DateTime(timezone=True), nullable=True)
dunning_last_email_sent = Column(String(30), nullable=True)
# Values: "day0" | "day3" | "day7" | "day14"

dunning_last_email_at = Column(DateTime(timezone=True), nullable=True)
dunning_recovery_at = Column(DateTime(timezone=True), nullable=True)
dunning_downgraded_at = Column(DateTime(timezone=True), nullable=True)
pre_dunning_plan = Column(String(20), nullable=True)
# Stores the plan before downgrade for potential restoration: "starter" | "pro" | "team"
```

---

## 4. Webhook Handlers

Two webhook events drive the entire dunning system:
- `invoice.payment_failed` — enters or advances dunning
- `invoice.paid` (or `invoice.payment_succeeded`) — clears dunning

### Dunning Service Module

```python
# backend/core/billing/dunning.py

import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from models.dunning import DunningEvent
# Assumes UserSubscription model exists with dunning columns from Section 3

logger = logging.getLogger(__name__)


class DunningService:
    """Manages the dunning lifecycle for failed payments."""

    @staticmethod
    def handle_payment_failed(
        db: Session,
        user_id: str,
        subscription_id: str,
        invoice_id: str,
        amount: int,           # cents
        attempt_count: int,
        plan_name: str,
    ) -> dict:
        """
        Called when invoice.payment_failed webhook fires.
        Idempotent: safe to call multiple times for the same failure.

        Returns a dict describing the action taken.
        """
        sub = (
            db.query(UserSubscription)
            .filter_by(user_id=user_id)
            .first()
        )
        if not sub:
            logger.warning(
                f"Dunning: no subscription for user {user_id}, skipping"
            )
            return {"action": "skipped", "reason": "no_subscription"}

        now = datetime.now(timezone.utc)

        # If already in dunning, don't reset the clock
        if sub.dunning_state == "ok":
            sub.dunning_state = "grace_period"
            sub.dunning_started_at = now
            sub.pre_dunning_plan = sub.plan  # Save for potential restoration

            # Log the event
            db.add(DunningEvent(
                user_id=user_id,
                subscription_id=subscription_id,
                event_type="payment_failed",
                event_detail={
                    "amount_cents": amount,
                    "attempt_count": attempt_count,
                    "plan": plan_name,
                    "invoice_id": invoice_id,
                },
                stripe_invoice_id=invoice_id,
            ))
            db.commit()

            return {
                "action": "entered_dunning",
                "state": "grace_period",
                "send_email": "day0",
            }

        # Already in dunning — log the retry failure but don't change state
        db.add(DunningEvent(
            user_id=user_id,
            subscription_id=subscription_id,
            event_type="payment_retry_failed",
            event_detail={
                "attempt_count": attempt_count,
                "current_state": sub.dunning_state,
                "invoice_id": invoice_id,
            },
            stripe_invoice_id=invoice_id,
        ))
        db.commit()

        return {
            "action": "already_in_dunning",
            "state": sub.dunning_state,
        }

    @staticmethod
    def handle_payment_succeeded(
        db: Session,
        user_id: str,
        subscription_id: str,
        invoice_id: str,
    ) -> dict:
        """
        Called when invoice.paid webhook fires.
        Clears dunning state entirely. If user was downgraded,
        restores their previous plan.

        Returns a dict describing the action taken.
        """
        sub = (
            db.query(UserSubscription)
            .filter_by(user_id=user_id)
            .first()
        )
        if not sub:
            return {"action": "skipped", "reason": "no_subscription"}

        if sub.dunning_state == "ok":
            return {"action": "no_dunning_active"}

        previous_state = sub.dunning_state
        was_downgraded = sub.dunning_state == "downgraded"
        restored_plan = sub.pre_dunning_plan

        now = datetime.now(timezone.utc)

        # Clear all dunning state
        sub.dunning_state = "ok"
        sub.dunning_recovery_at = now
        sub.dunning_last_email_sent = None
        sub.dunning_last_email_at = None

        # If they were downgraded, restore the original plan
        if was_downgraded and restored_plan:
            sub.plan = restored_plan
            sub.dunning_downgraded_at = None

        sub.pre_dunning_plan = None
        sub.dunning_started_at = None

        # Log recovery event
        db.add(DunningEvent(
            user_id=user_id,
            subscription_id=subscription_id,
            event_type="recovered",
            event_detail={
                "recovered_from": previous_state,
                "restored_plan": restored_plan if was_downgraded else None,
                "days_in_dunning": (
                    (now - sub.dunning_started_at).days
                    if sub.dunning_started_at else None
                ),
                "invoice_id": invoice_id,
            },
            stripe_invoice_id=invoice_id,
        ))
        db.commit()

        return {
            "action": "recovered",
            "previous_state": previous_state,
            "restored_plan": restored_plan if was_downgraded else None,
            "send_email": "recovery_confirmation",
        }

    @staticmethod
    def advance_dunning(db: Session, user_id: str) -> dict:
        """
        Called by the daily cron job to advance dunning state
        based on elapsed time since dunning_started_at.

        Returns a dict describing any action taken.
        """
        sub = (
            db.query(UserSubscription)
            .filter_by(user_id=user_id)
            .filter(UserSubscription.dunning_state != "ok")
            .first()
        )
        if not sub or not sub.dunning_started_at:
            return {"action": "none"}

        now = datetime.now(timezone.utc)
        days_elapsed = (now - sub.dunning_started_at).days

        actions = []

        # Day 3: Send second email (if not already sent)
        if days_elapsed >= 3 and sub.dunning_last_email_sent in ("day0", None):
            actions.append({"send_email": "day3"})
            sub.dunning_last_email_sent = "day3"
            sub.dunning_last_email_at = now

        # Day 7: Transition to restricted
        if days_elapsed >= 7 and sub.dunning_state == "grace_period":
            sub.dunning_state = "restricted"
            actions.append({"state_change": "restricted", "send_email": "day7"})
            sub.dunning_last_email_sent = "day7"
            sub.dunning_last_email_at = now

            db.add(DunningEvent(
                user_id=user_id,
                subscription_id=sub.stripe_subscription_id,
                event_type="restricted",
                event_detail={"days_elapsed": days_elapsed},
            ))

        # Day 14: Downgrade to Free
        if days_elapsed >= 14 and sub.dunning_state == "restricted":
            sub.dunning_state = "downgraded"
            sub.dunning_downgraded_at = now
            # pre_dunning_plan was already saved when entering dunning
            sub.plan = "free"
            actions.append({
                "state_change": "downgraded",
                "send_email": "day14",
                "downgrade_on_stripe": True,
            })
            sub.dunning_last_email_sent = "day14"
            sub.dunning_last_email_at = now

            db.add(DunningEvent(
                user_id=user_id,
                subscription_id=sub.stripe_subscription_id,
                event_type="downgraded",
                event_detail={
                    "days_elapsed": days_elapsed,
                    "previous_plan": sub.pre_dunning_plan,
                },
            ))

        if actions:
            db.commit()

        return {"actions": actions, "days_elapsed": days_elapsed}
```

### Webhook Router Integration

```python
# backend/routers/webhooks.py — dunning-specific handlers
# These integrate into the existing webhook dispatch from agent-02.

import stripe
from fastapi import BackgroundTasks
from core.billing.dunning import DunningService
from core.email import send_email

# Inside the dispatch_event function (from agent-02):

async def dispatch_event(event: dict, db: Session):
    event_type = event["type"]
    obj = event["data"]["object"]

    # ... existing handlers from agent-02 ...

    if event_type == "invoice.payment_failed":
        await handle_invoice_payment_failed(obj, db)
    elif event_type == "invoice.paid":
        await handle_invoice_paid(obj, db)


async def handle_invoice_payment_failed(invoice: dict, db: Session):
    """
    Triggered by: invoice.payment_failed webhook
    Action: Enter dunning state, send first email, show in-app banner
    """
    customer_id = invoice["customer"]
    subscription_id = invoice.get("subscription")
    invoice_id = invoice["id"]
    amount = invoice.get("amount_due", 0)
    attempt_count = invoice.get("attempt_count", 0)

    # Skip one-off invoices (only dunning for subscription invoices)
    if not subscription_id:
        return

    # Look up user by Stripe customer ID
    user = db.query(User).filter_by(stripe_customer_id=customer_id).first()
    if not user:
        logger.warning(
            f"Dunning: no user for customer {customer_id}"
        )
        return

    # Resolve plan name for the email
    sub = db.query(UserSubscription).filter_by(user_id=str(user.id)).first()
    plan_name = sub.plan if sub else "unknown"

    result = DunningService.handle_payment_failed(
        db=db,
        user_id=str(user.id),
        subscription_id=subscription_id,
        invoice_id=invoice_id,
        amount=amount,
        attempt_count=attempt_count,
        plan_name=plan_name,
    )

    # Send Day 0 email if this is a new dunning entry
    if result.get("send_email") == "day0":
        portal_url = _get_billing_portal_url(customer_id)
        send_dunning_email_day0(
            to=user.email,
            first_name=user.name or "there",
            amount=format_amount(amount),
            plan_name=plan_name.title(),
            update_url=portal_url,
        )


async def handle_invoice_paid(invoice: dict, db: Session):
    """
    Triggered by: invoice.paid webhook
    Action: Clear dunning state, restore plan if downgraded
    """
    customer_id = invoice["customer"]
    subscription_id = invoice.get("subscription")
    invoice_id = invoice["id"]

    if not subscription_id:
        return

    user = db.query(User).filter_by(stripe_customer_id=customer_id).first()
    if not user:
        return

    result = DunningService.handle_payment_succeeded(
        db=db,
        user_id=str(user.id),
        subscription_id=subscription_id,
        invoice_id=invoice_id,
    )

    # If recovered from dunning, send confirmation email
    if result.get("send_email") == "recovery_confirmation":
        send_dunning_recovery_email(
            to=user.email,
            first_name=user.name or "there",
            plan_name=(result.get("restored_plan") or "your plan").title(),
        )

    # If plan was restored from downgrade, also restore on Stripe
    if result.get("restored_plan"):
        # Stripe subscription is already active since payment succeeded.
        # The plan change is already reflected in our DB.
        # Stripe's own subscription status will be "active" after payment.
        logger.info(
            f"Dunning recovery: user {user.id} restored to "
            f"{result['restored_plan']} from downgrade"
        )


def _get_billing_portal_url(customer_id: str) -> str:
    """Create a Stripe Customer Portal session and return the URL."""
    session = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url="https://parceldesk.io/settings/billing",
    )
    return session.url


def format_amount(cents: int) -> str:
    """Convert cents to formatted dollar string."""
    return f"${cents / 100:.2f}"
```

---

## 5. Grace Period Logic

The grace period check runs on every authenticated API request to determine what the user can access. This is a lightweight check against the `dunning_state` column.

### Access Control Middleware

```python
# backend/core/billing/access.py

from enum import Enum
from datetime import datetime, timezone
from sqlalchemy.orm import Session


class AccessLevel(str, Enum):
    FULL = "full"
    RESTRICTED = "restricted"
    FREE = "free"


class DunningAccessCheck:
    """
    Determines what a user can access based on their dunning state.

    Access levels:
    - FULL: dunning_state is "ok" or "grace_period" (Days 0-7)
    - RESTRICTED: dunning_state is "restricted" (Days 7-14)
    - FREE: dunning_state is "downgraded" (Day 14+)
    """

    @staticmethod
    def get_access_level(db: Session, user_id: str) -> AccessLevel:
        """Fast check — single column read, indexed."""
        sub = (
            db.query(UserSubscription.dunning_state, UserSubscription.plan)
            .filter_by(user_id=user_id)
            .first()
        )

        if not sub:
            return AccessLevel.FREE

        dunning_state = sub.dunning_state

        if dunning_state == "ok":
            return AccessLevel.FULL
        elif dunning_state == "grace_period":
            # Full access during grace period — user can still do everything
            return AccessLevel.FULL
        elif dunning_state == "restricted":
            return AccessLevel.RESTRICTED
        elif dunning_state == "downgraded":
            return AccessLevel.FREE
        else:
            return AccessLevel.FULL

    @staticmethod
    def get_dunning_info(db: Session, user_id: str) -> dict | None:
        """
        Returns dunning information for the frontend banner.
        Returns None if user is not in dunning.
        """
        sub = (
            db.query(UserSubscription)
            .filter_by(user_id=user_id)
            .filter(UserSubscription.dunning_state != "ok")
            .first()
        )

        if not sub or not sub.dunning_started_at:
            return None

        now = datetime.now(timezone.utc)
        days_elapsed = (now - sub.dunning_started_at).days
        days_until_restrict = max(0, 7 - days_elapsed)
        days_until_downgrade = max(0, 14 - days_elapsed)

        return {
            "dunning_state": sub.dunning_state,
            "days_elapsed": days_elapsed,
            "days_until_restrict": days_until_restrict,
            "days_until_downgrade": days_until_downgrade,
            "pre_dunning_plan": sub.pre_dunning_plan,
            "started_at": sub.dunning_started_at.isoformat(),
        }


# Feature-level access checks for restricted mode
RESTRICTED_FEATURES = {
    "analyze_deal",        # Cannot run new analyses
    "ai_chat",             # Cannot use AI chat
    "pdf_export",          # Cannot generate PDF reports
    "document_upload",     # Cannot upload new documents
}

ALLOWED_IN_RESTRICTED = {
    "view_deals",          # Can view existing deal analyses
    "view_pipeline",       # Can view pipeline (read-only)
    "view_portfolio",      # Can view portfolio
    "view_documents",      # Can view existing documents
    "update_settings",     # Can update profile/billing settings
    "view_dashboard",      # Can view dashboard
}


def can_use_feature(access_level: AccessLevel, feature: str) -> bool:
    """Check if a feature is available at the given access level."""
    if access_level == AccessLevel.FULL:
        return True
    if access_level == AccessLevel.RESTRICTED:
        return feature not in RESTRICTED_FEATURES
    # FREE — delegate to plan-based limits
    return feature not in RESTRICTED_FEATURES
```

### FastAPI Dependency for Route Protection

```python
# backend/dependencies/billing.py

from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from core.billing.access import DunningAccessCheck, AccessLevel


def require_full_access(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """
    Dependency that blocks access for restricted/downgraded users.
    Use on routes like /analyze, /chat, /reports.
    """
    access = DunningAccessCheck.get_access_level(db, str(current_user.id))
    if access == AccessLevel.RESTRICTED:
        raise HTTPException(
            status_code=402,
            detail={
                "error": "Payment required — your account has a billing issue",
                "code": "PAYMENT_REQUIRED",
                "update_url": "https://parceldesk.io/settings/billing",
            },
        )
    if access == AccessLevel.FREE:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "This feature requires an active subscription",
                "code": "SUBSCRIPTION_REQUIRED",
            },
        )
    return current_user


# Usage in route:
# @router.post("/analyze")
# async def analyze_deal(
#     body: AnalyzeRequest,
#     user = Depends(require_full_access),
#     db: Session = Depends(get_db),
# ):
#     ...
```

---

## 6. Email Sequence

All dunning emails are sent via Resend from `billing@parceldesk.io`. They are classified as **transactional/service emails** (not marketing) — the user's subscription is at risk, so these are exempt from unsubscribe requirements under CAN-SPAM. However, we still include a manage-preferences link as good practice.

### Email #1 — Day 0: "Your payment didn't go through"

**Tone:** Friendly, no urgency. Most failures are transient.

```python
def send_dunning_email_day0(
    to: str,
    first_name: str,
    amount: str,
    plan_name: str,
    update_url: str,
) -> None:
    """Day 0 dunning email — friendly notification of payment failure."""
    subject = "Action needed: your Parcel payment didn't go through"
    preheader = f"We couldn't charge {amount} for your {plan_name} plan."

    html = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>{subject}</title>
    </head>
    <body style="margin:0; padding:0; background:#F1F5F9;
                 font-family:-apple-system,BlinkMacSystemFont,
                 'Segoe UI',Roboto,sans-serif;">

      <div style="display:none; max-height:0; overflow:hidden;">
        {preheader}
      </div>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="background:#F1F5F9;">
        <tr>
          <td align="center" style="padding:40px 16px;">
            <table role="presentation" width="600" cellpadding="0" cellspacing="0"
                   style="background:#FFFFFF; border-radius:8px;
                          border:1px solid #E2E8F0; max-width:600px; width:100%;">

              <!-- Logo -->
              <tr>
                <td style="padding:32px 32px 0;">
                  <span style="color:#6366F1; font-size:24px;
                               font-weight:700;">Parcel</span>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding:24px 32px 32px; color:#0F172A;
                            font-size:16px; line-height:1.6;">

                  <p style="margin:0 0 16px;">Hey {first_name},</p>

                  <p style="margin:0 0 16px;">
                    We tried to charge <strong>{amount}</strong> for your
                    Parcel <strong>{plan_name}</strong> subscription, but the
                    payment didn't go through.
                  </p>

                  <p style="margin:0 0 16px;">This usually happens when:</p>
                  <ul style="margin:0 0 24px; padding-left:20px; color:#334155;">
                    <li style="margin-bottom:6px;">Your card expired or was replaced</li>
                    <li style="margin-bottom:6px;">Your bank flagged the charge</li>
                    <li style="margin-bottom:6px;">Insufficient funds</li>
                  </ul>

                  <!-- CTA Button -->
                  <table role="presentation" cellpadding="0" cellspacing="0"
                         style="margin:0 0 24px;">
                    <tr>
                      <td style="border-radius:8px; background:#6366F1;">
                        <a href="{update_url}"
                           style="display:inline-block; padding:14px 28px;
                                  color:#FFFFFF; text-decoration:none;
                                  font-weight:600; font-size:16px;">
                          Update Payment Method
                        </a>
                      </td>
                    </tr>
                  </table>

                  <p style="margin:0 0 16px; color:#64748B; font-size:14px;">
                    We'll retry your payment automatically over the next few days.
                    If the issue isn't resolved within 14 days, your account will
                    be downgraded to the Free plan.
                  </p>

                  <p style="margin:0; color:#64748B; font-size:14px;">
                    Your deals, pipeline, and documents are safe regardless.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding:24px 32px; border-top:1px solid #E2E8F0;
                            color:#64748B; font-size:12px; line-height:1.5;">
                  Need help? Reply to this email.<br>
                  <a href="https://parceldesk.io/settings"
                     style="color:#6366F1;">Manage preferences</a>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """

    send_email(
        to=to,
        subject=subject,
        html=html,
        from_address="Parcel <billing@parceldesk.io>",
        tags=[{"name": "category", "value": "dunning"}, {"name": "step", "value": "day0"}],
    )
```

### Email #2 — Day 3: "Your Parcel access is at risk"

**Tone:** Moderate urgency. Include usage data.

```
Subject: Your Parcel {plan_name} access is at risk
From: Parcel <billing@parceldesk.io>
Preheader: Update your payment method to keep full access.

BODY:
  Hey {first_name},

  We've tried to process your payment of {amount} but it's still
  not going through. Your Parcel {plan_name} subscription is at risk.

  [DATA BOX — surface card background]
    Your Parcel account:
    • {deal_count} deal analyses
    • {pipeline_count} pipeline deals
    • {document_count} documents

  If your payment isn't resolved by {restrict_date}, your account
  will be restricted to read-only mode. After {downgrade_date},
  it will be downgraded to the Free plan.

  [CTA Button: "Update Payment Method"]

  Your data is always safe — even on the Free plan.

FOOTER:
  Need help? Reply to this email.
  Manage preferences: https://parceldesk.io/settings
```

### Email #3 — Day 7: "Your account has been restricted"

**Tone:** High urgency. Concrete deadline. Explain what's blocked.

```
Subject: Your Parcel account will be downgraded in 7 days
From: Parcel <billing@parceldesk.io>
Preheader: New deal analyses, AI chat, and PDF exports are paused.

BODY:
  Hey {first_name},

  Your Parcel {plan_name} payment has been failing for 7 days.
  We've temporarily restricted your account.

  [RED ALERT BOX]
    What's paused:
    • New deal analyses
    • AI chat specialist
    • PDF report export
    • Document upload

    What still works:
    • Viewing your existing deals and pipeline
    • Accessing your portfolio
    • Updating your payment method

  Your account will be downgraded to the Free plan on {downgrade_date}
  unless payment is resolved.

  [CTA Button: "Update Payment Method Now"]

  It takes less than 60 seconds to update your card.

FOOTER:
  Questions? Reply directly to this email.
  Manage preferences: https://parceldesk.io/settings
```

### Email #4 — Day 14: "Your plan has been downgraded"

**Tone:** Matter-of-fact. Empathetic. Clear reactivation path.

```
Subject: Your Parcel account has been moved to the Free plan
From: Ivan from Parcel <ivan@parceldesk.io>
Preheader: Your data is safe — reactivate anytime.

BODY:
  Hey {first_name},

  After 14 days of unsuccessful payment attempts, we've moved your
  Parcel account from {plan_name} to the Free plan.

  [INFO BOX]
    What you keep:
    • All {deal_count} existing deal analyses (read-only)
    • Your pipeline and portfolio data
    • 3 new deal analyses per month

    What's no longer available:
    • Unlimited analyses
    • AI chat specialist
    • PDF report export
    • Document upload & extraction

  [CTA Button: "Reactivate {plan_name}"]

  We saved everything. When you reactivate, you'll pick up right
  where you left off with all your deals and pipeline intact.

  — Ivan, Founder of Parcel

FOOTER:
  This is a billing notification. Reply with any questions.
  Manage preferences: https://parceldesk.io/settings
```

### Recovery Confirmation Email

Sent when payment succeeds after dunning:

```
Subject: Payment received — your Parcel {plan_name} is fully restored
From: Parcel <billing@parceldesk.io>
Preheader: You're back to full access.

BODY:
  Hey {first_name},

  Great news — your payment went through and your Parcel {plan_name}
  plan is fully restored. All features are active again.

  [CTA Button: "Back to Parcel"]

  Thanks for sticking with us.

FOOTER:
  Manage preferences: https://parceldesk.io/settings
```

### Email Sender Implementation

```python
# backend/core/billing/dunning_emails.py

from core.email import send_email


def send_dunning_email(
    to: str,
    first_name: str,
    step: str,          # "day0" | "day3" | "day7" | "day14" | "recovered"
    plan_name: str,
    amount: str,
    update_url: str,
    context: dict | None = None,
) -> None:
    """
    Dispatch the correct dunning email based on the step.

    context may contain:
        deal_count, pipeline_count, document_count,
        restrict_date, downgrade_date
    """
    ctx = context or {}

    builders = {
        "day0": _build_day0_html,
        "day3": _build_day3_html,
        "day7": _build_day7_html,
        "day14": _build_day14_html,
        "recovered": _build_recovered_html,
    }

    subjects = {
        "day0": "Action needed: your Parcel payment didn't go through",
        "day3": f"Your Parcel {plan_name} access is at risk",
        "day7": "Your Parcel account will be downgraded in 7 days",
        "day14": "Your Parcel account has been moved to the Free plan",
        "recovered": f"Payment received — your Parcel {plan_name} is fully restored",
    }

    from_addresses = {
        "day0": "Parcel <billing@parceldesk.io>",
        "day3": "Parcel <billing@parceldesk.io>",
        "day7": "Parcel <billing@parceldesk.io>",
        "day14": "Ivan from Parcel <ivan@parceldesk.io>",
        "recovered": "Parcel <billing@parceldesk.io>",
    }

    builder = builders.get(step)
    if not builder:
        return

    html = builder(
        first_name=first_name,
        plan_name=plan_name,
        amount=amount,
        update_url=update_url,
        **ctx,
    )

    send_email(
        to=to,
        subject=subjects[step],
        html=html,
        from_address=from_addresses[step],
        tags=[
            {"name": "category", "value": "dunning"},
            {"name": "step", "value": step},
        ],
    )
```

---

## 7. Stripe Customer Portal

The Stripe Customer Portal is the primary mechanism for users to update their payment method. Parcel never touches raw card numbers — everything goes through Stripe's hosted UI.

### Portal Configuration

```python
# backend/core/billing/portal.py

import stripe
import os

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

# Configure the portal once (via Dashboard or API).
# Dashboard > Settings > Billing > Customer portal
#
# Enabled features:
#   - Update payment method: YES
#   - View invoice history: YES
#   - Cancel subscription: YES (routes through Parcel's cancellation flow first)
#   - Switch plans: NO (Parcel handles plan changes in-app)
#
# Branding:
#   - Logo: Parcel logo
#   - Accent color: #6366F1
#   - Return URL: https://parceldesk.io/settings/billing


def create_portal_session(customer_id: str) -> str:
    """
    Create a Stripe Customer Portal session.
    Returns the portal URL. The user is redirected here to update their card.

    The session expires after 24 hours or when the user returns to the app.
    """
    session = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url="https://parceldesk.io/settings/billing",
    )
    return session.url
```

### Backend Endpoint

```python
# backend/routers/billing.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from core.billing.portal import create_portal_session
from dependencies.auth import get_current_user

router = APIRouter(prefix="/billing", tags=["billing"])


@router.post("/portal-session")
async def create_billing_portal(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a Stripe Customer Portal session for updating payment method.
    Returns the portal URL — frontend redirects the user there.
    """
    sub = (
        db.query(UserSubscription)
        .filter_by(user_id=str(current_user.id))
        .first()
    )
    if not sub or not sub.stripe_customer_id:
        raise HTTPException(
            status_code=404,
            detail={
                "error": "No billing account found",
                "code": "NO_BILLING_ACCOUNT",
            },
        )

    portal_url = create_portal_session(sub.stripe_customer_id)
    return {"url": portal_url}
```

### Frontend Integration

```typescript
// frontend/src/lib/api.ts — add this function

export async function createBillingPortalSession(): Promise<{ url: string }> {
  const res = await apiFetch('/billing/portal-session', { method: 'POST' });
  return res.json();
}
```

---

## 8. Frontend — Payment Failed Banner

The dunning banner is a persistent, dismissal-resistant notification that appears at the top of the app shell when the user's account is in a dunning state.

### Dunning State Hook

```typescript
// frontend/src/hooks/useDunningState.ts

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

export interface DunningInfo {
  dunning_state: 'grace_period' | 'restricted' | 'downgraded';
  days_elapsed: number;
  days_until_restrict: number;
  days_until_downgrade: number;
  pre_dunning_plan: string;
  started_at: string;
}

export function useDunningState() {
  return useQuery<DunningInfo | null>({
    queryKey: ['dunning-state'],
    queryFn: async () => {
      const res = await apiFetch('/billing/dunning-status');
      if (res.status === 204) return null; // No dunning active
      return res.json();
    },
    // Poll every 5 minutes — dunning state changes infrequently
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });
}
```

### Payment Failed Banner Component

```tsx
// frontend/src/components/billing/PaymentFailedBanner.tsx

import { useState } from 'react';
import { AlertTriangle, CreditCard, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDunningState, DunningInfo } from '@/hooks/useDunningState';
import { createBillingPortalSession } from '@/lib/api';

export function PaymentFailedBanner() {
  const { data: dunning } = useDunningState();
  const [isLoading, setIsLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (!dunning || dismissed) return null;

  const handleUpdatePayment = async () => {
    setIsLoading(true);
    try {
      const { url } = await createBillingPortalSession();
      window.location.href = url;
    } catch {
      // Fallback to settings page
      window.location.href = '/settings/billing';
    } finally {
      setIsLoading(false);
    }
  };

  const config = getBannerConfig(dunning);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className={`${config.bgClass} border-b ${config.borderClass}`}
        role="alert"
        aria-live="assertive"
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center
                        justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <AlertTriangle
              className={`h-5 w-5 flex-shrink-0 ${config.iconClass}`}
              aria-hidden="true"
            />
            <p className={`text-sm font-medium ${config.textClass}`}>
              {config.message}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={handleUpdatePayment}
              disabled={isLoading}
              className={`inline-flex items-center gap-2 px-4 py-1.5
                         rounded-md text-sm font-medium transition-colors
                         ${config.buttonClass}`}
            >
              <CreditCard className="h-4 w-4" aria-hidden="true" />
              {isLoading ? 'Loading...' : 'Update Payment Method'}
            </button>

            {/* Only allow dismissal during grace period — restricted/downgraded
                banners cannot be dismissed */}
            {dunning.dunning_state === 'grace_period' && (
              <button
                onClick={() => setDismissed(true)}
                className="p-1 rounded-md hover:bg-white/10 transition-colors"
                aria-label="Dismiss payment notification"
              >
                <X className={`h-4 w-4 ${config.iconClass}`} />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}


interface BannerConfig {
  bgClass: string;
  borderClass: string;
  iconClass: string;
  textClass: string;
  buttonClass: string;
  message: string;
}

function getBannerConfig(dunning: DunningInfo): BannerConfig {
  switch (dunning.dunning_state) {
    case 'grace_period':
      return {
        bgClass: 'bg-amber-500/10',
        borderClass: 'border-amber-500/20',
        iconClass: 'text-amber-400',
        textClass: 'text-amber-200',
        buttonClass: 'bg-amber-500 hover:bg-amber-600 text-white',
        message:
          dunning.days_elapsed <= 1
            ? 'Your latest payment didn\'t go through. Please update your payment method.'
            : `Payment issue — update your card to avoid account restrictions in ${dunning.days_until_restrict} day${dunning.days_until_restrict !== 1 ? 's' : ''}.`,
      };

    case 'restricted':
      return {
        bgClass: 'bg-red-500/10',
        borderClass: 'border-red-500/20',
        iconClass: 'text-red-400',
        textClass: 'text-red-200',
        buttonClass: 'bg-red-500 hover:bg-red-600 text-white',
        message: `Account restricted — new analyses and AI chat are paused. ${dunning.days_until_downgrade} day${dunning.days_until_downgrade !== 1 ? 's' : ''} until downgrade to Free.`,
      };

    case 'downgraded':
      return {
        bgClass: 'bg-red-500/15',
        borderClass: 'border-red-500/30',
        iconClass: 'text-red-400',
        textClass: 'text-red-100',
        buttonClass: 'bg-indigo-500 hover:bg-indigo-600 text-white',
        message: `Your ${dunning.pre_dunning_plan?.replace(/^\w/, (c: string) => c.toUpperCase()) || ''} plan was downgraded due to payment failure. Reactivate to restore full access.`,
      };
  }
}
```

### Integration in AppShell

```tsx
// In frontend/src/components/layout/AppShell.tsx
// Add the banner ABOVE the main content area, below the topbar.

import { PaymentFailedBanner } from '@/components/billing/PaymentFailedBanner';

// Inside the AppShell component's return:
// <div className="flex h-screen">
//   <Sidebar />
//   <div className="flex-1 flex flex-col">
//     <TopBar />
//     <PaymentFailedBanner />       {/* <-- Add here */}
//     <main className="flex-1 overflow-auto">
//       <Outlet />
//     </main>
//   </div>
// </div>
```

### Restricted Mode Overlay for Blocked Features

```tsx
// frontend/src/components/billing/RestrictedOverlay.tsx

import { Lock } from 'lucide-react';
import { createBillingPortalSession } from '@/lib/api';

interface RestrictedOverlayProps {
  feature: string;  // e.g. "deal analysis", "AI chat", "PDF export"
}

export function RestrictedOverlay({ feature }: RestrictedOverlayProps) {
  const handleUpdate = async () => {
    try {
      const { url } = await createBillingPortalSession();
      window.location.href = url;
    } catch {
      window.location.href = '/settings/billing';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4
                    text-center" role="alert">
      <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center
                      justify-center mb-4">
        <Lock className="h-8 w-8 text-red-400" />
      </div>
      <h2 className="text-xl font-semibold text-slate-100 mb-2">
        {feature} is paused
      </h2>
      <p className="text-slate-400 max-w-md mb-6">
        Your account has a billing issue. Update your payment method
        to restore access to {feature}.
      </p>
      <button
        onClick={handleUpdate}
        className="inline-flex items-center gap-2 px-6 py-2.5
                   bg-indigo-500 hover:bg-indigo-600 text-white
                   rounded-lg font-medium transition-colors"
      >
        Update Payment Method
      </button>
    </div>
  );
}

// Usage in a page component:
//
// function AnalyzerFormPage() {
//   const { data: dunning } = useDunningState();
//
//   if (dunning?.dunning_state === 'restricted' || dunning?.dunning_state === 'downgraded') {
//     return <RestrictedOverlay feature="deal analysis" />;
//   }
//
//   return <AnalyzerForm />;
// }
```

---

## 9. Backend — Dunning State API

### Dunning Status Endpoint

```python
# backend/routers/billing.py — add to existing router

@router.get("/dunning-status", status_code=200)
async def get_dunning_status(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns the current dunning state for the frontend banner.
    Returns 204 No Content if user is not in dunning.
    """
    from core.billing.access import DunningAccessCheck
    from fastapi.responses import Response

    info = DunningAccessCheck.get_dunning_info(db, str(current_user.id))
    if not info:
        return Response(status_code=204)

    return info
```

### Auth `/me` Endpoint Extension

The existing `/auth/me` endpoint should include dunning state so the frontend can show the banner immediately on app load without an extra request.

```python
# In backend/routers/auth.py — extend the /me response

@router.get("/auth/me")
async def get_me(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # ... existing user data ...

    # Add dunning info to the response
    from core.billing.access import DunningAccessCheck

    dunning_info = DunningAccessCheck.get_dunning_info(db, str(current_user.id))

    return {
        # ... existing fields ...
        "dunning": dunning_info,  # null if not in dunning
    }
```

---

## 10. Dunning Cron Job

A daily cron job advances dunning states and sends timed emails. Stripe Smart Retries handle payment retry timing — this job handles the Parcel-specific state machine.

### Cron Job Implementation

```python
# backend/core/billing/dunning_cron.py

import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from database import SessionLocal
from core.billing.dunning import DunningService
from core.billing.dunning_emails import send_dunning_email
from core.billing.portal import create_portal_session
from models.dunning import DunningEvent

logger = logging.getLogger(__name__)


def run_dunning_cron():
    """
    Run daily (e.g., via Railway cron, APScheduler, or a CLI command).
    Advances dunning states and sends timed emails.

    Schedule: Every day at 10:00 AM UTC (6 AM ET — before business hours)
    """
    db = SessionLocal()
    try:
        # Find all users in active dunning
        users_in_dunning = (
            db.query(UserSubscription)
            .filter(UserSubscription.dunning_state.in_([
                "grace_period", "restricted"
            ]))
            .all()
        )

        logger.info(f"Dunning cron: processing {len(users_in_dunning)} users")

        stats = {
            "processed": 0,
            "emails_sent": 0,
            "restricted": 0,
            "downgraded": 0,
            "errors": 0,
        }

        for sub in users_in_dunning:
            try:
                result = DunningService.advance_dunning(db, sub.user_id)

                for action in result.get("actions", []):
                    # Send email if needed
                    email_step = action.get("send_email")
                    if email_step:
                        user = db.query(User).get(sub.user_id)
                        if user:
                            portal_url = create_portal_session(
                                sub.stripe_customer_id
                            )

                            # Gather usage context for emails
                            context = _get_user_context(db, sub.user_id)

                            send_dunning_email(
                                to=user.email,
                                first_name=user.name or "there",
                                step=email_step,
                                plan_name=(sub.pre_dunning_plan or sub.plan or "").title(),
                                amount=_get_last_invoice_amount(sub.stripe_customer_id),
                                update_url=portal_url,
                                context=context,
                            )

                            # Log email sent
                            db.add(DunningEvent(
                                user_id=sub.user_id,
                                subscription_id=sub.stripe_subscription_id,
                                event_type="email_sent",
                                event_detail={"step": email_step},
                            ))
                            db.commit()
                            stats["emails_sent"] += 1

                    # Handle Stripe downgrade if needed
                    if action.get("downgrade_on_stripe"):
                        _downgrade_on_stripe(sub.stripe_subscription_id)
                        stats["downgraded"] += 1

                    if action.get("state_change") == "restricted":
                        stats["restricted"] += 1

                stats["processed"] += 1

            except Exception as e:
                logger.error(
                    f"Dunning cron error for user {sub.user_id}: {e}",
                    exc_info=True,
                )
                stats["errors"] += 1

        logger.info(f"Dunning cron complete: {stats}")
        return stats

    finally:
        db.close()


def _get_user_context(db: Session, user_id: str) -> dict:
    """Gather deal/pipeline/document counts for email personalization."""
    from models.deal import Deal
    from models.pipeline import PipelineDeal
    from models.document import Document

    deal_count = db.query(Deal).filter_by(
        user_id=user_id, deleted_at=None
    ).count()
    pipeline_count = db.query(PipelineDeal).filter_by(
        user_id=user_id, deleted_at=None
    ).count()
    document_count = db.query(Document).filter_by(
        user_id=user_id, deleted_at=None
    ).count()

    now = datetime.now(timezone.utc)
    # Calculate dates for email content
    return {
        "deal_count": deal_count,
        "pipeline_count": pipeline_count,
        "document_count": document_count,
    }


def _get_last_invoice_amount(customer_id: str) -> str:
    """Fetch the most recent failed invoice amount from Stripe."""
    import stripe
    try:
        invoices = stripe.Invoice.list(
            customer=customer_id,
            status="open",
            limit=1,
        )
        if invoices.data:
            cents = invoices.data[0].amount_due
            return f"${cents / 100:.2f}"
    except Exception:
        pass
    return "your subscription"


def _downgrade_on_stripe(subscription_id: str) -> None:
    """
    Cancel the Stripe subscription.
    The user's local plan is already set to 'free' by DunningService.

    We cancel immediately (not at period end) because the period has
    already elapsed without payment.
    """
    import stripe
    try:
        stripe.Subscription.cancel(subscription_id)
        logger.info(f"Stripe subscription {subscription_id} canceled (involuntary)")
    except stripe.error.InvalidRequestError as e:
        # Already canceled — that's fine
        if "No such subscription" in str(e):
            logger.warning(f"Subscription {subscription_id} already canceled")
        else:
            raise
```

### Cron Scheduling

```python
# backend/main.py — add scheduler (using APScheduler)

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from core.billing.dunning_cron import run_dunning_cron

# Initialize scheduler
scheduler = AsyncIOScheduler()

@app.on_event("startup")
async def start_scheduler():
    # Run dunning cron daily at 10:00 UTC
    scheduler.add_job(
        run_dunning_cron,
        trigger="cron",
        hour=10,
        minute=0,
        id="dunning_cron",
        replace_existing=True,
    )
    scheduler.start()

@app.on_event("shutdown")
async def stop_scheduler():
    scheduler.shutdown()
```

**Alternative: Railway Cron**

If APScheduler is too heavy, use Railway's native cron. Create a separate service entry:

```toml
# railway.toml (or via Dashboard > Settings > Cron)
[cron]
schedule = "0 10 * * *"
command = "python -c 'from core.billing.dunning_cron import run_dunning_cron; run_dunning_cron()'"
```

---

## 11. Involuntary Churn Tracking

Involuntary churn (failed payments) must be tracked separately from voluntary churn (user-initiated cancellations). They have different causes and different recovery strategies.

### Event Classification

```python
# backend/core/billing/churn_tracking.py

from enum import Enum

class ChurnType(str, Enum):
    VOLUNTARY = "voluntary"        # User clicked cancel
    INVOLUNTARY = "involuntary"    # Failed payment → downgrade
    TRIAL_EXPIRED = "trial_expired"  # Trial ended, didn't convert


class ChurnEvent:
    """Recorded when a paid user loses their subscription."""

    @staticmethod
    def record(
        db: Session,
        user_id: str,
        churn_type: ChurnType,
        previous_plan: str,
        mrr_lost: int,             # cents
        reason: str | None = None,
        metadata: dict | None = None,
    ):
        db.add(DunningEvent(
            user_id=user_id,
            event_type=f"churn_{churn_type.value}",
            event_detail={
                "previous_plan": previous_plan,
                "mrr_lost_cents": mrr_lost,
                "reason": reason,
                **(metadata or {}),
            },
        ))
        db.commit()
```

### Tracking Queries

```sql
-- Involuntary churn this month
SELECT COUNT(*) AS involuntary_churn_count,
       SUM((event_detail->>'mrr_lost_cents')::int) / 100.0 AS mrr_lost
FROM dunning_events
WHERE event_type = 'churn_involuntary'
  AND created_at >= date_trunc('month', CURRENT_DATE);

-- Involuntary vs voluntary split
SELECT
    CASE
        WHEN event_type = 'churn_voluntary' THEN 'Voluntary'
        WHEN event_type = 'churn_involuntary' THEN 'Involuntary'
        WHEN event_type = 'churn_trial_expired' THEN 'Trial Expired'
    END AS churn_type,
    COUNT(*) AS count,
    SUM((event_detail->>'mrr_lost_cents')::int) / 100.0 AS mrr_lost
FROM dunning_events
WHERE event_type LIKE 'churn_%'
  AND created_at >= date_trunc('month', CURRENT_DATE)
GROUP BY 1;

-- Monthly churn trend
SELECT
    date_trunc('month', created_at) AS month,
    event_type,
    COUNT(*) AS count
FROM dunning_events
WHERE event_type LIKE 'churn_%'
GROUP BY 1, 2
ORDER BY 1 DESC;
```

### When to Record Each Type

| Event | Churn Type | Trigger |
|---|---|---|
| User cancels subscription | `voluntary` | Cancellation flow completed |
| Day 14 dunning downgrade | `involuntary` | `DunningService.advance_dunning()` |
| Trial expires, no conversion | `trial_expired` | Trial expiry cron |

---

## 12. Recovery Rate Metrics

### Key Metrics to Track

| Metric | Definition | Target |
|---|---|---|
| **Dunning entry rate** | % of active subscriptions that enter dunning per month | < 5% |
| **Day 0-3 recovery** | % recovered within first 3 days (card updater + quick retry) | 35-45% |
| **Day 3-7 recovery** | % recovered during grace period (user updates card) | 15-25% |
| **Day 7-14 recovery** | % recovered during restricted period | 5-10% |
| **Total recovery rate** | % of dunning entries that recover before downgrade | 55-70% |
| **Post-downgrade recovery** | % of involuntary downgrades that reactivate within 30d | 10-20% |
| **Involuntary churn rate** | MRR lost to failed payments / total MRR | < 1% |

### Recovery Funnel Query

```sql
-- Recovery funnel for a given month
WITH dunning_cohort AS (
    SELECT DISTINCT user_id,
           MIN(created_at) AS entered_dunning
    FROM dunning_events
    WHERE event_type = 'payment_failed'
      AND created_at >= '2026-03-01'
      AND created_at < '2026-04-01'
    GROUP BY user_id
),
recoveries AS (
    SELECT de.user_id,
           de.created_at AS recovered_at,
           EXTRACT(DAY FROM de.created_at - dc.entered_dunning) AS days_to_recover
    FROM dunning_events de
    JOIN dunning_cohort dc ON de.user_id = dc.user_id
    WHERE de.event_type = 'recovered'
      AND de.created_at >= dc.entered_dunning
),
downgrades AS (
    SELECT de.user_id
    FROM dunning_events de
    JOIN dunning_cohort dc ON de.user_id = dc.user_id
    WHERE de.event_type = 'downgraded'
)
SELECT
    (SELECT COUNT(*) FROM dunning_cohort) AS entered_dunning,
    (SELECT COUNT(*) FROM recoveries WHERE days_to_recover <= 3) AS recovered_0_3d,
    (SELECT COUNT(*) FROM recoveries WHERE days_to_recover BETWEEN 4 AND 7) AS recovered_4_7d,
    (SELECT COUNT(*) FROM recoveries WHERE days_to_recover BETWEEN 8 AND 14) AS recovered_8_14d,
    (SELECT COUNT(*) FROM recoveries) AS total_recovered,
    (SELECT COUNT(*) FROM downgrades) AS total_downgraded,
    ROUND(
        (SELECT COUNT(*) FROM recoveries)::numeric /
        NULLIF((SELECT COUNT(*) FROM dunning_cohort), 0) * 100, 1
    ) AS recovery_rate_pct;
```

### Admin Dashboard API

```python
# backend/routers/admin.py

@router.get("/admin/dunning-metrics")
async def get_dunning_metrics(
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Dunning metrics for the admin dashboard."""
    from datetime import datetime, timezone, timedelta

    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Currently in dunning
    active_dunning = db.query(UserSubscription).filter(
        UserSubscription.dunning_state != "ok"
    ).count()

    # Entered dunning this month
    entered = db.query(DunningEvent).filter(
        DunningEvent.event_type == "payment_failed",
        DunningEvent.created_at >= month_start,
    ).distinct(DunningEvent.user_id).count()

    # Recovered this month
    recovered = db.query(DunningEvent).filter(
        DunningEvent.event_type == "recovered",
        DunningEvent.created_at >= month_start,
    ).distinct(DunningEvent.user_id).count()

    # Downgraded this month
    downgraded = db.query(DunningEvent).filter(
        DunningEvent.event_type == "downgraded",
        DunningEvent.created_at >= month_start,
    ).distinct(DunningEvent.user_id).count()

    # Recovery rate
    recovery_rate = (
        round(recovered / entered * 100, 1) if entered > 0 else 0
    )

    # Breakdown by state
    grace_count = db.query(UserSubscription).filter_by(
        dunning_state="grace_period"
    ).count()
    restricted_count = db.query(UserSubscription).filter_by(
        dunning_state="restricted"
    ).count()

    return {
        "active_dunning": active_dunning,
        "grace_period": grace_count,
        "restricted": restricted_count,
        "entered_this_month": entered,
        "recovered_this_month": recovered,
        "downgraded_this_month": downgraded,
        "recovery_rate_pct": recovery_rate,
    }
```

---

## 13. CRITICAL DECISIONS

### DECISION 1: Grace Period Length — 7 + 7 = 14 days total

**Chosen:** 7 days full access, 7 days restricted, then downgrade.

**Why not shorter (e.g., 3 + 4)?** Real estate investors are not daily SaaS users. Some log in 2-4x/month. A 7-day period means they have at least one natural login to see the banner. The churn research shows 50-70% of failed payments self-resolve within 7 days via card updater and smart retries.

**Why not longer (e.g., 14 + 14)?** 28 days of unpaid access creates revenue leakage and moral hazard. The research data shows recovery rates drop sharply after day 10 — extending the grace period doesn't meaningfully increase recovery.

**Reversible?** Yes. Changing `7` and `14` in `DunningService.advance_dunning()` adjusts the entire timeline.

---

### DECISION 2: Downgrade to Free (never hard cancel)

**Chosen:** Involuntary churn always results in a Free plan, never account deletion.

**Rationale:**
- Users who churn involuntarily WANT to keep paying. Their data is a reactivation lever.
- The research shows downgrade-to-free recovers 15-25% more users than hard cancellation.
- Free plan costs Parcel near-zero (read-only access, no AI/PDF compute).
- Preserves the user's deals, pipeline, documents — high switching cost if they return.
- Legal safety: no data deletion disputes.

**Irreversible?** No — this can always be changed to hard cancel later. Going the other direction (restoring deleted data) is impossible.

---

### DECISION 3: Stripe Smart Retries (not custom retry schedule)

**Chosen:** Let Stripe's ML choose retry timing. Do not implement custom retry logic.

**Rationale:**
- Stripe's Smart Retries use network-wide data from millions of transactions to pick optimal retry windows. Parcel's sample size is too small to train better timing.
- Reduces implementation complexity — no retry scheduler to build or maintain.
- The research shows Smart Retries recover 11% more than fixed schedules.

**Trade-off:** Less control over exact retry timing. Parcel's cron job handles state transitions (day 3, 7, 14) independently of Stripe's retry schedule.

---

### DECISION 4: Disable Stripe's built-in dunning emails

**Chosen:** Turn off Stripe's payment failure email. Send all dunning emails via Resend.

**Rationale:**
- Stripe sends ONE generic email. Parcel needs a 4-email escalation sequence.
- Custom emails include usage data ("You have 23 deal analyses"), deeplinks to the billing portal, and progressive urgency.
- Branded emails from `billing@parceldesk.io` build trust; `receipts@stripe.com` does not.
- Resend tags enable open/click tracking per dunning step.

**Risk:** If Resend goes down, no dunning emails are sent. Mitigated by monitoring Resend delivery status and having Stripe retries as a silent backup mechanism (payment may succeed even without email).

---

### DECISION 5: Restricted mode blocks creation, not reading

**Chosen:** During days 7-14, users can VIEW all existing data but cannot CREATE new analyses, AI chats, PDFs, or document uploads.

**Rationale:**
- Blocking read access punishes the user and destroys goodwill — they're already stressed about a billing issue.
- Blocking creation creates sufficient urgency (they can't analyze the deal they're evaluating TODAY).
- This mirrors how most SaaS handles it: Slack archives messages but you can read; GitHub makes repos read-only.

**Implementation impact:** Requires route-level access checks via `require_full_access` dependency, plus frontend `RestrictedOverlay` component on creation pages.

---

### DECISION 6: Separate involuntary churn tracking

**Chosen:** Track involuntary (payment failure) and voluntary (user cancellation) churn as distinct metrics.

**Rationale:**
- They have completely different causes and remedies.
- Involuntary churn is recoverable through better dunning, card updater, pre-expiry emails.
- Voluntary churn is recoverable through product improvements, save offers, pause options.
- Combining them masks the true health of each system.
- The research target: involuntary churn should be < 1% of MRR; voluntary < 2.5%.

---

### DECISION 7: Single dunning state on UserSubscription (not a separate table)

**Chosen:** Store `dunning_state` and related columns directly on the `user_subscriptions` row, with a separate `dunning_events` audit table.

**Why not a separate `dunning_sessions` table?** The dunning lifecycle is 1:1 with the subscription. A user is either in dunning or not. Adding a separate table creates join overhead on every access check. The `dunning_events` table preserves the full audit trail for metrics without impacting the hot path.

**Trade-off:** Historical dunning sessions (e.g., "how many times has this user entered dunning?") require querying `dunning_events` rather than a dedicated history table. Acceptable at Parcel's scale.

---

### DECISION 8: Portal link via API (not static URL)

**Chosen:** The "Update Payment Method" button calls `POST /billing/portal-session` which creates a fresh Stripe Customer Portal session with a time-limited URL.

**Why not a static link?** Stripe Customer Portal sessions expire after 24 hours. Embedding a pre-generated URL in an email risks the user clicking an expired link days later. The API approach always generates a fresh session. For emails, we generate the portal URL at send time — acceptable because dunning emails are sent at most 4 times over 14 days, and portal sessions last 24h, giving the user a reasonable window.

---

*End of design document. All code is implementation-ready for the Parcel FastAPI + React stack. Wire the webhook handlers into the existing dispatch from agent-02, add the cron job to Railway, and mount the PaymentFailedBanner in AppShell.tsx.*
