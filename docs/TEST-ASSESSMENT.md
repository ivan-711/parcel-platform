# Parcel Platform -- Test Coverage Assessment

Generated: 2026-04-12

---

## 1. Test Inventory

### 1.1 Frontend Tests (5 files, 42 test cases)

All tests live in `frontend/src/__tests__/`.

| File | What it tests | Test cases | Status |
|------|---------------|------------|--------|
| `schemas.test.ts` | Zod validation schemas for all 5 deal strategies (wholesale, buyAndHold, creativeFinance, flip, brrrr) -- valid inputs, missing fields, negative values, boundary values | 11 | PASS |
| `utils.test.ts` | Formatting utilities in `lib/format.ts` -- formatCurrency, formatPercent, formatLabel, formatOutputValue, formatFileSize -- null/undefined handling, negative values, domain overrides | 19 | PASS |
| `components.test.tsx` | KPICard (value rendering, delta arrows, loading skeleton), StrategyBadge (all 5 strategy labels), SkeletonCard (line count, defaults) | 8 | 1 FAIL |
| `hooks.test.ts` | `useCountUp` custom hook -- rAF animation from 0 to target, midpoint easing, different targets | 2 | PASS |
| `integration.test.tsx` | NotFound page -- renders 404 text, dashboard link | 1 | PASS |

**Failed test:** `components.test.tsx > KPICard > shows negative delta with down arrow` -- expects `text-[#D4766A]` class but component now uses semantic token `text-loss`. The test is stale after a design system migration to semantic color tokens.

### 1.2 Frontend Test Infrastructure

- **Framework:** Vitest with jsdom environment (`vitest.config.ts`)
- **Setup:** `src/test/setup.ts` provides:
  - `@testing-library/jest-dom` matchers
  - Mock `IntersectionObserver` (not in jsdom)
  - Mock `ResizeObserver` (not in jsdom)
  - Mock `matchMedia` (not in jsdom)
- **Rendering:** `@testing-library/react` for component rendering
- **Mocks:** `useCountUp` hook is mocked in component tests for deterministic values
- **No E2E framework** detected (no Playwright or Cypress config)

### 1.3 Backend Tests (12 test files, 170 test cases)

All tests live in `backend/tests/`.

| File | What it tests | Test cases | Status |
|------|---------------|------------|--------|
| `test_calculators.py` | All 5 deal calculators (wholesale, flip, buy_and_hold, brrrr, creative_finance) + risk score engine -- formulas, recommendations, edge cases, bounds | 19 | COLLECTED |
| `test_analysis.py` | Quick analysis endpoint, address parser (8 tests), AI narrator behavior, SSE streaming, calculate endpoint, data source event logging | 30 | COLLECTED |
| `test_api.py` | Deal lifecycle (create, retrieve, list, soft-delete) + pipeline lifecycle (add, move stage, board state) | 5 | COLLECTED |
| `test_auth.py` | Current user profile (`/auth/me`), 401 without auth, legacy endpoints removed (register, login, refresh, logout return 404) | 6 | COLLECTED |
| `test_chunker.py` | Document text chunker -- empty input, short/long text, sequential indices, content preservation, overlap, metadata | 7 | COLLECTED |
| `test_demo_chat.py` | Demo user detection, reserved email guard, chat fixture loading, seeded history stability, demo vs normal chat persistence, SSE streaming for demo, email reservation enforcement | 20 | COLLECTED |
| `test_financing.py` | FinancingInstrument model CRUD, self-referential FK (wrap-to-underlying), obligation auto-generation (monthly, balloon, insurance, lease option, ARM), Payment model (split, incoming, late), wrap spread calculator, _add_months helper | 21 | COLLECTED |
| `test_financing_api.py` | Financing CRUD API (instruments, obligations, payments), dashboard endpoint, today integration, amortization calculator, RLS user isolation | 28 | COLLECTED |
| `test_onboarding.py` | Sample deal definitions, persona selection (valid/invalid, all 8 personas), onboarding status before/after, sample data clearing, auto-archive on 3rd real property | 19 | COLLECTED |
| `test_properties.py` | Property detail endpoint, scenario listing, new scenario creation, duplicate scenario handling, 404 for nonexistent | 5 | COLLECTED |
| `test_rag_retrieval.py` | Reciprocal Rank Fusion logic -- empty inputs, single list, boost for chunks in both lists, deduplication, all unique chunks preserved | 5 | COLLECTED |
| `test_reports.py` | Report data snapshot structure, None handling, share token uniqueness, PDF status derivation, property address extraction | 5 | COLLECTED |

