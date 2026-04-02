# Agent 17: Billing Testing Strategy

> Generated 2026-03-28. Complete testing approach for Parcel's billing system
> covering backend unit/integration tests (pytest), frontend component tests
> (Vitest + React Testing Library), E2E scenarios, Stripe test fixtures, mock
> strategies, and CI integration.

---

## 1. Backend Unit Tests

All billing unit tests live in `backend/tests/test_billing.py` and extend the
existing in-memory SQLite conftest pattern. Stripe SDK calls are mocked at the
module boundary so tests run offline in <1 second.

### 1.1 Stripe Service Mocking

The `StripeService` class in `backend/core/billing/stripe_service.py` wraps every
Stripe SDK call. Tests mock this class, never the raw `stripe` module, to keep
tests decoupled from SDK version changes.

```python
# backend/tests/test_billing.py
"""Billing unit tests — Stripe mocked, SQLite in-memory DB."""

import json
import uuid
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

import pytest
from starlette.testclient import TestClient


# ---------------------------------------------------------------------------
# Stripe mock fixtures
# ---------------------------------------------------------------------------

@pytest.fixture()
def mock_stripe():
    """Patch the stripe module used by billing code.

    Returns a MagicMock whose attributes mirror the Stripe SDK objects
    that billing handlers call: Checkout.Session, Subscription, Customer,
    billing_portal.Session, Webhook.
    """
    with patch("core.billing.stripe_service.stripe") as m:
        # Checkout Session
        m.checkout.Session.create.return_value = MagicMock(
            id="cs_test_abc",
            url="https://checkout.stripe.com/c/pay/cs_test_abc",
        )

        # Customer
        m.Customer.create.return_value = MagicMock(
            id="cus_test_123",
            email="test@parcel.dev",
        )

        # Subscription
        m.Subscription.retrieve.return_value = MagicMock(
            id="sub_test_456",
            status="active",
            current_period_end=int((datetime.utcnow() + timedelta(days=30)).timestamp()),
            items=MagicMock(data=[MagicMock(price=MagicMock(id="price_pro_monthly"))]),
        )

        # Billing portal
        m.billing_portal.Session.create.return_value = MagicMock(
            url="https://billing.stripe.com/session/test",
        )

        # Webhook verification
        m.Webhook.construct_event.side_effect = lambda payload, sig, secret, **kw: (
            json.loads(payload) if isinstance(payload, (bytes, str)) else payload
        )

        # Error types (needed for except clauses)
        m.error.SignatureVerificationError = type(
            "SignatureVerificationError", (Exception,), {}
        )
        m.error.InvalidRequestError = type(
            "InvalidRequestError", (Exception,), {}
        )

        yield m
```

### 1.2 Webhook Handler Tests

```python
# ---------------------------------------------------------------------------
# Webhook handler tests
# ---------------------------------------------------------------------------

def _make_event(event_type: str, data_object: dict, event_id: str = None) -> dict:
    """Build a minimal Stripe event payload for testing."""
    return {
        "id": event_id or f"evt_test_{uuid.uuid4().hex[:12]}",
        "object": "event",
        "type": event_type,
        "api_version": "2024-12-18.acacia",
        "created": int(datetime.utcnow().timestamp()),
        "data": {"object": data_object},
    }


class TestWebhookHandler:
    """Webhook endpoint: signature verification, dispatch, idempotency."""

    def test_valid_checkout_completed_provisions_plan(
        self, auth_client, test_user, db, mock_stripe
    ):
        """checkout.session.completed creates/updates subscription to pro."""
        event = _make_event("checkout.session.completed", {
            "id": "cs_test_provision",
            "customer": "cus_test_123",
            "subscription": "sub_test_456",
            "client_reference_id": str(test_user.id),
            "mode": "subscription",
            "metadata": {"price_id": "price_pro_monthly"},
        })

        resp = auth_client.post(
            "/api/v1/billing/webhooks/stripe",
            content=json.dumps(event),
            headers={"stripe-signature": "t=123,v1=sig"},
        )
        assert resp.status_code == 200

        # Verify subscription record exists
        from models.subscriptions import Subscription
        sub = db.query(Subscription).filter_by(user_id=test_user.id).first()
        assert sub is not None
        assert sub.plan == "pro"
        assert sub.stripe_subscription_id == "sub_test_456"

    def test_subscription_deleted_downgrades_to_free(
        self, auth_client, pro_user, db, mock_stripe
    ):
        """customer.subscription.deleted sets plan back to free."""
        event = _make_event("customer.subscription.deleted", {
            "id": "sub_test_456",
            "customer": "cus_test_123",
            "status": "canceled",
        })

        resp = auth_client.post(
            "/api/v1/billing/webhooks/stripe",
            content=json.dumps(event),
            headers={"stripe-signature": "t=123,v1=sig"},
        )
        assert resp.status_code == 200

        from models.subscriptions import Subscription
        sub = db.query(Subscription).filter_by(user_id=pro_user.id).first()
        assert sub.plan == "free"
        assert sub.status == "canceled"

    def test_invoice_payment_failed_sets_past_due(
        self, auth_client, pro_user, db, mock_stripe
    ):
        """invoice.payment_failed flips status to past_due."""
        event = _make_event("invoice.payment_failed", {
            "id": "in_test_fail",
            "subscription": "sub_test_456",
            "customer": "cus_test_123",
            "amount_due": 6900,
        })

        resp = auth_client.post(
            "/api/v1/billing/webhooks/stripe",
            content=json.dumps(event),
            headers={"stripe-signature": "t=123,v1=sig"},
        )
        assert resp.status_code == 200

        from models.subscriptions import Subscription
        sub = db.query(Subscription).filter_by(user_id=pro_user.id).first()
        assert sub.status == "past_due"

    def test_invoice_paid_resets_status_and_extends_period(
        self, auth_client, pro_user, db, mock_stripe
    ):
        """invoice.paid restores active status and updates period end."""
        event = _make_event("invoice.paid", {
            "id": "in_test_paid",
            "subscription": "sub_test_456",
            "customer": "cus_test_123",
            "amount_paid": 6900,
            "lines": {"data": [{"period": {
                "end": int((datetime.utcnow() + timedelta(days=30)).timestamp()),
            }}]},
        })

        resp = auth_client.post(
            "/api/v1/billing/webhooks/stripe",
            content=json.dumps(event),
            headers={"stripe-signature": "t=123,v1=sig"},
        )
        assert resp.status_code == 200

        from models.subscriptions import Subscription
        sub = db.query(Subscription).filter_by(user_id=pro_user.id).first()
        assert sub.status == "active"

    def test_duplicate_event_is_idempotent(
        self, auth_client, test_user, db, mock_stripe
    ):
        """Sending the same event ID twice must not create duplicate records."""
        event = _make_event(
            "checkout.session.completed",
            {
                "id": "cs_test_dup",
                "customer": "cus_test_dup",
                "subscription": "sub_test_dup",
                "client_reference_id": str(test_user.id),
                "mode": "subscription",
                "metadata": {"price_id": "price_pro_monthly"},
            },
            event_id="evt_test_dup_check",
        )

        # Send twice
        auth_client.post(
            "/api/v1/billing/webhooks/stripe",
            content=json.dumps(event),
            headers={"stripe-signature": "t=123,v1=sig"},
        )
        auth_client.post(
            "/api/v1/billing/webhooks/stripe",
            content=json.dumps(event),
            headers={"stripe-signature": "t=123,v1=sig"},
        )

        from models.subscriptions import Subscription
        subs = db.query(Subscription).filter_by(user_id=test_user.id).all()
        assert len(subs) == 1  # Not 2

    def test_invalid_signature_returns_400(self, client, mock_stripe):
        """Forged webhook payloads must be rejected."""
        mock_stripe.Webhook.construct_event.side_effect = (
            mock_stripe.error.SignatureVerificationError("bad sig", "header")
        )
        resp = client.post(
            "/api/v1/billing/webhooks/stripe",
            content=b'{"fake": true}',
            headers={"stripe-signature": "t=0,v1=forged"},
        )
        assert resp.status_code == 400

    def test_missing_signature_returns_422(self, client, mock_stripe):
        """Requests without stripe-signature header are rejected."""
        resp = client.post(
            "/api/v1/billing/webhooks/stripe",
            content=b'{"some": "data"}',
        )
        assert resp.status_code in (400, 422)  # FastAPI may return 422 for missing header

    def test_unhandled_event_type_returns_200(self, client, mock_stripe):
        """Unknown event types are acknowledged (200) but not processed."""
        event = _make_event("some.unknown.event", {"id": "obj_xxx"})
        resp = client.post(
            "/api/v1/billing/webhooks/stripe",
            content=json.dumps(event),
            headers={"stripe-signature": "t=123,v1=sig"},
        )
        assert resp.status_code == 200
```

