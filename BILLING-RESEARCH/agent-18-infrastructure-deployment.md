# Agent 18: Infrastructure & Deployment Research for Billing

**Scope:** Deploying Stripe billing safely on Parcel's Railway (backend) + Vercel (frontend) stack.
**Date:** 2026-03-28

---

## 1. Environment Variable Management

### Current State

Parcel loads secrets via `python-dotenv` and `os.getenv()` in `backend/main.py` and `backend/database.py`. Railway injects environment variables at the service level. The frontend on Vercel uses `VITE_` prefixed variables (client-exposed) or server-side env vars for build-time injection.

### Stripe Keys Required

| Variable | Where | Purpose |
|---|---|---|
| `STRIPE_SECRET_KEY` | Backend (Railway) | Server-side API calls |
| `STRIPE_PUBLISHABLE_KEY` | Frontend (Vercel) | Client-side Stripe.js / Elements |
| `STRIPE_WEBHOOK_SECRET` | Backend (Railway) | Verify webhook signatures |
| `STRIPE_PRICE_ID_PRO` | Backend (Railway) | Checkout session creation |
| `STRIPE_PRICE_ID_TEAM` | Backend (Railway) | Checkout session creation |

### Railway Configuration

Railway supports per-environment (and per-service) variables. The recommended approach:

```
# Railway CLI — set variables per environment
railway variables set STRIPE_SECRET_KEY=sk_test_... --environment staging
railway variables set STRIPE_SECRET_KEY=sk_live_... --environment production

railway variables set STRIPE_WEBHOOK_SECRET=whsec_... --environment staging
railway variables set STRIPE_WEBHOOK_SECRET=whsec_... --environment production
```

Railway also supports **shared variables** across services in a project. For Parcel, keep Stripe keys scoped to the backend service only — never expose `STRIPE_SECRET_KEY` to any other service.

**Critical:** Railway's PostgreSQL plugin auto-injects `DATABASE_URL`. Parcel already reads this correctly in `database.py`. No changes needed there.

### Vercel Configuration

```bash
# Vercel CLI — set publishable key (client-safe)
vercel env add VITE_STRIPE_PUBLISHABLE_KEY production
# Enter: pk_live_...

vercel env add VITE_STRIPE_PUBLISHABLE_KEY preview
# Enter: pk_test_...

vercel env add VITE_STRIPE_PUBLISHABLE_KEY development
# Enter: pk_test_...
```

**Naming convention:** Vite requires the `VITE_` prefix for client-exposed variables. This is already the pattern Parcel uses for `VITE_API_URL`.

### Local Development (.env)

```env
# backend/.env (gitignored)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...  # from `stripe listen --forward-to`
STRIPE_PRICE_ID_PRO=price_test_...
STRIPE_PRICE_ID_TEAM=price_test_...

# frontend/.env.local (gitignored)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Pydantic Settings Pattern

Parcel already uses `pydantic-settings`. Add Stripe config to a settings class:

```python
# backend/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_id_pro: str = ""
    stripe_price_id_team: str = ""

    class Config:
        env_file = ".env"

settings = Settings()
```

This validates at startup — if a required key is missing, the app fails fast instead of silently returning `None` from `os.getenv`.

---

## 2. Stripe Test Mode to Live Mode Transition Checklist

Stripe uses entirely separate key pairs for test and live mode. The transition is not a "switch" — it requires deliberate reconfiguration.

### Pre-Launch Checklist

1. **Create live-mode products and prices in the Stripe Dashboard.** Test-mode `price_` IDs do not carry over. You will get new `price_live_...` IDs.
2. **Register a live-mode webhook endpoint** at `https://api.parceldesk.io/api/v1/billing/webhook` (or whatever the Railway public URL is). Subscribe to events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`.
3. **Copy the live webhook signing secret** (`whsec_live_...`) and set it as `STRIPE_WEBHOOK_SECRET` in Railway production.
4. **Replace `sk_test_` with `sk_live_`** in Railway production variables.
5. **Replace `pk_test_` with `pk_live_`** in Vercel production variables. Trigger a redeployment.
6. **Update price IDs** in Railway production environment.
7. **Test a real $1 charge** using a real card. Refund it immediately.
8. **Verify webhook delivery** in Stripe Dashboard > Developers > Webhooks. Confirm 200 responses.
9. **Enable Stripe Radar** for fraud protection (automatic on live mode, but review rule settings).
10. **Enable billing portal** in Stripe Dashboard if using Stripe's hosted portal for subscription management.
11. **Check Stripe Tax** configuration if collecting tax (address-based tax with Stripe Tax, or manual).

