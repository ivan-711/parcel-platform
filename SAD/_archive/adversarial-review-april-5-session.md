# Adversarial Review - April 5 Session

`git log --oneline --since=2026-04-05` returned no commits. `git diff --name-only HEAD~30` produced the changed-file set reviewed below. I read every changed file from that diff completely, then traced the supporting calculator, auth, migration, and property-model code paths needed to verify the prompt's checks.

| ID | Severity | File | Issue (short) | Impact |
| --- | --- | --- | --- | --- |
| C1 | Critical | `backend/core/calculators/reverse_valuation.py` | Reverse solver dispatcher/defaults are inconsistent; 0%-down CoC and missing creative finance type produce false results | Users can be shown a "max price" that does not actually hit the requested target |
| C2 | Critical | `frontend/src/pages/analyze/components/VerdictBadge.tsx` | Zero/null hero-metric guards allow optimistic verdicts | Break-even or incomplete deals can still show "Good Deal" |
| C3 | Critical | `frontend/src/pages/analyze/components/MetricTooltips.ts` | Tooltip formulas drift from backend math and accept `NaN` as valid numeric input | Users are taught the wrong formula and can see bogus calculations |
| C4 | Critical | `backend/core/security/clerk.py`, `backend/core/security/jwt.py` | JIT provisioning happens after signature validation, but audience validation is optional | A valid Clerk token for the wrong audience can still create/link a local account |
| C5 | Critical | `backend/models/properties.py` | `Property.location` is still conditionally declared from Python package presence, not DB schema presence | Environments without the column can crash on normal property queries/inserts |
| S1 | Security | `backend/routers/calculators.py` | Reverse calculator endpoint has auth/rate limiting but almost no numeric validation | Negative or absurd inputs reach solver algebra and generate misleading responses |
| S2 | Security | `frontend/src/App.tsx` | Dev preview mocks are statically imported into the production module graph | A bad env/build config can activate mock auth/data in production |
| S3 | Security | `backend/routers/clerk_webhooks.py` | Clerk webhook fallback is replay-unsafe and `svix` is not installed | Captured webhook payloads can be replayed indefinitely |
| S4 | Security | `backend/alembic/versions/p6q7r8s9t0u1_add_active_enrollment_unique_index.py` | New partial-unique-index migrations are not safe on dirty data or partial reruns | Deploys can fail on real data or during retry/recovery |
| F1 | Financial | `frontend/src/pages/analyze/components/CashFlowBreakdown.tsx` | Creative-finance expense breakdown omits `monthly_expenses` | Expense bars understate costs and overstate visible spread |
| F2 | Financial | `frontend/src/pages/analyze/components/BreakEvenChart.tsx` | Break-even chart truncates long timelines and hides never-break-even deals | The chart misrepresents payoff timing or disappears entirely |
| F3 | Financial | `frontend/src/pages/analyze/components/CashFlowChart.tsx` | Creative-finance projections compound fixed debt service as if it were growing expenses | 10/20/30-year cash flow numbers are materially wrong |
| F4 | Financial | `frontend/src/pages/analyze/components/KeyMetrics.tsx` | Buy-and-hold UI dropped `debt_yield` even though backend still computes it | A lender-relevant underwriting metric disappeared from the product |
| F5 | Financial | `frontend/src/components/landing/constants.ts` | Public pricing copy disagrees with backend billing rules | Users are told the wrong limits/features/prices |
| H1 | High | `frontend/src/pages/analyze/components/NarrativeCard.tsx` | Narrative preview violates the "one sentence, no periods" requirement | Preview text is inconsistently chopped and still shows markdown/punctuation artifacts |
| H2 | High | `frontend/src/pages/analyze/components/BreakEvenChart.tsx` | Analysis surfaces still hardcode dark-theme colors | Light mode and theme consistency regress on key result screens |
| H3 | High | `frontend/src/pages/analyze/components/ReverseCalculatorModal.tsx` | Modal shows wrong default assumptions and blocks clear typing | Users are shown inaccurate assumptions and the input feels broken |
| H4 | High | `frontend/src/components/pipeline/deal-card.tsx` | Nested pipeline cards drop `deal.id` during flattening | Card actions can run with `undefined` deal IDs |
| H5 | High | `frontend/src/pages/buyers/BuyerDetailPage.tsx` | Detail-page regressions: raw property types and incomplete rehab address fallback | Users see raw enums and missing addresses on linked records |
| H6 | High | `backend/core/documents/processor.py` | PDF/DOCX extraction refactor broke document processing | Non-image documents now fail before AI analysis |
| H7 | High | `backend/routers/auth.py` | Clerk-only users can 500 on legacy password flows | Password login/profile update paths crash instead of failing cleanly |
| H8 | High | `frontend/src/pages/skip-tracing/SkipTracingPage.tsx` | Manual skip trace UI does not satisfy backend request schema | Single-address tracing likely 422s every time |
| M3 | Medium | `frontend/src/pages/analyze/components/BreakEvenChart.tsx` | Analysis charts lack accessible labeling and text alternatives | Screen-reader users get almost no chart context |
| M4 | Medium | `frontend/src/pages/analyze/components/ReverseCalculatorModal.tsx` | Reverse calculator does not cancel or sequence in-flight requests | Slower older responses can overwrite newer target calculations |

