# PARCEL Adversarial Review -- Wave 1C

Verification context: read `SAD/CANONICAL-PRODUCT-BLUEPRINT.md`, `SAD/adversarial-review-wave-1a.md`, `SAD/adversarial-review-wave-1b.md`. Reviewed all Wave 1C backend and frontend files across the three sprints (Bricked integration, RAG document chat, branded reports). `frontend/npm run build` passes cleanly. Backend pytest could not be executed because `pytest` is not installed in this environment.

---

## Critical Issues (must fix before Wave 2)

### 1. Deal context in chat is not sanitized before reaching the AI prompt
- File: `backend/routers/chat.py:59-66`
- Problem: `_build_context_block()` injects `deal.address`, `json.dumps(deal.inputs)`, `json.dumps(deal.outputs)`, and `deal.risk_score` directly into the user message without calling `sanitize_for_prompt()`. The `deal.inputs` JSONB can contain arbitrary user-entered text (notes, custom labels, etc.) which gets interpolated raw into the message that reaches Claude.
- Why it matters: This is the same prompt injection class that was flagged in Wave 1A for the narrator. The RAG path correctly sanitizes chunk content via `build_rag_context()` -> `sanitize_for_prompt()`, but the deal context path bypasses sanitization entirely. A user (or attacker with API access) can craft deal inputs that inject control text into the system prompt.
- Suggested fix: Run `sanitize_for_prompt()` on `deal.address`, and serialize `deal.inputs`/`deal.outputs` through a sanitized JSON formatter that strips XML-like delimiters. Better yet, move deal context into the system prompt (like document context) rather than appending it to the user message, so the model treats it as system-provided data.

### 2. Bricked provider uses blocking `urllib` inside an async event loop
- File: `backend/core/property_data/providers/bricked.py:84-86`
- File: `backend/core/property_data/service.py:454` (called from async SSE generator)
- Problem: `_make_request()` uses `urllib.request.urlopen()` with `time.sleep(2)` for retry backoff. This is called from `enrich_with_bricked()` which is called from the SSE `event_stream()` async generator. The Bricked timeout is 45 seconds plus up to 2 seconds retry sleep, all blocking the asyncio event loop.
- Why it matters: A single slow Bricked call blocks the entire uvicorn event loop for up to 47 seconds. During that window, no other request can be processed. At even modest concurrency, this pins the server.
- Suggested fix: Either switch to `httpx.AsyncClient` with `await` in the SSE generator, or push the Bricked call to a thread pool via `asyncio.get_event_loop().run_in_executor(None, ...)`. The retry sleep must also be async (`await asyncio.sleep(2)`) if staying on the main loop.

### 3. RAG vector search builds SQL via f-string, creating a SQL injection surface
- File: `backend/core/ai/rag_retrieval.py:85-101`
- File: `backend/core/ai/rag_retrieval.py:141-160`
- Problem: Both `_vector_search()` and `_keyword_search()` build their WHERE clauses via f-string interpolation: `f"WHERE {where_clause}"`. While the individual filter values are passed as named parameters (safe), the `where_clause` variable itself is string-concatenated from a list of SQL fragments. Currently the fragments are all safe static strings, but the pattern is one refactor away from accepting user-controlled values in the clause. More importantly, `document_ids` is passed as a list of stringified UUIDs into an `ANY(:document_ids)` parameter -- this works with psycopg2 but the manual UUID-to-string conversion (`[str(did) for did in document_ids]`) is fragile and could break if UUIDs are not properly validated upstream.
- Why it matters: The architecture is correct today but the pattern is dangerous. One new filter parameter interpolated into `where_clause` without parameterization would open a real injection vector.
- Suggested fix: Use SQLAlchemy ORM or Core for these queries instead of raw `text()`. If raw SQL must stay, enforce that the WHERE clause is built exclusively from a whitelist of static fragments and never includes user-controlled strings. Add a code comment warning future developers not to interpolate user input into `where_clause`.

