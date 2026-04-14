# Agent 02 — Stripe Webhook Reliability for Parcel

**Date:** 2026-03-28
**Scope:** Bulletproof webhook handling for a subscription SaaS (Free / Starter $29 / Pro $69 / Team $149)
**Stack:** FastAPI + SQLAlchemy 2 + PostgreSQL (Railway) | React + Vite (Vercel)

---

## 1. Webhook Events Parcel Must Subscribe To

Not every Stripe event matters. Subscribe only to what Parcel needs — extraneous events waste server resources and increase attack surface.

### Tier 1 — Critical (block/break billing if missed)

| Event | Why Parcel Needs It |
|---|---|
| `checkout.session.completed` | User finished Checkout — provision their plan, link Stripe customer to Parcel user |
| `customer.subscription.created` | Subscription object exists — store `subscription_id`, `status`, `current_period_end` |
| `customer.subscription.updated` | Plan change, renewal, trial-to-paid conversion, cancellation scheduled — sync plan tier |
| `customer.subscription.deleted` | Subscription fully ended — downgrade user to Free |
| `invoice.paid` | Confirms payment collected — extend `current_period_end`, reset usage counters |
| `invoice.payment_failed` | Payment failed — flag account, show banner, trigger dunning email |
| `invoice.payment_action_required` | 3D Secure or SCA needed — prompt user to complete authentication |
| `customer.subscription.trial_will_end` | Fires 3 days before trial expires — send "trial ending" email |

### Tier 2 — Important (degrade experience if missed)

| Event | Why |
|---|---|
| `customer.subscription.paused` | If Parcel ever enables pause — restrict access without deleting data |
| `customer.subscription.resumed` | Restore access after pause |
| `invoice.created` | Upcoming invoice exists — useful for metered billing previews |
| `invoice.finalized` | Invoice locked — safe to show in billing history |
| `invoice.upcoming` | Fires ~3 days before renewal — preview next charge amount |
| `checkout.session.expired` | User abandoned Checkout — log for analytics, maybe send recovery email |

### Tier 3 — Defensive (monitor but lightweight handling)

| Event | Why |
|---|---|
| `customer.created` | Sanity check that Stripe customer was created before subscription |
| `customer.updated` | Email or metadata changed on Stripe side |
| `payment_method.attached` | New card added — update "has payment method" flag |
| `payment_method.detached` | Card removed — check if default payment method still exists |
| `charge.refunded` | Refund issued (manual or automatic) — adjust billing records |
| `charge.dispute.created` | Chargeback opened — flag account, potentially restrict access |
| `charge.dispute.closed` | Dispute resolved — unblock if won |

### Parcel-Specific Event Filter Config

```python
# stripe_config.py
WEBHOOK_EVENTS = [
    # Tier 1
    "checkout.session.completed",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "invoice.paid",
    "invoice.payment_failed",
    "invoice.payment_action_required",
    "customer.subscription.trial_will_end",
    # Tier 2
    "customer.subscription.paused",
    "customer.subscription.resumed",
    "invoice.created",
    "invoice.finalized",
    "invoice.upcoming",
    "checkout.session.expired",
    # Tier 3
    "customer.created",
    "customer.updated",
    "payment_method.attached",
    "payment_method.detached",
    "charge.refunded",
    "charge.dispute.created",
    "charge.dispute.closed",
]
```

When creating the endpoint in Dashboard or via API, pass this list so Stripe only sends what Parcel needs.

---

## 2. Idempotency: Handling Duplicate Deliveries

Stripe explicitly warns: **"Webhook endpoints might occasionally receive the same event more than once."** This is not an edge case — it is normal behavior, especially during retries.

### Strategy: Event ID Deduplication

Every Stripe event has a globally unique `id` (e.g., `evt_1NQtGH2eZvKYlo2C...`). Store processed event IDs and skip duplicates.

```python
from sqlalchemy import Column, String, DateTime, Text, Boolean, Integer, Index
from sqlalchemy.sql import func
from database import Base

class WebhookEvent(Base):
    __tablename__ = "webhook_events"

    id = Column(String(255), primary_key=True)             # evt_xxx — Stripe's event ID
    event_type = Column(String(100), nullable=False)        # e.g. "invoice.paid"
    api_version = Column(String(20), nullable=True)         # e.g. "2024-12-18.acacia"
    idempotency_key = Column(String(255), nullable=True)    # data.object.id + event_type
    payload = Column(Text, nullable=False)                  # full JSON for replay
    processed = Column(Boolean, default=False, nullable=False)
    processing_error = Column(Text, nullable=True)
    attempts = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_webhook_events_type", "event_type"),
        Index("ix_webhook_events_processed", "processed"),
        Index("ix_webhook_events_idempotency", "idempotency_key"),
        Index("ix_webhook_events_created", "created_at"),
    )
```

### Deduplication Check (Two-Layer)

