# Agent 19: Adversarial Critique of Billing System Design

> **Date:** 2026-03-28
> **Role:** Adversarial critic and systems architect
> **Scope:** Every flaw, gap, inconsistency, and risk across all 18 billing design documents
> **Verdict:** The system as designed is 3-4x more complex than what a solo founder needs to ship. The core billing loop is sound, but the periphery is bloated with features that won't matter until 500+ paying users.

---

## 1. CONTRADICTIONS

### 1.1 Plan Tier Naming: Three Different Systems

The most pervasive inconsistency across the entire design: agents cannot agree on what plans exist or what they're called.

| Agent | Plan Tiers | Notes |
|-------|-----------|-------|
| Agent 01 (schema) | `free`, `starter`, `pro`, `team` | PlanTier enum with 4 values |
| Agent 04 (gating) | `FREE`, `STARTER`, `PRO`, `TEAM` | IntEnum with rank 0-3 |
| Agent 05 (pricing) | `free`, `starter`, `pro`, `team` | $0/$29/$69/$149 |
| Agent 06 (trial) | `pro_trial`, `free`, `starter`, `pro`, `team` | Introduces `pro_trial` as a plan value |
| Agent 08 (paywall UI) | `free`, `pro`, `team`, `demo` | **Drops `starter` entirely** |
| Agent 14 (teams) | `free`, `solo_pro`, `team` | Team model uses `teamplan` enum: introduces `solo_pro` |
| Agent 16 (frontend) | `free`, `pro`, `team`, `demo` | **Also drops `starter`** |
| Agent 18 (migration) | `free`, `pro`, `team` | Migration schema uses plain `String(50)` not enum |

**Critical conflict:** Agent 06 introduces `pro_trial` as a stored database value for `plan`. This directly conflicts with Agent 01's `PlanTier` enum which has no `pro_trial` value, and with Agent 03's webhook handler that sets `user.plan_tier` to values from the `plantier` enum. If you store `pro_trial` in a column typed as `Enum("free","starter","pro","team")`, PostgreSQL will reject the INSERT.

**Critical conflict:** Agents 08 and 16 (the frontend) have no concept of `starter`. They define `Plan = 'free' | 'pro' | 'team' | 'demo'`. But Agent 05 prices Starter at $29/mo with specific limits, and Agent 04 gates features at the `STARTER` tier. The frontend literally cannot display or navigate to a Starter plan.

**Critical conflict:** Agent 14 defines a `teamplan` PostgreSQL enum (`"free", "solo_pro", "team"`) on the Team model. Agent 01 defines `plantier` (`"free", "starter", "pro", "team"`) on the User model. These are different enum types with different values. The `solo_pro` value in `teamplan` has no equivalent in `plantier`.

### 1.2 Column Naming: `plan` vs `plan_tier`

- Agent 01 adds `plan_tier` to the User model (column name `plan_tier`, enum type `plantier`)
- Agent 06 references `user.plan` throughout (trial start, trial state machine, downgrade)
- Agent 09 references `user.plan` in the registration response
- Agent 14 references `user.plan_tier`
- Agent 18 migration adds `users.plan` (String, not enum)

These are different column names. Code referencing `user.plan` will fail if the column is `plan_tier`, and vice versa.

### 1.3 Usage Tracking: Three Incompatible Tables

| Agent | Table | Columns | Counting Method |
|-------|-------|---------|-----------------|
| Agent 01 (schema) | `usage_records` | `user_id, usage_type (enum), quantity, period_start, period_end` | `SUM(quantity) WHERE period_start = $X` |
| Agent 04 (gating) | `usage_events` | `user_id, resource (str), created_at` | `COUNT(*) WHERE created_at >= period_start` |
| Agent 12 (AI) | `ai_usage_log` | `user_id, request_type, input_tokens, cost_usd, billing_period_start` | `COUNT(*) WHERE billing_period_start = $X` |

Agent 04's gating code imports `from models.usage_events import UsageEvent` -- a model that doesn't exist in Agent 01's schema. Agent 12 explicitly acknowledges this conflict but adds a third table instead of resolving it. The result: three different tables tracking overlapping usage data with three different query patterns.

### 1.4 Webhook Endpoint Path

- Agent 03: `POST /webhooks/stripe` (no prefix, mounted directly)
- Agent 15: `POST /billing/webhooks/stripe` (under billing prefix)
- Agent 17: `POST /api/v1/billing/webhooks/stripe` (under API prefix)
- Agent 18: `POST /api/v1/billing/webhook` (singular, under API prefix)

Four different URLs. Only one can be registered in Stripe Dashboard.

### 1.5 Webhook Event Model: Two Incompatible Definitions

Agent 01 defines `WebhookEvent` with columns: `stripe_event_id, event_type, payload, processed, processed_at, error, retry_count, created_at, updated_at`.

Agent 03 defines `WebhookEvent` with the same name but adds: `api_version, idempotency_key, stripe_created, source_ip` and different index definitions. The `_store_event()` function in Agent 03 passes `api_version`, `idempotency_key`, `stripe_created`, `source_ip` to the constructor -- columns that don't exist in Agent 01's model.

### 1.6 Trial: Stripe-Managed vs Local

