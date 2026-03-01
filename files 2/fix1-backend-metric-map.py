# ─────────────────────────────────────────────────────────────────────────────
# FIX 1 — backend/routers/deals.py
# Find _METRIC_MAP and replace it with this complete mapping.
# ─────────────────────────────────────────────────────────────────────────────
#
# FIND (approximate — your current version may only have wholesale):
#   _METRIC_MAP = {
#       "wholesale": ("MAO", "mao"),
#       ...
#   }
#
# REPLACE WITH:

_METRIC_MAP: dict[str, tuple[str, str]] = {
    # strategy       → (display_label,            output_key)
    "wholesale":        ("Maximum Allowable Offer", "mao"),
    "buy_and_hold":     ("Cash-on-Cash Return",     "coc_return"),
    "flip":             ("Gross Profit",             "gross_profit"),
    "brrrr":            ("Money Left In",            "money_left_in"),
    "creative_finance": ("Monthly Cash Flow",        "monthly_cash_flow"),
}

# ─────────────────────────────────────────────────────────────────────────────
# Then confirm the helper that reads outputs uses this map — it should look
# roughly like:
#
#   label, key = _METRIC_MAP.get(deal.strategy, ("—", ""))
#   value = deal.outputs.get(key) if deal.outputs and key else None
#   return {
#       ...deal_fields,
#       "primary_metric_label": label,
#       "primary_metric_value": value,
#   }
#
# No other changes needed in that function.
# ─────────────────────────────────────────────────────────────────────────────
