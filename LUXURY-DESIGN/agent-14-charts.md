# Agent 14 — Data Visualization Theme

Design spec for all Recharts components, sparklines, SVG gauges, and chart
primitives on the Parcel luxury dark surface system.

Locked tokens referenced throughout:
- Page bg `#0C0B0A` | Card surface `#141312` | Elevated `#1E1D1B`
- Axis text `#A39E93` 11px | Grid `#2A2826` 1px
- Accent `#8B7AFF` | Cream text `#F0EDE8`
- Profit `#7CCBA5` | Loss `#D4766A`

---

## 1. Chart Color Palette

Six series colors designed for `#0C0B0A` / `#141312` backgrounds.
Each sits at 55-70% saturation to avoid neon. All pass WCAG AA (4.5:1+)
against `#0C0B0A`.

| Slot       | Hex       | Name        | Usage                                    |
|------------|-----------|-------------|------------------------------------------|
| 1 — violet | `#8B7AFF` | Parcel      | Primary series, brand accent, cumulative |
| 2 — sage   | `#7CCBA5` | Sage        | Positive cash flow, profit areas         |
| 3 — amber  | `#E8B44A` | Warm Amber  | Warning states, third series             |
| 4 — cream  | `#E8DFD1` | Parchment   | Secondary neutral series, labels         |
| 5 — terra  | `#D4766A` | Terracotta  | Negative cash flow, loss areas           |
| 6 — teal   | `#5CB8B2` | Sea Glass   | Fourth series, diversification metrics   |

```ts
export const CHART_COLORS = [
  '#8B7AFF', // violet
  '#7CCBA5', // sage
  '#E8B44A', // amber
  '#E8DFD1', // cream
  '#D4766A', // terracotta
  '#5CB8B2', // teal
] as const

export const SEMANTIC_COLORS = {
  profit: '#7CCBA5',
  loss: '#D4766A',
  accent: '#8B7AFF',
  warning: '#E8B44A',
  muted: '#6B6560',
} as const
```

---

## 2. Area Chart — Three-Stop Gradient Fill

Every area chart uses a three-stop vertical gradient. The mid-stop at 50%
eliminates the harsh band that two-stop gradients produce on dark surfaces.

### SVG Gradient Definition

```tsx
<defs>
  <linearGradient id="violetGlow" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%"   stopColor="#8B7AFF" stopOpacity={0.30} />
    <stop offset="50%"  stopColor="#8B7AFF" stopOpacity={0.05} />
    <stop offset="100%" stopColor="#8B7AFF" stopOpacity={0} />
  </linearGradient>
</defs>
```

### Area Component Props

```tsx
<Area
  type="monotone"
  dataKey="value"
  stroke="#8B7AFF"
  strokeWidth={2}
  fill="url(#violetGlow)"
  dot={false}
  activeDot={{
    r: 4,
    stroke: '#8B7AFF',
    strokeWidth: 2,
    fill: '#141312',
    filter: 'drop-shadow(0 0 6px rgba(139, 122, 255, 0.5))',
  }}
/>
```

Rules:
- Stroke is always 2px, matching the gradient's base color.
- Top stop: 0.30 opacity — produces the "pool of light" anchored to the line.
- Mid stop (50%): 0.05 — gentle falloff, not linear.
- Bottom stop: 0 — fully transparent at the baseline.
- `dot={false}` by default; `activeDot` renders only on hover with a glow.

---

## 3. Bar Chart

Rounded top corners, bottom-to-top gradient fill, hover brightening with glow.

### SVG Gradient

```tsx
<defs>
  <linearGradient id="barViolet" x1="0" y1="1" x2="0" y2="0">
    <stop offset="0%"   stopColor="#8B7AFF" stopOpacity={0.25} />
    <stop offset="100%" stopColor="#8B7AFF" stopOpacity={0.85} />
  </linearGradient>
</defs>
```

### Bar Component Props

```tsx
<Bar
  dataKey="value"
  fill="url(#barViolet)"
  radius={[4, 4, 0, 0]}
  maxBarSize={48}
  activeBar={{
    fill: '#8B7AFF',
    fillOpacity: 1,
    filter: 'drop-shadow(0 0 8px rgba(139, 122, 255, 0.4))',
  }}
/>
```