## Critical

### C1
Severity: Critical
File: `backend/core/calculators/reverse_valuation.py`

Issue: The algebra is mostly correct under happy-path inputs, but the shipped dispatcher/defaulting logic still produces false scenarios in real edge cases. The file also leaves important target/value validation to chance.

Impact: The UI can confidently display a "max purchase price" or "max loan balance" that does not actually achieve the requested target once the forward calculator runs. That is a direct trust and underwriting problem.

Fix:
1. Reject invalid reverse targets up front per metric and strategy.
2. Reject `loan_term_years <= 0` and `new_term_years <= 0` before any solver math.
3. Reject `down_payment_pct <= 0` for CoC reverse mode, because the forward calculator defines CoC as `0` when down payment is zero.
4. Make `_apply_forward_defaults()` strategy-aware enough to preserve solver assumptions for creative finance, or require `finance_type` explicitly.
5. Add regression tests that run `reverse_calculate()`, then the matching forward calculator, and assert the target metric matches within tolerance for each strategy.

Verification:
1. Buy-and-hold, target `coc_return = 8%`.
   `effective_rent = 1800 * (1 - 0.08) = 1656`
   `numerator = 12 * (1656 - 150 - 90 - 1800*(0.05 + 0.08)) = 14184`
   Monthly payment factor at `7.25%`, `30y` is about `0.006821988`.
   `denominator = 0.08 * 0.20 + 12 * 0.006821988 * 0.80 = 0.081491...`
   `price = 14184 / 0.081491... = 174060.47`
   Running the shipped forward calculator at `174060.47` returns `coc_return = 8.0`. This path is correct.
2. Buy-and-hold, target `cap_rate = 7%`.
   `monthly_noi = 1656 - 150 - 90 - 90 - 144 = 1182`
   `annual_noi = 1182 * 12 = 14184`
   `price = 14184 / 0.07 = 202628.57`
   Forward calculation returns `cap_rate = 7.0`. This path is correct.
3. Buy-and-hold, target `monthly_cash_flow = $300`.
   `numerator = 1656 - 150 - 90 - 1800*(0.05 + 0.08) - 300 = 882`
   `denominator = 0.006821988 * 0.80 = 0.00545759...`
   `price = 882 / 0.00545759... = 161615.12`
   Forward calculation returns `monthly_cash_flow = 300.0`. This path is correct.
4. Flip, target `roi = 20%`.
   Inputs: `ARV 250000`, `repair_cost 40000`, `financing_costs 10000`, `selling_costs_pct 8`.
   `selling_costs = 20000`
   `other_costs = 50000`
   `price = (250000 - 50000 - 20000 - 0.20*50000) / 1.20 = 141666.67`
   Forward calculation returns `roi = 20.0`. This path is correct.
5. BRRRR, target `capital_recycled_pct = 100%`.
   Inputs: `after_repair_value 220000`, `refinance_ltv_pct 75`, `repair_cost 30000`.
   `refi_proceeds = 220000 * 0.75 = 165000`
   `max_all_in = 165000 / 1.00 = 165000`
   `purchase_price = 165000 - 30000 = 135000`
   Forward calculation returns `capital_recycled_pct = 100.0`. This path is correct.
