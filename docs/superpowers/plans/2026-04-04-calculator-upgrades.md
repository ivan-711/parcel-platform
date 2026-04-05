# Calculator Upgrades + Multi-Strategy Comparison Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance all 5 calculators with richer outputs, add a backend compare endpoint with recommendation engine, and upgrade the frontend with comparison table, sensitivity toggle, and break-even chart.

**Architecture:** Calculator enhancements are additive — each calculator's return dict gets new keys appended. A shared `_common_projections()` helper computes break-even, 5yr equity, expense breakdown. The compare endpoint reuses existing field mapping + defaults. Frontend adds new components inline with existing AnalysisResultsPage structure.

**Tech Stack:** Python (FastAPI), TypeScript (React, Recharts, Tailwind)

---

## Task 1: Common Projection Helper

**Files:**
- Create: `backend/core/calculators/projections.py`

This helper computes the common enhanced fields that ALL calculators will use. Keeping it separate avoids duplicating logic across 5 calculators.

- [ ] **Step 1: Create the projections helper**

```python
# backend/core/calculators/projections.py
"""Common projection calculations shared by all strategy calculators."""

import math
from .utils import pmt


def compute_common_projections(
    purchase_price: float,
    total_investment: float,
    monthly_cash_flow: float,
    monthly_pi: float = 0,
    loan_amount: float = 0,
    interest_rate: float = 0,
    loan_term_years: int = 30,
    appreciation_rate: float = 3.0,
    monthly_taxes: float = 0,
    monthly_insurance: float = 0,
    monthly_vacancy: float = 0,
    monthly_maintenance: float = 0,
    monthly_capex: float = 0,
    monthly_management: float = 0,
    monthly_hoa: float = 0,
) -> dict:
    """Compute break-even, 5-year projections, and expense breakdown.

    Returns dict with keys:
        break_even_months, total_investment, annual_cash_flow,
        five_year_equity, five_year_total_return, monthly_expense_breakdown
    """
    annual_cash_flow = round(monthly_cash_flow * 12, 2)

    # Break-even: months until cumulative cash flow covers investment
    if monthly_cash_flow > 0 and total_investment > 0:
        break_even_months = math.ceil(total_investment / monthly_cash_flow)
    else:
        break_even_months = None

    # 5-year equity: appreciation + principal paydown
    appreciation_5yr = purchase_price * ((1 + appreciation_rate / 100) ** 5 - 1)

    # Principal paid in 60 months
    principal_paid_5yr = 0.0
    if loan_amount > 0 and interest_rate > 0 and monthly_pi > 0:
        monthly_rate = interest_rate / 100 / 12
        balance = loan_amount
        for _ in range(60):
            interest = balance * monthly_rate
            principal = monthly_pi - interest
            if principal > balance:
                principal = balance
            balance -= principal
            principal_paid_5yr += principal
            if balance <= 0:
                break
    elif loan_amount > 0 and interest_rate == 0 and monthly_pi > 0:
        # 0% loan: all principal
        principal_paid_5yr = min(monthly_pi * 60, loan_amount)

    five_year_equity = round(appreciation_5yr + principal_paid_5yr, 2)
    five_year_total_return = round(annual_cash_flow * 5 + five_year_equity, 2)

    monthly_expense_breakdown = {
        "mortgage": round(monthly_pi, 2),
        "taxes": round(monthly_taxes, 2),
        "insurance": round(monthly_insurance, 2),
        "vacancy": round(monthly_vacancy, 2),
        "maintenance": round(monthly_maintenance, 2),
        "capex": round(monthly_capex, 2),
        "management": round(monthly_management, 2),
        "hoa": round(monthly_hoa, 2),
    }

    return {
        "break_even_months": break_even_months,
        "total_investment": round(total_investment, 2),
        "annual_cash_flow": annual_cash_flow,
        "five_year_equity": five_year_equity,
        "five_year_total_return": five_year_total_return,
        "monthly_expense_breakdown": monthly_expense_breakdown,
    }
```

- [ ] **Step 2: Verify syntax**

Run: `cd backend && python3 -m py_compile core/calculators/projections.py && echo "OK"`

- [ ] **Step 3: Commit**

```bash
git add backend/core/calculators/projections.py
git commit -m "feat: add common projection helper for calculator enhancements"
```

---

## Task 2: Enhance Buy & Hold Calculator

**Files:**
- Modify: `backend/core/calculators/buy_and_hold.py`

- [ ] **Step 1: Add enhanced outputs to buy_and_hold**

Add import at top:
```python
from .projections import compute_common_projections
```

At the end of `calculate_buy_and_hold`, before the `return`, compute and merge the new fields:

```python
    # Enhanced outputs
    vacancy_amount = monthly_rent * (vacancy_rate_pct / 100)
    rent_to_price_ratio = round((monthly_rent / purchase_price) * 100, 4) if purchase_price > 0 else 0
    expense_ratio = round((total_monthly_expenses / effective_gross_income) * 100, 2) if effective_gross_income > 0 else 0
    debt_yield = round((annual_noi / loan_amount) * 100, 2) if loan_amount > 0 else 0

    projections = compute_common_projections(
        purchase_price=purchase_price,
        total_investment=down_payment,
        monthly_cash_flow=monthly_cash_flow,
        monthly_pi=monthly_pi,
        loan_amount=loan_amount,
        interest_rate=interest_rate,
        loan_term_years=loan_term_years,
        monthly_taxes=monthly_taxes,
        monthly_insurance=monthly_insurance,
        monthly_vacancy=vacancy_amount,
        monthly_maintenance=monthly_maintenance,
        monthly_management=monthly_mgmt,
    )
```

