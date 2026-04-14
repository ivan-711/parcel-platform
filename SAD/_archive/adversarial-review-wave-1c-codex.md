# PARCEL Adversarial Review — Wave 1C (Codex)

Validation context: read `SAD/CANONICAL-PRODUCT-BLUEPRINT.md`, `SAD/adversarial-review-wave-1a.md`, and `SAD/adversarial-review-wave-1b.md`, then inspected the listed Wave 1C files plus adjacent routers/models they depend on. I did not execute full `pytest` or `npm run build` in this environment.

## Critical Issues (must fix before Wave 2)

### 1. Chat session and context isolation are broken
- File path: `frontend/src/components/chat/ChatPanel.tsx:219-239`, `frontend/src/components/chat/ChatPanel.tsx:271-283`, `frontend/src/lib/api.ts:272-275`, `backend/routers/chat.py:250-275`
- What the problem is: `ChatPanel` keys history by `contextType/contextId`, but it always calls `api.chat.history()` with no `session_id`, `context_type`, or `context_id`. Every mount also invents a fresh `sessionId` and then resends the entire mixed message list back to the model on every turn. In practice, general chat, deal chat, and document chat all bleed into each other, and “sessions” are fake.
- Why it matters: A question about one document can be answered with stale context from another document or another deal. That is a trust-breaking product error, and it also explodes token cost as conversations grow.
- Specific suggested fix: Persist a real `session_id` per conversation, pass `session_id/context_type/context_id` into the history request, reset local message state when context changes, and stop trusting arbitrary client-supplied history as the canonical source of truth.

### 2. Shared-report analytics are fundamentally corrupted
- File path: `backend/routers/reports.py:302-331`, `backend/core/tasks/pdf_generation.py:53-66`, `frontend/src/pages/reports/SharedReportPage.tsx:189-194`, `frontend/src/pages/reports/SharedReportPage.tsx:222-231`
- What the problem is: `GET /api/reports/share/{token}` increments `view_count` and inserts a `ReportView`. That means a crawler, a link preview bot, a React Query refetch, or the Playwright PDF worker all count as “real views.” The increment is also a read-modify-write (`report.view_count = report.view_count + 1`), so concurrent views can overwrite each other. The repeated focus/refetch behavior is an inference from TanStack Query defaults because this query does not disable window-focus refetch.
- Why it matters: Report engagement numbers are now fiction. PDF exports inflate views, tab refocus inflates views, concurrent traffic loses updates, and Today’s report-engagement summary becomes untrustworthy.
- Specific suggested fix: Make the GET endpoint side-effect-free. Move view logging to a dedicated idempotent POST keyed by a visit/session identifier, exclude internal worker traffic from analytics, and use an atomic SQL increment instead of mutating the ORM object in Python.

### 3. Document embedding retries create duplicate chunks and permanently poison retrieval
- File path: `backend/core/tasks/document_processing.py:117-157`, `backend/core/tasks/document_processing.py:183-190`, `backend/models/document_chunks.py:21-49`
- What the problem is: The embedding worker commits chunk rows batch-by-batch, then raises on failure so Dramatiq retries the job. The retry path never deletes or upserts existing chunks, and the model has no uniqueness constraint on `(document_id, chunk_index)`.
- Why it matters: One transient OpenAI failure can permanently duplicate chunk rows for a document. Retrieval then returns duplicate evidence, citations get noisy, storage balloons, and every retry burns more embedding spend than the last one.
- Specific suggested fix: Add a unique constraint on `(document_id, chunk_index)`, clear/rebuild chunks at job start or upsert by chunk index, and store retry-safe progress separately instead of blindly appending.

### 4. Existing-property analysis can return the wrong strategy and suppress new enrichment
- File path: `backend/core/property_data/service.py:186-204`
- What the problem is: Once a property already exists, `enrich_property()` returns the newest scenario for that property regardless of the requested strategy and skips all provider work. A second analysis of the same address does not create or select the requested scenario.
- Why it matters: A user can ask for a flip analysis on an address previously analyzed as buy-and-hold and get the old buy-and-hold scenario back. That breaks the multi-strategy promise at the core service layer.
- Specific suggested fix: On existing properties, load the requested strategy if it exists, create a new scenario if it does not, and track enrichment completeness so incomplete records can be retried instead of short-circuited forever.