### 4. Embedding pipeline silently loses all work if OpenAI fails mid-batch
- File: `backend/core/tasks/document_processing.py:112-115`
- Problem: `embed_texts()` is called once on the full list of contextualized chunks. If the OpenAI API fails partway through (e.g., on batch 3 of 5), the entire `embed_texts()` call raises an exception. The outer try/except catches it and marks the document as `embedding_status = "failed"`. All already-inserted DocumentChunk rows from previous DB batches are lost because the exception triggers before the final commit, and the earlier commits (lines 139-140) already flushed partial chunks. But the failed state means re-processing starts from scratch.
- Why it matters: A large document (say, 80 chunks) could have 60 chunks successfully embedded and stored, but a transient OpenAI error on the last batch means the user has to re-upload and re-process the entire document. The partial chunks stay in the database as orphans (committed in earlier batches) while the document shows "failed."
- Suggested fix: Embed in batches and commit each batch of chunks with their embeddings incrementally. Track `processed_chunks` accurately. On retry, skip chunks that already have embeddings. Clean up orphan chunks on failure, or better yet, make the pipeline resumable from the last successful batch.

### 5. PDF generation navigates to a public URL that may be behind Clerk auth
- File: `backend/core/tasks/pdf_generation.py:50-51`
- Problem: The PDF generator navigates Playwright to `{FRONTEND_URL}/reports/view/{share_token}`. This URL is served by the SharedReportPage component which fetches from the unauthenticated `/api/v1/reports/share/{token}` endpoint. However, the frontend route itself may be wrapped in an auth provider. If the `ClerkProviderWrapper` or any route guard in `App.tsx` intercepts the navigation and redirects to login, Playwright will capture a login page as the PDF instead of the report.
- Why it matters: PDF generation could silently produce garbage (a login page PDF) for every report. The share endpoint itself is correctly unauthenticated, but the frontend routing layer may interfere.
- Suggested fix: Verify that the `/reports/view/:shareToken` route in `App.tsx` is outside all auth wrappers. Add an explicit check in the PDF generation actor: after `wait_for_timeout(3000)`, assert that the page title or a specific DOM element (e.g., `[data-testid="shared-report"]`) is present before capturing PDF. If not, fail with a clear error rather than uploading a broken PDF.

---

## Security Issues (fix immediately)

### 1. Public share and view-logging endpoints have no rate limiting
- File: `backend/routers/reports.py:295-331` (`get_shared_report`)
- File: `backend/routers/reports.py:333-358` (`log_view_engagement`)
- Problem: Neither the share endpoint nor the view-logging endpoint has a `@limiter.limit()` decorator. Every other public-facing endpoint in the codebase (chat, auth, etc.) has rate limiting. These endpoints write to the database on every call (incrementing view_count, inserting ReportView rows).
- Why it matters: An attacker who discovers a share token can spam requests to inflate view counts and fill the report_views table. The `log_view_engagement` endpoint accepts arbitrary `sections_viewed` lists and `time_spent_seconds` values with no size validation, enabling database bloat attacks.
- Suggested fix: Add `@limiter.limit("30/minute")` to both endpoints. Validate that `sections_viewed` has a maximum length (e.g., 50 items) and that `time_spent_seconds` has a reasonable cap (e.g., 86400). Consider deduplicating views by IP hash within a time window.

### 2. Brand kit accepts arbitrary `logo_url` with no validation
- File: `backend/routers/settings.py:52-65`
- File: `backend/schemas/reports.py:79-87`
- Problem: The `BrandKitSchema` accepts any string as `logo_url`. There is no validation that it is a real URL, that it points to an image, or that it is hosted on a trusted domain. This URL is then rendered as an `<img src>` on the SharedReportPage (a public page).
- Why it matters: A user can set `logo_url` to a `javascript:` URI, a tracking pixel, or an offensive image. On the public shared report page, this renders as an `<img>` tag visible to anyone with the share link. While modern browsers block `javascript:` in `<img src>`, a malicious URL could be a redirect to a phishing page if the frontend ever makes it a clickable link, or it could be a tracking pixel that leaks viewer IPs to the report creator.
- Suggested fix: Validate that `logo_url` starts with `https://`, matches an allowed domain pattern, or better yet, require logo upload through the document upload pipeline (with file type validation) and generate a Parcel-hosted CDN URL. At minimum, add URL format validation to `BrandKitSchema`.

