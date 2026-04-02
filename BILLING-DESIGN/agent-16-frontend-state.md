# Agent 16: Frontend Billing State Architecture

> Designed for Parcel's existing stack: React 18, TypeScript strict, Zustand v4,
> TanStack Query v5, Framer Motion v11, shadcn/ui. All code integrates with the
> existing `api.ts` request pattern, `authStore.ts` Zustand store, and
> `useSessionValidation` hydration flow in `App.tsx`.

---

## 1. TypeScript Interfaces for All Billing Data

All billing types live in a single file to keep the type system centralized
alongside the existing `frontend/src/types/index.ts` exports.

**File: `frontend/src/types/billing.ts`**

```typescript
// ---------------------------------------------------------------------------
// Plan & tier enums
// ---------------------------------------------------------------------------

/** The three billing tiers. "demo" is a synthetic tier for the demo account. */
export type PlanTier = 'free' | 'pro' | 'team' | 'demo'

/** Stripe subscription lifecycle states. */
export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'unpaid'

/** Billing cadence. null for free tier (no billing). */
export type BillingCycle = 'monthly' | 'annual' | null

// ---------------------------------------------------------------------------
// Usage tracking
// ---------------------------------------------------------------------------

/** A single usage metric with its current count and tier limit. */
export interface UsageMetric {
  /** Current count in the active billing period. */
  used: number
  /** Maximum allowed for the current plan. -1 means unlimited. */
  limit: number
}

/** All metered resources. Keys match backend `usage_records.metric` column. */
export interface UsageLimits {
  deals_created: UsageMetric
  chat_messages: UsageMetric
  documents_uploaded: UsageMetric
  pipeline_deals: UsageMetric
}

/** Percentage thresholds for usage meter color states. */
export type UsageLevel = 'normal' | 'warning' | 'danger' | 'exceeded'

// ---------------------------------------------------------------------------
// Subscription
// ---------------------------------------------------------------------------

/** The full subscription state returned by GET /api/v1/billing/status. */
export interface Subscription {
  plan: PlanTier
  status: SubscriptionStatus
  cycle: BillingCycle
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  trial_ends_at: string | null
}

/** Combined billing status response from the API. */
export interface BillingStatusResponse {
  subscription: Subscription
  usage: UsageLimits
}

// ---------------------------------------------------------------------------
// Plans catalog
// ---------------------------------------------------------------------------

/** A single plan option shown in the pricing table. */
export interface PlanOption {
  id: string
  tier: PlanTier
  name: string
  description: string
  price_monthly: number
  price_annual: number
  features: string[]
  limits: {
    deals_created: number      // -1 = unlimited
    chat_messages: number
    documents_uploaded: number
    pipeline_deals: number
  }
  highlighted: boolean
}

/** Response from GET /api/v1/billing/plans. */
export interface PlansResponse {
  plans: PlanOption[]
}

// ---------------------------------------------------------------------------
// Checkout & portal
// ---------------------------------------------------------------------------

/** Request body for POST /api/v1/billing/checkout. */
export interface CreateCheckoutRequest {
  plan: 'pro' | 'team'
  cycle: 'monthly' | 'annual'
}

/** Response from POST /api/v1/billing/checkout. */
export interface CheckoutResponse {
  checkout_url: string
}

/** Response from POST /api/v1/billing/portal. */
export interface PortalResponse {
  portal_url: string
}

// ---------------------------------------------------------------------------
// Billing history
// ---------------------------------------------------------------------------

/** A single invoice/payment record. */
export interface Invoice {
  id: string
  date: string
  description: string
  amount_cents: number
  currency: string
  status: 'paid' | 'open' | 'void' | 'uncollectible'
  invoice_pdf_url: string | null
  hosted_invoice_url: string | null
}

/** Response from GET /api/v1/billing/invoices. */
export interface InvoicesResponse {
  invoices: Invoice[]
  has_more: boolean
}

// ---------------------------------------------------------------------------
// Feature gating
// ---------------------------------------------------------------------------

/** Enumeration of gatable features. Used by canAccess() and FeatureGate. */
export type Feature =
  | 'deal_sharing'
  | 'offer_letter'
  | 'pdf_report'
  | 'portfolio'
  | 'pipeline_write'
  | 'document_upload'
  | 'unlimited_deals'
  | 'unlimited_chat'
  | 'unlimited_documents'
  | 'team_members'

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

/** Structured 403 error from billing-gated endpoints. */
export interface TierRequiredError {
  error: string
  code: 'TIER_REQUIRED'
  required_tier: PlanTier
}

/** Structured 403 error when a usage quota is exceeded. */
export interface QuotaExceededError {
  error: string
  code: 'QUOTA_EXCEEDED'
  metric: keyof UsageLimits
  limit: number
  used: number
}

export type BillingError = TierRequiredError | QuotaExceededError
```

**Add to `frontend/src/types/index.ts`** (append at bottom):

```typescript
// Re-export billing types for convenience
export type {
  PlanTier,
  SubscriptionStatus,
  BillingCycle,
  UsageMetric,
  UsageLimits,
  Subscription,
  BillingStatusResponse,
  Feature,
} from './billing'
```

---

## 2. Extend the User Interface with Plan Info