## Security Issues (fix immediately)

### 1. Public report share tokens are being exfiltrated to PostHog
- File path: `frontend/src/pages/reports/SharedReportPage.tsx:196-200`, `frontend/src/pages/reports/SharedReportPage.tsx:260-263`
- What the problem is: The public share page sends `share_token` into `posthog.capture()` on page view and link copy.
- Why it matters: The share token is the bearer secret for the report. If PostHog is enabled, anyone with access to analytics events can open the report.
- Specific suggested fix: Never send raw share tokens to analytics. If you need attribution, emit a server-side internal ID or a keyed hash that cannot be used to reopen the report.

### 2. Brand-kit logos allow arbitrary third-party tracking URLs
- File path: `backend/schemas/reports.py:89-100`, `backend/routers/settings.py:52-63`, `frontend/src/pages/reports/SharedReportPage.tsx:105-108`, `backend/core/tasks/pdf_generation.py:66-81`
- What the problem is: The brand-kit validator allows any HTTPS image URL with a friendly extension. The public report page and the PDF worker both fetch that URL directly.
- Why it matters: A malicious logo URL can track every report viewer, leak the PDF worker’s IP/network, and deliberately stall or break PDF generation with huge or slow image responses.
- Specific suggested fix: Accept only first-party uploaded logos from Parcel-controlled storage, or proxy/sanitize remote logos server-side. Do not embed arbitrary third-party URLs in public report payloads.

### 3. Reports are public by default even when the audience is internal
- File path: `backend/routers/reports.py:137-149`, `frontend/src/components/reports/CreateReportModal.tsx:42-43`, `frontend/src/components/reports/CreateReportModal.tsx:117-129`, `frontend/src/components/reports/CreateReportModal.tsx:152-160`
- What the problem is: Every newly created report gets `is_public=True` and a live `share_token`, even if the audience selected in the UI is `internal`. The modal then auto-copies the link.
- Why it matters: Internal reports are shareable by default. That is exactly backward from a safe default and makes accidental disclosure the default path.
- Specific suggested fix: Default new reports to `is_public=False`, require an explicit “Share” action to mint/activate the token, and only auto-copy when the user explicitly chose to share.

### 4. Document-chat fallback context is still prompt-injectable
- File path: `backend/routers/chat.py:75-109`, `backend/routers/chat.py:181-183`
- What the problem is: Deal context goes through `sanitize_for_prompt()`. Document fallback context does not. `ai_summary`, `risk_flags`, `key_terms`, `extracted_numbers`, `original_filename`, and `document_type` are interpolated raw into the system prompt.
- Why it matters: Uploaded documents are user-controlled. If the extraction step echoes malicious instructions into the summary or flags, the second model receives attacker text as privileged system context.
- Specific suggested fix: Sanitize every document-derived field before prompt assembly or serialize the fallback payload as escaped JSON inside a strictly delimited block.

### 5. Document upload trusts `property_id` ownership and file extensions only
- File path: `backend/routers/documents.py:40-95`
- What the problem is: The upload endpoint never verifies that `property_id` belongs to the current user, and it validates file type purely by filename extension.
- Why it matters: A user who learns another property UUID can create cross-tenant links, and disguised uploads can push arbitrary content through the extraction pipeline.
- Specific suggested fix: Verify property ownership before insert, sniff MIME/magic bytes server-side, and reject content whose actual type does not match the claimed extension.

### 6. Report-view “anonymization” is weak and private reports still accept engagement writes
- File path: `backend/routers/reports.py:323-329`, `backend/routers/reports.py:350-369`
- What the problem is: IPs are hashed with unsalted SHA-256 and truncated to 16 hex chars, and `POST /share/{token}/view` writes a `ReportView` row for any non-deleted report with that token, even when `is_public=False`.
- Why it matters: Unsalted IPv4 hashes are brute-forceable, and a leaked token can keep poisoning analytics after public sharing is turned off.
- Specific suggested fix: Use `HMAC(ip, server_secret)` instead of raw hashing, store a stable keyed digest for dedupe, and require `is_public=True` on the engagement endpoint.

