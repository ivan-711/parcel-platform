# Typography & Visual Identity Audit — Parcel Platform

**Date:** 2026-03-03
**Scope:** Every file affecting font families, sizes, weights, letter-spacing, and text colors across the entire frontend codebase.

---

## 1. Current Font Stack

### Fonts Loaded (index.html, line 13-16)
```
Inter: wght@400;500;600;700
JetBrains Mono: wght@400;500;600
```
Loaded via a single Google Fonts `<link>` tag with `display=swap` and `preconnect` to both `fonts.googleapis.com` and `fonts.gstatic.com`.

### Tailwind Config (tailwind.config.js, lines 98-101)
```js
fontFamily: {
  sans: ['Inter', 'system-ui', 'sans-serif'],
  mono: ['JetBrains Mono', 'monospace'],
}
```

### CSS Body Default (index.css, line 54)
```css
font-family: 'Inter', system-ui, -apple-system, sans-serif;
```

### Utility Classes Available
- `font-sans` -> Inter
- `font-mono` -> JetBrains Mono
- `.financial` or `[data-financial]` -> JetBrains Mono (index.css, lines 57-61)

### What Is Missing
- **No weight 300 (Light) or 800 (ExtraBold) loaded.** Inter only loads 400/500/600/700. JetBrains Mono only loads 400/500/600. This means `font-light` and `font-extrabold`/`font-black` will fall back to system fonts if used anywhere.
- **No italic variants loaded** for either font. Any `italic` class will use browser faux-italics.
- **No display font.** Both heading and body text use Inter. The design-brief calls Inter the "heading font" but it is functionally the same as the body font. There is no typographic contrast between headings and body copy.

---

## 2. Design Brief Spec vs. Actual Implementation

The design-brief.jsonc (lines 93-108) specifies this type scale:

| Token | Spec | Actually Used? |
|---|---|---|
| `hero` | `clamp(48px, 7vw, 80px), weight 700` | Yes -- hero.tsx line 90 uses inline `style={{ fontSize: 'clamp(48px, 7vw, 80px)' }}` with `font-bold` |
| `h1` | `32px, weight 600` | Inconsistent -- Dashboard uses `text-3xl font-semibold` (30px). MyDeals uses `text-2xl font-semibold` (24px). |
| `h2` | `24px, weight 600` | Overshot -- All landing section h2s use `text-3xl font-semibold` (30px). FinalCTA h2 uses `text-4xl md:text-5xl font-bold` (36-48px). Dashboard h2s use `text-lg font-semibold` (18px). |
| `h3` | `18px, weight 500` | Mixed -- Landing h3 tags use `font-semibold text-text-primary` with no explicit size (defaults to ~14-16px body). HowItWorks h3 uses `text-lg font-semibold` (18px). |
| `body` | `14px, weight 400` | Generally correct via Tailwind default `text-sm` (14px) |
| `small` | `12px, weight 400` | Yes, used heavily as `text-xs` |
| `label` | `11px, weight 500, uppercase, letter-spacing 0.08em` | Partially -- sidebar uses `text-[11px] font-semibold uppercase tracking-wider`. Landing uses `text-[10px] uppercase tracking-[0.15em]`. No consistency. |
| `kpi_large` | `36px JetBrains Mono, weight 600` | KPICard uses `text-3xl font-semibold font-mono` (30px, not 36px). Stats strip uses `text-3xl font-mono font-bold`. |
| `kpi_small` | `20px JetBrains Mono, weight 500` | DemoCard KPI row uses `text-xl font-mono font-semibold` (20px, correct). Deal calculator outputs use `text-xl font-mono font-semibold`. |
| `table_number` | `13px JetBrains Mono, weight 400` | Dashboard table risk scores use `text-sm font-mono font-medium` (14px, close). Pipeline overlay uses `text-[12px] font-mono`. |

---

## 3. Complete Font Size Census

### Sizes Found Across All Files

