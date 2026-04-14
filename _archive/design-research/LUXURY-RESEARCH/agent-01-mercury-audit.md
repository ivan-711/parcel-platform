# Mercury Design Audit: Luxury Dark SaaS Reference

> Research 2026-03-31 for Parcel (parceldesk.io) luxury dark redesign.
> Sources: mercury.com production CSS, Mercury blog, Linear.style, design.dev, SaaSFrame.
> Cross-referenced with Linear, Stripe, Vercel, Raycast, Arc Browser.

---

## 1. Color System

Mercury uses a **semantic token system** (internally called "Arcadia") grouping colors by usage, not name. Production CSS class tokens include `bg-surface-primary`, `bg-surface-emphasized`, `text-text-default`, `text-text-subdued`, `text-text-disabled`, `outline-border-focus`. They support light/dark from a single codebase by swapping token values.

### Dark Palette (extracted / inferred)

```
Page background:      #0a0a0a    (near-black, never pure #000000)
Card surface:         #141414    (one step up)
Elevated surface:     #1e1e1e    (modals, popovers)
Inset / recessed:     #0d0d0e    (input fields)
Overlay:              #242424    (command palette, modals)
Tooltip:              #2a2a2a

Border (default):     rgba(255, 255, 255, 0.06)
Border (hover):       rgba(255, 255, 255, 0.12)
Border (focus):       accent color at ~40% opacity

Primary text:         #e5e5e5 - #f0f0f0  (never pure #ffffff)
Secondary text:       rgba(245, 245, 247, 0.6)  ~#9a9a9c
Tertiary / disabled:  rgba(245, 245, 247, 0.3)  ~#5c5c5e
```

**Key:** Mercury never uses `#000000` or `#ffffff`. The softened pair `#0a0a0a`/`#f0f0f0` eliminates halation (optical bleed where bright text vibrates on pure black).

### Peer Background Comparison

| App       | Background | Card      | Elevated  |
|-----------|-----------|-----------|-----------|
| Mercury   | `#0a0a0a` | `#141414` | `#1e1e1e` |
| Linear    | `#121212` | `#1b1c1d` | `#242424` |
| Vercel    | `#0a0a0a` | `#111111` | `#1a1a1a` |
| Raycast   | `#141417` | `#1c1c1f` | `#252528` |
| Stripe    | `#0a2540` | `#0d2e4d` | `#12395a` |

Stripe is the outlier with saturated navy. Mercury/Vercel share the closest neutral base.

---

## 2. Typography

Mercury loads custom `.woff2` from `cdn.mercury.com` (no Google Fonts). Class names `arcadia-display-3`, `arcadia-body-1`, `arcadia-ui-1` indicate a bespoke typeface. Historical data (typ.io) shows they previously used Avenir Next. Closest free alternatives: **Inter** (Linear's choice), **Geist** (Vercel's).

### Type Scale

```
Display:  40-48px / 700 / line-height 1.1  / letter-spacing -0.02em
Heading:  32-36px / 700 / line-height 1.15 / letter-spacing -0.015em
Title:    24-28px / 600 / line-height 1.2  / letter-spacing -0.01em
Body:     16px    / 400 / line-height 1.6  / letter-spacing 0
Small:    14px    / 400 / line-height 1.5  / letter-spacing 0
UI:       13-14px / 500 / line-height 1.4  / letter-spacing 0.01em
Caption:  12px    / 500 / line-height 1.35 / letter-spacing 0.02em
```

Display sizes use **negative tracking** (universal across Mercury, Linear, Vercel, Stripe). UI text uses **positive tracking** for small-size legibility. Weight 500 (medium) is the workhorse.

### Financial Number Display

Cents rendered at ~75% size in subdued color (not true superscript). Tabular figures for tables, proportional for headlines. Negatives use minus prefix, not parentheses. Balances left-aligned, amounts right-aligned.

```tsx
<span className="text-3xl font-semibold tracking-tight text-white">$248,500</span>
<span className="text-lg font-medium text-white/50 ml-0.5">.00</span>
```

---

## 3. Card Surface Design & Top-Edge Highlight

