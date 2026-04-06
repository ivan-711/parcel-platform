"""Tests for the reports router — creation, sharing, view tracking, deletion."""

import secrets


def test_report_data_snapshot_structure():
    """Verify the report_data snapshot shape matches expectations."""
    from routers.reports import _build_report_data

    class MockProperty:
        address_line1 = "613 N 14th St"
        city = "Sheboygan"
        state = "WI"
        zip_code = "53081"
        property_type = "SFH"
        bedrooms = 3
        bathrooms = 2.0
        sqft = 1500
        year_built = 1960

    class MockScenario:
        strategy = "buy_and_hold"
        purchase_price = 85000
        after_repair_value = 120000
        repair_cost = 15000
        monthly_rent = 1200
        inputs_extended = {"bricked_comps": []}
        outputs = {"cap_rate": 8.5, "monthly_cash_flow": 350}
        risk_score = 42
        risk_flags = []
        ai_narrative = "This property shows strong fundamentals."

    class MockUser:
        brand_kit = {"company_name": "Acme Realty", "primary_color": "#FF5500"}

    data = _build_report_data(MockProperty(), MockScenario(), MockUser())

    assert data["property"]["address_line1"] == "613 N 14th St"
    assert data["property"]["city"] == "Sheboygan"
    assert data["scenario"]["strategy"] == "buy_and_hold"
    assert data["scenario"]["outputs"]["cap_rate"] == 8.5
    assert data["brand_kit"]["company_name"] == "Acme Realty"


def test_report_data_snapshot_handles_none():
    """Verify snapshot handles None values gracefully."""
    from routers.reports import _build_report_data

    class MockProperty:
        address_line1 = "123 Main St"
        city = "Anytown"
        state = "TX"
        zip_code = "75001"
        property_type = None
        bedrooms = None
        bathrooms = None
        sqft = None
        year_built = None

    class MockScenario:
        strategy = "wholesale"
        purchase_price = None
        after_repair_value = None
        repair_cost = None
        monthly_rent = None
        inputs_extended = None
        outputs = {}
        risk_score = None
        risk_flags = None
        ai_narrative = None

    class MockUser:
        brand_kit = None

    data = _build_report_data(MockProperty(), MockScenario(), MockUser())

    assert data["property"]["bedrooms"] is None
    assert data["scenario"]["purchase_price"] is None
    assert data["brand_kit"] is None


def test_share_token_uniqueness():
    """Verify token generation produces unique tokens."""
    tokens = {secrets.token_urlsafe(16) for _ in range(100)}
    assert len(tokens) == 100


def test_report_response_pdf_status():
    """Verify PDF status derivation logic."""
    from routers.reports import _report_to_response

    class MockReport:
        id = "test-id"
        title = "Test Report"
        report_type = "analysis"
        property_id = None
        scenario_id = None
        audience = "client"
        share_token = "abc123"
        is_public = True
        view_count = 5
        last_viewed_at = None
        created_at = "2026-04-04"
        updated_at = "2026-04-04"
        report_data = {"property": {"address_line1": "123 Main", "city": "X", "state": "TX"}}
        pdf_s3_key = None
        pdf_generated_at = None

    resp = _report_to_response(MockReport())
    assert resp.pdf_status == "none"

    MockReport.pdf_s3_key = "reports/test/report.pdf"
    resp = _report_to_response(MockReport())
    assert resp.pdf_status == "ready"


def test_report_response_property_address():
    """Verify property address is extracted from report_data."""
    from routers.reports import _report_to_response

    class MockReport:
        id = "test-id"
        title = "Test"
        report_type = "analysis"
        property_id = None
        scenario_id = None
        audience = None
        share_token = "tok"
        is_public = True
        view_count = 0
        last_viewed_at = None
        created_at = "2026-04-04"
        updated_at = "2026-04-04"
        report_data = {"property": {"address_line1": "613 N 14th", "city": "Sheboygan", "state": "WI"}}
        pdf_s3_key = None
        pdf_generated_at = None

    resp = _report_to_response(MockReport())
    assert "613 N 14th" in resp.property_address
    assert "Sheboygan" in resp.property_address
