# Dashboard Design for Dark Luxury Interfaces

## 1. Mercury Dashboard Layout: Anatomy of Sparse Confidence

Mercury's dashboard succeeds because it answers one question immediately: "What is my balance?" Everything else is subordinate. On a dark luxury interface, this single-hero-metric philosophy becomes even more powerful -- a large number floating in near-black space carries gravitas that a busy grid of cards cannot.

**Mercury's layout hierarchy (top to bottom):**

```
┌──────────────────────────────────────────────────────────┐
│  Greeting / Account selector          [Send] [Transfer]  │  ← 48px header row
├──────────────────────────────────────────────────────────┤
│                                                          │
│        $1,247,832.41                                     │  ← Hero metric: 48-56px
│        Total balance                                     │  ← Sublabel: 13px muted
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  [1W] [1M] [3M] [6M] [1Y] [ALL]                  │   │  ← Time range tabs
│  │                                                    │   │
│  │     Full-width area chart, 200-240px tall          │   │  ← No gridlines, minimal
│  │     Gradient fill fades to transparent at bottom   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  Recent transactions                      [View all →]   │
│  ──────────────────────────────────────────────────────  │
│  Row: icon | merchant | category | amount (right)        │  ← 56px row height
│  Row: icon | merchant | category | amount (right)        │
│  Row: icon | merchant | category | amount (right)        │
└──────────────────────────────────────────────────────────┘
```

**Key dark-theme adaptations:**
- The hero number lives in empty space. On `#0C0B0A`, a `#F0EDE8` number at 48px font-weight-500 creates natural visual hierarchy without any card container. The number IS the container.
- Mercury uses 24-32px vertical padding above and below the hero metric. On dark, increase this to 32-40px. Space is the luxury signal.
- Quick actions are ghost buttons in the header row, not primary CTAs competing with the hero metric.

**Parcel adaptation:** Replace the 4-column KPI grid as the first visual element. Lead with a single hero metric (Total Portfolio Value or Total Equity) at 48px, then use the KPI row as a secondary tier below the chart.

---

## 2. KPI Card Design on Dark Backgrounds

### Number sizing and weight

The number is the reason the card exists. On dark backgrounds, number rendering changes significantly from light themes:

| Element | Dark treatment | Tailwind / CSS |
|---------|---------------|----------------|
| Value | 32-36px, font-weight 500 (not 700) | `text-[32px] font-medium tabular-nums` |
| Label | 11-12px, uppercase tracking, 50% opacity | `text-[11px] uppercase tracking-widest text-[#F0EDE8]/50` |
| Delta | 12px, icon + number, no background pill | `text-xs font-medium tabular-nums` |
| Card bg | 1-2 stops above page bg | `bg-[#141312]` on `#0C0B0A` page |
| Border | 1px at 6-8% white opacity | `border border-white/[0.06]` |

**Why font-weight 500, not 700:** On dark backgrounds, lighter text on dark surfaces creates more perceived contrast than it does on light backgrounds. A bold 700 weight number looks heavy and chunky. Medium 500 weight reads as confident and refined. Mercury, Linear, and Stripe all use 500-weight numbers on dark.

### Label treatment

Labels should sit ABOVE the number, not below. This follows the reading pattern: label tells you what you're about to read, then the number delivers the payload.

```tsx
<div className="space-y-1">
  <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#F0EDE8]/45">
    Total Equity
  </p>
  <p className="text-[32px] font-medium tabular-nums leading-none text-[#F0EDE8]">
    $847,200
  </p>
</div>
```

### Trend indicators

Avoid colored background pills for deltas on dark. A simple arrow character + number is cleaner:

```tsx
// Positive trend
<span className="text-xs font-medium tabular-nums text-emerald-400/90">
  ↑ 12.4%
</span>

// Negative trend
<span className="text-xs font-medium tabular-nums text-red-400/80">
  ↓ 3.2%
</span>
```

The emerald and red are desaturated slightly (using opacity) to prevent them from screaming on dark backgrounds. Pure `#10B981` is too vivid on `#0C0B0A` -- it creates an afterimage effect. `text-emerald-400/90` softens this.

### Sparklines on dark

Current implementation uses Recharts `AreaChart` with a linear gradient fill. On dark, the gradient must be more subtle:

```tsx
// Current (light theme): fillOpacity 0.08 → 0
// Dark theme: fillOpacity 0.12 → 0, with stroke at 60% opacity

const strokeColor = '#8B7AFF'  // Violet accent
const fillOpacity = 0.12

<defs>
  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stopColor={strokeColor} stopOpacity={fillOpacity} />
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
/>
```

