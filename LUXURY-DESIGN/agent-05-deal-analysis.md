# Agent 05 — Deal Analysis & Results: Luxury Dark Design Spec

Definitive spec for Parcel's 3-page analysis flow (strategy selection, form inputs, results)
migrated to the luxury dark theme. All Tailwind classes are production-ready.

Palette reference: bg `#0C0B0A`, surface `#111110`, elevated `#141312`,
cream `#F0EDE8`, violet `#8B7AFF`, warm muted `#A39E93`.

---

## 1. Strategy Selector (StrategySelectPage)

### Card Grid

```tsx
<motion.div
  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
  variants={containerVariants}
  initial="hidden"
  animate="show"
>
  {STRATEGIES.map((s) => (
    <motion.div key={s.strategy} variants={itemVariants}>
      <Link
        to={`/analyze/${s.strategy}`}
        className={cn(
          "group relative flex flex-col gap-3 rounded-xl border p-5",
          "bg-[#111110] border-white/[0.06]",
          "hover:border-violet-500/40 hover:bg-[#141312]",
          "hover:shadow-[0_0_24px_rgba(139,122,255,0.06)]",
          "transition-all duration-300"
        )}
      >
        <StrategyBadge strategy={s.strategy} />
        <span className="font-semibold text-[#F0EDE8]">{s.name}</span>
        <span className="text-sm text-white/45 leading-relaxed">{s.description}</span>
        <ArrowRight
          size={16}
          className="text-white/25 group-hover:text-violet-400 transition-colors mt-auto"
        />
      </Link>
    </motion.div>
  ))}
</motion.div>
```

### Heading Treatment

```tsx
<h2 className="text-xl font-semibold text-[#F0EDE8]">Choose a Strategy</h2>
<p className="text-sm text-white/45 mt-1">
  Select an investment strategy to analyze your deal.
</p>
```

### Selected-State Glow (if used as radio cards)

When the strategy selector is used in a radio-button pattern (e.g., comparison page),
the selected card gets a violet border and halo:

```tsx
selected === s.strategy
  ? "border-violet-500/50 bg-[#161514] shadow-[0_0_24px_rgba(139,122,255,0.08)]"
  : "border-white/[0.06] bg-[#111110] hover:border-white/[0.12] hover:bg-[#141312]"
```

### Dark StrategyBadge Colors

Glass-morphic pills with 12%-opacity fills and luminous text:

```tsx
const STRATEGY_COLORS_DARK: Record<Strategy, { bg: string; text: string; border: string }> = {
  wholesale:        { bg: 'bg-amber-500/[0.12]',  text: 'text-amber-300',  border: 'border-amber-500/20'  },
  creative_finance: { bg: 'bg-violet-500/[0.12]', text: 'text-violet-300', border: 'border-violet-500/20' },
  brrrr:            { bg: 'bg-sky-500/[0.12]',    text: 'text-sky-300',    border: 'border-sky-500/20'    },
  buy_and_hold:     { bg: 'bg-emerald-500/[0.12]',text: 'text-emerald-300',border: 'border-emerald-500/20'},
  flip:             { bg: 'bg-rose-500/[0.12]',   text: 'text-rose-300',   border: 'border-rose-500/20'   },
}
```

Badge component:

```tsx
<span className={cn(
  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full",
  "text-xs font-semibold border",
  config.bg, config.text, config.border
)}>
  <span className="h-1.5 w-1.5 rounded-full bg-current" />
  {label}
</span>
```

---

## 2. Form Inputs (AnalyzerFormPage)

### Form Card Container

```tsx
<div className={cn(
  "rounded-xl border border-white/[0.06] bg-[#141312] p-6",
  "shadow-[0_1px_3px_rgba(0,0,0,0.4),0_1px_2px_rgba(0,0,0,0.3)]"
)}>
  {/* form contents */}
</div>
```

### Loading Overlay (form pending state)

Replace the light `bg-white/80` overlay with a dark treatment:

```tsx
{isPending && (
  <div className="absolute inset-0 rounded-xl bg-[#0C0B0A]/70 z-10 backdrop-blur-sm" />
)}
```

