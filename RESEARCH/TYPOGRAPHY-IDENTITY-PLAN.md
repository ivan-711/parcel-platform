# Typography & Visual Identity Implementation Plan

**Date:** 2026-03-03
**Status:** Research complete. Ready for implementation.
**Input:** typography-research.md, typography-audit.md, copy-research.md

---

## 1. Recommended Font Pairing

### Display + Body: **Satoshi** (primary) or **Outfit** (alternative)
### Mono: **JetBrains Mono** (already in use, no change)

| Role | Font | Weight Range | Source |
|------|------|-------------|--------|
| **Display** (headings, hero, page titles) | Satoshi | 500-700 | [Fontshare](https://www.fontshare.com/fonts/satoshi) — free, self-hosted |
| **Body** (paragraphs, labels, UI text) | Satoshi | 400-500 | Same file, variable font |
| **Mono** (financial numbers, $, %, metrics) | JetBrains Mono | 400-600 | Already loaded via Google Fonts |

### Why Satoshi over Inter

| Criterion | Inter (current) | Satoshi (proposed) |
|-----------|----------------|-------------------|
| Distinctiveness | 5/10 — the most common SaaS font | 9/10 — premium feel, not overexposed |
| Dark mode readability | 10/10 | 9/10 — double-storey `a` and `g` improve legibility |
| JetBrains Mono pairing | 9/10 | 9/10 — modernist precision matches mechanical mono |
| "Vibe-coded" risk | Medium — signals "default Tailwind project" | Very low — signals intentional design choice |
| License | SIL OFL (free) | Fontshare (free for commercial use) |
| Variable font | Yes | Yes (300-900 weight axis) |
| Italics | Yes | Yes |

### Why NOT these alternatives

| Font | Reason to skip |
|------|---------------|
| Inter | Already using it. It's invisible — the default for every dark-mode SaaS. Changing nothing. |
| Geist Sans | Too strongly associated with Vercel/Next.js. Would look like a template. |
| Plus Jakarta Sans | Slightly too rounded/warm for a financial tool. Reads more "friendly fintech" than "serious analysis." |
| Poppins / Montserrat | Generic. Overused. Would make the site look cheaper, not better. |

### Alternative if Satoshi is rejected: **Outfit**
Available on Google Fonts. Geometric, slightly narrow, aspirational energy. Tradeoff: no italic variants (emphasis via weight/color only).

---

## 2. Exact Tailwind Config Changes

### Current (`tailwind.config.js` lines 98-101):
```js
fontFamily: {
  sans: ['Inter', 'system-ui', 'sans-serif'],
  mono: ['JetBrains Mono', 'monospace'],
}
```

### Proposed:
```js
fontFamily: {
  sans: ['"Satoshi"', 'system-ui', '-apple-system', 'sans-serif'],
  mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
},
```

### Font loading change (`index.html`):

**Remove** the current Google Fonts `<link>` for Inter (lines 13-16).

**Add** self-hosted `@font-face` declarations in `index.css`:
```css
@layer base {
  @font-face {
    font-family: 'Satoshi';
    font-style: normal;
    font-weight: 300 900;
    font-display: swap;
    src: url('/fonts/Satoshi-Variable.woff2') format('woff2-variations');
  }
  @font-face {
    font-family: 'Satoshi';
    font-style: italic;
    font-weight: 300 900;
    font-display: swap;
    src: url('/fonts/Satoshi-VariableItalic.woff2') format('woff2-variations');
  }
}
```

**Keep** JetBrains Mono via Google Fonts (or self-host for consistency).

**File to download:** [Satoshi from Fontshare](https://www.fontshare.com/fonts/satoshi) → extract `Satoshi-Variable.woff2` and `Satoshi-VariableItalic.woff2` → place in `frontend/public/fonts/`.

---

## 3. Type Scale

### Current problem
14 distinct font sizes (8px–80px) with no underlying ratio. 10 are arbitrary values (`text-[8px]` through `text-[13px]`). The 8–11px range has 4 sizes within 3px — visual noise, not hierarchy.

### Proposed scale: Major Third (1.250), base 14px

| Token | Size | Tailwind | Use |
|-------|------|----------|-----|
| `hero` | `clamp(48px, 7vw, 72px)` | `text-[clamp(48px,7vw,72px)]` | Landing hero headline only |
| `display` | 36px | `text-4xl` | Landing section h2, KPI large values (matches design-brief `kpi_large`) |
| `title` | 30px | `text-3xl` | App page h1, final CTA headline |
| `heading` | 24px | `text-2xl` | App section h2, card titles |
| `subheading` | 20px | `text-xl` | KPI small values, subsection heads |
| `body-lg` | 16px | `text-base` | Hero subhead, lead paragraphs |
| `body` | 14px | `text-sm` | Default body, table cells, nav items |
| `caption` | 12px | `text-xs` | Secondary labels, timestamps, footnotes |
| `micro` | 10px | `text-[10px]` | Uppercase kickers, badge text, chart axis labels |

**That's 9 sizes, down from 14.** Kill `text-[8px]`, `text-[9px]`, `text-[11px]`, `text-[13px]`, and `text-7xl`.

### Tailwind config addition (optional custom tokens):
```js
fontSize: {
  micro: ['10px', { lineHeight: '14px', letterSpacing: '0.06em' }],
  // All other sizes use Tailwind defaults
},
```

---

## 4. Letter-Spacing Standardization

### Current problem
7 different tracking values for the same visual pattern (uppercase micro-label). Ranges from `tracking-wide` (0.025em) to `tracking-[0.15em]`.

### Proposed: 3 standardized values

| Token | Value | Tailwind Class | Use |
|-------|-------|---------------|-----|
| `tracking-display` | -0.025em | `tracking-tight` | Headings ≥24px |
| `tracking-body` | 0 | (default) | Body text 14-16px |
| `tracking-label` | 0.08em | `tracking-[0.08em]` | ALL uppercase micro-labels, everywhere |

**One class for all uppercase labels:** Replace every instance of `tracking-wide`, `tracking-wider`, `tracking-widest`, `tracking-[0.1em]`, `tracking-[0.12em]`, `tracking-[0.15em]` on uppercase labels with a single `tracking-[0.08em]`. This is the design-brief spec value.

---

## 5. Heading Hierarchy Fix

### Current problem
- Landing page: h1 and h2 both render at 30px (text-3xl)
- App: h1 varies between 30px (Dashboard) and 24px (MyDeals)
- h2 on Dashboard is 18px — skips the 24px level entirely

### Proposed hierarchy

| Level | Landing Page | App Pages |
|-------|-------------|-----------|
| **h1** | `text-[clamp(48px,7vw,72px)]` hero only | `text-3xl font-semibold tracking-tight` (30px) |
| **h2** | `text-4xl font-semibold tracking-tight` (36px) | `text-2xl font-semibold tracking-tight` (24px) |
| **h3** | `text-xl font-medium` (20px) | `text-lg font-medium` (18px) |
| **body** | `text-sm` (14px) or `text-base` (16px) | `text-sm` (14px) |

Key change: **Landing h2 moves from 30px to 36px.** This creates clear separation from body text and matches the design-brief `kpi_large` token.

---

## 6. Top 10 Copy Rewrites

These are the highest-impact copy changes, ranked by visibility and severity.

| # | Location | Before | After | Grade |
|---|----------|--------|-------|-------|
| 1 | Hero headline L1 | "Close More Deals." | "Underwrite Any Deal in 60 Seconds." | B→A |
| 2 | Hero subhead | "Analyze any deal in seconds. Track your pipeline. Process documents with AI. Everything a real estate professional needs -- in one platform." | "Five strategies. One analysis. Run wholesale, BRRRR, creative finance, buy-and-hold, and flip numbers side by side -- then track every deal from lead to close." | C→A |
| 3 | Pricing headline | "Simple, transparent pricing" | "Five free analyses. Upgrade when you close." | F→A |
| 4 | Free tier desc | "Everything you need to get started." | "5 deals/month. Full pipeline. PDF exports." | F→A |
| 5 | Features headline | "The full stack for deal professionals" | "Calculator. Pipeline. AI. One login." | C→A |
| 6 | Testimonials headline | "Trusted by investors nationwide" | "What investors are closing with Parcel" | C→A |
| 7 | Comparison headline | "Why investors choose Parcel" | "Parcel vs. your spreadsheet" | C→A |
| 8 | Feature card title | "AI Document Processing" | "Upload a contract. Get answers." | C→A |
| 9 | Feature card title | "Multi-Strategy Analysis" | "Five strategies. One click." | B→A |
| 10 | Hero badge pill | "Built for real estate professionals" | "Built for wholesalers, investors, and agents" | B→A |

### Copy to keep (A-grade, no changes needed):
- "Know Every Number." (hero L2)
- "One platform replaces five spreadsheets, two apps, and your legal pad." (features subhead)
- "Run the numbers before you sign up" (calculator headline)
- "Analyze 5 deals free. Export to PDF. No card required." (final CTA subhead)
- "Your next deal is waiting." (final CTA headline)
- "From lead to close in three steps" (how-it-works headline)
- All 5 demo card AI summaries
- All 5 testimonial quotes and metrics
- All ticker data

---

## 7. Implementation Order

### Phase A: Font Swap (1 session, ~30 min)
**Impact: Entire app looks different immediately.**

1. Download Satoshi variable fonts from Fontshare → `frontend/public/fonts/`
2. Update `index.html` — remove Inter Google Fonts link (keep JetBrains Mono)
3. Update `index.css` — add `@font-face` for Satoshi, update body font-family
4. Update `tailwind.config.js` — `fontFamily.sans` to Satoshi
5. Visual QA — scan every page for font rendering issues
6. Commit: `ui: swap Inter → Satoshi for display and body text`

### Phase B: Type Scale Cleanup (1 session, ~45 min)
**Impact: Visual hierarchy becomes clear and consistent.**

1. Replace all arbitrary sizes with scale tokens:
   - Kill `text-[8px]`, `text-[9px]`, `text-[11px]`, `text-[13px]`
   - Map each to nearest scale value (mostly → `text-[10px]` or `text-xs`)
2. Fix KPI card value: `text-3xl` (30px) → `text-4xl` (36px) per design-brief
3. Fix landing h2s: `text-3xl` → `text-4xl` for all section headings
4. Fix app page h1 inconsistency: MyDeals `text-2xl` → `text-3xl`
5. Add `tracking-tight` to all headings ≥24px
6. Commit: `ui: standardize type scale to Major Third (1.25)`

### Phase C: Letter-Spacing + Weight Normalization (30 min)
**Impact: Micro-labels look coordinated.**

1. Replace all 7 tracking variants on uppercase labels with `tracking-[0.08em]`
2. Ensure all landing kickers use identical classes: `text-[10px] uppercase tracking-[0.08em] text-accent-primary font-semibold`
3. Fix StatsStrip: `font-bold` → `font-semibold` to match other KPIs
4. Fix hardcoded hex colors → semantic tokens (Pipeline, Dashboard, RiskGauge)
5. Commit: `ui: normalize letter-spacing and font weights`

### Phase D: Copy Rewrites (30 min)
**Impact: Landing page reads like premium SaaS, not a template.**

1. Apply all 10 rewrites from Section 6
2. Verify no string breaks layout (test at mobile + desktop)
3. Commit: `copy: rewrite landing page headlines for specificity`

### Phase E: Polish Pass (20 min)
**Impact: Professional details that compound.**

1. Add `leading-snug` (1.375) to all headings (tighter than default 1.5)
2. Add `leading-relaxed` (1.625) to hero subhead and description paragraphs only
3. Replace ParallaxBackground inline styles with Tailwind classes
4. Enable Inter's OpenType features on JetBrains Mono (tabular figures `tnum` for table contexts)
5. Commit: `ui: typography polish — line heights, inline styles, OpenType`

**Total estimated effort: ~2.5 hours across 5 commits.**

---

## 8. What NOT To Do

| Mistake | Why It's Bad |
|---------|-------------|
| Add a third display font for headings | Two font families (Satoshi + JetBrains Mono) is the maximum. A third adds load time, complexity, and visual noise. |
| Use font-light (300) on dark backgrounds | Thin strokes cause halation (blooming) on dark surfaces. Minimum weight 400 for body, 500 for small text. |
| Load all 9 Satoshi weights | Variable font handles this with one file. Don't add static weight files. |
| Use `font-display: block` | Causes invisible text (FOIT) for up to 3 seconds. Always use `swap` or `optional`. |
| Set pure white (#FFFFFF) as primary text | Causes eye strain and halation on dark backgrounds. Keep the current `#F1F5F9` — it's correct. |
| Add responsive type scaling everywhere | Only the hero needs fluid type (`clamp()`). App text at 14px is fine on mobile. Over-scaling creates layout instability. |
| Use Tailwind's `prose` classes | Prose is designed for light-mode article content. It conflicts with the dark-mode design system. |
| Create a `<Typography>` wrapper component | Adds abstraction without value. Tailwind classes on elements are sufficient. A design system this small doesn't need a typography component. |
| Change JetBrains Mono | It's locked in per CLAUDE.md and design-brief. It works. Don't touch it. |
| Add letter-spacing to financial numbers | Monospace figures are tabular by nature. Adding tracking breaks column alignment. |

---

## 9. Files That Need Changes (Complete List)

### Critical path (changes propagate everywhere):
- `frontend/index.html` — remove Inter link, keep JetBrains Mono link
- `frontend/tailwind.config.js` — fontFamily.sans → Satoshi
- `frontend/src/index.css` — @font-face declarations, body font-family

### Landing page (20 components):
- `hero.tsx` — headline copy, badge copy, subhead copy
- `navbar.tsx` — (font changes propagate automatically)
- `ticker.tsx` — `text-[11px]` → `text-[10px]`, `text-[9px]` → `text-[10px]`
- `stats-strip.tsx` — `font-bold` → `font-semibold`
- `testimonials.tsx` — section headline copy, `text-[10px]` label consistency
- `features-bento.tsx` — feature title copy, consolidate micro-sizes
- `comparison-table.tsx` — section headline copy
- `how-it-works.tsx` — (no copy changes needed)
- `deal-calculator.tsx` — consolidate 13 distinct sizes to scale
- `pricing.tsx` — headline + free tier description copy
- `final-cta.tsx` — (no changes needed — A-grade copy)
- `footer.tsx` — consolidate sizes
- `demo-card.tsx` — consolidate `text-[8px]`/`text-[9px]` → `text-[10px]`
- `trust-badges.tsx` — `text-[11px]` → `text-[10px]`
- `avatar-stack.tsx` — `text-[9px]` → `text-[10px]`
- `ParallaxBackground.tsx` — replace all inline styles with Tailwind classes

### App pages:
- `Dashboard.tsx` — h1 stays `text-3xl`, h2 `text-lg` → `text-2xl`, fix hardcoded hex color
- `MyDeals.tsx` — h1 `text-2xl` → `text-3xl`
- `Pipeline.tsx` — hardcoded hex → semantic tokens, consolidate sizes
- `Login.tsx`, `Register.tsx`, `ForgotPassword.tsx`, `ResetPassword.tsx` — font propagates automatically
- `NotFound.tsx` — `text-7xl` → `text-4xl` (72px is excessive for a 404)

### UI components:
- `KPICard.tsx` — value `text-3xl` → `text-4xl` (30px → 36px per design-brief)
- `RiskGauge.tsx` — hardcoded colors → semantic tokens
- `AppShell.tsx` — `text-[11px]` → `text-[10px]` on nav group labels

### New file:
- `frontend/public/fonts/Satoshi-Variable.woff2`
- `frontend/public/fonts/Satoshi-VariableItalic.woff2`

---

## Sources

- [Satoshi — Fontshare](https://www.fontshare.com/fonts/satoshi)
- [Stripe — Fonts In Use](https://fontsinuse.com/uses/35338/stripe-website-2020)
- [Linear typography — type.fan](https://www.type.fan/site/linear-app)
- [Geist Font — Vercel](https://vercel.com/font)
- [Variable fonts — Can I Use](https://caniuse.com/variable-fonts) — 97% browser support
- [Font best practices — web.dev](https://web.dev/articles/font-best-practices)
- [Dark mode typography — RAIS Project](https://raisproject.com/dark-mode-font-readability/)
- [WCAG 2.2 Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [Overused Google Fonts — Medium](https://medium.com/@sejodesign/5-overused-google-fonts-combinations-you-should-avoid-and-what-to-use-instead-5409cf14a17f)
- [Stripe landing page copy guide](https://stripe.com/guides/atlas/landing-page-copy)
- [B2B SaaS copywriting — ProductLed](https://productled.com/blog/blog-b2b-saas-copywriting-persuasion)
