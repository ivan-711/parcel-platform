# Billing Migration & Rollout Plan

**Scope:** Safe deployment of Stripe billing on Parcel's Railway (backend) + Vercel (frontend) stack.
**Date:** 2026-03-28
**Current state:** 5 Alembic migrations, 8 routers, 35 API endpoints, 0 billing code.

---

## 1. Phase 0: Pre-Launch Setup

Everything in this phase happens before any billing code reaches `main`. No user-facing changes.

### 1.1 Stripe Account Configuration

```
1. Log into Stripe Dashboard (https://dashboard.stripe.com)
2. Complete business verification (legal name, EIN/SSN, bank account)
3. Verify domain ownership for parceldesk.io
4. Stay in TEST MODE for all steps below
```

**Create products and prices in test mode:**

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe
stripe login

# Create the Pro product + price
stripe products create --name="Parcel Pro" --description="Unlimited deals, AI chat, pipeline, portfolio, PDF reports"
# Note the prod_xxx ID

stripe prices create \
  --product=prod_xxx \
  --unit-amount=4900 \
  --currency=usd \
  --recurring[interval]=month
# Note the price_xxx ID -> this becomes STRIPE_PRICE_ID_PRO

# Create the Team product + price (if launching simultaneously)
stripe products create --name="Parcel Team" --description="Everything in Pro + team collaboration"
stripe prices create \
  --product=prod_yyy \
  --unit-amount=14900 \
  --currency=usd \
  --recurring[interval]=month
# Note the price_xxx ID -> this becomes STRIPE_PRICE_ID_TEAM
```

### 1.2 Environment Variables — Railway (Backend)

Set in test mode first. All variables scoped to the backend service only.

```bash
# Railway CLI setup (one-time)
npm install -g @railway/cli
railway login
railway link  # link to parcel-platform project

# Set test-mode variables on production environment
railway variables set STRIPE_SECRET_KEY=sk_test_... --environment production
railway variables set STRIPE_WEBHOOK_SECRET=whsec_test_... --environment production
railway variables set STRIPE_PRICE_ID_PRO=price_test_... --environment production
railway variables set STRIPE_PRICE_ID_TEAM=price_test_... --environment production
railway variables set ENVIRONMENT=production --environment production

# Set on staging environment (create if needed — see Phase 0.4)
railway variables set STRIPE_SECRET_KEY=sk_test_... --environment staging
railway variables set STRIPE_WEBHOOK_SECRET=whsec_test_staging_... --environment staging
railway variables set STRIPE_PRICE_ID_PRO=price_test_... --environment staging
railway variables set STRIPE_PRICE_ID_TEAM=price_test_... --environment staging
railway variables set ENVIRONMENT=staging --environment staging
```

**Verification:** After setting, run `railway variables --environment production` and confirm all 4 Stripe vars are present. Never echo the values in CI.

### 1.3 Environment Variables — Vercel (Frontend)

```bash
# Publishable key only — safe for client exposure
vercel env add VITE_STRIPE_PUBLISHABLE_KEY production
# Enter: pk_test_...

vercel env add VITE_STRIPE_PUBLISHABLE_KEY preview
# Enter: pk_test_...

vercel env add VITE_STRIPE_PUBLISHABLE_KEY development
# Enter: pk_test_...
```

### 1.4 Create Staging Environment on Railway

Non-negotiable for billing. Cost: ~$5/month.

```bash
# Create a staging environment in the existing Railway project
railway environment create staging

# Add a dedicated PostgreSQL instance for staging
# (Do this in the Railway Dashboard: Add Plugin > PostgreSQL, scoped to staging)

# Set staging-specific variables
railway variables set FRONTEND_URL=https://staging.parceldesk.io --environment staging
railway variables set DATABASE_URL=<staging-postgres-url> --environment staging
```

**Vercel preview deployments** should point to the staging backend:
```
VITE_API_URL = https://parcel-backend-staging-xxxx.up.railway.app
```

### 1.5 Register Test-Mode Webhook Endpoint

Two endpoints — one for staging, one for production (both in test mode initially):

```bash
# Production webhook (test mode)
stripe webhooks create \
  --url https://api.parceldesk.io/api/v1/billing/webhook \
  --events checkout.session.completed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.payment_succeeded,invoice.payment_failed,customer.created

# Staging webhook (test mode)
stripe webhooks create \
  --url https://parcel-backend-staging-xxxx.up.railway.app/api/v1/billing/webhook \
  --events checkout.session.completed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.payment_succeeded,invoice.payment_failed,customer.created
```

Copy each `whsec_...` signing secret to the corresponding Railway environment.

### 1.6 Local Development Setup

```bash
# backend/.env additions (gitignored)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...    # from `stripe listen`
STRIPE_PRICE_ID_PRO=price_test_...
STRIPE_PRICE_ID_TEAM=price_test_...
ENVIRONMENT=development

# frontend/.env.local additions (gitignored)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

Start the Stripe CLI webhook forwarder during development:
```bash
stripe listen --forward-to localhost:8000/api/v1/billing/webhook
# Copy the whsec_... output to backend/.env as STRIPE_WEBHOOK_SECRET
```

### 1.7 Add GitHub Secrets for CI

```
Repository Settings > Secrets and variables > Actions:
  STRIPE_TEST_SECRET_KEY = sk_test_...
```

