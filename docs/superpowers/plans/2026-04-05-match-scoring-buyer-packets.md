# Match Scoring + Buyer Packets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 4-dimension match scoring engine, disposition endpoints, buyer packet model with public share links, and frontend match results / shared packet pages.

**Architecture:** Pure scoring function in `match_engine.py` (no DB access), new `dispositions.py` router for match + packet endpoints, `BuyerPacket` + `BuyerPacketSend` models with migration, frontend match results page + shared packet page + "Find Buyers" entry points.

**Tech Stack:** FastAPI, SQLAlchemy, Pydantic, React 18, TypeScript, TanStack React Query, Tailwind CSS, Recharts (score bars)

---

### Task 1: Match Scoring Engine

**Files:**
- Create: `backend/core/dispositions/__init__.py`
- Create: `backend/core/dispositions/match_engine.py`

- [ ] **Step 1: Create the dispositions package and match engine**

Create empty `__init__.py` and the match engine module:

```python
# backend/core/dispositions/__init__.py
# (empty)
```

```python
# backend/core/dispositions/match_engine.py
"""Match scoring engine — scores a property against a buyer's buy box criteria."""

from decimal import Decimal


def _to_float(val) -> float | None:
    """Safely convert Decimal/int/float/None to float."""
    if val is None:
        return None
    return float(val)


def _check_range(value: float | None, min_val: float | None, max_val: float | None) -> bool | None:
    """Check if value is within [min_val, max_val]. Returns None if no constraint."""
    if min_val is None and max_val is None:
        return None  # no constraint
    if value is None:
        return False  # can't evaluate
    if min_val is not None and value < min_val:
        return False
    if max_val is not None and value > max_val:
        return False
    return True


def _format_price(n: float | None) -> str:
    if n is None:
        return "N/A"
    if n >= 1_000_000:
        return f"${n / 1_000_000:.1f}M"
    if n >= 1_000:
        return f"${n / 1000:.0f}K"
    return f"${n:,.0f}"


def score_property_against_buy_box(
    property_data: dict,
    scenario_data: dict | None,
    buy_box_data: dict,
) -> dict:
    """
    Score how well a property matches a buy box (0-100).

    Args:
        property_data: {city, state, zip_code, property_type, bedrooms, bathrooms, sqft, year_built}
        scenario_data: {purchase_price, after_repair_value, repair_cost, strategy, outputs: {...}} or None
        buy_box_data: all BuyBox fields as dict

    Returns:
        {total_score, breakdown: {location, financial, property, strategy}, match_level, reasons}
    """
    breakdown = {"location": 0, "financial": 0, "property": 0, "strategy": 0}
    reasons: list[str] = []

    # ── LOCATION (25 points) ──────────────────────────────
    target_markets = buy_box_data.get("target_markets") or []
    if not target_markets:
        breakdown["location"] = 25
        reasons.append("No location restriction")
    else:
        prop_city = (property_data.get("city") or "").lower()
        prop_state = (property_data.get("state") or "").lower()
        prop_zip = (property_data.get("zip_code") or "").lower()

        exact_match = False
        state_match = False
        for market in target_markets:
            market_lower = market.strip().lower()
            # Exact match: city, state, or zip contains the market string
            if (
                market_lower in prop_city
                or market_lower in prop_zip
                or (len(market_lower) > 2 and market_lower in f"{prop_city}, {prop_state}")
            ):
                exact_match = True
                break
            # State-only match
            if market_lower == prop_state or prop_state in market_lower:
                state_match = True

        if exact_match:
            breakdown["location"] = 25
            city_display = property_data.get("city", "")
            state_display = property_data.get("state", "")
            reasons.append(f"Located in {city_display}, {state_display} (target market)")
        elif state_match:
            breakdown["location"] = 10
            reasons.append(f"Same state ({property_data.get('state', '')}) but different city")
        else:
            reasons.append(f"Not in target markets ({', '.join(target_markets[:3])})")

    # ── FINANCIAL (25 points) ─────────────────────────────
    fin_score = 0
    fin_max = 0
    outputs = {}
    purchase_price = None
    arv = None
    repair_cost = None

    if scenario_data:
        purchase_price = _to_float(scenario_data.get("purchase_price"))
        arv = _to_float(scenario_data.get("after_repair_value"))
        repair_cost = _to_float(scenario_data.get("repair_cost"))
        outputs = scenario_data.get("outputs") or {}

    # Price range (10 pts)
    bb_min_price = _to_float(buy_box_data.get("min_price"))
    bb_max_price = _to_float(buy_box_data.get("max_price"))
    if bb_min_price is not None or bb_max_price is not None:
        fin_max += 10
        result = _check_range(purchase_price, bb_min_price, bb_max_price)
        if result is True:
            fin_score += 10
            reasons.append(f"Price {_format_price(purchase_price)} within range")
        elif result is False:
            reasons.append(
                f"Price {_format_price(purchase_price)} outside "
                f"{_format_price(bb_min_price)}-{_format_price(bb_max_price)}"
            )
        else:
            reasons.append("Price not available")
    else:
        fin_max += 10
        fin_score += 10  # no restriction

    # ARV range (5 pts)
    bb_min_arv = _to_float(buy_box_data.get("min_arv"))
    bb_max_arv = _to_float(buy_box_data.get("max_arv"))
    if bb_min_arv is not None or bb_max_arv is not None:
        fin_max += 5
        result = _check_range(arv, bb_min_arv, bb_max_arv)
        if result is True:
            fin_score += 5
            reasons.append(f"ARV {_format_price(arv)} within range")
        elif result is False:
            reasons.append(f"ARV {_format_price(arv)} outside range")
        else:
            reasons.append("ARV not available")
    else:
        fin_max += 5
        fin_score += 5

    # Cash flow (5 pts)
    bb_min_cf = _to_float(buy_box_data.get("min_cash_flow"))
    if bb_min_cf is not None:
        fin_max += 5
        cf = _to_float(outputs.get("monthly_cash_flow"))
        if cf is not None and cf >= bb_min_cf:
            fin_score += 5
            reasons.append(f"Cash flow ${cf:,.0f}/mo meets minimum")
        elif cf is not None:
            reasons.append(f"Cash flow ${cf:,.0f}/mo below ${bb_min_cf:,.0f} minimum")
        else:
            reasons.append("Cash flow data not available")
    else:
        fin_max += 5
        fin_score += 5

    # Cap rate (3 pts)
    bb_min_cap = _to_float(buy_box_data.get("min_cap_rate"))
    if bb_min_cap is not None:
        fin_max += 3
        cap = _to_float(outputs.get("cap_rate"))
        if cap is not None and cap >= bb_min_cap:
            fin_score += 3
            reasons.append(f"Cap rate {cap:.1f}% meets minimum")
        elif cap is not None:
            reasons.append(f"Cap rate {cap:.1f}% below {bb_min_cap:.1f}% minimum")
        else:
            reasons.append("Cap rate data not available")
    else:
        fin_max += 3
        fin_score += 3

    # Repair cost (2 pts)
    bb_max_repair = _to_float(buy_box_data.get("max_repair_cost"))
    if bb_max_repair is not None:
        fin_max += 2
        if repair_cost is not None and repair_cost <= bb_max_repair:
            fin_score += 2
            reasons.append(f"Repair cost {_format_price(repair_cost)} within budget")
        elif repair_cost is not None:
            reasons.append(f"Repair cost {_format_price(repair_cost)} exceeds {_format_price(bb_max_repair)} max")
        else:
            reasons.append("Repair cost data not available")
    else:
        fin_max += 2
        fin_score += 2

    # Scale to 25
    breakdown["financial"] = round(fin_score / fin_max * 25) if fin_max > 0 else 25

    # ── PROPERTY (25 points) ──────────────────────────────
    prop_score = 0
    prop_max = 0

    # Property type (10 pts)
    bb_types = buy_box_data.get("property_types") or []
    if bb_types:
        prop_max += 10
        pt = property_data.get("property_type")
        if pt and pt in bb_types:
            prop_score += 10
            reasons.append(f"{pt} matches criteria")
        elif pt:
            reasons.append(f"{pt} not in [{', '.join(bb_types)}]")
        else:
            reasons.append("Property type not specified")
    else:
        prop_max += 10
        prop_score += 10

    # Bedrooms (5 pts)
    bb_beds = buy_box_data.get("min_bedrooms")
    if bb_beds is not None:
        prop_max += 5
        beds = property_data.get("bedrooms")
        if beds is not None and beds >= bb_beds:
            prop_score += 5
            reasons.append(f"{beds} beds meets {bb_beds}+ minimum")
        elif beds is not None:
            reasons.append(f"{beds} beds below {bb_beds} minimum")
        else:
            reasons.append("Bedroom count not available")
    else:
        prop_max += 5
        prop_score += 5

    # Bathrooms (3 pts)
    bb_baths = buy_box_data.get("min_bathrooms")
    if bb_baths is not None:
        prop_max += 3
        baths = property_data.get("bathrooms")
        if baths is not None:
            baths_float = float(baths)
            if baths_float >= bb_baths:
                prop_score += 3
            else:
                reasons.append(f"{baths_float} baths below {bb_baths} minimum")
        else:
            reasons.append("Bathroom count not available")
    else:
        prop_max += 3
        prop_score += 3

    # Sqft (4 pts)
    bb_sqft = buy_box_data.get("min_sqft")
    if bb_sqft is not None:
        prop_max += 4
        sqft = property_data.get("sqft")
        if sqft is not None and sqft >= bb_sqft:
            prop_score += 4
            reasons.append(f"{sqft:,} sqft meets minimum")
        elif sqft is not None:
            reasons.append(f"{sqft:,} sqft below {bb_sqft:,} minimum")
        else:
            reasons.append("Sqft not available")
    else:
        prop_max += 4
        prop_score += 4

    # Year built (3 pts)
    bb_min_year = buy_box_data.get("min_year_built")
    bb_max_year = buy_box_data.get("max_year_built")
    if bb_min_year is not None or bb_max_year is not None:
        prop_max += 3
        yb = property_data.get("year_built")
        if yb is not None:
            result = _check_range(float(yb), float(bb_min_year) if bb_min_year else None, float(bb_max_year) if bb_max_year else None)
            if result is True:
                prop_score += 3
            else:
                reasons.append(f"Year built {yb} outside range")
        else:
            reasons.append("Year built not available")
    else:
        prop_max += 3
        prop_score += 3

    breakdown["property"] = round(prop_score / prop_max * 25) if prop_max > 0 else 25

    # ── STRATEGY (25 points) ──────────────────────────────
    bb_strategies = buy_box_data.get("strategies") or []
    if not bb_strategies:
        breakdown["strategy"] = 25
        reasons.append("No strategy restriction")
    elif scenario_data and scenario_data.get("strategy"):
        strategy = scenario_data["strategy"]
        if strategy in bb_strategies:
            breakdown["strategy"] = 25
            reasons.append(f"Strategy '{strategy}' matches criteria")
        else:
            reasons.append(f"Strategy '{strategy}' not in buyer's criteria")
    else:
        reasons.append("No analysis scenario available")

    # ── Total + level ─────────────────────────────────────
    total = sum(breakdown.values())
    if total >= 80:
        level = "strong"
    elif total >= 60:
        level = "moderate"
    elif total >= 40:
        level = "weak"
    else:
        level = "no_match"

    return {
        "total_score": total,
        "breakdown": breakdown,
        "match_level": level,
        "reasons": reasons,
    }
```

