# PARCEL Adversarial Review — Wave 3A

Reviewed `SAD/CANONICAL-PRODUCT-BLUEPRINT.md`, the prior Wave 1A/1B/1C/Wave 2 adversarial reviews, and the Wave 3A backend/frontend files in commit range `5d4785e..1237ad2`. I also spot-checked calculator math and date bucketing with local Python snippets. `python3 -m pytest` could not be executed here because `pytest` is not installed in this environment.

## Critical Issues (must fix before Wave 3B)

### 1. Portfolio and Today history series skip months and duplicate others
- File path: `backend/routers/portfolio_v2.py:256-301`, `backend/routers/today.py:293-297`
- What the problem is: both endpoints build month series with `date.today().replace(day=1) - timedelta(days=i * 30)`. That is not month arithmetic. A simple March 1 anchor produces keys like `2025-12-01`, `2025-12-31`, `2026-01-30`, `2026-03-01`, which skips February entirely and duplicates December.
- Why it matters: the portfolio charts and Today cash-flow history can look plausible while being objectively wrong. Investor users will make trend decisions off fabricated month buckets.
- Specific suggested fix: replace every `timedelta(days=i * 30)` month loop with real month arithmetic (`relativedelta(months=i)` or a shared `_add_months()` helper), then zero-fill the exact contiguous month range before returning it.

### 2. Portfolio V2 cash-flow fallback can turn losing properties into breakeven or overstate partially-entered actuals
- File path: `backend/routers/portfolio_v2.py:175-197`
- What the problem is: if a property has any current-month transactions, the endpoint uses only posted actuals and drops all projected expense categories that have not been entered yet. If it has no transactions, the fallback path reconstructs income/expense from outputs, but for strategies like `creative_finance` and some `brrrr` cases there is no `total_monthly_expenses` or `effective_gross_income`, so negative projected cash flow is flattened to `0`. A simple negative-`$200` creative-finance output currently becomes `monthly_cash_flow = 0`.
- Why it matters: portfolio summary cards, the cash-flow benchmark chart, and dashboard rollups can show a marginal or losing property as neutral or stronger than it is.
- Specific suggested fix: separate three states explicitly: fully actual, partially actual, and projected. For partially actual months, combine posted actuals with projected remainder categories. For projected-only paths, derive income and expenses from strategy-specific outputs without clamping negative cash flow to zero.

### 3. Analysis results can show one strategy as selected while rendering another strategy's data
- File path: `frontend/src/pages/analyze/AnalysisResultsPage.tsx:47`, `frontend/src/pages/analyze/AnalysisResultsPage.tsx:91-103`, `frontend/src/pages/analyze/AnalysisResultsPage.tsx:259-282`
- What the problem is: `activeScenario` falls back to `scenarios[0]` whenever the newly selected strategy does not already exist on the property. The sidebar and strategy-comparison row can highlight `flip`, `brrrr`, etc., while `KeyMetrics`, `NarrativeCard`, break-even, and sensitivity still render the original scenario.
- Why it matters: this is a direct investor-trust failure. The UI labels the numbers as one strategy while showing another strategy's underwriting.
- Specific suggested fix: never fall back to `scenarios[0]` once the user explicitly selected a different strategy. Either create an ephemeral scenario from `/api/analysis/calculate`/`/api/analysis/compare` results, or disable strategy switching until a scenario actually exists for that strategy.

## Security Issues (fix immediately)

### 1. Transaction write endpoints trust arbitrary `deal_id` values
- File path: `backend/routers/transactions.py:129-150`, `backend/routers/transactions.py:172-203`, `backend/routers/transactions.py:302-339`
- What the problem is: the transaction routes validate `property_id` ownership, but they never validate that `deal_id` belongs to the same user or even the same property. A guessed UUID can be written into another tenant's deal foreign key.
- Why it matters: this recreates the cross-tenant foreign-key poisoning pattern called out in prior reviews. Even if read paths do not leak today, the data model is now carrying attacker-controlled cross-tenant references.
- Specific suggested fix: validate `deal_id` on create, update, and bulk import with `created_by == current_user.id` and same-property constraints, and reject malformed or foreign IDs with 400/404.