The backend will return plan info on `/auth/me` and `/auth/refresh`. The existing
`User` interface in `types/index.ts` gains three fields. The auth store needs
zero structural changes because `setAuth(data.user)` already stores whatever
shape the backend returns.

**Edit `frontend/src/types/index.ts`, modify `User`:**

```typescript
export interface User {
  id: string
  name: string
  email: string
  role: 'wholesaler' | 'investor' | 'agent'
  team_id?: string | null
  created_at: string
  // --- billing fields (returned by /auth/me) ---
  plan: 'free' | 'pro' | 'team' | 'demo'
  plan_status: SubscriptionStatus | null
  current_period_end: string | null
}
```

No changes to `authStore.ts`. The Zustand store is untyped beyond `User | null`,
so it automatically picks up the new fields once the interface updates.

---

## 3. Zustand Billing Store

The billing store holds the detailed subscription + usage data that goes beyond
what `/auth/me` returns. It is separate from authStore because (a) billing state
refreshes on a different cadence, (b) it should not be localStorage-persisted
like the user object, and (c) it has its own hydration lifecycle.

**File: `frontend/src/stores/billingStore.ts`**

```typescript
import { create } from 'zustand'
import type {
  PlanTier,
  SubscriptionStatus,
  BillingCycle,
  UsageLimits,
  Subscription,
  BillingStatusResponse,
  Feature,
} from '@/types/billing'

// ---------------------------------------------------------------------------
// Feature access map — which features require which tier
// ---------------------------------------------------------------------------

const FEATURE_TIERS: Record<Feature, PlanTier[]> = {
  deal_sharing:       ['pro', 'team', 'demo'],
  offer_letter:       ['pro', 'team', 'demo'],
  pdf_report:         ['pro', 'team', 'demo'],
  portfolio:          ['pro', 'team', 'demo'],
  pipeline_write:     ['pro', 'team', 'demo'],
  document_upload:    ['pro', 'team', 'demo'],
  unlimited_deals:    ['pro', 'team', 'demo'],
  unlimited_chat:     ['pro', 'team', 'demo'],
  unlimited_documents:['pro', 'team', 'demo'],
  team_members:       ['team', 'demo'],
}

// ---------------------------------------------------------------------------
// Store shape
// ---------------------------------------------------------------------------

interface BillingState {
  // Subscription data
  plan: PlanTier
  status: SubscriptionStatus
  cycle: BillingCycle
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  trialEndsAt: string | null

  // Usage data
  usage: UsageLimits | null

  // Loading / error
  isLoaded: boolean
  isLoading: boolean
  error: string | null

  // Dismissed paywall features (session-scoped, never persisted)
  dismissedPaywalls: Set<Feature>

  // Actions
  hydrate: (data: BillingStatusResponse) => void
  hydrateFromUser: (plan: PlanTier, status: SubscriptionStatus | null, periodEnd: string | null) => void
  setUsage: (usage: UsageLimits) => void
  incrementUsage: (metric: keyof UsageLimits) => void
  dismissPaywall: (feature: Feature) => void
  reset: () => void

  // Selectors (pure functions, no side effects)
  canAccess: (feature: Feature) => boolean
  isUnlimited: (metric: keyof UsageLimits) => boolean
  isOverQuota: (metric: keyof UsageLimits) => boolean
  getUsageLevel: (metric: keyof UsageLimits) => 'normal' | 'warning' | 'danger' | 'exceeded'
  trialDaysRemaining: () => number | null
}

const DEFAULT_FREE_USAGE: UsageLimits = {
  deals_created:      { used: 0, limit: 5 },
  chat_messages:      { used: 0, limit: 25 },
  documents_uploaded: { used: 0, limit: 0 },
  pipeline_deals:     { used: 0, limit: 10 },
}

export const useBillingStore = create<BillingState>()((set, get) => ({
  // --- Initial state ---
  plan: 'free',
  status: 'active',
  cycle: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  trialEndsAt: null,
  usage: null,
  isLoaded: false,
  isLoading: false,
  error: null,
  dismissedPaywalls: new Set(),

  // --- Actions ---

  /** Full hydration from GET /api/v1/billing/status response. */
  hydrate: (data) =>
    set({
      plan: data.subscription.plan,
      status: data.subscription.status,
      cycle: data.subscription.cycle,
      currentPeriodEnd: data.subscription.current_period_end,
      cancelAtPeriodEnd: data.subscription.cancel_at_period_end,
      trialEndsAt: data.subscription.trial_ends_at,
      usage: data.usage,
      isLoaded: true,
      isLoading: false,
      error: null,
    }),

  /** Partial hydration from /auth/me response (plan + status only, no usage). */
  hydrateFromUser: (plan, status, periodEnd) =>
    set((prev) => ({
      plan,
      status: status ?? 'active',
      currentPeriodEnd: periodEnd,
      // Keep existing usage if we already have it; don't overwrite with null
      usage: prev.usage,
      isLoaded: true,
    })),

  /** Update usage data without touching subscription fields. */
  setUsage: (usage) => set({ usage }),

  /** Optimistically increment a usage counter after a billable action. */
  incrementUsage: (metric) =>
    set((prev) => {
      if (!prev.usage) return {}
      const current = prev.usage[metric]
      return {
        usage: {
          ...prev.usage,
          [metric]: { ...current, used: current.used + 1 },
        },
      }
    }),

  /** Track that user dismissed a paywall modal for this feature this session. */
  dismissPaywall: (feature) =>
    set((prev) => {
      const next = new Set(prev.dismissedPaywalls)
      next.add(feature)
      return { dismissedPaywalls: next }
    }),

  /** Clear all billing state on logout. */
  reset: () =>
    set({
      plan: 'free',
      status: 'active',
      cycle: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      trialEndsAt: null,
      usage: null,
      isLoaded: false,
      isLoading: false,
      error: null,
      dismissedPaywalls: new Set(),
    }),

  // --- Selectors ---

  canAccess: (feature) => {
    const { plan, status } = get()
    // Past-due subscriptions retain access for grace period
    if (status === 'canceled' || status === 'unpaid') return false
    return FEATURE_TIERS[feature].includes(plan)
  },

  isUnlimited: (metric) => {
    const { usage } = get()
    if (!usage) return false
    return usage[metric].limit === -1
  },

  isOverQuota: (metric) => {
    const { usage } = get()
    if (!usage) return false
    const { used, limit } = usage[metric]
    if (limit === -1) return false
    return used >= limit
  },

  getUsageLevel: (metric) => {
    const { usage } = get()
    if (!usage) return 'normal'
    const { used, limit } = usage[metric]
    if (limit === -1) return 'normal'
    if (used >= limit) return 'exceeded'
    const pct = (used / limit) * 100
    if (pct >= 90) return 'danger'
    if (pct >= 70) return 'warning'
    return 'normal'
  },

  trialDaysRemaining: () => {
    const { trialEndsAt, status } = get()
    if (status !== 'trialing' || !trialEndsAt) return null
    const diff = new Date(trialEndsAt).getTime() - Date.now()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  },
}))
```