### 3. Report creation does not verify scenario belongs to the specified property
- File: `backend/routers/reports.py:112-127`
- Problem: `create_report()` verifies that `property_id` and `scenario_id` both belong to `current_user`, but never checks that `scenario.property_id == body.property_id`. A user can create a report that snapshots Property A's data paired with Scenario B's analysis (from a completely different property).
- Why it matters: The resulting report data snapshot would contain mismatched property details and financial analysis. This could produce misleading reports sent to clients.
- Suggested fix: Add a check: `if scenario.property_id != body.property_id: raise HTTPException(status_code=400, ...)`.

### 4. JWT audience/issuer checking remains partially enforced (Wave 1A regression)
- File: `backend/core/security/clerk.py:92-104`
- File: `backend/core/security/jwt.py:14-20`
- Problem: Clerk audience verification only runs when `CLERK_JWT_AUDIENCE` env var is set. If unset, `verify_aud` is False. Legacy JWT still has no issuer or audience claims. `SECRET_KEY` still accepts any non-empty string.
- Why it matters: This was flagged in both Wave 1A and Wave 1B reviews. Three waves later, the auth boundary is still weaker than it should be.
- Suggested fix: Make `CLERK_JWT_AUDIENCE` required when Clerk is enabled (fail at startup if missing). Add issuer/audience to legacy JWT tokens. Reject weak SECRET_KEY values at startup.

---

## High Priority (fix soon)

### 1. Playwright PDF generation can crash the worker under concurrent load
- File: `backend/core/tasks/pdf_generation.py:56-73`
- File: `backend/Procfile:2` (`--processes 1 --threads 2`)
- Problem: Each PDF generation launches a full Chromium browser instance. The Dramatiq worker is configured with 1 process and 2 threads. If two PDF tasks run concurrently, that is two Chromium instances in a single Railway container (typically 512MB-1GB RAM). A headless Chromium instance uses 100-300MB.
- Why it matters: Two concurrent PDF generations can OOM the worker, killing both tasks and any other Dramatiq tasks in flight (including document embedding).
- Suggested fix: Either limit PDF concurrency to 1 (use a dedicated Dramatiq queue with `--threads 1`), add memory monitoring before launching Chromium, or implement a semaphore/lock in the actor. Consider switching to a lighter PDF engine (e.g., WeasyPrint or a dedicated PDF service) for reports that don't need full JavaScript rendering.

### 2. Chat history loads all messages globally, not scoped by context
- File: `backend/routers/chat.py:244-278`
- File: `frontend/src/components/chat/ChatPanel.tsx:220-224`
- Problem: `GET /chat/history/` returns the last 50 messages for the user regardless of context_type or session_id. The ChatPanel sends `queryKey: ['chat-history', contextType, contextId]` but the API ignores these values. When a user opens the document chat slide-over, they see their general chat history. When they return to the full chat page, they see messages from all contexts mixed together.
- Why it matters: Context bleeding makes the chat feel broken. A user asking about a purchase agreement will see their previous general real estate Q&A interspersed with document-specific answers.
- Suggested fix: Accept `session_id` and/or `context_type` + `context_id` as query parameters on the history endpoint and filter accordingly. The frontend already passes the correct query key; the backend just needs to honor it.

### 3. Confidence scoring does not match the blueprint specification
- File: `backend/core/property_data/service.py:42-66`
- Problem: The blueprint review asked for "high when they agree, contested when they disagree, single_source when only one has it." The actual implementation uses "multi_source" (2+ providers populated same field) and "single_source" (1 provider populated). There is no "contested" status when providers disagree on a value, and no "high" status when they agree on the same value.
- Why it matters: The confidence system is simpler than specified. It cannot distinguish "RentCast and Bricked both say ARV is $200K" (high confidence) from "RentCast says $180K and Bricked says $220K" (contested). Both would show as "multi_source" even when they disagree significantly.
- Suggested fix: For numeric fields populated by both providers, compare the values. If within 10% of each other, label "high". If they diverge by more than 10%, label "contested" and store both values in the confidence metadata.

