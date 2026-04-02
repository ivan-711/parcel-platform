# Agent 09 — Deal Analysis & Results Pages: Light Theme Redesign

Research document for redesigning Parcel's calculator input flow, results presentation,
risk scoring, cash flow projection, strategy comparison, and PDF export — migrated
from the current dark-only theme to a professional light financial analysis aesthetic.

---

## 1. Calculator Input Page Layout

### Current State
The flow is three pages: StrategySelectPage (card grid) -> AnalyzerFormPage (form) ->
ResultsPage (outputs). The form page uses a single-column layout with grouped fields,
dollar/percent adornments, ConceptTooltips, and a "Run Analysis" submit button.

### Proposed Light Theme Structure

```
+------------------------------------------------------------------+
| AppShell (white sidebar, light topbar)                           |
|                                                                  |
|  Breadcrumb: Dashboard > Analyzer > [Strategy]                   |
|                                                                  |
|  +------------------------------------------------------------+ |
|  | Strategy Selector (horizontal, sticky below topbar)         | |
|  +------------------------------------------------------------+ |
|                                                                  |
|  +--LEFT COL (60%)--+  +--RIGHT COL (40%)---------+            |
|  | Form Card         |  | Live Preview Card        |            |
|  | - Address field   |  | - KPI estimates (dimmed)  |            |
|  | - Grouped inputs  |  | - Mini risk indicator     |            |
|  | - Section dividers|  | - "Estimates update as    |            |
|  |                   |  |    you type" label         |            |
|  | [Run Analysis]    |  |                            |            |
|  +-------------------+  +----------------------------+            |
+------------------------------------------------------------------+
```

### Component Hierarchy
```
AnalyzerFormPage
  AppShell
    Breadcrumb
    StrategySelectorBar          (new — horizontal picker)
    div.grid.lg:grid-cols-5
      FormCard (lg:col-span-3)
        AddressField
        FieldSection[]           (grouped by category)
          FormField[]            (label + input + tooltip)
        RunAnalysisButton
      LivePreviewCard (lg:col-span-2, sticky)
        KPIPreview[]
        MiniRiskBadge
```

### Tailwind Specs — Form Card (Light)
```tsx
{/* Outer form card */}
<div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

  {/* Section header */}
  <h3 className="text-sm font-semibold text-slate-900 tracking-wide uppercase mb-4">
    Property Details
  </h3>

  {/* Individual field */}
  <div className="space-y-1.5">
    <Label className="text-sm font-medium text-slate-700">
      Purchase Price
      <ConceptTooltip content="..." />
    </Label>
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400
                       font-mono text-sm">$</span>
      <Input className="pl-7 bg-slate-50 border-slate-200 text-slate-900
                        font-mono focus:ring-2 focus:ring-indigo-500/20
                        focus:border-indigo-500 placeholder:text-slate-300" />
    </div>
  </div>
</div>
```

---

## 2. Strategy Selector UI

### Analysis: Tabs vs Cards vs Dropdown

| Approach     | Pros                                   | Cons                              | Best For          |
|-------------|----------------------------------------|-----------------------------------|-------------------|
| Tabs        | Compact, scannable, one-click switch   | Max ~5 before overflow            | Desktop primary   |
| Cards       | Rich descriptions, visual identity     | Takes vertical space              | First-time select |
| Dropdown    | Minimal space                          | Hides options, extra click        | Mobile fallback   |

### Recommendation: Segmented Tabs with Card Fallback

On the StrategySelectPage (first visit), keep the current card grid but lighten it.
On the AnalyzerFormPage (already chosen), use a segmented tab bar so the user can
switch strategies without going back. On mobile, collapse to a dropdown.

```tsx
{/* Desktop: segmented tabs */}
<div className="hidden sm:flex items-center gap-1 rounded-xl bg-slate-100 p-1">
  {STRATEGIES.map((s) => (
    <button
      key={s.strategy}
      className={cn(
        "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150",
        active === s.strategy
          ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
          : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
      )}
    >
      {s.name}
    </button>
  ))}
</div>

{/* Mobile: native select or sheet */}
<div className="sm:hidden">
  <Select value={strategy} onValueChange={setStrategy}>
    <SelectTrigger className="bg-white border-slate-200 text-slate-900">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {STRATEGIES.map((s) => (
        <SelectItem key={s.strategy} value={s.strategy}>
          {s.name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

### Strategy Card Light Variant (StrategySelectPage)
```tsx
<Link
  to={`/analyze/${s.strategy}`}
  className="group flex flex-col gap-3 rounded-2xl border border-slate-200
             bg-white p-6 shadow-sm hover:shadow-md hover:border-indigo-300
             transition-all duration-200"
