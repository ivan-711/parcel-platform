"""Reverse-valuation solvers — algebraic solutions for max purchase price.

Each solver answers: "What's the most I can pay to hit my target return?"
After computing the max price, the forward calculator runs at that price to
produce a full scenario the UI can display.

Strategies covered:
- buy_and_hold: max price for target CoC return
- flip: max price for target ROI
- brrrr: max price for target capital recycled %
- creative_finance: max loan balance for target monthly cash flow

Wholesale is skipped — MAO already IS the reverse calculation.
"""

from .utils import pmt


def reverse_buy_and_hold(target_coc: float, inputs: dict) -> float | None:
    """Return max purchase price to achieve target cash-on-cash return.

    Algebra:
        CoC = annual_cf / (P * dp) * 100
        annual_cf = 12 * (eff_rent - expenses - maint - mgmt - pmt_factor * P * (1-dp))
        pmt_factor = r*(1+r)^n / ((1+r)^n - 1)   [monthly payment per $ of principal]

        Solve for P:
        target/100 * dp * P + 12 * pmt_factor * (1-dp) * P = 12 * (eff_rent - expenses - rent*(maint+mgmt))
        P = numerator / denominator
    """
    r = inputs.get("interest_rate", 7.25) / 100 / 12
    n = inputs.get("loan_term_years", 30) * 12
    dp = inputs.get("down_payment_pct", 20) / 100

    rent = inputs.get("monthly_rent", 0)
    vac = inputs.get("vacancy_rate_pct", 8) / 100
    taxes = inputs.get("monthly_taxes", 0)
    insurance = inputs.get("monthly_insurance", 0)
    maint_pct = inputs.get("maintenance_pct", 5) / 100
    mgmt_pct = inputs.get("mgmt_fee_pct", 8) / 100

    effective_rent = rent * (1 - vac)

    if r == 0:
        pmt_factor = 1 / n if n > 0 else 0
    else:
        pmt_factor = r * (1 + r) ** n / ((1 + r) ** n - 1)

    numerator = 12 * (effective_rent - taxes - insurance - rent * (maint_pct + mgmt_pct))
    denominator = (target_coc / 100) * dp + 12 * pmt_factor * (1 - dp)

    if denominator <= 0 or numerator <= 0:
        return None

    price = numerator / denominator
    return round(price, 2) if price > 0 else None


def reverse_buy_and_hold_cap_rate(target_cap_rate: float, inputs: dict) -> float | None:
    """Return max purchase price to achieve target cap rate.

    Algebra:
        cap_rate = annual_noi / P * 100
        P = annual_noi / (target_cap_rate / 100)
        annual_noi = 12 * (eff_rent - taxes - insurance - maint - mgmt)
    """
    rent = inputs.get("monthly_rent", 0)
    vac = inputs.get("vacancy_rate_pct", 8) / 100
    taxes = inputs.get("monthly_taxes", 0)
    insurance = inputs.get("monthly_insurance", 0)
    maint_pct = inputs.get("maintenance_pct", 5) / 100
    mgmt_pct = inputs.get("mgmt_fee_pct", 8) / 100

    effective_rent = rent * (1 - vac)
    monthly_noi = effective_rent - taxes - insurance - rent * maint_pct - rent * mgmt_pct
    annual_noi = monthly_noi * 12

    if target_cap_rate <= 0 or annual_noi <= 0:
        return None

    price = annual_noi / (target_cap_rate / 100)
    return round(price, 2) if price > 0 else None


def reverse_buy_and_hold_cash_flow(target_monthly_cf: float, inputs: dict) -> float | None:
    """Return max purchase price to achieve target monthly cash flow.

    Algebra:
        monthly_cf = eff_rent - taxes - insurance - maint - mgmt - pmt(r, n, P*(1-dp))
        target_cf = eff_rent - expenses_fixed - rent*(maint+mgmt) - pmt_factor * P * (1-dp)
        pmt_factor * (1-dp) * P = eff_rent - expenses_fixed - rent*(maint+mgmt) - target_cf
        P = (eff_rent - expenses_fixed - rent*(maint+mgmt) - target_cf) / (pmt_factor * (1-dp))
    """
    r = inputs.get("interest_rate", 7.25) / 100 / 12
    n = inputs.get("loan_term_years", 30) * 12
    dp = inputs.get("down_payment_pct", 20) / 100

    rent = inputs.get("monthly_rent", 0)
    vac = inputs.get("vacancy_rate_pct", 8) / 100
    taxes = inputs.get("monthly_taxes", 0)
    insurance = inputs.get("monthly_insurance", 0)
    maint_pct = inputs.get("maintenance_pct", 5) / 100
    mgmt_pct = inputs.get("mgmt_fee_pct", 8) / 100

    effective_rent = rent * (1 - vac)

    if r == 0:
        pmt_factor = 1 / n if n > 0 else 0
    else:
        pmt_factor = r * (1 + r) ** n / ((1 + r) ** n - 1)

    denominator = pmt_factor * (1 - dp)
    if denominator <= 0:
        return None

    numerator = effective_rent - taxes - insurance - rent * (maint_pct + mgmt_pct) - target_monthly_cf
    if numerator <= 0:
        return None

    price = numerator / denominator
    return round(price, 2) if price > 0 else None