Do NOT add `sk_live_` keys to GitHub Secrets. Ever.

---

## 2. Phase 1: Soft Launch (Billing Live but Hidden)

**Duration:** 1-2 weeks.
**Who sees it:** Ivan's account + 3-5 invited beta testers.
**Goal:** Validate end-to-end checkout flow, webhook processing, plan upgrades/downgrades, and subscription cancellation with real Stripe test-mode interactions.

### 2.1 Deploy Sequence

```
Step 1: Merge billing migration PR (adds tables, no user-facing changes)
Step 2: Merge billing backend PR (routers, guards, stripe_service)
Step 3: Merge billing frontend PR (BillingPage, UpgradeModal, TierGate)
Step 4: Set feature flag: billing_enabled = true for specific user IDs only
```

Each step is a separate PR. Each gets full CI green before merge.

### 2.2 Feature Flag State

```sql
-- Insert feature flag (run via railway run psql or migration)
INSERT INTO feature_flags (id, name, enabled, allowed_user_ids, rollout_percentage)
VALUES (
  gen_random_uuid(),
  'billing_enabled',
  true,
  '["<ivan-user-id>", "<tester-1-id>", "<tester-2-id>"]',
  0
);
```

- `enabled = true` + `rollout_percentage = 0` means only `allowed_user_ids` see billing.
- Everyone else gets the existing free experience with no changes.

### 2.3 What Beta Testers Do

Checklist for each beta tester to execute:

```
[ ] Log in, confirm no billing UI visible initially (before being added to flag)
[ ] Get added to allowed_user_ids, refresh page
[ ] Confirm billing tab appears in Settings
[ ] Confirm upgrade CTA appears on gated features (pipeline add, PDF download, etc.)
[ ] Click "Upgrade to Pro" -> redirected to Stripe Checkout (test mode)
[ ] Use test card 4242 4242 4242 4242 -> complete checkout
[ ] Confirm redirect back to Parcel with plan = "pro"
[ ] Confirm all gated features now work (pipeline, portfolio, PDF, offer letter)
[ ] Go to Settings > Billing > Manage Subscription -> opens Stripe portal
[ ] Cancel subscription in portal
[ ] Confirm plan reverts to "free" after cancel
[ ] Confirm gated features re-lock
[ ] Use test card 4000 0000 0000 0002 (decline) -> confirm graceful error
[ ] Use test card 4000 0025 0000 3155 (3D Secure) -> confirm auth flow works
```

### 2.4 Monitoring During Soft Launch

```
[ ] Check Railway logs every 4 hours for billing ERROR entries
[ ] Check Stripe Dashboard > Webhooks for failed deliveries daily
[ ] Verify subscription records in DB match Stripe Dashboard
[ ] Verify usage_records table increments correctly
[ ] Confirm demo account is unaffected (plan = "demo", no billing UI)
```

---

## 3. Phase 2: Public Launch (Billing Visible to All New Users)

**Duration:** 1-2 weeks.
**Who sees it:** All new sign-ups + percentage-based rollout of existing users.
**Goal:** Validate at scale with real user behavior patterns.

### 3.1 Feature Flag Progression

```sql
-- Week 1: 10% of all users
UPDATE feature_flags SET rollout_percentage = 10 WHERE name = 'billing_enabled';

-- Week 2: 50% of all users (if no issues)
UPDATE feature_flags SET rollout_percentage = 50 WHERE name = 'billing_enabled';

-- Week 3: 100% of all users
UPDATE feature_flags SET rollout_percentage = 100 WHERE name = 'billing_enabled';

-- Week 4: Remove the flag entirely (clean up code)
DELETE FROM feature_flags WHERE name = 'billing_enabled';
```

### 3.2 Public Launch Checklist

Before moving from 0% to 10%:

```
[ ] All soft-launch issues resolved
[ ] Pricing page is live on the marketing site
[ ] Terms of Service updated with billing terms
[ ] Privacy policy updated with Stripe data processing disclosure
[ ] Stripe test-mode -> live-mode transition complete (see Section 9)
[ ] At least 3 end-to-end successful real charges processed and refunded
[ ] Error handling verified for all failure modes (decline, 3DS, network timeout)
[ ] Rollback procedure documented and practiced in staging
```

### 3.3 Pricing Page Deployment

The pricing page on the landing site (`Landing.tsx`) becomes a real conversion point. Deploy it alongside the frontend billing code. Use the feature flag to control whether the "Get Started" buttons link to `/register?plan=pro` or just `/register`.

---

## 4. Phase 3: Existing User Transition

**Who:** Demo users, beta users who signed up during free-only period.
**Goal:** Move everyone to the proper tier system without disruption.

### 4.1 Demo Account

```sql
-- Demo account stays as-is. Set plan = "demo" (pro-level access, no Stripe).
UPDATE users SET plan = 'demo' WHERE email = 'demo@parcel.app';
```

No billing UI, no Stripe customer, no upgrade prompts. The demo account is exempt from all billing logic.

### 4.2 Existing Free Users

All existing users who signed up before billing launched:

```sql
-- Migration script: ensure every user without a subscription gets a free-tier record
INSERT INTO subscriptions (id, user_id, plan, status, created_at, updated_at)
SELECT gen_random_uuid(), u.id, 'free', 'active', NOW(), NOW()
FROM users u
LEFT JOIN subscriptions s ON s.user_id = u.id
WHERE s.id IS NULL AND u.email != 'demo@parcel.app';
```

