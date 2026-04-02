# Agent 08: Paywall & Billing UI Component Catalog

> Complete React component specifications for billing, gating, and upsells in Parcel.
> All components use Parcel's design system: `#08080F` bg, `#0F0F1A` surface,
> `#6366F1` indigo accent, JetBrains Mono for numbers, shadcn/ui primitives,
> Framer Motion animations, Tailwind CSS.

---

## Table of Contents

1. [Type Foundations & Zustand Store](#1-type-foundations--zustand-store)
2. [TanStack Query Hooks](#2-tanstack-query-hooks)
3. [`<PaywallOverlay>`](#3-paywalloverlay)
4. [`<UsageMeter>`](#4-usagemeter)
5. [`<TrialBanner>`](#5-trialbanner)
6. [`<PricingTable>`](#6-pricingtable)
7. [`<UpgradeButton>`](#7-upgradebutton)
8. [`<PlanBadge>`](#8-planbadge)
9. [`<BillingPage>`](#9-billingpage)
10. [`<SuccessOverlay>`](#10-successoverlay)
11. [`<LimitReachedModal>`](#11-limitreachedmodal)
12. [`<DowngradeWarning>`](#12-downgradewarning)
13. [Framer Motion Animation System](#13-framer-motion-animation-system)
14. [Page Hierarchy Integration Map](#14-page-hierarchy-integration-map)
15. [CRITICAL DECISIONS](#15-critical-decisions)

---

## 1. Type Foundations & Zustand Store

### 1.1 New Types -- `frontend/src/types/billing.ts`

```typescript
/** Billing-related types -- single source of truth for plan gating and usage tracking. */

export type Plan = 'free' | 'pro' | 'team' | 'demo'
export type PlanStatus = 'active' | 'trialing' | 'past_due' | 'canceled'
export type BillingCycle = 'monthly' | 'annual'

/** Tier hierarchy for comparison — higher index = more access. */
export const PLAN_RANK: Record<Plan, number> = {
  free: 0,
  pro: 1,
  team: 2,
  demo: 2, // demo gets team-level access, never shown billing UI
}

/** Check if a plan meets or exceeds a required tier. */
export function hasAccess(currentPlan: Plan, requiredPlan: Plan): boolean {
  return PLAN_RANK[currentPlan] >= PLAN_RANK[requiredPlan]
}

export interface UsageMetric {
  used: number
  limit: number       // -1 means unlimited
}

export interface UsageLimits {
  analyses: UsageMetric
  chat_messages: UsageMetric
  documents: UsageMetric
  pipeline_deals: UsageMetric
}

export interface BillingStatus {
  plan: Plan
  cycle: BillingCycle | null
  status: PlanStatus
  trial_ends_at: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  usage: UsageLimits
}

export interface CheckoutResponse {
  checkout_url: string
}

export interface PortalResponse {
  portal_url: string
}

export interface Invoice {
  id: string
  date: string
  description: string
  amount_cents: number
  status: 'paid' | 'open' | 'void' | 'uncollectible'
  invoice_url: string | null
}

export interface BillingHistoryResponse {
  invoices: Invoice[]
}

/** Feature names used for contextual upgrade prompts. */
export type GatedFeature =
  | 'offer_letter'
  | 'deal_sharing'
  | 'pdf_report'
  | 'pipeline_write'
  | 'portfolio'
  | 'document_upload'
  | 'unlimited_analyses'
  | 'unlimited_chat'
  | 'team_members'

/** Map features to human-readable labels and required tiers. */
export const FEATURE_META: Record<GatedFeature, { label: string; tier: Plan; description: string }> = {
  offer_letter:       { label: 'Offer Letter Generator', tier: 'pro', description: 'Generate professional offer letters from your deal analysis.' },
  deal_sharing:       { label: 'Deal Sharing',           tier: 'pro', description: 'Share deal analyses with partners and lenders via link.' },
  pdf_report:         { label: 'PDF Report Export',      tier: 'pro', description: 'Download branded multi-page PDF reports for your deals.' },
  pipeline_write:     { label: 'Pipeline Management',    tier: 'pro', description: 'Add, move, and organize deals across pipeline stages.' },
  portfolio:          { label: 'Portfolio Tracking',      tier: 'pro', description: 'Track closed deals, equity, and monthly cash flow.' },
  document_upload:    { label: 'Document AI',             tier: 'pro', description: 'Upload contracts and let AI extract key terms and risks.' },
  unlimited_analyses: { label: 'Unlimited Analyses',      tier: 'pro', description: 'Analyze as many deals as you want, every month.' },
  unlimited_chat:     { label: 'Unlimited AI Chat',       tier: 'pro', description: 'Ask the AI specialist unlimited questions about your deals.' },
  team_members:       { label: 'Team Collaboration',      tier: 'team', description: 'Invite up to 10 team members with shared pipelines.' },
}
```

### 1.2 Extend `User` Interface -- `frontend/src/types/index.ts`

Add these fields to the existing `User` interface:

```typescript
export interface User {
  id: string
  name: string
  email: string
  role: 'wholesaler' | 'investor' | 'agent'
  team_id?: string | null
  created_at: string
  // ---- NEW billing fields (returned from /auth/me) ----
  plan: 'free' | 'pro' | 'team' | 'demo'
  plan_status: 'active' | 'trialing' | 'past_due' | 'canceled' | null
  current_period_end: string | null
  trial_ends_at: string | null
}
```

The `authStore.ts` needs no structural changes -- `setAuth(data.user)` already
stores whatever the backend returns.

### 1.3 Zustand Billing Store -- `frontend/src/stores/billingStore.ts`

Separate from `authStore` because billing state is fetched on-demand, has its own
lifecycle, and includes usage data that changes within a session.

```typescript
/**
 * Zustand billing store -- subscription state + usage tracking.
 * Populated by useBillingStatus() TanStack Query hook.
 * Read by <PaywallOverlay>, <UsageMeter>, <TrialBanner>, etc.
 */

import { create } from 'zustand'
import type { Plan, PlanStatus, BillingCycle, UsageLimits } from '@/types/billing'

interface BillingState {
  // Subscription
  plan: Plan
  status: PlanStatus
  cycle: BillingCycle | null
  trialEndsAt: Date | null
  currentPeriodEnd: Date | null
  cancelAtPeriodEnd: boolean

  // Usage
  usage: UsageLimits

  // Session-scoped paywall dismissals — prevents showing same modal twice
  dismissedPaywalls: Set<string>

  // Actions
  setBilling: (data: {
    plan: Plan
    status: PlanStatus
    cycle: BillingCycle | null
    trialEndsAt: string | null
    currentPeriodEnd: string | null
    cancelAtPeriodEnd: boolean
    usage: UsageLimits
  }) => void
  dismissPaywall: (feature: string) => void
  isPaywallDismissed: (feature: string) => boolean
  incrementUsage: (metric: keyof UsageLimits) => void
}

export const useBillingStore = create<BillingState>()((set, get) => ({
  plan: 'free',
  status: 'active',
  cycle: null,
  trialEndsAt: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  usage: {
    analyses:       { used: 0, limit: 5 },
    chat_messages:  { used: 0, limit: 25 },
    documents:      { used: 0, limit: 0 },
    pipeline_deals: { used: 0, limit: 10 },
  },
  dismissedPaywalls: new Set(),

  setBilling: (data) =>
    set({
      plan: data.plan,
      status: data.status,
      cycle: data.cycle,
      trialEndsAt: data.trialEndsAt ? new Date(data.trialEndsAt) : null,
      currentPeriodEnd: data.currentPeriodEnd ? new Date(data.currentPeriodEnd) : null,
      cancelAtPeriodEnd: data.cancelAtPeriodEnd,
      usage: data.usage,
    }),

  dismissPaywall: (feature) =>
    set((state) => ({
      dismissedPaywalls: new Set(state.dismissedPaywalls).add(feature),
    })),

  isPaywallDismissed: (feature) => get().dismissedPaywalls.has(feature),

  incrementUsage: (metric) =>
    set((state) => ({
      usage: {
        ...state.usage,
        [metric]: {
          ...state.usage[metric],
          used: state.usage[metric].used + 1,
        },
      },
    })),
}))

// ---- Derived selectors ----

/** Returns the current plan. Use in components that gate features. */
export const usePlan = () => useBillingStore((s) => s.plan)

/** Returns true if the user is on a trial that has not expired. */
export const useIsTrialing = () =>
  useBillingStore((s) => s.status === 'trialing' && s.trialEndsAt !== null && s.trialEndsAt > new Date())

/** Returns days remaining in trial, or null if not trialing. */
export const useTrialDaysRemaining = () =>
  useBillingStore((s) => {
    if (s.status !== 'trialing' || !s.trialEndsAt) return null
    const diff = s.trialEndsAt.getTime() - Date.now()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  })

/** Returns true if the user is on the demo account (hide all billing UI). */
export const useIsDemo = () => useBillingStore((s) => s.plan === 'demo')
```

---

## 2. TanStack Query Hooks

### 2.1 `frontend/src/hooks/useBilling.ts`

```typescript
/**
 * TanStack Query hooks for billing API calls.
 * All billing data flows through these hooks into the billingStore.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useBillingStore } from '@/stores/billingStore'
import type { BillingStatus, CheckoutResponse, PortalResponse, BillingHistoryResponse, Plan, BillingCycle } from '@/types/billing'

// ---- Query keys ----
export const billingKeys = {
  all: ['billing'] as const,
  status: () => [...billingKeys.all, 'status'] as const,
  history: () => [...billingKeys.all, 'history'] as const,
}

// ---- Billing status (plan + usage) ----

export function useBillingStatus() {
  const setBilling = useBillingStore((s) => s.setBilling)

  return useQuery<BillingStatus>({
    queryKey: billingKeys.status(),
    queryFn: () => api.billing.getStatus(),
    staleTime: 60_000, // 1 minute -- usage can change mid-session
    refetchOnWindowFocus: true,
    onSuccess: (data) => {
      setBilling({
        plan: data.plan,
        status: data.status,
        cycle: data.cycle,
        trialEndsAt: data.trial_ends_at,
        currentPeriodEnd: data.current_period_end,
        cancelAtPeriodEnd: data.cancel_at_period_end,
        usage: data.usage,
      })
    },
  })
}

// ---- Billing history (invoices) ----

export function useBillingHistory() {
  return useQuery<BillingHistoryResponse>({
    queryKey: billingKeys.history(),
    queryFn: () => api.billing.getHistory(),
    staleTime: 5 * 60_000, // 5 minutes
  })
}

// ---- Checkout session creation ----

export function useCreateCheckout() {
  return useMutation<CheckoutResponse, Error, { plan: Plan; cycle: BillingCycle }>({
    mutationFn: ({ plan, cycle }) => api.billing.createCheckout(plan, cycle),
    onSuccess: (data) => {
      // Redirect to Stripe Checkout
      window.location.href = data.checkout_url
    },
  })
}

// ---- Stripe Customer Portal ----

export function useCreatePortal() {
  return useMutation<PortalResponse, Error, void>({
    mutationFn: () => api.billing.createPortal(),
    onSuccess: (data) => {
      window.location.href = data.portal_url
    },
  })
}

// ---- Refresh billing after checkout return ----

export function useRefreshBillingAfterCheckout() {
  const queryClient = useQueryClient()

  return {
    refresh: async () => {
      // Invalidate both billing status and user data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: billingKeys.status() }),
        queryClient.invalidateQueries({ queryKey: ['me'] }),
      ])
    },
  }
}
```

### 2.2 API Client Additions -- `frontend/src/lib/api.ts`

Add to the `api` export object:

```typescript
billing: {
  getStatus: () =>
    request<BillingStatus>('/api/v1/billing/status'),

  createCheckout: (plan: Plan, cycle: BillingCycle) =>
    request<CheckoutResponse>('/api/v1/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ plan, cycle }),
    }),

  createPortal: () =>
    request<PortalResponse>('/api/v1/billing/portal', {
      method: 'POST',
    }),

  getHistory: () =>
    request<BillingHistoryResponse>('/api/v1/billing/history'),
},
```

### 2.3 403 Handling in `request()` -- `frontend/src/lib/api.ts`

Add after the existing 401 handling block:

```typescript
// ---- Tier/quota gating (403) ----
if (res.status === 403) {
  const body = await res.json().catch(() => ({ error: 'Forbidden', code: 'UNKNOWN' }))
  if (body.code === 'TIER_REQUIRED' || body.code === 'QUOTA_EXCEEDED') {
    // Dispatch a custom event that <LimitReachedModal> listens for
    window.dispatchEvent(
      new CustomEvent('parcel:billing-gate', {
        detail: {
          code: body.code,
          required_tier: body.required_tier ?? 'pro',
          feature: body.feature ?? null,
          limit: body.limit ?? null,
          used: body.used ?? null,
        },
      })
    )
  }
  throw new Error(body.error ?? 'Access denied')
}
```

---

## 3. `<PaywallOverlay>`

**File:** `frontend/src/components/billing/PaywallOverlay.tsx`

**Purpose:** Renders children behind a blur overlay with a centered upgrade CTA.
Used for features visible in the user's workflow (portfolio charts, offer letter
preview, document AI panel) where showing the shape of the content creates desire.

### Props

```typescript
import { type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useBillingStore, usePlan } from '@/stores/billingStore'
import { hasAccess, FEATURE_META, type GatedFeature, type Plan } from '@/types/billing'
import { cn } from '@/lib/utils'

interface PaywallOverlayProps {
  /** Which gated feature this protects. */
  feature: GatedFeature
  /** Content to render (blurred for free users, clear for paid). */
  children: ReactNode
  /** Optional override: render a compact lock card instead of blur on mobile. */
  compactOnMobile?: boolean
  /** Additional class names on the outer container. */
  className?: string
}

export function PaywallOverlay({
  feature,
  children,
  compactOnMobile = false,
  className,
}: PaywallOverlayProps) {
  const plan = usePlan()
  const meta = FEATURE_META[feature]

  // Demo and paid users see content directly
  if (hasAccess(plan, meta.tier)) {
    return <>{children}</>
  }

  return (
    <div className={cn('relative overflow-hidden rounded-xl border border-border-subtle', className)}>
      {/* Locked content — rendered but non-interactive */}
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none select-none',
          // On mobile with compactOnMobile, hide the blurred content entirely
          compactOnMobile && 'hidden md:block'
        )}
      >
        {children}
      </div>

      {/* Blur overlay — desktop (and mobile when not compact) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={cn(
          'absolute inset-0 z-10 backdrop-blur-[10px] bg-app-bg/70',
          'flex items-center justify-center',
          compactOnMobile && 'hidden md:flex'
        )}
      >
        <PaywallCard feature={feature} tier={meta.tier} />
      </motion.div>

      {/* Mobile compact fallback — simple lock card replacing content */}
      {compactOnMobile && (
        <div className="md:hidden">
          <PaywallCardCompact feature={feature} tier={meta.tier} />
        </div>
      )}
    </div>
  )
}

/** Centered CTA card shown over blurred content. */
function PaywallCard({ feature, tier }: { feature: GatedFeature; tier: Plan }) {
  const meta = FEATURE_META[feature]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1, ease: 'easeOut' }}
      className={cn(
        'bg-app-surface border border-border-default rounded-xl p-6',
        'text-center space-y-3 shadow-lg shadow-accent-primary/5',
        'max-w-[320px] w-full mx-4'
      )}
    >
      <div className="w-10 h-10 rounded-xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center mx-auto">
        <Lock size={18} className="text-accent-primary" />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-text-primary">{meta.label}</h3>
        <p className="text-xs text-text-secondary leading-relaxed">{meta.description}</p>
      </div>
      <UpgradeButton feature={feature} size="sm" className="w-full" />
      <Link
        to="/settings/billing"
        className="text-[11px] text-text-muted hover:text-text-secondary transition-colors"
      >
        Compare all plans
      </Link>
    </motion.div>
  )
}

/** Compact lock card for mobile — replaces content instead of blurring. */
function PaywallCardCompact({ feature, tier }: { feature: GatedFeature; tier: Plan }) {
  const meta = FEATURE_META[feature]

  return (
    <div className="rounded-xl border border-border-subtle bg-app-surface p-4 flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center shrink-0">
        <Lock size={14} className="text-accent-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-text-primary truncate">{meta.label}</p>
        <p className="text-[11px] text-text-muted">Requires {tier === 'team' ? 'Team' : 'Pro'}</p>
      </div>
      <UpgradeButton feature={feature} size="xs" />
    </div>
  )
}
```

### Where it appears

| Page | Feature gated | What users see blurred |
|------|---------------|----------------------|
| `ResultsPage.tsx` | `pdf_report` | PDF download button area |
| `ResultsPage.tsx` | `offer_letter` | Sample offer letter preview |
| `ResultsPage.tsx` | `deal_sharing` | Share panel with generated link |
| `Pipeline.tsx` | `pipeline_write` | Drag handles and "Add Deal" button |
| `Portfolio.tsx` | `portfolio` | Portfolio entry form and charts |
| `Documents.tsx` | `document_upload` | Upload dropzone area |

---

## 4. `<UsageMeter>`

**File:** `frontend/src/components/billing/UsageMeter.tsx`

**Purpose:** Progress bar showing consumption against a limit. Three variants:
standard (dashboard card), compact (sidebar), and inline (chat header).

### Props & Implementation

```typescript
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface UsageMeterProps {
  /** Human-readable label, e.g., "Deal Analyses" */
  label: string
  /** Current usage count */
  used: number
  /** Maximum allowed (-1 = unlimited) */
  limit: number
  /** Optional unit noun for screen readers: "analyses", "messages" */
  unit?: string
  /** Visual variant */
  variant?: 'standard' | 'compact' | 'inline'
  /** Additional class names */
  className?: string
}

export function UsageMeter({
  label,
  used,
  limit,
  unit = 'used',
  variant = 'standard',
  className,
}: UsageMeterProps) {
  const isUnlimited = limit === -1
  const percentage = isUnlimited ? 0 : Math.min((used / limit) * 100, 100)
  const remaining = isUnlimited ? null : Math.max(limit - used, 0)

  // Threshold-based color
  const barColor = isUnlimited
    ? 'bg-accent-primary/30'
    : percentage >= 90
      ? 'bg-accent-danger'
      : percentage >= 70
        ? 'bg-accent-warning'
        : 'bg-accent-primary'

  const shouldPulse = !isUnlimited && percentage >= 90

  if (variant === 'compact') {
    return <UsageMeterCompact label={label} used={used} limit={limit} percentage={percentage} barColor={barColor} className={className} />
  }

  if (variant === 'inline') {
    return <UsageMeterInline label={label} used={used} limit={limit} isUnlimited={isUnlimited} className={className} />
  }

  // ---- Standard variant ----
  return (
    <div className={cn('space-y-2', className)} role="meter" aria-label={label} aria-valuenow={used} aria-valuemin={0} aria-valuemax={limit === -1 ? undefined : limit}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-text-secondary">{label}</span>
        <span className="text-xs font-mono text-text-primary">
          {isUnlimited ? (
            <span className="text-accent-primary">Unlimited</span>
          ) : (
            <>
              {used}
              <span className="text-text-muted"> / {limit}</span>
            </>
          )}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full rounded-full bg-app-elevated overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full', barColor, shouldPulse && 'animate-pulse')}
          initial={{ width: 0 }}
          animate={{ width: isUnlimited ? '100%' : `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>

      {/* Remaining subtext */}
      {!isUnlimited && remaining !== null && (
        <p className="text-[11px] text-text-muted">
          {remaining === 0
            ? 'Limit reached'
            : `${remaining} ${unit} remaining`}
        </p>
      )}
    </div>
  )
}

/** Compact variant — circular ring for sidebar footer. */
function UsageMeterCompact({
  label,
  used,
  limit,
  percentage,
  barColor,
  className,
}: {
  label: string
  used: number
  limit: number
  percentage: number
  barColor: string
  className?: string
}) {
  const radius = 11
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  // Map Tailwind bar color class to an SVG stroke color
  const strokeColor =
    percentage >= 90
      ? '#EF4444' // accent-danger
      : percentage >= 70
        ? '#F59E0B' // accent-warning
        : '#6366F1' // accent-primary

  return (
    <div className={cn('flex items-center gap-2', className)} title={`${label}: ${used} of ${limit}`}>
      <svg width="28" height="28" viewBox="0 0 28 28" className="shrink-0 -rotate-90">
        {/* Background ring */}
        <circle cx="14" cy="14" r={radius} fill="none" stroke="currentColor" strokeWidth="3" className="text-app-elevated" />
        {/* Progress ring */}
        <circle
          cx="14"
          cy="14"
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
        />
      </svg>
      <div className="min-w-0">
        <p className="text-[10px] text-text-muted truncate">{label}</p>
        <p className="text-[11px] font-mono text-text-secondary">
          {used}<span className="text-text-muted">/{limit}</span>
        </p>
      </div>
    </div>
  )
}

/** Inline variant — single-line text for chat header and similar tight spaces. */
function UsageMeterInline({
  label,
  used,
  limit,
  isUnlimited,
  className,
}: {
  label: string
  used: number
  limit: number
  isUnlimited: boolean
  className?: string
}) {
  const percentage = isUnlimited ? 0 : (used / limit) * 100
  const textColor =
    isUnlimited
      ? 'text-text-muted'
      : percentage >= 90
        ? 'text-accent-danger'
        : percentage >= 70
          ? 'text-accent-warning'
          : 'text-text-muted'

  return (
    <span className={cn('text-[11px] font-mono', textColor, className)}>
      {isUnlimited ? 'Unlimited' : `${used}/${limit} ${label.toLowerCase()}`}
    </span>
  )
}
```

### Dashboard Usage Card

Embed multiple `<UsageMeter>` instances inside a card on the dashboard:

```typescript
/** Renders inside Dashboard.tsx alongside KPICards. */
function UsageCard() {
  const { usage, plan } = useBillingStore()
  const isDemo = useIsDemo()

  if (isDemo) return null // Never show billing UI for demo user

  return (
    <div className="rounded-xl border border-border-subtle bg-app-surface p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-text-secondary uppercase tracking-[0.08em]">
          Usage This Month
        </p>
        <PlanBadge />
      </div>
      <UsageMeter label="Deal Analyses" used={usage.analyses.used} limit={usage.analyses.limit} unit="analyses" />
      <UsageMeter label="AI Messages" used={usage.chat_messages.used} limit={usage.chat_messages.limit} unit="messages" />
      <UsageMeter label="Pipeline Deals" used={usage.pipeline_deals.used} limit={usage.pipeline_deals.limit} unit="deals" />
      {plan === 'pro' || plan === 'team' ? (
        <UsageMeter label="Documents" used={usage.documents.used} limit={usage.documents.limit} unit="uploads" />
      ) : null}
    </div>
  )
}
```

---

## 5. `<TrialBanner>`

**File:** `frontend/src/components/billing/TrialBanner.tsx`

**Purpose:** Countdown banner rendered between `<Topbar>` and `<main>` in
`AppShell.tsx`. Four urgency levels based on days remaining.

### Props & Implementation

```typescript
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, AlertTriangle, XCircle, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useTrialDaysRemaining, useIsDemo, useBillingStore } from '@/stores/billingStore'
import { cn } from '@/lib/utils'

type BannerVariant = 'info' | 'warning' | 'urgent' | 'expired'

function getVariant(daysRemaining: number | null): BannerVariant | null {
  if (daysRemaining === null) return null
  if (daysRemaining <= 0) return 'expired'
  if (daysRemaining <= 1) return 'urgent'
  if (daysRemaining <= 3) return 'warning'
  if (daysRemaining <= 7) return 'info'
  return null // > 7 days: no banner
}

const VARIANT_STYLES: Record<BannerVariant, {
  bg: string
  border: string
  iconColor: string
  Icon: typeof Clock
  dismissible: boolean
}> = {
  info: {
    bg: 'bg-blue-500/10',
    border: 'border-b border-blue-500/20',
    iconColor: 'text-blue-400',
    Icon: Clock,
    dismissible: true,
  },
  warning: {
    bg: 'bg-amber-500/10',
    border: 'border-b border-amber-500/20',
    iconColor: 'text-amber-400',
    Icon: AlertTriangle,
    dismissible: false,
  },
  urgent: {
    bg: 'bg-red-500/10',
    border: 'border-b border-red-500/20',
    iconColor: 'text-red-400',
    Icon: AlertTriangle,
    dismissible: false,
  },
  expired: {
    bg: 'bg-red-500/15',
    border: 'border-b border-red-500/30',
    iconColor: 'text-red-400',
    Icon: XCircle,
    dismissible: false,
  },
}

export function TrialBanner() {
  const daysRemaining = useTrialDaysRemaining()
  const isDemo = useIsDemo()
  const status = useBillingStore((s) => s.status)
  const [dismissed, setDismissed] = useState(false)

  // Reset dismissal on variant change
  useEffect(() => { setDismissed(false) }, [daysRemaining])

  // Don't show for demo users, non-trialing users, or > 7 days remaining
  const variant = getVariant(daysRemaining)
  if (isDemo || status !== 'trialing' || !variant) return null
  if (dismissed && variant === 'info') return null

  const styles = VARIANT_STYLES[variant]
  const IconComp = styles.Icon

  const message = getMessage(variant, daysRemaining ?? 0)

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className={cn(styles.bg, styles.border)}
      >
        <div className="h-10 px-4 md:px-6 flex items-center justify-between gap-3">
          {/* Left: icon + message */}
          <div className="flex items-center gap-2 min-w-0">
            <IconComp size={14} className={cn(styles.iconColor, 'shrink-0')} />
            <p className="text-xs text-text-primary truncate">{message}</p>
          </div>

          {/* Right: CTA + optional dismiss */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Live countdown for urgent variant */}
            {variant === 'urgent' && <LiveCountdown />}

            <Link to="/settings/billing">
              <Button
                size="sm"
                variant={variant === 'expired' ? 'default' : 'outline'}
                className={cn(
                  'h-7 text-xs px-3',
                  variant === 'expired' && 'bg-accent-primary hover:bg-accent-primary/90'
                )}
              >
                Upgrade to Pro
              </Button>
            </Link>

            {styles.dismissible && (
              <button
                onClick={() => setDismissed(true)}
                className="w-6 h-6 flex items-center justify-center rounded text-text-muted hover:text-text-primary transition-colors"
                aria-label="Dismiss banner"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

function getMessage(variant: BannerVariant, days: number): string {
  switch (variant) {
    case 'info':
      return `Your Pro trial ends in ${days} day${days !== 1 ? 's' : ''}. Upgrade to keep all features.`
    case 'warning':
      return `Pro trial ends in ${days} day${days !== 1 ? 's' : ''} \u2014 your analyses and uploads will be limited.`
    case 'urgent':
      return 'Pro trial ends today. Upgrade now to avoid losing access.'
    case 'expired':
      return "Your Pro trial has ended. You\u2019re now on the Free plan."
  }
}

/** Live HH:MM:SS countdown for the urgent (last day) variant. */
function LiveCountdown() {
  const trialEndsAt = useBillingStore((s) => s.trialEndsAt)
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    if (!trialEndsAt) return
    const tick = () => {
      const diff = Math.max(0, trialEndsAt.getTime() - Date.now())
      const h = Math.floor(diff / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      const s = Math.floor((diff % 60_000) / 1_000)
      setTimeLeft(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [trialEndsAt])

  return (
    <span className="text-xs font-mono text-red-400 tabular-nums">{timeLeft}</span>
  )
}
```

### Placement in AppShell

In `AppShell.tsx`, insert between `<Topbar />` and `<main>`:

```typescript
import { TrialBanner } from '@/components/billing/TrialBanner'

// Inside the AppShell return, after <Topbar> and before <main>:
<Topbar title={title} onMenuToggle={...} onSearchClick={...} />
<TrialBanner />
<main ref={mainRef} id="main-content" ... >
```

### Mobile Behavior

On viewports below `md`, the banner renders at the same position (below topbar).
The height remains `h-10` so it does not consume excessive space. The message
text truncates with `truncate` and the CTA button uses the compact `h-7` size.

---

## 6. `<PricingTable>`

**File:** `frontend/src/components/billing/PricingTable.tsx`

**Purpose:** In-app plan comparison grid with monthly/annual toggle. Used on
`/settings/billing` and potentially a dedicated `/pricing` route. Distinct from
the landing page pricing section -- this version knows the user's current plan.

### Props & Implementation

```typescript
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePlan, useBillingStore } from '@/stores/billingStore'
import { useCreateCheckout } from '@/hooks/useBilling'
import { hasAccess, type Plan, type BillingCycle } from '@/types/billing'
import { cn } from '@/lib/utils'

interface PricingTier {
  plan: Plan
  name: string
  tagline: string
  monthlyPrice: number    // in dollars, 0 = free
  annualPrice: number     // monthly equivalent when billed annually
  badge: string | null     // "Most popular", "Best value", null
  features: string[]
  highlighted: boolean
}

const TIERS: PricingTier[] = [
  {
    plan: 'free',
    name: 'Free',
    tagline: 'Explore the platform',
    monthlyPrice: 0,
    annualPrice: 0,
    badge: null,
    features: [
      '5 deal analyses / month',
      '25 AI chat messages / month',
      '10 pipeline deals',
      'Basic comparison (2 dimensions)',
      'Community support',
    ],
    highlighted: false,
  },
  {
    plan: 'pro',
    name: 'Pro',
    tagline: 'For active investors',
    monthlyPrice: 29,
    annualPrice: 23,
    badge: 'Most popular',
    features: [
      'Unlimited deal analyses',
      'Unlimited AI chat',
      'Unlimited pipeline deals',
      '10 document uploads / month',
      'PDF report exports',
      'Offer letter generator',
      'Deal sharing links',
      'Full portfolio tracking',
      'All comparison dimensions',
      'Priority support',
    ],
    highlighted: true,
  },
  {
    plan: 'team',
    name: 'Team',
    tagline: 'For teams & brokerages',
    monthlyPrice: 99,
    annualPrice: 79,
    badge: null,
    features: [
      'Everything in Pro',
      'Up to 10 team members',
      'Shared pipeline & deals',
      'Role-based access control',
      'Unlimited document uploads',
      'Team analytics dashboard',
      'Dedicated support',
    ],
    highlighted: false,
  },
]

export function PricingTable() {
  const [cycle, setCycle] = useState<BillingCycle>('monthly')
  const currentPlan = usePlan()
  const checkout = useCreateCheckout()

  const annualSavings = Math.round((1 - 23 / 29) * 100) // ~20%

  return (
    <div className="space-y-6">
      {/* Billing cycle toggle */}
      <div className="flex items-center justify-center gap-2">
        <BillingCycleToggle cycle={cycle} onChange={setCycle} savingsPercent={annualSavings} />
      </div>

      {/* Tier cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TIERS.map((tier) => (
          <PricingCard
            key={tier.plan}
            tier={tier}
            cycle={cycle}
            isCurrentPlan={currentPlan === tier.plan}
            isDowngrade={hasAccess(currentPlan, tier.plan) && currentPlan !== tier.plan}
            onSelect={() => {
              if (tier.plan === 'free' || tier.plan === currentPlan) return
              checkout.mutate({ plan: tier.plan, cycle })
            }}
            isLoading={checkout.isPending}
          />
        ))}
      </div>
    </div>
  )
}

function BillingCycleToggle({
  cycle,
  onChange,
  savingsPercent,
}: {
  cycle: BillingCycle
  onChange: (c: BillingCycle) => void
  savingsPercent: number
}) {
  return (
    <div className="inline-flex items-center rounded-lg border border-border-subtle bg-app-surface p-1">
      <button
        onClick={() => onChange('monthly')}
        className={cn(
          'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
          cycle === 'monthly'
            ? 'bg-app-elevated text-text-primary'
            : 'text-text-muted hover:text-text-secondary'
        )}
      >
        Monthly
      </button>
      <button
        onClick={() => onChange('annual')}
        className={cn(
          'px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5',
          cycle === 'annual'
            ? 'bg-app-elevated text-text-primary'
            : 'text-text-muted hover:text-text-secondary'
        )}
      >
        Annual
        <span className="bg-accent-success/20 text-accent-success text-[10px] uppercase tracking-[0.04em] font-bold px-1.5 py-0.5 rounded">
          Save {savingsPercent}%
        </span>
      </button>
    </div>
  )
}

function PricingCard({
  tier,
  cycle,
  isCurrentPlan,
  isDowngrade,
  onSelect,
  isLoading,
}: {
  tier: PricingTier
  cycle: BillingCycle
  isCurrentPlan: boolean
  isDowngrade: boolean
  onSelect: () => void
  isLoading: boolean
}) {
  const price = cycle === 'annual' ? tier.annualPrice : tier.monthlyPrice

  return (
    <div
      className={cn(
        'relative rounded-xl border p-6 space-y-5 overflow-hidden',
        tier.highlighted
          ? 'border-accent-primary/30 bg-app-surface'
          : 'border-border-subtle bg-app-surface',
      )}
    >
      {/* Ambient glow for highlighted tier */}
      {tier.highlighted && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-32 h-16 rounded-full bg-accent-primary/15 blur-[20px] pointer-events-none" />
      )}

      {/* Badge */}
      {(tier.badge || isCurrentPlan) && (
        <div className="flex items-center gap-2">
          {isCurrentPlan && (
            <span className="inline-flex px-2 py-0.5 rounded text-[10px] uppercase tracking-[0.08em] font-bold bg-accent-success/20 text-accent-success">
              Current plan
            </span>
          )}
          {tier.badge && !isCurrentPlan && (
            <span className="inline-flex px-2 py-0.5 rounded text-[10px] uppercase tracking-[0.08em] font-bold bg-accent-primary/20 text-accent-primary">
              {tier.badge}
            </span>
          )}
        </div>
      )}

      {/* Plan name + tagline */}
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-text-primary">{tier.name}</h3>
        <p className="text-xs text-text-secondary">{tier.tagline}</p>
      </div>

      {/* Price */}
      <div className="flex items-baseline gap-1">
        <AnimatePresence mode="wait">
          <motion.span
            key={`${tier.plan}-${cycle}`}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="text-4xl font-bold font-mono text-text-primary"
          >
            {price === 0 ? '$0' : `$${price}`}
          </motion.span>
        </AnimatePresence>
        <span className="text-xs text-text-muted">
          {price === 0 ? '/forever' : cycle === 'annual' ? '/mo, billed annually' : '/month'}
        </span>
      </div>

      {/* CTA button */}
      {isCurrentPlan ? (
        <Button variant="outline" size="sm" disabled className="w-full">
          Current plan
        </Button>
      ) : isDowngrade ? (
        <Button variant="outline" size="sm" onClick={onSelect} className="w-full">
          Switch to {tier.name}
        </Button>
      ) : tier.plan === 'free' ? (
        <Button variant="outline" size="sm" disabled className="w-full text-text-muted">
          Free forever
        </Button>
      ) : (
        <Button
          size="sm"
          onClick={onSelect}
          disabled={isLoading}
          className="w-full bg-accent-primary hover:bg-accent-primary/90"
        >
          {isLoading ? 'Redirecting...' : `Upgrade to ${tier.name}`}
        </Button>
      )}

      {/* Feature list */}
      <ul className="space-y-2">
        {tier.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-xs text-text-secondary">
            <Check size={14} className="text-accent-primary shrink-0 mt-0.5" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

### Feature Comparison Grid

Below the pricing cards, render a full comparison table:

```typescript
/** Optional: detailed feature comparison table below pricing cards. */
function FeatureComparisonGrid({ cycle }: { cycle: BillingCycle }) {
  // Uses the same sticky-left-column pattern as frontend/src/pages/compare/comparison-table.tsx
  // Rows = features, Columns = Free | Pro | Team
  // Values: check marks, numbers (font-mono), or "Unlimited"
  // Implementation mirrors the existing comparison-table.tsx pattern
}
```

---

## 7. `<UpgradeButton>`

**File:** `frontend/src/components/billing/UpgradeButton.tsx`

**Purpose:** Contextual CTA button that knows which feature triggered it. Used
inside `<PaywallOverlay>`, `<LimitReachedModal>`, sidebar, and standalone.
Tracks the `feature` param for analytics attribution.

### Props & Implementation

```typescript
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FEATURE_META, type GatedFeature } from '@/types/billing'
import { cn } from '@/lib/utils'

interface UpgradeButtonProps {
  /** Which feature triggered this button — used for analytics and routing. */
  feature: GatedFeature
  /** Button size variant. */
  size?: 'xs' | 'sm' | 'default'
  /** Override the default label text. */
  label?: string
  /** Show a sparkle icon. */
  showIcon?: boolean
  /** Additional class names. */
  className?: string
}

export function UpgradeButton({
  feature,
  size = 'default',
  label,
  showIcon = false,
  className,
}: UpgradeButtonProps) {
  const navigate = useNavigate()
  const meta = FEATURE_META[feature]
  const tierLabel = meta.tier === 'team' ? 'Team' : 'Pro'
  const buttonLabel = label ?? `Upgrade to ${tierLabel}`

  const handleClick = () => {
    // Navigate to billing page with feature context for attribution
    navigate(`/settings/billing?feature=${feature}`)
  }

  if (size === 'xs') {
    return (
      <button
        onClick={handleClick}
        className={cn(
          'inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium',
          'bg-accent-primary text-white hover:bg-accent-primary/90 transition-colors',
          className
        )}
      >
        Upgrade
        <ArrowRight size={10} />
      </button>
    )
  }

  return (
    <Button
      size={size === 'sm' ? 'sm' : 'default'}
      onClick={handleClick}
      className={cn(
        'bg-accent-primary hover:bg-accent-primary/90',
        size === 'sm' && 'h-8 text-xs',
        className,
      )}
    >
      {showIcon && <Sparkles size={14} className="mr-1.5" />}
      {buttonLabel}
      <ArrowRight size={14} className="ml-1.5" />
    </Button>
  )
}
```

### Usage Examples

```tsx
// In PaywallOverlay card:
<UpgradeButton feature="pdf_report" size="sm" className="w-full" />

// In sidebar footer (compact):
<UpgradeButton feature="unlimited_analyses" size="xs" />

// In LimitReachedModal (prominent):
<UpgradeButton feature="unlimited_analyses" showIcon />

// Standalone on ResultsPage:
<UpgradeButton feature="offer_letter" label="Unlock Offer Letters" showIcon />
```

---

## 8. `<PlanBadge>`

**File:** `frontend/src/components/billing/PlanBadge.tsx`

**Purpose:** Compact badge showing the user's current plan. Appears in the
sidebar footer, user menu, settings, and topbar. Clickable -- navigates to
`/settings/billing`.

### Props & Implementation

```typescript
import { Link } from 'react-router-dom'
import { Crown, Zap, Users } from 'lucide-react'
import { usePlan, useIsTrialing, useTrialDaysRemaining, useIsDemo } from '@/stores/billingStore'
import { cn } from '@/lib/utils'
import type { Plan } from '@/types/billing'

interface PlanBadgeProps {
  /** Show the "X days left" trial countdown. */
  showTrialDays?: boolean
  /** Render as a non-interactive element (no link). */
  static?: boolean
  className?: string
}

const PLAN_CONFIG: Record<Plan, {
  label: string
  bg: string
  text: string
  Icon: typeof Crown
}> = {
  free: {
    label: 'Free',
    bg: 'bg-app-elevated',
    text: 'text-text-muted',
    Icon: Zap,
  },
  pro: {
    label: 'Pro',
    bg: 'bg-accent-primary/15',
    text: 'text-accent-primary',
    Icon: Crown,
  },
  team: {
    label: 'Team',
    bg: 'bg-violet-500/15',
    text: 'text-violet-400',
    Icon: Users,
  },
  demo: {
    label: 'Demo',
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    Icon: Zap,
  },
}

export function PlanBadge({ showTrialDays = false, static: isStatic = false, className }: PlanBadgeProps) {
  const plan = usePlan()
  const isTrialing = useIsTrialing()
  const daysRemaining = useTrialDaysRemaining()
  const isDemo = useIsDemo()

  if (isDemo) return null // Never show billing badge for demo

  const config = PLAN_CONFIG[plan]

  const content = (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] uppercase tracking-[0.08em] font-bold',
        config.bg,
        config.text,
        !isStatic && 'hover:opacity-80 transition-opacity cursor-pointer',
        className,
      )}
    >
      <config.Icon size={10} />
      {isTrialing ? 'Pro Trial' : config.label}
      {showTrialDays && isTrialing && daysRemaining !== null && (
        <span className="font-mono text-[9px] opacity-70">{daysRemaining}d</span>
      )}
    </span>
  )

  if (isStatic) return content

  return <Link to="/settings/billing">{content}</Link>
}
```

### Where it appears

1. **Sidebar footer** -- Below the nav groups in `Sidebar` component (`AppShell.tsx`).
   Insert before the closing `</nav>` tag with `showTrialDays={true}`.

2. **User menu popover** -- In `UserMenu` (`AppShell.tsx`), below the user's name/email
   and above the Logout button.

3. **Settings page** -- Next to the user's name in the profile section.

4. **Topbar** (mobile) -- Visible on small screens inside the header area next to
   the user avatar.

---

## 9. `<BillingPage>`

**File:** `frontend/src/pages/settings/BillingPage.tsx`

**Route:** `/settings/billing`

**Purpose:** Central hub for plan management, usage overview, payment method
(via Stripe Portal), and billing history.

### Component Structure

```typescript
import { useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CreditCard, ExternalLink, AlertTriangle } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { PricingTable } from '@/components/billing/PricingTable'
import { UsageMeter } from '@/components/billing/UsageMeter'
import { PlanBadge } from '@/components/billing/PlanBadge'
import { SuccessOverlay } from '@/components/billing/SuccessOverlay'
import { DowngradeWarning } from '@/components/billing/DowngradeWarning'
import { useBillingStatus, useBillingHistory, useCreatePortal, useRefreshBillingAfterCheckout } from '@/hooks/useBilling'
import { useBillingStore, useIsDemo } from '@/stores/billingStore'
import { staggerContainer, staggerItem } from '@/lib/motion'
import { cn } from '@/lib/utils'

export default function BillingPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const showSuccess = searchParams.get('upgrade') === 'success'
  const { data: billingData, isLoading } = useBillingStatus()
  const { refresh } = useRefreshBillingAfterCheckout()
  const isDemo = useIsDemo()

  // Refresh billing data when returning from Stripe checkout
  useEffect(() => {
    if (showSuccess) {
      void refresh()
    }
  }, [showSuccess, refresh])

  if (isDemo) {
    return (
      <AppShell title="Billing">
        <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
          <p className="text-sm text-text-secondary">
            Billing is not available for the demo account.
          </p>
          <Link to="/dashboard" className="text-sm text-accent-primary hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Billing">
      {/* Success overlay (shown after checkout return) */}
      {showSuccess && (
        <SuccessOverlay
          plan={searchParams.get('plan') ?? 'pro'}
          onDismiss={() => {
            searchParams.delete('upgrade')
            searchParams.delete('plan')
            setSearchParams(searchParams, { replace: true })
          }}
        />
      )}

      <motion.div
        variants={staggerContainer()}
        initial="hidden"
        animate="visible"
        className="max-w-4xl mx-auto space-y-8"
      >
        {/* Section 1: Current Plan */}
        <motion.div variants={staggerItem}>
          <CurrentPlanCard />
        </motion.div>

        {/* Section 2: Usage */}
        <motion.div variants={staggerItem}>
          <UsageSection />
        </motion.div>

        {/* Section 3: Plans */}
        <motion.div variants={staggerItem} className="space-y-3">
          <h2 className="text-sm font-semibold text-text-primary">Plans</h2>
          <PricingTable />
        </motion.div>

        {/* Section 4: Payment Method */}
        <motion.div variants={staggerItem}>
          <PaymentSection />
        </motion.div>

        {/* Section 5: Billing History */}
        <motion.div variants={staggerItem}>
          <BillingHistorySection />
        </motion.div>

        {/* Section 6: Danger Zone */}
        <motion.div variants={staggerItem}>
          <DangerZone />
        </motion.div>
      </motion.div>
    </AppShell>
  )
}
```

### Sub-Components

#### CurrentPlanCard

```typescript
function CurrentPlanCard() {
  const { plan, status, cycle, currentPeriodEnd, cancelAtPeriodEnd } = useBillingStore()

  const statusBadge = {
    active:    { bg: 'bg-accent-success/20', text: 'text-accent-success', label: 'Active' },
    trialing:  { bg: 'bg-blue-500/20',       text: 'text-blue-400',       label: 'Trial' },
    past_due:  { bg: 'bg-red-500/20',        text: 'text-red-400',        label: 'Past due' },
    canceled:  { bg: 'bg-text-muted/20',      text: 'text-text-muted',     label: 'Canceled' },
  }[status]

  return (
    <div className="relative rounded-xl border border-border-subtle bg-app-surface p-6 space-y-4 overflow-hidden">
      {/* Ambient glow for paid plans */}
      {plan !== 'free' && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-32 h-16 rounded-full bg-accent-primary/15 blur-[20px] pointer-events-none" />
      )}

      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-text-primary capitalize">{plan} Plan</h2>
            <span className={cn('inline-flex px-2 py-0.5 rounded text-[10px] uppercase tracking-[0.08em] font-bold', statusBadge.bg, statusBadge.text)}>
              {statusBadge.label}
            </span>
          </div>
          {cycle && currentPeriodEnd && (
            <p className="text-xs text-text-muted">
              Billed {cycle} &middot; {cancelAtPeriodEnd ? 'Cancels' : 'Renews'}{' '}
              {new Date(currentPeriodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          )}
        </div>
        <PlanBadge static className="text-xs" />
      </div>
    </div>
  )
}
```

#### UsageSection

```typescript
function UsageSection() {
  const { usage } = useBillingStore()
  const { currentPeriodEnd } = useBillingStore()

  return (
    <div className="rounded-xl border border-border-subtle bg-app-surface p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">Usage This Period</h2>
        {currentPeriodEnd && (
          <span className="text-[11px] text-text-muted">
            Resets {new Date(currentPeriodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UsageMeter label="Deal Analyses" used={usage.analyses.used} limit={usage.analyses.limit} unit="remaining" />
        <UsageMeter label="AI Chat Messages" used={usage.chat_messages.used} limit={usage.chat_messages.limit} unit="remaining" />
        <UsageMeter label="Pipeline Deals" used={usage.pipeline_deals.used} limit={usage.pipeline_deals.limit} unit="remaining" />
        <UsageMeter label="Document Uploads" used={usage.documents.used} limit={usage.documents.limit} unit="remaining" />
      </div>
    </div>
  )
}
```

#### PaymentSection

```typescript
function PaymentSection() {
  const plan = usePlan()
  const portal = useCreatePortal()

  if (plan === 'free') return null

  return (
    <div className="rounded-xl border border-border-subtle bg-app-surface p-6 space-y-4">
      <h2 className="text-sm font-semibold text-text-primary">Payment Method</h2>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-7 rounded bg-app-elevated border border-border-subtle flex items-center justify-center">
            <CreditCard size={16} className="text-text-muted" />
          </div>
          <span className="text-sm text-text-secondary">
            Managed by Stripe
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => portal.mutate()}
          disabled={portal.isPending}
          className="text-xs"
        >
          {portal.isPending ? 'Opening...' : 'Manage'}
          <ExternalLink size={12} className="ml-1.5" />
        </Button>
      </div>
    </div>
  )
}
```

#### BillingHistorySection

```typescript
function BillingHistorySection() {
  const plan = usePlan()
  const { data, isLoading } = useBillingHistory()

  if (plan === 'free') return null

  return (
    <div className="rounded-xl border border-border-subtle bg-app-surface p-6 space-y-4">
      <h2 className="text-sm font-semibold text-text-primary">Billing History</h2>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 rounded-lg bg-app-elevated animate-pulse" />
          ))}
        </div>
      ) : !data?.invoices.length ? (
        <p className="text-xs text-text-muted py-4 text-center">No invoices yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="pb-2 text-[11px] uppercase tracking-[0.08em] text-text-muted font-medium">Date</th>
                <th className="pb-2 text-[11px] uppercase tracking-[0.08em] text-text-muted font-medium">Description</th>
                <th className="pb-2 text-[11px] uppercase tracking-[0.08em] text-text-muted font-medium text-right">Amount</th>
                <th className="pb-2 text-[11px] uppercase tracking-[0.08em] text-text-muted font-medium text-right">Status</th>
                <th className="pb-2 text-[11px] uppercase tracking-[0.08em] text-text-muted font-medium text-right">Invoice</th>
              </tr>
            </thead>
            <tbody>
              {data.invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-border-subtle/50 last:border-0">
                  <td className="py-3 text-xs text-text-secondary">
                    {new Date(inv.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="py-3 text-xs text-text-primary">{inv.description}</td>
                  <td className="py-3 text-xs font-mono text-text-primary text-right">
                    ${(inv.amount_cents / 100).toFixed(2)}
                  </td>
                  <td className="py-3 text-right">
                    <span className={cn(
                      'inline-flex px-1.5 py-0.5 rounded text-[10px] uppercase tracking-[0.04em] font-medium',
                      inv.status === 'paid' ? 'bg-accent-success/20 text-accent-success' : 'bg-accent-warning/20 text-accent-warning'
                    )}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    {inv.invoice_url && (
                      <a
                        href={inv.invoice_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-accent-primary hover:underline"
                      >
                        View
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

#### DangerZone

```typescript
function DangerZone() {
  const plan = usePlan()
  const [showDowngrade, setShowDowngrade] = useState(false)

  if (plan === 'free') return null

  return (
    <>
      <div className="rounded-xl border border-red-500/20 bg-app-surface p-6 space-y-3">
        <h2 className="text-sm font-semibold text-red-400">Cancel Subscription</h2>
        <p className="text-xs text-text-secondary">
          Your plan will remain active until the end of your current billing period.
          After that, you will be moved to the Free plan.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDowngrade(true)}
          className="text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
        >
          Cancel subscription
        </Button>
      </div>

      <DowngradeWarning
        open={showDowngrade}
        onOpenChange={setShowDowngrade}
      />
    </>
  )
}
```

---

## 10. `<SuccessOverlay>`

**File:** `frontend/src/components/billing/SuccessOverlay.tsx`

**Purpose:** Full-screen celebration overlay after successful Stripe checkout.
Shows animated checkmark, confetti, list of unlocked features, and a contextual
next-action CTA.

### Props & Implementation

```typescript
import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, FileText, MessageSquare, Share2, Sparkles, Columns } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import type { Plan } from '@/types/billing'

interface SuccessOverlayProps {
  plan: string
  onDismiss: () => void
}

const PRO_FEATURES = [
  { icon: Sparkles,      label: 'Unlimited deal analyses' },
  { icon: MessageSquare, label: 'Unlimited AI chat' },
  { icon: FileText,      label: 'PDF report exports' },
  { icon: Share2,        label: 'Deal sharing & offer letters' },
  { icon: Columns,       label: 'Full pipeline management' },
]

export function SuccessOverlay({ plan, onDismiss }: SuccessOverlayProps) {
  const navigate = useNavigate()
  const hasConfettied = useRef(false)

  // Fire confetti on mount (lazy-loaded to avoid bundle bloat)
  useEffect(() => {
    if (hasConfettied.current) return
    hasConfettied.current = true

    void import('canvas-confetti').then(({ default: confetti }) => {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366F1', '#8B5CF6', '#10B981', '#F59E0B'],
      })
    })
  }, [])

  // Auto-dismiss after 8 seconds
  useEffect(() => {
    const timeout = setTimeout(onDismiss, 8000)
    return () => clearTimeout(timeout)
  }, [onDismiss])

  const planLabel = plan === 'team' ? 'Team' : 'Pro'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 bg-app-bg/90 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onDismiss}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
        className="bg-app-surface border border-border-subtle rounded-2xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Animated checkmark */}
        <AnimatedCheckmark />

        {/* Heading */}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-text-primary">
            Welcome to {planLabel}!
          </h2>
          <p className="text-sm text-text-secondary">
            You now have access to:
          </p>
        </div>

        {/* Feature unlock list with staggered animation */}
        <div className="space-y-3 text-left">
          {PRO_FEATURES.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.1, duration: 0.3 }}
              className="flex items-center gap-3"
            >
              <div className="w-7 h-7 rounded-lg bg-accent-success/15 border border-accent-success/20 flex items-center justify-center shrink-0">
                <f.icon size={14} className="text-accent-success" />
              </div>
              <span className="text-sm text-text-primary">{f.label}</span>
            </motion.div>
          ))}
        </div>

        {/* CTAs */}
        <div className="space-y-2 pt-2">
          <Button
            className="w-full bg-accent-primary hover:bg-accent-primary/90"
            onClick={() => {
              onDismiss()
              navigate('/analyze')
            }}
          >
            Analyze a Deal
          </Button>
          <button
            onClick={onDismiss}
            className="text-xs text-text-muted hover:text-text-secondary transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/** SVG checkmark with draw-on animation. */
function AnimatedCheckmark() {
  return (
    <div className="w-16 h-16 rounded-full bg-accent-success/15 border-2 border-accent-success/30 flex items-center justify-center mx-auto">
      <motion.svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#10B981"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <motion.path
          d="M5 13l4 4L19 7"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3, ease: 'easeOut' }}
        />
      </motion.svg>
    </div>
  )
}
```

### Dependency Note

`canvas-confetti` is dynamically imported via `import()` to avoid adding it to
the main bundle. It is ~3KB gzipped and has zero dependencies. Install:

```bash
npm install canvas-confetti
npm install -D @types/canvas-confetti
```

---

## 11. `<LimitReachedModal>`

**File:** `frontend/src/components/billing/LimitReachedModal.tsx`

**Purpose:** Modal that appears when the user hits a usage limit (e.g., 5/5
analyses). Triggered by the `parcel:billing-gate` custom event dispatched from
the API client's 403 handler, or explicitly from component code.

### Props & Implementation

```typescript
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { useBillingStore } from '@/stores/billingStore'
import { FEATURE_META, type GatedFeature } from '@/types/billing'
import { cn } from '@/lib/utils'
import { useMediaQuery } from '@/hooks/useMediaQuery'

interface LimitDetails {
  code: 'TIER_REQUIRED' | 'QUOTA_EXCEEDED'
  required_tier: string
  feature: GatedFeature | null
  limit: number | null
  used: number | null
}

/**
 * Global limit-reached modal. Mount once at the App root level.
 * Listens for 'parcel:billing-gate' custom events dispatched by the API client.
 */
export function LimitReachedModal() {
  const [open, setOpen] = useState(false)
  const [details, setDetails] = useState<LimitDetails | null>(null)
  const navigate = useNavigate()
  const dismissPaywall = useBillingStore((s) => s.dismissPaywall)
  const isPaywallDismissed = useBillingStore((s) => s.isPaywallDismissed)
  const isMobile = useMediaQuery('(max-width: 767px)')

  // Listen for billing gate events from the API client
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<LimitDetails>).detail
      // Don't show the same feature gate twice in a session
      if (detail.feature && isPaywallDismissed(detail.feature)) return
      setDetails(detail)
      setOpen(true)
    }
    window.addEventListener('parcel:billing-gate', handler)
    return () => window.removeEventListener('parcel:billing-gate', handler)
  }, [isPaywallDismissed])

  const handleDismiss = useCallback(() => {
    setOpen(false)
    if (details?.feature) {
      dismissPaywall(details.feature)
    }
  }, [details, dismissPaywall])

  const handleUpgrade = useCallback(() => {
    handleDismiss()
    navigate(`/settings/billing${details?.feature ? `?feature=${details.feature}` : ''}`)
  }, [handleDismiss, navigate, details])

  if (!details) return null

  const meta = details.feature ? FEATURE_META[details.feature] : null
  const isQuota = details.code === 'QUOTA_EXCEEDED'
  const tierLabel = details.required_tier === 'team' ? 'Team' : 'Pro'

  const content = (
    <div className="space-y-4">
      {/* Icon */}
      <div className="w-12 h-12 rounded-xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center mx-auto">
        <AlertCircle size={22} className="text-accent-primary" />
      </div>

      {/* Title + description */}
      <div className="text-center space-y-2">
        <h3 className="text-base font-semibold text-text-primary">
          {isQuota
            ? `You\u2019ve used all ${details.limit} this month`
            : meta
              ? `Unlock ${meta.label}`
              : `${tierLabel} Plan Required`}
        </h3>
        <p className="text-sm text-text-secondary leading-relaxed">
          {isQuota
            ? `Your Free plan includes ${details.limit} per month. Upgrade to Pro for unlimited access.`
            : meta
              ? meta.description
              : `This feature requires the ${tierLabel} plan.`}
        </p>
      </div>

      {/* Quota indicator (if applicable) */}
      {isQuota && details.limit !== null && details.used !== null && (
        <div className="bg-app-elevated rounded-lg p-3 text-center">
          <span className="text-2xl font-mono font-bold text-accent-danger">
            {details.used}/{details.limit}
          </span>
          <p className="text-[11px] text-text-muted mt-1">used this month</p>
        </div>
      )}

      {/* CTAs */}
      <div className="space-y-2">
        <Button
          className="w-full bg-accent-primary hover:bg-accent-primary/90"
          onClick={handleUpgrade}
        >
          Upgrade to {tierLabel}
          <ArrowRight size={14} className="ml-1.5" />
        </Button>
        <button
          onClick={handleDismiss}
          className="w-full text-center text-xs text-text-muted hover:text-text-secondary transition-colors py-1"
        >
          Maybe later
        </button>
      </div>
    </div>
  )

  // Mobile: bottom sheet. Desktop: centered dialog.
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="bg-app-surface border-border-subtle rounded-t-2xl px-6 pb-8 pt-6">
          <SheetTitle className="sr-only">Upgrade Required</SheetTitle>
          {content}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="bg-app-surface border-border-subtle max-w-sm p-6">
        <DialogHeader className="sr-only">
          <DialogTitle>Upgrade Required</DialogTitle>
          <DialogDescription>This feature requires a paid plan.</DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  )
}
```

### Where it appears

Mount **once** in `App.tsx` at the root level, outside the route tree:

```tsx
import { LimitReachedModal } from '@/components/billing/LimitReachedModal'

function App() {
  return (
    <>
      <RouterProvider router={router} />
      <LimitReachedModal />
      <Toaster />
    </>
  )
}
```

### `useMediaQuery` Hook

This component introduces a `useMediaQuery` hook. If one does not already exist
in the codebase, add it:

**File:** `frontend/src/hooks/useMediaQuery.ts`

```typescript
import { useState, useEffect } from 'react'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  )

  useEffect(() => {
    const mql = window.matchMedia(query)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    mql.addEventListener('change', handler)
    setMatches(mql.matches)
    return () => mql.removeEventListener('change', handler)
  }, [query])

  return matches
}
```

---

## 12. `<DowngradeWarning>`

**File:** `frontend/src/components/billing/DowngradeWarning.tsx`

**Purpose:** Confirmation dialog shown when the user attempts to cancel their
subscription. Displays a personalized impact summary of what they will lose.

### Props & Implementation

```typescript
import { useState } from 'react'
import { AlertTriangle, X, Check, Minus } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useBillingStore } from '@/stores/billingStore'
import { useCreatePortal } from '@/hooks/useBilling'
import { cn } from '@/lib/utils'

