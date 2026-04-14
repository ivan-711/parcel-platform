# Agent 07 — Deal Analysis & Results Display: Luxury Dark Treatment

Research document for transforming Parcel's 5-calculator analysis flow (strategy selection,
form inputs, loading state, results KPIs, risk gauge, cash flow projection, comparison,
and PDF export) into a luxury dark aesthetic. Stack context: React 18, TypeScript, Tailwind CSS,
Framer Motion, Recharts, React Hook Form + Zod. Palette: bg `#0C0B0A`, cream text `#F0EDE8`,
violet accent `#8B7AFF`.

---

## 1. Form Inputs on Dark Backgrounds

### Background and Border Treatment

Financial form inputs on dark surfaces must balance readability with restraint. The current
Parcel forms use `bg-white border-gray-300 text-gray-900` which will invert entirely.

The premium pattern used by Linear, Raycast, and Arc on dark is a slightly elevated surface
with a 1px border that is barely distinguishable from the fill:

```
/* Resting state */
background: #161514;              /* 1 stop above page bg #0C0B0A */
border: 1px solid #262524;        /* visible on hover, ghost at rest */
color: #F0EDE8;                   /* cream text for entered values */
border-radius: 10px;
```

Tailwind mapping for the input component:

```tsx
<Input
  className={cn(
    "h-11 w-full rounded-[10px] border border-white/[0.08] bg-[#161514]",
    "px-3.5 py-2.5 text-[15px] text-cream tabular-nums",
    "placeholder:text-white/30",
    "transition-all duration-200",
    "hover:border-white/[0.14]",
    "focus-visible:border-violet-500/60 focus-visible:ring-2 focus-visible:ring-violet-500/20",
    "focus-visible:ring-offset-0",
    error && "border-red-500/60 ring-2 ring-red-500/15"
  )}
/>
```

The `border-white/[0.08]` approach is superior to a fixed gray because it adapts naturally
if the underlying surface color shifts. The 8% opacity reads as a barely-there seam at rest,
14% on hover gives confirmation the field is interactive, and the violet focus ring provides
unmistakable active state.

### Focus Ring

Two-layer focus: border shifts to `violet-500/60` and a soft outer ring at `violet-500/20`.
No ring-offset -- the glow should blend seamlessly from the border outward, creating a
single luminous highlight rather than two discrete elements.

```css
/* Focus ring on dark */
focus-visible:border-violet-500/60
focus-visible:ring-2
focus-visible:ring-violet-500/20
focus-visible:ring-offset-0
focus-visible:outline-none
```

This produces an effect similar to a soft neon edge. The violet is deliberate -- it
coordinates with the `#8B7AFF` accent and creates visual consistency between the focus
state and the primary action button.

### Placeholder Color

Placeholder text at `white/30` (roughly `rgba(255,255,255,0.30)`) sits comfortably below
the entered-value cream but remains legible. Avoid going below 25% or the field looks
empty and the user misses the hint.

### Label Placement

Above-field labels in `text-white/50` with `text-xs font-medium uppercase tracking-[0.08em]`.
This mirrors the current KPICard label style and creates vertical rhythm. The uppercase
tracking gives labels a caption feel that separates them from the input value below.

```tsx
<Label className="text-xs font-medium text-white/50 uppercase tracking-[0.08em]">
  Purchase Price
</Label>
```

For the ConceptTooltip dashed underline, switch from the current `border-text-muted` to
`border-white/25 hover:border-white/40` so the glossary trigger is visible but not dominant.

---

## 2. Number Input Formatting on Dark

### Currency Prefix ($)

The dollar sign adornment should sit at `left-3.5` in `text-white/35` -- dimmer than the
entered value so the eye reads the number first, symbol second. Use `tabular-nums` on both
the adornment and the input to keep columns aligned when multiple dollar fields stack.

```tsx
<span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35 text-sm tabular-nums select-none">
  $
</span>
<Input className="pl-7 tabular-nums ..." />
```

