# PARCEL Adversarial Review — Wave 5 + Wave 6

Reviewed `SAD/CANONICAL-PRODUCT-BLUEPRINT.md`, `SAD/adversarial-review-wave-4.md`, both wave design specs, and the full Wave 5 / Wave 6 implementation surface: providers, services, routers, Dramatiq tasks, models, schemas, migrations, shared API/types/hooks, routes/nav, and the new skip tracing / direct mail pages plus property/contact integrations.

## Critical Issues

### 1. Direct mail verification marks provider failures as safe-to-send and the send path will mail undeliverable / no-match recipients
- File path: `backend/core/direct_mail/lob_provider.py:119-157`, `backend/core/direct_mail/service.py:164-185`, `backend/routers/mail_campaigns.py:308-332`, `frontend/src/pages/mail/CampaignBuilderPage.tsx:590-645`
- Problem: `LobProvider.verify_address()` collapses auth failures, timeouts, and unexpected exceptions into `deliverability="no_match"`. `DirectMailService.verify_addresses()` then sets `address_verified = True` for every result, including `undeliverable`, `deliverable_missing_unit`, and provider errors. `POST /mail-campaigns/{id}/send` only checks `address_verified == True`, so known-bad addresses and transient Lob failures still flow into paid sends. The review screen underestimates spend by pricing only `deliverable` recipients, while the backend sends every verified recipient.
- Why it matters: a Lob outage, auth regression, or bad address list can still trigger real postcard/letter spend. Users also see a false estimate before sending.
- Specific fix: separate `verification_succeeded` from `deliverability`; never mark provider failures as verified; block send to anything except explicitly allowed deliverability states; surface per-recipient verification errors; make the review estimate use the exact backend send eligibility rule.

### 2. Mail recipient creation trusts arbitrary `contact_id` and `property_id`, enabling cross-tenant data exfiltration in templates and mailed content
- File path: `backend/core/direct_mail/service.py:108-131`, `backend/core/direct_mail/service.py:263-286`, `backend/routers/mail_campaigns.py:196-221`
- Problem: `add_recipients()` persists whatever `contact_id` / `property_id` the caller provides without validating ownership. `_build_context()` later loads `Contact` and `Property` by raw ID with no `created_by` or `is_deleted` filter, and injects their data into template rendering.
- Why it matters: any authenticated user who can guess another tenant's UUID can pull another tenant's contact name or property address into previewed or mailed output. This is a direct cross-tenant confidentiality breach on a paid outbound channel.
- Specific fix: validate linked contacts/properties at add time against the authenticated user or team, reject foreign IDs, and keep every later lookup ownership-scoped as defense in depth.

### 3. Campaign sending is not atomic or idempotent, so retries and races can double-send real mail
- File path: `backend/routers/mail_campaigns.py:291-332`, `backend/core/tasks/mail_campaign.py:19-97`
- Problem: the router allows sends from both `draft` and `scheduled`, sets `status="scheduled"`, enqueues a worker, and records usage before any Lob piece succeeds. There is no compare-and-set state transition, no idempotency key, no row claim on recipients, and no guard against enqueueing a second worker for the same campaign while the first is still pending or running.
- Why it matters: duplicate button clicks, client retries after a 500, or worker races can send the same paid mail piece more than once.
- Specific fix: allow send from one state only, transition the campaign with an atomic conditional update, enqueue exactly once, claim recipients with `FOR UPDATE SKIP LOCKED` or an equivalent claim token, and make the route idempotent on a client-supplied key.

### 4. `quick-send` can successfully spend money, then fail locally and invite a duplicate retry
- File path: `backend/routers/mail_campaigns.py:425-472`
- Problem: `POST /mail-campaigns/quick-send` calls Lob first, then records usage and commits afterward. If the local commit fails, the API returns an error even though the mail piece is already created at Lob.
- Why it matters: the user sees a failure, retries, and Parcel creates a second paid mail piece. There is no durable local record or idempotency guard to stop this.
- Specific fix: persist an outbound command record before calling Lob, attach an idempotency key to the request, record the Lob ID transactionally, and make retries resume the existing send instead of creating a new one.

## Security Issues

