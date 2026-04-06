# Backend Stack Comprehensive Research — Codex

**Date:** 2026-04-03  
**Prepared for:** Parcel  
**Method:** requirements-first stack selection, not current-stack validation

## Founder-locked decisions update

The comparison analysis in this document is still useful, but the founder has now locked the implementation direction on a few points. Treat the following as canonical:

- **Primary database:** Supabase Postgres
- **Geospatial:** `PostGIS`
- **Vectors:** `pgvector`
- **Database isolation:** Postgres RLS
- **App hosting:** Railway
- **Auth:** Clerk
- **Background jobs:** Dramatiq
- **Redis/cache/rate limits:** Upstash Redis from day one
- **PDF generation:** Playwright first
- **Document conversion later:** Gotenberg, only if Parcel needs document conversion / merge / Office-file workflows
- **Dispositions timing:** Wave `3B`, not Wave `4`

Where those locked decisions differ from the “best from scratch” category pick below, the founder lock wins.

## 1. Requirements Summary

Parcel is a US-only real estate investor operating system for a solo founder targeting roughly `150 -> 10,000` users in 24 months. The stack must support all of this without turning into an enterprise science project:

- relational data with `~26+` real tables and heavy joins
- geospatial queries, map clustering, and route polylines
- vector embeddings for document RAG
- database-enforced row-level security
- full-text search with typo tolerance and autocomplete
- background jobs for scheduled, event-triggered, and batch workloads
- object storage for documents, photos, and generated reports
- modern auth with OAuth and future org/invite support
- server-side PDF generation for branded reports
- offline mobile sync for D4D

### Pricing assumptions

User count does not map cleanly to infra cost, so the cost bands below use these workload assumptions:

| Scale | Assumptions |
|---|---|
| `100 users` | `<=5 GB` relational data, `<=10K` vectors, `<=20 GB` files, one API instance, one worker, low concurrency |
| `1K users` | `10-30 GB` relational data, `<=100K` vectors, `50-200 GB` files, two API instances, one worker, moderate concurrency |
| `10K users` | `75-200 GB` relational data, `<=1M` vectors, `200-500 GB` files, multiple API instances/workers, moderate team usage |

These cost numbers cover **core platform infrastructure**. They do **not** include the real Parcel cost drivers:

- Bricked / comps / property data APIs
- LLM usage
- Twilio SMS
- Lob direct mail
- skip tracing

## 2. Category 1: Primary Database

### Non-negotiable conclusion

If the requirement set is real, **Parcel should stay in the PostgreSQL family**.

Why:

- `PostGIS` is still the cleanest answer for geo
- `pgvector` is the cleanest answer for embeddings at Parcel’s projected scale
- Postgres has real native `RLS`
- Postgres full-text search is good enough early
- SQLAlchemy/Alembic/FastAPI support is first-class

MySQL-family, NoSQL, and edge-SQLite options all compromise one of Parcel’s hard requirements.

### PostgreSQL options

| Option | Geo | Vectors | RLS | FTS | 100 users | 1K users | 10K users | Solo-founder verdict |
|---|---|---|---|---|---:|---:|---:|---|
| Supabase Postgres | `PostGIS` | `pgvector` | Native | Native | `$25` | `$25-100` | `$150-400` | **Best from scratch**. Strongest fit for Parcel’s actual requirements. |
| Railway PostgreSQL | Via extension-capable image | Via extension-capable image | Native | Native | `$25-40` | `$40-120` | `$120-400` | Very viable, but extension setup is less turnkey than Supabase. |
| Neon | `PostGIS` | `pgvector` | Native | Native | `$19-25` | `$69-150` | `$150-500` | Great dev UX, less ideal for always-busy ops workloads. |
| Amazon RDS PostgreSQL | `PostGIS` | `pgvector` | Native | Native | `$30-60` | `$100-250` | `$300-1,000+` | Boring and strong, but too much cloud tax and ops drag this early. |
| Google Cloud SQL PostgreSQL | `PostGIS` | `pgvector` | Native | Native | `$35-70` | `$120-300` | `$400-1,200+` | Same story as RDS. Strong, but not founder-efficient. |
| DigitalOcean Managed PostgreSQL | `PostGIS` | partial/extension-dependent | Native | Native | `$15-30` | `$50-120` | `$160-500` | Nice DX, but weaker extension story than Supabase/Neon. |
| Render PostgreSQL | extension-dependent | extension-dependent | Native | Native | `$20-40` | `$40-120` | `$150-500` | Fine if you want one vendor for app + DB, but not the best DB itself. |
| Tembo | very strong | very strong | Native | strong | `custom / ~$35+` | `custom` | `custom` | Interesting Postgres-native extension platform. Too niche for the main bet. |
| Crunchy Data | very strong | very strong | Native | strong | `custom` | `custom` | `custom` | Excellent serious-Postgres option, wrong stage and price profile. |
| Aiven PostgreSQL | `PostGIS` | `pgvector` | Native | Native | `$50+` | `$150+` | `$500+` | Good managed infra, not price-optimal here. |

