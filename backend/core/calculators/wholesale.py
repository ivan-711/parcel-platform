from .utils import validate_inputs

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

    return {
        "mao": round(mao, 2),
        "break_even_price": round(break_even_price, 2),
        "profit_at_ask": round(profit_at_ask, 2),
        "spread_to_break_even": round(spread_to_break_even, 2),
        "closing_costs": round(closing_costs, 2),
        "recommendation": recommendation,
    }
