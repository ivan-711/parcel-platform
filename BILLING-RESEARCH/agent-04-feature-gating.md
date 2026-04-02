# Feature Gating Architecture for Parcel

Research document covering middleware patterns, gating strategies, usage metering,
and caching for a tiered SaaS billing system on FastAPI + PostgreSQL.

---

## 1. Middleware Pattern: FastAPI Dependency Injection for Tier Checking

FastAPI's dependency injection system is the natural integration point for feature
gating. Unlike ASGI middleware (which operates on raw request/response and lacks
access to resolved dependencies), FastAPI `Depends()` functions run after routing,
have full access to the DB session, and compose cleanly with the existing
`get_current_user` dependency.

### Why Dependencies Beat ASGI Middleware for Parcel

| Concern | ASGI Middleware | FastAPI Depends |
|---|---|---|
| Access to `current_user` | No (must re-parse cookie/JWT) | Yes, via `Depends(get_current_user)` |
| Access to DB session | Must create its own session | Uses `Depends(get_db)` |
| Per-route configuration | Requires path matching regex | Declared per-endpoint |
| Error response format | Must manually build JSON | Uses standard HTTPException |
| Testability | Hard to unit test | Overridable via `app.dependency_overrides` |

Parcel already uses `Depends(get_current_user)` on every protected route. The
gating layer should compose on top of that pattern rather than replacing it.

### Core Dependency: `get_subscription`

This is the foundational dependency. Every gating function chains off it.

```python
# backend/core/billing/dependencies.py

from enum import Enum
from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models.users import User
from models.subscriptions import Subscription
from core.security.jwt import get_current_user


class Tier(str, Enum):
    FREE = "free"
    STARTER = "starter"
    PRO = "pro"
    TEAM = "team"


def get_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Subscription:
    """Resolve the active subscription for the current user.

    Falls back to a virtual Free-tier subscription if none exists in the DB.
    This means every user always has a tier -- no null checks downstream.
    """
    sub = (
        db.query(Subscription)
        .filter(
            Subscription.user_id == current_user.id,
            Subscription.status == "active",
            Subscription.current_period_end >= datetime.utcnow(),
        )
        .first()
    )
    if not sub:
        # Virtual free tier -- not persisted, just returned in-memory
        sub = Subscription(
            user_id=current_user.id,
            tier=Tier.FREE,
            status="active",
            current_period_start=datetime.utcnow(),
            current_period_end=datetime.utcnow(),
        )
    return sub
```

Every downstream gate receives this subscription object and reads `.tier` to
make decisions.

---

## 2. Decorator Pattern vs Middleware vs Per-Route Checking -- Tradeoffs

Three common approaches for gating. Each has a place in Parcel.

### Option A: Per-Route Dependency (RECOMMENDED PRIMARY)

```python
@router.post("/")
async def create_deal(
    request: Request,
    body: DealCreateRequest,
    current_user: User = Depends(get_current_user),
    _gate: None = Depends(require_tier(Tier.STARTER)),  # <-- gating
    db: Session = Depends(get_db),
) -> DealResponse:
    ...
```

**Pros:** Explicit, visible in the function signature, fully testable via
`dependency_overrides`, integrates with OpenAPI docs (FastAPI sees the dependency).

**Cons:** Verbose if applied to many routes. Easy to forget on new endpoints.

### Option B: Decorator Pattern

```python
def gate(tier: Tier):
    """Decorator that wraps an endpoint with a tier check."""
    def decorator(fn):
        @wraps(fn)
        async def wrapper(*args, current_user=Depends(get_current_user),
                          db=Depends(get_db), **kwargs):
            sub = get_subscription_sync(current_user, db)
            if TIER_RANK[sub.tier] < TIER_RANK[tier]:
                raise HTTPException(status_code=402, ...)
            return await fn(*args, current_user=current_user, db=db, **kwargs)
        return wrapper
    return decorator
```

**Pros:** One-liner on the endpoint.

**Cons:** Breaks FastAPI's dependency injection -- decorators intercept the
function before FastAPI resolves `Depends()`, so the decorator must manually
handle DI. This pattern is fragile and not recommended with FastAPI.