### MySQL ecosystem

| Option | PostGIS equivalent | Vector equivalent | RLS equivalent | FTS quality | Verdict |
|---|---|---|---|---|---|
| PlanetScale | weak | possible but not best-in-class | no native Postgres-style RLS | okay | Better than old assumptions suggest, but still the wrong fit for Parcel. |
| Vitess | no real PostGIS answer | no clean answer | no native RLS | basic | Excellent sharding tech, bad fit for this product. |
| TiDB | geo is weaker than PostGIS | vector exists | RLS weaker / app-enforced patterns | decent | Interesting HTAP database, still worse than Postgres for Parcel. |

### Other SQL

| Option | Geo | Vectors | RLS | FTS | Verdict |
|---|---|---|---|---|---|
| CockroachDB | geospatial support exists | vector exists | RLS exists | decent | Technically viable, strategically overkill. |
| YugabyteDB | geo via PG compatibility | vector via PG path | RLS-ish via PG path | decent | Same problem: distributed complexity before it matters. |
| Turso | no PostGIS | vector support exists | no real RLS | basic | Wrong tool for this relational, multi-tenant, geo-heavy app. |
| libSQL | no PostGIS | vector support exists | no real RLS | basic | Great for edge/local workloads, not for Parcel core. |

### NoSQL

| Option | Geo | Vectors | DB-enforced tenant isolation | Join/constraint quality | Verdict |
|---|---|---|---|---|---|
| MongoDB Atlas | yes | yes | partial, not true SQL-style RLS | weak vs SQL | Can be made to work. It is still the wrong schema model. |
| DynamoDB | geo via app patterns | vector no clean native answer | IAM, not relational RLS | terrible for this use case | No. |
| Fauna | document/graph-like | not the right vector story | access control exists | poor fit for joins | No. |
| Convex | reactive app DB | vector/search story exists | app-layer patterns | not strong enough | Good for realtime web apps, wrong for Parcel’s data core. |

### NewSQL / hybrid

| Option | Geo | Vectors | RLS | ORM support | Verdict |
|---|---|---|---|---|---|
| SurrealDB | partial | yes | partial | immature | Interesting, not mature enough for Parcel’s backbone. |
| EdgeDB / Gel | relational but opinionated | partial | no standard Postgres RLS path | own ecosystem | Cool product, wrong time to bet the company on it. |

### Primary DB pick

**Pick: Supabase Postgres**

Why it wins from scratch:

- best direct match to `PostGIS + pgvector + native RLS`
- strongest developer path for Postgres-first product requirements
- cleaner extension story than Railway/Render default DBs
- easier connection-pooling story than piecing it together yourself
- can stay “just Postgres” if you avoid overusing Supabase-specific APIs

### Primary DB fallback

**Fallback: Railway PostgreSQL**

Use it if:

- you value speed and single-vendor simplicity more than DB polish
- you are willing to own extension-capable image/template setup

### Would a solo founder regret Postgres at 10K users?

**No.**  
Parcel would regret **leaving** Postgres earlier than it would regret staying on it.

## 3. Category 2: Vector Database / Embeddings

### Comparison

| Option | Managed? | Tenant filtering | 100 users | 1K users | 10K users | Verdict |
|---|---|---|---:|---:|---:|---|
| `pgvector` on Postgres | same DB | excellent via SQL filters | `$0-10` incremental | `$0-30` incremental | `$50-150` incremental DB compute | **Best choice** until retrieval becomes a genuine bottleneck. |
| Pinecone | yes | yes | `$0-50+` | `$50-150+` | `$200-800+` | Strong managed product, unnecessary second system early. |
| Weaviate | yes / self-host | yes | `$25-100` | `$100-300` | `$400+` | Good product, too much extra infra for this workload. |
| Qdrant | yes / self-host | yes | `$0-29` | `$29-99` | `$150-500` | Best dedicated-vector fallback later. |
| Chroma | open source / hosted evolving | yes | `$0-20` | `$20-100` | `$100-300` | Fine for prototypes, not my primary production bet. |
| Milvus / Zilliz | yes / self-host | yes | `$0-99` | `$99-300` | `$300-1,000+` | More infra than Parcel needs. |
| LanceDB | embedded / OSS / cloud path | yes | `$0` | `$0-50` | `$50-200` | Good local analytics story, weak primary SaaS retrieval backbone. |
| Turbopuffer | managed | yes | `usage-based` | `usage-based` | `usage-based` | Clever and fast, not boring enough for this role. |
| Vespa | self-host heavy | yes | `$0 infra only` | `$100+ infra` | `$500+ infra` | Powerful, wrong stage. |