6. Creative finance, target `monthly_cash_flow = $300`.
   Inputs: `monthly_rent 2200`, `monthly_expenses 300`, `interest_rate 7.25`, `loan_term_years 25`.
   `target_payment = 2200 - 300 - 300 = 1600`
   Payment factor at `7.25%`, `25y` is about `0.00722852`.
   `existing_loan_balance = 1600 / 0.00722852... = 221359.27`
   If the forward calculator is run with `finance_type='seller_finance'`, it returns `monthly_cash_flow = 300.0`.
   But the shipped dispatcher defaults `finance_type='subject_to'` when missing, so the actual `reverse_calculate()` response returns `monthly_payment = 0` and `monthly_cash_flow = 1900`. That is a false scenario.

Edge cases:
1. `0%` interest is fine. `reverse_calculate('buy_and_hold', 'coc_return', 8, ..., interest_rate=0)` returns `332437.5`, and the forward calculator returns `coc_return = 8.0`.
2. `0%` down is not fine for CoC. `reverse_calculate('buy_and_hold', 'coc_return', 8, ..., down_payment_pct=0)` returns `max_purchase_price = 173269`, but the forward calculator returns `coc_return = 0`, not `8`.
3. Zero-term loans blow up. `loan_term_years=0` or `new_term_years=0` raises `ZeroDivisionError` in the reverse solver.
4. Negative targets are accepted with no guardrails. Examples that currently return "feasible" answers:
   `buy_and_hold / coc_return = -5`
   `buy_and_hold / monthly_cash_flow = -100`
   `flip / roi = -50`
5. `_format_message()` lacks a human label for `cap_rate`, so the user sees `To achieve 7 cap_rate...` instead of a proper phrase.

### C2
Severity: Critical
File: `frontend/src/pages/analyze/components/VerdictBadge.tsx`

Issue: The base score thresholds are directionally correct for `risk_score` semantics (`0 = lowest risk`, `100 = highest risk`), and the wholesale override is also correct. The bug is in the hero-metric guards: buy-and-hold only downgrades when `monthly_cash_flow < 0`, not when it is exactly `0`, and nullish/undefined hero metrics silently fall back to the risk score.

Impact: A break-even rental or a partially-populated scenario can still wear a green badge like "Good Deal", which is exactly the sort of false confidence that users anchor on.

Fix:
1. Treat `monthly_cash_flow <= 0` as non-good for cash-flow strategies.
2. If the hero metric needed for the strategy is `null` or `undefined`, show a neutral "Incomplete" state instead of a positive verdict.
3. Add tests for `0`, `-1`, `null`, and `undefined` hero metrics for each strategy.

### C3
Severity: Critical
File: `frontend/src/pages/analyze/components/MetricTooltips.ts`

Issue: Several formulas no longer match the backend calculators, and the helper `num()` treats `NaN` and `Infinity` as valid numbers because it only checks `typeof v === 'number'`.

Impact: The product can explain the wrong formula even when the raw metric is correct. For an underwriting tool, bad explanations are still product defects because they train users on false math.

Fix:
1. Change `num()` to require `Number.isFinite(v)`.
2. Align tooltip formulas and compute functions to the actual backend implementation, not the intended implementation.
3. Add a test that compares each tooltip formula/compute path against a known backend output fixture.

Specific mismatches:
1. `dscr` says `Monthly NOI / Monthly Mortgage Payment`, but creative finance computes `monthly_rent_estimate / monthly_payment`. The tooltip also looks for `monthly_rent_estimate` inside outputs, which the calculator does not emit.
2. `rent_to_price_ratio` displays `(Monthly Rent / Purchase Price) × 100`, but the compute path falls back to `effective_gross_income`, which is post-vacancy, not monthly rent.
3. `monthly_cash_flow` only matches buy-and-hold. BRRRR and creative-finance use different output ingredients.
4. `break_even_rent` hardcodes `/ 1 unit`, while the backend divides by `number_of_units`.

### C4
Severity: Critical
File: `backend/core/security/clerk.py`, `backend/core/security/jwt.py`

Issue: Signature, issuer, and expiry are validated before JIT provisioning, which is the correct direction. The remaining hole is that audience validation is optional. `verify_clerk_token()` only verifies `aud` when `CLERK_JWT_AUDIENCE` is configured, but `get_current_user()` will JIT-create or link a local user from any token that passes the current checks.