def reverse_flip(target_roi: float, inputs: dict) -> float | None:
    """Return max purchase price to achieve target ROI on a flip.

    Algebra:
        roi = (arv - P - rehab - financing - selling_costs) / (P + rehab + financing) * 100
        target/100 * (P + rehab + financing) = arv - P - rehab - financing - selling_costs
        P * (1 + target/100) = arv - (rehab + financing) - selling_costs - target/100 * (rehab + financing)
        P = numerator / (1 + target/100)
    """
    arv = inputs.get("arv", 0) or inputs.get("after_repair_value", 0)
    rehab = inputs.get("rehab_budget", 0) or inputs.get("repair_cost", 0)
    selling_costs_pct = inputs.get("selling_costs_pct", 8)
    financing = inputs.get("financing_costs", 0)

    selling_costs = arv * (selling_costs_pct / 100)
    other_costs = rehab + financing
    t = target_roi / 100

    denominator = 1 + t
    if denominator <= 0:
        return None

    numerator = arv - other_costs - selling_costs - t * other_costs
    price = numerator / denominator

    return round(price, 2) if price > 0 else None


def reverse_brrrr(target_capital_recycled_pct: float, inputs: dict) -> float | None:
    """Return max purchase price to achieve target capital recycled %.

    Algebra:
        capital_recycled = refi_proceeds / (P + rehab) * 100
        target/100 = refi_proceeds / (P + rehab)
        P + rehab = refi_proceeds / (target/100)
        P = refi_proceeds / (target/100) - rehab
    """
    arv = inputs.get("arv_post_rehab", 0) or inputs.get("after_repair_value", 0)
    refi_ltv = inputs.get("refinance_ltv_pct", 75) / 100
    rehab = inputs.get("rehab_costs", 0) or inputs.get("repair_cost", 0)

    refi_proceeds = arv * refi_ltv
    t = target_capital_recycled_pct / 100

    if t <= 0:
        return None

    max_all_in = refi_proceeds / t
    price = max_all_in - rehab

    return round(price, 2) if price > 0 else None


def reverse_creative(target_monthly_cf: float, inputs: dict) -> float | None:
    """Return max existing loan balance to achieve target monthly cash flow.

    Algebra:
        monthly_cf = rent - monthly_payment - expenses
        For seller finance: monthly_payment = pmt(rate/12, term*12, balance)
        pmt is linear in principal, so: monthly_payment = pmt_factor * balance
        target_cf = rent - pmt_factor * balance - expenses
        pmt_factor * balance = rent - expenses - target_cf
        balance = (rent - expenses - target_cf) / pmt_factor
    """
    rent = inputs.get("monthly_rent_estimate", 0) or inputs.get("monthly_rent", 0)
    expenses = inputs.get("monthly_expenses", 300)
    r = inputs.get("new_rate", 7.25) / 100 / 12
    n = inputs.get("new_term_years", 25) * 12

    if r == 0:
        pmt_factor = 1 / n if n > 0 else 0
    else:
        pmt_factor = r * (1 + r) ** n / ((1 + r) ** n - 1)

    if pmt_factor <= 0:
        return None

    target_piti = rent - expenses - target_monthly_cf
    if target_piti <= 0:
        return None

    balance = target_piti / pmt_factor
    return round(balance, 2) if balance > 0 else None


# ---------------------------------------------------------------------------
# Forward calculator defaults — mirrors _apply_strategy_defaults in analysis router
# ---------------------------------------------------------------------------