### Percentage Suffix (%)

Same treatment on the right side: `right-3.5 text-white/35`. The suffix must not compete
with the number. On dark, a 35% opacity white provides perfect subordination.

### Comma Separators

For display-only formatted fields or live preview values, use `Intl.NumberFormat` with
comma grouping. Inside the actual `<input type="number">`, HTML does not support commas --
this is a browser constraint. For luxury feel, consider a controlled text input with
`inputMode="decimal"` and manual formatting on blur:

```tsx
// On blur, format with commas for display
const formatted = new Intl.NumberFormat('en-US').format(numericValue)
// On focus, strip commas for editing
const raw = value.replace(/,/g, '')
```

This pattern (used by Ramp and Mercury) gives the best of both worlds: clean editing
experience plus visual formatting when the field is not active.

---

## 3. Strategy Selector: Premium Dark Treatment

### Current State

Parcel's `StrategySelectPage` renders a 3-column card grid with colored `StrategyBadge`
pills, description text, and arrow icons. Each card links to `/analyze/{strategy}`.

### Recommended Approach: Segmented Cards with Glow

For a luxury dark UI, the most premium feeling is a card-based selector where the selected
card receives a violet border glow and subtle surface elevation. Tabs feel too utilitarian.
A segmented control works for 2-3 options but gets cramped at 5. Cards scale cleanly.

```tsx
{/* Strategy card — dark luxury */}
<button
  onClick={() => selectStrategy(s.strategy)}
  className={cn(
    "group relative flex flex-col gap-3 rounded-xl border p-5",
    "transition-all duration-300",
    selected === s.strategy
      ? "border-violet-500/50 bg-[#161514] shadow-[0_0_24px_rgba(139,122,255,0.08)]"
      : "border-white/[0.06] bg-[#111110] hover:border-white/[0.12] hover:bg-[#161514]"
  )}
>
  <StrategyBadge strategy={s.strategy} />
  <span className="font-semibold text-cream">{s.name}</span>
  <span className="text-sm text-white/45 leading-relaxed">{s.description}</span>
</button>
```

The glow `shadow-[0_0_24px_rgba(139,122,255,0.08)]` creates a barely-perceptible violet
halo around the selected card. It does not illuminate content -- it signals selection
through atmospheric lighting, which is the hallmark of luxury dark interfaces (Arc, Raycast).

### Dark Strategy Badge Colors

The current StrategyBadge uses light pastel backgrounds (`#FEF3C7`, `#EDE9FE`) that will
clash violently on dark. Invert to deep muted tones:

```tsx
const STRATEGY_CONFIG_DARK: Record<Strategy, { bg: string; text: string }> = {
  wholesale:        { bg: 'rgba(251,191,36,0.12)',  text: '#FCD34D' },  // amber
  creative_finance: { bg: 'rgba(139,122,255,0.12)', text: '#A78BFA' },  // violet
  brrrr:            { bg: 'rgba(56,189,248,0.12)',   text: '#7DD3FC' },  // sky
  buy_and_hold:     { bg: 'rgba(74,222,128,0.12)',   text: '#86EFAC' },  // green
  flip:             { bg: 'rgba(251,113,133,0.12)',   text: '#FDA4AF' },  // rose
}
```

These 12%-opacity backgrounds sit naturally on the `#111110` card surface while the
text colors remain vivid enough to differentiate at a glance.

---

## 4. Results Page: Luxury KPI Grid

### KPI Card Treatment

The current `KPICard` uses `bg-white border-gray-200` with `text-gray-900` values. The
dark luxury equivalent:

```tsx
<div className={cn(
  "rounded-xl border border-white/[0.06] bg-[#111110] p-5 space-y-1.5",
  "shadow-[0_1px_3px_rgba(0,0,0,0.4),0_1px_2px_rgba(0,0,0,0.3)]"
)}>
  <p className="text-[11px] font-medium text-white/40 uppercase tracking-[0.1em]">
    {label}
  </p>
  <p className="text-3xl font-semibold text-cream tabular-nums">
    {formatValue(animated, format)}
  </p>
</div>
```