### 1. Wave 5 shipped without the blueprint’s compliance gating, California review gate, or any DNC / suppression enforcement
- File path: `SAD/CANONICAL-PRODUCT-BLUEPRINT.md:666-673`, `backend/core/skip_tracing/`, `backend/routers/skip_tracing.py`, `frontend/src/pages/skip-tracing/`
- Problem: the blueprint says Wave 5 ships with compliance gating and a California review gate. The implementation has no state restriction, review flow, DNC flag handling, or suppression check anywhere in skip tracing.
- Why it matters: this feature is explicitly for outbound contact enrichment. Shipping it without the required compliance controls turns a product requirement into a legal exposure.
- Specific fix: add an explicit compliance state machine before trace/send actions, enforce state-level restrictions server-side, store and honor suppression metadata from providers, and block risky jurisdictions until the review workflow is complete.

### 2. The new expensive endpoints have no route-level rate limiting
- File path: `backend/routers/skip_tracing.py`, `backend/routers/mail_campaigns.py`, `backend/main.py:4-5`
- Problem: unlike other paid or abuse-prone routes in the codebase, the Wave 5 / Wave 6 routers apply no `slowapi` limits to single trace, batch trace, verify, send, or quick-send endpoints.
- Why it matters: a compromised session, client bug, or replay loop can burn paid API spend quickly. The absence of a route-level brake is especially dangerous on real-money integrations.
- Specific fix: add conservative per-user limits to all paid endpoints and a tighter limit to batch / quick-send paths.

### 3. Direct mail is not actually gated as a Business-only feature
- File path: `backend/routers/mail_campaigns.py:74-283`, `frontend/src/App.tsx:196-199`, `frontend/src/pages/mail/MailCampaignsPage.tsx:171-227`
- Problem: only `/send` and `/quick-send` use quota gating. Every other direct-mail endpoint, including Lob address verification, is open to any authenticated user tier.
- Why it matters: access control is incomplete and non-Business users can still create campaigns and consume external verification calls on a premium feature.
- Specific fix: put a Business-tier dependency on the router or every direct-mail endpoint, not just on the final send actions.

## API Cost Exposure Risks

### 1. Single skip traces count failed and `not_found` traces against quota, and the cache-hit heuristic is wrong
- File path: `backend/routers/skip_tracing.py:74-82`, `backend/core/skip_tracing/service.py:70-88`
- Problem: `trace_single()` records usage for every non-cache result, even when the provider returned `failed`, `timeout`, `auth_error`, `rate_limited`, or `not_found`. It also guesses cache hits by checking whether `traced_at` is older than ten seconds, so a legitimate cache hit inside that window gets billed like a fresh trace.
- Why it matters: users can lose included skip traces without Parcel actually buying a successful BatchData hit, and a quick retry on the same address can consume quota again.
- Specific fix: return an explicit `cache_hit` flag from the service, record usage only on billable provider outcomes, and align the quota rule with the actual provider cost rule.

### 2. Batch skip tracing and campaign sends ignore the remaining quota and only check the current count
- File path: `backend/core/billing/tier_gate.py:78-107`, `backend/routers/skip_tracing.py:97-134`, `backend/routers/mail_campaigns.py:291-332`
- Problem: `require_quota()` only checks `current_count >= limit`. It never compares `len(body.records)` or `verified_count` against the remaining allowance, so a Pro user with one skip trace left can still queue 100 rows, and a Business user with one mail piece left can still queue an entire campaign.
- Why it matters: batch actions can blow past plan limits in a single request.
- Specific fix: add a batch-aware quota check that compares requested units against remaining quota before any work is queued.

### 3. Direct-mail usage is recorded before Lob success, so worker failure and partial failure overcharge users
- File path: `backend/routers/mail_campaigns.py:327-332`, `backend/core/tasks/mail_campaign.py:51-95`
- Problem: the route records one `mail_pieces_per_month` usage record per verified recipient immediately after enqueueing the worker. If the worker later fails, sends only some recipients, or never runs, usage is still consumed.
- Why it matters: usage accounting is disconnected from actual paid sends, which is exactly the wrong failure mode for a money-backed integration.
- Specific fix: move usage recording into the worker after each successful Lob piece, or reconcile usage from persisted successful send rows.

### 4. External success followed by a local DB failure can leak spend without a reliable internal record
- File path: `backend/core/tasks/skip_trace_batch.py:41-94`, `backend/core/tasks/mail_campaign.py:53-95`, `backend/core/skip_tracing/service.py:89-126`
- Problem: both waves commit local state in multiple small transactions around an already-paid external call. If the DB write fails after the provider succeeds, the actor can leave a paid side effect with either a failed local row or no usage record.
- Why it matters: this creates the classic "provider succeeded, app thinks it failed" leak that drives duplicate retries and irreconcilable billing.
- Specific fix: persist an outbound attempt record before the provider call, update it transactionally after the provider returns, and use idempotent retry semantics on reconciliation.

