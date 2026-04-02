# Agent 10 -- Pricing Page Design Spec (Dark Luxury)

> Transforms the current light pricing page (`PricingPage.tsx`) and landing pricing
> section (`pricing.tsx`) into a dark luxury experience. Two tiers live (Free + Pro),
> Team card shown as "Coming Soon" at reduced opacity. All colors, spacing, and
> Tailwind classes are implementation-ready.

---

## 1. Page Layout

**Container:** `max-w-5xl mx-auto px-6 pb-20` -- same max-width as current, generous
bottom padding for the final CTA to breathe.

**Background:** Page inherits the global `bg-[#0C0B0A]`. No section-level background
overrides -- the dark canvas is unbroken.

**Headline:**
```tsx
<h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#F0EDE8]">
  Five free analyses. Upgrade when you close.
</h1>
```

**Subheadline:**
```tsx
<p className="text-sm text-white/50 max-w-md mx-auto">
  No annual contracts. No per-deal fees. Cancel any time.
</p>
```

**Eyebrow (landing section only):**
```tsx
<p className="text-[10px] uppercase tracking-[0.08em] text-[#8B7AFF] font-semibold">
  Pricing
</p>
```

**Vertical rhythm:** `space-y-14` between header, toggle, cards, comparison, FAQ, and
bottom CTA. Header block itself uses `space-y-4 text-center`.

---

## 2. Monthly/Annual Toggle

Pill toggle centered below headline. Violet active segment instead of the current
lime-on-white.

```tsx
<div className="flex justify-center">
  <div className="inline-flex rounded-lg bg-white/[0.06] p-1 relative">
    {/* Monthly button */}
    <button
      type="button"
      onClick={() => setInterval('monthly')}
      className={cn(
        'relative z-10 px-5 py-2 rounded-md text-sm font-medium transition-colors duration-150',
        interval === 'monthly' ? 'text-[#F0EDE8]' : 'text-white/50 hover:text-white/70',
      )}
    >
      Monthly
    </button>

    {/* Annual button */}
    <button
      type="button"
      onClick={() => setInterval('annual')}
      className={cn(
        'relative z-10 px-5 py-2 rounded-md text-sm font-medium transition-colors duration-150 inline-flex items-center gap-2',
        interval === 'annual' ? 'text-[#F0EDE8]' : 'text-white/50 hover:text-white/70',
      )}
    >
      Annual
      <span className="text-[10px] font-bold uppercase tracking-wider bg-[#8B7AFF]/15 text-[#8B7AFF] px-2 py-0.5 rounded-full">
        Save 17%
      </span>
    </button>

    {/* Animated active pill -- violet tinted glass */}
    <motion.div
      layoutId="billing-toggle-pill"
      className="absolute top-1 bottom-1 rounded-md bg-[#8B7AFF]/15 border border-[#8B7AFF]/20"
      style={{
        left: interval === 'monthly' ? '4px' : undefined,
        right: interval === 'annual' ? '4px' : undefined,
        width: 'calc(50% - 4px)',
      }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    />
  </div>
</div>
```

**Key change from current:** Active segment uses `bg-[#8B7AFF]/15 border border-[#8B7AFF]/20`
(violet tinted glass) instead of solid white. The "Save" badge swaps from sky/lime to
violet monochrome.

---

## 3. Card Differentiation -- 5 Layers

The Pro card uses all 5 layers; Free uses none; Team uses only Layer 1 at reduced opacity.

| Layer | Free | Pro | Team |
|-------|------|-----|------|
| 1. Surface elevation | `bg-white/[0.03] border border-white/[0.06]` | `bg-white/[0.05] border border-[#8B7AFF]/20` | `bg-white/[0.02] border border-white/[0.04]` |
| 2. Crown gradient | none | `h-px bg-gradient-to-r from-transparent via-[#8B7AFF] to-transparent` | none |
| 3. Ambient glow | none | `shadow-[0_0_60px_10px_rgba(139,122,255,0.06),0_0_120px_40px_rgba(139,122,255,0.03)]` | none |
| 4. Vertical scale | `p-6` | `p-6 lg:py-8` (taller) | `p-6` |
| 5. Text brightness | checkmarks `text-white/40` | checkmarks `text-[#8B7AFF]` | checkmarks `text-white/20` |

