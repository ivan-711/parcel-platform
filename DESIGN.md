# Parcel Platform — Design System

> Luxury dark fintech for real estate investors.
> Closest DNA: **Stripe** (weight 300 headlines, single accent, progressive tracking).
> Secondary: **Linear** (dark-mode-native, semi-transparent borders, accent discipline).

---

## 1. Visual Theme & Atmosphere

Parcel's interface is a warm-dark canvas (#0C0B0A) where information emerges through controlled luminance — not color variation. The overall impression is restrained luxury: Satoshi 300 headlines whisper authority (the same "light weight as confidence" principle that defines Stripe's typography), warm cream text (#F0EDE8) prevents eye strain, and a single violet accent (#8B7AFF) is reserved exclusively for interactive elements and the recommended pricing tier.

**Key Characteristics:**
- Dark-mode-native: #0C0B0A (warm gray, not pure black — red channel leads blue by 2pts)
- Satoshi Variable for display, General Sans for body — geometric pairing with clear hierarchy
- Weight 300 as the signature display weight (validated by Stripe's identical approach)
- Single accent: violet #8B7AFF — the only chromatic color in the system
- Semi-transparent white borders (rgba 0.03–0.12) — structure without noise (from Linear)
- 5-tier background luminance stepping for elevation (from Linear's philosophy)
- Fluid typography via CSS clamp() on landing page (from Vercel)

---

## 2. Color Palette

### Backgrounds (warm gray scale)
| Token | Hex | Usage |
|-------|-----|-------|
| `--app-bg` | `#0C0B0A` | Page background |
| `--app-recessed` | `#131210` | Section stripes, sidebar |
| `--app-surface` | `#1A1916` | Cards, panels |
| `--app-elevated` | `#22211D` | Modals, popovers |
| `--app-overlay` | `#2A2924` | Command palette, overlays |

### Text (warm cream hierarchy)
| Token | Hex | Contrast | Usage |
|-------|-----|----------|-------|
| `--text-primary` | `#F0EDE8` | 17.6:1 AAA | Headlines, primary content |
| `--text-secondary` | `#A09D98` | 7.5:1 AAA | Body text, descriptions |
| `--text-muted` | `#7A7872` | 3.9:1 AA-lg | Eyebrow labels, metadata |
| `--text-disabled` | `#5C5A56` | 3.0:1 | Decorative, multi-cue only |

### Borders (semi-transparent white — 5 tiers)
| Token | Value | Usage |
|-------|-------|-------|
| `--border-ghost` | `rgba(255,255,255,0.03)` | Barely visible separation |
| `--border-subtle` | `rgba(255,255,255,0.04)` | Section dividers |
| `--border-default` | `rgba(255,255,255,0.06)` | Card borders, inputs |
| `--border-strong` | `rgba(255,255,255,0.08)` | Hover states, active borders |
| `--border-emphasis` | `rgba(255,255,255,0.12)` | High contrast borders |

### Accent (warm violet)
| Token | Hex | Usage |
|-------|-----|-------|
| `--accent-primary` | `#8B7AFF` | CTA backgrounds, interactive focus |
| `--accent-hover` | `#7B6AEF` | Hover on accent elements |
| `--accent-secondary` | `#A89FFF` | Light accent variant |
| `--accent-active` | `#6B5AD6` | Active/pressed state |

### Financial
| Token | Hex | Usage |
|-------|-----|-------|
| `--color-profit` | `#7CCBA5` | Positive values, gains |
| `--color-loss` | `#D4766A` | Negative values, losses |

### Strategy Badges (5 per-strategy color sets)
Wholesale (gold #E5A84B), BRRRR (blue #7B9FCC), Buy & Hold (green #7CCBA5), Flip (red #D4766A), Creative Finance (violet #C4BEFF). Each has bg/text/border variants at 8%/100%/20% opacity.

### Light Theme
Full parallel token set under `.light` class. Same accent violet, adapted surface/text/border tokens for light backgrounds. See `frontend/src/index.css` lines 174-293.

---

## 3. Typography

### Font Families
| Role | Family | Source |
|------|--------|--------|
| Brand/Display | Satoshi Variable | Self-hosted woff2, weights 300–900 |
| Body/UI | General Sans | Self-hosted woff2, weights 300–600 |
| Code | JetBrains Mono | Fontsource |

### App Type Scale (tailwind.config.ts)
| Token | Size | Line Height | Tracking | Weight | Usage |
|-------|------|-------------|----------|--------|-------|
| `hero` | 56px | 1.05 | -0.04em | 300 | Landing hero H1 |
| `display` | 40px | 1.1 | -0.035em | 300 | Section headlines |
| `kpi` | 32px | 1.15 | -0.03em | 300 | KPI display numbers |
| `h1` | 28px | 1.2 | -0.025em | 400 | Page titles |
| `h2` | 22px | 1.3 | -0.02em | 500 | Section titles |
| `h3` | 18px | 1.4 | -0.015em | 500 | Card headers |
| `body-lg` | 16px | 1.6 | -0.011em | 400 | Feature text |
| `body` | 14px | 1.6 | -0.006em | 400 | Standard body |
| `sm` | 13px | 1.5 | 0 | 400 | Secondary text |
| `xs` | 11px | 1.45 | 0.01em | 500 | Labels, metadata |
| `micro` | 10px | 1.4 | 0.04em | 500 | Tiny labels |

### Landing Page Fluid Scale (CSS clamp)
| Element | Value | Range |
|---------|-------|-------|
| Hero H1 | `clamp(2rem, 5vw + 0.5rem, 3.5rem)` | 32–56px |
| Section H2s | `clamp(1.5rem, 3vw + 0.5rem, 2.5rem)` | 24–40px |
| ProblemSection H2 | `clamp(1.5rem, 3.5vw + 0.5rem, 2.375rem)` | 24–38px |
| Stats numbers | `clamp(2.25rem, 4vw + 0.25rem, 3rem)` | 36–48px |

### Weight Contrast Technique
- **Default:** Satoshi 300 (`font-light`) for all display text
- **Emphasis:** Satoshi 500 (`font-medium`) on ONE key word per headline via `<span>`
- **Never** use Satoshi 700+ for display — lightness IS the brand voice

Examples:
```html
We build the <span class="font-medium">full picture.</span>
Five strategies. <span class="font-medium">One</span> address.
Not just numbers — <span class="font-medium">narrative.</span>
```

### Eyebrow Labels
- Font: General Sans 500, 11px, uppercase, tracking 0.08em
- Color: `text-text-muted` (#7A7872) — standardized across all sections
- Pattern: `text-[11px] uppercase tracking-[0.08em] font-medium text-text-muted`

### Number Display
- Financial data: `font-variant-numeric: tabular-nums lining-nums` via `.financial` class
- Stats count-up: inline `fontVariantNumeric: 'tabular-nums'` for consistent width during animation

---

## 4. Violet (#8B7AFF) Discipline

**Principle:** Every violet pixel must either trigger an action or identify the recommended pricing tier. Zero decorative usage. (Validated by Linear's single-accent discipline and Apple's "only blue" rule.)

### Classification
| Type | Usage | Count |
|------|-------|-------|
| **A: Interactive** | CTA gradients, hover shadows, focus rings, skip link | 7 |
| **B: Earned accent** | Carbon tier badge/border/glow, "Save 20%" badge | 5 |
| **C: Ambient** | CTA section radial gradient at 4% opacity | 1 |
| **Total kept** | | **13** |

### Banned
- Decorative grid/pattern backgrounds (use neutral white instead)
- Non-interactive check icons (use #A09D98)
- Any usage >4% opacity that doesn't guide an action

---

## 5. Components

### CTA Button (Gradient Pill)
```
background: linear-gradient(to right, #8B7AFF, #6C5CE7)
color: var(--accent-text-on-accent)
border-radius: 9999px
padding: 12px 32px
hover: scale(1.02) + box-shadow 0 0 20px rgba(139,122,255,0.3)
transition: all 200ms
```

### Glass Card
```css
.glass {
  background: rgba(12, 11, 10, 0.75);
  backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
```
Combined with `.edge-highlight` for a subtle top-edge light catch.

### Standard Card
```
background: var(--app-surface)
border: 1px solid var(--border-default)
border-radius: 12px (rounded-xl)
hover: whileHover={{ y: -4 }} + shadow-lg + border-border-strong
transition: shadow 200ms, border-color 200ms
```

### Pricing Card
- **Steel/Titanium:** Standard card pattern
- **Carbon (recommended):** `border-[#8B7AFF]/25`, `shadow-[0_0_24px_rgba(139,122,255,0.06)]`, hover intensifies to `shadow-[0_0_32px_rgba(139,122,255,0.10)]`

### Browser Chrome Frame
```
border-radius: 12px (rounded-xl)
border: 1px solid var(--border-default)
chrome bar: bg-app-recessed, 3 dots + URL bar placeholder
hover: whileHover={{ y: -2 }} + shadow intensification
```

---

## 6. Layout & Spacing

### Base Unit
8px (matches Linear/Stripe/Vercel/Apple).

### Section Padding
| Pattern | Value | Sections |
|---------|-------|----------|
| Standard | `py-16 md:py-24` | ProductPreview, HowItWorks, StrategyTabs, AINarrativeDemo |
| Generous | `py-24 md:py-32` | ProblemSection, CTASection, PricingSection |
| Stats | `py-16` | StatsStrip |

### Max Content Widths
| Width | Sections |
|-------|----------|
| 7xl (1280px) | ProductPreview, PricingSection, CTASection |
| 5xl | StatsStrip, HowItWorks steps |
| 4xl | StrategyTabs |
| 640px | ProblemSection, AINarrativeDemo |

### Container Padding
`px-6` universal on all sections.

### Header-to-Content Gap
- `mb-16` on StrategyTabs, PricingSection header blocks
- `mb-12 md:mb-16` on ProductPreview header

---

## 7. Depth & Elevation

| Level | Shadow | Usage |
|-------|--------|-------|
| 0 | none | Page background |
| 1 | `xs` (0 1px 2px) | Subtle lift |
| 2 | `sm`/`md` | Cards, panels |
| 3 | `lg`/`xl` | Elevated, featured, hover |
| Glow | `glow-violet` | Carbon tier accent |
| Focus | `focus-violet` (double ring) | Keyboard accessibility |

**Philosophy (from Linear):** On dark surfaces, elevation comes from background luminance stepping (`app-bg` → `app-surface` → `app-elevated` → `app-overlay`), not from shadow darkness. Shadows supplement but don't define depth.

---

## 8. Animation & Motion

### Easing Curves
| Name | Value | Usage |
|------|-------|-------|
| `ease.luxury` | `cubic-bezier(0.25, 0.1, 0.25, 1)` | Section entrances, standard |
| `ease.vercel` | `cubic-bezier(0.22, 1, 0.36, 1)` | Snappy interactions, cards |

### Animation Budget
| Category | Budget | Elements |
|----------|--------|----------|
| Hero frame sequence | 60% | 121 WebP frames, scroll-driven canvas |
| Micro-interactions | 25% | Button hover, CTA glow, tab transitions, count-up |
| Section entrances | 15% | Fade-up on viewport entry |

### Entrance Pattern
```tsx
initial={{ opacity: 0, y: 20 }}
animate={isVisible ? { opacity: 1, y: 0 } : undefined}
transition={{ duration: 0.5, ease: ease.luxury }}
```
Stagger children by 100–150ms via `delay: index * 0.1`.

### Micro-Interactions
- Card hover: `whileHover={{ y: -4 }}` + `transition-shadow duration-200 hover:shadow-lg`
- CTA hover: `hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(139,122,255,0.3)]`
- Link hover: color shift to `text-text-primary`
- Tab switch: AnimatePresence crossfade 150ms

### Restraint Principle
> "If it doesn't serve narrative, confirmation, or guidance, it doesn't animate."

Source: 11-video research deep dive (`SAD/VIDEO-RESEARCH-DEEP-DIVE.md`), validated by all 4 reference design systems.

### Reduced Motion
All animations disabled via `prefers-reduced-motion: reduce` media query (index.css lines 501-508).

---

## 9. Visual Rhythm

The scroll journey must feel like a progression, not a flat list. Each section has visual identity through background variation, borders, and energy level.

| # | Section | Background | Border | Energy |
|---|---------|-----------|--------|--------|
| 1 | Hero | `#020202` (matches frames) | — | HIGH |
| 2 | StatsStrip | `app-recessed` (#131210) | border-y | Medium |
| 3 | ProblemSection | void (#0C0B0A) | — | Low (emotional pause) |
| 4 | ProductPreview | `#111110` (tinted stage) | border-t | Medium |
| 5 | HowItWorks | void (#0C0B0A) | border-t | Medium |
| 6 | StrategyTabs | `app-recessed/40` | — | High (interactive) |
| 7 | AINarrativeDemo | void + glass card | — | PEAK |
| 8 | PricingSection | void (#0C0B0A) | border-t | Medium |
| 9 | CTASection | radial-gradient 4% violet | — | High |
| 10 | Footer | `app-recessed` (#131210) | border-t | Low |

---

## 10. Landing Page Rules

### Section Order (visitor psychology)
1. Hero → "What is this?"
2. StatsStrip → "Do others trust this?"
3. ProblemSection → "Do they understand my problem?"
4. ProductPreview → "What does the product look like?"
5. HowItWorks → "How does it work?"
6. StrategyTabs → "What specifically does it do?"
7. AINarrativeDemo → "This is actually impressive" (PEAK moment)
8. PricingSection → "What does it cost?"
9. CTASection → "I'm convinced — what's next?" (END moment)
10. Footer

### CTA Strategy
"Get Started Free" appears 3 times: hero, after AINarrativeDemo, CTASection. Single CTA path — no competing secondary actions.

### Hero Rules
- Container bg: `#020202` (matches frame backgrounds, not page #0C0B0A)
- Bottom gradient: fades from transparent to `#0C0B0A` (bridges hero to page)
- Left/top gradients: fade from `#020202` (match container)
- Canvas: `h-[80vh]`, `translate-x-[25%]`, right-anchored with overflow bleed
- Mobile (<768px): static `building-complete.jpg` fallback, 100vh height
- 121 WebP frames, preload first 10 eagerly, lazy-load rest

---

## 11. Do's and Don'ts

### Do
- Use Satoshi 300 for all display text — lightness is the brand voice
- Use Satoshi 500 on ONE key word per headline for emphasis contrast
- Reserve violet #8B7AFF exclusively for interactive elements and Carbon tier
- Use `clamp()` for landing page headlines — fluid scaling without breakpoint jumps
- Apply `tabular-nums` on animated or data-display numbers
- Use semi-transparent white borders (rgba 0.03–0.12) — not solid colors
- Lean into darkness as space — #0C0B0A IS the whitespace
- Alternate section backgrounds subtly (tinted stages, border separators, recessed tints)
- Give every interactive element a hover state (cards lift, buttons scale, links shift)
- Stagger children within sections (100–150ms delays)
- Keep animation budget disciplined (hero 60%, micro-interactions 25%, entrances 15%)

### Don't
- Don't use Satoshi 700+ for display — maximum emphasis weight is 500
- Don't use violet decoratively (grid patterns, non-interactive icons, effects >4% opacity)
- Don't add gradient meshes, glassmorphism overlays, or AI-aesthetic cliches
- Don't animate anything that doesn't serve narrative, confirmation, or guidance
- Don't use solid colored backgrounds for dark-theme cards — use `app-surface` token
- Don't introduce warm accent colors beyond the strategy badge palette
- Don't skip the hero bg seam fix (#020202 container + #0C0B0A gradient bridge)
- Don't let all sections look the same — visual rhythm creates a journey

---

## 12. Reference Systems

This design system was informed by analysis of:
- **Linear** (`/tmp/design-refs/DESIGN.md`) — dark-mode-native, single accent discipline, semi-transparent borders, luminance stepping
- **Stripe** (`/tmp/design-refs-stripe/DESIGN.md`) — weight 300 headlines, tabular-nums, progressive tracking, blue-tinted shadows
- **Vercel** (`/tmp/design-refs-vercel/DESIGN.md`) — fluid typography (clamp), shadow-as-border, three-weight system, gallery whitespace
- **Apple** (`/tmp/design-refs-apple/DESIGN.md`) — alternating section backgrounds, single accent, tight line-heights, massive whitespace
- **fey.com** — visual rhythm via section borders, card hover states, staggered reveals

Research inputs:
- `SAD/TYPOGRAPHY-AND-STYLING-AUDIT.md` — 11 action items for typography polish
- `SAD/VIDEO-RESEARCH-DEEP-DIVE.md` — 11 YouTube videos on web design, animation restraint

---

## Source Files

| File | Contains |
|------|----------|
| `frontend/src/index.css` | CSS variables (colors, borders, text, accent, charts, utility classes) |
| `frontend/tailwind.config.ts` | Tailwind theme (type scale, shadows, colors, animations) |
| `frontend/src/lib/motion.ts` | Framer Motion presets (easing, reduced motion detection) |
