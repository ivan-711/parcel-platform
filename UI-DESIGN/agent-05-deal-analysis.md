# Deal Analysis & Results Pages — Light Theme Design Spec

Implementation-ready design for Parcel's two-page deal analysis flow: the Calculator Input Page (strategy selection + form) and the Results Page (score banner, KPIs, breakdown, cash flow, risk, actions). Every class, every animation value, every responsive breakpoint is final.

---

## 1. Input Page: Strategy Selector + Form

### Page Structure

The analysis flow is two conceptual steps on one route: select a strategy, then fill in the form. The StrategySelectPage (`/analyze`) shows the card grid. The AnalyzerFormPage (`/analyze/:strategy`) shows the segmented tab bar pinned at the top so users can switch strategies without navigating back.

```
+------------------------------------------------------------------+
| AppShell (white sidebar, slate-50 content area)                  |
|                                                                  |
|  Breadcrumb: Dashboard > Analyzer > [Strategy Name]              |
|                                                                  |
|  +-- Strategy Tabs (sticky, bg-white border-b) ---------------+ |
|  | [Wholesale] [Buy & Hold] [Flip] [BRRRR] [Creative Finance] | |
|  +-------------------------------------------------------------+ |
|                                                                  |
|  +-- Form Card (60%) -------+ +-- Live Preview (40%) --------+  |
|  | Property Details          | | Est. Cap Rate    --          |  |
|  |   [Address ............] | | Est. CoC Return  --          |  |
|  |   [Zip Code]             | | Est. Monthly CF  --          |  |
|  |                           | |                              |  |
|  | Purchase & Financing      | | "Estimates update as you     |  |
|  |   [$Price] [$Down Pmt]   | |  fill in fields"             |  |
|  |   [Rate %] [Term]        | |                              |  |
|  |                           | | [Mini Risk Badge: --]        |  |
|  | Income                    | +------------------------------+  |
|  |   [$Monthly Rent]        |                                    |
|  |                           |                                   |
|  | Expenses                  |                                   |
|  |   [$Taxes] [$Insurance]  |                                   |
|  |   [Vacancy %] [Maint %]  |                                   |
|  |   [Mgmt %]               |                                   |
|  |                           |                                   |
|  | [====== Analyze Deal =====]                                   |
|  +-------------------------------+                               |
+------------------------------------------------------------------+
```

### Component Hierarchy

```
AnalyzerFormPage
  AppShell
    motion.div (max-w-5xl mx-auto)
      Breadcrumb
      StrategySelectorTabs          <-- new: horizontal segmented bar
      div.grid.lg:grid-cols-5.gap-8
        FormCard (lg:col-span-3)
          FormSection "Property Details"
            AddressField (col-span-2)
            ZipCodeField (w-28)
          FormSection "Purchase & Financing"
            CurrencyField[] / PercentField[]
          FormSection "Income"
            CurrencyField[]
          FormSection "Expenses"
            CurrencyField[] / PercentField[]
          AnalyzeButton
        LivePreviewCard (lg:col-span-2, sticky top-24)
          KPIPreview[] (dimmed, mono)
          MiniRiskBadge
```

---

## 2. Strategy Selector Tabs

### Desktop: Segmented Control

Five strategies fit cleanly in a segmented bar. The active tab is a white pill with a subtle shadow, floating over a `gray-100` trough. Inactive tabs are muted text with hover lift.

```tsx
{/* Desktop: segmented tabs — sticky below topbar */}
<div className="sticky top-16 z-30 -mx-6 px-6 py-3 bg-white/95 backdrop-blur-sm
                border-b border-gray-200">
  <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1 max-w-fit">
    {STRATEGIES.map((s) => (
      <Link
        key={s.strategy}
        to={`/analyze/${s.strategy}`}
        className={cn(
          "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40",
          active === s.strategy
            ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-900/5"
            : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
        )}
      >
        {s.name}
      </Link>
    ))}
  </div>
</div>
```

### Mobile: Native Select Dropdown

On screens < 640px, collapse the five tabs into a shadcn Select. A dropdown avoids horizontal overflow and meets touch target requirements.

```tsx
{/* Mobile: dropdown selector */}
<div className="sm:hidden sticky top-16 z-30 -mx-4 px-4 py-3 bg-white/95
                backdrop-blur-sm border-b border-gray-200">
  <Select value={strategy} onValueChange={(v) => navigate(`/analyze/${v}`)}>
    <SelectTrigger className="h-11 bg-white border-gray-200 text-gray-900 font-medium">
      <SelectValue placeholder="Select strategy" />
    </SelectTrigger>
    <SelectContent className="bg-white border-gray-200 shadow-lg">
      {STRATEGIES.map((s) => (
        <SelectItem
          key={s.strategy}
          value={s.strategy}
          className="focus:bg-indigo-50 focus:text-indigo-900"
        >
          {s.name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

### Behavior

- Switching strategies preserves shared field values (purchase_price, address) via form state.
- Strategy-specific fields (e.g., rehab_budget for BRRRR, arv for Flip) appear/disappear with a 150ms height transition.
- The URL updates immediately: `/analyze/brrrr` -> `/analyze/buy_and_hold`.
- The tab bar is sticky (`top-16` = below 64px topbar) so it remains accessible while scrolling long forms.

---

## 3. Form Layout & Field Design

### Form Card Container

The form sits inside a white card on the `bg-page` (gray-50) content area. Generous padding, barely-visible shadow for depth.

```tsx
<div className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8 shadow-sm">
  <h2 className="text-xl font-semibold text-gray-900 mb-6">
    {strategyDisplayName} Analyzer
  </h2>
  {/* sections */}
</div>
```

### Section Headings

Each logical group (Property Details, Financing, Income, Expenses) gets an uppercase micro-label. No `<hr>` dividers needed; vertical spacing creates separation.

```tsx
<div className="pt-6 first:pt-0">
  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
    Purchase & Financing
  </h3>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
    {/* fields */}
  </div>