Impact: This is not a trivial free-account forgery; an attacker still needs a valid Clerk-signed token. But a valid token for the wrong audience or consumer can still be accepted if the deployment omits `CLERK_JWT_AUDIENCE`, which is not "full validation" for a third-party IdP.

Fix:
1. Fail closed when Clerk auth is enabled but `CLERK_JWT_AUDIENCE` is missing.
2. Verify the full expected audience/authorized-party configuration that matches the frontend app.
3. Add an auth test that proves a validly signed wrong-audience token is rejected before any local user lookup or creation.

### C5
Severity: Critical
File: `backend/models/properties.py`

Issue: The codebase did not fully remove PostGIS coupling. The Alembic migration now skips `properties.location` when PostGIS is unavailable, but the ORM model still adds `Property.location` whenever `geoalchemy2` imports successfully. `geoalchemy2` is still in `backend/requirements.txt`, and property ingestion still assigns `prop.location`.

Impact: In an environment where `geoalchemy2` is installed but the actual column was never created, standard ORM reads/writes against `properties` can fail because SQLAlchemy includes a column the table does not have.

Fix:
1. Remove `location` from the ORM model unless the schema is definitely present.
2. Better: drop the column entirely from runtime code and guard all geospatial writes behind an explicit feature flag plus schema check.
3. Add an integration test against a non-PostGIS database that creates/reads a property successfully.

Note: I did not find active runtime `ST_Distance`, `ST_DWithin`, or other PostGIS function calls outside migrations and comments. The remaining problem is the model/schema mismatch, not live geospatial querying.

## Security

### S1
Severity: Security
File: `backend/routers/calculators.py`

Issue: The reverse calculator endpoint is authenticated and rate-limited (`30/minute`), but the request schema leaves `target_value` and `inputs` almost unconstrained. Negative, nonsensical, or huge numbers go straight into solver algebra.

Impact: Clients can generate absurd "feasible" answers, trigger divide-by-zero paths, or brute-force weird numeric states. This is more of an integrity/abuse problem than a straight exploit, but it is still a public authenticated endpoint returning financial guidance.

Fix:
1. Use strategy-specific Pydantic request models with sensible ranges.
2. Reject negative targets unless a strategy explicitly supports them.
3. Clamp or reject unrealistic magnitudes before solver execution.
4. Convert known invalid states into deterministic `422` validation errors instead of generic `400` calculation failures.

### S2
Severity: Security
File: `frontend/src/App.tsx`

Issue: Dev preview mode is statically imported at the top of the application. `App.tsx` imports `@/dev/devPreview`, and `devPreview.ts` imports `mockApi` and `mockData`. The code comment claims production tree-shaking removes it, but the import is still in the production module graph.

Impact: A bad environment flag or build configuration can activate mock auth and mock API responses in production. It also needlessly ships mock code into the app bundle.

Fix:
1. Replace the static import with a guarded dynamic import in development-only code.
2. Put mock bootstrap behind a separate entrypoint or Vite alias that does not exist in production builds.
3. Add a build-time assertion that production bundles do not include the mock module.

### S3
Severity: Security
File: `backend/routers/clerk_webhooks.py`

Issue: The webhook route rejects a missing secret, so the obvious placeholder-secret failure is not the main bug. The real bug is that the code falls back to manual HMAC verification when `svix` is unavailable, and `svix` is not installed in `backend/requirements.txt`. The fallback checks the signature bytes but does not validate timestamp freshness or replay windows.

Impact: A previously captured valid Clerk webhook can be replayed indefinitely. Depending on the event type, that can relink users, recreate state transitions, or repeatedly trigger side effects.

Fix:
1. Add `svix` as a runtime dependency and use Clerk's standard verifier in production.
2. Reject stale `svix-timestamp` values.
3. Store processed `svix-id` values or event IDs to prevent replay.

### S4
Severity: Security
File: `backend/alembic/versions/p6q7r8s9t0u1_add_active_enrollment_unique_index.py`, `backend/alembic/versions/1642524fa0f6_add_billing_infrastructure.py`

Issue: The new partial unique indexes assume pristine data and first-try success.

