"""Tests for Stripe webhook handler — serialization, idempotency, signature validation.

Covers all four dispatch handlers:
  - checkout.session.completed
  - customer.subscription.updated
  - customer.subscription.deleted
  - invoice.payment_failed

Uses real StripeObjects (via construct_from) to catch SDK v15 attribute-
access bugs: missing-field access raises AttributeError, .get() is not
available on StripeObject.
"""

import uuid
from datetime import datetime
from unittest.mock import patch, MagicMock

import stripe
import pytest

from models.webhook_events import WebhookEvent
from models.subscriptions import Subscription


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_settings_mock():
    """Standard settings mock reused across tests."""
    settings = MagicMock()
    settings.is_configured = True
    settings.STRIPE_WEBHOOK_SECRET = "whsec_test"
    settings.price_to_plan_map = {"price_test_carbon_monthly": "pro"}
    return settings


def _make_stripe_event(event_type: str, obj_data: dict, event_id: str = "evt_test_001"):
    """Build a stripe.Event StripeObject for any event type.

    Returns a real StripeObject (not a plain dict), which is what
    stripe.Webhook.construct_event() returns in production.
    """
    return stripe.Event.construct_from(
        {
            "id": event_id,
            "type": event_type,
            "data": {"object": obj_data},
        },
        "sk_test_fake",
    )


def _make_checkout_event(user_id: str, event_id: str = "evt_test_001"):
    """Checkout session completed event."""
    return _make_stripe_event(
        "checkout.session.completed",
        {
            "id": "cs_test_session_001",
            "object": "checkout.session",
            "client_reference_id": str(user_id),
            "customer": "cus_test_001",
            "subscription": "sub_test_001",
            "mode": "subscription",
            "payment_status": "paid",
            "status": "complete",
        },
        event_id,
    )


def _make_stripe_subscription(**overrides):
    """Build a real StripeObject for Subscription.retrieve mock.

    Uses construct_from to produce a real StripeObject (not a plain dict
    or MagicMock).  The handler calls .to_dict() on this at the boundary,
    then operates on plain dicts downstream.
    """
    data = {
        "id": "sub_test_001",
        "object": "subscription",
        "customer": "cus_test_001",
        "status": "active",
        "metadata": {"parcel_plan": "pro"},
        "current_period_start": 1713456000,
        "current_period_end": 1716048000,
        "trial_start": None,
        "trial_end": None,
        "cancel_at_period_end": False,
        "canceled_at": None,
        "ended_at": None,
        "items": {
            "data": [
                {
                    "price": {
                        "id": "price_test_carbon_monthly",
                    },
                },
            ],
        },
    }
    data.update(overrides)
    return stripe.Subscription.construct_from(data, "sk_test_fake")


def _post_webhook(client):
    """Fire a webhook POST with dummy payload and signature."""
    return client.post(
        "/webhooks/stripe",
        content=b'{}',
        headers={"stripe-signature": "t=1,v1=sig"},
    )


def _create_subscription(db, user, **overrides):
    """Insert a Subscription row for tests that need a pre-existing one."""
    defaults = dict(
        user_id=user.id,
        stripe_subscription_id="sub_test_001",
        stripe_customer_id="cus_test_001",
        status="active",
        plan_tier="pro",
        current_period_start=datetime(2024, 4, 18),
        current_period_end=datetime(2024, 5, 18),
    )
    defaults.update(overrides)
    sub = Subscription(**defaults)
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


# ---------------------------------------------------------------------------
# Tests — checkout.session.completed
# ---------------------------------------------------------------------------

