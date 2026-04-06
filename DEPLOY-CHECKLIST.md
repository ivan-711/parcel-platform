# Parcel Deploy Checklist

> Last updated: April 6, 2026
> Stack: FastAPI (Railway) + React/Vite (Vercel) + PostgreSQL + Redis (Railway)

---

## 1. Railway — Backend Setup

### 1.1 Root Directory (CRITICAL)

**Railway > Service Settings > Root Directory must be set to `backend`.**

Without this, Railway runs commands from the repo root. Alembic can't find `alembic.ini`, uvicorn can't find `main.py`, and the deploy crashes with errors like "Can't locate revision identified by '...'" or "No 'script_location' key found".

### 1.2 Project Structure

Railway project `ravishing-exploration` has these services:

| Service | Type | Role |
|---------|------|------|
| **web** | Backend (Python) | FastAPI app + Alembic migrations |
| **worker** | Backend (Python) | Dramatiq task queue (docs, PDFs, mail) |
| **PostgreSQL** | Database | Managed by Railway |
| **Redis** | Cache/Queue | Managed by Railway |

Start command is defined in `railway.toml`:
```
bash scripts/migrate.sh && uvicorn main:app --host 0.0.0.0 --port $PORT
```

The `migrate.sh` script runs `alembic upgrade head` with diagnostic output (prints cwd and checks for `alembic.ini`). The worker is defined in the `Procfile`:
```
worker: playwright install chromium && dramatiq core.tasks --processes 1 --threads 2
```

### 1.3 Backend Environment Variables

Set these in Railway's dashboard for the backend service. **Never commit actual values.**

#### Required — App Core
| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `DATABASE_URL` | PostgreSQL connection string | Railway auto-injects via `${{Postgres.DATABASE_URL}}` |
| `REDIS_URL` | Redis connection string | Railway auto-injects via `${{Redis.REDIS_URL}}` |
| `SECRET_KEY` | JWT signing key (32+ char random hex) | `python -c "import secrets; print(secrets.token_hex(32))"` |
| `ENVIRONMENT` | `production` | Static |
| `FRONTEND_URL` | `https://parceldesk.io` | Static — controls CORS origins |

#### Required — AI / LLM
| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `ANTHROPIC_API_KEY` | Claude API key for AI narratives/chat | Anthropic console |
| `OPENAI_API_KEY` | OpenAI key for document embeddings | OpenAI dashboard |

#### Required — Auth
| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `CLERK_SECRET_KEY` | Clerk backend secret | Clerk dashboard > API Keys |
| `CLERK_PUBLISHABLE_KEY` | Clerk publishable key | Clerk dashboard > API Keys |
| `CLERK_WEBHOOK_SECRET` | Clerk webhook signing secret | Clerk dashboard > Webhooks |
| `CLERK_JWT_AUDIENCE` | JWT audience claim | Clerk dashboard > JWT Templates |

#### Required — Billing
| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `STRIPE_SECRET_KEY` | Stripe secret key (sk_live_...) | Stripe dashboard |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | Stripe dashboard |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | Stripe dashboard > Webhooks |
| `STRIPE_PRICE_CARBON_MONTHLY` | Carbon monthly price ID | Stripe > Products |
| `STRIPE_PRICE_CARBON_ANNUAL` | Carbon annual price ID | Stripe > Products |
| `STRIPE_PRICE_TITANIUM_MONTHLY` | Titanium monthly price ID | Stripe > Products |
| `STRIPE_PRICE_TITANIUM_ANNUAL` | Titanium annual price ID | Stripe > Products |

#### Required — File Storage
| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `S3_ENDPOINT_URL` | Cloudflare R2 endpoint | CF dashboard > R2 > Bucket > S3 API |
| `AWS_ACCESS_KEY_ID` | R2 access key | CF dashboard > R2 > Manage API Tokens |
| `AWS_SECRET_ACCESS_KEY` | R2 secret key | CF dashboard > R2 > Manage API Tokens |
| `AWS_S3_BUCKET_NAME` | `parcel-uploads` | Static |

