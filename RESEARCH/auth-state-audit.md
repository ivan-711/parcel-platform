# Auth, State Management & Router Audit

**Auditor:** Claude Opus 4.6
**Date:** 2026-03-02
**Scope:** All auth flows, Zustand stores, React Query usage, React Router config

---

## Severity Legend

| Severity | Meaning |
|----------|---------|
| **CRITICAL** | Security vulnerability or data loss risk; fix immediately |
| **HIGH** | Will cause user-visible bugs in production; fix before next deploy |
| **MEDIUM** | Correctness issue that may cause subtle bugs; fix soon |
| **LOW** | Code quality / best practice; fix when convenient |

---

## Part 1: Auth Flow Audit

### 1.1 Architecture Overview

- **JWT storage:** httpOnly cookies (set by backend). Frontend never sees the raw token.
- **User profile cache:** `localStorage` key `parcel_user` (JSON-serialized `User` object), hydrated into Zustand on page load.
- **Auth state:** Single Zustand store at `frontend/src/stores/authStore.ts` with `user`, `isAuthenticated`, `setAuth()`, `clearAuth()`.
- **401 handling:** `api.ts` line 43-45 calls `clearAuth()` on any 401 response, then throws.
- **Refresh token:** **Does not exist.** There is no `/auth/refresh` endpoint called anywhere in the frontend.

---

### Finding 1.1: No Token Refresh Mechanism
**Severity: CRITICAL**
**File:** `frontend/src/lib/api.ts` (lines 31-58)
**File:** `frontend/src/hooks/useAuth.ts` (entire file)

The CLAUDE.md specifies "Access token: 15 min expiry, Refresh token: 7 day expiry." However, the frontend has **zero** refresh token logic. When the access token expires after 15 minutes:

1. The next API call returns 401
2. `clearAuth()` is called immediately
3. The user is silently logged out (no notification, no prompt)
4. Any unsaved form state (e.g., mid-way through the deal analyzer) is lost

**What happens:** A user filling out a complex deal analysis form for 16 minutes will lose all their work on submit.

**Fix:**
- Add a `refreshToken()` call in the 401 handler before giving up
- Implement retry logic: on 401, attempt refresh, then retry the original request
- Only call `clearAuth()` if the refresh also fails
- Show a toast notification: "Your session expired. Please sign in again."

```typescript
// Suggested pattern for api.ts request()
if (res.status === 401) {
  try {
    await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
    // Retry original request once
    const retryRes = await fetch(`${API_URL}${path}`, { credentials: 'include', ...options, headers })
    if (retryRes.ok) return retryRes.json()
  } catch { /* refresh failed */ }
  useAuthStore.getState().clearAuth()
  throw new Error('Session expired')
}
```

---

### Finding 1.2: No React Query Cache Clearing on Logout
**Severity: HIGH**
**File:** `frontend/src/hooks/useAuth.ts` (lines 45-59)
**File:** `frontend/src/App.tsx` (line 31)

When a user logs out (`useLogout` hook), `clearAuth()` removes the user from Zustand and `localStorage`, but the React Query cache (`queryClient`) is never cleared. This means:

1. User A logs out
2. User B logs in on the same browser
3. User B may see User A's cached deals, pipeline data, portfolio, dashboard stats, documents, and chat history until the cache expires or is refetched

The `queryClient` is created at module scope in `App.tsx` line 31 (`const queryClient = new QueryClient()`) with no default `staleTime` or `gcTime` overrides, so cached data persists for the default 5 minutes.

**Fix:** Call `queryClient.clear()` during logout:
```typescript
// useAuth.ts useLogout()
onSuccess: () => {
  clearAuth()
  queryClient.clear()
  navigate('/login')
},
onError: () => {
  clearAuth()
  queryClient.clear()
  navigate('/login')
},
```

**Note:** This requires passing `queryClient` into the hook (via `useQueryClient()`) or importing it.

---

### Finding 1.3: Race Condition on Multiple Concurrent 401 Responses
**Severity: MEDIUM**
**File:** `frontend/src/lib/api.ts` (lines 43-45)

When a user's token expires, multiple in-flight API calls may all return 401 simultaneously (e.g., Dashboard fetches `stats` + `activity` in parallel). Each call independently:
1. Calls `clearAuth()` (redundant but harmless)
2. Throws `new Error('Session expired')`

The `clearAuth()` call is idempotent (just sets `null`), so no data corruption occurs. However:
- Each failed query will trigger its own error state in the UI
- If error boundaries are involved, multiple resets may cascade
- No deduplication means the user may see multiple error toasts