## High Priority (fix soon)

### 1. Large documents are silently truncated to 50,000 characters
- File path: `backend/core/documents/extractor.py:5-25`, `backend/core/documents/extractor.py:30-42`, `backend/core/documents/processor.py:100-116`, `backend/core/tasks/document_processing.py:96-110`
- What the problem is: Uploads allow up to 10 MB, but both PDF and DOCX extraction silently truncate the text at 50,000 characters with no user-visible warning.
- Why it matters: Long inspection reports and contracts will miss clauses, risks, and later-page evidence while the UI still marks the document as “complete.”
- Specific suggested fix: Either reject/flag documents beyond the supported text budget or process them incrementally per page/chunk and surface truncation status in the UI.

### 2. RAG retrieval failures do not fall back to metadata chat
- File path: `backend/routers/chat.py:159-168`, `backend/routers/chat.py:181-183`, `backend/core/ai/rag_retrieval.py:27-56`
- What the problem is: If query embedding generation or the pgvector query throws, the request fails before it can use the metadata-summary fallback. The fallback only runs when retrieval returns no chunks, not when retrieval breaks.
- Why it matters: One OpenAI or database hiccup turns document chat into a hard failure even though a usable fallback path already exists.
- Specific suggested fix: Wrap `retrieve_relevant_chunks()` in try/except, log the failure, and explicitly fall back to `_build_document_system_context(doc)`.

### 3. Unrelated chunks can still be cited as authoritative evidence
- File path: `backend/core/ai/rag_retrieval.py:40-56`, `backend/core/ai/rag_retrieval.py:59-115`, `backend/core/ai/rag_retrieval.py:177-215`
- What the problem is: Vector search always returns nearest neighbors and there is no relevance threshold before those chunks are injected as “answer only from these excerpts” evidence.
- Why it matters: Users get citations that look grounded even when the retrieved chunks are only the least-bad matches in the table, not truly relevant evidence.
- Specific suggested fix: Add minimum relevance thresholds, require agreement between vector and keyword results when possible, and fall back to “not enough evidence in the document” when confidence is low.

### 4. Partial or dropped chat streams are stored and billed as if they succeeded
- File path: `backend/routers/chat.py:211-241`, `frontend/src/lib/chat-stream.ts:46-80`, `frontend/src/lib/chat-stream.ts:116-147`
- What the problem is: The backend persists any non-empty assistant text in a `finally` block and records usage even if the stream errors. The frontend also treats an EOF without a `done` event as success.
- Why it matters: Proxy resets, network drops, and manual interruptions can leave half an answer in history and still burn the user’s monthly AI quota.
- Specific suggested fix: Persist and bill only after an explicit successful completion signal. Treat stream termination without `done` as an error and mark interrupted replies separately if you want to keep drafts.

### 5. Citation UI is overstating precision it does not have
- File path: `backend/core/documents/chunker.py:51-52`, `backend/core/documents/chunker.py:77-78`, `backend/core/documents/chunker.py:103-104`, `backend/core/documents/chunker.py:127-131`, `backend/core/ai/rag_retrieval.py:177-215`, `frontend/src/components/chat/CitationBadge.tsx:59-76`
- What the problem is: The backend stores only `approx_page`, but the UI renders it as exact `Page X`. The backend also returns raw RRF scores, and the UI multiplies them by 100 and calls them “% match.”
- Why it matters: Users will eventually notice that the page labels are approximate and the percentage is made up. That erodes trust in the whole citation system.
- Specific suggested fix: Render “Approx. page” unless you can store actual page numbers, and either normalize similarity properly or label the value as a relevance score/rank instead of a percentage.

