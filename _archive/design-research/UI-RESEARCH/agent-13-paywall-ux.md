# Agent 13 — Paywall & Upgrade Experience Design for Parcel

Research document covering paywall patterns, upgrade flows, usage metering,
trial management, and celebratory animations for a dark-themed real estate
deal analysis SaaS (React + Tailwind + Framer Motion + shadcn/ui).

---

## 1. Paywall Overlay Patterns

### 1a. Blur + Modal (Primary — for Results & PDF)

The user sees their analysis render normally, then the bottom 60% of the
results page receives a CSS `backdrop-filter: blur(12px)` mask with a
centered upgrade modal on top. This "peek then gate" pattern converts
well because the user has already invested effort (filling the form) and
can see the shape of what they will get.

```
Component: <PaywallBlurOverlay>
Structure:
  - Outer: absolute inset-0 z-40
  - Gradient mask: bg-gradient-to-b from-transparent via-[#08080F]/60 to-[#08080F]/95
  - Backdrop: backdrop-blur-md (12px)
  - Inner modal: max-w-md mx-auto, surface card (#0F0F1A), border border-[#1E1E3A]
  - CTA button: full-width indigo primary
Tailwind snippet:
  <div className="absolute inset-0 z-40 flex items-center justify-center
    bg-gradient-to-b from-transparent via-[#08080F]/60 to-[#08080F]/95
    backdrop-blur-md">
```

**When to use:** ResultsPage (after 3 free analyses), PDF export action,
offer letter generation.

### 1b. Inline Lock Icon (Secondary — for Feature Rows)

For features listed in a sidebar, settings page, or feature grid, show the
feature name normally but append a small lock icon (lucide `Lock`, 14px)
with muted foreground color. Clicking the row opens a lightweight popover
(not a full modal) with a one-line value prop and upgrade link.

```
Icon: <Lock className="h-3.5 w-3.5 text-muted-foreground ml-1.5" />
Popover: shadcn Popover, max-w-[260px], contains:
  - Feature name (font-medium text-white)
  - One-line description (text-sm text-muted-foreground)
  - "Upgrade to Pro" link (text-indigo-400 hover:text-indigo-300)
```

**When to use:** AI Chat nav item, Compare nav item, PDF button on
ResultsPage action bar, document storage beyond free limit.

### 1c. Slide-Up Panel (Tertiary — for Contextual Upsells)

A bottom sheet that slides up 200px from the viewport bottom when the user
attempts a gated action. Less intrusive than a centered modal. Works well
on mobile. Auto-dismisses after 8 seconds or on outside click.

```
Framer Motion config:
  initial: { y: 200, opacity: 0 }
  animate: { y: 0, opacity: 1 }
  exit: { y: 200, opacity: 0 }
  transition: SPRING.gentle (damping 20, stiffness 200)
```

**When to use:** Attempting to drag a deal in pipeline when at 5-deal
free limit, tapping "Ask AI" from a deal card on mobile.

---

## 2. Teaser Patterns

### 2a. Partial Data Reveal (Results Page)

Show the first 2 KPI cards fully rendered (e.g., Purchase Price, Monthly
Cash Flow) but blur the remaining cards and the outputs table. The visible
cards prove the calculator works; the blurred ones create desire.

```
Implementation:
  - KPICard index < 2 → render normally
  - KPICard index >= 2 → wrap in div with:
      className="relative select-none pointer-events-none"
      + child overlay: absolute inset-0 backdrop-blur-sm bg-[#08080F]/40
  - Outputs table: same blur treatment on tbody rows after row 3
```

**UX copy on the overlay:**
> "Your full analysis is ready. Unlock all metrics with Parcel Pro."

### 2b. Feature Preview Then Lock Action

For AI Chat: allow the user to see the chat UI (empty state with example
prompts) but disable the input field. The placeholder reads:
> "AI Chat is a Pro feature — upgrade to ask questions about your deals"