#### Required — Security
| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `IP_HASH_SALT` | Salt for IP hashing in analytics | `python -c "import secrets; print(secrets.token_hex(32))"` |
| `INTERNAL_API_KEY` | Key for cron/internal endpoints | `python -c "import secrets; print(secrets.token_hex(32))"` |

#### Optional — Property Data
| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `RENTCAST_API_KEY` | Property data (analyses) | RentCast dashboard |
| `RENTCAST_BASE_URL` | `https://api.rentcast.io/v1` | Static |
| `BRICKED_API_KEY` | Comp/ARV data | Bricked.ai dashboard |
| `BRICKED_BASE_URL` | `https://api.bricked.ai` | Static |
| `NOMINATIM_USER_AGENT` | `parcel-platform/1.0` | Static |

#### Optional — Communications
| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `TWILIO_ACCOUNT_SID` | SMS sending | Twilio console |
| `TWILIO_AUTH_TOKEN` | SMS auth | Twilio console |
| `TWILIO_PHONE_NUMBER` | SMS from number | Twilio console |
| `SENDGRID_API_KEY` | Email sending | SendGrid dashboard |
| `DEFAULT_FROM_EMAIL` | `noreply@parceldesk.io` | Static |
| `BATCHDATA_API_KEY` | Skip tracing | BatchData dashboard |
| `LOB_API_KEY` | Direct mail | Lob dashboard |
| `LOB_ENV` | `live` for production | Static |

#### Optional — Monitoring
| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `SENTRY_DSN` | Error tracking | Sentry project settings |
| `POSTHOG_API_KEY` | Product analytics | PostHog project settings |
| `POSTHOG_HOST` | PostHog instance URL | PostHog settings |

### 1.3 Railway-Specific Notes

- **PORT**: Railway sets `$PORT` automatically — do NOT set it manually
- **DATABASE_URL**: Use Railway's internal reference `${{Postgres.DATABASE_URL}}` for private networking (faster, no egress cost). The public `DATABASE_PUBLIC_URL` is only for local development.
- **REDIS_URL**: Same — use `${{Redis.REDIS_URL}}` for internal networking
- **Python version**: `runtime.txt` pins Python 3.11. Railway's Nixpacks builder reads this.
- **Playwright**: The worker process installs Chromium on startup (`playwright install chromium`). This adds ~30s to worker startup but is required for PDF generation.

---

## 2. Vercel — Frontend Setup

### 2.1 Project Configuration

- **Framework Preset**: Vite
- **Build Command**: `npm run build` (runs `tsc && vite build`)
- **Output Directory**: `dist`
- **Install Command**: `npm install`
- **Root Directory**: `frontend` (if deploying from monorepo root)
- **Node Version**: 18+ (Vercel default)

SPA routing is handled by `vercel.json`:
```json
{"rewrites":[{"source":"/(.*)", "destination":"/index.html"}]}
```

### 2.2 Frontend Environment Variables

Set these in Vercel's project settings > Environment Variables:

| Variable | Value | Notes |
|----------|-------|-------|
| `VITE_API_URL` | `https://api.parceldesk.io` | Railway backend URL |
| `VITE_CLERK_PUBLISHABLE_KEY` | `pk_live_...` or `pk_test_...` | Clerk publishable key |

**Do NOT set** `VITE_DEV_PREVIEW` in production — it enables mock API mode.

### 2.3 Vercel Domain Setup

1. Add custom domain `parceldesk.io` in Vercel project settings
2. Add `www.parceldesk.io` as well (Vercel auto-redirects one to the other)
3. Configure DNS records (see Section 4)

---

## 3. Webhook Endpoints

After deploying, register these webhook URLs in their respective dashboards:

### Stripe Webhooks
- **URL**: `https://api.parceldesk.io/webhooks/stripe`
- **Events to listen for**:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
- Copy the webhook signing secret → set as `STRIPE_WEBHOOK_SECRET`

