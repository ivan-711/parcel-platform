# Backend Infrastructure & Database Strategy — Codex

**Date:** 2026-04-02  
**Prepared by:** Codex

## Status note

This document captures an earlier Codex recommendation pass.  
**Founder decisions on 2026-04-03 override the original stack recommendation here.**

### Founder-locked backend stack

- **Primary database:** Supabase Postgres
- **Geospatial:** `PostGIS`
- **Vectors:** `pgvector`
- **Database isolation:** Postgres RLS
- **App hosting:** Railway
- **Auth:** Clerk
- **Background jobs:** Dramatiq
- **Redis/cache/rate limits:** Upstash Redis from day one
- **Search:** PostgreSQL `tsvector` + `GIN` + `pg_trgm`
- **File storage:** Cloudflare R2
- **PDF generation:** Playwright now, Gotenberg later if document conversion becomes necessary

Treat that stack as canonical over the original recommendation in this document.

## Inputs reviewed

- `SAD/FINAL-PRODUCT-BLUEPRINT.md`
- `SAD/CODEX-FINAL-PRODUCT-BLUEPRINT.md`
- `backend/` codebase scan
- Official vendor docs and pricing pages for Railway, Supabase, Neon, PlanetScale, CockroachDB, Turso, Clerk, Trigger.dev, Cloudflare R2, AWS S3, Pinecone, Qdrant, and related products

## Current backend reality

Before picking infrastructure, the current repo matters:

- The backend is still **custom JWT auth**, not Clerk.
- The database layer is **sync SQLAlchemy + psycopg2**, not async.
- The current DB pool is aggressive for a small hosted Postgres: `pool_size=20`, `max_overflow=40`.
- Storage is already behind a simple **S3-compatible boto3 service**.
- There is already a useful base for billing and idempotency:
  - `subscriptions`
  - `usage_records`
  - `webhook_events`
- There is **no real job system**, **no cache**, **no PostGIS**, **no pgvector**, and **no visible RLS policy layer** yet.

This is good news. Parcel is still early enough to make clean infrastructure decisions without ripping apart a mature production system.

## Executive verdict

### Original Codex recommendation

The original recommendation in this document was:

Pick this stack:

- **Primary database:** Railway PostgreSQL
- **Vector search:** `pgvector` in the same Postgres instance
- **Geospatial:** `PostGIS` in the same Postgres instance
- **Multi-tenancy:** Postgres RLS, implemented by Parcel in SQL
- **Background jobs:** Trigger.dev first
- **Cache:** none at launch; add Upstash Redis only when proven necessary
- **File storage:** Cloudflare R2 behind the existing S3 abstraction
- **Search:** PostgreSQL `tsvector` + `GIN` + `pg_trgm`
- **Auth:** Clerk, if that is truly the intended direction; otherwise admit the repo is still custom auth and treat that as Wave 0 debt
- **Realtime:** none at launch
- **PDF generation:** keep `jsPDF` for now, move branded reports to server-side Playwright when reports become a core product surface

### Canonical override

The founder-selected final stack is now:

- **Primary database:** Supabase Postgres
- **Vector search:** `pgvector` in the same Postgres instance
- **Geospatial:** `PostGIS` in the same Postgres instance
- **Multi-tenancy:** Postgres RLS, implemented by Parcel in SQL
- **Background jobs:** Dramatiq
- **Cache:** Upstash Redis from day one
- **File storage:** Cloudflare R2 behind the existing S3 abstraction
- **Search:** PostgreSQL `tsvector` + `GIN` + `pg_trgm`
- **Auth:** Clerk
- **Realtime:** none at launch
- **PDF generation:** Playwright first, Gotenberg later only if Parcel needs broader document-conversion workflows

## Direct answers

### Can Railway PostgreSQL support `PostGIS` + `pgvector` + RLS simultaneously?

**Yes.** RLS is native PostgreSQL. Railway’s Postgres docs show native Postgres images plus marketplace templates for `PostGIS` and `pgvector`, but the default template is intentionally simple and does **not** bundle extensions for you. For Parcel, that means:

- do **not** use the plain default Postgres template and hope later
- use a verified extension-capable Postgres image from day one
- ideally use one custom Postgres image or template that includes both `PostGIS` and `pgvector`

