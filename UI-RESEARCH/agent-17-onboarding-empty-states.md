# Agent 17 — First-Run Experience & Empty States for Parcel

Research date: 2026-03-30
Scope: Onboarding UX, empty state design, activation strategy for a 14-day Pro trial SaaS


## 1. Current State Audit

Parcel currently has minimal empty states across six core pages. The patterns are inconsistent:

| Page | Current Empty State | Issues |
|------|-------------------|--------|
| Dashboard | "Let's analyze your first deal" heading + indigo CTA + 3 hint cards (Pipeline, Documents, AI Chat) | Best of the group but no progress tracking, no personalization by role |
| MyDeals | Icon + "No deals yet" + "Analyze a Deal" link | Minimal, no context about what deals unlock |
| Pipeline | `PipelineEmpty` component: GitBranch icon + "Your pipeline is empty" + "Analyze a Deal" link | Does not explain what the pipeline stages are or why the user should care |
| Portfolio | "No closed deals yet" with Inbox icon inside a dark card | No CTA, no explanation of what portfolio tracking provides |
| Chat | Sparkles icon + "Real Estate AI Specialist" + 4 suggested question buttons | Actually well-designed; the suggested prompts are the strongest empty state in the app |
| Documents | FileText icon + "No documents yet" + "Upload a file to get started" | No upload CTA button, no explanation of what AI analysis does with documents |

Key problems:
- No unified onboarding flow after registration — user lands on Dashboard cold
- No progress indicator or checklist to guide activation
- Empty states are purely informational, not motivational
- No personalization based on selected role (wholesaler / investor / agent)
- Trial urgency (14-day Pro) is never surfaced
- No sample data or guided first-action to reduce time-to-value


## 2. First-Run Experience: Registration to First Value

### 2.1 Current Flow

```
Register (name, email, password, role) → redirect to /dashboard → empty Dashboard
```

The user selects a role during registration (wholesaler, investor, agent) but that role is never used to personalize the subsequent experience. This is wasted signal.

### 2.2 Recommended Flow

```
Register → Welcome Modal (personalized by role, 3-5 sec) → Dashboard with Onboarding Checklist
```

**Welcome Modal** — shown once, immediately after first login:

```
Component: WelcomeModal
Trigger: user.created_at === user.last_login (first session)
Dismissal: "Let's go" button or click-outside
Persist: localStorage key `parcel_welcome_seen`

Layout:
┌─────────────────────────────────────────────┐
│                                             │
│   [Parcel logo]                             │
│                                             │
│   Welcome to Parcel, {firstName}            │
│                                             │
│   Your 14-day Pro trial is active.          │
│   Let's set up your deal analysis           │
│   pipeline in under 2 minutes.              │
│                                             │
│   [Role-specific illustration]              │
│                                             │
│   ┌─────────────────────────────────────┐   │
│   │  Analyze Your First Deal  →         │   │
│   └─────────────────────────────────────┘   │
│                                             │
│   Skip for now                              │
│                                             │
└─────────────────────────────────────────────┘
```

Role-specific copy variants:
- **Wholesaler**: "Run your first MAO analysis and see how Parcel finds the spread."
- **Investor**: "Analyze a rental property and see projected cash flow, cap rate, and ROI."
- **Agent**: "Run comps for a client and generate a branded deal report in seconds."

### 2.3 Time-to-Value Targets

| Metric | Target | How |
|--------|--------|-----|
| Time to first analysis | < 90 seconds | Pre-filled sample property on analyzer form |
| Time to first pipeline deal | < 3 minutes | Auto-prompt "Add to pipeline?" after analysis |
| Time to first AI chat | < 2 minutes | Suggested prompts on empty chat page |
| Time to first document upload | < 5 minutes | Checklist nudge after first deal analyzed |


## 3. Onboarding Checklist Component

### 3.1 Placement & Behavior