### 6. Shared-report engagement logging double-counts easily
- File path: `frontend/src/pages/reports/SharedReportPage.tsx:203-243`, `backend/routers/reports.py:341-369`
- What the problem is: The page sends engagement on every `visibilitychange` to hidden and again on `beforeunload`. The `observeSection()` helper also returns a cleanup function from a ref callback, which React does not consume, so observers accumulate across renders.
- Why it matters: A single viewer switching tabs a few times can create multiple engagement rows and multiple “sections viewed” writes for one visit.
- Specific suggested fix: Create observers inside `useEffect` with real cleanup, send engagement once per visit/session, and make the server dedupe repeat beacons.

### 7. Reports list metrics and empty state both lie
- File path: `frontend/src/pages/reports/ReportsListPage.tsx:114-145`, `frontend/src/pages/reports/ReportsListPage.tsx:160-247`, `frontend/src/lib/api.ts:479-481`
- What the problem is: The page ignores pagination and computes `totalViews` / `engagementRate` from only the first page of reports. It also has no `isError` branch, so an API failure falls through to an empty-state story about having no reports.
- Why it matters: Users can be told “0 reports” or low engagement when the API actually failed or when older reports are simply on page 2+.
- Specific suggested fix: Add real error handling, wire pagination controls, and fetch backend aggregate stats instead of deriving metrics from the currently loaded slice.

### 8. Today’s “last 24 hours” report metric is using lifetime counters
- File path: `backend/routers/today.py:441-459`
- What the problem is: The Today briefing sums `Report.view_count` for reports whose `last_viewed_at` is recent. That is cumulative lifetime views, not views within the last 24 hours.
- Why it matters: A report with 200 historical views and one fresh open will make Today claim 200 recent views.
- Specific suggested fix: Aggregate `ReportView.created_at` rows inside the time window instead of reading cumulative counters from `reports`.

### 9. PDF generation has no failure state and no duplicate-job guard
- File path: `backend/routers/reports.py:255-294`, `backend/core/tasks/pdf_generation.py:26-111`, `frontend/src/pages/reports/ReportsListPage.tsx:70-93`
- What the problem is: The backend only exposes `generating` or `ready`. If Playwright fails, polling spins until the client gives up, and another click can queue the same expensive job again.
- Why it matters: Users get a fake “still generating” state forever while the system can keep burning CPU on duplicate exports.
- Specific suggested fix: Persist `pdf_status` and `pdf_error`, dedupe in-flight jobs per report, and return terminal failure states so the client can stop polling and offer a real retry button.

## Medium Priority (tech debt)

### 1. The keyword-search leg cannot use the index that exists
- File path: `backend/core/ai/rag_retrieval.py:138-158`, `backend/models/document_chunks.py:45-48`, `backend/alembic/versions/h8c9d0e1f2g3_add_rag_document_chunks.py:42-45`
- What the problem is: The query uses `to_tsvector(...) @@ plainto_tsquery(...)`, but the only content index is a trigram GIN index on raw `content`. That index will not accelerate this query shape.
- Why it matters: As the chunk table grows, “hybrid search” degenerates into vector search plus a full-text scan.
- Specific suggested fix: Add a real `tsvector` GIN index or switch the keyword leg to a trigram operator/query that can use the existing index.

### 2. `embedding_status="partial"` is unsupported end-to-end
- File path: `backend/core/tasks/document_processing.py:128-135`, `frontend/src/types/index.ts:746-763`, `frontend/src/components/documents/document-detail.tsx:101-129`
- What the problem is: The worker can set `embedding_status` to `partial`, but the frontend types and UI only understand `pending | processing | complete | failed`.
- Why it matters: The API and UI state machines already disagree, which is exactly how weird stuck states and bad polling logic start.
- Specific suggested fix: Either support `partial` everywhere or remove it and use a different resumable error model.

### 3. Contextualizer batch parsing is wrong after the first batch
- File path: `backend/core/documents/contextualizer.py:55-81`, `backend/core/documents/contextualizer.py:102-124`
- What the problem is: The prompt numbers later batches with absolute chunk numbers (`Chunk 11`, `Chunk 12`, ...), but the parser only matches `Chunk 1`, `Chunk 2`, etc. inside each batch.
- Why it matters: Later batch summaries can keep literal numbering text or mis-parse entirely, which pollutes the stored contextualized content and therefore the embeddings.
- Specific suggested fix: Parse absolute numbering correctly or renumber each batch from 1 in the prompt.