**Card grid:**
```tsx
<motion.div
  variants={staggerContainer}
  initial="hidden"
  animate="visible"
  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
>
```

All cards use `rounded-2xl` (up from `rounded-lg`) for the luxury feel. Overflow hidden
on all cards to clip the crown gradient.

---

## 4. Free Card

Understated, monochromatic. No color anywhere -- pure white at varying opacities.

```tsx
<motion.div
  variants={staggerItem}
  className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 flex flex-col
    order-2 md:order-1 overflow-hidden"
>
  <div className="space-y-4 flex-1">
    <div>
      <h3 className="text-lg font-semibold text-[#F0EDE8]">Free</h3>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-5xl font-light tracking-tight text-[#F0EDE8] tabular-nums">$0</span>
        <span className="text-sm font-normal text-white/40 ml-1">/mo</span>
      </div>
      <p className="mt-2 text-sm text-white/40">Explore deal analysis basics</p>
    </div>

    <ul className="space-y-3">
      {FREE_FEATURES.map((f) => (
        <li key={f} className="flex items-start gap-2.5 text-sm text-white/50">
          <Check size={14} className="text-white/40 mt-0.5 shrink-0" />
          {f}
        </li>
      ))}
    </ul>
  </div>

  {/* Ghost CTA */}
  <div className="mt-6">
    <button className="w-full h-12 rounded-lg text-sm font-medium
      bg-transparent border border-white/[0.12] text-white/60
      hover:text-white/80 hover:border-white/[0.20] hover:bg-white/[0.04]
      transition-all duration-200">
      Start Free
    </button>
  </div>
</motion.div>
```

**Current plan state** (if user is on Free): Replace button with
`className="w-full h-12 rounded-lg text-sm font-medium bg-white/[0.04] text-white/30 cursor-default"`
and label "Current Plan".

---

## 5. Pro Card (Featured)

All 5 differentiation layers active. This is the visual focal point of the page.

```tsx
<motion.div
  variants={staggerItem}
  className="relative bg-white/[0.05] border border-[#8B7AFF]/20 rounded-2xl p-6 lg:py-8
    flex flex-col order-1 md:order-2 overflow-hidden
    shadow-[0_0_60px_10px_rgba(139,122,255,0.06),0_0_120px_40px_rgba(139,122,255,0.03)]"
>
  {/* Layer 2: Crown gradient line */}
  <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#8B7AFF] to-transparent" />

  {/* Most Popular badge */}
  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
    <span className="bg-[#8B7AFF] text-white text-[11px] font-semibold px-3 py-1 rounded-full
      shadow-[0_0_12px_rgba(139,122,255,0.3)] whitespace-nowrap inline-flex items-center gap-1.5">
      <Sparkles size={11} /> Most Popular
    </span>
  </div>

  <div className="space-y-4 flex-1">
    <div>
      <h3 className="text-lg font-semibold text-[#F0EDE8]">Pro</h3>

      {/* Price display with animation */}
      <div className="mt-2 flex items-baseline gap-1">
        <AnimatePresence mode="wait">
          <motion.span
            key={interval}
            initial={{ opacity: 0, y: -10, color: '#8B7AFF' }}
            animate={{ opacity: 1, y: 0, color: '#F0EDE8' }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.25 }}
            className="text-5xl font-light tracking-tight tabular-nums"
          >
            {interval === 'annual' ? '$24' : '$29'}
          </motion.span>
        </AnimatePresence>
        <span className="text-sm font-normal text-white/40 ml-1">/mo</span>
        {interval === 'annual' && (
          <span className="text-lg font-light text-white/30 line-through tabular-nums ml-2">$29</span>
        )}
      </div>

      {/* Annual billing note + savings callout */}
      {interval === 'annual' ? (
        <div className="mt-1 space-y-0.5">
          <p className="text-xs text-[#8B7AFF]">Save $58 per year</p>
          <p className="text-[11px] text-white/30">Billed as $290/year</p>
        </div>
      ) : (
        <p className="mt-2 text-sm text-white/50">
          Everything you need to analyze deals with confidence
        </p>
      )}
    </div>

    <ul className="space-y-3">
      {PRO_FEATURES.map((f) => (
        <li key={f} className="flex items-start gap-2.5 text-sm text-white/60">
          <Check size={14} className="text-[#8B7AFF] mt-0.5 shrink-0" />
          {f}
        </li>
      ))}
    </ul>
  </div>

  {/* Gradient CTA */}
  <div className="mt-6">
    <motion.button
      whileHover={{ scale: 1.01, y: -1 }}
      whileTap={{ scale: 0.98 }}
      className="w-full h-12 rounded-lg text-sm font-semibold text-white
        bg-gradient-to-r from-[#8B7AFF] to-[#6C5CE7]
        hover:from-[#9B8CFF] hover:to-[#7C6DF7]
        shadow-[0_0_20px_rgba(139,122,255,0.15)]
        hover:shadow-[0_0_30px_rgba(139,122,255,0.25)]
        transition-all duration-200"
    >
      Start 7-Day Free Trial
    </motion.button>
  </div>
</motion.div>
```

