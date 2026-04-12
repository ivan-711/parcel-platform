# Parcel Pre-Launch Product Audit

Date: April 6, 2026  
Product: `parceldesk.io` / `api.parceldesk.io`  
Auditor posture: live-production, customer-style walkthrough plus code trace  
Repo audited: `~/parcel-platform`

## Scope

This audit focused on using Parcel like a real customer, then tracing every visible failure back through:

- frontend behavior
- backend handlers
- API contracts
- missing-data paths
- missing-integration paths
- billing / auth / onboarding / persistence behavior

I tested live production with a disposable account and cross-checked the behavior in code. I also checked the repo state with `git status`; there were no tracked source edits in the worktree, only untracked research/legal files. Unless otherwise noted, the issues below are pre-existing in committed code or production deployment/configuration, not introduced by this audit session.

## Executive Summary

Parcel is not ready to put in front of 5 beta testers yet.

The biggest blockers are:

1. The core analyze flow hangs in the UI even though the non-streaming analysis API still works.
2. Billing copy and billing behavior do not match. The app promises a 7-day free trial with no card, but live Stripe checkout is in test mode and charges `$79` immediately.
3. Several authenticated pages in production are making `http://api.parceldesk.io/...` requests from an `https://www.parceldesk.io` origin, so the browser blocks them as mixed content.
4. Two key power features return server-side failures in production: document upload and skip tracing.
5. Several “saved” or “paid” flows are not actually wired: save/pipeline from analysis results are no-ops, mail campaigns are exposed to the wrong tier, and PDF generation stays in `generating`.

What did work cleanly:

- Landing page loads.
- Registration can create an account.
- Dashboard loads a sample-data welcome state.
- Portfolio and compare pages show coherent empty states.
- Direct `POST /api/analysis/quick` works.
- Direct report creation works.

## Journey Summary

### Journey 1: First Visit

- Landing page loads, but still contains placeholder production copy like `Dashboard preview coming soon` and repeated `Screenshot coming soon`.
- `Get Started` goes to `/register`.
- Registration requires name, email, password, and role selection.
- Registration has no TOS checkbox and no visible terms/privacy links.
- Footer legal links exist but all point to `https://www.parceldesk.io/#`.
- Onboarding completes, but both continue and skip routes send the user to `/dashboard`, not `/today`.
- Dashboard first-run state is coherent and shows sample-data onboarding copy.

### Journey 2: Analyze a Property

- Analyze page is a plain text input. There is no address autocomplete and no partial-address assist.
- In live production, the visible UI gets stuck on:
  - `Parsing address... SUCCESS`
  - `Fetching property data... ACTIVE`
  - `Running analysis WAITING`
  - `Generating AI insights WAITING`
  - `This usually takes 10–15 seconds`
- The backend SSE path is failing during property serialization; the frontend only marks a step failed and does not recover or fall back.
- Direct `POST /api/analysis/quick` still succeeds, so the broken part is specifically the streamed UI path.
- The results page reached from analyze is the property-analysis page, not the saved-deal page.
- `Save` and `Pipeline` actions on that page are fake UI actions.

### Journey 3: Return User

- Logging in lands the user on `/dashboard`.
- Returning authenticated users who hit guest routes get redirected to `/today`.
- `/dashboard` loads.
- `/today`, `/properties`, `/reports`, `/sequences`, and `/mail-campaigns` all have production data-loading problems caused by mixed-content requests.
- Some pages correctly show errors; others lie and show empty states when the fetch never succeeded.

### Journey 4: Upgrade to Paid

- `/pricing` is auth-protected.
- The page says `Start with a 7-day Carbon trial. No credit card required.`
- Titanium pricing copy advertises `Direct mail (50 pieces/month)`, while backend tier config allows `100/month`.
- Live Stripe checkout says `TEST MODE` and `Total due today $79.00`.
- No trial appears at checkout.
- Billing settings during trial do not show a clean upgrade/manage-subscription CTA.
- Trial banner shows `8 days left` on a nominal 7-day trial because of `Math.ceil`.