| Tailwind Class / Style | Actual Size | Where Used |
|---|---|---|
| `style={{ fontSize: 'clamp(48px, 7vw, 80px)' }}` | 48-80px | hero.tsx -- main headline (lines 89-98) |
| `style={{ fontSize: 'clamp(52px, 6vw, 72px)' }}` | 52-72px | how-it-works.tsx -- decorative step numbers (line 148) |
| `text-7xl` | 72px | NotFound.tsx -- 404 number (line 9) |
| `text-4xl md:text-5xl` | 36-48px | final-cta.tsx -- CTA headline (line 32) |
| `text-4xl` | 36px | pricing.tsx -- price values (line 128) |
| `text-3xl` | 30px | KPICard.tsx (line 64), stats-strip.tsx (line 72), testimonials h2, features-bento h2, comparison-table h2, how-it-works h2, deal-calculator h2, pricing h2, Dashboard empty state h1 |
| `text-2xl` | 24px | Login/Register/ForgotPassword/ResetPassword -- "Parcel" logo text (line 43), testimonials metric (line 282), MyDeals h1 (line 183) |
| `text-xl` | 20px | demo-card.tsx KPI values (line 125), deal-calculator KPI values (line 357), NotFound h1 (line 10) |
| `text-lg` | 18px | AppShell sidebar/topbar "Parcel" logo (lines 96, 124, 189), how-it-works step titles (line 162), Dashboard section headings (lines 297, 352, 371), Pipeline stage count (line 360) |
| `text-base` | 16px | hero.tsx subhead (line 107), features-bento AnimatedKPI (line 29), final-cta subhead (line 35), Dashboard empty state CTA (line 222) |
| `text-sm` | 14px | Most body text everywhere -- nav items (AppShell line 73), navbar links (line 36), testimonials quote (line 276), form inputs, comparison table cells, footer links, etc. |
| `text-[13px]` | 13px | Dashboard demo banner (line 139), Pipeline overlay address (line 347), Pipeline "Add Deal" button (line 287) |
| `text-xs` | 12px | Labels, secondary text, button text, footer copyright, form error messages, delta badges, strategy badges, etc. -- the most heavily used size |
| `text-[11px]` | 11px | Ticker city names (line 19), ticker metric values (line 26), demo-card strategy tabs (line 95), demo-card address bar (line 67), trust badges (lines 8, 12, 16), Register password hint (line 138), ResetPassword password hint (line 225), AppShell nav group labels (line 59) |
| `text-[10px]` | 10px | Landing section kickers -- "Testimonials", "Features", "Comparison", "Process", "Try It Now", "Pricing" (all using `text-[10px] uppercase tracking-[0.15em]`), ticker separator dot (line 29), strategy badges in bento (line 121), doc filenames in bento (line 190), pricing "Save 20%" badge (line 66), pricing "Most popular" (line 111), demo-card strategy badge (line 72), bento deal addresses (line 248), register role descriptions (line 161), avatar stack "2,400+" (line 25), AppShell kbd shortcut (line 204) |
| `text-[9px]` | 9px | DemoCard KPI labels (line 121), "AI" label (line 146), bento KPI labels (line 28), ticker strategy badges (line 21), bento stage labels (line 232), bento stage counts (line 235), deal-calc KPI labels (line 353), pricing "Most popular" (line 111), risk score labels in testimonials (line 131), footer "P" logo (line 47) |
| `text-[8px]` | 8px | "AI" label in demo-card (line 143) |

### Observation
The codebase uses **14 distinct font sizes** (8px through 80px). Ten of these are non-standard arbitrary values (`text-[8px]` through `text-[13px]`). This creates a scattered, ad-hoc type scale with no clear rhythm.

---

## 4. Font Weight Census

| Tailwind Class | Weight | Where Used |
|---|---|---|
| `font-bold` | 700 | Hero headline, how-it-works decorative numbers, NotFound 404, final-cta headline, pricing prices, avatar-stack initials, stats-strip values, navbar logo "P", footer logo "P", pricing "Save 20%" |
| `font-semibold` | 600 | Section headings (h2), KPICard values, testimonial names, nav items (active), sidebar "Parcel", demo-card KPI values, strategy badges, landing kickers, pricing tier names, auth page "Parcel" logo, Dashboard headings, HowItWorks step titles, RiskGauge score, footer column titles |
| `font-medium` | 500 | Buttons, nav links, active nav items, labels, pricing toggle, demo-card tabs, comparison table headers, sidebar "Parcel", body links, deal-calculator h3, dashboard hint card titles, avatar-stack "investors" count, KPICard labels |
| (no class / default) | 400 | Body text, description paragraphs, footer links, table cells, quotes |

