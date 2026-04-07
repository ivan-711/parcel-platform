#!/usr/bin/env python3
"""Seed a fully populated demo account for recruiters and investors.

Usage:
    cd backend && python scripts/seed_demo.py
"""

import os
import sys
import uuid
from datetime import date, datetime, timedelta
from decimal import Decimal
from pathlib import Path

# ---------------------------------------------------------------------------
# Path setup — ensure backend/ is importable regardless of cwd
# ---------------------------------------------------------------------------
_BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from dotenv import load_dotenv

load_dotenv(_BACKEND_DIR / ".env")

# ---------------------------------------------------------------------------
# Project imports
# ---------------------------------------------------------------------------
try:
    from database import SessionLocal
    from models import (
        AnalysisScenario,
        ChatMessage,
        Deal,
        Document,
        PipelineEntry,
        PortfolioEntry,
        Property,
        User,
    )
    # hash_password removed — Clerk handles authentication
    from core.calculators import (
        calculate_wholesale,
        calculate_buy_and_hold,
        calculate_flip,
        calculate_brrrr,
        calculate_creative_finance,
        calculate_risk_score,
    )
except ImportError as exc:
    print(f"\n  IMPORT ERROR: {exc}")
    print("  Make sure you run from the backend directory with deps installed:")
    print("    cd backend && source venv/bin/activate && python scripts/seed_demo.py\n")
    sys.exit(1)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
from core.demo import DEMO_EMAIL  # noqa: E402 — single source of truth
DEMO_PASSWORD = "Demo1234!"
DEMO_NAME = "Alex Rivera"
DEMO_ROLE = "investor"

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

CALC_MAP = {
    "wholesale": calculate_wholesale,
    "buy_and_hold": calculate_buy_and_hold,
    "flip": calculate_flip,
    "brrrr": calculate_brrrr,
    "creative_finance": calculate_creative_finance,
}

