# Landing Page Overhaul — Final Audit Report

**Auditor:** Claude (Opus 4.6, 1M context) — Final Audit Agent
**Date:** 2026-04-10
**Scope:** 6-issue landing page overhaul (Waves 1 + 2)
**Task:** Holistic verification after implementer -> reviewer -> quality pipelines

---

## 1. Executive Summary

| Issue | Title | Verdict |
|-------|-------|---------|
| 1 | CTA button consistency (PricingSection) | **PASS** |
| 2 | Mobile navigation (navbar Sheet drawer) | **PASS** |
| 3 | Unsubstantiated claims (StatsStrip + AINarrativeDemo) | **PASS (with minor flag)** |
| 4 | CTASection peak moment | **PASS** |
| 5 | HowItWorks redesign (giant numerals) | **PASS** |
| 6 | General Sans font replacement | **PASS (with doc drift flag)** |

**Overall verdict: PASS**

No BLOCK-level issues found. All build verification passes. All completeness sweeps return the expected counts. Two minor non-blocking flags (documentation drift in `DESIGN.md` + a defensible-but-approximate "16 Financial Metrics" claim) are documented below.

---

## 2. Build Verification

### 2.1 TypeScript check
```
$ cd frontend && npx tsc --noEmit
EXIT=0
```
Zero TypeScript errors. Clean compile.

### 2.2 Vite production build
```
$ cd frontend && npx vite build
dist/assets/LandingPage-BKGrzXDx.js                 38.11 kB | gzip:  12.15 kB
dist/assets/index-BshbpZgd.js                       117.59 kB | gzip:  36.17 kB
dist/assets/AnalyzerFormPage-Cliy7_qe.js            135.59 kB | gzip:  34.82 kB
dist/assets/index.es-Cd8SoQ4Y.js                    159.43 kB | gzip:  53.45 kB
dist/assets/html2canvas.esm-QH1iLAAe.js             202.38 kB | gzip:  48.04 kB
dist/assets/generateCategoricalChart-CI_BsYDA.js    359.57 kB | gzip: 100.63 kB
dist/assets/jspdf.es.min-CMPVXTgU.js                390.44 kB | gzip: 128.60 kB
dist/assets/index-CZUUVqyT.js                       519.99 kB | gzip: 159.69 kB

(!) Some chunks are larger than 500 kB after minification.
    ^ pre-existing warning, unrelated to this overhaul

build in 3.68s
```
Build succeeds. LandingPage chunk is 38.11 kB (12.15 kB gzipped) — healthy.

---

## 3. Completeness Sweep Results

### 3.1 Font-family Inter leaks (Step 2)

`grep -rn "'Inter'" frontend/src/ frontend/tailwind.config.ts`
```
No matches found.
```

`grep -rn '"Inter"' frontend/src/ frontend/tailwind.config.ts`
```
No matches found.
```

`grep -rn "Inter" frontend/tailwind.config.ts`
```
No matches found.
```

`@fontsource-variable/inter` package reference in `frontend/package.json`:
```
No matches found.
```

The only remaining literal "Inter" hits in the repo are:
- Legacy research docs in `UI-DESIGN/`, `UI-RESEARCH/`, `LUXURY-DESIGN/` (historical — not active code)
- `UI-REDESIGN-SUMMARY.md` (historical record)
- **`DESIGN.md` lines 15, 80, 119** — *active* design system doc still describes Inter as the body font. **See Section 7 — this is doc drift that should be addressed.**

**Source-code verdict:** ZERO Inter leaks in active TS/TSX/CSS/config files. Font replacement is complete.

### 3.2 CTA gradient background (Step 3)

`grep -n "linear-gradient(to right, #8B7AFF, #6C5CE7)" frontend/src/components/landing/*.tsx`
```
PricingSection.tsx:167  (Carbon tier)
HeroSection.tsx:168     (hero primary CTA — frozen file)
AINarrativeDemo.tsx:153 (mid-page CTA)
CTASection.tsx:96       (closer CTA)
navbar.tsx:125          (navbar Get Started)
```
**5/5 expected matches. PASS.**

### 3.3 CTA hover shadow (Step 3)

