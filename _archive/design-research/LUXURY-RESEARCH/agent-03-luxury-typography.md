# Luxury Dark Interface Typography Research

> Research for Parcel Platform redesign. Covers font selection, rendering,
> financial number formatting, and type scale for a dark luxury aesthetic.
> Stack context: React 18 + TypeScript + Vite + Tailwind CSS.

---

## 1. Font Comparison for Luxury Dark Interfaces

### Sans-Serif Candidates

| Font | Thin (300) Quality | Licensing | Variable | x-height | Personality |
|---|---|---|---|---|---|
| **DM Sans** | Good but slightly wide; 300 feels casual | Free (Google) | Yes (100-1000) | Tall | Friendly geometric, Google Material lineage |
| **Geist** | Excellent; Swiss precision at 300 | Free (OFL) | Yes (100-900) | Tall | Clinical, developer-forward, Helvetica DNA |
| **Satoshi** | Outstanding; 300 is refined, not frail | Free (Fontshare) | Yes (300-900) | Medium-tall | Confident geometric with humanist warmth |
| **Plus Jakarta Sans** | Decent; slightly soft at 300 | Free (Google) | Yes (200-800) | Tall | Friendly, rounded terminals, approachable |
| **General Sans** | Very good; clean 300 | Free (Fontshare) | Yes (200-700) | Medium-tall | Neutral geometric, modern workhorse |
| **Roobert** | Good; 300 feels architectural | Paid ($) | Yes (3-axis) | Medium | Geometric with Moog-inspired character, "bent pipe" punctuation |
| **Circular** | Premium; the gold standard thin weight | Paid ($$$$) | No (static) | Medium | The original "startup luxury" sans. Used by Spotify, Airbnb |
| **GT Walsheim** | Excellent; warm geometric at 300 | Paid ($$$) | No (static) | Medium | Grilli Type classic, geometric with personality |

### Ranking for Luxury Dark Heading Use (300 weight)

1. **Satoshi** -- The 300 weight holds up perfectly on dark backgrounds without looking anemic. The geometric construction gives it authority. Already loaded in Parcel as `font-brand`.
2. **Geist** -- Extremely clean at 300. Swiss precision reads as luxury-tech. Free. But personality is colder than Satoshi.
3. **GT Walsheim** -- Beautiful at 300 but expensive licensing ($500+ for web) and no variable font makes it impractical.
4. **Circular** -- The industry benchmark, but Lineto licensing is $3,000+ for web. Static weights only. Overused by 2024.
5. **General Sans** -- Strong free alternative. The 300 is crisp but lacks the character differentiation of Satoshi.
6. **DM Sans** -- Too wide and casual at 300 for luxury. Better at 400-500 for body text.
7. **Plus Jakarta Sans** -- The rounded terminals undermine the luxury aesthetic at thin weights.
8. **Roobert** -- Interesting character but the mono-linear design at 300 can look too uniform on dark.

### Key Observation

Satoshi and Geist both benefit from being variable fonts with a true 300 weight axis, meaning you can micro-tune to 310 or 320 if 300 feels too thin on certain displays. This is impossible with static-weight commercial fonts like Circular.

---

## 2. Thin Weights (300) on Dark Backgrounds

### Why 300 Works Better on Dark Than Light

On light backgrounds, thin strokes (300 weight) lose contrast against white -- the strokes can visually dissolve due to irradiation (the optical illusion where bright backgrounds make dark objects appear thinner). On dark backgrounds, the opposite occurs: light-colored text on dark backgrounds appears slightly heavier due to the halation effect (light text bleeds outward into the dark surround). This means:

- **300 weight on dark** reads visually similar to **350-400 on light**
- You get the elegance of thin type without the readability penalty
- This is why luxury brands (Porsche, Rolex, Cartier) use thin weights almost exclusively on dark

### Fonts With the Best 300 for Headings on Dark

1. **Satoshi 300** -- Stroke width is consistent, no thin-thick variation that would create weak spots. The geometric bowls (o, e, a) hold their shape.
2. **Geist Thin/UltraLight** -- Even thinner options (100-200) available if 300 feels too heavy. The vertical metrics are optimized for screen.
3. **Inter 300** -- Surprisingly good due to its tall x-height, but Inter at 300 reads more as "UI" than "luxury." Better reserved for body text.

### Practical Threshold

Never go below 300 weight for body text on dark backgrounds, even with antialiased rendering. For headings at 36px+, you can safely use 200 (ultralight) with select fonts. Below 28px, stay at 300 minimum.

---

## 3. Letter-Spacing: Why Negative Tracking Works on Dark