# ---------------------------------------------------------------------------
# Deal specs — 12 active deals (exact addresses/inputs from spec)
# ---------------------------------------------------------------------------
ACTIVE_DEAL_SPECS: list[dict] = [
    # (a) Wholesale — Milwaukee — status: shared
    {
        "address": "1847 N. 23rd St, Milwaukee WI 53205",
        "zip_code": "53205",
        "property_type": "single_family",
        "strategy": "wholesale",
        "inputs": {
            "arv": 185000,
            "repair_costs": 42000,
            "desired_profit": 18000,
            "holding_costs": 3500,
            "closing_costs_pct": 3.0,
            "asking_price": 95000,
        },
        "status": "shared",
        "created_offset_days": 18,
    },
    # (b) Wholesale — Sheboygan
    {
        "address": "924 Garfield Ave, Sheboygan WI 53081",
        "zip_code": "53081",
        "property_type": "single_family",
        "strategy": "wholesale",
        "inputs": {
            "arv": 145000,
            "repair_costs": 28000,
            "desired_profit": 15000,
            "holding_costs": 2800,
            "closing_costs_pct": 3.0,
            "asking_price": 72000,
        },
        "status": "saved",
        "created_offset_days": 14,
    },
    # (c) Wholesale — Milwaukee
    {
        "address": "3312 W. Vliet St, Milwaukee WI 53208",
        "zip_code": "53208",
        "property_type": "single_family",
        "strategy": "wholesale",
        "inputs": {
            "arv": 210000,
            "repair_costs": 55000,
            "desired_profit": 22000,
            "holding_costs": 4200,
            "closing_costs_pct": 3.0,
            "asking_price": 108000,
        },
        "status": "saved",
        "created_offset_days": 12,
    },
    # (d) Buy & Hold — Sheboygan duplex
    {
        "address": "412 S. 6th St, Sheboygan WI 53081",
        "zip_code": "53081",
        "property_type": "duplex",
        "strategy": "buy_and_hold",
        "inputs": {
            "purchase_price": 185000,
            "down_payment_pct": 20,
            "interest_rate": 7.25,
            "loan_term_years": 30,
            "monthly_rent": 2200,
            "monthly_taxes": 280,
            "monthly_insurance": 95,
            "vacancy_rate_pct": 8,
            "maintenance_pct": 5,
            "mgmt_fee_pct": 8,
        },
        "status": "saved",
        "created_offset_days": 22,
    },
    # (e) Buy & Hold — Brookfield
    {
        "address": "2209 Calhoun Rd, Brookfield WI 53005",
        "zip_code": "53005",
        "property_type": "single_family",
        "strategy": "buy_and_hold",
        "inputs": {
            "purchase_price": 245000,
            "down_payment_pct": 25,
            "interest_rate": 7.0,
            "loan_term_years": 30,
            "monthly_rent": 2600,
            "monthly_taxes": 380,
            "monthly_insurance": 120,
            "vacancy_rate_pct": 7,
            "maintenance_pct": 5,
            "mgmt_fee_pct": 8,
        },
        "status": "saved",
        "created_offset_days": 8,
    },
    # (f) Buy & Hold — Sheboygan
    {
        "address": "718 Erie Ave, Sheboygan WI 53081",
        "zip_code": "53081",
        "property_type": "single_family",
        "strategy": "buy_and_hold",
        "inputs": {
            "purchase_price": 142000,
            "down_payment_pct": 20,
            "interest_rate": 7.5,
            "loan_term_years": 30,
            "monthly_rent": 1650,
            "monthly_taxes": 210,
            "monthly_insurance": 80,
            "vacancy_rate_pct": 9,
            "maintenance_pct": 6,
            "mgmt_fee_pct": 0,
        },
        "status": "saved",
        "created_offset_days": 30,
    },
    # (g) BRRRR — Milwaukee
    {
        "address": "5521 W. Capitol Dr, Milwaukee WI 53216",
        "zip_code": "53216",
        "property_type": "single_family",
        "strategy": "brrrr",
        "inputs": {
            "purchase_price": 72000,
            "rehab_costs": 38000,
            "arv_post_rehab": 155000,
            "refinance_ltv_pct": 75,
            "new_loan_rate": 7.25,
            "new_loan_term_years": 30,
            "monthly_rent": 1450,
            "monthly_expenses": 420,
        },
        "status": "saved",
        "created_offset_days": 25,
    },
    # (h) BRRRR — Sheboygan
    {
        "address": "1104 Michigan Ave, Sheboygan WI 53081",
        "zip_code": "53081",
        "property_type": "single_family",
        "strategy": "brrrr",
        "inputs": {
            "purchase_price": 58000,
            "rehab_costs": 31000,
            "arv_post_rehab": 128000,
            "refinance_ltv_pct": 75,
            "new_loan_rate": 7.0,
            "new_loan_term_years": 30,
            "monthly_rent": 1250,
            "monthly_expenses": 380,
        },
        "status": "saved",
        "created_offset_days": 20,
    },
    # (i) Flip — Milwaukee
    {
        "address": "3087 N. Maryland Ave, Milwaukee WI 53211",
        "zip_code": "53211",
        "property_type": "single_family",
        "strategy": "flip",
        "inputs": {
            "purchase_price": 118000,
            "rehab_budget": 44000,
            "arv": 218000,
            "holding_months": 5,
            "selling_costs_pct": 8,
            "financing_costs": 9500,
        },
        "status": "saved",
        "created_offset_days": 16,
    },
    # (j) Flip — Sheboygan Falls
    {
        "address": "847 Territorial Rd, Sheboygan Falls WI 53085",
        "zip_code": "53085",
        "property_type": "single_family",
        "strategy": "flip",
        "inputs": {
            "purchase_price": 88000,
            "rehab_budget": 32000,
            "arv": 162000,
            "holding_months": 4,
            "selling_costs_pct": 8,
            "financing_costs": 7200,
        },
        "status": "saved",
        "created_offset_days": 10,
    },
    # (k) Creative Finance — Milwaukee (subject_to)
    {
        "address": "2244 S. Kinnickinnic Ave, Milwaukee WI 53207",
        "zip_code": "53207",
        "property_type": "single_family",
        "strategy": "creative_finance",
        "inputs": {
            "existing_loan_balance": 128000,
            "existing_interest_rate": 3.25,
            "monthly_piti": 985,
            "monthly_rent_estimate": 1850,
            "monthly_expenses": 380,
            "finance_type": "subject_to",
            "new_rate": 3.25,
            "new_term_years": 28,
            "arv": 198000,
        },
        "status": "saved",
        "created_offset_days": 6,
    },
    # (l) Creative Finance — Sheboygan (seller_finance)
    {
        "address": "619 Ontario Ave, Sheboygan WI 53081",
        "zip_code": "53081",
        "property_type": "single_family",
        "strategy": "creative_finance",
        "inputs": {
            "existing_loan_balance": 94000,
            "existing_interest_rate": 4.0,
            "monthly_piti": 820,
            "monthly_rent_estimate": 1500,
            "monthly_expenses": 290,
            "finance_type": "seller_finance",
            "new_rate": 5.5,
            "new_term_years": 30,
            "arv": 155000,
        },
        "status": "saved",
        "created_offset_days": 3,
    },
]

