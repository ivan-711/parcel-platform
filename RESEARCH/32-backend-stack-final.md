# 32 — Backend Stack: Comprehensive Requirements-First Research

> **Date:** 2026-04-03
> **Method:** 4 parallel research agents evaluated 80+ tools across 11 categories against Parcel's hard requirements. Web research verified pricing and capabilities as of April 2026.
> **Sub-reports:** `32-database-vector-storage-evaluation.md`, `32-auth-hosting-realtime.md`, `32-file-storage-caching-search.md`, `32-background-jobs-pdf-offline-db.md`

---

## 1. Requirements Summary

Every tool in this document was evaluated against these non-negotiable requirements:

| # | Requirement | Detail |
|---|------------|--------|
| 1 | Relational data | ~26+ tables, FK constraints, complex joins, polymorphic relationships |
| 2 | Geospatial | Property coordinates, "within 5 miles" queries, GPS route polylines |
| 3 | Vector embeddings | RAG retrieval, <100K vectors at 1K users, <1M at 10K |
| 4 | Row-Level Security | Multi-tenant isolation enforced at database level |
| 5 | Full-text search | Fuzzy matching, autocomplete across properties, contacts, deals |
| 6 | Background jobs | Scheduled (daily), event-triggered (async), batch processing |
| 7 | File storage | Documents, photos, PDFs — 10K-100K files at scale |
| 8 | Authentication | Email/pass, Google OAuth, magic links, team invites, API keys (future) |
| 9 | Real-time | Evaluate if needed — AI streaming, pipeline updates, alerts |
| 10 | Caching | Dashboard aggregations, API response caching, rate limiting |
| 11 | PDF generation | Server-side branded reports with custom fonts, logos, charts |
| 12 | Offline mobile | iOS D4D: driving routes, property captures, sync back to server |

---

## 2. Category Picks

### CATEGORY 1: Primary Database

**20 options evaluated. 10 disqualified outright.**

Disqualified: PlanetScale (no PostGIS, no RLS), TiDB (no geospatial/RLS, overkill), CockroachDB (40% PG compat, no PostGIS/RLS), YugabyteDB ($375/mo min, overkill), Turso (fails 4 of 6 requirements), MongoDB (wrong paradigm for relational data), DynamoDB (fails all 6), Convex (no SQL/RLS), SurrealDB (immature, no SQLAlchemy), EdgeDB/Gel (risky rebrand, no SQLAlchemy).

**Top 5 viable options (all PostgreSQL):**

| Provider | @100 users | @1K users | @10K users | PostGIS | pgvector | RLS | Pooling | PITR | Branching |
|----------|-----------|-----------|------------|---------|----------|-----|---------|------|-----------|
| **Railway** | $15-25 | $40-70 | $150-300 | Yes (Docker) | Yes | Yes | DIY (PgBouncer) | Pro plan | No |
| **Neon** | $10-20 | $30-60 | $100-250 | Yes | Yes | Yes | Built-in | Built-in | Yes |
| **Supabase** | $25 | $50-75 | $150-300 | Yes | Yes | Yes (deep) | Built-in | Pro | Team ($599) |
| **DigitalOcean** | $15 | $40 | $120-200 | Limited | No | Yes | Built-in | Yes | No |
| **Crunchy Bridge** | $25 | $75 | $200-400 | Yes | Yes | Yes | Built-in | Yes | No |

#### PICK: Railway PostgreSQL (stay)

**Why:** All 6 hard requirements met. Cheapest at seed stage ($15-25/mo). Already running — zero migration effort. Usage-based pricing scales linearly. The PG18 HA template includes PostGIS + pgvector pre-configured.

**Why not Neon:** Scale-to-zero cold starts (300-500ms) hurt first-request latency for active SaaS users. Under sustained load, hourly compute billing can exceed fixed-instance providers. Owned by Databricks — unclear long-term strategy for indie SaaS customers. Branching is nice but not worth a migration.

**Why not Supabase:** Real production cost is $125/mo+ (not the advertised $25). Edge Functions are Deno-only (useless for FastAPI). 41 incidents in 90 days. You'd pay for features you don't use (Realtime, Storage, Auth) while still running your own FastAPI backend.

**Escape hatch:** If Railway limits hit (32 vCPU max, no managed pooling), migrate PG-to-PG to Neon or Crunchy Bridge. Same schema, same ORM, 2-hour migration.

**What to do now:** Use Railway's PG18 HA template (PostGIS + pgvector pre-installed) or add extensions to existing instance via `CREATE EXTENSION`. Add PgBouncer sidecar before 500+ concurrent connections.

---

### CATEGORY 2: Vector Storage

**9 options evaluated.**

