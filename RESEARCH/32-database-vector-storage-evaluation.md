# 32 — Database & Vector Storage Evaluation (Requirements-First)

> Researched: April 2, 2026
> Context: Solo founder, 25-30 hrs/week. US-only SaaS, 150-10K users over 2 years. $29-149/mo subscriptions. ~26+ tables, Python/FastAPI backend.

---

## HARD REQUIREMENTS CHECKLIST

Every option evaluated against:

| # | Requirement | Detail |
|---|------------|--------|
| 1 | Complex relational data | FK constraints, multi-table joins, 26+ tables |
| 2 | Geospatial | Store coordinates, "within 5 miles" queries, GPS polylines |
| 3 | Vector embeddings | RAG retrieval, <100K vectors @ 1K users, <1M @ 10K |
| 4 | Row-Level Security | Multi-tenant isolation at DB level |
| 5 | Full-text search | Fuzzy matching on names, addresses, notes |
| 6 | Python ORM | SQLAlchemy preferred |

---

## CATEGORY 1: PRIMARY DATABASE

### Estimated DB Sizes for Pricing

| Scale | Users | Estimated DB Size | Compute Need |
|-------|-------|-------------------|--------------|
| Seed | 100 | 1-5 GB | 1 vCPU / 1-2 GB RAM |
| Growth | 1,000 | 10-25 GB | 2 vCPU / 4 GB RAM |
| Scale | 10,000 | 50-150 GB | 4-8 vCPU / 16-32 GB RAM |

---

### 1. Railway PostgreSQL (Current Stack)

**Pricing:**
- Hobby: $5/mo subscription + usage. Pro: $20/mo + usage
- Compute: ~$0.028/vCPU-hour, ~$0.014/GB-RAM-hour
- Storage: $0.25/GB-month
- **@ 100 users:** ~$15-25/mo (1 vCPU, 2 GB RAM, 5 GB storage)
- **@ 1K users:** ~$40-70/mo (2 vCPU, 4 GB RAM, 25 GB)
- **@ 10K users:** ~$150-300/mo (4-8 vCPU, 16 GB RAM, 100 GB)

| Requirement | Support | Notes |
|------------|---------|-------|
| PostGIS | Yes | Custom Docker image or HA template (PG18 AI+GIS template) |
| pgvector | Yes | `CREATE EXTENSION vector;` on PG14+ |
| RLS | Yes | Full PostgreSQL RLS |
| Full-text search | Yes | tsvector + pg_trgm for fuzzy |
| SQLAlchemy | Yes | Native PostgreSQL driver |

**Connection limits:** Default 100, adjustable. No built-in connection pooler — need PgBouncer sidecar.
**Backups:** Daily automatic, PITR on Pro plan.
**Downsides:** No managed connection pooling. Custom Docker needed for multi-extension setups. No read replicas on Hobby. Scaling requires manual intervention above 32 vCPU / 32 GB.
**Solo dev regret at 10K?** Unlikely — usage-based pricing scales well. May need to add PgBouncer and read replicas manually.

---

### 2. Neon (Serverless PostgreSQL)

**Pricing:**
- Free: 100 CU-hours/mo, 0.5 GB storage
- Launch: $0.106/CU-hour, $0.35/GB-month (pay-as-you-go, was $5 minimum — now no minimum)
- Scale: $0.222/CU-hour, $0.35/GB-month (more features)
- **@ 100 users:** ~$10-20/mo (scales to zero when idle)
- **@ 1K users:** ~$30-60/mo
- **@ 10K users:** ~$100-250/mo (depends heavily on compute hours)

| Requirement | Support | Notes |
|------------|---------|-------|
| PostGIS | Yes | Supported extension |
| pgvector | Yes | Supported extension (0.7+) |
| RLS | Yes | Full PostgreSQL RLS |
| Full-text search | Yes | tsvector + pg_trgm |
| SQLAlchemy | Yes | Standard PG driver |

**Killer feature:** Scale-to-zero (no cost when idle), database branching for preview environments.
**Connection limits:** Built-in connection pooling via serverless proxy. No PgBouncer needed.
**Cold starts:** ~500ms on scale-to-zero wake. Can keep-alive for $0.
**Downsides:** Compute costs can spike under sustained load. Scale-to-zero means cold starts. Storage can't shrink (WAL-based). Owned by Databricks now — unclear long-term strategy for small customers.
**Solo dev regret at 10K?** Possible — under sustained load, hourly compute billing can exceed fixed-instance providers. Great for dev/staging, potentially expensive for always-on production.

---

### 3. Supabase

**Pricing:**
- Free: 500 MB DB, 50K MAUs
- Pro: $25/mo base (8 GB DB, 100K MAUs)
- Compute add-ons: Small instance $5/mo, Medium $25/mo, Large (2-core/4GB) $50/mo, XL (4-core/8GB) $110/mo
- **@ 100 users:** ~$25/mo (Pro base)
- **@ 1K users:** ~$50-75/mo (Pro + medium compute)
- **@ 10K users:** ~$150-300/mo (Pro + XL compute + extra storage)

