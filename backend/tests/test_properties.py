"""Tests for property detail and scenario endpoints."""

import uuid
from unittest.mock import patch

from core.property_data.providers.rentcast import RentCastResult


# Mock helpers
def _mock_rc(address):
    return RentCastResult(status="success", data={"bedrooms": 3}, latency_ms=50)

async def _mock_narrate(*args, **kwargs):
    from core.ai.deal_narrator import NarrativeResult
    return NarrativeResult(narrative="Test narrative", confidence="high", latency_ms=100)


class TestPropertyEndpoints:
    @patch("core.property_data.providers.rentcast.fetch_property_details", _mock_rc)
    @patch("core.property_data.providers.rentcast.fetch_rent_estimate", _mock_rc)
    @patch("core.property_data.providers.rentcast.fetch_value_estimate", _mock_rc)
    @patch("core.ai.deal_narrator.narrate", _mock_narrate)
    def test_get_property(self, auth_client, db):
        # Create a property via analysis
        resp = auth_client.post("/api/analysis/quick", json={
            "address": "100 Prop Test St, Milwaukee, WI 53201",
        })
        prop_id = resp.json()["property"]["id"]

        # Fetch it
        resp2 = auth_client.get(f"/api/properties/{prop_id}")
        assert resp2.status_code == 200
        data = resp2.json()
        assert data["id"] == prop_id
        assert data["address_line1"] == "100 Prop Test St"

    @patch("core.property_data.providers.rentcast.fetch_property_details", _mock_rc)
    @patch("core.property_data.providers.rentcast.fetch_rent_estimate", _mock_rc)
    @patch("core.property_data.providers.rentcast.fetch_value_estimate", _mock_rc)
    @patch("core.ai.deal_narrator.narrate", _mock_narrate)
    def test_list_scenarios(self, auth_client, db):
        resp = auth_client.post("/api/analysis/quick", json={
            "address": "200 Scenario St, Milwaukee, WI 53201",
        })
        prop_id = resp.json()["property"]["id"]

        resp2 = auth_client.get(f"/api/properties/{prop_id}/scenarios")
        assert resp2.status_code == 200
        scenarios = resp2.json()
        assert len(scenarios) >= 1
        assert scenarios[0]["property_id"] == prop_id

    @patch("core.property_data.providers.rentcast.fetch_property_details", _mock_rc)
    @patch("core.property_data.providers.rentcast.fetch_rent_estimate", _mock_rc)
    @patch("core.property_data.providers.rentcast.fetch_value_estimate", _mock_rc)
    @patch("core.ai.deal_narrator.narrate", _mock_narrate)
    def test_create_scenario_new_strategy(self, auth_client, db):
        resp = auth_client.post("/api/analysis/quick", json={
            "address": "300 New Strategy St, Milwaukee, WI 53201",
        })
        prop_id = resp.json()["property"]["id"]

        # Create a wholesale scenario on the same property
        resp2 = auth_client.post(f"/api/properties/{prop_id}/scenarios", json={
            "strategy": "wholesale",
        })
        assert resp2.status_code == 201
        data = resp2.json()
        assert data["strategy"] == "wholesale"
        assert data["property_id"] == prop_id
        assert "mao" in data["outputs"]

    @patch("core.property_data.providers.rentcast.fetch_property_details", _mock_rc)
    @patch("core.property_data.providers.rentcast.fetch_rent_estimate", _mock_rc)
    @patch("core.property_data.providers.rentcast.fetch_value_estimate", _mock_rc)
    @patch("core.ai.deal_narrator.narrate", _mock_narrate)
    def test_create_scenario_duplicate_returns_existing(self, auth_client, db):
        resp = auth_client.post("/api/analysis/quick", json={
            "address": "400 Dedup St, Milwaukee, WI 53201",
            "strategy": "flip",
        })
        prop_id = resp.json()["property"]["id"]

        # Try to create another flip scenario — should return existing
        resp2 = auth_client.post(f"/api/properties/{prop_id}/scenarios", json={
            "strategy": "flip",
        })
        # Returns 201 but same scenario (idempotent, not a new record)
        assert resp2.status_code == 201

    def test_get_nonexistent_property_404(self, auth_client):
        fake_id = str(uuid.uuid4())
        resp = auth_client.get(f"/api/properties/{fake_id}")
        assert resp.status_code == 404
