# Landing Page Design Spec — Luxury Dark Redesign

## Locked Design Tokens

| Token | Value | Tailwind |
|---|---|---|
| Background | `#0C0B0A` | `bg-[#0C0B0A]` |
| Text primary | `#F0EDE8` | `text-[#F0EDE8]` |
| Text muted | `#9CA3AF` | `text-gray-400` |
| Accent start | `#8B7AFF` | `text-[#8B7AFF]` |
| Accent end | `#6C5CE7` | `text-[#6C5CE7]` |
| Surface | `rgba(255,255,255,0.03)` | `bg-white/[0.03]` |
| Border | `rgba(255,255,255,0.06)` | `border-white/[0.06]` |
| Border hover | `rgba(255,255,255,0.10)` | `border-white/[0.10]` |
| Body text | `#D1D5DB` | `text-gray-300` |
| Tertiary text | `#6B7280` | `text-gray-500` |

**Accent gradient** for highlighted elements:
```
bg-gradient-to-r from-[#8B7AFF] to-[#6C5CE7]
```

**Vercel ease** (used everywhere): `[0.22, 1, 0.36, 1]`

---

## 1. Navbar

**Behavior:** Fixed `top-0 z-50`. Transparent at scroll position 0. After `scrollY > 60`, transitions to solid:

```tsx
// At rest (top of page)
className="fixed top-0 w-full z-50 bg-transparent transition-all duration-300"

// After 60px scroll
className="fixed top-0 w-full z-50 bg-[#0C0B0A]/80 backdrop-blur-xl border-b border-white/[0.06] transition-all duration-300"
```

**Layout:** `max-w-6xl mx-auto px-6 h-16 flex items-center justify-between`

**Logo:** Replace lime-700 bg with accent gradient. The "P" mark becomes:
```tsx
<div className="w-6 h-6 rounded bg-gradient-to-br from-[#8B7AFF] to-[#6C5CE7] flex items-center justify-center">
  <span className="text-[10px] font-bold text-white font-mono">P</span>
</div>
<span className="text-sm font-semibold text-[#F0EDE8] tracking-tight">Parcel</span>
```

**Nav links (center, hidden on mobile):**
```tsx
className="text-sm text-gray-500 hover:text-[#F0EDE8] transition-colors duration-150"
```

**CTAs (right):**
- Sign in: `text-sm text-gray-500 hover:text-[#F0EDE8] transition-colors duration-150`
- Get started (primary): `bg-[#F0EDE8] hover:bg-white text-[#0C0B0A] text-sm h-8 px-4 font-semibold rounded-lg` (inverted light-on-dark -- the brightest element)

**Focus rings:** Replace `ring-lime-500 ring-offset-white` with `ring-[#8B7AFF] ring-offset-[#0C0B0A]` globally across all landing components.

---

## 2. Hero

**Background treatment:** Remove dot grid. Remove 3 blur blobs. Replace with 2 radial gradients (cheaper to composite than filter blur):

```tsx
{/* Ambient glow — top-left */}
<div
  className="absolute top-0 left-[5%] w-[560px] h-[560px] pointer-events-none"
  style={{ background: 'radial-gradient(ellipse, rgba(139,122,255,0.08), transparent 70%)' }}
/>
{/* Ambient glow — mid-right */}
<div
  className="absolute top-[30%] right-[5%] w-[420px] h-[420px] pointer-events-none"
  style={{ background: 'radial-gradient(ellipse, rgba(108,92,231,0.06), transparent 70%)' }}
/>
```

**Vignette:** Update bottom fade from `from-[#F9FAFB]` to `from-[#0C0B0A]`.

**Badge (above headline):**
```tsx
className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#8B7AFF]/30 bg-[#8B7AFF]/10 text-[#8B7AFF] text-xs font-medium"
// Pulse dot: className="w-1.5 h-1.5 rounded-full bg-[#8B7AFF] animate-pulse"
```

