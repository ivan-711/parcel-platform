"""Tests for Wave 2 Sprint 1 — FinancingInstrument, Obligation, Payment models + engine."""

import uuid
from datetime import date, timedelta
from decimal import Decimal

import pytest

from models.properties import Property
from models.financing_instruments import FinancingInstrument
from models.obligations import Obligation
from models.payments import Payment
from core.financing.obligation_engine import generate_obligations, _add_months
from core.financing.wrap_calculator import calculate_wrap_spread


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_property(db, user_id: uuid.UUID) -> Property:
    p = Property(
        id=uuid.uuid4(),
        created_by=user_id,
        address_line1="123 Test St",
        city="Austin",
        state="TX",
        zip_code="78701",
    )
    db.add(p)
    db.flush()
    return p


def _make_instrument(db, user_id: uuid.UUID, property_id: uuid.UUID, **overrides) -> FinancingInstrument:
    defaults = dict(
        id=uuid.uuid4(),
        property_id=property_id,
        created_by=user_id,
        name="Test Mortgage",
        instrument_type="conventional_mortgage",
        position=1,
        status="active",
        original_balance=Decimal("200000.00"),
        current_balance=Decimal("195000.00"),
        interest_rate=Decimal("4.5000"),
        rate_type="fixed",
        term_months=360,
        amortization_months=360,
        monthly_payment=Decimal("1013.37"),
        origination_date=date(2024, 1, 1),
        maturity_date=date(2054, 1, 1),
        first_payment_date=date(2024, 2, 1),
    )
    defaults.update(overrides)
    inst = FinancingInstrument(**defaults)
    db.add(inst)
    db.flush()
    return inst


# ---------------------------------------------------------------------------
# FinancingInstrument CRUD
# ---------------------------------------------------------------------------

class TestFinancingInstrumentModel:
    def test_create_and_read(self, db, test_user):
        prop = _make_property(db, test_user.id)
        inst = _make_instrument(db, test_user.id, prop.id)
        db.commit()

        fetched = db.query(FinancingInstrument).filter_by(id=inst.id).one()
        assert fetched.name == "Test Mortgage"
        assert fetched.instrument_type == "conventional_mortgage"
        assert fetched.original_balance == Decimal("200000.00")
        assert fetched.interest_rate == Decimal("4.5000")
        assert fetched.property_id == prop.id
        assert fetched.created_by == test_user.id

    def test_update_balance(self, db, test_user):
        prop = _make_property(db, test_user.id)
        inst = _make_instrument(db, test_user.id, prop.id)
        db.commit()

        inst.current_balance = Decimal("190000.00")
        inst.status = "active"
        db.commit()
        db.refresh(inst)
        assert inst.current_balance == Decimal("190000.00")

    def test_all_instrument_types(self, db, test_user):
        """Verify each instrument_type string can be persisted."""
        prop = _make_property(db, test_user.id)
        types = [
            "conventional_mortgage", "sub_to_mortgage", "seller_finance",
            "wrap_mortgage", "lease_option", "hard_money", "private_money",
            "heloc", "land_contract",
        ]
        for itype in types:
            _make_instrument(
                db, test_user.id, prop.id,
                id=uuid.uuid4(), name=itype, instrument_type=itype,
            )
        db.commit()
        count = db.query(FinancingInstrument).filter_by(property_id=prop.id).count()
        assert count == len(types)

    def test_property_relationship(self, db, test_user):
        prop = _make_property(db, test_user.id)
        _make_instrument(db, test_user.id, prop.id)
        _make_instrument(db, test_user.id, prop.id, id=uuid.uuid4(), name="Second", position=2)
        db.commit()
        db.refresh(prop)
        assert len(prop.financing_instruments) == 2


# ---------------------------------------------------------------------------
# Self-referential FK (wrap → underlying)
# ---------------------------------------------------------------------------

class TestSelfReferentialFK:
    def test_wrap_links_to_underlying(self, db, test_user):
        prop = _make_property(db, test_user.id)

        underlying = _make_instrument(
            db, test_user.id, prop.id,
            name="Underlying Mortgage",
            instrument_type="sub_to_mortgage",
            is_sub_to=True,
            monthly_payment=Decimal("900.00"),
            interest_rate=Decimal("3.5000"),
        )

        wrap = _make_instrument(
            db, test_user.id, prop.id,
            id=uuid.uuid4(),
            name="Wrap Note",
            instrument_type="wrap_mortgage",
            position=2,
            is_wrap=True,
            underlying_instrument_id=underlying.id,
            wrap_rate=Decimal("7.0000"),
            wrap_payment=Decimal("1400.00"),
        )
        db.commit()

        fetched = db.query(FinancingInstrument).filter_by(id=wrap.id).one()
        assert fetched.underlying_instrument_id == underlying.id
        assert fetched.underlying_instrument.name == "Underlying Mortgage"


