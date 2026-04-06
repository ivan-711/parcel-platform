# Analysis Page UX Overhaul — Implementation Plan

> Author: Claude | Date: 2026-04-05
> Status: PLAN ONLY — no code changes

---

## 1. Executive Summary

After reading every component, calculator, model, schema, and design token, here is my overall take:

**This is a 90% frontend project.** The backend already provides almost everything we need. The calculators output expense breakdowns (`monthly_expense_breakdown`), risk scores (0-100 with per-factor breakdown), and all the metrics. The only backend work is the reverse-valuation endpoint (item 7), and even that is algebraically solvable without a numerical solver.

**The biggest risk is scope creep.** Eight items touching the same page creates merge conflict hell. The plan below sequences work to minimize conflicts: items that restructure layout go first, items that add new sections go last.

**One disagreement with the research doc:** The research recommends a "Deal Score / Verdict Badge" as a separate concept from the existing risk score. I disagree — we should unify them. The risk score (0-100) already exists on every scenario, calculated from strategy-specific factors. Adding a *second* scoring system creates confusion. Instead, I propose mapping the existing risk score to a verdict label and redesigning its presentation. More on this in Feature 1.

**Another disagreement:** The research suggests moving the AI narrative to Layer 2 (below the fold). I think this undervalues Parcel's biggest differentiator. The narrative should stay above the fold but be *truncated* — 2-3 sentences visible, full text on expand. This gives it prominence while saving vertical space. The verdict badge above it provides the instant signal.

**Sprint breakdown:** 3 sprints across ~8 working sessions. Sprint A is layout restructuring (verdict, truncation, collapse, trim). Sprint B is enrichment (tooltips, waterfall, year toggle). Sprint C is the reverse-valuation calculator (standalone, no layout conflicts).

---

## 2. Per-Feature Deep Dive

---

### Feature 1: Verdict Badge

#### A. Study

**Files involved:**
- `frontend/src/pages/analyze/AnalysisResultsPage.tsx` — placement in layout
- `frontend/src/pages/analyze/components/KeyMetrics.tsx` — currently shows risk badge inline
- `backend/core/calculators/risk_score.py` — existing 0-100 scoring with per-factor breakdown
- `backend/core/calculators/wholesale.py` — already outputs `recommendation: "strong"|"marginal"|"pass"`

**What already exists:**
- Risk score 0-100 on every scenario (calculated by `calculate_risk_score()`)
- Risk flag system: `risk_flags: [{flag, severity, explanation}]`
- Wholesale already has a `recommendation` verdict field
- Risk score thresholds in KeyMetrics: green ≤33, amber ≤66, red >66
- Risk score popover with breakdown exists on `ShareDealPage.tsx` (lines 266-289)

**Key insight:** The risk score IS the verdict — it just needs better presentation. A score of 18 means "Strong Deal" but the current UI shows it as "Risk: 18/100" which is confusing (lower is better but the scale reads like higher = more risk).

#### B. Approach

**Do NOT create a second scoring system.** Instead:

1. Map existing risk score to verdict labels:
   - 0-25: **"Strong Deal"** (green, `--accent-success`)
   - 26-45: **"Good Deal"** (green, slightly muted)
   - 46-60: **"Marginal"** (amber, `--accent-warning`)
   - 61-75: **"Risky"** (coral, `--accent-danger` at 80% opacity)
   - 76-100: **"Pass"** (red, `--accent-danger`)

2. For wholesale, override with the existing `recommendation` field:
   - "strong" → "Strong Deal"
   - "marginal" → "Marginal"
   - "pass" → "Pass"

3. Create a `VerdictBadge` component:
   - Large pill (not a tiny badge) — `px-4 py-1.5 rounded-full text-sm font-medium`
   - Color-coded background surface + text + border (same pattern as StrategyBadge)
   - Optional confidence indicator: show narrative confidence dots (HIGH/MEDIUM/LOW) next to verdict
   - Click/tap opens a popover with risk factor breakdown (reuse the ShareDealPage pattern)

4. Placement: Between property header and AI narrative card. Sits on the same line as the hero metric on desktop (flex row: verdict left, hero metric right). On mobile, stacked above hero metric.

**Component structure:**
```
VerdictBadge.tsx (new, ~80 lines)
├── Props: riskScore: number, strategy: string, recommendation?: string, confidence?: string
├── Maps score → label + color
├── Renders pill with Popover trigger
└── Popover shows risk factor breakdown
```

#### C. Risks
- Risk score thresholds may feel wrong for some strategies. Wholesale is binary (strong/marginal/pass) but buy-and-hold is a spectrum. The thresholds above are calibrated to the existing risk scoring factors but may need tuning after user testing.
- No backend changes needed — all data already exists.

#### D. Effort
- Files touched: 2 (new VerdictBadge.tsx, modify AnalysisResultsPage.tsx layout)
- Complexity: Simple
- Estimate: 1 session

#### E. Challenge
**Why not a separate scoring algorithm?** The research doc proposes "rules-based and deterministic, not AI-generated" — but that's exactly what `risk_score.py` already is. It's a weighted point system per strategy. Building a second system means two numbers that could contradict each other ("Strong Deal" but "Risk: 72/100"?). Unifying is cleaner.

**One thing I'd change:** The current risk score treats "low risk" as "good deal" — but a deal can be low risk and still bad (low returns). The risk score checks cash flow/ROI thresholds that already capture this, but I'd add a guard: if the hero metric is negative (negative cash flow, negative profit, MAO below asking), force the verdict to "Pass" regardless of risk score. This is a ~5 line addition to the frontend mapping function.

---

### Feature 2: AI Narrative Truncation

#### A. Study