### Journey 5: Power Features

- Documents upload is broken in production.
- AI chat accepts the prompt, renders a blank assistant message, and never completes.
- Report creation works, but PDF generation remained `generating` after trigger + delayed poll.
- Compare and portfolio pages have reasonable empty states.

### Journey 6: Unconfigured Integrations

- BatchData missing: skip tracing does not degrade cleanly; production shows CORS failures and the trace endpoint returns 500.
- Lob missing: business-plan direct-mail code can fail operationally, and background task logic can still mark a campaign `sent` even if recipients fail.
- SendGrid/Twilio missing: sequences UI is still exposed and failures happen later in background execution rather than via a clear “not configured” or “coming soon” UX.
- Bricked missing: backend intends to degrade to a failed enrichment status without blocking analysis, but the frontend ignores the `enrichment_update` event entirely. In practice this is masked by the bigger SSE failure earlier in the flow.

## Detailed Findings

### 1. Registration has no legal consent, and legal docs are not reachable

- User experience:
  - The register page shows `Create your account` and `Start your 7-day free Pro trial`.
  - The only visible link is `Sign in`.
  - There is no TOS checkbox, no privacy-policy link, and no terms link at registration time.
  - The landing footer has `Terms` and `Privacy`, but both point to `#`.
- Code:
  - `frontend/src/pages/Register.tsx:96-193`
  - `frontend/src/components/landing/footer.tsx:25-29`
  - `frontend/src/components/landing/footer.tsx:70-75`
- Severity: HIGH
- Origin: Pre-existing in committed frontend code

### 2. Live landing page still contains placeholder “coming soon” content

- User experience:
  - The first page a prospect sees includes `Dashboard preview coming soon` and repeated `Screenshot coming soon`.
  - That makes the production site feel unfinished immediately.
- Code:
  - `frontend/src/components/landing/HeroSection.tsx:282-289`
  - `frontend/src/components/landing/FeatureSection.tsx:64-67`
- Severity: MEDIUM
- Origin: Pre-existing in committed frontend code

### 3. `/pricing` is protected behind auth

- User experience:
  - Public prospects can see pricing sections on landing, but the actual `/pricing` route is not public.
  - This is a bad upgrade/discovery path and complicates billing troubleshooting.
- Code:
  - `frontend/src/App.tsx:179-180`
- Severity: MEDIUM
- Origin: Pre-existing in committed frontend code

### 4. Auth and onboarding routes land users inconsistently, and onboarding can be bypassed by fetch failure

- User experience:
  - New registration/login sends users to `/dashboard`.
  - Authenticated users who later hit guest routes get redirected to `/today`.
  - Onboarding continue and onboarding skip both route to `/dashboard`.
  - If onboarding status fetch fails, the store marks onboarding as completed and fetched, which can silently bypass onboarding.
- Code:
  - `frontend/src/hooks/useAuth.ts:15-18`
  - `frontend/src/hooks/useAuth.ts:38-41`
  - `frontend/src/App.tsx:138-142`
  - `frontend/src/pages/OnboardingPage.tsx:69-98`
  - `frontend/src/stores/onboardingStore.ts:44-47`
- Severity: MEDIUM
- Origin: Pre-existing in committed frontend code

### 5. Production is loading Clerk with a development publishable key

- User experience:
  - Production emits a Clerk warning about development keys.
  - This is not a visible UI break, but it is a production hygiene and trust issue.
- Code:
  - `frontend/src/components/auth/ClerkProviderWrapper.tsx:10-20`
- Severity: LOW
- Origin: Production configuration issue

### 6. Analyze page is a raw text box with no autocomplete or partial-address assist

- User experience:
  - The core loop starts with a plain text input.
  - There is no address autocomplete, no suggestion list, and no obvious partial-address help.
  - This increases failure risk on the most important input in the product.