</div>
```

### Two-Column Grid: Desktop vs Mobile

- **Desktop (>= 768px):** `grid md:grid-cols-2 gap-x-8 gap-y-5` -- two fields per row.
- **Mobile (< 768px):** `grid-cols-1` -- single column, full width.
- **Full-width fields:** Address spans `md:col-span-2`. Zip code is `w-28` (112px).

### Currency Field ($)

```tsx
<div className="space-y-1.5">
  <Label htmlFor="purchase_price" className="text-sm font-medium text-gray-700">
    Purchase Price
    <ConceptTooltip content="The total acquisition cost..." />
  </Label>
  <div className="relative">
    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2
                     text-sm font-mono text-gray-400">
      $
    </span>
    <Input
      id="purchase_price"
      type="text"
      inputMode="decimal"
      placeholder="250,000"
      className="h-11 pl-7 bg-white border-gray-200 text-gray-900 font-mono tabular-nums
                 text-[15px] rounded-lg
                 focus-visible:border-indigo-500 focus-visible:ring-2
                 focus-visible:ring-indigo-500/20 focus-visible:ring-offset-0
                 placeholder:text-gray-300"
    />
  </div>
</div>
```

### Percent Field (%)

```tsx
<div className="space-y-1.5">
  <Label htmlFor="vacancy_rate" className="text-sm font-medium text-gray-700">
    Vacancy Rate
  </Label>
  <p className="text-xs text-gray-500 -mt-0.5 mb-1.5">Typical: 5-10% for residential</p>
  <div className="relative max-w-[160px]">
    <Input
      id="vacancy_rate"
      type="text"
      inputMode="decimal"
      placeholder="8"
      className="h-11 pr-8 bg-white border-gray-200 text-gray-900 font-mono tabular-nums
                 text-[15px] rounded-lg
                 focus-visible:border-indigo-500 focus-visible:ring-2
                 focus-visible:ring-indigo-500/20 focus-visible:ring-offset-0
                 placeholder:text-gray-300"
    />
    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2
                     text-sm font-mono text-gray-400">
      %
    </span>
  </div>
</div>
```

### Key Input Rules

| Rule | Implementation |
|------|---------------|
| `type="text"` + `inputMode="decimal"` | Numeric keyboard on mobile, no scroll-to-change, no spinners, enables comma formatting |
| `tabular-nums` on all financial inputs | Digits align vertically across stacked fields |
| `pointer-events-none` on adornments | Clicking $ or % correctly focuses the input |
| `text-[15px]` | Avoids iOS auto-zoom (triggered below 16px) while staying compact |
| `h-11` (44px) | Meets Apple/Google minimum touch target |
| Comma formatting on dollar fields | Display `250,000`, store raw number `250000` via Controller |
| No comma formatting on percent fields | `7.5` is fine as-is |

### Error State

Red border + ring, with `role="alert"` for screen reader announcement.

```tsx
{/* Error input */}
<Input className="... border-red-500 ring-2 ring-red-500/15" />

{/* Error message below field */}
<p id="purchase_price-error" role="alert"
   className="text-[13px] text-red-600 mt-1 flex items-center gap-1">
  <AlertCircle className="h-3 w-3 shrink-0" />
  Purchase price is required
</p>
```

### Strategy-Specific Field Groups

| Strategy | Property Details | Purchase & Financing | Income | Expenses | Strategy-Specific |
|----------|-----------------|---------------------|--------|----------|-------------------|
| **Wholesale** | Address, Zip | Purchase Price, ARV | -- | Rehab Budget | Assignment Fee, Wholesale Fee |
| **Buy & Hold** | Address, Zip | Purchase Price, Down Payment, Interest Rate, Loan Term (15/30 toggle) | Monthly Rent | Taxes, Insurance, Vacancy, Maintenance, Management Fee | -- |
| **Flip** | Address, Zip | Purchase Price, ARV, Rehab Budget | -- | Holding Months, Holding Costs | Selling Costs % |
| **BRRRR** | Address, Zip | Purchase Price, ARV, Rehab Budget, Down Payment, Interest Rate, Loan Term, Refinance LTV | Monthly Rent | Taxes, Insurance, Vacancy, Maintenance, Management Fee | -- |
| **Creative Finance** | Address, Zip | Purchase Price, Down Payment, Interest Rate, Loan Term | Monthly Rent | Taxes, Insurance, Vacancy, Maintenance, Management Fee | Finance Type (Subject To / Seller Finance segmented control), Balloon Payment, Existing Mortgage Balance |

---

## 4. "Analyze Deal" Button

### Position

Full-width at the bottom of the form card. On mobile (< 768px), it becomes sticky at the bottom of the viewport so the user never has to scroll down to submit.

### Four States

```tsx
<Button
  type="submit"
  disabled={isSubmitting}
  className={cn(
    "w-full h-12 text-base font-semibold rounded-xl transition-all duration-200",
    "focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:ring-offset-2",
    isSuccess
      ? "bg-success-600 hover:bg-success-600 text-white"
      : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow-md"
  )}
>
  {isSubmitting ? (
    <span className="flex items-center justify-center gap-2">
      <Loader2 className="animate-spin" size={18} />
      Analyzing...
    </span>
  ) : isSuccess ? (
    <span className="flex items-center justify-center gap-2">
      <Check size={18} />
      Analysis Complete
    </span>
  ) : (
    <span className="flex items-center justify-center gap-2">
      <Calculator size={18} />
      Analyze Deal
    </span>
  )}
</Button>
```

| State | Background | Text | Icon | Interaction |
|-------|-----------|------|------|-------------|
| **Default** | `bg-indigo-600` | White, "Analyze Deal" | `Calculator` | Clickable |
| **Hover** | `bg-indigo-700` + `shadow-md` | White | `Calculator` | Cursor pointer |
| **Loading** | `bg-indigo-600` (disabled) | White, "Analyzing..." | `Loader2 animate-spin` | Disabled, no pointer |
| **Success** | `bg-success-600` | White, "Analysis Complete" | `Check` (spring scale-in) | Auto-navigates after 600ms |

### Success Animation Sequence

```
1. Backend returns deal → mutation.onSuccess fires
2. Button bg transitions indigo → success-600 (150ms ease-out)
3. Check icon scales in via Framer spring: { type: "spring", stiffness: 500, damping: 25 }
4. 600ms pause (setTimeout)
5. navigate(`/results/${deal.id}`) fires with page exit animation
```

### Mobile Sticky Submit

On forms with 8+ fields, the submit button scrolls out of view. On mobile, pin it.

```tsx
<div className="sticky bottom-0 bg-white/90 backdrop-blur-sm border-t border-gray-200
                p-4 -mx-6 mt-6 md:relative md:bg-transparent md:border-0 md:p-0 md:mx-0
                md:mt-8">
  <AnalyzeButton isSubmitting={isSubmitting} isSuccess={isSuccess} />