def _map_fields_for_strategy(strategy: str, inputs: dict) -> None:
    """Map canonical input names to strategy-specific calculator names.

    The frontend sends generic names; each calculator expects its own keys.
    Mirrors _map_canonical_inputs in the analysis router.
    """
    if strategy == "creative_finance":
        if "monthly_rent" in inputs and "monthly_rent_estimate" not in inputs:
            inputs["monthly_rent_estimate"] = inputs["monthly_rent"]
        if "interest_rate" in inputs and "new_rate" not in inputs:
            inputs["new_rate"] = inputs["interest_rate"]
        if "loan_term_years" in inputs and "new_term_years" not in inputs:
            inputs["new_term_years"] = inputs["loan_term_years"]
        if "after_repair_value" in inputs and "arv" not in inputs:
            inputs["arv"] = inputs["after_repair_value"]
    elif strategy == "brrrr":
        if "after_repair_value" in inputs and "arv_post_rehab" not in inputs:
            inputs["arv_post_rehab"] = inputs["after_repair_value"]
        if "repair_cost" in inputs and "rehab_costs" not in inputs:
            inputs["rehab_costs"] = inputs["repair_cost"]
        if "interest_rate" in inputs and "new_loan_rate" not in inputs:
            inputs["new_loan_rate"] = inputs["interest_rate"]
        if "loan_term_years" in inputs and "new_loan_term_years" not in inputs:
            inputs["new_loan_term_years"] = inputs["loan_term_years"]
    elif strategy == "flip":
        if "repair_cost" in inputs and "rehab_budget" not in inputs:
            inputs["rehab_budget"] = inputs["repair_cost"]
        if "after_repair_value" in inputs and "arv" not in inputs:
            inputs["arv"] = inputs["after_repair_value"]


def _apply_forward_defaults(strategy: str, inputs: dict) -> None:
    """Fill sensible defaults so the forward calculator doesn't fail on missing fields."""
    if strategy == "buy_and_hold":
        inputs.setdefault("down_payment_pct", 20)
        inputs.setdefault("interest_rate", 7.25)
        inputs.setdefault("loan_term_years", 30)
        inputs.setdefault("vacancy_rate_pct", 8)
        inputs.setdefault("maintenance_pct", 5)
        inputs.setdefault("mgmt_fee_pct", 8)
        inputs.setdefault("monthly_taxes", 0)
        inputs.setdefault("monthly_insurance", 0)
    elif strategy == "flip":
        inputs.setdefault("holding_months", 5)
        inputs.setdefault("selling_costs_pct", 8)
        inputs.setdefault("financing_costs", 0)
    elif strategy == "brrrr":
        inputs.setdefault("refinance_ltv_pct", 75)
        inputs.setdefault("new_loan_rate", 7.25)
        inputs.setdefault("new_loan_term_years", 30)
        inputs.setdefault("monthly_expenses", 400)
    elif strategy == "creative_finance":
        inputs.setdefault("monthly_piti", 0)
        inputs.setdefault("monthly_expenses", 300)
        inputs.setdefault("finance_type", "seller_finance")
        inputs.setdefault("new_rate", 7.25)
        inputs.setdefault("new_term_years", 25)


# ---------------------------------------------------------------------------
# Dispatcher — runs reverse solver then forward calculator at the result
# ---------------------------------------------------------------------------

# (strategy, target_metric) → (solver_fn, output_field_for_price)
_SOLVERS: dict[tuple[str, str], tuple] = {
    ("buy_and_hold", "coc_return"): (reverse_buy_and_hold, "purchase_price"),
    ("buy_and_hold", "cap_rate"): (reverse_buy_and_hold_cap_rate, "purchase_price"),
    ("buy_and_hold", "monthly_cash_flow"): (reverse_buy_and_hold_cash_flow, "purchase_price"),
    ("flip", "roi"): (reverse_flip, "purchase_price"),
    ("brrrr", "capital_recycled_pct"): (reverse_brrrr, "purchase_price"),
    ("creative_finance", "monthly_cash_flow"): (reverse_creative, "existing_loan_balance"),
}

# Which target metrics each strategy supports
SUPPORTED_TARGETS: dict[str, list[str]] = {
    "buy_and_hold": ["coc_return", "cap_rate", "monthly_cash_flow"],
    "flip": ["roi"],
    "brrrr": ["capital_recycled_pct"],
    "creative_finance": ["monthly_cash_flow"],
}


