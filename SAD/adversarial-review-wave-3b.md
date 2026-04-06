# PARCEL Adversarial Review — Wave 3B

Reviewed `SAD/CANONICAL-PRODUCT-BLUEPRINT.md`, `SAD/adversarial-review-wave-3a.md`, and the Wave 3B commit range `59d49d3^..e572501` covering buyer management, buy boxes, match scoring, buyer packets, dispositions endpoints, and the related frontend surfaces. I also spot-checked the scoring engine with local Python snippets to confirm normalization and scoring behavior.

## Critical Issues

### 1. Canonical value mismatches break filtering and scoring across buyers and dispositions
- File path: `frontend/src/components/buyers/BuyBoxEditor.tsx:11-13`, `frontend/src/components/buyers/BuyBoxEditor.tsx:139-229`, `frontend/src/components/buyers/AddBuyerModal.tsx:18`, `frontend/src/components/buyers/AddBuyerModal.tsx:180-194`, `backend/core/dispositions/match_engine.py:237-248`, `backend/core/dispositions/match_engine.py:294-302`, `backend/routers/buyers.py:136-160`, `backend/routers/dispositions.py:237-240`, `frontend/src/pages/buyers/BuyersListPage.tsx:20-35`, `frontend/src/pages/dispositions/MatchResultsPage.tsx:41-67`, `frontend/src/pages/dispositions/MatchResultsPage.tsx:142`
- What the problem is: the UI stores label values like `SFH`, `Buy & Hold`, `Creative Finance`, and `Hard Money`, while the backend filters and scorer expect canonical slugs / DB values like `single_family`, `buy_and_hold`, `creative_finance`, and `hard_money`. That means buy-box strategy filters never match, property-type scoring loses points for otherwise valid matches, and funding filters fail on the buyers list and match results page.
- Why it matters: this is the core of the Wave 3B feature set. A buyer can have a perfectly valid buy box and still be filtered out or scored down for format reasons instead of business reasons.
- Specific suggested fix: move to one canonical enum contract end-to-end. Send/store only canonical values in requests and JSONB, map to friendly labels only for display, normalize/backfill existing `buy_boxes` rows, and add API contract tests that exercise filter + score behavior with the values the frontend emits.

### 2. Buyer packet share links and payload shape are inconsistent end-to-end
- File path: `backend/routers/dispositions.py:124-155`, `backend/routers/dispositions.py:173-175`, `backend/routers/dispositions.py:532-582`, `frontend/src/App.tsx:147-148`, `frontend/src/types/index.ts:1349-1379`, `frontend/src/pages/dispositions/SharedPacketPage.tsx:125-136`, `frontend/src/pages/dispositions/SharedPacketPage.tsx:257-314`
- What the problem is: the backend generates `share_url` as `/packets/{token}`, but the frontend only routes `/packets/view/:shareToken`. Even on the correct route, the public page expects `packet_data.property.address`, top-level `ai_narrative`, and top-level `seller_name/email/phone`, while the backend freezes `address_line1`, nests `ai_narrative` inside `scenario`, and nests seller info under `seller`.
- Why it matters: the public buyer-packet feature is effectively broken. Generated links 404, addresses render incomplete, AI narrative disappears, and the seller CTA is missing.
- Specific suggested fix: define one packet snapshot contract and use it everywhere. Update `_share_url()` to `/packets/view/{token}`, align the frozen JSON shape with the public page/types, and add an end-to-end test that creates a packet, opens the returned URL, and asserts address, narrative, and seller CTA render.

### 3. Match Results can freeze and send the wrong scenario
- File path: `frontend/src/pages/dispositions/MatchResultsPage.tsx:279-287`, `frontend/src/pages/dispositions/MatchResultsPage.tsx:514-528`, `backend/routers/properties.py:572-576`, `backend/routers/dispositions.py:191-195`, `backend/routers/dispositions.py:471-480`
- What the problem is: match scoring uses `_get_primary_scenario()` (latest scenario by `created_at`), but the frontend chooses `scenarioId` from `api.properties.scenarios()[0]`. That endpoint sorts by `AnalysisScenario.strategy`, not recency. On a property with multiple scenarios, the page can show matches for one scenario and freeze a different one into the packet.
- Why it matters: users can send a buyer packet whose numbers and strategy do not match the scores they reviewed on the page.
- Specific suggested fix: include the scored `scenario_id` in `PropertyMatchResponse`, or have the dispositions endpoint return a packet-create-ready scenario reference. Do not let the client infer scenario identity from array order.