### Card Anatomy
```
Top edge:    1px highlight at rgba(255,255,255,0.05-0.12)
Surface:     #141414 flat fill (no gradients)
Border:      1px solid rgba(255,255,255,0.06)
Radius:      12px
Shadow:      None (depth from bg color layering only)
```

### Top-Edge Light Catch (three CSS methods)

**Method 1 — border-top (simplest):**
```css
.card { border: 1px solid rgba(255,255,255,0.06); border-top-color: rgba(255,255,255,0.1); }
```

**Method 2 — inset box-shadow (Mercury's likely approach):**
```css
.card {
  background: #141414;
  border: 1px solid rgba(255,255,255,0.06);
  box-shadow: inset 0 1px 0 0 rgba(255,255,255,0.05);
  border-radius: 12px;
}
```

**Method 3 — gradient border with mask (most flexible):**
```css
.card::before {
  content: ''; position: absolute; inset: -1px; border-radius: 13px;
  background: linear-gradient(to bottom, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 10%, rgba(255,255,255,0.04) 100%);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude; padding: 1px;
}
```

**Tailwind for Parcel:** `bg-[#141414] border border-white/[0.06] rounded-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]`

**What Mercury does NOT do with cards:** No drop shadows, no gradients on surfaces, no blur/glassmorphism, no colored borders, no radius > 16px, no hover lift/scale.

---

## 4. Sidebar Navigation

```
Width:           ~250px        | Background: same as page (#0a0a0a)
Nav item:        36-40px h     | Padding: 8px 12px
Icon:            20px          | Gap icon-to-label: 8px
Item gap:        2-4px         | Section gap: 16-24px
```

### Nav States
```css
.nav-item         { color: rgba(245,245,247,0.6); background: transparent; border-radius: 8px; font: 500 14px; }
.nav-item:hover   { color: rgba(245,245,247,0.8); background: rgba(255,255,255,0.04); }
.nav-item.active  { color: #f5f5f7; background: rgba(255,255,255,0.08); }
```

Mercury uses **background fill + text brightness** for active state (no colored left-border like Linear, no bold weight change like Vercel). No visible `border-right` separator.

---

## 5. CTA Buttons

From production: `rounded-4xl`/`rounded-5xl` (pill shape), `h-40` (40px), `px-s20` (20px padding).

```css
.btn-primary {
  background: var(--surface-primary); color: var(--text-on-primary);
  border: none; border-radius: 9999px; height: 40px; padding: 0 20px;
  font: 500 14px; transition: background 200ms ease;
}
.btn-primary:focus-visible { outline: 2px solid var(--border-focus); outline-offset: 4px; }
```

**Tonal/secondary:** same shape, `bg: rgba(255,255,255,0.06)`, `border: 1px solid rgba(255,255,255,0.08)`.

Mercury has NO gradient buttons (unlike Stripe), NO glow/shadow on hover, NO ghost buttons in primary positions. Stripe uses `linear-gradient(to bottom right, #7c3aed, #3b82f6)` -- Mercury avoids this entirely.

---

## 6. Search Bar & Command Palette

Mercury uses Cmd+K command palette (like Raycast/Linear), not an always-visible search input. Sidebar shows a trigger: icon + "Search" + `Cmd K` hint.

```css
.search-trigger { background: #171717; border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; height: 36px; }
.search-trigger::placeholder { color: rgba(245,245,247,0.3); }
```

---

## 7. Layout & Spacing

Grid: `--grid-max-width: ~1280px`, `--grid-gutters: 24px`, 12-column with `md:col-span-6` / `lg:col-span-12`. Spacing scale: `0 / 8 / 12 / 16 / 24 / 32px` (8px base). `navbar-height` var used in `calc()` for content offset.

---

## 8. Depth Without Heaviness

Mercury creates depth through **background color stepping** only: `#0a0a0a` > `#141414` > `#1e1e1e` > `#242424` > `#2a2a2a`. Each layer adds ~10 decimal to the hex. No drop shadows on cards. `backdrop-filter: blur()` reserved for transient overlays only. Borders at 4-8% white opacity are felt more than seen. One accent color per viewport.

---

## 9. Animation

```css
transition: color 300ms ease-out, background 300ms ease-out;  /* interactions */
/* Entrance: */ opacity 0->1, translateY 8px->0, 400-600ms    /* page elements */
```

No spring physics (CSS native easing only). No hover scale transforms on cards. No parallax. This restraint creates the "institutional" feel.

---

## 10. What Mercury Does NOT Do

1. No gradients on surfaces  2. No colored borders  3. No radius > 16px on cards  4. No shadows for depth  5. No glassmorphism on content  6. No hover lift/scale  7. No ornamental elements (dots, grids, patterns)  8. No colored section backgrounds  9. No icon colors different from text  10. No shimmer skeleton loaders  11. No emoji in UI  12. No floating action buttons

**This austerity is what creates the "expensive" feeling.**

---

## 11. RECOMMENDATIONS FOR PARCEL

### P1 -- Foundation

1. **Three-layer background system.** `--bg-base: #0a0a0a`, `--bg-card: #141414`, `--bg-elevated: #1e1e1e`. Map to Tailwind as `bg-base`, `bg-card`, `bg-elevated`.

2. **Eliminate pure black/white.** Replace `#000000` with `#0a0a0a`, `#ffffff` with `#f0f0f0` everywhere.

3. **Top-edge card highlight on every card.** `shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] border border-white/[0.06]` -- the Mercury signature.

4. **Inter typeface** with `font-feature-settings: 'cv01','cv02','cv11'` for distinctive alternate glyphs.

### P2 -- Typography

5. **Negative tracking on headings.** Everything >24px gets `tracking-tight` or `tracking-tighter`.

6. **Financial numbers:** subdued decimals at 60-75% size in `text-white/50`. Tabular figures for columns (`font-variant-numeric: tabular-nums`).

7. **Line-height:** 1.6 for body, 1.1 for display headings.

### P3 -- Components

8. **Pill CTAs** (`rounded-full`) for buttons, `rounded-xl` for cards. Round = action, rectangular = content.

9. **Sidebar opacity states:** default `text-white/60`, hover `text-white/80 bg-white/[0.04]`, active `text-white bg-white/[0.08]`.

10. **Command palette (Cmd+K)** -- essential for power-user real estate investors.

### P4 -- Restraint

11. **Ban card gradients.** Allow only on: landing hero CTA, chart fills at <15% opacity, subtle page radial.

12. **Ban box-shadow for depth.** Use background color layers. Exception: command palette overlay.

13. **One accent per viewport.** If olive CTA is visible, nothing else uses that color at full saturation.

14. **No hover scale on cards.** Border brightness change only: `hover:border-white/[0.12]`.

### P5 -- Cross-reference

15. **Stripe's chart palette** for Recharts: `#635bff` `#00d4aa` `#ff7eb3` `#ffb224`.

16. **Linear's 200ms transitions** (snappier than Mercury's 300ms for a power-user tool).

