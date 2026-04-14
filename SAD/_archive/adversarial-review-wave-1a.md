# PARCEL Adversarial Review — Wave 0 / Wave 1A

## Verification Context

- Read: `SAD/CANONICAL-PRODUCT-BLUEPRINT.md`
- Frontend verification: `npm run build` currently fails. Some failures are older repo noise, but Wave 1A also adds a new TypeScript error in `frontend/src/pages/analyze/AnalyzePage.tsx:123`.
- Backend verification: could not run `pytest` in this environment because the available Python runtime does not have `pytest` installed.

## Critical Issues (must fix before Wave 1B)

### 1. Wave 0 never shipped the Deal -> Property / AnalysisScenario backfill it explicitly promised
- File: `backend/alembic/versions/a1b2c3d4e5f6_add_property_scenario_deal_refactor.py:19-99`
- Problem: This migration only creates tables and adds nullable `deals.property_id`. It does not migrate existing deals into `properties`, does not create `analysis_scenarios` from existing `deals.inputs` / `deals.outputs`, and does not populate `deals.property_id`.
- Why it matters: Existing production data stays stuck in the old deal-centric world while new features read from the new property-centric world. Continuity is broken before users even touch Wave 1A.
- Suggested fix: Add a dedicated Alembic data migration after `a1b2c3d4e5f6` that batches all existing deals, creates canonical property rows, creates scenario rows from the stored JSONB data, sets `deal.property_id`, verifies every non-deleted deal is linked, and aborts migration if any orphan remains.

### 2. `POST /api/analysis/quick` is not actually doing analysis
- File: `backend/routers/analysis.py:119-179`
- File: `backend/core/property_data/service.py:249-273`
- Problem: The endpoint enriches a property, creates an `AnalysisScenario`, and maybe generates AI text, but it never runs a calculator. `scenario.outputs` stays `{}` and `risk_score` stays `None`.
- Why it matters: This is the product’s core promise and it is currently fake. Users pay the RentCast/AI cost and land on a results page with empty metrics.
- Suggested fix: After enrichment, build strategy-specific calculator inputs, run the correct `calculate_*` function, persist `outputs`, `risk_score`, and normalized risk factors, then generate the narrative from that persisted scenario. If required inputs are missing, return a clear 422 instead of pretending the analysis succeeded.

### 3. Deal/property/scenario dual-write is allowed to drift silently
- File: `backend/routers/deals.py:206-218`
- File: `backend/routers/deals.py:356-362`
- File: `backend/core/sync/deal_scenario_sync.py:27-111`
- Problem: The deal is committed first. Property/scenario sync runs afterward in a blanket `try/except` that intentionally swallows failure.
- Why it matters: You will accumulate deals with no property, stale scenarios that were never updated, and deletes that only removed one side. That destroys the property-root continuity the blueprint is built on.
- Suggested fix: Put deal + property + scenario writes in one transaction and fail the request if any required write fails. If sync must be asynchronous, write an outbox row and a repair job. Do not commit the deal and then shrug if the sync explodes.

### 4. Edited numbers and refreshed AI narratives can disagree with each other
- File: `frontend/src/pages/analyze/AnalysisResultsPage.tsx:101-147`
- Problem: Input edits only change local React state and a transient `/api/analysis/calculate` response. `Refresh AI Narrative` then regenerates against the unchanged server-side scenario.
- Why it matters: The user can be looking at one set of numbers and an AI narrative generated from a different set. That is product-trust suicide in underwriting software.
- Suggested fix: Add a real scenario update endpoint that persists edited inputs before recalculation. Only allow narrative regeneration after the save succeeds, and narrate from the freshly persisted scenario version.

## High Priority (fix soon, risk of user-facing bugs)

