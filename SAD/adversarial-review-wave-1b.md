# PARCEL Adversarial Review — Wave 1B

Validation context: read `SAD/CANONICAL-PRODUCT-BLUEPRINT.md` and `SAD/adversarial-review-wave-1a.md`. `frontend/npm run build` currently fails. Backend pytest coverage could not be executed here because `pytest` is not installed in this environment.

## Critical Issues (must fix before Wave 1C)

### 1. Closing a deal does not actually feed the Today portfolio
- File: `backend/routers/today.py:178-234`
- File: `backend/routers/portfolio.py:82-129`
- File: `frontend/src/components/close-deal-modal.tsx:62-83`
- Problem: the close-deal flow adds a `portfolio_entries` row and moves the pipeline card to `closed`, but Today portfolio math ignores `portfolio_entries` entirely and only counts `properties.status == "owned"`, summing scenario purchase prices instead of closed performance.
- Why it matters: users can close a deal and still see Today show zero portfolio growth or stale portfolio totals. That is straight trust damage in an investing product.
- Suggested fix: make the close-deal flow update the canonical property/deal ownership state in the same transaction, or better, drive Today portfolio metrics from `portfolio_entries` plus property metadata instead of inferring ownership from `properties.status`.

### 2. Snoozed tasks disappear from Today and can stay lost forever
- File: `backend/routers/tasks.py:171-208`
- File: `backend/routers/tasks.py:312-325`
- File: `backend/models/tasks.py:19-33`
- Problem: snoozing mutates `status` to `"snoozed"` and overwrites `due_date`. Every Today query only includes `status in ("open", "due")`, so snoozed tasks never re-enter the Today feed when the snooze date arrives.
- Why it matters: users will snooze something important, then Parcel silently drops it on the floor. Missing a follow-up because the task system hid it is unacceptable.
- Suggested fix: keep tasks `open`, add `snoozed_until` and `original_due_date`, and have Today exclude tasks only while `snoozed_until > now`.

### 3. The primary analysis flow still ships uncalculated scenarios
- File: `backend/routers/analysis.py:399-446`
- File: `frontend/src/pages/analyze/AnalyzePage.tsx:65-71`
- File: `frontend/src/pages/analyze/AnalyzePage.tsx:141-157`
- Problem: `POST /api/analysis/quick` now runs the calculator, but the streaming endpoint that the UI actually uses does not. It emits the scenario immediately after enrichment with no `_run_calculator_on_scenario()` call. The frontend then navigates based on a stale closure over `partialResult`, which makes the stream path even more brittle.
- Why it matters: Wave 1A’s core fake-analysis bug is still alive in the default UX path. Users can still reach results with empty or inconsistent outputs.
- Suggested fix: run the calculator before emitting the `scenario` SSE event, persist the outputs, and move navigation state into a ref or navigate from the final assembled payload instead of a stale closure.

## Security Issues (fix immediately)

### 1. JWT audience / issuer checking still is not actually enforced
- File: `backend/core/security/clerk.py:86-97`
- File: `backend/core/security/jwt.py:78-130`
- Problem: Clerk verification checks issuer only when it can derive one, never checks audience, and legacy JWTs still have no issuer/audience contract at all.
- Why it matters: this was explicitly called out in the Wave 1A review. The auth boundary is still weaker than it should be, especially during a dual-auth migration.
- Suggested fix: require configured `iss` and `aud` for Clerk tokens, add `iss`/`aud` to legacy access and refresh tokens, and reject tokens missing them.

### 2. Task creation and update allow cross-tenant foreign-key references and malformed IDs explode as 500s
- File: `backend/routers/tasks.py:222-277`
- Problem: `property_id`, `deal_id`, `contact_id`, and `assigned_to` are blindly cast from strings. There is no ownership check for the referenced entity, and invalid UUIDs / broken foreign keys will bubble into unhandled server errors.
- Why it matters: one user can attach their tasks to another user’s entities if they ever learn the IDs, and bad input can crash the endpoint instead of returning a 4xx.
- Suggested fix: make these request fields typed UUIDs at the schema level, then verify each referenced entity belongs to `current_user` before committing.

