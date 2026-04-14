# Feature Gating System Design

> Architect: Agent 04 | Date: 2026-03-28
> Inputs: agent-04 research, agent-11 AI cost management, agent-17 codebase integration
> Target: FastAPI backend with PostgreSQL, httpOnly cookie auth, slowapi rate limiting

---

## 1. `backend/middleware/tier_gate.py` -- FastAPI Dependency Design

The gating system is built entirely on FastAPI's `Depends()` mechanism, not ASGI middleware. This gives us access to `get_current_user` and `get_db` without reimplementing auth parsing, and makes every gate trivially testable via `app.dependency_overrides`.

The file is named `tier_gate.py` but lives at `backend/core/billing/tier_gate.py` alongside the rest of the billing package. The "middleware" framing is conceptual -- these are dependency functions, not ASGI middleware classes.

### Complete Implementation

```python
# backend/core/billing/tier_gate.py

"""
Tier-based feature gating dependencies for FastAPI.

Three gate types:
  - require_tier(Tier.PRO)           Hard gate: blocks if tier too low
  - require_feature("pipeline_enabled")  Hard gate: blocks if boolean feature off
  - require_quota("analyses_per_month")  Metered gate: blocks if quota exhausted

All gates return None on success (used as Depends(...) side-effects).
All gates raise HTTPException(402) on denial with structured error body.
All gates bypass for demo users (is_demo_user check).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from enum import IntEnum
from typing import Optional
from uuid import UUID

from fastapi import Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from core.demo import is_demo_user
from core.security.jwt import get_current_user
from database import get_db
from models.users import User


# ---------------------------------------------------------------------------
# Tier enum with integer ranking for comparison
# ---------------------------------------------------------------------------

class Tier(IntEnum):
    """Subscription tiers ordered by rank. Higher rank = more access.

    Uses IntEnum so tier comparisons work naturally:
        Tier.PRO > Tier.STARTER  # True
        Tier.FREE >= Tier.PRO    # False
    """
    FREE = 0
    STARTER = 1
    PRO = 2
    TEAM = 3

    @classmethod
    def from_str(cls, value: str) -> "Tier":
        """Parse a tier string from the DB/JWT. Defaults to FREE."""
        try:
            return cls[value.upper()]
        except (KeyError, AttributeError):
            return cls.FREE


# ---------------------------------------------------------------------------
# Tier limits configuration -- single source of truth
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class TierLimits:
    """Immutable limits for a subscription tier.

    None means unlimited for numeric fields.
    Boolean fields: True = enabled, False = blocked.
    """
    # Metered (numeric) limits
    analyses_per_month: Optional[int]
    saved_deals: Optional[int]              # Total, not per-period
    ai_messages_per_month: Optional[int]
    document_uploads_per_month: Optional[int]

    # Boolean feature flags
    ai_chat_enabled: bool
    pdf_export: bool
    pipeline_enabled: bool
    portfolio_enabled: bool
    offer_letter: bool
    share_deals: bool
    compare_deals: bool
    custom_branding: bool

    # Team-specific
    team_seats: Optional[int]


TIER_LIMITS: dict[Tier, TierLimits] = {
    Tier.FREE: TierLimits(
        analyses_per_month=3,
        saved_deals=5,
        ai_messages_per_month=0,
        document_uploads_per_month=3,
        ai_chat_enabled=False,
        pdf_export=False,
        pipeline_enabled=False,
        portfolio_enabled=False,
        offer_letter=False,
        share_deals=False,
        compare_deals=True,            # Let free users compare (they already have deals)
        custom_branding=False,
        team_seats=None,
    ),
    Tier.STARTER: TierLimits(
        analyses_per_month=15,
        saved_deals=25,
        ai_messages_per_month=30,
        document_uploads_per_month=15,
        ai_chat_enabled=True,
        pdf_export=True,
        pipeline_enabled=False,
        portfolio_enabled=False,
        offer_letter=True,
        share_deals=True,
        compare_deals=True,
        custom_branding=False,
        team_seats=None,
    ),
    Tier.PRO: TierLimits(
        analyses_per_month=None,        # Unlimited
        saved_deals=None,               # Unlimited
        ai_messages_per_month=150,
        document_uploads_per_month=None, # Unlimited
        ai_chat_enabled=True,
        pdf_export=True,
        pipeline_enabled=True,
        portfolio_enabled=True,
        offer_letter=True,
        share_deals=True,
        compare_deals=True,
        custom_branding=False,
        team_seats=None,
    ),
    Tier.TEAM: TierLimits(
        analyses_per_month=None,
        saved_deals=None,
        ai_messages_per_month=500,
        document_uploads_per_month=None,
        ai_chat_enabled=True,
        pdf_export=True,
        pipeline_enabled=True,
        portfolio_enabled=True,
        offer_letter=True,
        share_deals=True,
        compare_deals=True,
        custom_branding=True,
        team_seats=5,
    ),
}


def get_limits(tier: Tier) -> TierLimits:
    """Look up the limits for a tier. Returns FREE limits as fallback."""
    return TIER_LIMITS.get(tier, TIER_LIMITS[Tier.FREE])


# ---------------------------------------------------------------------------
# Resolve the user's current tier
# ---------------------------------------------------------------------------

def get_user_tier(
    current_user: User = Depends(get_current_user),
) -> Tier:
    """Extract the user's tier from the User model.

    The `plan` column on the User model is the source of truth. It is
    set to "free" by default (in the DB column default) and updated by
    the Stripe webhook handler on subscription changes.

    Demo users are treated as PRO tier for full feature access.
    """
    if is_demo_user(current_user):
        return Tier.PRO

    return Tier.from_str(getattr(current_user, "plan", "free"))


# ---------------------------------------------------------------------------
# QuotaStatus -- returned from check_quota for quota-aware endpoints
# ---------------------------------------------------------------------------

@dataclass
class QuotaStatus:
    """Result of a quota check. Used by endpoints that need remaining counts."""
    allowed: bool
    current: int
    limit: int               # -1 means unlimited
    remaining: int            # -1 means unlimited
    warning: bool             # True when >= 80% consumed
    resets_at: Optional[str]  # ISO datetime, None for non-periodic limits


# ---------------------------------------------------------------------------
# Usage counting (PostgreSQL-backed)
# ---------------------------------------------------------------------------

def _get_period_usage_count(
    user_id: UUID,
    resource: str,
    period_start: datetime,
    db: Session,
) -> int:
    """Count usage_events rows for a resource since period_start.

    Uses the composite index: (user_id, resource, created_at DESC).
    """
    from models.usage_events import UsageEvent

    return (
        db.query(UsageEvent)
        .filter(
            UsageEvent.user_id == user_id,
            UsageEvent.resource == resource,
            UsageEvent.created_at >= period_start,
        )
        .count()
    )


def _get_saved_deals_count(user_id: UUID, db: Session) -> int:
    """Count non-deleted deals for a user (total, not per-period)."""
    from models.deals import Deal

    return (
        db.query(Deal)
        .filter(Deal.user_id == user_id, Deal.deleted_at.is_(None))
        .count()
    )


def record_usage(user_id: UUID, resource: str, db: Session) -> None:
    """Insert a usage event after a gated action succeeds.

    Call this AFTER the business logic succeeds so that failed actions
    don't consume quota. If the action and the usage event are in the
    same transaction, a rollback on failure retracts both.
    """
    from models.usage_events import UsageEvent

    db.add(UsageEvent(user_id=user_id, resource=resource))
    # Do NOT commit here -- let the caller's transaction handle it.
    # The endpoint commits after both the action and the usage event.


# ---------------------------------------------------------------------------
# Billing period helpers
# ---------------------------------------------------------------------------

def _get_billing_period_start(user: User) -> datetime:
    """Return the start of the user's current billing period.

    If the user has a current_period_start from Stripe, use that.
    Otherwise, fall back to the 1st of the current month (UTC).
    This fallback covers free-tier users who have no Stripe subscription.
    """
    period_start = getattr(user, "current_period_start", None)
    if period_start:
        return period_start
    now = datetime.utcnow()
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _get_billing_period_end(user: User) -> Optional[datetime]:
    """Return the end of the user's current billing period, or None."""
    return getattr(user, "current_period_end", None)


# ---------------------------------------------------------------------------
# 402 error builder
# ---------------------------------------------------------------------------

def _raise_402(
    *,
    error: str,
    code: str,
    current_tier: str,
    feature: Optional[str] = None,
    resource: Optional[str] = None,
    current_usage: Optional[int] = None,
    limit: Optional[int] = None,
    resets_at: Optional[str] = None,
) -> None:
    """Raise a structured 402 Payment Required error.

    The response body follows the FeatureGatedError schema so the
    frontend can parse it consistently and display the upgrade modal.
    """
    detail = {
        "error": error,
        "code": code,
        "current_tier": current_tier,
        "upgrade_url": "/settings/billing",
    }
    if feature is not None:
        detail["feature"] = feature
    if resource is not None:
        detail["resource"] = resource
    if current_usage is not None:
        detail["current_usage"] = current_usage
    if limit is not None:
        detail["limit"] = limit
    if resets_at is not None:
        detail["resets_at"] = resets_at

    raise HTTPException(
        status_code=status.HTTP_402_PAYMENT_REQUIRED,
        detail=detail,
    )


# ---------------------------------------------------------------------------
# Gate 1: require_tier -- hard gate on minimum tier rank
# ---------------------------------------------------------------------------

def require_tier(minimum: Tier):
    """Dependency that blocks access if the user's tier is below `minimum`.

    Usage:
        @router.post("/")
        async def create_thing(
            ...,
            _gate: None = Depends(require_tier(Tier.PRO)),
        ):

    Demo users always pass.
    """
    def _check(
        current_user: User = Depends(get_current_user),
        tier: Tier = Depends(get_user_tier),
    ) -> None:
        if tier >= minimum:
            return
        _raise_402(
            error=f"This feature requires the {minimum.name.title()} plan or higher",
            code="TIER_REQUIRED",
            current_tier=tier.name.lower(),
            feature=f"tier_{minimum.name.lower()}",
        )
    return _check


# ---------------------------------------------------------------------------
# Gate 2: require_feature -- hard gate on a boolean feature flag
# ---------------------------------------------------------------------------

def require_feature(feature_name: str):
    """Dependency that blocks access if a boolean feature is disabled for the tier.

    Usage:
        @router.post("/chat/")
        async def chat(
            ...,
            _gate: None = Depends(require_feature("ai_chat_enabled")),
        ):

    The feature_name must match a boolean attribute on TierLimits.
    Demo users always pass.
    """
    def _check(
        tier: Tier = Depends(get_user_tier),
    ) -> None:
        limits = get_limits(tier)
        if getattr(limits, feature_name, False):
            return
        _raise_402(
            error=f"Your {tier.name.lower()} plan does not include "
                  f"{feature_name.replace('_', ' ')}",
            code="FEATURE_GATED",
            current_tier=tier.name.lower(),
            feature=feature_name,
        )
    return _check


# ---------------------------------------------------------------------------
# Gate 3: require_quota -- metered gate on numeric limits
# ---------------------------------------------------------------------------

def require_quota(resource: str):
    """Dependency that blocks access if a metered resource quota is exhausted.

    Usage:
        @router.post("/")
        async def create_deal(
            ...,
            _quota: None = Depends(require_quota("analyses_per_month")),
        ):

    The resource name must match a numeric attribute on TierLimits.

    For "saved_deals": counts total non-deleted deals (not per-period).
    For all other resources: counts usage_events since billing period start.

    Demo users always pass.
    """
    def _check(
        current_user: User = Depends(get_current_user),
        tier: Tier = Depends(get_user_tier),
        db: Session = Depends(get_db),
    ) -> None:
        limits = get_limits(tier)
        max_allowed = getattr(limits, resource, None)

        # None = unlimited
        if max_allowed is None:
            return

        # Get current usage
        if resource == "saved_deals":
            current_usage = _get_saved_deals_count(current_user.id, db)
        else:
            period_start = _get_billing_period_start(current_user)
            current_usage = _get_period_usage_count(
                current_user.id, resource, period_start, db,
            )

        if current_usage >= max_allowed:
            period_end = _get_billing_period_end(current_user)
            resets_at = period_end.isoformat() if period_end else None

            _raise_402(
                error=f"You've reached your {tier.name.lower()} plan limit "
                      f"for {resource.replace('_', ' ')}",
                code="QUOTA_EXCEEDED",
                current_tier=tier.name.lower(),
                resource=resource,
                current_usage=current_usage,
                limit=max_allowed,
                resets_at=resets_at,
            )
    return _check


# ---------------------------------------------------------------------------
# Gate 4: check_quota -- non-blocking quota check returning QuotaStatus
# ---------------------------------------------------------------------------

def check_quota(resource: str):
    """Dependency returning QuotaStatus. Does NOT raise -- caller decides.

    Use this when you need to include remaining-count info in response
    headers or conditionally show warnings.

    Usage:
        @router.post("/")
        async def create_deal(
            ...,
            quota: QuotaStatus = Depends(check_quota("analyses_per_month")),
        ):
            if not quota.allowed:
                raise HTTPException(402, ...)
            # ... do work ...
            response.headers["X-Quota-Remaining"] = str(quota.remaining - 1)
    """
    def _check(
        current_user: User = Depends(get_current_user),
        tier: Tier = Depends(get_user_tier),
        db: Session = Depends(get_db),
    ) -> QuotaStatus:
        limits = get_limits(tier)
        max_allowed = getattr(limits, resource, None)

        if max_allowed is None:
            return QuotaStatus(
                allowed=True, current=0, limit=-1,
                remaining=-1, warning=False, resets_at=None,
            )

        if resource == "saved_deals":
            current_usage = _get_saved_deals_count(current_user.id, db)
            resets_at = None
        else:
            period_start = _get_billing_period_start(current_user)
            current_usage = _get_period_usage_count(
                current_user.id, resource, period_start, db,
            )
            period_end = _get_billing_period_end(current_user)
            resets_at = period_end.isoformat() if period_end else None

        remaining = max(0, max_allowed - current_usage)
        return QuotaStatus(
            allowed=current_usage < max_allowed,
            current=current_usage,
            limit=max_allowed,
            remaining=remaining,
            warning=current_usage >= int(max_allowed * 0.8),
            resets_at=resets_at,
        )
    return _check


# ---------------------------------------------------------------------------
# Gate 5: require_feature_or_readonly -- allow GET, block mutations
# ---------------------------------------------------------------------------

def require_feature_or_readonly(feature_name: str):
    """Allow read requests through; block POST/PUT/PATCH/DELETE if feature is off.

    Used for pipeline and portfolio routers where downgraded users
    retain read access to their existing data but cannot modify.

    Usage (router-level):
        router = APIRouter(
            prefix="/pipeline",
            dependencies=[Depends(require_feature_or_readonly("pipeline_enabled"))],
        )
    """
    def _check(
        request: Request,
        tier: Tier = Depends(get_user_tier),
    ) -> None:
        limits = get_limits(tier)
        if getattr(limits, feature_name, False):
            return  # Feature enabled, all methods allowed

        if request.method in ("POST", "PUT", "PATCH", "DELETE"):
            _raise_402(
                error="Upgrade required to modify this resource",
                code="FEATURE_GATED",
                current_tier=tier.name.lower(),
                feature=feature_name,
            )
        # GET/HEAD/OPTIONS pass through
    return _check


# ---------------------------------------------------------------------------
# Utility: inject quota headers into successful responses
# ---------------------------------------------------------------------------

def set_quota_headers(response: Response, quota: QuotaStatus) -> None:
    """Add X-Quota-* headers to a response for frontend consumption.

    Call this at the end of any metered endpoint after the action succeeds.
    The frontend reads these headers to update usage displays without
    needing a separate API call.
    """
    if quota.limit == -1:
        return  # Unlimited, no headers needed
    response.headers["X-Quota-Remaining"] = str(max(0, quota.remaining - 1))
    response.headers["X-Quota-Limit"] = str(quota.limit)
    if quota.resets_at:
        response.headers["X-Quota-Resets"] = quota.resets_at
    if quota.warning:
        response.headers["X-Quota-Warning"] = "true"
```