# ---------------------------------------------------------------------------
# Obligation auto-generation
# ---------------------------------------------------------------------------

class TestObligationAutoGeneration:
    def test_monthly_payment_obligation(self, db, test_user):
        prop = _make_property(db, test_user.id)
        inst = _make_instrument(db, test_user.id, prop.id)
        db.commit()

        obligations = generate_obligations(inst)
        monthly = [o for o in obligations if o.obligation_type == "monthly_payment"]
        assert len(monthly) == 1
        assert monthly[0].recurrence == "monthly"
        assert monthly[0].amount == inst.monthly_payment
        assert monthly[0].severity == "normal"
        assert monthly[0].alert_days_before == [7, 1]

    def test_balloon_obligation(self, db, test_user):
        prop = _make_property(db, test_user.id)
        inst = _make_instrument(
            db, test_user.id, prop.id,
            has_balloon=True,
            balloon_date=date(2029, 1, 1),
            balloon_amount=Decimal("150000.00"),
        )
        db.commit()

        obligations = generate_obligations(inst)
        balloon = [o for o in obligations if o.obligation_type == "balloon_payment"]
        assert len(balloon) == 1
        assert balloon[0].severity == "critical"
        assert balloon[0].due_date == date(2029, 1, 1)
        assert balloon[0].amount == Decimal("150000.00")
        assert balloon[0].recurrence == "one_time"
        assert "BALLOON" in balloon[0].title

    def test_balloon_alert_days(self, db, test_user):
        prop = _make_property(db, test_user.id)
        inst = _make_instrument(
            db, test_user.id, prop.id,
            has_balloon=True,
            balloon_date=date(2029, 6, 15),
            balloon_amount=Decimal("100000.00"),
        )
        db.commit()

        obligations = generate_obligations(inst)
        balloon = [o for o in obligations if o.obligation_type == "balloon_payment"][0]
        assert balloon.alert_days_before == [180, 90, 60, 30, 14, 7, 3, 1]

    def test_insurance_renewal(self, db, test_user):
        prop = _make_property(db, test_user.id)
        inst = _make_instrument(db, test_user.id, prop.id, requires_insurance=True)
        db.commit()

        obligations = generate_obligations(inst)
        insurance = [o for o in obligations if o.obligation_type == "insurance_renewal"]
        assert len(insurance) == 1
        assert insurance[0].recurrence == "annually"
        assert insurance[0].severity == "high"

    def test_lease_option_expiration(self, db, test_user):
        prop = _make_property(db, test_user.id)
        inst = _make_instrument(
            db, test_user.id, prop.id,
            instrument_type="lease_option",
            option_expiration=date(2027, 6, 1),
            strike_price=Decimal("250000.00"),
            monthly_payment=None,  # lease options may not have a monthly_payment
            requires_insurance=False,
        )
        db.commit()

        obligations = generate_obligations(inst)
        option = [o for o in obligations if o.obligation_type == "option_expiration"]
        assert len(option) == 1
        assert option[0].severity == "critical"
        assert option[0].due_date == date(2027, 6, 1)
        assert option[0].amount == Decimal("250000.00")

    def test_arm_rate_adjustment(self, db, test_user):
        prop = _make_property(db, test_user.id)
        inst = _make_instrument(
            db, test_user.id, prop.id,
            rate_type="adjustable",
        )
        db.commit()

        obligations = generate_obligations(inst)
        adj = [o for o in obligations if o.obligation_type == "rate_adjustment"]
        assert len(adj) == 1
        assert adj[0].recurrence == "annually"
        assert adj[0].severity == "high"

    def test_no_monthly_when_no_payment(self, db, test_user):
        prop = _make_property(db, test_user.id)
        inst = _make_instrument(
            db, test_user.id, prop.id,
            monthly_payment=None,
            requires_insurance=False,
        )
        db.commit()

        obligations = generate_obligations(inst)
        monthly = [o for o in obligations if o.obligation_type == "monthly_payment"]
        assert len(monthly) == 0


# ---------------------------------------------------------------------------
# Payment model
# ---------------------------------------------------------------------------