Impact: Production migrations can fail on real datasets or during retry/recovery workflows.

Fix:
1. Before creating `uq_active_enrollment`, clean or deduplicate existing active enrollments.
2. Use conditional index creation where possible, or explicitly probe for the existing index before creation.
3. Make the migration idempotent enough to survive partial retries.

Specific problems:
1. `p6q7r8s9t0u1_add_active_enrollment_unique_index.py` creates a partial unique index with no preflight cleanup. Any pre-existing duplicate active enrollment pair will make the migration fail.
2. `1642524fa0f6_add_billing_infrastructure.py` uses raw SQL for `ix_subscriptions_one_active` without `IF NOT EXISTS`, so rerunning after a partial failure can fail even when the rest of the migration succeeded.

## Financial

### F1
Severity: Financial
File: `frontend/src/pages/analyze/components/CashFlowBreakdown.tsx`

Issue: The component itself handles `grossRent <= 0` safely and avoids dividing by zero. The real bug is upstream: creative-finance outputs omit `monthly_expenses` from `monthly_expense_breakdown`, so the visualization undercounts expenses.

Impact: Users see a nicer-looking expense stack than the actual `monthly_cash_flow` calculation used. The bars and the number disagree on where the money is going.

Fix:
1. In `backend/core/calculators/creative_finance.py`, pass `monthly_other=monthly_expenses` into `compute_common_projections()`.
2. Add a snapshot test for creative-finance breakdown totals so the bars sum to rent minus cash flow.

### F2
Severity: Financial
File: `frontend/src/pages/analyze/components/BreakEvenChart.tsx`

Issue: The chart only plots months `0..60`, but it still renders `Break-even: Month X` for values beyond 60. It also returns `null` when `monthly_cash_flow <= 0`, so a never-break-even deal silently disappears instead of saying so.

Impact: Long payback periods are visually misrepresented, and negative/zero-cash-flow deals lose an important warning state.

Fix:
1. Extend the rendered horizon to at least the computed break-even month.
2. If `break_even_months` is `null`, show an explicit "Never breaks even at current assumptions" state.
3. If the displayed horizon is capped, label it as capped.

### F3
Severity: Financial
File: `frontend/src/pages/analyze/components/CashFlowChart.tsx`

Issue: The projection decomposition assumes `monthly_cash_flow = rent - monthly_pi - expenses`. Creative finance does not emit `monthly_pi`; it emits `monthly_payment`. The code therefore treats fixed debt service as part of `baseExpenses`, then grows it at `3%` annually as if it were an operating expense.

Impact: Creative-finance 10/20/30-year projections and cumulative totals are wrong. A fixed payment turns into a rising expense curve that should not exist.

Fix:
1. Use `monthly_payment` for creative finance.
2. Better: build the projection from explicit expense categories plus debt service, not an inferred residual.
3. Add a regression test showing that a fixed creative-finance payment stays flat while other expenses grow.

Note: the horizon slice itself (`10/20/30`) is correct; the bad numbers come from the projection model, not the toggle.

### F4
Severity: Financial
File: `frontend/src/pages/analyze/components/KeyMetrics.tsx`

Issue: Buy-and-hold still calculates `debt_yield` in the backend, but the metric is gone from the frontend metric sets. The tier grouping and expand/collapse behavior otherwise look reasonable.

Impact: Users lost a meaningful debt-service underwriting metric without any replacement.

Fix:
1. Add `debt_yield` back to the buy-and-hold metric definitions.
2. Add a tooltip tied to the backend formula.
3. If it was intentionally removed, remove it from the backend too so the API and UI stop drifting.

### F5
Severity: Financial
File: `frontend/src/components/landing/constants.ts`, `frontend/src/pages/PricingPage.tsx`, `backend/core/billing/tier_config.py`

Issue: Public pricing copy and the backend billing configuration disagree materially.

Impact: This can cause charge disputes, support load, and loss of trust because the product markets one plan while enforcing another.

Fix:
1. Drive public pricing copy from the same canonical tier config the backend uses.
2. Add an integration test that asserts displayed plan names, prices, and limits match the backend source of truth.

Concrete mismatches:
1. Landing page says Free includes `5 deals/month`, full pipeline, and PDF exports.
2. Pricing page says Free includes `5 analyses per month` and Pro is `$69`.
3. Backend says Free is `3` analyses, no pipeline, no PDF export; Plus exists at `$29`; Pro is `$79`.

