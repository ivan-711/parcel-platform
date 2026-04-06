# 30 — Backend Infrastructure Audit & Database Strategy

> **Date:** 2026-04-02
> **Context:** Solo-founder SaaS, 25-30 hrs/week, targeting 150-10K users over 2 years. Currently Railway + PostgreSQL + FastAPI. Preparing for Wave 0 schema foundation (~26 tables, 7 waves).

---

## 1. Current Backend State

### Database Setup

| Attribute | Value |
|---|---|
| ORM | SQLAlchemy 2.x (legacy `declarative_base()`, not new `DeclarativeBase`) |
| Database | PostgreSQL via `psycopg2-binary` |
| Connection pooling | SQLAlchemy built-in: `pool_size=20`, `max_overflow=40`, `pool_pre_ping=True`, `pool_recycle=3600` |
| Session management | `sessionmaker(autocommit=False, autoflush=False)`, yielded via `get_db()` dependency |
| Extensions | `pg_advisory_xact_lock` only. **No PostGIS, no pgvector.** |
| Migrations | Alembic with 6 migrations, head at `1642524fa0f6` |

### Current Models (12 tables)

| Table | Key Columns | JSONB Blobs | Pain Points |
|-------|-------------|-------------|-------------|
| `users` | email, password_hash, role, team_id, plan_tier, stripe_customer_id, trial_ends_at | None | `plan_tier` duplicated on `subscriptions`. No OAuth. |
| `teams` | name, created_by | None | No API router exists despite having schemas. |
| `team_members` | team_id, user_id, role | None | No unique constraint on (team_id, user_id). No indexes on FKs. |
| `deals` | address, zip_code, property_type, strategy, status, risk_score, deleted_at | **`inputs`**, **`outputs`**, **`risk_factors`** | Address is unstructured string. No geocoding. Missing indexes on strategy/status/deleted_at/zip. JSONB has queryable fields (purchase_price, arv, mao) that should be columns. |
| `documents` | original_filename, file_type, s3_key, s3_bucket, status, ai_summary | **`parties`**, **`risk_flags`**, **`extracted_numbers`**, **`key_terms`** | `status` is String not Enum. No FK to deals. |
| `chat_messages` | session_id, role, content, context_type, context_id | None | `context_id` has no FK constraint (polymorphic but unenforced). No archival strategy. |
| `pipeline_entries` | deal_id, user_id, team_id, stage, entered_stage_at, notes | None | No unique constraint on (deal_id, user_id). |
| `portfolio_entries` | deal_id, user_id, team_id, closed_date, closed_price, profit, monthly_cash_flow | None | Attached to deals, not properties. |
| `subscriptions` | user_id, stripe_subscription_id, status, plan_tier, period dates, trial dates | None | Good partial unique index. Dual `plan_tier` with `users` table. |
| `usage_records` | user_id, metric, period_start, count | None | Each event = new row (count always 1). Scanning N rows to count N events. |
| `password_reset_tokens` | user_id, token_hash, expires_at, used_at | None | Tokens never purged. |
| `webhook_events` | stripe_event_id, event_type, payload, processed, retry_count | **`payload`** | Good design. |

### Current API Routes (32 endpoints)

| Router | Prefix | Endpoints | Billing Gates |
|--------|--------|-----------|---------------|
| Auth | `/api/v1/auth` | 9 (register, login, logout, refresh, me, update profile, forgot/reset password) | None |
| Deals | `/api/v1/deals` | 8 (CRUD, share public, offer letter) | `saved_deals`, `analyses_per_month`, `offer_letter` |
| Pipeline | `/api/v1/pipeline` | 4 (board, add, move stage, remove) | `pipeline_enabled` |
| Portfolio | `/api/v1/portfolio` | 3 (list, add, update) | `require_tier(PRO)` |
| Chat | `/api/v1/chat` | 2 (stream message, history) | `ai_chat_enabled`, `ai_messages_per_month` |
| Documents | `/api/v1/documents` | 4 (upload, list, get, delete) | `document_uploads_per_month` |
| Dashboard | `/api/v1/dashboard` | 2 (stats, activity) | None |
| Settings | `/api/v1/settings` | 2 (get/patch notifications) | None |
| Billing | `/api/v1/billing` | 4 (checkout, portal, cancel, status) | None |
| Webhooks | `/webhooks` | 1 (Stripe) | Stripe signature |
| Root | `/` | 2 (health, root) | None |

### Auth System