---

## 2. Feature Permission Matrix

### Complete Feature-to-Gate Matrix

| Feature | Endpoint(s) | Gate Type | Free | Starter | Pro | Team |
|---|---|---|---|---|---|---|
| **Run analysis** | `POST /deals/` | Metered | 3/mo | 15/mo | Unlimited | Unlimited |
| **Save deal** | `POST /deals/` | Metered | 5 total | 25 total | Unlimited | Unlimited |
| **List deals** | `GET /deals/` | Open | Yes | Yes | Yes | Yes |
| **View deal** | `GET /deals/{id}` | Open | Yes | Yes | Yes | Yes |
| **Update deal** | `PUT /deals/{id}` | Open | Yes | Yes | Yes | Yes |
| **Delete deal** | `DELETE /deals/{id}` | Open | Yes | Yes | Yes | Yes |
| **Share deal** | `PUT /deals/{id}/share/` | Hard (feature) | Blocked | Yes | Yes | Yes |
| **View shared deal** | `GET /deals/{id}/share/` | Open (public) | Yes | Yes | Yes | Yes |
| **Offer letter** | `POST /deals/{id}/offer-letter/` | Hard (feature) | Blocked | Yes | Yes | Yes |
| **AI chat** | `POST /chat/` | Hard + Metered | Blocked | 30/mo | 150/mo | 500/mo |
| **Chat history** | `GET /chat/history/` | Hard (feature) | Blocked | Yes | Yes | Yes |
| **PDF export** | Frontend only | Hard (feature) | Blocked | Yes | Yes | Yes |
| **Pipeline read** | `GET /pipeline/` | Open | Yes | Yes | Yes | Yes |
| **Pipeline mutate** | `POST/PUT/DELETE /pipeline/*` | Hard (feature) | Blocked | Blocked | Yes | Yes |
| **Portfolio read** | `GET /portfolio/` | Open | Yes | Yes | Yes | Yes |
| **Portfolio mutate** | `POST/PUT /portfolio/*` | Hard (feature) | Blocked | Blocked | Yes | Yes |
| **Document upload** | `POST /documents/` | Metered | 3/mo | 15/mo | Unlimited | Unlimited |
| **Document list/view** | `GET /documents/*` | Open | Yes | Yes | Yes | Yes |
| **Document delete** | `DELETE /documents/{id}` | Open | Yes | Yes | Yes | Yes |
| **Compare deals** | Frontend only | Open | Yes | Yes | Yes | Yes |
| **Custom branding** | Settings (future) | Hard (feature) | Blocked | Blocked | Blocked | Yes |
| **Team seats** | Invite system (future) | Hard (tier) | No | No | No | 5 |
| **Dashboard stats** | `GET /dashboard/stats/` | Open | Yes | Yes | Yes | Yes |
| **Activity feed** | `GET /dashboard/activity/` | Open | Yes | Yes | Yes | Yes |
| **Settings** | `GET/PATCH /settings/*` | Open | Yes | Yes | Yes | Yes |