>
  <StrategyBadge strategy={s.strategy} variant="light" />
  <span className="font-semibold text-slate-900">{s.name}</span>
  <span className="text-sm text-slate-500 leading-relaxed">{s.description}</span>
  <ArrowRight className="text-slate-300 group-hover:text-indigo-500
                         transition-colors mt-auto" size={16} />
</Link>
```

---

## 3. Results Page Layout

### Section Order (Top to Bottom)
1. Breadcrumb + Strategy badge + Address header
2. KPI summary row (4 cards)
3. AI Insights banner (new)
4. Two-column: Outputs table (left 60%) + Risk score (right 40%)
5. Cash flow projection (full width)
6. Action bar (sticky bottom on mobile, inline on desktop)
7. Disclaimer

### Proposed Light Layout

```
+------------------------------------------------------------------+
| Breadcrumb: Dashboard > Analyzer > BRRRR > Results               |
|                                                                  |
| [BRRRR badge]  123 Main Street, Austin TX                        |
|                                                                  |
| +----------+ +----------+ +----------+ +----------+              |
| | Cap Rate | | CoC Ret  | | Mo. CF   | | Equity   |              |
| | 8.2%     | | 14.5%    | | +$412    | | $38,000  |              |
| +----------+ +----------+ +----------+ +----------+              |
|                                                                  |
| +------------------------------------------------------------+  |
| | AI Insights: "Strong BRRRR candidate. Cash-on-cash..."     |  |
| +------------------------------------------------------------+  |
|                                                                  |
| +--Outputs Table (60%)--+  +--Risk Score (40%)-------+          |
| | Purchase Price  $120K  |  |      [Gauge: 32]        |          |
| | ARV             $185K  |  |       Low Risk           |          |
| | Rehab Budget    $25K   |  | Leverage .... 4/10       |          |
| | Loan Amount     $96K   |  | Cash Flow ... 2/10       |          |
| | ...                    |  | Market ...... 5/10       |          |
| +------------------------+  +---------------------------+         |
|                                                                  |
| +----Cash Flow Projection (full width)-------------------+       |
| | 12-month AreaChart (indigo monthly / emerald cumulative)|       |
| +--------------------------------------------------------+       |
|                                                                  |
| [Back] [Add to Pipeline v] [Share] [PDF] [Chat] [Offer] [Save]  |
|                                                                  |
| Disclaimer banner                                                |
+------------------------------------------------------------------+
```

### Component Hierarchy (Revised)
```
ResultsPage
  AppShell
    motion.div (stagger container, max-w-5xl mx-auto)
      Breadcrumb
      HeaderRow (StrategyBadge + address + quick actions)
      KPIRow (grid 2-col mobile, 4-col desktop)
        KPICard[] (4 strategy-specific)
      AIInsightsBanner (new component)
      TwoColumnSection (grid md:grid-cols-5)
        OutputsTable (md:col-span-3)
        RiskScorePanel (md:col-span-2)
          RiskGauge
          RiskFactorBreakdown (inline, not popover)
      CashFlowProjection (full width)
      ActionBar
      DisclaimerBanner