**Files involved:**
- `frontend/src/pages/analyze/components/NarrativeCard.tsx` — the only file that needs to change

**Current behavior:** Full narrative text rendered with `whitespace-pre-line`. Strips markdown bold markers. Shows confidence dots, assumptions accordion, refresh button. No truncation.

**Existing patterns:** The "View assumptions" accordion in NarrativeCard already uses the motion.div expand/collapse pattern with ChevronDown rotation.

#### B. Approach

1. Split narrative text at the first 2 sentence boundaries (look for `. ` after at least 80 characters to avoid splitting on abbreviations like "e.g." or "$10k.").
2. Show truncated text by default with a "Read full analysis" link.
3. On expand, animate the full text in using the same motion.div pattern as the assumptions accordion.
4. The "View assumptions" accordion nests inside the expanded narrative (only visible when narrative is expanded).

**Implementation detail:**
```tsx
const TRUNCATE_THRESHOLD = 200 // characters
const truncated = useMemo(() => {
  if (!narrative || narrative.length <= TRUNCATE_THRESHOLD) return null
  // Find second sentence boundary after 80 chars
  const sentences = narrative.match(/[^.!?]+[.!?]+/g) || []
  const preview = sentences.slice(0, 2).join('').trim()
  return preview.length < narrative.length ? preview : null
}, [narrative])
```

3. Toggle state: `const [expanded, setExpanded] = useState(false)`
4. Render: `truncated && !expanded ? truncated + "..." : narrative`
5. Button: "Read full analysis ›" / "Show less" — styled as text link in `--accent-primary`

#### C. Risks
- Sentence splitting could break on edge cases (numbers with decimals, abbreviations). The regex approach is good enough — the AI narrative is written in clean prose, not code.
- The narrative includes markdown-stripped bold markers. Splitting won't break formatting since we already strip `**`.

#### D. Effort
- Files touched: 1 (NarrativeCard.tsx)
- Complexity: Simple
- Estimate: 0.5 sessions

#### E. Challenge
**Nothing to challenge here.** This is straightforward and clearly needed. The narrative is often 6-8 sentences, which pushes everything else below the fold.

---

### Feature 3: Collapse Sensitivity Matrix

#### A. Study

**Files involved:**
- `frontend/src/pages/analyze/AnalysisResultsPage.tsx` — wraps SensitivityMatrix in expandable
- `frontend/src/pages/analyze/components/SensitivityMatrix.tsx` — no changes needed internally

**Current behavior:** SensitivityMatrix renders inline in a 2-column grid alongside FinancialInputs. Shows for buy_and_hold, brrrr, creative_finance strategies.

**Existing pattern:** FaqItem in PricingPage.tsx uses `useState` + `motion.div` + `ChevronDown` rotation. NarrativeCard and FinancialInputs use the same pattern.

#### B. Approach

1. Wrap the `<SensitivityMatrix>` call in AnalysisResultsPage with the standard expandable pattern.
2. Header: "SENSITIVITY ANALYSIS" (11px uppercase, matching existing section headers) with ChevronDown.
3. Collapsed by default. On expand, motion.div animates height from 0 to auto.
4. The 2-column grid layout changes: FinancialInputs gets full width when matrix is collapsed. When expanded, it returns to the 2-column layout on desktop, or stacks on mobile.

**Alternative considered:** Making FinancialInputs always full-width and putting the sensitivity matrix below as a full-width expandable. This is simpler and avoids the layout shift when expanding. **I recommend this alternative** — it's cleaner and the matrix benefits from more horizontal space anyway (5 columns are cramped at half-width on smaller desktops).

#### C. Risks
- Layout shift when expanding could be jarring. The motion.div animation handles this smoothly.
- Users who rely on the matrix may be annoyed it's hidden. Consider persisting the open/closed state in localStorage.

#### D. Effort
- Files touched: 1 (AnalysisResultsPage.tsx)
- Complexity: Simple
- Estimate: 0.5 sessions

#### E. Challenge
**Should we collapse FinancialInputs too?** The research doc doesn't suggest it, but if we're collapsing the matrix, the inputs section is also "deep dive" content. I'd keep inputs visible since they show confidence badges (VERIFIED/ESTIMATED/NEEDED) which are a key trust signal. The inputs are actionable; the matrix is reference.

---

### Feature 4: Trim Metrics Above the Fold

#### A. Study

**Files involved:**
- `frontend/src/pages/analyze/components/KeyMetrics.tsx` — the only file that changes

**Current state:** Each strategy has a `SUPPORTING_METRICS` config array with 7-10 items, all rendered in a grid. The config objects already have `key`, `label`, `suffix`, `prefix`, and optional `threshold` fields.

**Current metrics per strategy (from KeyMetrics.tsx):**

| Strategy | Currently Visible (count) |
|---|---|
| Buy & Hold | 10 supporting + hero |
| Wholesale | 7 supporting + hero |
| Flip | 7 supporting + hero |
| BRRRR | 8 supporting + hero |
| Creative Finance | 7 supporting + hero |

#### B. Approach

Split each strategy's metrics into `VISIBLE` (always shown) and `EXPANDABLE` (behind "More Metrics" toggle). The split is based on:
1. What investors look at first (from Part 3 of the research)
2. What competitors consistently show
3. Whether the metric is a screening metric vs. a detail metric

**Proposed split — see Section 5 (Per-Strategy Metric Visibility Matrix) for the full table.**

Implementation:
1. Add a `tier: 'primary' | 'secondary'` field to each metric config object.
2. Render primary metrics in the existing grid.
3. Add "More Metrics" expandable below the grid (same pattern as Feature 3).
4. Render secondary metrics inside the expandable.
5. The expandable header shows the count: "More Metrics (4)" so users know there's more.