- Code:
  - `frontend/src/pages/analyze/AnalyzePage.tsx:258-279`
- Severity: MEDIUM
- Origin: Pre-existing in committed frontend code

### 7. Core analyze flow hangs in production and never completes in the UI

- User experience:
  - After entering `613 N 14th St, Sheboygan, WI 53081`, the UI remained on:
    - `Parsing address... SUCCESS`
    - `Fetching property data... ACTIVE`
    - `Running analysis WAITING`
    - `Generating AI insights WAITING`
    - `This usually takes 10–15 seconds`
  - The user gets `Cancel Analysis` and `View Draft ↗`, but no clear failure and no completed analysis.
- Code:
  - Frontend stream handling: `frontend/src/pages/analyze/AnalyzePage.tsx:68-123`
  - Frontend SSE event handling: `frontend/src/pages/analyze/AnalyzePage.tsx:127-170`
  - Backend SSE serialization failure: `backend/routers/analysis.py:420-458`
- Severity: CRITICAL
- Origin: Pre-existing in committed code

### 8. The streamed analysis path fails on a detached SQLAlchemy object

- User experience:
  - Same customer-visible hang as above.
  - Root cause is backend SSE logic, not the calculator itself.
- Code:
  - The threaded enrichment path expunges ORM objects, then `PropertyResponse.model_validate(enrichment.property)` is called later:
  - `backend/routers/analysis.py:423-438`
  - `backend/routers/analysis.py:456`
- Severity: CRITICAL
- Origin: Pre-existing in committed backend code

### 9. Frontend never properly recovers from an SSE `error` event

- User experience:
  - Even if the backend emits an SSE error event, the UI only marks step 2 failed.
  - It does not surface a readable blocking error, exit the loading state, or fall back to the working non-stream POST path.
- Code:
  - `frontend/src/pages/analyze/AnalyzePage.tsx:166-168`
  - The POST fallback only happens on fetch/transport exceptions, not on backend-emitted SSE errors:
  - `frontend/src/pages/analyze/AnalyzePage.tsx:104-123`
- Severity: CRITICAL
- Origin: Pre-existing in committed frontend code

### 10. Save and Pipeline on the analysis results page are fake actions

- User experience:
  - The analyze flow routes to a property-analysis page.
  - Clicking `Save` only toggles the button to `Saved`.
  - Clicking `Pipeline` just navigates to `/pipeline`.
  - No deal is created and nothing is actually added to pipeline.
- Code:
  - Route wiring: `frontend/src/App.tsx:169-171`
  - Analyze result routing: `frontend/src/pages/analyze/AnalyzePage.tsx:179-185`
  - Fake handlers: `frontend/src/pages/analyze/AnalysisResultsPage.tsx:158-164`
  - Buttons: `frontend/src/pages/analyze/AnalysisResultsPage.tsx:226-245`
- Severity: CRITICAL
- Origin: Pre-existing in committed frontend code

### 11. Production has mixed-content API requests from HTTPS pages to `http://api.parceldesk.io`

- User experience:
  - `/today`, `/properties`, `/reports`, `/sequences`, and `/mail-campaigns` all produce browser-blocked mixed-content requests.
  - Result: pages either half-render, show stale shell UI, show generic errors, or show false empty states.
- Live examples:
  - `/today` blocked `GET http://api.parceldesk.io/api/today/`
  - `/properties` blocked `GET http://api.parceldesk.io/api/properties/?page=1&per_page=20`
  - `/reports` blocked `GET http://api.parceldesk.io/api/reports/?page=1&per_page=20`
  - `/sequences` blocked `GET http://api.parceldesk.io/api/sequences/`
  - `/mail-campaigns` blocked `GET http://api.parceldesk.io/api/mail-campaigns/`
- Code:
  - Current source tries to force HTTPS for non-local API URLs:
  - `frontend/src/lib/api.ts:36-37`