### Label Above Input

```tsx
<Label htmlFor={field.name} className="text-xs font-medium text-white/50 uppercase tracking-[0.08em]">
  <ConceptTooltip term={field.label} definition={field.tooltip}>
    {field.label}
  </ConceptTooltip>
</Label>
```

ConceptTooltip underline: `border-white/25 hover:border-white/40` (replaces current gray).

### Text Input (resting)

```tsx
<Input
  className={cn(
    "h-11 w-full rounded-[10px] border border-white/[0.08] bg-[#111110]",
    "px-3.5 py-2.5 text-[15px] text-[#F0EDE8] tabular-nums",
    "placeholder:text-white/30",
    "transition-all duration-200",
    "hover:border-white/[0.14]",
    "focus-visible:border-violet-500/60 focus-visible:ring-2 focus-visible:ring-violet-500/20",
    "focus-visible:ring-offset-0 focus-visible:outline-none",
    error && "border-red-500/60 ring-2 ring-red-500/15"
  )}
/>
```

### Currency Prefix ($)

```tsx
<span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35 text-sm tabular-nums select-none">
  $
</span>
<Input className="pl-7 tabular-nums ..." />
```

### Percentage Suffix (%)

```tsx
<Input className="pr-8 tabular-nums ..." />
<span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/35 text-sm tabular-nums select-none">
  %
</span>
```

### Error State

```tsx
{errors[field.name] && (
  <p className="text-red-400 text-xs mt-1">{errors[field.name]?.message}</p>
)}
```

Use `text-red-400` (not `red-600`) for readability on dark surfaces.

### Toggle / Segmented Control (loan term)

For the 15/30 year loan term toggle:

```tsx
<div className="inline-flex rounded-lg border border-white/[0.08] bg-[#111110] p-0.5">
  {[15, 30].map((yr) => (
    <button
      key={yr}
      type="button"
      onClick={() => setValue('loan_term_years', yr)}
      className={cn(
        "px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
        value === yr
          ? "bg-violet-600 text-white shadow-sm"
          : "text-white/40 hover:text-white/60"
      )}
    >
      {yr} yr
    </button>
  ))}
</div>
```

### Breadcrumb

```tsx
<nav aria-label="Breadcrumb">
  <ol className="flex items-center gap-1.5 text-xs">
    <li>
      <Link to="/dashboard" className="text-white/35 hover:text-violet-400 transition-colors">
        Dashboard
      </Link>
    </li>
    <li aria-hidden="true"><ChevronRight size={12} className="text-white/20" /></li>
    <li>
      <Link to="/analyze" className="text-white/35 hover:text-violet-400 transition-colors">
        Analyzer
      </Link>
    </li>
    <li aria-hidden="true"><ChevronRight size={12} className="text-white/20" /></li>
    <li aria-current="page" className="text-[#F0EDE8] font-medium">
      {strategyLabel}
    </li>
  </ol>
</nav>
```

---

## 3. Results KPI Grid

### KPI Card (standard numeric)

```tsx
<div className={cn(
  "rounded-xl border border-white/[0.06] bg-[#111110] p-5 space-y-1.5",
  "shadow-[0_1px_3px_rgba(0,0,0,0.4),0_1px_2px_rgba(0,0,0,0.3)]"
)}>
  <p className="text-[11px] font-medium text-white/40 uppercase tracking-[0.1em]">
    {label}
  </p>
  <p className="text-3xl font-semibold text-[#F0EDE8] tabular-nums">
    {formatValue(animated, format)}
  </p>
</div>
```

### Sparkline Gradient (inside KPI cards)

Three-stop gradient for the "pool of light" effect on dark:

```tsx
<defs>
  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%"   stopColor="#8B7AFF" stopOpacity={0.25} />
    <stop offset="50%"  stopColor="#8B7AFF" stopOpacity={0.08} />
    <stop offset="100%" stopColor="#8B7AFF" stopOpacity={0} />
  </linearGradient>
</defs>
<Area
  type="monotone"
  dataKey="value"
  stroke="#8B7AFF"
  strokeWidth={1.5}
  fill={`url(#${gradientId})`}
  dot={false}
/>
```

For negative sparklines, swap to dusty rose:

```tsx
const strokeColor = isPositive ? '#8B7AFF' : '#E57373'
```

### Color-Coded KPI Values

Positive values in cream, negative in red-400:

```tsx
<p className={cn(
  "text-3xl font-semibold tabular-nums",
  numValue >= 0 ? "text-[#F0EDE8]" : "text-red-400"
)}>
  {formatted}
</p>
```

Infinite return (percent_or_infinite) in violet:

```tsx
<p className="text-3xl font-semibold tabular-nums text-violet-400">&infin;</p>
```

### Glass-Morphic Recommendation Badge

```tsx
function getDarkRecommendationClasses(value: string): string {
  const v = value.toLowerCase()
  if (v.includes('strong buy'))
    return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
  if (v.includes('buy'))
    return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
  if (v.includes('hold'))
    return 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
  if (v.includes('avoid') || v.includes('sell'))
    return 'bg-red-500/10 text-red-400 border border-red-500/20'
  return 'bg-white/[0.06] text-white/50 border border-white/[0.08]'
}
```

Badge rendering:

```tsx
<span className={cn(
  "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold",
  getDarkRecommendationClasses(value)
)}>
  {value}
</span>
```

---

## 4. Risk Gauge (SVG with Glow)

### Full Component Spec

```tsx
const RADIUS = 70
const STROKE_WIDTH = 12
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function getDarkColor(score: number): string {
  if (score <= 30) return '#34D399'   // emerald-400
  if (score <= 60) return '#FBBF24'   // amber-400
  if (score <= 80) return '#F87171'   // red-400
  return '#EF4444'                    // red-500
}

function getDarkGlowIntensity(score: number): number {
  if (score <= 30) return 4
  if (score <= 60) return 4
  if (score <= 80) return 5
  return 6   // very high risk: more intense glow
}
```

### SVG Markup

```tsx
<svg width={180} height={180} viewBox="0 0 180 180">
  <defs>
    <filter id="arcGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation={getDarkGlowIntensity(score)} result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  {/* Ghost track */}
  <circle
    cx={90} cy={90} r={RADIUS}
    fill="none"
    stroke="rgba(255,255,255,0.06)"
    strokeWidth={STROKE_WIDTH}
  />

  {/* Animated arc with glow */}
  <circle
    cx={90} cy={90} r={RADIUS}
    fill="none"
    stroke={getDarkColor(score)}
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
    x={90} y={85}
    textAnchor="middle" dominantBaseline="central"
    style={{
      fontSize: '36px', fontWeight: 600,
      fill: '#F0EDE8',
      fontFamily: 'Inter, sans-serif',
      fontFeatureSettings: '"tnum"',
    }}
  >
    {Math.round(animated)}
  </text>

  {/* "RISK SCORE" sublabel */}
  <text
    x={90} y={108}
    textAnchor="middle" dominantBaseline="central"
    style={{
      fontSize: '11px', fontWeight: 500,
      fill: '#A39E93',
      letterSpacing: '0.05em',
      textTransform: 'uppercase' as const,
    }}
  >
    RISK SCORE
  </text>
</svg>
```

### Risk Label Pill (below gauge)

```tsx
function getDarkLabelClasses(score: number): string {
  if (score <= 30) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
  if (score <= 60) return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
  if (score <= 80) return 'bg-red-500/10 text-red-400 border-red-500/20'
  return 'bg-red-500/15 text-red-400 border-red-500/25'
}

<span className={cn(
  "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border",
  getDarkLabelClasses(score)
)}>
  {label}
</span>
```

### Risk Score Container

```tsx
<div className={cn(
  "md:col-span-2 rounded-xl border border-white/[0.06] bg-[#111110]",
  "p-6 flex flex-col items-center justify-center",
  "shadow-[0_1px_3px_rgba(0,0,0,0.4),0_1px_2px_rgba(0,0,0,0.3)]"
)}>
  <div className="flex items-center gap-1.5 mb-4">
    <h3 className="text-sm font-semibold text-[#F0EDE8]">Risk Score</h3>
    <button className="text-white/30 hover:text-white/50 transition-colors">
      <HelpCircle size={16} />
    </button>
  </div>
  <RiskGauge score={riskScore} />
</div>
```

Risk popover content on dark:

```tsx
<PopoverContent className="w-72 bg-[#1A1918] border-white/[0.08] p-4 shadow-2xl backdrop-blur-xl">
  <p className="text-sm font-semibold text-[#F0EDE8] mb-2">Risk Score Breakdown</p>
  {/* factor rows */}
  <div className="flex items-center justify-between text-sm">
    <span className="text-white/45">{formatLabel(key)}</span>
    <span className="text-[#F0EDE8] tabular-nums">{value}</span>
  </div>
</PopoverContent>
```

---

## 5. Cash Flow Table & Chart

### Outputs Table (All Outputs)

```tsx
<div className={cn(
  "md:col-span-3 rounded-xl border border-white/[0.06] bg-[#111110]",
  "overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.4),0_1px_2px_rgba(0,0,0,0.3)]"
)}>
  {/* Header */}
  <div className="px-4 py-3 border-b border-white/[0.06]">
    <h3 className="text-sm font-semibold text-[#F0EDE8]">All Outputs</h3>
  </div>

  {/* Rows */}
  {outputEntries.map(([key, value], i) => (
    <div
      key={key}
      className={cn(
        "flex items-center justify-between py-2.5 px-4 border-b border-white/[0.04] last:border-0",
        i % 2 === 0 ? "bg-transparent" : "bg-white/[0.02]"
      )}
    >
      <span className="text-sm text-white/50">{formatLabel(key)}</span>
      <span className="text-[13px] text-[#F0EDE8] tabular-nums">
        {formatOutputValue(key, value)}
      </span>
    </div>
  ))}
</div>
```

Recommendation badge inside the table uses the same glass-morphic `getDarkRecommendationClasses` from Section 3.

### Cash Flow Projection Chart

**Grid lines** -- solid, horizontal only, nearly invisible:

```tsx
<CartesianGrid
  strokeDasharray="0"
  stroke="#1E1D1B"
  strokeOpacity={0.6}
  vertical={false}
/>
```

**Axes:**

```tsx
<XAxis
  dataKey="month"
  tick={{ fontSize: 11, fill: '#A39E93' }}
  tickLine={false}
  axisLine={{ stroke: '#2A2826', strokeWidth: 1 }}
/>
<YAxis
  tick={{ fontSize: 11, fill: '#A39E93' }}
  tickLine={false}
  axisLine={false}
  tickFormatter={formatDollar}
  width={60}
/>
```

**Area fills** -- violet for monthly, cream ghost line for cumulative:

```tsx
<defs>
  <linearGradient id="violetGlow" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%"   stopColor="#8B7AFF" stopOpacity={0.30} />
    <stop offset="50%"  stopColor="#8B7AFF" stopOpacity={0.08} />
    <stop offset="100%" stopColor="#8B7AFF" stopOpacity={0} />
  </linearGradient>
</defs>

{/* Monthly cash flow */}
<Area
  type="monotone"
  dataKey="monthlyCashFlow"
  stroke="#8B7AFF"
  strokeWidth={2}
  fill="url(#violetGlow)"
  animationDuration={1200}
  animationBegin={0}
/>

{/* Cumulative -- unfilled cream line */}
<Area
  type="monotone"
  dataKey="cumulativeCashFlow"
  stroke="#F0EDE8"
  strokeOpacity={0.6}
  strokeWidth={2}
  fill="none"
  animationDuration={1200}
  animationBegin={300}
/>
```

**Zero reference line** (for BRRRR/Flip negative months):

```tsx
<ReferenceLine
  y={0}
  stroke="#A39E93"
  strokeOpacity={0.2}
  strokeDasharray="4 4"
/>
```

**Dark tooltip:**

```tsx
<div
  className="rounded-lg px-4 py-3 backdrop-blur-xl"
  style={{
    background: 'rgba(28, 27, 25, 0.85)',
    border: '1px solid rgba(240, 237, 232, 0.08)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(240, 237, 232, 0.04)',
  }}
>
  <p className="text-xs font-medium text-[#A39E93] mb-2">{label}</p>
  {payload.map((entry) => (
    <div key={entry.dataKey} className="flex items-center gap-2 mb-1 last:mb-0">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
      <span className="text-xs text-[#A39E93]">{seriesLabel}</span>
      <span
        className="text-sm font-medium tabular-nums"
        style={{ color: entry.value >= 0 ? '#F0EDE8' : '#E57373' }}
      >
        {formatCurrency(entry.value)}
      </span>
    </div>
  ))}
</div>
```

**Cursor line:**

```tsx
<Tooltip
  content={<DarkTooltip />}
  cursor={{ stroke: '#8B7AFF', strokeOpacity: 0.2, strokeWidth: 1 }}
/>
```

---

## 6. Comparison View (ComparePage)

### Comparison Table

```tsx
{/* Table container */}
<div className="rounded-xl border border-white/[0.06] bg-[#111110] overflow-hidden">
  {/* Header row */}
  <div className="grid grid-cols-3 px-4 py-3 border-b border-white/[0.06]">
    <span className="text-[11px] font-medium text-white/40 uppercase tracking-[0.1em]">Metric</span>
    <span className="text-[11px] font-medium text-white/40 uppercase tracking-[0.1em] text-right">Deal A</span>
    <span className="text-[11px] font-medium text-white/40 uppercase tracking-[0.1em] text-right">Deal B</span>
  </div>

  {/* Data rows */}
  {metrics.map((m, i) => (
    <div
      key={m.key}
      className={cn(
        "grid grid-cols-3 px-4 py-2.5 border-b border-white/[0.04] last:border-0",
        i % 2 === 0 ? "bg-transparent" : "bg-white/[0.02]"
      )}
    >
      <span className="text-sm text-white/50">{m.label}</span>
      <span className={cn(
        "text-sm tabular-nums text-right",
        m.winnerA ? "text-emerald-400 bg-emerald-500/[0.06] -mx-2 px-2 rounded" : "text-white/50"
      )}>
        {m.valueA}
      </span>
      <span className={cn(
        "text-sm tabular-nums text-right",
        m.winnerB ? "text-emerald-400 bg-emerald-500/[0.06] -mx-2 px-2 rounded" : "text-white/50"
      )}>
        {m.valueB}
      </span>
    </div>
  ))}
</div>
```

### Radar Chart

```tsx
const DARK_DEAL_COLORS = ['#8B7AFF', '#FBBF24', '#34D399', '#F87171', '#38BDF8']

<PolarGrid stroke="rgba(255,255,255,0.06)" />
<PolarAngleAxis tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }} />

