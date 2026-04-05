from .utils import validate_inputs
from .projections import compute_common_projections

_REQUIRED = ["arv", "repair_costs", "desired_profit", "closing_costs_pct", "asking_price"]
_NON_NEGATIVE = ["arv"]


def calculate_wholesale(inputs: dict) -> dict:
    """
    Calculate wholesale deal metrics: MAO, break-even price, profit at ask,
    spread to break-even, closing costs, and deal recommendation.
    """
    validate_inputs(inputs, _REQUIRED, _NON_NEGATIVE)

    arv: float = inputs["arv"]
    repair_costs: float = inputs["repair_costs"]
    desired_profit: float = inputs["desired_profit"]
    closing_costs_pct: float = inputs["closing_costs_pct"]
    asking_price: float = inputs["asking_price"]

    closing_costs = arv * (closing_costs_pct / 100)
    mao = (arv * 0.70) - repair_costs - desired_profit
    break_even_price = (arv * 0.70) - repair_costs
    profit_at_ask = mao - asking_price
    spread_to_break_even = break_even_price - asking_price

    if asking_price <= mao:
        recommendation = "strong"
    elif asking_price <= break_even_price:
        recommendation = "marginal"
    else:
        recommendation = "pass"

    # Enhanced outputs — MAO spread analysis
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

    result = {
        "mao": round(mao, 2),
        "break_even_price": round(break_even_price, 2),
        "profit_at_ask": round(profit_at_ask, 2),
        "spread_to_break_even": round(spread_to_break_even, 2),
        "closing_costs": round(closing_costs, 2),
        "recommendation": recommendation,
    }
    result.update(projections)
    result["mao_65"] = round(mao_65, 2)
    result["mao_70"] = round(mao, 2)
    result["mao_75"] = round(mao_75, 2)
    result["assignment_fee_pct_arv"] = assignment_fee_pct_arv
    return result