</div>
```

---

## 5. Results Page: Section Order & Layout

### Section Flow (Top to Bottom)

```
1. Breadcrumb
2. Header row: StrategyBadge + Address + [Share] [PDF] [Offer Letter]
3. Deal Score banner (circular score + label + one-line summary)
4. KPI grid (4 cards, 2-col mobile / 4-col desktop)
5. AI Insights banner (indigo-tinted, async loaded)
6. Two-column: Outputs table (60%) + Risk score panel (40%)
7. Cash flow projection (full width, chart + table toggle)
8. Action bar: [Back] [Add to Pipeline v] [Chat] [Save] [Delete]
9. Disclaimer
```

### Full Layout Diagram

```
+--------------------------------------------------------------------+
| Dashboard > Analyzer > BRRRR > Results                              |
|                                                                     |
| [BRRRR]  123 Main Street, Austin TX    [Share] [PDF] [Offer Letter] |
|                                                                     |
| +--- Deal Score Banner (full width) ---------------------------+    |
| |  [Circular: 78]  Strong Deal  |  "Solid BRRRR candidate..." |    |
| +--------------------------------------------------------------+    |
|                                                                     |
| +----------+ +----------+ +----------+ +----------+                 |
| | Cap Rate | | CoC Ret  | | Mo. CF   | | Equity   |                |
| | 8.2%     | | 14.5%    | | +$412    | | $38,000  |                |
| +----------+ +----------+ +----------+ +----------+                 |
|                                                                     |
| +--- AI Insights (indigo tint) --------------------------------+    |
| | [Sparkles]  AI Analysis  [Beta]                              |    |
| | "Strong BRRRR candidate. Cash-on-cash return of 14.5%..."   |    |
| | [Chat about this deal ->]                                    |    |
| +--------------------------------------------------------------+    |
|                                                                     |
| +-- Outputs Table (60%) ---+ +-- Risk Score Panel (40%) -------+   |
| | Purchase Price   $120,000 | |      [Gauge: 32/100]           |   |
| | ARV              $185,000 | |       Low Risk                  |   |
| | Rehab Budget     $25,000  | |                                 |   |
| | Loan Amount      $96,000  | | Leverage ========-- 4/10       |   |
| | Monthly Rent     $1,400   | | Cash Flow =====----- 2/10      |   |
| | ...                       | | Market   ==========- 5/10      |   |
| +---------------------------+ | Vacancy  =======----- 3/10      |   |
|                               | Condition ======---- 4/10      |   |
|                               +---------------------------------+   |
|                                                                     |
| +--- Cash Flow Projection (full width) -----------------------+    |
| | [Chart | Table] toggle                                       |    |
| | 12-month AreaChart: indigo (monthly) + emerald (cumulative)  |    |
| +--------------------------------------------------------------+    |
|                                                                     |
| [<- Back]  [+ Add to Pipeline v]  [Chat]  [Save Deal]  [Delete]   |
|                                                                     |
| [!] Disclaimer: This analysis is for informational purposes...     |
+--------------------------------------------------------------------+
```

### Component Hierarchy

```
ResultsPage
  AppShell
    motion.div (stagger container, max-w-5xl mx-auto, space-y-6)
      Breadcrumb                            (motion variants={staggerItem})
      HeaderRow                             (motion variants={staggerItem})
        StrategyBadge + address (left)
        Share + PDF + Offer Letter (right)
      DealScoreBanner                       (motion variants={staggerItem})
        CircularScore (SVG, animated)
        Label pill (Strong/Moderate/Weak)
        One-line AI summary
      KPIRow                                (motion variants={staggerItem})
        grid 2-col mobile / 4-col desktop
        KPICard[] (4 strategy-specific, count-up animation)
      AIInsightsBanner                      (motion variants={staggerItem})
        Sparkles icon + "AI Analysis" + Beta badge
        Insight text (async, skeleton while loading)
        "Chat about this deal" link
      TwoColumnSection                      (motion variants={staggerItem})
        grid md:grid-cols-5 gap-6
        OutputsTable (md:col-span-3)
        RiskScorePanel (md:col-span-2)
          RiskGauge (SVG circle)
          RiskFactorBreakdown (inline progress bars)
      CashFlowProjection                    (motion variants={staggerItem})
        Chart/Table toggle
        Recharts AreaChart or HTML table
      ActionBar                             (motion variants={slideUp})
        Desktop: flex row, right-aligned
        Mobile: fixed bottom bar (Save + Pipeline)
      DisclaimerBanner                      (motion variants={staggerItem})
```

---

## 6. Header Row with Promoted Actions

Move PDF, Share, and Offer Letter out of the crowded bottom action bar and into the header. This reduces the bottom bar to 4 items (Back, Pipeline, Chat, Save/Delete).

```tsx
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
  {/* Left: badge + address */}
  <div className="flex items-center gap-3 min-w-0">
    <StrategyBadge strategy={deal.strategy as Strategy} />
    <h2 className="text-lg font-semibold text-gray-900 truncate">
      {deal.address || 'Untitled Deal'}
    </h2>
  </div>

  {/* Right: export actions */}
  <div className="flex items-center gap-2 shrink-0">
    <Button
      variant="outline" size="sm" onClick={handleShare}
      disabled={sharing || copied}
      className="border-gray-200 text-gray-600 hover:bg-gray-50 gap-2
                 focus-visible:ring-2 focus-visible:ring-indigo-500/40"
    >
      <Share2 size={14} />
      <span className="hidden sm:inline">
        {copied ? 'Copied!' : sharing ? 'Sharing...' : 'Share'}
      </span>
    </Button>
    <Button
      variant="outline" size="sm" onClick={handleDownloadReport}
      disabled={generatingPDF}
      className="border-gray-200 text-gray-600 hover:bg-gray-50 gap-2
                 focus-visible:ring-2 focus-visible:ring-indigo-500/40"
    >
      <FileDown size={14} />
      <span className="hidden sm:inline">
        {generatingPDF ? 'Generating...' : 'PDF Report'}
      </span>
    </Button>
    <Button
      variant="outline" size="sm" onClick={() => setOfferLetterOpen(true)}
      className="border-gray-200 text-gray-600 hover:bg-gray-50 gap-2
                 focus-visible:ring-2 focus-visible:ring-indigo-500/40"
    >
      <FileText size={14} />
      <span className="hidden sm:inline">Offer Letter</span>
    </Button>
  </div>