Rules:
- `radius={[4, 4, 0, 0]}` — top-left, top-right rounded; bottom flat.
- Gradient runs bottom-to-top: translucent at base, opaque at cap.
- Hover (`activeBar`): full opacity + violet glow via CSS drop-shadow.
- `maxBarSize={48}` prevents bars from becoming excessively wide.

---

## 4. Sparklines (KPI Cards)

Small 50-60px-tall area charts embedded inside KPICard. Stroke at 1.5px,
gradient fill, end-point dot with glow.

### Implementation

```tsx
const strokeColor = isPositive ? '#7CCBA5' : '#D4766A'

<defs>
  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%"   stopColor={strokeColor} stopOpacity={0.20} />
    <stop offset="60%"  stopColor={strokeColor} stopOpacity={0.04} />
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
  activeDot={false}
  isAnimationActive={true}
  animationDuration={1200}
  animationEasing="ease-out"
/>
```

### End-Point Dot

Render a custom dot only on the last data point. Use a Recharts custom
`dot` function or an absolutely positioned SVG circle:

```tsx
// Custom dot renderer — shows only on the final point
const EndDot = (props: any) => {
  const { cx, cy, index, payload } = props
  if (index !== payload.length - 1) return null
  return (
    <g>
      {/* Glow ring */}
      <circle cx={cx} cy={cy} r={6} fill={strokeColor} opacity={0.15} />
      {/* Solid dot */}
      <circle cx={cx} cy={cy} r={3} fill={strokeColor} />
      {/* Inner highlight */}
      <circle cx={cx} cy={cy} r={1.5} fill="#141312" />
    </g>
  )
}
```

Alternatively, use a `<ReferenceDot>` on the last data index:

```tsx
<ReferenceDot
  x={chartData.length - 1}
  y={chartData[chartData.length - 1].value}
  r={3}
  fill={strokeColor}
  stroke="#141312"
  strokeWidth={1.5}
  isFront
/>
```

Rules:
- 1.5px stroke — thinner than main charts to respect the small canvas.
- 0.20 top stop opacity — bumped from 0.08 (light theme) since dark absorbs more.
- Three-stop gradient with mid at 60% for extra smoothness at sparkline scale.
- End dot: 3px radius, same color as stroke, 1.5px card-surface ring for contrast.

---

## 5. Tooltip — Glass Surface

Shared across all charts. Frosted glass on `#1E1D1B` base.

```tsx
function ChartTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null

  return (
    <div
      className="rounded-lg px-4 py-3 backdrop-blur-xl"
      style={{
        background: 'rgba(30, 29, 27, 0.88)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        boxShadow:
          '0 8px 32px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.03)',
      }}
    >
      <p
        className="text-[11px] font-medium mb-2 tracking-wide uppercase"
        style={{ color: '#A39E93' }}
      >
        {label}
      </p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 mb-1 last:mb-0">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-[11px]" style={{ color: '#A39E93' }}>
            {entry.name}:
          </span>
          <span
            className="text-sm font-medium tabular-nums"
            style={{ color: entry.value >= 0 ? '#F0EDE8' : '#D4766A' }}
          >
            {formatCurrency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  )
}
```

### Cursor Line

```tsx
<Tooltip
  content={<ChartTooltip />}
  cursor={{ stroke: '#8B7AFF', strokeOpacity: 0.15, strokeWidth: 1 }}
/>
```

Rules:
- Background `rgba(30, 29, 27, 0.88)` — warm, not neutral.
- `backdrop-blur-xl` (20px) for the glass effect.
- Border: `rgba(255, 255, 255, 0.06)` — barely visible for shape definition.
- Shadow: two-layer (ambient + ring) for lift without harshness.
- Label text: 11px uppercase, `#A39E93`, 0.05em tracking.
- Values: `#F0EDE8` cream for positive, `#D4766A` terracotta for negative.
- Cursor: violet at 0.15 opacity, 1px — subtle hover guide.
- No arrow — floating tooltips match Mercury / Linear convention.
- Mobile fallback: solid `rgba(30, 29, 27, 0.95)` without blur to prevent frame drops.