| Attribute | Value |
|---|---|
| Implementation | **Custom JWT** (python-jose HS256 + passlib bcrypt). NOT Clerk. |
| Token delivery | httpOnly cookies (`SameSite=None` production, `Lax` dev) |
| Access token TTL | 15 minutes |
| Refresh token TTL | 7 days |
| OAuth | **None.** Email/password only. |
| Token revocation | **None.** Old JWTs valid until expiry. |
| User query per request | Yes — `get_current_user` hits DB on every authenticated call |
| Secret key default | `"changeme-in-production"` — no startup validation |

### Deployment

- **Platform:** Railway (Procfile-based, no Dockerfile)
- **Process:** Single uvicorn, no Gunicorn, no workers flag
- **Migrations:** Run at deploy via `alembic upgrade head && uvicorn main:app`
- **File storage:** AWS S3 via boto3 (new client per call — not cached)
- **Email:** Resend API (optional)
- **No background queue.** Document processing uses in-process `BackgroundTasks`
- **No caching layer.** No Redis, no in-memory cache
- **No search.** Only `address.ilike(f"%{search}%")`
- **No structured logging, no APM, no Sentry**
- **Rate limiting:** slowapi with in-memory storage (resets on deploy)

### Test Coverage

- **41 tests** across 4 files: auth (7), API/deals (5), calculators (15), demo chat (14)
- **Not tested:** Documents, billing/Stripe, dashboard, portfolio, settings, offer letters, password reset, rate limiting, authorization boundaries, error handling

### Top Pain Points

1. **JSONB blobs carrying queryable data.** `deals.inputs` and `deals.outputs` store purchase_price, arv, mao as untyped JSON — extracted in Python on every list view.
2. **No background job queue.** Document processing runs in-process. If the web process crashes, docs get stuck in "processing" forever.
3. **Missing indexes.** `deals.strategy`, `deals.status`, `deals.deleted_at`, `deals.zip_code`, `team_members.team_id/user_id`, `documents.status` — all filtered but unindexed.
4. **Dashboard fires 9+ queries.** Stats = 5 queries, activity = 4 queries + Python sort. Could be 1-2 queries.
5. **Write-on-read for risk scores.** `GET /deals/{id}` backfills risk_score if missing — a write inside a read endpoint.
6. **Duplicate plan_tier.** Lives on both `users` and `subscriptions`. Webhook handler tries to sync but drift is possible.
7. **S3 client created per call.** `_get_client()` instantiates boto3 on every upload/download.
8. **Synchronous Stripe calls block the event loop.** `async def` endpoints call sync Stripe SDK with `time.sleep` retry.
9. **No CSRF protection.** Cookies are `SameSite=None` in production without additional mitigation.
10. **`datetime.utcnow()`** used throughout — deprecated in Python 3.12+.

---

## 2. Blueprint Technical Requirements

Extracted from FINAL-PRODUCT-BLUEPRINT.md and CODEX-FINAL-PRODUCT-BLUEPRINT.md:

| Requirement | Current State | Gap |
|---|---|---|
| ~26 first-class tables + support entities | 12 tables | Need 14+ new tables |
| Property as root record | No Property model | **Major refactor** — Deal→Property split |
| AnalysisScenario separate from Deal | Analysis in Deal.inputs/outputs JSONB | **Major refactor** — extract to typed table |
| PostGIS for geolocation | Not installed | Enable extension, add geometry column |
| pgvector for RAG embeddings | Not installed | Enable extension, add embedding columns |
| Row-Level Security (team_id scoping) | No RLS policies | Write policies for all tables |
| Modular Alembic migrations | Single migration chain | Restructure per module |
| Background job processing | In-process BackgroundTasks only | Need task queue for obligations, briefings, PDFs |
| File storage (docs, photos, PDFs) | S3 (works) | Consider R2 for cost savings |
| Full-text search | `address.ilike()` only | Add tsvector + GIN indexes |
| Usage-based billing tracking | Exists but inefficient (row-per-event) | Optimize to UPSERT pattern |
| Webhook handling (Twilio, Lob, Stripe) | Stripe only | Add Twilio + Lob handlers in Wave 4-6 |
| Server-side PDF generation | Client-side jsPDF | Move to server (WeasyPrint or similar) |
| Real-time obligation monitoring | Nothing | Scheduled checks via background jobs |
| API rate limiting per tier | In-memory slowapi | Persist to Redis for reliability |
| Contact/BuyerProfile/Task/Obligation/etc. | None exist | Build in Wave 0-2 |
| Tier rename (Starter→Plus, Team→Business) | Code uses old names | Update in Wave 0 |

---

## 3. Database Comparison

### Trade-Off Matrix

