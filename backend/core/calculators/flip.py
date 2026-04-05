from .utils import validate_inputs
from .projections import compute_common_projections

_REQUIRED = [
    "purchase_price", "rehab_budget", "arv", "holding_months",
    "selling_costs_pct", "financing_costs",
]
_NON_NEGATIVE = ["purchase_price", "arv"]


def calculate_flip(inputs: dict) -> dict:
    """Calculate fix-and-flip deal metrics from user inputs."""
    validate_inputs(inputs, _REQUIRED, _NON_NEGATIVE)

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

    result = {
        "selling_costs": round(selling_costs, 2),
        "total_cost": round(total_cost, 2),
        "gross_profit": round(gross_profit, 2),
        "total_invested": round(total_invested, 2),
        "roi": round(roi, 2),
        "annualized_roi": round(annualized_roi, 2),
        "profit_margin_pct": round(profit_margin_pct, 2),
        "rehab_to_arv_pct": round(rehab_to_arv_pct, 2),
    }
    result.update(projections)
    result["cost_per_sqft_rehab"] = cost_per_sqft_rehab
    result["holding_cost_breakdown"] = holding_cost_breakdown
    result["roi_annualized"] = round(annualized_roi, 2)
    result["profit_margin"] = round(profit_margin_pct, 2)
    return result
