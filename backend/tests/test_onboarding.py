"""Tests for onboarding persona selection, sample data, and auto-archive."""

import uuid
from unittest.mock import patch

import pytest

from core.onboarding.sample_deals import VALID_PERSONAS, SAMPLE_DEALS, PERSONA_EXPERIENCE_LEVEL


# ---------------------------------------------------------------------------
# Sample deal definition tests
# ---------------------------------------------------------------------------

class TestSampleDealDefinitions:
    def test_all_personas_have_definitions(self):
        for persona in VALID_PERSONAS:
            assert persona in SAMPLE_DEALS, f"Missing sample deal for persona: {persona}"

    def test_all_personas_have_experience_levels(self):
        for persona in VALID_PERSONAS:
            assert persona in PERSONA_EXPERIENCE_LEVEL

    def test_every_sample_has_narrative(self):
        for persona, spec in SAMPLE_DEALS.items():
            for i, s in enumerate(spec.scenarios):
                assert s.ai_narrative, f"{persona} scenario {i} missing narrative"

    def test_beginner_narrative_explains_metrics(self):
        spec = SAMPLE_DEALS["beginner"]
        narrative = spec.scenarios[0].ai_narrative
        assert "what is" in narrative.lower() or "that means" in narrative.lower()

    def test_experienced_narrative_is_terse(self):
        spec = SAMPLE_DEALS["wholesale"]
        narrative = spec.scenarios[0].ai_narrative
        # Should have assumptions and risks but not hand-holding explanations
        assert "70% rule" in narrative.lower() or "mao" in narrative.lower()

    def test_hybrid_has_multiple_scenarios(self):
        spec = SAMPLE_DEALS["hybrid"]
        assert len(spec.scenarios) == 3
        strategies = {s.strategy for s in spec.scenarios}
        assert "buy_and_hold" in strategies
        assert "brrrr" in strategies
        assert "wholesale" in strategies


# ---------------------------------------------------------------------------
# POST /api/onboarding/persona
# ---------------------------------------------------------------------------