### 4. Chunker does not handle edge cases well
- File: `backend/core/documents/chunker.py:109-112`
- Problem: `_split_sentences()` uses `re.split(r"(?<=[.!?])\s+", text)` which breaks on: (a) abbreviations like "U.S. Army" or "Dr. Smith", (b) decimal numbers like "$150,000.00 was paid", (c) bullet lists that don't end in periods, (d) all-caps text like "TOTAL REPAIR COST: $45,000", (e) tables with pipe-delimited columns.
- Why it matters: Real estate documents frequently contain abbreviations (St., Ave., Dr., LLC.), dollar amounts with decimals, and table-formatted data. Bad sentence splitting produces incoherent chunks that degrade RAG retrieval quality.
- Suggested fix: Use a more robust sentence tokenizer (e.g., spaCy's `sentencizer` or NLTK's `sent_tokenize`). At minimum, add abbreviation-aware regex that handles common patterns like `St.`, `LLC.`, `$X.XX`, `Dr.`, `No.`, etc.

### 5. SharedReportPage "Try Parcel Free" CTA links to internal route, not signup
- File: `frontend/src/pages/reports/SharedReportPage.tsx:461-463`
- Problem: The CTA `<Link to="/">` navigates to the root route. For an unauthenticated visitor viewing a shared report, this goes to the landing page (which is correct if the landing page exists at `/`). But if the frontend root redirects authenticated users to `/today`, the link behavior differs between logged-in and logged-out viewers.
- Why it matters: This is the primary conversion CTA for James's growth-channel use case (the persona the blueprint calls out as a growth engine). A broken or misrouted CTA undermines the entire report-as-marketing strategy.
- Suggested fix: Use an absolute URL to the landing/signup page (e.g., `https://parceldesk.io/signup`) rather than a relative route, so the behavior is consistent regardless of the viewer's auth state.

### 6. Engagement beacon uses regular fetch, not navigator.sendBeacon
- File: `frontend/src/pages/reports/SharedReportPage.tsx:204-212`
- Problem: `sendEngagement()` calls `api.reports.logView(shareToken, {...})` which is presumably a regular fetch POST. The function is called on `visibilitychange` and `beforeunload`. Regular fetch requests are commonly cancelled by browsers during page unload -- `navigator.sendBeacon()` exists specifically for this purpose and is guaranteed to fire even during navigation away.
- Why it matters: A significant portion of engagement data will be lost because the fetch gets cancelled on page navigation. This directly impacts the engagement metrics that are a selling point for James.
- Suggested fix: Use `navigator.sendBeacon(url, JSON.stringify(payload))` for the unload/visibility-change handler. The `api.reports.logView` helper should detect unload context and use sendBeacon instead of fetch.

### 7. `enrich_with_bricked` does not overwrite Bricked ARV/repair when values already exist
- File: `backend/core/property_data/service.py:560-562`
- Problem: `enrich_with_bricked()` only sets `scenario.after_repair_value` when `scenario.after_repair_value is None`. But the blueprint specifies Bricked as authoritative for ARV and repairs. If RentCast or any other source has already populated a rough estimate, Bricked's AI-generated comp-based ARV will be silently ignored.
- Why it matters: The initial `enrich_property()` flow (line 305) does set ARV from Bricked authoritatively. But the SSE path calls `enrich_with_bricked()` separately, and by then the scenario may already have an ARV from the initial enrichment pass. The conditional check prevents the Bricked value from updating it.
- Suggested fix: In `enrich_with_bricked()`, always overwrite ARV and repair_cost when Bricked returns values (since Bricked is declared authoritative for these fields). Keep the conditional only for physical property details that should not overwrite RentCast.

---

## Medium Priority (tech debt)

### 1. Document processing uses Claude Opus 4.5 instead of Haiku for metadata extraction
- File: `backend/core/documents/processor.py:121`
- Problem: Metadata extraction calls `model="claude-opus-4-5"` for every document. At $15/MTok input and $75/MTok output, this is drastically more expensive than Haiku ($0.80/$4.00). The contextualizer correctly uses Haiku.
- Why it matters: At 10 documents per user per month across hundreds of users, this costs 15-20x what it should. The metadata extraction task (document type classification, party extraction, key terms) does not require Opus-level intelligence.
- Suggested fix: Switch to `claude-haiku-4-5-20241022` or `claude-sonnet-4-20250514` for document metadata extraction. Reserve Opus for the chat specialist where response quality directly impacts user trust.