---

## 6. Axis Styling — Exact Recharts Props

### XAxis

```tsx
<XAxis
  dataKey="month"
  tick={{ fontSize: 11, fill: '#A39E93', fontFamily: 'Inter, sans-serif' }}
  tickLine={false}
  axisLine={{ stroke: '#2A2826', strokeWidth: 1 }}
  tickFormatter={(v: string) => v.replace('Month ', 'M')}
  tickMargin={8}
/>
```

### YAxis

```tsx
<YAxis
  tick={{ fontSize: 11, fill: '#A39E93', fontFamily: 'Inter, sans-serif' }}
  tickLine={false}
  axisLine={false}
  tickFormatter={formatDollar}
  width={60}
  tickMargin={4}
/>
```

Rules:
- Tick text: `#A39E93` warm gray, 11px Inter. Never `#FFFFFF`.
- X axis line: `#2A2826` at 1px. Single hairline, two steps above `#0C0B0A`.
- Y axis line: hidden entirely. Grid lines do the work.
- `tickLine={false}` on both axes — tick marks add noise on dark.
- `tickMargin` adds breathing room between axis text and chart area.

---

## 7. Grid Lines — CartesianGrid

```tsx
<CartesianGrid
  stroke="#2A2826"
  strokeDasharray="0"
  strokeOpacity={0.6}
  vertical={false}
/>
```

Rules:
- **Solid lines, not dashed.** Dashes look jittery on dark backgrounds.
  `strokeDasharray="0"` or simply omit the prop.
- Color `#2A2826` at 0.6 opacity — roughly 8% visual weight against `#0C0B0A`.
- `vertical={false}` — horizontal lines only. Vertical grid adds chart-junk on
  time-series data. The X axis line provides the baseline reference.
- Stroke width defaults to 1px (Recharts default). Do not increase.

---

## 8. Radar Chart

For the ComparisonRadar multi-deal overlay.

### PolarGrid

```tsx
<PolarGrid
  stroke="rgba(255, 255, 255, 0.06)"
  strokeWidth={1}
/>
```

### PolarAngleAxis (dimension labels)

```tsx
<PolarAngleAxis
  dataKey="dimension"
  tick={{ fill: '#A39E93', fontSize: 12, fontFamily: 'Inter, sans-serif' }}
/>
```

### PolarRadiusAxis

```tsx
<PolarRadiusAxis
  angle={90}
  domain={[0, 100]}
  tick={{ fill: '#6B6560', fontSize: 10 }}
  tickCount={5}
  axisLine={false}
/>
```

### Radar Series (per deal)

```tsx
<Radar
  name={address}
  dataKey={address}
  stroke={CHART_COLORS[i % CHART_COLORS.length]}
  fill={CHART_COLORS[i % CHART_COLORS.length]}
  fillOpacity={0.12}
  strokeWidth={2}
  dot={{
    r: 3,
    fill: CHART_COLORS[i % CHART_COLORS.length],
    stroke: '#141312',
    strokeWidth: 1.5,
  }}
/>
```

### Radar Deal Colors

```ts
const DARK_DEAL_COLORS = [
  '#8B7AFF',  // violet
  '#7CCBA5',  // sage
  '#E8B44A',  // amber
  '#5CB8B2',  // teal
  '#D4766A',  // terracotta
] as const
```

Rules:
- Grid at `white/6` — ghost web, visible only on close inspection.
- Stroke at series color, 2px. Fill at 0.12 opacity (not 0.15 — overlapping
  fills at 0.15 become muddy with 3+ deals).
- Each radar vertex gets a small dot: 3px, card-surface ring.
- Legend: inline with title using colored dots, not the default Recharts Legend.

---

## 9. Risk Gauge SVG

Circular arc gauge with gradient stroke, ghost track, center label, and glow filter.

### SVG Definitions