---

## 4. Feature Flag Helper: `canAccess`

The billing store exposes `canAccess` as a method, but components need a hook
that triggers re-renders. This hook also serves as the single import for feature
gating across the entire app.

**File: `frontend/src/hooks/usePlan.ts`**

```typescript
import { useAuthStore } from '@/stores/authStore'
import { useBillingStore } from '@/stores/billingStore'
import type { Feature, PlanTier, UsageLimits } from '@/types/billing'

/** Returns the current plan tier with a fallback to 'free'. */
export function usePlan(): PlanTier {
  return useAuthStore((s) => s.user?.plan ?? 'free')
}

/** Returns true if the current plan can access the given feature. */
export function useCanAccess(feature: Feature): boolean {
  return useBillingStore((s) => s.canAccess(feature))
}

/** Returns true if the user has exhausted their quota for a metric. */
export function useIsOverQuota(metric: keyof UsageLimits): boolean {
  return useBillingStore((s) => s.isOverQuota(metric))
}

/** Returns the usage level for a metric (normal/warning/danger/exceeded). */
export function useUsageLevel(metric: keyof UsageLimits) {
  return useBillingStore((s) => s.getUsageLevel(metric))
}

/** Returns days remaining on trial, or null if not trialing. */
export function useTrialDaysRemaining(): number | null {
  return useBillingStore((s) => s.trialDaysRemaining())
}

/** Returns true if the user is on the demo account. */
export function useIsDemo(): boolean {
  return useAuthStore((s) => s.user?.plan === 'demo')
}

/** Returns true if billing UI (upgrade CTAs, usage meters) should be hidden. */
export function useHideBillingUI(): boolean {
  return useAuthStore((s) => s.user?.plan === 'demo')
}
```

---

## 5. API Client Additions

All new billing API calls follow the existing `api.ts` pattern of grouped
methods under the `api` export object. The `request<T>()` function is reused
for authentication and 401 retry handling.

**Additions to `frontend/src/lib/api.ts`:**

```typescript
import type {
  BillingStatusResponse,
  PlansResponse,
  CreateCheckoutRequest,
  CheckoutResponse,
  PortalResponse,
  InvoicesResponse,
} from '@/types/billing'

// Add to the `api` export object after the existing `notifications` group:

billing: {
  /** Fetch current subscription + usage. Called on mount and focus. */
  status: () =>
    request<BillingStatusResponse>('/api/v1/billing/status'),

  /** Fetch available plan options for the pricing table. */
  plans: () =>
    request<PlansResponse>('/api/v1/billing/plans'),

  /** Create a Stripe Checkout session. Returns a URL to redirect to. */
  createCheckout: (data: CreateCheckoutRequest) =>
    request<CheckoutResponse>('/api/v1/billing/checkout', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Create a Stripe Customer Portal session. Returns a URL to redirect to. */
  createPortal: () =>
    request<PortalResponse>('/api/v1/billing/portal', {
      method: 'POST',
    }),

  /** Fetch invoice/payment history. */
  invoices: (limit = 20, starting_after?: string) => {
    const params = new URLSearchParams()
    params.set('limit', String(limit))
    if (starting_after) params.set('starting_after', starting_after)
    return request<InvoicesResponse>(`/api/v1/billing/invoices?${params.toString()}`)
  },
},
```

### 403 Handling in `request()`

The existing `request()` function handles 401. Add 403 handling for billing
errors between the 401 block and the generic `!res.ok` block:

**Edit `frontend/src/lib/api.ts`, add after the `if (res.status === 401)` block (line 102):**

