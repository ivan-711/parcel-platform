# Agent 17: Codebase Integration Analysis for Billing

> Generated 2026-03-28 by reading every backend router, model, migration, frontend
> API client, route tree, auth store, and chat stream module in the Parcel codebase.

---

## 1. Backend Architecture Overview

### 1.1 `backend/main.py` -- Application Entry Point

**What it does now:** Creates the FastAPI app, attaches slowapi rate-limit handler,
configures CORS (allows `FRONTEND_URL` + www variant, credentials enabled), and
mounts 8 routers under `/api/v1`.

**Routers mounted (line 36-43):**
| Router module       | Prefix             |
|---------------------|--------------------|
| auth                | /api/v1/auth       |
| dashboard           | /api/v1/dashboard  |
| deals               | /api/v1/deals      |
| pipeline            | /api/v1/pipeline   |
| portfolio           | /api/v1/portfolio  |
| chat                | /api/v1/chat       |
| documents           | /api/v1/documents  |
| settings            | /api/v1/settings   |

Plus two root-level endpoints: `GET /health` and `GET /`.

**Billing integration points:**
- **NEW router:** `app.include_router(billing.router, prefix="/api/v1")` after line 43.
- **NEW middleware (optional):** A `BillingMiddleware` or dependency that injects
  the user's current plan/tier into the request state, similar to how `limiter` is
  attached to `app.state` (line 18). This avoids repeated DB lookups per-endpoint.
- **Stripe webhook route:** Must be mounted WITHOUT the `/api/v1` prefix or with a
  dedicated `/api/v1/billing/webhook` path. The webhook needs raw body access, so
  it must be exempt from JSON parsing middleware. FastAPI handles this naturally
  since the route can read `await request.body()` directly.

---

### 1.2 `backend/database.py` -- DB Setup & Session Management

**What it does now:** Creates a sync SQLAlchemy engine from `DATABASE_URL` env var
(pool_size=20, max_overflow=40, pool_pre_ping, pool_recycle=3600). Exposes
`SessionLocal` sessionmaker and `get_db()` generator dependency. Uses
`declarative_base()` for ORM models.

**Billing integration points:**
- **No changes needed.** The `get_db()` dependency is the standard pattern all
  routers use. Billing models will inherit from the same `Base` and use `get_db()`.
- New billing tables will be created via Alembic migration (see section 4).

---

### 1.3 `backend/limiter.py` -- Rate Limiting

**What it does now:** Instantiates a slowapi `Limiter` keyed by remote address.
Disabled when `TESTING=1` env var is set (line 8).

**Billing integration points:**
- **MODIFY:** Rate limits could become tier-aware. Currently hardcoded per-endpoint
  (e.g., `@limiter.limit("30/minute")` on deal creation). A billing-aware limiter
  would read the user's plan and apply different limits. However, this is a Phase 2
  optimization. For Phase 1, tier gating (blocking access entirely) is sufficient.
- **Alternative approach:** Keep rate limits as-is for abuse prevention; enforce
  tier quotas separately via a `require_tier()` dependency.

---

## 2. Authentication System

### 2.1 `backend/routers/auth.py` -- Auth Router (10 endpoints)

**Endpoints:**
| Method | Path                    | Auth? | Rate limit   | Function            |
|--------|-------------------------|-------|--------------|---------------------|
| POST   | /auth/register          | No    | 3/min        | `register`          |
| POST   | /auth/login             | No    | 5/min        | `login`             |
| POST   | /auth/logout            | No    | --           | `logout`            |
| POST   | /auth/refresh           | Cookie| 20/min       | `refresh`           |
| GET    | /auth/me                | Yes   | --           | `me`                |
| GET    | /auth/me/               | Yes   | --           | `get_profile`       |
| PUT    | /auth/me/               | Yes   | --           | `update_profile`    |
| POST   | /auth/forgot-password   | No    | 3/min        | `forgot_password`   |
| POST   | /auth/reset-password    | No    | 3/min        | `reset_password`    |