### Pick

**Pick: `pgvector` in the primary Postgres database**

Why:

- zero extra infrastructure
- joins directly to `documents`, `reports`, `properties`, `communications`
- easy tenant filtering with plain SQL
- perfect fit for Parcel’s estimated scale

### When does “vectors in the same Postgres” stop working?

Not at a fixed user count. It stops being the right answer when:

- embeddings are in the low millions and still climbing
- semantic search latency starts competing with OLTP latency
- retrieval volume becomes constant and high-concurrency
- you need ANN tuning independent of your main DB

For Parcel, that is unlikely before:

- `~1M+` vectors
- or clearly measurable database contention

### Migration path if `pgvector` becomes insufficient

1. keep source metadata in Postgres
2. add dedicated vector store later
3. dual-write new embeddings
4. backfill old embeddings
5. shadow-query both systems
6. cut semantic retrieval reads over

**Best fallback later:** Qdrant

## 4. Category 3: File Storage

### Comparison

| Option | Storage price | Egress price | S3 API | CDN included | Verdict |
|---|---:|---:|---|---|---|
| AWS S3 | `$0.023/GB` standard | ~`$0.09/GB` internet egress | yes | no | Boring and strong, but egress becomes a tax. |
| Cloudflare R2 | `$0.015/GB` | `$0` egress to internet | yes | yes, via Cloudflare edge | **Best fit** for Parcel’s downloads and report sharing. |
| Backblaze B2 | `$0.006/GB` | low / nuanced | mostly | no | Cheapest raw storage, less clean than R2 for app delivery. |
| Google Cloud Storage | `~$0.02/GB` | variable | no | no | Fine, but no reason to prefer it here. |
| DigitalOcean Spaces | `$5` includes `250 GiB` + `1 TiB egress` | included to tier then pay | yes | built-in CDN option | Great simple alternative if you already live on DO. |
| Supabase Storage | bundled + usage | bundled + usage | no | yes-ish | Fine only if you want a more all-in Supabase stack. |
| Uploadthing | not primary object storage | n/a | sits on other storage | yes-ish DX | Upload UX product, not the storage system itself. |
| MinIO | self-hosted | your infra | S3-compatible | no | Good if self-hosting. Not recommended. |
| Tigris | usage-based | Fly-friendly | yes | no | Interesting, still too niche for Parcel’s primary storage layer. |

### Price examples using Parcel assumptions

Assume:

- `100 users` -> `20 GB`
- `1K users` -> `100 GB`
- `10K users` -> `250 GB`

| Provider | 100 users | 1K users | 10K users |
|---|---:|---:|---:|
| R2 | `$0.30` | `$1.50` | `$3.75` |
| S3 | `$0.46` | `$2.30` | `$5.75` |
| B2 | `$0.10` | `$0.50` | `$1.25` |

Those numbers ignore egress, which is exactly why R2 wins.

### Pick

**Pick: Cloudflare R2**

Why:

- S3-compatible
- cheap
- no egress tax
- excellent for reports, shared links, document previews, and mobile photo retrieval

### Fallback

**Fallback: AWS S3**

Use it if:

- you want absolute boring-market-standard storage
- or other parts of the stack already force AWS

## 5. Category 4: Authentication

### Comparison