### Keys You Must Never Do

- Never commit `sk_live_` or `sk_test_` keys to Git.
- Never use `pk_live_` in development or staging environments.
- Never use live-mode webhook secrets with test-mode events (signature verification will fail).
- Never hardcode price IDs in source code — always use environment variables.

---

## 3. Webhook Endpoint Deployment

### Railway Public URL

Railway assigns a public URL to each service: `<service-name>-<random>.up.railway.app`. You can also configure a custom domain. For Parcel:

- **Railway default:** `https://parcel-backend-production-xxxx.up.railway.app`
- **Custom domain (recommended):** `https://api.parceldesk.io`

To set up a custom domain on Railway:
1. Go to Railway Dashboard > Service > Settings > Custom Domain.
2. Add `api.parceldesk.io`.
3. Railway provides a CNAME target. Add a CNAME record in your DNS provider.
4. Railway provisions a TLS certificate automatically.

### Stripe Webhook Registration

```bash
# Using Stripe CLI
stripe webhooks create \
  --url https://api.parceldesk.io/api/v1/billing/webhook \
  --events checkout.session.completed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.payment_succeeded,invoice.payment_failed,customer.created
```

Or via Stripe Dashboard > Developers > Webhooks > Add Endpoint.

### Webhook Endpoint Implementation Notes

- The webhook endpoint MUST bypass authentication middleware (Stripe calls it, not a logged-in user).
- The endpoint MUST verify the `Stripe-Signature` header using `stripe.Webhook.construct_event()`.
- The endpoint MUST return 200 quickly (within 5 seconds). Offload heavy work to background tasks.
- Stripe retries failed webhooks (non-2xx) for up to 3 days with exponential backoff.
- The endpoint MUST be idempotent — Stripe may send the same event multiple times.

### FastAPI Webhook Route Skeleton

```python
@router.post("/billing/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.stripe_webhook_secret
        )
    except (ValueError, stripe.error.SignatureVerificationError):
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Idempotency: check if event.id already processed
    # Process event.type ...
    return {"status": "ok"}
```

### Rate Limiting Consideration

Parcel uses `slowapi` for rate limiting (see `backend/limiter.py`). The webhook endpoint should be **excluded from rate limiting** since Stripe may send bursts of events. Either:
- Exempt the route: `@limiter.exempt`
- Or use a higher limit for the webhook path.

---

## 4. Database Migration Strategy (Zero-Downtime)

### Current Alembic Setup

Parcel has 5 existing migrations in `backend/alembic/versions/`. The `alembic.ini` references `backend/alembic/` as the script location. The `env.py` reads `DATABASE_URL` from the environment.

### Zero-Downtime Migration Rules for Billing Tables

Billing tables (subscriptions, invoices, payment_methods, etc.) must be added without downtime. Key principles:

1. **Additive-only migrations.** Adding new tables or nullable columns is always safe.
2. **Never rename or drop columns** in a single migration. Use a multi-step process:
   - Step 1: Add new column (nullable).
   - Step 2: Deploy code that writes to both old and new columns.
   - Step 3: Backfill data.
   - Step 4: Deploy code that reads from new column only.
   - Step 5: Drop old column.
3. **Never add NOT NULL constraints without defaults** on existing tables with data.
4. **Use `CREATE INDEX CONCURRENTLY`** for indexes on large tables (requires running raw SQL in Alembic, not `op.create_index`).

### Migration for Billing Tables (Example)

```python
"""add billing tables"""

def upgrade():
    op.create_table(
        "subscriptions",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.dialects.postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id"), nullable=False),
        sa.Column("stripe_customer_id", sa.String(255), nullable=False),
        sa.Column("stripe_subscription_id", sa.String(255), nullable=True),
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

def downgrade():
    op.drop_table("subscriptions")
```