| Requirement | Railway PG (current) | Neon | Supabase |
|---|---|---|---|
| PostGIS | Yes (custom Docker) | Yes (built-in) | Yes (built-in) |
| pgvector | Yes (template/Docker) | Yes (built-in) | Yes (built-in) |
| RLS | Manual SQL policies | Manual SQL policies | Built-in with auth helpers |
| Connection pooling | DIY (PgBouncer) | **Built-in** | Built-in |
| PITR backup | DIY (Barman) | **Built-in (7-30 days)** | Built-in (7 days on Pro) |
| Branching | No | **Yes (instant)** | Team plan only ($599/mo) |
| Autoscaling | Manual | **Automatic** | Manual (compute add-ons) |
| Scale-to-zero | No (always running) | **Yes** | No |
| Read replicas | DIY (repmgr, limited) | Built-in | Pro plan |
| Cold start | None | 300-500ms | None |
| Migration effort | None | **Low** (pg_dump/restore) | Moderate-High |
| Auth built-in | No | No | Yes (deep RLS integration) |
| File storage built-in | No | No | Yes |
| Realtime | No | No | Yes (WebSocket CDC) |
| Edge functions | No | No | Yes (Deno only — NOT Python) |
| Reliability | Stable | Stable (Databricks-backed) | 41 incidents/90 days |
| Cost @150 users | ~$10-15/mo | **~$5-10/mo** | ~$35/mo (Pro) |
| Cost @1K users | ~$20-30/mo | **~$20-30/mo** | ~$125/mo+ (Pro + compute) |
| Cost @10K users | ~$60-100/mo | **~$80-100/mo** | ~$200-300/mo |
| Solo-dev complexity | Known (already using) | Low (less to manage) | Moderate (new APIs to learn) |

### Vector Database (Pinecone vs pgvector)

| Factor | pgvector | Pinecone |
|---|---|---|
| Cost | $0 (included in PG) | $50/mo minimum |
| Performance @100K chunks | 5-20ms queries | Single-digit ms |
| RLS support | Native (same DB) | No (separate service) |
| Architecture complexity | Zero (same DB) | Adds separate service |
| Sufficient for Parcel? | **Yes** | Overkill |

**Verdict:** pgvector. Pinecone adds $50/mo and complexity for zero benefit at <100K chunks.

### PlanetScale (MySQL) — Eliminated

MySQL lacks native PostGIS, pgvector, and RLS. Migration from PostgreSQL would require rewriting every query. No benefit justifies this effort.

---

## 4. Background Job Processing Recommendation

| Option | Async Native | Setup Complexity | Retry/Backoff | Best For |
|---|---|---|---|---|
| FastAPI BackgroundTasks | Yes | None | None | Simple webhook handlers, notifications |
| **ARQ** | **Yes (asyncio)** | **Low** | **Built-in** | **Parcel's async workloads** |
| Celery + Redis | No (threads) | High | Manual config | Large teams, complex workflows |
| Dramatiq | No | Moderate | Built-in exponential | Alternative to Celery |
| Trigger.dev | N/A (TypeScript) | Low | Built-in | Node.js backends |

**Recommendation: Start with BackgroundTasks (current). Graduate to ARQ when needed.**

ARQ fits because:
- Native asyncio matches FastAPI
- Redis-only (single dependency — pair with Upstash)
- Minimal config, lightweight
- Deploy as separate Railway service (~$3-5/mo)

**When to switch:** When you need obligation monitoring (Wave 2), bulk skip tracing (Wave 5), or PDF generation queues (Wave 3).

---

## 5. File Storage Recommendation

| Provider | Storage/GB/mo | Egress/GB | Free Tier |
|---|---|---|---|
| AWS S3 (current) | $0.023 | $0.09 | None relevant |
| **Cloudflare R2** | **$0.015** | **FREE** | **10 GB storage** |
| Supabase Storage | $0.021 | $0.09 | 1 GB |

**Recommendation: Migrate to Cloudflare R2.**

- 97% cheaper than S3 for egress
- S3-compatible API — same boto3 SDK, change endpoint only
- 10 GB free tier covers Parcel through 10K users
- Zero vendor lock-in (S3 API is universal)

**What goes where:**
| File Type | Storage | Rationale |
|---|---|---|
| D4D photos | R2 | Large files, frequent reads, free egress |
| Document uploads | R2 | User-facing, need signed URLs |
| Generated PDFs | **Regenerate on demand** | Store data, not rendered PDF |
| RAG document chunks | PostgreSQL (text column) | Already in DB for pgvector |

---

## 6. Search Strategy Recommendation

| Scale | PostgreSQL Native | Dedicated Search |
|---|---|---|
| <10K properties | **More than sufficient** | Unnecessary |
| 10K-100K | Fine with good indexes | Nice for UX |
| 100K+ | Starts to strain | Recommended |