<Radar
  dataKey="dealA"
  stroke={DARK_DEAL_COLORS[0]}
  fill={DARK_DEAL_COLORS[0]}
  fillOpacity={0.10}
  strokeWidth={2}
/>
<Radar
  dataKey="dealB"
  stroke={DARK_DEAL_COLORS[1]}
  fill={DARK_DEAL_COLORS[1]}
  fillOpacity={0.10}
  strokeWidth={2}
/>
```

### Deal Selector Dropdowns

```tsx
<select className={cn(
  "h-11 rounded-[10px] border border-white/[0.08] bg-[#111110]",
  "px-3.5 py-2.5 text-[15px] text-[#F0EDE8]",
  "focus-visible:border-violet-500/60 focus-visible:ring-2 focus-visible:ring-violet-500/20",
  "focus-visible:ring-offset-0 focus-visible:outline-none",
  "appearance-none cursor-pointer"
)}>
  <option value="">Select a deal...</option>
</select>
```

---

## 7. PDF Export Button

### Dedicated Export Bar (below KPI grid)

```tsx
<div className={cn(
  "flex items-center justify-between rounded-xl border border-white/[0.06]",
  "bg-[#111110] px-5 py-3"
)}>
  <div className="flex items-center gap-2 text-white/40">
    <FileDown size={14} />
    <span className="text-xs font-medium uppercase tracking-wider">Export</span>
  </div>
  <Button
    onClick={handleDownloadReport}
    disabled={generatingPDF}
    className={cn(
      "gap-2 rounded-lg px-4 py-2 text-sm font-medium",
      "bg-white/[0.06] text-[#F0EDE8] border border-white/[0.08]",
      "hover:bg-white/[0.10] hover:border-white/[0.14]",
      "disabled:opacity-40",
      "transition-all duration-200"
    )}
  >
    <FileDown size={14} />
    {generatingPDF ? 'Generating...' : 'Download PDF Report'}
  </Button>