### 1. The frontend and backend do not agree on calculator input names
- File: `frontend/src/pages/analyze/AnalysisResultsPage.tsx:107-126`
- File: `frontend/src/pages/analyze/components/FinancialInputs.tsx:15-47`
- File: `backend/core/calculators/wholesale.py:3-18`
- File: `backend/core/calculators/flip.py:3-19`
- File: `backend/core/calculators/brrrr.py:3-26`
- File: `backend/core/calculators/creative_finance.py:3-25`
- Problem: The UI edits keys like `after_repair_value` and `repair_cost`, while the calculators actually require `arv`, `rehab_budget`, `repair_costs`, `arv_post_rehab`, `monthly_rent_estimate`, etc. Failures are silently swallowed.
- Why it matters: Live recalculation quietly fails for most strategies. The numbers on screen stop being reliable and the user gets no warning.
- Suggested fix: Define one canonical typed DTO per strategy and share it across frontend and backend. Translate to legacy calculator keys in one backend adapter layer, not ad hoc in multiple React components.

### 2. `create_scenario` is broken twice: bad seeding and broken async narrative generation
- File: `backend/routers/properties.py:208-268`
- Problem: Scenario seeding uses hardcoded heuristics instead of real property-backed assumptions, and then calls `asyncio.get_event_loop().run_until_complete(...)` inside an async endpoint, which fails on a running loop and gets swallowed.
- Why it matters: Comparison scenarios are low-trust junk and almost never get narratives. The feature looks alive while feeding users placeholders.
- Suggested fix: Seed scenarios with a strategy-specific backend mapper, use `await narrate(...)` directly, and surface narrative failures as non-blocking warnings instead of hiding them.

### 3. One transient enrichment failure can permanently poison an address for that user
- File: `backend/core/property_data/service.py:164-183`
- File: `backend/core/property_data/service.py:185-247`
- Problem: The service creates the `Property` row before provider calls. If RentCast fails, later lookups hit the “existing property” path and skip enrichment entirely.
- Why it matters: A single timeout or vendor hiccup can leave the user stuck with a half-empty property forever unless someone manually deletes rows.
- Suggested fix: Do not short-circuit on failed/partial properties. Add an `enrichment_status` column and retry incomplete records until a successful enrichment is persisted.

### 4. Onboarding status fetch failures can strand authenticated users behind the onboarding wall
- File: `frontend/src/stores/onboardingStore.ts:31-49`
- File: `frontend/src/App.tsx:100-105`
- Problem: On failure, the store sets `fetched=true` but leaves `completed=false`. The route guard then redirects the user to `/onboarding`, and there is no retry because the store now thinks the fetch already happened.
- Why it matters: A transient backend error becomes a sticky client-side lockout.
- Suggested fix: Keep `fetched=false` on failure, show a recoverable loading/error state, and retry automatically before making routing decisions.

### 5. The onboarding page swallows failures and provides no recovery path
- File: `frontend/src/pages/OnboardingPage.tsx:69-98`
- Problem: `handleContinue` and `handleSkip` catch errors and do nothing visible. Skip can even navigate to dashboard after a failed save.
- Why it matters: The flow looks dead when it fails, and the user can be dropped into an inconsistent onboarding state.
- Suggested fix: Show inline error UI or a toast with retry. Do not navigate away from onboarding unless the backend confirms the persona write succeeded or exposes a real skip action.

### 6. Persona-based AI narration exists on paper and is ignored in real analysis
- File: `backend/core/onboarding/sample_deals.py:16-26`
- File: `backend/routers/analysis.py:146-156`
- File: `backend/routers/properties.py:262-266`
- Problem: The persona-to-experience mapping exists, but live analysis hardcodes `"intermediate"` or omits the argument entirely.
- Why it matters: Beginners do not get the explanation-heavy experience the blueprint promises, and experienced users get bloated prose they did not ask for.
- Suggested fix: Read `current_user.onboarding_persona`, map it through `PERSONA_EXPERIENCE_LEVEL`, and pass that value through every narrative-generation path.

