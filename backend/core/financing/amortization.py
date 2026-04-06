"""Amortization schedule calculator for financing instruments."""

from datetime import date
from typing import Optional

from core.financing.obligation_engine import _add_months


def calculate_amortization_schedule(
    balance: float,
    annual_rate: float,
    monthly_payment: float,
    months: int = 12,
    start_date: Optional[date] = None,
) -> list[dict]:
    """Generate month-by-month amortization schedule.

    Returns list of dicts with keys:
        month, date, payment, principal, interest, balance
    """
    if balance <= 0 or monthly_payment <= 0:
        return []

    schedule = []
    remaining = balance
    monthly_rate = annual_rate / 100 / 12

    for i in range(months):
        interest = remaining * monthly_rate
        principal = monthly_payment - interest
        if principal > remaining:
            principal = remaining
            payment = principal + interest
        else:
            payment = monthly_payment
        remaining -= principal

        schedule.append({
            "month": i + 1,
            "date": _add_months(start_date, i) if start_date else None,
            "payment": round(payment, 2),
            "principal": round(principal, 2),
            "interest": round(interest, 2),
            "balance": round(max(remaining, 0), 2),
        })

        if remaining <= 0:
            break

    return schedule
