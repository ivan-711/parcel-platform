# Research Report: File Storage, Caching & Search Infrastructure

**Date:** 2026-04-02
**Context:** Parcel Platform -- real estate investor SaaS, Python/FastAPI backend, 150-10K users over 2 years
**File profile:** Document uploads (PDFs, contracts), D4D geotagged photos, generated PDF reports. 10K-100K files at scale, avg 2-5 MB each.

---

## Category 3: File Storage

### Comparison Table

| Service | Storage $/GB/mo | Egress $/GB | Free Tier | S3 API (boto3) | CDN Included | Max File Size | Signed URLs | Python SDK |
|---|---|---|---|---|---|---|---|---|
| **AWS S3** | $0.023 | $0.09 (first 10TB after 100GB free) | 5 GB / 12 months | Yes (native) | No (CloudFront extra) | 5 TB | Yes | boto3 (gold standard) |
| **Cloudflare R2** | $0.015 | **$0 (free)** | 10 GB storage, 10M reads/mo | Yes | Yes (CF network) | ~5 GB | Yes | boto3 compatible |
| **Backblaze B2** | $0.006 | $0 (3x storage free; $0.01 after) | 10 GB storage | Yes | No (but free via CF CDN) | 5 GB per part | Yes | boto3 + native SDK |
| **Google Cloud Storage** | $0.020 | $0.085 (US, standard tier) | 5 GB / 12 months | No (own SDK) | No (Cloud CDN extra) | 5 TB | Yes | google-cloud-storage |
| **DigitalOcean Spaces** | $0.02 (after 250GB included) | $0 (1 TB/mo included) | None (starts at $5/mo) | Yes | Yes (built-in CDN) | 5 GB | Yes | boto3 compatible |
| **Supabase Storage** | $0.021 | Included in plan bandwidth | 1 GB (free tier) | Yes (S3 protocol) | Via Supabase CDN | 5 GB (Pro plan) | Yes | supabase-py + boto3 |
| **UploadThing** | Usage-based (2 GB free) | Not charged separately | 2 GB storage | No (proprietary) | Unknown | Unknown | Unknown | TypeScript-first, no Python |
| **MinIO** | $0 (self-hosted) | $0 (self-hosted) | N/A (you own it) | Yes (native S3) | No | No limit | Yes | boto3 compatible |
| **Tigris** | $0.02 | **$0 (free)** | 5 GB storage | Yes | Yes (global caching) | 5 GB | Yes | boto3 compatible |

### Cost Projections

| Scenario | AWS S3 | Cloudflare R2 | Backblaze B2 | DigitalOcean Spaces | Tigris |
|---|---|---|---|---|---|
| **10K files (20 GB), 40 GB egress/mo** | $0.46 + $0 egress (under 100GB free) = ~$0.46/mo | $0.30 + $0 = **$0.30/mo** | $0.12 + $0 (3x rule) = **$0.12/mo** | $5/mo flat (well within limits) | $0.40 + $0 = **$0.40/mo** |
| **100K files (200 GB), 200 GB egress/mo** | $4.60 + $9.00 = **$13.60/mo** | $3.00 + $0 = **$3.00/mo** | $1.20 + $0 (3x = 600GB free) = **$1.20/mo** | $5 base + $0 (within 1TB) = **$5/mo** | $4.00 + $0 = **$4.00/mo** |

### Detailed Analysis

**AWS S3** -- The industry standard. Every tutorial, every library, every tool works with S3. But it is the most expensive option here and egress fees add up fast. The free tier is only 12 months. Best reason to use it: you are already deep in AWS.

**Cloudflare R2** -- The strongest all-around pick for a new project. Zero egress fees is genuinely transformative -- you never worry about surprise bills from user downloads or API consumers pulling files. S3 API compatible, so boto3 works with a 2-line config change. 10 GB free tier is generous. Built-in CDN via Cloudflare's network. The downside: no lifecycle policies as mature as S3, and you are locked into Cloudflare's ecosystem. Presigned URLs work but cannot enforce file size limits server-side (must validate after upload).

**Backblaze B2** -- Cheapest raw storage at $0.006/GB. The 3x egress rule means at 200 GB stored, you get 600 GB free egress/month -- more than enough for a SaaS. Paired with Cloudflare CDN (free bandwidth alliance), egress is effectively free forever. Downside: slightly less polished developer experience, fewer edge locations, and the ecosystem is thinner.