- [ ] **Step 2: Verify the module imports cleanly**

Run: `cd /Users/ivanflores/parcel-platform/backend && python -c "from core.dispositions.match_engine import score_property_against_buy_box; print('OK')"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/core/dispositions/__init__.py backend/core/dispositions/match_engine.py
git commit -m "feat: match scoring engine with 4-dimension scoring (location, financial, property, strategy)"
```

---

### Task 2: BuyerPacket + BuyerPacketSend Models and Migration

**Files:**
- Create: `backend/models/buyer_packets.py`
- Modify: `backend/models/__init__.py`
- Create: `backend/alembic/versions/m3n4o5p6q7r8_add_buyer_packets.py`

- [ ] **Step 1: Create models**

```python
# backend/models/buyer_packets.py
"""BuyerPacket and BuyerPacketSend models — deal packets for buyer disposition."""

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from database import Base
from models.base import TimestampMixin


class BuyerPacket(TimestampMixin, Base):
    """A frozen deal presentation shared with potential buyers."""

    __tablename__ = "buyer_packets"

    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=False, index=True)
    scenario_id = Column(UUID(as_uuid=True), ForeignKey("analysis_scenarios.id"), nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    team_id = Column(UUID(as_uuid=True), nullable=True)

    title = Column(String, nullable=False)
    share_token = Column(String, nullable=False, unique=True, index=True)

    packet_data = Column(JSONB, nullable=False)  # frozen snapshot

    asking_price = Column(Numeric(14, 2), nullable=True)
    assignment_fee = Column(Numeric(14, 2), nullable=True)

    is_public = Column(Boolean, default=True, nullable=False)
    view_count = Column(Integer, default=0, nullable=False)
    last_viewed_at = Column(DateTime, nullable=True)

    notes_to_buyer = Column(Text, nullable=True)

    deleted_at = Column(DateTime, nullable=True)

    # Relationships
    property = relationship("Property")
    scenario = relationship("AnalysisScenario")
    sends = relationship("BuyerPacketSend", back_populates="packet", cascade="all, delete-orphan")


class BuyerPacketSend(TimestampMixin, Base):
    """Tracks which buyers a packet was sent to."""

    __tablename__ = "buyer_packet_sends"

    packet_id = Column(UUID(as_uuid=True), ForeignKey("buyer_packets.id"), nullable=False, index=True)
    contact_id = Column(UUID(as_uuid=True), ForeignKey("contacts.id"), nullable=False, index=True)
    communication_id = Column(UUID(as_uuid=True), ForeignKey("communications.id"), nullable=True)
    sent_at = Column(DateTime, nullable=False)
    opened_at = Column(DateTime, nullable=True)

    # Relationships
    packet = relationship("BuyerPacket", back_populates="sends")
    contact = relationship("Contact")
```

- [ ] **Step 2: Register in `__init__.py`**

Add to `backend/models/__init__.py` after the BuyBox import:

```python
from models.buyer_packets import BuyerPacket, BuyerPacketSend
```

And add to `__all__`:

```python
"BuyerPacket",
"BuyerPacketSend",
```

- [ ] **Step 3: Create migration**

```python
# backend/alembic/versions/m3n4o5p6q7r8_add_buyer_packets.py
"""Add buyer_packets and buyer_packet_sends tables.

Revision ID: m3n4o5p6q7r8
Revises: l2m3n4o5p6q7
Create Date: 2026-04-05
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision = "m3n4o5p6q7r8"
down_revision = "l2m3n4o5p6q7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "buyer_packets",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("property_id", UUID(as_uuid=True), sa.ForeignKey("properties.id"), nullable=False),
        sa.Column("scenario_id", UUID(as_uuid=True), sa.ForeignKey("analysis_scenarios.id"), nullable=False),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("team_id", UUID(as_uuid=True), nullable=True),
        sa.Column("title", sa.String, nullable=False),
        sa.Column("share_token", sa.String, nullable=False, unique=True),
        sa.Column("packet_data", JSONB, nullable=False),
        sa.Column("asking_price", sa.Numeric(14, 2), nullable=True),
        sa.Column("assignment_fee", sa.Numeric(14, 2), nullable=True),
        sa.Column("is_public", sa.Boolean, default=True, nullable=False),
        sa.Column("view_count", sa.Integer, default=0, nullable=False),
        sa.Column("last_viewed_at", sa.DateTime, nullable=True),
        sa.Column("notes_to_buyer", sa.Text, nullable=True),
        sa.Column("deleted_at", sa.DateTime, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )
    op.create_index("ix_buyer_packets_property_id", "buyer_packets", ["property_id"])
    op.create_index("ix_buyer_packets_created_by", "buyer_packets", ["created_by"])
    op.create_index("ix_buyer_packets_share_token", "buyer_packets", ["share_token"])

    op.create_table(
        "buyer_packet_sends",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("packet_id", UUID(as_uuid=True), sa.ForeignKey("buyer_packets.id"), nullable=False),
        sa.Column("contact_id", UUID(as_uuid=True), sa.ForeignKey("contacts.id"), nullable=False),
        sa.Column("communication_id", UUID(as_uuid=True), sa.ForeignKey("communications.id"), nullable=True),
        sa.Column("sent_at", sa.DateTime, nullable=False),
        sa.Column("opened_at", sa.DateTime, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )
    op.create_index("ix_buyer_packet_sends_packet_id", "buyer_packet_sends", ["packet_id"])
    op.create_index("ix_buyer_packet_sends_contact_id", "buyer_packet_sends", ["contact_id"])


def downgrade() -> None:
    op.drop_table("buyer_packet_sends")
    op.drop_table("buyer_packets")
```

- [ ] **Step 4: Verify model imports**

Run: `cd /Users/ivanflores/parcel-platform/backend && python -c "from models.buyer_packets import BuyerPacket, BuyerPacketSend; print('OK')"`
Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add backend/models/buyer_packets.py backend/models/__init__.py backend/alembic/versions/m3n4o5p6q7r8_add_buyer_packets.py
git commit -m "feat: BuyerPacket + BuyerPacketSend models with migration"
```

---

### Task 3: Dispositions Schemas + Router

**Files:**
- Create: `backend/schemas/dispositions.py`
- Create: `backend/routers/dispositions.py`
- Modify: `backend/main.py`

- [ ] **Step 1: Create schemas**

```python
# backend/schemas/dispositions.py
"""Pydantic schemas for disposition match scoring and buyer packets."""

from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ── Match scoring ─────────────────────────────────────────

class MatchBreakdown(BaseModel):
    location: int
    financial: int
    property: int
    strategy: int


class PropertyMatchResult(BaseModel):
    contact_id: UUID
    buyer_name: str
    company: Optional[str] = None
    buy_box_id: UUID
    buy_box_name: str
    score: int
    match_level: str
    breakdown: MatchBreakdown
    reasons: list[str]
    funding_type: Optional[str] = None
    has_pof: bool = False
    can_close_days: Optional[int] = None


class PropertyInfo(BaseModel):
    id: UUID
    address: str
    city: str
    state: str
    zip_code: str
    strategy: Optional[str] = None
    purchase_price: Optional[float] = None


class PropertyMatchResponse(BaseModel):
    property: PropertyInfo
    matches: list[PropertyMatchResult]


class BuyerMatchResult(BaseModel):
    property_id: UUID
    address: str
    city: str
    state: str
    zip_code: str
    strategy: Optional[str] = None
    purchase_price: Optional[float] = None
    buy_box_name: str
    score: int
    match_level: str
    breakdown: MatchBreakdown


class BuyerInfo(BaseModel):
    id: UUID
    name: str
    company: Optional[str] = None


