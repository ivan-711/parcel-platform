# Agent 09: Onboarding & Activation Flow Design

> Implementation-ready design for the new user experience from registration through
> "aha moment." Covers registration, wizard, empty states, sample deals, checklist,
> quick analysis, personalization, activation metrics, trial integration, and backend
> tracking.
>
> Date: 2026-03-28

---

## Table of Contents

1. [Registration Form](#1-registration-form)
2. [Post-Registration Flow](#2-post-registration-flow)
3. [Onboarding Wizard](#3-onboarding-wizard)
4. [Empty State Designs](#4-empty-state-designs)
5. [Pre-Populated Sample Deal](#5-pre-populated-sample-deal)
6. [Onboarding Checklist Component](#6-onboarding-checklist-component)
7. [Quick Analysis Shortcut](#7-quick-analysis-shortcut)
8. [Personalization Engine](#8-personalization-engine)
9. [Activation Metric Definition](#9-activation-metric-definition)
10. [Trial System Integration](#10-trial-system-integration)
11. [Backend: Onboarding Progress Tracking](#11-backend-onboarding-progress-tracking)
12. [CRITICAL DECISIONS](#critical-decisions)

---

## 1. Registration Form

### Current State

`frontend/src/pages/Register.tsx` collects: **name, email, password, role** (wholesaler /
investor / agent). Role is presented as three cards with icons and short descriptions.
The backend `POST /api/v1/auth/register` already validates reserved emails and rate-limits
to 3 requests/minute.

### Design Decision: Keep Registration Lean

Registration stays exactly as-is. Adding strategy or experience fields to the signup form
would increase friction on the highest-leverage conversion boundary (visitor to user).
Those fields move to the post-registration micro-wizard where abandonment costs less.

**Registration form fields (unchanged):**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| name | text | Yes | Non-empty |
| email | email | Yes | Valid format, not reserved |
| password | password | Yes | Min 8 chars |
| role | card-select | Yes | wholesaler / investor / agent |

**One addition to the registration response:** After a successful register, the backend
returns the user object. The response now also includes `onboarding_completed: false` and
`trial_ends_at` (14 days from now). The frontend reads `onboarding_completed` to decide
whether to redirect to `/onboarding` or `/dashboard`.

### Backend Change: `POST /api/v1/auth/register` Response

```python
# In auth.py register handler, after user creation:
# 1. Create default subscription (free plan with 14-day pro trial)
# 2. Initialize onboarding_progress JSONB on user record
# 3. Create strategy-matched sample deal (done async after response)

# Response shape adds:
{
    "user": {
        "id": "...",
        "name": "...",
        "email": "...",
        "role": "investor",
        "plan": "pro",              # NEW — trial starts on pro
        "plan_status": "trialing",  # NEW
        "trial_ends_at": "...",     # NEW — 14 days from now
        "onboarding_completed": false,  # NEW
        "created_at": "..."
    }
}
```

### Frontend Change: Post-Register Redirect

```typescript
// In useAuth.ts — useRegister hook
// After successful registration:
const onSuccess = (data: AuthResponse) => {
  setAuth(data.user)
  if (!data.user.onboarding_completed) {
    navigate('/onboarding')  // NEW — route to wizard
  } else {
    navigate('/dashboard')
  }
}
```

---

## 2. Post-Registration Flow

### Full Journey: Registration to Aha Moment

```
┌──────────────────────────────────────────────────────────────────────┐
│                     REGISTRATION TO AHA MOMENT                       │
│                                                                      │
│  /register (30s)                                                     │
│      │                                                               │
│      ▼                                                               │
│  /onboarding (30s)                                                   │
│      Screen 1: Strategy picker (5 cards + "I use multiple")          │
│      Screen 2: Experience level (4 options)                          │
│      │                                                               │
│      ▼                                                               │
│  /dashboard (first visit)                                            │
│      ├─ Welcome banner with trial countdown                          │
│      ├─ Onboarding checklist (right panel / bottom sheet on mobile)  │
│      ├─ Sample deal card for chosen strategy                         │
│      └─ "Analyze your first deal" CTA                                │
│      │                                                               │
│      ▼                                                               │
│  /analyze/results/:sampleDealId (instant)                            │
│      User clicks sample deal → sees full results with real numbers   │
│      Banner: "This is a sample deal. Analyze your own →"             │
│      │                                                               │
│      ▼  (AHA MOMENT — under 90 seconds from signup)                  │
│      │                                                               │
│  /analyze/:strategy (user's own deal)                                │
│      Pre-filled smart defaults if experience = "first deal"          │
│      │                                                               │
│      ▼                                                               │
│  /analyze/results/:newDealId                                         │
│      Full results → Save → Add to Pipeline → AI Chat prompt          │
│      (Total time: ~4-5 minutes)                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Route Setup

New route in `App.tsx`:

```typescript
const Onboarding = lazy(() => import('@/pages/Onboarding'))

// Inside AnimatedRoutes, after register route:
<Route
  path="/onboarding"
  element={
    <ProtectedRoute>
      <PageErrorBoundary>
        <Onboarding />
      </PageErrorBoundary>
    </ProtectedRoute>
  }
/>
```

### Redirect Logic

The onboarding route needs a guard: if the user has already completed onboarding, redirect
to dashboard. This prevents stale bookmarks from re-showing the wizard.

```typescript
// Inside Onboarding page component:
const user = useAuthStore((s) => s.user)
if (user?.onboarding_completed) {
  return <Navigate to="/dashboard" replace />
}
```

---

## 3. Onboarding Wizard

### File: `frontend/src/pages/Onboarding.tsx`

Two-step wizard. No AppShell (full-screen, clean). Skip link always visible. Progress
indicator (dots) at top. Framer Motion page transitions between steps.

### Step 1: Strategy Preference

```typescript
interface StrategyOption {
  value: Strategy | 'multiple'
  label: string
  description: string
  icon: string         // Lucide icon name
  exampleMetric: string // e.g., "Cash-on-Cash Return"
}

const STRATEGY_OPTIONS: StrategyOption[] = [
  {
    value: 'wholesale',
    label: 'Wholesale',
    description: 'Find deals, assign contracts, collect fees',
    icon: 'tag',
    exampleMetric: 'Assignment Fee',
  },
  {
    value: 'flip',
    label: 'Fix & Flip',
    description: 'Buy, rehab, and sell for profit',
    icon: 'hammer',
    exampleMetric: 'Total Profit',
  },
  {
    value: 'brrrr',
    label: 'BRRRR',
    description: 'Buy, rehab, rent, refinance, repeat',
    icon: 'repeat',
    exampleMetric: 'Cash-on-Cash Return',
  },
  {
    value: 'buy_and_hold',
    label: 'Buy & Hold',
    description: 'Acquire rentals for long-term cash flow',
    icon: 'home',
    exampleMetric: 'Monthly Cash Flow',
  },
  {
    value: 'creative_finance',
    label: 'Creative Finance',
    description: 'Subject-to, seller financing, wraps',
    icon: 'lightbulb',
    exampleMetric: 'Cash Flow Spread',
  },
  {
    value: 'multiple',
    label: 'I Use Multiple',
    description: 'Compare strategies side by side',
    icon: 'layers',
    exampleMetric: 'Strategy Comparison',
  },
]
```

**Visual Design:**

```
┌─────────────────────────────────────────────────────┐
│            ● ○                                       │
│                                                      │
│     What's your primary investment strategy?         │
│                                                      │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐          │
│  │  Wholesale │ │ Fix & Flip│ │   BRRRR   │          │
│  │   [icon]   │ │   [icon]  │ │   [icon]  │          │
│  │ Assign     │ │ Buy, rehab│ │ Buy, rehab│          │
│  │ contracts  │ │ sell      │ │ rent, refi│          │
│  └───────────┘ └───────────┘ └───────────┘          │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐          │
│  │ Buy & Hold│ │ Creative  │ │ I Use     │          │
│  │   [icon]   │ │ Finance   │ │ Multiple  │          │
│  │ Long-term  │ │ Subject-to│ │ Compare   │          │
│  │ cash flow  │ │ wraps     │ │ side by   │          │
│  └───────────┘ └───────────┘ └───────────┘          │
│                                                      │
│                         [Continue →]                 │
│                                                      │
│                    Skip for now                      │
└─────────────────────────────────────────────────────┘
```

- Cards use `border-accent-primary bg-accent-primary/10` when selected.
- Single-select (clicking one deselects others).
- "I Use Multiple" triggers comparison-focused personalization downstream.

### Step 2: Experience Level

```typescript
interface ExperienceOption {
  value: 'first' | '1-5' | '5-20' | '20+'
  label: string
  sublabel: string
}

const EXPERIENCE_OPTIONS: ExperienceOption[] = [
  { value: 'first', label: 'This is my first deal', sublabel: 'New to real estate investing' },
  { value: '1-5', label: '1-5 deals', sublabel: 'Getting started' },
  { value: '5-20', label: '5-20 deals', sublabel: 'Experienced investor' },
  { value: '20+', label: '20+ deals', sublabel: 'Seasoned professional' },
]
```

**Visual Design:**

```
┌─────────────────────────────────────────────────────┐
│            ○ ●                                       │
│                                                      │
│     How many deals have you analyzed?                │
│                                                      │
│  ┌─────────────────────────────────────────────┐     │
│  │  ○  This is my first deal                   │     │
│  │     New to real estate investing             │     │
│  ├─────────────────────────────────────────────┤     │
│  │  ○  1-5 deals                               │     │
│  │     Getting started                          │     │
│  ├─────────────────────────────────────────────┤     │
│  │  ○  5-20 deals                              │     │
│  │     Experienced investor                     │     │
│  ├─────────────────────────────────────────────┤     │
│  │  ○  20+ deals                               │     │
│  │     Seasoned professional                    │     │
│  └─────────────────────────────────────────────┘     │
│                                                      │
│  [← Back]                    [Get Started →]         │
│                                                      │
│                    Skip for now                      │
└─────────────────────────────────────────────────────┘
```

- Radio-button style (list, not grid) for clear hierarchy.
- "Get Started" submits both steps and redirects to dashboard.
- "Skip for now" saves `wizard_skipped: true` and uses defaults (strategy based on role,
  experience = "1-5").

### Wizard Submission

```typescript
// POST /api/v1/onboarding/profile
const payload = {
  primary_strategy: selectedStrategy,   // 'brrrr' | 'flip' | ... | 'multiple'
  experience_level: selectedExperience, // 'first' | '1-5' | '5-20' | '20+'
}

// On success:
// 1. Backend creates sample deal matched to strategy
// 2. Backend marks wizard_completed = true in onboarding_progress
// 3. Frontend navigates to /dashboard
```

### Component Implementation

```tsx
// frontend/src/pages/Onboarding.tsx

import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/lib/api'
import type { Strategy } from '@/types'

type WizardStrategy = Strategy | 'multiple'
type ExperienceLevel = 'first' | '1-5' | '5-20' | '20+'

export default function Onboarding() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const setAuth = useAuthStore((s) => s.setAuth)
  const [step, setStep] = useState(0)
  const [strategy, setStrategy] = useState<WizardStrategy | null>(null)
  const [experience, setExperience] = useState<ExperienceLevel | null>(null)

  const submit = useMutation({
    mutationFn: (data: { primary_strategy: WizardStrategy; experience_level: ExperienceLevel }) =>
      api.onboarding.saveProfile(data),
    onSuccess: (updatedUser) => {
      setAuth(updatedUser)
      navigate('/dashboard', { replace: true })
    },
  })

  // Guard: already completed onboarding
  if (user?.onboarding_completed) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSkip = () => {
    submit.mutate({
      primary_strategy: strategy ?? getDefaultStrategy(user?.role),
      experience_level: experience ?? '1-5',
    })
  }

  const handleComplete = () => {
    if (!strategy || !experience) return
    submit.mutate({ primary_strategy: strategy, experience_level: experience })
  }

  return (
    <div className="min-h-screen bg-app-bg flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[560px]">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {[0, 1].map((i) => (
            <div
              key={i}
              className={cn(
                'w-2 h-2 rounded-full transition-colors',
                i === step ? 'bg-accent-primary' : 'bg-border-subtle'
              )}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="step-0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Step 1: Strategy Picker */}
              <h1 className="text-xl font-semibold text-text-primary text-center mb-2">
                What's your primary investment strategy?
              </h1>
              <p className="text-sm text-text-secondary text-center mb-6">
                We'll personalize your experience based on how you invest.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {STRATEGY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setStrategy(opt.value)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-xl border text-center transition-colors',
                      strategy === opt.value
                        ? 'border-accent-primary bg-accent-primary/10 text-text-primary'
                        : 'border-border-subtle hover:border-border-default text-text-secondary'
                    )}
                  >
                    {/* Icon rendered here */}
                    <span className="text-sm font-medium">{opt.label}</span>
                    <span className="text-[11px] text-text-muted leading-tight">
                      {opt.description}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between mt-8">
                <button
                  type="button"
                  onClick={handleSkip}
                  className="text-xs text-text-muted hover:text-text-secondary transition-colors"
                >
                  Skip for now
                </button>
                <Button
                  onClick={() => setStep(1)}
                  disabled={!strategy}
                  className="gap-2 bg-accent-primary hover:bg-accent-hover text-white"
                >
                  Continue
                  <ArrowRight size={14} />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Step 2: Experience Level */}
              <h1 className="text-xl font-semibold text-text-primary text-center mb-2">
                How many deals have you analyzed?
              </h1>
              <p className="text-sm text-text-secondary text-center mb-6">
                This helps us tailor guidance to your experience.
              </p>

              <div className="space-y-2">
                {EXPERIENCE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setExperience(opt.value)}
                    className={cn(
                      'w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-colors',
                      experience === opt.value
                        ? 'border-accent-primary bg-accent-primary/10'
                        : 'border-border-subtle hover:border-border-default'
                    )}
                  >
                    <div
                      className={cn(
                        'w-4 h-4 rounded-full border-2 shrink-0 transition-colors',
                        experience === opt.value
                          ? 'border-accent-primary bg-accent-primary'
                          : 'border-border-default'
                      )}
                    />
                    <div>
                      <p className="text-sm font-medium text-text-primary">{opt.label}</p>
                      <p className="text-xs text-text-muted">{opt.sublabel}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between mt-8">
                <Button
                  variant="ghost"
                  onClick={() => setStep(0)}
                  className="gap-2 text-text-secondary"
                >
                  <ArrowLeft size={14} />
                  Back
                </Button>
                <Button
                  onClick={handleComplete}
                  disabled={!experience || submit.isPending}
                  className="gap-2 bg-accent-primary hover:bg-accent-hover text-white"
                >
                  {submit.isPending ? 'Setting up...' : 'Get Started'}
                  <ArrowRight size={14} />
                </Button>
              </div>

              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={handleSkip}
                  className="text-xs text-text-muted hover:text-text-secondary transition-colors"
                >
                  Skip for now
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function getDefaultStrategy(role?: string): WizardStrategy {
  if (role === 'wholesaler') return 'wholesale'
  if (role === 'agent') return 'flip'
  return 'brrrr'
}
```

---

## 4. Empty State Designs

Every major page needs an empty state that is action-oriented and personalized. The
pattern: illustration/icon + headline + 1-sentence explanation + prominent CTA +
secondary action.

### 4.1 Dashboard Empty State (Enhanced)

The dashboard currently shows a basic "Analyze your first deal" CTA. Enhance it to include
the onboarding checklist and sample deal.

```
┌──────────────────────────────────────────────────────────────────┐
│  DASHBOARD                                                        │
│                                                                   │
│  ┌─ Welcome Banner ─────────────────────────────────────────────┐ │
│  │  Welcome, Jane! Your 14-day Pro trial is active.             │ │
│  │  Try every feature free — no card required.    [12 days left]│ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─ Main Content ─────────────────┐  ┌─ Checklist Panel ───────┐ │
│  │                                │  │  Getting Started         │ │
│  │  ┌─ Sample Deal Card ────────┐ │  │                         │ │
│  │  │ [EXAMPLE] 742 Evergreen   │ │  │  [x] Create account    │ │
│  │  │ BRRRR · Memphis TN       │ │  │  [ ] Analyze first deal │ │
│  │  │ Cash-on-Cash: 14.2%      │ │  │  [ ] Review AI results  │ │
│  │  │ Monthly CF: $340         │ │  │  [ ] Add to pipeline    │ │
│  │  │                          │ │  │  [ ] Try AI chat        │ │
│  │  │  [View Analysis]         │ │  │                         │ │
│  │  └──────────────────────────┘ │  │  ██████░░░░ 1/5         │ │
│  │                                │  │                         │ │
│  │  Or start fresh:              │  │  [Dismiss]              │ │
│  │  [Analyze Your Own Deal →]    │  └─────────────────────────┘ │
│  │                                │                              │
│  │  ┌─ Feature Hints ──────────┐ │                              │
│  │  │ [Pipeline] [Docs] [Chat] │ │                              │
│  │  └──────────────────────────┘ │                              │
│  └────────────────────────────────┘                              │
└──────────────────────────────────────────────────────────────────┘
```

**Key behavior:**
- Welcome banner shows trial days remaining (reads `user.trial_ends_at`)
- Sample deal card has an "EXAMPLE" badge (muted indigo outline, text-xs uppercase)
- "View Analysis" links to `/analyze/results/:sampleDealId`
- "Analyze Your Own Deal" links to `/analyze/:userStrategy`
- Feature hint cards link to actual routes (not static text)
- Checklist panel is collapsible on desktop, bottom sheet on mobile

### 4.2 My Deals Empty State

```tsx
<div className="flex flex-col items-center justify-center py-16 space-y-4">
  <div className="w-14 h-14 rounded-2xl bg-accent-primary/10 border border-accent-primary/20
                  flex items-center justify-center">
    <FolderOpen size={24} className="text-accent-primary" />
  </div>
  <h3 className="text-base font-semibold text-text-primary">No deals yet</h3>
  <p className="text-sm text-text-secondary text-center max-w-sm">
    Run your first analysis to see it here. Every deal you analyze is
    saved automatically.
  </p>
  <Button asChild className="gap-2 bg-accent-primary hover:bg-accent-hover text-white">
    <Link to="/analyze">
      <Calculator size={14} />
      Analyze Your First Deal
    </Link>
  </Button>
  {sampleDealId && (
    <Button variant="ghost" asChild className="text-xs text-text-muted">
      <Link to={`/analyze/results/${sampleDealId}`}>
        Or view the sample deal
      </Link>
    </Button>
  )}
</div>
```

### 4.3 Pipeline Empty State

```tsx
<div className="flex flex-col items-center justify-center py-16 space-y-4">
  <div className="w-14 h-14 rounded-2xl bg-accent-primary/10 border border-accent-primary/20
                  flex items-center justify-center">
    <GitBranch size={24} className="text-accent-primary" />
  </div>
  <h3 className="text-base font-semibold text-text-primary">Your pipeline is empty</h3>
  <p className="text-sm text-text-secondary text-center max-w-sm">
    Track deals from lead to close. Analyze a deal first, then add it to your pipeline.
  </p>
  <div className="flex gap-3">
    <Button asChild className="gap-2 bg-accent-primary hover:bg-accent-hover text-white">
      <Link to="/analyze">
        <Calculator size={14} />
        Analyze a Deal
      </Link>
    </Button>
  </div>
  {/* Mini Kanban preview showing stage names — visual hint of what the board looks like */}
  <div className="flex gap-2 mt-4 opacity-40">
    {['Lead', 'Analyzing', 'Offer Sent', 'Under Contract', 'Due Diligence'].map((s) => (
      <div key={s} className="px-3 py-1.5 rounded-lg border border-border-subtle text-[11px]
                              text-text-muted uppercase tracking-wider">
        {s}
      </div>
    ))}
  </div>
</div>
```

### 4.4 Portfolio Empty State

```tsx
<div className="flex flex-col items-center justify-center py-16 space-y-4">
  <div className="w-14 h-14 rounded-2xl bg-accent-primary/10 border border-accent-primary/20
                  flex items-center justify-center">
    <BarChart3 size={24} className="text-accent-primary" />
  </div>
  <h3 className="text-base font-semibold text-text-primary">No closed deals yet</h3>
  <p className="text-sm text-text-secondary text-center max-w-sm">
    Track your closed deals here to see your portfolio performance over time.
    Close a deal from your pipeline to get started.
  </p>
  <Button variant="outline" asChild className="gap-2">
    <Link to="/pipeline">
      <GitBranch size={14} />
      View Pipeline
    </Link>
  </Button>
</div>
```

### 4.5 Documents Empty State

```tsx
<div className="flex flex-col items-center justify-center py-16 space-y-4">
  <div className="w-14 h-14 rounded-2xl bg-accent-primary/10 border border-accent-primary/20
                  flex items-center justify-center">
    <FileText size={24} className="text-accent-primary" />
  </div>
  <h3 className="text-base font-semibold text-text-primary">No documents uploaded</h3>
  <p className="text-sm text-text-secondary text-center max-w-sm">
    Upload contracts, leases, or inspection reports. AI will extract key terms,
    parties, and risk flags automatically.
  </p>
  <Button className="gap-2 bg-accent-primary hover:bg-accent-hover text-white">
    <Upload size={14} />
    Upload a Document
  </Button>
</div>
```

### Design System Rules for Empty States

1. Icon: 56px container, rounded-2xl, `bg-accent-primary/10 border border-accent-primary/20`.
2. Headline: `text-base font-semibold text-text-primary`.
3. Description: `text-sm text-text-secondary text-center max-w-sm`.
4. Primary CTA: `bg-accent-primary` Button with icon.
5. Secondary action: `variant="ghost"` or `variant="outline"` Button.
6. Center everything vertically with `py-16`.
7. Always include a link to the next logical step, not just "learn more."

---

## 5. Pre-Populated Sample Deal

### Strategy: Create One Example Deal at Registration

When a user completes the onboarding wizard (or skips it), the backend creates a single
example deal in their account. This deal:

- Is matched to their selected strategy (or role-default if skipped)
- Has realistic, market-appropriate input values
- Has pre-computed outputs and risk score
- Is flagged as `is_example: true` in the database
- Does NOT count toward any plan limits
- Can be deleted by the user at any time

### Sample Deal Data

```python
# backend/core/onboarding/sample_deals.py

SAMPLE_DEALS: dict[str, dict] = {
    "wholesale": {
        "address": "1847 Poplar Ave, Memphis TN 38104",
        "zip_code": "38104",
        "property_type": "single_family",
        "strategy": "wholesale",
        "inputs": {
            "purchase_price": 65000,
            "arv": 145000,
            "repair_costs": 40000,
            "assignment_fee": 12000,
            "closing_costs_pct": 3,
            "holding_months": 1,
        },
    },
    "flip": {
        "address": "2301 Cooper St, Memphis TN 38104",
        "zip_code": "38104",
        "property_type": "single_family",
        "strategy": "flip",
        "inputs": {
            "purchase_price": 95000,
            "arv": 185000,
            "repair_costs": 45000,
            "holding_months": 5,
            "closing_costs_pct": 3,
            "financing_pct": 80,
            "interest_rate": 9.5,
            "monthly_holding_cost": 800,
        },
    },
    "brrrr": {
        "address": "742 Evergreen Terrace, Memphis TN 38104",
        "zip_code": "38104",
        "property_type": "single_family",
        "strategy": "brrrr",
        "inputs": {
            "purchase_price": 85000,
            "repair_costs": 35000,
            "arv": 165000,
            "monthly_rent": 1400,
            "down_payment_pct": 20,
            "interest_rate": 7.5,
            "loan_term_years": 30,
            "vacancy_rate": 8,
            "maintenance_pct": 10,
            "management_fee_pct": 8,
            "insurance_annual": 1200,
            "taxes_annual": 1800,
            "refinance_ltv": 75,
            "refinance_rate": 7.0,
        },
    },
    "buy_and_hold": {
        "address": "4420 Summer Ave, Memphis TN 38122",
        "zip_code": "38122",
        "property_type": "single_family",
        "strategy": "buy_and_hold",
        "inputs": {
            "purchase_price": 120000,
            "down_payment_pct": 25,
            "interest_rate": 7.25,
            "loan_term_years": 30,
            "monthly_rent": 1250,
            "vacancy_rate": 8,
            "maintenance_pct": 10,
            "management_fee_pct": 8,
            "insurance_annual": 1400,
            "taxes_annual": 2200,
            "closing_costs_pct": 3,
        },
    },
    "creative_finance": {
        "address": "889 McLean Blvd, Memphis TN 38104",
        "zip_code": "38104",
        "property_type": "single_family",
        "strategy": "creative_finance",
        "inputs": {
            "purchase_price": 150000,
            "existing_loan_balance": 95000,
            "existing_interest_rate": 4.5,
            "existing_loan_term_remaining": 22,
            "monthly_rent": 1600,
            "down_payment_to_seller": 15000,
            "seller_finance_amount": 40000,
            "seller_finance_rate": 6.0,
            "seller_finance_term": 5,
            "vacancy_rate": 8,
            "maintenance_pct": 10,
            "management_fee_pct": 8,
            "insurance_annual": 1500,
            "taxes_annual": 2400,
        },
    },
}

def get_sample_deal_for_strategy(strategy: str) -> dict:
    """Return the sample deal data for a given strategy, defaulting to BRRRR."""
    return SAMPLE_DEALS.get(strategy, SAMPLE_DEALS["brrrr"])
```

### Backend: Sample Deal Creation

```python
# In the onboarding profile save handler:

async def create_sample_deal(user_id: str, strategy: str, db: Session):
    """Create a pre-computed sample deal for onboarding."""
    from core.onboarding.sample_deals import get_sample_deal_for_strategy

    sample = get_sample_deal_for_strategy(strategy)

    # Dynamically import the calculator to compute outputs
    # (Same pattern as deals.py create_deal)
    calculator = import_calculator(sample["strategy"])
    outputs = calculator.calculate(sample["inputs"])
    risk_score = compute_risk_score(sample["strategy"], sample["inputs"], outputs)

    deal = Deal(
        id=uuid4(),
        user_id=user_id,
        address=sample["address"],
        zip_code=sample["zip_code"],
        property_type=sample["property_type"],
        strategy=sample["strategy"],
        inputs=sample["inputs"],
        outputs=outputs,
        risk_score=risk_score,
        status="example",          # NEW status value
        is_example=True,           # NEW boolean column
    )
    db.add(deal)
    db.commit()
    return deal
```

### Frontend: Sample Deal Treatment

The sample deal appears everywhere a normal deal does, but with visual differentiation:

```tsx
// Badge component for sample deals
function ExampleBadge() {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px]
                     font-medium uppercase tracking-wider
                     border border-accent-primary/30 text-accent-primary bg-accent-primary/5">
      Example
    </span>
  )
}

// On the Results page, show a banner:
{deal.is_example && (
  <motion.div
    variants={staggerItem}
    className="flex items-center justify-between rounded-xl border border-accent-primary/20
               bg-accent-primary/5 px-4 py-3"
  >
    <div className="flex items-center gap-2">
      <ExampleBadge />
      <p className="text-sm text-text-secondary">
        This is a sample deal. Edit the numbers or analyze your own property.
      </p>
    </div>
    <Button asChild variant="outline" size="sm" className="gap-2 shrink-0">
      <Link to={`/analyze/${deal.strategy}`}>
        Analyze Your Own
        <ArrowRight size={14} />
      </Link>
    </Button>
  </motion.div>
)}
```

### Database Change

Add `is_example` column to the `deals` table:

```python
# In Deal model
is_example = Column(Boolean, nullable=False, default=False, server_default="false")
```

Add `status="example"` as a valid deal status. Example deals are excluded from plan quota
counts (the `check_quota("deals")` guard filters `WHERE is_example = false`).

---

## 6. Onboarding Checklist Component

### File: `frontend/src/components/onboarding/OnboardingChecklist.tsx`

### Data Model

```typescript
interface OnboardingProgress {
  wizard_completed: boolean
  first_deal_analyzed: boolean
  report_reviewed: boolean       // Visited a results page
  pipeline_deal_added: boolean
  chat_used: boolean
  checklist_dismissed: boolean
  completed_at: string | null    // ISO timestamp when all 5 done
}

interface ChecklistItem {
  key: keyof Omit<OnboardingProgress, 'checklist_dismissed' | 'completed_at'>
  label: string
  description: string
  href: string
  autoComplete: boolean          // true = tracked by backend events
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    key: 'wizard_completed',
    label: 'Create your account',
    description: 'You\'re all set!',
    href: '/dashboard',
    autoComplete: true,
  },
  {
    key: 'first_deal_analyzed',
    label: 'Analyze your first deal',
    description: 'Run the numbers on a property',
    href: '/analyze',
    autoComplete: true,
  },
  {
    key: 'report_reviewed',
    label: 'Review your results',
    description: 'See projected returns and risk score',
    href: '/deals',
    autoComplete: true,
  },
  {
    key: 'pipeline_deal_added',
    label: 'Add a deal to your pipeline',
    description: 'Track deals from lead to close',
    href: '/pipeline',
    autoComplete: true,
  },
  {
    key: 'chat_used',
    label: 'Try the AI chat',
    description: 'Ask anything about real estate investing',
    href: '/chat',
    autoComplete: true,
  },
]
```

### Component Implementation

```tsx
// frontend/src/components/onboarding/OnboardingChecklist.tsx

import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronUp, ChevronDown, X, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'

export function OnboardingChecklist() {
  const queryClient = useQueryClient()
  const [collapsed, setCollapsed] = useState(false)

  const { data: progress, isLoading } = useQuery({
    queryKey: ['onboarding-progress'],
    queryFn: () => api.onboarding.getProgress(),
    staleTime: 30_000,
  })

  const dismiss = useMutation({
    mutationFn: () => api.onboarding.dismiss(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['onboarding-progress'] }),
  })

  if (isLoading || !progress || progress.checklist_dismissed) return null

  const completedCount = CHECKLIST_ITEMS.filter((item) => progress[item.key]).length
  const allComplete = completedCount === CHECKLIST_ITEMS.length
  const progressPct = (completedCount / CHECKLIST_ITEMS.length) * 100

  // Find the first incomplete item for highlighting
  const nextItem = CHECKLIST_ITEMS.find((item) => !progress[item.key])

  return (
    <div className="rounded-xl border border-border-subtle bg-app-surface overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-3 border-b border-border-subtle
                   hover:bg-app-elevated/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-accent-primary" />
          <span className="text-sm font-semibold text-text-primary">Getting Started</span>
          <span className="text-[11px] text-text-muted">{completedCount}/5</span>
        </div>
        {collapsed ? <ChevronDown size={14} className="text-text-muted" /> :
                     <ChevronUp size={14} className="text-text-muted" />}
      </button>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Progress bar */}
            <div className="px-4 pt-3 pb-2">
              <div className="w-full h-1.5 rounded-full bg-border-subtle overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-accent-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
            </div>

            {/* Checklist items */}
            <div className="px-2 pb-2 space-y-0.5">
              {CHECKLIST_ITEMS.map((item) => {
                const done = progress[item.key]
                const isNext = item.key === nextItem?.key

                return (
                  <Link
                    key={item.key}
                    to={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                      done
                        ? 'opacity-60'
                        : isNext
                          ? 'bg-accent-primary/5 border border-accent-primary/20'
                          : 'hover:bg-app-elevated/50'
                    )}
                  >
                    {/* Checkbox */}
                    <div
                      className={cn(
                        'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                        done
                          ? 'border-accent-success bg-accent-success'
                          : 'border-border-default'
                      )}
                    >
                      {done && <Check size={10} className="text-white" />}
                    </div>

                    {/* Text */}
                    <div className="min-w-0">
                      <p className={cn(
                        'text-sm font-medium',
                        done ? 'text-text-muted line-through' : 'text-text-primary'
                      )}>
                        {item.label}
                      </p>
                      {!done && (
                        <p className="text-[11px] text-text-muted">{item.description}</p>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>

            {/* Completion celebration or dismiss */}
            <div className="px-4 pb-3 pt-1">
              {allComplete ? (
                <div className="text-center py-2 space-y-2">
                  <p className="text-sm font-medium text-accent-success">All done! Great start.</p>
                  <button
                    type="button"
                    onClick={() => dismiss.mutate()}
                    className="text-xs text-text-muted hover:text-text-secondary transition-colors"
                  >
                    Dismiss checklist
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => dismiss.mutate()}
                  className="text-xs text-text-muted hover:text-text-secondary transition-colors"
                >
                  Dismiss
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
```

### Mobile: Bottom Sheet Variant

```tsx
// frontend/src/components/onboarding/OnboardingBottomBar.tsx
// Shows on mobile (block md:hidden) as a sticky bottom bar

export function OnboardingBottomBar() {
  const [expanded, setExpanded] = useState(false)
  const { data: progress } = useQuery({ queryKey: ['onboarding-progress'], ... })

  if (!progress || progress.checklist_dismissed) return null

  const completedCount = CHECKLIST_ITEMS.filter((item) => progress[item.key]).length

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 block md:hidden">
      {/* Collapsed bar */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3
                   bg-app-surface border-t border-border-subtle"
      >
        <span className="text-sm font-medium text-text-primary">
          {completedCount}/5 setup steps complete
        </span>
        <ChevronUp
          size={16}
          className={cn('text-text-muted transition-transform', expanded && 'rotate-180')}
        />
      </button>

      {/* Expanded sheet — renders the same checklist items */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="bg-app-surface border-t border-border-subtle overflow-hidden"
          >
            {/* Same checklist items as desktop */}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
```

### Integration into AppShell

```tsx
// In AppShell.tsx — desktop sidebar, below navigation:

import { OnboardingChecklist } from '@/components/onboarding/OnboardingChecklist'

// Inside the sidebar, after NAV_ACCOUNT section and before the logout button:
<div className="px-3 mt-auto mb-4">
  <OnboardingChecklist />
</div>

// At the bottom of AppShell, for mobile:
import { OnboardingBottomBar } from '@/components/onboarding/OnboardingBottomBar'

// After the main content area:
<OnboardingBottomBar />
```

### Auto-Completion Triggers

The checklist items auto-complete when specific backend events fire. These events are
tracked by existing endpoint handlers with a single additional call:

| Checklist Item | Backend Trigger | Where to Add |
|----------------|----------------|--------------|
| `wizard_completed` | Wizard submission | `POST /api/v1/onboarding/profile` |
| `first_deal_analyzed` | Deal creation (non-example) | `POST /api/v1/deals/` — after successful creation |
| `report_reviewed` | First results page view | `POST /api/v1/onboarding/complete` called from frontend on ResultsPage mount |
| `pipeline_deal_added` | Pipeline add | `POST /api/v1/pipeline/` — after successful creation |
| `chat_used` | Chat message sent | `POST /api/v1/chat/` — after streaming completes |

The frontend React Query cache for `['onboarding-progress']` is invalidated whenever a
mutation succeeds on any of these endpoints (added to the `onSuccess` callback of each
relevant mutation hook).

---

## 7. Quick Analysis Shortcut

### Problem

New investors don't know typical values for form fields. The current analyzer forms
require 6-10 fields. For a first-timer, this is the biggest activation barrier.

### Solution: Quick Analysis Mode

A simplified form with 3-4 fields and smart defaults for everything else. Available
when `experience_level === 'first'` or accessible via a "Quick Analysis" button.

### Per-Strategy Quick Fields

| Strategy | Quick Fields | Everything Else Uses Defaults |
|----------|-------------|-------------------------------|
| Wholesale | purchase_price, arv, repair_costs | assignment_fee=10%, closing=3%, holding=1mo |
| Flip | purchase_price, arv, repair_costs | holding=5mo, closing=3%, financing=80%, rate=9.5% |
| BRRRR | purchase_price, arv, monthly_rent | repair=30% of delta, vacancy=8%, maint=10%, mgmt=8% |
| Buy & Hold | purchase_price, monthly_rent | down=25%, rate=7.25%, vacancy=8%, maint=10%, mgmt=8% |
| Creative Finance | purchase_price, monthly_rent, existing_loan_balance | existing_rate=4.5%, seller_amt=calculated |

### Implementation

```tsx
// In AnalyzerFormPage.tsx — add Quick Analysis toggle

const [quickMode, setQuickMode] = useState(
  user?.experience_level === 'first'
)

// Quick mode shows only the essential fields
// "Show all fields" toggle reveals the full form

{quickMode ? (
  <div className="space-y-4">
    <h3 className="text-sm font-semibold text-text-primary">Quick Analysis</h3>
    <p className="text-xs text-text-secondary">
      Enter the key numbers. We'll use smart defaults for the rest.
    </p>

    {/* Render only QUICK_FIELDS[strategy] */}
    {QUICK_FIELDS[strategy].map((field) => (
      <FormField key={field.key} field={field} value={inputs[field.key]} onChange={...} />
    ))}

    <button
      type="button"
      onClick={() => setQuickMode(false)}
      className="text-xs text-accent-primary hover:underline"
    >
      Show all fields ({ALL_FIELDS[strategy].length - QUICK_FIELDS[strategy].length} more)
    </button>
  </div>
) : (
  // Existing full form
)}
```

### Smart Defaults

```typescript
// frontend/src/lib/smart-defaults.ts

import type { Strategy } from '@/types'

interface SmartDefaults {
  [key: string]: number | string
}

export const SMART_DEFAULTS: Record<Strategy, SmartDefaults> = {
  wholesale: {
    assignment_fee: 12000,
    closing_costs_pct: 3,
    holding_months: 1,
  },
  flip: {
    holding_months: 5,
    closing_costs_pct: 3,
    financing_pct: 80,
    interest_rate: 9.5,
    monthly_holding_cost: 800,
  },
  brrrr: {
    down_payment_pct: 20,
    interest_rate: 7.5,
    loan_term_years: 30,
    vacancy_rate: 8,
    maintenance_pct: 10,
    management_fee_pct: 8,
    insurance_annual: 1200,
    taxes_annual: 1800,
    refinance_ltv: 75,
    refinance_rate: 7.0,
  },
  buy_and_hold: {
    down_payment_pct: 25,
    interest_rate: 7.25,
    loan_term_years: 30,
    vacancy_rate: 8,
    maintenance_pct: 10,
    management_fee_pct: 8,
    insurance_annual: 1400,
    taxes_annual: 2200,
    closing_costs_pct: 3,
  },
  creative_finance: {
    existing_interest_rate: 4.5,
    existing_loan_term_remaining: 22,
    down_payment_to_seller: 15000,
    seller_finance_rate: 6.0,
    seller_finance_term: 5,
    vacancy_rate: 8,
    maintenance_pct: 10,
    management_fee_pct: 8,
    insurance_annual: 1500,
    taxes_annual: 2400,
  },
}

/**
 * Merge user inputs with smart defaults for missing fields.
 * User-provided values always win.
 */
export function mergeWithDefaults(
  strategy: Strategy,
  userInputs: Record<string, number | string>
): Record<string, number | string> {
  return { ...SMART_DEFAULTS[strategy], ...userInputs }
}
```

### Pre-filled Form via URL

Support a `?prefill=example` query parameter on the analyzer form that loads the sample
deal's inputs into the form:

```typescript
// In AnalyzerFormPage.tsx
const [searchParams] = useSearchParams()
const prefill = searchParams.get('prefill')

useEffect(() => {
  if (prefill === 'example') {
    const sample = SAMPLE_DEAL_INPUTS[strategy]
    if (sample) setInputs(sample)
  }
}, [prefill, strategy])
```

---

## 8. Personalization Engine

### Signal Sources

| Signal | Captured At | Stored In |
|--------|------------|-----------|
| `role` | Registration | `users.role` |
| `primary_strategy` | Onboarding wizard | `users.onboarding_profile` JSONB |
| `experience_level` | Onboarding wizard | `users.onboarding_profile` JSONB |

### Personalization Effects

```typescript
// frontend/src/lib/onboarding-config.ts

import type { Strategy } from '@/types'

type ExperienceLevel = 'first' | '1-5' | '5-20' | '20+'

interface OnboardingConfig {
  defaultStrategy: Strategy
  showQuickAnalysis: boolean
  tooltipDensity: 'high' | 'medium' | 'low' | 'none'
  suggestedChatPrompts: string[]
  dashboardKPIEmphasis: string[]
  analyzerLinkLabel: string
}

const STRATEGY_CHAT_PROMPTS: Record<string, string[]> = {
  wholesale: [
    'How do I calculate Maximum Allowable Offer?',
    'What assignment fee is typical for this market?',
    'How do I find motivated sellers?',
  ],
  flip: [
    'How should I estimate rehab costs?',
    'What profit margin should I target on a flip?',
    'How do I estimate ARV from comps?',
  ],
  brrrr: [
    'What makes a good BRRRR deal vs a bad one?',
    'How does the refinance step work?',
    'What cash-on-cash return should I target?',
  ],
  buy_and_hold: [
    'What cap rate should I target in the Midwest?',
    'What\'s a healthy DSCR for a rental property?',
    'How do I estimate vacancy rates?',
  ],
  creative_finance: [
    'Explain subject-to financing with a real example.',
    'What are the risks of a wrap mortgage?',
    'How do I structure seller financing terms?',
  ],
  multiple: [
    'Should I flip or BRRRR this property?',
    'Compare cash flow vs appreciation strategies.',
    'What strategy works best for a beginner?',
  ],
}

const STRATEGY_KPI_EMPHASIS: Record<string, string[]> = {
  wholesale: ['assignment_fee', 'mao', 'total_investment'],
  flip: ['total_profit', 'roi', 'profit_margin'],
  brrrr: ['cash_on_cash_return', 'equity_captured', 'monthly_cash_flow'],
  buy_and_hold: ['monthly_cash_flow', 'cap_rate', 'dscr'],
  creative_finance: ['cash_flow_spread', 'monthly_cash_flow', 'total_investment'],
  multiple: ['total_profit', 'cash_on_cash_return', 'monthly_cash_flow'],
}

export function getOnboardingConfig(
  strategy: string,
  experience: ExperienceLevel
): OnboardingConfig {
  const strat = (strategy === 'multiple' ? 'brrrr' : strategy) as Strategy

  return {
    defaultStrategy: strat,
    showQuickAnalysis: experience === 'first',
    tooltipDensity:
      experience === 'first' ? 'high' :
      experience === '1-5' ? 'medium' :
      experience === '5-20' ? 'low' : 'none',
    suggestedChatPrompts: STRATEGY_CHAT_PROMPTS[strategy] ?? STRATEGY_CHAT_PROMPTS['brrrr'],
    dashboardKPIEmphasis: STRATEGY_KPI_EMPHASIS[strategy] ?? STRATEGY_KPI_EMPHASIS['brrrr'],
    analyzerLinkLabel: strategy === 'multiple'
      ? 'Compare Strategies'
      : `Analyze a ${STRATEGY_LABELS[strat]} Deal`,
  }
}
```

### Where Personalization Appears

| Location | What Changes | How |
|----------|-------------|-----|
| **Dashboard** | Sample deal matches strategy | Backend creates strategy-matched deal |
| **Dashboard** | "Analyze" CTA text | `getOnboardingConfig().analyzerLinkLabel` |
| **Analyzer** | Default strategy pre-selected | Navigate to `/analyze/{defaultStrategy}` |
| **Analyzer** | Quick mode shown for first-timers | `showQuickAnalysis` flag |
| **Chat Page** | Suggested questions change | Replace `SUGGESTED_QUESTIONS` with `suggestedChatPrompts` |
| **Results Page** | Tooltip density for metrics | `tooltipDensity` controls coach mark visibility |
| **Results Page** | First-visit coach mark on "Add to Pipeline" | Show if `experience === 'first'` and `!progress.pipeline_deal_added` |

### Chat Page Personalization

```typescript
// In ChatPage.tsx, replace the static SUGGESTED_QUESTIONS:

const user = useAuthStore((s) => s.user)
const config = getOnboardingConfig(
  user?.onboarding_profile?.primary_strategy ?? 'brrrr',
  user?.onboarding_profile?.experience_level ?? '1-5'
)

// Use config.suggestedChatPrompts in the empty state:
<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-[480px]">
  {config.suggestedChatPrompts.map((prompt) => (
    <button
      key={prompt}
      onClick={() => void handleSend(prompt)}
      className="text-left p-3 rounded-xl border border-[#252540] ..."
    >
      <p className="text-[13px] text-[#94A3B8] leading-snug">{prompt}</p>
    </button>
  ))}
</div>
```

### Hook: `useOnboardingConfig`

```typescript
// frontend/src/hooks/useOnboardingConfig.ts

import { useAuthStore } from '@/stores/authStore'
import { getOnboardingConfig } from '@/lib/onboarding-config'

export function useOnboardingConfig() {
  const user = useAuthStore((s) => s.user)
  return getOnboardingConfig(
    user?.onboarding_profile?.primary_strategy ?? 'brrrr',
    user?.onboarding_profile?.experience_level ?? '1-5'
  )
}
```

---

## 9. Activation Metric Definition

### Primary Activation Definition

A user is **activated** when they have completed:

> At least 1 deal analysis (non-example) **AND** at least 1 of: (sent an AI chat message
> **OR** added a deal to the pipeline)

This must happen within the **first 72 hours** of signup.

### Activation Scoring Model

| Action | Points | Rationale |
|--------|--------|-----------|
| First analysis completed (non-example) | 30 | Core value prop — user sees real numbers |
| AI chat message sent | 20 | Engagement with premium differentiator |
| Pipeline deal added | 20 | Workflow adoption signal |
| PDF report exported | 15 | Output had real-world utility |
| Second analysis (different strategy) | 25 | Comparison behavior = serious intent |
| Document uploaded | 10 | Deeper engagement |
| Portfolio entry created | 10 | Ownership of property, ongoing need |

### Score Thresholds

| Score | Status | Treatment |
|-------|--------|-----------|
| 0-29 | Not activated (red zone) | Re-engagement nudges, Day 1 email with sample deal link |
| 30-49 | Partially activated (yellow zone) | Feature discovery prompts, checklist emphasis |
| 50+ | Fully activated / PQL (green zone) | Upgrade prompts appropriate, conversion candidate |

### Tracking Implementation

The activation score is computed from the `onboarding_events` table (see Section 11).
It does not require a real-time column — it is computed on-read by a backend utility:

```python
# backend/core/onboarding/activation.py

ACTIVATION_POINTS = {
    "first_deal_analyzed": 30,
    "chat_message_sent": 20,
    "pipeline_deal_added": 20,
    "pdf_exported": 15,
    "second_strategy_analyzed": 25,
    "document_uploaded": 10,
    "portfolio_entry_created": 10,
}

def compute_activation_score(user_id: str, db: Session) -> int:
    """Compute the activation score for a user based on tracked events."""
    events = (
        db.query(OnboardingEvent.event_type)
        .filter(OnboardingEvent.user_id == user_id)
        .distinct(OnboardingEvent.event_type)
        .all()
    )
    event_types = {e.event_type for e in events}
    return sum(
        points for event_type, points in ACTIVATION_POINTS.items()
        if event_type in event_types
    )

def is_activated(user_id: str, db: Session) -> bool:
    """Check if a user meets the activation threshold (score >= 50)."""
    return compute_activation_score(user_id, db) >= 50
```

### Cohort Query: Activated vs. Non-Activated Conversion

```sql
-- Compare conversion rates of activated vs non-activated users
WITH user_scores AS (
    SELECT
        u.id,
        u.created_at AS signup_at,
        s.plan,
        COUNT(DISTINCT oe.event_type) AS distinct_events,
        SUM(CASE
            WHEN oe.event_type = 'first_deal_analyzed' THEN 30
            WHEN oe.event_type = 'chat_message_sent' THEN 20
            WHEN oe.event_type = 'pipeline_deal_added' THEN 20
            WHEN oe.event_type = 'pdf_exported' THEN 15
            WHEN oe.event_type = 'second_strategy_analyzed' THEN 25
            WHEN oe.event_type = 'document_uploaded' THEN 10
            WHEN oe.event_type = 'portfolio_entry_created' THEN 10
            ELSE 0
        END) AS activation_score
    FROM users u
    LEFT JOIN onboarding_events oe ON oe.user_id = u.id
    LEFT JOIN subscriptions s ON s.user_id = u.id
    WHERE u.email != 'demo@parcel.app'
    GROUP BY u.id, u.created_at, s.plan
)
SELECT
    CASE WHEN activation_score >= 50 THEN 'activated' ELSE 'not_activated' END AS cohort,
    COUNT(*) AS total_users,
    COUNT(CASE WHEN plan NOT IN ('free', 'demo') THEN 1 END) AS converted,
    ROUND(
        100.0 * COUNT(CASE WHEN plan NOT IN ('free', 'demo') THEN 1 END)
        / NULLIF(COUNT(*), 0), 1
    ) AS conversion_pct
FROM user_scores
GROUP BY cohort;
```

---

## 10. Trial System Integration

### How Onboarding Drives Trial-to-Paid Conversion

The 14-day reverse trial is the conversion engine. Onboarding feeds it by ensuring users
experience Pro features early and often. Every onboarding action is calibrated to create
loss aversion when the trial ends.

### Trial Timeline + Onboarding Touchpoints

```
Day 0: SIGNUP
├── Micro-wizard captures strategy + experience
├── Sample deal created (user sees Pro-quality results immediately)
├── Onboarding checklist appears
├── Welcome email sent
│
Day 0-3: ACTIVATION PHASE
├── Checklist drives: first analysis → AI chat → pipeline add
├── No upgrade prompts. Pure value delivery.
├── Day 1 email: nudge if no analysis completed
├── Day 1 email (alt): "Here's what to do with your analysis" if completed
│
Day 4-7: DEEPENING PHASE
├── Feature discovery prompts (comparison tool, PDF reports)
├── Day 5 email: pipeline intro if pipeline empty
├── Checklist completion celebration (if all 5 done)
│
Day 7: MIDPOINT
├── Trial countdown appears in sidebar (subtle, gray text)
├── Day 7 email: usage summary + features they haven't tried
├── Dashboard banner: "7 days left on your Pro trial"
│
Day 8-10: VALUE REINFORCEMENT
├── Day 10 email: comparison strategy prompt
├── Countdown turns amber
├── In-app: "Investors who upgrade analyze 4x more deals"
│
Day 11-13: URGENCY PHASE
├── Countdown turns red
├── Day 12 email: "Here's what you lose in 2 days"
├── Login modal (dismissible): feature comparison table
├── Day 13 email: 20% off first month offer
│
Day 14: TRANSITION
├── Full-screen interstitial: accomplishment summary + upgrade CTA
├── Day 14 email: "Trial ended, data is safe"
├── Downgrade to Free tier
│
Day 15+: DOWNGRADED
├── Feature locks active (blur/lock/tease patterns)
├── Inline "Unlock with Pro" buttons on locked features
├── Win-back emails at Day 17, Day 30, Day 55
```

### Trial Countdown Component

```tsx
// frontend/src/components/billing/TrialCountdown.tsx

import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'
import { Link } from 'react-router-dom'

export function TrialCountdown() {
  const user = useAuthStore((s) => s.user)

  if (!user?.trial_ends_at || user?.plan_status !== 'trialing') return null
  if (user?.plan === 'demo') return null

  const now = new Date()
  const trialEnd = new Date(user.trial_ends_at)
  const daysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / 86400000))

  if (daysLeft > 14) return null // Safety check

  const urgency =
    daysLeft <= 2 ? 'critical' :
    daysLeft <= 4 ? 'warning' :
    'info'

  return (
    <Link
      to="/settings/billing"
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
        urgency === 'critical' && 'bg-red-500/10 border border-red-500/20 text-red-400',
        urgency === 'warning' && 'bg-amber-500/10 border border-amber-500/20 text-amber-400',
        urgency === 'info' && 'bg-accent-primary/10 border border-accent-primary/20 text-accent-primary',
      )}
    >
      <span className={cn(
        'w-1.5 h-1.5 rounded-full',
        urgency === 'critical' && 'bg-red-400',
        urgency === 'warning' && 'bg-amber-400',
        urgency === 'info' && 'bg-accent-primary',
      )} />
      Pro Trial · {daysLeft === 0 ? 'Last day' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`}
    </Link>
  )
}
```

Place in AppShell sidebar, below the logo area.

### Onboarding Completion → Trial Conversion Link

When a user completes all 5 checklist items, show a celebration moment that bridges to
the trial:

```tsx
// In OnboardingChecklist, when allComplete:
<div className="text-center py-3 space-y-2">
  <div className="w-10 h-10 rounded-full bg-accent-success/10 border border-accent-success/20
                  flex items-center justify-center mx-auto">
    <Check size={18} className="text-accent-success" />
  </div>
  <p className="text-sm font-semibold text-text-primary">You're all set!</p>
  <p className="text-xs text-text-secondary">
    You have {daysLeft} days left of unlimited Pro access.
    Keep analyzing deals to make the most of your trial.
  </p>
  <Button
    asChild
    size="sm"
    className="gap-2 bg-accent-primary hover:bg-accent-hover text-white"
  >
    <Link to="/analyze">
      Analyze Another Deal
      <ArrowRight size={14} />
    </Link>
  </Button>
</div>
```

---

## 11. Backend: Onboarding Progress Tracking

### Database Schema

**Option chosen: JSONB column on User model + dedicated events table.**

The JSONB column provides fast reads for the checklist state. The events table provides
an audit trail for analytics.

### User Model Additions

```python
# In backend/models/users.py — add to User class:

from sqlalchemy.dialects.postgresql import JSONB

# Onboarding profile from wizard
onboarding_profile = Column(JSONB, nullable=True, default=None)
# Shape: {"primary_strategy": "brrrr", "experience_level": "1-5"}

# Onboarding checklist progress
onboarding_progress = Column(JSONB, nullable=False, default={
    "wizard_completed": False,
    "first_deal_analyzed": False,
    "report_reviewed": False,
    "pipeline_deal_added": False,
    "chat_used": False,
    "checklist_dismissed": False,
    "completed_at": None,
})

# Convenience property
@property
def onboarding_completed(self) -> bool:
    if not self.onboarding_progress:
        return False
    p = self.onboarding_progress
    return bool(p.get("completed_at")) or bool(p.get("checklist_dismissed"))
```

### Onboarding Events Table

```python
# backend/models/onboarding_events.py

import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB, UUID

from database import Base


class OnboardingEvent(Base):
    """Tracks user onboarding actions for funnel analytics."""

    __tablename__ = "onboarding_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    event_type = Column(String(50), nullable=False)
    metadata = Column(JSONB, default={})
    created_at = Column(DateTime, default=datetime.utcnow)
```

### Alembic Migration

Single migration adding both columns and the new table:

```
alembic revision --autogenerate -m "add onboarding profile, progress, and events table"
```

### API Endpoints

```python
# backend/routers/onboarding.py

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from core.security.jwt import get_current_user
from models.users import User
from models.onboarding_events import OnboardingEvent
from schemas.onboarding import (
    OnboardingProfileRequest,
    OnboardingProgressResponse,
    OnboardingCompleteStepRequest,
)

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


@router.post("/profile")
def save_onboarding_profile(
    body: OnboardingProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save wizard responses and create sample deal."""
    # 1. Store profile
    current_user.onboarding_profile = {
        "primary_strategy": body.primary_strategy,
        "experience_level": body.experience_level,
    }

    # 2. Mark wizard step complete
    progress = dict(current_user.onboarding_progress or {})
    progress["wizard_completed"] = True
    current_user.onboarding_progress = progress

    # 3. Create sample deal (strategy-matched)
    strategy = body.primary_strategy if body.primary_strategy != "multiple" else "brrrr"
    create_sample_deal(current_user.id, strategy, db)

    # 4. Log event
    db.add(OnboardingEvent(
        user_id=current_user.id,
        event_type="wizard_completed",
        metadata={"strategy": body.primary_strategy, "experience": body.experience_level},
    ))

    db.commit()
    db.refresh(current_user)

    return user_to_response(current_user)


@router.get("/progress", response_model=OnboardingProgressResponse)
def get_onboarding_progress(
    current_user: User = Depends(get_current_user),
):
    """Return the current onboarding checklist state."""
    return current_user.onboarding_progress or {
        "wizard_completed": False,
        "first_deal_analyzed": False,
        "report_reviewed": False,
        "pipeline_deal_added": False,
        "chat_used": False,
        "checklist_dismissed": False,
        "completed_at": None,
    }


@router.post("/complete")
def complete_onboarding_step(
    body: OnboardingCompleteStepRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark an onboarding step as complete."""
    valid_steps = {
        "first_deal_analyzed", "report_reviewed",
        "pipeline_deal_added", "chat_used",
    }
    if body.step not in valid_steps:
        raise HTTPException(400, "Invalid step")

    progress = dict(current_user.onboarding_progress or {})
    if progress.get(body.step):
        return progress  # Already complete, idempotent

    progress[body.step] = True

    # Check if all steps are now complete
    all_steps = ["wizard_completed", "first_deal_analyzed", "report_reviewed",
                 "pipeline_deal_added", "chat_used"]
    if all(progress.get(s) for s in all_steps):
        progress["completed_at"] = datetime.utcnow().isoformat()

    current_user.onboarding_progress = progress

    # Log event
    db.add(OnboardingEvent(
        user_id=current_user.id,
        event_type=body.step,
        metadata=body.metadata or {},
    ))

    db.commit()
    return progress


@router.post("/dismiss")
def dismiss_onboarding_checklist(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Dismiss the onboarding checklist."""
    progress = dict(current_user.onboarding_progress or {})
    progress["checklist_dismissed"] = True
    current_user.onboarding_progress = progress

    db.add(OnboardingEvent(
        user_id=current_user.id,
        event_type="checklist_dismissed",
    ))

    db.commit()
    return {"dismissed": True}
```

### Pydantic Schemas

```python
# backend/schemas/onboarding.py

from typing import Optional
from pydantic import BaseModel


class OnboardingProfileRequest(BaseModel):
    primary_strategy: str   # 'wholesale' | 'flip' | 'brrrr' | 'buy_and_hold' | 'creative_finance' | 'multiple'
    experience_level: str   # 'first' | '1-5' | '5-20' | '20+'


class OnboardingCompleteStepRequest(BaseModel):
    step: str               # e.g., 'first_deal_analyzed'
    metadata: Optional[dict] = None


class OnboardingProgressResponse(BaseModel):
    wizard_completed: bool = False
    first_deal_analyzed: bool = False
    report_reviewed: bool = False
    pipeline_deal_added: bool = False
    chat_used: bool = False
    checklist_dismissed: bool = False
    completed_at: Optional[str] = None
```

### Mount the Router

```python
# In backend/main.py, add after line 43:
from routers import onboarding
app.include_router(onboarding.router, prefix="/api/v1")
```

### Frontend API Client Addition

```typescript
// In frontend/src/lib/api.ts — add to the api object:

onboarding: {
  saveProfile: (data: { primary_strategy: string; experience_level: string }) =>
    request<User>('/api/v1/onboarding/profile', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getProgress: () =>
    request<OnboardingProgress>('/api/v1/onboarding/progress'),
  completeStep: (step: string, metadata?: Record<string, unknown>) =>
    request<OnboardingProgress>('/api/v1/onboarding/complete', {
      method: 'POST',
      body: JSON.stringify({ step, metadata }),
    }),
  dismiss: () =>
    request<{ dismissed: boolean }>('/api/v1/onboarding/dismiss', {
      method: 'POST',
    }),
},
```

### Frontend Types Addition

```typescript
// In frontend/src/types/index.ts — add:

export interface OnboardingProfile {
  primary_strategy: Strategy | 'multiple'
  experience_level: 'first' | '1-5' | '5-20' | '20+'
}

export interface OnboardingProgress {
  wizard_completed: boolean
  first_deal_analyzed: boolean
  report_reviewed: boolean
  pipeline_deal_added: boolean
  chat_used: boolean
  checklist_dismissed: boolean
  completed_at: string | null
}

// Extend existing User interface:
export interface User {
  id: string
  name: string
  email: string
  role: 'wholesaler' | 'investor' | 'agent'
  team_id?: string | null
  created_at: string
  // NEW — billing & onboarding
  plan?: 'free' | 'pro' | 'team' | 'demo'
  plan_status?: 'active' | 'trialing' | 'past_due' | 'canceled' | null
  trial_ends_at?: string | null
  onboarding_completed?: boolean
  onboarding_profile?: OnboardingProfile | null
}
```

### Auto-Completing Checklist Steps from Existing Mutations

The onboarding steps auto-complete by calling `api.onboarding.completeStep()` from
existing mutation `onSuccess` handlers. This avoids building a separate event bus.

```typescript
// In useDeals.ts — useCreateDeal onSuccess:
queryClient.invalidateQueries({ queryKey: ['onboarding-progress'] })
api.onboarding.completeStep('first_deal_analyzed', { strategy: deal.strategy })

// In ResultsPage.tsx — useEffect on mount (first visit only):
useEffect(() => {
  if (deal && !deal.is_example) {
    api.onboarding.completeStep('report_reviewed').catch(() => {})
  }
}, [deal?.id])

// In usePipeline.ts — useAddToPipeline onSuccess:
api.onboarding.completeStep('pipeline_deal_added').catch(() => {})

// In ChatPage.tsx — after first successful message send:
if (messages.length === 0) {
  api.onboarding.completeStep('chat_used').catch(() => {})
}
```

The `.catch(() => {})` ensures a failed onboarding tracking call never breaks the primary
user action.

---

## New Files Summary

### Backend

| File | Purpose |
|------|---------|
| `backend/routers/onboarding.py` | Onboarding API (profile, progress, complete, dismiss) |
| `backend/schemas/onboarding.py` | Pydantic request/response schemas |
| `backend/models/onboarding_events.py` | OnboardingEvent SQLAlchemy model |
| `backend/core/onboarding/__init__.py` | Package init |
| `backend/core/onboarding/sample_deals.py` | Sample deal data per strategy |
| `backend/core/onboarding/activation.py` | Activation score computation |
| `backend/alembic/versions/xxx_add_onboarding.py` | Migration for new columns + table |

### Frontend

| File | Purpose |
|------|---------|
| `frontend/src/pages/Onboarding.tsx` | 2-step wizard (strategy + experience) |
| `frontend/src/components/onboarding/OnboardingChecklist.tsx` | Persistent checklist (desktop) |
| `frontend/src/components/onboarding/OnboardingBottomBar.tsx` | Checklist bottom bar (mobile) |
| `frontend/src/components/billing/TrialCountdown.tsx` | Sidebar trial countdown |
| `frontend/src/hooks/useOnboardingConfig.ts` | Hook for personalization config |
| `frontend/src/lib/onboarding-config.ts` | Personalization logic + constants |
| `frontend/src/lib/smart-defaults.ts` | Smart defaults for Quick Analysis |

### Modified Files

| File | Change |
|------|--------|
| `backend/main.py` | Mount onboarding router |
| `backend/models/users.py` | Add `onboarding_profile`, `onboarding_progress` JSONB columns |
| `backend/routers/auth.py` | Include onboarding fields in register response + `/me` response |
| `backend/schemas/auth.py` | Add onboarding fields to UserResponse |
| `frontend/src/App.tsx` | Add `/onboarding` route |
| `frontend/src/types/index.ts` | Extend User interface, add OnboardingProfile/Progress types |
| `frontend/src/lib/api.ts` | Add `api.onboarding` methods |
| `frontend/src/hooks/useAuth.ts` | Post-register redirect to `/onboarding` |
| `frontend/src/stores/authStore.ts` | No structural change (stores extended User) |
| `frontend/src/pages/Dashboard.tsx` | Enhanced empty state with sample deal + checklist |
| `frontend/src/pages/chat/ChatPage.tsx` | Personalized suggested questions |
| `frontend/src/pages/analyze/AnalyzerFormPage.tsx` | Quick Analysis mode toggle |
| `frontend/src/pages/analyze/ResultsPage.tsx` | Example deal banner + coach marks |
| `frontend/src/components/layout/AppShell.tsx` | Mount OnboardingChecklist + TrialCountdown |
| `frontend/src/pages/MyDeals.tsx` | Enhanced empty state |
| `frontend/src/pages/Pipeline.tsx` | Enhanced empty state |
| `frontend/src/pages/portfolio/PortfolioPage.tsx` | Enhanced empty state |
| `frontend/src/pages/documents/DocumentsPage.tsx` | Enhanced empty state |

---

## CRITICAL DECISIONS

### 1. Wizard Length: 2 Screens, Not 3+

**Decision:** The onboarding wizard is exactly 2 screens (strategy + experience). No
market/city selector, no funding source, no portfolio size.

**Rationale:** Every additional screen reduces completion by 15-20%. The two signals we
capture (strategy + experience) drive 90% of the personalization value. Market data can
be inferred from the first deal's address. Funding source is captured naturally in the
analyzer form.

**Risk:** Less personalization upfront. We cannot pre-fill market-specific defaults.

**Mitigation:** Add an optional "What market are you in?" field to screen 2 if A/B
testing shows it doesn't hurt completion.

### 2. Sample Deal Storage: In User's Account, Not Read-Only Reference

**Decision:** The sample deal is a real Deal record owned by the user, flagged with
`is_example: true`, with status `"example"`.

**Rationale:** This lets the user interact with it exactly like a real deal — view results,
add to pipeline, chat about it, export PDF. The ownership effect creates investment in the
product. A read-only reference misses the "I can do things with this" moment.

**Risk:** Users might be confused that they have a deal they didn't create. The example
deal adds noise to their deal list.

**Mitigation:** Clear "EXAMPLE" badge on all surfaces. Banner on results page explaining
it's a sample. Deletable at any time. Does not count toward plan limits.

### 3. Checklist Location: Sidebar Panel, Not Modal

**Decision:** The onboarding checklist lives in the AppShell sidebar (desktop) and as a
bottom bar/sheet (mobile). It is NOT a full-screen modal or overlay.

**Rationale:** Modals block the product. Users should be able to work and see the
checklist simultaneously. The sidebar position means it's visible during normal use
without being intrusive. Linear and Notion both use this pattern successfully.

**Risk:** May go unnoticed by users who don't look at the sidebar.

**Mitigation:** The "next step" item has a subtle highlight (indigo border). The progress
bar is visually prominent. First visit to dashboard can pulse the checklist once.

### 4. Quick Analysis: Frontend-Only Smart Defaults, Not a Separate Backend Endpoint

**Decision:** Quick Analysis mode works by merging user inputs with frontend smart defaults
before submission. The backend receives the same `POST /api/v1/deals/` request regardless
of mode. There is no separate "quick analyze" endpoint.

**Rationale:** Keeps the backend simple. The calculator logic in
`backend/core/calculators/` is Ivan's domain and must not be modified. Smart defaults are
a frontend concern. The existing deal creation flow handles the merged inputs identically.

**Risk:** Smart defaults may produce misleading results for unusual markets.

**Mitigation:** Show "Using estimated defaults" notice on Quick Analysis results. Link to
"Refine your numbers" to edit defaults. Defaults are conservative (slightly pessimistic).

### 5. Activation = First Analysis + Secondary Action, Not Just First Analysis

**Decision:** Activation requires completing 1 deal analysis AND at least one of (AI
chat OR pipeline add). Not just the first analysis alone.

**Rationale:** A user who runs one analysis and never returns is not activated. The
secondary action (chat or pipeline) indicates workflow adoption. Research shows users
who adopt 3+ core features have 40% higher retention. Our threshold of 2 actions is
the minimum viable signal.

**Risk:** More restrictive activation definition means a lower reported activation rate.

**Mitigation:** Track both "partial activation" (analysis only) and "full activation"
(analysis + secondary). Optimize for full activation but report both to understand the
funnel.

### 6. Onboarding State: JSONB on User Model, Not Separate Table

**Decision:** `onboarding_progress` and `onboarding_profile` are JSONB columns on the
existing `users` table. A separate `onboarding_events` table exists for analytics.

**Rationale:** The checklist state is accessed on every page load (via `/auth/me`). Having
it on the User model means zero extra queries. JSONB is flexible for adding new steps
without migrations. The events table provides the audit trail needed for funnel analysis.

**Risk:** JSONB is harder to query in aggregate than normalized tables. Schema evolution
requires careful handling of missing keys.

**Mitigation:** Always use `.get()` with defaults when reading progress keys. The events
table provides the analytics backbone. If the onboarding system grows significantly,
migrate to a dedicated table.

### 7. Demo Account Bypass: No Onboarding for Demo Users

**Decision:** The demo account (`demo@parcel.app`) skips the onboarding wizard entirely
and never shows the checklist. `is_demo_user()` check in the onboarding router returns
immediately.

**Rationale:** Demo account already has 12 seeded deals, a full pipeline, and chat
history. The onboarding flow would be confusing and counterproductive for demo visitors.

### 8. No External Dependencies for Onboarding

**Decision:** No new npm packages for the onboarding system. No react-joyride, no
intro.js, no third-party tooltip libraries.

**Rationale:** The existing stack (Framer Motion for animations, shadcn/ui for
components, Tailwind for styling) can build everything needed. Coach marks are a simple
`<div>` with a spotlight effect and tooltip — no library needed. Adding dependencies
increases bundle size and creates maintenance burden.

**Risk:** Building coach marks from scratch takes more development time.

**Mitigation:** Start with the checklist and empty states (no coach marks needed). Add
coach marks in P1 using a lightweight custom `<CoachMark />` component with Framer Motion.

### 9. Trial Countdown Visibility Rules

**Decision:** The trial countdown is invisible for the first 7 days. Visible as subtle
gray text from Day 7-10. Turns amber from Day 10-12. Turns red from Day 12-14.

**Rationale:** Showing a countdown from Day 1 creates anxiety and undermines the
activation phase (Days 0-3) where the user should focus on experiencing value, not
worrying about time pressure. Research shows most purchase decisions happen between
Day 7 and Day 12.

### 10. Implementation Order

**Decision:** Ship in this order:

1. **P0 (Week 1):** Onboarding wizard + onboarding_progress JSONB + sample deal creation + checklist component
2. **P1 (Week 2):** Quick Analysis mode + smart defaults + empty state upgrades
3. **P2 (Week 3):** Personalization engine + trial countdown + chat prompt personalization
4. **P3 (Week 4):** Onboarding events table + activation scoring + analytics queries

**Rationale:** P0 gives the highest-leverage improvement: new users go from empty
dashboard to seeing real deal results in under 90 seconds. Each subsequent tier adds
refinement. The analytics layer ships last because it depends on having user data from
the earlier tiers.