- Agent 05 Section 5: "No credit card is collected during trial... we grant Pro access locally for 14 days and create the Checkout Session only when the user decides to subscribe."
- Agent 02: `create_checkout_session()` accepts a `trial_period_days` parameter and passes it to Stripe's `subscription_data.trial_period_days`. This creates a Stripe-managed trial with a Stripe subscription object.
- Agent 06: Full local trial system with `trial_ends_at` on User, cron job for expiration, no Stripe subscription during trial.

These are mutually exclusive approaches. A locally managed trial has no Stripe subscription ID; a Stripe-managed trial does. The webhook handlers in Agent 03 expect `subscription.status = "trialing"` events from Stripe, which only fire for Stripe-managed trials.

### 1.7 Feature Limits: Contradictory Numbers

| Feature | Agent 04 (Gating) | Agent 05 (Pricing) | Agent 06 (Trial Features) | Agent 07 (Frontend PLANS) |
|---------|-------------------|-------------------|--------------------------|--------------------------|
| Free AI messages | 0 (blocked) | 0 (blocked) | 5/month | 5/month (Agent 07: "Basic AI chat (5 messages/mo)") |
| Starter analyses | 15/month | 25/month | -- | 25/month |
| Starter AI messages | 30/month | 30/month | 50/month (features map) | 50/month |
| Starter saved deals | 25 | 50 | -- | -- |
| Pro AI messages | 150/month | 150/month | unlimited (-1) | unlimited |
| Pro documents | unlimited | 25/month | unlimited (-1) | 10 uploads/month |
| Free comparison | Yes (true) | No | 2 dimensions | 2 dimensions |
| Starter pipeline | No (false) | Yes (1 board) | -- | Yes (up to 25 deals) |
| Starter portfolio | No (false) | 0 | full (features map) | -- |
| Starter comparison | No (false) | No | -- | "All dimensions" |

Agent 04 blocks AI for Free users (`ai_messages_per_month: 0, ai_chat_enabled: False`), but Agent 06's feature map gives Free 5 messages/month and Agent 07's frontend displays "Basic AI chat (5 messages/mo)" for Free. If Agent 04's gate is deployed, Free users see a chat option they can never use.

Agent 04 sets Starter `analyses_per_month: 15`, Agent 05 pricing says 25. A user paying $29/mo gets 15 or 25 analyses depending on which code runs.

Agent 04 blocks pipeline and portfolio for Starter (`pipeline_enabled: False, portfolio_enabled: False`), but Agent 05 pricing gives Starter "1 board" pipeline access and the frontend shows pipeline for Starter.

### 1.8 Billing Config: Two Competing Implementations