Then extend the return dict (add to existing return, don't replace):

```python
    result = {
        # ... all existing keys stay ...
    }
    result.update(projections)
    result["rent_to_price_ratio"] = rent_to_price_ratio
    result["expense_ratio"] = expense_ratio
    result["debt_yield"] = debt_yield
    return result
```

- [ ] **Step 2: Verify syntax**

Run: `cd backend && python3 -m py_compile core/calculators/buy_and_hold.py && echo "OK"`

- [ ] **Step 3: Commit**

```bash
git add backend/core/calculators/buy_and_hold.py
git commit -m "feat: add enhanced outputs to buy_and_hold calculator"
```

---

## Task 3: Enhance BRRRR Calculator

**Files:**
- Modify: `backend/core/calculators/brrrr.py`

- [ ] **Step 1: Add enhanced outputs to BRRRR**

Add import:
```python
from .projections import compute_common_projections
```

After existing calculations, before the `return`:

```python
    # Enhanced outputs
    infinite_return = money_left_in <= 0
    forced_appreciation = arv_post_rehab - purchase_price - rehab_costs
    refinance_proceeds = refi_proceeds  # alias for clarity

    projections = compute_common_projections(
        purchase_price=purchase_price,
        total_investment=money_left_in if money_left_in > 0 else all_in,
        monthly_cash_flow=monthly_cash_flow,
        monthly_pi=monthly_pi,
        loan_amount=refi_proceeds,
        interest_rate=new_loan_rate,
        loan_term_years=new_loan_term_years,
        monthly_expenses=monthly_expenses,  # lumped — no breakdown available
    )
```

Extend the return dict:

```python
    result = {
        # ... all existing keys ...
    }
    result.update(projections)
    result["infinite_return"] = infinite_return
    result["forced_appreciation"] = round(forced_appreciation, 2)
    result["refinance_proceeds"] = round(refinance_proceeds, 2)
    result["cash_left_in_deal"] = round(money_left_in, 2)
    result["equity_captured_at_refi"] = round(equity_captured, 2)
    return result
```

- [ ] **Step 2: Verify syntax**

Run: `cd backend && python3 -m py_compile core/calculators/brrrr.py && echo "OK"`

- [ ] **Step 3: Commit**

```bash
git add backend/core/calculators/brrrr.py
git commit -m "feat: add enhanced outputs to BRRRR calculator"
```

---

## Task 4: Enhance Wholesale Calculator

**Files:**
- Modify: `backend/core/calculators/wholesale.py`

- [ ] **Step 1: Add enhanced outputs to wholesale**

Add import:
```python
from .projections import compute_common_projections
```

After existing calculations, before the `return`:

```python
    # Enhanced outputs — MAO spread analysis
    assignment_fee = desired_profit
    mao_65 = (arv * 0.65) - repair_costs - desired_profit
    mao_75 = (arv * 0.75) - repair_costs - desired_profit
    assignment_fee_pct_arv = round((desired_profit / arv) * 100, 2) if arv > 0 else 0

    # Wholesale has no ongoing cash flow — projections are minimal
    projections = compute_common_projections(
        purchase_price=asking_price,
        total_investment=asking_price,
        monthly_cash_flow=0,
    )
    # Override: wholesale break-even is immediate (one transaction)
    projections["break_even_months"] = 0 if profit_at_ask > 0 else None
    projections["five_year_total_return"] = round(profit_at_ask, 2)
```

Extend the return dict:

```python
    result = {
        # ... all existing keys ...
    }
    result.update(projections)
    result["mao_65"] = round(mao_65, 2)
    result["mao_70"] = round(mao, 2)  # same as mao, for consistency with spread_analysis
    result["mao_75"] = round(mao_75, 2)
    result["assignment_fee_pct_arv"] = assignment_fee_pct_arv
    return result
```

- [ ] **Step 2: Verify syntax**

Run: `cd backend && python3 -m py_compile core/calculators/wholesale.py && echo "OK"`

- [ ] **Step 3: Commit**

```bash
git add backend/core/calculators/wholesale.py
git commit -m "feat: add enhanced outputs to wholesale calculator"
```

---

## Task 5: Enhance Flip Calculator

**Files:**
- Modify: `backend/core/calculators/flip.py`

- [ ] **Step 1: Add enhanced outputs to flip**

Add import:
```python
from .projections import compute_common_projections
```

After existing calculations, before the `return`:

```python
    # Enhanced outputs
    sqft = inputs.get("sqft")
    cost_per_sqft_rehab = round(rehab_budget / sqft, 2) if sqft and sqft > 0 else None

    # Holding cost breakdown
    monthly_holding = financing_costs / holding_months if holding_months > 0 else 0
    holding_cost_breakdown = {
        "monthly_payment": round(monthly_holding, 2),
        "taxes": round(inputs.get("monthly_taxes", 0), 2),
        "insurance": round(inputs.get("monthly_insurance", 0), 2),
        "utilities": round(inputs.get("monthly_utilities", 0), 2),
        "other": 0,
    }

    # Flip has no ongoing cash flow — projections reflect one-time profit
    projections = compute_common_projections(
        purchase_price=purchase_price,
        total_investment=total_invested,
        monthly_cash_flow=0,
    )
    projections["break_even_months"] = holding_months if gross_profit > 0 else None
    projections["five_year_total_return"] = round(gross_profit, 2)
```

Extend the return dict:

```python
    result = {
        # ... all existing keys ...
    }
    result.update(projections)
    result["cost_per_sqft_rehab"] = cost_per_sqft_rehab
    result["holding_cost_breakdown"] = holding_cost_breakdown
    result["roi_annualized"] = round(annualized_roi, 2)
    result["profit_margin"] = round(profit_margin_pct, 2)
    return result
```

- [ ] **Step 2: Verify syntax**

Run: `cd backend && python3 -m py_compile core/calculators/flip.py && echo "OK"`

- [ ] **Step 3: Commit**

```bash
git add backend/core/calculators/flip.py
git commit -m "feat: add enhanced outputs to flip calculator"
```

---

## Task 6: Enhance Creative Finance Calculator

**Files:**
- Modify: `backend/core/calculators/creative_finance.py`

- [ ] **Step 1: Add enhanced outputs to creative finance**

Add import:
```python
from .projections import compute_common_projections
```

After existing calculations, before the `return`:

```python
    # Enhanced outputs
    # Wrap spread (if wrap inputs available)
    wrap_payment_received = inputs.get("wrap_payment", 0)
    wrap_spread_monthly = round(wrap_payment_received - monthly_payment, 2) if wrap_payment_received else None

    effective_interest_rate = round(new_rate, 2)

    # Seller benefit analysis
    total_interest_earned = 0
    if finance_type == "seller_finance" and new_rate > 0:
        total_payments = monthly_payment * new_term_years * 12
        total_interest_earned = round(total_payments - existing_loan_balance, 2)
    balloon_risk = "none"
    if inputs.get("has_balloon"):
        balloon_months = inputs.get("balloon_months", 0)
        if balloon_months and balloon_months < 36:
            balloon_risk = "high"
        elif balloon_months and balloon_months < 84:
            balloon_risk = "moderate"

    seller_benefit_analysis = {
        "total_interest_earned": total_interest_earned,
        "monthly_income": round(monthly_payment, 2),
        "balloon_risk": balloon_risk,
    }

    # Sub-to risk score (simple heuristic)
    sub_to_risk_score = 50  # baseline
    if finance_type == "subject_to":
        # Higher risk for conventional loans, lower for FHA/VA
        loan_type = str(inputs.get("loan_type", "conventional")).lower()
        if loan_type in ("fha", "va"):
            sub_to_risk_score = 25
        elif loan_type == "portfolio":
            sub_to_risk_score = 40
        else:
            sub_to_risk_score = 65
        # Lower risk if good payment history
        if inputs.get("payment_history_months", 0) > 24:
            sub_to_risk_score = max(sub_to_risk_score - 10, 0)

    projections = compute_common_projections(
        purchase_price=arv,
        total_investment=max(equity_day_one, 0) if equity_day_one > 0 else float(inputs.get("down_payment", 0)),
        monthly_cash_flow=monthly_cash_flow,
        monthly_pi=monthly_payment,
        loan_amount=existing_loan_balance,
        interest_rate=new_rate,
        loan_term_years=new_term_years,
    )
```

Extend the return dict:

```python
    result = {
        # ... all existing keys ...
    }
    result.update(projections)
    result["wrap_spread_monthly"] = wrap_spread_monthly
    result["effective_interest_rate"] = effective_interest_rate
    result["seller_benefit_analysis"] = seller_benefit_analysis
    result["sub_to_risk_score"] = sub_to_risk_score
    return result
```

- [ ] **Step 2: Verify syntax**

Run: `cd backend && python3 -m py_compile core/calculators/creative_finance.py && echo "OK"`

- [ ] **Step 3: Commit**

```bash
git add backend/core/calculators/creative_finance.py
git commit -m "feat: add enhanced outputs to creative_finance calculator"
```

---

## Task 7: Compare Endpoint

**Files:**
- Modify: `backend/routers/analysis.py` (add compare endpoint)

- [ ] **Step 1: Add compare schemas**

Add these schemas to `backend/schemas/analysis.py` (or add them inline — check which pattern the file uses). If the file uses Pydantic models, add:

Read `backend/schemas/analysis.py` first to see the pattern, then add at the end:

```python
class CompareRequest(BaseModel):
    property_id: Optional[UUID] = None
    inputs: dict

class StrategyResult(BaseModel):
    strategy: str
    key_metric: Optional[float] = None
    key_metric_label: str
    roi: Optional[float] = None
    risk_score: int = 50
    time_horizon: str
    break_even_months: Optional[int] = None
    five_year_total_return: Optional[float] = None
    monthly_cash_flow: Optional[float] = None
    verdict: str
    outputs: dict = {}

class CompareResponse(BaseModel):
    strategies: list[StrategyResult] = []
    recommendation: str = ""
    recommendation_reason: str = ""
```

- [ ] **Step 2: Add compare endpoint to analysis router**

Add at the end of `backend/routers/analysis.py`:

```python
# ---------------------------------------------------------------------------
# POST /api/analysis/compare — run all 5 strategies and recommend
# ---------------------------------------------------------------------------

@router.post("/compare")
async def compare_strategies(
    body: CompareRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Run all 5 strategies with the same inputs and return comparison + recommendation."""
    import importlib

    strategies = ["wholesale", "brrrr", "buy_and_hold", "flip", "creative_finance"]

    KEY_METRICS = {
        "wholesale": ("mao", "Max Allowable Offer"),
        "buy_and_hold": ("monthly_cash_flow", "Monthly Cash Flow"),
        "brrrr": ("money_left_in", "Cash Left in Deal"),
        "flip": ("gross_profit", "Gross Profit"),
        "creative_finance": ("monthly_cash_flow", "Monthly Cash Flow"),
    }

    TIME_HORIZONS = {
        "wholesale": "immediate",
        "flip": "short",
        "brrrr": "medium",
        "buy_and_hold": "long",
        "creative_finance": "long",
    }

    results: list[StrategyResult] = []

    for strategy in strategies:
        try:
            # Build strategy-specific inputs using existing field mapping
            inputs = _map_canonical_inputs(strategy, body.inputs)
            _apply_strategy_defaults(strategy, inputs)

            calc_mod = importlib.import_module(f"core.calculators.{strategy}")
            calc_fn = getattr(calc_mod, f"calculate_{strategy}")
            risk_mod = importlib.import_module("core.calculators.risk_score")

            outputs = calc_fn(inputs)
            risk_score = risk_mod.calculate_risk_score(strategy, inputs, outputs)

            key_field, key_label = KEY_METRICS[strategy]
            key_metric = outputs.get(key_field)
            if isinstance(key_metric, (int, float)):
                key_metric = round(key_metric, 2)

            # Generate verdict
            verdict = _generate_verdict(strategy, outputs)

            results.append(StrategyResult(
                strategy=strategy,
                key_metric=key_metric if isinstance(key_metric, (int, float)) else None,
                key_metric_label=key_label,
                roi=outputs.get("roi") or outputs.get("coc_return"),
                risk_score=risk_score,
                time_horizon=TIME_HORIZONS[strategy],
                break_even_months=outputs.get("break_even_months"),
                five_year_total_return=outputs.get("five_year_total_return"),
                monthly_cash_flow=outputs.get("monthly_cash_flow"),
                verdict=verdict,
                outputs=outputs,
            ))
        except Exception as e:
            logger.warning("Compare: %s failed: %s", strategy, e)
            results.append(StrategyResult(
                strategy=strategy,
                key_metric=None,
                key_metric_label=KEY_METRICS[strategy][1],
                risk_score=50,
                time_horizon=TIME_HORIZONS[strategy],
                verdict=f"Could not calculate: {str(e)[:60]}",
            ))

    # Pick recommendation
    recommendation, reason = _pick_recommendation(results)

    try:
        from core.telemetry import track_event
        track_event(current_user.id, "strategy_compared", {
            "recommendation": recommendation,
            "strategy_count": len([r for r in results if r.key_metric is not None]),
        })
    except Exception:
        pass

    return CompareResponse(
        strategies=results,
        recommendation=recommendation,
        recommendation_reason=reason,
    )


def _map_canonical_inputs(strategy: str, inputs: dict) -> dict:
    """Map canonical input names to strategy-specific calculator names."""
    mapped = {}

    # Direct pass-through
    for key in ["purchase_price", "down_payment_pct"]:
        if key in inputs:
            mapped[key] = inputs[key]

    # Rent
    rent = inputs.get("monthly_rent", 0)
    if strategy == "creative_finance":
        mapped["monthly_rent_estimate"] = rent
    else:
        mapped["monthly_rent"] = rent

    # ARV
    arv = inputs.get("arv") or inputs.get("after_repair_value", 0)
    if strategy == "brrrr":
        mapped["arv_post_rehab"] = arv
    else:
        mapped["arv"] = arv

    # Repair cost
    repair = inputs.get("repair_cost", 0)
    if strategy == "flip":
        mapped["rehab_budget"] = repair
    elif strategy == "brrrr":
        mapped["rehab_costs"] = repair
    else:
        mapped["repair_costs"] = repair

    # Interest rate
    rate = inputs.get("interest_rate", 0)
    if strategy == "creative_finance":
        mapped["new_rate"] = rate
    elif strategy == "brrrr":
        mapped["new_loan_rate"] = rate
    else:
        mapped["interest_rate"] = rate

    # Loan term
    term = inputs.get("loan_term_years", 30)
    if strategy == "brrrr":
        mapped["new_loan_term_years"] = term
    elif strategy == "creative_finance":
        mapped["new_term_years"] = term
    else:
        mapped["loan_term_years"] = term

    # Pass through any other inputs (strategy-specific ones the user may have set)
    for key, val in inputs.items():
        if key not in mapped and key not in ("monthly_rent", "arv", "after_repair_value", "repair_cost", "interest_rate", "loan_term_years"):
            mapped[key] = val

    return mapped


def _generate_verdict(strategy: str, outputs: dict) -> str:
    """Generate a short template-based verdict for a strategy."""
    cf = outputs.get("monthly_cash_flow", 0)
    if strategy == "wholesale":
        profit = outputs.get("profit_at_ask", 0)
        rec = outputs.get("recommendation", "pass")
        if rec == "strong":
            return f"Strong deal — ${abs(int(profit)):,} below MAO"
        elif rec == "marginal":
            return "Marginal — thin spread at asking price"
        return "Pass — asking price exceeds MAO"
    elif strategy == "buy_and_hold":
        if cf and cf > 0:
            return f"Positive cash flow at ${int(cf):,}/mo"
        return "Negative cash flow — needs better terms or price"
    elif strategy == "brrrr":
        mli = outputs.get("money_left_in", 0)
        if mli <= 0:
            return "Infinite return — all capital recycled"
        return f"${int(mli):,} left in deal after refi"
    elif strategy == "flip":
        profit = outputs.get("gross_profit", 0)
        months = outputs.get("holding_months", 0) if "holding_months" in outputs else 0
        if profit and profit > 0:
            return f"${int(profit):,} profit projected"
        return "Negative profit — deal doesn't pencil"
    elif strategy == "creative_finance":
        if cf and cf > 0:
            return f"Creative terms yield ${int(cf):,}/mo"
        return "Negative cash flow on creative terms"
    return "Analysis complete"


def _pick_recommendation(results: list) -> tuple[str, str]:
    """Pick the best strategy based on weighted scoring."""
    best = None
    best_score = -999

    for r in results:
        if r.key_metric is None:
            continue

        score = 0.0

        # Cash flow strength (30%)
        cf = r.monthly_cash_flow or 0
        score += min(cf / 500, 1.0) * 30  # $500/mo = max score

        # Risk-adjusted return (25%) — lower risk = higher score
        score += max(0, (100 - r.risk_score) / 100) * 25

        # Capital efficiency (20%)
        roi = r.roi or 0
        score += min(roi / 20, 1.0) * 20  # 20% ROI = max score

        # Time horizon preference (15%) — medium preferred
        horizon_scores = {"immediate": 8, "short": 10, "medium": 15, "long": 12}
        score += horizon_scores.get(r.time_horizon, 10)

        # Simplicity (10%) — wholesale/buy_and_hold simpler
        simplicity = {"wholesale": 10, "buy_and_hold": 8, "flip": 6, "brrrr": 5, "creative_finance": 4}
        score += simplicity.get(r.strategy, 5)

        if score > best_score:
            best_score = score
            best = r

    if not best:
        return ("buy_and_hold", "Insufficient data to recommend — defaulting to buy & hold")

    reasons = {
        "wholesale": "Quick liquidity with minimal capital risk",
        "buy_and_hold": "Strongest risk-adjusted long-term return for this property",
        "brrrr": "Best capital recycling — maximize portfolio growth",
        "flip": "Highest short-term profit potential",
        "creative_finance": "Creative terms unlock cash flow without traditional financing",
    }

    return (best.strategy, reasons.get(best.strategy, "Best overall score across risk, return, and feasibility"))
```

- [ ] **Step 3: Add imports at the top of analysis.py**

Add the schema imports:
```python
from schemas.analysis import CompareRequest, StrategyResult, CompareResponse
```

- [ ] **Step 4: Verify syntax**

Run: `cd backend && python3 -m py_compile routers/analysis.py && echo "OK"`

- [ ] **Step 5: Commit**

```bash
git add backend/routers/analysis.py backend/schemas/analysis.py
git commit -m "feat: add compare endpoint with recommendation engine"
```

---

## Task 8: Frontend Types + API Client

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 1: Add comparison types**

At the end of `frontend/src/types/index.ts`, add:

```typescript
// ---------------------------------------------------------------------------
// Strategy Comparison types
// ---------------------------------------------------------------------------

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

- [ ] **Step 2: Add compare API method**

In `frontend/src/lib/api.ts`, inside the `analysis` namespace, add:

```typescript
    compare: (inputs: Record<string, number | string>) =>
      request<import('@/types').CompareResponse>('/api/analysis/compare', {
        method: 'POST',
        body: JSON.stringify({ inputs }),
      }),
```

- [ ] **Step 3: Verify build**

Run: `cd frontend && npx vite build 2>&1 | tail -5`

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/lib/api.ts
git commit -m "feat: add comparison types and API client method"
```

---

## Task 9: Break-Even Chart Component

**Files:**
- Create: `frontend/src/pages/analyze/components/BreakEvenChart.tsx`

- [ ] **Step 1: Create BreakEvenChart**

```typescript
// frontend/src/pages/analyze/components/BreakEvenChart.tsx
import { useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine, ReferenceDot, ResponsiveContainer } from 'recharts'
import type { ScenarioDetail } from '@/types'

interface Props {
  scenario: ScenarioDetail
}

export function BreakEvenChart({ scenario }: Props) {
  const outputs = scenario.outputs || {}
  const totalInvestment = Number(outputs.total_investment || 0)
  const monthlyCashFlow = Number(outputs.monthly_cash_flow || 0)
  const breakEvenMonths = outputs.break_even_months as number | null

  const data = useMemo(() => {
    if (!totalInvestment || !monthlyCashFlow) return []
    const points = []
    for (let m = 0; m <= 60; m++) {
      const cumulative = -totalInvestment + monthlyCashFlow * m
      points.push({ month: m, cumulative: Math.round(cumulative) })
    }
    return points
  }, [totalInvestment, monthlyCashFlow])

  if (!totalInvestment || monthlyCashFlow <= 0 || data.length === 0) return null

  return (
    <div className="bg-[#141311] border border-[#1E1D1B] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[11px] text-[#8A8580] uppercase tracking-wider font-medium">
          Break-Even Timeline
        </h3>
        {breakEvenMonths != null && (
          <span className="text-xs text-[#4ADE80]">
            Break-even: Month {breakEvenMonths}
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
          <defs>
            <linearGradient id="breakEvenGreen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4ADE80" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#4ADE80" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="breakEvenRed" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#F87171" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#F87171" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="month"
            tick={{ fill: '#8A8580', fontSize: 10 }}
            axisLine={{ stroke: '#1E1D1B' }}
            tickLine={false}
            tickFormatter={(v) => `${v}mo`}
          />
          <YAxis
            tick={{ fill: '#8A8580', fontSize: 10 }}
            axisLine={{ stroke: '#1E1D1B' }}
            tickLine={false}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#141311', border: '1px solid #1E1D1B', borderRadius: '8px', fontSize: '12px' }}
            labelFormatter={(v) => `Month ${v}`}
            formatter={(v: number) => [`$${v.toLocaleString()}`, 'Cumulative']}
          />
          <ReferenceLine y={0} stroke="#1E1D1B" strokeDasharray="3 3" />
          <Area
            type="monotone"
            dataKey="cumulative"
            stroke="#8B7AFF"
            strokeWidth={2}
            fill="url(#breakEvenGreen)"
          />
          {breakEvenMonths != null && breakEvenMonths <= 60 && (
            <ReferenceDot
              x={breakEvenMonths}
              y={0}
              r={5}
              fill="#4ADE80"
              stroke="#0C0B0A"
              strokeWidth={2}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `cd frontend && npx vite build 2>&1 | tail -5`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/analyze/components/BreakEvenChart.tsx
git commit -m "feat: add break-even timeline chart component"
```

---

## Task 10: Enhanced KeyMetrics with New Outputs

**Files:**
- Modify: `frontend/src/pages/analyze/components/KeyMetrics.tsx`

- [ ] **Step 1: Add new supporting metrics**

Add these new metrics to the `SUPPORTING_METRICS` record. For each strategy, append to the existing arrays:

**buy_and_hold** — add after existing metrics:
```typescript
    { key: 'rent_to_price_ratio', label: '1% RULE', suffix: '%', threshold: { green: 1, yellow: 0.7 } },
    { key: 'expense_ratio', label: 'EXPENSE RATIO', suffix: '%' },
    { key: 'debt_yield', label: 'DEBT YIELD', suffix: '%' },
    { key: 'five_year_total_return', label: '5YR RETURN', prefix: '$' },
```

**wholesale** — add:
```typescript
    { key: 'mao_65', label: 'MAO 65%', prefix: '$' },
    { key: 'mao_75', label: 'MAO 75%', prefix: '$' },
    { key: 'assignment_fee_pct_arv', label: 'FEE % ARV', suffix: '%' },
```

**flip** — add:
```typescript
    { key: 'cost_per_sqft_rehab', label: '$/SQFT REHAB', prefix: '$' },
    { key: 'five_year_total_return', label: 'TOTAL PROFIT', prefix: '$' },
```

**brrrr** — add:
```typescript
    { key: 'infinite_return', label: 'INFINITE RETURN' },
    { key: 'forced_appreciation', label: 'FORCED APPREC.', prefix: '$' },
    { key: 'five_year_total_return', label: '5YR RETURN', prefix: '$' },
```

**creative_finance** — add:
```typescript
    { key: 'wrap_spread_monthly', label: 'WRAP SPREAD', prefix: '$', suffix: '/mo' },
    { key: 'sub_to_risk_score', label: 'SUB-TO RISK' },
    { key: 'five_year_total_return', label: '5YR RETURN', prefix: '$' },
```

Also update the `formatVal` function to handle booleans:
```typescript
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
```

- [ ] **Step 2: Verify build**

Run: `cd frontend && npx vite build 2>&1 | tail -5`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/analyze/components/KeyMetrics.tsx
git commit -m "feat: add enhanced metrics to KeyMetrics display"
```

---

## Task 11: Sensitivity Matrix Toggle

**Files:**
- Modify: `frontend/src/pages/analyze/components/SensitivityMatrix.tsx`

- [ ] **Step 1: Add metric toggle and extend to all strategies**

Rewrite SensitivityMatrix to support metric switching and all strategies:

```typescript
import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { ScenarioDetail } from '@/types'

type SensitivityMetric = 'cash_flow' | 'cap_rate' | 'coc_return' | 'roi'

const METRIC_OPTIONS: { value: SensitivityMetric; label: string }[] = [
  { value: 'cash_flow', label: 'Cash Flow' },
  { value: 'cap_rate', label: 'Cap Rate' },
  { value: 'coc_return', label: 'CoC Return' },
  { value: 'roi', label: 'ROI' },
]

interface Props {
  scenario: ScenarioDetail
}

function calcMetric(
  metric: SensitivityMetric,
  price: number,
  rate: number,
  downPct: number,
  rent: number,
  termYears: number,
  expenseRatio: number,
): number {
  const loan = price * (1 - downPct / 100)
  const monthlyRate = rate / 100 / 12
  const n = termYears * 12
  const pmt = monthlyRate > 0
    ? loan * (monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1)
    : n > 0 ? loan / n : 0
  const expenses = rent * expenseRatio
  const cashFlow = rent - pmt - expenses
  const downPayment = price * (downPct / 100)
  const noi = (rent * (1 - expenseRatio + 0.15)) * 12 // rough NOI approximation (subtract only operating expenses, not mortgage)

  switch (metric) {
    case 'cash_flow':
      return Math.round(cashFlow)
    case 'cap_rate':
      return price > 0 ? Math.round((noi / price) * 1000) / 10 : 0
    case 'coc_return':
      return downPayment > 0 ? Math.round((cashFlow * 12 / downPayment) * 1000) / 10 : 0
    case 'roi':
      return downPayment > 0 ? Math.round((cashFlow * 12 / downPayment) * 1000) / 10 : 0
  }
}

function formatCell(value: number, metric: SensitivityMetric): string {
  if (metric === 'cash_flow') return `$${value.toLocaleString()}`
  return `${value.toFixed(1)}%`
}

export function SensitivityMatrix({ scenario }: Props) {
  const [activeMetric, setActiveMetric] = useState<SensitivityMetric>('cash_flow')

  const basePrice = Number(scenario.purchase_price) || 150000
  const baseRate = Number(scenario.interest_rate) || 7.0
  const downPct = Number(scenario.down_payment_pct) || 20
  const rent = Number(scenario.monthly_rent) || 1200
  const termYears = scenario.loan_term_years || 30
  const expenseRatio = 0.35

  const priceDeltas = [-0.10, -0.05, 0, 0.05, 0.10]
  const rateDeltas = [-1, -0.5, 0, 0.5, 1]

  const matrix = useMemo(() =>
    priceDeltas.map(pd => ({
      priceLabel: pd === 0 ? `$${(basePrice / 1000).toFixed(0)}k` : `${pd > 0 ? '+' : ''}${(pd * 100).toFixed(0)}%`,
      cells: rateDeltas.map(rd => ({
        value: calcMetric(activeMetric, Math.round(basePrice * (1 + pd)), baseRate + rd, downPct, rent, termYears, expenseRatio),
        rateLabel: rd === 0 ? `${baseRate.toFixed(1)}%` : `${rd > 0 ? '+' : ''}${rd.toFixed(1)}%`,
      })),
    })),
  [basePrice, baseRate, downPct, rent, termYears, expenseRatio, activeMetric])

  const isPositive = (v: number) => activeMetric === 'cash_flow' ? v > 0 : v > 0

  return (
    <div className="bg-[#141311] border border-[#1E1D1B] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[11px] text-[#8A8580] uppercase tracking-wider font-medium">
          Sensitivity Analysis
        </h3>
        <div className="flex items-center gap-1 p-0.5 bg-[#0C0B0A] rounded-lg border border-[#1E1D1B]">
          {METRIC_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => {
                setActiveMetric(opt.value)
                try { (window as any).posthog?.capture?.('sensitivity_metric_changed', { from_metric: activeMetric, to_metric: opt.value, strategy: scenario.strategy }) } catch { /* ignore */ }
              }}
              className={cn(
                'px-2 py-1 text-[10px] rounded transition-colors cursor-pointer',
                activeMetric === opt.value
                  ? 'bg-[#8B7AFF]/15 text-[#8B7AFF]'
                  : 'text-[#8A8580] hover:text-[#C5C0B8]'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-center text-sm">
          <thead>
            <tr>
              <th className="text-[10px] text-[#8A8580] uppercase p-2">Price \ Rate</th>
              {rateDeltas.map((rd, i) => (
                <th key={i} className="text-[10px] text-[#8A8580] uppercase p-2">
                  {rd === 0 ? `${baseRate.toFixed(1)}%` : `${rd > 0 ? '+' : ''}${rd.toFixed(1)}%`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, ri) => (
              <tr key={ri}>
                <td className="text-[10px] text-[#8A8580] p-2 text-left">{row.priceLabel}</td>
                {row.cells.map((cell, ci) => {
                  const isCenter = ri === 2 && ci === 2
                  const positive = isPositive(cell.value)
                  const strong = activeMetric === 'cash_flow' ? cell.value > 200 : cell.value > 8
                  const bg = strong ? 'rgba(74,222,128,0.15)' :
                             positive ? 'rgba(74,222,128,0.07)' :
                             'rgba(248,113,113,0.1)'
                  return (
                    <td
                      key={ci}
                      className={`p-2 text-sm font-light ${isCenter ? 'ring-1 ring-[#8B7AFF] rounded' : ''}`}
                      style={{ backgroundColor: bg, color: positive ? '#F0EDE8' : '#F87171' }}
                    >
                      {formatCell(cell.value, activeMetric)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Remove strategy gate in AnalysisResultsPage**

In `AnalysisResultsPage.tsx`, the sensitivity matrix is currently gated to only buy_and_hold/brrrr (line 304):
```typescript
{activeScenario && (activeStrategy === 'buy_and_hold' || activeStrategy === 'brrrr') && (
```

Change to show for all strategies:
```typescript
{activeScenario && (
```

- [ ] **Step 3: Verify build**

Run: `cd frontend && npx vite build 2>&1 | tail -5`

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/analyze/components/SensitivityMatrix.tsx frontend/src/pages/analyze/AnalysisResultsPage.tsx
git commit -m "feat: add sensitivity metric toggle, extend to all strategies"
```

---

## Task 12: Enhanced Strategy Comparison

**Files:**
- Modify: `frontend/src/pages/analyze/components/StrategyComparison.tsx`

- [ ] **Step 1: Rewrite StrategyComparison with comparison table**

```typescript
import { useState, useEffect } from 'react'
import { Loader2, ArrowUpDown, ChevronDown, ChevronRight } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { ScenarioDetail, StrategyResult, CompareResponse } from '@/types'

const STRATEGY_LABELS: Record<string, string> = {
  wholesale: 'Wholesale', brrrr: 'BRRRR', buy_and_hold: 'Buy & Hold',
  flip: 'Flip', creative_finance: 'Creative',
}

type SortKey = 'roi' | 'risk_score' | 'break_even_months' | 'five_year_total_return'

interface Props {
  propertyId: string
  activeStrategy: string
  scenarios: ScenarioDetail[]
  onStrategySwitch: (strategy: string) => void
}

export function StrategyComparison({ propertyId, activeStrategy, scenarios, onStrategySwitch }: Props) {
  const [comparison, setComparison] = useState<CompareResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [sortBy, setSortBy] = useState<SortKey | null>(null)
  const [showReason, setShowReason] = useState(false)

  useEffect(() => {
    if (!scenarios.length) return

    // Build canonical inputs from the first available scenario
    const scenario = scenarios.find(s => s.strategy === activeStrategy) || scenarios[0]
    if (!scenario) return

    const inputs: Record<string, number | string> = {}
    if (scenario.purchase_price) inputs.purchase_price = scenario.purchase_price
    if (scenario.monthly_rent) inputs.monthly_rent = scenario.monthly_rent
    if (scenario.after_repair_value) inputs.arv = scenario.after_repair_value
    if (scenario.repair_cost) inputs.repair_cost = scenario.repair_cost
    if (scenario.down_payment_pct) inputs.down_payment_pct = scenario.down_payment_pct
    if (scenario.interest_rate) inputs.interest_rate = scenario.interest_rate
    if (scenario.loan_term_years) inputs.loan_term_years = scenario.loan_term_years
    if (scenario.inputs_extended) {
      Object.assign(inputs, scenario.inputs_extended)
    }

    setLoading(true)
    api.analysis.compare(inputs)
      .then(setComparison)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [scenarios, activeStrategy])

  if (loading) {
    return (
      <div className="bg-[#141311] border border-[#1E1D1B] rounded-xl p-5 flex items-center justify-center py-12">
        <Loader2 size={20} className="animate-spin text-[#8B7AFF]" />
      </div>
    )
  }

  if (!comparison) return null

  let sorted = [...comparison.strategies]
  if (sortBy) {
    sorted.sort((a, b) => {
      const av = a[sortBy] ?? 999
      const bv = b[sortBy] ?? 999
      return sortBy === 'risk_score' ? (av as number) - (bv as number) : (bv as number) - (av as number)
    })
  }

  const handleSort = (key: SortKey) => {
    setSortBy(sortBy === key ? null : key)
    try { (window as any).posthog?.capture?.('comparison_sorted', { sort_by: key }) } catch { /* ignore */ }
  }

  return (
    <div className="bg-[#141311] border border-[#1E1D1B] rounded-xl p-5">
      <h3 className="text-[11px] text-[#8A8580] uppercase tracking-wider font-medium mb-4">
        Compare Strategies
      </h3>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] text-[#8A8580] uppercase tracking-wider border-b border-[#1E1D1B]">
              <th className="text-left py-2 pr-3">Strategy</th>
              <th className="text-right py-2 px-3">Key Metric</th>
              <th className="text-right py-2 px-3 cursor-pointer hover:text-[#C5C0B8]" onClick={() => handleSort('roi')}>
                ROI <ArrowUpDown size={10} className="inline ml-0.5" />
              </th>
              <th className="text-right py-2 px-3 cursor-pointer hover:text-[#C5C0B8]" onClick={() => handleSort('risk_score')}>
                Risk <ArrowUpDown size={10} className="inline ml-0.5" />
              </th>
              <th className="text-center py-2 px-3">Horizon</th>
              <th className="text-right py-2 px-3 cursor-pointer hover:text-[#C5C0B8]" onClick={() => handleSort('break_even_months')}>
                Break-Even <ArrowUpDown size={10} className="inline ml-0.5" />
              </th>
              <th className="text-right py-2 px-3 cursor-pointer hover:text-[#C5C0B8]" onClick={() => handleSort('five_year_total_return')}>
                5yr Return <ArrowUpDown size={10} className="inline ml-0.5" />
              </th>
              <th className="text-left py-2 pl-3">Verdict</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(r => {
              const isRecommended = r.strategy === comparison.recommendation
              const isActive = r.strategy === activeStrategy
              return (
                <tr
                  key={r.strategy}
                  onClick={() => onStrategySwitch(r.strategy)}
                  className={cn(
                    'border-b border-[#1E1D1B]/50 last:border-0 cursor-pointer transition-colors',
                    isRecommended ? 'bg-[#8B7AFF]/5 border-l-2 border-l-[#8B7AFF]' : 'hover:bg-[#1A1918]',
                    isActive && 'bg-[#1E1D1B]/50'
                  )}
                >
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[#F0EDE8] font-medium">{STRATEGY_LABELS[r.strategy] || r.strategy}</span>
                      {isRecommended && (
                        <span className="text-[9px] bg-[#8B7AFF]/15 text-[#8B7AFF] px-1.5 py-0.5 rounded uppercase tracking-wider">
                          Best
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums text-[#F0EDE8]">
                    {r.key_metric != null ? `$${Math.round(r.key_metric).toLocaleString()}` : '—'}
                    <span className="text-[9px] text-[#8A8580] block">{r.key_metric_label}</span>
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums text-[#F0EDE8]">
                    {r.roi != null ? `${r.roi.toFixed(1)}%` : '—'}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className={cn(
                      'text-xs tabular-nums',
                      r.risk_score <= 33 ? 'text-[#4ADE80]' : r.risk_score <= 66 ? 'text-[#FBBF24]' : 'text-[#F87171]'
                    )}>
                      {r.risk_score}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center text-xs text-[#C5C0B8] capitalize">{r.time_horizon}</td>
                  <td className="py-3 px-3 text-right tabular-nums text-[#C5C0B8]">
                    {r.break_even_months != null ? `${r.break_even_months}mo` : '—'}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums text-[#F0EDE8]">
                    {r.five_year_total_return != null ? `$${Math.round(r.five_year_total_return).toLocaleString()}` : '—'}
                  </td>
                  <td className="py-3 pl-3 text-xs text-[#8A8580] max-w-[200px] truncate">{r.verdict}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {sorted.map(r => {
          const isRecommended = r.strategy === comparison.recommendation
          return (
            <button
              key={r.strategy}
              onClick={() => onStrategySwitch(r.strategy)}
              className={cn(
                'w-full text-left p-3 rounded-lg border transition-colors cursor-pointer',
                isRecommended
                  ? 'bg-[#8B7AFF]/5 border-[#8B7AFF]/30'
                  : 'bg-[#0C0B0A] border-[#1E1D1B] hover:border-[#8B7AFF]/20'
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-[#F0EDE8] font-medium">{STRATEGY_LABELS[r.strategy]}</span>
                {isRecommended && (
                  <span className="text-[9px] bg-[#8B7AFF]/15 text-[#8B7AFF] px-1.5 py-0.5 rounded uppercase tracking-wider">Best</span>
                )}
              </div>
              <p className="text-xs text-[#8A8580]">{r.verdict}</p>
              <div className="flex items-center gap-4 mt-2 text-xs">
                <span className="text-[#F0EDE8] tabular-nums">{r.key_metric != null ? `$${Math.round(r.key_metric).toLocaleString()}` : '—'}</span>
                <span className={r.risk_score <= 33 ? 'text-[#4ADE80]' : r.risk_score <= 66 ? 'text-[#FBBF24]' : 'text-[#F87171]'}>
                  Risk: {r.risk_score}
                </span>
                <span className="text-[#8A8580] capitalize">{r.time_horizon}</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Why this recommendation */}
      {comparison.recommendation_reason && (
        <button
          onClick={() => setShowReason(!showReason)}
          className="flex items-center gap-1 mt-4 text-xs text-[#8B7AFF] hover:text-[#A89FFF] transition-colors cursor-pointer"
        >
          {showReason ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          Why {STRATEGY_LABELS[comparison.recommendation] || comparison.recommendation}?
        </button>
      )}
      {showReason && (
        <p className="mt-2 text-xs text-[#C5C0B8] pl-4 border-l-2 border-[#8B7AFF]/20">
          {comparison.recommendation_reason}
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `cd frontend && npx vite build 2>&1 | tail -5`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/analyze/components/StrategyComparison.tsx
git commit -m "feat: replace strategy comparison cards with rich comparison table + recommendation"
```

---

## Task 13: Wire Break-Even Chart into Results Page

**Files:**
- Modify: `frontend/src/pages/analyze/AnalysisResultsPage.tsx`

- [ ] **Step 1: Add BreakEvenChart import and render**

Add import at top (after CashFlowChart import):
```typescript
import { BreakEvenChart } from './components/BreakEvenChart'
```

After the CashFlowChart section (line 289), add the break-even chart for ALL strategies:
```typescript
        {/* Break-even timeline */}
        {activeScenario && (
          <div className="mb-6">
            <BreakEvenChart scenario={activeScenario} />
          </div>
        )}
```

- [ ] **Step 2: Verify build**

Run: `cd frontend && npx vite build 2>&1 | tail -5`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/analyze/AnalysisResultsPage.tsx
git commit -m "feat: add break-even chart to analysis results page"
```

---

## Summary

| Task | Files | Description |
|------|-------|-------------|
| 1 | `projections.py` (new) | Common projection helper |
| 2 | `buy_and_hold.py` | Enhanced outputs: rent-to-price, expense ratio, debt yield |
| 3 | `brrrr.py` | Enhanced: infinite return, forced appreciation |
| 4 | `wholesale.py` | Enhanced: MAO spread analysis (65/70/75) |
| 5 | `flip.py` | Enhanced: cost/sqft, holding cost breakdown |
| 6 | `creative_finance.py` | Enhanced: wrap spread, seller benefit, sub-to risk |
| 7 | `analysis.py`, `schemas/analysis.py` | Compare endpoint with recommendation engine |
| 8 | `types/index.ts`, `api.ts` | Frontend types + API method |
| 9 | `BreakEvenChart.tsx` (new) | Break-even timeline chart |
| 10 | `KeyMetrics.tsx` | New metrics for all strategies |
| 11 | `SensitivityMatrix.tsx` | Metric toggle + all strategies |
| 12 | `StrategyComparison.tsx` | Rich table with sorting + recommendation |
| 13 | `AnalysisResultsPage.tsx` | Wire break-even chart |