### 3. Communication logging has the same cross-tenant reference hole
- File: `backend/routers/contacts.py:364-402`
- Problem: `deal_id`, `property_id`, and `occurred_at` are accepted as raw strings, cast inline, and never ownership-checked.
- Why it matters: users can create communications linked to deals or properties they do not own, and malformed timestamps / UUIDs return 500s instead of clean validation errors.
- Suggested fix: use typed Pydantic fields (`UUID`, `datetime`) and validate linked entities against `current_user` before inserting the communication row.

### 4. Today leaks other users’ data-source activity
- File: `backend/routers/today.py:399-424`
- File: `backend/models/data_source_events.py:11-32`
- Problem: the “New property data available” briefing item counts every successful `DataSourceEvent` in the last 24 hours with no user/team filter. `DataSourceEvent` also has no tenant column to scope against.
- Why it matters: this exposes platform-wide activity levels to individual users and breaks the single-tenant assumptions everywhere else in the app.
- Suggested fix: add tenant ownership columns to `data_source_events`, backfill them, and join through owned properties or direct tenant scope before counting.

## High Priority (fix soon)

### 1. Pipeline can hold duplicate entries for the same deal
- File: `backend/routers/pipeline.py:121-159`
- File: `backend/models/pipeline_entries.py:24-29`
- Problem: `POST /api/v1/pipeline/` never checks whether a deal is already in the pipeline, and the model has no uniqueness constraint on `deal_id`.
- Why it matters: duplicate cards corrupt stale-deal counts, stage totals, and board behavior. Users should not be able to drag the same deal through two columns at once.
- Suggested fix: add a unique constraint on `pipeline_entries.deal_id` and return `409` when a duplicate insert is attempted.

### 2. The side panel’s “Log Activity” UI is wired to a guaranteed-bad endpoint
- File: `frontend/src/components/pipeline/DealSidePanel.tsx:184-190`
- File: `frontend/src/components/contacts/LogActivityForm.tsx:20-56`
- Problem: the panel renders `LogActivityForm contactId=""`, so any submission targets `/api/contacts//communications`.
- Why it matters: the action looks real and will fail every time. That is worse than hiding it.
- Suggested fix: either remove the form until a deal/property-scoped activity endpoint exists, or build a panel-specific form that logs against the correct entity type.

### 3. Moving stage in the side panel leaves the side panel itself stale
- File: `frontend/src/components/pipeline/DealSidePanel.tsx:34-49`
- File: `frontend/src/pages/Pipeline.tsx:82-89`
- File: `frontend/src/pages/Pipeline.tsx:518-523`
- Problem: the mutation invalidates the board query, but `selectedCard` is a detached copy. After a stage move, the kanban board refreshes while the open side panel keeps showing the old stage and old days-in-stage color.
- Why it matters: users can see two contradictory truths on screen at once.
- Suggested fix: either fetch full deal/pipeline detail on open and update from the mutation response, or derive the open card from the current board/query cache instead of freezing a copied object in local state.

### 4. The side panel fetches all tasks even when the panel is closed
- File: `frontend/src/components/pipeline/DealSidePanel.tsx:28-33`
- File: `frontend/src/hooks/useTasks.ts:5-10`
- Problem: `DealSidePanel` is always mounted, and when `card` is null it still calls `useTasksList({})`, which fetches the global task list.
- Why it matters: pipeline load now triggers an unnecessary extra API call and pulls unrelated task data for no user value.
- Suggested fix: add an `enabled` option to `useTasksList` or split the hook so the panel only queries tasks when `isOpen && card`.

### 5. Pipeline summary is using the wrong stage vocabulary, so the Today bar is wrong
- File: `frontend/src/components/today/PipelineSummary.tsx:5-12`
- File: `backend/routers/today.py:430-458`
- Problem: the backend emits `closed` and `dead`; the frontend summary expects `closing`. Closed/dead deals still count toward `total`, but they never render segments or labels.
- Why it matters: percentages under-fill, some boards render with blank bars, and a pipeline with only closed deals looks broken.
- Suggested fix: share one canonical stage enum between backend and frontend and compute the bar from active stages only.