### Clerk Webhooks
- **URL**: `https://api.parceldesk.io/webhooks/clerk`
- **Events to listen for**:
  - `user.created`
  - `user.updated`
  - `user.deleted`
- Copy the webhook signing secret → set as `CLERK_WEBHOOK_SECRET`

### Twilio Status Callback (if using SMS)
- **URL**: `https://api.parceldesk.io/api/webhooks/communications/twilio/status`

### SendGrid Inbound Parse (if using email)
- **URL**: `https://api.parceldesk.io/api/webhooks/communications/sendgrid/inbound`

---

## 4. DNS Configuration — parceldesk.io

### Option A: Vercel frontend + Railway backend subdomain

| Type | Name | Value | Notes |
|------|------|-------|-------|
| A | `@` | `76.76.21.21` | Vercel |
| CNAME | `www` | `cname.vercel-dns.com` | Vercel |
| CNAME | `api` | `<railway-service>.up.railway.app` | Railway backend public domain |

### How to get the Railway CNAME:
1. Railway dashboard > project > web service > Settings > Networking
2. Add custom domain `api.parceldesk.io`
3. Railway shows the CNAME target (e.g., `web-production-abcd.up.railway.app`)

### Clerk Production Domain
If switching from Clerk dev to production:
1. Clerk dashboard > Domain > Add production domain `parceldesk.io`
2. Add CNAME `clerk` → Clerk's provided CNAME target

---

## 5. Deploy Steps (In Order)

### First Deploy

```
1. Railway: Create backend service from repo (point to backend/ directory)
2. Railway: Set all env vars from Section 1.2
3. Railway: Deploy → web process runs `alembic upgrade head` automatically
4. Railway: Verify health check → curl https://api.parceldesk.io/health
5. Railway: Add custom domain api.parceldesk.io
6. DNS: Add CNAME record for api subdomain
7. Vercel: Import frontend from repo (point to frontend/ directory)
8. Vercel: Set env vars from Section 2.2
9. Vercel: Deploy → verify at preview URL
10. Vercel: Add custom domain parceldesk.io
11. DNS: Add A/CNAME records for root and www
12. Stripe: Register webhook URL, copy secret to Railway env
13. Clerk: Register webhook URL, copy secret to Railway env
14. Verify: Full flow test (see Section 6)
```

### Subsequent Deploys

Railway and Vercel both auto-deploy on push to `main`. The Procfile runs `alembic upgrade head` before starting the web process, so migrations are automatic.

---

## 6. Post-Deploy Verification

Run these checks after every deploy:

### Health & Connectivity
- [ ] `curl https://api.parceldesk.io/health` → `{"status": "healthy"}`
- [ ] `curl https://api.parceldesk.io/` → `{"status": "Parcel API running", ...}`
- [ ] Frontend loads at `https://parceldesk.io`
- [ ] No CORS errors in browser console

### Auth Flow
- [ ] Register new account (Clerk)
- [ ] Login with existing account
- [ ] JWT refresh works (stay logged in after page reload)

### Core Features
- [ ] Run a deal analysis (verifies RentCast API, Anthropic API)
- [ ] Save a deal to pipeline
- [ ] Send an AI chat message
- [ ] Upload a document (verifies R2 storage, OpenAI embeddings)

### Billing Flow
- [ ] Pricing page loads with Steel/Carbon/Titanium tiers
- [ ] "Start 7-Day Free Trial" → redirects to Stripe Checkout
- [ ] After checkout success → user plan updated, features unlocked
- [ ] Stripe webhook received (check Railway logs)

### Worker Process
- [ ] Document upload triggers background processing (check Railway worker logs)
- [ ] PDF report generation works (requires Playwright/Chromium in worker)

---

## 7. Rollback

### Railway
- Railway keeps previous deployments. To rollback:
  1. Dashboard > Deployments > click previous successful deploy > Rollback

### Vercel
- Vercel keeps previous deployments. To rollback:
  1. Dashboard > Deployments > click "..." on previous deploy > Promote to Production

### Database
- Alembic supports downgrades: `alembic downgrade -1`
- But prefer forward-fix over downgrade in production