### 4. Brand-kit PATCH semantics are wrong and validation is too shallow
- File path: `backend/routers/settings.py:52-63`, `backend/schemas/reports.py:79-100`
- What the problem is: PATCH merges `existing.update(update)` and uses `exclude_none=True`, so users cannot actually clear fields like `logo_url`. Unknown JSONB keys already stored in `users.brand_kit` also survive forever, and only `logo_url` gets real validation.
- Why it matters: Stale branding sticks around, malformed keys keep leaking into report snapshots, and the stored brand-kit object drifts away from the schema contract.
- Specific suggested fix: Rewrite the stored brand kit from a sanitized schema-shaped object, allow explicit null/unset semantics, and validate colors/contact fields instead of only the logo URL.

### 5. Property-data confidence tracking is internally inconsistent
- File path: `backend/core/property_data/service.py:69-90`, `backend/core/property_data/service.py:267-335`, `backend/core/property_data/service.py:583-591`
- What the problem is: `_build_data_sources()` hardcodes `"confidence": "single_source"` and uses last-writer-wins source tracking even when `_build_confidence()` has already classified a field as `multi_source`. `enrich_with_bricked()` then overwrites `scenario.source_confidence` back to `single_source` again.
- Why it matters: The provenance/confidence story becomes least trustworthy exactly when multiple providers touched the same field. That undermines any UI or narrative that tries to defend the numbers.
- Specific suggested fix: Store all contributing providers per field in one canonical structure and derive confidence from that shared structure instead of maintaining conflicting last-writer maps.

### 6. Chat session titles are lexical minimums, not first messages
- File path: `backend/routers/chat.py:306-320`
- What the problem is: `get_chat_sessions()` uses `func.min(ChatMessage.content)` to get a title. That returns the lexicographically smallest message, not the earliest one.
- Why it matters: Session lists will eventually show garbage titles that have nothing to do with how the conversation started.
- Specific suggested fix: Use a subquery/window function keyed to the earliest `created_at` message per session.

### 7. Public report rendering is brittle against malformed snapshots
- File path: `frontend/src/pages/reports/SharedReportPage.tsx:248-255`, `frontend/src/pages/reports/SharedReportPage.tsx:295-449`
- What the problem is: The page assumes `report_data.property`, `report_data.scenario`, `scenario.outputs`, and `brand_kit` always exist in the expected shape. There are no runtime guards.
- Why it matters: One malformed legacy row or partial snapshot can hard-crash a public share link instead of showing a clean “report unavailable” state.
- Specific suggested fix: Validate the payload before rendering and fail closed with a report-specific error state.

### 8. `CompsCard` does not scale and swallows failures
- File path: `frontend/src/components/analysis/CompsCard.tsx:15-25`, `frontend/src/components/analysis/CompsCard.tsx:95-121`, `backend/core/property_data/providers/bricked.py:262-272`
- What the problem is: API failures collapse into “render nothing,” and the repairs section renders every repair row with no cap or summarization.
- Why it matters: Long repair lists become noisy and expensive to render, and silent failure makes users assume there just were no comps instead of an API problem.
- Specific suggested fix: Add explicit loading/error/empty states and cap or summarize long repair lists with an opt-in expansion flow.

### 9. Report snapshot building drops legitimate zero values
- File path: `backend/routers/reports.py:47-59`
- What the problem is: `_build_report_data()` uses truthiness checks for numeric fields, so valid `0` values become `None`.
- Why it matters: Zero is data. `None` is unknown. Conflating them corrupts the snapshot and the public report semantics.
- Specific suggested fix: Use `is not None` for numeric field serialization instead of truthiness.

## Low Priority (nice to have)