**Fix:** Add a debounce/flag to prevent redundant `clearAuth()` calls:
```typescript
let isLoggingOut = false
if (res.status === 401) {
  if (!isLoggingOut) {
    isLoggingOut = true
    useAuthStore.getState().clearAuth()
    // Reset flag after navigation
    setTimeout(() => { isLoggingOut = false }, 1000)
  }
  throw new Error('Session expired')
}
```

---

### Finding 1.4: Auth State Derived from localStorage Only (No Server Validation on Load)
**Severity: HIGH**
**File:** `frontend/src/stores/authStore.ts` (lines 14-15)
**File:** `frontend/src/App.tsx` (lines 43-46, `ProtectedRoute`)

On page load, `isAuthenticated` is set to `true` if `localStorage.getItem('parcel_user') !== null`. There is **no call to `/api/v1/auth/me`** to verify the session is still valid. This means:

1. If the httpOnly cookie has expired (or was cleared) but `localStorage` still has the user object, the app will render the entire dashboard, pipeline, etc.
2. The first API call will 401 and trigger `clearAuth()`, but the user briefly sees the authenticated UI
3. If the user manually sets `parcel_user` in localStorage to any JSON object, `isAuthenticated` becomes `true` (though API calls will still fail)

**Risk:** This is not a security vulnerability (the backend validates the cookie), but it creates a poor UX where the user sees a flash of the authenticated app before being kicked out.

**Fix:** Add a startup validation query:
```typescript
// In App.tsx or a new AuthProvider component
const { isError } = useQuery({
  queryKey: ['auth-validate'],
  queryFn: () => api.auth.me(),
  enabled: isAuthenticated,
  retry: false,
  onError: () => clearAuth(),
})
```

---

### Finding 1.5: Chat Streaming Bypasses 401 Handling
**Severity: MEDIUM**
**File:** `frontend/src/lib/chat-stream.ts` (lines 17-31)

The `streamChat()` function uses raw `fetch()` directly (not the `request()` wrapper from `api.ts`). If the chat endpoint returns 401, the error is thrown as a generic `HTTP 401` error:

```typescript
if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)
```

This means:
- `clearAuth()` is never called
- The user sees "Sorry, something went wrong" in the chat instead of being redirected to login
- Their session is effectively dead but the app doesn't know it

**Fix:** Add 401 detection to `chat-stream.ts`:
```typescript
if (res.status === 401) {
  useAuthStore.getState().clearAuth()
  throw new Error('Session expired')
}
if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)
```

---

### Finding 1.6: clearAuth Does Not Redirect
**Severity: MEDIUM**
**File:** `frontend/src/lib/api.ts` (line 44)
**File:** `frontend/src/stores/authStore.ts` (lines 22-25)

When `clearAuth()` is called from the `api.ts` 401 handler, it only:
1. Removes `parcel_user` from localStorage
2. Sets Zustand state to `{ user: null, isAuthenticated: false }`

It does **not** navigate to `/login`. The redirect happens reactively because `ProtectedRoute` reads `isAuthenticated` and renders `<Navigate to="/login">`. However:

- If the 401 occurs on a page that doesn't re-render the `ProtectedRoute` (e.g., a background refetch triggered by React Query's `refetchOnWindowFocus`), the user remains on the page with a broken state
- The thrown `Error('Session expired')` is caught by React Query, which sets the query to error state, but the page may just show an error card instead of redirecting

In practice, the `ProtectedRoute` component does re-render because it subscribes to the Zustand store via `useAuthStore`, so the redirect does fire. But there is a timing window where the error handler fires first.

**Impact:** Low in practice because `ProtectedRoute` subscription works correctly, but the architecture is fragile.

---

### Finding 1.7: Authenticated Users Can Access Login/Register Pages
**Severity: LOW**
**File:** `frontend/src/App.tsx` (lines 65-70)

Routes `/login`, `/register`, `/forgot-password`, and `/reset-password` have no auth guard that redirects already-authenticated users to `/dashboard`. An authenticated user can navigate to `/login` and see the login form.

If they submit the login form, they'll call `api.auth.login()` which uses `requestPublic()` (no 401 handling). On success, `setAuth()` is called again with the new user, overwriting the current session. This could cause confusion in multi-account scenarios.

**Fix:** Add a `GuestRoute` guard:
```tsx
function GuestRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}
```

---

## Part 2: Zustand Stores Audit

### 2.1 Store Inventory

Only one Zustand store exists: `frontend/src/stores/authStore.ts`.
No other stores were found (confirmed by grep for `zustand|create(`).

---