# ---------------------------------------------------------------------------
# Historical deal specs — 3 deals that back portfolio entries
# (PortfolioEntry.deal_id is NOT NULL, so we need Deal records)
# ---------------------------------------------------------------------------
PORTFOLIO_DEAL_SPECS: list[dict] = [
    # Portfolio (a) — wholesale closed 8 months ago
    {
        "address": "1422 W. Burleigh St, Milwaukee WI 53206",
        "zip_code": "53206",
        "property_type": "single_family",
        "strategy": "wholesale",
        "inputs": {
            "arv": 162000,
            "repair_costs": 30000,
            "desired_profit": 21500,
            "holding_costs": 2000,
            "closing_costs_pct": 3.0,
            "asking_price": 58000,
        },
        "status": "saved",
        "created_offset_days": 240,
    },
    # Portfolio (b) — flip closed 5 months ago
    {
        "address": "334 N. Water St, Milwaukee WI 53202",
        "zip_code": "53202",
        "property_type": "single_family",
        "strategy": "flip",
        "inputs": {
            "purchase_price": 120000,
            "rehab_budget": 28000,
            "arv": 198000,
            "holding_months": 4,
            "selling_costs_pct": 6,
            "financing_costs": 5800,
        },
        "status": "saved",
        "created_offset_days": 150,
    },
    # Portfolio (c) — buy_and_hold closed 14 months ago
    {
        "address": "508 Bluff Ave, Sheboygan WI 53081",
        "zip_code": "53081",
        "property_type": "single_family",
        "strategy": "buy_and_hold",
        "inputs": {
            "purchase_price": 138000,
            "down_payment_pct": 20,
            "interest_rate": 6.5,
            "loan_term_years": 30,
            "monthly_rent": 1500,
            "monthly_taxes": 195,
            "monthly_insurance": 75,
            "vacancy_rate_pct": 5,
            "maintenance_pct": 5,
            "mgmt_fee_pct": 0,
        },
        "status": "saved",
        "created_offset_days": 420,
    },
]

# ---------------------------------------------------------------------------
# Pipeline specs — (deal_index, stage, days_ago)
# ---------------------------------------------------------------------------
PIPELINE_SPECS: list[tuple[int, str, int]] = [
    (0, "offer_sent", 5),        # (a) Milwaukee wholesale
    (1, "analyzing", 10),        # (b) Sheboygan wholesale
    (3, "under_contract", 8),    # (d) Sheboygan duplex
    (4, "lead", 2),              # (e) Brookfield buy_hold
    (6, "due_diligence", 3),     # (g) Milwaukee BRRRR
    (8, "analyzing", 7),         # (i) Milwaukee flip
    (10, "offer_sent", 6),       # (k) Milwaukee creative finance
    (11, "lead", 14),            # (l) Sheboygan creative finance
]