class BuyerMatchResponse(BaseModel):
    buyer: BuyerInfo
    matches: list[BuyerMatchResult]


class MatchPreviewRequest(BaseModel):
    property_id: UUID
    buy_box_id: UUID


class MatchPreviewResponse(BaseModel):
    score: int
    match_level: str
    breakdown: MatchBreakdown
    reasons: list[str]


# ── Buyer packets ─────────────────────────────────────────

class CreatePacketRequest(BaseModel):
    property_id: UUID
    scenario_id: UUID
    title: Optional[str] = None
    asking_price: Optional[Decimal] = None
    assignment_fee: Optional[Decimal] = None
    notes_to_buyer: Optional[str] = None


class PacketResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: UUID
    property_id: UUID
    scenario_id: UUID
    title: str
    share_token: str
    share_url: str
    asking_price: Optional[float] = None
    assignment_fee: Optional[float] = None
    notes_to_buyer: Optional[str] = None
    is_public: bool
    view_count: int
    last_viewed_at: Optional[str] = None
    send_count: int = 0
    created_at: datetime
    updated_at: datetime


class PacketListItem(BaseModel):
    id: UUID
    title: str
    share_url: str
    property_address: str
    asking_price: Optional[float] = None
    view_count: int = 0
    send_count: int = 0
    created_at: datetime


class SharedPacketResponse(BaseModel):
    title: str
    packet_data: dict
    asking_price: Optional[float] = None
    assignment_fee: Optional[float] = None
    notes_to_buyer: Optional[str] = None
    created_at: datetime


class SendPacketRequest(BaseModel):
    buyer_contact_ids: list[UUID] = Field(..., max_length=50)
    message: Optional[str] = None


class SendPacketResponse(BaseModel):
    sent_count: int
    buyer_names: list[str]
```

- [ ] **Step 2: Create the dispositions router**

```python
# backend/routers/dispositions.py
"""Dispositions router — match scoring, buyer packets, and send flows."""

import os
import secrets
from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from core.dispositions.match_engine import score_property_against_buy_box
from core.security.jwt import get_current_user
from database import get_db
from models.analysis_scenarios import AnalysisScenario
from models.buy_boxes import BuyBox
from models.buyer_packets import BuyerPacket, BuyerPacketSend
from models.communications import Communication
from models.contacts import Contact
from models.properties import Property
from models.users import User
from schemas.dispositions import (
    BuyerInfo,
    BuyerMatchResponse,
    BuyerMatchResult,
    CreatePacketRequest,
    MatchBreakdown,
    MatchPreviewRequest,
    MatchPreviewResponse,
    PacketListItem,
    PacketResponse,
    PropertyInfo,
    PropertyMatchResponse,
    PropertyMatchResult,
    SendPacketRequest,
    SendPacketResponse,
    SharedPacketResponse,
)

router = APIRouter(prefix="/dispositions", tags=["dispositions"])

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


# ── Helpers ───────────────────────────────────────────────

def _get_property_or_404(db: Session, property_id: UUID, user_id: UUID) -> Property:
    prop = db.query(Property).filter(
        Property.id == property_id,
        Property.created_by == user_id,
        Property.is_deleted == False,  # noqa: E712
    ).first()
    if not prop:
        raise HTTPException(status_code=404, detail={"error": "Property not found", "code": "PROPERTY_NOT_FOUND"})
    return prop


def _get_primary_scenario(db: Session, property_id: UUID) -> AnalysisScenario | None:
    return db.query(AnalysisScenario).filter(
        AnalysisScenario.property_id == property_id,
        AnalysisScenario.is_deleted == False,  # noqa: E712
    ).order_by(AnalysisScenario.created_at.desc()).first()


def _property_to_dict(prop: Property) -> dict:
    return {
        "city": prop.city,
        "state": prop.state,
        "zip_code": prop.zip_code,
        "property_type": prop.property_type,
        "bedrooms": prop.bedrooms,
        "bathrooms": float(prop.bathrooms) if prop.bathrooms is not None else None,
        "sqft": prop.sqft,
        "year_built": prop.year_built,
    }


def _scenario_to_dict(scenario: AnalysisScenario | None) -> dict | None:
    if not scenario:
        return None
    return {
        "purchase_price": float(scenario.purchase_price) if scenario.purchase_price else None,
        "after_repair_value": float(scenario.after_repair_value) if scenario.after_repair_value else None,
        "repair_cost": float(scenario.repair_cost) if scenario.repair_cost else None,
        "strategy": scenario.strategy,
        "outputs": scenario.outputs or {},
    }


def _buy_box_to_dict(box: BuyBox) -> dict:
    return {
        "target_markets": box.target_markets,
        "min_price": float(box.min_price) if box.min_price is not None else None,
        "max_price": float(box.max_price) if box.max_price is not None else None,
        "min_arv": float(box.min_arv) if box.min_arv is not None else None,
        "max_arv": float(box.max_arv) if box.max_arv is not None else None,
        "min_cash_flow": float(box.min_cash_flow) if box.min_cash_flow is not None else None,
        "min_cap_rate": float(box.min_cap_rate) if box.min_cap_rate is not None else None,
        "min_coc_return": float(box.min_coc_return) if box.min_coc_return is not None else None,
        "max_repair_cost": float(box.max_repair_cost) if box.max_repair_cost is not None else None,
        "property_types": box.property_types,
        "min_bedrooms": box.min_bedrooms,
        "min_bathrooms": box.min_bathrooms,
        "min_sqft": box.min_sqft,
        "max_year_built": box.max_year_built,
        "min_year_built": box.min_year_built,
        "strategies": box.strategies,
    }


def _freeze_packet_data(prop: Property, scenario: AnalysisScenario, user: User) -> dict:
    """Create a frozen snapshot for the buyer packet."""
    return {
        "property": {
            "address": prop.address_line1,
            "city": prop.city,
            "state": prop.state,
            "zip_code": prop.zip_code,
            "property_type": prop.property_type,
            "bedrooms": prop.bedrooms,
            "bathrooms": float(prop.bathrooms) if prop.bathrooms is not None else None,
            "sqft": prop.sqft,
            "year_built": prop.year_built,
        },
        "scenario": {
            "strategy": scenario.strategy,
            "purchase_price": float(scenario.purchase_price) if scenario.purchase_price else None,
            "after_repair_value": float(scenario.after_repair_value) if scenario.after_repair_value else None,
            "repair_cost": float(scenario.repair_cost) if scenario.repair_cost else None,
            "monthly_rent": float(scenario.monthly_rent) if scenario.monthly_rent else None,
            "outputs": scenario.outputs or {},
        },
        "ai_narrative": scenario.ai_narrative,
        "seller_name": user.name,
        "seller_email": user.email,
        "seller_phone": None,  # not stored on user model yet
    }


# ── Match Endpoints ───────────────────────────────────────

