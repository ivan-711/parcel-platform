# Typography Research: Font Selection for Data-Heavy Financial Interfaces

**Context:** Parcel — real estate deal analysis SaaS. React + Vite + Tailwind CSS.
**Current setup:** Satoshi (variable, self-hosted) for body, JetBrains Mono (Google Fonts link) for financial numbers. Dark theme, `#08080F` base.
**Target direction:** Light theme, data-dense, Mercury/Linear/Stripe-inspired density.

---

## 1. Font Comparison — Sans-Serif Candidates

### Inter (Rasmus Andersson)
- **x-height:** Very tall (makes text feel larger at same px). Best legibility at 12-13px.
- **Tabular figures:** Yes, via `font-feature-settings: 'tnum' 1`. Lining by default.
- **Weights available:** 100-900 variable. Italic axis included.
- **Character width:** Medium. Neutral, geometric-humanist hybrid.
- **Used by:** Linear, Vercel dashboard, Raycast, Resend.
- **Verdict:** Industry standard for data UIs. Tall x-height means you can set body at 13px and it still reads cleanly. The "safe" choice — so ubiquitous it carries no brand signal.

### Plus Jakarta Sans (Tokotype)
- **x-height:** Tall, similar to Inter but slightly wider characters.
- **Tabular figures:** No native OpenType `tnum` feature. Numbers are proportional only.
- **Weights available:** 200-800 variable.
- **Character width:** Wider than Inter — takes more horizontal space in tables.
- **Used by:** Framer, some fintech startups.
- **Verdict:** Friendly and modern, but wider characters hurt data density in tables. No tabular figures is a dealbreaker for financial columns.

### DM Sans (Colophon Foundry for Google)
- **x-height:** Tall. Geometric with soft terminals.
- **Tabular figures:** Yes, `'tnum' 1` supported.
- **Weights available:** 100-1000 variable. Italic axis.
- **Character width:** Compact — narrower than Inter, which helps density.
- **Used by:** Notion (headings), various SaaS.
- **Verdict:** Good density, slightly more geometric/friendly personality than Inter. Tabular figures work. Compact width is a genuine advantage for table-heavy layouts. Worth considering for headings paired with Inter body.

### Geist Sans (Vercel)
- **x-height:** Very tall. Designed explicitly for developer/data interfaces.
- **Tabular figures:** Yes, `'tnum' 1` supported. Also has `'ss01'` for alternate digits.
- **Weights available:** 100-900 variable. No italic axis (uses slant).
- **Character width:** Tight. Optimized for dense UI.
- **Used by:** Vercel (v0, dashboard), Next.js docs.
- **Verdict:** Purpose-built for data density. The tightest character width of all candidates. Excellent number rendering. Limitation: no true italic — uses oblique/slant, which feels less refined in long-form content. License is SIL Open Font, free for commercial use.

### Satoshi (Indian Type Foundry)
- **x-height:** Medium-tall. Contemporary geometric sans.
- **Tabular figures:** Limited. The variable font does not expose a reliable `tnum` OpenType feature.
- **Weights available:** 300-900 variable.
- **Character width:** Medium. Balanced proportions.
- **Used by:** Parcel (current).
- **Verdict:** Distinctive, modern personality. Good for brand differentiation. However, proportional figures only — not ideal as the primary number font in data tables. Current usage paired with JetBrains Mono for numbers is the right mitigation.

### General Sans (Indian Type Foundry)
- **x-height:** Medium. Similar family as Satoshi, slightly more neutral.
- **Tabular figures:** No reliable `tnum` feature.
- **Weights available:** 200-700 variable.
- **Character width:** Medium.
- **Verdict:** Less distinctive than Satoshi with the same tabular-figure limitation. No advantage over current setup.

### Summary Table