The checklist appears as a persistent card at the top of the Dashboard, above KPI cards. It collapses to a single-line progress bar once 3 of 5 items are complete. The user can dismiss it permanently via an "x" button after completing at least 3 items.

### 3.2 Checklist Steps

```
1. [ ] Analyze your first deal          → links to /analyze
2. [ ] Add a deal to your pipeline      → links to /pipeline
3. [ ] Chat with the AI specialist      → links to /chat
4. [ ] Upload a document                → links to /documents
5. [ ] Explore the portfolio tracker    → links to /portfolio
```

### 3.3 Component Specification

```
Component: OnboardingChecklist
File: frontend/src/components/onboarding/OnboardingChecklist.tsx
Props: none (reads from useOnboardingProgress hook)

State source: GET /api/onboarding/progress → { steps: Step[], completed: number, total: number }
Alternative: client-side only via localStorage + query cache checks

Layout (expanded):
┌──────────────────────────────────────────────────────────┐
│  Getting Started                          3/5 complete   │
│  ████████████████████░░░░░░░░░░  60%         [Dismiss ×] │
│                                                          │
│  ✓  Analyze your first deal                              │
│  ✓  Add a deal to your pipeline                          │
│  ✓  Chat with the AI specialist                          │
│  ○  Upload a document                    [Upload →]      │
│  ○  Explore the portfolio tracker        [View →]        │
│                                                          │
└──────────────────────────────────────────────────────────┘

Layout (collapsed — after 3+ complete):
┌──────────────────────────────────────────────────────────┐
│  3/5 setup steps complete  ████████████░░░░░  [Expand ▾] │
└──────────────────────────────────────────────────────────┘
```

### 3.4 Completion Detection Logic

| Step | Completed When |
|------|---------------|
| Analyze first deal | `deals` query returns length >= 1 |
| Add to pipeline | `pipeline` query returns length >= 1 |
| Chat with AI | `chat/history` query returns length >= 1 |
| Upload document | `documents` query returns length >= 1 |
| Explore portfolio | localStorage flag `parcel_portfolio_visited` is set |

### 3.5 Styling

- Background: `bg-app-surface` with `border border-border-subtle`
- Progress bar: indigo gradient `from-[#6366F1] to-[#818CF8]` on `bg-[#1A1A2E]` track
- Completed steps: `text-accent-success` checkmark, `line-through` on text with `text-text-muted`
- Pending steps: `text-text-primary` with small indigo "action" link on the right
- Framer Motion: `AnimatePresence` for expand/collapse, `layout` prop for smooth height transition


## 4. Empty State Design Pattern

### 4.1 Anatomy

Every empty state should follow this vertical stack:

```
┌─────────────────────────────────────┐
│                                     │
│         [Illustration/Icon]         │   48-64px, muted colors
│                                     │
│          Headline (16px)            │   font-semibold, text-text-primary
│     Description (13-14px, 2 lines)  │   text-text-secondary, max-w-md
│                                     │
│     ┌──────────────────────┐        │
│     │   Primary CTA   →   │        │   bg-accent-primary, rounded-lg
│     └──────────────────────┘        │
│                                     │
│       Secondary link (optional)     │   text-accent-primary, text-sm
│                                     │
└─────────────────────────────────────┘
```

### 4.2 Design Rules

1. **One primary CTA per empty state.** Never show two buttons at equal weight.
2. **Headlines are action-oriented, not status-oriented.** "Run your first analysis" instead of "No deals found."
3. **Descriptions explain the value, not the absence.** "See projected returns across 5 strategies" instead of "You haven't analyzed anything yet."
4. **Icons over illustrations for v1.** Parcel's dark theme + geometric design language means Lucide icons in a rounded container (12x12 rounded-xl with 10% opacity bg) are faster to ship and more consistent than custom illustrations.
5. **Vertical centering** within the content area: `min-h-[calc(100vh-200px)]` with flexbox centering.
6. **Framer Motion entrance**: fade-up with 300ms duration, consistent with existing `itemVariants`.


