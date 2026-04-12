# Environment Variables Reference

> Generated 2026-04-12 — READ-ONLY audit of all env vars across the Parcel Platform codebase.

---

## Complete Variable Inventory

### Frontend (Vite — `import.meta.env.VITE_*`)

| Variable | Where Referenced | Where Set | Status |
|---|---|---|---|
| `VITE_API_URL` | `api.ts`, `chat-stream.ts`, `AnalyzePage.tsx`, `SharedReportPage.tsx` | `frontend/.env.local`, `frontend/.env.example` | OK |
| `VITE_CLERK_PUBLISHABLE_KEY` | `ClerkProviderWrapper.tsx` | `frontend/.env.local`, `frontend/.env.example` | OK |
| `VITE_DEV_PREVIEW` | `App.tsx`, `devPreview.ts` | `frontend/.env.example` (commented out) | OK — dev-only flag |
| `VITE_GOOGLE_PLACES_API_KEY` | `usePlacesAutocomplete.ts`, `MapsProvider.tsx` | **NOT in any .env file** | **MISSING** |

> `import.meta.env.DEV` is used in `error-boundary.tsx` — this is a Vite built-in, not a custom var.

> `VERCEL_OIDC_TOKEN` appears in `frontend/.env.local` — injected by Vercel CLI, not referenced in app code. Harmless.

### Backend — Core Infrastructure

| Variable | Where Referenced | Where Set (.env) | .env.example | Status |
|---|---|---|---|---|
| `DATABASE_URL` | `database.py`, `alembic/env.py` | Yes | Yes | OK |
| `ANTHROPIC_API_KEY` | `processor.py`, `contextualizer.py`, `offer_letter.py`, `deal_narrator.py`, `chat_specialist.py` | Yes | Yes | OK |
| `OPENAI_API_KEY` | `embeddings.py` | Yes | Yes | OK |
| `SECRET_KEY` | (set in .env only) | Yes | Yes | **STALE** — not referenced in any Python code |
| `ENVIRONMENT` | `main.py`, `tasks/__init__.py`, `billing/config.py` | Yes | Yes | OK |
| `FRONTEND_URL` | `main.py`, `billing/config.py`, `seed_demo.py`, `pdf_generation.py`, `reports.py`, `deals.py`, `dispositions.py` | Yes | Yes | OK |
| `REDIS_URL` | `main.py`, `tasks/__init__.py`, `tasks/health.py` | Yes | Yes | OK |
| `SENTRY_DSN` | `main.py`, `tasks/__init__.py` | Yes (empty) | Yes (empty) | OK — optional |
| `TESTING` | `limiter.py`, `tests/conftest.py` | No (set programmatically in tests) | No | OK — test-only |

### Backend — Clerk Auth

| Variable | Where Referenced | Where Set (.env) | .env.example | Status |
|---|---|---|---|---|
| `CLERK_SECRET_KEY` | `clerk.py`, `auth.py` | Yes | Yes | OK |
| `CLERK_PUBLISHABLE_KEY` | `clerk.py` (derives JWKS URL from it) | Yes | Yes | OK |
| `CLERK_WEBHOOK_SECRET` | `clerk_webhooks.py` | Yes | Yes | OK |
| `CLERK_ISSUER_URL` | `clerk.py` (auto-derived from publishable key if unset) | **NOT in .env** | **NOT in .env.example** | **MISSING** — auto-derived but should be explicit |
| `CLERK_JWT_AUDIENCE` | `clerk.py` (warns if unset when Clerk is enabled) | **NOT in .env** | **NOT in .env.example** | **MISSING** — code logs warning when absent |

### Backend — Stripe Billing

| Variable | Where Referenced | Where Set (.env) | .env.example | Status |
|---|---|---|---|---|
| `STRIPE_SECRET_KEY` | `billing/config.py` (Pydantic), `stripe_service.py` | Yes | Yes | OK |
| `STRIPE_PUBLISHABLE_KEY` | (Not referenced in Python code) | Yes in .env | No in .env.example | **STALE** — backend never reads this |
| `STRIPE_WEBHOOK_SECRET` | `billing/config.py`, `webhooks/__init__.py` | Yes | Yes | OK |
| `STRIPE_PRICE_CARBON_MONTHLY` | `billing/config.py` | Yes | Yes | OK |
| `STRIPE_PRICE_CARBON_ANNUAL` | `billing/config.py` | Yes | Yes | OK |
| `STRIPE_PRICE_TITANIUM_MONTHLY` | `billing/config.py` | Yes | Yes | OK |
| `STRIPE_PRICE_TITANIUM_ANNUAL` | `billing/config.py` | Yes | Yes | OK |
| `TRIAL_PERIOD_DAYS` | `billing/config.py` (Pydantic, default: 7) | No | No | OK — has default |

