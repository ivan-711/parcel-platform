# Agent 12 -- Billing Components on Dark Luxury Interfaces

Research document covering paywall overlays, trial banners, usage meters, upgrade flows,
success celebrations, cancellation experiences, plan badges, limit modals, Stripe Checkout
transitions, and invoice display -- all optimized for a dark luxury SaaS aesthetic.

**Context:** Parcel uses Stripe billing with Free + Pro tiers, 7-day trial, feature gating,
and usage limits (5 free analyses). Stack: React 18 + TypeScript + Tailwind CSS + Framer
Motion. Dark palette: `#0C0B0A` background, `#F0EDE8` cream text, `#8B7AFF` violet accent.

**Current state:** Billing components already exist in a light theme (lime-700 accent on
white). This document researches how premium dark interfaces handle equivalent billing UI
and provides concrete patterns for a dark variant.

---

## 1. Paywall Overlay on Dark: Dark-on-Dark Blur Treatment

### The Problem

On light backgrounds, `backdrop-filter: blur(12px)` over white content creates a frosted
glass effect naturally. On dark backgrounds, blur alone produces a muddy gray wash that
looks broken rather than intentional. The challenge is creating depth and separation
without introducing lightness that contradicts the dark environment.

### Industry Patterns

**Linear (dark mode):** Uses a radial gradient overlay centered on the modal, not a
uniform blur. The gradient goes from `transparent` at the center outward to near-opaque
dark. The modal itself sits on an elevated surface (`#1A1A2E`) with a 1px border at
`rgba(255,255,255,0.06)`. No backdrop-blur at all -- they rely on opacity layering.

**Raycast:** Their paywall uses `backdrop-blur-xl` (24px) combined with a dark overlay at
90% opacity. The extreme blur radius plus high opacity means the underlying content is
barely visible -- just enough shape to suggest depth without revealing readable text.

**Vercel (dark mode):** Pro feature gates use `backdrop-saturate-150 backdrop-blur-md`
with a `bg-black/70` overlay. The saturation boost prevents the washed-out gray problem
by enriching whatever color bleeds through the blur.

### Recommended Pattern for Dark

```
Layers (bottom to top):
1. Content (blurred target)
2. bg-[#0C0B0A]/80 backdrop-blur-xl backdrop-saturate-150
3. Radial gradient: from transparent center to #0C0B0A/95 edges
4. Modal card: bg-[#161514] border border-white/[0.06] shadow-2xl
```

```tsx
{/* PaywallOverlay -- dark variant */}
<div className="absolute inset-0 z-40 flex items-center justify-center">
  {/* Layer 1: saturated blur */}
  <div className="absolute inset-0 bg-[#0C0B0A]/80
    backdrop-blur-xl backdrop-saturate-150" />

  {/* Layer 2: radial vignette -- draws eye to center modal */}
  <div className="absolute inset-0"
    style={{
      background: 'radial-gradient(ellipse at center, transparent 0%, rgba(12,11,10,0.95) 70%)'
    }} />

  {/* Layer 3: modal card */}
  <motion.div
    initial={{ opacity: 0, scale: 0.96, y: 8 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
    className="relative z-10 w-full max-w-md
      bg-[#161514] border border-white/[0.06]
      rounded-xl shadow-2xl shadow-black/40 p-8 mx-4"
  >
    {/* Lock icon with violet glow */}
    <div className="mx-auto w-12 h-12 rounded-xl
      bg-[#8B7AFF]/10 ring-1 ring-[#8B7AFF]/20
      flex items-center justify-center mb-5">
      <Lock size={24} className="text-[#8B7AFF]" />
    </div>
    {/* ... content ... */}
  </motion.div>
</div>
```

**Key insight:** On dark, the blur radius should be 1.5-2x what you use on light (24px vs
12px). The higher blur compensates for the lower contrast between dark content and dark
overlay. Adding `backdrop-saturate-150` prevents the desaturated gray wash.

---

## 2. Trial Banner: Urgent but Not Alarming Countdown Timers

### The Dark Timer Problem

Countdown timers on dark backgrounds must communicate urgency without creating visual
anxiety. Red or orange text on dark backgrounds can look like error states. The palette
needs to differentiate "informational countdown" from "something is broken."

### Tiered Urgency System