These users keep full access to everything they currently have. Their existing deals, pipeline cards, portfolio entries, and documents remain accessible. The free tier limits apply only to NEW actions going forward.

### 4.3 Communication Timeline

```
T-14 days:  Email all users: "We're introducing Pro plans — here's what's coming"
T-7 days:   Email all users: "Billing launches next week — your existing data is safe"
T-0:        Launch. Email: "Pro is live. Your free plan includes [limits]. Upgrade for unlimited."
T+7 days:   Email free users who hit limits: "Running low? Upgrade to Pro."
T+30 days:  Evaluate conversion rate, adjust free tier limits if needed.
```

### 4.4 Grandfather Clause (Optional)

If early beta users deserve special treatment:

```sql
-- Grant 3 months free Pro to early adopters (created before billing launch)
INSERT INTO subscriptions (id, user_id, plan, status, current_period_end, created_at, updated_at)
SELECT gen_random_uuid(), u.id, 'pro', 'active',
       NOW() + INTERVAL '3 months', NOW(), NOW()
FROM users u
WHERE u.created_at < '2026-05-01'  -- adjust date
  AND u.email != 'demo@parcel.app'
  AND NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.user_id = u.id AND s.plan != 'free');
```

After 3 months, a background job flips these to free unless they subscribe.

---

## 5. Database Migration Plan

### 5.1 Principles

1. **Additive only.** New tables and nullable columns. Never alter or drop existing columns.
2. **Backward compatible.** The app must work both before and after the migration, during the deploy window.
3. **Run before app start.** Railway start command: `alembic upgrade head && uvicorn main:app --host 0.0.0.0 --port $PORT`

### 5.2 Migration: Add Billing Tables

This is a single Alembic migration. It creates 4 new tables and adds 2 columns to `users`.

```bash
cd backend
alembic revision --autogenerate -m "add billing tables and user plan fields"
```

**Migration contents:**

```python
"""add billing tables and user plan fields

Revision ID: e5b8d2c47a16
Revises: d4a7e3b58f12
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision = "e5b8d2c47a16"
down_revision = "d4a7e3b58f12"


def upgrade():
    # --- New columns on users ---
    op.add_column("users", sa.Column("stripe_customer_id", sa.String(255), nullable=True))
    op.add_column("users", sa.Column("plan", sa.String(50), nullable=False, server_default="free"))
    op.create_index("ix_users_stripe_customer_id", "users", ["stripe_customer_id"], unique=True)

    # --- subscriptions table ---
    op.create_table(
        "subscriptions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("stripe_subscription_id", sa.String(255), nullable=True, unique=True),
        sa.Column("stripe_customer_id", sa.String(255), nullable=True),
        sa.Column("plan", sa.String(50), nullable=False, server_default="free"),
        sa.Column("status", sa.String(50), nullable=False, server_default="active"),
        sa.Column("current_period_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancel_at_period_end", sa.Boolean, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_subscriptions_user_id", "subscriptions", ["user_id"])
    op.create_index("ix_subscriptions_stripe_customer_id", "subscriptions", ["stripe_customer_id"])

    # --- usage_records table ---
    op.create_table(
        "usage_records",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("metric", sa.String(100), nullable=False),
        sa.Column("count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("period_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("period_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_usage_records_user_id", "usage_records", ["user_id"])
    op.create_unique_constraint(
        "uq_usage_records_user_metric_period",
        "usage_records",
        ["user_id", "metric", "period_start"],
    )

    # --- processed_stripe_events (idempotency) ---
    op.create_table(
        "processed_stripe_events",
        sa.Column("event_id", sa.String(255), primary_key=True),
        sa.Column("event_type", sa.String(100), nullable=False),
        sa.Column("processed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # --- feature_flags table ---
    op.create_table(
        "feature_flags",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(100), nullable=False, unique=True),
        sa.Column("enabled", sa.Boolean, server_default="false"),
        sa.Column("allowed_user_ids", JSONB, server_default="[]"),
        sa.Column("rollout_percentage", sa.Integer, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table("feature_flags")
    op.drop_table("processed_stripe_events")
    op.drop_table("usage_records")
    op.drop_table("subscriptions")
    op.drop_index("ix_users_stripe_customer_id", table_name="users")
    op.drop_column("users", "plan")
    op.drop_column("users", "stripe_customer_id")
```

### 5.3 Deploy Sequence

```
1. Take a Railway PostgreSQL snapshot (Dashboard > Database > Snapshots > Create)
2. Deploy migration to staging: railway run alembic upgrade head --environment staging
3. Run backend on staging, verify all existing endpoints still work
4. Test all billing endpoints on staging with Stripe test mode
5. Deploy to production: merge PR to main (Railway auto-deploys with start command)
6. Verify: railway run alembic current --environment production (should show e5b8d2c47a16)
7. Verify: all existing API endpoints return 200 (no schema breakage)
```

### 5.4 Why This Is Safe

- All new tables are additive. No existing tables are altered in a breaking way.
- `users.plan` has a `server_default="free"` so existing rows get the default automatically.
- `users.stripe_customer_id` is nullable, so existing rows get NULL (no Stripe link until they subscribe).
- The application code checks for the feature flag before invoking any billing logic.
- If the migration causes issues, rollback is `alembic downgrade d4a7e3b58f12` which drops the new tables and columns cleanly.

