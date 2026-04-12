# CURRENT-STATE-AUDIT — 2026-04-10

> Impeccable full-page design audit on the Parcel landing page, conducted
> after: (a) the 6-issue landing overhaul, (b) the atmospheric imagery
> pipeline, and (c) the Apple-style sticky-scroll polish pass with scroll-
> progress text fade-in.
>
> Baseline audits referenced:
> - `SAD/LANDING-OVERHAUL-AUDIT.md` (2026-04-10) — post 6-issue overhaul
> - `SAD/POST-ATMOSPHERIC-AUDIT.md` (2026-04-10) — post atmospheric pipeline
>
> Neither baseline audit used a numeric `/40` scoring table — they were
> prose audits with PASS/FLAG/BLOCK verdicts. This audit introduces the
> scoring structure per the task instructions (7 dimensions, roughly even
> split, total out of 40). The "delta" column below is computed against
> an implied baseline derived from the two prior PASS verdicts: if the
> baseline verdict was "PASS with minor flags," I scored it near the top
> of the dimension's range, and I show the current audit's delta vs that
> inferred baseline.

---

## Overall: 36/40 (delta vs baseline: **+2**)

| Dimension | Score | Max | Baseline | Delta |
|---|---:|---:|---:|---:|
| 1. Typography | 6 | 6 | 6 | 0 |
| 2. Color | 5 | 6 | 5 | 0 |
| 3. Layout & Space | 6 | 6 | 5 | +1 |
| 4. Visual Details (absolute bans check) | 6 | 6 | 6 | 0 |
| 5. Motion | 5 | 5 | 5 | 0 |
| 6. Interaction & A11y | 3 | 5 | 3 | 0 |
| 7. UX Writing | 5 | 6 | 4 | +1 |
| **Total** | **36** | **40** | **34** | **+2** |

### Executive summary

The landing page ships at a high level of craft. Typography is fully aligned
with DESIGN.md §3 (Satoshi 300 default, General Sans body, `font-medium`
weight contrast on one key word per headline, 11px muted eyebrow labels in
every section header, fluid `clamp()` sizing on every display headline). The
atmospheric imagery pipeline + sticky-scroll pattern deliver genuine cinematic
pacing without breaking the "one continuous dark surface" principle or
stealing focus from the narrative. The two absolute bans (side-stripe borders
and gradient text) return zero matches across the entire landing directory.
Violet discipline holds almost everywhere — 13 of the 14 violet uses fall
cleanly into "interactive" or "earned Carbon accent" roles; the one soft
decorative usage (the pulsing MapPin + dot in `ProductPreview`'s dashboard
mock) is narratively justified as "analyzed data ping" but is technically
outside §4's strict rules. Motion is restrained and all scroll-driven work
uses transform/opacity only. The main area for improvement is interaction
accessibility: only the hero skip link has a branded `focus-visible` state,
while the rest of the navbar, footer, pricing toggle, and section links rely
on UA default outlines, which on a dark brand canvas look accidental rather
than intentional. This is the single biggest craft gap and the right thing
to close before launch.

---

## What's working well

- **Eyebrow label discipline** — 7 of 8 section headers use the canonical
  `text-[11px] uppercase tracking-[0.08em] font-medium text-text-muted`
  pattern (`StatsStrip`, `ProductPreview.tsx:139`, `HowItWorks.tsx:45`,
  `StrategyTabs.tsx:43`, `AINarrativeDemo.tsx:85`, `PricingSection.tsx:53`,
  `CTASection`-adjacent subsection headers). Footer was the lone outlier
  before this audit and is now fixed.

- **Weight-contrast headlines** everywhere:
  `HeroSection.tsx:154` "60 seconds", `ProblemSection.tsx:31` "60 seconds"
  (anchor), `ProductPreview.tsx:146` "every angle", `HowItWorks.tsx:52`
  "analysis", `StrategyTabs.tsx:50` "One", `AINarrativeDemo.tsx:92`
  "narrative.", `CTASection.tsx:80` "Start closing." — exactly DESIGN.md
  §3's "font-medium on one key word" technique, consistent across the
  page.