**Days 7-4 (calm):** Violet accent is the informational color. The banner blends into the
sidebar as a subtle notification, not a warning.

```tsx
{/* Calm state: 7-4 days */}
<div className="mx-3 mb-3 rounded-lg
  bg-[#8B7AFF]/[0.06] border border-[#8B7AFF]/10 p-3">
  <div className="flex items-start gap-2.5">
    <Clock size={15} className="text-[#8B7AFF]/70 mt-0.5 shrink-0" />
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium text-[#F0EDE8]/80">
        Pro Trial &middot; {daysLeft} days left
      </p>
      <Link className="text-xs text-[#8B7AFF] hover:text-[#A094FF]
        mt-1 inline-block transition-colors">
        View plans
      </Link>
    </div>
  </div>
</div>
```

**Days 3-1 (warm):** Shift to amber. On dark backgrounds, amber reads as caution without
triggering the "error" association that red creates. Use `#F59E0B` (amber-500) at reduced
opacity for the background tint.

```tsx
{/* Warm state: 3-1 days */}
<div className="mx-3 mb-3 rounded-lg
  bg-amber-500/[0.06] border border-amber-500/10 p-3">
  <div className="flex items-start gap-2.5">
    <AlertTriangle size={15} className="text-amber-400 mt-0.5 shrink-0" />
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium text-amber-200">
        Trial ending soon &middot; {daysLeft} day{daysLeft === 1 ? '' : 's'} left
      </p>
      <button className="mt-2 w-full h-8 rounded-md
        bg-amber-500/20 hover:bg-amber-500/30
        text-amber-200 text-xs font-medium
        transition-colors cursor-pointer border border-amber-500/20">
        Upgrade now
      </button>
    </div>
  </div>
</div>
```

**Day 0 / Expired:** Red, but muted. On dark, use `red-400` (not `red-500` or `red-600`)
for text -- it has better luminance contrast against dark backgrounds. The background tint
stays extremely subtle at 5-6% opacity.

```tsx
{/* Expired state */}
<div className="mx-3 mb-3 rounded-lg
  bg-red-500/[0.05] border border-red-500/10 p-3">
  <XCircle size={15} className="text-red-400 mt-0.5 shrink-0" />
  <p className="text-sm font-medium text-red-300">Trial expired</p>
  <button className="mt-2 w-full h-8 rounded-md
    bg-red-500 hover:bg-red-600
    text-white text-xs font-medium">
    Upgrade to continue
  </button>
</div>
```

### Typography for Countdown Numbers

Use tabular-nums (Inter or JetBrains Mono) for day counts so the layout does not shift
as numbers change. On dark, the number itself should be slightly brighter than the
surrounding label text to draw the eye:

```css
.trial-days {
  font-variant-numeric: tabular-nums;
  color: #F0EDE8;        /* cream -- full brightness */
  font-weight: 600;
}
.trial-label {
  color: rgba(240, 237, 232, 0.6);  /* cream at 60% */
}
```

---

## 3. Usage Meter: Progress Bar Colors That Read Well on Dark

### Contrast Requirements

Progress bars on dark backgrounds need higher saturation and slightly lighter hues than
their light-theme equivalents. A `lime-500` bar on white has 4.5:1 contrast against the
white track. On a dark track (`#1E1D1C`), that same `lime-500` only achieves ~3:1 because
the bar luminance is lower than expected against deep blacks.

### Color System for Dark Usage Meters

| State | Track Color | Fill Color | Tailwind Fill | Hex |
|-------|------------|------------|---------------|-----|
| Normal (0-79%) | `#1E1D1C` | Violet | `bg-[#8B7AFF]` | #8B7AFF |
| Warning (80-99%) | `#1E1D1C` | Amber-300 | `bg-amber-300` | #FCD34D |
| Exceeded (100%) | `#1E1D1C` | Red-400 | `bg-red-400` | #F87171 |

Using the violet accent as the default fill (rather than green) keeps the meter on-brand.
Amber-300 (not amber-500) is necessary on dark because the 300 weight has enough
luminance to pop against the dark track. Red-400 for the same reason.

### Component Pattern