### Tier Limits at a Glance

| Resource | Free | Starter ($19/mo) | Pro ($49/mo) | Team ($99/mo) |
|---|---|---|---|---|
| Analyses per month | 3 | 15 | Unlimited | Unlimited |
| Saved deals (total) | 5 | 25 | Unlimited | Unlimited |
| AI messages per month | 0 (blocked) | 30 | 150 | 500 |
| Document uploads per month | 3 | 15 | Unlimited | Unlimited |
| AI model | -- | Haiku 3.5 | Sonnet 4.5 | Sonnet 4.5 |
| Pipeline | View only | View only | Full | Full |
| Portfolio | View only | View only | Full | Full |
| PDF export | No | Yes | Yes | Yes |
| Deal sharing | No | Yes | Yes | Yes |
| Offer letters | No | Yes | Yes | Yes |
| Custom branding | No | No | No | Yes |
| Team seats | -- | -- | -- | 5 |

---

## 3. Dependency Pattern: `Depends(require_tier(Tier.STARTER))`

### Three usage patterns, chosen by context

**Pattern A: Router-level dependency (for entire feature areas)**

Apply when every endpoint in a router shares the same gate. Used for pipeline and portfolio write operations.

```python
# backend/main.py (modified router mounting)

from fastapi import Depends
from core.billing.tier_gate import require_feature_or_readonly

# Pipeline: anyone can GET, only Pro+ can POST/PUT/DELETE
app.include_router(
    pipeline.router,
    prefix="/api/v1",
    dependencies=[Depends(require_feature_or_readonly("pipeline_enabled"))],
)

# Portfolio: same pattern
app.include_router(
    portfolio.router,
    prefix="/api/v1",
    dependencies=[Depends(require_feature_or_readonly("portfolio_enabled"))],
)
```