### Observation
- **`font-light` (300) is never used.** The weight is not even loaded from Google Fonts, so it would fall back anyway.
- **700 vs 600 battle.** The hero uses `font-bold` (700) but all other major headings use `font-semibold` (600). The design-brief specifies weight 600 for h1/h2 but weight 700 only for the hero. This is correct on paper but in practice, with Inter, 600 looks nearly identical to 700 at 30px on dark backgrounds, erasing any hierarchy.
- **JetBrains Mono at 700 is never loaded** but `font-bold font-mono` is used in stats-strip (line 72). The browser will synthesize the bold, which can look subtly wrong.

---

## 5. Letter-Spacing Census

| Class / Value | Where Used |
|---|---|
| `tracking-tight` (-0.025em) | Sidebar "Parcel" logo (AppShell lines 96, 124, 189), navbar "Parcel" (line 32), hero headline (lines 89, 95), final-cta headline (line 32), auth page "Parcel" logos |
| `tracking-wider` (0.05em) | Sidebar nav group labels (AppShell line 59), footer column headings (line 71) |
| `tracking-wide` (0.025em) | Stats-strip metric labels (line 77), deal-calculator form labels (lines 228, 255, 286, 310), Dashboard table headers (line 309), KPICard labels (line 63) |
| `tracking-widest` (0.1em) | Bento KPI labels (line 28), deal-calculator output KPI labels (line 353) |
| `tracking-[0.15em]` | All landing section kickers (testimonials, features, comparison, how-it-works, calculator, pricing) -- lines using `text-[10px] uppercase tracking-[0.15em]` |
| `tracking-[0.12em]` | Bento mini-kanban stage labels (line 232) |
| `tracking-[0.1em]` | DemoCard KPI labels (line 121), DemoCard "AI" analysis label (line 146) |

### Observation
- There are **7 different letter-spacing values** in use. The landing page alone uses 4 different tracking values on uppercase labels (`tracking-wide`, `tracking-wider`, `tracking-widest`, `tracking-[0.15em]`).
- The same visual element (uppercase micro-label) uses different tracking values depending on which file it is in:
  - Section kickers: `tracking-[0.15em]`
  - Bento stage labels: `tracking-[0.12em]`
  - DemoCard KPI labels: `tracking-[0.1em]`
  - Dashboard table headers: `tracking-wide` (0.025em)
  - KPICard labels: `tracking-wide` (0.025em)
  - Sidebar nav labels: `tracking-wider` (0.05em)
  - Footer column headers: `tracking-wider` (0.05em)
- This is one of the strongest signals of visual inconsistency. The same "pattern" (small uppercase label) renders with different tracking depending on context, making the design feel uncoordinated.

---

## 6. Text Color Census

| Color | Token / Hex | Where Used |
|---|---|---|
| `text-text-primary` | `#F1F5F9` | Headings, KPI values, primary content, active nav, user name, card titles |
| `text-text-secondary` | `#94A3B8` | Subheadings, descriptions, inactive nav items, quotes, table cells |
| `text-text-muted` | `#475569` | Labels, hints, captions, timestamps, disabled-feeling text |
| `text-text-disabled` | `#334155` | Trust badge icons, placeholder text |
| `text-accent-primary` / `text-[#6366F1]` | `#6366F1` | "Parcel" logos, active links, section kickers, accent text |
| `text-accent-success` | `#10B981` | Positive deltas, checkmarks, "Low Risk" labels |
| `text-accent-danger` / `text-red-400` | `#EF4444` / red-400 | Error messages, negative deltas, delete buttons |
| `text-accent-warning` | `#F59E0B` | (Referenced but rarely as text color) |
| `text-white` | `#FFFFFF` | Button text, avatar initials |
| `text-indigo-500` | `#6366F1` | Stats strip icons (line 67) |
| `text-[#C4B5FD]` | `#C4B5FD` | Dashboard demo banner text (line 139) |
| `text-[#F1F5F9]` | `#F1F5F9` | Pipeline overlay (line 347) -- same as text-primary but hardcoded |
| `text-[#94A3B8]` | `#94A3B8` | Pipeline dialog (line 382) -- same as text-secondary but hardcoded |
| `text-emerald-400`, `text-amber-400`, `text-red-400`, `text-red-700` | Various | RiskGauge labels (lines 30-34) |
| `text-yellow-400` | | Dashboard risk scores (line 65) |
| Inline `style={{ color }}` | Various hex | Strategy badges, metric colors, ghost card text (ParallaxBackground), bento KPIs, testimonial metrics |