</div>
```

On mobile (< 640px), the button labels collapse to icon-only via `hidden sm:inline` on the text spans. The row wraps to two lines: badge+address on top, icon buttons below.

---

## 7. Deal Score Banner

A new top-level visual that gives an instant read on the deal's quality. Appears between the header and KPI grid. Combines the overall deal score (already computed by calculators) with a one-line summary.

```tsx
<div className="flex items-center gap-6 rounded-2xl border border-gray-200 bg-white p-6
                shadow-sm">
  {/* Circular Score */}
  <div className="flex-shrink-0">
    <svg width={80} height={80} viewBox="0 0 80 80">
      {/* Background track */}
      <circle cx={40} cy={40} r={34} fill="none" stroke="#EAECF0" strokeWidth={6} />
      {/* Colored arc — dasharray animated on mount */}
      <motion.circle
        cx={40} cy={40} r={34} fill="none"
        stroke={scoreColor}  // indigo / success / warning / danger
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference}
        animate={{ strokeDashoffset: circumference - (score / 100) * circumference }}
        transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
        transform="rotate(-90 40 40)"
      />
      {/* Score number */}
      <text x={40} y={40} textAnchor="middle" dominantBaseline="central"
            className="fill-gray-900 text-2xl font-bold font-mono">
        {Math.round(score)}
      </text>
    </svg>
  </div>

  {/* Label + summary */}
  <div className="flex-1 min-w-0">
    <div className="flex items-center gap-2 mb-1">
      <span className={cn(
        "px-2.5 py-0.5 rounded-full text-xs font-semibold",
        score >= 75 && "bg-success-50 text-success-700",
        score >= 50 && score < 75 && "bg-indigo-50 text-indigo-700",
        score >= 25 && score < 50 && "bg-warning-50 text-warning-700",
        score < 25 && "bg-danger-50 text-danger-700",
      )}>
        {score >= 75 ? 'Strong Deal' : score >= 50 ? 'Moderate' : score >= 25 ? 'Below Average' : 'High Risk'}
      </span>
    </div>
    <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
      {deal.ai_summary ?? `This ${strategyName} deal scores ${Math.round(score)} out of 100 based on returns, cash flow, and risk factors.`}
    </p>
  </div>
</div>
```

### Score Color Mapping

| Range | Color Variable | Tailwind |
|-------|---------------|----------|
| 75-100 | `success-600` | `stroke: #059669` |
| 50-74 | `indigo-500` | `stroke: #6366F1` |
| 25-49 | `warning-600` | `stroke: #D97706` |
| 0-24 | `danger-600` | `stroke: #DC2626` |

---

## 8. KPI Grid

Four strategy-specific KPIs in a responsive grid. Each card uses the existing `KPICard` component, migrated to light tokens. Financial numbers in JetBrains Mono with count-up animation.

```tsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
  {kpis.map((kpi) => renderKPI(kpi))}
</div>
```

### KPI Card — Light Theme

```tsx
{/* Single KPI card */}
<div className="rounded-xl border border-gray-200 bg-white p-5 space-y-1.5 shadow-sm">
  <p className="text-xs font-medium text-gray-500 uppercase tracking-[0.08em]">
    {kpi.label}
  </p>
  <p className={cn(
    "text-2xl md:text-3xl font-semibold font-mono tabular-nums",
    kpi.isColorCoded && numValue >= 0 && "text-success-700",
    kpi.isColorCoded && numValue < 0 && "text-danger-600",
    !kpi.isColorCoded && "text-gray-900"
  )}>
    {formatted}
  </p>
</div>
```

### Count-Up Animation

Uses the existing `useCountUp` hook. The hook animates from 0 to the final value over 800ms with `easeOutExpo` easing. Triggered when the KPI row enters the viewport via `IntersectionObserver`.

```tsx
const { value: displayValue } = useCountUp({
  end: numValue,
  duration: 800,
  format: kpi.format, // 'currency' | 'percent' | 'number'
})
```

### Strategy-Specific KPI Configurations

| Strategy | KPI 1 | KPI 2 | KPI 3 | KPI 4 |
|----------|-------|-------|-------|-------|
| **Wholesale** | Assignment Fee ($) | Wholesale Spread ($) | ROI (%) | Recommendation (badge) |
| **Buy & Hold** | Cap Rate (%) | Cash-on-Cash (%) | Monthly Cash Flow (+/-) | DSCR (decimal) |
| **Flip** | Net Profit ($, +/-) | ROI (%) | Profit/Month ($) | Recommendation (badge) |
| **BRRRR** | Cash-on-Cash (%, infinite OK) | Monthly Cash Flow (+/-) | Total Equity ($) | Cap Rate (%) |
| **Creative Finance** | Monthly Cash Flow (+/-) | Cash-on-Cash (%) | DSCR (decimal) | Recommendation (badge) |

---

## 9. AI Insights Banner

Positioned between KPIs and the outputs/risk two-column section. Loads asynchronously after the calculator results render, so it never blocks the core data. Uses a distinct indigo tint to separate it from raw calculator output.

### Loaded State

```tsx
<div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5">
  <div className="flex items-start gap-3">
    <div className="flex-shrink-0 flex items-center justify-center w-8 h-8
                    rounded-lg bg-indigo-100">
      <Sparkles size={16} className="text-indigo-600" />
    </div>
    <div className="flex-1 space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-gray-900">AI Analysis</h3>
        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium
                         bg-indigo-100 text-indigo-600 uppercase tracking-wider">
          Beta
        </span>
      </div>
      <p className="text-sm text-gray-600 leading-relaxed">
        {aiInsight}
      </p>
      <button
        onClick={() => navigate(`/chat?dealId=${deal.id}`)}
        className="text-xs text-indigo-600 hover:text-indigo-700 font-medium
                   focus-visible:outline-none focus-visible:underline"
      >
        Chat about this deal &rarr;
      </button>
    </div>
  </div>
</div>
```

### Skeleton (Loading) State