### 2. Contextualizer batch parsing is fragile
- File: `backend/core/documents/contextualizer.py:102-125`
- Problem: `_parse_batch_response()` expects Claude to respond in a strict "Chunk N: summary" format. If Claude uses slightly different formatting (e.g., "**Chunk 1:** summary", "1) summary", "- Chunk 1: summary"), the parser falls into the else branch and takes arbitrary lines as summaries. If Claude outputs fewer lines than expected, the function pads with empty strings, meaning some chunks get no context.
- Why it matters: Inconsistent contextualization degrades RAG retrieval quality for some chunks. The empty-string padding means those chunks get embedded without the context prefix that was supposed to improve search relevance.
- Suggested fix: Use a more robust parser (regex matching `Chunk\s*\d+[:\.]` or numbered lines), or switch to a structured output format (JSON array) that can be parsed deterministically.

### 3. Citation references are positional, not content-linked
- File: `backend/core/ai/chat_specialist.py:31-56`
- File: `backend/routers/chat.py:163-173`
- Problem: Citations are numbered [1], [2], [3] based on the order chunks were retrieved. The AI is instructed to reference them by number. But the citation data sent to the frontend maps indices to chunk metadata. If the AI decides to reference [2] while discussing content from [3], or invents a citation number that does not exist, the frontend will display the wrong source.
- Why it matters: Incorrect citations undermine the trust that RAG is supposed to build. Users clicking a citation and seeing unrelated content is worse than having no citations at all.
- Suggested fix: This is an inherent limitation of positional citations with LLM-generated text. Mitigate by: (a) post-processing the assistant response to verify that referenced numbers match the actual chunks, (b) adding a content-similarity check between the AI's claims and the cited chunk, or (c) rendering citations as post-response source cards (current approach) rather than inline clickable references that imply precise attribution.

### 4. HNSW index and trgm index may not activate without explicit extensions
- File: `backend/alembic/versions/h8c9d0e1f2g3_add_rag_document_chunks.py:38-45`
- File: `backend/alembic/versions/e1a0b2c3d4e5_enable_pg_extensions.py`
- Problem: The migration creates an HNSW index with `vector_cosine_ops` and a GIN index with `gin_trgm_ops`. These require the `vector` and `pg_trgm` extensions to be installed. The `e1a0b2c3d4e5` migration enables extensions, but I need to verify it runs before `h8c9d0e1f2g3` in the migration chain. If extensions are not enabled, these CREATE INDEX statements will fail silently or crash the migration.
- Why it matters: Without the HNSW index, vector search falls back to sequential scan, which is O(n) per query. Without the trgm index, keyword search performance degrades on large chunk sets.
- Suggested fix: Verify the migration chain order. Add `CREATE EXTENSION IF NOT EXISTS vector` and `CREATE EXTENSION IF NOT EXISTS pg_trgm` as defensive statements at the top of the `h8c9d0e1f2g3` migration's upgrade function.

### 5. Report data snapshot includes `inputs_extended` which can be very large
- File: `backend/routers/reports.py:51-62`
- Problem: `_build_report_data()` includes `scenario.inputs_extended` in the snapshot. This field contains full Bricked comp summaries and repair item lists. For a property with 15 comps and 20 repair items, this JSONB can be 10-20KB. The snapshot is stored in the `report_data` column and returned on every list call (via `_report_to_response`).
- Why it matters: Report list responses become unnecessarily large because each report carries its full data snapshot. The list endpoint already excludes `report_data` from list responses (`include_data=False`), but the snapshot itself is bloated for detail views.
- Suggested fix: This is acceptable for now since the list endpoint strips data. But consider trimming `inputs_extended` in the snapshot to only the comp count and total repair cost rather than the full detail lists.