### Observation
- The semantic token system (`text-text-primary`, `text-text-secondary`, `text-text-muted`) is well-defined and mostly followed, but there are **at least 8 instances of hardcoded hex colors used directly in classes or inline styles** instead of the token system. Examples:
  - Pipeline.tsx uses `text-[#F1F5F9]` instead of `text-text-primary`
  - Pipeline.tsx uses `text-[#94A3B8]` instead of `text-text-secondary`
  - Dashboard.tsx uses `text-[#C4B5FD]` (a one-off color)
  - RiskGauge uses Tailwind palette colors (`text-emerald-400`, `text-amber-400`) instead of the semantic tokens
  - Dashboard uses `text-yellow-400` instead of `text-accent-warning`

---

## 7. Inline Styles Affecting Typography

Several components use inline `style` attributes for typography instead of Tailwind classes. This undermines consistency and makes future refactors harder.

| File | Line(s) | What It Does |
|---|---|---|
| hero.tsx | 90, 96 | `fontSize: 'clamp(48px, 7vw, 80px)'` and `color: '#6366F1'` on headlines |
| how-it-works.tsx | 148-149 | `fontSize: 'clamp(52px, 6vw, 72px)'` and `color: 'rgba(99,102,241,0.13)'` on decorative numbers |
| ParallaxBackground.tsx | 135 | `color: '#F1F5F9', fontSize: 11, fontFamily: 'Inter, sans-serif'` on ghost card addresses |
| ParallaxBackground.tsx | 145-151 | `fontSize: 9, fontWeight: 600, fontFamily: 'Inter, sans-serif'` on ghost card badges |
| ParallaxBackground.tsx | 160-161 | `fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 500` on ghost card metrics |
| RiskGauge.tsx | 81-84 | `fontSize: '36px', fontWeight: 600` on SVG center text |
| deal-calculator.tsx | 419-422 | `fontSize: '12px', fontFamily: "'JetBrains Mono', monospace"` on chart tooltip |
| deal-calculator.tsx | 401, 407 | `fontSize: 10` on chart axis ticks |

### Observation
ParallaxBackground is the worst offender -- it uses raw inline styles for all text instead of Tailwind classes. The RiskGauge SVG text necessarily uses inline styles (SVG attributes), which is fine. The hero's clamp()-based font size is an intentional fluid type technique that Tailwind doesn't natively support, so inline style is justified there.

---

## 8. Inconsistencies — The Full List

### 8.1 Section Kicker Labels (Landing Page)
All landing sections have a small uppercase kicker above the h2 heading (e.g., "Features", "Testimonials", "Pricing"). They are visually the same pattern but use inconsistent classes:

- testimonials.tsx: `text-[10px] uppercase tracking-[0.15em] text-accent-primary font-semibold`
- features-bento.tsx: `text-[10px] uppercase tracking-[0.15em] text-accent-primary font-semibold`
- comparison-table.tsx: `text-[10px] uppercase tracking-[0.15em] text-accent-primary font-semibold`
- how-it-works.tsx: `text-[10px] uppercase tracking-[0.15em] text-accent-primary font-semibold`
- deal-calculator.tsx: `text-[10px] uppercase tracking-[0.15em] text-accent-primary font-semibold`
- pricing.tsx: `text-[10px] uppercase tracking-[0.15em] text-accent-primary font-semibold`

These are actually consistent with each other. Good.

BUT the hero badge above the headline uses: `text-xs font-medium` (12px, weight 500) -- a different treatment for the same visual role.

AND the pricing "Most popular" badge uses: `text-[9px] font-bold uppercase tracking-[0.15em] text-accent-primary` -- a third variant.

### 8.2 Section h2 Headings (Landing Page)
All landing h2 headings should be the same size but are not:

- Testimonials, Features, Comparison, HowItWorks, Calculator, Pricing: `text-3xl font-semibold text-text-primary` (30px, 600)
- FinalCTA: `text-4xl md:text-5xl font-bold text-text-primary` (36-48px, 700)

