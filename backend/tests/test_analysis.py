"""Tests for the quick analysis endpoint, address parser, and AI narrator."""

import json
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from core.property_data.address_parser import parse_address
from core.property_data.providers.rentcast import RentCastResult


# ---------------------------------------------------------------------------
# Address parser tests
# ---------------------------------------------------------------------------

class TestAddressParser:
    def test_full_address(self):
        result = parse_address("613 N 14th St, Sheboygan, WI 53081")
        assert result.address_line1 == "613 N 14th St"
        assert result.city == "Sheboygan"
        assert result.state == "WI"
        assert result.zip_code == "53081"
        assert result.parse_confidence == "high"

    def test_full_street_names(self):
        result = parse_address("613 North 14th Street, Sheboygan, WI 53081")
        assert result.address_line1 == "613 N 14th St"
        assert result.city == "Sheboygan"
        assert result.state == "WI"

    def test_dotted_abbreviations(self):
        result = parse_address("613 N. 14th St., Sheboygan, WI 53081")
        assert result.address_line1 == "613 N 14th St"

    def test_two_part_city(self):
        result = parse_address("847 Territorial Rd, Sheboygan Falls WI 53085")
        assert result.address_line1 == "847 Territorial Rd"
        assert result.city == "Sheboygan Falls"
        assert result.state == "WI"
        assert result.zip_code == "53085"

    def test_no_zip(self):
        result = parse_address("613 N 14th St, Sheboygan, WI")
        assert result.address_line1 == "613 N 14th St"
        assert result.city == "Sheboygan"
        assert result.state == "WI"
        assert result.zip_code == ""

    def test_minimal_address(self):
        result = parse_address("613 N 14th St")
        assert result.address_line1 == "613 N 14th St"
        assert result.parse_confidence == "low"

    def test_empty_address(self):
        result = parse_address("")
        assert result.address_line1 == ""

    def test_full_state_name(self):
        result = parse_address("123 Main St, Milwaukee, Wisconsin 53201")
        assert result.state == "WI"


# ---------------------------------------------------------------------------
# Mock helpers for RentCast
# ---------------------------------------------------------------------------

MOCK_PROPERTY_DATA = {
    "propertyType": "Single Family",
    "bedrooms": 3,
    "bathrooms": 2.0,
    "squareFootage": 1450,
    "lotSize": 6500,
    "yearBuilt": 1952,
    "county": "Sheboygan",
}

MOCK_RENT_DATA = {
    "rent": 1350.0,
    "rentRangeLow": 1200.0,
    "rentRangeHigh": 1500.0,
}

MOCK_VALUE_DATA = {
    "price": 165000.0,
    "priceRangeLow": 145000.0,
    "priceRangeHigh": 185000.0,
}


def _mock_rc_property(address):
    return RentCastResult(status="success", data=MOCK_PROPERTY_DATA, latency_ms=100)


def _mock_rc_rent(address):
    return RentCastResult(status="success", data=MOCK_RENT_DATA, latency_ms=120)


def _mock_rc_value(address):
    return RentCastResult(status="success", data=MOCK_VALUE_DATA, latency_ms=130)


def _mock_rc_failure(address):
    return RentCastResult(status="failed", error="Connection error", latency_ms=5000)


def _mock_rc_timeout(address):
    return RentCastResult(status="timeout", error="Request timed out", latency_ms=10000)


def _mock_rc_partial(address):
    return RentCastResult(status="success", data={"propertyType": "Single Family"}, latency_ms=100)


# Patch all three RentCast endpoints at once
_RC_SUCCESS_PATCHES = [
    patch("core.property_data.providers.rentcast.fetch_property_details", _mock_rc_property),
    patch("core.property_data.providers.rentcast.fetch_rent_estimate", _mock_rc_rent),
    patch("core.property_data.providers.rentcast.fetch_value_estimate", _mock_rc_value),
]