---

## 6. Feature Flag Strategy

### 6.1 Database-Driven Flags (No External Service)

At Parcel's current scale, a database table is sufficient. No LaunchDarkly, no PostHog.

**Backend check:**

```python
# backend/core/feature_flags.py
import hashlib
from sqlalchemy.orm import Session
from models.feature_flags import FeatureFlag


def is_feature_enabled(flag_name: str, user_id: str, db: Session) -> bool:
    flag = db.query(FeatureFlag).filter_by(name=flag_name).first()
    if not flag or not flag.enabled:
        return False
    if str(user_id) in (flag.allowed_user_ids or []):
        return True
    hash_val = int(hashlib.md5(f"{flag_name}:{user_id}".encode()).hexdigest(), 16)
    return (hash_val % 100) < flag.rollout_percentage
```

**Frontend check:**

```typescript
// GET /api/v1/features returns { billing_enabled: true/false }
const { data: flags } = useQuery({ queryKey: ['features'], queryFn: getFeatureFlags })

// In components:
if (!flags?.billing_enabled) return null  // hide billing UI entirely
```

### 6.2 What the Flag Controls

| UI/Behavior | Flag OFF (default) | Flag ON |
|---|---|---|
| Settings > Billing tab | Hidden | Visible |
| Upgrade CTA on gated features | Hidden | Shown (with free tier limits) |
| Pricing section on Landing page | Shows "Coming Soon" or nothing | Shows real pricing + checkout CTAs |
| `require_tier()` backend guard | Always passes (no restrictions) | Enforces tier limits |
| `check_quota()` backend guard | Always passes (unlimited) | Counts usage and enforces limits |
| `/api/v1/billing/*` routes | Return 404 | Active |

### 6.3 Flag Lifecycle

```
Phase 1 (soft launch):   enabled=true,  allowed_user_ids=[testers],  rollout=0
Phase 2 (public 10%):    enabled=true,  allowed_user_ids=[testers],  rollout=10
Phase 2 (public 50%):    enabled=true,  allowed_user_ids=[],         rollout=50
Phase 2 (public 100%):   enabled=true,  allowed_user_ids=[],         rollout=100
Phase 3 (cleanup):       DELETE flag.   Remove all flag checks from code.
```

---

## 7. Rollback Plan

### 7.1 Severity Tiers

| Tier | Example | Action |
|---|---|---|
| P0 — Users charged wrong amount | Wrong price ID, double charge | Immediate rollback + Stripe refunds |
| P1 — Webhook processing broken | Events not reaching handler | Hotfix deploy, Stripe replays missed events |
| P2 — Plan status out of sync | User shows "free" but paid in Stripe | Hotfix, manual DB correction |
| P3 — UI display bug | Wrong plan name on Settings page | Fix in next regular deploy |

### 7.2 Code Rollback — Railway

```bash
# Option 1: Railway Dashboard
# Dashboard > Service > Deployments > click last healthy deployment > "Rollback"

# Option 2: Railway CLI
railway rollback

# Option 3: Git revert
git revert <billing-commit-sha>
git push origin main
# Railway auto-deploys from main
```

Railway keeps the previous deployment running until the new one passes the health check. Rollback is instant because Railway promotes the previous image.

### 7.3 Code Rollback — Vercel

```bash
# Vercel Dashboard > Deployments > find pre-billing deployment > "..." > "Promote to Production"
# This is instant — no rebuild needed.
```

### 7.4 Database Rollback

```bash
# ONLY if migration itself caused the problem (rare for additive-only migrations)
# 1. Take a snapshot first
# 2. Downgrade
railway run alembic downgrade d4a7e3b58f12 --environment production
```

**Warning:** This drops all billing tables and any data in them. Only use if the migration itself is the problem. Code rollback alone is sufficient in 99% of cases because additive tables do not break existing functionality.

### 7.5 Stripe Rollback

Stripe operations (charges, subscriptions) cannot be "undone" via deployment rollback. If users were incorrectly charged:

```bash
# List recent charges
stripe charges list --limit 20

# Refund specific charges
stripe refunds create --charge ch_xxx

# Cancel incorrectly created subscriptions
stripe subscriptions cancel sub_xxx --prorate
```

### 7.6 Feature Flag Kill Switch

The fastest rollback that requires no deployment:

```sql
-- Instantly hide billing from all users
UPDATE feature_flags SET enabled = false WHERE name = 'billing_enabled';
```

The next API request from any user will see `billing_enabled = false` and all billing UI disappears. Backend guards revert to "always allow" mode (no tier restrictions). This is the preferred first response to any billing issue.

---

## 8. Monitoring Checklist — First 48 Hours

### 8.1 Stripe Dashboard (check every 2 hours)

```
[ ] Webhooks > endpoint delivery success rate > 99%
[ ] Payments > no unexpected charges
[ ] Customers > new customers match sign-up rate
[ ] Subscriptions > statuses are active/trialing as expected
[ ] Events > no events stuck in "pending retry"
```

### 8.2 Railway Metrics (check every 4 hours)