**Auth mechanism:** httpOnly cookies for both access token (15min, line 38) and
refresh token (7 days, line 39). Production uses `SameSite=None + Secure` for
cross-origin cookies between `parceldesk.io` and `api.parceldesk.io`.

**`get_current_user` dependency** (imported from `core.security.jwt`): Extracts
user from the `access_token` cookie, queries the DB for the User row, returns it.
This is the universal auth guard used by every protected endpoint.

**Billing integration points:**
- **MODIFY `register` (line 82-116):** After creating the user, also create a
  default `Subscription` record (free tier) so every new user starts with a plan.
  Alternatively, handle "no subscription = free tier" at the middleware level.
- **MODIFY `me` (line 181-184) and `get_profile` (line 187-190):** Return the
  user's current plan/tier in the response so the frontend can gate UI features.
  Add fields like `plan`, `plan_status`, `usage_this_period` to the response schemas.
- **MODIFY `UserResponse` schema** (`backend/schemas/auth.py` line 51-61): Add
  `plan: str`, `plan_status: str | None`, `stripe_customer_id: str | None` fields.
- **MODIFY `UserProfileResponse` schema** (line 64-73): Same additions.

---

### 2.2 User Model (`backend/models/users.py`)

**Current fields:**
- `id` (UUID PK, from TimestampMixin)
- `created_at`, `updated_at` (from TimestampMixin)
- `name` (String, not null)
- `email` (String, unique, indexed, not null)
- `password_hash` (String, not null)
- `role` (Enum: wholesaler/investor/agent)
- `team_id` (UUID FK to teams, nullable)
- `email_notifications` (Boolean, default true)

**Relationships:** deals, team_memberships, pipeline_entries, documents, chat_messages, portfolio_entries.

**New fields needed for billing:**
- `stripe_customer_id` (String, nullable, unique, indexed) -- Created on first checkout
- `plan` (String or Enum, default "free") -- Current tier: free/pro/team
- `plan_status` (String, nullable) -- Stripe status: active/past_due/canceled/trialing
- `subscription_id` (String, nullable) -- Stripe subscription ID for quick lookup
- `current_period_end` (DateTime, nullable) -- When the current billing period ends
- `trial_ends_at` (DateTime, nullable) -- If offering a trial period

**Alternatively:** Create a separate `subscriptions` table to keep billing concerns
isolated from the user model. This is the cleaner approach for audit trails.

---

### 2.3 Frontend Auth Store (`frontend/src/stores/authStore.ts`)

**What it does now:** Zustand store with `user: User | null`, `isAuthenticated: boolean`.
Persists user to `localStorage` under `parcel_user`. `setAuth()` and `clearAuth()`.

**Frontend User type** (`frontend/src/types/index.ts` line 35-42):
```typescript
export interface User {
  id: string
  name: string
  email: string
  role: 'wholesaler' | 'investor' | 'agent'
  team_id?: string | null
  created_at: string
}
```

**Billing integration points:**
- **MODIFY `User` interface:** Add `plan: 'free' | 'pro' | 'team'`,
  `plan_status: string | null`, `current_period_end: string | null`.
- The auth store itself needs no structural changes -- `setAuth(data.user)` already
  stores whatever the backend returns.
- **NEW:** Frontend needs a `usePlan()` hook or selector that reads
  `useAuthStore(s => s.user?.plan)` for tier-gating UI elements.

---

## 3. API Endpoint Inventory (Complete)

### 3.1 Total Count: 33 API endpoints

| Router      | Endpoints | Auth Required |
|-------------|-----------|---------------|
| auth        | 9         | 4 yes, 5 no   |
| dashboard   | 2         | 2 yes         |
| deals       | 7         | 6 yes, 1 no   |
| pipeline    | 4         | 4 yes         |
| portfolio   | 3         | 3 yes         |
| chat        | 2         | 2 yes         |
| documents   | 4         | 4 yes         |
| settings    | 2         | 2 yes         |
| root        | 2         | 0             |
| **TOTAL**   | **35**    | **27 yes**    |

### 3.2 Endpoints Needing Tier Gating