</div>
```

### Inline Glass Button Alternative (if space is tight)

```tsx
<Button
  onClick={handleDownloadReport}
  disabled={generatingPDF}
  className={cn(
    "gap-2 rounded-lg px-4 py-2 text-sm font-medium",
    "bg-white/[0.06] text-[#F0EDE8] border border-white/[0.08]",
    "hover:bg-white/[0.10] hover:border-white/[0.14]",
    "backdrop-blur-sm",
    "disabled:opacity-40 transition-all duration-200"
  )}
>
  <FileDown size={14} />
  {generatingPDF ? 'Generating...' : 'Download Report'}
</Button>
```

### Pro-Gated State

```tsx
<Button
  onClick={() => navigate('/pricing')}
  className={cn(
    "gap-2 rounded-lg px-4 py-2 text-sm font-medium",
    "bg-white/[0.04] text-white/30 border border-white/[0.06]",
    "hover:bg-white/[0.06] hover:text-white/40",
    "transition-all duration-200"
  )}
>
  <Lock size={14} />
  Export PDF (Pro)
</Button>
```

---

## 8. Analyze CTA Button

### Full-Width Violet with Hover Glow

```tsx
<Button
  type="submit"
  disabled={isPending}
  className={cn(
    "w-full h-12 rounded-xl text-sm font-semibold tracking-wide",
    "bg-violet-600 text-white",
    "hover:bg-violet-500 hover:shadow-[0_0_20px_rgba(139,122,255,0.25)]",
    "active:bg-violet-700 active:shadow-none",
    "disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed",
    "transition-all duration-300"
  )}
