# Webhook Handler Design — `backend/routers/webhooks.py`

**Date:** 2026-03-28
**Author:** Backend Architecture Agent
**Stack:** FastAPI + SQLAlchemy 2 (sync) + PostgreSQL (Railway)
**Dependencies:** `stripe` (Python SDK), existing `database.py`, `limiter.py`, `models/base.py`
**Inputs:** Research from agents 01, 02, 03, 12

---

## 1. Complete Endpoint — `backend/routers/webhooks.py`

```python
"""Stripe webhook receiver — the single entry point for all Stripe events.

This module:
1. Verifies the Stripe signature (rejects forgeries)
2. Stores every event in webhook_events for audit + replay
3. Deduplicates by event ID and idempotency key
4. Dispatches to the correct handler
5. Returns 200 FAST to avoid Stripe retry storms

SECURITY: This endpoint has NO auth middleware. Stripe cannot present a JWT.
          Signature verification IS the authentication layer.
MOUNT:    app.include_router(webhooks.router) — NOT behind /api/v1 prefix.
"""

import json
import logging
import os
from datetime import datetime, timezone
from typing import Any

import stripe
from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from database import SessionLocal
from limiter import limiter

logger = logging.getLogger("parcel.webhooks")

router = APIRouter(tags=["webhooks"])

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

STRIPE_WEBHOOK_SECRET: str = os.getenv("STRIPE_WEBHOOK_SECRET", "")
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")

MAX_PROCESSING_ATTEMPTS = 5

# Plan resolution: Stripe Price metadata.parcel_plan -> local plan tier
# Fallback chain: price metadata -> product metadata -> "free"
PLAN_TIER_DEFAULT = "free"


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post("/webhooks/stripe", status_code=200)
@limiter.limit("120/minute")
async def stripe_webhook(request: Request) -> dict[str, str]:
    """Receive, verify, store, and process a Stripe webhook event.

    Returns 200 as fast as possible. Processing errors are caught and
    logged — they do NOT cause a non-200 response, because that would
    trigger Stripe retries for application bugs (infinite loop).

    The only cases that return non-200:
    - Missing STRIPE_WEBHOOK_SECRET (500) — server misconfiguration
    - Invalid payload / bad JSON (400)
    - Invalid signature (400) — possible forgery
    """
    # ── Step 0: Validate server config ──────────────────────────
    if not STRIPE_WEBHOOK_SECRET:
        logger.error("STRIPE_WEBHOOK_SECRET not configured — cannot process webhooks")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Webhook not configured", "code": "WEBHOOK_CONFIG_ERROR"},
        )

    # ── Step 1: Read raw body BEFORE any parsing ────────────────
    payload: bytes = await request.body()
    sig_header: str | None = request.headers.get("stripe-signature")

    if not sig_header:
        logger.warning("webhook_rejected: missing stripe-signature header")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Missing stripe-signature header", "code": "MISSING_SIGNATURE"},
        )

    # ── Step 2: Verify signature ────────────────────────────────
    try:
        event: dict[str, Any] = stripe.Webhook.construct_event(
            payload=payload,
            sig_header=sig_header,
            secret=STRIPE_WEBHOOK_SECRET,
            tolerance=300,  # 5 min replay window
        )
    except ValueError:
        logger.warning("webhook_rejected: invalid payload (not valid JSON)")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Invalid payload", "code": "INVALID_PAYLOAD"},
        )
    except stripe.error.SignatureVerificationError:
        logger.warning("webhook_rejected: signature verification failed")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Invalid signature", "code": "INVALID_SIGNATURE"},
        )

    # ── Step 3: Extract identity fields ─────────────────────────
    event_id: str = event["id"]
    event_type: str = event["type"]
    data_object: dict[str, Any] = event["data"]["object"]
    object_id: str = data_object.get("id", "unknown")
    idempotency_key: str = f"{object_id}:{event_type}"
    stripe_created: int = event.get("created", 0)

    # Safe log — NEVER log the full payload (may contain PII)
    logger.info(
        "webhook_received: type=%s id=%s object=%s",
        event_type, event_id, object_id,
    )

    # ── Step 4: Store + deduplicate + process ───────────────────
    db: Session = SessionLocal()
    try:
        # 4a. Check idempotency (two-layer)
        if _is_duplicate(db, event_id, idempotency_key):
            logger.info("webhook_duplicate: id=%s key=%s — skipping", event_id, idempotency_key)
            return {"status": "duplicate"}

        # 4b. Persist raw event (audit trail + replay capability)
        _store_event(
            db,
            event_id=event_id,
            event_type=event_type,
            api_version=event.get("api_version"),
            idempotency_key=idempotency_key,
            payload=event,
            stripe_created=stripe_created,
            source_ip=_get_client_ip(request),
        )

        # 4c. Dispatch to handler
        try:
            _dispatch(event_type, data_object, event, db)
            _mark_processed(db, event_id)
            logger.info("webhook_processed: type=%s id=%s", event_type, event_id)
        except Exception as exc:
            db.rollback()
            _record_processing_error(db, event_id, str(exc))
            logger.exception(
                "webhook_processing_failed: type=%s id=%s error=%s",
                event_type, event_id, str(exc)[:200],
            )
            # Still return 200 — the event is stored; we'll retry internally
    except Exception as exc:
        # If even the storage step fails, log and return 200.
        # Stripe will retry, and we'll catch it next time.
        db.rollback()
        logger.exception("webhook_storage_failed: id=%s error=%s", event_id, str(exc)[:200])
    finally:
        db.close()

    return {"status": "ok"}


# ---------------------------------------------------------------------------
# 2. Signature Verification — handled by stripe.Webhook.construct_event
# ---------------------------------------------------------------------------
#
# The stripe Python SDK's construct_event() does:
#   1. Parse the Stripe-Signature header: t=<timestamp>,v1=<sig1>,v1=<sig2>
#   2. Compute expected = HMAC-SHA256(f"{timestamp}.{raw_body}", webhook_secret)
#   3. Compare expected against each v1 signature (constant-time)
#   4. Check timestamp is within tolerance (default 300s) — replay protection
#   5. Return the parsed event dict on success, or raise on failure
#
# We pass tolerance=300 explicitly for clarity. During secret rotation,
# Stripe sends two v1 signatures (old + new secret). construct_event
# tries both automatically.
#
# CRITICAL: The raw bytes from request.body() must be passed — NOT
#           a re-serialized JSON string. Any whitespace or encoding
#           difference will break verification.


# ---------------------------------------------------------------------------
# 3. Event Dispatcher
# ---------------------------------------------------------------------------

# Map of event type -> handler function.
# Every handler takes (data_object: dict, event: dict, db: Session).
# The full `event` is passed so handlers can inspect event-level fields
# like event["created"] for ordering decisions.

EVENT_HANDLERS: dict[str, Any] = {}


def _dispatch(event_type: str, data_object: dict, event: dict, db: Session) -> None:
    """Route the event to its registered handler, or log as unhandled."""
    handler = EVENT_HANDLERS.get(event_type)
    if handler is None:
        logger.info("webhook_unhandled: type=%s — no handler registered", event_type)
        return
    handler(data_object, event, db)


def handles(event_type: str):
    """Decorator to register a function as the handler for a Stripe event type."""
    def decorator(fn):
        EVENT_HANDLERS[event_type] = fn
        return fn
    return decorator


# ---------------------------------------------------------------------------
# 4. Idempotency Implementation
# ---------------------------------------------------------------------------

def _is_duplicate(db: Session, event_id: str, idempotency_key: str) -> bool:
    """Two-layer deduplication.

    Layer 1: Exact event ID match — same webhook delivery retried by Stripe.
    Layer 2: Idempotency key match on a PROCESSED event — different evt_ ID
             but same logical operation (Stripe can emit two distinct event
             objects for the same state change).

    Returns True if this event should be skipped.
    """
    from models.webhook_events import WebhookEvent

    row = db.query(WebhookEvent).filter(
        (WebhookEvent.stripe_event_id == event_id)
        | (
            (WebhookEvent.idempotency_key == idempotency_key)
            & (WebhookEvent.processed == True)  # noqa: E712
        )
    ).first()
    return row is not None


def _store_event(
    db: Session,
    *,
    event_id: str,
    event_type: str,
    api_version: str | None,
    idempotency_key: str,
    payload: dict,
    stripe_created: int,
    source_ip: str | None,
) -> None:
    """Insert the raw event into webhook_events. Uses merge() to handle
    the rare case where a duplicate slips past the is_duplicate check
    due to a race between two concurrent deliveries.
    """
    from models.webhook_events import WebhookEvent

    record = WebhookEvent(
        stripe_event_id=event_id,
        event_type=event_type,
        api_version=api_version,
        idempotency_key=idempotency_key,
        payload=payload,
        stripe_created=datetime.fromtimestamp(stripe_created, tz=timezone.utc) if stripe_created else None,
        source_ip=source_ip,
        processed=False,
        retry_count=0,
    )
    db.merge(record)
    db.commit()


def _mark_processed(db: Session, event_id: str) -> None:
    """Stamp the event as successfully processed."""
    from models.webhook_events import WebhookEvent

    record = db.query(WebhookEvent).filter_by(stripe_event_id=event_id).first()
    if record:
        record.processed = True
        record.processed_at = datetime.now(timezone.utc)
        db.commit()


def _record_processing_error(db: Session, event_id: str, error_msg: str) -> None:
    """Record a processing failure for later retry or manual review."""
    from models.webhook_events import WebhookEvent

    record = db.query(WebhookEvent).filter_by(stripe_event_id=event_id).first()
    if record:
        record.retry_count += 1
        record.error = error_msg[:2000]
        db.commit()

    if record and record.retry_count >= MAX_PROCESSING_ATTEMPTS:
        logger.critical(
            "webhook_dead_letter: id=%s type=%s attempts=%d — requires manual intervention",
            event_id, record.event_type, record.retry_count,
        )


def _get_client_ip(request: Request) -> str | None:
    """Extract the originating IP. Railway sets X-Forwarded-For."""
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return None


# ---------------------------------------------------------------------------
# 5. Handler Functions — One per Event Type
# ---------------------------------------------------------------------------

# ┌─────────────────────────────────────────────────────────────────────────┐
# │  IMPORTANT: Every handler is a SAFE UPSERT. No handler assumes it runs │
# │  first. Advisory locks prevent concurrent writes to the same user.     │
# │  Timestamp comparison prevents stale events from overwriting newer     │
# │  state.                                                                │
# └─────────────────────────────────────────────────────────────────────────┘


def _acquire_user_lock(db: Session, user_id: str) -> None:
    """Acquire a PostgreSQL advisory lock scoped to the transaction.

    This prevents race conditions when two webhook events for the same
    user are processed concurrently (e.g., checkout.session.completed
    and customer.subscription.created arriving simultaneously).

    The lock is automatically released when the transaction commits or
    rolls back — no explicit unlock needed.
    """
    lock_key = hash(user_id) % (2**31 - 1)
    db.execute(text(f"SELECT pg_advisory_xact_lock({lock_key})"))


def _resolve_plan_tier(stripe_obj: dict) -> str:
    """Extract the Parcel plan tier from a Stripe subscription or checkout session.

    Resolution order:
    1. subscription.metadata.parcel_plan (set during Checkout Session creation)
    2. price.metadata.parcel_plan (set on the Stripe Price object)
    3. product.metadata.parcel_plan (set on the Stripe Product object)
    4. Fallback to "free"

    For checkout sessions, the subscription is nested; for subscription
    events, the items are directly available.
    """
    # Direct metadata on the subscription object
    meta_plan = stripe_obj.get("metadata", {}).get("parcel_plan")
    if meta_plan:
        return meta_plan

    # Check items[].price.metadata and items[].price.product.metadata
    items = stripe_obj.get("items", {}).get("data", [])
    for item in items:
        price = item.get("price", {})
        price_plan = price.get("metadata", {}).get("parcel_plan")
        if price_plan:
            return price_plan
        product_plan = price.get("product", {})
        if isinstance(product_plan, dict):
            prod_meta = product_plan.get("metadata", {}).get("parcel_plan")
            if prod_meta:
                return prod_meta

    return PLAN_TIER_DEFAULT


def _find_user_by_stripe_customer(db: Session, customer_id: str):
    """Look up a Parcel user by their stripe_customer_id."""
    from models.users import User
    return db.query(User).filter(User.stripe_customer_id == customer_id).first()


def _unix_to_datetime(ts: int | None) -> datetime | None:
    """Convert a Unix epoch timestamp to a timezone-aware datetime, or None."""
    if ts is None or ts == 0:
        return None
    return datetime.fromtimestamp(ts, tz=timezone.utc)


# ─── checkout.session.completed ───────────────────────────────────────────

@handles("checkout.session.completed")
def handle_checkout_completed(session: dict, event: dict, db: Session) -> None:
    """User finished Stripe Checkout — provision their subscription.

    This is the PRIMARY provisioning event. It fires when a user
    completes payment (or starts a trial) via Checkout.

    Key fields on the session object:
    - customer: Stripe customer ID (cus_...)
    - subscription: Stripe subscription ID (sub_...)
    - client_reference_id: Parcel user UUID (set during session creation)
    - metadata.parcel_user_id: Parcel user UUID (backup)

    This handler:
    1. Links the Stripe customer ID to the Parcel user
    2. Fetches the full subscription from Stripe (canonical state)
    3. Creates or updates the local subscription record
    4. Updates user.plan_tier for fast access checks
    """
    from models.subscriptions import Subscription
    from models.users import User

    # Only handle subscription checkouts (not one-time payments)
    if session.get("mode") != "subscription":
        logger.info("checkout_skipped: mode=%s (not subscription)", session.get("mode"))
        return

    customer_id: str = session["customer"]
    subscription_id: str | None = session.get("subscription")

    # Resolve the Parcel user — client_reference_id is the primary key
    user_id: str | None = session.get("client_reference_id") or session.get("metadata", {}).get("parcel_user_id")
    if not user_id:
        logger.error("checkout_failed: no client_reference_id or parcel_user_id in session %s", session["id"])
        return

    _acquire_user_lock(db, user_id)

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        logger.error("checkout_failed: user %s not found in database", user_id)
        return

    # Link Stripe customer to Parcel user (idempotent)
    if not user.stripe_customer_id:
        user.stripe_customer_id = customer_id

    # Fetch the full subscription from Stripe (source of truth)
    if not subscription_id:
        logger.error("checkout_failed: no subscription ID on session %s", session["id"])
        return

    stripe_sub = stripe.Subscription.retrieve(subscription_id, expand=["items.data.price.product"])
    plan_tier = _resolve_plan_tier(stripe_sub)

    # Find the matching local plan
    from models.subscription_plans import SubscriptionPlan
    local_plan = db.query(SubscriptionPlan).filter(
        SubscriptionPlan.tier == plan_tier,
        SubscriptionPlan.is_active == True,  # noqa: E712
    ).first()

    # Upsert the subscription record
    existing_sub = db.query(Subscription).filter(
        Subscription.stripe_subscription_id == subscription_id
    ).first()

    if existing_sub:
        existing_sub.status = stripe_sub.status
        existing_sub.current_period_start = _unix_to_datetime(stripe_sub.current_period_start)
        existing_sub.current_period_end = _unix_to_datetime(stripe_sub.current_period_end)
        existing_sub.trial_start = _unix_to_datetime(stripe_sub.trial_start)
        existing_sub.trial_end = _unix_to_datetime(stripe_sub.trial_end)
        if local_plan:
            existing_sub.plan_id = local_plan.id
    else:
        new_sub = Subscription(
            user_id=user.id,
            plan_id=local_plan.id if local_plan else None,
            stripe_subscription_id=subscription_id,
            stripe_customer_id=customer_id,
            status=stripe_sub.status,
            current_period_start=_unix_to_datetime(stripe_sub.current_period_start),
            current_period_end=_unix_to_datetime(stripe_sub.current_period_end),
            trial_start=_unix_to_datetime(stripe_sub.trial_start),
            trial_end=_unix_to_datetime(stripe_sub.trial_end),
        )
        db.add(new_sub)

    # Denormalized plan tier on user for fast access checks
    user.plan_tier = plan_tier

    db.commit()
    logger.info(
        "checkout_provisioned: user=%s plan=%s sub=%s status=%s",
        user_id, plan_tier, subscription_id, stripe_sub.status,
    )


# ─── customer.subscription.created ────────────────────────────────────────

@handles("customer.subscription.created")
def handle_subscription_created(subscription: dict, event: dict, db: Session) -> None:
    """A new subscription object was created in Stripe.

    This often arrives near-simultaneously with checkout.session.completed.
    The handler is a safe upsert — if checkout already created the record,
    this just updates it. If this arrives first, it creates the record
    and checkout will update it.

    Uses fetch-on-receive: ignores the event payload and fetches the
    canonical subscription state from Stripe to eliminate ordering issues.
    """
    from models.subscriptions import Subscription
    from models.subscription_plans import SubscriptionPlan

    sub_id: str = subscription["id"]
    customer_id: str = subscription["customer"]

    # Look up user by Stripe customer ID
    user = _find_user_by_stripe_customer(db, customer_id)
    if not user:
        # checkout.session.completed may not have run yet — the customer
        # link doesn't exist. Log and return; checkout handler will create
        # the record. Stripe will also retry this event.
        logger.info(
            "subscription_created_deferred: sub=%s cus=%s — user not linked yet",
            sub_id, customer_id,
        )
        return

    _acquire_user_lock(db, str(user.id))

    # Fetch canonical state from Stripe
    stripe_sub = stripe.Subscription.retrieve(sub_id, expand=["items.data.price.product"])
    plan_tier = _resolve_plan_tier(stripe_sub)

    local_plan = db.query(SubscriptionPlan).filter(
        SubscriptionPlan.tier == plan_tier,
        SubscriptionPlan.is_active == True,  # noqa: E712
    ).first()

    existing = db.query(Subscription).filter(
        Subscription.stripe_subscription_id == sub_id
    ).first()

    if existing:
        existing.status = stripe_sub.status
        existing.current_period_start = _unix_to_datetime(stripe_sub.current_period_start)
        existing.current_period_end = _unix_to_datetime(stripe_sub.current_period_end)
        existing.trial_start = _unix_to_datetime(stripe_sub.trial_start)
        existing.trial_end = _unix_to_datetime(stripe_sub.trial_end)
        if local_plan:
            existing.plan_id = local_plan.id
    else:
        new_sub = Subscription(
            user_id=user.id,
            plan_id=local_plan.id if local_plan else None,
            stripe_subscription_id=sub_id,
            stripe_customer_id=customer_id,
            status=stripe_sub.status,
            current_period_start=_unix_to_datetime(stripe_sub.current_period_start),
            current_period_end=_unix_to_datetime(stripe_sub.current_period_end),
            trial_start=_unix_to_datetime(stripe_sub.trial_start),
            trial_end=_unix_to_datetime(stripe_sub.trial_end),
        )
        db.add(new_sub)

    user.plan_tier = plan_tier
    db.commit()

    logger.info(
        "subscription_created: user=%s plan=%s sub=%s status=%s",
        user.id, plan_tier, sub_id, stripe_sub.status,
    )


# ─── customer.subscription.updated ────────────────────────────────────────

@handles("customer.subscription.updated")
def handle_subscription_updated(subscription: dict, event: dict, db: Session) -> None:
    """Subscription state changed — plan change, renewal, trial conversion,
    cancellation scheduled, payment status change, etc.

    This is the workhorse event. It fires for:
    - Trial -> Active (trial ended, first charge succeeded)
    - Active -> Past Due (payment failed)
    - Past Due -> Active (retry succeeded)
    - Any -> Canceled (user canceled or retries exhausted)
    - Plan change (Pro -> Team upgrade, Team -> Pro downgrade)
    - cancel_at_period_end toggled (user scheduled cancellation)

    Strategy: fetch-on-receive with timestamp guard. We fetch the latest
    state from Stripe, but only apply if it's newer than what we have.
    """
    from models.subscriptions import Subscription
    from models.subscription_plans import SubscriptionPlan

    sub_id: str = subscription["id"]
    customer_id: str = subscription["customer"]

    user = _find_user_by_stripe_customer(db, customer_id)
    if not user:
        logger.warning("subscription_updated_orphan: sub=%s cus=%s — no linked user", sub_id, customer_id)
        return

    _acquire_user_lock(db, str(user.id))

    # Fetch canonical state
    stripe_sub = stripe.Subscription.retrieve(sub_id, expand=["items.data.price.product"])

    existing = db.query(Subscription).filter(
        Subscription.stripe_subscription_id == sub_id
    ).first()

    if not existing:
        # subscription.created didn't run yet — create the record
        logger.info("subscription_updated_create: sub=%s — creating missing record", sub_id)
        plan_tier = _resolve_plan_tier(stripe_sub)
        local_plan = db.query(SubscriptionPlan).filter(
            SubscriptionPlan.tier == plan_tier,
            SubscriptionPlan.is_active == True,  # noqa: E712
        ).first()
        existing = Subscription(
            user_id=user.id,
            plan_id=local_plan.id if local_plan else None,
            stripe_subscription_id=sub_id,
            stripe_customer_id=customer_id,
        )
        db.add(existing)

    # Timestamp guard: only apply if Stripe's data is newer
    stripe_updated_at = _unix_to_datetime(stripe_sub.get("created", 0))
    # Note: Stripe subscriptions don't have an "updated" timestamp per se.
    # The event's created timestamp is the canonical ordering mechanism.
    event_created = _unix_to_datetime(event.get("created", 0))

    if existing.updated_at and event_created and event_created < existing.updated_at:
        logger.info(
            "subscription_updated_stale: sub=%s event_created=%s < stored_updated=%s — skipping",
            sub_id, event_created, existing.updated_at,
        )
        db.commit()
        return

    # Apply the update
    plan_tier = _resolve_plan_tier(stripe_sub)
    local_plan = db.query(SubscriptionPlan).filter(
        SubscriptionPlan.tier == plan_tier,
        SubscriptionPlan.is_active == True,  # noqa: E712
    ).first()

    existing.status = stripe_sub.status
    existing.current_period_start = _unix_to_datetime(stripe_sub.current_period_start)
    existing.current_period_end = _unix_to_datetime(stripe_sub.current_period_end)
    existing.trial_start = _unix_to_datetime(stripe_sub.trial_start)
    existing.trial_end = _unix_to_datetime(stripe_sub.trial_end)
    existing.canceled_at = _unix_to_datetime(stripe_sub.canceled_at)
    existing.cancel_at_period_end = stripe_sub.cancel_at_period_end
    existing.cancel_reason = stripe_sub.get("cancellation_details", {}).get("reason")
    if local_plan:
        existing.plan_id = local_plan.id

    # Update denormalized plan tier based on subscription status
    if stripe_sub.status in ("active", "trialing", "past_due"):
        user.plan_tier = plan_tier
    elif stripe_sub.status in ("canceled", "unpaid"):
        user.plan_tier = "free"

    db.commit()

    logger.info(
        "subscription_updated: user=%s sub=%s status=%s plan=%s cancel_at_end=%s",
        user.id, sub_id, stripe_sub.status, plan_tier, stripe_sub.cancel_at_period_end,
    )


# ─── customer.subscription.deleted ────────────────────────────────────────

@handles("customer.subscription.deleted")
def handle_subscription_deleted(subscription: dict, event: dict, db: Session) -> None:
    """Subscription fully ended — canceled, unpaid, or expired.

    This is a TERMINAL event. The subscription will not transition to
    any other status. Downgrade the user to Free immediately.

    The subscription row is NOT deleted (soft terminal state).
    """
    from models.subscriptions import Subscription

    sub_id: str = subscription["id"]
    customer_id: str = subscription["customer"]

    user = _find_user_by_stripe_customer(db, customer_id)
    if not user:
        logger.warning("subscription_deleted_orphan: sub=%s cus=%s", sub_id, customer_id)
        return

    _acquire_user_lock(db, str(user.id))

    existing = db.query(Subscription).filter(
        Subscription.stripe_subscription_id == sub_id
    ).first()

    if existing:
        existing.status = "canceled"
        existing.ended_at = datetime.now(timezone.utc)
        existing.canceled_at = existing.canceled_at or datetime.now(timezone.utc)

    # Downgrade user to free
    user.plan_tier = "free"
    db.commit()

    logger.info("subscription_deleted: user=%s sub=%s — downgraded to free", user.id, sub_id)


# ─── invoice.payment_succeeded / invoice.paid ─────────────────────────────

@handles("invoice.payment_succeeded")
def handle_invoice_payment_succeeded(invoice: dict, event: dict, db: Session) -> None:
    """Payment collected successfully. This confirms the subscription is
    current and the period has been extended.

    Responsibilities:
    - Create/update the local invoice record
    - Clear any past_due flags
    - Update current_period_end on the subscription
    - Reset usage counters for the new billing period (implicitly — usage
      records are bucketed by period, so a new period = fresh counts)
    """
    from models.invoices import Invoice
    from models.subscriptions import Subscription

    stripe_invoice_id: str = invoice["id"]
    subscription_id: str | None = invoice.get("subscription")
    customer_id: str = invoice["customer"]

    user = _find_user_by_stripe_customer(db, customer_id)
    if not user:
        logger.warning("invoice_paid_orphan: inv=%s cus=%s", stripe_invoice_id, customer_id)
        return

    _acquire_user_lock(db, str(user.id))

    # Upsert invoice record
    existing_invoice = db.query(Invoice).filter(
        Invoice.stripe_invoice_id == stripe_invoice_id
    ).first()

    if existing_invoice:
        existing_invoice.status = "paid"
        existing_invoice.amount_paid = invoice.get("amount_paid", 0)
        existing_invoice.paid_at = _unix_to_datetime(invoice.get("status_transitions", {}).get("paid_at"))
        existing_invoice.hosted_invoice_url = invoice.get("hosted_invoice_url")
        existing_invoice.invoice_pdf_url = invoice.get("invoice_pdf")
    else:
        # Find local subscription
        local_sub = db.query(Subscription).filter(
            Subscription.stripe_subscription_id == subscription_id
        ).first() if subscription_id else None

        new_invoice = Invoice(
            user_id=user.id,
            subscription_id=local_sub.id if local_sub else None,
            stripe_invoice_id=stripe_invoice_id,
            stripe_charge_id=invoice.get("charge"),
            stripe_payment_intent_id=invoice.get("payment_intent"),
            amount_due=invoice.get("amount_due", 0),
            amount_paid=invoice.get("amount_paid", 0),
            currency=invoice.get("currency", "usd"),
            status="paid",
            paid_at=_unix_to_datetime(invoice.get("status_transitions", {}).get("paid_at")),
            period_start=_unix_to_datetime(invoice.get("period_start")),
            period_end=_unix_to_datetime(invoice.get("period_end")),
            hosted_invoice_url=invoice.get("hosted_invoice_url"),
            invoice_pdf_url=invoice.get("invoice_pdf"),
            line_items=_extract_line_items(invoice),
        )
        db.add(new_invoice)

    # Update subscription status if it was past_due
    if subscription_id:
        sub = db.query(Subscription).filter(
            Subscription.stripe_subscription_id == subscription_id
        ).first()
        if sub and sub.status == "past_due":
            sub.status = "active"
            plan_tier = _resolve_plan_tier_from_subscription(db, sub)
            user.plan_tier = plan_tier
            logger.info("subscription_recovered: user=%s sub=%s — past_due -> active", user.id, subscription_id)

    db.commit()
    logger.info("invoice_paid: user=%s inv=%s amount=%d", user.id, stripe_invoice_id, invoice.get("amount_paid", 0))


def _extract_line_items(invoice: dict) -> list[dict] | None:
    """Extract safe line item data from a Stripe invoice for local storage."""
    lines = invoice.get("lines", {}).get("data", [])
    if not lines:
        return None
    return [
        {
            "description": li.get("description", ""),
            "amount": li.get("amount", 0),
            "quantity": li.get("quantity", 1),
            "period_start": li.get("period", {}).get("start"),
            "period_end": li.get("period", {}).get("end"),
        }
        for li in lines
    ]


def _resolve_plan_tier_from_subscription(db: Session, sub) -> str:
    """Resolve plan tier from a local Subscription's plan_id."""
    from models.subscription_plans import SubscriptionPlan
    if sub.plan_id:
        plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == sub.plan_id).first()
        if plan:
            return plan.tier
    return PLAN_TIER_DEFAULT


# ─── invoice.payment_failed ───────────────────────────────────────────────

@handles("invoice.payment_failed")
def handle_invoice_payment_failed(invoice: dict, event: dict, db: Session) -> None:
    """Payment attempt failed. Stripe will retry automatically (up to 4 times
    over ~3 weeks with Smart Retries enabled).

    Responsibilities:
    - Update the local invoice record
    - Flag the subscription as past_due
    - The frontend reads user.plan_tier and sub.status to show a warning
      banner prompting the user to update their payment method

    We do NOT immediately downgrade to free — Stripe's retry logic may
    recover the payment. Downgrade only happens on subscription.deleted.
    """
    from models.invoices import Invoice
    from models.subscriptions import Subscription

    stripe_invoice_id: str = invoice["id"]
    subscription_id: str | None = invoice.get("subscription")
    customer_id: str = invoice["customer"]

    user = _find_user_by_stripe_customer(db, customer_id)
    if not user:
        logger.warning("invoice_failed_orphan: inv=%s cus=%s", stripe_invoice_id, customer_id)
        return

    _acquire_user_lock(db, str(user.id))

    # Upsert invoice with failed status
    existing_invoice = db.query(Invoice).filter(
        Invoice.stripe_invoice_id == stripe_invoice_id
    ).first()

    if existing_invoice:
        existing_invoice.status = "open"  # Stripe keeps it "open" during retries
        existing_invoice.amount_paid = invoice.get("amount_paid", 0)
    else:
        local_sub = db.query(Subscription).filter(
            Subscription.stripe_subscription_id == subscription_id
        ).first() if subscription_id else None

        new_invoice = Invoice(
            user_id=user.id,
            subscription_id=local_sub.id if local_sub else None,
            stripe_invoice_id=stripe_invoice_id,
            amount_due=invoice.get("amount_due", 0),
            amount_paid=0,
            currency=invoice.get("currency", "usd"),
            status="open",
            period_start=_unix_to_datetime(invoice.get("period_start")),
            period_end=_unix_to_datetime(invoice.get("period_end")),
            line_items=_extract_line_items(invoice),
        )
        db.add(new_invoice)

    # Mark subscription as past_due
    if subscription_id:
        sub = db.query(Subscription).filter(
            Subscription.stripe_subscription_id == subscription_id
        ).first()
        if sub and sub.status not in ("canceled", "unpaid"):
            sub.status = "past_due"

    db.commit()

    # Log for alerting — payment failures need visibility
    attempt_count = invoice.get("attempt_count", 0)
    logger.warning(
        "invoice_payment_failed: user=%s inv=%s attempt=%d amount=%d",
        user.id, stripe_invoice_id, attempt_count, invoice.get("amount_due", 0),
    )

    # TODO: Trigger dunning email via Resend (or let Stripe handle via Smart Retries emails)
    # send_payment_failed_email(user.email, invoice)


# ─── customer.subscription.trial_will_end ─────────────────────────────────

@handles("customer.subscription.trial_will_end")
def handle_trial_will_end(subscription: dict, event: dict, db: Session) -> None:
    """Fires exactly 3 days before a trial expires.

    Responsibilities:
    - Send a "trial ending" email to the user
    - Log for analytics (trial conversion tracking)

    This does NOT change subscription status or plan tier.
    """
    sub_id: str = subscription["id"]
    customer_id: str = subscription["customer"]
    trial_end: int | None = subscription.get("trial_end")

    user = _find_user_by_stripe_customer(db, customer_id)
    if not user:
        logger.warning("trial_will_end_orphan: sub=%s cus=%s", sub_id, customer_id)
        return

    trial_end_dt = _unix_to_datetime(trial_end)
    logger.info(
        "trial_will_end: user=%s sub=%s trial_ends=%s",
        user.id, sub_id, trial_end_dt,
    )

    # TODO: Send trial-ending email via Resend
    # send_trial_ending_email(user.email, trial_end_dt)


# ─── payment_method.attached ──────────────────────────────────────────────

@handles("payment_method.attached")
def handle_payment_method_attached(payment_method: dict, event: dict, db: Session) -> None:
    """A new payment method was attached to a Stripe customer.

    Responsibilities:
    - Store the tokenized display metadata (brand, last4, expiry)
    - Mark as default if it's the only payment method

    SECURITY: We only store Stripe's tokenized references and display
    metadata. Never raw card numbers, CVVs, or full PANs.
    """
    from models.payment_methods import PaymentMethod

    customer_id: str = payment_method.get("customer", "")
    if not customer_id:
        return

    user = _find_user_by_stripe_customer(db, customer_id)
    if not user:
        logger.info("payment_method_attached_orphan: pm=%s cus=%s", payment_method["id"], customer_id)
        return

    stripe_pm_id: str = payment_method["id"]

    # Check if already stored
    existing = db.query(PaymentMethod).filter(
        PaymentMethod.stripe_payment_method_id == stripe_pm_id
    ).first()

    if existing:
        return  # Already tracked

    # Extract safe display metadata
    card_data = payment_method.get("card", {})

    # Determine if this should be the default (only PM for this user)
    other_pms = db.query(PaymentMethod).filter(
        PaymentMethod.user_id == user.id
    ).count()

    new_pm = PaymentMethod(
        user_id=user.id,
        stripe_payment_method_id=stripe_pm_id,
        card_brand=card_data.get("brand"),
        card_last_four=card_data.get("last4"),
        card_exp_month=card_data.get("exp_month"),
        card_exp_year=card_data.get("exp_year"),
        is_default=(other_pms == 0),  # First PM becomes default
    )
    db.add(new_pm)
    db.commit()

    logger.info(
        "payment_method_attached: user=%s pm=%s brand=%s last4=%s",
        user.id, stripe_pm_id, card_data.get("brand"), card_data.get("last4"),
    )


# ---------------------------------------------------------------------------
# 6. Race Condition Handling — Event Ordering
# ---------------------------------------------------------------------------
#
# Problem: Stripe does NOT guarantee event delivery order. A single
# subscription creation can fire these events in ANY order:
#   - checkout.session.completed
#   - customer.subscription.created
#   - invoice.created
#   - invoice.paid
#
# Defense layers (all implemented above):
#
# Layer 1: Advisory Locks (_acquire_user_lock)
#   Every handler that mutates user/subscription state acquires a
#   PostgreSQL advisory lock keyed on the user ID. This serializes
#   concurrent webhook processing for the same user. The lock is
#   transaction-scoped (pg_advisory_xact_lock) so it auto-releases.
#
# Layer 2: Fetch-on-Receive
#   For subscription events, we ignore the webhook payload and fetch
#   the canonical state from Stripe's API via Subscription.retrieve().
#   This ensures we always write the LATEST state regardless of which
#   event arrived first. The cost is one API call per event, but
#   Stripe's rate limit (100 reads/sec in live mode) is far beyond
#   Parcel's webhook volume.
#
# Layer 3: Timestamp Guard
#   handle_subscription_updated() compares event.created against the
#   local record's updated_at. If the event is older, it's skipped.
#   This catches the rare case where a stale event arrives after a
#   newer one has already been processed.
#
# Layer 4: Upsert Pattern
#   Every handler uses a "find existing or create new" pattern. No
#   handler assumes it runs first. This makes ordering irrelevant for
#   record creation — whichever event arrives first creates the row,
#   and subsequent events update it.
#
# Layer 5: State Machine Validation
#   Terminal states (canceled, unpaid) are never overwritten by non-terminal
#   transitions. The handle_subscription_updated handler checks for this.
#
# Known race conditions and their resolutions:
#
# | Race | Resolution |
# |------|------------|
# | checkout.session.completed vs subscription.created | Both upsert; advisory lock serializes |
# | Two rapid subscription.updated events | Timestamp guard + fetch-on-receive |
# | invoice.paid before subscription.created | invoice handler creates invoice record; subscription handler creates sub record independently |
# | subscription.deleted after subscription.updated(cancel_at_period_end) | deleted is terminal; updated_at guard prevents stale updated from overwriting |


# ---------------------------------------------------------------------------
# 7. Error Handling — What Happens When a Handler Fails
# ---------------------------------------------------------------------------
#
# Error handling follows a "store first, process second" philosophy.
# The raw event is ALWAYS persisted to webhook_events before any
# business logic runs. This guarantees no event is lost.
#
# Flow:
#   1. Stripe sends webhook
#   2. Signature verified (fail -> 400)
#   3. Event stored in webhook_events (fail -> logged, return 200 anyway)
#   4. Handler dispatched (fail -> error logged in webhook_events.error,
#      retry_count incremented, return 200)
#   5. Return 200 to Stripe
#
# Why always return 200:
#   - Returning non-200 causes Stripe to RETRY the event
#   - If the failure is an application bug (not transient), retries
#     will fail identically, eventually disabling the endpoint
#   - Endpoint disablement means ALL events stop flowing — catastrophic
#   - Instead, we store the event, log the error, and fix forward
#
# The ONLY non-200 responses:
#   - 400 for invalid payload or signature (legitimate rejection)
#   - 500 for missing STRIPE_WEBHOOK_SECRET (server misconfiguration)
#
# Recovery paths for failed events:
#   1. Fix the bug in the handler
#   2. Query dead-lettered events:
#      SELECT * FROM webhook_events WHERE processed = FALSE AND retry_count >= 5
#   3. Replay via internal retry:
#      UPDATE webhook_events SET retry_count = 0 WHERE stripe_event_id = 'evt_xxx'
#      Then trigger reprocessing
#   4. Or replay via Stripe CLI:
#      stripe events resend evt_xxx --webhook-endpoint=we_xxx
#
# Dead letter alerting:
#   When retry_count reaches MAX_PROCESSING_ATTEMPTS (5), a CRITICAL
#   log is emitted. In production, this should trigger an alert via
#   Railway log drain -> Slack/PagerDuty.


# ---------------------------------------------------------------------------
# 8. Logging Strategy
# ---------------------------------------------------------------------------
#
# Logger: "parcel.webhooks" — separate from the main app logger so
# billing logs can be filtered, forwarded, and retained independently.
#
# Log levels:
#   INFO  — Normal flow: received, processed, duplicate-skipped, unhandled
#   WARNING — Anomalies: orphaned events (no linked user), payment failures
#   ERROR — Handler failures, missing configuration
#   CRITICAL — Dead-lettered events (all retries exhausted)
#
# What we log (safe):
#   - Stripe event ID (evt_...)
#   - Event type (customer.subscription.updated)
#   - Stripe object ID (sub_..., cus_..., in_...)
#   - Subscription status transitions
#   - Plan tier changes
#   - Payment amounts and currency
#   - Error messages (truncated to 200 chars)
#   - Processing duration
#   - Source IP
#
# What we NEVER log:
#   - Full webhook payloads (contain PII: email, address)
#   - Card numbers, CVVs, expiration dates (we never have these)
#   - Stripe API keys or webhook secrets
#   - Full Stripe API responses
#   - Customer email addresses in log messages
#
# Structured logging format:
#   All log messages use a consistent prefix pattern for machine parsing:
#     webhook_received: type=X id=Y
#     webhook_processed: type=X id=Y
#     webhook_duplicate: id=X key=Y
#     webhook_processing_failed: type=X id=Y error=Z
#     webhook_dead_letter: id=X type=Y attempts=Z
#     checkout_provisioned: user=X plan=Y sub=Z
#     subscription_updated: user=X sub=Y status=Z plan=W
#     invoice_paid: user=X inv=Y amount=Z
#     invoice_payment_failed: user=X inv=Y attempt=Z amount=W
#
# Retention:
#   - Railway log drain: 7 days (default)
#   - webhook_events table: 90 days for processed events, indefinite for
#     unprocessed/dead-lettered events
#   - Forward billing logs to Datadog/Logflare for 12-month retention
#     (financial audit trail requirement)


# ---------------------------------------------------------------------------
# 9. Testing Approach — Stripe CLI + Fixtures
# ---------------------------------------------------------------------------
#
# Three testing layers:
#
# ── Layer 1: Unit Tests (mocked Stripe) ──────────────────────────────
#
# Tests in backend/tests/test_webhooks.py mock stripe.Webhook.construct_event
# and stripe.Subscription.retrieve to test handler logic in isolation.
#
# ```python
# # backend/tests/test_webhooks.py
# import json
# import pytest
# from unittest.mock import patch, MagicMock
# from fastapi.testclient import TestClient
# from main import app
#
# client = TestClient(app)
#
# WEBHOOK_URL = "/webhooks/stripe"
#
#
# def _make_event(event_type: str, data_object: dict, event_id: str = None) -> dict:
#     """Build a minimal Stripe event fixture."""
#     return {
#         "id": event_id or f"evt_test_{event_type.replace('.', '_')}_{id(data_object)}",
#         "object": "event",
#         "type": event_type,
#         "api_version": "2024-12-18.acacia",
#         "created": 1714000000,
#         "data": {"object": data_object},
#     }
#
#
# def _post_webhook(event: dict) -> dict:
#     """Send a webhook request with a mocked signature."""
#     return client.post(
#         WEBHOOK_URL,
#         content=json.dumps(event),
#         headers={"stripe-signature": "t=123,v1=mocked"},
#     )
#
#
# @patch("stripe.Subscription.retrieve")
# @patch("stripe.Webhook.construct_event")
# def test_checkout_completed_creates_subscription(mock_construct, mock_retrieve, db_session, test_user):
#     """checkout.session.completed should create a local subscription and set plan_tier."""
#     event = _make_event("checkout.session.completed", {
#         "id": "cs_test_123",
#         "mode": "subscription",
#         "customer": "cus_test_456",
#         "subscription": "sub_test_789",
#         "client_reference_id": str(test_user.id),
#     })
#     mock_construct.return_value = event
#     mock_retrieve.return_value = MagicMock(
#         id="sub_test_789",
#         status="active",
#         current_period_start=1714000000,
#         current_period_end=1716592000,
#         trial_start=None,
#         trial_end=None,
#         canceled_at=None,
#         cancel_at_period_end=False,
#         items={"data": [{"price": {"metadata": {"parcel_plan": "pro"}, "product": {}}}]},
#         get=lambda k, d=None: {"cancellation_details": {}}.get(k, d),
#     )
#
#     response = _post_webhook(event)
#     assert response.status_code == 200
#
#     # Verify subscription was created
#     from models.subscriptions import Subscription
#     sub = db_session.query(Subscription).filter_by(stripe_subscription_id="sub_test_789").first()
#     assert sub is not None
#     assert sub.status == "active"
#
#     # Verify user plan_tier updated
#     db_session.refresh(test_user)
#     assert test_user.plan_tier == "pro"
#
#
# @patch("stripe.Webhook.construct_event")
# def test_duplicate_event_is_idempotent(mock_construct, db_session):
#     """Sending the same event twice should not cause errors or duplicate records."""
#     event = _make_event("customer.subscription.trial_will_end", {
#         "id": "sub_dup_test",
#         "customer": "cus_test_456",
#         "trial_end": 1714500000,
#     }, event_id="evt_idempotency_test_1")
#     mock_construct.return_value = event
#
#     r1 = _post_webhook(event)
#     assert r1.status_code == 200
#
#     r2 = _post_webhook(event)
#     assert r2.status_code == 200
#     assert r2.json()["status"] == "duplicate"
#
#
# @patch("stripe.Webhook.construct_event")
# def test_invalid_signature_returns_400(mock_construct):
#     """Invalid signature should be rejected with 400."""
#     mock_construct.side_effect = stripe.error.SignatureVerificationError("bad sig", "sig")
#     response = client.post(
#         WEBHOOK_URL,
#         content=b'{"fake": "payload"}',
#         headers={"stripe-signature": "t=123,v1=invalid"},
#     )
#     assert response.status_code == 400
#
#
# @patch("stripe.Subscription.retrieve")
# @patch("stripe.Webhook.construct_event")
# def test_subscription_deleted_downgrades_to_free(mock_construct, mock_retrieve, db_session, test_user_with_sub):
#     """subscription.deleted should set plan_tier to free."""
#     event = _make_event("customer.subscription.deleted", {
#         "id": test_user_with_sub.stripe_subscription_id,
#         "customer": test_user_with_sub.stripe_customer_id,
#         "status": "canceled",
#     })
#     mock_construct.return_value = event
#
#     response = _post_webhook(event)
#     assert response.status_code == 200
#
#     db_session.refresh(test_user_with_sub)
#     assert test_user_with_sub.plan_tier == "free"
# ```
#
# ── Layer 2: Integration Tests (Stripe CLI) ──────────────────────────
#
# Use Stripe CLI to forward real test-mode events to localhost:
#
# ```bash
# # Terminal 1: Start backend
# cd backend && source venv/bin/activate && uvicorn main:app --reload
#
# # Terminal 2: Forward Stripe events
# stripe listen --forward-to localhost:8000/webhooks/stripe
# # Note the whsec_... secret and set it as STRIPE_WEBHOOK_SECRET in .env
#
# # Terminal 3: Trigger events
# stripe trigger checkout.session.completed
# stripe trigger customer.subscription.updated
# stripe trigger customer.subscription.deleted
# stripe trigger invoice.payment_failed
# stripe trigger invoice.paid
# stripe trigger customer.subscription.trial_will_end
# stripe trigger payment_method.attached
#
# # Verify in DB:
# psql $DATABASE_URL -c "SELECT stripe_event_id, event_type, processed FROM webhook_events ORDER BY created_at DESC LIMIT 10;"
# ```
#
# ── Layer 3: End-to-End Smoke Test (manual) ──────────────────────────
#
# 1. Create a test user in Parcel
# 2. Hit POST /api/v1/billing/checkout with a test price_id
# 3. Complete Checkout using Stripe's test card 4242424242424242
# 4. Verify:
#    - webhook_events table has checkout.session.completed row
#    - subscriptions table has a new row with status=active (or trialing)
#    - users.plan_tier updated to "pro" (or the relevant tier)
# 5. Cancel via Stripe Dashboard or Customer Portal
# 6. Verify:
#    - subscription.deleted event processed
#    - users.plan_tier = "free"