```tsx
<div>
  <div className="flex items-center justify-between mb-1.5">
    <span className="text-sm font-medium text-[#F0EDE8]/70">{display_name}</span>
    <span className="text-sm text-[#F0EDE8]/50 tabular-nums">
      {current} of {limit} used
    </span>
  </div>
  <div className="h-2 rounded-full bg-[#1E1D1C] overflow-hidden">
    <motion.div
      className={cn(
        'h-full rounded-full',
        exceeded ? 'bg-red-400' : warning ? 'bg-amber-300' : 'bg-[#8B7AFF]'
      )}
      initial={{ width: 0 }}
      animate={{ width: `${pct}%` }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
    />
  </div>
</div>
```

### Glow Effect for High Usage

When usage exceeds 80%, add a subtle glow to the progress bar that implies heat:

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

## 4. Upgrade Flow: Pricing Modal vs Redirect

### Modal Approach (Recommended for Dark Luxury)

A full-page redirect to `/pricing` breaks immersion. On dark luxury interfaces, the
pricing decision should happen within the environment the user is already in. The modal
approach keeps the user's context visible (blurred) behind the pricing table, reducing
the perceived friction of the decision.

**Arc Browser, Raycast, Warp:** All use in-app modals for their upgrade flow rather than
separate pricing pages. The modal has a higher conversion ceiling because the user does
not experience a navigation event that triggers "I can come back to this later" thinking.

### Animation Between States

The upgrade modal should have three animated states:

```
State 1: Plan Selection (monthly/annual toggle, feature comparison)
    |
    v  (user clicks "Upgrade")
State 2: Loading / Redirect Prep (violet shimmer, "Preparing checkout...")
    |
    v  (Stripe session created)
State 3: Redirect to Stripe Checkout
```

```tsx
const SPRING = { type: 'spring', stiffness: 300, damping: 30 }

{/* Animated state transition */}
<AnimatePresence mode="wait">
  {step === 'plans' && (
    <motion.div
      key="plans"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={SPRING}
    >
      <PricingTable />
    </motion.div>
  )}
  {step === 'loading' && (
    <motion.div
      key="loading"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center py-12"
    >
      {/* Violet pulse ring */}
      <div className="relative w-16 h-16">
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-[#8B7AFF]"
          animate={{ scale: [1, 1.4], opacity: [0.6, 0] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
        <div className="w-16 h-16 rounded-full bg-[#8B7AFF]/10
          flex items-center justify-center">
          <Sparkles size={24} className="text-[#8B7AFF]" />
        </div>
      </div>
      <p className="text-sm text-[#F0EDE8]/60 mt-4">
        Preparing secure checkout...
      </p>
    </motion.div>
  )}
</AnimatePresence>
```

### Pricing Card Styling on Dark

The "recommended" plan card on dark should use an elevated border treatment rather than
a colored background fill (which flattens on dark):

```tsx
{/* Pro card -- highlighted */}
<div className="relative rounded-xl p-6
  bg-[#161514] border border-[#8B7AFF]/30
  shadow-[0_0_20px_rgba(139,122,255,0.08)]">
  {/* "Most popular" label */}
  <span className="absolute -top-3 left-1/2 -translate-x-1/2
    bg-[#8B7AFF] text-white text-[10px] font-bold uppercase
    tracking-[0.08em] px-3 py-1 rounded-full">
    Most popular
  </span>
  {/* Price */}
  <p className="text-kpi font-bold text-[#F0EDE8] tabular-nums mt-3">
    $55<span className="text-sm font-normal text-[#F0EDE8]/40">/mo</span>
  </p>
</div>

{/* Free card -- subdued */}
<div className="rounded-xl p-6
  bg-[#0C0B0A] border border-white/[0.06]">
  {/* ... */}
</div>
```

---

## 5. Success Celebration: Confetti Colors on Dark Background

### Color Selection for Dark Confetti

On white backgrounds, any saturated color works for confetti. On dark backgrounds,
low-luminance colors (dark reds, dark greens) become invisible. The confetti palette
must be exclusively mid-to-high luminance.

**Recommended palette for `#0C0B0A` background:**

```typescript
const DARK_CONFETTI_COLORS = [
  '#8B7AFF',  // violet accent (brand)
  '#A094FF',  // violet light
  '#C4B5FD',  // violet-300
  '#F0EDE8',  // cream (text color -- reads as "gold/silver" in confetti)
  '#FCD34D',  // amber-300 (warm sparkle)
  '#67E8F9',  // cyan-300 (cool sparkle)
  '#F9A8D4',  // pink-300 (variety)
]
```

