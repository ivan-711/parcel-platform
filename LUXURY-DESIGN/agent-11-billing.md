# Agent 11 -- Billing Components: Dark Luxury Redesign

Design spec for every billing-related component in Parcel's dark luxury system.
Maps 1:1 to existing files in `frontend/src/components/billing/` plus `BillingSettings.tsx`.

**Locked tokens:**
- Background `#0C0B0A` | Surface `#141312` | Elevated `#1E1D1B`
- Text `#F0EDE8` | Muted `#F0EDE8/50` | Dim `#F0EDE8/30`
- Accent `#8B7AFF` | Accent-light `#A094FF` | Accent-wash `#8B7AFF/15`
- Error `#D4766A` | Warning `#E5A84B` | Success `#7CCBA5`

---

## 1. PaywallOverlay

**File:** `components/billing/PaywallOverlay.tsx`

Replaces the white `via-white/60 to-white/95` gradient with a saturated dark blur + radial vignette.

### Layer stack (bottom to top)

| Layer | Purpose | Classes / Style |
|-------|---------|-----------------|
| 1 -- Saturated blur | Obscure content, prevent gray wash | `absolute inset-0 bg-[#0C0B0A]/80 backdrop-blur-xl backdrop-saturate-150` |
| 2 -- Radial vignette | Draw focus to center modal | `absolute inset-0` + inline `background: radial-gradient(ellipse at center, transparent 0%, rgba(12,11,10,0.95) 70%)` |
| 3 -- Modal card | Elevated container | `relative z-10 w-full max-w-md bg-[#161514] border border-white/[0.06] rounded-xl shadow-2xl shadow-black/40 p-8 mx-4` |

### Modal interior

```
Lock icon container:
  mx-auto w-12 h-12 rounded-xl bg-[#8B7AFF]/10 ring-1 ring-[#8B7AFF]/20
  flex items-center justify-center mb-5
  <Lock size={24} className="text-[#8B7AFF]" />

Title:      text-lg font-semibold text-[#F0EDE8] text-center
Subtitle:   text-sm text-[#F0EDE8]/50 text-center mt-2 mb-6

Upgrade CTA:
  w-full h-11 rounded-lg bg-[#8B7AFF] hover:bg-[#7B6AEF]
  text-white text-sm font-medium transition-colors
  disabled:opacity-50 cursor-pointer

Compare link: text-sm text-[#8B7AFF] hover:text-[#A094FF] transition-colors
Dismiss:      text-sm text-[#F0EDE8]/30 hover:text-[#F0EDE8]/50 transition-colors cursor-pointer
```

### Animation

```tsx
initial={{ opacity: 0, scale: 0.96, y: 8 }}
animate={{ opacity: 1, scale: 1, y: 0 }}
transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
```

**Why not white gradient:** On dark, `via-white/60` produces an opaque fog that breaks the environment. The saturated blur at 80% opacity + `backdrop-saturate-150` enriches the color bleed-through, keeping richness. The radial vignette creates a cinematic spotlight effect.

---

## 2. FeatureGate

**File:** `components/billing/FeatureGate.tsx`

Wrapper logic unchanged -- it resolves effective tier and renders children or paywall. The only dark-specific change is the outer container.

```
Gated container:
  relative min-h-[200px]
```

No background color on the gate wrapper itself -- the PaywallOverlay's saturated blur handles the visual separation. The children render into the dark page context naturally; the overlay sits atop them.

**Behavioral note:** `FeatureGate` already handles demo bypass (`demo@parcel.app`) and trial elevation (`free` + `trial_active` = `pro`). No changes to that logic. The visual delta is entirely in the PaywallOverlay it renders as fallback.

---

## 3. TrialBanner

**File:** `components/billing/TrialBanner.tsx`

Three urgency tiers with distinct color treatments on dark.

### Tier 1 -- Calm (>3 days remaining)

Violet accent. Informational, not urgent. Blends with sidebar.