| Option | Email/pass | OAuth | Magic links | Orgs/invites | API-key story | 100 MAU | 1K MAU | 10K MAU | Verdict |
|---|---|---|---|---|---|---:|---:|---:|---|
| Custom JWT | yes | custom | custom | custom | custom | `$0` | `$0` | `$0` | Cash-cheap, founder-expensive. Do not choose from scratch. |
| Clerk | yes | yes | yes | yes | app-level | `$0-25` | `$0-25` | `$0-25` | **Best overall pick** for this app shape. |
| Auth0 | yes | yes | yes | yes | strong | `$0-35` | `$35-240+` | `$240+` | Powerful, becomes expensive fast. |
| Supabase Auth | yes | yes | yes | partial | app-level | included | included / low | low / moderate | Great only if you want more of Supabase in the stack. |
| Firebase Auth | yes | yes | yes | weak | weak | `$0` | low | low / usage | Good consumer auth, weaker B2B/team fit. |
| Lucia | library only | custom | custom | custom | custom | `$0 infra only` | `$0` | `$0` | Great if you want to build auth, which you should not. |
| Better Auth | library/platform hybrid | yes | yes | partial | custom | `$0-?` | low | low | Promising, but Node-centered and still more DIY than Parcel should want. |
| WorkOS AuthKit | yes | yes | yes | strong | strong | low | moderate | moderate/high | Excellent B2B auth. Too enterprise-tilted for now. |
| Stytch | yes | yes | yes | strong | strong | moderate | moderate/high | high | Good product, pricier and more enterprise than needed. |
| Kinde | yes | yes | yes | yes | app-level | `$0` | low | low/moderate | Best Clerk alternative. |
| Hanko | yes | yes | passkey-first | limited | custom | `$0` | low | low | Cool product, smaller ecosystem. |
| Stack Auth | yes | yes | yes | yes | custom | `$0` | low | low | Interesting OSS path, still earlier-stage than Clerk. |
| PropelAuth | yes | yes | yes | yes | strong | low | moderate | moderate | Strong B2B alternative, but Clerk still has better overall DX. |
| Descope | yes | yes | yes | yes | strong | moderate | moderate | high | Enterprise-leaning, not founder-efficient. |

### Pick

**Pick: Clerk**

Why:

- fastest path to solid auth UX
- React/Vercel fit is excellent
- Python backend integration is workable through token verification
- future orgs/invites path exists
- lets Parcel focus on domain authorization instead of identity plumbing

### Fallback

**Fallback: Kinde**

If you wanted a serious alternative without jumping to Auth0 or WorkOS, Kinde is the cleanest second pick.

### Hard rule

Even with Clerk, Parcel still needs its own:

- `users`
- `teams`
- `team_memberships`
- `api_keys`
- role/permission system

Identity is outsourced. Authorization is not.

## 6. Category 5: Background Jobs / Task Queue

### What Parcel actually needs

Parcel needs one async layer that handles all three of these:

1. **scheduled jobs**  
   morning briefings, obligation checks, daily summaries

2. **event-triggered jobs**  
   address enrichment, embedding creation, PDF generation, document parsing

3. **batch jobs**  
   skip trace imports, mail campaigns, backfills

### Comparison

| Option | Python fit | Scheduling | Retries | Monitoring | Cost | Verdict |
|---|---|---|---|---|---|---|
| Celery + Redis | strong | yes | strong | okay with tooling | Redis + workers | Proven, but too much complexity for a solo founder. |
| ARQ | excellent | yes | yes | basic | Redis + workers | **Best overall Python pick** for Parcel. |
| Dramatiq | strong | yes with extras | yes | okay | Redis + workers | Good alternative, slightly more setup than ARQ. |
| Huey | good | yes | yes | basic | Redis/SQLite | Fine for tiny apps, not my main choice here. |
| RQ | good | basic | okay | okay | Redis + workers | Simple, but weaker for richer scheduled workloads. |
| Taskiq | good | yes | yes | basic | broker + workers | Promising, not my first production pick. |
| FastAPI BackgroundTasks | built-in | no real scheduler | weak | none | `$0` | Not enough for Parcel. |
| Trigger.dev | weak for Python-first backend | yes | strong | strong | paid platform | Excellent if you are a TS-first shop. Parcel is not. |
| Inngest | weak for Python-first backend | yes | strong | strong | paid platform | Same issue as Trigger.dev. |
| Temporal | good | yes | elite | elite | high ops / cloud cost | Incredible, completely unnecessary now. |
| Hatchet | good | yes | strong | good | paid / self-host | Interesting middle ground, but cost + maturity still worse than ARQ. |
| Railway cron jobs / provider cron | n/a | yes | no queue semantics | none | low | Useful helper, not the whole answer. |

### Pick

**Pick: ARQ + managed Redis**

Why:

- Python-native
- async-friendly with FastAPI
- one mental model for scheduled, triggered, and batch jobs
- cheap
- simple enough to own

### Fallback

**Fallback: Dramatiq + Redis**

### What I would not do

- not Celery first
- not Temporal first
- not JS-native workflow tools for a Python backend

## 7. Category 6: Caching

### Comparison