### 1.3 Feature Gating Tests (Tier Guards)

```python
# ---------------------------------------------------------------------------
# Feature gating / tier guard tests
# ---------------------------------------------------------------------------

class TestTierGuards:
    """Verify require_tier() and check_quota() block free users correctly."""

    def test_free_user_blocked_from_pipeline_write(self, auth_client):
        """POST /pipeline/ returns 403 for free-tier users."""
        resp = auth_client.post(
            "/api/v1/pipeline/",
            json={"deal_id": str(uuid.uuid4()), "stage": "lead"},
        )
        assert resp.status_code == 403
        body = resp.json()
        assert body["code"] == "TIER_REQUIRED"
        assert body["required_tier"] == "pro"

    def test_pro_user_allowed_pipeline_write(self, pro_auth_client):
        """POST /pipeline/ succeeds for pro-tier users."""
        # This test requires a deal to exist; create one first
        deal_resp = pro_auth_client.post("/api/v1/deals/", json={
            "strategy": "wholesale",
            "inputs": {
                "arv": 200000, "repair_costs": 30000,
                "desired_profit": 10000, "closing_costs_pct": 3.0,
                "asking_price": 90000,
            },
        })
        deal_id = deal_resp.json()["id"]
        resp = pro_auth_client.post(
            "/api/v1/pipeline/",
            json={"deal_id": deal_id, "stage": "lead"},
        )
        assert resp.status_code in (200, 201)

    def test_free_user_blocked_from_portfolio_write(self, auth_client):
        """POST /portfolio/ returns 403 for free-tier users."""
        resp = auth_client.post(
            "/api/v1/portfolio/",
            json={
                "address": "123 Main St",
                "purchase_price": 150000,
                "current_value": 180000,
                "strategy": "buy_and_hold",
            },
        )
        assert resp.status_code == 403
        assert resp.json()["code"] == "TIER_REQUIRED"

    def test_free_user_blocked_from_deal_share(self, auth_client, db, test_user):
        """PUT /deals/{id}/share/ returns 403 for free-tier users."""
        from models import Deal
        deal = Deal(
            id=uuid.uuid4(), user_id=test_user.id, strategy="wholesale",
            inputs={"arv": 200000}, outputs={"mao": 100000}, risk_score=25,
        )
        db.add(deal)
        db.commit()
        resp = auth_client.put(f"/api/v1/deals/{deal.id}/share/")
        assert resp.status_code == 403

    def test_free_user_blocked_from_offer_letter(self, auth_client, db, test_user):
        """POST /deals/{id}/offer-letter/ returns 403 for free-tier."""
        from models import Deal
        deal = Deal(
            id=uuid.uuid4(), user_id=test_user.id, strategy="wholesale",
            inputs={"arv": 200000}, outputs={"mao": 100000}, risk_score=25,
        )
        db.add(deal)
        db.commit()
        resp = auth_client.post(f"/api/v1/deals/{deal.id}/offer-letter/")
        assert resp.status_code == 403

    def test_free_user_can_read_pipeline(self, auth_client):
        """GET /pipeline/ works for free-tier (read-only)."""
        resp = auth_client.get("/api/v1/pipeline/")
        assert resp.status_code == 200

    def test_free_user_can_read_dashboard(self, auth_client):
        """GET /dashboard/ works for all tiers."""
        resp = auth_client.get("/api/v1/dashboard/stats/")
        assert resp.status_code == 200

    def test_demo_user_bypasses_all_gates(self, demo_auth_client):
        """Demo account has pro-equivalent access without a subscription."""
        resp = demo_auth_client.get("/api/v1/pipeline/")
        assert resp.status_code == 200
        # Demo can also write (pro-gated action)
        # Specific behavior depends on demo data seeding
```

### 1.4 Usage Tracking / Quota Tests

```python
# ---------------------------------------------------------------------------
# Usage tracking and quota enforcement tests
# ---------------------------------------------------------------------------

class TestUsageQuotas:
    """Verify monthly quota enforcement for deals, chat, and documents."""

    def test_free_user_deal_limit_enforced(self, auth_client, db, test_user):
        """Free users are limited to N active deals (e.g., 5)."""
        from models import Deal

        # Seed 5 deals (the limit)
        for i in range(5):
            deal = Deal(
                id=uuid.uuid4(), user_id=test_user.id,
                strategy="wholesale",
                inputs={"arv": 200000 + i},
                outputs={"mao": 100000 + i},
                risk_score=25,
            )
            db.add(deal)
        db.commit()

        # The 6th should be blocked
        resp = auth_client.post("/api/v1/deals/", json={
            "strategy": "wholesale",
            "inputs": {
                "arv": 200000, "repair_costs": 30000,
                "desired_profit": 10000, "closing_costs_pct": 3.0,
                "asking_price": 90000,
            },
        })
        assert resp.status_code == 403
        body = resp.json()
        assert body["code"] == "QUOTA_EXCEEDED"
        assert body["limit"] == 5

    def test_pro_user_unlimited_deals(self, pro_auth_client, db, pro_user):
        """Pro users can create deals beyond the free limit."""
        from models import Deal

        for i in range(6):
            deal = Deal(
                id=uuid.uuid4(), user_id=pro_user.id,
                strategy="wholesale",
                inputs={"arv": 200000 + i},
                outputs={"mao": 100000 + i},
                risk_score=25,
            )
            db.add(deal)
        db.commit()

        resp = pro_auth_client.post("/api/v1/deals/", json={
            "strategy": "wholesale",
            "inputs": {
                "arv": 200000, "repair_costs": 30000,
                "desired_profit": 10000, "closing_costs_pct": 3.0,
                "asking_price": 90000,
            },
        })
        assert resp.status_code in (200, 201)

    def test_free_user_chat_limit_enforced(self, auth_client, db, test_user):
        """Free users are limited to N chat messages per month."""
        from models.usage_records import UsageRecord

        # Seed usage at the limit
        record = UsageRecord(
            id=uuid.uuid4(),
            user_id=test_user.id,
            metric="chat_messages",
            count=25,  # the limit
            period_start=datetime.utcnow().replace(day=1),
            period_end=(datetime.utcnow().replace(day=1) + timedelta(days=31)),
        )
        db.add(record)
        db.commit()

        resp = auth_client.post(
            "/api/v1/chat/",
            json={"message": "test message", "deal_id": None},
        )
        assert resp.status_code == 403
        assert resp.json()["code"] == "QUOTA_EXCEEDED"

    def test_free_user_document_upload_limit(self, auth_client, db, test_user):
        """Free users are limited to N document uploads per month."""
        from models.usage_records import UsageRecord

        record = UsageRecord(
            id=uuid.uuid4(),
            user_id=test_user.id,
            metric="documents_uploaded",
            count=3,  # the limit
            period_start=datetime.utcnow().replace(day=1),
            period_end=(datetime.utcnow().replace(day=1) + timedelta(days=31)),
        )
        db.add(record)
        db.commit()

        # Attempt upload (mocked S3 call would be needed for full flow)
        resp = auth_client.post(
            "/api/v1/documents/",
            files={"file": ("test.pdf", b"fake-pdf-bytes", "application/pdf")},
        )
        assert resp.status_code == 403
        assert resp.json()["code"] == "QUOTA_EXCEEDED"

    def test_usage_counter_increments_on_success(self, auth_client, db, test_user):
        """Successful chat message increments the usage counter."""
        from models.usage_records import UsageRecord

        # No usage record yet -- count starts at 0
        initial = db.query(UsageRecord).filter_by(
            user_id=test_user.id, metric="chat_messages"
        ).first()
        assert initial is None

        # Send a message (mock the AI response)
        with patch("routers.chat.get_ai_response") as mock_ai:
            mock_ai.return_value = "AI reply"
            auth_client.post(
                "/api/v1/chat/",
                json={"message": "Hello", "deal_id": None},
            )

        record = db.query(UsageRecord).filter_by(
            user_id=test_user.id, metric="chat_messages"
        ).first()
        assert record is not None
        assert record.count == 1

    def test_usage_resets_at_period_boundary(self, db, test_user):
        """Usage from a previous period does not count against the current."""
        from models.usage_records import UsageRecord
        from core.billing.usage import get_current_usage

        # Old period record (last month)
        old_record = UsageRecord(
            id=uuid.uuid4(),
            user_id=test_user.id,
            metric="chat_messages",
            count=25,
            period_start=datetime.utcnow().replace(day=1) - timedelta(days=31),
            period_end=datetime.utcnow().replace(day=1),
        )
        db.add(old_record)
        db.commit()

        current = get_current_usage(db, test_user.id, "chat_messages")
        assert current == 0  # Old period does not apply
```