| Font             | tnum | x-height | Width   | Variable | Best role         |
|------------------|------|----------|---------|----------|-------------------|
| Inter            | Yes  | Tall     | Medium  | Yes      | Body + data       |
| Plus Jakarta Sans| No   | Tall     | Wide    | Yes      | Headings only     |
| DM Sans          | Yes  | Tall     | Compact | Yes      | Body + headings   |
| Geist Sans       | Yes  | Very tall| Tight   | Yes      | Data UI body      |
| Satoshi          | No   | Med-tall | Medium  | Yes      | Brand headings    |
| General Sans     | No   | Medium   | Medium  | Yes      | No clear advantage|

---

## 2. Tabular/Lining Figures — Why They Matter for Financial Data

Tabular lining figures ensure every digit occupies the same horizontal width. This is non-negotiable for:
- Right-aligned currency columns ($1,234 vs $987 — digits must stack vertically)
- Percentage columns in comparison tables
- KPI cards where numbers animate/change

### Fonts with native tabular lining figures
- **Inter** — `font-feature-settings: 'tnum' 1, 'lnum' 1`
- **DM Sans** — `font-feature-settings: 'tnum' 1`
- **Geist Sans** — `font-feature-settings: 'tnum' 1`
- **JetBrains Mono** — monospace by definition (all chars equal width)
- **Fira Code** — monospace fallback
- **IBM Plex Mono** — monospace alternative

### CSS for tabular figures
```css
/* Apply to any element showing financial data */
.tabular-nums {
  font-variant-numeric: tabular-nums lining-nums;
  /* Equivalent to: font-feature-settings: 'tnum' 1, 'lnum' 1; */
}
```

Tailwind ships `tabular-nums` as a utility class. Use it on table cells, KPI values, and any animated number.

### The JetBrains Mono question
JetBrains Mono is an excellent monospace for code. For financial data specifically, its wide character width (inherent to monospace) wastes horizontal space compared to a proportional font with tabular figures enabled. A `$1,234,567` in JetBrains Mono is ~30% wider than in Inter with `tnum`. In a data-dense interface, this matters.

**Recommendation:** Keep JetBrains Mono for code snippets or AI chat output. Switch financial numbers to the body font with `tabular-nums` enabled (if using Inter, Geist, or DM Sans). If you want visual distinction for key financial figures (KPI hero numbers), use a heavier weight of the body font rather than switching to monospace.

---

## 3. Font Pairing Strategy

### Option A: Single-Family (Stripe model)
```
Headings:  Inter 600
Body:      Inter 400
Labels:    Inter 500, 11px, uppercase tracking
Data:      Inter 500 + tabular-nums
Code/AI:   JetBrains Mono 400
```
Pros: Zero cognitive load switching between fonts. Fastest load. Stripe, Linear, Mercury all use one sans-serif family.
Cons: Less brand personality.

### Option B: Two-Family (brand + utility)
```
Headings:  Satoshi 700 (keep current brand identity)
Body:      Inter 400
Labels:    Inter 500, 11px
Data:      Inter 500 + tabular-nums
Code/AI:   JetBrains Mono 400
```
Pros: Satoshi headings preserve Parcel's current identity. Inter handles the data-heavy lifting.
Cons: Two variable fonts to load (~45KB + ~90KB).

### Option C: Geist-native (Linear/Vercel model)
```
Headings:  Geist Sans 600
Body:      Geist Sans 400
Labels:    Geist Sans 500, 11px
Data:      Geist Sans 500 + tabular-nums
Code/AI:   Geist Mono 400
```
Pros: Purpose-built for this exact use case. Tightest density. Geist Mono pairs perfectly.
Cons: Strong Vercel association — may feel derivative. No true italics.

### Option D: DM Sans + Inter data
```
Headings:  DM Sans 700
Body:      DM Sans 400
Labels:    DM Sans 500, 11px
Data:      DM Sans 500 + tabular-nums
Code/AI:   JetBrains Mono 400
```
Pros: Compact width aids density. Slightly warmer personality than Inter.
Cons: Less proven at very small sizes (10-11px labels).