### 6. Linked deals on contact detail show the wrong “status”
- File: `backend/routers/contacts.py:433-445`
- File: `backend/models/deals.py:20-21`
- File: `frontend/src/pages/contacts/ContactDetailPage.tsx:270-285`
- Problem: the contacts API returns `deal.status`, which is the legacy draft/saved/shared flag, not the pipeline stage the UI implies.
- Why it matters: users looking at a seller or buyer record will see nonsense states instead of where the deal actually sits in the funnel.
- Suggested fix: either join `pipeline_entries` and return the current stage, or rename the field so the UI stops pretending it is pipeline status.

### 7. Properties list does an obvious N+1 query storm
- File: `backend/routers/properties.py:246-314`
- Problem: for every property on the page, the router runs one scenario query and one deal-count query.
- Why it matters: at 100 rows you are already at 201 queries before the response leaves the server.
- Suggested fix: precompute the latest scenario and deal counts with subqueries / grouped joins and hydrate the whole page in one round trip.

### 8. Contacts list has the same N+1 pattern and its deal count is wrong
- File: `backend/routers/contacts.py:211-248`
- Problem: the list endpoint issues per-contact count/max queries, and `deal_count` counts raw junction rows without filtering deleted deals.
- Why it matters: the list gets slower as the CRM grows, and the “Deals” number can disagree with the contact detail view.
- Suggested fix: aggregate via grouped joins, and count only non-deleted deals owned by the user.

### 9. Properties list summary is financially misleading
- File: `frontend/src/pages/properties/PropertiesListPage.tsx:143-148`
- Problem: “Total Value” and “Active Assets” are computed from the current page slice, not the full result set, but the UI presents them as global portfolio numbers.
- Why it matters: page 1 and page 2 tell different “portfolio totals.” That is unacceptable wording in financial software.
- Suggested fix: either relabel them as “Visible Results” or fetch true aggregates from the backend.

### 10. Clicking a specific scenario on property detail can open the wrong analysis
- File: `frontend/src/pages/properties/PropertyDetailPage.tsx:343-347`
- File: `frontend/src/pages/properties/PropertyDetailPage.tsx:432-436`
- File: `frontend/src/pages/analyze/AnalysisResultsPage.tsx:76-80`
- Problem: every scenario row links only to `/analyze/results/:propertyId`, and the results page picks a default strategy based on persona or first scenario. The clicked scenario is not preserved.
- Why it matters: a user can click the flip analysis and land on buy-and-hold numbers instead.
- Suggested fix: pass the selected scenario ID/strategy in the URL or router state and honor it on load.

### 11. Communication log never got real pagination
- File: `backend/routers/contacts.py:332-356`
- File: `frontend/src/hooks/useContacts.ts:26-31`
- File: `frontend/src/components/contacts/CommunicationLog.tsx:26-83`
- Problem: the API exposes only a `limit`, the hook hardcodes one fetch, and the component has no “Load more.”
- Why it matters: active contacts will hit a hard ceiling and older activity becomes unreachable from the UI.
- Suggested fix: add cursor or page-based pagination to the backend and wire an actual incremental “Load more” interaction.

### 12. Contact creation/editing still has almost no validation
- File: `frontend/src/components/contacts/ContactModal.tsx:60-95`
- File: `backend/routers/contacts.py:90-109`
- Problem: only `first_name` is validated. `type="email"` and `type="tel"` do nothing here because the modal is not using native form submission.
- Why it matters: garbage CRM data goes in immediately and then poisons search, communication, and exports.
- Suggested fix: add frontend and backend validators for email format, sane phone normalization, and explicit enum validation for contact type.

### 13. Today cash-flow chart is still fake
- File: `frontend/src/components/today/TodayCashFlowChart.tsx:18-35`
- Problem: “Projected” is just the current monthly cash flow copied across six months, and “Actual” is hardcoded to zero.
- Why it matters: the chart looks analytical while being mostly invented.
- Suggested fix: either drive it from real transaction/history data or replace it with a single current-metric card until history exists.

### 14. Today page hard-fails to a blank screen on query error
- File: `frontend/src/pages/TodayPage.tsx:37-64`
- Problem: the page handles loading but not `isError`; when the query fails and `data` is undefined, it returns `null`.
- Why it matters: the user gets no recovery path, no retry, and no explanation.
- Suggested fix: render an explicit error state with retry instead of falling through to `null`.

