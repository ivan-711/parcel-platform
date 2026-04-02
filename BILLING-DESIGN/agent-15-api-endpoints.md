# Agent 15: Billing & Organization API Endpoint Catalog

> Complete endpoint specification for Parcel billing, subscription management,
> and organization/team features. Every endpoint includes FastAPI route signature,
> Pydantic request/response models, auth requirements, rate limits, and error responses.

---

## Table of Contents

1. [Pydantic Models (Shared)](#1-pydantic-models-shared)
2. [POST /billing/checkout](#2-post-billingcheckout)
3. [POST /billing/portal](#3-post-billingportal)
4. [GET /billing/subscription](#4-get-billingsubscription)
5. [GET /billing/usage](#5-get-billingusage)
6. [POST /billing/webhooks/stripe](#6-post-billingwebhooksstripe)
7. [GET /billing/plans](#7-get-billingplans)
8. [GET /billing/invoices](#8-get-billinginvoices)
9. [POST /billing/cancel](#9-post-billingcancel)
10. [POST /orgs](#10-post-orgs)
11. [POST /orgs/{id}/invitations](#11-post-orgsidinvitations)
12. [POST /orgs/invitations/{token}/accept](#12-post-orgsinvitationstokenaccept)
13. [DELETE /orgs/{id}/members/{user_id}](#13-delete-orgsidmembersuser_id)
14. [GET /orgs/{id}](#14-get-orgsid)
15. [PUT /orgs/{id}](#15-put-orgsid)
16. [CRITICAL DECISIONS](#critical-decisions)

---

## 1. Pydantic Models (Shared)

All models live in `backend/schemas/billing.py` and `backend/schemas/orgs.py`.
They follow the existing codebase pattern: `model_config = {"from_attributes": True}`
for ORM compatibility, explicit `Optional` annotations, and structured error `detail`
dicts with `error` + `code` keys matching the convention in `schemas/auth.py`.

### 1.1 Enums

```python
# backend/schemas/billing.py

import uuid
from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class PlanTier(str, Enum):
    """Subscription plan tiers. Order matters for hierarchy comparisons."""
    FREE = "free"
    STARTER = "starter"
    PRO = "pro"
    TEAM = "team"


TIER_RANK: dict[PlanTier, int] = {
    PlanTier.FREE: 0,
    PlanTier.STARTER: 1,
    PlanTier.PRO: 2,
    PlanTier.TEAM: 3,
}


class PlanInterval(str, Enum):
    MONTHLY = "monthly"
    ANNUAL = "annual"


class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    TRIALING = "trialing"
    PAST_DUE = "past_due"
    CANCELED = "canceled"
    UNPAID = "unpaid"
    INCOMPLETE = "incomplete"
    INCOMPLETE_EXPIRED = "incomplete_expired"


class OrgRole(str, Enum):
    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"
```

### 1.2 Billing Request Models

```python
# --- Checkout ---

class CheckoutRequest(BaseModel):
    """Request body for POST /billing/checkout."""
    plan: PlanTier
    interval: PlanInterval = PlanInterval.MONTHLY

    @field_validator("plan")
    @classmethod
    def plan_must_be_paid(cls, v: PlanTier) -> PlanTier:
        if v == PlanTier.FREE:
            raise ValueError("Cannot create checkout for the free plan")
        return v


class CheckoutResponse(BaseModel):
    """Response body for POST /billing/checkout."""
    checkout_url: str
    session_id: str


# --- Portal ---

class PortalResponse(BaseModel):
    """Response body for POST /billing/portal."""
    portal_url: str


# --- Cancel ---

class CancelRequest(BaseModel):
    """Request body for POST /billing/cancel."""
    reason: Optional[str] = Field(
        None,
        max_length=500,
        description="Optional cancellation reason for churn tracking",
    )
    immediate: bool = Field(
        False,
        description="If true, cancel immediately. If false (default), cancel at period end.",
    )


class CancelResponse(BaseModel):
    """Response body for POST /billing/cancel."""
    status: str                          # "canceled" or "cancel_scheduled"
    cancel_at: Optional[datetime] = None # When access ends (null if immediate)
    message: str
```

### 1.3 Billing Response Models

```python
# --- Subscription ---

class SubscriptionResponse(BaseModel):
    """Response body for GET /billing/subscription."""
    plan: PlanTier
    status: SubscriptionStatus
    interval: Optional[PlanInterval] = None
    current_period_start: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    cancel_at_period_end: bool = False
    trial_ends_at: Optional[datetime] = None
    stripe_customer_id: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# --- Usage ---

class UsageMetric(BaseModel):
    """A single usage metric with current count and limit."""
    resource: str                       # "analyses", "ai_messages", "saved_deals", "document_uploads"
    display_name: str                   # "Deal Analyses"
    current: int                        # Current usage count this period
    limit: Optional[int] = None         # None = unlimited
    resets_at: Optional[datetime] = None # When counter resets (null for lifetime limits)
    warning: bool = False               # True when >= 80% of limit consumed


class UsageResponse(BaseModel):
    """Response body for GET /billing/usage."""
    plan: PlanTier
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    metrics: list[UsageMetric]


# --- Plans ---

class PlanFeatures(BaseModel):
    """Feature description for a single plan."""
    analyses_per_month: Optional[int] = None       # None = unlimited
    saved_deals: Optional[int] = None
    ai_messages_per_month: Optional[int] = None
    ai_chat_enabled: bool
    pdf_export: bool
    pipeline_enabled: bool
    portfolio_enabled: bool
    document_uploads_per_month: Optional[int] = None
    offer_letter: bool
    share_deals: bool
    team_seats: Optional[int] = None
    custom_branding: bool


class PlanPrice(BaseModel):
    """Price info for a plan at a given interval."""
    price_id: str                       # Stripe Price ID (or lookup_key)
    interval: PlanInterval
    amount: int                         # Cents (e.g., 2900 = $29.00)
    currency: str = "usd"


class PlanDetail(BaseModel):
    """Full plan description including features and pricing."""
    tier: PlanTier
    name: str                           # "Starter", "Pro", "Team"
    description: str
    prices: list[PlanPrice]             # Monthly + annual options
    features: PlanFeatures
    highlighted: bool = False           # UI hint for "most popular" badge
    trial_days: Optional[int] = None    # e.g., 14 for Pro trial


class PlansResponse(BaseModel):
    """Response body for GET /billing/plans."""
    plans: list[PlanDetail]


# --- Invoices ---

class InvoiceItem(BaseModel):
    """A single invoice from Stripe."""
    id: str                             # Stripe Invoice ID
    number: Optional[str] = None        # Invoice number (e.g., "INV-0042")
    status: str                         # "paid", "open", "void", "draft", "uncollectible"
    amount_due: int                     # Cents
    amount_paid: int                    # Cents
    currency: str
    period_start: datetime
    period_end: datetime
    created_at: datetime
    hosted_invoice_url: Optional[str] = None  # Link to Stripe-hosted invoice page
    invoice_pdf: Optional[str] = None   # Direct PDF download URL


class InvoicesResponse(BaseModel):
    """Response body for GET /billing/invoices."""
    invoices: list[InvoiceItem]
    has_more: bool = False
```

### 1.4 Webhook Model

```python
class WebhookResponse(BaseModel):
    """Response body for POST /billing/webhooks/stripe."""
    status: str  # Always "ok" — Stripe needs a 200 to confirm receipt
```

### 1.5 Error Response Models

```python
class BillingError(BaseModel):
    """Standard error response for billing endpoints.

    Follows the existing Parcel error format:
    {"error": "Human-readable message", "code": "MACHINE_CODE"}
    """
    error: str
    code: str


class FeatureGatedError(BaseModel):
    """Extended error response for 402 Payment Required.

    Returned when a user attempts an action blocked by their tier or quota.
    The frontend intercepts 402 responses and triggers the upgrade modal.
    """
    error: str
    code: str                                # "FEATURE_GATED" | "QUOTA_EXCEEDED"
    feature: Optional[str] = None            # e.g., "ai_chat_enabled"
    resource: Optional[str] = None           # e.g., "analyses_per_month"
    current_usage: Optional[int] = None
    limit: Optional[int] = None
    current_tier: str
    required_tier: Optional[str] = None      # Minimum tier needed
    upgrade_url: str = "/settings/billing"
    resets_at: Optional[str] = None          # ISO datetime for metered resources
```

### 1.6 Organization Models

```python
# backend/schemas/orgs.py

import re
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator

from schemas.billing import OrgRole

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


# --- Create Org ---

class CreateOrgRequest(BaseModel):
    """Request body for POST /orgs."""
    name: str = Field(..., min_length=2, max_length=100)

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Organization name cannot be blank")
        return v.strip()


class OrgMemberResponse(BaseModel):
    """A single member within an organization."""
    user_id: uuid.UUID
    name: str
    email: str
    role: OrgRole
    joined_at: datetime

    model_config = {"from_attributes": True}


class OrgResponse(BaseModel):
    """Full organization details, returned from GET /orgs/{id} and POST /orgs."""
    id: uuid.UUID
    name: str
    branding: Optional[dict] = None        # {"logo_url": "...", "accent_color": "#..."}
    owner_id: uuid.UUID
    plan: str                              # Echoes the owner's plan tier
    member_count: int
    seat_limit: Optional[int] = None       # None = per plan default
    members: list[OrgMemberResponse]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Update Org ---

class UpdateOrgRequest(BaseModel):
    """Request body for PUT /orgs/{id}. All fields optional for partial update."""
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    branding: Optional[dict] = None        # {"logo_url": "...", "accent_color": "#..."}

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("Organization name cannot be blank")
        return v.strip() if v else v


# --- Invite Member ---

class InviteMemberRequest(BaseModel):
    """Request body for POST /orgs/{id}/invitations."""
    email: str
    role: OrgRole = OrgRole.MEMBER

    @field_validator("email")
    @classmethod
    def email_format(cls, v: str) -> str:
        if not _EMAIL_RE.match(v):
            raise ValueError("Invalid email address")
        return v.lower()

    @field_validator("role")
    @classmethod
    def role_not_owner(cls, v: OrgRole) -> OrgRole:
        if v == OrgRole.OWNER:
            raise ValueError("Cannot invite a member with the owner role")
        return v


class InvitationResponse(BaseModel):
    """Response body for POST /orgs/{id}/invitations."""
    id: uuid.UUID
    org_id: uuid.UUID
    org_name: str
    email: str
    role: OrgRole
    invited_by: str                        # Name of the inviting user
    expires_at: datetime
    created_at: datetime


# --- Accept Invitation ---

class AcceptInvitationResponse(BaseModel):
    """Response body for POST /orgs/invitations/{token}/accept."""
    org_id: uuid.UUID
    org_name: str
    role: OrgRole
    message: str


# --- Remove Member ---

class RemoveMemberResponse(BaseModel):
    """Response body for DELETE /orgs/{id}/members/{user_id}."""
    message: str
    removed_user_id: uuid.UUID
```

---

## 2. POST /billing/checkout

**Purpose:** Create a Stripe Checkout Session for a paid plan subscription. Returns
a redirect URL to Stripe's hosted checkout page.

**Full path:** `POST /api/v1/billing/checkout`

### Route Signature

```python
# backend/routers/billing.py

import os
import logging
from datetime import datetime, timezone

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from core.security.jwt import get_current_user
from core.demo import is_demo_user
from database import get_db
from limiter import limiter
from models.users import User
from schemas.billing import (
    CheckoutRequest,
    CheckoutResponse,
    PlanTier,
    PlanInterval,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/billing", tags=["billing"])

# Stripe price lookup keys, resolved to price IDs via env vars at startup.
# Format: STRIPE_PRICE_{PLAN}_{INTERVAL} e.g. STRIPE_PRICE_PRO_MONTHLY
_PRICE_MAP: dict[tuple[PlanTier, PlanInterval], str] = {}


def _get_price_id(plan: PlanTier, interval: PlanInterval) -> str:
    """Resolve the Stripe Price ID for a plan+interval from environment variables."""
    key = f"STRIPE_PRICE_{plan.value.upper()}_{interval.value.upper()}"
    price_id = os.getenv(key)
    if not price_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Price configuration missing", "code": "PRICE_NOT_CONFIGURED"},
        )
    return price_id


@router.post("/checkout", response_model=CheckoutResponse)
@limiter.limit("10/minute")
async def create_checkout_session(
    request: Request,
    body: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CheckoutResponse:
    """Create a Stripe Checkout Session for subscription signup or upgrade.

    The user is redirected to Stripe's hosted checkout page. After payment,
    Stripe redirects back to the frontend success URL and fires a
    `checkout.session.completed` webhook to finalize the subscription.

    - Demo users are blocked (they should never enter a billing flow).
    - Users with an existing active subscription should use the Stripe
      Customer Portal for plan changes, not a new checkout.
    - Free-tier users get a 14-day trial on their first paid subscription.

    Returns:
        CheckoutResponse with `checkout_url` and `session_id`.

    Raises:
        400: Demo user, or user already has an active paid subscription.
        402: Validation error on plan selection.
        500: Stripe API error or missing price configuration.
    """
    if is_demo_user(current_user):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Demo accounts cannot subscribe to paid plans", "code": "DEMO_ACCOUNT"},
        )

    # Block if user already has an active paid subscription (use portal instead)
    if current_user.plan not in (PlanTier.FREE.value, "free") and current_user.plan_status in ("active", "trialing"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "You already have an active subscription. Use the billing portal to change plans.",
                "code": "ALREADY_SUBSCRIBED",
            },
        )

    stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
    price_id = _get_price_id(body.plan, body.interval)
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")

    # Find or create Stripe customer
    stripe_customer_id = current_user.stripe_customer_id
    if not stripe_customer_id:
        customer = stripe.Customer.create(
            email=current_user.email,
            name=current_user.name,
            metadata={"parcel_user_id": str(current_user.id)},
        )
        stripe_customer_id = customer.id
        current_user.stripe_customer_id = stripe_customer_id
        db.commit()

    # Build checkout session
    session_params: dict = {
        "customer": stripe_customer_id,
        "mode": "subscription",
        "line_items": [{"price": price_id, "quantity": 1}],
        "success_url": f"{frontend_url}/settings/billing?status=success&session_id={{CHECKOUT_SESSION_ID}}",
        "cancel_url": f"{frontend_url}/settings/billing?status=canceled",
        "subscription_data": {
            "metadata": {"parcel_user_id": str(current_user.id)},
        },
        "allow_promotion_codes": True,
        "client_reference_id": str(current_user.id),
    }

    # Offer 14-day trial only on first-ever paid subscription
    if not current_user.stripe_subscription_id:
        session_params["subscription_data"]["trial_period_days"] = 14

    try:
        session = stripe.checkout.Session.create(**session_params)
    except stripe.error.StripeError as e:
        logger.exception("Stripe checkout session creation failed for user %s", current_user.id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Failed to create checkout session", "code": "STRIPE_ERROR"},
        )

    return CheckoutResponse(checkout_url=session.url, session_id=session.id)
```

### Auth / Rate Limit / Errors

| Concern | Value |
|---|---|
| Auth | `Depends(get_current_user)` -- httpOnly cookie |
| Rate limit | 10/minute per IP |
| 400 | Demo user, already subscribed |
| 422 | Invalid plan (free tier) or missing fields |
| 500 | Stripe API failure, price not configured |

---

## 3. POST /billing/portal

**Purpose:** Create a Stripe Customer Portal session so the user can self-manage
their subscription (update payment method, switch plans, view invoices, cancel).

**Full path:** `POST /api/v1/billing/portal`

### Route Signature

```python
@router.post("/portal", response_model=PortalResponse)
@limiter.limit("10/minute")
async def create_portal_session(
    request: Request,
    current_user: User = Depends(get_current_user),
) -> PortalResponse:
    """Create a Stripe Customer Portal session for self-service billing management.

    The portal lets subscribers update payment methods, switch plans,
    view invoice history, and cancel. Requires an existing Stripe customer
    record (i.e., the user must have subscribed at some point).

    Returns:
        PortalResponse with `portal_url` to redirect the user to.

    Raises:
        400: User has no Stripe customer ID (never subscribed).
        400: Demo user.
        500: Stripe API error.
    """
    if is_demo_user(current_user):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Demo accounts do not have billing", "code": "DEMO_ACCOUNT"},
        )

    if not current_user.stripe_customer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "No billing account found. Subscribe to a plan first.",
                "code": "NO_BILLING_ACCOUNT",
            },
        )

    stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")

    try:
        session = stripe.billing_portal.Session.create(
            customer=current_user.stripe_customer_id,
            return_url=f"{frontend_url}/settings/billing",
        )
    except stripe.error.StripeError:
        logger.exception("Stripe portal session creation failed for user %s", current_user.id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Failed to create billing portal session", "code": "STRIPE_ERROR"},
        )

    return PortalResponse(portal_url=session.url)
```

### Auth / Rate Limit / Errors

| Concern | Value |
|---|---|
| Auth | `Depends(get_current_user)` |
| Rate limit | 10/minute per IP |
| 400 | No Stripe customer ID, demo user |
| 500 | Stripe API failure |

---

## 4. GET /billing/subscription

**Purpose:** Return the current user's subscription details -- plan tier, status,
period dates, trial info. The frontend reads this to render the billing settings
page and to populate the `usePlan()` hook on initial load.

**Full path:** `GET /api/v1/billing/subscription`

### Route Signature

```python
@router.get("/subscription", response_model=SubscriptionResponse)
async def get_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SubscriptionResponse:
    """Return the current user's active subscription details.

    If the user has no subscription record, returns a virtual Free-tier
    response. This endpoint is the canonical source for the frontend's
    plan state, complementing the plan field returned by /auth/me.

    Returns:
        SubscriptionResponse with plan, status, period dates, and trial info.
    """
    sub = (
        db.query(Subscription)
        .filter(Subscription.user_id == current_user.id)
        .order_by(Subscription.created_at.desc())
        .first()
    )

    if not sub:
        return SubscriptionResponse(
            plan=PlanTier.FREE,
            status=SubscriptionStatus.ACTIVE,
            interval=None,
            current_period_start=None,
            current_period_end=None,
            cancel_at_period_end=False,
            trial_ends_at=None,
            stripe_customer_id=current_user.stripe_customer_id,
            created_at=current_user.created_at,
        )

    return SubscriptionResponse(
        plan=PlanTier(sub.plan),
        status=SubscriptionStatus(sub.status),
        interval=PlanInterval(sub.interval) if sub.interval else None,
        current_period_start=sub.current_period_start,
        current_period_end=sub.current_period_end,
        cancel_at_period_end=sub.cancel_at_period_end,
        trial_ends_at=sub.trial_ends_at,
        stripe_customer_id=sub.stripe_customer_id,
        created_at=sub.created_at,
    )
```

### Auth / Rate Limit / Errors

| Concern | Value |
|---|---|
| Auth | `Depends(get_current_user)` |
| Rate limit | None (read-only, low cost) |
| 401 | Missing or expired auth cookie |

---

## 5. GET /billing/usage

**Purpose:** Return current-period usage stats for all metered resources (analyses,
AI messages, saved deals, document uploads). Powers the usage meters in the
billing settings page and the chat page header.

**Full path:** `GET /api/v1/billing/usage`

### Route Signature

```python
@router.get("/usage", response_model=UsageResponse)
async def get_usage(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UsageResponse:
    """Return current usage statistics for all metered resources.

    Counts are scoped to the current billing period (or calendar month for
    free-tier users). Each metric includes the current count, the plan's
    limit, a boolean warning flag (>= 80% consumed), and the reset datetime.

    This endpoint is called by the frontend's billing page and by the
    `useUsage()` hook for inline usage displays (e.g., chat message counter).

    Returns:
        UsageResponse with plan tier, period boundaries, and per-resource metrics.
    """
    from core.billing.plans import TIER_LIMITS
    from core.billing.usage import get_usage_counts, get_billing_period

    period_start, period_end = get_billing_period(current_user, db)
    limits = TIER_LIMITS[PlanTier(current_user.plan)]
    counts = get_usage_counts(current_user.id, period_start, db)

    def _build_metric(resource: str, display_name: str, current: int, limit_val: int | None) -> UsageMetric:
        warning = False
        if limit_val is not None and limit_val > 0:
            warning = current >= int(limit_val * 0.8)
        return UsageMetric(
            resource=resource,
            display_name=display_name,
            current=current,
            limit=limit_val,
            resets_at=period_end if limit_val is not None else None,
            warning=warning,
        )

    metrics = [
        _build_metric("analyses", "Deal Analyses", counts.get("analyses", 0), limits.analyses_per_month),
        _build_metric("saved_deals", "Saved Deals", counts.get("saved_deals", 0), limits.saved_deals),
        _build_metric("ai_messages", "AI Messages", counts.get("ai_messages", 0), limits.ai_messages_per_month),
        _build_metric("document_uploads", "Document Uploads", counts.get("document_uploads", 0), limits.document_uploads_per_month),
    ]

    return UsageResponse(
        plan=PlanTier(current_user.plan),
        period_start=period_start,
        period_end=period_end,
        metrics=metrics,
    )
```

### Auth / Rate Limit / Errors

| Concern | Value |
|---|---|
| Auth | `Depends(get_current_user)` |
| Rate limit | None (read-only) |
| 401 | Missing or expired auth cookie |

---

## 6. POST /billing/webhooks/stripe

**Purpose:** Receive and verify Stripe webhook events. Handles subscription
lifecycle transitions (checkout completed, subscription updated/deleted,
payment failures). This is the only endpoint that writes to the `subscriptions`
table outside of direct user actions.

**Full path:** `POST /api/v1/billing/webhooks/stripe`

### Route Signature

```python
@router.post("/webhooks/stripe", response_model=WebhookResponse)
async def stripe_webhook(
    request: Request,
    db: Session = Depends(get_db),
) -> WebhookResponse:
    """Handle incoming Stripe webhook events.

    Verifies the webhook signature using the STRIPE_WEBHOOK_SECRET env var.
    Processes subscription lifecycle events to keep the local subscriptions
    table in sync with Stripe.

    **No authentication required.** This endpoint is called by Stripe's
    servers, not by authenticated users. Security is provided by the
    webhook signature verification.

    **Idempotency:** Stores processed Stripe event IDs in a `stripe_events`
    table. Duplicate events are acknowledged (200) but not reprocessed.

    Handled events:
    - checkout.session.completed — Links Stripe subscription to Parcel user,
      sets plan + status in subscriptions table, updates user.plan.
    - customer.subscription.created — Records new subscription (may be trialing).
    - customer.subscription.updated — Handles plan changes, status transitions
      (active -> past_due, trialing -> active), period updates.
    - customer.subscription.deleted — Marks subscription canceled, downgrades
      user to free tier.
    - customer.subscription.trial_will_end — Triggers trial-ending-soon email
      (3 days before expiry).
    - invoice.payment_failed — Flags subscription as past_due, triggers
      dunning email.
    - invoice.payment_succeeded — Clears past_due status, confirms payment.
    - invoice.paid — Updates invoice records for billing history.

    Returns:
        {"status": "ok"} with 200 status. Stripe retries on non-2xx responses.

    Raises:
        400: Invalid payload or signature verification failure.
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not sig_header:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Missing Stripe signature header", "code": "MISSING_SIGNATURE"},
        )

    stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Invalid payload", "code": "INVALID_PAYLOAD"},
        )
    except stripe.error.SignatureVerificationError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Invalid signature", "code": "INVALID_SIGNATURE"},
        )

    # Idempotency check — skip already-processed events
    from models.stripe_events import StripeEvent
    existing = db.query(StripeEvent).filter(StripeEvent.stripe_event_id == event["id"]).first()
    if existing:
        return WebhookResponse(status="ok")

    # Record event for idempotency
    db.add(StripeEvent(
        stripe_event_id=event["id"],
        event_type=event["type"],
        processed_at=datetime.now(timezone.utc),
    ))

    event_type = event["type"]
    data = event["data"]["object"]

    from core.billing.webhook_handlers import (
        handle_checkout_completed,
        handle_subscription_created,
        handle_subscription_updated,
        handle_subscription_deleted,
        handle_trial_will_end,
        handle_payment_failed,
        handle_payment_succeeded,
    )

    handlers = {
        "checkout.session.completed": handle_checkout_completed,
        "customer.subscription.created": handle_subscription_created,
        "customer.subscription.updated": handle_subscription_updated,
        "customer.subscription.deleted": handle_subscription_deleted,
        "customer.subscription.trial_will_end": handle_trial_will_end,
        "invoice.payment_failed": handle_payment_failed,
        "invoice.payment_succeeded": handle_payment_succeeded,
    }

    handler = handlers.get(event_type)
    if handler:
        try:
            handler(data, db)
        except Exception:
            logger.exception("Webhook handler failed for event %s (type: %s)", event["id"], event_type)
            # Still return 200 to prevent Stripe from retrying endlessly.
            # The error is logged for manual investigation.

    db.commit()
    return WebhookResponse(status="ok")
```

### Auth / Rate Limit / Errors

| Concern | Value |
|---|---|
| Auth | **None** -- Stripe webhook signature verification replaces user auth |
| Rate limit | None (Stripe controls event delivery rate) |
| 400 | Invalid payload, missing/invalid signature |
| Note | Raw body access required -- do NOT parse JSON before signature check |

---

## 7. GET /billing/plans

**Purpose:** Return all available plans with their features, pricing, and metadata.
This is a public endpoint (no auth required) used by the landing page pricing
section and the in-app upgrade modal.

**Full path:** `GET /api/v1/billing/plans`

### Route Signature

```python
@router.get("/plans", response_model=PlansResponse)
async def get_plans() -> PlansResponse:
    """Return all available subscription plans with features and pricing.

    This endpoint is public (no authentication required) so it can be used
    on the marketing landing page. Plan details are defined in
    `core/billing/plans.py` and Stripe Price IDs are resolved from
    environment variables.

    The response includes feature flags per plan so the frontend can render
    comparison tables and feature checklists without hardcoding plan details.

    Returns:
        PlansResponse containing a list of PlanDetail objects.
    """
    from core.billing.plans import TIER_LIMITS, PLAN_METADATA

    plans: list[PlanDetail] = []

    for tier, meta in PLAN_METADATA.items():
        prices = []
        if tier != PlanTier.FREE:
            for interval in PlanInterval:
                price_env_key = f"STRIPE_PRICE_{tier.value.upper()}_{interval.value.upper()}"
                price_id = os.getenv(price_env_key, "")
                if price_id:
                    prices.append(PlanPrice(
                        price_id=price_id,
                        interval=interval,
                        amount=meta["prices"][interval.value],
                        currency="usd",
                    ))

        limits = TIER_LIMITS[tier]
        plans.append(PlanDetail(
            tier=tier,
            name=meta["name"],
            description=meta["description"],
            prices=prices,
            features=PlanFeatures(
                analyses_per_month=limits.analyses_per_month,
                saved_deals=limits.saved_deals,
                ai_messages_per_month=limits.ai_messages_per_month,
                ai_chat_enabled=limits.ai_chat_enabled,
                pdf_export=limits.pdf_export,
                pipeline_enabled=limits.pipeline_enabled,
                portfolio_enabled=limits.portfolio_enabled,
                document_uploads_per_month=limits.document_uploads_per_month,
                offer_letter=limits.offer_letter,
                share_deals=limits.share_deals,
                team_seats=limits.team_seats,
                custom_branding=limits.custom_branding,
            ),
            highlighted=meta.get("highlighted", False),
            trial_days=meta.get("trial_days"),
        ))

    return PlansResponse(plans=plans)
```

### Auth / Rate Limit / Errors

| Concern | Value |
|---|---|
| Auth | **None** -- public endpoint |
| Rate limit | 30/minute per IP (prevent scraping) |
| Note | No sensitive data exposed. Price IDs are not secret. |

---

## 8. GET /billing/invoices

**Purpose:** Return the authenticated user's billing history from Stripe. Each
invoice includes the amount, status, period, and links to the hosted invoice
page and PDF download.

**Full path:** `GET /api/v1/billing/invoices`

### Route Signature

```python
@router.get("/invoices", response_model=InvoicesResponse)
@limiter.limit("10/minute")
async def get_invoices(
    request: Request,
    limit: int = Query(10, ge=1, le=100, description="Number of invoices to return"),
    starting_after: Optional[str] = Query(None, description="Stripe invoice ID for pagination cursor"),
    current_user: User = Depends(get_current_user),
) -> InvoicesResponse:
    """Return the user's invoice history from Stripe.

    Fetches invoices directly from Stripe's API using the user's
    stripe_customer_id. Supports cursor-based pagination via the
    `starting_after` parameter (pass the last invoice's ID).

    Returns:
        InvoicesResponse with a list of InvoiceItem objects and a has_more flag.

    Raises:
        400: User has no Stripe customer ID (never subscribed).
        500: Stripe API error.
    """
    if not current_user.stripe_customer_id:
        return InvoicesResponse(invoices=[], has_more=False)

    stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

    params: dict = {
        "customer": current_user.stripe_customer_id,
        "limit": limit,
    }
    if starting_after:
        params["starting_after"] = starting_after

    try:
        invoices_data = stripe.Invoice.list(**params)
    except stripe.error.StripeError:
        logger.exception("Failed to fetch invoices for user %s", current_user.id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Failed to fetch invoices", "code": "STRIPE_ERROR"},
        )

    invoices = [
        InvoiceItem(
            id=inv.id,
            number=inv.number,
            status=inv.status,
            amount_due=inv.amount_due,
            amount_paid=inv.amount_paid,
            currency=inv.currency,
            period_start=datetime.fromtimestamp(inv.period_start, tz=timezone.utc),
            period_end=datetime.fromtimestamp(inv.period_end, tz=timezone.utc),
            created_at=datetime.fromtimestamp(inv.created, tz=timezone.utc),
            hosted_invoice_url=inv.hosted_invoice_url,
            invoice_pdf=inv.invoice_pdf,
        )
        for inv in invoices_data.data
    ]

    return InvoicesResponse(invoices=invoices, has_more=invoices_data.has_more)
```

### Auth / Rate Limit / Errors

| Concern | Value |
|---|---|
| Auth | `Depends(get_current_user)` |
| Rate limit | 10/minute per IP (Stripe API calls are relatively expensive) |
| 401 | Missing or expired auth cookie |
| 500 | Stripe API failure |

---

## 9. POST /billing/cancel

**Purpose:** Initiate subscription cancellation. By default, cancels at the end of
the current billing period (user keeps access until then). Optionally supports
immediate cancellation.

**Full path:** `POST /api/v1/billing/cancel`

### Route Signature

```python
@router.post("/cancel", response_model=CancelResponse)
@limiter.limit("5/minute")
async def cancel_subscription(
    request: Request,
    body: CancelRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CancelResponse:
    """Cancel the user's active subscription.

    Default behavior: cancel at the end of the current billing period. The
    user retains full plan access until `current_period_end`. Stripe sets
    `cancel_at_period_end = true` on the subscription.

    If `immediate=true`: cancel immediately. The user is downgraded to the
    free tier right away. A prorated credit is issued for the unused portion.

    The optional `reason` field is stored for churn analytics and forwarded
    to Stripe as subscription metadata.

    Note: The actual plan downgrade is triggered by the
    `customer.subscription.deleted` webhook when the period ends (or
    immediately if `immediate=true`). This endpoint only sets the
    cancellation intent.

    Returns:
        CancelResponse with status, cancellation date, and confirmation message.

    Raises:
        400: No active subscription, demo user.
        500: Stripe API error.
    """
    if is_demo_user(current_user):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Demo accounts cannot be canceled", "code": "DEMO_ACCOUNT"},
        )

    if not current_user.stripe_subscription_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "No active subscription to cancel", "code": "NO_SUBSCRIPTION"},
        )

    stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

    try:
        if body.immediate:
            # Cancel immediately -- triggers webhook -> downgrades to free
            subscription = stripe.Subscription.cancel(
                current_user.stripe_subscription_id,
            )
            cancel_at = datetime.now(timezone.utc)
            status_str = "canceled"
            message = "Your subscription has been canceled. You have been downgraded to the free plan."
        else:
            # Cancel at period end -- user keeps access until then
            subscription = stripe.Subscription.modify(
                current_user.stripe_subscription_id,
                cancel_at_period_end=True,
                metadata={"cancel_reason": body.reason or "not_specified"},
            )
            cancel_at = datetime.fromtimestamp(
                subscription.current_period_end, tz=timezone.utc
            )
            status_str = "cancel_scheduled"
            message = f"Your subscription will be canceled at the end of the current period. You retain full access until then."

        # Store reason locally for analytics
        sub_record = (
            db.query(Subscription)
            .filter(Subscription.user_id == current_user.id)
            .order_by(Subscription.created_at.desc())
            .first()
        )
        if sub_record:
            sub_record.cancel_at_period_end = True
            sub_record.cancel_reason = body.reason
            db.commit()

    except stripe.error.StripeError:
        logger.exception("Stripe cancel failed for user %s", current_user.id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Failed to cancel subscription", "code": "STRIPE_ERROR"},
        )

    return CancelResponse(status=status_str, cancel_at=cancel_at, message=message)
```

### Auth / Rate Limit / Errors

| Concern | Value |
|---|---|
| Auth | `Depends(get_current_user)` |
| Rate limit | 5/minute per IP (destructive action) |
| 400 | No subscription, demo user |
| 500 | Stripe API failure |

---

## 10. POST /orgs

**Purpose:** Create a new organization. The creating user becomes the org owner.
Requires a Team-tier subscription.

**Full path:** `POST /api/v1/orgs`

### Route Signature

```python
# backend/routers/orgs.py

import uuid as uuid_mod
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from core.security.jwt import get_current_user
from core.billing.guards import require_tier
from database import get_db
from limiter import limiter
from models.users import User
from models.organizations import Organization, OrgMembership
from schemas.billing import PlanTier
from schemas.orgs import (
    CreateOrgRequest,
    OrgResponse,
    OrgMemberResponse,
    OrgRole,
)

router = APIRouter(prefix="/orgs", tags=["organizations"])


@router.post("/", response_model=OrgResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def create_org(
    request: Request,
    body: CreateOrgRequest,
    current_user: User = Depends(get_current_user),
    _tier: None = Depends(require_tier(PlanTier.TEAM)),
    db: Session = Depends(get_db),
) -> OrgResponse:
    """Create a new organization.

    The authenticated user becomes the organization's owner. A user may own
    at most one organization. The organization's seat limit is determined by
    the owner's Team plan (default: 5 seats).

    Requires:
        Team-tier subscription.

    Returns:
        OrgResponse with full org details including the owner as the sole member.

    Raises:
        400: User already owns an organization.
        402: User is not on the Team tier.
    """
    # Check if user already owns an org
    existing = db.query(Organization).filter(Organization.owner_id == current_user.id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "You already own an organization", "code": "ORG_ALREADY_EXISTS"},
        )

    org = Organization(
        name=body.name,
        owner_id=current_user.id,
    )
    db.add(org)
    db.flush()  # Get org.id before creating membership

    # Add owner as first member
    membership = OrgMembership(
        org_id=org.id,
        user_id=current_user.id,
        role=OrgRole.OWNER.value,
        joined_at=datetime.now(timezone.utc),
    )
    db.add(membership)

    # Link user to the org
    current_user.team_id = org.id
    db.commit()
    db.refresh(org)

    return OrgResponse(
        id=org.id,
        name=org.name,
        branding=org.branding,
        owner_id=org.owner_id,
        plan=current_user.plan,
        member_count=1,
        seat_limit=5,  # Default Team seat limit
        members=[
            OrgMemberResponse(
                user_id=current_user.id,
                name=current_user.name,
                email=current_user.email,
                role=OrgRole.OWNER,
                joined_at=membership.joined_at,
            )
        ],
        created_at=org.created_at,
        updated_at=org.updated_at,
    )
```

### Auth / Rate Limit / Errors

| Concern | Value |
|---|---|
| Auth | `Depends(get_current_user)` + `Depends(require_tier(PlanTier.TEAM))` |
| Rate limit | 5/minute per IP |
| 400 | User already owns an org |
| 402 | Not on Team tier |

---

## 11. POST /orgs/{id}/invitations

**Purpose:** Invite a user to join an organization by email. Sends an invitation
email with a unique accept token.

**Full path:** `POST /api/v1/orgs/{id}/invitations`

### Route Signature

```python
import secrets

from schemas.orgs import InviteMemberRequest, InvitationResponse


@router.post("/{org_id}/invitations", response_model=InvitationResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def invite_member(
    request: Request,
    org_id: uuid_mod.UUID,
    body: InviteMemberRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> InvitationResponse:
    """Invite a new member to an organization.

    Only the org owner or an admin can send invitations. The invite is sent
    via email and contains a unique accept token valid for 7 days.

    Seat limits are enforced: if the org has reached its seat limit (based
    on the owner's plan), the invitation is rejected.

    Duplicate invitations to the same email are rejected if a pending
    (unexpired) invitation already exists.

    Requires:
        Owner or Admin role in the organization.

    Returns:
        InvitationResponse with invitation details and expiry.

    Raises:
        403: User is not an owner/admin of the org.
        400: Seat limit reached, duplicate pending invitation, or user already a member.
        404: Organization not found.
    """
    from models.organizations import OrgInvitation
    from core.email import send_org_invitation_email

    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Organization not found", "code": "ORG_NOT_FOUND"},
        )

    # Verify caller is owner or admin
    membership = (
        db.query(OrgMembership)
        .filter(OrgMembership.org_id == org_id, OrgMembership.user_id == current_user.id)
        .first()
    )
    if not membership or membership.role not in (OrgRole.OWNER.value, OrgRole.ADMIN.value):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "Only owners and admins can invite members", "code": "INSUFFICIENT_ROLE"},
        )

    # Check seat limit
    current_member_count = db.query(OrgMembership).filter(OrgMembership.org_id == org_id).count()
    pending_invite_count = (
        db.query(OrgInvitation)
        .filter(
            OrgInvitation.org_id == org_id,
            OrgInvitation.accepted_at.is_(None),
            OrgInvitation.expires_at > datetime.now(timezone.utc),
        )
        .count()
    )
    seat_limit = org.seat_limit or 5  # Default from Team plan
    if current_member_count + pending_invite_count >= seat_limit:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": f"Seat limit reached ({seat_limit} seats). Remove a member or upgrade your plan.",
                "code": "SEAT_LIMIT_REACHED",
            },
        )

    # Check if email is already a member
    existing_user = db.query(User).filter(User.email == body.email).first()
    if existing_user:
        already_member = (
            db.query(OrgMembership)
            .filter(OrgMembership.org_id == org_id, OrgMembership.user_id == existing_user.id)
            .first()
        )
        if already_member:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "This user is already a member of the organization", "code": "ALREADY_MEMBER"},
            )

    # Check for duplicate pending invitation
    pending = (
        db.query(OrgInvitation)
        .filter(
            OrgInvitation.org_id == org_id,
            OrgInvitation.email == body.email,
            OrgInvitation.accepted_at.is_(None),
            OrgInvitation.expires_at > datetime.now(timezone.utc),
        )
        .first()
    )
    if pending:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "A pending invitation already exists for this email", "code": "DUPLICATE_INVITATION"},
        )

    # Create invitation
    token = secrets.token_urlsafe(32)
    invitation = OrgInvitation(
        org_id=org_id,
        email=body.email,
        role=body.role.value,
        token_hash=hashlib.sha256(token.encode()).hexdigest(),
        invited_by_user_id=current_user.id,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    db.add(invitation)
    db.commit()
    db.refresh(invitation)

    # Send invitation email (fire-and-forget)
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    invite_url = f"{frontend_url}/orgs/invitations/{token}/accept"
    send_org_invitation_email(body.email, org.name, current_user.name, invite_url)

    return InvitationResponse(
        id=invitation.id,
        org_id=org_id,
        org_name=org.name,
        email=body.email,
        role=OrgRole(body.role),
        invited_by=current_user.name,
        expires_at=invitation.expires_at,
        created_at=invitation.created_at,
    )
```

### Auth / Rate Limit / Errors

| Concern | Value |
|---|---|
| Auth | `Depends(get_current_user)` + org role check (owner/admin) |
| Rate limit | 10/minute per IP |
| 400 | Seat limit reached, duplicate invitation, already a member |
| 403 | Not an owner/admin of the org |
| 404 | Organization not found |

---

## 12. POST /orgs/invitations/{token}/accept

**Purpose:** Accept an organization invitation using the token from the invitation
email. Adds the authenticated user to the organization.

**Full path:** `POST /api/v1/orgs/invitations/{token}/accept`

### Route Signature

```python
import hashlib

from schemas.orgs import AcceptInvitationResponse


@router.post("/invitations/{token}/accept", response_model=AcceptInvitationResponse)
@limiter.limit("10/minute")
async def accept_invitation(
    request: Request,
    token: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AcceptInvitationResponse:
    """Accept an organization invitation.

    Validates the invitation token, checks that it has not expired or been
    used, and adds the current user to the organization with the invited role.

    The user's `team_id` is updated to point to the organization. If the user
    is already a member of another organization, they must leave it first.

    Requires:
        Valid, unexpired invitation token. The authenticated user's email must
        match the invitation email.

    Returns:
        AcceptInvitationResponse confirming the org, role, and success message.

    Raises:
        400: Token invalid/expired/used, email mismatch, user already in another org.
    """
    from models.organizations import OrgInvitation

    token_hash = hashlib.sha256(token.encode()).hexdigest()

    invitation = (
        db.query(OrgInvitation)
        .filter(OrgInvitation.token_hash == token_hash)
        .first()
    )

    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Invalid invitation token", "code": "INVALID_TOKEN"},
        )

    if invitation.accepted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "This invitation has already been accepted", "code": "ALREADY_ACCEPTED"},
        )

    if datetime.now(timezone.utc) > invitation.expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "This invitation has expired", "code": "INVITATION_EXPIRED"},
        )

    # Email must match the invitation
    if current_user.email.lower() != invitation.email.lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "This invitation was sent to a different email address",
                "code": "EMAIL_MISMATCH",
            },
        )

    # Check if user is already in another org
    if current_user.team_id and current_user.team_id != invitation.org_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "You are already a member of another organization. Leave it first.",
                "code": "ALREADY_IN_ORG",
            },
        )

    # Add user to org
    membership = OrgMembership(
        org_id=invitation.org_id,
        user_id=current_user.id,
        role=invitation.role,
        joined_at=datetime.now(timezone.utc),
    )
    db.add(membership)

    # Mark invitation as accepted
    invitation.accepted_at = datetime.now(timezone.utc)

    # Update user's team_id
    current_user.team_id = invitation.org_id
    db.commit()

    org = db.query(Organization).filter(Organization.id == invitation.org_id).first()

    return AcceptInvitationResponse(
        org_id=invitation.org_id,
        org_name=org.name if org else "Unknown",
        role=OrgRole(invitation.role),
        message=f"You have joined {org.name if org else 'the organization'} as a {invitation.role}.",
    )
```

### Auth / Rate Limit / Errors

| Concern | Value |
|---|---|
| Auth | `Depends(get_current_user)` -- user must be logged in to accept |
| Rate limit | 10/minute per IP |
| 400 | Invalid/expired/used token, email mismatch, already in another org |

---

## 13. DELETE /orgs/{id}/members/{user_id}

**Purpose:** Remove a member from an organization. Owners can remove anyone.
Admins can remove regular members. Members can remove themselves (leave).

**Full path:** `DELETE /api/v1/orgs/{id}/members/{user_id}`

### Route Signature

```python
from schemas.orgs import RemoveMemberResponse


@router.delete("/{org_id}/members/{user_id}", response_model=RemoveMemberResponse)
@limiter.limit("10/minute")
async def remove_member(
    request: Request,
    org_id: uuid_mod.UUID,
    user_id: uuid_mod.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RemoveMemberResponse:
    """Remove a member from an organization.

    Permission rules:
    - **Owner** can remove any member (except themselves -- use transfer or delete org).
    - **Admin** can remove regular members only.
    - **Any member** can remove themselves (leave the org).

    When a member is removed, their `team_id` is set to NULL. Their deals,
    documents, and other data remain associated with their user account.

    The org owner cannot be removed through this endpoint. To transfer
    ownership, use a separate flow (future).

    Returns:
        RemoveMemberResponse confirming the removal.

    Raises:
        403: Insufficient permissions.
        400: Cannot remove the org owner.
        404: Org or member not found.
    """
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Organization not found", "code": "ORG_NOT_FOUND"},
        )

    # Get caller's membership
    caller_membership = (
        db.query(OrgMembership)
        .filter(OrgMembership.org_id == org_id, OrgMembership.user_id == current_user.id)
        .first()
    )
    if not caller_membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "You are not a member of this organization", "code": "NOT_A_MEMBER"},
        )

    # Get target's membership
    target_membership = (
        db.query(OrgMembership)
        .filter(OrgMembership.org_id == org_id, OrgMembership.user_id == user_id)
        .first()
    )
    if not target_membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Member not found in this organization", "code": "MEMBER_NOT_FOUND"},
        )

    # Cannot remove the owner
    if target_membership.role == OrgRole.OWNER.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "The organization owner cannot be removed", "code": "CANNOT_REMOVE_OWNER"},
        )

    is_self = current_user.id == user_id
    caller_role = caller_membership.role

    # Permission check
    if not is_self:
        if caller_role == OrgRole.MEMBER.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"error": "Members can only remove themselves", "code": "INSUFFICIENT_ROLE"},
            )
        if caller_role == OrgRole.ADMIN.value and target_membership.role == OrgRole.ADMIN.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"error": "Admins cannot remove other admins", "code": "INSUFFICIENT_ROLE"},
            )

    # Remove membership
    db.delete(target_membership)

    # Clear user's team_id
    target_user = db.query(User).filter(User.id == user_id).first()
    if target_user:
        target_user.team_id = None

    db.commit()

    action = "left" if is_self else "removed from"
    return RemoveMemberResponse(
        message=f"User has been {action} the organization.",
        removed_user_id=user_id,
    )
```

### Auth / Rate Limit / Errors

| Concern | Value |
|---|---|
| Auth | `Depends(get_current_user)` + org role check |
| Rate limit | 10/minute per IP |
| 400 | Cannot remove the owner |
| 403 | Insufficient role, not a member |
| 404 | Org or member not found |

---

## 14. GET /orgs/{id}

**Purpose:** Return organization details including all members, branding, and
seat usage.

**Full path:** `GET /api/v1/orgs/{id}`

### Route Signature

```python
@router.get("/{org_id}", response_model=OrgResponse)
async def get_org(
    org_id: uuid_mod.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OrgResponse:
    """Return full details for an organization.

    Only members of the organization can view its details. Returns the org
    name, branding configuration, owner, all members with their roles, and
    seat usage information.

    Returns:
        OrgResponse with org details and full member list.

    Raises:
        403: User is not a member of the org.
        404: Organization not found.
    """
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Organization not found", "code": "ORG_NOT_FOUND"},
        )

    # Verify caller is a member
    caller_membership = (
        db.query(OrgMembership)
        .filter(OrgMembership.org_id == org_id, OrgMembership.user_id == current_user.id)
        .first()
    )
    if not caller_membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "You are not a member of this organization", "code": "NOT_A_MEMBER"},
        )

    # Fetch all members
    memberships = (
        db.query(OrgMembership)
        .filter(OrgMembership.org_id == org_id)
        .all()
    )

    members = []
    for m in memberships:
        user = db.query(User).filter(User.id == m.user_id).first()
        if user:
            members.append(OrgMemberResponse(
                user_id=user.id,
                name=user.name,
                email=user.email,
                role=OrgRole(m.role),
                joined_at=m.joined_at,
            ))

    # Get owner's plan for seat_limit
    owner = db.query(User).filter(User.id == org.owner_id).first()

    return OrgResponse(
        id=org.id,
        name=org.name,
        branding=org.branding,
        owner_id=org.owner_id,
        plan=owner.plan if owner else "free",
        member_count=len(members),
        seat_limit=org.seat_limit or 5,
        members=members,
        created_at=org.created_at,
        updated_at=org.updated_at,
    )
```

### Auth / Rate Limit / Errors

| Concern | Value |
|---|---|
| Auth | `Depends(get_current_user)` + membership check |
| Rate limit | None (read-only) |
| 403 | Not a member of the org |
| 404 | Organization not found |

---

## 15. PUT /orgs/{id}

**Purpose:** Update organization settings (name, branding). Only the owner
or admins can modify the org.

**Full path:** `PUT /api/v1/orgs/{id}`

### Route Signature

```python
from schemas.orgs import UpdateOrgRequest


@router.put("/{org_id}", response_model=OrgResponse)
@limiter.limit("10/minute")
async def update_org(
    request: Request,
    org_id: uuid_mod.UUID,
    body: UpdateOrgRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OrgResponse:
    """Update organization settings.

    Supports partial updates -- only provided fields are changed. The `name`
    field updates the display name. The `branding` field accepts a JSON object
    with optional keys: `logo_url` (string) and `accent_color` (hex string).

    Custom branding requires the Team tier (enforced at the plan level, since
    org creation already requires Team). The `branding` field is stored as
    JSONB and passed directly to the frontend for rendering.

    Requires:
        Owner or Admin role in the organization.

    Returns:
        OrgResponse with updated details and full member list.

    Raises:
        403: User is not an owner/admin.
        404: Organization not found.
    """
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Organization not found", "code": "ORG_NOT_FOUND"},
        )

    # Verify caller is owner or admin
    membership = (
        db.query(OrgMembership)
        .filter(OrgMembership.org_id == org_id, OrgMembership.user_id == current_user.id)
        .first()
    )
    if not membership or membership.role not in (OrgRole.OWNER.value, OrgRole.ADMIN.value):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "Only owners and admins can update the organization", "code": "INSUFFICIENT_ROLE"},
        )

    # Apply updates
    if body.name is not None:
        org.name = body.name
    if body.branding is not None:
        org.branding = body.branding

    org.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(org)

    # Fetch members for response (same as GET /orgs/{id})
    memberships = db.query(OrgMembership).filter(OrgMembership.org_id == org_id).all()
    members = []
    for m in memberships:
        user = db.query(User).filter(User.id == m.user_id).first()
        if user:
            members.append(OrgMemberResponse(
                user_id=user.id,
                name=user.name,
                email=user.email,
                role=OrgRole(m.role),
                joined_at=m.joined_at,
            ))

    owner = db.query(User).filter(User.id == org.owner_id).first()

    return OrgResponse(
        id=org.id,
        name=org.name,
        branding=org.branding,
        owner_id=org.owner_id,
        plan=owner.plan if owner else "free",
        member_count=len(members),
        seat_limit=org.seat_limit or 5,
        members=members,
        created_at=org.created_at,
        updated_at=org.updated_at,
    )
```

### Auth / Rate Limit / Errors

| Concern | Value |
|---|---|
| Auth | `Depends(get_current_user)` + org role check (owner/admin) |
| Rate limit | 10/minute per IP |
| 403 | Not an owner/admin |
| 404 | Organization not found |

---

## Router Mounting

Both routers are mounted in `backend/main.py` alongside the existing routers:

```python
# backend/main.py (additions after line 43)
from routers import billing, orgs  # noqa: E402

app.include_router(billing.router, prefix="/api/v1")
app.include_router(orgs.router, prefix="/api/v1")
```

---

## Full Endpoint Summary Table

| # | Method | Path | Auth | Rate Limit | Status Codes |
|---|---|---|---|---|---|
| 1 | POST | /billing/checkout | Cookie (user) | 10/min | 200, 400, 422, 500 |
| 2 | POST | /billing/portal | Cookie (user) | 10/min | 200, 400, 500 |
| 3 | GET | /billing/subscription | Cookie (user) | -- | 200, 401 |
| 4 | GET | /billing/usage | Cookie (user) | -- | 200, 401 |
| 5 | POST | /billing/webhooks/stripe | Stripe signature | -- | 200, 400 |
| 6 | GET | /billing/plans | None (public) | 30/min | 200 |
| 7 | GET | /billing/invoices | Cookie (user) | 10/min | 200, 401, 500 |
| 8 | POST | /billing/cancel | Cookie (user) | 5/min | 200, 400, 500 |
| 9 | POST | /orgs | Cookie + Team tier | 5/min | 201, 400, 402 |
| 10 | POST | /orgs/{id}/invitations | Cookie + org role | 10/min | 201, 400, 403, 404 |
| 11 | POST | /orgs/invitations/{token}/accept | Cookie (user) | 10/min | 200, 400 |
| 12 | DELETE | /orgs/{id}/members/{user_id} | Cookie + org role | 10/min | 200, 400, 403, 404 |
| 13 | GET | /orgs/{id} | Cookie + membership | -- | 200, 403, 404 |
| 14 | PUT | /orgs/{id} | Cookie + org role | 10/min | 200, 403, 404 |

**Total new endpoints: 14** (8 billing + 6 organization)
**Total Parcel endpoints after billing: 49** (35 existing + 14 new)

---

## CRITICAL DECISIONS

### 1. HTTP 402 for billing gates, not 403

All tier-gated and quota-exceeded responses use **HTTP 402 Payment Required**, not
403 Forbidden. The existing codebase uses 403 for ownership/permission checks
(`ACCESS_DENIED` in deals.py). Keeping 402 distinct means the frontend API
interceptor can differentiate "you need to upgrade" (402 -> upgrade modal) from
"you don't own this resource" (403 -> error toast) without parsing the error body.

**Affected code:** `core/billing/guards.py` (`require_tier`, `require_quota`),
frontend `api.ts` interceptor, `chat-stream.ts` error handling.

### 2. Webhook signature verification replaces user auth

The `POST /billing/webhooks/stripe` endpoint has **no user authentication**.
It is secured entirely by Stripe's webhook signature verification
(`stripe.Webhook.construct_event`). The raw request body must be read before
any JSON parsing occurs. FastAPI handles this naturally since the route reads
`await request.body()` directly. This endpoint must NOT have
`Depends(get_current_user)`.

### 3. Stripe Checkout Sessions over Elements

The checkout flow redirects users to Stripe's hosted page rather than embedding
payment fields in the Parcel UI. This means zero PCI compliance burden, automatic
3D Secure/SCA handling, and Apple Pay/Google Pay support with no frontend Stripe
SDK. The tradeoff is a brief redirect away from Parcel, which is acceptable for
a SaaS at this stage. No `@stripe/stripe-js` dependency is added to the frontend.

### 4. Price IDs from environment variables, not hardcoded

Stripe Price IDs differ between test mode and live mode. All price IDs are
resolved from environment variables (`STRIPE_PRICE_PRO_MONTHLY`, etc.) rather
than hardcoded in source. The `GET /billing/plans` endpoint reads these at
runtime. This enables zero-code-change deployment between test and production
environments.

### 5. Cancellation at period end by default

`POST /billing/cancel` defaults to canceling at the end of the current billing
period (`cancel_at_period_end=true`). The user retains full access until then.
Immediate cancellation is opt-in via `immediate: true` in the request body. This
matches user expectations (they paid for the full period) and reduces churn from
accidental cancellations.

### 6. Organization creation gated to Team tier

`POST /orgs` requires `require_tier(PlanTier.TEAM)`. Organizations are not
available on Free, Starter, or Pro plans. This gate is enforced as a FastAPI
dependency, not a frontend-only check. The `require_tier` guard checks the
user's `plan` column and returns 402 if insufficient.

### 7. Invitation tokens are hashed before storage

Organization invitation tokens follow the same security pattern as password
reset tokens in `auth.py`: the raw token is sent in the email URL, and a
SHA-256 hash is stored in the database. This means a database breach does not
expose usable invitation links. Token expiry is 7 days (vs 1 hour for
password reset).

### 8. Idempotent webhook processing via stripe_events table

A `stripe_events` table stores processed Stripe event IDs. Before handling any
webhook event, the handler checks if the event ID has already been processed.
This prevents duplicate processing from Stripe retries (which happen on
timeouts or non-2xx responses). The event is recorded before the handler runs,
so even if the handler fails, the event is not reprocessed. Errors are logged
for manual investigation.

### 9. Demo users bypass all billing gates

Every billing guard (`require_tier`, `require_quota`) includes an early-return
check for `is_demo_user(current_user)`. The demo account has `plan = "demo"`
in the database and receives Pro-equivalent access. Billing endpoints (checkout,
portal, cancel) reject demo users with a 400 error. The demo account must never
touch Stripe.

### 10. Free tier has no Stripe subscription record

Users on the free tier have no row in the `subscriptions` table and no Stripe
Customer object. The `GET /billing/subscription` endpoint returns a virtual
Free-tier response when no subscription is found. The `GET /billing/usage`
endpoint uses calendar month boundaries for free-tier period calculations.
A Stripe Customer is created only when the user initiates their first checkout.

### 11. Seat limits enforce members plus pending invitations

When checking seat limits for `POST /orgs/{id}/invitations`, the count includes
both current members AND unexpired pending invitations. This prevents a race
condition where an admin could send 10 invitations to a 5-seat org before any
are accepted. The formula is:
`current_members + pending_invitations >= seat_limit`.

### 12. Users can belong to at most one organization

The existing `users.team_id` column (UUID FK, nullable) is reused as the
org membership pointer. A user cannot accept an invitation to a new org while
their `team_id` points to a different org. They must leave their current org
first. This simplifies data scoping (all of a user's deals/docs belong to one
context) and avoids multi-tenancy complexity at this stage.

### 13. Subscription data lives in a separate table, not just on the User model

While `users.plan` and `users.plan_status` are denormalized for fast access
(used by `get_current_user` and JWT claims), the canonical subscription state
lives in the `subscriptions` table. The webhook handler updates both the
subscription record and the user columns in the same transaction. This
separation enables subscription audit history and supports future scenarios
like multiple subscription records (e.g., after re-subscribing).

### 14. The billing router is a single file, not split per concern

All 8 billing endpoints live in `backend/routers/billing.py`. The 6 org
endpoints live in `backend/routers/orgs.py`. Business logic (Stripe API calls,
webhook handling, usage counting) is extracted into `core/billing/` modules.
This matches the existing codebase pattern where each router file contains
all endpoints for its domain (e.g., `routers/deals.py` has all 7 deal endpoints).