```
[ ] CPU usage < 70% (billing adds webhook processing load)
[ ] Memory usage < 80%
[ ] Response time p95 < 2s on billing endpoints
[ ] No OOM kills or restarts
[ ] Database connections < 40 (current max_overflow)
[ ] No 5xx responses on any billing endpoint
```

### 8.3 Application Logs (continuous via log drain)

```
[ ] No "billing_error" log entries
[ ] No "SECURITY VIOLATION" from validate_no_card_data guard
[ ] No "STRIPE_WEBHOOK_SECRET not configured" errors
[ ] No "Duplicate Stripe event" at unusual frequency (>5/min = suspicious)
[ ] No SQLAlchemy pool overflow warnings
```

### 8.4 End-to-End Verification (manual, 2x per day)

```
[ ] Create a new account -> plan defaults to "free"
[ ] Upgrade to Pro via checkout -> plan = "pro" within 10 seconds
[ ] Verify webhook delivered and subscription record created in DB
[ ] Access a gated feature (pipeline add) -> works as Pro
[ ] Cancel via Stripe portal -> plan reverts to "free" within 30 seconds
[ ] Verify gated feature is re-locked
[ ] Demo account unaffected -> still has full access, no billing UI
```

### 8.5 Alerts to Set Up Before Launch

| Alert | Tool | Condition | Notify |
|---|---|---|---|
| Webhook failures | Stripe Dashboard | Any failed delivery | Email |
| Billing endpoint 5xx | Railway metrics / Better Stack | > 1% over 5 min | Slack / SMS |
| Payment failure spike | Stripe Dashboard | > 5% failure rate | Email |
| API latency spike | Better Stack | p95 > 3s on `/billing/*` | Slack |
| Database pool exhaustion | Railway logs | Pool overflow events | Slack / SMS |

---

## 9. Stripe Test to Live Transition

This is a one-session operation. Do not leave it half-done overnight.

### 9.1 Pre-Transition Checklist

```
[ ] Stripe business verification complete (Dashboard > Settings > Account)
[ ] Payouts enabled and bank account linked
[ ] All soft-launch testing complete — no open issues
[ ] Live-mode products and prices created in Stripe Dashboard
[ ] Note new live-mode price IDs (they differ from test-mode IDs)
[ ] Live-mode webhook endpoint registered for api.parceldesk.io
[ ] Note new live-mode webhook signing secret (whsec_live_...)
```

### 9.2 Transition Steps (execute in order, one session)

```bash
# Step 1: Create live products + prices in Stripe Dashboard (live mode toggle ON)
#   -> Note: price_live_xxx (Pro), price_live_yyy (Team)

# Step 2: Register live webhook endpoint
#   Stripe Dashboard > Developers > Webhooks > Add endpoint (in LIVE mode)
#   URL: https://api.parceldesk.io/api/v1/billing/webhook
#   Events: checkout.session.completed, customer.subscription.created,
#           customer.subscription.updated, customer.subscription.deleted,
#           invoice.payment_succeeded, invoice.payment_failed, customer.created
#   -> Note: whsec_live_xxx

# Step 3: Update Railway production environment variables
railway variables set STRIPE_SECRET_KEY=sk_live_... --environment production
railway variables set STRIPE_WEBHOOK_SECRET=whsec_live_... --environment production
railway variables set STRIPE_PRICE_ID_PRO=price_live_... --environment production
railway variables set STRIPE_PRICE_ID_TEAM=price_live_... --environment production
# Railway auto-deploys on env var change

# Step 4: Update Vercel production environment variable
vercel env rm VITE_STRIPE_PUBLISHABLE_KEY production
vercel env add VITE_STRIPE_PUBLISHABLE_KEY production
# Enter: pk_live_...
# Trigger redeploy:
vercel --prod

# Step 5: Wait for both deploys to complete (~2-3 min)

# Step 6: Test with a real card
#   - Create a checkout session via the app
#   - Complete payment with a real card ($49 Pro plan)
#   - Verify webhook delivery in Stripe Dashboard (live mode)
#   - Verify subscription record created in production DB
#   - IMMEDIATELY refund the charge:
stripe refunds create --charge ch_live_xxx

# Step 7: Verify webhook delivery for the refund event

# Step 8: Enable Stripe Radar (automatic on live mode, but review settings)
#   Dashboard > Radar > Rules > Enable CVC check, postal code check
```

### 9.3 Post-Transition Verification

```
[ ] Hit /health/deep endpoint -> Stripe check returns "ok"
[ ] Create checkout session -> URL starts with checkout.stripe.com (not test)
[ ] Stripe Dashboard shows live mode activity
[ ] No test-mode events appearing in live-mode webhook log
[ ] Staging environment still uses test keys (verify independently)
```

### 9.4 Key Rotation Schedule

After initial setup, rotate keys on this schedule:

| Key | Rotation Frequency | Procedure |
|---|---|---|
| `STRIPE_SECRET_KEY` | Every 12 months or on compromise | Generate restricted key in Dashboard, update Railway, verify, revoke old |
| `STRIPE_WEBHOOK_SECRET` | Every 12 months or on compromise | Create new endpoint, dual-secret verify, delete old endpoint |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Only on account change | Update Vercel, redeploy |

---

## 10. Railway Deployment Configuration Changes

### 10.1 Start Command Update

