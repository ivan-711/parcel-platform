# Agent 11 -- Dark Luxury Pricing Page Design Research

> On a dark luxury UI, hierarchy is communicated through light, glow, and contrast --
> not background tints or drop shadows. This covers dark pricing patterns from Stripe,
> Linear, Vercel, Raycast, and Arc Browser mapped to Parcel's tokens: bg `#0C0B0A`,
> cream `#F0EDE8`, violet `#8B7AFF`. Free + Pro ($29/mo, $290/yr), 7-day trial.

---

## 1. Dark Pricing Page Examples

**Stripe** -- Near-black `#0A2540`. Cards one step lighter. Featured "Growth" card gets a 1px top gradient border (blue-to-purple crown line). Prices at `font-weight: 300` / 48px -- thin numbers on dark = perceived elegance. Featured CTA is white solid; others ghost.

**Linear** -- Pure `#000`. Cards at `rgba(255,255,255,0.03)`; featured at `0.06`. "Popular" badge in accent blue `#5E6AD2`, inline above plan name. Comparison table uses `rgba(255,255,255,0.06)` alternating rows, no borders. Checkmarks in accent, dashes in `white/20`.

**Vercel** -- `#000`. Cards: `border: 1px solid rgba(255,255,255,0.1)`. Featured: `border-color: rgba(255,255,255,0.2)` -- brighter border, same bg. Toggle: pill with white-bg active segment (inverted). Price at weight 500, 40px.

**Raycast** -- `#111`. Cards: `#191919`, `border: 1px solid #2A2A2A`. Featured: purple glow via `box-shadow: 0 0 80px 20px rgba(168,85,247,0.08)`. Pro CTA: gradient `linear-gradient(135deg, #A855F7, #6366F1)`. Others: `transparent, border 1px solid #3A3A3A`.

**Arc Browser** -- `#1A1A1A`. No card borders -- differentiation through a 4px colored top bar. Price at `font-weight: 200` / 56px (ultra-thin). No checkmarks, plain text at `opacity: 0.7`.

**Universal patterns:** (1) border brightness > shadows for elevation, (2) featured differentiation via glow > colored border > bg, (3) price weights 300-500, never 700+, (4) ghost buttons for non-featured, solid/gradient for featured, (5) accent color only on featured card.

---

## 2. Card Differentiation on Dark (5 Layers)

On dark, `border-2 border-violet-500` looks harsh. Colored bg tints muddy surfaces. Shadows are invisible. Use layered differentiation instead:

**Layer 1 -- Surface elevation:**
```
Non-featured: className="bg-white/[0.03] border border-white/[0.06]"
Featured:     className="bg-white/[0.05] border border-[#8B7AFF]/20"
```

**Layer 2 -- Crown gradient line** (1px, top of card):
```tsx
<div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#8B7AFF] to-transparent" />
```

**Layer 3 -- Ambient glow** (see Section 3).

**Layer 4 -- Vertical scale.** Featured card: `py-8` vs `py-6`. Physically taller = visually dominant.

**Layer 5 -- Text brightness.** Pro checkmarks: `text-[#8B7AFF]`. Free checkmarks: `text-white/40`.

---

## 3. Accent Glow: Violet Behind Featured Card

**Box shadow (recommended -- simplest, zero layout cost):**
```
className="shadow-[0_0_60px_10px_rgba(139,122,255,0.06),0_0_120px_40px_rgba(139,122,255,0.03)]"
```

**Blurred div (more control, higher render cost):**
```tsx
<div
  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[60%] rounded-full pointer-events-none"
  style={{ background: 'radial-gradient(ellipse, rgba(139,122,255,0.10) 0%, transparent 70%)', filter: 'blur(40px)' }}
/>
```

**Optional breathing animation:**
```tsx
<motion.div
  animate={{ opacity: [0.04, 0.08, 0.04] }}
  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
  className="absolute -inset-4 rounded-3xl pointer-events-none"
  style={{ background: 'radial-gradient(ellipse, rgba(139,122,255,0.12) 0%, transparent 70%)', filter: 'blur(40px)' }}
/>
```

Combine box shadow + crown gradient line for the Raycast/Linear effect.

---

## 4. Price Display on Dark

Thin type = elegance; bold type = brutalism. Price numbers: **light weight, large, tabular**.

```
Font: Inter (tabular-nums) | Weight: 300 | Size: text-5xl | Color: #F0EDE8 (not pure white)
```
```
className="text-5xl font-light tracking-tight text-[#F0EDE8] tabular-nums"
```
Period text: `className="text-sm font-normal text-white/40 ml-1"`