## 5. Page-by-Page Empty State Specifications

### 5.1 Dashboard

The Dashboard already has the strongest empty state. Recommended enhancements:

**Current**: "Let's analyze your first deal" + CTA + 3 hint cards
**Proposed**: Add onboarding checklist above, make hint cards clickable links, add trial countdown

```
Copy:
  Headline: "Welcome to Parcel, {firstName}"
  Subhead: "Your 14-day Pro trial started today. Let's make it count."

Hint cards become navigable:
  Pipeline → /pipeline       "Track deals from lead to close"
  Documents → /documents     "Upload contracts for AI analysis"
  AI Chat → /chat            "Get instant answers on any deal"

Primary CTA (unchanged):
  "Analyze Your First Deal →" → /analyze
```

Component changes:
- Wrap each hint card in `<Link to={...}>` with `hover:border-accent-primary/30` transition
- Add `cursor-pointer` and `group` for hover arrow animation
- Insert `<OnboardingChecklist />` between the heading and the CTA card


### 5.2 MyDeals (Deals Page)

**Current**: Search icon + "No deals yet" + "Analyze your first property to get started" + CTA
**Proposed**: Richer context, sample deal prompt

```
Layout:
┌─────────────────────────────────────────────┐
│                                             │
│   [Calculator icon in rounded container]    │
│                                             │
│   Analyze your first property               │
│   Run numbers on any strategy — wholesale,  │
│   flip, BRRRR, or buy & hold — and your     │
│   deal appears here with full results.      │
│                                             │
│   ┌─────────────────────────────────────┐   │
│   │  Run an Analysis  →                 │   │
│   └─────────────────────────────────────┘   │
│                                             │
│   Or try a sample deal                      │
│                                             │
└─────────────────────────────────────────────┘

Copy:
  Headline: "Analyze your first property"
  Description: "Run numbers on any strategy — wholesale, flip, BRRRR, or buy & hold — and your deal appears here with full results."
  Primary CTA: "Run an Analysis →" → /analyze
  Secondary link: "Or try a sample deal" → /analyze?sample=true
```

The "sample deal" link pre-fills the analyzer form with a realistic property (e.g., 123 Oak St, $185,000 purchase price, 3bd/2ba). This dramatically reduces time-to-value for users who do not have a real deal ready.


### 5.3 Pipeline

**Current**: GitBranch icon + "Your pipeline is empty" + "Analyze a Deal" link
**Proposed**: Show the stage columns with labels even when empty, plus a centered overlay prompt

```
Layout (stage columns visible but empty):
┌──────┬──────┬──────┬──────┬──────┬──────┐
│ Lead │ Ana- │ Off- │Under │ Due  │Closed│
│      │lyzing│er    │Cont. │ Dil. │      │
│      │      │Sent  │      │      │      │
│      │      │      │      │      │      │
│      │      │      │      │      │      │
│    ┌──────────────────────────────┐     │
│    │ [GitBranch icon]             │     │
│    │                              │     │
│    │ Track deals across stages    │     │
│    │ Drag deals between columns   │     │
│    │ as they progress from lead   │     │
│    │ to closed.                   │     │
│    │                              │     │
│    │ [Add Your First Deal →]      │     │
│    └──────────────────────────────┘     │
└──────┴──────┴──────┴──────┴──────┴──────┘

Copy:
  Headline: "Track deals across stages"
  Description: "Drag deals between columns as they progress from lead to closed. Analyze a property first, then add it here."
  Primary CTA: "Add Your First Deal →" → /analyze
```

Key design choice: rendering the empty stage columns (with labels and subtle dashed borders) teaches the user about the pipeline model before they have any data. The overlay card floats centered over the columns at 60% opacity background.


### 5.4 Portfolio

**Current**: Inbox icon + "No closed deals yet" (inside the table area only, no CTA)
**Proposed**: Full-page empty state with value proposition