```python
def is_duplicate(db: Session, event_id: str, idempotency_key: str) -> bool:
    """
    Layer 1: Exact event ID match (same delivery retried).
    Layer 2: Idempotency key match (different event ID, same logical operation).

    Stripe can send two distinct event objects for the same logical change.
    The idempotency_key = f"{data.object.id}:{event_type}" catches this.
    """
    exists = db.query(WebhookEvent).filter(
        (WebhookEvent.id == event_id) |
        (
            (WebhookEvent.idempotency_key == idempotency_key) &
            (WebhookEvent.processed == True)
        )
    ).first()
    return exists is not None
```

### Why Event ID Alone Is Not Enough

Stripe docs say: "For duplicate Event objects, identify them using the `data.object` ID combined with `event.type`." Two separate Event objects (different `evt_` IDs) can represent the same logical state change. The compound key `{object_id}:{event_type}` is the true idempotency key.

---

## 3. Event Ordering: Out-of-Order Arrival

Stripe states: **"Stripe doesn't guarantee the delivery of events in the order that they're generated."**

A single subscription creation can fire these events in *any* order:
- `customer.subscription.created`
- `invoice.created`
- `invoice.finalized`
- `invoice.paid`
- `checkout.session.completed`

### Defense Strategies

**Strategy A: Timestamp Comparison (recommended for Parcel)**

Every Stripe event has a `created` timestamp (Unix epoch). Every subscription/invoice object has an `updated` timestamp. Before applying a state change, compare:

```python
from datetime import datetime, timezone

def should_apply_subscription_update(
    db: Session,
    user_id: str,
    stripe_subscription: dict
) -> bool:
    """Only apply if this event is newer than what we already stored."""
    current = db.query(UserSubscription).filter_by(user_id=user_id).first()
    if not current:
        return True  # No existing record — always apply

    incoming_updated = stripe_subscription.get("updated", 0)
    # Stripe object timestamps are Unix epoch integers
    if incoming_updated <= current.stripe_updated_at:
        return False  # Stale event — skip
    return True
```

**Strategy B: Fetch-on-Receive (belt and suspenders)**

When order matters, ignore the event payload and fetch the current state directly from Stripe's API:

```python
import stripe

async def handle_subscription_updated(event: dict, db: Session):
    sub_id = event["data"]["object"]["id"]
    # Ignore event payload — fetch ground truth from Stripe
    subscription = stripe.Subscription.retrieve(sub_id)
    # Now apply the canonical state
    sync_subscription_to_db(db, subscription)
```

This eliminates ordering issues entirely — you always write the latest state. The tradeoff is an extra API call per webhook, but Stripe's rate limits (100 reads/sec in live mode) are generous for Parcel's scale.

**Strategy C: State Machine Validation**

Define legal state transitions and reject impossible ones:

```python
VALID_TRANSITIONS = {
    "trialing":    {"active", "canceled", "incomplete_expired", "paused"},
    "active":      {"past_due", "canceled", "unpaid", "paused"},
    "past_due":    {"active", "canceled", "unpaid"},
    "unpaid":      {"active", "canceled"},
    "canceled":    set(),           # terminal
    "incomplete":  {"active", "incomplete_expired"},
    "incomplete_expired": set(),    # terminal
    "paused":      {"active", "canceled"},
}

def is_valid_transition(current_status: str, new_status: str) -> bool:
    return new_status in VALID_TRANSITIONS.get(current_status, set())
```

---

## 4. Webhook Signature Verification

Every webhook request includes a `Stripe-Signature` header:

```
Stripe-Signature: t=1614556828,v1=abc123...,v1=def456...
```

- `t` = Unix timestamp of when Stripe sent the event
- `v1` = HMAC-SHA256 signature(s) computed over `{timestamp}.{raw_body}` using the webhook endpoint secret

### FastAPI Implementation

```python
import stripe
from fastapi import APIRouter, Request, HTTPException

router = APIRouter()

STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")  # whsec_...

@router.post("/webhooks/stripe", status_code=200)
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not sig_header:
        raise HTTPException(status_code=400, detail="Missing stripe-signature header")

    try:
        event = stripe.Webhook.construct_event(
            payload=payload,
            sig_header=sig_header,
            secret=STRIPE_WEBHOOK_SECRET,
            tolerance=300,  # 5-minute clock skew tolerance (default)
        )
    except ValueError:
        # Invalid payload (not valid JSON)
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        # Invalid signature — possible forgery
        raise HTTPException(status_code=400, detail="Invalid signature")

    # --- Signature valid — process event ---
    await process_webhook_event(event)
    return {"status": "ok"}
```

### Critical: Raw Body Access

FastAPI/Starlette gives you the raw body via `await request.body()`. Do NOT parse the JSON first — signature verification requires the exact bytes Stripe sent. If any middleware modifies the body (e.g., decompression, re-encoding), verification will fail.

### Tolerance Window

The default `tolerance=300` (5 minutes) protects against replay attacks. An attacker who captures a valid webhook cannot replay it after 5 minutes. Keep server clocks synced with NTP.

