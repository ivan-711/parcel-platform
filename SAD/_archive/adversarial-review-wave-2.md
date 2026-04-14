# PARCEL Adversarial Review — Wave 2

Reviewed `SAD/CANONICAL-PRODUCT-BLUEPRINT.md`, the four prior adversarial reviews, and the Wave 2 financing backend/frontend files plus adjacent auth/today code they depend on. `pytest` could not be executed here because `pytest` is not installed. `frontend/npm run build` currently fails, and Wave 2 contributes additional TypeScript errors in the financing UI.

## Critical Issues (must fix before Wave 3)

### 1. Payment posting corrupts balances depending on which UI path is used
- File path: `backend/routers/financing.py:586-644`, `backend/routers/financing.py:696-749`, `frontend/src/pages/financing/ObligationsPage.tsx:426-491`, `frontend/src/components/financing/RecordPaymentModal.tsx:43-58`
- What the problem is: `POST /api/financing/obligations/{id}/complete` subtracts the full `payment_amount` from `current_balance`, while `POST /api/financing/payments` subtracts only `principal_portion`. The inline obligation-complete form collects only amount/date/method, and `RecordPaymentModal` has no principal-and-interest auto-calculation, so the same monthly payment can either over-reduce the balance or not reduce it at all.
- Why it matters: Carlos will see the wrong payoff balance, wrong spread, wrong debt KPIs, and wrong balloon exposure depending on which button he clicked.
- Specific suggested fix: Move both endpoints onto one amortization-aware payment-posting service that uses `Decimal`, computes or validates principal/interest for regular payments, updates balances from principal only, and rejects regular payments without a valid split.

### 2. Snoozed obligations disappear permanently
- File path: `backend/routers/financing.py:456-583`, `backend/routers/today.py:445-599`, `frontend/src/pages/financing/ObligationsPage.tsx:61-65`, `frontend/src/pages/financing/ObligationsPage.tsx:392-527`
- What the problem is: the snooze flow changes `status` to `"snoozed"`, but every financing list/briefing query filters on `status == "active"`. There is no `snoozed_until` field and no resurfacing logic.
- Why it matters: a snoozed balloon, insurance renewal, or monthly payment can fall out of Parcel forever. Missing a creative-finance deadline is a trust-destroying product failure.
- Specific suggested fix: model snoozing with `snoozed_until` instead of a terminal status, keep the obligation active, exclude it only while the snooze date is in the future, and re-invalidate Today when snooze state changes.

### 3. Wrap relationships can be patched into circular and cross-tenant references
- File path: `backend/routers/financing.py:164-176`, `backend/routers/financing.py:377-405`, `backend/routers/financing.py:890-905`, `backend/models/financing_instruments.py:57-63`, `backend/alembic/versions/j0e1f2g3h4i5_add_financing_instrument_obligation_payment.py:60-88`
- What the problem is: create validates `underlying_instrument_id`; update does not. Nothing prevents self-reference, A->B->A cycles, or linking a wrap to another user's instrument if the UUID is known. The read paths then resolve the underlying row by `id` only.
- Why it matters: this is both a data-integrity bug and a data-exposure bug. Cycles break the financing graph, and a poisoned FK can leak another user's rate/payment into wrap spread responses.
- Specific suggested fix: validate `underlying_instrument_id` on update, require same owner and same property, reject self/descendant cycles, and always filter underlying lookups by the current user.

### 4. Balloon modeling is incomplete end-to-end
- File path: `backend/core/financing/obligation_engine.py:59-76`, `backend/schemas/financing.py:28-35`, `backend/schemas/financing.py:87-91`, `frontend/src/components/financing/AddInstrumentModal.tsx:83-124`, `frontend/src/components/financing/AddInstrumentModal.tsx:347-374`
- What the problem is: the backend creates balloon obligations with `amount=None` when `balloon_amount` is omitted, and the frontend does not collect `amortization_months` or `first_payment_date`, so the system cannot derive balloon balances from the actual amortization structure.
- Why it matters: seller-finance and wrap deals commonly use short terms with longer amortization. Right now Parcel cannot model that accurately unless the user hand-calculates and types the balloon amount.
- Specific suggested fix: expose `amortization_months` and `first_payment_date` in the modal, and compute/stamp the balloon amount server-side whenever `has_balloon` is true and terms are sufficient.

## Security Issues (fix immediately)

