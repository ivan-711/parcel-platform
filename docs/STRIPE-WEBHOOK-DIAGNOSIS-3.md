# Stripe Webhook Diagnosis #3: customer.subscription.deleted → 500

**Date:** 2026-04-18
**Event:** evt_1TNfePPgBQx44rxbNm3AcNmQ
**After commit:** c0ea193 (StripeObject boundary conversion)

## TL;DR

`event["data"].to_dict()` produces `Decimal` values for `plan.amount_decimal` and `price.unit_amount_decimal` (Stripe SDK v15 type coercion on typed classes). `json.dumps()` in SQLAlchemy JSONB serialization can't serialize `Decimal`, so `db.commit()` at `webhooks/__init__.py:110` raises `TypeError` before the webhook_events row is inserted. Fix: sanitize the payload with a Decimal→float pass before JSONB storage.

## Full traceback (Railway logs)

```
sqlalchemy.exc.StatementError: (builtins.TypeError) Object of type Decimal is not JSON serializable

  File "/opt/venv/lib/python3.11/site-packages/sqlalchemy/sql/sqltypes.py", line 2801, in process
    return json_serializer(value)
  File "/root/.nix-profile/lib/python3.11/json/__init__.py", line 231, in dumps
    return _default_encoder.encode(obj)
  File "/root/.nix-profile/lib/python3.11/json/encoder.py", line 200, in encode
    chunks = self.iterencode(o, _one_shot=True)
  File "/root/.nix-profile/lib/python3.11/json/encoder.py", line 258, in iterencode
    return _iterencode(o, 0)
  File "/root/.nix-profile/lib/python3.11/json/encoder.py", line 180, in default
    raise TypeError(f'Object of type {o.__class__.__name__} is not JSON serializable')
TypeError: Object of type Decimal is not JSON serializable

[SQL: INSERT INTO webhook_events (..., payload, ...) VALUES (..., %(payload)s::JSONB, ...)]
[parameters: {'stripe_event_id': 'evt_1TNfePPgBQx44rxbNm3AcNmQ',
              'event_type': 'customer.subscription.deleted', ...}]
```

**Crash site:** `webhooks/__init__.py:110` → `db.commit()` for the WebhookEvent INSERT.
This is BEFORE handler dispatch (line 120), which is why:
- No webhook_events row exists
- No error field captured
- Handler never runs
- subscription.status stays "active", user.plan_tier stays "pro"

## Root cause mechanism

Stripe SDK v15 `construct_from` recognizes nested `"object": "plan"` and
`"object": "price"` markers and constructs typed `Plan` / `Price` instances
(not generic `StripeObject`). These typed classes coerce `*_decimal` string
fields into `decimal.Decimal`:

```
JSON from Stripe API:  "amount_decimal": "7900"   (string)
After json.loads():    "amount_decimal": "7900"    (str — standard parser, no Decimal)
After construct_from:  "amount_decimal": Decimal('7900')  (SDK type coercion)
After .to_dict():      "amount_decimal": Decimal('7900')  (preserved)
```

A full subscription object has two Decimal fields:
```
.object.plan.amount_decimal           = Decimal('7900')
.object.items.data[0].price.unit_amount_decimal = Decimal('7900')
```

`json.dumps()` (Python stdlib, used by SQLAlchemy JSONB) has no default
handler for `Decimal` → `TypeError`.

## Why checkout.session.completed worked

The checkout event's `data.object` is a `checkout.session` — it has no
nested `Plan` or `Price` objects with `*_decimal` fields. No Decimal
values → no serialization crash.

## Test fixture vs real Stripe event shape

| Field | Test fixture | Real Stripe event | Impact |
|-------|-------------|-------------------|--------|
| `plan` | **absent** | Full Plan object with `amount_decimal` | **Decimal not triggered in test** |
| `items.data[0].price` | `{"id": "price_test_carbon_monthly"}` | Full Price with `unit_amount_decimal` | **Decimal not triggered in test** |
| `quantity` | absent | `1` (int) | None |
| `discount` | absent | `null` | None |
| `cancellation_details` | absent | Object with `comment`, `feedback`, `reason` | None |
| `payment_settings` | absent | Object with `payment_method_options`, etc. | None |
| `trial_settings` | absent | Object with `end_behavior` | None |

The test fixture creates minimal objects via `construct_from` with plain
dicts. Even if `amount_decimal: "7900"` were included as a string, generic
`StripeObject.construct_from` does NOT convert to Decimal. Only typed
subclasses (`Plan`, `Price`) do the coercion — and they're only instantiated
when the dict contains `"object": "plan"` or `"object": "price"`.

The test DB is SQLite with a JSON column (not PostgreSQL JSONB). SQLite's
JSON handling may also differ in serialization behavior.

## Proposed fix (NOT APPLIED)

**File:** `backend/routers/webhooks/__init__.py`

**Option A — minimal, at the crash site (line 106):**

```python
import decimal
import json

# Line 106: sanitize Decimal values before JSONB storage
_raw = event["data"].to_dict()
payload = json.loads(json.dumps(_raw, default=float))
```

`default=float` converts `Decimal('7900')` → `7900.0` (float). The
JSON round-trip guarantees the entire dict is JSON-serializable.

**Option B — also sanitize event_data (line 90) for safety:**

```python
# Line 90
_raw_data = event["data"]["object"].to_dict()
event_data = json.loads(json.dumps(_raw_data, default=float))
```

Line 90's `event_data` is passed to handlers but not stored in JSONB,
so it doesn't currently crash. But future code might serialize it.

**Option C — test fixture fix (prevent regression):**

Update `_make_stripe_event` helper to include `plan` and `price` objects
with `*_decimal` fields and `"object": "plan"` / `"object": "price"`
markers, so `construct_from` produces typed objects with Decimal coercion.
This ensures the test exercises the same code path as production.

## Why the test didn't catch it

1. **Missing fixture fields:** Test subscription has no `plan` key and
   `price` has only `{"id": ...}` without `"object": "price"` or
   `*_decimal` fields.
2. **construct_from type coercion requires `"object"` marker:** Without
   `"object": "plan"`, the SDK creates a generic `StripeObject` that
   does NOT convert strings to Decimal.
3. **Test DB is SQLite, not PostgreSQL:** SQLite JSON column may use
   different serialization than PostgreSQL JSONB.
4. **Only `event_data` (line 90) is tested via handler assertions:**
   The `payload` (line 106) serialization path is never explicitly
   tested — it's implicitly tested only if `db.commit()` succeeds,
   which it does in SQLite with non-Decimal values.