Use the violet accent `#8B7AFF` as the default sparkline color for all KPI cards, unless the card specifically represents a positive/negative metric. This creates visual cohesion rather than a traffic-light effect.

---

## 3. Making Chart Areas Feel Premium on Dark

The trap is "white lines on black." Every amateur dark dashboard does this. Premium dark dashboards use these techniques instead:

### Gradient mesh backgrounds

The chart container itself gets a subtle radial gradient that gives depth:

```css
.chart-container {
  background: radial-gradient(
    ellipse 80% 60% at 50% 0%,
    rgba(139, 122, 255, 0.04) 0%,    /* violet tint at top */
    transparent 70%
  );
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
}
```

This creates an almost imperceptible "glow from above" that makes the chart area feel like it has ambient lighting.

### Grid and axis treatment

- **No visible gridlines.** If needed, use `stroke="#FFFFFF" strokeOpacity={0.04}` -- visible only when you look for them.
- **Axis labels:** `fill="#F0EDE8" fillOpacity={0.35}` at 11px. They guide without competing.
- **Axis lines:** Remove entirely. Use only bottom padding to separate chart from labels.

```tsx
<CartesianGrid strokeDasharray="3 3" stroke="#FFFFFF" strokeOpacity={0.04} />
<XAxis
  dataKey="month"
  tick={{ fill: '#F0EDE8', fillOpacity: 0.35, fontSize: 11 }}
  axisLine={false}
  tickLine={false}
/>
<YAxis hide />
```

### Area fill technique

Use a two-stop gradient with the accent color, plus a subtle glow line:

```tsx
<defs>
  <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stopColor="#8B7AFF" stopOpacity={0.15} />
    <stop offset="100%" stopColor="#8B7AFF" stopOpacity={0.01} />
  </linearGradient>
</defs>
<Area
  type="monotone"
  dataKey="value"
  stroke="#8B7AFF"
  strokeWidth={2}
  fill="url(#chartFill)"
  dot={false}
  activeDot={{
    r: 4,
    fill: '#8B7AFF',
    stroke: '#0C0B0A',
    strokeWidth: 2
  }}
/>
```

### Tooltip on dark

The default Recharts tooltip looks terrible on dark. Custom tooltip component:

```tsx
function DarkTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-white/[0.08] bg-[#1A1918]/95 backdrop-blur-sm px-3 py-2 shadow-xl">
      <p className="text-[10px] text-[#F0EDE8]/50 mb-0.5">{label}</p>
      <p className="text-sm font-medium tabular-nums text-[#F0EDE8]">
        ${payload[0].value?.toLocaleString()}
      </p>
    </div>
  )
}
```

---

## 4. Activity Feed on Dark

### Icon treatment

Activity icons need a translucent background container on dark. The pattern: icon color at 10-12% opacity for the background, icon color at 80% for the icon itself.

```tsx
const ACTIVITY_ICONS = {
  deal_analyzed:     { icon: Calculator,   color: '#8B7AFF' },  // Violet
  pipeline_moved:    { icon: ArrowRight,   color: '#F59E0B' },  // Amber
  document_analyzed: { icon: FileText,     color: '#38BDF8' },  // Sky
  deal_closed:       { icon: CheckCircle2, color: '#4ADE80' },  // Green
}

// Icon container
<div
  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
  style={{ backgroundColor: `${config.color}14` }}  // 8% opacity hex
>
  <Icon size={15} style={{ color: config.color, opacity: 0.85 }} />
</div>
```

The `14` hex suffix gives ~8% opacity. On `#0C0B0A`, this creates a barely-visible tinted square that adds color without creating a row of loud badges.

### Timestamp styling

Timestamps should be the lowest-contrast element in the row:

```tsx
<span className="text-[11px] tabular-nums text-[#F0EDE8]/30 shrink-0">
  {timeAgo(item.timestamp)}
</span>
```

At 30% opacity, timestamps are readable when focused on but never draw the eye first.

### Row spacing and hover states

```tsx
// Activity row
<div className="flex items-center gap-3 px-3 py-3 rounded-lg
  hover:bg-white/[0.03] transition-colors duration-150 cursor-default">
```

**Row height: 44-48px** (py-3 with the icon at 32px). Mercury uses 52-56px rows for transactions, but an activity feed is lower information density per row, so 44-48px works.

**Day separators** add premium structure:

```tsx
<div className="flex items-center gap-3 px-3 py-2">
  <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#F0EDE8]/25">
    Today
  </span>
  <div className="flex-1 h-px bg-white/[0.04]" />
</div>
```