- Agent 02 defines `StripeSettings` in `backend/core/billing/config.py` using `pydantic-settings` with `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, individual price IDs per plan+interval, and a `get_stripe_settings()` singleton.
- Agent 05 defines `BillingConfig` in the same file path `backend/core/billing/config.py` with different field names (`stripe_secret_key` lowercase), includes `stripe_publishable_key` and product IDs that Agent 02 doesn't have, and a `get_billing_config()` singleton.

Two classes, same file, different field naming conventions, different singletons.

### 1.9 Subscription Status Enum Mismatch

- Agent 01/02: SubscriptionStatus includes `"incomplete"` and `"paused"` but NOT `"incomplete_expired"`
- Agent 02 VALID_TRANSITIONS: includes `"incomplete_expired"` as a terminal state
- Agent 15 Pydantic schema: `SubscriptionStatus` enum includes `"incomplete_expired"`
- Agent 16 frontend TypeScript: does NOT include `"incomplete_expired"` or `"paused"`

If Stripe sends an `incomplete_expired` status and the DB enum doesn't include it, the ORM INSERT will fail with a PostgreSQL enum violation.

---

## 2. MISSING EDGE CASES

### 2.1 Same-Day Upgrade Then Downgrade

No agent addresses what happens if a user upgrades from Starter to Pro and then cancels within the same billing period. Agent 07 says upgrades are immediate proration via `Stripe.Subscription.modify`. Agent 10 says cancellations are `cancel_at_period_end`. But:
- Does the proration credit carry forward?
- If they re-subscribe to Starter, do they get a credit from the unused Pro time?
- Is the `cancel_reason` stored on the subscription that was just created hours ago?

Stripe handles the financial side, but the local DB has no concept of prorated transitions, and the feature-gating code will oscillate between Pro and Starter limits within hours.

### 2.2 Account Deletion During Trial

Agent 06 has no handler for a user deleting their account during the active trial. The cron job will attempt to downgrade a deleted user. The win-back email sequence will fire for a user who asked to be deleted. No GDPR data deletion is mentioned anywhere in any agent.

### 2.3 Webhook Arrives Before Registration Completes

Agent 06 creates the Stripe customer asynchronously after registration via `enqueue_task()`. Agent 03's `handle_subscription_created` looks up the user by `stripe_customer_id`. If the Stripe customer creation webhook arrives before the async task saves the `stripe_customer_id` to the user row, the lookup fails. Agent 03 handles this case ("deferred: user not linked yet") but relies on Stripe retrying the event. The gap: what if Stripe retries and the task still hasn't completed? The event gets stored but never processed.

### 2.4 Team Owner Cancels

Agent 14 doesn't address: when the team owner cancels the Team subscription, what happens to the 4 other team members? Are they immediately kicked to Free? Do they retain read access to shared pipeline data? Do they get notified? Do they keep their personal deals that were on the team? Agent 10's cancellation flow only addresses individual subscriptions.

### 2.5 Multiple Browser Tabs During Checkout

If a user opens the Stripe Checkout page in two tabs (double-clicked the upgrade button), both will create checkout sessions. If they complete both, Agent 03's webhook handler will try to create two subscriptions for the same user. The partial unique index `ix_subscriptions_one_active_per_user` will block the second INSERT, but the error handling path (`db.rollback() + log`) means the second checkout session's payment is collected by Stripe with no matching local subscription. The user is charged twice.

### 2.6 Annual to Monthly Switch

Agent 07's plan switching section describes Starter->Pro upgrade but not annual->monthly billing interval change. A user on Pro Annual ($660/yr) wants to switch to Pro Monthly ($69/mo) mid-year. This is a downgrade from Stripe's perspective (lower total commitment). Is proration applied? Does the annual payment get partially refunded? None of the agents address billing interval changes within the same tier.

### 2.7 Free Tier User with Existing Data Above Limits

Agent 06 says "never delete or hide user-created data" on downgrade. But Agent 04's `require_quota("saved_deals")` blocks creating deal #6 for a Free user (limit: 5). What about existing users who signed up during the all-free era and already have 50 deals? Agent 18 says "free tier limits apply only to NEW actions going forward" -- but Agent 04's `_get_saved_deals_count` counts ALL non-deleted deals. User with 50 deals will be permanently blocked from creating new deals on Free, even though they were told their data is safe.

### 2.8 Race Condition: Concurrent Usage Tracking

Agent 04's `require_quota` checks current usage BEFORE the action, then `record_usage` inserts AFTER the action. Two simultaneous requests could both pass the quota check (both see usage=2, limit=3) and both succeed, pushing actual usage to 4/3. No transaction isolation or locking is applied to the usage check+increment path.

### 2.9 Demo Account Billing Exposure

Agent 04 bypasses all gates for demo users (`is_demo_user` returns True -> tier = PRO). But no agent protects billing endpoints from the demo user. If the demo user hits `POST /billing/checkout`, the system will try to create a Stripe customer and checkout session for the demo account.

---

## 3. SECURITY VULNERABILITIES

### 3.1 Webhook Handler Sets `stripe.api_key` Globally

Agent 03 line 51: `stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")` -- this sets the global API key at module import time. Agent 02 explicitly warns against this ("This service never sets stripe.api_key globally"). If the webhook handler module is imported first, subsequent Stripe calls from other modules that expect per-request key passing will use the global key correctly -- but the reverse import order could expose the key in unexpected contexts. In test mode, this could leak the test key across test isolation boundaries.

### 3.2 Advisory Lock Key Collision

Agent 03 uses `hash(user_id) % (2**31 - 1)` for PostgreSQL advisory locks. Python's `hash()` function is randomized per process (PYTHONHASHSEED). Two different Uvicorn workers processing webhooks for different users could compute the same lock key (birthday collision in a 2^31 space with UUIDs). More critically, `hash()` returns different values across process restarts, so advisory locks from one worker don't serialize against another.

**Fix needed:** Use a deterministic hash (e.g., `int(hashlib.md5(user_id.encode()).hexdigest(), 16) % (2**31 - 1)`).

### 3.3 IDOR on Billing Endpoints

Agent 15 defines `POST /billing/cancel` but the request body contains `reason` and `immediate` -- no subscription or user ID. The endpoint presumably uses `get_current_user` from the JWT. But `POST /orgs/{id}/invitations` takes a team_id in the URL path. Agent 14's invite endpoint validates the caller has `MANAGE_MEMBERS` permission, but the permission check function `require_team_permission` is referenced but never defined in any agent. If it defaults to checking `user.team_id == team_id`, a user who was removed from a team but whose `team_id` wasn't nullified could still invite members.

### 3.4 Webhook Rate Limit Bypass

Agent 03 sets `@limiter.limit("120/minute")` on the webhook endpoint. The limiter is `slowapi` which keys on client IP. Stripe sends from multiple IPs. A legitimate burst of webhooks (batch operation, multiple customer events) could hit the rate limit and cause Stripe to start retrying, creating an amplification loop. Meanwhile, a real attacker spoofing the webhook endpoint doesn't need to bypass the rate limit -- they need to bypass signature verification, which is the actual security layer. The rate limit adds no security value and could cause operational problems.

### 3.5 No CSRF Protection on Checkout Endpoint

`POST /billing/checkout` creates a Stripe Checkout Session and returns a `checkout_url`. The endpoint is protected by JWT auth (cookie). If a malicious site triggers a POST to this endpoint via a cross-origin request, the browser will include the httpOnly cookie. The attacker gets back a checkout URL for the victim's account. While the attacker can't complete payment on the victim's behalf, they could trick the victim into completing a subscription change. Agent 15 doesn't mention CSRF tokens or SameSite cookie configuration.

### 3.6 Usage Records Not Linked to Transactions

Agent 04's `record_usage()` explicitly says "Do NOT commit here -- let the caller's transaction handle it." But the function only does `db.add(UsageEvent(...))` with no explicit link to the action. If the endpoint commits the business action but the usage event INSERT fails silently (constraint violation, type error), the usage is consumed without being counted. The user gets free usage.