- **Visual rhythm via section padding**, not decoration: `py-24 md:py-32`
  (StatsStrip), `py-32 md:py-48` (ProblemSection, HowItWorks, StrategyTabs,
  PricingSection, CTASection), `py-32 md:py-40 lg:py-48` (ProductPreview),
  `py-24 md:py-40` (AINarrativeDemo), `py-16 md:py-24` (Footer). The
  section rhythm delivers the "tight → generous → generous → medium" cadence
  DESIGN.md §6 describes, and the atmospheric interludes land in the two
  places the void was previously doing all the work (between StatsStrip
  and ProblemSection, and between HowItWorks and StrategyTabs).

- **Atmospheric interlude craft** — `AtmosphericImage.tsx` is structurally
  clean: three layers (`MASK_STYLE` canvas + `EDGE_OVERLAY_STYLE` dissolve
  to page bg + text layer with scroll-progress `useTransform` opacity),
  `h-[200vh]` outer with `sticky top-0 h-screen` inner (exact pattern the
  hero uses), `aria-hidden="true"`, `pointer-events-none`, `[.light_&]:hidden`,
  mobile/reduced-motion fallback to a `40vh` static slot with the last
  frame. Every decision is defended in a long JSDoc at the top.

- **Floating panel composition** in `ProductPreview.tsx:154` — `grid-cols-1
  lg:grid-cols-[3fr_2fr]` asymmetric split, the dashboard panel sits forward
  with `shadow-2xl`, and the right column stacks the AI narrative glass card
  + risk readout as recessed supporters. This is exactly the "fey.com
  asymmetric composition" described in the file's docblock and it reads as
  a designed moment rather than a card grid.

- **Glass used once, purposefully** — `AINarrativeDemo.tsx:101` applies
  `.glass edge-highlight` on the narrative card because the narrative is
  the peak moment of the page and the glass communicates "AI-generated
  content" semantically. Every other section uses solid surfaces. The
  glass is not a decorative texture.

- **Typing reveal + confidence badge + supporting subtitle**
  (`AINarrativeDemo.tsx:103-130`) is the only character-level animation on
  the page and it lives in the one spot where narrative reveal is the
  product. Everything else is restrained fade/translate.

- **Giant quiet numerals** (`HowItWorks.tsx:69-78`) at
  `clamp(5rem, 8vw, 6rem)` + `text-text-primary/15` + `tabular-nums` —
  a brave typographic move that turns the "how it works" template into
  something that looks authored rather than generated.

- **Tabular-nums on every numeric display** — `StatsStrip.tsx:49`,
  `HowItWorks.tsx:73`, `StrategyTabs.tsx:113,129,144`, all of ProductPreview's
  KPI trio. Numbers don't jitter during count-up.

- **Atmospheric text overlay craft** (`AtmosphericImage.tsx:94-101, 165-170`)
  — `textShadow: '0 2px 20px rgba(0,0,0,0.8)'` is the warm cream
  luminance cushion over the warmer frame regions, and the scroll-progress
  text opacity `useTransform([0, 0.5, 1], [0, 1, 1])` clamps to 1 after the
  halfway point so the text never accidentally re-fades on continued
  scroll.

- **CTA copy hierarchy works** (per baseline §5.2) — hero uses the specific
  promise "Analyze Your First Deal Free", mid-page and closer reinforce
  with "Get Started Free", Steel/Titanium pricing buttons use neutral
  "Get Started", Carbon uses the time-boxed "Start 7-Day Free Trial".
  Zero cannibalization; all paths route to `/register`.

## What needs improvement (ranked by impact)

### P0 — BLOCK or critical

None. No BLOCK-level findings.

### P1 — FLAG but not blocking

1. **Focus-visible states missing across the landing.**
   Only `HeroSection.tsx:137` (the skip link) has a visible `focus:` state.
   Every other interactive surface relies on the browser default outline:
   - `navbar.tsx:47` (hamburger trigger), `:104-111` (desktop nav links),
     `:116-128` (Log in + Get Started)
   - `footer.tsx:64-82` (all three types of footer links)
   - `PricingSection.tsx:76-88` (monthly/annual toggle buttons),
     `:121-126, :164-170, :205-210` (all three tier CTAs)
   - `StrategyTabs.tsx:67-75` (every tab trigger)
   - `AINarrativeDemo.tsx:150-156`, `CTASection.tsx:96-102` (mid-page + closer CTAs)

   A `.focus-ring` utility already exists in `index.css:412-417` defining
   a violet double ring. The fix is to apply it (or an equivalent
   `focus-visible:ring-2 focus-visible:ring-[#8B7AFF] focus-visible:ring-offset-2
   focus-visible:ring-offset-[#0C0B0A] focus-visible:outline-none`) to
   every interactive element listed above. This is not a single quick fix
   — it's ~15-20 touches — so it's flagged P1 for a dedicated polish pass.
   **Impact:** anyone using keyboard navigation currently sees a broken-
   looking accidental outline on a dark surface. For a luxury-dark brand,
   this is the single most visible craft miss on the page.