### 7. Manual “Save as Property” throws away the user’s manual underwriting
- File: `frontend/src/pages/analyze/components/ManualCalculator.tsx:190-197`
- File: `frontend/src/lib/api.ts:340-344`
- Problem: The save flow sends only `address` and `strategy` to the quick-analysis endpoint. None of the manual calculator inputs are persisted.
- Why it matters: The UI tells the user their manual model was saved. It was not.
- Suggested fix: Add a dedicated manual-save endpoint that accepts the exact calculator input payload, runs the calculator server-side, persists the resulting scenario, and returns the saved IDs.

### 8. Strategy switching can highlight one strategy while showing another strategy’s data
- File: `frontend/src/pages/analyze/AnalysisResultsPage.tsx:43`
- File: `frontend/src/pages/analyze/AnalysisResultsPage.tsx:87-99`
- File: `frontend/src/pages/analyze/AnalysisResultsPage.tsx:252-264`
- Problem: The sidebar lets the user activate a strategy even when that scenario does not exist. `activeScenario` then falls back to `scenarios[0]`.
- Why it matters: The highlighted tab and the displayed numbers can disagree. That is a straight-up misleading UI state.
- Suggested fix: Disable missing strategies until creation succeeds, or render an explicit loading/empty state instead of falling back to the first scenario.

### 9. Clerk migration is half-done and brittle
- File: `frontend/src/lib/api.ts:62-80`
- File: `frontend/src/components/auth/ClerkProviderWrapper.tsx:14-23`
- File: `backend/routers/auth.py:141-147`
- File: `backend/routers/auth.py:237-248`
- Problem: The frontend never populates the Clerk token cache, so the Bearer-token path is dead. At the same time, Clerk-only users can still hit password-based flows that assume `password_hash` is non-null.
- Why it matters: The auth migration looks complete in code comments and incomplete in behavior. That is exactly how production auth outages happen.
- Suggested fix: Wire Clerk session tokens into the auth store and API client for real, and hard-reject password-based flows for Clerk-only accounts with a clean user-facing error.

### 10. The chart math is fabricated and misleading
- File: `frontend/src/pages/analyze/components/CashFlowChart.tsx:10-26`
- File: `frontend/src/pages/analyze/components/SensitivityMatrix.tsx:8-37`
- Problem: The cash-flow projection simply compounds current cash flow and ignores the declared expense growth. The sensitivity matrix hardcodes a 35% expense ratio and ignores real calculator inputs such as taxes, insurance, or strategy-specific financing terms.
- Why it matters: These visuals look authoritative while being mathematically disconnected from the saved scenario.
- Suggested fix: Derive both widgets from the actual calculator formulas and stored inputs. If the required data is missing, show an explicit unavailable state instead of invented numbers.

### 11. The dashboard is fabricating trend data
- File: `frontend/src/pages/Dashboard.tsx:55-66`
- File: `frontend/src/pages/Dashboard.tsx:115-120`
- Problem: KPI sparklines are generated with `Math.random()`.
- Why it matters: Fake trend lines in an investment product are unacceptable. They make the whole dashboard look like demo ware.
- Suggested fix: Hide sparklines until real historical aggregates exist, or fetch actual time-series data from the backend.

## Medium Priority (tech debt, should fix within Wave 1B)

### 1. The Wave 0 schema contract is only partially implemented
- File: `backend/models/data_source_events.py:11-32`
- File: `backend/models/import_jobs.py:10-32`
- File: missing file `backend/models/party_roles.py`
- Problem: `PartyRole` is missing entirely. `DataSourceEvent` and `ImportJob` do not follow the “all tables get `team_id`, `created_by`, `updated_at`, `is_deleted`” contract, and most new `team_id` / `created_by` fields are plain UUIDs instead of foreign keys.
- Why it matters: The schema is not team-ready, not referentially safe, and already drifting from the blueprint before Wave 1B even starts.
- Suggested fix: Add `PartyRole`, add real FK constraints to `users.id` and `teams.id`, and standardize the common columns across every Wave 0 table.