17. **Vercel's entrance animation** via Framer Motion: `initial={{ opacity:0, y:8 }}` / `animate={{ opacity:1, y:0 }}` with staggered `delay: index * 0.05`.

---

## Appendix: Tailwind Config Snippet

```ts
{
  colors: {
    base: '#0a0a0a', card: '#141414', elevated: '#1e1e1e', overlay: '#242424',
    border: { DEFAULT: 'rgba(255,255,255,0.06)', hover: 'rgba(255,255,255,0.12)', focus: 'rgba(77,124,15,0.5)' },
    text: { primary: '#f0f0f0', secondary: 'rgba(245,245,247,0.6)', tertiary: 'rgba(245,245,247,0.3)' },
  },
  borderRadius: { card: '12px', button: '9999px', input: '8px' },
  fontSize: {
    'display': ['48px', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
    'heading': ['32px', { lineHeight: '1.15', letterSpacing: '-0.015em', fontWeight: '600' }],
    'title':   ['24px', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '600' }],
    'body':    ['16px', { lineHeight: '1.6', letterSpacing: '0', fontWeight: '400' }],
    'ui':      ['14px', { lineHeight: '1.4', letterSpacing: '0.01em', fontWeight: '500' }],
    'caption': ['12px', { lineHeight: '1.35', letterSpacing: '0.02em', fontWeight: '500' }],
  },
}
```

*End of Mercury Design Audit -- Agent 01*