**Note:** Backend tests could not be executed (`python3 -m pytest` not available in current environment due to missing pytest module in system Python). Tests were collected by reading the source. Based on `__pycache__` presence with `pytest-9.0.2` stamps, these tests have been run previously.

### 1.4 Backend Test Infrastructure

- **Framework:** pytest (configured via `pytest.ini`)
- **Database:** In-memory SQLite with PostgreSQL dialect compatibility patches (UUID, JSONB type compilers)
- **Fixtures** (`conftest.py`):
  - `setup_database` (autouse) -- creates/drops all tables per test
  - `db` -- clean SQLAlchemy session
  - `client` -- FastAPI TestClient wired to test DB
  - `test_user` -- pre-inserted user with Clerk ID
  - `auth_client` -- TestClient with `get_current_user` overridden (bypasses Clerk JWT)
- **Test fixtures directory:** `backend/fixtures/demo_chat.json` (seeded demo conversations)
- **Mocking pattern:** `unittest.mock.patch` for external services (RentCast, AI narrator)
- **Filter warnings:** DeprecationWarning and SAWarning suppressed

---

## 2. Coverage Gaps -- Critical Paths

### 2.1 Authentication Flow

| Aspect | Tested? | Details |
|--------|---------|---------|
| Clerk JWT validation | PARTIAL | `test_auth.py` verifies `/auth/me` returns 401 without auth and 200 with auth. Auth is bypassed via dependency override in tests -- actual Clerk token validation is not tested. |
| Token refresh | NO | Clerk handles this client-side; no backend test exists. |
| Session management | NO | ClerkProviderWrapper and AuthSyncProvider have zero component tests. |
| Legacy endpoint removal | YES | Confirms register/login/refresh/logout return 404. |

### 2.2 Stripe Checkout and Billing

| Aspect | Tested? | Details |
|--------|---------|---------|
| Stripe checkout session creation | **NO** | `backend/core/billing/stripe_service.py` has zero tests. |
| Webhook handling | **NO** | `backend/routers/billing.py` has zero tests. |
| Subscription lifecycle | **NO** | No tests for create/update/cancel subscription. |
| Tier gating | **NO** | `backend/core/billing/tier_gate.py` and `tier_config.py` untested. |
| Frontend billing components | **NO** | `PaywallOverlay`, `TrialBanner`, `UsageMeter`, `PlanBadge`, `SuccessOverlay`, `LimitReachedModal`, `FeatureGate` -- all untested. |
| `useBilling` hook | **NO** | Zero tests. |

### 2.3 Property Analysis Pipeline

| Aspect | Tested? | Details |
|--------|---------|---------|
| Address parsing | YES | 8 test cases covering full/partial/minimal/empty addresses, state names, abbreviations. |
| RentCast enrichment | YES | Mocked -- success, failure, timeout, partial data scenarios. |
| Calculators (all 5) | YES | 19 tests covering formulas, edge cases, recommendations. |
| Risk scoring | YES | 7 tests -- all strategies, bounds, strong/bad deals, unknown strategy. |
| AI narrative generation | YES | 5 tests via mocks -- assumptions, risks, missing data, failure graceful handling. |
| SSE streaming | YES | 3 tests -- event order, provider failure, bad address. |
| Calculate endpoint (stateless) | YES | 4 tests -- buy_and_hold, wholesale, invalid strategy, no DB records created. |

### 2.4 Deal CRUD Operations