class TestSetPersona:
    def test_valid_persona_creates_sample_data(self, auth_client, db):
        resp = auth_client.post("/api/onboarding/persona", json={"persona": "buy_and_hold"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["persona"] == "buy_and_hold"
        assert data["sample_property"]["is_sample"] is True
        assert data["sample_property"]["address_line1"] == "613 N 14th St"
        assert len(data["sample_scenarios"]) == 1
        assert data["sample_scenarios"][0]["strategy"] == "buy_and_hold"
        assert data["sample_scenarios"][0]["is_sample"] is True
        assert data["sample_scenarios"][0]["ai_narrative"] is not None

    def test_invalid_persona_returns_400(self, auth_client):
        resp = auth_client.post("/api/onboarding/persona", json={"persona": "invalid_xyz"})
        assert resp.status_code == 400

    def test_wholesale_persona_gets_correct_deal(self, auth_client, db):
        resp = auth_client.post("/api/onboarding/persona", json={"persona": "wholesale"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["sample_scenarios"][0]["strategy"] == "wholesale"
        assert data["sample_property"]["address_line1"] == "2847 W Maple St"

    def test_hybrid_persona_gets_multiple_scenarios(self, auth_client, db):
        resp = auth_client.post("/api/onboarding/persona", json={"persona": "hybrid"})
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["sample_scenarios"]) == 3

    def test_persona_stored_on_user(self, auth_client, db, test_user):
        auth_client.post("/api/onboarding/persona", json={"persona": "flip"})
        db.refresh(test_user)
        assert test_user.onboarding_persona == "flip"
        assert test_user.onboarding_completed_at is not None

    def test_reselect_persona_replaces_sample_data(self, auth_client, db):
        # First selection
        resp1 = auth_client.post("/api/onboarding/persona", json={"persona": "wholesale"})
        prop_id_1 = resp1.json()["sample_property"]["id"]

        # Second selection — should replace
        resp2 = auth_client.post("/api/onboarding/persona", json={"persona": "flip"})
        assert resp2.status_code == 200
        prop_id_2 = resp2.json()["sample_property"]["id"]
        assert prop_id_1 != prop_id_2

        # Old sample data should be soft-deleted
        from models.properties import Property
        old_prop = db.query(Property).filter(Property.id == prop_id_1).first()
        assert old_prop.is_deleted is True

    def test_all_8_personas_work(self, auth_client, db):
        for persona in VALID_PERSONAS:
            # Need fresh sample data each time (previous gets deleted)
            resp = auth_client.post("/api/onboarding/persona", json={"persona": persona})
            assert resp.status_code == 200, f"Failed for persona: {persona}"
            data = resp.json()
            assert data["persona"] == persona
            assert len(data["sample_scenarios"]) >= 1


# ---------------------------------------------------------------------------
# GET /api/onboarding/status
# ---------------------------------------------------------------------------

class TestOnboardingStatus:
    def test_status_before_onboarding(self, auth_client):
        resp = auth_client.get("/api/onboarding/status")
        assert resp.status_code == 200
        data = resp.json()
        assert data["completed"] is False
        assert data["persona"] is None
        assert data["has_sample_data"] is False

    def test_status_after_onboarding(self, auth_client, db):
        auth_client.post("/api/onboarding/persona", json={"persona": "buy_and_hold"})
        resp = auth_client.get("/api/onboarding/status")
        assert resp.status_code == 200
        data = resp.json()
        assert data["completed"] is True
        assert data["persona"] == "buy_and_hold"
        assert data["has_sample_data"] is True
        assert data["has_real_data"] is False
        assert data["real_property_count"] == 0


# ---------------------------------------------------------------------------
# DELETE /api/onboarding/sample-data
# ---------------------------------------------------------------------------

class TestClearSampleData:
    def test_clear_removes_sample_records(self, auth_client, db):
        auth_client.post("/api/onboarding/persona", json={"persona": "wholesale"})

        resp = auth_client.delete("/api/onboarding/sample-data")
        assert resp.status_code == 200
        assert resp.json()["count"] > 0

        # Verify status
        status_resp = auth_client.get("/api/onboarding/status")
        assert status_resp.json()["has_sample_data"] is False

    def test_clear_when_no_sample_data(self, auth_client, db):
        resp = auth_client.delete("/api/onboarding/sample-data")
        assert resp.status_code == 200
        assert resp.json()["count"] == 0


# ---------------------------------------------------------------------------
# Auto-archive tests
# ---------------------------------------------------------------------------

class TestAutoArchive:
    @patch("core.property_data.providers.rentcast.fetch_property_details")
    @patch("core.property_data.providers.rentcast.fetch_rent_estimate")
    @patch("core.property_data.providers.rentcast.fetch_value_estimate")
    @patch("core.ai.deal_narrator.narrate")
    def test_3rd_real_property_triggers_archive(
        self, mock_narrate, mock_value, mock_rent, mock_details,
        auth_client, db,
    ):
        from core.property_data.providers.rentcast import RentCastResult
        from core.ai.deal_narrator import NarrativeResult

        # Mock providers
        mock_details.return_value = RentCastResult(status="success", data={"bedrooms": 3}, latency_ms=50)
        mock_rent.return_value = RentCastResult(status="success", data={"rent": 1200}, latency_ms=50)
        mock_value.return_value = RentCastResult(status="success", data={"price": 150000}, latency_ms=50)

        async def _mock_narrate(*args, **kwargs):
            return NarrativeResult(narrative="Test", confidence="high", latency_ms=100)
        mock_narrate.side_effect = _mock_narrate

        # Create sample data via onboarding
        auth_client.post("/api/onboarding/persona", json={"persona": "buy_and_hold"})

        # Verify sample data exists
        status_resp = auth_client.get("/api/onboarding/status")
        assert status_resp.json()["has_sample_data"] is True

        # Create 3 real properties (each needs unique address)
        for i in range(3):
            auth_client.post("/api/analysis/quick", json={
                "address": f"{100 + i} Real Property St, Milwaukee, WI 53201",
            })

        # Verify sample data was auto-archived
        status_resp = auth_client.get("/api/onboarding/status")
        assert status_resp.json()["has_sample_data"] is False
        assert status_resp.json()["real_property_count"] == 3

    @patch("core.property_data.providers.rentcast.fetch_property_details")
    @patch("core.property_data.providers.rentcast.fetch_rent_estimate")
    @patch("core.property_data.providers.rentcast.fetch_value_estimate")
    @patch("core.ai.deal_narrator.narrate")
    def test_2_real_properties_does_not_archive(
        self, mock_narrate, mock_value, mock_rent, mock_details,
        auth_client, db,
    ):
        from core.property_data.providers.rentcast import RentCastResult
        from core.ai.deal_narrator import NarrativeResult

        mock_details.return_value = RentCastResult(status="success", data={}, latency_ms=50)
        mock_rent.return_value = RentCastResult(status="success", data={}, latency_ms=50)
        mock_value.return_value = RentCastResult(status="success", data={}, latency_ms=50)

        async def _mock_narrate(*args, **kwargs):
            return NarrativeResult(narrative="Test", confidence="high", latency_ms=100)
        mock_narrate.side_effect = _mock_narrate

        auth_client.post("/api/onboarding/persona", json={"persona": "wholesale"})

        for i in range(2):
            auth_client.post("/api/analysis/quick", json={
                "address": f"{200 + i} Not Enough St, Milwaukee, WI 53201",
            })

        # Sample data should still exist
        status_resp = auth_client.get("/api/onboarding/status")
        assert status_resp.json()["has_sample_data"] is True
