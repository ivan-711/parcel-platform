"""DealNarrator — generates AI analysis narratives for AnalysisScenarios.

Uses Claude Sonnet (cost-effective when data is provided as context).
Every narrative states assumptions, flags risks, and acknowledges missing data.
"""

import hashlib
import json
import logging
import os
import time
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger(__name__)

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
MODEL = "claude-sonnet-4-20250514"

_SYSTEM_PROMPT = """You are a real estate investment analyst embedded in Parcel, a deal analysis platform. You produce concise, data-driven analysis narratives for investment properties.

<rules>
1. Speak as a confident analyst: "The data shows..." not "You should..."
2. NEVER make financial recommendations. Never say "I recommend", "You should buy", "You should avoid", or "This is a good/bad deal."
3. State every assumption explicitly: "Assuming 5% vacancy, which is typical for this market"
4. Flag specific risks with reasoning: "The 1965 build year means higher capex risk — most investors budget 7-8% instead of 5% for pre-1970 properties"
5. Acknowledge missing data honestly: "Repair estimate not available — using $0 until you provide one. This makes the projected returns optimistic."
6. End with what's missing and what the user should verify before making a decision.
7. Use markdown formatting. Bold key numbers. Use bullet lists for risks and assumptions.
8. Do NOT include a title/header — the UI provides that.
9. Keep the narrative focused and actionable. No filler, no disclaimers.
</rules>"""

_EXPERIENCE_INSTRUCTIONS = {
    "beginner": """<experience_level>BEGINNER — Explain every metric in plain language. For example: "Cash-on-cash return is 5.8% — that means for every dollar you invest upfront, you earn about 5.8 cents per year in cash flow. For buy-and-hold rentals in the Midwest, most investors target 8%+ which means this deal is below average." Define terms like NOI, cap rate, DSCR, ARV on first use. Use analogies where helpful.</experience_level>""",

    "intermediate": """<experience_level>INTERMEDIATE — Brief explanations where helpful. "5.8% CoC — below the typical 8% target for this market. The 1965 build and missing repair data are the main risk factors." Don't define basic terms but do explain unusual findings.</experience_level>""",

    "experienced": """<experience_level>EXPERIENCED — Terse and data-dense. "CoC 5.8%, below market. Flagged: 1965 build, no repair estimate, vacancy assumption aggressive at 5% for this zip." Skip definitions entirely. Focus on what's unusual or risky.</experience_level>""",
}


@dataclass
class NarrativeResult:
    """Result from AI narrative generation."""
    narrative: str = ""
    confidence: str = "medium"  # high | medium | low
    assumptions_stated: list[str] = field(default_factory=list)
    risks_flagged: list[str] = field(default_factory=list)
    missing_data: list[str] = field(default_factory=list)
    tokens_used: int = 0
    latency_ms: int = 0


def _build_inputs_hash(scenario) -> str:
    """Build a hash of scenario inputs for cache invalidation."""
    data = {
        "strategy": scenario.strategy,
        "purchase_price": str(scenario.purchase_price) if scenario.purchase_price else None,
        "after_repair_value": str(scenario.after_repair_value) if scenario.after_repair_value else None,
        "repair_cost": str(scenario.repair_cost) if scenario.repair_cost else None,
        "monthly_rent": str(scenario.monthly_rent) if scenario.monthly_rent else None,
        "down_payment_pct": str(scenario.down_payment_pct) if scenario.down_payment_pct else None,
        "interest_rate": str(scenario.interest_rate) if scenario.interest_rate else None,
        "loan_term_years": scenario.loan_term_years,
        "outputs": scenario.outputs or {},
    }
    raw = json.dumps(data, sort_keys=True, default=str)
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