The send button shows the Lock icon instead of the Send icon. Clicking it
opens the upgrade modal.

For PDF Export: the button is visible in the action bar but styled as
muted/disabled. Hovering shows a tooltip: "Export to PDF — Pro feature".
Clicking opens the upgrade modal.

---

## 3. Upgrade Button Design

### Size & Hierarchy

| Context | Size | Variant | Width |
|---|---|---|---|
| Primary CTA (modal, banner) | h-10 px-6 text-sm | default (filled indigo) | full-width in modal, auto in banner |
| Secondary CTA (inline, nav) | h-8 px-3 text-xs | outline with indigo border | auto |
| Subtle link (tooltip, popover) | text-sm underline | ghost text-indigo-400 | auto |

### Color

Primary upgrade buttons use the existing indigo primary (`#6366F1`) with a
subtle gradient to differentiate from standard actions:

```
className="bg-gradient-to-r from-indigo-600 to-indigo-500
  hover:from-indigo-500 hover:to-indigo-400
  text-white font-medium shadow-lg shadow-indigo-500/20"
```

The gradient + glow shadow signals "premium" without introducing a new
color into the palette.

### Placement

- **ResultsPage:** In the blur overlay modal, centered, full-width.
- **Sidebar nav:** Below the nav items, small "Upgrade to Pro" button with
  a sparkle icon (lucide `Sparkles`). Only visible to free-tier users.
- **Settings page:** In the "Plan" section, inline with current plan display.
- **Usage meter (dashboard):** Adjacent to the meter, right-aligned.

### Micro-Copy Examples

| Context | Copy |
|---|---|
| Blur overlay (results) | "Unlock Full Analysis" |
| Blur overlay (subtitle) | "Get unlimited analyses, AI chat, and PDF exports" |
| Sidebar button | "Upgrade to Pro" |
| Chat input lock | "Unlock AI Chat" |
| PDF button tooltip | "Export to PDF — Pro" |
| Usage limit banner | "Upgrade Now" |
| Trial expiring banner | "Keep Pro Features" |
| Downgrade warning | "Stay on Pro" |

Avoid the word "Buy" — use "Unlock", "Upgrade", or "Keep". These frame
the action as gaining or retaining access rather than spending money.

---

## 4. Usage Meter UI

### 4a. Progress Bar (Dashboard Sidebar or Top Bar)

A horizontal bar showing consumption against the free-tier cap.

```
Component: <UsageMeter label="Analyses" used={2} limit={3} />

Visual:
  - Container: h-1.5 w-full rounded-full bg-[#1A1A2E]
  - Fill: rounded-full transition-all duration-500
  - Color logic:
      used/limit < 0.5  → bg-emerald-500
      used/limit < 0.8  → bg-amber-500
      used/limit >= 0.8  → bg-red-500
  - Text above: "2 of 3 analyses used" — text-xs text-muted-foreground
  - When limit reached: fill pulses gently (animate-pulse but only on the
    bar, not the text — avoid alarming the whole UI)
```

### 4b. Circular Gauge (Optional — for Dashboard Card)

A ring gauge works if you want a more visual treatment on the dashboard.
Use an SVG circle with `stroke-dasharray` and `stroke-dashoffset`.

```
Dimensions: 48x48px
Stroke width: 4px
Track: stroke-[#1A1A2E]
Fill: stroke-indigo-500 (normal) / stroke-amber-500 (>66%) / stroke-red-500 (>90%)
Center text: "2/3" in JetBrains Mono, text-xs
```

### 4c. Text-Only (Minimal — for Nav Tooltip)

When space is tight (e.g., sidebar collapsed), show only text on hover:
> "2 of 3 free analyses used this month"

### Recommendation

Use the **progress bar** (4a) as the primary meter. Place it in the
dashboard sidebar below the navigation, visible on every page. The circular
gauge is a nice-to-have for a dedicated dashboard KPI card. Text-only for
compressed states.

---