## Security Issues

### 1. Packet sending does not require recipient contacts to actually be buyers
- File path: `backend/routers/dispositions.py:658-666`
- What the problem is: `POST /api/dispositions/packets/{packet_id}/send` only validates ownership and `is_deleted`, not `contact_type == "buyer"`.
- Why it matters: packet links and seller notes can be attached to sellers, contractors, tenants, or any other owned contact, which is both a privacy and workflow integrity problem on an endpoint explicitly meant for buyer outreach.
- Specific suggested fix: add `Contact.contact_type == "buyer"` to the validation query and reject non-buyer IDs with 400/404.

### 2. Public packet view analytics are trivially inflatable and `opened_at` is never populated
- File path: `backend/routers/dispositions.py:593-617`, `backend/routers/dispositions.py:629-707`, `backend/models/buyer_packets.py:43-52`
- What the problem is: the public share endpoint increments `view_count` and `last_viewed_at` on every request, with no limiter, no bot filtering, no owner suppression, and no deduplication. At the same time, `BuyerPacketSend.opened_at` exists in the model but no code path ever sets it, and all recipients share the same public token so per-recipient opens cannot be inferred later.
- Why it matters: the open/view metrics this wave introduces are not trustworthy and can be gamed by refreshes, bots, prefetchers, or the sender themselves.
- Specific suggested fix: add request-rate limiting, accept `Request` and mirror the report-share bot/owner/IP dedup logic, and switch to individualized open tokens or a logged share-open endpoint that can update the matching `BuyerPacketSend.opened_at`.

## High Priority

### 1. `min_coc_return` exists in the model/schema but is ignored by the scorer
- File path: `backend/core/dispositions/match_engine.py:111-228`, `backend/routers/dispositions.py:103-121`, `backend/models/buy_boxes.py:27-35`, `backend/schemas/buyers.py:47-54`
- What the problem is: `BuyBox.min_coc_return` is stored and exposed, but `_buy_box_to_dict()` drops it and `_score_financial()` never checks `outputs.coc_return`.
- Why it matters: a buy box can specify a cash-on-cash floor and still receive a perfect or near-perfect score. I confirmed locally that a `min_coc_return` threshold higher than the scenario output still returns `100`.
- Specific suggested fix: pass `min_coc_return` through `_buy_box_to_dict()`, score against `outputs.coc_return`, and rebalance the financial weighting so all declared criteria are actually enforced.

### 2. Buy-box and packet validation is too weak to protect data quality
- File path: `backend/models/buy_boxes.py:23-54`, `backend/schemas/buyers.py:43-90`, `backend/schemas/dispositions.py:89-95`, `frontend/src/components/buyers/BuyBoxEditor.tsx:46-49`, `frontend/src/components/buyers/BuyBoxEditor.tsx:112-137`, `frontend/src/components/buyers/BuyBoxEditor.tsx:200-241`, `frontend/src/components/dispositions/CreatePacketModal.tsx:154-181`
- What the problem is: the API accepts `min_price > max_price`, `min_year_built > max_year_built`, implausible year ranges, and negative `can_close_days` / packet pricing. The editor also allows `min_bathrooms` in `0.5` increments even though the backend schema/model declare `int`.
- Why it matters: invalid criteria get stored silently, and users hit confusing frontend/backend mismatches instead of deterministic validation.
- Specific suggested fix: add Pydantic validators plus DB `CheckConstraint`s for nonnegative and ordered ranges, clamp year ranges to a sane window, and either make bathrooms decimal throughout or restrict the UI to integers.

