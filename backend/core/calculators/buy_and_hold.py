from .utils import pmt, validate_inputs
from .projections import compute_common_projections

_REQUIRED = [
    "purchase_price", "down_payment_pct", "interest_rate", "loan_term_years",
    "monthly_rent", "monthly_taxes", "monthly_insurance", "vacancy_rate_pct",
    "maintenance_pct", "mgmt_fee_pct",
]
_NON_NEGATIVE = ["purchase_price", "interest_rate", "monthly_rent"]


def calculate_buy_and_hold(inputs: dict) -> dict:
    """Calculate buy-and-hold rental property metrics."""
    validate_inputs(inputs, _REQUIRED, _NON_NEGATIVE)

    purchase_price = inputs["purchase_price"]
    down_payment_pct = inputs["down_payment_pct"]
    interest_rate = inputs["interest_rate"]
    loan_term_years = inputs["loan_term_years"]
    monthly_rent = inputs["monthly_rent"]
    monthly_taxes = inputs["monthly_taxes"]
    monthly_insurance = inputs["monthly_insurance"]
    vacancy_rate_pct = inputs["vacancy_rate_pct"]
    maintenance_pct = inputs["maintenance_pct"]
    mgmt_fee_pct = inputs["mgmt_fee_pct"]

    down_payment = purchase_price * (down_payment_pct / 100)
    loan_amount = purchase_price - down_payment
    monthly_pi = abs(pmt(interest_rate / 100 / 12, loan_term_years * 12, loan_amount))

    effective_gross_income = monthly_rent * (1 - vacancy_rate_pct / 100)
    monthly_maintenance = monthly_rent * (maintenance_pct / 100)
    monthly_mgmt = monthly_rent * (mgmt_fee_pct / 100)

    monthly_noi = (
        effective_gross_income
        - monthly_taxes
        - monthly_insurance
        - monthly_maintenance
        - monthly_mgmt
    )
    annual_noi = monthly_noi * 12

    total_monthly_expenses = (
        monthly_pi
        + monthly_taxes
        + monthly_insurance
        + monthly_maintenance
        + monthly_mgmt
    )
    monthly_cash_flow = effective_gross_income - total_monthly_expenses
    annual_cash_flow = monthly_cash_flow * 12

    cap_rate = (annual_noi / purchase_price) * 100 if purchase_price > 0 else 0
    coc_return = (annual_cash_flow / down_payment) * 100 if down_payment > 0 else 0
    grm = purchase_price / (monthly_rent * 12) if monthly_rent > 0 else 0
    dscr = monthly_noi / monthly_pi if monthly_pi > 0 else 0

    break_even_rent = total_monthly_expenses / inputs.get("number_of_units", 1)

    # Enhanced outputs
    vacancy_amount = monthly_rent * (vacancy_rate_pct / 100)
    rent_to_price_ratio = round((monthly_rent / purchase_price) * 100, 4) if purchase_price > 0 else 0
    expense_ratio = round((total_monthly_expenses / effective_gross_income) * 100, 2) if effective_gross_income > 0 else 0
    debt_yield = round((annual_noi / loan_amount) * 100, 2) if loan_amount > 0 else 0

    projections = compute_common_projections(
        purchase_price=purchase_price,
        total_investment=down_payment,
        monthly_cash_flow=monthly_cash_flow,
        monthly_pi=monthly_pi,
        loan_amount=loan_amount,
        interest_rate=interest_rate,
        loan_term_years=loan_term_years,
        monthly_taxes=monthly_taxes,
        monthly_insurance=monthly_insurance,
        monthly_vacancy=vacancy_amount,
        monthly_maintenance=monthly_maintenance,
        monthly_management=monthly_mgmt,
    )

    result = {
        "purchase_price": round(purchase_price, 2),
        "down_payment": round(down_payment, 2),
        "loan_amount": round(loan_amount, 2),
        "monthly_pi": round(monthly_pi, 2),
        "effective_gross_income": round(effective_gross_income, 2),
        "monthly_maintenance": round(monthly_maintenance, 2),
        "monthly_mgmt": round(monthly_mgmt, 2),
        "monthly_noi": round(monthly_noi, 2),
        "annual_noi": round(annual_noi, 2),
        "total_monthly_expenses": round(total_monthly_expenses, 2),
        "monthly_cash_flow": round(monthly_cash_flow, 2),
        "annual_cash_flow": round(annual_cash_flow, 2),
        "cap_rate": round(cap_rate, 2),
        "coc_return": round(coc_return, 2),
        "grm": round(grm, 2),
        "dscr": round(dscr, 2),
        "break_even_rent": round(break_even_rent, 2),
    }
    result.update(projections)
    result["rent_to_price_ratio"] = rent_to_price_ratio
    result["expense_ratio"] = expense_ratio
    result["debt_yield"] = debt_yield
    return result