### Secret Rotation

When rotating the webhook secret in Dashboard, Stripe keeps the old secret valid for up to 24 hours. During this window, events carry two `v1=` signatures — one per secret. `construct_event` tries both. After rotation, update `STRIPE_WEBHOOK_SECRET` in Railway environment variables.

---

## 5. Retry Behavior

### Stripe's Retry Schedule

| Mode | Retries | Window | Backoff |
|---|---|---|---|
| **Live** | Up to ~16 attempts | Over 3 days (72 hours) | Exponential with jitter |
| **Test/Sandbox** | 3 attempts | Over a few hours | Exponential |

Stripe considers a delivery **failed** if:
- The endpoint does not return a `2xx` status code
- The endpoint takes longer than **20 seconds** to respond (timeout)
- The endpoint returns a `3xx` redirect (treated as failure)
- The connection cannot be established (DNS failure, TLS error, refused)

### Approximate Live Retry Schedule

Stripe does not publish exact intervals, but observed behavior follows approximately:

| Attempt | Delay After Previous |
|---|---|
| 1 (initial) | Immediate |
| 2 | ~1 minute |
| 3 | ~5 minutes |
| 4 | ~30 minutes |
| 5 | ~2 hours |
| 6 | ~5 hours |
| 7 | ~10 hours |
| 8+ | ~12-24 hours |

After 72 hours of failures, Stripe marks the endpoint as **disabled** and stops all deliveries — including for new events. You must manually re-enable it in Dashboard. This is catastrophic for billing — see Monitoring (Section 9).

### What Parcel Must Do

Return `200` IMMEDIATELY — before any database writes, API calls, or business logic:

```python
@router.post("/webhooks/stripe", status_code=200)
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
    except (ValueError, stripe.error.SignatureVerificationError):
        raise HTTPException(status_code=400, detail="Invalid webhook")

    # Store raw event for async processing — return 200 fast
    db = SessionLocal()
    try:
        webhook_event = WebhookEvent(
            id=event["id"],
            event_type=event["type"],
            api_version=event.get("api_version"),
            idempotency_key=f"{event['data']['object']['id']}:{event['type']}",
            payload=json.dumps(event),
            processed=False,
        )
        db.merge(webhook_event)  # merge handles duplicate PKs gracefully
        db.commit()
    except Exception:
        db.rollback()
        # Even on DB error, return 200 — Stripe will retry and we log server-side
        pass
    finally:
        db.close()

    # Enqueue for async processing (see Section 6)
    await enqueue_webhook_processing(event["id"])

    return {"status": "ok"}
```

---

## 6. Dead Letter Queue Pattern

When webhook processing fails (DB down, bug in handler, external API timeout), events must not be lost.

### Architecture

```
Stripe --POST--> /webhooks/stripe
                      |
                      v
               [webhook_events table]  <-- raw storage (always succeeds)
                      |
                      v
               [Background Worker]     <-- processes events async
                      |
                  success? --yes--> mark processed=True, set processed_at
                      |
                     no
                      |
                      v
               [Increment attempts, log error]
                      |
                  attempts >= MAX_RETRIES?
                      |
                     yes --> [Dead Letter: flag for manual review]
                     no  --> [Re-enqueue with exponential backoff]
```

### Background Worker (Lightweight — No Celery Needed)

For Parcel's scale (hundreds of subscriptions, not millions), a simple DB-polling worker or FastAPI BackgroundTasks suffices:

```python
from fastapi import BackgroundTasks
import asyncio

MAX_PROCESSING_ATTEMPTS = 5

async def enqueue_webhook_processing(event_id: str):
    """Fire-and-forget background processing."""
    # In production, use a proper queue (Redis, SQS, or pg LISTEN/NOTIFY).
    # For Parcel's scale, BackgroundTasks works fine initially.
    asyncio.create_task(process_webhook_with_retries(event_id))

async def process_webhook_with_retries(event_id: str):
    db = SessionLocal()
    try:
        event_record = db.query(WebhookEvent).get(event_id)
        if not event_record or event_record.processed:
            return

        event_data = json.loads(event_record.payload)

        try:
            await dispatch_event(event_data, db)
            event_record.processed = True
            event_record.processed_at = func.now()
            db.commit()
        except Exception as e:
            db.rollback()
            event_record.attempts += 1
            event_record.processing_error = str(e)[:2000]
            db.commit()

            if event_record.attempts < MAX_PROCESSING_ATTEMPTS:
                delay = min(2 ** event_record.attempts * 10, 3600)  # max 1hr
                await asyncio.sleep(delay)
                await process_webhook_with_retries(event_id)
            else:
                # Dead letter — needs manual intervention
                await alert_dead_letter(event_id, str(e))
    finally:
        db.close()

async def alert_dead_letter(event_id: str, error: str):
    """Send alert for events that exhausted all retries."""
    # Options: Slack webhook, email via SendGrid, PagerDuty
    print(f"DEAD LETTER: webhook event {event_id} failed after max retries: {error}")
```