### Option C: Router-Level Dependency

```python
# Apply to every route in the router
pipeline_router = APIRouter(
    prefix="/pipeline",
    dependencies=[Depends(require_tier(Tier.PRO))],
)
```

**Pros:** Zero per-route boilerplate. Impossible to forget.

**Cons:** All-or-nothing per router. Cannot gate individual endpoints differently
within the same router. Cannot pass the subscription object to the endpoint.

### Recommendation for Parcel

Use a **hybrid approach**:
- **Router-level** `dependencies` for entire feature areas (pipeline, portfolio)
  that are fully gated behind a tier.
- **Per-route** `Depends()` for metered features (analyses, AI messages) where
  the endpoint needs to read and decrement a counter.
- **Never** use the decorator pattern with FastAPI.

---

## 3. Feature Flag System Design

### Tier Configuration as Data

Define the entire gating matrix in a single config dict. This is the source of
truth for every gate in the system.

```python
# backend/core/billing/tier_config.py

from dataclasses import dataclass
from typing import Optional
from core.billing.dependencies import Tier


@dataclass(frozen=True)
class TierLimits:
    analyses_per_month: Optional[int]       # None = unlimited
    saved_deals: Optional[int]              # None = unlimited
    ai_messages_per_month: Optional[int]    # None = unlimited
    ai_chat_enabled: bool
    pdf_export: bool
    pipeline_enabled: bool
    portfolio_enabled: bool
    document_uploads_per_month: Optional[int]
    offer_letter: bool
    share_deals: bool
    team_seats: Optional[int]               # None = not applicable
    custom_branding: bool


TIER_LIMITS: dict[Tier, TierLimits] = {
    Tier.FREE: TierLimits(
        analyses_per_month=3,
        saved_deals=5,
        ai_messages_per_month=0,        # AI chat disabled entirely
        ai_chat_enabled=False,
        pdf_export=False,
        pipeline_enabled=False,
        portfolio_enabled=False,
        document_uploads_per_month=3,
        offer_letter=False,
        share_deals=False,
        team_seats=None,
        custom_branding=False,
    ),
    Tier.STARTER: TierLimits(
        analyses_per_month=15,
        saved_deals=25,
        ai_messages_per_month=30,
        ai_chat_enabled=True,
        pdf_export=True,
        pipeline_enabled=False,         # Pipeline is Pro+
        portfolio_enabled=False,        # Portfolio is Pro+
        document_uploads_per_month=15,
        offer_letter=True,
        share_deals=True,
        team_seats=None,
        custom_branding=False,
    ),
    Tier.PRO: TierLimits(
        analyses_per_month=None,        # Unlimited
        saved_deals=None,
        ai_messages_per_month=150,
        ai_chat_enabled=True,
        pdf_export=True,
        pipeline_enabled=True,
        portfolio_enabled=True,
        document_uploads_per_month=None,
        offer_letter=True,
        share_deals=True,
        team_seats=None,
        custom_branding=False,
    ),
    Tier.TEAM: TierLimits(
        analyses_per_month=None,
        saved_deals=None,
        ai_messages_per_month=500,
        ai_chat_enabled=True,
        pdf_export=True,
        pipeline_enabled=True,
        portfolio_enabled=True,
        document_uploads_per_month=None,
        offer_letter=True,
        share_deals=True,
        team_seats=5,
        custom_branding=True,
    ),
}
```

This structure makes it trivial to answer "can this user do X?" and to expose
remaining quotas in API responses.

---

## 4. Gating Strategies: Hard Gate vs Soft Gate vs Metered Gate

### 4a. Hard Gate (Block Entirely)

Used for features that are completely absent at a tier. The user sees nothing --
the endpoint returns 402 or the frontend never renders the UI.

**Parcel features using hard gate:**
- AI chat (Free tier)
- PDF export (Free tier)
- Pipeline (Free, Starter)
- Portfolio (Free, Starter)
- Offer letter generation (Free tier)
- Custom branding (Free, Starter, Pro)

**Implementation:**

