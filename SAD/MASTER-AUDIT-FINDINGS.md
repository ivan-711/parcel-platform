# Master Audit Findings & Long-Term Fix Plan

> Consolidated: April 6, 2026
> Last updated: April 6, 2026 (merged pre-launch-product-audit findings)
> Sources: 8 audit documents, 6 research documents, 3 legal documents, git history

---

# PART 1: CONSOLIDATED FINDINGS

Every finding from every audit, deduplicated and cross-referenced. Status reflects what the git log shows as already fixed.

---

## 1. Core Product Loop

### P1: SSE analysis flow hangs in production — never completes
- **What:** The core analyze flow gets stuck at "Fetching property data... ACTIVE" and never progresses. Root cause: the threaded enrichment path expunges SQLAlchemy ORM objects, then `PropertyResponse.model_validate(enrichment.property)` is called later on a detached object, causing a serialization failure inside the SSE stream. The frontend only marks step 2 as failed but doesn't exit the loading state, show a readable error, or fall back to the working non-stream `POST /api/analysis/quick` path. Additionally, the backend sends raw `str(e)` including multi-line Pydantic ValidationErrors when any exception occurs.
- **Severity:** Critical — **LAUNCH BLOCKER**
- **Sources:** pre-launch-product-audit (Findings 7, 8, 9), core-ux-investigation (Issue 2)
- **Status:** Partially Fixed — commit `71edbd9` (analysis page UX overhaul) addressed some UI, but the detached-object serialization bug and missing SSE error recovery are still present in production
- **Files:** backend/routers/analysis.py (lines 420-458, 455-557), frontend/src/pages/analyze/AnalyzePage.tsx (lines 68-170), frontend/src/pages/analyze/components/AnalysisLoadingState.tsx

### P2: Today page crashes with unhandled 500
- **What:** `GET /api/today/` has no top-level try/catch. Any sub-builder failure crashes the entire endpoint. Users see "Unable to load your briefing." In production, this is compounded by mixed-content blocking (see D3).
- **Severity:** Critical
- **Sources:** core-ux-investigation (Issue 1), pre-launch-product-audit (Journey 3)
- **Status:** Not Fixed
- **Files:** backend/routers/today.py (lines 79-150, 183-343)

### P3: Past analyses are unfindable — broken product loop
- **What:** After analyzing a property, there's no navigation path back to results. Dashboard activity items aren't clickable. No "Recent Analyses" section exists.
- **Severity:** High
- **Sources:** core-ux-investigation (Issues 4, 5)
- **Status:** Not Fixed
- **Files:** frontend/src/pages/Dashboard.tsx (lines 393-411)

### P4: Deals not auto-created on analysis
- **What:** Analysis creates Property + AnalysisScenario but NOT a Deal. Dashboard shows "4 Properties, 0 Deals." Users' work exists in the DB but is unreachable from the Deals/Pipeline surfaces.
- **Severity:** High
- **Sources:** core-ux-investigation (Issue 4)
- **Status:** Not Fixed — Ivan decided: auto-create Deal with status "draft"
- **Files:** backend/routers/analysis.py, backend/core/property_data/service.py

### P5: Save and Pipeline buttons on analysis results are fake
- **What:** Clicking "Save" only toggles button text to "Saved" — no API call, no persistence. Clicking "Pipeline" just navigates to `/pipeline` — no deal is created or added. Users believe they saved their analysis but nothing happened.
- **Severity:** Critical — **LAUNCH BLOCKER**
- **Sources:** pre-launch-product-audit (Finding 10)
- **Status:** Not Fixed
- **Files:** frontend/src/pages/analyze/AnalysisResultsPage.tsx (lines 158-164, 226-245), frontend/src/App.tsx (lines 169-171)

### P6: No address autocomplete
- **What:** Address input is a plain `<input>`. No suggestions, no typeahead. Incomplete addresses cause analysis failures.
- **Severity:** Medium
- **Sources:** core-ux-investigation (Issue 3), pre-launch-product-audit (Finding 6)
- **Status:** Not Fixed — Ivan decided: Google Places (~$3/mo)
- **Files:** frontend/src/pages/analyze/AnalyzePage.tsx

### P7: dealId vs propertyId navigation confusion
- **What:** Multiple navigation paths (deals list, command palette, pipeline cards) send `deal.id` to a route expecting `propertyId`, causing 404s or wrong data.
- **Severity:** Critical
- **Sources:** codex-structural-audit (Finding 3)
- **Status:** Fixed — commit `46437fb`
- **Files:** frontend/src/components/pipeline/deal-card.tsx, frontend/src/lib/useDeals.ts, frontend/src/components/command-palette.tsx

### P8: SSE stale closure — analysis dumps user back to input
- **What:** React stale closure bug in AnalyzePage. The `complete` handler reads `partialResult` from the closure (always null), so successful analyses dump the user back to the input form.
- **Severity:** Critical
- **Sources:** codex-structural-audit (Finding 4)
- **Status:** Fixed — commit `46437fb`
- **Files:** frontend/src/pages/analyze/AnalyzePage.tsx

### P9: Reanalysis data loss — second analysis gets empty scenarios
- **What:** `_build_data_sources()` stores provenance but not values. Duplicate-property path tries to read `src["value"]` which never exists, creating empty scenarios.
- **Severity:** High
- **Sources:** codex-structural-audit (Finding 5)
- **Status:** Fixed — commit `46437fb`
- **Files:** backend/core/property_data/service.py

### P10: Pipeline card deal_id drops during flattening
- **What:** When pipeline card has nested `deal` object, flattening logic falls back for address/city/state but never for `deal_id`, leaving it undefined.
- **Severity:** High
- **Sources:** adversarial-review (H4)
- **Status:** Fixed — commit `bd64642`
- **Files:** frontend/src/components/pipeline/deal-card.tsx

### P11: Buyer detail shows raw property types + rehab address fallback broken
- **What:** Buyer detail renders raw enums like `single_family`. Rehab cards drop addresses when the referenced property isn't in the fetched page.
- **Severity:** High
- **Sources:** adversarial-review (H5)
- **Status:** Fixed — commit `b1e35e9`
- **Files:** frontend/src/pages/buyers/BuyerDetailPage.tsx, frontend/src/pages/rehab/RehabsPage.tsx

### P12: AI chat hangs with blank assistant message
- **What:** Sending a prompt creates a user message and a blank "Parcel AI" row. After 20+ seconds, no text appears. Previous failed attempts remain as orphaned user messages in history. The backend persists the user message before streaming but only persists the assistant reply if `full_reply` exists. No timeout or error wrapper around Anthropic streaming.
- **Severity:** High
- **Sources:** pre-launch-product-audit (Finding 16)
- **Status:** Not Fixed
- **Files:** frontend/src/components/chat/ChatPanel.tsx (lines 250-315), backend/routers/chat.py (lines 208-248), backend/core/ai/chat_specialist.py (lines 59-83)