# ---------------------------------------------------------------------------
# Portfolio entry specs — (portfolio_deal_index, closed_months_ago, closed_price, profit, monthly_cash_flow, notes)
# ---------------------------------------------------------------------------
PORTFOLIO_ENTRY_SPECS: list[tuple[int, int, str, str, str | None, str]] = [
    (0, 8, "162000", "21500", None,  "Assigned to end buyer. Clean deal."),
    (1, 5, "198000", "38200", None,  "Cosmetic rehab only. Sold in 11 days on market."),
    (2, 14, "138000", "0",    "420", "Cash flowing day one. Tenant in place at purchase."),
]

# ---------------------------------------------------------------------------
# Chat messages — exact content from spec
# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# Document specs — 3 fully-analyzed documents
# ---------------------------------------------------------------------------
DOCUMENT_SPECS: list[dict] = [
    {
        "original_filename": "1842_Oak_Street_Purchase_Agreement.pdf",
        "file_type": "pdf",
        "file_size_bytes": 284672,
        "s3_key": "demo/purchase_agreement.pdf",
        "document_type": "purchase_agreement",
        "parties": [
            {"name": "Marcus Webb", "role": "buyer"},
            {"name": "Sandra Kowalski", "role": "seller"},
        ],
        "ai_summary": (
            "Residential purchase agreement for a single-family property at "
            "1842 Oak Street, Milwaukee, WI 53204. Purchase price of $147,500 "
            "with a $3,000 earnest money deposit. Closing contingent on buyer "
            "financing approval within 21 days. Seller agrees to provide clear "
            "title. No inspection contingency included \u2014 property sold as-is. "
            "30-day closing timeline."
        ),
        "risk_flags": [
            {
                "severity": "high",
                "description": (
                    "No inspection contingency clause \u2014 buyer accepts property "
                    "as-is with no right to renegotiate based on inspection findings"
                ),
                "quote": "Buyer accepts the Property in its present condition, AS IS, WHERE IS",
            },
            {
                "severity": "medium",
                "description": (
                    "Short financing contingency window of 21 days may be "
                    "insufficient for conventional loan approval in current market"
                ),
                "quote": "Buyer shall have 21 days from execution to obtain financing commitment",
            },
            {
                "severity": "low",
                "description": (
                    "Earnest money deposit of $3,000 is only 2% of purchase "
                    "price \u2014 below typical 3-5% for this market"
                ),
                "quote": "Earnest money deposit in the amount of Three Thousand Dollars ($3,000)",
            },
        ],
        "extracted_numbers": {
            "purchase_price": 147500,
            "earnest_money_deposit": 3000,
            "closing_date": "2026-04-28",
            "financing_contingency_days": 21,
            "closing_timeline_days": 30,
        },
        "key_terms": [
            "Property sold as-is \u2014 no inspection contingency",
            "Closing contingent on buyer financing approval within 21 days",
            "Seller to provide clear and marketable title",
            "All appliances included in sale price",
            "Seller responsible for property taxes through closing date",
            "Buyer responsible for all closing costs on buyer\u2019s side",
        ],
        "created_offset_days": 5,
    },
    {
        "original_filename": "2247_Maple_Ave_Inspection_Report.pdf",
        "file_type": "pdf",
        "file_size_bytes": 521216,
        "s3_key": "demo/inspection_report.pdf",
        "document_type": "inspection_report",
        "parties": [
            {"name": "Great Lakes Home Inspectors", "role": "inspector"},
            {"name": "David Okafor", "role": "buyer"},
        ],
        "ai_summary": (
            "Full home inspection report for a 1958-built duplex at 2247 Maple "
            "Ave, Sheboygan, WI 53081. Inspector identified 14 deficiencies: "
            "2 major, 7 moderate, 5 minor. Major issues include aging roof "
            "(estimated 2-4 years remaining useful life) and outdated electrical "
            "panel with aluminum wiring in the upper unit. HVAC systems functional "
            "but near end of service life. Foundation shows minor settling cracks "
            "\u2014 monitor but not structurally concerning. Both units have functional "
            "plumbing with no active leaks."
        ),
        "risk_flags": [
            {
                "severity": "high",
                "description": (
                    "Roof has estimated 2-4 years of remaining useful life \u2014 "
                    "replacement cost $8,000-$12,000 not reflected in current offer price"
                ),
                "quote": (
                    "Asphalt shingle roof exhibits widespread granule loss and "
                    "multiple areas of lifted flashing"
                ),
            },
            {
                "severity": "high",
                "description": (
                    "Aluminum wiring in upper unit is a known fire hazard \u2014 "
                    "requires either full rewire or COPALUM connector remediation"
                ),
                "quote": (
                    "Aluminum branch circuit wiring observed throughout upper "
                    "unit \u2014 considered a safety deficiency"
                ),
            },
            {
                "severity": "medium",
                "description": (
                    "Both furnaces are 19 years old and approaching end of typical "
                    "20-year service life \u2014 budget $4,000-$6,000 for replacement "
                    "within 2 years"
                ),
                "quote": (
                    "Upper and lower unit furnaces installed 2007, functioning "
                    "but near end of service life"
                ),
            },
        ],
        "extracted_numbers": {
            "inspection_date": "2026-02-18",
            "property_age_years": 68,
            "roof_remaining_life_years": 3,
            "total_deficiencies": 14,
            "major_deficiencies": 2,
            "estimated_repair_minimum": 18000,
            "estimated_repair_maximum": 27000,
        },
        "key_terms": [
            "Roof replacement required within 2-4 years \u2014 $8,000-$12,000 cost",
            "Aluminum wiring in upper unit \u2014 fire safety concern requiring remediation",
            "Both HVAC units near end of service life \u2014 budget for replacement",
            "Foundation settling cracks \u2014 monitor annually, not currently structural",
            "All plumbing functional with no active leaks detected",
            "Electrical panel is 200-amp service \u2014 adequate for duplex",
        ],
        "created_offset_days": 12,
    },
    {
        "original_filename": "Unit_A_Lease_2026.pdf",
        "file_type": "pdf",
        "file_size_bytes": 198656,
        "s3_key": "demo/lease_agreement.pdf",
        "document_type": "lease",
        "parties": [
            {"name": "Cornerstone Properties LLC", "role": "landlord"},
            {"name": "Angela Reyes", "role": "tenant"},
        ],
        "ai_summary": (
            "12-month residential lease for Unit A at 2247 Maple Ave, Sheboygan, "
            "WI 53081. Monthly rent of $875 with a $875 security deposit (1 month). "
            "Lease runs March 1, 2026 through February 28, 2027. Tenant responsible "
            "for electricity and internet; landlord covers water, sewer, trash, and "
            "gas. No pets clause. Standard Wisconsin landlord-tenant terms. "
            "Month-to-month conversion after initial term at same rent unless "
            "60-day notice given."
        ),
        "risk_flags": [
            {
                "severity": "medium",
                "description": (
                    "Rent of $875/month is below current market rate of "
                    "$950-$1,050 for comparable Sheboygan units \u2014 upside "
                    "available at renewal but tenant has 12 months of below-market "
                    "occupancy"
                ),
                "quote": "Monthly rent shall be Eight Hundred Seventy-Five Dollars ($875.00)",
            },
            {
                "severity": "low",
                "description": (
                    "Month-to-month conversion clause does not include automatic "
                    "rent escalation \u2014 landlord must proactively send new rent notice"
                ),
                "quote": (
                    "Lease shall convert to month-to-month tenancy at the same "
                    "rental rate unless either party provides 60 days written notice"
                ),
            },
        ],
        "extracted_numbers": {
            "monthly_rent": 875,
            "security_deposit": 875,
            "lease_start": "2026-03-01",
            "lease_end": "2027-02-28",
            "lease_term_months": 12,
            "notice_period_days": 60,
        },
        "key_terms": [
            "12-month term: March 1, 2026 \u2014 February 28, 2027",
            "Rent: $875/month due 1st of month, 5-day grace period",
            "Security deposit: $875 (1 month\u2019s rent)",
            "Tenant pays electricity and internet; landlord pays water, sewer, trash, gas",
            "No pets allowed",
            "Month-to-month conversion after initial term at same rate",
            "60-day written notice required to terminate month-to-month",
        ],
        "created_offset_days": 20,
    },
]