---

## 4. PERFORMANCE BOTTLENECKS

### 4.1 Usage Count Query on Every Gated Request

Agent 04's `require_quota` runs a `COUNT(*)` query against `usage_events` on every request to a metered endpoint. For a user who sends 150 AI messages per month, every chat message requires counting all previous messages in the billing period. With no caching layer, this is a database round-trip per request.

**At scale:** 100 Pro users x 150 messages/month = 15,000 COUNT queries/month just for AI chat. Add analyses, uploads, and other metered features, and every endpoint has an extra DB query. At 1,000 users this becomes significant.

**Missing:** No agent proposes a Redis counter, an in-memory cache, or even a materialized count on the usage table. The composite index helps, but the query still runs for every request.

### 4.2 Fetch-on-Receive: Extra Stripe API Call Per Webhook

Agent 03 fetches `stripe.Subscription.retrieve()` for every subscription-related webhook event. At checkout, three events fire near-simultaneously (`checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`), each triggering a Stripe API call. That's 3 round-trips to Stripe (~200ms each) per subscription creation. Agent 03 acknowledges this and says "negligible at Parcel's scale," which is correct -- but it doubles the processing time of the hot path.

### 4.3 N+1 Query Risk in Feature Gating

Agent 04's `get_user_tier` reads `current_user.plan` (or `plan_tier`). But `_get_billing_period_start` then reads `current_user.current_period_start` -- a field that doesn't exist on the User model in Agent 01. To get the billing period, you'd need to JOIN to subscriptions. If this happens on every gated endpoint, every request now requires loading User + active Subscription.

### 4.4 Webhook Events Table Growth

Agent 03 stores full JSONB payloads for every webhook event. At 100 events/day (reasonable for 100 subscribers), the table grows by 3,000 rows/month. Each row with a full Stripe event payload is 2-5KB. After a year: ~36,000 rows, ~100MB. Not massive, but Agent 03 mentions 90-day retention for processed events without providing any cleanup mechanism or cron job.

### 4.5 Missing Index on `usage_events`

Agent 04 references a composite index on `(user_id, resource, created_at DESC)` but never defines it. The `usage_events` model definition in Agent 04 has no `__table_args__` or Index declarations. Without this index, the COUNT query is a full table scan filtered by user_id.

---

## 5. OVER-ENGINEERING (Defer 6+ Months)

### 5.1 Team Tier — The Entire Agent 14

The Team tier ($149/mo, 5 seats) requires: invitation system, RBAC, shared data boundaries, seat billing, team AI usage pools, custom branding, slug generation, team activity feed, role-based permissions, and a new `teams` router with 6+ endpoints. This is essentially building a multi-tenant SaaS feature.

**Reality check:** Parcel has zero paying customers. The Team tier is a pricing anchor to make Pro look cheap (Agent 05 says this explicitly). Building Team before validating that anyone will pay $69/mo for Pro is premature. Agent 14 is ~350 lines of model code, ~200 lines of invitation flow, ~100 lines of RBAC. That's 2-3 weeks of solo developer time for a feature that at best converts 5-10% of paid users.

**Recommendation:** Cut entirely for MVP. Add the Team tier to the pricing page as "Coming Soon" to preserve the anchoring effect.

### 5.2 Custom Dunning Email Sequence (Agent 11)

Agent 11 designs a 4-email, 14-day dunning pipeline with grace periods, restricted access phases, and cron jobs. Meanwhile, Stripe Smart Retries (toggle-on, zero code) recover 11% of failed payments automatically, and Stripe's built-in dunning emails are functional if not branded.

**Recommendation:** Enable Stripe Smart Retries + Stripe's built-in dunning emails at launch. Build custom dunning only when you have enough failed payments to measure improvement (probably >200 paying subscribers).

### 5.3 A/B Testing Hooks (Agent 06 Section 8)

Agent 06 includes `get_ab_variant("trial_length", email)` in the trial start logic and references an A/B test system. With <100 users, A/B tests are statistically meaningless. The minimum sample size for a 5% conversion lift at 95% confidence is ~3,000 users per variant.

**Recommendation:** Cut. Hardcode trial to 14 days.

### 5.4 Email Queue System (Agent 13 Section 8)

Agent 13 designs a PostgreSQL-backed email queue with `process-email-queue` cron endpoint, retry logic, and dead letter handling. Resend's API is synchronous and returns delivery status immediately. For the email volumes at launch (~100 emails/week), `BackgroundTasks` from FastAPI is sufficient.

**Recommendation:** Use FastAPI `BackgroundTasks` for all emails. Introduce a queue when volumes justify it (>1,000 emails/day).

### 5.5 Cost Anomaly Detection (Agent 12 Section 8)

Agent 12 designs a cost anomaly detection system that monitors per-user AI spend, detects outliers, and alerts. At 100 users, you can manually scan a SQL query once a week.

**Recommendation:** Cut. Monitor AI costs via Anthropic's dashboard and a monthly SQL query.

### 5.6 Cancellation Save Offers with Dynamic Coupons (Agent 10)

Agent 10's 5-step cancellation flow with reason-specific save offers (7 different offers), Calendly booking integration, dynamic coupon application, and churn analytics is sophisticated retention engineering -- for a product with zero churn data. You don't know why users cancel until they cancel.