**Free tier (available to all):**
- All auth endpoints
- Dashboard stats + activity
- Deal CRUD (with quantity limit, e.g., 5 active deals)
- Pipeline read (GET /pipeline/)
- Chat (with message count limit per month)
- Document upload (with count limit, e.g., 3/month)
- Settings
- Health/root

**Pro tier gates (block free users):**
- Deal sharing (`PUT /{deal_id}/share/`)
- Offer letter generation (`POST /{deal_id}/offer-letter/`)
- PDF report generation (frontend-only gate)
- Portfolio tracking (all 3 endpoints)
- Pipeline write operations (POST, PUT stage, DELETE)
- Unlimited deals
- Unlimited chat messages
- Unlimited document uploads

**Specific endpoints to gate:**

| Endpoint                              | Gate Type        | Implementation        |
|---------------------------------------|------------------|-----------------------|
| `POST /deals/`                        | Quota check      | Count user's deals    |
| `PUT /deals/{id}/share/`              | Tier: pro+       | `require_tier("pro")` |
| `POST /deals/{id}/offer-letter/`      | Tier: pro+       | `require_tier("pro")` |
| `POST /chat/`                         | Quota check      | Count monthly msgs    |
| `POST /pipeline/`                     | Tier: pro+       | `require_tier("pro")` |
| `PUT /pipeline/{id}/stage/`           | Tier: pro+       | `require_tier("pro")` |
| `DELETE /pipeline/{id}/`              | Tier: pro+       | `require_tier("pro")` |
| `POST /portfolio/`                    | Tier: pro+       | `require_tier("pro")` |
| `PUT /portfolio/{id}/`                | Tier: pro+       | `require_tier("pro")` |
| `POST /documents/`                    | Quota check      | Count monthly uploads |
| PDF report (frontend)                 | Tier: pro+       | Frontend gate only    |

---

## 4. Migration History & Strategy for Billing Tables

### 4.1 Current Alembic Migrations (5 total)

| Revision         | Description                        | Date       |
|------------------|------------------------------------|------------|
| f6c95c03e2a5     | Initial schema (all base tables)   | 2026-02-28 |
| a3d8f1b24c07     | Rebuild documents for S3           | --         |
| b7e2a4f19d03     | Add risk_factors to deals          | --         |
| c1e4f2a83b09     | Add email_notifications to users   | --         |
| d4a7e3b58f12     | Add password_reset_tokens          | --         |

All migrations are linear (single chain, no branches). The latest head is `d4a7e3b58f12`.

### 4.2 New Migration Required

A single migration adding billing columns to `users` and a new `subscriptions` table:

```
alembic revision --autogenerate -m "add billing tables and user plan fields"
```

**Tables to create:**

**`subscriptions` table:**
- id (UUID PK)
- user_id (UUID FK users.id, not null, indexed)
- stripe_subscription_id (String, unique, nullable)
- stripe_customer_id (String, indexed, nullable)
- plan (String, not null, default "free")
- status (String, not null, default "active") -- active/past_due/canceled/trialing
- current_period_start (DateTime, nullable)
- current_period_end (DateTime, nullable)
- cancel_at_period_end (Boolean, default false)
- created_at, updated_at (standard)

**`usage_records` table (for metering):**
- id (UUID PK)
- user_id (UUID FK users.id, not null, indexed)
- metric (String, not null) -- "chat_messages", "deals_created", "documents_uploaded"
- count (Integer, not null, default 0)
- period_start (DateTime, not null)
- period_end (DateTime, not null)
- created_at, updated_at (standard)
- Unique constraint: (user_id, metric, period_start)

**Columns to add to `users`:**
- stripe_customer_id (String, nullable, unique)
- plan (String, default "free", not null)

---

## 5. File-by-File Integration Map

### 5.1 `backend/routers/deals.py` -- Deal Endpoints

**What it does now:** CRUD for deal analyses. 7 endpoints. `create_deal` (line 157)
dynamically imports strategy calculators, computes outputs + risk score, saves to DB.
`list_deals` (line 209) supports filtering, search, pagination. `share_deal` (line 354)
marks a deal as shared. `generate_deal_offer_letter` (line 448) calls Claude AI.