class TestCheckoutSessionCompleted:
    """Tests for the checkout.session.completed webhook handler."""

    @patch("routers.webhooks._advisory_lock")
    @patch("routers.webhooks.stripe.Subscription.retrieve")
    @patch("routers.webhooks.stripe.Webhook.construct_event")
    @patch("routers.webhooks.get_stripe_settings")
    def test_stores_event_and_creates_subscription(
        self, mock_settings, mock_construct, mock_sub_retrieve, mock_lock,
        client, test_user, db,
    ):
        """Webhook stores event, creates subscription, updates plan_tier."""
        test_user.plan_tier = "free"
        test_user.stripe_customer_id = "cus_test_001"
        db.commit()

        mock_settings.return_value = _make_settings_mock()
        mock_construct.return_value = _make_checkout_event(test_user.id)
        mock_sub_retrieve.return_value = _make_stripe_subscription()

        resp = _post_webhook(client)

        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

        # webhook_events row
        row = db.query(WebhookEvent).filter(
            WebhookEvent.stripe_event_id == "evt_test_001"
        ).first()
        assert row is not None, "webhook_events row not created"
        assert row.processed is True
        assert row.error is None
        assert isinstance(row.payload, dict)

        # user plan_tier
        db.refresh(test_user)
        assert test_user.plan_tier == "pro"

        # subscription row
        sub = db.query(Subscription).filter(
            Subscription.user_id == test_user.id
        ).first()
        assert sub is not None
        assert sub.stripe_subscription_id == "sub_test_001"
        assert sub.status == "active"
        assert sub.plan_tier == "pro"
        assert sub.current_period_start is not None
        assert sub.current_period_end is not None

    @patch("routers.webhooks._advisory_lock")
    @patch("routers.webhooks.stripe.Subscription.retrieve")
    @patch("routers.webhooks.stripe.Webhook.construct_event")
    @patch("routers.webhooks.get_stripe_settings")
    @pytest.mark.parametrize("missing_field", [
        "current_period_start",
        "current_period_end",
        "trial_start",
        "trial_end",
    ])
    def test_handles_missing_period_fields(
        self, mock_settings, mock_construct, mock_sub_retrieve, mock_lock,
        client, test_user, db, missing_field,
    ):
        """Handler completes gracefully when optional period fields are absent."""
        test_user.plan_tier = "free"
        test_user.stripe_customer_id = "cus_test_001"
        db.commit()

        mock_settings.return_value = _make_settings_mock()

        event_id = f"evt_missing_{missing_field}"
        mock_construct.return_value = _make_checkout_event(test_user.id, event_id=event_id)

        # Build subscription with the field removed entirely (not just None)
        sub_data = {
            "id": "sub_test_001",
            "object": "subscription",
            "customer": "cus_test_001",
            "status": "active",
            "metadata": {"parcel_plan": "pro"},
            "current_period_start": 1713456000,
            "current_period_end": 1716048000,
            "trial_start": None,
            "trial_end": None,
            "cancel_at_period_end": False,
            "canceled_at": None,
            "ended_at": None,
            "items": {"data": [{"price": {"id": "price_test_carbon_monthly"}}]},
        }
        del sub_data[missing_field]
        mock_sub_retrieve.return_value = stripe.Subscription.construct_from(
            sub_data, "sk_test_fake"
        )

        resp = _post_webhook(client)

        assert resp.status_code == 200

        row = db.query(WebhookEvent).filter(
            WebhookEvent.stripe_event_id == event_id
        ).first()
        assert row is not None
        assert row.processed is True
        assert row.error is None


# ---------------------------------------------------------------------------
# Tests — customer.subscription.updated
# ---------------------------------------------------------------------------