| Provider | @100K vectors | @1M vectors | Filtering by tenant | Extra cost | Migration from pgvector |
|----------|-------------|-------------|--------------------|-----------|-----------------------|
| **pgvector** | 5-20ms (HNSW) | 10-30ms | Native RLS | $0 | N/A |
| Pinecone | 2-5ms | 5-10ms | Metadata filter | $50/mo min | Moderate |
| Qdrant Cloud | 5-10ms | 10-20ms | Payload filter | $25/mo+ | Low-moderate |
| Weaviate Cloud | 5-15ms | 10-25ms | Property filter | $50/mo+ | Moderate |
| Chroma | 10-30ms | Unknown | Metadata filter | $0-30/mo | Low |
| LanceDB | 5-15ms | 10-20ms | Filter support | $0 (embedded) | Low |

#### PICK: pgvector (same PostgreSQL instance)

**Why:** At <1M vectors, pgvector with HNSW indexes delivers 10-30ms query latency — indistinguishable from dedicated vector DBs in practice, since the embedding API call that precedes search takes 100-300ms. The killer advantage: RLS-based multi-tenant filtering in the same query as vector search. No additional service, no additional cost, no sync between databases.

**Realistic ceiling:** 5-10M vectors before performance degrades meaningfully. Parcel won't hit this before 50K+ users.

**Escape hatch:** Qdrant Cloud ($25/mo) if index builds start affecting write performance.

---

### CATEGORY 3: File Storage

**9 options evaluated.**

| Provider | Storage $/GB/mo | Egress $/GB | Free Tier | S3 API (boto3) | CDN |
|----------|----------------|-------------|-----------|----------------|-----|
| **Cloudflare R2** | $0.015 | **$0 (free)** | 10 GB | Yes | Yes (CF network) |
| Backblaze B2 | $0.006 | $0 (3x rule) | 10 GB | Yes | Via CF CDN |
| AWS S3 | $0.023 | $0.09 | 5 GB / 12 mo | Yes (native) | No (extra) |
| DO Spaces | $0.02 (flat $5) | $0 (1 TB incl) | None | Yes | Yes |
| Tigris | $0.02 | $0 | 5 GB | Yes | Yes |

#### PICK: Cloudflare R2

**Why:** Zero egress fees eliminates the #1 surprise cost. S3 API compatible — boto3 works with a 2-line config change. 10 GB free tier covers ~5,000 files. At 200 GB: R2 costs $3/mo vs S3 at $13.60/mo.

**File placement:** D4D photos → R2. Document uploads → R2. Generated PDFs → store in R2 (cheaper than regenerating). RAG chunks → PostgreSQL text column.

---

### CATEGORY 4: Authentication

**14 options evaluated.**

| Provider | @10K MAU | @50K MAU | OAuth | Magic Links | Teams/Orgs | Python SDK |
|----------|----------|----------|-------|-------------|-----------|-----------|
| **Clerk** | $0 | $0 | Yes | Yes | $100/mo add-on | Official |
| WorkOS | $0 | $0 (1M free) | Yes | Yes | Yes (native) | Official |
| Auth0 | $0 | $1,750/mo | Yes | Yes | Yes (B2B) | Mature |
| Supabase Auth | $0 | $0 | Yes | Yes | Basic (RLS) | supabase-py |
| Kinde | $0 | $99/mo | Yes | Yes | Yes | REST API |
| Custom JWT | $0 | $0 | Build it | Build it | Build it | N/A |

#### PICK: Clerk

**Why:** $0 through 50K MAU. Best React component DX. Official Python SDK. Google OAuth + magic links out of the box. Pre-built user management dashboard.

**The auth migration question:** Parcel has working custom JWT auth. Switching to Clerk = 2-3 days migration. The case for switching: custom auth lacks OAuth, magic links, token revocation, CSRF, MFA — each is days to add manually. Auth is the #1 thing solo devs get wrong. Clerk is free.

**This is a founder judgment call.** Research recommends Clerk. Keeping custom auth + enhancing it (token revocation, CSRF, Google OAuth) is a defensible alternative at ~1-2 days of incremental work.

**Runner-up:** WorkOS AuthKit (1M MAU free, better org support, less polished UI).

---

### CATEGORY 5: Background Jobs

**13 options evaluated.**

| Tool | Scheduling | Retry | Broker Required | Solo-Dev Complexity |
|------|-----------|-------|----------------|-------------------|
| **Huey** | Built-in cron | Built-in | **SQLite** (no Redis!) | LOW |
| ARQ | Built-in cron | Built-in | Redis | Low-Med — **maintenance-only mode** |
| Dramatiq | Via periodiq | Exponential | Redis/RabbitMQ | Medium |
| Celery | celery-beat | Manual config | Redis/RabbitMQ | HIGH |
| Taskiq | taskiq-crontab | Built-in | Multiple | Medium |
| RQ | Built-in (v2.5+) | Configurable | Redis | Low |