**Current plan state** (if user is Pro active/trialing): Replace CTA with
"Manage Subscription" in `bg-white/[0.06] text-[#F0EDE8] border border-white/[0.10]`
style, no gradient.

---

## 6. Price Display

Applies to all cards. Thin weight + large size = perceived luxury.

```
Font:    Inter (tabular-nums)
Weight:  font-light (300)
Size:    text-5xl
Color:   #F0EDE8 (cream, not pure white)
Period:  text-sm font-normal text-white/40 ml-1
```

**Full class string for price number:**
```
className="text-5xl font-light tracking-tight text-[#F0EDE8] tabular-nums"
```

**Superscript period treatment:**
```tsx
<span className="text-sm font-normal text-white/40 ml-1">/mo</span>
```

**Animation on toggle change (Pro card only):**
Price flashes violet on entry (`color: '#8B7AFF'`) then settles to cream over 250ms.
This draws attention to the savings without being disruptive.

---

## 7. Feature Comparison Table

Placed below cards. Full-width within `max-w-5xl`. Two-column comparison (Free vs Pro).

```tsx
<div className="border border-white/[0.06] rounded-2xl overflow-hidden">
  {/* Table header */}
  <div className="grid grid-cols-3 bg-white/[0.03]">
    <div className="p-4 text-sm font-medium text-white/50">Features</div>
    <div className="p-4 text-sm font-medium text-white/50 text-center">Free</div>
    <div className="p-4 text-sm font-medium text-[#8B7AFF] text-center">Pro</div>
  </div>

  {/* Category header */}
  <div className="bg-white/[0.04] px-4 py-2">
    <span className="text-xs uppercase tracking-wider text-white/30 font-medium">Analysis</span>
  </div>

  {/* Feature rows */}
  {COMPARISON_ROWS.map((row, i) => (
    <div
      key={row.label}
      className={cn(
        'grid grid-cols-3 border-t border-white/[0.06]',
        i % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.02]',
      )}
    >
      <div className="p-4 text-sm text-white/50">{row.label}</div>
      <div className="p-4 flex justify-center">
        {row.free === true ? (
          <Check size={14} className="text-white/60" />
        ) : row.free === false ? (
          <span className="text-white/20 text-sm">--</span>
        ) : (
          <span className="text-white/50 text-sm tabular-nums">{row.free}</span>
        )}
      </div>
      <div className="p-4 flex justify-center">
        {row.pro === true ? (
          <Check size={14} className="text-[#8B7AFF]" />
        ) : (
          <span className="text-white/50 text-sm tabular-nums">{row.pro}</span>
        )}
      </div>
    </div>
  ))}
</div>
```