`grep -n "hover:shadow-\[0_0_20px_rgba(139,122,255,0.3)\]" frontend/src/components/landing/*.tsx`
```
PricingSection.tsx:166  (Carbon tier)
HeroSection.tsx:167     (hero)
AINarrativeDemo.tsx:152 (mid-page)
CTASection.tsx:95       (closer)
navbar.tsx:124          (navbar)
```
**5/5 expected matches. PASS.**

### 3.4 Legacy opacity hover drift (Step 3)

`grep -n "hover:opacity-" frontend/src/components/landing/*.tsx`
```
No matches found.
```
**0 matches. PASS — no stale `hover:opacity-90` drift anywhere.**

### 3.5 PricingSection bordered tiers (Step 3)

`grep -n "border border-border-strong" frontend/src/components/landing/PricingSection.tsx`
```
123: Steel tier     — text-text-muted (muted free tier)
207: Titanium tier  — text-text-primary (primary bordered)
```
**2/2 expected matches. PASS.**

The Steel button uses `text-text-muted` (muted) while Titanium uses `text-text-primary` (primary), matching the Issue 1 spec. Carbon sits between them using the canonical gradient.

### 3.6 Light-theme atmospheric gating (Step 4)

`grep -n "cta-atmospheric-layer|\.light_&" frontend/src/components/landing/CTASection.tsx`
```
38: className="cta-atmospheric-layer absolute inset-0 pointer-events-none [.light_&]:hidden"
```
**Gating class present. PASS.** The dark-scene backdrop image + darken overlay are correctly hidden in light theme.

### 3.7 Font file verification (Step 5)

```
$ ls frontend/public/fonts/ | grep -E "GeneralSans|Satoshi"
GeneralSans-Light.woff2     (300)
GeneralSans-Medium.woff2    (500)
GeneralSans-Regular.woff2   (400)
GeneralSans-Semibold.woff2  (600)
Satoshi-Variable.woff2
Satoshi-VariableItalic.woff2
```
**4/4 GeneralSans weights present + 2 Satoshi variable files. PASS.**

Magic-bytes check on `GeneralSans-Regular.woff2`:
```
$ head -c 4 frontend/public/fonts/GeneralSans-Regular.woff2 | xxd
00000000: 774f 4632                                wOF2
```
**Valid `wOF2` signature. PASS.** Files are real woff2, not placeholders.

`index.html` preloads:
```html
<link rel="preload" href="/fonts/Satoshi-Variable.woff2" ... />
<link rel="preload" href="/fonts/GeneralSans-Regular.woff2" ... />
<link rel="preload" href="/fonts/GeneralSans-Medium.woff2" ... />
```
Three `<link rel="preload">` entries present. `main.tsx` does NOT import `@fontsource-variable/inter` (only `jetbrains-mono` remains, intentional). `package.json` does NOT list `@fontsource-variable/inter`. Clean.

---

## 4. DESIGN.md Compliance Per Issue

### Issue 1 — PricingSection CTA consistency

**Violet discipline:** The gradient pill (Carbon tier) is the only violet on the button row. Steel and Titanium use neutral `border-border-strong` + semantic text tokens. Zero decorative violet. PASS.

**Canonical gradient + hover animation:** Carbon button at line 166-167 matches the `DESIGN.md §5` CTA button spec exactly:
- `rounded-full py-3 text-sm font-medium`
- `hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(139,122,255,0.3)]`
- `transition-all duration-200`
- `linear-gradient(to right, #8B7AFF, #6C5CE7)`

PASS.

**Semantic text tokens:** All three buttons use `text-text-muted` / `text-text-primary` / `text-accent-text-on-accent` — no hardcoded hex on text. PASS.

**No AI-slop:** No gradient text, no glassmorphism drift, no border-left stripes, no decorative violet. PASS.

### Issue 2 — Mobile navigation (navbar.tsx)

**Accessibility:**
- `aria-label="Open navigation menu"` on the hamburger trigger (line 47). PASS.
- `SheetTitle className="sr-only"` (line 57) — satisfies Radix requirement and screen-reader discovery. PASS.
- `h-11 w-11` = 44x44px — meets WCAG 2.5.5 minimum tap target. PASS.
- `md:hidden` on trigger + `hidden md:flex` on desktop nav — clean responsive split. PASS.

**Link behavior:** Every nav link calls `scrollToSection(target)` AND `setOpen(false)` (lines 72-75). The Log in link also closes the drawer (line 87). Correct mental model: a nav action should dismiss the drawer.