| Requirement | Support | Notes |
|------------|---------|-------|
| PostGIS | Yes | Pre-installed (50+ extensions included) |
| pgvector | Yes | Pre-installed, RAG-with-permissions docs |
| RLS | Yes | First-class citizen — deeply integrated with Supabase Auth |
| Full-text search | Yes | tsvector + pg_trgm |
| SQLAlchemy | Yes | Direct PG connection string available |

**Bundled extras:** Auth, storage, realtime subscriptions, edge functions, dashboard UI.
**Connection limits:** Built-in Supavisor connection pooler. IPv4 add-on $4/mo.
**Downsides:** Vendor lock-in for auth/storage if you use their SDK. Dashboard can mask database complexity. Real production cost is $50-150/mo, not the advertised $25. IPv4 is an add-on. Reliability incidents have occurred (2024-2025 had notable outages). You're not running vanilla PG — it's their image.
**Solo dev regret at 10K?** Possibly — compute add-on pricing escalates. But the bundled auth + storage + realtime saves significant dev time. Best for teams using Supabase SDK directly, less ideal for FastAPI backends that just want PG.

---

### 4. Amazon RDS PostgreSQL

**Pricing:**
- db.t4g.micro: $0.016/hr (~$12/mo) — 2 vCPU, 1 GB RAM
- db.t4g.small: $0.032/hr (~$23/mo) — 2 vCPU, 2 GB RAM
- db.t4g.medium: $0.065/hr (~$47/mo) — 2 vCPU, 4 GB RAM
- db.t4g.large: $0.130/hr (~$95/mo) — 2 vCPU, 8 GB RAM
- Storage: $0.115/GB-month (gp3)
- **@ 100 users:** ~$25-35/mo (t4g.small + 10 GB)
- **@ 1K users:** ~$60-90/mo (t4g.medium + 30 GB)
- **@ 10K users:** ~$200-400/mo (m6g.large + 150 GB + Multi-AZ)

| Requirement | Support | Notes |
|------------|---------|-------|
| PostGIS | Yes | Supported extension |
| pgvector | Yes | Supported on PG15+ |
| RLS | Yes | Full PostgreSQL RLS |
| Full-text search | Yes | tsvector + pg_trgm |
| SQLAlchemy | Yes | Standard PG driver |

**Downsides:** AWS complexity tax — VPCs, security groups, IAM. Free tier (750 hrs/mo db.t4g.micro) for first 12 months only. No scale-to-zero. Multi-AZ doubles cost. Overkill for a solo dev at seed stage.
**Solo dev regret at 10K?** No — RDS is battle-tested at any scale. But you're paying for infra management overhead that simpler providers handle.

---

### 5. Google Cloud SQL PostgreSQL

**Pricing:**
- Smallest: 1 vCPU / 3.75 GB — ~$30/mo
- **@ 100 users:** ~$35-50/mo
- **@ 1K users:** ~$80-120/mo
- **@ 10K users:** ~$250-500/mo

Same extension support as RDS. Similar AWS-level complexity.
**Verdict:** No advantage over RDS unless you're already on GCP. More expensive at small scale.

---

### 6. DigitalOcean Managed PostgreSQL

**Pricing:**
- Single-node entry: $15/mo (1 GB RAM)
- HA cluster entry: $60/mo (2-node, 2 GB each)
- Additional storage: $0.21/GB-month
- **@ 100 users:** ~$15-30/mo
- **@ 1K users:** ~$60-100/mo (HA cluster + storage)
- **@ 10K users:** ~$200-400/mo

| Requirement | Support | Notes |
|------------|---------|-------|
| PostGIS | Yes | Supported extension |
| pgvector | Yes | v0.7.2 (lagging behind latest 0.8.0) |
| RLS | Yes | Full PostgreSQL RLS |
| Full-text search | Yes | tsvector + pg_trgm |
| SQLAlchemy | Yes | Standard PG driver |

**Downsides:** pgvector version lags. Limited instance type options. No connection pooler included (need external). Fewer regions than AWS/GCP.
**Solo dev regret at 10K?** Possible — limited scaling options compared to Railway or Neon.

---

### 7. Render PostgreSQL

**Pricing:**
- Free: 1 GB, expires 30 days
- Basic-256mb: $6/mo (0.1 CPU, 256 MB)
- Basic-1gb: $19/mo (0.5 CPU, 1 GB)
- Basic-4gb: $75/mo (2 CPU, 4 GB)
- Pro-4gb: $55/mo (1 CPU, 4 GB)
- Storage: $0.30/GB-month
- **@ 100 users:** ~$19-30/mo
- **@ 1K users:** ~$55-100/mo
- **@ 10K users:** ~$200-400/mo