**Recommendation:** Ship a 2-step cancellation: reason survey (text field) + confirm. Add save offers when you have 20+ cancellations and can see patterns.

### 5.7 Onboarding Wizard (Agent 09)

Agent 09 designs a multi-screen onboarding wizard with strategy picker, experience level, pre-populated sample deals, and an onboarding checklist. The current app already works without this. New users can analyze a deal in under 2 minutes from registration.

**Recommendation:** Defer. Ship billing first, then measure where users drop off before building an onboarding flow.

### 5.8 Feature Flags System (Agent 18 Section 6)

Agent 18 designs a database-backed feature flag system with a `feature_flags` table, percentage-based rollout, and user-specific allowlists. For a solo founder deploying to a single Railway environment, this is overhead. You can control rollout by deploying the code.

**Recommendation:** Use a simple Python dictionary or environment variable for the billing feature flag. Delete the flag system after full rollout.

### 5.9 Referral System (Agent 05 Section 6)

Agent 05 defines a referral coupon system with per-user promo codes (`PARCEL-{USER_SHORT_ID}`), dynamic code creation, and referral tracking. This is a growth feature, not a billing feature.

**Recommendation:** Cut entirely. Revisit when you have 100+ happy paying customers.

---

## 6. UNDER-ENGINEERING (Critical Missing Pieces)

### 6.1 No Cron Job Infrastructure

Agent 06 requires a cron job for trial expiration. Agent 11 requires a cron job for dunning phase transitions. Agent 13 requires a cron job for email queue processing. Agent 12 mentions periodic usage resets. But no agent defines how cron jobs run on Railway.

Railway doesn't have built-in cron. You need one of:
- A separate Railway service running a scheduler (cost: ~$5/mo)
- An external cron service (cron-job.org, Vercel Cron, GitHub Actions scheduled workflow)
- A `/internal/cron/` endpoint hit by an external trigger

This is a hard infrastructure dependency that nobody designed. Without it, trials never expire, dunning never escalates, and email queues never drain.

### 6.2 No Plan Migration for Existing Users

Agent 18 addresses existing user migration but the migration script uses `plan = 'free'` as a String column, while Agent 01 defines `plan_tier` as a PostgreSQL enum. The migration script also references tables (`subscriptions.plan`, `feature_flags`) with schemas that don't match Agent 01's definitions (e.g., Agent 18's `subscriptions` table has a `plan` String column; Agent 01's `Subscription` model has a `plan_id` FK to `subscription_plans`).

If you run Agent 18's migration against Agent 01's schema, it will fail.

### 6.3 No Admin View for Billing Issues

No agent designs an admin panel or even a set of admin SQL queries for common billing operations:
- View a user's subscription status
- Manually grant/extend a trial
- Override a plan tier
- Refund a charge
- Replay a failed webhook

In production, the first billing support request will require raw SQL on the Railway console. At minimum, a `/admin/billing/{user_id}` endpoint should exist.

### 6.4 No Monitoring or Alerting

Agent 03 mentions "CRITICAL log is emitted" for dead-lettered webhooks. But Railway's default log retention is 7 days, and there's no alerting integration. A dead-lettered webhook on Friday night won't be noticed until Monday.

**Minimum needed:** A health check that queries `SELECT COUNT(*) FROM webhook_events WHERE processed = FALSE AND retry_count >= 5` and returns non-200 if the count is > 0. Wire this to an uptime monitor (UptimeRobot, free tier).

### 6.5 No Graceful Degradation When Stripe Is Down