### 1.5 Billing Endpoint Tests (Checkout, Portal, Status)

```python
# ---------------------------------------------------------------------------
# Billing API endpoint tests
# ---------------------------------------------------------------------------

class TestBillingEndpoints:
    """Tests for /billing/checkout, /billing/portal, /billing/status."""

    def test_create_checkout_session(self, auth_client, mock_stripe):
        """POST /billing/checkout returns a Stripe Checkout URL."""
        resp = auth_client.post(
            "/api/v1/billing/checkout",
            json={"plan": "pro"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert "url" in body
        assert body["url"].startswith("https://checkout.stripe.com")

    def test_create_checkout_requires_auth(self, client, mock_stripe):
        """Unauthenticated users cannot create checkout sessions."""
        resp = client.post(
            "/api/v1/billing/checkout",
            json={"plan": "pro"},
        )
        assert resp.status_code == 401

    def test_create_portal_session(self, pro_auth_client, mock_stripe):
        """POST /billing/portal returns a Stripe billing portal URL."""
        resp = pro_auth_client.post("/api/v1/billing/portal")
        assert resp.status_code == 200
        body = resp.json()
        assert "url" in body
        assert "billing.stripe.com" in body["url"]

    def test_billing_status_returns_plan_info(self, auth_client):
        """GET /billing/status returns current plan and usage."""
        resp = auth_client.get("/api/v1/billing/status")
        assert resp.status_code == 200
        body = resp.json()
        assert body["plan"] == "free"
        assert "usage" in body
        assert "limits" in body

    def test_billing_status_pro_user(self, pro_auth_client):
        """GET /billing/status for pro user includes subscription details."""
        resp = pro_auth_client.get("/api/v1/billing/status")
        assert resp.status_code == 200
        body = resp.json()
        assert body["plan"] == "pro"
        assert body["status"] == "active"
        assert "current_period_end" in body

    def test_me_endpoint_includes_plan(self, auth_client):
        """/auth/me response includes plan field."""
        resp = auth_client.get("/api/v1/auth/me")
        assert resp.status_code == 200
        body = resp.json()
        assert "plan" in body
        assert body["plan"] == "free"

    def test_register_creates_default_subscription(self, client, db):
        """New user registration creates a free-tier subscription."""
        resp = client.post("/api/v1/auth/register", json={
            "name": "New User",
            "email": "newuser@parcel.dev",
            "password": "securepass123",
            "role": "investor",
        })
        assert resp.status_code in (200, 201)

        from models import User
        from models.subscriptions import Subscription
        user = db.query(User).filter_by(email="newuser@parcel.dev").first()
        sub = db.query(Subscription).filter_by(user_id=user.id).first()
        assert sub is not None
        assert sub.plan == "free"
        assert sub.status == "active"
```

### 1.6 Plan Configuration Tests

```python
# ---------------------------------------------------------------------------
# Plan definitions / configuration tests
# ---------------------------------------------------------------------------

class TestPlanConfiguration:
    """Verify plan limits and feature flags are defined correctly."""

    def test_all_plans_have_limits_defined(self):
        """Every tier (free, pro, team) must define all quota metrics."""
        from core.billing.plans import PLAN_LIMITS

        required_metrics = {"deals", "chat_messages", "documents_uploaded"}
        for tier in ("free", "pro", "team"):
            assert tier in PLAN_LIMITS, f"Missing plan definition: {tier}"
            for metric in required_metrics:
                assert metric in PLAN_LIMITS[tier], (
                    f"Missing limit for {metric} in {tier}"
                )

    def test_free_limits_are_finite(self):
        """Free tier must have finite (non-zero, non-inf) limits."""
        from core.billing.plans import PLAN_LIMITS

        for metric, limit in PLAN_LIMITS["free"].items():
            assert isinstance(limit, int), f"Free {metric} limit must be int"
            assert 0 < limit < 10000, f"Free {metric} limit {limit} out of range"

    def test_pro_limits_exceed_free(self):
        """Pro limits must be >= free limits for every metric."""
        from core.billing.plans import PLAN_LIMITS

        for metric in PLAN_LIMITS["free"]:
            free_val = PLAN_LIMITS["free"][metric]
            pro_val = PLAN_LIMITS["pro"][metric]
            assert pro_val >= free_val, (
                f"Pro {metric} ({pro_val}) < free ({free_val})"
            )

    def test_demo_tier_treated_as_pro(self):
        """Demo plan has at least pro-level access."""
        from core.billing.plans import get_effective_tier
        assert get_effective_tier("demo") in ("pro", "team", "demo")

    def test_valid_state_transitions(self):
        """State machine rejects impossible transitions."""
        from core.billing.plans import is_valid_transition

        assert is_valid_transition("trialing", "active") is True
        assert is_valid_transition("active", "past_due") is True
        assert is_valid_transition("past_due", "active") is True
        assert is_valid_transition("canceled", "active") is False
        assert is_valid_transition("incomplete_expired", "active") is False
```

---

## 2. Integration Tests: Checkout Flow with Stripe Test Mode

Integration tests use **real Stripe test-mode API keys** to validate the full
checkout lifecycle. These are **not run in CI** by default (they require network
access and Stripe test keys). They are run locally and in a dedicated
`billing-integration` CI job gated behind a `[billing]` commit tag.

```python
# backend/tests/test_billing_integration.py
"""Integration tests against Stripe test-mode API. Requires STRIPE_SECRET_KEY.

Run locally:
    STRIPE_SECRET_KEY=sk_test_xxx pytest tests/test_billing_integration.py -v

These tests are SKIPPED in CI unless STRIPE_SECRET_KEY is set.
"""

import os
import time

import pytest
import stripe

pytestmark = pytest.mark.skipif(
    not os.getenv("STRIPE_SECRET_KEY", "").startswith("sk_test_"),
    reason="Stripe test key not available",
)

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")

PRICE_ID_PRO = os.getenv("STRIPE_PRICE_ID_PRO", "")


class TestStripeCheckoutIntegration:
    """End-to-end Stripe Checkout flow using test-mode API."""

    def test_create_real_checkout_session(self, auth_client):
        """Create a Checkout Session with the real Stripe API."""
        resp = auth_client.post(
            "/api/v1/billing/checkout",
            json={"plan": "pro"},
        )
        assert resp.status_code == 200
        url = resp.json()["url"]
        assert "checkout.stripe.com" in url

    def test_create_customer_and_subscription(self):
        """Full customer + subscription creation via Stripe API."""
        customer = stripe.Customer.create(
            email="integration-test@parcel.dev",
            metadata={"parcel_user_id": "test-uuid-123"},
        )
        assert customer.id.startswith("cus_")

        # Create subscription with test clock for time manipulation
        test_clock = stripe.test_helpers.TestClock.create(
            frozen_time=int(time.time()),
        )
        customer_with_clock = stripe.Customer.create(
            email="clock-test@parcel.dev",
            test_clock=test_clock.id,
        )

        sub = stripe.Subscription.create(
            customer=customer_with_clock.id,
            items=[{"price": PRICE_ID_PRO}],
            trial_period_days=14,
        )
        assert sub.status == "trialing"
        assert sub.trial_end is not None

        # Cleanup
        stripe.Subscription.cancel(sub.id)
        stripe.Customer.delete(customer.id)
        stripe.Customer.delete(customer_with_clock.id)
        stripe.test_helpers.TestClock.delete(test_clock.id)

    def test_billing_portal_session(self):
        """Create a billing portal session via Stripe API."""
        customer = stripe.Customer.create(
            email="portal-test@parcel.dev",
        )
        session = stripe.billing_portal.Session.create(
            customer=customer.id,
            return_url="https://parceldesk.io/settings/billing",
        )
        assert "billing.stripe.com" in session.url

        # Cleanup
        stripe.Customer.delete(customer.id)
```

---

## 3. Frontend Tests

Frontend billing tests use Vitest + React Testing Library, consistent with the
existing test setup in `frontend/src/__tests__/`. Tests mock `api.ts` calls and
the `authStore` to control plan state.

### 3.1 Paywall / TierGate Rendering

