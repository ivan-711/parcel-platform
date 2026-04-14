# Agent 13 — Onboarding & Empty States (Light Theme)

Design spec for the post-registration experience, onboarding checklist, and empty states across all six core pages. Every component adapts to Parcel's light theme tokens from `agent-01-design-tokens.md` and follows the animation system from `agent-14-animation-system.md`.

Design philosophy: warm, action-oriented, never sterile. The app should feel like a knowledgeable colleague who already set up the workspace and is handing you the keys — not a blank spreadsheet waiting for you to figure it out.

---

## 1. Post-Registration: Welcome to Dashboard with Checklist

### 1.1 Flow

```
Register (name, email, password, role)
    ↓
  Redirect to /dashboard
    ↓
  WelcomeModal (shown once, first session only)
    ↓
  Dashboard with OnboardingChecklist pinned at top
```

No multi-step wizard. No forced tour. One modal, then out of the way.

### 1.2 WelcomeModal

**File:** `frontend/src/components/onboarding/WelcomeModal.tsx`

**Trigger:** First login — `user.created_at` matches current session AND `localStorage.getItem('parcel_welcome_seen')` is falsy. Also skip if `total_deals > 0` (returning user who cleared storage).

**Dismissal:** "Let's go" CTA, "Skip for now" text link, click outside, or Escape key. All paths set `localStorage.setItem('parcel_welcome_seen', 'true')`.

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                      [Parcel logo]                      │
│                                                         │
│            Welcome to Parcel, {firstName}               │
│                                                         │
│          Your 14-day Pro trial is active.               │
│       Let's get your first deal analyzed                │
│              in under 2 minutes.                        │
│                                                         │
│           ┌──────────────────────────┐                  │
│           │   [Role-specific icon]   │                  │
│           │     in indigo-50 circle  │                  │
│           └──────────────────────────┘                  │
│                                                         │
│      {Role-specific value proposition — 1 line}         │
│                                                         │
│     ┌─────────────────────────────────────────┐         │
│     │     Analyze Your First Deal  ->         │         │
│     └─────────────────────────────────────────┘         │
│                                                         │
│                   Skip for now                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Role-specific copy:**

| Role | Icon | Value Proposition |
|------|------|-------------------|
| Wholesaler | `DollarSign` | "Run your first MAO analysis and see how Parcel finds the spread." |
| Investor | `TrendingUp` | "Analyze a rental property and see projected cash flow, cap rate, and ROI." |
| Agent | `FileBarChart` | "Run comps for a client and generate a branded deal report in seconds." |

**Styling (light theme):**

- Backdrop: `bg-gray-900/40` with `backdrop-blur-sm`
- Modal card: `bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-md mx-auto`
- Heading: `font-display text-2xl text-gray-900 tracking-tight`
- Subheading: `text-base text-gray-500 leading-relaxed`
- CTA button: `bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white rounded-lg px-6 py-3 font-medium shadow-sm transition-colors duration-150`
- "Skip" link: `text-sm text-gray-400 hover:text-gray-600 transition-colors`
- Icon container: `w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center`
- Icon itself: `w-7 h-7 text-indigo-500`

**Animation:**

```ts
// Backdrop
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
exit={{ opacity: 0 }}
transition={{ duration: DURATION.normal }} // 200ms

// Modal card
initial={{ opacity: 0, y: 16, scale: 0.97 }}
animate={{ opacity: 1, y: 0, scale: 1 }}
exit={{ opacity: 0, y: 8, scale: 0.98 }}
transition={{ duration: DURATION.medium, ease: EASING.snappy }} // 300ms
```

Wrap in `AnimatePresence` keyed on visibility boolean.

### 1.3 "Analyze Your First Deal" CTA Behavior

- **Wholesaler role** -> `/analyze?strategy=wholesale`
- **Investor role** -> `/analyze?strategy=buy_and_hold`
- **Agent role** -> `/analyze?strategy=flip`