# Chat messages are now served from fixtures/demo_chat.json via core.demo.chat_service
# No DB-seeded chat messages needed — the chat history endpoint returns fixture data
# for demo users without touching the database.


# ===========================================================================
# Helper functions
# ===========================================================================

def _get_or_create_user(db):
    """Find the demo user by email or create them."""
    user = db.query(User).filter(User.email == DEMO_EMAIL).first()
    if user:
        print(f"  Found existing user: {user.email} (id={user.id})")
        return user
    user = User(
        name=DEMO_NAME,
        email=DEMO_EMAIL,
        password_hash=None,  # Clerk handles authentication
        role=DEMO_ROLE,
    )
    db.add(user)
    db.flush()
    print(f"  Created user: {user.email} (id={user.id})")
    return user


def _wipe_demo_data(db, user_id):
    """Delete all data owned by the demo user, respecting FK order."""
    counts = {}
    counts["chat_messages"] = db.query(ChatMessage).filter(ChatMessage.user_id == user_id).delete()
    counts["portfolio_entries"] = db.query(PortfolioEntry).filter(PortfolioEntry.user_id == user_id).delete()
    counts["pipeline_entries"] = db.query(PipelineEntry).filter(PipelineEntry.user_id == user_id).delete()
    counts["documents"] = db.query(Document).filter(Document.user_id == user_id).delete()
    counts["scenarios"] = db.query(AnalysisScenario).filter(AnalysisScenario.created_by == user_id).delete()
    counts["deals"] = db.query(Deal).filter(Deal.user_id == user_id).delete()
    counts["properties"] = db.query(Property).filter(Property.created_by == user_id).delete()
    db.flush()
    total = sum(counts.values())
    if total > 0:
        print(f"  Wiped existing data: {counts}")
    else:
        print("  No existing demo data to clear")