```typescript
  // Billing-specific 403 responses
  if (res.status === 403) {
    const body = await res.json().catch(() => ({ error: 'Forbidden' })) as Record<string, unknown>

    if (body.code === 'TIER_REQUIRED' || body.code === 'QUOTA_EXCEEDED') {
      // Dispatch a custom event that UpgradeModal listens for
      window.dispatchEvent(
        new CustomEvent('parcel:billing-error', { detail: body })
      )
      throw new BillingGateError(
        body.code as 'TIER_REQUIRED' | 'QUOTA_EXCEEDED',
        (body.error as string) ?? 'Upgrade required',
        body
      )
    }
  }
```

**New error class (add at top of `api.ts`):**

```typescript
/** Custom error class for billing-related 403 responses. */
export class BillingGateError extends Error {
  code: 'TIER_REQUIRED' | 'QUOTA_EXCEEDED'
  detail: Record<string, unknown>

  constructor(code: 'TIER_REQUIRED' | 'QUOTA_EXCEEDED', message: string, detail: Record<string, unknown>) {
    super(message)
    this.name = 'BillingGateError'
    this.code = code
    this.detail = detail
  }
}
```

### Chat Stream 403 Handling

**Edit `frontend/src/lib/chat-stream.ts`, replace the `if (!res.ok)` line:**

```typescript
  if (res.status === 403) {
    const body = await res.json().catch(() => ({})) as Record<string, unknown>
    if (body.code === 'TIER_REQUIRED' || body.code === 'QUOTA_EXCEEDED') {
      window.dispatchEvent(
        new CustomEvent('parcel:billing-error', { detail: body })
      )
    }
    throw new Error(
      body.code === 'QUOTA_EXCEEDED'
        ? 'You have reached your monthly message limit. Upgrade to Pro for unlimited chat.'
        : 'This feature requires a Pro plan.'
    )
  }

  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)
```

---

## 6. TanStack Query Hooks

All billing query hooks live in a single file, following the existing pattern
of `useDeals.ts`, `useDashboard.ts`, and `usePortfolio.ts`.

**File: `frontend/src/hooks/useBilling.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useBillingStore } from '@/stores/billingStore'
import type {
  BillingStatusResponse,
  PlansResponse,
  CreateCheckoutRequest,
  CheckoutResponse,
  InvoicesResponse,
} from '@/types/billing'

// ---------------------------------------------------------------------------
// Query keys — centralized for invalidation
// ---------------------------------------------------------------------------

export const billingKeys = {
  all: ['billing'] as const,
  status: () => [...billingKeys.all, 'status'] as const,
  plans: () => [...billingKeys.all, 'plans'] as const,
  invoices: (cursor?: string) => [...billingKeys.all, 'invoices', cursor] as const,
}

// ---------------------------------------------------------------------------
// useSubscription — the primary billing state hook
// ---------------------------------------------------------------------------

/**
 * Fetches subscription + usage from GET /api/v1/billing/status.
 * Hydrates the Zustand billing store on every successful fetch.
 *
 * Refetch strategy:
 * - On mount (app startup, via BillingProvider)
 * - On window focus (user returns to tab)
 * - After checkout redirect (query param trigger)
 * - After any mutation that might change usage
 *
 * staleTime is 60s — usage data doesn't need second-by-second precision.
 */
export function useSubscription() {
  const hydrate = useBillingStore((s) => s.hydrate)

  return useQuery({
    queryKey: billingKeys.status(),
    queryFn: async () => {
      const data = await api.billing.status()
      hydrate(data)
      return data
    },
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    // Don't retry on 401 (session expired) — the auth layer handles it
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message === 'Session expired') return false
      return failureCount < 2
    },
  })
}

// ---------------------------------------------------------------------------
// useUsage — lighter-weight usage-only refetch
// ---------------------------------------------------------------------------

/**
 * Returns usage data from the billing store. Does NOT trigger its own fetch;
 * relies on useSubscription() having hydrated the store. Components that
 * need usage data should ensure useSubscription() is active (it always is
 * via BillingProvider in App.tsx).
 */
export function useUsage() {
  const usage = useBillingStore((s) => s.usage)
  const isLoaded = useBillingStore((s) => s.isLoaded)
  return { usage, isLoaded }
}

// ---------------------------------------------------------------------------
// usePlans — pricing table data
// ---------------------------------------------------------------------------

/**
 * Fetches available plans for the pricing/billing page.
 * Long staleTime because plan catalog changes rarely.
 */
export function usePlans() {
  return useQuery({
    queryKey: billingKeys.plans(),
    queryFn: () => api.billing.plans(),
    staleTime: 10 * 60_000, // 10 minutes
  })
}

// ---------------------------------------------------------------------------
// useBillingHistory — invoice list
// ---------------------------------------------------------------------------

export function useBillingHistory(cursor?: string) {
  return useQuery({
    queryKey: billingKeys.invoices(cursor),
    queryFn: () => api.billing.invoices(20, cursor),
    staleTime: 60_000,
  })
}

// ---------------------------------------------------------------------------
// useCreateCheckout — Stripe Checkout redirect
// ---------------------------------------------------------------------------

export function useCreateCheckout() {
  return useMutation({
    mutationFn: (data: CreateCheckoutRequest) => api.billing.createCheckout(data),
    onSuccess: (response) => {
      // Redirect to Stripe Checkout — this leaves the app
      window.location.href = response.checkout_url
    },
  })
}

// ---------------------------------------------------------------------------
// useCreatePortal — Stripe Customer Portal redirect
// ---------------------------------------------------------------------------

export function useCreatePortal() {
  return useMutation({
    mutationFn: () => api.billing.createPortal(),
    onSuccess: (response) => {
      window.location.href = response.portal_url
    },
  })
}

// ---------------------------------------------------------------------------
// useRefreshBilling — manual refresh after billable actions
// ---------------------------------------------------------------------------

/**
 * Returns a function that invalidates the billing status query,
 * triggering a refetch and store re-hydration. Call this after:
 * - Creating a deal (increments deals_created)
 * - Sending a chat message (increments chat_messages)
 * - Uploading a document (increments documents_uploaded)
 * - Adding to pipeline (increments pipeline_deals)
 * - Successful checkout redirect
 */
export function useRefreshBilling() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: billingKeys.status() })
}
```