| Aspect | Tested? | Details |
|--------|---------|---------|
| Create deal | YES | Via calculator endpoint in `test_api.py`. |
| Read deal by ID | YES | Persistence and retrieval verified. |
| List deals | YES | Includes primary metric label check. |
| Soft-delete | YES | Confirms deal hidden from list after delete. |
| Update deal | **NO** | No test for PATCH/PUT deal updates. |

### 2.5 Document Upload and Processing

| Aspect | Tested? | Details |
|--------|---------|---------|
| Document upload endpoint | **NO** | `routers/documents.py` has zero API tests. |
| PDF text extraction | **NO** | No tests. |
| Text chunking | YES | 7 tests for the chunker utility itself. |
| Vector embedding storage | **NO** | No tests. |
| RAG retrieval | YES | 5 tests for RRF fusion logic. |

### 2.6 AI Chat Streaming

| Aspect | Tested? | Details |
|--------|---------|---------|
| Chat message persistence | YES | Demo vs. normal user persistence verified. |
| Chat history retrieval | YES | Demo seeded history vs DB-backed history. |
| Streaming response | PARTIAL | Mocked `stream_chat_response`; actual Claude API call not tested. |
| Context injection (RAG) | **NO** | No tests for property-contextual chat. |
| Citation generation | **NO** | CitationBadge component untested. |

### 2.7 Pipeline / Kanban Operations

| Aspect | Tested? | Details |
|--------|---------|---------|
| Add deal to pipeline | YES | `test_api.py` covers full lifecycle. |
| Move stage | YES | Verified stage transition and board state. |
| Board structure | YES | All 7 stages verified. |
| Reorder within stage | **NO** | No drag-and-drop position tests. |
| Pipeline frontend components | **NO** | kanban-column, DealSidePanel, mobile-pipeline untested. |

### 2.8 PDF Report Generation

| Aspect | Tested? | Details |
|--------|---------|---------|
| Report data snapshot | YES | Structure and None handling verified. |
| Share token generation | YES | Uniqueness verified. |
| PDF status derivation | YES | None/ready states verified. |
| Actual PDF rendering | **NO** | No tests for `lib/pdf-report.ts` or S3 upload. |
| Report CRUD endpoints | **NO** | Create, list, share, delete report API endpoints untested. |

---

## 3. Coverage by Area

### 3.1 Frontend Components

- **Total component files:** 109
- **Components with tests:** 3 (KPICard, StrategyBadge, SkeletonCard)
- **Coverage:** ~2.8%

Major untested component categories:
- Billing (6 components): PaywallOverlay, TrialBanner, UsageMeter, PlanBadge, SuccessOverlay, LimitReachedModal, FeatureGate
- Charts (8 components): CashFlowProjection, Sparkline, AnimatedNumber, ComparisonRadar, etc.
- Landing page (11 components): HeroSection, PricingSection, CTASection, etc.
- Pipeline (5 components): kanban-column, DealSidePanel, mobile-pipeline, etc.
- Documents (4 components): upload-zone, document-list, document-detail, processing-steps
- Chat (3 components): ChatPanel, ChatSlideOver, CitationBadge
- All form modals: AddBuyerModal, ContactModal, CreatePacketModal, etc.

### 3.2 Frontend Pages

- **Total page files:** 60
- **Pages with tests:** 1 (NotFound)
- **Coverage:** ~1.7%

### 3.3 Frontend Hooks

- **Total hook files:** 23
- **Hooks with tests:** 1 (useCountUp)
- **Coverage:** ~4.3%

Untested hooks include all data-fetching hooks: useDeals, useProperties, useBilling, useFinancing, usePortfolio, useTasks, useContacts, useCommunications, useDocumentStatus, useToday, useAuth, usePlacesAutocomplete, and others.

### 3.4 Frontend Lib Utilities

- **Total lib files:** 11
- **Libs with tests:** 2 (format.ts, schemas.ts)
- **Coverage:** ~18.2%

Untested: api.ts, chat-stream.ts, pdf-report.ts, chart-theme.ts, theme.ts, motion.ts, strategy-kpis.ts, maps-config.ts

### 3.5 Backend Routers