**Toggle on dark:**
```tsx
<div className="inline-flex rounded-lg bg-white/[0.06] p-1">
  <button className="px-5 py-2 rounded-md text-sm font-medium text-white/50">Monthly</button>
  <button className="px-5 py-2 rounded-md text-sm font-medium bg-white/[0.10] text-[#F0EDE8]">Annual</button>
</div>
```

Save badge: `className="text-[10px] font-bold uppercase tracking-wider bg-[#8B7AFF]/15 text-[#8B7AFF] px-2 py-0.5 rounded-full"`

**Price animation -- violet flash on change:**
```tsx
<motion.span
  key={interval}
  initial={{ opacity: 0, y: -10, color: '#8B7AFF' }}
  animate={{ opacity: 1, y: 0, color: '#F0EDE8' }}
  exit={{ opacity: 0, y: 10 }}
  transition={{ duration: 0.25 }}
  className="text-5xl font-light tracking-tight tabular-nums"
>{price}</motion.span>
```

---

## 5. Feature Comparison on Dark

- **Included:** `<Check size={14} className="text-[#8B7AFF] shrink-0" />` (Pro column) or `text-white/60` (Free)
- **Excluded:** `<span className="text-white/20 text-sm">--</span>` -- never a red X
- **Quantified:** `<span className="text-white/50 text-sm tabular-nums">25/mo</span>`

Table: `border border-white/[0.06] rounded-2xl`, header bg `bg-white/[0.03]`, alternating rows `bg-white/[0.02]`. Pro column header in `text-[#8B7AFF]` -- the only color in the table. Category headers: `bg-white/[0.04] text-xs uppercase tracking-wider text-white/30`.

---

## 6. "Most Popular" Badge

```tsx
<div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
  <span className="bg-[#8B7AFF] text-white text-[11px] font-semibold px-3 py-1 rounded-full
    shadow-[0_0_12px_rgba(139,122,255,0.3)] whitespace-nowrap inline-flex items-center gap-1.5">
    <Sparkles size={11} /> Most Popular
  </span>
</div>
```

**Not-tacky rules:** (1) small -- 11px text, tight padding, (2) no border -- solid fill reads confident, (3) glow shadow ties it to the card's ambient glow, (4) sparkle icon at 11px, (5) no animation -- animated badges feel desperate.

Alternative (Linear style) -- inline label above plan name:
```tsx
<p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8B7AFF] mb-1">Most Popular</p>
```
Use floating pill on `/pricing` page, inline label on landing section.

---

## 7. CTA Buttons

**Featured -- gradient:**
```tsx
<motion.button
  whileHover={{ scale: 1.01, y: -1 }}
  whileTap={{ scale: 0.98 }}
  className="w-full h-12 rounded-lg text-sm font-semibold text-white
    bg-gradient-to-r from-[#8B7AFF] to-[#6C5CE7]
    hover:from-[#9B8CFF] hover:to-[#7C6DF7]
    shadow-[0_0_20px_rgba(139,122,255,0.15)]
    hover:shadow-[0_0_30px_rgba(139,122,255,0.25)]
    transition-all duration-200"
>Start 7-Day Free Trial</motion.button>
```

**Non-featured -- ghost:**
```tsx
<button className="w-full h-12 rounded-lg text-sm font-medium
  bg-transparent border border-white/[0.12] text-white/60
  hover:text-white/80 hover:border-white/[0.20] hover:bg-white/[0.04]
  transition-all duration-200">Start Free</button>
```

**Current plan state:** `bg-white/[0.04] text-white/30 cursor-default` -- no border, no hover.

---

## 8. Annual Savings Display

Parcel: $29/mo ($348/yr) vs $290/yr ($24.17/mo). Savings: $58/yr (~17%).

**Triple-layer approach (Stripe pattern, maximum conversion):**

1. Badge on toggle: `bg-[#8B7AFF]/15 text-[#8B7AFF]` -- "Save 17%"
2. Strikethrough on card when annual is active:
```tsx
<span className="text-5xl font-light text-[#F0EDE8] tabular-nums">$24</span>
<span className="text-lg font-light text-white/30 line-through tabular-nums">$29</span>
```
3. Dollar callout below price: `<p className="text-xs text-[#8B7AFF] mt-1">Save $58 per year</p>`

Plus a billing transparency note: `className="text-[11px] text-white/30"` -- "Billed as $290/year"

---

## 9. Dark Pricing Conversion Psychology