If Stripe is down (it happens ~2x/year), every checkout attempt fails, every webhook delivery fails, and every `Subscription.retrieve()` call in the webhook handler fails. No agent designs a fallback. Users clicking "Upgrade" see an error. The system should:
- Cache the last known subscription state locally (Agent 01's denormalized `plan_tier` partially handles this)
- Queue failed checkout attempts for retry
- Show a user-friendly "billing temporarily unavailable" message instead of a 500 error

### 6.6 No Billing Page in Settings

Agent 08 describes a `<BillingPage>` component and Agent 15 defines billing endpoints, but no agent provides the implementation for the Settings > Billing page that shows: current plan, usage meters, payment method on file, billing history/invoices, and plan change/cancellation buttons. This is the single most important billing UI surface and it's only sketched.

---

## 7. COST ANALYSIS

### 7.1 Infrastructure Costs

| Service | Current | With Billing | At 100 Users | At 500 Users | At 1,000 Users |
|---------|---------|-------------|-------------|-------------|---------------|
| Railway Backend | ~$5/mo | ~$7/mo (more DB rows) | ~$10/mo | ~$15/mo | ~$25/mo |
| Railway PostgreSQL | ~$5/mo | ~$7/mo (billing tables) | ~$10/mo | ~$15/mo | ~$25/mo |
| Railway Staging | $0 | $5/mo (Agent 18) | $5/mo | $5/mo | $5/mo |
| Railway Cron Worker | $0 | ~$5/mo (needed) | ~$5/mo | ~$5/mo | ~$5/mo |
| Vercel Frontend | Free | Free | Free | Free | Free |
| Stripe Fees | $0 | 2.9% + $0.30/txn | ~$200/mo (at $7K MRR) | ~$1,000/mo (at $35K MRR) | ~$2,000/mo (at $69K MRR) |
| Resend Email | Free (100/day) | Free | Free | $20/mo | $20/mo |
| Anthropic AI | ~$5/mo | ~$10/mo | ~$50/mo | ~$250/mo | ~$500/mo |
| **Total Infra** | **~$15/mo** | **~$29/mo** | **~$85/mo** | **~$315/mo** | **~$585/mo** |

### 7.2 Revenue Projections (Conservative)

| Users | Free | Starter | Pro | Team | MRR | After Stripe Fees |
|-------|------|---------|-----|------|-----|-------------------|
| 100 | 60 | 15 | 20 | 5 | $2,560 | $2,300 |
| 500 | 300 | 75 | 100 | 25 | $12,800 | $11,500 |
| 1,000 | 600 | 150 | 200 | 50 | $25,600 | $23,000 |

### 7.3 Does It Fit $25/mo Railway Budget at 100 Users?

No. With staging environment ($5), cron worker ($5), and increased DB usage, Railway alone is ~$22/mo at launch before reaching 100 users. Once billing is active, the total infra is ~$29/mo. But at 100 users with even modest conversion, MRR should cover this 80x over.

**The real cost concern is Anthropic API usage.** At Pro tier, 150 Sonnet messages/user/month could cost $3.24/user (Agent 05). At 100 Pro users, that's $324/mo in AI costs against $6,900/mo in Pro revenue (4.7%). Manageable, but AI costs scale linearly with users while infrastructure costs scale sublinearly. Monitor this.

### 7.4 Hidden Costs

- **Stripe Tax** (if enabled): $0.50/transaction. Agent 05 doesn't mention this but it's required for US sales tax compliance.
- **Stripe Billing Portal**: Free, but customization requires Stripe's Scale tier ($0.80/subscription/month).
- **Domain email for Resend**: Free with DNS verification, but `parceldesk.io` domain renewal (~$12/yr).
- **python-slugify** (Agent 14): New pip dependency for team slugs.

---

## 8. COMPLEXITY AUDIT

### 8.1 Total New Code Estimate

| Component | Agent | Estimated Lines | Time (Solo Dev) | Value |
|-----------|-------|----------------|-----------------|-------|
| DB schema + migrations | 01 | ~800 | 2 days | Critical |
| Stripe service | 02 | ~600 | 2 days | Critical |
| Webhook handler | 03 | ~900 | 3 days | Critical |
| Feature gating | 04 | ~600 | 2 days | Critical |
| Pricing config | 05 | ~200 | 0.5 days | Critical |
| Trial management | 06 | ~500 | 2 days | High |
| Upgrade/checkout flow | 07 | ~400 | 2 days | Critical |
| Paywall UI components | 08 | ~800 | 3 days | High |
| Onboarding wizard | 09 | ~600 | 2 days | Low |
| Cancellation/retention | 10 | ~700 | 3 days | Medium |
| Dunning system | 11 | ~500 | 2 days | Low |
| AI usage tracking | 12 | ~400 | 1 day | Medium |
| Email system | 13 | ~600 | 2 days | Medium |
| Team architecture | 14 | ~1,000 | 5 days | Low |
| API endpoints | 15 | ~500 | 2 days | Critical |
| Frontend state | 16 | ~400 | 1 day | Critical |
| Testing | 17 | ~600 | 3 days | High |
| Migration/rollout | 18 | ~300 | 1 day | High |
| **TOTAL** | | **~9,500** | **~36 days** | |

### 8.2 Can a Solo Founder Build and Maintain This?

**36 working days = 7-8 calendar weeks at full velocity.** That's nearly two months of development before any paying customer exists. This is too long.

The minimum viable billing system (Section 11) can be built in **10-12 days**.

### 8.3 What Takes the Most Effort for the Least Value

1. **Team architecture (Agent 14):** 5 days for a feature maybe 5% of users will use in year one
2. **Cancellation retention flow (Agent 10):** 3 days for a flow that won't have data to optimize for months
3. **Onboarding wizard (Agent 09):** 2 days for a flow that can be added after measuring activation
4. **Custom dunning emails (Agent 11):** 2 days for what Stripe does automatically
5. **A/B test infrastructure (Agent 06):** Scattered across agents, no statistical validity at current scale

---

## 9. CODEBASE CONFLICTS

### 9.1 Database Engine: Sync vs Async Confusion

`backend/database.py` uses `create_engine` (sync). Agent 03's webhook handler creates sessions with `SessionLocal()` directly instead of using `Depends(get_db)` (because it's running in the webhook context, not a FastAPI dependency). This is correct for sync SQLAlchemy but creates a manual session management burden that's easy to leak.

Agent 06 uses `enqueue_task()` for async Stripe customer creation, but no task queue exists in the codebase. The backend has no Celery, no ARQ, no `BackgroundTasks` infrastructure for fire-and-forget tasks. Agent 03 explicitly says "NO CELERY / NO REDIS." But Agent 06 calls `enqueue_task()` as if it exists.

### 9.2 Missing `models/base.py` TimestampMixin