## 5. Approaching Limit Warning

### Banner Design

Appears when the user has consumed 2 of 3 analyses (one remaining) or 4
of 5 deals.

```
Component: <UsageWarningBanner type="analyses" remaining={1} />

Layout: full-width bar at the top of the page content area (below topbar,
  above page content). Not a toast — it persists until dismissed or resolved.

  className="flex items-center justify-between px-4 py-2.5 rounded-lg
    bg-amber-500/10 border border-amber-500/20"

Left side:
  <AlertTriangle className="h-4 w-4 text-amber-500 mr-2 shrink-0" />
  <span className="text-sm text-amber-200">
    You have 1 analysis remaining this month.
  </span>

Right side:
  <Button size="sm" variant="ghost"
    className="text-amber-200 hover:text-amber-100 mr-2">
    Dismiss
  </Button>
  <Button size="sm"
    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs">
    Upgrade Now
  </Button>
```

### Dismiss Behavior

- Dismissing sets a session-storage flag: `usageWarning-{type}-dismissed`.
- The banner does NOT reappear in the same browser session after dismiss.
- If the user consumes the last resource (reaches the hard limit), the
  banner is replaced by the limit-reached modal (section 6) regardless of
  the dismiss flag.

### Color Semantics

| State | Background | Border | Icon/Text Color |
|---|---|---|---|
| Approaching (1 remaining) | amber-500/10 | amber-500/20 | amber-500 / amber-200 |
| Limit reached | red-500/10 | red-500/20 | red-500 / red-200 |
| Trial expiring (<=3 days) | indigo-500/10 | indigo-500/20 | indigo-400 / indigo-200 |

---

## 6. Limit Reached Modal

Triggered when the user attempts an action that exceeds their free-tier
cap (4th analysis, 6th deal, any AI chat message, PDF export).

### Structure

```
Component: <LimitReachedModal feature="analyses" />

Uses: shadcn AlertDialog (already installed in Parcel)

Content hierarchy:
  1. Icon: lucide Zap in a 48px indigo circle (bg-indigo-500/10)
  2. Heading: "You've used all 3 free analyses"
     → font-semibold text-lg text-white
  3. Subheading (empathetic): "Your data is safe — upgrade to keep analyzing."
     → text-sm text-muted-foreground mt-1
  4. Value prop bullets (3 max):
     - "Unlimited deal analyses"
     - "150 AI chat messages/mo"
     - "PDF reports & offer letters"
     → text-sm text-[#C4B5FD] with check-circle icons
  5. Primary CTA: "Upgrade to Pro — $29/mo"
     → full-width indigo gradient button (see section 3)
  6. Secondary link: "View pricing details"
     → text-xs text-muted-foreground underline, opens /pricing
  7. Dismiss: standard AlertDialog close (X or outside click)
```

### UX Copy Variants by Feature

| Feature | Heading | Subheading |
|---|---|---|
| Analyses | "You've used all 3 free analyses" | "Your data is safe — upgrade to keep analyzing." |
| Deals | "You've reached the 5-deal limit" | "Upgrade to track unlimited deals in your pipeline." |
| AI Chat | "AI Chat is a Pro feature" | "Get instant answers about your deals from our AI specialist." |
| PDF Export | "PDF export is a Pro feature" | "Download branded reports to share with partners and lenders." |

### Key Principles

- **Empathetic, not punitive.** Never say "You can't do this." Say "Upgrade
  to unlock this."
- **Acknowledge sunk cost.** "Your data is safe" reassures users their
  work is preserved.
- **Show price.** Displaying "$29/mo" in the CTA reduces friction vs.
  sending to a pricing page with no context.
- **Max 3 bullets.** More than 3 value props causes decision fatigue in
  a modal context.

---

## 7. Trial Banner Design

### Active Trial Banner (Top of Dashboard)

Displayed on every authenticated page during the 14-day trial.

