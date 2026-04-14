"""Common projection calculations shared by all strategy calculators."""

import math


def compute_common_projections(
    purchase_price: float,
    total_investment: float,
    monthly_cash_flow: float,
    monthly_pi: float = 0,
    loan_amount: float = 0,
    interest_rate: float = 0,
    loan_term_years: int = 30,
    appreciation_rate: float = 3.0,
    rent_growth_rate: float = 2.0,
    expense_growth_rate: float = 3.0,
    monthly_taxes: float = 0,
    monthly_insurance: float = 0,
    monthly_vacancy: float = 0,
    monthly_maintenance: float = 0,
    monthly_capex: float = 0,
    monthly_management: float = 0,
    monthly_hoa: float = 0,
    monthly_other: float = 0,
) -> dict:
    """Compute break-even, 5-year projections, and expense breakdown.

    Returns dict with keys:
        break_even_months, total_investment, annual_cash_flow,
        five_year_equity, five_year_total_return, monthly_expense_breakdown
    """
    annual_cash_flow = round(monthly_cash_flow * 12, 2)

    # Break-even: months until cumulative cash flow covers investment
    if total_investment <= 0:
        break_even_months = 0
    elif monthly_cash_flow > 0:
        break_even_months = math.ceil(total_investment / monthly_cash_flow)
    else:
        break_even_months = None

    # 5-year equity: appreciation + principal paydown
    appreciation_5yr = purchase_price * ((1 + appreciation_rate / 100) ** 5 - 1)

    # Principal paid in 60 months
    principal_paid_5yr = 0.0
    if loan_amount > 0 and interest_rate > 0 and monthly_pi > 0:
        monthly_rate = interest_rate / 100 / 12
        balance = loan_amount
        for _ in range(60):
            interest = balance * monthly_rate
            principal = monthly_pi - interest
            if principal > balance:
                principal = balance
            balance -= principal
            principal_paid_5yr += principal
            if balance <= 0:
                break
    elif loan_amount > 0 and interest_rate == 0 and monthly_pi > 0:
        # 0% loan: all principal
        principal_paid_5yr = min(monthly_pi * 60, loan_amount)

    five_year_equity = round(appreciation_5yr + principal_paid_5yr, 2)

    # 5-year cumulative cash flow — compound net CF at rent_growth_rate
    # (rent grows faster than expenses, so net CF grows roughly at rent growth rate)
    cumulative_cf_5yr = 0.0
    for year in range(5):
        year_cf = annual_cash_flow * ((1 + rent_growth_rate / 100) ** year)
        cumulative_cf_5yr += year_cf

    five_year_total_return = round(cumulative_cf_5yr + five_year_equity, 2)

    monthly_expense_breakdown = {
        "mortgage": round(monthly_pi, 2),
        "taxes": round(monthly_taxes, 2),
        "insurance": round(monthly_insurance, 2),
        "vacancy": round(monthly_vacancy, 2),
        "maintenance": round(monthly_maintenance, 2),
        "capex": round(monthly_capex, 2),
        "management": round(monthly_management, 2),
        "hoa": round(monthly_hoa, 2),
        "other": round(monthly_other, 2),
    }

    return {
        "break_even_months": break_even_months,
        "total_investment": round(total_investment, 2),
        "annual_cash_flow": annual_cash_flow,
        "five_year_equity": five_year_equity,
        "five_year_total_return": five_year_total_return,
        "monthly_expense_breakdown": monthly_expense_breakdown,
    }
