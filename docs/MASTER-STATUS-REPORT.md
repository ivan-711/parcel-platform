# Parcel Platform — Master Status Report

_Generated: 2026-04-12_
_Audit scope: Full codebase (frontend + backend + docs + infrastructure)_

---

## 1. Project Health Score

**Grade: B**

Parcel Platform is a feature-rich, well-architected product with a clean separation between frontend and backend, solid authentication via Clerk, correct SQL parameterization throughout, and zero hardcoded secrets. Code splitting, lazy loading, and design system discipline are all strong. The main drags on the score are: (1) low test coverage, especially zero tests for the entire Stripe billing stack that represents the monetization path; (2) 149 uncommitted files representing three features of unreplicated work; (3) a CRITICAL npm vulnerability in jspdf; and (4) application-level-only row-level security with no database enforcement. None of these are showstoppers for a launch, but items 1-3 should be resolved before sharing with investors or onboarding paying users.

---

## 2. What's in Great Shape

- **Authentication architecture** -- Clerk-only auth with RS256 JWT verification, proper JWKS rotation, issuer/audience checks, and Svix webhook signature validation. All legacy auth code has been cleanly removed. (Security Audit)
- **Zero hardcoded secrets** -- Every API key, token, and credential is loaded from environment variables. `.env` files are properly gitignored. `.env.example` uses placeholder values only. (Env Vars Reference, Security Audit)
- **Code splitting and lazy loading** -- All 48 frontend routes use `React.lazy()`. jsPDF (390 KB) is dynamically imported. Build produces 138 small JS chunks. 3.79s build time across 3,483 modules. (Performance Audit)
- **CSS discipline** -- Single 21 KB gzipped CSS file with proper Tailwind purging, dual-theme support via CSS variables, and a well-structured custom design system. Zero hardcoded colors remaining after the recent overhaul. (Performance Audit, SAD Manifest)
- **Console.log hygiene** -- Zero console statements in production source code. The only console.warn is gated behind a dev-only flag and tree-shaken from production builds. (Performance Audit)
- **SQL injection protection** -- All queries use SQLAlchemy ORM or parameterized `text()` queries. No string concatenation for user input in SQL. No `eval()`, `exec()`, `subprocess`, or `pickle` usage anywhere. (Security Audit)
- **Webhook security** -- Stripe, Clerk, Twilio, and SendGrid webhooks all use signature verification with timing-safe comparisons. Stripe includes idempotency checking. (Security Audit)
- **Pydantic validation** -- Every POST/PUT/PATCH endpoint uses Pydantic models for request body validation. (Security Audit)
- **Clean TODO inventory** -- Only 18 items total across the entire codebase. Zero FIXMEs, zero HACKs, zero commented-out code blocks. The two critical TODOs (PostgreSQL RLS, dual-write drift) are well-documented with clear remediation paths. (TODO Inventory)
- **Frontend routing** -- 48 routes with zero broken links, zero dead page files, proper auth guards (ProtectedRoute/GuestRoute), tier gating via FeatureGate, and service availability gating via ComingSoonGate. (Frontend Routes)
- **Design audit scores** -- Landing page: 38/40 (Excellent). App UI: 33.9/40 (Good), up from 28.2/40 after the 5-wave overhaul. (SAD Manifest)
- **Deploy checklist** -- DEPLOY-CHECKLIST.md is comprehensive, accurate, and the best-maintained operational document in the repo. (Docs Audit)
- **Legal compliance** -- Terms of Service, Privacy Policy, and Compliance Copy are current (effective April 6, 2026), properly covering skip tracing, communications, TCPA, CAN-SPAM, and CCPA. (Docs Audit, SAD Manifest)
- **Font loading** -- Self-hosted woff2 fonts with `font-display: swap`, preload links, and fallback font-face declarations with `ascent-override`/`descent-override` to minimize CLS. (Performance Audit)

---

## 3. What Needs Attention Soon (Before Launch / Sharing with Investors)