- **Total router files:** 30
- **Routers with test coverage:** 11
  - analysis, auth, chat, deals, financing, onboarding, pipeline, properties, reports, today, calculators
- **Routers with ZERO test coverage:** 19
  - activity, billing, buyers, clerk_webhooks, communications, contacts, dashboard, dispositions, documents, mail_campaigns, portfolio, portfolio_v2, rehab, sequences, service_status, settings, skip_tracing, tasks, transactions
- **Coverage:** ~36.7%

### 3.6 Backend Calculators

- **Total calculator files:** 8 (excluding __init__.py)
- **Calculators with tests:** 6 (wholesale, flip, buy_and_hold, brrrr, creative_finance, risk_score)
- **Calculators without tests:** 2 (projections, reverse_valuation)
- **Coverage:** ~75%

### 3.7 Backend Core Modules

- **Billing** (5 files): 0% tested
- **AI** (narrator, rag_retrieval): RAG fusion tested; narrator tested via integration mocks
- **Financing** (obligation_engine, wrap_calculator, amortization): 100% tested
- **Documents** (chunker): Tested; other document processing untested
- **Property data** (address_parser, providers): address_parser tested; RentCast mocked in integration tests
- **Demo** (demo user, chat_service): Thoroughly tested
- **Onboarding** (sample_deals): Thoroughly tested

---

## 4. Summary Table

| Area | Tests | Total items | Coverage |
|------|-------|-------------|----------|
| Frontend components | 3 | 109 | 2.8% |
| Frontend pages | 1 | 60 | 1.7% |
| Frontend hooks | 1 | 23 | 4.3% |
| Frontend lib utilities | 2 | 11 | 18.2% |
| Backend routers | 11 | 30 | 36.7% |
| Backend calculators | 6 | 8 | 75.0% |
| Backend test total | 170 cases | -- | -- |
| Frontend test total | 42 cases | -- | 41 pass, 1 fail |

---

## 5. Recommendations (Priority Order)

### P0 -- Revenue-Critical (add tests before launch)

1. **Stripe billing flow** -- Zero test coverage for the entire billing stack. This is the monetization path. Need tests for:
   - `stripe_service.py` (checkout session creation, subscription management)
   - `routers/billing.py` (API endpoints)
   - `core/billing/tier_gate.py` (feature gating logic)
   - Webhook handling (subscription.created, subscription.updated, invoice.paid, etc.)

2. **Clerk webhook handler** -- `routers/clerk_webhooks.py` has zero tests. This is how users are synced from Clerk to the database. A bug here means users cannot be created.

### P1 -- Data Integrity

3. **Document upload and processing** -- The upload-to-RAG pipeline has no end-to-end test. Chunker is tested in isolation, but the upload endpoint, PDF extraction, and vector storage are not.

4. **Deal update endpoint** -- Create, read, list, delete are tested; update is missing.

5. **Report CRUD endpoints** -- Only snapshot building is tested; actual create/list/share/delete API calls are untested.

### P2 -- User Experience

6. **Frontend billing components** -- PaywallOverlay, TrialBanner, and FeatureGate are user-facing gatekeepers. A rendering bug could block paying users or fail to block free users.

7. **Frontend data hooks** -- useDeals, useProperties, useBilling are the data backbone of the app. Even basic "renders without crash" tests would catch import/type errors.

8. **Fix the stale test** -- `components.test.tsx` line 50 expects hardcoded `text-[#D4766A]` but the component now uses `text-loss`. Update the assertion to match the semantic token.

### P3 -- Breadth Expansion

9. **Untested routers** (19 of 30) -- Prioritize by usage frequency:
   - contacts, tasks, dashboard, portfolio (daily-use features)
   - communications, sequences, mail_campaigns (engagement features)
   - skip_tracing, dispositions, buyers, rehab (specialized features)

10. **Calculator gaps** -- `projections.py` and `reverse_valuation.py` are untested. These are financial tools where correctness is critical.

11. **Frontend page-level tests** -- At minimum, "renders without crash" smoke tests for the top 5 pages: Dashboard, AnalyzePage, Pipeline, TodayPage, PropertyDetailPage.