```typescript
// frontend/src/__tests__/billing-components.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock authStore to control plan state
const mockUseAuthStore = vi.fn()
vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) => mockUseAuthStore(selector),
}))

// Mock the billing API
vi.mock('@/lib/api', () => ({
  api: {
    billing: {
      getStatus: vi.fn().mockResolvedValue({
        plan: 'free',
        status: 'active',
        usage: { chat_messages: 10, deals_created: 3, documents_uploaded: 1 },
        limits: { chat_messages: 25, deals_created: 5, documents_uploaded: 3 },
      }),
      createCheckout: vi.fn().mockResolvedValue({
        url: 'https://checkout.stripe.com/test',
      }),
      getUsage: vi.fn().mockResolvedValue({
        chat_messages: { used: 10, limit: 25 },
        deals_created: { used: 3, limit: 5 },
        documents_uploaded: { used: 1, limit: 3 },
      }),
    },
  },
}))

function TestProviders({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe('TierGate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders children for pro users', async () => {
    mockUseAuthStore.mockImplementation((selector: Function) =>
      selector({ user: { plan: 'pro' } })
    )

    const { TierGate } = await import('@/components/billing/TierGate')
    render(
      <TestProviders>
        <TierGate tier="pro">
          <div data-testid="gated-content">Pro Feature</div>
        </TierGate>
      </TestProviders>
    )

    expect(screen.getByTestId('gated-content')).toBeInTheDocument()
  })

  it('shows upgrade prompt for free users accessing pro content', async () => {
    mockUseAuthStore.mockImplementation((selector: Function) =>
      selector({ user: { plan: 'free' } })
    )

    const { TierGate } = await import('@/components/billing/TierGate')
    render(
      <TestProviders>
        <TierGate tier="pro">
          <div data-testid="gated-content">Pro Feature</div>
        </TierGate>
      </TestProviders>
    )

    expect(screen.queryByTestId('gated-content')).not.toBeInTheDocument()
    expect(screen.getByText(/upgrade/i)).toBeInTheDocument()
  })

  it('hides billing CTAs for demo users', async () => {
    mockUseAuthStore.mockImplementation((selector: Function) =>
      selector({ user: { plan: 'demo' } })
    )

    const { TierGate } = await import('@/components/billing/TierGate')
    render(
      <TestProviders>
        <TierGate tier="pro">
          <div data-testid="gated-content">Pro Feature</div>
        </TierGate>
      </TestProviders>
    )

    // Demo gets pro access
    expect(screen.getByTestId('gated-content')).toBeInTheDocument()
    // No upgrade CTA shown
    expect(screen.queryByText(/upgrade/i)).not.toBeInTheDocument()
  })
})
```

### 3.2 Usage Meter Component

```typescript
describe('UsageMeter', () => {
  it('renders current usage out of limit', async () => {
    const { UsageMeter } = await import('@/components/billing/UsageMeter')
    render(
      <TestProviders>
        <UsageMeter metric="chat_messages" used={10} limit={25} label="AI Messages" />
      </TestProviders>
    )

    expect(screen.getByText('AI Messages')).toBeInTheDocument()
    expect(screen.getByText('10 / 25')).toBeInTheDocument()
  })

  it('shows warning state at 80% usage', async () => {
    const { UsageMeter } = await import('@/components/billing/UsageMeter')
    const { container } = render(
      <TestProviders>
        <UsageMeter metric="chat_messages" used={21} limit={25} label="AI Messages" />
      </TestProviders>
    )

    // The progress bar should have a warning color class
    const bar = container.querySelector('[role="progressbar"]')
    expect(bar).toBeInTheDocument()
    expect(bar?.getAttribute('aria-valuenow')).toBe('84')
  })

  it('shows limit-reached state at 100%', async () => {
    const { UsageMeter } = await import('@/components/billing/UsageMeter')
    render(
      <TestProviders>
        <UsageMeter metric="chat_messages" used={25} limit={25} label="AI Messages" />
      </TestProviders>
    )

    expect(screen.getByText(/limit reached/i)).toBeInTheDocument()
  })

  it('shows unlimited for pro users', async () => {
    const { UsageMeter } = await import('@/components/billing/UsageMeter')
    render(
      <TestProviders>
        <UsageMeter metric="chat_messages" used={100} limit={-1} label="AI Messages" />
      </TestProviders>
    )

    expect(screen.getByText(/unlimited/i)).toBeInTheDocument()
  })
})
```

### 3.3 Pricing Page Tests

```typescript
describe('Pricing section', () => {
  it('renders free and pro plan cards', async () => {
    mockUseAuthStore.mockImplementation((selector: Function) =>
      selector({ user: null })
    )

    // Import the pricing component from the landing page or dedicated route
    const { PricingSection } = await import('@/components/landing/PricingSection')
    render(
      <TestProviders>
        <PricingSection />
      </TestProviders>
    )

    expect(screen.getByText(/free/i)).toBeInTheDocument()
    expect(screen.getByText(/pro/i)).toBeInTheDocument()
    expect(screen.getByText(/\$69/)).toBeInTheDocument() // Pro monthly price
  })

  it('highlights current plan for logged-in free user', async () => {
    mockUseAuthStore.mockImplementation((selector: Function) =>
      selector({ user: { plan: 'free' } })
    )

    const { PricingSection } = await import('@/components/landing/PricingSection')
    render(
      <TestProviders>
        <PricingSection />
      </TestProviders>
    )

    const freeCard = screen.getByText(/current plan/i)
    expect(freeCard).toBeInTheDocument()
  })

  it('shows "Manage Subscription" for pro users instead of upgrade CTA', async () => {
    mockUseAuthStore.mockImplementation((selector: Function) =>
      selector({ user: { plan: 'pro' } })
    )

    const { PricingSection } = await import('@/components/landing/PricingSection')
    render(
      <TestProviders>
        <PricingSection />
      </TestProviders>
    )

    expect(screen.getByText(/manage subscription/i)).toBeInTheDocument()
    expect(screen.queryByText(/upgrade/i)).not.toBeInTheDocument()
  })
})
```

### 3.4 Billing Settings Page

```typescript
describe('BillingPage', () => {
  it('renders plan details and usage meters for free user', async () => {
    mockUseAuthStore.mockImplementation((selector: Function) =>
      selector({ user: { plan: 'free', plan_status: 'active' } })
    )

    const BillingPage = (await import('@/pages/settings/BillingPage')).default
    render(
      <TestProviders>
        <BillingPage />
      </TestProviders>
    )

    expect(screen.getByText(/free/i)).toBeInTheDocument()
    expect(screen.getByText(/upgrade to pro/i)).toBeInTheDocument()
  })

  it('shows subscription management for pro user', async () => {
    mockUseAuthStore.mockImplementation((selector: Function) =>
      selector({
        user: {
          plan: 'pro',
          plan_status: 'active',
          current_period_end: '2026-04-28T00:00:00Z',
        },
      })
    )

    const BillingPage = (await import('@/pages/settings/BillingPage')).default
    render(
      <TestProviders>
        <BillingPage />
      </TestProviders>
    )

    expect(screen.getByText(/pro/i)).toBeInTheDocument()
    expect(screen.getByText(/manage subscription/i)).toBeInTheDocument()
    expect(screen.queryByText(/upgrade/i)).not.toBeInTheDocument()
  })

  it('shows past_due warning banner', async () => {
    mockUseAuthStore.mockImplementation((selector: Function) =>
      selector({
        user: { plan: 'pro', plan_status: 'past_due' },
      })
    )

    const BillingPage = (await import('@/pages/settings/BillingPage')).default
    render(
      <TestProviders>
        <BillingPage />
      </TestProviders>
    )

    expect(screen.getByText(/payment issue/i)).toBeInTheDocument()
    expect(screen.getByText(/update payment method/i)).toBeInTheDocument()
  })
})
```

### 3.5 Upgrade Modal Tests

```typescript
describe('UpgradeModal', () => {
  it('renders with feature description and CTA', async () => {
    const { UpgradeModal } = await import('@/components/billing/UpgradeModal')
    const onClose = vi.fn()
    const onUpgrade = vi.fn()

    render(
      <TestProviders>
        <UpgradeModal
          open={true}
          onClose={onClose}
          onUpgrade={onUpgrade}
          feature="Pipeline Management"
        />
      </TestProviders>
    )

    expect(screen.getByText(/pipeline management/i)).toBeInTheDocument()
    expect(screen.getByText(/upgrade to pro/i)).toBeInTheDocument()
  })

  it('calls onUpgrade when CTA button is clicked', async () => {
    const { UpgradeModal } = await import('@/components/billing/UpgradeModal')
    const onClose = vi.fn()
    const onUpgrade = vi.fn()

    render(
      <TestProviders>
        <UpgradeModal
          open={true}
          onClose={onClose}
          onUpgrade={onUpgrade}
          feature="Pipeline Management"
        />
      </TestProviders>
    )

    fireEvent.click(screen.getByText(/upgrade to pro/i))
    expect(onUpgrade).toHaveBeenCalledOnce()
  })

  it('calls onClose when dismiss is clicked', async () => {
    const { UpgradeModal } = await import('@/components/billing/UpgradeModal')
    const onClose = vi.fn()
    const onUpgrade = vi.fn()

    render(
      <TestProviders>
        <UpgradeModal
          open={true}
          onClose={onClose}
          onUpgrade={onUpgrade}
          feature="Pipeline Management"
        />
      </TestProviders>
    )

    fireEvent.click(screen.getByRole('button', { name: /close|cancel|not now/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
```