```python
def require_feature(feature: str):
    """Return a dependency that blocks access if the feature is disabled."""
    def _check(
        sub: Subscription = Depends(get_subscription),
    ) -> None:
        limits = TIER_LIMITS[sub.tier]
        if not getattr(limits, feature, False):
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail={
                    "error": f"Your {sub.tier.value} plan does not include this feature",
                    "code": "FEATURE_GATED",
                    "feature": feature,
                    "upgrade_url": "/settings/billing",
                    "current_tier": sub.tier.value,
                },
            )
    return _check


# Usage on a route:
@router.post("/chat/")
async def chat(
    ...,
    _gate: None = Depends(require_feature("ai_chat_enabled")),
):
    ...
```

### 4b. Soft Gate (Allow but Upsell)

Used when you want the user to see the feature exists but prompt them to upgrade.
The endpoint succeeds but includes an `upgrade_hint` in the response. The frontend
uses this to show a banner or modal.

**Parcel features using soft gate:**
- Deal sharing (Free tier: show share button, but return upgrade CTA instead
  of generating a share link)
- Document upload list view (Free: can see documents, upload is metered)

**Implementation:**

```python
@dataclass
class GateResult:
    allowed: bool
    tier: Tier
    upgrade_hint: Optional[str] = None

def check_feature(feature: str):
    """Non-blocking gate -- returns a GateResult instead of raising."""
    def _check(sub: Subscription = Depends(get_subscription)) -> GateResult:
        limits = TIER_LIMITS[sub.tier]
        enabled = getattr(limits, feature, False)
        if enabled:
            return GateResult(allowed=True, tier=sub.tier)
        return GateResult(
            allowed=False,
            tier=sub.tier,
            upgrade_hint=f"Upgrade to unlock {feature.replace('_', ' ')}",
        )
    return _check

# Usage:
@router.put("/{deal_id}/share/")
async def share_deal(
    ...,
    gate: GateResult = Depends(check_feature("share_deals")),
):
    if not gate.allowed:
        return {"upgrade_required": True, "hint": gate.upgrade_hint}
    # ... normal sharing logic
```

### 4c. Metered Gate (Count Usage, Enforce Limit)

Used for features with numeric quotas. The endpoint checks current usage against
the tier limit. If under the limit, the action proceeds and the counter increments.
If at or over the limit, the endpoint returns 402 with the current count and limit.

**Parcel features using metered gate:**
- Analyses per month (Free: 3, Starter: 15, Pro/Team: unlimited)
- AI messages per month (Starter: 30, Pro: 150, Team: 500)
- Saved deals total (Free: 5, Starter: 25, Pro/Team: unlimited)
- Document uploads per month (Free: 3, Starter: 15, Pro/Team: unlimited)

**Implementation:**

```python
def require_quota(resource: str):
    """Dependency that checks a metered resource quota.

    Args:
        resource: One of 'analyses_per_month', 'ai_messages_per_month',
                  'saved_deals', 'document_uploads_per_month'.
    """
    def _check(
        current_user: User = Depends(get_current_user),
        sub: Subscription = Depends(get_subscription),
        db: Session = Depends(get_db),
    ) -> None:
        limits = TIER_LIMITS[sub.tier]
        max_allowed = getattr(limits, resource, None)

        if max_allowed is None:
            return  # Unlimited

        current_usage = get_usage_count(
            user_id=current_user.id,
            resource=resource,
            period_start=sub.current_period_start,
            db=db,
        )

        if current_usage >= max_allowed:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail={
                    "error": f"You've reached your {sub.tier.value} plan limit "
                             f"for {resource.replace('_', ' ')}",
                    "code": "QUOTA_EXCEEDED",
                    "resource": resource,
                    "current_usage": current_usage,
                    "limit": max_allowed,
                    "upgrade_url": "/settings/billing",
                    "current_tier": sub.tier.value,
                    "resets_at": sub.current_period_end.isoformat(),
                },
            )
    return _check
```

---

## 5. Specific Gating Plan for All Parcel Features per Tier

### Complete Feature-to-Gate Matrix