### P13: PDF report generation stuck in "generating" forever
- **What:** Creating a report works (201). Triggering PDF returns `{"status":"generating"}`. Polling 15+ seconds later still returns generating with null download_url. The Dramatiq background task depends on Playwright + storage + a running worker — if any is missing, the job never completes and the user never gets a PDF.
- **Severity:** High
- **Sources:** pre-launch-product-audit (Finding 23)
- **Status:** Not Fixed
- **Files:** backend/routers/reports.py (lines 279-318), backend/core/tasks/pdf_generation.py

### P14: Auth/onboarding routing is inconsistent
- **What:** New registration sends users to `/dashboard`. Authenticated users hitting guest routes get redirected to `/today`. Onboarding continue and skip both route to `/dashboard`. If onboarding status fetch fails, the store marks onboarding as completed, silently bypassing it.
- **Severity:** Medium
- **Sources:** pre-launch-product-audit (Finding 4)
- **Status:** Not Fixed
- **Files:** frontend/src/hooks/useAuth.ts, frontend/src/App.tsx (lines 138-142), frontend/src/stores/onboardingStore.ts (lines 44-47)

### P15: False empty states on fetch failure — pages lie about having no data
- **What:** Reports, Sequences, and Mail Campaigns pages all show friendly "no data yet" empty states when the underlying API request actually failed (e.g., due to mixed-content blocking or server error). Skip tracing history has the same pattern. Users see "Your analysis shelf is empty" when the real problem is a network failure.
- **Severity:** High
- **Sources:** pre-launch-product-audit (Findings 12, 13, 14)
- **Status:** Not Fixed
- **Files:** frontend/src/pages/reports/ReportsListPage.tsx (lines 114-201), frontend/src/pages/sequences/SequencesListPage.tsx (lines 168-224), frontend/src/pages/mail/MailCampaignsPage.tsx (lines 171-227), frontend/src/pages/skip-tracing/SkipTracingPage.tsx (lines 110-238)

---

## 2. Auth & Security

### A1: Auth half-migration — Clerk overlay on legacy JWT
- **What:** SSE endpoints (chat-stream.ts, AnalyzePage.tsx) skip Bearer token and rely only on cookies. If a user authenticates via Clerk only (no legacy cookie), SSE fails silently. No CSRF protection. No token revocation on logout.
- **Severity:** High
- **Sources:** codex-structural-audit (Finding 2)
- **Status:** Partially Fixed — commit `46437fb` added Bearer to SSE, but legacy JWT/cookie paths still exist
- **Files:** frontend/src/lib/chat-stream.ts, frontend/src/pages/analyze/AnalyzePage.tsx, backend/core/security/jwt.py, backend/routers/auth.py
- **Ivan's decision:** Clerk-only auth — remove legacy JWT/cookie paths entirely

### A2: Clerk audience validation is optional
- **What:** `verify_clerk_token()` only checks `aud` when `CLERK_JWT_AUDIENCE` is configured. Without it, a valid Clerk token for a wrong audience can JIT-create a local account.
- **Severity:** Critical
- **Sources:** adversarial-review (C4)
- **Status:** Fixed — commit `860943d`
- **Files:** backend/core/security/clerk.py, backend/core/security/jwt.py

### A3: Clerk-only users crash on legacy password flows
- **What:** `password_hash` is nullable for Clerk users, but login/password-change paths call `verify_password(..., user.password_hash)` unconditionally, causing 500.
- **Severity:** High
- **Sources:** adversarial-review (H7)
- **Status:** Fixed — commit `bd64642`
- **Files:** backend/routers/auth.py, backend/models/users.py

### A4: Clerk webhook replay vulnerability
- **What:** `svix` is not installed. Fallback HMAC verifier doesn't validate timestamp freshness. Captured webhooks can be replayed indefinitely.
- **Severity:** Security
- **Sources:** adversarial-review (S3)
- **Status:** Fixed — commit `860943d`
- **Files:** backend/routers/clerk_webhooks.py

### A5: Dev preview mocks in production bundle
- **What:** Dev preview mode is statically imported in App.tsx. Mock auth/data could activate with bad env config.
- **Severity:** Security
- **Sources:** adversarial-review (S2)
- **Status:** Fixed — commit `bd64642`
- **Files:** frontend/src/App.tsx

### A6: Property.location PostGIS coupling
- **What:** ORM model adds `Property.location` when `geoalchemy2` imports, but the DB column may not exist. Can crash normal property queries.
- **Severity:** Critical
- **Sources:** adversarial-review (C5)
- **Status:** Not Fixed — needs investigation (geoalchemy2 still in requirements.txt)
- **Files:** backend/models/properties.py, backend/requirements.txt

### A7: Production Clerk uses development publishable key
- **What:** Production emits a Clerk warning about development keys. Not a visible UI break, but a production hygiene issue that undermines trust.
- **Severity:** Low
- **Sources:** pre-launch-product-audit (Finding 5)
- **Status:** Not Fixed — production configuration issue
- **Files:** frontend/src/components/auth/ClerkProviderWrapper.tsx, production env vars

---

## 3. Billing & Payments

### B1: Billing copy and live Stripe checkout do not match — multiple sources of truth
- **What:** The pricing page says "Start with a 7-day Carbon trial. No credit card required." Live Stripe checkout says `TEST MODE` and charges `$79.00` immediately with no trial treatment. Additionally: landing page says Free includes "5 deals/month, full pipeline, PDF exports." Pricing page says "5 analyses/month" and shows Pro at "$69." Backend says Free is 3 analyses, no pipeline, no PDF; Pro is $79. Titanium copy says "50 mail pieces/month" but backend allows 100/month.
- **Severity:** Critical — **LAUNCH BLOCKER** (Financial/legal: false billing promises)
- **Sources:** adversarial-review (F5), pricing-strategy-research, pre-launch-product-audit (Finding 18)
- **Status:** Partially Fixed — commit `e2443ef` updated tier names to Steel/Carbon/Titanium, but trial not configured in Stripe, feature claims still wrong, TEST MODE still active
- **Files:** frontend/src/pages/PricingPage.tsx (lines 63, 247-253, 379-498), frontend/src/components/landing/constants.ts, backend/core/billing/tier_config.py, backend/core/billing/stripe_service.py (lines 91-106), backend/routers/billing.py (lines 50-80)

### B2: Business tier is break-even or negative margin with heavy mail usage
- **What:** 100 mail pieces at $0.63-$1.05 each = $63-$105/mo cost alone. Total Business cost $137-179/mo vs $149 price.
- **Severity:** Medium (Financial)
- **Sources:** pricing-strategy-research
- **Status:** Not Fixed — structural pricing issue, not a code bug
- **Files:** backend/core/billing/tier_config.py

### B3: Plus tier exists in backend but isn't purchasable
- **What:** Backend has full Plus tier config. Frontend never renders a Plus checkout button. All feature gates point to Pro.
- **Severity:** Medium
- **Sources:** pricing-strategy-research, pricing-decisions-deep-dive
- **Status:** Not Fixed — Ivan should decide whether to drop Plus or build the checkout
- **Ivan's decision leaning:** 3-tier launch (drop Plus from pricing page, keep in backend as dormant)

