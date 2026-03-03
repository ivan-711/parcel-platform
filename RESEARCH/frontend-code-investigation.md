# Frontend Code Investigation: Error Boundary Crash After Login

**Date:** 2026-03-02
**Scope:** React error boundary crash on parceldesk.io immediately after login
**Files examined:** 25+ files across frontend and backend

---

## Executive Summary

After thorough analysis of every component in the Dashboard render tree and the full auth/API flow, I identified **6 potential crash causes** ranked by likelihood. The most probable culprit is a **cross-origin cookie delivery failure** causing an immediate 401 on the first authenticated API call after login, which triggers `clearAuth()` and creates a redirect loop that surfaces as an error boundary crash. Two secondary rendering bugs (StrategyBadge crash on unknown strategy, missing `.env.production`) could also independently cause the error boundary to fire.

---

## Question-by-Question Findings

### 1. After login succeeds, what data is stored in the auth store? Is any field potentially undefined/null?

**Auth store:** `/Users/ivanflores/parcel-platform/frontend/src/stores/authStore.ts`

The login flow works as follows:
1. `useLogin` hook (in `useAuth.ts` line 13-14) calls `api.auth.login(email, password)`
2. `api.auth.login` uses the **authenticated** `request()` function (not `requestPublic`)
3. The backend returns `AuthSuccessResponse` with shape `{ user: UserResponse }`
4. `onSuccess` destructures `{ user }` and calls `setAuth(user)`
5. `setAuth` stores the user in `localStorage` as `parcel_user` and sets `isAuthenticated: true`

**Backend `UserResponse` schema** (from `/Users/ivanflores/parcel-platform/backend/schemas/auth.py` line 51-61):
```python
class UserResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    role: str
    team_id: Optional[uuid.UUID]  # <-- CAN BE NULL
    created_at: datetime
```

**Frontend `User` type** (from `/Users/ivanflores/parcel-platform/frontend/src/types/index.ts` line 35-42):
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

**Risk assessment:** The types match well. `team_id` is nullable on both sides. The frontend code that uses `user` always does null-safe access:
- `AppShell.tsx` line 142-143: `user?.name` (safe)
- `AppShell.tsx` line 158-159: `user?.name ?? 'User'` and `user?.email ?? ''` (safe)
- `Dashboard.tsx` line 113: `user?.email === 'demo@parcel.app'` (safe)

**Verdict:** The auth store data itself is NOT the direct cause of a render crash. The stored User object's fields are all properly null-checked in JSX.

---

### 2. Does the Dashboard or any child component try to render an object directly as a React child?

**FINDING: YES -- StrategyBadge will crash if given an unknown strategy value.**

In `/Users/ivanflores/parcel-platform/frontend/src/components/ui/StrategyBadge.tsx` (lines 18-27):
```tsx
export function StrategyBadge({ strategy }: StrategyBadgeProps) {
  const config = STRATEGY_CONFIG[strategy]
  return (
    <span
      style={{ backgroundColor: config.bg, color: config.text }}
      className="..."
    >
      {config.label}
    </span>
  )
}
```

If the backend ever returns a strategy value not in the `STRATEGY_CONFIG` map (e.g., a new strategy, a typo, or an empty string), then `config` will be `undefined`, and accessing `config.bg` will throw `TypeError: Cannot read properties of undefined (reading 'bg')`. This would crash the error boundary.

**Where this is called in Dashboard:** Line 313:
```tsx
<StrategyBadge strategy={deal.strategy} />
```

The `deal` comes from `stats.recent_deals`, which is populated from the backend `RecentDealItem` schema where `strategy` is typed as a bare `str` (not an enum), meaning the backend could return ANY string here.

**FINDING: The `outputs` field is NOT rendered directly in Dashboard.** Despite `RecentDeal` type having `outputs: Record<string, unknown>`, the Dashboard never renders `deal.outputs` in JSX. It only renders `deal.address`, `deal.strategy`, `deal.risk_score`, and `deal.status`. So `outputs` is not a direct render issue.

**FINDING: `pipeline_by_stage` entries render `count` directly in JSX** (line 352):
```tsx
<span className="text-lg font-mono font-semibold text-text-primary">{count}</span>
```
This `count` comes from `Object.entries(stats.pipeline_by_stage ?? {})`. The backend types this as `dict[str, int]`, so `count` should always be a number. However, if the backend ever returned a non-primitive (e.g., `null`, an object), this would crash. **Low risk** since Pydantic validates the response.