## Medium Priority (tech debt, fix within Wave 1C)

### 1. Wave 1B currently does not typecheck
- File: `frontend/src/components/layout/AppShell.tsx`
- File: `frontend/src/components/pipeline/DealSidePanel.tsx`
- File: `frontend/src/components/tasks/TaskList.tsx`
- File: `frontend/src/components/today/PipelineSummary.tsx`
- File: `frontend/src/components/today/TodayCashFlowChart.tsx`
- File: `frontend/src/lib/api.ts`
- File: `frontend/src/pages/contacts/ContactDetailPage.tsx`
- File: `frontend/src/pages/Pipeline.tsx`
- File: `frontend/src/pages/properties/PropertyDetailPage.tsx`
- File: `frontend/src/pages/TodayPage.tsx`
- Problem: `npm run build` fails with TypeScript errors, including multiple Wave 1B files.
- Why it matters: shipping a broken build gate guarantees drift between declared types and runtime behavior.
- Suggested fix: clean the current TS failures before Wave 1C work lands. Do not normalize a red build.

### 2. The custom contact modal is not an accessible dialog
- File: `frontend/src/components/contacts/ContactModal.tsx:97-236`
- Problem: it is a hand-rolled overlay with no `role="dialog"`, no focus trap, no Escape handling, and no focus return.
- Why it matters: keyboard and assistive-tech users get a broken modal.
- Suggested fix: rebuild it on the existing Radix dialog primitives already used elsewhere in the codebase.

### 3. Desktop properties and contacts tables are mouse-only
- File: `frontend/src/pages/properties/PropertiesListPage.tsx:279-317`
- File: `frontend/src/pages/contacts/ContactsListPage.tsx:229-255`
- Problem: clickable `<tr>` rows are not focusable or keyboard-activatable.
- Why it matters: tab users cannot open records from the primary desktop list view.
- Suggested fix: put a real `<Link>` in the primary cell or make each row a semantic button/link target.

### 4. Days-in-stage colors do not match the stated thresholds
- File: `frontend/src/components/pipeline/deal-card.tsx:25-36`
- File: `frontend/src/components/pipeline/deal-card.tsx:72-76`
- File: `frontend/src/components/pipeline/DealSidePanel.tsx:56-60`
- Problem: the code treats `<14` as effectively green, `14-29` as yellow, and `30+` as red. The requested behavior was green `<7`, yellow `7-14`, red `>14`.
- Why it matters: stale deals look healthier than they are.
- Suggested fix: centralize the threshold helper and use the requested cutoffs in both the card and side panel.

### 5. Locked routes are inconsistent: click shows upgrade, direct URL shows 404
- File: `frontend/src/components/layout/nav-data.ts:61-97`
- File: `frontend/src/App.tsx:164-165`
- Problem: sidebar/mobile locked items trigger an upgrade toast, but typing `/buyers` or `/obligations` goes to generic Not Found because there are no guarded placeholder routes.
- Why it matters: the same product state behaves like a paywall in one place and a broken app in another.
- Suggested fix: add explicit locked-route stubs that render the same upgrade/paywall treatment.

### 6. The deal-contact junction is too rigid and has no delete cascade
- File: `backend/models/deal_contacts.py:14-30`
- File: `backend/alembic/versions/f6a7b8c9d0e1_add_deal_contacts_junction.py:39-44`
- Problem: uniqueness is only `(deal_id, contact_id)`, so one contact cannot legitimately hold multiple roles on the same deal, and the foreign keys do not specify cascade behavior.
- Why it matters: this already conflicts with the blueprint’s `PartyRole` direction, and hard deletes or cleanup tasks will leave brittle orphan handling.
- Suggested fix: either promote this to a real role table that allows multiple roles, or include `role` in uniqueness and define `ON DELETE CASCADE` semantics explicitly.

### 7. Deleting a property keeps some linked data and erases other linked data
- File: `backend/routers/properties.py:356-384`
- Problem: delete soft-deletes the property and scenarios, but leaves deals, tasks, communications, and transactions pointing at a now-inaccessible property.
- Why it matters: the data model becomes internally inconsistent and users lose the analysis history while orphaning operational records.
- Suggested fix: define one clear archival rule. Either archive the property and keep everything visible, or cascade archival consistently across linked entities.