### Railway Deployment Migration Flow

Railway runs the start command on every deploy. Modify the start command to run migrations first:

**Railway Start Command:**
```bash
alembic upgrade head && uvicorn main:app --host 0.0.0.0 --port $PORT
```

This runs migrations before the app starts accepting traffic. Railway's health check will gate traffic until the app responds.

**Risk:** If a migration is slow (e.g., backfilling data), the deploy will be slow. For large data migrations, run them as a separate one-off Railway command:
```bash
railway run alembic upgrade head --environment production
```

---

## 5. Rollback Plan

### Scenario: Billing Code Bug in Production

**Severity tiers:**

| Tier | Example | Response |
|---|---|---|
| P0 | Users charged wrong amount | Immediate rollback, refund affected users |
| P1 | Webhook processing fails silently | Hotfix deploy, replay missed webhooks |
| P2 | UI shows wrong plan status | Hotfix deploy, no data impact |
| P3 | Minor display bug on billing page | Fix in next regular deploy |

### Rollback Procedures

**Code rollback (Railway):**
Railway keeps previous deployments. To rollback:
1. Railway Dashboard > Deployments > click previous healthy deployment > "Rollback".
2. Or via CLI: `railway rollback` (rolls back to previous deployment).

**Code rollback (Vercel):**
Vercel also keeps all deployments. To rollback:
1. Vercel Dashboard > Deployments > find the last good deployment > "..." > "Promote to Production".
2. This is instant (no rebuild needed).

**Database rollback (Alembic):**
```bash
# Downgrade one revision
railway run alembic downgrade -1 --environment production

# Downgrade to a specific revision
railway run alembic downgrade f6c95c03e2a5 --environment production
```

**CAUTION:** Database downgrades that drop billing tables will destroy data. Always take a database snapshot before running migrations in production (Railway supports manual snapshots).

**Stripe-side rollback:**
- Stripe operations (charges, subscriptions) cannot be "rolled back" in the database sense.
- Incorrect charges must be refunded via Stripe API: `stripe.Refund.create(charge=ch_...)`.
- Incorrect subscription changes must be manually corrected via Stripe Dashboard or API.
- This is why billing code should be deployed with extra caution and thorough testing.

### Pre-Deployment Checklist

1. Take a Railway PostgreSQL snapshot.
2. Run migrations against a staging database first.
3. Deploy to staging and verify Stripe test-mode webhook flow end to end.
4. Deploy to production.
5. Monitor webhook success rate in Stripe Dashboard for 30 minutes.
6. If anything is wrong, rollback Railway deployment immediately (code rollback does not require database downgrade if migrations were additive-only).

---

## 6. Monitoring & Failure Detection

### What to Monitor

| Signal | Tool | Alert Threshold |
|---|---|---|
| Webhook endpoint 5xx rate | Railway metrics / Stripe Dashboard | > 1% over 5 min |
| Webhook delivery failures | Stripe Dashboard > Webhooks | Any failed delivery |
| Payment failure rate | Stripe Dashboard > Payments | > 5% failure rate |
| Subscription churn anomaly | Stripe Billing Dashboard | Unusual spike |
| API latency (billing routes) | Railway metrics | p95 > 2s |
| Database connection pool exhaustion | SQLAlchemy logs | Pool overflow events |
| Error logs (billing module) | Railway log drain | Any ERROR level |

### Railway Log Drain Setup

Railway supports log drains to external services. Recommended setup:

```
Railway Dashboard > Project Settings > Log Drain
  - URL: https://logs.betterstack.com/... (or Datadog, Axiom, etc.)
  - Format: JSON
```

For a lean start, use **Better Stack (Logtail)** — free tier covers 1GB/month. Parse billing-specific errors with log queries.

### Stripe Webhook Monitoring

Stripe provides built-in webhook monitoring at Dashboard > Developers > Webhooks > select endpoint. It shows:
- Success rate (last 24h, 7d)
- Failed deliveries with response bodies
- Pending retries