---

### 3. Is there any place where an API response field is used directly in JSX without being converted to a string?

**Several places, but all are safe primitives under normal conditions:**

- `Dashboard.tsx` line 311: `{deal.address}` -- string, safe
- `Dashboard.tsx` line 317: `{deal.risk_score !== null ? deal.risk_score : '--'}` -- null-checked, safe
- `Dashboard.tsx` line 322: `{statusLabel(deal.status)}` -- passed through function, returns string
- `Dashboard.tsx` line 352: `{count}` -- number from Object.entries, should be safe
- `Dashboard.tsx` line 400: `{item.text}` -- string, safe
- `Dashboard.tsx` line 401: `{timeAgo(item.timestamp)}` -- passed through function, returns string

**No objects are rendered directly as React children under normal response shapes.**

---

### 4. What is the hardcoded/fallback API URL in api.ts? Is it pointing to api.parceldesk.io or an old Railway URL?

**File:** `/Users/ivanflores/parcel-platform/frontend/src/lib/api.ts` line 29:
```typescript
const API_URL = (import.meta.env.VITE_API_URL ?? 'https://api.parceldesk.io').replace('http://', 'https://')
```

**Same pattern in:** `/Users/ivanflores/parcel-platform/frontend/src/lib/chat-stream.ts` line 5.

**Verdict:** The fallback is `https://api.parceldesk.io` which is correct for the custom domain. The `.replace('http://', 'https://')` ensures HTTPS enforcement. This is correctly configured.

---

### 5. Does the .env.production have VITE_API_URL set correctly?

**FINDING: There is NO `.env.production` file.**

The only env file present is `/Users/ivanflores/parcel-platform/frontend/.env.local`:
```
VITE_API_URL=http://localhost:8000
```

This means in production (Vercel), `VITE_API_URL` would need to be set via the Vercel dashboard environment variables. If it is NOT set there, the fallback `https://api.parceldesk.io` kicks in, which is correct.

**However**, if someone set `VITE_API_URL=http://localhost:8000` in the Vercel dashboard (copying from `.env.local`), the `.replace('http://', 'https://')` would transform it to `https://localhost:8000`, which would fail all API calls.

**Action needed:** Verify the Vercel dashboard env vars. Either set `VITE_API_URL=https://api.parceldesk.io` or leave it unset to use the fallback.

---

### 6. Dashboard data fetching: what API endpoints does it call? What response shape? Could any field be missing?

**The Dashboard makes 2 API calls:**

1. **`/api/v1/dashboard/stats/`** via `useDashboard()` hook
   Expected response type: `DashboardStats`
   ```typescript
   interface DashboardStats {
     total_deals: number
     active_pipeline_deals: number
     closed_deals: number
     deals_by_strategy: Record<string, number>
     pipeline_by_stage: Record<string, number>
     recent_deals: RecentDeal[]
   }
   ```
   Backend Pydantic schema matches this exactly. All fields are required (no `Optional`).

2. **`/api/v1/dashboard/activity/`** via `useQuery(['activity'], ...)`
   Expected response type: `ActivityResponse`
   ```typescript
   interface ActivityResponse {
     activities: ActivityItem[]
   }
   ```
   Backend schema matches. The frontend safely checks `activityData?.activities` before rendering.

**Potential field mismatch:** The `RecentDeal` type includes `outputs: Record<string, unknown>` which the backend sends as a JSONB field. While the Dashboard doesn't render `outputs` directly, any downstream component that receives recent deals might try to.

---

## Ranked Potential Crash Causes

### BUG 1 (HIGH): Cross-Origin Cookie Not Delivered on First Authenticated Request

**The most likely cause of the crash.**