| Feature | Endpoint(s) | Gate Type | Free | Starter | Pro | Team |
|---|---|---|---|---|---|---|
| Run analysis | `POST /deals/` | Metered | 3/mo | 15/mo | Unlimited | Unlimited |
| Save deal | `POST /deals/` | Metered | 5 total | 25 total | Unlimited | Unlimited |
| List/view deals | `GET /deals/`, `GET /deals/{id}` | Open | Yes | Yes | Yes | Yes |
| Delete deal | `DELETE /deals/{id}` | Open | Yes | Yes | Yes | Yes |
| AI chat | `POST /chat/` | Hard + Metered | Blocked | 30/mo | 150/mo | 500/mo |
| Chat history | `GET /chat/history/` | Hard | Blocked | Yes | Yes | Yes |
| PDF export | (frontend, gated client-side) | Hard | Blocked | Yes | Yes | Yes |
| Offer letter | `POST /deals/{id}/offer-letter/` | Hard | Blocked | Yes | Yes | Yes |
| Share deal | `PUT /deals/{id}/share/` | Soft | Upsell | Yes | Yes | Yes |
| View shared deal | `GET /deals/{id}/share/` | Open | Yes | Yes | Yes | Yes |
| Pipeline board | `GET /pipeline/` | Hard | Blocked | Blocked | Yes | Yes |
| Pipeline mutations | `POST/PUT/DELETE /pipeline/*` | Hard | Blocked | Blocked | Yes | Yes |
| Portfolio | `GET/POST/PUT /portfolio/*` | Hard | Blocked | Blocked | Yes | Yes |
| Document upload | `POST /documents/` | Metered | 3/mo | 15/mo | Unlimited | Unlimited |
| Document list/view | `GET /documents/` | Open | Yes | Yes | Yes | Yes |
| Custom branding | (settings) | Hard | Blocked | Blocked | Blocked | Yes |
| Team seats | (invite system) | Hard | No | No | No | 5 seats |

### Router-Level Gates

Apply `dependencies` to entire routers for clean gating:

```python
# In main.py
from core.billing.dependencies import require_feature

app.include_router(
    pipeline.router,
    prefix="/api/v1",
    dependencies=[Depends(require_feature("pipeline_enabled"))],
)
app.include_router(
    portfolio.router,
    prefix="/api/v1",
    dependencies=[Depends(require_feature("portfolio_enabled"))],
)
```

### Per-Route Gates on Existing Endpoints

The deals and chat routers need per-route gating because some endpoints
within the same router have different gates:

```python
# deals.py -- create_deal needs BOTH a quota check and a saved-deals check
@router.post("/", response_model=DealResponse, status_code=201)
@limiter.limit("30/minute")
async def create_deal(
    request: Request,
    body: DealCreateRequest,
    current_user: User = Depends(get_current_user),
    _analysis_quota: None = Depends(require_quota("analyses_per_month")),
    _deals_quota: None = Depends(require_quota("saved_deals")),
    db: Session = Depends(get_db),
) -> DealResponse:
    ...

# chat.py -- needs both hard gate and metered gate
@router.post("/", status_code=200)
@limiter.limit("10/minute")
async def chat(
    request: Request,
    body: ChatRequest,
    current_user: User = Depends(get_current_user),
    _feature: None = Depends(require_feature("ai_chat_enabled")),
    _quota: None = Depends(require_quota("ai_messages_per_month")),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    ...
```

---

## 6. Usage Counter Implementation: Redis vs DB

### Option A: PostgreSQL Only (RECOMMENDED FOR LAUNCH)

Use a `usage_events` table. Count rows per resource per billing period.

```python
# backend/models/usage_events.py

class UsageEvent(TimestampMixin, Base):
    __tablename__ = "usage_events"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    resource = Column(String, nullable=False, index=True)  # 'analyses', 'ai_messages', etc.
    # created_at from TimestampMixin is the event timestamp


def get_usage_count(
    user_id: UUID,
    resource: str,
    period_start: datetime,
    db: Session,
) -> int:
    """Count usage events for a resource since the billing period start."""
    return (
        db.query(UsageEvent)
        .filter(
            UsageEvent.user_id == user_id,
            UsageEvent.resource == resource,
            UsageEvent.created_at >= period_start,
        )
        .count()
    )


def record_usage(user_id: UUID, resource: str, db: Session) -> None:
    """Insert a usage event after a gated action succeeds."""
    db.add(UsageEvent(user_id=user_id, resource=resource))
    db.commit()
```