@router.get("/matches/property/{property_id}", response_model=PropertyMatchResponse)
async def match_property_to_buyers(
    property_id: UUID,
    min_score: int = Query(40, ge=0, le=100),
    funding_type: Optional[str] = Query(None),
    has_pof: Optional[bool] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Find all buyers whose buy boxes match this property, scored and sorted."""
    prop = _get_property_or_404(db, property_id, current_user.id)
    scenario = _get_primary_scenario(db, property_id)
    prop_dict = _property_to_dict(prop)
    scenario_dict = _scenario_to_dict(scenario)

    # Get all buyer contacts
    buyers = db.query(Contact).filter(
        Contact.created_by == current_user.id,
        Contact.contact_type == "buyer",
        Contact.is_deleted == False,  # noqa: E712
    ).all()

    matches: list[PropertyMatchResult] = []

    for buyer in buyers:
        boxes = db.query(BuyBox).filter(
            BuyBox.contact_id == buyer.id,
            BuyBox.created_by == current_user.id,
            BuyBox.is_active == True,  # noqa: E712
            BuyBox.deleted_at.is_(None),
        ).all()

        if not boxes:
            continue

        # Score each buy box, keep the best one
        best_result = None
        best_box = None
        for box in boxes:
            result = score_property_against_buy_box(prop_dict, scenario_dict, _buy_box_to_dict(box))
            if best_result is None or result["total_score"] > best_result["total_score"]:
                best_result = result
                best_box = box

        if not best_result or best_result["total_score"] < min_score:
            continue

        # Apply filters
        buyer_funding = best_box.funding_type if best_box else None
        buyer_pof = any(b.proof_of_funds for b in boxes)

        if funding_type and buyer_funding != funding_type:
            continue
        if has_pof is True and not buyer_pof:
            continue

        full_name = " ".join(filter(None, [buyer.first_name, buyer.last_name]))
        matches.append(PropertyMatchResult(
            contact_id=buyer.id,
            buyer_name=full_name,
            company=buyer.company,
            buy_box_id=best_box.id,
            buy_box_name=best_box.name,
            score=best_result["total_score"],
            match_level=best_result["match_level"],
            breakdown=MatchBreakdown(**best_result["breakdown"]),
            reasons=best_result["reasons"],
            funding_type=buyer_funding,
            has_pof=buyer_pof,
            can_close_days=best_box.can_close_days if best_box else None,
        ))

    # Sort by score desc
    matches.sort(key=lambda m: m.score, reverse=True)

    strategy = scenario.strategy if scenario else None
    pp = float(scenario.purchase_price) if scenario and scenario.purchase_price else None

    try:
        from core.telemetry import track_event
        strong_count = sum(1 for m in matches if m.match_level == "strong")
        avg_score = round(sum(m.score for m in matches) / len(matches)) if matches else 0
        track_event(current_user.id, "match_scored", {
            "property_id": str(property_id),
            "total_matches": len(matches),
            "strong_count": strong_count,
            "avg_score": avg_score,
        })
    except Exception:
        pass

    return PropertyMatchResponse(
        property=PropertyInfo(
            id=prop.id,
            address=prop.address_line1,
            city=prop.city,
            state=prop.state,
            zip_code=prop.zip_code,
            strategy=strategy,
            purchase_price=pp,
        ),
        matches=matches,
    )


@router.get("/matches/buyer/{contact_id}", response_model=BuyerMatchResponse)
async def match_buyer_to_properties(
    contact_id: UUID,
    min_score: int = Query(40, ge=0, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Find all properties matching a buyer's buy boxes, scored and sorted."""
    buyer = db.query(Contact).filter(
        Contact.id == contact_id,
        Contact.created_by == current_user.id,
        Contact.contact_type == "buyer",
        Contact.is_deleted == False,  # noqa: E712
    ).first()
    if not buyer:
        raise HTTPException(status_code=404, detail={"error": "Buyer not found", "code": "BUYER_NOT_FOUND"})

    boxes = db.query(BuyBox).filter(
        BuyBox.contact_id == contact_id,
        BuyBox.created_by == current_user.id,
        BuyBox.is_active == True,  # noqa: E712
        BuyBox.deleted_at.is_(None),
    ).all()

    if not boxes:
        full_name = " ".join(filter(None, [buyer.first_name, buyer.last_name]))
        return BuyerMatchResponse(
            buyer=BuyerInfo(id=buyer.id, name=full_name, company=buyer.company),
            matches=[],
        )

    # Get all user's properties
    properties = db.query(Property).filter(
        Property.created_by == current_user.id,
        Property.is_deleted == False,  # noqa: E712
        Property.status != "archived",
    ).all()

    matches: list[BuyerMatchResult] = []
    for prop in properties:
        prop_dict = _property_to_dict(prop)
        scenario = _get_primary_scenario(db, prop.id)
        scenario_dict = _scenario_to_dict(scenario)

        best_result = None
        best_box = None
        for box in boxes:
            result = score_property_against_buy_box(prop_dict, scenario_dict, _buy_box_to_dict(box))
            if best_result is None or result["total_score"] > best_result["total_score"]:
                best_result = result
                best_box = box

        if not best_result or best_result["total_score"] < min_score:
            continue

        pp = float(scenario.purchase_price) if scenario and scenario.purchase_price else None
        strategy = scenario.strategy if scenario else None

        matches.append(BuyerMatchResult(
            property_id=prop.id,
            address=prop.address_line1,
            city=prop.city,
            state=prop.state,
            zip_code=prop.zip_code,
            strategy=strategy,
            purchase_price=pp,
            buy_box_name=best_box.name,
            score=best_result["total_score"],
            match_level=best_result["match_level"],
            breakdown=MatchBreakdown(**best_result["breakdown"]),
        ))

    matches.sort(key=lambda m: m.score, reverse=True)
    matches = matches[:50]

    full_name = " ".join(filter(None, [buyer.first_name, buyer.last_name]))

    return BuyerMatchResponse(
        buyer=BuyerInfo(id=buyer.id, name=full_name, company=buyer.company),
        matches=matches,
    )


@router.post("/match-preview", response_model=MatchPreviewResponse)
async def match_preview(
    body: MatchPreviewRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Quick preview: score a single property against a single buy box."""
    prop = _get_property_or_404(db, body.property_id, current_user.id)
    box = db.query(BuyBox).filter(
        BuyBox.id == body.buy_box_id,
        BuyBox.created_by == current_user.id,
        BuyBox.deleted_at.is_(None),
    ).first()
    if not box:
        raise HTTPException(status_code=404, detail={"error": "Buy box not found", "code": "BUY_BOX_NOT_FOUND"})

    scenario = _get_primary_scenario(db, prop.id)
    result = score_property_against_buy_box(
        _property_to_dict(prop),
        _scenario_to_dict(scenario),
        _buy_box_to_dict(box),
    )

    return MatchPreviewResponse(
        score=result["total_score"],
        match_level=result["match_level"],
        breakdown=MatchBreakdown(**result["breakdown"]),
        reasons=result["reasons"],
    )


# ── Packet Endpoints ──────────────────────────────────────

@router.post("/packets", response_model=PacketResponse, status_code=status.HTTP_201_CREATED)
async def create_packet(
    body: CreatePacketRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a buyer packet with a frozen data snapshot."""
    prop = _get_property_or_404(db, body.property_id, current_user.id)

    scenario = db.query(AnalysisScenario).filter(
        AnalysisScenario.id == body.scenario_id,
        AnalysisScenario.created_by == current_user.id,
        AnalysisScenario.is_deleted == False,  # noqa: E712
    ).first()
    if not scenario:
        raise HTTPException(status_code=404, detail={"error": "Scenario not found", "code": "SCENARIO_NOT_FOUND"})

    # Auto-generate title if not provided
    title = body.title or f"{prop.address_line1} — {scenario.strategy.replace('_', ' ').title()} Analysis"
    share_token = secrets.token_urlsafe(16)

    packet = BuyerPacket(
        property_id=prop.id,
        scenario_id=scenario.id,
        created_by=current_user.id,
        team_id=current_user.team_id,
        title=title,
        share_token=share_token,
        packet_data=_freeze_packet_data(prop, scenario, current_user),
        asking_price=body.asking_price,
        assignment_fee=body.assignment_fee,
        notes_to_buyer=body.notes_to_buyer,
    )
    db.add(packet)
    db.commit()
    db.refresh(packet)

    try:
        from core.telemetry import track_event
        track_event(current_user.id, "buyer_packet_created", {
            "property_id": str(prop.id),
        })
    except Exception:
        pass

    return PacketResponse(
        id=packet.id,
        property_id=packet.property_id,
        scenario_id=packet.scenario_id,
        title=packet.title,
        share_token=packet.share_token,
        share_url=f"{FRONTEND_URL}/packets/view/{packet.share_token}",
        asking_price=float(packet.asking_price) if packet.asking_price else None,
        assignment_fee=float(packet.assignment_fee) if packet.assignment_fee else None,
        notes_to_buyer=packet.notes_to_buyer,
        is_public=packet.is_public,
        view_count=packet.view_count,
        last_viewed_at=None,
        send_count=0,
        created_at=packet.created_at,
        updated_at=packet.updated_at,
    )


@router.get("/packets", response_model=list[PacketListItem])
async def list_packets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List user's buyer packets."""
    packets = db.query(BuyerPacket).filter(
        BuyerPacket.created_by == current_user.id,
        BuyerPacket.deleted_at.is_(None),
    ).order_by(BuyerPacket.created_at.desc()).all()

    result = []
    for p in packets:
        send_count = db.query(func.count(BuyerPacketSend.id)).filter(
            BuyerPacketSend.packet_id == p.id,
        ).scalar() or 0

        prop_address = (p.packet_data or {}).get("property", {}).get("address", "Unknown")

        result.append(PacketListItem(
            id=p.id,
            title=p.title,
            share_url=f"{FRONTEND_URL}/packets/view/{p.share_token}",
            property_address=prop_address,
            asking_price=float(p.asking_price) if p.asking_price else None,
            view_count=p.view_count,
            send_count=send_count,
            created_at=p.created_at,
        ))

    return result


@router.get("/packets/share/{share_token}", response_model=SharedPacketResponse)
async def get_shared_packet(
    share_token: str,
    db: Session = Depends(get_db),
):
    """Public endpoint — view a shared buyer packet. No auth required."""
    packet = db.query(BuyerPacket).filter(
        BuyerPacket.share_token == share_token,
        BuyerPacket.is_public == True,  # noqa: E712
        BuyerPacket.deleted_at.is_(None),
    ).first()
    if not packet:
        raise HTTPException(status_code=404, detail={"error": "Packet not found", "code": "PACKET_NOT_FOUND"})

    # Increment view count
    packet.view_count = (packet.view_count or 0) + 1
    packet.last_viewed_at = datetime.utcnow()
    db.commit()

    try:
        from core.telemetry import track_event
        track_event(None, "buyer_packet_viewed", {
            "share_token_prefix": share_token[:8],
        })
    except Exception:
        pass

    return SharedPacketResponse(
        title=packet.title,
        packet_data=packet.packet_data,
        asking_price=float(packet.asking_price) if packet.asking_price else None,
        assignment_fee=float(packet.assignment_fee) if packet.assignment_fee else None,
        notes_to_buyer=packet.notes_to_buyer,
        created_at=packet.created_at,
    )


@router.post("/packets/{packet_id}/send", response_model=SendPacketResponse)
async def send_packet(
    packet_id: UUID,
    body: SendPacketRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send a packet to selected buyer contacts."""
    packet = db.query(BuyerPacket).filter(
        BuyerPacket.id == packet_id,
        BuyerPacket.created_by == current_user.id,
        BuyerPacket.deleted_at.is_(None),
    ).first()
    if not packet:
        raise HTTPException(status_code=404, detail={"error": "Packet not found", "code": "PACKET_NOT_FOUND"})

    if len(body.buyer_contact_ids) > 50:
        raise HTTPException(status_code=400, detail={"error": "Maximum 50 buyers per send", "code": "TOO_MANY_BUYERS"})

    # Validate all buyer contacts belong to user
    buyers = db.query(Contact).filter(
        Contact.id.in_(body.buyer_contact_ids),
        Contact.created_by == current_user.id,
        Contact.contact_type == "buyer",
        Contact.is_deleted == False,  # noqa: E712
    ).all()

    if len(buyers) != len(body.buyer_contact_ids):
        raise HTTPException(status_code=400, detail={"error": "One or more buyer contacts not found", "code": "INVALID_BUYERS"})

    now = datetime.utcnow()
    buyer_names = []

    for buyer in buyers:
        # Create communication record
        comm = Communication(
            created_by=current_user.id,
            team_id=current_user.team_id,
            channel="packet",
            direction="outbound",
            subject=packet.title,
            body=body.message or f"Sent buyer packet: {packet.title}",
            contact_id=buyer.id,
            property_id=packet.property_id,
            occurred_at=now,
        )
        db.add(comm)
        db.flush()

        # Create send record
        send = BuyerPacketSend(
            packet_id=packet.id,
            contact_id=buyer.id,
            communication_id=comm.id,
            sent_at=now,
        )
        db.add(send)

        full_name = " ".join(filter(None, [buyer.first_name, buyer.last_name]))
        buyer_names.append(full_name)

    db.commit()

    try:
        from core.telemetry import track_event
        track_event(current_user.id, "buyer_packet_sent", {
            "buyer_count": len(buyers),
            "property_id": str(packet.property_id),
        })
    except Exception:
        pass

    return SendPacketResponse(sent_count=len(buyers), buyer_names=buyer_names)
```

- [ ] **Step 3: Register router in main.py**

Add to the import line in `backend/main.py`:

```python
from routers import ..., dispositions  # noqa: E402
```

And add:

```python
app.include_router(dispositions.router, prefix="/api")
```

- [ ] **Step 4: Verify syntax**

Run: `cd /Users/ivanflores/parcel-platform/backend && python -c "from routers.dispositions import router; print('OK')"`
Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add backend/schemas/dispositions.py backend/routers/dispositions.py backend/main.py
git commit -m "feat: dispositions router with match scoring + buyer packet endpoints"
```

---

### Task 4: Frontend Types + API + Hooks

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/lib/api.ts`
- Create: `frontend/src/hooks/useDispositions.ts`

- [ ] **Step 1: Add types to `types/index.ts`**

Append after the buyer types section at the end of the file:

```typescript
// ---------------------------------------------------------------------------
// Disposition + Match Scoring types
// ---------------------------------------------------------------------------

export interface MatchBreakdown {
  location: number
  financial: number
  property: number
  strategy: number
}

export interface PropertyMatchResult {
  contact_id: string
  buyer_name: string
  company: string | null
  buy_box_id: string
  buy_box_name: string
  score: number
  match_level: 'strong' | 'moderate' | 'weak' | 'no_match'
  breakdown: MatchBreakdown
  reasons: string[]
  funding_type: string | null
  has_pof: boolean
  can_close_days: number | null
}

export interface PropertyMatchResponse {
  property: {
    id: string
    address: string
    city: string
    state: string
    zip_code: string
    strategy: string | null
    purchase_price: number | null
  }
  matches: PropertyMatchResult[]
}

export interface BuyerMatchResult {
  property_id: string
  address: string
  city: string
  state: string
  zip_code: string
  strategy: string | null
  purchase_price: number | null
  buy_box_name: string
  score: number
  match_level: 'strong' | 'moderate' | 'weak' | 'no_match'
  breakdown: MatchBreakdown
}

export interface BuyerMatchResponse {
  buyer: { id: string; name: string; company: string | null }
  matches: BuyerMatchResult[]
}

export interface MatchPreviewRequest {
  property_id: string
  buy_box_id: string
}

export interface MatchPreviewResponse {
  score: number
  match_level: string
  breakdown: MatchBreakdown
  reasons: string[]
}

export interface CreatePacketRequest {
  property_id: string
  scenario_id: string
  title?: string
  asking_price?: number
  assignment_fee?: number
  notes_to_buyer?: string
}

export interface PacketListItem {
  id: string
  title: string
  share_url: string
  property_address: string
  asking_price: number | null
  view_count: number
  send_count: number
  created_at: string
}

export interface SharedPacketData {
  title: string
  packet_data: {
    property: {
      address: string
      city: string
      state: string
      zip_code: string
      property_type: string | null
      bedrooms: number | null
      bathrooms: number | null
      sqft: number | null
      year_built: number | null
    }
    scenario: {
      strategy: string
      purchase_price: number | null
      after_repair_value: number | null
      repair_cost: number | null
      monthly_rent: number | null
      outputs: Record<string, unknown>
    }
    ai_narrative: string | null
    seller_name: string | null
    seller_email: string | null
    seller_phone: string | null
  }
  asking_price: number | null
  assignment_fee: number | null
  notes_to_buyer: string | null
  created_at: string
}

export interface SendPacketRequest {
  buyer_contact_ids: string[]
  message?: string
}

export interface SendPacketResponse {
  sent_count: number
  buyer_names: string[]
}

export interface MatchFilters {
  min_score?: number
  funding_type?: string
  has_pof?: boolean
}
```

- [ ] **Step 2: Add API namespace to `api.ts`**

Add after the `buyers` namespace (before the closing `}` of the `api` object):

```typescript
  dispositions: {
    matchProperty: (propertyId: string, filters?: import('@/types').MatchFilters) => {
      const params = new URLSearchParams()
      if (filters?.min_score != null) params.set('min_score', String(filters.min_score))
      if (filters?.funding_type) params.set('funding_type', filters.funding_type)
      if (filters?.has_pof) params.set('has_pof', 'true')
      const qs = params.toString()
      return request<import('@/types').PropertyMatchResponse>(`/api/dispositions/matches/property/${propertyId}${qs ? '?' + qs : ''}`)
    },
    matchBuyer: (contactId: string, filters?: { min_score?: number }) => {
      const params = new URLSearchParams()
      if (filters?.min_score != null) params.set('min_score', String(filters.min_score))
      const qs = params.toString()
      return request<import('@/types').BuyerMatchResponse>(`/api/dispositions/matches/buyer/${contactId}${qs ? '?' + qs : ''}`)
    },
    matchPreview: (data: import('@/types').MatchPreviewRequest) =>
      request<import('@/types').MatchPreviewResponse>('/api/dispositions/match-preview', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    packets: {
      create: (data: import('@/types').CreatePacketRequest) =>
        request<{ id: string; share_url: string }>('/api/dispositions/packets', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      list: () =>
        request<import('@/types').PacketListItem[]>('/api/dispositions/packets'),
      send: (packetId: string, data: import('@/types').SendPacketRequest) =>
        request<import('@/types').SendPacketResponse>(`/api/dispositions/packets/${packetId}/send`, {
          method: 'POST',
          body: JSON.stringify(data),
        }),
    },
    sharedPacket: (shareToken: string) =>
      requestPublic<import('@/types').SharedPacketData>(`/api/dispositions/packets/share/${shareToken}`),
  },
```

- [ ] **Step 3: Create hooks file**

```typescript
// frontend/src/hooks/useDispositions.ts
/** Disposition match scoring and buyer packet hooks. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { MatchFilters, CreatePacketRequest, SendPacketRequest } from '@/types'

export function usePropertyMatches(propertyId: string | undefined, filters?: MatchFilters) {
  return useQuery({
    queryKey: ['dispositions', 'property', propertyId, filters],
    queryFn: () => api.dispositions.matchProperty(propertyId!, filters),
    enabled: !!propertyId,
    staleTime: 30_000,
  })
}

export function useBuyerMatches(contactId: string | undefined) {
  return useQuery({
    queryKey: ['dispositions', 'buyer', contactId],
    queryFn: () => api.dispositions.matchBuyer(contactId!),
    enabled: !!contactId,
    staleTime: 30_000,
  })
}

export function useMatchPreview(propertyId: string | undefined, buyBoxId: string | undefined) {
  return useQuery({
    queryKey: ['dispositions', 'preview', propertyId, buyBoxId],
    queryFn: () => api.dispositions.matchPreview({ property_id: propertyId!, buy_box_id: buyBoxId! }),
    enabled: !!propertyId && !!buyBoxId,
    staleTime: 30_000,
  })
}

export function usePackets() {
  return useQuery({
    queryKey: ['dispositions', 'packets'],
    queryFn: () => api.dispositions.packets.list(),
    staleTime: 30_000,
  })
}

export function useCreatePacket() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreatePacketRequest) => api.dispositions.packets.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispositions', 'packets'] })
      toast.success('Buyer packet created')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to create packet'),
  })
}

export function useSendPacket(packetId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: SendPacketRequest) => api.dispositions.packets.send(packetId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dispositions', 'packets'] })
      queryClient.invalidateQueries({ queryKey: ['buyers'] })
      toast.success(`Packet sent to ${data.sent_count} buyer${data.sent_count !== 1 ? 's' : ''}`)
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to send packet'),
  })
}

export function useSharedPacket(shareToken: string | undefined) {
  return useQuery({
    queryKey: ['shared-packet', shareToken],
    queryFn: () => api.dispositions.sharedPacket(shareToken!),
    enabled: !!shareToken,
    staleTime: Infinity,
  })
}
```

- [ ] **Step 4: Verify build**

Run: `cd /Users/ivanflores/parcel-platform/frontend && npx vite build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/lib/api.ts frontend/src/hooks/useDispositions.ts
git commit -m "feat: disposition types, API namespace, and React Query hooks"
```

---

### Task 5: Routes + Match Results Page

**Files:**
- Modify: `frontend/src/App.tsx`
- Create: `frontend/src/pages/dispositions/MatchResultsPage.tsx`
- Create: `frontend/src/components/dispositions/CreatePacketModal.tsx`

- [ ] **Step 1: Add routes and lazy imports to App.tsx**

Add lazy imports after the BuyerDetailPage import:

```typescript
const MatchResultsPage = lazy(() => import('@/pages/dispositions/MatchResultsPage'))
const SharedPacketPage = lazy(() => import('@/pages/dispositions/SharedPacketPage'))
```

Add routes — the public packet route after the reports/view route:

```typescript
<Route path="/packets/view/:shareToken" element={<SharedPacketPage />} />
```

And the protected match route after the buyers routes:

```typescript
<Route path="/dispositions/matches/:propertyId" element={<ProtectedRoute><PageErrorBoundary><MatchResultsPage /></PageErrorBoundary></ProtectedRoute>} />
```

- [ ] **Step 2: Create CreatePacketModal**

```typescript
// frontend/src/components/dispositions/CreatePacketModal.tsx
import { useState } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { useCreatePacket, useSendPacket } from '@/hooks/useDispositions'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  propertyId: string
  scenarioId: string
  propertyAddress: string
  strategy: string | null
  purchasePrice: number | null
  selectedBuyerIds: string[]
  onSuccess: () => void
}

export function CreatePacketModal({
  open,
  onOpenChange,
  propertyId,
  scenarioId,
  propertyAddress,
  strategy,
  purchasePrice,
  selectedBuyerIds,
  onSuccess,
}: Props) {
  const defaultTitle = `${propertyAddress} — ${(strategy ?? 'analysis').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} Analysis`
  const [title, setTitle] = useState(defaultTitle)
  const [askingPrice, setAskingPrice] = useState(purchasePrice?.toString() ?? '')
  const [assignmentFee, setAssignmentFee] = useState('')
  const [notes, setNotes] = useState('')

  const createPacket = useCreatePacket()
  const [packetId, setPacketId] = useState<string | null>(null)
  const sendPacket = useSendPacket(packetId ?? '')

  const isPending = createPacket.isPending || sendPacket.isPending

  async function handleSubmit() {
    try {
      const packet = await createPacket.mutateAsync({
        property_id: propertyId,
        scenario_id: scenarioId,
        title: title.trim() || undefined,
        asking_price: askingPrice ? parseFloat(askingPrice) : undefined,
        assignment_fee: assignmentFee ? parseFloat(assignmentFee) : undefined,
        notes_to_buyer: notes.trim() || undefined,
      })

      setPacketId(packet.id)

      await sendPacket.mutateAsync({
        buyer_contact_ids: selectedBuyerIds,
        message: notes.trim() || undefined,
      })

      onSuccess()
      onOpenChange(false)
    } catch {
      // errors handled by mutation hooks
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#141311] border border-[#1E1D1B] rounded-xl w-full max-w-lg mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#1E1D1B]">
          <h2
            className="text-lg text-[#F0EDE8]"
            style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 300 }}
          >
            Create & Send Packet
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            className="text-[#8A8580] hover:text-[#C5C0B8] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <p className="text-xs text-[#8A8580]">
            Sending to {selectedBuyerIds.length} buyer{selectedBuyerIds.length !== 1 ? 's' : ''}
          </p>

          <div>
            <label className="block text-xs text-[#8A8580] mb-1.5">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-[#F0EDE8] placeholder:text-[#8A8580]/50 focus:outline-none focus:border-[#8B7AFF]/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#8A8580] mb-1.5">Asking Price</label>
              <input
                type="number"
                value={askingPrice}
                onChange={(e) => setAskingPrice(e.target.value)}
                placeholder="$0"
                className="w-full px-3 py-2 text-sm bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-[#F0EDE8] placeholder:text-[#8A8580]/50 focus:outline-none focus:border-[#8B7AFF]/50"
              />
            </div>
            <div>
              <label className="block text-xs text-[#8A8580] mb-1.5">Assignment Fee</label>
              <input
                type="number"
                value={assignmentFee}
                onChange={(e) => setAssignmentFee(e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2 text-sm bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-[#F0EDE8] placeholder:text-[#8A8580]/50 focus:outline-none focus:border-[#8B7AFF]/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#8A8580] mb-1.5">Notes to Buyer</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Add a personal message..."
              className="w-full px-3 py-2 text-sm bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-[#F0EDE8] placeholder:text-[#8A8580]/50 focus:outline-none focus:border-[#8B7AFF]/50 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-5 border-t border-[#1E1D1B]">
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-sm text-[#8A8580] hover:text-[#C5C0B8] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending || !title.trim()}
            className="px-5 py-2 text-sm rounded-lg bg-[#8B7AFF] text-white hover:bg-[#7B6AEF] transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isPending ? 'Sending...' : `Create & Send`}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create MatchResultsPage**

```typescript
// frontend/src/pages/dispositions/MatchResultsPage.tsx
import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Users,
  ShieldCheck,
  Clock,
  Check,
  X,
  ArrowLeft,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { EmptyState } from '@/components/EmptyState'
import { CreatePacketModal } from '@/components/dispositions/CreatePacketModal'
import { usePropertyMatches } from '@/hooks/useDispositions'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { PropertyMatchResult, MatchFilters } from '@/types'

const FUNDING_COLORS: Record<string, string> = {
  cash: 'bg-[#4ADE80]/15 text-[#4ADE80] border-[#4ADE80]/30',
  hard_money: 'bg-[#FBBF24]/15 text-[#FBBF24] border-[#FBBF24]/30',
  conventional: 'bg-[#60A5FA]/15 text-[#60A5FA] border-[#60A5FA]/30',
  creative: 'bg-[#8B7AFF]/15 text-[#8B7AFF] border-[#8B7AFF]/30',
}

const MATCH_COLORS: Record<string, string> = {
  strong: 'text-[#4ADE80]',
  moderate: 'text-[#FBBF24]',
  weak: 'text-[#F97316]',
  no_match: 'text-[#EF4444]',
}

const MATCH_BG: Record<string, string> = {
  strong: 'bg-[#4ADE80]/15 text-[#4ADE80] border-[#4ADE80]/30',
  moderate: 'bg-[#FBBF24]/15 text-[#FBBF24] border-[#FBBF24]/30',
  weak: 'bg-[#F97316]/15 text-[#F97316] border-[#F97316]/30',
  no_match: 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30',
}

function formatPrice(n: number | null | undefined): string {
  if (n == null) return '—'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  return `$${Math.round(n / 1000).toLocaleString()}K`
}

function fundingLabel(ft: string | null | undefined): string {
  if (!ft) return ''
  return ft.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function humanizeStrategy(s: string): string {
  const labels: Record<string, string> = {
    buy_and_hold: 'Buy & Hold', brrrr: 'BRRRR', flip: 'Flip',
    wholesale: 'Wholesale', creative_finance: 'Creative Finance',
  }
  return labels[s] ?? s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// ── Score bar component ──────────────────────────────────
function ScoreBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  const color = pct >= 80 ? '#4ADE80' : pct >= 60 ? '#FBBF24' : pct >= 40 ? '#F97316' : '#EF4444'
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-[#8A8580] w-16 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-[#1E1D1B] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[10px] text-[#8A8580] w-8 text-right">{value}/{max}</span>
    </div>
  )
}

export default function MatchResultsPage() {
  const { propertyId } = useParams<{ propertyId: string }>()
  const navigate = useNavigate()

  const [filters, setFilters] = useState<MatchFilters>({ min_score: 40 })
  const [fundingFilter, setFundingFilter] = useState<string | null>(null)
  const [pofFilter, setPofFilter] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showPacketModal, setShowPacketModal] = useState(false)

  const queryFilters: MatchFilters = {
    min_score: filters.min_score,
    funding_type: fundingFilter ?? undefined,
    has_pof: pofFilter || undefined,
  }

  const { data, isLoading, isError } = usePropertyMatches(propertyId, queryFilters)

  // PostHog
  useEffect(() => {
    try {
      ;(window as any).posthog?.capture?.('find_buyers_clicked', { source: 'match_page' })
    } catch { /* ignore */ }
  }, [])

  function toggleBuyer(contactId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(contactId)) next.delete(contactId)
      else next.add(contactId)
      return next
    })
  }

  const matches = data?.matches ?? []
  const property = data?.property

  // Fetch scenarios to get primary scenario ID for packet creation
  const scenariosQuery = useQuery({
    queryKey: ['property-scenarios', propertyId],
    queryFn: () => api.properties.scenarios(propertyId!),
    enabled: !!propertyId,
    staleTime: 60_000,
  })
  const primaryScenarioId = scenariosQuery.data?.[0]?.id ?? ''

  if (isLoading) {
    return (
      <AppShell title="Find Buyers">
        <div className="space-y-4 max-w-4xl">
          <div className="h-6 w-48 bg-[#141311] rounded animate-pulse" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-[#141311] rounded-xl animate-pulse" />
          ))}
        </div>
      </AppShell>
    )
  }

  if (isError || !property) {
    return (
      <AppShell title="Find Buyers">
        <div className="text-center py-20 space-y-4">
          <p className="text-[#C5C0B8]">Could not load match results</p>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-sm text-[#8B7AFF] hover:underline cursor-pointer"
          >
            <ArrowLeft size={14} /> Go back
          </button>
        </div>
      </AppShell>
    )
  }

  const fundingOptions = ['cash', 'hard_money', 'conventional', 'creative']

  return (
    <AppShell title="Find Buyers">
      <div className="space-y-6 max-w-4xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-[#8A8580]">
          <button onClick={() => navigate(-1)} className="hover:text-[#C5C0B8] transition-colors cursor-pointer">
            Back
          </button>
          <span>/</span>
          <span className="text-[#C5C0B8]">Match Results</span>
        </nav>

        {/* Header */}
        <div>
          <h1
            className="text-xl sm:text-2xl text-[#F0EDE8]"
            style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 300 }}
          >
            {property.address}
          </h1>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-sm text-[#8A8580]">
              {property.city}, {property.state} {property.zip_code}
            </span>
            {property.strategy && (
              <span className="text-[10px] px-2 py-0.5 rounded border bg-[#8B7AFF]/15 text-[#8B7AFF] border-[#8B7AFF]/30">
                {humanizeStrategy(property.strategy)}
              </span>
            )}
            {property.purchase_price != null && (
              <span className="text-sm text-[#F0EDE8]">{formatPrice(property.purchase_price)}</span>
            )}
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Min score */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-[#8A8580]">Min Score</label>
            <select
              value={filters.min_score ?? 40}
              onChange={(e) => setFilters((f) => ({ ...f, min_score: parseInt(e.target.value) }))}
              className="px-2 py-1 text-xs bg-[#0C0B0A] border border-[#1E1D1B] rounded text-[#C5C0B8] focus:outline-none"
            >
              {[40, 50, 60, 70, 80].map((v) => (
                <option key={v} value={v}>{v}+</option>
              ))}
            </select>
          </div>

          {/* Funding pills */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFundingFilter(null)}
              className={cn(
                'px-2.5 py-1 text-xs rounded-lg border transition-colors cursor-pointer',
                !fundingFilter ? 'bg-[#8B7AFF]/15 text-[#8B7AFF] border-[#8B7AFF]/30' : 'text-[#8A8580] border-[#1E1D1B] hover:border-[#8A8580]/50',
              )}
            >
              All
            </button>
            {fundingOptions.map((ft) => (
              <button
                key={ft}
                onClick={() => setFundingFilter(fundingFilter === ft ? null : ft)}
                className={cn(
                  'px-2.5 py-1 text-xs rounded-lg border transition-colors cursor-pointer',
                  fundingFilter === ft
                    ? FUNDING_COLORS[ft]
                    : 'text-[#8A8580] border-[#1E1D1B] hover:border-[#8A8580]/50',
                )}
              >
                {fundingLabel(ft)}
              </button>
            ))}
          </div>

          {/* POF toggle */}
          <button
            onClick={() => setPofFilter((v) => !v)}
            className={cn(
              'px-2.5 py-1 text-xs rounded-lg border transition-colors cursor-pointer',
              pofFilter ? 'bg-[#4ADE80]/15 text-[#4ADE80] border-[#4ADE80]/30' : 'text-[#8A8580] border-[#1E1D1B] hover:border-[#8A8580]/50',
            )}
          >
            Has POF
          </button>
        </div>

        {/* Results count */}
        <p className="text-xs text-[#8A8580]">
          {matches.length} buyer{matches.length !== 1 ? 's' : ''} match{matches.length === 1 ? 'es' : ''}
        </p>

        {/* Match cards */}
        {matches.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No buyers match"
            description="No buyers match this property's criteria. Add buyers with buy boxes to start matching."
          />
        ) : (
          <div className="space-y-3">
            {matches.map((match) => (
              <MatchCard
                key={match.contact_id}
                match={match}
                isSelected={selected.has(match.contact_id)}
                onToggle={() => toggleBuyer(match.contact_id)}
              />
            ))}
          </div>
        )}

        {/* Sticky send bar */}
        {selected.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#141311] border border-[#1E1D1B] rounded-xl px-5 py-3 shadow-2xl flex items-center gap-4">
            <span className="text-sm text-[#C5C0B8]">
              {selected.size} buyer{selected.size !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={() => setShowPacketModal(true)}
              className="px-5 py-2 text-sm rounded-lg bg-[#8B7AFF] text-white hover:bg-[#7B6AEF] transition-colors cursor-pointer"
            >
              Send Packet to {selected.size} Buyer{selected.size !== 1 ? 's' : ''}
            </button>
          </div>
        )}

        {/* Packet modal */}
        {showPacketModal && (
          <CreatePacketModal
            open={showPacketModal}
            onOpenChange={setShowPacketModal}
            propertyId={propertyId!}
            scenarioId={primaryScenarioId}
            propertyAddress={property.address}
            strategy={property.strategy}
            purchasePrice={property.purchase_price}
            selectedBuyerIds={Array.from(selected)}
            onSuccess={() => {
              setSelected(new Set())
              setShowPacketModal(false)
            }}
          />
        )}
      </div>
    </AppShell>
  )
}

// ── Match Card ───────────────────────────────────────────
function MatchCard({
  match,
  isSelected,
  onToggle,
}: {
  match: PropertyMatchResult
  isSelected: boolean
  onToggle: () => void
}) {
  const ft = match.funding_type?.toLowerCase().replace(/\s+/g, '_') ?? ''

  return (
    <div
      className={cn(
        'bg-[#141311] border rounded-xl p-5 transition-colors',
        isSelected ? 'border-[#8B7AFF]/50' : 'border-[#1E1D1B]',
      )}
    >
      <div className="flex items-start gap-4">
        {/* Checkbox */}
        <button
          onClick={onToggle}
          className={cn(
            'mt-1 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors cursor-pointer',
            isSelected ? 'bg-[#8B7AFF] border-[#8B7AFF]' : 'border-[#8A8580]/50 hover:border-[#8B7AFF]/50',
          )}
        >
          {isSelected && <Check size={12} className="text-white" />}
        </button>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Link
                to={`/buyers/${match.contact_id}`}
                className="text-sm text-[#F0EDE8] hover:text-[#8B7AFF] transition-colors"
              >
                {match.buyer_name}
              </Link>
              {match.company && (
                <p className="text-xs text-[#8A8580] mt-0.5">{match.company}</p>
              )}
              <p className="text-xs text-[#8A8580] mt-0.5">
                Buy box: {match.buy_box_name}
              </p>
            </div>

            {/* Score + level */}
            <div className="text-right shrink-0">
              <span className={cn('text-2xl font-light', MATCH_COLORS[match.match_level])}>
                {match.score}
              </span>
              <span className={cn(
                'block text-[10px] uppercase tracking-wider mt-0.5 px-2 py-0.5 rounded border inline-flex',
                MATCH_BG[match.match_level],
              )}>
                {match.match_level === 'no_match' ? 'No Match' : match.match_level}
              </span>
            </div>
          </div>

          {/* Score breakdown bars */}
          <div className="mt-3 space-y-1.5">
            <ScoreBar label="Location" value={match.breakdown.location} max={25} />
            <ScoreBar label="Financial" value={match.breakdown.financial} max={25} />
            <ScoreBar label="Property" value={match.breakdown.property} max={25} />
            <ScoreBar label="Strategy" value={match.breakdown.strategy} max={25} />
          </div>

          {/* Badges */}
          <div className="flex items-center gap-1.5 mt-3 flex-wrap">
            {ft && (
              <span className={cn('text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border', FUNDING_COLORS[ft] ?? '')}>
                {fundingLabel(match.funding_type)}
              </span>
            )}
            {match.has_pof && (
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border bg-[#4ADE80]/15 text-[#4ADE80] border-[#4ADE80]/30 inline-flex items-center gap-0.5">
                <ShieldCheck size={10} /> POF
              </span>
            )}
            {match.can_close_days != null && (
              <span className="text-[10px] px-2 py-0.5 rounded border border-[#1E1D1B] text-[#8A8580] inline-flex items-center gap-0.5">
                <Clock size={10} /> {match.can_close_days}d close
              </span>
            )}
          </div>

          {/* Reasons */}
          <div className="mt-3 space-y-0.5">
            {match.reasons.slice(0, 6).map((reason, i) => {
              const isPositive = reason.startsWith('Located') || reason.includes('within') || reason.includes('meets') || reason.includes('matches') || reason.includes('No ') && reason.includes('restriction')
              return (
                <div key={i} className="flex items-start gap-1.5 text-xs">
                  {isPositive ? (
                    <Check size={11} className="text-[#4ADE80] shrink-0 mt-0.5" />
                  ) : (
                    <X size={11} className="text-[#EF4444] shrink-0 mt-0.5" />
                  )}
                  <span className="text-[#8A8580]">{reason}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verify build**

Run: `cd /Users/ivanflores/parcel-platform/frontend && npx vite build 2>&1 | tail -5`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/App.tsx frontend/src/pages/dispositions/MatchResultsPage.tsx frontend/src/components/dispositions/CreatePacketModal.tsx
git commit -m "feat: match results page with score visualization, filters, and send packet flow"
```

---

### Task 6: Shared Packet Page (Public)

**Files:**
- Create: `frontend/src/pages/dispositions/SharedPacketPage.tsx`

- [ ] **Step 1: Create SharedPacketPage**

```typescript
// frontend/src/pages/dispositions/SharedPacketPage.tsx
import { useParams } from 'react-router-dom'
import { Home, Bed, Bath, Maximize, Calendar, DollarSign, TrendingUp } from 'lucide-react'
import { useSharedPacket } from '@/hooks/useDispositions'

function formatCurrency(n: number | null | undefined): string {
  if (n == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function humanizeStrategy(s: string): string {
  const labels: Record<string, string> = {
    buy_and_hold: 'Buy & Hold', brrrr: 'BRRRR', flip: 'Flip',
    wholesale: 'Wholesale', creative_finance: 'Creative Finance',
  }
  return labels[s] ?? s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function SharedPacketPage() {
  const { shareToken } = useParams<{ shareToken: string }>()
  const { data, isLoading, isError } = useSharedPacket(shareToken)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#8B7AFF] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-gray-900 mb-2">Packet Not Found</h1>
          <p className="text-gray-500">This packet may have been removed or the link is invalid.</p>
        </div>
      </div>
    )
  }

  const { packet_data: pd } = data
  const prop = pd.property
  const scenario = pd.scenario
  const outputs = scenario.outputs as Record<string, number | string | null>

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#8B7AFF] flex items-center justify-center">
              <span className="text-white text-sm font-bold">P</span>
            </div>
            <span className="text-gray-900 font-medium">Parcel</span>
          </div>
          <span className="text-xs text-gray-400">Buyer Packet</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Title */}
        <div>
          <h1 className="text-2xl text-gray-900" style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 400 }}>
            {data.title}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {prop.address}, {prop.city}, {prop.state} {prop.zip_code}
          </p>
        </div>

        {/* Property Details */}
        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg text-gray-900 mb-4" style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 400 }}>
            Property Details
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {prop.property_type && (
              <div className="flex items-center gap-2">
                <Home size={16} className="text-gray-400" />
                <div>
                  <p className="text-xs text-gray-400">Type</p>
                  <p className="text-sm text-gray-900">{prop.property_type}</p>
                </div>
              </div>
            )}
            {prop.bedrooms != null && (
              <div className="flex items-center gap-2">
                <Bed size={16} className="text-gray-400" />
                <div>
                  <p className="text-xs text-gray-400">Bedrooms</p>
                  <p className="text-sm text-gray-900">{prop.bedrooms}</p>
                </div>
              </div>
            )}
            {prop.bathrooms != null && (
              <div className="flex items-center gap-2">
                <Bath size={16} className="text-gray-400" />
                <div>
                  <p className="text-xs text-gray-400">Bathrooms</p>
                  <p className="text-sm text-gray-900">{prop.bathrooms}</p>
                </div>
              </div>
            )}
            {prop.sqft != null && (
              <div className="flex items-center gap-2">
                <Maximize size={16} className="text-gray-400" />
                <div>
                  <p className="text-xs text-gray-400">Sqft</p>
                  <p className="text-sm text-gray-900">{prop.sqft.toLocaleString()}</p>
                </div>
              </div>
            )}
            {prop.year_built != null && (
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-gray-400" />
                <div>
                  <p className="text-xs text-gray-400">Year Built</p>
                  <p className="text-sm text-gray-900">{prop.year_built}</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Financial Metrics */}
        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg text-gray-900 mb-4" style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 400 }}>
            Financial Overview
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {data.asking_price != null && (
              <MetricCard label="Asking Price" value={formatCurrency(data.asking_price)} highlight />
            )}
            {scenario.after_repair_value != null && (
              <MetricCard label="After Repair Value" value={formatCurrency(scenario.after_repair_value)} />
            )}
            {scenario.repair_cost != null && (
              <MetricCard label="Repair Estimate" value={formatCurrency(scenario.repair_cost)} />
            )}
            {data.assignment_fee != null && (
              <MetricCard label="Assignment Fee" value={formatCurrency(data.assignment_fee)} />
            )}
            {typeof outputs.monthly_cash_flow === 'number' && (
              <MetricCard label="Projected Cash Flow" value={`${formatCurrency(outputs.monthly_cash_flow)}/mo`} />
            )}
            {typeof outputs.cap_rate === 'number' && (
              <MetricCard label="Cap Rate" value={`${(outputs.cap_rate as number).toFixed(1)}%`} />
            )}
            {scenario.strategy && (
              <MetricCard label="Strategy" value={humanizeStrategy(scenario.strategy)} />
            )}
          </div>
        </section>

        {/* AI Narrative */}
        {pd.ai_narrative && (
          <section className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg text-gray-900 mb-3" style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 400 }}>
              Analysis Summary
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
              {pd.ai_narrative}
            </p>
          </section>
        )}

        {/* Notes from seller */}
        {data.notes_to_buyer && (
          <section className="bg-[#8B7AFF]/5 border border-[#8B7AFF]/20 rounded-xl p-6">
            <h2 className="text-lg text-gray-900 mb-2" style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 400 }}>
              Note from Seller
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">{data.notes_to_buyer}</p>
          </section>
        )}

        {/* CTA */}
        {(pd.seller_name || pd.seller_email || pd.seller_phone) && (
          <section className="bg-white border-2 border-[#8B7AFF]/30 rounded-xl p-6 text-center">
            <h2 className="text-xl text-gray-900 mb-2" style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 400 }}>
              Interested?
            </h2>
            <p className="text-gray-600 mb-4">
              Contact {pd.seller_name ?? 'the seller'} to discuss this deal.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              {pd.seller_email && (
                <a
                  href={`mailto:${pd.seller_email}`}
                  className="px-5 py-2.5 rounded-lg bg-[#8B7AFF] text-white hover:bg-[#7B6AEF] transition-colors text-sm"
                >
                  Email {pd.seller_name?.split(' ')[0] ?? 'Seller'}
                </a>
              )}
              {pd.seller_phone && (
                <a
                  href={`tel:${pd.seller_phone}`}
                  className="px-5 py-2.5 rounded-lg border border-[#8B7AFF] text-[#8B7AFF] hover:bg-[#8B7AFF]/10 transition-colors text-sm"
                >
                  Call {pd.seller_phone}
                </a>
              )}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="text-center py-6 border-t border-gray-200">
          <p className="text-xs text-gray-400">
            Powered by <span className="text-[#8B7AFF]">Parcel</span> — Real Estate Investment Analysis
          </p>
        </footer>
      </main>
    </div>
  )
}

function MetricCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={highlight ? 'bg-[#8B7AFF]/5 border border-[#8B7AFF]/20 rounded-lg p-3' : 'p-3'}>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className={`text-sm font-medium ${highlight ? 'text-[#8B7AFF]' : 'text-gray-900'}`}>{value}</p>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/ivanflores/parcel-platform/frontend && npx vite build 2>&1 | tail -5`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/dispositions/SharedPacketPage.tsx
git commit -m "feat: shared buyer packet public page (no auth, light theme)"
```

---

### Task 7: "Find Buyers" Entry Points + Buyer Detail Enhancement

**Files:**
- Modify: `frontend/src/pages/buyers/BuyerDetailPage.tsx`
- Modify: `frontend/src/pages/properties/PropertyDetailPage.tsx` (add Find Buyers button)
- Modify: `frontend/src/pages/analyze/AnalysisResultsPage.tsx` (add Find Buyers button)

- [ ] **Step 1: Update BuyerDetailPage to use scored matches**

Replace the import of `useBuyerMatches` from `@/hooks/useBuyers` with `useBuyerMatches` from `@/hooks/useDispositions`. Update the `MatchingPropertiesSection` to show scores.

In `BuyerDetailPage.tsx`:

1. Replace `useBuyerMatches` import: change from `@/hooks/useBuyers` to `@/hooks/useDispositions` (rename the hook import: `useBuyerMatches as useScoredBuyerMatches`)
2. Update the MatchingPropertiesSection to use `BuyerMatchResult` type and show score badges
3. Add types import for `BuyerMatchResult`

The key changes:
- Import `useBuyerMatches` from `@/hooks/useDispositions` (replaces the simple one from useBuyers)
- Update match data type from `MatchingPropertyItem[]` to `BuyerMatchResponse`
- Show score + match level badge next to each property
- Add "Find Buyers" button is not needed here (this IS the buyer page)

- [ ] **Step 2: Add "Find Buyers" button to PropertyDetailPage**

Find the action buttons area in PropertyDetailPage and add a "Find Buyers" button that navigates to `/dispositions/matches/${propertyId}`:

```typescript
import { Users } from 'lucide-react'
// In the action buttons area:
<button
  onClick={() => navigate(`/dispositions/matches/${propertyId}`)}
  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-[#1E1D1B] text-[#C5C0B8] hover:border-[#8B7AFF]/30 hover:text-[#8B7AFF] transition-colors cursor-pointer"
>
  <Users size={13} /> Find Buyers
</button>
```

PostHog event:
```typescript
try {
  ;(window as any).posthog?.capture?.('find_buyers_clicked', { source: 'property' })
} catch { /* ignore */ }
```

- [ ] **Step 3: Add "Find Buyers" button to AnalysisResultsPage**

Same pattern — add a "Find Buyers" button in the results actions area. Navigate to `/dispositions/matches/${propertyId}` using the property ID from the analysis results context.

- [ ] **Step 4: Verify build**

Run: `cd /Users/ivanflores/parcel-platform/frontend && npx vite build 2>&1 | tail -5`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/buyers/BuyerDetailPage.tsx frontend/src/pages/properties/PropertyDetailPage.tsx frontend/src/pages/analyze/AnalysisResultsPage.tsx
git commit -m "feat: Find Buyers entry points on property/analysis pages + scored buyer matches"
```

---

### Task 8: Final Verification

- [ ] **Step 1: Backend syntax check**

Run: `cd /Users/ivanflores/parcel-platform/backend && python -c "from routers.dispositions import router; from models.buyer_packets import BuyerPacket, BuyerPacketSend; from core.dispositions.match_engine import score_property_against_buy_box; print('ALL OK')"`

- [ ] **Step 2: Frontend build check**

Run: `cd /Users/ivanflores/parcel-platform/frontend && npx vite build 2>&1 | tail -5`

- [ ] **Step 3: Fix any remaining issues**

Address any build errors or import issues found in steps 1-2.