### 6. Brand kit is NOT frozen in the report snapshot -- it references live data
- File: `backend/routers/reports.py:62-63`
- Problem: `_build_report_data()` stores `"brand_kit": user.brand_kit` which is a dict copy at creation time. However, the report also stores `brand_logo_url` and `brand_colors` as separate columns on the Report model (lines 141-142). The shared report page reads from `report_data.brand_kit`, so the snapshot IS frozen. But if a future code path reads from `report.brand_colors` instead, it would get the creation-time copy rather than a potentially updated brand kit.
- Why it matters: Currently not a bug -- the snapshot is correctly frozen via `report_data`. But the dual storage (snapshot in JSONB + separate columns) creates confusion and inconsistency risk.
- Suggested fix: Remove the `brand_logo_url` and `brand_colors` columns from the Report model, or clearly document that `report_data.brand_kit` is the canonical source for rendered reports and the columns are for querying/filtering only.

### 7. CompsCard uses hardcoded dark theme colors instead of semantic tokens
- File: `frontend/src/components/analysis/CompsCard.tsx:28-134`
- Problem: The component uses literal hex colors: `bg-[#141311]`, `border-[#1E1D1B]`, `text-[#8A8580]`, `text-[#F0EDE8]`, `text-[#C5C0B8]`, `bg-[#0C0B0A]`. These are dark-theme-specific and will not adapt to the light theme.
- Why it matters: Wave 1C shipped after the dark/light theme system was established. New components should use semantic tokens (`bg-app-surface`, `text-text-primary`, `border-border-default`, etc.) to work in both themes.
- Suggested fix: Replace all hardcoded color values with semantic token classes used elsewhere in the design system.

---

## Low Priority (nice to have)

### 1. ReportsListPage has no pagination controls
- File: `frontend/src/pages/reports/ReportsListPage.tsx:114-117`
- Problem: The query fetches with default pagination (page 1, 20 per page) but there are no "Next page" / "Previous page" controls in the UI.
- Why it matters: Users with more than 20 reports cannot access older ones. The backend supports pagination but the frontend ignores it.
- Suggested fix: Add page controls like the properties and contacts list pages.

### 2. PDF polling has a 60-second timeout but no user feedback during wait
- File: `frontend/src/pages/reports/ReportsListPage.tsx:79-88`
- Problem: The PDF download handler polls up to 30 times at 2-second intervals (60 seconds total). During this time, the only feedback is a spinning loader icon on a small button. If Playwright takes 30+ seconds (normal for complex reports), the user sees a tiny spinner for a long time.
- Why it matters: Long wait with minimal feedback looks like the app is broken.
- Suggested fix: Show a toast or inline progress indicator: "Generating PDF... this usually takes 15-30 seconds."

### 3. ChatSlideOver does not pass context props to ChatPanel
- File: `frontend/src/components/chat/ChatSlideOver.tsx:29-31`
- Problem: `<ChatPanel />` is rendered with default props (no context type, no context ID). The slide-over always opens as a general chat, even when it could receive document or deal context.
- Why it matters: The AI floating button opens a context-less chat. To get document-scoped chat, the user has to use the document detail page's chat button instead.
- Suggested fix: Accept optional `contextType` and `contextId` props on `ChatSlideOver` and pass them through to `ChatPanel`.

### 4. CitationBadge popover positioning does not account for screen edges
- File: `frontend/src/components/chat/CitationBadge.tsx:44`
- Problem: The popover is positioned `absolute bottom-full left-0`, which means it always pops upward and to the right. If the citation is near the bottom-left of the screen, the popover could overflow off-screen.
- Why it matters: Minor UX issue -- citations near screen edges may be partially hidden.
- Suggested fix: Use a positioning library (e.g., Floating UI / Radix Popover) that automatically flips position when approaching viewport edges.

### 5. Renovation score display math may be wrong
- File: `frontend/src/components/analysis/CompsCard.tsx:130`
- Problem: `(data.renovation_score.score * 10).toFixed(1)` displays as "/10". If Bricked's renovation score is already on a 0-100 scale, multiplying by 10 produces numbers like "850.0/10". If it is 0-1.0, this is correct.
- Why it matters: A display bug that makes the renovation score look absurd or meaningless.
- Suggested fix: Verify the Bricked API's renovation score range and adjust the multiplier accordingly. Add a guard: if score > 1.0, display as-is without multiplying.

---

## Previous Fix Regression Check