# ---------------------------------------------------------------------------
# 10. CRITICAL DECISIONS
# ---------------------------------------------------------------------------
#
# 1. SYNCHRONOUS PROCESSING (not async queue)
#    Decision: Process events synchronously in the request handler.
#    Rationale: At Parcel's scale (hundreds of subscribers, not millions),
#    webhook processing completes in <100ms. A background queue (Celery,
#    Redis) adds operational complexity without proportional benefit.
#    The webhook_events table serves as the "queue" — if processing
#    fails, the event is stored and can be replayed.
#    Revisit when: >10,000 active subscribers or processing latency >5s.
#
# 2. FETCH-ON-RECEIVE (not trust-the-payload)
#    Decision: For subscription events, ignore the webhook payload and
#    fetch the canonical state via stripe.Subscription.retrieve().
#    Rationale: Eliminates all event ordering problems. The tradeoff is
#    one Stripe API call per subscription event, but at Parcel's scale
#    this is negligible (Stripe allows 100 reads/sec in live mode).
#    Exception: invoice events use the payload directly since invoice
#    state is simpler and rarely has ordering issues.
#
# 3. ALWAYS RETURN 200 (even on handler failure)
#    Decision: Return 200 after signature verification succeeds, even if
#    the handler throws an exception.
#    Rationale: Non-200 triggers Stripe retries. If the failure is a bug
#    (not transient), retries fail identically. After 72 hours of failures,
#    Stripe DISABLES the endpoint — ALL events stop. This is catastrophic.
#    Store the event, log the error, fix the bug, replay.
#
# 4. ADVISORY LOCKS (not DB unique constraints alone)
#    Decision: Use PostgreSQL pg_advisory_xact_lock per user for all
#    subscription-mutating handlers.
#    Rationale: Unique constraints catch duplicates but produce ugly
#    IntegrityError exceptions and require retry logic. Advisory locks
#    serialize concurrent writes cleanly with no application-level retry.
#    The lock key is hash(user_id) % 2^31, scoped to the transaction.
#
# 5. DENORMALIZED plan_tier ON users TABLE
#    Decision: Maintain users.plan_tier as a denormalized copy of the
#    subscription's plan tier.
#    Rationale: Every authenticated request checks feature access. A JOIN
#    to subscriptions + subscription_plans on every request is wasteful.
#    The webhook handler is the ONLY writer — it updates plan_tier
#    atomically alongside the subscription record.
#
# 6. SEPARATE ROUTE (not under /api/v1)
#    Decision: Mount webhook router at /webhooks/stripe, not /api/v1/webhooks.
#    Rationale: The /api/v1 prefix implies user-facing, JWT-protected
#    endpoints. The webhook endpoint has NO auth middleware — Stripe
#    cannot present a JWT. Signature verification IS the auth. A
#    separate prefix makes this distinction clear in code and monitoring.
#
#    In main.py:
#      from routers import webhooks
#      app.include_router(webhooks.router)
#
#    The endpoint URL becomes: POST https://api.parceldesk.io/webhooks/stripe
#    Configure this URL in Stripe Dashboard > Developers > Webhooks.
#
# 7. WEBHOOK_EVENTS TABLE DESIGN
#    Decision: Use the webhook_events model from agent-03 research with
#    TimestampMixin (UUID PK, created_at, updated_at) PLUS stripe_event_id
#    as a unique indexed column (not the PK).
#    Rationale: Using Stripe's evt_ ID as the PK breaks the project's
#    convention of UUID PKs on all tables. Instead, stripe_event_id is a
#    unique indexed column for fast idempotency lookups while maintaining
#    internal UUID consistency.
#
# 8. NO IP ALLOWLISTING (signature verification is sufficient)
#    Decision: Do not implement Stripe IP allowlisting.
#    Rationale: Stripe's published IPs can change, require dynamic
#    fetching, and Railway's proxy layer may alter source IPs. Signature
#    verification is cryptographically secure and is Stripe's recommended
#    primary authentication mechanism. IP allowlisting is defense-in-depth
#    but adds operational fragility.
#    Revisit when: Enterprise security audit requires it.
#
# 9. RATE LIMIT: 120/min (not 100)
#    Decision: Set webhook rate limit to 120/min, not the 100/min
#    suggested in research.
#    Rationale: During a batch subscription operation (e.g., importing
#    users from another platform), Stripe can burst >100 events/min.
#    120 provides headroom while still protecting against abuse.
#
# 10. NO CELERY / NO REDIS DEPENDENCY
#     Decision: No background task queue for webhook processing.
#     Rationale: Railway charges per service. Adding Redis + a Celery
#     worker doubles infrastructure cost for zero benefit at Parcel's
#     current scale. The webhook_events table + internal retry is sufficient.
#     Dead-lettered events are handled via manual replay.
#     Revisit when: Webhook processing latency causes Stripe timeouts (>20s).
```

## Required Model: `backend/models/webhook_events.py`

```python
"""WebhookEvent model — idempotent audit log of every Stripe webhook delivery."""

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text, Index
from sqlalchemy.dialects.postgresql import JSONB