**Pattern B: Per-endpoint dependency (for metered features)**

Apply when different endpoints within the same router have different gates, or when the endpoint needs the quota status for response headers.

```python
# backend/routers/deals.py (create_deal with both quota gates)

from core.billing.tier_gate import (
    require_quota, check_quota, record_usage, set_quota_headers, QuotaStatus,
)

@router.post("/", response_model=DealResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("30/minute")
async def create_deal(
    request: Request,
    response: Response,
    body: DealCreateRequest,
    current_user: User = Depends(get_current_user),
    _analysis_gate: None = Depends(require_quota("analyses_per_month")),
    _deals_gate: None = Depends(require_quota("saved_deals")),
    analysis_quota: QuotaStatus = Depends(check_quota("analyses_per_month")),
    db: Session = Depends(get_db),
) -> DealResponse:
    # ... existing deal creation logic ...

    # After successful creation, record usage and set headers
    record_usage(current_user.id, "analyses_per_month", db)
    set_quota_headers(response, analysis_quota)
    db.commit()
    db.refresh(deal)
    return DealResponse.model_validate(deal)
```

**Pattern C: Stacked hard + metered gate (for AI chat)**

The chat endpoint needs two independent checks: (1) is AI chat enabled for the tier, and (2) has the monthly message quota been reached.

```python
# backend/routers/chat.py (chat endpoint with dual gate)

from core.billing.tier_gate import require_feature, require_quota, record_usage

@router.post("/", status_code=200)
@limiter.limit("10/minute")
async def chat(
    request: Request,
    body: ChatRequest,
    current_user: User = Depends(get_current_user),
    _feature_gate: None = Depends(require_feature("ai_chat_enabled")),
    _quota_gate: None = Depends(require_quota("ai_messages_per_month")),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    # ... existing chat logic ...
    # record_usage called AFTER stream completes (in event_generator finally block)
```

### Dependency Resolution Order

FastAPI resolves dependencies in declaration order. For gated endpoints, the resolution chain is:

```
get_current_user (from cookie)
    -> get_user_tier (reads user.plan, returns Tier enum)
        -> require_feature / require_quota (reads TIER_LIMITS)
            -> get_db (for quota count queries)
```

This means:
1. Auth failures (401) fire before tier checks
2. Feature gates (402 FEATURE_GATED) fire before quota checks (402 QUOTA_EXCEEDED)
3. Rate limits (429) are checked by the `@limiter.limit` decorator independently

---

## 4. Usage Counter Service

### Database Model

```python
# backend/models/usage_events.py

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, String, Index
from sqlalchemy.dialects.postgresql import UUID

from database import Base


class UsageEvent(Base):
    """Append-only log of billable actions.

    Each row represents one consumed unit of a metered resource.
    Counting rows per (user_id, resource, period) gives usage.

    Resources:
      - "analyses_per_month"        (one per deal creation)
      - "ai_messages_per_month"     (one per chat message sent)
      - "document_uploads_per_month" (one per document upload)

    The "saved_deals" limit is computed from the deals table directly
    (count of non-deleted deals) and does NOT use this table.
    """
    __tablename__ = "usage_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    resource = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        Index(
            "idx_usage_events_user_resource_created",
            "user_id", "resource", "created_at",
        ),
    )
```