### Backend — File Storage (Cloudflare R2 / S3-compat)

| Variable | Where Referenced | Where Set (.env) | .env.example | Status |
|---|---|---|---|---|
| `S3_ENDPOINT_URL` | `s3_service.py` | Yes | Yes | OK |
| `AWS_ACCESS_KEY_ID` | `s3_service.py` | Yes | No | OK (sensitive, not in example) |
| `AWS_SECRET_ACCESS_KEY` | `s3_service.py` | Yes | No | OK (sensitive, not in example) |
| `AWS_S3_BUCKET_NAME` | `s3_service.py`, `documents.py` | Yes | No | OK |
| `AWS_REGION` | `s3_service.py` (default: `"auto"`) | **NOT in .env** | **NOT in .env.example** | OK — default `"auto"` works for R2 |

### Backend — Analytics / Telemetry

| Variable | Where Referenced | Where Set (.env) | .env.example | Status |
|---|---|---|---|---|
| `POSTHOG_API_KEY` | `telemetry.py` | Yes (empty) | Yes (empty) | OK — optional |
| `POSTHOG_HOST` | `telemetry.py` | Yes (empty) | Yes (empty) | OK — optional |

### Backend — Communications

| Variable | Where Referenced | Where Set (.env) | .env.example | Status |
|---|---|---|---|---|
| `TWILIO_ACCOUNT_SID` | `twilio_sms.py`, `webhooks/communications.py`, `service_status.py` | Yes (empty) | Yes (empty) | OK — optional |
| `TWILIO_AUTH_TOKEN` | `twilio_sms.py`, `webhooks/communications.py` | Yes (empty) | Yes (empty) | OK — optional |
| `TWILIO_PHONE_NUMBER` | `twilio_sms.py`, `webhooks/communications.py` | Yes (placeholder) | Yes (placeholder) | OK — optional |
| `TWILIO_STATUS_CALLBACK_URL` | `twilio_sms.py` | Yes (empty) | Yes (empty) | OK — optional |
| `SENDGRID_API_KEY` | `sendgrid_email.py`, `service_status.py` | Yes (empty) | Yes (empty) | OK — optional |
| `SENDGRID_WEBHOOK_VERIFICATION_KEY` | `sendgrid_email.py` | Yes (empty) | Yes (empty) | OK — optional |
| `SENDGRID_WEBHOOK_SECRET` | `webhooks/communications.py` | Yes (empty) | Yes (empty) | OK — optional |
| `DEFAULT_FROM_EMAIL` | `sendgrid_email.py` | Yes | Yes | OK |
| `RESEND_API_KEY` | `email.py` (2 places) | **NOT in .env** | **NOT in .env.example** | **MISSING** — code warns and skips |

### Backend — Property Data Providers

| Variable | Where Referenced | Where Set (.env) | .env.example | Status |
|---|---|---|---|---|
| `RENTCAST_API_KEY` | `rentcast.py` | Yes | Yes | OK |
| `RENTCAST_BASE_URL` | `rentcast.py` | Yes | Yes | OK |
| `BRICKED_API_KEY` | `bricked.py` | Yes (empty) | Yes (empty) | OK — optional |
| `BRICKED_BASE_URL` | `bricked.py` | Yes | Yes | OK |
| `NOMINATIM_USER_AGENT` | `address_parser.py` | Yes | Yes | OK |
| `BATCHDATA_API_KEY` | `batchdata_provider.py`, `service_status.py` | Yes (empty) | Yes (empty) | OK — optional |

### Backend — Direct Mail

| Variable | Where Referenced | Where Set (.env) | .env.example | Status |
|---|---|---|---|---|
| `LOB_API_KEY` | `lob_provider.py`, `service_status.py` | Yes (empty) | Yes (empty) | OK — optional |
| `LOB_ENV` | (Not referenced in Python code) | Yes | Yes | **STALE** — not read by any code |

### Backend — Internal / Misc