**Billing changes:**

| Function                     | Line | Change Type | Description                                           |
|------------------------------|------|-------------|-------------------------------------------------------|
| `create_deal`                | 157  | WRAP        | Add quota check before creation: count user's non-deleted deals, compare to tier limit |
| `share_deal`                 | 354  | WRAP        | Add `require_tier("pro")` dependency                 |
| `generate_deal_offer_letter` | 448  | WRAP        | Add `require_tier("pro")` dependency + increment AI usage meter |

**Implementation pattern:**
```python
# New dependency to add:
from core.billing.guards import require_tier, check_quota

@router.post("/", ...)
async def create_deal(
    ...,
    _tier: None = Depends(check_quota("deals")),  # raises 403 if over limit
):
```

### 5.2 `backend/routers/chat.py` -- AI Chat Endpoints

**What it does now:** 2 endpoints. `chat` (line 97) streams AI responses via SSE.
Persists user + assistant messages to DB. Supports deal and document context injection.
Demo users get streaming but no persistence. `get_chat_history` (line 199) returns
last 50 messages.

**Billing changes:**

| Function             | Line | Change Type | Description                                        |
|----------------------|------|-------------|----------------------------------------------------|
| `chat`               | 97   | WRAP        | Increment usage meter for chat messages. Free tier: limit to N messages/month. Return SSE error if over limit. |
| `get_chat_history`   | 199  | NONE        | No change needed (read-only)                       |

**Critical detail:** The chat endpoint returns a `StreamingResponse`. The usage check
must happen BEFORE the generator starts yielding (i.e., before line 167). Add the
quota check between line 152 (`_demo = is_demo_user(current_user)`) and line 154
(`if not _demo: ...`). Demo users should bypass billing checks entirely.

### 5.3 `backend/routers/pipeline.py` -- Pipeline Endpoints

**What it does now:** 4 endpoints for Kanban board. `get_pipeline_board` (line 54)
returns all entries grouped by stage. `add_to_pipeline` (line 83) creates a new
pipeline card. `move_stage` (line 123) changes a card's stage. `remove_from_pipeline`
(line 160) hard-deletes.

**Billing changes:**

| Function               | Line | Change Type | Description                          |
|------------------------|------|-------------|--------------------------------------|
| `get_pipeline_board`   | 54   | NONE        | Read-only, available to all tiers    |
| `add_to_pipeline`      | 83   | WRAP        | `require_tier("pro")`                |
| `move_stage`           | 123  | WRAP        | `require_tier("pro")`                |
| `remove_from_pipeline` | 160  | WRAP        | `require_tier("pro")`                |

**UX note:** Free users can VIEW the pipeline (see deals in stages) but cannot
add/move/remove cards. The frontend should show disabled drag-and-drop with an
upgrade prompt.

### 5.4 `backend/routers/portfolio.py` -- Portfolio Endpoints

**What it does now:** 3 endpoints. `get_portfolio` (line 26) returns summary stats
+ all entries. `add_portfolio_entry` (line 79) creates a new closed-deal record.
`update_portfolio_entry` (line 128) edits details.

**Billing changes:**

| Function                 | Line | Change Type | Description                       |
|--------------------------|------|-------------|-----------------------------------|
| `get_portfolio`          | 26   | CONDITIONAL | Show summary to all; limit entries for free tier? Or gate entirely. |
| `add_portfolio_entry`    | 79   | WRAP        | `require_tier("pro")`             |
| `update_portfolio_entry` | 128  | WRAP        | `require_tier("pro")`             |

### 5.5 `backend/routers/documents.py` -- Document Endpoints

**What it does now:** 4 endpoints. `upload_document` (line 34) handles S3 upload +
background AI processing. `list_documents` (line 97) paginated list. `get_document`
(line 133) full detail. `delete_document` (line 151) removes from S3 + DB.

**Billing changes:**