```
Container:
  mx-3 mb-3 rounded-lg
  bg-[#8B7AFF]/[0.06] border border-[#8B7AFF]/10 p-3

Icon:   <Clock size={15} className="text-[#8B7AFF]/70 mt-0.5 shrink-0" />
Text:   text-sm font-medium text-[#F0EDE8]/80
        "Pro Trial -- {daysLeft} days left"
Link:   text-xs text-[#8B7AFF] hover:text-[#A094FF] mt-1 inline-block transition-colors
        "View plans"
Snooze: text-[#F0EDE8]/30 hover:text-[#F0EDE8]/50 transition-colors cursor-pointer shrink-0
```

### Tier 2 -- Warm (1-3 days remaining)

Amber. Caution without triggering error association.

```
Container:
  mx-3 mb-3 rounded-lg
  bg-amber-500/[0.06] border border-amber-500/10 p-3

Icon:   <AlertTriangle size={15} className="text-amber-400 mt-0.5 shrink-0" />
Text:   text-sm font-medium text-amber-200
        "Trial ending soon -- {daysLeft} day(s) left"

CTA button:
  mt-2 w-full h-8 rounded-md
  bg-amber-500/20 hover:bg-amber-500/30
  text-amber-200 text-xs font-medium
  transition-colors cursor-pointer border border-amber-500/20
  "Upgrade now"
```

### Tier 3 -- Expired (0 days / trial inactive)

Red, muted. `red-400` text (not 500/600) for proper dark luminance.

```
Container:
  mx-3 mb-3 rounded-lg
  bg-red-500/[0.05] border border-red-500/10 p-3

Icon:   <XCircle size={15} className="text-red-400 mt-0.5 shrink-0" />
Text:   text-sm font-medium text-red-300
        "Trial expired"

CTA button:
  mt-2 w-full h-8 rounded-md
  bg-red-500 hover:bg-red-600
  text-white text-xs font-medium
  "Upgrade to continue"
```

**Day count typography:** `font-variant-numeric: tabular-nums` on the number span, `text-[#F0EDE8] font-semibold` for the count, surrounding label at `text-[#F0EDE8]/60`.

---

## 4. PlanBadge

**File:** `components/billing/PlanBadge.tsx`

Translucent bg + ring-1 treatment. No solid fills on dark.

### Pro badge

```
inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md
bg-[#8B7AFF]/15 text-[#A094FF] ring-1 ring-[#8B7AFF]/20
text-[11px] font-semibold uppercase tracking-wide
```

### Trial badge

```
inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md
bg-[#8B7AFF]/[0.06] text-[#8B7AFF]/70 ring-1 ring-[#8B7AFF]/10
text-[11px] font-semibold uppercase tracking-wide
```

### Free badge

```
inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md
bg-white/[0.04] text-[#F0EDE8]/40 ring-1 ring-white/[0.06]
text-[11px] font-semibold uppercase tracking-wide
```

Upgrade link next to Free badge: `text-[11px] text-[#8B7AFF] hover:text-[#A094FF] font-medium transition-colors`.

**Rationale:** Solid `bg-lime-700 text-white` flattens on dark. The translucent-with-ring pattern (Arc, Raycast, Warp pattern) creates "glowing from within" premium signaling.

---

## 5. UsageMeter

**File:** `components/billing/UsageMeter.tsx`

Violet fill replaces lime. Dark track. Glow at warning threshold.

### Color system

| State | Track | Fill | Glow |
|-------|-------|------|------|
| Normal (0-79%) | `bg-[#1E1D1B]` | `bg-[#8B7AFF]` | none |
| Warning (80-99%) | `bg-[#1E1D1B]` | `bg-amber-300` | `0 0 8px rgba(252,211,77,0.3)` |
| Exceeded (100%) | `bg-[#1E1D1B]` | `bg-red-400` | `0 0 8px rgba(248,113,113,0.4)` |

### Layout

```
Label:   text-sm font-medium text-[#F0EDE8]/70
Count:   text-sm text-[#F0EDE8]/50 tabular-nums  "{current} of {limit} used"
Track:   h-2 rounded-full bg-[#1E1D1B] overflow-hidden relative
Fill:    h-full rounded-full (color per table above)
         animated width with duration 0.5, ease [0.25, 0.1, 0.25, 1]
```