The shadow uses higher opacity values on dark because the contrast against dark surfaces
requires more intensity for the same perceived depth. The label at `white/40` with
`tracking-[0.1em]` uppercase creates the subdued category feel seen in Bloomberg Terminal
and Carta dashboards.

### Sparkline Adaptation

The KPICard sparkline gradient should shift from `#65A30D` (lime) to the violet accent or
a complementary tone. On dark, use a gradient that fades from `violet-500/15` to transparent:

```tsx
<stop offset="0%" stopColor="#8B7AFF" stopOpacity={0.12} />
<stop offset="100%" stopColor="#8B7AFF" stopOpacity={0} />
```

Stroke color: `#8B7AFF` at full opacity for positive values, `#EF4444` for negative.

### Recommendation Badge on Dark

The current `getRecommendationColor` returns light-theme badge classes. For dark, use
glass-morphic badges:

```tsx
// "Strong Buy" on dark
"bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
// "Hold" on dark
"bg-amber-500/10 text-amber-400 border border-amber-500/20"
// "Avoid" on dark
"bg-red-500/10 text-red-400 border border-red-500/20"
```

---

## 5. Risk Score Visualization on Dark

### Current Implementation

The `RiskGauge` renders an SVG circle with a colored arc (sky/amber/red), a center score
text at `#101828`, and a pill label below. Track color is `#EAECF0`.

### Luxury Dark Treatment

**Track:** Replace `#EAECF0` with `rgba(255,255,255,0.06)` -- a ghostly ring that barely
registers until the colored arc sweeps over it.

**Arc glow effect:** Add an SVG `<filter>` with Gaussian blur to create a soft glow along
the arc. This is the single highest-impact upgrade for luxury feel:

```tsx
<defs>
  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
    <feGaussianBlur stdDeviation="4" result="blur" />
    <feMerge>
      <feMergeNode in="blur" />
      <feMergeNode in="SourceGraphic" />
    </feMerge>
  </filter>
</defs>

{/* Foreground arc with glow */}
<circle
  cx={90} cy={90} r={RADIUS}
  fill="none"
  stroke={color}
  strokeWidth={STROKE_WIDTH}
  strokeLinecap="round"
  strokeDasharray={CIRCUMFERENCE}
  strokeDashoffset={offset}
  filter="url(#glow)"
  style={{
    transition: 'stroke-dashoffset 1.2s ease-out',
    transform: 'rotate(-90deg)',
    transformOrigin: '50% 50%',
  }}
/>
```

**Center text:** Change fill from `#101828` to `#F0EDE8` (cream). The score number should
be the brightest element in the gauge.

**Color mapping on dark:**
- Low risk (0-30): `#34D399` (emerald-400) -- green reads better than sky on dark
- Moderate (31-60): `#FBBF24` (amber-400)
- High (61-80): `#F87171` (red-400)
- Very high (81-100): `#EF4444` (red-500) with increased glow stdDeviation to 6

**Label pill on dark:** Replace `bg-sky-50 text-sky-700` with glass treatment:
```tsx
"bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 backdrop-blur-sm"
```

### Gradient Fill Option

For an even more premium feel, replace the solid stroke with a `linearGradient` that
transitions along the arc. For low risk: emerald-400 to teal-300. For high risk: red-500
to orange-400. This creates depth and dimensionality in the gauge.

---

## 6. Cash Flow Projection Tables on Dark

### Current Chart Implementation