1. **149 uncommitted files (7,701 insertions) -- 3 features at risk** -- The landing page redesign, app-wide UI overhaul, and billing frontend wiring exist only on a single local machine. A hardware failure would lose all of this work. _Source: Git Status_. **Severity: CRITICAL.**

2. **jspdf CRITICAL vulnerability (CVSS 9.6)** -- HTML Injection in New Window paths plus PDF Object Injection. Direct dependency, actively exploitable. Update to >=4.2.1. _Source: Dependency Audit_. **Severity: CRITICAL.**

3. **Entire Stripe billing stack is untested** -- Zero tests for stripe_service.py, billing router, tier_gate.py, tier_config.py, webhook handling, and all frontend billing components. This is the monetization path. _Source: Test Assessment_. **Severity: HIGH.**

4. **python-jose is unmaintained (3+ years, known CVEs)** -- The sole JWT library used for Clerk token verification has not been maintained since 2022. The community has migrated to PyJWT or joserfc. Used in only one file (`core/security/clerk.py`). _Source: Dependency Audit_. **Severity: HIGH.**

5. **3 HIGH security findings** -- (a) Timing-unsafe internal API key comparison in sequences.py; (b) hardcoded IP hash salt fallback in reports.py; (c) f-string SQL for advisory lock in webhooks. All are quick fixes (5-10 min each). _Source: Security Audit_. **Severity: HIGH.**

6. **README.md is severely outdated** -- Claims 34 endpoints (actual: 141), 9 models (actual: 38), 18 pages (actual: 60). Describes httpOnly cookie auth (replaced by Clerk). Missing all mention of CRM, contacts, financing, rehab, dispositions, skip tracing, mail campaigns. The first thing an investor or contributor reads is factually wrong. _Source: Docs Audit_. **Severity: HIGH.**

7. **18 MB PNG ships to CDN uncompressed** -- `building-complete.png` (18 MB) and `building-complete.jpg` (7.6 MB) are in `frontend/public/` and would deploy to production. Target: <500 KB as WebP. _Source: Performance Audit_. **Severity: HIGH.**

8. **All 24 backend packages use unpinned `>=` ranges** -- A fresh `pip install` could pull breaking versions at any time. No lockfile exists. httpx is imported in 5 files but not listed in requirements.txt. _Source: Dependency Audit_. **Severity: MEDIUM.**

9. **Application-level RLS only -- no database enforcement** -- The ORM-level row filter is bypassed by raw SQL queries. The RAG retrieval module already uses raw SQL with manual user_id filtering, but any new raw query that omits this would leak data. _Source: Security Audit, TODO Inventory_. **Severity: MEDIUM (CRITICAL before multi-tenant).**

10. **1 failing test (stale assertion)** -- `components.test.tsx` expects hardcoded `text-[#D4766A]` but component now uses semantic token `text-loss`. Quick fix. _Source: Test Assessment_. **Severity: LOW.**

---

## 4. What Can Wait

- **React 19 migration** -- React 18 is fully supported. Plan for later. (Dependency Audit)
- **Tailwind v4 migration** -- Significant config changes. No urgency. (Dependency Audit)
- **react-router v7 migration** -- Major architectural shift (Remix merge). Large effort, no current benefit. (Dependency Audit)
- **Font subsetting** -- Subsetting Satoshi and General Sans to Latin could save ~30 KB. Minor. (Performance Audit)
- **Archive 15 superseded SAD files** -- Blueprint variants, completed build plans, superseded audits. No runtime impact. (SAD Manifest)
- **Archive 6 design/research directories** -- UI-DESIGN, UI-RESEARCH, LUXURY-DESIGN, LUXURY-RESEARCH, BILLING-DESIGN, BILLING-RESEARCH. ~57 MB of superseded design artifacts. (Stale Files, Docs Audit)
- **Prune 30 unused Tailwind config tokens** -- Custom font sizes (text-hero, text-h1, etc.) are defined but components use legacy Tailwind sizes instead. Cosmetic. (Dead Code Report)
- **Prune 17 unused motion.ts exports** -- Over half the file is unused. (Dead Code Report)
- **Remove 12 unused chart-theme.ts exports** -- Functions defined but never called. (Dead Code Report)
- **Refactor `== False` SQLAlchemy patterns** -- ~80 `noqa: E712` suppressions. Purely cosmetic. (TODO Inventory)
- **Hero frame sequence loading strategy** -- 121 frames x 60 KB = 7.2 MB loaded on landing page. Consider progressive loading. (Performance Audit)
- **CONTRIBUTING.md / CHANGELOG.md** -- Standard for open-source but not critical for a solo project. (Docs Audit)
- **API prefix consolidation** -- 9 routers under `/api/v1/`, 23 under `/api/`. Works but inconsistent. (API Routes)

