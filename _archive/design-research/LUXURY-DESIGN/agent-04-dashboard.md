# Dashboard Design Spec — Luxury Dark Theme

> Parcel Platform | Mercury-inspired sparse layout
> Tokens: bg `#0C0B0A` | card `#141312` | border `white/[0.04]` | text `#F0EDE8` / `#A09D98` | accent `#8B7AFF`

---

## 1. Layout — Mercury-Inspired Sparse Composition

### Philosophy

Lead with a single hero metric, not a KPI grid. The number IS the container — a 40px cream figure floating in near-black space carries more gravitas than four competing cards. Everything else is subordinate to the hero metric.

### Above-the-fold density budget (1440x900 desktop)

```
┌──────────────────────────────────────────────────────────────────────┐
│ Sidebar (240px) │                                                    │
│                 │  Greeting + inline snapshot           [Quick Acts]  │  ~64px
│                 │                                                    │
│                 │        $847,200                                     │  ~96px
│                 │        Total Portfolio Equity                       │
│                 │                                                    │
│                 │  ┌──── Area chart (180px) ────────────────────┐   │  ~220px
│                 │  │  [1M] [3M] [6M] [1Y]    violet gradient   │   │
│                 │  └───────────────────────────────────────────-┘   │
│                 │                                                    │  ~24px gap
│                 │  ┌─KPI──┐ ┌─KPI──┐ ┌─KPI──┐ ┌─KPI──┐           │  ~120px
│                 │  │CashFl│ │CapRte│ │Active│ │Closed│           │
│                 │  └──────┘ └──────┘ └──────┘ └──────┘           │
│                 │                                                    │  ~24px gap
│                 │  Recent Activity (2-3 rows visible)                │  ~remaining
└──────────────────────────────────────────────────────────────────────┘
```

Target: 5-6 data points above the fold. Mercury density.

### Section ordering (top to bottom)

1. Greeting row + quick actions (right-aligned)
2. Hero metric (Total Portfolio Equity)
3. Portfolio area chart with time-range tabs
4. KPI card row (4 secondary metrics)
5. Recent deals table
6. Activity feed

### Spacing constants

| Gap | Value | Tailwind | Usage |
|-----|-------|----------|-------|
| Section gap | 40px | `space-y-10` | Between major sections (greeting-to-chart, chart-to-KPIs) |
| Subsection gap | 24px | `gap-6` | Between KPI cards, between chart and KPI row |
| Card internal | 20-24px | `p-5` or `p-6` | Inside all card surfaces |
| Greeting bottom | 32px | `mb-8` | Below greeting before hero metric |

### Page container

```tsx
<div className="min-h-screen bg-[#0C0B0A]">
  <div className="max-w-[1200px] mx-auto px-6 py-8 space-y-10">
    {/* sections */}
  </div>
</div>
```

---

## 2. KPI Cards — Number Display, Sparklines, Trend Indicators

### Card surface

```tsx
<div className={cn(
  "rounded-xl p-5 space-y-1.5 overflow-hidden",
  "bg-[#141312]",
  "bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(139,122,255,0.02),transparent)]",
  "border border-white/[0.04]",
)}>
```

The micro-gradient is a barely-perceptible violet warmth at the top of the card, giving depth without calling attention to itself.

### Label (above the number)

```tsx
<p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#A09D98]">
  Monthly Cash Flow
</p>
```

Labels sit ABOVE the number. This follows the reading pattern: label tells you what you are about to read, then the number delivers the payload.

### Number display — superscript cents

```tsx
function formatKPIValue(value: number, format: Format): JSX.Element {
  if (format === 'currency') {
    const dollars = Math.floor(Math.abs(value))
    const cents = Math.round((Math.abs(value) % 1) * 100)
    const sign = value < 0 ? '-' : ''
    return (
      <span className="text-[34px] font-medium tabular-nums leading-none text-[#F0EDE8]">
        {sign}${dollars.toLocaleString()}
        <span className="text-[18px] font-normal text-[#F0EDE8]/50 align-super ml-px">
          .{cents.toString().padStart(2, '0')}
        </span>
      </span>
    )
  }
  if (format === 'percent') {
    return (
      <span className="text-[34px] font-medium tabular-nums leading-none text-[#F0EDE8]">
        {value.toFixed(1)}
        <span className="text-[18px] font-normal text-[#F0EDE8]/50 align-super ml-px">
          %
        </span>
      </span>
    )
  }
  // number
  return (
    <span className="text-[34px] font-medium tabular-nums leading-none text-[#F0EDE8]">
      {value.toLocaleString('en-US', { maximumFractionDigits: 1 })}
    </span>
  )
}
```