```

---

## 4. Risk Score Display

### Current State
The RiskGauge is an SVG circle with animated arc, score number in center, and a
color-coded label pill. Risk factor breakdown is hidden behind a HelpCircle popover.

### Light Theme Redesign

Display risk factors inline instead of in a popover. The gauge becomes the hero,
with the factor breakdown as a vertical bar list beside it.

```tsx
{/* Risk Score Panel — light */}
<div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
  <h3 className="text-sm font-semibold text-slate-900 mb-6">Risk Assessment</h3>

  <div className="flex items-start gap-6">
    {/* Gauge */}
    <div className="flex-shrink-0">
      <RiskGauge score={riskScore} variant="light" />
    </div>

    {/* Factor breakdown */}
    <div className="flex-1 space-y-3">
      {Object.entries(riskFactors).map(([key, value]) => (
        <div key={key} className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">{formatLabel(key)}</span>
            <span className="font-mono text-sm text-slate-900">
              {value}/10
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700",
                value <= 3 ? "bg-emerald-500" :
                value <= 6 ? "bg-amber-500" : "bg-red-500"
              )}
              style={{ width: `${(value / 10) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  </div>
</div>
```

### RiskGauge Light Variant
```tsx
{/* Background circle — light gray instead of dark navy */}
<circle cx={90} cy={90} r={RADIUS} fill="none" stroke="#E2E8F0" strokeWidth={12} />

{/* Center score text — dark instead of light */}
<text style={{ fill: '#0F172A', fontSize: '36px', fontWeight: 700 }}>
  {Math.round(score)}
</text>

{/* Label pill */}
<span className={cn(
  "px-3 py-1 rounded-full text-xs font-semibold",
  score <= 30 && "bg-emerald-50 text-emerald-700",
  score <= 60 && "bg-amber-50 text-amber-700",
  score <= 80 && "bg-red-50 text-red-700",
  score > 80 && "bg-red-100 text-red-800",
)}>
  {label}
</span>
```

---

## 5. Cash Flow Projection

### Current State
A Recharts AreaChart with indigo (monthly) and emerald (cumulative) areas, dark
background tooltip, hardcoded dark colors for grid/axes.

### Light Theme: Chart + Table Hybrid

Add a toggleable table view below the chart. The chart stays as the primary visual
but the table provides exact numbers for due diligence.

```tsx
{/* Cash Flow section — light */}
<div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
  {/* Header with toggle */}
  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
    <h3 className="text-sm font-semibold text-slate-900">
      12-Month Cash Flow Projection
    </h3>
    <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5">
      <button className={cn(
        "px-3 py-1 text-xs font-medium rounded-md transition-colors",
        view === 'chart'
          ? "bg-white text-slate-900 shadow-sm"
          : "text-slate-500 hover:text-slate-700"
      )}>Chart</button>
      <button className={cn(
        "px-3 py-1 text-xs font-medium rounded-md transition-colors",
        view === 'table'
          ? "bg-white text-slate-900 shadow-sm"
          : "text-slate-500 hover:text-slate-700"
      )}>Table</button>
    </div>
  </div>

  {/* Chart view */}
  {view === 'chart' && (
    <div className="px-6 py-4">
      <div className="h-[300px]">
        <ResponsiveContainer>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis
              tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'JetBrains Mono' }}
              axisLine={{ stroke: '#E2E8F0' }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'JetBrains Mono' }}
              axisLine={false}
            />
            <Area dataKey="monthlyCashFlow" stroke="#6366F1" fill="url(#lightGradient)" />
            <Area dataKey="cumulativeCashFlow" stroke="#10B981" fill="none" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )}

  {/* Table view */}
  {view === 'table' && (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50">
            <th className="px-4 py-2 text-left font-medium text-slate-600">Month</th>
            <th className="px-4 py-2 text-right font-medium text-slate-600">Cash Flow</th>
            <th className="px-4 py-2 text-right font-medium text-slate-600">Cumulative</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
              <td className="px-4 py-2 text-slate-700">{row.month}</td>
              <td className={cn(
                "px-4 py-2 text-right font-mono",
                row.monthlyCashFlow >= 0 ? "text-emerald-600" : "text-red-600"
              )}>
                {formatCurrency(row.monthlyCashFlow)}
              </td>
              <td className={cn(
                "px-4 py-2 text-right font-mono",
                row.cumulativeCashFlow >= 0 ? "text-emerald-600" : "text-red-600"
              )}>
                {formatCurrency(row.cumulativeCashFlow)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}
</div>
```

### Tooltip (Light)
```tsx
<div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-lg">
  <p className="text-xs font-medium text-slate-500 mb-2">{label}</p>
  {payload.map((entry) => (
    <div key={entry.dataKey} className="flex items-center gap-2 mb-1">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
      <span className="text-xs text-slate-500">{entry.dataKey === 'monthlyCashFlow' ? 'Monthly' : 'Cumulative'}:</span>
      <span className={cn(
        "font-mono text-sm font-medium",
        entry.value >= 0 ? "text-slate-900" : "text-red-600"
      )}>
        {formatTooltipCurrency(entry.value)}
      </span>
    </div>
  ))}
</div>
```

---

## 6. Side-by-Side Strategy Comparison

### Current State
ComparePage uses a table layout with a ComparisonRadar chart. The radar normalizes
6 dimensions (Return, Cash Flow, Risk, Equity, Cap Rate, Deal Score) to 0-100.

### Light Theme Comparison Layout

```
+------------------------------------------------------------------+
| Compare Deals (2-5 selected)                                     |
|                                                                  |
| +---Winner Banner (conditional, top)----------------------+      |
| | "123 Main St scores highest across 4 of 6 dimensions"  |      |
| +----------------------------------------------------------+     |
|                                                                  |
| +--Radar Chart (centered, 400px)--+  +--Legend----------+        |
| |  [Spider chart overlays]        |  | * 123 Main St    |        |
| |                                 |  | * 456 Oak Ave    |        |
| +---------------------------------+  +------------------+        |
|                                                                  |
| +--Comparison Table (full width, scrollable)---------------+     |
| | Metric         | 123 Main St | 456 Oak Ave | ...        |     |
| | Cap Rate       | 8.2%        | 6.1%        |            |     |
| | CoC Return     | 14.5%       | 11.2%       |            |     |
| | Monthly CF     | +$412       | +$280       |            |     |
| | Risk Score     | 32          | 58          |            |     |
| | ...            |             |             |            |     |
| +------------------------------------------------------+        |
+------------------------------------------------------------------+
```

### Radar Chart Light Colors
```tsx
const LIGHT_DEAL_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

<PolarGrid stroke="#E2E8F0" strokeOpacity={0.8} />
<PolarAngleAxis tick={{ fill: '#475569', fontSize: 12 }} />
<PolarRadiusAxis tick={{ fill: '#94A3B8', fontSize: 10 }} />
```

### Winner Cell Highlighting (Light)
```tsx
{/* Best-in-row highlight */}
<td className={cn(
  "px-4 py-3 font-mono text-sm text-right",
  isBest && "bg-emerald-50 text-emerald-700 font-semibold",
  !isBest && "text-slate-700"
)}>
  {formattedValue}
</td>
```

---

## 7. PDF Report Button Placement and Preview

### Current Placement
The "Download Report" button sits in a crowded action bar at the bottom of ResultsPage
alongside 7 other actions (Back, Add to Pipeline, Share, PDF, Delete, Chat, Offer, Save).

### Proposed Placement

Move PDF and Share to the header row. Keep pipeline/save as primary CTAs in the footer.

```
+------------------------------------------------------------------+
| [BRRRR]  123 Main Street            [Share] [PDF] [Offer Letter] |
+------------------------------------------------------------------+
```

```tsx
{/* Header row with promoted actions */}
<div className="flex items-center justify-between">
  <div className="flex items-center gap-3">
    <StrategyBadge strategy={deal.strategy} variant="light" />
    <h2 className="text-lg font-semibold text-slate-900">{deal.address}</h2>
  </div>
  <div className="flex items-center gap-2">
    <Button variant="outline" size="sm" onClick={handleShare}
            className="border-slate-200 text-slate-600 hover:bg-slate-50 gap-2">
      <Share2 size={14} /> Share
    </Button>
    <Button variant="outline" size="sm" onClick={handleDownloadReport}
            disabled={generatingPDF}
            className="border-slate-200 text-slate-600 hover:bg-slate-50 gap-2">
      <FileDown size={14} /> {generatingPDF ? 'Generating...' : 'PDF Report'}
    </Button>
  </div>
</div>
```

### PDF Preview (Future Enhancement)
A modal preview before download reduces wasted exports. Component outline:

```
PDFPreviewModal
  Dialog (shadcn)
    DialogContent (max-w-4xl)
      iframe or canvas rendering jsPDF output
      Footer: [Cancel] [Download PDF]
```

---

## 8. "Run Analysis" Button

### States
1. **Default**: Indigo fill, full width at bottom of form
2. **Hover**: Darker indigo, subtle lift shadow
3. **Loading**: Spinner + "Analyzing..." text, disabled
4. **Success**: Green flash, checkmark icon, auto-navigates to results

```tsx
{/* Run Analysis — light theme */}
<Button
  type="submit"
  disabled={isSubmitting}
  className={cn(
    "w-full h-12 text-base font-semibold rounded-xl transition-all duration-200",
    isSuccess
      ? "bg-emerald-500 hover:bg-emerald-500 text-white"
      : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow-md"
  )}
>
  {isSubmitting ? (
    <span className="flex items-center gap-2">
      <Loader2 className="animate-spin" size={18} />
      Analyzing...
    </span>
  ) : isSuccess ? (
    <span className="flex items-center gap-2">
      <Check size={18} />
      Analysis Complete
    </span>
  ) : (
    <span className="flex items-center gap-2">
      <Calculator size={18} />
      Run Analysis
    </span>
  )}
</Button>
```

### Success Animation Sequence
```
1. Button turns emerald-500 (150ms ease)
2. Checkmark icon scales in (framer spring)
3. 600ms pause for user feedback
4. navigate(`/results/${dealId}`) with page transition
```

---

## 9. Results Responsiveness: Tables to Cards on Mobile

### Breakpoint Strategy
- **>= md (768px)**: Full table layout, two-column outputs + risk
- **< md**: Stack everything, outputs become card list, risk gauge above factors

### Outputs Table Mobile Transform
```tsx
{/* Desktop: table rows */}
<div className="hidden md:block">
  {outputEntries.map(([key, value], i) => (
    <div className={cn(
      "flex items-center justify-between px-4 py-2.5",
      i % 2 === 0 ? "bg-white" : "bg-slate-50/50"
    )}>
      <span className="text-sm text-slate-600">{formatLabel(key)}</span>
      <span className="font-mono text-sm text-slate-900">{formatOutputValue(key, value)}</span>
    </div>
  ))}
</div>

{/* Mobile: compact cards */}
<div className="md:hidden grid grid-cols-2 gap-2 p-3">
  {outputEntries.map(([key, value]) => (
    <div key={key} className="rounded-lg bg-slate-50 p-3 space-y-0.5">
      <p className="text-[11px] text-slate-500 uppercase tracking-wider">
        {formatLabel(key)}
      </p>
      <p className="font-mono text-sm font-medium text-slate-900">
        {formatOutputValue(key, value)}
      </p>
    </div>
  ))}
</div>
```

### Action Bar Mobile (Sticky Bottom)
```tsx
{/* Mobile: sticky bottom action bar */}
<div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200
                bg-white/95 backdrop-blur-sm px-4 py-3 md:hidden">
  <div className="flex items-center gap-2">
    <Button variant="outline" size="sm" className="flex-1" onClick={handleSave}>
      <Save size={14} /> Save
    </Button>
    <Button size="sm" className="flex-1 bg-indigo-600 text-white" onClick={() => setStageMenuOpen(true)}>
      <PlusCircle size={14} /> Pipeline
    </Button>
  </div>
</div>
{/* Spacer to prevent content from hiding behind fixed bar */}
<div className="h-16 md:hidden" />
```

---

## 10. AI Insights Alongside Calculator Results

### Placement
Between the KPI row and the outputs table. A distinct visual treatment separates it
from raw calculator data. The insight comes from the existing AI chat endpoint,
triggered automatically after analysis completes.

```tsx
{/* AI Insights Banner */}
<div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5">
  <div className="flex items-start gap-3">
    <div className="flex-shrink-0 flex items-center justify-center w-8 h-8
                    rounded-lg bg-indigo-100">
      <Sparkles size={16} className="text-indigo-600" />
    </div>
    <div className="flex-1 space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-slate-900">AI Analysis</h3>
        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium
                         bg-indigo-100 text-indigo-600 uppercase tracking-wider">
          Beta
        </span>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed">
        {aiInsight ?? "Generating insight..."}
      </p>
      <button className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
        Chat about this deal
      </button>
    </div>
  </div>
</div>
```

### Loading State
```tsx
{/* Skeleton while AI generates */}
<div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
  <div className="flex items-start gap-3">
    <div className="w-8 h-8 rounded-lg bg-slate-200 animate-pulse" />
    <div className="flex-1 space-y-2">
      <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
      <div className="h-3 w-full bg-slate-200 rounded animate-pulse" />
      <div className="h-3 w-3/4 bg-slate-200 rounded animate-pulse" />
    </div>
  </div>
</div>
```

---

## 11. Print-Friendly Layout Considerations

### CSS Print Rules
```css
@media print {
  /* Hide interactive chrome */
  nav, .sidebar, .topbar, .action-bar, .sticky-bottom,
  button:not(.print-visible), .tooltip, .popover {
    display: none !important;
  }

  /* Force light backgrounds */
  body, .app-shell-content {
    background: white !important;
    color: #1e1e1e !important;
  }

  /* Prevent chart cutoff */
  .cash-flow-section {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  /* Force table view for cash flow */
  .chart-toggle [data-view="chart"] { display: none; }
  .chart-toggle [data-view="table"] { display: block; }

  /* KPI cards: remove shadows, thin borders */
  .kpi-card {
    box-shadow: none !important;
    border: 1px solid #d1d5db !important;
  }

  /* Risk gauge: ensure SVG prints */
  .risk-gauge svg {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }

  /* Page margins */
  @page {
    margin: 0.75in;
    size: letter portrait;
  }
}
```

### Print Button
Add a print icon next to PDF download. Uses `window.print()` with the above CSS.
Cost: zero — no server round-trip, leverages the already-rendered light theme page.

---

## Light Theme Token Map (Summary)

| Current Dark Token        | Light Replacement           | Tailwind Class            |
|--------------------------|-----------------------------|---------------------------|
| `#08080F` (app-bg)      | `#F8FAFC` (slate-50)       | `bg-slate-50`             |
| `#0F0F1A` (app-surface) | `#FFFFFF` (white)           | `bg-white`                |
| `#16162A` (app-elevated)| `#F1F5F9` (slate-100)       | `bg-slate-100`            |
| `#1A1A2E` (border-subtle)| `#E2E8F0` (slate-200)      | `border-slate-200`        |
| `#252540` (border-default)| `#CBD5E1` (slate-300)      | `border-slate-300`        |
| `#F1F5F9` (text-primary)| `#0F172A` (slate-900)       | `text-slate-900`          |
| `#94A3B8` (text-secondary)| `#64748B` (slate-500)      | `text-slate-500`          |
| `#475569` (text-muted)  | `#94A3B8` (slate-400)       | `text-slate-400`          |
| `#6366F1` (accent)      | `#6366F1` (unchanged)       | `text-indigo-500`         |
| `#10B981` (success)     | `#059669` (emerald-600)     | `text-emerald-600`        |
| `#EF4444` (danger)      | `#DC2626` (red-600)         | `text-red-600`            |
| `#F59E0B` (warning)     | `#D97706` (amber-600)       | `text-amber-600`          |

---

## RECOMMENDATIONS FOR PARCEL

1. **Strategy selector as segmented tabs on the form page.** The current card grid works
   for first-time strategy selection but is wasteful on the form page. A horizontal
   segmented control (5 items) lets users switch strategies without navigating away. Use
   a dropdown on mobile.

2. **Inline risk factor breakdown, not a popover.** The risk score panel has room for
   progress bars beside the gauge. Hiding factors behind a HelpCircle icon reduces
   the perceived depth of the analysis. Show them by default in the two-column layout.

3. **Chart + table toggle for cash flow.** Investors doing due diligence want exact
   monthly numbers, not just a visual trend. A table view (toggleable) adds credibility
   with zero performance cost since the data is already computed.

4. **Promote PDF and Share to the header row.** The current 8-button action bar is
   overwhelming. Move export actions (PDF, Share, Offer Letter) to the header; keep
   pipeline and save as the primary footer CTAs. On mobile, use a sticky bottom bar
   with only the two most important actions.

5. **Add an AI Insights banner between KPIs and outputs.** This is the single most
   differentiating feature versus spreadsheet-based analysis. Display it prominently
   with a distinct indigo-tinted card. Load asynchronously so it never blocks the
   calculator results.

6. **Print-friendly CSS for the light theme.** A light theme is inherently print-ready.
   Add a `@media print` stylesheet that hides chrome, forces the table view for cash
   flow, and avoids page breaks inside sections. Add a print button alongside PDF.

7. **Mobile-first action bar.** Fixed bottom bar with Save + Pipeline as the two primary
   actions. Secondary actions (Share, PDF, Chat, Delete) go into a "More" overflow menu
   triggered by an ellipsis icon.

8. **Success animation on Run Analysis.** The button should transition from indigo to
   emerald with a checkmark before navigating to results. This 600ms pause gives the
   user confidence that the calculation completed successfully.

9. **Live preview on the form page.** A sticky right column that shows estimated KPIs as
   the user fills in fields (debounced, client-side-only rough estimates). This reduces
   form abandonment by showing value before the user commits to running the full analysis.

10. **Comparison winner banner.** When comparing deals, display a clear "winner" callout
    at the top of the comparison page identifying which deal scores best across the most
    dimensions. Highlight winning cells with emerald-50 backgrounds.