### Unlimited state

```
Label:   text-sm font-medium text-[#F0EDE8]/70
Value:   text-sm text-[#F0EDE8]/40  "Unlimited"
```

### Glow effect (warning/exceeded)

An absolutely positioned overlay on the fill bar, with a pulsing opacity animation:

```tsx
{warning && (
  <motion.div
    className="h-2 rounded-full absolute top-0 left-0"
    style={{
      width: `${pct}%`,
      boxShadow: exceeded
        ? '0 0 8px rgba(248,113,113,0.4)'
        : '0 0 8px rgba(252,211,77,0.3)',
    }}
    animate={{ opacity: [0.5, 1, 0.5] }}
    transition={{ duration: 2, repeat: Infinity }}
  />
)}
```

---

## 6. LimitReachedModal

**File:** `components/billing/LimitReachedModal.tsx`

Growth-oriented icon (BarChart3), empathetic copy, violet accent.

### Backdrop

```
fixed inset-0 z-50 flex items-center justify-center
Backdrop layer: absolute inset-0 bg-[#0C0B0A]/80 backdrop-blur-sm
```

### Modal card

```
relative z-10 w-full max-w-sm
bg-[#161514] border border-white/[0.06]
rounded-xl shadow-2xl shadow-black/40 p-6 mx-4
```

### Interior

```
Icon container:
  mx-auto w-12 h-12 rounded-xl
  bg-[#8B7AFF]/10 ring-1 ring-[#8B7AFF]/20
  flex items-center justify-center mb-4
  <BarChart3 size={24} className="text-[#8B7AFF]" />

Title:    text-lg font-semibold text-[#F0EDE8] text-center
          "You've hit your analysis limit"
Body:     text-sm text-[#F0EDE8]/50 text-center mt-2 mb-5
          "You've used all {limit} free analyses this month. Upgrade to Pro for unlimited access."

Embedded UsageMeter: mb-5

Upgrade CTA:
  w-full h-11 rounded-lg bg-[#8B7AFF] hover:bg-[#7B6AEF]
  text-white text-sm font-medium transition-colors
  disabled:opacity-50 cursor-pointer

Dismiss:
  w-full mt-3 text-sm text-[#F0EDE8]/30 hover:text-[#F0EDE8]/50
  transition-colors cursor-pointer py-1
  "Maybe later"
```

### Micro-interaction

When modal enters, animate the embedded UsageMeter from 0% to 100% with spring stiffness 250, damping 20. The visual "filling up" reinforces the message kinetically.

**Why BarChart3 not AlertTriangle:** On dark, warning triangles trigger error associations. BarChart3 reframes the limit as growth opportunity, not punishment. Empathetic copy ("hit your limit" not "exceeded" or "ran out") keeps tone respectful.

---

## 7. SuccessOverlay

**File:** `components/billing/SuccessOverlay.tsx`

Confetti with high-luminance violet-anchored palette on dark canvas.

### Backdrop

```
fixed inset-0 z-50 flex items-center justify-center
bg-[#0C0B0A]/85 backdrop-blur-sm
```

### Confetti color palette

```typescript
const DARK_CONFETTI_COLORS = [
  '#8B7AFF',  // violet accent (brand anchor)
  '#A094FF',  // violet light
  '#C4B5FD',  // violet-300
  '#F0EDE8',  // cream (reads as silver/gold on dark)
  '#FCD34D',  // amber-300 (warm sparkle)
  '#67E8F9',  // cyan-300 (cool sparkle)
  '#F9A8D4',  // pink-300 (variety)
]
```

Particle minimum size: 4px (up from 3px -- small particles lose visual weight on dark).
Add `ctx.shadowColor = p.color` and `ctx.shadowBlur = 3` for subtle halo per particle.

### Modal card

