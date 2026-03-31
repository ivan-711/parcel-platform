from .utils import pmt, validate_inputs

_REQUIRED = [
    "purchase_price", "rehab_costs", "arv_post_rehab", "refinance_ltv_pct",
    "new_loan_rate", "new_loan_term_years", "monthly_rent", "monthly_expenses",
]
_NON_NEGATIVE = ["purchase_price", "arv_post_rehab", "monthly_rent"]


def calculate_brrrr(inputs: dict) -> dict:
    """
    Calculate BRRRR (Buy, Rehab, Rent, Refinance, Repeat) deal metrics.

    Returns all-in cost, refi proceeds, cash left in deal, monthly cash flow,
    CoC return, equity captured, and capital recycled percentage.
    """
    validate_inputs(inputs, _REQUIRED, _NON_NEGATIVE)

    purchase_price      = inputs["purchase_price"]
    rehab_costs         = inputs["rehab_costs"]
    arv_post_rehab      = inputs["arv_post_rehab"]
    refinance_ltv_pct   = inputs["refinance_ltv_pct"]
    new_loan_rate       = inputs["new_loan_rate"]
    new_loan_term_years = inputs["new_loan_term_years"]
    monthly_rent        = inputs["monthly_rent"]
    monthly_expenses    = inputs["monthly_expenses"]

    all_in            = purchase_price + rehab_costs
    refi_proceeds     = arv_post_rehab * (refinance_ltv_pct / 100)
    money_left_in     = max(0.0, all_in - refi_proceeds)
    monthly_pi        = abs(pmt(new_loan_rate / 100 / 12, new_loan_term_years * 12, refi_proceeds))
    monthly_cash_flow = monthly_rent - monthly_pi - monthly_expenses
    annual_cash_flow  = monthly_cash_flow * 12

    coc_return = None if money_left_in == 0 else round((annual_cash_flow / money_left_in) * 100, 2)

    equity_captured      = arv_post_rehab - refi_proceeds
    capital_recycled_pct = (refi_proceeds / all_in) * 100 if all_in > 0 else 0

    return {
        "all_in":               round(all_in, 2),
        "refi_proceeds":        round(refi_proceeds, 2),
        "money_left_in":        round(money_left_in, 2),
        "monthly_pi":           round(monthly_pi, 2),
        "monthly_cash_flow":    round(monthly_cash_flow, 2),
        "annual_cash_flow":     round(annual_cash_flow, 2),
        "coc_return":           coc_return,
        "equity_captured":      round(equity_captured, 2),
        "capital_recycled_pct": round(capital_recycled_pct, 2),
    }