interface DowngradeWarningProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DowngradeWarning({ open, onOpenChange }: DowngradeWarningProps) {
  const [confirmed, setConfirmed] = useState(false)
  const { usage, plan } = useBillingStore()
  const portal = useCreatePortal()

  const handleConfirmDowngrade = () => {
    // Redirect to Stripe Customer Portal for cancellation
    // Stripe handles the "cancel at period end" logic
    portal.mutate()
    onOpenChange(false)
  }

  // Build personalized impact list
  const impacts: { label: string; type: 'lose' | 'reduce' }[] = []

  if (usage.pipeline_deals.used > 10) {
    impacts.push({
      label: `${usage.pipeline_deals.used} pipeline deals \u2192 10 limit (existing become read-only)`,
      type: 'lose',
    })
  }
  impacts.push({ label: 'Document AI uploads (locked)', type: 'lose' })
  impacts.push({ label: 'Offer letter generator (locked)', type: 'lose' })
  impacts.push({ label: 'Deal sharing links (expire in 30 days)', type: 'lose' })
  impacts.push({ label: 'PDF report exports (locked)', type: 'lose' })
  impacts.push({ label: `Analyses: unlimited \u2192 5/month`, type: 'reduce' })
  impacts.push({ label: `AI chat: unlimited \u2192 25/month`, type: 'reduce' })

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-app-surface border-border-subtle max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle size={18} className="text-amber-400" />
            </div>
            <div>
              <AlertDialogTitle className="text-base font-semibold text-text-primary">
                Downgrade to Free?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-text-secondary mt-0.5">
                Your plan stays active until the end of this billing period.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        {/* Impact list */}
        <div className="space-y-2 py-4 border-y border-border-subtle my-4">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-[0.08em]">
            What changes
          </p>
          {impacts.map((impact) => (
            <div key={impact.label} className="flex items-start gap-2">
              {impact.type === 'lose' ? (
                <X size={14} className="text-red-400 shrink-0 mt-0.5" />
              ) : (
                <Minus size={14} className="text-amber-400 shrink-0 mt-0.5" />
              )}
              <span className="text-xs text-text-secondary">{impact.label}</span>
            </div>
          ))}
        </div>