### 1. Clerk webhook signature verification: HELD
- File: `backend/routers/clerk_webhooks.py`
- The Svix signature verification from Wave 1A fix is still in place.

### 2. JWT audience/issuer checking: NOT HELD (3rd consecutive review)
- File: `backend/core/security/clerk.py:92-104`
- File: `backend/core/security/jwt.py:14-20`
- Issuer checking is conditional on env var. Audience checking only runs when `CLERK_JWT_AUDIENCE` is set. Legacy JWT has no issuer/audience. This was flagged in Wave 1A and Wave 1B. It is still not fixed.

### 3. SECRET_KEY startup check: PARTIALLY HELD
- File: `backend/core/security/jwt.py:14-20`
- Empty SECRET_KEY fails at startup (good). But any non-empty string passes, including "changeme" or "1234".

### 4. AI prompt sanitization: PARTIALLY HELD / NEW REGRESSION
- File: `backend/core/ai/sanitize.py` -- sanitization function exists and is used in RAG context.
- File: `backend/routers/chat.py:59-66` -- deal context path does NOT sanitize. This is a new regression specific to Wave 1C.
- The narrator path (Wave 1A fix) still sanitizes. The RAG context path (new in Wave 1C) sanitizes correctly. But the deal context injection path does not.

### 5. Calculator running in SSE stream: HELD (Wave 1B fix confirmed)
- File: `backend/routers/analysis.py:480-485`
- The SSE endpoint now calls `_run_calculator_on_scenario()` before emitting the scenario event. This was the Wave 1B critical issue and it is now fixed.

### 6. Snoozed tasks: NOT VERIFIED
- Could not verify whether the Wave 1B snoozed-tasks fix was implemented. The task router was not modified in Wave 1C.

### 7. Cross-tenant validation on tasks/contacts: NOT VERIFIED
- Same -- Wave 1B security issues in tasks/contacts were not addressed in Wave 1C files.

---

## API Cost Exposure Risks