**Component change in KeyMetrics.tsx:**
```tsx
const primaryMetrics = SUPPORTING_METRICS[strategy].filter(m => m.tier === 'primary')
const secondaryMetrics = SUPPORTING_METRICS[strategy].filter(m => m.tier === 'secondary')
```

Then render `primaryMetrics` in the grid, and `secondaryMetrics` in a collapsible section below.

#### C. Risks
- Users may have workflows that depend on seeing a specific "secondary" metric. The expandable is one click away, so this is low risk.
- The "More Metrics" section needs to look polished, not like an afterthought. Use the same card styling as the primary grid.

#### D. Effort
- Files touched: 1 (KeyMetrics.tsx)
- Complexity: Medium (config restructuring + new expandable section)
- Estimate: 1 session

#### E. Challenge
**The research says 5-7 KPIs above the fold.** My proposed split gives 5-6 primary metrics per strategy, which lands in the sweet spot. I'm being more aggressive than the research suggests on wholesale (showing only 3 primary) because wholesalers need speed above all else.

**Should the verdict badge count as one of the 5-7?** Yes. So hero metric + verdict + 4-5 supporting = 6-7 total above the fold. This is perfect.

---

### Feature 5: Metric Tooltips with Formulas

#### A. Study

**Files involved:**
- `frontend/src/pages/analyze/components/KeyMetrics.tsx` — add tooltip trigger to each metric card
- New file: `frontend/src/pages/analyze/components/MetricTooltipContent.tsx` or a constants file

**Existing patterns:**
- `Popover` + `HelpCircle` pattern on ShareDealPage (risk score breakdown)
- `ConceptTooltip` component (inline dashed-underline style)
- `Tooltip` from Radix (simple hover text)

**Best pattern:** Use `Popover` + `HelpCircle` (not `Tooltip`, which is too small for formulas). The Popover supports rich content, stays open on click (important for mobile), and already has the glassmorphic styling.

#### B. Approach

1. Add a `HelpCircle` icon (size 12, `text-text-muted`) to each metric card's label row.
2. On click, show a `Popover` with:
   - **Plain English:** "Cash-on-cash return measures your annual return relative to the cash you invested."
   - **Formula:** `Annual Cash Flow / Total Cash Invested × 100`
   - **This Property:** `$4,800 / $40,000 × 100 = 12.0%`
3. Define tooltip content as a config map keyed by metric key:

```tsx
const METRIC_TOOLTIPS: Record<string, {
  description: string
  formula: string
  compute: (outputs: ScenarioOutputs) => string // builds the "This Property" line
}> = {
  cap_rate: {
    description: "Capitalization rate measures property value relative to its income, independent of financing.",
    formula: "Annual NOI / Purchase Price × 100",
    compute: (o) => `$${o.annual_noi} / $${o.purchase_price} × 100 = ${o.cap_rate}%`
  },
  // ... one per metric
}
```

4. The `compute` function receives `scenario.outputs` and formats the actual numbers. This makes the tooltip dynamic — it shows THIS property's math, not just a generic formula.

**Metrics needing tooltips (all unique metric keys across all strategies):**
- cap_rate, coc_return, dscr, annual_cash_flow, monthly_pi, break_even_rent, rent_to_price_ratio, expense_ratio, debt_yield, five_year_total_return
- mao, profit_at_ask, break_even_price, closing_costs, recommendation, mao_65, mao_75, assignment_fee_pct_arv
- roi, annualized_roi, total_cost, profit_margin_pct, selling_costs, cost_per_sqft_rehab
- refi_proceeds, equity_captured, capital_recycled_pct, monthly_cash_flow, infinite_return, forced_appreciation
- equity_day_one, effective_yield, wrap_spread_monthly, sub_to_risk_score

Total: ~30 unique metrics needing tooltip definitions.

#### C. Risks
- 30 tooltip definitions is a lot of copy. Should be in a separate constants file, not inline.
- The `compute` function could show NaN or undefined if outputs are missing. Add null guards.
- On mobile, Popover works well (stays open on tap, closes on outside tap). No special mobile handling needed.

#### D. Effort
- Files touched: 2 (KeyMetrics.tsx + new MetricTooltips.ts constants file)
- Complexity: Medium (30 definitions, but each is boilerplate)
- Estimate: 1.5 sessions (mostly writing the 30 tooltip definitions)

#### E. Challenge
**Should tooltips show on hover or click?** Click (Popover) is better than hover (Tooltip) because:
1. Mobile has no hover state
2. Formulas are long enough that users need time to read
3. The "This Property" calculation is the killer feature — it's worth the extra interaction

**Should we also add tooltips to the hero metric?** Yes. The hero metric (Cash Flow, MAO, Profit, etc.) should also have a formula popover. It's the most important number on the page.

---

### Feature 6: Cash Flow Waterfall Chart

#### A. Study

**Files involved:**
- New file: `frontend/src/pages/analyze/components/WaterfallChart.tsx`
- `frontend/src/pages/analyze/AnalysisResultsPage.tsx` — add to layout
- `frontend/src/lib/chart-theme.ts` — reuse existing theme getters

**Data already available:** The `monthly_expense_breakdown` field in scenario outputs contains:
```json
{
  "mortgage": 1200.00,
  "taxes": 250.00,
  "insurance": 125.00,
  "vacancy": 128.00,
  "maintenance": 80.00,
  "capex": 0,
  "management": 128.00,
  "hoa": 0,
  "other": 0
}
```

This is computed by `compute_common_projections()` for buy_and_hold, brrrr, and creative_finance strategies. **No backend changes needed.**

For flip strategy, `holding_cost_breakdown` exists:
```json
{
  "monthly_payment": 800.00,
  "taxes": 200.00,
  "insurance": 100.00,
  "utilities": 150.00,
  "other": 0
}
```