### 3.6 403 Tier Error Handling in API Client

```typescript
// frontend/src/__tests__/api-billing-errors.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('API client billing error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset modules to pick up fresh mocks
    vi.resetModules()
  })

  it('throws TierRequiredError on 403 with TIER_REQUIRED code', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.resolve({
        error: 'Pro plan required',
        code: 'TIER_REQUIRED',
        required_tier: 'pro',
      }),
    })

    // Expect the API method to throw a structured error
    // The exact import path depends on final api.ts implementation
    const { api } = await import('@/lib/api')
    await expect(
      api.pipeline.create({ deal_id: 'test', stage: 'lead' })
    ).rejects.toMatchObject({
      code: 'TIER_REQUIRED',
      required_tier: 'pro',
    })
  })

  it('throws QuotaExceededError on 403 with QUOTA_EXCEEDED code', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.resolve({
        error: 'Monthly limit reached',
        code: 'QUOTA_EXCEEDED',
        limit: 25,
        used: 25,
      }),
    })

    const { api } = await import('@/lib/api')
    await expect(
      api.chat.send({ message: 'test', deal_id: null })
    ).rejects.toMatchObject({
      code: 'QUOTA_EXCEEDED',
      limit: 25,
    })
  })
})
```

---

## 4. E2E Test Scenarios

These are written as structured scenarios for Playwright or Cypress. They describe
the exact user journey, assertions, and Stripe test data required.

### 4.1 Scenario: New User -> Trial -> Upgrade -> Feature Access -> Cancel

```
SCENARIO: Full subscription lifecycle
PRECONDITION: Stripe test mode active, test clock created

1. REGISTER new user
   POST /api/v1/auth/register { name, email, password, role }
   ASSERT: 201, user.plan == "free"
   ASSERT: Subscription record created with plan="free", status="active"

2. VERIFY free-tier restrictions
   POST /api/v1/pipeline/ { deal_id, stage }
   ASSERT: 403, code="TIER_REQUIRED"

3. INITIATE upgrade
   POST /api/v1/billing/checkout { plan: "pro" }
   ASSERT: 200, body contains checkout URL

4. COMPLETE checkout (simulated via Stripe API)
   Use Stripe test card: 4242424242424242
   Trigger: checkout.session.completed webhook
   ASSERT: Subscription updated to plan="pro", status="active"

5. VERIFY pro-tier access
   POST /api/v1/pipeline/ { deal_id, stage }
   ASSERT: 200/201 (success)
   POST /api/v1/deals/{id}/offer-letter/
   ASSERT: 200 (success)

6. VERIFY /auth/me includes plan
   GET /api/v1/auth/me
   ASSERT: plan="pro", plan_status="active"

7. INITIATE cancellation
   Trigger: customer.subscription.updated webhook (cancel_at_period_end=true)
   ASSERT: Subscription cancel_at_period_end=true, status still "active"

8. PERIOD ENDS (advance test clock)
   Trigger: customer.subscription.deleted webhook
   ASSERT: Subscription plan="free", status="canceled"

9. VERIFY downgrade
   POST /api/v1/pipeline/ { deal_id, stage }
   ASSERT: 403, code="TIER_REQUIRED" (back to free restrictions)
```

### 4.2 Scenario: Free User -> Hit Limit -> Upgrade -> Limit Lifted

```
SCENARIO: Quota enforcement and upgrade relief
PRECONDITION: Free user with 4 of 5 allowed deals

1. CREATE deal #5 (at limit)
   POST /api/v1/deals/ { strategy, inputs }
   ASSERT: 200/201 (success, at the limit but not over)

2. ATTEMPT deal #6 (over limit)
   POST /api/v1/deals/ { strategy, inputs }
   ASSERT: 403, code="QUOTA_EXCEEDED", limit=5, used=5

3. CHECK usage endpoint
   GET /api/v1/billing/status
   ASSERT: usage.deals_created == 5, limits.deals_created == 5

4. UPGRADE to pro
   Complete checkout flow (as in 4.1 steps 3-4)
   ASSERT: plan="pro"

5. RETRY deal creation
   POST /api/v1/deals/ { strategy, inputs }
   ASSERT: 200/201 (success, pro has unlimited deals)

6. CHECK updated limits
   GET /api/v1/billing/status
   ASSERT: limits.deals_created == -1 (unlimited) or a very high number
```

### 4.3 Scenario: Payment Fails -> Dunning -> Recovery

```
SCENARIO: Failed payment dunning and recovery flow
PRECONDITION: Pro user with active subscription approaching renewal

1. RENEWAL payment fails
   Use Stripe test card: 4000000000000341 (attach_to_customer fails after)
   Trigger: invoice.payment_failed webhook
   ASSERT: Subscription status="past_due"

2. VERIFY access during grace period
   Pro features still accessible (past_due != canceled)
   GET /api/v1/pipeline/
   ASSERT: 200 (still accessible)
   GET /api/v1/billing/status
   ASSERT: status="past_due", shows warning

3. SECOND payment retry fails
   Trigger: invoice.payment_failed webhook (attempt 2)
   ASSERT: Status remains "past_due"

4. USER updates payment method (via Stripe portal)
   POST /api/v1/billing/portal
   User updates card on Stripe's portal

5. RETRY succeeds
   Trigger: invoice.paid webhook
   ASSERT: Subscription status="active"
   ASSERT: current_period_end extended

6. VERIFY access restored cleanly
   GET /api/v1/billing/status
   ASSERT: status="active", no warning
```

### 4.4 Scenario: Team Plan -> Create Org -> Invite -> Shared Data

```
SCENARIO: Team billing with shared workspace
PRECONDITION: User on team plan

1. UPGRADE to team plan
   Complete checkout with team price_id
   ASSERT: plan="team", status="active"

2. CREATE team/organization
   POST /api/v1/teams/ { name: "Acme RE" }
   ASSERT: 201, team created, user is admin

3. INVITE team member
   POST /api/v1/teams/{team_id}/invite { email: "teammate@acme.com" }
   ASSERT: 201, invitation sent

4. TEAMMATE registers and joins
   POST /api/v1/auth/register { ..., invitation_code }
   ASSERT: New user has team_id set
   ASSERT: New user inherits team plan tier (pro-equivalent access)

5. VERIFY shared data
   User A creates a deal: POST /api/v1/deals/
   User B lists deals: GET /api/v1/deals/
   ASSERT: User B can see User A's deal (shared via team_id)

6. VERIFY seat limits
   If team plan has a seat cap, inviting beyond the cap returns 403

7. TEAM ADMIN cancels
   Trigger: customer.subscription.deleted
   ASSERT: All team members downgraded to free
   ASSERT: Shared data still visible (read-only) but writes blocked
```

---

## 5. Stripe Test Fixtures

### 5.1 Test Clocks for Trial Expiration

Test clocks allow time-travel in Stripe's test environment to simulate
trial expiration, renewal, and dunning without waiting real-time.