**Flow:**
1. User submits login form on `parceldesk.io`
2. `api.auth.login()` calls `POST https://api.parceldesk.io/api/v1/auth/login` with `credentials: 'include'`
3. Backend responds 200 with `Set-Cookie: access_token=...; HttpOnly; Secure; SameSite=None`
4. Login succeeds, `setAuth(user)` stores user in Zustand/localStorage
5. `navigate('/dashboard')` fires
6. Dashboard mounts, `useDashboard()` fires `GET /api/v1/dashboard/stats/` with `credentials: 'include'`
7. **If the browser did NOT store the cookie from step 3** (due to cross-origin cookie blocking, third-party cookie restrictions, or SameSite issues), the request goes out **without** the `access_token` cookie
8. Backend returns 401
9. The 401 handler in `api.ts` (line 43-45) calls `useAuthStore.getState().clearAuth()` and throws `new Error('Session expired')`
10. `clearAuth()` sets `isAuthenticated: false`
11. React re-renders, `ProtectedRoute` sees `isAuthenticated === false`, triggers `<Navigate to="/login">`
12. But `useDashboard()` already threw, and the error propagates before navigation completes

**Why this would hit the error boundary:**
- React Query's `queryFn` throws synchronously (the `clearAuth` + throw happens in the same tick)
- The `clearAuth()` triggers a Zustand state change that causes `ProtectedRoute` to unmount the Dashboard
- But the Dashboard is mid-render with the error from the query
- The `PageErrorBoundary` wrapping Dashboard catches this

**Evidence supporting this theory:**
- The backend cookie is set with `SameSite=None; Secure` in production (correct for cross-origin)
- But Safari and some browsers aggressively block third-party cookies
- The frontend is on `parceldesk.io`, backend on `api.parceldesk.io` -- these are same-site (both `.parceldesk.io`) but technically cross-origin
- No refresh token mechanism exists (only a 15-minute access token)
- The login endpoint uses the authenticated `request()` function (which has the 401 handler), not `requestPublic()`. If the login POST itself returns 401 for wrong credentials, `clearAuth()` would be called even during login, wiping any partial state. This is a minor issue but not the main crash.

**Fix:**
- Verify cookies are being set and sent correctly in production (check Network tab)
- Consider adding the backend as a subdomain proxy via Vercel rewrites (`/api/* -> https://api.parceldesk.io/*`) to make cookies same-origin
- Or add a token refresh mechanism

---

### BUG 2 (MEDIUM): StrategyBadge Crashes on Unknown Strategy

**File:** `/Users/ivanflores/parcel-platform/frontend/src/components/ui/StrategyBadge.tsx`

```tsx
const config = STRATEGY_CONFIG[strategy]
// If strategy is not in the map, config is undefined
// Next line throws: TypeError: Cannot read properties of undefined (reading 'bg')
style={{ backgroundColor: config.bg, color: config.text }}
```

The `StrategyBadge` only handles 5 strategies: `wholesale`, `creative_finance`, `brrrr`, `buy_and_hold`, `flip`. The backend `RecentDealItem.strategy` is typed as `str` (not an enum), so if any deal has a different strategy value, the component crashes.

**Where it's rendered:** Dashboard line 313 inside the recent deals table.

**Fix:**
```tsx
const config = STRATEGY_CONFIG[strategy] ?? { bg: '#1F2937', text: '#9CA3AF', label: strategy }
```

---

### BUG 3 (MEDIUM): Login API Call Uses Authenticated `request()` With 401 Handler

**File:** `/Users/ivanflores/parcel-platform/frontend/src/lib/api.ts` lines 84-88:
```typescript
login: (email: string, password: string) =>
  request<AuthResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }),
```

The `request()` function (line 31-58) has a 401 handler:
```typescript
if (res.status === 401) {
  useAuthStore.getState().clearAuth()
  throw new Error('Session expired')
}
```

