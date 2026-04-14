# AI Cost Management & Metering for Parcel

> Research compiled 2026-03-28 | Anthropic Claude API | FastAPI + PostgreSQL backend

---

## Table of Contents

1. [Token Counting via Anthropic API](#1-token-counting-via-anthropic-api)
2. [Cost Attribution per User per Billing Period](#2-cost-attribution-per-user-per-billing-period)
3. [Model Routing by Tier](#3-model-routing-by-tier)
4. [Prompt Caching Strategy](#4-prompt-caching-strategy)
5. [Soft Limits vs Hard Limits](#5-soft-limits-vs-hard-limits)
6. [AI Usage Admin Dashboard](#6-ai-usage-admin-dashboard)
7. [Cost Projections at Scale](#7-cost-projections-at-scale)
8. [Streaming Token Tracking (SSE)](#8-streaming-token-tracking-sse)
9. [Fallback Strategies for Cost Spikes](#9-fallback-strategies-for-cost-spikes)
10. [Usage Reset Timing](#10-usage-reset-timing)
11. [Overage Handling](#11-overage-handling)
12. [Response Caching for Common Questions](#12-response-caching-for-common-questions)
13. [Batch vs Real-Time Cost Tracking](#13-batch-vs-real-time-cost-tracking)
14. [Recommendations for Parcel](#recommendations-for-parcel)

---

## 1. Token Counting via Anthropic API

### How the Anthropic API Reports Token Usage

Every Anthropic Messages API response includes a `usage` object with exact token counts. This is available in both synchronous and streaming modes.

**Synchronous (non-streaming) response:**

```python
response = anthropic_client.messages.create(
    model="claude-sonnet-4-5-20250929",
    max_tokens=1024,
    system="You are a real estate investment specialist...",
    messages=[{"role": "user", "content": "What is DSCR?"}],
)

# response.usage contains:
# - input_tokens: total input tokens (system + messages)
# - output_tokens: tokens generated in the response
# - cache_creation_input_tokens: tokens written to cache (if caching enabled)
# - cache_read_input_tokens: tokens read from cache (if caching enabled)

print(f"Input: {response.usage.input_tokens}")
print(f"Output: {response.usage.output_tokens}")
```

**Pre-request token estimation (without making a call):**

```python
token_count = anthropic_client.messages.count_tokens(
    model="claude-sonnet-4-5-20250929",
    system="You are a real estate investment specialist...",
    messages=[
        {"role": "user", "content": "Analyze this deal..."},
        {"role": "assistant", "content": "Based on the numbers..."},
        {"role": "user", "content": "What about the cap rate?"},
    ],
)
print(f"Estimated input tokens: {token_count.input_tokens}")
```

This `count_tokens` method is critical for Parcel: it lets us estimate cost **before** making the API call, enabling pre-request budget checks.

### Token Counting in Parcel's Current Architecture

Parcel currently uses `stream_chat_response()` in `backend/core/ai/chat_specialist.py`, which calls `anthropic_client.messages.stream()`. The current implementation yields text deltas but **does not capture or store token usage**. This is the single biggest gap.

---

## 2. Cost Attribution per User per Billing Period

### Database Schema for AI Usage Tracking

Parcel needs a new table to record per-request AI usage:

```sql
CREATE TABLE ai_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    team_id UUID REFERENCES teams(id),          -- nullable, for team-shared pools
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Request metadata
    session_id VARCHAR NOT NULL,                 -- chat session
    context_type VARCHAR,                        -- 'general', 'deal', 'document'
    context_id UUID,                             -- deal or document FK
    model VARCHAR NOT NULL,                      -- 'claude-sonnet-4-5-20250929', etc.

    -- Token counts (from API response)
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    cache_creation_tokens INTEGER DEFAULT 0,
    cache_read_tokens INTEGER DEFAULT 0,

    -- Computed cost in USD (micro-cents for precision)
    cost_usd NUMERIC(10, 6) NOT NULL,

    -- Billing period reference
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL
);

CREATE INDEX idx_ai_usage_user_period ON ai_usage_log(user_id, billing_period_start);
CREATE INDEX idx_ai_usage_team_period ON ai_usage_log(team_id, billing_period_start);
```

### Cost Calculation Function

```python
# backend/core/ai/cost.py

from decimal import Decimal

# Prices per million tokens (as of March 2026)
MODEL_PRICING = {
    "claude-opus-4-5-20250929": {
        "input": Decimal("5.00"),
        "output": Decimal("25.00"),
        "cache_write": Decimal("6.25"),    # 1.25x input
        "cache_read": Decimal("0.50"),     # 0.10x input
    },
    "claude-sonnet-4-5-20250929": {
        "input": Decimal("3.00"),
        "output": Decimal("15.00"),
        "cache_write": Decimal("3.75"),    # 1.25x input
        "cache_read": Decimal("0.30"),     # 0.10x input
    },
    "claude-haiku-3-5-20241022": {
        "input": Decimal("0.80"),
        "output": Decimal("4.00"),
        "cache_write": Decimal("1.00"),
        "cache_read": Decimal("0.08"),
    },
}

def calculate_cost(
    model: str,
    input_tokens: int,
    output_tokens: int,
    cache_creation_tokens: int = 0,
    cache_read_tokens: int = 0,
) -> Decimal:
    """Calculate USD cost from token counts. Returns cost in dollars."""
    pricing = MODEL_PRICING.get(model)
    if not pricing:
        raise ValueError(f"Unknown model: {model}")

    per_m = Decimal("1000000")

    # Standard input tokens = total input - cache_read (cache reads are cheaper)
    standard_input = max(0, input_tokens - cache_read_tokens)

    cost = (
        (Decimal(standard_input) / per_m) * pricing["input"]
        + (Decimal(output_tokens) / per_m) * pricing["output"]
        + (Decimal(cache_creation_tokens) / per_m) * pricing["cache_write"]
        + (Decimal(cache_read_tokens) / per_m) * pricing["cache_read"]
    )
    return cost.quantize(Decimal("0.000001"))
```

### Per-User Spend Query

```python
def get_user_spend(db: Session, user_id: UUID, period_start: date) -> dict:
    """Get total AI spend and message count for a user in a billing period."""
    result = db.execute(text("""
        SELECT
            COUNT(*) as message_count,
            COALESCE(SUM(cost_usd), 0) as total_cost,
            COALESCE(SUM(input_tokens), 0) as total_input,
            COALESCE(SUM(output_tokens), 0) as total_output
        FROM ai_usage_log
        WHERE user_id = :uid AND billing_period_start = :start
    """), {"uid": user_id, "start": period_start}).first()

    return {
        "message_count": result.message_count,
        "total_cost_usd": float(result.total_cost),
        "total_input_tokens": result.total_input,
        "total_output_tokens": result.total_output,
    }
```

---

## 3. Model Routing by Tier

### Strategy

Different tiers get different models to balance cost and quality:

| Tier    | Model                         | Input $/M | Output $/M | Rationale                              |
|---------|-------------------------------|-----------|------------|----------------------------------------|
| Free    | Blocked (no AI)               | --        | --         | Upsell incentive                       |
| Starter | Claude Haiku 3.5              | $0.80     | $4.00      | Fast, cheap, good for simple Q&A       |
| Pro     | Claude Sonnet 4.5             | $3.00     | $15.00     | Best balance of quality and cost        |
| Team    | Claude Sonnet 4.5             | $3.00     | $15.00     | Same quality, shared pool              |

**Why not Opus for Pro?** Opus 4.5 costs $5/$25 per million tokens -- 67% more expensive on input and 67% more on output vs Sonnet. For a real estate chat assistant, Sonnet 4.5 produces equivalent quality answers. The system prompt constrains the domain tightly enough that Opus's extra reasoning capability provides minimal uplift. Reserve Opus for special features (e.g., a "deep analysis" button that explicitly runs a one-shot Opus call for complex multi-deal comparison).

### Implementation

```python
# backend/core/ai/model_router.py

from models.users import User

TIER_MODEL_MAP = {
    "free": None,                           # blocked
    "starter": "claude-haiku-3-5-20241022",
    "pro": "claude-sonnet-4-5-20250929",
    "team": "claude-sonnet-4-5-20250929",
}

def get_model_for_user(user: User) -> str | None:
    """Return the Claude model ID for a user's subscription tier.

    Returns None if the tier has no AI access (Free).
    """
    return TIER_MODEL_MAP.get(user.subscription_tier, None)
```

Usage in the chat router:

```python
model = get_model_for_user(current_user)
if model is None:
    # Return SSE error: "Upgrade to Starter for AI chat access"
    ...
```

### Cost Impact of Model Routing

For a typical Parcel chat message (assume ~5,200 input tokens with system prompt + history, ~400 output tokens):

| Model       | Input Cost | Output Cost | Total/Message |
|-------------|-----------|------------|---------------|
| Haiku 3.5   | $0.0042   | $0.0016    | **$0.0058**   |
| Sonnet 4.5  | $0.0156   | $0.0060    | **$0.0216**   |
| Opus 4.5    | $0.0260   | $0.0100    | **$0.0360**   |

Per user per month (at limit):

| Tier    | Messages | Model   | Monthly AI Cost |
|---------|----------|---------|-----------------|
| Starter | 30       | Haiku   | **$0.17**       |
| Pro     | 150      | Sonnet  | **$3.24**       |
| Team    | 500      | Sonnet  | **$10.80**      |

---

## 4. Prompt Caching Strategy

### Why This Matters for Parcel

Parcel's system prompt is ~4,720 tokens, sent with **every single message**. Without caching, a Pro user sending 150 messages/month pays for 150 x 4,720 = 708,000 system prompt tokens every month -- just for the system prompt alone. With Sonnet that is $2.12/user/month wasted on the same static text.

### How Anthropic Prompt Caching Works

- Mark content blocks with `"cache_control": {"type": "ephemeral"}`
- The cache has a 5-minute TTL by default (extended TTL available via beta header: 1 hour)
- Cache is scoped to the same organization + exact prefix match
- The prefix includes tools, system, then messages -- in that order
- Cache **write** costs 1.25x the base input token price
- Cache **read** (hit) costs 0.10x the base input token price
- Minimum cacheable prefix: 1,024 tokens for Haiku, 2,048 for Sonnet/Opus

### Implementation for Parcel

The system prompt is the ideal caching candidate: it is static (identical across all users), large (~4,720 tokens -- well above the 2,048 minimum), and sent with every request.

```python
def stream_chat_response(
    message: str,
    history: list[dict],
    model: str = "claude-sonnet-4-5-20250929",
    system_context: str | None = None,
) -> Iterator[str]:
    """Yield text delta strings from Claude streaming response with caching."""

    # Build the system prompt as a list of content blocks for cache control
    system_blocks = [
        {
            "type": "text",
            "text": SYSTEM_PROMPT,
            "cache_control": {"type": "ephemeral"},  # Cache the static system prompt
        }
    ]

    # If document context exists, append as a separate (non-cached) block
    if system_context:
        system_blocks.append({
            "type": "text",
            "text": system_context,
        })

    messages = history + [{"role": "user", "content": message}]

    with anthropic_client.messages.stream(
        model=model,
        max_tokens=1024,
        system=system_blocks,
        messages=messages,
    ) as stream:
        for text in stream.text_stream:
            yield text
```

### Caching Cost Savings

Assume a user sends messages in bursts (3-5 within 5 minutes, then idle). With a 5-minute TTL:

- **First message in burst:** Cache write = 4,720 tokens x 1.25x rate = 5,900 effective tokens billed
- **Subsequent messages in burst:** Cache read = 4,720 tokens x 0.10x rate = 472 effective tokens billed
- **Savings per cached hit:** 4,720 - 472 = 4,248 tokens saved (90% reduction on system prompt)

For a Pro user with 150 messages/month, assuming ~60% cache hit rate (bursts of conversation):

| Scenario      | System Prompt Token Cost (Sonnet) | Monthly Cost |
|---------------|----------------------------------|-------------|
| No caching    | 150 x 4,720 x $3/M              | $2.12       |
| With caching  | 60 x 5,900 + 90 x 472 x $3/M   | $1.19       |
| **Savings**   |                                  | **$0.93/user/mo (44%)** |

With the extended 1-hour TTL (beta header), hit rates could reach 80%+, pushing savings higher.

---

## 5. Soft Limits vs Hard Limits

### What Happens When a Starter User Hits 30 Messages?

This is a critical UX decision. There are three approaches:

**Option A: Hard Block (Recommended for Parcel)**

```python
# In chat router, before calling the AI
usage = get_user_message_count(db, current_user.id, current_period_start)
tier_limit = TIER_LIMITS[current_user.subscription_tier]  # {"starter": 30, "pro": 150, ...}

if usage >= tier_limit:
    def _limit_error_stream():
        msg = (
            f"You've used all {tier_limit} AI messages this month. "
            f"Your messages reset on {next_reset_date}. "
            f"Upgrade to Pro for {TIER_LIMITS['pro']} messages/month."
        )
        yield f"data: {json.dumps({'delta': msg, 'limit_reached': True})}\n\n"
        yield 'data: {"done": true}\n\n'
    return StreamingResponse(_limit_error_stream(), ...)
```

**Option B: Soft Limit with Warning Zone**

Show a warning when approaching the limit (e.g., at 80%), then hard block at limit.

```python
if usage >= tier_limit:
    # Hard block
    ...
elif usage >= int(tier_limit * 0.8):
    # Inject warning into SSE stream before AI response
    remaining = tier_limit - usage
    warning = f"data: {json.dumps({'warning': f'{remaining} AI messages remaining this month.'})}\n\n"
    # Continue to AI call, prepend warning to stream
```

**Option C: Soft Limit with Degradation**

When limit is hit, downgrade the model instead of blocking. E.g., Pro users who exhaust Sonnet get switched to Haiku for the rest of the month. This is complex and confusing -- not recommended.

### Recommended Approach for Parcel

Use **Option B** (soft limit with warning zone):

- At 80% usage: show a dismissable banner in the chat UI ("You have 6 AI messages remaining")
- At 100%: hard block with upgrade CTA
- Frontend receives `limit_reached: true` and `warning` fields in SSE events to render these states

---

## 6. AI Usage Admin Dashboard

### What to Track

An internal admin dashboard (not user-facing initially) should surface:

1. **Real-time metrics:**
   - Total AI API spend today/this week/this month
   - Active AI users (users who sent at least 1 AI message today)
   - Average cost per message (by model)
   - Cache hit rate

2. **Per-user drill-down:**
   - Messages sent vs. tier limit
   - Total tokens consumed (input + output)
   - Total cost attributed
   - Heaviest sessions (by token count)

3. **Alerts:**
   - Daily spend exceeds threshold (e.g., >$50/day)
   - Single user consuming anomalous volume
   - Cache hit rate drops below 40%

### SQL Queries for the Admin Dashboard

```sql
-- Daily spend by model
SELECT
    DATE(created_at) as day,
    model,
    COUNT(*) as messages,
    SUM(input_tokens) as total_input,
    SUM(output_tokens) as total_output,
    SUM(cost_usd) as total_cost
FROM ai_usage_log
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at), model
ORDER BY day DESC, model;

-- Top 10 users by spend this month
SELECT
    u.email,
    u.subscription_tier,
    COUNT(*) as messages,
    SUM(a.cost_usd) as total_cost,
    SUM(a.input_tokens + a.output_tokens) as total_tokens
FROM ai_usage_log a
JOIN users u ON u.id = a.user_id
WHERE a.billing_period_start = :current_period
GROUP BY u.email, u.subscription_tier
ORDER BY total_cost DESC
LIMIT 10;

-- Cache hit rate over time
SELECT
    DATE(created_at) as day,
    SUM(cache_read_tokens)::float /
        NULLIF(SUM(cache_read_tokens + cache_creation_tokens + input_tokens), 0) as cache_hit_rate
FROM ai_usage_log
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY day;
```

### User-Facing Usage Display

Expose a lightweight usage summary to the user in Settings or the chat panel:

```json
GET /api/v1/ai/usage

{
  "messages_used": 23,
  "messages_limit": 30,
  "percent_used": 76.7,
  "resets_at": "2026-05-01T00:00:00Z",
  "tier": "starter"
}
```

---

## 7. Cost Projections at Scale

### Assumptions

- Starter: 30 msg limit, Haiku ($0.0058/msg)
- Pro: 150 msg limit, Sonnet ($0.0216/msg)
- Team: 500 msg shared, Sonnet ($0.0216/msg)
- Offer letter generation: ~1 per 5 deals analyzed, Sonnet, ~$0.02/letter
- Average utilization: 60% of limit (users don't always exhaust their quota)
- Prompt caching: 50% hit rate (conservative)
- With caching, effective cost per message drops ~30% (blended across writes + reads)

### Tier Mix Assumptions

| Scale     | Free | Starter | Pro | Team (5 seats avg) |
|-----------|------|---------|-----|--------------------|
| 100 users | 50   | 30      | 15  | 1 (5 users)        |
| 500 users | 250  | 150     | 75  | 5 (25 users)       |
| 1000 users| 500  | 300     | 150 | 10 (50 users)      |

### Monthly AI Cost Projections

**Without prompt caching:**

| Scale       | Starter Cost | Pro Cost  | Team Cost | Offer Letters | **Total/mo** |
|-------------|-------------|-----------|-----------|---------------|-------------|
| 100 users   | 30 x 18 x $0.0058 = $3.13 | 15 x 90 x $0.0216 = $29.16 | 5 x 300 x $0.0216 = $32.40 | 20 x $0.02 = $0.40 | **$65.09** |
| 500 users   | 150 x 18 x $0.0058 = $15.66 | 75 x 90 x $0.0216 = $145.80 | 25 x 300 x $0.0216 = $162.00 | 100 x $0.02 = $2.00 | **$325.46** |
| 1000 users  | 300 x 18 x $0.0058 = $31.32 | 150 x 90 x $0.0216 = $291.60 | 50 x 300 x $0.0216 = $324.00 | 200 x $0.02 = $4.00 | **$650.92** |

**With prompt caching (30% effective reduction):**

| Scale       | Total/mo (cached) | Savings  |
|-------------|-------------------|----------|
| 100 users   | **$47.26**        | $17.83   |
| 500 users   | **$236.32**       | $89.14   |
| 1000 users  | **$472.64**       | $178.28  |

**With model routing (Haiku for Starter) + caching:**

| Scale       | Monthly AI Cost | AI Cost per Paying User | Margin Note |
|-------------|-----------------|------------------------|-------------|
| 100 users   | **$47**         | $1.02                  | Very healthy at any price point >$5/mo |
| 500 users   | **$236**        | $0.94                  | Scales linearly, no surprises          |
| 1000 users  | **$473**        | $0.95                  | Well under $1/paying user              |

### Revenue vs. AI Cost Comparison

Assuming Starter = $19/mo, Pro = $49/mo, Team = $99/mo per seat:

| Scale | Monthly Revenue | Monthly AI Cost | AI as % of Revenue |
|-------|----------------|-----------------|-------------------|
| 100   | $1,065         | $47             | **4.4%**          |
| 500   | $5,325         | $236            | **4.4%**          |
| 1000  | $10,650        | $473            | **4.4%**          |

**AI costs are extremely manageable at ~4.4% of revenue.** This is well within healthy SaaS margins.

---

## 8. Streaming Token Tracking (SSE)

### The Problem

Parcel uses SSE streaming (`messages.stream()`). During the stream, individual text deltas arrive but token counts are not available until the stream completes. The Anthropic API reports tokens in two specific SSE events:

1. **`message_start` event:** Contains `usage.input_tokens` (the exact input token count) and `usage.output_tokens` initialized to 0.
2. **`message_delta` event (final):** Contains `usage.output_tokens` with the final output token count.

### How to Capture Tokens from a Stream

The Python SDK's `MessageStream` accumulates the final message. Access it after the stream closes:

```python
def stream_chat_response_with_tracking(
    message: str,
    history: list[dict],
    model: str,
    system_context: str | None = None,
) -> tuple[Iterator[str], dict]:
    """Stream response and return usage metadata after completion.

    Returns a generator for text deltas. The usage dict is populated
    after the generator is fully consumed.
    """
    usage_result = {}

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

    def _generate():
        with anthropic_client.messages.stream(
            model=model,
            max_tokens=1024,
            system=system_blocks,
            messages=messages,
        ) as stream:
            for text in stream.text_stream:
                yield text

            # After stream completes, get the final message with usage
            final_message = stream.get_final_message()
            usage_result["input_tokens"] = final_message.usage.input_tokens
            usage_result["output_tokens"] = final_message.usage.output_tokens
            usage_result["cache_creation_input_tokens"] = getattr(
                final_message.usage, "cache_creation_input_tokens", 0
            ) or 0
            usage_result["cache_read_input_tokens"] = getattr(
                final_message.usage, "cache_read_input_tokens", 0
            ) or 0
            usage_result["model"] = final_message.model

    return _generate(), usage_result
```

### Integration with the Chat Router

```python
# In the chat endpoint's event_generator():
def event_generator():
    full_reply: list[str] = []
    gen, usage = stream_chat_response_with_tracking(
        assembled_message, history_dicts, model,
        system_context=document_system_context,
    )
    try:
        for chunk in gen:
            full_reply.append(chunk)
            yield f"data: {json.dumps({'delta': chunk})}\n\n"
    finally:
        # usage dict is now populated (stream finished)
        if full_reply and not _demo:
            # Save assistant message
            assistant_msg = ChatMessage(...)
            db.add(assistant_msg)

            # Log AI usage
            cost = calculate_cost(
                model=usage.get("model", model),
                input_tokens=usage.get("input_tokens", 0),
                output_tokens=usage.get("output_tokens", 0),
                cache_creation_tokens=usage.get("cache_creation_input_tokens", 0),
                cache_read_tokens=usage.get("cache_read_input_tokens", 0),
            )
            ai_log = AIUsageLog(
                user_id=current_user.id,
                session_id=body.session_id,
                model=usage.get("model", model),
                input_tokens=usage["input_tokens"],
                output_tokens=usage["output_tokens"],
                cache_creation_tokens=usage.get("cache_creation_input_tokens", 0),
                cache_read_tokens=usage.get("cache_read_input_tokens", 0),
                cost_usd=cost,
                billing_period_start=current_period_start,
                billing_period_end=current_period_end,
            )
            db.add(ai_log)
            db.commit()

    yield 'data: {"done": true}\n\n'
```

### Key Detail: `get_final_message()` is Synchronous

The SDK's `stream.get_final_message()` (sync) or `await stream.get_final_message()` (async) returns the fully assembled `Message` object after the stream ends. It blocks until the stream is complete, so call it only **after** the text stream loop exits. The Parcel chat router already has a `finally` block after the stream loop -- this is the correct place.

---

## 9. Fallback Strategies for Cost Spikes

### Scenario Analysis

Cost spikes can occur from:
- A viral moment driving signups (good problem)
- A bug causing infinite retry loops
- Prompt injection causing abnormally long outputs
- A single power user gaming the system

### Circuit Breaker Pattern

```python
# backend/core/ai/circuit_breaker.py

import time
from collections import defaultdict

class AICircuitBreaker:
    """Tracks spending and trips if thresholds are exceeded."""

    def __init__(self):
        self._daily_spend: dict[str, float] = defaultdict(float)  # date -> USD
        self._user_hourly: dict[str, int] = defaultdict(int)       # user_id:hour -> count
        self._tripped = False

    DAILY_BUDGET = 100.0        # Hard stop at $100/day
    USER_HOURLY_LIMIT = 20      # No user can send >20 msgs/hour
    WARNING_THRESHOLD = 0.7     # Alert at 70% of daily budget

    def record(self, user_id: str, cost: float):
        today = time.strftime("%Y-%m-%d")
        hour_key = f"{user_id}:{time.strftime('%Y-%m-%d-%H')}"

        self._daily_spend[today] += cost
        self._user_hourly[hour_key] += 1

        if self._daily_spend[today] >= self.DAILY_BUDGET:
            self._tripped = True

    def check_allowed(self, user_id: str) -> tuple[bool, str]:
        if self._tripped:
            return False, "AI service temporarily unavailable. Please try again later."

        hour_key = f"{user_id}:{time.strftime('%Y-%m-%d-%H')}"
        if self._user_hourly[hour_key] >= self.USER_HOURLY_LIMIT:
            return False, "You're sending messages too quickly. Please wait a few minutes."

        return True, ""
```

### Model Downgrade Cascade

If daily spend hits 70% of budget before midday:

```python
def get_emergency_model(user: User, daily_spend: float, daily_budget: float) -> str:
    """Downgrade models if spending is trending too high."""
    spend_ratio = daily_spend / daily_budget
    hour = datetime.now().hour

    # If we've spent 70% of budget and it's before 3 PM, downgrade
    if spend_ratio > 0.7 and hour < 15:
        if user.subscription_tier in ("pro", "team"):
            return "claude-haiku-3-5-20241022"  # Sonnet -> Haiku (73% cheaper)

    return TIER_MODEL_MAP[user.subscription_tier]
```

### Additional Safeguards

1. **`max_tokens` cap:** Already set to 1024 in Parcel. Keep it. Never let users configure this.
2. **Conversation history truncation:** Limit history to last 10 messages to prevent token bloat from long conversations.
3. **Rate limiter:** Already in place (10/minute). Consider tightening to 5/minute for Starter.
4. **Anthropic API spend alerts:** Configure spend limits in the Anthropic Console as a backstop.

---

## 10. Usage Reset Timing

### Calendar Month vs. Billing Cycle Anniversary

| Approach              | Pros                                | Cons                                |
|-----------------------|-------------------------------------|-------------------------------------|
| **Calendar month**    | Simple to implement and explain     | Users who sign up on the 28th get 3 days of access |
| **Billing anniversary** | Fair -- everyone gets a full month  | Complex: must track per-user cycle  |
| **Rolling 30-day window** | Most fair                        | Very complex, hard to explain       |

### Recommendation: Billing Anniversary

Use the subscription start date as the anchor. When a user subscribes on March 15, their period is March 15 - April 14, then April 15 - May 14, etc.

```python
from datetime import date, timedelta

def get_billing_period(subscription_start: date, reference_date: date = None) -> tuple[date, date]:
    """Calculate the current billing period based on subscription start date."""
    ref = reference_date or date.today()
    day = subscription_start.day

    # Find the most recent period start
    if ref.day >= day:
        period_start = ref.replace(day=min(day, _last_day_of_month(ref)))
    else:
        # Go back to previous month
        prev_month = ref.replace(day=1) - timedelta(days=1)
        period_start = prev_month.replace(day=min(day, _last_day_of_month(prev_month)))

    # Period end is one month later minus one day
    next_month = (period_start.replace(day=1) + timedelta(days=32)).replace(day=1)
    period_end = next_month.replace(day=min(day, _last_day_of_month(next_month))) - timedelta(days=1)

    return period_start, period_end

def _last_day_of_month(d: date) -> int:
    """Return the last day of the month for a given date."""
    next_month = d.replace(day=28) + timedelta(days=4)
    return (next_month - timedelta(days=next_month.day)).day
```

### Simplification: Calendar Month (MVP)

For MVP, calendar month is acceptable. The edge case (late-month signups) affects a small percentage of users and can be mitigated with a pro-rated first month. Switch to billing anniversary later if support tickets warrant it.

---

## 11. Overage Handling

### Options Analysis

| Strategy            | UX Impact      | Revenue Impact | Implementation |
|---------------------|---------------|---------------|----------------|
| **Hard block**      | Frustrating    | Strong upsell  | Simple         |
| **Warn + block**    | Manageable     | Strong upsell  | Moderate       |
| **Auto-upgrade**    | Seamless       | Revenue++      | Complex        |
| **Per-message charge** | Transparent | Revenue++      | Complex (billing integration) |
| **Grace messages**  | User-friendly  | Weak upsell    | Simple         |

### Recommended: Warn + Block + Upgrade CTA

This is the pattern used by most SaaS tools (Slack, Notion, Vercel):

1. **At 80% (24/30 for Starter):** Yellow banner in chat: "6 AI messages remaining this month"
2. **At 100% (30/30):** Block new messages. Show upgrade modal:
   - "You've used all 30 AI messages for this period."
   - "Messages reset on [date]."
   - "Upgrade to Pro for 150 messages/month -- [Upgrade Now]"
3. **Never auto-charge** beyond the tier price. Users hate surprise charges.

### Frontend Implementation Pattern

```typescript
// In the SSE event handler (chat-stream.ts)
if (json.warning) {
  // Show dismissable banner: json.warning text
  showUsageWarning(json.warning)
}
if (json.limit_reached) {
  // Show upgrade modal instead of streaming response
  showUpgradeModal({
    message: json.delta,
    resetDate: json.resets_at,
  })
  return  // Don't render as AI message
}
```

---

## 12. Caching AI Responses for Common Questions

### Opportunity

Real estate beginners ask the same definitional questions repeatedly across users:
- "What is DSCR?"
- "What is cap rate?"
- "What is ARV?"
- "How does subject-to work?"
- "What is the 70% rule?"

These are **context-free** (no deal context needed) and have stable answers. Caching them avoids an API call entirely.

### Implementation: Semantic Response Cache

```python
# backend/core/ai/response_cache.py

import hashlib
from sqlalchemy.orm import Session

class ResponseCache:
    """Cache AI responses for common context-free questions."""

    # Exact-match triggers (normalized lowercase, stripped)
    EXACT_MATCHES = {
        "what is dscr": "dscr_definition",
        "what is cap rate": "cap_rate_definition",
        "what is arv": "arv_definition",
        "what is the 70% rule": "seventy_percent_rule",
        "what is noi": "noi_definition",
        "what is cash on cash return": "coc_definition",
        "how does subject to work": "subject_to_explanation",
        "what is a brrrr": "brrrr_explanation",
        "what is wholesale real estate": "wholesale_explanation",
    }

    @staticmethod
    def normalize(text: str) -> str:
        """Normalize a message for cache lookup."""
        return text.lower().strip().rstrip("?").rstrip(".")

    @classmethod
    def check(cls, message: str, context_type: str) -> str | None:
        """Return a cached response if available, else None.

        Only matches context-free (general) messages.
        """
        if context_type != "general":
            return None

        normalized = cls.normalize(message)
        cache_key = cls.EXACT_MATCHES.get(normalized)

        if cache_key:
            return CACHED_RESPONSES.get(cache_key)
        return None

# Pre-written, high-quality responses (markdown formatted)
CACHED_RESPONSES = {
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
    # ... additional entries for each cache key
}
```

### Integration

```python
# In chat router, before calling the AI
cached = ResponseCache.check(body.message, body.context_type)
if cached:
    def _cached_stream():
        yield f"data: {json.dumps({'delta': cached})}\n\n"
        yield 'data: {"done": true}\n\n'

    # Log as cached (0 API tokens, $0 cost) but still count as a message
    # for the usage limit
    return StreamingResponse(_cached_stream(), ...)
```

### Cost Impact

If 10-15% of messages hit the cache, that is 10-15% fewer API calls. At scale:
- 1000 users, ~700 paying, ~$473/mo AI cost
- 12% cache hit rate: saves ~$57/mo
- More importantly, these responses are **instant** (no API latency), improving UX.

### Tradeoff

Cached responses are static. They will not reflect model improvements or prompt changes. Keep the cache small (10-20 entries) and review quarterly.

---

## 13. Batch vs Real-Time Cost Tracking

### Real-Time Tracking (Per-Request INSERT)

Write to `ai_usage_log` immediately after every streamed response completes.

**Pros:**
- Usage limits are enforced accurately (no lag between hitting limit and being blocked)
- Admin dashboard is always current
- Simple implementation (just INSERT in the finally block)

**Cons:**
- One extra DB write per AI message (negligible at Parcel's scale)
- If the DB write fails, the cost is lost (mitigate with retry or async queue)

### Batch Tracking (Periodic Aggregation)

Buffer usage data in Redis or memory, flush to PostgreSQL every N minutes.

**Pros:**
- Fewer DB writes
- Can tolerate temporary DB outages

**Cons:**
- Usage limits have a lag window (user could exceed limit between flushes)
- Complexity of the buffer layer
- Risk of data loss if the process crashes before flushing

### Hybrid Approach

Real-time **message count** tracking (for limit enforcement) + batch **cost aggregation** (for reporting).

```python
# Real-time: lightweight counter in Redis (or even in the user's session row)
# Incremented atomically before each AI call

redis.incr(f"ai_msgs:{user_id}:{period_key}")

# Batch: detailed cost logging flushed every 5 minutes
# from an in-memory buffer or async task queue
```

### Recommendation for Parcel

**Use real-time tracking (per-request INSERT).** At Parcel's scale (even at 1000 users, that is ~20,000 AI messages/month = ~670/day = ~1 INSERT per minute), a single PostgreSQL INSERT per AI message is trivially cheap. The simplicity of having one source of truth in `ai_usage_log` far outweighs the micro-optimization of batching. Revisit batching only if you hit 10,000+ daily AI messages.

---

## Recommendations for Parcel

Prioritized list of implementation steps, ordered by impact and urgency.

### Priority 1: Foundation (Implement Before Charging for AI)

1. **Add token tracking to `stream_chat_response`.** Call `stream.get_final_message()` after the text stream loop in `chat_specialist.py` to capture `usage.input_tokens`, `usage.output_tokens`, and cache-related token fields. This is the single most important change -- without it, you are flying blind on costs.

2. **Create the `ai_usage_log` table.** Store every AI request with user_id, model, token counts, computed cost, and billing period. Use real-time INSERT in the chat router's `finally` block. This gives you per-user cost attribution from day one.

3. **Implement message count limits.** Query `ai_usage_log` COUNT for the current billing period before each AI call. Return an SSE error with `limit_reached: true` when the user hits their tier cap. Show an upgrade CTA in the frontend.

4. **Enable prompt caching on the system prompt.** Change the `system` parameter from a string to a list of content blocks with `cache_control: {type: "ephemeral"}` on the static system prompt block. This is a one-line structural change that saves ~30-44% on input token costs with zero behavior change.

### Priority 2: Cost Optimization (Implement at Launch)

5. **Route Starter users to Haiku, Pro/Team to Sonnet.** Create a `get_model_for_user()` function. Haiku is 73% cheaper than Sonnet per message and perfectly adequate for the Starter tier's use case (simple Q&A, definitions, basic deal questions). Keep the current `claude-opus-4-5` model reference only if you add a premium "deep analysis" feature; for chat, Sonnet is sufficient.

6. **Add warning banners at 80% usage.** Include a `warning` field in SSE events when the user is approaching their limit. The frontend renders a yellow banner: "X messages remaining this month." This reduces support friction and drives upgrades.

7. **Cache 10-15 common definitional responses.** Pre-write high-quality markdown answers for "what is DSCR", "what is cap rate", etc. Return instantly without an API call. Saves cost and improves latency. Count these against the user's message limit to keep the accounting simple.

### Priority 3: Operational Safety (Implement Within First Month)

8. **Add a daily spend circuit breaker.** Track daily total API spend. If it exceeds a threshold ($100/day initially), trip the breaker and block new AI calls. Also add a per-user hourly rate limit (20 messages/hour max) to prevent abuse or runaway loops.

9. **Build an internal admin usage dashboard.** Query `ai_usage_log` for daily spend, per-model breakdown, top users by cost, and cache hit rates. This does not need a UI initially -- a `/admin/ai-stats` JSON endpoint is enough for monitoring.

10. **Configure Anthropic Console spend alerts.** Set a hard spending limit in the Anthropic dashboard as a backstop. This is a 2-minute configuration task that prevents catastrophic runaway costs regardless of any bugs in your application layer.

### Priority 4: Future Refinements (Month 2+)

11. **Switch from calendar month to billing anniversary resets.** For MVP, calendar month is fine. If customer complaints arise about late-month signups, implement anniversary-based billing period calculation.

12. **Evaluate extended cache TTL (1-hour).** Once you have cache hit rate data from production, test the `extended-cache-ttl-2025-04-11` beta header with 1-hour TTL. This is especially valuable if users have long gaps between chat sessions (>5 min but <1 hour).

13. **Consider the Anthropic Batch API for offer letters.** Offer letter generation is not latency-sensitive (the user can wait 30-60 seconds). The Batch API offers a 50% discount on all tokens. If offer letter volume grows, routing them through the batch endpoint saves meaningfully.

14. **Explore Anthropic's Usage & Cost API.** Use the `/v1/organizations/cost_report` Admin API endpoint to reconcile your internal `ai_usage_log` totals against Anthropic's billing. This catches any drift between your calculated costs and actual charges.

### Cost Summary

At current projections with all optimizations implemented:
- **AI cost per paying user: ~$0.95/month**
- **AI as percentage of revenue: ~4.4%**
- **Gross margin impact: negligible** -- AI is not a margin risk for Parcel at any foreseeable scale

The primary risk is not cost but **perceived value**. Make sure the 30-message Starter limit feels generous enough to demonstrate value, and the upgrade path to Pro (150 messages) feels worth the price difference. The actual API cost difference between serving a Starter user ($0.17/mo) and a Pro user ($3.24/mo) is small enough that being generous with limits is the right call.