>
  {isPending ? (
    <span className="flex items-center justify-center gap-2">
      <Loader2 size={16} className="animate-spin" />
      Analyzing...
    </span>
  ) : (
    "Run Analysis"
  )}
</Button>
```

### Framer Motion Enhancement

```tsx
<motion.div whileTap={{ scale: 0.98 }} className="pt-2">
  <Button type="submit" ... />
</motion.div>
```

### Error Message Below CTA

```tsx
{createDeal.isError && (
  <p className="text-red-400 text-sm mt-2 text-center">
    {createDeal.error?.message ?? 'Something went wrong. Please try again.'}
  </p>
)}
```

---

## 9. Loading State

### Dark Shimmer Skeletons

Keyframe (add to `tailwind.config.ts` or `index.css`):

```css
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
```

Tailwind extension:

```ts
// tailwind.config.ts
animation: {
  shimmer: 'shimmer 2s infinite',
}
```

Skeleton card component:

```tsx
<div className={cn(
  "rounded-xl border border-white/[0.06] bg-[#111110] p-5 space-y-3",
  "overflow-hidden relative"
)}>
  {/* Placeholder bars */}
  <div className="h-3 w-20 rounded bg-white/[0.06]" />
  <div className="h-8 w-32 rounded bg-white/[0.06]" />

  {/* Traveling shimmer highlight */}
  <div className={cn(
    "absolute inset-0 -translate-x-full animate-shimmer",
    "bg-gradient-to-r from-transparent via-white/[0.03] to-transparent"
  )} />
</div>
```

### KPI Skeleton Grid

```tsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
  {Array.from({ length: 4 }).map((_, i) => (
    <div
      key={i}
      className={cn(
        "rounded-xl border border-white/[0.06] bg-[#111110] p-5 space-y-3",
        "overflow-hidden relative"
      )}
    >
      <div className="h-3 w-16 rounded bg-white/[0.06]" />
      <div className="h-8 w-24 rounded bg-white/[0.06]" />
      <div className="absolute inset-0 -translate-x-full animate-shimmer
        bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" />
    </div>
  ))}
