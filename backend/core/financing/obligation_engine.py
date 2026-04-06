"""Obligation engine — auto-generates obligations from financing instrument terms."""

import calendar
from datetime import date

from models.obligations import Obligation


def _add_months(d: date, months: int) -> date:
    """Add *months* to a date, clamping the day to the target month's last day."""
    month = d.month - 1 + months
    year = d.year + month // 12
    month = month % 12 + 1
    day = min(d.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def _calculate_next_due(instrument) -> date:
    """Determine the next payment due date for an instrument."""
    today = date.today()
    if instrument.first_payment_date and instrument.first_payment_date > today:
        return instrument.first_payment_date
    # Step forward from first_payment_date (or origination_date) until we pass today
    start = instrument.first_payment_date or instrument.origination_date or today
    d = start
    while d <= today:
        d = _add_months(d, 1)
    return d


def generate_obligations(instrument) -> list[Obligation]:
    """Auto-generate obligations based on instrument type and terms.

    Returns a list of Obligation instances (not yet committed to DB).
    The caller is responsible for setting created_by, team_id, and persisting.
    """
    obligations: list[Obligation] = []

    # Every instrument with a monthly payment gets a recurring payment obligation
    if instrument.monthly_payment:
        recurrence_day = (
            instrument.first_payment_date.day if instrument.first_payment_date else 1
        )
        obligations.append(Obligation(
            instrument_id=instrument.id,
            property_id=instrument.property_id,
            obligation_type="monthly_payment",
            title=f"Monthly payment \u2014 {instrument.name}",
            amount=instrument.monthly_payment,
            amount_type="fixed",
            recurrence="monthly",
            recurrence_day=recurrence_day,
            next_due=_calculate_next_due(instrument),
            end_date=instrument.maturity_date,
            severity="normal",
            alert_days_before=[7, 1],
        ))

    # Balloon payment obligation
    if instrument.has_balloon and instrument.balloon_date:
        obligations.append(Obligation(
            instrument_id=instrument.id,
            property_id=instrument.property_id,
            obligation_type="balloon_payment",
            title=f"BALLOON \u2014 {instrument.name}",
            description=f"Balloon payment of ${instrument.balloon_amount:,.2f} due"
            if instrument.balloon_amount
            else None,
            amount=instrument.balloon_amount,
            amount_type="fixed",
            recurrence="one_time",
            due_date=instrument.balloon_date,
            next_due=instrument.balloon_date,
            severity="critical",
            alert_days_before=[180, 90, 60, 30, 14, 7, 3, 1],
        ))

    # Insurance renewal (annual)
    if instrument.requires_insurance:
        next_insurance = (
            _add_months(instrument.insurance_verified_date, 12)
            if instrument.insurance_verified_date
            else None
        )
        obligations.append(Obligation(
            instrument_id=instrument.id,
            property_id=instrument.property_id,
            obligation_type="insurance_renewal",
            title=f"Insurance verification \u2014 {instrument.name}",
            recurrence="annually",
            next_due=next_insurance,
            severity="high",
            alert_days_before=[60, 30, 14],
        ))

    # Lease option expiration
    if instrument.instrument_type == "lease_option" and instrument.option_expiration:
        obligations.append(Obligation(
            instrument_id=instrument.id,
            property_id=instrument.property_id,
            obligation_type="option_expiration",
            title=f"Option expires \u2014 {instrument.name}",
            amount=instrument.strike_price,
            recurrence="one_time",
            due_date=instrument.option_expiration,
            next_due=instrument.option_expiration,
            severity="critical",
            alert_days_before=[180, 90, 60, 30, 14, 7],
        ))

    # Rate adjustment (for ARM loans)
    if instrument.rate_type == "adjustable":
        obligations.append(Obligation(
            instrument_id=instrument.id,
            property_id=instrument.property_id,
            obligation_type="rate_adjustment",
            title=f"Rate adjustment review \u2014 {instrument.name}",
            recurrence="annually",
            severity="high",
            alert_days_before=[60, 30],
        ))

    return obligations