```
Component: <TrialBanner daysRemaining={11} />

Layout: slim bar, 36px height, fixed at top of content area.

Normal state (> 3 days remaining):
  className="flex items-center justify-center gap-2 py-1.5 text-xs
    bg-indigo-500/10 border-b border-indigo-500/15 text-indigo-300"
  Copy: "Pro trial — 11 days remaining"
  CTA: "Upgrade" (text link, not button)

Urgent state (<= 3 days remaining):
  className same structure but:
    bg-amber-500/10 border-amber-500/15 text-amber-200
  Copy: "Your Pro trial ends in 2 days"
  CTA: "Keep Pro Features" (small filled button, indigo)

Last day:
  Copy: "Your Pro trial ends today"
  Pulsing dot before text: animate-pulse bg-amber-500 h-1.5 w-1.5 rounded-full
```

### Design Principles for Trial Banners

1. **Countdown without anxiety.** Show days remaining as a fact, not a
   threat. "11 days remaining" is neutral. "ONLY 11 days left!" is hostile.
2. **Escalate gradually.** Indigo (informational) for days 14-4. Amber
   (attention) for days 3-1. Red never — red implies error or danger.
3. **Dismissible but persistent.** Users can close the banner for 24 hours
   (stored in localStorage with timestamp). It returns the next day.
4. **No animation until urgent.** The pulsing dot only appears on the
   last day. Motion during the normal phase is distracting.
5. **Position.** Always above page content, never floating/sticky over
   content. It should feel like part of the layout, not an ad.

---

## 8. Success Celebration After Upgrade

### Confetti Burst

On successful payment confirmation (Stripe webhook acknowledged, user
redirected back to app):

```
Library: canvas-confetti (4kB, zero-dependency)
  npm install canvas-confetti

Trigger: fire on mount of /upgrade/success or when subscription.status
  changes to 'active' in the React Query cache.

Config:
  confetti({
    particleCount: 80,
    spread: 60,
    origin: { y: 0.7 },
    colors: ['#6366F1', '#818CF8', '#C4B5FD', '#E0E7FF', '#FFFFFF'],
    disableForReducedMotion: true,
  })

Duration: single burst, no looping. Confetti falls and fades naturally.
```

### Feature Unlock Animation

After the confetti, show a card that animates in with each unlocked
feature appearing sequentially:

```
Framer Motion:
  Container: staggerContainer(120)  // 120ms between children
  Each feature row: staggerItem variant (fade + slide up from motion.ts)

  Feature rows:
    <motion.div variants={staggerItem} className="flex items-center gap-3">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 15, stiffness: 300, delay: 0.2 }}
      >
        <CheckCircle className="h-5 w-5 text-emerald-400" />
      </motion.div>
      <span className="text-sm text-white">Unlimited deal analyses</span>
    </motion.div>

  Features listed:
    1. "Unlimited deal analyses" (check)
    2. "150 AI chat messages per month" (check)
    3. "PDF reports & offer letters" (check)
    4. "Priority support" (check)
```

### Welcome-Back Toast

If the user was previously free-tier and returns to a gated page (e.g.,
AI Chat) after upgrading, show a celebratory toast:

```
toast.success('AI Chat unlocked!', {
  description: 'Ask anything about your deals.',
  duration: 4000,
})
```

No confetti on subsequent page visits — the celebration is a one-time
event stored in localStorage as `upgrade-celebrated: true`.

---

## 9. Downgrade Warning

### Pre-Downgrade Modal

When the user clicks "Cancel subscription" or "Downgrade to Free" in
Settings:

```
Component: <DowngradeWarningModal />

Structure (shadcn AlertDialog):
  1. Icon: lucide AlertTriangle in amber circle
  2. Heading: "You'll lose access to these features"
  3. Loss list (what they currently use, personalized):
     - "12 active deals (free limit: 5)" → shows actual count
     - "AI Chat history (37 conversations)"
     - "PDF export & offer letters"
     - "Priority support"
     → Each row: red X icon + text-sm text-red-300/80
  4. Data retention note:
     "Your deals and data won't be deleted. You can upgrade again anytime
      to regain access."
     → text-xs text-muted-foreground, italic
  5. Primary CTA: "Stay on Pro" (indigo filled button)
  6. Secondary CTA: "Continue to downgrade" (ghost button, text-muted-foreground)
     → deliberately understated to bias toward staying
```