def _build_context(scenario, prop) -> str:
    """Build the property + scenario context for the AI prompt (~1-2K tokens).

    All user-controlled text is sanitized to prevent prompt injection.
    """
    from core.ai.sanitize import sanitize_for_prompt

    lines = ["[PROPERTY DATA]"]

    # Property info — sanitize all text fields
    if prop:
        addr = sanitize_for_prompt(f"{prop.address_line1}, {prop.city}, {prop.state} {prop.zip_code}", 200)
        lines.append(f"Address: {addr}")
        if prop.property_type:
            lines.append(f"Type: {prop.property_type}")
        if prop.bedrooms is not None:
            lines.append(f"Bedrooms: {prop.bedrooms}")
        if prop.bathrooms is not None:
            lines.append(f"Bathrooms: {prop.bathrooms}")
        if prop.sqft is not None:
            lines.append(f"Sqft: {prop.sqft:,}")
        if prop.lot_sqft is not None:
            lines.append(f"Lot sqft: {prop.lot_sqft:,}")
        if prop.year_built is not None:
            lines.append(f"Year built: {prop.year_built}")
        if prop.county:
            lines.append(f"County: {prop.county}")

    lines.append("[END PROPERTY DATA]")
    lines.append("")
    lines.append("[SCENARIO DATA]")
    lines.append(f"Strategy: {scenario.strategy}")

    # Typed inputs
    if scenario.purchase_price is not None:
        lines.append(f"Purchase price: ${scenario.purchase_price:,.2f}")
    if scenario.after_repair_value is not None:
        lines.append(f"After repair value (ARV): ${scenario.after_repair_value:,.2f}")
    if scenario.repair_cost is not None:
        lines.append(f"Repair cost: ${scenario.repair_cost:,.2f}")
    if scenario.monthly_rent is not None:
        lines.append(f"Monthly rent: ${scenario.monthly_rent:,.2f}")
    if scenario.down_payment_pct is not None:
        lines.append(f"Down payment: {scenario.down_payment_pct}%")
    if scenario.interest_rate is not None:
        lines.append(f"Interest rate: {scenario.interest_rate}%")
    if scenario.loan_term_years is not None:
        lines.append(f"Loan term: {scenario.loan_term_years} years")

    # Outputs
    outputs = scenario.outputs or {}
    if outputs:
        lines.append("")
        lines.append("Calculated outputs:")
        for key, value in outputs.items():
            if isinstance(value, (int, float)):
                if "pct" in key or "rate" in key or "return" in key:
                    lines.append(f"  {key}: {value}%")
                elif value > 100:
                    lines.append(f"  {key}: ${value:,.2f}")
                else:
                    lines.append(f"  {key}: {value}")
            elif value is not None:
                lines.append(f"  {key}: {value}")

    # Risk
    if scenario.risk_score is not None:
        lines.append(f"\nRisk score: {scenario.risk_score}/100")

    # Bricked data (comps, repairs, renovation score)
    ext = scenario.inputs_extended or {}

    renovation = ext.get("renovation_score")
    if isinstance(renovation, dict) and renovation.get("has_score"):
        lines.append(
            f"Renovation score: {renovation.get('score', 'N/A')} "
            f"(confidence: {renovation.get('confidence', 'N/A')})"
        )

    bricked_repairs = ext.get("bricked_repairs")
    if bricked_repairs and scenario.repair_cost is not None:
        rc = float(scenario.repair_cost)
        lines.append(
            f"\nRepair estimate ({len(bricked_repairs)} items, "
            f"total: ${rc:,.0f}):"
        )
        for r in bricked_repairs[:5]:
            label = sanitize_for_prompt(r.get("repair", ""), 50)
            cost = r.get("cost", 0)
            lines.append(f"  - {label}: ${cost:,}")

    bricked_comps = ext.get("bricked_comps")
    if bricked_comps:
        lines.append(f"\nComparable sales ({len(bricked_comps)} comps):")
        for c in bricked_comps[:3]:
            addr = sanitize_for_prompt(c.get("address", ""), 80)
            adj = c.get("adjusted_value", 0)
            ctype = c.get("comp_type", "N/A")
            lines.append(f"  - {addr}: adjusted ${adj:,.0f} ({ctype})")

    # Source confidence
    if scenario.source_confidence:
        missing = [k for k, v in scenario.source_confidence.items()
                   if v.get("confidence") == "missing"]
        if missing:
            lines.append(f"\nMissing data fields: {', '.join(missing)}")

    lines.append("[END SCENARIO DATA]")

    return "\n".join(lines)


async def narrate(
    scenario,
    prop,
    user_experience_level: str = "intermediate",
) -> NarrativeResult:
    """Generate an AI analysis narrative for an AnalysisScenario.

    Args:
        scenario: AnalysisScenario model instance
        prop: Property model instance
        user_experience_level: "beginner" | "intermediate" | "experienced"

    Returns:
        NarrativeResult with narrative text, confidence, and metadata.
        On failure, returns empty NarrativeResult (never raises).
    """
    start = time.time()
    result = NarrativeResult()

    if not ANTHROPIC_API_KEY:
        logger.info("ANTHROPIC_API_KEY not set — narrative generation skipped")
        result.narrative = ""
        result.confidence = "low"
        result.missing_data = ["AI narrative unavailable — API key not configured"]
        return result

    try:
        from anthropic import Anthropic

        client = Anthropic(api_key=ANTHROPIC_API_KEY)

        # Build context
        context = _build_context(scenario, prop)

        # Build system prompt with experience level
        exp_instruction = _EXPERIENCE_INSTRUCTIONS.get(
            user_experience_level,
            _EXPERIENCE_INSTRUCTIONS["intermediate"],
        )
        system = _SYSTEM_PROMPT + "\n\n" + exp_instruction

        user_message = f"""Analyze this {scenario.strategy.replace('_', ' ')} deal and produce a narrative assessment.

{context}

Produce your analysis now. Remember: state assumptions, flag risks, acknowledge missing data."""

        response = client.messages.create(
            model=MODEL,
            max_tokens=800,
            system=system,
            messages=[{"role": "user", "content": user_message}],
        )

        result.narrative = response.content[0].text
        result.tokens_used = (response.usage.input_tokens or 0) + (response.usage.output_tokens or 0)
        result.latency_ms = int((time.time() - start) * 1000)

        # Determine confidence based on data completeness
        missing_count = len([
            f for f in [scenario.purchase_price, scenario.monthly_rent,
                        scenario.after_repair_value]
            if f is None
        ])
        if missing_count == 0:
            result.confidence = "high"
        elif missing_count <= 1:
            result.confidence = "medium"
        else:
            result.confidence = "low"

        # Extract assumptions and risks from the narrative (best-effort parsing)
        narrative_lower = result.narrative.lower()
        if "assum" in narrative_lower:
            result.assumptions_stated = ["See narrative for stated assumptions"]
        if "risk" in narrative_lower or "flag" in narrative_lower:
            result.risks_flagged = ["See narrative for flagged risks"]
        if "missing" in narrative_lower or "unavailable" in narrative_lower or "not available" in narrative_lower:
            result.missing_data = ["See narrative for missing data acknowledgments"]

        return result

    except Exception:
        logger.exception("AI narrative generation failed")
        result.latency_ms = int((time.time() - start) * 1000)
        result.confidence = "low"
        result.narrative = ""
        return result


def get_inputs_hash(scenario) -> str:
    """Public accessor for cache key computation."""
    return _build_inputs_hash(scenario)