- Severity: CRITICAL
- Origin: Pre-existing production deployment/configuration drift. Current frontend source appears to guard against this, so the bug is likely in the deployed env/build rather than the checked-in file.

### 12. Reports page lies on fetch failure and shows a false empty state

- User experience:
  - Live `/reports` showed:
    - `Your analysis shelf is empty`
    - `Generate professional investment reports...`
  - But the request had not succeeded; it was blocked by mixed content.
  - This is materially worse than an honest error state.
- Code:
  - `frontend/src/pages/reports/ReportsListPage.tsx:114-145`
  - `frontend/src/pages/reports/ReportsListPage.tsx:178-201`
- Severity: HIGH
- Origin: Pre-existing in committed frontend code

### 13. Sequences page lies on fetch failure and shows a false empty state

- User experience:
  - Live `/sequences` showed:
    - `No sequences yet`
    - `Create your first follow-up sequence to automate outreach.`
  - But the list request had failed.
- Code:
  - `frontend/src/pages/sequences/SequencesListPage.tsx:168-224`
- Severity: MEDIUM
- Origin: Pre-existing in committed frontend code

### 14. Mail campaigns page lies on fetch failure and shows a false empty state

- User experience:
  - Live `/mail-campaigns` showed:
    - `No campaigns yet`
    - `Create your first mail campaign to reach property owners.`
  - But the list request had failed.
- Code:
  - `frontend/src/pages/mail/MailCampaignsPage.tsx:171-227`
- Severity: MEDIUM
- Origin: Pre-existing in committed frontend code

### 15. Documents upload is broken in production and the underlying API returns 500

- User experience:
  - Documents page loads an upload affordance, but upload attempts fail from the browser with:
    - `Access to fetch ... has been blocked by CORS policy`
    - `Failed to load resource: net::ERR_FAILED`
    - browser-context fetch result: `TypeError: Failed to fetch`
  - The page does not transition to a successful upload state.
- Backend/API behavior:
  - Direct authenticated `POST /api/v1/documents/` returned `500 Internal Server Error`.
- Code:
  - Frontend upload mutation: `frontend/src/pages/documents/DocumentsPage.tsx:79-92`
  - Backend upload path with no exception guard around storage/DB/queue dispatch: `backend/routers/documents.py:40-125`
  - Storage writes raise directly: `backend/core/storage/s3_service.py:30-47`
  - Worker-unavailable handler exists, but live prod returned raw 500, not structured 503: `backend/main.py:52-71`
- Severity: CRITICAL
- Origin: Pre-existing backend/runtime issue

### 16. AI chat hangs with a blank assistant message and leaves orphaned user messages in history

- User experience:
  - Sending a prompt creates a user message and a blank assistant row labeled `Parcel AI`.
  - After waiting 20 seconds, there was still no assistant text.
  - No console errors surfaced.
  - Previous failed attempts remain in history as repeated orphaned user messages.
- Code:
  - Frontend optimistic blank assistant row: `frontend/src/components/chat/ChatPanel.tsx:250-268`
  - Stream consumption: `frontend/src/components/chat/ChatPanel.tsx:276-315`
  - Backend persists user message before streaming: `backend/routers/chat.py:208-219`
  - Backend only persists assistant reply if `full_reply` exists: `backend/routers/chat.py:235-248`
  - AI stream has no explicit timeout/error wrapper around Anthropic streaming: `backend/core/ai/chat_specialist.py:59-83`
- Severity: HIGH
- Origin: Pre-existing in committed code and/or AI-provider runtime behavior

### 17. Skip tracing does not degrade gracefully when BatchData is missing

- User experience:
  - Live `/skip-tracing` showed the page shell, usage, and trace form.
  - History fetch failed in the browser with CORS errors.
  - The page still implied a usable product surface.
  - Direct authenticated `POST /api/skip-tracing/trace` returned `500 Internal Server Error`.