### Finding 2.1: localStorage User Data Can Become Stale
**Severity: MEDIUM**
**File:** `frontend/src/stores/authStore.ts` (line 14)

The `user` object is read from `localStorage` on store creation:
```typescript
user: JSON.parse(localStorage.getItem('parcel_user') ?? 'null') as User | null
```

This cached user data can become stale if:
- The user changes their name or email in Settings (partially fixed by SettingsPage line 88-92 which calls `setAuth()` after profile update)
- The user's role changes (e.g., admin promotes them)
- The user's `team_id` changes

The stale data is used for display purposes only (sidebar initials, user menu name/email), so the impact is cosmetic. But it can be confusing.

**Fix:** Periodically revalidate by calling `api.auth.me()` on app focus or on a timer, and update the store.

---

### Finding 2.2: No Zustand Persist Middleware (Manual localStorage Sync)
**Severity: LOW**
**File:** `frontend/src/stores/authStore.ts` (lines 17-19, 22-24)

The store manually manages `localStorage` via `JSON.stringify/parse` instead of using Zustand's `persist` middleware. This is not a bug, but it means:
- No version migration support (if `User` type changes, old stored data may cause issues)
- No `onRehydrate` callback for validation
- No `partialize` to exclude transient state

Not currently a problem since the store is simple, but worth noting for future expansion.

---

### Finding 2.3: No Circular Dependencies Between Stores
**Severity: N/A**

Only one store exists, so circular dependency is impossible. `authStore` is imported by:
- `api.ts` (for 401 handling)
- `useAuth.ts` (for login/register/logout mutations)
- `AppShell.tsx` (for user display)
- `Dashboard.tsx` (for user display)
- `SettingsPage.tsx` (for profile sync)
- `hero.tsx` (for demo login)
- `App.tsx` (for ProtectedRoute)

All imports are unidirectional. No issues found.

---

## Part 3: React Router Audit

### 3.1 Route Table Summary

| Path | Protection | Component | Notes |
|------|-----------|-----------|-------|
| `/` | Public | Landing | OK |
| `/login` | Public | Login | No guest guard (Finding 1.7) |
| `/register` | Public | Register | No guest guard (Finding 1.7) |
| `/forgot-password` | Public | ForgotPassword | OK |
| `/reset-password` | Public | ResetPassword | OK |
| `/share/:dealId` | Public | ShareDeal | OK (uses `requestPublic`) |
| `/dashboard` | Protected | Dashboard | OK |
| `/analyze` | Protected | StrategySelectPage | OK |
| `/analyze/results/:dealId` | Protected | ResultsPage | OK |
| `/analyze/:strategy` | Protected | AnalyzerFormPage | OK |
| `/deals` | Protected | MyDeals | OK |
| `/compare` | Protected | ComparePage | OK |
| `/pipeline` | Protected | Pipeline | OK |
| `/portfolio` | Protected | Portfolio | OK |
| `/documents` | Protected | Documents | OK |
| `/chat` | Protected | Chat | OK |
| `/settings` | Protected | Settings | OK |
| `*` | Public | NotFound | OK |

---

### Finding 3.1: 404 Page Dashboard Link May Fail for Unauthenticated Users
**Severity: LOW**
**File:** `frontend/src/pages/NotFound.tsx` (line 18)

The 404 page has a "Dashboard" button that links to `/dashboard`. If an unauthenticated user hits a 404, clicking "Dashboard" will redirect them through `ProtectedRoute` to `/login`. This is not a bug, but the CTA label is misleading for unauthenticated users.

**Fix:** Conditionally show "Dashboard" or "Home" based on `isAuthenticated`.

---

### Finding 3.2: Route Parameter Validation Missing for `:strategy`
**Severity: LOW**
**File:** `frontend/src/App.tsx` (line 76)

The route `/analyze/:strategy` accepts any string as `strategy`. If a user navigates to `/analyze/invalid_strategy`, the `AnalyzerFormPage` will render with an unrecognized strategy value. The page likely handles this gracefully (showing an error or empty form), but there is no explicit validation/redirect at the router level.

---

### Finding 3.3: Route `/analyze/results/:dealId` Before `/analyze/:strategy` (Correct Order)
**Severity: N/A**

Routes are ordered correctly: `/analyze/results/:dealId` is defined before `/analyze/:strategy`, so `results` is matched literally before falling through to the `:strategy` param. No issue here.

---

### Finding 3.4: AnimatePresence Key Uses pathname (May Cause Extra Re-renders)
**Severity: LOW**
**File:** `frontend/src/App.tsx` (line 56)

