# Security & PCI Compliance Research for Parcel Billing

## Scope

This document covers payment security, PCI DSS compliance, and data protection requirements for Parcel's Stripe Checkout integration. Parcel is a real estate deal analysis SaaS with a FastAPI backend on Railway, a React frontend on Vercel, and authentication via httpOnly JWT cookies.

---

## 1. PCI DSS SAQ A Requirements

Stripe Checkout (hosted payment page) qualifies Parcel for **SAQ A** -- the simplest PCI compliance tier. The customer is redirected to Stripe's domain (`checkout.stripe.com`) to enter card details. Parcel's servers never see, process, or store cardholder data.

### SAQ A Eligibility Criteria

Parcel qualifies if **all** of the following remain true:

1. All payment processing is fully outsourced to Stripe (a PCI DSS Level 1 provider).
2. Card data entry happens entirely on Stripe-hosted pages -- never on `parceldesk.io`.
3. Parcel does not electronically store, process, or transmit cardholder data.
4. Parcel has no embedded payment iframes on its domain (Stripe Checkout = redirect, not embed).
5. All pages on `parceldesk.io` that could affect payment security are served over HTTPS.
6. Parcel retains documentation of PCI DSS compliance (this document + annual self-assessment).

### What SAQ A Requires

| Requirement | What Parcel Must Do |
|---|---|
| Req 2 | Do not use vendor-supplied defaults for system passwords or security params |
| Req 9 | Restrict physical access to systems (Railway/Vercel handle infrastructure) |
| Req 12.1 | Maintain a security policy (this document is a start) |
| Req 12.8 | Maintain agreements with Stripe acknowledging their PCI responsibilities |
| Annual SAQ | Complete the SAQ A questionnaire annually (12 questions, self-assessed) |

### What SAQ A Does NOT Require

- Quarterly ASV (Approved Scanning Vendor) network scans
- Penetration testing
- Internal vulnerability scans
- On-site QSA assessments

### Disqualifying Actions (Would Escalate to SAQ A-EP or SAQ D)

- Embedding Stripe.js `CardElement` on `parceldesk.io` (use Checkout redirect instead)
- Proxying or relaying card data through Parcel's backend
- Storing any card number, CVV, or expiration date in PostgreSQL or logs
- Using Stripe's PaymentIntents API to collect card details on your own form

---

## 2. Never Storing Card Data

This is the single most important rule. Violations can result in fines of $5,000--$100,000/month from card brands.

### Parcel Must NEVER

- Store credit/debit card numbers (PAN), even partially (no "last 4" from raw input)
- Store CVV/CVC/CVV2 codes -- even Stripe deletes these after authorization
- Store card expiration dates from raw user input
- Store magnetic stripe data or PIN blocks
- Log any of the above in application logs, error tracking, or debug output
- Store card data in PostgreSQL, Redis, S3, or any other Parcel-controlled datastore
- Pass card data through URL query parameters (would appear in server logs)
- Include card data in error messages, exception traces, or support tickets

### What Parcel CAN Safely Store

These come from Stripe API responses and are explicitly safe:

- `stripe_customer_id` (e.g., `cus_ABC123`) -- the Stripe Customer object ID
- `stripe_subscription_id` (e.g., `sub_DEF456`) -- the Stripe Subscription object ID
- `payment_method_type` (e.g., `"card"`) -- the type of payment method
- `card_brand` and `card_last4` from Stripe's `PaymentMethod` object (Stripe provides these)
- Invoice IDs, amounts, currency, and status from Stripe webhook events
- Subscription status, plan, and billing cycle dates

### Implementation Guard Rails

```python
# backend/core/billing/guards.py
"""Compile-time safety: reject any field name that smells like raw card data."""

BANNED_FIELD_NAMES = frozenset({
    "card_number", "pan", "cc_number", "credit_card",
    "cvv", "cvc", "cvv2", "security_code",
    "expiry", "exp_date", "expiration_date",
    "track1", "track2", "magnetic_stripe", "pin_block",
})

def validate_no_card_data(data: dict) -> None:
    """Raise if any dict key looks like raw card data. Call before any DB write."""
    for key in data:
        if key.lower() in BANNED_FIELD_NAMES:
            raise ValueError(
                f"SECURITY VIOLATION: Attempted to store banned field '{key}'. "
                "Raw card data must never touch Parcel systems."
            )
```

---

## 3. Stripe Webhook Signature Verification

