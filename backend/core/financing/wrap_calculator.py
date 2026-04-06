"""Wrap spread calculator — computes spread between wrap collections and underlying payments."""


def calculate_wrap_spread(wrap_instrument, underlying_instrument) -> dict:
    """Calculate the spread between what the investor collects (wrap) and pays (underlying).

    Args:
        wrap_instrument: The wrap FinancingInstrument (has wrap_payment, wrap_rate).
        underlying_instrument: The underlying FinancingInstrument (has monthly_payment, interest_rate).

    Returns:
        Dict with monthly/annual spread, margin %, and rate spread.
    """
    monthly_incoming = float(wrap_instrument.wrap_payment or 0)
    monthly_outgoing = float(underlying_instrument.monthly_payment or 0)
    monthly_spread = monthly_incoming - monthly_outgoing

    return {
        "monthly_incoming": monthly_incoming,
        "monthly_outgoing": monthly_outgoing,
        "monthly_spread": monthly_spread,
        "annual_spread": monthly_spread * 12,
        "spread_margin_pct": round(
            (monthly_spread / monthly_incoming * 100) if monthly_incoming else 0, 2
        ),
        "underlying_rate": float(underlying_instrument.interest_rate or 0),
        "wrap_rate": float(wrap_instrument.wrap_rate or 0),
        "rate_spread": round(
            float(wrap_instrument.wrap_rate or 0) - float(underlying_instrument.interest_rate or 0), 4
        ),
    }
