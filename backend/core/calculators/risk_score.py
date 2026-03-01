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