### Key Copy Principles

- **Show specific loss.** "12 active deals" is more compelling than
  "unlimited deals". Personalize with their actual usage data.
- **Data safety.** Always reassure that data is not deleted. Fear of data
  loss causes support tickets and churn anxiety.
- **Reversibility.** "Upgrade again anytime" lowers stakes and reduces
  finality anxiety.
- **Bias the UI.** The "Stay" button is primary (filled, colored). The
  "Continue to downgrade" button is muted ghost text. This is standard
  retention UX.

---

## 10. Framer Motion Animation Configs

All animations below are built on Parcel's existing motion.ts system
(DURATION, EASING, SPRING constants) for consistency.

### 10a. Paywall Reveal (Blur Overlay)

```typescript
// Overlay fades in while blur increases
export const paywallOverlay: Variants = {
  hidden: { opacity: 0, backdropFilter: 'blur(0px)' },
  visible: {
    opacity: 1,
    backdropFilter: 'blur(12px)',
    transition: { duration: DURATION.slow, ease: EASING.smooth },
  },
  exit: {
    opacity: 0,
    backdropFilter: 'blur(0px)',
    transition: { duration: DURATION.normal },
  },
}

// Modal card enters from below with spring
export const paywallModal: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { ...SPRING.gentle, delay: 0.15 },
  },
  exit: {
    opacity: 0,
    y: 12,
    scale: 0.98,
    transition: { duration: DURATION.fast },
  },
}
```

### 10b. Feature Unlock (Check Mark Spring)

```typescript
// Individual check icon pops in with overshoot
export const featureUnlock: Variants = {
  hidden: { scale: 0, rotate: -45 },
  visible: {
    scale: 1,
    rotate: 0,
    transition: { type: 'spring', damping: 12, stiffness: 300 },
  },
}

// Feature text slides in from the right
export const featureText: Variants = {
  hidden: { opacity: 0, x: -12 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: DURATION.normal, ease: EASING.snappy },
  },
}
```

### 10c. Usage Meter Fill Animation

```typescript
// Animate the width of the progress bar fill
// Use motion.div with style={{ width: `${percentage}%` }}
// and layout transition for smooth resizing on data changes.
export const meterFill = {
  initial: { width: '0%' },
  animate: (percentage: number) => ({
    width: `${percentage}%`,
    transition: { duration: 0.8, ease: EASING.smooth },
  }),
}
```

### 10d. Trial Banner Entrance

```typescript
// Banner slides down from above the viewport
export const trialBanner: Variants = {
  hidden: { y: -36, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: DURATION.normal, ease: EASING.snappy },
  },
  exit: {
    y: -36,
    opacity: 0,
    transition: { duration: DURATION.fast },
  },
}
```

### 10e. Celebration Sequence

```typescript
// Orchestrated celebration: confetti fires first, then the unlock card
// staggers in its children.

// 1. Page-level container delays children until confetti has peaked
export const celebrationContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: 0.6, // confetti peaks at ~500ms
      staggerChildren: 0.12,
    },
  },
}

// 2. Each "unlocked" row uses featureUnlock + featureText above
// 3. Final CTA ("Go to Dashboard") fades in after all rows
export const celebrationCTA: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.normal, delay: 1.2 },
  },
}
```

### 10f. Lock Icon Pulse (Gated Feature Hint)

```typescript
// Gentle pulse on lock icons to draw attention without being obnoxious.
// Only triggers once on mount, does not loop.
export const lockPulse: Variants = {
  hidden: { scale: 1 },
  visible: {
    scale: [1, 1.15, 1],
    transition: { duration: 0.6, ease: 'easeInOut', delay: 0.8 },
  },
}
```