### 2. Rehab project creation has the same unvalidated `deal_id` hole
- File path: `backend/routers/rehab.py:176-194`
- What the problem is: `POST /api/rehab/projects` validates property ownership but persists `deal_id` blindly.
- Why it matters: it allows the same cross-tenant reference poisoning on an execution object that will likely be joined to deals later for reporting and workflow.
- Specific suggested fix: validate `deal_id` ownership and property affinity before creating the project, or remove the field from the request until that validation exists.

### 3. Bulk endpoints are unbounded and un-rate-limited
- File path: `backend/routers/transactions.py:302-354`, `backend/routers/rehab.py:383-407`, `backend/limiter.py:6-9`
- What the problem is: the new bulk transaction and rehab-item routes have no batch-size cap and no `@limiter.limit(...)` protection. A client can send thousands of rows in one request.
- Why it matters: this is an easy abuse path for accidental or intentional DB pressure, request amplification, and noisy-neighbor behavior.
- Specific suggested fix: enforce a hard batch limit in the schemas/routes (for example `<= 100` or `<= 500`), add limiter decorators, and consider moving very large imports to an async import job.

## Financial Accuracy Issues

### 1. Zero-investment break-even and BRRRR infinite return are internally inconsistent
- File path: `backend/core/calculators/projections.py:33-37`, `backend/core/calculators/brrrr.py:42-53`
- What the problem is: `compute_common_projections()` returns `break_even_months = None` when `total_investment == 0`, even though the requested behavior is instant break-even. On top of that, `calculate_brrrr()` correctly flags `infinite_return = True` when refinance proceeds recycle all capital, but still passes the original all-in cost into projections, which can yield values like `break_even_months = 240` on an “infinite return” deal.
- Why it matters: the break-even card and comparison table can tell the user both “all capital recycled” and “20 years to break even” for the same BRRRR scenario.
- Specific suggested fix: treat `total_investment <= 0` as `break_even_months = 0`, and in BRRRR explicitly override break-even to `0` whenever capital is fully recycled.

### 2. The new 5-year projection compounds appreciation but not rent or expenses
- File path: `backend/core/calculators/projections.py:31-61`
- What the problem is: the helper compounds appreciation correctly, but `five_year_total_return` is still just `annual_cash_flow * 5 + five_year_equity`. There is no rent-growth or expense-growth input anywhere in the projection helper.
- Why it matters: the UI now presents “5-year return” as a richer projection, but the cash-flow portion is still a flat Year 1 number repeated five times.
- Specific suggested fix: add explicit annual rent-growth and expense-growth assumptions to the helper, compound them year by year, and compute 5-year cumulative cash flow from the evolving annual values instead of multiplying Year 1 by five.

### 3. Expense breakdown does not add up for BRRRR and creative-finance scenarios
- File path: `backend/core/calculators/projections.py:63-72`, `backend/core/calculators/brrrr.py:45-53`, `backend/core/calculators/creative_finance.py:77-85`
- What the problem is: the shared breakdown only knows about mortgage, taxes, insurance, vacancy, maintenance, capex, management, and HOA. Both BRRRR and creative-finance also rely on a lump `monthly_expenses` input, but neither calculator passes it into the helper, so the returned breakdown excludes real expenses and does not reconcile to the scenario's true monthly burden.
- Why it matters: charts and comparison surfaces can show a clean-looking expense mix that understates total expenses.
- Specific suggested fix: either pass a dedicated `other_monthly_expenses` field into the shared helper or break the lump input into real categories before generating the breakdown, then assert that the breakdown sum matches total monthly expenses.

### 4. The sensitivity matrix is not strategy-aware and uses inconsistent math
- File path: `frontend/src/pages/analyze/components/SensitivityMatrix.tsx:18-47`, `frontend/src/pages/analyze/components/SensitivityMatrix.tsx:55-76`
- What the problem is: the matrix uses a hard-coded `35%` expense ratio, adds an arbitrary `rent * 0.15` back into NOI, and makes `ROI` identical to `CoC Return`. The same matrix is rendered for wholesale, flip, BRRRR, and creative-finance scenarios even though its math is rental-only.
- Why it matters: the new sensitivity surface looks analytical but can produce numbers that are disconnected from the actual strategy being analyzed.
- Specific suggested fix: either scope the matrix to strategies where the math is valid, or drive it from strategy-specific calculator outputs with explicit formulas per metric.