**Visual token hygiene:**
- Drawer uses `bg-app-bg`, `border-border-default` — semantic tokens only. PASS.
- Text uses `text-text-secondary hover:text-text-primary` — semantic tokens only. PASS.
- Font: `font-brand font-light text-xl` — Satoshi 300 display per DESIGN.md §3. PASS.

**Desktop path:** Untouched and still canonical. Get Started gradient CTA is outside the drawer (lines 122-128) so mobile users still see it in the top nav. PASS.

### Issue 3 — Unsubstantiated claims

**StatsStrip.tsx:20:** "16 Financial Metrics" (was "98% Calculation Accuracy"). This removes the unfalsifiable percentage claim. PASS.

*FLAG (minor):* The claim was meant to map to `frontend/src/lib/strategy-kpis.ts`, but that file defines 5 strategies x 4 KPIs = 20 KPI definitions, and 17 unique keys across all strategies (16 if you exclude "recommendation" which is a badge, not a metric). The "16" number is defensible-and-conservative but not trivially traceable. **Not a BLOCK** — it's still a conservative undercount vs the actual 17 unique metrics, so it passes the "don't over-claim" test. Recommend documenting the math in a code comment when a future editor touches this file.

**AINarrativeDemo.tsx:123-130:** Subtitle added after Confidence badge:
```tsx
<motion.p
  initial={{ opacity: 0, y: 4 }}
  animate={isDone ? { opacity: 1, y: 0 } : undefined}
  transition={{ duration: 0.5, delay: 0.25, ease: ease.luxury }}
  className="text-[11px] text-text-muted mt-2 leading-relaxed"
>
  Supported by comparable sales, cap rate analysis, and market trend data
</motion.p>
```
- Exact spec match (gated on `isDone`, 0.25s delay, correct typography classes). PASS.
- `text-[11px] text-text-muted` — 11px + `#7A7872` on `#0C0B0A` = 3.9:1 AA-Large. Supporting text role, not primary content. Acceptable per DESIGN.md §2 Text table. PASS.
- Single occurrence across entire codebase — no duplication. PASS.

### Issue 4 — CTASection peak moment

**Atmospheric layer structure:**
```tsx
<div className="cta-atmospheric-layer absolute inset-0 pointer-events-none [.light_&]:hidden">
  <img src="/images/building-complete.jpg" ... style={{ opacity: 0.18, zIndex: -20 }} />
  <div className="bg-gradient-to-b from-[#0C0B0A]/95 via-[#0C0B0A]/70 to-[#0C0B0A]/95" style={{ zIndex: -10 }} />
</div>
```
- Image file exists (`frontend/public/images/building-complete.jpg` verified present).
- `opacity: 0.18` + `from-#0C0B0A/95` darken = preserves AAA contrast for headline text. PASS.
- `aria-hidden="true"` on both the outer wrapper and the image — no a11y leak. PASS.
- `[.light_&]:hidden` on the wrapper = the dark-scene imagery and near-black overlay are both hidden in light theme. **Crucial fix** — without this, the light-theme page would have a mystery dark strip. PASS.

**Headline:** "Stop guessing. **Start closing.**" at `clamp(2.25rem, 5vw + 0.5rem, 4.5rem)` with `font-medium` emphasis on "Start closing." PASS — matches DESIGN.md §3 weight-contrast technique.

**Amplified violet radial:** `rgba(139,122,255,0.10)` at `ellipse 60% 60% at 50% 60%`. 10% opacity exceeds the DESIGN.md §4 "4% ambient" spec, **but** this is still classifiable as "C: Ambient" role for the CTA section specifically (DESIGN.md §4 actually lists "CTA section radial gradient at 4% opacity" — this PR amplifies to 10%). **Note:** this is a *conscious deviation* from the prior spec, not a violation. The 10% is behind the CTA button and pools light on an interactive element, which is still within the "guides the eye to an action" intent of violet discipline. PASS with design-decision acknowledgement.

**Top border:** `border-t border-border-subtle` present (line 30). PASS.

**Reduced motion:** All entrances use the `isVisible`-gated `initial/animate` pattern which respects `prefers-reduced-motion` via the global CSS block in `index.css:537`. PASS.

### Issue 5 — HowItWorks redesign