## High

### H1
Severity: High
File: `frontend/src/pages/analyze/components/NarrativeCard.tsx`

Issue: The preview helper explicitly extracts the first two sentences, not one. It also does not enforce "no periods", and the expanded content uses a weaker cleaning path than the preview path. The sentence-boundary regex can still break on abbreviations like `e.g.` or `vs.` when followed by uppercase text.

Impact: Narrative previews are inconsistent, can cut at the wrong boundary, and do not actually match the product requirement.

Fix:
1. Normalize the narrative once, then use the same cleaned text for preview and expanded render.
2. Generate a true one-sentence preview.
3. Use an abbreviation-aware sentence parser or request a dedicated backend summary field.

### H2
Severity: High
File: `frontend/src/pages/analyze/components/BreakEvenChart.tsx`, `frontend/src/pages/analyze/components/KeyMetrics.tsx`, `frontend/src/pages/analyze/components/NarrativeCard.tsx`, `frontend/src/pages/analyze/components/ReverseCalculatorModal.tsx`, `frontend/src/pages/properties/PropertyDetailPage.tsx`

Issue: Many analysis surfaces still hardcode dark hex colors like `#EF4444`, `#0C0B0A`, `#1A1918`, `#F0EDE8`, and `#8A8580` instead of using the theme variables already defined in `frontend/src/index.css`.

Impact: Light mode and shared theme consistency regress specifically on the pages where users make decisions.

Fix:
1. Replace hardcoded colors with semantic CSS variables or shared chart-theme tokens.
2. Add at least one light-theme visual regression pass for the analysis results page and property detail page.

### H3
Severity: High
File: `frontend/src/pages/analyze/components/ReverseCalculatorModal.tsx`

Issue: The modal shows the wrong default assumption copy for BRRRR and creative finance, and the numeric input cannot be cleared while typing because `handleValueChange()` drops empty/NaN intermediate states.

Impact: Users are told the wrong financing assumptions and get an input field that snaps back instead of behaving like a normal numeric editor.

Fix:
1. Make the assumption banner strategy-specific. BRRRR should talk about refi LTV/rate/term, and creative finance should talk about finance type / note rate / note term, not `20% down`.
2. Store the raw input string locally, parse on debounce, and allow temporary empty input states.

Note: the confirmation step and infeasible-result message flow are present and broadly fine.

### H4
Severity: High
File: `frontend/src/components/pipeline/deal-card.tsx`

Issue: When a pipeline card arrives with a nested `deal` object, the flattening logic falls back for `address`, `city`, `state`, and `strategy`, but it never falls back for `deal_id`. It keeps `rawCard.deal_id` even when the actual ID lives on `deal.id`.

Impact: Card actions like open/remove/close can operate with an undefined deal ID for nested API responses.

Fix:
1. Set `deal_id: rawCard.deal_id || (deal.id as string)` during flattening.
2. Add a component test with a nested `deal` payload.

### H5
Severity: High
File: `frontend/src/pages/buyers/BuyerDetailPage.tsx`, `frontend/src/pages/rehab/RehabsPage.tsx`

Issue: There are at least two confirmed UI regressions in this group.

Impact: Users see raw backend values in detail views and missing addresses in rehab cards, which makes linked records feel unreliable.

Fix:
1. Reuse the property-type formatter in the buyer detail page instead of joining raw enum strings.
2. Stop relying on the default paginated property list for rehab address resolution; fetch the specific property IDs needed on the page or join the address server-side.

Confirmed regressions:
1. Buyer detail renders property types as raw values like `single_family` instead of the humanized formatting used in the list page.
2. Rehab cards only fall back through `useProperties({})`, which is paginated by `PropertyListResponse`. If the referenced property is not in the fetched page, the card drops the address.

### H6
Severity: High
File: `backend/core/documents/processor.py`, `backend/core/documents/extractor.py`

Issue: The extractor refactor changed PDF/DOCX helpers to return `ExtractionResult`, but the processor still treats the return value as a plain string and calls `.strip()` or concatenates it directly.

Impact: PDF and DOCX processing now fails before AI analysis. Image uploads still work, which can hide this regression until a user uploads a normal document.