| Option | Serverless? | Queue-friendly? | 100 users | 1K users | 10K users | Verdict |
|---|---|---|---:|---:|---:|---|
| Redis self-hosted | no | yes | cheap infra | moderate ops | more ops | No. Too much ops for the savings. |
| Upstash Redis | yes | not my first choice for queueing | `$0-10` | `$10-30` | `$30-100` | Great for cache/rate limits, weaker as the only job broker. |
| Dragonfly | no / managed path | yes | low | low/moderate | moderate | Great tech, wrong stage. |
| KeyDB | no | yes | low | low/moderate | moderate | Redis alternative, not a reason to complicate the stack. |
| Momento | yes | no traditional queue role | low | low/moderate | moderate | Nice cache product, not what Parcel needs first. |
| Railway Redis | no | yes | `$5-15` | `$15-30` | `$30-80` | Good if Railway hosts the app. |
| Managed Redis/Valkey on app host | no | yes | `$7-15` | `$15-40` | `$40-100` | **Best fit** because Parcel also needs a queue broker. |
| Garnet | no | maybe | low | low | low/moderate | Too early and too niche. |
| No cache / materialized views only | n/a | no | `$0` | `$0` | `$0-20` DB overhead | Viable only if you do not choose Redis-backed jobs. |

### Pick

**Pick: managed Redis/Valkey, shared across ARQ + cache + rate limiting**

Use it for:

- ARQ broker
- dashboard aggregate cache
- provider-response cache
- per-tier rate limiting

This is cleaner than separate queue and cache products.

### Founder-selected final choice

The final implementation choice is:

- **Dramatiq + Upstash Redis**

Reason:

- user experience was prioritized over continuing to optimize for the most “Python-pure” queue pick
- Upstash is acceptable for early queue + cache + rate-limit workloads
- this keeps the stack simple enough now, while leaving room to swap only the broker later if job throughput becomes a problem

## 8. Category 7: Search

### Comparison

| Option | Fuzzy matching | Facets | Autocomplete | 100 users | 1K users | 10K users | Verdict |
|---|---|---|---|---:|---:|---:|---|
| Postgres `tsvector` + `GIN` + `pg_trgm` | yes | limited | yes | `$0` | `$0-10` DB overhead | `$10-50` DB overhead | **Best launch choice** |
| Meilisearch | yes | yes | yes | `$0-30` | `$30-100` | `$100-400` | Great DX. Add only if search becomes a product feature. |
| Typesense | yes | yes | yes | `$0-29` | `$29-99` | `$99-500` | Best dedicated search fallback. |
| Elasticsearch / OpenSearch | yes | yes | yes | `$50+` | `$150+` | `$500+` | Too much system too early. |
| Algolia | excellent | yes | excellent | low | moderate/high | high | Fantastic search product, expensive for Parcel’s needs. |
| Orama | local/client-first | limited | yes | `$0` | `$0-20` | not ideal | Not a backend search system for this app. |
| ParadeDB | excellent | SQL-first | yes | low | low/moderate | moderate | Very interesting future PG-native search upgrade. |
| ZomboDB | strong | yes | yes | infra-heavy | infra-heavy | infra-heavy | Too much complexity. |

### Pick

**Pick: PostgreSQL native search**

Specifically:

- `tsvector`
- `GIN`
- `pg_trgm`
- `unaccent`

### When Postgres search becomes insufficient

Not at a fixed user count. Revisit only when:

- search becomes a hero workflow
- you need better ranking, facets, and autocomplete than SQL can comfortably deliver
- document search begins to load the primary DB meaningfully

If that happens, **Typesense** is the cleanest dedicated upgrade.

## 9. Category 8: Hosting / Deployment

### Comparison

| Option | Git auto-deploy | Workers | Cron | WebSockets | 100 users | 1K users | 10K users | Verdict |
|---|---|---|---|---|---:|---:|---:|---|
| Railway | yes | yes | yes | yes | `$10-40` | `$40-120` | `$120-400` | Great DX. Best speed option. |
| Render | yes | yes | yes | yes | `$14-35` | `$50-120` | `$150-400` | **Best overall backend host** for a solo founder. |
| Fly.io | yes | yes | yes | yes | `$10-40` | `$40-120` | `$120-400` | Powerful, but more networking/ops thinking than needed. |
| DigitalOcean App Platform | yes | some | cron via add-ons/workarounds | yes | `$12-40` | `$40-120` | `$120-300` | Fine, not clearly best. |
| AWS ECS/Lambda/EC2 | yes | yes | yes | yes | `$20-100` | `$100-300` | `$300-1,000+` | Too much cloud surface area. |
| Google Cloud Run | yes | yes | yes | limited/indirect | `$10-50` | `$50-150` | `$150-500` | Good product, still more cloud tax than needed. |
| Vercel | yes | not for this backend | cron limited | limited | low | moderate | not suitable | Great frontend host, not Parcel’s backend home. |
| Coolify | yes | yes | yes | yes | cheap infra | cheap/moderate | cheap/moderate | Cheap cash, expensive attention. |
| Kamal | yes | yes | yes | yes | cheap infra | cheap/moderate | cheap/moderate | Good if you want to be your own SRE. Don’t. |
| Hetzner + Dokku | yes with work | yes | yes | yes | very cheap | cheap | cheap/moderate | Lowest cost, highest ops burden. Wrong trade. |