Key decisions:
- 34px, `font-medium` (500) — not bold 700, which looks heavy on dark
- `tabular-nums` for aligned columns
- Superscript cents at 18px, 50% opacity — gives the Mercury "precise but not loud" feel
- `leading-none` prevents extra space above/below the number

### Trend indicator (no pills)

```tsx
// Positive
<span className="text-xs font-medium tabular-nums text-emerald-400/90">
  ↑ 12.4%
</span>

// Negative
<span className="text-xs font-medium tabular-nums text-red-400/80">
  ↓ 3.2%
</span>

// Neutral
<span className="text-xs font-medium tabular-nums text-[#A09D98]">
  — 0.0%
</span>
```

No colored background pills. Just arrow + number. Emerald and red are softened with opacity to prevent afterimage on `#0C0B0A`.

### Sparkline — violet gradient

All KPI sparklines use violet `#8B7AFF` regardless of positive/negative. This creates visual cohesion instead of a traffic-light effect.

```tsx
const strokeColor = '#8B7AFF'
const gradientId = `sparkGrad-${label.replace(/\s+/g, '-').toLowerCase()}`

<defs>
  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stopColor={strokeColor} stopOpacity={0.20} />
    <stop offset="50%" stopColor={strokeColor} stopOpacity={0.06} />
    <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
  </linearGradient>
</defs>
<Area
  type="monotone"
  dataKey="value"
  stroke={strokeColor}
  strokeWidth={1.5}
  strokeOpacity={0.6}
  fill={`url(#${gradientId})`}
  dot={false}
  isAnimationActive={true}
  animationDuration={1400}
  animationEasing="ease-out"
  animationBegin={200}
/>
```

Three-stop gradient (0.20 / 0.06 / 0) eliminates the harsh band that two-stop produces on dark. The 200ms animation delay lets the card mount before the sparkline draws in.

### Sparkline end-point dot (Stripe pattern)

Render a small dot on the last data point to signal "current value":

```tsx
// Custom dot renderer — only renders on the last point
function EndDot(props: { cx: number; cy: number; index: number; data: unknown[] }) {
  if (props.index !== props.data.length - 1) return null
  return (
    <circle
      cx={props.cx} cy={props.cy} r={3}
      fill="#8B7AFF" stroke="#141312" strokeWidth={2}
    />
  )
}
```

### Complete KPI card assembly

```tsx
<div className="rounded-xl p-5 space-y-1.5 overflow-hidden
  bg-[#141312]
  bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(139,122,255,0.02),transparent)]
  border border-white/[0.04]">

  <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#A09D98]">
    Monthly Cash Flow
  </p>

  {formatKPIValue(animated, 'currency')}

  <span className="text-xs font-medium tabular-nums text-emerald-400/90">
    ↑ 12.4%
  </span>

  <div className="mt-3 -mx-5 -mb-5">
    <ResponsiveContainer width="100%" height={56}>
      <AreaChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        {/* gradient + area as above */}
      </AreaChart>
    </ResponsiveContainer>
  </div>
</div>
```

---

## 3. Chart Section — Area Chart on Dark

### Chart container with ambient glow

```tsx
<div className="rounded-xl p-6 overflow-hidden
  bg-[#141312]
  bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(139,122,255,0.04),transparent)]
  border border-white/[0.04]">
```

The radial gradient creates an imperceptible "glow from above" — the chart area feels like it has ambient lighting rather than sitting in a flat box.

### Chart header with inline legend

```tsx
<div className="flex items-center justify-between mb-6">
  <h3 className="text-sm font-medium text-[#F0EDE8]">
    Portfolio Performance
  </h3>
  <div className="flex items-center gap-4">
    <div className="flex items-center gap-1.5">
      <span className="inline-block h-2 w-2 rounded-full bg-[#6DD4A0]" />
      <span className="text-[11px] text-[#A09D98]">Monthly</span>
    </div>
    <div className="flex items-center gap-1.5">
      <span className="inline-block h-2 w-2 rounded-full bg-[#8B7AFF]" />
      <span className="text-[11px] text-[#A09D98]">Cumulative</span>
    </div>
  </div>