---

## 4. Font Loading and Performance

### Loading strategies ranked by performance

**1. Self-hosted variable font (best)**
```html
<!-- preload in index.html <head> -->
<link rel="preload" href="/fonts/Inter-Variable.woff2" as="font" type="font/woff2" crossorigin>
```
```css
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url('/fonts/Inter-Variable.woff2') format('woff2-variations');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6,
                 U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122,
                 U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
```
- Single HTTP request, no third-party DNS lookup.
- Variable font = one file for all weights (Inter variable: ~90KB woff2).
- `font-display: swap` prevents invisible text.
- `unicode-range` subsetting reduces payload if you split Latin/Latin-ext.

**2. Fontsource (npm package)**
```bash
npm install @fontsource-variable/inter
```
```ts
// main.tsx
import '@fontsource-variable/inter';
```
- Bundles font into your Vite build. No external requests.
- Automatic subsetting by unicode range.
- Inter variable via Fontsource: ~95KB total.
- Tree-shakes unused unicode ranges in production.

**3. Google Fonts with `<link>` (current JetBrains Mono approach)**
- Extra DNS lookup to `fonts.googleapis.com` + `fonts.gstatic.com`.
- CSS file fetched, then font files fetched — two round trips.
- Google may serve different files to different browsers (optimization or inconsistency).
- Adds ~100-200ms on first load vs self-hosted.

### FOUT/FOIT Prevention
```css
@font-face {
  font-display: swap; /* Show fallback immediately, swap when loaded */
}
```
To minimize layout shift when swapping from system font to custom font:
```css
body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  /* System fonts have similar metrics to Inter — minimal CLS */
}
```
For aggressive optimization, use `font-display: optional` on non-critical weights (italic, 100, 900). The browser will skip them entirely if not cached, avoiding any FOUT for those variants.

### File size budget
| Font                      | Format    | Size     |
|---------------------------|-----------|----------|
| Inter Variable (Latin)    | woff2     | ~90KB    |
| Satoshi Variable (Latin)  | woff2     | ~45KB    |
| Geist Sans Variable       | woff2     | ~75KB    |
| DM Sans Variable          | woff2     | ~65KB    |
| JetBrains Mono Variable   | woff2     | ~110KB   |
| Geist Mono Variable       | woff2     | ~55KB    |

Single-family approach (Inter only + JetBrains Mono for code): ~200KB total.
Two-family (Satoshi headings + Inter body + JetBrains Mono): ~245KB total.

---

## 5. Size Scale for Data-Heavy Interfaces

Mercury, Linear, and Stripe all use smaller base sizes than typical marketing sites. Their dashboards operate at 13-14px base, with labels as small as 10-11px.

### Recommended type scale (data-dense)
```js
// tailwind.config.js
fontSize: {
  'micro':  ['10px', { lineHeight: '14px', letterSpacing: '0.04em' }],
  'xs':     ['11px', { lineHeight: '16px', letterSpacing: '0.01em' }],
  'sm':     ['12px', { lineHeight: '16px', letterSpacing: '0' }],
  'base':   ['13px', { lineHeight: '20px', letterSpacing: '0' }],
  'md':     ['14px', { lineHeight: '20px', letterSpacing: '-0.006em' }],
  'lg':     ['16px', { lineHeight: '24px', letterSpacing: '-0.011em' }],
  'xl':     ['18px', { lineHeight: '26px', letterSpacing: '-0.014em' }],
  '2xl':    ['22px', { lineHeight: '28px', letterSpacing: '-0.019em' }],
  '3xl':    ['28px', { lineHeight: '34px', letterSpacing: '-0.021em' }],
  '4xl':    ['36px', { lineHeight: '42px', letterSpacing: '-0.022em' }],
  'kpi':    ['32px', { lineHeight: '38px', letterSpacing: '-0.025em' }],
}
```

