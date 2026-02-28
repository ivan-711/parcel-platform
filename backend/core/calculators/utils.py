def pmt(rate: float, nper: int, pv: float) -> float:
    """
    Calculate fixed monthly payment for a loan.
    rate: monthly interest rate (annual_rate / 12)
    nper: total number of payments
    pv: loan principal (positive number)
    Returns monthly payment as a positive float.
    """
    if rate == 0:
        return pv / nper
    return pv * rate / (1 - (1 + rate) ** -nper)