| Variable | Where Referenced | Where Set (.env) | .env.example | Status |
|---|---|---|---|---|
| `INTERNAL_API_KEY` | `sequences.py` | Yes | Yes | OK |
| `IP_HASH_SALT` | `reports.py` | Yes | Yes | OK |
| `KIE_API_KEY` | `scripts/kie_api.py` (reads from .env directly) | Yes | **NOT in .env.example** | OK — script-only, not a core app var |

---

## Missing Variables

Variables referenced in code but NOT set in any .env file:

| Variable | Severity | Details |
|---|---|---|
| `VITE_GOOGLE_PLACES_API_KEY` | **HIGH** | Used by `MapsProvider.tsx` and `usePlacesAutocomplete.ts`. Without this, address autocomplete and map features are non-functional. Must be set in `frontend/.env.local` for local dev and as a Vercel env var for production. |
| `CLERK_ISSUER_URL` | **LOW** | Auto-derived from `CLERK_PUBLISHABLE_KEY` domain in `clerk.py`. Works implicitly but should be explicitly documented. |
| `CLERK_JWT_AUDIENCE` | **MEDIUM** | Code in `clerk.py` logs a warning when Clerk is enabled but this is unset. Clerk tokens will be rejected without it. Must be set on Railway. |
| `RESEND_API_KEY` | **LOW** | Used in `core/email.py` for sending notifications and password reset emails. Code degrades gracefully (logs warning, skips send). Add to .env.example if Resend is the intended email provider. |

## Stale Variables

Variables set in .env but NOT referenced anywhere in application code:

| Variable | Location | Notes |
|---|---|---|
| `SECRET_KEY` | `backend/.env`, `backend/.env.example` | Likely a leftover from an earlier JWT/session implementation. No Python code reads it. Safe to remove. |
| `STRIPE_PUBLISHABLE_KEY` | `backend/.env`, `backend/.env.example` | Backend never reads this. The frontend uses `VITE_CLERK_PUBLISHABLE_KEY` for Clerk and Stripe checkout is server-side only. Can be removed from backend .env. |
| `LOB_ENV` | `backend/.env`, `backend/.env.example` | Appears in .env but `lob_provider.py` never reads it. If needed for test/live mode switching, code should be updated; otherwise remove. |

---

## Security Findings

### CRITICAL — Secrets in .env file

The `backend/.env` file contains live/test secrets with actual values for:
- Database credentials (Railway PostgreSQL URL with password)
- Anthropic API key (`sk-ant-api03-...`)
- OpenAI API key (`sk-proj-...`)
- Stripe test keys (`sk_test_...`, `pk_test_...`, webhook secret)
- Cloudflare R2 credentials (access key ID + secret)
- Redis URL with password
- Clerk test keys
- RentCast API key
- Internal API key
- IP hash salt

**Status: SAFE** — `.env` and `.env.local` are both listed in `.gitignore` and confirmed NOT tracked by git.

### Vercel OIDC Token

`frontend/.env.local` contains a `VERCEL_OIDC_TOKEN` JWT. This was injected by Vercel CLI (`vercel dev` or `vercel link`). It is:
- Not referenced in application code
- Gitignored (`.env.local` in `.gitignore`)
- **However**, it is a session token. If it has expired, it is inert. If still valid, treat it as sensitive.

### Hardcoded Secret Patterns

No `sk_live_`, `sk_test_`, or bare API keys were found hardcoded in `.py`, `.ts`, `.tsx`, `.js`, or `.jsx` source files. All secret-like patterns found were:
- Authorization header construction using variables (e.g., `Bearer {CLERK_SECRET_KEY}`) — correct pattern
- Stripe key format validation in `billing/config.py` — referencing the prefix string, not an actual key

### .env.example Safety

`backend/.env.example` uses placeholder values (`sk-ant-...`, `sk-...`, `sk_test_...`, `generate-a-random-*`) — no real secrets exposed. Safe for version control.

---

## Per-Environment Breakdown

### Local Development

**Frontend (`frontend/.env.local`):**
| Variable | Required | Notes |
|---|---|---|
| `VITE_API_URL` | Yes | Set to `http://localhost:8000` |
| `VITE_CLERK_PUBLISHABLE_KEY` | Yes | Get from Clerk dashboard (test key) |
| `VITE_GOOGLE_PLACES_API_KEY` | Yes | **Currently missing** — get from Google Cloud Console |
| `VITE_DEV_PREVIEW` | No | Set to `true` to enable mock API mode |