1. **Dark = premium framing.** Luxury associations (Rolex, AmEx Black). Dark checkout flows show ~8% higher AOV for premium products (Baymard 2024).
2. **Attention scarcity.** Eye gravitates to brightest element. Featured card glow and gradient CTA are disproportionately effective. You can be MORE subtle on dark and achieve equal hierarchy.
3. **Reduced cognitive load.** Less visual noise -- feature lists feel less overwhelming. Benefits detail-oriented buyers.
4. **Trust signals need higher contrast.** "No credit card required" must be at least `text-white/50` with a Lock icon, not `/30`. Risk invisibility otherwise.
5. **Color minimalism.** Every colored element carries 3x visual weight on dark. Violet on non-featured cards collapses the hierarchy. Free/Team stay monochromatic.

---

## 10. FAQ Accordion on Dark

```tsx
<div className="border border-white/[0.06] rounded-2xl divide-y divide-white/[0.06] overflow-hidden">
  {FAQ_ITEMS.map((item) => <FaqItem key={item.q} {...item} />)}
</div>
```

Key adaptations: dividers at `white/[0.06]`, questions in `text-[#F0EDE8]` (cream, not pure white -- prevents halation), answers in `text-white/50`, chevron `text-white/30` closed / `text-[#8B7AFF]` open, hover brightens question text via `group-hover:text-white`. No background changes on hover -- bg shifts in small containers create a cheap "flashing" effect on dark.

---

## 11. Bottom CTA Section

```tsx
<section className="relative py-20 overflow-hidden">
  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] pointer-events-none"
    style={{ background: 'radial-gradient(ellipse, rgba(139,122,255,0.06) 0%, transparent 70%)', filter: 'blur(60px)' }} />
  <div className="relative z-10 max-w-xl mx-auto text-center space-y-6">
    <h2 className="text-2xl font-semibold text-[#F0EDE8]">Ready to analyze deals faster?</h2>
    <p className="text-sm text-white/50">Start with 5 free analyses. No credit card for your 7-day trial.</p>
    <motion.button className="h-12 px-8 rounded-lg text-sm font-semibold text-white
      bg-gradient-to-r from-[#8B7AFF] to-[#6C5CE7] shadow-[0_0_20px_rgba(139,122,255,0.15)]
      hover:shadow-[0_0_30px_rgba(139,122,255,0.25)] transition-all duration-200"
    >Start 7-Day Free Trial</motion.button>
    <p className="text-xs text-white/40 inline-flex items-center gap-1.5"><Lock size={11} />No credit card required. Cancel anytime.</p>
  </div>
</section>
```

Principles: violet radial glow = "spotlight" finale, minimal text (2 lines max above button), mirror Pro card gradient CTA, trust line below, generous `py-20` breathing room.

---

## RECOMMENDATIONS FOR PARCEL

1. **5-layer Pro card differentiation** (high) -- lighter surface + violet border at 20% + crown gradient line + taller padding + violet checkmarks. Eliminates the "just a thicker border" problem.

2. **Violet glow behind Pro card** (high) -- `shadow-[0_0_60px_10px_rgba(139,122,255,0.06),0_0_120px_40px_rgba(139,122,255,0.03)]`. Highest-impact single dark-mode technique (Raycast/Linear pattern). Zero layout cost.

3. **Light-weight price numbers** (high) -- `font-light` (300) at `text-5xl` in cream `#F0EDE8`. Bold numbers feel utilitarian on dark; light numbers feel premium.

4. **Gradient CTA for Pro, ghost for others** (high) -- `from-[#8B7AFF] to-[#6C5CE7]` with glow shadow vs `border border-white/[0.12] text-white/60`. Clearest visual hierarchy possible on dark.

5. **Triple-layer annual savings** (medium) -- Badge on toggle + strikethrough monthly price on card + "$58/year" dollar callout in violet. Each appears at a different scan point.

6. **"Most Popular" badge with glow shadow** (medium) -- Solid violet pill, 11px, `shadow-[0_0_12px_rgba(139,122,255,0.3)]`. Glow ties badge to card halo. No animation.

7. **Dark FAQ accordion** (medium) -- `divide-white/[0.06]`, cream questions, violet chevron when open. Text-only transitions, no background changes on hover.

8. **Ambient glow on bottom CTA** (medium) -- Radial violet gradient behind final section. Signals page culmination, mirrors Pro card treatment.

9. **Color minimalism enforcement** (low, ongoing) -- Violet ONLY on Pro card elements. Free/Team stay monochromatic white/cream at varying opacities.

10. **`tabular-nums tracking-tight` on all prices** (low) -- Prevents layout shift when toggle animates between $29 and $24.