### 8. The properties list never exposed the strategy filter the backend added
- File: `backend/routers/properties.py:207-236`
- File: `frontend/src/pages/properties/PropertiesListPage.tsx:102-107`
- Problem: backend supports `strategy`, frontend never sends it.
- Why it matters: a shipped backend feature is effectively dead, and the “combined filters” requirement is not actually satisfied.
- Suggested fix: add a strategy filter control and include it in the query key / URL state.

### 9. Contact detail collapses too aggressively on tablet
- File: `frontend/src/pages/contacts/ContactDetailPage.tsx:137-138`
- Problem: the layout stays one column until `lg`, so medium-width tablet screens lose the intended multi-column structure.
- Why it matters: the page becomes much longer and harder to scan exactly on the device class field users actually use.
- Suggested fix: move to a `md` or `md+lg` responsive split instead of waiting until `lg`.

### 10. Contact-deal linking is only half-shipped
- File: `frontend/src/hooks/useContacts.ts:85-94`
- File: `frontend/src/pages/contacts/ContactDetailPage.tsx:255-291`
- Problem: the backend and hook exist, but there is no UI to link or unlink deals from a contact.
- Why it matters: Sprint 3 delivered read-only linked deals, not deal linking.
- Suggested fix: add a searchable link/unlink control on contact detail and enforce duplicate-role behavior explicitly in the UI.

### 11. Task priority ordering is string ordering, not business ordering
- File: `backend/routers/tasks.py:153-157`
- File: `backend/routers/tasks.py:191-202`
- Problem: `Task.priority.desc()` sorts lexically, not `urgent > high > normal > low`.
- Why it matters: “high” can come after “low”, which is the opposite of what users expect from a task queue.
- Suggested fix: sort with a CASE expression or a dedicated enum/order column.

### 12. Several Wave 1B actions are still placeholders dressed as shipped UI
- File: `frontend/src/pages/properties/PropertyDetailPage.tsx:324-332`
- File: `frontend/src/pages/properties/PropertyDetailPage.tsx:459-468`
- File: `frontend/src/pages/properties/PropertyDetailPage.tsx:475-484`
- File: `frontend/src/components/pipeline/DealSidePanel.tsx:158-166`
- Problem: map, transactions, documents, and linked contacts are still “coming soon”/placeholder content inside supposedly live product surfaces.
- Why it matters: placeholders on core entity pages make the product feel unfinished and make users second-guess the working parts.
- Suggested fix: either hide unfinished sections behind feature flags or render honest empty states tied to real data models, not “coming soon” copy.

## Low Priority (nice to have)

### 1. Post-auth routing is inconsistent
- File: `frontend/src/hooks/useAuth.ts:15-18`
- File: `frontend/src/hooks/useAuth.ts:38-41`
- File: `frontend/src/App.tsx:116-119`
- File: `frontend/src/pages/OnboardingPage.tsx:80`
- Problem: login/register/onboarding send users to `/dashboard`, while guest redirect and the new IA treat `/today` as home.
- Why it matters: the app’s primary home surface is not actually the default entry point.
- Suggested fix: pick one canonical post-auth landing page and use it everywhere.

### 2. Property/contact detail analytics fire on every re-render
- File: `frontend/src/pages/properties/PropertyDetailPage.tsx:89-97`
- File: `frontend/src/pages/contacts/ContactDetailPage.tsx:43-51`
- Problem: PostHog capture runs in render, not in `useEffect`.
- Why it matters: analytics become noisy and inflated as local state changes.
- Suggested fix: move these captures into `useEffect` with stable dependencies.

### 3. The filtered-properties empty state renders an empty secondary link
- File: `frontend/src/pages/properties/PropertiesListPage.tsx:238-246`
- File: `frontend/src/components/EmptyState.tsx:52-59`
- Problem: `secondaryCta={{ label: '', href: '' }}` still renders a blank `<Link>`.
- Why it matters: it is sloppy DOM output and a needless accessibility distraction.
- Suggested fix: stop passing empty CTA objects or guard on non-empty label/href inside `EmptyState`.