The FinalCTA is intentionally larger, which is fine as a design decision. But it uses `font-bold` instead of `font-semibold`, creating a subtle weight inconsistency.

### 8.3 "Parcel" Logo Text
The word "Parcel" appears in 6 places, with 3 different treatments:

1. **Navbar** (landing): `text-sm font-semibold text-text-primary tracking-tight` (14px)
2. **Sidebar** (app): `text-lg font-semibold text-accent-primary tracking-tight` (18px, indigo)
3. **Mobile topbar** (app): `text-lg font-semibold text-accent-primary tracking-tight` (18px, indigo)
4. **Auth pages** (Login/Register/Forgot/Reset): `text-2xl font-semibold text-accent-primary tracking-tight` (24px, indigo)
5. **Footer**: `text-sm font-semibold text-text-secondary` (14px, gray -- different from navbar!)
6. **Navbar "P" icon**: `text-[10px] font-bold text-white font-mono` (tiny, monospace)

The inconsistency between navbar landing (white/14px) and footer (gray/14px) is notable. The auth pages use a much larger size (24px) that doesn't match any other instance.

### 8.4 Uppercase Label Tracking
Same pattern, different tracking:
- Landing kickers: `tracking-[0.15em]`
- Bento stage labels: `tracking-[0.12em]`
- DemoCard labels: `tracking-[0.1em]`
- KPICard labels: `tracking-wide` (0.025em)
- Dashboard table headers: `tracking-wide` (0.025em)
- Sidebar nav labels: `tracking-wider` (0.05em)
- Footer nav labels: `tracking-wider` (0.05em)

### 8.5 KPI Value Sizes
KPI numbers appear in multiple contexts at different sizes:
- KPICard (Dashboard): `text-3xl font-semibold font-mono` (30px)
- StatsStrip (Landing): `text-3xl font-mono font-bold` (30px, but `bold` instead of `semibold`)
- DemoCard (Landing): `text-xl font-mono font-semibold` (20px)
- Deal Calculator Output: `text-xl font-mono font-semibold` (20px)
- Bento feature KPIs: `text-base font-mono font-semibold` (16px)
- Testimonial metric: `font-mono text-2xl text-accent-primary font-semibold` (24px)
- Pipeline count: `text-lg font-mono font-semibold` (18px)

The design-brief specifies `kpi_large` at 36px and `kpi_small` at 20px. The actual KPICard component uses 30px (text-3xl), which is neither.

### 8.6 Strategy Badge Font
- StrategyBadge.tsx (UI component): `text-xs font-medium font-mono` (12px, monospace)
- Landing constants badges: `text-[10px] font-semibold` (10px, no mono)
- Ticker badges: `text-[9px] font-semibold` (9px, no mono)
- Pipeline overlay badge: `text-[10px] font-medium` (10px, no mono)
- Testimonial badges: `text-[10px] font-semibold` (10px, no mono)

The "real" StrategyBadge component uses `font-mono` but the landing page badges do not, creating a mismatch between marketing and product.

### 8.7 H1 on App Pages
- Dashboard empty state: `text-3xl font-semibold` (30px) -- matches design-brief h1 spec (32px is close to 30px)
- MyDeals page: `text-2xl font-semibold` (24px) -- smaller, inconsistent
- Topbar title (AppShell): `text-sm font-semibold` (14px) -- completely different role, correct to be small

---

## 9. What Makes It Feel Generic

### 9.1 Inter Is Invisible
Inter is the most common SaaS font in existence. It is the default for Linear, Vercel, Notion, and hundreds of Y Combinator startups. Using it with no modifications (no custom OpenType features, no alternate glyphs, no optical sizing) means Parcel's typography looks identical to every other dark-mode SaaS product.

**Specific issues:**
- No use of Inter's `font-feature-settings` to enable stylistic alternates (`ss01` through `ss08`), which could subtly differentiate the look.
- No use of Inter's tabular numbers feature (`tnum`) for aligned numeric columns in tables.
- No custom type scale -- just Tailwind defaults (`text-sm`, `text-lg`, `text-3xl`), which produces the same visual rhythm as any Tailwind project.
- No variable font features being used -- the Google Fonts import loads specific static weights rather than the variable font axis.