**Lucide removal verified:** Zero imports of `Building2`, `Calculator`, or `CheckCircle2` in `HowItWorks.tsx`. PASS.

**Giant numerals:**
```tsx
<p
  className="font-brand font-light tracking-[-0.04em] text-text-primary/15 leading-none"
  style={{
    fontSize: 'clamp(5rem, 8vw, 6rem)',
    fontVariantNumeric: 'tabular-nums',
  }}
  aria-hidden="true"
>
  {step.number}
</p>
```
- Satoshi 300 (`font-brand font-light`) — matches DESIGN.md §3 weight discipline. PASS.
- `tracking-[-0.04em]` — matches the hero tracking discipline for display type. PASS.
- `text-text-primary/15` = 15% alpha of `#F0EDE8` — faint anchor, not competing with the title. Correct "giant quiet numeral" treatment (a la Vercel Ship pages). PASS.
- `aria-hidden="true"` — screen readers skip the decorative number and read the h3 title directly. PASS.
- `tabular-nums` — correct for numeric display per DESIGN.md §3 Number Display. PASS.
- `leading-none` + `clamp(5rem, 8vw, 6rem)` ≈ 80-96px fluid. Matches brief.

**Card shell:** `pt-12 pb-10 px-10` padding + `mt-6` title gap = correct breathing room for the giant numeral. Hover, motion, and descriptions all preserved from prior implementation. PASS.

**Dashed connector removed:** No `border-dashed` in this file. PASS.

### Issue 6 — General Sans font replacement

**@font-face definitions:** 4 weights of General Sans + 1 General Sans Fallback in `index.css` lines 44-79. All with `font-display: swap`. PASS.

**Fallback metric-matching:** `ascent-override: 100%`, `descent-override: 22%`, `size-adjust: 100%` — the fallback is metric-matched to minimize CLS during font swap. PASS.

**Tailwind config:** `sans` and `body` both use `['"General Sans"', ...]` as the first family (lines 150-151). `brand` keeps Satoshi. `mono` keeps JetBrains. PASS.

**body rule:** `index.css:358` uses `font-family: 'General Sans', 'General Sans Fallback', ...`. PASS.

**Inter-specific feature-settings removed:** The old `'cv02' 'cv03' 'cv04' 'cv11'` from the Inter variant is no longer in the body rule. Good — those features don't exist in General Sans and would be a silent no-op. PASS.

**Autocomplete input:** `.parcel-autocomplete-input` uses `font-family: 'General Sans', 'General Sans Fallback', system-ui, sans-serif` (line 645). PASS — form inputs inherit the body font consistently.

**main.tsx:** Only imports `@fontsource-variable/jetbrains-mono`. No Inter. PASS.

**index.html preloads:** `GeneralSans-Regular.woff2` + `GeneralSans-Medium.woff2` both preloaded. PASS.

**RiskGauge.tsx:**
- Line 93: Satoshi on the score number (correct — hero KPI numeral). PASS.
- Line 109: `fontFamily: "'General Sans', sans-serif"` on the "/100" label. PASS.

**KPICard.tsx:** JSDoc comment cleaned of stale Inter reference. (Verified by Grep — no Inter anywhere in KPICard.tsx.) PASS.

### Cross-cutting DESIGN.md checks

**Violet discipline (DESIGN.md §4):** Every `#8B7AFF` / gradient pixel in the modified files is tied to either:
- An interactive element (navbar CTA, mid-page CTA, closer CTA, Carbon tier CTA, "Save 20%" badge, Carbon border/glow), or
- The "earned" Carbon tier accent.

The CTASection radial glow at 10% exceeds the prior 4% spec but still sits behind the CTA button (guides the eye to an action). Zero decorative violet. PASS.

**Satoshi 300 default:** All display headlines in the modified files use `font-brand font-light`. PASS.

**No AI-slop:**
- No `border-left: 2px+ accent stripes` anywhere. PASS.
- No `background-clip: text` / `bg-clip-text` in landing components. PASS.
- No glassmorphism stacking beyond the single AINarrativeDemo `glass` card (which is the canonical peak moment). PASS.

**Hardcoded neutrals:** All body text in the modified files uses `text-text-primary` / `text-text-secondary` / `text-text-muted`. The only raw hex I found in these files is for accents (violet gradient stops, success green on Confidence badge, terracotta/amber/blue in RiskGauge class map) — all intentional and already tokenized in Tailwind's top-level colors. PASS.