#### PICK: Huey (SQLite backend at launch)

**Why:** Zero external dependencies — SQLite backend means no Redis needed. Built-in cron, retry, task chains. Single worker process. Setup in 2-4 hours.

**Critical finding:** ARQ is in maintenance-only mode as of 2025. Not recommended for new projects.

**Upgrade path:** Swap SQLite→Redis backend (one-line change) when needed. Or move to Inngest (managed, Python SDK, $0-75/mo) for zero-ops.

---

### CATEGORY 6: Caching

#### PICK: PostgreSQL materialized views at launch. Upstash Redis when needed.

PostgreSQL handles everything at 150 users. Add Upstash Redis (free tier: 500K commands/mo) when dashboard queries exceed 1 second or rate limiting needs persistence across deploys.

---

### CATEGORY 7: Search

#### PICK: PostgreSQL native (tsvector + GIN + pg_trgm) at launch

At <50K records, PG native search handles property/contact/deal search with sub-100ms latency. Add Meilisearch ($30/mo cloud) or Typesense (self-hosted, $0) when users complain or records exceed 100K.

---

### CATEGORY 8: Hosting / Deployment

#### PICK: Railway (stay)

Best solo-dev DX. Usage-based pricing. Native worker support. Huey worker deploys as separate service on same project canvas. $5-10/mo at startup.

---

### CATEGORY 9: Real-Time

#### PICK: Not needed yet. Keep SSE for AI chat.

Pipeline real-time only matters when teams exist (Wave 9+). 30-second polling is indistinguishable from real-time for small RE investor teams.

---

### CATEGORY 10: PDF Generation

#### PICK: WeasyPrint + server-side SVG charts

Pure Python. HTML/CSS templates → PDF. Custom fonts via @font-face. SVGs from matplotlib/Plotly render as vector graphics. No Chromium binary. $0.

**Upgrade path:** Gotenberg (Docker) if WeasyPrint's CSS support proves insufficient.

---

### CATEGORY 11: Offline Mobile Database

#### PICK: PowerSync

Syncs directly with PostgreSQL. Capacitor SDK available. Free tier (2GB sync/mo). Self-hosted Open Edition at $0.

**Fallback:** @capacitor-community/sqlite with manual sync if PowerSync's Capacitor SDK isn't production-ready for Wave 7.

---

## 3. Final Recommended Stack