**Set up Stripe email alerts:** Dashboard > Developers > Event destinations > configure notifications for failed webhook deliveries.

### Application-Level Alerting

Add structured logging to billing routes:

```python
import logging
logger = logging.getLogger("parcel.billing")

# On successful payment
logger.info("payment_succeeded", extra={
    "user_id": str(user.id),
    "amount": event.data.object.amount_paid,
    "subscription_id": event.data.object.subscription,
})

# On failure
logger.error("payment_processing_failed", extra={
    "user_id": str(user.id),
    "stripe_event_id": event.id,
    "error": str(e),
})
```

---

## 7. Stripe CLI for Local Development

### Setup

```bash
# Install
brew install stripe/stripe-cli/stripe

# Authenticate (opens browser)
stripe login

# Forward webhooks to local FastAPI
stripe listen --forward-to localhost:8000/api/v1/billing/webhook
# Outputs: whsec_... (use this as STRIPE_WEBHOOK_SECRET in backend/.env)
```

### Testing Locally

```bash
# Trigger a test event
stripe trigger checkout.session.completed

# Trigger payment failure
stripe trigger invoice.payment_failed

# Trigger subscription cancellation
stripe trigger customer.subscription.deleted
```

### Development Workflow

1. Start backend: `cd backend && source venv/bin/activate && uvicorn main:app --reload`
2. Start Stripe listener: `stripe listen --forward-to localhost:8000/api/v1/billing/webhook`
3. Start frontend: `cd frontend && npm run dev`
4. Use Stripe test cards:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - Requires auth: `4000 0025 0000 3155`
   - Insufficient funds: `4000 0000 0000 9995`

---

## 8. CI/CD: Testing Billing in GitHub Actions

### Current CI Setup

Parcel runs frontend (TypeScript + Vitest) and backend (pytest) jobs in `.github/workflows/ci.yml`. Backend tests use an in-memory SQLite database with dialect patches for PostgreSQL types.

### Adding Billing Tests to CI

**Strategy:** Use Stripe's test mode keys in CI, but mock external Stripe API calls in unit tests. Reserve real Stripe API calls for integration tests in a staging environment.

```yaml
# .github/workflows/ci.yml — updated backend job
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
      run: pip install pytest httpx stripe
    - name: Run tests
      env:
        TESTING: "1"
        ANTHROPIC_API_KEY: test-key
        JWT_SECRET_KEY: test-secret-for-ci
        STRIPE_SECRET_KEY: ${{ secrets.STRIPE_TEST_SECRET_KEY }}
        STRIPE_WEBHOOK_SECRET: whsec_test_fake_for_unit_tests
      run: python -m pytest tests/ -v --tb=short
```

### Unit Test Pattern (Mocked Stripe)

```python
# backend/tests/test_billing.py
from unittest.mock import patch, MagicMock

def test_create_checkout_session(auth_client, test_user):
    with patch("routers.billing.stripe.checkout.Session.create") as mock_create:
        mock_create.return_value = MagicMock(url="https://checkout.stripe.com/test")
        resp = auth_client.post("/api/v1/billing/checkout", json={"price_id": "price_test_123"})
        assert resp.status_code == 200
        assert "url" in resp.json()

def test_webhook_signature_verification(client):
    resp = client.post(
        "/api/v1/billing/webhook",
        content=b'{"fake": "payload"}',
        headers={"stripe-signature": "bad_sig"}
    )
    assert resp.status_code == 400
```

### GitHub Secrets to Configure

- `STRIPE_TEST_SECRET_KEY` — `sk_test_...` (safe for CI, test mode only)
- Do NOT add `sk_live_` keys to GitHub Secrets.

### Stripe Test Fixtures

Stripe provides fixture data via `stripe fixtures`. Create a fixtures file:

```json
// backend/tests/stripe_fixtures/checkout_complete.json
{
  "_meta": { "template_version": 0 },
  "fixtures": [
    {
      "name": "customer",
      "path": "/v1/customers",
      "method": "post",
      "params": { "email": "ci-test@parcel.dev" }
    },
    {
      "name": "price",
      "path": "/v1/prices",
      "method": "post",
      "params": {
        "unit_amount": 4900,
        "currency": "usd",
        "recurring": { "interval": "month" },
        "product_data": { "name": "Parcel Pro (CI Test)" }
      }
    }
  ]
}
```