</div>
```

### Thin Violet Progress Bar

Shown when analysis exceeds 2 seconds:

```tsx
<motion.div
  className="fixed top-0 left-0 h-0.5 bg-gradient-to-r from-violet-600 to-violet-400 z-50"
  initial={{ width: "0%" }}
  animate={{ width: "90%" }}
  transition={{ duration: 3, ease: "easeOut" }}
/>
```

On completion, snap to 100% and fade out:

```tsx
<motion.div
  className="fixed top-0 left-0 h-0.5 bg-gradient-to-r from-violet-600 to-violet-400 z-50"
  initial={{ width: "90%" }}
  animate={{ width: "100%", opacity: 0 }}
  transition={{ width: { duration: 0.3 }, opacity: { duration: 0.4, delay: 0.3 } }}
/>
```

### Staggered Reveal Animation

KPI cards and sections already use `staggerContainer(60)` + `staggerItem`. On dark, enhance
with opacity + vertical slide:

```tsx
const staggerItem = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
}
```

KPI number count-up (`useCountUp`) combined with the stagger creates a premium "data materializing"
effect that reads well on the dark surface.

---

## Action Buttons Row

All action buttons on the results page follow the glass-morphic secondary pattern:

```tsx
{/* Standard action button */}
<Button
  variant="ghost"
  className={cn(
    "gap-2 rounded-lg px-4 py-2 text-sm font-medium",
    "text-white/50 hover:text-[#F0EDE8] hover:bg-white/[0.06]",
    "transition-all duration-200"
  )}
>
  <Share2 size={14} />
  Share Deal
</Button>

{/* Primary action: Save Deal */}
<Button
  onClick={handleSave}
  disabled={saved}
  className={cn(
    "gap-2 rounded-lg px-4 py-2 text-sm font-semibold",
    "bg-violet-600 text-white",
    "hover:bg-violet-500 hover:shadow-[0_0_16px_rgba(139,122,255,0.20)]",
    "disabled:opacity-50 transition-all duration-300"
  )}
>
  <Save size={14} />
  {saved ? 'Saved' : 'Save Deal'}
</Button>

{/* Danger: Delete */}
<Button
  variant="ghost"
  className="gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200"
>
  <Trash2 size={14} />
  Delete
</Button>

{/* Pipeline button (confirmed state) */}
<button
  disabled
  className={cn(
    "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium",
    "border-violet-500/30 bg-violet-500/10 text-violet-400 cursor-default"
  )}
>
  <Check size={14} />
  In Pipeline
</button>
```

### Add to Pipeline Dropdown

```tsx
{/* Trigger */}
<button className={cn(
  "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium",
  "bg-violet-600 text-white hover:bg-violet-500",
  "transition-colors disabled:opacity-50"
)}>
  <PlusCircle size={14} />
  Add to Pipeline
  <ChevronDown size={14} />
</button>

{/* Dropdown menu */}
<div className={cn(
  "absolute bottom-full mb-1 right-0 z-50 min-w-[180px]",
  "rounded-lg border border-white/[0.08] bg-[#1A1918] py-1",
  "shadow-2xl backdrop-blur-xl"
)}>
  {PIPELINE_STAGES.map((s) => (
    <button className={cn(
      "flex w-full items-center px-3 py-2 text-sm text-white/60",
      "hover:bg-white/[0.06] hover:text-[#F0EDE8] transition-colors"
    )}>
      {s.label}
    </button>
  ))}
</div>
```

### Disclaimer Banner

```tsx
<div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3">
  <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
  <p className="text-xs text-white/50 leading-relaxed">
    This analysis is for informational purposes only...
  </p>