### 9.2 No Typographic Hierarchy Contrast
- Headlines and body text are both Inter, both use very similar weights (600 vs 400). The only differentiation is size.
- Premium SaaS products (Stripe, Linear, Raycast) use tighter tracking on large headings, looser tracking on body text, and visible weight contrast. Parcel applies `tracking-tight` only to the "Parcel" logo, not systematically to headings.

### 9.3 Heading Sizes Are Too Close Together
- h1 = 30px (text-3xl), h2 = 30px (text-3xl), h3 = 18px (text-lg)
- In the Dashboard, the main page heading ("Let's analyze your first deal") and section subheadings ("Recent Deals", "Recent Activity") are distinguished only by `text-3xl` vs `text-lg`. The jump from 30px to 18px skips the h2 level entirely.
- On the landing page, ALL section headings are `text-3xl` (30px). There is no secondary heading size. This flat hierarchy makes sections feel repetitive.

### 9.4 Over-Reliance on text-xs (12px)
Searching the codebase, `text-xs` appears in nearly every component. It is used for:
- Form labels
- Button text
- Error messages
- Footer links
- Table headers
- Strategy badge text
- Delta indicators
- Timestamps
- Descriptions
- Chart labels
- Secondary links

When everything secondary is 12px, nothing is visually prioritized within the secondary content. The eye cannot distinguish between a label, a link, a caption, and a timestamp because they are all the same size.

### 9.5 JetBrains Mono Applied Inconsistently
The design-brief mandates JetBrains Mono for "ALL financial numbers." In practice:
- `font-mono` is correctly applied to KPI values, risk scores, chart tooltips, and ticker metrics.
- BUT the hero headline's "Every Number" is NOT in JetBrains Mono even though the word "Number" itself could benefit from the association.
- The pricing tier prices (`$0`, `$29`, `$99`) correctly use `font-mono`.
- Strategy badge text uses `font-mono` in the StrategyBadge component but NOT in the landing page inline badges.
- Some timestamps use `font-mono` (dashboard activity timestamps) but form labels like "Purchase Price" do not use mono for their `$` prefix symbols (they use `text-sm font-mono` but the label itself is sans).

### 9.6 Line Heights Are Default
Almost no component specifies a custom `leading-*` class. The few that do:
- Hero headline: `leading-[0.95]` (very tight, good for display)
- Subheads/descriptions: `leading-relaxed` (1.625, quite loose)
- Everything else: Tailwind default (1.5)

The contrast between 0.95 and 1.625 is dramatic but only appears in the hero. Throughout the app, the default 1.5 line-height for all text creates a monotonous vertical rhythm.

### 9.7 No Negative Space Variation in Type
Every card, section, and component uses `space-y-*` utilities for vertical spacing. The spacing between a label and its value, between a heading and its paragraph, between sections -- it all uses the same small increments (space-y-1, space-y-2, space-y-3). There is no typographic "breathing room" that distinguishes a major section break from a minor element gap.

---

## 10. Files That Need Changes (for a typography overhaul)

### Critical Path (changes propagate everywhere)

| File | Lines | What to Change |
|---|---|---|
| `/frontend/index.html` | 13-16 | Update Google Fonts import: add display font, variable font weights, enable `font-display: optional` if needed |
| `/frontend/tailwind.config.js` | 98-101 | Add display font family, custom type scale tokens, configure `fontSize` with line-height + tracking built in |
| `/frontend/src/index.css` | 54 | Update body font-family default |

### Landing Page Components (20 files)

