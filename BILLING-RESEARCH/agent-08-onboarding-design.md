# Agent 08 — Onboarding Flow Design Research for Parcel

> Comprehensive research on onboarding patterns, first-run UX, personalization,
> and activation strategy for a real estate deal analysis SaaS.
>
> Date: 2026-03-28

---

## Table of Contents

1. [Progressive Onboarding vs Wizard vs Checklist](#1-progressive-onboarding-vs-wizard-vs-checklist)
2. [Real Estate Investor Context Gathering](#2-real-estate-investor-context-gathering)
3. [First-Run Experience: Empty States, Sample Data, Guided Tour](#3-first-run-experience)
4. [Onboarding Checklist Pattern (Notion / Linear / Figma Style)](#4-onboarding-checklist-pattern)
5. [Time-to-First-Analysis: Sub-5-Minute Activation](#5-time-to-first-analysis)
6. [Pre-Populated Demo Deal for Instant Gratification](#6-pre-populated-demo-deal)
7. [Tooltips, Coach Marks, and Interactive Tutorials](#7-tooltips-coach-marks-interactive-tutorials)
8. [Personalization During Onboarding](#8-personalization-during-onboarding)
9. [Email Welcome Sequence Synchronized with In-App](#9-email-welcome-sequence)
10. [Measuring Onboarding Completion and Drop-Off](#10-measuring-onboarding-completion)
11. [Mobile-First Onboarding](#11-mobile-first-onboarding)
12. [Team Plan Onboarding](#12-team-plan-onboarding)
13. [Recommendations for Parcel](#recommendations-for-parcel)

---

## 1. Progressive Onboarding vs Wizard vs Checklist

### Three Core Patterns

| Pattern | Description | Best For | Risk |
|---------|-------------|----------|------|
| **Wizard** | Linear multi-step flow after signup (Airtable, Typeform) | Complex initial config; one-time setup | Users skip/bounce if too many steps |
| **Checklist** | Persistent task list in-app (Notion, Linear, Figma) | Products with multiple activation actions | Can feel like homework if poorly scoped |
| **Progressive** | Contextual guidance revealed as user explores (Slack, Dropbox) | Exploration-based products; low setup burden | Users may miss key features if aimless |

### Industry Consensus (2025-2026)

- **Hybrid wins.** The highest-performing SaaS onboarding combines a short wizard (2-3 screens for personalization) with a persistent checklist (3-5 items) and contextual tooltips for advanced features.
- **Progressive disclosure is mandatory.** Never expose all features at once. Unlock advanced capabilities after the user completes core activation actions.
- **3-7 steps is the sweet spot** for checklists. Fewer than 3 feels trivial; more than 7 causes abandonment.
- **Completion rates:** Progress bars and checklists increase completion by 20-30%. Notion's setup checklist drives 60% onboarding completion and a 40% 30-day retention bump.

### Parcel Implication

Parcel should use a **micro-wizard (2 screens) + persistent checklist (5 items) + contextual tooltips** approach. The wizard captures investor profile data (strategy preference, experience level); the checklist drives activation actions (first analysis, pipeline setup); tooltips explain features in context.

---

## 2. Real Estate Investor Context Gathering

### What Context Do We Need?

Real estate investors are not a monolith. The onboarding must capture enough to personalize without creating friction.

**Essential fields (capture at signup or first session):**

| Signal | Options | Why It Matters |
|--------|---------|----------------|
| **Primary strategy** | BRRRR, Flip, Wholesale, Buy & Hold, Creative Finance | Determines which calculator to surface first, which metrics to highlight |
| **Experience level** | First deal, 1-5 deals, 5-20 deals, 20+ deals | Controls tooltip density, terminology complexity, feature unlock pace |
| **Deal volume goal** | 1-2/quarter, 3-5/quarter, 5+/quarter | Affects pipeline emphasis, team plan upsell timing |
| **Market** | City/state or zip code | Enables market-specific defaults (tax rates, insurance, rent comps) |

**Nice-to-have (defer to settings or progressive collection):**

| Signal | When to Collect |
|--------|-----------------|
| Funding source (cash, hard money, conventional) | When user starts first analysis form |
| Entity structure (LLC, sole prop) | Settings or document upload |
| Team size | Settings page or upgrade prompt |
| Current portfolio size | Portfolio setup step |

### Current State in Parcel

Registration already collects **role** (wholesaler, investor, agent) — this is a good start. The onboarding should extend this with **strategy preference** and **experience level** during the first session, not at registration (to avoid increasing signup friction).

### Implementation Approach

```
Registration (existing):
  name + email + password + role (wholesaler/investor/agent)

Post-signup micro-wizard (NEW, 2 screens):
  Screen 1: "What's your primary strategy?"
    → 5 cards: BRRRR | Flip | Wholesale | Buy & Hold | Creative Finance
    → Select one (or "I use multiple")

  Screen 2: "How many deals have you analyzed?"
    → 4 options: "This is my first" | "1-5" | "5-20" | "20+"
    → Optional: "What market are you in?" (city autocomplete)

  → Skip link always visible ("I'll set this up later")
  → Data stored in user profile, used for personalization
```

---

## 3. First-Run Experience

### Empty State Design Patterns

Empty states fall into three categories (per NN/g research):

1. **Informational** — explain why the screen is empty
2. **Action-oriented** — guide users toward the next step that populates the interface
3. **Starter content** — pre-populate with sample/demo data users can explore and delete

**What works best for analytics/calculator tools:**
- Action-oriented empty states with a single prominent CTA outperform informational ones
- Pre-populated demo data (Trello's welcome board, Notion's starter templates) lets users explore immediately without commitment anxiety
- The combination of a clear CTA + sample data to reference is the gold standard

### Current State in Parcel

The Dashboard already has a decent empty state:
- "Let's analyze your first deal." headline
- "Analyze Your First Deal" CTA button
- Three hint cards (Pipeline, Documents, AI Chat)

**What's missing:**
- No sample deal to reference — user has to imagine what results look like
- No checklist or progress indicator
- Hint cards are static and non-interactive (don't link anywhere)
- No personalization based on role/strategy

### Recommended First-Run Flow

```
User signs up → micro-wizard (2 screens) → lands on Dashboard

Dashboard (first visit, no deals):
  ┌──────────────────────────────────────────────────────────┐
  │  Welcome, [Name]! Your 14-day Pro trial is active.       │
  │                                                          │
  │  ┌─ ONBOARDING CHECKLIST (persistent, right sidebar) ──┐ │
  │  │ ✅ Create your account                               │ │
  │  │ ○  Analyze your first deal          ← highlighted    │ │
  │  │ ○  Review AI insights                                │ │
  │  │ ○  Add deal to pipeline                              │ │
  │  │ ○  Explore the demo account                          │ │
  │  │                                                      │ │
  │  │ [2/5 complete]  ████░░░░░░                           │ │
  │  └──────────────────────────────────────────────────────┘ │
  │                                                          │
  │  ┌─ QUICK START ───────────────────────────────────────┐ │
  │  │ "Run your first [BRRRR] analysis"                   │ │
  │  │  Pre-filled example: 123 Oak St, Atlanta GA         │ │
  │  │  [Start with example data]  [Start from scratch]    │ │
  │  └────────────────────────────────────────────────────-┘ │
  │                                                          │
  │  ┌─ OR EXPLORE ────────────────────────────────────────┐ │
  │  │ [View Demo Account]  See a fully populated Parcel   │ │
  │  │                      with 12 real deals             │ │
  │  └────────────────────────────────────────────────────-┘ │
  └──────────────────────────────────────────────────────────┘
```

---

## 4. Onboarding Checklist Pattern

### How Notion, Linear, and Figma Do It

**Notion:**
- Starter workspace with interactive Getting Started page
- Checklist items are actual Notion toggle blocks — checking them teaches the product
- Content doubles as demo data and tutorial
- No separate onboarding UI; the product IS the onboarding

**Linear:**
- Persistent sidebar checklist with ~6 items
- Items link directly to the action (e.g., "Create your first issue" opens the issue creator)
- Progress bar at top
- Dismissible but reappears until complete
- Celebrates completion with confetti animation

**Figma:**
- Interactive tutorial files in the workspace
- Checklist embedded in the file browser sidebar
- Links to templates and community resources

### Design Specification for Parcel

**Checklist Component: `<OnboardingChecklist />`**

Location: Collapsible panel in the right sidebar of the Dashboard (desktop) or bottom sheet (mobile).

```
Checklist Items (5 total):
─────────────────────────────────────
✅ 1. Create your account              [auto-complete on signup]
○  2. Analyze your first deal          [links to /analyze/{strategy}]
○  3. Review your AI-generated report  [links to results page]
○  4. Add a deal to your pipeline      [links to /pipeline]
○  5. Try the AI chat                  [links to /chat]
─────────────────────────────────────
[3/5 complete]  ██████░░░░

"Dismiss checklist" link at bottom
```

**Behavior:**
- Items auto-complete based on user actions (event-driven, not self-reported)
- Current/next incomplete item is visually highlighted (indigo border, subtle pulse)
- Clicking an item navigates to the relevant page with a query param (`?onboarding=step3`) that can trigger contextual guidance
- Progress persists in the database (`user.onboarding_progress` JSONB column)
- Dismissible via "X" — re-accessible from Settings or help menu
- On 5/5 completion: celebration moment (confetti or success animation) + prompt to explore Pro features

**Backend Schema Addition:**

```python
# In User model or separate OnboardingProgress model
onboarding_progress = Column(JSONB, default={
    "wizard_completed": False,
    "first_deal_analyzed": False,
    "report_reviewed": False,
    "pipeline_deal_added": False,
    "chat_used": False,
    "checklist_dismissed": False,
    "completed_at": None,
})
```

**Completion Tracking Endpoints:**

```
GET  /api/onboarding/progress     → returns current checklist state
POST /api/onboarding/complete     → body: { "step": "first_deal_analyzed" }
POST /api/onboarding/dismiss      → hides checklist
```

---

## 5. Time-to-First-Analysis

### The 5-Minute Target

Industry data shows the critical window:
- **60 seconds:** User should be authenticated and inside the product
- **2-5 minutes:** First value moment should occur (see results, get insight)
- **5-15 minutes:** Full onboarding flow completion

For Parcel, the "first value moment" is **seeing calculated deal metrics** (cash-on-cash return, cap rate, profit margin). Every second of friction between signup and that moment costs activation.

### Current Friction Points

Analyzing the existing flow:

```
Signup → Dashboard (empty) → Click "Analyze" → Choose strategy →
Fill 6-9 form fields → Submit → Wait for calculation → See results

Estimated time: 4-8 minutes (if user knows what numbers to enter)
Problem: New investors may not know typical values for fields
```

### Optimization Strategy

**A. Pre-filled example deal (biggest impact)**
- After the micro-wizard, if user picks "BRRRR", route them to `/analyze/brrrr?prefill=example`
- Form loads with realistic example values (based on their market if provided)
- User can modify values or submit as-is
- Result: Time-to-first-analysis drops to ~90 seconds

**B. Smart defaults for blank fields**
- If a user leaves a field empty, use market-appropriate defaults
- Show defaults as placeholder text: "Typical: $1,200/mo"
- Auto-fill vacancy rate (8%), maintenance (10%), mgmt fee (8%) as sensible defaults

**C. Quick Analysis mode**
- Minimal form: just purchase price + ARV (for wholesale/flip) or purchase price + rent (for buy & hold)
- Calculate with smart defaults for everything else
- Show results with "Refine your numbers" CTA to edit advanced fields
- This gets time-to-first-analysis under 60 seconds

**D. One-click demo analysis**
- "See how it works" button on empty dashboard
- Runs a pre-configured analysis instantly, shows results page
- Banner: "This is a sample analysis. [Run your own numbers →]"

### Recommended Flow

```
Signup (30s) → Micro-wizard (30s) → Dashboard with pre-filled CTA (5s) →
Pre-filled form, user hits "Analyze" (15s) → Results page (instant)

Total: ~80 seconds to first value moment
```

---

## 6. Pre-Populated Demo Deal

### Why This Matters

- 40-60% of trial users sign up and never return (ProductLed research)
- Users who see value in the first session are 3x more likely to convert
- A pre-populated deal removes the "blank canvas paralysis" problem
- Users can explore results, PDF reports, and AI chat without inputting anything

### Implementation: Two Approaches

**Approach A: Cloneable Demo Deal (recommended)**

When a new user signs up, automatically create one "example deal" in their account:

```python
# On registration, seed one deal:
EXAMPLE_DEALS = {
    "brrrr": {
        "address": "742 Evergreen Terrace, Memphis TN 38104",
        "strategy": "brrrr",
        "inputs": {
            "purchase_price": 85000,
            "repair_costs": 35000,
            "arv": 165000,
            "monthly_rent": 1400,
            "down_payment_pct": 20,
            "interest_rate": 7.5,
            # ... full input set
        },
        "is_example": True,  # Flag for UI treatment
    },
    "wholesale": { ... },
    "flip": { ... },
    "buy_and_hold": { ... },
    "creative_finance": { ... },
}
# Select based on user's strategy preference from micro-wizard
```

**UI Treatment:**
- Example deal appears on Dashboard with a subtle "Example" badge
- Results page shows a banner: "This is a sample deal. Edit the numbers or [analyze your own →]"
- User can delete it anytime
- Does NOT count toward any plan limits

**Approach B: "Explore Demo" Quick Action**

Link to the existing demo account (demo@parcel.app) as a read-only tour:

```
Dashboard → "Explore a fully loaded account" button →
Opens demo view (read-only, clearly labeled) →
User browses 12 seeded deals, pipeline, portfolio →
CTA: "Ready to analyze your own deal? [Start now →]"
```

### Recommendation

Use **both**. Approach A gives the user something in their own account immediately (ownership effect). Approach B lets them see the product's full potential with a mature dataset.

---

## 7. Tooltips, Coach Marks, Interactive Tutorials

### What the Research Shows

**NN/g findings (2025-2026):**
- Users who read onboarding tutorials perceive tasks as MORE difficult (not less)
- Deck-of-cards tutorials (swipeable intro screens) show NO advantage in success rates
- Contextual tooltips triggered by user behavior outperform front-loaded tutorials
- Less text = more likely users read and follow instructions
- Coach marks on specific UI elements are more effective than full-screen overlays

**Effectiveness Hierarchy (best to worst):**

1. **Contextual tooltips** — appear when user hovers/focuses on a specific element for the first time ("This is your cash-on-cash return — the annual return on your actual cash invested")
2. **Empty state guidance** — instructional content in otherwise blank areas
3. **Coach marks** — spotlight + tooltip on a specific button or section, triggered by context
4. **Step-by-step walkthroughs** — guided tour with sequential highlights (use sparingly)
5. **Video tutorials** — effective for complex workflows but high production cost
6. **Swipeable intro screens** — lowest effectiveness, highest skip rate

### Parcel Tooltip Strategy

**Use contextual tooltips for:**
- Financial metrics on the results page (cap rate, cash-on-cash, DSCR, GRM)
- Pipeline stage definitions ("What does 'Under Contract' mean?")
- AI chat capabilities ("Try asking: 'What's the break-even rent for this property?'")
- Form field explanations (already exist via `ConceptTooltip` component)

**Use coach marks for:**
- First visit to Results page: highlight "Add to Pipeline" button
- First visit to Pipeline: highlight drag-and-drop capability
- First visit to Chat: highlight suggested prompts

**Implementation approach:**

```typescript
// Track which tooltips/coach marks user has seen
interface OnboardingTooltips {
  results_metrics: boolean;      // Cap rate, CoC explanation
  results_pipeline_cta: boolean; // "Add to Pipeline" button highlight
  pipeline_drag_drop: boolean;   // Drag deal between stages
  chat_suggestions: boolean;     // Suggested AI prompts
  pdf_report: boolean;           // Export PDF button
}

// Store in localStorage + sync to backend
// Show each tooltip exactly once
// Respect user's "dismiss all tips" preference
```

**Coach mark component spec:**

```
┌────────────────────────────────────────┐
│  ╔══════════════════════╗              │
│  ║  [Highlighted Element] ║ ◄── spotlight
│  ╚══════════════════════╝              │
│         │                              │
│         ▼                              │
│  ┌─────────────────────────────┐       │
│  │ 💡 Add this deal to your    │       │
│  │    pipeline to track it     │       │
│  │    from lead to close.      │       │
│  │                             │       │
│  │    [Got it]  [Show me how]  │       │
│  └─────────────────────────────┘       │
└────────────────────────────────────────┘
```

---

## 8. Personalization During Onboarding

### Strategy-Based UI Branching

The micro-wizard captures the user's primary strategy. This signal should propagate throughout the first session:

| User Signal | Personalization Effect |
|-------------|----------------------|
| Strategy = BRRRR | Default analyzer = BRRRR; Dashboard KPIs emphasize cash-on-cash, equity capture; AI chat starter: "How does BRRRR refinancing work?" |
| Strategy = Flip | Default analyzer = Flip; KPIs emphasize ROI, rehab budget, profit margin; Chat starter: "What's a good profit margin on a flip?" |
| Strategy = Wholesale | Default analyzer = Wholesale; KPIs emphasize assignment fee, MAO; Chat starter: "How do I calculate Maximum Allowable Offer?" |
| Strategy = Buy & Hold | Default analyzer = Buy & Hold; KPIs emphasize cash flow, cap rate, DSCR; Chat starter: "What cap rate should I target?" |
| Strategy = Creative Finance | Default analyzer = Creative Finance; KPIs emphasize seller financing terms; Chat starter: "Explain subject-to financing" |
| "I use multiple" | Show strategy comparison on Dashboard; Suggest running the same deal through multiple calculators |

### Experience-Level Branching

| Level | Tooltip Density | Vocabulary | Feature Unlock |
|-------|----------------|------------|----------------|
| "First deal" | High — show all tooltips, concept explanations | Plain language, avoid jargon | Start with Quick Analysis mode; unlock advanced fields after first deal |
| "1-5 deals" | Medium — show financial metric tooltips only | Standard RE investing terms | Show all fields; suggest pipeline after 2nd deal |
| "5-20 deals" | Low — only show new/unfamiliar features | Assume RE literacy | Enable batch analysis, portfolio tracking from day 1 |
| "20+" | Minimal — skip tooltips unless new feature | Expert mode | Highlight Team plan, integrations, PDF reports |

### Implementation

```typescript
// In authStore or userProfileStore
interface UserOnboardingProfile {
  primary_strategy: Strategy | 'multiple';
  experience_level: 'first' | '1-5' | '5-20' | '20+';
  market?: string;
  onboarding_completed: boolean;
}

// Feature flags derived from profile
function getOnboardingConfig(profile: UserOnboardingProfile) {
  return {
    showQuickAnalysisMode: profile.experience_level === 'first',
    tooltipDensity: profile.experience_level === 'first' ? 'high' :
                    profile.experience_level === '1-5' ? 'medium' : 'low',
    defaultStrategy: profile.primary_strategy !== 'multiple'
                     ? profile.primary_strategy : 'wholesale',
    showStrategyComparison: profile.primary_strategy === 'multiple',
    suggestedChatPrompts: STRATEGY_PROMPTS[profile.primary_strategy],
  };
}
```

---

## 9. Email Welcome Sequence

### Why Email Matters for PLG

- 40-60% of trial users sign up and never come back
- In-app onboarding only reaches users who are IN the app
- Automated email workflows achieve 61% open rate vs 51% for single emails
- Behavior-triggered emails have 5% CTR vs 2% for batch sends

### Recommended 14-Day Trial Email Sequence

```
Day 0 (immediate):
  SUBJECT: "Welcome to Parcel — your first deal is waiting"
  CONTENT: Confirm account, link to pre-filled example deal,
           highlight 14-day Pro trial, link to demo account
  TRIGGER: Signup

Day 1 (if no analysis completed):
  SUBJECT: "Run your first deal analysis in 90 seconds"
  CONTENT: Step-by-step screenshot guide, deep link to
           /analyze/{their_strategy}?prefill=example
  TRIGGER: Signup + no deal_analyzed event

Day 1 (if analysis completed):
  SUBJECT: "Nice — here's what to do with your [strategy] analysis"
  CONTENT: Explain AI insights, suggest adding to pipeline,
           link to PDF export
  TRIGGER: first deal_analyzed event

Day 3 (if only 1 deal):
  SUBJECT: "Compare strategies: run the same deal as a [other_strategy]"
  CONTENT: Explain multi-strategy comparison, deep link to
           /analyze/{alt_strategy}?prefill=clone
  TRIGGER: 1 deal analyzed, no second deal

Day 5 (if pipeline empty):
  SUBJECT: "Track your deals from lead to close"
  CONTENT: Pipeline overview, drag-and-drop demo GIF,
           deep link to /pipeline
  TRIGGER: Has deals but pipeline_deal_added = false

Day 7 (trial midpoint):
  SUBJECT: "You're halfway through your Pro trial"
  CONTENT: Usage summary (X deals analyzed, Y in pipeline),
           highlight Pro features they haven't tried,
           link to pricing page
  TRIGGER: Calendar-based, day 7 of trial

Day 10 (if not converted):
  SUBJECT: "3 Pro features you haven't tried yet"
  CONTENT: Based on unused features (PDF reports, AI chat,
           document processing), personalized recommendations
  TRIGGER: Day 10 + not on paid plan

Day 13 (trial ending):
  SUBJECT: "Your Pro trial ends tomorrow"
  CONTENT: Clear summary of what they'll lose, usage stats,
           upgrade CTA, reassurance about Free tier
  TRIGGER: Day 13 of trial

Day 14 (trial expired):
  SUBJECT: "Your trial ended — here's what you keep"
  CONTENT: Explain Free tier limits, show what upgrading unlocks,
           special offer (first month 20% off?) if high engagement
  TRIGGER: Trial expiration
```

### Synchronization Rules

- **Never send an email about a step the user already completed.** Check onboarding_progress before every send.
- **In-app and email should reinforce, not repeat.** If the checklist says "Analyze your first deal" and the email says the same, they should deep-link to the same pre-filled form.
- **Suppress marketing emails during active sessions.** If user is currently in-app, delay the email by 4 hours.
- **Track email → in-app conversion.** UTM params on all deep links: `?utm_source=email&utm_campaign=onboarding&utm_content=day3_compare`

---

## 10. Measuring Onboarding Completion

### Core Metrics

| Metric | Formula | Target | Tool |
|--------|---------|--------|------|
| **Signup-to-first-analysis rate** | Users who complete 1+ analysis / total signups | >60% | Backend event tracking |
| **Time-to-first-analysis** | Median time from signup to first deal_analyzed event | <5 min | Backend timestamps |
| **Checklist completion rate** | Users completing 5/5 items / total signups | >40% | Onboarding progress table |
| **Step-level drop-off** | % who start step N but don't complete it | Identify worst step | Funnel analysis |
| **Activation rate** | Users reaching "activated" state / total signups | >37% (industry avg) | Composite metric |
| **Trial-to-paid conversion** | Users converting to paid / trial starts | >5% | Billing system |
| **Day 7 retention** | Users active on day 7 / total signups | >25% | Login/activity tracking |
| **Day 30 retention** | Users active on day 30 / total signups | >15% | Login/activity tracking |

### Defining "Activated"

For Parcel, a user is "activated" when they have completed at least 3 of these 5 actions:

1. Analyzed at least one deal
2. Viewed the AI-generated insights on a results page
3. Added a deal to the pipeline
4. Used the AI chat
5. Uploaded or viewed a document

Research shows that users who adopt 3+ core features during onboarding have 40% higher retention (Pendo, 2025).

### Event Tracking Implementation

```python
# Backend: onboarding events table
class OnboardingEvent(Base):
    __tablename__ = "onboarding_events"
    id = Column(UUID, primary_key=True, default=uuid4)
    user_id = Column(UUID, ForeignKey("users.id"), nullable=False)
    event_type = Column(String, nullable=False)  # e.g., "deal_analyzed", "pipeline_added"
    metadata = Column(JSONB, default={})          # e.g., {"strategy": "brrrr", "prefilled": true}
    created_at = Column(DateTime, default=func.now())

# Track these events:
ONBOARDING_EVENTS = [
    "signup_completed",
    "wizard_completed",
    "wizard_skipped",
    "first_deal_analyzed",
    "report_viewed",
    "pipeline_deal_added",
    "chat_message_sent",
    "document_uploaded",
    "pdf_exported",
    "checklist_dismissed",
    "checklist_completed",
    "demo_account_viewed",
]
```

### Funnel Visualization

```
Signup ──────────────── 100%
  │
  ▼
Wizard completed ────── 75%  (target; 25% skip)
  │
  ▼
First analysis ──────── 60%  (critical activation gate)
  │
  ▼
Pipeline deal added ─── 35%
  │
  ▼
AI chat used ────────── 30%
  │
  ▼
Checklist complete ──── 25%
  │
  ▼
Trial → Paid ────────── 8-12%
```

### Identifying Drop-Off Points

- **Highest risk drop-off: Signup → First analysis.** This is the biggest gap. Addressing it (via pre-filled deals, quick analysis) can improve overall completion by 10-15% (Appcues data).
- **Second risk: Analysis → Pipeline.** Users may not understand why pipeline matters. The coach mark on the results page ("Add to Pipeline") directly addresses this.
- Track **time spent on each step**. If median time on the analysis form exceeds 3 minutes, the form is too complex — trigger Quick Analysis mode.

---

## 11. Mobile-First Onboarding

### Why Mobile Matters for Real Estate Investors

Real estate investors are frequently in the field — at property showings, driving for dollars, meeting sellers. They need to:
- Quick-analyze a deal from their phone while standing in a property
- Check pipeline status between appointments
- Ask the AI chat a quick question about a deal

Mobile onboarding must be fast (< 60 seconds), thumb-friendly, and functional on spotty cell connections.

### Mobile Onboarding Design Rules

1. **Single-column layouts only.** No side-by-side panels or multi-column checklists.
2. **Bottom sheet for checklist.** Not a sidebar — use a persistent bottom bar with expandable checklist.
3. **Large tap targets.** Minimum 48px height for all interactive elements.
4. **Reduce form fields.** On mobile, show Quick Analysis mode by default (3-4 fields instead of 8-10).
5. **Swipeable strategy selector.** Instead of a grid of 5 strategy cards, use a horizontal scroll/swipe.
6. **Offline tolerance.** If connection drops mid-analysis, queue the calculation and show results when reconnected.

### Mobile-Specific Flow

```
Signup (mobile-optimized form, 30s):
  → Single-screen: name + email + password
  → Role selection on next screen (large tap cards)

Micro-wizard (swipeable, 20s):
  → Swipe 1: Strategy preference (horizontal card carousel)
  → Swipe 2: Experience level (large radio buttons)
  → CTA: "Let's go"

Dashboard (mobile):
  → Full-width "Analyze your first deal" card
  → Collapsible bottom bar: "2/5 setup steps complete ▲"
  → Tap to expand checklist as bottom sheet

Analysis form (mobile):
  → Quick Analysis mode default: 3-4 key fields
  → "Show all fields" expandable section
  → Sticky "Analyze" button at bottom of viewport
```

### Parcel-Specific Consideration

The existing mobile pipeline (`mobile-pipeline.tsx` with tabbed stage view) and responsive patterns are already in place. The onboarding components should follow the same responsive strategy:
- `block md:hidden` for mobile onboarding variants
- `hidden md:block` for desktop onboarding variants
- Bottom sheet pattern (already used for mobile pipeline context menus)

---

## 12. Team Plan Onboarding

### Team Onboarding Differs from Individual

The Team plan ($149/mo) introduces multi-user dynamics:
- An **admin** sets up the workspace and invites members
- **Members** join an existing, configured environment
- Shared pipeline, shared deals, role-based permissions

### Admin Onboarding Flow

```
Team admin signs up → Individual onboarding (wizard + checklist) →
Additional team-specific steps:

Extended Checklist for Admin:
  ✅ 1. Create your account
  ✅ 2. Analyze your first deal
  ○  3. Set up your team
       → "Invite your first team member"
       → Multi-email input + role selector (Admin / Member / Viewer)
  ○  4. Create shared pipeline stages
       → Customize pipeline stage names if desired
  ○  5. Assign a deal to a team member
       → Demonstrates collaboration features
```

### Invited Member Onboarding Flow

Members who join via invitation should NOT see the full onboarding wizard. They're entering a pre-configured workspace.

```
Member clicks invite link → Create account (name + password only) →
Abbreviated onboarding:

  Welcome screen: "You've been invited to [Team Name] by [Admin Name]"

  Shortened checklist (3 items):
    ✅ 1. Join the team
    ○  2. View the shared pipeline
    ○  3. Analyze your first deal or review an existing one
```

### Invite UI Design

```
Settings > Team > Invite Members
┌──────────────────────────────────────────────┐
│  Invite team members                         │
│                                              │
│  ┌────────────────────────────┐ ┌──────────┐ │
│  │ email@example.com          │ │ Member ▼ │ │
│  └────────────────────────────┘ └──────────┘ │
│  + Add another                               │
│                                              │
│  Or share invite link:                       │
│  [https://app.parcel.com/invite/abc123] [📋] │
│                                              │
│  [Send Invitations]                          │
└──────────────────────────────────────────────┘

Roles:
  Admin  — Full access, can invite/remove members, manage billing
  Member — Analyze deals, manage pipeline, use AI chat
  Viewer — Read-only access to shared deals and pipeline
```

### Key Design Decisions

- **Invite step appears after personal onboarding is complete.** Don't ask admin to invite teammates before they've experienced value themselves.
- **Pending invitations dashboard.** Admin can see who accepted, who's pending, and resend invites.
- **Member sees admin's deals.** When a member joins, the pipeline and deals are already populated — no empty state problem.
- **Activity attribution.** All team activity shows who performed each action.

---

## Recommendations for Parcel

Prioritized implementation plan, ordered by impact-to-effort ratio:

### P0 — Ship First (Highest Impact, Moderate Effort)

**1. Pre-filled example deal on signup**
Create one example deal in the user's account immediately after registration, matched to their role (wholesaler → wholesale deal, investor → BRRRR deal). This single change can cut time-to-first-value from 4-8 minutes to under 90 seconds. The example deal should have an `is_example: true` flag and display an "Example" badge in the UI. Users can delete it anytime.

**2. Post-signup micro-wizard (2 screens)**
After registration, show two screens: (a) strategy preference picker (5 cards), (b) experience level selector (4 options + optional market). Store in `user.onboarding_profile` JSONB column. Always show a "Skip" link. This data drives all downstream personalization.

**3. Persistent onboarding checklist (5 items)**
Dashboard-embedded checklist: create account, analyze first deal, review AI insights, add to pipeline, try AI chat. Auto-completes based on backend events. Progress bar. Dismissible. This is the single highest-leverage pattern — Notion-style checklists drive 60% completion rates and 40% retention bumps.

### P1 — Ship Second (High Impact, Lower Effort)

**4. Quick Analysis mode for first-timers**
For users with experience_level = "first deal", show a simplified 3-4 field form with smart defaults. Purchase price + ARV (for wholesale/flip) or purchase price + rent (for rental strategies). Calculate with sensible defaults for everything else. Add "Show all fields" toggle. This removes the biggest activation barrier — not knowing what numbers to enter.

**5. Contextual tooltips on Results page**
First-visit coach marks explaining cap rate, cash-on-cash return, risk score, and the "Add to Pipeline" button. Use the existing `ConceptTooltip` component pattern. Show each tooltip once, track in localStorage + backend. This converts "I got results but don't understand them" into "I see the value."

**6. Mobile-optimized onboarding**
Bottom sheet checklist (not sidebar), swipeable strategy picker in wizard, Quick Analysis mode as default on mobile, sticky "Analyze" CTA button. Real estate investors analyze deals from their phones at property showings — mobile onboarding is not optional.

### P2 — Ship Third (Medium Impact, Higher Effort)

**7. Welcome email sequence (8 emails over 14 days)**
Behavior-triggered emails synchronized with in-app progress. Day 0 welcome, Day 1 nudge (if no analysis), Day 3 comparison prompt, Day 7 trial midpoint, Day 13 trial ending. Suppress emails when user is active in-app. Use deep links with UTM tracking.

**8. Onboarding analytics and funnel tracking**
`onboarding_events` table tracking signup, wizard, first analysis, pipeline add, chat use, checklist completion. Dashboard for Ivan to see funnel drop-off. Define "activated" as 3/5 core actions. Set initial targets: 60% first-analysis rate, 40% checklist completion, 25% day-7 retention.

**9. Demo account quick-access**
Add "Explore demo account" button to the empty dashboard state and onboarding checklist. Opens the existing demo@parcel.app account in read-only mode. Users can browse 12 seeded deals, the full pipeline, and portfolio without creating their own data. This leverages the existing seed_demo.py infrastructure.

### P3 — Ship Later (Important but Lower Urgency)

**10. Experience-level personalization**
Branch tooltip density, vocabulary complexity, and feature unlock pace based on the experience level captured in the micro-wizard. First-timers get high tooltip density and plain language. Veterans get minimal guidance and advanced features unlocked from day one.

**11. Team plan onboarding**
Extended admin checklist (invite members, set up shared pipeline, assign deals). Abbreviated member flow (join team, view pipeline, analyze or review). Invite UI with multi-email input, role selector, and shareable invite link. This only matters once Team plan adoption grows.

**12. Strategy-specific dashboard personalization**
Show different KPI cards, different AI chat starter prompts, and different empty-state copy based on the user's primary strategy. A BRRRR investor sees equity capture and refinance metrics. A wholesaler sees MAO and assignment fee. This requires frontend branching logic keyed on `onboarding_profile.primary_strategy`.

### Implementation Dependencies

```
P0-2 (micro-wizard) → enables → P0-1 (strategy-matched example deal)
P0-2 (micro-wizard) → enables → P2-10 (experience-level personalization)
P0-2 (micro-wizard) → enables → P3-12 (strategy dashboard personalization)
P0-3 (checklist)    → enables → P2-8 (funnel analytics)
P0-1 (example deal) → enables → P1-4 (Quick Analysis mode)
```

### Technical Stack Notes

- **Onboarding state:** JSONB column on User model (simple, no new tables for MVP). Migrate to dedicated `onboarding_progress` table if analytics needs grow.
- **Checklist component:** New `frontend/src/components/onboarding/OnboardingChecklist.tsx` — rendered inside AppShell, reads from `useQuery(['onboarding'])`.
- **Micro-wizard:** New `frontend/src/pages/Onboarding.tsx` — 2-screen flow, stores to `/api/onboarding/profile` endpoint.
- **Coach marks:** Consider `react-joyride` library or build a lightweight `<CoachMark />` component with Framer Motion (stays consistent with existing animation system).
- **Email:** Resend or Postmark for transactional email; cron job or Celery beat for scheduled sends; behavior triggers via webhook from backend events.
- **Analytics:** Start with backend event logging to PostgreSQL. Migrate to PostHog or Mixpanel when volume justifies it.

---

## Sources

- [SaaS Onboarding Flow: 10 Best Practices That Reduce Churn (2026)](https://designrevision.com/blog/saas-onboarding-best-practices)
- [Guide for SaaS onboarding. Best practices for 2025 + Checklist](https://www.insaim.design/blog/saas-onboarding-best-practices-for-2025-examples)
- [SaaS Onboarding in 2026: Activation Checklist](https://dardesign.io/blog/saas-onboarding-2026-activation-checklist-reduce-churn)
- [SaaS Onboarding Flows That Actually Convert in 2026](https://www.saasui.design/blog/saas-onboarding-flows-that-actually-convert-2026)
- [Product-Led Onboarding: How to Do It Right in 2025](https://productschool.com/blog/product-strategy/product-led-onboarding)
- [Airtable Onboarding Wizard: Step-by-Step Flow](https://www.candu.ai/blog/airtables-best-wizard-onboarding-flow)
- [Free Product-Led Onboarding Book by Ramli John](https://productled.com/book/onboarding)
- [Designing Empty States in Complex Applications — NN/g](https://www.nngroup.com/articles/empty-state-interface-design/)
- [Empty State UX Examples & Best Practices](https://www.pencilandpaper.io/articles/empty-states)
- [Empty State in SaaS Applications — Userpilot](https://userpilot.com/blog/empty-state-saas/)
- [Onboarding Tutorials vs. Contextual Help — NN/g](https://www.nngroup.com/articles/onboarding-tutorials/)
- [Instructional Overlays and Coach Marks — NN/g](https://www.nngroup.com/articles/mobile-instructional-overlay/)
- [Effectiveness of Coach Marks in Smartphone Apps](https://www.researchgate.net/publication/333611767_Effectiveness_of_Coach_Marks_or_Instructional_Overlay_in_Smartphone_Apps_Interfaces)
- [How to Build a Behavior-Based Onboarding Email Campaign — ProductLed](https://productled.com/blog/user-onboarding-email-campaign)
- [Onboarding Emails: Drip Campaigns That Drive Activation](https://www.adoptkit.com/posts/onboarding-emails-drip-campaigns)
- [SaaS Onboarding Email Best Practices in 2026](https://mailsoftly.com/blog/user-onboarding-email-best-practices/)
- [How to Measure Onboarding Completion Rates](https://www.getmonetizely.com/articles/how-to-measure-onboarding-completion-rates-a-strategic-guide-for-saas-executives)
- [12 Must-Track User Onboarding Metrics & KPIs (2025)](https://whatfix.com/blog/user-onboarding-metrics/)
- [User Activation Rate Benchmarks 2025](https://www.agilegrowthlabs.com/blog/user-activation-rate-benchmarks-2025/)
- [SaaS Product Metrics Benchmark Report 2025](https://userpilot.com/saas-product-metrics/)
- [Top 15 Mobile Onboarding Examples — Userpilot](https://userpilot.com/blog/mobile-onboarding-examples/)
- [Mobile-First SaaS: Native Apps vs PWAs](https://medium.com/@beta_49625/mobile-first-saas-when-to-build-native-apps-vs-progressive-web-apps-d5e0de79dd9a)
- [User Onboarding Strategies in B2B SaaS — Auth0](https://auth0.com/blog/user-onboarding-strategies-b2b-saas/)
- [Customer and User Onboarding for B2B SaaS — WorkOS](https://workos.com/blog/b2b-saas-onboarding-organizations-users)
- [97 SaaS Invite Team Members Design Examples](https://www.saasframe.io/categories/invite-team-members)
- [Why Personalized User Onboarding Is a Must for SaaS](https://www.candu.ai/blog/why-personalized-user-onboarding-is-a-must-for-saas)
- [Notion's Clever Onboarding and Inspirational Templates](https://goodux.appcues.com/blog/notions-lightweight-onboarding)
- [Choosing the Right User Onboarding UX Pattern — Appcues](https://www.appcues.com/blog/choosing-the-right-onboarding-ux-pattern)