### 3. Buyer Detail’s Deal History is broken on both the response and routing contracts
- File path: `backend/schemas/buyers.py:108-112`, `backend/routers/buyers.py:174-211`, `frontend/src/types/index.ts:1192-1197`, `frontend/src/pages/buyers/BuyerDetailPage.tsx:138`, `frontend/src/pages/buyers/BuyerDetailPage.tsx:194-195`, `frontend/src/pages/buyers/BuyerDetailPage.tsx:470-499`, `frontend/src/App.tsx:158-160`
- What the problem is: the backend never returns a `deals` field, the frontend type requires it, and the page links to `/deals/:id` even though that route does not exist.
- Why it matters: the Deal History section always renders empty today, and if it were populated later it would still navigate users into a 404.
- Specific suggested fix: either add a real `deals` payload and link to an existing detail route such as `/analyze/deal/:dealId`, or remove/hide the section until both the API and route exist.

### 4. The create+send packet modal is not atomic and misreports partial failures
- File path: `frontend/src/components/dispositions/CreatePacketModal.tsx:73-105`
- What the problem is: the modal creates the packet first, then sends it. If send fails, the catch path says “Failed to create packet” even though the packet already exists. A retry creates a second packet.
- Why it matters: this leaves duplicate packets in the database and gives users the wrong mental model of what succeeded.
- Specific suggested fix: either move create+send orchestration into one backend endpoint/transaction, or persist the created packet ID/share URL client-side and retry only the send step with accurate messaging.

### 5. Quick-add buyer has two competing sources of truth for funding type and proof-of-funds
- File path: `frontend/src/components/buyers/AddBuyerModal.tsx:43-44`, `frontend/src/components/buyers/AddBuyerModal.tsx:72-87`, `frontend/src/components/buyers/AddBuyerModal.tsx:180-219`, `frontend/src/components/buyers/AddBuyerModal.tsx:233`, `frontend/src/components/buyers/BuyBoxEditor.tsx:214-265`, `backend/routers/buyers.py:302-311`
- What the problem is: step 1 collects `funding_type` and `proof_of_funds`, step 2 collects the same fields again inside `BuyBoxEditor`, and the backend overwrites the buy-box values with the step-1 values when they are present.
- Why it matters: the user can edit the value on the final screen and still save a different value than the one they see.
- Specific suggested fix: keep those fields in exactly one place, or merge them with explicit precedence and synced initial state.

## Medium Priority

### 1. The legacy buyer-matches endpoint has drifted away from the scored matching rules
- File path: `backend/routers/buyers.py:328-426`
- What the problem is: `GET /api/buyers/{contact_id}/matches` still implements its own partial matching logic. It ignores several buy-box fields, mishandles combined market strings like `"Phoenix, AZ"` via raw `.contains()` checks, and truncates bathrooms to `int`.
- Why it matters: there are now two different matching engines in the codebase that can return different answers for the same buyer/property pair.
- Specific suggested fix: delete the legacy endpoint/hook if it is no longer part of the product, or make it call the shared scoring engine so all matching surfaces stay consistent.

### 2. Match reasons and funding badges are rendered misleadingly on the results page
- File path: `frontend/src/pages/dispositions/MatchResultsPage.tsx:142-146`, `frontend/src/pages/dispositions/MatchResultsPage.tsx:220-255`, `backend/core/dispositions/match_engine.py:69-107`, `backend/core/dispositions/match_engine.py:128-223`
- What the problem is: the UI decides positive vs. negative reasons from string prefixes, but the backend emits plain English sentences. “No purchase price restriction” is rendered as a negative, while “outside range” is treated as positive. Funding badge styling also keys off raw strings, so values like `"Hard Money"` fall back to the generic gray badge.
- Why it matters: users get the wrong explanation for why a buyer matched and lose confidence in the score breakdown.
- Specific suggested fix: return structured reasons from the API (`kind`, `dimension`, `text`) and normalize funding values before badge styling.

### 3. Soft-deleting a contact leaves active buy boxes behind
- File path: `backend/models/contacts.py:30-33`, `backend/models/buy_boxes.py:16-57`, `backend/routers/contacts.py:334-343`
- What the problem is: deleting a contact only flips `contacts.is_deleted`. Their related buy boxes remain active rows with no soft-delete/deactivation.
- Why it matters: this leaves orphan buyer criteria in the database and makes restore/reporting behavior inconsistent.
- Specific suggested fix: when soft-deleting a contact, soft-delete or deactivate related buy boxes in the same transaction.

