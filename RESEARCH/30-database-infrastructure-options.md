# 30 — Database & Infrastructure Options Research

> Researched: April 2, 2026
> Context: Solo-founder SaaS targeting 150-10K users over 2 years. Currently Railway + PostgreSQL + FastAPI. ~26+ tables, modular architecture.

---

## TABLE OF CONTENTS

1. [Option A: PostgreSQL on Railway (current)](#option-a-postgresql-on-railway)
2. [Option B: Supabase](#option-b-supabase)
3. [Option C: Neon (serverless PostgreSQL)](#option-c-neon)
4. [Option D: PlanetScale (MySQL)](#option-d-planetscale)
5. [Option E: Pinecone (vector DB)](#option-e-pinecone)
6. [Option F: Redis / Caching](#option-f-redis--caching)
7. [Option G: SQLite for iOS Offline](#option-g-sqlite-for-ios-offline)
8. [Background Job Processing](#background-job-processing)
9. [File Storage](#file-storage)
10. [Search](#search)
11. [Auth](#auth)
12. [Recommendations Summary](#recommendations-summary)

---

## OPTION A: PostgreSQL on Railway

**What you have today.** Railway runs PostgreSQL in a container, giving you full control over extensions.

### Extension Support

| Extension | Supported? | How |
|-----------|-----------|-----|
| **PostGIS** | Yes | Custom Docker image or HA template |
| **pgvector** | Yes | One-click template or `CREATE EXTENSION vector;` on PG14+ |
| **pg_trgm** | Yes | Built-in |
| **pg_cron** | Requires custom image | Not pre-installed |

Railway offers a **PostgreSQL 18 HA Cluster** template pre-configured with both pgvector and PostGIS. For combining multiple extensions, the recommended approach is a custom Dockerfile.

### Pricing (April 2026)

**Plan structure:**
- **Hobby plan**: $5/mo subscription + usage
- **Pro plan**: $20/mo subscription + usage
- Hobby plan has a 5 GB volume limit for databases

**Usage-based compute:**
- vCPU: $0.000231/min (~$0.028/vCPU-hour)
- RAM: $0.000116/min/GB (~$0.014/GB-hour)
- Storage: $0.25/GB-month (persistent volumes)
- Egress: $0.10/GB

**Estimated monthly costs at scale:**

| Scale | DB Size | Compute Est. | Storage | Total Est. |
|-------|---------|-------------|---------|------------|
| 150 users | ~1 GB | ~$5-8 | $0.25 | **$10-15/mo** (+ plan) |
| 1K users | ~5 GB | ~$15-20 | $1.25 | **$20-30/mo** |
| 10K users | ~25-50 GB | ~$40-80 | $6-12 | **$60-100/mo** |

A typical SaaS PostgreSQL database runs ~$18/mo on Railway.

### Connection Limits

- Default: **100 max connections** (PostgreSQL default)
- Adjustable via `ALTER SYSTEM SET max_connections = 200;` + restart
- No built-in connection pooler — you must run PgBouncer yourself as a separate service
- No plan-specific connection limits documented

### Backup & Recovery

- **Native backups feature** recently added
- No built-in PITR — requires PostgreSQL + Barman template
- Community templates exist for S3/GCS automated backups
- Manual `pg_dump` always available

### Read Replicas

- Supported via **repmgr** template
- Primary = node1, replicas numbered from node2
- Limitation: **standby promotion does not work** currently
- Requires manual setup

### Verdict on Railway PostgreSQL

**Pros:**
- You're already on it — zero migration effort
- Full extension control via Docker
- Pay-per-use keeps early costs low
- Flexible compute scaling

**Cons:**
- No managed connection pooling
- Read replicas are DIY and limited
- No built-in PITR without extra setup
- Backup story requires extra work
- No dashboard/admin UI for the database

**Solo-dev complexity: LOW** (you already know it)

---

## OPTION B: Supabase

### Architecture Overview

Supabase is an open-source Firebase alternative built on PostgreSQL. It bundles:
- **PostgreSQL database** (with 50+ extensions)
- **Auth** (email/password, OAuth, magic links, SSO)
- **Storage** (S3-style file storage with access policies)
- **Realtime** (WebSocket subscriptions on database changes)
- **Edge Functions** (Deno-based serverless functions)
- **Studio** (web-based database admin UI)
- **PostgREST** (auto-generated REST API from your schema)

All services share the same PostgreSQL instance.

### Extension Support

| Extension | Status |
|-----------|--------|
| **PostGIS** | Pre-installed, enable with `CREATE EXTENSION` |
| **pgvector** | Pre-installed, optimized configs |
| **pg_cron** | Available |
| **pg_trgm** | Available |
| **pgjwt** | Available |
| Total | **50+ extensions** available |

### Row-Level Security

Supabase makes RLS a first-class citizen:
- Built-in helper functions: `auth.uid()`, `auth.jwt()`, `auth.role()`
- Policies integrate directly with Supabase Auth
- pgvector queries respect RLS — vector similarity search scoped per user
- Studio UI for creating/managing policies
- **This is the same RLS as standard PostgreSQL** — no vendor lock-in on the policy definitions

### Built-in Auth

- Email/password, magic links, phone OTP
- OAuth: Google, GitHub, Twitter, Apple, Azure, Facebook, etc.
- SAML SSO (Team plan+)
- 50,000 MAU included on **Free** plan
- 100,000 MAU included on **Pro** plan
- Overage: $0.00325/MAU
- Deep RLS integration — `auth.uid()` in policies

### Built-in Storage

- S3-style object storage with bucket policies
- Image transformations (resize, crop on-the-fly)
- Signed URLs and public buckets
- **Free**: 1 GB storage, 5 GB egress
- **Pro**: 100 GB storage included, overage $0.021/GB

### Realtime Subscriptions

- WebSocket-based change data capture
- Subscribe to INSERT, UPDATE, DELETE on any table
- Respects RLS policies
- Lightweight, stable connections
- Scales with plan level

### Edge Functions

- Deno-based (TypeScript/JavaScript only — **not Python**)
- Cold starts: **200-400ms** (fast, but requires warming for latency-sensitive endpoints)
- CPU limit: **2 seconds** per request
- Execution timeout: **60 seconds**
- Max bundle size: **20 MB**
- **500K invocations/mo on Free, 2M on Pro**
- Best for: short-lived, idempotent operations
- NOT for: long-running background jobs

### Pricing (April 2026)

| Feature | Free | Pro ($25/mo) | Team ($599/mo) |
|---------|------|-------------|----------------|
| Database | 500 MB | 8 GB (+$0.125/GB) | 8 GB (+$0.125/GB) |
| File Storage | 1 GB | 100 GB (+$0.021/GB) | 100 GB |
| Auth MAUs | 50,000 | 100,000 (+$0.00325) | 100,000 |
| Edge Functions | 500K/mo | 2M/mo | 2M/mo |
| Realtime | 200 concurrent | 500 concurrent | 500 concurrent |
| DB egress | 5 GB | 250 GB (+$0.09/GB) | 250 GB |
| Projects | 2 | Unlimited | Unlimited |
| Paused on inactivity | Yes (1 week) | No | No |
| Branching | No | No | Yes |
| SOC 2 | No | No | Yes |
| Support | Community | Email | Priority |

**Compute Add-ons (required for production):**

| Instance | vCPU | RAM | Price |
|----------|------|-----|-------|
| Micro | 2 shared | 1 GB | Included ($10 credit) |
| Small | 2 dedicated | 2 GB | $15/mo ($5 after credit) |
| Medium | 2 dedicated | 4 GB | $30/mo ($20 after credit) |
| Large | 4 dedicated | 8 GB | $110/mo ($100 after credit) |

**Real-world production cost**: Typically **$125/mo+** (base $25 + Large compute $100).

### Downsides

1. **Vendor lock-in concerns**: PostgREST API layer, Auth helpers, Storage SDK — all Supabase-specific. However, underlying PostgreSQL is standard.
2. **Reliability**: 41 incidents in last 90 days (17 major, 24 minor). Median duration 1hr 58min. India access disruption in Feb 2026 affected 120K+ developers.
3. **Edge Functions are Deno only** — cannot run Python/FastAPI code
4. **Compute add-ons inflate cost** — the "$25/mo" Pro plan realistically costs $125/mo+ for production
5. **Free plan projects pause** after 1 week of inactivity

### Self-Hosting Supabase

- Official Docker stack: Postgres, Realtime, Auth, Storage, Edge Functions, Studio
- Runs on a ~$50/mo Hetzner VPS (8 vCPU / 32 GB RAM) vs ~$410/mo on Supabase Cloud
- **Community-supported only** — no official support
- You own backups, security patches, upgrades, scaling
- Viable for a solo dev with DevOps comfort, but adds significant maintenance burden

### Migration Effort from Railway

**MODERATE-HIGH.** You'd need to:
- Migrate PostgreSQL schema (straightforward)
- Adopt Supabase Auth or keep your existing auth
- Adopt Supabase Storage or keep S3/R2
- Rewrite any Python Edge Function logic (Deno only)
- Learn PostgREST API conventions or ignore them and use direct PG connection
- Your FastAPI backend would connect to Supabase PostgreSQL directly — this works fine

**Solo-dev complexity: MODERATE** — lots of features to learn, but each one saves you from building it yourself

---

## OPTION C: Neon (Serverless PostgreSQL)

### Architecture

Neon separates storage and compute, enabling:
- **Scale-to-zero**: Compute suspends after idle period, costs nothing when idle
- **Autoscaling**: Compute scales up/down based on load (0-10 CU)
- **Branching**: Instant copy-on-write database branches from any point in time
- **Built-in connection pooling**: PgBouncer included, no extra setup
- Acquired by **Databricks** in May 2025 — prices dropped significantly

### Extension Support

| Extension | Status |
|-----------|--------|
| **PostGIS** | Supported |
| **pgvector** | Supported |
| **TimescaleDB** | Supported |
| **pg_trgm** | Supported |

### Pricing (April 2026, post-Databricks acquisition)

| Feature | Free | Launch ($5/mo min) | Scale ($69/mo) |
|---------|------|--------------------|----------------|
| Compute | 100 CU-hours | $0.14/CU-hour | $0.14/CU-hour |
| Storage | 0.5 GB | $0.35/GB-mo (first 50 GB) | $0.35/GB-mo |
| Branches | Unlimited | 10 per project | 25 per project |
| Autoscaling | Up to 2 CU | Up to 4 CU | Up to 10 CU |
| Scale-to-zero | 5-min idle | Configurable | Configurable |
| PITR | 6 hours | 7 days | 30 days |
| Connection pooling | Built-in | Built-in | Built-in |
| Private networking | No | No | Yes (PrivateLink) |

**1 CU = ~4 GB RAM + associated CPU**

**Cost estimates at scale:**

| Scale | Compute | Storage | Total Est. |
|-------|---------|---------|------------|
| 150 users (light) | ~$5 (Launch min) | ~$0.35 | **~$5-10/mo** |
| 1K users | ~$15-25 | ~$2-5 | **~$20-30/mo** |
| 10K users | ~$69+ (Scale plan) | ~$10-20 | **~$80-100/mo** |

### Cold Start Latency

- **Typical cold start: 300-500ms** (wake from scale-to-zero)
- Consistently under 1 second from first query to response
- Factors: region, database size, network conditions
- For a SaaS with active users, compute stays warm; cold starts only affect first request after idle

### Database Branching

Practical benefits for solo dev:
- **Instant dev/staging environments** without copying data
- Test schema migrations on a branch before applying to production
- Preview branches for PRs
- Point-in-time recovery via branch from any WAL position
- Extra branches beyond plan allowance: $1.50/branch-month

### Comparison to Railway PostgreSQL

| Feature | Railway | Neon |
|---------|---------|------|
| Scale-to-zero | No (always running) | Yes |
| Connection pooling | DIY (PgBouncer) | Built-in |
| Branching | No | Yes |
| PostGIS | Custom Docker | Supported |
| pgvector | Template/Docker | Supported |
| Autoscaling | Manual | Automatic |
| PITR | DIY (Barman) | Built-in (7-30 days) |
| Read replicas | DIY (repmgr) | Built-in |
| Min cost | ~$10-15/mo | $5/mo |
| Cold starts | None | 300-500ms |

### Migration Effort from Railway

**LOW.** Standard PostgreSQL to standard PostgreSQL. Steps:
1. `pg_dump` from Railway
2. `pg_restore` to Neon
3. Update connection string in FastAPI
4. Enable extensions (`CREATE EXTENSION vector; CREATE EXTENSION postgis;`)
5. Done — same SQL, same ORM, same everything

**Solo-dev complexity: LOW** — less to manage than Railway, more built-in features

---

## OPTION D: PlanetScale (MySQL)

### Quick Assessment

| Requirement | MySQL Support |
|-------------|--------------|
| PostGIS equivalent | **No.** MySQL has basic spatial functions but nothing comparable to PostGIS |
| pgvector equivalent | PlanetScale Vectors (MySQL fork) exists, but not standard |
| Row-Level Security | **No native RLS.** Must emulate with views — fragile and error-prone |
| PostgreSQL ecosystem | Entire stack would need rewriting |

PlanetScale has announced a **PostgreSQL offering** (early access), which would support pgvector and RLS. But it's new and unproven.

### Verdict: DO NOT CONSIDER FURTHER

Migrating from PostgreSQL to MySQL would require rewriting every query, losing PostGIS, losing native RLS, and abandoning the pgvector ecosystem. The effort is massive with no clear benefit. PlanetScale's Postgres offering is too new to bet on.

---

## OPTION E: Pinecone (Vector Database)

### What Is Pinecone

Dedicated, fully-managed vector database. Purpose-built for similarity search at scale. You send vectors in, query by similarity, get results back. No SQL, no relations, no transactions.

### Pricing (April 2026)

| Plan | Cost | Includes |
|------|------|----------|
| Starter | **Free** | 2 GB storage, 2M writes/mo, 1M reads/mo, 5 indexes |
| Standard | **$50/mo minimum** | Multi-cloud, pay-as-you-go beyond minimum |
| Enterprise | **$500/mo minimum** | 99.95% SLA, private networking |

### Performance vs pgvector

At Parcel's scale (<100K document chunks):
- **pgvector with HNSW index**: 5-20ms queries at 95%+ recall on 1M vectors
- **Pinecone**: Single-digit ms p50 latency
- **The difference is negligible** — both return results faster than the embedding API call that precedes the search

At larger scales (10M+ vectors), Pinecone's managed infrastructure has advantages. But pgvector with pgvectorscale has been benchmarked at **28x lower p95 latency** and **16x higher throughput** than Pinecone's s1 index at 99% recall.

### When Pinecone Makes Sense

- 10M+ vectors with complex filtering
- Team without PostgreSQL expertise managing vectors
- Need for managed vector indexing across multiple cloud regions

### For Parcel (<10K users, <100K document chunks)

**Pinecone is NOT justified.** pgvector handles this workload trivially:
- <100K chunks = well within pgvector sweet spot (<2M vectors)
- Same database = simpler architecture, no extra service
- RLS on vectors = automatic with pgvector, complex with Pinecone
- Cost = $0 extra (part of your PostgreSQL instance)
- Pinecone would add $50/mo+ for zero performance benefit

### Verdict: USE pgvector

No need for a separate vector database at this scale. Revisit only if you exceed 2M+ vectors.

---

## OPTION F: Redis / Caching

### What Should Be Cached in Parcel

| Data Type | Cache Value | TTL |
|-----------|------------|-----|
| Dashboard aggregations | HIGH (expensive queries) | 5-15 min |
| Property list results | MEDIUM | 2-5 min |
| User session data | HIGH | 24 hours |
| Rate limiting (API, webhooks) | HIGH | Per-window |
| Geocoding results | HIGH | 30 days |
| Computed deal metrics | MEDIUM | On-change invalidation |

### Redis on Railway

- Same usage-based pricing as other Railway services
- Runs as a separate service on your project canvas
- ~$3-5/mo for light usage
- No managed clustering

### Upstash (Serverless Redis)

| Feature | Details |
|---------|---------|
| Pricing | **$0.20 per 100K commands** |
| Free tier | **500K commands/mo free** |
| Storage | $0.25/GB |
| Fixed plans | From $10/mo (250 MB) |
| Bandwidth | Up to 200 GB/mo free |
| Features | Multi-region, HTTP API, TLS, persistent |
| Extra services | QStash (message queue), Vector DB, Workflow engine |

Upstash is ideal for Parcel: pay-per-use means near-zero cost at launch, scales naturally.

### Dragonfly

- Drop-in Redis replacement, 100% API compatible
- **25x higher throughput** than Redis single-process
- Multi-threaded C++ architecture
- Open source (Business Source License)
- **Dragonfly Cloud** for managed hosting
- **Overkill for Parcel's scale** — Redis/Upstash handle the load easily

### Is Redis Necessary at Launch?

**No.** You can defer Redis until you actually observe:
- Dashboard queries taking >500ms
- Need for rate limiting on webhooks
- Session management beyond JWT
- Background job queue requiring a broker

FastAPI + PostgreSQL handles the launch workload. Add Upstash when the first performance bottleneck appears — the integration takes ~1 hour.

**Solo-dev complexity: VERY LOW** (when using Upstash)

---

## OPTION G: SQLite for iOS Offline

### Capacitor SQLite Plugins

**@capacitor-community/sqlite** (v7.0.2):
- Actively maintained, production-ready
- Android, iOS, Electron support
- Features: 256-bit AES encryption, ACID transactions, FTS, auto-migrations
- Works with Capacitor 5+

### What Data Needs Offline for D4D

| Data | Offline Need | Size Estimate |
|------|-------------|---------------|
| Property addresses + GPS coords | **Must have** | Small (~1 KB/property) |
| D4D route tracking points | **Must have** | ~50 bytes/point |
| Property status/tags | **Must have** | Tiny |
| D4D photos (taken offline) | **Must store locally** | ~2-5 MB each |
| Contact info for skip trace | Nice to have | Small |
| Full property analysis | No (fetch on demand) | N/A |

Estimated offline dataset per user: **5-50 MB** (excluding photos)

### Sync Strategies

1. **Manual sync** — User taps "Sync" when back online. Simplest to build.
2. **Background sync** — Queue changes locally, push when connectivity returns. Better UX.
3. **PowerSync** — Dedicated Postgres-to-SQLite sync engine:
   - Bi-directional sync
   - Capacitor SDK (alpha as of April 2026)
   - Real-time streaming from Postgres
   - Works with Supabase and standard PostgreSQL
   - Production-grade conflict resolution

### Recommended Approach

**Phase 1 (launch):** `@capacitor-community/sqlite` with manual sync. Store D4D routes and photos locally, upload when online.

**Phase 2 (if demand exists):** Evaluate PowerSync for real-time bi-directional sync. Their Capacitor SDK should be stable by then.

**Solo-dev complexity: MODERATE** — SQLite is straightforward, sync logic is where complexity lives

---

## BACKGROUND JOB PROCESSING

### Comparison for Python/FastAPI

| Feature | Celery + Redis | ARQ | Dramatiq | FastAPI BackgroundTasks |
|---------|---------------|-----|----------|----------------------|
| Broker | Redis or RabbitMQ | Redis only | Redis or RabbitMQ | None (in-process) |
| Async native | No (uses threads) | **Yes (asyncio)** | No | Yes |
| Performance | Good | Good for I/O | **~10x faster than RQ** | Limited |
| Retry/backoff | Manual config | Built-in | **Built-in exponential** | None |
| Scheduling | Yes (celery-beat) | Yes (cron) | Via APScheduler | No |
| Dashboard | Flower | No | No (Dramatiq dashboard exists) | No |
| Setup complexity | **HIGH** | **LOW** | **MODERATE** | **NONE** |
| Dependencies | Heavy | Minimal | Moderate | Zero |

### Railway Background Workers

Railway handles workers as **separate services on the same project canvas**. Each worker is a standalone process billed by CPU/RAM usage. No dedicated "worker" type — just deploy another service with a different start command.

Example: Your FastAPI app = Service 1, your Celery/ARQ worker = Service 2. Both share the same PostgreSQL and Redis services.

Idle workers cost near-zero thanks to per-second billing.

### Trigger.dev

- Managed background jobs with TypeScript/JavaScript
- Can execute Python scripts with auto package installation
- Elastic scaling, no timeouts, automatic retries
- **Not a native Python solution** — awkward for a FastAPI stack
- Better suited for Node.js/Next.js backends

### Recommendation for Parcel

**Start with FastAPI BackgroundTasks** for simple webhook handling and notifications.

**Graduate to ARQ** when you need:
- Obligation monitoring (recurring compliance checks)
- PDF generation queues
- Bulk skip trace processing
- D4D photo processing

ARQ is the best fit because:
- Native asyncio (matches FastAPI)
- Redis-only (single dependency)
- Lightweight, minimal config
- Perfect for solo dev

Deploy ARQ worker as a separate Railway service. Total added cost: ~$3-5/mo for the worker + Upstash Redis.

**Solo-dev complexity: LOW** (with ARQ)

---

## FILE STORAGE

### Pricing Comparison

| Provider | Storage/GB/mo | Egress/GB | PUT/1K | GET/1K |
|----------|--------------|-----------|--------|--------|
| **AWS S3** | $0.023 | $0.09 (after 100 GB free) | $0.005 | $0.0004 |
| **Cloudflare R2** | $0.015 | **FREE** | $0.0045 | $0.00036 |
| **Supabase Storage** | $0.021 | $0.09 | Included | Included |

### Cost at Scale

| Files | Avg Size | Total Storage | S3 Cost/mo | R2 Cost/mo |
|-------|----------|---------------|-----------|-----------|
| 1K | 2 MB | 2 GB | $0.05 + egress | $0.03 |
| 10K | 2 MB | 20 GB | $0.46 + egress | $0.30 |
| 100K | 2 MB | 200 GB | $4.60 + egress | $3.00 |

### Cloudflare R2 Free Tier

- **10 GB storage** (permanent, monthly reset)
- 1M Class A ops/mo (PUT, POST)
- 10M Class B ops/mo (GET)
- Egress: **always free**
- S3-compatible API — use any S3 SDK

### Where Should Files Live?

| File Type | Storage | Rationale |
|-----------|---------|-----------|
| D4D photos | R2 | Large files, frequent reads, free egress |
| Document uploads | R2 | User-facing, need signed URLs |
| Generated PDFs | **Regenerate on demand** | Store the data, not the PDF. Generate fresh each time with jsPDF |
| RAG document chunks | PostgreSQL (text column) | Already in DB for pgvector embeddings |
| Profile pictures | R2 | Small, CDN-cacheable |

### Recommendation: Cloudflare R2

- **97% cheaper than S3** for egress-heavy workloads
- S3-compatible = same boto3 SDK you'd use for S3
- Free tier covers Parcel through 10K users easily
- No vendor lock-in (S3 API is universal)

**Solo-dev complexity: LOW** — identical to S3 integration

---

## SEARCH

### PostgreSQL Native Search

**tsvector + GIN indexes:**
- Full-text search with ranking (`ts_rank`)
- Language-aware stemming
- Boolean operators (AND, OR, NOT)
- Handles **millions of documents** with sub-second queries
- GIN lookups are **3x faster** than GiST

**pg_trgm for fuzzy matching:**
- Trigram-based similarity matching
- Great for autocomplete and typo tolerance
- `%` operator for similarity, `<->` for word distance
- Works with GIN or GiST indexes

### Limitations of PostgreSQL Search

- Limited faceting/filtering capabilities
- Basic highlighting compared to dedicated engines
- Ranking algorithms less customizable
- tsvector limit: ~1 MiB per document
- GIN index updates are slow on write-heavy workloads
- No built-in synonyms or "did you mean?" suggestions

### Meilisearch

- Open source (MIT license), self-hostable free
- **Cloud pricing**: Build plan $30/mo (50K searches, 100K docs), Pro $300/mo
- Typo tolerance, faceted search, filters built-in
- Sub-50ms search responses
- RESTful API

### Typesense

- Open source, self-hostable free
- **Cloud pricing**: From $7/mo (0.5 GB RAM) to $58/mo (4 GB RAM production)
- Resource-based pricing (RAM + CPU), no per-search charges
- Typo tolerance, faceted search, geosearch built-in

### When Does PostgreSQL Search Stop Being Sufficient?

| Scale | PostgreSQL | Dedicated Search |
|-------|-----------|-----------------|
| <10K properties | More than enough | Unnecessary |
| 10K-100K properties | Still fine with good indexes | Nice to have for UX |
| 100K+ properties | Starts to strain | Recommended |
| Need autocomplete | pg_trgm handles it | Better UX |
| Need faceted search | Manual SQL | Built-in |

### Recommendation for Parcel

**Start with PostgreSQL native search.** At <10K users with ~50K-200K searchable records, tsvector + GIN + pg_trgm handles everything:
- Property search by address, city, state
- Contact search by name, phone, email
- Deal search by status, type, address

Add **Typesense** (self-hosted on Railway, free) or **Meilisearch Cloud** ($30/mo) only when:
- Users complain about search quality
- You need faceted filtering (by county, property type, status)
- You exceed 100K searchable records

**Solo-dev complexity: LOW** (PostgreSQL native) / **MODERATE** (adding dedicated search)

---

## AUTH

### Option Comparison

| Feature | Clerk | Supabase Auth | Roll Your Own (FastAPI) |
|---------|-------|--------------|----------------------|
| Email/password | Yes | Yes | Build it (~2-4 hours) |
| Google OAuth | Yes | Yes | Build it (~2-4 hours) |
| Magic links | Yes | Yes | Build it (~4-8 hours) |
| Team invites | Yes (Organizations) | Manual | Build it (~8-16 hours) |
| API keys | Yes | No (build yourself) | Build it (~4-8 hours) |
| Pre-built UI components | Yes (React) | No (build your own forms) | No |
| RLS integration | No (separate user store) | **Deep** (`auth.uid()` in policies) | Manual (JWT claims) |
| SSO/SAML | Yes (Pro+) | Yes (Team plan) | Complex (~40+ hours) |

### Pricing at Scale

| MAU | Clerk | Supabase Auth | Roll Your Own |
|-----|-------|--------------|---------------|
| 100 | **$0** | **$0** | $0 (your server cost) |
| 1,000 | **$0** | **$0** | $0 |
| 10,000 | **$0** | **$0** | $0 |
| 50,000 | **$0** | **$0** | $0 |
| 100,000 | $1,000/mo | $162/mo ($25 base + MAU overage) | $0 |

Clerk's Feb 2026 update: **50,000 MAU free** on all plans. Pro plan $20/mo only needed for advanced features.

### Rolling Your Own Auth (FastAPI)

**Libraries:** python-jose[cryptography] + passlib[bcrypt] + python-multipart

**Effort estimate:**
- Basic email/password + JWT: **1-2 days**
- Add Google OAuth: **+1 day**
- Add magic links (email): **+1 day**
- Add password reset flow: **+0.5 day**
- Add team invites: **+2-3 days**
- Add API keys: **+1 day**
- **Total: ~6-8 days** for full auth system

**Risks:**
- Security vulnerabilities if you miss edge cases (token revocation, timing attacks, rate limiting)
- Ongoing maintenance burden (security patches, new OAuth providers)
- JWTs are stateless = hard to revoke (need a blacklist strategy)
- No pre-built UI components

### Recommendation for Parcel

**If using Supabase:** Use Supabase Auth. Free, deep RLS integration, sufficient features.

**If staying on Railway (no Supabase):** Two viable paths:

1. **Clerk** — Best if you want zero auth headaches. Free up to 50K MAU, pre-built UI, Google OAuth + magic links out of the box. Only costs money at massive scale. Downside: separate user store from your database, requires syncing user data.

2. **Roll your own** — Best if you want full control and your auth needs are simple (email/password + Google OAuth). 6-8 days of work, then it's yours forever. Use python-jose + passlib. Downside: ongoing security maintenance.

For a solo founder building quickly: **Clerk for launch, migrate to custom auth later if needed.**

**Solo-dev complexity: LOW** (Clerk) / **MODERATE** (roll your own) / **LOW** (Supabase Auth if using Supabase)

---

## RECOMMENDATIONS SUMMARY

### The Pragmatic Stack for Parcel (Solo Dev, 150-10K Users)

#### Database: Neon (serverless PostgreSQL)

**Why Neon over Railway PostgreSQL:**
- Built-in connection pooling (PgBouncer) — one less thing to manage
- Database branching for safe migrations
- Built-in PITR (7-30 days vs DIY on Railway)
- Autoscaling — handles traffic spikes automatically
- Scale-to-zero — saves money during low-traffic periods
- PostGIS + pgvector both supported
- Migration from Railway: 1-2 hours (pg_dump/pg_restore + update connection string)
- Cost: comparable or cheaper ($5/mo minimum vs ~$10-15/mo on Railway)

**Why not Supabase:**
- You already have a FastAPI backend — Supabase's value is in replacing your backend
- Edge Functions are Deno-only (useless for Python)
- Real production cost is $125/mo+ (vs $20-30/mo for Neon)
- 41 incidents in 90 days is concerning for a critical business app
- Adds complexity (learn PostgREST, Auth, Storage APIs) without replacing your existing stack

#### Vectors: pgvector (in your PostgreSQL)

Do not add Pinecone. At <100K chunks, pgvector is faster, cheaper ($0 extra), and supports RLS out of the box.

#### Caching: Defer, then Upstash

Skip Redis at launch. Add Upstash when you hit your first performance bottleneck. Free tier (500K commands/mo) covers initial needs.

#### File Storage: Cloudflare R2

Free egress, S3-compatible, generous free tier (10 GB). Use for D4D photos, document uploads, and any user-facing files. Regenerate PDFs on demand rather than storing them.

#### Background Jobs: FastAPI BackgroundTasks, then ARQ

Start with built-in BackgroundTasks. Graduate to ARQ + Upstash Redis when you need obligation monitoring, bulk operations, or job retry logic.

#### Search: PostgreSQL native (tsvector + pg_trgm)

More than sufficient for <10K users. Add Typesense (self-hosted, free) when you need faceted search or exceed 100K records.

#### Auth: Clerk

50K MAU free, pre-built UI, Google OAuth + magic links. Zero auth code to maintain. Migrate to custom auth only if Clerk becomes too expensive (unlikely before 50K users).

#### Offline (iOS D4D): @capacitor-community/sqlite

Manual sync for launch. Evaluate PowerSync for real-time sync later.

### Estimated Monthly Costs

| Scale | Database | Storage | Cache | Auth | Workers | Total |
|-------|---------|---------|-------|------|---------|-------|
| 150 users | $5 (Neon) | $0 (R2 free) | $0 | $0 (Clerk free) | $0 | **~$5/mo** |
| 1K users | $20-30 (Neon) | $0 (R2 free) | $0-3 (Upstash) | $0 | $3-5 | **~$25-40/mo** |
| 10K users | $80-100 (Neon) | $3-5 (R2) | $5-10 (Upstash) | $0 | $10-20 | **~$100-135/mo** |

### Migration Priority

1. **Now**: Set up Cloudflare R2 (parallel to current work, no dependency on DB)
2. **Before launch**: Migrate PostgreSQL from Railway to Neon (1-2 hours)
3. **At launch**: Use Clerk for auth, FastAPI BackgroundTasks for jobs
4. **Post-launch (when needed)**: Add Upstash Redis, ARQ workers
5. **At scale (1K+ users)**: Evaluate dedicated search, PowerSync for offline

---

## SOURCES

### Railway
- [Railway PostgreSQL Docs](https://docs.railway.com/databases/postgresql)
- [Railway Pricing](https://railway.com/pricing)
- [Railway Pricing Plans Docs](https://docs.railway.com/pricing/plans)
- [Railway pgvector Deploy](https://railway.com/deploy/postgres-with-pgvector-engine)
- [Railway PostgreSQL 18 HA Cluster](https://railway.com/deploy/postgresql-18-ha-cluster-ai-and-gis-read)
- [Railway PostgreSQL Backups](https://blog.railway.com/p/automated-postgresql-backups)
- [Railway PostgreSQL Max Connections](https://station.railway.com/questions/postgre-sql-max-connections-limit-76df3d31)

### Supabase
- [Supabase Pricing](https://supabase.com/pricing)
- [Supabase RLS Docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase pgvector Docs](https://supabase.com/docs/guides/database/extensions/pgvector)
- [Supabase Extensions](https://supabase.com/features/postgres-extensions)
- [Supabase Edge Functions Limits](https://supabase.com/docs/guides/functions/limits)
- [Supabase Self-Hosting](https://supabase.com/docs/guides/self-hosting)
- [Supabase Compute Add-ons](https://supabase.com/docs/guides/platform/compute-and-disk)
- [Supabase Status](https://status.supabase.com/)
- [Supabase Pricing Breakdown (MetaCTO)](https://www.metacto.com/blogs/the-true-cost-of-supabase-a-comprehensive-guide-to-pricing-integration-and-maintenance)

### Neon
- [Neon Pricing](https://neon.com/pricing)
- [Neon Plans Docs](https://neon.com/docs/introduction/plans)
- [Neon Latency Benchmarks](https://neon.com/docs/guides/benchmarking-latency)
- [Neon Connection Latency](https://neon.com/docs/connect/connection-latency)
- [Neon Pricing Breakdown (Simplyblock)](https://vela.simplyblock.io/articles/neon-serverless-postgres-pricing-2026/)

### Pinecone
- [Pinecone Pricing](https://www.pinecone.io/pricing/)
- [Pinecone Cost Docs](https://docs.pinecone.io/guides/manage-cost/understanding-cost)
- [pgvector vs Pinecone (Encore)](https://encore.dev/articles/pgvector-vs-pinecone)
- [Why We Replaced Pinecone with pgvector (Confident AI)](https://www.confident-ai.com/blog/why-we-replaced-pinecone-with-pgvector)

### Redis / Caching
- [Upstash Pricing](https://upstash.com/pricing/redis)
- [Upstash New Pricing Blog](https://upstash.com/blog/redis-new-pricing)
- [Dragonfly GitHub](https://github.com/dragonflydb/dragonfly)
- [Redis vs Dragonfly Comparison](https://oneuptime.com/blog/post/2026-01-21-redis-vs-dragonfly/view)

### File Storage
- [Cloudflare R2 Pricing](https://developers.cloudflare.com/r2/pricing/)
- [R2 Pricing Calculator](https://r2-calculator.cloudflare.com/)
- [AWS S3 Pricing](https://aws.amazon.com/s3/pricing/)
- [Supabase Storage Pricing](https://supabase.com/docs/guides/storage/pricing)

### Search
- [PostgreSQL Full-Text Search Docs](https://www.postgresql.org/docs/current/textsearch-tables.html)
- [GIN Index Analysis (pganalyze)](https://pganalyze.com/blog/gin-index)
- [Meilisearch vs Typesense](https://www.meilisearch.com/blog/meilisearch-vs-typesense)
- [Typesense Pricing](https://www.meilisearch.com/blog/typesense-pricing)

### Auth
- [Clerk Pricing](https://clerk.com/pricing)
- [Clerk Feb 2026 Pricing Update](https://clerk.com/changelog/2026-02-05-new-plans-more-value)
- [Clerk vs Supabase Auth (BuildMVPFast)](https://www.buildmvpfast.com/compare/supabase-vs-clerk)
- [FastAPI OAuth2 JWT Docs](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/)

### Background Jobs
- [Celery vs ARQ (Leapcell)](https://leapcell.io/blog/celery-versus-arq-choosing-the-right-task-queue-for-python-applications)
- [Dramatiq Motivation](https://dramatiq.io/motivation.html)
- [Python Task Queue Benchmark](https://github.com/steventen/python_queue_benchmark)
- [Trigger.dev Docs](https://trigger.dev/docs/introduction)

### Mobile / Offline
- [@capacitor-community/sqlite GitHub](https://github.com/capacitor-community/sqlite)
- [PowerSync Capacitor SDK](https://docs.powersync.com/client-sdks/reference/capacitor)
- [PowerSync Overview](https://www.powersync.com)