### 5. The compact dashboard summary removes the negative sign from negative portfolio cash flow
- File path: `frontend/src/pages/Dashboard.tsx:295-298`
- What the problem is: the compact card formats monthly cash flow with `Math.abs(...)`, so a `-$500` portfolio is shown as `$500` in red.
- Why it matters: this creates a direct mismatch between dashboard and portfolio page for the same number.
- Specific suggested fix: use a signed currency formatter and reserve color for emphasis instead of sign handling.

## High Priority

### 1. Today still uses old portfolio math instead of the new Portfolio V2 aggregation
- File path: `backend/routers/today.py:182-308`, `frontend/src/components/today/TodayCashFlowChart.tsx:39-58`
- What the problem is: `_build_portfolio_summary()` still totals `scenario.purchase_price` as portfolio value and `scenario.outputs.monthly_cash_flow` as portfolio cash flow. It does not use debt, equity, owned-property aggregation, or the new property-centric actual-vs-projected logic from `portfolio_v2.py`. The chart component also hides entirely when `portfolio.total_cash_flow === 0`, even if `monthly_actuals` exists.
- Why it matters: Today and Portfolio can disagree on the same portfolio, and the most frequently visited surface remains on older, weaker math.
- Specific suggested fix: move the portfolio aggregation into a shared service and have both `/api/today` and `/api/portfolio/overview` read from that same source of truth. Base the chart empty state on history availability, not just current projected cash flow.

### 2. Transaction recurrence metadata is accepted by the API contract but silently discarded
- File path: `backend/schemas/transactions.py:11-21`, `backend/models/transactions.py:21-32`, `backend/routers/transactions.py:139-150`, `backend/routers/transactions.py:328-339`
- What the problem is: the request model accepts `is_recurring` and `recurrence_interval`, but the SQLAlchemy model has no columns for them and the router never stores them.
- Why it matters: the UI tells users Parcel can track recurring transactions “for now, manually,” but the backend currently drops that metadata entirely.
- Specific suggested fix: add the missing DB columns and persist them, or remove those request fields until the data can be stored and returned consistently.

### 3. The frontend does not actually ship the promised transaction/rehab CRUD flows
- File path: `frontend/src/pages/transactions/TransactionsPage.tsx:82-285`, `frontend/src/hooks/useTransactions.ts:39-83`, `frontend/src/pages/rehab/RehabDetailPage.tsx:250-390`, `frontend/src/hooks/useRehab.ts:83-105`
- What the problem is: Wave 3A shipped transaction and rehab update hooks/endpoints, but the transaction page only exposes add/delete and has no edit or bulk-import UI. Rehab detail likewise exposes add/delete only; there is no inline item editing despite an update endpoint and despite the sprint goal.
- Why it matters: the API surface is ahead of the product surface, so the reviewable experience is only partial CRUD, not the feature set the sprint claims.
- Specific suggested fix: either wire edit/bulk flows into the UI now, or explicitly hide/remove the unsupported affordances from scope and docs until they exist.

### 4. Bricked category mapping has substring false positives
- File path: `backend/routers/rehab.py:32-47`, `backend/routers/rehab.py:109-115`
- What the problem is: `_map_category()` does substring matching, and the HVAC keyword list contains `"ac"`. That means text like `"Facade repair"` matches HVAC before it reaches the exterior bucket.
- Why it matters: imported rehab budgets can be rolled into the wrong categories, which then breaks summary cards, budget bars, and trade-level planning.
- Specific suggested fix: tokenize repair names and match whole words/phrases in priority order, or map explicit Bricked repair enums instead of free-text substring scans.

