"""Integration tests for the deals and pipeline API endpoints.

Covers the full deal lifecycle: create via the strategy calculator, retrieve,
soft-delete, and pipeline stage management — the core workflow of the app.
"""


# ---------------------------------------------------------------------------
# Helper: create a wholesale deal via the API (reused across tests)
# ---------------------------------------------------------------------------

def _create_wholesale_deal(auth_client) -> dict:
    """POST a wholesale deal and return the response JSON."""
    resp = auth_client.post("/api/v1/deals/", json={
        "address": "123 Main St",
        "zip_code": "60614",
        "property_type": "single_family",
        "strategy": "wholesale",
        "inputs": {
            "arv": 200_000,
            "repair_costs": 30_000,
            "desired_profit": 10_000,
            "holding_costs": 0,
            "closing_costs_pct": 3.0,
            "asking_price": 90_000,
        },
    })
    assert resp.status_code == 201
    return resp.json()


class TestDealCreation:
    """POST /api/v1/deals/ — create a new deal analysis."""

    def test_create_deal_runs_calculator_and_risk_score(self, auth_client):
        """Creating a deal runs the strategy calculator and returns computed outputs."""
        deal = _create_wholesale_deal(auth_client)

        assert deal["strategy"] == "wholesale"
        assert deal["address"] == "123 Main St"
        assert deal["status"] == "draft"

        # Verify the calculator ran — outputs contain MAO and recommendation
        assert "mao" in deal["outputs"]
        assert deal["outputs"]["mao"] == 100_000
        assert deal["outputs"]["recommendation"] == "strong"

        # Verify the risk scorer ran — risk_score is a bounded integer
        assert isinstance(deal["risk_score"], int)
        assert 0 <= deal["risk_score"] <= 100

    def test_create_deal_persists_and_is_retrievable(self, auth_client):
        """A created deal can be fetched by its ID."""
        created = _create_wholesale_deal(auth_client)
        deal_id = created["id"]

        resp = auth_client.get(f"/api/v1/deals/{deal_id}")
        assert resp.status_code == 200
        fetched = resp.json()
        assert fetched["id"] == deal_id
        assert fetched["inputs"]["arv"] == 200_000


class TestDealListAndDelete:
    """GET /api/v1/deals/ and DELETE /api/v1/deals/:id."""

    def test_list_deals_returns_created_deals(self, auth_client):
        """The deals list endpoint includes deals the user has created."""
        _create_wholesale_deal(auth_client)
        resp = auth_client.get("/api/v1/deals/")
        assert resp.status_code == 200
        deals = resp.json()
        assert len(deals) >= 1
        assert deals[0]["strategy"] == "wholesale"
        # List items include the primary metric
        assert deals[0]["primary_metric_label"] == "Maximum Allowable Offer"

    def test_soft_delete_hides_deal_from_list(self, auth_client):
        """Deleting a deal soft-deletes it — it no longer appears in the list."""
        deal = _create_wholesale_deal(auth_client)
        deal_id = deal["id"]

        # Delete
        resp = auth_client.delete(f"/api/v1/deals/{deal_id}")
        assert resp.status_code == 204

        # Verify it's gone from the list
        resp = auth_client.get("/api/v1/deals/")
        assert resp.status_code == 200
        ids = [d["id"] for d in resp.json()]
        assert deal_id not in ids


class TestPipeline:
    """Pipeline endpoints — add deals, move stages, and verify board state."""

    def test_pipeline_full_lifecycle(self, auth_client):
        """Add a deal to the pipeline, move it through stages, and verify the board."""
        deal = _create_wholesale_deal(auth_client)
        deal_id = deal["id"]

        # Add to pipeline at "lead" stage
        resp = auth_client.post("/api/v1/pipeline/", json={
            "deal_id": deal_id,
            "stage": "lead",
        })
        assert resp.status_code == 201
        card = resp.json()
        assert card["stage"] == "lead"
        assert card["deal_id"] == deal_id
        pipeline_id = card["pipeline_id"]

        # Move to "analyzing" stage
        resp = auth_client.put(f"/api/v1/pipeline/{pipeline_id}/stage/", json={
            "stage": "analyzing",
        })
        assert resp.status_code == 200
        assert resp.json()["stage"] == "analyzing"

        # Verify board structure — all 7 stages present, deal in "analyzing"
        resp = auth_client.get("/api/v1/pipeline/")
        assert resp.status_code == 200
        board = resp.json()
        expected_stages = ["lead", "analyzing", "offer_sent", "under_contract",
                           "due_diligence", "closed", "dead"]
        for stage in expected_stages:
            assert stage in board
        assert len(board["analyzing"]) == 1
        assert board["analyzing"][0]["deal_id"] == deal_id
