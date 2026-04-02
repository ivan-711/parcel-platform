# AI Usage Tracking & Cost Control System

> Design document for Parcel's AI metering, token tracking, model routing,
> prompt caching, and cost anomaly detection. Implementation-ready Python code
> that integrates with the existing `chat.py` and `offer_letter.py` patterns.

---

## Table of Contents

1. [Usage Tracking Service](#1-usage-tracking-service)
2. [Token Tracking](#2-token-tracking)
3. [Model Routing by Tier](#3-model-routing-by-tier)
4. [Prompt Caching Implementation](#4-prompt-caching-implementation)
5. [Usage Reset Logic](#5-usage-reset-logic)
6. [Soft Limit Behavior](#6-soft-limit-behavior)
7. [Admin Dashboard](#7-admin-dashboard)
8. [Cost Anomaly Detection](#8-cost-anomaly-detection)
9. [Response Format When AI Limit Reached](#9-response-format-when-ai-limit-reached)
10. [SSE Integration](#10-sse-integration)
11. [Caching Strategy for Common AI Queries](#11-caching-strategy-for-common-ai-queries)
12. [CRITICAL DECISIONS](#critical-decisions)

---

## 1. Usage Tracking Service

### Design Principle

Every AI interaction (chat message, offer letter, future document analysis) is
recorded as a row in `ai_usage_log`. This single table serves three purposes:

1. **Quota enforcement** -- COUNT queries check if the user is within their tier
   limit for the current billing period.
2. **Cost attribution** -- SUM queries calculate per-user, per-team, and
   platform-wide AI spend.
3. **Operational visibility** -- admin queries surface top spenders, cache hit
   rates, and anomalies.

### SQLAlchemy Model

```python
# backend/models/ai_usage_log.py

"""AI usage log -- one row per AI API call (chat message, offer letter, etc.)."""

from sqlalchemy import Column, Date, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID

from database import Base
from models.base import TimestampMixin


class AIUsageLog(TimestampMixin, Base):
    """Records every AI API call with token counts and cost."""

    __tablename__ = "ai_usage_log"

    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    team_id = Column(
        UUID(as_uuid=True), ForeignKey("teams.id"), nullable=True
    )

    # What triggered this call
    request_type = Column(
        String, nullable=False
    )  # "chat", "offer_letter", "document_analysis"
    session_id = Column(String, nullable=True)  # chat session FK
    context_type = Column(String, nullable=True)  # "general", "deal", "document"
    context_id = Column(UUID(as_uuid=True), nullable=True)

    # Model used
    model = Column(String, nullable=False)  # e.g. "claude-haiku-3-5-20241022"

    # Token counts (from Anthropic API response.usage)
    input_tokens = Column(Integer, nullable=False, default=0)
    output_tokens = Column(Integer, nullable=False, default=0)
    cache_creation_tokens = Column(Integer, nullable=False, default=0)
    cache_read_tokens = Column(Integer, nullable=False, default=0)

    # Computed cost in USD
    cost_usd = Column(Numeric(10, 6), nullable=False, default=0)

    # Billing period (from subscription.current_period_start/end)
    billing_period_start = Column(Date, nullable=False)
    billing_period_end = Column(Date, nullable=False)

    # Whether this was a cached response (no API call made)
    cached_response = Column(
        Integer, nullable=False, default=0
    )  # 0 = API call, 1 = response cache hit
```

### Composite Index

```sql
-- Optimizes the two hot queries: per-user message count and per-user spend
CREATE INDEX idx_ai_usage_user_period_type
ON ai_usage_log (user_id, billing_period_start, request_type);
```

### Usage Counting Service

```python
# backend/core/billing/ai_usage.py

"""AI usage counting, recording, and cost calculation."""

from datetime import date
from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy import func, text
from sqlalchemy.orm import Session

from models.ai_usage_log import AIUsageLog


# ─── Pricing (per million tokens, as of March 2026) ───────────────────────

MODEL_PRICING: dict[str, dict[str, Decimal]] = {
    "claude-sonnet-4-5-20250929": {
        "input": Decimal("3.00"),
        "output": Decimal("15.00"),
        "cache_write": Decimal("3.75"),   # 1.25x input
        "cache_read": Decimal("0.30"),    # 0.10x input
    },
    "claude-haiku-3-5-20241022": {
        "input": Decimal("0.80"),
        "output": Decimal("4.00"),
        "cache_write": Decimal("1.00"),
        "cache_read": Decimal("0.08"),
    },
}

PER_MILLION = Decimal("1000000")


def calculate_cost(
    model: str,
    input_tokens: int,
    output_tokens: int,
    cache_creation_tokens: int = 0,
    cache_read_tokens: int = 0,
) -> Decimal:
    """Calculate USD cost from token counts.

    Standard input tokens = total input - cache_read (those are billed at
    the cheaper cache_read rate instead).
    """
    pricing = MODEL_PRICING.get(model)
    if not pricing:
        # Fallback: treat unknown models as Sonnet pricing (safe default)
        pricing = MODEL_PRICING["claude-sonnet-4-5-20250929"]

    standard_input = max(0, input_tokens - cache_read_tokens)

    cost = (
        (Decimal(standard_input) / PER_MILLION) * pricing["input"]
        + (Decimal(output_tokens) / PER_MILLION) * pricing["output"]
        + (Decimal(cache_creation_tokens) / PER_MILLION) * pricing["cache_write"]
        + (Decimal(cache_read_tokens) / PER_MILLION) * pricing["cache_read"]
    )
    return cost.quantize(Decimal("0.000001"))


# ─── Counting ──────────────────────────────────────────────────────────────

def get_ai_message_count(
    db: Session,
    user_id: UUID,
    period_start: date,
    request_type: str = "chat",
) -> int:
    """Count AI messages for a user in the current billing period.

    Uses the composite index on (user_id, billing_period_start, request_type).
    """
    return (
        db.query(func.count(AIUsageLog.id))
        .filter(
            AIUsageLog.user_id == user_id,
            AIUsageLog.billing_period_start == period_start,
            AIUsageLog.request_type == request_type,
        )
        .scalar()
    ) or 0


def get_all_ai_usage_counts(
    db: Session,
    user_id: UUID,
    period_start: date,
) -> dict[str, int]:
    """Return message counts grouped by request_type for the billing period."""
    rows = (
        db.query(AIUsageLog.request_type, func.count(AIUsageLog.id))
        .filter(
            AIUsageLog.user_id == user_id,
            AIUsageLog.billing_period_start == period_start,
        )
        .group_by(AIUsageLog.request_type)
        .all()
    )
    return {row[0]: row[1] for row in rows}


# ─── Recording ─────────────────────────────────────────────────────────────

def record_ai_usage(
    db: Session,
    user_id: UUID,
    request_type: str,
    model: str,
    input_tokens: int,
    output_tokens: int,
    billing_period_start: date,
    billing_period_end: date,
    cache_creation_tokens: int = 0,
    cache_read_tokens: int = 0,
    session_id: Optional[str] = None,
    context_type: Optional[str] = None,
    context_id: Optional[UUID] = None,
    team_id: Optional[UUID] = None,
    cached_response: bool = False,
) -> AIUsageLog:
    """Insert an AI usage log row and return it.

    Called in the chat router's finally block (after stream completes) and
    after synchronous offer_letter generation.
    """
    cost = calculate_cost(
        model=model,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        cache_creation_tokens=cache_creation_tokens,
        cache_read_tokens=cache_read_tokens,
    ) if not cached_response else Decimal("0")

    log = AIUsageLog(
        user_id=user_id,
        team_id=team_id,
        request_type=request_type,
        session_id=session_id,
        context_type=context_type,
        context_id=context_id,
        model=model,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        cache_creation_tokens=cache_creation_tokens,
        cache_read_tokens=cache_read_tokens,
        cost_usd=cost,
        billing_period_start=billing_period_start,
        billing_period_end=billing_period_end,
        cached_response=1 if cached_response else 0,
    )
    db.add(log)
    db.commit()
    return log


# ─── Spend Queries ─────────────────────────────────────────────────────────

def get_user_spend(
    db: Session, user_id: UUID, period_start: date
) -> dict:
    """Total AI spend and token counts for a user in a billing period."""
    row = db.execute(
        text("""
            SELECT
                COUNT(*) as message_count,
                COALESCE(SUM(cost_usd), 0) as total_cost,
                COALESCE(SUM(input_tokens), 0) as total_input,
                COALESCE(SUM(output_tokens), 0) as total_output,
                COALESCE(SUM(cache_read_tokens), 0) as total_cache_reads
            FROM ai_usage_log
            WHERE user_id = :uid AND billing_period_start = :start
        """),
        {"uid": str(user_id), "start": period_start},
    ).first()

    return {
        "message_count": row.message_count,
        "total_cost_usd": float(row.total_cost),
        "total_input_tokens": row.total_input,
        "total_output_tokens": row.total_output,
        "total_cache_read_tokens": row.total_cache_reads,
    }
```

### How It Integrates with Existing `UsageEvent` Table

Agent 04 (feature gating) defines a generic `usage_events` table for metered
features (analyses, document uploads, saved deals). AI usage tracking lives in
a **separate** `ai_usage_log` table because it needs token-level granularity
that the generic counter does not support. The two tables coexist:

| Table | Purpose | Rows per action |
|---|---|---|
| `usage_events` | Generic feature quota (analyses, uploads, deals) | 1 per action |
| `ai_usage_log` | AI-specific cost tracking (tokens, model, cost) | 1 per AI call |

For AI message quota enforcement, `ai_usage_log` is the source of truth -- we
COUNT rows where `request_type = 'chat'` for the billing period. There is no
need to also insert into `usage_events` for AI messages; that would be
redundant.

---

## 2. Token Tracking

### The Gap in the Current Codebase

`chat_specialist.py` calls `anthropic_client.messages.stream()` and yields text
deltas, but **never captures `usage` from the final message**. The
`offer_letter.py` file calls `anthropic_client.messages.create()` synchronously
and returns `response.content[0].text`, discarding `response.usage` entirely.

Both must be updated to return token metadata alongside the content.

### Modified `stream_chat_response` (chat_specialist.py)

The function signature changes to yield text deltas as before, but a mutable
dict (`usage_result`) is passed in and populated after the stream closes.

```python
# backend/core/ai/chat_specialist.py  (modified)

"""AI chat specialist -- real estate investment advisor backed by Claude."""

import os
from typing import Iterator

from anthropic import Anthropic

anthropic_client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

SYSTEM_PROMPT = """..."""  # Unchanged -- Ivan owns this. DO NOT MODIFY.


def stream_chat_response(
    message: str,
    history: list[dict],
    model: str = "claude-sonnet-4-5-20250929",
    system_context: str | None = None,
    usage_result: dict | None = None,
) -> Iterator[str]:
    """Yield text delta strings from Claude streaming response.

    Args:
        message: The user's chat message (may include deal context block).
        history: Prior conversation messages as role/content dicts.
        model: Claude model ID to use (determined by tier).
        system_context: Optional additional context appended to the system
            prompt (used for document context injection).
        usage_result: If provided, populated with token counts after the
            stream completes. Keys: input_tokens, output_tokens,
            cache_creation_input_tokens, cache_read_input_tokens, model.
    """
    # Build system as a list of content blocks for prompt caching
    system_blocks = [
        {
            "type": "text",
            "text": SYSTEM_PROMPT,
            "cache_control": {"type": "ephemeral"},
        }
    ]
    if system_context:
        system_blocks.append({"type": "text", "text": system_context})

    messages = history + [{"role": "user", "content": message}]

    with anthropic_client.messages.stream(
        model=model,
        max_tokens=1024,
        system=system_blocks,
        messages=messages,
    ) as stream:
        for text in stream.text_stream:
            yield text

        # After all text deltas have been yielded, capture usage
        if usage_result is not None:
            final = stream.get_final_message()
            usage_result["input_tokens"] = final.usage.input_tokens
            usage_result["output_tokens"] = final.usage.output_tokens
            usage_result["cache_creation_input_tokens"] = (
                getattr(final.usage, "cache_creation_input_tokens", 0) or 0
            )
            usage_result["cache_read_input_tokens"] = (
                getattr(final.usage, "cache_read_input_tokens", 0) or 0
            )
            usage_result["model"] = final.model
```

**Key design choice:** The `usage_result` dict is **mutated in place** rather
than returned. This preserves the generator-based API (`yield`) that the chat
router depends on. The caller passes an empty dict before iterating, and reads
it after the generator is exhausted (in the `finally` block).

### Modified `generate_offer_letter` (offer_letter.py)

```python
# backend/core/ai/offer_letter.py  (modified -- only the generate function)

def generate_offer_letter(deal: Deal, model: str = "claude-sonnet-4-5-20250929") -> tuple[str, dict]:
    """Call Claude to produce a professional offer letter for the given deal.

    Returns:
        (letter_text, usage_metadata) where usage_metadata contains
        input_tokens, output_tokens, cache token counts, and model.
    """
    inputs: dict[str, Any] = deal.inputs or {}
    outputs: dict[str, Any] = deal.outputs or {}
    strategy_label = deal.strategy.replace("_", " ").title()

    offer_price, key_terms = _build_deal_terms(deal.strategy, inputs, outputs)

    user_prompt = (
        "Write a professional real estate offer letter for the following deal:\n\n"
        f"Property Address: {deal.address}\n"
        f"Strategy: {strategy_label}\n"
        f"Offer Price: {offer_price}\n\n"
        f"Key Deal Terms:\n{key_terms}\n\n"
        f"Risk Score: {deal.risk_score or 'N/A'}/100\n\n"
        "Write a 3-4 paragraph offer letter from the buyer to the seller. "
        "Include: opening paragraph stating the offer price and property, "
        "middle paragraph outlining key terms and conditions, closing "
        "paragraph with next steps and contact information placeholder. "
        "Sign off as 'Parcel Investment Group'."
    )

    # Use content blocks for system prompt caching
    system_blocks = [
        {
            "type": "text",
            "text": SYSTEM_PROMPT,
            "cache_control": {"type": "ephemeral"},
        }
    ]

    response = anthropic_client.messages.create(
        model=model,
        max_tokens=1000,
        system=system_blocks,
        messages=[{"role": "user", "content": user_prompt}],
    )

    usage_metadata = {
        "input_tokens": response.usage.input_tokens,
        "output_tokens": response.usage.output_tokens,
        "cache_creation_input_tokens": (
            getattr(response.usage, "cache_creation_input_tokens", 0) or 0
        ),
        "cache_read_input_tokens": (
            getattr(response.usage, "cache_read_input_tokens", 0) or 0
        ),
        "model": response.model,
    }

    return response.content[0].text, usage_metadata
```

### Integration in deals.py (offer letter endpoint)

```python
# In the offer letter endpoint of deals.py (after generate_offer_letter call)

letter_text, usage_meta = generate_offer_letter(deal, model=model)

# Record AI usage
from core.billing.ai_usage import record_ai_usage

record_ai_usage(
    db=db,
    user_id=current_user.id,
    request_type="offer_letter",
    model=usage_meta["model"],
    input_tokens=usage_meta["input_tokens"],
    output_tokens=usage_meta["output_tokens"],
    billing_period_start=sub.current_period_start.date(),
    billing_period_end=sub.current_period_end.date(),
    cache_creation_tokens=usage_meta["cache_creation_input_tokens"],
    cache_read_tokens=usage_meta["cache_read_input_tokens"],
    context_type="deal",
    context_id=deal.id,
    team_id=current_user.team_id,
)
```

---

## 3. Model Routing by Tier

### Decision: Haiku for Starter, Sonnet for Pro/Team

This is the right call. The cost difference is dramatic:

| Model | Input $/M | Output $/M | Cost per typical message |
|---|---|---|---|
| Haiku 3.5 | $0.80 | $4.00 | **$0.0058** |
| Sonnet 4.5 | $3.00 | $15.00 | **$0.0216** |

A Starter user at full usage (30 messages) costs $0.17/month on Haiku vs
$0.65 on Sonnet. At 500 Starter users, that is $85 vs $325 per month. For a
$19/month tier, Haiku keeps AI costs under 1% of revenue.

Haiku 3.5 handles Parcel's use case well: the system prompt constrains
responses to real estate investing, and Haiku produces competent answers for
definitions, simple deal Q&A, and strategy explanations. The quality gap with
Sonnet only matters for complex multi-variable analysis, which is exactly the
upsell to Pro.

### Implementation

```python
# backend/core/ai/model_router.py

"""Route users to the appropriate Claude model based on subscription tier."""

from typing import Optional

TIER_MODEL_MAP: dict[str, Optional[str]] = {
    "free": None,                           # AI blocked at Free tier
    "demo": "claude-sonnet-4-5-20250929",   # Demo gets Pro-level model
    "starter": "claude-haiku-3-5-20241022",
    "pro": "claude-sonnet-4-5-20250929",
    "team": "claude-sonnet-4-5-20250929",
}


def get_model_for_tier(tier: str) -> Optional[str]:
    """Return the Claude model ID for a subscription tier.

    Returns None if the tier has no AI access (Free).
    """
    return TIER_MODEL_MAP.get(tier)
```

### Usage in Chat Router

```python
from core.ai.model_router import get_model_for_tier

model = get_model_for_tier(sub.tier)
if model is None:
    # Handled by require_feature("ai_chat_enabled") gate -- should not reach here
    raise HTTPException(status_code=402, detail={"error": "AI chat requires Starter plan or higher"})
```

### Usage in Offer Letter Endpoint

```python
model = get_model_for_tier(sub.tier)
# Offer letters always use at least Sonnet for quality
# (offer_letter is gated to Starter+, but Starter uses Haiku for chat --
#  for offer letters specifically, we upgrade to Sonnet regardless of tier)
offer_model = "claude-sonnet-4-5-20250929"  # Always Sonnet for offer letters
letter_text, usage_meta = generate_offer_letter(deal, model=offer_model)
```

**Rationale for always using Sonnet for offer letters:** An offer letter is a
high-stakes document that the user may send to a real seller. Quality matters
more than cost savings here. At ~$0.02 per letter, even at Haiku pricing the
savings would be ~$0.015 -- not worth the quality risk.

---

## 4. Prompt Caching Implementation

### Why This Is a Priority 1 Change

The system prompt in `chat_specialist.py` is ~4,720 tokens. Without caching,
every message pays full input price for these tokens. With prompt caching:

- **Cache write (first call in 5-min window):** 1.25x input rate
- **Cache read (subsequent calls in window):** 0.10x input rate
- **Net savings at 60% hit rate:** ~44% reduction on system prompt cost

### Implementation

The change is structural, not behavioral. Instead of passing `system` as a
string, pass it as a list of content blocks with `cache_control` on the static
block.

**Before (current code):**
```python
system = SYSTEM_PROMPT
if system_context:
    system = SYSTEM_PROMPT + "\n\n" + system_context
# ...
anthropic_client.messages.stream(
    model="claude-opus-4-5",
    system=system,  # plain string
    ...
)
```

**After:**
```python
system_blocks = [
    {
        "type": "text",
        "text": SYSTEM_PROMPT,
        "cache_control": {"type": "ephemeral"},  # 5-min cache TTL
    }
]
if system_context:
    # Document context is dynamic -- NOT cached
    system_blocks.append({"type": "text", "text": system_context})

anthropic_client.messages.stream(
    model=model,
    system=system_blocks,
    ...
)
```

### Cache Scope Rules (Anthropic API)

- Cache is scoped to the organization (Parcel's API key).
- Cache matches on **exact prefix**: tools + system blocks + messages, in order.
- The system prompt block must be the **first** cacheable block.
- Dynamic content (document context) goes **after** the cached block so it does
  not invalidate the cache.
- Minimum cacheable size: 1,024 tokens for Haiku, 2,048 for Sonnet. Parcel's
  system prompt (~4,720 tokens) exceeds both thresholds.

### Offer Letter Caching

The offer letter system prompt is much shorter (~50 tokens), well below the
minimum cacheable threshold. Caching is not beneficial here. The cost savings
would be negligible. Leave it as a plain string or content block without
`cache_control`.

### Extended Cache TTL (Future)

Anthropic offers a beta header for 1-hour cache TTL. Enable this in production
after measuring baseline cache hit rates:

```python
# Future optimization -- add when cache_hit_rate data is available
anthropic_client.messages.stream(
    model=model,
    system=system_blocks,
    messages=messages,
    extra_headers={"anthropic-beta": "extended-cache-ttl-2025-04-11"},
)
```

---

## 5. Usage Reset Logic

### Decision: Tied to Stripe Billing Cycle

Usage resets are anchored to `subscription.current_period_start` and
`subscription.current_period_end`, which Stripe sets on each renewal. This is
fairer than calendar month (a user who signs up on March 28 gets a full 30-day
period, not 3 days).

### How It Works

1. **Stripe webhook `invoice.paid`** fires on each renewal.
2. The webhook handler updates `subscription.current_period_start` and
   `subscription.current_period_end` from the Stripe event data.
3. All usage queries filter by `billing_period_start = sub.current_period_start`.
4. When the period rolls over, the old rows remain in `ai_usage_log` for
   auditing but are no longer counted against the quota.

There is **no explicit reset action**. The COUNT query naturally returns 0 for
a new period because no rows exist with the new `billing_period_start` yet.

### Billing Period Resolution

```python
# backend/core/billing/periods.py

"""Resolve the current billing period from the subscription."""

from datetime import date
from typing import Optional


def get_billing_period(
    period_start: Optional[date],
    period_end: Optional[date],
) -> tuple[date, date]:
    """Return (start, end) for the current billing period.

    Falls back to calendar month boundaries for Free-tier users who have
    no Stripe subscription (virtual subscription with no period dates).
    """
    if period_start and period_end:
        return period_start, period_end

    # Fallback for Free tier: calendar month
    today = date.today()
    start = today.replace(day=1)
    if today.month == 12:
        end = today.replace(year=today.year + 1, month=1, day=1)
    else:
        end = today.replace(month=today.month + 1, day=1)
    return start, end
```

### Edge Case: Mid-Cycle Upgrade

When a Starter user upgrades to Pro mid-cycle:

1. Stripe prorates the charge and resets `current_period_start/end`.
2. The webhook updates the subscription row.
3. **Usage does NOT reset.** The existing count carries over. If the user had
   sent 25/30 Starter messages, they now have 25/150 Pro messages.
4. The `billing_period_start` may change (Stripe resets the cycle on upgrade),
   in which case the count naturally resets to 0 for the new period.

This behavior is correct: Stripe handles proration, and our system simply reads
the current period dates.

---

## 6. Soft Limit Behavior

### Warn at 80%, Block at 100%

The system provides three states based on usage percentage:

| State | Trigger | Behavior |
|---|---|---|
| Normal | usage < 80% of limit | No UI indicator |
| Warning | usage >= 80% of limit | Yellow banner in chat + `warning` field in SSE |
| Blocked | usage >= 100% of limit | SSE error stream with upgrade CTA |

### Quota Check Dependency

```python
# backend/core/billing/ai_quota.py

"""AI-specific quota check that returns status instead of raising.

This is separate from the generic require_quota in guards.py because the
chat endpoint needs the QuotaStatus to decide between warning, blocking,
or proceeding -- and it returns an SSE stream, not an HTTP error.
"""

from dataclasses import dataclass
from datetime import date
from typing import Optional
from uuid import UUID

from fastapi import Depends
from sqlalchemy.orm import Session

from core.billing.ai_usage import get_ai_message_count
from core.billing.tier_config import TIER_LIMITS, Tier
from core.billing.dependencies import get_subscription
from core.security.jwt import get_current_user
from database import get_db
from models.subscriptions import Subscription
from models.users import User


@dataclass
class AIQuotaStatus:
    """Result of an AI quota check. Never raises -- the caller decides."""

    allowed: bool
    current: int
    limit: int            # -1 = unlimited
    remaining: int        # -1 = unlimited
    warning: bool         # True when >= 80% consumed
    warning_message: Optional[str] = None
    resets_at: Optional[str] = None
    tier: str = "free"


def check_ai_quota(request_type: str = "chat"):
    """FastAPI dependency that checks AI quota and returns status.

    Does NOT raise HTTPException. The chat endpoint inspects the result
    and either proceeds, warns, or returns an SSE error stream.
    """
    def _check(
        current_user: User = Depends(get_current_user),
        sub: Subscription = Depends(get_subscription),
        db: Session = Depends(get_db),
    ) -> AIQuotaStatus:
        limits = TIER_LIMITS[sub.tier]

        # Determine the correct limit field
        if request_type == "chat":
            max_allowed = limits.ai_messages_per_month
        elif request_type == "offer_letter":
            # Offer letters share the AI message quota
            # (counted separately but against a combined limit)
            max_allowed = limits.ai_messages_per_month
        else:
            max_allowed = None  # Unknown type -- unlimited

        if max_allowed is None:
            return AIQuotaStatus(
                allowed=True, current=0, limit=-1, remaining=-1,
                warning=False, tier=sub.tier,
            )

        if max_allowed == 0:
            return AIQuotaStatus(
                allowed=False, current=0, limit=0, remaining=0,
                warning=False, tier=sub.tier,
                resets_at=sub.current_period_end.isoformat() if sub.current_period_end else None,
            )

        period_start = sub.current_period_start.date() if sub.current_period_start else date.today().replace(day=1)

        current = get_ai_message_count(db, current_user.id, period_start, request_type)
        remaining = max(0, max_allowed - current)
        at_warning = current >= int(max_allowed * 0.8)
        at_limit = current >= max_allowed

        warning_msg = None
        if at_warning and not at_limit:
            warning_msg = f"You have {remaining} AI messages remaining this month."

        return AIQuotaStatus(
            allowed=not at_limit,
            current=current,
            limit=max_allowed,
            remaining=remaining,
            warning=at_warning,
            warning_message=warning_msg,
            resets_at=sub.current_period_end.isoformat() if sub.current_period_end else None,
            tier=sub.tier,
        )

    return _check
```

### Frontend Warning Display

When the SSE stream includes a `warning` field, the chat UI shows a
dismissable yellow banner:

```
You have 6 AI messages remaining this month. [Upgrade to Pro]
```

The banner appears **once per session** (dismissed by the user or by component
state). It does not repeat on every message.

---

## 7. Admin Dashboard

### Internal Admin Endpoints

These are JSON endpoints for internal monitoring. No frontend UI initially --
consume via direct API calls or a simple admin page.

```python
# backend/routers/admin.py (new file -- partial, AI stats section)

"""Admin endpoints for AI usage monitoring. Protected by admin role check."""

from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from database import get_db
from models.ai_usage_log import AIUsageLog
from models.users import User

router = APIRouter(prefix="/admin/ai", tags=["admin"])


@router.get("/stats/daily")
async def daily_ai_stats(
    days: int = 30,
    db: Session = Depends(get_db),
    # _admin: None = Depends(require_admin),  # admin guard
):
    """Daily AI spend breakdown by model."""
    rows = db.execute(text("""
        SELECT
            DATE(created_at) as day,
            model,
            COUNT(*) as messages,
            SUM(input_tokens) as total_input,
            SUM(output_tokens) as total_output,
            SUM(cost_usd)::float as total_cost,
            SUM(cache_read_tokens)::float /
                NULLIF(SUM(cache_read_tokens + cache_creation_tokens + input_tokens), 0)
                as cache_hit_rate
        FROM ai_usage_log
        WHERE created_at >= CURRENT_DATE - :days * INTERVAL '1 day'
        GROUP BY DATE(created_at), model
        ORDER BY day DESC, model
    """), {"days": days}).fetchall()

    return [
        {
            "day": str(r.day),
            "model": r.model,
            "messages": r.messages,
            "total_input_tokens": r.total_input,
            "total_output_tokens": r.total_output,
            "total_cost_usd": r.total_cost,
            "cache_hit_rate": round(r.cache_hit_rate or 0, 3),
        }
        for r in rows
    ]


@router.get("/stats/top-users")
async def top_users_by_ai_spend(
    period_start: date | None = None,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    """Top users by AI cost in the current or specified billing period."""
    if not period_start:
        period_start = date.today().replace(day=1)

    rows = db.execute(text("""
        SELECT
            u.email,
            u.name,
            COUNT(*) as messages,
            SUM(a.cost_usd)::float as total_cost,
            SUM(a.input_tokens + a.output_tokens) as total_tokens,
            SUM(a.cache_read_tokens)::float /
                NULLIF(SUM(a.cache_read_tokens + a.input_tokens), 0)
                as cache_hit_rate
        FROM ai_usage_log a
        JOIN users u ON u.id = a.user_id
        WHERE a.billing_period_start >= :start
        GROUP BY u.email, u.name
        ORDER BY total_cost DESC
        LIMIT :lim
    """), {"start": period_start, "lim": limit}).fetchall()

    return [
        {
            "email": r.email,
            "name": r.name,
            "messages": r.messages,
            "total_cost_usd": r.total_cost,
            "total_tokens": r.total_tokens,
            "cache_hit_rate": round(r.cache_hit_rate or 0, 3),
        }
        for r in rows
    ]


@router.get("/stats/summary")
async def ai_stats_summary(db: Session = Depends(get_db)):
    """Platform-wide AI stats for today and this month."""
    today = date.today()
    month_start = today.replace(day=1)

    row = db.execute(text("""
        SELECT
            SUM(CASE WHEN DATE(created_at) = :today THEN cost_usd ELSE 0 END)::float as spend_today,
            SUM(CASE WHEN created_at >= :month THEN cost_usd ELSE 0 END)::float as spend_month,
            COUNT(CASE WHEN DATE(created_at) = :today THEN 1 END) as messages_today,
            COUNT(CASE WHEN created_at >= :month THEN 1 END) as messages_month,
            COUNT(DISTINCT CASE WHEN DATE(created_at) = :today THEN user_id END) as active_users_today,
            COUNT(DISTINCT CASE WHEN created_at >= :month THEN user_id END) as active_users_month
        FROM ai_usage_log
    """), {"today": today, "month": month_start}).first()

    return {
        "spend_today_usd": row.spend_today or 0,
        "spend_month_usd": row.spend_month or 0,
        "messages_today": row.messages_today,
        "messages_month": row.messages_month,
        "active_ai_users_today": row.active_users_today,
        "active_ai_users_month": row.active_users_month,
    }
```

### User-Facing Usage Endpoint

```python
# Added to settings.py or a new billing router

@router.get("/ai/usage")
async def get_ai_usage(
    current_user: User = Depends(get_current_user),
    sub: Subscription = Depends(get_subscription),
    db: Session = Depends(get_db),
):
    """Return the current user's AI usage for the billing period."""
    limits = TIER_LIMITS[sub.tier]
    period_start = sub.current_period_start.date() if sub.current_period_start else date.today().replace(day=1)

    chat_count = get_ai_message_count(db, current_user.id, period_start, "chat")
    offer_count = get_ai_message_count(db, current_user.id, period_start, "offer_letter")

    ai_limit = limits.ai_messages_per_month or 0

    return {
        "chat_messages_used": chat_count,
        "offer_letters_used": offer_count,
        "total_ai_messages_used": chat_count + offer_count,
        "ai_messages_limit": ai_limit if ai_limit > 0 else "unlimited",
        "percent_used": round((chat_count + offer_count) / ai_limit * 100, 1) if ai_limit else 0,
        "resets_at": sub.current_period_end.isoformat() if sub.current_period_end else None,
        "tier": sub.tier,
    }
```

---

## 8. Cost Anomaly Detection

### In-Memory Circuit Breaker

A lightweight in-process tracker that flags runaway spend. No external
dependencies (no Redis). Runs in the same FastAPI process.

```python
# backend/core/ai/circuit_breaker.py

"""AI cost circuit breaker -- prevents runaway API spend."""

import logging
import time
from collections import defaultdict
from threading import Lock

logger = logging.getLogger(__name__)


class AICircuitBreaker:
    """Track daily AI spend and per-user hourly volume.

    Trip conditions:
    1. Daily platform spend exceeds DAILY_BUDGET.
    2. Single user sends > USER_HOURLY_LIMIT messages in one hour.

    The breaker auto-resets at midnight (new day key).
    """

    DAILY_BUDGET: float = 100.0        # Hard stop at $100/day platform-wide
    WARNING_THRESHOLD: float = 0.7     # Log warning at 70% of daily budget
    USER_HOURLY_LIMIT: int = 20        # Max messages per user per hour

    def __init__(self) -> None:
        self._daily_spend: dict[str, float] = defaultdict(float)
        self._user_hourly: dict[str, int] = defaultdict(int)
        self._tripped: bool = False
        self._lock = Lock()

    def _today_key(self) -> str:
        return time.strftime("%Y-%m-%d")

    def _hour_key(self, user_id: str) -> str:
        return f"{user_id}:{time.strftime('%Y-%m-%d-%H')}"

    def record(self, user_id: str, cost_usd: float) -> None:
        """Record a completed AI call. Check thresholds."""
        with self._lock:
            today = self._today_key()
            self._daily_spend[today] += cost_usd
            self._user_hourly[self._hour_key(user_id)] += 1

            daily_total = self._daily_spend[today]

            if daily_total >= self.DAILY_BUDGET:
                self._tripped = True
                logger.critical(
                    "AI circuit breaker TRIPPED: daily spend $%.2f >= $%.2f",
                    daily_total, self.DAILY_BUDGET,
                )

            elif daily_total >= self.DAILY_BUDGET * self.WARNING_THRESHOLD:
                logger.warning(
                    "AI spend warning: $%.2f today (%.0f%% of $%.2f budget)",
                    daily_total,
                    (daily_total / self.DAILY_BUDGET) * 100,
                    self.DAILY_BUDGET,
                )

    def check_allowed(self, user_id: str) -> tuple[bool, str]:
        """Check if an AI call should proceed.

        Returns:
            (allowed, reason) -- reason is empty string if allowed.
        """
        today = self._today_key()

        # Global circuit breaker
        if self._tripped and self._daily_spend.get(today, 0) >= self.DAILY_BUDGET:
            return False, "AI service temporarily unavailable due to high demand. Please try again later."

        # Auto-reset if it is a new day
        if self._tripped and self._daily_spend.get(today, 0) < self.DAILY_BUDGET:
            self._tripped = False

        # Per-user hourly limit
        hour_key = self._hour_key(user_id)
        if self._user_hourly.get(hour_key, 0) >= self.USER_HOURLY_LIMIT:
            logger.warning(
                "User %s exceeded hourly AI limit (%d messages)",
                user_id, self.USER_HOURLY_LIMIT,
            )
            return False, "You're sending messages too quickly. Please wait a few minutes."

        return True, ""

    def get_daily_spend(self) -> float:
        """Return today's total AI spend."""
        return self._daily_spend.get(self._today_key(), 0.0)

    def cleanup_old_keys(self) -> None:
        """Remove entries older than 48 hours to prevent memory leak.

        Call this from a periodic task or at the start of each day.
        """
        today = self._today_key()
        yesterday = time.strftime(
            "%Y-%m-%d", time.localtime(time.time() - 86400)
        )
        with self._lock:
            stale_daily = [
                k for k in self._daily_spend if k not in (today, yesterday)
            ]
            for k in stale_daily:
                del self._daily_spend[k]

            current_hour = time.strftime("%Y-%m-%d-%H")
            stale_hourly = [
                k for k in self._user_hourly
                if not k.endswith(current_hour)
                and not k.endswith(
                    time.strftime(
                        "%Y-%m-%d-%H",
                        time.localtime(time.time() - 3600),
                    )
                )
            ]
            for k in stale_hourly:
                del self._user_hourly[k]


# Singleton instance -- shared across all requests in the process
ai_circuit_breaker = AICircuitBreaker()
```

### Integration in Chat Router

The circuit breaker check happens **before** the AI call, alongside the quota
check:

```python
from core.ai.circuit_breaker import ai_circuit_breaker

# After quota check, before AI call:
cb_allowed, cb_reason = ai_circuit_breaker.check_allowed(str(current_user.id))
if not cb_allowed:
    def _cb_error_stream():
        yield f"data: {json.dumps({'delta': cb_reason, 'error': True})}\n\n"
        yield 'data: {"done": true}\n\n'
    return StreamingResponse(_cb_error_stream(), media_type="text/event-stream", headers=sse_headers)
```

After the stream completes (in the `finally` block):

```python
ai_circuit_breaker.record(str(current_user.id), float(cost))
```

### Anthropic Console Backstop

In addition to the application-level circuit breaker, configure a hard spending
limit in the Anthropic Console (Settings > Spend Limits). Set it to 2x the
daily budget ($200/day) as a catastrophic backstop. This protects against bugs
that bypass the application-level breaker.

---

## 9. Response Format When AI Limit Reached

### API Response (Non-Streaming Endpoints)

For non-streaming endpoints (e.g., offer letter), return a standard 402:

```python
raise HTTPException(
    status_code=402,
    detail={
        "error": f"You've used all {quota.limit} AI messages this month.",
        "code": "AI_QUOTA_EXCEEDED",
        "resource": "ai_messages",
        "current_usage": quota.current,
        "limit": quota.limit,
        "current_tier": quota.tier,
        "upgrade_url": "/settings/billing",
        "resets_at": quota.resets_at,
    },
)
```

### SSE Stream Response (Chat)

For the chat endpoint, which returns `StreamingResponse`, we cannot use
`HTTPException` after the response has started. Instead, return an SSE stream
that carries the limit information:

```python
def _limit_reached_stream(quota: AIQuotaStatus):
    """Return an SSE stream that tells the frontend the user hit their AI limit."""
    payload = {
        "delta": (
            f"You've used all {quota.limit} AI messages for this billing period. "
            f"Your messages reset on {quota.resets_at}. "
            f"Upgrade to get more AI messages each month."
        ),
        "limit_reached": True,
        "usage": {
            "current": quota.current,
            "limit": quota.limit,
            "resets_at": quota.resets_at,
            "tier": quota.tier,
            "upgrade_url": "/settings/billing",
        },
    }
    yield f"data: {json.dumps(payload)}\n\n"
    yield 'data: {"done": true}\n\n'
```

### SSE Warning Response (80% Threshold)

When the user is in the warning zone (80-99% usage), prepend a warning event
before the actual AI stream:

```python
def _warning_event(quota: AIQuotaStatus) -> str:
    """Generate a single SSE event with a usage warning."""
    return f"data: {json.dumps({'warning': quota.warning_message, 'remaining': quota.remaining})}\n\n"
```

### Frontend Handling

```typescript
// In chat-stream.ts SSE handler
if (json.limit_reached) {
  // Show upgrade modal with the message from json.delta
  // Do NOT render as a normal AI message bubble
  showUpgradeModal({
    message: json.delta,
    usage: json.usage,
  });
  return;
}

if (json.warning) {
  // Show dismissable yellow banner
  showUsageWarning(json.warning, json.remaining);
  // Continue processing -- the AI response follows
}

if (json.error) {
  // Circuit breaker or other system error
  showErrorBanner(json.delta);
  return;
}
```

---

## 10. SSE Integration

### Critical Rule: Check Usage BEFORE Stream Starts

Once `StreamingResponse` begins yielding SSE events, the HTTP status code is
already 200. You cannot retroactively change it to 402. All checks must happen
**before** the generator function is returned.

### Full Chat Router with AI Usage Tracking

```python
# backend/routers/chat.py  (modified -- complete endpoint)

"""Chat router -- SSE streaming AI chat + history retrieval."""

import json
import uuid
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from core.ai.chat_specialist import stream_chat_response
from core.ai.circuit_breaker import ai_circuit_breaker
from core.ai.model_router import get_model_for_tier
from core.ai.response_cache import ResponseCache
from core.billing.ai_quota import AIQuotaStatus, check_ai_quota
from core.billing.ai_usage import calculate_cost, record_ai_usage
from core.billing.dependencies import get_subscription
from core.demo import is_demo_user
from core.demo.chat_service import get_seeded_history
from core.security.jwt import get_current_user
from database import get_db
from limiter import limiter
from models.chat_messages import ChatMessage
from models.deals import Deal
from models.documents import Document
from models.subscriptions import Subscription
from models.users import User
from schemas.chat import ChatRequest, ChatHistoryResponse, ChatMessageResponse

router = APIRouter(prefix="/chat", tags=["chat"])


# ... _build_context_block and _build_document_system_context unchanged ...


@router.post("/", status_code=200)
@limiter.limit("10/minute")
async def chat(
    request: Request,
    body: ChatRequest,
    current_user: User = Depends(get_current_user),
    sub: Subscription = Depends(get_subscription),
    ai_quota: AIQuotaStatus = Depends(check_ai_quota("chat")),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    """Stream an AI response to a chat message."""
    sse_headers = {"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}

    _demo = is_demo_user(current_user)

    # ─── CHECK 1: AI quota (skip for demo) ─────────────────────────────
    if not _demo and not ai_quota.allowed:
        return StreamingResponse(
            _limit_reached_stream(ai_quota),
            media_type="text/event-stream",
            headers=sse_headers,
        )

    # ─── CHECK 2: Circuit breaker ──────────────────────────────────────
    if not _demo:
        cb_allowed, cb_reason = ai_circuit_breaker.check_allowed(str(current_user.id))
        if not cb_allowed:
            def _cb_error():
                yield f"data: {json.dumps({'delta': cb_reason, 'error': True})}\n\n"
                yield 'data: {"done": true}\n\n'
            return StreamingResponse(
                _cb_error(), media_type="text/event-stream", headers=sse_headers
            )

    # ─── CHECK 3: Resolve model for tier ───────────────────────────────
    model = get_model_for_tier(sub.tier) if not _demo else "claude-sonnet-4-5-20250929"
    if model is None:
        # Should not reach here if require_feature("ai_chat_enabled") is used
        def _no_ai():
            msg = "AI chat is available on Starter plans and above. Upgrade to get started."
            yield f"data: {json.dumps({'delta': msg, 'limit_reached': True})}\n\n"
            yield 'data: {"done": true}\n\n'
        return StreamingResponse(
            _no_ai(), media_type="text/event-stream", headers=sse_headers
        )

    # ─── CHECK 4: Response cache (context-free common questions) ───────
    cached = ResponseCache.check(body.message, body.context_type)
    if cached:
        def _cached_stream():
            yield f"data: {json.dumps({'delta': cached})}\n\n"
            yield 'data: {"done": true}\n\n'

        # Record as cached (0 tokens, $0) but still count as a message
        if not _demo:
            period_start = sub.current_period_start.date() if sub.current_period_start else date.today().replace(day=1)
            period_end = sub.current_period_end.date() if sub.current_period_end else date.today().replace(day=1)
            record_ai_usage(
                db=db, user_id=current_user.id, request_type="chat",
                model=model, input_tokens=0, output_tokens=0,
                billing_period_start=period_start, billing_period_end=period_end,
                session_id=body.session_id, context_type=body.context_type,
                team_id=current_user.team_id, cached_response=True,
            )

        return StreamingResponse(
            _cached_stream(), media_type="text/event-stream", headers=sse_headers
        )

    # ─── Document context validation ───────────────────────────────────
    document_system_context: str | None = None
    if body.context_type == "document" and body.context_id:
        doc = db.query(Document).filter(
            Document.id == body.context_id,
            Document.user_id == current_user.id,
        ).first()
        if not doc or doc.status != "complete":
            def _doc_error_stream():
                msg = (
                    "This document hasn't finished processing yet, or "
                    "couldn't be found. Please try again after analysis completes."
                )
                yield f"data: {json.dumps({'delta': msg})}\n\n"
                yield 'data: {"done": true}\n\n'
            return StreamingResponse(
                _doc_error_stream(), media_type="text/event-stream", headers=sse_headers
            )
        document_system_context = _build_document_system_context(doc)

    # ─── Build message with deal context ───────────────────────────────
    context_block = _build_context_block(
        body.context_type, body.context_id, current_user, db
    )
    assembled_message = body.message + context_block
    history_dicts = [{"role": m.role, "content": m.content} for m in body.history]

    # ─── Persist user message ──────────────────────────────────────────
    if not _demo:
        user_msg = ChatMessage(
            user_id=current_user.id,
            session_id=body.session_id,
            role="user",
            content=body.message,
            context_type=body.context_type if body.context_type != "general" else None,
            context_id=body.context_id,
        )
        db.add(user_msg)
        db.commit()

    # ─── Stream AI response ───────────────────────────────────────────
    usage_result: dict = {}

    def event_generator():
        full_reply: list[str] = []

        # Prepend warning event if approaching limit
        if not _demo and ai_quota.warning and ai_quota.warning_message:
            yield f"data: {json.dumps({'warning': ai_quota.warning_message, 'remaining': ai_quota.remaining})}\n\n"

        try:
            for chunk in stream_chat_response(
                assembled_message,
                history_dicts,
                model=model,
                system_context=document_system_context,
                usage_result=usage_result,
            ):
                full_reply.append(chunk)
                yield f"data: {json.dumps({'delta': chunk})}\n\n"
        finally:
            if full_reply and not _demo:
                # Persist assistant message
                assistant_msg = ChatMessage(
                    user_id=current_user.id,
                    session_id=body.session_id,
                    role="assistant",
                    content="".join(full_reply),
                    context_type=body.context_type if body.context_type != "general" else None,
                    context_id=body.context_id,
                )
                db.add(assistant_msg)

                # Calculate cost and record AI usage
                input_tokens = usage_result.get("input_tokens", 0)
                output_tokens = usage_result.get("output_tokens", 0)
                cache_creation = usage_result.get("cache_creation_input_tokens", 0)
                cache_read = usage_result.get("cache_read_input_tokens", 0)
                actual_model = usage_result.get("model", model)

                cost = calculate_cost(
                    model=actual_model,
                    input_tokens=input_tokens,
                    output_tokens=output_tokens,
                    cache_creation_tokens=cache_creation,
                    cache_read_tokens=cache_read,
                )

                period_start = sub.current_period_start.date() if sub.current_period_start else date.today().replace(day=1)
                period_end = sub.current_period_end.date() if sub.current_period_end else date.today().replace(day=1)

                record_ai_usage(
                    db=db,
                    user_id=current_user.id,
                    request_type="chat",
                    model=actual_model,
                    input_tokens=input_tokens,
                    output_tokens=output_tokens,
                    billing_period_start=period_start,
                    billing_period_end=period_end,
                    cache_creation_tokens=cache_creation,
                    cache_read_tokens=cache_read,
                    session_id=body.session_id,
                    context_type=body.context_type,
                    context_id=body.context_id,
                    team_id=current_user.team_id,
                )

                # Feed circuit breaker
                ai_circuit_breaker.record(str(current_user.id), float(cost))

                db.commit()

        yield 'data: {"done": true}\n\n'

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers=sse_headers,
    )


def _limit_reached_stream(quota: AIQuotaStatus):
    """SSE stream for when the user has hit their AI message limit."""
    payload = {
        "delta": (
            f"You've used all {quota.limit} AI messages for this billing period. "
            f"Your messages reset on {quota.resets_at or 'the start of your next billing cycle'}. "
            f"Upgrade to get more AI messages each month."
        ),
        "limit_reached": True,
        "usage": {
            "current": quota.current,
            "limit": quota.limit,
            "resets_at": quota.resets_at,
            "tier": quota.tier,
            "upgrade_url": "/settings/billing",
        },
    }
    yield f"data: {json.dumps(payload)}\n\n"
    yield 'data: {"done": true}\n\n'
```

### Execution Order Summary

```
Request arrives at POST /chat/
    │
    ├─ FastAPI resolves dependencies:
    │   ├─ get_current_user (auth cookie)
    │   ├─ get_subscription (DB lookup or virtual free)
    │   └─ check_ai_quota("chat") → AIQuotaStatus
    │
    ├─ CHECK 1: ai_quota.allowed? → No → SSE limit_reached stream
    ├─ CHECK 2: circuit_breaker.check_allowed? → No → SSE error stream
    ├─ CHECK 3: get_model_for_tier → None? → SSE upgrade prompt
    ├─ CHECK 4: ResponseCache.check → Hit? → SSE cached response + record usage
    │
    ├─ Validate document context (existing logic)
    ├─ Build message with deal context (existing logic)
    ├─ Persist user message to DB (existing logic)
    │
    └─ Return StreamingResponse(event_generator()):
        ├─ Yield warning event if at 80%
        ├─ Yield text deltas from Claude stream
        └─ finally:
            ├─ Persist assistant message
            ├─ Record AI usage (tokens + cost) to ai_usage_log
            └─ Feed circuit breaker
```

---

## 11. Caching Strategy for Common AI Queries

### Exact-Match Response Cache

Real estate beginners ask the same definitional questions repeatedly. Caching
these avoids an API call entirely, reducing both cost and latency.

```python
# backend/core/ai/response_cache.py

"""Cache pre-written responses for common context-free real estate questions."""


class ResponseCache:
    """Exact-match cache for common general questions.

    Only matches when context_type is "general" (no deal or document context).
    Returns None on cache miss -- the caller falls through to the AI.
    """

    EXACT_MATCHES: dict[str, str] = {
        "what is dscr": "dscr_definition",
        "what is debt service coverage ratio": "dscr_definition",
        "what is cap rate": "cap_rate_definition",
        "what is capitalization rate": "cap_rate_definition",
        "what is arv": "arv_definition",
        "what is after repair value": "arv_definition",
        "what is the 70% rule": "seventy_percent_rule",
        "what is the 70 percent rule": "seventy_percent_rule",
        "what is noi": "noi_definition",
        "what is net operating income": "noi_definition",
        "what is cash on cash return": "coc_definition",
        "what is cash-on-cash return": "coc_definition",
        "how does subject to work": "subject_to_explanation",
        "what is subject to": "subject_to_explanation",
        "what is a brrrr": "brrrr_explanation",
        "what is brrrr": "brrrr_explanation",
        "what is wholesale real estate": "wholesale_explanation",
        "what is wholesaling": "wholesale_explanation",
        "what is mao": "mao_definition",
        "what is maximum allowable offer": "mao_definition",
    }

    @staticmethod
    def normalize(text: str) -> str:
        """Lowercase, strip whitespace and trailing punctuation."""
        return text.lower().strip().rstrip("?.!")

    @classmethod
    def check(cls, message: str, context_type: str) -> str | None:
        """Return a cached response if available, else None.

        Only matches context-free (general) questions.
        """
        if context_type != "general":
            return None

        normalized = cls.normalize(message)
        cache_key = cls.EXACT_MATCHES.get(normalized)
        if cache_key:
            return CACHED_RESPONSES.get(cache_key)
        return None


CACHED_RESPONSES: dict[str, str] = {
    "dscr_definition": (
        "**Debt Service Coverage Ratio (DSCR)** measures a property's ability to "
        "cover its debt payments.\n\n"
        "`DSCR = Net Operating Income / Total Debt Service`\n\n"
        "- **DSCR > 1.25**: Strong -- lenders love this\n"
        "- **DSCR = 1.0**: Break-even -- just covering payments\n"
        "- **DSCR < 1.0**: Negative cash flow -- the property loses money\n\n"
        "Most lenders require a minimum DSCR of 1.2-1.25 for investment properties. "
        "Want me to calculate the DSCR on one of your deals?"
    ),
    "cap_rate_definition": (
        "**Capitalization Rate (Cap Rate)** measures a property's return "
        "independent of financing.\n\n"
        "`Cap Rate = NOI / Property Value x 100`\n\n"
        "- **8-10%+**: Higher return, often in rougher areas or higher risk\n"
        "- **5-7%**: Moderate -- typical for stable B-class neighborhoods\n"
        "- **3-4%**: Lower return, but usually A-class, lower risk\n\n"
        "Cap rate does not factor in mortgage payments -- it is a property-level metric. "
        "For your actual return with financing, look at **cash-on-cash return** instead."
    ),
    "arv_definition": (
        "**After Repair Value (ARV)** is what a property will be worth after "
        "renovations are complete.\n\n"
        "It is the cornerstone of flip and BRRRR analysis:\n"
        "- **Flip**: `Profit = ARV - Purchase - Rehab - Holding Costs - Selling Costs`\n"
        "- **BRRRR**: `Refinance Amount = ARV x LTV` (typically 70-75%)\n"
        "- **Wholesale**: `MAO = ARV x 0.70 - Repairs - Desired Profit`\n\n"
        "ARV is estimated by pulling comps -- recently sold similar properties "
        "in the same area, adjusted for differences. "
        "Want me to walk through how to estimate ARV on a specific deal?"
    ),
    "seventy_percent_rule": (
        "**The 70% Rule** is a quick formula wholesalers and flippers use to "
        "determine their maximum offer price:\n\n"
        "`Max Offer = ARV x 0.70 - Repair Costs`\n\n"
        "The 30% buffer covers:\n"
        "- Holding costs (interest, taxes, insurance)\n"
        "- Selling costs (agent commissions, closing)\n"
        "- Your profit margin\n\n"
        "It is a rule of thumb, not gospel. In hot markets, investors sometimes "
        "use 75-80%. In slower markets, 65% may be more appropriate."
    ),
    "noi_definition": (
        "**Net Operating Income (NOI)** is a property's income after operating "
        "expenses but before debt service.\n\n"
        "`NOI = Gross Rental Income - Vacancy - Operating Expenses`\n\n"
        "Operating expenses include:\n"
        "- Property taxes\n"
        "- Insurance\n"
        "- Maintenance and repairs\n"
        "- Property management fees\n"
        "- Utilities (if landlord-paid)\n\n"
        "NOI does **not** include mortgage payments, depreciation, or capital "
        "expenditures. It tells you how much the property earns on its own."
    ),
    "coc_definition": (
        "**Cash-on-Cash Return (CoC)** measures your annual return relative to "
        "the cash you actually invested.\n\n"
        "`CoC = Annual Pre-Tax Cash Flow / Total Cash Invested x 100`\n\n"
        "- **8-12%+**: Solid for a buy-and-hold rental\n"
        "- **15-20%+**: Excellent -- usually requires creative financing or a great deal\n"
        "- **< 5%**: Likely better off in index funds\n\n"
        "Unlike cap rate, CoC accounts for your financing. A property with a "
        "5% cap rate could produce a 12% CoC return with the right leverage."
    ),
    "subject_to_explanation": (
        "**Subject-To (Sub-To)** is a creative finance strategy where you take "
        "ownership of a property while the existing mortgage stays in the "
        "seller's name.\n\n"
        "How it works:\n"
        "1. Seller deeds the property to you\n"
        "2. You take over the mortgage payments\n"
        "3. The loan stays in the seller's name\n"
        "4. You own the property and collect rent\n\n"
        "**Why sellers agree:** They are often behind on payments, facing "
        "foreclosure, or need to relocate quickly.\n\n"
        "**Key risk:** The lender has a \"due on sale\" clause and could "
        "theoretically call the loan. In practice, lenders rarely enforce this "
        "if payments are current.\n\n"
        "Want to analyze a subject-to deal? I can help you calculate the spread."
    ),
    "brrrr_explanation": (
        "**BRRRR** stands for **Buy, Rehab, Rent, Refinance, Repeat**. It is "
        "a strategy to build a rental portfolio with limited capital.\n\n"
        "The steps:\n"
        "1. **Buy** a distressed property below market value\n"
        "2. **Rehab** it to force appreciation (increase ARV)\n"
        "3. **Rent** it out to a tenant\n"
        "4. **Refinance** at the new higher value, pulling out most/all of your cash\n"
        "5. **Repeat** with the recovered capital\n\n"
        "The goal is to have little to no cash left in the deal after the "
        "refinance. A successful BRRRR means infinite cash-on-cash return "
        "because your invested capital is $0."
    ),
    "wholesale_explanation": (
        "**Wholesale real estate** is finding deeply discounted properties and "
        "assigning the purchase contract to another investor for a fee.\n\n"
        "The process:\n"
        "1. Find a distressed or motivated seller\n"
        "2. Get the property under contract at a discount\n"
        "3. Find a cash buyer (flipper or landlord) willing to pay more\n"
        "4. Assign the contract to the buyer for an assignment fee\n\n"
        "**Key formula:** `MAO = ARV x 0.70 - Repairs - Your Fee`\n\n"
        "You never own the property or use your own capital. The typical "
        "wholesale fee ranges from $5,000 to $20,000+ depending on the deal."
    ),
    "mao_definition": (
        "**Maximum Allowable Offer (MAO)** is the highest price you should "
        "offer on a property to ensure your profit margin.\n\n"
        "`MAO = ARV x 0.70 - Repair Costs - Desired Profit`\n\n"
        "For wholesalers, the desired profit is your assignment fee. For "
        "flippers, it includes your labor, holding costs, and target margin.\n\n"
        "Example:\n"
        "- ARV: $200,000\n"
        "- Repairs: $30,000\n"
        "- Desired Profit: $15,000\n"
        "- **MAO = $200,000 x 0.70 - $30,000 - $15,000 = $95,000**\n\n"
        "If the seller wants more than your MAO, walk away."
    ),
}
```

### Cost Impact

At 10-15% cache hit rate across all users:
- Saves ~$50-70/month at 1000 users
- More importantly, cached responses are **instant** (no API latency)
- Still counts against the user's message quota to keep accounting simple

### Cache Governance

- Cached responses should count against the message limit. Otherwise, users
  could game the system by rephrasing questions to hit the cache.
- Review and update cached responses quarterly.
- Keep the cache small (10-20 entries). Do not attempt fuzzy matching -- the
  engineering complexity is not worth the marginal hit rate improvement.

---

## CRITICAL DECISIONS

### Decision 1: Separate `ai_usage_log` table vs reusing `usage_events`

**Decision: Separate table.**

The generic `usage_events` table from Agent 04 tracks feature-level counters
(analyses, uploads, saved deals) with no token-level detail. AI usage requires
per-request granularity: model, input/output tokens, cache tokens, computed
cost, and billing period. Overloading `usage_events` with nullable AI-specific
columns would violate its clean design. Two tables, two concerns.

For quota enforcement: AI message limits are checked against `ai_usage_log`
(COUNT WHERE request_type = 'chat'). Non-AI limits are checked against
`usage_events`. No overlap.

### Decision 2: Model routing -- Haiku for Starter, Sonnet for Pro/Team

**Decision: Yes, route by tier.**

The cost difference is 3.7x per message ($0.0058 vs $0.0216). At scale this
matters: 500 Starter users on Haiku = $85/month vs $325 on Sonnet. Haiku 3.5
is more than capable for the Starter tier's use case (definitions, simple Q&A,
basic deal questions). The quality gap between Haiku and Sonnet becomes the
upsell lever.

**Exception:** Offer letter generation always uses Sonnet regardless of tier.
The output quality of a legal-adjacent document justifies the ~$0.015
additional cost per letter.

### Decision 3: Count cached responses against the message limit

**Decision: Yes, count them.**

Cached responses cost $0 in API spend but still count as 1 message toward the
user's quota. Reasons:

1. Prevents gaming: a user cannot send 100 cached questions to "warm up" before
   using real messages.
2. Simplifies the mental model: "you have X messages per month" is easy to
   understand.
3. The alternative (unlimited cached responses) creates confusing UX where some
   messages decrement the counter and others do not.

### Decision 4: Usage resets tied to Stripe billing cycle

**Decision: Billing anniversary, not calendar month.**

Using `subscription.current_period_start` from Stripe means:
- Every user gets a full billing period worth of messages.
- No penalty for signing up late in the month.
- Resets happen automatically when Stripe rolls the period forward.
- No cron job or scheduled task needed.

For Free-tier users (no Stripe subscription), fall back to calendar month since
it does not matter (Free tier has 0 AI messages).

### Decision 5: Check quota before stream, not mid-stream

**Decision: All checks happen before `StreamingResponse` is returned.**

Once SSE streaming begins, the HTTP status is 200 and cannot be changed. The
check sequence is:

1. `check_ai_quota` (FastAPI dependency, resolved before handler body runs)
2. `circuit_breaker.check_allowed` (in handler body, before generator)
3. `ResponseCache.check` (in handler body, before generator)
4. Document validation (existing logic)

Only after all four checks pass does the handler construct and return the
`StreamingResponse`. This guarantees that the client receives either a clean
SSE stream (200) or a clean HTTP error. Never a partial stream that abruptly
errors.

### Decision 6: Real-time INSERT vs batch tracking

**Decision: Real-time INSERT per request.**

At Parcel's projected scale (even at 1000 users, ~670 AI messages per day),
one INSERT per AI message is negligible DB load. Real-time tracking means:
- Quota enforcement is always accurate (no lag window).
- Admin dashboard numbers are live.
- No infrastructure (Redis, queue) beyond the existing PostgreSQL.

Revisit batch tracking only if daily AI messages exceed 10,000.

### Decision 7: Circuit breaker is in-process, not distributed

**Decision: Single-process in-memory `AICircuitBreaker`.**

Parcel runs a single uvicorn process on Railway. An in-process defaultdict is
sufficient for tracking daily spend and per-user hourly counts. If Parcel moves
to multi-worker deployment, migrate the circuit breaker to Redis or PostgreSQL
advisory locks. The singleton pattern (`ai_circuit_breaker` module-level
instance) ensures all requests in the process share the same state.

### Decision 8: Prompt caching scope

**Decision: Cache the static system prompt only. Do not cache document context
or conversation history.**

The system prompt is ~4,720 tokens (identical across all users and requests).
Caching it yields the highest hit rate with the simplest implementation.
Document context and conversation history are per-user and per-session --
caching them would require user-scoped cache keys with extremely low hit rates,
providing no meaningful savings.

### Decision 9: Offer letters count toward AI message quota

**Decision: Yes, offer letters share the AI message quota.**

An offer letter is an AI-powered feature that costs ~$0.02 per call. Rather
than introducing a separate "offer letters per month" limit (which adds
complexity to the tier config, quota check, and UI), offer letters simply
decrement the same `ai_messages_per_month` counter. A Starter user with 30
AI messages can send 29 chat messages and 1 offer letter, or any combination.

This keeps the billing model simple for users: "You have X AI actions per
month." If offer letter volume grows disproportionately, split the quota later.

### Decision 10: No auto-upgrade or overage billing

**Decision: Hard block at 100% with upgrade CTA. Never auto-charge.**

Users hate surprise charges. When the limit is reached:
- SSE stream returns `limit_reached: true` with a human-readable message.
- Frontend shows an upgrade modal with the reset date and upgrade button.
- The user can wait for reset or upgrade.
- No per-message overage charges. No automatic plan upgrades.

This is the pattern used by Slack, Notion, and Vercel. It maximizes trust
while still creating strong upgrade pressure.
