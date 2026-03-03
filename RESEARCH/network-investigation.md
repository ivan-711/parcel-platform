# Post-Login Crash Investigation — parceldesk.io

**Date:** 2026-03-02
**Investigator:** Claude Code (browser MCP)
**Symptom:** React error boundary crash immediately after login

---

## Executive Summary

The crash is **NOT a network or authentication issue**. All API calls succeed with HTTP 200. The root cause is a **React hooks ordering violation** in `Dashboard.tsx` — a `useMemo` hook is called conditionally (only when data is loaded), which violates React's Rules of Hooks and triggers **Minified React error #310: "Rendered more hooks than during the previous render."**

---

## Network Investigation Results

### 1. Login POST to api.parceldesk.io

| Field | Value |
|-------|-------|
| **URL** | `POST https://api.parceldesk.io/api/v1/auth/login` |
| **Status** | `200 OK` |
| **Response Content-Type** | `application/json` |
| **Response Body** | `{"user":{"id":"4021150f-...","name":"Alex Rivera","email":"demo@parcel.app","role":"investor","team_id":null,"created_at":"2026-03-01T21:07:05.927671"}}` |

**Verdict:** Login succeeds. Returns 200 with valid JSON user object.

### 2. Set-Cookie Header / Cookie Attributes

The login response sets an httpOnly cookie (not visible to `document.cookie` but confirmed via Playwright's cookie jar):

| Attribute | Value |
|-----------|-------|
| **Name** | `access_token` |
| **Domain** | `api.parceldesk.io` |
| **Path** | `/` |
| **HttpOnly** | `true` |
| **Secure** | `true` |
| **SameSite** | `None` |
| **Expires** | ~15 minutes from login (observed: 2026-03-03T03:15:26Z for login at ~02:59Z) |

**Notable:** Only ONE cookie is set (`access_token`). There is NO `refresh_token` cookie, despite CLAUDE.md specifying a 7-day refresh token. This is a secondary concern but means sessions will hard-expire after 15 minutes with no silent refresh.

### 3. Post-Login Requests

After login, the frontend navigates to `/dashboard` and makes these API calls:

| Order | Request | Status | Includes Cookie? |
|-------|---------|--------|-------------------|
| 1 | `GET /api/v1/dashboard/stats/` | 200 | Yes (credentials: 'include') |
| 2 | `GET /api/v1/dashboard/activity/` | 200 | Yes (credentials: 'include') |

Both requests succeed. The API client (`frontend/src/lib/api.ts` line 38) uses `credentials: 'include'` on all fetch calls, which correctly sends the `access_token` cookie cross-origin from `www.parceldesk.io` to `api.parceldesk.io`.

### 4. Any 401 or 500 Responses?

**No.** Every single request returned HTTP 200 (or 304 for cached static assets). No 401s, no 500s, no errors of any kind from the network.

### 5. Any Request Returning HTML Instead of JSON?

**No.** All API responses returned `content-type: application/json`. No HTML was served from the API.

### 6. Exact API URL the Frontend Calls

The base URL is defined in `frontend/src/lib/api.ts` line 29:
```typescript
const API_URL = (import.meta.env.VITE_API_URL ?? 'https://api.parceldesk.io').replace('http://', 'https://')
```

All API calls go to: **`https://api.parceldesk.io`** (with paths like `/api/v1/...`).

The initial page load on `https://parceldesk.io` receives a 307 redirect to `https://www.parceldesk.io`.

---

## Root Cause: React Hooks Ordering Violation

### The Error

```
Error: Minified React error #310
"Rendered more hooks than during the previous render."
```

Stack trace points to `useMemo` in `Dashboard-k0phtDjB.js:1:5081`.

### The Bug (file: `frontend/src/pages/Dashboard.tsx`)

The `Dashboard` component calls hooks in this order:

```
Hook #1: useNavigate()           — line 110
Hook #2: useDashboard()          — line 111 (wraps useQuery)
Hook #3: useAuthStore()          — line 112
Hook #4: useState(false)         — line 114
Hook #5: useQuery({...activity}) — line 116
```

Then on **line 137**, there is an early return for the loading state:
```tsx
if (isLoading) {
  return (...) // <-- RETURNS HERE on first render
}
```

The `useMemo` on **line 241** is only reached when `isLoading` is false AND `isError` is false AND `stats.total_deals > 0`:
```tsx
const sparklines = useMemo(() => ({...}), [...]) // Hook #6 — CONDITIONAL!
```

**Timeline of the crash:**
1. **First render:** `isLoading = true` → hooks 1-5 run → early return at line 137 → `useMemo` never runs → React records 5 hooks
2. **Second render:** data arrives, `isLoading = false`, all guards pass → hooks 1-5 run → `useMemo` runs → React sees 6 hooks but expected 5 → **CRASH**

### Why Retry Works

When the error boundary catches the crash and the user clicks "Retry", the component remounts fresh. By that time, React Query has the dashboard data cached (staleTime: 30s), so `isLoading` is immediately `false` on the very first render of the remounted component. The `useMemo` runs from render #1, and subsequent renders also run it — hooks count is stable at 6. No crash.

### The Fix

Move the `useMemo` call **above** all early returns, so it runs on every render regardless of loading/error state. Provide safe defaults for when data isn't available:

```tsx
// BEFORE (broken — after early returns):
const sparklines = useMemo(() => ({
  totalDeals: generateTrendData(stats.total_deals, 7, 0.12),
  ...
}), [stats.total_deals, stats.active_pipeline_deals, closedDeals])

// AFTER (fixed — before early returns):
const closedDeals = stats?.closed_deals ?? 0
const sparklines = useMemo(() => ({
  totalDeals: generateTrendData(stats?.total_deals ?? 0, 7, 0.12),
  activePipeline: generateTrendData(stats?.active_pipeline_deals ?? 0, 7, 0.18),
  closedDeals: generateTrendData(closedDeals, 7, 0.1),
  dealsAnalyzed: generateTrendData(stats?.total_deals ?? 0, 7, 0.15),
}), [stats?.total_deals, stats?.active_pipeline_deals, closedDeals])
```

Also move `const pipelineEntries = ...` (line 236) above the early returns or into the render section that uses it.

---

## Secondary Findings

### Missing Refresh Token
The auth system only sets an `access_token` cookie (15-min expiry). There is no `refresh_token` cookie. Per CLAUDE.md, refresh tokens should have a 7-day expiry. Without a refresh token, users will be silently logged out every 15 minutes.

### User Data in localStorage
The login flow stores user data in `localStorage` under key `parcel_user`. This is used by the Zustand `authStore` for UI state (name, email, role display). The actual authentication is cookie-based (httpOnly `access_token`).

### Cookie Configuration
The `SameSite=None; Secure; HttpOnly` configuration on `api.parceldesk.io` is correct for cross-origin cookie auth between `www.parceldesk.io` (frontend on Vercel) and `api.parceldesk.io` (backend on Railway).

### Domain Redirect
`https://parceldesk.io` redirects (307) to `https://www.parceldesk.io`. This is handled by Vercel's domain configuration.

---

## Full Request Log (Clean Login Flow)

```
[GET]  https://parceldesk.io/login                           => [307] redirect
[GET]  https://www.parceldesk.io/login                       => [200] HTML (SPA)
[GET]  fonts.googleapis.com/css2?family=Inter...              => [200] CSS
[GET]  www.parceldesk.io/assets/index-DJs4xIQB.js            => [200] React bundle
[GET]  www.parceldesk.io/assets/index-DPUNfIWF.css           => [200] CSS bundle
[GET]  www.parceldesk.io/assets/Login-B288zYsg.js             => [200] Login chunk
[GET]  www.parceldesk.io/assets/input-j-uGxZgv.js            => [200] Input component
[GET]  www.parceldesk.io/assets/label-WTUaC4pi.js            => [200] Label component
[GET]  www.parceldesk.io/assets/useAuth--nALJvmx.js          => [200] Auth hook
[GET]  www.parceldesk.io/assets/api-DCbgLhts.js              => [200] API client
[GET]  fonts.gstatic.com/.../inter/...                        => [200] Font file
[POST] api.parceldesk.io/api/v1/auth/login                   => [200] ✅ Login success
[GET]  www.parceldesk.io/assets/Dashboard-k0phtDjB.js        => [200] Dashboard chunk
[GET]  www.parceldesk.io/assets/AppShell-BQKuidhA.js         => [200] AppShell chunk
[GET]  www.parceldesk.io/assets/popover-DxcX6WvR.js          => [200] Popover
[GET]  www.parceldesk.io/assets/git-branch-G-8WBmRO.js       => [200] Icon
[GET]  www.parceldesk.io/assets/KPICard-CHGIbqRo.js          => [200] KPI card
[GET]  www.parceldesk.io/assets/generateCategoricalChart-...  => [200] Recharts
[GET]  www.parceldesk.io/assets/index-Djr--k3J.js            => [200] Recharts core
[GET]  www.parceldesk.io/assets/StrategyBadge-yY_0v-CX.js    => [200] Badge component
[GET]  www.parceldesk.io/assets/circle-alert-BY23uVVD.js     => [200] Icon
[GET]  www.parceldesk.io/assets/arrow-right-UnGgN_BK.js      => [200] Icon
[GET]  fonts.gstatic.com/.../jetbrainsmono/...                => [200] Font file
[GET]  api.parceldesk.io/api/v1/dashboard/stats/             => [200] ✅ Dashboard data
[GET]  api.parceldesk.io/api/v1/dashboard/activity/          => [200] ✅ Activity data
```

**Zero failures. Zero 401s. Zero 500s. The network layer is fully healthy.**

---

## Console Errors

```
[ERROR] Error: Minified React error #310; visit https://reactjs.org/docs/error-decoder.html?invariant=310
    at $t (index-DJs4xIQB.js:39:17831)
    at Object.ah [as useMemo] (index-DJs4xIQB.js:39:21526)      ← useMemo
    at Ew.ve.useMemo (index-DJs4xIQB.js:10:6340)
    at ne (Dashboard-k0phtDjB.js:1:5081)                         ← Dashboard component
    at nu (index-DJs4xIQB.js:39:17236)
    ...
```

---

## Recommendations

1. **P0 — Fix the hooks violation in Dashboard.tsx:** Move `useMemo` (and the `closedDeals`/`pipelineEntries` derived values) above all early returns. This is the crash.
2. **P1 — Add refresh token:** Implement a `refresh_token` cookie with 7-day expiry to prevent silent logouts every 15 minutes.
3. **P2 — Lint rule:** Add `eslint-plugin-react-hooks` with the `exhaustive-deps` and `rules-of-hooks` rules to catch conditional hook calls at build time.
