# Error Boundary Crash Investigation — parceldesk.io Dashboard

**Date:** 2026-03-02
**Investigator:** Claude Code (browser MCP automation)
**Environment:** Production (https://www.parceldesk.io)
**Test credentials:** demo@parcel.app / Demo1234!

---

## Summary

After login, the Dashboard page crashes immediately with a React hooks violation error. The `PageErrorBoundary` catches it and displays "This section encountered an error / The rest of the app is still working." Clicking **Retry** fixes it and the Dashboard renders correctly on the second attempt.

---

## Answers to Investigation Questions

### What is the exact error message from the console?

```
Error: Minified React error #310; visit https://reactjs.org/docs/error-decoder.html?invariant=310
for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
```

**Decoded:** React error #310 = **"Rendered more hooks than during the previous render."**

### What is the full stack trace?

```
at $t (https://www.parceldesk.io/assets/index-DJs4xIQB.js:39:17831)
at Object.ah [as useMemo] (https://www.parceldesk.io/assets/index-DJs4xIQB.js:39:21526)
at Ew.ve.useMemo (https://www.parceldesk.io/assets/index-DJs4xIQB.js:10:6340)
at ne (https://www.parceldesk.io/assets/Dashboard-k0phtDjB.js:1:5081)
at nu (https://www.parceldesk.io/assets/index-DJs4xIQB.js:39:17236)
at fu (https://www.parceldesk.io/assets/index-DJs4xIQB.js:41:3158)
at ep (https://www.parceldesk.io/assets/index-DJs4xIQB.js:41:45127)
at Yh (https://www.parceldesk.io/assets/index-DJs4xIQB.js:41:40012)
at iw (https://www.parceldesk.io/assets/index-DJs4xIQB.js:41:39940)
at ya (https://www.parceldesk.io/assets/index-DJs4xIQB.js:41:39793)
```

### Which component is crashing?

**`Dashboard`** (the default export from `frontend/src/pages/Dashboard.tsx`).
In the minified bundle it appears as function `ne` in `Dashboard-k0phtDjB.js`.

### What file and line number?

**File:** `frontend/src/pages/Dashboard.tsx`
**Root cause line:** **Line 241** — the `useMemo` call for sparkline data.

The `useMemo` hook is called **after** three early returns (lines 137, 155, 173), which means it is conditionally executed depending on the data state. This violates React's Rules of Hooks.

### Does the error happen before or after API calls complete?

**After.** Network requests confirm both API calls succeed before the crash:

```
[POST] https://api.parceldesk.io/api/v1/auth/login        => [200]
[GET]  https://api.parceldesk.io/api/v1/dashboard/stats/   => [200]
[GET]  https://api.parceldesk.io/api/v1/dashboard/activity/ => [200]
```

The crash happens during **re-render** when React transitions from the loading state (which returned early at line 137) to the populated state (which calls `useMemo` at line 241). The hook count changes between renders, triggering error #310.

### Is it on the Dashboard page or somewhere else?

**Dashboard page only** (`/dashboard`). It is wrapped in `<PageErrorBoundary>` in `App.tsx` line 73, which catches the render error and shows the lighter-weight fallback UI.

### Does clicking "Retry" fix it?

**Yes.** Clicking Retry calls `this.setState({ hasError: false, error: null })` on the `PageErrorBoundary`, which re-renders the Dashboard from scratch. On this second render, React Query already has the cached data (`staleTime: 30_000`), so `isLoading` is `false` from the start. The component goes straight to the populated state, calls all hooks including `useMemo`, and renders correctly. No hook count mismatch occurs because there is no loading-to-populated transition.

---

## Root Cause Analysis

### The Bug: Conditional Hook Execution

In `Dashboard.tsx`, hooks are called in this order:

```
Line 110:  useNavigate()           -- always called
Line 111:  useDashboard()          -- always called (returns isLoading=true initially)
Line 112:  useAuthStore()          -- always called
Line 114:  useState()              -- always called
Line 116:  useQuery(['activity'])  -- always called

Line 137:  if (isLoading) return   -- EARLY RETURN (skips useMemo below)
Line 155:  if (isError) return     -- EARLY RETURN (skips useMemo below)
Line 173:  if (!stats) return      -- EARLY RETURN (skips useMemo below)

Line 241:  useMemo()               -- ONLY called when data is present
```

**First render (after login):** `isLoading=true`, so React sees 5 hooks (useNavigate, useQuery x2, useAuthStore, useState). The component returns the skeleton UI at line 137.

**Second render (data arrives):** `isLoading=false`, `stats` has data, so the component passes all early returns and reaches `useMemo` at line 241. React now sees **6 hooks**, which is more than the previous render's 5. This triggers error #310.

### Why Retry Works

When the error boundary resets, React Query's cache already has the dashboard data. The Dashboard mounts fresh with `isLoading=false` from the start. It goes straight to the populated branch, calling all 6 hooks on the very first render. No hook count change ever occurs.

---

## The Fix

Move the `useMemo` call to **before** any early returns, alongside the other hooks. All hooks must be called unconditionally on every render.

**Current (broken):**
```tsx
// Lines 108-246 (simplified)
export default function Dashboard() {
  const navigate = useNavigate()                    // hook 1
  const { data: stats, isLoading } = useDashboard() // hook 2
  const user = useAuthStore((s) => s.user)          // hook 3
  const [bannerDismissed, setBannerDismissed] = useState(false) // hook 4
  const { data: activityData } = useQuery({...})    // hook 5

  if (isLoading) return <Skeleton />    // <-- early return
  if (isError) return <Error />         // <-- early return
  if (!stats) return <Empty />          // <-- early return

  const sparklines = useMemo(...)       // hook 6 -- ONLY REACHED CONDITIONALLY
  return <PopulatedDashboard />
}
```

**Fixed:**
```tsx
export default function Dashboard() {
  const navigate = useNavigate()                    // hook 1
  const { data: stats, isLoading } = useDashboard() // hook 2
  const user = useAuthStore((s) => s.user)          // hook 3
  const [bannerDismissed, setBannerDismissed] = useState(false) // hook 4
  const { data: activityData } = useQuery({...})    // hook 5

  // Move useMemo BEFORE early returns so it runs on every render
  const closedDeals = stats?.closed_deals ?? 0
  const sparklines = useMemo(() => ({               // hook 6 -- ALWAYS CALLED
    totalDeals: generateTrendData(stats?.total_deals ?? 0, 7, 0.12),
    activePipeline: generateTrendData(stats?.active_pipeline_deals ?? 0, 7, 0.18),
    closedDeals: generateTrendData(closedDeals, 7, 0.1),
    dealsAnalyzed: generateTrendData(stats?.total_deals ?? 0, 7, 0.15),
  }), [stats?.total_deals, stats?.active_pipeline_deals, closedDeals])

  if (isLoading) return <Skeleton />
  if (isError) return <Error />
  if (!stats || stats.total_deals === 0) return <Empty />

  return <PopulatedDashboard />  // sparklines already computed
}
```

The `closedDeals` variable assignment (currently line 234) must also move above the early returns since `useMemo` depends on it.

---

## Affected Files

| File | Line | Issue |
|------|------|-------|
| `frontend/src/pages/Dashboard.tsx` | 241 | `useMemo` called after early returns (conditional hook) |
| `frontend/src/pages/Dashboard.tsx` | 234 | `closedDeals` variable also needs to move above early returns |

---

## Reproduction Steps

1. Navigate to https://www.parceldesk.io/login
2. Enter email: `demo@parcel.app`, password: `Demo1234!`
3. Click "Sign in"
4. Observe error boundary: "This section encountered an error"
5. Open browser console: React error #310
6. Click "Retry" -- dashboard loads correctly

---

## Severity

**High** -- Every user sees this crash on their first login of each session. The workaround (clicking Retry) works, but it creates a poor first impression and makes the app appear broken.

---

## Classification

This is a **rendering error** (hooks violation), not a data error. The API returns correct data. The bug is purely in the component's hook ordering relative to conditional returns.
