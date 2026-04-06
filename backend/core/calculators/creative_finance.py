from .utils import pmt, validate_inputs
from .projections import compute_common_projections

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

    # Enhanced outputs
    wrap_payment_received = inputs.get("wrap_payment", 0)
    wrap_spread_monthly = round(wrap_payment_received - monthly_payment, 2) if wrap_payment_received else None

    effective_interest_rate = round(new_rate, 2)

    # Seller benefit analysis
    total_interest_earned = 0
    if finance_type == "seller_finance" and new_rate > 0:
        total_payments = monthly_payment * new_term_years * 12
        total_interest_earned = round(total_payments - existing_loan_balance, 2)
    balloon_risk = "none"
    if inputs.get("has_balloon"):
        balloon_months = inputs.get("balloon_months", 0)
        if balloon_months and balloon_months < 36:
            balloon_risk = "high"
        elif balloon_months and balloon_months < 84:
            balloon_risk = "moderate"

    seller_benefit_analysis = {
        "total_interest_earned": total_interest_earned,
        "monthly_income": round(monthly_payment, 2),
        "balloon_risk": balloon_risk,
    }

    # Sub-to risk score (simple heuristic)
    sub_to_risk_score = 50
    if finance_type == "subject_to":
        loan_type = str(inputs.get("loan_type", "conventional")).lower()
        if loan_type in ("fha", "va"):
            sub_to_risk_score = 25
        elif loan_type == "portfolio":
            sub_to_risk_score = 40
        else:
            sub_to_risk_score = 65
        if inputs.get("payment_history_months", 0) > 24:
            sub_to_risk_score = max(sub_to_risk_score - 10, 0)

    projections = compute_common_projections(
        purchase_price=arv,
        total_investment=max(equity_day_one, 0) if equity_day_one > 0 else float(inputs.get("down_payment", 0)),
        monthly_cash_flow=monthly_cash_flow,
        monthly_pi=monthly_payment,
        loan_amount=existing_loan_balance,
        interest_rate=new_rate,
        loan_term_years=new_term_years,
        monthly_other=monthly_expenses,
    )

    result = {
        "monthly_payment": round(monthly_payment, 2),
        "monthly_cash_flow": round(monthly_cash_flow, 2),
        "annual_cash_flow": round(annual_cash_flow, 2),
        "dscr": dscr,
        "equity_day_one": round(equity_day_one, 2),
        "effective_yield": round(effective_yield, 2),
        "finance_type": finance_type,
    }
    result.update(projections)
    result["wrap_spread_monthly"] = wrap_spread_monthly
    result["effective_interest_rate"] = effective_interest_rate
    result["seller_benefit_analysis"] = seller_benefit_analysis
    result["sub_to_risk_score"] = sub_to_risk_score
    return result