### How sizes map to UI elements
| Element                    | Size   | Weight | Notes                            |
|----------------------------|--------|--------|----------------------------------|
| Table cell data            | `sm`   | 400    | 12px, tight rows                 |
| Table header               | `xs`   | 600    | 11px, uppercase, wider tracking  |
| Form labels                | `sm`   | 500    | 12px                             |
| Body text / descriptions   | `base` | 400    | 13px                             |
| Sidebar nav items          | `sm`   | 500    | 12px                             |
| Card titles                | `md`   | 600    | 14px                             |
| Section headings           | `lg`   | 600    | 16px                             |
| Page titles                | `xl`   | 600    | 18px                             |
| KPI hero numbers           | `kpi`  | 700    | 32px with tabular-nums           |
| KPI labels                 | `xs`   | 500    | 11px, muted color                |
| Badges / tags              | `micro`| 500    | 10px, uppercase                  |
| Breadcrumbs                | `xs`   | 400    | 11px                             |

---

## 6. Weight Usage

### Why 500 matters more than 400 in data UIs
On light backgrounds, 400 (regular) can feel too thin for small text (11-12px). Data-dense interfaces like Linear default to 500 (medium) for most UI text, reserving 400 for long-form paragraphs.

### Weight assignment
```
300 (Light)    — Never use below 16px. Only for decorative large text.
400 (Regular)  — Body paragraphs, long descriptions, chat messages.
500 (Medium)   — Default UI weight: labels, nav, table cells, form values.
600 (Semibold) — Headings, card titles, active nav items, table headers.
700 (Bold)     — KPI hero numbers, page titles. Use sparingly.
800-900        — Marketing/landing page only. Never in the app shell.
```

### Tailwind utilities
```html
<!-- Body paragraph -->
<p class="text-base font-normal">...</p>

<!-- Table cell -->
<td class="text-sm font-medium tabular-nums">$1,234,567</td>

<!-- Section heading -->
<h2 class="text-lg font-semibold tracking-tight">Cash Flow Analysis</h2>

<!-- KPI number -->
<span class="text-kpi font-bold tabular-nums tracking-tighter">$247,500</span>
```

---

## 7. Line Height for Dense Data vs. Long-Form

### Dense data (tables, KPI cards, sidebars)
Ratio: **1.25-1.35x** the font size.
- 12px text / 16px line-height = 1.33x
- 13px text / 18px line-height = 1.38x (slightly looser for readability)

### Long-form content (descriptions, AI chat, deal notes)
Ratio: **1.5-1.6x** the font size.
- 13px text / 20px line-height = 1.54x
- 14px text / 22px line-height = 1.57x

### Table row density
```css
/* Compact table (deal lists, comparisons) */
.table-dense td {
  padding-top: 6px;
  padding-bottom: 6px;
  font-size: 12px;
  line-height: 16px;
}

/* Comfortable table (documents, activity log) */
.table-comfort td {
  padding-top: 10px;
  padding-bottom: 10px;
  font-size: 13px;
  line-height: 20px;
}
```

---

## 8. Letter Spacing

Negative tracking on headings, positive on micro/uppercase text. Zero on body.

### Rules
```
Headings (18px+):     -0.01em to -0.025em  (tighter as size increases)
Body (13-14px):        0em                  (default, no adjustment)
Labels (11-12px):      0em to +0.01em       (very slight opening)
Uppercase text:       +0.04em to +0.06em    (always widen uppercase)
Micro/badges (10px):  +0.04em to +0.06em    (aids legibility at small sizes)
KPI numbers (28px+):  -0.02em to -0.03em    (tighten large numbers)
```

### Why uppercase needs wider tracking
Uppercase letters are designed with tighter sidebearings because they were historically used at the start of words (next to lowercase). When set in all-caps, the default spacing feels cramped. Adding +0.04em to +0.06em restores visual balance.