For the `saved_deals` limit (total, not per-period), count active deals instead:

```python
def get_saved_deals_count(user_id: UUID, db: Session) -> int:
    return (
        db.query(Deal)
        .filter(Deal.user_id == user_id, Deal.deleted_at.is_(None))
        .count()
    )
```

**Pros:**
- No new infrastructure. Parcel already runs PostgreSQL on Railway.
- Transactional consistency: the usage event and the action happen in the same
  DB transaction. If the deal creation fails, the usage event rolls back.
- Easy to audit and query for billing dashboards.

**Cons:**
- COUNT query on every gated request. With an index on
  `(user_id, resource, created_at)`, this is < 1ms for typical usage volumes
  (hundreds of events per user per month, not millions).

### Option B: Redis Counters (FUTURE OPTIMIZATION)

Use Redis `INCR` with key expiry matching the billing period.

```python
import redis

r = redis.Redis(host="...", decode_responses=True)

def get_usage_redis(user_id: str, resource: str, period_key: str) -> int:
    key = f"usage:{user_id}:{resource}:{period_key}"
    val = r.get(key)
    return int(val) if val else 0

def record_usage_redis(user_id: str, resource: str, period_key: str, ttl: int) -> int:
    key = f"usage:{user_id}:{resource}:{period_key}"
    new_val = r.incr(key)
    if new_val == 1:
        r.expire(key, ttl)  # Auto-reset when period ends
    return new_val
```

**Pros:** Sub-millisecond reads. No DB load for high-frequency checks.

**Cons:**
- New infrastructure dependency (Redis on Railway, ~$5/mo).
- Redis eviction can lose counts (user gets free actions).
- Must sync Redis with DB for billing accuracy. Dual-write complexity.
- Overkill for Parcel's current scale.

### Recommendation

Start with PostgreSQL. Add a composite index:

```sql
CREATE INDEX idx_usage_events_user_resource_created
ON usage_events (user_id, resource, created_at DESC);
```

Migrate to Redis only if you see > 100ms on the COUNT query (unlikely below
10K users). The DB-backed approach is simpler, auditable, and transactionally
consistent.

---

## 7. Grace Period Handling

When a user hits their exact limit, several edge cases need handling.

### 7a. At the Limit: Hard Stop vs Soft Warning

**Recommended: warn at 80%, block at 100%.**

```python
@dataclass
class QuotaStatus:
    allowed: bool
    current: int
    limit: int
    warning: bool            # True when >= 80% consumed
    remaining: int
    resets_at: Optional[str]

def check_quota(resource: str):
    """Returns quota status instead of raising. Caller decides behavior."""
    def _check(
        current_user: User = Depends(get_current_user),
        sub: Subscription = Depends(get_subscription),
        db: Session = Depends(get_db),
    ) -> QuotaStatus:
        limits = TIER_LIMITS[sub.tier]
        max_allowed = getattr(limits, resource, None)
        if max_allowed is None:
            return QuotaStatus(
                allowed=True, current=0, limit=-1,
                warning=False, remaining=-1, resets_at=None,
            )
        current = get_usage_count(
            current_user.id, resource, sub.current_period_start, db,
        )
        remaining = max(0, max_allowed - current)
        return QuotaStatus(
            allowed=current < max_allowed,
            current=current,
            limit=max_allowed,
            warning=current >= int(max_allowed * 0.8),
            remaining=remaining,
            resets_at=sub.current_period_end.isoformat(),
        )
    return _check
```

The frontend can show a yellow banner at 80% ("2 analyses remaining this month")
and a red banner at 100% with an upgrade CTA.

### 7b. Subscription Lapse / Downgrade

When a subscription expires or downgrades:

1. **Existing data is never deleted.** A Pro user who downgrades to Free keeps
   all 50 saved deals. They just cannot create new ones until they are below
   the Free limit (5).
2. **Pipeline and portfolio remain read-only.** The user can view but not modify.
   Implement with a `require_feature_or_readonly` gate:

```python
def require_feature_or_readonly(feature: str):
    """Allow GET requests through; block mutating methods."""
    def _check(
        request: Request,
        sub: Subscription = Depends(get_subscription),
    ) -> None:
        limits = TIER_LIMITS[sub.tier]
        if not getattr(limits, feature, False):
            if request.method in ("POST", "PUT", "PATCH", "DELETE"):
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail={
                        "error": "Upgrade required to modify this resource",
                        "code": "FEATURE_GATED",
                        "feature": feature,
                        "read_only": True,
                        "upgrade_url": "/settings/billing",
                    },
                )
    return _check
```

### 7c. Race Conditions at the Boundary

Two concurrent requests could both check the count (e.g., 14 out of 15),
both pass, and both insert -- resulting in 16 usages against a limit of 15.

**Mitigation:** Use `SELECT ... FOR UPDATE` on the subscription row, or use a
PostgreSQL advisory lock:

```python
from sqlalchemy import text

def acquire_usage_lock(user_id: UUID, resource: str, db: Session):
    """Acquire a PostgreSQL advisory lock scoped to (user, resource)."""
    lock_key = hash(f"{user_id}:{resource}") & 0x7FFFFFFF
    db.execute(text(f"SELECT pg_advisory_xact_lock({lock_key})"))
```

Call this at the start of the quota check. The advisory lock is released when
the transaction commits. Overhead is negligible for Parcel's traffic volume.

For practical purposes, being off by 1 is acceptable. A user getting 16 out of
15 analyses is not a business problem. The advisory lock is insurance for the
pedantic case, not a launch requirement.

---

## 8. Rate Limiting Integration with Existing slowapi Setup

Parcel already uses slowapi for IP-based rate limiting. Feature gating and
rate limiting serve different purposes:

| Concern | slowapi (rate limiting) | Feature gating |
|---|---|---|
| What it limits | Request frequency (per minute/hour) | Feature access (per billing period) |
| Key function | IP address or user ID | User ID + subscription tier |
| Reset window | Rolling (1min, 5min) | Billing cycle (monthly) |
| Response code | 429 Too Many Requests | 402 Payment Required |
| Goal | Prevent abuse/DDoS | Enforce pricing tiers |

### Do Not Merge These Systems

Keep them separate. A user can be rate-limited (429) even if they have quota
remaining, and vice versa. They operate at different time scales.

### Tier-Aware Rate Limits (Optional Enhancement)

Higher tiers could receive more generous rate limits:

```python
# limiter.py -- enhanced key function

from core.billing.dependencies import Tier

def tier_aware_key(request: Request) -> str:
    """Key function that returns user_id:tier for tier-aware rate limiting."""
    token = request.cookies.get("access_token")
    if token:
        try:
            user_id = verify_token(token)
            # In practice, read tier from a cached source
            return f"user:{user_id}"
        except Exception:
            pass
    return get_remote_address(request)
```

Then apply different limits:

```python
@router.post("/")
@limiter.limit("30/minute", key_func=tier_aware_key)       # default
@limiter.limit("60/minute", key_func=tier_aware_key,
               exempt_when=lambda: current_tier == Tier.PRO) # PRO gets more
async def create_deal(...):
```

This is a Phase 2 enhancement. For launch, keep the existing fixed slowapi
limits and layer feature gating on top as a separate concern.

---

## 9. Caching Subscription Status

The `get_subscription` dependency queries the database on every request. At
Parcel's current scale (< 10K users), this is fine -- it is a single indexed
query. But there are two optimization paths for the future.

### Option A: In-Memory LRU Cache with TTL (RECOMMENDED)

```python
from functools import lru_cache
from datetime import datetime, timedelta
from cachetools import TTLCache

# Cache subscription lookups for 60 seconds. After a plan change,
# the user sees the update within 1 minute.
_sub_cache: TTLCache = TTLCache(maxsize=10_000, ttl=60)

def get_subscription_cached(user_id: UUID, db: Session) -> Subscription:
    cached = _sub_cache.get(str(user_id))
    if cached:
        return cached

    sub = (
        db.query(Subscription)
        .filter(
            Subscription.user_id == user_id,
            Subscription.status == "active",
            Subscription.current_period_end >= datetime.utcnow(),
        )
        .first()
    )
    if not sub:
        sub = Subscription(
            user_id=user_id,
            tier=Tier.FREE,
            status="active",
            current_period_start=datetime.utcnow(),
            current_period_end=datetime.utcnow(),
        )

    _sub_cache[str(user_id)] = sub
    return sub


def invalidate_subscription_cache(user_id: UUID) -> None:
    """Call this from the Stripe webhook handler after plan changes."""
    _sub_cache.pop(str(user_id), None)
```