The strategy param pre-selects the tab on the analyzer form. The user can still switch freely.

---

## 2. Onboarding Checklist

### 2.1 Component Spec

**File:** `frontend/src/components/onboarding/OnboardingChecklist.tsx`
**Hook:** `frontend/src/hooks/useOnboardingProgress.ts`

**Props:** None. Reads all state from `useOnboardingProgress()`.

**Placement:** Top of Dashboard, above KPI cards. Full-width within the content area.

### 2.2 The Five Steps

| # | Label | Completed When | CTA Link |
|---|-------|---------------|----------|
| 1 | Analyze your first deal | `deals` query cache has length >= 1 | `/analyze` |
| 2 | Add a deal to your pipeline | `pipeline` query cache has length >= 1 | `/pipeline` |
| 3 | Chat with the AI specialist | `chat/history` query cache has length >= 1 | `/chat` |
| 4 | Upload a document | `documents` query cache has length >= 1 | `/documents` |
| 5 | Explore the portfolio tracker | `localStorage.getItem('parcel_portfolio_visited')` is truthy | `/portfolio` |

Each step percentage: 20%. Progress maps to 0% / 20% / 40% / 60% / 80% / 100%.

### 2.3 `useOnboardingProgress` Hook

```ts
// frontend/src/hooks/useOnboardingProgress.ts

interface OnboardingStep {
  id: string
  label: string
  completed: boolean
  ctaLabel: string
  ctaTo: string
}

interface OnboardingProgress {
  steps: OnboardingStep[]
  completedCount: number
  totalCount: number        // always 5
  percentage: number        // 0–100
  isDismissed: boolean
  isAllComplete: boolean
  dismiss: () => void
}
```

**Detection is entirely client-side.** The hook checks TanStack Query caches for `['deals']`, `['pipeline']`, `['chat-history']`, `['documents']` and reads `localStorage` for portfolio visited + checklist dismissed. No new API endpoint needed.

**Dismissal rules:**
- User can dismiss after completing >= 3 steps (the X button is hidden before that)
- Auto-collapse to single-line after 7 days since registration
- When all 5 are complete, show completion banner, then remove permanently

### 2.4 Layout — Expanded State

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│   Getting Started                                    3/5 complete    │
│                                                                      │
│   ████████████████████████████████░░░░░░░░░░░░░░░░░  60%   [× ]     │
│                                                                      │
│   ✓  Analyze your first deal                                         │
│   ✓  Add a deal to your pipeline                                     │
│   ✓  Chat with the AI specialist                                     │
│   ○  Upload a document                                   [Upload ->] │
│   ○  Explore the portfolio tracker                       [View ->]   │
│                                                                      │
│   Pro trial: 12 days remaining                                       │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 2.5 Layout — Collapsed State (after 3+ complete or 7+ days)

```
┌──────────────────────────────────────────────────────────────────────┐
│   3/5 setup steps complete   ████████████████░░░░░░░░░  [Expand v]  │
└──────────────────────────────────────────────────────────────────────┘
```

### 2.6 Layout — Completion State (all 5 done)

```
┌──────────────────────────────────────────────────────────────────────┐
│   ✓  You're all set! Parcel is ready for your deals.      [Dismiss] │
└──────────────────────────────────────────────────────────────────────┘
```

Shown once. On dismiss, `localStorage.setItem('parcel_onboarding_complete', 'true')` and component unmounts permanently. A one-time confetti animation fires using `canvas-confetti` (2KB) when the 5th step completes.

### 2.7 Styling (Light Theme)