**Headline:** Font-weight 300 (light), not bold. This is the Mercury/Linear approach -- large light text reads as luxury. Size via clamp, tracking -0.02em:

```tsx
<h1
  className="font-light text-[#F0EDE8] leading-[1.05] tracking-[-0.02em]"
  style={{ fontSize: 'clamp(48px, 7vw, 72px)' }}
>
  Close More Deals.
</h1>
<h1
  className="font-light leading-[1.05] tracking-[-0.02em] bg-gradient-to-r from-[#8B7AFF] to-[#6C5CE7] bg-clip-text text-transparent"
  style={{ fontSize: 'clamp(48px, 7vw, 72px)' }}
>
  Know Every Number.
</h1>
```

**Subheadline:**
```tsx
className="text-base text-gray-400 max-w-md leading-relaxed"
```
Uses `text-gray-400` (#9CA3AF) for muted body text against dark background.

**CTAs — inverted primary pattern:**
```tsx
{/* Primary: light fill, dark text — brightest element above fold */}
<Button className="bg-[#F0EDE8] hover:bg-white text-[#0C0B0A] h-11 px-6 text-sm font-semibold transition-colors duration-150">
  Get Started Free
  <ArrowRight size={14} className="ml-1.5" />
</Button>

{/* Secondary: ghost with border */}
<button className="h-11 px-6 text-sm text-gray-300 border border-white/[0.12] hover:border-white/[0.20] rounded-lg transition-colors duration-150 font-medium">
  View demo
</button>
```

**Trust badges:** Update text to `text-gray-500`, badges to `bg-white/[0.04] border-white/[0.06]`.

**Animation timings (unchanged structure, updated ease):**
- Badge: `duration: 0.4, ease: [0.22, 1, 0.36, 1]`
- Headline: `duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1]`
- Subhead: `duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1]`
- CTAs: `duration: 0.5, delay: 0.3, ease: [0.22, 1, 0.36, 1]`
- Demo card: `duration: 0.6, delay: 0.55, ease: [0.22, 1, 0.36, 1]`

---

## 3. Social Proof (Ticker)

The existing ticker shows deal data as strategy-colored badges. On dark, those saturated badge colors (amber, violet, blue, green, rose) pop without modification.

**Ticker container:** Remove any light bg. Use transparent with `border-y border-white/[0.06]`.

**Deal chips:**
```tsx
// Strategy badges retain their existing STRATEGY_COLORS map -- high saturation works on dark.
// City text: text-gray-400
// Metric text: text-[#F0EDE8]
```

**Future: Logo strip.** If adding partner/press logos, use monochrome treatment:
```tsx
<img src="/logo.svg" className="h-6 opacity-40 brightness-0 invert" />
// Staggered fade-in: delay each logo 50ms apart
```

---

## 4. Features Bento

**Section header:**
```tsx
// Label
className="text-[10px] uppercase tracking-[0.08em] text-[#8B7AFF] font-semibold"
// Heading
className="text-4xl font-semibold tracking-tight text-[#F0EDE8]"
// Description
className="text-sm text-gray-400 max-w-md leading-relaxed"
```

**Card base (all cards):**
```tsx
className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 space-y-5 relative overflow-hidden
           hover:bg-white/[0.05] hover:border-white/[0.10] transition-colors duration-300 cursor-default"
```

**Card accent line (top):** Replace `via-lime-400/40` with accent gradient:
```tsx
<div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#8B7AFF]/40 to-transparent" />
```

**Icon containers:** Replace lime/indigo/sky-50 backgrounds with subtle dark surfaces:
```tsx
// Calculator icon box
className="w-9 h-9 rounded-xl bg-[#8B7AFF]/10 border border-[#8B7AFF]/20 flex items-center justify-center"
// Icon: className="text-[#8B7AFF]"

// Document icon box
className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center"
// Icon: className="text-indigo-400"

// Pipeline icon box
className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center"
// Icon: className="text-sky-400"
```

**Card text:**
- Titles: `text-[#F0EDE8] font-semibold`
- Descriptions: `text-xs text-gray-400 leading-relaxed`

**KPI mockup cells (inside multi-strategy card):**
```tsx
className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.06] space-y-1"
// Label: text-[10px] uppercase tracking-[0.08em] text-gray-500
// Value: text-base font-semibold leading-none tabular-nums (keep original sky/gray colors -- they have sufficient contrast on dark)
```

**Mini doc list items:**
```tsx
className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06] gap-2"
// Filename: text-[10px] text-gray-500 font-mono
// Status dots: keep original colors (sky, amber, indigo) -- high contrast on dark
```

**Mini Kanban columns:**
```tsx
// Column bg: className="bg-white/[0.03] rounded-xl p-3 space-y-2"
// Column header: text-gray-500
// Count badge: className="text-[10px] text-gray-500 bg-white/[0.06] px-1.5 py-0.5 rounded tabular-nums"
// Deal cards: className="p-2 rounded-lg bg-white/[0.05] border border-white/[0.06]"
// Deal text: text-[10px] text-gray-400 font-mono
```

**Hover animation (all bento cards):**
```tsx
whileHover={{ y: -3 }}
transition={{ type: 'spring', stiffness: 400, damping: 25 }}
```

---

## 5. How It Works

**Section header:** Same pattern as features -- `text-[#8B7AFF]` label, `text-[#F0EDE8]` heading.

**Border:** Replace `border-t border-gray-200` with `border-t border-white/[0.06]`.

**Decorative numbers:** Update color from lime to accent:
```tsx
style={{
  fontSize: 'clamp(52px, 6vw, 72px)',
  color: 'rgba(139,122,255,0.12)',
}}
```

**Icon containers:**
```tsx
className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center"
// Icon: className="text-[#8B7AFF]" size={14}
```

**Step title:** `text-lg font-semibold text-[#F0EDE8]`
**Step description:** `text-sm text-gray-400 leading-relaxed max-w-lg`

**Connector line:** Update stroke from lime to accent:
```tsx
stroke="rgba(139,122,255,0.15)"
```

**Step entrance animation (update ease):**
```tsx
const stepItemVariants = {
  hidden: { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
}
```

---

## 6. Testimonials

**Section background:** Replace `bg-gray-50` with `bg-white/[0.02]`. Border: `border-t border-white/[0.06]`.

**Section header:** Same accent label pattern.

**Card container:**
```tsx
className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-8 relative overflow-hidden"
```

**Large-format quote:** Increase from `text-sm` to `text-lg` for the single-viewport Mercury treatment:
```tsx
<blockquote className="text-lg text-gray-300 leading-relaxed">
```

**Avatar circle:** Replace lime-50 bg with accent tint:
```tsx
className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
style={{ backgroundColor: 'rgba(139,122,255,0.12)', color: '#8B7AFF' }}
```

**Identity text:**
- Name: `text-sm font-semibold text-[#F0EDE8]`
- Role: `text-xs text-gray-500`
- Strategy badges: keep existing `STRATEGY_STYLE` colors -- high saturation pops on dark

**Key metric:**
```tsx
<div className="pt-2 border-t border-white/[0.06]">
  <p className="text-2xl text-[#8B7AFF] font-semibold tabular-nums">{current.metric}</p>
  <p className="text-xs text-gray-500 mt-1">{current.metricLabel}</p>
</div>
```

**Nav arrows:**
```tsx
className="w-8 h-8 rounded-full bg-white/[0.04] border border-white/[0.06] text-gray-500 hover:text-[#F0EDE8] hover:border-white/[0.12] transition-colors"
```

**Dot indicators:**
- Active: `bg-[#8B7AFF]`, width 24px
- Inactive: `bg-white/[0.12]`, width 8px

**Animation variants (update ease):**
```tsx
const cardVariants = {
  enter: (d: number) => ({ opacity: 0, x: d > 0 ? 24 : -24 }),
  center: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
  exit: (d: number) => ({ opacity: 0, x: d > 0 ? -24 : 24, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }),
}
```

---

## 7. Stats Strip

**Section:** Remove `border-b border-gray-200`. Replace with `border-y border-white/[0.06]`.

**Remove icons.** Mercury/Linear pattern: oversized numbers only, no icons. Delete `ICON_MAP` usage and the `<Icon>` render.

**Numbers:** Scale up from `text-3xl` to `text-5xl md:text-6xl` (48-64px range):
```tsx
<p className="text-5xl md:text-6xl font-semibold text-[#F0EDE8] tabular-nums">
  {stat.prefix}{displayValue}{stat.suffix}
</p>
```

**Labels:**
```tsx
<p className="text-xs text-gray-500 mt-2 uppercase tracking-widest">{stat.label}</p>
```

**Dividers:** Add `divide-x divide-white/[0.08]` to the grid container:
```tsx
className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-10 divide-x divide-white/[0.08]"
```
Each cell: `text-center px-6`.

**Count-up:** Keep existing `useCountUp` hook with `COUNT_UP_DURATION = 1500`. Update stagger:
```tsx
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
}
```

---

## 8. Pricing Section

Reference Agent 10 pricing spec for card structure. Apply dark tokens:

**Section header:** Same pattern as other sections.

**Toggle control:**
```tsx
// Container
className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-1 inline-flex items-center gap-1"

// Active button
className="px-4 py-1.5 rounded-md text-sm font-medium bg-[#8B7AFF] text-white"

// Inactive button
className="px-4 py-1.5 rounded-md text-sm font-medium bg-transparent text-gray-500 hover:text-[#F0EDE8]"

// "Save 20%" badge
className="text-[10px] font-bold uppercase tracking-[0.08em] bg-[#8B7AFF]/20 text-[#8B7AFF] px-1.5 py-0.5 rounded"
```

**Standard cards (Free, Team):**
```tsx
className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 space-y-6 relative overflow-hidden
           hover:bg-white/[0.05] hover:border-white/[0.10] transition-all"
```

**Pro card (highlighted) -- accent border + glow:**
```tsx
className="rounded-2xl border border-[#8B7AFF]/50 bg-white/[0.03] p-6 space-y-6 relative overflow-hidden"

{/* Gradient overlay border */}
<div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-[#8B7AFF]/20 to-transparent pointer-events-none" />

{/* Ambient glow blob */}
<div className="absolute -top-20 left-1/2 -translate-x-1/2 w-60 h-40 bg-[#8B7AFF]/15 rounded-full blur-3xl pointer-events-none" />

{/* Top accent line */}
<div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#8B7AFF] to-transparent" />
```

**"Most Popular" badge:**
```tsx
className="text-[10px] font-bold uppercase tracking-[0.08em] bg-[#8B7AFF] text-white px-2 py-0.5 rounded"
```

**Card text:**
- Tier name: `text-[#F0EDE8] font-semibold`
- Description: `text-xs text-gray-500`
- Price number: `text-4xl font-bold text-[#F0EDE8] tabular-nums`
- Period: `text-xs text-gray-500`
- Feature list items: `text-xs text-gray-400`
- Checkmarks: `text-[#8B7AFF]`

**CTA buttons:**
- Pro (highlighted): `bg-[#F0EDE8] hover:bg-white text-[#0C0B0A] font-semibold` (inverted primary)
- Free/Team: `bg-white/[0.06] hover:bg-white/[0.10] text-[#F0EDE8] border border-white/[0.08] hover:border-white/[0.14]`

---

## 9. Footer

**Background:** `bg-[#0A0908]` -- the darkest section on the page. Creates a natural visual endpoint.

**Border:** `border-t border-white/[0.06]`.

**Logo mark:** Same accent gradient as navbar.

**Logo text:** `text-sm font-semibold text-gray-500`

**Status indicator:**
```tsx
<span className="relative flex h-2 w-2">
  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
</span>
<span className="text-xs text-gray-500">All systems operational</span>
```

**Column headers:**
```tsx
className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3"
```

**Link text:**
```tsx
className="text-sm text-gray-500 hover:text-gray-300 transition-colors duration-150"
```

**Newsletter input (new addition):**
```tsx
<div className="flex gap-2 mt-6">
  <input
    type="email"
    placeholder="you@email.com"
    className="flex-1 h-9 px-3 text-sm bg-white/[0.04] border border-white/[0.08] rounded-lg
               text-gray-300 placeholder:text-gray-600
               focus:outline-none focus:ring-1 focus:ring-[#8B7AFF] focus:border-[#8B7AFF]/40"
  />
  <button className="h-9 px-4 text-sm font-medium bg-[#8B7AFF] hover:bg-[#6C5CE7] text-white rounded-lg transition-colors duration-150">
    Subscribe
  </button>
</div>
```

**Divider:** `border-t border-white/[0.06] mt-10 pt-6`

**Social icons:** `text-gray-500 hover:text-[#F0EDE8] transition-colors duration-150`

**Copyright:** `text-xs text-gray-600`

---

## 10. Scroll Animations

**Global animation configs (replace all easing in landing components):**

```tsx
// Primary entrance
const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
}

// Stagger container
const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

// Stagger child
const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
}

// Card hover lift
const hoverLift = {
  whileHover: { y: -3 },
  transition: { type: 'spring', stiffness: 400, damping: 25 },
}
```

**What to replace:**
- All `ease: 'easeOut'` --> `ease: [0.22, 1, 0.36, 1]`
- All `ease: [0.25, 0.1, 0.25, 1]` --> `ease: [0.22, 1, 0.36, 1]`
- Export from `@/lib/motion` as `EASING.vercel = [0.22, 1, 0.36, 1]`

**What NOT to do (avoid gimmicky animations):**
- No horizontal scroll hijacking
- No letter-by-letter headline reveals
- No 3D rotation on scroll
- No bouncy spring physics on content sections
- No particle/WebGL backgrounds
- No scale-from-zero entrances

**Count-up numbers:** 1200-1500ms duration, triggered by `useInView` with `once: true, margin: '-40px'`.

**Lenis smooth scroll:** Already present via `LenisProvider`. No changes needed.

---

## 11. Mobile Landing

**Navbar mobile:**
- Hide center nav links (`hidden md:flex`)
- Keep logo + "Get started" button only
- Consider hamburger menu for v2 -- out of scope for this spec

**Hero mobile:**
- Headline scales via `clamp(48px, 7vw, 72px)` -- no change needed
- Stack CTAs vertically below sm: `flex flex-col sm:flex-row items-center gap-3`
- Demo card scrolls horizontally on narrow screens (existing `overflow-x-auto` on tabs)

**Bento grid mobile:**
- Already `grid-cols-1 md:grid-cols-3` -- cards stack to single column
- Kanban mini grid: `grid-cols-2 sm:grid-cols-4` -- 2-col on mobile is correct

**Stats strip mobile:**
- `grid-cols-2 md:grid-cols-4` -- top 2 stats visible without scrolling
- On 2-col, the `divide-x` divider should be applied only at md: use `md:divide-x divide-white/[0.08]` and add `divide-y divide-white/[0.08] md:divide-y-0` for mobile row separation

**Testimonials mobile:**
- Nav arrows hidden on mobile (existing `hidden sm:flex`)
- Mobile arrows shown below card (existing pattern)
- Quote text: step down from `text-lg` to `text-base` on mobile: `text-base md:text-lg`

**Pricing mobile:**
- Already `grid-cols-1 md:grid-cols-3` -- cards stack
- Pro card should be first on mobile (reorder with `order-first md:order-none` or restructure array)

**How it works mobile:**
- Decorative numbers scale down via clamp -- works as-is
- Content wraps naturally at single column

**Footer mobile:**
- `grid-cols-2 md:grid-cols-3` for nav columns -- works as-is
- Logo and social icons stack vertically (`flex-col-reverse md:flex-row`)

**Performance on mobile:**
- Remove ambient glow radial gradients below md: wrap in `hidden md:block`
- Parallax background: already `hidden md:block`
- Lazy sections via React.lazy + Suspense: already implemented

---

## 12. The Frame Problem

Dark screenshot on dark page creates a "visual puddle" -- no edge definition. The DemoCard in the hero solves this with a combination approach.

**Solution: Browser Chrome + Elevated Surface + Ambient Glow**

```tsx
{/* Outer glow frame */}
<div className="relative">
  {/* Accent glow behind the card */}
  <div
    className="absolute -inset-4 rounded-3xl pointer-events-none hidden md:block"
    style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(139,122,255,0.08), transparent 70%)' }}
  />

  {/* Card with browser chrome */}
  <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl shadow-black/40">
    {/* Browser chrome bar */}
    <div className="flex items-center gap-2 px-5 py-3 bg-white/[0.05] border-b border-white/[0.06]">
      <div className="flex gap-1.5">
        <div className="w-2.5 h-2.5 rounded-full bg-white/[0.12]" />
        <div className="w-2.5 h-2.5 rounded-full bg-white/[0.12]" />
        <div className="w-2.5 h-2.5 rounded-full bg-white/[0.12]" />
      </div>
      <div className="ml-2 h-5 flex-1 rounded-md bg-white/[0.04] max-w-xs" />
    </div>

    {/* Content (DemoCard body, screenshot, etc.) */}
    <div className="bg-white/[0.03]">
      {/* ... */}
    </div>
  </div>
</div>
```

**Why neutral dots instead of colored (red/yellow/green):** On a monochrome dark surface, traffic-light dots look toyish. Neutral `bg-white/[0.12]` dots feel more premium and consistent with the muted palette. Mercury and Linear both use neutral dots.

**For product screenshots (below fold, feature sections):**
```tsx
<div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-1 shadow-2xl shadow-black/50">
  <img src="/feature-screenshot.webp" className="rounded-xl w-full" loading="lazy" />
</div>
```

**DemoCard specific updates:**
- Window chrome bg: `bg-white/[0.05]` with `border-b border-white/[0.06]`
- Card body bg: `bg-white/[0.03]`
- Strategy tabs bg: active tab `text-[#8B7AFF] bg-[#8B7AFF]/10 border-b-2 border-[#8B7AFF]`, inactive `text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]`
- KPI dividers: `divide-x divide-white/[0.06] border-b border-white/[0.06]`
- AI summary box: `bg-white/[0.04] border border-white/[0.06]`
- AI badge: `bg-[#8B7AFF]/15 border border-[#8B7AFF]/25` with `text-[#8B7AFF]` text

---

## Final CTA Section

**Background:** Same as main bg `bg-[#0C0B0A]` with accent radial glow:
```tsx
style={{ background: 'radial-gradient(ellipse 60% 60% at 50% 100%, rgba(139,122,255,0.06) 0%, transparent 70%)' }}
```

**Icon box:** `bg-[#8B7AFF]/10 border border-[#8B7AFF]/20`

**Headline:** `text-4xl md:text-5xl font-light text-[#F0EDE8] leading-tight tracking-[-0.02em]`
(Match hero weight 300 for consistency.)

**Body:** `text-gray-400 text-base max-w-sm mx-auto leading-relaxed`

**CTA button:** Same inverted primary as hero: `bg-[#F0EDE8] hover:bg-white text-[#0C0B0A] h-12 px-8 text-sm font-semibold`

---

## Skeleton Placeholder (Lazy Loading)

Update from light to dark:
```tsx
function SectionSkeleton() {
  return (
    <div className="py-20 flex justify-center">
      <div className="w-full max-w-5xl px-6 space-y-4 animate-pulse">
        <div className="h-6 w-1/3 rounded bg-white/[0.04]" />
        <div className="h-4 w-2/3 rounded bg-white/[0.03]" />
        <div className="h-4 w-1/2 rounded bg-white/[0.02]" />
      </div>
    </div>
  )
}
```

---

## Landing.tsx Root Container

Change the root wrapper:
```tsx
// Before
<div className="min-h-screen text-gray-900 bg-[#F9FAFB]">

// After
<div className="min-h-screen text-gray-300 bg-[#0C0B0A]">
```

---

## CRITICAL DECISIONS

1. **Accent color is `#8B7AFF` / `#6C5CE7`, NOT lime/olive.** Every lime-700, lime-500, lime-50, lime-100, lime-200 reference across all landing components must be replaced with the violet accent equivalent. The green accent is retired from the landing page entirely.

2. **Headlines are font-weight 300 (light), not bold.** This is the single biggest visual shift from the current design. `font-light` with large size and tight tracking reads as luxury. Reserve `font-semibold` for card titles, labels, and CTAs -- never for the main headline.

3. **Primary CTA is inverted: light fill on dark page.** `bg-[#F0EDE8] text-[#0C0B0A]` is the brightest element above the fold. This is the highest-leverage conversion pattern on dark SaaS pages. The accent color is NOT used for the primary CTA -- it is used for secondary highlights, badges, and decorative elements.

4. **Body text is `text-gray-300` (#D1D5DB), headlines are `text-[#F0EDE8]`.** Pure white (#FFF) causes halation on OLED. The warm off-white `#F0EDE8` is reserved for headlines and the primary CTA. `text-white` should not appear in landing page code.

5. **Strategy badge colors are unchanged.** The high-saturation pastel badges (amber wholesale, violet creative finance, blue BRRRR, green buy-and-hold, rose flip) already have excellent contrast on dark surfaces. They serve as the primary color variation across the page.

6. **Two radial gradients replace three blur blobs.** `radial-gradient()` is GPU-composited; `filter: blur(130px)` forces a separate compositing layer. This change improves Lighthouse performance on mobile by 5-10 points while maintaining the ambient atmosphere.

7. **Neutral browser chrome dots, not traffic-light colors.** The `bg-white/[0.12]` dots are more cohesive on a monochrome dark surface. Red/yellow/green dots would be the only warm accent in the hero and would feel out of place.

8. **Stats strip removes icons.** The Mercury pattern: oversized numbers with no visual competition. Icons at small size on dark surfaces create visual noise without adding information. The number IS the icon.

9. **Focus rings use accent color with dark offset.** All `focus-visible:ring-lime-500 ring-offset-white` become `focus-visible:ring-[#8B7AFF] ring-offset-[#0C0B0A]`. This maintains WCAG 2.1 AA focus visibility.

10. **Footer is the darkest section.** `bg-[#0A0908]` creates a natural visual terminus. The 2-stop darkness gradient (main bg `#0C0B0A` --> footer `#0A0908`) adds subtle depth without being obvious.

11. **Mobile: hide ambient glows, keep all structural elements.** The radial gradient glows are `hidden md:block`. Every interactive element, every piece of content, every CTA remains fully functional and visible on mobile. Luxury is stripped back to typography and spacing on small screens.

12. **Animation ease is `[0.22, 1, 0.36, 1]` everywhere.** No exceptions. This is the Vercel ease -- fast acceleration, soft deceleration. It replaces all existing `easeOut`, `[0.25, 0.1, 0.25, 1]`, and spring-based content animations. Spring physics are reserved exclusively for `whileHover` lift effects.
