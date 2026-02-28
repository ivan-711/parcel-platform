def calculate_risk_score(strategy: str, inputs: dict, outputs: dict) -> int:
    """
    Score a deal's risk from 0 (safest) to 100 (riskiest).
    Wholesale scoring uses three factors: recommendation, spread to break-even,
    and repair costs as a percentage of ARV.
    Non-wholesale strategies return a neutral placeholder of 50.
    """
    if strategy != "wholesale":
        return 50

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