**Recommendation: PostgreSQL native (tsvector + GIN + pg_trgm).**

Add to Wave 0-1:
- `tsvector` generated column on `properties` (address, city, state)
- `tsvector` generated column on `contacts` (name, email, phone)
- GIN indexes on both
- `pg_trgm` extension for autocomplete/fuzzy matching

Add Typesense (self-hosted on Railway, free) or Meilisearch Cloud ($30/mo) only when users complain or records exceed 100K.

---

## 7. Auth Strategy Recommendation

### Current State

Parcel has **working custom JWT auth** (python-jose + bcrypt). It handles registration, login, logout, refresh, password reset. It does NOT have:
- OAuth (Google, etc.)
- Magic links
- Token revocation/blacklist
- Team invites
- API keys
- CSRF protection

### Options

| Factor | Keep Custom (current) | Add Clerk | Supabase Auth |
|---|---|---|---|
| Migration effort | None | Moderate (replace auth flow) | High (requires Supabase DB) |
| Google OAuth | Add manually (~4 hrs) | Built-in | Built-in |
| Magic links | Add manually (~8 hrs) | Built-in | Built-in |
| Team invites | Add manually (~16 hrs) | Built-in (Organizations) | Manual |
| Token revocation | Add manually (~4 hrs) | Built-in | Built-in |
| Cost @10K MAU | $0 | $0 (50K MAU free) | $0 |
| Cost @50K MAU | $0 | $0 | $0 |
| Pre-built UI | No | Yes (React components) | No |
| RLS integration | Manual JWT claims | Separate user store | Deep (`auth.uid()`) |

### Recommendation: Keep custom auth, enhance incrementally.

**Why not switch to Clerk:** You already have working auth. Switching to Clerk means ripping out registration, login, session management, and all auth dependencies — then learning Clerk's API, syncing user data between Clerk and your DB, and changing every frontend auth component. That's 2-3 days of migration work to get back to where you are now, with an external dependency added.

**What to add in Wave 0:**
1. Token revocation via a simple `revoked_tokens` table (2 hours)
2. Fix CSRF: add `SameSite=Lax` in production + CSRF token header (2 hours)
3. Validate `SECRET_KEY` is not the default at startup (30 minutes)

**What to add in Wave 1:**
1. Google OAuth via `authlib` (4 hours)

**What to defer until demand:**
- Magic links, team invites, API keys — build when paying users request them

---

## 8. Full Trade-Off Matrix

| Requirement | Current Stack | Recommended Stack | Change Needed? |
|---|---|---|---|
| Database | Railway PostgreSQL | **Neon PostgreSQL** | Yes — pg_dump/restore migration (~2 hrs) |
| PostGIS | Not enabled | Neon + `CREATE EXTENSION` | Enable in Wave 0 |
| pgvector | Not enabled | Neon + `CREATE EXTENSION` | Enable in Wave 0 |
| RLS | Not configured | SQL policies on all tables | Write in Wave 0 |
| Connection pooling | SQLAlchemy pool | **Neon built-in PgBouncer** | Automatic with Neon |
| Vectors | None | **pgvector** (in Neon) | Add in Wave 1C (RAG) |
| Caching | None | **Defer; Upstash when needed** | No change at launch |
| File storage | AWS S3 | **Cloudflare R2** | Change endpoint in boto3 config |
| Background jobs | In-process BackgroundTasks | **BackgroundTasks now; ARQ later** | No change at launch |
| Search | `address.ilike()` | **tsvector + GIN + pg_trgm** | Add in Wave 0-1 |
| Auth | Custom JWT | **Keep custom + enhance** | Add revocation, CSRF, OAuth |
| PDF generation | Client-side jsPDF | **Server-side (WeasyPrint)** | Add in Wave 3 |
| Rate limiting | In-memory slowapi | **Upstash Redis (when added)** | Defer |
| Offline (iOS) | N/A | **@capacitor-community/sqlite** | Wave 7 |

---

## 9. RECOMMENDATION: The Optimal Stack

### The Stack

```
Database:        Neon PostgreSQL (Launch plan, $5/mo min)
                 + PostGIS + pgvector + pg_trgm extensions
                 + Built-in connection pooling + PITR + branching

File Storage:    Cloudflare R2 (S3-compatible, free egress, 10 GB free)

Auth:            Keep custom JWT (enhance with revocation + CSRF + OAuth)

Background Jobs: FastAPI BackgroundTasks now → ARQ + Upstash Redis later

Caching:         None at launch → Upstash Redis when first bottleneck appears

Search:          PostgreSQL native (tsvector + GIN + pg_trgm)

Vectors:         pgvector (in Neon PostgreSQL)

Offline (iOS):   @capacitor-community/sqlite (Wave 7)

Hosting:         Railway (FastAPI app + future ARQ worker)
```