### Pick

**Pick: Render for API + workers**

Why:

- clean split between web service and worker service
- cron jobs are first-class
- predictable pricing
- good enough DX without the AWS tax

### Fallback

**Fallback: Railway**

If the founder values deployment speed and product iteration over budget predictability, Railway is the cleanest second choice.

### Founder-selected final choice

The final implementation choice is:

- **Railway for API + workers**

Reason:

- deployment speed and founder familiarity won over the stricter from-scratch hosting pick
- Railway is still a viable choice for Parcel at this scale
- the database decision moved to Supabase, which reduces the amount of critical state Railway has to carry

## 10. Category 9: Real-Time

### Honest answer first

Parcel does **not** need dedicated realtime infrastructure in the first half of the roadmap.

What actually matters first:

- fast analysis
- durable tasks
- scheduled obligations
- report generation
- offline mobile sync later

Realtime is only justified later for:

- shared pipeline boards with multiple active team members
- live obligation feeds
- collaborative comments/presence

### Recommendation

For now:

- polling for most screens
- SSE only for long-running progress events if needed

If realtime becomes necessary later:

| Option | Verdict |
|---|---|
| Ably | best managed realtime fallback |
| Pusher | fine alternative |
| Supabase Realtime | only compelling if you lean much harder into Supabase platform features |
| Socket.io self-hosted | unnecessary ops burden |
| Liveblocks / PartyKit | wrong shape for Parcel’s early needs |
| Long polling | enough for now |

### Pick

**Pick: no dedicated realtime at launch**

## 11. Category 10: PDF Generation

### Comparison

| Option | Server-side? | Fonts/logos | Charts | Multi-page | 100 users | 1K users | 10K users | Verdict |
|---|---|---|---|---|---:|---:|---:|---|
| WeasyPrint | yes | good | weak JS | strong print | `$0 infra` | `$0-20` | `$20-80` | Best if reports are static print docs. Parcel reports are richer than that. |
| Playwright / Puppeteer | yes | excellent | excellent | excellent | `$0 infra + worker` | `$20-50` | `$50-150` | **Best fit** for Parcel branded reports. |
| wkhtmltopdf | yes | okay | poor | okay | low | low | low | Old stack. Avoid. |
| Prince XML | yes | elite | excellent | elite | `$3.8K+ license` | same | same | Best print engine, absurdly expensive here. |
| Typst | yes | great for templated docs | weak for app-like HTML reports | strong | low | low | low | Wrong document model for Parcel UI-driven reports. |
| react-pdf | mostly code-rendered | good | mediocre for existing web charts | good | low | low | low/moderate | Fine for simple docs, weaker than browser rendering. |
| Gotenberg | yes, as service | excellent | excellent | excellent | `$0 infra + container` | `$20-50` | `$50-150` | Good if you want PDF as isolated microservice. |
| DocRaptor | API | excellent | excellent | excellent | `$0-15` dev | `$15-100+` | `$100-500+` | Very good API, but usage cost is unnecessary this early. |
| jsPDF | client-side | basic | weak | weak | `$0` | `$0` | `$0` | Fine for quick exports, not enough for Parcel’s report layer. |

### Pick

**Pick: Playwright in a worker**

Why:

- easiest path to pixel-accurate HTML/CSS report templates
- custom fonts and logos are trivial
- existing React charting can render naturally
- background worker can generate and upload to R2

### Fallback

**Fallback: Gotenberg**

If you want PDF generation isolated from the main worker process, Gotenberg is the right service-style fallback.

### Founder-selected final choice

The final implementation path is:

- **Playwright now**
- **Gotenberg later**, only if Parcel adds broader document conversion, merge/split, or Office-document-to-PDF workflows

## 12. Category 11: Offline Mobile Database

### Comparison