This is viable. It just is not “click default template and forget it.”

### If we switch to Supabase, what is the migration effort and what breaks?

**Medium to high effort.** Supabase is technically strong, but switching now means rewriting platform assumptions, not just moving a database.

What changes:

- auth flow if you replace Clerk or custom JWT with Supabase Auth
- storage integration if you replace S3/R2 with Supabase Storage
- project and environment management
- RLS implementation details if you lean into Supabase auth helpers
- possible frontend and backend token-verification logic

What breaks immediately in the current repo:

- `backend/routers/auth.py`
- `backend/core/security/jwt.py`
- likely parts of billing/session assumptions tied to your current user model

If you only use Supabase as “hosted Postgres plus extras I ignore,” the migration is easier but strategically weak. You would still pay for bundled features without really using the platform well.

### Is there any blueprint requirement that no database option can support?

**No.** Standard PostgreSQL can support all of Parcel’s blueprint requirements:

- `PostGIS`
- `pgvector`
- RLS
- JSONB
- event/outbox tables
- full-text search
- background-job tables
- webhook idempotency
- usage metering

The blueprint does **not** require a distributed SQL database, a dedicated vector store, or a specialized event store.

### What is the cheapest viable launch stack for 50-100 users?

This:

- Railway Postgres
- Railway API service
- Trigger.dev cloud
- Clerk Pro only if you need production auth polish; otherwise current auth can limp briefly, but it is debt
- Cloudflare R2
- no Redis
- no Pinecone
- no realtime service

### What is the migration path if we outgrow the initial choice?

Stay on plain Postgres patterns and keep adapters thin:

- SQLAlchemy + Alembic, not provider-specific ORM magic
- S3-compatible storage abstraction
- auth adapter boundary around Clerk/custom token verification
- vector data stored in Postgres first
- outbox/event tables in Postgres

If Railway becomes the bottleneck, move to:

1. Neon or Supabase if you still want managed Postgres DX
2. RDS/Cloud SQL later if you want boring managed scale

That migration is manageable **if** Wave 0 avoids provider lock-in.

### Which Wave 0 choices are painful to reverse later?

The big ones:

- auth provider and user/org identity model
- RLS strategy
- file key scheme and file metadata model
- event/outbox architecture
- whether you hard-couple to Supabase platform APIs
- whether you split `Property` / `Deal` / `AnalysisScenario` correctly in schema

The database host itself is less painful to reverse than those.

## 1. Database comparison

### Recommendation

**Use Railway Postgres for production launch.**  
**Use plain PostgreSQL design.**  
**Do not switch to Supabase now.**

### Comparison

| Option | Verdict | Parcel fit |
|---|---|---|
| Railway PostgreSQL | **Recommended** | Best balance of simplicity, cost, and freedom. Good for a solo founder if you stay Postgres-native and manage your own extension-capable image/template. |
| Supabase | Strong alternative, not recommended now | Excellent all-in-one platform, but switching now pulls Parcel into auth/storage/realtime migration before product maturity. |
| Neon | Good secondary option | Great developer experience and branching. Better as dev/staging DB or later migration target than as Parcel’s primary production DB. |
| PlanetScale Postgres | Viable but not the best fit | No longer dismissible outright, but still not the clearest fit for a solo founder who needs cheap, boring, Postgres-first execution. |
| CockroachDB | No | Technically capable, strategically wrong. Too much distributed-database complexity for Parcel’s stage. |
| Turso | No | Clever product, wrong database model for Parcel. |

### Railway PostgreSQL

**Why it fits Parcel**

- Parcel already assumes a conventional backend app talking to Postgres.
- Railway pricing is simple for a solo founder: base plan plus usage.
- Railway supports normal app/service deployments, worker services, cron jobs, and Postgres.
- Railway’s Postgres guide confirms:
  - default Postgres runs from an SSL-enabled Postgres image
  - extension support is handled via marketplace/custom templates
  - `PostGIS` and `pgvector` templates exist

**What to watch**

- Railway’s default Postgres guide is intentionally minimal; extensions are **not** bundled into the vanilla template.
- You own the responsibility of using the right template or image.
- Connection discipline matters. Your current app pool settings are too loose for a small hosted Postgres.