| Function            | Line | Change Type | Description                                |
|---------------------|------|-------------|--------------------------------------------|
| `upload_document`   | 34   | WRAP        | Quota check: count monthly uploads vs tier limit |
| `list_documents`    | 97   | NONE        | Read-only                                  |
| `get_document`      | 133  | NONE        | Read-only                                  |
| `delete_document`   | 151  | NONE        | No gate (allow cleanup)                    |

### 5.6 `backend/routers/dashboard.py` -- Dashboard Endpoints

**What it does now:** 2 endpoints. `get_dashboard_stats` (line 44) returns aggregated
counts by strategy and pipeline stage. `get_activity_feed` (line 112) returns last
15 activity events across deals/pipeline/documents/portfolio.

**Billing changes:** NONE. Dashboard is available to all tiers. It already only
shows data the user has access to.

### 5.7 `backend/routers/settings.py` -- Settings Endpoints

**What it does now:** 2 endpoints for notification preferences (get + patch).

**Billing changes:**
- **NEW endpoint:** `GET /settings/billing/` -- Return current plan, usage, billing
  portal URL.
- **NEW endpoint:** `POST /settings/billing/portal/` -- Create Stripe billing portal
  session URL.
- These could alternatively live in a dedicated `/billing/` router.

### 5.8 `backend/routers/auth.py` -- Additional Billing Hooks

| Function   | Line | Change Type | Description                                       |
|------------|------|-------------|---------------------------------------------------|
| `register` | 82   | MODIFY      | Create default subscription record after user creation |
| `me`       | 181  | MODIFY      | Include plan info in response                     |
| `get_profile` | 187 | MODIFY   | Include plan info in response                     |

---

## 6. Demo Account System & Billing Interaction

### 6.1 How Demo Works

**`backend/core/demo/__init__.py`:** Defines `DEMO_EMAIL = "demo@parcel.app"` and
`RESERVED_EMAILS` set. Two functions: `is_demo_user(user)` checks email match,
`is_reserved_email(email)` blocks registration with reserved emails.

**Usage in codebase:**
- `auth.py` line 91: Blocks registration with demo email.
- `auth.py` line 208: Blocks profile update to demo email.
- `chat.py` line 152: Skips message persistence for demo users.
- `chat.py` line 210: Returns seeded fixture history for demo users.

### 6.2 Billing Interaction with Demo

**Rules:**
- Demo account must NEVER be billed. It should be treated as a special "demo" tier
  that has pro-level access but no Stripe integration.
- Every billing guard (`require_tier`, `check_quota`) must include an early return
  for demo users: `if is_demo_user(current_user): return` (always allow).
- The demo user should have `plan = "demo"` in the database (not "free" or "pro").
- Frontend should hide billing/upgrade CTAs when `user.plan === "demo"`.

---

## 7. Frontend Integration Map

### 7.1 `frontend/src/lib/api.ts` -- API Client

**What it does now:** Centralized fetch wrapper with 401 retry/refresh logic. All
API calls go through `request<T>()` (authenticated) or `requestPublic<T>()`
(unauthenticated). Exports `api` object with grouped methods.

**Billing integration points:**

| Change Type | Description                                                      |
|-------------|------------------------------------------------------------------|
| NEW         | Add `api.billing.getStatus()` -- `GET /api/v1/billing/status`   |
| NEW         | Add `api.billing.createCheckout(plan)` -- `POST /api/v1/billing/checkout` |
| NEW         | Add `api.billing.createPortal()` -- `POST /api/v1/billing/portal` |
| NEW         | Add `api.billing.getUsage()` -- `GET /api/v1/billing/usage`     |
| MODIFY      | Handle new HTTP 403 responses with `code: "TIER_REQUIRED"` -- show upgrade modal instead of generic error |

**403 handling pattern:** The `request()` function (line 51) currently handles 401
for auth. Add 403 handling:
```typescript
if (res.status === 403) {
  const error = await res.json()
  if (error.code === 'TIER_REQUIRED') {
    // Trigger upgrade modal via event or store
    throw new TierRequiredError(error.required_tier)
  }
}
```

### 7.2 `frontend/src/App.tsx` -- Route Structure