| Option | Capacitor fit | Sync strategy | Conflict handling | Cost | Verdict |
|---|---|---|---|---|---|
| SQLite via `@capacitor-community/sqlite` | excellent | you build it | you build it | low | Best raw local DB, but sync is all on you. |
| WatermelonDB | decent via React Native, weaker for Capacitor | custom sync | app-defined | low | Good local DB, not the cleanest Capacitor path. |
| Realm | local DB fine | Atlas Device Sync no longer my recommendation | okay historically | moderate | Not the right sync bet now. |
| PouchDB + CouchDB | okay | Couch replication | decent | low/moderate | Wrong sync model for a Postgres SaaS backend. |
| PowerSync | strong | Postgres -> SQLite sync layer | strong | moderate/commercial | **Best fit** for Parcel once offline D4D ships. |
| ElectricSQL | improving | Postgres sync | strong | low/moderate | Very interesting, but less battle-tested for this exact shape. |
| CRDT-based solutions | mixed | CRDT sync | strong for collaborative docs | high complexity | Wrong problem shape. |

### Pick

**Pick: PowerSync + Capacitor SQLite**

Why:

- Parcel’s offline problem is not just local storage, it is **sync**
- it fits a Postgres-backed architecture
- it reduces the amount of custom sync conflict code the founder has to invent

### Fallback

**Fallback: raw Capacitor SQLite + custom sync**

Use it only if Wave 7 mobile scope stays extremely narrow.

## 13. Final Recommended Stack

### Founder-selected final stack

This is the stack that should be treated as canonical for implementation.

### Primary choices

| Layer | Pick | Why |
|---|---|---|
| Database | **Supabase Postgres** | Best requirements match for `PostGIS + pgvector + RLS`. |
| Vector search | **pgvector in Postgres** | No second system until proven necessary. |
| Search | **Postgres native FTS** | Enough for Parcel’s first 10K users. |
| Auth | **Clerk** | Best identity product for this app shape. |
| Object storage | **Cloudflare R2** | S3-compatible and no egress tax. |
| Background jobs | **Dramatiq + Upstash Redis** | Good-enough Python queue stack with lower friction for the chosen setup. |
| Cache / rate limits | **Upstash Redis** | Start with Redis from day one for jobs, cache, and rate limits. |
| Backend hosting | **Railway** | Founder-selected host; fast enough and simple enough at this stage. |
| Frontend hosting | **Vercel** | Keep the frontend where it belongs. |
| PDF generation | **Playwright worker** | Best fidelity for branded reports. |
| Document conversion later | **Gotenberg** | Add only if Parcel needs broader document-conversion workflows. |
| Realtime | **none initially** | Not needed yet. |
| Offline mobile sync | **PowerSync + Capacitor SQLite** | Best future answer when Wave 7 arrives. |

### Fallback stack

If you want fewer vendors:

- Railway for API + workers
- Railway or Supabase for Redis alternative if needed
- Supabase Postgres stays the DB
- R2 stays storage
- Clerk stays auth

## 14. Total Cost at 100, 1K, 10K Users

### Core recommended stack

| Component | 100 users | 1K users | 10K users |
|---|---:|---:|---:|
| Supabase Postgres | `$25` | `$25-100` | `$150-400` |
| Railway API + worker | `$10-40` | `$40-120` | `$120-400` |
| Upstash Redis | `$0-10` | `$10-30` | `$30-100` |
| Clerk | `$0-25` | `$0-25` | `$0-25` |
| R2 storage | `<$1` | `$1-5` | `$5-20` |
| Playwright PDF infra overhead | included in worker | included / small bump | `$10-40` extra worker cost |
| PowerSync | `$0` before mobile | `$0` before mobile | `$49+` once Wave 7 ships |
| **Approx total** | **`$35-100/mo`** | **`$76-280/mo`** | **`$305-1,010/mo`** |

Again: these are not the scary numbers. The scary numbers are external usage services.

## 15. Migration Plan From the Current Stack

The current repo is still:

- custom JWT auth
- Railway-hosted assumptions
- S3-compatible storage code
- no Redis queue
- no real job system
- no PostGIS / pgvector / RLS layer

### If adopting the recommended stack

1. **Move auth first**
   - add Clerk
   - map Clerk user IDs to Parcel `users`
   - keep domain authorization inside Parcel DB

2. **Provision new Supabase Postgres**
   - enable `PostGIS`
   - enable `pgvector`
   - design RLS policies from day one

3. **Migrate schema**
   - `pg_dump/pg_restore` or logical migration
   - this is early enough that a clean migration is still manageable

4. **Add Upstash Redis + Dramatiq**
   - move enrichment, embeddings, alerts, and PDFs off request thread