### 1. Bricked calls are properly gated but the retry path could double-cost
- File: `backend/core/property_data/providers/bricked.py:82-141`
- The Bricked provider retries on 5xx. Each successful response costs $0.43. If the first attempt returns a 5xx but Bricked still logs the call on their side, the retry could result in a double charge from Bricked even though Parcel only logs one success.
- Risk level: Low (depends on Bricked's billing semantics for failed calls).

### 2. Claude Opus 4.5 for document metadata extraction is excessively expensive
- File: `backend/core/documents/processor.py:121`
- At $15/MTok input, a 20-page PDF (~15K tokens) costs ~$0.23 per document just for metadata extraction. Haiku would cost ~$0.012 -- nearly 20x cheaper.
- Risk level: High. This accumulates fast across users.

### 3. No document upload limit per day, only per month
- File: `backend/core/billing/tier_config.py:52-53`
- Free tier has 0 uploads (good). Plus tier has 5/month, Pro 25/month. But there is no burst limit. A Pro user could upload 25 documents in one minute, triggering 25 concurrent metadata + embedding pipelines.
- Risk level: Medium. Each pipeline costs ~$0.25 (Opus metadata) + ~$0.02 (Haiku contextualization) + ~$0.005 (OpenAI embeddings) = ~$0.28. Burst of 25 = ~$7 in AI costs.

### 4. No circuit breaker on Bricked/OpenAI/Anthropic API failures
- If any external API enters a failure loop (returning errors that trigger retries), Dramatiq's `max_retries=3` with `min_backoff=10000ms` could cause repeated expensive calls. For document processing, 3 retries x 25 documents = 75 failed Anthropic calls before giving up.
- Risk level: Medium.

---

## Performance Concerns

### 1. Analysis results page now makes 4+ API calls
- Property data, scenario data, comps data (separate `api.analysis.getComps()` call), and potentially enrichment details. The comps data could have been included in the scenario response to avoid a separate round trip.

### 2. RAG retrieval requires 3 external calls per chat message
- One OpenAI embedding call (~200ms), one vector DB query (~50ms), one keyword DB query (~50ms). Total added latency: ~300ms before the Claude streaming even begins.
- Mitigation: The embedding call is the bottleneck. Consider caching recent query embeddings.

### 3. Playwright PDF generation blocks a Dramatiq thread for 15-45 seconds
- With `--threads 2`, one PDF generation halves the worker's throughput. Two concurrent PDFs completely block the worker.
- The document embedding pipeline also runs on the same worker, so PDF generation delays document processing.

### 4. Keyword search in RAG does not use tsvector index efficiently
- File: `backend/core/ai/rag_retrieval.py:151-158`
- The query computes `to_tsvector('english', dc.content)` at query time instead of reading from a pre-computed tsvector column. Without a functional index matching this exact expression, PostgreSQL may not use the GIN index at all.
- The GIN index is on `content gin_trgm_ops` (trigram), but the query uses `to_tsvector` / `plainto_tsquery` (full-text search). These are different search mechanisms. The trgm index will not be used for tsvector queries.
- Suggested fix: Add a pre-computed `search_vector tsvector` column to `document_chunks` with a GIN index, or change the keyword search to use trigram similarity (`content % :query`) which would actually use the trgm index.

---

## Positive Findings

### 1. Bricked provider implementation is clean and defensive
- File: `backend/core/property_data/providers/bricked.py`
- API key is sent via `x-api-key` header (not URL param) -- correct. Error classification is thorough (400, 401, 402, 404, 412, 429, 5xx). Field extraction uses `.get()` throughout -- no bare dict access. Cost logging is conditional on success status. The 412 handling with property hints as overrides is a thoughtful design.

### 2. Tier gating for Bricked is correctly implemented
- File: `backend/routers/analysis.py:237-245` (quick endpoint)
- File: `backend/routers/analysis.py:438-461` (SSE endpoint)
- Free users (`bricked_lookups_per_month=0`) cannot trigger Bricked calls. Usage is only incremented on success. Both code paths check the same way. There is no bypass path.

### 3. Report data snapshot is truly frozen
- File: `backend/routers/reports.py:36-63`
- The snapshot copies all values at creation time. The shared report page reads from `report_data`, not from live property/scenario data. Deleting a property does not break existing reports.

### 4. Document deletion cascades to chunks correctly
- File: `backend/models/document_chunks.py:22` (`ondelete="CASCADE"`)
- File: `backend/models/documents.py:36` (`cascade="all, delete-orphan"`)
- Both the database FK and the SQLAlchemy relationship specify cascade delete. Deleting a document removes all its chunks.

### 5. RAG retrieval is user-scoped
- File: `backend/core/ai/rag_retrieval.py:69-70` and `129-130`
- Both vector and keyword search include `d.user_id = :user_id` in the WHERE clause. User A cannot retrieve User B's document chunks through any path.

### 6. SSE chat streaming handles abort correctly
- File: `frontend/src/components/chat/ChatPanel.tsx:270-271` (AbortController)
- File: `frontend/src/lib/chat-stream.ts:30-31` (signal propagation)
- The chat panel creates an AbortController per request, passes the signal through to fetch, and cleans up on abort. This prevents orphaned streams and correctly stops the UI spinner.

### 7. The frontend build passes cleanly
- Unlike Wave 1B (which had TypeScript errors), Wave 1C builds without errors. The types in `frontend/src/types/index.ts` for reports, citations, and chat are properly defined.

### 8. Public share endpoint correctly returns 404 for deleted and private reports
- File: `backend/routers/reports.py:302-308`
- The query filters by `is_public == True` and `is_deleted == False`. A deleted report or one marked as private correctly returns 404 to share link visitors.

### 9. Document upload has proper file type and size validation
- File: `backend/routers/documents.py:28-29`
- 10MB max, only PDF/DOCX/JPG/JPEG/PNG. Extension-based validation is not foolproof (someone could rename a file), but it is a reasonable first line of defense combined with the downstream extractors that will fail gracefully on invalid content.

### 10. RRF implementation is mathematically correct
- File: `backend/core/ai/rag_retrieval.py:179-219`
- The Reciprocal Rank Fusion formula `1 / (k + rank + 1)` with k=60 is the standard implementation from the Cormack et al. paper. Rank is 0-indexed (correct). The fusion correctly handles chunks appearing in only one result list. Sorting is descending by fused score.