**Important:** `cachetools.TTLCache` is not thread-safe by default. Since
FastAPI with uvicorn runs in a single process with async, this is fine. If you
move to multi-worker (gunicorn with uvicorn workers), use Redis instead.

### Option B: Embed Tier in the JWT

Add `tier` to the JWT payload. This means zero DB lookups for the subscription
on every request.

```python
def create_access_token(data: dict, tier: str, ...) -> str:
    to_encode = data.copy()
    to_encode["tier"] = tier
    ...
```

**Pros:** Zero latency. No cache invalidation needed (token expires in 15min).

**Cons:**
- Plan changes are not reflected until the next token refresh (up to 15 min).
- JWT size increases slightly.
- Must update token issuance everywhere (login, register, refresh).

### Option C: Redis Cache (FUTURE)

```python
def get_subscription_redis(user_id: str) -> Optional[str]:
    tier = r.get(f"sub:{user_id}")
    return tier  # "free", "starter", "pro", "team", or None

def set_subscription_redis(user_id: str, tier: str) -> None:
    r.setex(f"sub:{user_id}", 300, tier)  # 5 min TTL
```

### Recommendation

For launch, **embed the tier in the JWT** (Option B). Parcel already refreshes
tokens every 15 minutes. A 15-minute delay between plan change and enforcement
is acceptable. When the Stripe webhook fires, force a token refresh on the next
request by bumping a `token_version` column on the user. This avoids adding
`cachetools` as a dependency and avoids Redis entirely.

---

## 10. Error Response Format for Gated Endpoints

### HTTP Status Codes

| Code | When to Use |
|---|---|
| `402 Payment Required` | Feature is gated behind a higher tier, or quota exceeded. The user CAN fix this by upgrading or waiting for reset. |
| `403 Forbidden` | Access denied for non-billing reasons (wrong user, team permissions). Already used in Parcel for ownership checks. |
| `429 Too Many Requests` | Rate limited (slowapi). Already used in Parcel. |

**Use 402, not 403, for billing gates.** The distinction matters for the frontend:
402 triggers the upgrade modal, 403 triggers "access denied" messaging.

### Standard Gated Response Schema

```python
# backend/schemas/billing.py

from pydantic import BaseModel
from typing import Optional


class FeatureGatedError(BaseModel):
    """Response body for 402 errors caused by tier restrictions."""
    error: str
    code: str                           # "FEATURE_GATED" | "QUOTA_EXCEEDED"
    feature: Optional[str] = None       # e.g., "ai_chat_enabled"
    resource: Optional[str] = None      # e.g., "analyses_per_month"
    current_usage: Optional[int] = None
    limit: Optional[int] = None
    current_tier: str
    upgrade_url: str                    # "/settings/billing"
    resets_at: Optional[str] = None     # ISO datetime for metered resources

    model_config = {"json_schema_extra": {
        "example": {
            "error": "You've reached your starter plan limit for analyses per month",
            "code": "QUOTA_EXCEEDED",
            "resource": "analyses_per_month",
            "current_usage": 15,
            "limit": 15,
            "current_tier": "starter",
            "upgrade_url": "/settings/billing",
            "resets_at": "2026-05-01T00:00:00Z",
        }
    }}
```

### Frontend Handling

The frontend `api.ts` interceptor should catch 402 responses and dispatch to a
global upgrade modal:

```typescript
// frontend/src/lib/api.ts (addition to existing interceptor)

if (response.status === 402) {
  const body = await response.json();
  // Dispatch to Zustand store or React context
  useUpgradeStore.getState().showUpgradeModal({
    feature: body.feature || body.resource,
    currentTier: body.current_tier,
    currentUsage: body.current_usage,
    limit: body.limit,
    resetsAt: body.resets_at,
  });
  throw new UpgradeRequiredError(body);
}
```