</div>
```

### Delete Confirmation Dialog

```tsx
<AlertDialogContent className="bg-[#1A1918] border-white/[0.08]">
  <AlertDialogTitle className="text-[#F0EDE8]">Delete this deal?</AlertDialogTitle>
  <AlertDialogDescription className="text-white/45">
    This will permanently delete {deal.address}. This cannot be undone.
  </AlertDialogDescription>
  <AlertDialogCancel className="bg-white/[0.06] border-white/[0.08] text-[#F0EDE8] hover:bg-white/[0.10]">
    Cancel
  </AlertDialogCancel>
  <AlertDialogAction className="bg-red-600 hover:bg-red-500 text-white">
    Delete
  </AlertDialogAction>
</AlertDialogContent>
```

---

## CRITICAL DECISIONS

1. **Ghost track at white/6, not a fixed gray.** The risk gauge background circle uses
   `rgba(255,255,255,0.06)` instead of a named color like `#1E1D1B`. This ensures the
   track adapts if the card surface shifts between `#111110` and `#141312`. The 6% opacity
   reads as "barely there" on any dark surface within the system.

2. **Three-stop sparkline/area gradients, not two-stop.** All chart gradient fills use a
   three-stop pattern (0% at 0.25-0.30, 50% at 0.08, 100% at 0). Two-stop gradients on
   dark create a harsh "band" edge. The midpoint at 50% with 0.08 opacity produces the
   Mercury-style "pool of light" effect that is the signature of luxury data visualization.

3. **Emerald-400 for positive, not sky/blue.** Risk gauge low-risk arc uses `#34D399`
   (emerald-400) instead of the current sky-500. On dark backgrounds, sky blue lacks
   semantic clarity -- emerald universally reads as "safe/good" in financial contexts.
   This change propagates to comparison winner text and recommendation badges.

4. **SVG glow filter on risk gauge arc.** The `<feGaussianBlur>` merged with `SourceGraphic`
   is the highest-impact single visual upgrade. Standard deviation scales with risk tier
   (4px for low/moderate, 5-6px for high/very-high) to create increasing visual urgency.
   This must be implemented as an SVG filter, not a CSS drop-shadow, because the arc
   is a partial stroke path and CSS shadows would apply to the bounding box.

5. **Solid grid lines, not dashed.** Cash flow chart grid uses `strokeDasharray="0"` with
   `#1E1D1B` at 0.6 opacity. Dashed grid lines that work on white backgrounds create
   visual noise on dark. Solid lines at extreme low contrast are calmer and match
   Mercury/Linear conventions.

6. **2% white zebra striping for output tables.** The alternating row tint uses
   `bg-white/[0.02]` -- nearly invisible. On dark, even 5% zebra striping creates
   prison-bar effects. The `border-b border-white/[0.04]` separators do the primary
   row-separation work; the background tint is secondary reinforcement only.

7. **Button hierarchy: violet solid > glass ghost > text only.** "Save Deal" and
   "Add to Pipeline" are the primary actions (solid violet). "Share", "Export", "Chat",
   "Offer Letter" are secondary (glass ghost with `bg-white/[0.06]`). "Delete" is
   destructive (`text-red-400` ghost). "Back to Analyzer" is navigation-only text.
   This three-tier system prevents the current problem where 8+ buttons compete equally.

8. **CTA glow is hover-only, not resting.** The `shadow-[0_0_20px_rgba(139,122,255,0.25)]`
   bloom appears only on hover, not at rest. A persistent glow on the Analyze button would
   fight with the risk gauge glow and card borders for attention. The hover activation
   creates a "powering up" micro-moment that signals intentionality.

9. **Shimmer at 3% white, not higher.** The traveling skeleton highlight uses
   `via-white/[0.03]` -- imperceptible as a distinct element but creates subconscious
   movement. Higher values (5%+) create a "scanning" flash that looks cheap. The 3%
   shimmer on `bg-white/[0.06]` placeholder bars is the Stripe/Linear standard.

10. **Form overlay is translucent dark, not opaque.** The pending-state overlay uses
    `bg-[#0C0B0A]/70 backdrop-blur-sm` instead of `bg-white/80`. The user can still
    perceive their entered data through the overlay, reducing disorientation. The blur
    adds a frosted-glass quality that signals "processing" without hiding the form.