**My call**

- Keep Railway.
- Use a Postgres image/template that supports both `PostGIS` and `pgvector`.
- Cut the SQLAlchemy pool immediately to something like:
  - `pool_size=5`
  - `max_overflow=5`
- Add proper per-request transaction handling before you layer RLS.

### Supabase

**What you get**

- Managed Postgres
- native RLS-first workflow
- `pgvector`
- `PostGIS`
- Auth
- Storage
- Realtime
- Edge Functions

**Why it is attractive**

- It matches a large part of the blueprint on paper.
- RLS is first-class.
- Storage and realtime are already bundled.
- Third-party auth and MAU billing are documented if you keep Clerk.

**Why I still would not switch now**

- Parcel is backend-first, not frontend-direct-to-database.
- You would be paying for platform breadth before using it well.
- Supabase only really wins if you adopt several of its platform pieces together.
- The current repo is not already on Clerk, which means moving to Supabase could turn into an auth/storage/platform rewrite disguised as a database decision.

**Migration effort**

- DB migration: manageable
- auth migration: real
- storage migration: real if adopted
- token verification / RLS claim plumbing: real
- testing and deployment changes: real

**My call**

Supabase is a good Plan B, not the launch recommendation.

### Neon

**What Neon does well**

- branchable Postgres
- scale-to-zero
- built-in connection pooling
- clear support for `pgvector` and `PostGIS`

**Why I would not use it as primary production DB for Parcel**

- autosuspend/cold-start behavior is great for dev and previews, less appealing for an operational SaaS with scheduled jobs
- transaction-pooler constraints matter if you rely on session state
- Parcel’s value is not “spin up many ephemeral DB branches”

**My call**

Use Neon for preview/staging or keep it in reserve as a future migration target. Not my first production pick here.

### PlanetScale

This needs a nuance update.

PlanetScale is **not** just a MySQL/Vitess company anymore. PlanetScale Postgres exists, starts cheap, and has broad extension support. That means it is no longer an automatic no.

It is still the wrong recommendation for Parcel because:

- Parcel does not need PlanetScale’s premium HA posture at this stage
- the product gains little from PlanetScale-specific value props
- Railway is cheaper in cognitive overhead
- Supabase/Neon are clearer Postgres-founder options if Railway stops fitting

### CockroachDB

CockroachDB now has:

- vector indexes
- row-level security
- distributed SQL

That is still the wrong answer for Parcel. Parcel is not a globally distributed fintech ledger. You would be paying an abstraction tax for availability and scale you do not need.

### Turso

Turso is clever and fast for edge-native SQLite use cases. Parcel is not that.

Parcel needs:

- heavy relational joins
- PostGIS
- RLS
- complex transactional workflows
- mature Postgres ergonomics

Turso is the wrong foundation.

## 2. Vector database strategy

### Recommendation

Use **`pgvector` on the main Postgres instance**.

Do not add Pinecone, Qdrant, Weaviate, or Chroma at launch.

### Why `pgvector` wins for Parcel

- zero new infrastructure
- no consistency problems between OLTP records and embeddings
- easy joins to `documents`, `properties`, `reports`, `communications`, `tasks`
- low operational overhead
- cheaper than a separate vector product for a solo founder

Parcel’s likely vector use cases:

- document RAG
- report/source retrieval
- note/communication search
- possibly AI memory on properties/deals

These are not massive standalone vector workloads. They are contextual retrieval attached to operational records. That is exactly where `pgvector` is strongest early.

### When a dedicated vector DB becomes justified

Not by user count alone. By workload.

Switch only when one or more of these are true:

- embeddings reach the low millions and keep growing fast
- vector search latency starts competing with OLTP latency
- AI retrieval becomes a primary product surface with heavy concurrent query volume
- you need separate scaling and tuning for vector workloads

My practical threshold for Parcel:

- **do not revisit this before ~1M embeddings or clear database contention**
- for Parcel’s next 2 years, `pgvector` is likely enough

### Dedicated vector DB options