```tsx
<div className="rounded-2xl border border-gray-100 bg-gray-50 p-5 animate-pulse">
  <div className="flex items-start gap-3">
    <div className="w-8 h-8 rounded-lg bg-gray-200" />
    <div className="flex-1 space-y-2.5">
      <div className="h-4 w-24 bg-gray-200 rounded" />
      <div className="h-3 w-full bg-gray-200 rounded" />
      <div className="h-3 w-3/4 bg-gray-200 rounded" />
    </div>
  </div>
</div>
```

---

## 10. Two-Column Section: Outputs Table + Risk Score

### Grid

```tsx
<div className="grid md:grid-cols-5 gap-6">
  <OutputsTable className="md:col-span-3" outputs={outputEntries} />
  <RiskScorePanel className="md:col-span-2" score={riskScore} factors={deal.risk_factors} />
</div>
```

On mobile (< 768px), both stack full-width. Risk panel renders below the outputs table.

### Outputs Table — Desktop

Alternating row backgrounds for scannability. Labels left-aligned, values right-aligned in mono.

```tsx
<div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
  <div className="px-5 py-3.5 border-b border-gray-100">
    <h3 className="text-sm font-semibold text-gray-900">All Outputs</h3>
  </div>

  {/* Desktop: row list */}
  <div className="hidden md:block divide-y divide-gray-100">
    {outputEntries.map(([key, value], i) => (
      <div
        key={key}
        className={cn(
          "flex items-center justify-between px-5 py-2.5",
          i % 2 === 0 ? "bg-white" : "bg-gray-50/50"
        )}
      >
        <span className="text-sm text-gray-600">{formatLabel(key)}</span>
        {key === 'recommendation' && typeof value === 'string' ? (
          <span className={cn(
            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
            getRecommendationColor(value)
          )}>
            {value}
          </span>
        ) : (
          <span className="font-mono text-sm text-gray-900 tabular-nums">
            {formatOutputValue(key, value)}
          </span>
        )}
      </div>
    ))}
  </div>

  {/* Mobile: compact 2-col card grid */}
  <div className="md:hidden grid grid-cols-2 gap-2 p-3">
    {outputEntries.map(([key, value]) => (
      <div key={key} className="rounded-lg bg-gray-50 p-3 space-y-0.5">
        <p className="text-[11px] text-gray-500 uppercase tracking-wider">
          {formatLabel(key)}
        </p>
        <p className="font-mono text-sm font-medium text-gray-900 tabular-nums">
          {formatOutputValue(key, value)}
        </p>
      </div>
    ))}
  </div>
</div>
```

---

## 11. Risk Score Display

### Design Change: Inline Factor Breakdown

The current implementation hides risk factors behind a `HelpCircle` popover. For the light theme, show the gauge and factors side by side within the same card. No extra click needed.

### Risk Score Panel

```tsx
<div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
  <h3 className="text-sm font-semibold text-gray-900 mb-6">Risk Assessment</h3>

  <div className="flex flex-col items-center gap-6">
    {/* Gauge (centered) */}
    <div className="flex-shrink-0">
      <RiskGauge score={riskScore} variant="light" />
    </div>

    {/* Factor breakdown (full width below gauge) */}
    {deal.risk_factors && Object.keys(deal.risk_factors).length > 0 && (
      <div className="w-full space-y-3">
        {Object.entries(deal.risk_factors).map(([key, value]) => {
          const numVal = typeof value === 'number' ? value : 0
          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{formatLabel(key)}</span>
                <span className="font-mono text-sm text-gray-900 tabular-nums">
                  {numVal}/10
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <motion.div
                  className={cn(
                    "h-full rounded-full",
                    numVal <= 3 && "bg-success-500",
                    numVal > 3 && numVal <= 6 && "bg-warning-500",
                    numVal > 6 && "bg-danger-500",
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${(numVal / 10) * 100}%` }}
                  transition={{ duration: 0.7, ease: "easeOut", delay: 0.5 }}
                />
              </div>
            </div>
          )
        })}
      </div>
    )}
  </div>
</div>
```

### RiskGauge SVG — Light Variant

```tsx
{/* Background circle — light gray track */}
<circle cx={90} cy={90} r={RADIUS} fill="none" stroke="#EAECF0" strokeWidth={12} />

{/* Animated arc — color-coded by score */}
<motion.circle
  cx={90} cy={90} r={RADIUS} fill="none"
  stroke={gaugeColor}
  strokeWidth={12}
  strokeLinecap="round"
  strokeDasharray={CIRCUMFERENCE}
  initial={{ strokeDashoffset: CIRCUMFERENCE }}
  animate={{ strokeDashoffset: CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE }}
  transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
  transform="rotate(-90 90 90)"
/>

