# Paywall & Upgrade UX Research for Parcel

Research document covering paywall presentation, upgrade flows, plan management,
and monetization UX patterns — tailored to Parcel's dark fintech aesthetic, real
estate investor audience, and React + Tailwind + shadcn/ui + Framer Motion stack.

---

## Table of Contents

1. [Blur/Overlay Patterns for Locked Features](#1-bluroverlay-patterns-for-locked-features)
2. [Modal vs Inline vs Redirect Paywall Patterns](#2-modal-vs-inline-vs-redirect-paywall-patterns)
3. [Pricing Table Component Design](#3-pricing-table-component-design)
4. [Upgrade Flow (End to End)](#4-upgrade-flow-end-to-end)
5. [Downgrade Flow & Data Policy](#5-downgrade-flow--data-policy)
6. [Usage Meter UI](#6-usage-meter-ui)
7. [Trial Expiration Banner](#7-trial-expiration-banner)
8. [Success Page After Payment](#8-success-page-after-payment)
9. [Plan Management Page](#9-plan-management-page)
10. [Toast/Notification Patterns for Approaching Limits](#10-toastnotification-patterns-for-approaching-limits)
11. [Mobile Paywall Patterns](#11-mobile-paywall-patterns)
12. [A/B Testing Framework](#12-ab-testing-framework)
13. [Recommendations for Parcel](#recommendations-for-parcel)

---

## 1. Blur/Overlay Patterns for Locked Features

### Research Findings

The blur-overlay pattern works by rendering the locked feature at full fidelity
(or with realistic placeholder data) behind a blur filter + semi-transparent
overlay, with a centered upgrade CTA. This creates desire by showing the user
*exactly* what they would get — a "window shopping" effect. Studies from
Profitwell and Paddle show that previewing locked value converts 2-3x better
than hiding it entirely behind a blank "upgrade to unlock" card.

**Key rules:**
- The blur should be strong enough to obscure details (8-12px) but light enough
  that the user can identify the type of content (chart shape, table structure).
- The overlay must use the app's surface color at ~70-80% opacity, not pure
  black — this keeps it feeling integrated rather than punitive.
- The CTA should be a single, unmissable action: "Upgrade to Pro" — not a wall
  of text explaining the plan.

### Component Pattern for Parcel

```
FeatureGate
  props: requiredTier, featureName, children, fallback?
  logic:
    - reads user.plan from auth store
    - if plan >= requiredTier: render children
    - if plan < requiredTier: render BlurredPreview wrapper

BlurredPreview
  renders children inside a container with:
    - pointer-events-none on inner content
    - backdrop-blur-[8px] overlay div (absolute inset-0)
    - overlay bg: bg-app-bg/70
    - centered CTA card with:
        Lock icon (lucide)
        "{featureName} requires {tierName}"
        "Upgrade to {tierName}" button (accent-primary)
        "See all plans" text link below
```

### Tailwind Approach

The blur overlay composes naturally:

```
Container:  relative overflow-hidden rounded-xl border border-border-subtle
Content:    [render children normally, but add aria-hidden="true"]
Overlay:    absolute inset-0 z-10 backdrop-blur-[10px] bg-app-bg/70
            flex items-center justify-center
CTA card:   bg-app-surface border border-border-default rounded-xl p-6
            text-center space-y-3 shadow-lg shadow-accent-primary/5
```

### Where to Apply in Parcel

| Feature                    | Free sees blur over...                           | Tier required |
|---------------------------|--------------------------------------------------|---------------|
| Offer letter generator     | A filled-out sample letter with fake data         | Pro           |
| Document AI upload         | The upload dropzone + sample extracted data       | Pro           |
| Deal sharing links         | A "share" panel with a generated link             | Pro           |
| Team pipeline              | The pipeline view with multiple user avatars      | Team          |
| Advanced PDF report pages  | Pages 2-4 of the report preview (page 1 visible) | Pro           |
| Portfolio analytics charts | Chart area with sample portfolio data             | Starter       |

**Anti-pattern to avoid:** Do NOT blur the entire page. Blur only the specific
feature panel/card. The user should still be able to use everything else on the
page. Whole-page blocking feels hostile and increases churn intent.

---

## 2. Modal vs Inline vs Redirect Paywall Patterns

### Pattern Comparison

| Pattern         | When to use                                  | Conversion | Annoyance risk |
|-----------------|----------------------------------------------|------------|----------------|
| **Inline blur** | Feature is visible but locked in-place       | High       | Low            |
| **Modal**       | User clicks a locked action (button/link)    | Medium     | Medium         |
| **Redirect**    | Deep features that need a full pricing page  | Low-Medium | Low            |
| **Toast hint**  | Soft nudge when approaching limit            | Low        | Very low       |

### Decision Framework for Parcel

1. **Inline blur** — Use for features the user can see in their normal workflow
   (document AI panel, offer letter tab, advanced report sections). The blur
   creates passive desire without interrupting flow.

2. **Modal** — Use when the user *takes an action* that requires a higher tier.
   Example: clicking "Run Analysis" when at 5/5 monthly analyses, clicking
   "Upload Document" on Free plan, or clicking "Share Deal." The modal should be
   concise — max 3 lines of copy + primary CTA + dismiss. Use shadcn's existing
   `Dialog` component (already in the codebase at `components/ui/dialog.tsx`).

3. **Redirect to /pricing** — Reserve for the explicit "Upgrade" button in
   Settings, sidebar plan badge, or the trial expiration banner. This is the
   only time the user leaves their current page context.

### Modal Component Structure

```
UpgradeModal (wraps shadcn Dialog)
  props: open, onOpenChange, feature, requiredTier
  content:
    - Icon: Sparkles or Lock (lucide), 32px, text-accent-primary
    - Title: "Unlock {feature}"
    - Description: 1-line value prop (not tier name — value)
    - Primary CTA: "Upgrade to {tier}" → navigates to /settings/billing
    - Secondary: "Compare plans" text link → /pricing
    - Dismiss: standard Dialog close (X button, click-outside, Escape)
```

### Key UX Rule

Never show the paywall modal more than once per session for the same feature.
Use a session-scoped Set in a Zustand store (`dismissedPaywalls`) to track which
feature gates the user has already seen and dismissed. On second attempt, show a
brief toast instead: "Upgrade to Pro to use {feature}" with an action link.

---

## 3. Pricing Table Component Design

### Existing State

Parcel's landing page already has a 3-tier pricing section (`pricing.tsx`) with
an annual/monthly toggle, AnimatePresence price transitions, and a highlighted
Pro card with ambient glow. The tiers in `constants.ts` are:

- **Free**: $0/forever — 5 analyses/mo, pipeline (10 deals), basic AI, PDF
- **Pro**: $29/mo ($23/mo annual) — unlimited analyses, unlimited pipeline,
  10 doc uploads/mo, offer letters, sharing, priority support
- **Team**: $99/mo ($79/mo annual) — everything Pro + 10 members, shared
  pipeline, RBAC, unlimited docs, team analytics

**Note:** The user brief says $29/$69/$149 for Starter/Pro/Team, but the
existing code shows Free/$29/$99 for Free/Pro/Team. The pricing page should be
updated to match the 4-tier model (Free/Starter/Pro/Team) if that is the final
decision. This research document uses the 4-tier model from the brief.

### In-App Pricing Table (Distinct from Landing Page)

The landing page pricing is a marketing component. The in-app pricing table
(shown at `/settings/billing` or `/pricing`) needs different treatment:

1. **Current plan indicator** — The user's active plan gets a "Current plan"
   badge (not a CTA button). Other plans show "Upgrade" or "Downgrade."

2. **Feature comparison grid** — Below the price cards, add a full comparison
   table (rows = features, columns = plans). Use sticky left column for feature
   names (already proven in `comparison-table.tsx`).

3. **Annual/monthly toggle** — Keep the existing segmented control pattern from
   landing pricing. Add the savings amount inline: "Save $72/yr" next to annual.

4. **Responsive** — On mobile, the 4-column grid collapses to a horizontally
   scrollable card carousel (snap points) or a single-column stack with the
   recommended plan first.

### Pricing Card Structure

```
PricingCard
  props: tier, isCurrentPlan, billingCycle, onSelect
  layout:
    - Top badge: "Current plan" | "Most popular" | "Best value" | null
    - Tier name + 1-line description
    - Price: JetBrains Mono, 4xl, with AnimatePresence on cycle switch
    - Period text: "per month" | "per month, billed annually"
    - Feature list with Check icons (same as existing)
    - CTA button:
        current plan → disabled "Current plan" ghost button
        upgrade → "Upgrade to {tier}" accent-primary filled
        downgrade → "Switch to {tier}" ghost/outline button
```

### Toggle Design

```
BillingCycleToggle
  segmented control (same as existing pricing.tsx):
    [Monthly] [Annual — Save 20%]
  the "Save 20%" badge uses:
    bg-accent-success/20 text-accent-success text-[10px] uppercase
  (already implemented in the landing page pricing — reuse that exact pattern)
```

---

## 4. Upgrade Flow (End to End)

### Flow Diagram

```
User clicks "Upgrade" (from any entry point)
       |
       v
[/settings/billing] — in-app pricing table
  - shows current plan highlighted
  - user selects target plan + billing cycle
  - clicks "Upgrade to Pro"
       |
       v
[Stripe Checkout Session] — server creates session via Stripe API
  - POST /api/v1/billing/checkout
  - body: { plan: "pro", cycle: "monthly" | "annual" }
  - returns: { checkout_url: "https://checkout.stripe.com/..." }
  - frontend redirects: window.location.href = checkout_url
       |
       v
[Stripe Checkout hosted page] — Stripe handles payment
  - card entry, Apple Pay, Google Pay
  - success_url: {APP_URL}/settings/billing?upgrade=success&plan=pro
  - cancel_url: {APP_URL}/settings/billing?upgrade=cancelled
       |
       v
[Success page / state] — back in the app
  - /settings/billing detects ?upgrade=success query param
  - shows success celebration overlay (see Section 8)
  - backend webhook (stripe webhook) has already updated user.plan
  - frontend re-fetches /auth/me to get updated plan
  - clears query params from URL after showing success
       |
       v
[Feature unlocked] — user returns to the feature they wanted
  - FeatureGate re-evaluates, blur/modal gone
  - toast: "Welcome to Pro! All features unlocked."
```

### Entry Points for Upgrade

| Location                        | Trigger                                     |
|---------------------------------|---------------------------------------------|
| Sidebar plan badge              | Click on "Free" / "Starter" badge           |
| FeatureGate blur overlay        | Click "Upgrade to Pro"                      |
| UpgradeModal                    | CTA button                                  |
| Usage meter (dashboard)         | Click "Upgrade" next to meter               |
| Trial expiration banner         | CTA button                                  |
| Settings > Billing              | Explicit navigation                         |
| Toast notification              | Action link on limit-approaching toast       |
| Landing page pricing            | "Start Pro trial" → /register (new users)   |

### Backend API Shape

```
POST /api/v1/billing/checkout
  Request:  { plan: "starter" | "pro" | "team", cycle: "monthly" | "annual" }
  Response: { checkout_url: string }

POST /api/v1/billing/portal
  Request:  {} (authenticated)
  Response: { portal_url: string }
  // Stripe Customer Portal for managing subscription, payment method, invoices

GET /api/v1/billing/status
  Response: {
    plan: "free" | "starter" | "pro" | "team",
    cycle: "monthly" | "annual" | null,
    status: "active" | "trialing" | "past_due" | "canceled",
    trial_ends_at: string | null,
    current_period_end: string,
    usage: {
      analyses: { used: number, limit: number },
      documents: { used: number, limit: number },
      pipeline_deals: { used: number, limit: number },
    }
  }

POST /api/v1/billing/webhook  (Stripe webhook, not user-facing)
  handles: checkout.session.completed, customer.subscription.updated,
           customer.subscription.deleted, invoice.payment_failed
```

### Frontend State Management

Add to Zustand auth store or a new `billingStore`:

```
interface BillingState {
  plan: Plan
  status: SubscriptionStatus
  trialEndsAt: Date | null
  usage: UsageLimits
  fetchBilling: () => Promise<void>
}
```

The `FeatureGate` component reads `plan` from this store. After successful
checkout, the app calls `fetchBilling()` which hits `/billing/status` and
updates the store, causing all `FeatureGate` instances to re-render.

---

## 5. Downgrade Flow & Data Policy

### The Core Problem

When a Pro user downgrades to Free, they may have:
- 47 deals in their pipeline (Free limit: 10)
- 15 document uploads this month (Free limit: 0)
- Shared deal links in the wild
- An offer letter mid-edit

### Industry Approaches

| Strategy              | Used by                  | User sentiment        |
|-----------------------|--------------------------|-----------------------|
| **Read-only grace**   | Notion, Figma, Airtable  | Positive              |
| **Hard lock + delete**| Rare (hostile)           | Extremely negative    |
| **Soft lock (freeze)**| Slack, Dropbox           | Neutral               |
| **Export-only**       | Canva                    | Slightly negative     |
| **Grace period**      | Most B2B SaaS            | Positive              |

### Recommended Approach for Parcel

**Read-only freeze with 30-day export grace period:**

1. **Deals above limit** — All deals remain visible and readable. The user
   cannot create new deals until they are at or below the Free limit. They CAN
   delete deals to get under the limit. They CAN export any deal as PDF.

2. **Pipeline** — Pipeline remains visible with all deals. New deals cannot be
   added to pipeline. Existing deals can be moved between stages or removed.

3. **Documents** — Previously uploaded documents remain accessible (read/view).
   No new uploads allowed. Download always available.

4. **Shared links** — Existing shared links remain active for 30 days after
   downgrade, then auto-expire. Show a banner on the shared page: "This shared
   link expires on {date}."

5. **Offer letters** — Read-only. Cannot generate new ones. Existing ones can
   be viewed and downloaded.

### Downgrade Confirmation UI

```
DowngradeConfirmDialog (uses shadcn AlertDialog)
  content:
    - Warning icon (TriangleAlert, text-accent-warning)
    - Title: "Downgrade to Free?"
    - Impact summary:
        "You currently have 47 pipeline deals. On the Free plan, the limit
         is 10. Your existing deals will become read-only until you remove
         deals to get under the limit or upgrade again."
    - Bullet list of what changes:
        x  Document AI uploads (currently 10/mo -> 0)
        x  Offer letter generator (locked)
        x  Deal sharing links (expire in 30 days)
        -  5 analyses per month (down from unlimited)
    - Checkbox: "I understand my data will be preserved but some features
                 will be locked"
    - Buttons: [Cancel] [Confirm downgrade] (destructive variant)
```

### Backend Logic

The downgrade should take effect at the end of the current billing period
(Stripe handles this with `cancel_at_period_end`). During the remaining paid
period, the user retains full access. The backend webhook on
`customer.subscription.updated` updates the user's plan and sets
`downgrade_effective_at`.

---

## 6. Usage Meter UI

### Design Pattern

A usage meter shows consumption against a limit. For Parcel, the primary
meters are:

- **Analyses**: "3 of 5 analyses used this month" (Free), "47 analyses this
  month" (Pro, unlimited)
- **Documents**: "0 of 10 uploads used this month" (Pro)
- **Pipeline deals**: "8 of 10 active deals" (Free)

### Component Structure

```
UsageMeter
  props: label, used, limit, unit?, variant?
  layout:
    - Row: label (left) + "{used} of {limit}" (right, font-mono)
    - Progress bar: h-2 rounded-full bg-app-elevated
      - Fill: rounded-full, width = (used/limit * 100)%
        - < 70%: bg-accent-primary
        - 70-89%: bg-accent-warning
        - >= 90%: bg-accent-danger
      - If unlimited: full bar with bg-accent-primary/30, text says "Unlimited"
    - Optional: "+{remaining} remaining" subtext in text-text-muted

UsageMeterCompact (for sidebar or topbar)
  - Circular progress ring (SVG), 28px diameter
  - Center number: "{used}/{limit}" in micro text
  - Ring color follows same threshold as bar
```

### Tailwind Progress Bar

```
Outer:  h-2 w-full rounded-full bg-app-elevated overflow-hidden
Inner:  h-full rounded-full transition-all duration-500 ease-out
        style={{ width: `${percentage}%` }}
        className varies by threshold:
          < 70%:  bg-accent-primary
          70-89%: bg-accent-warning
          >= 90%: bg-accent-danger animate-pulse (subtle urgency)
```

### Placement

1. **Dashboard** — Add a "Usage" card in the KPI row or below it. Shows all
   meters stacked vertically inside a card (same `border border-border-subtle
   bg-app-surface rounded-xl p-5` as KPICard).

2. **Sidebar footer** — Compact meter below the nav groups, above the logout
   area. Shows only the most constrained resource (analyses for Free, documents
   for Pro). On hover, expand to show all meters in a tooltip.

3. **Settings > Billing** — Full usage breakdown with historical chart
   (Recharts AreaChart showing usage over past 6 months).

### Animation

Use Framer Motion `animate` to smoothly fill the progress bar on mount:

```
<motion.div
  className="h-full rounded-full bg-accent-primary"
  initial={{ width: 0 }}
  animate={{ width: `${percentage}%` }}
  transition={{ duration: 0.8, ease: "easeOut" }}
/>
```

---

## 7. Trial Expiration Banner

### Trial Context

Parcel offers a 14-day Pro trial on signup (no card required). The banner needs
to communicate urgency without being annoying. Research from Baremetrics shows
that trial-to-paid conversion is highest when reminders start at 7 days
remaining and increase in frequency/urgency.

### Banner Timeline

| Days remaining | Banner state                                     | Urgency   |
|----------------|--------------------------------------------------|-----------|
| 14-8           | No banner (let user explore freely)              | None      |
| 7              | Dismissible info banner, blue accent             | Low       |
| 3              | Persistent warning banner, amber accent          | Medium    |
| 1              | Persistent urgent banner, red accent + countdown | High      |
| 0 (expired)    | Full-width banner, plan reverted to Free         | Critical  |

### Component Structure

```
TrialBanner
  props: trialEndsAt (from billing store)
  logic:
    - calculate daysRemaining
    - if daysRemaining > 7: return null
    - if dismissed (session storage) and daysRemaining > 3: return null
  layout:
    - Full-width bar above the main content area (inside AppShell, between
      Topbar and <main>)
    - Left: icon + message text
    - Right: CTA button + optional dismiss (X) button
    - Height: h-10 (compact, does not waste screen real estate)
```

### Banner Variants

**Info (7-4 days):**
```
bg-accent-info/10 border-b border-accent-info/20
Icon: Clock (lucide), text-accent-info
Text: "Your Pro trial ends in {n} days. Upgrade to keep all features."
CTA: "Upgrade now" — small button, bg-accent-info text-white
Dismiss: X button visible
```

**Warning (3-2 days):**
```
bg-accent-warning/10 border-b border-accent-warning/20
Icon: AlertTriangle, text-accent-warning
Text: "Pro trial ends in {n} days — your analyses and uploads will be limited."
CTA: "Upgrade to Pro" — small button, bg-accent-warning text-app-bg
Dismiss: NOT dismissible
```

**Urgent (1 day / today):**
```
bg-accent-danger/10 border-b border-accent-danger/20
Icon: AlertTriangle, text-accent-danger
Text: "Pro trial ends today at {time}. Upgrade now to avoid losing access."
CTA: "Upgrade to Pro" — small button, bg-accent-danger text-white
Countdown: live HH:MM:SS timer (useEffect interval, font-mono)
Dismiss: NOT dismissible
```

**Expired:**
```
bg-accent-danger/15 border-b border-accent-danger/30
Icon: XCircle, text-accent-danger
Text: "Your Pro trial has ended. You're now on the Free plan (5 analyses/mo)."
CTA: "Upgrade to Pro" — accent-primary filled button
Secondary: "Compare plans" text link
Dismiss: NOT dismissible (permanent until they upgrade or manually dismiss from settings)
```

### Placement in AppShell

Insert between `<Topbar>` and `<main>` in AppShell.tsx. The banner should be
conditionally rendered and use AnimatePresence for smooth enter/exit:

```
<Topbar ... />
<AnimatePresence>
  {showTrialBanner && (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <TrialBanner trialEndsAt={billing.trialEndsAt} />
    </motion.div>
  )}
</AnimatePresence>
<main ...>
```

---

## 8. Success Page After Payment

### Research Findings

Post-payment is one of the highest-engagement moments in a SaaS product. The
user just committed money — they are primed for activation. Wasting this moment
with a generic "Thanks for subscribing" page is leaving value on the table.

Best-in-class success pages (Linear, Vercel, Notion):
1. Celebrate the purchase (confetti, animation, positive copy)
2. Immediately show what is now unlocked
3. Provide a clear next action (not "go to dashboard" — a specific feature)
4. Avoid showing billing details (save that for the settings page)

### Implementation for Parcel

Rather than a separate `/success` route, render an overlay/modal on
`/settings/billing` when `?upgrade=success` is in the URL. This keeps the user
in context and avoids a dead-end page.

### Success Overlay Component

```
UpgradeSuccessOverlay
  trigger: URL has ?upgrade=success&plan={plan}
  lifecycle:
    1. Show full-screen overlay (bg-app-bg/90 fixed inset-0 z-50)
    2. Play confetti burst (use canvas-confetti library, ~3KB)
    3. Animate in the success card (scale 0.9 -> 1, opacity 0 -> 1)
    4. After 5 seconds or user interaction, dismiss overlay
    5. Clean query params from URL (replaceState)
  content:
    - Animated checkmark (Framer Motion SVG path draw)
    - "Welcome to {Plan}!" — text-3xl font-semibold
    - "You now have access to:" — text-sm text-text-secondary
    - Feature list (3-4 key unlocked features with check icons)
    - Primary CTA: "Try {most relevant feature}" — eg "Generate an Offer Letter"
    - Secondary: "Go to Dashboard"
```

### Confetti Pattern

Use `canvas-confetti` (tiny library, no framework dependency):

```
import confetti from 'canvas-confetti'

// Fire on mount of success overlay
confetti({
  particleCount: 100,
  spread: 70,
  origin: { y: 0.6 },
  colors: ['#6366F1', '#8B5CF6', '#10B981', '#F59E0B'],
})
```

The colors match Parcel's accent palette (primary, secondary, success, warning).

### Feature Unlock Animation

For each feature card in the success list, stagger the entrance:

```
{features.map((f, i) => (
  <motion.div
    key={f.name}
    initial={{ opacity: 0, x: -12 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: 0.3 + i * 0.1, duration: 0.3 }}
    className="flex items-center gap-3"
  >
    <div className="w-6 h-6 rounded-full bg-accent-success/20
                    flex items-center justify-center">
      <Check size={14} className="text-accent-success" />
    </div>
    <span className="text-sm text-text-primary">{f.name}</span>
  </motion.div>
))}
```

---

## 9. Plan Management Page

### Route: `/settings/billing`

This page serves as the central hub for everything subscription-related. It
should feel like a financial dashboard (appropriate for Parcel's audience).

### Layout

```
/settings/billing
  |
  +-- CurrentPlanCard
  |     - Plan name + badge (accent-primary for paid, text-muted for free)
  |     - Price: font-mono, text-3xl
  |     - Billing cycle + next renewal date
  |     - Status badge: "Active" | "Trialing (X days left)" | "Past due"
  |     - Actions: [Change plan] [Cancel subscription]
  |
  +-- UsageSection
  |     - UsageMeter for each tracked resource
  |     - "Resets on {date}" subtext
  |     - Historical usage chart (Recharts, last 6 months)
  |
  +-- PaymentMethodCard
  |     - Card brand icon + last 4 digits + expiry
  |     - [Update payment method] → opens Stripe Customer Portal
  |
  +-- BillingHistoryTable
  |     - Date | Description | Amount | Status | Invoice link
  |     - Paginated (reuse existing pagination pattern from documents)
  |     - Each row links to Stripe-hosted invoice PDF
  |
  +-- DangerZone
        - "Cancel subscription" with confirmation dialog
        - "This will take effect at the end of your current billing period"
```

### CurrentPlanCard Styling

```
Outer:  rounded-xl border border-border-subtle bg-app-surface p-6
        relative overflow-hidden
Glow:   (paid plans only) absolute -top-8 left-1/2 -translate-x-1/2
        w-32 h-16 rounded-full bg-accent-primary/15 blur-[20px]
Badge:  inline-flex px-2 py-0.5 rounded text-[10px] uppercase
        tracking-[0.08em] font-bold
        - Active: bg-accent-success/20 text-accent-success
        - Trialing: bg-accent-info/20 text-accent-info
        - Past due: bg-accent-danger/20 text-accent-danger
Price:  font-mono text-4xl font-bold text-text-primary
```

### Stripe Customer Portal Integration

For payment method updates, invoice viewing, and subscription cancellation,
redirect to Stripe's hosted Customer Portal. This avoids building sensitive
PCI-compliant forms:

```
Backend: POST /api/v1/billing/portal → { portal_url }
Frontend: window.location.href = portal_url
```

The portal returns the user to `/settings/billing` when done (configured in
Stripe dashboard).

---

## 10. Toast/Notification Patterns for Approaching Limits

### Threshold Strategy

| Usage %    | Notification type                    | Frequency          |
|------------|--------------------------------------|--------------------|
| 60%        | None                                 | -                  |
| 70%        | Subtle toast (info)                  | Once per session   |
| 80%        | Toast with upgrade action link       | Once per session   |
| 90%        | Persistent toast + sidebar indicator | Once per session   |
| 100%       | Blocking modal (see Section 2)       | Every attempt      |

### Toast Copy Examples

**70% (info, dismissible):**
> "You've used 4 of 5 analyses this month."
> No action link — pure informational.

**80% (info + action):**
> "You've used 4 of 5 analyses this month."
> Action: "Upgrade for unlimited" (link to /settings/billing)

**90% (warning + action):**
> "Last analysis remaining this month. Resets {date}."
> Action: "Upgrade to Pro" (link to /settings/billing)

**100% (blocking):**
> Shows UpgradeModal (Section 2), not a toast.

### Implementation with Sonner

Parcel already uses Sonner (configured in `sonner.tsx`). Toasts should use the
existing dark theme styling. Add the action link using Sonner's `action` prop:

```
toast("You've used 4 of 5 analyses this month.", {
  description: "Upgrade for unlimited analyses.",
  action: {
    label: "Upgrade",
    onClick: () => navigate("/settings/billing"),
  },
  duration: 6000,
  id: "usage-analyses-warning", // prevents duplicate toasts
})
```

### When to Trigger

Trigger usage toasts after the API response for the action that incremented
the counter. For example, after a successful `POST /api/v1/deals` (analysis
creation), the response should include updated usage counts. The frontend
mutation's `onSuccess` callback checks the count and fires the toast.

Do NOT trigger usage toasts on page load or navigation — only after the user
takes a counted action. Loading a page and being greeted with a paywall toast
feels adversarial.

---

## 11. Mobile Paywall Patterns

### Context

Real estate investors use Parcel on phones at property showings, open houses,
and driving for dollars. Mobile paywall UX must be:
- **Fast to dismiss** — they are standing in front of a property, not sitting
  at a desk. Every second of paywall friction = lost interest.
- **Thumb-friendly** — CTA buttons must be in the bottom 40% of the screen
  (thumb zone).
- **Non-blocking when possible** — prefer inline degradation over modal
  interruption on mobile.

### Mobile-Specific Patterns

**1. Bottom Sheet instead of Modal**

On screens < md breakpoint, replace the `UpgradeModal` (centered Dialog) with
a bottom sheet (shadcn Sheet, side="bottom"). Bottom sheets feel native on
mobile, are thumb-accessible, and can be swiped to dismiss.

```
On md+: <Dialog> centered upgrade modal
On <md: <Sheet side="bottom"> same content, swipe-to-dismiss
```

Use the existing `Sheet` component already in the codebase.

**2. Sticky Bottom Bar for Trial Banner**

On mobile, the trial expiration banner should NOT be at the top (it pushes
content down and is out of thumb reach). Instead, render it as a sticky bar
at the bottom of the viewport:

```
Mobile: fixed bottom-0 inset-x-0 z-40 px-4 py-3 safe-area-inset-bottom
Desktop: static, between topbar and main (as described in Section 7)
```

Add `pb-safe` (safe area inset) to avoid overlap with the iOS home indicator.

**3. Inline Degradation over Blur**

On mobile, the blur overlay can obscure too much of the small screen. Instead,
show a compact "Upgrade to unlock" card below the feature label, replacing the
feature content entirely:

```
Mobile FeatureGate:
  - Do not blur (wastes visual space)
  - Show: feature name + lock icon + "Requires Pro" + [Upgrade] button
  - Compact: fits in the same space as one KPI card
```

**4. One-Tap Upgrade from Lock Screen Notifications**

If Parcel later adds push notifications (trial expiring), the deep link should
go directly to `/settings/billing?plan=pro` with the plan pre-selected, so the
user is one tap from Stripe Checkout.

---

## 12. A/B Testing Framework

### What to Test

| Test ID | Hypothesis                                                | Metric              |
|---------|-----------------------------------------------------------|---------------------|
| PW-01   | Blur preview converts better than "locked" placeholder    | Click-through to upgrade |
| PW-02   | Modal paywall converts better than inline CTA             | Upgrade starts      |
| PW-03   | "X analyses remaining" converts better than "X of Y used" | Upgrade starts      |
| PW-04   | Trial banner at 5 days converts better than 7 days        | Trial-to-paid %     |
| PW-05   | Bottom sheet converts better than modal on mobile         | Upgrade starts      |
| PW-06   | Annual toggle defaulting to "on" increases annual uptake  | Annual plan %       |
| PW-07   | Showing savings amount ("Save $72") vs percentage (20%)   | Annual plan %       |

### Implementation Approach

For an early-stage product like Parcel, avoid heavyweight A/B testing
infrastructure (LaunchDarkly, Statsig). Instead:

**Phase 1 — Feature flags in Zustand store:**

```
interface ExperimentStore {
  flags: Record<string, string>  // experiment_id -> variant
  initialize: () => void         // reads from /api/v1/experiments
}
```

The backend assigns variants on first request (sticky by user_id hash) and
returns them as part of `/auth/me` or a dedicated `/experiments` endpoint.

**Phase 2 — Event tracking:**

Track paywall-related events:

```
track("paywall_shown", { feature, tier, variant, location })
track("paywall_click_upgrade", { feature, tier, variant })
track("paywall_dismissed", { feature, tier, variant })
track("checkout_started", { plan, cycle, source })
track("checkout_completed", { plan, cycle, source })
track("trial_banner_shown", { days_remaining, variant })
track("trial_banner_click_upgrade", { days_remaining, variant })
```

Use a lightweight analytics service (Plausible, PostHog self-hosted, or
Mixpanel free tier). PostHog is recommended for startups — it has built-in
feature flags and A/B testing that would replace the Zustand flag store in
Phase 2.

**Phase 3 — Statistical rigor:**

Do not draw conclusions until each variant has at least 100 conversions (not
impressions — conversions). For Parcel's early traffic, this means running
each test for 4-8 weeks minimum. Focus on one test at a time to avoid
interaction effects.

### Component Integration

```
function FeatureGate({ feature, children, requiredTier }: Props) {
  const variant = useExperiment("PW-01") // "blur" | "placeholder"
  const plan = useBillingStore(s => s.plan)

  if (hasAccess(plan, requiredTier)) return children

  // A/B: blur preview vs placeholder card
  if (variant === "blur") {
    return <BlurredPreview>{children}</BlurredPreview>
  }
  return <LockedPlaceholder feature={feature} tier={requiredTier} />
}
```

---

## Recommendations for Parcel

Prioritized list of implementation items, ordered by impact and effort.

### P0 — Ship Before Launch (Required for Monetization)

1. **Create a `FeatureGate` wrapper component** that reads the user's plan from
   the billing store and conditionally renders children or a locked state. This
   is the foundation for all paywall UX. Place it in
   `frontend/src/components/billing/FeatureGate.tsx`.

2. **Build the billing API layer** — four endpoints: `POST /billing/checkout`,
   `POST /billing/portal`, `GET /billing/status`, `POST /billing/webhook`.
   Integrate with Stripe's Node/Python SDK. The webhook handler is the most
   critical — it must reliably update user plan state.

3. **Add `plan` and `subscription_status` columns to the users table** (or a
   separate `subscriptions` table). Include `trial_ends_at`, `usage_analyses`,
   `usage_documents`, `current_period_end`.

4. **Build the in-app pricing page** at `/settings/billing` — reuse the
   pricing card pattern from the landing page but add "Current plan" state,
   change/cancel actions, and payment method display via Stripe Portal.

5. **Implement the Stripe Checkout redirect flow** — the backend creates a
   Checkout Session and returns the URL; the frontend redirects. On return,
   detect `?upgrade=success` and show the success overlay.

### P1 — Ship in First Week

6. **Add `UsageMeter` component** to the dashboard and sidebar. Show analyses
   used / limit. This creates organic awareness of limits without being
   aggressive.

7. **Implement `UpgradeModal`** for action-triggered paywalls (clicking locked
   buttons). Use shadcn Dialog on desktop, Sheet side="bottom" on mobile.
   Track dismissed paywalls per session to avoid repeating.

8. **Add trial expiration banner** to AppShell. Start showing at 7 days
   remaining. Use the four-variant system (info/warning/urgent/expired)
   described in Section 7.

9. **Build the blur overlay** for document AI, offer letter, and deal sharing
   features. Show realistic placeholder data behind the blur to create desire.

10. **Add usage tracking toasts** — fire after the user performs a counted
    action (analysis creation, document upload) when they cross the 70%, 80%,
    or 90% threshold. Use existing Sonner setup.

### P2 — Ship in First Month

11. **Build the success overlay** with confetti, animated feature unlock list,
    and contextual next-action CTA. This maximizes activation at the highest-
    engagement moment.

12. **Implement the downgrade confirmation dialog** with impact summary
    (how many deals/docs will be affected). Use read-only freeze policy with
    30-day grace period for shared links.

13. **Add billing history table** to `/settings/billing` — fetch from Stripe
    API, show date/amount/status/invoice link. Reuse existing pagination
    component.

14. **Mobile optimization** — ensure all paywall components use bottom sheet on
    mobile, trial banner renders at bottom on small screens, and blur overlays
    degrade to compact lock cards.

### P3 — Iterate Based on Data

15. **Set up event tracking** for all paywall interactions (shown, clicked,
    dismissed, converted). Use PostHog or Mixpanel free tier.

16. **Run PW-01 experiment** (blur vs placeholder) — this is the highest-
    leverage test. Measure click-through to upgrade page.

17. **Run PW-06 experiment** (annual toggle default) — if annual plans have
    better LTV, test defaulting the toggle to annual on the pricing page.

18. **Add a sidebar plan badge** below the logo that shows current plan name
    and is clickable to `/settings/billing`. For trial users, show remaining
    days.

19. **Implement usage history charts** on the billing page — Recharts
    AreaChart showing monthly analyses/uploads over the past 6 months. Reuse
    the same chart pattern from `CashFlowProjection.tsx`.

20. **Consider a "Starter" tier at $29/mo** between Free and Pro to capture
    users who need more than 5 analyses but do not need document AI or offer
    letters. The current jump from $0 to $29 is small, but the jump from
    Free-tier features to Pro-tier features is large — a Starter tier fills
    that gap.