</div>
```

Legend is inline with the title. No separate Recharts Legend component.

### Time-range tabs

```tsx
<div className="flex items-center gap-1 mb-4">
  {['1M', '3M', '6M', '1Y', 'ALL'].map((range) => (
    <button
      key={range}
      className={cn(
        "px-3 py-1.5 rounded-md text-[11px] font-medium tracking-wide transition-colors",
        active === range
          ? "bg-white/[0.06] text-[#F0EDE8]"
          : "text-[#A09D98] hover:text-[#F0EDE8] hover:bg-white/[0.03]"
      )}
    >
      {range}
    </button>
  ))}
</div>
```

### Grid, axes, and data lines

```tsx
<CartesianGrid
  strokeDasharray="0"
  stroke="#FFFFFF"
  strokeOpacity={0.04}
  vertical={false}
/>
<XAxis
  dataKey="month"
  tick={{ fontSize: 11, fill: '#F0EDE8', fillOpacity: 0.35 }}
  tickLine={false}
  axisLine={false}
  tickFormatter={(value: string) => value.replace('Month ', 'M')}
/>
<YAxis hide />
```

Key dark adaptations:
- Solid grid lines (not dashed — dashes look jittery on dark), 4% white opacity
- Axis labels at 35% opacity — guide without competing
- Y-axis hidden entirely (Mercury pattern)
- X-axis line removed

### Gradient fill — three-stop for smooth falloff

```tsx
<defs>
  <linearGradient id="chartFillMonthly" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stopColor="#6DD4A0" stopOpacity={0.25} />
    <stop offset="50%" stopColor="#6DD4A0" stopOpacity={0.08} />
    <stop offset="100%" stopColor="#6DD4A0" stopOpacity={0} />
  </linearGradient>
</defs>
<Area
  type="monotone"
  dataKey="monthlyCashFlow"
  stroke="#6DD4A0"
  strokeWidth={2}
  fill="url(#chartFillMonthly)"
  dot={false}
  baseValue={0}
  activeDot={{ r: 4, fill: '#6DD4A0', stroke: '#0C0B0A', strokeWidth: 2 }}
  animationDuration={1200}
  animationEasing="ease-out"
/>
<Area
  type="monotone"
  dataKey="cumulativeCashFlow"
  stroke="#8B7AFF"
  strokeWidth={2}
  fill="none"
  dot={false}
  activeDot={{ r: 4, fill: '#8B7AFF', stroke: '#0C0B0A', strokeWidth: 2 }}
  animationDuration={1200}
  animationEasing="ease-out"
  animationBegin={300}
/>
```

Monthly gets the sage green fill (positive cash flow visual). Cumulative is violet stroke-only to avoid visual overload. `baseValue={0}` ensures negative months (BRRRR rehab) fill downward from the zero line.

### Custom dark tooltip

```tsx
function DarkTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-lg px-4 py-3 backdrop-blur-xl"
      style={{
        background: 'rgba(28, 27, 25, 0.85)',
        border: '1px solid rgba(240, 237, 232, 0.08)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(240, 237, 232, 0.04)',
      }}
    >
      <p className="text-[10px] font-medium text-[#A09D98] mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 mb-1 last:mb-0">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-[11px] text-[#A09D98]">
            {entry.dataKey === 'monthlyCashFlow' ? 'Monthly' : 'Cumulative'}:
          </span>
          <span className={cn(
            "text-sm font-medium tabular-nums",
            (entry.value ?? 0) >= 0 ? "text-[#F0EDE8]" : "text-[#E57373]"
          )}>
            {formatTooltipCurrency(entry.value ?? 0)}
          </span>
        </div>
      ))}
    </div>
  )
}

// Cursor line
<Tooltip
  content={<DarkTooltip />}
  cursor={{ stroke: '#8B7AFF', strokeOpacity: 0.2, strokeWidth: 1 }}