def _parse_address(address):
    """Split 'street, city state zip' into components."""
    parts = address.rsplit(",", 1)
    line1 = parts[0].strip()
    rest = parts[1].strip() if len(parts) > 1 else ""
    # rest is like "Milwaukee WI 53205"
    tokens = rest.rsplit(" ", 2)
    city = tokens[0] if len(tokens) >= 3 else rest
    state = tokens[1] if len(tokens) >= 3 else ""
    return line1, city, state


def _extract_typed_columns(strategy, inputs):
    """Extract typed columns from inputs dict for AnalysisScenario."""
    return {
        "purchase_price": inputs.get("purchase_price"),
        "after_repair_value": inputs.get("arv") or inputs.get("arv_post_rehab"),
        "repair_cost": inputs.get("repair_costs") or inputs.get("rehab_costs") or inputs.get("rehab_budget"),
        "monthly_rent": inputs.get("monthly_rent") or inputs.get("monthly_rent_estimate"),
        "down_payment_pct": inputs.get("down_payment_pct"),
        "interest_rate": inputs.get("interest_rate") or inputs.get("existing_interest_rate"),
        "loan_term_years": inputs.get("loan_term_years") or inputs.get("new_term_years"),
    }


def _create_deal(db, user_id, address, zip_code, property_type, strategy, inputs, status="saved", created_offset_days=0):
    """Create a deal with linked Property + AnalysisScenario."""
    calc_fn = CALC_MAP[strategy]
    outputs = calc_fn(inputs)
    risk_score = calculate_risk_score(strategy, inputs, outputs)

    now = datetime.utcnow()
    created_at = now - timedelta(days=created_offset_days) if created_offset_days else now

    # Create Property
    line1, city, state = _parse_address(address)
    prop = Property(
        created_by=user_id,
        address_line1=line1,
        city=city,
        state=state[:2] if state else "WI",
        zip_code=zip_code,
        property_type=property_type,
        status="under_analysis",
    )
    prop.created_at = created_at
    prop.updated_at = created_at
    db.add(prop)
    db.flush()

    # Create Deal linked to Property
    deal = Deal(
        user_id=user_id,
        address=address,
        zip_code=zip_code,
        property_type=property_type,
        strategy=strategy,
        inputs=inputs,
        outputs=outputs,
        risk_score=risk_score,
        status=status,
        property_id=prop.id,
        deal_type="acquisition",
    )
    deal.created_at = created_at
    deal.updated_at = created_at
    db.add(deal)
    db.flush()

    # Create AnalysisScenario linked to both
    typed = _extract_typed_columns(strategy, inputs)
    scenario = AnalysisScenario(
        property_id=prop.id,
        deal_id=deal.id,
        created_by=user_id,
        strategy=strategy,
        outputs=outputs,
        risk_score=risk_score,
        **{k: v for k, v in typed.items() if v is not None},
    )
    scenario.created_at = created_at
    scenario.updated_at = created_at
    db.add(scenario)
    db.flush()

    return deal