**Downsides:** Storage pricing is expensive ($0.30/GB vs $0.10-0.25 elsewhere). No PITR on lower tiers. Extension support unclear for PostGIS/pgvector.
**Solo dev regret at 10K?** Possible — storage costs add up. Render is better for apps than databases.

---

### 8. Tembo

**Pricing:**
- Hobby: Free (limited)
- Paid: Consumption-based, unclear public pricing
- Pre-configured stacks: OLTP, LLM, Data Warehouse, etc.
- 200+ extensions via Trunk package manager

**Downsides:** Pricing is opaque. Small company — risk of shutdown. Limited public benchmarks.
**Solo dev regret at 10K?** Unknown — too early-stage to bet on.

---

### 9. Crunchy Data (Crunchy Bridge)

**Pricing:**
- Hobby-0: $9/mo (2 cores, 0.5 GB RAM)
- Hobby-2: $35/mo (1 core, 2 GB RAM)
- Standard-4: $70/mo (4 GB RAM)
- Storage: $0.10/GB-month
- **@ 100 users:** ~$18-35/mo
- **@ 1K users:** ~$70-100/mo
- **@ 10K users:** ~$240-500/mo

**Strong points:** PostgreSQL experts (created PG Operator for K8s). SOC2, HIPAA. Storage is cheapest ($0.10/GB). Built-in connection pooling. PITR included.
**Downsides:** UI is minimal compared to Supabase. Pricing tiers jump quickly. Enterprise-focused marketing.
**Solo dev regret at 10K?** No — Crunchy is excellent for serious PG workloads. But you're paying for enterprise polish.

---

### 10. Aiven PostgreSQL

**Pricing:**
- Free: Limited (auto-powers-off)
- Developer: $5/mo
- Hobbyist: ~$19/mo
- Startup: ~$99/mo (daily backups, 2-day retention)
- Business: ~$299/mo (HA, 14-day retention)
- **@ 100 users:** ~$19-30/mo
- **@ 1K users:** ~$99-150/mo
- **@ 10K users:** ~$299-600/mo

**Strong points:** Multi-cloud (AWS, GCP, Azure). Hourly billing. Good observability.
**Downsides:** Expensive at scale. Free/Developer tiers have 0-day backup retention (!). Enterprise-oriented.
**Solo dev regret at 10K?** Possible — costs escalate faster than alternatives.

---

### 11. PlanetScale (MySQL)

**Quick verdict: DISQUALIFIED**

| Requirement | Support |
|------------|---------|
| PostGIS equivalent | No native geospatial — MySQL spatial functions are limited |
| pgvector equivalent | Yes — custom SPANN-based vector search (GA 2025) |
| RLS | No — MySQL has no native RLS. PlanetScale has RLS discussion for their PG product only |
| Full-text search | Basic MySQL FULLTEXT |
| SQLAlchemy | Yes (MySQL dialect) |

PlanetScale now offers both MySQL and PostgreSQL products. The MySQL product fails on geospatial and RLS. Their PG product is new and unproven. **Not recommended for this use case.**

---

### 12. TiDB (Distributed MySQL-compatible)

**Quick verdict: DISQUALIFIED**

- Free tier: 25 GB storage, 250M RUs
- Serverless: ~$0.10/1M RUs, $0.20/GB storage
- Dedicated starts at $1,376/mo (overkill)
- **No PostGIS.** Limited geospatial. No native RLS. Vector search exists.
- Designed for massive scale HTAP workloads. Complete overkill for a solo-founder SaaS.

---

### 13. CockroachDB (Distributed PG-compatible)

**Quick verdict: DISQUALIFIED**