### 4. Existing buy boxes are still create/delete only in the UI
- File path: `frontend/src/pages/buyers/BuyerDetailPage.tsx:16-20`, `frontend/src/pages/buyers/BuyerDetailPage.tsx:201-277`, `frontend/src/pages/buyers/BuyerDetailPage.tsx:279-363`, `frontend/src/hooks/useBuyers.ts:59-68`
- What the problem is: the backend exposes PATCH support and the frontend has a `useUpdateBuyBox()` hook, but no component actually lets users edit an existing buy box.
- Why it matters: Wave 3B shipped only half of buy-box CRUD in the product surface. Users must delete and recreate buy boxes to correct criteria.
- Specific suggested fix: reuse `BuyBoxEditor` for an inline or modal edit state in `BuyBoxCard` and wire it to `useUpdateBuyBox()`.

## Low Priority

### 1. Buyer detail analytics fire on every render
- File path: `frontend/src/pages/buyers/BuyerDetailPage.tsx:92-102`
- What the problem is: the PostHog capture call is inside render instead of `useEffect()`.
- Why it matters: query refreshes and local state changes can spam `buyer_detail_viewed` analytics.
- Specific suggested fix: move the capture into `useEffect()` keyed to `contactId` / loaded buyer.

### 2. Wave 3B shipped without targeted automated coverage for buyers/dispositions
- File path: `backend/tests/`, `frontend/src/__tests__/`
- What the problem is: there are no focused tests for the new buyers router, dispositions router, match engine, or the buyer/packet frontend pages.
- Why it matters: the contract mismatches above are the kind of integration bugs thin endpoint/UI tests should have caught immediately.
- Specific suggested fix: add backend tests for normalization, score math, ownership, and public-share tracking, plus frontend tests for packet links, shared-packet rendering, and match-page scenario selection.

## Previous Fix Regression Check

- JWT enforcement: held. All new Wave 3B buyer/dispositions routes except the deliberate public share endpoint use `get_current_user`.
- Cross-tenant validation consistency: partially held. Property/contact ownership checks are present, but `POST /packets/{packet_id}/send` still accepts non-buyer contacts and `POST /packets` does not include `AnalysisScenario.created_by == current_user.id` in the scenario lookup.
- Bulk limits: partially held. `SendPacketRequest` caps recipient IDs at 50, but the public share and send endpoints still have no request-rate limiting.

## Performance Concerns

### 1. Buyers list is N+1 and filters in Python after loading the full buyer set
- File path: `backend/routers/buyers.py:62-95`, `backend/routers/buyers.py:129-163`
- What the problem is: `_build_buyer_item()` issues up to three extra queries per buyer, and the route then applies funding/market/strategy filters in memory after `all()`.
- Why it matters: with 500 buyers this becomes hundreds or thousands of queries and bypasses the database’s ability to use indexes for filtering.
- Specific suggested fix: batch-load buy boxes, deal counts, and last communications for the whole buyer ID set, and push filters into SQL or pre-normalized columns.

### 2. Dispositions matching and packet listing also have avoidable N+1 query patterns
- File path: `backend/routers/dispositions.py:197-233`, `backend/routers/dispositions.py:331-356`, `backend/routers/dispositions.py:567-587`
- What the problem is: property-to-buyers does one buy-box query per buyer, buyer-to-properties does one scenario query per property, and packet listing does one send-count query per packet.
- Why it matters: the wave will slow down sharply as portfolios and buyer lists grow.
- Specific suggested fix: preload active boxes grouped by contact, preload scenarios keyed by property, and replace per-packet send counts with one grouped aggregate.

## Positive Findings

- The new Wave 3B endpoints mostly preserve ownership checks: property lookups, buyer lookups, packet ownership, and soft-delete filtering are consistently present.
- The match engine is pure and bounded to four 25-point dimensions, so its total score remains deterministic and testable.
- Buyer packets do freeze a JSON snapshot in `buyer_packets.packet_data`, which means later property/scenario edits or soft-deletes do not erase the packet payload itself.
- The “Find Buyers” entry points on property detail and analysis results both pass the correct `propertyId` into the dispositions match page.
