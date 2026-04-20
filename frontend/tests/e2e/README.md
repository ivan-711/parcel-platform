# Playwright E2E Tests

Browser-based end-to-end tests for Parcel persona differentiation and future
launch-week smoke tests. Uses Clerk's official `@clerk/testing` package and a
single stored auth session (`storageState`) shared across all specs.

---

## Env isolation: `.env.test` only

These tests load env vars **exclusively** from `frontend/.env.test` (via
`dotenv` at the top of `playwright.config.ts`). They do **not** read
`.env.local`.

Why: `.env.local` typically holds production Clerk keys (`pk_live_`) and
points `VITE_API_URL` at the production Railway backend because normal
frontend-only development runs against prod. Playwright needs the opposite:
dev Clerk keys (`pk_test_`) and a local backend at `localhost:8000` (where
the dev-only `/api/testing/*` endpoints are registered).

`npm run dev` is unaffected — it keeps using `.env.local`.

---

## Prerequisites

1. **Backend** running at `http://localhost:8000` with `ENVIRONMENT=development`
   (or `ENVIRONMENT=test`). Without one of those values the `/api/testing/*`
   endpoints do not exist and `seedPersona` returns 404.

2. **Frontend** dev server running at `http://localhost:5173`.

3. **Clerk dev test user** — a real user in your Clerk **dev** instance.

4. **`frontend/.env.test`** populated with dev-Clerk + localhost values.

---

## One-time setup

### 1. Create the Clerk dev test user

1. Open [dashboard.clerk.com](https://dashboard.clerk.com) and select your
   **dev** instance.
2. Under **User & Authentication → Email, Phone, Username**, make sure
   username+password (or email+password) sign-in is enabled.
3. Under **Users → + New user**, create e.g. `e2e-test@parceldesk.io` with a
   strong password.
4. Verify the password works by signing in once via Clerk's hosted sign-in
   page.

### 2. Create `frontend/.env.test`

```bash
cp frontend/.env.test.example frontend/.env.test
```

Fill in real values:

```
VITE_API_URL=http://localhost:8000
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
E2E_CLERK_USER_USERNAME=e2e-test@parceldesk.io
E2E_CLERK_USER_PASSWORD=<the password you set>
```

### 3. Confirm `.env.test` is gitignored

```bash
grep -E "env.test" frontend/.gitignore
```

Should print `.env.test`. `git status frontend/.env.test` should show nothing.

### 4. Provision the Parcel DB row

Start the backend + frontend, sign in once at `http://localhost:5173` with
the dev test user. The Clerk webhook creates the matching `User` row
(required or `seedPersona` returns 404 "User not found").

---

## How to run

```bash
cd frontend

# Headless run, all tests
npm run test:e2e

# Interactive UI mode (watch, filter, debug single tests)
npm run test:e2e:ui

# Debug mode with browser visible + inspector
npm run test:e2e:debug
```

First run downloads chromium (already installed via `npx playwright install
chromium` at setup). Subsequent runs reuse the saved Clerk session in
`playwright/.clerk/user.json` until it expires.

---

## The test-only backend endpoints

The router at `backend/routers/testing.py` exposes:

- `POST /api/testing/seed-persona` — sets `onboarding_persona` and optionally
  `onboarding_completed_at`.
- `GET /api/testing/user-state` — reads `onboarding_persona`,
  `notify_agent_features`, `onboarding_completed_at`.

**Safety:** the router is imported and registered in `main.py` **only** when
`ENVIRONMENT ∈ {"development", "test"}`. Production deploys set
`ENVIRONMENT=production`, so the routes do not exist there — they return 404.
`tests/test_testing_endpoints.py::TestRouterGating` verifies the gating.

Auth is intentionally bypassed on these endpoints because Playwright's global
setup needs to seed state before a Clerk session exists.

---

## Troubleshooting

- **`Missing required env vars: ...`**
  `.env.test` wasn't created, is empty, or is missing one of
  `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `E2E_CLERK_USER_USERNAME`,
  `E2E_CLERK_USER_PASSWORD`. Copy `.env.test.example` and fill all values.

- **"Clerk sign-in failed" / invalid credentials**
  You're probably using `pk_live_`/`sk_live_` keys by mistake, or the
  publishable and secret keys are from different Clerk instances. Double
  check both keys come from the **same dev instance**. Or: the test user
  doesn't exist in the dev instance (check dashboard.clerk.com → Users).

- **`POST /api/testing/seed-persona 404`** (route not found)
  Backend isn't running, or `ENVIRONMENT` isn't `development`/`test`. Start
  with `cd backend && ENVIRONMENT=development uvicorn main:app --reload`.

- **`POST /api/testing/seed-persona 404 user not found`**
  The Clerk user exists but hasn't been provisioned in Parcel's DB yet.
  Sign in once at `http://localhost:5173` with the test user so the Clerk
  webhook creates the DB row.

- **Hybrid test times out on `waitForURL`**
  RentCast or Anthropic API is slow. Increase `timeout: 60_000` in
  `persona-hybrid-comparison.spec.ts` or verify backend API keys are set.

- **Paywall dialog never appears**
  Test user is on a paid plan. Downgrade to `free` in the DB so
  `/pipeline` and `/skip-tracing` are gated.

---

## Known limitations

- **Single test user, sequential runs.** `fullyParallel: false`, `workers: 1`.
  Parallelization would require a user pool.
- **Real external calls on the hybrid test.** Fix 1 hits `/analyze` with a
  real address → real RentCast + Anthropic calls. Pennies per run.
- **Text-based selectors.** Matchers use role + text rather than
  `data-testid`. If UI copy changes, selectors can drift — adding stable
  testids to the paywall dialog, agent modal, and hybrid banner would
  harden things.
- **Local dev only.** No staging / CI wiring yet. `PLAYWRIGHT_BASE_URL`
  and `PLAYWRIGHT_API_BASE` are the extension points when we get there.

---

## Related

- `docs/PERSONA-DIFFERENTIATION-AUDIT.md` — the audit that drove commit 9277f37
- `backend/routers/testing.py` — the dev/test-only router
- Clerk's official docs: https://clerk.com/docs/guides/development/testing/playwright/overview
