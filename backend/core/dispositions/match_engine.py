"""
Match scoring engine — pure functions, no DB access.

Scores how well a property (+ optional scenario) fits a buyer's buy box
across four dimensions: location, financial, property, strategy.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _to_float(val: Any) -> float | None:
    """Safely convert a value (including Decimal) to float. Returns None on failure."""
    if val is None:
        return None
    try:
        return float(val)
    except (TypeError, ValueError):
        return None


def _check_range(value: float | None, min_val: float | None, max_val: float | None) -> bool | None:
    """
    Check whether value falls within [min_val, max_val].

    Returns:
        True  — value is within range
        False — value is outside range
        None  — criterion is unspecified (both bounds are None), treat as full points
    """
    if min_val is None and max_val is None:
        return None  # no restriction
    if value is None:
        return False  # criterion specified but we have no value
    if min_val is not None and value < min_val:
        return False
    if max_val is not None and value > max_val:
        return False
    return True


def _format_price(n: float | None) -> str:
    """Return a human-readable price string, e.g. '$1.2M', '$450K', '$85K'."""
    if n is None:
        return "N/A"
    abs_n = abs(n)
    if abs_n >= 1_000_000:
        return f"${abs_n / 1_000_000:.1f}M"
    if abs_n >= 1_000:
        return f"${abs_n / 1_000:.0f}K"
    return f"${abs_n:.0f}"


# ---------------------------------------------------------------------------
# Dimension scorers
# ---------------------------------------------------------------------------

def _score_location(property_data: dict, buy_box_data: dict) -> tuple[int, list[str]]:
    """Return (points 0-25, reason strings)."""
    reasons: list[str] = []
    target_markets: list[str] | None = buy_box_data.get("target_markets") or None

    if not target_markets:
        reasons.append("No target market restriction — location accepted.")
        return 25, reasons

    city = (property_data.get("city") or "").strip()
    state = (property_data.get("state") or "").strip()
    zip_code = (property_data.get("zip_code") or "").strip()

    # Build search tokens for the property
    prop_tokens = [t.lower() for t in [city, state, zip_code] if t]

    # Full match: any target market string is a substring of any property token
    # (or vice-versa — handles "Phoenix, AZ" matching city="Phoenix" state="AZ")
    for market in target_markets:
        market_lower = market.lower()
        market_parts = [p.strip() for p in market_lower.replace(",", " ").split()]
        if all(
            any(part in token or token in part for token in prop_tokens)
            for part in market_parts
            if part
        ):
            reasons.append(f"Property location matches target market '{market}'.")
            return 25, reasons

    # Partial match: same state
    state_lower = state.lower()
    for market in target_markets:
        market_lower = market.lower()
        if state_lower and state_lower in market_lower:
            reasons.append(
                f"Property is in {state} which overlaps a target market, "
                f"but city/zip does not fully match."
            )
            return 10, reasons

    reasons.append(
        f"Property ({city}, {state} {zip_code}) does not match any target market "
        f"({', '.join(target_markets)})."
    )
    return 0, reasons


def _score_financial(
    property_data: dict, scenario_data: dict | None, buy_box_data: dict
) -> tuple[int, list[str]]:
    """Return (points 0-25, reason strings)."""
    reasons: list[str] = []
    sub_score = 0
    sub_max = 0

    # --- purchase price (8 pts) ---
    price_pts = 8
    sub_max += price_pts
    purchase_price = _to_float(
        (scenario_data or {}).get("purchase_price") or property_data.get("purchase_price")
    )
    min_price = _to_float(buy_box_data.get("min_price"))
    max_price = _to_float(buy_box_data.get("max_price"))
    result = _check_range(purchase_price, min_price, max_price)
    if result is None:
        sub_score += price_pts
        reasons.append("No purchase price restriction.")
    elif result:
        sub_score += price_pts
        reasons.append(
            f"Purchase price {_format_price(purchase_price)} is within range "
            f"({_format_price(min_price)}–{_format_price(max_price)})."
        )
    else:
        reasons.append(
            f"Purchase price {_format_price(purchase_price)} is outside range "
            f"({_format_price(min_price)}–{_format_price(max_price)})."
        )

    # --- ARV (4 pts) ---
    arv_pts = 4
    sub_max += arv_pts
    arv = _to_float((scenario_data or {}).get("after_repair_value"))
    min_arv = _to_float(buy_box_data.get("min_arv"))
    max_arv = _to_float(buy_box_data.get("max_arv"))
    result = _check_range(arv, min_arv, max_arv)
    if result is None:
        sub_score += arv_pts
        reasons.append("No ARV restriction.")
    elif result:
        sub_score += arv_pts
        reasons.append(
            f"ARV {_format_price(arv)} is within range "
            f"({_format_price(min_arv)}–{_format_price(max_arv)})."
        )
    else:
        reasons.append(
            f"ARV {_format_price(arv)} is outside range "
            f"({_format_price(min_arv)}–{_format_price(max_arv)})."
        )

    # --- monthly cash flow (4 pts) ---
    cf_pts = 4
    sub_max += cf_pts
    outputs = (scenario_data or {}).get("outputs") or {}
    cash_flow = _to_float(outputs.get("monthly_cash_flow"))
    min_cash_flow = _to_float(buy_box_data.get("min_cash_flow"))
    if min_cash_flow is None:
        sub_score += cf_pts
        reasons.append("No minimum cash flow restriction.")
    elif cash_flow is None:
        reasons.append("Cash flow data unavailable; criterion not met.")
    elif cash_flow >= min_cash_flow:
        sub_score += cf_pts
        reasons.append(
            f"Monthly cash flow ${cash_flow:,.0f} meets minimum ${min_cash_flow:,.0f}."
        )
    else:
        reasons.append(
            f"Monthly cash flow ${cash_flow:,.0f} is below minimum ${min_cash_flow:,.0f}."
        )

    # --- cap rate (3 pts) ---
    cr_pts = 3
    sub_max += cr_pts
    cap_rate = _to_float(outputs.get("cap_rate"))
    min_cap_rate = _to_float(buy_box_data.get("min_cap_rate"))
    if min_cap_rate is None:
        sub_score += cr_pts
        reasons.append("No minimum cap rate restriction.")
    elif cap_rate is None:
        reasons.append("Cap rate data unavailable; criterion not met.")
    elif cap_rate >= min_cap_rate:
        sub_score += cr_pts
        reasons.append(
            f"Cap rate {cap_rate:.1f}% meets minimum {min_cap_rate:.1f}%."
        )
    else:
        reasons.append(
            f"Cap rate {cap_rate:.1f}% is below minimum {min_cap_rate:.1f}%."
        )

    # --- CoC return (3 pts) ---
    coc_pts = 3
    sub_max += coc_pts
    coc_return = _to_float(outputs.get("coc_return"))
    min_coc_return = _to_float(buy_box_data.get("min_coc_return"))
    if min_coc_return is None:
        sub_score += coc_pts
        reasons.append("No minimum CoC return restriction.")
    elif coc_return is None:
        reasons.append("CoC return data unavailable; criterion not met.")
    elif coc_return >= min_coc_return:
        sub_score += coc_pts
        reasons.append(
            f"CoC return {coc_return:.1f}% meets minimum {min_coc_return:.1f}%."
        )
    else:
        reasons.append(
            f"CoC return {coc_return:.1f}% is below minimum {min_coc_return:.1f}%."
        )

    # --- repair cost (3 pts) ---
    rc_pts = 3
    sub_max += rc_pts
    repair_cost = _to_float((scenario_data or {}).get("repair_cost"))
    max_repair_cost = _to_float(buy_box_data.get("max_repair_cost"))
    if max_repair_cost is None:
        sub_score += rc_pts
        reasons.append("No maximum repair cost restriction.")
    elif repair_cost is None:
        reasons.append("Repair cost data unavailable; criterion not met.")
    elif repair_cost <= max_repair_cost:
        sub_score += rc_pts
        reasons.append(
            f"Repair cost {_format_price(repair_cost)} is within maximum {_format_price(max_repair_cost)}."
        )
    else:
        reasons.append(
            f"Repair cost {_format_price(repair_cost)} exceeds maximum {_format_price(max_repair_cost)}."
        )

    # Scale to 25
    scaled = round(sub_score / sub_max * 25) if sub_max else 0
    return scaled, reasons


def _score_property(property_data: dict, buy_box_data: dict) -> tuple[int, list[str]]:
    """Return (points 0-25, reason strings)."""
    reasons: list[str] = []
    sub_score = 0
    sub_max = 0

    # --- property type (10 pts) ---
    pt_pts = 10
    sub_max += pt_pts
    prop_type = (property_data.get("property_type") or "").strip().lower()
    allowed_types: list[str] | None = buy_box_data.get("property_types") or None
    if not allowed_types:
        sub_score += pt_pts
        reasons.append("No property type restriction.")
    elif prop_type and any(t.lower() == prop_type for t in allowed_types):
        sub_score += pt_pts
        reasons.append(f"Property type '{prop_type}' is in accepted types.")
    else:
        reasons.append(
            f"Property type '{prop_type}' is not in accepted types "
            f"({', '.join(allowed_types)})."
        )

    # --- bedrooms (5 pts) ---
    bed_pts = 5
    sub_max += bed_pts
    bedrooms = _to_float(property_data.get("bedrooms"))
    min_bedrooms = _to_float(buy_box_data.get("min_bedrooms"))
    if min_bedrooms is None:
        sub_score += bed_pts
        reasons.append("No minimum bedroom restriction.")
    elif bedrooms is None:
        reasons.append("Bedroom count unavailable; criterion not met.")
    elif bedrooms >= min_bedrooms:
        sub_score += bed_pts
        reasons.append(f"{int(bedrooms)} bed meets minimum {int(min_bedrooms)} bed.")
    else:
        reasons.append(f"{int(bedrooms)} bed is below minimum {int(min_bedrooms)} bed.")

    # --- bathrooms (3 pts) ---
    bath_pts = 3
    sub_max += bath_pts
    bathrooms = _to_float(property_data.get("bathrooms"))
    min_bathrooms = _to_float(buy_box_data.get("min_bathrooms"))
    if min_bathrooms is None:
        sub_score += bath_pts
        reasons.append("No minimum bathroom restriction.")
    elif bathrooms is None:
        reasons.append("Bathroom count unavailable; criterion not met.")
    elif bathrooms >= min_bathrooms:
        sub_score += bath_pts
        reasons.append(f"{bathrooms:.1f} bath meets minimum {min_bathrooms:.1f} bath.")
    else:
        reasons.append(f"{bathrooms:.1f} bath is below minimum {min_bathrooms:.1f} bath.")

    # --- sqft (4 pts) ---
    sqft_pts = 4
    sub_max += sqft_pts
    sqft = _to_float(property_data.get("sqft"))
    min_sqft = _to_float(buy_box_data.get("min_sqft"))
    if min_sqft is None:
        sub_score += sqft_pts
        reasons.append("No minimum sqft restriction.")
    elif sqft is None:
        reasons.append("Square footage unavailable; criterion not met.")
    elif sqft >= min_sqft:
        sub_score += sqft_pts
        reasons.append(f"{sqft:,.0f} sqft meets minimum {min_sqft:,.0f} sqft.")
    else:
        reasons.append(f"{sqft:,.0f} sqft is below minimum {min_sqft:,.0f} sqft.")

    # --- year built (3 pts) ---
    yb_pts = 3
    sub_max += yb_pts
    year_built = _to_float(property_data.get("year_built"))
    min_year = _to_float(buy_box_data.get("min_year_built"))
    max_year = _to_float(buy_box_data.get("max_year_built"))
    result = _check_range(year_built, min_year, max_year)
    if result is None:
        sub_score += yb_pts
        reasons.append("No year built restriction.")
    elif result:
        sub_score += yb_pts
        reasons.append(
            f"Year built {int(year_built)} is within range "
            f"({int(min_year) if min_year else 'any'}–{int(max_year) if max_year else 'any'})."
        )
    else:
        reasons.append(
            f"Year built {int(year_built) if year_built else 'unknown'} is outside range "
            f"({int(min_year) if min_year else 'any'}–{int(max_year) if max_year else 'any'})."
        )

    scaled = round(sub_score / sub_max * 25) if sub_max else 0
    return scaled, reasons


def _score_strategy(scenario_data: dict | None, buy_box_data: dict) -> tuple[int, list[str]]:
    """Return (points 0-25, reason strings)."""
    reasons: list[str] = []
    allowed_strategies: list[str] | None = buy_box_data.get("strategies") or None

    if not allowed_strategies:
        reasons.append("No strategy restriction — all strategies accepted.")
        return 25, reasons

    if not scenario_data:
        reasons.append("No scenario attached to property; strategy cannot be evaluated.")
        return 0, reasons

    strategy = (scenario_data.get("strategy") or "").strip().lower()
    if not strategy:
        reasons.append("Scenario has no strategy set; criterion not met.")
        return 0, reasons

    if any(s.lower() == strategy for s in allowed_strategies):
        reasons.append(f"Strategy '{strategy}' matches buyer's accepted strategies.")
        return 25, reasons

    reasons.append(
        f"Strategy '{strategy}' is not in accepted strategies "
        f"({', '.join(allowed_strategies)})."
    )
    return 0, reasons


# ---------------------------------------------------------------------------
# Main public function
# ---------------------------------------------------------------------------

def score_property_against_buy_box(
    property_data: dict,
    scenario_data: dict | None,
    buy_box_data: dict,
) -> dict:
    """
    Score how well a property matches a buyer's buy box.

    Args:
        property_data:  dict with fields: city, state, zip_code, property_type,
                        bedrooms, bathrooms, sqft, year_built, purchase_price (optional).
        scenario_data:  dict with fields: purchase_price, after_repair_value,
                        repair_cost, strategy, outputs {monthly_cash_flow, cap_rate, ...};
                        or None if no scenario is linked.
        buy_box_data:   dict with all BuyBox criteria fields.

    Returns:
        {
            "total_score": int,          # 0–100
            "breakdown": {
                "location": int,         # 0–25
                "financial": int,        # 0–25
                "property": int,         # 0–25
                "strategy": int,         # 0–25
            },
            "match_level": str,          # "strong" | "moderate" | "weak" | "no_match"
            "reasons": list[str],
        }
    """
    loc_score, loc_reasons = _score_location(property_data, buy_box_data)
    fin_score, fin_reasons = _score_financial(property_data, scenario_data, buy_box_data)
    prop_score, prop_reasons = _score_property(property_data, buy_box_data)
    strat_score, strat_reasons = _score_strategy(scenario_data, buy_box_data)

    total = loc_score + fin_score + prop_score + strat_score

    if total >= 80:
        match_level = "strong"
    elif total >= 60:
        match_level = "moderate"
    elif total >= 40:
        match_level = "weak"
    else:
        match_level = "no_match"

    return {
        "total_score": total,
        "breakdown": {
            "location": loc_score,
            "financial": fin_score,
            "property": prop_score,
            "strategy": strat_score,
        },
        "match_level": match_level,
        "reasons": loc_reasons + fin_reasons + prop_reasons + strat_reasons,
    }