---

## 5. Technical Debt Inventory

| Item | Severity | Effort | Source Report | Description |
|------|----------|--------|---------------|-------------|
| jspdf CRITICAL vulnerability | Critical | Quick Win | Dependency Audit | HTML Injection (CVSS 9.6) + PDF Object Injection. Update to >=4.2.1. |
| Uncommitted work (149 files) | Critical | Quick Win | Git Status | 3 features (landing redesign, UI overhaul, billing wiring) exist only locally. Commit and push. |
| Stripe billing -- zero tests | High | Large | Test Assessment | Entire monetization path untested: checkout, webhooks, subscriptions, tier gating, billing components. |
| python-jose unmaintained | High | Medium | Dependency Audit | Replace with PyJWT or joserfc. Only used in one file (clerk.py). |
| Timing-unsafe API key comparison | High | Quick Win | Security Audit | Replace `!=` with `hmac.compare_digest` in sequences.py. Pattern already used in 5 other files. |
| Hardcoded IP hash salt fallback | High | Quick Win | Security Audit | Remove default value from `os.getenv("IP_HASH_SALT", ...)`. Fail loudly if unset. |
| f-string SQL for advisory lock | High | Quick Win | Security Audit | Parameterize: `text("SELECT pg_advisory_xact_lock(:key)")`. |
| README.md outdated | High | Medium | Docs Audit | Off by 4x on endpoint count, describes deprecated auth system, missing entire feature modules. |
| 18 MB PNG in public/ | High | Quick Win | Performance Audit | Convert building-complete.png to WebP, target <500 KB. Remove the duplicate .jpg. |
| httpx missing from requirements.txt | High | Quick Win | Dependency Audit | Imported in 5 backend files but not declared. Could break on transitive dep change. |
| Backend packages unpinned (all `>=`) | Medium | Medium | Dependency Audit | No lockfile. Generate requirements.lock from production environment. |
| Application-level RLS only | Medium | Large | Security Audit, TODO Inventory | ORM-level filter bypassed by raw SQL. Implement PostgreSQL-level RLS policies. |
| Clerk webhook handler untested | Medium | Medium | Test Assessment | User sync from Clerk to DB has zero tests. Bug here means users cannot be created. |
| Missing security headers | Medium | Quick Win | Security Audit | No HSTS, X-Content-Type-Options, X-Frame-Options, CSP, Referrer-Policy. Add middleware. |
| File upload -- extension-only validation | Medium | Medium | Security Audit | No magic byte checking. Attacker can rename malicious file to .pdf. |
| 108 endpoints lack rate limiting | Medium | Medium | API Routes, Security Audit | Most CRUD write endpoints have no rate limits beyond global middleware. |
| Missing env vars (4) | Medium | Quick Win | Env Vars Reference | VITE_GOOGLE_PLACES_API_KEY, CLERK_JWT_AUDIENCE, CLERK_ISSUER_URL, RESEND_API_KEY not in .env files. |
| Stale env vars (3) | Low | Quick Win | Env Vars Reference | SECRET_KEY, STRIPE_PUBLISHABLE_KEY (backend), LOB_ENV -- not referenced by any code. |
| 10 dead frontend files | Low | Quick Win | Dead Code Report | Unused components/hooks/libs that can be deleted. |
| 3 unused npm packages | Low | Quick Win | Dead Code Report | @react-pdf/renderer (3 MB), gsap (6.3 MB), next-themes. Remove for cleaner deps. |
| 47 unused Python imports | Low | Quick Win | Dead Code Report | Genuine unused imports across routers, core modules, models. |
| Dual-write drift risk | Medium | Medium | TODO Inventory | Deal-scenario sync can diverge if one write fails. No repair job exists. |
| Portfolio v1 + v2 coexist | Low | Medium | API Routes | Both mounted in main.py at different prefixes. If v1 has no consumers, remove it. |
| Legacy auth schemas/columns | Low | Quick Win | Security Audit | password_hash column and legacy schemas still exist despite Clerk-only auth. |
| 1 failing test (stale assertion) | Low | Quick Win | Test Assessment | Update `text-[#D4766A]` assertion to `text-loss` in components.test.tsx. |
| Worker health exposes Redis errors | Low | Quick Win | Security Audit | `/health/worker` returns raw exception details to unauthenticated callers. |
| Error messages expose internals | Medium | Quick Win | Security Audit | Calculator and communications endpoints return raw exception strings. |
| lenis on dev prerelease | Low | Quick Win | Dependency Audit | Running `1.3.18-dev.1`. Pin to stable `^1.3.21`. |
| 57 MB binary assets need Git LFS | Medium | Medium | Git Status | Hero images, videos, and frame sequences will bloat .git history without LFS. |
| Zero React.memo in entire codebase | Low | Medium | Performance Audit | DealCard, kanban columns, and list items re-render unnecessarily. |
| Orphan table_decoder.py | Low | Quick Win | Stale Files | Root-level file not imported anywhere. Tracked in git. Delete. |
| 8 unused CSS classes | Low | Quick Win | Dead Code Report | Blob animations, ticker, shimmer -- remnants of previous landing page. |
| 11 tables with bare created_by (no FK) | Medium | Medium | Database Schema | Properties, contacts, tasks, etc. use `created_by UUID` without FK to users table. |

