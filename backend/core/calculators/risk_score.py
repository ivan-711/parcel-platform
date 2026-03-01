def calculate_risk_score(strategy: str, inputs: dict, outputs: dict) -> int:
    """
    Score a deal's risk from 0 (safest) to 100 (riskiest).
    Wholesale scoring uses three factors: recommendation, spread to break-even,
    and repair costs as a percentage of ARV.
    Non-wholesale strategies return a neutral placeholder of 50.
    """
    if strategy == "wholesale":
        return _score_wholesale(inputs, outputs)
    elif strategy == "buy_and_hold":
        return _score_buy_and_hold(outputs)
    elif strategy == "flip":
        return _score_flip(inputs, outputs)
    elif strategy == "brrrr":
        return _score_brrrr(inputs, outputs)
    elif strategy == "creative_finance":
        return _score_creative_finance(inputs, outputs)
    else:
        return 50


def _score_buy_and_hold(outputs: dict) -> int:
    """Buy & hold risk: cash flow (30), cap rate (25), CoC (25), DSCR (20)."""
    score = 0

    monthly_cash_flow = outputs.get("monthly_cash_flow", 0)
    if monthly_cash_flow > 300:
        score += 0
    elif monthly_cash_flow > 0:
        score += 10
    elif monthly_cash_flow > -200:
        score += 20
    else:
        score += 30

    cap_rate = outputs.get("cap_rate", 0)
    if cap_rate >= 7:
        score += 0
    elif cap_rate >= 5:
        score += 8
    elif cap_rate >= 3:
        score += 16
    else:
        score += 25

    coc_return = outputs.get("coc_return", 0)
    if coc_return >= 8:
        score += 0
    elif coc_return >= 5:
        score += 8
    elif coc_return >= 2:
        score += 16
    else:
        score += 25

    dscr = outputs.get("dscr", 0)
    if dscr >= 1.25:
        score += 0
    elif dscr >= 1.0:
        score += 8
    elif dscr >= 0.85:
        score += 14
    else:
        score += 20

    return max(0, min(100, score))


def _score_flip(inputs: dict, outputs: dict) -> int:
    """Flip risk: gross profit (35), ROI (30), rehab-to-ARV (20), holding months (15)."""
    score = 0

    gross_profit = outputs.get("gross_profit", 0)
    if gross_profit >= 30000:
        score += 0
    elif gross_profit >= 15000:
        score += 12
    elif gross_profit >= 5000:
        score += 24
    else:
        score += 35

    roi = outputs.get("roi", 0)
    if roi >= 20:
        score += 0
    elif roi >= 12:
        score += 10
    elif roi >= 6:
        score += 20
    else:
        score += 30

    rehab_to_arv_pct = outputs.get("rehab_to_arv_pct", 0)
    if rehab_to_arv_pct <= 15:
        score += 0
    elif rehab_to_arv_pct <= 25:
        score += 7
    elif rehab_to_arv_pct <= 35:
        score += 14
    else:
        score += 20

    holding_months = inputs.get("holding_months", 0)
    if holding_months <= 4:
        score += 0
    elif holding_months <= 6:
        score += 5
    elif holding_months <= 9:
        score += 10
    else:
        score += 15

    return max(0, min(100, score))


def _score_brrrr(inputs: dict, outputs: dict) -> int:
    """BRRRR risk: cash flow (30), CoC return (25), capital recycled % (25), equity captured % of ARV (20)."""
    score = 0

    monthly_cash_flow = outputs.get("monthly_cash_flow", 0)
    if monthly_cash_flow > 300:
        score += 0
    elif monthly_cash_flow > 0:
        score += 10
    elif monthly_cash_flow > -200:
        score += 20
    else:
        score += 30

    coc_return = outputs.get("coc_return")
    if coc_return is None:
        score += 0
    elif coc_return >= 8:
        score += 0
    elif coc_return >= 5:
        score += 8
    elif coc_return >= 2:
        score += 16
    else:
        score += 25

    capital_recycled_pct = outputs.get("capital_recycled_pct", 0)
    if capital_recycled_pct >= 90:
        score += 0
    elif capital_recycled_pct >= 75:
        score += 8
    elif capital_recycled_pct >= 60:
        score += 16
    else:
        score += 25

    arv_post_rehab = inputs.get("arv_post_rehab", 1)
    equity_captured = outputs.get("equity_captured", 0)
    equity_captured_pct = (equity_captured / arv_post_rehab) * 100 if arv_post_rehab > 0 else 0
    if equity_captured_pct >= 30:
        score += 0
    elif equity_captured_pct >= 20:
        score += 7
    elif equity_captured_pct >= 10:
        score += 14
    else:
        score += 20

    return max(0, min(100, score))


def _score_creative_finance(inputs: dict, outputs: dict) -> int:
    """Creative finance risk: DSCR (35), cash flow (30), equity day one (20), finance type (15)."""
    score = 0

    dscr = outputs.get("dscr", 0)
    if dscr >= 1.4:
        score += 0
    elif dscr >= 1.2:
        score += 12
    elif dscr >= 1.0:
        score += 24
    else:
        score += 35

    monthly_cash_flow = outputs.get("monthly_cash_flow", 0)
    if monthly_cash_flow > 300:
        score += 0
    elif monthly_cash_flow > 100:
        score += 10
    elif monthly_cash_flow > 0:
        score += 20
    else:
        score += 30

    equity_day_one = outputs.get("equity_day_one", 0)
    if equity_day_one >= 50000:
        score += 0
    elif equity_day_one >= 25000:
        score += 7
    elif equity_day_one >= 10000:
        score += 14
    else:
        score += 20

    finance_type = outputs.get("finance_type", "seller_finance")
    if finance_type == "subject_to":
        score += 0
    else:
        score += 15

    return max(0, min(100, score))


def _score_wholesale(inputs: dict, outputs: dict) -> int:
    """Wholesale risk: recommendation (40), spread (30), repair-to-ARV (30)."""
    score = 0

    # Factor 1: Recommendation (max 40 pts)
    recommendation = outputs.get("recommendation", "pass")
    if recommendation == "pass":
        score += 40
    elif recommendation == "marginal":
        score += 20

    # Factor 2: Spread to break-even (max 30 pts)
    spread = outputs.get("spread_to_break_even", 0)
    if spread < 0:
        score += 30
    elif spread <= 5000:
        score += 20
    elif spread <= 15000:
        score += 10
    # else: > 15000 → 0 pts

    # Factor 3: Repair costs as % of ARV (max 30 pts)
    arv = inputs.get("arv", 1)
    repair_costs = inputs.get("repair_costs", 0)
    repair_pct = (repair_costs / arv) * 100 if arv > 0 else 0
    if repair_pct > 40:
        score += 30
    elif repair_pct >= 25:
        score += 15

    return max(0, min(100, score))