- Basic/Standard/Advanced cloud tiers
- PG compatibility score: only 40.21% (!)
- pgvector: Yes (integration)
- PostGIS: Not supported
- RLS: Not supported (open issue #73596)
- Designed for global distribution — total overkill for US-only SaaS
- Expensive at small scale

---

### 14. YugabyteDB (Distributed PG-compatible)

**Quick verdict: OVERPRICED / OVERKILL**

- Standard: $125/vCPU/mo (minimum 3 nodes = $375/mo baseline)
- Professional: $167/vCPU/mo
- pgvector: Yes
- PostGIS: Not confirmed
- RLS: Yes (PostgreSQL-compatible)
- Designed for globally distributed apps. US-only SaaS doesn't need this.
- **@ 100 users:** ~$375/mo minimum — 10x more expensive than alternatives

---

### 15. Turso (Edge SQLite)

**Quick verdict: WRONG FIT**

- Free: 100 databases. Developer: $4.99/mo. Scaler: $24.92/mo. Pro: $79/mo.
- Multi-tenant via database-per-tenant pattern (elegant for isolation)
- **No PostGIS.** No pgvector. No RLS (SQLite limitation).
- No FK constraints by default in SQLite.
- SQLAlchemy support via third-party adapters only.
- **Fails 4 of 6 hard requirements.** Great for edge-first apps, wrong for this use case.

---

### 16. MongoDB Atlas

**Quick verdict: WRONG PARADIGM**

- Flex: Capped at $30/mo. Dedicated M10: ~$57/mo.
- Geospatial: Yes (native `$geoWithin`, `$near`)
- Vector search: Yes (Atlas Vector Search, native)
- RLS: No native RLS — must implement in application layer
- Full-text search: Yes (Atlas Search / Lucene-based)
- SQLAlchemy: **No** — uses PyMongo or MongoEngine (ODM, not ORM)
- **No FK constraints.** No joins (without `$lookup`). No relational data model.
- With 26+ tables of complex relational data, MongoDB would require completely restructuring the data model, denormalizing aggressively, and losing referential integrity.
- **Fails the core relational requirement.**

---

### 17. DynamoDB

**Quick verdict: ABSOLUTELY NOT**

- NoSQL key-value store. No joins. No FK constraints. No RLS. No geospatial (requires geo library hack). No vector search (cache layer only). No SQLAlchemy.
- **Fails all 6 hard requirements.** DynamoDB is for high-throughput key-value access patterns, not relational SaaS.

---

### 18. Convex

**Quick verdict: INTERESTING BUT WRONG**

- Free starter, $25/member/mo Professional
- Has vector search, geospatial queries (via components), document storage
- **No SQL.** No SQLAlchemy. No PostgreSQL compatibility. No RLS.
- Custom TypeScript-first query language
- Designed for realtime apps with reactive queries
- **Fails ORM and RLS requirements.** Would require full stack rewrite.

---

### 19. SurrealDB

**Quick verdict: TOO IMMATURE**

- SurrealDB 3.0 GA in Feb 2026. $23M Series A extension.
- Multi-model: relational + document + graph + vector + geospatial + time-series
- Cloud: Free tier → $0.021/hr compute (~$15/mo)
- Has RBAC/ABAC (not PostgreSQL RLS, but role-based access control)
- Full-text search: Yes
- **No SQLAlchemy** — uses SurrealQL (custom query language) with Python SDK
- Python driver exists but ecosystem is thin
- Customers include Verizon, Walmart (but mostly pilot/experimental)
- **Risk:** Just hit GA. Production battle-testing is minimal. Migration path out is painful (proprietary query language).
- **Solo dev regret at 10K?** High — betting on a v3.0 product with no migration path is risky.

---

### 20. EdgeDB (now "Gel")

**Quick verdict: RISKY RENAME**

- Rebranded from EdgeDB to Gel in Feb 2025 to avoid "edge computing" confusion
- PG-based with graph-relational query language (EdgeQL)
- Cloud: ~$39/mo (Basic, 1/4 vCPU, 2 GB RAM) — old pricing, may have changed
- Python driver exists, but **no SQLAlchemy** — uses EdgeQL/Gel-specific client
- PostGIS: Not supported (PG extension compatibility is limited)
- pgvector: Not confirmed
- RLS: Not PostgreSQL-native (Gel has its own access policies)
- **Risk:** Renamed product, small company, niche ecosystem. If Gel fails, migration back to PG requires query rewrite.

---

## CATEGORY 1: COMPARISON TABLE

| Provider | @ 100 users | @ 1K users | @ 10K users | PostGIS | pgvector | RLS | FTS | SQLAlchemy | Pooling | Solo Dev? |
|----------|------------|-----------|------------|---------|----------|-----|-----|------------|---------|-----------|
| **Railway** | $15-25 | $40-70 | $150-300 | Yes | Yes | Yes | Yes | Yes | Manual | Good |
| **Neon** | $10-20 | $30-60 | $100-250 | Yes | Yes | Yes | Yes | Yes | Built-in | Good (dev), pricey (prod) |
| **Supabase** | $25 | $50-75 | $150-300 | Yes | Yes | Yes | Yes | Yes | Built-in | Good + extras |
| **RDS** | $25-35 | $60-90 | $200-400 | Yes | Yes | Yes | Yes | Yes | Via proxy | Overkill |
| **Cloud SQL** | $35-50 | $80-120 | $250-500 | Yes | Yes | Yes | Yes | Yes | Via proxy | Overkill |
| **DigitalOcean** | $15-30 | $60-100 | $200-400 | Yes | Yes* | Yes | Yes | Yes | Manual | OK |
| **Render** | $19-30 | $55-100 | $200-400 | ? | ? | Yes | Yes | Yes | Manual | OK, pricey storage |
| **Tembo** | ? | ? | ? | Yes | Yes | Yes | Yes | Yes | ? | Too opaque |
| **Crunchy** | $18-35 | $70-100 | $240-500 | Yes | Yes | Yes | Yes | Yes | Built-in | Good, enterprise |
| **Aiven** | $19-30 | $99-150 | $299-600 | Yes | Yes | Yes | Yes | Yes | Yes | Expensive |
| PlanetScale | - | - | - | No | Yes | No | Basic | Yes | - | DISQUALIFIED |
| TiDB | - | - | - | No | Yes | No | Yes | Yes | - | DISQUALIFIED |
| CockroachDB | - | - | - | No | Yes | No | - | Partial | - | DISQUALIFIED |
| YugabyteDB | $375+ | $500+ | $750+ | ? | Yes | Yes | Yes | Yes | - | OVERKILL |
| Turso | $0-5 | $25-79 | $79+ | No | No | No | No | Partial | - | WRONG FIT |
| MongoDB | $30 | $57+ | $200+ | Yes | Yes | No | Yes | No | - | WRONG FIT |
| DynamoDB | - | - | - | No | No | No | No | No | - | ABSOLUTELY NOT |
| Convex | $0-25 | $25+ | ? | Via lib | Yes | No | Yes | No | - | WRONG FIT |
| SurrealDB | $15 | $30-60 | $100+ | Yes | Yes | RBAC | Yes | No | - | TOO IMMATURE |
| Gel (EdgeDB) | $39 | ? | ? | No | ? | Own | ? | No | - | RISKY |

*DigitalOcean pgvector is at v0.7.2, lagging behind 0.8.0

---

## CATEGORY 1: THE PICK

### Primary: Railway PostgreSQL (Stay)
### Backup / Future migration: Neon or Crunchy Bridge

**Reasoning:**

1. **Railway already works.** You have a running PG instance with known costs. Switching databases is a week of migration work for zero feature gain.

2. **Railway hits all 6 requirements** with full extension support, the PG18 HA AI+GIS template, and usage-based billing that scales linearly.

3. **Railway is cheapest at seed-to-growth stage** ($15-70/mo for 100-1K users) while remaining competitive at scale ($150-300/mo at 10K).

4. **Migration path is clean.** If Railway becomes limiting, migrating to Neon (for serverless/branching), Crunchy Bridge (for enterprise PG), or even RDS (for AWS ecosystem) is straightforward — it's all just PostgreSQL with the same extensions.

5. **What to add now:** Deploy PgBouncer sidecar for connection pooling. Use the PG18 HA Cluster template with pgvector + PostGIS pre-configured.

**Why not Neon?** Scale-to-zero is great for dev but adds cold-start latency for production. Under sustained load, CU-hour billing can exceed Railway's usage-based model. Databricks acquisition adds uncertainty.

**Why not Supabase?** Great if you use their SDK for auth + storage + realtime. But for a FastAPI backend that just wants a PG connection string, you're paying for features you don't use, and the Supabase abstraction layer adds complexity.

---

## CATEGORY 2: VECTOR DATABASE / EMBEDDINGS

### Scale Context

| Scale | Vectors | Avg Dimensions | Index Size (est.) |
|-------|---------|---------------|-------------------|
| 1K users | ~100K | 1536 (OpenAI ada-002) | ~600 MB |
| 10K users | ~1M | 1536 | ~6 GB |

---

### 1. pgvector (Same PostgreSQL Instance)

**Cost:** $0 incremental (already running PG)

**Performance at scale:**
- 100K vectors (1536d): <10ms query latency with HNSW index. Index size ~600 MB.
- 1M vectors (1536d): 10-30ms query latency with HNSW. Index size ~6 GB. Index build time ~6 minutes.
- 5M+ vectors: Performance starts degrading without careful tuning of `shared_buffers`, `work_mem`, HNSW parameters.

**HNSW support:** Yes (since pgvector 0.5.0). Default `m=16`, `ef_construction=64`.

**Dimension limit:** 2,000 dimensions for HNSW indexes. OpenAI text-embedding-3-small (1536d) fits. text-embedding-3-large (3072d) does NOT fit without dimensionality reduction.

**Multi-tenant filtering:** Yes — `WHERE user_id = $1` in the same query as vector similarity search. RLS policies apply automatically. This is pgvector's killer advantage.

**Python:** `pgvector` package for SQLAlchemy integration. First-class support.

**Downsides:**
- Index builds are CPU/RAM intensive — can affect other queries on the same instance
- No horizontal scaling — limited to single PG instance resources
- No automatic index management (you manage HNSW parameters)
- 2,000-dimension limit blocks some embedding models

**Verdict:** Perfect for <1M vectors. At the Parcel scale (100K-1M vectors), pgvector is the obvious choice. Zero additional infrastructure, zero additional cost, and the multi-tenant filtering via RLS is unbeatable.

---

### 2. Pinecone

**Pricing (April 2026):**
- Starter (Free): 2 GB storage, 2M write units, 1M read units/mo. AWS us-east-1 only.
- Standard: $50/mo minimum. $0.33/GB/mo storage, $4/M write units, $16/M read units.
- Enterprise: $500/mo minimum. $6/M write, $24/M read.
- **@ 100K vectors:** ~$0 (free tier covers it)
- **@ 1M vectors:** ~$50-80/mo (Standard tier)

**Query latency:** <50ms at 1M vectors. <10ms at 100K.

**Multi-tenant filtering:** Yes — metadata filtering on `user_id` field. But it's application-level, not database-level RLS.

**Python SDK:** Excellent. `pinecone-client` is well-maintained.

**Downsides:** Another service to manage. Network latency added to every query. Vendor lock-in — proprietary API. No SQL joins with your relational data. $50/mo minimum on Standard is a tax at seed stage.

**Migration from pgvector:** Moderate — need to re-index all vectors and change query layer.

---

### 3. Weaviate

**Pricing (April 2026):**
- Serverless: $25/1M vector dimensions/mo
- Flex: from $45/mo
- Plus: from $280/mo
- **@ 100K vectors (1536d):** ~$25-45/mo
- **@ 1M vectors:** ~$100-200/mo

**Query latency:** <10ms at 100K, <50ms at 1M with HNSW.

**Multi-tenant filtering:** Yes — native multi-tenancy support with tenant isolation.

**Python SDK:** Good. `weaviate-client` v4 is Pythonic.

**Downsides:** Pricing model based on "vector dimensions" is confusing. More expensive than Pinecone for small workloads. Complex setup for self-hosted.

---

### 4. Qdrant

**Pricing (April 2026):**
- Free: 1 GB RAM, 4 GB disk
- Cloud: Resource-based (vCPU + RAM + storage)
- Mid-range cluster (8 GB RAM, 2 vCPU): $150-200/mo
- **@ 100K vectors:** ~$0 (free tier) or self-hosted
- **@ 1M vectors:** ~$50-150/mo (cloud) or self-hosted for cheaper

**Query latency:** <5ms at 100K, <20ms at 1M.

**Multi-tenant filtering:** Yes — payload filtering on `tenant_id`.

**Python SDK:** Excellent. `qdrant-client` with async support, gRPC, REST.

**Self-hosted:** Docker image, easy to deploy. Can run on same server as app.

**Downsides:** Cloud pricing jumps quickly. Resource-based pricing hard to predict. Smallest production cluster is ~$50/mo.

---

### 5. Chroma

**Pricing (April 2026):**
- Open source: Free (embedded, runs in-process)
- Chroma Cloud: Free for up to 1M embeddings, then usage-based ($100 credits + pay-as-you-go)
- Storage: ~$0.02/GB/mo (object-storage based — cheapest)
- **@ 100K vectors:** $0 (free tier)
- **@ 1M vectors:** ~$5-20/mo (cloud)

**Query latency:** <10ms at 100K (embedded), <30ms at 1M (cloud).

**Multi-tenant filtering:** Yes — metadata filtering on `tenant_id`.

**Python SDK:** Native Python — Chroma is Python-first. `chromadb` package.

**Downsides:** NOT production-hardened for concurrent high-throughput. Cloud is still maturing. No HA guarantees on lower tiers. The embedded mode is great for prototyping but not suitable for multi-instance deployments.

---

### 6. Milvus / Zilliz Cloud

**Pricing (April 2026):**
- Free tier: 5 GB storage, 2.5M vCUs/mo
- Serverless: $4/M vCUs, $0.04/GB/mo storage
- Dedicated: from $99/mo
- **@ 100K vectors:** ~$0 (free tier)
- **@ 1M vectors:** ~$20-50/mo (serverless)

**Query latency:** <5ms at 100K, <10ms at 1M. Best-in-class at scale.

**Multi-tenant filtering:** Yes — partition keys and metadata filtering.

**Python SDK:** `pymilvus` — mature, well-documented.

**Downsides:** Zilliz Cloud is more complex than needed for <1M vectors. Self-hosted Milvus requires Kubernetes or Docker Compose with etcd + MinIO — operationally heavy.

---

### 7. LanceDB

**Pricing (April 2026):**
- OSS: Free (embedded, in-process)
- Cloud: $16.03/mo (serverless)
- **@ 100K vectors:** $0 (OSS embedded)
- **@ 1M vectors:** ~$16/mo (cloud)

**Query latency:** <10ms at 100K, <20ms at 1M. Lance columnar format is efficient.

**Multi-tenant filtering:** Yes — metadata filtering, namespace isolation.

**Python SDK:** `lancedb` — good, integrates with LangChain.

**Downsides:** Relatively new (YC-backed). Cloud service is young. Smaller community than Pinecone/Qdrant.

---

### 8. Turbopuffer

**Pricing (April 2026):**
- $1/mo per 1M vectors stored
- $4/M queries
- Storage: $70/TB/mo
- **Minimum spend: $64/mo**
- **@ 100K vectors:** $64/mo (minimum)
- **@ 1M vectors:** $64-70/mo

**Query latency:** Sub-10ms. Powers Cursor and Notion.

**Multi-tenant filtering:** Yes — namespace-based isolation.

**Downsides:** $64/mo minimum is high for seed stage. Newer product. No self-hosted option.

---

### 9. Vespa

**Pricing (April 2026):**
- $3.36/hr for 5M 768d vectors with HA (~$2,450/mo)
- Billed by allocated machine resources per hour
- **@ 100K vectors:** ~$100-200/mo (estimated — Vespa doesn't have small tiers)
- **@ 1M vectors:** ~$500-1,000/mo

**Capabilities:** Best-in-class hybrid search (vector + lexical + structured). Real-time HNSW. Production-proven at Yahoo/Verizon scale.

**Downsides:** Massively overpriced for <10M vectors. Designed for enterprise search at scale. Minimum viable deployment is expensive. Complex to operate.

**Verdict:** Wrong scale entirely. Vespa is for companies with 100M+ vectors.

---

## CATEGORY 2: COMPARISON TABLE

| Provider | @ 100K vectors | @ 1M vectors | Latency (1M) | Tenant filtering | Python SDK | Self-hosted | Migration from pgvector |
|----------|---------------|-------------|-------------|-----------------|-----------|-------------|------------------------|
| **pgvector** | $0 | $0 | 10-30ms | RLS (best) | SQLAlchemy | N/A (in PG) | N/A |
| Pinecone | $0 | $50-80 | <50ms | Metadata | Excellent | No | Moderate |
| Weaviate | $25-45 | $100-200 | <50ms | Native MT | Good | Yes | Moderate |
| Qdrant | $0 | $50-150 | <20ms | Payload | Excellent | Yes (easy) | Moderate |
| Chroma | $0 | $5-20 | <30ms | Metadata | Native Py | Yes | Easy |
| Zilliz/Milvus | $0 | $20-50 | <10ms | Partition | Good | Yes (heavy) | Moderate |
| LanceDB | $0 | $16 | <20ms | Metadata | Good | Yes | Easy |
| Turbopuffer | $64 | $64-70 | <10ms | Namespace | SDK | No | Moderate |
| Vespa | $100-200 | $500-1K | <5ms | Yes | pyvespa | Yes (heavy) | Hard |

---

## CATEGORY 2: THE PICK

### Primary: pgvector (in Railway PostgreSQL)
### Escape hatch (if needed): Qdrant Cloud or LanceDB Cloud

**Reasoning:**

1. **pgvector handles the entire projected scale.** 100K vectors at 1K users and 1M vectors at 10K users are well within pgvector's comfort zone with HNSW indexes. Query latency of 10-30ms at 1M vectors is more than fast enough for RAG chat (the LLM call that follows takes 1-3 seconds).

2. **Zero additional cost.** Vectors live in the same database as your relational data. No second service to manage, monitor, or pay for.

3. **Multi-tenant filtering via RLS is unbeatable.** With pgvector, you write `SELECT * FROM embeddings WHERE user_id = $1 ORDER BY embedding <=> $2 LIMIT 5` and RLS ensures tenant isolation automatically. No other vector DB gives you database-level tenant isolation — they all rely on application-level metadata filtering.

4. **Transactional consistency.** When a document is uploaded, its embedding and relational metadata are committed in the same transaction. No eventual consistency issues between two systems.

5. **SQLAlchemy integration is native.** The `pgvector` Python package adds vector column types and operators directly to SQLAlchemy.

### When to migrate away from pgvector

Based on the research, the realistic ceiling is:

| Vectors | pgvector OK? | Action needed |
|---------|-------------|---------------|
| <100K | Effortless | No tuning needed |
| 100K-1M | Yes with HNSW | Ensure adequate RAM for index (~6 GB for 1M @ 1536d) |
| 1M-5M | Yes with tuning | Dedicated compute for index builds, tune `shared_buffers` |
| 5M-10M | Marginal | Consider dedicated vector DB if query latency >50ms |
| 10M+ | Migrate | Move to Qdrant or Pinecone |

**For Parcel's projected scale (max 1M vectors at 10K users), pgvector will not be the bottleneck.** The migration trigger would be either:
- Exceeding 5M vectors (unlikely before 50K+ users)
- Needing sub-5ms latency (unnecessary for RAG)
- Vector index builds causing query performance degradation on the main DB (solvable with a read replica)

If migration is ever needed, **Qdrant Cloud** is the recommended escape hatch: excellent Python SDK, affordable cloud pricing, easy self-hosted option, and good metadata filtering for multi-tenancy.

---

## FINAL RECOMMENDATIONS

| Decision | Pick | Cost (seed → scale) | Why |
|----------|------|---------------------|-----|
| **Primary Database** | Railway PostgreSQL | $15-300/mo | All 6 requirements met. Already running. Cheapest at seed. |
| **Vector Storage** | pgvector (same instance) | $0 incremental | Handles 1M vectors fine. RLS for free. Zero ops overhead. |
| **Connection Pooling** | PgBouncer sidecar on Railway | $0-5/mo | Needed before 500+ connections |
| **Escape hatch (DB)** | Neon or Crunchy Bridge | - | If Railway limits hit, migrate PG-to-PG |
| **Escape hatch (vectors)** | Qdrant Cloud | $50-150/mo | Only if >5M vectors or index builds kill performance |

### Total infrastructure cost projection:

| Scale | Users | DB Cost | Vector Cost | Total |
|-------|-------|---------|-------------|-------|
| Seed | 100 | $15-25/mo | $0 | **$15-25/mo** |
| Growth | 1,000 | $40-70/mo | $0 | **$40-70/mo** |
| Scale | 10,000 | $150-300/mo | $0 | **$150-300/mo** |

**The key insight:** PostgreSQL with pgvector + PostGIS + RLS + pg_trgm is genuinely a "one database to rule them all" solution for this use case. Adding a second database or a dedicated vector store at this scale adds operational complexity with zero performance benefit. The migration path is clean if you outgrow it, but the research strongly suggests you won't need to migrate before 50K+ users.

---

## SOURCES

### Primary Database
- [Railway Pricing](https://railway.com/pricing) | [Railway PG Docs](https://docs.railway.com/databases/postgresql) | [Railway PG18 HA Template](https://railway.com/deploy/postgresql-18-ha-cluster-ai-and-gis-read)
- [Neon Pricing](https://neon.com/pricing) | [Neon Plans](https://neon.com/docs/introduction/plans)
- [Supabase Pricing](https://supabase.com/pricing) | [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) | [Supabase Extensions](https://supabase.com/features/postgres-extensions)
- [AWS RDS Pricing](https://aws.amazon.com/rds/postgresql/pricing/)
- [Google Cloud SQL Pricing](https://cloud.google.com/sql/pricing)
- [DigitalOcean Managed DB Pricing](https://www.digitalocean.com/pricing/managed-databases) | [DO PG Extensions](https://docs.digitalocean.com/products/databases/postgresql/details/supported-extensions/)
- [Render Pricing](https://render.com/pricing) | [Render PG Docs](https://render.com/docs/postgresql-refresh)
- [Crunchy Bridge Pricing](https://www.crunchydata.com/pricing)
- [Aiven Pricing](https://aiven.io/pricing)
- [PlanetScale Pricing](https://planetscale.com/pricing) | [PlanetScale Vectors](https://planetscale.com/docs/vitess/vectors)
- [TiDB Pricing](https://www.pingcap.com/pricing/)
- [YugabyteDB Pricing](https://www.yugabyte.com/pricing/) | [YugabyteDB RLS](https://docs.yugabyte.com/stable/secure/authorization/row-level-security/)
- [CockroachDB Pricing](https://www.cockroachlabs.com/pricing/) | [CockroachDB RLS Issue](https://github.com/cockroachdb/cockroach/issues/73596)
- [Turso Pricing](https://turso.tech/pricing) | [Turso Multi-Tenancy](https://turso.tech/multi-tenancy)
- [MongoDB Atlas Pricing](https://www.mongodb.com/pricing)
- [DynamoDB Pricing](https://aws.amazon.com/dynamodb/pricing/)
- [Convex Pricing](https://www.convex.dev/pricing)
- [SurrealDB Pricing](https://surrealdb.com/pricing) | [SurrealDB 3.0 GA](https://technicalbeep.com/multi-model-database-surrealdb-3-0/)
- [Gel (EdgeDB) Blog](https://www.geldata.com/blog/edgedb-is-now-gel-and-postgres-is-the-future)

### Vector Databases
- [pgvector GitHub](https://github.com/pgvector/pgvector) | [pgvector 0.8.0 Release](https://www.postgresql.org/about/news/pgvector-080-released-2952/) | [pgvector HNSW Guide (Crunchy)](https://www.crunchydata.com/blog/hnsw-indexes-with-postgres-and-pgvector) | [pgvector 2026 Guide](https://www.instaclustr.com/education/vector-database/pgvector-key-features-tutorial-and-pros-and-cons-2026-guide/)
- [Pinecone Pricing](https://www.pinecone.io/pricing/) | [Pinecone Cost Guide](https://www.metacto.com/blogs/the-true-cost-of-pinecone-a-deep-dive-into-pricing-integration-and-maintenance)
- [Weaviate Pricing](https://weaviate.io/pricing)
- [Qdrant Pricing](https://qdrant.tech/pricing/) | [Qdrant 2026 Guide](https://blog.thefix.it.com/how-much-does-qdrant-cost-the-complete-2026-pricing-guide/)
- [Chroma Pricing](https://www.trychroma.com/pricing)
- [Zilliz Cloud Pricing](https://zilliz.com/pricing)
- [LanceDB Pricing](https://lancedb.com/pricing/)
- [Turbopuffer Pricing](https://turbopuffer.com/pricing)
- [Vespa Pricing](https://vespa.ai/pricing/)
- [pgvector vs Dedicated VectorDBs (2026)](https://zenvanriel.com/ai-engineer-blog/pgvector-vs-dedicated-vector-db/) | [pgvector vs Pinecone](https://encore.dev/articles/pgvector-vs-pinecone) | [Vector DB Comparison 2026](https://4xxi.com/articles/vector-database-comparison/)