Run in CI: `stripe fixtures backend/tests/stripe_fixtures/checkout_complete.json`

---

## 9. Feature Flags: Gradual Rollout

### Why Feature Flags for Billing

Deploying billing to 100% of users on day one is risky. A gradual rollout lets you:
- Test with internal accounts first.
- Expand to a small percentage of users.
- Kill the feature instantly if something breaks.

### Simple Implementation (No External Service)

For Parcel's current scale, a database-driven feature flag is sufficient:

```python
# backend/models.py (addition)
class FeatureFlag(Base):
    __tablename__ = "feature_flags"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False)
    enabled = Column(Boolean, default=False)
    allowed_user_ids = Column(JSONB, default=[])  # specific users
    rollout_percentage = Column(Integer, default=0)  # 0-100
```

```python
# backend/core/feature_flags.py
import hashlib

def is_feature_enabled(flag_name: str, user_id: str, db: Session) -> bool:
    flag = db.query(FeatureFlag).filter_by(name=flag_name).first()
    if not flag or not flag.enabled:
        return False
    if str(user_id) in (flag.allowed_user_ids or []):
        return True
    # Deterministic percentage rollout based on user_id hash
    hash_val = int(hashlib.md5(f"{flag_name}:{user_id}".encode()).hexdigest(), 16)
    return (hash_val % 100) < flag.rollout_percentage
```

### Rollout Sequence

