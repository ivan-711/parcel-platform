"""Tests for Stripe webhook handler — serialization, idempotency, signature validation."""

import json
import uuid
from unittest.mock import patch, MagicMock

import stripe
import pytest

from models.webhook_events import WebhookEvent
from models.subscriptions import Subscription


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_stripe_event(user_id: str, event_id: str = "evt_test_001"):
    """Build a stripe.Event StripeObject mimicking checkout.session.completed.

    This returns a real StripeObject (not a plain dict), which is what
    stripe.Webhook.construct_event() returns in production.  The bug was
    that storing event["data"] (a StripeObject) in a JSONB column caused
    json.dumps() to raise TypeError.
    """
    return stripe.Event.construct_from(
        {
            "id": event_id,
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "id": "cs_test_session_001",
                    "object": "checkout.session",
                    "client_reference_id": str(user_id),
                    "customer": "cus_test_001",
                    "subscription": "sub_test_001",
                    "mode": "subscription",
                    "payment_status": "paid",
                    "status": "complete",
                },
            },
        },
        "sk_test_fake",
    )


def _make_stripe_subscription():
    """Build a mock Subscription object for retrieve mock.

    Uses MagicMock instead of construct_from because StripeObject in SDK v15
    doesn't support .get() on nested attributes like metadata.
    """
    sub = MagicMock()
    sub.id = "sub_test_001"
    sub.customer = "cus_test_001"
    sub.status = "active"
    sub.metadata = {"parcel_plan": "pro"}
    sub.current_period_start = 1713456000
    sub.current_period_end = 1716048000
    sub.trial_start = None
    sub.trial_end = None
    sub.items = MagicMock()
    sub.items.data = [MagicMock(price=MagicMock(id="price_test_carbon_monthly"))]
    return sub


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestStripeWebhook:
    """Stripe webhook endpoint tests."""

    @patch("routers.webhooks._advisory_lock")
    @patch("routers.webhooks.stripe.Subscription.retrieve")
    @patch("routers.webhooks.stripe.Webhook.construct_event")
    @patch("routers.webhooks.get_stripe_settings")
    def test_checkout_webhook_stores_event(
        self, mock_settings, mock_construct, mock_sub_retrieve, mock_lock,
        client, test_user, db,
    ):
        """Webhook stores event payload as a plain dict (not StripeObject)."""
        # Arrange
        test_user.plan_tier = "free"
        test_user.stripe_customer_id = "cus_test_001"
        db.commit()

        settings = MagicMock()
        settings.is_configured = True
        settings.STRIPE_WEBHOOK_SECRET = "whsec_test"
        mock_settings.return_value = settings

        event = _make_stripe_event(test_user.id)
        mock_construct.return_value = event
        mock_sub_retrieve.return_value = _make_stripe_subscription()

        # Act
        resp = client.post(
            "/webhooks/stripe",
            content=b'{}',
            headers={"stripe-signature": "t=1,v1=sig"},
        )

        # Assert — no 500
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

        # Assert — webhook_events row written with dict payload
        row = db.query(WebhookEvent).filter(
            WebhookEvent.stripe_event_id == "evt_test_001"
        ).first()
        assert row is not None, "webhook_events row not created"
        assert row.processed is True
        assert isinstance(row.payload, dict), (
            f"payload should be dict, got {type(row.payload).__name__}"
        )

        # Assert — user plan_tier updated
        db.refresh(test_user)
        assert test_user.plan_tier == "pro"

        # Assert — subscription row created
        sub = db.query(Subscription).filter(
            Subscription.user_id == test_user.id
        ).first()
        assert sub is not None
        assert sub.stripe_subscription_id == "sub_test_001"
        assert sub.status == "active"

    @patch("routers.webhooks.stripe.Webhook.construct_event")
    @patch("routers.webhooks.get_stripe_settings")
    def test_webhook_invalid_signature(
        self, mock_settings, mock_construct, client,
    ):
        """Invalid signature returns 400."""
        settings = MagicMock()
        settings.is_configured = True
        settings.STRIPE_WEBHOOK_SECRET = "whsec_test"
        mock_settings.return_value = settings

        mock_construct.side_effect = stripe.error.SignatureVerificationError(
            "bad sig", "sig_header"
        )

        resp = client.post(
            "/webhooks/stripe",
            content=b'{}',
            headers={"stripe-signature": "t=1,v1=bad"},
        )
        assert resp.status_code == 400
        assert resp.json()["code"] == "INVALID_SIGNATURE"

    @patch("routers.webhooks._advisory_lock")
    @patch("routers.webhooks.stripe.Subscription.retrieve")
    @patch("routers.webhooks.stripe.Webhook.construct_event")
    @patch("routers.webhooks.get_stripe_settings")
    def test_webhook_idempotency(
        self, mock_settings, mock_construct, mock_sub_retrieve, mock_lock,
        client, test_user, db,
    ):
        """Same event posted twice — second call returns 200, no re-processing."""
        test_user.plan_tier = "free"
        test_user.stripe_customer_id = "cus_test_001"
        db.commit()

        settings = MagicMock()
        settings.is_configured = True
        settings.STRIPE_WEBHOOK_SECRET = "whsec_test"
        mock_settings.return_value = settings

        event = _make_stripe_event(test_user.id, event_id="evt_idem_001")
        mock_construct.return_value = event
        mock_sub_retrieve.return_value = _make_stripe_subscription()

        # First call
        resp1 = client.post(
            "/webhooks/stripe",
            content=b'{}',
            headers={"stripe-signature": "t=1,v1=sig"},
        )
        assert resp1.status_code == 200

        # Second call — same event
        resp2 = client.post(
            "/webhooks/stripe",
            content=b'{}',
            headers={"stripe-signature": "t=1,v1=sig"},
        )
        assert resp2.status_code == 200

        # Only one row in webhook_events
        count = db.query(WebhookEvent).filter(
            WebhookEvent.stripe_event_id == "evt_idem_001"
        ).count()
        assert count == 1
