"""Tests for Wave 2 Sprint 2 — Financing CRUD API endpoints."""

import uuid
from datetime import date, timedelta
from decimal import Decimal

import pytest

from models.properties import Property
from models.financing_instruments import FinancingInstrument
from models.obligations import Obligation
from models.payments import Payment
from core.financing.amortization import calculate_amortization_schedule


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_property(db, user_id) -> Property:
    p = Property(
        id=uuid.uuid4(),
        created_by=user_id,
        address_line1="123 Test St",
        city="Austin",
        state="TX",
        zip_code="78701",
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


def _instrument_payload(property_id, **overrides):
    base = {
        "property_id": str(property_id),
        "name": "Test Mortgage",
        "instrument_type": "conventional_mortgage",
        "original_balance": 200000,
        "current_balance": 180000,
        "interest_rate": 6.5,
        "monthly_payment": 1264.14,
        "term_months": 360,
        "first_payment_date": str(date.today() - timedelta(days=30)),
        "maturity_date": str(date.today() + timedelta(days=365 * 25)),
        "has_balloon": False,
        "is_sub_to": False,
        "is_wrap": False,
    }
    base.update(overrides)
    return base


# ---------------------------------------------------------------------------
# Instrument CRUD
# ---------------------------------------------------------------------------

class TestInstrumentCRUD:
    def test_create_instrument(self, auth_client, test_user, db):
        prop = _make_property(db, test_user.id)
        payload = _instrument_payload(prop.id)

        resp = auth_client.post("/api/financing/instruments", json=payload)
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Test Mortgage"
        assert data["instrument_type"] == "conventional_mortgage"
        assert data["property_id"] == str(prop.id)

        # Obligations should have been auto-generated
        obls = db.query(Obligation).filter(
            Obligation.instrument_id == uuid.UUID(data["id"]),
        ).all()
        assert len(obls) >= 1  # at least monthly_payment

    def test_create_wrap_with_underlying(self, auth_client, test_user, db):
        prop = _make_property(db, test_user.id)
        # Create underlying first
        underlying_payload = _instrument_payload(prop.id, name="Underlying Sub-To")
        resp1 = auth_client.post("/api/financing/instruments", json=underlying_payload)
        assert resp1.status_code == 201
        underlying_id = resp1.json()["id"]

        # Create wrap referencing underlying
        wrap_payload = _instrument_payload(
            prop.id,
            name="Wrap Mortgage",
            instrument_type="wrap_mortgage",
            is_wrap=True,
            underlying_instrument_id=underlying_id,
            wrap_rate=8.0,
            wrap_payment=1500,
        )
        resp2 = auth_client.post("/api/financing/instruments", json=wrap_payload)
        assert resp2.status_code == 201
        assert resp2.json()["underlying_instrument_id"] == underlying_id

    def test_create_wrap_invalid_underlying(self, auth_client, test_user, db):
        prop = _make_property(db, test_user.id)
        payload = _instrument_payload(
            prop.id,
            instrument_type="wrap_mortgage",
            is_wrap=True,
            underlying_instrument_id=str(uuid.uuid4()),
        )
        resp = auth_client.post("/api/financing/instruments", json=payload)
        assert resp.status_code == 404

    def test_list_instruments(self, auth_client, test_user, db):
        prop = _make_property(db, test_user.id)
        for i in range(3):
            auth_client.post(
                "/api/financing/instruments",
                json=_instrument_payload(prop.id, name=f"Instrument {i}"),
            )

        resp = auth_client.get("/api/financing/instruments")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 3
        assert len(data["items"]) == 3

    def test_list_filter_by_property(self, auth_client, test_user, db):
        prop1 = _make_property(db, test_user.id)
        prop2 = _make_property(db, test_user.id)
        auth_client.post("/api/financing/instruments", json=_instrument_payload(prop1.id))
        auth_client.post("/api/financing/instruments", json=_instrument_payload(prop2.id))

        resp = auth_client.get(f"/api/financing/instruments?property_id={prop1.id}")
        assert resp.status_code == 200
        assert resp.json()["total"] == 1

    def test_get_instrument_detail(self, auth_client, test_user, db):
        prop = _make_property(db, test_user.id)
        create_resp = auth_client.post(
            "/api/financing/instruments",
            json=_instrument_payload(prop.id),
        )
        inst_id = create_resp.json()["id"]

        resp = auth_client.get(f"/api/financing/instruments/{inst_id}")
        assert resp.status_code == 200
        data = resp.json()
        assert "obligations" in data
        assert "recent_payments" in data
        assert "amortization_schedule" in data
        assert len(data["amortization_schedule"]) == 12

    def test_update_instrument(self, auth_client, test_user, db):
        prop = _make_property(db, test_user.id)
        create_resp = auth_client.post(
            "/api/financing/instruments",
            json=_instrument_payload(prop.id),
        )
        inst_id = create_resp.json()["id"]

        resp = auth_client.patch(
            f"/api/financing/instruments/{inst_id}",
            json={"name": "Updated Name", "notes": "some notes"},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated Name"

    def test_update_regenerates_obligations(self, auth_client, test_user, db):
        prop = _make_property(db, test_user.id)
        create_resp = auth_client.post(
            "/api/financing/instruments",
            json=_instrument_payload(prop.id),
        )
        inst_id = create_resp.json()["id"]

        # Get initial obligation count
        initial_obls = db.query(Obligation).filter(
            Obligation.instrument_id == uuid.UUID(inst_id),
            Obligation.deleted_at.is_(None),
        ).count()

        # Update a term field → should regenerate
        resp = auth_client.patch(
            f"/api/financing/instruments/{inst_id}",
            json={"monthly_payment": 1500},
        )
        assert resp.status_code == 200

        # New obligations should exist, old ones soft-deleted
        active_obls = db.query(Obligation).filter(
            Obligation.instrument_id == uuid.UUID(inst_id),
            Obligation.deleted_at.is_(None),
        ).count()
        assert active_obls >= 1

    def test_delete_instrument(self, auth_client, test_user, db):
        prop = _make_property(db, test_user.id)
        create_resp = auth_client.post(
            "/api/financing/instruments",
            json=_instrument_payload(prop.id),
        )
        inst_id = create_resp.json()["id"]

        resp = auth_client.delete(f"/api/financing/instruments/{inst_id}")
        assert resp.status_code == 204

        # Should be 404 now
        get_resp = auth_client.get(f"/api/financing/instruments/{inst_id}")
        assert get_resp.status_code == 404

        # Obligations should also be soft-deleted
        active_obls = db.query(Obligation).filter(
            Obligation.instrument_id == uuid.UUID(inst_id),
            Obligation.deleted_at.is_(None),
        ).count()
        assert active_obls == 0

    def test_delete_not_found(self, auth_client):
        resp = auth_client.delete(f"/api/financing/instruments/{uuid.uuid4()}")
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Obligations
# ---------------------------------------------------------------------------

class TestObligationEndpoints:
    def test_list_obligations(self, auth_client, test_user, db):
        prop = _make_property(db, test_user.id)
        auth_client.post(
            "/api/financing/instruments",
            json=_instrument_payload(prop.id),
        )

        resp = auth_client.get("/api/financing/obligations")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 1

    def test_upcoming_obligations_grouped(self, auth_client, test_user, db):
        prop = _make_property(db, test_user.id)
        # Create instrument with balloon
        auth_client.post(
            "/api/financing/instruments",
            json=_instrument_payload(
                prop.id,
                has_balloon=True,
                balloon_date=str(date.today() + timedelta(days=60)),
                balloon_amount=150000,
            ),
        )

        resp = auth_client.get("/api/financing/obligations/upcoming")
        assert resp.status_code == 200
        data = resp.json()
        assert "critical" in data
        assert "high" in data
        assert "normal" in data

    def test_update_obligation_snooze(self, auth_client, test_user, db):
        prop = _make_property(db, test_user.id)
        create_resp = auth_client.post(
            "/api/financing/instruments",
            json=_instrument_payload(prop.id),
        )
        inst_id = create_resp.json()["id"]

        # Get first obligation
        obls = db.query(Obligation).filter(
            Obligation.instrument_id == uuid.UUID(inst_id),
            Obligation.deleted_at.is_(None),
        ).first()
        assert obls is not None

        snooze_date = str(date.today() + timedelta(days=14))
        resp = auth_client.patch(
            f"/api/financing/obligations/{obls.id}",
            json={"status": "snoozed", "next_due": snooze_date},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "snoozed"

    def test_complete_obligation_with_payment(self, auth_client, test_user, db):
        prop = _make_property(db, test_user.id)
        create_resp = auth_client.post(
            "/api/financing/instruments",
            json=_instrument_payload(prop.id),
        )
        inst_id = create_resp.json()["id"]

        # Get monthly obligation
        obl = db.query(Obligation).filter(
            Obligation.instrument_id == uuid.UUID(inst_id),
            Obligation.obligation_type == "monthly_payment",
            Obligation.deleted_at.is_(None),
        ).first()
        assert obl is not None

        old_next_due = obl.next_due

        resp = auth_client.post(
            f"/api/financing/obligations/{obl.id}/complete",
            json={
                "payment_amount": 1264.14,
                "payment_date": str(date.today()),
                "payment_method": "bank_transfer",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        # Recurring obligation should advance, not stay completed
        assert data["status"] == "active"
        assert data["next_due"] != str(old_next_due)

        # Payment should have been created
        payments = db.query(Payment).filter(
            Payment.obligation_id == obl.id,
        ).all()
        assert len(payments) == 1

    def test_complete_one_time_obligation(self, auth_client, test_user, db):
        prop = _make_property(db, test_user.id)
        create_resp = auth_client.post(
            "/api/financing/instruments",
            json=_instrument_payload(
                prop.id,
                has_balloon=True,
                balloon_date=str(date.today() + timedelta(days=60)),
                balloon_amount=150000,
            ),
        )
        inst_id = create_resp.json()["id"]

        # Get balloon obligation (one_time)
        obl = db.query(Obligation).filter(
            Obligation.instrument_id == uuid.UUID(inst_id),
            Obligation.obligation_type == "balloon_payment",
            Obligation.deleted_at.is_(None),
        ).first()
        assert obl is not None

        resp = auth_client.post(
            f"/api/financing/obligations/{obl.id}/complete",
            json={"payment_amount": 150000},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "completed"


# ---------------------------------------------------------------------------
# Payments
# ---------------------------------------------------------------------------

class TestPaymentEndpoints:
    def test_create_payment(self, auth_client, test_user, db):
        prop = _make_property(db, test_user.id)
        inst_resp = auth_client.post(
            "/api/financing/instruments",
            json=_instrument_payload(prop.id),
        )
        inst_id = inst_resp.json()["id"]

        resp = auth_client.post(
            "/api/financing/payments",
            json={
                "instrument_id": inst_id,
                "property_id": str(prop.id),
                "payment_type": "regular",
                "amount": 1264.14,
                "payment_date": str(date.today()),
                "direction": "outgoing",
                "principal_portion": 800,
                "interest_portion": 464.14,
            },
        )
        assert resp.status_code == 201
        assert resp.json()["amount"] == "1264.14"

    def test_payment_updates_balance(self, auth_client, test_user, db):
        prop = _make_property(db, test_user.id)
        inst_resp = auth_client.post(
            "/api/financing/instruments",
            json=_instrument_payload(prop.id, current_balance=180000),
        )
        inst_id = inst_resp.json()["id"]

        auth_client.post(
            "/api/financing/payments",
            json={
                "instrument_id": inst_id,
                "property_id": str(prop.id),
                "payment_type": "regular",
                "amount": 1264.14,
                "payment_date": str(date.today()),
                "direction": "outgoing",
                "principal_portion": 800,
            },
        )

        # Refresh and check balance
        inst = db.query(FinancingInstrument).get(uuid.UUID(inst_id))
        assert float(inst.current_balance) == 179200.0

    def test_list_payments_filtered(self, auth_client, test_user, db):
        prop = _make_property(db, test_user.id)
        inst_resp = auth_client.post(
            "/api/financing/instruments",
            json=_instrument_payload(prop.id),
        )
        inst_id = inst_resp.json()["id"]

        for direction in ["outgoing", "incoming", "outgoing"]:
            auth_client.post(
                "/api/financing/payments",
                json={
                    "instrument_id": inst_id,
                    "property_id": str(prop.id),
                    "payment_type": "regular",
                    "amount": 1000,
                    "payment_date": str(date.today()),
                    "direction": direction,
                },
            )

        resp = auth_client.get("/api/financing/payments?direction=outgoing")
        assert resp.status_code == 200
        assert resp.json()["total"] == 2

    def test_payment_summary(self, auth_client, test_user, db):
        prop = _make_property(db, test_user.id)
        inst_resp = auth_client.post(
            "/api/financing/instruments",
            json=_instrument_payload(prop.id),
        )
        inst_id = inst_resp.json()["id"]

        auth_client.post(
            "/api/financing/payments",
            json={
                "instrument_id": inst_id,
                "property_id": str(prop.id),
                "payment_type": "regular",
                "amount": 1500,
                "payment_date": str(date.today()),
                "direction": "outgoing",
            },
        )
        auth_client.post(
            "/api/financing/payments",
            json={
                "instrument_id": inst_id,
                "property_id": str(prop.id),
                "payment_type": "regular",
                "amount": 2000,
                "payment_date": str(date.today()),
                "direction": "incoming",
            },
        )

        resp = auth_client.get("/api/financing/payments/summary")
        assert resp.status_code == 200
        data = resp.json()
        assert data["net_monthly"] > 0  # incoming > outgoing


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

class TestDashboard:
    def test_financing_dashboard(self, auth_client, test_user, db):
        prop = _make_property(db, test_user.id)
        auth_client.post(
            "/api/financing/instruments",
            json=_instrument_payload(prop.id),
        )

        resp = auth_client.get("/api/financing/dashboard")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_instruments"] == 1
        assert data["total_balance"] > 0
        assert "upcoming_balloons" in data
        assert "wrap_spreads" in data
        assert "due_on_sale_risks" in data


# ---------------------------------------------------------------------------
# Today Integration
# ---------------------------------------------------------------------------

class TestTodayIntegration:
    def test_today_includes_financing_fields(self, auth_client, test_user, db):
        prop = _make_property(db, test_user.id)
        auth_client.post(
            "/api/financing/instruments",
            json=_instrument_payload(prop.id),
        )

        resp = auth_client.get("/api/today")
        assert resp.status_code == 200
        data = resp.json()
        ps = data["portfolio_summary"]
        assert "total_monthly_obligations" in ps
        assert "net_financing_cash_flow" in ps
        assert "upcoming_balloon_count" in ps

    def test_today_overdue_obligation_briefing(self, auth_client, test_user, db):
        prop = _make_property(db, test_user.id)
        inst_resp = auth_client.post(
            "/api/financing/instruments",
            json=_instrument_payload(prop.id),
        )
        inst_id = inst_resp.json()["id"]

        # Manually set an obligation to be overdue
        obl = db.query(Obligation).filter(
            Obligation.instrument_id == uuid.UUID(inst_id),
            Obligation.deleted_at.is_(None),
        ).first()
        if obl:
            obl.next_due = date.today() - timedelta(days=5)
            db.commit()

            resp = auth_client.get("/api/today")
            assert resp.status_code == 200
            briefing = resp.json()["briefing_items"]
            overdue_items = [
                b for b in briefing if "OVERDUE" in b.get("title", "")
            ]
            assert len(overdue_items) >= 1


# ---------------------------------------------------------------------------
# Amortization Calculator (unit tests)
# ---------------------------------------------------------------------------

class TestAmortization:
    def test_basic_schedule(self):
        schedule = calculate_amortization_schedule(
            balance=100000,
            annual_rate=6.0,
            monthly_payment=599.55,
            months=12,
            start_date=date(2026, 1, 1),
        )
        assert len(schedule) == 12
        assert schedule[0]["month"] == 1
        # First month: interest = 100000 * 0.06/12 = 500
        assert schedule[0]["interest"] == 500.0
        assert schedule[0]["principal"] == 99.55
        # Balance should decrease
        assert schedule[-1]["balance"] < 100000

    def test_zero_rate(self):
        schedule = calculate_amortization_schedule(
            balance=12000,
            annual_rate=0,
            monthly_payment=1000,
            months=12,
        )
        assert len(schedule) == 12
        for entry in schedule:
            assert entry["interest"] == 0
            assert entry["principal"] == 1000

    def test_balance_exhausted_early(self):
        schedule = calculate_amortization_schedule(
            balance=2000,
            annual_rate=6.0,
            monthly_payment=1100,
            months=12,
        )
        # Should stop before 12 months since balance runs out
        assert len(schedule) < 12
        assert schedule[-1]["balance"] == 0

    def test_empty_on_zero_balance(self):
        schedule = calculate_amortization_schedule(
            balance=0, annual_rate=6.0, monthly_payment=500,
        )
        assert schedule == []

    def test_empty_on_zero_payment(self):
        schedule = calculate_amortization_schedule(
            balance=100000, annual_rate=6.0, monthly_payment=0,
        )
        assert schedule == []


# ---------------------------------------------------------------------------
# RLS — user isolation
# ---------------------------------------------------------------------------

class TestRLS:
    def test_user_cannot_see_others_instruments(self, client, db):
        """Create instrument as user A, try to access as user B."""
        from core.security.jwt import get_current_user
        from main import app

        # User A
        user_a = _make_user(db, "usera@test.com")
        prop = _make_property(db, user_a.id)
        inst = FinancingInstrument(
            id=uuid.uuid4(),
            property_id=prop.id,
            created_by=user_a.id,
            name="User A Mortgage",
            instrument_type="conventional_mortgage",
            current_balance=100000,
        )
        db.add(inst)
        db.commit()

        # User B — override get_current_user to return user B
        user_b = _make_user(db, "userb@test.com")
        app.dependency_overrides[get_current_user] = lambda: user_b

        resp = client.get(f"/api/financing/instruments/{inst.id}")
        assert resp.status_code == 404

        resp = client.get("/api/financing/instruments")
        assert resp.json()["total"] == 0

        app.dependency_overrides.pop(get_current_user, None)


def _make_user(db, email):
    from models.users import User
    user = User(
        id=uuid.uuid4(),
        name="Test",
        email=email,
        password_hash=None,
        role="investor",
        plan_tier="pro",
        clerk_user_id=f"clerk_{email.replace('@', '_').replace('.', '_')}",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