- Code:
  - Frontend page has no history error state and falls back to empty-state rendering: `frontend/src/pages/skip-tracing/SkipTracingPage.tsx:110-124`
  - Empty-state branch: `frontend/src/pages/skip-tracing/SkipTracingPage.tsx:231-238`
  - Frontend mutation/query hooks only generic-toast on mutation failure: `frontend/src/hooks/useSkipTracing.ts:8-25`
  - Router: `backend/routers/skip_tracing.py:51-96`
  - History route: `backend/routers/skip_tracing.py:217-245`
  - Provider is explicitly supposed to return a graceful failed result if BatchData is unconfigured: `backend/core/skip_tracing/batchdata_provider.py:208-214`
- Severity: HIGH
- Origin: Pre-existing in committed code and/or production config

### 18. Billing copy and live Stripe checkout do not match

- User experience:
  - `/pricing` says:
    - `Start with a 7-day Carbon trial. No credit card required.`
    - `Start 7-Day Free Trial`
  - Live checkout redirects to Stripe `TEST MODE` and shows:
    - `Subscribe to Parcel Carbon`
    - `Total due today $79.00`
  - There is no visible free-trial treatment.
  - Titanium plan copy also says `Direct mail (50 pieces/month)` while backend entitlements are `100/month`.
- Code:
  - Pricing copy: `frontend/src/pages/PricingPage.tsx:247-253`
  - CTA label: `frontend/src/pages/PricingPage.tsx:379-393`
  - Bottom CTA label: `frontend/src/pages/PricingPage.tsx:483-498`
  - Titanium feature copy: `frontend/src/pages/PricingPage.tsx:63`
  - Checkout endpoint: `backend/routers/billing.py:50-80`
  - Stripe session creation has no trial configuration: `backend/core/billing/stripe_service.py:91-106`
  - Backend Titanium entitlement: `backend/core/billing/tier_config.py:101`
- Severity: CRITICAL
- Origin: Pre-existing in committed code and production Stripe configuration

### 19. Billing settings during trial do not give the user a clean way to upgrade or manage billing

- User experience:
  - Billing settings showed:
    - `Your 7-day Pro trial ends on April 14, 2026`
    - plan/status badges
  - But while `plan === free` and `trial_active === true`, no upgrade CTA or manage-subscription CTA is rendered.
- Code:
  - Trial copy: `frontend/src/pages/settings/BillingSettings.tsx:116-119`
  - CTA logic: `frontend/src/pages/settings/BillingSettings.tsx:141-168`
- Severity: HIGH
- Origin: Pre-existing in committed frontend code

### 20. Trial banner overstates days left, and the free-tier upgrade link points to the wrong place

- User experience:
  - Sidebar banner showed `Carbon Trial: 8 days left` on a nominal 7-day trial.
  - The `Upgrade` link inside the plan badge points to `/settings`, not `/pricing`.
- Code:
  - Day calculation uses `Math.ceil`: `frontend/src/components/billing/TrialBanner.tsx:25-29`
  - Visible text: `frontend/src/components/billing/TrialBanner.tsx:85-87`
  - Wrong upgrade link target: `frontend/src/components/billing/PlanBadge.tsx:44-49`
- Severity: MEDIUM
- Origin: Pre-existing in committed frontend code

### 21. Mail campaigns are exposed to Carbon users even though the backend correctly blocks them

- User experience:
  - A Carbon-trial user can browse to `/mail-campaigns`, see `Create Campaign`, and get a normal empty state.
  - Backend create correctly returns `402` with `UPGRADE_REQUIRED`.
  - So the frontend is inviting the wrong user segment into a paid feature surface they cannot use.
- Code:
  - Route exposure: `frontend/src/App.tsx:202-205`
  - Page has no tier gate: `frontend/src/pages/mail/MailCampaignsPage.tsx:171-227`
  - Hook only shows generic toast on create error: `frontend/src/hooks/useMailCampaigns.ts:16-23`
  - Backend gate is correct: `backend/routers/mail_campaigns.py:83-91`
  - Tier config shows Carbon has `mail_pieces_per_month=0`: `backend/core/billing/tier_config.py:78-93`