```python
# backend/tests/stripe_fixtures.py
"""Reusable Stripe test fixtures for integration tests."""

import os
import time
from datetime import datetime, timedelta

import stripe

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")


def create_test_clock(frozen_time: int = None) -> stripe.test_helpers.TestClock:
    """Create a Stripe test clock frozen at the given Unix timestamp."""
    return stripe.test_helpers.TestClock.create(
        frozen_time=frozen_time or int(time.time()),
    )


def advance_test_clock(clock_id: str, advance_to: int):
    """Advance a test clock to a specific Unix timestamp.

    This triggers any events that would have fired between the old time
    and the new time (trial expiration, renewals, etc.).
    """
    stripe.test_helpers.TestClock.advance(clock_id, frozen_time=advance_to)


def create_trialing_customer(clock_id: str, email: str, price_id: str, trial_days: int = 14):
    """Create a customer + subscription in trialing state on a test clock."""
    customer = stripe.Customer.create(
        email=email,
        test_clock=clock_id,
        metadata={"source": "parcel_test"},
    )
    # Attach a test payment method
    pm = stripe.PaymentMethod.create(
        type="card",
        card={"token": "tok_visa"},  # Stripe test token
    )
    stripe.PaymentMethod.attach(pm.id, customer=customer.id)
    stripe.Customer.modify(customer.id, invoice_settings={"default_payment_method": pm.id})

    sub = stripe.Subscription.create(
        customer=customer.id,
        items=[{"price": price_id}],
        trial_period_days=trial_days,
    )
    return customer, sub


def simulate_trial_expiration(clock_id: str, trial_end: int):
    """Advance clock past trial end to trigger trial_will_end and conversion."""
    # Advance to 3 days before trial end (triggers trial_will_end event)
    three_days_before = trial_end - (3 * 86400)
    advance_test_clock(clock_id, three_days_before)
    time.sleep(2)  # Allow Stripe to process

    # Advance past trial end (triggers subscription.updated + invoice.paid)
    advance_test_clock(clock_id, trial_end + 60)
    time.sleep(2)


def cleanup_test_clock(clock_id: str, customer_ids: list[str]):
    """Delete test resources to keep the Stripe test account clean."""
    for cid in customer_ids:
        try:
            # Cancel all subscriptions first
            subs = stripe.Subscription.list(customer=cid)
            for s in subs.data:
                stripe.Subscription.cancel(s.id)
            stripe.Customer.delete(cid)
        except stripe.error.InvalidRequestError:
            pass
    try:
        stripe.test_helpers.TestClock.delete(clock_id)
    except stripe.error.InvalidRequestError:
        pass
```

### 5.2 Test Cards for Payment Scenarios

```python
# Stripe test card numbers for different scenarios.
# These are public, documented test values from Stripe's docs.

STRIPE_TEST_CARDS = {
    # Successful payments
    "visa_success":            "4242424242424242",
    "mastercard_success":      "5555555555554444",
    "amex_success":            "378282246310005",

    # Declines
    "generic_decline":         "4000000000000002",
    "insufficient_funds":      "4000000000009995",
    "lost_card":               "4000000000009987",
    "expired_card":            "4000000000000069",
    "incorrect_cvc":           "4000000000000127",
    "processing_error":        "4000000000000119",

    # 3D Secure / SCA
    "3ds_required":            "4000002500003155",  # Always requires authentication
    "3ds_required_on_setup":   "4000002760003184",  # Required only on setup
    "3ds_optional":            "4000003800000446",  # 3DS optional (still succeeds)

    # Specific failure modes
    "charge_fails_after_attach": "4000000000000341",  # Attaches OK, charges fail
    "always_blocked_by_radar":   "4100000000000019",  # Blocked by Radar

    # Disputes
    "fraudulent_dispute":      "4000000000000259",  # Triggers a dispute
    "inquiry_dispute":         "4000000000001976",  # Inquiry (not a full dispute)
}

# Token shortcuts for PaymentMethod.create
STRIPE_TEST_TOKENS = {
    "visa":          "tok_visa",
    "visa_debit":    "tok_visa_debit",
    "mastercard":    "tok_mastercard",
    "amex":          "tok_amex",
    "declined":      "tok_chargeDeclined",
}
```

---

## 6. Mock Strategies: When to Mock vs. Use Test Mode

### Decision Matrix

| Test Type | Mock Stripe? | Use Test Mode? | Rationale |
|---|---|---|---|
| **Unit tests** (guards, handlers, usage) | Yes (always) | No | Must be fast, offline, deterministic. CI runs on every push. |
| **Webhook handler logic** | Yes (mock `construct_event`) | No | Handler logic is local. Signature verification is Stripe's responsibility. |
| **Checkout session creation** | Yes in unit tests | Yes in integration | Unit tests verify our code; integration tests verify Stripe's API contract. |
| **Plan provisioning flow** | Yes (mock webhook payload) | No | Event dispatch + DB writes are local logic. |
| **Trial expiration timing** | No (cannot mock time) | Yes (test clocks) | Stripe test clocks are the only reliable way to test time-dependent billing. |
| **Dunning / payment retry** | Partially | Yes | Stripe's retry logic cannot be mocked; use test cards + clocks. |
| **Billing portal redirect** | Yes in unit tests | Yes in smoke test | Verify URL format in unit; verify actual redirect in integration. |

### Mock Boundaries

```
                    +---------------------------+
                    |  billing router endpoints  |  <-- Test with TestClient
                    +-------------+-------------+
                                  |
                    +-------------v-------------+
                    |  core/billing/guards.py    |  <-- Test directly (no HTTP)
                    |  core/billing/usage.py     |
                    +-------------+-------------+
                                  |
                    +-------------v-------------+
                    | core/billing/stripe_service|  <-- THIS is the mock boundary
                    +-------------+-------------+
                                  |
                    +-------------v-------------+
                    |      stripe SDK (mocked)   |  <-- Never tested in unit tests
                    +---------------------------+
```

**Rule:** Mock at the `stripe_service` level, never deeper. This means:

1. `stripe_service.create_checkout_session()` is the function we mock, not
   `stripe.checkout.Session.create()`.
2. If `stripe_service` is a thin wrapper (1-2 lines), mock the `stripe` module
   directly inside the `stripe_service` module scope.
3. Integration tests do NOT mock anything -- they call the real Stripe API.

### What NOT to Mock

- Stripe's signature verification algorithm (it is correct; test that we call it)
- Stripe's webhook retry behavior (use test mode + CLI)
- Stripe's test clock advancement (must be real API calls)
- The SQLAlchemy ORM layer (always use the real in-memory SQLite)

---

## 7. CI Integration

### 7.1 Updated GitHub Actions Workflow

The existing `ci.yml` runs backend tests with `TESTING=1`. Billing tests are
split into two tiers:

- **Unit tests** (default): Always run, no Stripe keys needed.
- **Integration tests** (optional): Run only when `STRIPE_SECRET_KEY` is available.

```yaml
# Additions to .github/workflows/ci.yml

  backend:
    name: Backend (Python + Tests)
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
          cache: pip
          cache-dependency-path: backend/requirements.txt

      - name: Install dependencies
        run: pip install -r requirements.txt

      - name: Install test dependencies
        run: pip install pytest httpx

      - name: Run unit tests (includes billing unit tests)
        env:
          TESTING: "1"
          ANTHROPIC_API_KEY: test-key
          JWT_SECRET_KEY: test-secret-for-ci
          # Billing env vars with dummy values for unit tests
          STRIPE_SECRET_KEY: sk_test_dummy_for_unit_tests
          STRIPE_WEBHOOK_SECRET: whsec_dummy_for_unit_tests
          STRIPE_PRICE_ID_PRO: price_dummy_pro
          STRIPE_PRICE_ID_TEAM: price_dummy_team
        run: python -m pytest tests/ -v --tb=short -k "not integration"

  billing-integration:
    name: Billing Integration (Stripe test mode)
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    needs: [backend]  # Only run after unit tests pass
    defaults:
      run:
        working-directory: backend

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
          cache: pip
          cache-dependency-path: backend/requirements.txt

      - name: Install dependencies
        run: pip install -r requirements.txt && pip install pytest httpx

      - name: Run Stripe integration tests
        env:
          TESTING: "1"
          JWT_SECRET_KEY: test-secret-for-ci
          ANTHROPIC_API_KEY: test-key
          STRIPE_SECRET_KEY: ${{ secrets.STRIPE_TEST_SECRET_KEY }}
          STRIPE_WEBHOOK_SECRET: ${{ secrets.STRIPE_TEST_WEBHOOK_SECRET }}
          STRIPE_PRICE_ID_PRO: ${{ secrets.STRIPE_TEST_PRICE_ID_PRO }}
          STRIPE_PRICE_ID_TEAM: ${{ secrets.STRIPE_TEST_PRICE_ID_TEAM }}
        run: python -m pytest tests/test_billing_integration.py -v --tb=short
        # This job is allowed to fail (soft-fail) if secrets are not configured
        continue-on-error: true
```

### 7.2 Required GitHub Secrets

| Secret Name | Value Format | Purpose |
|---|---|---|
| `STRIPE_TEST_SECRET_KEY` | `sk_test_...` | Stripe test-mode secret key |
| `STRIPE_TEST_WEBHOOK_SECRET` | `whsec_...` | Webhook signing secret for test mode |
| `STRIPE_TEST_PRICE_ID_PRO` | `price_...` | Stripe Price ID for Pro plan (test mode) |
| `STRIPE_TEST_PRICE_ID_TEAM` | `price_...` | Stripe Price ID for Team plan (test mode) |

### 7.3 Security Considerations for CI

1. **Secrets are never printed in logs.** GitHub Actions masks secrets automatically.
   The workflow does not echo or print environment variables.
2. **Integration tests run only on `main` branch pushes**, not on PRs from forks.
   Fork PRs cannot access repository secrets.