**Current start command (Railway):**
```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

**New start command:**
```bash
alembic upgrade head && uvicorn main:app --host 0.0.0.0 --port $PORT
```

This runs pending migrations before accepting traffic. Railway's health check gates traffic until the app responds on `/health`.

Set via Railway Dashboard > Service > Settings > Deploy > Start Command.

### 10.2 Health Check Configuration

```
Railway Dashboard > Service > Settings > Health Check
  Path: /health
  Interval: 10s
  Timeout: 5s
  Healthy threshold: 1
  Unhealthy threshold: 3
```

The `/health` endpoint stays lightweight (no DB/Stripe calls) for fast deployment gating. The `/health/deep` endpoint (with DB + Stripe checks) is for external monitoring only.

### 10.3 Resource Scaling

Current state is fine for launch. Monitor and adjust:

```
Railway Dashboard > Service > Settings > Scaling
  vCPU: 0.5 (increase to 1 if p95 > 1s)
  Memory: 512MB (increase to 1GB if usage > 80%)
  Replicas: 1 (increase to 2 if sustained CPU > 70%)
```

Before scaling to 2+ replicas, verify:
- Webhook endpoint is idempotent (ProcessedStripeEvent table handles this)
- No in-memory state (Parcel is already stateless)

### 10.4 Cost Alerts

```
Railway Dashboard > Project Settings > Usage Alerts
  Alert at $15/month (80% of expected)
  Alert at $20/month (100% of expected)
```

### 10.5 Railway Environment Summary

| Environment | Backend URL | Stripe Mode | DB | Purpose |
|---|---|---|---|---|
| production | api.parceldesk.io | Live (after transition) | Production PG | Real users |
| staging | parcel-backend-staging-xxx.up.railway.app | Test | Staging PG | Testing |

---

## 11. CI/CD Updates for Billing Tests

### 11.1 Updated `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  frontend:
    name: Frontend (TypeScript + Tests)
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npx tsc --noEmit

      - name: Run tests
        run: npx vitest run

      - name: Build
        run: npm run build

  backend:
    name: Backend (Python + Tests)
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
          cache: pip
          cache-dependency-path: backend/requirements.txt

      - name: Install dependencies
        run: pip install -r requirements.txt

      - name: Install test dependencies
        run: pip install pytest httpx

      - name: Run tests
        env:
          TESTING: "1"
          ANTHROPIC_API_KEY: test-key
          JWT_SECRET_KEY: test-secret-for-ci
          STRIPE_SECRET_KEY: ${{ secrets.STRIPE_TEST_SECRET_KEY }}
          STRIPE_WEBHOOK_SECRET: whsec_test_fake_for_unit_tests
          STRIPE_PRICE_ID_PRO: price_test_fake_for_unit_tests
          STRIPE_PRICE_ID_TEAM: price_test_fake_for_unit_tests
        run: python -m pytest tests/ -v --tb=short
```

### 11.2 Changes from Current CI

| Change | Reason |
|---|---|
| Added `STRIPE_SECRET_KEY` env var | Billing tests need a Stripe key (mocked calls, but the import still reads the env) |
| Added `STRIPE_WEBHOOK_SECRET` env var | Webhook signature tests need a secret to construct test signatures |
| Added `STRIPE_PRICE_ID_PRO` env var | Checkout tests reference the price ID |
| Added `STRIPE_PRICE_ID_TEAM` env var | Same |
| `stripe` is already in `requirements.txt` | Installed via `pip install -r requirements.txt`, no separate step needed |

### 11.3 Test Strategy

All billing tests mock Stripe API calls. No real Stripe API calls in CI.

```python
# backend/tests/test_billing.py
from unittest.mock import patch, MagicMock

class TestCheckoutSession:
    def test_create_checkout_session_pro_user_blocked(self, auth_client):
        """Pro users cannot create another checkout session."""
        # ... test with pro_user fixture

    def test_create_checkout_session_free_user(self, auth_client):
        """Free users can create a checkout session."""
        with patch("routers.billing.stripe.checkout.Session.create") as mock:
            mock.return_value = MagicMock(url="https://checkout.stripe.com/test")
            resp = auth_client.post("/api/v1/billing/checkout", json={"plan": "pro"})
            assert resp.status_code == 200
            assert "url" in resp.json()

class TestWebhook:
    def test_invalid_signature_rejected(self, client):
        resp = client.post(
            "/api/v1/billing/webhook",
            content=b'{"fake": "payload"}',
            headers={"stripe-signature": "bad_sig"},
        )
        assert resp.status_code == 400

    def test_duplicate_event_skipped(self, client, db):
        """Events already in processed_stripe_events are skipped."""
        # ... seed event, send same event ID, verify 200 but no side effects

class TestTierGuards:
    def test_free_user_blocked_from_pipeline_add(self, auth_client):
        resp = auth_client.post("/api/v1/pipeline/", json={"deal_id": "..."})
        assert resp.status_code == 403
        assert resp.json()["code"] == "TIER_REQUIRED"

    def test_pro_user_allowed_pipeline_add(self, pro_auth_client):
        resp = pro_auth_client.post("/api/v1/pipeline/", json={"deal_id": "..."})
        assert resp.status_code in (200, 201)
```

### 11.4 New Test Fixtures (conftest.py additions)

```python
# backend/tests/conftest.py additions