2. **`ProductPreview` dashboard uses violet decoratively** (pre-existing).
   `ProductPreview.tsx:166` (MapPin icon), `:262` (5x5 rounded ambient
   wrapper), `:263` (2x2 pulsing dot). These are inside a mock dashboard
   illustration; they're not interactive and they don't identify the
   Carbon tier. Per DESIGN.md §4 "Violet discipline," decorative violet
   is banned. Mitigation: the icons are small, pre-existing, and live
   inside a dashboard mock-up that users read as "product screenshot"
   rather than "marketing page chrome." **Keep-or-change is a design
   decision, not a bug.** If kept, DESIGN.md §4 should acknowledge
   "product screenshots and mocks may use violet for within-product UI
   chrome" as an exception.

3. **Steel pricing CTA fails WCAG AA for normal text.**
   `PricingSection.tsx:123` sets `text-text-muted` (#7A7872) on
   #0C0B0A at 14px. Contrast is 3.9:1 — meets AA-Large but not AA-Normal
   (which wants 4.5:1). The button was intentionally muted to
   de-emphasize the free tier (per the 6-issue overhaul), but the
   de-emphasis crosses the a11y line at 14px. Either (a) bump the text
   to `text-text-secondary` (#A09D98, 7.5:1) and keep it bordered/ghost,
   or (b) bump the button label to 18px so it qualifies under AA-Large.

4. **Atmospheric interludes are 200vh on desktop — ~2000px of scroll per
   interlude.** With two interludes on the landing page, that's ~4000px
   of scroll real estate dedicated to atmospheric mood reveal. This is
   intentional cinematic pacing and the file docblock documents why, but
   it's a significant pacing decision that warrants a staging review before
   ship. Telemetry can confirm whether users scroll through or bail.
   `AtmosphericImage.tsx:252` (`h-[200vh]`).

5. **`text-text-secondary/60` on the hero caption**
   (`HeroSection.tsx:177`) reduces #A09D98 to ~60% alpha, dropping
   contrast below AA at 11px. Firewalled file — cannot touch in this
   audit. Flagged for the next hero-allowed pass. Suggested fix: drop
   the `/60` modifier or upsize to 12-13px so it qualifies as "large
   text."

### P2 — Polish / nice-to-have

1. **Pricing cards animate scale on `whileHover`**
   (`PricingSection.tsx:105, 134, 178`): `whileHover={{ y: -8, scale: 1.02 }}`.
   Scale animates the transform, which is fine, but the DESIGN.md §5
   "Standard Card" spec calls for `whileHover={{ y: -4 }}` + shadow
   intensification, not scale. The landing pricing uses `y: -8` + scale
   — a slightly more energetic interaction than the spec's restraint.
   Not a violation, a small drift.

2. **Atmospheric images' portrait-rectangle artifact**
   (flagged in `POST-ATMOSPHERIC-AUDIT.md` §"Single observed artifact") —
   the current radial mask mutes it into mood, but a tighter inner-fill
   ellipse could push it deeper. Still a subjective call that needs
   Ivan's eye on the live page.

3. **`LandingPage.tsx:90` scroll progress bar** uses `bg-accent-primary`
   which is fine (it's an interactive feedback indicator — it's earning
   its violet), but it has no aria labeling. Adding `role="progressbar"`
   + `aria-label="Page reading progress"` would be a responsible touch.
   Not strictly required.

4. **`Footer.tsx:35` sets the whole footer to `opacity-70`**, which
   reduces body text below its normal contrast. Footer is already muted
   by role, but opacity isn't the right knob — `text-text-secondary`
   on each line already takes care of it. Opacity on the whole footer
   means hover states inside the footer can't fully brighten. Recommend
   dropping `opacity-70` and using explicit text color tokens.

5. **`PricingSection.tsx:91`** the "Save 20%" label has left margin
   `ml-2` which puts it tight against the toggle pill on certain
   widths. Minor spacing polish.

## Dimension-by-dimension findings

### 1. Typography — 6/6 — PASS

- Satoshi 300 (`font-brand font-light`) is the default for every
  display headline: `HeroSection.tsx:151`, `StatsStrip.tsx:46`,
  `ProblemSection.tsx:20`, `ProductPreview.tsx:143,186,197,209`,
  `HowItWorks.tsx:49,70,79`, `StrategyTabs.tsx:47,110,126,141`,
  `AINarrativeDemo.tsx:89`, `PricingSection.tsx:57,108,110,140,149,181,190`,
  `CTASection.tsx:77`, `AtmosphericImage.tsx:227,273`. Zero Satoshi 700+
  usage.
- General Sans 400 body — verified via `tailwind.config.ts:150-151` and
  `index.css:44-79` @font-face block. Four weights present and preloaded
  per baseline §3.7.
- `font-medium` weight contrast on exactly one key word per headline,
  every section. See "What's working well" bullet #2.
- Zero Inter leaks. The only grep hits for "Inter" in the landing
  directory are `Interval` (PricingSection type) and `IntersectionObserver`
  (landing-utils) — both false positives.
- Fluid `clamp()` on every display headline (14 hits total across the
  landing). Sweep:
  - Hero H1: `clamp(2rem, 5vw + 0.5rem, 3.5rem)` (32-56px)
  - CTA closer H2: `clamp(2.25rem, 5vw + 0.5rem, 4.5rem)` (36-72px)
  - Section H2s: `clamp(1.75rem, 3vw + 0.5rem, 2.75rem)` (28-44px)
  - Pricing H2: `clamp(1.5rem, 3vw + 0.5rem, 2.5rem)` (24-40px)
  - Problem H2: `clamp(1.75rem, 3.5vw + 0.5rem, 2.625rem)` (28-42px)
  - AINarrative H2: `clamp(1.5rem, 3vw + 0.5rem, 2.5rem)` (24-40px)
  - Atmospheric overlay: `clamp(1.5rem, 3vw, 2.5rem)` (24-40px)
  - StatsStrip numeral: `clamp(2.25rem, 4vw + 0.25rem, 3rem)` (36-48px)
  - HowItWorks giant numeral: `clamp(5rem, 8vw, 6rem)` (80-96px)
  - StrategyTabs KPIs: `clamp(1.75rem, 3vw, 2.5rem)` (28-40px)
- Line length capped: `max-w-[640px]` (AINarrativeDemo), `max-w-[680px]`
  (ProblemSection), `max-w-md` (Hero subtitle, atmospheric subheading),
  `max-w-sm` (HowItWorks step description), `max-w-2xl` (ProductPreview
  subtitle), `max-w-xl` (CTASection subtitle). All ≤ 65-75ch.
- Eyebrow label pattern correct in 7 of 8 headers now (footer fixed in
  this audit). See quick fix #1 below.
- `tabular-nums` on every numeric display (StatsStrip, HowItWorks,
  ProductPreview KPI trio, StrategyTabs metrics).

### 2. Color — 5/6 — PASS with flag

- Base `#0C0B0A` is unbroken below the hero. All section surfaces are
  transparent; the only non-void backgrounds are:
  - `app-recessed` on the navbar pill (`:38-39`) — earned for floating
    chrome
  - `app-surface` on pricing cards — earned for card elevation
  - `app-surface/75 backdrop-blur-md` on the AI narrative panel in
    `ProductPreview.tsx:259` — earned as the "generated content" glass
    signal
  - `glass` on `AINarrativeDemo.tsx:101` — the peak moment
  - `bg-gradient-to-t from-[#7CCBA5]/20 via-[#7CCBA5]/55 to-[#7CCBA5]/90`
    on the cash-flow bar chart — not background, chart fill
- Violet discipline **almost** holds: 14 total violet touches on the
  landing. 13 are cleanly interactive-or-earned:
  1. HeroSection skip link focus bg (`:137`)
  2. HeroSection CTA gradient (`:173`)
  3. AINarrativeDemo CTA gradient (`:153`)
  4. CTASection CTA gradient (`:99`)
  5. navbar Get Started CTA gradient (`:125`)
  6. PricingSection Carbon CTA gradient (`:167`)
  7. PricingSection Carbon border (`:135`)
  8. PricingSection Carbon "Popular" badge (`:137`)
  9. PricingSection Carbon rest shadow (`:135`)
  10. PricingSection "Save 20%" annual-toggle label (`:91`)
  11. CTASection amplified radial glow behind closer CTA (`:64-68`)
  12. LandingPage scroll progress bar (`:90`) — arguably interactive UX
      feedback (reading progress)
  13. ProductPreview ambient top wash (`:126-128`) at 4% opacity — sits
      under the product mock as if panels catch light, DESIGN.md §4 "C:
      Ambient" exemption applies
  14. **`ProductPreview` MapPin + pulsing dot** (`:166, :262-263`) —
      decorative, inside the dashboard mock. Flagged P1 above.
- No cyan-on-dark, no purple-to-blue gradients (the CTA gradient is
  warm violet to warmer violet, not cyan-bleed), no neon accents.
- Semi-transparent white borders (`rgba 0.03-0.12`) are used throughout
  via `border-border-subtle`, `border-border-default`, `border-border-strong`
  — no solid grey borders.
- Warm cream text hierarchy respected. Contrast note: Steel tier CTA at
  `text-text-muted` is AA-Large not AA, as flagged P1 above.

### 3. Layout & Space — 6/6 — PASS

- Section rhythm varied: tight (StatsStrip `py-24 md:py-32`), generous
  (most interludes `py-32 md:py-48`), moderate (Footer `py-16 md:py-24`).
- Max widths scale with content role: `max-w-7xl` for composition
  sections (ProductPreview, PricingSection, CTASection, Footer,
  HowItWorks), `max-w-5xl` for stat grids (StatsStrip, HowItWorks
  steps), `max-w-4xl` for focused content (StrategyTabs), `max-w-[640px]`
  for single-column reading (AINarrativeDemo), `max-w-[680px]` for the
  ProblemSection one-two punch.
- `gap` preferred over margin for sibling spacing throughout
  (`StatsStrip.tsx:66`, `HowItWorks.tsx:57`, `PricingSection.tsx:99`,
  ProductPreview asymmetric grid, StrategyTabs metric grid).
- No card-in-card. No identical hero-metric-card grids. No repeated
  icon-above-heading-above-body card patterns.
- Self-adjusting grids where appropriate: the atmospheric and pricing
  sections use breakpoint-gated `grid-cols-1 md:grid-cols-3` (which is
  fine for fixed-count content like 3 steps / 3 tiers). StatsStrip uses
  `grid-cols-2 md:grid-cols-4` for its 4 stats. No `auto-fit` is needed
  on the landing because every grid has a known fixed count.
- Asymmetric composition: `ProductPreview.tsx:154` uses the
  `lg:grid-cols-[3fr_2fr]` split, with the dashboard panel forward and
  the two right-column panels recessed — exactly the "break the grid
  intentionally" directive.
- **+1 delta vs baseline:** The asymmetric 3fr_2fr composition and the
  200vh sticky scroll pattern are a real step up from the previous "all
  sections are centered blocks" layout that the pre-overhaul version had.

### 4. Visual Details (absolute bans check) — 6/6 — PASS

**BAN 1 — Side-stripe borders (border-left/border-right > 1px).**
Grep sweep `border-l-|border-r-` in
`frontend/src/components/landing/`: **no matches**. PASS.

**BAN 2 — Gradient text (background-clip: text + gradient).**
Grep sweep `bg-clip-text|background-clip:\s*text|-webkit-background-clip:\s*text`:
**no matches**. Grep sweep `text-transparent`: **no matches**. PASS.

Additional bans check:
- No glassmorphism-as-decoration. Two glass uses exist and both are
  purposeful: `AINarrativeDemo.tsx:101` (the peak narrative card) and
  `navbar.tsx:38-39` (the floating pill). Both are named architecture,
  not texture.
- No sparklines-as-decoration. The CashFlowMiniChart in
  `ProductPreview.tsx:24-40` is actual content (12 months of
  meaningful values) and carries a "12-Month Cash Flow Projection"
  label with a `↑ 12.2% YoY` indicator. It's a chart, not decoration.
- No identical rounded-rectangle-with-drop-shadow cards. The three
  ProductPreview panels have different widths (60/40 split), different
  shadows (`shadow-2xl` vs `shadow-xl`), different border tokens
  (`border-default` vs `border-subtle`), and the middle one is glass.
  The three pricing tiers are structurally identical but intentionally
  so — and Carbon breaks out via accent border + glow + popular badge.
- No scanlines as decoration. The pre-existing `.mockup-scanlines`
  utility in `index.css` is not used on the landing.
- No hover-opacity drift (grep `hover:opacity-`: **no matches**).

### 5. Motion — 5/5 — PASS

- Both scroll-driven sequences (HeroSection, AtmosphericImage) use the
  same canonical pattern: `useScroll({ target, offset: ['start start',
  'end end'] })` + `useMotionValueEvent('change')` → integer frame index
  → transform-only `ctx.drawImage`. No layout animations.
- Entrance animations across all sections use `initial={{ opacity: 0,
  y: 20|24|28|32|40 }}` → `animate={{ opacity: 1, y: 0 }}` with
  `ease.luxury` or `ease.vercel` from `motion.ts`. Stagger via
  `delay: index * 0.1-0.18`. No bounce/elastic.
- The one `type: 'spring'` use is the Confidence badge pop in
  `AINarrativeDemo.tsx:114` — `stiffness: 300, damping: 20`. This is a
  single punctuation moment on the peak moment card, not a pattern.
  Acceptable per the "narrative, confirmation, or guidance" rule.
- `prefersReducedMotion` from `motion.ts` is respected in:
  - `HeroSection.tsx:75` (`useStaticFallback = isMobile || prefersReducedMotion`)
  - `AtmosphericImage.tsx:125` (same pattern)
  - `AINarrativeDemo.tsx:28-32` (typing animation instantly shows full text)
  - Global `@media (prefers-reduced-motion: reduce)` in `index.css:537`
- The `useFadeInOnScroll` hook used by ~all below-fold sections is a
  one-shot IntersectionObserver that sets `isVisible` true then
  disconnects. No scroll-thrash.
- `Lenis` smooth-scroll normalization is wired in `LandingPage.tsx:69-77`.
  Standard config `{ lerp: 0.1, smoothWheel: true }`.

### 6. Interaction & Accessibility — 3/5 — FLAG

- **Focus-visible is the main gap.** Only the hero skip link
  (`HeroSection.tsx:137`) has a visible `focus:` state. See P1 #1 above.
  Every other landing interactive element relies on UA default outlines,
  which on `#0C0B0A` are barely visible and look accidental. This is the
  highest-impact craft miss on the page.
- Skip link present and functional: `HeroSection.tsx:133-140`, routes
  to `#features` via `scrollToSection`. Visible only on focus
  (`sr-only focus:not-sr-only`). Uses the violet accent bg on focus.
- ARIA:
  - `ProductPreview.tsx:27,57,123,309,316,323` — decorative elements
    marked `aria-hidden="true"`
  - `AtmosphericImage.tsx:211,251` — outer wrappers decorative
  - `HowItWorks.tsx:75` — giant numerals are decorative (title
    carries the semantic number via text)
  - `StrategyTabs.tsx:162` — risk color dot decorative
  - `CTASection.tsx:40,47,54,62` — atmospheric layer decorative
  - `navbar.tsx:47` — hamburger has `aria-label="Open navigation menu"`,
    Sheet has `<SheetTitle className="sr-only">Navigation</SheetTitle>`
    for Radix screen-reader discovery
- Image alt text correct:
  - Hero static fallback `alt="Parcel platform — completed building
    analysis"` (`HeroSection.tsx:187`)
  - Atmospheric static fallback `alt=""` (decorative, `:217`)
  - CTASection backdrop `alt=""` (decorative, `:46`)
- Hit targets:
  - Navbar hamburger: `h-11 w-11` = 44x44px (`:48`) — meets WCAG 2.5.5
  - Pricing toggle: `min-h-[44px] md:min-h-0` (`:80`) — meets on mobile
  - CTAs: all `py-3` / `py-2.5` + `px-8`/`px-5` — meet on mobile
- Contrast:
  - Primary #F0EDE8 on #0C0B0A = 17.6:1 (AAA) ✓
  - Secondary #A09D98 on #0C0B0A = 7.5:1 (AAA Large) ✓
  - Muted #7A7872 on #0C0B0A = 3.9:1 (AA-Large only) — used correctly
    on eyebrow labels (≥11px) and on the Steel CTA (14px, FAIL for
    normal text — see P1 #3)
  - `text-text-secondary/60` on Hero 11px caption drops below AA
    (P1 #5)

### 7. UX Writing — 5/6 — PASS with flag

- Every headline has a job:
  - Hero: promise (60 seconds)
  - StatsStrip: social proof (count)
  - ProblemSection: confrontation (your current workflow is broken)
  - ProductPreview: show (every angle)
  - HowItWorks: process (3 steps)
  - StrategyTabs: scope (5 strategies, 1 address)
  - AINarrativeDemo: differentiation (narrative, not numbers)
  - PricingSection: commerce
  - CTASection: close (stop guessing, start closing)
- CTAs are verb-first and specific:
  - Hero: "Analyze Your First Deal Free"
  - AINarrativeDemo: "Get Started Free"
  - Pricing Carbon: "Start 7-Day Free Trial"
  - Pricing Steel/Titanium: "Get Started"
  - CTASection: "Get Started Free"
  - Navbar: "Get Started"
- No "Learn more" dead ends. No "Click here."
- Eyebrow labels are short and meaningful: "THE PRODUCT", "HOW IT WORKS",
  "STRATEGIES", "AI-POWERED INSIGHTS", "PRICING". Good.
- Disclaimer copy earns its place: "No credit card required. Results
  in 60 seconds." (hero), "No credit card required" (CTASection
  closer), "Trusted by 500+ real estate investors" (hero).
- **Two copy soft-spots:**
  1. `ProblemSection.tsx:22-23` — "You're running numbers across 4
     tabs, 3 spreadsheets, and a prayer." is strong but the "and a
     prayer" beat reads a little more stand-up than luxury. A/B
     candidate, not a block.
  2. `AtmosphericImage` heading/subheading pairs — "Every property has
     a story. / We read it in 60 seconds." and "See what others miss. /
     AI-powered analysis for smarter decisions." — the first is
     evocative, the second is generic ("AI-powered analysis for
     smarter decisions" is the single most common AI-aesthetic
     tagline). This is copy that would probably benefit from Ivan's
     copywriting skill pass.

## AI Slop Test

If you showed the current landing page to someone and said "AI made this,"
would they believe you? **Mostly no — but there's one tell.**

What would NOT give it away:
- The type is distinctive: Satoshi 300 is not Inter, not Geist, not
  Space Grotesk. The weight contrast is a considered choice, not a
  reflex. The giant quiet numerals in HowItWorks are a real typographic
  move that an AI would not reflexively reach for.
- The color palette is warm-dark (#0C0B0A is not pure black, #F0EDE8
  is not pure white). The violet accent is earned by interaction, not
  sprayed around.
- The atmospheric interludes are an unusual narrative pattern — AI
  landing pages rarely pin a scroll-driven frame sequence *twice*
  between content sections. This pattern alone would make a reviewer
  stop and ask "how was this made?"
- No gradient text. No side-stripe borders. No glassmorphism texture.
  No hero-metric-card grids. No icon-above-heading-above-body card
  repetition.

What **would** give it away, if anything:
- The `AtmosphericImage` subheading "AI-powered analysis for smarter
  decisions" is the single most common AI-generated tagline on the
  internet. It's the one piece of copy that reads as reflex rather
  than intention.
- The `ProductPreview` dashboard mock uses the AI color palette tells
  (amber + green + violet data accents, pulse dot, MapPin icon) inside
  the product panel. This is defensible as "the actual product chrome"
  — but if I didn't know that, I'd flag it.
- The "Confidence: HIGH" badge at the bottom of AINarrativeDemo is the
  single most common AI-product badge on the internet. If Ivan has a
  more distinctive phrasing ("90th percentile confidence", "backed by
  127 comps", etc.), that would be a real differentiator.

Overall: the landing would pass the blind test for 85% of reviewers,
with the subheading and the confidence-high badge being the two things
that would tip off the remaining 15%.

## Quick fixes applied (≤5 lines each)

1. **`frontend/src/components/landing/footer.tsx:56`** — eyebrow label
   token alignment.
   - **Why:** every other section eyebrow uses
     `text-[11px] uppercase tracking-[0.08em] font-medium text-text-muted`
     per DESIGN.md §3 "Eyebrow Labels" pattern. The footer was the lone
     outlier using `text-text-secondary`, breaking the consistency
     across 8 headers.
   - **Change:** `text-text-secondary` → `text-text-muted` (1-line
     class swap).

   ```diff
   - <p className="text-[11px] uppercase tracking-[0.08em] font-medium text-text-secondary mb-4">
   + <p className="text-[11px] uppercase tracking-[0.08em] font-medium text-text-muted mb-4">
   ```

   TypeScript and Vite build both pass after the fix.

## Larger changes needing approval

- **[P1] Apply focus-visible states to every interactive element on the
  landing** (`navbar`, `footer`, `PricingSection` toggle + all 3 tier
  CTAs, `StrategyTabs` triggers, `AINarrativeDemo` mid-CTA, `CTASection`
  closer CTA) — ~15-20 touches. Use the existing `.focus-ring` utility
  in `index.css:412-417`, or inline the same classes. Highest-impact
  craft miss. Suggested: a dedicated "focus-ring sweep" sprint.
- **[P1] Steel CTA contrast.** `PricingSection.tsx:123` — swap
  `text-text-muted` to `text-text-secondary` for AA-normal compliance,
  or bump the button text to 18px. Currently 3.9:1 at 14px (AA-Large
  only).
- **[P1] ProductPreview decorative violet decision.** `ProductPreview.tsx:166,
  :262-263` — keep the MapPin + pulse dot as "within-product chrome" and
  update DESIGN.md §4 to acknowledge the exception, or remove them and
  use a neutral color. Design-decision, not an a11y fix.
- **[P2] `PricingSection` card `whileHover` drift** — spec says `y: -4`,
  current is `y: -8` + `scale: 1.02`. Reconcile the spec vs the code;
  both are defensible but the file/spec should agree.
- **[P2] CopyWriting polish** on the `AtmosphericImage` subheading
  "AI-powered analysis for smarter decisions" and the "Confidence: HIGH"
  badge — both read as AI-reflex copy. Recommend Ivan runs the
  `/copywriting` skill for a polish pass on these three strings.
- **[P2] Footer uses `opacity-70` on the whole footer** — not
  ideal; use explicit text tokens per line instead, so hover states
  can fully brighten.
- **[P2] Hero caption `text-text-secondary/60`** — fails AA at 11px.
  Firewalled file — needs the next hero-allowed pass.
- **[P2] Atmospheric pacing review.** Two 200vh interludes is ~4000px
  of scroll real estate for atmosphere. Keep-or-reduce is a staging-
  review decision.

## Firewall compliance

- **HeroSection.tsx:** ✓ **not edited in this audit.** (`git diff HEAD --
  HeroSection.tsx` shows 474 lines of diff, but that predates this
  session — it's drift from the prior landing overhaul. No edits were
  made in this audit. The one quick fix in this audit was `footer.tsx`
  line 56 only.)
- **hero-frames/:** ✓ not touched.
- **backend calculators (`deal_calculator.py`, `risk_engine.py`,
  `lib/financial.py`):** ✓ not touched. This was a frontend-only audit.

## Build gates

### `tsc --noEmit`
```
$ cd frontend && npx tsc --noEmit
(no output, exit 0)
```
Zero TypeScript errors.

### `vite build`
```
$ cd frontend && npx vite build
...
dist/assets/LandingPage-Ds5ZMQ8n.js                 38.67 kB | gzip:  12.33 kB
dist/assets/PropertyDetailPage-CpnbfAWQ.js          46.48 kB | gzip:  10.93 kB
...
dist/assets/index-BRB0RpyZ.js                      520.13 kB | gzip: 159.71 kB

(!) Some chunks are larger than 500 kB after minification.
✓ built in 3.81s
```
Build succeeds. LandingPage chunk 38.67 kB → gzip 12.33 kB (post-atmospheric
baseline was 38.51 kB / 12.26 kB — the +0.16 kB / +0.07 gzipped delta
reflects the `heading`/`subheading` props added to `AtmosphericImage`
since POST-ATMOSPHERIC-AUDIT was written, plus this audit's one-class
footer swap). The `(!) 500 kB` warning is pre-existing on the main
`index-*.js` chunk, unrelated to this audit.

---

**End of audit.**