`<motion.div key={location.pathname}>` means every pathname change triggers an unmount/remount animation cycle. This is correct for page transitions but means navigating between `/analyze/results/abc` and `/analyze/results/def` will trigger a full page exit/enter animation even though it's the same component.

---

### Finding 3.5: Pipeline "Add Deal" Button Uses `<a href>` Instead of `<Link to>`
**Severity: LOW**
**File:** `frontend/src/pages/Pipeline.tsx` (lines 269-275)

The "Add Deal" button uses `<a href="/analyze">` instead of `<Link to="/analyze">` from react-router-dom. This causes a full page reload instead of a client-side navigation, losing React state and triggering a fresh JavaScript load.

**Fix:** Replace with `<Link to="/analyze">` or use `navigate('/analyze')`.

---

## Part 4: Cross-Cutting State Issues

### Finding 4.1: React Query Cache and Auth Store Can Desync
**Severity: MEDIUM**
**Files:** `frontend/src/pages/settings/SettingsPage.tsx` (lines 81-99), `frontend/src/stores/authStore.ts`

When the user updates their profile on the Settings page:
1. `profileMutation` calls `api.auth.updateMe()` -> server responds with updated profile
2. `onSuccess` manually updates the auth store: `useAuthStore.getState().setAuth({...})`
3. BUT the React Query cache for `['me']` (line 33) is **never invalidated**

This means: if the user navigates away from Settings and comes back, the `useQuery(['me'])` will return the stale cached data (showing old name/email in the form fields) until the cache expires.

**Fix:** Add `queryClient.invalidateQueries({ queryKey: ['me'] })` in the profile mutation's `onSuccess`.

---

### Finding 4.2: setTimeout Leaks in SettingsPage
**Severity: LOW**
**File:** `frontend/src/pages/settings/SettingsPage.tsx` (lines 65, 69, 85, 97, 109, 113)

Six `setTimeout` calls are used to auto-dismiss status messages after 2-3 seconds. None of them are cleaned up if the component unmounts before the timer fires. If a user navigates away from Settings within 3 seconds of a mutation, `setState` will be called on an unmounted component.

In React 18 this doesn't crash (the warning was removed), but it's still a conceptual leak.

**Fix:** Store timeout IDs in a ref and clear them in a cleanup function:
```typescript
const timers = useRef<number[]>([])
useEffect(() => () => timers.current.forEach(clearTimeout), [])
// Then: timers.current.push(setTimeout(...))
```

---

### Finding 4.3: setTimeout Leak in ResultsPage
**Severity: LOW**
**File:** `frontend/src/pages/analyze/ResultsPage.tsx` (line 201)

The `handleDownloadReport` function uses `setTimeout(() => { ... }, 0)` to defer PDF generation. This is a microtask-style deferral that completes almost immediately, so the leak risk is negligible. But it's still not cleaned up.

---

### Finding 4.4: Event Listeners Are All Properly Cleaned Up
**Severity: N/A**

All `addEventListener` calls found in the codebase have matching `removeEventListener` in cleanup functions:
- `navbar.tsx` line 14: scroll listener cleaned up in useEffect return
- `command-palette.tsx` line 178: keydown listener cleaned up in useEffect return
- `ResultsPage.tsx` line 103: mousedown listener cleaned up in useEffect return
- `deal-card.tsx` line 43: mousedown listener cleaned up in useEffect return

No issues found.

---

### Finding 4.5: Chat History useEffect Dependency Array Suppresses eslint
**Severity: LOW**
**File:** `frontend/src/pages/chat/ChatPage.tsx` (line 128)

```typescript
}, [historyData]) // eslint-disable-line react-hooks/exhaustive-deps
```

The `messages` state variable is used inside the effect (`messages.length === 0`) but is deliberately excluded from the dependency array to prevent the effect from re-running when messages change. This is intentional (only load history once), but the eslint suppression is a code smell.

**Fix:** Use a ref to track whether history has been loaded:
```typescript
const historyLoaded = useRef(false)
useEffect(() => {
  if (historyLoaded.current) return
  const historyMessages = historyData?.messages ?? []
  if (historyMessages.length > 0) {
    historyLoaded.current = true
    setMessages(historyMessages.map(...))
  }
}, [historyData])
```

---

### Finding 4.6: QueryClient Has No Global Error Handler or Default Options
**Severity: MEDIUM**
**File:** `frontend/src/App.tsx` (line 31)

```typescript
const queryClient = new QueryClient()
```

The QueryClient is created with all defaults:
- `retry: 3` (default) -- means failed API calls (including 401s) are retried 3 times before failing
- This is wasteful for 401s, where retries will always fail
- No `onError` callback for global error reporting
- No `staleTime` default -- every navigation refetches

