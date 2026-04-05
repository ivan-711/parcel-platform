# Calculator Upgrades + Multi-Strategy Comparison — Design Spec

## Overview

Enhance all 5 calculators with richer outputs (break-even, 5yr projection, expense breakdown, strategy-specific metrics), add a backend compare endpoint that runs all strategies with the same inputs and returns a recommendation, and upgrade the frontend with comparison table, sensitivity toggle, and break-even chart.

## Design System

Same as all prior sprints — no new tokens.

## Architecture Decisions

- **Compare endpoint**: Uses existing field mapping + `_apply_strategy_defaults()` — user sends one canonical input set, backend translates per strategy
- **Calculator changes**: Extend return dicts only — no signature changes, no refactoring
- **No-touch files**: `deal_calculator.py`, `risk_engine.py`, `financial.py` — extend only, do not rewrite
- **Break-even chart**: Recharts AreaChart (already in the project for CashFlowChart)
- **Sensitivity toggle**: Extends existing SensitivityMatrix component with metric selector

---

## 1. Backend: Calculator Enhancements

### All Strategies — Common New Outputs

Every calculator adds these to its return dict:

```python
"break_even_months": int | None      # months until cumulative cash flow covers total_investment
"total_investment": float             # total cash out of pocket
"annual_cash_flow": float             # monthly_cash_flow * 12
"five_year_equity": float             # purchase appreciation (3%/yr) + principal paydown
"five_year_total_return": float       # 5yr cash flow + equity gain
"monthly_expense_breakdown": {        # itemized monthly costs
    "mortgage": float,
    "taxes": float,
    "insurance": float,
    "vacancy": float,
    "maintenance": float,
    "capex": float,
    "management": float,
    "hoa": float,
}
```

**break_even_months calculation**: `ceil(total_investment / monthly_cash_flow)` if `monthly_cash_flow > 0`, else `None`.

**five_year_equity calculation**: `(purchase_price * (1.03^5) - purchase_price) + (principal_paid_in_60_months)`. For strategies without a mortgage (wholesale, flip), this is just appreciation.

**five_year_total_return**: `(annual_cash_flow * 5) + five_year_equity`.

### Wholesale — Strategy-Specific

```python
"mao_70": float          # ARV * 0.70 - repair_cost - assignment_fee (already `mao`)
"mao_65": float          # ARV * 0.65 - repair_cost - assignment_fee
"mao_75": float          # ARV * 0.75 - repair_cost - assignment_fee
"assignment_fee_pct_arv": float  # assignment_fee / ARV * 100
```

Note: The existing `mao` field already uses 70% rule. `spread_analysis` is the set of MAO variants.

### BRRRR — Strategy-Specific

```python
"refinance_proceeds": float       # arv * refinance_ltv_pct / 100 (already `refi_proceeds`)
"cash_left_in_deal": float        # already `money_left_in`
"infinite_return": bool           # money_left_in <= 0
"forced_appreciation": float      # arv - purchase_price - rehab_costs
"equity_captured_at_refi": float  # already `equity_captured`
```

### Flip — Strategy-Specific

```python
"roi_annualized": float           # already `annualized_roi`
"cost_per_sqft_rehab": float | None  # rehab_budget / sqft if sqft available
"profit_margin": float            # already `profit_margin_pct`
"holding_cost_breakdown": {       # monthly costs * holding_months
    "monthly_payment": float,
    "taxes": float,
    "insurance": float,
    "utilities": float,
    "other": float,
}
```

### Creative Finance — Strategy-Specific

```python
"wrap_spread_monthly": float | None  # wrap_payment - underlying_payment (if wrap)
"effective_interest_rate": float     # the rate the buyer effectively pays
"seller_benefit_analysis": {
    "total_interest_earned": float,  # over loan term
    "monthly_income": float,
    "balloon_risk": str,             # "none" | "moderate" | "high"
}
"sub_to_risk_score": int            # 0-100 based on loan type factors
```

### Buy and Hold — Strategy-Specific

```python
"rent_to_price_ratio": float      # monthly_rent / purchase_price * 100
"gross_rent_multiplier": float    # already `grm`
"expense_ratio": float            # total_expenses / gross_income * 100
"debt_yield": float               # noi / loan_amount * 100
```

---

## 2. Backend: Compare Endpoint

### Endpoint

`POST /api/analysis/compare`

### Request

```python
class CompareRequest(BaseModel):
    property_id: Optional[UUID] = None
    inputs: dict  # canonical inputs: purchase_price, arv, repair_cost, monthly_rent, etc.
```

### Response

```python
class StrategyResult(BaseModel):
    strategy: str
    key_metric: float | None
    key_metric_label: str
    roi: float | None
    risk_score: int
    time_horizon: str              # "immediate" | "short" | "medium" | "long"
    break_even_months: int | None
    five_year_total_return: float | None
    monthly_cash_flow: float | None
    verdict: str                   # one-line summary
    outputs: dict                  # full calculator outputs

class CompareResponse(BaseModel):
    strategies: list[StrategyResult]
    recommendation: str            # best strategy name
    recommendation_reason: str     # why
```

### Implementation

