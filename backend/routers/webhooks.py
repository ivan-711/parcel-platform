"""Stripe webhook receiver — validates signatures, processes events idempotently."""

import hashlib
import logging
from datetime import datetime
from uuid import UUID

import stripe
from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from core.billing.config import get_stripe_settings
from core.billing.stripe_service import (
    get_or_create_customer,
    sync_subscription_from_stripe,
    _resolve_plan_from_subscription,
    _stripe_call,
)
from database import get_db
from limiter import limiter
from models.subscriptions import Subscription
from models.users import User
from models.webhook_events import WebhookEvent

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

# Event types we handle
_HANDLERS = {
    "checkout.session.completed": "_handle_checkout_session_completed",
    "customer.subscription.updated": "_handle_customer_subscription_updated",
    "customer.subscription.deleted": "_handle_customer_subscription_deleted",
    "invoice.payment_failed": "_handle_invoice_payment_failed",
}


def _advisory_lock(db: Session, user_id) -> None:
    """Acquire a PostgreSQL advisory lock scoped to the current transaction."""
    lock_key = int(hashlib.sha256(str(user_id).encode()).hexdigest(), 16) % (2**31 - 1)
    db.execute(text(f"SELECT pg_advisory_xact_lock({lock_key})"))


# ---------------------------------------------------------------------------
# Webhook endpoint
# ---------------------------------------------------------------------------


@router.post("/stripe")
@limiter.limit("120/minute")
async def stripe_webhook(
    request: Request,
    db: Session = Depends(get_db),
) -> JSONResponse:
    """Receive and process Stripe webhook events."""
    settings = get_stripe_settings()

    if not settings.is_configured:
        logger.error("Stripe is not configured — webhook rejected")
        return JSONResponse(
            status_code=500,
            content={"error": "Billing not configured", "code": "NOT_CONFIGURED"},
        )

    # 1. Read raw body and verify signature
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except stripe.error.SignatureVerificationError:
        logger.warning("Webhook signature verification failed")
        return JSONResponse(
            status_code=400,
            content={"error": "Invalid signature", "code": "INVALID_SIGNATURE"},
        )
    except ValueError:
        logger.warning("Webhook payload could not be parsed")
        return JSONResponse(
            status_code=400,
            content={"error": "Invalid payload", "code": "INVALID_PAYLOAD"},
        )

    event_id = event["id"]
    event_type = event["type"]
    event_data = event["data"]["object"]

    # 2. Idempotency check
    existing = (
        db.query(WebhookEvent)
        .filter(WebhookEvent.stripe_event_id == event_id)
        .first()
    )
    if existing and existing.processed:
        return JSONResponse(status_code=200, content={"status": "ok"})

    # 3. Store the event
    if not existing:
        event_row = WebhookEvent(
            stripe_event_id=event_id,
            event_type=event_type,
            payload=event["data"],
            processed=False,
        )
        db.add(event_row)
        db.commit()
        db.refresh(event_row)
    else:
        event_row = existing

    # 4. Dispatch to handler
    handler_name = _HANDLERS.get(event_type)
    if handler_name:
        try:
            handler_fn = globals()[handler_name]
            handler_fn(db, event_data)
            event_row.processed = True
            event_row.processed_at = datetime.utcnow()
            db.commit()
            logger.info("Processed webhook %s (%s)", event_id, event_type)
        except Exception as exc:
            db.rollback()
            event_row.error = str(exc)[:2000]
            event_row.retry_count += 1
            db.commit()
            logger.exception(
                "Error processing webhook %s (%s): %s", event_id, event_type, exc
            )
    else:
        # Unhandled event type — mark processed to avoid retries
        event_row.processed = True
        event_row.processed_at = datetime.utcnow()
        db.commit()
        logger.debug("Ignoring unhandled webhook event type: %s", event_type)

    return JSONResponse(status_code=200, content={"status": "ok"})


# ---------------------------------------------------------------------------
# Event handlers
# ---------------------------------------------------------------------------


def _handle_checkout_session_completed(db: Session, data: dict) -> None:
    """New subscription created via Checkout."""
    user_id = data.get("client_reference_id")
    stripe_sub_id = data.get("subscription")

    if not user_id or not stripe_sub_id:
        logger.warning("checkout.session.completed missing required fields")
        return

    _advisory_lock(db, user_id)

    user = db.query(User).filter(User.id == UUID(user_id)).first()
    if not user:
        logger.warning("checkout.session.completed: user %s not found", user_id)
        return

    get_or_create_customer(db, user)

    stripe_sub = _stripe_call(stripe.Subscription.retrieve, stripe_sub_id)

    # Create subscription row
    sub = Subscription(
        user_id=user.id,
        stripe_subscription_id=stripe_sub.id,
        stripe_customer_id=stripe_sub.customer,
        status=stripe_sub.status,
        plan_tier=_resolve_plan_from_subscription(stripe_sub),
        current_period_start=datetime.utcfromtimestamp(stripe_sub.current_period_start),
        current_period_end=datetime.utcfromtimestamp(stripe_sub.current_period_end),
    )
    if stripe_sub.trial_start:
        sub.trial_start = datetime.utcfromtimestamp(stripe_sub.trial_start)
    if stripe_sub.trial_end:
        sub.trial_end = datetime.utcfromtimestamp(stripe_sub.trial_end)

    db.add(sub)
    user.plan_tier = _resolve_plan_from_subscription(stripe_sub)
    db.commit()


def _handle_customer_subscription_updated(db: Session, data: dict) -> None:
    """Subscription changed (upgrade, downgrade, renewal, status change)."""
    stripe_sub_id = data.get("id")
    if not stripe_sub_id:
        return

    sync_subscription_from_stripe(db, stripe_sub_id)

    sub = (
        db.query(Subscription)
        .filter(Subscription.stripe_subscription_id == stripe_sub_id)
        .first()
    )
    if not sub:
        return

    _advisory_lock(db, sub.user_id)

    user = db.query(User).filter(User.id == sub.user_id).first()
    if not user:
        return

    if sub.status in ("active", "trialing"):
        user.plan_tier = sub.plan_tier
    elif sub.status in ("canceled", "unpaid"):
        user.plan_tier = "free"

    db.commit()


def _handle_customer_subscription_deleted(db: Session, data: dict) -> None:
    """Subscription fully canceled / ended."""
    stripe_sub_id = data.get("id")
    if not stripe_sub_id:
        return

    sub = (
        db.query(Subscription)
        .filter(Subscription.stripe_subscription_id == stripe_sub_id)
        .first()
    )
    if not sub:
        return

    _advisory_lock(db, sub.user_id)

    sub.status = "canceled"
    sub.ended_at = datetime.utcnow()

    user = db.query(User).filter(User.id == sub.user_id).first()
    if user:
        user.plan_tier = "free"

    db.commit()


def _handle_invoice_payment_failed(db: Session, data: dict) -> None:
    """Payment failed — mark subscription as past_due."""
    stripe_sub_id = data.get("subscription")
    if not stripe_sub_id:
        return

    sub = (
        db.query(Subscription)
        .filter(Subscription.stripe_subscription_id == stripe_sub_id)
        .first()
    )
    if not sub:
        return

    sub.status = "past_due"
    db.commit()