**Key rules:**
- Pro column header is the ONLY colored text in the table (`text-[#8B7AFF]`)
- Included features: checkmark icon. Pro = violet, Free = `white/60`
- Excluded features: `--` dash in `text-white/20` -- never a red X
- Quantified limits: `text-white/50 text-sm tabular-nums` (e.g., "5/mo", "25/mo")
- Alternating rows: `bg-white/[0.02]` on even rows, transparent on odd
- All borders: `border-white/[0.06]`

---

## 8. FAQ Accordion

Centered at `max-w-2xl mx-auto`. Dark dividers, cream text, violet chevron on open.

```tsx
<div className="max-w-2xl mx-auto">
  <h2 className="text-lg font-semibold text-[#F0EDE8] mb-6">
    Frequently Asked Questions
  </h2>

  <div className="border border-white/[0.06] rounded-2xl divide-y divide-white/[0.06] overflow-hidden">
    {FAQ_ITEMS.map((item) => (
      <FaqItem key={item.q} {...item} />
    ))}
  </div>
</div>
```

**FaqItem component:**
```tsx
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="px-6">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-4 text-left cursor-pointer group"
      >
        <span className="text-sm font-medium text-[#F0EDE8] pr-4 group-hover:text-white transition-colors">
          {q}
        </span>
        <ChevronDown
          size={16}
          className={cn(
            'shrink-0 transition-all duration-200',
            open ? 'rotate-180 text-[#8B7AFF]' : 'text-white/30',
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <p className="pb-4 text-sm text-white/50 leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
```

**Key rules:**
- Question text: `text-[#F0EDE8]` (cream) -- never pure white (prevents halation)
- Answer text: `text-white/50`
- Chevron closed: `text-white/30` | Chevron open: `text-[#8B7AFF]` + `rotate-180`
- Hover: `group-hover:text-white` on question only -- no background change
- No background changes on hover -- bg shifts in small containers create a cheap
  "flashing" effect on dark surfaces

---

## 9. Bottom CTA

Radial violet glow spotlight behind the section. Mirrors the Pro card's gradient CTA.

```tsx
<section className="relative py-20 overflow-hidden">
  {/* Violet radial glow */}
  <div
    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] pointer-events-none"
    style={{
      background: 'radial-gradient(ellipse, rgba(139,122,255,0.06) 0%, transparent 70%)',
      filter: 'blur(60px)',
    }}
  />

  <div className="relative z-10 max-w-xl mx-auto text-center space-y-6">
    <h2 className="text-2xl font-semibold text-[#F0EDE8]">
      Ready to analyze deals faster?
    </h2>
    <p className="text-sm text-white/50">
      Start with 5 free analyses. No credit card for your 7-day trial.
    </p>
    <motion.button
      whileHover={{ scale: 1.01, y: -1 }}
      whileTap={{ scale: 0.98 }}
      className="h-12 px-8 rounded-lg text-sm font-semibold text-white
        bg-gradient-to-r from-[#8B7AFF] to-[#6C5CE7]
        hover:from-[#9B8CFF] hover:to-[#7C6DF7]
        shadow-[0_0_20px_rgba(139,122,255,0.15)]
        hover:shadow-[0_0_30px_rgba(139,122,255,0.25)]
        transition-all duration-200"
    >
      Start 7-Day Free Trial
    </motion.button>
    <p className="text-xs text-white/40 inline-flex items-center gap-1.5">
      <Lock size={11} />
      No credit card required. Cancel anytime.
    </p>
  </div>
</section>
```

**Rules:**
- Trust line must be at least `text-white/40` with Lock icon -- risk of invisibility below `/30`
- Gradient CTA mirrors Pro card exactly (same classes)
- `py-20` breathing room -- generous spacing signals page culmination
- No background color on the section -- the radial glow IS the section's identity