- Severity: HIGH
- Origin: Pre-existing in committed code

### 22. Sequences are exposed without provider-readiness checks or clear “coming soon” messaging

- User experience:
  - Carbon users can access `/sequences`, see `Create Sequence`, and proceed as if the feature is ready.
  - Missing SendGrid/Twilio is not surfaced proactively.
  - Failure is deferred into background processing, which is much worse UX than an upfront block.
- Code:
  - Route exposure: `frontend/src/App.tsx:197-199`
  - Page has no readiness or error gate: `frontend/src/pages/sequences/SequencesListPage.tsx:168-224`
  - Sequence service injects `sms = None` if Twilio is absent, but always constructs a SendGrid provider: `backend/routers/sequences.py:89-95`
  - Communication service raises when provider is missing: `backend/core/communications/service.py:48-49`
  - Same for email provider absence: `backend/core/communications/service.py:88-89`
  - Sequence engine swallows step exceptions by marking enrollment failed: `backend/core/communications/sequence_engine.py:129-136`
  - Actual send steps happen later in background: `backend/core/communications/sequence_engine.py:177-216`
- Severity: HIGH
- Origin: Pre-existing in committed code

### 23. PDF report generation is not user-complete; it remains in `generating`

- User experience:
  - Creating a report works and returns `201`.
  - Triggering `/api/reports/{id}/pdf` returns `{"status":"generating"}`.
  - Polling `/api/reports/{id}/pdf/status` 15+ seconds later still returned `{"status":"generating","download_url":null}`.
  - That means the “PDF reports” promise is not demonstrably complete in production.
- Code:
  - Report creation UI: `frontend/src/components/reports/CreateReportModal.tsx:50-84`
  - Trigger/status endpoints: `backend/routers/reports.py:279-318`
  - PDF generation is a Dramatiq background task and depends on Playwright + storage + a worker: `backend/core/tasks/pdf_generation.py:19-23`
  - Worker implementation: `backend/core/tasks/pdf_generation.py:27-125`
- Severity: HIGH
- Origin: Pre-existing in committed code and/or production worker/runtime setup

### 24. Direct-mail background task can mark a campaign `sent` even when recipients failed

- User experience:
  - If Lob is unconfigured or sends fail, the recipient can be marked `failed` while the campaign still ends in status `sent`.
  - That will produce false operational state and destroy trust in campaign analytics.
- Code:
  - Missing Lob key returns failure result: `backend/core/direct_mail/lob_provider.py:119-122`
  - Missing Lob key for postcard send returns failed result: `backend/core/direct_mail/lob_provider.py:183-185`
  - Quick-send path correctly throws `502` on provider failure: `backend/routers/mail_campaigns.py:543-570`
  - Background task marks failed recipients, then still sets `campaign.status = "sent"` at the end: `backend/core/tasks/mail_campaign.py:102-118`
- Severity: HIGH
- Origin: Pre-existing in committed backend code

### 25. Bricked degradation is not surfaced meaningfully in the frontend

- User experience:
  - In code, missing Bricked is supposed to degrade by sending an enrichment update with `bricked_status: failed` rather than blocking analysis.
  - But the frontend does not handle `enrichment_update` at all.
  - So even once the bigger SSE issue is fixed, the user still would not get a clear Bricked-degraded status in the stream UI.
- Code:
  - Missing key returns failed result: `backend/core/property_data/providers/bricked.py:80-81`
  - SSE stream emits status/failure update: `backend/routers/analysis.py:476-521`
  - Frontend handles `status`, `enrichment`, `scenario`, `narrative`, `complete`, and `error`, but not `enrichment_update`: `frontend/src/pages/analyze/AnalyzePage.tsx:131-168`
- Severity: MEDIUM
- Origin: Pre-existing in committed code