**Backend (`backend/.env`):**
All variables listed in `backend/.env.example` should be configured. Minimum required for core functionality:
- `DATABASE_URL` — local PostgreSQL or Railway proxy
- `ANTHROPIC_API_KEY` — for AI features (analysis, chat, document processing)
- `FRONTEND_URL` — `http://localhost:5173`
- `CLERK_SECRET_KEY` + `CLERK_PUBLISHABLE_KEY` — for authentication
- `CLERK_JWT_AUDIENCE` — **needed but currently missing from .env**

Optional for local dev (features degrade gracefully without them):
- `REDIS_URL` — background jobs; falls back but Celery tasks won't execute
- `OPENAI_API_KEY` — embeddings only
- `STRIPE_*` — billing features
- `S3_*` / `AWS_*` — file uploads
- All communications keys (Twilio, SendGrid, Resend)
- Provider keys (RentCast, Bricked, BatchData, Lob)

### Railway (Backend Production)

All backend env vars must be set as Railway service variables. Critical production vars:

| Variable | Priority |
|---|---|
| `DATABASE_URL` | Required — Railway provides this automatically if using their PostgreSQL add-on |
| `REDIS_URL` | Required — Railway provides this automatically if using their Redis add-on |
| `ANTHROPIC_API_KEY` | Required |
| `OPENAI_API_KEY` | Required for embeddings |
| `ENVIRONMENT` | Set to `production` |
| `FRONTEND_URL` | Set to `https://app.parceldesk.io` (or actual frontend domain) |
| `CLERK_SECRET_KEY` | Required (live key) |
| `CLERK_PUBLISHABLE_KEY` | Required (live key) |
| `CLERK_WEBHOOK_SECRET` | Required |
| `CLERK_JWT_AUDIENCE` | **Required — currently missing from .env template** |
| `CLERK_ISSUER_URL` | Recommended — auto-derived but explicit is safer |
| `STRIPE_SECRET_KEY` | Required (live key for production) |
| `STRIPE_WEBHOOK_SECRET` | Required |
| `STRIPE_PRICE_*` (4 vars) | Required for billing |
| `SENTRY_DSN` | Recommended for error monitoring |
| `S3_ENDPOINT_URL` + `AWS_*` | Required for file storage |
| `IP_HASH_SALT` | Required — use a unique random value |
| `INTERNAL_API_KEY` | Required for cron endpoints |

### Vercel (Frontend Production)

All `VITE_*` variables must be set as Vercel environment variables. They are **build-time** — changes require a redeploy.

| Variable | Priority |
|---|---|
| `VITE_API_URL` | Required — set to production API URL (e.g., `https://api.parceldesk.io`) |
| `VITE_CLERK_PUBLISHABLE_KEY` | Required — use the **live** publishable key |
| `VITE_GOOGLE_PLACES_API_KEY` | **Required — currently not documented anywhere** |
| `VITE_DEV_PREVIEW` | Do NOT set in production |

---

## Action Items

1. **Add `VITE_GOOGLE_PLACES_API_KEY`** to `frontend/.env.local` (local dev) and Vercel env vars (production). Also add to `frontend/.env.example` for documentation.
2. **Add `CLERK_JWT_AUDIENCE`** to `backend/.env` and `backend/.env.example`. Without this, Clerk token verification rejects all tokens.
3. **Add `CLERK_ISSUER_URL`** to `backend/.env.example` for documentation even though it auto-derives.
4. **Add `RESEND_API_KEY`** to `backend/.env.example` if Resend email is in use (or remove the references from `core/email.py`).
5. **Remove `SECRET_KEY`** from `backend/.env` and `backend/.env.example` — dead code.
6. **Remove `STRIPE_PUBLISHABLE_KEY`** from `backend/.env` and `backend/.env.example` — backend never uses it.
7. **Remove `LOB_ENV`** from `backend/.env` and `backend/.env.example` — not read by any code, or update `lob_provider.py` to use it.
8. **Add `AWS_ACCESS_KEY_ID`**, `AWS_SECRET_ACCESS_KEY`**, `AWS_S3_BUCKET_NAME`** to `backend/.env.example` with placeholder values (currently only `S3_ENDPOINT_URL` is documented).