| File | Key Lines | Typography Issues |
|---|---|---|
| `/frontend/src/components/landing/hero.tsx` | 89-98 | Inline clamp() font sizes; could use Tailwind `text-[clamp(...)]` for consistency. Second h1 uses inline `color` style. |
| `/frontend/src/components/landing/hero.tsx` | 75, 107, 121, 129 | Badge (text-xs), subhead (text-base), CTA button (text-sm), ghost button (text-sm) |
| `/frontend/src/components/landing/navbar.tsx` | 30, 32, 36, 57, 63 | Logo "P" (text-[10px]), logo text (text-sm), nav links (text-sm), Sign in (text-sm), button (text-sm) |
| `/frontend/src/components/landing/ticker.tsx` | 19, 21, 26, 29 | City (text-[11px]), badge (text-[9px]), metric (text-[11px]), separator (text-[10px]) |
| `/frontend/src/components/landing/stats-strip.tsx` | 72, 77 | Stat value (text-3xl), stat label (text-xs) |
| `/frontend/src/components/landing/testimonials.tsx` | 193, 196, 255, 259, 263, 276, 282, 285 | Kicker (text-[10px]), h2 (text-3xl), name (text-sm), role (text-xs), badge (text-[10px]), quote (text-sm), metric (text-2xl), metric label (text-xs) |
| `/frontend/src/components/landing/features-bento.tsx` | 28-29, 79, 82, 85, 110, 111, 121, 174, 190, 193, 232, 235, 248 | Multiple micro-sizes: text-[9px], text-[10px], text-xs, text-base, text-sm |
| `/frontend/src/components/landing/comparison-table.tsx` | 63, 67, 69, 81, 88, 119 | Kicker (text-[10px]), h2 (text-3xl), subtitle (text-sm), table headers (text-xs), cells (text-sm) |
| `/frontend/src/components/landing/how-it-works.tsx` | 118, 121, 146-148, 162, 164 | Kicker (text-[10px]), h2 (text-3xl), decorative numbers (clamp 52-72px), step title (text-lg), step desc (text-sm) |
| `/frontend/src/components/landing/deal-calculator.tsx` | 197, 200, 203, 220, 228, 233, 268, 332, 353, 357, 371, 401, 407 | 13+ distinct sizes in one component |
| `/frontend/src/components/landing/pricing.tsx` | 31, 34, 36, 47, 59, 66, 111, 115, 116, 128, 133, 139, 150 | Kicker through feature list text |
| `/frontend/src/components/landing/final-cta.tsx` | 32, 35, 51 | CTA headline (text-4xl/5xl), subhead (text-base), button (text-sm) |
| `/frontend/src/components/landing/footer.tsx` | 47, 51, 61, 71, 79, 96, 98 | Logo "P" (text-[9px]), logo text (text-sm), status (text-xs), column headers (text-xs), links (text-sm), copyright (text-xs) |
| `/frontend/src/components/landing/demo-card.tsx` | 67, 72, 95, 121, 125, 131, 143, 146, 149 | Address (text-[11px]), badge (text-[10px]), tabs (text-[11px]), KPI labels (text-[9px]), KPI values (text-xl), risk label (text-[9px]), AI label (text-[8px]/text-[9px]), AI summary (text-xs) |
| `/frontend/src/components/landing/trust-badges.tsx` | 8, 12, 16 | All text-[11px] |
| `/frontend/src/components/landing/avatar-stack.tsx` | 18, 25, 26 | Initials (text-[9px]), "Join" text (text-xs), count (text-xs font-mono) |
| `/frontend/src/components/landing/ParallaxBackground.tsx` | 135, 145-151, 158-162 | All inline styles -- font-family, fontSize, fontWeight hardcoded |
| `/frontend/src/components/landing/skip-to-content.tsx` | 7 | focus:text-sm |
| `/frontend/src/components/landing/scroll-progress.tsx` | -- | No typography |
| `/frontend/src/components/landing/cursor-spotlight.tsx` | -- | No typography |

### App Pages

| File | Key Issues |
|---|---|
| `/frontend/src/pages/Dashboard.tsx` | h1 uses text-3xl (should be design-brief h1 = 32px). h2 uses text-lg (should be 24px). Demo banner uses hardcoded hex text color. |
| `/frontend/src/pages/Login.tsx` | "Parcel" logo at text-2xl (24px) -- different from every other logo instance. |
| `/frontend/src/pages/Register.tsx` | Same as Login. Role descriptions use text-[10px]. |
| `/frontend/src/pages/ForgotPassword.tsx` | Same auth card pattern as Login. |
| `/frontend/src/pages/ResetPassword.tsx` | Same auth card pattern as Login. |
| `/frontend/src/pages/MyDeals.tsx` | h1 uses text-2xl (24px) instead of text-3xl (30px) used in Dashboard. |
| `/frontend/src/pages/Pipeline.tsx` | Hardcoded hex colors (`text-[#F1F5F9]`) instead of semantic tokens. Pipeline overlay uses text-[13px] and text-[12px]. |
| `/frontend/src/pages/NotFound.tsx` | 404 number at text-7xl (72px) with font-mono. h1 at text-xl (20px). |

### UI Components