All billing models inherit from `TimestampMixin, Base`. The `TimestampMixin` is referenced as `from models.base import TimestampMixin` but no agent defines it, and it's not in the provided codebase files. It presumably provides `id`, `created_at`, and `updated_at` columns. If it uses UUID PKs via `Column(UUID, primary_key=True, default=uuid.uuid4)`, that's fine. But Agent 18's migration uses `server_default=sa.text("gen_random_uuid()")` -- which is database-level UUID generation, while Python-level `default=uuid.uuid4` generates the UUID in Python. These can coexist but create inconsistency.

### 9.3 Existing Router Structure Conflict

`backend/main.py` mounts all routers under `/api/v1`:
```python
app.include_router(auth.router, prefix="/api/v1")
```

Agent 03 says mount the webhook router WITHOUT the `/api/v1` prefix:
```python
app.include_router(webhooks.router)  # endpoint: /webhooks/stripe
```

But Agent 15 and 17 reference `/api/v1/billing/webhooks/stripe`. And Agent 18's Stripe CLI command uses `/api/v1/billing/webhook`. This needs to be resolved before any Stripe Dashboard configuration.

### 9.4 New Dependencies Not in requirements.txt

The design documents reference these packages not currently in `requirements.txt`:
- `stripe` (the Python SDK) -- **critical, missing**
- `python-slugify` (Agent 14 for team slugs)

The `stripe` package is the most critical missing dependency. It's referenced in every billing agent but not listed in the current `requirements.txt`.

### 9.5 `limiter.py` Import

Agent 03 imports `from limiter import limiter`. The git status shows `limiter.py` is an untracked new file. If it's not committed to main, the webhook handler will fail to import. Currently `slowapi` is in `requirements.txt` and the limiter is used in `main.py`, so this file presumably exists but needs to be committed.

---

## 10. PRIORITY DISAGREEMENTS

### 10.1 Starter Tier: Include or Cut?

- Agents 01, 04, 05, 06, 15: Design around 4 tiers including Starter ($29/mo)
- Agents 08, 16: Frontend has no Starter concept -- only Free/Pro/Team
- Agent 05: "Starter is a decoy for Pro" -- explicitly admits it exists to make Pro look like a better deal

If Starter is just a decoy, building full gating for 4 tiers instead of 3 is wasted effort. The pricing page can show "Starter" visually without the backend having a separate tier.

**Recommendation:** Launch with Free/Pro only. Add Starter later if Pro conversion is too low.

### 10.2 Trial: Reverse Trial vs Traditional Freemium

- Agent 05: "No-card trial" with Pro access for 14 days, local management
- Agent 06: Full "reverse trial" system with `pro_trial` plan value, cron expiration, trial-specific UI states
- Agent 02: Stripe-managed trial with `trial_period_days` on checkout sessions

Three different trial approaches. The simplest: give every new user Pro access for 14 days using a `trial_ends_at` column on User, checked in the feature gating middleware. No Stripe involvement, no new plan tier, no cron job. When `trial_ends_at < now()` and no active Stripe subscription exists, treat as Free.

### 10.3 When to Build Team Features

- Agent 14: Designs full team architecture as part of billing MVP
- Agent 18: Phases the rollout but includes teams in the initial migration
- Agent 05: "Team exists to make Pro look like a deal" -- anchoring only

Building team features at launch means building and maintaining RBAC, invitations, shared data boundaries, and seat billing before validating that anyone will pay $69/mo for Pro.

### 10.4 Feature Flag Rollout vs Big-Bang Launch

- Agent 18: Gradual rollout with feature flags (0% -> 10% -> 50% -> 100%)
- Agent 06: Trial starts at registration for ALL new users (no flag mentioned)
- Agent 09: Onboarding wizard is part of registration flow (no flag mentioned)

If trial and onboarding are deployed without a feature flag but billing is behind a flag, new users get Pro trial access but no upgrade path. They'll be confused when the trial expires and there's no way to pay.

---

## 11. FINAL RECOMMENDATION: MVP SCOPE

### MUST BUILD (billing doesn't work without this)

In priority order -- stop after this list and ship:

1. **Stripe integration basics** (Agent 02, simplified)
   - `StripeSettings` config class with secret key, webhook secret, 2 price IDs (Pro Monthly, Pro Annual)
   - `StripeService` with: `create_customer`, `create_checkout_session`, `create_portal_session`, `cancel_subscription`
   - Exception wrapping (keep the hierarchy, it's clean)

2. **Database schema** (Agent 01, reduced)
   - Add to `users`: `stripe_customer_id`, `plan_tier` (default "free"), `trial_ends_at`
   - New table: `subscriptions` (user_id, stripe_subscription_id, stripe_customer_id, status, plan_tier, current_period_start, current_period_end, cancel_at_period_end, canceled_at, created_at, updated_at)
   - New table: `webhook_events` (stripe_event_id, event_type, payload JSONB, processed, error, retry_count, created_at)
   - New table: `usage_records` -- **one table**, not three (user_id, metric, period_start, count)
   - Skip: `subscription_plans` table (hardcode 2 plans in config), `invoices` (read from Stripe API), `payment_methods` (use Stripe Portal)

3. **Webhook handler** (Agent 03, reduced)
   - Handle: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
   - Skip: `payment_method.attached`, `invoice.payment_succeeded` (Stripe Dashboard suffices), `customer.subscription.trial_will_end` (no custom email yet)
   - Keep: signature verification, idempotency, advisory locks, fetch-on-receive
   - Skip: two-layer idempotency key (stripe_event_id uniqueness is sufficient)

4. **Feature gating** (Agent 04, simplified)
   - Two tiers only: Free and Pro
   - `require_tier(Tier.PRO)` for hard gates
   - `require_quota("analyses_per_month")` for metered gates
   - Single `usage_records` table with `COUNT(*)` queries
   - Skip: `check_quota` (non-blocking variant), `require_feature_or_readonly`, quota headers

5. **Checkout endpoint** (Agent 15, minimal)
   - `POST /api/v1/billing/checkout` -> returns Stripe Checkout URL
   - `POST /api/v1/billing/portal` -> returns Stripe Customer Portal URL
   - `POST /api/v1/billing/cancel` -> cancels at period end
   - `GET /api/v1/billing/status` -> returns plan, status, usage counts, period end

6. **Frontend: Pricing page + paywall** (Agents 07/08, reduced)
   - Pricing page with Free/Pro toggle (monthly/annual)
   - `<PaywallOverlay>` component for gated features (single modal, "Upgrade to Pro")
   - Success/cancel return handling from Stripe Checkout
   - `<PlanBadge>` in sidebar showing current plan
   - Trial countdown banner (simple `days_remaining` from `trial_ends_at`)

7. **Frontend state** (Agent 16, minimal)
   - Add `plan`, `plan_status`, `trial_ends_at` to User type
   - `useBillingStatus()` TanStack Query hook for `GET /billing/status`
   - `canAccess(feature)` utility based on plan tier

### SHOULD BUILD (significantly impacts revenue/retention)

8. **Trial system** (Agent 06, drastically simplified)
   - Set `trial_ends_at = now + 14 days` and `plan_tier = "pro"` at registration
   - Feature gating checks: if `trial_ends_at > now AND no active subscription`, treat as Pro
   - When trial expires (checked at request time, not via cron), treat as Free
   - Skip: `pro_trial` plan value, cron job, trial state machine, trial extension, re-trial policy

9. **Basic dunning awareness** (Agent 11, minimal)
   - On `invoice.payment_failed` webhook: set subscription status to `past_due`
   - Frontend: show a yellow banner when `plan_status == 'past_due'` with "Update payment method" link to Stripe Portal
   - Enable Stripe Smart Retries in Dashboard
   - Skip: custom dunning emails, grace periods, restricted access phases

10. **Usage tracking for AI** (Agent 12, simplified)
    - Record message count in `usage_records` (same table as other metrics)
    - Enforce AI message limits in chat endpoint
    - Skip: token tracking, cost calculation, anomaly detection (use Anthropic Dashboard)

11. **Cancellation flow** (Agent 10, minimal)
    - Single-step modal: "Are you sure? You'll keep access until {period_end}." + optional reason text field
    - `POST /billing/cancel` with `at_period_end: true`
    - Skip: save offers, pause subscription, win-back emails, churn analytics

12. **Welcome + trial-ending emails** (Agent 13, minimal)
    - Welcome email at registration (already exists for password reset pattern)
    - "Trial ending in 3 days" email (triggered by `customer.subscription.trial_will_end` webhook -- or a simple daily query)
    - Skip: email queue, email preferences, branded templates (use Resend's simple API)

### DEFER (build when revenue justifies it)

13. **Starter tier** -- Add when Pro conversion data shows a gap at $69/mo
14. **Team tier + RBAC** (Agent 14) -- Add when 5+ users request team features
15. **Onboarding wizard** (Agent 09) -- Add when activation data shows drop-off
16. **Invoice history page** -- Use Stripe Customer Portal until users complain
17. **Custom branded dunning emails** (Agent 11) -- Add at 200+ subscribers
18. **Annual billing interval changes** -- Handle via Stripe Portal
19. **Subscription pause** (Agent 10) -- Add when churn data justifies it

### CUT (over-engineered, not needed)

20. **A/B testing infrastructure** (Agent 06 Section 8) -- No statistical validity at any realistic near-term scale
21. **Cost anomaly detection** (Agent 12 Section 8) -- Manual monitoring suffices
22. **Referral/promo code system** (Agent 05 Section 6) -- Growth feature, not billing
23. **Feature flags table** (Agent 18 Section 6) -- Use environment variable
24. **Email queue system** (Agent 13 Section 8) -- FastAPI BackgroundTasks suffices
25. **Subscription plan seeds in database** (Agent 01 `subscription_plans` table) -- Hardcode in config
26. **Payment method management** (Agent 01 `payment_methods` table) -- Stripe Portal handles this
27. **Three-table usage tracking** -- One table, one pattern
28. **Multi-step cancellation save offers** (Agent 10) -- Ship when you have churn data
29. **Custom branding** (Agent 14) -- Zero demand signal

### Summary: MVP Timeline

With the MUST BUILD list only: **10-12 working days** (2-2.5 calendar weeks).
With MUST BUILD + SHOULD BUILD: **16-18 working days** (3-3.5 calendar weeks).

The full 18-agent design as specified: **36+ working days** (7-8 calendar weeks).

Ship the MUST + SHOULD list, get 10 paying customers, then revisit the DEFER list with real data.