### Usage Recording Pattern

Usage is recorded **after** the business logic succeeds, within the same transaction. This ensures:
- If the deal creation fails (DB error, calculator exception), no usage is consumed
- If the usage insert fails, the entire transaction rolls back

```python
# In deals.py create_deal, after deal is added to session:
db.add(deal)
record_usage(current_user.id, "analyses_per_month", db)
db.commit()  # Both deal and usage event in same transaction
db.refresh(deal)

# In chat.py event_generator finally block:
if full_reply and not _demo:
    assistant_msg = ChatMessage(...)
    db.add(assistant_msg)
    record_usage(current_user.id, "ai_messages_per_month", db)
    db.commit()

# In documents.py upload_document, after doc is added:
db.add(doc)
record_usage(current_user.id, "document_uploads_per_month", db)
db.commit()
db.refresh(doc)
```

### Usage Query Endpoint

```python
# backend/routers/billing.py (new file, partial)

from core.billing.tier_gate import (
    Tier, get_user_tier, get_limits, check_quota, QuotaStatus,
)

@router.get("/billing/usage/", response_model=UsageSummaryResponse)
async def get_usage_summary(
    current_user: User = Depends(get_current_user),
    tier: Tier = Depends(get_user_tier),
    analyses: QuotaStatus = Depends(check_quota("analyses_per_month")),
    ai_messages: QuotaStatus = Depends(check_quota("ai_messages_per_month")),
    saved_deals: QuotaStatus = Depends(check_quota("saved_deals")),
    doc_uploads: QuotaStatus = Depends(check_quota("document_uploads_per_month")),
) -> UsageSummaryResponse:
    """Return current usage across all metered resources."""
    return UsageSummaryResponse(
        tier=tier.name.lower(),
        analyses=QuotaInfo.from_status(analyses),
        ai_messages=QuotaInfo.from_status(ai_messages),
        saved_deals=QuotaInfo.from_status(saved_deals),
        document_uploads=QuotaInfo.from_status(doc_uploads),
    )
```

---

## 5. Cache Strategy for Subscription Status

### Approach: Embed Tier in the User Model Column

Rather than a separate cache layer, the user's tier lives as a `plan` column directly on the `users` table. This column is:
- Set to `"free"` on registration (column default)
- Updated by the Stripe webhook handler when subscriptions change
- Read by `get_user_tier()` from the User object that `get_current_user` already loaded

**Why this beats a separate Subscription table lookup:**

Parcel's `get_current_user` already queries the `users` table on every authenticated request (it resolves the user from the JWT `sub` claim). Adding a `plan` column to that table means the tier is available with zero additional queries. No cache layer, no TTL, no invalidation bugs.

```python
# backend/models/users.py -- additions

class User(TimestampMixin, Base):
    __tablename__ = "users"

    # ... existing columns ...

    # Billing columns
    plan = Column(String, nullable=False, default="free")       # free/starter/pro/team/demo
    stripe_customer_id = Column(String, nullable=True, unique=True)
    current_period_start = Column(DateTime, nullable=True)
    current_period_end = Column(DateTime, nullable=True)
```

### Future Optimization: JWT Tier Claim

For Phase 2, embed the tier in the JWT payload to avoid even the user table lookup:

```python
# In create_access_token:
def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    # data already contains {"sub": user_id}
    # In Phase 2, add: to_encode["tier"] = user.plan
    ...
```

This reduces subscription resolution to zero DB queries. The 15-minute JWT expiry means tier changes propagate within one refresh cycle. The Stripe webhook can force early invalidation by bumping a `token_version` column.

### Cache Invalidation (Stripe Webhook)

```python
# In the Stripe webhook handler:
def handle_subscription_updated(event: dict, db: Session) -> None:
    stripe_customer_id = event["data"]["object"]["customer"]
    user = db.query(User).filter(
        User.stripe_customer_id == stripe_customer_id
    ).first()
    if not user:
        return

    sub = event["data"]["object"]
    user.plan = _stripe_plan_to_tier(sub["items"]["data"][0]["price"]["id"])
    user.current_period_start = datetime.fromtimestamp(sub["current_period_start"])
    user.current_period_end = datetime.fromtimestamp(sub["current_period_end"])
    db.commit()
```

No cache invalidation needed because the source of truth is the DB column, and `get_current_user` reads it fresh on every request.

---

## 6. Response Format for Gated Requests

### HTTP Status Code: 402 Payment Required

All billing-related denials use **402**, not 403. This distinction is critical for the frontend:
- **401** = Not authenticated (redirect to login)
- **402** = Authenticated but not on a sufficient plan (show upgrade modal)
- **403** = Authenticated and on the right plan, but not the resource owner (show "access denied")
- **429** = Rate limited by slowapi (show "slow down" toast)

### Response Schema

```python
# backend/schemas/billing.py

from pydantic import BaseModel
from typing import Optional


class FeatureGatedError(BaseModel):
    """Standard 402 response body for tier restrictions."""
    error: str                              # Human-readable message
    code: str                               # "FEATURE_GATED" | "QUOTA_EXCEEDED" | "TIER_REQUIRED"
    current_tier: str                       # "free" | "starter" | "pro" | "team"
    upgrade_url: str                        # Always "/settings/billing"
    feature: Optional[str] = None           # e.g., "ai_chat_enabled" (for FEATURE_GATED)
    resource: Optional[str] = None          # e.g., "analyses_per_month" (for QUOTA_EXCEEDED)
    current_usage: Optional[int] = None     # Current count (for QUOTA_EXCEEDED)
    limit: Optional[int] = None             # Tier limit (for QUOTA_EXCEEDED)
    resets_at: Optional[str] = None         # ISO datetime when period resets
```

### Example Responses