class TestSubscriptionUpdated:
    """Tests for the customer.subscription.updated webhook handler."""

    @patch("routers.webhooks._advisory_lock")
    @patch("core.billing.stripe_service.stripe.Subscription.retrieve")
    @patch("routers.webhooks.stripe.Webhook.construct_event")
    @patch("routers.webhooks.get_stripe_settings")
    @patch("core.billing.stripe_service.get_stripe_settings")
    def test_syncs_subscription_state(
        self, mock_svc_settings, mock_settings, mock_construct,
        mock_sub_retrieve, mock_lock,
        client, test_user, db,
    ):
        """Subscription updated event syncs state from Stripe and updates user tier."""
        test_user.plan_tier = "pro"
        test_user.stripe_customer_id = "cus_test_001"
        db.commit()

        _create_subscription(db, test_user)

        mock_settings.return_value = _make_settings_mock()
        mock_svc_settings.return_value = _make_settings_mock()

        # Event data is the subscription object (already a dict via .to_dict()
        # at the webhook endpoint boundary)
        event = _make_stripe_event(
            "customer.subscription.updated",
            {"id": "sub_test_001", "object": "subscription", "status": "active"},
            event_id="evt_sub_updated_001",
        )
        mock_construct.return_value = event

        # sync_subscription_from_stripe will call Subscription.retrieve
        mock_sub_retrieve.return_value = _make_stripe_subscription(
            status="active",
            current_period_start=1716048000,
            current_period_end=1718640000,
        )

        resp = _post_webhook(client)

        assert resp.status_code == 200

        row = db.query(WebhookEvent).filter(
            WebhookEvent.stripe_event_id == "evt_sub_updated_001"
        ).first()
        assert row is not None
        assert row.processed is True
        assert row.error is None

        # Subscription row updated
        sub = db.query(Subscription).filter(
            Subscription.stripe_subscription_id == "sub_test_001"
        ).first()
        assert sub is not None
        assert sub.status == "active"
        assert sub.plan_tier == "pro"

        # User tier stays pro
        db.refresh(test_user)
        assert test_user.plan_tier == "pro"

    @patch("routers.webhooks._advisory_lock")
    @patch("core.billing.stripe_service.stripe.Subscription.retrieve")
    @patch("routers.webhooks.stripe.Webhook.construct_event")
    @patch("routers.webhooks.get_stripe_settings")
    @patch("core.billing.stripe_service.get_stripe_settings")
    def test_downgrades_on_canceled_status(
        self, mock_svc_settings, mock_settings, mock_construct,
        mock_sub_retrieve, mock_lock,
        client, test_user, db,
    ):
        """Subscription updated with canceled status downgrades user to free."""
        test_user.plan_tier = "pro"
        test_user.stripe_customer_id = "cus_test_001"
        db.commit()

        _create_subscription(db, test_user)

        mock_settings.return_value = _make_settings_mock()
        mock_svc_settings.return_value = _make_settings_mock()

        event = _make_stripe_event(
            "customer.subscription.updated",
            {"id": "sub_test_001", "object": "subscription", "status": "canceled"},
            event_id="evt_sub_canceled_001",
        )
        mock_construct.return_value = event

        mock_sub_retrieve.return_value = _make_stripe_subscription(
            status="canceled",
            canceled_at=1716048000,
        )

        resp = _post_webhook(client)

        assert resp.status_code == 200

        row = db.query(WebhookEvent).filter(
            WebhookEvent.stripe_event_id == "evt_sub_canceled_001"
        ).first()
        assert row.processed is True
        assert row.error is None

        db.refresh(test_user)
        assert test_user.plan_tier == "free"


# ---------------------------------------------------------------------------
# Tests — customer.subscription.deleted
# ---------------------------------------------------------------------------

class TestSubscriptionDeleted:
    """Tests for the customer.subscription.deleted webhook handler."""

    @patch("routers.webhooks._advisory_lock")
    @patch("routers.webhooks.stripe.Webhook.construct_event")
    @patch("routers.webhooks.get_stripe_settings")
    def test_marks_canceled_and_downgrades(
        self, mock_settings, mock_construct, mock_lock,
        client, test_user, db,
    ):
        """Subscription deleted marks row as canceled and downgrades user."""
        test_user.plan_tier = "pro"
        test_user.stripe_customer_id = "cus_test_001"
        db.commit()

        _create_subscription(db, test_user)

        mock_settings.return_value = _make_settings_mock()

        event = _make_stripe_event(
            "customer.subscription.deleted",
            {"id": "sub_test_001", "object": "subscription"},
            event_id="evt_sub_deleted_001",
        )
        mock_construct.return_value = event

        resp = _post_webhook(client)

        assert resp.status_code == 200

        row = db.query(WebhookEvent).filter(
            WebhookEvent.stripe_event_id == "evt_sub_deleted_001"
        ).first()
        assert row is not None
        assert row.processed is True
        assert row.error is None

        # Subscription marked canceled with ended_at
        sub = db.query(Subscription).filter(
            Subscription.stripe_subscription_id == "sub_test_001"
        ).first()
        assert sub.status == "canceled"
        assert sub.ended_at is not None

        # User downgraded to free
        db.refresh(test_user)
        assert test_user.plan_tier == "free"