Fix:
1. Read `result.text` from the extractor return object.
2. Persist truncation metadata if needed, but do not pass the object itself where text is expected.
3. Add tests for PDF and DOCX extraction through the processor, not just the extractor.

### H7
Severity: High
File: `backend/routers/auth.py`, `backend/models/users.py`, `backend/core/security/jwt.py`

Issue: `User.password_hash` is nullable for Clerk-only users, but the login and password-change paths still call `verify_password(..., user.password_hash)` unconditionally. `verify_password()` immediately does `hashed.encode()`.

Impact: Clerk-only accounts can trigger a server error on legacy password flows instead of getting a clean validation response.

Fix:
1. Short-circuit legacy password auth when `password_hash` is missing.
2. Return a clear error such as "Password login is not configured for this account" or route the user into a password-setup flow.

### H8
Severity: High
File: `frontend/src/pages/skip-tracing/SkipTracingPage.tsx`, `frontend/src/types/index.ts`, `frontend/src/lib/api.ts`, `backend/schemas/skip_tracing.py`

Issue: The single-trace UI and the backend schema disagree.

Impact: Manual skip tracing likely fails with `422` for every request, and the history code is one refactor away from breaking because the frontend type contract is wrong.

Fix:
1. Add a required compliance acknowledgement checkbox and send `compliance_acknowledged: true`.
2. Align the `history` API type with the backend's actual `list[SkipTraceListItem]` response, or change the backend to return pagination metadata if that is the intended contract.

Confirmed mismatches:
1. Frontend `TraceAddressRequest` omits `compliance_acknowledged`.
2. `SkipTracingPage` sends only address/city/state/zip.
3. Backend `TraceAddressRequest` rejects requests unless `compliance_acknowledged` is true.
4. Frontend types `history` as `{ items, total }`, but the backend returns a plain list.

## Medium

### M3
Severity: Medium
File: `frontend/src/pages/analyze/components/BreakEvenChart.tsx`, `frontend/src/pages/analyze/components/CashFlowChart.tsx`, `frontend/src/pages/analyze/components/VerdictBadge.tsx`

Issue: The major analysis charts render visually but expose almost no chart-level accessible description. The verdict badge button also relies entirely on visible text and generic popover behavior rather than explicit explanatory state.

Impact: Screen-reader users do not get a usable summary of the underlying chart content, which matters because these charts carry key underwriting conclusions.

Fix:
1. Add chart-level `aria-label` or `aria-describedby` content summarizing the current result.
2. Provide a hidden textual summary for key chart outputs such as break-even month and selected horizon totals.
3. Add explicit accessible naming for the verdict details trigger.

### M4
Severity: Medium
File: `frontend/src/pages/analyze/components/ReverseCalculatorModal.tsx`

Issue: The modal debounces keystrokes, but once a request is in flight there is no cancellation or request sequencing. An older slower response can arrive after a newer target value and overwrite the newer result.

Impact: Users can momentarily see the wrong max price for the number currently in the field, which is especially bad in a reverse-calculator workflow.

Fix:
1. Track a monotonically increasing request ID and ignore stale responses.
2. Or use `AbortController` on the API request if the client wrapper supports it.

## Reviewed With No Material Issue

These checks were performed and did not produce a material defect beyond the findings above:

1. `VerdictBadge` score thresholds themselves are correctly ordered for `risk_score` semantics (`0 = low risk`, `100 = max risk`).
2. `VerdictBadge` wholesale override mapping is correct.
3. Reverse-solver math is fine for buy-and-hold, flip, and BRRRR under valid inputs; the broken part is dispatcher/default consistency and missing validation, not the core algebra.
4. The `0%` interest reverse-calculator path works.
5. `CashFlowBreakdown` safely avoids division-by-zero when `grossRent <= 0`.
6. I did not find active runtime PostGIS function calls like `ST_Distance` or `ST_DWithin` outside migrations/comments.
7. I did not find a major new third-party dependency spike in `frontend/package-lock.json`; the meaningful bundle concern is the statically imported dev-preview path in `S2`.
8. The settings theme selector and the register CTA contrast looked acceptable in the changed files; the theme regressions are concentrated in the analysis/property surfaces called out in `H2`.