## High Priority

### 1. The skip-trace batch worker is not resumable and can leave rows stuck in `processing` forever
- File path: `backend/core/tasks/skip_trace_batch.py:32-45`
- Problem: the worker queries only `status == "pending"`. It immediately commits `status="processing"` before the provider call. If the process dies after that commit but before the final update, retries will never pick the row back up.
- Why it matters: a partial worker crash leaves the batch permanently incomplete and forces manual cleanup.
- Specific fix: claim rows atomically and recover stale `processing` rows by timestamp, or keep the claim in-memory until the provider result is ready to persist.

### 2. There is no provider-aware pacing between BatchData or Lob calls
- File path: `backend/core/tasks/skip_trace_batch.py:41-94`, `backend/core/tasks/mail_campaign.py:51-95`
- Problem: both workers loop back-to-back with no inter-call delay or token-bucket logic.
- Why it matters: rate-limit spikes will convert batch work into avoidable failures, and the mail worker in particular can trigger a large burst of paid outbound traffic with no brake.
- Specific fix: add provider-specific pacing or concurrency limits and retry/backoff on 429s at the task layer.

### 3. Campaign scheduling is a dead state: `scheduled_date` is stored but never honored, and cancel is not enforceable once the worker starts
- File path: `backend/routers/mail_campaigns.py:91-94`, `backend/routers/mail_campaigns.py:343-360`, `backend/core/tasks/mail_campaign.py:33-95`
- Problem: `scheduled_date` is accepted and stored, but no scheduler uses it. `send_campaign()` always queues immediate work. `cancel_campaign()` can mark a campaign cancelled, but the worker never re-checks that status before sending.
- Why it matters: the API advertises a scheduled lifecycle it does not implement. Users can think they scheduled or cancelled a campaign and still get immediate spend.
- Specific fix: either remove scheduling until it exists, or implement a real delayed dispatch path and make the worker honor cancellation before every recipient send.

### 4. Delivery polling is never enqueued, so analytics will stay stale
- File path: `backend/core/tasks/mail_campaign.py:99-148`, `backend/routers/mail_campaigns.py`, `frontend/src/pages/mail/CampaignAnalyticsPage.tsx:173-313`
- Problem: `check_mail_delivery()` exists, but nothing calls `.send()` on it. Delivery totals therefore never advance beyond the initial send snapshot.
- Why it matters: the analytics funnel is not trustworthy, and campaign ROI/reporting based on delivery is effectively dead on arrival.
- Specific fix: enqueue delivery polling after send completion, continue polling until all recipients reach terminal states, and derive aggregate metrics from recipient rows.

### 5. Template rendering silently blanks missing variables, and the frontend preview does not exercise the real backend render path
- File path: `backend/core/direct_mail/service.py:231-247`, `backend/core/direct_mail/service.py:253-300`, `frontend/src/pages/mail/CampaignBuilderPage.tsx:121-145`, `frontend/src/pages/mail/CampaignBuilderPage.tsx:632-645`
- Problem: the backend replaces unknown placeholders with `""`. If a recipient lacks `property_address` or another referenced field, the mail piece is still sent with blank personalization. The builder preview uses static sample data and a separate regex, so it will not reveal recipient-specific blanks.
- Why it matters: users can spend money mailing broken copy that looked fine in the builder.
- Specific fix: preflight every recipient against the actual backend render path, flag unresolved or empty-required placeholders, and block send unless the user explicitly resolves or accepts them.

### 6. Removed recipients still come back in campaign reads, so review counts and recipient lists are wrong
- File path: `backend/models/mail_campaigns.py:52-56`, `backend/routers/mail_campaigns.py:126-134`, `frontend/src/pages/mail/CampaignBuilderPage.tsx:752-814`, `frontend/src/pages/mail/CampaignAnalyticsPage.tsx:177-313`
- Problem: recipient deletion is soft-delete only, but the `MailCampaign.recipients` relationship is unfiltered. `GET /mail-campaigns/{id}` therefore rehydrates deleted recipients back into the builder and analytics views.
- Why it matters: users cannot trust whether a recipient was truly removed, and frontend cost/review screens can drift from the actual send query.
- Specific fix: filter the relationship or the response serializer to `deleted_at IS NULL`.