```
Copy:
  Headline: "Build your portfolio"
  Description: "When you close a deal, add it here to track equity, cash flow, and total returns across your holdings."
  Primary CTA: "View Your Deals →" → /deals
  Secondary: "Learn about portfolio tracking" → tooltip or expandable text

Layout:
┌─────────────────────────────────────────────┐
│                                             │
│   [Briefcase or TrendingUp icon]            │
│                                             │
│   Build your portfolio                      │
│   When you close a deal, add it here to     │
│   track equity, cash flow, and total        │
│   returns across your holdings.             │
│                                             │
│   ┌─────────────────────────────────────┐   │
│   │  View Your Deals  →                │   │
│   └─────────────────────────────────────┘   │
│                                             │
│   ┌─ What you'll see ──────────────────┐   │
│   │ • Total portfolio value & equity    │   │
│   │ • Monthly cash flow chart           │   │
│   │ • Strategy breakdown pie chart      │   │
│   │ • Per-property performance table    │   │
│   └─────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

The "What you'll see" preview box is a bordered card with `bg-app-surface` that gives the user a concrete preview of the value they unlock by closing deals. This is a proven pattern for reducing perceived emptiness.


### 5.5 Chat

**Current state is already well-designed.** The suggested question buttons are the right pattern. Minor enhancements:

```
Additions:
  - Add a subtle "Powered by Claude" label below the AI Specialist heading
  - Personalize suggested prompts by role:
    Wholesaler: "How do I calculate MAO?" / "What's a good assignment fee?"
    Investor: "Explain cap rate vs cash-on-cash" / "BRRRR vs buy & hold?"
    Agent: "How do I present comps?" / "What's a good listing strategy?"
  - Add a 5th prompt: "Analyze my latest deal" (context-aware, only if user has >= 1 deal)
```


### 5.6 Documents

**Current**: FileText icon + "No documents yet" + "Upload a file to get started" (text only, no button)
**Proposed**: Upload CTA button + explanation of AI analysis capabilities

```
Copy:
  Headline: "Upload your first document"
  Description: "Drop a lease, contract, or inspection report and Parcel's AI will extract key terms, flag risks, and summarize the details."
  Primary CTA: "Upload a File →" (triggers file picker / dropzone)
  Supported formats note: "PDF, DOCX, images — up to 10 MB"