Webhooks are the backbone of Stripe billing integration. Every webhook must be verified to prevent spoofed events.

### FastAPI Implementation

```python
# backend/routers/billing.py
"""Billing router -- Stripe webhook receiver and subscription management."""

import logging
import os

import stripe
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/billing", tags=["billing"])

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")


@router.post("/webhooks/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(alias="stripe-signature"),
    db: Session = Depends(get_db),
) -> dict:
    """Receive and verify Stripe webhook events.

    CRITICAL: The raw body must be read BEFORE any JSON parsing.
    FastAPI's Body() or Pydantic model would alter the payload and
    break signature verification.
    """
    payload = await request.body()

    if not WEBHOOK_SECRET:
        logger.error("STRIPE_WEBHOOK_SECRET not configured")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Webhook not configured", "code": "WEBHOOK_CONFIG_ERROR"},
        )

    try:
        event = stripe.Webhook.construct_event(
            payload=payload,
            sig_header=stripe_signature,
            secret=WEBHOOK_SECRET,
        )
    except ValueError:
        # Invalid payload
        logger.warning("Stripe webhook: invalid payload")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Invalid payload", "code": "INVALID_PAYLOAD"},
        )
    except stripe.error.SignatureVerificationError:
        # Invalid signature -- possible spoofing attempt
        logger.warning("Stripe webhook: signature verification failed")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Invalid signature", "code": "INVALID_SIGNATURE"},
        )

    # Log event type and ID only -- never log the full payload
    logger.info("Stripe webhook received: type=%s id=%s", event["type"], event["id"])

    # Dispatch by event type
    match event["type"]:
        case "checkout.session.completed":
            _handle_checkout_completed(event["data"]["object"], db)
        case "customer.subscription.updated":
            _handle_subscription_updated(event["data"]["object"], db)
        case "customer.subscription.deleted":
            _handle_subscription_deleted(event["data"]["object"], db)
        case "invoice.payment_failed":
            _handle_payment_failed(event["data"]["object"], db)
        case "invoice.paid":
            _handle_invoice_paid(event["data"]["object"], db)
        case _:
            logger.info("Unhandled Stripe event type: %s", event["type"])

    return {"status": "ok"}
```

### Key Implementation Details

1. **Read raw body with `await request.body()`** -- do NOT use Pydantic models for the webhook endpoint. JSON parsing before signature verification will fail.
2. **The `stripe-signature` header** is provided by Stripe on every webhook delivery. Use `Header(alias="stripe-signature")` since FastAPI converts hyphens to underscores.
3. **The webhook secret** (`whsec_...`) is unique per endpoint and obtained from the Stripe Dashboard under Developers > Webhooks.
4. **Idempotency**: Stripe may deliver the same event multiple times. Use `event["id"]` to deduplicate by storing processed event IDs in a table with a unique constraint.

### Idempotency Table

```python
# backend/models/billing_events.py
from sqlalchemy import Column, String, DateTime
from sqlalchemy.sql import func
from database import Base

class ProcessedStripeEvent(Base):
    __tablename__ = "processed_stripe_events"

    event_id = Column(String, primary_key=True)  # Stripe event ID (evt_...)
    event_type = Column(String, nullable=False)
    processed_at = Column(DateTime, server_default=func.now(), nullable=False)
```

In the webhook handler, before processing:

```python
existing = db.query(ProcessedStripeEvent).filter_by(event_id=event["id"]).first()
if existing:
    logger.info("Duplicate Stripe event %s, skipping", event["id"])
    return {"status": "ok"}

# Process the event, then record it
db.add(ProcessedStripeEvent(event_id=event["id"], event_type=event["type"]))
db.commit()
```

---

## 4. HTTPS Requirements

### All Payment-Adjacent Traffic Must Use HTTPS

- **Vercel** (frontend): Automatic HTTPS via Let's Encrypt for `parceldesk.io`. No action needed.
- **Railway** (backend): Automatic HTTPS for `api.parceldesk.io`. Railway provisions TLS certificates automatically.
- **Stripe webhooks**: Stripe will only send webhooks to HTTPS endpoints. Railway satisfies this.

### Parcel-Specific Checks