---

## 6. Recommended Next Actions (Top 10)

1. **Commit and push the 149 uncommitted files** -- Split into 2-3 focused commits: landing page redesign, app-wide UI overhaul, billing wiring. This is the single highest-risk item: a hardware failure would erase ~7,700 lines of work across three features. _Effort: Quick. Source: Git Status._

2. **Fix the 3 HIGH security findings** -- (a) Replace `!=` with `hmac.compare_digest` in sequences.py (5 min); (b) remove hardcoded IP hash salt default in reports.py (5 min); (c) parameterize advisory lock query in webhooks (5 min). Total: 15 minutes for all three. _Effort: Quick. Source: Security Audit._

3. **Update jspdf to patched version** -- CRITICAL CVSS 9.6 vulnerability. Run `npm update jspdf` in `frontend/`. While there, run `npm audit fix` to resolve the 4 HIGH dev-only vulnerabilities (vite, picomatch, undici, dompurify). _Effort: Quick. Source: Dependency Audit._

4. **Replace python-jose with PyJWT** -- Unmaintained since 2022 with known CVEs. Only one file to change (`backend/core/security/clerk.py`). PyJWT is actively maintained and supports the same RS256 JWKS flow. _Effort: Medium. Source: Dependency Audit._

5. **Write tests for Stripe billing stack** -- The entire monetization path has zero test coverage: checkout session creation, webhook handling, subscription lifecycle, tier gating, frontend billing components. At minimum, test the happy path for checkout and webhook processing. _Effort: Large. Source: Test Assessment._

6. **Update README.md** -- Fix the factual errors (endpoint count, model count, auth system, storage provider, feature list). This is the front door of the repository and the first thing investors, contributors, or acquirers see. _Effort: Medium. Source: Docs Audit._