### Dead Letter Query

```sql
-- Find all dead-lettered events
SELECT id, event_type, attempts, processing_error, created_at
FROM webhook_events
WHERE processed = FALSE AND attempts >= 5
ORDER BY created_at DESC;
```

---

## 7. Webhook Event Logging Table — Full Schema

```sql
CREATE TABLE webhook_events (
    id              VARCHAR(255) PRIMARY KEY,          -- Stripe event ID (evt_xxx)
    event_type      VARCHAR(100) NOT NULL,             -- e.g. "invoice.paid"
    api_version     VARCHAR(30),                       -- Stripe API version
    idempotency_key VARCHAR(255),                      -- "{object_id}:{event_type}"

    -- Raw storage
    payload         JSONB NOT NULL,                    -- Full event JSON (use JSONB for queryability)

    -- Processing state
    processed       BOOLEAN NOT NULL DEFAULT FALSE,
    processing_error TEXT,
    attempts        INTEGER NOT NULL DEFAULT 0,

    -- Timestamps
    stripe_created  TIMESTAMP WITH TIME ZONE,          -- event.created (from Stripe)
    received_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    processed_at    TIMESTAMP WITH TIME ZONE,

    -- Audit
    source_ip       INET                               -- Request IP for forensics
);

-- Indexes
CREATE INDEX ix_webhook_events_type ON webhook_events (event_type);
CREATE INDEX ix_webhook_events_processed ON webhook_events (processed) WHERE processed = FALSE;
CREATE INDEX ix_webhook_events_idempotency ON webhook_events (idempotency_key);
CREATE INDEX ix_webhook_events_received ON webhook_events (received_at);
CREATE INDEX ix_webhook_events_dead_letter ON webhook_events (attempts) WHERE processed = FALSE AND attempts >= 5;

-- Partial index for unprocessed events is critical — the full table grows forever,
-- but the worker only queries unprocessed rows.
```

### SQLAlchemy Model (Complete)

```python
from sqlalchemy import (
    Column, String, DateTime, Boolean, Integer, Text, Index
)
from sqlalchemy.dialects.postgresql import JSONB, INET
from sqlalchemy.sql import func
from database import Base

class WebhookEvent(Base):
    __tablename__ = "webhook_events"

    id = Column(String(255), primary_key=True)
    event_type = Column(String(100), nullable=False)
    api_version = Column(String(30), nullable=True)
    idempotency_key = Column(String(255), nullable=True)

    payload = Column(JSONB, nullable=False)

    processed = Column(Boolean, default=False, nullable=False)
    processing_error = Column(Text, nullable=True)
    attempts = Column(Integer, default=0, nullable=False)

    stripe_created = Column(DateTime(timezone=True), nullable=True)
    received_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    processed_at = Column(DateTime(timezone=True), nullable=True)

    source_ip = Column(INET, nullable=True)

    __table_args__ = (
        Index("ix_we_type", "event_type"),
        Index("ix_we_unprocessed", "processed", postgresql_where=(processed == False)),
        Index("ix_we_idempotency", "idempotency_key"),
        Index("ix_we_received", "received_at"),
        Index("ix_we_dead_letter", "attempts",
              postgresql_where="processed = FALSE AND attempts >= 5"),
    )
```

### Retention Policy

Webhook event logs grow unbounded. Implement a monthly cleanup:

```sql
-- Archive events older than 90 days that were successfully processed
DELETE FROM webhook_events
WHERE processed = TRUE AND received_at < NOW() - INTERVAL '90 days';
```

Never delete unprocessed or dead-lettered events.

---

## 8. Race Conditions

### The Classic Race: checkout.session.completed vs customer.subscription.created

When a user completes Stripe Checkout for a new subscription, both events fire near-simultaneously. They can arrive in either order — or be processed concurrently by two worker threads.

**The problem:** Both handlers might try to create the `user_subscriptions` record. One wins, one fails with a unique constraint violation.

### Solution: Upsert with Advisory Locks