{/* Center score text — dark on white */}
<text x={90} y={90} textAnchor="middle" dominantBaseline="central"
      style={{ fill: '#101828', fontSize: '36px', fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
  {Math.round(score)}
</text>

{/* Label pill */}
<span className={cn(
  "mt-3 px-3 py-1 rounded-full text-xs font-semibold",
  score <= 30 && "bg-success-50 text-success-700",
  score > 30 && score <= 60 && "bg-warning-50 text-warning-700",
  score > 60 && score <= 80 && "bg-danger-50 text-danger-700",
  score > 80 && "bg-danger-100 text-danger-800",
)}>
  {score <= 30 ? 'Low Risk' : score <= 60 ? 'Moderate Risk' : score <= 80 ? 'High Risk' : 'Very High Risk'}
</span>
```

### Risk Factor Color Logic

| Factor Score | Color | Meaning |
|-------------|-------|---------|
| 0-3 | `success-500` (#10B981) | Low risk in this dimension |
| 4-6 | `warning-500` (#F59E0B) | Moderate concern |
| 7-10 | `danger-500` (#EF4444) | High risk factor |

---

## 12. Cash Flow Projection

### Chart + Table Toggle

The chart is the default view. A segmented toggle in the section header switches to a tabular view showing exact monthly numbers for due diligence. Both views use the same underlying data array.

```tsx
<div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
  {/* Header with toggle */}
  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
    <h3 className="text-sm font-semibold text-gray-900">
      12-Month Cash Flow Projection
    </h3>
    <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-0.5">
      <button
        onClick={() => setView('chart')}
        className={cn(
          "px-3 py-1 text-xs font-medium rounded-md transition-colors duration-150",
          view === 'chart'
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        )}
      >
        Chart
      </button>
      <button
        onClick={() => setView('table')}
        className={cn(
          "px-3 py-1 text-xs font-medium rounded-md transition-colors duration-150",
          view === 'table'
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        )}
      >
        Table
      </button>
    </div>
  </div>

  {/* Chart view */}
  <AnimatePresence mode="wait">
    {view === 'chart' && (
      <motion.div
        key="chart"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="px-6 py-4"
      >
        <div className="h-[300px]">
          <ResponsiveContainer>
            <AreaChart data={cashFlowData}>
              <defs>
                <linearGradient id="monthlyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366F1" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#EAECF0" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: '#667085', fontFamily: 'JetBrains Mono' }}
                axisLine={{ stroke: '#EAECF0' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#667085', fontFamily: 'JetBrains Mono' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CashFlowTooltip />} />
              <Area
                type="monotone"
                dataKey="monthlyCashFlow"
                stroke="#6366F1"
                strokeWidth={2}
                fill="url(#monthlyGradient)"
              />
              <Area
                type="monotone"
                dataKey="cumulativeCashFlow"
                stroke="#059669"
                strokeWidth={2}
                fill="none"
                strokeDasharray="4 4"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-6 mt-3 px-2">
          <div className="flex items-center gap-2">
            <span className="h-0.5 w-4 bg-indigo-500 rounded" />
            <span className="text-xs text-gray-500">Monthly Cash Flow</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-0.5 w-4 bg-success-600 rounded border-dashed" />
            <span className="text-xs text-gray-500">Cumulative</span>
          </div>
        </div>
      </motion.div>
    )}

    {/* Table view */}
    {view === 'table' && (
      <motion.div
        key="table"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="overflow-x-auto"
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-5 py-2.5 text-left font-medium text-gray-600">Month</th>
              <th className="px-5 py-2.5 text-right font-medium text-gray-600">Cash Flow</th>
              <th className="px-5 py-2.5 text-right font-medium text-gray-600">Cumulative</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cashFlowData.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                <td className="px-5 py-2.5 text-gray-700 font-medium">{row.month}</td>
                <td className={cn(
                  "px-5 py-2.5 text-right font-mono tabular-nums",
                  row.monthlyCashFlow >= 0 ? "text-success-700" : "text-danger-600"
                )}>
                  {formatCurrency(row.monthlyCashFlow)}
                </td>
                <td className={cn(
                  "px-5 py-2.5 text-right font-mono tabular-nums",
                  row.cumulativeCashFlow >= 0 ? "text-success-700" : "text-danger-600"
                )}>
                  {formatCurrency(row.cumulativeCashFlow)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    )}
  </AnimatePresence>
</div>
```

### Cash Flow Table: Green/Red Color Coding

| Value | Text Color | Rationale |
|-------|-----------|-----------|
| >= 0 | `text-success-700` (#047857) | Positive cash flow = good (WCAG AA on white: 5.45:1) |
| < 0 | `text-danger-600` (#DC2626) | Negative cash flow = needs attention (WCAG AA: 4.63:1) |

### Custom Tooltip — Light

```tsx
function CashFlowTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-lg">
      <p className="text-xs font-medium text-gray-500 mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 mb-1">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs text-gray-500">
            {entry.dataKey === 'monthlyCashFlow' ? 'Monthly' : 'Cumulative'}:
          </span>
          <span className={cn(
            "font-mono text-sm font-medium tabular-nums",
            (entry.value ?? 0) >= 0 ? "text-gray-900" : "text-danger-600"
          )}>
            {formatCurrency(entry.value ?? 0)}
          </span>
        </div>
      ))}
    </div>
  )
}
```

---

## 13. Strategy Comparison (Pro Feature)

### Access Control

Free users see up to 2 deals compared with a paywall overlay blocking columns 3-5. Pro users get unlimited comparison slots (up to 5).

### Layout

```
+--------------------------------------------------------------------+
| Compare Deals                                     [Add Deal +]      |
|                                                                     |
| +--- Winner Banner (conditional) ---------------------------------+|
| | [Trophy]  "123 Main St scores highest across 4 of 6 dimensions" ||
| +----------------------------------------------------------------+||
|                                                                     |
| +-- Radar Chart (centered, 400x300) ---+  +--- Legend ----------+  |
| |  Overlapping spider polygons         |  | * Deal A (indigo)   |  |
| |  6 axes: Return, Cash Flow, Risk,   |  | * Deal B (emerald)  |  |
| |  Equity, Cap Rate, Deal Score        |  | * Deal C (amber)    |  |
| +--------------------------------------+  +---------------------+  |
|                                                                     |
| +--- Comparison Table (full width, horizontal scroll) -----------+ |
| | Metric            | 123 Main St | 456 Oak Ave | 789 Elm Dr    | |
| | Strategy          | BRRRR       | Buy & Hold  | Flip          | |
| | Cap Rate          | *8.2%*      | 6.1%        | --            | |
| | Cash-on-Cash      | *14.5%*     | 11.2%       | --            | |
| | Monthly CF        | *+$412*     | +$280       | --            | |
| | Net Profit        | --          | --          | *$32,400*     | |
| | Risk Score        | *32*        | 58          | 44            | |
| | Deal Score        | *78*        | 61          | 69            | |
| +----------------------------------------------------------------+ |
|                                                                     |
| [Free overlay: "Upgrade to Pro to compare 3+ deals"]              |
+--------------------------------------------------------------------+
```

### Winner Cell Highlighting

The best value in each metric row gets an emerald background tint.

```tsx
<td className={cn(
  "px-5 py-3 font-mono text-sm text-right tabular-nums",
  isBest && "bg-success-50 text-success-700 font-semibold",
  !isBest && "text-gray-700"
)}>
  {formattedValue}
</td>
```

### Winner Banner

```tsx
{winnerDeal && (
  <div className="flex items-center gap-3 rounded-xl border border-success-200
                  bg-success-50 px-5 py-3">
    <Trophy size={18} className="text-success-600 shrink-0" />
    <p className="text-sm text-success-800">
      <span className="font-semibold">{winnerDeal.address}</span>
      {' '}scores highest across {winCount} of 6 dimensions
    </p>
  </div>
)}
```

### Radar Chart Colors (Light)

```tsx
const COMPARISON_COLORS = ['#6366F1', '#059669', '#D97706', '#DC2626', '#7C3AED']