---

## 7. Subscription State Hydration

Billing state is loaded in two phases to minimize latency and avoid
waterfall requests.

### Phase 1: Fast hydration from `/auth/me` (existing flow)

The `useSessionValidation()` hook in `App.tsx` already calls `/auth/me` on
mount. Once the backend adds `plan`, `plan_status`, and `current_period_end`
to the `/auth/me` response, the billing store can do an early partial hydration.

**Edit `App.tsx`, modify `useSessionValidation`:**

```typescript
function useSessionValidation() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const setAuth = useAuthStore((s) => s.setAuth)
  const hydrateFromUser = useBillingStore((s) => s.hydrateFromUser)

  const { data, isError } = useQuery({
    queryKey: ['session-check'],
    queryFn: () => api.auth.me(),
    enabled: isAuthenticated,
    retry: false,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    if (isError) {
      clearAuth()
      useBillingStore.getState().reset()
    }
  }, [isError, clearAuth])

  useEffect(() => {
    if (data) {
      setAuth(data)
      // Phase 1 hydration: plan tier available immediately from /auth/me
      hydrateFromUser(
        data.plan ?? 'free',
        data.plan_status ?? null,
        data.current_period_end ?? null
      )
    }
  }, [data, setAuth, hydrateFromUser])
}
```

### Phase 2: Full hydration from `/billing/status`

A `<BillingProvider>` component runs `useSubscription()` inside the
authenticated route tree. This fetches the full billing status (including
usage) and writes it to the store.

**File: `frontend/src/components/billing/BillingProvider.tsx`**

```typescript
import { useEffect } from 'react'
import { useSubscription, useRefreshBilling } from '@/hooks/useBilling'
import { useAuthStore } from '@/stores/authStore'
import { useBillingStore } from '@/stores/billingStore'

/**
 * Invisible provider that keeps billing state synchronized.
 * Mount once inside the authenticated layout (AnimatedRoutes).
 *
 * Responsibilities:
 * 1. Fetch full billing status on mount
 * 2. Refetch on window focus (useSubscription has refetchOnWindowFocus: true)
 * 3. Refetch after checkout redirect (?upgrade=success query param)
 * 4. Reset billing state on logout
 */
export function BillingProvider({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const resetBilling = useBillingStore((s) => s.reset)

  // Only run the subscription query when authenticated
  useSubscription()

  // Reset billing store when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      resetBilling()
    }
  }, [isAuthenticated, resetBilling])

  // Detect checkout return and force refetch
  const refreshBilling = useRefreshBilling()
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('upgrade') === 'success') {
      // Force immediate refetch to pick up the new plan
      refreshBilling()
    }
  }, [refreshBilling])

  return <>{children}</>
}
```

**Mount in `App.tsx`:**

```typescript
function AnimatedRoutes() {
  const location = useLocation()
  useSessionValidation()

  return (
    <BillingProvider>
      <AnimatePresence mode="wait">
        {/* ... existing route tree ... */}
      </AnimatePresence>
    </BillingProvider>
  )
}
```

### Hydration timing diagram

```
App mount
  |
  +--> useSessionValidation() fires GET /auth/me
  |      |
  |      +--> Phase 1: hydrateFromUser(plan, status, periodEnd)
  |           Result: billingStore.plan is set, canAccess() works
  |           Latency: ~0ms additional (piggybacks on existing call)
  |
  +--> useSubscription() fires GET /billing/status
         |
         +--> Phase 2: hydrate(subscription + usage)
              Result: full usage data available
              Latency: one additional API call (~100-200ms)
```

**Why two phases?** Phase 1 lets `FeatureGate` components render correctly on
the very first frame after login, with zero additional latency. Phase 2 fills
in usage meters as a background enhancement. If Phase 2 fails (network error),
the app still gates features correctly based on Phase 1 data.

---

## 8. Optimistic Updates on Upgrade

After a user completes Stripe Checkout, there is a window where the webhook
may not have fired yet. The frontend handles this gracefully:

### Strategy: Optimistic unlock on checkout return