The login endpoint returns 401 for invalid credentials. So if a user enters wrong credentials:
1. Backend returns 401 with `{"error": "Invalid email or password"}`
2. `request()` catches the 401 and calls `clearAuth()` (unnecessary but harmless since user isn't logged in)
3. Then throws `new Error('Session expired')` instead of the actual error message `"Invalid email or password"`

This means the Login page shows "Session expired" instead of "Invalid email or password" for wrong credentials. While not a crash, it's a confusing UX bug and could mask real errors.

**More critically**, the `register` endpoint also uses `request()`. If registration fails with a 400 for "Email already in use", the backend returns the error with status 400 (not 401), so this path is fine. But if any auth endpoint were to return 401 unexpectedly, it would trigger `clearAuth()`.

**Fix:** Login and register should use `requestPublic()` instead of `request()`.

---

### BUG 4 (MEDIUM): No `.env.production` File -- Relies on Vercel Dashboard or Fallback

There is no `.env.production` file in the repository. The production API URL depends on either:
1. `VITE_API_URL` being set in the Vercel dashboard
2. The fallback `https://api.parceldesk.io` in `api.ts`

If someone accidentally set `VITE_API_URL=http://localhost:8000` in Vercel (copying from `.env.local`), the `.replace('http://', 'https://')` would produce `https://localhost:8000`. Every API call would fail with a network error, which would propagate as an unhandled exception through React Query.

**Fix:** Either create `frontend/.env.production` with `VITE_API_URL=https://api.parceldesk.io` or verify the Vercel dashboard.

---

### BUG 5 (LOW): `process.env.NODE_ENV` Used Instead of `import.meta.env.MODE` in Error Boundary

**File:** `/Users/ivanflores/parcel-platform/frontend/src/components/error-boundary.tsx` line 55:
```tsx
{this.state.error && process.env.NODE_ENV === 'development' && (
```

In Vite projects, the correct way to check environment is `import.meta.env.MODE === 'development'` or `import.meta.env.DEV`. The `process.env.NODE_ENV` pattern is a CJS/Webpack convention. Vite does define `process.env.NODE_ENV` via its define plugin, so this should still work, but it's fragile.

**Impact:** If this check fails in production, the error details `<pre>` block would always be hidden, making debugging harder. Not a crash cause, but a debugging hindrance.

---

### BUG 6 (LOW): Race Condition Between clearAuth() and ProtectedRoute Redirect

When a 401 response occurs:
1. `request()` calls `useAuthStore.getState().clearAuth()` (sets `isAuthenticated: false`)
2. `request()` throws `new Error('Session expired')`
3. React Query catches the error and sets the query to error state
4. Meanwhile, `ProtectedRoute` re-renders because `isAuthenticated` changed to `false`
5. `ProtectedRoute` returns `<Navigate to="/login">`, trying to unmount Dashboard
6. But Dashboard's error state also triggers a re-render

This creates a race between the Navigate redirect and the Dashboard error render. The `PageErrorBoundary` should catch any render error during this transition, but if the transition causes an unhandled exception in Framer Motion's `AnimatePresence` (due to the component unmounting mid-animation), it could cascade up to the root `ErrorBoundary`.

**Fix:** The 401 handler should NOT throw after calling `clearAuth()`. Instead, redirect programmatically:
```typescript
if (res.status === 401) {
  useAuthStore.getState().clearAuth()
  window.location.href = '/login'  // Hard redirect, no throw
  return new Promise(() => {})  // Never resolve
}
```
Or use a more graceful pattern with React Router.

---

## Additional Observations

### Auth Cookie Configuration Analysis

**Backend cookie settings** (`/Users/ivanflores/parcel-platform/backend/routers/auth.py` lines 39-54):
```python
response.set_cookie(
    key="access_token",
    value=token,
    httponly=True,
    secure=_IS_PRODUCTION,  # True in production
    samesite="none" if _IS_PRODUCTION else "lax",
    max_age=900,  # 15 minutes
    path="/",
)
```

- `SameSite=None` + `Secure=True` in production -- correct for cross-origin requests
- Cookie is set on `api.parceldesk.io` domain (no explicit `domain` parameter, so browser defaults to the response origin)
- The cookie will only be sent to `api.parceldesk.io`, not to `parceldesk.io` or any other subdomain
- `credentials: 'include'` is set in the frontend fetch calls -- correct

**CORS configuration** (`/Users/ivanflores/parcel-platform/backend/main.py` lines 14-25):
```python
_frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
_allowed_origins = [_frontend_url]
if _frontend_url.startswith("https://") and not _frontend_url.startswith("https://www."):
    _allowed_origins.append(_frontend_url.replace("https://", "https://www."))
```

**Critical dependency:** The `FRONTEND_URL` env var on Railway MUST be set to `https://parceldesk.io`. If it's still set to an old Vercel URL (e.g., `https://parcel-platform.vercel.app`), CORS will reject requests from `parceldesk.io`, and cookies won't be delivered.

### No Refresh Token Mechanism

The system uses only a 15-minute access token with no refresh token. Once the access token expires, the next API call returns 401, `clearAuth()` fires, and the user is effectively logged out. If a user stays on the Dashboard for 16 minutes without interaction, the next background React Query refetch will trigger this 401 cascade.

### Error Boundary Does Not Log Errors

The `ErrorBoundary` component in `/Users/ivanflores/parcel-platform/frontend/src/components/error-boundary.tsx` does not implement `componentDidCatch` to log errors to any external service. It only captures the error in state. Adding `componentDidCatch` with logging to an error tracking service (e.g., Sentry) would greatly help diagnose production crashes.

---

## Recommended Investigation Steps (Production)

1. **Open browser DevTools on parceldesk.io, go to Network tab, log in, and check:**
   - Does the login response include a `Set-Cookie` header?
   - Does the subsequent `/api/v1/dashboard/stats/` request include the `access_token` cookie?
   - What is the HTTP status of the dashboard stats request?

2. **Check the Vercel dashboard environment variables:**
   - Is `VITE_API_URL` set? What is its value?
   - If unset, the fallback `https://api.parceldesk.io` is used (correct)

3. **Check the Railway dashboard environment variables:**
   - Is `FRONTEND_URL` set to `https://parceldesk.io`?
   - Is `ENVIRONMENT` set to `production`?

4. **Check Railway logs:**
   - Are there 401 responses immediately after successful login 200 responses?
   - Are there CORS preflight failures?

5. **Test in Safari and Firefox:**
   - Safari has stricter third-party cookie policies
   - Firefox has Enhanced Tracking Protection that may block cross-origin cookies

---

## Files Examined

| File | Path |
|------|------|
| Dashboard page | `/Users/ivanflores/parcel-platform/frontend/src/pages/Dashboard.tsx` |
| API client | `/Users/ivanflores/parcel-platform/frontend/src/lib/api.ts` |
| Auth store | `/Users/ivanflores/parcel-platform/frontend/src/stores/authStore.ts` |
| Auth hooks | `/Users/ivanflores/parcel-platform/frontend/src/hooks/useAuth.ts` |
| App shell | `/Users/ivanflores/parcel-platform/frontend/src/components/layout/AppShell.tsx` |
| App root | `/Users/ivanflores/parcel-platform/frontend/src/App.tsx` |
| Error boundary | `/Users/ivanflores/parcel-platform/frontend/src/components/error-boundary.tsx` |
| KPICard | `/Users/ivanflores/parcel-platform/frontend/src/components/ui/KPICard.tsx` |
| StrategyBadge | `/Users/ivanflores/parcel-platform/frontend/src/components/ui/StrategyBadge.tsx` |
| SkeletonCard | `/Users/ivanflores/parcel-platform/frontend/src/components/ui/SkeletonCard.tsx` |
| Command palette | `/Users/ivanflores/parcel-platform/frontend/src/components/command-palette.tsx` |
| useDashboard hook | `/Users/ivanflores/parcel-platform/frontend/src/hooks/useDashboard.ts` |
| useCountUp hook | `/Users/ivanflores/parcel-platform/frontend/src/hooks/useCountUp.ts` |
| Utils | `/Users/ivanflores/parcel-platform/frontend/src/lib/utils.ts` |
| Types | `/Users/ivanflores/parcel-platform/frontend/src/types/index.ts` |
| Login page | `/Users/ivanflores/parcel-platform/frontend/src/pages/Login.tsx` |
| Hero (demo login) | `/Users/ivanflores/parcel-platform/frontend/src/components/landing/hero.tsx` |
| .env.local | `/Users/ivanflores/parcel-platform/frontend/.env.local` |
| vercel.json | `/Users/ivanflores/parcel-platform/frontend/vercel.json` |
| Backend main | `/Users/ivanflores/parcel-platform/backend/main.py` |
| Backend auth router | `/Users/ivanflores/parcel-platform/backend/routers/auth.py` |
| Backend dashboard router | `/Users/ivanflores/parcel-platform/backend/routers/dashboard.py` |
| Backend JWT | `/Users/ivanflores/parcel-platform/backend/core/security/jwt.py` |
| Backend auth schemas | `/Users/ivanflores/parcel-platform/backend/schemas/auth.py` |
| Backend dashboard schemas | `/Users/ivanflores/parcel-platform/backend/schemas/dashboard.py` |
| Backend Deal model | `/Users/ivanflores/parcel-platform/backend/models/deals.py` |