```python
from sqlalchemy import text

async def dispatch_event(event: dict, db: Session):
    event_type = event["type"]
    obj = event["data"]["object"]

    if event_type == "checkout.session.completed":
        await handle_checkout_completed(obj, db)
    elif event_type == "customer.subscription.created":
        await handle_subscription_created(obj, db)
    elif event_type == "customer.subscription.updated":
        await handle_subscription_updated(obj, db)
    # ... etc

async def handle_checkout_completed(session: dict, db: Session):
    customer_id = session["customer"]
    subscription_id = session["subscription"]
    user_id = session["client_reference_id"]  # Set during Checkout Session creation

    # Advisory lock on user to prevent concurrent subscription writes
    lock_key = hash(user_id) % (2**31)
    db.execute(text(f"SELECT pg_advisory_xact_lock({lock_key})"))

    # Upsert — works regardless of whether subscription.created ran first
    existing = db.query(UserSubscription).filter_by(user_id=user_id).first()
    if existing:
        existing.stripe_subscription_id = subscription_id
        existing.stripe_customer_id = customer_id
        existing.status = "active"
        existing.plan = resolve_plan_from_price(session)
    else:
        db.add(UserSubscription(
            user_id=user_id,
            stripe_customer_id=customer_id,
            stripe_subscription_id=subscription_id,
            status="active",
            plan=resolve_plan_from_price(session),
        ))
    db.commit()

async def handle_subscription_created(subscription: dict, db: Session):
    customer_id = subscription["customer"]
    # Look up user by stripe_customer_id (set during checkout or customer creation)
    user = db.query(User).filter_by(stripe_customer_id=customer_id).first()
    if not user:
        # checkout.session.completed hasn't run yet — that's fine,
        # it will create the record. Log and return success.
        return

    lock_key = hash(str(user.id)) % (2**31)
    db.execute(text(f"SELECT pg_advisory_xact_lock({lock_key})"))

    existing = db.query(UserSubscription).filter_by(user_id=str(user.id)).first()
    if existing:
        # Already created by checkout handler — just update
        existing.status = subscription["status"]
        existing.current_period_end = subscription["current_period_end"]
    else:
        db.add(UserSubscription(
            user_id=str(user.id),
            stripe_customer_id=customer_id,
            stripe_subscription_id=subscription["id"],
            status=subscription["status"],
            plan=resolve_plan_from_subscription(subscription),
        ))
    db.commit()
```

### Key Principle: Every Handler Must Be a Safe Upsert

No handler should assume it runs first. Every handler should:
1. Acquire a per-user advisory lock
2. Check if the record exists
3. Create or update (upsert)
4. Commit

This makes event ordering irrelevant at the application level.

### Other Race Conditions to Watch

| Race | Scenario | Fix |
|---|---|---|
| `subscription.updated` x2 | Rapid plan changes fire two updates | Timestamp comparison — only apply if `updated > stored` |
| `invoice.paid` before `invoice.created` | Payment confirms before invoice record exists | `invoice.paid` handler creates invoice record if missing |
| `subscription.deleted` before `subscription.updated` | Cancellation arrives before the "cancel_at" update | State machine — don't transition from `canceled` to `active` |

---

## 9. Monitoring: Detecting Missed Webhooks

### Problem

If your endpoint goes down for >72 hours, Stripe disables it. You lose ALL events during downtime AND going forward until you notice and re-enable.

### Detection Strategies

**Strategy 1: Heartbeat Check (simplest)**

Create a cron job that verifies webhooks are flowing:

```python
from datetime import datetime, timedelta

def check_webhook_health(db: Session) -> dict:
    """Run every 30 minutes via cron/scheduler."""
    thirty_min_ago = datetime.utcnow() - timedelta(minutes=30)
    one_hour_ago = datetime.utcnow() - timedelta(hours=1)

    recent_count = db.query(WebhookEvent).filter(
        WebhookEvent.received_at >= thirty_min_ago
    ).count()

    # If zero events in an hour and you have active subscribers, alert
    active_subs = db.query(UserSubscription).filter(
        UserSubscription.status.in_(["active", "trialing", "past_due"])
    ).count()

    if active_subs > 10 and recent_count == 0:
        # Check Stripe's endpoint status via API
        endpoints = stripe.WebhookEndpoint.list(limit=10)
        for ep in endpoints.data:
            if ep.status == "disabled":
                alert_webhook_endpoint_disabled(ep.id)
                return {"status": "CRITICAL", "reason": "Endpoint disabled by Stripe"}

    return {"status": "ok", "events_last_30m": recent_count}
```

**Strategy 2: Reconciliation Job (most reliable)**

Periodically compare your database state against Stripe's source of truth:

```python
async def reconcile_subscriptions(db: Session):
    """Run daily. Compare every active Parcel subscription against Stripe."""
    parcel_subs = db.query(UserSubscription).filter(
        UserSubscription.status.in_(["active", "trialing", "past_due"])
    ).all()

    mismatches = []
    for sub in parcel_subs:
        try:
            stripe_sub = stripe.Subscription.retrieve(sub.stripe_subscription_id)
            if stripe_sub.status != sub.status:
                mismatches.append({
                    "user_id": sub.user_id,
                    "parcel_status": sub.status,
                    "stripe_status": stripe_sub.status,
                    "subscription_id": sub.stripe_subscription_id,
                })
                # Auto-fix: apply Stripe's truth
                sub.status = stripe_sub.status
                sub.plan = resolve_plan_from_subscription(stripe_sub)
                sub.current_period_end = stripe_sub.current_period_end
        except stripe.error.InvalidRequestError:
            mismatches.append({
                "user_id": sub.user_id,
                "error": "Subscription not found in Stripe",
            })

    db.commit()

    if mismatches:
        alert_subscription_mismatches(mismatches)

    return mismatches
```