Avoid: any color below luminance 0.3 (dark green, dark blue, dark red). These vanish
against `#0C0B0A`. Also avoid pure white (`#FFFFFF`) -- it creates harsh optical flash
on dark. The cream `#F0EDE8` is softer and on-brand.

### Canvas Rendering Adjustment

Confetti particles on dark need slightly larger minimum size (4px vs 3px) because small
dark-background particles lose visual weight. Add a subtle glow via `ctx.shadowBlur`:

```typescript
// Inside animation loop
ctx.save()
ctx.translate(p.x, p.y)
ctx.rotate(p.rotation)
ctx.fillStyle = p.color
ctx.shadowColor = p.color
ctx.shadowBlur = 3 // subtle halo -- only visible on dark
ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
ctx.restore()
```

### Success Modal on Dark

```tsx
<motion.div className="fixed inset-0 z-50 flex items-center justify-center
  bg-[#0C0B0A]/85 backdrop-blur-sm">
  <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

  <motion.div className="relative z-10 w-full max-w-md
    bg-[#161514] border border-white/[0.06]
    rounded-xl shadow-2xl shadow-black/50 p-8 mx-4">

    {/* Animated checkmark with violet glow */}
    <div className="mx-auto w-16 h-16 rounded-full
      bg-[#8B7AFF]/15 ring-1 ring-[#8B7AFF]/20
      flex items-center justify-center mb-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}>
        <Check size={32} className="text-[#8B7AFF]" strokeWidth={3} />
      </motion.div>
    </div>

    <h2 className="text-2xl font-bold text-[#F0EDE8] text-center">
      Welcome to Pro
    </h2>
    <p className="text-base text-[#F0EDE8]/50 text-center mt-2">
      You now have full access to every Parcel feature.
    </p>

    <button className="w-full h-11 rounded-lg mt-6
      bg-[#8B7AFF] hover:bg-[#7B6AEF]
      text-white text-sm font-medium transition-colors">
      Start Analyzing Deals
    </button>
  </motion.div>
</motion.div>
```

---

## 6. Cancel Flow on Dark: Premium Cancellation Experience

### Philosophy

Luxury products do not guilt-trip users into staying. The cancellation flow should feel
respectful, smooth, and even slightly melancholic -- like checking out of a fine hotel.
Dark themes amplify emotional tone, so aggressive retention tactics (blinking warnings,
red text, loss-framing) feel even more manipulative on dark than on light.

### Step Styling

**Reason Survey:** Radio options on dark should use `ring-1 ring-white/[0.08]` borders
with a violet fill on selection (`bg-[#8B7AFF]/10 ring-[#8B7AFF]/30`). Avoid checkboxes
with stark white backgrounds -- they create harsh contrast flashes.

```tsx
{/* Cancel reason option */}
<label className={cn(
  'flex items-center gap-3 p-3 rounded-lg cursor-pointer',
  'ring-1 transition-all duration-150',
  selected
    ? 'ring-[#8B7AFF]/30 bg-[#8B7AFF]/[0.06]'
    : 'ring-white/[0.06] hover:ring-white/[0.1] hover:bg-white/[0.02]'
)}>
  <div className={cn(
    'w-4 h-4 rounded-full border-2 flex items-center justify-center',
    selected ? 'border-[#8B7AFF]' : 'border-white/20'
  )}>
    {selected && <div className="w-2 h-2 rounded-full bg-[#8B7AFF]" />}
  </div>
  <span className="text-sm text-[#F0EDE8]/80">{reason}</span>
</label>
```

**Save Offer Card:** When presenting a retention offer (discount, pause), use a card
with a violet gradient top border rather than a full background color:

```tsx
<div className="rounded-xl overflow-hidden">
  {/* Gradient accent top bar */}
  <div className="h-1 bg-gradient-to-r from-[#8B7AFF] to-[#67E8F9]" />
  <div className="bg-[#161514] border border-white/[0.06] border-t-0 p-5">
    <p className="text-sm font-medium text-[#F0EDE8]">
      Stay with 20% off your next 3 months
    </p>
    <p className="text-xs text-[#F0EDE8]/40 mt-1">
      That's $44/mo instead of $55/mo, billed annually.
    </p>
    <div className="flex gap-3 mt-4">
      <button className="flex-1 h-9 rounded-lg bg-[#8B7AFF] text-white text-sm">
        Accept offer
      </button>
      <button className="flex-1 h-9 rounded-lg
        ring-1 ring-white/[0.08] text-[#F0EDE8]/60 text-sm">
        Continue canceling
      </button>
    </div>
  </div>
</div>
```

**Final Confirmation:** Use a destructive button with restrained styling. On dark, red
buttons should be `bg-red-500/20 text-red-400 hover:bg-red-500/30` rather than a
fully-filled `bg-red-600`. The translucent treatment feels less hostile.

```tsx
<button className="w-full h-11 rounded-lg
  bg-red-500/15 hover:bg-red-500/25
  text-red-400 text-sm font-medium
  ring-1 ring-red-500/20
  transition-colors">
  Cancel my subscription
</button>
```

---

## 7. Plan Badge Styling: "PRO" Badge That Feels Exclusive

### On Dark Surfaces

The current light-theme badge uses `bg-lime-700 text-white`. On dark, a solid-fill badge
can look flat and cheap. Premium dark interfaces prefer translucent badges with a hint of
glow.

### Badge Variants

```tsx
{/* PRO badge -- sidebar, dark */}
<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md
  bg-[#8B7AFF]/15 text-[#A094FF] ring-1 ring-[#8B7AFF]/20
  text-[11px] font-semibold uppercase tracking-wide">
  Pro
</span>

{/* TRIAL badge -- sidebar, dark */}
<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md
  bg-[#8B7AFF]/[0.06] text-[#8B7AFF]/70 ring-1 ring-[#8B7AFF]/10
  text-[11px] font-semibold uppercase tracking-wide">
  Trial
</span>

{/* FREE badge -- sidebar, dark (intentionally subdued) */}
<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md
  bg-white/[0.04] text-[#F0EDE8]/40 ring-1 ring-white/[0.06]
  text-[11px] font-semibold uppercase tracking-wide">
  Free
</span>
```

**Arc, Raycast, Warp pattern:** "PRO" badges on dark use the brand accent at 10-15%
opacity for background and 100% for text, with a 1px ring at 20% opacity. This creates
a "glowing from within" effect that signals premium status without a harsh solid block.

### Animated Upgrade Shimmer (Optional)

For the Free badge, add a subtle shimmer animation that hints at "upgrade available":

```tsx
<span className="relative overflow-hidden ...">
  Free
  <motion.div
    className="absolute inset-0 bg-gradient-to-r
      from-transparent via-white/[0.04] to-transparent"
    animate={{ x: ['-100%', '200%'] }}
    transition={{ duration: 3, repeat: Infinity, repeatDelay: 5 }}
  />
</span>
```

---

## 8. Limit Reached Modal: Empathetic but Firm

### Tone on Dark

Dark luxury contexts amplify emotional weight. A harsh "You've run out!" feels punitive.
The language should be empathetic ("You've used all 5 analyses this month") and the
visual treatment should suggest opportunity rather than punishment.

### Design Pattern

Replace the warning triangle icon (which implies "error") with a meter or chart icon
(which implies "growth"). The icon container uses violet instead of amber:

```tsx
<motion.div className="relative z-10 w-full max-w-sm
  bg-[#161514] border border-white/[0.06]
  rounded-xl shadow-2xl shadow-black/40 p-6 mx-4">

  {/* Icon -- growth-oriented, not warning */}
  <div className="mx-auto w-12 h-12 rounded-xl
    bg-[#8B7AFF]/10 ring-1 ring-[#8B7AFF]/20
    flex items-center justify-center mb-4">
    <BarChart3 size={24} className="text-[#8B7AFF]" />
  </div>

  <h3 className="text-lg font-semibold text-[#F0EDE8] text-center">
    You've hit your analysis limit
  </h3>
  <p className="text-sm text-[#F0EDE8]/50 text-center mt-2 mb-5">
    You've used all 5 free analyses this month.
    Upgrade to Pro for unlimited access.
  </p>

  {/* Usage meter -- embedded */}
  <div className="mb-5">
    <UsageMeter metric={metric} />
  </div>

  {/* Primary CTA */}
  <button className="w-full h-11 rounded-lg
    bg-[#8B7AFF] hover:bg-[#7B6AEF]
    text-white text-sm font-medium transition-colors">
    Upgrade to Pro
  </button>

  {/* Dismiss -- low contrast, not guilt-laden */}
  <button className="w-full mt-3 text-sm
    text-[#F0EDE8]/30 hover:text-[#F0EDE8]/50
    transition-colors cursor-pointer py-1">
    Maybe later
  </button>
</motion.div>
```