```typescript
// In BillingProvider.tsx, on detecting ?upgrade=success:

useEffect(() => {
  const params = new URLSearchParams(window.location.search)
  const upgradeSuccess = params.get('upgrade') === 'success'
  const plan = params.get('plan') as 'pro' | 'team' | null

  if (upgradeSuccess && plan) {
    // Optimistic: immediately set the new plan in the store
    useBillingStore.setState({
      plan,
      status: 'active',
      isLoaded: true,
    })

    // Also update the auth store's user object
    const currentUser = useAuthStore.getState().user
    if (currentUser) {
      useAuthStore.getState().setAuth({ ...currentUser, plan, plan_status: 'active' })
    }

    // Then verify with the server (webhook may take 1-5s)
    refreshBilling()

    // Clean URL
    const url = new URL(window.location.href)
    url.searchParams.delete('upgrade')
    url.searchParams.delete('plan')
    window.history.replaceState({}, '', url.toString())
  }
}, [refreshBilling])
```

### Reconciliation

When `useSubscription` refetches and the server confirms the plan, the store
overwrites the optimistic state with the canonical server state. If the webhook
has not yet processed:

1. The server still returns `plan: 'free'` from `/billing/status`.
2. The store would revert to `free`, re-locking features.
3. To prevent this, add a **grace window**: if we just saw `?upgrade=success`
   within the last 30 seconds, skip overwriting the plan with a lesser tier.

```typescript
// In billingStore.ts, add:

/** Timestamp of the last optimistic upgrade. Used to prevent premature reversion. */
lastOptimisticUpgrade: null as number | null,

hydrate: (data) => {
  const { lastOptimisticUpgrade, plan: currentPlan } = get()

  // Grace period: if we optimistically upgraded < 30s ago and the server
  // returns a lesser plan, it means the webhook hasn't arrived yet. Keep
  // the optimistic plan.
  const inGracePeriod =
    lastOptimisticUpgrade !== null &&
    Date.now() - lastOptimisticUpgrade < 30_000

  const TIER_RANK: Record<string, number> = { free: 0, pro: 1, team: 2, demo: 3 }

  const serverPlan = data.subscription.plan
  const shouldKeepOptimistic =
    inGracePeriod &&
    (TIER_RANK[serverPlan] ?? 0) < (TIER_RANK[currentPlan] ?? 0)

  set({
    plan: shouldKeepOptimistic ? currentPlan : serverPlan,
    status: shouldKeepOptimistic ? 'active' : data.subscription.status,
    cycle: data.subscription.cycle,
    currentPeriodEnd: data.subscription.current_period_end,
    cancelAtPeriodEnd: data.subscription.cancel_at_period_end,
    trialEndsAt: data.subscription.trial_ends_at,
    usage: data.usage,
    isLoaded: true,
    isLoading: false,
    error: null,
    // Clear grace period once server confirms the upgrade
    lastOptimisticUpgrade: shouldKeepOptimistic ? lastOptimisticUpgrade : null,
  })
},
```

---

## 9. Real-Time Usage Updates

Usage counts change when the user performs billable actions. Rather than
refetching the entire billing status after every action, we use a combination
of optimistic increments and periodic background refetch.

### When to update usage

| User action              | Metric incremented      | Approach                              |
|--------------------------|-------------------------|---------------------------------------|
| Create a deal            | `deals_created`         | Optimistic increment + refetch        |
| Send a chat message      | `chat_messages`         | Optimistic increment (no refetch)     |
| Upload a document        | `documents_uploaded`    | Optimistic increment + refetch        |
| Add to pipeline          | `pipeline_deals`        | Optimistic increment + refetch        |
| Window focus return      | (all)                   | Full refetch via useSubscription      |
| Checkout return          | (all)                   | Full refetch via useSubscription      |

### Integration with existing mutation hooks

**Edit `frontend/src/hooks/useDeals.ts`, modify `useCreateDeal`:**

```typescript
export function useCreateDeal() {
  const navigate = useNavigate()
  const incrementUsage = useBillingStore((s) => s.incrementUsage)
  const refreshBilling = useRefreshBilling()

  return useMutation({
    mutationFn: (data: DealCreateRequest) => api.deals.create(data),
    onSuccess: (deal) => {
      incrementUsage('deals_created')     // Optimistic: +1 immediately
      navigate(`/analyze/results/${deal.id}`)
      refreshBilling()                     // Background: confirm with server
    },
    onError: (err) => {
      // If the error is a billing gate, the 403 handler in api.ts
      // already dispatched the upgrade modal event. Just show a toast.
      if (err instanceof BillingGateError) {
        toast.error('Deal limit reached. Upgrade your plan for more analyses.')
        return
      }
      toast.error(err instanceof Error ? err.message : 'Failed to analyze deal — try again')
    },
  })
}
```

**In `ChatPage.tsx`, after a successful message send (inside `handleSend`):**

```typescript
// After the streaming loop completes successfully:
useBillingStore.getState().incrementUsage('chat_messages')
```

This does not trigger a full refetch for chat messages because chat is
high-frequency — the optimistic count is good enough until the next window
focus refetch.

---

## 10. Offline Handling

When the API is unreachable while checking tier:

### Strategy: Last-known-good state + graceful degradation

1. **Zustand store is in-memory**: The billing store retains its last
   hydrated state even if the network drops. `canAccess()` continues to
   work against stale data. This is safe because:
   - A Pro user losing connectivity should not be downgraded.
   - A Free user cannot gain Pro access by going offline.