### 2. `AnalysisScenario` claims snapshot semantics and then mutates rows in place
- File: `backend/models/analysis_scenarios.py:51-55`
- File: `backend/core/sync/deal_scenario_sync.py:87-107`
- Problem: There is no `version`, no `is_primary`, and deal sync updates the same scenario row instead of inserting a new snapshot.
- Why it matters: Historical underwriting is lost the moment a deal is edited.
- Suggested fix: Add versioning, a primary-scenario marker, and a unique rule per property+strategy. Insert a new scenario on material edits instead of overwriting the old one.

### 3. The analyze flow is not actually using strict TypeScript contracts
- File: `frontend/src/pages/analyze/AnalyzePage.tsx:19`
- File: `frontend/src/pages/analyze/AnalyzePage.tsx:100`
- File: `frontend/src/pages/analyze/AnalysisResultsPage.tsx:49-57`
- File: `frontend/src/pages/analyze/AnalysisResultsPage.tsx:175`
- Problem: The new pages rely on `Record<string, unknown>`, `as any`, and manual casting instead of typed response objects.
- Why it matters: The compiler cannot catch the exact contract mismatches that are already breaking recalculation and navigation.
- Suggested fix: Add typed `QuickAnalysisResponse` / `SSEEvent` unions and remove the `any` casts from the analyze pages.

### 4. Narrative regeneration is uncached even though the hash helper already exists
- File: `backend/core/ai/deal_narrator.py:55-70`
- File: `backend/routers/analysis.py:62-78`
- Problem: `_build_inputs_hash()` exists and `_generate_narrative()` even imports `get_inputs_hash`, but the hash is never used. Every refresh re-hits Anthropic.
- Why it matters: You are burning AI spend and latency for identical inputs.
- Suggested fix: Persist an `ai_inputs_hash` on the scenario, compare before regeneration, and skip AI calls unless the inputs hash changed or the user explicitly forces regeneration.

### 5. Live recalculation has race conditions
- File: `frontend/src/pages/analyze/components/FinancialInputs.tsx:103-111`
- File: `frontend/src/pages/analyze/components/ManualCalculator.tsx:179-187`
- File: `frontend/src/pages/analyze/AnalysisResultsPage.tsx:101-134`
- Problem: Debounced calculator requests are fire-and-forget. There is no abort controller, no request sequence number, and no stale-response guard.
- Why it matters: A slower old request can overwrite a newer edit and put the screen back into an older state.
- Suggested fix: Track a monotonically increasing request ID or use `AbortController`. Ignore any response that is not the latest in-flight request for that component.

### 6. Accessibility work is incomplete on the new surfaces
- File: `frontend/src/pages/OnboardingPage.tsx:144-166`
- File: `frontend/src/pages/analyze/components/CashFlowChart.tsx:41-48`
- File: `frontend/src/pages/analyze/components/AnalysisLoadingState.tsx:114-123`
- File: `frontend/src/pages/analyze/AnalysisResultsPage.tsx:252-264`
- Problem: Focus-visible styles are mostly absent, the chart toggle is a clickable `div`, and several mobile actions are below a 44px hit area.
- Why it matters: Keyboard and mobile use are both degraded for no reason.
- Suggested fix: Use semantic controls, add visible focus styles everywhere, and normalize interactive target sizes to at least 44px.

## Low Priority (nice to have, fix when convenient)

### 1. The results page has dead or misleading actions
- File: `frontend/src/pages/analyze/AnalysisResultsPage.tsx:149-155`
- File: `frontend/src/pages/analyze/AnalysisResultsPage.tsx:210-233`
- Problem: `Save` just flips local state, `Pipeline` just navigates away, and `Report` has no handler at all.
- Why it matters: Dead buttons make the rest of the page harder to trust.
- Suggested fix: Either wire each action to a real mutation or hide/gate it until the feature exists.

