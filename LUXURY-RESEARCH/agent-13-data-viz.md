# Data Visualization on Dark Luxury Interfaces

Research for Parcel Platform dark theme migration.
Stack context: React 18, TypeScript, Tailwind CSS, Recharts 2.x.
Dark background `#0C0B0A`, cream text `#F0EDE8`, violet accent `#8B7AFF`.

---

## 1. Recharts Theming for Dark Backgrounds

### Axis Colors

On a near-black canvas (`#0C0B0A`), axis labels must be subdued but legible. Pure white fights for attention with the data itself. The sweet spot is a mid-opacity cream or warm gray:

```tsx
<XAxis
  dataKey="month"
  tick={{ fontSize: 11, fill: '#A39E93' }}   // warm gray, ~55% opacity feel
  tickLine={false}
  axisLine={{ stroke: '#2A2826', strokeWidth: 1 }}  // barely-there baseline
/>
<YAxis
  tick={{ fontSize: 11, fill: '#A39E93' }}
  tickLine={false}
  axisLine={false}                                    // remove entirely for cleaner look
  tickFormatter={formatDollar}
  width={60}
/>
```

Mercury and Linear both suppress the Y axis line entirely -- the grid does the work. X axis gets a single 1px line in a color ~2 steps above the background. Never use `#FFFFFF` for tick text on luxury dark -- it reads as clinical. Warm grays (`#A39E93`, `#8A857C`) align with the cream text system.

### Grid Lines

Grid lines on dark should be nearly invisible -- visual anchors, not features. Horizontal only (vertical lines add chart-junk on time-series):

```tsx
<CartesianGrid
  strokeDasharray="0"        // solid, not dashed -- dashes look cheap on dark
  stroke="#1E1D1B"            // 1-2 steps above #0C0B0A
  strokeOpacity={0.6}
  vertical={false}
/>
```

