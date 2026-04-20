# Playwright E2E Tests

Browser-based end-to-end tests for Parcel persona differentiation and future
launch-week smoke tests. Uses Clerk's official `@clerk/testing` package and a
single stored auth session (`storageState`) shared across all specs.

---

## Prerequisites

1. **Backend** running at `http://localhost:8000` with `ENVIRONMENT=development`
   (or `ENVIRONMENT=test`). Without one of those values, the `/api/testing/*`
   endpoints used for persona seeding are **not registered** and the tests will
   fail fast with a descriptive error.

2. **Frontend** dev server running at `http://localhost:5173`.

3. **Clerk test user** — a real user in your Clerk dev instance (see below).

4. **Required env vars** in `frontend/.env.local` (or your shell):

   ```
   CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   E2E_CLERK_USER_USERNAME=e2e-test@parceldesk.io
   E2E_CLERK_USER_PASSWORD=<the password you set in Clerk>
   ```

   Optional overrides:

   ```
   PLAYWRIGHT_BASE_URL=http://localhost:5173
   PLAYWRIGHT_API_BASE=http://localhost:8000
   ```

---

## One-time Clerk test-user setup

1. Open [dashboard.clerk.com](https://dashboard.clerk.com) and select your dev
   instance.
2. Under **User & Authentication → Email, Phone, Username**, make sure
   username+password (or email+password) sign-in is enabled.
3. Under **Users**, create a user — e.g. `e2e-test@parceldesk.io` — with a
   strong password.
4. Verify the password works by signing in once via Clerk's hosted sign-in
   page (prevents "password must be reset" failures in CI).
5. Paste the credentials into `frontend/.env.local` (see Prerequisites).

The same user must also exist in the Parcel backend DB (created on first
login via Clerk webhook). If tests fail with "User not found", sign into the
frontend once with the test account so the Clerk webhook provisions the DB
row.

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
  `onboarding_completed_at`. Used by specs to put the test user into a known
  state.
- `GET /api/testing/user-state` — reads `onboarding_persona`,
  `notify_agent_features`, `onboarding_completed_at`. Used by specs to verify
  backend side effects.

**Safety:** the router is imported and registered in `main.py` **only** when
`ENVIRONMENT ∈ {"development", "test"}`. Production deploys set
`ENVIRONMENT=production`, so the routes do not exist there — they return 404.
A pytest case (`tests/test_testing_endpoints.py::TestRouterGating`) verifies
the gating.

Authentication is intentionally bypassed on these endpoints because
Playwright's global setup needs to seed state before a Clerk session exists.

---

## Known limitations

- **Single test user, sequential runs.** Tests share one Clerk test user, so
  `fullyParallel` is off and `workers: 1`. Parallelization would require a
  user pool.
- **Real external calls on the hybrid test.** The Fix 1 spec hits
  `/analyze` with a real address, which currently fires RentCast + Anthropic
  calls on the backend. Cost is pennies per run but real.
- **Timing on the SSE analysis stream.** The hybrid test waits up to 60s for
  the analysis URL. If your dev machine is slow or APIs are slow, bump the
  `waitForURL` timeout in `persona-hybrid-comparison.spec.ts`.
- **Text-based selectors.** Specs match by role + text rather than
  `data-testid` because those testids don't exist yet in source. If the UI
  copy changes, the selectors can drift — consider adding stable testids to
  at least the paywall dialog, agent modal, and hybrid banner.
- **Local dev only.** No staging / CI wiring yet. `PLAYWRIGHT_BASE_URL` and
  `PLAYWRIGHT_API_BASE` are the extension points when we get there.

---

## Related

- `docs/PERSONA-DIFFERENTIATION-AUDIT.md` — the audit that drove commit 9277f37
- `backend/routers/testing.py` — the dev/test-only router
- Clerk's official docs: https://clerk.com/docs/guides/development/testing/playwright/overview