### 5. Portfolio V2 and rehab list endpoints are query-heavy
- File path: `backend/routers/portfolio_v2.py:131-232`, `backend/routers/rehab.py:87-106`, `backend/routers/rehab.py:129-148`
- What the problem is: portfolio overview does one property query, then per property it does up to four more queries (scenario, instruments, obligations, current-month transactions) plus a separate trailing-history query. Rehab list does a property lookup and an item query per project.
- Why it matters: these pages will get noticeably slower as users accumulate owned properties or rehab projects.
- Specific suggested fix: batch-load scenarios/instruments/obligations/transactions keyed by property ID, use grouped aggregates for monthly totals, and precompute rehab stats with one grouped query instead of per-project scans.

### 6. The compare recommendation engine does not actually consider capital requirement
- File path: `backend/routers/analysis.py:666-701`
- What the problem is: `_pick_recommendation()` scores cash flow, risk, ROI, a fixed horizon bonus, and a “simplicity” bias, but it never considers cash required, rehab intensity, or whether the user can realistically execute the recommended strategy.
- Why it matters: the endpoint now returns a first-class recommendation banner, but the decision logic still ignores one of the core feasibility constraints the product brief calls out.
- Specific suggested fix: include capital requirement and operational complexity in the score, and make the returned reason cite the specific factors that won rather than a generic per-strategy template.

## Medium Priority

### 1. Transactions KPIs and chart ignore the page's property/category filters
- File path: `frontend/src/pages/transactions/TransactionsPage.tsx:44-55`, `frontend/src/pages/transactions/TransactionsPage.tsx:61-67`, `frontend/src/pages/transactions/TransactionsPage.tsx:243-277`
- What the problem is: the table query uses property/category/date filters, but the summary query only receives `dateFilters`, so the KPI row and monthly chart stay portfolio-wide even when the table is narrowed to one property or one category.
- Why it matters: the page can show filtered rows and unfiltered rollups at the same time.
- Specific suggested fix: pass the same property/category filter set into `useTransactionSummary()` and make the summary query key match the visible filters.

### 2. Transaction summary does not fill months with zero activity
- File path: `backend/routers/transactions.py:248-295`
- What the problem is: `by_month` only includes months that have at least one transaction.
- Why it matters: consumers have to reconstruct the missing months themselves, and charts become sparse or misleading when the selected period has gaps.
- Specific suggested fix: generate the requested month range from `date_from`/`date_to` (or a sensible default window) and zero-fill missing buckets before returning them.

### 3. Rehab item costs can go negative and drive `actual_spent` below zero
- File path: `backend/schemas/rehab.py:82-103`, `backend/routers/rehab.py:76-85`, `backend/routers/rehab.py:296-304`, `backend/routers/rehab.py:336-344`
- What the problem is: there are no `ge=0` validators on `estimated_cost`, `actual_cost`, or `contractor_bid`, and project totals are just sums of those values.
- Why it matters: a single negative item can turn a rehab into a fake under-budget result or negative actual spend.
- Specific suggested fix: add nonnegative validators to the rehab schemas and reject negative costs server-side before recalculating totals.

### 4. Strategy comparison sorting promotes failed strategies with missing numbers
- File path: `frontend/src/pages/analyze/components/StrategyComparison.tsx:62-68`
- What the problem is: null numeric values are coerced to `999` before sorting, so descending sorts like ROI or 5-year return can bubble failed/missing strategies to the top.
- Why it matters: the table's “sort” affordance looks correct but ranks incomplete rows as if they were very strong.
- Specific suggested fix: sort nulls explicitly to the bottom regardless of direction, then sort valid numeric values.

### 5. Break-even chart silently disappears for “never” and “instant” cases
- File path: `frontend/src/pages/analyze/components/BreakEvenChart.tsx:15-25`
- What the problem is: the component returns `null` when monthly cash flow is non-positive or when total investment is zero.
- Why it matters: users do not get an explanation for two important edge cases the backend now exposes.
- Specific suggested fix: render explicit “Never breaks even at current cash flow” and “Breaks even immediately” states instead of removing the card.