        {/* Reassurance */}
        <div className="flex items-start gap-2 text-xs text-text-muted">
          <Check size={14} className="text-accent-success shrink-0 mt-0.5" />
          <span>Your existing data is preserved. You can always upgrade again.</span>
        </div>

        {/* Confirmation checkbox */}
        <label className="flex items-start gap-2 mt-4 cursor-pointer">
          <Checkbox
            checked={confirmed}
            onCheckedChange={(c) => setConfirmed(c === true)}
            className="mt-0.5"
          />
          <span className="text-xs text-text-secondary">
            I understand some features will be locked until I upgrade again
          </span>
        </label>

        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel className="text-xs">Keep my plan</AlertDialogCancel>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleConfirmDowngrade}
            disabled={!confirmed || portal.isPending}
            className="text-xs"
          >
            {portal.isPending ? 'Redirecting...' : 'Confirm downgrade'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

---

## 13. Framer Motion Animation System

All billing components use Parcel's existing animation system from
`frontend/src/lib/motion.ts`. Here are the specific animation patterns used:

### 13.1 Paywall Reveal Animation

When a `<PaywallOverlay>` mounts over locked content:

```typescript
// Blur overlay fade-in
const paywallOverlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } },
}

// CTA card entrance (slightly delayed, scale + y)
const paywallCardVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.3, delay: 0.1, ease: 'easeOut' },
  },
}
```

### 13.2 Feature Unlock Animation

When the user upgrades and `<PaywallOverlay>` unmounts:

```typescript
// Blur overlay dissolves
const paywallExitVariants = {
  exit: {
    opacity: 0,
    backdropFilter: 'blur(0px)',
    transition: { duration: 0.4, ease: 'easeOut' },
  },
}

// Content beneath the overlay scales up subtly (reveal celebration)
const contentRevealVariants = {
  locked: { scale: 0.98, filter: 'brightness(0.7)' },
  unlocked: {
    scale: 1,
    filter: 'brightness(1)',
    transition: { duration: 0.5, ease: 'easeOut' },
  },
}
```

### 13.3 Usage Meter Bar Animation

Progress bar fills from 0 to current percentage on mount:

```typescript
// Already shown in UsageMeter component:
<motion.div
  className={cn('h-full rounded-full', barColor)}
  initial={{ width: 0 }}
  animate={{ width: `${percentage}%` }}
  transition={{ duration: 0.8, ease: 'easeOut' }}
/>
```

### 13.4 Trial Banner Enter/Exit

Smooth height animation so content below does not jump:

```typescript
// Already shown in TrialBanner component:
<motion.div
  initial={{ height: 0, opacity: 0 }}
  animate={{ height: 'auto', opacity: 1 }}
  exit={{ height: 0, opacity: 0 }}
  transition={{ duration: 0.2, ease: 'easeOut' }}
>
```

### 13.5 Success Overlay Celebration Sequence

Orchestrated entrance with staggered elements:

```typescript
// Overlay backdrop: fade in
{ initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.3 } }

// Card: scale up from 0.9 + slide up
{ initial: { opacity: 0, scale: 0.9, y: 16 }, animate: { opacity: 1, scale: 1, y: 0 }, transition: { duration: 0.4, delay: 0.1 } }

// SVG checkmark: path draw
{ initial: { pathLength: 0 }, animate: { pathLength: 1 }, transition: { duration: 0.5, delay: 0.3 } }

// Feature items: staggered slide-in from left
{ initial: { opacity: 0, x: -12 }, animate: { opacity: 1, x: 0 }, transition: { delay: 0.4 + i * 0.1 } }
```

### 13.6 Pricing Card Price Switch

When the billing cycle toggle changes, prices cross-fade with vertical slide:

```typescript
<AnimatePresence mode="wait">
  <motion.span
    key={`${plan}-${cycle}`}
    initial={{ opacity: 0, y: -8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 8 }}
    transition={{ duration: 0.2 }}
  >
    ${price}
  </motion.span>
</AnimatePresence>
```

### 13.7 LimitReachedModal Entrance

Uses the gentle spring from the motion system:

```typescript
import { SPRING } from '@/lib/motion'

// Dialog content entrance
{ initial: { opacity: 0, scale: 0.95 }, animate: { opacity: 1, scale: 1 }, transition: SPRING.gentle }
```

### 13.8 Additions to `motion.ts`

Add these billing-specific variants to the shared animation system:

```typescript
// Add to frontend/src/lib/motion.ts:

/** Paywall overlay fade -- use for blur+CTA reveal over locked content. */
export const paywallReveal: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: DURATION.normal, ease: EASING.smooth },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.4, ease: EASING.smooth },
  },
}

/** Success celebration card -- scale + slide entrance. */
export const celebrationCard: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: 16 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.4, delay: 0.1, ease: EASING.snappy },
  },
}

/** Progress bar fill -- animate width from 0 to target. */
export function progressBarFill(percentage: number): {
  initial: { width: string }
  animate: { width: string; transition: Transition }
} {
  return {
    initial: { width: '0%' },
    animate: {
      width: `${percentage}%`,
      transition: { duration: 0.8, ease: 'easeOut' },
    },
  }
}
```

---

## 14. Page Hierarchy Integration Map

This section maps every billing component to its exact location in the existing
page and component hierarchy.

### 14.1 App Root Level (`App.tsx`)

```
App.tsx
  |
  +-- <RouterProvider />
  +-- <LimitReachedModal />     <-- NEW: global modal, listens for 403 events
  +-- <Toaster />               (existing)
```

### 14.2 AppShell Layout (`components/layout/AppShell.tsx`)

```
AppShell.tsx
  |
  +-- <Sidebar />
  |     |
  |     +-- <SidebarLogo />
  |     +-- <nav>
  |     |     +-- <NavGroup label="Main" ... />
  |     |     +-- <NavGroup label="Tools" ... />
  |     |     +-- <NavGroup label="Account" ... />
  |     +-- <SidebarFooter />                <-- NEW section
  |           +-- <PlanBadge showTrialDays />   <-- NEW
  |           +-- <UsageMeter variant="compact" />  <-- NEW (most constrained resource)
  |
  +-- <MobileSidebar />
  |     (same additions as Sidebar)
  |
  +-- <Topbar />
  |     +-- <UserMenu />
  |           +-- (user name/email)
  |           +-- <PlanBadge />             <-- NEW: between email and logout
  |           +-- (logout button)
  |
  +-- <TrialBanner />                       <-- NEW: between Topbar and <main>
  +-- <main>
        (page content)
```

### 14.3 Dashboard (`pages/Dashboard.tsx`)

```
Dashboard.tsx
  |
  +-- KPI row (existing KPICards)
  +-- <UsageCard />                         <-- NEW: alongside KPI cards
  |     +-- <PlanBadge />
  |     +-- <UsageMeter label="Deal Analyses" ... />
  |     +-- <UsageMeter label="AI Messages" ... />
  |     +-- <UsageMeter label="Pipeline Deals" ... />
  |
  +-- Recent deals table (existing)
  +-- Activity feed (existing)
```

### 14.4 Chat Page (`pages/chat/ChatPage.tsx`)

```
ChatPage.tsx
  |
  +-- Header area
  |     +-- AI Specialist icon + name (existing)
  |     +-- <UsageMeter variant="inline" label="messages" />  <-- NEW
  |
  +-- Messages area (existing)
  +-- Input area
        +-- Before handleSend: check usage.chat_messages quota
        +-- If at limit: dispatch billing-gate event instead of streaming
```

### 14.5 Results Page (`pages/analyze/ResultsPage.tsx`)

```
ResultsPage.tsx
  |
  +-- Deal results (existing)
  +-- Action buttons row
  |     +-- "Download PDF" button
  |     |     wrapped in: if hasAccess(plan, 'pro') → generate, else → <UpgradeButton feature="pdf_report" />
  |     +-- "Generate Offer Letter" button
  |     |     wrapped in: <PaywallOverlay feature="offer_letter">
  |     +-- "Share Deal" button
  |           wrapped in: <PaywallOverlay feature="deal_sharing">
  |
  +-- Results content (existing, always visible)
```

### 14.6 Pipeline Page (`pages/Pipeline.tsx`)

```
Pipeline.tsx
  |
  +-- Pipeline board (existing, always visible for all tiers)
  +-- "Add Deal" button
  |     if plan === 'free': <UpgradeButton feature="pipeline_write" />
  |     else: existing add functionality
  +-- Drag handles on deal cards
  |     if plan === 'free': pointer-events-none + cursor-not-allowed
  +-- Stage move context menu
        if plan === 'free': disabled items with "Pro" badge
```

### 14.7 Portfolio Page (`pages/Portfolio.tsx`)

```
Portfolio.tsx
  |
  +-- Summary stats (existing, visible to all)
  +-- <PaywallOverlay feature="portfolio">
  |     +-- Portfolio entries list (existing)
  |     +-- "Add Entry" form (existing)
  +-- Charts area
        +-- <PaywallOverlay feature="portfolio">
              +-- Portfolio charts (existing)
```

### 14.8 Documents Page (`pages/Documents.tsx`)

```
Documents.tsx
  |
  +-- Document list (existing, visible to all -- read-only for free)
  +-- Upload area
        +-- <PaywallOverlay feature="document_upload">
              +-- Upload dropzone (existing)
```

### 14.9 Settings Page (`pages/Settings.tsx`)

```
Settings.tsx
  |
  +-- Profile section (existing)
  +-- Notifications section (existing)
  +-- Billing link/tab                      <-- NEW
        +-- <Link to="/settings/billing">Billing & Plan</Link>
```

### 14.10 Billing Page (`pages/settings/BillingPage.tsx`)

```
/settings/billing  (NEW ROUTE)
  |
  +-- <SuccessOverlay /> (conditional, on ?upgrade=success)
  +-- <CurrentPlanCard />
  +-- <UsageSection />
  +-- <PricingTable />
  +-- <PaymentSection />
  +-- <BillingHistorySection />
  +-- <DangerZone />
        +-- <DowngradeWarning /> (dialog)
```

### 14.11 Route Registration (`App.tsx`)

Add the new route inside the `<ProtectedRoute>` wrapper:

```typescript
// Inside the protected routes section of App.tsx:
{ path: '/settings/billing', element: <BillingPage /> },
```

---

## 15. CRITICAL DECISIONS

### CD-1: Billing store is separate from auth store

**Decision:** Create `billingStore.ts` as a standalone Zustand store, not merge
billing fields into `authStore.ts`.

**Rationale:** The auth store is tiny (user + isAuthenticated) and persists to
localStorage. Billing state includes usage metrics that change within a session,
a `dismissedPaywalls` Set that should NOT persist across sessions, and data
fetched from a dedicated API endpoint. Merging them would bloat localStorage,
create serialization issues with Set/Date, and couple two different lifecycles.

**Trade-off:** Components that need both user info and plan info must import
from two stores. Mitigated by the `usePlan()` selector exported from billingStore.

---

### CD-2: Plan info comes from BOTH `/auth/me` AND `/billing/status`

**Decision:** The `User` type gains a `plan` field returned by `/auth/me` for
fast initial gating. The full billing status (usage, cycle, period end) comes
from `/billing/status` fetched separately.

**Rationale:** `/auth/me` is already called on every page load via
`useSessionValidation`. Adding `plan` to its response gives instant tier info
with zero extra API calls. But `/auth/me` should not return volatile data like
usage counts (which change mid-session), so `/billing/status` handles that.

**Flow:**
1. App loads -> `/auth/me` returns `user.plan` -> authStore has plan immediately
2. billingStore initializes `plan` from `user.plan` in authStore
3. Components that need usage data call `useBillingStatus()` hook
4. After checkout return, both queries are invalidated

---

### CD-3: 403 handler uses CustomEvent, not a global store flag

**Decision:** The API client's 403 handler dispatches a `CustomEvent` on
`window` rather than setting a flag in a Zustand store.

**Rationale:** The 403 can occur from any API call in any component. A store
flag would require every component to check and reset it. A CustomEvent is a
fire-and-forget pattern that `<LimitReachedModal>` (mounted once at the root)
listens for. It decouples the API layer from the UI layer cleanly. The event
carries structured detail (`code`, `feature`, `limit`, `used`) so the modal
can render contextual copy.

**Trade-off:** CustomEvents are not type-safe across the dispatch/listen
boundary. Mitigated by the `LimitDetails` interface used on both sides.

---

### CD-4: PaywallOverlay uses blur on desktop, compact card on mobile

**Decision:** On mobile (`< md`), `<PaywallOverlay>` replaces the locked
content with a compact lock card rather than blurring.

**Rationale:** Blur on a small screen obscures too much and wastes valuable
viewport space. The compact card communicates the same information (feature
name + tier requirement + upgrade CTA) in a fraction of the space. The
`compactOnMobile` prop controls this behavior, defaulting to `false` for
cases where the blurred content is small enough on mobile.

---

### CD-5: LimitReachedModal uses Sheet on mobile, Dialog on desktop

**Decision:** The `<LimitReachedModal>` renders as a shadcn `Sheet
side="bottom"` on viewports below `md`, and a centered `Dialog` on desktop.

**Rationale:** Bottom sheets are the native mobile pattern for interruptions.
They are thumb-accessible, swipeable to dismiss, and feel less hostile than a
centered modal that blocks the entire screen. Both shadcn components are already
in the codebase. The `useMediaQuery` hook (newly introduced) handles the switch.

---

### CD-6: Paywall dismissals are session-scoped, not persisted

**Decision:** The `dismissedPaywalls` Set in billingStore resets on page
refresh. It is NOT saved to localStorage.

**Rationale:** Persisting dismissed paywalls would mean the user never sees
the upgrade prompt for a feature again across sessions, drastically reducing
conversion opportunities. Session-scoping means: the user sees the modal once
per session per feature. If they refresh and try again, they see it once more.
This balances conversion pressure with UX respect. The research (agent-09)
specifically recommends session-scoped tracking.

---

### CD-7: Trial banner placement is static, not sticky-bottom on mobile

**Decision:** The trial banner renders in the same position (between Topbar
and main content) on all screen sizes.

**Rationale:** While the research suggests a sticky bottom bar on mobile for
thumb accessibility, Parcel already has a bottom-positioned input area on the
Chat page and does not use sticky bottom bars elsewhere. Introducing one for
the trial banner alone would feel inconsistent. The banner at `h-10` is small
enough to not significantly push down content. The CTA button within the
banner is still reachable. Revisit this if A/B testing shows poor mobile
conversion from the top-positioned banner.

---

### CD-8: Stripe Checkout redirect, not embedded Elements

**Decision:** Use Stripe Checkout (server-creates-session, frontend-redirects)
rather than embedded Stripe Elements.

**Rationale:** Stripe Checkout requires zero frontend Stripe dependencies. The
backend creates a session via `POST /billing/checkout`, returns a URL, and the
frontend does `window.location.href = url`. This keeps the bundle small, avoids
PCI compliance concerns, supports Apple Pay/Google Pay automatically, and
matches the integration pattern already designed in agent-17. Stripe Elements
can be added later for an embedded checkout experience if conversion data
justifies the additional complexity.

**Impact:** No `@stripe/stripe-js` or `@stripe/react-stripe-js` dependencies
needed. The only new frontend dependency is `canvas-confetti` (~3KB gzipped)
for the success overlay.

---

### CD-9: Demo users see zero billing UI

**Decision:** Every billing component checks `useIsDemo()` and returns `null`
or bypasses gating entirely.

**Rationale:** The demo account (`demo@parcel.app`) exists to showcase the
product without billing friction. Its `plan` value is `"demo"` which maps to
team-level access in `PLAN_RANK`. The `useIsDemo()` selector returns `true`
when `plan === 'demo'`. Components that render billing UI (PlanBadge,
TrialBanner, UsageMeter on dashboard, upgrade CTAs) check this and hide
themselves. Components that gate features (PaywallOverlay) check `hasAccess()`
which treats `demo` as equivalent to `team`.

---

### CD-10: Usage toast thresholds fire on action completion, not page load

**Decision:** Usage warning toasts (70%, 80%, 90% thresholds) fire in the
`onSuccess` callback of the mutation that incremented the counter (e.g.,
`useCreateDeal`, `useSendChat`), not on page load or navigation.

**Rationale:** The research (agent-09, section 10) explicitly warns against
showing usage toasts on page load: "Loading a page and being greeted with a
paywall toast feels adversarial." Toasts after a successful action feel like
helpful information. The API response should include updated usage counts, and
the mutation's `onSuccess` handler checks thresholds and fires the appropriate
Sonner toast.

**Implementation pattern:**
```typescript
// Inside useCreateDeal or similar mutation:
onSuccess: (data) => {
  const { usage } = data  // API returns updated usage
  const pct = (usage.analyses.used / usage.analyses.limit) * 100
  if (pct >= 90 && pct < 100) {
    toast('Last analysis remaining this month.', {
      action: { label: 'Upgrade', onClick: () => navigate('/settings/billing') },
      id: 'usage-analyses-90',
    })
  }
}
```

---

### CD-11: No new route guard for billing -- feature-level gating only

**Decision:** Free-tier users can navigate to all routes (`/pipeline`,
`/portfolio`, `/documents`, etc.). Features are gated within pages, not at
the route level.

**Rationale:** Route-level blocking (redirecting `/portfolio` to an upgrade
page) hides the product's value from free users. Feature-level gating (showing
the portfolio page with a blur overlay over the add-entry form) lets free users
see what they are missing. This creates passive desire and is the established
pattern for reverse-trial SaaS products. The research confirms that previewing
locked value converts 2-3x better than hiding it entirely.