/>
```

Mobile fallback: replace `backdrop-blur-xl` with solid `rgba(28, 27, 25, 0.95)` on viewports below 768px to avoid frame drops.

---

## 4. Activity Feed

### Activity icon mapping (dark palette)

```tsx
const ACTIVITY_ICONS: Record<ActivityItem['activity_type'], { icon: LucideIcon; color: string }> = {
  deal_analyzed:     { icon: Calculator,   color: '#8B7AFF' },  // Violet
  pipeline_moved:    { icon: ArrowRight,   color: '#E8B44A' },  // Warm amber
  document_analyzed: { icon: FileText,     color: '#64B5F6' },  // Soft blue
  deal_closed:       { icon: CheckCircle2, color: '#6DD4A0' },  // Sage green
}
```

### Icon container — 8% opacity tint

```tsx
<div
  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
  style={{ backgroundColor: `${config.color}14` }}
>
  <Icon size={15} style={{ color: config.color, opacity: 0.85 }} />
</div>
```

Hex suffix `14` = ~8% opacity. Creates a barely-visible tinted square on `#0C0B0A`.

### Activity row — 44-48px height

```tsx
<div className="flex items-center gap-3 px-3 py-3 rounded-lg
  hover:bg-white/[0.03] transition-colors duration-150 cursor-default">
  {/* icon container */}
  <p className="text-sm text-[#F0EDE8]/70 flex-1 truncate">{item.text}</p>
  <span className="text-[11px] tabular-nums text-[#F0EDE8]/30 shrink-0">
    {timeAgo(item.timestamp)}
  </span>
</div>
```

Row height lands at ~44px with `py-3` and the 32px icon. Timestamps at 30% opacity are the lowest-contrast element — readable when focused on but never draw the eye first.

### Day separators

```tsx
<div className="flex items-center gap-3 px-3 py-2">
  <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#F0EDE8]/25">
    Today
  </span>
  <div className="flex-1 h-px bg-white/[0.04]" />
</div>
```

Group activities into Today / Yesterday / Earlier. The separator uses a 4% white line and 25% opacity label.

### Feed container

```tsx
<div className="rounded-xl border border-white/[0.04] bg-[#141312] p-2">
  {/* day separator */}
  {/* activity rows */}
</div>
```

Section header:

```tsx
<div className="flex items-center justify-between mb-3">
  <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#A09D98]">
    Recent Activity
  </h2>
  <button className="text-sm font-medium text-[#8B7AFF]/80 hover:text-[#8B7AFF] transition-colors">
    View all →
  </button>
</div>
```

---

## 5. Quick Actions — Three-Tier Button System

### Primary (solid violet with ambient glow)

```tsx
<button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg
  bg-[#8B7AFF] text-[#0C0B0A] text-sm font-medium
  hover:bg-[#9D8FFF] transition-colors
  shadow-[0_0_20px_rgba(139,122,255,0.15)]">
  <Plus size={16} />
  New Analysis
</button>
```

Dark text on violet background. The `shadow` creates a subtle glow that draws the eye without being garish.

### Secondary (ghost with border)

```tsx
<button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg
  border border-white/[0.08] text-[#F0EDE8]/70 text-sm font-medium
  hover:bg-white/[0.04] hover:text-[#F0EDE8] hover:border-white/[0.12]
  transition-all duration-150">
  <FileText size={16} />
  View Reports
</button>
```

### Tertiary (text-only link)

```tsx
<button className="text-sm font-medium text-[#8B7AFF]/80
  hover:text-[#8B7AFF] transition-colors">
  View all →
</button>
```

### Placement on dashboard

Quick actions sit in the greeting header row, right-aligned:

```tsx
<div className="flex items-center justify-between mb-8">
  <div className="space-y-1">
    {/* greeting + subtitle */}
  </div>
  <div className="flex items-center gap-3">
    <button className="...ghost...">
      <FileText size={16} /> Export
    </button>
    <button className="...primary...">
      <Plus size={16} /> New Analysis
    </button>
  </div>
</div>
```

On mobile (<768px), quick actions collapse into a single floating action button or move below the greeting.

---

## 6. Welcome Greeting — Time-Based with Portfolio Snapshot

### Time-based greeting function

```tsx
function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}
```

### Greeting render