### 1. `POST /api/financing/payments` trusts arbitrary `property_id` and unrelated `obligation_id`
- File path: `backend/schemas/financing.py:251-267`, `backend/routers/financing.py:701-737`
- What the problem is: the route validates only `instrument_id`. It accepts any `property_id` in the body, and if `obligation_id` is present it never checks that the obligation belongs to the same instrument/property.
- Why it matters: one request can reduce Instrument A's balance, advance Obligation B, and attach the payment row to Property C. If Property C is another user's UUID, that becomes a cross-tenant write and later leaks through address resolution in summaries.
- Specific suggested fix: derive `property_id` from the validated instrument, and when `obligation_id` is present require exact instrument/property/user match before committing.

### 2. JWT audience / issuer checking is still not fully enforced
- File path: `backend/core/security/jwt.py:81-147`, `backend/core/security/clerk.py:94-106`
- What the problem is: legacy JWT verification still allows missing issuer and has no audience contract. Clerk verification only enforces audience if `CLERK_JWT_AUDIENCE` happens to be configured.
- Why it matters: this was called out in every prior review. The financing module is now carrying sensitive balances, rates, and payment history behind an auth boundary that is still weaker than it should be.
- Specific suggested fix: require issuer and audience for both token systems and fail fast at startup when the corresponding config is missing.

### 3. Underlying-instrument read paths blindly trust poisoned foreign keys
- File path: `backend/routers/financing.py:164-176`, `backend/routers/financing.py:285-295`, `backend/routers/financing.py:894-905`
- What the problem is: once a bad `underlying_instrument_id` exists, list/detail/dashboard resolve it without `created_by` checks.
- Why it matters: the update hole above becomes an actual data-leak path for another user's monthly payment and interest rate.
- Specific suggested fix: filter every underlying-instrument lookup by `created_by == current_user.id` and same-property constraints, not just by primary key.

## Financial Accuracy Issues (verify or fix — investor trust depends on this)

### 1. Add Instrument auto-calculation fails on 0% loans and month-end dates
- File path: `frontend/src/components/financing/AddInstrumentModal.tsx:65-81`
- What the problem is: the payment calculator returns `null` for `rate <= 0`, and maturity is computed with browser `Date.setMonth()`, which can roll `Jan 31 + 1 month` into March and can shift by timezone.
- Why it matters: 0% seller-finance is common. Wrong maturity dates cascade into wrong obligations, wrong balloon timing, and wrong dashboard alerts.
- Specific suggested fix: handle zero-interest as `balance / term`, and move month math to the backend or a shared helper that mirrors `_add_months()`.

### 2. Negative and negatively amortizing inputs are accepted without warning
- File path: `backend/schemas/financing.py:15-74`, `backend/schemas/financing.py:251-267`, `backend/core/financing/amortization.py:21-48`, `frontend/src/components/financing/RecordPaymentModal.tsx:108-174`, `frontend/src/pages/financing/ObligationsPage.tsx:446-485`
- What the problem is: no schema enforces positive amounts/rates/terms, the amortization calculator will emit negative principal and growing balances, and both payment UIs accept negative values.
- Why it matters: one accidental minus sign can increase a balance, fabricate cash flow, or make a negative-amortization loan look like a normal schedule.
- Specific suggested fix: add `gt=0` / `ge=0` validators, explicitly flag negative amortization in schedules, and reject negative payment/principal inputs.

### 3. Due-on-sale risk defaults are based on the wrong field
- File path: `backend/routers/financing.py:340-345`, `frontend/src/pages/financing/FinancingDashboardPage.tsx:150-158`
- What the problem is: the auto-risk map keys on `rate_type`, but the UI sends `fixed|adjustable|interest_only`. In practice, almost every sub-to instrument defaults to `"high"` regardless of actual loan program.
- Why it matters: Carlos's due-on-sale monitor becomes fabricated signal. That undermines one of the core moat features.
- Specific suggested fix: add a real loan-program field if you want program-based defaults, or make `due_on_sale_risk` an explicit required user choice.

### 4. "Monthly" payment summary numbers are averaged over months-with-activity only
- File path: `backend/routers/financing.py:757-830`
- What the problem is: `months_count = max(len(monthly_buckets), 1)` divides by active months, not by the full trailing window.
- Why it matters: one payment in one month can look like a stable monthly run rate.
- Specific suggested fix: either relabel the metric to "average active month" or divide over a fixed trailing period / use scheduled obligations for run-rate.

### 5. Instrument detail amortization dates are anchored to today, not the real due schedule
- File path: `backend/routers/financing.py:297-306`, `backend/core/financing/obligation_engine.py:18-28`
- What the problem is: the amortization table always starts at `date.today()` instead of the instrument's actual next due date.
- Why it matters: the balance path may be roughly right, but the dated schedule shown to the user is not.
- Specific suggested fix: seed the schedule from the monthly obligation's `next_due` or the real `first_payment_date`.