### Include Quota Info in Successful Responses

For metered endpoints, include remaining quota in response headers so the
frontend can show counts without an extra API call:

```python
@router.post("/", response_model=DealResponse, status_code=201)
async def create_deal(
    ...,
    response: Response,
    quota: QuotaStatus = Depends(check_quota("analyses_per_month")),
) -> DealResponse:
    ...
    # After success, set quota headers
    response.headers["X-Quota-Remaining"] = str(quota.remaining - 1)
    response.headers["X-Quota-Limit"] = str(quota.limit)
    response.headers["X-Quota-Resets"] = quota.resets_at or ""
    return DealResponse.model_validate(deal)
```

The frontend can read these headers and update the UI without polling.

---

## RECOMMENDATIONS FOR PARCEL

Prioritized implementation plan, roughly ordered by build sequence:

1. **Create the `Subscription` and `UsageEvent` models first.** These are the
   data foundation everything else depends on. The Subscription table needs:
   `user_id`, `tier`, `status`, `stripe_customer_id`, `stripe_subscription_id`,
   `current_period_start`, `current_period_end`. Run `alembic revision` for
   the migration.

2. **Build the tier config as a frozen dataclass dict (`TIER_LIMITS`).** This
   is pure data with zero dependencies. It can be reviewed and adjusted
   without touching any endpoint code. Keep it in a single file:
   `backend/core/billing/tier_config.py`.

3. **Implement `get_subscription` as a FastAPI dependency** that chains off
   `get_current_user`. Return a virtual Free-tier subscription for users
   without a DB record. This means the billing system is always "on" -- there
   is no "billing not set up yet" edge case.

4. **Start with hard gates on pipeline and portfolio routers.** These are the
   simplest to implement (router-level `dependencies`), affect the fewest
   endpoints, and have the clearest tier boundaries. This validates the
   pattern end-to-end before tackling metered gates.

5. **Add metered gates to `POST /deals/` and `POST /chat/` next.** These are
   the highest-value gates (analysis and AI chat drive upgrades). Use the
   `require_quota` dependency. Record usage with `UsageEvent` inserts in the
   same transaction as the deal/message creation.

6. **Use 402 Payment Required for all billing errors, not 403.** The frontend
   already handles 401 (auth) and 403 (permissions). Adding 402 as a third
   distinct status code lets the API interceptor dispatch to an upgrade modal
   without ambiguity.

7. **Embed the tier in the JWT to avoid subscription DB lookups on every
   request.** Parcel already refreshes tokens every 15 minutes, so tier
   changes propagate within one refresh cycle. This eliminates the need for
   a cache layer or Redis at launch. Update `create_access_token` and
   `get_current_user` to extract and validate the tier claim.

8. **Use PostgreSQL for usage counters at launch, not Redis.** A composite
   index on `(user_id, resource, created_at)` makes the COUNT query fast
   enough for Parcel's scale. The transactional consistency guarantee (usage
   event rolls back if the action fails) is more valuable than sub-ms reads.

9. **Return quota info in response headers (`X-Quota-Remaining`,
   `X-Quota-Limit`, `X-Quota-Resets`).** This lets the frontend show
   "2 analyses remaining" in the UI without a separate `/billing/usage` API
   call. It is low-cost to implement and high-value for UX.

10. **Keep slowapi rate limiting completely separate from feature gating.**
    They solve different problems (abuse prevention vs pricing enforcement)
    at different time scales (minutes vs months). Merging them creates
    confusing behavior where a user might be told "rate limited" when the
    real issue is "out of quota," or vice versa.

11. **Implement grace period logic after launch, not at launch.** A user
    getting 16/15 analyses due to a race condition is not a revenue problem.
    Advisory locks add complexity. Ship the basic COUNT check first and add
    locking if abuse patterns emerge.

12. **Build the frontend upgrade modal as a global component in the React app
    shell** (alongside the existing error boundary and command palette). Wire
    it to the 402 interceptor in `api.ts` so that any gated endpoint
    automatically triggers the upgrade flow without per-page handling.
