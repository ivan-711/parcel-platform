from .utils import pmt, validate_inputs

_REQUIRED = [
    "existing_loan_balance", "monthly_piti", "monthly_rent_estimate",
    "monthly_expenses", "finance_type", "new_rate", "new_term_years", "arv",
]
_NON_NEGATIVE = ["arv", "monthly_rent_estimate"]


def calculate_creative_finance(inputs: dict) -> dict:
    """
    Calculate creative finance deal metrics (subject-to or seller finance).

    Returns monthly payment, cash flow, DSCR, equity day one, and effective yield.
    """
    validate_inputs(inputs, _REQUIRED, _NON_NEGATIVE)

    existing_loan_balance  = inputs["existing_loan_balance"]
    monthly_piti           = inputs["monthly_piti"]
    monthly_rent_estimate  = inputs["monthly_rent_estimate"]
    monthly_expenses       = inputs["monthly_expenses"]
    finance_type           = inputs["finance_type"]
    new_rate               = inputs["new_rate"]
    new_term_years         = inputs["new_term_years"]
    arv                    = inputs["arv"]

    if finance_type == "subject_to":
        monthly_payment = monthly_piti
    else:  # seller_finance
        monthly_payment = abs(pmt(new_rate / 100 / 12, new_term_years * 12, existing_loan_balance))

    monthly_cash_flow = monthly_rent_estimate - monthly_payment - monthly_expenses
    annual_cash_flow  = monthly_cash_flow * 12
    dscr              = round(monthly_rent_estimate / monthly_payment, 2) if monthly_payment > 0 else 0
    equity_day_one    = arv - existing_loan_balance
    effective_yield   = (annual_cash_flow / equity_day_one) * 100 if equity_day_one > 0 else 0

    return {
        "monthly_payment":   round(monthly_payment, 2),
        "monthly_cash_flow": round(monthly_cash_flow, 2),
        "annual_cash_flow":  round(annual_cash_flow, 2),
        "dscr":              dscr,
        "equity_day_one":    round(equity_day_one, 2),
        "effective_yield":   round(effective_yield, 2),
        "finance_type":      finance_type,
    }
