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
        ChatMessage,
        Deal,
        Document,
        PipelineEntry,
        PortfolioEntry,
        User,
    )
    from core.security.jwt import hash_password
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
DEMO_EMAIL = "demo@parcel.app"
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
CHAT_SESSION_ID = "demo-session"

CHAT_MESSAGES: list[dict] = [
    {
        "role": "user",
        "content": "What's a good cap rate target for buy and hold in the Midwest?",
        "context_type": "general",
        "context_id": None,
    },
    {
        "role": "assistant",
        "content": (
            "In the Midwest \u2014 particularly markets like Milwaukee, Sheboygan, "
            "and Green Bay \u2014 **6-8% cap rate** is a solid target for buy-and-hold. Here\u2019s "
            "how to think about it:\n\n"
            "**Cap Rate = NOI / Purchase Price**\n\n"
            "A 6% cap in a stable Midwest market is often better than an 8% cap in a volatile "
            "coastal market because your vacancy risk is lower and your tenant pool is "
            "more stable.\n\n"
            "| Market Type | Target Cap Rate |\n"
            "|---|---|\n"
            "| Tier 1 (Milwaukee, Madison) | 6-7% |\n"
            "| Tier 2 (Sheboygan, Racine) | 7-9% |\n"
            "| Rural/small market | 9%+ (higher risk) |\n\n"
            "What market are you analyzing?"
        ),
        "context_type": "general",
        "context_id": None,
    },
    {
        "role": "user",
        "content": "Explain subject-to financing like I'm new to creative finance",
        "context_type": "general",
        "context_id": None,
    },
    {
        "role": "assistant",
        "content": (
            "Subject-to means you\u2019re buying a property **subject to the "
            "existing mortgage** \u2014 the loan stays in the seller\u2019s name, but you take "
            "over the payments and get the deed.\n\n"
            "**Why sellers agree to it:**\n"
            "\u25b8 They\u2019re behind on payments and need out fast\n"
            "\u25b8 They\u2019ve already moved and are paying two mortgages\n"
            "\u25b8 They owe more than the house is worth\n\n"
            "**Why you want it:**\n"
            "\u25b8 You inherit the seller\u2019s interest rate \u2014 if they "
            "have a 3.5% loan, you keep that rate\n"
            "\u25b8 No bank qualifying, no new loan origination fees\n"
            "\u25b8 You control the asset with minimal cash in\n\n"
            "`Monthly Cash Flow = Rent - PITI - Expenses`\n\n"
            "The risk: the lender technically has a due-on-sale clause that lets them call "
            "the loan due. In practice this rarely happens when payments are current, but "
            "it\u2019s real risk you need to price in. Are you looking at a specific deal?"
        ),
        "context_type": "general",
        "context_id": None,
    },
]


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
        password_hash=hash_password(DEMO_PASSWORD),
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
    counts["deals"] = db.query(Deal).filter(Deal.user_id == user_id).delete()
    db.flush()
    total = sum(counts.values())
    if total > 0:
        print(f"  Wiped existing data: {counts}")
    else:
        print("  No existing demo data to clear")


def _create_deal(db, user_id, address, zip_code, property_type, strategy, inputs, status="saved", created_offset_days=0):
    """Create a deal with calculator-generated outputs and risk score."""
    calc_fn = CALC_MAP[strategy]
    outputs = calc_fn(inputs)
    risk_score = calculate_risk_score(strategy, inputs, outputs)

    now = datetime.utcnow()
    created_at = now - timedelta(days=created_offset_days) if created_offset_days else now

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
    )
    deal.created_at = created_at
    deal.updated_at = created_at
    db.add(deal)
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


def _create_chat_message(db, user_id, role, content, context_type, context_id, created_at):
    """Create a chat message with a specific timestamp."""
    msg = ChatMessage(
        user_id=user_id,
        session_id=CHAT_SESSION_ID,
        role=role,
        content=content,
        context_type=context_type,
        context_id=context_id,
    )
    msg.created_at = created_at
    msg.updated_at = created_at
    db.add(msg)
    db.flush()
    return msg


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

        # 7. Create 4 chat messages (2 exchanges, 3 days ago)
        print("\n  Creating chat messages...")
        three_days_ago = datetime.utcnow() - timedelta(days=3)
        for i, msg_spec in enumerate(CHAT_MESSAGES):
            ts = three_days_ago + timedelta(minutes=i * 2)
            _create_chat_message(
                db,
                user.id,
                msg_spec["role"],
                msg_spec["content"],
                msg_spec["context_type"],
                msg_spec["context_id"],
                ts,
            )
        print(f"  Created {len(CHAT_MESSAGES)} chat messages")

        # 8. Commit
        db.commit()

        # 9. Verification queries
        print("\n  --- Verification ---")
        deal_count = db.query(Deal).filter(Deal.user_id == user.id).count()
        pipeline_count = db.query(PipelineEntry).filter(PipelineEntry.user_id == user.id).count()
        portfolio_count = db.query(PortfolioEntry).filter(PortfolioEntry.user_id == user.id).count()
        chat_count = db.query(ChatMessage).filter(ChatMessage.user_id == user.id).count()
        print(f"  Deals:            {deal_count} (12 active + 3 historical)")
        print(f"  Pipeline entries: {pipeline_count}")
        print(f"  Portfolio entries: {portfolio_count}")
        print(f"  Chat messages:    {chat_count}")

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