| Option | Verdict | Why |
|---|---|---|
| Pinecone | Overkill now | Good product, but Standard starts with a `$50/mo` minimum and adds a whole second data system too early. |
| Qdrant | Better than Pinecone if you must separate later | Cleaner resource-based model, good future option if Parcel ever needs a dedicated vector tier. |
| Weaviate | Not now | Extra infrastructure without a clear early payoff. |
| Chroma | No | Too much product immaturity to justify as a production dependency here. |

## 3. Caching

### Recommendation

**Do not add Redis at launch just because “real SaaS apps have caches.”**

At launch:

- cache provider responses in Postgres where useful
- cache expensive dashboard aggregates in Postgres or materialized tables
- rely on application-level memoization where safe

Add Redis only when there is evidence.

### What Parcel might cache

- property API responses and enrichment payloads
- dashboard summary aggregates
- morning briefing aggregates
- rate-limit counters
- short-lived report/share-link state
- expensive calculator outputs only if they become noisy

### Options

| Option | Verdict | Why |
|---|---|---|
| No dedicated cache | **Recommended at launch** | Cheapest and simplest. |
| Upstash Redis | **Recommended first cache later** | Serverless, cheap, simple, and good for rate limiting and hot-key caching. |
| Railway Redis | Fine, but second choice | Works, but adds always-on infra cost and another Railway service earlier than needed. |
| Dragonfly | No for now | Great performance story, wrong stage. Parcel does not need a performance-optimized Redis replacement yet. |

### Is caching necessary at launch?

**No.**

It can wait unless one of these happens very early:

- enrichment provider cost spikes due to repeated queries
- dashboard latency becomes noticeable
- you need distributed rate limiting across multiple API instances

If that happens, add **Upstash** first.

## 4. Background jobs

### Recommendation

Use **Trigger.dev first**.  
Do **not** start with Celery.

### Why

Parcel’s early async work is orchestration-heavy, not high-throughput queue science:

- morning briefing generation
- AI insight generation
- address/property enrichment pipelines
- report/PDF generation
- obligation checks
- skip trace batches
- mail campaign batches

Trigger.dev is already in Ivan’s toolchain and matches this style of work well:

- schedules
- durable task execution
- retries
- visibility
- low ops burden

### What should be async

- `Analyze` enrichment after address submission
- AI-generated narrative and deeper scenario work
- report rendering
- nightly/periodic obligation scans
- morning briefing refresh
- batch outreach operations
- file parsing and extraction

### Tool comparison

| Option | Verdict | Why |
|---|---|---|
| Trigger.dev | **Recommended first** | Best fit for app workflows and solo-founder ops. |
| ARQ | Best second-step queue | If Parcel later needs a simple Redis-backed Python queue inside FastAPI, ARQ is the right next step. |
| Celery | No | Powerful, but too much operational drag too early. |
| Dramatiq | Not first | Cleaner than Celery, still unnecessary right now. |
| Huey | Not first | Simple, but Trigger.dev already covers the early need better. |

### Railway workers

Railway’s own model is simple and fits Parcel:

- API service
- worker service
- cron service

Use that when needed. Do not cram background loops into the API container.

### My recommended job architecture

Launch:

- Trigger.dev for scheduled and durable app workflows
- Railway API service only

Next:

- add a dedicated Railway worker service for CPU-heavy work
- especially Playwright PDF rendering and large imports

Only later:

- add Redis + ARQ if you need a true internal queue for high-throughput fan-out

### Event sourcing note

Do **not** build full event sourcing in Wave 0.

Build this instead:

- append-only `domain_events` table
- `outbox_jobs` table
- idempotent webhook/event consumers
- background tasks triggered from outbox rows

That gets you the benefits that matter:

- auditability
- retries
- replay for operational events
- clean integrations

Without the complexity of making the whole app event-sourced.

## 5. File storage

### Recommendation

Use **Cloudflare R2** behind the existing S3 abstraction.

If that switch feels like one change too many in Wave 0, keep current S3 for launch and move to R2 before public report sharing and mobile photo volume grow.

### Why R2

- S3-compatible API
- works with the current `boto3`-style abstraction
- lower storage cost than S3
- **no egress charges**, which matters for:
  - shared reports
  - generated PDFs
  - document downloads
  - image-heavy D4D workflows