```
relative z-10 w-full max-w-md
bg-[#161514] border border-white/[0.06]
rounded-xl shadow-2xl shadow-black/50 p-8 mx-4

Checkmark ring:
  mx-auto w-16 h-16 rounded-full
  bg-[#8B7AFF]/15 ring-1 ring-[#8B7AFF]/20
  flex items-center justify-center mb-6
  <Check size={32} className="text-[#8B7AFF]" strokeWidth={3} />
  Spring entrance: delay 0.2, stiffness 200

Title:    text-2xl font-bold text-[#F0EDE8] text-center  "Welcome to Pro!"
Subtitle: text-base text-[#F0EDE8]/50 text-center mt-2 mb-6
```

### Feature list

```
Each row:
  flex items-center gap-3
  Bullet: w-5 h-5 rounded-full bg-[#8B7AFF]/10 flex items-center justify-center shrink-0
          <Check size={12} className="text-[#8B7AFF]" />
  Label:  text-sm text-[#F0EDE8]/70
```

### CTA

```
w-full h-11 rounded-lg bg-[#8B7AFF] hover:bg-[#7B6AEF]
text-white text-sm font-medium transition-colors cursor-pointer
"Start Analyzing Deals"
```

---

## 8. BillingSettings

**File:** `pages/settings/BillingSettings.tsx`

Full page section: plan display, usage, payment method, invoices.

### Current Plan Card

```
Outer:
  bg-[#141312] border border-white/[0.06] rounded-xl p-6 shadow-none space-y-4

Icon box:
  w-10 h-10 rounded-lg bg-[#8B7AFF]/10 ring-1 ring-[#8B7AFF]/20
  flex items-center justify-center
  <CreditCard size={20} className="text-[#8B7AFF]" />

"Current Plan" label:  text-sm font-semibold text-[#F0EDE8]
Sub info (trial/renew): text-sm text-[#F0EDE8]/50 mt-1
Cancel warning:         text-sm text-amber-400 mt-1
Past due warning:       text-sm text-[#D4766A] mt-1
```

### StatusBadge (subscription status)

Translucent pattern matching PlanBadge language:

```
active:       bg-[#7CCBA5]/10 text-[#7CCBA5] ring-1 ring-[#7CCBA5]/20
trialing:     bg-[#8B7AFF]/10 text-[#A094FF] ring-1 ring-[#8B7AFF]/20
past_due:     bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20
canceled:     bg-red-500/10 text-red-400 ring-1 ring-red-500/20
incomplete:   bg-white/[0.04] text-[#F0EDE8]/40 ring-1 ring-white/[0.06]
unpaid:       bg-red-500/10 text-red-400 ring-1 ring-red-500/20
```

All badges: `inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ring-1`.

### Action buttons

```
Upgrade CTA (free plan):
  inline-flex items-center gap-2 px-4 py-2 rounded-lg
  bg-[#8B7AFF] hover:bg-[#7B6AEF]
  text-white text-sm font-medium transition-colors

Manage Subscription (paid):
  inline-flex items-center gap-2 px-4 py-2 rounded-lg
  border border-white/[0.08] bg-transparent hover:bg-white/[0.04]
  text-sm font-medium text-[#F0EDE8]/70 transition-colors
  disabled:opacity-50 cursor-pointer

Cancel link:
  text-sm text-red-400/70 hover:text-red-400 transition-colors cursor-pointer
```

### Usage Section

```
Outer:
  bg-[#141312] border border-white/[0.06] rounded-xl p-6 shadow-none space-y-4

Section title: text-sm font-semibold text-[#F0EDE8]
Grid:          grid grid-cols-1 md:grid-cols-2 gap-4
Reset note:    text-xs text-[#F0EDE8]/30
```

UsageMeter components render inside with the dark tokens from section 5.

### Invoice Table