```
Container:
  bg-white rounded-xl shadow-sm border border-gray-200 p-6

Header row ("Getting Started"):
  font-display text-lg text-gray-900 font-semibold

Counter ("3/5 complete"):
  font-mono text-sm text-indigo-600 font-medium

Progress bar track:
  h-2 rounded-full bg-gray-100

Progress bar fill:
  h-2 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400
  transition-[width] duration-500 ease-out-expo

Completed step row:
  flex items-center gap-3
  Checkmark icon: w-5 h-5 text-success-600 (green)
  Text: text-sm text-gray-400 line-through

Pending step row:
  flex items-center gap-3
  Circle icon: w-5 h-5 text-gray-300 (empty ring)
  Text: text-sm text-gray-700
  CTA link: text-sm text-indigo-500 hover:text-indigo-600 font-medium ml-auto

Trial badge:
  text-xs text-gray-400 font-mono mt-3 pt-3 border-t border-gray-100

Dismiss button (×):
  w-6 h-6 text-gray-300 hover:text-gray-500 rounded transition-colors
```

### 2.8 Animation

**Expand/collapse:** `AnimatePresence` + `motion.div` with `layout` prop.

```ts
// Expand transition
initial={{ height: 0, opacity: 0 }}
animate={{ height: 'auto', opacity: 1 }}
exit={{ height: 0, opacity: 0 }}
transition={{ duration: DURATION.medium, ease: EASING.snappy }}
```

**Step completion:** When a step transitions from pending to completed, the checkmark icon animates in:

```ts
initial={{ scale: 0, rotate: -90 }}
animate={{ scale: 1, rotate: 0 }}
transition={{ type: 'spring', damping: 15, stiffness: 300 }}
```

**Progress bar:** Width transition is CSS (`transition-[width] duration-500 ease-out-expo`), not Framer Motion — simpler and more performant for a single property.

---

## 3. Empty States — Page by Page

Each empty state uses the shared `EmptyState` component (Section 4). Below is the per-page configuration.

### 3.1 Dashboard

The Dashboard has a slightly different empty state since it hosts the onboarding checklist. When the user has zero deals:

**Above the fold:**
1. `<OnboardingChecklist />` — pinned at top
2. Primary empty state card with CTA
3. Three hint cards (Pipeline, Documents, AI Chat) — now wrapped in `<Link>` components

```
Copy:
  Headline: "Welcome to Parcel, {firstName}"
  Description: "Your 14-day Pro trial started today. Analyze a property across five strategies and see your projected returns instantly."
  CTA: "Analyze Your First Deal ->" -> /analyze
```

**Hint cards (below CTA):**

```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  [GitBranch]     │  │  [FileText]      │  │  [Sparkles]      │
│                  │  │                  │  │                  │
│  Deal Pipeline   │  │  Documents       │  │  AI Chat         │
│  Track deals     │  │  Upload contracts│  │  Get instant     │
│  from lead       │  │  for AI          │  │  answers on      │
│  to close        │  │  analysis        │  │  any deal        │
│                  │  │                  │  │                  │
│  Explore ->      │  │  Upload ->       │  │  Ask a question->│
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

**Hint card styling (light theme):**

```
bg-white rounded-xl border border-gray-200 p-5
hover:border-indigo-200 hover:shadow-md
transition-all duration-200
cursor-pointer group

Icon container: w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100
Icon: w-5 h-5 text-indigo-500

Title: text-sm font-semibold text-gray-900 mt-3
Description: text-xs text-gray-500 mt-1 leading-relaxed

Link text: text-xs text-indigo-500 font-medium mt-3
  Arrow: group-hover:translate-x-0.5 transition-transform duration-150
```

### 3.2 MyDeals (Deals Page)

```
icon: Calculator
headline: "Analyze your first property"
description: "Run numbers on any strategy — wholesale, flip, BRRRR, or buy & hold — and your deal appears here with full results."
ctaLabel: "Run an Analysis ->"
ctaTo: "/analyze"
secondaryLabel: "Or try a sample deal"
secondaryTo: "/analyze?sample=true"
```

The "sample deal" link pre-fills the analyzer form with a realistic property (742 Maple Drive, Austin TX, $185,000 purchase, 3bd/2ba). The form shows a dismissible banner: "This is a sample property. Edit any field or clear all to start fresh." in `bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm rounded-lg px-4 py-2.5`.

### 3.3 Pipeline

The pipeline empty state is unique: it renders the actual stage columns (with headers and dashed borders) even when empty, then overlays the prompt card centered over them. This teaches the user what the pipeline model looks like before they have data.

**Background columns (visible but empty):**

```
Six columns, each:
  flex-1 min-w-[140px]
  Header: text-xs font-medium text-gray-400 uppercase tracking-wider px-3 py-2
  Body: min-h-[300px] border border-dashed border-gray-200 rounded-lg bg-gray-50/50
  Stage labels: Lead | Analyzing | Offer Sent | Under Contract | Due Diligence | Closed