### The Physics of Light Text on Dark Backgrounds

When light-colored text sits on a dark background, each letterform's glow bleeds outward (halation). This perceptual expansion increases the apparent spacing between characters. The result: text that looks perfectly tracked on a light background will look loose and disconnected on a dark background.

### Compensation Values

| Element | Light Background | Dark Background | Delta |
|---|---|---|---|
| Display headings (36px+) | -0.02em | -0.03em to -0.04em | -0.01 to -0.02em tighter |
| Section headings (24-36px) | -0.015em | -0.025em | -0.01em tighter |
| Body text (14-16px) | 0em | -0.005em to -0.01em | Slight tightening |
| Small text (11-12px) | +0.01em | 0em | Remove positive tracking |
| ALL CAPS labels | +0.05em | +0.03em | Reduce positive tracking |

### Tailwind Implementation

```ts
// tailwind.config.ts -- extend letterSpacing for dark luxury
letterSpacing: {
  'display':  '-0.035em',   // hero headings on dark
  'heading':  '-0.025em',   // section headings on dark
  'tight':    '-0.015em',   // subheadings
  'body':     '-0.006em',   // body text on dark
  'normal':   '0em',
  'caps':     '0.04em',     // uppercase labels (reduced from 0.05)
}
```

### Why This Feels Premium

Negative tracking on dark backgrounds creates visual density. The letterforms feel like they belong together as a single unit rather than a string of isolated characters. This is the typographic equivalent of close-set diamonds in a pavé ring -- density signals quality. Loose tracking on dark reads as "default" or "template."

---

## 4. Font Rendering on Dark Backgrounds

### `-webkit-font-smoothing` and Its Impact

There are three rendering modes on macOS/WebKit:

| Value | Rendering | Effect on Dark |
|---|---|---|
| `auto` (default) | Subpixel antialiasing on light, antialiased on dark | Inconsistent across themes |
| `antialiased` | Grayscale antialiasing | Text appears thinner and crisper. Best for dark backgrounds. |
| `subpixel-antialiased` | Uses RGB subpixels | Text appears heavier/bolder. Causes color fringing on dark backgrounds. |

### Why Dark Backgrounds MUST Use `antialiased`

Subpixel antialiasing was designed for dark-on-light text. On dark backgrounds with light text, it creates visible color fringing (red/blue halos on edges). Every luxury dark interface must use grayscale antialiasing. Parcel already applies this via Tailwind's `antialiased` class -- correct.

### Weight Compensation

`antialiased` makes text ~20-30% thinner than `subpixel-antialiased`. Halation on dark compensates for half. Net: text appears ~10-15% thinner. This is why 400 weight body on dark reads like 350 -- elegant without being frail.

### Variable Font Precision

Variable fonts allow fine-tuning to non-standard weights (320, 350, 450). On dark backgrounds, use this to hit the exact optical target:

```css
.dark .heading-thin { font-weight: 320; font-variation-settings: 'wght' 320; }
```

---

## 5. Type Scale for Luxury: Size vs Weight Strategy

Premium financial interfaces (Mercury, Stripe Dashboard, Linear) use a **bimodal** approach: KPI/hero numbers at large size (32-48px) / thin weight (300-400) / max negative tracking, and data tables at small size (12-14px) / medium weight (450-500) / neutral tracking. **The gap between these two levels IS the luxury signal.** The amateur mistake: medium sizes (20-24px) at medium weights (500) for everything -- flat hierarchy reads as "template."

### Recommended Parcel Scale (Dark Luxury)

```ts
// Luxury-tuned type scale for dark interface
fontSize: {
  'hero':    ['56px', { lineHeight: '1.05', letterSpacing: '-0.04em',  fontWeight: '300' }],
  'display': ['40px', { lineHeight: '1.1',  letterSpacing: '-0.035em', fontWeight: '300' }],
  'kpi':     ['32px', { lineHeight: '1.15', letterSpacing: '-0.03em',  fontWeight: '400' }],
  'h1':      ['28px', { lineHeight: '1.2',  letterSpacing: '-0.025em', fontWeight: '400' }],
  'h2':      ['22px', { lineHeight: '1.3',  letterSpacing: '-0.02em',  fontWeight: '500' }],
  'h3':      ['18px', { lineHeight: '1.4',  letterSpacing: '-0.015em', fontWeight: '500' }],
  'body':    ['14px', { lineHeight: '1.6',  letterSpacing: '-0.006em', fontWeight: '400' }],
  'sm':      ['13px', { lineHeight: '1.5',  letterSpacing: '0',        fontWeight: '400' }],
  'xs':      ['11px', { lineHeight: '1.45', letterSpacing: '0.01em',   fontWeight: '500' }],
  'micro':   ['10px', { lineHeight: '1.4',  letterSpacing: '0.04em',   fontWeight: '500' }],
}
```