The `CashFlowProjection` uses Recharts AreaChart with lime (#65A30D) for monthly and
sky (#0EA5E9) for cumulative. CartesianGrid is `#E5E7EB`, tooltip has white bg.

### Dark Luxury Adaptation

**Grid lines:** `stroke="rgba(255,255,255,0.05)"` -- nearly invisible, just enough to
anchor the eye without creating a cage. Remove horizontal grid entirely on dark for
maximum cleanliness (the Y-axis labels provide sufficient reference):

```tsx
<CartesianGrid
  strokeDasharray="3 3"
  stroke="rgba(255,255,255,0.05)"
  vertical={false}
  horizontal={true}
/>
```

**Axis text:** `fill: 'rgba(255,255,255,0.35)'` at 11px. The axis should be reference
material, not competing with the data.

**Area fills:** Switch from lime/sky to violet/cream:
- Monthly cash flow: stroke `#8B7AFF`, gradient fill from `rgba(139,122,255,0.15)` to transparent
- Cumulative: stroke `#F0EDE8` at 60% opacity, no fill

This creates a violet "glow from below" effect for the primary metric while the cumulative
line floats as a cream ghost line above it.

**Tooltip on dark:**
```tsx
<div className="rounded-lg border border-white/[0.08] bg-[#1A1918] px-4 py-3 shadow-2xl backdrop-blur-xl">
  <p className="text-xs font-medium text-white/40 mb-2">{label}</p>
  {/* values in cream, negative in red-400 */}
</div>
```

### Positive/Negative Highlighting

For months with negative cash flow (rehab periods in BRRRR, holding costs in Flip):
- Negative bars/areas: `#EF4444` at 40% opacity fill, full opacity stroke
- Positive: violet accent fill

The current chart does not visually distinguish positive from negative months -- adding
conditional coloring is a significant upgrade. Recharts supports this via a custom
`<Area>` with `activeDot` styling or by splitting into two data series.

### Alternating Rows in the Outputs Table

The results page "All Outputs" table uses `bg-white` / `bg-gray-50/50` alternation. On dark:

```tsx
<div className={cn(
  "flex items-center justify-between py-2.5 px-4 border-b border-white/[0.04]",
  i % 2 === 0 ? "bg-transparent" : "bg-white/[0.02]"
)}>
  <span className="text-sm text-white/50">{formatLabel(key)}</span>
  <span className="text-sm text-cream tabular-nums">{formatOutputValue(key, value)}</span>
</div>
```

The key insight: on dark, alternating row contrast must be extremely subtle (2% white).
Heavy zebra striping that works in light mode creates prison-bar effects on dark. The
border at `white/[0.04]` provides the primary row separation; the background tint is
secondary reinforcement.

---

## 7. Side-by-Side Strategy Comparison on Dark

### Current Implementation

The `ComparePage` uses selects for deal A/B, a comparison table with winner highlighting
(green bg for better values), and a `ComparisonRadar` chart. All use light-theme colors.

### Dark Treatment for Comparison Table

```tsx
{/* Winner cell on dark */}
<td className={cn(
  "py-2.5 px-4 text-sm tabular-nums text-right",
  isWinner
    ? "text-emerald-400 bg-emerald-500/[0.06]"
    : "text-white/50"
)}>
  {formattedValue}
</td>
```

Winner highlighting on dark should use emerald at very low opacity (6%) rather than a
solid green background. The text color shift from `white/50` to `emerald-400` does most
of the work; the background tint is confirmation, not the primary signal.

### Radar Chart on Dark

Replace `PolarGrid stroke="#EAECF0"` with `stroke="rgba(255,255,255,0.06)"`. The radar
polygon fills should use the violet accent for deal A and a complementary amber for deal B:

```tsx
const DEAL_COLORS_DARK = ['#8B7AFF', '#FBBF24', '#34D399', '#F87171', '#38BDF8']
```

Fill opacity at 0.10 (down from current 0.15) -- on dark, even small fills become
visually heavy. The axis labels at `fill: 'rgba(255,255,255,0.45)'`.

---

## 8. PDF Export Button: Premium Placement and Styling

### Current State

The "Download Report" button sits in a horizontal button row at the bottom of results,
using `variant="outline"` with `border-gray-200 text-gray-600`. It competes visually
with 6+ other actions (Share, Save, Pipeline, Delete, Chat, Offer Letter).

### Premium Placement

Move the PDF export into a dedicated "Export" section header or a floating action bar.
The premium pattern (Figma, Notion) is a secondary toolbar pinned below the KPI grid:

```tsx
<div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#111110] px-5 py-3">
  <div className="flex items-center gap-2 text-white/40">
    <FileDown size={14} />
    <span className="text-xs font-medium uppercase tracking-wider">Export</span>
  </div>
  <Button
    onClick={handleDownloadReport}
    className={cn(
      "gap-2 rounded-lg bg-white/[0.06] px-4 py-2 text-sm text-cream",
      "border border-white/[0.08] hover:bg-white/[0.10] hover:border-white/[0.14]",
      "transition-all duration-200"
    )}
  >
    <FileDown size={14} />
    Download PDF Report
  </Button>
</div>
```

The ghost-glass button style communicates "available but secondary" -- the user can find
it instantly without it pulling attention from the analysis content.

---

## 9. The "Analyze" Button: Making the Primary Action Feel Significant

### Current State

The submit button is `bg-lime-700 hover:bg-lime-800 text-white` with standard padding.
During pending state: `animate-pulse rounded-xl bg-gray-100/50` overlay.

### Luxury Dark Treatment

The analyze button should be the single most visually prominent element on the form page.
On dark, this means a solid violet fill with a subtle glow on hover:

```tsx
<Button
  type="submit"
  disabled={isPending}
  className={cn(
    "w-full h-12 rounded-xl text-sm font-semibold tracking-wide",
    "bg-violet-600 text-white",
    "hover:bg-violet-500 hover:shadow-[0_0_20px_rgba(139,122,255,0.25)]",
    "active:bg-violet-700 active:shadow-none",
    "disabled:opacity-50 disabled:shadow-none",
    "transition-all duration-300"
  )}
>
  {isPending ? (
    <span className="flex items-center gap-2">
      <Loader2 size={16} className="animate-spin" />
      Analyzing...
    </span>
  ) : (
    "Run Analysis"
  )}
</Button>
```

The hover glow at `rgba(139,122,255,0.25)` creates a bloom effect that signals power and
intentionality. The `active` state kills the glow for tactile feedback. Width at `w-full`
makes the button a clear visual anchor at the bottom of the form.

### Micro-interaction Enhancement

Add a Framer Motion `whileTap={{ scale: 0.98 }}` for a subtle press-down effect. Combined
with the glow, this creates a satisfying click that feels deliberate -- the opposite of a
generic form submit.

---

## 10. Loading State During Analysis: Premium vs Generic

### Current State

A full-overlay `animate-pulse bg-gray-100/50` covers the form during submission. The
results page shows `SkeletonCard` placeholders while loading.

### Premium Loading Patterns

**Option A: Skeleton with shimmer (recommended)**

Dark skeleton cards with a traveling highlight gradient. This is the Stripe/Linear pattern:

```tsx
<div className="rounded-xl bg-[#111110] border border-white/[0.06] p-5 space-y-3 overflow-hidden relative">
  <div className="h-3 w-20 rounded bg-white/[0.06]" />
  <div className="h-8 w-32 rounded bg-white/[0.06]" />
  {/* Shimmer overlay */}
  <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite]
    bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" />
</div>
```

Keyframe definition:
```css
@keyframes shimmer {
  100% { transform: translateX(100%); }
}
```

The shimmer at 3% white opacity is imperceptible as a distinct element but creates
subconscious movement that signals "working" without visual noise.

**Option B: Staggered count-up reveal**

Once data arrives, KPI cards animate in with a staggered delay (already implemented via
`staggerContainer(60)`). Enhance by having the numbers count up from 0 with `useCountUp`
(already in place) combined with an opacity fade from 0 to 1.

**Option C: Progress bar (for longer analyses)**

If analysis takes > 2 seconds, show a thin violet progress bar at the top of the page:

```tsx
<motion.div
  className="fixed top-0 left-0 h-0.5 bg-gradient-to-r from-violet-600 to-violet-400 z-50"
  initial={{ width: "0%" }}
  animate={{ width: "90%" }}
  transition={{ duration: 3, ease: "easeOut" }}
/>
```

This communicates progress without taking over the viewport. The gradient adds polish
over a solid bar.

### What to Avoid

- Centered spinners on dark backgrounds -- they look like loading errors
- Text-only "Analyzing..." without visual treatment -- feels broken
- Progress percentages when you cannot measure actual progress -- dishonest UX
- Full-page overlays that hide the form content -- disorienting

---

## RECOMMENDATIONS FOR PARCEL

1. **Adopt the `#161514` / `#111110` two-tier surface system for form cards and result containers.** These sit naturally above the `#0C0B0A` page background without looking washed out. Use `border-white/[0.06]` for all container borders and `border-white/[0.08]` for interactive element borders (inputs, buttons). This creates a clear visual hierarchy between structure and interaction.

2. **Implement the violet focus ring system across all form inputs.** `focus-visible:border-violet-500/60 focus-visible:ring-2 focus-visible:ring-violet-500/20` with no ring-offset. This single change ties every input focus state to the `#8B7AFF` accent and creates an immediately recognizable "this app has a design system" impression.

3. **Add SVG glow filter to the RiskGauge arc.** The `<feGaussianBlur stdDeviation="4">` merged with source graphic is the highest-impact visual upgrade in the results page. Switch track color to `rgba(255,255,255,0.06)`, center text to cream `#F0EDE8`, and use emerald-400/amber-400/red-400 for the score tiers. Consider gradient strokes for extra dimensionality.

4. **Remap StrategyBadge to 12%-opacity dark variants.** The current pastel backgrounds (`#FEF3C7`, `#D1FAE5`) will break on dark. Use `rgba(color, 0.12)` fills with luminous text colors (amber-300, violet-400, sky-300, emerald-300, rose-300). This maintains strategy differentiation without light-theme artifacts.

5. **Transform the "Run Analysis" button into a violet CTA with hover glow.** Full-width, `h-12`, `bg-violet-600` with `hover:shadow-[0_0_20px_rgba(139,122,255,0.25)]`. Add `whileTap={{ scale: 0.98 }}` from Framer Motion. This button should be the undeniable focal point of the form page.

6. **Switch cash flow chart colors from lime/sky to violet/cream.** Monthly cash flow area in `#8B7AFF` with 15% opacity gradient fill; cumulative line in `#F0EDE8` at 60% opacity with no fill. Grid lines at `rgba(255,255,255,0.05)`. Dark tooltip with `bg-[#1A1918] border-white/[0.08] backdrop-blur-xl`.

7. **Implement dark shimmer skeletons for the loading state.** Replace `animate-pulse bg-gray-100/50` with dark skeleton containers (`bg-[#111110]`) that have a traveling `via-white/[0.03]` gradient. Add the thin violet progress bar at the top for analyses exceeding 2 seconds.

8. **Reduce outputs table zebra striping to 2% white.** Use `bg-white/[0.02]` for odd rows with `border-b border-white/[0.04]` separators. Heavy alternating backgrounds that work in light mode create visual noise on dark. Let the border do the primary separation work.

9. **Update comparison page winner highlighting to emerald-400 text with 6% emerald fill.** Replace the current green background approach with subtle text color shift as the primary signal and a ghost-level background tint as confirmation. Radar chart grid to `rgba(255,255,255,0.06)`, polygon fill opacity to 0.10.

10. **Elevate the PDF export button with a dedicated export bar or glass-morphic treatment.** Move it out of the crowded action button row. Use `bg-white/[0.06] border-white/[0.08] hover:bg-white/[0.10]` ghost styling that communicates availability without competing with the primary "Save Deal" and "Add to Pipeline" actions.