```

**Overlay prompt card (centered over the columns):**

```
absolute inset-0 flex items-center justify-center
bg-white/60 backdrop-blur-[2px]

Card:
  bg-white rounded-xl shadow-lg border border-gray-200 p-8 max-w-sm text-center

icon: GitBranch
headline: "Track deals across stages"
description: "Drag deals between columns as they progress from lead to closed. Analyze a property first, then add it here."
ctaLabel: "Add Your First Deal ->"
ctaTo: "/analyze"
```

Note: This page does NOT use the shared `EmptyState` component — it has a custom layout with the column backdrop. But the overlay card follows the same copy and CTA pattern.

### 3.4 Portfolio

```
icon: TrendingUp
iconColorClass: "bg-emerald-50 border-emerald-100"  (green tint — portfolio = money)
headline: "Build your portfolio"
description: "When you close a deal, add it here to track equity, cash flow, and total returns across your holdings."
ctaLabel: "View Your Deals ->"
ctaTo: "/deals"
```

**Additional element below the CTA — "What you'll see" preview:**

```
┌─ What you'll see ─────────────────────────────┐
│                                                │
│   *  Total portfolio value & equity growth     │
│   *  Monthly cash flow projection chart        │
│   *  Strategy breakdown across holdings        │
│   *  Per-property performance table            │
│                                                │
└────────────────────────────────────────────────┘
```

**Preview card styling:**

```
mt-6 bg-gray-50 rounded-lg border border-gray-200 p-4 max-w-sm

Title: text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3
Each item:
  flex items-center gap-2 py-1
  Bullet: w-1.5 h-1.5 rounded-full bg-emerald-400
  Text: text-sm text-gray-600