# ---------------------------------------------------------------------------
# Tests — invoice.payment_failed
# ---------------------------------------------------------------------------

class TestInvoicePaymentFailed:
    """Tests for the invoice.payment_failed webhook handler."""

    @patch("routers.webhooks.stripe.Webhook.construct_event")
    @patch("routers.webhooks.get_stripe_settings")
    def test_marks_past_due(
        self, mock_settings, mock_construct,
        client, test_user, db,
    ):
        """Invoice payment failed marks subscription as past_due, does NOT downgrade."""
        test_user.plan_tier = "pro"
        test_user.stripe_customer_id = "cus_test_001"
        db.commit()

        _create_subscription(db, test_user)

        mock_settings.return_value = _make_settings_mock()

        event = _make_stripe_event(
            "invoice.payment_failed",
            {
                "id": "in_test_001",
                "object": "invoice",
                "subscription": "sub_test_001",
                "customer": "cus_test_001",
                "amount_due": 7900,
                "status": "open",
            },
            event_id="evt_inv_failed_001",
        )
        mock_construct.return_value = event

        resp = _post_webhook(client)

        assert resp.status_code == 200

        row = db.query(WebhookEvent).filter(
            WebhookEvent.stripe_event_id == "evt_inv_failed_001"
        ).first()
        assert row is not None
        assert row.processed is True
        assert row.error is None

        # Subscription marked past_due
        sub = db.query(Subscription).filter(
            Subscription.stripe_subscription_id == "sub_test_001"
        ).first()
        assert sub.status == "past_due"

        # User plan_tier NOT downgraded
        db.refresh(test_user)
        assert test_user.plan_tier == "pro"


# ---------------------------------------------------------------------------
# Tests — signature validation & idempotency
# ---------------------------------------------------------------------------

class TestWebhookInfra:
    """Signature validation, idempotency, and unhandled event types."""

    @patch("routers.webhooks.stripe.Webhook.construct_event")
    @patch("routers.webhooks.get_stripe_settings")
    def test_invalid_signature(self, mock_settings, mock_construct, client):
        """Invalid signature returns 400."""
        mock_settings.return_value = _make_settings_mock()
        mock_construct.side_effect = stripe.error.SignatureVerificationError(
            "bad sig", "sig_header"
        )

        resp = _post_webhook(client)

        assert resp.status_code == 400
        assert resp.json()["code"] == "INVALID_SIGNATURE"

    @patch("routers.webhooks._advisory_lock")
    @patch("routers.webhooks.stripe.Subscription.retrieve")
    @patch("routers.webhooks.stripe.Webhook.construct_event")
    @patch("routers.webhooks.get_stripe_settings")
    def test_idempotency(
        self, mock_settings, mock_construct, mock_sub_retrieve, mock_lock,
        client, test_user, db,
    ):
        """Same event posted twice — second call returns 200, no re-processing."""
        test_user.plan_tier = "free"
        test_user.stripe_customer_id = "cus_test_001"
        db.commit()

        mock_settings.return_value = _make_settings_mock()
        mock_construct.return_value = _make_checkout_event(
            test_user.id, event_id="evt_idem_001"
        )
        mock_sub_retrieve.return_value = _make_stripe_subscription()

        resp1 = _post_webhook(client)
        assert resp1.status_code == 200

        resp2 = _post_webhook(client)
        assert resp2.status_code == 200

        count = db.query(WebhookEvent).filter(
            WebhookEvent.stripe_event_id == "evt_idem_001"
        ).count()
        assert count == 1