## API Endpoints Returning 500 When They Should Not

Confirmed directly in live production:

1. `POST https://api.parceldesk.io/api/v1/documents/`
   - Actual result: `500 Internal Server Error`
   - Customer-visible browser symptom: CORS failure / `TypeError: Failed to fetch`

2. `POST https://api.parceldesk.io/api/skip-tracing/trace`
   - Actual result: `500 Internal Server Error`
   - Customer-visible browser symptom: skip-tracing action fails instead of graceful degraded messaging

Important near-miss:

- `GET /api/analysis/quick/stream`
  - Did not present as HTTP 500 in the UI path.
  - It fails logically inside the SSE stream and leaves the customer hanging.
  - This is still a launch blocker even though it is not in the HTTP 500 list.

## Frontend Pages With Console Errors

Observed in live production:

1. `/today`
   - Mixed-content errors requesting `http://api.parceldesk.io/api/today/`

2. `/properties`
   - Mixed-content errors requesting `http://api.parceldesk.io/api/properties/?page=1&per_page=20`

3. `/reports`
   - Mixed-content errors requesting `http://api.parceldesk.io/api/reports/?page=1&per_page=20`

4. `/sequences`
   - Mixed-content errors requesting `http://api.parceldesk.io/api/sequences/`

5. `/mail-campaigns`
   - Mixed-content errors requesting `http://api.parceldesk.io/api/mail-campaigns/`

6. `/skip-tracing`
   - CORS errors requesting `https://api.parceldesk.io/api/skip-tracing/history`

7. `/documents` during upload
   - CORS errors requesting `https://api.parceldesk.io/api/v1/documents/`

Observed warning:

- Production auth surfaces a Clerk development-key warning.

## Feature Gates That Do Not Work Correctly

1. Mail campaigns are visible to Carbon users even though backend create is correctly business-only.
2. Sequences are visible without readiness checks for missing SendGrid/Twilio.
3. `/pricing` is auth-protected, which is the wrong gate for a pricing/upgrade surface.
4. Analysis results page implies `Save` and `Pipeline` are usable actions, but they are not actually wired.

## Empty States That Show the Wrong Thing

1. `/reports`
   - Shows `Your analysis shelf is empty` when the request actually failed.

2. `/sequences`
   - Shows `No sequences yet` when the request actually failed.

3. `/mail-campaigns`
   - Shows `No campaigns yet` when the request actually failed.

4. `/skip-tracing`
   - History can fail while the page still looks like a usable empty/history state.

## Missing Integration Failures That Are User-Visible

1. Bricked.ai
   - Intended backend degradation exists.
   - Frontend ignores the `enrichment_update` event that would communicate degraded enrichment.
   - In practice, the bigger SSE bug blocks the user before this matters.

2. BatchData
   - Expected graceful failure path exists in provider code.
   - Live production instead gives browser CORS errors and a backend 500 on trace.

3. SendGrid / Twilio
   - Manual communications router can return a clean `503`.
   - Sequences UI does not warn proactively and later background failures are opaque to the user.

4. Lob
   - Provider returns failed results when unconfigured.
   - Quick-send path converts that to `502`, but background campaign processing can still end with campaign status `sent`.

## Ranked Top 20 Issues