**Chart library:** Recharts (already in the project). Waterfall charts are not a native Recharts chart type, but can be built with a stacked `BarChart` using invisible spacer bars.

#### B. Approach

**Chart type:** Vertical waterfall bar chart. Each bar represents a step:
1. **Gross Rent** (full height, green/profit color) — starting point
2. **-Vacancy** (red/loss color, starts from gross rent)
3. **-Taxes** (red)
4. **-Insurance** (red)
5. **-Maintenance** (red)
6. **-Management** (red)
7. **-Mortgage** (red, usually the largest deduction)
8. **= Net Cash Flow** (green if positive, red if negative) — final bar, grounded at 0

Implementation technique (Recharts stacked bar):
- Each bar has an invisible "spacer" segment + a visible "value" segment
- Spacer height = running total after deductions
- Value height = the deduction amount
- First bar (Gross Rent): spacer = 0, value = gross rent
- Last bar (Net): spacer = 0, value = net cash flow

**Visual style:**
- Use `--chart-positive` (#6DBEA3) for income/positive bars
- Use `--chart-negative` (#D4766A) for deduction bars
- Use `--chart-accent` (#8B7AFF) for the net result bar
- Gradient fills using `getGradientOpacity()` from chart-theme.ts
- FrostedTooltip for hover details (shows dollar amount + % of gross rent)
- X-axis: category labels (abbreviated: "Rent", "Vac", "Tax", "Ins", "Maint", "Mgmt", "Mtg", "Net")
- Y-axis: currency format ($0 - $X)
- Chart container: same card styling as CashFlowChart (`bg-[var(--chart-bg)]`, border, rounded-xl)

**Placement:** Between the AI narrative and break-even chart (Layer 2 in the research doc's hierarchy). Only renders for buy_and_hold, brrrr, and creative_finance (strategies with recurring cash flow).

**Skip zero-value categories.** If vacancy = 0 or management = 0, omit that bar entirely. This keeps the chart clean for creative finance deals that may have fewer expense categories.

#### C. Risks
- Recharts waterfall via stacked bars is a well-known technique but slightly hacky. The invisible spacer bars could cause tooltip confusion if a user hovers on the spacer area. Mitigation: set spacer bar fill to `transparent` and `isAnimationActive={false}`.
- On mobile, 8 bars might be cramped. Use abbreviated labels (3-4 chars) and allow horizontal scroll if needed. Or: simplify mobile to show just Rent, Total Expenses, Net (3 bars).
- The `monthly_expense_breakdown` might have all zeros for capex/hoa/other. Filter these out.

#### D. Effort
- Files touched: 2 (new WaterfallChart.tsx, modify AnalysisResultsPage.tsx)
- Complexity: Medium-High (waterfall in Recharts requires careful data transformation)
- Estimate: 1.5 sessions

#### E. Challenge
**Should this replace or supplement the break-even chart?** The research says "replace or supplement." I say **supplement** — they answer different questions. The waterfall answers "where does my money go each month?" The break-even answers "when do I recover my investment?" Both are valuable. Put waterfall first (more immediately useful), break-even second.

**Should we show annual or monthly?** Monthly. Investors think in monthly cash flow. Add a small label: "Monthly Cash Flow Breakdown" to make it clear.

---

### Feature 7: Reverse-Valuation Calculator

#### A. Study

**Files involved:**
- New file: `backend/core/calculators/reverse_valuation.py`
- `backend/routers/analysis.py` or `backend/routers/calculators.py` — new endpoint
- `backend/schemas/analysis.py` — new request/response schemas
- New file: `frontend/src/pages/analyze/components/ReverseCalculatorModal.tsx`
- `frontend/src/pages/analyze/AnalysisResultsPage.tsx` — add trigger button

**Current calculator structure:** Each calculator is a pure function: `calculate_X(inputs) → outputs`. They're stateless and fast (<100ms). The existing `/api/analysis/calculate` endpoint wraps them.

**Can we solve algebraically?** Yes, for most strategies. No `scipy` needed.

#### B. Approach

**Backend: Algebraic reverse solvers per strategy**

**Buy & Hold — "Max price for target CoC return":**
```
target_coc = annual_cash_flow / total_cash_invested × 100
annual_cash_flow = (monthly_rent × (1 - vacancy/100) - expenses - mortgage_payment) × 12
total_cash_invested = purchase_price × down_payment_pct/100

Solve for purchase_price:
1. mortgage_payment = pmt(rate/12, term×12, purchase_price × (1 - down_pmt/100))
2. Substitute and solve iteratively (mortgage is a function of purchase price)
```

Since `pmt()` is linear in the principal, the mortgage payment is linearly related to purchase price. This means the equation is solvable with simple algebra:

```python
def reverse_buy_and_hold(target_coc: float, inputs: dict) -> float:
    """Returns max purchase price to achieve target CoC return."""
    r = inputs['interest_rate'] / 100 / 12
    n = inputs['loan_term_years'] * 12
    dp = inputs['down_payment_pct'] / 100
    
    rent = inputs['monthly_rent']
    vac = inputs['vacancy_rate_pct'] / 100
    expenses = inputs['monthly_taxes'] + inputs['monthly_insurance']
    maint_pct = inputs['maintenance_pct'] / 100
    mgmt_pct = inputs['mgmt_fee_pct'] / 100
    
    effective_rent = rent * (1 - vac)
    # Monthly cash flow = effective_rent - expenses - maint - mgmt - pmt(r, n, P*(1-dp))
    # Annual CF = 12 × monthly_cf
    # CoC = annual_cf / (P × dp) × 100
    # Solve: target_coc/100 = 12 × (eff_rent - expenses - rent*maint - rent*mgmt - pmt_factor*P*(1-dp)) / (P × dp)
    
    pmt_factor = r * (1+r)**n / ((1+r)**n - 1)  # monthly payment per dollar of principal
    
    # target_coc/100 × P × dp = 12 × (eff_rent - expenses - rent*(maint+mgmt) - pmt_factor × P × (1-dp))
    # target_coc/100 × dp × P + 12 × pmt_factor × (1-dp) × P = 12 × (eff_rent - expenses - rent*(maint+mgmt))
    # P × (target_coc/100 × dp + 12 × pmt_factor × (1-dp)) = 12 × (eff_rent - expenses - rent*(maint+mgmt))
    
    numerator = 12 * (effective_rent - expenses - rent * (maint_pct + mgmt_pct))
    denominator = (target_coc / 100) * dp + 12 * pmt_factor * (1 - dp)
    
    return numerator / denominator if denominator > 0 else None
```

**Wholesale — trivial, already exists:**
MAO = ARV × 0.70 - repairs - desired_profit. The "reverse" is: given asking price, what profit do you make? This is already `profit_at_ask`. No new work needed.

**Flip — "Max price for target ROI":**
```python
def reverse_flip(target_roi: float, inputs: dict) -> float:
    arv = inputs['after_repair_value']
    rehab = inputs['rehab_budget']
    selling_costs = arv * (inputs['selling_costs_pct'] / 100)
    financing = inputs.get('financing_costs', 0)
    
    # roi = (arv - P - rehab - financing - selling_costs) / (P + rehab + financing) × 100
    # target_roi/100 × (P + rehab + financing) = arv - P - rehab - financing - selling_costs
    # target_roi/100 × P + target_roi/100 × (rehab + financing) = arv - P - rehab - financing - selling_costs
    # P × (1 + target_roi/100) = arv - rehab - financing - selling_costs - target_roi/100 × (rehab + financing)
    
    other_costs = rehab + financing
    numerator = arv - other_costs - selling_costs - (target_roi / 100) * other_costs
    denominator = 1 + target_roi / 100
    
    return numerator / denominator if denominator > 0 else None
```

**BRRRR — "Max all-in for target capital recycled %":**
```python
def reverse_brrrr(target_capital_recycled_pct: float, inputs: dict) -> float:
    arv = inputs['arv_post_rehab']
    refi_ltv = inputs['refinance_ltv_pct'] / 100
    rehab = inputs['rehab_costs']
    
    refi_proceeds = arv * refi_ltv
    # capital_recycled = refi_proceeds / (P + rehab) × 100
    # target/100 = refi_proceeds / (P + rehab)
    # P + rehab = refi_proceeds / (target/100)
    # P = refi_proceeds / (target/100) - rehab
    
    max_all_in = refi_proceeds / (target_capital_recycled_pct / 100)
    return max_all_in - rehab if max_all_in > rehab else None
```

**Creative Finance — "Max existing loan balance for target cash flow":**
```python
def reverse_creative(target_monthly_cf: float, inputs: dict) -> float:
    rent = inputs['monthly_rent_estimate']
    expenses = inputs['monthly_expenses']
    # monthly_cf = rent - monthly_piti - expenses
    # For subject-to: monthly_piti is the existing loan payment, which is a function of existing balance
    # monthly_piti = pmt(rate/12, term×12, existing_balance)
    
    target_piti = rent - expenses - target_monthly_cf
    # Reverse PMT: existing_balance = target_piti / pmt_factor
    r = inputs['new_rate'] / 100 / 12
    n = inputs['new_term_years'] * 12
    pmt_factor = r * (1+r)**n / ((1+r)**n - 1)
    
    return target_piti / pmt_factor if pmt_factor > 0 and target_piti > 0 else None
```

**API endpoint:**
```
POST /api/analysis/reverse-calculate
Request: {
  strategy: str,
  target_metric: str,       // "coc_return", "roi", "capital_recycled_pct", "monthly_cash_flow"
  target_value: float,       // e.g., 12.0 (for 12% CoC)
  inputs: dict               // all other inputs (same as forward calculator)
}
Response: {
  max_purchase_price: float | null,
  scenario_at_max: dict,     // full forward calculation at the max price
  feasible: bool,
  message: str               // "To achieve 12% CoC, max purchase price is $185,000"
}
```

The endpoint runs the reverse solver, then runs the forward calculator at the result to return a complete scenario at that price. This lets the frontend show "here's what the deal looks like at that price."

**Frontend: Modal with live calculation**

Use `Dialog` (centered modal, not Sheet) since this is a focused calculator interaction, not a persistent panel.

Layout:
```
┌─────────────────────────────────────────┐
│  Reverse Calculator              [×]    │
│─────────────────────────────────────────│
│  What's the max I can pay to hit:       │
│                                         │
│  Target: [  12.0  ] % CoC Return   ▼   │
│                                         │
│  ═══════════════════════════════════     │
│  Max Purchase Price: $185,000           │
│  ═══════════════════════════════════     │
│                                         │
│  At this price:                         │
│  Cash Flow: $400/mo  │  Cap Rate: 7.2% │
│  DSCR: 1.35          │  Risk: Low      │
│                                         │
│  [ Apply This Price ]   [ Close ]       │
└─────────────────────────────────────────┘
```

- Target metric dropdown changes based on strategy:
  - Buy & Hold: CoC Return, Cap Rate, Cash Flow ($/mo)
  - Flip: ROI, Net Profit ($)
  - BRRRR: Capital Recycled %, CoC Return
  - Creative: Monthly Cash Flow ($/mo), DSCR
  - Wholesale: not applicable (already shows MAO)
- Input is debounced (300ms) and calls the backend endpoint
- "Apply This Price" updates the purchase_price input in FinancialInputs and triggers recalculation
- "Close" dismisses without changes

**Trigger:** A small "Calculator" icon button (icon: `<Calculator>` from lucide-react) next to the hero metric, or as an action in the header button group.

#### C. Risks
- The algebraic solutions assume fixed-rate mortgages. Adjustable rates would need numerical methods. Since all current calculators use fixed rates, this is fine.
- Edge cases: target return is impossible (e.g., 50% CoC on a property with $500/mo rent). The `feasible` flag and `message` handle this.
- The modal's "Apply This Price" creates a state flow between the modal and FinancialInputs. Need to ensure the onInputsChange callback fires correctly.

#### D. Effort
- Files touched: 4-5 (new reverse_valuation.py, modify analysis router + schemas, new ReverseCalculatorModal.tsx, modify AnalysisResultsPage.tsx)
- Complexity: High (most complex item — backend math + frontend modal + state flow)
- Estimate: 2-3 sessions

#### E. Challenge
**Should this be a modal or inline?** Modal is better. The reverse calculator is a "what if" tool, not a permanent part of the page. Inline would add even more content to an already-dense page. A modal creates a focused interaction context.

**Do we need all 5 strategies?** Skip wholesale — MAO already IS the reverse calculation. That leaves 4 strategies with 1-2 target metrics each. Eight solver functions total, all algebraic.

**One concern:** The "Apply This Price" button is powerful but could confuse users who don't realize it modifies their inputs. Add a confirmation: "This will update your purchase price to $185,000 and recalculate all metrics. Continue?"

---

### Feature 8: 10/20/30 Year Toggle on Cash Flow Projection

#### A. Study

**Files involved:**
- `frontend/src/pages/analyze/components/CashFlowChart.tsx` — the only file

**Current behavior:** Generates 30 data points (years 1-30) with:
- 2% annual rent growth
- 3% annual expense growth
- Fixed mortgage payment
- Cumulative toggle (annual vs cumulative view)

The data is generated client-side from scenario outputs — no backend call needed.

#### B. Approach

1. Add a 3-button toggle group next to the existing "Cumulative" toggle: `10yr | 20yr | 30yr`
2. Default to 10yr (per research recommendation).
3. The data generation loop already runs to 30 — just slice the array: `data.slice(0, horizon)`.
4. Adjust x-axis tick interval based on horizon:
   - 10yr: every year
   - 20yr: every 2 years
   - 30yr: every 5 years (current behavior)

**Toggle styling:** Use the same button group pattern as the sensitivity matrix metric toggle (4 small buttons, active state with accent background). Place the horizon toggle on the left of the header, cumulative toggle on the right.

#### C. Risks
- None. This is purely presentational, no data changes.

#### D. Effort
- Files touched: 1 (CashFlowChart.tsx)
- Complexity: Simple
- Estimate: 0.5 sessions

#### E. Challenge
**Should we default to 10yr or keep 30yr?** The research says 10yr. I agree — 30 years is too abstract for most investors, and the uncertainty compounds make years 20-30 unreliable. But keep 30yr available for buy-and-hold investors who want to see the full picture.

**Should we remove the cumulative toggle?** No, keep it. Cumulative view answers a different question ("total wealth built over time"). The two toggles are orthogonal: horizon × view mode = 6 combinations. All are valid.

---

## 3. Recommended Sprint Breakdown

### Sprint A — Layout Restructuring (3 sessions)

**Goal:** Reduce information density above the fold without losing any data.

| Task | Feature | Files | Complexity | Sessions |
|---|---|---|---|---|
| A1: Verdict badge component | F1 | New VerdictBadge.tsx + AnalysisResultsPage.tsx | Simple | 0.5 |
| A2: Verdict placement + layout adjustment | F1 | AnalysisResultsPage.tsx | Simple | 0.5 |
| A3: Narrative truncation | F2 | NarrativeCard.tsx | Simple | 0.5 |
| A4: Collapse sensitivity matrix | F3 | AnalysisResultsPage.tsx | Simple | 0.5 |
| A5: Split metrics into primary/secondary | F4 | KeyMetrics.tsx | Medium | 1.0 |

**Sprint A build verification:** After this sprint, the page should show: verdict badge → hero metric + 5-6 KPIs → truncated narrative → charts → inputs (full width) → matrix (collapsed) → comparison table. All existing data is still accessible, just reorganized.

### Sprint B — Enrichment (3.5 sessions)

**Goal:** Add new information and interactivity without changing the layout established in Sprint A.

| Task | Feature | Files | Complexity | Sessions |
|---|---|---|---|---|
| B1: Metric tooltip constants file | F5 | New MetricTooltips.ts | Medium | 1.0 |
| B2: HelpCircle integration in KeyMetrics | F5 | KeyMetrics.tsx | Simple | 0.5 |
| B3: Waterfall chart component | F6 | New WaterfallChart.tsx | Medium-High | 1.0 |
| B4: Waterfall placement in layout | F6 | AnalysisResultsPage.tsx | Simple | 0.5 |
| B5: Year horizon toggle | F8 | CashFlowChart.tsx | Simple | 0.5 |

**Sprint B build verification:** Tooltips should show on every metric. Waterfall chart should appear for buy_and_hold/brrrr/creative strategies between narrative and break-even. Cash flow chart should have 10/20/30yr buttons.

### Sprint C — Reverse Calculator (2.5 sessions)

**Goal:** Add the reverse-valuation feature as a standalone modal.

| Task | Feature | Files | Complexity | Sessions |
|---|---|---|---|---|
| C1: Backend reverse solvers | F7 | New reverse_valuation.py | Medium | 1.0 |
| C2: API endpoint + schemas | F7 | analysis router + schemas | Simple | 0.5 |
| C3: Frontend modal component | F7 | New ReverseCalculatorModal.tsx | Medium | 0.5 |
| C4: Modal integration + trigger | F7 | AnalysisResultsPage.tsx | Simple | 0.5 |

**Sprint C build verification:** Calculator icon in header or near hero metric opens modal. User can select target metric, enter target value, see max purchase price with full forward calculation. "Apply This Price" updates inputs.

**Total estimated effort: 9 sessions across 3 sprints.**

---

## 4. Verdict Scoring Algorithm Specification

### Scoring Source

The verdict is derived from the **existing risk score** (0-100, calculated by `risk_score.py`), NOT a new scoring system. The risk score is already strategy-specific with calibrated factor weights.

### Score-to-Verdict Mapping

| Risk Score | Verdict Label | Color Token | Background | Text | Border |
|---|---|---|---|---|---|
| 0-25 | Strong Deal | success | `rgba(109,190,163,0.12)` | `#6DBEA3` | `rgba(109,190,163,0.25)` |
| 26-45 | Good Deal | success (muted) | `rgba(109,190,163,0.08)` | `#7CCBA5` | `rgba(109,190,163,0.18)` |
| 46-60 | Marginal | warning | `rgba(212,168,103,0.12)` | `#D4A867` | `rgba(212,168,103,0.25)` |
| 61-75 | Risky | danger (muted) | `rgba(212,118,106,0.10)` | `#D4766A` | `rgba(212,118,106,0.20)` |
| 76-100 | Pass | danger | `rgba(212,118,106,0.15)` | `#C45E52` | `rgba(212,118,106,0.30)` |

### Strategy-Specific Overrides

**Wholesale:** Use the existing `recommendation` field from `wholesale.py`:
- `"strong"` → "Strong Deal" (regardless of risk score)
- `"marginal"` → "Marginal"
- `"pass"` → "Pass"

This is already calculated based on asking price vs MAO vs break-even price, which is more precise for wholesale than the generic risk score.

### Negative Hero Metric Guard

If the hero metric is negative or economically non-viable, force the verdict regardless of risk score:

| Strategy | Guard Condition | Forced Verdict |
|---|---|---|
| Buy & Hold | `monthly_cash_flow < 0` | "Risky" (min) |
| Buy & Hold | `monthly_cash_flow < -200` | "Pass" |
| Flip | `gross_profit < 0` | "Pass" |
| BRRRR | `monthly_cash_flow < 0 AND money_left_in > purchase_price * 0.5` | "Pass" |
| Creative Finance | `monthly_cash_flow < 0` | "Pass" |
| Wholesale | (handled by `recommendation` field) | — |

### Missing Data Handling

If risk score is null/undefined (scenario hasn't been fully calculated):
- Show verdict as **"Analyzing..."** with neutral gray styling
- No confidence dots

If risk score exists but key inputs are missing (source_confidence has "missing" fields):
- Show the verdict normally BUT append a small "Limited data" indicator
- This leverages the existing narrative confidence system (HIGH/MEDIUM/LOW)

### Popover Breakdown

On click, the verdict badge shows a popover with:
1. "Deal Score: X/100" (inverted from risk: `deal_score = 100 - risk_score`)
2. Factor breakdown (pulled from risk_flags if available, or computed from the risk_score factors)
3. One-line explanation per factor: "Cash flow: Strong ($400/mo)" or "Cap rate: Below target (3.2%)"

### Edge Cases

| Scenario | Behavior |
|---|---|
| Risk score = 0 | "Strong Deal" — perfect score, all factors green |
| Risk score = 100 | "Pass" — every factor is in the danger zone |
| Risk score = null | "Analyzing..." — calculation hasn't run yet |
| All inputs estimated (no verified data) | Show verdict normally + "Based on estimated data" note |
| Strategy not yet calculated | Don't show verdict badge at all (empty state) |

---

## 5. Per-Strategy Metric Visibility Matrix

**Legend:** P = Primary (always visible), S = Secondary (behind "More Metrics"), — = not applicable to this strategy

| Metric | Buy & Hold | Wholesale | Flip | BRRRR | Creative Finance |
|---|---|---|---|---|---|
| **Hero Metric** | | | | | |
| monthly_cash_flow / mao / gross_profit / money_left_in | P (hero) | P (hero) | P (hero) | P (hero) | P (hero) |
| **Primary Tier** | | | | | |
| cap_rate | P | — | — | — | — |
| coc_return | P | — | — | P | — |
| dscr | P | — | — | — | P |
| rent_to_price_ratio (1% rule) | P | — | — | — | — |
| annual_cash_flow | P | — | — | — | P |
| five_year_total_return | — | — | — | P | P |
| profit_at_ask | — | P | — | — | — |
| break_even_price | — | P | — | — | — |
| recommendation (verdict) | — | P | — | — | — |
| roi | — | — | P | — | — |
| annualized_roi | — | — | P | — | — |
| total_cost | — | — | P | — | — |
| profit_margin_pct | — | — | P | — | — |
| refi_proceeds | — | — | — | P | — |
| equity_captured | — | — | — | P | — |
| capital_recycled_pct | — | — | — | P | — |
| equity_day_one | — | — | — | — | P |
| effective_yield | — | — | — | — | — |
| **Secondary Tier (behind expandable)** | | | | | |
| monthly_pi | S | — | — | — | — |
| break_even_rent | S | — | — | — | — |
| expense_ratio | S | — | — | — | — |
| debt_yield | ~~S~~ REMOVE | — | — | — | — |
| mao_65 | — | S | — | — | — |
| mao_75 | — | S | — | — | — |
| closing_costs | — | S | — | — | — |
| assignment_fee_pct_arv | — | S | — | — | — |
| selling_costs | — | — | S | — | — |
| cost_per_sqft_rehab | — | — | S | — | — |
| five_year_total_return (flip) | — | — | S | — | — |
| monthly_cash_flow (brrrr supporting) | — | — | — | S | — |
| infinite_return | — | — | — | S | — |
| forced_appreciation | — | — | — | S | — |
| wrap_spread_monthly | — | — | — | — | S |
| sub_to_risk_score | — | — | — | — | S |
| effective_yield | — | — | — | — | S |

**Count summary:**

| Strategy | Hero | Primary | Secondary | Total |
|---|---|---|---|---|
| Buy & Hold | 1 | 5 | 3 | 9 (was 11) |
| Wholesale | 1 | 3 | 4 | 8 (was 8) |
| Flip | 1 | 4 | 3 | 8 (was 8) |
| BRRRR | 1 | 5 | 3 | 9 (was 9) |
| Creative Finance | 1 | 4 | 3 | 8 (was 8) |

**Notable decisions:**
- **Debt Yield removed entirely** from buy_and_hold. No competitor shows it, no investor mentioned it, it's an institutional metric.
- **Wholesale has only 3 primary metrics** because wholesalers need the fastest go/no-go. MAO + Profit at Ask + Verdict = done in 5 seconds.
- **BRRRR shows refi_proceeds + equity_captured + capital_recycled as primary** because the BRRRR-specific question is "how much of my capital do I get back?" These three metrics answer it directly.
- **Creative Finance shows DSCR as primary** because it's the loan qualification metric, and many creative finance investors use DSCR loans.

---

## 6. File Change Manifest

### Sprint A — Layout Restructuring

**New files:**
- `frontend/src/pages/analyze/components/VerdictBadge.tsx` (~80-100 lines)

**Modified files:**
- `frontend/src/pages/analyze/AnalysisResultsPage.tsx` — add VerdictBadge to layout, restructure grid (inputs full-width, matrix in collapsible), add expandable wrapper for sensitivity matrix
- `frontend/src/pages/analyze/components/NarrativeCard.tsx` — add truncation logic, "Read full analysis" toggle
- `frontend/src/pages/analyze/components/KeyMetrics.tsx` — split metrics into primary/secondary tiers, add "More Metrics" expandable

**Files read but not modified:**
- `backend/core/calculators/risk_score.py` (reference for thresholds)
- `backend/core/calculators/wholesale.py` (reference for recommendation field)

### Sprint B — Enrichment

**New files:**
- `frontend/src/pages/analyze/components/MetricTooltips.ts` (~200-250 lines, config/constants)
- `frontend/src/pages/analyze/components/WaterfallChart.tsx` (~150-180 lines)

**Modified files:**
- `frontend/src/pages/analyze/components/KeyMetrics.tsx` — add HelpCircle + Popover per metric
- `frontend/src/pages/analyze/AnalysisResultsPage.tsx` — add WaterfallChart to layout
- `frontend/src/pages/analyze/components/CashFlowChart.tsx` — add horizon toggle (10/20/30yr)

### Sprint C — Reverse Calculator

**New files:**
- `backend/core/calculators/reverse_valuation.py` (~120-150 lines)
- `frontend/src/pages/analyze/components/ReverseCalculatorModal.tsx` (~200-250 lines)

**Modified files:**
- `backend/routers/calculators.py` (or `analysis.py`) — add POST `/api/analysis/reverse-calculate` endpoint
- `backend/schemas/analysis.py` — add ReverseCalculateRequest/Response schemas
- `frontend/src/pages/analyze/AnalysisResultsPage.tsx` — add calculator trigger button + modal state
- `frontend/src/lib/api.ts` — add `api.analysis.reverseCalculate()` method

### Total File Count

| Category | New | Modified | Total |
|---|---|---|---|
| Sprint A | 1 | 3 | 4 |
| Sprint B | 2 | 3 | 5 |
| Sprint C | 2 | 4 | 6 |
| **Combined** | **5** | **7 unique** | **12** |

Note: `AnalysisResultsPage.tsx` and `KeyMetrics.tsx` are modified in both Sprint A and B. No database migrations required. No model changes required. The backend's existing `outputs` JSONB field already contains all needed data.

---

## 7. Appendix: Things I Would NOT Do

1. **Don't add a separate "deal score" that's different from the risk score.** Two competing scores = confusion. Unify.

2. **Don't move the AI narrative below the fold.** It's Parcel's #1 differentiator. Truncate it instead.

3. **Don't add neighborhood context (schools, crime, walkability) in this sprint.** The research marks it "nice-to-have" and it requires new data sources. Separate initiative.

4. **Don't add a property image in this sprint.** The research marks it "nice-to-have" and it requires either MLS integration or a new data source. Separate initiative.

5. **Don't use a Sheet (side panel) for the reverse calculator.** A Sheet implies persistent context (like a settings panel). The reverse calculator is a focused, transient calculation — Dialog is the right pattern.

6. **Don't build the "shareable analysis link" in this sprint.** It's marked "must-have" in the research, but it's an entirely separate feature (auth, link generation, read-only view) that doesn't belong in a UX restructuring sprint. File it for the next initiative.

7. **Don't add a "timeline slider" for flip holding period in this sprint.** Good idea from the research, but it's a new input mechanism that touches FinancialInputs, the flip calculator, and the sensitivity matrix. Separate ticket.

8. **Don't persist expandable open/closed states.** It adds complexity (localStorage, user preferences) for minimal benefit. Default closed is the right call; power users will click once and not complain.