<PolarGrid stroke="#EAECF0" />
<PolarAngleAxis tick={{ fill: '#475467', fontSize: 12, fontWeight: 500 }} />
<PolarRadiusAxis tick={{ fill: '#98A2B3', fontSize: 10 }} axisLine={false} />
```

---

## 14. PDF Export & Paywall

### PDF Export Button

Located in the header row (section 6). Calls the existing `generateDealReport()` from `@/lib/pdf-report.ts`.

### Loading State

```tsx
{generatingPDF ? (
  <span className="flex items-center gap-2">
    <Loader2 className="animate-spin" size={14} />
    <span className="hidden sm:inline">Generating...</span>
  </span>
) : (
  <span className="flex items-center gap-2">
    <FileDown size={14} />
    <span className="hidden sm:inline">PDF Report</span>
  </span>
)}
```

### Free User Paywall Overlay

Free users can view results but cannot export PDF or compare more than 2 deals. A blurred overlay with an upgrade prompt appears over the blocked feature.

```tsx
{/* Paywall overlay — wraps any Pro-gated section */}
<div className="relative">
  {/* Actual content rendered but blurred */}
  <div className={cn(!isPro && "blur-sm pointer-events-none select-none")}>
    {children}
  </div>

  {/* Overlay CTA */}
  {!isPro && (
    <div className="absolute inset-0 flex items-center justify-center
                    bg-white/60 backdrop-blur-[2px] rounded-2xl">
      <div className="text-center space-y-3 max-w-xs">
        <div className="mx-auto w-10 h-10 rounded-full bg-indigo-50
                        flex items-center justify-center">
          <Lock size={18} className="text-indigo-600" />
        </div>
        <p className="text-sm font-semibold text-gray-900">Pro Feature</p>
        <p className="text-xs text-gray-500">
          Upgrade to export PDF reports and compare unlimited deals.
        </p>
        <Button
          size="sm"
          onClick={() => navigate('/settings/billing')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          Upgrade to Pro
        </Button>
      </div>
    </div>
  )}
</div>
```

### Gated Features by Plan

| Feature | Free | Pro |
|---------|------|-----|
| Run analysis | Yes | Yes |
| View results | Yes | Yes |
| Save deal | Yes | Yes |
| Add to pipeline | Yes | Yes |
| PDF export | No (paywall) | Yes |
| Compare deals | 2 max | Up to 5 |
| AI Insights | Summary only | Full analysis + chat |
| Offer letter | No | Yes |

---

## 15. Framer Motion: Stagger Entrance & Count-Up

### Page-Level Stagger Container

The entire Results page content is wrapped in a stagger container. Each major section fades and slides up in sequence.

```tsx
// motion.ts — existing pattern
export const staggerContainer = (staggerMs: number = 60) => ({
  hidden: {},
  visible: {
    transition: {
      staggerChildren: staggerMs / 1000,
    },
  },
})

export const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}
```

### Animation Sequence (Results Page)

```
t=0ms     Breadcrumb fades in
t=60ms    Header row (badge + address + buttons) slides up
t=120ms   Deal Score banner slides up, arc animates (1s ease-out)
t=180ms   KPI grid slides up, count-up animations start (800ms)
t=240ms   AI Insights banner slides up (skeleton if still loading)
t=300ms   Two-column section slides up (outputs + risk)
t=500ms   Risk gauge arc animates (1.2s ease-out, delay 0.3s)
t=500ms   Risk factor progress bars animate (0.7s each, delay 0.5s)
t=360ms   Cash flow projection slides up, chart draws
t=420ms   Action bar slides up from below (slideUp variant)
t=480ms   Disclaimer fades in
```

### Count-Up Numbers in KPI Cards

```tsx
// Already implemented in useCountUp.ts
// Key params:
const count = useCountUp({
  end: 14.5,          // final value
  duration: 800,      // ms
  decimals: 1,        // for percentages
  prefix: '',         // '$' for currency
  suffix: '%',        // or '' for currency
})
```

### Action Bar Slide-Up (Distinct from Stagger)

```tsx
export const slideUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}
```

### Page Exit Animation

When navigating away from Results (e.g., back to Analyzer), the page fades out over 150ms. Handled by the global `AnimatePresence` in App.tsx.

```tsx
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  transition={{ duration: 0.15 }}
>
  {/* page content */}
</motion.div>
```

---

## 16. Action Bar (Reduced)

With export actions promoted to the header, the bottom action bar is simplified.

### Desktop: Inline Row

```tsx
<div className="flex items-center gap-2 justify-end flex-wrap">
  {/* Back */}
  <Button variant="ghost" asChild className="text-gray-500 hover:text-gray-700">
    <Link to="/analyze" className="gap-2">
      <ArrowLeft size={14} /> Back
    </Link>
  </Button>

  {/* Spacer */}
  <div className="flex-1" />

  {/* Add to Pipeline (primary action) */}
  <PipelineDropdown
    added={addedToPipeline}
    onSelect={handleAddToPipeline}
    isPending={addToPipeline.isPending}
  />

  {/* Chat */}
  <Button variant="outline" onClick={() => navigate(`/chat?dealId=${deal.id}`)}
          className="gap-2 border-gray-200 text-gray-600 hover:bg-gray-50">
    <MessageSquare size={14} /> Chat
  </Button>

  {/* Save */}
  <Button onClick={handleSave} disabled={saved || updateDeal.isPending}
          className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
    {saved ? <><Check size={14} /> Saved</> : <><Save size={14} /> Save Deal</>}
  </Button>

  {/* Delete (danger, ghost) */}
  <DeleteDealDialog onConfirm={() => deleteDeal.mutate()} isPending={deleteDeal.isPending} />
</div>
```

### Mobile: Sticky Bottom Bar

On mobile, only the two most critical actions appear. Everything else goes behind a "More" menu.

```tsx
{/* Mobile: fixed bottom action bar */}
<div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200
                bg-white/95 backdrop-blur-sm px-4 py-3 md:hidden
                safe-area-inset-bottom">
  <div className="flex items-center gap-2">
    <Button
      variant="outline" size="sm" className="flex-1 border-gray-200"
      onClick={handleSave} disabled={saved}
    >
      {saved ? <><Check size={14} /> Saved</> : <><Save size={14} /> Save</>}
    </Button>
    <Button
      size="sm" className="flex-1 bg-indigo-600 text-white"
      onClick={() => setStageMenuOpen(true)}
    >
      <PlusCircle size={14} /> Pipeline
    </Button>
  </div>