### Reduced Motion

All animations above must respect `prefers-reduced-motion`. Framer Motion
handles this automatically when using the `useReducedMotion()` hook or the
global `MotionConfig` provider with `reducedMotion="user"`. The confetti
library's `disableForReducedMotion: true` flag handles the canvas-based
burst. Ensure the trial banner and usage meter still display correctly
without animation — the information itself must never be hidden behind
motion.

---

## RECOMMENDATIONS FOR PARCEL

### Priority 1 — Implement First

1. **Blur overlay on ResultsPage.** This is the highest-converting paywall
   pattern for Parcel because users have already invested effort entering
   deal numbers. Show 2 KPI cards, blur the rest. The sunk-cost effect
   drives conversion. Place the `<PaywallBlurOverlay>` component as a
   conditional wrapper inside `ResultsPage.tsx` that checks the user's
   plan and analysis count.

2. **Usage meter in the sidebar.** A thin progress bar below the nav items
   in `AppShell.tsx` showing "2 of 3 analyses used" gives constant,
   non-intrusive visibility into consumption. Use the amber/red color
   escalation to naturally prime users for the upgrade prompt.

3. **Limit-reached modal using shadcn AlertDialog.** Already installed in
   the project. Create a single `<LimitReachedModal>` that accepts a
   `feature` prop and renders the appropriate copy variant (section 6).
   Wire it into the analysis submit handler, deal creation, chat input,
   and PDF export.

4. **Trial banner.** Slim, non-disruptive, positioned above page content
   in `AppShell.tsx`. Use indigo for normal state, amber for the last
   3 days. Dismissible per-day via localStorage timestamp.

### Priority 2 — Second Sprint

5. **Inline lock icons on gated nav items.** Add the lock icon to the
   AI Chat and Compare sidebar links for free-tier users. Use the popover
   pattern (section 1b) for a lightweight upsell on click.

6. **Approaching-limit warning banner.** Display when 1 analysis or 1
   deal slot remains. Session-dismissible. Transitions to the hard limit
   modal when the cap is hit.

7. **Slide-up panel for mobile.** The blur overlay works well on desktop
   but is cramped on mobile. Use the bottom-sheet slide-up (section 1c)
   as the mobile variant, matching the existing mobile pipeline pattern.

### Priority 3 — Polish

8. **Upgrade success celebration.** Install `canvas-confetti`, fire a
   single burst on upgrade confirmation. Stagger-reveal unlocked features
   with the existing `staggerContainer`/`staggerItem` from `motion.ts`.
   Store `upgrade-celebrated` in localStorage to prevent repeat firings.

9. **Downgrade warning modal.** Personalize the loss list with the user's
   actual deal count and chat history count from the API. The specificity
   of "12 active deals" vs. "unlimited deals" makes the loss feel concrete.

10. **Chat teaser state.** Render the chat UI with example prompts but
    disable the input. Replace the Send icon with Lock. This lets free
    users see the feature's shape and imagine using it, which is more
    motivating than a static marketing screenshot.

### Architecture Notes

- All paywall logic should live behind a single `usePlan()` hook that
  reads the user's subscription status, trial end date, and usage counts
  from the `/auth/me` endpoint (already exists). Components check
  `plan.canAnalyze`, `plan.canChat`, `plan.canExport` booleans.
- Never gate on the frontend alone. All limits must be enforced by the
  backend. The frontend paywall is a UX layer, not a security boundary.
- Store dismissal states (banner, warning) in localStorage with
  timestamps, not booleans. This allows per-day or per-session reset
  without clearing all preferences.
- Keep all upgrade CTAs pointing to a single `/upgrade` route that
  handles Stripe Checkout redirect. Pass a `?from=results` or
  `?from=chat` query param to track conversion source in analytics.