5. **Retarget object storage**
   - current `boto3` abstraction makes R2 migration straightforward

6. **Add Playwright report worker on Railway**
   - generate server-side PDFs into R2

7. **Leave realtime alone**
   - do not add it during infrastructure migration

8. **Add PowerSync only when mobile D4D actually ships**

## 16. What Would I Regret?

| Choice | Regret scenario |
|---|---|
| Supabase Postgres | If you over-adopt platform-specific extras and later want a more generic infra posture. |
| `pgvector` | If RAG becomes a heavy always-on workload and you waited too long to separate it. |
| Clerk | If you later want deep self-hosting or white-label auth control. |
| Dramatiq + Upstash Redis | If job throughput or queue latency grows enough that Upstash stops being the broker you want. |
| Railway | If you later want extremely fine-grained networking, autoscaling, or cloud-native cost tuning. |
| R2 | If you later need deep AWS-native IAM/integration patterns. |
| Postgres native search | If search quality becomes a major product differentiator. |
| PowerSync | If offline mobile stays tiny and you bought a sync platform too early. |

## 17. Irreversible Decisions

### Hard to change later

- database family (`Postgres` vs not)
- auth provider and user identity model
- RLS model and tenant-context strategy
- file key scheme + metadata schema
- offline sync model once mobile ships

### Medium difficulty

- queue system / Redis vendor
- PDF engine
- search engine

### Easy to swap later

- app host (`Railway` <-> `Render`)
- Redis broker/cache vendor
- object storage vendor if you stay S3-compatible
- dedicated realtime provider, if you keep it deferred

## Final Call

If I were choosing from scratch for Parcel today, I would build on:

- **Supabase Postgres**
- **pgvector**
- **PostGIS**
- **Clerk**
- **Railway**
- **Dramatiq + Upstash Redis**
- **Cloudflare R2**
- **Postgres native search**
- **Playwright**
- **Gotenberg later**
- **PowerSync later**

That is the stack most likely to get Parcel to `150 -> 10,000` users without either:

- painting the founder into a corner technically
- or drowning him in infrastructure work instead of product work

## Sources

- Supabase pricing: `https://supabase.com/pricing`
- Supabase PostGIS: `https://supabase.com/docs/guides/database/extensions/postgis`
- Supabase pgvector: `https://supabase.com/docs/guides/database/extensions/pgvector`
- Supabase RLS: `https://supabase.com/docs/guides/database/postgres/row-level-security`
- Railway pricing: `https://docs.railway.com/reference/pricing/plans`
- Railway Postgres: `https://docs.railway.com/databases/postgresql`
- Neon pricing: `https://neon.com/pricing`
- Neon pgvector: `https://neon.com/docs/extensions/pgvector`
- Neon PostGIS: `https://neon.com/docs/extensions/postgis`
- Amazon RDS pricing: `https://aws.amazon.com/rds/postgresql/pricing/`
- Google Cloud SQL pricing: `https://cloud.google.com/sql/pricing`
- CockroachDB pricing: `https://www.cockroachlabs.com/pricing/`
- CockroachDB vector indexes: `https://www.cockroachlabs.com/docs/stable/vector-indexes`
- CockroachDB row-level security: `https://www.cockroachlabs.com/docs/stable/row-level-security`
- Turso pricing: `https://turso.tech/pricing`
- Clerk pricing: `https://clerk.com/pricing`
- Cloudflare R2 pricing: `https://developers.cloudflare.com/r2/pricing/`
- AWS S3 pricing: `https://aws.amazon.com/s3/pricing/`
- Pinecone pricing: `https://www.pinecone.io/pricing/`
- Qdrant pricing: `https://qdrant.tech/pricing/`
- WeasyPrint: `https://weasyprint.org/`
- Playwright docs: `https://playwright.dev/`
- Render pricing: `https://render.com/pricing`
- Fly.io pricing: `https://fly.io/docs/about/pricing/`
- DigitalOcean App Platform pricing: `https://www.digitalocean.com/pricing/app-platform`
- Upstash Redis pricing: `https://upstash.com/pricing/redis`
- Dragonfly pricing: `https://www.dragonflydb.io/pricing`
- Meilisearch pricing: `https://www.meilisearch.com/pricing`
- Typesense pricing: `https://typesense.org/cloud`
- Algolia pricing: `https://www.algolia.com/pricing/`
- ParadeDB: `https://www.paradedb.com/`
- PowerSync: `https://www.powersync.com/`
- PouchDB sync docs: `https://pouchdb.com/guides/`
