def calculate_flip(inputs: dict) -> dict:
    """Calculate fix-and-flip deal metrics from user inputs."""
    purchase_price = inputs["purchase_price"]
    rehab_budget = inputs["rehab_budget"]
    arv = inputs["arv"]
    holding_months = inputs["holding_months"]
    selling_costs_pct = inputs["selling_costs_pct"]
    financing_costs = inputs["financing_costs"]

    selling_costs = arv * (selling_costs_pct / 100)
    total_cost = purchase_price + rehab_budget + financing_costs + selling_costs
    gross_profit = arv - total_cost
    total_invested = purchase_price + rehab_budget + financing_costs
    roi = (gross_profit / total_invested) * 100 if total_invested > 0 else 0
    annualized_roi = (roi / holding_months) * 12 if holding_months > 0 else 0
    profit_margin_pct = (gross_profit / arv) * 100 if arv > 0 else 0
    rehab_to_arv_pct = (rehab_budget / arv) * 100 if arv > 0 else 0

    return {
        "selling_costs": round(selling_costs, 2),
        "total_cost": round(total_cost, 2),
        "gross_profit": round(gross_profit, 2),
        "total_invested": round(total_invested, 2),
        "roi": round(roi, 2),
        "annualized_roi": round(annualized_roi, 2),
        "profit_margin_pct": round(profit_margin_pct, 2),
        "rehab_to_arv_pct": round(rehab_to_arv_pct, 2),
    }
