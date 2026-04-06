# Database Architecture Research for Parcel Platform

**Date:** 2026-04-02
**Platform:** parceldesk.io -- Real estate investment operating system / CRM
**Current stack:** PostgreSQL on Railway, SQLAlchemy 2, FastAPI (Python)
**Scope:** Architecture recommendations for scaling from deal calculators into a full RE operating system

---

## Table of Contents

1. [PostgreSQL Optimization](#1-postgresql-optimization)
2. [Multi-Tenant Architecture](#2-multi-tenant-architecture)
3. [Time-Series Data](#3-time-series-data)
4. [Caching Layer](#4-caching-layer)
5. [Search Architecture](#5-search-architecture)
6. [Data Model Patterns](#6-data-model-patterns)
7. [Schema Recommendations](#7-schema-recommendations)
8. [Migration Strategy from Current State](#8-migration-strategy-from-current-state)
9. [Railway-Specific Deployment Patterns](#9-railway-specific-deployment-patterns)
10. [Sources](#10-sources)

---

## 1. PostgreSQL Optimization

### 1.1 JSONB vs Fully Normalized Tables

Parcel's current `deals` table already uses a hybrid approach: normalized columns for `address`, `zip_code`, `property_type`, and `strategy`, with JSONB for `inputs` and `outputs`. This is the correct instinct. The research confirms that a hybrid model is the optimal pattern for real estate data.

**When to use JSONB:**

- Property attributes that vary wildly by type (a duplex has unit counts, a commercial property has NNN details, a vacant lot has none of these)
- Calculator inputs/outputs that differ per strategy (wholesale has assignment fee; BRRRR has refinance terms)
- AI-extracted document metadata (parties, key_terms, risk_flags -- already JSONB in Parcel)
- User-defined custom fields (future feature: "let me track my own metrics")
- Data imported from external APIs where the schema is not under your control

**When to normalize into columns:**

- Any field you filter, sort, join, or aggregate on frequently (address, zip_code, price, status, created_at)
- Any field that participates in foreign key relationships
- Fields present in the majority of rows (Heap.io found that fields in at least 1/80th of rows justify dedicated columns)
- Financial amounts (use `NUMERIC(12,2)` -- never JSONB for money)

**Performance reality check:**

| Metric | Normalized | JSONB |
|--------|-----------|-------|
| Storage (same data) | 79 MB | 164 MB (2x overhead due to key duplication per row) |
| Query planner accuracy | Full statistics | Hardcoded 0.1% estimate -- planner is "flying blind" |
| Worst case | Normal | 2000x slower (nested loop instead of hash join) |
| Partial update | Single column UPDATE | Must rewrite entire JSONB document |
| Index support | B-tree, BRIN, full statistics | GIN (containment), no cross-key statistics |

**Recommendation for Parcel:** Continue the hybrid approach. Extract the 10-15 most-queried fields from `inputs`/`outputs` JSONB into first-class columns (purchase_price, arv, monthly_rent, rehab_cost, etc.) and keep the rest in JSONB. This will save ~30% disk space and enable the query planner to make informed decisions.

**Specific pattern for variable property attributes:**

```sql
-- Core columns normalized for queries
ALTER TABLE properties ADD COLUMN bedrooms SMALLINT;
ALTER TABLE properties ADD COLUMN bathrooms NUMERIC(3,1);
ALTER TABLE properties ADD COLUMN sqft INTEGER;
ALTER TABLE properties ADD COLUMN lot_sqft INTEGER;
ALTER TABLE properties ADD COLUMN year_built SMALLINT;

-- Variable attributes in JSONB with GIN index
ALTER TABLE properties ADD COLUMN attributes JSONB DEFAULT '{}';
CREATE INDEX idx_properties_attributes ON properties USING GIN (attributes);

-- Example attributes JSONB for different property types:
-- Single family: {"pool": true, "garage_spaces": 2, "hoa_fee": 150}
-- Duplex: {"unit_a_sqft": 800, "unit_b_sqft": 750, "separate_meters": true}
-- Commercial: {"nnn_expenses": 4200, "cap_rate": 0.068, "zoning": "C-2"}
```

### 1.2 Partitioning Strategies

Parcel does not need partitioning today, but should plan for it. Partitioning becomes worthwhile when a table exceeds ~10M rows or ~10 GB on disk.

**Which tables will need partitioning first:**

| Table | Growth rate | Partition strategy | Trigger point |
|-------|------------|-------------------|--------------|
| `pipeline_events` (event sourcing) | High -- every deal movement | Range by `created_at` (monthly) | 5M+ events |
| `communications` (call/email/text logs) | High -- many per deal | Range by `created_at` (monthly) | 5M+ records |
| `transactions` (financial records) | Medium -- grows with portfolio | Range by `transaction_date` (quarterly) | 2M+ records |
| `audit_log` | Very high -- every mutation | Range by `action_tstamp` (monthly) | 1M+ records |
| `deals` | Low-medium | Not needed until 1M+ deals | Likely never for shared table |

**Range partitioning by date (the primary pattern for Parcel):**

```sql
CREATE TABLE pipeline_events (
    id          UUID DEFAULT gen_random_uuid(),
    deal_id     UUID NOT NULL,
    user_id     UUID NOT NULL,
    event_type  TEXT NOT NULL,
    payload     JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (id, created_at)  -- partition key must be in PK
) PARTITION BY RANGE (created_at);

-- Create partitions (automate with pg_partman)
CREATE TABLE pipeline_events_2026_q1
    PARTITION OF pipeline_events
    FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');

CREATE TABLE pipeline_events_2026_q2
    PARTITION OF pipeline_events
    FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');
```

**Why NOT partition by user_id or tenant_id:**

- User/tenant distribution is highly skewed (power users generate 100x more data than casual users)
- Hash partitioning by tenant creates fixed partition counts that are hard to rebalance
- Date-based partitioning aligns with natural query patterns ("show me last month's activity") and enables cheap data lifecycle management (detach old partitions to cold storage)

**Automation with pg_partman:**

```sql
-- Install and configure automatic partition management
CREATE EXTENSION pg_partman;

SELECT partman.create_parent(
    p_parent_table := 'public.pipeline_events',
    p_control := 'created_at',
    p_type := 'range',
    p_interval := '1 month',
    p_premake := 3  -- create 3 months ahead
);
```

### 1.3 Indexing Strategies

Parcel's current indexes are minimal (just the implicit FK indexes). As the platform scales, a deliberate indexing strategy is critical.

**Index type selection guide:**

| Index type | Best for | Use in Parcel |
|-----------|---------|---------------|
| B-tree (default) | Equality, range, sorting | user_id FKs, email, status, created_at, price ranges |
| GIN | JSONB containment, arrays, full-text search | `attributes @> '{"pool": true}'`, tsvector columns |
| GiST | Geometry/geography, range types, nearest-neighbor | PostGIS `geom` column, radius/polygon searches |
| BRIN | Sequentially ordered data in large tables | `created_at` on partitioned event/log tables |
| Hash | Equality-only (rare) | Almost never -- B-tree is better in nearly all cases |

**Property lookup indexes:**

```sql
-- Address search (trigram for fuzzy matching)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_properties_address_trgm
    ON properties USING GIN (address gin_trgm_ops);

-- Zip code (B-tree for exact match and prefix)
CREATE INDEX idx_properties_zip ON properties (zip_code);

-- Spatial (PostGIS GiST for radius and polygon queries)
CREATE INDEX idx_properties_geom ON properties USING GIST (geom);

-- Composite for common filter combinations
CREATE INDEX idx_properties_type_status
    ON properties (property_type, status)
    WHERE deleted_at IS NULL;  -- partial index excludes soft-deleted

-- JSONB attributes (GIN for containment queries)
CREATE INDEX idx_properties_attrs ON properties USING GIN (attributes);

-- Price range + type (common search pattern)
CREATE INDEX idx_properties_price_type
    ON properties (asking_price, property_type)
    WHERE status = 'active';
```

**Deal lookup indexes:**

```sql
-- Most common query: user's deals by status
CREATE INDEX idx_deals_user_status
    ON deals (user_id, status)
    WHERE deleted_at IS NULL;

-- Team deals
CREATE INDEX idx_deals_team ON deals (team_id)
    WHERE team_id IS NOT NULL AND deleted_at IS NULL;

-- Pipeline stage filtering
CREATE INDEX idx_pipeline_deal_stage
    ON pipeline_entries (deal_id, stage);
```

### 1.4 PostGIS for Geospatial Queries

PostGIS is the clear choice for Parcel's location-based features. It integrates natively with PostgreSQL and outperforms application-level geospatial math by orders of magnitude.

**Enable and configure:**

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
-- Optionally for drive-time analysis (requires road network data):
CREATE EXTENSION IF NOT EXISTS pgrouting;
```

**Geometry column design:**

```sql
-- Use geography type (not geometry) for lat/lng on Earth
-- geography uses meters for distance; geometry uses the SRID's unit
ALTER TABLE properties
    ADD COLUMN geom geography(Point, 4326);

-- Populate from address geocoding
UPDATE properties
SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Spatial index (essential -- without it, every query is a full scan)
CREATE INDEX idx_properties_geom ON properties USING GIST (geom);
```

**Common query patterns for Parcel:**

```sql
-- Radius search: all properties within 5 miles of a point
SELECT id, address, asking_price,
       ST_Distance(geom, ST_MakePoint(-74.006, 40.7128)::geography) AS distance_m
FROM properties
WHERE ST_DWithin(
    geom,
    ST_MakePoint(-74.006, 40.7128)::geography,
    8047  -- 5 miles in meters
)
AND deleted_at IS NULL
ORDER BY distance_m;

-- Polygon search: properties within a drawn market zone
SELECT id, address
FROM properties
WHERE ST_Within(
    geom::geometry,
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[...]]}')
)
AND deleted_at IS NULL;

-- Nearest N properties to a point
SELECT id, address,
       ST_Distance(geom, ref.geom) AS distance_m
FROM properties, (
    SELECT ST_MakePoint(-74.006, 40.7128)::geography AS geom
) ref
WHERE deleted_at IS NULL
ORDER BY properties.geom <-> ref.geom  -- KNN operator, uses GiST index
LIMIT 20;
```

**Performance benchmarks from research (3M real estate records):**

- Point-in-radius queries: 15-25 ms
- Complex polygon intersections: 30-50 ms
- KNN (nearest-neighbor) with GiST: sub-10 ms for top-20 results

**Drive-time isochrones:**

For "show me all properties within a 20-minute drive," Parcel would need pgRouting with a road network dataset (OpenStreetMap). This is operationally heavy. The pragmatic alternative is to call an external isochrone API (Mapbox, HERE, or the open-source Valhalla) to get the polygon, then use PostGIS `ST_Within` against that polygon. Store market zone polygons as reusable geometry in a `market_zones` table.

```sql
CREATE TABLE market_zones (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id),
    name        TEXT NOT NULL,
    zone_type   TEXT NOT NULL,  -- 'custom', 'zip', 'city', 'drive_time'
    geom        geography(Polygon, 4326) NOT NULL,
    metadata    JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_market_zones_geom ON market_zones USING GIST (geom);
```

### 1.5 Full-Text Search

**PostgreSQL native search capabilities (what Parcel should start with):**

```sql
-- Add tsvector column for combined property search
ALTER TABLE properties ADD COLUMN search_vector tsvector;

-- Populate it from multiple fields
UPDATE properties SET search_vector =
    setweight(to_tsvector('english', coalesce(address, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(city, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(notes, '')), 'C');

-- GIN index for fast lookup
CREATE INDEX idx_properties_search ON properties USING GIN (search_vector);

-- Trigger to keep it updated
CREATE OR REPLACE FUNCTION properties_search_trigger() RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', coalesce(NEW.address, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(NEW.city, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(NEW.notes, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_properties_search
    BEFORE INSERT OR UPDATE ON properties
    FOR EACH ROW EXECUTE FUNCTION properties_search_trigger();

-- Query with ranking
SELECT id, address, ts_rank(search_vector, query) AS rank
FROM properties, plainto_tsquery('english', '123 Main St duplex') query
WHERE search_vector @@ query
ORDER BY rank DESC
LIMIT 20;
```

**Fuzzy search with pg_trgm (for typo tolerance on addresses and contact names):**

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram index for fuzzy matching
CREATE INDEX idx_contacts_name_trgm
    ON contacts USING GIN (full_name gin_trgm_ops);

-- Fuzzy search query
SELECT id, full_name, similarity(full_name, 'Jon Smth') AS sim
FROM contacts
WHERE full_name % 'Jon Smth'  -- % operator uses configurable threshold
ORDER BY sim DESC
LIMIT 10;

-- Set similarity threshold (default 0.3)
SET pg_trgm.similarity_threshold = 0.2;
```

**When to upgrade beyond native PostgreSQL search:**

| Signal | Native PG is fine | Time to upgrade |
|--------|-------------------|----------------|
| Record count | < 1M searchable records | > 5M records |
| Latency target | < 200ms acceptable | < 50ms required (typeahead) |
| Features needed | Keyword match, basic ranking | BM25, facets, synonyms, ML re-ranking |
| Typo tolerance | pg_trgm covers it | Need edit-distance with configurable per-field behavior |
| Operational budget | No budget for extra service | Can afford $30+/month for Meilisearch |

**Upgrade path:** PostgreSQL native -> pg_search (ParadeDB) -> Meilisearch.

pg_search is the most compelling option for Parcel's scale because it embeds a full BM25 search engine (Tantivy, a Rust Lucene alternative) inside PostgreSQL. Benchmarks on 10M rows: pg_search returns complex filtered searches in 29ms vs 31,890ms for native FTS. It provides transactional consistency (search index updates atomically within the same transaction), eliminating the dual-write problem of Elasticsearch/Meilisearch.

However, pg_search is a PostgreSQL extension -- check Railway's extension support before committing. If unavailable on Railway, Meilisearch on Railway (one-click deploy, $10-30/month) is the pragmatic choice.

### 1.6 Row-Level Security for Multi-Tenant SaaS

RLS is Parcel's best tool for ensuring one user never sees another user's deals, even if application code has a bug.

**Implementation pattern for Parcel (SQLAlchemy 2 + FastAPI):**

```sql
-- Step 1: Create a non-superuser role for the application
CREATE ROLE parcel_app LOGIN PASSWORD 'xxx';
GRANT USAGE ON SCHEMA public TO parcel_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO parcel_app;

-- Step 2: Create a function to read the current tenant
CREATE OR REPLACE FUNCTION current_user_id() RETURNS UUID AS $$
    SELECT NULLIF(current_setting('app.current_user_id', TRUE), '')::UUID
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Step 3: Enable RLS and create policies
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY deals_user_isolation ON deals
    USING (user_id = current_user_id())
    WITH CHECK (user_id = current_user_id());

-- For team access (user can see own deals + team deals)
CREATE POLICY deals_team_access ON deals
    USING (
        user_id = current_user_id()
        OR (
            team_id IS NOT NULL
            AND team_id IN (
                SELECT tm.team_id FROM team_members tm
                WHERE tm.user_id = current_user_id()
            )
        )
    );

-- Repeat for every tenant-scoped table
ALTER TABLE pipeline_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
```

**FastAPI + SQLAlchemy 2 integration:**

```python
# In database.py -- set tenant context on every session
from sqlalchemy import event, text

@event.listens_for(engine, "connect")
def set_search_path(dbapi_conn, connection_record):
    """Ensure fresh sessions start with no tenant context."""
    cursor = dbapi_conn.cursor()
    cursor.execute("SET app.current_user_id = ''")
    cursor.close()

# In a FastAPI dependency
async def get_db_with_tenant(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Inject user context into the database session for RLS."""
    db.execute(text(f"SET app.current_user_id = '{current_user.id}'"))
    try:
        yield db
    finally:
        # CRITICAL: reset tenant context to prevent leakage
        db.execute(text("RESET app.current_user_id"))
```

**Performance implications:**

- RLS adds a WHERE clause to every query -- overhead is equivalent to adding a `WHERE user_id = ?` filter manually
- The subquery for team access in the policy can be expensive if `team_members` is large -- add an index on `(user_id, team_id)`
- With PgBouncer in transaction mode, `SET` commands are safe because they are scoped to the transaction
- Test with `EXPLAIN ANALYZE` to ensure RLS policies are not causing sequential scans

**Critical safety note:** The application must connect as `parcel_app` (not a superuser). Superusers bypass ALL RLS policies. This is the most common RLS implementation mistake.

### 1.7 Connection Pooling with PgBouncer

Parcel's current `database.py` uses SQLAlchemy's built-in pool (`pool_size=20, max_overflow=40`). This is fine for a single process but does not scale across multiple Railway service replicas.

**Why PgBouncer is needed:**

- Railway PostgreSQL has a default connection limit (typically 100 concurrent connections)
- Each Railway service replica opens its own pool (2 replicas x 60 max = 120 connections, already exceeding the limit)
- PgBouncer can serve 1000+ application connections from just 20 real PostgreSQL connections

**Deployment on Railway:**

Railway offers a one-click PgBouncer template that deploys alongside your PostgreSQL instance. The PgBouncer service listens on port 6432 and proxies to your Postgres on 5432 through the Railway private network.

```bash
# Environment variable change in Railway
# Before: DATABASE_URL=postgresql://user:pass@postgres.railway.internal:5432/railway
# After:  DATABASE_URL=postgresql://user:pass@pgbouncer.railway.internal:6432/railway
```

**Recommended PgBouncer configuration for Parcel:**

```ini
[pgbouncer]
pool_mode = transaction          ; MUST use transaction mode for RLS SET commands
max_client_conn = 500            ; handle up to 500 app connections
default_pool_size = 20           ; 20 real PG connections per database
min_pool_size = 5                ; keep 5 warm connections
reserve_pool_size = 5            ; extra connections for burst
reserve_pool_timeout = 3         ; seconds before using reserve pool
server_lifetime = 3600           ; recycle connections hourly
server_idle_timeout = 600        ; close idle connections after 10 min
log_connections = 0              ; reduce log noise
log_disconnections = 0
```

**Critical: Transaction mode and RLS.**

In transaction mode, PgBouncer assigns a server connection for the duration of a single transaction, then returns it to the pool. This means `SET` commands persist only for that transaction, which is exactly what you want for RLS tenant context. However, prepared statements and `SET` commands outside transactions will NOT persist. SQLAlchemy's `pool_pre_ping` is compatible with PgBouncer transaction mode.

**SQLAlchemy configuration for PgBouncer:**

```python
engine = create_engine(
    DATABASE_URL,
    pool_size=10,           # smaller -- PgBouncer handles the real pooling
    max_overflow=20,
    pool_pre_ping=True,
    pool_recycle=1800,
    # Disable SQLAlchemy-level connection reset (PgBouncer handles it)
    pool_reset_on_return="rollback",
)
```

---

## 2. Multi-Tenant Architecture

### 2.1 Architecture Comparison

Parcel currently uses **shared schema with user_id foreign keys** (the "tenant discriminator" pattern). This is the correct choice for Parcel's stage and scale.

| Approach | Tenant capacity | Migration complexity | Cost per tenant | Data isolation | Parcel fit |
|----------|----------------|---------------------|----------------|---------------|-----------|
| Database-per-tenant | 10s | Very high (N databases to migrate) | Highest ($5+ per DB on Railway) | Complete | No -- too expensive, too complex |
| Schema-per-tenant | 100s | High (N schemas to migrate) | Medium | Strong logical | Maybe at 500+ enterprise clients |
| **Shared schema + RLS** | **Millions** | **Low (one migration)** | **Lowest** | **Strong with RLS** | **Yes -- current and recommended** |
| Citus extension | Millions | Medium (requires shard key) | Low at scale | Strong | Overkill until 100K+ users |

### 2.2 RE SaaS Platform Approaches

Research into how other real estate SaaS platforms handle multi-tenancy:

- **Buildium** (property management, 14K+ customers): Cloud-based SaaS with SOC 2 Type II compliance, open API. Likely shared schema given their scale and feature set (100+ data points per property)
- **AppFolio** (property management, publicly traded): Enterprise-grade with multi-factor auth, encryption. Likely shared schema at their scale with strong RLS or application-level isolation
- **Stessa** (rental property finance tracking, acquired by Roofstock): Lightweight SaaS for individual investors. Shared schema with user_id scoping -- very similar to Parcel's current model
- **DealPath** (commercial RE deal management): Deal pipeline and analytics platform. Schema-per-tenant likely for enterprise clients with strict data isolation requirements

**Key insight:** All the platforms serving individual investors and small teams use shared schema. Only enterprise-focused platforms with 6-figure contracts justify schema-per-tenant isolation.

### 2.3 Parcel's Path at Different Scales

**100 users (current target):**
- Shared schema with `user_id` on every table
- Application-level filtering (current approach)
- Add RLS as a safety net (not yet critical, but good practice)

**1,000 users:**
- Shared schema + RLS enforced
- PgBouncer required
- Index optimization becomes important
- Consider read replicas for dashboard queries

**10,000 users:**
- Shared schema + RLS + connection pooling
- Table partitioning for events/communications/audit
- Full-text search likely needs pg_search or Meilisearch
- Redis caching layer essential
- Consider Railway Pro plan or migration to managed PostgreSQL (Neon, Supabase, or RDS)

**100,000+ users:**
- Evaluate Citus for horizontal sharding
- Or migrate hot tables to dedicated services
- Data archival policies essential
- Multiple read replicas behind pgBouncer

### 2.4 Tenant Isolation for Financial Data

Financial data (transactions, payments, portfolio performance) requires stronger isolation guarantees than general deal data.

**Recommendations:**

1. **RLS is mandatory** for financial tables -- no exceptions
2. **Audit every mutation** with the audit trigger (Section 6.2)
3. **Never expose raw SQL** for financial queries -- always go through parameterized SQLAlchemy queries
4. **Encrypt sensitive financial data at rest** (PostgreSQL TDE or application-level encryption for bank account numbers)
5. **Separate financial tables into a `finance` schema** for clearer permission boundaries:

```sql
CREATE SCHEMA finance;
GRANT USAGE ON SCHEMA finance TO parcel_app;

-- Move financial tables to finance schema
ALTER TABLE transactions SET SCHEMA finance;
ALTER TABLE payments SET SCHEMA finance;
```

---

## 3. Time-Series Data

### 3.1 Property Value Tracking

```sql
CREATE TABLE property_valuations (
    id              UUID DEFAULT gen_random_uuid(),
    property_id     UUID NOT NULL REFERENCES properties(id),
    valuation_date  DATE NOT NULL,
    source          TEXT NOT NULL,  -- 'zillow_api', 'manual', 'appraisal', 'comps_avg'
    estimated_value NUMERIC(12, 2) NOT NULL,
    confidence      NUMERIC(3, 2),  -- 0.00 to 1.00
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (id, valuation_date)
) PARTITION BY RANGE (valuation_date);

CREATE INDEX idx_valuations_property ON property_valuations (property_id, valuation_date DESC);
```

### 3.2 Rent Payment & Expense Tracking

```sql
-- See full transactions table in Section 7
-- Key design: transactions table covers all financial flows
-- Type field distinguishes: rent_payment, expense, draw, capital_contribution, etc.
-- Partitioned by transaction_date for efficient date-range queries
```

### 3.3 Market Trend Data

```sql
CREATE TABLE market_snapshots (
    id                  UUID DEFAULT gen_random_uuid(),
    zip_code            TEXT NOT NULL,
    snapshot_date       DATE NOT NULL,
    median_price        NUMERIC(12, 2),
    median_price_sqft   NUMERIC(8, 2),
    days_on_market      SMALLINT,
    active_inventory    INTEGER,
    months_supply       NUMERIC(4, 2),
    median_rent         NUMERIC(8, 2),
    price_to_rent_ratio NUMERIC(6, 2),
    yoy_appreciation    NUMERIC(5, 2),    -- percentage
    source              TEXT NOT NULL,      -- 'redfin', 'zillow', 'census'
    raw_data            JSONB DEFAULT '{}', -- full API response for audit
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (zip_code, snapshot_date, source)
) PARTITION BY RANGE (snapshot_date);

CREATE INDEX idx_market_zip_date
    ON market_snapshots (zip_code, snapshot_date DESC);
```

### 3.4 TimescaleDB vs Native Partitioning

**Recommendation: Native PostgreSQL partitioning (not TimescaleDB).**

Rationale:

| Factor | TimescaleDB | Native partitioning | Verdict for Parcel |
|--------|------------|--------------------|--------------------|
| Railway support | Not available as extension | Built-in | Native wins |
| Auto-chunking | Automatic | Manual or pg_partman | Minor convenience loss |
| Compression | Native columnar, 90% savings | None built-in | TimescaleDB better but not needed yet |
| Query speed | 1000x faster on massive datasets | Fast enough for Parcel's scale | Native is sufficient |
| Operational complexity | Requires extension management | Zero -- built into PostgreSQL | Native wins |
| Data volume | Optimized for billions of rows | Good to 100s of millions | Native is sufficient |

TimescaleDB excels at IoT-scale ingestion (millions of rows/second) and analytical queries over terabytes. Parcel's time-series data (daily/weekly market snapshots, monthly valuations, transaction records) is low-frequency. Native partitioning with pg_partman handles this efficiently.

**When to reconsider:** If Parcel builds a market data product that ingests thousands of data points per minute across thousands of zip codes, TimescaleDB's automatic compression and continuous aggregates would be valuable.

### 3.5 Retention Policies and Data Aggregation

```sql
-- Continuous aggregation pattern (without TimescaleDB)
-- Use a materialized view refreshed on a schedule

CREATE MATERIALIZED VIEW market_trends_monthly AS
SELECT
    zip_code,
    date_trunc('month', snapshot_date) AS month,
    AVG(median_price) AS avg_median_price,
    AVG(days_on_market) AS avg_dom,
    AVG(active_inventory) AS avg_inventory,
    AVG(median_rent) AS avg_rent
FROM market_snapshots
GROUP BY zip_code, date_trunc('month', snapshot_date);

CREATE UNIQUE INDEX idx_market_trends_monthly
    ON market_trends_monthly (zip_code, month);

-- Refresh via pg_cron or application scheduler
-- REFRESH MATERIALIZED VIEW CONCURRENTLY market_trends_monthly;
```

**Data lifecycle:**

| Data type | Hot retention | Warm (aggregated) | Cold (archived) |
|-----------|--------------|-------------------|-----------------|
| Market snapshots | 2 years (daily) | 5 years (monthly averages) | Archive raw to S3 |
| Property valuations | 3 years | Indefinite (monthly) | Archive detailed to S3 |
| Transaction records | 7 years (tax compliance) | Indefinite | Never delete |
| Audit logs | 1 year | 7 years (compliance) | Detach partitions to cold storage |

---

## 4. Caching Layer

### 4.1 Redis Patterns for Parcel

**What to cache:**

| Data | TTL | Pattern | Reason |
|------|-----|---------|--------|
| User session/JWT claims | Match JWT expiry (e.g., 1h) | Write-through | Every request checks auth |
| User's plan tier | 5 minutes | Cache-aside | Checked on every gated feature |
| Dashboard aggregations | 5-15 minutes | Cache-aside | Expensive queries, rarely changes |
| Property detail pages | 1 hour | Cache-aside | Read-heavy, write-infrequent |
| Market data (zip stats) | 24 hours | Cache-aside | Updates daily |
| Feature flags | 30 seconds | Cache-aside | Changes rarely, checked every request |
| Rate limit counters | Sliding window (60s) | Atomic increment | API rate limiting |
| Calculator results | 10 minutes | Cache-aside (keyed on input hash) | Same inputs = same outputs |

**What NOT to cache (always query fresh):**

- Deal pipeline stage (changes in real-time during user session)
- Transaction financial data (correctness > speed for money)
- Subscription/billing status (always check Stripe source of truth)
- Document processing status (changes asynchronously)

### 4.2 Cache Invalidation Strategy

**Primary pattern: Cache-aside with TTL safety net.**

```python
# Example: cache user's dashboard metrics
import redis
import json
from hashlib import sha256

redis_client = redis.Redis.from_url(REDIS_URL)

def get_dashboard_metrics(user_id: str, db: Session) -> dict:
    cache_key = f"dashboard:{user_id}"

    # Try cache first
    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)

    # Cache miss -- query database
    metrics = compute_dashboard_metrics(db, user_id)

    # Write to cache with TTL
    redis_client.setex(
        cache_key,
        timedelta(minutes=10),
        json.dumps(metrics),
    )
    return metrics

def invalidate_dashboard(user_id: str):
    """Call this when a deal is created/updated/moved in pipeline."""
    redis_client.delete(f"dashboard:{user_id}")
```

**PostgreSQL LISTEN/NOTIFY for real-time invalidation (advanced):**

```sql
-- Trigger to notify on deal changes
CREATE OR REPLACE FUNCTION notify_deal_change() RETURNS trigger AS $$
BEGIN
    PERFORM pg_notify(
        'deal_change',
        json_build_object(
            'user_id', NEW.user_id,
            'deal_id', NEW.id,
            'action', TG_OP
        )::text
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_deal_notify
    AFTER INSERT OR UPDATE OR DELETE ON deals
    FOR EACH ROW EXECUTE FUNCTION notify_deal_change();
```

```python
# Python listener (run as background task)
import asyncio
import asyncpg

async def listen_for_invalidations():
    conn = await asyncpg.connect(DATABASE_URL)
    await conn.add_listener('deal_change', handle_deal_change)

async def handle_deal_change(conn, pid, channel, payload):
    data = json.loads(payload)
    redis_client.delete(f"dashboard:{data['user_id']}")
```

**Important caveat:** LISTEN/NOTIFY is at-most-once delivery. If the listener is disconnected when a notification fires, it is lost. This is acceptable because the TTL safety net ensures eventual cache refresh. Always set a TTL, even on entries you invalidate explicitly -- it is your safety net for bugs.

### 4.3 Redis on Railway

Railway provides one-click Redis deployment. Key considerations:

- **Memory limits:** Railway bills by actual memory usage. A development Redis instance costs ~$5-10/month
- **Persistence:** Enable AOF (Append Only File) persistence for session data. Disable for pure cache data
- **Connection string:** Available as `REDIS_URL` environment variable in Railway
- **Max memory policy:** Set `maxmemory-policy allkeys-lru` to evict least-recently-used keys when memory fills

```python
# Recommended Redis client setup for Parcel
import redis

redis_client = redis.Redis.from_url(
    os.getenv("REDIS_URL"),
    decode_responses=True,
    socket_connect_timeout=5,
    socket_timeout=5,
    retry_on_timeout=True,
)
```

---

## 5. Search Architecture

### 5.1 Technology Comparison for Parcel

| Criteria | PostgreSQL native | pg_search (ParadeDB) | Meilisearch | Elasticsearch |
|----------|------------------|---------------------|-------------|---------------|
| **Setup** | Already running | PG extension | Separate service | Separate cluster |
| **Railway deploy** | N/A (built-in) | Check extension support | One-click template | Manual Docker |
| **Cost** | $0 additional | $0 additional | $10-30/mo | $50-200+/mo |
| **Latency (10M rows)** | 22-31 seconds | 29-81 ms | <50 ms | 30-100 ms |
| **Typo tolerance** | pg_trgm only | Tantivy fuzzy | Built-in | Built-in |
| **Faceted search** | Manual SQL | Tantivy facets | Built-in | Built-in |
| **Relevance ranking** | ts_rank (primitive) | BM25 | Custom ranking | BM25 + ML |
| **Autocomplete** | Possible but slow | Possible | Sub-10ms | Sub-10ms |
| **Consistency** | Transactional | Transactional | Eventually consistent | Eventually consistent |
| **Operational burden** | None | Low | Low (single binary) | High (JVM cluster) |

### 5.2 Recommendation for Parcel

**Phase 1 (Now, 0-5K users):** PostgreSQL native with pg_trgm and tsvector. Zero additional cost or infrastructure. Parcel's searchable dataset is small enough that native PG handles it comfortably.

**Phase 2 (5K-50K users):** Deploy Meilisearch on Railway ($10-30/month). Key triggers for this upgrade:
- Users expect typeahead/autocomplete (< 50ms response)
- Faceted search is needed (filter by price range + beds + market + status simultaneously)
- Property search exceeds 1M records

**Phase 3 (50K+ users, if ever needed):** Evaluate pg_search if available as a Railway extension, or scale Meilisearch. Elasticsearch is unlikely to be justified given Parcel's scale trajectory.

### 5.3 Faceted Search Implementation (Meilisearch)

```python
# Meilisearch integration for property search
import meilisearch

client = meilisearch.Client('http://meilisearch.railway.internal:7700', 'master-key')

# Configure the index
index = client.index('properties')
index.update_filterable_attributes([
    'property_type', 'status', 'zip_code', 'city', 'state',
    'bedrooms', 'bathrooms', 'asking_price', 'market_zone'
])
index.update_sortable_attributes(['asking_price', 'created_at', 'sqft'])
index.update_searchable_attributes([
    'address', 'city', 'state', 'zip_code', 'notes', 'contact_name'
])

# Faceted search query
results = index.search(
    'duplex downtown',
    {
        'filter': [
            'asking_price >= 100000 AND asking_price <= 300000',
            'bedrooms >= 2',
            'property_type = duplex',
            'status = active',
        ],
        'facets': ['property_type', 'city', 'bedrooms', 'status'],
        'sort': ['asking_price:asc'],
        'limit': 20,
    }
)
```

### 5.4 Sync Strategy (PostgreSQL -> Meilisearch)

```python
# On property create/update, sync to Meilisearch
async def sync_property_to_search(property_id: UUID, db: Session):
    prop = db.query(Property).get(property_id)
    index = meilisearch_client.index('properties')
    index.add_documents([{
        'id': str(prop.id),
        'address': prop.address,
        'city': prop.city,
        'state': prop.state,
        'zip_code': prop.zip_code,
        'property_type': prop.property_type,
        'bedrooms': prop.bedrooms,
        'bathrooms': float(prop.bathrooms) if prop.bathrooms else None,
        'sqft': prop.sqft,
        'asking_price': float(prop.asking_price) if prop.asking_price else None,
        'status': prop.status,
        'notes': prop.notes,
        'created_at': prop.created_at.isoformat(),
    }])

# Use a background task queue (Celery or ARQ) for async sync
# Never block the API request on search index updates
```

---

## 6. Data Model Patterns

### 6.1 Event Sourcing for Deal Pipeline

Parcel's current `pipeline_entries` table stores only the current state. For a full operating system, every pipeline movement should be recorded as an immutable event.

**Pattern: Event log + materialized current state.**

```sql
-- Immutable event log (append-only)
CREATE TABLE pipeline_events (
    id          UUID DEFAULT gen_random_uuid(),
    deal_id     UUID NOT NULL,
    user_id     UUID NOT NULL,
    from_stage  TEXT,          -- NULL for initial placement
    to_stage    TEXT NOT NULL,
    reason      TEXT,          -- "Lost to competitor", "Seller accepted offer", etc.
    metadata    JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Current state (materialized from events)
-- The existing pipeline_entries table becomes a materialized view
-- Updated via trigger on pipeline_events INSERT

CREATE OR REPLACE FUNCTION update_pipeline_current_state() RETURNS trigger AS $$
BEGIN
    INSERT INTO pipeline_entries (deal_id, user_id, team_id, stage, entered_stage_at, notes)
    SELECT NEW.deal_id, NEW.user_id,
           d.team_id, NEW.to_stage, NEW.created_at, NEW.reason
    FROM deals d WHERE d.id = NEW.deal_id
    ON CONFLICT (deal_id)
    DO UPDATE SET
        stage = EXCLUDED.stage,
        entered_stage_at = EXCLUDED.entered_stage_at,
        notes = EXCLUDED.notes;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pipeline_event_materialize
    AFTER INSERT ON pipeline_events
    FOR EACH ROW EXECUTE FUNCTION update_pipeline_current_state();
```

**Benefits:**
- Complete deal history: "Show me every stage this deal went through and how long it stayed in each"
- Analytics: "What's my average time from Lead to Under Contract?"
- Undo capability: replay events up to a point to restore previous state
- Compliance: immutable audit trail of all pipeline movements

### 6.2 Audit Trails for Financial Data

Every mutation to financial data must be logged with who, what, when, and the before/after values.

```sql
CREATE SCHEMA IF NOT EXISTS audit;

CREATE TABLE audit.change_log (
    id              BIGSERIAL PRIMARY KEY,
    schema_name     TEXT NOT NULL,
    table_name      TEXT NOT NULL,
    record_id       UUID,
    action          TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data        JSONB,
    new_data        JSONB,
    changed_fields  TEXT[],   -- which columns changed (for UPDATE)
    user_id         UUID,     -- from session variable
    ip_address      INET,
    user_agent      TEXT,
    action_tstamp   TIMESTAMPTZ NOT NULL DEFAULT now(),
    transaction_id  BIGINT DEFAULT txid_current()
);

CREATE INDEX idx_audit_table_record
    ON audit.change_log (table_name, record_id);
CREATE INDEX idx_audit_tstamp
    ON audit.change_log (action_tstamp);
CREATE INDEX idx_audit_user
    ON audit.change_log (user_id);

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION audit.log_changes() RETURNS trigger AS $$
DECLARE
    v_old JSONB;
    v_new JSONB;
    v_changed TEXT[];
    v_record_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_old := to_jsonb(OLD);
        v_record_id := OLD.id;
    ELSIF TG_OP = 'UPDATE' THEN
        v_old := to_jsonb(OLD);
        v_new := to_jsonb(NEW);
        v_record_id := NEW.id;
        -- Compute changed fields
        SELECT array_agg(key) INTO v_changed
        FROM jsonb_each(v_new) n
        FULL OUTER JOIN jsonb_each(v_old) o USING (key)
        WHERE n.value IS DISTINCT FROM o.value;
    ELSIF TG_OP = 'INSERT' THEN
        v_new := to_jsonb(NEW);
        v_record_id := NEW.id;
    END IF;

    INSERT INTO audit.change_log (
        schema_name, table_name, record_id, action,
        old_data, new_data, changed_fields,
        user_id, action_tstamp
    ) VALUES (
        TG_TABLE_SCHEMA, TG_TABLE_NAME, v_record_id, TG_OP,
        v_old, v_new, v_changed,
        NULLIF(current_setting('app.current_user_id', true), '')::UUID,
        now()
    );

    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply to financial tables
CREATE TRIGGER trg_audit_transactions
    AFTER INSERT OR UPDATE OR DELETE ON transactions
    FOR EACH ROW EXECUTE FUNCTION audit.log_changes();

CREATE TRIGGER trg_audit_deals
    AFTER INSERT OR UPDATE OR DELETE ON deals
    FOR EACH ROW EXECUTE FUNCTION audit.log_changes();

CREATE TRIGGER trg_audit_portfolio
    AFTER INSERT OR UPDATE OR DELETE ON portfolio_entries
    FOR EACH ROW EXECUTE FUNCTION audit.log_changes();
```

### 6.3 Soft Deletes vs Hard Deletes

**Parcel's current approach:** `deleted_at` column on deals (soft delete). This is correct.

**Policy by table:**

| Table | Delete strategy | Reason |
|-------|----------------|--------|
| deals | Soft delete (`deleted_at`) | Users may want to restore; compliance requires history |
| contacts | Soft delete | Referenced by deals and communications |
| properties | Soft delete | Referenced by deals, valuations, transactions |
| transactions | **Never delete** | Financial compliance; append correction entries instead |
| pipeline_events | **Never delete** (append-only) | Immutable event log |
| audit.change_log | **Never delete** | Compliance audit trail |
| communications | Soft delete | Users may need to restore |
| tasks | Hard delete | No compliance requirement; user convenience |
| documents | Soft delete (metadata) + retain S3 file for 90 days | Legal hold potential |
| leases | Soft delete | Financial and legal reference |

**Implementation pattern:**

```sql
-- Partial unique indexes that exclude soft-deleted records
-- This prevents "ghost" conflicts with deleted records
CREATE UNIQUE INDEX idx_contacts_email_active
    ON contacts (email, user_id)
    WHERE deleted_at IS NULL;

-- Default scope in SQLAlchemy (filter out deleted records)
-- Use a custom query class or mixin
```

```python
# SQLAlchemy soft delete mixin
class SoftDeleteMixin:
    deleted_at = Column(DateTime, nullable=True)

    @classmethod
    def active(cls):
        """Return a filter for non-deleted records."""
        return cls.deleted_at.is_(None)
```

### 6.4 Polymorphic Contacts

Contacts in Parcel span multiple roles: seller, buyer, agent, contractor, tenant, lender, title company. The recommended pattern is **class table inheritance** (shared base table + role-specific extension tables).

**Why not single-table inheritance (one table with a type column):**
- Wastes space: seller-specific columns are NULL for buyers, and vice versa
- No foreign key integrity on type-specific fields
- Table becomes very wide as role-specific attributes accumulate

**Why not completely separate tables:**
- Duplicates shared fields (name, email, phone, address)
- Makes "search across all contacts" queries require UNION ALL
- A person can be both a buyer and a contractor

**Class table inheritance pattern:**

```
contacts (base: name, email, phone)
    |
    |-- contact_seller_details (motivated_reason, asking_price, ...)
    |-- contact_buyer_details (budget_max, preferred_areas, ...)
    |-- contact_agent_details (license_number, brokerage, ...)
    |-- contact_contractor_details (specialty, hourly_rate, ...)
    |-- contact_tenant_details (lease_id, credit_score, ...)
    |-- contact_lender_details (institution, loan_types, ...)
```

A single contact can have entries in multiple detail tables (e.g., an agent who is also a buyer). This is modeled with a many-to-many approach via a `contact_roles` junction table.

See Section 7 for the full schema.

### 6.5 Document Storage Pattern

Parcel already implements the correct pattern: S3 for file storage, PostgreSQL for metadata and AI-extracted content.

**Enhanced design for versioning:**

```sql
-- Current documents table is fine for single-version files
-- For versioning (e.g., updated contracts), add a version chain:
ALTER TABLE documents ADD COLUMN parent_document_id UUID REFERENCES documents(id);
ALTER TABLE documents ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

-- The latest version of a document is the one with no children
-- OR add a convenience flag:
ALTER TABLE documents ADD COLUMN is_latest BOOLEAN NOT NULL DEFAULT true;

-- Index for quick "get latest version" queries
CREATE INDEX idx_documents_latest
    ON documents (user_id, original_filename)
    WHERE is_latest = true AND deleted_at IS NULL;
```

---

## 7. Schema Recommendations

All tables below use these conventions:
- UUID primary keys (via `gen_random_uuid()`) for global uniqueness and no sequential ID leakage
- `created_at` / `updated_at` timestamps with timezone
- `deleted_at` for soft-deletable entities
- `user_id` on every tenant-scoped table (for RLS)
- `team_id` where team-level sharing is needed

### 7.1 contacts

```sql
CREATE TABLE contacts (
    -- Identity
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    team_id         UUID REFERENCES teams(id),

    -- Core fields (shared across all contact types)
    full_name       TEXT NOT NULL,
    email           TEXT,
    phone           TEXT,
    phone_secondary TEXT,
    company         TEXT,

    -- Address (nullable -- not all contacts have a mailing address)
    address_line1   TEXT,
    address_line2   TEXT,
    city            TEXT,
    state           TEXT(2),
    zip_code        TEXT,

    -- Classification
    -- A contact can have multiple roles (see contact_roles)
    source          TEXT,          -- 'driving_for_dollars', 'referral', 'cold_call', 'website'
    tags            TEXT[],        -- user-defined tags for flexible categorization

    -- Notes
    notes           TEXT,

    -- Lifecycle
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ,

    -- Search
    search_vector   tsvector
);

-- Indexes
CREATE INDEX idx_contacts_user ON contacts (user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_contacts_team ON contacts (team_id) WHERE team_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_contacts_email ON contacts (user_id, email) WHERE deleted_at IS NULL;
CREATE INDEX idx_contacts_name_trgm ON contacts USING GIN (full_name gin_trgm_ops);
CREATE INDEX idx_contacts_search ON contacts USING GIN (search_vector);
CREATE INDEX idx_contacts_tags ON contacts USING GIN (tags);

-- Search vector trigger
CREATE TRIGGER trg_contacts_search
    BEFORE INSERT OR UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION contacts_search_trigger();
```

**Rationale:**
- `full_name` instead of first/last: real estate contacts are often entered as "John Smith" or "ABC Properties LLC" -- forcing first/last creates friction for companies
- `TEXT[]` for tags: PostgreSQL arrays with GIN index support fast containment queries (`tags @> ARRAY['motivated', 'cash_buyer']`) without a join table
- `search_vector`: enables full-text search across name, email, company, notes without hitting every column
- No type/role column on the base table: roles are modeled separately (see below)

```sql
-- Role assignments (many-to-many: one contact can be buyer AND agent)
CREATE TABLE contact_roles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id  UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    role        TEXT NOT NULL,  -- 'seller', 'buyer', 'agent', 'contractor', 'tenant', 'lender', 'title_company'
    is_primary  BOOLEAN NOT NULL DEFAULT false,  -- primary role for display purposes
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (contact_id, role)
);

CREATE INDEX idx_contact_roles_contact ON contact_roles (contact_id);
CREATE INDEX idx_contact_roles_role ON contact_roles (role);

-- Role-specific extension tables (only created as needed)
CREATE TABLE contact_seller_details (
    contact_id       UUID PRIMARY KEY REFERENCES contacts(id) ON DELETE CASCADE,
    motivation_level SMALLINT,       -- 1-10 scale
    motivation_reason TEXT,           -- 'foreclosure', 'divorce', 'inherited', 'relocation'
    asking_price     NUMERIC(12, 2),
    property_id      UUID REFERENCES properties(id),
    timeline         TEXT,            -- 'immediate', '30_days', '90_days', 'flexible'
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE contact_buyer_details (
    contact_id          UUID PRIMARY KEY REFERENCES contacts(id) ON DELETE CASCADE,
    budget_min          NUMERIC(12, 2),
    budget_max          NUMERIC(12, 2),
    preferred_types     TEXT[],         -- ['single_family', 'duplex']
    preferred_zip_codes TEXT[],
    financing_type      TEXT,           -- 'cash', 'conventional', 'fha', 'hard_money'
    proof_of_funds      BOOLEAN DEFAULT false,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE contact_agent_details (
    contact_id      UUID PRIMARY KEY REFERENCES contacts(id) ON DELETE CASCADE,
    license_number  TEXT,
    brokerage       TEXT,
    mls_id          TEXT,
    specialty       TEXT[],     -- ['residential', 'commercial', 'land']
    markets         TEXT[],     -- zip codes or city names they cover
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE contact_contractor_details (
    contact_id      UUID PRIMARY KEY REFERENCES contacts(id) ON DELETE CASCADE,
    specialty       TEXT[],     -- ['plumbing', 'electrical', 'general', 'roofing']
    license_number  TEXT,
    insurance_expiry DATE,
    hourly_rate     NUMERIC(8, 2),
    rating          NUMERIC(2, 1),  -- 1.0 to 5.0
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE contact_lender_details (
    contact_id      UUID PRIMARY KEY REFERENCES contacts(id) ON DELETE CASCADE,
    institution     TEXT,
    loan_types      TEXT[],     -- ['conventional', 'hard_money', 'dscr', 'bridge']
    min_loan        NUMERIC(12, 2),
    max_loan        NUMERIC(12, 2),
    typical_rate    NUMERIC(5, 3),  -- e.g., 7.250
    typical_points  NUMERIC(3, 1),  -- e.g., 1.5
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Rationale for class table inheritance:**
- A single contact can be both a buyer and a contractor (common in RE investing)
- Each extension table has a `contact_id` PK that references `contacts(id)` -- no duplication of base fields
- Extension tables are optional: a newly added contact can exist with zero extension rows
- Foreign keys with `ON DELETE CASCADE` ensure cleanup when a contact is hard-deleted
- Each extension table stays narrow and focused

### 7.2 properties

```sql
CREATE TABLE properties (
    -- Identity
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    team_id         UUID REFERENCES teams(id),

    -- Address (normalized for querying)
    address_line1   TEXT NOT NULL,
    address_line2   TEXT,
    city            TEXT NOT NULL,
    state           TEXT NOT NULL,  -- 2-letter code
    zip_code        TEXT NOT NULL,
    county          TEXT,

    -- Geospatial
    latitude        NUMERIC(10, 7),
    longitude       NUMERIC(10, 7),
    geom            geography(Point, 4326),  -- PostGIS, populated from lat/lng

    -- Core attributes (normalized for queries)
    property_type   TEXT NOT NULL,  -- 'single_family', 'duplex', 'triplex', 'quad', 'commercial', 'land', 'mixed_use'
    status          TEXT NOT NULL DEFAULT 'lead',  -- 'lead', 'prospect', 'active', 'under_contract', 'owned', 'sold', 'archived'
    bedrooms        SMALLINT,
    bathrooms       NUMERIC(3, 1),
    sqft            INTEGER,
    lot_sqft        INTEGER,
    year_built      SMALLINT,
    asking_price    NUMERIC(12, 2),
    estimated_value NUMERIC(12, 2),  -- latest ARV/FMV

    -- Variable attributes (JSONB for type-specific data)
    attributes      JSONB DEFAULT '{}',
    -- Examples:
    -- SFR: {"pool": true, "garage_spaces": 2, "basement": "finished"}
    -- Duplex: {"units": [{"sqft": 800, "beds": 2, "rent": 1200}, {"sqft": 750, "beds": 1, "rent": 950}]}
    -- Commercial: {"nnn": 4200, "cap_rate": 0.068, "zoning": "C-2", "parking_spaces": 20}
    -- Land: {"zoning": "R-1", "utilities": ["water", "sewer"], "buildable_sqft": 5000}

    -- Acquisition info
    acquisition_date   DATE,
    acquisition_price  NUMERIC(12, 2),
    acquisition_method TEXT,  -- 'wholesale', 'mls', 'auction', 'direct_mail', 'driving_for_dollars'

    -- External references
    mls_number      TEXT,
    parcel_number   TEXT,  -- county assessor parcel number (APN)
    external_url    TEXT,  -- Zillow, Redfin, etc.

    -- Notes
    notes           TEXT,

    -- Search
    search_vector   tsvector,

    -- Lifecycle
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_properties_user ON properties (user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_properties_team ON properties (team_id) WHERE team_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_properties_zip ON properties (zip_code);
CREATE INDEX idx_properties_type_status ON properties (property_type, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_properties_geom ON properties USING GIST (geom);
CREATE INDEX idx_properties_address_trgm ON properties USING GIN (address_line1 gin_trgm_ops);
CREATE INDEX idx_properties_search ON properties USING GIN (search_vector);
CREATE INDEX idx_properties_attrs ON properties USING GIN (attributes);
CREATE INDEX idx_properties_price ON properties (asking_price) WHERE deleted_at IS NULL AND status IN ('lead', 'prospect', 'active');
CREATE INDEX idx_properties_parcel_number ON properties (parcel_number) WHERE parcel_number IS NOT NULL;

-- Auto-populate geom from lat/lng
CREATE OR REPLACE FUNCTION properties_set_geom() RETURNS trigger AS $$
BEGIN
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_properties_geom
    BEFORE INSERT OR UPDATE OF latitude, longitude ON properties
    FOR EACH ROW EXECUTE FUNCTION properties_set_geom();
```

**Rationale:**
- `geography(Point, 4326)`: Uses the geography type (not geometry) so distances are in meters on a spheroid, not planar units. SRID 4326 = WGS84 (standard GPS coordinates)
- Separate `latitude`/`longitude` columns alongside `geom`: Lat/lng are human-readable and used in API responses; `geom` is the indexed column for spatial queries. Trigger keeps them in sync.
- `NUMERIC(10, 7)` for lat/lng: 7 decimal places gives ~1cm precision
- `asking_price` and `estimated_value` as first-class columns: Most common filter/sort criteria. Never put money in JSONB.
- `attributes JSONB`: Holds type-specific data. A single family home has pool/garage; a duplex has per-unit details; commercial has NNN/cap rate. GIN index enables queries like `attributes @> '{"pool": true}'`
- `parcel_number`: County APN is the canonical identifier for US real property. Important for data deduplication and tax record lookups.
- Partial indexes with `WHERE deleted_at IS NULL`: Most queries exclude soft-deleted records. Partial indexes are smaller and faster.

### 7.3 deals

```sql
CREATE TABLE deals (
    -- Identity
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    team_id         UUID REFERENCES teams(id),

    -- Linked entities
    property_id     UUID REFERENCES properties(id),
    -- Contact associations via deal_contacts junction table

    -- Deal classification
    strategy        TEXT NOT NULL,   -- 'wholesale', 'creative_finance', 'brrrr', 'buy_and_hold', 'flip'
    status          TEXT NOT NULL DEFAULT 'draft',  -- 'draft', 'analyzing', 'active', 'under_contract', 'closed', 'dead'
    pipeline_stage  TEXT,            -- denormalized from pipeline_entries for fast list queries

    -- Address (denormalized from property for display without join)
    address         TEXT NOT NULL,
    zip_code        TEXT NOT NULL,
    property_type   TEXT NOT NULL,

    -- Key financial metrics (normalized from inputs for queries)
    purchase_price  NUMERIC(12, 2),
    arv             NUMERIC(12, 2),  -- after repair value
    rehab_estimate  NUMERIC(12, 2),
    monthly_rent    NUMERIC(10, 2),
    assignment_fee  NUMERIC(10, 2),  -- wholesale deals
    cash_on_cash    NUMERIC(5, 2),   -- percentage
    cap_rate        NUMERIC(5, 3),   -- percentage (e.g., 0.068)

    -- Full calculator inputs and outputs (JSONB for flexibility)
    inputs          JSONB NOT NULL DEFAULT '{}',
    outputs         JSONB NOT NULL DEFAULT '{}',

    -- Risk assessment
    risk_score      SMALLINT,        -- 0-100
    risk_factors    JSONB,

    -- Notes
    notes           TEXT,

    -- Lifecycle
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_deals_user_status ON deals (user_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_deals_team ON deals (team_id) WHERE team_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_deals_property ON deals (property_id) WHERE property_id IS NOT NULL;
CREATE INDEX idx_deals_strategy ON deals (strategy) WHERE deleted_at IS NULL;
CREATE INDEX idx_deals_zip ON deals (zip_code) WHERE deleted_at IS NULL;
CREATE INDEX idx_deals_pipeline ON deals (pipeline_stage) WHERE deleted_at IS NULL AND status NOT IN ('draft', 'dead');
CREATE INDEX idx_deals_created ON deals (user_id, created_at DESC) WHERE deleted_at IS NULL;

-- Junction table for deal-contact relationships
CREATE TABLE deal_contacts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id     UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    contact_id  UUID NOT NULL REFERENCES contacts(id),
    role        TEXT NOT NULL,  -- 'seller', 'buyer', 'agent', 'lender', 'title_company', 'contractor'
    is_primary  BOOLEAN NOT NULL DEFAULT false,
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (deal_id, contact_id, role)
);

CREATE INDEX idx_deal_contacts_deal ON deal_contacts (deal_id);
CREATE INDEX idx_deal_contacts_contact ON deal_contacts (contact_id);
```

**Rationale:**
- `property_id` FK: Links to the properties table. Nullable because a deal can be created before a property record exists (e.g., analyzing a deal from a lead list).
- Denormalized `address`, `zip_code`, `property_type`: Avoids a JOIN for deal list views. These fields are set at creation and rarely change.
- Key financial metrics as columns: `purchase_price`, `arv`, `rehab_estimate`, `monthly_rent` are the most-filtered and sorted fields. Pulling them out of JSONB enables the query planner to use statistics.
- `inputs`/`outputs` JSONB: Retains the current flexible approach for full calculator data that varies by strategy.
- `pipeline_stage` denormalized: The canonical stage lives in `pipeline_entries` (with event history in `pipeline_events`). This denormalized column is updated via trigger for fast list queries without JOINing.
- `deal_contacts` junction: A deal typically involves a seller, buyer's agent, lender, and title company. The junction table with a `role` column models these relationships cleanly.

### 7.4 transactions

```sql
CREATE TABLE transactions (
    -- Identity
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    team_id         UUID REFERENCES teams(id),

    -- Linked entities (all nullable -- a transaction may relate to any combination)
    deal_id         UUID REFERENCES deals(id),
    property_id     UUID REFERENCES properties(id),
    lease_id        UUID REFERENCES leases(id),
    rehab_project_id UUID REFERENCES rehab_projects(id),
    contact_id      UUID REFERENCES contacts(id),  -- payee or payer

    -- Classification
    type            TEXT NOT NULL,
    -- Income types: 'rent_payment', 'assignment_fee', 'sale_proceeds', 'late_fee', 'other_income'
    -- Expense types: 'rehab_cost', 'closing_cost', 'property_tax', 'insurance',
    --               'mortgage_payment', 'hoa', 'maintenance', 'property_management',
    --               'utilities', 'capital_expenditure', 'other_expense'
    -- Transfer types: 'capital_contribution', 'distribution', 'draw'
    category        TEXT,           -- sub-category for custom grouping
    description     TEXT,

    -- Financial
    amount          NUMERIC(12, 2) NOT NULL,  -- positive = income, negative = expense
    currency        TEXT NOT NULL DEFAULT 'USD',
    payment_method  TEXT,           -- 'ach', 'check', 'wire', 'cash', 'credit_card', 'zelle', 'venmo'
    reference_number TEXT,          -- check number, confirmation code, etc.

    -- Timing
    transaction_date DATE NOT NULL,  -- when the transaction occurred
    posted_date     DATE,            -- when it cleared
    due_date        DATE,            -- for scheduled/recurring

    -- Status
    status          TEXT NOT NULL DEFAULT 'completed',  -- 'pending', 'completed', 'voided', 'reconciled'
    is_recurring    BOOLEAN NOT NULL DEFAULT false,
    recurrence_rule TEXT,            -- iCalendar RRULE format for recurring

    -- Attachments
    receipt_document_id UUID REFERENCES documents(id),

    -- Metadata
    metadata        JSONB DEFAULT '{}',
    notes           TEXT,

    -- Lifecycle (NO deleted_at -- financial records are NEVER deleted)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_txn_user_date ON transactions (user_id, transaction_date DESC);
CREATE INDEX idx_txn_property ON transactions (property_id, transaction_date DESC) WHERE property_id IS NOT NULL;
CREATE INDEX idx_txn_deal ON transactions (deal_id) WHERE deal_id IS NOT NULL;
CREATE INDEX idx_txn_lease ON transactions (lease_id) WHERE lease_id IS NOT NULL;
CREATE INDEX idx_txn_type ON transactions (type, transaction_date DESC);
CREATE INDEX idx_txn_status ON transactions (status) WHERE status != 'completed';

-- For financial reporting: sum by property by month
CREATE INDEX idx_txn_property_month
    ON transactions (property_id, date_trunc('month', transaction_date))
    WHERE property_id IS NOT NULL;
```

**Rationale:**
- **Single transactions table** (not separate income/expense tables): Simplifies reporting. `amount > 0` is income, `amount < 0` is expense. This pattern is standard in accounting systems.
- **No `deleted_at`**: Financial records must never be deleted. To reverse a transaction, create a new transaction with opposite sign and reference the original in `metadata`. This is the standard accounting pattern.
- **`transaction_date` vs `posted_date` vs `due_date`**: Transaction date is when the event occurred (user's perspective). Posted date is when it cleared the bank. Due date is for scheduled payments. All three matter for different reports.
- **`is_recurring` + `recurrence_rule`**: Recurring rent payments, mortgage payments, etc. The iCalendar RRULE format is a well-defined standard for recurrence rules.
- **Flexible FK columns**: A transaction can relate to a deal, property, lease, rehab project, or any combination. All are nullable.
- **`type` as TEXT**: Allows new transaction types without schema migration. Validate in application layer.
- **Partitioning-ready**: `transaction_date` is the natural partition key. Add partitioning when this table exceeds 2M rows.

### 7.5 leases

```sql
CREATE TABLE leases (
    -- Identity
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    team_id         UUID REFERENCES teams(id),

    -- Linked entities
    property_id     UUID NOT NULL REFERENCES properties(id),
    unit_identifier TEXT,           -- 'Unit A', 'Unit 2B', etc. (for multi-unit)
    tenant_contact_id UUID REFERENCES contacts(id),  -- tenant is a contact

    -- Lease terms
    lease_type      TEXT NOT NULL,   -- 'fixed_term', 'month_to_month', 'section_8', 'commercial'
    status          TEXT NOT NULL DEFAULT 'draft',  -- 'draft', 'active', 'expired', 'terminated', 'renewed'
    start_date      DATE NOT NULL,
    end_date        DATE,            -- NULL for month-to-month
    move_in_date    DATE,
    move_out_date   DATE,

    -- Financial terms
    monthly_rent    NUMERIC(10, 2) NOT NULL,
    security_deposit NUMERIC(10, 2),
    pet_deposit     NUMERIC(10, 2),
    late_fee        NUMERIC(8, 2),
    late_fee_grace_days SMALLINT DEFAULT 5,
    rent_due_day    SMALLINT NOT NULL DEFAULT 1,  -- day of month rent is due

    -- Rent schedule (for escalating rents or complex schedules)
    rent_schedule   JSONB,
    -- Example: [{"start": "2026-01-01", "end": "2026-12-31", "amount": 1200},
    --           {"start": "2027-01-01", "end": "2027-12-31", "amount": 1250}]

    -- Utilities and responsibilities
    utilities       JSONB DEFAULT '{}',
    -- Example: {"water": "landlord", "electric": "tenant", "gas": "tenant", "trash": "landlord"}

    -- Lease document reference
    lease_document_id UUID REFERENCES documents(id),

    -- Renewal tracking
    parent_lease_id UUID REFERENCES leases(id),  -- links to the previous lease if this is a renewal
    auto_renew      BOOLEAN NOT NULL DEFAULT false,
    renewal_notice_days SMALLINT DEFAULT 30,

    -- Notes
    notes           TEXT,
    terms           JSONB DEFAULT '{}',  -- additional custom terms

    -- Lifecycle
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_leases_user ON leases (user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_leases_property ON leases (property_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_leases_tenant ON leases (tenant_contact_id) WHERE tenant_contact_id IS NOT NULL;
CREATE INDEX idx_leases_status ON leases (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_leases_end_date ON leases (end_date) WHERE status = 'active' AND deleted_at IS NULL;
-- For "leases expiring in the next 30/60/90 days" dashboard widget
```

**Rationale:**
- **`tenant_contact_id`**: References the contacts table. The tenant is a contact with a "tenant" role. This unifies all people in the system.
- **`unit_identifier`**: For multi-unit properties, identifies which unit the lease covers. TEXT instead of FK because not all users will have a formal units table.
- **`rent_schedule` JSONB**: Fixed-term leases with annual escalations need a schedule. JSONB is appropriate because this is read-as-a-whole, not queried independently.
- **`parent_lease_id`**: Creates a chain of lease renewals. "Show me the full rental history for Unit A" is a recursive query on this chain.
- **`utilities` JSONB**: Responsibility assignment varies by lease. JSONB is appropriate because this is a simple key-value lookup, not a query filter.
- **`end_date` NULL for month-to-month**: A deliberate design choice. An active lease with `end_date IS NULL` is month-to-month. The index on `end_date WHERE status = 'active'` powers the "expiring leases" dashboard widget.

### 7.6 rehab_projects

```sql
CREATE TABLE rehab_projects (
    -- Identity
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    team_id         UUID REFERENCES teams(id),

    -- Linked entities
    deal_id         UUID REFERENCES deals(id),
    property_id     UUID NOT NULL REFERENCES properties(id),

    -- Project overview
    name            TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'planning',
    -- 'planning', 'permitting', 'in_progress', 'punch_list', 'completed', 'on_hold'

    -- Budget
    estimated_budget NUMERIC(12, 2) NOT NULL,
    actual_spent    NUMERIC(12, 2) NOT NULL DEFAULT 0,  -- computed from transactions
    contingency_pct NUMERIC(4, 2) DEFAULT 10.00,         -- percentage buffer

    -- Timeline
    planned_start   DATE,
    planned_end     DATE,
    actual_start    DATE,
    actual_end      DATE,

    -- Notes
    notes           TEXT,
    metadata        JSONB DEFAULT '{}',

    -- Lifecycle
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

-- Scope of work items
CREATE TABLE rehab_line_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES rehab_projects(id) ON DELETE CASCADE,

    -- Categorization
    category        TEXT NOT NULL,
    -- 'demolition', 'framing', 'plumbing', 'electrical', 'hvac', 'roofing',
    -- 'flooring', 'painting', 'kitchen', 'bathroom', 'landscaping', 'permits', 'other'
    description     TEXT NOT NULL,
    sort_order      SMALLINT NOT NULL DEFAULT 0,

    -- Budget
    estimated_cost  NUMERIC(10, 2) NOT NULL,
    actual_cost     NUMERIC(10, 2),

    -- Assignment
    contractor_contact_id UUID REFERENCES contacts(id),

    -- Status
    status          TEXT NOT NULL DEFAULT 'pending',
    -- 'pending', 'in_progress', 'completed', 'skipped'
    completed_at    TIMESTAMPTZ,

    -- Notes and evidence
    notes           TEXT,
    before_photo_ids UUID[],  -- references to documents table
    after_photo_ids UUID[],

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rehab_projects_user ON rehab_projects (user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_rehab_projects_property ON rehab_projects (property_id);
CREATE INDEX idx_rehab_line_items_project ON rehab_line_items (project_id);
CREATE INDEX idx_rehab_line_items_contractor ON rehab_line_items (contractor_contact_id)
    WHERE contractor_contact_id IS NOT NULL;
```

**Rationale:**
- **Two-table design** (project + line items): A rehab project has a header (budget, timeline, status) and line items (individual scope items). This is the standard ERP pattern.
- **`actual_spent` on the project**: Denormalized sum from `transactions WHERE rehab_project_id = ?`. Updated via trigger or application logic. Avoids expensive SUM query on every project view.
- **`contractor_contact_id` on line items**: Each line item can be assigned to a different contractor. Contractors are contacts with a "contractor" role.
- **`before_photo_ids` / `after_photo_ids`**: UUID arrays referencing the documents table. Using arrays instead of a junction table because the relationship is simple (a line item has a few photos) and rarely queried independently.
- **`sort_order`**: Users want to arrange scope items in their preferred order (demolition first, then framing, etc.).

### 7.7 tasks

```sql
CREATE TABLE tasks (
    -- Identity
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    team_id         UUID REFERENCES teams(id),
    assigned_to     UUID REFERENCES users(id),  -- team member assignment

    -- Linked entities (all nullable -- a task can relate to any entity)
    deal_id         UUID REFERENCES deals(id),
    property_id     UUID REFERENCES properties(id),
    contact_id      UUID REFERENCES contacts(id),
    lease_id        UUID REFERENCES leases(id),
    rehab_project_id UUID REFERENCES rehab_projects(id),

    -- Task details
    title           TEXT NOT NULL,
    description     TEXT,
    task_type       TEXT NOT NULL DEFAULT 'todo',
    -- 'todo', 'follow_up', 'call', 'meeting', 'inspection', 'due_diligence',
    -- 'document_review', 'payment', 'reminder'

    -- Priority and status
    priority        TEXT NOT NULL DEFAULT 'medium',  -- 'low', 'medium', 'high', 'urgent'
    status          TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'in_progress', 'completed', 'cancelled'

    -- Scheduling
    due_date        DATE,
    due_time        TIME,
    reminder_at     TIMESTAMPTZ,     -- when to send reminder notification
    completed_at    TIMESTAMPTZ,

    -- Recurrence (for recurring tasks like monthly inspections)
    is_recurring    BOOLEAN NOT NULL DEFAULT false,
    recurrence_rule TEXT,            -- iCalendar RRULE
    parent_task_id  UUID REFERENCES tasks(id),  -- links recurring instances to parent

    -- Notes
    notes           TEXT,
    metadata        JSONB DEFAULT '{}',

    -- Lifecycle (hard delete is fine for tasks)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_tasks_user_status ON tasks (user_id, status) WHERE status IN ('pending', 'in_progress');
CREATE INDEX idx_tasks_assigned ON tasks (assigned_to, status) WHERE assigned_to IS NOT NULL AND status IN ('pending', 'in_progress');
CREATE INDEX idx_tasks_due ON tasks (due_date) WHERE status IN ('pending', 'in_progress');
CREATE INDEX idx_tasks_reminder ON tasks (reminder_at) WHERE reminder_at IS NOT NULL AND status = 'pending';
CREATE INDEX idx_tasks_deal ON tasks (deal_id) WHERE deal_id IS NOT NULL;
CREATE INDEX idx_tasks_property ON tasks (property_id) WHERE property_id IS NOT NULL;
CREATE INDEX idx_tasks_contact ON tasks (contact_id) WHERE contact_id IS NOT NULL;
```

**Rationale:**
- **Polymorphic entity links**: A task can relate to any entity (deal, property, contact, lease, rehab project). All FKs are nullable. At least one should be set, but this is enforced in the application layer, not the database (a CHECK constraint across 5 nullable columns is unwieldy).
- **No soft delete**: Tasks are low-stakes data. Hard delete is fine. Completed tasks are retained (filtered by `status = 'completed'`), but users can permanently delete tasks they no longer need.
- **`reminder_at` with index**: The index on `(reminder_at) WHERE status = 'pending'` allows a scheduled job to efficiently query "SELECT * FROM tasks WHERE reminder_at <= now() AND status = 'pending'" without scanning completed tasks.
- **`assigned_to` separate from `user_id`**: `user_id` is the creator (and RLS owner). `assigned_to` is the team member responsible. A manager creates tasks for team members.

### 7.8 communications

```sql
CREATE TABLE communications (
    -- Identity
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    team_id         UUID REFERENCES teams(id),

    -- Linked entities
    contact_id      UUID REFERENCES contacts(id),
    deal_id         UUID REFERENCES deals(id),
    property_id     UUID REFERENCES properties(id),

    -- Communication details
    channel         TEXT NOT NULL,    -- 'phone_call', 'email', 'text_sms', 'voicemail', 'in_person', 'mail'
    direction       TEXT NOT NULL,    -- 'inbound', 'outbound'
    subject         TEXT,             -- email subject or call purpose
    body            TEXT,             -- email body, text content, or call notes
    duration_seconds INTEGER,         -- for phone calls

    -- Status
    status          TEXT NOT NULL DEFAULT 'completed',  -- 'scheduled', 'completed', 'missed', 'no_answer'

    -- External references
    external_id     TEXT,             -- Twilio SID, email message-id, etc.
    external_thread_id TEXT,          -- email thread ID for grouping

    -- Participants
    from_address    TEXT,             -- phone number or email
    to_address      TEXT,             -- phone number or email

    -- Attachments (references to documents table)
    attachment_ids  UUID[],

    -- Metadata
    metadata        JSONB DEFAULT '{}',
    -- Examples: {"sentiment": "positive", "follow_up_needed": true}
    -- Or for emails: {"cc": ["agent@example.com"], "bcc": []}

    -- Lifecycle
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_comms_user_date ON communications (user_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_comms_contact ON communications (contact_id, created_at DESC) WHERE contact_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_comms_deal ON communications (deal_id, created_at DESC) WHERE deal_id IS NOT NULL;
CREATE INDEX idx_comms_channel ON communications (channel, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_comms_external ON communications (external_id) WHERE external_id IS NOT NULL;
CREATE INDEX idx_comms_thread ON communications (external_thread_id) WHERE external_thread_id IS NOT NULL;

-- Full-text search on communication content
ALTER TABLE communications ADD COLUMN search_vector tsvector;
CREATE INDEX idx_comms_search ON communications USING GIN (search_vector);
```

**Rationale:**
- **Single table for all communication channels**: Phone calls, emails, texts, and in-person meetings share the same core fields (who, when, linked entities, notes). Channel-specific fields (duration for calls, subject for emails) are nullable.
- **`direction`**: Critical for analytics. "How many outbound calls did I make this week?" is a common CRM metric.
- **`external_id` and `external_thread_id`**: When integrating with Twilio (calls/SMS) or email providers, these fields prevent duplicate creation and enable threading.
- **`attachment_ids UUID[]`**: Simple array of document references. A communication might have email attachments stored in S3.
- **Partitioning-ready**: Communications will be one of the highest-volume tables. The `(user_id, created_at DESC)` index pattern is designed for partitioning by `created_at` when the table grows large.

### 7.9 documents

```sql
-- Enhancement of the existing documents table
CREATE TABLE documents (
    -- Identity
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    team_id         UUID REFERENCES teams(id),

    -- Linked entities (all nullable)
    deal_id         UUID REFERENCES deals(id),
    property_id     UUID REFERENCES properties(id),
    lease_id        UUID REFERENCES leases(id),
    contact_id      UUID REFERENCES contacts(id),
    rehab_project_id UUID REFERENCES rehab_projects(id),

    -- File metadata
    original_filename TEXT NOT NULL,
    file_type       TEXT NOT NULL,        -- 'pdf', 'jpg', 'png', 'docx', 'xlsx'
    mime_type       TEXT,
    file_size_bytes INTEGER NOT NULL,

    -- S3 storage
    s3_bucket       TEXT NOT NULL,
    s3_key          TEXT NOT NULL,
    s3_region       TEXT NOT NULL DEFAULT 'us-east-1',

    -- Classification
    document_type   TEXT,
    -- 'contract', 'addendum', 'inspection_report', 'appraisal', 'title_report',
    -- 'insurance', 'tax_return', 'bank_statement', 'photo', 'floor_plan',
    -- 'scope_of_work', 'invoice', 'receipt', 'lease', 'other'
    status          TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'processing', 'analyzed', 'error'

    -- AI-extracted content (from Claude)
    ai_summary      TEXT,
    parties         JSONB,            -- extracted party names and roles
    risk_flags      JSONB,            -- identified risk items
    extracted_numbers JSONB,          -- financial figures, dates, etc.
    key_terms       JSONB,            -- important contract terms

    -- Processing
    processing_error TEXT,
    processed_at    TIMESTAMPTZ,

    -- Versioning
    parent_document_id UUID REFERENCES documents(id),
    version         INTEGER NOT NULL DEFAULT 1,
    is_latest       BOOLEAN NOT NULL DEFAULT true,

    -- Lifecycle
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_docs_user ON documents (user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_docs_deal ON documents (deal_id) WHERE deal_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_docs_property ON documents (property_id) WHERE property_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_docs_type ON documents (document_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_docs_status ON documents (status) WHERE status IN ('pending', 'processing');
CREATE INDEX idx_docs_latest ON documents (user_id, original_filename)
    WHERE is_latest = true AND deleted_at IS NULL;
CREATE INDEX idx_docs_s3 ON documents (s3_bucket, s3_key);
```

**Rationale:**
- **Multiple entity links**: A document can belong to a deal, property, lease, contact, or rehab project. Common pattern: a lease PDF links to both the lease and the property.
- **Versioning via `parent_document_id` chain**: When a contract is revised, the new version references the previous one. `is_latest` flag enables quick "get the current version" queries.
- **AI-extracted content as JSONB columns**: Already in Parcel's current schema. These are read-as-a-whole (displayed on the document detail page) and rarely queried independently, making JSONB appropriate.
- **`s3_region`**: Future-proofing for multi-region deployment.
- **Soft delete**: Metadata is soft-deleted. The S3 object should be retained for a configurable period (90 days default) before permanent deletion, for legal hold scenarios.

### 7.10 pipeline_events

```sql
CREATE TABLE pipeline_events (
    -- Identity
    id              UUID DEFAULT gen_random_uuid(),
    deal_id         UUID NOT NULL,  -- No FK to avoid partition key complications
    user_id         UUID NOT NULL,

    -- Event details
    event_type      TEXT NOT NULL,
    -- 'stage_change', 'note_added', 'contact_linked', 'offer_sent', 'offer_received',
    -- 'inspection_scheduled', 'financing_approved', 'closing_scheduled', 'closed', 'deal_killed'
    from_stage      TEXT,            -- NULL for initial placement
    to_stage        TEXT,            -- NULL for non-stage events

    -- Payload (event-specific data)
    payload         JSONB NOT NULL DEFAULT '{}',
    -- Examples:
    -- stage_change: {"reason": "Seller accepted counter-offer", "counter_amount": 185000}
    -- offer_sent: {"amount": 175000, "expiry": "2026-04-15", "contingencies": ["inspection", "financing"]}
    -- inspection_scheduled: {"date": "2026-04-10", "inspector_contact_id": "uuid-here"}

    -- Immutable timestamp
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create initial partitions
CREATE TABLE pipeline_events_2026_q2 PARTITION OF pipeline_events
    FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');
CREATE TABLE pipeline_events_2026_q3 PARTITION OF pipeline_events
    FOR VALUES FROM ('2026-07-01') TO ('2026-10-01');
CREATE TABLE pipeline_events_2026_q4 PARTITION OF pipeline_events
    FOR VALUES FROM ('2026-10-01') TO ('2027-01-01');

-- Indexes
CREATE INDEX idx_pipeline_events_deal ON pipeline_events (deal_id, created_at DESC);
CREATE INDEX idx_pipeline_events_user ON pipeline_events (user_id, created_at DESC);
CREATE INDEX idx_pipeline_events_type ON pipeline_events (event_type, created_at DESC);
```

**Rationale:**
- **Append-only**: No `updated_at`, no `deleted_at`. Events are immutable facts. If an event was recorded in error, append a correction event -- never modify or delete.
- **No FK on `deal_id`**: In a partitioned table, all FK references and partition key must be included in the primary key. Dropping the FK simplifies partition management. Referential integrity is enforced by the application layer.
- **Partitioned by `created_at`**: This table will grow fastest. Monthly or quarterly partitions enable cheap archival of old events and fast queries filtered by date range.
- **`payload` JSONB**: Event-specific data varies dramatically. An offer event has amount and contingencies; an inspection event has a date and inspector. JSONB is the correct choice because you never query across event types.
- **Dual purpose**: Powers both the deal timeline view ("show me everything that happened on this deal") and analytics ("average time from Lead to Under Contract across all deals").

---

## 8. Migration Strategy from Current State

Parcel's current schema has 10 tables. The recommended schema above has 20+ tables. Migration should be incremental, aligned with feature development.

### Phase 1: Foundation (before CRM features ship)

1. Add `properties` table -- currently, property data lives inside `deals`. Extract it so properties can exist independently of deals.
2. Add `contacts` table with base fields and `contact_roles`.
3. Add `deal_contacts` junction table.
4. Add the audit schema and audit trigger to `deals`, `portfolio_entries`, and `transactions` (when added).
5. Deploy PgBouncer on Railway.

### Phase 2: Financial (with billing/portfolio expansion)

6. Add `transactions` table.
7. Add `leases` table.
8. Enable RLS on all tenant-scoped tables.
9. Deploy Redis for caching.

### Phase 3: Operations (with CRM/pipeline features)

10. Add `pipeline_events` table (event sourcing).
11. Add `communications` table.
12. Add `tasks` table.
13. Add `rehab_projects` and `rehab_line_items` tables.

### Phase 4: Scale (when usage warrants)

14. Add PostGIS and geospatial columns to properties.
15. Add full-text search vectors and triggers.
16. Deploy Meilisearch if search performance demands it.
17. Add partitioning to pipeline_events, communications, and audit tables.
18. Add market_snapshots and property_valuations for market data features.

### Migration tooling

Parcel already uses Alembic. Each phase above should be a series of Alembic migrations. Key principles:

- **Never break the running application**: Use `ADD COLUMN ... DEFAULT` (PostgreSQL fills the default in-place for new columns). Avoid `ALTER COLUMN ... NOT NULL` on large tables without first backfilling.
- **Create indexes concurrently**: `CREATE INDEX CONCURRENTLY` avoids locking the table during index creation. This is critical for production migrations on tables with traffic.
- **Test migrations on a Railway staging database** before running on production.

---

## 9. Railway-Specific Deployment Patterns

### 9.1 PostgreSQL on Railway

- **Connection limit**: Railway's default PostgreSQL instances support ~100 connections. PgBouncer is mandatory once you have multiple service replicas.
- **Extensions**: Check `SELECT * FROM pg_available_extensions;` on your Railway Postgres instance. PostGIS, pg_trgm, and uuid-ossp are commonly available. pg_partman and pg_search availability should be verified.
- **Backups**: Railway provides automatic daily backups. For financial compliance, supplement with pg_dump exports to S3 on a more frequent schedule.
- **Memory**: Railway Postgres runs on shared infrastructure. Monitor memory usage and consider upgrading to a Pro plan database for production workloads.

### 9.2 Service Architecture

```
[Client]
    |
[Railway: FastAPI App (2+ replicas)]
    |
[Railway: PgBouncer (6432)]  ----  [Railway: Redis (6379)]
    |
[Railway: PostgreSQL (5432)]
    |
[Railway: Meilisearch (7700)]  (Phase 2)
```

### 9.3 Environment Variables

```bash
# PostgreSQL (via PgBouncer)
DATABASE_URL=postgresql://user:pass@pgbouncer.railway.internal:6432/railway

# Redis
REDIS_URL=redis://default:pass@redis.railway.internal:6379

# Meilisearch (when added)
MEILISEARCH_URL=http://meilisearch.railway.internal:7700
MEILISEARCH_API_KEY=master-key-from-env

# S3 (for document storage)
AWS_S3_BUCKET=parcel-documents
AWS_S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
```

### 9.4 Cost Estimation

| Service | Monthly cost estimate | Notes |
|---------|----------------------|-------|
| PostgreSQL | $10-30 | Scales with data volume |
| PgBouncer | $3-5 | Minimal CPU/memory |
| Redis | $5-15 | Depends on cache size |
| Meilisearch | $10-20 | When deployed (Phase 2) |
| FastAPI (2 replicas) | $15-30 | Scales with traffic |
| **Total infrastructure** | **$43-100** | **For 1K-5K users** |

---

## 10. Sources

### JSONB vs Normalized Tables
- [When To Avoid JSONB In A PostgreSQL Schema -- Heap.io](https://www.heap.io/blog/when-to-avoid-jsonb-in-a-postgresql-schema)
- [PostgreSQL JSONB -- Powerful Storage for Semi-Structured Data](https://www.architecture-weekly.com/p/postgresql-jsonb-powerful-storage)
- [PostgreSQL as a JSON database -- AWS](https://aws.amazon.com/blogs/database/postgresql-as-a-json-database-advanced-patterns-and-best-practices/)

### Partitioning
- [PostgreSQL Documentation: Table Partitioning](https://www.postgresql.org/docs/current/ddl-partitioning.html)
- [PostgreSQL Partitioning -- 4 Strategies for Managing Large Tables](https://dev.to/finny_collins/postgresql-partitioning-4-strategies-for-managing-large-tables-416d)
- [Determining the Optimal Postgres Partition Size -- Tiger Data](https://www.tigerdata.com/learn/determining-optimal-postgres-partition-size)
- [Database Partitioning Best Practices -- Prefect](https://www.prefect.io/blog/database-partitioning-prod-postgres-without-downtime)

### PostGIS and Geospatial
- [Geospatial Search in Postgres -- Neon Guides](https://neon.com/guides/geospatial-search)
- [PostGIS Radius Search FAQ](https://postgis.net/documentation/faq/radius-search/)
- [PostGIS Spatial Queries Documentation](https://postgis.net/docs/using_postgis_query.html)
- [PostGIS -- A Powerful Geospatial Extension -- Red Hat](https://developers.redhat.com/articles/2025/10/02/postgis-powerful-geospatial-extension-postgresql)
- [3-Mile Radius vs Drive-Time Polygon -- GrowthFactor](https://www.growthfactor.ai/resources/blog/radius-vs-drive-time-trade-area)

### Full-Text Search
- [Comparing Native Postgres, ElasticSearch, and pg_search -- Neon](https://neon.com/blog/postgres-full-text-search-vs-elasticsearch)
- [PostgreSQL Full-Text Search: Alternative to Elasticsearch](https://iniakunhuda.medium.com/postgresql-full-text-search-a-powerful-alternative-to-elasticsearch-for-small-to-medium-d9524e001fe0)
- [pg_search: Elastic-Quality Full Text Search Inside Postgres -- ParadeDB](https://www.paradedb.com/blog/introducing-search)

### Row-Level Security
- [Multi-tenant data isolation with PostgreSQL RLS -- AWS](https://aws.amazon.com/blogs/database/multi-tenant-data-isolation-with-postgresql-row-level-security/)
- [Shipping multi-tenant SaaS using Postgres RLS -- Nile](https://www.thenile.dev/blog/multi-tenant-rls)
- [Row-Level Security for Tenants -- Crunchy Data](https://www.crunchydata.com/blog/row-level-security-for-tenants-in-postgres)
- [Postgres RLS Implementation Guide -- Permit.io](https://www.permit.io/blog/postgres-rls-implementation-guide)

### Connection Pooling
- [Deploy Postgres + PgBouncer -- Railway](https://railway.com/deploy/postgres-pgbouncer)
- [Database Connection Pooling -- Railway Blog](https://blog.railway.com/p/database-connection-pooling)
- [PgBouncer Configuration Reference](https://www.pgbouncer.org/config.html)
- [Complete Guide to Fixing PostgreSQL Performance with PgBouncer](https://opstree.com/blog/2025/10/07/postgresql-performance-with-pgbouncer/)

### Multi-Tenant Architecture
- [Designing Your Postgres Database for Multi-tenancy -- Crunchy Data](https://www.crunchydata.com/blog/designing-your-postgres-database-for-multi-tenancy)
- [Multi-Tenant Database Architecture Patterns Explained -- Bytebase](https://www.bytebase.com/blog/multi-tenant-database-architecture-patterns-explained/)
- [Multitenancy with FastAPI, SQLAlchemy and PostgreSQL -- MergeBoard](https://mergeboard.com/blog/6-multitenancy-fastapi-sqlalchemy-postgresql/)
- [Multi-tenancy and Database-per-User in Postgres -- Neon](https://neon.com/blog/multi-tenancy-and-database-per-user-design-in-postgres)

### TimescaleDB and Time-Series
- [TimescaleDB vs PostgreSQL for time-series -- Timescale](https://www.timescale.com/blog/timescaledb-vs-6a696248104e/)
- [PostgreSQL + TimescaleDB: 1000x Faster Queries -- Tiger Data](https://www.tigerdata.com/blog/postgresql-timescaledb-1000x-faster-queries-90-data-compression-and-much-more)

### Caching
- [Essential Redis Caching Strategies for SaaS in 2025](https://dev.to/ash_dubai/boosting-speed-essential-redis-caching-strategies-for-saas-in-2025-50pl)
- [Caching Patterns -- AWS Database Caching Strategies Using Redis](https://docs.aws.amazon.com/whitepapers/latest/database-caching-strategies-using-redis/caching-patterns.html)
- [Real-Time Cache Invalidation Using PostgreSQL CDC](https://medium.com/@sampreethaddixith/real-time-cache-invalidation-using-postgresql-cdc-triggers-notify-240eaf9e148b)
- [Redis on Railway](https://docs.railway.com/databases/redis)

### Search Architecture
- [Elasticsearch Review 2025 -- Meilisearch](https://www.meilisearch.com/blog/elasticsearch-review)
- [Deploy Meilisearch on Railway](https://railway.com/deploy/meilisearch)
- [Faceted Search -- Meilisearch](https://www.meilisearch.com/solutions/faceted-search)

### Event Sourcing and Audit
- [PostgreSQL Event Sourcing -- GitHub Reference Implementation](https://github.com/eugene-khyst/postgresql-event-sourcing)
- [Implementing Event Sourcing Using a Relational Database -- SoftwareMill](https://softwaremill.com/implementing-event-sourcing-using-a-relational-database/)
- [Audit Trigger -- PostgreSQL Wiki](https://wiki.postgresql.org/wiki/Audit_trigger)
- [Tamper-evident Audit Trails in PostgreSQL with Hash Chaining](https://appmaster.io/blog/tamper-evident-audit-trails-postgresql)

### Soft Deletes
- [How to Implement Soft Deletes in PostgreSQL](https://oneuptime.com/blog/post/2026-01-21-postgresql-soft-deletes/view)
- [Soft Delete Strategies -- DEV Community](https://dev.to/oddcoder/postgresql-soft-delete-strategies-balancing-data-retention-50lo)

### Polymorphic Associations
- [Modeling Polymorphic Relations in Postgres -- Bruno Scheufler](https://brunoscheufler.com/blog/2022-05-22-modeling-polymorphic-relations-in-postgres)
- [Modeling Polymorphic Associations -- Hashrocket](https://hashrocket.com/blog/posts/modeling-polymorphic-associations-in-a-relational-database)

### Indexing
- [PostgreSQL Index Types Documentation](https://www.postgresql.org/docs/current/indexes-types.html)
- [Understanding Postgres GIN Indexes -- pganalyze](https://pganalyze.com/blog/gin-index)
- [Spatial Search: Geometry + GiST vs Geohash + B-tree -- Alibaba Cloud](https://www.alibabacloud.com/blog/spatial-search-geometry-and-gist-combination-outperforms-geohash-and-b-tree_597174)

### CRM and RE Schema
- [CRM Database Schema Example -- DragonflyDB](https://www.dragonflydb.io/databases/schema/crm)
- [A Real Estate Agency Data Model -- Redgate](https://www.red-gate.com/blog/managing-houses-and-properties-a-real-estate-agency-data-model)
- [Real Estate Database Structure](https://databasesample.com/database/real-estate-database)
- [A Data Model for a Leasing Office -- Vertabelo](https://vertabelo.com/blog/a-data-model-for-a-leasing-office/)

### SQLAlchemy + FastAPI Multi-Tenancy
- [Multi-tenancy in FastAPI, SQLAlchemy and PostgreSQL -- GitHub Discussion](https://github.com/fastapi/fastapi/discussions/6056)
- [fastapi-rowsecurity -- GitHub](https://github.com/JWDobken/fastapi-rowsecurity)
- [Multi-Tenant Architecture with FastAPI -- Medium](https://medium.com/@koushiksathish3/multi-tenant-architecture-with-fastapi-design-patterns-and-pitfalls-aa3f9e75bf8c)

### Railway Platform
- [Railway Pricing](https://railway.com/pricing)
- [Railway Redis Documentation](https://docs.railway.com/databases/redis)
- [Deploy Meilisearch on Railway](https://railway.com/deploy/meilisearch)