```html
<!-- Uppercase label -->
<span class="text-xs font-semibold uppercase tracking-wider text-text-secondary">
  MONTHLY CASH FLOW
</span>

<!-- Tight heading -->
<h1 class="text-2xl font-semibold tracking-tight">
  Deal Analysis
</h1>
```

---

## 9. Styling Financial Values

### Currency values
```html
<!-- Standard currency -->
<span class="font-medium tabular-nums">$1,234,567</span>

<!-- Large KPI currency — break into parts for styling -->
<span class="text-kpi font-bold tabular-nums tracking-tighter">
  <span class="text-lg font-semibold align-top">$</span>247,500
</span>
```
The dollar sign is often set slightly smaller than the number itself in premium financial UIs. This creates visual hierarchy where the magnitude (digits) dominates and the symbol is contextual.

### Percentages
```html
<!-- Table cell percentage -->
<span class="font-medium tabular-nums">
  12.4<span class="text-text-secondary">%</span>
</span>

<!-- Positive/negative with color -->
<span class="font-medium tabular-nums text-accent-success">+8.2%</span>
<span class="font-medium tabular-nums text-accent-danger">-3.1%</span>
```

### Large numbers with separators
Always use locale-appropriate formatting. The comma separators should be slightly lighter or thinner than the digits when possible:
```tsx
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
```

### Decimal alignment in tables
```css
/* Right-align all financial columns */
td[data-type="currency"],
td[data-type="percentage"] {
  text-align: right;
  font-variant-numeric: tabular-nums lining-nums;
}
```

### Negative values
Two conventions in financial software:
1. **Parentheses:** `($1,234)` — traditional accounting style
2. **Minus with color:** `-$1,234` in red — modern dashboard style

Parcel should use option 2 (minus + red) for the app, but support option 1 in PDF exports for accounting professionals.

---

## 10. Mobile Typography Adjustments

### Base size bump
Desktop data density (13px base) is too small for mobile touch targets and reading distance. Bump base to 14-15px on mobile.

```js
// tailwind.config.js — use responsive prefixes
// Or handle via CSS custom properties:
```
```css
:root {
  --text-base: 13px;
  --text-sm: 12px;
  --text-xs: 11px;
}

@media (max-width: 640px) {
  :root {
    --text-base: 15px;
    --text-sm: 13px;
    --text-xs: 12px;
  }
}
```

### KPI numbers on mobile
Desktop: `32px` / Mobile: `28px`. Still needs to feel large and scannable.

### Table cells on mobile
Mobile tables should switch from the compact `12px` to `13-14px`. Horizontal scroll is acceptable (already implemented in Parcel) — do not sacrifice legibility to avoid scroll.

### Touch target text
Any text inside a tappable element must be at least `13px` on mobile, with the touch target itself at least `44px` tall (Apple HIG).

### Font weight on mobile
OLED screens render thin fonts with more contrast than LCD. Weight 400 reads clearly on mobile OLED; no need to bump to 500 universally. However, light (300) weight should still be avoided below 16px.

---

## RECOMMENDATIONS FOR PARCEL

### 1. Switch body font from Satoshi to Inter
**Why:** Inter has native tabular lining figures, the tallest x-height for small-size legibility, and is the de facto standard for data-dense SaaS. Satoshi's lack of `tnum` means you must always fall back to JetBrains Mono for any number that needs alignment — this creates a jarring font switch in tables where text and numbers coexist in the same row.

### 2. Keep Satoshi for marketing/landing page headings only
Satoshi has a distinctive personality that differentiates Parcel's brand. Use it on Landing.tsx headings (hero, section titles) but not inside the app shell.

### 3. Demote JetBrains Mono to code/AI-output only
Stop using JetBrains Mono for financial numbers. Instead, use Inter with `tabular-nums` and `font-weight: 500` or `600`. Financial numbers rendered in Inter at the same size will be ~30% narrower, improving data density. Reserve JetBrains Mono for the chat/AI output and any code-formatted content.