---

### CD-12: Single `canvas-confetti` as the only new frontend dependency

**Decision:** The only new npm dependency for all billing UI is
`canvas-confetti` (~3KB gzipped), dynamically imported only on the success
overlay path.

**Rationale:** Keeping the dependency footprint minimal is important for bundle
size. `canvas-confetti` is lazy-loaded via dynamic `import()` so it does not
appear in the main bundle. No Stripe frontend SDK is needed (see CD-8). All
other billing components use existing dependencies: shadcn/ui, Framer Motion,
Recharts, Lucide icons, TanStack Query, Zustand.

---

### New Files Summary

| File | Type |
|------|------|
| `frontend/src/types/billing.ts` | Types |
| `frontend/src/stores/billingStore.ts` | Zustand store |
| `frontend/src/hooks/useBilling.ts` | TanStack Query hooks |
| `frontend/src/hooks/useMediaQuery.ts` | Utility hook |
| `frontend/src/components/billing/PaywallOverlay.tsx` | Component |
| `frontend/src/components/billing/UsageMeter.tsx` | Component |
| `frontend/src/components/billing/TrialBanner.tsx` | Component |
| `frontend/src/components/billing/PricingTable.tsx` | Component |
| `frontend/src/components/billing/UpgradeButton.tsx` | Component |
| `frontend/src/components/billing/PlanBadge.tsx` | Component |
| `frontend/src/components/billing/SuccessOverlay.tsx` | Component |
| `frontend/src/components/billing/LimitReachedModal.tsx` | Component |
| `frontend/src/components/billing/DowngradeWarning.tsx` | Component |
| `frontend/src/pages/settings/BillingPage.tsx` | Page |

### Modified Files

| File | Change |
|------|--------|
| `frontend/src/types/index.ts` | Add `plan`, `plan_status`, `current_period_end`, `trial_ends_at` to `User` |
| `frontend/src/lib/api.ts` | Add `api.billing.*` methods + 403 handler |
| `frontend/src/lib/motion.ts` | Add `paywallReveal`, `celebrationCard`, `progressBarFill` variants |
| `frontend/src/components/layout/AppShell.tsx` | Add `<TrialBanner>`, `<PlanBadge>` in sidebar + user menu |
| `frontend/src/pages/chat/ChatPage.tsx` | Add inline usage meter + pre-send quota check |
| `frontend/src/pages/analyze/ResultsPage.tsx` | Gate PDF/offer letter/share buttons |
| `frontend/src/pages/Pipeline.tsx` | Disable write actions for free tier |
| `frontend/src/pages/Portfolio.tsx` | Wrap write areas in `<PaywallOverlay>` |
| `frontend/src/pages/Documents.tsx` | Wrap upload in `<PaywallOverlay>` |
| `frontend/src/pages/Dashboard.tsx` | Add `<UsageCard>` component |
| `frontend/src/App.tsx` | Add `/settings/billing` route + mount `<LimitReachedModal>` |