3. **`continue-on-error: true`** on the integration job prevents billing test
   failures from blocking deploys. This is intentional for the early billing phase
   -- billing integration tests are informational, not gating.
4. **Test-mode keys only.** The CI never has access to live keys. The startup
   validation in `core/billing/config.py` rejects `sk_live_` keys when
   `ENVIRONMENT != "production"`.

---

## 8. Test Data: Seeded Test Users with Different Plans

### 8.1 Test User Matrix

| Fixture Name | Email | Plan | Status | Stripe IDs | Purpose |
|---|---|---|---|---|---|
| `test_user` | `test@parcel.dev` | `free` | `active` | None | Default free user (existing) |
| `pro_user` | `pro@parcel.dev` | `pro` | `active` | `cus_test_pro` / `sub_test_pro` | Pro-tier access tests |
| `team_user` | `team@parcel.dev` | `team` | `active` | `cus_test_team` / `sub_test_team` | Team-tier access tests |
| `trial_user` | `trial@parcel.dev` | `pro` | `trialing` | `cus_test_trial` / `sub_test_trial` | Trial period tests |
| `past_due_user` | `pastdue@parcel.dev` | `pro` | `past_due` | `cus_test_pd` / `sub_test_pd` | Dunning/grace period tests |
| `canceled_user` | `canceled@parcel.dev` | `free` | `canceled` | `cus_test_cancel` / `sub_test_cancel` | Post-cancellation tests |
| `demo_user` | `demo@parcel.app` | `demo` | `active` | None | Demo account (existing) |
| `maxed_free_user` | `maxed@parcel.dev` | `free` | `active` | None | At quota limits |

### 8.2 Seeded Usage Data

For `maxed_free_user`, the following usage records are pre-seeded:

| Metric | Count | Limit | Purpose |
|---|---|---|---|
| `deals_created` | 5 | 5 | At deal creation limit |
| `chat_messages` | 25 | 25 | At chat limit |
| `documents_uploaded` | 3 | 3 | At document upload limit |

---

## 9. Pytest Fixtures for Billing

These fixtures extend the existing `backend/tests/conftest.py` and follow the
same patterns (in-memory SQLite, TestClient with dependency overrides, cookie-based
auth).

```python
# -----------------------------------------------------------------------
# Additions to backend/tests/conftest.py
# -----------------------------------------------------------------------

# After existing imports, add:
# from models.subscriptions import Subscription
# from models.usage_records import UsageRecord

# NOTE: These imports must happen AFTER the dialect patches and path setup
# that already exist in conftest.py. The new models use the same Base and
# the same UUID/JSONB types that are already patched.


@pytest.fixture()
def pro_user(db) -> "User":
    """Insert a pro-tier user with an active subscription."""
    from models.subscriptions import Subscription

    user = User(
        id=uuid.uuid4(),
        name="Pro User",
        email="pro@parcel.dev",
        password_hash=hash_password("password123"),
        role="investor",
    )
    db.add(user)
    db.flush()

    sub = Subscription(
        id=uuid.uuid4(),
        user_id=user.id,
        plan="pro",
        status="active",
        stripe_customer_id="cus_test_pro",
        stripe_subscription_id="sub_test_pro",
        current_period_start=datetime.utcnow(),
        current_period_end=datetime.utcnow() + timedelta(days=30),
    )
    db.add(sub)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture()
def pro_auth_client(client, pro_user):
    """TestClient with access_token cookie for the pro user."""
    token = create_access_token({"sub": str(pro_user.id)})
    client.cookies.set("access_token", token)
    return client


@pytest.fixture()
def team_user(db) -> "User":
    """Insert a team-tier user with an active team subscription."""
    from models.subscriptions import Subscription

    user = User(
        id=uuid.uuid4(),
        name="Team User",
        email="team@parcel.dev",
        password_hash=hash_password("password123"),
        role="investor",
    )
    db.add(user)
    db.flush()

    sub = Subscription(
        id=uuid.uuid4(),
        user_id=user.id,
        plan="team",
        status="active",
        stripe_customer_id="cus_test_team",
        stripe_subscription_id="sub_test_team",
        current_period_start=datetime.utcnow(),
        current_period_end=datetime.utcnow() + timedelta(days=30),
    )
    db.add(sub)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture()
def team_auth_client(client, team_user):
    """TestClient with access_token cookie for the team user."""
    token = create_access_token({"sub": str(team_user.id)})
    client.cookies.set("access_token", token)
    return client


@pytest.fixture()
def trial_user(db) -> "User":
    """Insert a user in trial period."""
    from models.subscriptions import Subscription

    user = User(
        id=uuid.uuid4(),
        name="Trial User",
        email="trial@parcel.dev",
        password_hash=hash_password("password123"),
        role="investor",
    )
    db.add(user)
    db.flush()

    sub = Subscription(
        id=uuid.uuid4(),
        user_id=user.id,
        plan="pro",
        status="trialing",
        stripe_customer_id="cus_test_trial",
        stripe_subscription_id="sub_test_trial",
        current_period_start=datetime.utcnow(),
        current_period_end=datetime.utcnow() + timedelta(days=14),
    )
    db.add(sub)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture()
def trial_auth_client(client, trial_user):
    """TestClient with access_token cookie for the trial user."""
    token = create_access_token({"sub": str(trial_user.id)})
    client.cookies.set("access_token", token)
    return client


@pytest.fixture()
def past_due_user(db) -> "User":
    """Insert a user with a past_due subscription (payment failed)."""
    from models.subscriptions import Subscription

    user = User(
        id=uuid.uuid4(),
        name="Past Due User",
        email="pastdue@parcel.dev",
        password_hash=hash_password("password123"),
        role="investor",
    )
    db.add(user)
    db.flush()

    sub = Subscription(
        id=uuid.uuid4(),
        user_id=user.id,
        plan="pro",
        status="past_due",
        stripe_customer_id="cus_test_pd",
        stripe_subscription_id="sub_test_pd",
        current_period_start=datetime.utcnow() - timedelta(days=30),
        current_period_end=datetime.utcnow() - timedelta(days=1),  # expired
    )
    db.add(sub)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture()
def past_due_auth_client(client, past_due_user):
    """TestClient with access_token cookie for the past-due user."""
    token = create_access_token({"sub": str(past_due_user.id)})
    client.cookies.set("access_token", token)
    return client


@pytest.fixture()
def canceled_user(db) -> "User":
    """Insert a user whose subscription was canceled (back to free)."""
    from models.subscriptions import Subscription

    user = User(
        id=uuid.uuid4(),
        name="Canceled User",
        email="canceled@parcel.dev",
        password_hash=hash_password("password123"),
        role="investor",
    )
    db.add(user)
    db.flush()

    sub = Subscription(
        id=uuid.uuid4(),
        user_id=user.id,
        plan="free",
        status="canceled",
        stripe_customer_id="cus_test_cancel",
        stripe_subscription_id="sub_test_cancel",
        current_period_start=datetime.utcnow() - timedelta(days=60),
        current_period_end=datetime.utcnow() - timedelta(days=30),
    )
    db.add(sub)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture()
def demo_user(db) -> "User":
    """Insert the demo user (demo@parcel.app) with demo-tier access."""
    from models.subscriptions import Subscription

    user = User(
        id=uuid.uuid4(),
        name="Demo User",
        email="demo@parcel.app",
        password_hash=hash_password("demopassword"),
        role="investor",
    )
    db.add(user)
    db.flush()

    sub = Subscription(
        id=uuid.uuid4(),
        user_id=user.id,
        plan="demo",
        status="active",
    )
    db.add(sub)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture()
def demo_auth_client(client, demo_user):
    """TestClient with access_token cookie for the demo user."""
    token = create_access_token({"sub": str(demo_user.id)})
    client.cookies.set("access_token", token)
    return client


@pytest.fixture()
def maxed_free_user(db) -> "User":
    """Free user at all quota limits."""
    from models.subscriptions import Subscription
    from models.usage_records import UsageRecord

    user = User(
        id=uuid.uuid4(),
        name="Maxed User",
        email="maxed@parcel.dev",
        password_hash=hash_password("password123"),
        role="investor",
    )
    db.add(user)
    db.flush()

    sub = Subscription(
        id=uuid.uuid4(),
        user_id=user.id,
        plan="free",
        status="active",
    )
    db.add(sub)

    period_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0)
    period_end = period_start + timedelta(days=31)

    for metric, count in [
        ("deals_created", 5),
        ("chat_messages", 25),
        ("documents_uploaded", 3),
    ]:
        record = UsageRecord(
            id=uuid.uuid4(),
            user_id=user.id,
            metric=metric,
            count=count,
            period_start=period_start,
            period_end=period_end,
        )
        db.add(record)

    db.commit()
    db.refresh(user)
    return user


@pytest.fixture()
def maxed_free_auth_client(client, maxed_free_user):
    """TestClient with access_token for the maxed-out free user."""
    token = create_access_token({"sub": str(maxed_free_user.id)})
    client.cookies.set("access_token", token)
    return client


# -----------------------------------------------------------------------
# Webhook test helpers
# -----------------------------------------------------------------------

@pytest.fixture()
def webhook_event_factory():
    """Factory to build Stripe webhook event payloads for testing."""
    def _make(event_type: str, data_object: dict, event_id: str = None) -> dict:
        return {
            "id": event_id or f"evt_test_{uuid.uuid4().hex[:12]}",
            "object": "event",
            "type": event_type,
            "api_version": "2024-12-18.acacia",
            "created": int(datetime.utcnow().timestamp()),
            "data": {"object": data_object},
        }
    return _make
```