2. **`useSubscription` has `retry: 2`**: TanStack Query retries failed
   fetches twice before settling into error state.

3. **Phase 1 from localStorage**: The `authStore` persists `User` (including
   `plan`) to localStorage. On reload without connectivity, the user still
   sees their correct plan tier from the cached user object, and
   `hydrateFromUser` populates the billing store from it.

4. **Usage data unavailable**: If `/billing/status` fails, `usage` stays
   `null`. Components that display usage meters should handle `null`:

```typescript
// In UsageMeter component:
if (!usage) {
  return <SkeletonCard lines={1} /> // Graceful loading state
}
```

5. **Billable actions fail naturally**: If the user tries to create a deal
   while offline, the `api.deals.create()` call fails with the network
   error. The billing check is backend-enforced anyway — the frontend
   gate is a UX optimization, not a security boundary.

### Network recovery

When connectivity returns and the user focuses the window, `useSubscription`
(with `refetchOnWindowFocus: true` and `refetchOnReconnect: true`) fires and
re-hydrates the store with fresh data.

---

## 11. Route Guards

Billing enforcement is primarily at the **feature level** (buttons, forms,
components), not the **route level**. Free users can visit `/pipeline` and
see a read-only view. However, some pages are entirely Pro-only (like a
future team analytics page). For those, a `TierRoute` guard redirects to
the pricing page.

**File: `frontend/src/components/billing/TierRoute.tsx`**

```typescript
import { Navigate, useLocation } from 'react-router-dom'
import { useBillingStore } from '@/stores/billingStore'
import type { PlanTier } from '@/types/billing'

const TIER_RANK: Record<PlanTier, number> = {
  free: 0,
  pro: 1,
  team: 2,
  demo: 3, // demo has full access
}

interface TierRouteProps {
  requiredTier: PlanTier
  children: React.ReactNode
}

/**
 * Route guard that redirects users below the required tier to the
 * billing page with an upgrade prompt.
 *
 * Usage in App.tsx:
 * <Route path="/team-analytics" element={
 *   <ProtectedRoute>
 *     <TierRoute requiredTier="team">
 *       <TeamAnalytics />
 *     </TierRoute>
 *   </ProtectedRoute>
 * } />
 */
export function TierRoute({ requiredTier, children }: TierRouteProps) {
  const plan = useBillingStore((s) => s.plan)
  const isLoaded = useBillingStore((s) => s.isLoaded)
  const location = useLocation()

  // While billing state is loading, don't redirect — show nothing
  // (the Suspense fallback from App.tsx covers this)
  if (!isLoaded) return null

  if (TIER_RANK[plan] < TIER_RANK[requiredTier]) {
    return (
      <Navigate
        to="/settings/billing"
        state={{ from: location.pathname, requiredTier }}
        replace
      />
    )
  }

  return <>{children}</>
}
```

### Current pages and their billing approach

| Route          | Billing approach            | Notes                                    |
|----------------|-----------------------------|------------------------------------------|
| `/dashboard`   | No gate                     | Available to all tiers                   |
| `/analyze/*`   | Quota check on submit       | Free: 5/mo deals. Button disabled when over quota |
| `/deals`       | No gate                     | All deals visible; create button gated   |
| `/pipeline`    | Feature-level gate          | Read-only for Free; drag/add disabled    |
| `/portfolio`   | Feature-level gate          | Blurred preview for Free users           |
| `/documents`   | Quota check on upload       | Free: 0 uploads. View existing allowed   |
| `/chat`        | Quota check on send         | Free: 25/mo messages                    |
| `/settings`    | No gate                     | Billing tab available to all             |
| `/compare`     | No gate                     | Available to all tiers                   |

---

## 12. Complete Integration: Updated App.tsx Authenticated Layout

Showing how all the pieces fit together in the existing route structure:

```typescript
// In App.tsx, update the imports:
import { BillingProvider } from '@/components/billing/BillingProvider'
import { useBillingStore } from '@/stores/billingStore'

// In useSessionValidation, add billing hydration (see Section 7)

// In AnimatedRoutes:
function AnimatedRoutes() {
  const location = useLocation()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  useSessionValidation()

  return (
    // BillingProvider only fetches when authenticated
    <BillingProvider>
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          variants={pageTransition}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <Suspense fallback={<PageFallback />}>
            <Routes location={location}>
              {/* ... all existing routes unchanged ... */}

              {/* NEW: Billing settings route */}
              <Route
                path="/settings/billing"
                element={
                  <ProtectedRoute>
                    <PageErrorBoundary>
                      <BillingPage />
                    </PageErrorBoundary>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </BillingProvider>
  )
}
```

### Logout cleanup

**Edit `frontend/src/hooks/useAuth.ts`, modify `useLogout`:**

```typescript
import { useBillingStore } from '@/stores/billingStore'

export function useLogout() {
  const navigate = useNavigate()
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const resetBilling = useBillingStore((s) => s.reset)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => api.auth.logout(),
    onSuccess: () => {
      clearAuth()
      resetBilling()
      queryClient.clear()
      navigate('/login')
    },
    onError: () => {
      clearAuth()
      resetBilling()
      queryClient.clear()
      navigate('/login')
    },
  })
}
```

---