### Storage comparison

| Option | Verdict | Why |
|---|---|---|
| Cloudflare R2 | **Recommended** | Best cost profile for Parcel’s file-sharing patterns. |
| AWS S3 | Acceptable | Mature and boring, but egress fees are the long-term tax. |
| Backblaze B2 | Cheap but second choice | Lowest raw storage price, but R2 is cleaner for app download economics. |
| Supabase Storage | Only if on Supabase | Good platform bundle, but not worth adopting standalone. |

### Cost at 1K / 10K / 100K files

Assumption:

- average file size = **2 MB**
- 1K files = **2 GB**
- 10K files = **20 GB**
- 100K files = **200 GB**

Approximate monthly storage-only cost:

| Provider | 1K files | 10K files | 100K files |
|---|---:|---:|---:|
| R2 (`$0.015/GB-month`) | `$0.03` | `$0.30` | `$3.00` |
| S3 Standard (`$0.023/GB-month`) | `$0.05` | `$0.46` | `$4.60` |
| B2 (`$0.005/GB-month`) | `$0.01` | `$0.10` | `$1.00` |

File count is not the real driver. Bytes and egress are.

For Parcel, that is why R2 is the best fit.

## 6. Search

### Recommendation

Start with PostgreSQL search:

- `tsvector` + `GIN` for full text
- `pg_trgm` for fuzzy matching
- optionally `unaccent`

Do not add Meilisearch or Typesense at launch.

### Parcel search needs early

- fuzzy address search
- contact and buyer name search
- property and deal notes
- document/report text lookup
- maybe obligation and transaction text search

Postgres handles that well enough.

### When dedicated search becomes justified

Only add a separate search engine if:

- global search becomes a hero feature
- typo tolerance and ranking quality become product-critical
- search corpus grows large enough that Postgres search starts hurting OLTP queries

If Parcel gets there, choose **Typesense or Meilisearch**, not Elasticsearch.

My bias later would be **Typesense Cloud** for cleaner typo-tolerant product search, but this is not a launch decision.

## 7. Auth

### Recommendation

Pick a lane now:

- **Clerk** if you want managed auth done right
- or admit the app is still on custom auth and budget explicit migration time

Do **not** drift between the two.

### Critical reality check

The prompt says Clerk is current. The repo is not.

The repo currently uses:

- `backend/routers/auth.py`
- `backend/core/security/jwt.py`
- local password hashing and JWT cookies

That is not a catastrophic problem. It is just technical debt that becomes expensive once you add:

- team invites
- organizations
- API keys
- role-based access
- account recovery edge cases

### Comparison

| Option | Verdict | Why |
|---|---|---|
| Clerk | **Recommended** | Best auth product for this stage if you actually adopt it soon. |
| Supabase Auth | Only if choosing Supabase broadly | Fine product, but weaker reason if Parcel stays backend-first on Railway. |
| Custom JWT | No long-term | Cheapest in cash, most expensive in founder attention and risk. |

### Why Clerk wins

- polished email/password, magic links, OAuth, MFA
- orgs/invites path exists
- good frontend DX
- clear pricing
- better use of founder time than homegrown auth

### What Clerk does not replace

Even with Clerk, Parcel still needs its own:

- `users` table
- `teams` table
- `team_memberships`
- `api_keys`
- domain permissions

Clerk should handle **identity**. Parcel should handle **authorization** and domain ownership.

### My call

If Clerk is the intended destination, migrate before Wave 1 grows.

If you do not want to do that, stop saying “current auth is Clerk.” It is not.

## 8. Realtime

### Recommendation

**Skip realtime at launch.**

Parcel does not need WebSockets to prove the product.

### Why

Early Parcel value is:

- faster analysis
- better operational memory
- obligation tracking
- report generation

Not collaborative cursors or live kanban animations.

### What to do instead

- polling
- page refresh on important views
- email digests
- push notifications later on mobile
- server-sent events later only for progress UX if needed

### When realtime becomes justified

- multi-user simultaneous pipeline editing
- presence or collaborative comments
- live obligation feed for teams

At that point:

- use **Pusher/Ably** first
- do **not** self-host Socket.io unless realtime becomes central
- Supabase Realtime only makes sense if you are already on Supabase

## 9. PDF generation

### Recommendation

Keep the current client-side `jsPDF` path for now.  
Move branded reports to **server-side Playwright** when reports become a core selling surface.

### Why

Client-side PDF is enough for:

- internal exports
- rough investor snapshots
- early product demos

It is not enough for:

- polished branded reports
- consistent pagination
- reusable shareable output
- report generation in background jobs

### Tool comparison

| Option | Verdict | Why |
|---|---|---|
| Playwright | **Recommended later** | Best fidelity with modern HTML/CSS and React-based report templates. |
| Puppeteer | Fine, second choice | Similar path, but I would choose Playwright today. |
| WeasyPrint | No for Parcel | Better for static print layouts than app-like React report surfaces. |
| wkhtmltopdf | No | Old stack. Avoid. |

### Deployment note

Do not run serious PDF generation in Vercel functions.

Run it on:

- Trigger.dev task
- Railway worker service
- store PDF in R2
- track it as a `Report` artifact

## 10. Cost model

### Important caveat

Infrastructure cost does **not** scale cleanly with user count. It scales with:

- documents stored
- enrichment requests
- AI job volume
- report generation
- outbound communication
- active teams

Also: the biggest Parcel COGS will not be core infra. It will be:

- property/comps APIs
- skip traces
- SMS
- direct mail
- AI model usage

The estimates below are **core backend infrastructure only**, excluding those product-specific usage costs.

### Recommended stack cost ranges

Assumptions:

- Railway runs API + Postgres + later one worker
- Clerk Pro for production auth polish
- Trigger.dev on a paid starter tier
- R2 for storage
- Redis added only at higher usage

| User band | Railway | Clerk | Trigger.dev | R2 | Redis | Approx total |
|---|---:|---:|---:|---:|---:|---:|
| 100 | `$25-40` | `$25` | `$10` | `<$1` | `$0` | **`$60-75/mo`** |
| 500 | `$40-80` | `$25` | `$10-50` | `$1-3` | `$0-10` | **`$76-168/mo`** |
| 1K | `$80-140` | `$25` | `$50` | `$3-5` | `$10` | **`$168-230/mo`** |
| 5K | `$200-350` | `$25` | `$50` | `$10-25` | `$10-30` | **`$295-480/mo`** |
| 10K | `$350-650` | `$25` | `$50` | `$20-50` | `$30-60` | **`$475-835/mo`** |

These are healthy numbers for a solo-founder SaaS.

What will bite harder than infra:

- Bricked / comps usage
- Twilio SMS
- Lob direct mail
- AI narration and enrichment volume

That is where pricing discipline matters.

## 11. Recommended launch architecture

### Launch stack

- **Frontend:** React on Vercel
- **API:** FastAPI on Railway
- **Database:** Railway Postgres with `PostGIS` + `pgvector`
- **Storage:** Cloudflare R2 via S3-compatible API
- **Auth:** Clerk
- **Jobs:** Trigger.dev
- **Search:** Postgres FTS + `pg_trgm`
- **Billing:** Stripe + Postgres usage tables
- **Notifications:** email first, mobile push later

### Why this is the right stack

- cheap enough
- simple enough
- powerful enough
- no premature second database
- no premature queue cluster
- no premature search service
- no premature realtime service

## 12. Migration path and irreversible decisions

### Migration path if Railway stops fitting

Because the recommendation stays Postgres-native, you retain options:

1. Railway → Neon
2. Railway → Supabase
3. Railway → RDS / Cloud SQL
4. `pgvector` → dedicated vector DB later, by dual-writing embeddings and cutting reads over gradually

### Decisions that are painful to reverse

#### 1. Auth boundary

Lock this now:

- external identity provider handles identity
- Parcel DB handles teams, roles, and domain authorization

#### 2. RLS implementation style

Do not fake RLS. Use real Postgres policies.

With a FastAPI backend, the clean pattern is:

- service role connects to DB
- each request sets transaction-local context values like:
  - `app.current_user_id`
  - `app.current_team_id`
- RLS policies read those via `current_setting(...)`

Do **not** rely on long-lived session state if you later use pooling.