def _create_pipeline_entry(db, deal_id, user_id, stage, days_ago):
    """Create a pipeline entry with a backdated entered_stage_at."""
    entry = PipelineEntry(
        deal_id=deal_id,
        user_id=user_id,
        stage=stage,
        entered_stage_at=datetime.utcnow() - timedelta(days=days_ago),
    )
    db.add(entry)
    db.flush()
    return entry


def _create_portfolio_entry(db, deal_id, user_id, closed_date, closed_price, profit, monthly_cash_flow, notes):
    """Create a portfolio entry for a historical closed deal."""
    entry = PortfolioEntry(
        deal_id=deal_id,
        user_id=user_id,
        closed_date=closed_date,
        closed_price=Decimal(closed_price),
        profit=Decimal(profit),
        monthly_cash_flow=Decimal(monthly_cash_flow) if monthly_cash_flow else None,
        notes=notes,
    )
    db.add(entry)
    db.flush()
    return entry


def _create_document(db, user_id, original_filename, file_type, file_size_bytes,
                     s3_key, document_type, parties, ai_summary, risk_flags,
                     extracted_numbers, key_terms, created_offset_days=0):
    """Create a fully-analyzed document record."""
    now = datetime.utcnow()
    created_at = now - timedelta(days=created_offset_days) if created_offset_days else now
    doc = Document(
        user_id=user_id,
        original_filename=original_filename,
        file_type=file_type,
        file_size_bytes=file_size_bytes,
        s3_key=s3_key,
        s3_bucket="parcel-platform-documents",
        status="complete",
        document_type=document_type,
        parties=parties,
        ai_summary=ai_summary,
        risk_flags=risk_flags,
        extracted_numbers=extracted_numbers,
        key_terms=key_terms,
    )
    doc.created_at = created_at
    doc.updated_at = created_at
    db.add(doc)
    db.flush()
    return doc


# _create_chat_message removed — demo chat is now fixture-based (see core.demo.chat_service)


# ===========================================================================
# Main seed function
# ===========================================================================

