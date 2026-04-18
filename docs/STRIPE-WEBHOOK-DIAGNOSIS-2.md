# Stripe webhook dispatch diagnosis — 2026-04-18 Part 2

## Root cause

Fix a094d95 solved the serialization crash (bug #1) and converted `event_data` to a plain dict for the handler (bug #2). But the `_handle_checkout_session_completed` handler at line 166 calls `stripe.Subscription.retrieve()` which returns a live StripeObject. That StripeObject is passed to `_resolve_plan_from_subscription()` which calls `stripe_sub.metadata.get("parcel_plan")` at `stripe_service.py:265`. StripeObject v15 doesn't support `.get()` → `AttributeError: get` → handler fails → `processed` stays `False`, `error` = `"get"`, `retry_count` = 2.

The webhook event was stored successfully (serialization fix works), but dispatch never completed because `.get()` on a Stripe API return object is a third instance of the same class of bug: StripeObject v15 removed dict-compatible `.get()`.

## Evidence

### Railway logs (verbatim)
```
stripe_service.py:265: _resolve_plan_from_subscription
    plan = stripe_sub.metadata.get("parcel_plan")
           ^^^^^^^^^^^^^^^^^^^^^^^
AttributeError: get
```

Two identical failures: `retry_count=2`, both with error `"get"`.

### Production DB state
```
webhook_events:
  stripe_event_id: evt_1TNdTdPgBQx44rxbws4dgsMU
  event_type: checkout.session.completed
  processed: False
  error: "get"
  retry_count: 2

  payload.object.client_reference_id: "5d14f717-413c-4e52-a20f-6fc0aea0d51d"  ← correct user
  payload.object.customer: "cus_UMMABlHs2lmShb"  ← correct customer
  payload.object.subscription: "sub_1TNdTbPgBQx44rxbdgsVDEAH"  ← subscription exists in Stripe
  payload.object.metadata: {}  ← session metadata is empty (normal — plan metadata is on the subscription, not the session)
```

### Call chain that fails
```
webhooks/__init__.py:120  handler_fn(db, event_data)        ← event_data is a dict (fix #2 works)
webhooks/__init__.py:150  data.get("client_reference_id")   ← works (dict)
webhooks/__init__.py:166  stripe.Subscription.retrieve(id)  ← returns StripeObject
webhooks/__init__.py:174  _resolve_plan_from_subscription(stripe_sub)
stripe_service.py:265     stripe_sub.metadata.get(...)      ← CRASH: StripeObject has no .get()
```

### Local verification
```python
>>> sub = stripe.Subscription.construct_from({'metadata': {'parcel_plan': 'pro'}}, 'sk')
>>> sub.metadata.get("parcel_plan")
AttributeError: get
>>> sub.metadata.to_dict().get("parcel_plan")
'pro'
```

## Proposed fix

### Code change (one line)

**File:** `backend/core/billing/stripe_service.py:265`

Change:
```python
plan = stripe_sub.metadata.get("parcel_plan")
```
to:
```python
plan = stripe_sub.metadata.to_dict().get("parcel_plan")
```

This converts the StripeObject metadata to a plain dict before calling `.get()`. Verified locally that `.to_dict()` works on StripeObject metadata in stripe v15.

### Also scan for similar `.get()` on Stripe objects

Only line 265 calls `.get()` on a Stripe API return value. Lines 270 and 275 call `.get()` on plain Python dicts (`_legacy` and `price_map`). No other `.get()` calls on StripeObjects exist in `stripe_service.py`.

### Test fix

Update `_make_stripe_subscription()` in `test_stripe_webhook.py` to use a StripeObject for metadata instead of a plain dict, so the test catches this class of bug:

```python
sub.metadata = stripe.StripeObject.construct_from({"parcel_plan": "pro"}, "sk_test_fake")
```

Or simpler: test `_resolve_plan_from_subscription` directly with a real StripeObject.

### After deploying the fix

The webhook_events row already exists with `processed=False`. On the next Stripe resend:
1. Idempotency check finds the existing row with `processed=False` → proceeds to dispatch
2. `_resolve_plan_from_subscription()` now uses `.to_dict().get()` → succeeds → returns `"pro"`
3. User `plan_tier` flips to `"pro"`, subscription row created
4. `processed` set to `True`

**Ivan resends from Stripe Dashboard after deploy.**

No manual DB patch needed — the existing row will be reprocessed correctly.

## Why the test missed this

`_make_stripe_subscription()` uses `MagicMock` with `sub.metadata = {"parcel_plan": "pro"}` — a plain dict where `.get()` works. The real Stripe API returns `sub.metadata` as a `StripeObject` where `.get()` doesn't work in SDK v15. The test should use a real StripeObject for metadata to catch this class of bug.