```
Outer:
  bg-[#141312] border border-white/[0.06] rounded-xl overflow-hidden

Table headers:
  border-b border-white/[0.06]
  text-left text-xs font-medium text-[#F0EDE8]/40
  uppercase tracking-wider px-4 py-3

Table rows:
  border-b border-white/[0.03] last:border-0
  Alternating: odd rows plain, even rows bg-white/[0.015]

Date:        px-4 py-3 text-sm text-[#F0EDE8]/60 tabular-nums
Description: px-4 py-3 text-sm text-[#F0EDE8]/80
Amount:      px-4 py-3 text-sm text-[#F0EDE8] text-right tabular-nums font-semibold
Status:      InvoiceStatusBadge per translucent pattern
```

### InvoiceStatusBadge

```
paid:           bg-[#7CCBA5]/10 text-[#7CCBA5] ring-1 ring-[#7CCBA5]/20
open:           bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20
void:           bg-white/[0.04] text-[#F0EDE8]/30 ring-1 ring-white/[0.06]
uncollectible:  bg-red-500/10 text-red-400 ring-1 ring-red-500/20
```

All: `inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium ring-1`.

---

## 9. Stripe Checkout Transition

**Hook:** `hooks/useBilling.ts` -- `useCheckout` mutation `onSuccess`.

A 500ms full-screen dark overlay with animated dots bridges the jarring dark-to-white flash when redirecting to Stripe Checkout.

### Flow

```
User clicks "Upgrade to Pro"
  -> mutation fires, API returns checkout_url
  -> instead of immediate redirect, show transition overlay
  -> 500ms later, window.location.href = checkout_url
```

### Transition overlay

```
Container:
  fixed inset-0 z-[60] bg-[#0C0B0A] flex items-center justify-center

Content group:
  flex flex-col items-center gap-3

Lock icon: <Lock size={20} className="text-[#F0EDE8]/40" />
Label:     text-sm text-[#F0EDE8]/40  "Redirecting to secure checkout..."

Animated dots (3):
  flex gap-1.5
  Each: w-1.5 h-1.5 rounded-full bg-[#8B7AFF]
  animate={{ opacity: [0.3, 1, 0.3] }}
  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
```

### Entrance animation

```tsx
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.15 }}
  className="fixed inset-0 z-[60] bg-[#0C0B0A] ..."
>
```

### Return handling

When user returns from Stripe with `?billing=success`, the dark interface re-establishes itself before any content paints. The SuccessOverlay mounts on top of the already-dark page, preventing a white flash. No additional transition needed on return.

For `?billing=canceled`, no overlay -- the user lands back in the dark environment naturally. A subtle toast is sufficient: `toast('Checkout canceled', { description: 'You can upgrade anytime.' })`.

---

## 10. Cancel Flow

**File:** `pages/settings/BillingSettings.tsx` (cancel dialog)

Respectful tone. Translucent destructive buttons. Optional save offer.

### Dialog styling

```
DialogContent:
  sm:max-w-md bg-[#161514] border border-white/[0.06]

DialogTitle:       text-[#F0EDE8]
DialogDescription: text-[#F0EDE8]/50
```

### Reason survey (radio options, not select dropdown)

Each option is a selectable card:

```
Unselected:
  flex items-center gap-3 p-3 rounded-lg cursor-pointer
  ring-1 ring-white/[0.06] hover:ring-white/[0.1] hover:bg-white/[0.02]
  transition-all duration-150

Selected:
  ring-1 ring-[#8B7AFF]/30 bg-[#8B7AFF]/[0.06]

Radio dot unselected: w-4 h-4 rounded-full border-2 border-white/20
Radio dot selected:   w-4 h-4 rounded-full border-2 border-[#8B7AFF]
  Inner: w-2 h-2 rounded-full bg-[#8B7AFF]

Label: text-sm text-[#F0EDE8]/80
```

### Save offer card (shown before final confirmation)

```
Outer: rounded-xl overflow-hidden
Gradient bar: h-1 bg-gradient-to-r from-[#8B7AFF] to-[#67E8F9]
Body:
  bg-[#161514] border border-white/[0.06] border-t-0 p-5

Offer text:  text-sm font-medium text-[#F0EDE8]
             "Stay with 20% off your next 3 months"
Detail:      text-xs text-[#F0EDE8]/40 mt-1
             "That's $44/mo instead of $55/mo, billed annually."

Accept:
  flex-1 h-9 rounded-lg bg-[#8B7AFF] hover:bg-[#7B6AEF]
  text-white text-sm font-medium transition-colors

Continue canceling:
  flex-1 h-9 rounded-lg
  ring-1 ring-white/[0.08] text-[#F0EDE8]/60 text-sm
  hover:bg-white/[0.04] transition-colors
```