**What it does now:** 13 protected routes wrapped in `<ProtectedRoute>`, 6 public
routes. Uses `GuestRoute` for login/register.

**Billing integration points:**
- **NEW route:** `/settings/billing` or `/billing` for the billing management page.
- **NEW component:** `<TierGate tier="pro">` wrapper that shows upgrade prompt for
  free-tier users trying to access gated features.
- **NO new route guard needed.** Billing is enforced at the feature level (buttons,
  forms), not at the route level. Free users can visit `/pipeline` but see a
  read-only view with an upgrade CTA.

### 7.3 `frontend/src/lib/pdf-report.ts` -- PDF Generation

**What it does now:** 577 lines of jsPDF report generation. `generateDealReport(deal)`
is the sole export. Called from ResultsPage.

**Billing integration points:**
- **WRAP call site** (not this file). The `generateDealReport` function itself stays
  unchanged. The button that calls it in `ResultsPage.tsx` should check the user's
  plan before invoking. If free tier, show upgrade modal instead of generating.
- This is a **frontend-only gate** since PDF generation happens entirely client-side.

### 7.4 `frontend/src/pages/chat/ChatPage.tsx` -- Chat UI

**What it does now:** 395 lines. SSE streaming chat with history loading, suggested
questions, abort controller, markdown rendering.