**Contrast (DESIGN.md §2):**
- Primary `#F0EDE8` on `#0C0B0A` = 17.6:1 (AAA). PASS.
- Secondary `#A09D98` = 7.5:1 (AAA Large). PASS.
- Subtitle `text-text-muted` at 11px = AA-Large territory. The Confidence subtitle at 11px is borderline — acceptable for supporting metadata but not for primary content. PASS given its role.

**Responsive behavior:**
- Navbar: hamburger `md:hidden` + desktop nav `hidden md:flex`. Full parity — nothing is amputated on mobile.
- StatsStrip: 2x2 grid on mobile, row on desktop. Good.
- HowItWorks: `grid-cols-1 md:grid-cols-3` — stacks cleanly.
- PricingSection: `grid-cols-1 md:grid-cols-3` — stacks cleanly.
- CTASection: no breakpoint-hidden content.

No `hidden md:*` anywhere that would amputate critical functionality. PASS.

---

## 5. Integration Findings

### 5.1 No duplicate confidence subtitle copy

`grep -rn "Supported by comparable" frontend/src`
```
frontend/src/components/landing/AINarrativeDemo.tsx:129
```
Single occurrence. No copy leaks to other components. PASS.

### 5.2 CTA cannibalization check

"Get Started / Get Started Free / Analyze Your First Deal Free" copy audit:
- navbar.tsx:127 — **"Get Started"** (navbar right rail)
- HeroSection.tsx:170 — **"Analyze Your First Deal Free"** (hero primary CTA — specific action-oriented copy)
- AINarrativeDemo.tsx:155 — **"Get Started Free"** (mid-page re-activation)
- PricingSection.tsx:125 — **"Get Started"** (Steel tier — neutral bordered)
- PricingSection.tsx:209 — **"Get Started"** (Titanium tier — bordered)
- CTASection.tsx:98 — **"Get Started Free"** (closer)

All CTAs route to `/register`. Hero uses specific copy ("Analyze Your First Deal Free") to set expectations; mid-page and closer repeat "Get Started Free" which is correct for reinforcement per DESIGN.md §10 ("Single CTA path — no competing secondary actions"). The navbar "Get Started" is the persistent pill that scrolls with the user.

**No cannibalization.** All six CTA instances share the same target and build emotional momentum rather than competing. PASS.

### 5.3 Landing page flow integrity

Reading `LandingPage.tsx`:
```
Hero -> StatsStrip -> ProblemSection -> ProductPreview -> HowItWorks
     -> StrategyTabs -> AINarrativeDemo -> PricingSection -> CTASection -> Footer
```
Matches DESIGN.md §10 "Section Order (visitor psychology)" exactly. StatsStrip sits at position 2 (social proof after the hook). PASS.

### 5.4 Import health

No broken imports detected. TypeScript compilation is clean. Vite build succeeds. All lazy-loaded sections in `LandingPage.tsx` resolve correctly. The General Sans swap didn't leak anywhere (no orphan imports of `@fontsource-variable/inter` anywhere in `src/`). PASS.

### 5.5 Light-theme sanity

The CTASection atmospheric layer is the only dark-theme-only element in the modified files. It's correctly gated with `[.light_&]:hidden`. The rest of the changes use semantic tokens (`text-text-primary`, `border-border-default`, etc.) which auto-theme via the CSS variables in `index.css`. PASS.

---

## 6. Known Accepted Trade-offs

### 6.1 General Sans legibility at 14px
**Status:** Accepted by user (Ivan).
Ivan chose General Sans as a deliberate brand-identity move over Inter's optimized UI-text legibility. The reviewer and quality agent both endorsed this. Expected ~5-10% softness at 14px body copy vs Inter's industry-leading optical grid at small sizes. This is a known, intentional trade-off documented in the overhaul brief.

### 6.2 CTASection violet radial at 10% (vs DESIGN.md's prior 4% spec)
**Status:** Conscious deviation.
The CTASection ambient violet was previously spec'd at 4% opacity (DESIGN.md §4 "C: Ambient" row). Issue 4 explicitly amplified this to 10% as part of the "peak moment" direction. The glow still sits behind the CTA button (guides the eye to an action), so it remains within the spirit of the violet discipline. If Ivan wants to keep this amplification, DESIGN.md §4 should be updated accordingly.