### Action buttons

```
Keep Subscription:
  px-4 py-2 rounded-lg
  border border-white/[0.08] bg-transparent hover:bg-white/[0.04]
  text-sm font-medium text-[#F0EDE8]/70 transition-colors cursor-pointer

Cancel (destructive, translucent):
  px-4 py-2 rounded-lg
  bg-red-500/15 hover:bg-red-500/25
  text-red-400 text-sm font-medium
  ring-1 ring-red-500/20
  transition-colors cursor-pointer
  disabled:opacity-50
```

**Why translucent red:** Solid `bg-red-600 text-white` reads as hostile on dark interfaces. The `bg-red-500/15 text-red-400 ring-1 ring-red-500/20` treatment communicates "destructive" without aggression. It matches the overall dark design language where every colored surface is translucent.

---

## CRITICAL DECISIONS

1. **Saturated blur over white gradient.** `backdrop-blur-xl backdrop-saturate-150` with `bg-[#0C0B0A]/80` replaces `via-white/60 to-white/95`. This is the most visually impactful change -- every paywall interaction starts here. The saturation boost prevents the muddy gray wash that raw blur produces on dark backgrounds.

2. **Radial vignette for focus.** The `radial-gradient(ellipse at center, transparent 0%, rgba(12,11,10,0.95) 70%)` layer creates a cinematic spotlight on the modal card. Linear-style competitors use this to draw the eye without adding lightness.

3. **Three-tier trial urgency (violet / amber / red).** The current two-tier system (lime/amber) collapses to a single emotional register on dark. Adding the violet calm tier (>3 days) integrates the banner into the brand palette during the non-urgent period, making the shift to amber genuinely noticeable.

4. **BarChart3 replaces AlertTriangle in LimitReachedModal.** Warning icons on dark trigger "something is broken" associations. The growth-oriented icon reframes limits as scaling opportunity. Copy shifts from "reached your limit" to "hit your analysis limit" -- specific, not generic.

5. **Translucent badge system.** Every badge (Plan, Status, Invoice) uses `bg-{color}/10-15 text-{color}-light ring-1 ring-{color}/20`. No solid fills anywhere in the billing UI. This creates visual consistency and the "glowing from within" quality that premium dark interfaces share.

6. **500ms Stripe transition overlay.** The dark-to-white flash when redirecting to Stripe Checkout is a significant luxury-feel violation. The full-screen dark overlay with animated dots absorbs the transition and gives the user a "we're handling this" moment.

7. **Translucent destructive buttons.** `bg-red-500/15 text-red-400 ring-1 ring-red-500/20` instead of `bg-red-600 text-white`. On dark, solid red is visually aggressive. The translucent variant maintains the "this is destructive" signal at appropriate emotional volume.

8. **Confetti palette swap.** Current lime/yellow/sky colors calibrated for white background become invisible or harsh on `#0C0B0A`. The violet-anchored palette (`#8B7AFF`, `#A094FF`, `#C4B5FD`, `#F0EDE8`, `#FCD34D`, `#67E8F9`, `#F9A8D4`) ensures every particle has sufficient luminance. Particle size bumps to 4px minimum and gains `shadowBlur: 3` for halo effect.

9. **Financial text hierarchy.** Amounts always render at `text-[#F0EDE8] font-semibold tabular-nums` (full cream, full weight). Labels at `/70`, metadata at `/50`, tertiary at `/30`. This principle applies everywhere: invoice tables, usage meters, pricing cards.

10. **Radio options over select dropdown in cancel flow.** On dark, native `<select>` elements render with OS-level chrome that conflicts with the dark theme. Radio card options with the ring-1 treatment give full visual control and are more touch-friendly.