#### 3. Storage abstraction

Keep:

- provider-agnostic file metadata in Postgres
- S3-compatible object store abstraction in code

Do not leak provider URLs everywhere in domain tables.

#### 4. Outbox/event architecture

Use:

- append-only event log
- outbox for async jobs
- idempotent webhook handling

Do not overbuild into full event sourcing.

#### 5. Database pool behavior

The current pool can open up to 60 connections. That is too loose for a small hosted Postgres.

Fix this in Wave 0 before you add:

- more workers
- more concurrent AI jobs
- RLS context setting

## 13. What I would do in Wave 0

In order:

1. **Lock auth**
   - choose Clerk or explicitly defer it
   - if Clerk, integrate now

2. **Provision the real Postgres shape**
   - Railway Postgres with verified `PostGIS` + `pgvector`
   - test `CREATE EXTENSION postgis;`
   - test `CREATE EXTENSION vector;`

3. **Add the real schema foundations**
   - `properties`
   - `analysis_scenarios`
   - `teams`
   - `team_memberships`
   - `domain_events`
   - `outbox_jobs`
   - file metadata table

4. **Implement RLS on a small slice first**
   - `teams`
   - `properties`
   - `deals`

5. **Reduce connection pool settings**
   - stop pretending the DB is infinite

6. **Keep storage abstraction and point it at R2**

7. **Use Trigger.dev for async enrichment/report tasks**

That sequence protects the skeleton without buying unnecessary infrastructure.

## Final recommendation

For Parcel, the right answer is not “the most features per vendor.”

It is:

- **Railway Postgres**
- **PostGIS + pgvector in the same DB**
- **RLS in Postgres**
- **Clerk for identity**
- **Trigger.dev for jobs**
- **R2 for files**
- **Postgres search**
- **no Redis, no Pinecone, no realtime at launch**

That stack is cheap, strong, reversible, and founder-appropriate.

Anything more ambitious right now is infrastructure vanity.

## Sources

- Railway pricing: `https://docs.railway.com/reference/pricing/plans`
- Railway Postgres: `https://docs.railway.com/databases/postgresql`
- Railway cron jobs: `https://docs.railway.com/reference/cron-jobs`
- Supabase PostGIS: `https://supabase.com/docs/guides/database/extensions/postgis`
- Supabase pgvector: `https://supabase.com/docs/guides/database/extensions/pgvector`
- Supabase RLS: `https://supabase.com/docs/guides/database/postgres/row-level-security`
- Supabase billing and quotas: `https://supabase.com/docs/guides/platform/billing-on-supabase`
- Neon pricing: `https://neon.com/pricing`
- Neon pgvector: `https://neon.com/docs/extensions/pgvector`
- Neon PostGIS: `https://neon.com/docs/extensions/postgis`
- Neon connection pooling: `https://neon.com/docs/connect/connection-pooling`
- PlanetScale pricing: `https://planetscale.com/pricing`
- PlanetScale Postgres docs: `https://planetscale.com/docs/postgres`
- PlanetScale extensions: `https://planetscale.com/docs/postgres/extensions`
- CockroachDB pricing: `https://www.cockroachlabs.com/pricing/`
- CockroachDB vector indexes: `https://www.cockroachlabs.com/docs/stable/vector-indexes`
- CockroachDB RLS: `https://www.cockroachlabs.com/docs/stable/row-level-security`
- Turso pricing: `https://turso.tech/pricing`
- Turso AI/embeddings: `https://docs.turso.tech/features/ai-and-embeddings`
- Clerk pricing: `https://clerk.com/pricing`
- Trigger.dev pricing: `https://trigger.dev/pricing`
- Upstash Redis pricing: `https://upstash.com/pricing/redis`
- Dragonfly pricing: `https://www.dragonflydb.io/pricing`
- Cloudflare R2 pricing: `https://developers.cloudflare.com/r2/pricing/`
- AWS S3 pricing: `https://aws.amazon.com/s3/pricing/`
- Pinecone pricing: `https://www.pinecone.io/pricing/`
- Qdrant pricing: `https://qdrant.tech/pricing/`
- Weaviate pricing: `https://weaviate.io/pricing`