### 1. The reports page CTA is a dead end
- File path: `frontend/src/pages/reports/ReportsListPage.tsx:148-156`, `frontend/src/pages/reports/ReportsListPage.tsx:194-200`, `frontend/src/components/reports/CreateReportModal.tsx:1-165`
- What the problem is: The page ships “Create Report” buttons that only show a toast, even though a modal component exists.
- Why it matters: It makes the reports surface feel unfinished and ornamental.
- Specific suggested fix: Wire the modal for valid entry points or remove the CTA until it can do real work.

### 2. Chat markdown promises tables but the renderer does not fully support them
- File path: `frontend/src/components/chat/ChatPanel.tsx:9`, `frontend/src/components/chat/ChatPanel.tsx:39-91`, `frontend/src/components/chat/ChatPanel.tsx:140`
- What the problem is: The system prompt explicitly asks Claude to use markdown tables, but the renderer does not enable GFM. The custom list styling also risks suppressing normal list markers.
- Why it matters: The responses most likely to contain structured information are the ones most likely to render badly.
- Specific suggested fix: Add `remark-gfm` and keep list styling closer to semantic defaults.

### 3. The shared-report CTA is hardcoded to production
- File path: `frontend/src/pages/reports/SharedReportPage.tsx:469-474`
- What the problem is: The footer always links to `https://parceldesk.io`, regardless of environment or host.
- Why it matters: Staging, white-label, or self-hosted deployments will leak traffic to the production marketing site.
- Specific suggested fix: Derive the CTA target from config or disable it outside the canonical production environment.

### 4. PDF download handoff may hit popup blockers
- File path: `frontend/src/pages/reports/ReportsListPage.tsx:73-85`
- What the problem is: `window.open()` happens after async polling rather than directly inside the original user gesture.
- Why it matters: Some browsers will block the new tab/window, which makes a successful PDF export look like another failure.
- Specific suggested fix: Use a real download link once ready or navigate in the current tab instead of relying on delayed `window.open()`.

## Previous Fix Regression Check

### 1. Clerk webhook signature verification: fixed
- File path: `backend/routers/clerk_webhooks.py:25-97`
- What the problem was: Wave 1A shipped an unsigned Clerk webhook path.
- Why it matters: Unsigned identity webhooks are a straight auth-integrity failure.
- Specific suggested fix: Already landed. This route now verifies the raw body with Svix headers before parsing.

### 2. Startup `SECRET_KEY` guard: fixed
- File path: `backend/core/security/jwt.py:15-21`
- What the problem was: Wave 1A allowed dangerous JWT defaults.
- Why it matters: Missing secrets should fail at startup, not silently mint weak tokens.
- Specific suggested fix: Already landed. Startup now raises when `SECRET_KEY` is unset outside tests.

### 3. Snoozed task resurfacing: fixed
- File path: `backend/routers/tasks.py:187-224`
- What the problem was: Wave 1B snoozed tasks disappeared forever.
- Why it matters: A task system that drops snoozed work is worse than no task system.
- Specific suggested fix: Already landed. Expired snoozes now re-enter Today and are auto-reopened.

### 4. Properties/contacts list N+1 queries: fixed
- File path: `backend/routers/properties.py:246-290`, `backend/routers/contacts.py:211-244`
- What the problem was: Wave 1B list pages were doing obvious per-row query storms.
- Why it matters: Those pages would have fallen over as soon as real data volume showed up.
- Specific suggested fix: Already landed. Both routes now batch-load their related counts/summary data.

### 5. JWT hardening is still incomplete
- File path: `backend/core/security/jwt.py:88-105`, `backend/core/security/clerk.py:94-106`
- What the problem is: Legacy JWT verification still has no audience contract and accepts tokens with missing issuer. Clerk audience verification only happens if `CLERK_JWT_AUDIENCE` is configured.
- Why it matters: This was called out in earlier reviews for a reason. The auth boundary is still softer than it should be.
- Specific suggested fix: Require issuer and audience for both legacy and Clerk tokens and reject tokens missing those claims.

### 6. Prompt sanitization is only partially fixed
- File path: `backend/routers/chat.py:59-63`, `backend/routers/chat.py:75-109`
- What the problem is: Deal context now gets sanitized, but document fallback context still does not.
- Why it matters: The original prompt-injection class of bug is reduced, not eliminated.
- Specific suggested fix: Apply the same sanitization/escaping discipline to every document-derived field.

