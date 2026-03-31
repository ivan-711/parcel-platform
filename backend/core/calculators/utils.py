def pmt(rate: float, nper: int, pv: float) -> float:
    """
    Calculate fixed monthly payment for a loan.
    rate: monthly interest rate (annual_rate / 12)
    nper: total number of payments
    pv: loan principal (positive number)
    Returns monthly payment as a positive float.
    """
    if nper == 0:
        return 0.0
    if rate == 0:
        return pv / nper
    return pv * rate / (1 - (1 + rate) ** -nper)


def validate_inputs(
    inputs: dict,
    required: list[str],
    non_negative: list[str],
) -> None:
    """Validate calculator inputs: check required keys exist and values are non-negative."""
    missing = [k for k in required if k not in inputs]
    if missing:
        raise ValueError(f"Missing required fields: {', '.join(missing)}")

    negative = [k for k in non_negative if inputs.get(k, 0) < 0]
    if negative:
        raise ValueError(f"Fields must not be negative: {', '.join(negative)}")