| File | Key Issues |
|---|---|
| `/frontend/src/components/ui/KPICard.tsx` | Value at text-3xl (30px) -- design-brief says kpi_large should be 36px. Label uses tracking-wide but landing KPI labels use tracking-widest. |
| `/frontend/src/components/ui/StrategyBadge.tsx` | Uses font-mono, but landing page badges do not. |
| `/frontend/src/components/ui/RiskGauge.tsx` | SVG inline style fontSize: '36px'. Label colors use Tailwind palette names instead of semantic tokens. |
| `/frontend/src/components/ui/ConceptTooltip.tsx` | Term title text-sm font-semibold, definition text-xs -- reasonable. |
| `/frontend/src/components/ui/button.tsx` | Default text-sm font-medium. This is the base for all buttons. |
| `/frontend/src/components/ui/input.tsx` | text-base on mobile, md:text-sm on desktop (lines 10-12). |
| `/frontend/src/components/layout/AppShell.tsx` | Nav group labels text-[11px], nav items text-sm, topbar title text-sm, search pill text-xs. |

---

## 11. Current Type Scale Map (Actual Usage)

```
80px  ---- Hero headline (max clamp)
72px  ---- 404 page / HowItWorks decorative numbers (max clamp)
48px  ---- Hero headline (min clamp) / FinalCTA headline (md+)
36px  ---- FinalCTA headline (base) / Pricing prices / RiskGauge score
30px  ---- KPI card values / Section h2s / Stats strip values / Dashboard h1
24px  ---- Auth page logos / Testimonial metrics / MyDeals h1
20px  ---- DemoCard KPIs / Deal calc KPIs / NotFound h1
18px  ---- App sidebar logo / Step titles / Dashboard section h2s / Pipeline counts
16px  ---- Body text (text-base) / Bento feature KPIs / Subheads
14px  ---- Body text (text-sm) / Nav links / Form inputs / Table cells / Button text
13px  ---- Pipeline overlay / Dashboard banner
12px  ---- Labels / Badges / Error text / Footer / Captions / Timestamps (text-xs)
11px  ---- Ticker text / Demo tabs / Trust badges / Sidebar labels / Hints
10px  ---- Landing kickers / Mini badges / Role descriptions / Kbd shortcuts
 9px  ---- KPI micro-labels / Ticker badges / Bento stage labels / Footer logo
 8px  ---- AI badge label (smallest text in the entire app)
```

### Gap Analysis
- There is no size between 14px and 18px (the "paragraph lead" or "large body" slot is empty).
- There is a 10px jump from 20px to 30px with nothing at ~24-26px for medium headings (except the auth logo, which is not a heading).
- The 8-11px range has 4 sizes within 3px of each other, creating visual noise rather than hierarchy.

---

## 12. Summary of Key Findings

1. **Font loading is correct but minimal.** Two fonts, correct weights, proper preconnect. No display font for differentiation.

2. **The type scale is ad-hoc.** 14 distinct sizes with no underlying ratio or system. Too many arbitrary values in the 8-13px range.

3. **Letter-spacing is the biggest inconsistency.** 7 different tracking values for what is essentially the same visual pattern (uppercase micro-label). Needs to be reduced to 2-3 standardized values.

4. **Heading hierarchy is flat.** h1 and h2 on the landing page are the same size (30px). App page headings are inconsistent (30px vs 24px vs 18px depending on page).

5. **KPI values do not match the design-brief spec.** Brief says 36px; implementation uses 30px.

6. **Inter without customization is invisible.** No OpenType features, no stylistic alternates, no variable font usage. The typography looks like every other Tailwind + Inter project.

7. **Hardcoded colors and inline styles bypass the design system.** ParallaxBackground, Pipeline, Dashboard, and RiskGauge all use raw hex values instead of semantic tokens.

8. **JetBrains Mono usage is mostly correct** for financial numbers but leaks into non-financial contexts (strategy badge text, status text) while missing from some financial contexts (ghost card badges on landing).

9. **The 12px epidemic.** `text-xs` is used for so many different content types that secondary information has no internal hierarchy.

10. **No responsive type scaling.** Aside from the hero clamp() and the FinalCTA's `md:text-5xl`, text sizes do not change between mobile and desktop. At 14px on a phone, body text is fine. But KPI labels at 9px and badge text at 10px become borderline illegible on smaller screens.