### Micro-Interaction

When the modal appears, animate the usage meter from 0% to 100% with a slight overshoot
(spring stiffness 250, damping 20). This visual "filling up" reinforces the message
kinetically without aggressive text.

---

## 9. Stripe Checkout Redirect: Dark-to-Stripe Transition

### The Problem

Stripe Checkout is a white/light page. Redirecting from a `#0C0B0A` dark environment to
Stripe's bright white interface creates a jarring optical flash, especially in dark rooms
or at night. This is both uncomfortable and slightly undermines the premium feel.

### Transition Pattern

Insert a 400-600ms transition overlay before `window.location.href` redirects:

```tsx
const handleCheckout = async () => {
  setStep('loading')
  const { checkout_url } = await createCheckoutSession(...)

  // Phase 1: fade to neutral dark
  setStep('transitioning')

  // Phase 2: after animation completes, redirect
  setTimeout(() => {
    window.location.href = checkout_url
  }, 500)
}
```

```tsx
{step === 'transitioning' && (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="fixed inset-0 z-[60] bg-[#0C0B0A] flex items-center justify-center"
  >
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.15 }}
      className="flex flex-col items-center gap-3"
    >
      {/* Stripe wordmark or lock icon */}
      <Lock size={20} className="text-[#F0EDE8]/40" />
      <p className="text-sm text-[#F0EDE8]/40">
        Redirecting to secure checkout...
      </p>
      {/* Animated dots */}
      <div className="flex gap-1.5">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-[#8B7AFF]"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </motion.div>
  </motion.div>
)}
```

### Return Transition

When the user returns from Stripe (success or cancel), the `?billing=success` or
`?billing=canceled` query param triggers either the success overlay or a gentle
"welcome back" fade-in. The key is that the dark interface re-establishes itself before
any content appears, preventing a white-to-dark flash.

---

## 10. Invoice / Receipt Display on Dark

### Table Styling

Invoice tables on dark must avoid the "spreadsheet on dark mode" look. Use extremely
subtle row striping and thin dividers:

```tsx
<div className="rounded-xl border border-white/[0.06] overflow-hidden">
  <table className="w-full">
    <thead>
      <tr className="border-b border-white/[0.06]">
        <th className="text-left text-xs font-medium text-[#F0EDE8]/40
          uppercase tracking-wider px-4 py-3">
          Date
        </th>
        <th className="text-left text-xs font-medium text-[#F0EDE8]/40
          uppercase tracking-wider px-4 py-3">
          Description
        </th>
        <th className="text-right text-xs font-medium text-[#F0EDE8]/40
          uppercase tracking-wider px-4 py-3">
          Amount
        </th>
        <th className="text-right text-xs font-medium text-[#F0EDE8]/40
          uppercase tracking-wider px-4 py-3">
          Status
        </th>
      </tr>
    </thead>
    <tbody>
      {invoices.map((inv, i) => (
        <tr key={inv.id}
          className={cn(
            'border-b border-white/[0.03] last:border-0',
            i % 2 === 1 && 'bg-white/[0.015]'
          )}>
          <td className="px-4 py-3 text-sm text-[#F0EDE8]/60 tabular-nums">
            {formatDate(inv.date)}
          </td>
          <td className="px-4 py-3 text-sm text-[#F0EDE8]/80">
            {inv.description}
          </td>
          <td className="px-4 py-3 text-sm text-[#F0EDE8] text-right tabular-nums font-medium">
            ${(inv.amount_cents / 100).toFixed(2)}
          </td>
          <td className="px-4 py-3 text-right">
            <InvoiceStatusBadge status={inv.status} />
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

### Invoice Status Badges

```tsx
function InvoiceStatusBadge({ status }: { status: Invoice['status'] }) {
  const styles = {
    paid: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
    open: 'bg-amber-500/10 text-amber-400 ring-amber-500/20',
    void: 'bg-white/[0.04] text-[#F0EDE8]/30 ring-white/[0.06]',
    uncollectible: 'bg-red-500/10 text-red-400 ring-red-500/20',
  }

  return (
    <span className={cn(
      'inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium ring-1',
      styles[status]
    )}>
      {status === 'paid' ? 'Paid' : status === 'open' ? 'Open' : status === 'void' ? 'Void' : 'Failed'}
    </span>
  )
}
```

### Amount Formatting

Financial amounts on dark benefit from higher font weight (600-700 vs 400-500) and full
cream color at 100% opacity. The numbers are the primary information; everything else in
the row should be at 50-80% opacity. This creates a clear visual hierarchy where amounts
"float" above the supporting metadata.

---

## RECOMMENDATIONS FOR PARCEL

1. **Adopt the saturated blur paywall overlay.** The current `PaywallOverlay.tsx` uses
   `via-white/60 to-white/95` which is light-theme only. For a dark variant, use
   `bg-[#0C0B0A]/80 backdrop-blur-xl backdrop-saturate-150` with a radial vignette. This
   is the single most visible billing component and sets the tone for the entire upgrade
   experience. Priority: critical.

2. **Use the three-tier urgency system for trial banners.** The current `TrialBanner.tsx`
   has two tiers (normal/urgent at 3 days). Add a calm violet tier for days 7-4 that uses
   the brand accent instead of lime/amber. This prevents banner blindness by introducing
   urgency gradually. Priority: high.

3. **Switch usage meter fill to violet accent.** The current `UsageMeter.tsx` uses
   `bg-lime-500` which will be invisible on a dark track. Use `bg-[#8B7AFF]` as the
   default fill, `bg-amber-300` for warning, and `bg-red-400` for exceeded. Add a subtle
   glow (`box-shadow`) at the warning threshold. Priority: high.

4. **Add a Stripe redirect transition.** Insert a 400-500ms full-screen dark overlay with
   animated loading dots before `window.location.href` fires. This prevents the jarring
   dark-to-white flash and maintains premium feel through the checkout handoff. Priority:
   high.

5. **Redesign the plan badge for dark with translucent treatment.** Replace solid
   `bg-lime-700 text-white` with `bg-[#8B7AFF]/15 text-[#A094FF] ring-1 ring-[#8B7AFF]/20`.
   The translucent-with-ring pattern reads as more premium on dark surfaces than solid fills.
   Priority: medium.

6. **Use growth-oriented iconography in the limit modal.** Replace `AlertTriangle` with
   `BarChart3` or `TrendingUp` in `LimitReachedModal.tsx`. On dark, warning icons trigger
   error associations. A growth icon reframes the limit as an opportunity to scale up rather
   than a punishment. Priority: medium.

7. **Adjust confetti colors for dark backgrounds.** The current `SuccessOverlay.tsx` uses
   lime/yellow/sky colors calibrated for white. Swap to the violet-anchored palette
   (`#8B7AFF`, `#A094FF`, `#C4B5FD`, `#F0EDE8`, `#FCD34D`, `#67E8F9`, `#F9A8D4`). Add
   `ctx.shadowBlur = 3` for particle glow. Increase minimum particle size from 3px to 4px.
   Priority: medium.

8. **Style the cancellation flow with restrained destructive buttons.** Use translucent
   `bg-red-500/15 text-red-400` instead of solid `bg-red-600 text-white`. On dark, solid
   red buttons feel aggressive. The translucent variant communicates "destructive action"
   without hostility. Priority: medium.

9. **Use translucent status badges for invoices.** Follow the pattern of
   `bg-{color}-500/10 text-{color}-400 ring-1 ring-{color}-500/20` for all invoice status
   badges. This is consistent with the plan badge treatment and the overall dark design
   language of translucent colored surfaces. Priority: low.

10. **Default all dark financial text to tabular-nums at 100% cream.** Amounts should be
    the brightest element in any row or card, using `text-[#F0EDE8] font-semibold
    tabular-nums`. Labels and metadata sit at 40-60% opacity. This hierarchy principle
    should be applied globally across billing settings, invoice tables, and pricing cards.
    Priority: low.