def seed():
    """Seed the demo account in a single transaction."""
    db = SessionLocal()
    try:
        print("\n  Seeding demo account...\n")

        # 1. Get or create user
        user = _get_or_create_user(db)

        # 2. Wipe existing demo data
        _wipe_demo_data(db, user.id)

        # 3. Create 12 active deals
        print("\n  Creating deals...")
        active_deals = []
        for i, spec in enumerate(ACTIVE_DEAL_SPECS):
            deal = _create_deal(db, user.id, **spec)
            label = chr(ord("a") + i)
            active_deals.append(deal)
            print(f"    ({label}) {deal.strategy:18s} | {deal.address:45s} | risk={deal.risk_score:3d} | {deal.status}")
        print(f"  Created {len(active_deals)} active deals")

        # 4. Create 3 historical deals for portfolio entries
        print("\n  Creating historical deals for portfolio...")
        portfolio_deals = []
        for spec in PORTFOLIO_DEAL_SPECS:
            deal = _create_deal(db, user.id, **spec)
            portfolio_deals.append(deal)
            print(f"    {deal.strategy:18s} | {deal.address:45s} | risk={deal.risk_score:3d}")
        print(f"  Created {len(portfolio_deals)} historical deals")

        # 5. Create 8 pipeline entries
        print("\n  Creating pipeline entries...")
        for deal_idx, stage, days_ago in PIPELINE_SPECS:
            deal = active_deals[deal_idx]
            _create_pipeline_entry(db, deal.id, user.id, stage, days_ago)
            label = chr(ord("a") + deal_idx)
            print(f"    ({label}) {deal.address[:40]:40s} -> {stage} ({days_ago}d ago)")
        print(f"  Created {len(PIPELINE_SPECS)} pipeline entries")

        # 6. Create 3 portfolio entries
        print("\n  Creating portfolio entries...")
        for pdeal_idx, months_ago, closed_price, profit, mcf, notes in PORTFOLIO_ENTRY_SPECS:
            pdeal = portfolio_deals[pdeal_idx]
            closed_date = date.today() - timedelta(days=months_ago * 30)
            _create_portfolio_entry(db, pdeal.id, user.id, closed_date, closed_price, profit, mcf, notes)
            print(f"    {pdeal.address[:40]:40s} | closed ${closed_price} | profit ${profit}")
        print(f"  Created {len(PORTFOLIO_ENTRY_SPECS)} portfolio entries")

        # 7. Create 3 demo documents
        print("\n  Creating documents...")
        for spec in DOCUMENT_SPECS:
            doc = _create_document(db, user.id, **spec)
            print(f"    {doc.document_type:25s} | {doc.original_filename}")
        print(f"  Created {len(DOCUMENT_SPECS)} documents")

        # Chat messages are no longer seeded to DB — served from fixtures/demo_chat.json
        print("\n  Chat history: served from fixture file (no DB seeding needed)")

        # 8. Commit
        db.commit()

        # 10. Verification queries
        print("\n  --- Verification ---")
        deal_count = db.query(Deal).filter(Deal.user_id == user.id).count()
        prop_count = db.query(Property).filter(Property.created_by == user.id).count()
        scenario_count = db.query(AnalysisScenario).filter(AnalysisScenario.created_by == user.id).count()
        pipeline_count = db.query(PipelineEntry).filter(PipelineEntry.user_id == user.id).count()
        portfolio_count = db.query(PortfolioEntry).filter(PortfolioEntry.user_id == user.id).count()
        doc_count = db.query(Document).filter(Document.user_id == user.id).count()
        print(f"  Deals:            {deal_count} (12 active + 3 historical)")
        print(f"  Properties:       {prop_count}")
        print(f"  Scenarios:        {scenario_count}")
        print(f"  Pipeline entries: {pipeline_count}")
        print(f"  Portfolio entries: {portfolio_count}")
        print(f"  Documents:        {doc_count}")
        print(f"  Chat messages:    fixture-based (not in DB)")

        # 10. Summary
        deal_a = active_deals[0]
        share_url = f"{FRONTEND_URL}/share/{deal_a.id}"
        print("\n  ===================================")
        print("  Demo account ready!")
        print(f"  Email:    {DEMO_EMAIL}")
        print(f"  Password: {DEMO_PASSWORD}")
        print(f"  Share URL for deal (a): {share_url}")
        print("  ===================================\n")

    except Exception as exc:
        db.rollback()
        print(f"\n  ERROR: {exc}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    seed()