7. **Compress oversized production images** -- Convert `building-complete.png` (18 MB) to WebP at display dimensions (target <500 KB). Remove the duplicate `.jpg` (7.6 MB). This saves 25+ MB from every production deploy and CDN bill. _Effort: Quick. Source: Performance Audit._

8. **Pin backend dependencies and add httpx** -- Add `httpx` to requirements.txt (imported in 5 files but undeclared). Generate a `requirements.lock` from the production environment to freeze exact versions. Change `>=` to `~=` at minimum. _Effort: Medium. Source: Dependency Audit._

9. **Add missing security headers** -- Add a FastAPI middleware that sets Strict-Transport-Security, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, and a basic Content-Security-Policy. Or verify Railway/Vercel sets these at the proxy level. _Effort: Quick. Source: Security Audit._

10. **Set up Git LFS for binary assets before committing** -- 57 MB of images, videos, and frame sequences are about to be committed. Without LFS, every future clone downloads all historical versions of these files. Configure LFS for `*.png`, `*.jpg`, `*.mp4`, `*.webm` in `frontend/public/` before the first commit of these assets. _Effort: Medium. Source: Git Status._

---

## 7. File Counts & Metrics

| Metric | Count |
|--------|-------|
| Frontend files (.ts/.tsx) | 228 |
| Backend files (.py) | 216 |
| Frontend LOC | 35,701 |
| Backend LOC | 33,585 |
| Total LOC | 69,286 |
| Total test cases | 212 (42 frontend, 170 backend) |
| Frontend component test coverage | 2.8% (3/109 components) |
| Backend router test coverage | 37% (11/30 routers) |
| API endpoints | 141 (119 authenticated, 22 public) |
| Dead API endpoints | 12 (2 truly unused: brand-kit GET/PATCH) |
| Database tables | 38 |
| Frontend routes | 48 (36 protected, 11 public, 1 catch-all) |
| Documentation files | 231 |
| Dead code items | 231 (10 files, 35 exports, 4 npm, 8 CSS, 30 Tailwind, 144 imports) |
| TODO/FIXME items | 18 (7 TODOs, 0 FIXMEs, 0 HACKs, 1 DEPRECATED, 2 WARNINGs, 8 lint suppressions) |
| Security findings | 17 (0 critical, 3 high, 8 medium, 6 low) |
| Stale files for cleanup | 27 items (14 delete, 8 archive, 5 assess) |
| Unused dependencies | 6 (3 npm: @react-pdf/renderer, gsap, next-themes; 3 stale env vars) |
| Uncommitted changes | 149 files, 7,701 insertions, 4,507 deletions |
| npm vulnerabilities | 6 (1 critical, 4 high, 1 moderate) |
| Reclaimable disk space | ~57 MB from stale files, ~25 MB from oversized images |

---

## 8. Architecture Summary

**Tech Stack:**
- **Frontend:** React 18 + TypeScript, Vite 6, Tailwind CSS 3, Zustand (state), TanStack Query (data fetching), Framer Motion (animation), Recharts (charts)
- **Backend:** FastAPI + Python 3.11, SQLAlchemy 2 ORM, Alembic (migrations), Dramatiq + Redis (background jobs), Pydantic (validation)
- **Database:** PostgreSQL with pgvector (embeddings), pg_trgm (fuzzy search)

**Deployment Topology:**
- **Frontend:** Vercel (static + SPA). Build-time environment variables (`VITE_*`). All routes lazy-loaded.
- **Backend:** Railway (API server + Dramatiq worker process). PostgreSQL and Redis as Railway add-ons.
- **Storage:** Cloudflare R2 (S3-compatible) for document uploads and generated PDFs.

