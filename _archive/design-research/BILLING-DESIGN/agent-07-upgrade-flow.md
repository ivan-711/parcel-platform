# Upgrade & Checkout Flow Design for Parcel

**Date:** 2026-03-28
**Scope:** Complete user journey from feature discovery through paywall, checkout, success, and plan management
**Stack:** React 18 + TypeScript + Tailwind + shadcn/ui + Framer Motion (Vercel) | FastAPI + Stripe Checkout Sessions (Railway)
**Design system:** Dark theme (#08080F base, #0F0F1A surface, #6366F1 indigo accent, JetBrains Mono for financial numbers)

---

## Table of Contents

1. [User Flow Diagram](#1-user-flow-diagram)
2. [Pricing Page Component Design](#2-pricing-page-component-design)
3. [Stripe Checkout Session Creation](#3-stripe-checkout-session-creation)
4. [Success Page Design](#4-success-page-design)
5. [Checkout Error Handling](#5-checkout-error-handling)
6. [Direct Upgrade Links](#6-direct-upgrade-links)
7. [Plan Switching](#7-plan-switching)
8. [Re-subscription](#8-re-subscription)
9. [Mobile Checkout Experience](#9-mobile-checkout-experience)
10. [Analytics Events](#10-analytics-events)
11. [Critical Decisions](#11-critical-decisions)

---

## 1. User Flow Diagram

### Primary Flow: Feature Discovery to Paid Subscription

```
                         ENTRY POINTS
    ┌─────────────────────────────────────────────────┐
    │                                                 │
    │  1. FeatureGate blur overlay  (e.g., offer      │
    │     letter, PDF report, doc upload)             │
    │                                                 │
    │  2. Usage limit hit  (e.g., 3/3 analyses,       │
    │     5/5 pipeline deals)                         │
    │                                                 │
    │  3. Trial countdown banner  (Days 7-0)          │
    │                                                 │
    │  4. Sidebar plan badge  ("Free" clickable)      │
    │                                                 │
    │  5. Settings > Billing  (explicit navigation)   │
    │                                                 │
    │  6. AI chat tease  (truncated response)         │
    │                                                 │
    │  7. Toast action link  ("Upgrade" on limit      │
    │     approaching)                                │
    │                                                 │
    └─────────────────┬───────────────────────────────┘
                      │
                      ▼
    ┌─────────────────────────────────────────────────┐
    │          PAYWALL / CTA INTERACTION              │
    │                                                 │
    │  Modal (desktop) or Bottom Sheet (mobile):      │
    │  ┌───────────────────────────────────┐          │
    │  │  ✨ Unlock {Feature}              │          │
    │  │                                   │          │
    │  │  "{Value prop sentence}"          │          │
    │  │                                   │          │
    │  │  [ Upgrade to Pro — $29/mo ]      │  ◄─── primary CTA │
    │  │                                   │          │
    │  │  Compare all plans →              │  ◄─── links to /pricing │
    │  └───────────────────────────────────┘          │
    │                                                 │
    │  Session-scoped: shown max ONCE per feature.    │
    │  Second attempt → toast with action link.       │
    │                                                 │
    └──────────┬─────────────────────┬────────────────┘
               │                     │
     "Upgrade to Pro"         "Compare plans"
               │                     │
               ▼                     ▼
    ┌──────────────────┐  ┌──────────────────────────┐
    │  POST /api/v1/   │  │  /pricing                │
    │  billing/checkout│  │  (in-app pricing page)   │
    │  { plan: "pro",  │  │                          │
    │    cycle: "month" │  │  User selects plan +     │
    │  }               │  │  billing cycle, clicks    │
    │                  │  │  "Upgrade to {Plan}"      │
    │  Returns:        │  │                          │
    │  { checkout_url } │  │  → POST /billing/checkout │
    └────────┬─────────┘  └──────────┬───────────────┘
             │                       │
             └───────────┬───────────┘
                         │
                         ▼
    ┌─────────────────────────────────────────────────┐
    │          STRIPE CHECKOUT (hosted page)           │
    │                                                 │
    │  Stripe-hosted. Handles:                        │
    │  - Card entry / Apple Pay / Google Pay / Link   │
    │  - 3D Secure / SCA                              │
    │  - Promo code entry (allow_promotion_codes)     │
    │  - Tax display (when enabled)                   │
    │                                                 │
    │  success_url → /pricing?upgrade=success&plan=X  │
    │  cancel_url  → /pricing?upgrade=canceled        │
    │                                                 │
    └────────┬───────────────────────┬────────────────┘
             │                       │
         SUCCESS                  CANCEL
             │                       │
             ▼                       ▼
    ┌────────────────────┐  ┌────────────────────────┐
    │  SUCCESS STATE     │  │  CANCEL RETURN          │
    │                    │  │                          │
    │  1. Webhook fires: │  │  User returns to         │
    │     checkout.      │  │  /pricing?upgrade=       │
    │     session.       │  │  canceled                │
    │     completed      │  │                          │
    │                    │  │  Show toast:              │
    │  2. Backend        │  │  "Checkout canceled.      │
    │     updates DB:    │  │   Your plan is unchanged."│
    │     user.plan,     │  │                          │
    │     status, etc.   │  │  Re-show pricing table   │
    │                    │  │  with "Upgrade" CTAs      │
    │  3. Frontend       │  │                          │
    │     detects        │  └────────────────────────┘
    │     ?upgrade=      │
    │     success        │
    │                    │
    │  4. Calls          │
    │     GET /auth/me   │
    │     → updated plan │
    │                    │
    │  5. Shows success  │
    │     overlay with   │
    │     confetti +     │
    │     feature list   │
    │                    │
    │  6. FeatureGate    │
    │     re-evaluates:  │
    │     blur/modal     │
    │     disappears     │
    │                    │
    │  7. Toast:         │
    │     "Welcome to    │
    │      Pro!"         │
    │                    │
    └────────────────────┘
```

### Secondary Flows

```
PLAN UPGRADE (Starter → Pro):
  /settings/billing → "Change Plan" → confirmation modal
  → POST /api/v1/billing/change-plan { plan: "pro" }
  → Stripe.Subscription.modify (immediate proration)
  → webhook: subscription.updated → DB update
  → frontend re-fetches /auth/me → features unlocked

PLAN DOWNGRADE (Pro → Free):
  /settings/billing → "Cancel Subscription" → DowngradeConfirmDialog
  → POST /api/v1/billing/cancel { at_period_end: true }
  → Stripe sets cancel_at_period_end = true
  → user keeps Pro until period ends
  → webhook: subscription.deleted → DB updates plan to "free"

RE-SUBSCRIPTION (canceled → active):
  /pricing → "Upgrade to Pro" → POST /billing/checkout
  → new Checkout Session (Stripe reuses customer object)
  → same success flow as initial signup
```

---

## 2. Pricing Page Component Design

### Route: `/pricing`

This is the in-app pricing page, distinct from the landing page marketing section. It shows the user's current plan, lets them compare plans, and initiates checkout.

### Component Tree

```
PricingPage
├── AppShell (title="Plans & Pricing")
│   ├── Breadcrumb: Dashboard > Settings > Plans & Pricing
│   │
│   ├── BillingCycleToggle
│   │   └── [Monthly] [Annual — Save 20%]
│   │
│   ├── PricingGrid (responsive)
│   │   ├── PricingCard (Free)     — "Current plan" or "Downgrade"
│   │   ├── PricingCard (Starter)  — "Upgrade" or "Current plan"
│   │   ├── PricingCard (Pro)      — "Most popular" badge, glow
│   │   └── PricingCard (Team)     — "Best for teams" badge
│   │
│   ├── FeatureComparisonTable
│   │   └── Sticky left column, scrollable grid of check/dash/values
│   │
│   ├── SocialProofStrip
│   │   └── 3 testimonials (flipper, BRRRR investor, wholesaler)
│   │
│   └── FAQ section (collapsible)
│
└── UpgradeSuccessOverlay (conditional, ?upgrade=success)
```

### Implementation: PricingPage.tsx

```tsx
// frontend/src/pages/PricingPage.tsx

import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, Sparkles, Crown, Users, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { useBillingStore } from '@/stores/billingStore'
import { staggerContainer, staggerItem } from '@/lib/motion'
import { UpgradeSuccessOverlay } from '@/components/billing/UpgradeSuccessOverlay'
import type { Plan, BillingCycle } from '@/types/billing'

// ---- Plan Configuration (single source of truth) ----

interface PlanConfig {
  key: Plan
  name: string
  description: string
  monthlyPrice: number   // cents
  annualPrice: number    // cents (per month equivalent)
  icon: typeof Zap
  features: string[]
  limits: Record<string, string>
  highlighted: boolean
  badge: string | null
}

const PLANS: PlanConfig[] = [
  {
    key: 'free',
    name: 'Free',
    description: 'Get started with deal analysis',
    monthlyPrice: 0,
    annualPrice: 0,
    icon: Zap,
    features: [
      '3 deal analyses / month',
      'Basic AI chat (5 messages/mo)',
      'Pipeline (up to 5 deals)',
      'Dashboard analytics',
    ],
    limits: {
      'Analyses': '3 / month',
      'AI chat': '5 messages / month',
      'Pipeline deals': '5',
      'PDF reports': 'No',
      'Document AI': 'No',
      'Offer letters': 'No',
      'Deal sharing': 'No',
      'Comparison tool': '2 dimensions',
    },
    highlighted: false,
    badge: null,
  },
  {
    key: 'starter',
    name: 'Starter',
    description: 'For investors analyzing their first deals',
    monthlyPrice: 2900,
    annualPrice: 2300,
    icon: Sparkles,
    features: [
      '25 deal analyses / month',
      '50 AI chat messages / month',
      'Pipeline (up to 25 deals)',
      '10 PDF reports / month',
      'Full comparison tool',
    ],
    limits: {
      'Analyses': '25 / month',
      'AI chat': '50 messages / month',
      'Pipeline deals': '25',
      'PDF reports': '10 / month',
      'Document AI': 'No',
      'Offer letters': 'No',
      'Deal sharing': 'Yes',
      'Comparison tool': 'All dimensions',
    },
    highlighted: false,
    badge: null,
  },
  {
    key: 'pro',
    name: 'Pro',
    description: 'For active investors and agents',
    monthlyPrice: 6900,
    annualPrice: 5500,
    icon: Crown,
    features: [
      'Unlimited deal analyses',
      'Unlimited AI chat',
      'Unlimited pipeline',
      'Unlimited PDF reports',
      'Document AI (10 uploads/mo)',
      'Offer letter generator',
      'Deal sharing links',
      'Priority support',
    ],
    limits: {
      'Analyses': 'Unlimited',
      'AI chat': 'Unlimited',
      'Pipeline deals': 'Unlimited',
      'PDF reports': 'Unlimited',
      'Document AI': '10 uploads / month',
      'Offer letters': 'Yes',
      'Deal sharing': 'Yes',
      'Comparison tool': 'All dimensions',
    },
    highlighted: true,
    badge: 'Most popular',
  },
  {
    key: 'team',
    name: 'Team',
    description: 'For real estate teams and brokerages',
    monthlyPrice: 14900,
    annualPrice: 11900,
    icon: Users,
    features: [
      'Everything in Pro',
      'Up to 10 team members',
      'Shared pipeline & deals',
      'Role-based access control',
      'Unlimited document AI',
      'Team analytics dashboard',
    ],
    limits: {
      'Analyses': 'Unlimited',
      'AI chat': 'Unlimited',
      'Pipeline deals': 'Unlimited',
      'PDF reports': 'Unlimited',
      'Document AI': 'Unlimited',
      'Offer letters': 'Yes',
      'Deal sharing': 'Yes',
      'Comparison tool': 'All dimensions',
    },
    highlighted: false,
    badge: 'Best for teams',
  },
]

const PLAN_HIERARCHY: Record<Plan, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  team: 3,
}

function formatPrice(cents: number): string {
  if (cents === 0) return '$0'
  return `$${(cents / 100).toFixed(0)}`
}

// ---- Billing Cycle Toggle ----

function BillingCycleToggle({
  cycle,
  onChange,
}: {
  cycle: BillingCycle
  onChange: (c: BillingCycle) => void
}) {
  return (
    <div className="flex items-center justify-center gap-3">
      <button
        type="button"
        onClick={() => onChange('monthly')}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          cycle === 'monthly'
            ? 'bg-[#6366F1] text-white'
            : 'bg-app-elevated text-text-secondary hover:text-text-primary'
        }`}
      >
        Monthly
      </button>
      <button
        type="button"
        onClick={() => onChange('annual')}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
          cycle === 'annual'
            ? 'bg-[#6366F1] text-white'
            : 'bg-app-elevated text-text-secondary hover:text-text-primary'
        }`}
      >
        Annual
        <span className="bg-[#10B981]/20 text-[#10B981] text-[10px] uppercase tracking-[0.08em] font-bold px-1.5 py-0.5 rounded">
          Save 20%
        </span>
      </button>
    </div>
  )
}

// ---- Pricing Card ----

function PricingCard({
  plan,
  cycle,
  currentPlan,
  onSelect,
  isLoading,
}: {
  plan: PlanConfig
  cycle: BillingCycle
  currentPlan: Plan
  onSelect: (plan: Plan, cycle: BillingCycle) => void
  isLoading: boolean
}) {
  const price = cycle === 'annual' ? plan.annualPrice : plan.monthlyPrice
  const isCurrent = currentPlan === plan.key
  const isUpgrade = PLAN_HIERARCHY[plan.key] > PLAN_HIERARCHY[currentPlan]
  const isDowngrade = PLAN_HIERARCHY[plan.key] < PLAN_HIERARCHY[currentPlan]
  const isFree = plan.key === 'free'

  return (
    <motion.div
      variants={staggerItem}
      className={`
        relative rounded-xl border p-6 flex flex-col
        ${plan.highlighted
          ? 'border-[#6366F1]/50 bg-app-surface shadow-lg shadow-[#6366F1]/10'
          : 'border-border-subtle bg-app-surface'
        }
      `}
    >
      {/* Ambient glow for highlighted card */}
      {plan.highlighted && (
        <>
          <div className="absolute -top-px left-8 right-8 h-px bg-gradient-to-r from-transparent via-[#6366F1] to-transparent" />
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-32 h-16 rounded-full bg-[#6366F1]/15 blur-[20px] pointer-events-none" />
        </>
      )}

      {/* Badge */}
      {(plan.badge || isCurrent) && (
        <div className="mb-4">
          {isCurrent ? (
            <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.08em] font-bold bg-[#10B981]/20 text-[#10B981]">
              Current plan
            </span>
          ) : plan.badge ? (
            <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.08em] font-bold bg-[#6366F1]/20 text-[#6366F1]">
              {plan.badge}
            </span>
          ) : null}
        </div>
      )}

      {/* Plan name + description */}
      <div className="flex items-center gap-2 mb-1">
        <plan.icon size={18} className="text-[#6366F1]" />
        <h3 className="text-lg font-semibold text-text-primary">{plan.name}</h3>
      </div>
      <p className="text-sm text-text-secondary mb-4">{plan.description}</p>

      {/* Price */}
      <div className="mb-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${plan.key}-${cycle}`}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
          >
            <span className="text-4xl font-bold font-mono text-text-primary">
              {formatPrice(price)}
            </span>
            {!isFree && (
              <span className="text-sm text-text-muted ml-1">
                /mo{cycle === 'annual' ? ', billed annually' : ''}
              </span>
            )}
            {isFree && (
              <span className="text-sm text-text-muted ml-1">forever</span>
            )}
          </motion.div>
        </AnimatePresence>
        {!isFree && cycle === 'annual' && (
          <p className="text-xs text-[#10B981] mt-1">
            Save {formatPrice((plan.monthlyPrice - plan.annualPrice) * 12)} per year
          </p>
        )}
      </div>

      {/* Feature list */}
      <ul className="space-y-2.5 mb-6 flex-1">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-sm">
            <Check
              size={16}
              className="text-[#10B981] shrink-0 mt-0.5"
            />
            <span className="text-text-secondary">{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      {isCurrent ? (
        <Button variant="ghost" disabled className="w-full">
          Current plan
        </Button>
      ) : isUpgrade ? (
        <Button
          onClick={() => onSelect(plan.key, cycle)}
          disabled={isLoading}
          className="w-full bg-[#6366F1] hover:bg-[#5558E3] text-white"
        >
          {isLoading ? 'Redirecting...' : `Upgrade to ${plan.name}`}
        </Button>
      ) : isDowngrade ? (
        <Button
          variant="outline"
          onClick={() => onSelect(plan.key, cycle)}
          disabled={isLoading}
          className="w-full"
        >
          {isFree ? 'Downgrade to Free' : `Switch to ${plan.name}`}
        </Button>
      ) : null}
    </motion.div>
  )
}

// ---- Main Pricing Page ----

export default function PricingPage() {
  const [cycle, setCycle] = useState<BillingCycle>('monthly')
  const [loading, setLoading] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { plan: currentPlan } = useBillingStore()
  const { user } = useAuthStore()

  // Detect success/cancel return from Stripe
  const upgradeResult = searchParams.get('upgrade')
  const upgradedPlan = searchParams.get('plan') as Plan | null

  useEffect(() => {
    if (upgradeResult === 'canceled') {
      toast.info('Checkout canceled. Your plan is unchanged.')
      setSearchParams({}, { replace: true })
    }
  }, [upgradeResult, setSearchParams])

  const handleSelectPlan = async (plan: Plan, billingCycle: BillingCycle) => {
    if (plan === 'free') {
      // Downgrade → show confirmation dialog (handled by parent or modal)
      navigate('/settings/billing?action=cancel')
      return
    }

    const isDowngrade = PLAN_HIERARCHY[plan] < PLAN_HIERARCHY[currentPlan]
    if (isDowngrade) {
      navigate(`/settings/billing?action=downgrade&to=${plan}`)
      return
    }

    // Upgrade → create Stripe Checkout Session
    setLoading(true)
    try {
      const { checkout_url } = await api.billing.createCheckout(plan, billingCycle)
      // Track before redirect (fires async, does not block)
      trackEvent('checkout_started', { plan, cycle: billingCycle, source: 'pricing_page' })
      window.location.href = checkout_url
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to start checkout. Please try again.'
      )
      setLoading(false)
    }
  }

  return (
    <AppShell title="Plans & Pricing">
      <motion.div
        className="max-w-6xl mx-auto space-y-8"
        variants={staggerContainer(60)}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div variants={staggerItem} className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-text-primary">
            Choose your plan
          </h1>
          <p className="text-sm text-text-secondary max-w-lg mx-auto">
            Every plan includes a 14-day Pro trial. No credit card required to start.
          </p>
        </motion.div>

        {/* Billing cycle toggle */}
        <motion.div variants={staggerItem}>
          <BillingCycleToggle cycle={cycle} onChange={setCycle} />
        </motion.div>

        {/* Pricing cards */}
        <motion.div
          variants={staggerItem}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {PLANS.map((plan) => (
            <PricingCard
              key={plan.key}
              plan={plan}
              cycle={cycle}
              currentPlan={currentPlan}
              onSelect={handleSelectPlan}
              isLoading={loading}
            />
          ))}
        </motion.div>

        {/* Social proof */}
        <motion.div
          variants={staggerItem}
          className="grid md:grid-cols-3 gap-6 pt-4"
        >
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="rounded-xl border border-border-subtle bg-app-surface p-5 space-y-3"
            >
              <p className="text-sm text-text-secondary italic">"{t.quote}"</p>
              <div>
                <p className="text-sm font-medium text-text-primary">{t.name}</p>
                <p className="text-xs text-text-muted">{t.role}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Success overlay (conditional) */}
      {upgradeResult === 'success' && upgradedPlan && (
        <UpgradeSuccessOverlay
          plan={upgradedPlan}
          onDismiss={() => setSearchParams({}, { replace: true })}
        />
      )}
    </AppShell>
  )
}

const TESTIMONIALS = [
  {
    name: 'Mike R.',
    role: 'Fix-and-Flip Investor, Phoenix AZ',
    quote:
      'Parcel caught a $12K rehab underestimate on my first deal. That one analysis paid for 18 months of Pro.',
  },
  {
    name: 'Sarah T.',
    role: 'BRRRR Investor, Memphis TN',
    quote:
      'I closed 3 BRRRR deals last quarter using Parcel\'s pipeline. No more lost follow-ups.',
  },
  {
    name: 'David K.',
    role: 'Wholesaler, Atlanta GA',
    quote:
      'I analyze 20+ deals a week. Free gives you 3 a month. Pro was a no-brainer.',
  },
]
```

### Responsive Behavior

| Breakpoint | Layout |
|---|---|
| `< sm` (mobile) | Single-column stack. Pro card rendered first (most popular). Horizontal scroll snap carousel as alternative. |
| `sm-lg` | 2x2 grid. Pro card gets slight scale(1.02) lift. |
| `lg+` | 4-column grid as shown. Pro card has ambient glow + top gradient line. |

### Feature Comparison Table

Below the pricing cards, render a full-width comparison table. Reuse the sticky-left-column pattern already proven in the Compare page:

```tsx
// frontend/src/components/billing/FeatureComparisonTable.tsx

const COMPARISON_ROWS: { feature: string; free: string; starter: string; pro: string; team: string }[] = [
  { feature: 'Deal analyses',      free: '3/mo',       starter: '25/mo',      pro: 'Unlimited',  team: 'Unlimited' },
  { feature: 'AI chat messages',   free: '5/mo',       starter: '50/mo',      pro: 'Unlimited',  team: 'Unlimited' },
  { feature: 'Pipeline deals',     free: '5',          starter: '25',         pro: 'Unlimited',  team: 'Unlimited' },
  { feature: 'PDF reports',        free: '--',         starter: '10/mo',      pro: 'Unlimited',  team: 'Unlimited' },
  { feature: 'Document AI',        free: '--',         starter: '--',         pro: '10 uploads/mo', team: 'Unlimited' },
  { feature: 'Offer letters',      free: '--',         starter: '--',         pro: 'Yes',        team: 'Yes' },
  { feature: 'Deal sharing',       free: '--',         starter: 'Yes',        pro: 'Yes',        team: 'Yes' },
  { feature: 'Strategy comparison', free: '2 dimensions', starter: 'All',     pro: 'All',        team: 'All' },
  { feature: 'Team members',       free: '1',          starter: '1',          pro: '1',          team: 'Up to 10' },
  { feature: 'Shared pipeline',    free: '--',         starter: '--',         pro: '--',         team: 'Yes' },
  { feature: 'Role-based access',  free: '--',         starter: '--',         pro: '--',         team: 'Yes' },
  { feature: 'Support',            free: 'Community',  starter: 'Email',      pro: 'Priority',   team: 'Priority' },
]

export function FeatureComparisonTable({ currentPlan }: { currentPlan: Plan }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-app-surface overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#1A1A2E]">
            <th className="sticky left-0 z-10 bg-app-surface text-left px-4 py-3 text-text-secondary font-medium min-w-[180px]">
              Feature
            </th>
            {(['free', 'starter', 'pro', 'team'] as Plan[]).map((plan) => (
              <th
                key={plan}
                className={`text-center px-4 py-3 font-medium min-w-[120px] ${
                  plan === currentPlan
                    ? 'text-[#6366F1] bg-[#6366F1]/5'
                    : 'text-text-secondary'
                }`}
              >
                {plan.charAt(0).toUpperCase() + plan.slice(1)}
                {plan === currentPlan && (
                  <span className="block text-[10px] text-[#10B981] uppercase tracking-wider">
                    Current
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COMPARISON_ROWS.map((row, i) => (
            <tr
              key={row.feature}
              className={`border-b border-[#1A1A2E] ${
                i % 2 === 0 ? 'bg-[#0F0F1A]' : 'bg-[#08080F]'
              }`}
            >
              <td className="sticky left-0 z-10 bg-inherit px-4 py-2.5 text-text-secondary font-medium">
                {row.feature}
              </td>
              {(['free', 'starter', 'pro', 'team'] as Plan[]).map((plan) => {
                const value = row[plan]
                const isCheck = value === 'Yes'
                const isDash = value === '--'
                return (
                  <td
                    key={plan}
                    className={`text-center px-4 py-2.5 font-mono text-[13px] ${
                      plan === currentPlan ? 'bg-[#6366F1]/5' : ''
                    }`}
                  >
                    {isCheck ? (
                      <Check size={16} className="text-[#10B981] mx-auto" />
                    ) : isDash ? (
                      <X size={16} className="text-text-muted/40 mx-auto" />
                    ) : (
                      <span className={value === 'Unlimited' ? 'text-[#10B981]' : 'text-text-primary'}>
                        {value}
                      </span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

---

## 3. Stripe Checkout Session Creation

### Backend Endpoint

```python
# backend/routers/billing.py

import stripe
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from enum import Enum

from database import get_db
from routers.auth import get_current_user
from config import settings

router = APIRouter(prefix="/api/v1/billing", tags=["billing"])

class PlanName(str, Enum):
    starter = "starter"
    pro = "pro"
    team = "team"

class CycleName(str, Enum):
    monthly = "monthly"
    annual = "annual"

class CheckoutRequest(BaseModel):
    plan: PlanName
    cycle: CycleName = CycleName.monthly

# Map plan+cycle → Stripe Price ID (from env vars)
PRICE_MAP = {
    ("starter", "monthly"): settings.STRIPE_PRICE_STARTER_MONTHLY,
    ("starter", "annual"):  settings.STRIPE_PRICE_STARTER_ANNUAL,
    ("pro", "monthly"):     settings.STRIPE_PRICE_PRO_MONTHLY,
    ("pro", "annual"):      settings.STRIPE_PRICE_PRO_ANNUAL,
    ("team", "monthly"):    settings.STRIPE_PRICE_TEAM_MONTHLY,
    ("team", "annual"):     settings.STRIPE_PRICE_TEAM_ANNUAL,
}

@router.post("/checkout")
async def create_checkout_session(
    body: CheckoutRequest,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Create a Stripe Checkout Session for subscription signup or upgrade."""
    stripe.api_key = settings.STRIPE_SECRET_KEY

    price_id = PRICE_MAP.get((body.plan.value, body.cycle.value))
    if not price_id:
        raise HTTPException(status_code=400, detail="Invalid plan/cycle combination")

    # Find or create Stripe customer
    stripe_customer_id = current_user.stripe_customer_id
    if not stripe_customer_id:
        customer = stripe.Customer.create(
            email=current_user.email,
            name=current_user.name,
            metadata={
                "parcel_user_id": str(current_user.id),
                "signup_date": str(current_user.created_at),
            },
        )
        stripe_customer_id = customer.id
        current_user.stripe_customer_id = stripe_customer_id
        db.commit()

    # If user already has an active subscription, use change-plan instead
    if current_user.stripe_subscription_id and current_user.plan_status in ("active", "trialing"):
        raise HTTPException(
            status_code=409,
            detail="Active subscription exists. Use /billing/change-plan instead.",
        )

    session = stripe.checkout.Session.create(
        customer=stripe_customer_id,
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=(
            f"{settings.FRONTEND_URL}/pricing"
            f"?upgrade=success"
            f"&plan={body.plan.value}"
            f"&session_id={{CHECKOUT_SESSION_ID}}"
        ),
        cancel_url=f"{settings.FRONTEND_URL}/pricing?upgrade=canceled",
        subscription_data={
            "metadata": {
                "parcel_user_id": str(current_user.id),
                "parcel_plan": body.plan.value,
                "parcel_cycle": body.cycle.value,
            },
        },
        allow_promotion_codes=True,
        billing_address_collection="auto",
        customer_update={
            "address": "auto",
            "name": "auto",
        },
        # Conditional trial: only if user has never had a paid plan
        **(
            {"subscription_data": {
                **{
                    "metadata": {
                        "parcel_user_id": str(current_user.id),
                        "parcel_plan": body.plan.value,
                        "parcel_cycle": body.cycle.value,
                    },
                },
                "trial_period_days": 14,
            }}
            if not current_user.has_ever_subscribed
            else {"subscription_data": {
                "metadata": {
                    "parcel_user_id": str(current_user.id),
                    "parcel_plan": body.plan.value,
                    "parcel_cycle": body.cycle.value,
                },
            }}
        ),
    )

    return {"checkout_url": session.url}
```

### Metadata Strategy

Every Stripe object carries `parcel_user_id` to enable reliable webhook → DB mapping:

| Object | Metadata Keys | Purpose |
|---|---|---|
| `Customer` | `parcel_user_id`, `signup_date` | Map Stripe customer to Parcel user |
| `Subscription` | `parcel_user_id`, `parcel_plan`, `parcel_cycle` | Know which plan/cycle was intended |
| `Checkout Session` | Inherited from Subscription metadata | Webhook handler reads from session |

### Success/Cancel URL Design

```
SUCCESS:
  /pricing?upgrade=success&plan=pro&session_id={CHECKOUT_SESSION_ID}

  - `upgrade=success` → triggers UpgradeSuccessOverlay
  - `plan=pro` → tells overlay which plan to celebrate
  - `session_id` → allows frontend to verify session (optional, for extra security)

CANCEL:
  /pricing?upgrade=canceled

  - Shows toast: "Checkout canceled. Your plan is unchanged."
  - Clears param from URL immediately
```

### Frontend API Integration

```typescript
// Add to frontend/src/lib/api.ts within the api object:

billing: {
  createCheckout: (plan: string, cycle: string) =>
    request<{ checkout_url: string }>('/api/v1/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ plan, cycle }),
    }),

  createPortalSession: () =>
    request<{ portal_url: string }>('/api/v1/billing/portal', {
      method: 'POST',
    }),

  getStatus: () =>
    request<BillingStatus>('/api/v1/billing/status'),

  changePlan: (plan: string, cycle: string) =>
    request<{ status: string; new_plan: string }>('/api/v1/billing/change-plan', {
      method: 'POST',
      body: JSON.stringify({ plan, cycle }),
    }),

  cancelSubscription: () =>
    request<{ status: string; effective_date: string }>('/api/v1/billing/cancel', {
      method: 'POST',
    }),
},
```

---

## 4. Success Page Design

Rather than a separate route, the success experience renders as a full-screen overlay on `/pricing` when `?upgrade=success` is detected. This keeps the user in context and avoids a dead-end page.

### UpgradeSuccessOverlay Component

```tsx
// frontend/src/components/billing/UpgradeSuccessOverlay.tsx

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Check, ArrowRight, FileText, MessageSquare, BarChart3, Zap } from 'lucide-react'
import confetti from 'canvas-confetti'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { useBillingStore } from '@/stores/billingStore'
import type { Plan } from '@/types/billing'

// Features unlocked per plan (shown in success overlay)
const PLAN_FEATURES: Record<Plan, Array<{ icon: typeof Zap; label: string }>> = {
  free: [],
  starter: [
    { icon: BarChart3, label: '25 deal analyses per month' },
    { icon: MessageSquare, label: '50 AI chat messages per month' },
    { icon: FileText, label: '10 PDF reports per month' },
    { icon: Zap, label: 'Full strategy comparison' },
  ],
  pro: [
    { icon: BarChart3, label: 'Unlimited deal analyses' },
    { icon: MessageSquare, label: 'Unlimited AI chat' },
    { icon: FileText, label: 'Offer letter generator' },
    { icon: Zap, label: 'Document AI processing' },
  ],
  team: [
    { icon: BarChart3, label: 'Everything in Pro' },
    { icon: Zap, label: 'Up to 10 team members' },
    { icon: FileText, label: 'Shared pipeline & deals' },
    { icon: MessageSquare, label: 'Team analytics dashboard' },
  ],
}

// Next action CTA varies by plan
const NEXT_ACTIONS: Record<Plan, { label: string; path: string }> = {
  free: { label: 'Go to Dashboard', path: '/dashboard' },
  starter: { label: 'Analyze a Deal', path: '/analyze' },
  pro: { label: 'Try the AI Chat', path: '/chat' },
  team: { label: 'Invite Your Team', path: '/settings' },
}

interface Props {
  plan: Plan
  onDismiss: () => void
}

export function UpgradeSuccessOverlay({ plan, onDismiss }: Props) {
  const navigate = useNavigate()
  const { fetchBilling } = useBillingStore()
  const confettiFired = useRef(false)

  useEffect(() => {
    // Re-fetch billing state to get updated plan
    fetchBilling()
  }, [fetchBilling])

  useEffect(() => {
    // Fire confetti once on mount
    if (confettiFired.current) return
    confettiFired.current = true

    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.55 },
      colors: ['#6366F1', '#8B5CF6', '#10B981', '#F59E0B'],
      disableForReducedMotion: true,
    })
  }, [])

  // Auto-dismiss after 10 seconds
  useEffect(() => {
    const timer = setTimeout(onDismiss, 10_000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  const features = PLAN_FEATURES[plan] ?? PLAN_FEATURES.pro
  const nextAction = NEXT_ACTIONS[plan] ?? NEXT_ACTIONS.pro
  const planName = plan.charAt(0).toUpperCase() + plan.slice(1)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#08080F]/90 backdrop-blur-sm"
      onClick={onDismiss}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300, delay: 0.1 }}
        className="relative w-full max-w-md mx-4 rounded-2xl border border-border-subtle bg-app-surface p-8 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Animated checkmark */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 15, stiffness: 200, delay: 0.2 }}
          className="mx-auto mb-6 w-16 h-16 rounded-full bg-[#10B981]/20 flex items-center justify-center"
        >
          <motion.div
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <Check size={32} className="text-[#10B981]" strokeWidth={3} />
          </motion.div>
        </motion.div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-text-primary mb-2">
          Welcome to {planName}!
        </h2>
        <p className="text-sm text-text-secondary mb-6">
          You now have access to:
        </p>

        {/* Feature list with staggered animation */}
        <div className="space-y-3 mb-8 text-left">
          {features.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.1, duration: 0.3 }}
              className="flex items-center gap-3"
            >
              <div className="w-7 h-7 rounded-full bg-[#10B981]/20 flex items-center justify-center shrink-0">
                <f.icon size={14} className="text-[#10B981]" />
              </div>
              <span className="text-sm text-text-primary">{f.label}</span>
            </motion.div>
          ))}
        </div>

        {/* CTAs */}
        <div className="space-y-3">
          <Button
            onClick={() => {
              onDismiss()
              navigate(nextAction.path)
            }}
            className="w-full bg-[#6366F1] hover:bg-[#5558E3] text-white gap-2"
          >
            {nextAction.label}
            <ArrowRight size={16} />
          </Button>
          <button
            type="button"
            onClick={onDismiss}
            className="text-sm text-text-muted hover:text-text-secondary transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
```

### Success Flow Sequence

1. User completes payment on Stripe Checkout
2. Stripe redirects to `/pricing?upgrade=success&plan=pro&session_id=cs_xxx`
3. Stripe fires `checkout.session.completed` webhook (usually within 1-3 seconds)
4. Backend webhook handler updates `users.plan`, `users.plan_status`, `users.stripe_subscription_id`
5. Frontend detects `?upgrade=success` → renders `UpgradeSuccessOverlay`
6. Overlay calls `fetchBilling()` which hits `GET /api/v1/billing/status` and then `GET /api/v1/auth/me`
7. Updated plan propagates through billingStore → all `FeatureGate` components re-evaluate
8. Confetti fires, feature list animates in
9. User clicks next-action CTA → navigates to the feature they just unlocked
10. URL params cleaned via `replaceState`

### Webhook Race Condition

There is a small window where the user returns to the app before the webhook has been processed. Handle this gracefully:

```tsx
// In UpgradeSuccessOverlay, poll for plan update if not yet reflected
useEffect(() => {
  let attempts = 0
  const maxAttempts = 10
  const interval = setInterval(async () => {
    attempts++
    const me = await api.auth.me()
    if (me.plan === plan || attempts >= maxAttempts) {
      clearInterval(interval)
      if (me.plan === plan) {
        useBillingStore.getState().setPlan(me.plan)
      }
    }
  }, 1500) // Poll every 1.5 seconds

  return () => clearInterval(interval)
}, [plan])
```

---

## 5. Checkout Error Handling

### Error States

| Scenario | Detection Method | User Experience |
|---|---|---|
| **Payment declined** | Stripe handles on checkout page | User sees Stripe's built-in "Your card was declined" message. They can retry with a different card without leaving Stripe. |
| **Network error before redirect** | `try/catch` on `POST /billing/checkout` | Toast: "Failed to start checkout. Please check your connection and try again." Button re-enabled. |
| **Stripe Checkout page error** | Stripe handles internally | Stripe shows its own error UI. User can click "Back" to return to Parcel. |
| **Abandoned checkout** | User closes Stripe tab/navigates away | No action needed. No subscription created. User returns to app in current plan state. |
| **Cancel button on Stripe** | `cancel_url` redirect | User returns to `/pricing?upgrade=canceled`. Toast: "Checkout canceled." Pricing table re-shown. |
| **Webhook failure** | Webhook returns non-200 to Stripe | Stripe retries up to 3 times over 48 hours. Backend should be idempotent. User may see delay in plan activation. |
| **Session expired** | Checkout Session expires after 24 hours | If user clicks old link, Stripe shows "This checkout session has expired." User must start a new session. |
| **3D Secure fails** | Bank rejects authentication | Stripe shows error on checkout page. User can retry or use a different card. |

### Frontend Error Handling Pattern

```tsx
// Centralized checkout error handler in PricingPage or a custom hook

function useCheckoutRedirect() {
  const [isLoading, setIsLoading] = useState(false)

  const startCheckout = async (plan: Plan, cycle: BillingCycle, source: string) => {
    setIsLoading(true)
    try {
      const { checkout_url } = await api.billing.createCheckout(plan, cycle)
      trackEvent('checkout_started', { plan, cycle, source })

      // Small delay to ensure analytics event fires
      await new Promise((r) => setTimeout(r, 100))
      window.location.href = checkout_url
    } catch (err) {
      setIsLoading(false)

      if (err instanceof Error) {
        if (err.message.includes('Active subscription exists')) {
          toast.error('You already have an active subscription. Go to Settings to change your plan.', {
            action: {
              label: 'Go to Settings',
              onClick: () => navigate('/settings/billing'),
            },
          })
        } else if (err.message.includes('Session expired')) {
          toast.error('Your session expired. Please log in again.')
        } else {
          toast.error(err.message)
        }
      } else {
        toast.error('Something went wrong. Please try again.')
      }
    }
  }

  return { startCheckout, isLoading }
}
```

### Abandoned Checkout Recovery

Stripe Checkout Sessions expire after 24 hours. For users who started but did not complete checkout:

1. **Backend**: Listen for `checkout.session.expired` webhook event
2. **Backend**: Log the event in `user_events` table: `{ event_type: 'checkout_abandoned', metadata: { plan, cycle } }`
3. **Email**: After 24 hours, send a recovery email: "You were about to upgrade to Pro. Ready to finish?" with a deep link back to `/pricing?plan=pro`
4. **In-app**: On next login, show a one-time toast: "Still interested in Pro? Pick up where you left off." with action link to `/pricing`

```python
# In webhook handler
elif event_type == "checkout.session.expired":
    session = data
    customer_id = session.get("customer")
    user = get_user_by_stripe_customer(customer_id, db)
    if user:
        plan = session.get("metadata", {}).get("parcel_plan", "unknown")
        log_event(user.id, "checkout_abandoned", {"plan": plan})
        # Queue recovery email (via Resend/SendGrid)
        queue_email("checkout_recovery", user.email, {"plan": plan})
```

---

## 6. Direct Upgrade Links

### Problem

When a user hits a paywall on a specific feature (e.g., AI chat, offer letters), the CTA should take them directly to checkout for the correct plan -- not dump them on a generic pricing page where they have to figure out which plan unlocks what.

### Deep Link URL Pattern

```
/pricing?plan=pro&feature=ai_chat&source=feature_gate
```

Parameters:
- `plan`: Pre-selects the recommended plan card (scrolls to it on mobile, highlights it on desktop)
- `feature`: Used for analytics -- which locked feature triggered the upgrade
- `source`: Which UI component triggered the navigation (feature_gate, upgrade_modal, trial_banner, usage_toast, sidebar_badge)

### Implementation: UpgradeModal with Direct Checkout

```tsx
// frontend/src/components/billing/UpgradeModal.tsx

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Lock } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useCheckoutRedirect } from '@/hooks/useCheckoutRedirect'
import { useDismissedPaywalls } from '@/stores/billingStore'
import type { Plan } from '@/types/billing'

// Feature-to-plan mapping (which plan unlocks which feature)
const FEATURE_PLAN_MAP: Record<string, { plan: Plan; title: string; description: string }> = {
  ai_chat: {
    plan: 'pro',
    title: 'Unlock AI Deal Chat',
    description: 'Get unlimited AI-powered deal analysis, risk assessment, and investment recommendations.',
  },
  offer_letter: {
    plan: 'pro',
    title: 'Unlock Offer Letters',
    description: 'Generate professional offer letters with pre-filled deal terms, ready to send.',
  },
  document_ai: {
    plan: 'pro',
    title: 'Unlock Document AI',
    description: 'Upload property documents and let AI extract key deal data automatically.',
  },
  pdf_report: {
    plan: 'starter',
    title: 'Unlock PDF Reports',
    description: 'Download branded deal reports to share with lenders, partners, and your team.',
  },
  deal_sharing: {
    plan: 'starter',
    title: 'Unlock Deal Sharing',
    description: 'Share deal analyses via link with lenders, partners, or private money sources.',
  },
  unlimited_analyses: {
    plan: 'starter',
    title: 'Unlock More Analyses',
    description: 'You\'ve hit your monthly limit. Upgrade for 25 analyses per month.',
  },
  unlimited_pipeline: {
    plan: 'starter',
    title: 'Expand Your Pipeline',
    description: 'Your pipeline is full. Upgrade to track up to 25 active deals.',
  },
  team_features: {
    plan: 'team',
    title: 'Unlock Team Features',
    description: 'Shared pipeline, role-based access, and team analytics for your brokerage.',
  },
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  feature: string
}

export function UpgradeModal({ open, onOpenChange, feature }: Props) {
  const navigate = useNavigate()
  const isMobile = useMediaQuery('(max-width: 768px)')
  const { startCheckout, isLoading } = useCheckoutRedirect()
  const { dismiss } = useDismissedPaywalls()

  const config = FEATURE_PLAN_MAP[feature] ?? FEATURE_PLAN_MAP.ai_chat
  const planName = config.plan.charAt(0).toUpperCase() + config.plan.slice(1)

  const handleUpgrade = () => {
    dismiss(feature)
    startCheckout(config.plan, 'monthly', `upgrade_modal_${feature}`)
  }

  const handleComparePlans = () => {
    dismiss(feature)
    onOpenChange(false)
    navigate(`/pricing?plan=${config.plan}&feature=${feature}&source=upgrade_modal`)
  }

  const content = (
    <div className="space-y-4 text-center py-2">
      <div className="mx-auto w-12 h-12 rounded-full bg-[#6366F1]/20 flex items-center justify-center">
        <Sparkles size={24} className="text-[#6366F1]" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-text-primary">{config.title}</h3>
        <p className="text-sm text-text-secondary mt-1">{config.description}</p>
      </div>
      <div className="space-y-2 pt-2">
        <Button
          onClick={handleUpgrade}
          disabled={isLoading}
          className="w-full bg-[#6366F1] hover:bg-[#5558E3] text-white"
        >
          {isLoading ? 'Redirecting...' : `Upgrade to ${planName}`}
        </Button>
        <button
          type="button"
          onClick={handleComparePlans}
          className="text-sm text-text-muted hover:text-[#6366F1] transition-colors"
        >
          Compare all plans
        </button>
      </div>
    </div>
  )

  // Mobile: bottom sheet. Desktop: centered dialog.
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-2xl bg-app-surface border-border-subtle px-6 pb-8">
          {content}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-app-surface border-border-subtle max-w-sm">
        {content}
      </DialogContent>
    </Dialog>
  )
}
```

### FeatureGate Component (Wrapper for All Gated Features)

```tsx
// frontend/src/components/billing/FeatureGate.tsx

import { useState } from 'react'
import { Lock } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { useBillingStore, useDismissedPaywalls } from '@/stores/billingStore'
import { UpgradeModal } from './UpgradeModal'
import type { Plan } from '@/types/billing'

const PLAN_HIERARCHY: Record<Plan, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  team: 3,
}

interface Props {
  requiredTier: Plan
  feature: string
  children: React.ReactNode
  /** If true, show blurred preview of children instead of lock placeholder */
  blur?: boolean
}

export function FeatureGate({ requiredTier, feature, children, blur = false }: Props) {
  const plan = useBillingStore((s) => s.plan)
  const { isDismissed } = useDismissedPaywalls()
  const [modalOpen, setModalOpen] = useState(false)
  const navigate = useNavigate()

  // User has access — render children normally
  if (PLAN_HIERARCHY[plan] >= PLAN_HIERARCHY[requiredTier]) {
    return <>{children}</>
  }

  const tierName = requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)

  // If already dismissed this session, show toast on click instead of modal
  const handleUnlockClick = () => {
    if (isDismissed(feature)) {
      toast(`Upgrade to ${tierName} to use this feature`, {
        action: {
          label: 'Upgrade',
          onClick: () => navigate(`/pricing?plan=${requiredTier}&feature=${feature}`),
        },
        id: `paywall-${feature}`,
      })
      return
    }
    setModalOpen(true)
  }

  if (blur) {
    return (
      <>
        <div className="relative overflow-hidden rounded-xl border border-border-subtle">
          {/* Render children but make them non-interactive */}
          <div className="pointer-events-none select-none" aria-hidden="true">
            {children}
          </div>

          {/* Blur overlay */}
          <div className="absolute inset-0 z-10 backdrop-blur-[10px] bg-[#08080F]/70 flex items-center justify-center">
            <div className="bg-app-surface border border-border-default rounded-xl p-6 text-center space-y-3 shadow-lg shadow-[#6366F1]/5 max-w-xs mx-4">
              <Lock size={24} className="text-[#6366F1] mx-auto" />
              <p className="text-sm font-medium text-text-primary">
                {feature.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} requires {tierName}
              </p>
              <button
                type="button"
                onClick={handleUnlockClick}
                className="inline-flex items-center gap-2 rounded-lg bg-[#6366F1] px-4 py-2 text-sm font-medium text-white hover:bg-[#5558E3] transition-colors"
              >
                Upgrade to {tierName}
              </button>
              <button
                type="button"
                onClick={() => navigate(`/pricing?plan=${requiredTier}&feature=${feature}`)}
                className="block text-xs text-text-muted hover:text-[#6366F1] transition-colors mx-auto"
              >
                See all plans
              </button>
            </div>
          </div>
        </div>

        <UpgradeModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          feature={feature}
        />
      </>
    )
  }

  // Non-blur: compact lock card
  return (
    <>
      <button
        type="button"
        onClick={handleUnlockClick}
        className="w-full rounded-xl border border-border-subtle bg-app-surface p-5 flex items-center gap-3 hover:border-[#6366F1]/30 transition-colors group cursor-pointer"
      >
        <div className="w-10 h-10 rounded-lg bg-[#6366F1]/10 flex items-center justify-center shrink-0 group-hover:bg-[#6366F1]/20 transition-colors">
          <Lock size={18} className="text-[#6366F1]" />
        </div>
        <div className="text-left">
          <p className="text-sm font-medium text-text-primary">
            Requires {tierName}
          </p>
          <p className="text-xs text-text-muted">
            Click to upgrade
          </p>
        </div>
      </button>

      <UpgradeModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        feature={feature}
      />
    </>
  )
}
```

### Usage in ResultsPage (Example Integration Point)

```tsx
// In ResultsPage.tsx, wrap the offer letter button:

import { FeatureGate } from '@/components/billing/FeatureGate'

// Inside the action buttons section:
<FeatureGate requiredTier="pro" feature="offer_letter">
  <Button
    variant="outline"
    onClick={() => setOfferLetterOpen(true)}
    className="gap-2"
  >
    <FileText size={14} />
    Offer Letter
  </Button>
</FeatureGate>

// For PDF report with blur preview:
<FeatureGate requiredTier="starter" feature="pdf_report" blur>
  <div className="rounded-xl border border-border-subtle bg-app-surface p-6">
    {/* PDF preview content */}
  </div>
</FeatureGate>
```

---

## 7. Plan Switching

### Upgrade (Immediate, with Proration)

When a user upgrades (e.g., Starter to Pro), the change takes effect immediately. Stripe calculates the prorated difference and charges it.

```python
# backend/routers/billing.py

class ChangePlanRequest(BaseModel):
    plan: PlanName
    cycle: CycleName

@router.post("/change-plan")
async def change_plan(
    body: ChangePlanRequest,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Change subscription plan. Upgrades are immediate with proration.
       Downgrades take effect at period end."""
    stripe.api_key = settings.STRIPE_SECRET_KEY

    if not current_user.stripe_subscription_id:
        raise HTTPException(status_code=400, detail="No active subscription")

    subscription = stripe.Subscription.retrieve(current_user.stripe_subscription_id)
    current_item = subscription["items"]["data"][0]
    new_price_id = PRICE_MAP.get((body.plan.value, body.cycle.value))

    if not new_price_id:
        raise HTTPException(status_code=400, detail="Invalid plan/cycle")

    current_plan_level = PLAN_HIERARCHY.get(current_user.plan, 0)
    new_plan_level = PLAN_HIERARCHY.get(body.plan.value, 0)
    is_upgrade = new_plan_level > current_plan_level

    updated = stripe.Subscription.modify(
        current_user.stripe_subscription_id,
        items=[{
            "id": current_item.id,
            "price": new_price_id,
        }],
        proration_behavior="create_prorations" if is_upgrade else "none",
    )

    # For upgrades: update DB immediately
    # For downgrades: let the webhook handle it at period end
    if is_upgrade:
        current_user.plan = body.plan.value
        current_user.current_period_end = datetime.fromtimestamp(
            updated.current_period_end, tz=timezone.utc
        )
        db.commit()

    return {
        "status": "plan_changed" if is_upgrade else "downgrade_scheduled",
        "new_plan": body.plan.value,
        "effective_at": (
            "now" if is_upgrade
            else datetime.fromtimestamp(updated.current_period_end, tz=timezone.utc).isoformat()
        ),
    }
```

### Downgrade (End of Period)

Downgrades take effect at the end of the current billing period. The user retains their current plan features until then.

```python
@router.post("/cancel")
async def cancel_subscription(
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Cancel subscription at end of billing period."""
    stripe.api_key = settings.STRIPE_SECRET_KEY

    if not current_user.stripe_subscription_id:
        raise HTTPException(status_code=400, detail="No active subscription")

    updated = stripe.Subscription.modify(
        current_user.stripe_subscription_id,
        cancel_at_period_end=True,
    )

    current_user.plan_status = "canceling"
    db.commit()

    return {
        "status": "cancel_scheduled",
        "effective_date": datetime.fromtimestamp(
            updated.current_period_end, tz=timezone.utc
        ).isoformat(),
    }
```

### Frontend: Plan Change Confirmation Dialog

```tsx
// Shown when user clicks "Change Plan" on /settings/billing

function PlanChangeDialog({
  open,
  onOpenChange,
  currentPlan,
  targetPlan,
  targetCycle,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPlan: Plan
  targetPlan: Plan
  targetCycle: BillingCycle
}) {
  const isUpgrade = PLAN_HIERARCHY[targetPlan] > PLAN_HIERARCHY[currentPlan]
  const targetConfig = PLANS.find((p) => p.key === targetPlan)!
  const price = targetCycle === 'annual'
    ? targetConfig.annualPrice
    : targetConfig.monthlyPrice

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-app-surface border-border-subtle">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-text-primary">
            {isUpgrade ? 'Upgrade' : 'Downgrade'} to {targetConfig.name}?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-text-secondary space-y-2">
            {isUpgrade ? (
              <>
                <p>
                  Your plan will change immediately to {targetConfig.name} at{' '}
                  <span className="font-mono text-text-primary">
                    {formatPrice(price)}/mo
                  </span>.
                </p>
                <p>
                  You will be charged a prorated amount for the remainder of this billing period.
                </p>
              </>
            ) : (
              <>
                <p>
                  Your plan will change to {targetConfig.name} at the end of your current billing period.
                  You will keep full access to {currentPlan} features until then.
                </p>
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-app-elevated border-border-subtle text-text-primary">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => handleChangePlan(targetPlan, targetCycle)}
            className={isUpgrade
              ? 'bg-[#6366F1] hover:bg-[#5558E3] text-white'
              : 'bg-red-600 hover:bg-red-700 text-white'
            }
          >
            {isUpgrade
              ? `Upgrade to ${targetConfig.name}`
              : `Downgrade to ${targetConfig.name}`
            }
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

### Plan Change Strategy Summary

| Scenario | Behavior | Proration | When Effective |
|---|---|---|---|
| Free -> Starter/Pro/Team | New Checkout Session | N/A (first payment) | Immediately after payment |
| Starter -> Pro | `Subscription.modify` | Charge prorated difference | Immediately |
| Starter -> Team | `Subscription.modify` | Charge prorated difference | Immediately |
| Pro -> Team | `Subscription.modify` | Charge prorated difference | Immediately |
| Team -> Pro | `Subscription.modify` | No proration | End of billing period |
| Pro -> Starter | `Subscription.modify` | No proration | End of billing period |
| Any paid -> Free | `cancel_at_period_end` | No proration | End of billing period |
| Monthly -> Annual (same tier) | `Subscription.modify` | Credit remaining month | Immediately |

---

## 8. Re-subscription

### Scenario: Previously Canceled User Wants to Resubscribe

When a user cancels and their subscription expires (or they were on a trial that ended), they return to the Free plan. If they later want to resubscribe, the flow is:

### Flow

```
User on Free plan (previously had Pro)
  → Clicks "Upgrade to Pro" on /pricing or any FeatureGate
  → POST /api/v1/billing/checkout { plan: "pro", cycle: "monthly" }
  → Backend detects: user.stripe_customer_id EXISTS, user.stripe_subscription_id = null (or canceled)
  → Creates new Checkout Session using existing customer object
  → Stripe reuses the customer: same email, may have saved payment method
  → User goes through Stripe Checkout
  → On success: new subscription created, webhook fires, DB updated
```

### Backend Handling

```python
@router.post("/checkout")
async def create_checkout_session(body: CheckoutRequest, current_user=Depends(get_current_user), db=Depends(get_db)):
    stripe.api_key = settings.STRIPE_SECRET_KEY
    price_id = PRICE_MAP.get((body.plan.value, body.cycle.value))

    # Reuse existing Stripe customer if available
    stripe_customer_id = current_user.stripe_customer_id
    if not stripe_customer_id:
        customer = stripe.Customer.create(
            email=current_user.email,
            name=current_user.name,
            metadata={"parcel_user_id": str(current_user.id)},
        )
        stripe_customer_id = customer.id
        current_user.stripe_customer_id = stripe_customer_id
        db.commit()

    # For re-subscription: no trial (they already had one)
    trial_days = None
    if not current_user.has_ever_subscribed:
        trial_days = 14

    session_params = {
        "customer": stripe_customer_id,
        "mode": "subscription",
        "line_items": [{"price": price_id, "quantity": 1}],
        "success_url": f"{settings.FRONTEND_URL}/pricing?upgrade=success&plan={body.plan.value}&session_id={{CHECKOUT_SESSION_ID}}",
        "cancel_url": f"{settings.FRONTEND_URL}/pricing?upgrade=canceled",
        "subscription_data": {
            "metadata": {
                "parcel_user_id": str(current_user.id),
                "parcel_plan": body.plan.value,
                "parcel_cycle": body.cycle.value,
            },
        },
        "allow_promotion_codes": True,
    }

    if trial_days:
        session_params["subscription_data"]["trial_period_days"] = trial_days

    session = stripe.checkout.Session.create(**session_params)
    return {"checkout_url": session.url}
```

### Key Behaviors for Re-subscribers

1. **No trial**: Users who have previously had a paid plan do not get another trial period. The `has_ever_subscribed` flag on the user model controls this.

2. **Saved payment method**: Stripe Checkout may show the user's previously saved card (if they paid before), making re-subscription faster.

3. **Data preservation**: All deals, pipeline, documents, and analyses created during the previous subscription are still in the database. On re-subscription, the user immediately regains full access to everything they created.

4. **Win-back offer**: For users re-subscribing within 30 days of cancellation, consider auto-applying a promo code via the backend:

```python
# If re-subscribing within 30 days, apply win-back discount
if current_user.canceled_at and (now - current_user.canceled_at).days <= 30:
    session_params["discounts"] = [{"coupon": settings.WINBACK_COUPON_ID}]
    # Note: cannot use both discounts AND allow_promotion_codes
    del session_params["allow_promotion_codes"]
```

---

## 9. Mobile Checkout Experience

### Design Principles

Real estate investors use Parcel on phones at property showings, open houses, and while driving for dollars. Mobile checkout must be:
- **Fast**: Minimal taps between intent and payment
- **Thumb-friendly**: CTAs in bottom 40% of screen
- **Non-blocking**: Prefer inline degradation over full-screen interruptions

### Mobile-Specific Patterns

#### 1. UpgradeModal: Bottom Sheet on Mobile

```tsx
// Already implemented in UpgradeModal (Section 6):
// - Desktop: <Dialog> centered modal
// - Mobile (<md): <Sheet side="bottom"> with swipe-to-dismiss
// The Sheet component is already in the codebase
```

#### 2. Trial Banner: Sticky Bottom Bar on Mobile

```tsx
// frontend/src/components/billing/TrialBanner.tsx

export function TrialBanner({ trialEndsAt }: { trialEndsAt: Date }) {
  const isMobile = useMediaQuery('(max-width: 768px)')
  const daysRemaining = Math.ceil((trialEndsAt.getTime() - Date.now()) / 86400000)

  if (daysRemaining > 7) return null

  const bannerClasses = isMobile
    ? 'fixed bottom-0 inset-x-0 z-40 px-4 py-3 pb-safe' // sticky bottom on mobile
    : 'w-full px-4 py-2.5' // static between topbar and main on desktop

  const urgency = daysRemaining <= 1 ? 'urgent' : daysRemaining <= 3 ? 'warning' : 'info'

  const colors = {
    info: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    warning: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    urgent: 'bg-red-500/10 border-red-500/20 text-red-400',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: isMobile ? 20 : -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${bannerClasses} ${colors[urgency]} border-t md:border-b md:border-t-0 flex items-center justify-between gap-3`}
    >
      <p className="text-sm font-medium truncate">
        {daysRemaining > 0
          ? `Pro trial ends in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`
          : 'Your Pro trial has ended'
        }
      </p>
      <Button
        size="sm"
        onClick={() => navigate('/pricing?source=trial_banner')}
        className="shrink-0 bg-[#6366F1] text-white text-xs px-3 py-1"
      >
        Upgrade
      </Button>
    </motion.div>
  )
}
```

#### 3. FeatureGate: Compact Lock on Mobile

On mobile, the blur overlay consumes too much of the small screen. Instead, degrade to a compact lock card:

```tsx
// Inside FeatureGate, detect mobile and switch rendering:
const isMobile = useMediaQuery('(max-width: 768px)')

if (isMobile && blur) {
  // Compact lock card instead of blur on mobile
  return (
    <button
      type="button"
      onClick={handleUnlockClick}
      className="w-full rounded-xl border border-border-subtle bg-app-surface p-4 flex items-center gap-3"
    >
      <Lock size={16} className="text-[#6366F1] shrink-0" />
      <div className="text-left flex-1">
        <p className="text-sm font-medium text-text-primary">
          {feature.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
        </p>
        <p className="text-xs text-text-muted">Requires {tierName} -- tap to upgrade</p>
      </div>
    </button>
  )
}
```

#### 4. Pricing Page: Horizontal Scroll on Mobile

On small screens, the 4-column pricing grid collapses to a horizontally scrollable carousel with snap points:

```tsx
// In PricingPage, replace the grid with scroll snap on mobile:
<div className="lg:grid lg:grid-cols-4 lg:gap-6 flex lg:flex-none overflow-x-auto snap-x snap-mandatory gap-4 pb-4 -mx-4 px-4 lg:mx-0 lg:px-0 lg:pb-0 lg:overflow-visible">
  {PLANS.map((plan) => (
    <div key={plan.key} className="snap-center shrink-0 w-[85vw] sm:w-[70vw] lg:w-auto">
      <PricingCard
        plan={plan}
        cycle={cycle}
        currentPlan={currentPlan}
        onSelect={handleSelectPlan}
        isLoading={loading}
      />
    </div>
  ))}
</div>
```

#### 5. Stripe Checkout on Mobile

Stripe Checkout is already mobile-optimized out of the box:
- Responsive layout
- Apple Pay / Google Pay button shown prominently when available (one-tap checkout)
- Auto-detects mobile browser and adjusts input fields
- Handles back-button navigation gracefully

No additional work needed -- this is a key advantage of using Checkout Sessions over Elements.

---

## 10. Analytics Events

### Funnel Events (Track Through the Entire Journey)

```typescript
// frontend/src/lib/analytics.ts

type UpgradeEvent =
  | 'feature_gate_shown'      // User saw a locked feature (blur or lock)
  | 'feature_gate_clicked'    // User clicked the upgrade CTA on a gate
  | 'upgrade_modal_shown'     // UpgradeModal opened
  | 'upgrade_modal_dismissed' // UpgradeModal closed without action
  | 'upgrade_modal_clicked'   // User clicked "Upgrade to X" in modal
  | 'pricing_page_viewed'     // User landed on /pricing
  | 'pricing_plan_selected'   // User clicked a plan's CTA button
  | 'checkout_started'        // POST /billing/checkout succeeded, redirecting
  | 'checkout_completed'      // User returned with ?upgrade=success
  | 'checkout_canceled'       // User returned with ?upgrade=canceled
  | 'checkout_abandoned'      // Checkout Session expired (server-side event)
  | 'trial_banner_shown'      // Trial banner rendered
  | 'trial_banner_clicked'    // User clicked upgrade from trial banner
  | 'usage_toast_shown'       // Usage limit toast shown
  | 'usage_toast_clicked'     // User clicked upgrade from usage toast
  | 'plan_changed'            // Plan change completed (upgrade/downgrade)
  | 'subscription_canceled'   // User canceled subscription
  | 'success_overlay_shown'   // Success overlay displayed
  | 'success_overlay_cta'     // User clicked primary CTA on success overlay

interface EventPayload {
  plan?: string
  cycle?: string
  feature?: string
  source?: string
  days_remaining?: number
  usage_percent?: number
  current_plan?: string
  target_plan?: string
}

export function trackEvent(event: UpgradeEvent, payload: EventPayload = {}) {
  // 1. Log to user_events table via backend
  api.events.track(event, payload).catch(() => {
    // Fire-and-forget — never block UI for analytics
  })

  // 2. Send to PostHog / Mixpanel (when integrated)
  if (typeof window !== 'undefined' && (window as any).posthog) {
    ;(window as any).posthog.capture(event, payload)
  }
}
```

### Backend Event Tracking

```python
# backend/routers/events.py

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any

router = APIRouter(prefix="/api/v1/events", tags=["events"])

class TrackEventRequest(BaseModel):
    event_type: str
    metadata: Dict[str, Any] = {}

@router.post("/track")
async def track_event(
    body: TrackEventRequest,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Log a user event for analytics and cohort analysis."""
    event = UserEvent(
        user_id=current_user.id,
        event_type=body.event_type,
        event_metadata=body.metadata,
    )
    db.add(event)
    db.commit()
    return {"status": "ok"}
```

### Funnel Visualization

The events form a conversion funnel:

```
feature_gate_shown          (100% — denominator)
  └── feature_gate_clicked  (target: 30-40% of impressions)
      └── upgrade_modal_shown / pricing_page_viewed  (target: 80%+ of clicks)
          └── checkout_started  (target: 40-50% of page views)
              └── checkout_completed  (target: 60-70% of starts)
```

### Key Metrics to Derive

| Metric | Formula | Target |
|---|---|---|
| Paywall click-through rate | `feature_gate_clicked / feature_gate_shown` | >30% |
| Pricing page conversion | `checkout_started / pricing_page_viewed` | >15% |
| Checkout completion rate | `checkout_completed / checkout_started` | >65% |
| Trial-to-paid conversion | `checkout_completed (by trial users) / total trial users` | >15% |
| Upgrade funnel efficiency | `checkout_completed / feature_gate_shown` | >5% |
| Most-gated feature | Feature with highest `feature_gate_shown` count | (diagnostic) |
| Highest-converting feature | Feature with highest gate-to-checkout ratio | (optimization lever) |

### Where to Place Track Calls

| Component | Event | When |
|---|---|---|
| `FeatureGate` | `feature_gate_shown` | On mount (once per session per feature) |
| `FeatureGate` | `feature_gate_clicked` | On click of upgrade CTA |
| `UpgradeModal` | `upgrade_modal_shown` | On open |
| `UpgradeModal` | `upgrade_modal_dismissed` | On close without action |
| `UpgradeModal` | `upgrade_modal_clicked` | On "Upgrade to X" click |
| `PricingPage` | `pricing_page_viewed` | On mount |
| `PricingPage` | `pricing_plan_selected` | On plan CTA click |
| `useCheckoutRedirect` | `checkout_started` | After successful POST /billing/checkout |
| `PricingPage` | `checkout_completed` | On `?upgrade=success` detection |
| `PricingPage` | `checkout_canceled` | On `?upgrade=canceled` detection |
| `TrialBanner` | `trial_banner_shown` | On mount |
| `TrialBanner` | `trial_banner_clicked` | On upgrade CTA click |
| `UpgradeSuccessOverlay` | `success_overlay_shown` | On mount |
| `UpgradeSuccessOverlay` | `success_overlay_cta` | On primary CTA click |

---

## 11. CRITICAL DECISIONS

These decisions require explicit product/engineering alignment before implementation. Each has significant downstream implications.

### Decision 1: Tier Structure -- 3 Tiers vs 4 Tiers

**Context**: The existing landing page (`constants.ts`) shows 3 tiers: Free / Pro ($29) / Team ($99). The research brief suggests 4 tiers: Free / Starter ($29) / Pro ($69) / Team ($149).

**Options**:

| Option | Tiers | Monthly Prices | Tradeoff |
|---|---|---|---|
| A (Current) | Free / Pro / Team | $0 / $29 / $99 | Simpler. $29 is a low barrier. But the jump from Free features to Pro features is large. |
| B (Brief) | Free / Starter / Pro / Team | $0 / $29 / $69 / $149 | Captures the "I need more than 5 but don't need AI docs" segment. More complexity to maintain. |

**Recommendation**: Start with **Option A** (3 tiers). Add a Starter tier only after data shows a cohort of users who hit Free limits but do not convert to Pro -- that is the signal that a mid-tier is needed. Fewer plans = simpler decision for the user = higher conversion. The 4-tier model is designed into this document (the component code supports both) so adding it later is a configuration change, not a refactor.

**This document uses the 4-tier model in code examples to demonstrate the full architecture. To ship 3-tier, remove Starter from the PLANS array.**

### Decision 2: Trial Model -- Card-Upfront vs No-Card

**Context**: The research supports both approaches.

| Model | Conversion Rate | Tradeoff |
|---|---|---|
| No-card trial (current plan) | 15-25% trial-to-paid | More signups, lower conversion, longer payback period |
| Card-upfront trial | 50-60% trial-to-paid | Fewer signups, higher conversion, but adds friction to onboarding |

**Recommendation**: Keep **no-card trial** for now. Parcel is pre-revenue and needs volume of users to validate product-market fit. Optimizing for conversion rate before having enough users is premature. The Stripe Checkout Session for the actual subscription (post-trial) is where the card is collected.

### Decision 3: Trial Duration -- 14 Days vs 7 Days vs 21 Days

**Context**: Current plan is 14 days. Real estate deals move slowly -- a user might not have a live deal to analyze during a short window.

**Recommendation**: Start with **14 days**. This is industry-standard for B2B SaaS and gives users two weekends (when RE investors are most active). A/B test against 21 days in Month 3 after establishing a baseline conversion rate.

### Decision 4: Checkout Destination -- Stripe Hosted vs Embedded Elements

**Context**: The research strongly recommends Stripe Checkout Sessions (hosted) over Elements (embedded) for Parcel v1.

**Decision**: **Use Stripe Checkout Sessions.** The tradeoffs:
- Pro: Zero PCI burden, built-in Apple Pay/Google Pay/Link, mobile-optimized, 3D Secure handled, promo code input built-in, fastest to implement
- Con: User briefly leaves Parcel (mitigated by fast redirect back), cannot use Parcel's #6366F1 indigo theme on the checkout page

The redirect is 2-3 seconds round-trip. This is acceptable. Migrate to Elements only if/when conversion data shows the redirect is causing drop-off (unlikely before $1M ARR).

### Decision 5: Success Destination -- /pricing Overlay vs Dedicated /success Route vs /settings/billing

**Context**: Where does the user land after successful payment?

**Decision**: **Overlay on /pricing** (as implemented in this document). Reasons:
- No dead-end page that breaks back-button navigation
- User sees their plan has changed on the pricing table underneath the overlay
- CTA routes them to the most relevant feature, not a generic dashboard
- URL params cleaned after display, so refresh does not re-trigger

### Decision 6: Downgrade Policy -- Hard Lock vs Read-Only Freeze

**Context**: When a Pro user downgrades to Free, what happens to their data above Free limits?

**Decision**: **Read-only freeze with 30-day grace period.** Users can always VIEW data they created. They cannot CREATE new items above the Free limit. Shared links auto-expire after 30 days. Documents remain downloadable. This preserves trust and creates upgrade motivation without hostility.

### Decision 7: Feature-Gating Enforcement -- Frontend Only vs Backend + Frontend

**Decision**: **Both.** Never trust the frontend alone.
- Backend: `require_plan("pro")` dependency on protected endpoints. Returns 403 with `X-Required-Plan` header.
- Frontend: `FeatureGate` component prevents the user from reaching the endpoint. Shows upgrade CTA instead.
- If a user bypasses the frontend (API call), the backend still blocks them.

### Decision 8: Usage Limit Reset Timing -- Calendar Month vs Rolling 30 Days

**Context**: "3 analyses per month" -- does this reset on the 1st of every month, or 30 days after signup?

**Decision**: **Calendar month reset** (simpler to implement, easier for users to understand). Reset all usage counters on the 1st at 00:00 UTC. Store `usage_analyses_count` and `usage_period_start` on the user model. Stripe subscriptions use the same billing anchor pattern.

### Decision 9: Annual Plan Default Toggle Position

**Context**: Should the billing toggle default to Monthly or Annual on the pricing page?

**Decision**: Default to **Monthly**. Reasons:
- Lower sticker shock on first view
- User who toggles to Annual and sees savings feels they "discovered" a deal
- A/B test this (experiment PW-06) after launch

### Decision 10: When to Show the First Upgrade Prompt

**Context**: The research says "never show an upgrade prompt during the first 3 days (activation phase)." But usage limits could be hit on Day 1.

**Decision**:
- **Hard limits** (e.g., 3rd analysis on Free): Always show the paywall when the limit is hit, regardless of day. The user took an action and expects a result. Blocking silently is worse.
- **Soft prompts** (e.g., trial countdown, feature discovery nudges): Suppress for the first 72 hours. Let the user explore without pressure.
- **Implementation**: `FeatureGate` always enforces. `TrialBanner` checks `created_at + 72 hours` before rendering. Usage toasts check the same threshold.

---

### Billing Store (Zustand)

```typescript
// frontend/src/stores/billingStore.ts

import { create } from 'zustand'
import { api } from '@/lib/api'
import type { Plan } from '@/types/billing'

type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'none'

interface UsageLimits {
  analyses: { used: number; limit: number }
  documents: { used: number; limit: number }
  pipeline_deals: { used: number; limit: number }
  ai_messages: { used: number; limit: number }
}

interface BillingState {
  plan: Plan
  status: SubscriptionStatus
  cycle: 'monthly' | 'annual' | null
  trialEndsAt: Date | null
  currentPeriodEnd: Date | null
  usage: UsageLimits
  hasEverSubscribed: boolean
  isLoaded: boolean

  fetchBilling: () => Promise<void>
  setPlan: (plan: Plan) => void
}

export const useBillingStore = create<BillingState>()((set) => ({
  plan: 'free',
  status: 'none',
  cycle: null,
  trialEndsAt: null,
  currentPeriodEnd: null,
  usage: {
    analyses: { used: 0, limit: 3 },
    documents: { used: 0, limit: 0 },
    pipeline_deals: { used: 0, limit: 5 },
    ai_messages: { used: 0, limit: 5 },
  },
  hasEverSubscribed: false,
  isLoaded: false,

  fetchBilling: async () => {
    try {
      const data = await api.billing.getStatus()
      set({
        plan: data.plan as Plan,
        status: data.status as SubscriptionStatus,
        cycle: data.cycle,
        trialEndsAt: data.trial_ends_at ? new Date(data.trial_ends_at) : null,
        currentPeriodEnd: data.current_period_end ? new Date(data.current_period_end) : null,
        usage: data.usage,
        hasEverSubscribed: data.has_ever_subscribed,
        isLoaded: true,
      })
    } catch {
      set({ isLoaded: true })
    }
  },

  setPlan: (plan) => set({ plan }),
}))

// Dismissed paywalls store (session-scoped — resets on page reload)
interface DismissedPaywallsState {
  dismissed: Set<string>
  dismiss: (feature: string) => void
  isDismissed: (feature: string) => boolean
}

export const useDismissedPaywalls = create<DismissedPaywallsState>()((set, get) => ({
  dismissed: new Set(),
  dismiss: (feature) => set((state) => ({
    dismissed: new Set(state.dismissed).add(feature),
  })),
  isDismissed: (feature) => get().dismissed.has(feature),
}))
```

### Types

```typescript
// frontend/src/types/billing.ts

export type Plan = 'free' | 'starter' | 'pro' | 'team'
export type BillingCycle = 'monthly' | 'annual'
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'none'

export interface BillingStatus {
  plan: Plan
  cycle: BillingCycle | null
  status: SubscriptionStatus
  trial_ends_at: string | null
  current_period_end: string | null
  has_ever_subscribed: boolean
  usage: {
    analyses: { used: number; limit: number }
    documents: { used: number; limit: number }
    pipeline_deals: { used: number; limit: number }
    ai_messages: { used: number; limit: number }
  }
}
```

### Files to Create

```
Frontend:
  src/types/billing.ts                          — Plan, BillingCycle, BillingStatus types
  src/stores/billingStore.ts                    — Zustand billing + dismissed paywalls store
  src/pages/PricingPage.tsx                     — In-app pricing page
  src/components/billing/FeatureGate.tsx         — Blur/lock wrapper for gated features
  src/components/billing/UpgradeModal.tsx        — Modal (desktop) / Sheet (mobile) upgrade prompt
  src/components/billing/UpgradeSuccessOverlay.tsx — Post-checkout celebration overlay
  src/components/billing/FeatureComparisonTable.tsx — Full feature grid below pricing cards
  src/components/billing/TrialBanner.tsx         — Countdown banner (7 days → expiration)
  src/components/billing/UsageMeter.tsx          — Progress bar for usage limits
  src/hooks/useCheckoutRedirect.ts              — Shared checkout logic with error handling
  src/lib/analytics.ts                          — trackEvent function for funnel events

Backend:
  routers/billing.py                            — /checkout, /portal, /status, /change-plan, /cancel
  routers/webhooks.py                           — /webhooks/stripe handler
  routers/events.py                             — /events/track endpoint
  core/billing/access.py                        — get_effective_plan, require_plan dependency
  core/billing/constants.py                     — PLAN_LIMITS, PLAN_HIERARCHY
```

### Dependency Additions

```
Frontend: canvas-confetti (3KB, confetti animation on success)
Backend:  stripe>=8.0.0 (Stripe Python SDK)
```