### 6. The rehab create flow always offers AI import, even when no Bricked repair data exists
- File path: `frontend/src/pages/rehab/RehabsPage.tsx:292-307`, `backend/routers/rehab.py:200-224`
- What the problem is: the create modal always shows the AI-import toggle, but the backend silently no-ops if the property has no usable Bricked repair list.
- Why it matters: users can ask for an import, get no imported items, and receive no explanation why.
- Specific suggested fix: preflight whether the selected property has Bricked repairs and hide/disable the toggle with explanatory copy when it does not.

### 7. Wave 3A landed with no targeted automated coverage for the new surfaces
- File path: `backend/tests/`, `frontend/src/__tests__/`
- What the problem is: there are no focused tests for `transactions.py`, `rehab.py`, `portfolio_v2.py`, the compare endpoint, or the new frontend pages/components.
- Why it matters: the defects above are exactly the kind of regressions a thin contract suite should have caught.
- Specific suggested fix: add backend tests for calculator edge cases, ownership validation, bulk limits, and portfolio aggregation; add frontend tests for strategy switching, filter consistency, and zero-data states.

## Low Priority

### 1. Transactions page fires its analytics event on every render
- File path: `frontend/src/pages/transactions/TransactionsPage.tsx:69-75`
- What the problem is: the PostHog capture call lives directly in render, not in an effect.
- Why it matters: filter changes, pagination, or mutation refreshes can spam page-view analytics.
- Specific suggested fix: move the capture into a `useEffect()` keyed to the intended event semantics.

### 2. Add Transaction allows `0` client-side and relies on backend rejection
- File path: `frontend/src/components/transactions/AddTransactionModal.tsx:83-99`, `frontend/src/components/transactions/AddTransactionModal.tsx:129-138`, `frontend/src/components/transactions/AddTransactionModal.tsx:231-237`
- What the problem is: the input uses `min="0"` and the submit guard only checks truthiness of the string, so `"0"` can still be submitted and then fails server-side on `gt=0`.
- Why it matters: this is an avoidable UX error path on a core data-entry modal.
- Specific suggested fix: use `min="0.01"` and disable/validate client-side when `Number(amount) <= 0`.

## Previous Fix Regression Check

- JWT audience/issuer hardening: still not fully held. `backend/core/security/jwt.py:88-92` enforces issuer for legacy JWTs but still has no audience contract, and `backend/core/security/clerk.py:94-105` only verifies audience when `CLERK_JWT_AUDIENCE` happens to be configured.
- Cross-tenant validation on new Wave 3A endpoints: only partially held. Property ownership checks are present on new transaction/rehab writes, but `deal_id` validation regressed in `backend/routers/transactions.py:129-150`, `backend/routers/transactions.py:172-203`, `backend/routers/transactions.py:302-339`, and `backend/routers/rehab.py:176-194`.
- Calculator in the streaming analysis path: held. `backend/routers/analysis.py:483-490` still runs `_run_calculator_on_scenario()` before emitting the scenario event.
- Snoozed obligations resurfacing: only partially held. Financing list/upcoming routes resurface expired snoozes in `backend/routers/financing.py:553-619`, but `backend/routers/today.py:471-624` still filters obligations to `status == "active"` without resurfacing snoozed rows first, so Today can still miss obligations that should have reappeared.

## Positive Findings

- The compare endpoint does run all five strategies and degrades gracefully per strategy instead of failing the whole response when one calculator errors. See `backend/routers/analysis.py:713-776`.
- All new transaction, rehab, compare, portfolio, and Today endpoints require `get_current_user`. There is no obvious unauthenticated Wave 3A route.
- Property ownership validation is present on transaction creation and rehab-project creation. The most obvious “write onto another user's property” path is blocked.
- `portfolio_v2.py` correctly limits aggregation to `Property.status == "owned"` and returns a clean zero-state payload instead of crashing when there are no owned properties.
- Rehab project deletion does soft-delete the child items in the same operation. `backend/routers/rehab.py:268-281`.
- The streaming analysis regression from earlier waves is still fixed, and the developer-owned calculator files `deal_calculator.py`, `risk_engine.py`, and `financial.py` were not touched in the Wave 3A diff.