### 7. The skip-tracing UI can crash on normal backend responses, and its history “View” links point to a route that does not exist
- File path: `backend/schemas/skip_tracing.py:52-54`, `frontend/src/types/index.ts:1577-1579`, `frontend/src/components/skip-tracing/SkipTraceResultCard.tsx:187-218`, `frontend/src/pages/skip-tracing/SkipTracingPage.tsx:218-220`, `frontend/src/pages/skip-tracing/SkipTracingPage.tsx:286-291`, `frontend/src/App.tsx:194-199`
- Problem: the backend returns `phones` and `emails` as nullable, but the frontend types and result card assume arrays and immediately call `.length`. The history table also links to `/skip-tracing/:id`, but there is no corresponding route or page.
- Why it matters: a `not_found` or sparse result can crash the page, and the main “View” affordance is dead.
- Specific fix: make the frontend types nullable-safe, normalize nulls to empty arrays before rendering, and either add a detail route/page or remove the dead link.

## Medium Priority

### 1. Skip-tracing input validation is too loose for a paid API path
- File path: `backend/schemas/skip_tracing.py:21-32`, `frontend/src/pages/skip-tracing/SkipTracingPage.tsx:163-214`
- Problem: the backend only requires `address` or `property_id`. The frontend button enables with just `street` or `zip`. That allows requests with missing city/state/ZIP to reach BatchData.
- Why it matters: malformed traces turn into avoidable failed or low-quality provider calls, and the current single-trace usage logic can still count them.
- Specific fix: require a complete address for manual traces on both client and server, normalize state/ZIP, and reject obviously incomplete requests before hitting BatchData.

### 2. The batch CSV parser is too naive for an expensive bulk action
- File path: `frontend/src/pages/skip-tracing/BatchSkipTracePage.tsx:22-43`, `frontend/src/pages/skip-tracing/BatchSkipTracePage.tsx:67-75`
- Problem: CSV parsing is just `split(',')`, with no quoted-field handling, no column validation beyond presence, and no requirement that city/state/ZIP are populated.
- Why it matters: a malformed file can silently queue the wrong addresses or incomplete records into a paid batch.
- Specific fix: use a real CSV parser, validate each row strictly, and show row-level errors before queueing the batch.

### 3. Quick-send from property/contact detail pages is not actually implemented
- File path: `frontend/src/pages/properties/PropertyDetailPage.tsx:342-348`, `frontend/src/pages/contacts/ContactDetailPage.tsx:177-183`, `frontend/src/hooks/useMailCampaigns.ts:100-106`
- Problem: the spec called for quick-send from property/contact detail pages, but both buttons only route to `/mail-campaigns/new`. The `useQuickSend()` hook is never used.
- Why it matters: the highest-leverage direct-mail workflow from Wave 6 is missing, and the existing UI does not prefill the destination context it claims to launch from.
- Specific fix: add a real quick-send modal or prefilled route state that calls `POST /mail-campaigns/quick-send`.

### 4. Several new API contracts are already drifting between backend and frontend
- File path: `backend/routers/skip_tracing.py:192-244`, `frontend/src/lib/api.ts:823-833`, `backend/routers/mail_campaigns.py:291-360`, `frontend/src/lib/api.ts:858-861`, `backend/schemas/mail_campaigns.py:54-63`, `frontend/src/types/index.ts:1729-1736`
- Problem: `GET /skip-tracing/history` returns a bare list but the frontend client types it as `{ items, total }`; `/mail-campaigns/{id}/send` and `/cancel` return full campaign objects but the client types them as `{ status: string }`; backend quick-send expects `template_front_html` / `template_back_html` while frontend quick-send types use `front_html` / `back_html`.
- Why it matters: these mismatches are how half-finished flows break the moment someone wires them up or turns on strict type checking.
- Specific fix: pick one contract per endpoint, align backend schemas and frontend types, and add lightweight integration tests around the real API shapes.

### 5. Direct-mail send and personalization will degrade with N+1 queries and per-recipient commits
- File path: `backend/core/direct_mail/service.py:263-286`, `backend/core/tasks/mail_campaign.py:40-95`
- Problem: `_build_context()` does per-recipient `Contact` and `Property` lookups, and the worker commits inside the loop after every send attempt.
- Why it matters: larger campaigns will spend more time churning the database than sending mail, and failure handling becomes harder to reason about.
- Specific fix: preload linked contacts/properties in bulk and batch commits where possible.