---

## 6. Displaying Financial Numbers Luxuriously

### Core CSS Properties

```css
.financial-display {
  font-variant-numeric: tabular-nums lining-nums;
  font-feature-settings: 'tnum' 1, 'lnum' 1;
  letter-spacing: -0.025em;
  font-weight: 300; /* thin for luxury on dark */
}
```

**`tabular-nums`**: Equal-width digits so columns align and numbers don't jump during animation. Non-negotiable for financial data.

**`lining-nums`**: Uppercase-style digits that sit on the baseline. Old-style (lowercase) digits look editorial but wrong for financial data.

### Superscript Cents Pattern

The Mercury/Stripe pattern: display dollars large, cents small and raised. This creates visual hierarchy within a single number.

```tsx
// React component for luxury financial display
function LuxuryPrice({ amount }: { amount: number }) {
  const dollars = Math.floor(amount);
  const cents = Math.round((amount - dollars) * 100)
    .toString()
    .padStart(2, '0');

  return (
    <span className="font-brand tabular-nums lining-nums tracking-[-0.03em]">
      <span className="text-[0.6em] align-super opacity-60 mr-[0.05em]">$</span>
      <span className="font-light">{dollars.toLocaleString()}</span>
      <span className="text-[0.5em] align-super opacity-50 ml-[0.02em]">
        .{cents}
      </span>
    </span>
  );
}
```

### Currency Symbol Sizing

The luxury approach: the dollar sign should be visually subordinate to the number. It signals "this is currency" without competing for attention.

| Element | Size Relative to Number | Alignment | Opacity on Dark |
|---|---|---|---|
| Currency symbol ($) | 55-65% | superscript or baseline with smaller size | 50-70% |
| Decimal point | 100% | baseline | 40-50% |
| Cents digits | 50-55% | superscript | 45-55% |
| Comma separators | 100% | baseline | 40-50% (or use thin-space instead) |
| Plus/minus sign | 70% | baseline | 60% |

### Thin Colons for Time/Ratio Display

For cap rate displays ("5:1") or timestamps, use `font-weight: 200; opacity: 0.4; margin: 0 0.05em` on the colon, or substitute Unicode thin colon U+FE55 (`﹕`).

### Comma vs Thin-Space for Thousands

Luxury interfaces replace commas with thin spaces (`\u2009`) for large numbers: `$1 250 000`. This is the European/ISO standard. For US real estate audience, compromise: thin spaces in hero/KPI displays, commas in tables.

### Negative Numbers: Avoid Bright Red

Use softened red (`rgba(248,113,113, 0.8)` -- red-400 at 80%) or parentheses (`($12,500)`) instead of minus signs. Parentheses read as "institutional finance" rather than "spreadsheet."

---

## 7. Heading Hierarchy: Premium vs Template

### Template vs Premium: The Signals

| Template | Premium |
|---|---|
| Uniform weight (600-700 everywhere) | Weight decreases as size increases (56px/300, 22px/500) |
| Small size jumps (24, 20, 18px) | Large size jumps (40, 22, 14px) |
| Positive letter-spacing on headings | Negative tracking (-0.03em or tighter) |
| System font, no OpenType features | Mixed families + activated `cv02`, `cv03`, `cv11` |
| Same font headings + body | Satoshi headings, Inter body/data |
| Single text color | Color hierarchy: 95% / 60% / 35% white |

### Concrete Heading Stack for Parcel (Dark)

| Level | Font | Weight | Size | Tracking | Color |
|---|---|---|---|---|---|
| Display / Page title | Satoshi | 300 | 40px | -0.035em | `rgba(241,245,249, 0.95)` |
| Section heading | Satoshi | 500 | 22px | -0.02em | `rgba(241,245,249, 0.88)` |
| Card heading | Inter | 500 | 14px | -0.006em | `rgba(241,245,249, 0.80)` |
| KPI number | Satoshi | 300 | 32px | -0.03em | `rgba(241,245,249, 0.95)` + `tabular-nums lining-nums` |

### The White Color Trap

Pure `#FFFFFF` text on dark backgrounds creates excessive contrast that causes eye strain. Luxury dark interfaces use off-whites:

| Use | Color | Tailwind Approximation | Opacity Approach |
|---|---|---|---|
| Primary text / headings | `#F1F5F9` (slate-100) | `text-slate-100` | `text-white/95` |
| Secondary text | `#94A3B8` (slate-400) | `text-slate-400` | `text-white/60` |
| Muted / placeholder | `#475569` (slate-600) | `text-slate-600` | `text-white/35` |
| Disabled | `#334155` (slate-700) | `text-slate-700` | `text-white/20` |

Parcel's current dark theme tokens (`--text-primary: #F1F5F9`) already follow this pattern correctly.

---

## 8. Body Text on Dark: Optimal Parameters

Dark body text needs wider line-height and reduced contrast vs light. WCAG AA requires 4.5:1, but perceptually comfortable dark reading is 8:1 to 12:1 (not maximum 21:1).

### Optimal Values

| Property | Value | Rationale |
|---|---|---|
| Font | Inter Variable | Tall x-height, excellent hinting, tabular nums built in |
| Size | 14px | Minimum comfortable reading size on dark. 13px acceptable for UI chrome. |
| Weight | 400 | With `antialiased` rendering, 400 on dark reads like 380 -- elegant. Do not go below 400 for body. |
| Line-height | 1.6 (22.4px at 14px) | Dark backgrounds need more leading. 1.5 minimum, 1.6-1.7 for long-form. |
| Letter-spacing | -0.006em | Slight negative to compensate for halation spread |
| Color | `#CBD5E1` (slate-300) | 10.5:1 contrast on `#08080F`. Comfortable, not blinding. |
| Max-width | 65ch | Standard measure for readability. Critical for dark -- long lines cause more eye strain on dark. |
| Paragraph spacing | 1.25em (17.5px) | Slightly more than light backgrounds to reduce visual density |

### OpenType Features for Body (Inter)

```css
body { font-feature-settings: 'cv02','cv03','cv04','cv11','ss01','zero'; }
/* cv02=open 4, cv03=open 6/9, cv04=open i, cv11=single-story a,
   ss01=open digits, zero=slashed zero (financial disambiguation) */
```

These `cv` features differentiate Inter from system fonts and give Parcel a distinctive text texture.

---

## 9. Monospace Fonts for AI Chat

### Comparison

| Font | Character | Width | Ligatures | Weight Range | Licensing | Best For |
|---|---|---|---|---|---|---|
| **JetBrains Mono** | Technical, square | Narrow (0.6em) | 138 ligatures | 100-800 | Free (OFL) | Code blocks, terminal output |
| **Fira Code** | Rounded, friendly | Medium (0.6em) | 100+ ligatures | 300-700 | Free (OFL) | General code display, wider audience |
| **SF Mono** | Apple ecosystem, precise | Narrow | None | 6 weights | Apple license (restricted) | macOS-native feel, but cannot self-host |
| **Berkeley Mono** | Luxurious, proportional feel | Narrow | Some | 4 weights | Paid ($75 personal) | Premium AI interfaces, distinctive look |

### Recommendation: JetBrains Mono (already loaded)

Correct choice: narrow width saves horizontal space in chat, variable font already bundled via Fontsource, weight range 100-800 allows thin code on dark (use 300-400), 138 programming ligatures polish AI output, free/OFL licensed. **Berkeley Mono** ($500 commercial) would be the premium upgrade for differentiation, but not a priority.

### Mono Styling for Dark Luxury Chat

```css
.ai-code-block {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 350; font-size: 13px; line-height: 1.6; letter-spacing: 0em;
  font-feature-settings: 'liga' 1, 'calt' 1;
  color: rgba(226, 232, 240, 0.85);
  background: rgba(15, 15, 26, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px; padding: 16px;
}
.ai-inline-code {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 400; font-size: 0.9em;
  padding: 0.15em 0.4em; border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(226, 232, 240, 0.9);
}
```

Key rule: monospace should NOT have negative tracking -- letterforms need their natural spacing.

---

## 10. Font Loading Strategy

### Current State

Parcel loads Inter and JetBrains Mono via Fontsource (bundled into Vite build) and Satoshi as a self-hosted variable WOFF2. This is already a strong strategy.

### FOUT Prevention

FOUT (Flash of Unstyled Text) is more jarring on dark backgrounds because system fonts render at different weights than web fonts, causing visible reflow. Three strategies:

**1. Fontsource bundling (Inter, JetBrains Mono):** Already resolved at build time by Vite and inlined into CSS. Zero FOUT. Ideal for SPA.

**2. `font-display: swap` + metrics matching for Satoshi:**

```css
@font-face {
  font-family: 'Satoshi Fallback';
  src: local('BlinkMacSystemFont'), local('Segoe UI'), local('system-ui');
  ascent-override: 100%; descent-override: 22%;
  line-gap-override: 0%; size-adjust: 104%; /* Satoshi is ~4% wider than system-ui */
}
```