```tsx
<div className="space-y-1 mb-8">
  <h1 className="text-2xl font-medium text-[#F0EDE8]">
    {getGreeting()}, {firstName}
  </h1>
  <p className="text-sm text-[#F0EDE8]/40">
    {stats.total_deals} deals &middot; ${formatCompact(stats.total_equity)} equity &middot;
    ${formatCompact(stats.monthly_cash_flow)}/mo cash flow
  </p>
</div>
```

Key sizing: Greeting is 24px (`text-2xl`), NOT the largest element. The hero metric below at 40px is the focal point. The greeting is a warm entry point; the number is the payload.

The middot-separated subtitle replaces the need for a separate "summary" card. One line, three data points, zero card real estate consumed.

### For users with no portfolio data yet

```tsx
<p className="text-sm text-[#F0EDE8]/40">
  Your portfolio at a glance
</p>
```

---

## 7. Empty State — Blurred Violet Glow

When `stats.total_deals === 0`, render a centered invitation instead of an empty grid.

```tsx
<div className="flex flex-col items-center justify-center py-20 max-w-md mx-auto text-center">
  {/* Ambient glow behind icon */}
  <div className="relative mb-6">
    <div className="absolute inset-0 w-16 h-16 rounded-full bg-[#8B7AFF]/10 blur-xl
      -translate-x-1 -translate-y-1" />
    <div className="relative w-14 h-14 rounded-2xl bg-[#8B7AFF]/[0.08]
      border border-[#8B7AFF]/[0.12] flex items-center justify-center">
      <Calculator size={24} className="text-[#8B7AFF]/60" />
    </div>
  </div>

  <h2 className="text-lg font-medium text-[#F0EDE8] mb-2">
    Run your first analysis
  </h2>
  <p className="text-sm text-[#F0EDE8]/40 mb-6 leading-relaxed">
    Enter a property address and strategy to see returns,
    cash flow projections, and risk scoring in seconds.
  </p>

  <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg
    bg-[#8B7AFF] text-[#0C0B0A] text-sm font-medium
    hover:bg-[#9D8FFF] transition-colors
    shadow-[0_0_24px_rgba(139,122,255,0.12)]">
    <Plus size={16} />
    Analyze a Deal
  </button>
</div>
```

Decisions:
- `blur-xl` glow behind the icon creates ambient warmth — on dark, it reads as "something is here"
- Headline is action-oriented ("Run your first analysis"), NOT state-descriptive ("No deals yet")
- Body text at 40% opacity — long enough to explain value, short enough to not feel like docs
- CTA button has a subtle box-shadow glow that makes it the natural focal point

### Feature hint cards below empty state

```tsx
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-10 max-w-2xl mx-auto">
  {HINT_CARDS.map(({ icon: Icon, title, description }) => (
    <div
      key={title}
      className="p-5 rounded-xl border border-white/[0.04] bg-white/[0.02]
        space-y-3 cursor-default"
    >
      <div className="w-9 h-9 rounded-lg bg-[#8B7AFF]/[0.08]
        flex items-center justify-center">
        <Icon size={18} className="text-[#8B7AFF]/60" />
      </div>
      <p className="text-sm font-medium text-[#F0EDE8]">{title}</p>
      <p className="text-xs text-[#F0EDE8]/40 leading-relaxed">{description}</p>
    </div>
  ))}
</div>
```

---

## 8. Trial User Variant

When user is on a trial plan, the dashboard receives these modifications:

### Trial progress bar (below greeting, above hero metric)

```tsx
<div className="flex items-center gap-3 px-4 py-3 rounded-lg
  bg-white/[0.02] border border-white/[0.04]">
  <div className="flex-1">
    <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
      <div
        className="h-full rounded-full bg-[#8B7AFF]/60 transition-all duration-500"
        style={{ width: `${(daysRemaining / 7) * 100}%` }}
      />
    </div>
  </div>
  <span className="text-[11px] tabular-nums text-[#F0EDE8]/30">
    {daysRemaining} days left in trial
  </span>
</div>
```

### Analyses remaining badge

For trial users with the 5-free-analyses limit, show a subtle counter near the "New Analysis" button:

```tsx
<div className="flex items-center gap-2">
  <button className="...primary...">
    <Plus size={16} /> New Analysis
  </button>
  <span className="text-[11px] tabular-nums text-[#F0EDE8]/30">
    {analysesRemaining} of 5 remaining
  </span>
</div>
```