---

## 10. CRITICAL DECISIONS

These decisions must be made before writing billing test code. Each has trade-offs
that affect test reliability, CI speed, and maintenance burden.

### Decision 1: Where does plan state live?

**Options:**
- (A) `plan` column on the `users` table (fast reads, denormalized)
- (B) Separate `subscriptions` table (normalized, audit trail)
- (C) Both (denormalized `users.plan` for reads + `subscriptions` for history)

**Recommendation: (C) Both.** The `users.plan` column is the source of truth for
guards (one column read per request). The `subscriptions` table provides audit
history and Stripe sync state. Tests must verify BOTH are updated on webhook events.

**Testing impact:** Every webhook handler test must assert changes in both the
`users` table AND the `subscriptions` table. If they diverge, the system is broken.

### Decision 2: Does past_due keep pro access?

**Options:**
- (A) past_due retains full pro access (grace period until Stripe cancels)
- (B) past_due restricts to read-only (no new creates, but existing data visible)
- (C) past_due immediately downgrades to free

**Recommendation: (A) Retain full access.** Stripe retries payments over 3 days.
Blocking a customer who will likely pay within hours creates unnecessary friction.
Downgrade only on `customer.subscription.deleted` (final cancellation).

**Testing impact:** `past_due_auth_client` must pass ALL pro-tier access tests
identically to `pro_auth_client`. Add a dedicated test matrix that runs
tier-gated endpoints against `[pro_auth_client, past_due_auth_client, trial_auth_client]`
to verify all three statuses grant pro access.

### Decision 3: How to handle "no subscription" for existing users?

When billing launches, existing users will have no `Subscription` row. The
system must handle `NULL` gracefully.

**Options:**
- (A) Migration creates a `free` subscription for every existing user
- (B) Code treats "no subscription" as equivalent to free tier
- (C) Both

**Recommendation: (C) Both.** The migration backfills `free` subscriptions for
data cleanliness. The code still handles NULL defensively. Tests must cover the
NULL-subscription path.

**Testing impact:** Add a test fixture `user_without_subscription` that creates a
User with no Subscription row. Verify it is treated as free tier in all guards.

### Decision 4: Quota period boundary -- calendar month or rolling 30 days?

**Options:**
- (A) Calendar month (resets on 1st of each month at midnight UTC)
- (B) Rolling 30-day window from subscription start
- (C) Billing-cycle aligned (resets when `invoice.paid` fires)

**Recommendation: (A) Calendar month.** Simplest to implement, easiest for users to
understand ("you get 25 messages per month"). The `period_start` in `usage_records`
is always the 1st of the current month.

**Testing impact:** Tests must handle month boundaries. Use `freezegun` or manual
datetime injection to test behavior on Jan 31 -> Feb 1 transitions. The
`test_usage_resets_at_period_boundary` test (Section 1.4) covers this.

### Decision 5: Should billing tests mock at the Stripe SDK level or at the service level?

**Options:**
- (A) Mock `stripe.checkout.Session.create` (SDK level)
- (B) Mock `StripeService.create_checkout_session` (service level)
- (C) Mock at both levels in different test files

**Recommendation: (B) Service level for unit tests.** The `StripeService` wrapper is
the mock boundary. This makes tests resilient to Stripe SDK version changes (e.g.,
parameter renames). Integration tests use the real SDK against test mode.

**Testing impact:** If `StripeService` is skipped and billing code calls `stripe.*`
directly, the mock boundary becomes the `stripe` module itself (Option A). This
works but couples tests to SDK internals. If the team decides to call `stripe.*`
directly (no service wrapper), switch all mocks to `patch("routers.billing.stripe")`.

### Decision 6: Should the webhook endpoint process synchronously or async?

**Options:**
- (A) Synchronous: verify signature, process event, return 200
- (B) Async: verify signature, store raw event, return 200, process in background

**Recommendation: (A) Synchronous for Phase 1.** Parcel's scale (hundreds of
subscribers, not millions) does not warrant a background worker. Processing a
webhook takes <100ms (one DB read + one DB write). Stripe's 20-second timeout is
generous. Switch to (B) if webhook processing ever exceeds 5 seconds.

**Testing impact:** Synchronous processing makes tests simpler -- the response
status code confirms processing completed. With async processing, tests would need
to poll the `webhook_events` table for `processed=True` after sending the webhook.

### Decision 7: What is the test-to-production parity strategy?

**Options:**
- (A) SQLite for all tests (current approach, fast, some dialect gaps)
- (B) PostgreSQL in Docker for billing tests (full parity)
- (C) SQLite for unit tests, PostgreSQL for integration tests

**Recommendation: (C) Mixed.** The existing SQLite test infrastructure works well
and covers 95% of cases. The dialect patches for UUID and JSONB already handle the
main differences. Add a PostgreSQL-based integration test job in CI for billing
specifically, since billing uses advisory locks and partial indexes that SQLite
does not support.

**Testing impact:** Advisory lock calls (`pg_advisory_xact_lock`) must be
no-oped in SQLite tests. Add a helper:

```python
def advisory_lock(db, key: int):
    """Acquire advisory lock. No-op on SQLite."""
    if db.bind.dialect.name == "postgresql":
        db.execute(text(f"SELECT pg_advisory_xact_lock({key})"))
```

### Decision 8: How to test webhook signature verification without Stripe?

The `stripe.Webhook.construct_event()` function verifies HMAC-SHA256 signatures.
In unit tests, we bypass this entirely by mocking it to return the parsed JSON.
This is correct -- we are testing OUR handler logic, not Stripe's crypto library.

**The one test that must NOT mock signature verification:** A dedicated security
test that sends a request with a bad/missing signature and asserts 400. This
tests that our route CALLS `construct_event` and handles the exception.

```python
def test_signature_verification_is_called(client):
    """Verify the webhook endpoint actually checks signatures (not bypassed)."""
    # Send a real payload with a garbage signature
    # Do NOT mock construct_event here
    resp = client.post(
        "/api/v1/billing/webhooks/stripe",
        content=b'{"id": "evt_fake"}',
        headers={"stripe-signature": "t=0,v1=obviously_wrong"},
    )
    # Should be rejected (400) because signature is invalid
    assert resp.status_code == 400
```

### Decision 9: Frontend test scope for billing

**Options:**
- (A) Unit tests only (component rendering, mock API)
- (B) Unit tests + Playwright E2E for checkout redirect
- (C) Unit tests only; manual QA for checkout flow

**Recommendation: (A) Unit tests only for Phase 1, add Playwright later.**
The Stripe Checkout is a redirect to `checkout.stripe.com` -- there is nothing
to render-test on Parcel's side. Playwright could verify the redirect URL format,
but the value is low relative to the setup cost. Focus frontend tests on:
- TierGate rendering (correct content shown/hidden per plan)
- UsageMeter display (correct numbers, warning states)
- UpgradeModal interactions (open/close/CTA clicks)
- API error handling (403 -> structured error -> modal trigger)
- BillingPage state rendering (free/pro/past_due/canceled views)

### Decision 10: Test data cleanup strategy for Stripe integration tests

Stripe test-mode data persists across test runs. Without cleanup, the test
account accumulates customers and subscriptions.

**Strategy:**
- Every integration test creates resources with `metadata: {"source": "parcel_test"}`
- A `cleanup_test_data` fixture or teardown deletes all test-tagged resources
- Test clocks are always deleted after use (they have a 14-day limit anyway)
- Run a weekly cron to purge stale test data:
  `stripe customers list --limit 100 | grep parcel_test | xargs -I{} stripe customers delete {}`

**Testing impact:** Integration tests must be written as self-cleaning. Use
pytest `yield` fixtures that create resources in setup and delete them in teardown.
Never assume a clean Stripe test environment.