@pytest.fixture
def pro_user(db):
    """User with Pro plan and subscription."""
    user = User(
        id=uuid.uuid4(),
        name="Pro Tester",
        email="pro@test.com",
        password_hash=get_password_hash("testpass123"),
        role="investor",
        plan="pro",
    )
    db.add(user)
    subscription = Subscription(
        id=uuid.uuid4(),
        user_id=user.id,
        plan="pro",
        status="active",
        stripe_subscription_id="sub_test_fake",
        stripe_customer_id="cus_test_fake",
    )
    db.add(subscription)
    db.commit()
    return user

@pytest.fixture
def pro_auth_client(client, pro_user):
    """Authenticated HTTP client for a Pro-tier user."""
    resp = client.post("/api/v1/auth/login", json={
        "email": "pro@test.com",
        "password": "testpass123",
    })
    return client  # cookies are set on the client
```

---

## 12. Communication Plan

### 12.1 Email Sequence

All emails sent via Resend (already in `requirements.txt`).

**Email 1: Announcement (T-14 days before public launch)**

```
Subject: Parcel Pro is coming — here's what to expect

Hi {name},

We're introducing Parcel Pro — a paid plan that unlocks unlimited deals,
AI chat, pipeline management, portfolio tracking, and PDF reports.

What's changing:
- Free accounts will have usage limits on deal analyses and AI chat
- Pro ($49/mo) removes all limits and adds pipeline, portfolio, and PDF reports
- Your existing data is safe and accessible regardless of your plan

What's NOT changing:
- Everything you've built so far stays exactly as-is
- Free accounts still include [X] deal analyses and [Y] AI chats per month

We'll share more details next week. No action needed from you right now.

— Ivan, Parcel
```

**Email 2: One-week notice (T-7 days)**

```
Subject: Billing goes live next week — your data is safe

Hi {name},

Quick update: Parcel Pro launches on [date].

Your free plan includes:
- [X] deal analyses per month
- [Y] AI chat messages per month
- [Z] document uploads per month
- Read-only pipeline view

Pro ($49/mo) includes:
- Unlimited everything
- Pipeline management (add, move, delete)
- Portfolio tracking
- PDF deal reports
- Offer letter generation

All your existing deals, documents, and data stay accessible. Free plan
limits only apply to NEW actions going forward.

Questions? Reply to this email.

— Ivan, Parcel
```

**Email 3: Launch day (T-0)**

```
Subject: Parcel Pro is live

Hi {name},

Parcel Pro is now available. Upgrade anytime from Settings > Billing.

[Upgrade to Pro — $49/mo]

If you'd like to stay on the free plan, no action needed. Your account
continues working with the limits described above.

— Ivan, Parcel
```

**Email 4: Nudge for free users hitting limits (T+7)**

```
Subject: You've used {X}% of your free plan this month

Hi {name},

You've used {used}/{limit} {resource} this month on your free plan.

Upgrade to Pro for unlimited access:
[Upgrade to Pro — $49/mo]

Your limit resets on {reset_date}.