---

## 10. Mobile Layout

**Breakpoint strategy:** Cards are `grid-cols-1` on mobile, `md:grid-cols-2`, `lg:grid-cols-3`.

**Pro first on mobile:** Pro card uses `order-1 md:order-2`, Free uses `order-2 md:order-1`,
Team uses `order-3`. This ensures Pro is the first thing mobile users see.

**Toggle:** Full-width on mobile via `inline-flex` auto-sizing. "Save" badge wraps
naturally. No breakpoint overrides needed.

**Comparison table:** On mobile (`< md`), hide the full table and show a simplified
stacked comparison instead:

```tsx
{/* Mobile comparison (visible < md) */}
<div className="md:hidden space-y-6">
  {['Free', 'Pro'].map((tier) => (
    <div key={tier} className="border border-white/[0.06] rounded-2xl p-4 space-y-3">
      <h3 className={cn(
        'text-sm font-semibold',
        tier === 'Pro' ? 'text-[#8B7AFF]' : 'text-white/50',
      )}>
        {tier}
      </h3>
      {COMPARISON_ROWS.map((row) => (
        <div key={row.label} className="flex items-center justify-between text-sm">
          <span className="text-white/50">{row.label}</span>
          <span className={cn(
            tier === 'Pro' ? 'text-[#8B7AFF]' : 'text-white/50',
          )}>
            {/* render check / dash / value */}
          </span>
        </div>
      ))}
    </div>
  ))}
</div>

{/* Desktop comparison (hidden < md) */}
<div className="hidden md:block">
  {/* ... full table from Section 7 ... */}
</div>
```

**FAQ:** Already responsive -- `max-w-2xl mx-auto` centers on desktop, fills width on mobile.

**Bottom CTA:** The 500x300 glow div scales fine on mobile. Button stays inline-sized
via `px-8`. Text stack uses `space-y-6` which is comfortable at all widths.

---

## Team Card (Coming Soon)

Third card, reduced opacity, no interactive elements.

```tsx
<motion.div
  variants={staggerItem}
  className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-6 flex flex-col
    opacity-50 order-3 overflow-hidden"
>
  <div className="space-y-4 flex-1">
    <div>
      <span className="text-[10px] font-bold uppercase tracking-wider bg-white/[0.06] text-white/40 px-2 py-0.5 rounded-full">
        Coming Soon
      </span>
      <h3 className="text-lg font-semibold text-white/40 mt-3">Team</h3>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-5xl font-light tracking-tight text-white/30 tabular-nums">$149</span>
        <span className="text-sm font-normal text-white/20 ml-1">/mo</span>
      </div>
      <p className="mt-2 text-sm text-white/30">Collaborate with your entire team</p>
    </div>

    <ul className="space-y-3">
      {TEAM_FEATURES.map((f) => (
        <li key={f} className="flex items-start gap-2.5 text-sm text-white/30">
          <Check size={14} className="text-white/20 mt-0.5 shrink-0" />
          {f}
        </li>
      ))}
    </ul>
  </div>

  <div className="mt-6">
    <button
      disabled
      className="w-full h-12 rounded-lg text-sm font-medium
        bg-transparent border border-white/[0.06] text-white/30 cursor-not-allowed"
    >
      Notify Me
    </button>
  </div>
</motion.div>
```

---

## Animation Variants (Unchanged Logic, Tuned Timing)

```tsx
const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] },
  },
}
```

No card hover lift on the pricing page (unlike landing cards). Pricing cards are
decision-heavy -- movement during comparison is distracting. Hover effects are
limited to CTA buttons.

---

## Color Token Summary