---

## 5. Quick Actions on Dark

### Button hierarchy on dark surfaces

Three tiers of buttons for dashboard actions:

**Primary (CTA):** Solid violet with subtle glow.
```tsx
<button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg
  bg-[#8B7AFF] text-[#0C0B0A] text-sm font-medium
  hover:bg-[#9D8FFF] transition-colors
  shadow-[0_0_20px_rgba(139,122,255,0.15)]">
  <Plus size={16} />
  New Analysis
</button>
```

**Secondary (Ghost):** Transparent with border.
```tsx
<button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg
  border border-white/[0.08] text-[#F0EDE8]/70 text-sm font-medium
  hover:bg-white/[0.04] hover:text-[#F0EDE8] hover:border-white/[0.12]
  transition-all duration-150">
  <FileText size={16} />
  View Reports
</button>
```

**Tertiary (Text link):** No border, no background.
```tsx
<button className="text-sm font-medium text-[#8B7AFF]/80
  hover:text-[#8B7AFF] transition-colors">
  View all →
</button>
```

### Icon-button vs text-button decision

Use **icon-only buttons** (40x40px square) for repetitive actions in compact spaces (table row actions, card actions). Use **text buttons with leading icon** for dashboard-level actions where discoverability matters. New users need text. Power users learn icon positions.

```tsx
// Icon-only for compact contexts (table rows)
<button className="w-9 h-9 rounded-lg flex items-center justify-center
  text-[#F0EDE8]/40 hover:text-[#F0EDE8]/70 hover:bg-white/[0.04]
  transition-all duration-150">
  <MoreHorizontal size={16} />
</button>

// Text + icon for dashboard actions
<button className="inline-flex items-center gap-2 ...">
  <Calculator size={16} />
  Analyze Deal
</button>
```

---

## 6. Welcome / Greeting Section

### Time-based greeting

The greeting should feel personal without being saccharine. Mercury does not do greetings -- it goes straight to the balance. For a SaaS product with a less transactional relationship, a greeting works if it is brief.

```tsx
function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

// Render
<div className="space-y-1 mb-8">
  <h1 className="text-2xl font-medium text-[#F0EDE8]">
    {getGreeting()}, {firstName}
  </h1>
  <p className="text-sm text-[#F0EDE8]/40">
    Your portfolio at a glance
  </p>
</div>
```

The greeting is 24px (text-2xl), NOT the largest element. The hero metric below it should be 36-48px. The greeting is a warm entry point; the numbers are the payload.

### Portfolio snapshot inline

Below the greeting, a single-line portfolio snapshot replaces the need for a separate "summary" card:

```tsx
<p className="text-sm text-[#F0EDE8]/40">
  {totalDeals} deals &middot; ${totalEquity.toLocaleString()} equity &middot;
  ${monthlyCashFlow.toLocaleString()}/mo cash flow
</p>
```

This middot-separated summary line gives the user their bearings in one glance without occupying card real estate.

---

## 7. Empty States on Dark

Empty states on dark interfaces must fight two problems: darkness already feels empty, and placeholder text on dark can feel depressing rather than inviting.

### The anti-pattern

Gray text on dark bg that says "No deals yet. Get started by analyzing your first deal." -- this reads as a system error, not an invitation.

### The premium pattern

Use a centered composition with a subtle illustrated element (or geometric shape), a warm headline, and a single clear action:

```tsx
<div className="flex flex-col items-center justify-center py-20 max-w-md mx-auto text-center">
  {/* Ambient glow behind icon */}
  <div className="relative mb-6">
    <div className="absolute inset-0 w-16 h-16 rounded-full bg-[#8B7AFF]/10 blur-xl" />
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

Key techniques:
- The `blur-xl` glow behind the icon creates ambient warmth. On dark, this reads as "something is here."
- The headline is action-oriented ("Run your first analysis") not state-descriptive ("No deals yet").
- The subtext is 40% opacity, long enough to explain value but short enough to not feel like documentation.
- The CTA button has a subtle box-shadow glow that makes it feel like the natural focal point.

---

## 8. Dashboard Information Density

### Mercury's sparse philosophy

Mercury shows approximately 3-4 data elements per viewport-height on desktop. Their density calculation:
- Hero balance: 1 element, occupies ~15% of viewport
- Chart: 1 element, occupies ~35% of viewport
- Time range tabs: 1 element, ~5%
- Transaction rows (3-4 visible): 3-4 elements, ~40%

Total: ~6-7 discrete data points visible without scrolling. This is dramatically sparser than typical SaaS dashboards that cram 15-25 data points above the fold.

### Why sparse works on dark

Dark backgrounds amplify visual weight. A card that feels neutral on white feels heavy on black. When you place 12 cards on a dark dashboard, each card's border, shadow, and background all compete for attention. The result is cognitive overload disguised as information density.

**The formula for dark luxury density:**
- Maximum 4-6 data cards visible above the fold
- Minimum 24px gap between card groups (Tailwind `gap-6`)
- Section spacing of 40-48px between logical groups (`space-y-10` or `space-y-12`)
- Generous internal card padding: 20-24px (Tailwind `p-5` or `p-6`)

### Parcel's density budget

For Parcel's dashboard on dark, the recommended above-the-fold content:

```
Viewport (1440x900 desktop):
┌──────────────────────────────────────────────────────────┐
│ Sidebar (240px) │  Greeting + subtitle        [Actions]  │  ~64px
│                 │                                         │
│                 │  ┌─ Hero metric ──────────────────────┐ │  ~120px
│                 │  │ $847,200 total equity              │ │
│                 │  │ [chart area 180px]                  │ │
│                 │  └────────────────────────────────────┘ │
│                 │                                         │  ~24px gap
│                 │  ┌─KPI─┐ ┌─KPI─┐ ┌─KPI─┐ ┌─KPI─┐    │  ~100px
│                 │  │Deals│ │Cash │ │Cap  │ │Pipe │    │
│                 │  │  12 │ │Flow │ │Rate │ │line │    │
│                 │  └─────┘ └─────┘ └─────┘ └─────┘    │
│                 │                                         │  ~24px gap
│                 │  Recent Activity (2-3 rows visible)     │  ~remaining
└──────────────────────────────────────────────────────────┘
```

Total above-fold data points: 5-6 (hero + 4 KPIs + activity start). This is roughly Mercury's density.

---

## 9. Real-Time Data Feel: Subtle Animations

### Count-up animation (existing, keep it)

The current `useCountUp` hook is good. On dark, the animation becomes more noticeable because the eye is naturally drawn to the bright numbers. Keep duration at 800-1200ms with ease-out.

### Sparkline draw-on animation

Recharts `isAnimationActive` with `animationDuration={1200}` works, but the default easing is linear. Override to ease-out for a more natural "data arriving" feel:

```tsx
<Area
  animationDuration={1400}
  animationEasing="ease-out"
  animationBegin={200}  // Slight delay after card appears
/>
```

### Staggered entrance (existing, refine timing)

Current implementation uses `staggerChildren: 0.08` with `duration: 0.18`. On dark, animations are more visible. Slow slightly:

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

The cubic bezier `[0.25, 0.1, 0.25, 1.0]` is a custom ease-out that starts faster and settles slower than the default, creating a more premium feel.

### Pulse dot for live data

A small pulsing dot next to data that updates (like active pipeline count) signals liveness without requiring actual real-time websockets:

```tsx
<span className="relative flex h-2 w-2">
  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8B7AFF] opacity-30" />
  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#8B7AFF]/60" />