1. CRITICAL: Core analyze flow hangs in production and never completes in the UI.
2. CRITICAL: Billing promise and live checkout do not match; Stripe checkout is `TEST MODE` and charges `$79` immediately.
3. CRITICAL: Mixed-content API requests break multiple authenticated pages in production.
4. CRITICAL: Save and Pipeline actions on analysis results are fake.
5. CRITICAL: Documents upload is broken and the underlying API returns 500.
6. HIGH: AI chat hangs with a blank assistant response and leaves orphaned user messages.
7. HIGH: Skip tracing does not degrade gracefully when BatchData is missing; live trace returns 500.
8. HIGH: Registration has no legal consent and legal docs are not reachable.
9. HIGH: Billing settings during trial offer no clean upgrade/manage action.
10. HIGH: Mail campaigns are exposed to Carbon users even though the backend blocks them.
11. HIGH: Sequences are exposed without provider-readiness checks or “coming soon” messaging.
12. HIGH: PDF report generation remains stuck in `generating`.
13. HIGH: Reports page lies with a false empty state on fetch failure.
14. HIGH: Direct-mail background task can mark campaigns `sent` even when recipients fail.
15. MEDIUM: Auth/onboarding redirects are inconsistent, and onboarding can be bypassed by fetch failure.
16. MEDIUM: Analyze input has no autocomplete or partial-address assist.
17. MEDIUM: Trial banner overstates days left and upgrade link points to `/settings`.
18. MEDIUM: Live landing page still contains `coming soon` placeholder content.
19. MEDIUM: `/pricing` is auth-protected.
20. LOW: Production is loading Clerk with a development publishable key.

## Minimum Viable Launch Checklist

These should be fixed before showing Parcel to 5 beta testers:

1. Fix the core analyze loop.
   - Shortest path: disable SSE in the UI and use the working non-stream `POST /api/analysis/quick` path until the stream is trustworthy.

2. Wire `Save` and `Pipeline` to real persistence.
   - If the page is only a property-analysis preview, the buttons should be removed until they work.

3. Fix the production API base URL / mixed-content regression.
   - `/today`, `/properties`, `/reports`, `/sequences`, and `/mail-campaigns` must all load cleanly over HTTPS.

4. Fix billing truthfulness immediately.
   - Either actually offer the 7-day free trial with no card, or remove that copy everywhere.
   - Remove `TEST MODE` from customer-facing checkout before user testing.

5. Add real Terms and Privacy pages and surface them during registration.
   - At minimum: visible links plus explicit consent.

6. Fix document upload.
   - Resolve the backend 500.
   - Resolve the CORS problem.
   - Show a real inline failure state if upload fails.

7. Fix AI chat to either stream reliably or fail visibly within a bounded time.
   - Do not persist orphaned user messages without assistant completion or clear retry state.

8. Hide or hard-block unconfigured features with explicit messaging.
   - Skip tracing
   - Mail campaigns
   - Sequences

9. Fix false empty states.
   - Reports
   - Sequences
   - Mail campaigns
   - Skip tracing history

10. Fix PDF generation end-to-end.
   - Trigger
   - worker execution
   - status transition
   - actual download link

11. Add a clear upgrade/manage billing CTA during trial.

12. Remove production placeholder copy from the landing page.

## Nice To Have Before Launch

These should be fixed, but they do not need to block a small beta if the critical items above are resolved:

1. Add address autocomplete or at least stronger address validation on the analyze page.
2. Standardize post-login landing behavior between `/dashboard` and `/today`.
3. Fix trial day counting so “7-day trial” does not show `8 days left`.
4. Point `Upgrade` links to `/pricing` rather than `/settings`.
5. Surface Bricked degradation explicitly in the analysis stream UI.
6. Clean up the Clerk production key warning.
7. Improve today-page resilience so “no data yet” is clearly distinguished from “request failed”.
8. Add more explicit empty-state education on compare/portfolio/dashboard once the core loop works.

## Bottom Line

Parcel has enough working infrastructure to be salvageable quickly, but the current production experience is not beta-ready. The biggest risk is not “polish”; it is trust. Right now a new customer can hit unfinished landing copy, missing legal links, a broken analyze loop, misleading billing copy, broken uploads, blank AI chat, and paid-feature surfaces that are either inaccessible or not actually configured.

The highest-leverage move is to narrow the product shown to testers:

- make landing/register legally sound
- make analyze use the working non-stream backend path
- make save/pipeline real
- make billing truthful
- hide or clearly label anything dependent on unconfigured services

If those are done first, beta testing becomes useful. Without them, testers will spend most of their time finding obvious breakage instead of giving product feedback.