**Strategy 3: Stripe Dashboard Alerts**

Stripe sends automatic emails when an endpoint is disabled. Ensure the Stripe account owner's email is monitored. This is a backstop, not a primary strategy.

---

## 10. Webhook Endpoint Security

### Layer 1: Signature Verification (mandatory)

Already covered in Section 4. This is non-negotiable — without it, anyone can forge webhook payloads.

### Layer 2: IP Allowlisting

Stripe publishes its webhook source IPs. For Railway deployments, implement at the application level:

```python
import ipaddress

# Fetch dynamically: https://stripe.com/files/ips/ips_webhooks.json
# Or hardcode with a refresh mechanism
STRIPE_WEBHOOK_IPS = {
    "3.18.12.63", "3.130.192.231", "13.235.14.237", "13.235.122.149",
    "18.211.135.69", "35.154.171.200", "52.15.183.38", "54.88.130.119",
    "54.88.130.237", "54.187.174.169", "54.187.205.235", "54.187.216.72",
    "35.157.207.129", "3.69.109.8", "3.120.168.93",
}

def verify_stripe_ip(request: Request) -> bool:
    """Check if request originates from Stripe's IP range."""
    # Railway sets X-Forwarded-For; get the leftmost (original client) IP
    forwarded = request.headers.get("x-forwarded-for", "")
    client_ip = forwarded.split(",")[0].strip() if forwarded else request.client.host
    return client_ip in STRIPE_WEBHOOK_IPS
```

**Warning:** IP allowlisting is defense-in-depth, not a primary control. IPs can change (Stripe provides a JSON endpoint for dynamic fetching). Always verify signatures regardless.

### Layer 3: Rate Limiting

Protect against DDoS or accidental event storms:

```python
from limiter import limiter

@router.post("/webhooks/stripe")
@limiter.limit("100/minute")  # Stripe won't legitimately send more than this
async def stripe_webhook(request: Request):
    ...
```

### Layer 4: HTTPS (mandatory in live mode)

Stripe requires HTTPS for live mode endpoints. Railway provides HTTPS by default on `*.up.railway.app` domains. Custom domains need TLS configured. Stripe validates the TLS certificate before sending data and requires TLS v1.2+.

### Layer 5: Separate Route, No Auth

The webhook endpoint must NOT be behind Parcel's JWT auth middleware. Stripe cannot authenticate as a user. Mount the webhook router separately:

```python
# main.py
from routers import billing_webhooks

# No /api/v1 prefix, no auth dependency
app.include_router(billing_webhooks.router, prefix="/webhooks")
```

---

## 11. Recovery: Replaying Missed Events

### When Recovery Is Needed

- Endpoint was disabled for hours/days
- Bug in handler caused events to be received but not processed
- Database outage caused commits to fail

### Method 1: Stripe Event List API

```python
import stripe
import time

def replay_missed_events(since_timestamp: int, event_types: list[str] = None):
    """
    Fetch events from Stripe's API that we may have missed.
    Events are available for 30 days.
    """
    has_more = True
    starting_after = None
    replayed = 0

    while has_more:
        params = {
            "created": {"gte": since_timestamp},
            "limit": 100,
        }
        if event_types:
            params["types"] = event_types  # Filter to relevant events only
        if starting_after:
            params["starting_after"] = starting_after

        events = stripe.Event.list(**params)

        for event in events.data:
            db = SessionLocal()
            try:
                existing = db.query(WebhookEvent).get(event.id)
                if existing and existing.processed:
                    continue  # Already handled

                # Store and process
                webhook_event = WebhookEvent(
                    id=event.id,
                    event_type=event.type,
                    api_version=event.api_version,
                    idempotency_key=f"{event.data.object.id}:{event.type}",
                    payload=json.dumps(event.to_dict()),
                    processed=False,
                    stripe_created=datetime.fromtimestamp(event.created),
                )
                db.merge(webhook_event)
                db.commit()

                # Process
                await dispatch_event(event.to_dict(), db)
                webhook_event.processed = True
                webhook_event.processed_at = func.now()
                db.commit()
                replayed += 1
            except Exception as e:
                db.rollback()
                print(f"Failed to replay {event.id}: {e}")
            finally:
                db.close()

        has_more = events.has_more
        if events.data:
            starting_after = events.data[-1].id

        time.sleep(0.1)  # Respect rate limits

    return replayed
```

### Method 2: Stripe CLI Resend

```bash
# Resend a specific event (available for 30 days)
stripe events resend evt_1NQtGH2eZvKYlo2C... --webhook-endpoint=we_1NQtGH...

# List recent events to find what was missed
stripe events list --limit 50
```

### Method 3: Full Reconciliation (nuclear option)

If event replay is unreliable (too many missed, >30 days old), do a full sync:

```python
async def full_stripe_reconciliation(db: Session):
    """
    Pull ALL active subscriptions from Stripe and rebuild local state.
    Use as a last resort — hits Stripe API heavily.
    """
    has_more = True
    starting_after = None

    while has_more:
        params = {"limit": 100, "status": "all"}
        if starting_after:
            params["starting_after"] = starting_after

        subscriptions = stripe.Subscription.list(**params)

        for sub in subscriptions.data:
            customer = stripe.Customer.retrieve(sub.customer)
            user = db.query(User).filter_by(email=customer.email).first()
            if not user:
                continue

            upsert_subscription(db, user.id, sub)

        has_more = subscriptions.has_more
        if subscriptions.data:
            starting_after = subscriptions.data[-1].id

    db.commit()
```

---

## 12. Testing: Local Development with Stripe CLI

### Setup

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login (opens browser)
stripe login

# Forward events to local FastAPI
stripe listen --forward-to localhost:8000/webhooks/stripe
# Output: Ready! Your webhook signing secret is whsec_abc123...
# Use this secret as STRIPE_WEBHOOK_SECRET in .env
```

### Trigger Specific Events

```bash
# Trigger individual events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.created
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
stripe trigger invoice.paid
stripe trigger invoice.payment_failed
stripe trigger customer.subscription.trial_will_end

# Trigger a full subscription lifecycle
stripe trigger customer.subscription.created --add customer:email=test@parcel.app

# Trigger with specific data overrides
stripe trigger payment_intent.succeeded \
  --override payment_intent:amount=6900 \
  --override payment_intent:currency=usd
```

### Integration Test Pattern

```python
# backend/tests/test_webhooks.py
import json
import stripe
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def make_webhook_payload(event_type: str, data_object: dict) -> dict:
    return {
        "id": f"evt_test_{event_type.replace('.', '_')}",
        "object": "event",
        "type": event_type,
        "api_version": "2024-12-18.acacia",
        "created": 1714000000,
        "data": {"object": data_object},
    }

@patch("stripe.Webhook.construct_event")
def test_checkout_completed_provisions_subscription(mock_construct):
    """Verify checkout.session.completed creates a UserSubscription."""
    payload = make_webhook_payload("checkout.session.completed", {
        "id": "cs_test_123",
        "customer": "cus_test_456",
        "subscription": "sub_test_789",
        "client_reference_id": "parcel-user-uuid-here",
        "mode": "subscription",
    })
    mock_construct.return_value = payload

    response = client.post(
        "/webhooks/stripe",
        content=json.dumps(payload),
        headers={"stripe-signature": "t=123,v1=fake"},
    )
    assert response.status_code == 200

@patch("stripe.Webhook.construct_event")
def test_duplicate_event_is_idempotent(mock_construct):
    """Sending the same event twice should not create duplicate records."""
    payload = make_webhook_payload("invoice.paid", {
        "id": "in_test_dup",
        "subscription": "sub_test_789",
        "amount_paid": 6900,
    })
    mock_construct.return_value = payload

    # Send twice
    client.post("/webhooks/stripe", content=json.dumps(payload),
                headers={"stripe-signature": "t=123,v1=fake"})
    client.post("/webhooks/stripe", content=json.dumps(payload),
                headers={"stripe-signature": "t=123,v1=fake"})

    # Assert only one record in webhook_events table
    # (test with actual DB assertion)

@patch("stripe.Webhook.construct_event")
def test_invalid_signature_returns_400(mock_construct):
    """Forged webhooks should be rejected."""
    mock_construct.side_effect = stripe.error.SignatureVerificationError(
        "Signature mismatch", "sig_header"
    )
    response = client.post(
        "/webhooks/stripe",
        content=b'{"fake": "payload"}',
        headers={"stripe-signature": "t=123,v1=forged"},
    )
    assert response.status_code == 400

def test_missing_signature_returns_400():
    """Requests without stripe-signature header should be rejected."""
    response = client.post(
        "/webhooks/stripe",
        content=b'{"some": "data"}',
    )
    assert response.status_code == 400
```

### Stripe CLI Testing Workflow

```bash
# Terminal 1: Start FastAPI
cd backend && source venv/bin/activate && uvicorn main:app --reload

# Terminal 2: Forward Stripe events to local
stripe listen --forward-to localhost:8000/webhooks/stripe --events \
  checkout.session.completed,\
  customer.subscription.created,\
  customer.subscription.updated,\
  customer.subscription.deleted,\
  invoice.paid,\
  invoice.payment_failed

# Terminal 3: Trigger test events
stripe trigger checkout.session.completed
stripe trigger invoice.payment_failed