**Google Cloud Storage** -- Competitive pricing but egress is expensive ($0.085/GB). No S3 API -- requires their own SDK. Only makes sense if you are already on GCP. Not recommended for a new project.

**DigitalOcean Spaces** -- Simple $5/mo flat rate including 250 GB storage + 1 TB egress + CDN. Great value for the early stage when you want predictability. S3 compatible. Downside: feature-sparse, limited regions, occasional reliability complaints, 5 GB max file size.

**Supabase Storage** -- Attractive if you are already using Supabase for auth/database. Image transforms are a nice bonus for property photos. S3 compatible via their protocol bridge. Downside: couples your storage to Supabase's platform, and pricing is opaque at scale. Not recommended as a standalone storage choice.

**UploadThing** -- TypeScript-first, no Python SDK, no S3 API. Built for Next.js developers. **Not viable for a Python/FastAPI backend.**

**MinIO** -- Self-hosted S3. Makes sense when: (a) you have 10+ TB and want to avoid cloud bills, (b) you need air-gapped/on-prem compliance, or (c) you want a local dev S3 mock. For a solo founder SaaS, the operational burden outweighs the savings. Good for local development, bad for production unless you have DevOps capacity.

**Tigris** -- Interesting newcomer on Fly.io. Zero egress, globally distributed with automatic edge caching, S3 compatible. $0.02/GB storage. Downside: young platform, smaller community, tightly coupled to Fly.io ecosystem. Worth watching but risky as a primary store today.

### D4D Photos: Where Should Geotagged Property Photos Live?

Store them in object storage (R2 or B2). The geotagging metadata (lat/lon, timestamp) should be extracted on upload and stored in PostgreSQL alongside the property record. The photo itself is a blob -- object storage is purpose-built for this. Serve via CDN with signed URLs for private access or public CDN URLs for shared reports.

### Generated PDFs: Store or Regenerate?

**Store them.** PDF generation (jsPDF + html2canvas) is CPU-intensive and the inputs (property data, comps) change infrequently. Store the generated PDF in object storage with a reference in the database. Regenerate only when underlying data changes or user explicitly requests a refresh. At $0.015/GB, storing 10K PDFs (avg 1 MB each = 10 GB) costs $0.15/month. That is cheaper than the compute cost of regenerating them on every request.

### PICK: Cloudflare R2

**Why:** Zero egress eliminates the #1 surprise cost in file storage. S3 API compatible means boto3 works out of the box. Built-in CDN. 10 GB free tier covers the first ~5,000 files. Pricing is simple and predictable. The developer experience is good and improving rapidly.

**Runner-up:** Backblaze B2 (cheapest raw storage, free egress via Cloudflare CDN partnership). Consider B2 if storage volume becomes very large (500+ GB) and you want to minimize costs further.

**Migration path:** Start with R2. If you outgrow it or need features it lacks, migrating to S3 is trivial since both use the S3 API.

---

## Category 6: Caching

### The Core Question: Does Parcel Need Caching at Launch?

**No.** At 150 users, PostgreSQL with proper indexes and a few materialized views will handle everything. Here is the decision framework:

| Signal | Still OK with PostgreSQL | Time to add Redis |
|---|---|---|
| Dashboard load time | < 500ms | > 1-2 seconds consistently |
| API response time (cached data) | < 200ms | > 500ms with repeated identical queries |
| Database CPU | < 50% sustained | > 70% sustained |
| Rate limiting | In-memory dict works | Resets on deploy, needs persistence |
| External API caching (RentCast) | Store results in PG table with TTL column | Need sub-ms lookups at high QPS |
| User count | < 500 | > 1,000 concurrent |

### Comparison Table