## High Priority

### 1. Financing instruments lack real domain constraints
- File path: `backend/models/financing_instruments.py:23-80`, `backend/schemas/financing.py:15-116`, `backend/alembic/versions/j0e1f2g3h4i5_add_financing_instrument_obligation_payment.py:33-91`
- What the problem is: `instrument_type`, `status`, and `due_on_sale_risk` are free-form strings; `position`, `term_months`, and balances can be zero/negative; several money columns use `Numeric(10,2)` instead of the requested `Numeric(14,2)`.
- Why it matters: invalid financing states can enter through the API or the DB, and the schema is already drifting from the blueprint.
- Specific suggested fix: replace free-form strings with enums/check constraints, require positive integers where needed, and normalize money precision to the agreed contract.

### 2. Financing list/detail endpoints are query-heavy
- File path: `backend/routers/financing.py:130-176`, `backend/routers/financing.py:203-248`, `backend/routers/financing.py:456-561`, `backend/routers/financing.py:841-920`
- What the problem is: `list_instruments` does 1 count + 1 list + up to 2 extra lookups per row; `list_obligations` and `upcoming_obligations` do 2 extra lookups per obligation; `dashboard` does per-balloon, per-wrap, and per-sub-to property/instrument lookups.
- Why it matters: a real portfolio will turn these into noticeable latency spikes.
- Specific suggested fix: batch-join properties/underlyings/obligations with eager loading or subqueries and compute derived fields in one query plan.

### 3. The Add Instrument wizard allows structurally incomplete financing records
- File path: `frontend/src/components/financing/AddInstrumentModal.tsx:83-124`, `frontend/src/components/financing/AddInstrumentModal.tsx:215-245`, `frontend/src/components/financing/AddInstrumentModal.tsx:292-456`, `backend/schemas/financing.py:15-74`
- What the problem is: the wizard can advance through all four steps and submit without core terms, without wrap underlying selection, and without instrument-type-specific required fields. The backend schema also treats most financing fields as optional, so the bad payload is accepted.
- Why it matters: once an incomplete instrument is saved, obligation generation either guesses dates or skips critical obligations entirely.
- Specific suggested fix: add step-level validation by instrument type, require wrap underlying selection for wraps, and mirror that validation in stricter backend request models.

### 4. Financing pages hide API failures behind empty states
- File path: `frontend/src/pages/financing/ObligationsPage.tsx:61-67`, `frontend/src/pages/financing/ObligationsPage.tsx:156-177`, `frontend/src/pages/financing/FinancingDashboardPage.tsx:19-59`, `frontend/src/pages/properties/PropertyDetailPage.tsx:675-681`
- What the problem is: the obligations page treats missing data as "all clear", the dashboard treats missing data as "no financing instruments yet", and expanded instrument detail returns `null` on failed fetch.
- Why it matters: a 500 or network error becomes a false clean bill of health.
- Specific suggested fix: add `isError` handling with retry/error UI instead of reusing financial empty states.

### 5. Property detail is not tab-lazy
- File path: `frontend/src/pages/properties/PropertyDetailPage.tsx:82-87`
- What the problem is: the page always loads property, scenarios, activity, tasks, and instruments even if the user never opens Financing.
- Why it matters: the financing tab effectively costs five API calls up front, and every expanded instrument adds one more call.
- Specific suggested fix: move tab-specific queries into the tab components or gate them with `enabled: activeTab === ...`.

### 6. `RecordPaymentModal` keeps stale state across reopen and never computes P&I or direction
- File path: `frontend/src/components/financing/RecordPaymentModal.tsx:31-58`, `frontend/src/components/financing/RecordPaymentModal.tsx:128-174`
- What the problem is: form state is seeded from `defaults` only once with `useState`, so reopening it for a different instrument can preserve the old instrument/amount/direction. It also leaves principal/interest entirely manual and defaults direction to `"outgoing"` unless the caller pre-computes it.
- Why it matters: this is how the right payment gets posted to the wrong instrument.
- Specific suggested fix: reset the form whenever `open`/`defaults` change, infer direction from the chosen instrument when possible, and auto-calc principal/interest from the instrument terms.