### 2. Confidence rendering has an edge-case lie built in
- File: `frontend/src/pages/analyze/components/NarrativeCard.tsx:33-39`
- Problem: An empty `source_confidence` object is treated as high confidence because `0 >= 0` passes the threshold logic.
- Why it matters: The UI overstates confidence exactly when it has no provenance.
- Suggested fix: Treat `values.length === 0` as low confidence and only compute thresholds when real source rows exist.

### 3. The loading state overstates progress
- File: `frontend/src/pages/analyze/AnalyzePage.tsx:319-325`
- File: `frontend/src/pages/analyze/components/AnalysisLoadingState.tsx:114-123`
- Problem: The first step starts as `success` before the request begins, and “View Draft” is always enabled even when no draft exists.
- Why it matters: The progress UI is making promises it has not earned.
- Suggested fix: Start every step as `waiting`, activate them only on real events, and disable “View Draft” until a partial payload exists.

## Security Issues (fix immediately regardless of priority)

### 1. Clerk webhooks are completely unsigned
- File: `backend/routers/clerk_webhooks.py:29-54`
- Problem: The route checks only that `CLERK_WEBHOOK_SECRET` exists. It never verifies Clerk’s signature headers against the raw body.
- Why it matters: Anyone who can reach that endpoint can create users, relink emails, or downgrade accounts.
- Suggested fix: Verify Clerk’s signature over the raw request body before JSON parsing. Reject unsigned or mismatched payloads with 400/401 and log the attempt.

### 2. Clerk JWT verification is too permissive
- File: `backend/core/security/clerk.py:86-92`
- Problem: The decode call explicitly disables audience verification and never checks issuer.
- Why it matters: This is not a defensible auth boundary. You are trusting any token signed by a key in the JWKS set.
- Suggested fix: Enforce `aud`, `iss`, and any required authorized-party claims against configured values. Refresh JWKS on rotation instead of caching forever.

### 3. Legacy JWT handling accepts dangerous defaults and the wrong token type
- File: `backend/core/security/jwt.py:15`
- File: `backend/core/security/jwt.py:72-91`
- File: `backend/core/security/jwt.py:100-113`
- Problem: The code will run with `SECRET_KEY=\"changeme-in-production\"`, and `verify_token()` does not require `type == "access"`.
- Why it matters: A missing env var turns the auth layer into a toy, and a leaked refresh token can be replayed as an access token.
- Suggested fix: Fail fast at startup if `SECRET_KEY` is unset or default, require `type=="access"` in `verify_token()`, and add issuer/audience claims to both token types.

### 4. “RLS” is not database-enforced RLS at all
- File: `backend/core/security/rls.py:59-100`
- File: `backend/alembic/versions/` (no migration contains `CREATE POLICY` or `ENABLE ROW LEVEL SECURITY`)
- Problem: The system relies on a SQLAlchemy SELECT hook, not Postgres row-level security. It ignores `team_id`, does nothing for UPDATE/DELETE/INSERT, and is intentionally bypassable.
- Why it matters: One missed filter or raw query is enough to leak or corrupt another user’s data.
- Suggested fix: Add real Postgres RLS policies for every tenant table, scope by `team_id`, and keep the SQLAlchemy hook only as defense in depth.

### 5. The AI prompt is injectable through unsanitized user fields
- File: `backend/schemas/analysis.py:10-13`
- File: `backend/routers/analysis.py:121-127`
- File: `backend/core/ai/deal_narrator.py:72-145`
- File: `backend/core/ai/deal_narrator.py:188-192`
- Problem: The quick-analysis endpoint accepts arbitrary `strategy` strings, and raw property/scenario text is interpolated directly into a pseudo-XML prompt.
- Why it matters: A malicious client can inject control text into the prompt and steer the narrator away from the system rules.
- Suggested fix: Enforce a strict strategy enum, escape delimiter-like text before prompt assembly, and serialize structured context as JSON instead of concatenated strings.