1. The CORS `FRONTEND_URL` env var must use `https://` in production (already enforced -- Parcel's `api.ts` strips `http://` and replaces with `https://`).
2. All cookies use `Secure=True` in production (already implemented in `auth.py` via `_IS_PRODUCTION`).
3. The Stripe Checkout `success_url` and `cancel_url` must be HTTPS URLs.
4. No mixed content: every asset on billing-related pages must load over HTTPS.

### HSTS (HTTP Strict Transport Security)

Add to FastAPI middleware for production:

```python
from starlette.middleware.base import BaseHTTPMiddleware

class HSTSMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        if os.getenv("ENVIRONMENT") == "production":
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains"
            )
        return response

app.add_middleware(HSTSMiddleware)
```

Vercel can set HSTS headers via `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains" }
      ]
    }
  ]
}
```

---

## 5. Environment Variable Management

### Required Stripe Environment Variables

| Variable | Test Value Prefix | Live Value Prefix | Where Set |
|---|---|---|---|
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_` | `pk_live_` | Vercel (frontend) as `VITE_STRIPE_PUBLISHABLE_KEY` |
| `STRIPE_SECRET_KEY` | `sk_test_` | `sk_live_` | Railway (backend) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_` | `whsec_` | Railway (backend) |
| `STRIPE_PRICE_ID_PRO` | `price_` | `price_` | Railway (backend) |

### Key Management Rules

1. **Never commit Stripe keys to git.** Use `.env` for local dev and platform env vars for production.
2. **The secret key (`sk_`) must never appear in frontend code.** It goes only in the backend.
3. **Use restricted keys in production.** Create a restricted key in Stripe Dashboard with only the permissions Parcel needs (Checkout Sessions: write, Customers: write, Subscriptions: read).
4. **Separate test and live keys.** Use `ENVIRONMENT` variable to validate:

```python
# backend/core/billing/config.py
import os

def get_stripe_config():
    env = os.getenv("ENVIRONMENT", "development")
    secret_key = os.getenv("STRIPE_SECRET_KEY", "")

    # Safety check: reject live keys in non-production environments
    if env != "production" and secret_key.startswith("sk_live_"):
        raise RuntimeError(
            "SECURITY: Live Stripe key detected in non-production environment. "
            "Set STRIPE_SECRET_KEY to a test key (sk_test_...)."
        )

    # Safety check: reject test keys in production
    if env == "production" and secret_key.startswith("sk_test_"):
        raise RuntimeError(
            "CONFIGURATION: Test Stripe key detected in production. "
            "Set STRIPE_SECRET_KEY to a live key (sk_live_...)."
        )

    return {
        "secret_key": secret_key,
        "webhook_secret": os.getenv("STRIPE_WEBHOOK_SECRET", ""),
        "price_id_pro": os.getenv("STRIPE_PRICE_ID_PRO", ""),
    }
```

5. **Add Stripe env vars to `.env.example`** (with placeholder values) so other developers know what's needed:

```
STRIPE_SECRET_KEY=sk_test_replace_me
STRIPE_WEBHOOK_SECRET=whsec_replace_me
STRIPE_PRICE_ID_PRO=price_replace_me
```

---

## 6. CORS Configuration for Stripe Checkout

### How Stripe Checkout Works (Redirect Flow)

1. Frontend calls Parcel backend: `POST /api/v1/billing/create-checkout-session`
2. Backend creates a Stripe Checkout Session via `stripe.checkout.Session.create()`
3. Backend returns `{ "url": "https://checkout.stripe.com/c/pay/cs_..." }`
4. Frontend does `window.location.href = url` (full page redirect to Stripe)
5. After payment, Stripe redirects to `success_url` on `parceldesk.io`

### CORS Implications

- **No CORS changes needed for Stripe.** The browser navigates to `checkout.stripe.com` via a full redirect, not an XHR/fetch call. CORS only applies to cross-origin fetch/XHR requests.
- The existing CORS config in `main.py` already allows `parceldesk.io` to call `api.parceldesk.io`. This covers step 1 above (the `create-checkout-session` API call).
- **Do NOT add `checkout.stripe.com` to `allow_origins`.** It is not needed and would be a misconfiguration.

### The Only CORS Consideration

The `POST /api/v1/billing/create-checkout-session` endpoint on the backend must be accessible from the frontend origin. This is already handled by the existing CORS middleware which allows `FRONTEND_URL`. No changes required.

If Stripe Elements or Stripe.js were ever added (not recommended -- it would change the SAQ level), `js.stripe.com` would need to be in a Content-Security-Policy `frame-src` directive, but that is separate from CORS.

---

## 7. CSRF Protection for Billing Endpoints

### Current State

Parcel uses httpOnly cookies for authentication. This means billing endpoints are potentially vulnerable to CSRF -- a malicious site could trigger a POST to `/api/v1/billing/create-checkout-session` using the victim's cookies.

### Mitigation Strategy

Since Parcel already uses `SameSite=None; Secure` cookies (required for cross-origin Vercel-to-Railway requests), the standard SameSite cookie defense is not fully effective. Additional CSRF protection is needed.

**Option A: Custom Header Check (Recommended for Parcel)**

Require a custom header that browsers will not send in cross-origin simple requests:

```python
# backend/middleware/csrf.py
from fastapi import Request, HTTPException, status

BILLING_PATHS = {"/api/v1/billing/create-checkout-session", "/api/v1/billing/manage"}

async def csrf_check(request: Request):
    """Verify that state-changing billing requests include a custom header.
    Browsers enforce that custom headers trigger a CORS preflight.
    A malicious site cannot add custom headers to cross-origin requests
    unless the server's CORS policy explicitly allows the origin.
    """
    if request.method in ("POST", "PUT", "PATCH", "DELETE"):
        if request.url.path in BILLING_PATHS:
            if request.headers.get("X-Requested-With") != "parcel-client":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={"error": "CSRF check failed", "code": "CSRF_FAILED"},
                )
```

Frontend sends the header on billing calls:

```typescript
// In api.ts, for billing calls
createCheckoutSession: () =>
  request<{ url: string }>('/api/v1/billing/create-checkout-session', {
    method: 'POST',
    headers: { 'X-Requested-With': 'parcel-client' },
  }),
```

**Why this works:** The `X-Requested-With` header is not a CORS "simple header," so the browser will send a preflight OPTIONS request. If the requesting origin is not in Parcel's CORS `allow_origins` list, the preflight fails and the actual request never fires.

**Option B: Double-Submit Cookie (Alternative)**

Generate a random CSRF token, set it as a non-httpOnly cookie, and require it as a header. More complex than Option A and unnecessary given Parcel's tight CORS policy.

### Webhook Endpoint Exception

The `/api/v1/billing/webhooks/stripe` endpoint must NOT have CSRF protection. It is called by Stripe's servers, not by a browser. It is protected by Stripe signature verification instead.

---

## 8. Rate Limiting on Payment Endpoints

### Integration with Existing slowapi

Parcel already uses slowapi with `get_remote_address` as the key function. Payment endpoints need stricter limits.

```python
# In backend/routers/billing.py

from limiter import limiter

@router.post("/create-checkout-session")
@limiter.limit("5/minute")
async def create_checkout_session(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Create a Stripe Checkout Session for the Pro plan."""
    ...

@router.post("/manage")
@limiter.limit("5/minute")
async def create_portal_session(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Create a Stripe Customer Portal session for managing subscriptions."""
    ...

@router.post("/webhooks/stripe")
@limiter.limit("100/minute")
async def stripe_webhook(request: Request, ...) -> dict:
    """Stripe webhook endpoint.
    Higher limit because Stripe may send bursts during subscription changes.
    But still limited to prevent abuse if the endpoint URL leaks.
    """
    ...
```

### Recommended Rate Limits for Billing Endpoints

| Endpoint | Limit | Rationale |
|---|---|---|
| `POST /billing/create-checkout-session` | 5/min per IP | Prevent checkout abuse |
| `POST /billing/manage` | 5/min per IP | Prevent portal session spam |
| `POST /billing/webhooks/stripe` | 100/min per IP | Stripe sends bursts; Stripe IPs are known |
| `GET /billing/subscription` | 20/min per IP | Status check, cache-friendly |

### User-Based Rate Limiting (Enhancement)

For billing endpoints, rate limiting by IP alone is insufficient if users share IP addresses (corporate networks). Consider a user-based key:

```python
from slowapi import Limiter

def get_user_or_ip(request: Request) -> str:
    """Use authenticated user ID if available, fall back to IP."""
    # Peek at the access token cookie to extract user_id
    token = request.cookies.get("access_token")
    if token:
        try:
            from core.security.jwt import verify_access_token
            payload = verify_access_token(token)
            return f"user:{payload.get('sub', '')}"
        except Exception:
            pass
    return get_remote_address(request)
```

---

## 9. Logging Rules for Payment Data

### What You MUST NOT Log

- Card numbers, CVVs, expiration dates (you will never have these with Checkout, but enforce defensively)
- Full Stripe API responses (may contain `payment_method` details)
- Full webhook payloads (may contain customer email, address)
- Stripe secret keys or webhook secrets
- Any field from a Stripe `PaymentMethod` object beyond brand and last4

### What You CAN and SHOULD Log

- Stripe event ID (`evt_...`) and event type
- Checkout session ID (`cs_...`) and completion status
- Subscription ID (`sub_...`) and status changes
- Invoice ID (`in_...`) and payment status
- Customer ID (`cus_...`)
- Amount and currency (from invoice events)
- Error codes from failed payments (e.g., `card_declined`, `insufficient_funds`)
- Timestamps of all billing events

### Implementation: Structured Billing Logger

```python
# backend/core/billing/logger.py
import logging
import json

billing_logger = logging.getLogger("parcel.billing")

SAFE_FIELDS = frozenset({
    "id", "object", "type", "status", "amount", "currency",
    "customer", "subscription", "invoice", "created",
    "payment_status", "mode", "livemode",
})

def log_billing_event(event_type: str, event_id: str, **kwargs):
    """Log a billing event with only safe fields."""
    safe_data = {k: v for k, v in kwargs.items() if k in SAFE_FIELDS}
    billing_logger.info(
        "billing_event",
        extra={
            "event_type": event_type,
            "event_id": event_id,
            **safe_data,
        },
    )

def log_billing_error(event_type: str, event_id: str, error: str):
    """Log a billing error without sensitive context."""
    billing_logger.error(
        "billing_error",
        extra={
            "event_type": event_type,
            "event_id": event_id,
            "error": error,
        },
    )
```

### Log Retention

- Billing logs should be retained for a minimum of 12 months (financial audit trail).
- Logs must not be stored in publicly accessible locations.
- Railway's built-in logging retains logs for a limited period; consider forwarding billing logs to a dedicated service (e.g., Datadog, Logflare) for long-term retention.

---

## 10. Data Retention Requirements

### Billing Records Parcel Must Retain

| Data | Minimum Retention | Reason |
|---|---|---|
| Invoice records (amount, date, status) | 7 years | Tax and accounting requirements (IRS, state) |
| Subscription history (plan, start, end) | 7 years | Financial records |
| Payment failure records | 3 years | Dispute resolution |
| Webhook event IDs (idempotency) | 90 days | Operational (Stripe retries within 72 hours) |
| Stripe customer ID mapping | Life of account + 7 years | Links user to billing history |

### What Stripe Retains on Your Behalf

Stripe retains all payment records on their side indefinitely. Parcel's database records are a mirror for operational use and local audit trails. In a dispute, Stripe provides the authoritative record.

### Implementation: Soft Delete for Billing Records

Consistent with Parcel's existing soft-delete pattern (`deleted_at` column):

```python
# Billing records should NEVER be hard-deleted.
# When a user cancels, set subscription status to "canceled" but keep the row.
# When a user deletes their account, anonymize but retain financial records.
```

### Automated Cleanup

The `processed_stripe_events` idempotency table can be pruned after 90 days:

```python
# Run as a periodic task (e.g., Railway cron or background job)
def cleanup_old_webhook_events(db: Session):
    cutoff = datetime.utcnow() - timedelta(days=90)
    db.query(ProcessedStripeEvent).filter(
        ProcessedStripeEvent.processed_at < cutoff
    ).delete()
    db.commit()
```

---

## 11. GDPR Considerations

### The Tension: Right to Deletion vs. Financial Record Keeping

GDPR Article 17 grants users the right to erasure, but Article 17(3)(b) exempts data required "for compliance with a legal obligation." Tax and financial regulations (varying by jurisdiction) require retaining billing records for 5-7 years.

### Parcel's Approach: Anonymize, Don't Delete

When a user requests account deletion:

1. **Anonymize personal data** in billing records: replace name, email with `[deleted-user-{uuid}]`.
2. **Retain financial data**: amounts, dates, invoice IDs, subscription periods.
3. **Delete the Stripe customer** via `stripe.Customer.delete(cus_id)` -- Stripe handles their side.
4. **Delete all non-billing user data**: deals, pipeline cards, portfolio entries, documents, chat history.
5. **Retain anonymized billing records** for the legally required retention period.

### Implementation Sketch

```python
async def handle_gdpr_deletion(user_id: str, db: Session):
    """Process a GDPR right-to-deletion request."""
    user = db.query(User).filter_by(id=user_id).first()
    if not user:
        return

    # 1. Anonymize billing records
    placeholder = f"[deleted-user-{user_id[:8]}]"
    db.query(BillingRecord).filter_by(user_id=user_id).update({
        "user_email": placeholder,
        "user_name": placeholder,
    })

    # 2. Delete Stripe customer (removes payment methods from Stripe)
    if user.stripe_customer_id:
        try:
            stripe.Customer.delete(user.stripe_customer_id)
        except stripe.error.InvalidRequestError:
            pass  # Customer already deleted on Stripe side

    # 3. Soft-delete all non-billing user data
    for model in [Deal, PipelineCard, PortfolioEntry, Document, ChatMessage]:
        db.query(model).filter_by(user_id=user_id).update({
            "deleted_at": datetime.utcnow(),
        })

    # 4. Anonymize the user record
    user.email = f"deleted-{user_id[:8]}@anonymized.parceldesk.io"
    user.name = placeholder
    user.password_hash = ""
    user.deleted_at = datetime.utcnow()

    db.commit()
```

### GDPR Disclosure Requirements

Parcel's privacy policy must disclose:

- What billing data is collected (email, subscription plan, payment amounts)
- That Stripe processes payments as a third-party processor
- That billing records are retained for 7 years per financial regulations
- How to request data export or deletion
- Stripe's own privacy policy link

---

## 12. Fraud Prevention

### Stripe Radar (Included Free with Stripe)

Stripe Radar is a machine learning fraud detection system included with every Stripe account. It evaluates every payment for fraud risk.

**Default Radar rules (active automatically):**
- Block payments from known fraudulent IPs and card fingerprints
- Block payments with high-risk CVC or postal code check failures
- Block payments from disposable email domains (configurable)
- Evaluate device fingerprint, geolocation, velocity, and behavioral signals

**Radar rules Parcel should enable:**
- Block if CVC check fails
- Block if postal code check fails
- Review if risk score > 65 (manual review in Stripe Dashboard)
- Block if more than 3 failed attempts on the same card in 1 hour

### Parcel Application-Level Fraud Signals

```python
# Suspicious patterns to monitor on the Parcel side:
FRAUD_INDICATORS = [
    "Multiple checkout sessions created without completion (> 5/hour)",
    "Rapid plan upgrades/downgrades (churning for trial abuse)",
    "Account created and immediately upgraded (no organic usage)",
    "Multiple accounts from the same IP with different cards",
    "Subscription created then immediately disputed",
]
```

### Monitoring Checklist

- [ ] Enable Stripe email notifications for: disputes, failed payments, high-risk payments
- [ ] Set up a Slack/email alert when `invoice.payment_failed` fires 3+ times for one customer
- [ ] Monitor `charge.dispute.created` events and respond within 7 days
- [ ] Review the Stripe Radar dashboard weekly during the first 3 months post-launch

### Dispute Handling

When a chargeback occurs (`charge.dispute.created` webhook):

1. Immediately downgrade the user's plan to free (prevent service theft during dispute).
2. Gather evidence: account creation date, login history, feature usage logs.
3. Submit evidence via Stripe Dashboard within 7 days.
4. If the dispute is lost, the user remains on the free tier and must re-subscribe.

---

## 13. Secure Key Rotation

### When to Rotate Stripe Keys

- **Immediately**: If a key is suspected compromised (committed to git, exposed in logs, employee departure)
- **Periodically**: Every 12 months as a best practice
- **On environment change**: When migrating between Stripe accounts

### Rotation Procedure for `STRIPE_SECRET_KEY`

1. Generate a new restricted key in Stripe Dashboard > Developers > API Keys.
2. Update the key in Railway's environment variables.
3. Deploy the backend (Railway auto-deploys on env var change).
4. Verify: hit the health check, create a test checkout session.
5. Revoke the old key in Stripe Dashboard ONLY after confirming the new key works.
6. Verify again: ensure no errors in logs from the old key being used.

**Total downtime: zero** (Railway env var updates trigger a new deploy; the old instance serves requests until the new one is healthy).

### Rotation Procedure for `STRIPE_WEBHOOK_SECRET`

This is more delicate because in-flight webhook deliveries signed with the old secret will fail verification during rotation.

1. Create a new webhook endpoint in Stripe Dashboard (same URL, same events).
2. Note the new `whsec_...` signing secret.
3. Temporarily accept BOTH secrets in the webhook handler:

```python
def verify_webhook(payload: bytes, sig_header: str) -> stripe.Event:
    secrets = [
        os.getenv("STRIPE_WEBHOOK_SECRET"),
        os.getenv("STRIPE_WEBHOOK_SECRET_PREVIOUS"),  # Old secret during rotation
    ]
    for secret in secrets:
        if not secret:
            continue
        try:
            return stripe.Webhook.construct_event(payload, sig_header, secret)
        except stripe.error.SignatureVerificationError:
            continue
    raise stripe.error.SignatureVerificationError("No valid signature found", sig_header)
```

4. Deploy with both secrets set.
5. Delete the old webhook endpoint in Stripe Dashboard.
6. Remove `STRIPE_WEBHOOK_SECRET_PREVIOUS` after 24 hours.

### Key Storage Security

- Railway and Vercel both encrypt environment variables at rest.
- Never echo keys in CI/CD logs (`ci.yml` should not print env vars).
- Use Stripe's restricted keys in production with minimum required permissions.
- The publishable key (`pk_`) is safe to expose in frontend code -- it is designed for client-side use.

---

## 14. Incident Response Plan

### Severity Levels

| Level | Definition | Example | Response Time |
|---|---|---|---|
| SEV-1 | Active data breach or key compromise | Stripe secret key exposed publicly | Immediate (< 15 min) |
| SEV-2 | Payment processing failure | Webhooks not being received | < 1 hour |
| SEV-3 | Billing anomaly | Unusual spike in failed payments | < 4 hours |
| SEV-4 | Minor billing issue | Single customer payment retry needed | < 24 hours |

### SEV-1: Key Compromise Runbook

1. **Revoke the compromised key immediately** in Stripe Dashboard.
2. **Generate a new key** and deploy to Railway.
3. **Audit access**: Check Railway deploy logs, CI/CD logs, git history for the compromised value.
4. **Check for unauthorized charges**: Review Stripe Dashboard > Payments for unfamiliar transactions in the last 72 hours.
5. **If charges found**: Contact Stripe support immediately to flag fraudulent activity.
6. **Notify affected users** if their data (even non-card data like email) was potentially accessed.
7. **Post-incident review** within 48 hours: document root cause, update procedures.

### SEV-2: Webhook Failure Runbook

1. **Check Railway logs** for the billing service. Look for 4xx/5xx on the webhook endpoint.
2. **Check Stripe Dashboard > Webhooks** for failed delivery attempts.
3. Stripe retries failed webhooks for up to 72 hours with exponential backoff.
4. **If the endpoint is down**: Fix and deploy. Stripe will automatically retry pending events.
5. **If events were missed**: Use `stripe.Event.list()` API to replay events from the missed period.
6. **Verify idempotency**: The `ProcessedStripeEvent` table ensures replayed events are not double-processed.

### SEV-3: Dispute Surge Runbook

1. **More than 3 disputes in a week**: Stripe may place the account under review.
2. **Check for a common pattern**: Same IP, same card BIN, same plan.
3. **Enable Radar rule**: Block the identified fraud pattern.
4. **Respond to all disputes** within Stripe's deadline (typically 7-21 days).
5. **Stripe dispute rate must stay below 0.75%** to avoid account restrictions.

### Communication Template

```
Subject: [Parcel] Billing Security Incident - [SEV-X] - [Date]

What happened:
[Brief description]

What data was affected:
[Scope of impact - number of users, type of data]

What we've done:
[Immediate actions taken]

What we're doing next:
[Remediation plan]

What you should do:
[User action items, if any]
```

---

## Compliance Checklist

### Pre-Launch

- [ ] Stripe Checkout (redirect mode) is used -- no card fields on `parceldesk.io`
- [ ] `STRIPE_SECRET_KEY` is set only in Railway env vars, never in code or git
- [ ] `STRIPE_WEBHOOK_SECRET` is set only in Railway env vars
- [ ] Webhook endpoint verifies `stripe-signature` header on every request
- [ ] Webhook endpoint reads raw body before JSON parsing
- [ ] Event idempotency table prevents double-processing
- [ ] Rate limits applied to all billing endpoints
- [ ] CSRF protection on `create-checkout-session` and `manage` endpoints
- [ ] Billing logger filters out sensitive fields
- [ ] No card data fields exist in any PostgreSQL table
- [ ] `success_url` and `cancel_url` use HTTPS
- [ ] HSTS header configured on both frontend and backend

### Post-Launch (Ongoing)

- [ ] Complete SAQ A self-assessment questionnaire annually
- [ ] Rotate Stripe API keys every 12 months
- [ ] Review Stripe Radar rules quarterly
- [ ] Monitor dispute rate (must stay below 0.75%)
- [ ] Audit billing logs for accidental sensitive data exposure monthly
- [ ] Test webhook failure recovery procedures quarterly
- [ ] Review and update this security document annually

---

## RECOMMENDATIONS FOR PARCEL

Prioritized implementation plan for billing security, ordered by risk mitigation impact.

### P0 -- Must Have Before First Charge

1. **Use Stripe Checkout redirect mode exclusively.** Never embed card fields on `parceldesk.io`. This keeps Parcel at SAQ A and eliminates PCI scope almost entirely.

2. **Implement webhook signature verification exactly as shown in Section 3.** Read raw body with `await request.body()`, verify with `stripe.Webhook.construct_event()`, reject on any verification failure. This is the single most important security control for billing.

3. **Add an event idempotency table** (`processed_stripe_events`) with a unique constraint on `event_id`. Check before processing, insert after. Stripe will retry webhooks -- double-processing causes billing errors.

4. **Validate environment consistency at startup** (Section 5). Reject `sk_live_` keys in development and `sk_test_` keys in production. A single misconfiguration here can charge real cards in testing or use test mode in production.

5. **Never log full webhook payloads or Stripe API responses.** Log only event IDs, types, amounts, and status codes. Implement the safe-field filter from Section 9 from day one -- it is much harder to retroactively scrub logs.

### P1 -- Must Have Before Public Launch

6. **Add CSRF protection to billing endpoints** using the custom header approach (Section 7). The `X-Requested-With` header forces a CORS preflight, which blocks cross-origin form submissions. Exempt the webhook endpoint.

7. **Apply strict rate limits to billing endpoints** (Section 8). 5/minute on checkout session creation and portal session creation. 100/minute on the webhook endpoint. Integrate with the existing slowapi setup.

8. **Configure HSTS headers** on both Railway (backend middleware) and Vercel (`vercel.json`). This prevents SSL stripping attacks on billing-related redirects.

9. **Set up Stripe webhook event monitoring.** At minimum: email alerts for `charge.dispute.created`, `invoice.payment_failed` (3+ for same customer), and any `charge.fraud_warning` events.

10. **Document and test the key rotation procedure** (Section 13) before launch. You do not want to learn this process during an incident. Run through it once with test keys.

### P2 -- Should Have Within 30 Days of Launch

11. **Implement the GDPR account deletion flow** (Section 11). Anonymize billing records, delete the Stripe customer, soft-delete all non-billing data. This must be in place before EU users sign up.

12. **Create a dispute response process.** Designate who monitors the Stripe Dashboard for disputes, set a calendar reminder for response deadlines, and prepare evidence templates (account activity logs).

13. **Enable Stripe Radar rules** beyond the defaults: block on CVC failure, block on postal code failure, and set a review threshold for risk scores above 65.

14. **Set up long-term billing log retention.** Railway's built-in log retention is limited. Forward billing-specific logs (the `parcel.billing` logger) to a service with 12+ month retention for audit compliance.

15. **Write the privacy policy billing section** disclosing what data Stripe collects, how long financial records are retained, and how users can request deletion.

### P3 -- Best Practice Improvements

16. **Schedule annual SAQ A self-assessment.** Set a recurring calendar event. The questionnaire is 12 questions and takes under 30 minutes.

17. **Implement automated webhook failure alerting.** If the webhook endpoint returns 5xx for more than 5 minutes, alert via Slack or email. Stripe retries, but prolonged failures cause subscription state drift.

18. **Add the `validate_no_card_data` guard** (Section 2) to any function that writes to the database. This is a defense-in-depth measure -- Stripe Checkout means card data should never reach Parcel, but the guard catches future developer mistakes.

19. **Conduct a quarterly billing security review.** Check: Are keys rotated? Is the dispute rate healthy? Are logs clean of sensitive data? Are Radar rules current? 15-minute checklist.

20. **Build the dual-secret webhook verification** (Section 13) into the codebase from the start, even if `STRIPE_WEBHOOK_SECRET_PREVIOUS` is empty. When rotation day comes, you just set the env var -- no code change needed.