### 7. Frontend financing types do not match real API payloads
- File path: `frontend/src/types/financing.ts:46-206`, `backend/schemas/financing.py:119-293`, `backend/tests/test_financing_api.py:360-374`
- What the problem is: the frontend declares money fields as `number`, but FastAPI serializes `Decimal` as strings. The payment API test explicitly expects `"1264.14"`.
- Why it matters: every consumer is relying on ad hoc `Number(...)` coercion instead of a trustworthy contract.
- Specific suggested fix: parse money centrally at the API boundary or type these fields as strings and convert explicitly where needed.

## Medium Priority

### 1. Wave 2 adds TypeScript build failures in the financing UI
- File path: `frontend/src/components/financing/AddInstrumentModal.tsx:11`, `frontend/src/components/financing/RecordPaymentModal.tsx:8`, `frontend/src/pages/financing/FinancingDashboardPage.tsx:1-7`, `frontend/src/pages/financing/ObligationsPage.tsx:17`
- What the problem is: `frontend/npm run build` currently fails, and Wave 2 contributes unused-import errors in four financing files.
- Why it matters: the repo already has a red build; Wave 2 added more red to it.
- Specific suggested fix: remove the unused imports immediately and keep the financing module green before Wave 3 layers more work on top.

### 2. Today portfolio summary counts properties as deals
- File path: `backend/routers/today.py:219-230`
- What the problem is: `deal_count` is computed from `Property.id`, not `Deal.id`.
- Why it matters: Today shows plausible-looking but wrong summary data.
- Specific suggested fix: count actual deals or rename the field to what it really represents.

### 3. Obligation updates do not invalidate Today
- File path: `frontend/src/hooks/useFinancing.ts:118-130`
- What the problem is: `useUpdateObligation()` invalidates `['financing']` but not `['today']`.
- Why it matters: even after the snooze model is fixed, Today can stay stale until a hard refresh.
- Specific suggested fix: invalidate `['today']` on obligation update success as well.

## Low Priority

### 1. "Due This Week" misses obligations due today
- File path: `frontend/src/pages/financing/ObligationsPage.tsx:93-96`
- What the problem is: `!o.days_until_due` treats `0` as false.
- Why it matters: the KPI undercounts the most urgent same-day items.
- Specific suggested fix: check `o.days_until_due == null` instead of falsiness.

### 2. Property financing visualization only shows the first wrap pair
- File path: `frontend/src/pages/properties/PropertyDetailPage.tsx:512-572`
- What the problem is: the financing tab renders only `instruments.find((i) => i.is_wrap)`.
- Why it matters: properties with multiple wraps hide the rest of the structure.
- Specific suggested fix: render one wrap-flow card per wrap instrument instead of a single `find()` result.

## Previous Fix Regression Check

- JWT audience/issuer hardening: not fixed. `backend/core/security/jwt.py:81-147` and `backend/core/security/clerk.py:94-106` still allow missing audience/issuer under common configs.
- Cross-tenant validation on tasks: held. `backend/routers/tasks.py:222-260` still validates property/deal/contact ownership and rejects malformed UUIDs with 400.
- Cross-tenant validation on communications: held. `backend/routers/contacts.py:374-431` still validates linked deal/property ownership and malformed datetimes.
- Calculator in the streaming analysis path: held. `backend/routers/analysis.py:480-485` still runs `_run_calculator_on_scenario()` before emitting the scenario event.

## Performance Concerns

- Obligations page load: 1 frontend API call (`GET /api/financing/obligations...`), but the backend endpoint currently does 1 count + 1 list + 2 SQL lookups per returned obligation.
- Financing dashboard load: 1 frontend API call (`GET /api/financing/dashboard`), but the backend path does 2 base queries plus per-balloon, per-wrap, and per-sub-to lookups.
- Property detail financing tab: 5 frontend API calls happen up front even before the tab is opened (`property`, `scenarios`, `activity`, `tasks`, `instruments`), and expanding one instrument adds 1 more.
- Today endpoint: roughly 20-25 SQL queries in the normal path, plus 1 extra `AnalysisScenario` query per owned property inside `_build_portfolio_summary()`.

## Positive Findings

- All 13 financing endpoints do require `get_current_user`.
- Instrument creation correctly validates `property_id` ownership, and wrap creation enforces same-property ownership on create.
- `_add_months()` correctly clamps end-of-month dates (`Jan 31 -> Feb 28/29` behavior is right).
- `alert_days_before` is stored as JSONB and used consistently as JSON arrays.
- `calculate_wrap_spread()` correctly avoids division by zero when `wrap_payment` is `0`.
- Instrument soft-delete does cascade to financing obligations and payments.
- Payment completion and payment recording both invalidate `['financing']`, and the payment-mutating flows also invalidate `['today']`.