### Upgrade nudge (appears after 3+ analyses used)

```tsx
<div className="flex items-center gap-3 px-4 py-3 rounded-lg
  bg-[#8B7AFF]/[0.04] border border-[#8B7AFF]/[0.08]">
  <Sparkles size={16} className="text-[#8B7AFF]/60 shrink-0" />
  <p className="text-sm text-[#F0EDE8]/60 flex-1">
    Unlock unlimited analyses, document processing, and portfolio tracking.
  </p>
  <button className="text-sm font-medium text-[#8B7AFF] hover:text-[#9D8FFF]
    transition-colors shrink-0">
    Upgrade →
  </button>
</div>
```

### What differs for trial vs. paid users

| Element | Trial user | Paid user |
|---------|-----------|-----------|
| Progress bar | Visible (below greeting) | Hidden |
| Analysis counter | "X of 5 remaining" shown | Hidden |
| Upgrade nudge | Shown after 3 analyses | Hidden |
| KPI cards | Same display | Same display |
| Activity feed | Same (may be empty) | Same |
| Empty state CTA | "Analyze a Deal" | "Analyze a Deal" |
| Chart | Shows if data exists | Shows if data exists |

Trial users do NOT get a degraded visual experience. Every component looks identical — the trial indicators are additive, not subtractive.

---

## 9. Complete Layout Grid — Spacing, Gaps, Responsive Breakpoints

### Desktop layout (>=1024px)

```tsx
<motion.div
  className="space-y-10"
  variants={containerVariants}
  initial="hidden"
  animate="visible"
>
  {/* Row 1: Greeting + actions */}
  <motion.div variants={itemVariants} className="flex items-center justify-between">
    {/* greeting left, actions right */}
  </motion.div>

  {/* Row 2: Trial progress (conditional) */}
  {isTrialUser && <motion.div variants={itemVariants}>{/* progress bar */}</motion.div>}

  {/* Row 3: Hero metric */}
  <motion.div variants={itemVariants} className="space-y-1">
    <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#A09D98]">
      Total Portfolio Equity
    </p>
    <p className="text-[40px] font-medium tabular-nums leading-none text-[#F0EDE8]">
      ${formatDollars(stats.total_equity)}
      <span className="text-[20px] font-normal text-[#F0EDE8]/50 align-super ml-px">.00</span>
    </p>
  </motion.div>

  {/* Row 4: Portfolio chart */}
  <motion.div variants={itemVariants}>
    {/* chart container with time-range tabs */}
  </motion.div>

  {/* Row 5: KPI grid */}
  <motion.div variants={itemVariants}
    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
    <KPICard label="Monthly Cash Flow" value={stats.monthly_cash_flow} format="currency" />
    <KPICard label="Avg Cap Rate" value={stats.avg_cap_rate} format="percent" />
    <KPICard label="Active Pipeline" value={stats.active_pipeline_deals} format="number" />
    <KPICard label="Closed Deals" value={closedDeals} format="number" />
  </motion.div>

  {/* Row 6: Two-column layout — deals table + activity feed */}
  <motion.div variants={itemVariants}
    className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
    {/* Recent deals table (wider) */}
    <div>{/* table */}</div>
    {/* Activity feed (narrower) */}
    <div>{/* feed */}</div>
  </motion.div>
</motion.div>
```

### Responsive breakpoints

| Breakpoint | KPI grid | Deals + activity | Hero metric | Quick actions |
|------------|---------|------------------|-------------|---------------|
| >= 1024px (lg) | 4 columns | Side-by-side (1fr + 380px) | 40px | Inline with greeting |
| 768-1023px (md) | 2 columns | Stacked | 36px | Below greeting |
| < 768px (sm) | 1 column | Stacked | 32px | Floating action button |

### Mobile-specific adjustments

