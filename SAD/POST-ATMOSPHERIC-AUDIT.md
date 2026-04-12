# POST-ATMOSPHERIC-AUDIT — 2026-04-10

## VERDICT: PASS

The atmospheric imagery pipeline ("The Hour" and "The Dwelling", two 48-frame WebP scroll-driven sequences via a new `AtmosphericImage.tsx` component) ships cleanly. TypeScript compiles with exit 0; vite production build succeeds in 3.71s with the LandingPage chunk growing only 0.40 kB (38.11 kB -> 38.51 kB gzipped 12.15 -> 12.26 kB). Frame assets verify visually (dark indigo -> golden amber rake for The Hour; pure dark silhouette -> warm amber window glow for The Dwelling), the radial elliptical mask covers all four edges, the component is correctly decorative-only (`pointer-events: none` + `aria-hidden="true"` + `[.light_&]:hidden`), opacity 0.18 sits inside the DESIGN.md 0.10-0.25 atmospheric band, motion respects reduced-motion and mobile fallbacks, zero violet or Inter bleed, and the firewall holds (HeroSection.tsx, hero-frames/, backend untouched by this pipeline). One visual artifact was observed in The Hour frames (a residual portrait rectangular panel from the generator's "outer 20% fades to black" prompt) but the radial mask + 0.18 opacity mute it into mood rather than a framed element — flagged as a polish recommendation, not a block.

## What changed since the previous audit (baseline: SAD/LANDING-OVERHAUL-AUDIT.md)

The 2026-04-10 baseline audit graded the post-6-issue landing overhaul as **PASS** with four non-blocking flags:

| # | Flag (baseline) | Status now |
|---|-----------------|-----------|
| 1 | DESIGN.md still references Inter (lines 15, 80, 119) | UNCHANGED — outside this pipeline's scope |
| 2 | CTASection violet radial at 10% vs prior 4% spec | UNCHANGED — intentional deviation, still ships |
| 3 | "16 Financial Metrics" math not inline-documented | UNCHANGED — StatsStrip not in this pipeline's scope |
| 4 | Carbon pricing card hover shadow drift | UNCHANGED — PricingSection not in this pipeline's scope |

The atmospheric pipeline introduced **one new file** (`AtmosphericImage.tsx`, 178 lines) and modified `LandingPage.tsx` to wire the component into two slots (lines 48-50 lazy import, lines 101-104 slot 1, lines 116-119 slot 2). It also introduced 96 WebP frames (48 per directory) totaling 2.9 MB under `frontend/public/images/atmospheric-hour-frames/` and `frontend/public/images/atmospheric-dwelling-frames/`. No other landing files were touched.

**Improvement over baseline:** the prior audit's landing scroll journey had two blank gaps between StatsStrip/ProblemSection and HowItWorks/StrategyTabs where the void was doing the transitional work alone. Those two moments now have cinematic scroll-synced atmospheric punctuation, reinforcing the "cinematic authority" creative direction from `SAD/ATMOSPHERIC-IMAGERY-PLAN.md` without competing with the hero frame sequence.

## Typography — PASS

- `AtmosphericImage.tsx` renders no text — there is nothing to typeset. Typography discipline is inherited from the surrounding sections, which the grep sweeps confirm are untouched.
- Zero Inter leaks in `frontend/src/components/landing/*`. The only literal "Inter" matches in the sweep are `Interval` (PricingSection type) and `IntersectionObserver` (landing-utils) — both false positives.
- All display headlines in unchanged neighbors (`StatsStrip.tsx:46`, `ProblemSection.tsx:20`, `HowItWorks.tsx:49,70,79`, `StrategyTabs.tsx:47`, `AINarrativeDemo.tsx:89`, `PricingSection.tsx:57`, `CTASection.tsx:77`) use `font-brand font-light` (Satoshi 300) per DESIGN.md §3.
- Weight-contrast technique preserved: `<span className="font-medium">` on one key word per headline (ProblemSection "60 seconds", HowItWorks "analysis", StrategyTabs "One", AINarrativeDemo "narrative.", CTASection "Start closing.").
- No all-caps body text. Eyebrow labels at 11px use `uppercase tracking-[0.08em] font-medium text-text-muted` per DESIGN.md §3 pattern.
- Line length on ProblemSection stays ≤65ch via `max-w-[680px]` (`ProblemSection.tsx:15`); AINarrativeDemo via `max-w-[640px]` (`AINarrativeDemo.tsx:77`).

## Color — PASS

- `AtmosphericImage.tsx` has zero color references — no violet, no hex, no accent token, no gradient. Grep confirmed: `No matches found` for `violet|accent|8B7AFF|6C5CE7` in the component.
- The atmospheric layer opacity is 0.18 (default, `AtmosphericImage.tsx:49`) — inside the DESIGN.md 0.10-0.25 atmospheric band.
- The #0C0B0A base remains unbroken. The atmospheric layer sits in document flow between content sections but does not introduce a contrasting background — the canvas paints the masked image over transparent, and the transparent mask edges dissolve into the page bg.
- Violet #8B7AFF sweep across all landing components returns only interactive/earned uses: 5 CTA gradient buttons (Hero, navbar, AINarrativeDemo, Carbon tier, CTASection — all drive to `/register`), skip link focus state (`HeroSection.tsx:132`), scroll progress bar (`LandingPage.tsx:90`), Carbon tier border/badge/glow (`PricingSection.tsx:135,137`), CTASection ambient glow at 10% (known pre-existing deviation), ProductPreview MapPin + pulse dot (decorative but small, pre-existing).
- Semi-transparent white borders preserved (rgba 0.03-0.12) — no solid grey borders introduced.
- No cyan-on-dark AI-slop.

## Layout & Space — PASS

- The two atmospheric slots are placed correctly per spec: between `StatsStrip` + `ProblemSection` (`LandingPage.tsx:98-108`) and between `HowItWorks` + `StrategyTabs` (`LandingPage.tsx:112-122`).
- The component reserves `h-[50vh] md:h-[70vh]` (`AtmosphericImage.tsx:50`) which gives the scroll sequence sufficient scroll distance (viewport + 50-70vh ≈ 1.5-1.7x viewport height to traverse 48 frames ≈ 34-44 px/frame — smooth).
- No hard section borders were introduced; the atmospheric insertion respects the "one continuous dark surface" principle (no bg change, no border, mask-dissolved edges).
- Spacing rhythm is varied downstream (StatsStrip `py-24 md:py-32`, ProblemSection `py-32 md:py-48`, HowItWorks `py-32 md:py-48`, StrategyTabs `py-32 md:py-48`).
- No card-in-card, no repeated identical card grids.
- `gap` over `margin` maintained in the downstream grids (`StatsStrip.tsx:66`, `HowItWorks.tsx:57`, `PricingSection.tsx:99`).

## Visual Details (absolute bans check) — PASS

- Grep for `bg-clip-text|background-clip:\s*text` in landing: **0 matches**.
- Grep for `border-l-[2-9]|border-l-\[[0-9]+px\]` (colored side stripes): **0 matches**.
- Grep for `hover:opacity-`: **0 matches**.
- Grep for `gradient.*text-transparent`: **0 matches**.
- Glassmorphism is limited to the purposeful AINarrativeDemo glass card (`AINarrativeDemo.tsx:101`) and the navbar's `backdrop-blur-xl` pill (`navbar.tsx:38-39`) — both intentional and pre-existing.
- No sparklines-as-decoration; the ProductPreview cash flow mini-chart is actual content, not decoration.
- No generic rounded-rectangles-with-drop-shadows; the card shadows in ProductPreview/PricingSection are token-based `shadow-xl` / `shadow-2xl` + the canonical `edge-highlight` utility.
- `AtmosphericImage.tsx` itself has ZERO decorative tells — no filter, no blend mode, no blur. The component is a clean canvas + radial mask + `[.light_&]:hidden` gate.

## Motion — PASS

- `AtmosphericImage.tsx:98-101` uses `useScroll` with `target: sectionRef` and `offset: ['start end', 'end start']` — the canonical framer-motion scroll-sync pattern, mirrored from `HeroSection.tsx`.
- Frame drawing uses transform-only operations (`ctx.drawImage`) inside a `useMotionValueEvent` callback; it does not animate layout properties.
- The callback short-circuits on `useStaticFallback = isMobile || prefersReducedMotion` (`AtmosphericImage.tsx:67, 127`), so the scroll listener is a no-op when motion is disabled.
- Mobile (<768px) fallback renders the final frame as a static `<img>` with the same opacity (`AtmosphericImage.tsx:160-166`), preserving atmospheric mood without loading 48 frames.
- `prefers-reduced-motion` is respected doubly: once via the module-level `prefersReducedMotion` import gate in the component and once via the global `@media (prefers-reduced-motion: reduce)` in `index.css:537-543`.
- Downstream motion uses `ease.luxury` or `ease.vercel` per DESIGN.md §8 — confirmed in ProblemSection, HowItWorks, StrategyTabs, AINarrativeDemo, PricingSection, CTASection. No bouncy/elastic springs in the landing surface.
- No width/height/padding animation in landing components; transforms and opacity only.

**Minor note (not a flag):** The `prefersReducedMotion` import from `@/lib/motion` is a module-level boolean initialized at import time, so a user toggling reduced-motion at runtime won't affect the already-mounted component. Same pattern `HeroSection.tsx` uses — consistent, not a regression.

## Interaction & Accessibility — PASS

- `AtmosphericImage.tsx:156-157` sets `aria-hidden="true"` and `pointer-events-none` on the outer wrapper. The component cannot steal focus, cannot intercept clicks, cannot leak into the screen-reader tree. It is correctly marked decorative-only.
- The inner `<img>` (static fallback) uses `alt=""` (`AtmosphericImage.tsx:163`) for proper decorative semantics.
- No focusable elements inside the atmospheric layer.
- Downstream focus rings preserved: all CTAs use their pre-existing `hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(139,122,255,0.3)] transition-all duration-200` pattern. Skip link focus state at `HeroSection.tsx:132` untouched.
- No over-applied hover effects introduced.

## Atmospheric imagery integration — PASS

**Visual verification (read directly from WebP bytes):**

| Frame | File | Observation |
|-------|------|-------------|
| Hour frame 0001 | `atmospheric-hour-frames/frame_0001.webp` (19,358 bytes) | Deep indigo/near-black base, only a thin moonlit panel of concrete visible on the cantilever's front face. No golden light. Matches "pre-dawn shadow" intent. |
| Hour frame 0024 | `atmospheric-hour-frames/frame_0024.webp` (25,872 bytes) | Mid-transition: warm amber raking light partially illuminates the top-right concrete plane and top edge of the cantilever; left side still deep shadow. |
| Hour frame 0048 | `atmospheric-hour-frames/frame_0048.webp` (43,580 bytes) | Full golden-hour rake across the cantilever and both walls; warm amber dominant, bottom edges still in shadow. Matches "full illumination" intent. |
| Dwelling frame 0001 | `atmospheric-dwelling-frames/frame_0001.webp` (24,532 bytes) | Modern concrete/wood house as a near-silhouette, all windows dark, only subtle ambient moonlight on the facade. Matches "all lights off" intent. |
| Dwelling frame 0048 | `atmospheric-dwelling-frames/frame_0048.webp` (35,918 bytes) | Same camera/composition as frame 0001 but with warm amber interior window glow from multiple windows (upper + lower). Matches "illumination reveal" intent. |

Dark -> bright direction verified for both sequences.

**Mask verification (`AtmosphericImage.tsx:138-151`):**
```ts
maskImage:
  'radial-gradient(ellipse 90% 78% at center, black 0%, black 45%, transparent 95%)',
WebkitMaskImage:
  'radial-gradient(ellipse 90% 78% at center, black 0%, black 45%, transparent 95%)',
```
This is a **radial elliptical** mask (not a single-axis linear), so all four edges fade. The code comment at lines 138-145 explicitly documents the reasoning: the Nano Banana Pro generator rendered "outer 20% fades to black" as a hard rectangular inner frame in The Hour; the elliptical fade softens all four edges so the inner-rectangle artifact dissolves into the surrounding void.

**Light-theme guard (`AtmosphericImage.tsx:157`):**
```ts
className={`relative w-full overflow-hidden pointer-events-none [.light_&]:hidden ${heightClass}`}
```
Present and correct — same pattern the existing CTASection atmospheric layer uses. The atmospheric images are dark-theme-only and hide cleanly in light mode.

**LandingPage.tsx slot wiring:**

- Slot 1 (`LandingPage.tsx:101-104`):
  ```tsx
  {/* Atmospheric interlude — "The Hour", scroll-driven light sweep across brutalist concrete */}
  <Suspense fallback={null}>
    <AtmosphericImage framePrefix="atmospheric-hour-frames" />
  </Suspense>
  ```
  Positioned between `<StatsStrip />` (line 98) and `<ProblemSection />` (line 107). Correct.

- Slot 2 (`LandingPage.tsx:116-119`):
  ```tsx
  {/* Atmospheric interlude — "The Dwelling", scroll-driven reveal as windows warm to life */}
  <Suspense fallback={null}>
    <AtmosphericImage framePrefix="atmospheric-dwelling-frames" />
  </Suspense>
  ```
  Positioned between `<HowItWorks />` (line 113) and `<StrategyTabs />` (line 122). Correct.

Both slots use `Suspense fallback={null}` (not `<SectionSkeleton />`) because the component is decorative — a pulsing skeleton in the transition would be visual noise. Correct per the pipeline plan.

**Asset sanity:**
- 48 frames per directory (expected 46-50, exact 48). PASS.
- Largest individual frame ~45 KB (well under 150 KB cap).
- Total per directory: 1.4-1.5 MB (well under 5 MB cap).

**Single observed artifact (The Hour):** In frames 0001-0048 of The Hour there is a visible portrait-oriented rectangular darker panel in the middle of the frame — a leftover of the generator's "outer 20 percent of the frame on all four sides fades smoothly to near-black" prompt being interpreted as a hard inner frame rather than a gradient vignette. The radial mask at `black 45% transparent 95%` partially softens this, and at opacity 0.18 on the #0C0B0A canvas the artifact mutes into "mood" rather than "framed element." At normal scroll speeds this should register subliminally, not consciously. **Not a block**, but worth a polish pass if Ivan wants to perfect it — see Ranked Suggestion #1.

## Build gates — PASS

**tsc output:**
```
$ cd frontend && npx tsc --noEmit
(no output)
EXIT=0
```
Zero TypeScript errors. Clean compile.

**vite build output (last 16 lines):**
```
dist/assets/LandingPage-AyGp7HgG.js                                38.51 kB | gzip:  12.26 kB
dist/assets/PropertyDetailPage-DpFSmB45.js                         46.48 kB | gzip:  10.93 kB
dist/assets/AnalyzePage-BY7t4s8Q.js                                49.27 kB | gzip:  15.62 kB
dist/assets/AnalysisResultsPage-DWEPvm4p.js                        76.41 kB | gzip:  20.24 kB
dist/assets/DocumentsPage-IlWU8WZM.js                              80.72 kB | gzip:  22.03 kB
dist/assets/AppShell-CcaNnKUk.js                                   84.32 kB | gzip:  23.42 kB
dist/assets/Pipeline-DYxclJLc.js                                   86.13 kB | gzip:  26.83 kB
dist/assets/index-DcXscpFS.js                                     117.59 kB | gzip:  36.17 kB
dist/assets/AnalyzerFormPage-CcX6UCpk.js                          135.62 kB | gzip:  34.83 kB
dist/assets/index.es-dnZJ4kgQ.js                                  159.43 kB | gzip:  53.45 kB
dist/assets/html2canvas.esm-QH1iLAAe.js                           202.38 kB | gzip:  48.04 kB
dist/assets/generateCategoricalChart-VA5kCMKO.js                  359.57 kB | gzip: 100.63 kB
dist/assets/jspdf.es.min-Iij5vbtK.js                              390.44 kB | gzip: 128.60 kB
dist/assets/index-C0Hm8Wwl.js                                     520.13 kB | gzip: 159.71 kB

(!) Some chunks are larger than 500 kB after minification.
  (pre-existing warning, unrelated to this pipeline)

built in 3.71s
EXIT=0
```
Build succeeds. LandingPage chunk grew from 38.11 kB -> 38.51 kB gzipped 12.15 -> 12.26 kB — only 0.40 kB added for `AtmosphericImage.tsx`. The lazy-chunk split is working: the component is bundled into the LandingPage chunk (not the main entry chunk).

## Ranked suggestions for further improvement

1. **(Polish)** The Hour frames contain a visible inner rectangular darker panel from Nano Banana Pro's literal interpretation of "outer 20% fades to black." The current radial mask mutes it, but a heavier inner-fill ellipse (`ellipse 95% 85% at center, black 0%, black 55%, transparent 100%`) would push the artifact deeper into the vignette. Risk: too aggressive a mask might crop visible areas of the concrete. Defer to Ivan's eye on the live page.

2. **(Polish)** The `AtmosphericImage` component hard-codes the canvas `object-cover` fit — if the source frames have a different aspect ratio than the container (4K 16:9 vs `h-[70vh]` ≈ wider-than-16:9 on most monitors), there will be minor cropping. Not visible at 0.18 opacity but worth knowing.

3. **(Consideration)** At `h-[50vh] md:h-[70vh]`, the atmospheric interludes take real scroll real estate (roughly 756 px of scroll to traverse on a 1080p desktop). This is intentional cinematic pacing, but if telemetry shows users scrolling past fast, the height could drop to `h-[40vh] md:h-[60vh]` without breaking the effect.

4. **(Low priority)** `prefersReducedMotion` is imported as a module-level boolean — runtime toggles of the OS setting won't hot-swap the component to its static fallback until a full page reload. Acceptable for a landing page (users rarely toggle mid-session), same pattern HeroSection uses.

5. **(Doc drift, pre-existing)** DESIGN.md §9 "Visual Rhythm" lists StatsStrip with `bg-app-recessed` + `border-y`, but the current `StatsStrip.tsx:64` uses no bg and no border. This pre-dates the atmospheric pipeline but is worth reconciling next time DESIGN.md gets a doc-sync pass. Out of scope for this audit.

## Quick fixes applied (under 5 lines each)

**None applied.**

The pipeline shipped clean. Everything I flagged is either (a) a subjective polish judgement that needs Ivan's eye on the live page (Ranked #1 + #3), (b) pre-existing and out of scope (Ranked #5), or (c) a known pattern accepted elsewhere (Ranked #4). No single quick fix would materially improve the build without risking subjective regression.

## Deferred decisions (needs Ivan's call)

- **The Hour inner-rectangle artifact.** Keep the current 0.18 opacity + elliptical mask, or tighten the mask to aggressively vignette it. Requires seeing it at scale on the live site. My read: at 0.18 opacity on #0C0B0A it reads as "mood," and tightening the mask risks cropping the cantilever itself. **Recommend: ship as-is, re-evaluate after staging review.**
- **Atmospheric section height.** `h-[50vh] md:h-[70vh]` is generous. Ivan can dial it up/down if the scroll pacing feels off in practice.
- **Atmospheric opacity.** 0.18 is the current default and sits mid-range in the 0.10-0.25 band. If it fights the content sections at rest, 0.15 is the next step down; if too invisible, 0.22 is the ceiling.

## Firewall compliance

- HeroSection.tsx untouched by this pipeline: **PASS**. The working-tree diff on `frontend/src/components/landing/HeroSection.tsx` predates this pipeline (it's drift from the prior landing overhaul, last committed in `a3e9742` "Phase 10-C — landing page mobile polish"). Grep for `AtmosphericImage|atmospheric-hour|atmospheric-dwelling` in HeroSection: **0 matches**.
- hero-frames/ untouched (121 frames): **PASS**. `ls frontend/public/images/hero-frames/ | wc -l` returns 121.
- backend files untouched: **PASS**. The pipeline only wrote to `scripts/kie-api.py`, `frontend/public/images/atmospheric*`, and `frontend/src/components/landing/AtmosphericImage.tsx` + `LandingPage.tsx`. Git status confirms no backend files in the diff.

---

**End of audit.**