class TestPaymentModel:
    def test_record_payment_with_split(self, db, test_user):
        prop = _make_property(db, test_user.id)
        inst = _make_instrument(db, test_user.id, prop.id)
        db.commit()

        payment = Payment(
            id=uuid.uuid4(),
            instrument_id=inst.id,
            property_id=prop.id,
            created_by=test_user.id,
            payment_type="regular",
            amount=Decimal("1013.37"),
            principal_portion=Decimal("280.00"),
            interest_portion=Decimal("733.37"),
            payment_date=date(2024, 3, 1),
            due_date=date(2024, 3, 1),
            direction="outgoing",
        )
        db.add(payment)
        db.commit()

        fetched = db.query(Payment).filter_by(id=payment.id).one()
        assert fetched.amount == Decimal("1013.37")
        assert fetched.principal_portion == Decimal("280.00")
        assert fetched.interest_portion == Decimal("733.37")
        assert fetched.direction == "outgoing"
        assert fetched.instrument_id == inst.id

    def test_incoming_payment(self, db, test_user):
        prop = _make_property(db, test_user.id)
        inst = _make_instrument(db, test_user.id, prop.id, instrument_type="wrap_mortgage", is_wrap=True)
        db.commit()

        payment = Payment(
            id=uuid.uuid4(),
            instrument_id=inst.id,
            property_id=prop.id,
            created_by=test_user.id,
            payment_type="regular",
            amount=Decimal("1400.00"),
            payment_date=date(2024, 3, 1),
            direction="incoming",
        )
        db.add(payment)
        db.commit()

        fetched = db.query(Payment).filter_by(id=payment.id).one()
        assert fetched.direction == "incoming"

    def test_late_payment(self, db, test_user):
        prop = _make_property(db, test_user.id)
        inst = _make_instrument(db, test_user.id, prop.id)
        db.commit()

        payment = Payment(
            id=uuid.uuid4(),
            instrument_id=inst.id,
            property_id=prop.id,
            created_by=test_user.id,
            payment_type="regular",
            amount=Decimal("1013.37"),
            payment_date=date(2024, 3, 15),
            due_date=date(2024, 3, 1),
            is_late=True,
            late_fee_amount=Decimal("50.00"),
            direction="outgoing",
        )
        db.add(payment)
        db.commit()

        fetched = db.query(Payment).filter_by(id=payment.id).one()
        assert fetched.is_late is True
        assert fetched.late_fee_amount == Decimal("50.00")


# ---------------------------------------------------------------------------
# Wrap spread calculator
# ---------------------------------------------------------------------------

class TestWrapSpreadCalculator:
    def test_basic_spread(self):
        class MockInstrument:
            def __init__(self, **kwargs):
                for k, v in kwargs.items():
                    setattr(self, k, v)

        wrap = MockInstrument(wrap_payment=Decimal("1400"), wrap_rate=Decimal("7.0000"))
        underlying = MockInstrument(monthly_payment=Decimal("900"), interest_rate=Decimal("3.5000"))

        result = calculate_wrap_spread(wrap, underlying)
        assert result["monthly_incoming"] == 1400.0
        assert result["monthly_outgoing"] == 900.0
        assert result["monthly_spread"] == 500.0
        assert result["annual_spread"] == 6000.0
        assert result["spread_margin_pct"] == pytest.approx(35.71, abs=0.01)
        assert result["underlying_rate"] == 3.5
        assert result["wrap_rate"] == 7.0
        assert result["rate_spread"] == pytest.approx(3.5, abs=0.0001)

    def test_zero_incoming(self):
        class MockInstrument:
            def __init__(self, **kwargs):
                for k, v in kwargs.items():
                    setattr(self, k, v)

        wrap = MockInstrument(wrap_payment=Decimal("0"), wrap_rate=Decimal("0"))
        underlying = MockInstrument(monthly_payment=Decimal("900"), interest_rate=Decimal("3.5"))

        result = calculate_wrap_spread(wrap, underlying)
        assert result["spread_margin_pct"] == 0
        assert result["monthly_spread"] == -900.0

    def test_none_values(self):
        class MockInstrument:
            def __init__(self, **kwargs):
                for k, v in kwargs.items():
                    setattr(self, k, v)

        wrap = MockInstrument(wrap_payment=None, wrap_rate=None)
        underlying = MockInstrument(monthly_payment=None, interest_rate=None)

        result = calculate_wrap_spread(wrap, underlying)
        assert result["monthly_spread"] == 0.0
        assert result["annual_spread"] == 0.0


# ---------------------------------------------------------------------------
# _add_months helper
# ---------------------------------------------------------------------------

class TestAddMonths:
    def test_basic(self):
        assert _add_months(date(2024, 1, 15), 1) == date(2024, 2, 15)

    def test_year_rollover(self):
        assert _add_months(date(2024, 11, 15), 3) == date(2025, 2, 15)

    def test_day_clamping(self):
        # Jan 31 + 1 month → Feb 29 (2024 is a leap year)
        assert _add_months(date(2024, 1, 31), 1) == date(2024, 2, 29)
        # Jan 31 + 1 month in non-leap year → Feb 28
        assert _add_months(date(2025, 1, 31), 1) == date(2025, 2, 28)