### B4: Billing settings during trial have no upgrade/manage CTA
- **What:** When `plan === free` and `trial_active === true`, billing settings show trial end date and badges but no "Upgrade" or "Manage Subscription" button. Users on a trial have no clear path to paid.
- **Severity:** High
- **Sources:** pre-launch-product-audit (Finding 19)
- **Status:** Not Fixed
- **Files:** frontend/src/pages/settings/BillingSettings.tsx (lines 116-168)

### B5: Trial banner overstates days + upgrade link goes to wrong page
- **What:** Sidebar shows "Carbon Trial: 8 days left" on a 7-day trial (uses `Math.ceil`). The "Upgrade" link in PlanBadge points to `/settings` instead of `/pricing`.
- **Severity:** Medium
- **Sources:** pre-launch-product-audit (Finding 20)
- **Status:** Not Fixed
- **Files:** frontend/src/components/billing/TrialBanner.tsx (lines 25-87), frontend/src/components/billing/PlanBadge.tsx (lines 44-49)

### B6: Mail campaigns exposed to wrong tier
- **What:** Carbon-trial users can browse to `/mail-campaigns`, see "Create Campaign", and get a normal empty state. Backend correctly returns 402 `UPGRADE_REQUIRED` on create, but the frontend invites users into a feature surface they can't use. No tier gate on the page.
- **Severity:** High
- **Sources:** pre-launch-product-audit (Finding 21)
- **Status:** Not Fixed
- **Files:** frontend/src/App.tsx (lines 202-205), frontend/src/pages/mail/MailCampaignsPage.tsx, backend/core/billing/tier_config.py

### B7: Campaign background task marks campaign "sent" even when recipients fail
- **What:** If Lob is unconfigured or sends fail, individual recipients get marked `failed` but the campaign still ends with status `sent`. This produces false operational state and destroys trust in campaign analytics.
- **Severity:** High
- **Sources:** pre-launch-product-audit (Finding 24)
- **Status:** Not Fixed
- **Files:** backend/core/tasks/mail_campaign.py (lines 102-118), backend/core/direct_mail/lob_provider.py

---

## 4. SEO & Public Presence

### S1: og:description reads like a GitHub README
- **What:** "Full-stack SaaS platform with 5 investment strategy calculators, Claude AI integration, and Kanban deal pipeline. Built with React, TypeScript, FastAPI, and PostgreSQL."
- **Severity:** High
- **Sources:** seo-audit
- **Status:** Not Fixed
- **Files:** frontend/index.html (line 18)