**External Services:**
- **Auth:** Clerk (OAuth/JWT, RS256 JWKS verification, webhook-based user sync)
- **Billing:** Stripe (checkout sessions, customer portal, webhooks for subscription lifecycle). 3-tier pricing: Steel (free) / Carbon ($79/mo) / Titanium ($149/mo) with 7-day trial.
- **AI:** Anthropic Claude (deal analysis narration, chat, document processing, offer letters), OpenAI (document embeddings via text-embedding-ada-002)
- **Property Data:** RentCast (property enrichment), Bricked (alternative provider), Nominatim (geocoding)
- **Communications:** Twilio (SMS), SendGrid (email), Resend (transactional email -- partial integration)
- **Skip Tracing:** BatchData
- **Direct Mail:** Lob
- **Analytics:** PostHog (optional), Sentry (error monitoring)

**Key Architectural Decisions:**
- Clerk-only auth replacing legacy JWT/cookie system (migration completed April 2026)
- Property-centric data model (replacing deal-centric) with dual-write sync bridge
- 3-tier pricing (down from initial 4-tier plan) with quota-based and feature-based gating
- Application-level RLS via SQLAlchemy event listener (database-level RLS planned for multi-tenant)
- SSE streaming for real-time analysis pipeline and AI chat responses
- All routes lazy-loaded with React.lazy() and Suspense boundaries

---

## 9. Outstanding Decisions (Need Ivan's Input)

1. **Archive the LUXURY-DESIGN directory?** -- 20 files, superseded by DESIGN.md. Referenced in 3 code comments. The docs audit, stale files report, and SAD manifest all recommend archiving. Decision: move to `_archive/`, keep in repo but out of the way, or leave as-is?

2. **Remove portfolio v1?** -- Both `portfolio.py` (v1, at `/api/v1/portfolio/`) and `portfolio_v2.py` (at `/api/portfolio/`) are mounted in main.py. If no active users rely on the v1 API, the v1 router can be removed. Decision: deprecate and remove, or keep for backward compatibility?

3. **Set up Git LFS before committing assets?** -- 57 MB of binary assets (hero images, videos, frame sequences) are about to enter git history. Without LFS, every clone downloads all versions. Decision: invest the time to configure LFS now, use an external CDN instead, or accept the repo bloat?

4. **Keep the RESEARCH directory in the repo?** -- 46 tracked markdown files (1 MB) plus 21 MB of untracked screenshots. The markdown is valuable for decision archaeology. Decision: keep the markdown, delete only the screenshots, or archive everything?

5. **Keep or remove SAD/designs/ (64 tracked PNGs, 12 MB)?** -- Design mockups from the design phase. Useful as reference but bloat git history. Decision: move to Figma/external storage, keep in repo with LFS, or leave as-is?

6. **Root package.json -- move shadcn to frontend?** -- A root-level package.json (54 bytes) exists only to support the shadcn MCP server. This creates a confusing dual-package-manager setup. Decision: move to frontend/package.json, keep at root with a comment, or remove?

7. **Resolve the duplicate LEGAL files** -- `LEGAL/PRIVACY-POLICY.md` and `LEGAL/TERMS-OF-SERVICE.md` are exact duplicates of files in `frontend/public/legal/`. Decision: delete LEGAL/ directory (frontend copies are canonical), or keep both?

8. **Remove or implement the brand-kit feature?** -- Backend endpoints exist (`GET/PATCH /api/v1/settings/brand-kit/`), the User model has a `brand_kit` JSONB column, and reports consume brand kit data -- but there is no frontend UI to manage it. Decision: build the settings UI, remove the dead endpoints, or leave dormant?

9. **Should table_decoder.py at repo root be deleted?** -- Orphan 1 KB utility file tracked in git, not imported anywhere in the codebase. Appears to be a one-off tool. Decision: delete it?

10. **scripts/kie_api.py -- keep, move, or delete?** -- Standalone 14 KB wrapper around kie.ai API for atmospheric image generation. Not referenced from backend or frontend code. Decision: keep for future asset generation, move to a tools/ directory, or delete?