| Element | Current (Light) | New (Dark) |
|---------|-----------------|------------|
| Page bg | `bg-white` (AppShell) | `bg-[#0C0B0A]` |
| Card bg (Free) | `bg-white border-gray-200` | `bg-white/[0.03] border-white/[0.06]` |
| Card bg (Pro) | `bg-white border-lime-500` | `bg-white/[0.05] border-[#8B7AFF]/20` |
| Pro glow | `shadow-lime-700/5` | `shadow-[0_0_60px_10px_rgba(139,122,255,0.06)]` |
| Badge | `bg-lime-700 text-white` | `bg-[#8B7AFF] text-white shadow-glow` |
| Pro CTA | `bg-lime-700` | `bg-gradient-to-r from-[#8B7AFF] to-[#6C5CE7]` |
| Free CTA | `bg-white border-gray-300` | `bg-transparent border-white/[0.12]` |
| Toggle active | `bg-lime-700 text-white` | `bg-[#8B7AFF]/15 border-[#8B7AFF]/20 text-[#F0EDE8]` |
| Save badge | `bg-sky-100 text-sky-700` | `bg-[#8B7AFF]/15 text-[#8B7AFF]` |
| Checkmarks (Pro) | `text-lime-600` | `text-[#8B7AFF]` |
| Checkmarks (Free) | `text-gray-400` | `text-white/40` |
| Price text | `text-gray-900 font-bold` | `text-[#F0EDE8] font-light` |
| Feature text | `text-gray-600` | `text-white/50` (Free) / `text-white/60` (Pro) |
| FAQ question | `text-gray-900` | `text-[#F0EDE8]` |
| FAQ answer | `text-gray-500` | `text-white/50` |
| FAQ dividers | `border-gray-200` | `divide-white/[0.06]` |
| Bottom CTA bg | `bg-lime-50 border-lime-200` | transparent + radial violet glow |

---

## CRITICAL DECISIONS

1. **Gradient CTA only on Pro card.** The Free card gets a ghost button. This is the
   single strongest conversion lever -- gradient buttons on dark carry 3x visual weight.
   Giving both cards gradient CTAs would collapse the hierarchy.

2. **font-light (300) prices, not font-bold.** Thin numbers on dark = luxury. Bold
   numbers = utilitarian SaaS. This is the Stripe/Arc pattern. Text-5xl at weight 300
   requires Inter's tabular-nums to prevent number width jitter.

3. **No card hover lift on pricing page.** The landing section cards can lift on hover
   because they are browse-mode. The pricing page is decision-mode -- movement during
   comparison is cognitively expensive. Hover effects are CTA-only.

4. **Violet glow via box-shadow, not blurred div.** `shadow-[0_0_60px...]` is zero
   layout cost, composites on GPU, and requires no extra DOM nodes. The blurred div
   approach (from research) is reserved for the bottom CTA spotlight where we need
   more control over the shape.

5. **"Most Popular" as floating pill, not inline label.** The pricing page uses the
   floating pill with glow shadow (`shadow-[0_0_12px_rgba(139,122,255,0.3)]`) because
   it ties visually to the card's ambient glow. The landing section uses the inline
   label variant (`text-[10px] uppercase tracking-[0.1em]`) to save vertical space.

6. **Pro card first on mobile (order-1).** Mobile users see the Pro card immediately
   without scrolling past Free. The Free card becomes a "look down" discovery after
   the primary conversion opportunity.

7. **Triple-layer annual savings display.** Toggle badge ("Save 17%") + strikethrough
   monthly price on card + dollar callout ("Save $58 per year") in violet. Three
   touchpoints at three different scan depths. The billing transparency note
   ("Billed as $290/year") prevents checkout surprise.

8. **Comparison table hidden on mobile, replaced with stacked cards.** A 3-column table
   at 375px is unreadable. Mobile gets per-tier stacked blocks. Pro column header is
   violet in both views -- the only color in the table.

9. **No animation on "Most Popular" badge.** Research confirms animated badges feel
   desperate. The glow shadow alone ties the badge to the card's violet halo. Static
   confidence > kinetic desperation.

10. **FAQ: no background change on hover.** Background shifts in small containers create
    a cheap "flashing" effect on dark surfaces. The only hover feedback is
    `group-hover:text-white` on the question text -- subtle brightness increase.