def reverse_calculate(
    strategy: str,
    target_metric: str,
    target_value: float,
    inputs: dict,
) -> dict:
    """Run reverse solver + forward calculator. Returns full result dict.

    Returns:
        {
            "max_purchase_price": float | None,
            "scenario_at_max": dict | None,   # full forward calc outputs
            "feasible": bool,
            "message": str,
        }
    """
    import importlib

    # Validate target metric is supported for this strategy
    supported = SUPPORTED_TARGETS.get(strategy, [])
    if target_metric not in supported:
        return {
            "max_purchase_price": None,
            "scenario_at_max": None,
            "feasible": False,
            "message": f"Target metric '{target_metric}' not supported for {strategy}. "
                       f"Supported: {', '.join(supported)}",
        }

    solver_key = (strategy, target_metric)
    if solver_key not in _SOLVERS:
        return {
            "max_purchase_price": None,
            "scenario_at_max": None,
            "feasible": False,
            "message": f"Reverse calculation not supported for {strategy}/{target_metric}",
        }

    solver_fn, price_field = _SOLVERS[solver_key]

    # --- Input validation ---
    # Reject negative targets for percentage metrics
    pct_metrics = {"coc_return", "cap_rate", "roi", "capital_recycled_pct"}
    if target_metric in pct_metrics and target_value < 0:
        return {
            "max_purchase_price": None, "scenario_at_max": None, "feasible": False,
            "message": f"Target {target_metric.replace('_', ' ')} cannot be negative",
        }

    # Reject zero/negative loan terms (ZeroDivisionError)
    term = inputs.get("loan_term_years") or inputs.get("new_term_years") or 0
    if strategy in ("buy_and_hold", "creative_finance") and term <= 0 and "loan_term_years" not in inputs and "new_term_years" not in inputs:
        pass  # will use defaults
    elif term <= 0 and (inputs.get("loan_term_years") is not None or inputs.get("new_term_years") is not None):
        return {
            "max_purchase_price": None, "scenario_at_max": None, "feasible": False,
            "message": "Loan term must be greater than zero",
        }

    # Reject 0% down for CoC (forward calc returns CoC=0 when down=0)
    if target_metric == "coc_return" and inputs.get("down_payment_pct", 20) <= 0:
        return {
            "max_purchase_price": None, "scenario_at_max": None, "feasible": False,
            "message": "Cash-on-cash return requires a down payment greater than 0%",
        }

    # Run reverse solver
    max_price = solver_fn(target_value, inputs)

    if max_price is None or max_price <= 0:
        return {
            "max_purchase_price": None,
            "scenario_at_max": None,
            "feasible": False,
            "message": f"No feasible price exists for {target_value} target on {strategy}",
        }

    # Run forward calculator at the solved price
    forward_inputs = dict(inputs)
    forward_inputs[price_field] = max_price

    # Map canonical field names to strategy-specific names the forward calculators expect.
    # The frontend sends generic names (monthly_rent, interest_rate, after_repair_value)
    # but calculators use strategy-specific keys.
    _map_fields_for_strategy(strategy, forward_inputs)

    # Apply the same strategy defaults the analysis router uses — required fields
    # like monthly_taxes, vacancy_rate_pct, etc. may be missing from user inputs.
    _apply_forward_defaults(strategy, forward_inputs)

    try:
        calc_mod = importlib.import_module(f"core.calculators.{strategy}")
        calc_fn = getattr(calc_mod, f"calculate_{strategy}")
        risk_mod = importlib.import_module("core.calculators.risk_score")

        outputs = calc_fn(forward_inputs)
        risk_score = risk_mod.calculate_risk_score(strategy, forward_inputs, outputs)

        # Format human-readable message
        msg = _format_message(strategy, target_metric, target_value, max_price)

        return {
            "max_purchase_price": max_price,
            "scenario_at_max": outputs,
            "risk_score": risk_score,
            "feasible": True,
            "message": msg,
        }
    except Exception as e:
        return {
            "max_purchase_price": max_price,
            "scenario_at_max": None,
            "feasible": True,
            "message": f"Max price is ${max_price:,.0f} but forward calculation failed: {e}",
        }


def _format_message(strategy: str, metric: str, target: float, price: float) -> str:
    """Generate a human-readable result message."""
    labels = {
        "coc_return": f"{target}% CoC return",
        "cap_rate": f"{target}% cap rate",
        "roi": f"{target}% ROI",
        "capital_recycled_pct": f"{target}% capital recycled",
        "monthly_cash_flow": f"${target:,.0f}/mo cash flow",
    }
    target_label = labels.get(metric, f"{target} {metric}")

    if strategy == "creative_finance":
        return f"To achieve {target_label}, max loan balance is ${price:,.0f}"

    return f"To achieve {target_label}, max purchase price is ${price:,.0f}"