</div>
{/* Bottom spacer so content isn't hidden behind fixed bar */}
<div className="h-16 md:hidden" />
```

---

## 17. Disclaimer Banner

```tsx
<div className="flex items-start gap-3 rounded-xl border border-warning-200
                bg-warning-50 px-5 py-3">
  <AlertTriangle size={16} className="text-warning-600 shrink-0 mt-0.5" />
  <p className="text-xs text-gray-600 leading-relaxed">
    This analysis is for informational purposes only. It does not constitute an
    appraisal, financial advice, or investment recommendation. AI-generated content
    may contain errors. Consult a qualified professional before making investment
    decisions.
  </p>
</div>
```

---

## 18. Responsive Breakpoint Summary

| Breakpoint | Form Page | Results Page |
|-----------|-----------|-------------|
| **< 640px (sm)** | Strategy dropdown, 1-col fields, sticky submit, no live preview | Icon-only header buttons, stacked KPIs (2-col), stacked outputs/risk, fixed bottom action bar |
| **640-767px** | Strategy tabs, 1-col fields, sticky submit, no live preview | Header button labels visible, stacked KPIs (2-col), stacked sections |
| **768-1023px (md)** | Strategy tabs, 2-col fields, inline submit, no live preview | 4-col KPIs, 2-col outputs+risk, inline action bar |
| **>= 1024px (lg)** | Strategy tabs, 2-col fields, live preview sidebar (sticky), inline submit | Full layout as diagrammed |

---

## 19. Print-Friendly CSS

The light theme is inherently print-ready. Add targeted `@media print` rules.

```css
@media print {
  /* Hide interactive chrome */
  nav, .sidebar, .topbar, .action-bar, .sticky-bottom,
  button:not(.print-visible), .tooltip, .popover,
  [data-radix-portal] {
    display: none !important;
  }

  /* Force white backgrounds */
  body, .app-shell-content {
    background: white !important;
    color: #101828 !important;
  }

  /* Prevent chart cutoff across pages */
  .cash-flow-section {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  /* Force table view for cash flow */
  [data-view="chart"] { display: none !important; }
  [data-view="table"] { display: block !important; }

  /* Remove shadows/rings on print */
  .kpi-card, .rounded-2xl {
    box-shadow: none !important;
    border: 1px solid #D0D5DD !important;
  }

  /* Ensure SVG risk gauge prints with color */
  .risk-gauge svg {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }

  @page {
    margin: 0.75in;
    size: letter portrait;
  }
}
```

---

## CRITICAL DECISIONS

### 1. Segmented tabs (not card grid) for strategy switching on the form page.

The card grid on `/analyze` is fine for first-time selection. But once the user is inside the form, a horizontal segmented tab bar lets them switch strategies without navigating away, losing their address/zip data, or re-orienting. The tab bar is sticky below the topbar and collapses to a dropdown on mobile. Five strategies is the maximum that fits comfortably in a segmented control.

### 2. `type="text"` + `inputMode="decimal"` replaces `type="number"` on all financial fields.

This eliminates three classes of bugs: scroll-to-change (accidentally altering values), browser spinner buttons (visual noise), and inability to display comma-formatted values. The tradeoff is switching dollar fields from `register()` to `Controller` for live formatting, but this is necessary to display `$250,000` instead of `$250000`.

### 3. Risk factors shown inline, not hidden in a popover.

The current implementation hides the risk breakdown behind a `HelpCircle` icon. On the light theme, the risk panel has enough vertical space for color-coded progress bars alongside the gauge. Inline display communicates analysis depth without requiring discovery. The popover pattern is removed entirely.

### 4. Export actions (PDF, Share, Offer Letter) promoted to the header row.

The current 8-button action bar at the bottom is overwhelming and buries the highest-value actions. Moving exports to the header -- where users naturally look for "do something with this page" controls -- reduces the bottom bar to four focused items (Back, Pipeline, Chat, Save/Delete). On mobile, header buttons collapse to icon-only.

### 5. Chart + Table toggle for cash flow (table is not the default).

The chart remains the primary visual for quick comprehension. The table view is one click away for investors who need exact monthly numbers for due diligence spreadsheets. Both render from the same data array, so there is zero compute cost. The table uses green/red color coding (`text-success-700` / `text-danger-600`) with JetBrains Mono for every financial value.

### 6. Deal Score banner as the first visual after the header.

A circular score (0-100) with a color-coded label and one-line summary gives an instant "is this a good deal?" signal before the user reads any detailed outputs. This is the single most important number on the page and should not be buried in the KPI grid. The arc animates on mount (1s ease-out) for visual engagement.

### 7. Free/Pro paywall uses blur + overlay, not feature removal.

Free users can see that the feature exists (blurred preview) but cannot interact. This is superior to hiding features entirely because it demonstrates value and creates upgrade motivation. PDF export, 3+ deal comparison, and offer letters are gated. The overlay uses `bg-white/60 backdrop-blur-[2px]` to keep the content recognizable but clearly locked.

### 8. Mobile action bar is fixed-bottom with exactly two buttons.

Save and Pipeline are the two actions that matter most after viewing results. All other actions (Chat, Share, PDF, Delete) are either in the header or accessible via scroll. A fixed bottom bar with two buttons avoids the "too many choices" problem that the current 8-button row creates on small screens. The `safe-area-inset-bottom` class handles iPhone home indicator spacing.

### 9. AI Insights loads asynchronously and never blocks calculator results.

The insight banner renders a skeleton placeholder immediately, then fills with AI-generated text when the response arrives. If the AI call fails, the banner gracefully hides rather than showing an error. Calculator outputs (KPIs, risk, cash flow) are computed locally and always appear instantly. The AI insight is supplementary.

### 10. Stagger timing is 60ms between sections, not faster.

60ms creates a perceivable cascade without feeling slow. At 40ms, sections blend together and the stagger looks like a single delayed load. At 100ms, the page feels sluggish. The 60ms interval (matching the existing `staggerContainer(60)`) produces the ideal "reveal" effect across the 8-9 sections on the Results page, completing the full entrance sequence in ~540ms.