Mercury uses solid grid lines at roughly 8-10% opacity relative to the background. The key insight: dashed grid lines that work on white (#E5E7EB with "3 3") look jittery on dark. Solid lines at extreme low contrast are calmer.

### Tooltip Styling

Covered in depth in Section 7 below.

---

## 2. Chart Color Palette for Dark

### The Problem with Neon

Saturated neon colors (#00FF00, #FF00FF) on dark backgrounds create a "gaming dashboard" feel. Luxury dark interfaces use desaturated, slightly muted tones that still pop through luminance contrast.

### Recommended Palette for Parcel (Dark)

| Role             | Color     | Name            | Notes                                    |
|------------------|-----------|-----------------|------------------------------------------|
| Primary (violet) | `#8B7AFF` | Parcel Violet   | Brand accent, use for primary data line  |
| Success/positive | `#6DD4A0` | Sage Green      | Muted emerald, positive cash flow        |
| Warning          | `#E8B44A` | Warm Amber      | Softer than raw amber-500                |
| Danger/negative  | `#E57373` | Dusty Rose      | Softer than red-500, legible on dark     |
| Secondary data   | `#64B5F6` | Soft Blue       | Second data series, cumulative lines     |
| Tertiary data    | `#B39DDB` | Lavender        | Third series if needed                   |
| Muted            | `#6B6560` | Warm Stone      | Disabled states, inactive segments       |

These colors sit at 60-70% saturation rather than 100%. On `#0C0B0A`, they maintain a WCAG AA contrast ratio of 4.5:1+ while avoiding the eye strain of full-saturation hues.

### Multi-Series Color Assignment (Radar, Comparison)

```ts
const DARK_DEAL_COLORS = [
  '#8B7AFF',  // violet (Parcel brand)
  '#6DD4A0',  // sage green
  '#64B5F6',  // soft blue
  '#E8B44A',  // warm amber
  '#E57373',  // dusty rose
] as const
```

---

## 3. Gradient Fills on Area Charts

### Direction

Always top-to-bottom (`x1="0" y1="0" x2="0" y2="1"`). Gradient runs from the stroke color at the top to transparent at the baseline. This creates the "glowing from the line" effect Mercury uses.

### Opacity and Color Stops

On dark backgrounds, gradient fills can be more prominent than on light -- the fill acts as a soft glow rather than a wash-out:

```tsx
<defs>
  <linearGradient id="violetGlow" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%"   stopColor="#8B7AFF" stopOpacity={0.30} />
    <stop offset="50%"  stopColor="#8B7AFF" stopOpacity={0.08} />
    <stop offset="100%" stopColor="#8B7AFF" stopOpacity={0} />
  </linearGradient>
</defs>
<Area
  type="monotone"
  dataKey="value"
  stroke="#8B7AFF"
  strokeWidth={2}
  fill="url(#violetGlow)"
/>
```

Three-stop gradients (0%, 50%, 100%) create a smoother falloff than two-stop. The 50% midpoint at 0.08 prevents the harsh "band" that a linear two-stop produces on dark surfaces.

### Mercury's Blue Gradient

Mercury's signature dashboard chart uses a blue gradient area chart with:
- Stroke: ~`#5B8DEF` at 2px
- Top stop: 25-30% opacity
- Mid stop (40%): 10% opacity
- Bottom stop: 0% opacity
- Background: near-black with subtle noise texture
- The fill creates a "pool of light" effect anchored to the data line

For Parcel, replace blue with violet `#8B7AFF` to maintain brand consistency. The three-stop gradient approach is identical.

---

## 4. Bar Chart Styling on Dark

### Gradient Bars vs Solid

Gradient bars elevate the look substantially on dark interfaces. Bottom-to-top gradients (more opaque at top) work best:

```tsx
<defs>
  <linearGradient id="barGradient" x1="0" y1="1" x2="0" y2="0">
    <stop offset="0%"   stopColor="#8B7AFF" stopOpacity={0.3} />
    <stop offset="100%" stopColor="#8B7AFF" stopOpacity={0.9} />
  </linearGradient>
</defs>
<Bar dataKey="value" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
```

### Rounded Corners

Top corners only: `radius={[6, 6, 0, 0]}`. This matches modern SaaS dashboards (Linear, Vercel). The radius should be proportional to bar width -- roughly 25-35% of bar width as the radius value.

### Hover States

On hover, increase opacity to full and add a subtle glow. Recharts supports `onMouseEnter` per bar, but the simpler approach is the `activeBar` prop:

```tsx
<Bar
  dataKey="value"
  fill="url(#barGradient)"
  radius={[6, 6, 0, 0]}
  activeBar={{
    fill: '#8B7AFF',
    fillOpacity: 1,
    filter: 'drop-shadow(0 0 8px rgba(139, 122, 255, 0.4))',
  }}
/>
```

The `drop-shadow` filter creates a glow effect on hover that reads as premium on dark backgrounds. Keep the blur radius between 6-10px and opacity between 0.3-0.5.

---

## 5. Sparklines

Sparklines in KPI cards need to be minimal yet contribute to the visual story. Current Parcel implementation (KPICard.tsx) is close but needs dark adaptation.

### Stroke and Fill

```tsx
const strokeColor = isPositive ? '#6DD4A0' : '#E57373'  // sage green / dusty rose

<defs>
  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%"   stopColor={strokeColor} stopOpacity={0.20} />
    <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
  </linearGradient>
</defs>
<Area
  type="monotone"
  dataKey="value"
  stroke={strokeColor}
  strokeWidth={1.5}
  fill={`url(#${gradientId})`}
  dot={false}
/>
```

On dark, bump gradient top opacity from the current 0.08 to 0.15-0.20. The dark background absorbs more of the fill, so you need higher opacity to get the same visual weight.

### End-Point Dot

A small dot at the last data point draws the eye to "current value" -- a pattern Stripe uses in their dashboard sparklines:

```tsx
<Area
  type="monotone"
  dataKey="value"
  stroke={strokeColor}
  strokeWidth={1.5}
  fill={`url(#${gradientId})`}
  dot={false}
  activeDot={false}
/>
{/* Render end dot manually via ReferenceDot or custom shape */}
```

For the end dot, use a Recharts `<ReferenceDot>` or a custom dot renderer that only shows on the last point. Target: 4px radius, same color as stroke, with a 2px white (or `#F0EDE8`) ring for contrast.

### Thickness

1.5px stroke is correct for sparklines at 50-60px height. Going to 2px makes them look heavy; 1px makes them disappear on dark. The 1.5px line has the best crispness-to-visibility ratio on high-DPI dark screens.

---

## 6. Donut / Pie Charts

### Stroke Width and Gaps

On dark backgrounds, segment separation should use the background color as the gap, not a border:

```tsx
<Pie
  data={data}
  innerRadius="60%"
  outerRadius="85%"
  paddingAngle={3}              // 3-degree gap between segments
  stroke="#0C0B0A"              // match dark bg for invisible "cuts"
  strokeWidth={3}
  dataKey="value"
>
  {data.map((entry, i) => (
    <Cell key={i} fill={DARK_DEAL_COLORS[i % DARK_DEAL_COLORS.length]} />
  ))}
</Pie>
```

The `paddingAngle` + background-colored stroke creates clean separation without adding a visible border. This is the technique Linear uses for their pie segments.

### Label Placement

On dark, avoid external leader lines (they add visual noise). Use the center of the donut for the primary metric and a legend strip below for segment labels:

```tsx
{/* Center label via custom SVG text */}
<text x="50%" y="48%" textAnchor="middle" fill="#F0EDE8" fontSize={28} fontWeight={600}>
  $124K
</text>
<text x="50%" y="58%" textAnchor="middle" fill="#A39E93" fontSize={12}>
  Total Value
</text>
```

### Segment Hover

On hover, scale the segment outward by 4-6px using `outerRadius` increase and add a subtle glow:

```tsx
activeShape={{
  outerRadius: '90%',
  filter: 'drop-shadow(0 0 6px rgba(139, 122, 255, 0.3))',
}}
```

---

## 7. Tooltip Design on Dark

### Glass Surface

The tooltip is the most-viewed micro-surface in any chart. On dark luxury interfaces, a "frosted glass" tooltip reads as premium:

```tsx
function DarkTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null

  return (
    <div
      className="rounded-lg px-4 py-3 backdrop-blur-xl"
      style={{
        background: 'rgba(28, 27, 25, 0.85)',      // warm near-black, translucent
        border: '1px solid rgba(240, 237, 232, 0.08)', // cream border at 8%
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(240, 237, 232, 0.04)',
      }}
    >
      <p className="text-xs font-medium mb-2" style={{ color: '#A39E93' }}>
        {label}
      </p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 mb-1 last:mb-0">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs" style={{ color: '#A39E93' }}>
            {entry.dataKey === 'monthlyCashFlow' ? 'Monthly' : 'Cumulative'}:
          </span>
          <span
            className="text-sm font-medium tabular-nums"
            style={{ color: entry.value >= 0 ? '#F0EDE8' : '#E57373' }}
          >
            {formatCurrency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  )
}
```

### Border

A single 1px border at `rgba(240, 237, 232, 0.08)` -- barely visible, but it gives the tooltip shape definition against the glass blur. Double borders (inset + outer) at different opacities add extra depth but are optional.

### Arrow / Pointer

Recharts does not natively render tooltip arrows. For luxury interfaces, omit the arrow entirely -- floating tooltips without arrows are the standard in Mercury, Linear, and Vercel dashboards. The tooltip's proximity to the cursor is sufficient spatial context. If an arrow is desired, render it via CSS `::after` pseudo-element on the tooltip wrapper with a matching background color.

### Cursor Line

Replace the default cursor with a subtle vertical line:

```tsx
<Tooltip
  content={<DarkTooltip />}
  cursor={{ stroke: '#8B7AFF', strokeOpacity: 0.2, strokeWidth: 1 }}
/>
```

---

## 8. Animation

### Chart Entrance

Stagger area chart animations by series. The primary series animates first, secondary follows 200-400ms later:

```tsx
<Area
  dataKey="monthlyCashFlow"
  isAnimationActive={true}
  animationDuration={1000}
  animationEasing="ease-out"
  animationBegin={0}
/>
<Area
  dataKey="cumulativeCashFlow"
  isAnimationActive={true}
  animationDuration={1000}
  animationEasing="ease-out"
  animationBegin={300}
/>
```

Parcel already does this correctly in CashFlowProjection.tsx (1200ms with 300ms stagger). For dark theme, keep the same timing -- animation speed is theme-agnostic.

### Data Transition

When switching between datasets (different deals, time ranges), use Recharts' built-in `isAnimationActive` with `animationDuration={600}` for smooth morphing. Wrap the chart container in Framer Motion for mount/unmount:

```tsx
<motion.div
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4, ease: 'easeOut' }}
>
  <ResponsiveContainer>...</ResponsiveContainer>
</motion.div>
```

### Hover Highlight

On data point hover, dim all other series to 30% opacity and keep the active one at 100%. This "spotlight" pattern is Mercury's signature interaction:

```tsx
// Track active series in state, then:
<Area
  dataKey="monthlyCashFlow"
  strokeOpacity={activeSeries === 'cumulativeCashFlow' ? 0.3 : 1}
  fillOpacity={activeSeries === 'cumulativeCashFlow' ? 0.05 : undefined}
  style={{ transition: 'stroke-opacity 0.2s, fill-opacity 0.2s' }}
/>
```

---

## 9. Performance: Recharts on Dark with Many Data Points

### Known Constraints

Recharts renders SVG, which is DOM-bound. Beyond ~500 data points per chart, performance degrades visibly -- SVG path recalculation and React reconciliation both become bottlenecks. Dark theme does not inherently change performance, but gradient fills and blur filters add GPU composite layers.

### Mitigations

1. **Downsample before render.** For portfolio charts with 365+ daily data points, reduce to ~90 points (weekly averages) before passing to Recharts. Use `useMemo` to avoid recalculation.

2. **Limit gradient complexity.** Three-stop gradients are fine. Avoid `feGaussianBlur` SVG filters on chart elements -- use CSS `filter: drop-shadow()` on hover only (applied to the container, not individual paths).

3. **Disable animation on datasets > 200 points.** Set `isAnimationActive={data.length < 200}`.

4. **Use `<ResponsiveContainer>` debouncing.** Recharts' ResponsiveContainer re-renders on every pixel of resize. Wrap in a debounced resize observer if charts are in resizable panels.

5. **Prefer `type="monotone"` over `type="natural"`.** Natural splines compute heavier interpolation per point. Monotone is visually similar and faster.

6. **`backdrop-blur` on tooltips.** This is the most expensive dark-theme-specific operation. Limit blur to 12-16px (`backdrop-blur-xl`). Larger values cause frame drops on lower-end hardware. Consider falling back to a solid background on mobile.

---

## 10. Mercury Dashboard Charts Reference

Mercury's signature aesthetic is a blue gradient area chart on a near-black background with:

- **Background:** `#09090B` (slightly cooler than Parcel's `#0C0B0A`)
- **Stroke:** `#5B8DEF`, 2px, with a subtle glow (`drop-shadow(0 0 12px rgba(91, 141, 239, 0.3))` on the SVG path group)
- **Fill:** Three-stop gradient, 25% -> 8% -> 0% opacity, same blue
- **Grid:** Horizontal only, `#1A1A1E` solid, no dashes
- **Axes:** Y axis hidden entirely, X axis labels in `#6B6B76` at 11px
- **Tooltip:** Floating glass panel, `rgba(20, 20, 24, 0.9)`, 1px border `rgba(255, 255, 255, 0.06)`, backdrop-blur-xl
- **Data points:** No dots by default, a glowing dot appears on hover at the intersect
- **Legend:** Inline with the chart title, using colored dots + label, not a separate Recharts Legend component

The overall effect is that the chart "breathes" -- the gradient fill acts as ambient light. This is the target aesthetic for Parcel, substituting violet `#8B7AFF` for Mercury's blue.

---

## 11. Risk Gauge: Luxury Dark Treatment

The current RiskGauge (SVG circle with animated arc) needs these adaptations for dark:

### Background Track

Replace `#EAECF0` (light gray) with a dark track that's barely visible:

```tsx
<circle
  cx={90} cy={90} r={RADIUS}
  fill="none"
  stroke="#1E1D1B"              // 2 steps above #0C0B0A
  strokeWidth={STROKE_WIDTH}
/>
```

### Gradient Stroke

Replace flat color arcs with gradient strokes for a premium feel. SVG gradient on a stroke requires a `<linearGradient>` mapped to the arc path:

```tsx
<defs>
  <linearGradient id="riskGradientLow" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%"   stopColor="#6DD4A0" />
    <stop offset="100%" stopColor="#3B9B6E" />
  </linearGradient>
  <linearGradient id="riskGradientMid" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%"   stopColor="#E8B44A" />
    <stop offset="100%" stopColor="#C4922A" />
  </linearGradient>
  <linearGradient id="riskGradientHigh" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%"   stopColor="#E57373" />
    <stop offset="100%" stopColor="#C62828" />
  </linearGradient>
</defs>
```

Select the gradient ID based on score range, then apply:

```tsx
<circle
  cx={90} cy={90} r={RADIUS}
  fill="none"
  stroke={`url(#${gradientId})`}
  strokeWidth={STROKE_WIDTH}
  strokeLinecap="round"
  strokeDasharray={CIRCUMFERENCE}
  strokeDashoffset={offset}
  style={{
    transition: 'stroke-dashoffset 1.2s ease-out',
    transform: 'rotate(-90deg)',
    transformOrigin: '50% 50%',
    filter: `drop-shadow(0 0 8px ${glowColor})`,   // soft glow matching arc color
  }}
/>
```

### Center Label

```tsx
<text
  x={90} y={85}
  textAnchor="middle" dominantBaseline="central"
  style={{
    fontSize: '36px', fontWeight: 600,
    fill: '#F0EDE8',                              // cream, not white
    fontFamily: 'Inter, sans-serif',
    fontFeatureSettings: '"tnum"',
  }}
>
  {Math.round(animated)}
</text>
<text
  x={90} y={108}
  textAnchor="middle" dominantBaseline="central"
  style={{
    fontSize: '11px', fontWeight: 500,
    fill: '#A39E93',                              // warm muted
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  }}
>
  RISK SCORE
</text>
```

### Risk Label Badge (Below Gauge)

Replace the current light-theme bg tokens (`bg-sky-50`, `bg-amber-50`) with dark-appropriate surfaces:

```tsx
// Dark risk badge backgrounds
function getDarkLabelBg(score: number): string {
  if (score <= 30) return 'bg-emerald-500/10'
  if (score <= 60) return 'bg-amber-500/10'
  if (score <= 80) return 'bg-red-500/10'
  return 'bg-red-500/15'
}

function getDarkLabelColor(score: number): string {
  if (score <= 30) return 'text-[#6DD4A0]'
  if (score <= 60) return 'text-[#E8B44A]'
  if (score <= 80) return 'text-[#E57373]'
  return 'text-[#EF5350]'
}
```

---

## 12. Cash Flow Projection: Positive/Negative Area Fills

The current CashFlowProjection renders both positive and negative monthly cash flow values (e.g., BRRRR rehab months are negative). On dark, the positive/negative distinction needs special treatment.

### Split-Color Gradient

Use two gradient definitions -- one for positive (sage green) and one for negative (dusty rose). Recharts doesn't natively split an Area by sign, but you can use a `<defs>` pattern with `clipPath` or render two overlapping Areas:

```tsx
<defs>
  <linearGradient id="posGradient" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%"   stopColor="#6DD4A0" stopOpacity={0.25} />
    <stop offset="100%" stopColor="#6DD4A0" stopOpacity={0} />
  </linearGradient>
  <linearGradient id="negGradient" x1="0" y1="1" x2="0" y2="0">
    <stop offset="0%"   stopColor="#E57373" stopOpacity={0.25} />
    <stop offset="100%" stopColor="#E57373" stopOpacity={0} />
  </linearGradient>
</defs>
```

### Practical Approach: Reference Line at Zero

Add a zero reference line and let the single gradient handle the visual. The negative values naturally dip below, and the gradient fades toward zero:

```tsx
<ReferenceLine
  y={0}
  stroke="#A39E93"
  strokeOpacity={0.2}
  strokeDasharray="4 4"
/>
<Area
  type="monotone"
  dataKey="monthlyCashFlow"
  stroke="#6DD4A0"
  strokeWidth={2}
  fill="url(#posGradient)"
  baseValue={0}       // critical: anchors the fill to zero, not chart bottom
/>
```

The `baseValue={0}` prop in Recharts anchors the area fill at y=0 rather than the bottom of the chart. Negative values fill downward with the gradient inverting naturally.

### Cumulative Line on Dark

The cumulative cash flow line should remain unfilled (stroke only) to avoid visual overload:

```tsx
<Area
  type="monotone"
  dataKey="cumulativeCashFlow"
  stroke="#8B7AFF"            // violet brand color
  strokeWidth={2}
  fill="none"
  strokeDasharray="0"
/>
```

Using the violet accent for the cumulative line creates a clear visual hierarchy: green fill for monthly, violet line for cumulative.

---

## RECOMMENDATIONS FOR PARCEL

1. **Adopt the three-stop gradient pattern for all area charts.** Replace the current two-stop gradients in CashFlowProjection and KPICard sparklines with three stops (0% at 0.25 opacity, 50% at 0.08, 100% at 0). This eliminates the harsh gradient band on dark and produces the Mercury "pool of light" effect. Highest visual impact for lowest effort.

2. **Build a shared `<DarkTooltip>` component.** Both CashFlowProjection and ComparisonRadar currently have their own tooltip implementations with light-theme colors. Create one reusable component with the glass surface treatment (`rgba(28, 27, 25, 0.85)`, `backdrop-blur-xl`, 1px cream border at 8% opacity). Use it across all charts.

3. **Replace the chart color palette with the dark-optimized set.** Swap `#65A30D`/`#0EA5E9` (lime/sky -- optimized for white backgrounds) to `#6DD4A0`/`#8B7AFF` (sage/violet -- optimized for dark). Current colors will look muddy and fight for contrast on `#0C0B0A`.

4. **Upgrade RiskGauge with gradient strokes and glow.** Replace flat-color arcs with `<linearGradient>` stroke fills per risk tier and add a `drop-shadow` filter for the soft glow effect. Change the track circle from `#EAECF0` to `#1E1D1B`. Update the center text fill from `#101828` to `#F0EDE8`.

5. **Switch grid lines from dashed to solid at low opacity.** Change `CartesianGrid` from `strokeDasharray="3 3"` with `#E5E7EB` to `strokeDasharray="0"` with `#1E1D1B` at 0.6 opacity, horizontal only. Dashed grids on dark backgrounds create visual noise.

6. **Increase sparkline gradient opacity for dark.** The current `fillOpacity={0.08}` in KPICard will be invisible on dark. Raise to 0.15-0.20 for the top stop. Also add the end-point dot pattern (4px dot with 2px cream ring on the last data point) for a Stripe-like finish.

7. **Add the hover spotlight pattern for multi-series charts.** On hover of one series, dim the others to 30% opacity with a 200ms CSS transition. This is simple to implement via `onMouseEnter`/`onMouseLeave` on each `<Area>` or `<Radar>` element with state-driven `strokeOpacity`.

8. **Use `baseValue={0}` on cash flow Area charts.** This ensures negative months (BRRRR rehab, flip holding costs) fill downward from the zero line rather than from the chart bottom. Add a `<ReferenceLine y={0}>` in a muted warm gray to anchor the visual.

9. **Implement data downsampling for portfolio charts.** If portfolio performance charts will display daily data over 12+ months, add a `useMemo` downsampler that averages to weekly points. Keep the threshold at 200 points maximum per chart, with animation disabled above that count.

10. **Add conditional `backdrop-blur` fallback.** The glass tooltip uses `backdrop-blur-xl` which is GPU-intensive on mobile. Detect mobile via viewport width and fall back to a solid `rgba(28, 27, 25, 0.95)` background without blur. This prevents frame drops during tooltip tracking on lower-powered devices.