1. For each strategy, map inputs using existing `_apply_strategy_defaults()` logic
2. Run the calculator, catch errors per-strategy (don't fail all if one fails)
3. Compute risk_score per strategy
4. Pick recommendation based on weighted scoring:
   - Cash flow strength (30%)
   - Risk-adjusted return (25%)
   - Capital efficiency (20%)
   - Time horizon match (15%)
   - Simplicity/feasibility (10%)

### Key Metric per Strategy

| Strategy | Key Metric | Label |
|----------|-----------|-------|
| wholesale | mao | "Max Allowable Offer" |
| buy_and_hold | monthly_cash_flow | "Monthly Cash Flow" |
| brrrr | money_left_in | "Cash Left in Deal" |
| flip | gross_profit | "Gross Profit" |
| creative_finance | monthly_cash_flow | "Monthly Cash Flow" |

### Time Horizon per Strategy

| Strategy | Time Horizon |
|----------|-------------|
| wholesale | "immediate" |
| flip | "short" (3-12 months) |
| brrrr | "medium" (6-18 months to stabilize) |
| buy_and_hold | "long" (5+ years) |
| creative_finance | "long" |

### Verdict Generation

Short template-based verdicts, not AI-generated:
- wholesale: "Fast liquidity, ${assignment_fee} spread" or "Thin margins at asking price"
- buy_and_hold: "Strong cash flow at ${monthly_cash_flow}/mo" or "Negative cash flow — needs better terms"
- brrrr: "Infinite return — all capital recycled" or "${money_left_in} left in deal"
- flip: "${gross_profit} profit in {holding_months} months" or "Tight margins, high risk"
- creative_finance: "Creative terms yield ${monthly_cash_flow}/mo" or "Negative cash flow"

---

## 3. Frontend: Enhanced Results Display

### New Metrics in Strategy Tabs

In `KeyMetrics.tsx`, add for each strategy:

- **Break-even timeline**: small horizontal progress bar showing months to break-even (capped at 60mo visual)
- **5-year projection card**: compact card showing five_year_total_return
- **Expense breakdown**: horizontal stacked bar showing the expense_breakdown proportions

### Enhanced Comparison Table

Replace the current `StrategyComparison.tsx` card grid with a proper comparison table:

| Column | Content |
|--------|---------|
| Strategy | Name + icon |
| Key Metric | Primary number |
| ROI | Percentage |
| Risk | Score badge (0-100) |
| Time Horizon | Label |
| Break-Even | Months |
| 5yr Return | Dollar amount |
| Verdict | Short text |

Features:
- Recommended strategy row highlighted with `bg-[#8B7AFF]/5 border-l-[#8B7AFF]`
- Sort buttons: by ROI, by Risk, by Break-Even
- "Why this recommendation?" expandable text below table
- Mobile: cards instead of table (single column)

### Data Source

The comparison section calls the new `POST /api/analysis/compare` endpoint with the current property's inputs. This replaces the current per-strategy lazy loading.

---

## 4. Frontend: Sensitivity Matrix Toggle

### Modify: `SensitivityMatrix.tsx`

Add a metric selector toggle above the matrix:

```
[Cash Flow] [Cap Rate] [CoC Return] [ROI]
```

Each mode computes the same 5x5 grid (price delta vs rate delta) but outputs a different metric:
- **Cash Flow**: monthly_cash_flow (current behavior)
- **Cap Rate**: (annual_noi / adjusted_price) * 100
- **CoC Return**: (annual_cash_flow / down_payment) * 100
- **ROI**: for flip = profit/investment, for others = CoC return

The matrix recomputes client-side using the same pmt() math already in the component.

Extend visibility to all strategies (not just buy_and_hold/brrrr) — wholesale and flip use different axes:
- Wholesale: ARV delta vs Repair Cost delta
- Flip: ARV delta vs Rehab Budget delta

---

## 5. Frontend: Break-Even Chart

### Create: `frontend/src/components/analysis/BreakEvenChart.tsx`

Small Recharts AreaChart:
- X-axis: months 0-60
- Y-axis: cumulative cash flow ($)
- Line: starts at -total_investment, increases by monthly_cash_flow each month
- Break-even point: dot + label "Break-even: Month {N}"
- Area fill: red (#F87171 at 10% opacity) below zero, green (#4ADE80 at 10% opacity) above zero
- Rendered below KeyMetrics for any strategy with positive cash flow

### Data

Generated client-side from `total_investment` and `monthly_cash_flow` in the calculator outputs. No API call needed.

---

## 6. API Client + Types

### Add to `frontend/src/lib/api.ts`:

```typescript
api.analysis.compare = (inputs: Record<string, number | string>) =>
  request<CompareResponse>('/api/analysis/compare', {
    method: 'POST',
    body: JSON.stringify({ inputs }),
  })
```

### Add types to `frontend/src/types/index.ts`:

```typescript
export interface StrategyResult {
  strategy: string
  key_metric: number | null
  key_metric_label: string
  roi: number | null
  risk_score: number
  time_horizon: string
  break_even_months: number | null
  five_year_total_return: number | null
  monthly_cash_flow: number | null
  verdict: string
  outputs: Record<string, number | string | null>
}

export interface CompareResponse {
  strategies: StrategyResult[]
  recommendation: string
  recommendation_reason: string
}
```

---

## 7. PostHog Events

- `strategy_compared` — `{property_id, recommendation, strategy_count}`
- `sensitivity_metric_changed` — `{from_metric, to_metric, strategy}`
- `break_even_chart_viewed` — `{strategy, break_even_months}`
- `comparison_sorted` — `{sort_by}`

---

## Definition of Done

- [ ] All 5 calculators return enhanced outputs (break-even, 5yr projection, expense breakdown)
- [ ] Strategy-specific enhancements added per spec
- [ ] Compare endpoint runs all 5 strategies, returns recommendation
- [ ] Enhanced results display with break-even bar, 5yr card, expense bar
- [ ] Sensitivity matrix toggle between Cash Flow/Cap Rate/CoC/ROI
- [ ] Break-even visualization chart
- [ ] Comparison table with sorting and recommendation highlight
- [ ] Frontend build clean
- [ ] No TypeScript errors