_RC_FAIL_PATCHES = [
    patch("core.property_data.providers.rentcast.fetch_property_details", _mock_rc_failure),
    patch("core.property_data.providers.rentcast.fetch_rent_estimate", _mock_rc_failure),
    patch("core.property_data.providers.rentcast.fetch_value_estimate", _mock_rc_failure),
]


def _apply_patches(patches):
    """Context manager helper to apply a list of patches."""
    import contextlib
    return contextlib.ExitStack()


# ---------------------------------------------------------------------------
# Mock for AI narrator — avoids real Claude calls in tests
# ---------------------------------------------------------------------------

async def _mock_narrate_success(scenario, prop, user_experience_level="intermediate"):
    from core.ai.deal_narrator import NarrativeResult
    return NarrativeResult(
        narrative="The data shows a buy-and-hold opportunity. Assuming 5% vacancy, typical for this market. Risk: 1952 build year suggests higher capex. Missing: repair estimate not provided.",
        confidence="high",
        assumptions_stated=["5% vacancy rate"],
        risks_flagged=["1952 build year — higher capex"],
        missing_data=["repair estimate"],
        tokens_used=350,
        latency_ms=1200,
    )


async def _mock_narrate_beginner(scenario, prop, user_experience_level="beginner"):
    from core.ai.deal_narrator import NarrativeResult
    return NarrativeResult(
        narrative="Cash-on-cash return is 5.8% — that means for every dollar you invest upfront, you earn about 5.8 cents per year. Most investors target 8%+.",
        confidence="high",
        assumptions_stated=["5% vacancy rate"],
        risks_flagged=["Build year risk"],
        missing_data=[],
        tokens_used=400,
        latency_ms=1500,
    )


async def _mock_narrate_experienced(scenario, prop, user_experience_level="experienced"):
    from core.ai.deal_narrator import NarrativeResult
    return NarrativeResult(
        narrative="CoC 5.8%, below market. Flagged: 1952 build, no repair estimate.",
        confidence="high",
        assumptions_stated=[],
        risks_flagged=["1952 build"],
        missing_data=[],
        tokens_used=200,
        latency_ms=800,
    )


async def _mock_narrate_failure(scenario, prop, user_experience_level="intermediate"):
    from core.ai.deal_narrator import NarrativeResult
    return NarrativeResult(narrative="", confidence="low", latency_ms=100)


async def _mock_narrate_missing_data(scenario, prop, user_experience_level="intermediate"):
    from core.ai.deal_narrator import NarrativeResult
    return NarrativeResult(
        narrative="Repair estimate not available — using $0. This makes projected returns optimistic. Several key data points are missing or unavailable.",
        confidence="low",
        assumptions_stated=["Using $0 for repairs"],
        risks_flagged=[],
        missing_data=["repair_cost", "monthly_rent"],
        tokens_used=250,
        latency_ms=1000,
    )


# ---------------------------------------------------------------------------
# Quick analysis endpoint tests
# ---------------------------------------------------------------------------