```

This preview box gives the user a concrete picture of what they unlock by closing deals. Reduces the "why should I care about this page?" friction.

### 3.5 Chat

The current Chat empty state is already well-designed with suggested question buttons. Enhancements for the light theme:

```
icon: Sparkles (keep existing)
headline: "Real Estate AI Specialist"
description: "Ask anything about real estate investing, deal analysis, or market trends."
```

**Suggested prompts — personalized by role:**

| Role | Prompt 1 | Prompt 2 | Prompt 3 | Prompt 4 |
|------|----------|----------|----------|----------|
| Wholesaler | "How do I calculate MAO?" | "What's a good assignment fee?" | "How do I find motivated sellers?" | "Explain the 70% rule" |
| Investor | "Explain cap rate vs cash-on-cash" | "BRRRR vs buy & hold?" | "What's a good debt coverage ratio?" | "How do I evaluate a neighborhood?" |
| Agent | "How do I present comps?" | "What's a good listing strategy?" | "How do I analyze investment properties for clients?" | "Explain seller financing options" |

**5th dynamic prompt (conditional):** When the user has >= 1 deal, add: "Analyze my latest deal" which injects the most recent deal's address and strategy into the chat context.

**Prompt button styling (light theme):**

```
bg-white border border-gray-200 rounded-lg px-4 py-3
hover:border-indigo-200 hover:bg-indigo-50/50 hover:shadow-xs
text-sm text-gray-700 text-left
transition-all duration-150
```

### 3.6 Documents

```
icon: FileText
headline: "Upload your first document"
description: "Drop a lease, contract, or inspection report and Parcel's AI will extract key terms, flag risks, and summarize the details."
ctaLabel: "Upload a File ->"
ctaOnClick: () => openFilePickerOrDropzone()
secondaryLabel: "PDF, DOCX, images — up to 10 MB"
```

The secondary label here is not a link — it is a format hint displayed as muted text below the CTA. Style it as `text-xs text-gray-400 mt-2`.

---

## 4. Shared EmptyState Component

### 4.1 Spec

**File:** `frontend/src/components/ui/EmptyState.tsx`

```ts
import { type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

interface EmptyStateProps {
  icon: LucideIcon
  headline: string
  description: string
  ctaLabel: string
  ctaTo?: string
  ctaOnClick?: () => void
  secondaryLabel?: string
  secondaryTo?: string
  secondaryOnClick?: () => void
  iconColorClass?: string    // defaults to 'bg-indigo-50 border-indigo-100'
  className?: string
  children?: React.ReactNode // for extra content below secondary (e.g. Portfolio preview)
}
```

### 4.2 Layout

```
<motion.div>                   ← fade-up entrance
  <div>                        ← centered flex column, max-w-md, gap-5
    <div>                      ← icon container: w-14 h-14 rounded-2xl {iconColorClass}
      <Icon />                 ← w-6 h-6 text-indigo-500 (or semantic color)
    </div>
    <h3>{headline}</h3>        ← text-lg font-semibold text-gray-900
    <p>{description}</p>       ← text-sm text-gray-500 leading-relaxed text-center max-w-sm
    <Button/Link>              ← primary CTA
    <Link/button>              ← secondary (optional)
    {children}                 ← extra content slot
  </div>
</motion.div>
```

### 4.3 Vertical Centering

The component is centered in the available viewport space:

```
min-h-[calc(100vh-220px)]
flex items-center justify-center
```

The `220px` offset accounts for the topbar (64px), sidebar header, and page padding. This ensures the empty state lives in the optical center, not the mathematical center.

### 4.4 Styling (Light Theme)

```
Container:
  min-h-[calc(100vh-220px)] flex items-center justify-center

Inner wrapper:
  flex flex-col items-center text-center gap-5 max-w-md px-4

Icon container:
  w-14 h-14 rounded-2xl flex items-center justify-center
  Default: bg-indigo-50 border border-indigo-100
  Icon: w-6 h-6 text-indigo-500

Headline:
  font-display text-lg font-semibold text-gray-900

Description:
  text-sm text-gray-500 leading-relaxed max-w-sm

Primary CTA:
  inline-flex items-center gap-2
  bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700
  text-white text-sm font-medium
  px-5 py-2.5 rounded-lg shadow-xs
  transition-colors duration-150
  Arrow icon: w-4 h-4, group-hover:translate-x-0.5 transition-transform

Secondary:
  text-sm text-indigo-500 hover:text-indigo-600 transition-colors
  If it's a link: <Link> with underline-offset-4 hover:underline
  If it's text-only (like format hints): text-xs text-gray-400, no hover
```

### 4.5 Animation

```ts
const emptyStateVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION.medium, // 300ms
      ease: EASING.snappy,
      staggerChildren: 0.06,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.normal, ease: EASING.snappy }, // 200ms
  },
}
```

Each child (icon, headline, description, CTA, secondary) is a `motion.div` with `variants={itemVariants}`. The stagger creates a gentle top-to-bottom cascade that feels alive without being slow.

**First-visit only animation:** Track `sessionStorage.setItem('parcel_empty_anim_{page}', 'true')` on mount. On subsequent visits in the same session, render without animation (`initial={false}` on the parent).

---

## 5. Illustration Style: Lucide Icons in Indigo-50 Circles

### 5.1 Phase 1 — Ship Now

Every empty state uses a Lucide icon inside a rounded container. No custom SVGs, no illustrations to commission. This is consistent with the existing Chat empty state pattern and ships in hours.

**Icon assignments:**

| Page | Lucide Icon | Container BG | Border | Icon Color |
|------|-------------|-------------|--------|------------|
| Dashboard | `Sparkles` | `bg-indigo-50` | `border-indigo-100` | `text-indigo-500` |
| Deals | `Calculator` | `bg-indigo-50` | `border-indigo-100` | `text-indigo-500` |
| Pipeline | `GitBranch` | `bg-indigo-50` | `border-indigo-100` | `text-indigo-500` |
| Portfolio | `TrendingUp` | `bg-emerald-50` | `border-emerald-100` | `text-emerald-500` |
| Chat | `Sparkles` | `bg-indigo-50` | `border-indigo-100` | `text-indigo-500` |
| Documents | `FileText` | `bg-indigo-50` | `border-indigo-100` | `text-indigo-500` |

**Container spec:**

```
w-14 h-14 rounded-2xl border flex items-center justify-center
```

The `rounded-2xl` (20px radius) creates a "squircle" effect that feels modern and warm — more approachable than a hard circle, more refined than a plain square.

### 5.2 Phase 2 — Future Enhancement

Commission six abstract geometric SVG illustrations (120x120px) using the indigo/gray palette:

- Dashboard: constellation of connected dots (network)
- Deals: layered rectangles with a calculator overlay
- Pipeline: horizontal flowing arrows through column gates
- Portfolio: ascending bar chart with a trend line
- Chat: speech bubble with sparkle accents
- Documents: stacked pages with a magnifying glass

These replace the icon containers without changing layout or component API — the `EmptyState` component accepts either an `icon` prop (LucideIcon) or a future `illustration` prop (ReactNode). For now, only `icon` is implemented.

---

## 6. Trial Integration

### 6.1 "14-day Pro trial active" in Checklist

The trial countdown lives at the bottom of the onboarding checklist as a subtle footer line.

**Display logic:**

| Days Remaining | Text | Color |
|----------------|------|-------|
| 14-8 | "Pro trial: {n} days remaining" | `text-gray-400` (neutral) |
| 7-4 | "Pro trial: {n} days remaining" | `text-amber-600` (warm) |
| 3-1 | "Pro trial: {n} days remaining" | `text-red-600` (urgent) |
| 0 | "Pro trial expired" | `text-red-600 font-medium` |

**At 3 days or fewer:** Add a subtle pulse animation on the text:

```ts
animate={{ opacity: [1, 0.7, 1] }}
transition={{ duration: 2, repeat: Infinity }}
```

### 6.2 Trial Badge in Sidebar Footer

Independent of the checklist — this persists even after onboarding is dismissed.

**Placement:** Bottom of the sidebar, above the user avatar/settings row.

```
┌─────────────────────────┐
│   [Sparkles icon]       │
│   Pro Trial             │
│   12 days left          │
│                         │
│   [Upgrade ->]          │
└─────────────────────────┘
```

**Styling:**

```
Compact row layout: flex items-center gap-2 px-3 py-2 rounded-lg