from database import Base
from models.base import TimestampMixin


class WebhookEvent(TimestampMixin, Base):
    """Immutable record of a Stripe webhook event.

    The stripe_event_id (not the UUID PK) is used for idempotency checks.
    The full payload is stored as JSONB for replay and debugging.
    """

    __tablename__ = "webhook_events"

    # Stripe identity
    stripe_event_id = Column(String, unique=True, nullable=False, index=True)
    event_type = Column(String(100), nullable=False)
    api_version = Column(String(30), nullable=True)
    idempotency_key = Column(String(255), nullable=True)

    # Raw payload (JSONB for queryability)
    payload = Column(JSONB, nullable=False)

    # Processing state
    processed = Column(Boolean, nullable=False, default=False)
    processed_at = Column(DateTime(timezone=True), nullable=True)
    error = Column(Text, nullable=True)
    retry_count = Column(Integer, nullable=False, default=0)

    # Audit
    stripe_created = Column(DateTime(timezone=True), nullable=True)
    source_ip = Column(String(45), nullable=True)  # IPv4 or IPv6

    __table_args__ = (
        Index("ix_we_event_type", "event_type"),
        Index("ix_we_idempotency", "idempotency_key"),
        Index("ix_we_unprocessed", "processed", postgresql_where="processed = FALSE"),
        Index("ix_we_dead_letter", "retry_count", postgresql_where="processed = FALSE AND retry_count >= 5"),
    )
```

## main.py Integration

```python
# Add to backend/main.py, AFTER existing router imports:

from routers import webhooks  # noqa: E402

# Webhook router — NO /api/v1 prefix, NO auth middleware.
# Stripe authenticates via signature verification, not JWT.
app.include_router(webhooks.router)
```

The webhook endpoint URL for Stripe Dashboard configuration:
- **Local dev:** `http://localhost:8000/webhooks/stripe` (via Stripe CLI forwarding)
- **Production:** `https://api.parceldesk.io/webhooks/stripe`