```tsx
// Hero metric responsive
<p className="text-[32px] sm:text-[36px] lg:text-[40px] font-medium tabular-nums
  leading-none text-[#F0EDE8]">

// KPI grid responsive
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">

// Chart height responsive
<div className="h-[220px] sm:h-[260px] lg:h-[300px] w-full">

// Quick actions — hidden on mobile, FAB instead
<div className="hidden md:flex items-center gap-3">
  {/* ghost + primary buttons */}
</div>
<button className="md:hidden fixed bottom-6 right-6 z-50
  w-14 h-14 rounded-full bg-[#8B7AFF] text-[#0C0B0A]
  flex items-center justify-center
  shadow-[0_0_24px_rgba(139,122,255,0.2)]">
  <Plus size={24} />
</button>
```

### Animation variants (refined for dark)

```tsx
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1.0] },
  },
}
```

Stagger is 60ms (down from 80ms). Duration is 350ms (up from 180ms) with a custom cubic bezier that starts faster and settles slower — more premium feel on dark where animations are more visible.

### Number crossfade on data refresh

```tsx
<motion.span
  key={value}
  initial={{ opacity: 0, y: -4 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
  className="text-[34px] font-medium tabular-nums text-[#F0EDE8]"
>
  {formatKPIValue(value, format)}
</motion.span>
```

The `key={value}` forces remount on data change, triggering a subtle slide-fade.

### Live data pulse dot (Active Pipeline card only)

```tsx
<span className="relative flex h-2 w-2 ml-1.5">
  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8B7AFF] opacity-30" />
  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#8B7AFF]/60" />
</span>
```

Use on a single card maximum. Signals "this data is live" without requiring websockets.

---

## CRITICAL DECISIONS

1. **Hero metric replaces KPI grid as first element.** The current Dashboard leads with a 4-card KPI row. The redesign leads with a single 40px equity figure floating in space, followed by the chart, then the KPI row as a secondary tier. This is the single biggest layout change and the one that creates the Mercury-like gravitas.

2. **All sparklines are violet, not conditional red/green.** The current KPICard uses lime-600 for positive and red-600 for negative sparklines. The redesign uses `#8B7AFF` universally. Trend direction is communicated by the arrow + percentage text below the number, not the sparkline color. This prevents the "traffic light" effect that breaks visual cohesion on dark.

3. **Three-stop gradients everywhere.** Two-stop gradients create a visible "band" on dark backgrounds. Every gradient in the dashboard (sparklines, chart fill, card micro-gradient) uses three stops with a midpoint at 50% that acts as a smooth decay anchor.

4. **Font-weight 500, not 600/700 for numbers.** On dark backgrounds, lighter text creates more perceived contrast than on light. Bold 700 looks heavy and chunky. Medium 500 reads as confident and refined. Applies to both the hero metric and KPI card values.

5. **Labels above numbers, not below.** This reverses the current KPICard pattern. The label tells you what you are about to read; the number delivers. This matches Mercury and Linear's KPI patterns.

6. **Activity icons use warm desaturated palette, not the current lime/sky.** The current `#4D7C0F` (lime) and `#0EA5E9` (sky) are optimized for white backgrounds. On dark, they are replaced with `#8B7AFF` (violet), `#E8B44A` (warm amber), `#64B5F6` (soft blue), and `#6DD4A0` (sage green) — all sitting at 60-70% saturation for WCAG AA compliance without eye strain.

7. **No visible Y-axis on the main chart.** Mercury hides the Y-axis entirely and lets the grid do the work. Our chart follows this pattern: horizontal-only grid at 4% opacity, no axis lines, X-axis labels at 35% opacity. The chart breathes.

8. **Tooltip uses glass surface, not white card.** The current tooltip is `bg-white` with `border-gray-200`. The redesign uses `rgba(28, 27, 25, 0.85)` with `backdrop-blur-xl` and a 1px cream border at 8% opacity. Mobile falls back to solid background without blur.

9. **Trial indicators are additive, not subtractive.** Trial users see the same full-fidelity dashboard as paid users. The only additions are a progress bar (below greeting), an analysis counter (near CTA), and an upgrade nudge (after 3 analyses). No features are visually grayed out or locked behind overlays.

10. **Deals table and activity feed split into two columns on desktop.** The current layout stacks everything vertically. The redesign uses `grid-cols-[1fr_380px]` at the lg breakpoint to place the deals table (wider, primary) alongside the activity feed (narrower, secondary). This reduces scroll depth and increases information density in the lower half of the page where the eye has already been anchored by the sparse upper half.