**Feature gated (hard gate):**
```json
{
    "error": "Your free plan does not include ai chat enabled",
    "code": "FEATURE_GATED",
    "current_tier": "free",
    "upgrade_url": "/settings/billing",
    "feature": "ai_chat_enabled"
}
```

**Quota exceeded (metered gate):**
```json
{
    "error": "You've reached your starter plan limit for analyses per month",
    "code": "QUOTA_EXCEEDED",
    "current_tier": "starter",
    "upgrade_url": "/settings/billing",
    "resource": "analyses_per_month",
    "current_usage": 15,
    "limit": 15,
    "resets_at": "2026-05-01T00:00:00"
}
```

**Tier required (hard gate on tier rank):**
```json
{
    "error": "This feature requires the Pro plan or higher",
    "code": "TIER_REQUIRED",
    "current_tier": "starter",
    "upgrade_url": "/settings/billing",
    "feature": "tier_pro"
}
```

### Success Response Headers (for metered endpoints)

Successful responses on metered endpoints include quota headers so the frontend can update usage displays without a separate API call:

```
HTTP/1.1 201 Created
X-Quota-Remaining: 12
X-Quota-Limit: 15
X-Quota-Resets: 2026-05-01T00:00:00
X-Quota-Warning: false
```

The `X-Quota-Warning` header is `true` when usage is at or above 80%, triggering a yellow banner in the frontend.

### Frontend 402 Interceptor

```typescript
// frontend/src/lib/api.ts -- addition to the existing request() function

if (res.status === 402) {
    const body: FeatureGatedError = await res.json();
    // Dispatch to the global upgrade modal via Zustand store
    useUpgradeStore.getState().show({
        code: body.code,
        feature: body.feature ?? body.resource ?? "unknown",
        currentTier: body.current_tier,
        currentUsage: body.current_usage,
        limit: body.limit,
        resetsAt: body.resets_at,
    });
    throw new UpgradeRequiredError(body);
}
```

---

## 7. Integration with Existing slowapi Rate Limiting

### Separation of Concerns

slowapi rate limiting and feature gating are **completely independent systems** that solve different problems:

| Concern | slowapi (rate limiting) | Feature gating (billing) |
|---|---|---|
| Purpose | Prevent abuse/DDoS | Enforce pricing tiers |
| Time scale | Rolling windows (1min, 5min) | Billing cycles (monthly) |
| Key | IP address (currently) | User ID + tier |
| Status code | 429 Too Many Requests | 402 Payment Required |
| Reset mechanism | Automatic (time-based) | Billing period end / upgrade |
| When it fires | Too many requests per minute | Too many actions per month |

### Current Rate Limits (unchanged)

These are abuse-prevention limits. They remain identical regardless of tier.

| Endpoint | Rate Limit | Gating Layer |
|---|---|---|
| `POST /auth/register` | 3/min | None (public) |
| `POST /auth/login` | 5/min | None (public) |
| `POST /auth/refresh` | 20/min | None (cookie) |
| `POST /auth/forgot-password` | 3/min | None (public) |
| `POST /auth/reset-password` | 3/min | None (public) |
| `POST /deals/` | 30/min | `require_quota("analyses_per_month")` + `require_quota("saved_deals")` |
| `GET /deals/` | 60/min | None |
| `GET /deals/{id}` | 60/min | None |
| `POST /deals/{id}/offer-letter/` | 5/min | `require_feature("offer_letter")` |
| `POST /chat/` | 10/min | `require_feature("ai_chat_enabled")` + `require_quota("ai_messages_per_month")` |
| `GET /chat/history/` | 30/min | `require_feature("ai_chat_enabled")` |
| `GET /pipeline/` | 60/min | None (read always open) |
| `GET /portfolio/` | 60/min | None (read always open) |
| `GET /dashboard/stats/` | 60/min | None |
| `GET /dashboard/activity/` | 60/min | None |
| `GET /deals/{id}/share/` | 60/min | None (public) |

### Execution Order

```
Request arrives
  -> slowapi checks IP-based rate limit
     -> If exceeded: 429 (never reaches gating)
  -> FastAPI resolves route
  -> Depends(get_current_user) runs
     -> If no cookie or invalid: 401
  -> Depends(get_user_tier) runs
  -> Depends(require_feature/require_quota) runs
     -> If gated: 402
  -> Endpoint function executes
```

A request can be rate-limited (429) even if the user has plenty of quota remaining, and vice versa. They are separate filter stages.

### Phase 2: Tier-Aware Rate Limits (optional future work)

If needed later, higher tiers can get more generous per-minute rate limits:

```python
# limiter.py -- future enhancement

TIER_RATE_LIMITS = {
    "free": "30/minute",
    "starter": "60/minute",
    "pro": "120/minute",
    "team": "120/minute",
}
```

This is NOT part of the initial implementation. The current fixed limits are sufficient for all tiers at launch.

---

## 8. Grace Period Logic

### Three States: Normal, Warning, Blocked

The system uses a three-zone model for every metered resource:

```
0%──────────80%─────────100%─────────
│   NORMAL    │  WARNING  │  BLOCKED │
│  (green)    │ (yellow)  │  (red)   │
```

**Normal (0-79% consumed):** No special behavior. Response headers include `X-Quota-Remaining` and `X-Quota-Warning: false`.

**Warning (80-99% consumed):** The endpoint still succeeds, but:
- `X-Quota-Warning: true` header is set
- Frontend shows a yellow banner: "2 analyses remaining this month"
- For chat SSE, an extra event is prepended:
  ```
  data: {"warning": "5 AI messages remaining this month. Upgrade for more."}
  ```

**Blocked (100%+ consumed):** Endpoint returns 402 with `QUOTA_EXCEEDED` body.

### Implementation in check_quota

The `QuotaStatus.warning` field is already computed in `check_quota()`:

```python
warning=current_usage >= int(max_allowed * 0.8),
```

Endpoints that use `check_quota` can read this to inject warnings:

```python
# Example: chat endpoint with warning injection
quota: QuotaStatus = Depends(check_quota("ai_messages_per_month"))

# In event_generator, before AI call:
if quota.warning and quota.allowed:
    remaining = quota.remaining
    yield f'data: {json.dumps({"warning": f"{remaining} AI messages remaining this month."})}\n\n'
```

### Subscription Lapse / Downgrade

When a user's subscription expires or they downgrade:

1. **Existing data is never deleted.** A Pro user with 50 deals who downgrades to Free keeps all 50 deals. They cannot create new ones until they delete enough to get below 5.

2. **Pipeline and portfolio become read-only.** The `require_feature_or_readonly` gate (mounted at the router level) allows GET requests through but blocks mutations with 402. The frontend disables drag-and-drop and shows "Upgrade to modify your pipeline."

3. **AI chat is blocked.** The `require_feature("ai_chat_enabled")` gate returns 402 for Free users. Chat history remains viewable.

4. **The downgrade takes effect immediately** when the Stripe webhook updates `user.plan`. There is no grace period for access -- the plan column is the single source of truth.

### Race Conditions at the Boundary

Two concurrent `POST /deals/` requests could both check count (14/15), both pass, and both insert -- resulting in 16/15 usage.

**Decision: Accept the off-by-one.** A user getting 16 out of 15 analyses is not a revenue problem. The complexity of advisory locks or `SELECT FOR UPDATE` is not justified at Parcel's current scale.

If abuse emerges, add a PostgreSQL advisory lock:

```python
from sqlalchemy import text

def acquire_usage_lock(user_id: UUID, resource: str, db: Session) -> None:
    lock_key = hash(f"{user_id}:{resource}") & 0x7FFFFFFF
    db.execute(text(f"SELECT pg_advisory_xact_lock({lock_key})"))
```

This is a Phase 2 addition, not a launch requirement.

---

## 9. Complete Endpoint-to-Gate Mapping

Every existing endpoint in the Parcel backend, its authentication requirement, rate limit, and tier gate.

### Auth Router (`/api/v1/auth`)

| Method | Path | Auth | Rate Limit | Tier Gate | Usage Metric |
|---|---|---|---|---|---|
| POST | `/auth/register` | No | 3/min | None | None |
| POST | `/auth/login` | No | 5/min | None | None |
| POST | `/auth/logout` | No | None | None | None |
| POST | `/auth/refresh` | Cookie | 20/min | None | None |
| GET | `/auth/me` | Yes | None | None | None |
| GET | `/auth/me/` | Yes | None | None | None |
| PUT | `/auth/me/` | Yes | None | None | None |
| POST | `/auth/forgot-password` | No | 3/min | None | None |
| POST | `/auth/reset-password` | No | 3/min | None | None |

### Dashboard Router (`/api/v1/dashboard`)

| Method | Path | Auth | Rate Limit | Tier Gate | Usage Metric |
|---|---|---|---|---|---|
| GET | `/dashboard/stats/` | Yes | 60/min | None (all tiers) | None |
| GET | `/dashboard/activity/` | Yes | 60/min | None (all tiers) | None |

### Deals Router (`/api/v1/deals`)

| Method | Path | Auth | Rate Limit | Tier Gate | Usage Metric |
|---|---|---|---|---|---|
| POST | `/deals/` | Yes | 30/min | `require_quota("analyses_per_month")` + `require_quota("saved_deals")` | `analyses_per_month` |
| GET | `/deals/` | Yes | 60/min | None | None |
| GET | `/deals/{id}` | Yes | 60/min | None | None |
| PUT | `/deals/{id}` | Yes | None | None | None |
| DELETE | `/deals/{id}` | Yes | None | None | None |
| PUT | `/deals/{id}/share/` | Yes | None | `require_feature("share_deals")` | None |
| GET | `/deals/{id}/share/` | No | 60/min | None (public) | None |
| POST | `/deals/{id}/offer-letter/` | Yes | 5/min | `require_feature("offer_letter")` | `ai_messages_per_month` (AI call) |

### Chat Router (`/api/v1/chat`)

| Method | Path | Auth | Rate Limit | Tier Gate | Usage Metric |
|---|---|---|---|---|---|
| POST | `/chat/` | Yes | 10/min | `require_feature("ai_chat_enabled")` + `require_quota("ai_messages_per_month")` | `ai_messages_per_month` |
| GET | `/chat/history/` | Yes | 30/min | `require_feature("ai_chat_enabled")` | None |

### Pipeline Router (`/api/v1/pipeline`)

Router-level gate: `Depends(require_feature_or_readonly("pipeline_enabled"))`

| Method | Path | Auth | Rate Limit | Tier Gate | Usage Metric |
|---|---|---|---|---|---|
| GET | `/pipeline/` | Yes | 60/min | Passes through (read) | None |
| POST | `/pipeline/` | Yes | None | Blocked if `pipeline_enabled=False` | None |
| PUT | `/pipeline/{id}/stage/` | Yes | None | Blocked if `pipeline_enabled=False` | None |
| DELETE | `/pipeline/{id}/` | Yes | None | Blocked if `pipeline_enabled=False` | None |

### Portfolio Router (`/api/v1/portfolio`)

Router-level gate: `Depends(require_feature_or_readonly("portfolio_enabled"))`

| Method | Path | Auth | Rate Limit | Tier Gate | Usage Metric |
|---|---|---|---|---|---|
| GET | `/portfolio/` | Yes | 60/min | Passes through (read) | None |
| POST | `/portfolio/` | Yes | None | Blocked if `portfolio_enabled=False` | None |
| PUT | `/portfolio/{id}/` | Yes | None | Blocked if `portfolio_enabled=False` | None |

### Documents Router (`/api/v1/documents`)

| Method | Path | Auth | Rate Limit | Tier Gate | Usage Metric |
|---|---|---|---|---|---|
| POST | `/documents/` | Yes | None | `require_quota("document_uploads_per_month")` | `document_uploads_per_month` |
| GET | `/documents/` | Yes | None | None | None |
| GET | `/documents/{id}` | Yes | None | None | None |
| DELETE | `/documents/{id}` | Yes | None | None | None |

### Settings Router (`/api/v1/settings`)