Neutral (8+ days):
  bg-gray-50 border border-gray-100
  Icon: text-indigo-400 w-4 h-4
  Text: text-xs text-gray-500

Warming (4-7 days):
  bg-amber-50 border border-amber-100
  Icon: text-amber-500 w-4 h-4
  Text: text-xs text-amber-700

Urgent (1-3 days):
  bg-red-50 border border-red-100
  Icon: text-red-500 w-4 h-4
  Text: text-xs text-red-700
  Pulse animation on icon

Upgrade link: text-xs text-indigo-500 hover:text-indigo-600 font-medium
```

### 6.3 Welcome Modal Integration

The welcome modal includes the trial message as the subheading: "Your 14-day Pro trial is active." This is the user's first encounter with the trial concept. It is matter-of-fact, not pushy — the urgency escalation comes later as days tick down.

---

## 7. Transition Animation: Empty to Populated

When data arrives and the page transitions from empty to populated, the experience should feel like progress — not a jarring layout shift.

### 7.1 Exit Animation (Empty State Leaving)

```ts
exit={{
  opacity: 0,
  y: -12,
  scale: 0.97,
  filter: 'blur(4px)',
}}
transition={{
  duration: DURATION.normal, // 200ms
  ease: EASING.snappy,
}}
```

The empty state fades up and blurs slightly — it dissolves rather than snapping away.

### 7.2 Enter Animation (Real Content Arriving)

```ts
initial={{ opacity: 0, y: 12 }}
animate={{ opacity: 1, y: 0 }}
transition={{
  duration: DURATION.medium, // 300ms
  ease: EASING.snappy,
  delay: 0.1, // 100ms gap after empty state exits
}}
```

### 7.3 Implementation Pattern

Wrap both states in `AnimatePresence mode="wait"` keyed on a boolean:

```tsx
<AnimatePresence mode="wait">
  {deals.length === 0 ? (
    <motion.div key="empty" {...emptyStateMotion}>
      <EmptyState ... />
    </motion.div>
  ) : (
    <motion.div key="populated" {...populatedMotion}>
      <DealsTable deals={deals} />
    </motion.div>
  )}