### 4. “Edit” on the properties list is not an edit action
- File: `frontend/src/pages/properties/PropertiesListPage.tsx:408-414`
- Problem: the action just routes to the overview tab on the detail page; no edit mode exists.
- Why it matters: dead or misleading actions lower confidence fast.
- Suggested fix: either implement editing or relabel it to “Open.”

## Wave 1A Regression Check (did the previous fixes hold?)

### 1. Clerk webhook signature verification: held
- File: `backend/routers/clerk_webhooks.py:25-96`
- Problem: this one is in place. The route verifies Svix headers against the raw request body before JSON parsing.
- Why it matters: this was a real security hole in Wave 1A, and it does not appear to have regressed.
- Suggested fix: keep it, and add explicit tests around invalid signatures so it stays held.

### 2. JWT audience / issuer checking: not held
- File: `backend/core/security/clerk.py:86-97`
- File: `backend/core/security/jwt.py:78-130`
- Problem: issuer is only partially enforced and audience is still missing.
- Why it matters: one of the required Wave 1A auth hardenings is still incomplete.
- Suggested fix: finish the claim contract and test it.

### 3. SECRET_KEY startup check: partially held
- File: `backend/core/security/jwt.py:15-21`
- File: `backend/.env.example:3`
- Problem: the app now refuses to boot with a missing secret, which is good, but it will still accept placeholder-quality strings without complaint.
- Why it matters: this is better than Wave 1A, but not as strong as it should be for production hardening.
- Suggested fix: reject obvious placeholders and weak/default values at startup.

### 4. AI prompt sanitization: held in the reviewed narrator path
- File: `backend/core/ai/sanitize.py:9-33`
- File: `backend/core/ai/deal_narrator.py:72-150`
- Problem: no new Wave 1B regression found here. The reviewed narrative path is sanitizing user-controlled property text before prompt assembly.
- Why it matters: this was another real Wave 1A issue and it appears materially improved.
- Suggested fix: keep using structured/sanitized prompt assembly everywhere new AI features are added.

### 5. Calculator actually running in analysis/quick: only partially held
- File: `backend/routers/analysis.py:249-252`
- File: `backend/routers/analysis.py:399-446`
- Problem: the non-streaming quick endpoint runs the calculator now, but the streaming endpoint does not, and the frontend prefers the streaming path.
- Why it matters: the headline fix exists in one code path and is still broken in the user-facing one.
- Suggested fix: treat SSE and POST as one product surface and keep them behaviorally identical.

## Performance Concerns

### 1. Today page is cheap on the network but expensive on the server
- File: `frontend/src/hooks/useToday.ts:4-10`
- File: `frontend/src/hooks/useTasks.ts:21-27`
- File: `backend/routers/today.py:178-234`
- Problem: frontend Today load is two API calls (`/api/today` and `/api/tasks/today`), but the server side of `/api/today` still does per-property scenario lookups and multiple full-row queries where counts would do.
- Why it matters: it will feel fine in dev and then fall over on real portfolios.
- Suggested fix: keep the frontend at two calls, but collapse backend portfolio/today aggregations into grouped queries.

### 2. Expensive endpoints are still refetching on window focus
- File: `frontend/src/App.tsx:44-53`
- File: `frontend/src/hooks/useToday.ts:4-10`
- File: `frontend/src/hooks/useTasks.ts:21-27`
- File: `frontend/src/pages/Pipeline.tsx:109-112`
- Problem: only the session check disables focus refetch. Today, tasks-today, and pipeline all inherit React Query’s default focus refetch behavior.
- Why it matters: tab-switching can spam expensive queries and make the app feel jittery.
- Suggested fix: explicitly disable focus refetch for Today, tasks-today, and pipeline, then re-enable only where the UX truly needs it.

### 3. Pipeline load has a stealth extra API call
- File: `frontend/src/components/pipeline/DealSidePanel.tsx:28-33`
- Problem: the closed side panel still fetches the task list.
- Why it matters: you pay for a hidden feature every time the board mounts.
- Suggested fix: gate the query behind `isOpen && card`.