| Method | Path | Auth | Rate Limit | Tier Gate | Usage Metric |
|---|---|---|---|---|---|
| GET | `/settings/notifications/` | Yes | None | None | None |
| PATCH | `/settings/notifications/` | Yes | None | None | None |

### Billing Router (`/api/v1/billing` -- NEW)

| Method | Path | Auth | Rate Limit | Tier Gate | Usage Metric |
|---|---|---|---|---|---|
| GET | `/billing/status/` | Yes | None | None | None |
| GET | `/billing/usage/` | Yes | None | None | None |
| POST | `/billing/checkout/` | Yes | 5/min | None | None |
| POST | `/billing/portal/` | Yes | 5/min | None | None |
| POST | `/billing/webhook/` | No | None | None (Stripe signature verified) | None |

### Root Endpoints

| Method | Path | Auth | Rate Limit | Tier Gate | Usage Metric |
|---|---|---|---|---|---|
| GET | `/health` | No | None | None | None |
| GET | `/` | No | None | None | None |

---

## 10. CRITICAL DECISIONS

### Decision 1: 402 vs 403 for Billing Errors

**Decision: Use 402 Payment Required.**

The frontend already handles 401 (clear auth, redirect to login) and 403 (show "access denied"). A new 402 handler dispatches to the upgrade modal. Using 403 for billing errors would conflate "you don't own this resource" with "you need to pay for this feature" -- creating ambiguous UX that is hard to debug and impossible to separate in error tracking.

### Decision 2: User.plan Column vs Separate Subscriptions Table for Gate Checks

**Decision: Plan column on the users table is the runtime source of truth. A separate subscriptions table exists for audit history only.**

The `get_current_user` dependency already loads the User row on every request. Adding `plan` to that row gives the gate system zero-cost access to the tier. A separate `subscriptions` table is still created for billing history, Stripe metadata, and audit logging -- but the gating system never queries it at request time.

### Decision 3: PostgreSQL Usage Counters vs Redis

**Decision: PostgreSQL only at launch.**

The `usage_events` table with a composite index `(user_id, resource, created_at)` handles the COUNT query in under 1ms for Parcel's expected scale (hundreds of events per user per month). PostgreSQL provides transactional consistency: if the deal creation fails, the usage event rolls back with it. Redis would add infrastructure complexity ($5/mo Railway addon), dual-write risk, and cache-miss edge cases -- all unnecessary below 10K users.

### Decision 4: Per-Request Usage Count vs Cached Counter

**Decision: COUNT query on every gated request at launch.**

The alternative -- maintaining a cached counter in Redis or a `current_count` column that increments -- introduces consistency bugs (what if the counter drifts from reality?). The COUNT query against the indexed `usage_events` table is the simplest correct implementation. Optimize only if profiling shows the query exceeding 10ms.

### Decision 5: Strict Boundary Enforcement vs Off-by-One Tolerance

**Decision: Tolerate off-by-one at the boundary. No advisory locks at launch.**

Two concurrent requests can both pass a 14/15 check and produce 16/15 usage. This is acceptable because: (1) it is rare at Parcel's request volume, (2) the revenue impact of one extra analysis is zero, and (3) advisory locks add complexity to every metered request path. Add locking in Phase 2 only if abuse patterns emerge.

### Decision 6: Pipeline/Portfolio Gate Strategy

**Decision: `require_feature_or_readonly` at the router level -- GET passes, mutations blocked.**

Alternatives considered:
- **(a) Block entirely (hard gate):** Free/Starter users see nothing. Rejected because seeing an empty pipeline is worse UX than seeing a read-only pipeline with an upgrade CTA.
- **(b) Per-endpoint gates:** More flexible but requires adding Depends() to every POST/PUT/DELETE. Error-prone when new endpoints are added. Rejected.
- **(c) Router-level read-only gate (chosen):** Applied once in `main.py`. New endpoints added to the pipeline/portfolio routers automatically inherit the gate. The frontend shows the data with disabled controls and an upgrade prompt.

### Decision 7: Demo User Handling

**Decision: Demo users bypass all gates via `is_demo_user()` check in `get_user_tier()`.**

The demo user returns `Tier.PRO` from `get_user_tier()`, which means every gate (require_tier, require_feature, require_quota) passes automatically. The demo user's `plan` column in the DB is set to `"demo"` for explicitness, but the `get_user_tier()` function maps it to PRO. No billing UI is shown to demo users on the frontend (gate on `user.plan !== "demo"`).

### Decision 8: Where to Record Usage -- Before or After the Action

**Decision: Record usage AFTER the action succeeds, in the same DB transaction.**

Recording before the action would consume quota even if the action fails (deal calculator throws, S3 upload errors, etc.). Recording after, in the same transaction, means a failed action never consumes quota. The check-then-act pattern (check quota, do work, record usage) has a theoretical TOCTOU race, but Decision 5 already accepts that off-by-one.

### Decision 9: Offer Letter Counts Against AI Message Quota

**Decision: Yes. Offer letter generation counts as one `ai_messages_per_month` usage event.**

The offer letter endpoint calls Claude AI (in `core/ai/offer_letter.py`), consuming real tokens. It should count against the same AI message pool as chat messages. This simplifies the metering model -- there is one AI usage counter, not two. The offer letter endpoint's own rate limit (5/min) prevents abuse beyond the monthly quota.

### Decision 10: Free Tier Chat -- Hard Block vs Degraded Access

**Decision: Hard block. Free tier gets zero AI messages.**

Alternatives considered:
- **(a) Give 5 messages/month:** Generates AI costs with zero revenue. At $0.006/message (Haiku), 1000 free users = $30/month in free API costs. This scales unpredictably.
- **(b) Hard block with sample responses (chosen concept, rejected):** Show canned responses to give a taste. Complex to build, and canned responses don't demonstrate real value.
- **(c) Hard block (chosen):** The chat UI shows "Upgrade to Starter to unlock AI chat" with a locked state. The demo account (which uses PRO tier) demonstrates the full chat experience. This is the simplest and most cost-effective approach.