```tsx
const RADIUS = 70
const STROKE_WIDTH = 12
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

<svg width={180} height={180} viewBox="0 0 180 180">
  <defs>
    {/* Gradient strokes per risk tier */}
    <linearGradient id="riskLow" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stopColor="#7CCBA5" />
      <stop offset="100%" stopColor="#4A9B76" />
    </linearGradient>
    <linearGradient id="riskMid" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stopColor="#E8B44A" />
      <stop offset="100%" stopColor="#C4922A" />
    </linearGradient>
    <linearGradient id="riskHigh" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stopColor="#D4766A" />
      <stop offset="100%" stopColor="#B84C3F" />
    </linearGradient>
    <linearGradient id="riskCritical" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stopColor="#EF5350" />
      <stop offset="100%" stopColor="#C62828" />
    </linearGradient>

    {/* Glow filter */}
    <filter id="arcGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  {/* Ghost track — white/6 */}
  <circle
    cx={90} cy={90} r={RADIUS}
    fill="none"
    stroke="rgba(255, 255, 255, 0.06)"
    strokeWidth={STROKE_WIDTH}
  />

  {/* Animated foreground arc */}
  <circle
    cx={90} cy={90} r={RADIUS}
    fill="none"
    stroke={`url(#${gradientId})`}
    strokeWidth={STROKE_WIDTH}
    strokeLinecap="round"
    strokeDasharray={CIRCUMFERENCE}
    strokeDashoffset={offset}
    filter="url(#arcGlow)"
    style={{
      transition: 'stroke-dashoffset 1.2s ease-out',
      transform: 'rotate(-90deg)',
      transformOrigin: '50% 50%',
    }}
  />

  {/* Center score */}
  <text
    x={90} y={82}
    textAnchor="middle"
    dominantBaseline="central"
    style={{
      fontSize: '36px',
      fontWeight: 600,
      fill: '#F0EDE8',
      fontFamily: 'Inter, sans-serif',
      fontFeatureSettings: '"tnum"',
    }}
  >
    {Math.round(animated)}
  </text>

  {/* Sub-label */}
  <text
    x={90} y={108}
    textAnchor="middle"
    dominantBaseline="central"
    style={{
      fontSize: '11px',
      fontWeight: 500,
      fill: '#A39E93',
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
    }}
  >
    RISK SCORE
  </text>
</svg>
```

### Gradient Selection Logic

```ts
function getGradientId(score: number): string {
  if (score <= 30) return 'riskLow'
  if (score <= 60) return 'riskMid'
  if (score <= 80) return 'riskHigh'
  return 'riskCritical'
}

function getGlowColor(score: number): string {
  if (score <= 30) return 'rgba(124, 203, 165, 0.35)'
  if (score <= 60) return 'rgba(232, 180, 74, 0.35)'
  if (score <= 80) return 'rgba(212, 118, 106, 0.35)'
  return 'rgba(239, 83, 80, 0.40)'
}
```

### Risk Label Badge (below gauge)

```ts
function getDarkLabelStyles(score: number) {
  if (score <= 30) return { bg: 'bg-emerald-500/10', text: 'text-[#7CCBA5]' }
  if (score <= 60) return { bg: 'bg-amber-500/10',   text: 'text-[#E8B44A]' }
  if (score <= 80) return { bg: 'bg-red-500/10',     text: 'text-[#D4766A]' }
  return                   { bg: 'bg-red-500/15',     text: 'text-[#EF5350]' }
}
```

Rules:
- Ghost track at `white/6` — visible but recessive.
- Gradient strokes per tier: each has a lighter and darker stop for dimension.
- `feGaussianBlur` at stdDeviation=3 merged with the source creates a soft glow
  without obscuring the arc edge. The `feMerge` composites glow behind the crisp arc.
- Center text: cream `#F0EDE8`, not white. Sub-label: `#A39E93` uppercase.
- Badge: 10% tinted backgrounds matching the tier color system.

---

## 10. Cash Flow Projection Chart

Positive area: sage gradient. Negative area: terracotta gradient.
Cumulative line: violet stroke, no fill.

### SVG Gradients

```tsx
<defs>
  {/* Positive (sage) — top-to-bottom fade */}
  <linearGradient id="cashPosGradient" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%"   stopColor="#7CCBA5" stopOpacity={0.25} />
    <stop offset="50%"  stopColor="#7CCBA5" stopOpacity={0.06} />
    <stop offset="100%" stopColor="#7CCBA5" stopOpacity={0} />
  </linearGradient>

  {/* Negative (terracotta) — bottom-to-top fade */}
  <linearGradient id="cashNegGradient" x1="0" y1="1" x2="0" y2="0">
    <stop offset="0%"   stopColor="#D4766A" stopOpacity={0.25} />
    <stop offset="50%"  stopColor="#D4766A" stopOpacity={0.06} />
    <stop offset="100%" stopColor="#D4766A" stopOpacity={0} />
  </linearGradient>
</defs>
```

### Chart Structure

```tsx
<AreaChart data={data} margin={{ top: 4, right: 12, left: 12, bottom: 0 }}>
  {/* Gradients defined above */}

  <CartesianGrid stroke="#2A2826" strokeDasharray="0" strokeOpacity={0.6} vertical={false} />

  <XAxis
    dataKey="month"
    tick={{ fontSize: 11, fill: '#A39E93' }}
    tickLine={false}
    axisLine={{ stroke: '#2A2826', strokeWidth: 1 }}
    tickFormatter={(v: string) => v.replace('Month ', 'M')}
  />
  <YAxis
    tick={{ fontSize: 11, fill: '#A39E93' }}
    tickLine={false}
    axisLine={false}
    tickFormatter={formatDollar}
    width={60}
  />

  {/* Zero reference line */}
  <ReferenceLine
    y={0}
    stroke="#A39E93"
    strokeOpacity={0.15}
    strokeDasharray="4 4"
  />

  <Tooltip
    content={<ChartTooltip />}
    cursor={{ stroke: '#8B7AFF', strokeOpacity: 0.15, strokeWidth: 1 }}
  />

  {/* Monthly cash flow — sage fill, anchored at zero */}
  <Area
    type="monotone"
    dataKey="monthlyCashFlow"
    stroke="#7CCBA5"
    strokeWidth={2}
    fill="url(#cashPosGradient)"
    baseValue={0}
    dot={false}
    activeDot={{ r: 4, fill: '#7CCBA5', stroke: '#141312', strokeWidth: 2 }}
    isAnimationActive={true}
    animationDuration={1000}
    animationEasing="ease-out"
    animationBegin={0}
  />

  {/* Cumulative cash flow — violet stroke only */}
  <Area
    type="monotone"
    dataKey="cumulativeCashFlow"
    stroke="#8B7AFF"
    strokeWidth={2}
    fill="none"
    dot={false}
    activeDot={{ r: 4, fill: '#8B7AFF', stroke: '#141312', strokeWidth: 2 }}
    isAnimationActive={true}
    animationDuration={1000}
    animationEasing="ease-out"
    animationBegin={300}
  />
</AreaChart>
```

### Inline Legend (replaces Recharts Legend)

```tsx
<div className="flex items-center gap-4">
  <div className="flex items-center gap-1.5">
    <span className="inline-block h-2 w-2 rounded-full bg-[#7CCBA5]" />
    <span className="text-[11px] text-[#A39E93]">Monthly</span>
  </div>
  <div className="flex items-center gap-1.5">
    <span className="inline-block h-2 w-2 rounded-full bg-[#8B7AFF]" />
    <span className="text-[11px] text-[#A39E93]">Cumulative</span>
  </div>
</div>
```

Rules:
- `baseValue={0}` is critical — anchors the fill at the zero line so negative
  months fill downward naturally.
- Monthly area uses sage stroke + gradient. Negative values dip below zero
  and the gradient inverts. For strategies with deep negatives (BRRRR rehab,
  flip holding costs), the downward fill provides clear visual weight.
- Cumulative line uses violet stroke with `fill="none"` — clean separation
  between the two series without visual overload.
- Zero reference line: dashed `#A39E93` at 0.15 opacity. Subtle anchor.
- Legend is inline with the chart title, not a Recharts `<Legend>` component.

---

## 11. Animation

### Chart Entrance

All charts animate on mount. Primary series first, secondary 300ms later.

```tsx
// Primary series
animationDuration={1000}
animationEasing="ease-out"
animationBegin={0}

// Secondary series
animationDuration={1000}
animationEasing="ease-out"
animationBegin={300}
```

### Container Mount (Framer Motion)

```tsx
<motion.div
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5, ease: 'easeOut' }}
>
  <ResponsiveContainer>...</ResponsiveContainer>
</motion.div>
```

### Data Value Transitions

When datasets change (switching deals, time ranges), Recharts morphs paths
via its built-in animation. Keep it at 300ms for responsive feel:

```tsx
isAnimationActive={true}
animationDuration={300}
```

### Performance Guard

Disable animation on large datasets to prevent jank:

```tsx
isAnimationActive={data.length < 200}
```

### Hover Spotlight (Multi-Series)

On hover of one series, dim all others. 200ms CSS transition:

```tsx
<Area
  dataKey="monthlyCashFlow"
  strokeOpacity={activeSeries === 'cumulativeCashFlow' ? 0.3 : 1}
  fillOpacity={activeSeries === 'cumulativeCashFlow' ? 0.03 : undefined}
  style={{ transition: 'stroke-opacity 200ms, fill-opacity 200ms' }}
/>
```

Rules:
- Entrance: 500ms ease-out for the container fade+slide, 1000ms ease-out
  for Recharts path drawing with 300ms stagger between series.
- Value transitions: 300ms when switching datasets.
- Spotlight: dim inactive series to 0.3 stroke opacity, 200ms transition.
- Kill animations above 200 data points.

---

## 12. Recharts Theme Object

Single exportable configuration for all chart primitives.

```ts
// src/lib/chart-theme.ts

export const chartTheme = {
  colors: {
    series: ['#8B7AFF', '#7CCBA5', '#E8B44A', '#E8DFD1', '#D4766A', '#5CB8B2'],
    profit: '#7CCBA5',
    loss: '#D4766A',
    accent: '#8B7AFF',
    warning: '#E8B44A',
    muted: '#6B6560',
  },

  axis: {
    tick: { fontSize: 11, fill: '#A39E93', fontFamily: 'Inter, sans-serif' },
    tickLine: false,
    xAxisLine: { stroke: '#2A2826', strokeWidth: 1 },
    yAxisLine: false,
    yWidth: 60,
    tickMargin: 8,
  },

  grid: {
    stroke: '#2A2826',
    strokeDasharray: '0',
    strokeOpacity: 0.6,
    vertical: false,
  },

  tooltip: {
    background: 'rgba(30, 29, 27, 0.88)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    shadow: '0 8px 32px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.03)',
    labelColor: '#A39E93',
    valueColor: '#F0EDE8',
    negativeColor: '#D4766A',
    cursor: { stroke: '#8B7AFF', strokeOpacity: 0.15, strokeWidth: 1 },
  },

  area: {
    strokeWidth: 2,
    dot: false,
    activeDot: { r: 4, strokeWidth: 2, fill: '#141312' },
    gradient: {
      stops: [
        { offset: '0%',   opacity: 0.30 },
        { offset: '50%',  opacity: 0.05 },
        { offset: '100%', opacity: 0 },
      ],
    },
  },

  bar: {
    radius: [4, 4, 0, 0] as [number, number, number, number],
    maxBarSize: 48,
    gradient: {
      stops: [
        { offset: '0%',   opacity: 0.25 },  // bottom
        { offset: '100%', opacity: 0.85 },  // top
      ],
    },
    activeBar: {
      fillOpacity: 1,
      glowBlur: 8,
      glowOpacity: 0.4,
    },
  },

  sparkline: {
    strokeWidth: 1.5,
    height: 60,
    gradient: {
      stops: [
        { offset: '0%',   opacity: 0.20 },
        { offset: '60%',  opacity: 0.04 },
        { offset: '100%', opacity: 0 },
      ],
    },
    endDot: { r: 3, ringWidth: 1.5, ringColor: '#141312' },
  },

  radar: {
    grid: { stroke: 'rgba(255, 255, 255, 0.06)', strokeWidth: 1 },
    angleAxis: { fill: '#A39E93', fontSize: 12 },
    radiusAxis: { fill: '#6B6560', fontSize: 10 },
    fillOpacity: 0.12,
    strokeWidth: 2,
    dot: { r: 3, strokeWidth: 1.5, stroke: '#141312' },
  },

  gauge: {
    trackStroke: 'rgba(255, 255, 255, 0.06)',
    strokeWidth: 12,
    radius: 70,
    centerText: { fill: '#F0EDE8', fontSize: 36, fontWeight: 600 },
    subLabel: { fill: '#A39E93', fontSize: 11, letterSpacing: '0.05em' },
    tiers: {
      low:      { gradient: ['#7CCBA5', '#4A9B76'], glow: 'rgba(124, 203, 165, 0.35)' },
      moderate: { gradient: ['#E8B44A', '#C4922A'], glow: 'rgba(232, 180, 74, 0.35)' },
      high:     { gradient: ['#D4766A', '#B84C3F'], glow: 'rgba(212, 118, 106, 0.35)' },
      critical: { gradient: ['#EF5350', '#C62828'], glow: 'rgba(239, 83, 80, 0.40)' },
    },
  },

  animation: {
    entrance: { duration: 1000, easing: 'ease-out' as const },
    stagger: 300,
    containerMount: { duration: 0.5, ease: 'easeOut' as const },
    dataTransition: 300,
    maxAnimatedPoints: 200,
  },
} as const

export type ChartTheme = typeof chartTheme
```

---

## CRITICAL DECISIONS

1. **Solid grid lines, not dashed.** `strokeDasharray="0"` replaces the current
   `"3 3"`. Dashes that look fine on white become jittery visual noise on dark
   backgrounds. Solid lines at extreme low contrast (0.6 opacity on `#2A2826`)
   produce calmer, more premium charts.

2. **Three-stop gradients everywhere.** Two-stop gradients create a visible
   "banding" artifact on dark surfaces. The mid-stop at 50% (area) or 60%
   (sparkline) smooths the falloff. This is a non-negotiable quality detail.

3. **`baseValue={0}` on cash flow charts.** Without this, Recharts anchors
   area fills at the chart bottom, which makes negative months fill the entire
   chart height. With `baseValue={0}`, negative values fill downward from zero
   and positive values fill upward — correct financial semantics.

4. **No Y axis line.** The Y axis line is redundant when horizontal grid lines
   are present. Removing it (matching Mercury/Linear) reduces visual weight
   and lets the data breathe.

5. **Ghost track on RiskGauge at `white/6`.** The current light-theme track
   (`#EAECF0`) would be a bright ring on dark. At 6% white opacity, the track
   is just barely perceptible — enough to show the gauge's full range without
   competing with the colored arc.

6. **Gradient stroke + SVG glow on RiskGauge.** Flat color arcs look clinical.
   The `linearGradient` stroke adds dimension, and the `feGaussianBlur` filter
   (stdDeviation=3, merged with source) creates a subtle halo that reads as
   premium without the performance cost of large blur radii.

7. **Violet for cumulative, sage for monthly.** The current lime/sky pairing
   is optimized for white backgrounds and will read as muddy on dark. Violet
   (brand accent) on the cumulative line creates hierarchy; sage on the monthly
   area connects it to the profit semantic color.

8. **Radar fill at 0.12, not 0.15.** With 3+ overlapping deals, each at 0.15,
   the intersections reach ~0.45 opacity and become opaque blobs. At 0.12, even
   five overlapping fills stay readable.

9. **Sparkline end-dot with card-surface ring.** The `#141312` ring around the
   end dot ensures it visually separates from the stroke line on any trajectory.
   Without the ring, the dot merges into rising or flat lines.

10. **Mobile tooltip fallback.** `backdrop-blur-xl` triggers GPU compositing
    layers that cause frame drops during tooltip tracking on mobile. Below 768px
    viewport width, fall back to solid `rgba(30, 29, 27, 0.95)` without blur.