class TestQuickAnalysis:
    """Integration tests for POST /api/analysis/quick."""

    @patch("core.property_data.providers.rentcast.fetch_property_details", _mock_rc_property)
    @patch("core.property_data.providers.rentcast.fetch_rent_estimate", _mock_rc_rent)
    @patch("core.property_data.providers.rentcast.fetch_value_estimate", _mock_rc_value)
    @patch("core.ai.deal_narrator.narrate", _mock_narrate_success)
    def test_valid_address_creates_property_and_scenario(self, auth_client, db):
        resp = auth_client.post("/api/analysis/quick", json={
            "address": "613 N 14th St, Sheboygan, WI 53081",
        })
        assert resp.status_code == 200
        data = resp.json()

        # Property created
        assert data["property"]["address_line1"] == "613 N 14th St"
        assert data["property"]["city"] == "Sheboygan"
        assert data["property"]["state"] == "WI"
        assert data["property"]["bedrooms"] == 3
        assert data["property"]["sqft"] == 1450

        # Scenario created
        assert data["scenario"] is not None
        assert data["scenario"]["strategy"] == "buy_and_hold"

        # AI narrative included
        assert data["narrative"] is not None
        assert data["narrative"]["confidence"] == "high"
        assert "buy-and-hold" in data["narrative"]["narrative"]

    @patch("core.property_data.providers.rentcast.fetch_property_details", _mock_rc_property)
    @patch("core.property_data.providers.rentcast.fetch_rent_estimate", _mock_rc_rent)
    @patch("core.property_data.providers.rentcast.fetch_value_estimate", _mock_rc_value)
    @patch("core.ai.deal_narrator.narrate", _mock_narrate_success)
    def test_duplicate_address_returns_existing(self, auth_client, db):
        resp1 = auth_client.post("/api/analysis/quick", json={
            "address": "613 N 14th St, Sheboygan, WI 53081",
        })
        prop_id_1 = resp1.json()["property"]["id"]

        resp2 = auth_client.post("/api/analysis/quick", json={
            "address": "613 N 14th St, Sheboygan, WI 53081",
        })
        data2 = resp2.json()
        assert data2["property"]["id"] == prop_id_1
        assert data2["enrichment"]["status"] == "existing"
        assert data2["enrichment"]["is_existing"] is True
        # Re-analyzed properties now get a fresh scenario + narrative (C4 fix)
        assert data2["narrative"] is not None

    @patch("core.property_data.providers.rentcast.fetch_property_details", _mock_rc_failure)
    @patch("core.property_data.providers.rentcast.fetch_rent_estimate", _mock_rc_failure)
    @patch("core.property_data.providers.rentcast.fetch_value_estimate", _mock_rc_failure)
    @patch("core.ai.deal_narrator.narrate", _mock_narrate_success)
    def test_rentcast_failure_still_creates_property(self, auth_client, db):
        resp = auth_client.post("/api/analysis/quick", json={
            "address": "999 Unknown Ave, Nowhere, WI 53000",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["property"]["address_line1"] == "999 Unknown Ave"
        assert data["enrichment"]["status"] == "failed"
        assert data["scenario"] is not None

    @patch("core.property_data.providers.rentcast.fetch_property_details", _mock_rc_timeout)
    @patch("core.property_data.providers.rentcast.fetch_rent_estimate", _mock_rc_timeout)
    @patch("core.property_data.providers.rentcast.fetch_value_estimate", _mock_rc_timeout)
    @patch("core.ai.deal_narrator.narrate", _mock_narrate_success)
    def test_rentcast_timeout_flagged(self, auth_client, db):
        resp = auth_client.post("/api/analysis/quick", json={
            "address": "123 Timeout Rd, Slow, WI 53000",
        })
        assert resp.status_code == 200
        assert resp.json()["enrichment"]["status"] in ("failed", "partial")

    @patch("core.property_data.providers.rentcast.fetch_property_details", _mock_rc_partial)
    @patch("core.property_data.providers.rentcast.fetch_rent_estimate", _mock_rc_failure)
    @patch("core.property_data.providers.rentcast.fetch_value_estimate", _mock_rc_failure)
    @patch("core.ai.deal_narrator.narrate", _mock_narrate_success)
    def test_partial_data_lists_missing_fields(self, auth_client, db):
        resp = auth_client.post("/api/analysis/quick", json={
            "address": "456 Partial St, Halfway, WI 53000",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["enrichment"]["status"] == "partial"
        assert len(data["enrichment"]["fields_missing"]) > 0

    def test_empty_address_returns_422(self, auth_client):
        resp = auth_client.post("/api/analysis/quick", json={"address": ""})
        assert resp.status_code == 422

    def test_unparseable_address_returns_400(self, auth_client):
        resp = auth_client.post("/api/analysis/quick", json={"address": "     "})
        assert resp.status_code == 400

    @patch("core.property_data.providers.rentcast.fetch_property_details", _mock_rc_property)
    @patch("core.property_data.providers.rentcast.fetch_rent_estimate", _mock_rc_rent)
    @patch("core.property_data.providers.rentcast.fetch_value_estimate", _mock_rc_value)
    @patch("core.ai.deal_narrator.narrate", _mock_narrate_success)
    def test_data_source_events_created(self, auth_client, db):
        resp = auth_client.post("/api/analysis/quick", json={
            "address": "100 Event Log St, Sheboygan, WI 53081",
        })
        assert resp.status_code == 200

        from models.data_source_events import DataSourceEvent
        events = db.query(DataSourceEvent).all()
        assert len(events) >= 3
        request_types = {e.request_type for e in events}
        assert "property_details" in request_types
        assert "rent_estimate" in request_types
        assert "value_estimate" in request_types

    @patch("core.property_data.providers.rentcast.fetch_property_details", _mock_rc_property)
    @patch("core.property_data.providers.rentcast.fetch_rent_estimate", _mock_rc_rent)
    @patch("core.property_data.providers.rentcast.fetch_value_estimate", _mock_rc_value)
    @patch("core.ai.deal_narrator.narrate", _mock_narrate_success)
    def test_custom_strategy(self, auth_client, db):
        resp = auth_client.post("/api/analysis/quick", json={
            "address": "200 Strategy St, Sheboygan, WI 53081",
            "strategy": "wholesale",
        })
        assert resp.status_code == 200
        assert resp.json()["scenario"]["strategy"] == "wholesale"


# ---------------------------------------------------------------------------
# AI Narrator tests
# ---------------------------------------------------------------------------

class TestNarrator:
    """Tests for AI narrative generation behavior."""

    @patch("core.property_data.providers.rentcast.fetch_property_details", _mock_rc_property)
    @patch("core.property_data.providers.rentcast.fetch_rent_estimate", _mock_rc_rent)
    @patch("core.property_data.providers.rentcast.fetch_value_estimate", _mock_rc_value)
    @patch("core.ai.deal_narrator.narrate", _mock_narrate_success)
    def test_narrative_contains_assumptions_and_risks(self, auth_client, db):
        resp = auth_client.post("/api/analysis/quick", json={
            "address": "300 Narrator St, Sheboygan, WI 53081",
        })
        data = resp.json()
        narrative = data["narrative"]
        assert narrative is not None
        assert len(narrative["assumptions_stated"]) > 0
        assert len(narrative["risks_flagged"]) > 0
        assert narrative["tokens_used"] > 0

    @patch("core.property_data.providers.rentcast.fetch_property_details", _mock_rc_failure)
    @patch("core.property_data.providers.rentcast.fetch_rent_estimate", _mock_rc_failure)
    @patch("core.property_data.providers.rentcast.fetch_value_estimate", _mock_rc_failure)
    @patch("core.ai.deal_narrator.narrate", _mock_narrate_missing_data)
    def test_narrative_acknowledges_missing_fields(self, auth_client, db):
        resp = auth_client.post("/api/analysis/quick", json={
            "address": "400 Missing St, Nowhere, WI 53000",
        })
        data = resp.json()
        narrative = data["narrative"]
        assert narrative is not None
        assert len(narrative["missing_data"]) > 0
        assert "missing" in narrative["narrative"].lower() or "unavailable" in narrative["narrative"].lower()

    @patch("core.property_data.providers.rentcast.fetch_property_details", _mock_rc_property)
    @patch("core.property_data.providers.rentcast.fetch_rent_estimate", _mock_rc_rent)
    @patch("core.property_data.providers.rentcast.fetch_value_estimate", _mock_rc_value)
    @patch("core.ai.deal_narrator.narrate", _mock_narrate_failure)
    def test_narrative_failure_returns_null_no_crash(self, auth_client, db):
        resp = auth_client.post("/api/analysis/quick", json={
            "address": "500 Fail St, Sheboygan, WI 53081",
        })
        assert resp.status_code == 200
        data = resp.json()
        # Narrative response still returned, just with empty narrative
        assert data["narrative"]["narrative"] is None or data["narrative"]["narrative"] == ""
        assert data["narrative"]["confidence"] == "low"
        # But property and scenario are still created
        assert data["property"] is not None
        assert data["scenario"] is not None

    @patch("core.property_data.providers.rentcast.fetch_property_details", _mock_rc_property)
    @patch("core.property_data.providers.rentcast.fetch_rent_estimate", _mock_rc_rent)
    @patch("core.property_data.providers.rentcast.fetch_value_estimate", _mock_rc_value)
    @patch("core.ai.deal_narrator.narrate", _mock_narrate_success)
    def test_narrative_stored_on_scenario(self, auth_client, db):
        resp = auth_client.post("/api/analysis/quick", json={
            "address": "600 Cache St, Sheboygan, WI 53081",
        })
        data = resp.json()
        scenario = data["scenario"]
        assert scenario["ai_narrative"] is not None
        assert "buy-and-hold" in scenario["ai_narrative"]
        assert scenario["ai_narrative_generated_at"] is not None


# ---------------------------------------------------------------------------
# Narrative regeneration tests
# ---------------------------------------------------------------------------

class TestNarrativeRegeneration:
    """Tests for POST /api/analysis/scenarios/{id}/regenerate-narrative."""

    @patch("core.property_data.providers.rentcast.fetch_property_details", _mock_rc_property)
    @patch("core.property_data.providers.rentcast.fetch_rent_estimate", _mock_rc_rent)
    @patch("core.property_data.providers.rentcast.fetch_value_estimate", _mock_rc_value)
    @patch("core.ai.deal_narrator.narrate", _mock_narrate_success)
    def test_regenerate_updates_narrative(self, auth_client, db):
        # Create analysis first
        resp = auth_client.post("/api/analysis/quick", json={
            "address": "700 Regen St, Sheboygan, WI 53081",
        })
        scenario_id = resp.json()["scenario"]["id"]

        # Regenerate
        with patch("core.ai.deal_narrator.narrate", _mock_narrate_experienced):
            resp2 = auth_client.post(
                f"/api/analysis/scenarios/{scenario_id}/regenerate-narrative",
                json={},
            )
        assert resp2.status_code == 200
        data = resp2.json()
        assert data["ai_narrative"] is not None

    def test_regenerate_nonexistent_scenario_404(self, auth_client):
        fake_id = str(uuid.uuid4())
        resp = auth_client.post(
            f"/api/analysis/scenarios/{fake_id}/regenerate-narrative",
            json={},
        )
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# SSE streaming tests
# ---------------------------------------------------------------------------

class TestSSEStream:
    """Tests for GET /api/analysis/quick/stream."""

    @patch("core.property_data.providers.rentcast.fetch_property_details", _mock_rc_property)
    @patch("core.property_data.providers.rentcast.fetch_rent_estimate", _mock_rc_rent)
    @patch("core.property_data.providers.rentcast.fetch_value_estimate", _mock_rc_value)
    @patch("core.ai.deal_narrator.narrate", _mock_narrate_success)
    def test_stream_returns_events_in_order(self, auth_client, db):
        resp = auth_client.get("/api/analysis/quick/stream?address=613+N+14th+St,+Sheboygan,+WI+53081")
        assert resp.status_code == 200
        assert "text/event-stream" in resp.headers.get("content-type", "")

        body = resp.text
        events = _parse_sse(body)

        # Check event order
        event_types = [e["event"] for e in events]
        assert "status" in event_types
        assert "enrichment" in event_types
        assert "complete" in event_types

        # First event should be parsing_address status
        first_status = next(e for e in events if e["event"] == "status")
        assert first_status["data"]["stage"] == "parsing_address"

    @patch("core.property_data.providers.rentcast.fetch_property_details", _mock_rc_failure)
    @patch("core.property_data.providers.rentcast.fetch_rent_estimate", _mock_rc_failure)
    @patch("core.property_data.providers.rentcast.fetch_value_estimate", _mock_rc_failure)
    @patch("core.ai.deal_narrator.narrate", _mock_narrate_success)
    def test_stream_handles_provider_failure(self, auth_client, db):
        resp = auth_client.get("/api/analysis/quick/stream?address=999+Unknown+Ave,+Nowhere,+WI+53000")
        assert resp.status_code == 200
        events = _parse_sse(resp.text)
        assert any(e["event"] == "complete" for e in events)

    def test_stream_bad_address_returns_error_event(self, auth_client):
        resp = auth_client.get("/api/analysis/quick/stream?address=+++++")
        assert resp.status_code == 200
        events = _parse_sse(resp.text)
        assert any(e["event"] == "error" for e in events)


# ---------------------------------------------------------------------------
# Calculate endpoint tests (manual mode)
# ---------------------------------------------------------------------------

class TestCalculateEndpoint:
    """Tests for POST /api/analysis/calculate."""

    def test_buy_and_hold_calculation(self, auth_client):
        resp = auth_client.post("/api/analysis/calculate", json={
            "strategy": "buy_and_hold",
            "inputs": {
                "purchase_price": 185000,
                "down_payment_pct": 20,
                "interest_rate": 7.25,
                "loan_term_years": 30,
                "monthly_rent": 2700,
                "monthly_taxes": 280,
                "monthly_insurance": 120,
                "vacancy_rate_pct": 8,
                "maintenance_pct": 5,
                "mgmt_fee_pct": 8,
            },
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["strategy"] == "buy_and_hold"
        assert "monthly_cash_flow" in data["outputs"]
        assert "cap_rate" in data["outputs"]
        assert "risk_score" in data

    def test_wholesale_calculation(self, auth_client):
        resp = auth_client.post("/api/analysis/calculate", json={
            "strategy": "wholesale",
            "inputs": {
                "arv": 135000,
                "repair_costs": 38000,
                "desired_profit": 8500,
                "closing_costs_pct": 3,
                "asking_price": 72000,
            },
        })
        assert resp.status_code == 200
        assert "mao" in resp.json()["outputs"]

    def test_invalid_strategy_returns_400(self, auth_client):
        resp = auth_client.post("/api/analysis/calculate", json={
            "strategy": "invalid_strategy",
            "inputs": {},
        })
        assert resp.status_code == 400

    def test_no_database_records_created(self, auth_client, db):
        from models.properties import Property
        from models.analysis_scenarios import AnalysisScenario

        before_props = db.query(Property).count()
        before_scenarios = db.query(AnalysisScenario).count()

        auth_client.post("/api/analysis/calculate", json={
            "strategy": "buy_and_hold",
            "inputs": {
                "purchase_price": 100000,
                "down_payment_pct": 20,
                "interest_rate": 7,
                "loan_term_years": 30,
                "monthly_rent": 1200,
                "monthly_taxes": 200,
                "monthly_insurance": 80,
                "vacancy_rate_pct": 8,
                "maintenance_pct": 5,
                "mgmt_fee_pct": 8,
            },
        })

        assert db.query(Property).count() == before_props
        assert db.query(AnalysisScenario).count() == before_scenarios


def _parse_sse(body: str) -> list[dict]:
    """Parse SSE text into a list of {event, data} dicts."""
    events = []
    current_event = None
    current_data = None

    for line in body.split("\n"):
        if line.startswith("event: "):
            current_event = line[7:].strip()
        elif line.startswith("data: "):
            current_data = line[6:].strip()
        elif line == "" and current_event and current_data:
            try:
                events.append({"event": current_event, "data": json.loads(current_data)})
            except json.JSONDecodeError:
                events.append({"event": current_event, "data": current_data})
            current_event = None
            current_data = None

    return events