</span>
```

Use sparingly -- on one or two metrics at most, not on every card.

### Number transition on data change

When data refreshes (React Query refetch), numbers should crossfade rather than jump:

```tsx
<motion.span
  key={value}
  initial={{ opacity: 0, y: -4 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
  className="text-[32px] font-medium tabular-nums text-[#F0EDE8]"
>
  {formatValue(value, format)}
</motion.span>
```

The `key={value}` forces React to remount the element when value changes, triggering the enter animation.

---

## 10. Dashboard for Different User States

### New trial user (0 deals, day 1-2)

**Goal:** Get them to their first analysis as fast as possible.

Layout: Full empty state (Section 7 above). No KPI cards, no activity feed, no chart. Just the invitation to analyze. Below it, three feature hint cards (existing pattern) that show what else they can do.

Add a trial progress indicator -- subtle, not aggressive:

```tsx
<div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
  <div className="flex-1">
    <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
      <div className="h-full w-[14%] rounded-full bg-[#8B7AFF]/60" />
    </div>
  </div>
  <span className="text-[11px] tabular-nums text-[#F0EDE8]/30">
    6 days left in trial
  </span>
</div>
```

### Active user (3-15 deals, regular usage)

**Goal:** Surface actionable insights, not just metrics.

This is the standard dashboard layout: greeting, hero metric, KPI row, chart, recent deals table, activity feed. All sections populated. Quick actions visible in header.

Add one insight callout when data supports it:

```tsx
<div className="flex items-center gap-3 px-4 py-3 rounded-lg
  bg-[#8B7AFF]/[0.04] border border-[#8B7AFF]/[0.08]">
  <TrendingUp size={16} className="text-[#8B7AFF]/60 shrink-0" />
  <p className="text-sm text-[#F0EDE8]/60">
    Your BRRRR deals average 14.2% CoC return — 3.1% above your buy & hold portfolio.
  </p>
</div>
```

### Power user (50+ deals)

**Goal:** Dense overview with filtering, not just a wall of recent items.

Modifications for power users:
- Show portfolio breakdown by strategy (mini donut chart or horizontal stacked bar)
- Activity feed gets date-grouped sections and a "filter by type" toggle
- Recent deals table shows 8-10 rows instead of 5, with column sorting
- Add a "Portfolio Health" composite score as a secondary hero metric
- Quick actions move from header to a persistent action bar

The dashboard should detect deal count and conditionally render the power-user layout:

```tsx
const isPowerUser = (stats?.total_deals ?? 0) >= 20

// Render different section order for power users
{isPowerUser ? (
  <>
    <HeroMetricWithBreakdown />
    <KPIGridExtended />    {/* 6 cards instead of 4 */}
    <StrategyBreakdownChart />
    <RecentDealsExpanded />
    <ActivityFeedGrouped />
  </>
) : (
  <>
    <HeroMetric />
    <KPIGrid />
    <RecentDeals />
    <ActivityFeed />
  </>
)}
```

---

## RECOMMENDATIONS FOR PARCEL

1. **Lead with a single hero metric, not the KPI grid.** Replace the current 4-card KPI row as the first element. Show Total Portfolio Equity at 40-48px with a full-width 180px area chart below it, using the violet accent `#8B7AFF` with gradient fill at 15% opacity. The KPI row drops to second position with 4 secondary metrics (Cash Flow, Cap Rate, Active Pipeline, Closed Deals).

2. **Rework KPI card tokens for dark.** Card background `#141312` (not the page bg), border `border-white/[0.06]`, labels at 11px uppercase 45% opacity above the number, values at 32px font-weight-500. Switch all sparklines to violet accent instead of conditional red/green to create visual cohesion.

3. **Add a time-based greeting with inline portfolio snapshot.** "Good afternoon, Ivan" at 24px with a middot-separated subtitle showing deal count, equity, and monthly cash flow. This replaces the current static "Dashboard" page title and makes the experience feel personal.

4. **Redesign the activity feed with day separators and softer icon treatment.** Group activities by Today / Yesterday / Earlier. Use 8% opacity tinted backgrounds for icon containers (hex suffix `14`), timestamps at 30% opacity, and `hover:bg-white/[0.03]` row highlights. Row height 44-48px.

5. **Make chart areas premium with ambient glow.** Add a radial gradient (`rgba(139,122,255,0.04)`) to chart containers, remove visible gridlines (or drop to 4% opacity), hide Y-axis, and style axis labels at 35% opacity. Custom dark tooltip with `backdrop-blur-sm` and `bg-[#1A1918]/95`.

6. **Rewrite the empty state with warmth.** Center-aligned composition with a blurred violet glow behind the icon, action-oriented headline ("Run your first analysis" not "No deals yet"), and a single CTA button with a subtle `box-shadow` glow. Add the three feature hint cards below with `bg-white/[0.02]` backgrounds.

7. **Implement three button tiers for dark.** Primary: solid violet `bg-[#8B7AFF]` with dark text and ambient glow shadow. Secondary: ghost with `border-white/[0.08]` and text at 70% opacity. Tertiary: text-only in violet at 80% opacity. Apply consistently across all dashboard actions.

8. **Slow down and refine animations.** Increase stagger entrance duration to 0.35s with a custom ease curve `[0.25, 0.1, 0.25, 1.0]`. Add 200ms delay before sparkline draw-on starts. Use `key={value}` crossfade for number transitions on data refresh. Add a single pulsing dot on the Active Pipeline card to signal liveness.

9. **Reduce information density to match Mercury's sparse confidence.** Target 5-6 data points above the fold. Use 40-48px spacing between section groups (`space-y-10`). Card internal padding of 20-24px. Maximum 4 KPI cards in the secondary row. The dark background amplifies visual weight of every element, so less is more.

10. **Build adaptive layouts for user maturity.** New trial user: empty state + hint cards + trial progress bar. Active user (3-15 deals): standard dashboard with one insight callout. Power user (20+ deals): extended KPI grid (6 cards), strategy breakdown chart, date-grouped activity feed, and expanded deals table with sorting. Gate on `stats.total_deals` threshold.
