"""Generate professional real estate offer letters using the Claude API."""

import logging
import os
from typing import Any

from anthropic import Anthropic

from models.deals import Deal

logger = logging.getLogger(__name__)

anthropic_client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

SYSTEM_PROMPT = (
    "You are a real estate transaction specialist who writes professional, "
    "concise offer letters for real estate investors. Write in a formal but "
    "direct tone. Do not include placeholders like [DATE] or [SIGNATURE] — "
    "write the letter as if it is ready to send. Use realistic professional "
    "language."
)


def _build_deal_terms(
    strategy: str, inputs: dict[str, Any], outputs: dict[str, Any],
) -> tuple[str, str]:
    """Build the offer price line and key-terms block for a given strategy.

    Returns (offer_price_description, key_terms_block).
    """
    if strategy == "wholesale":
        offer_price = f"${inputs.get('asking_price', 0):,.0f}"
        terms = (
            f"- Maximum Allowable Offer (MAO): ${outputs.get('mao', 0):,.0f}\n"
            f"- Desired Profit: ${inputs.get('desired_profit', 0):,.0f}\n"
            f"- Estimated Repair Costs: ${inputs.get('repair_costs', 0):,.0f}"
        )

    elif strategy == "buy_and_hold":
        purchase = inputs.get("purchase_price", 0)
        down_pct = inputs.get("down_payment_pct", 0)
        offer_price = f"${purchase:,.0f}"
        terms = (
            f"- Purchase Price: ${purchase:,.0f}\n"
            f"- Down Payment: {down_pct}%\n"
            f"- Monthly Rent: ${inputs.get('monthly_rent', 0):,.0f}\n"
            f"- Cash-on-Cash Return: {outputs.get('coc_return', 0):.1f}%"
        )

    elif strategy == "brrrr":
        purchase = inputs.get("purchase_price", 0)
        offer_price = f"${purchase:,.0f}"
        terms = (
            f"- Purchase Price: ${purchase:,.0f}\n"
            f"- Rehab Costs: ${inputs.get('rehab_costs', 0):,.0f}\n"
            f"- After Repair Value (ARV): ${inputs.get('arv_post_rehab', 0):,.0f}"
        )

    elif strategy == "flip":
        purchase = inputs.get("purchase_price", 0)
        offer_price = f"${purchase:,.0f}"
        terms = (
            f"- Purchase Price: ${purchase:,.0f}\n"
            f"- Rehab Budget: ${inputs.get('rehab_budget', 0):,.0f}\n"
            f"- After Repair Value (ARV): ${inputs.get('arv', 0):,.0f}\n"
            f"- Projected Profit: ${outputs.get('net_profit', outputs.get('gross_profit', 0)):,.0f}"
        )

    elif strategy == "creative_finance":
        balance = inputs.get("existing_loan_balance", 0)
        offer_price = f"${balance:,.0f}"
        finance_type = inputs.get("finance_type", "subject_to")
        finance_label = (
            "Subject-To Existing Financing"
            if finance_type == "subject_to"
            else "Seller Financing"
        )
        terms = (
            f"- Existing Loan Balance: ${balance:,.0f}\n"
            f"- Existing Interest Rate: {inputs.get('existing_interest_rate', 0)}%\n"
            f"- Finance Type: {finance_label}\n"
            f"- Monthly PITI: ${inputs.get('monthly_piti', 0):,.0f}"
        )

    else:
        offer_price = "N/A"
        terms = "No strategy-specific terms available."

    return offer_price, terms


def generate_offer_letter(deal: Deal) -> str:
    """Call Claude to produce a professional offer letter for the given deal.

    Raises on API errors — callers should handle exceptions.
    """
    inputs: dict[str, Any] = deal.inputs or {}
    outputs: dict[str, Any] = deal.outputs or {}
    strategy_label = deal.strategy.replace("_", " ").title()

    offer_price, key_terms = _build_deal_terms(deal.strategy, inputs, outputs)

    user_prompt = (
        "Write a professional real estate offer letter for the following deal:\n\n"
        f"Property Address: {deal.address}\n"
        f"Strategy: {strategy_label}\n"
        f"Offer Price: {offer_price}\n\n"
        f"Key Deal Terms:\n{key_terms}\n\n"
        f"Risk Score: {deal.risk_score or 'N/A'}/100\n\n"
        "Write a 3-4 paragraph offer letter from the buyer to the seller. "
        "Include: opening paragraph stating the offer price and property, "
        "middle paragraph outlining key terms and conditions, closing "
        "paragraph with next steps and contact information placeholder. "
        "Sign off as 'Parcel Investment Group'."
    )

    response = anthropic_client.messages.create(
        model="claude-opus-4-5",
        max_tokens=1000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )
    return response.content[0].text