Layout:
┌─────────────────────────────────────────────┐
│                                             │
│   [FileText icon in rounded container]      │
│                                             │
│   Upload your first document                │
│   Drop a lease, contract, or inspection     │
│   report and Parcel's AI will extract key   │
│   terms, flag risks, and summarize the      │
│   details.                                  │
│                                             │
│   ┌─────────────────────────────────────┐   │
│   │  Upload a File  →                  │   │
│   └─────────────────────────────────────┘   │
│                                             │
│   PDF, DOCX, images — up to 10 MB          │
│                                             │
└─────────────────────────────────────────────┘
```


## 6. Illustration Style Decision

### Options Evaluated

| Style | Pros | Cons | Verdict |
|-------|------|------|---------|
| Abstract geometric | Matches Parcel's dark/indigo design language, fast to build with CSS/SVG | Can feel cold, less personality | **Recommended for v1** |
| Hand-drawn / sketchy | Warm, approachable, high personality | Clashes with Parcel's precise, data-driven aesthetic | Not recommended |
| Isometric 3D | Professional, detailed | Expensive to produce, slow to load, hard to maintain consistency | Not recommended |
| Lucide icons in containers | Already in use, zero new assets, consistent | Less visual impact than dedicated illustrations | **Ship this first** |

### Recommended Approach: Two-Phase

**Phase 1 (ship now)**: Use Lucide icons inside `w-14 h-14 rounded-2xl bg-accent-primary/10 border border-accent-primary/20` containers. This matches the existing Chat empty state icon treatment and ships in hours.

**Phase 2 (later)**: Commission 6 abstract geometric illustrations (one per page) using the indigo/slate palette. Each illustration is a simple SVG, 120x120px, depicting the concept abstractly — e.g., stacked cards for Pipeline, rising bar chart for Portfolio, magnifying glass over a house for Deals. These replace the icon containers without changing layout.

Icon assignments for Phase 1:

| Page | Icon | Container Color |
|------|------|----------------|
| Dashboard | `Sparkles` | `bg-accent-primary/10` |
| Deals | `Calculator` | `bg-accent-primary/10` |
| Pipeline | `GitBranch` | `bg-accent-primary/10` |
| Portfolio | `TrendingUp` | `bg-emerald-500/10` |
| Chat | `Sparkles` (already) | `bg-accent-primary/10` |
| Documents | `FileText` | `bg-accent-primary/10` |


## 7. Progress Indicators & Gamification

### 7.1 Setup Completion Percentage

Display in the onboarding checklist as a progress bar. The percentage maps directly to completed steps: 0%, 20%, 40%, 60%, 80%, 100%.

### 7.2 Trial Countdown

Show remaining trial days in the sidebar footer or Dashboard header:

```
"Pro trial: 12 days remaining"
```

At day 10: neutral text color (`text-text-muted`)
At day 5: amber text (`text-yellow-400`)
At day 2: red text (`text-accent-danger`) + subtle pulse animation

### 7.3 Gamification — Keep It Minimal

Parcel is a professional tool for real estate investors. Avoid badges, streaks, or point systems. The only gamification-adjacent element should be the checklist completion celebration:

When all 5 checklist items are complete, show a one-time confetti animation (use `canvas-confetti`, 2KB) and replace the checklist with:

```
┌──────────────────────────────────────────────────────────┐
│  ✓  You're all set! Parcel is ready for your deals.     │
│                                           [Dismiss]      │
└──────────────────────────────────────────────────────────┘
```

No ongoing gamification after onboarding.


## 8. When to Show Onboarding vs Get Out of the Way

### Decision Framework

| Condition | Behavior |
|-----------|----------|
| 0 deals analyzed | Full onboarding: welcome modal (first visit), checklist on Dashboard, all empty states active |
| 1-2 deals analyzed | Partial onboarding: checklist still visible (collapsed), empty states on unused pages |
| 3+ deals analyzed | Minimal onboarding: checklist dismissable, empty states only on truly empty pages |
| User dismisses checklist | Remove immediately, store in localStorage, never show again |
| User clicks "Skip" on welcome modal | Dismiss modal, still show checklist on Dashboard |
| 7+ days since registration | Auto-collapse checklist to single-line regardless of completion |
| All 5 steps complete | Show completion message once, then remove checklist permanently |

### Anti-Patterns to Avoid

1. **Never block the UI.** The welcome modal is the only modal; everything else is inline. No mandatory tours, no "you must complete this step" gates.
2. **Never repeat dismissed content.** If the user closes something, it stays closed. Use localStorage keys with the pattern `parcel_dismissed_{feature}`.
3. **Never show tooltips on first load.** Tooltips should appear on hover/focus, not automatically pop up to "teach" the user.
4. **Never animate empty states on repeat visits.** Use `sessionStorage` to track whether the entrance animation has played.
5. **Never show onboarding to returning users with data.** If `total_deals > 0`, skip the welcome modal entirely even if `parcel_welcome_seen` is not set (they may have cleared localStorage).


## 9. Shared EmptyState Component

To enforce consistency, extract a reusable component:

```
Component: EmptyState
File: frontend/src/components/ui/EmptyState.tsx

Props:
  icon: LucideIcon             — the Lucide icon component
  headline: string             — action-oriented headline
  description: string          — value proposition, 1-2 sentences
  ctaLabel: string             — button text
  ctaTo?: string               — react-router Link destination
  ctaOnClick?: () => void      — alternative: callback instead of navigation
  secondaryLabel?: string      — optional text link below CTA
  secondaryTo?: string         — optional link destination
  secondaryOnClick?: () => void
  iconColorClass?: string      — defaults to 'bg-accent-primary/10 border-accent-primary/20'
  className?: string           — additional container classes