— Ivan, Parcel
```

### 12.2 In-App Notifications

- Toast notification on first login after billing launch: "New! Parcel Pro is available. [Learn more]"
- Upgrade prompts on gated features show plan comparison
- Usage meter in chat header when approaching limit (>80%)

---

## 13. Go-Live Checklist (30 Items)

Verify every item before flipping the feature flag to public (Phase 2).

### Infrastructure (Items 1-10)

```
[  ] 1.  Railway production has all 4 Stripe env vars set (secret, webhook, price_pro, price_team)
[  ] 2.  Vercel production has VITE_STRIPE_PUBLISHABLE_KEY set
[  ] 3.  Railway start command includes `alembic upgrade head &&` prefix
[  ] 4.  Railway health check configured on /health endpoint
[  ] 5.  Billing migration deployed and verified (all 4 new tables exist)
[  ] 6.  feature_flags table seeded with billing_enabled = true, rollout = 0
[  ] 7.  Demo user has plan = "demo" in the users table
[  ] 8.  Staging environment fully functional with test-mode Stripe
[  ] 9.  Railway PostgreSQL snapshot taken (today's date)
[  ] 10. Cost alerts configured on Railway ($15 and $20 thresholds)
```

### Stripe Configuration (Items 11-17)

```
[  ] 11. Stripe business verification complete
[  ] 12. Live-mode products and prices created (note IDs)
[  ] 13. Live-mode webhook endpoint registered and verified
[  ] 14. Live-mode webhook signing secret set in Railway production
[  ] 15. Live keys (sk_live_, pk_live_) deployed to Railway and Vercel
[  ] 16. Stripe Radar enabled with CVC + postal code checks
[  ] 17. Test charge of $49 processed, webhook received, then refunded
```

### Security (Items 18-22)

```
[  ] 18. Webhook signature verification works (tested with invalid sig -> 400)
[  ] 19. CSRF protection active on checkout + portal endpoints
[  ] 20. Rate limits applied: 5/min on checkout, 100/min on webhook
[  ] 21. No card data fields in any PostgreSQL table (audit all models)
[  ] 22. HSTS headers configured on both Railway and Vercel
```

### Application Logic (Items 23-27)

```
[  ] 23. Free -> Pro upgrade flow works end-to-end (checkout -> webhook -> plan update)
[  ] 24. Pro -> cancel flow works (portal -> webhook -> plan downgrade)
[  ] 25. Tier guards block free users from pro-only features (403 with TIER_REQUIRED)
[  ] 26. Quota guards count usage and block at limit (403 with QUOTA_EXCEEDED)
[  ] 27. Demo account bypasses all billing checks (plan = "demo")
```

### Monitoring & Rollback (Items 28-30)

```
[  ] 28. External uptime monitor configured for /health and /health/deep
[  ] 29. Stripe webhook failure email alerts enabled
[  ] 30. Rollback procedure documented and tested in staging within last 7 days
```

---

## 14. CRITICAL DECISIONS

These are decisions that need Ivan's explicit input before implementation. Each has a recommended option, but the tradeoff should be understood.

### Decision 1: Free Tier Limits — What Exact Numbers?

The entire billing UX depends on this. Needs to be generous enough that free users see value, restrictive enough that power users convert.

| Resource | Recommended Free Limit | Rationale |
|---|---|---|
| Deal analyses | 5 active (non-deleted) | Enough to evaluate the tool; power users create 10+ |
| AI chat messages | 25/month | Enough for 1-2 deep conversations; daily users need more |
| Document uploads | 3/month | Enough to test the feature; active users upload weekly |
| Pipeline | Read-only (view existing deals) | Shows the value; write access is the upgrade trigger |
| Portfolio | Blocked entirely | Pure pro feature, no free preview |
| PDF reports | Blocked entirely | High-value deliverable, strong upgrade trigger |
| Offer letters | Blocked entirely | AI cost per generation justifies gating |

**Decision needed:** Confirm or adjust these numbers before building the `plans.py` config.

### Decision 2: What Happens to Existing Users' Data When They Hit Free Limits?

Two options:

- **Option A (recommended): Soft lock.** Existing data remains fully visible and accessible. Users can view, edit, and delete existing deals/documents. They just cannot CREATE new ones past the limit. This is the least hostile approach and prevents "you took my data" complaints.

- **Option B: Hard lock.** Once over the limit, all data beyond the free allowance becomes read-only or hidden until they upgrade. More aggressive conversion but generates negative sentiment.

**Decision needed:** Option A or B?

### Decision 3: When to Switch from Test Mode to Live Mode?

Two strategies:

- **Option A (recommended): Switch BEFORE public launch.** The soft-launch testers use test cards (no real charges). Then switch to live mode before opening to the public. This means the first public users pay real money from day one.

- **Option B: Launch publicly in test mode.** All early users see billing but no real charges. Creates confusion ("why was I not charged?") and requires retroactive Stripe customer setup when switching to live.

**Decision needed:** Confirm Option A.

### Decision 4: Trial Period?

- **Option A: No trial.** Free tier is the "trial." Users can use limited features indefinitely and upgrade when ready.

- **Option B: 14-day Pro trial for new sign-ups.** Higher conversion but complex logic (trial expiration, email reminders, grace period). Stripe supports this natively with `trial_period_days` on the subscription.

**Decision needed:** Launch without trial (Option A) and add trial later if conversion is low?

### Decision 5: Annual Pricing?

- **Monthly only at launch** keeps it simple. One price ID, one checkout flow.
- **Annual discount** (e.g., $39/mo billed annually = $468/year) improves LTV but adds a second price ID and plan comparison UI.

**Decision needed:** Monthly-only for v1, or include annual from day one?

### Decision 6: Staging Environment — Permanent or Temporary?

- **Option A (recommended): Permanent.** ~$5/month. Essential for billing development, key rotation testing, and migration dry-runs. Pays for itself by preventing one production incident.

- **Option B: Temporary.** Spin up for billing development, tear down after launch. Saves $5/month but leaves no safe testing ground for future billing changes.

**Decision needed:** Confirm permanent staging.

### Decision 7: Grandfather Existing Beta Users?

If users signed up before billing launched, should they get any grace period?

- **Option A: No special treatment.** They start on the free tier like everyone else.
- **Option B: 30-day Pro access.** Thank them for being early. Low cost, good will.
- **Option C: 90-day Pro access.** Generous, but delays revenue from users most likely to convert.

**Decision needed:** Which option, and what cutoff date for "early" users?

### Decision 8: Webhook Endpoint Rate Limiting

The research recommends 100/min on the webhook endpoint. Two perspectives:

- **Option A: @limiter.exempt** — fully exempt the webhook endpoint from rate limiting. Stripe retries are legitimate and bursty. The endpoint is protected by signature verification, not rate limits.

- **Option B: 100/min limit** — defense in depth, but risks throttling legitimate Stripe retries during subscription bulk operations.

**Decision needed:** Exempt or 100/min?

### Decision 9: Billing Page Location

- **Option A: `/settings/billing`** — nested under existing Settings page. Cleaner URL structure.
- **Option B: `/billing`** — top-level route. More prominent, easier to link to.

**Decision needed:** Which route?

### Decision 10: When to Remove the Feature Flag Code?

Feature flags add complexity. Two approaches:

- **Option A: Remove at 100% rollout.** As soon as the flag hits 100% and stays stable for 1 week, delete the flag row, the `feature_flags` table, and all flag checks in code. Clean codebase.

- **Option B: Keep the flag infrastructure permanently.** Useful for future feature rollouts beyond billing. The `feature_flags` table and `is_feature_enabled()` function become permanent infrastructure.

**Decision needed:** Option A (clean up) or Option B (keep for future use)?