### 6.3 "16 Financial Metrics" StatsStrip copy
**Status:** Defensible, borderline.
`frontend/src/lib/strategy-kpis.ts` defines 5 strategies x 4 KPIs = 20 KPI definitions, with 17 unique keys across strategies. "16" is a conservative undercount (and better than the old "98%"), but the exact math isn't inline-documented. Ivan may want to either (a) update the claim to "17 Financial Metrics" to match the unique-key count, or (b) document the rationale in a code comment. Not a blocker.

---

## 7. Recommendations For Future Work

### 7.1 DESIGN.md documentation drift (HIGH priority doc fix)
`DESIGN.md` has three stale "Inter" references that contradict the shipped code:
- Line 15: "Satoshi Variable for display, **Inter for body** — geometric pairing with clear hierarchy"
- Line 80: Font Families table row — `| Body/UI | **Inter** | Fontsource, features cv02 cv03 cv04 cv11 |`
- Line 119: "Font: **Inter 500**, 11px, uppercase, tracking 0.08em" (Eyebrow Labels section)

These should be updated to reference General Sans in a future doc-sync pass. Not a blocker for the overhaul itself, but it will confuse future contributors if left stale.

**Suggested fix:** Replace all three with "General Sans" and remove the `cv02/cv03/cv04/cv11` feature-setting reference (those are Inter-specific character variants that don't exist in General Sans).

### 7.2 Carbon tier outer card shadow (pre-existing drift)
`PricingSection.tsx:135` uses `shadow-[0_0_24px_rgba(139,122,255,0.06)]` on rest and `hover:shadow-[0_0_40px_rgba(139,122,255,0.15)]` on hover. `DESIGN.md §5 "Pricing Card"` spec'd the hover shadow at `0_0_32px_rgba(139,122,255,0.10)`. This is a pre-existing drift (the card was already drifted before this overhaul) and is **out of scope** for Issue 1, which only targeted the button. Flagged here so a future polish pass can reconcile the card shadow with the spec — or vice versa, update the spec to match.

### 7.3 Minor: StatsStrip "16 Financial Metrics" documentation
Add an inline code comment on `StatsStrip.tsx:20` explaining the math that produces 16 (e.g., "17 unique financial keys across 5 strategies, minus 'recommendation' which is a badge not a metric"). Prevents future editors from second-guessing the number.

### 7.4 Minor: `border-left` sweep in index.css
I verified there are no `border-left: 2px+` accent stripes in the landing components, but a future pass could normalize the few 1px `border-l` usages across the app to use semantic border tokens rather than raw classes. Not urgent.

### 7.5 Minor: LandingPage.tsx bundle size
LandingPage chunk is 38.11 kB gzipped 12.15 kB. This is fine but the below-fold lazy-load strategy is already optimized. If Ivan wants to push LCP further, dynamic-import `Lenis` instead of statically importing it at the top of LandingPage.tsx — but that's a minor optimization, not a correctness issue.

---

## 8. Final Verdict

# **PASS**

All 6 issues shipped cleanly through implementer -> reviewer -> quality pipelines. TypeScript compiles with exit code 0. Vite builds cleanly in 3.68s. All 5 grep completeness sweeps return their expected counts. The font replacement is complete in code (with minor doc drift in DESIGN.md to clean up in a future pass). The atmospheric CTA layer is correctly light-theme-gated. No BLOCK-level issues. No integration gaps. No broken imports.

The landing page overhaul is ready to ship.

### Summary of flags (all non-blocking)
| # | Flag | Severity | Action |
|---|------|----------|--------|
| 1 | DESIGN.md still references Inter (lines 15, 80, 119) | Low (docs only) | Update in a follow-up doc-sync pass |
| 2 | CTASection violet at 10% vs prior 4% spec | Low (conscious deviation) | Update DESIGN.md §4 to reflect new norm if keeping |
| 3 | "16 Financial Metrics" math isn't inline-documented | Low (defensible undercount) | Add code comment on next edit |
| 4 | Carbon pricing card hover shadow drift vs DESIGN.md §5 | Low (pre-existing, out of scope) | Reconcile in future polish pass |

---

**End of audit.**
