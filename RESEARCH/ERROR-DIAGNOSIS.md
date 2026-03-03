# Error Diagnosis: Post-Login Crash on parceldesk.io

## Root Cause (P0) — CONFIRMED by 3 of 4 agents

### React Hooks Ordering Violation in Dashboard.tsx

**File:** `frontend/src/pages/Dashboard.tsx`
**Error:** React error #310 — "Rendered more hooks than during the previous render"
**Confidence:** 99% — independently confirmed by Agent 1 (Network), Agent 2 (Error Boundary), and Agent 3 (Frontend Code)

#### What Happens

1. User logs in successfully (login POST returns 200, cookie is set correctly)
2. React Router navigates to `/dashboard`
3. Dashboard component mounts — `isLoading` is `true` on first render
4. Component hits early return at **line 137** (loading skeleton) — only **5 hooks** have been called
5. Data arrives, React re-renders — `isLoading` becomes `false`
6. Component passes all early returns and reaches `useMemo` at **line 241** — now **6 hooks** are called
7. React detects the hook count mismatch → throws error #310
8. `PageErrorBoundary` catches it → user sees "This section encountered an error"

#### Why "Retry" Works

When the user clicks Retry, the component remounts fresh. React Query already has cached data, so `isLoading` is `false` from render #1. All 6 hooks execute on the first render. Hook count is stable → no crash.

#### The Fix

Move the `useMemo` (line 241) and `closedDeals` variable (line 234) to **before** all early returns (before line 137). Use optional chaining with fallback values:

```tsx
// BEFORE the early returns:
const closedDeals = stats?.closed_deals ?? 0
const pipelineEntries = useMemo(() => {
  // ... existing logic with null checks
}, [stats])
```

This ensures all hooks are called unconditionally on every render, regardless of loading/error state.

---

## Secondary Issues

### Issue 2 (P0): Login uses `request()` instead of `requestPublic()`

**File:** `frontend/src/lib/api.ts`, line 85
**Impact:** When a user enters wrong credentials, the 401 handler calls `clearAuth()` and throws "Session expired" instead of showing the actual backend error ("Invalid email or password"). Confusing UX.
**Fix:** Change `api.auth.login` and `api.auth.register` to use `requestPublic()` instead of `request()`.

### Issue 3 (P1): Missing refresh_token cookie

**Finding:** The login response only sets `access_token` (15 min expiry). No `refresh_token` cookie is set.
**Impact:** After 15 minutes, the user's session silently expires and the next API call triggers 401 → `clearAuth()` → redirect to login. No graceful refresh.
**Fix:** Backend should also set a `refresh_token` cookie, and frontend should implement a token refresh interceptor.

### Issue 4 (P1): Vercel redirects parceldesk.io → www.parceldesk.io

**Finding:** `curl -I https://parceldesk.io` returns 307 → `https://www.parceldesk.io/`
**Impact:** Currently benign (CORS allows both, cookies work with SameSite=None), but creates an unnecessary redirect hop. Could cause issues with some browser cookie policies (Safari ITP).
**Fix:** Either configure Vercel to serve from the apex domain, or standardize on `www.parceldesk.io` everywhere.

### Issue 5 (P2): StrategyBadge crashes on unknown strategy

**File:** `frontend/src/components/ui/StrategyBadge.tsx`, line 19
**Impact:** If the backend returns a strategy string not in the hardcoded map, accessing `.bg` on `undefined` throws TypeError.
**Fix:** Add a fallback/default case in `STRATEGY_CONFIG`.

### Issue 6 (P2): No .env.production file

**Finding:** No `frontend/.env.production` exists. Production relies on Vercel dashboard env vars or the hardcoded fallback `https://api.parceldesk.io` in api.ts.
**Impact:** Currently working (fallback is correct), but fragile.
**Fix:** Add `frontend/.env.production` with `VITE_API_URL=https://api.parceldesk.io`.

### Issue 7 (P3): Error boundary uses process.env.NODE_ENV

**File:** `frontend/src/components/error-boundary.tsx`
**Impact:** In Vite, `process.env.NODE_ENV` may not resolve correctly. Should use `import.meta.env.MODE`.
**Fix:** Replace `process.env.NODE_ENV` with `import.meta.env.MODE`.

---

## Network Status — ALL CLEAR

| Check | Result |
|-------|--------|
| api.parceldesk.io health | 200 OK |
| Login POST | 200, returns user object |
| Set-Cookie on login | Yes, access_token with HttpOnly, Secure, SameSite=None |
| Cookie sent on subsequent requests | Yes (credentials: 'include' works) |
| Dashboard stats API | 200, returns valid JSON |
| Dashboard activity API | 200, returns valid JSON |
| Any 401/500 errors | None |
| HTML returned instead of JSON | No |
| CORS headers | Correct for both parceldesk.io and www.parceldesk.io |

---

## Summary of Required Fixes (Priority Order)

| Priority | Issue | File | Fix |
|----------|-------|------|-----|
| **P0** | Hooks ordering violation | `Dashboard.tsx:241` | Move `useMemo` and `closedDeals` before early returns |
| **P0** | Login uses wrong request function | `api.ts:85` | Change to `requestPublic()` |
| P1 | No refresh token | Backend auth | Add refresh_token cookie |
| P1 | Apex → www redirect | Vercel config | Standardize domain |
| P2 | StrategyBadge no fallback | `StrategyBadge.tsx:19` | Add default config |
| P2 | No .env.production | `frontend/` | Create file |
| P3 | process.env in error boundary | `error-boundary.tsx` | Use import.meta.env |