```
┌─────────────────────────────────────────────────────┐
│                  THE PARCEL STACK                     │
├─────────────────────────────────────────────────────┤
│                                                      │
│  DATABASE:        Railway PostgreSQL (PG18 HA)       │
│                   + PostGIS + pgvector + pg_trgm     │
│                                                      │
│  VECTORS:         pgvector (same instance)           │
│                                                      │
│  FILE STORAGE:    Cloudflare R2                       │
│                                                      │
│  AUTH:            Clerk (or keep custom + enhance)    │
│                                                      │
│  BACKGROUND JOBS: Huey + SQLite backend              │
│                   → Redis backend when needed         │
│                                                      │
│  CACHING:         PostgreSQL materialized views       │
│                   → Upstash Redis when needed         │
│                                                      │
│  SEARCH:          PostgreSQL tsvector + pg_trgm       │
│                   → Meilisearch when needed           │
│                                                      │
│  PDF GENERATION:  WeasyPrint + SVG charts             │
│                                                      │
│  REAL-TIME:       SSE (existing) + polling            │
│                                                      │
│  HOSTING:         Railway (API + workers)             │
│                   Vercel (frontend, existing)          │
│                                                      │
│  OFFLINE (Wave 7): PowerSync → Capacitor SQLite      │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## 4. Total Cost at Scale

| Scale | DB | Storage | Auth | Jobs | Cache | Search | Hosting | Total |
|-------|-----|---------|------|------|-------|--------|---------|-------|
| **100 users** | $15-25 | $0 (R2 free) | $0 (Clerk free) | $0 (Huey+SQLite) | $0 (PG views) | $0 (PG native) | $5-10 | **$20-35/mo** |
| **1K users** | $40-70 | $0-1 | $0 | $0-5 (+ Redis) | $0-3 (Upstash) | $0 | $10-20 | **$50-100/mo** |
| **10K users** | $150-300 | $3-5 | $0 | $5-15 | $5-10 | $0-30 | $20-40 | **$185-400/mo** |

At 10K users paying $29-149/mo, revenue is $29K-$149K/mo. Infrastructure at $185-400/mo is 0.3-1.4% of revenue.

---

## 5. Migration Plan from Current Stack

| Component | Current | Recommended | Effort | When |
|-----------|---------|-------------|--------|------|
| Database | Railway PG | **Keep** | None | — |
| Extensions | None | PostGIS + pgvector + pg_trgm | `CREATE EXTENSION` (5 min) | Wave 0 |
| File storage | AWS S3 | **Cloudflare R2** | Change endpoint + creds (~1 hr) | Wave 0 |
| Auth | Custom JWT | **Clerk or enhance custom** | 2-3 days (Clerk) or 1-2 days (enhance) | Wave 0-1 |
| Background jobs | In-process BackgroundTasks | **Huey** | Add worker + refactor doc processing (~4 hrs) | Wave 0 |
| Caching | None | PG materialized views | Add views (~2 hrs) | Wave 1 |
| Search | `ilike()` | tsvector + GIN + pg_trgm | Add columns + indexes (~2 hrs) | Wave 1 |
| PDF | Client-side jsPDF | WeasyPrint | Build templates (~8 hrs) | Wave 3 |
| Real-time | SSE for chat | Keep SSE | None | — |
| Offline | N/A | PowerSync | Build in Wave 7 | Wave 7 |

**Total Wave 0 migration effort: ~1-3 days** (file storage + auth decision + Huey setup).

---

## 6. "What Would I Regret?"

| Choice | Regret Scenario | Likelihood | Mitigation |
|--------|----------------|-----------|------------|
| **Railway PG** | Railway raises prices or degrades | Low | PG-to-PG to Neon/Crunchy (2 hrs) |
| **pgvector** | >5M vectors, index builds slow writes | Very low | Qdrant Cloud ($25/mo) |
| **R2** | Need advanced S3 lifecycle features | Low | Migrate to S3 in hours (same API) |
| **Clerk** | Price hike or shutdown; tight UI coupling | Medium | Export users, rebuild auth (1-2 weeks) |
| **Custom auth (if kept)** | Security vulnerability; weeks on auth not product | Medium | Security audit discipline required |
| **Huey** | Need async-native for high concurrency | Low-Med | Swap to Redis backend or Taskiq |
| **WeasyPrint** | CSS edge cases it can't render | Medium | Gotenberg (Docker) as drop-in |
| **PG native search** | Users hate search quality | Low-Med | Add Meilisearch in 1 day |
| **No Redis at launch** | Dashboard slow, rate limits reset on deploy | Low | Upstash in 1 hour |
| **PowerSync** | Capacitor SDK immature at Wave 7 | Medium | @capacitor-community/sqlite + manual sync |

---

## 7. Irreversible vs Reversible Decisions

### Hard to change later:
| Decision | Why | Recommendation |
|----------|-----|----------------|
| **Auth provider** | Sessions, hashes, OAuth, frontend UI all couple to it | Decide in Wave 0. If Clerk, do it before more users sign up. |
| **Database engine** | Schema, migrations, ORM, extensions all couple to PostgreSQL | Already on PG. Stay. Every option points to PostgreSQL. |
| **Primary data model** | Property-centric vs deal-centric affects everything | Commit to Property-as-root in Wave 0. Most important architectural decision. |

### Easy to swap later:
| Decision | Why |
|----------|-----|
| File storage | S3 API is universal. R2↔S3↔B2 interchangeable. |
| Caching | Redis protocol is universal. Upstash↔Railway Redis↔Dragonfly. |
| Search | Can add Meilisearch alongside PG search anytime. |
| Background jobs | Huey→Taskiq→Celery migration is straightforward. |
| PDF engine | Template-based — swap renderer without changing templates. |
| Hosting | Docker/Procfile deploys work anywhere. |

---

## Summary

The research across 80+ tools converges on a clear pattern: **PostgreSQL is the center of gravity.** It handles relational data, geospatial, vectors, RLS, full-text search, and caching (materialized views) — six of twelve requirements — in a single service. Every other layer is chosen to minimize additional services and operational complexity for a solo founder.

The total stack at launch costs **$20-35/mo** and scales to **$185-400/mo** at 10K users without architectural changes. The only decision requiring careful thought is auth (Clerk vs. custom) — everything else is either staying put (Railway, PG) or a low-risk addition (R2, Huey, WeasyPrint).

---

*Synthesized from 4 parallel research agents. Full comparison tables in sub-reports: `32-database-vector-storage-evaluation.md`, `32-auth-hosting-realtime.md`, `32-file-storage-caching-search.md`, `32-background-jobs-pdf-offline-db.md`.*
