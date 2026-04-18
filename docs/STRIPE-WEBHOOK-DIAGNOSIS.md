# Stripe webhook diagnosis — 2026-04-18

## Root cause

The webhook handler at `backend/routers/webhooks/__init__.py:106` stores `event["data"]` (a Stripe SDK `Data` object) directly into the JSONB `payload` column. SQLAlchemy's JSONB type calls `json.dumps()` on it, which fails with `TypeError: Object of type Data is not JSON serializable`. The webhook returns 500, Stripe retries, gets 500 again, and gives up. The checkout payment succeeds on Stripe's side but the user's `plan_tier` is never updated because the handler crashes before reaching the dispatch logic.

## Evidence

### Railway logs show the exact error

```
POST /webhooks/stripe HTTP/1.1  500 Internal Server Error

TypeError: Object of type Data is not JSON serializable

File "/app/routers/webhooks/__init__.py", line 110, in stripe_webhook
[SQL: INSERT INTO webhook_events (..., payload, ...) VALUES (..., %(payload)s::JSONB, ...)]
```

Stripe sent `checkout.session.completed` (event `evt_1TNdTdPgBQx44rxbws4dgsMU`) at least twice. Both attempts returned 500. No rows were inserted into `webhook_events` and no subscription was created.

### The failing code

```python
# webhooks/__init__.py:102-110
if not existing:
    event_row = WebhookEvent(
        stripe_event_id=event_id,
        event_type=event_type,
        payload=event["data"],       # ← BUG: Stripe Data object, not dict
        processed=False,
    )
    db.add(event_row)
    db.commit()                      # ← Crash: json.dumps(Data) fails
```

`event["data"]` is a `stripe.stripe_object.StripeObject` (subclass `Data`). It has a `__repr__` that looks like JSON but is not serializable by Python's standard `json.dumps()`.

### What works vs. what's broken

| Component | Status |
|-----------|--------|
| Webhook route reachable | OK — POST /webhooks/stripe returns responses |
| Signature verification | OK — passes (handler reaches line 102) |
| Checkout session creation | OK — `cs_test_b1H8Ztze77DGucXHDXqYU9PR5IYZtJml8xciuGgOEJKBLxQeZQJBAgfXuy` created |
| Stripe charges user | OK — $79 charged in test mode |
| Redirect to /dashboard?checkout=success | OK — user sees toast |
| Webhook event storage | BROKEN — `json.dumps(Data)` raises TypeError |
| Handler dispatch (plan_tier update) | NEVER REACHED — crash happens before dispatch |

## Fix (proposed, not applied)

### Code fix (one line)

In `backend/routers/webhooks/__init__.py:106`, change:

```python
payload=event["data"],
```

to:

```python
payload=event["data"].to_dict_recursive(),
```

`to_dict_recursive()` is the Stripe SDK method that converts the nested `StripeObject` tree into plain Python dicts that `json.dumps()` can serialize.

Alternative (less clean but also works):

```python
import json
payload=json.loads(str(event["data"])),
```

### After deploying the fix

1. **Manually re-trigger the webhook** from Stripe Dashboard:
   - Go to Stripe Dashboard → Developers → Webhooks → find the endpoint
   - Find event `evt_1TNdTdPgBQx44rxbws4dgsMU`
   - Click "Resend" — this will re-POST the original checkout.session.completed
   - The handler should now succeed: insert webhook_events row, create subscription, set plan_tier="pro"

2. **Alternatively**, manually update the user if the webhook event has expired:
   ```sql
   UPDATE users SET plan_tier = 'pro', updated_at = NOW()
   WHERE id = '5d14f717-413c-4e52-a20f-6fc0aea0d51d';
   ```
   And create the subscription row manually or via `stripe.Subscription.retrieve()`.

3. **Verify** by re-querying:
   ```sql
   SELECT plan_tier, stripe_customer_id FROM users
   WHERE email = 'legacypaintingwi@gmail.com';
   -- Expected: plan_tier = 'pro'
   ```

### Stripe Dashboard check

Verify the webhook endpoint is configured correctly:
- URL should be: `https://api.parceldesk.io/webhooks/stripe`
- Events to listen for should include: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- The signing secret in the dashboard must match `STRIPE_WEBHOOK_SECRET` on Railway

## How this wasn't caught earlier

1. **No integration test for the webhook handler.** The backend test suite has no test that POSTs a mock Stripe event to `/webhooks/stripe` and verifies the plan_tier update. The `test_clerk_webhooks.py` file tests Clerk webhooks but there is no `test_stripe_webhooks.py`.

2. **The bug only manifests with real Stripe SDK objects.** In a unit test that passes a plain dict as `event["data"]`, the JSONB insert would succeed because dicts are JSON serializable. The `Data` type only appears when using `stripe.Webhook.construct_event()` with a real (or realistically-mocked) payload.

3. **The checkout flow appeared to work** because Stripe processed the payment and the frontend showed a success toast based on the URL redirect (not the webhook). The webhook failure is silent from the user's perspective — they see "subscription active" but the backend never processes it.

### Recommended test coverage

Add `backend/tests/test_stripe_webhooks.py` with:
- `test_checkout_session_completed_updates_plan_tier` — POST a realistic event payload (plain dict, not SDK object) to `/webhooks/stripe` with a mocked signature, assert `plan_tier` changes from `"free"` to `"pro"` and `subscriptions` row is created.
- `test_webhook_idempotency` — same event twice returns 200 without duplicate processing.
- `test_webhook_invalid_signature` — bad signature returns 400.