### 6. Cost observability is incomplete across both waves
- File path: `backend/core/skip_tracing/service.py:112-123`, `backend/core/tasks/skip_trace_batch.py`, `backend/core/tasks/mail_campaign.py`, `docs/superpowers/specs/2026-04-05-direct-mail-design.md:13`
- Problem: skip traces only create `DataSourceEvent` rows when `property_id` is present, batch skip traces do not log per-call source events, and direct-mail sends do not log `DataSourceEvent` cost records at all even though the design spec called for it.
- Why it matters: reconciling provider spend against user actions will be difficult right where money is on the line.
- Specific fix: emit a cost/audit record for every external provider call, even when the action is not linked to a property.

### 7. Skip-trace contact creation does not guard against bad source rows or deleted contacts
- File path: `backend/core/skip_tracing/service.py:140-204`, `backend/models/contacts.py:30-31`
- Problem: `create_contact_from_trace()` never checks that the source trace was `found`, and its phone/email match queries ignore `Contact.is_deleted`.
- Why it matters: API callers can create junk “Unknown” contacts from failed traces, and deleted contacts can be silently resurrected as matches.
- Specific fix: require `skip_trace.status == "found"` before creation, and exclude deleted contacts from the match path.

## Low Priority

### 1. `LOB_ENV` from the design spec is not implemented
- File path: `docs/superpowers/specs/2026-04-05-direct-mail-design.md:87`, `backend/core/direct_mail/lob_provider.py`
- Problem: the spec calls for `LOB_ENV` (`test` / `live`), but the provider only reads `LOB_API_KEY`.
- Why it matters: environment intent is implicit rather than explicit, which makes safety rails weaker around live-mail configuration.
- Specific fix: wire `LOB_ENV` into startup validation and refuse live sends in non-production environments unless explicitly allowed.

### 2. Deliverability UX is lossy
- File path: `frontend/src/pages/mail/CampaignBuilderPage.tsx:147-163`, `frontend/src/hooks/useMailCampaigns.ts:61-70`
- Problem: the badge collapses unknown values like `deliverable_missing_unit` into a generic fallback, and the success toast omits `no_match`.
- Why it matters: users lose the nuance needed to decide whether to fix an address or intentionally mail it anyway.
- Specific fix: map every backend deliverability state explicitly and show the full verification summary.

### 3. There is no targeted automated coverage for the highest-risk Wave 5 / 6 paths
- File path: `backend/tests/`, `frontend/src/`
- Problem: there are no focused tests for quota handling, provider failure classification, worker idempotency, address verification semantics, template rendering, or skip-trace UI null handling.
- Why it matters: the most expensive and highest-risk code shipped without regression nets.
- Specific fix: add backend tests around quota/accounting, worker retries, and ownership validation, plus frontend tests for result rendering, history routing, and builder/send flows.

## Previous Fix Regression Check

- JWT enforcement: held. The new routers consistently require `get_current_user`; no new public endpoints were introduced.
- Cross-tenant isolation: regressed. Wave 4 already had foreign-ID trust problems, and Wave 6 reintroduces the same class of bug via unvalidated `contact_id` / `property_id` on mail recipients.
- Webhook security: held. Waves 5 and 6 did not add new public webhook surfaces.
- Async engine / event-loop safety: held. The new FastAPI paths use async providers, and the worker paths use sync provider methods rather than reintroducing `run_until_complete()` inside request handlers.
- Opt-out / suppression: partially regressed in spirit. Wave 4 hardened outbound comms around opt-out concerns, but Wave 5 ships without the promised compliance gate and Wave 6 has no direct-mail suppression model at all.

## Positive Findings

- `BatchDataProvider` and `LobProvider` use the correct auth mechanisms and provide separate async/sync call paths, which is the right abstraction for FastAPI plus Dramatiq.
- The primary resource reads themselves are generally ownership-scoped: skip traces are filtered by `created_by`, and campaigns are loaded through `created_by` checks before mutation.
- Tier limit constants match the intended product numbers: skip tracing is `25` for Pro and `200` for Business, and direct mail is `100` pieces for Business.
- BatchData phone-type normalization and baseline defensive response parsing are directionally solid, even though the downstream usage/accounting logic still needs hardening.