| Service | Type | Pricing (low) | Pricing (medium) | Pricing (high) | Serverless? | redis-py compatible? | Free Tier |
|---|---|---|---|---|---|---|---|
| **Redis (self-hosted)** | Container | $0 (your infra) | ~$5-15/mo (Railway/Render) | $20-50/mo | No | Yes (native) | N/A |
| **Upstash Redis** | Serverless | **$0** (500K cmds/mo) | ~$5-10/mo | ~$50/mo | Yes | Yes | 500K cmds/mo, 256 MB |
| **Dragonfly Cloud** | Managed | ~$11/mo (1 GB) | ~$30-50/mo | $100+/mo | No (provisioned) | Yes | None |
| **KeyDB** | Self-hosted | $0 (your infra) | ~$10-20/mo (container) | Same as Redis | No | Yes | N/A (open source) |
| **Momento** | Serverless | **$0** (5 GB transfer/mo) | ~$10-20/mo | $50+/mo | Yes | No (own SDK) | 5 GB transfer/mo |
| **Railway Redis** | Container | ~$3-5/mo | ~$10-15/mo | ~$30/mo | No | Yes | $5 credit (Hobby) |
| **Garnet (Microsoft)** | Self-hosted | $0 (your infra) | Same as Redis hosting | Same | No | Yes (RESP protocol) | N/A (open source) |
| **PostgreSQL mat views** | Built-in | $0 (already have PG) | $0 | $0 | N/A | N/A | N/A |

### Detailed Analysis

**PostgreSQL Materialized Views (start here)** -- For dashboard aggregation queries (pipeline counts, portfolio totals), create materialized views refreshed on a schedule (every 5-15 minutes) or triggered by data changes. This gives you sub-10ms reads on pre-computed data with zero additional infrastructure. ACID-compliant, no cache invalidation bugs. Sufficient for 500+ users easily.

**Upstash Redis** -- The obvious choice when you actually need Redis. Serverless, pay-per-command, 500K free commands/month. At Parcel's early scale, you would likely stay in the free tier for months. redis-py compatible. Budget cap prevents surprise bills. No server to manage. The downside: ~5-15ms latency (vs <1ms for co-located Redis), but this is irrelevant for your use case.

**Redis on Railway** -- If you want a traditional always-on Redis instance, Railway gives you one for ~$5/mo. Simple, predictable, co-located with your app if you deploy on Railway. Downside: you pay whether you use it or not, and it is just a container (not truly managed -- no automatic failover).

**Dragonfly** -- Impressive performance (25x Redis throughput), but the cloud pricing starts at $11/mo for 1 GB. Overkill for Parcel. Only relevant if you have millions of operations per second. The open-source version is excellent for self-hosting if you outgrow Redis.

**KeyDB** -- Multi-threaded Redis fork by Snap. 2-5x better throughput. Free and open source. Relevant only if you self-host and need better performance than single-threaded Redis. Not necessary for Parcel's scale.

**Momento** -- True serverless cache, but uses its own SDK (not redis-py compatible). The pricing ($0.50/GB transferred) can get expensive at scale. The 5 GB free tier is generous. Downside: vendor lock-in to their API, smaller community.

**Garnet (Microsoft)** -- Open source, Redis-compatible (RESP protocol), written in .NET. Production-proven at Microsoft scale. But it is self-hosted only, no managed offering. Interesting technically but adds operational burden for a solo founder.

### When PostgreSQL Stops Being Sufficient

Concrete signs you need a dedicated cache:

1. **Dashboard queries take > 1 second** even with materialized views (means your data volume has outgrown PG's refresh capability)
2. **External API rate limits are hit** because you are re-fetching RentCast data instead of caching responses
3. **Rate limiting resets on deploy** and users exploit the gap (your current in-memory approach)
4. **Session/auth data needs sharing** across multiple app instances (horizontal scaling)
5. **Real-time features** like live notifications or presence indicators

For Parcel at launch: signals 1, 4, and 5 are unlikely. Signal 2 is solved by storing API responses in a PostgreSQL table with a `fetched_at` timestamp. Signal 3 is a real concern but minor at low user counts.

### PICK: PostgreSQL Materialized Views at Launch, Upstash Redis When Needed

**Phase 1 (Launch - 500 users):**
- Dashboard aggregations: PostgreSQL materialized views, refreshed every 5-15 minutes
- API response caching (RentCast): Store in a `cached_api_responses` PG table with TTL
- Rate limiting: In-memory (acceptable at this scale)
- Sessions: Stateless JWT (already implemented)

**Phase 2 (500+ users or when you see the signs above):**
- Add Upstash Redis (likely stays in free tier for months)
- Move rate limiting to Redis (persistent across deploys)
- Move API response caching to Redis (faster lookups)
- Keep materialized views for dashboard aggregations (they are still the right tool)

**Why Upstash over alternatives:** Serverless = zero ops burden. Free tier covers early usage. redis-py compatible = standard Python ecosystem. Budget caps = no surprise bills. Can be added in an afternoon when needed.

---

## Category 7: Search

### The Core Question: When Does PostgreSQL Native Search Become Insufficient?

PostgreSQL full-text search (`tsvector` + GIN indexes + `pg_trgm`) is **sufficient for 100K+ records** in most cases. Here are the concrete breaking points:

| Capability | PostgreSQL Native | When You Need More |
|---|---|---|
| Full-text search | Good (tsvector/GIN) | > 1M documents with complex ranking |
| Fuzzy/typo tolerance | Limited (pg_trgm, not true typo tolerance) | Users complain about "no results" for misspellings |
| Autocomplete | Possible (prefix matching with pg_trgm) | Need < 10ms instant-as-you-type |
| Faceted search | Manual (GROUP BY queries) | Need real-time facet counts on every keystroke |
| Relevance ranking | Basic (ts_rank) | Need BM25 or ML-based ranking |
| Document content search | Works (index PDF text) | Need highlighting, snippets, phrase matching at scale |

### Comparison Table

| Service | Pricing (10K records) | Pricing (100K records) | Self-hosted? | Query Latency | Fuzzy Quality | Facets | Autocomplete | Python SDK |
|---|---|---|---|---|---|---|---|---|
| **PostgreSQL tsvector + pg_trgm** | $0 (built-in) | $0 | N/A (your DB) | 10-50ms | Basic (trigram similarity) | Manual | Basic | psycopg2/asyncpg |
| **ParadeDB (pg_search)** | $0 (PG extension) | $0 | Yes (PG extension) | 5-20ms | Good (BM25) | Yes | Yes | SQL via psycopg2 |
| **ZomboDB** | GitHub sponsors (~$10-50/mo?) | Same | Yes (PG extension) | 5-20ms (via ES) | Excellent | Yes | Yes | SQL + ES |
| **Meilisearch** | $0 self-hosted / $30/mo cloud | $0 / $30-300/mo cloud | Yes | < 50ms | Excellent | Yes | Excellent | meilisearch (official) |
| **Typesense** | $0 self-hosted / ~$7-58/mo cloud | $0 / $58+/mo cloud | Yes | < 50ms | Excellent | Yes | Excellent | typesense (official) |
| **Elasticsearch/OpenSearch** | $0 self-hosted / $500+/mo managed | $0 / $500+/mo | Yes | < 50ms | Excellent | Yes | Yes | elasticsearch-py |
| **Algolia** | $0 (10K searches free) | ~$50-150/mo | No (SaaS only) | < 20ms | Excellent | Yes | Best-in-class | algoliasearch |
| **Orama** | $0 (client-side) / $499/mo cloud | Same | Yes (client-side JS) | < 5ms (client) | Good | Yes | Yes | JavaScript only |

### Detailed Analysis

**PostgreSQL tsvector + GIN + pg_trgm (start here)** -- Already built into your database. Zero additional infrastructure. For Parcel's search needs:
- Property by address: `tsvector` on address fields with GIN index. Works great.
- Contact by name/phone: `pg_trgm` with GIN index for fuzzy matching. Good enough.
- Deal by notes: `tsvector` on notes fields. Works.
- Document content search: Extract text from PDFs on upload, store in a `document_text` column, index with `tsvector`.

Limitations: `pg_trgm` fuzzy matching is not true typo tolerance (it uses trigram similarity, which works differently from Meilisearch/Typesense's Levenshtein-based approach). Autocomplete requires careful query design. No built-in faceted search counts.

**ParadeDB (pg_search extension)** -- Adds BM25 ranking directly to PostgreSQL via a Rust extension. This is the "upgrade without leaving Postgres" path. Better relevance ranking than native `tsvector`, proper faceted search, and it stays inside your existing database. Free and open source. Downside: requires installing a PG extension (not available on all managed Postgres hosts -- check your provider). Relatively new project.

**ZomboDB** -- Bridges PostgreSQL and Elasticsearch, letting you write ES queries as SQL. Powerful but adds significant complexity (you now operate two systems). The sponsorship-gated binary distribution is a red flag for long-term maintainability. Not recommended for a solo founder.

**Meilisearch** -- Excellent developer experience, sub-50ms search, great typo tolerance, beautiful out-of-the-box relevance. Written in Rust. Self-hosted is free, cloud starts at $30/mo. Official Python SDK. Build plan (50K searches/mo, 100K docs) is sufficient for Parcel's early scale. Downside: it is an additional service to operate. Data must be synced from PostgreSQL.

**Typesense** -- Similar to Meilisearch in capabilities. Written in C++, slightly more configurable. Cloud starts cheaper (~$7/mo for minimal setup). Official Python SDK. 30-day free trial. Geosearch built-in (useful for property search by location). Downside: more configuration knobs means more decisions.

**Elasticsearch / OpenSearch** -- The 800-lb gorilla. Handles everything but costs $500+/mo managed and requires significant operational expertise. Self-hosted is free but the hidden cost is 2-3x the infrastructure spend in engineering time. **Massively overkill for Parcel at any foreseeable scale.**

**Algolia** -- Best-in-class search UX. $0.50-1.00 per 1,000 searches. Gets expensive fast. At 100K searches/month, that is $50-100/mo just for search. Enterprise pricing is $50K+/year. Great product but expensive for a bootstrapped SaaS. Python SDK exists.

**Orama** -- Client-side search engine (runs in the browser). No Python SDK. Interesting for documentation sites but **not viable for a SaaS backend** where search must be server-authoritative and respect access controls.

### Parcel's Specific Search Needs

| Search Need | PostgreSQL Solution | External Search Solution |
|---|---|---|
| Property by address | `tsvector` + GIN on address fields | Any search engine |
| Contact by name/phone | `pg_trgm` + GIN (fuzzy similarity) | Meilisearch/Typesense |
| Deal by notes | `tsvector` + GIN on notes text | Meilisearch/Typesense |
| Document content | Extract text, `tsvector` on content | Meilisearch/Typesense |
| Autocomplete | `LIKE 'prefix%'` with btree, or pg_trgm | Meilisearch/Typesense (much better) |
| Faceted filters | `GROUP BY` with `FILTER` | Meilisearch/Typesense (built-in) |

### When PostgreSQL Search Becomes Insufficient -- Concrete Signs

1. **Users report "no results" for misspelled queries** -- pg_trgm's trigram similarity misses common typos that Meilisearch/Typesense would catch
2. **Autocomplete feels sluggish** -- PostgreSQL LIKE queries on large text fields slow down at 100K+ rows without careful index design
3. **You want instant facet counts** -- "Show me 12 wholesale deals, 5 flip deals, 3 rental deals" updating in real-time as you type
4. **Full-text search on PDF content is slow** -- Large document bodies (10K+ words per doc) with complex queries
5. **You need search analytics** -- What are users searching for? What returns no results? PostgreSQL gives you nothing here.

For Parcel at launch with < 10K records, none of these will be issues. PostgreSQL is fine.

### PICK: PostgreSQL Native Search at Launch, Meilisearch When Needed

**Phase 1 (Launch - 50K records):**
- Property search: `tsvector` + GIN index on `address`, `city`, `state`, `zip`
- Contact search: `pg_trgm` + GIN index on `name`, `phone`, `email`
- Deal search: `tsvector` + GIN on `notes`, `title`
- Document search: Extract PDF text on upload, store in column, `tsvector` + GIN index
- Add `pg_trgm` extension for fuzzy matching on all text fields

**Phase 2 (50K+ records or when users complain about search quality):**
- Add Meilisearch (self-hosted on Railway/Render, or Cloud at $30/mo)
- Sync data from PostgreSQL to Meilisearch on write (async task via background worker)
- Use Meilisearch for user-facing search, PostgreSQL for backend queries
- Keep PG indexes for admin/internal queries

**Why Meilisearch over Typesense:** Slightly better developer experience, simpler configuration, official async Python SDK, and the Build plan ($30/mo) is affordable. Typesense is an equally valid choice -- the difference is marginal.

**Why not ParadeDB:** Interesting "stay in Postgres" path, but extension availability on managed Postgres hosts (Railway, Supabase, Neon) is inconsistent. If you control your Postgres installation, ParadeDB is worth evaluating before adding a separate search service.

---

## Summary of Picks

| Category | Launch Choice | Scale Choice | When to Switch |
|---|---|---|---|
| **File Storage** | Cloudflare R2 | Cloudflare R2 (or B2 for cost) | Likely never -- R2 scales well |
| **Caching** | PostgreSQL materialized views | Upstash Redis | Dashboard > 1s, rate limits reset on deploy, > 500 users |
| **Search** | PostgreSQL tsvector + pg_trgm | Meilisearch (self-hosted or Cloud) | Users complain about search, > 50K records, need autocomplete/facets |

### Total Infrastructure Cost Projection

| Stage | File Storage | Caching | Search | Total Added Cost |
|---|---|---|---|---|
| **Launch (150 users, 5K files)** | $0 (R2 free tier) | $0 (PG mat views) | $0 (PG native) | **$0/mo** |
| **Growth (1K users, 20K files)** | ~$0.30/mo (R2) | $0 (Upstash free) | $0 (PG native) | **< $1/mo** |
| **Scale (5K users, 100K files)** | ~$3/mo (R2) | ~$5/mo (Upstash) | $30/mo (Meilisearch Cloud) | **~$38/mo** |
| **Full Scale (10K users, 200K files)** | ~$6/mo (R2) | ~$10/mo (Upstash) | $30-300/mo (Meilisearch) | **~$50-316/mo** |

The beautiful thing about this stack: **the launch cost for all three categories is $0/mo.** You add complexity and cost only when concrete signals tell you to.

---

## Sources

### File Storage
- [AWS S3 Pricing](https://aws.amazon.com/s3/pricing/)
- [Cloudflare R2 Pricing](https://developers.cloudflare.com/r2/pricing/)
- [Cloudflare R2 Limits](https://developers.cloudflare.com/r2/platform/limits/)
- [Cloudflare R2 boto3 Examples](https://developers.cloudflare.com/r2/examples/aws/boto3/)
- [Backblaze B2 Cloud Storage](https://www.backblaze.com/cloud-storage)
- [Backblaze B2 Pricing Comparison](https://www.backblaze.com/cloud-storage/pricing)
- [Google Cloud Storage Pricing](https://cloud.google.com/storage/pricing)
- [DigitalOcean Spaces Pricing](https://docs.digitalocean.com/products/spaces/details/pricing/)
- [Supabase Storage Pricing](https://supabase.com/docs/guides/storage/pricing)
- [Supabase S3 Compatibility](https://supabase.com/docs/guides/storage/s3/compatibility)
- [UploadThing](https://uploadthing.com/)
- [MinIO GitHub](https://github.com/minio/minio)
- [Tigris Pricing](https://www.tigrisdata.com/pricing/)

### Caching
- [Upstash Redis Pricing](https://upstash.com/pricing/redis)
- [Upstash New Pricing Blog](https://upstash.com/blog/redis-new-pricing)
- [Dragonfly Pricing](https://www.dragonflydb.io/pricing)
- [Dragonfly GitHub](https://github.com/dragonflydb/dragonfly)
- [KeyDB Documentation](https://docs.keydb.dev/)
- [KeyDB GitHub (Snapchat)](https://github.com/Snapchat/KeyDB)
- [Momento Pricing](https://docs.momentohq.com/cache/manage/pricing)
- [Railway Pricing](https://docs.railway.com/pricing)
- [Microsoft Garnet GitHub](https://github.com/microsoft/garnet)
- [PostgreSQL MV vs Redis Caching](https://leapcell.io/blog/choosing-between-postgres-materialized-views-and-redis-application-caching)

### Search
- [PostgreSQL Full-Text Search Docs](https://www.postgresql.org/docs/current/textsearch-tables.html)
- [PostgreSQL GIN Indexes](https://www.postgresql.org/docs/current/gin.html)
- [ParadeDB](https://www.paradedb.com)
- [ParadeDB pg_search on Neon](https://neon.com/docs/extensions/pg_search)
- [ZomboDB GitHub](https://github.com/zombodb/zombodb)
- [Meilisearch Pricing](https://www.meilisearch.com/pricing)
- [Meilisearch Python SDK](https://github.com/meilisearch/meilisearch-python)
- [Typesense Cloud Pricing](https://cloud.typesense.org/pricing)
- [Typesense Comparison](https://typesense.org/docs/overview/comparison-with-alternatives.html)
- [Algolia Pricing](https://www.algolia.com/pricing)
- [Elastic Cloud Pricing](https://www.elastic.co/pricing)
- [Meilisearch vs Typesense](https://www.meilisearch.com/blog/meilisearch-vs-typesense)