## CRITICAL DECISIONS

### 1. Billing store is separate from auth store

**Decision:** Create `billingStore.ts` as a standalone Zustand store rather
than extending `authStore.ts`.

**Rationale:**
- Auth store persists to localStorage; billing state should NOT be persisted
  (stale usage counts are dangerous).
- Auth store refreshes on a 5-minute cadence; billing refreshes on focus
  + after billable actions.
- Separation of concerns: auth handles identity, billing handles entitlements.
- The `User` type on the auth store carries `plan` as a lightweight signal
  for Phase 1 hydration; the billing store carries the full picture.

### 2. Two-phase hydration (User.plan + /billing/status)

**Decision:** Hydrate billing from `/auth/me` immediately, then backfill
with `/billing/status`.

**Rationale:** Adding `plan` to the User response costs zero additional
latency (the `/auth/me` call already happens on every app load). This
means `canAccess()` works on the very first render frame. Usage data
arrives slightly later from the dedicated billing endpoint but is never
needed for the initial route/feature gate decision.

### 3. Optimistic upgrade with 30-second grace period

**Decision:** On checkout return, immediately set the new plan in the store.
If the server returns a lesser plan within 30 seconds, assume the webhook
hasn't arrived yet and keep the optimistic state.

**Rationale:** Stripe webhooks typically arrive within 1-5 seconds but can
take up to 30 seconds under load. Without this grace period, users would
see features unlock, then immediately re-lock, then unlock again when the
webhook arrives. The 30-second window prevents this flicker.

**Risk:** If a checkout somehow fails after redirect (extremely rare), the
user sees Pro access for up to 30 seconds before reverting. This is
acceptable because (a) no data is created during this window that violates
tier limits (backend still enforces), and (b) the alternative (showing
"free" immediately after paying) is far worse UX.

### 4. Custom event for billing 403 errors (not Zustand)

**Decision:** Use `window.dispatchEvent(new CustomEvent('parcel:billing-error'))`
rather than writing to a Zustand store.

**Rationale:** The 403 handler runs inside `api.ts` which is a plain module,
not a React component. It cannot call hooks. Writing to a store would work
but creates a tight coupling between the API layer and the billing store.
A custom DOM event is loosely coupled: the `UpgradeModal` component listens
for the event and opens itself. If no listener is mounted (e.g., during
SSR or tests), the event is silently ignored.

### 5. Usage increments are optimistic, not just cache-based

**Decision:** After a billable action, immediately increment the local usage
counter via `incrementUsage()` rather than waiting for a refetch.

**Rationale:** If a user sends 25 chat messages in rapid succession, waiting
for refetch between each would either (a) allow overshoot or (b) require
blocking the UI until the refetch completes. Optimistic increments let the
frontend enforce the quota in real time. The backend is the source of truth
and will reject requests over quota regardless.

### 6. Feature gating is frontend UX, not frontend security

**Decision:** All tier/quota enforcement is duplicated on the backend via
`require_tier()` and `check_quota()` FastAPI dependencies. Frontend gates
exist purely to improve UX (preventing the user from attempting an action
that will fail).

**Rationale:** Frontend JavaScript can always be bypassed. A user who
disables the frontend gate will simply hit a 403 from the backend. This
means frontend billing bugs never result in revenue loss or unauthorized
access.

### 7. No localStorage persistence for billing state

**Decision:** The billing Zustand store is in-memory only. It re-hydrates
from the server on every app load.

**Rationale:** Usage counts are time-sensitive (they reset each billing
period). Persisting stale usage to localStorage risks showing "3 of 5"
when the period just reset and the correct count is "0 of 5". The
two-phase hydration ensures billing state is available within milliseconds
of app load without stale data risks.

### 8. Demo account bypasses all billing UI

**Decision:** When `user.plan === 'demo'`, hide all upgrade CTAs, usage
meters, trial banners, and paywall modals. The `useHideBillingUI()` hook
provides a single check.

**Rationale:** The demo account exists to showcase Pro-level features
without friction. Showing billing prompts to a demo user creates confusion
and undermines the demo experience. The backend sets `plan = 'demo'` for
the demo user, and all billing guards treat `'demo'` as equivalent to
`'team'` (highest tier).

### 9. Session-scoped paywall dismissal tracking

**Decision:** Track dismissed paywall features in a `Set<Feature>` on the
billing store (in-memory, cleared on page reload). After a user dismisses
a paywall modal for a specific feature, subsequent attempts show a toast
instead of the full modal.

**Rationale:** Showing the same modal repeatedly for the same feature in
one session feels nagging and hostile. A brief toast serves as a reminder
without blocking workflow. The Set resets on reload, so the user sees the
full modal again in their next session (reasonable re-engagement cadence).

### 10. TanStack Query for server state, Zustand for derived state

**Decision:** Server fetches (subscription, plans, invoices) go through
TanStack Query. Derived/computed state (canAccess, isOverQuota, usage
levels) lives in the Zustand store.

**Rationale:** TanStack Query handles caching, refetching, deduplication,
and stale-while-revalidate. Zustand handles synchronous selectors that
components can subscribe to without re-render overhead. The `hydrate()`
action bridges the two: the query's `onSuccess` writes to the store,
and components read from the store. This avoids the common pitfall of
having two separate caches disagree.