**Billing integration points:**
- **ADD usage display:** Show remaining messages count (e.g., "12/25 messages this
  month") in the header area near "AI Specialist" (around line 228).
- **ADD gate on send:** Before `handleSend` (line 135) dispatches the stream, check
  if the user has remaining quota. If not, show upgrade modal.
- **ADD visual indicator:** When approaching the limit (e.g., 80% used), show a
  warning banner.

### 7.5 `frontend/src/stores/authStore.ts` -- Auth Store

**Changes needed:**
- The `User` type gains `plan`, `plan_status`, `current_period_end` fields.
- No structural changes to the store itself.
- Add a derived selector: `const plan = useAuthStore(s => s.user?.plan ?? 'free')`.

### 7.6 `frontend/src/lib/chat-stream.ts` -- Chat Stream

**What it does now:** SSE streaming via fetch + ReadableStream. Handles 401 by
clearing auth.

**Billing integration points:**
- **ADD 403 handling** (after line 31): If the chat endpoint returns 403 with
  `TIER_REQUIRED` or `QUOTA_EXCEEDED`, surface a user-friendly error instead of
  a generic "HTTP 403" message.

---

## 8. New Files Required

### Backend (new files)

| File                                    | Purpose                                              |
|-----------------------------------------|------------------------------------------------------|
| `backend/routers/billing.py`           | Billing router: checkout, portal, webhook, status, usage |
| `backend/models/subscriptions.py`      | Subscription SQLAlchemy model                        |
| `backend/models/usage_records.py`      | Usage tracking SQLAlchemy model                      |
| `backend/schemas/billing.py`           | Pydantic schemas for billing endpoints               |
| `backend/core/billing/__init__.py`     | Package init                                         |
| `backend/core/billing/guards.py`       | `require_tier()` and `check_quota()` dependencies    |
| `backend/core/billing/stripe_service.py` | Stripe API wrapper: customers, checkout, portal, webhooks |
| `backend/core/billing/usage.py`        | Usage counting/incrementing logic                    |
| `backend/core/billing/plans.py`        | Plan definitions (limits, features per tier)          |
| `backend/alembic/versions/xxx_add_billing.py` | Migration for new tables + user columns       |
| `backend/tests/test_billing.py`        | Billing endpoint tests                               |

### Frontend (new files)

| File                                              | Purpose                                      |
|---------------------------------------------------|----------------------------------------------|
| `frontend/src/pages/settings/BillingPage.tsx`    | Billing management UI                        |
| `frontend/src/components/billing/UpgradeModal.tsx` | Reusable upgrade prompt modal              |
| `frontend/src/components/billing/TierGate.tsx`   | Component that gates children by plan        |
| `frontend/src/components/billing/UsageMeter.tsx` | Visual usage bar for chat/deals/documents    |
| `frontend/src/hooks/usePlan.ts`                  | Hook returning current plan + limits         |
| `frontend/src/hooks/useUsage.ts`                 | Hook fetching usage data from API            |
| `frontend/src/types/billing.ts`                  | Billing-related TypeScript types             |

---

## 9. Test Infrastructure

### 9.1 `backend/tests/conftest.py` -- Test Setup

**What it does now:** In-memory SQLite with dialect patches for PostgreSQL types
(UUID, JSONB). Auto-creates/drops all tables per test. Provides `db`, `client`,
`test_user`, and `auth_client` fixtures.

**Billing integration points:**
- **MODIFY `test_user` fixture** (line 138): After creating the user, also create
  a default `Subscription` record with `plan="free"`. Or add a `pro_user` fixture.
- **NEW fixtures:**
  - `pro_user` -- User with `plan="pro"` subscription
  - `team_user` -- User with `plan="team"` subscription
  - `pro_auth_client` -- Authenticated client for pro-tier user
- **SQLite compatibility:** The new subscription/usage_records models use standard
  types (UUID, String, DateTime, Integer) that already work with the existing
  dialect patches.

---

## 10. Dependency Analysis

### 10.1 `backend/requirements.txt` -- Current Dependencies (17 packages)

**New dependency needed:** `stripe>=8.0.0` (Stripe Python SDK).

No other new dependencies are required. The existing stack (FastAPI, SQLAlchemy,
Pydantic, python-jose) already supports everything needed for billing logic.

### 10.2 Frontend Dependencies

**New dependency needed:** None for MVP. Stripe Checkout is a redirect-based flow
that requires no frontend SDK. If embedding Stripe Elements later, add
`@stripe/stripe-js` and `@stripe/react-stripe-js`.

---

## 11. Summary: All Integration Points

### Files to MODIFY (existing)

| File                                     | Changes                                          |
|------------------------------------------|--------------------------------------------------|
| `backend/main.py`                        | Mount billing router                             |
| `backend/models/users.py`               | Add `stripe_customer_id`, `plan` columns         |
| `backend/schemas/auth.py`               | Add plan fields to UserResponse, UserProfileResponse |
| `backend/routers/auth.py`               | Create subscription on register; include plan in /me |
| `backend/routers/deals.py`              | Add quota/tier guards to create, share, offer-letter |
| `backend/routers/chat.py`               | Add quota guard + usage metering to chat endpoint |
| `backend/routers/pipeline.py`           | Add tier guards to write endpoints               |
| `backend/routers/portfolio.py`          | Add tier guards to write endpoints               |
| `backend/routers/documents.py`          | Add quota guard to upload endpoint               |
| `backend/requirements.txt`              | Add `stripe>=8.0.0`                             |
| `backend/tests/conftest.py`             | Add billing fixtures                             |
| `frontend/src/types/index.ts`           | Add plan fields to User interface                |
| `frontend/src/lib/api.ts`               | Add billing API methods + 403 handling           |
| `frontend/src/lib/chat-stream.ts`       | Add 403 handling for quota exceeded              |
| `frontend/src/App.tsx`                   | Add billing settings route                       |
| `frontend/src/pages/chat/ChatPage.tsx`  | Add usage display + send gating                  |
| `frontend/src/pages/analyze/ResultsPage.tsx` | Gate PDF download button by tier            |

### Files to CREATE (new)

| File                                              | Type     |
|---------------------------------------------------|----------|
| `backend/routers/billing.py`                     | Router   |
| `backend/models/subscriptions.py`                | Model    |
| `backend/models/usage_records.py`                | Model    |
| `backend/schemas/billing.py`                     | Schema   |
| `backend/core/billing/__init__.py`               | Package  |
| `backend/core/billing/guards.py`                 | Logic    |
| `backend/core/billing/stripe_service.py`         | Logic    |
| `backend/core/billing/usage.py`                  | Logic    |
| `backend/core/billing/plans.py`                  | Config   |
| `backend/alembic/versions/xxx_add_billing.py`    | Migration|
| `backend/tests/test_billing.py`                  | Tests    |
| `frontend/src/pages/settings/BillingPage.tsx`    | Page     |
| `frontend/src/components/billing/UpgradeModal.tsx`| Component|
| `frontend/src/components/billing/TierGate.tsx`   | Component|
| `frontend/src/components/billing/UsageMeter.tsx` | Component|
| `frontend/src/hooks/usePlan.ts`                  | Hook     |
| `frontend/src/hooks/useUsage.ts`                 | Hook     |

---

## RECOMMENDATIONS FOR PARCEL

1. **Start with the guards, not the Stripe integration.** Build `require_tier()` and
   `check_quota()` as FastAPI dependencies first, with plan info coming from the User
   model's `plan` column. Test all gating logic with the in-memory SQLite test suite.
   Wire up Stripe second. This lets you ship tier-gated features before payment
   processing is live.

2. **Add billing fields to the User model via a single Alembic migration.** Add
   `stripe_customer_id` and `plan` (default "free") directly on the `users` table.
   Create a separate `subscriptions` table for audit history and a `usage_records`
   table for metering. This is one migration, one deploy.

3. **Make the demo account a first-class billing tier.** Set the demo user's `plan`
   to `"demo"` and have all guards treat `"demo"` as equivalent to `"pro"`. This
   avoids special-casing demo checks throughout the billing code -- the existing
   `is_demo_user()` check becomes a plan-level concern.

4. **Return plan info from `/auth/me` and `/auth/refresh`.** The frontend already
   calls `/auth/me` on every page load (via `useSessionValidation` in App.tsx line 54).
   Adding `plan` to the response means the frontend has tier info immediately without
   an extra API call. This is the single most impactful change for frontend gating.

5. **Use HTTP 403 with a structured error body for tier/quota denials.** Return
   `{"error": "Pro plan required", "code": "TIER_REQUIRED", "required_tier": "pro"}`
   or `{"error": "Monthly limit reached", "code": "QUOTA_EXCEEDED", "limit": 25, "used": 25}`.
   This lets the frontend API client detect billing errors specifically and trigger
   the upgrade modal, distinct from auth 401 errors.

6. **Gate the chat SSE endpoint before the stream starts.** The chat endpoint
   (`chat.py` line 97) returns a `StreamingResponse`. Any quota check or billing
   error must be raised BEFORE the generator function is returned (i.e., between
   lines 152-166). Once streaming begins, you cannot send an HTTP error status.

7. **PDF report gating is frontend-only.** Since `generateDealReport()` runs
   entirely in the browser via jsPDF, the backend has no endpoint to gate. The
   "Download PDF" button in `ResultsPage.tsx` should check `user.plan` and show an
   `<UpgradeModal>` if the user is on the free tier.

8. **Pipeline should be read-only for free tier, not hidden.** Free users can see
   the Kanban board (motivation to upgrade) but the "Add to Pipeline" button, drag
   handles, and stage-change dropdowns should be disabled with upgrade prompts. The
   `GET /pipeline/` endpoint stays ungated; only POST/PUT/DELETE get `require_tier("pro")`.

9. **Stripe webhook should be idempotent and use event IDs for deduplication.** Store
   processed Stripe event IDs in a `stripe_events` table to prevent duplicate processing.
   Critical webhook events: `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`, `invoice.payment_failed`.

10. **Add `stripe>=8.0.0` as the only new backend dependency.** No frontend Stripe
    SDK is needed for Phase 1 (Stripe Checkout is redirect-based). This minimizes
    bundle impact and keeps the integration server-side where secrets are safe.

11. **Test billing with the existing conftest pattern.** The SQLite-based test
    infrastructure already handles UUID and JSONB compatibility. Add `pro_user` and
    `pro_auth_client` fixtures alongside the existing `test_user`/`auth_client` to
    test both free and pro paths. Mock the Stripe API calls in tests.

12. **Plan the billing page as a new Settings sub-route.** The Settings page already
    exists at `/settings`. Add a `/settings/billing` route (or a tab within the
    existing Settings page) that shows current plan, usage meters, and a "Manage
    Subscription" button linking to the Stripe billing portal.