### 7. Persona-aware narration still does not reach the streaming analysis path
- File path: `backend/routers/analysis.py:279-291`, `backend/routers/analysis.py:490-495`
- What the problem is: The non-streaming quick-analysis endpoint maps onboarding persona to experience level before narration. The streaming endpoint still calls `_generate_narrative()` with the default intermediate setting.
- Why it matters: The default user flow is still not consistently honoring the beginner vs. experienced narration contract from Wave 1A.
- Specific suggested fix: Pass the same persona-derived `experience_level` through the SSE path before calling `_generate_narrative()`.

## API Cost Exposure Risks

### 1. Chat cost grows with conversation length because the client replays full history every turn
- File path: `frontend/src/components/chat/ChatPanel.tsx:274-283`, `backend/routers/chat.py:190-218`, `backend/core/ai/chat_specialist.py:76-80`, `backend/core/ai/embeddings.py:45-48`
- What the problem is: Every new chat turn resends the entire local history to Claude, and document chat also pays an embedding call for each user query.
- Why it matters: Token usage grows with conversation length instead of being bounded. Long chats get slower and more expensive in a very predictable way.
- Specific suggested fix: Move session state server-side, clamp history windows aggressively, summarize older turns, and cache/reuse query embeddings where possible.

### 2. Document processing is using premium models on a retry-prone pipeline
- File path: `backend/core/documents/processor.py:118-125`, `backend/core/documents/contextualizer.py:38-45`, `backend/core/tasks/document_processing.py:117-135`
- What the problem is: Metadata extraction uses `claude-opus-4-5`, contextualization calls Haiku every 10 chunks, and retries can re-run embedding work on already partially processed documents.
- Why it matters: This pipeline will burn AI spend quickly, especially on long or flaky jobs.
- Specific suggested fix: Use the cheapest model that clears quality bars, hard-cap chunk counts, and make retries idempotent so failed jobs do not re-spend completed work.

### 3. PDF generation can repeatedly burn Playwright/Chromium without a failure cache
- File path: `backend/routers/reports.py:273-294`, `backend/core/tasks/pdf_generation.py:26-111`, `frontend/src/pages/reports/ReportsListPage.tsx:79-88`
- What the problem is: Failed exports are not memoized as failures, so repeated user retries keep launching Chromium and re-rendering the page from scratch.
- Why it matters: Browser automation is one of the most expensive non-AI operations in this wave. Blind retries will add up fast.
- Specific suggested fix: Persist `pdf_status/pdf_error`, block duplicate in-flight jobs, and require an explicit retry after failure instead of endless polling loops.

### 4. Provider cost accounting is not audit-grade
- File path: `backend/core/property_data/service.py:117-120`, `backend/core/property_data/service.py:482-486`
- What the problem is: Non-Bricked provider success defaults to `2` cents regardless of actual vendor pricing, and Bricked cost is recorded only on the final result rather than on each attempt.
- Why it matters: Any future “cost per analysis” reporting built on `DataSourceEvent.cost_cents` will be fiction.
- Specific suggested fix: Record provider-specific pricing rules explicitly, capture per-attempt cost semantics, and stop using generic placeholder cents in production event data.

## Performance Concerns

### 1. The document pipeline keeps too many full copies in memory
- File path: `backend/core/documents/processor.py:69-125`, `backend/core/tasks/document_processing.py:74-123`, `backend/core/documents/extractor.py:18-25`
- What the problem is: The system holds file bytes, extracted text, raw chunks, contextualized chunks, and embedding batches in memory in the same job.
- Why it matters: Big PDFs and image-heavy files will push worker memory much harder than this wave seems to assume.
- Specific suggested fix: Stream extraction/chunking incrementally, avoid building duplicate full-text lists, and process in smaller page-level batches.