### S2: No robots.txt
- **What:** Search engines have no guidance on what to index vs ignore.
- **Severity:** High
- **Sources:** seo-audit
- **Status:** Not Fixed
- **Files:** frontend/public/robots.txt (doesn't exist)

### S3: No sitemap.xml
- **What:** Google has no map of Parcel's public pages.
- **Severity:** High
- **Sources:** seo-audit
- **Status:** Not Fixed
- **Files:** frontend/public/sitemap.xml (doesn't exist)

### S4: /pricing behind ProtectedRoute — crawlers and prospects can't access
- **What:** Pricing page requires authentication. Google can't crawl it. Users can't share the link. Prospects who see pricing on the landing page can't click through to the full pricing comparison.
- **Severity:** Critical
- **Sources:** seo-audit, pre-launch-product-audit (Finding 3)
- **Status:** Not Fixed
- **Files:** frontend/src/App.tsx (line 180)

### S5: No per-page titles or descriptions
- **What:** Every page (login, register, pricing, landing) serves the same generic `<title>` and `<meta description>`.
- **Severity:** High
- **Sources:** seo-audit
- **Status:** Not Fixed
- **Files:** frontend/index.html, all public page components

### S6: No canonical URLs
- **What:** No `<link rel="canonical">` tags. Risk of duplicate content between www and non-www.
- **Severity:** Medium
- **Sources:** seo-audit
- **Status:** Not Fixed
- **Files:** frontend/index.html

### S7: No JSON-LD structured data
- **What:** No Organization or SoftwareApplication schema. No rich snippet potential.
- **Severity:** Medium
- **Sources:** seo-audit
- **Status:** Not Fixed
- **Files:** frontend/src/components/landing/LandingPage.tsx

### S8: No Twitter-specific meta tags
- **What:** Missing twitter:title, twitter:description. Falls back to the dev-facing og:description.
- **Severity:** Low
- **Sources:** seo-audit
- **Status:** Not Fixed
- **Files:** frontend/index.html

### S9: Vercel config has no SEO or security headers
- **What:** vercel.json only has SPA rewrite rule. No Cache-Control, X-Frame-Options, etc.
- **Severity:** Medium
- **Sources:** seo-audit
- **Status:** Not Fixed
- **Files:** frontend/vercel.json

### S10: Share pages serve generic meta tags
- **What:** `/share/:dealId` and `/reports/view/:shareToken` show "Parcel — Real Estate Intelligence Platform" instead of deal-specific content.
- **Severity:** Low
- **Sources:** seo-audit
- **Status:** Not Fixed (requires Edge Functions for proper fix)

---

## 5. Legal & Compliance

### L1: Privacy Policy and Terms of Service are written and comprehensive
- **What:** Both documents exist in LEGAL/, are dated April 6 2026, cover Clerk, Stripe, Anthropic, OpenAI, RentCast, BatchData, Lob, Twilio, SendGrid, PostHog. Include CCPA, arbitration, skip trace rules, direct mail rules.
- **Severity:** N/A — these are DONE
- **Sources:** LEGAL/PRIVACY-POLICY.md, LEGAL/TERMS-OF-SERVICE.md
- **Status:** Complete
- **Note:** Neither is linked from the app (no footer links on landing page or settings)

### L2: Compliance copy for skip tracing, mail, registration, deletion is ready
- **What:** LEGAL/COMPLIANCE-COPY.md has production-ready checkbox labels, helper text, and validation errors.
- **Severity:** N/A
- **Sources:** LEGAL/COMPLIANCE-COPY.md
- **Status:** Copy written; some already implemented (skip trace compliance checkbox was in commit `b1e35e9`)

### L3: Cookie banner copy exists but no banner is implemented
- **What:** Cookie banner text ("Accept / Essential only") is in COMPLIANCE-COPY.md but no cookie consent UI exists in the frontend.
- **Severity:** Medium (legal exposure for PostHog analytics tracking)
- **Sources:** LEGAL/COMPLIANCE-COPY.md, frontend code review
- **Status:** Not Fixed

### L4: TOS/Privacy not linked from the app — footer links point to #
- **What:** Landing footer has "Terms" and "Privacy" links but both point to `https://www.parceldesk.io/#`. No link in settings, no link during registration. Legal docs are unreachable from any user-facing surface.
- **Severity:** High (legal)
- **Sources:** Cross-reference of LEGAL/ docs vs frontend, pre-launch-product-audit (Finding 1)
- **Status:** Not Fixed
- **Files:** frontend/src/components/landing/footer.tsx (lines 25-29, 70-75), frontend/src/pages/Register.tsx

### L5: Registration doesn't require TOS acceptance
- **What:** COMPLIANCE-COPY.md specifies a "I agree to Terms and Privacy Policy" checkbox. Register page doesn't have one. Register page also says "Start your 7-day free Pro trial" which doesn't match current tier names.
- **Severity:** High (legal)
- **Sources:** LEGAL/COMPLIANCE-COPY.md vs frontend/src/pages/Register.tsx, pre-launch-product-audit (Finding 1)
- **Status:** Not Fixed
- **Files:** frontend/src/pages/Register.tsx (lines 96-193)

### L6: No account deletion flow
- **What:** COMPLIANCE-COPY.md has the full deletion dialog copy. No implementation exists.
- **Severity:** Medium (CCPA requirement, privacy policy promises it)
- **Sources:** LEGAL/COMPLIANCE-COPY.md, LEGAL/PRIVACY-POLICY.md section 7
- **Status:** Not Fixed

---

## 6. Mobile Responsiveness

### M1: Dialog/AlertDialog not mobile-safe (SYSTEMIC)
- **What:** Dialog uses `w-full max-w-lg` with no viewport clamp. Edge-to-edge or clipped on phones.
- **Severity:** High
- **Sources:** mobile-audit (systemic)
- **Status:** Not Fixed — Ivan decided: critical mobile fixes only
- **Files:** frontend/src/components/ui/dialog.tsx, frontend/src/components/ui/alert-dialog.tsx

### M2: Analysis results action bar overflows on mobile
- **What:** Header has 4-5 buttons in a single flex row with no wrap. Core analysis screen breaks on phones.
- **Severity:** High
- **Sources:** mobile-audit
- **Status:** Not Fixed — Ivan flagged as critical
- **Files:** frontend/src/pages/analyze/AnalysisResultsPage.tsx

### M3: AppShell topbar actions hidden below sm breakpoint
- **What:** Properties and Contacts pages lose their primary CTA ("Analyze Property", "Add Contact") on phones.
- **Severity:** High
- **Sources:** mobile-audit (systemic)
- **Status:** Not Fixed
- **Files:** frontend/src/components/layout/AppShell.tsx

### M4: Fixed multi-column grids don't stack on mobile (30+ instances)
- **What:** `grid-cols-2` and `grid-cols-3` in modals and tool pages don't collapse. Contact modals, transaction modals, skip tracing forms, campaign builders all affected.
- **Severity:** Medium (each instance is low, aggregate is high)
- **Sources:** mobile-audit (15+ specific files cited)
- **Status:** Not Fixed
- **Files:** ContactModal, AddBuyerModal, BuyBoxEditor, RecordPaymentModal, AddTransactionModal, SkipTracingPage, CampaignBuilderPage, and more

### M5: Charts lack phone-specific behavior
- **What:** BreakEvenChart keeps `interval={0}` for 61 months. YAxis widths consume too much space. Legends don't simplify.
- **Severity:** Medium
- **Sources:** mobile-audit
- **Status:** Not Fixed
- **Files:** BreakEvenChart.tsx, CashFlowBenchmarkChart.tsx, StrategyAllocationChart.tsx, ComparisonRadar.tsx

### M6: Popover fixed width clips on mobile
- **What:** Default `w-72` popovers render off-screen near viewport edges.
- **Severity:** Low
- **Sources:** mobile-audit (systemic)
- **Status:** Not Fixed
- **Files:** frontend/src/components/ui/popover.tsx

---

## 7. Frontend Quality

### F1: 166 TypeScript strict errors (31 files)
- **What:** `tsc --noEmit` fails. Vite builds pass because esbuild strips types. 5 errors have runtime risk (TS2339/TS2345).
- **Severity:** Medium (no CI enforcement)
- **Sources:** codex-structural-audit (Finding 1)
- **Status:** Fixed — commit `a669841` resolved all strict errors, commit `46437fb` also addressed

### F2: VerdictBadge allows optimistic verdicts on zero/null metrics
- **What:** `monthly_cash_flow <= 0` or null hero metrics can still show "Good Deal."
- **Severity:** Critical (Financial trust)
- **Sources:** adversarial-review (C2)
- **Status:** Fixed — commit `860943d`
- **Files:** frontend/src/pages/analyze/components/VerdictBadge.tsx

### F3: MetricTooltip formulas drift from backend math
- **What:** DSCR, rent-to-price, monthly_cash_flow, break_even_rent tooltips show wrong formulas. `num()` helper accepts NaN/Infinity.
- **Severity:** Critical (Financial trust)
- **Sources:** adversarial-review (C3)
- **Status:** Fixed — commit `860943d`
- **Files:** frontend/src/pages/analyze/components/MetricTooltips.ts

### F4: Creative-finance CashFlowBreakdown omits monthly_expenses
- **What:** Expense bars understate costs. Bars and cash flow number disagree.
- **Severity:** High (Financial)
- **Sources:** adversarial-review (F1)
- **Status:** Not Fixed
- **Files:** frontend/src/pages/analyze/components/CashFlowBreakdown.tsx, backend/core/calculators/creative_finance.py

### F5: CashFlowChart compounds fixed debt service as growing expense
- **What:** Creative-finance projections grow a fixed payment at 3%/year. 10/20/30-year numbers are materially wrong.
- **Severity:** High (Financial)
- **Sources:** adversarial-review (F3)
- **Status:** Not Fixed
- **Files:** frontend/src/pages/analyze/components/CashFlowChart.tsx

### F6: BreakEvenChart truncates long timelines and hides never-break-even
- **What:** Chart only plots months 0-60 but labels months beyond 60. Zero/negative cash flow deals silently disappear.
- **Severity:** High (Financial)
- **Sources:** adversarial-review (F2)
- **Status:** Not Fixed
- **Files:** frontend/src/pages/analyze/components/BreakEvenChart.tsx

### F7: debt_yield metric dropped from buy-and-hold UI
- **What:** Backend still computes `debt_yield` but frontend removed it. API and UI drift.
- **Severity:** Medium
- **Sources:** adversarial-review (F4)
- **Status:** Not Fixed
- **Files:** frontend/src/pages/analyze/components/KeyMetrics.tsx

### F8: Hardcoded dark-theme colors on analysis surfaces
- **What:** BreakEvenChart, KeyMetrics, NarrativeCard, ReverseCalculatorModal, PropertyDetailPage all use hardcoded hex colors instead of semantic theme variables.
- **Severity:** High
- **Sources:** adversarial-review (H2)
- **Status:** Not Fixed (light theme affected)
- **Files:** 5+ analysis/property component files

### F9: Narrative card preview cuts at wrong sentence boundary
- **What:** Preview extracts two sentences (not one), doesn't remove periods, regex breaks on abbreviations.
- **Severity:** Medium
- **Sources:** adversarial-review (H1)
- **Status:** Fixed — commit `b1e35e9`

### F10: ReverseCalculatorModal wrong defaults + input blocks typing
- **What:** BRRRR and creative finance show wrong assumption copy. Numeric input snaps back on empty/NaN.
- **Severity:** High
- **Sources:** adversarial-review (H3)
- **Status:** Fixed — commit `bd64642`

### F11: Reverse calculator race condition
- **What:** No request cancellation or sequencing. Slower older responses can overwrite newer results.
- **Severity:** Medium
- **Sources:** adversarial-review (M4)
- **Status:** Not Fixed
- **Files:** frontend/src/pages/analyze/components/ReverseCalculatorModal.tsx

### F12: Charts lack accessible labeling
- **What:** No `aria-label`, `aria-describedby`, or hidden text summaries on analysis charts.
- **Severity:** Medium
- **Sources:** adversarial-review (M3)
- **Status:** Not Fixed

---

## 8. Backend Quality

### BQ1: Blocking I/O in async SSE route
- **What:** SSE endpoint is `async def` but calls sync `urlopen()`, sync `httpx.Client()`. During a Bricked call (15-30s), ALL async operations on that worker freeze.
- **Severity:** Critical (at scale)
- **Sources:** codex-structural-audit (Finding 6)
- **Status:** Fixed — commit `46437fb` (wrapped in asyncio.to_thread or used async clients)

### BQ2: Reverse calculator accepts nonsensical inputs
- **What:** Negative targets, zero-down CoC, zero-term loans all accepted. Generate false "feasible" answers or divide-by-zero.
- **Severity:** Critical (Financial)
- **Sources:** adversarial-review (C1)
- **Status:** Fixed — commit `860943d`

### BQ3: PDF/DOCX processing broken by extractor refactor
- **What:** Extractor returns `ExtractionResult` object but processor calls `.strip()` on it. PDF/DOCX uploads fail before AI analysis.
- **Severity:** High
- **Sources:** adversarial-review (H6)
- **Status:** Fixed — commit `860943d`

### BQ4: Skip trace UI doesn't satisfy backend schema
- **What:** Frontend omits `compliance_acknowledged`. Backend rejects without it. Single-trace 422s every time.
- **Severity:** High
- **Sources:** adversarial-review (H8)
- **Status:** Fixed — commit `b1e35e9`

### BQ5: Chunker produces oversized chunks on text without punctuation
- **What:** `_split_sentences()` returns full text as single element when no sentence boundaries exist. No hard-split fallback.
- **Severity:** Medium
- **Sources:** codex-structural-audit (Finding 8)
- **Status:** Fixed — commit `46437fb`

### BQ6: random.py shadows stdlib
- **What:** `/parcel-platform/random.py` shadows Python's `random` module when running from repo root.
- **Severity:** Medium
- **Sources:** codex-structural-audit (Finding 9)
- **Status:** Fixed — commit `46437fb`

### BQ7: Alembic migration not idempotent
- **What:** Partial unique index migrations assume pristine data and first-try success. Can fail on retry or real data.
- **Severity:** Security
- **Sources:** adversarial-review (S4)
- **Status:** Not Fixed
- **Files:** backend/alembic/versions/ (multiple migration files)

### BQ8: Background job worker health unknown
- **What:** No health endpoint for Dramatiq worker. Jobs can be enqueued to Redis but never consumed if worker isn't running.
- **Severity:** Low (now that Redis is configured)
- **Sources:** codex-structural-audit (Finding 7)
- **Status:** Not Fixed
- **Files:** backend/core/tasks/__init__.py

### BQ9: Documents upload returns 500 in production
- **What:** Direct authenticated `POST /api/v1/documents/` returns 500. Browser shows CORS failure / TypeError. The upload path has no exception guard around storage/DB/queue dispatch. Likely caused by S3/R2 storage misconfiguration or the DOCX/PDF extractor bug (BQ3), but the endpoint doesn't surface which.
- **Severity:** Critical — **LAUNCH BLOCKER**
- **Sources:** pre-launch-product-audit (Finding 15)
- **Status:** Not Fixed — BQ3 (extractor) was fixed in code but production may still have storage config issues
- **Files:** backend/routers/documents.py (lines 40-125), backend/core/storage/s3_service.py (lines 30-47)

### BQ10: Skip tracing returns 500 in production when BatchData is missing
- **What:** Despite the provider having a graceful failure path, live `POST /api/skip-tracing/trace` returns 500. The frontend shows CORS errors for history. The page still looks like a usable surface.
- **Severity:** High
- **Sources:** pre-launch-product-audit (Finding 17)
- **Status:** Not Fixed
- **Files:** backend/routers/skip_tracing.py (lines 51-96, 217-245), backend/core/skip_tracing/batchdata_provider.py

---

## 9. Landing Page & Marketing

### LP1: Landing page redesign deferred
- **What:** Extensive research completed (hero spec, design references, creative research, 5 pricing deep-dives). Implementation deferred until product fixes are done.
- **Severity:** N/A
- **Sources:** hero-implementation-spec, hero-section-creative-research, landing-page-design-decisions, design-reference-audit
- **Status:** Research complete, implementation deferred per Ivan's decision
- **Key decisions made:**
  - Product screenshots only (no stock photos)
  - "One address. Every angle." or "Five strategies. One address. Under a minute." headline
  - All-dark design (no light sections)
  - Fey.com-inspired hero with glass panels + ambient glow

### LP2: Landing page has placeholder "coming soon" content in production
- **What:** The first page a prospect sees includes "Dashboard preview coming soon" and repeated "Screenshot coming soon." Makes the live site feel unfinished immediately.
- **Severity:** Medium
- **Sources:** pre-launch-product-audit (Finding 2)
- **Status:** Not Fixed
- **Files:** frontend/src/components/landing/HeroSection.tsx (lines 282-289), frontend/src/components/landing/FeatureSection.tsx (lines 64-67)

### LP3: Pricing page shows different info than landing page and backend
- **What:** Three sources of pricing truth disagree. Same as B1 above.
- **Severity:** Critical
- **Sources:** adversarial-review (F5), pricing-strategy-research, pre-launch-product-audit (Finding 18)

---

## 10. Integrations

### I1: Bricked API key not configured + degradation not surfaced
- **What:** `BRICKED_API_KEY=` (empty) in backend/.env. Analysis lacks ARV/repair cost data. Backend correctly degrades (sends `enrichment_update` with `bricked_status: failed`), but the frontend does not handle the `enrichment_update` SSE event at all. Even once the bigger SSE issues are fixed, users still won't see Bricked-degraded status.
- **Severity:** Medium
- **Sources:** core-ux-investigation (Issue 2), pre-launch-product-audit (Finding 25)
- **Status:** Not Fixed (needs API key purchase ~$49/mo + frontend event handler)
- **Files:** backend/.env, frontend/src/pages/analyze/AnalyzePage.tsx (lines 131-168)

### I2: Unconfigured features show broken states instead of "Coming Soon"
- **What:** Skip tracing, mail campaigns, and sequences all depend on external services (BatchData, Lob, Twilio, SendGrid). When keys aren't configured: skip tracing returns 500 + CORS errors, sequences expose the full UI with failure deferred to background processing, mail campaigns show normal UI but backend returns 402. None show a clear "Coming Soon" or "Not configured" message.
- **Severity:** High
- **Sources:** Ivan's decision, pre-launch-product-audit (Findings 17, 21, 22)
- **Status:** Not Fixed
- **Files:** Multiple pages (skip-tracing, sequences, mail-campaigns)

---

## 11. Testing & CI

### T1: No CI step runs tsc --noEmit
- **What:** TypeScript errors accumulate silently. Vite builds pass regardless.
- **Severity:** Medium
- **Sources:** codex-structural-audit (Finding 1)
- **Status:** Not Fixed (errors were cleaned up but no CI enforcement added)

### T2: No test for text without punctuation in chunker
- **What:** 7 test cases exist but none cover the oversized-chunk edge case.
- **Severity:** Low
- **Sources:** codex-structural-audit (Finding 8)
- **Status:** Fixed — commit `46437fb`

---

## 12. Deployment & Infrastructure

### D1: strftime("%-d") may crash on Railway Linux
- **What:** Platform-dependent format specifier in today.py:96. Works on macOS, may fail on Linux.
- **Severity:** Low
- **Sources:** core-ux-investigation (Issue 1, secondary cause)
- **Status:** Not Fixed
- **Files:** backend/routers/today.py (line 96)

### D2: Vercel config lacks security headers
- **What:** No X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Cache-Control for assets.
- **Severity:** Medium
- **Sources:** seo-audit
- **Status:** Not Fixed
- **Files:** frontend/vercel.json

### D3: Mixed-content API requests break multiple production pages — PRODUCTION EMERGENCY
- **What:** `/today`, `/properties`, `/reports`, `/sequences`, and `/mail-campaigns` all make `http://api.parceldesk.io/...` requests from an `https://www.parceldesk.io` origin. Browsers block these as mixed content. Pages either half-render, show generic errors, or show false empty states (see P15). The checked-in frontend source at `api.ts:36-37` appears to guard against this by forcing HTTPS on non-local URLs, so the bug is likely in the deployed env/build configuration (e.g., `VITE_API_URL` set to `http://` in production, or a stale deploy).
- **Severity:** Critical — **PRODUCTION EMERGENCY**
- **Sources:** pre-launch-product-audit (Finding 11)
- **Status:** Not Fixed — actively breaking 5+ pages RIGHT NOW in production
- **Files:** frontend/src/lib/api.ts (lines 36-37), production environment variables

### D4: Stripe checkout is in TEST MODE in production
- **What:** Live Stripe checkout page shows `TEST MODE` label. If a user enters real card details in test mode, the charge isn't real but the UX is confusing and unprofessional. If test mode is intentional (pre-launch), the pricing page should say so.
- **Severity:** High
- **Sources:** pre-launch-product-audit (Finding 18)
- **Status:** Not Fixed — production Stripe configuration
- **Files:** backend/.env (Stripe keys), backend/core/billing/stripe_service.py

---

# PART 2: LONG-TERM FIX PLAN

The principle: do each fix properly so it never needs to be revisited. Dependencies matter. Ordering matters. No band-aids.

---

## Phase -1: Production Emergency — Mixed Content (DO FIRST)
**Why before everything else:** This is actively breaking 5+ pages in production RIGHT NOW. Every other fix is pointless if authenticated pages can't load data.

**What to do:**
1. Verify the `VITE_API_URL` environment variable in the Vercel production deployment — it must be `https://api.parceldesk.io`, not `http://`
2. If it's already correct, check for a stale deploy — the `api.ts` HTTPS guard may not be in the deployed bundle
3. Trigger a fresh Vercel deploy from the current commit
4. Verify in browser DevTools that all API requests go to `https://`
5. While you're in production env vars: swap the Clerk development publishable key for a production key

**Acceptance criteria:**
- Zero mixed-content warnings in browser console on `/today`, `/properties`, `/reports`, `/sequences`, `/mail-campaigns`
- All authenticated API requests use `https://api.parceldesk.io`
- No Clerk development-key warning in production console

**Dependencies:** None
**Complexity:** Very low — likely a single env var fix + redeploy
**Scope boundaries:** Only fix the URL protocol issue and Clerk key. Do NOT change any source code in this phase.

---

## Phase 0: Auth Cleanup (PREREQUISITE)
**Why first:** Every other fix touches authenticated code paths. If auth is half-Clerk-half-legacy, you'll build fixes on a fractured foundation. Clean this up once, completely, before touching anything else.

**What to do:**
1. Remove all legacy JWT/cookie authentication code (login, register, refresh, cookie-setting endpoints)
2. Remove `verify_password`, `create_access_token`, `create_refresh_token` from jwt.py
3. Remove cookie-based auth from `get_current_user()` — Clerk Bearer only
4. Remove legacy auth routes from auth.py (keep profile read/update)
5. Remove `password_hash` from User model (or mark it as deprecated/unused)
6. Add `CLERK_JWT_AUDIENCE` as a required env var (fail closed)
7. Remove `geoalchemy2` from requirements.txt if geospatial features aren't used
8. Clean up `Property.location` conditional column

**Acceptance criteria:**
- `get_current_user()` accepts only Clerk Bearer tokens
- No code references `access_token` cookie or `refresh_token` cookie
- App works end-to-end with Clerk-only auth
- `geoalchemy2` removed from requirements.txt, `Property.location` removed from model

**Dependencies:** Phase -1 (production needs to load first)
**Complexity:** Medium — mostly deletion, but need to verify every auth touchpoint
**Scope boundaries:** Do NOT add new auth features (MFA, session management). Just remove legacy code.

---

## Phase 1: Analysis Flow — Make It Work
**Why second:** The core product loop is completely broken. The SSE analysis flow hangs, Save/Pipeline are fake, and there's no error recovery. Nothing else matters if users can't analyze a property.

**What to do:**
1. Fix the SSE detached-object serialization bug — ensure `PropertyResponse.model_validate()` operates on an attached or properly-serialized object, not an expunged ORM instance
2. Add SSE error recovery — when backend emits an `error` event, the frontend should exit loading state, show a readable message, and offer a "Try Again" button (or fall back to the non-stream `POST /api/analysis/quick` path)
3. Sanitize backend SSE error messages — never send `str(e)`, map to user-friendly messages
4. Wire the Save button to actually create a Deal via the API (status: "draft")
5. Wire the Pipeline button to create a Deal + add a pipeline entry, then navigate to `/pipeline`
6. Auto-create Deal on analysis completion (status: "draft", no pipeline entry) — so P4 is also addressed
7. Handle the `enrichment_update` SSE event in the frontend so Bricked degradation is visible

**Acceptance criteria:**
- Full SSE analysis flow completes successfully for a valid US address
- If SSE fails, user sees a single readable error sentence and a "Try Again" button — never raw exceptions
- "Save" creates a real Deal in the database; button state persists across page loads
- "Pipeline" creates a Deal + pipeline entry and navigates to pipeline with the new card visible
- After analysis, the deal appears in dashboard "Total Deals" and activity feed

**Dependencies:** Phase 0 (clean auth for API calls)
**Complexity:** High — touches SSE stream, ORM session management, frontend event handling, deal creation, navigation
**Scope boundaries:** Do NOT add address autocomplete yet (that's Phase 3). Do NOT refactor the SSE architecture. Just fix the current flow.

---

## Phase 2: Financial Accuracy
**Why third:** Parcel is an underwriting tool. The analysis flow now works (Phase 1), but if the numbers it shows are wrong, users making $200K decisions will lose trust permanently.

**What to do:**
1. Fix CashFlowChart creative-finance projection — use `monthly_payment` instead of inferring from residual; keep fixed debt flat while growing expenses
2. Fix CashFlowBreakdown — pass `monthly_expenses` into creative-finance breakdown
3. Fix BreakEvenChart — extend horizon to computed break-even month, show "Never breaks even" state
4. Add `debt_yield` back to buy-and-hold KeyMetrics (or remove from backend if intentionally dropped)
5. Fix reverse calculator race condition — use AbortController or monotonic request ID
6. Fix billing copy to match backend truth — pricing page features, limits, and prices must match `tier_config.py` exactly

**Acceptance criteria:**
- Creative-finance 30-year projection with a fixed $1,600/mo payment shows a flat debt line, not a growing one
- CashFlowBreakdown bars sum to `monthly_rent - monthly_cash_flow` for all strategies
- BreakEvenChart shows an explicit state for never-break-even deals
- All forward calculators' outputs match what the UI shows (snapshot test)
- Pricing page feature lists, limits, and prices match `tier_config.py` exactly — zero discrepancies

**Dependencies:** Phase 1 (analysis flow must work to verify financial accuracy)
**Complexity:** Medium — the math is known, implementation is changing how outputs are assembled
**Scope boundaries:** Do NOT refactor calculators or change calculation formulas. Only fix how outputs are rendered and projected.

---

## Phase 3: Core Product Loop Completion
**Why fourth:** The analysis works and the numbers are right. Now make the rest of the product loop functional: users need to find past work, the Today page needs to not crash, and address entry needs to not fail.

**What to do:**
1. Make dashboard activity items clickable — route to `/analyze/results/${property_id}` or `/analyze/deal/${deal_id}` based on entity_type
2. Add "Recent Analyses" card to dashboard showing last 5 analyzed properties
3. Wrap Today page sub-builders in individual try/except — skip failed sections, show what works
4. Fix false empty states — Reports, Sequences, Mail Campaigns, Skip Tracing must distinguish "no data" from "request failed" and show error state on failure
5. Add Google Places autocomplete to the analyze page address input
6. Fix AI chat — add timeout around Anthropic streaming, show error state on failure, don't persist orphaned user messages
7. Fix PDF generation — verify Playwright + worker are running, add timeout and failure state
8. Fix auth/onboarding routing — standardize post-login destination, don't silently bypass onboarding on fetch failure

**Acceptance criteria:**
- Dashboard activity items navigate to the correct analysis results page
- Today page loads even if one sub-builder fails — shows partial content + "Some sections unavailable"
- Reports/Sequences/Mail/SkipTracing pages show error UI (not empty state) when API request fails
- Address input has Google Places autocomplete with full address selection
- AI chat either streams a response within 30s or shows "Something went wrong — try again"
- PDF generation either completes within 60s or shows "Generation failed" with retry

**Dependencies:** Phase 1 (analysis flow), Phase 2 (financial accuracy)
**Complexity:** Medium-high — touches backend + frontend, multiple files
**Scope boundaries:** Do NOT add new dashboard widgets or change the sidebar IA. Just fix existing flows.

---

## Phase 4: Legal & Compliance Gaps
**Why fifth:** Before any marketing drives traffic, legal bases must be covered.

**What to do:**
1. Create `/privacy` and `/terms` pages (can be static renders of the LEGAL/ markdown files)
2. Fix landing page footer links — point to actual `/privacy` and `/terms` routes instead of `#`
3. Add TOS acceptance checkbox to registration (per COMPLIANCE-COPY.md)
4. Implement cookie consent banner (per COMPLIANCE-COPY.md — Accept / Essential only)
5. Build account deletion flow in Settings (per COMPLIANCE-COPY.md dialog copy)
6. Add direct mail compliance checkbox (if not already implemented)

**Acceptance criteria:**
- `/privacy` and `/terms` render the full policy text and are publicly accessible
- Footer links on all public pages go to real URLs
- Registration fails without TOS acceptance checkbox
- Cookie banner appears on first visit, analytics cookies deferred until "Accept"
- Account deletion: user confirms → backend soft-deletes → confirmation email

**Dependencies:** Phase 0 (auth cleanup — deletion flow needs Clerk user handling)
**Complexity:** Medium
**Scope boundaries:** Do NOT build a GDPR data export feature. Keep cookie consent to essential/all toggle.

---

## Phase 5: Billing & Feature Gate Fixes
**Why sixth:** Once the product works and legal is covered, billing needs to be truthful before any user hits checkout.

**What to do:**
1. Either configure Stripe for real 7-day free trial (no card required) or remove trial copy everywhere
2. Switch Stripe from test mode to live mode (or add clear "Beta — test mode" messaging if intentional)
3. Add tier gate to mail campaigns page — Carbon users should see "Upgrade to Titanium" not the full UI
4. Add tier gate to sequences page with provider-readiness check
5. Fix trial banner day calculation — use `Math.floor` or round correctly for "7 days"
6. Fix PlanBadge upgrade link — point to `/pricing` not `/settings`
7. Add upgrade/manage CTA to billing settings during trial
8. Fix campaign background task — don't mark campaign "sent" if all/most recipients failed

**Acceptance criteria:**
- Stripe checkout matches pricing page copy exactly (trial or no trial, price, plan name)
- Mail campaigns page shows upgrade prompt for non-Titanium users
- Trial banner shows correct day count
- "Upgrade" links go to `/pricing`
- A campaign where 100% of recipients fail shows status "failed", not "sent"

**Dependencies:** Phase 2 (pricing copy accuracy), Phase 4 (legal — TOS must be linked before checkout)
**Complexity:** Medium
**Scope boundaries:** Do NOT restructure the tier system or drop Plus yet. Just make what exists truthful.

---

## Phase 6: SEO & Public Presence
**Why seventh:** Product works, legal is covered, billing is truthful. Now make public pages discoverable.

**What to do:**
1. Fix og:description — replace dev jargon with user-facing value prop
2. Create robots.txt (block authenticated routes, allow public ones)
3. Create sitemap.xml (landing, login, register, pricing, privacy, terms)
4. Add canonical URLs and Twitter meta tags to index.html
5. Install react-helmet-async + add per-page titles for all public pages
6. Move /pricing out of ProtectedRoute
7. Add JSON-LD structured data (SoftwareApplication + Organization — without fake reviews)
8. Update vercel.json with security headers and asset caching
9. Remove placeholder "coming soon" content from landing page

**Acceptance criteria:**
- Each public page has a unique `<title>` and `<meta description>`
- /pricing is accessible without authentication
- OG preview on Twitter/LinkedIn shows user-facing description
- Lighthouse SEO score > 90
- No "Screenshot coming soon" text visible on the production landing page

**Dependencies:** Phase 4 (TOS/privacy pages must exist before sitemap), Phase 5 (/pricing must be truthful before making it public)
**Complexity:** Low-medium
**Scope boundaries:** Do NOT build dynamic OG tags for share pages. Do NOT build a blog.

---

## Phase 7: Hardcoded Colors & Theme Consistency
**Why eighth:** The analysis surfaces are where users make decisions. Hardcoded dark-theme colors break light mode.

**What to do:**
1. Audit all analysis/property components for hardcoded hex colors
2. Replace with semantic CSS variables from index.css theme system
3. Verify both themes render correctly on: AnalysisResultsPage, PropertyDetailPage, BreakEvenChart, CashFlowChart, KeyMetrics, VerdictBadge

**Acceptance criteria:**
- Zero hardcoded hex colors in analysis components
- Both themes pass visual inspection on analysis results page
- Chart colors use chart-theme getter functions

**Dependencies:** Phase 2 (financial accuracy fixes may touch the same chart components)
**Complexity:** Low
**Scope boundaries:** Only fix analysis and property pages. Do NOT theme the entire app.

---

## Phase 8: Critical Mobile Fixes
**Why ninth:** Ivan specified "critical mobile fixes only."

**What to do:**
1. Fix dialog.tsx and alert-dialog.tsx — add `max-w-[calc(100vw-2rem)]` viewport clamp
2. Fix analysis results action bar — wrap buttons on mobile, use overflow menu or stacked layout
3. Fix AppShell topbar actions — ensure primary CTAs are accessible below sm breakpoint

**Acceptance criteria:**
- All dialogs render within viewport bounds on 375px screen
- Analysis results page action buttons are usable on a phone
- Primary CTAs on Properties and Contacts pages are accessible on mobile

**Dependencies:** Phase 1 (analysis page layout may change)
**Complexity:** Low-medium
**Scope boundaries:** Do NOT fix all 30+ mobile issues. Save the rest for a dedicated mobile pass.

---

## Phase 9: "Coming Soon" Gates & Unconfigured Services
**Why tenth:** Before marketing drives traffic, features depending on unconfigured services need clear messaging.

**What to do:**
1. Add env-var checks for BatchData, Lob, Twilio, SendGrid keys
2. When keys are missing, show "Coming Soon" placeholder on skip tracing, mail campaigns, and sequences pages
3. Ensure FeatureGate component gates by tier AND by service availability
4. Fix document upload 500 — diagnose whether it's storage config (S3/R2) or code, fix accordingly

**Acceptance criteria:**
- With empty `BATCHDATA_API_KEY`, skip tracing page shows "Coming Soon" not a broken form
- With empty `LOB_API_KEY`, mail campaigns page shows "Coming Soon"
- "Coming Soon" pages have a consistent design and don't look like errors
- Document upload works end-to-end or shows a clear error

**Dependencies:** Phase 0 (auth), Phase 5 (tier gates)
**Complexity:** Low-medium
**Scope boundaries:** Do NOT build configuration UIs. Just gate unconfigured features.

---

## Phase 10: Backend Housekeeping
**Why last:** Real issues but don't affect UX directly.

**What to do:**
1. Add `tsc --noEmit` to CI pipeline
2. Fix `strftime("%-d")` platform-dependent format in today.py
3. Make Alembic migrations idempotent (conditional index creation, preflight cleanup)
4. Add worker health endpoint (`/health/worker`)
5. Install `svix` as runtime dependency for Clerk webhook verification (if not already done)

**Acceptance criteria:**
- CI fails on TypeScript type errors
- Today page loads on Railway Linux without strftime crash
- `alembic upgrade head` succeeds on retry
- `/health/worker` returns status of Dramatiq broker

**Dependencies:** None (can be done in parallel with other phases)
**Complexity:** Low
**Scope boundaries:** Do NOT refactor the migration system. Do NOT add comprehensive monitoring.

---

## Deferred Work (Not In This Plan)

| Item | Why deferred |
|------|-------------|
| Landing page redesign (hero, sections, screenshots) | Research is complete. Wait until product is solid. Ivan's decision. |
| Full mobile responsiveness pass (all 30+ issues) | Only critical mobile fixes now. Proper mobile pass is a dedicated sprint. |
| Dynamic OG tags for share pages | Requires Vercel Edge Functions. Low impact vs effort. |
| Bricked API integration | Needs API key purchase. Analysis works without it (missing ARV/repair data). |
| Blog / content pages | No content exists yet. SEO foundations first. |
| 3-tier pricing simplification | Decision made (drop Plus, keep Free/Pro/Business). Implementation is a pricing page + backend cleanup task. Do this as a deliberate marketing move, not mid-fix. |
| Interactive product demo on landing page | Weeks of work. Ship the product first. |
| Full accessibility audit | Charts need aria-labels. Save for a dedicated a11y sprint. |
| Business tier margin fix | Structural pricing problem, not a code fix. Needs unit economics analysis. |

---

## Opinion: What The Audits Got Wrong (and Right)

1. **The pre-launch audit's #1 recommendation is correct and the most important thing in this document:** Disable SSE in the UI and use the working non-stream `POST /api/analysis/quick` path as the shortest path to a functional product. If the SSE serialization bug is deep, this is the right call. However, the proper fix (Phase 1) should fix the SSE path rather than permanently abandoning it, because streaming gives users real-time feedback during a 10-15 second operation.

2. **The pre-launch audit elevated "fake Save/Pipeline" to Critical.** I agree completely — this was missed by every other audit. A user clicking "Save" and believing their work is persisted when it isn't is a trust-destroying bug. It belongs in Phase 1 alongside the SSE fix.

3. **The SEO audit recommends `react-helmet-async` for per-page titles.** This is correct but borderline overkill for a SPA with 5 public pages. A simpler alternative: a `useDocumentTitle(title)` hook. However, `react-helmet-async` is the right choice if you also need per-page canonical URLs and meta descriptions (which you do for SEO), so the recommendation stands.

4. **The mobile audit flags 30+ issues.** Ivan is right to defer. The critical fixes (dialogs, analysis action bar, AppShell CTAs) cover 80% of the mobile pain.

5. **The pricing research recommends dropping Plus.** I agree but the timing matters. Don't change pricing during a fix sprint. Ship product fixes first, then make the pricing change as a deliberate marketing move.

6. **The pre-launch audit found that false empty states are pervasive (Reports, Sequences, Mail Campaigns, Skip Tracing).** This is a systemic frontend pattern issue — these pages all use the same pattern of checking `data.length === 0` without first checking `isError`. This should be fixed as a pattern (shared hook or utility), not one page at a time.

7. **Nobody before the pre-launch audit caught the mixed-content issue.** This is because the other audits were code-only reviews, not live production walkthroughs. The pre-launch audit's methodology (live customer walkthrough + code trace) found things that static analysis missed. This is a strong argument for live production testing as part of every audit.

8. **The biggest actual risk, now that the pre-launch audit exists:** The product has 6 launch blockers (mixed content, SSE hang, fake Save/Pipeline, billing dishonesty, document upload 500, plus the false empty states masking real failures). The previous plan's Phase 0-2 prioritized auth cleanup and financial accuracy — important but not the right order when the core loop is broken in production. The revised plan now puts "make the product work at all" (Phase -1 and Phase 1) before "make the numbers right" (Phase 2).