# Terminal 2 output shows delivery status:
# 2026-03-28 10:15:03 --> checkout.session.completed [evt_xxx]
# 2026-03-28 10:15:03 <-- [200] POST http://localhost:8000/webhooks/stripe
```

---

## RECOMMENDATIONS FOR PARCEL

Prioritized by implementation order and risk reduction:

### Phase 1 — Foundation (implement before going live with billing)

1. **Create the `webhook_events` table** using the schema from Section 7. This is the single most important piece — it gives you auditability, replay capability, and dead letter support from day one. Use an Alembic migration.

2. **Implement signature verification first, everything else second.** Use `stripe.Webhook.construct_event()` as shown in Section 4. Without this, anyone can hit your endpoint and grant themselves a Pro plan.

3. **Return 200 immediately, process async.** Store the raw event in `webhook_events`, return 200, then process in the background. Stripe's 20-second timeout is not generous when you are doing DB writes + plan provisioning + email sends. Start with `asyncio.create_task`; graduate to Redis/pg-based queue when you have >500 subscribers.

4. **Subscribe to exactly the events listed in Section 1.** Configure this in Stripe Dashboard when creating the webhook endpoint. Do not use "receive all events."

5. **Two-layer idempotency** (Section 2): Check both `event.id` and the compound `{object_id}:{event_type}` key. Use `db.merge()` on the WebhookEvent model to handle duplicate inserts gracefully.

### Phase 2 — Robustness (implement within first month of billing)

6. **Make every handler an upsert** (Section 8). The `checkout.session.completed` and `customer.subscription.created` race is real and will bite you. Use PostgreSQL advisory locks keyed on `user_id` to serialize concurrent writes per user.

7. **Implement the timestamp guard** (Section 3, Strategy A). Before applying any subscription update, check `stripe_updated_at > stored_updated_at`. This costs nothing and prevents stale overwrites from out-of-order events.

8. **Add the state machine validation** (Section 3, Strategy C). Reject impossible transitions (e.g., `canceled` -> `active` via a stale event). Log rejected transitions for debugging.

9. **Write integration tests** using the patterns from Section 12. Test at minimum: checkout completion, duplicate delivery, invalid signature, subscription upgrade, subscription cancellation, and payment failure. Mock `stripe.Webhook.construct_event` to bypass signature verification in tests.

10. **Set up Stripe CLI forwarding** for local development. Add `STRIPE_WEBHOOK_SECRET` to `.env.example` with a placeholder. Document the `stripe listen` command for local testing.

### Phase 3 — Monitoring & Recovery (implement before scaling)

11. **Run a daily reconciliation job** (Section 9, Strategy 2). Compare every active `UserSubscription` against Stripe's API. Auto-fix mismatches and alert on discrepancies. This is your safety net for everything else failing. Schedule via Railway cron or a simple APScheduler job.

12. **Implement the webhook heartbeat check** (Section 9, Strategy 1). If zero events arrive in 60 minutes and you have active subscribers, check Stripe's endpoint status and alert. A disabled endpoint is a billing outage.

13. **Build the dead letter alerting** (Section 6). Events with `attempts >= 5 AND processed = FALSE` need human attention. Send a Slack/email alert. The `webhook_events` table already supports this — you just need the query and the alert integration.

14. **Add the event replay script** (Section 11, Method 1) as a management command. You will need it — the question is when, not if. Having it pre-built means recovery takes minutes instead of hours.

15. **IP allowlisting as defense-in-depth** (Section 10). Fetch Stripe's IP list from `https://stripe.com/files/ips/ips_webhooks.json` on startup or cache it. This is a secondary control behind signature verification — implement it, but do not rely on it alone.

### Architecture Summary

```
                            Stripe
                              |
                              | POST /webhooks/stripe
                              v
                    +---------+---------+
                    | IP Check (Layer 2) |
                    | Sig Verify (Layer 1)|
                    | Rate Limit (Layer 3)|
                    +---------+---------+
                              |
                              v
                    +-------------------+
                    | webhook_events    |  <-- Raw storage (always succeeds)
                    | table (JSONB)     |
                    +-------------------+
                              |
                         return 200
                              |
                    +---------+---------+
                    | Background Worker |
                    |                   |
                    | 1. Dedup check    |
                    | 2. Timestamp guard|
                    | 3. Advisory lock  |
                    | 4. Upsert handler |
                    | 5. Mark processed |
                    +---------+---------+
                              |
                         fail? retry
                              |
                    +---------+---------+
                    | Dead Letter Queue |
                    | (attempts >= 5)   |
                    +-------------------+
                              |
                         Alert (Slack)

           Daily: Reconciliation job compares DB <-> Stripe API
```

### What NOT To Do

- **Do not process webhooks synchronously in the request handler.** You will hit Stripe's 20-second timeout during database contention or downstream API calls.
- **Do not trust event payload blindly for critical state.** For plan provisioning, fetch from Stripe's API as confirmation (Strategy B, Section 3).
- **Do not hard-delete webhook event records.** They are your audit trail and replay source. Archive to cold storage after 90 days.
- **Do not ignore `customer.subscription.trial_will_end`.** This is your only reliable trigger for the "trial ending" email. Parcel offers a 14-day Pro trial — this event fires 3 days before expiry.
- **Do not skip testing with Stripe CLI.** Every handler should be tested with `stripe trigger` before deployment. It takes 5 minutes and catches 90% of webhook bugs.