1. **Week 1:** `allowed_user_ids` = [Ivan's account, test accounts]. `rollout_percentage` = 0.
2. **Week 2:** `rollout_percentage` = 10 (10% of users see billing).
3. **Week 3:** `rollout_percentage` = 50.
4. **Week 4:** `rollout_percentage` = 100. Remove the flag.

### Frontend Flag Check

```typescript
// frontend/src/lib/api.ts
export async function getFeatureFlags(): Promise<Record<string, boolean>> {
  const res = await apiFetch("/api/v1/features");
  return res.json();
}

// Usage in component
const { data: flags } = useQuery({ queryKey: ["features"], queryFn: getFeatureFlags });
if (flags?.billing_enabled) {
  // Show billing UI
}
```

### External Services (If Parcel Grows)

At scale, consider LaunchDarkly, Unleash, or PostHog Feature Flags. For now, the DB-driven approach avoids adding another dependency and monthly cost.

---

## 10. Staging Environment

### Verdict: Yes, Parcel Should Have a Staging Environment for Billing

Billing is the one feature where "test in production" is unacceptable. A staging environment costs ~$5-10/month on Railway and prevents:
- Accidental live charges during development.
- Untested webhook flows hitting production.
- Migration bugs corrupting production billing data.

### Railway Staging Setup

```bash
# Create a staging environment in the existing Railway project
railway environment create staging

# Set staging variables
railway variables set STRIPE_SECRET_KEY=sk_test_... --environment staging
railway variables set STRIPE_WEBHOOK_SECRET=whsec_staging_... --environment staging
railway variables set FRONTEND_URL=https://staging.parceldesk.io --environment staging
railway variables set DATABASE_URL=<staging-postgres-url> --environment staging
```

Railway creates a separate deployment for each environment. The staging environment gets its own:
- Public URL (`parcel-backend-staging-xxxx.up.railway.app`)
- PostgreSQL instance (add a new Postgres plugin scoped to staging)
- Environment variables

### Vercel Preview Deployments

Vercel already creates preview deployments for every PR. Configure preview environment variables:
```
VITE_API_URL = https://parcel-backend-staging-xxxx.up.railway.app
VITE_STRIPE_PUBLISHABLE_KEY = pk_test_...
```

This means every PR automatically points to the staging backend with Stripe test mode.

### Staging Webhook Endpoint

Register a separate webhook endpoint in Stripe Dashboard (test mode):
- URL: `https://parcel-backend-staging-xxxx.up.railway.app/api/v1/billing/webhook`
- Events: same as production

---

## 11. Cost Monitoring (Railway)

### Current Railway Pricing (as of 2026)

- **Hobby plan:** $5/month, includes $5 credit. Good for single-dev projects.
- **Pro plan:** $20/month per seat, usage-based compute. Required for production.
- **Compute:** ~$0.000231/min per vCPU, ~$0.000231/min per 512MB RAM.
- **PostgreSQL:** Storage at $0.25/GB/month. Compute same as above.

### Cost Projections for Parcel

| Stage | Backend | Database | Est. Monthly |
|---|---|---|---|
| Pre-launch (now) | 0.5 vCPU, 512MB | 1GB storage | ~$7 |
| Launch (100 users) | 0.5 vCPU, 512MB | 2GB storage | ~$10 |
| Growth (1,000 users) | 1 vCPU, 1GB | 5GB storage | ~$25 |
| Scale (10,000 users) | 2 vCPU, 2GB | 20GB storage | ~$60 |

**Scaling triggers to watch:**
- Database connection pool exhaustion (current pool_size=20, max_overflow=40 in `database.py`).
- Response time p95 exceeding 1 second.
- Railway memory usage consistently above 80%.

### Railway Autoscaling

Railway Pro supports horizontal scaling (multiple replicas). When Parcel needs it:
```
Railway Dashboard > Service > Settings > Scaling
  - Min replicas: 1
  - Max replicas: 3
  - Target CPU: 70%
```

**Note:** Horizontal scaling requires the app to be stateless. Parcel's FastAPI backend is already stateless (database sessions are per-request via `get_db()`). The one concern is the Stripe webhook endpoint — ensure idempotency so duplicate deliveries across replicas are safe.

### Cost Alerts

```
Railway Dashboard > Project Settings > Usage Alerts
  - Alert at 80% of monthly budget
  - Alert at 100% of monthly budget
```

---

## 12. Backup Strategy

### Why Billing Data Changes the Backup Calculus

Before billing, losing data means losing user convenience. After billing, losing data means:
- Inability to prove who is on what plan.
- Lost invoice records (potential legal/tax issue).
- Customer disputes with no data to resolve them.

### Railway PostgreSQL Backups

- **Automatic backups:** Railway Pro provides automatic daily backups with 7-day retention.
- **Point-in-time recovery (PITR):** Available on Railway Pro. Allows restoring to any point within the retention window.
- **Manual snapshots:** Take before every migration or major deploy via Railway Dashboard.

### Supplementary Backup Strategy

Railway backups cover infrastructure failure, but not logical corruption (e.g., a bug that corrupts subscription data). Add:

1. **pg_dump on a schedule:**
   ```bash
   # GitHub Actions scheduled job
   name: Database Backup
   on:
     schedule:
       - cron: "0 6 * * *"  # Daily at 6 AM UTC
   jobs:
     backup:
       runs-on: ubuntu-latest
       steps:
         - name: Dump database
           env:
             DATABASE_URL: ${{ secrets.PRODUCTION_DATABASE_URL }}
           run: |
             pg_dump "$DATABASE_URL" --format=custom --file=backup-$(date +%Y%m%d).dump
         - name: Upload to S3
           uses: aws-actions/configure-aws-credentials@v4
           with:
             aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
             aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
             aws-region: us-east-1
         - run: aws s3 cp backup-*.dump s3://parcel-backups/db/
   ```

2. **Stripe as source of truth:** Stripe retains all payment and subscription data independently. If Parcel's database is corrupted, you can reconstruct billing state from Stripe's API:
   ```bash
   stripe customers list --limit 100
   stripe subscriptions list --limit 100
   ```
   Design the billing system so Stripe is the canonical source and Parcel's database is a synced cache.

### Backup Verification

Monthly: Restore a backup to the staging database and verify data integrity. Automate this check:
```bash
# Restore to staging
pg_restore --dbname=$STAGING_DATABASE_URL --clean backup-latest.dump
# Run a verification query
psql $STAGING_DATABASE_URL -c "SELECT count(*) FROM subscriptions WHERE status = 'active';"
```

---

## 13. Disaster Recovery

### Scenario: Railway Goes Down During Billing Cycle

Stripe processes payments independently of Parcel's infrastructure. If Railway is down:
- **Charges still happen.** Stripe charges customers on schedule regardless of whether Parcel's backend is up.
- **Webhooks queue up.** Stripe retries failed webhook deliveries for up to 3 days with exponential backoff.
- **Users cannot access the app.** This is the primary impact.

### Recovery Procedure

1. **Wait for Railway to recover** (Railway's SLA target is 99.9% uptime on Pro, roughly 8.7 hours/year of downtime).
2. **Check Stripe webhook delivery queue** after recovery. Stripe will replay queued events automatically.
3. **If downtime exceeds 4 hours**, post a status update on a status page (consider using Instatus or Better Stack Status).
4. **If downtime exceeds 24 hours**, evaluate migrating to a backup hosting provider (Fly.io, Render, or bare EC2). This is the nuclear option.

### Multi-Region Contingency (Future)

For true high availability, consider:
- **Database:** Railway supports PostgreSQL read replicas in different regions.
- **Backend:** Deploy a second Railway service in a different region, behind a global load balancer (Cloudflare or Railway's upcoming multi-region support).
- **Cost:** Doubles infrastructure cost. Only justified when Parcel has significant revenue.

### Stripe Redundancy

Stripe itself has 99.999%+ uptime. The risk is not Stripe going down — it is Parcel's infrastructure going down and being unable to process webhook events or serve the app.

---

## 14. Uptime Requirements

### SLA Expectations by Tier

| Parcel Tier | Uptime Target | Monthly Downtime Budget | Justification |
|---|---|---|---|
| Free users | 99% | ~7.3 hours | No payment, lower expectation |
| Pro users ($49/mo) | 99.5% | ~3.6 hours | Paying, expect reliability |
| Team users ($149/mo) | 99.9% | ~43 minutes | Business-critical, expect near-zero downtime |

### How to Achieve 99.9%

1. **Railway Pro plan** (their target is 99.9% infrastructure uptime).
2. **Zero-downtime deployments** (Railway rolls new deployments with health check gating — old instance serves traffic until new one is healthy).
3. **Database connection resilience** — Parcel already has `pool_pre_ping=True` and `pool_recycle=3600` in `database.py`, which handles transient connection drops.
4. **Graceful degradation** — if Stripe API is temporarily unreachable, queue the operation and retry (do not fail the entire request).
5. **Health check endpoint** — Parcel already has `/health` in `main.py`. Enhance it (see section 15).

### Incident Communication

Once Parcel has paying users, set up:
- A status page at `status.parceldesk.io` (Better Stack Status, Instatus, or Atlassian Statuspage).
- Automated incident detection that flips the status page.
- Email notification to affected users for P0/P1 incidents.

---

## 15. Health Check Endpoints

### Current State

Parcel has a basic health check in `main.py`:
```python
@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "healthy"}
```

This returns 200 regardless of whether the database or Stripe is reachable. Railway uses this for deployment gating, but it does not detect actual service health.

### Enhanced Health Check

```python
# backend/routers/health.py
import stripe
from sqlalchemy import text
from fastapi import APIRouter, Depends
from database import get_db

router = APIRouter(tags=["health"])

@router.get("/health")
async def health_basic():
    """Lightweight check for Railway deployment gating (must be fast)."""
    return {"status": "healthy"}

@router.get("/health/deep")
async def health_deep(db=Depends(get_db)):
    """Deep health check — verifies database and Stripe connectivity."""
    checks = {}

    # Database
    try:
        db.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = f"error: {str(e)}"

    # Stripe API
    try:
        stripe.Account.retrieve()  # minimal API call
        checks["stripe"] = "ok"
    except Exception as e:
        checks["stripe"] = f"error: {str(e)}"

    overall = "healthy" if all(v == "ok" for v in checks.values()) else "degraded"
    status_code = 200 if overall == "healthy" else 503

    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=status_code,
        content={"status": overall, "checks": checks}
    )
```

### Monitoring Integration

**Better Stack (or similar) uptime monitor:**
- Monitor `https://api.parceldesk.io/health` every 30 seconds (basic).
- Monitor `https://api.parceldesk.io/health/deep` every 5 minutes (deep check; less frequent to avoid Stripe API rate limits).
- Alert via SMS/Slack/email if either returns non-200 for 2 consecutive checks.

**Railway health check configuration:**
Railway uses the health check to gate deployments. Keep `/health` as the lightweight check (the current behavior), and use `/health/deep` for external monitoring only.

---

## RECOMMENDATIONS FOR PARCEL

Prioritized by urgency and impact. Items 1-5 should be done before any billing code ships to production. Items 6-10 should be done within the first month of billing being live. Items 11-15 are growth-stage concerns.

### Before Billing Ships (Priority: Critical)

1. **Create a staging environment on Railway** with its own PostgreSQL instance and Stripe test-mode keys. Use Vercel preview deployments pointed at staging. Estimated setup time: 1 hour. Estimated ongoing cost: ~$5/month. This is non-negotiable for billing work.

2. **Use Pydantic Settings for all Stripe configuration.** Replace raw `os.getenv` with a validated `Settings` class that fails fast on missing keys. This prevents the app from starting with a misconfigured Stripe integration.

3. **Set up Stripe CLI locally** (`brew install stripe/stripe-cli/stripe && stripe login && stripe listen`). Test every webhook event type before deploying. Keep `stripe listen` running during all billing development.

4. **Add billing-specific tests to CI.** Mock Stripe API calls in unit tests. Add `STRIPE_TEST_SECRET_KEY` to GitHub Secrets for optional integration tests. Update `ci.yml` to install `stripe` as a test dependency.

5. **Implement the enhanced `/health/deep` endpoint** before billing launches. This gives you a single URL to monitor that confirms database + Stripe connectivity. Wire it to an uptime monitor (Better Stack free tier or similar).

### First Month After Launch (Priority: High)

6. **Set up a log drain from Railway** to Better Stack, Datadog, or Axiom. Add structured logging to all billing routes with `user_id`, `stripe_event_id`, and `amount` fields. This is your primary debugging tool when a user reports a billing issue.

7. **Implement feature flags for billing rollout.** Start with a database-driven approach (a `feature_flags` table). Roll out billing to your own account first, then 10%, then 50%, then 100%. This limits blast radius if something is wrong.

8. **Configure automated database backups to S3** via a GitHub Actions cron job, in addition to Railway's built-in backups. Verify the restore process works by restoring to staging monthly.

9. **Design the billing system so Stripe is the source of truth.** Parcel's `subscriptions` table should be a synced cache of Stripe state, updated via webhooks. If Parcel's data ever diverges from Stripe, Stripe wins. This simplifies disaster recovery dramatically.

10. **Exempt the Stripe webhook endpoint from rate limiting.** The current `slowapi` limiter in `backend/limiter.py` applies globally. Add `@limiter.exempt` to the webhook route to prevent Stripe's retry bursts from being throttled.

### Growth Stage (Priority: Medium)

11. **Set up Railway cost alerts** at 80% and 100% of your monthly budget. Monitor database connection pool usage — the current `pool_size=20, max_overflow=40` in `database.py` is generous for early stage but will need tuning as traffic grows.

12. **Create a status page at `status.parceldesk.io`** once you have paying users. Automated uptime checks should flip the status page. Users with billing issues need to know if the problem is on your end.

13. **Document the rollback procedure** as a runbook: (a) take DB snapshot, (b) rollback Railway deployment to previous version, (c) verify webhooks are still processing, (d) if DB migration must be rolled back, run `alembic downgrade`. Practice this in staging quarterly.

14. **Plan the test-to-live Stripe migration** as a single checklist executed in one session: swap keys in Railway production, swap publishable key in Vercel production, register live webhook endpoint, verify with a real $1 charge, refund immediately. Do not leave this half-done overnight.

15. **Evaluate multi-region deployment** only when Parcel has enough revenue to justify doubling infrastructure costs (~$50+/month in Railway compute). Until then, Railway's single-region deployment with automatic failover is sufficient. The real resilience comes from Stripe being the billing source of truth — even if Parcel is down, payments process and webhooks queue for replay.