**Fix:**
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        if (error.message === 'Session expired') return false
        return failureCount < 2
      },
    },
  },
})
```

---

### Finding 4.7: Pipeline localBoard State Can Become Stale
**Severity: LOW**
**File:** `frontend/src/pages/Pipeline.tsx` (lines 84-89)

The Pipeline page uses `localBoard` for optimistic updates. The `board` is derived as:
```typescript
const board = localBoard ?? pipelineData ?? defaultEmpty
```

After a mutation succeeds, `setLocalBoard(null)` is called (line 131), which falls back to `pipelineData`. But if `invalidateQueries` hasn't resolved yet, `pipelineData` may still show the pre-mutation data, causing a visual flicker (optimistic state -> old data -> new data).

This is a known limitation of the optimistic update pattern. The current implementation handles it correctly by resetting `localBoard` to `null` in both `onSuccess` and `onError`, which is the standard approach.

---

### Finding 4.8: Filter Presets in MyDeals Use Unvalidated localStorage JSON
**Severity: LOW**
**File:** `frontend/src/pages/MyDeals.tsx` (lines 59-63)

```typescript
const stored = localStorage.getItem('parcel_filter_presets')
return stored ? JSON.parse(stored) : []
```

The `try/catch` around this is good (line 63), but the parsed value is used directly as `FilterPreset[]` without validation. If the stored data has been tampered with or the type shape has changed across deploys, this could cause runtime errors.

**Fix:** Add a validation function or use a schema library.

---

## Summary Table

| # | Finding | Severity | File(s) | Status |
|---|---------|----------|---------|--------|
| 1.1 | No token refresh mechanism | CRITICAL | `api.ts`, `useAuth.ts` | Open |
| 1.2 | React Query cache not cleared on logout | HIGH | `useAuth.ts`, `App.tsx` | Open |
| 1.3 | Race condition on multiple 401s | MEDIUM | `api.ts` | Open |
| 1.4 | No server validation on app load | HIGH | `authStore.ts`, `App.tsx` | Open |
| 1.5 | Chat streaming bypasses 401 handling | MEDIUM | `chat-stream.ts` | Open |
| 1.6 | clearAuth does not redirect directly | MEDIUM | `api.ts`, `authStore.ts` | Open (mitigated by ProtectedRoute) |
| 1.7 | Auth pages accessible to logged-in users | LOW | `App.tsx` | Open |
| 2.1 | localStorage user data can become stale | MEDIUM | `authStore.ts` | Open |
| 2.2 | Manual localStorage sync instead of persist middleware | LOW | `authStore.ts` | Open |
| 3.1 | 404 "Dashboard" link misleading for guests | LOW | `NotFound.tsx` | Open |
| 3.2 | No route param validation for `:strategy` | LOW | `App.tsx` | Open |
| 3.4 | AnimatePresence key causes extra animations | LOW | `App.tsx` | Open |
| 3.5 | Pipeline uses `<a href>` instead of `<Link>` | LOW | `Pipeline.tsx` | Open |
| 4.1 | React Query cache and auth store desync on profile update | MEDIUM | `SettingsPage.tsx` | Open |
| 4.2 | setTimeout leaks in SettingsPage | LOW | `SettingsPage.tsx` | Open |
| 4.3 | setTimeout leak in ResultsPage | LOW | `ResultsPage.tsx` | Open |
| 4.5 | eslint suppression on chat history effect | LOW | `ChatPage.tsx` | Open |
| 4.6 | QueryClient has no global error/retry config | MEDIUM | `App.tsx` | Open |
| 4.7 | Pipeline localBoard optimistic flicker | LOW | `Pipeline.tsx` | Acceptable |
| 4.8 | Unvalidated localStorage JSON for filter presets | LOW | `MyDeals.tsx` | Open |

---

## Priority Fix Order

1. **CRITICAL: Token refresh** (Finding 1.1) -- Implement refresh token flow in `api.ts`
2. **HIGH: Clear React Query cache on logout** (Finding 1.2) -- One-line fix
3. **HIGH: Validate session on app load** (Finding 1.4) -- Add startup `me()` check
4. **MEDIUM: Chat stream 401 handling** (Finding 1.5) -- Add 401 check to `chat-stream.ts`
5. **MEDIUM: QueryClient default options** (Finding 4.6) -- Configure retry + staleTime
6. **MEDIUM: 401 race condition** (Finding 1.3) -- Add debounce flag
7. **MEDIUM: Profile update cache desync** (Finding 4.1) -- Add invalidateQueries call
8. Everything else (LOW severity)