</AnimatePresence>
```

`mode="wait"` ensures the empty state fully exits before the populated content enters — no overlapping layouts.

### 7.4 First Deal Celebration (Micro-Moment)

When the user completes their first analysis and the deals page transitions from empty to populated for the first time, fire a subtle celebration:

1. The deal card enters with a slightly more pronounced spring (`stiffness: 350, damping: 20`) that gives it a tiny bounce
2. The card briefly has a `ring-2 ring-indigo-200 ring-offset-2` highlight that fades after 2 seconds
3. The onboarding checklist step 1 animates its checkmark (see Section 2.8)

This only fires once — tracked via `localStorage.setItem('parcel_first_deal_celebrated', 'true')`.

### 7.5 Pipeline First-Card Drop

When the first deal lands in the pipeline, the overlay prompt card (Section 3.3) exits with:

```ts
exit={{
  opacity: 0,
  scale: 0.95,
  filter: 'blur(6px)',
}}
transition={{ duration: DURATION.medium }}
```

The empty dashed column borders transition to solid borders (`border-dashed` -> `border-solid`) with a 300ms CSS transition, and the first deal card enters the appropriate column with the standard `SPRING.default` animation.

---

## 8. Anti-Patterns & Behavioral Rules

### 8.1 When to Show vs. Get Out of the Way

| Condition | Behavior |
|-----------|----------|
| 0 deals, first visit | Welcome modal + checklist expanded + all empty states |
| 0 deals, return visit | No modal (already seen) + checklist expanded + all empty states |
| 1-2 deals | Checklist auto-collapsed, empty states only on truly empty pages |
| 3+ deals | Checklist dismissible (X visible), remaining empty states |
| User dismisses checklist | Gone permanently, `localStorage` flag |
| User clicks "Skip" on modal | Modal dismissed, checklist still visible |
| 7+ days since registration | Checklist auto-collapses regardless of completion |
| All 5 steps complete | Confetti + completion banner + permanent dismiss on click |
| Returning user with data who cleared localStorage | No modal (check `total_deals > 0`), no checklist |

### 8.2 Rules

1. **Never block the UI.** The welcome modal is the only modal in the onboarding flow. Everything else is inline. No mandatory tours, no "you must complete this step" gates, no step-locked sequences.

2. **Never repeat dismissed content.** If the user closes something, it stays closed. Use localStorage keys: `parcel_welcome_seen`, `parcel_onboarding_dismissed`, `parcel_onboarding_complete`, `parcel_first_deal_celebrated`, `parcel_portfolio_visited`.

3. **Never show tooltips on first load.** Tooltips appear on hover/focus, never automatically. No coach marks, no spotlight tours.

4. **Never animate empty states on repeat visits within a session.** Use `sessionStorage` (`parcel_empty_anim_{page}`) to track whether the entrance animation has played.

5. **Never show onboarding to returning users with data.** If query caches show `total_deals > 0`, skip the welcome modal entirely even if localStorage was cleared.

6. **Never gamify beyond the checklist.** No badges, no streaks, no points, no levels. Parcel's users are professional real estate investors. The checklist + confetti-on-completion is the ceiling.

---

## CRITICAL DECISIONS

### Decision 1: Client-Side vs. Server-Side Onboarding State

**Recommendation: Client-side only.**

Use TanStack Query cache checks + localStorage. No new backend endpoint for `/api/onboarding/progress`. This is simpler, ships faster, and avoids a new database table. The tradeoff is that progress does not sync across devices — acceptable for v1 since Parcel is primarily a desktop tool and onboarding completes within a single session for most users. If multi-device becomes important later, add a `user_metadata` JSONB column to the existing users table.

### Decision 2: Sample Property — Pre-fill vs. Demo Sandbox

**Recommendation: Pre-fill via query param (`?sample=true`).**

A full demo sandbox (fake account with pre-loaded data) is over-engineered for v1. A `?sample=true` query parameter that pre-fills the analyzer form with realistic data (742 Maple Drive, $185k, 3bd/2ba) gets 80% of the activation benefit at 5% of the engineering cost. The user still clicks "Analyze" and sees real results from the calculators, which creates genuine time-to-value.

### Decision 3: Pipeline Empty State — Ghost Columns vs. Pure Overlay

**Recommendation: Ghost columns with overlay.**

Rendering the six stage columns (with labels, dashed borders, `bg-gray-50/50` fill) behind the empty state overlay teaches the pipeline model visually before the user has any data. The alternative — a full-page `EmptyState` component with no column context — is simpler but misses an opportunity to reduce cognitive load on first use. The user should think "oh, I drag deals between these stages" before they have their first deal.

### Decision 4: Welcome Modal — Role Personalization Depth

**Recommendation: Copy-only personalization.**

Change the value proposition line and the pre-selected strategy based on role. Do NOT branch into different flows, different CTAs, or different checklist orders per role. The added complexity is not justified — all roles use the same five features. One flow, three copy variants.

### Decision 5: Confetti on Completion — Yes or No

**Recommendation: Yes, but minimal.**

A brief `canvas-confetti` burst (300 particles, 1.5 second duration, gravity: 1.2) when the 5th checklist item completes. This is the one moment of pure delight in the onboarding flow. It should feel like a quiet "nice work" from the app, not a birthday party. No sound effects. No persistent visual. Just a quick burst and the completion banner.

### Decision 6: Empty State Copy Voice — Action vs. Status

**Recommendation: Action-oriented, always.**

Every headline is a verb phrase: "Analyze your first property," "Track deals across stages," "Build your portfolio," "Upload your first document." Never "No deals found," "Pipeline is empty," "Nothing here yet." Status-oriented copy emphasizes absence. Action-oriented copy emphasizes possibility. The user should feel invited, not informed of a void.

### Decision 7: Trial Urgency — Gentle vs. Aggressive

**Recommendation: Gentle escalation.**

Days 14-8: neutral gray text in the checklist footer. Days 7-4: amber. Days 3-1: red with subtle pulse. Never use countdown timers, never show "UPGRADE NOW" banners that obstruct content, never disable features with a paywall modal during the trial. The urgency comes from color escalation and placement, not from interruption. Professional users respond to subtle cues; aggressive upselling damages trust.

### Decision 8: Transition Animation Budget

**Recommendation: 400ms total (200ms exit + 100ms gap + 100ms enter start).**

The empty-to-populated transition should complete within 400ms perceived time. The user just did something (analyzed a deal, uploaded a doc) and wants to see the result. The animation is a bridge, not a performance. If the data loads instantly (from cache), the transition should still play — it provides visual continuity. If data is loading (network), show a skeleton instead of the empty state once the user has initiated the action.