## Performance Issues (monitor, fix if measured)

### 1. The async analysis path is full of blocking I/O
- File: `backend/routers/analysis.py:90-179`
- File: `backend/core/property_data/address_parser.py:157-194`
- File: `backend/core/property_data/providers/rentcast.py:37-103`
- File: `backend/core/ai/deal_narrator.py:173-199`
- Problem: The endpoints are declared `async`, but they call `time.sleep`, `urllib.urlopen`, and the sync Anthropic client directly.
- Why it matters: One slow analysis can pin the event loop and stall unrelated requests.
- Suggested fix: Switch to async HTTP clients (`httpx.AsyncClient`) or push enrichment/narration to background workers and stream job-state updates instead.

### 2. The claimed 10-second timeout is fiction at the request level
- File: `backend/core/property_data/providers/rentcast.py:22`
- File: `backend/core/property_data/providers/rentcast.py:53-103`
- File: `backend/core/property_data/service.py:295-341`
- Problem: Each of the three RentCast calls gets 10 seconds and a retry, all sequentially.
- Why it matters: A bad upstream can burn 30+ seconds before AI even starts. That is already colliding with the Wave 1A “30s threshold” UX requirement.
- Suggested fix: Put a hard end-to-end deadline around enrichment, parallelize the provider calls, and stop retrying once the total budget is gone.

### 3. The SSE endpoint keeps working after the client is gone
- File: `backend/routers/analysis.py:256-323`
- Problem: The generator never checks `await request.is_disconnected()`.
- Why it matters: Disconnects still trigger geocoding, RentCast calls, AI generation, and usage tracking. That is silent cost leakage.
- Suggested fix: Check client disconnect between stages, abort immediately, and only record usage after the request reaches a committed success state.

### 4. Nominatim geocoding is uncached and globally rate-limited in-process
- File: `backend/core/property_data/address_parser.py:15-18`
- File: `backend/core/property_data/address_parser.py:157-194`
- Problem: Geocoding uses a module-level timestamp and `time.sleep()` with no cache and no lock.
- Why it matters: Throughput collapses as soon as concurrent analyses arrive, and multi-threaded access can still race.
- Suggested fix: Cache normalized geocode results, move rate limiting to a shared async-safe mechanism, and do not block request threads with `sleep()`.

## Positive Findings (what was done well)

### 1. Most new Wave 1A endpoints are at least behind authentication
- File: `backend/routers/analysis.py`
- File: `backend/routers/onboarding.py`
- File: `backend/routers/properties.py`
- File: `backend/routers/activity.py`
- What was done well: The new read/write analysis surfaces mostly depend on `get_current_user`, so there is no obvious anonymous data hole in those routers.

### 2. Provider failures are classified instead of flattened
- File: `backend/core/property_data/providers/rentcast.py:72-103`
- What was done well: The RentCast wrapper distinguishes `404`, `401`, `429`, timeout, and `5xx` cases instead of collapsing everything into a generic failure.

### 3. Demo/sample data is explicitly marked and has cleanup hooks
- File: `backend/routers/onboarding.py:35-76`
- File: `backend/core/onboarding/auto_archive.py:16-65`
- What was done well: Using `is_sample` and providing both manual clear and auto-archive hooks is the right shape for demo isolation.

### 4. The results page at least attempts direct URL recovery
- File: `frontend/src/pages/analyze/AnalysisResultsPage.tsx:45-85`
- What was done well: Falling back to API fetches when router state is absent is the correct direct-navigation pattern.

### 5. Focused backend tests were added around the new routers
- File: `backend/tests/test_analysis.py`
- File: `backend/tests/test_onboarding.py`
- File: `backend/tests/test_properties.py`
- What was done well: There is at least targeted test intent around the new endpoints. I could not execute them here because `pytest` is missing from the available Python environment.