### 2. PDF generation is serialized behind a single semaphore and uses a blind 3-second sleep
- File path: `backend/core/tasks/pdf_generation.py:10-11`, `backend/core/tasks/pdf_generation.py:60-69`
- What the problem is: Only one Chromium instance can run at a time, and every job waits an arbitrary extra 3 seconds regardless of whether the page is already ready or still incomplete.
- Why it matters: One slow or broken export stalls the whole queue, and the fixed sleep is either wasted time or not enough wait time.
- Specific suggested fix: Replace the blind sleep with an explicit render-ready signal and scale concurrency with measured worker limits instead of a hard global single-slot gate.

### 3. Shared-report rendering leaks observers and emits repeated unload work
- File path: `frontend/src/pages/reports/SharedReportPage.tsx:203-243`
- What the problem is: Ref-callback observers are re-created without cleanup and unload/visibility handlers can fire multiple writes per visit.
- Why it matters: It wastes client work, pollutes analytics, and adds avoidable churn on a public page that should be cheap.
- Specific suggested fix: Move observer lifecycle into `useEffect`, clean them up explicitly, and coalesce engagement sends.

### 4. Chat latency and cost grow together because prompt size is not bounded
- File path: `frontend/src/components/chat/ChatPanel.tsx:274-283`, `backend/routers/chat.py:190-218`, `backend/core/ai/chat_specialist.py:76-80`
- What the problem is: The prompt gets bigger every turn because full history is resent instead of windowed.
- Why it matters: Longer chats get slower exactly when users most need them to stay responsive.
- Specific suggested fix: Enforce a hard prompt budget, summarize old turns, and reuse server-side session context instead of shipping the full transcript from the browser.

## Positive Findings

### 1. Bricked auth/timeout/retry behavior is mostly sane
- File path: `backend/core/property_data/providers/bricked.py:83-100`, `backend/core/property_data/providers/bricked.py:135-156`
- What the problem is: This is one of the few areas where the implementation is not doing something reckless.
- Why it matters: The provider uses the API key in the header, sets an explicit 45-second timeout, and does not retry 4xx responses.
- Specific suggested fix: Keep this behavior, but add the missing 412-specific retry strategy instead of broadening retries.

### 2. Embedding dimensionality and vector indexing line up
- File path: `backend/core/ai/embeddings.py:20-42`, `backend/models/document_chunks.py:30-49`
- What the problem is: The basic pgvector plumbing is not mismatched.
- Why it matters: `text-embedding-3-small` returns 1536-d vectors, and the model/index definition matches that dimension with HNSW configured.
- Specific suggested fix: Preserve this alignment; the issue is retrieval quality and lifecycle, not the raw vector dimension.

### 3. Public report GET correctly hides disabled/deleted shares
- File path: `backend/routers/reports.py:199-215`, `backend/routers/reports.py:263-288`, `backend/routers/reports.py:310-316`
- What the problem is: This path at least does the obvious ownership/publicity checks.
- Why it matters: `is_public=False` and soft-deleted reports correctly 404 on the share GET path, and owner-only routes check `created_by`.
- Specific suggested fix: Keep these guards, then apply the same discipline to the engagement endpoint and the default report creation flow.

### 4. Some Wave 1A/1B hardening did land
- File path: `backend/routers/clerk_webhooks.py:25-97`, `backend/core/security/jwt.py:15-21`, `backend/routers/tasks.py:187-224`, `backend/routers/properties.py:246-290`, `backend/routers/contacts.py:211-244`
- What the problem is: Prior review items were not ignored across the board.
- Why it matters: Webhook signature verification exists now, startup rejects missing `SECRET_KEY`, snoozed tasks resurface, and the worst list-page N+1s were cleaned up.
- Specific suggested fix: Use the same level of rigor on Wave 1C’s new surfaces instead of reintroducing looser patterns there.

### 5. Deal-context chat sanitization is present
- File path: `backend/routers/chat.py:59-63`
- What the problem is: The deal context path is at least trying to defend the prompt boundary.
- Why it matters: It is materially better than blindly interpolating raw deal text.
- Specific suggested fix: Extend the same sanitization discipline to document fallback context so the protection is consistent.