### 4. Large list surfaces are not virtualized
- File: `frontend/src/pages/properties/PropertiesListPage.tsx:256-374`
- File: `frontend/src/pages/contacts/ContactsListPage.tsx:206-314`
- File: `frontend/src/pages/Pipeline.tsx:360-423`
- Problem: everything renders the full page/column payload at once.
- Why it matters: properties/contacts are paginated now, but the kanban board is not, and rendering cost will compound as boards get large.
- Suggested fix: keep pagination on tables and consider virtualization or column windowing for the pipeline board.

## Accessibility Gaps

### 1. Contact modal is not keyboard-safe
- File: `frontend/src/components/contacts/ContactModal.tsx:97-236`
- Problem: no dialog semantics, no trap, no Escape close, no guaranteed focus return.
- Why it matters: keyboard and screen-reader users get stranded.
- Suggested fix: use Radix Dialog.

### 2. The main desktop list views are not keyboard navigable
- File: `frontend/src/pages/properties/PropertiesListPage.tsx:279-317`
- File: `frontend/src/pages/contacts/ContactsListPage.tsx:229-255`
- Problem: interactive rows are not focusable.
- Why it matters: you cannot tab through the primary CRM/property surfaces.
- Suggested fix: make records real links/buttons.

### 3. Today’s visual summaries have no accessible text equivalent
- File: `frontend/src/components/today/PipelineSummary.tsx:61-97`
- File: `frontend/src/components/today/TodayCashFlowChart.tsx:70-124`
- Problem: the segmented bar and chart are purely visual and expose no aria labeling or summary text for assistive tech.
- Why it matters: critical dashboard information disappears for screen-reader users.
- Suggested fix: add aria labels / summaries and expose the same numbers in adjacent text.

### 4. Task actions are hover-only
- File: `frontend/src/components/tasks/TaskCard.tsx:117-149`
- Problem: complete/snooze/delete controls hide behind hover opacity.
- Why it matters: touch users and keyboard users get poor discoverability.
- Suggested fix: show actions on focus as well, and consider always-visible affordances in compact task lists.

## Positive Findings (what was done well)

### 1. The reviewed routers are authenticated
- File: `backend/routers/properties.py`
- File: `backend/routers/contacts.py`
- File: `backend/routers/today.py`
- File: `backend/routers/tasks.py`
- File: `backend/routers/pipeline.py`
- Problem: none here. Every reviewed endpoint is behind `get_current_user`.
- Why it matters: at least the obvious “forgot auth entirely” class of bug is not present in Wave 1B.
- Suggested fix: keep this standard and add route tests so it stays true.

### 2. Main list endpoints have sane page-size caps
- File: `backend/routers/properties.py:210-212`
- File: `backend/routers/contacts.py:178-180`
- File: `backend/routers/tasks.py:129-130`
- Problem: none here. `per_page` is capped at `100`.
- Why it matters: this blocks the laziest denial-of-service / accidental overload path.
- Suggested fix: preserve the cap and surface it in API docs.

### 3. I did not find raw SQL built from user input in the reviewed Wave 1B routers
- File: `backend/routers/properties.py`
- File: `backend/routers/contacts.py`
- File: `backend/routers/today.py`
- File: `backend/routers/tasks.py`
- File: `backend/routers/pipeline.py`
- Problem: none found. The reviewed query construction is ORM-based.
- Why it matters: SQL injection risk is low in this slice.
- Suggested fix: keep raw SQL isolated to migrations/admin scripts and never interpolate request strings.

### 4. Some invalidation wiring is already correct
- File: `frontend/src/hooks/useTasks.ts:30-89`
- Problem: none here. Task mutations invalidate `['tasks']`, `['tasks-today']`, and `['today']`.
- Why it matters: this is the right direction for cross-surface consistency.
- Suggested fix: apply the same rigor to pipeline close/stage flows and analysis-created property flows.

### 5. Dragging a card onto the same column does not fire a useless mutation
- File: `frontend/src/pages/Pipeline.tsx:264-285`
- Problem: none here. Same-stage drops bail before the API call.
- Why it matters: this avoids one very common dnd-kit footgun.
- Suggested fix: keep that guard and add an explicit test for it.