Layout:
  Centered flex column, max-w-md, gap-4
  Icon in 56px rounded-2xl container
  Headline: text-base font-semibold text-text-primary
  Description: text-sm text-text-secondary leading-relaxed text-center
  CTA: bg-accent-primary px-5 py-2.5 rounded-lg text-white text-sm font-medium
  Secondary: text-sm text-accent-primary hover:text-accent-primary/80
  Motion: initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
```

Usage across all 6 pages ensures visual consistency without copy-pasting layout code.


## 10. Sample Property Strategy

### Why It Matters

The single biggest activation barrier in any analysis tool is "I don't have data ready." A pre-filled sample property eliminates this friction.

### Implementation

Add a query parameter `?sample=true` to the analyzer form route. When present, pre-fill:

```
Address: 742 Maple Drive, Austin, TX 78701
Purchase Price: $185,000
ARV (After Repair Value): $265,000
Repair Costs: $42,000
Monthly Rent: $1,850
Property Type: Single Family
Bedrooms: 3 / Bathrooms: 2
```

The form header shows a dismissible banner: "This is a sample property. Edit any field or clear all to start fresh."

This sample deal can be triggered from:
- The "Or try a sample deal" secondary link on the Deals empty state
- The welcome modal's primary CTA (optional variant)
- A "Try with sample data" link on the analyzer form page itself


---

## RECOMMENDATIONS FOR PARCEL

1. **Build the shared `EmptyState` component first.** It takes under an hour and immediately improves all 6 pages. Use Lucide icons in indigo containers — no custom illustrations needed for v1.

2. **Add the `OnboardingChecklist` to the Dashboard.** Client-side detection (check query caches for deals, pipeline, chat history, documents) is simpler than a new API endpoint and ships faster. Store dismissal in localStorage.

3. **Make the welcome modal role-aware.** The registration form already captures role (wholesaler/investor/agent). Use it to personalize the welcome copy and suggested first action. This is low-effort, high-signal personalization.

4. **Add a sample property to the analyzer.** This is the single highest-impact change for activation. Users who complete their first analysis within 2 minutes of registration are far more likely to convert. A `?sample=true` query parameter with pre-filled fields eliminates the "I don't have a deal ready" objection.

5. **Show the empty pipeline stages.** Rendering the column headers (Lead, Analyzing, Offer Sent, Under Contract, Due Diligence, Closed) even when empty teaches the pipeline model visually. Overlay the empty state prompt on top.

6. **Add a trial countdown to the sidebar.** A simple "Pro trial: X days left" in the sidebar footer creates gentle urgency without being aggressive. Escalate the visual treatment (neutral to amber to red) as the deadline approaches.

7. **Rewrite empty state copy to be action-oriented.** Replace every "No X yet" with a verb phrase: "Analyze your first property," "Track deals across stages," "Build your portfolio," "Upload your first document." The headline should tell the user what to do, not what is missing.

8. **Make hint cards on Dashboard into actual links.** The current hint cards (Pipeline, Documents, AI Chat) have `cursor-default` and no click handler. Wrapping them in `<Link>` components is a one-line change that improves navigation for new users.

9. **Add the "What you'll see" preview to Portfolio.** Portfolio is the page users are least likely to visit early (it requires closed deals). A preview list of what the populated page contains gives them a reason to work toward closing a deal.

10. **Do not over-invest in gamification.** Parcel's users are professional real estate investors. A completion checklist with a simple progress bar is appropriate. Badges, streaks, points, or elaborate celebration animations would feel patronizing. The one exception: a brief confetti burst on 5/5 checklist completion is acceptable as a moment of delight.