Reference both in stack: `font-family: 'Satoshi', 'Satoshi Fallback', system-ui, sans-serif;`

**3. Preload Satoshi** in `index.html` to eliminate the 100-300ms delay before `@font-face` is parsed:

```html
<link rel="preload" href="/fonts/Satoshi-Variable.woff2"
      as="font" type="font/woff2" crossorigin />
```

### Performance Budget

Total: ~240KB WOFF2 (Inter ~100KB + JetBrains Mono ~95KB bundled via Fontsource, Satoshi ~45KB self-hosted + preload). Well within budget. Subsetting not necessary -- all three support Latin Extended.

---

## 11. What Font Mercury Actually Uses

Mercury (mercury.com) uses a **custom proprietary typeface** within their "Arcadia" design system. The CSS classes reference `arcadia-display-3`, `arcadia-body-1`, and `arcadia-ui-1` as typographic scales, and the font files are served from their CDN as hashed WOFF2 files without exposed family names.

Based on visual analysis: headings use a custom geometric sans (Circular/GT Walsheim DNA, tuned for their dark palette), body uses a custom grotesk optimized for 13-14px data-dense UI, and numbers use custom tabular figures with the superscript-cents pattern from section 6.

**You cannot use Mercury's font.** But the reason it feels premium is not the typeface -- it is the system around it:

1. Thin weight (300) on dark at large sizes
2. Aggressive negative tracking (-0.03em to -0.04em)
3. High contrast between heading size and body size
4. Off-white text colors (never pure white)
5. Generous whitespace around type elements

All achievable with Satoshi + Inter.

---

## RECOMMENDATIONS FOR PARCEL

1. **Keep Satoshi as the heading/brand font.** It is already loaded, free, variable, and its 300 weight is among the best available for dark luxury interfaces. No font change needed -- only weight and tracking adjustments.

2. **Keep Inter as the body/UI/financial font.** Its tabular numerals, tall x-height, and extensive OpenType features (`cv02`, `cv03`, `cv04`, `cv11`) make it the strongest choice for a data-heavy financial SaaS. Already bundled via Fontsource with zero FOUT.

3. **Shift heading weight from current values to 300 (display) and 400-500 (section).** The current design likely uses 500-700 for headings. On the new dark background, drop to 300 for display/KPI headings and 500 for section headings. This single change creates the most dramatic luxury improvement.

4. **Increase negative letter-spacing on all headings.** Apply `-0.035em` on display (40px+), `-0.025em` on section headings (22-28px), and `-0.015em` on subheadings (18px). The current Tailwind config has these partially defined -- extend them as shown in section 3.

5. **Implement the superscript-cents pattern for financial displays.** Dollar sign at 60% size, cents at 50% size and superscripted, both with reduced opacity. This is the highest-impact visual refinement for a financial product. Use the `LuxuryPrice` component pattern from section 6.

6. **Use `font-weight: 350` for JetBrains Mono in AI chat.** The variable font supports arbitrary weights. 350 on dark backgrounds reads as crisp and intentional -- lighter than default 400 without being fragile.

7. **Activate Inter's `'zero' 1` feature setting for financial contexts.** Slashed zeros prevent ambiguity between 0 and O in financial data. Add it to the existing `font-feature-settings` declaration.

8. **Add a Satoshi preload tag to `index.html`.** This eliminates the only remaining FOUT risk in the current font loading strategy.

9. **Set body text to `#CBD5E1` (slate-300) on dark backgrounds, not `#F1F5F9`.** The current `--text-primary` is too bright for comfortable body reading on dark. Reserve `#F1F5F9` for headings and KPIs only. Body should be 2 stops dimmer.

10. **Never use pure white (`#FFFFFF`) for any text element.** Cap text brightness at `#F1F5F9` (slate-100) for maximum emphasis. This avoids the "cheap LED sign" look that pure white creates on dark interfaces.

11. **For the KPI number scale, consider Satoshi at 300 weight instead of Inter at 700.** The current `.text-kpi-display` uses `font-weight: 700` and `-0.025em` tracking. Switching to Satoshi 300 at 32-40px with `-0.03em` tracking will immediately shift the aesthetic from "SaaS dashboard" to "luxury fintech."

12. **If budget allows later, evaluate Berkeley Mono ($500 commercial) as a premium upgrade for AI chat.** It would differentiate Parcel's chat experience from competitors. Not a priority -- JetBrains Mono at 350 weight is already excellent.