### Why This Stack

1. **Neon over Railway PG:** Built-in connection pooling, branching for safe migrations, PITR backups, autoscaling — all things Railway requires DIY. Migration is 2 hours. Cost is equal or lower. Cold starts (300-500ms) only affect first request after idle and are acceptable for a SaaS with active users.

2. **Neon over Supabase:** You already have a FastAPI backend. Supabase's value is in replacing your backend (PostgREST, Edge Functions, Auth). Since Parcel keeps FastAPI, Supabase adds cost ($125/mo+ real production cost) and complexity (learn new APIs) without replacing anything. The 41 incidents in 90 days is a reliability concern. Supabase Auth is excellent but you already have working auth.

3. **R2 over S3:** Same API (boto3), free egress, cheaper storage, generous free tier. Zero migration friction — change the endpoint URL.

4. **Custom auth over Clerk:** You have working auth. Don't rip it out to add a dependency. Enhance it incrementally (revocation, CSRF, OAuth) for less effort than migrating to Clerk.

5. **pgvector over Pinecone:** Same database, $0 extra, native RLS, sufficient performance at <100K chunks.

6. **PostgreSQL search over Meilisearch/Typesense:** Sufficient for <10K users. One less service to manage.

### Estimated Monthly Costs

| Scale | Neon DB | R2 Storage | Railway App | Redis | Total |
|---|---|---|---|---|---|
| 150 users | $5 | $0 | $5-10 | $0 | **~$10-15/mo** |
| 1K users | $20-30 | $0 | $10-15 | $0-3 | **~$30-50/mo** |
| 10K users | $80-100 | $3-5 | $20-40 | $5-10 | **~$110-155/mo** |

---

## 10. Migration Plan

### Phase 1: Before Wave 0 (1 day)

1. **Provision Neon database** on Launch plan ($5/mo)
2. **pg_dump from Railway:** `pg_dump -Fc -h railway-host -U user parcel > parcel.dump`
3. **pg_restore to Neon:** `pg_restore -h neon-host -U user -d parcel parcel.dump`
4. **Enable extensions:** `CREATE EXTENSION postgis; CREATE EXTENSION vector; CREATE EXTENSION pg_trgm;`
5. **Update `DATABASE_URL`** in Railway env vars to point to Neon
6. **Verify:** Run `pytest`, hit health endpoint, test auth flow
7. **Decommission Railway PostgreSQL** after 48 hours of stable operation

### Phase 2: During Wave 0 (alongside schema work)

1. **Set up Cloudflare R2 bucket**
2. **Update S3 service** to point to R2 (change endpoint URL + credentials in env vars)
3. **Migrate existing S3 objects** to R2 using `rclone` or AWS CLI with R2 endpoint
4. **Add auth enhancements:** `revoked_tokens` table, CSRF token, SECRET_KEY validation

### Phase 3: Post-Wave 1 (when needed)

1. **Set up Upstash Redis** when first caching/job need arises
2. **Deploy ARQ worker** as separate Railway service when obligation monitoring ships (Wave 2)

---

## 11. What Must Be Decided Before Wave 0

### Must Decide Now

| Decision | Options | Recommendation |
|---|---|---|
| Migrate to Neon? | Yes / No (stay Railway) | **Yes.** 2-hour migration, better tooling, same or lower cost. |
| Migrate to R2? | Yes / No (stay S3) | **Yes.** Same API, free egress, 10 GB free. Do it alongside Wave 0. |
| Auth strategy? | Keep custom / Switch to Clerk | **Keep custom + enhance.** Less work, no new dependency. |
| Enable PostGIS now or defer? | Now / Wave 7 | **Now.** Free to enable, zero downside. |
| Enable pgvector now or defer? | Now / Wave 1C | **Now.** Free to enable, needed for RAG schema planning. |

### Can Wait

| Decision | When to Decide |
|---|---|
| Background job system (ARQ vs Celery) | Wave 2, when obligation monitoring needs it |
| Redis/caching provider | When first performance bottleneck appears |
| Dedicated search engine | When PostgreSQL search proves insufficient (likely >10K users) |
| iOS offline sync strategy | Wave 7 |
| Server-side PDF engine | Wave 3 |

---

*This document combines a full backend code audit with fresh infrastructure research (April 2026 pricing verified via web). It supersedes the earlier `30-database-infrastructure-options.md` research file.*