### 4. Adopt the data-dense type scale
Drop base from 16px (Tailwind default) to 13px inside the app shell. Use the scale defined in Section 5. This alone will bring Parcel closer to the Mercury/Linear density target.

### 5. Self-host Inter, remove Google Fonts link
Replace the Google Fonts `<link>` for JetBrains Mono with a self-hosted woff2 (or Fontsource npm package). Add Inter as self-hosted variable font. Preload both in `<head>`. This eliminates two third-party DNS lookups and the render-blocking CSS fetch.

### 6. Implement weight hierarchy: 500 as default UI weight
Inside the app shell, set `font-weight: 500` as the baseline for UI elements (nav, labels, table cells). Use 400 only for body paragraphs and chat messages. Use 600 for headings and emphasis. Use 700 only for KPI hero numbers.

### 7. Use the financial number styling patterns from Section 9
Smaller dollar signs, right-aligned tabular columns, color-coded positive/negative values, `Intl.NumberFormat` for locale-safe formatting.

### 8. Concrete Tailwind config changes
```js
// tailwind.config.js
fontFamily: {
  sans: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
  brand: ['"Satoshi"', 'system-ui', 'sans-serif'],      // landing page headings
  mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'], // code + AI output only
},
fontSize: {
  'micro':  ['10px', { lineHeight: '14px', letterSpacing: '0.04em' }],
  'xs':     ['11px', { lineHeight: '16px', letterSpacing: '0.01em' }],
  'sm':     ['12px', { lineHeight: '16px', letterSpacing: '0' }],
  'base':   ['13px', { lineHeight: '20px', letterSpacing: '0' }],
  'md':     ['14px', { lineHeight: '20px', letterSpacing: '-0.006em' }],
  'lg':     ['16px', { lineHeight: '24px', letterSpacing: '-0.011em' }],
  'xl':     ['18px', { lineHeight: '26px', letterSpacing: '-0.014em' }],
  '2xl':    ['22px', { lineHeight: '28px', letterSpacing: '-0.019em' }],
  '3xl':    ['28px', { lineHeight: '34px', letterSpacing: '-0.021em' }],
  '4xl':    ['36px', { lineHeight: '42px', letterSpacing: '-0.022em' }],
  'kpi':    ['32px', { lineHeight: '38px', letterSpacing: '-0.025em' }],
},
```

### 9. CSS additions for index.css
```css
@layer base {
  /* Inter self-hosted */
  @font-face {
    font-family: 'Inter';
    font-style: normal;
    font-weight: 100 900;
    font-display: swap;
    src: url('/fonts/Inter-Variable.woff2') format('woff2-variations');
  }

  /* Financial numbers — now Inter, not JetBrains Mono */
  [data-financial],
  .financial {
    font-variant-numeric: tabular-nums lining-nums;
    font-weight: 500;
  }

  /* App shell base */
  .app-shell {
    font-size: 13px;
    line-height: 20px;
    font-weight: 500;
  }

  /* Long-form content */
  .prose-content {
    font-size: 14px;
    line-height: 22px;
    font-weight: 400;
  }
}
```

### 10. Migration path
1. Install Inter variable woff2 into `public/fonts/`.
2. Add `@font-face` for Inter in `index.css`.
3. Update `tailwind.config.js` fontFamily and fontSize.
4. Remove Google Fonts `<link>` for JetBrains Mono; self-host it instead.
5. Add `font-brand` class to Landing.tsx headings.
6. Remove `font-family: 'JetBrains Mono'` from `.financial` class; replace with `font-variant-numeric: tabular-nums lining-nums`.
7. Audit all `font-mono` usages — keep only on code/AI chat elements.
8. Test at 13px base on all screen sizes; verify mobile bump to 15px.
