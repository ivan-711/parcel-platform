# Parcel Platform -- Database Schema Audit

Generated: 2026-04-12
Source: backend/models/ (35 files), backend/alembic/versions/ (31 migrations)

---

## Database Configuration

**File:** `backend/database.py`

| Setting | Value |
|---|---|
| Engine | PostgreSQL (via SQLAlchemy) |
| Pool size | 20 |
| Max overflow | 40 |
| Pool pre-ping | Enabled |
| Pool recycle | 3600s (1 hour) |
| Session autocommit | False |
| Session autoflush | False |
| RLS | Application-level via ORM event listener (NOT database-level PostgreSQL RLS) |

**PostgreSQL Extensions** (migration `e1a0b2c3d4e5`):
- `vector` (pgvector -- vector similarity search)
- `pg_trgm` (trigram fuzzy text search)
- `postgis` (optional, wrapped in savepoint -- may not be available on Railway)

---

## Base Mixin

**File:** `backend/models/base.py` -- `TimestampMixin`

All models inherit this mixin, which provides:

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` | Primary key, default `uuid4` |
| `created_at` | `DateTime` | Default `utcnow`, not null |
| `updated_at` | `DateTime` | Default `utcnow`, onupdate `utcnow`, not null |

---

## Complete Table Inventory

### 1. `users`

**Model:** `User` | **File:** `models/users.py`
**RLS scope:** `user_id` models (self-referencing via `id`)

| Column | Type | Constraints | Index |
|---|---|---|---|
| `id` | UUID | PK | PK |
| `created_at` | DateTime | NOT NULL | -- |
| `updated_at` | DateTime | NOT NULL | -- |
| `name` | String | NOT NULL | -- |
| `email` | String | NOT NULL, UNIQUE | Yes (unique) |
| `password_hash` | String | NULLABLE | -- |
| `role` | Enum(`wholesaler`, `investor`, `agent`) | NOT NULL, default `investor` | -- |
| `clerk_user_id` | String | UNIQUE, NULLABLE | Yes (unique) |
| `team_id` | UUID | FK -> `teams.id`, NULLABLE | -- |
| `email_notifications` | Boolean | NOT NULL, default `true` | -- |
| `stripe_customer_id` | String | UNIQUE, NULLABLE | Yes (unique) |
| `plan_tier` | Enum(`free`, `plus`, `pro`, `business`) | NOT NULL, default `free` | -- |
| `trial_ends_at` | DateTime | NULLABLE | -- |
| `onboarding_persona` | String | NULLABLE | -- |
| `onboarding_completed_at` | DateTime | NULLABLE | -- |
| `brand_kit` | JSONB | NULLABLE | -- |

**Relationships:**
- `deals` -> Deal (one-to-many via `Deal.user_id`)
- `team_memberships` -> TeamMember (one-to-many)
- `pipeline_entries` -> PipelineEntry (one-to-many)
- `documents` -> Document (one-to-many)
- `chat_messages` -> ChatMessage (one-to-many)
- `portfolio_entries` -> PortfolioEntry (one-to-many)
- `subscriptions` -> Subscription (one-to-many)
- `usage_records` -> UsageRecord (one-to-many)

---

### 2. `teams`

**Model:** `Team` | **File:** `models/teams.py`

| Column | Type | Constraints | Index |
|---|---|---|---|
| `id` | UUID | PK | PK |
| `created_at` | DateTime | NOT NULL | -- |
| `updated_at` | DateTime | NOT NULL | -- |
| `name` | String | NOT NULL | -- |
| `created_by` | UUID | FK -> `users.id`, NOT NULL | -- |

**Relationships:**
- `members` -> TeamMember (one-to-many)
- `deals` -> Deal (one-to-many via `Deal.team_id`)

---

### 3. `team_members`

**Model:** `TeamMember` | **File:** `models/team_members.py`

| Column | Type | Constraints | Index |
|---|---|---|---|
| `id` | UUID | PK | PK |
| `created_at` | DateTime | NOT NULL | -- |
| `updated_at` | DateTime | NOT NULL | -- |
| `team_id` | UUID | FK -> `teams.id`, NOT NULL | -- |
| `user_id` | UUID | FK -> `users.id`, NOT NULL | -- |
| `role` | Enum(`owner`, `analyst`, `viewer`) | NOT NULL, default `viewer` | -- |
| `joined_at` | DateTime | NOT NULL | -- |

**Relationships:**
- `team` -> Team (many-to-one)
- `user` -> User (many-to-one)

---

### 4. `deals`

**Model:** `Deal` | **File:** `models/deals.py`
**RLS scope:** `user_id`

| Column | Type | Constraints | Index |
|---|---|---|---|
| `id` | UUID | PK | PK |
| `created_at` | DateTime | NOT NULL | -- |
| `updated_at` | DateTime | NOT NULL | -- |
| `user_id` | UUID | FK -> `users.id`, NOT NULL | Yes |
| `team_id` | UUID | FK -> `teams.id`, NULLABLE | -- |
| `address` | String | NOT NULL | -- |
| `zip_code` | String | NOT NULL | -- |
| `property_type` | Enum(`single_family`, `duplex`, `triplex`, `quad`, `commercial`) | NOT NULL | -- |
| `strategy` | Enum(`wholesale`, `creative_finance`, `brrrr`, `buy_and_hold`, `flip`) | NOT NULL | -- |
| `inputs` | JSONB | NOT NULL, default `{}` | -- |
| `outputs` | JSONB | NOT NULL, default `{}` | -- |
| `risk_score` | Integer | NULLABLE | -- |
| `risk_factors` | JSONB | NULLABLE | -- |
| `status` | Enum(`draft`, `saved`, `shared`) | NOT NULL, default `draft` | -- |
| `deleted_at` | DateTime | NULLABLE | -- |
| `property_id` | UUID | FK -> `properties.id`, NULLABLE | -- |
| `deal_type` | String | NULLABLE | -- |

**Note:** `inputs` and `outputs` columns are marked as DEPRECATED in the codebase -- slated for migration to `AnalysisScenario`.

**Relationships:**
- `user` -> User (many-to-one)
- `team` -> Team (many-to-one)
- `property` -> Property (many-to-one)
- `pipeline_entries` -> PipelineEntry (one-to-many)
- `portfolio_entries` -> PortfolioEntry (one-to-many)
- `financing_instruments` -> FinancingInstrument (one-to-many)

---

### 5. `properties`

**Model:** `Property` | **File:** `models/properties.py`
**RLS scope:** `created_by`

| Column | Type | Constraints | Index |
|---|---|---|---|
| `id` | UUID | PK | PK |
| `created_at` | DateTime | NOT NULL | -- |
| `updated_at` | DateTime | NOT NULL | -- |
| `created_by` | UUID | NOT NULL | Yes |
| `team_id` | UUID | NULLABLE | -- |
| `address_line1` | String | NOT NULL | -- |
| `address_line2` | String | NULLABLE | -- |
| `city` | String | NOT NULL | -- |
| `state` | String(2) | NOT NULL | -- |
| `zip_code` | String(10) | NOT NULL | -- |
| `county` | String | NULLABLE | -- |
| `latitude` | Numeric(10,7) | NULLABLE | -- |
| `longitude` | Numeric(10,7) | NULLABLE | -- |
| `place_id` | String | NULLABLE | -- |
| `property_type` | String | NULLABLE | -- |
| `bedrooms` | Integer | NULLABLE | -- |
| `bathrooms` | Numeric(3,1) | NULLABLE | -- |
| `sqft` | Integer | NULLABLE | -- |
| `lot_sqft` | Integer | NULLABLE | -- |
| `year_built` | Integer | NULLABLE | -- |
| `status` | String | NOT NULL, default `prospect` | -- |
| `data_sources` | JSONB | NULLABLE | -- |
| `is_sample` | Boolean | NOT NULL, default `false` | -- |
| `is_deleted` | Boolean | NOT NULL, default `false` | -- |

**Relationships:**
- `analysis_scenarios` -> AnalysisScenario (one-to-many)
- `deals` -> Deal (one-to-many)
- `financing_instruments` -> FinancingInstrument (one-to-many)
- `rehab_projects` -> RehabProject (one-to-many)

---

### 6. `analysis_scenarios`

**Model:** `AnalysisScenario` | **File:** `models/analysis_scenarios.py`
**RLS scope:** `created_by`

| Column | Type | Constraints | Index |
|---|---|---|---|
| `id` | UUID | PK | PK |
| `created_at` | DateTime | NOT NULL | -- |
| `updated_at` | DateTime | NOT NULL | -- |
| `property_id` | UUID | FK -> `properties.id`, NOT NULL | Yes |
| `deal_id` | UUID | FK -> `deals.id`, NULLABLE | -- |
| `team_id` | UUID | NULLABLE | -- |
| `created_by` | UUID | NOT NULL | Yes |
| `strategy` | String | NOT NULL | -- |
| `purchase_price` | Numeric(12,2) | NULLABLE | -- |
| `after_repair_value` | Numeric(12,2) | NULLABLE | -- |
| `repair_cost` | Numeric(12,2) | NULLABLE | -- |
| `monthly_rent` | Numeric(10,2) | NULLABLE | -- |
| `down_payment_pct` | Numeric(5,2) | NULLABLE | -- |
| `interest_rate` | Numeric(5,3) | NULLABLE | -- |
| `loan_term_years` | Integer | NULLABLE | -- |
| `inputs_extended` | JSONB | NULLABLE | -- |
| `outputs` | JSONB | NOT NULL, default `{}` | -- |
| `risk_score` | Numeric(4,2) | NULLABLE | -- |
| `risk_flags` | JSONB | NULLABLE | -- |
| `ai_narrative` | Text | NULLABLE | -- |
| `ai_narrative_generated_at` | DateTime | NULLABLE | -- |
| `source_confidence` | JSONB | NULLABLE | -- |
| `is_snapshot` | Boolean | NOT NULL, default `true` | -- |
| `parent_scenario_id` | UUID | FK -> `analysis_scenarios.id`, NULLABLE | -- |
| `is_sample` | Boolean | NOT NULL, default `false` | -- |
| `is_deleted` | Boolean | NOT NULL, default `false` | -- |

**Relationships:**
- `property` -> Property (many-to-one)

---

### 7. `documents`

**Model:** `Document` | **File:** `models/documents.py`
**RLS scope:** `user_id`

| Column | Type | Constraints | Index |
|---|---|---|---|
| `id` | UUID | PK | PK |
| `created_at` | DateTime | NOT NULL | -- |
| `updated_at` | DateTime | NOT NULL | -- |
| `user_id` | UUID | FK -> `users.id`, NOT NULL | Yes |
| `property_id` | UUID | FK -> `properties.id`, NULLABLE | Yes |
| `original_filename` | String(255) | NOT NULL | -- |
| `file_type` | String(10) | NOT NULL | -- |
| `file_size_bytes` | Integer | NOT NULL | -- |
| `s3_key` | String(500) | NOT NULL | -- |
| `s3_bucket` | String(100) | NOT NULL | -- |
| `status` | String(20) | NOT NULL, default `pending` | -- |
| `embedding_status` | String(20) | NOT NULL, default `pending` | -- |
| `embedding_meta` | JSONB | NULLABLE | -- |
| `document_type` | String(50) | NULLABLE | -- |
| `parties` | JSONB | NULLABLE | -- |
| `ai_summary` | Text | NULLABLE | -- |
| `risk_flags` | JSONB | NULLABLE | -- |
| `extracted_numbers` | JSONB | NULLABLE | -- |
| `key_terms` | JSONB | NULLABLE | -- |
| `processing_error` | Text | NULLABLE | -- |

**Relationships:**
- `user` -> User (many-to-one)
- `chunks` -> DocumentChunk (one-to-many, cascade `all, delete-orphan`)

---

### 8. `document_chunks`

**Model:** `DocumentChunk` | **File:** `models/document_chunks.py`

| Column | Type | Constraints | Index |
|---|---|---|---|
| `id` | UUID | PK | PK |
| `created_at` | DateTime | NOT NULL | -- |
| `updated_at` | DateTime | NOT NULL | -- |
| `document_id` | UUID | FK -> `documents.id` (ON DELETE CASCADE), NOT NULL | Yes |
| `chunk_index` | Integer | NOT NULL | -- |
| `content` | Text | NOT NULL | GIN (trigram) |
| `contextualized_content` | Text | NULLABLE | -- |
| `embedding` | Vector(1536) | NULLABLE | HNSW (cosine) |
| `token_count` | Integer | NULLABLE | -- |
| `metadata` (mapped as `chunk_metadata`) | JSONB | NULLABLE | -- |

**Constraints:**
- Unique: `(document_id, chunk_index)` -- `uq_document_chunk_index`

**Indexes:**
- `ix_document_chunks_embedding_hnsw` -- HNSW index on `embedding` (m=16, ef_construction=64, vector_cosine_ops)
- `ix_document_chunks_content_trgm` -- GIN trigram index on `content`

**Relationships:**
- `document` -> Document (many-to-one)

---

### 9. `pipeline_entries`

**Model:** `PipelineEntry` | **File:** `models/pipeline_entries.py`
**RLS scope:** `user_id`

| Column | Type | Constraints | Index |
|---|---|---|---|
| `id` | UUID | PK | PK |
| `created_at` | DateTime | NOT NULL | -- |
| `updated_at` | DateTime | NOT NULL | -- |
| `deal_id` | UUID | FK -> `deals.id`, NOT NULL | Yes |
| `user_id` | UUID | FK -> `users.id`, NOT NULL | Yes |
| `team_id` | UUID | FK -> `teams.id`, NULLABLE | -- |
| `stage` | Enum(`lead`, `analyzing`, `offer_sent`, `under_contract`, `due_diligence`, `closed`, `dead`) | NOT NULL | -- |
| `entered_stage_at` | DateTime | NOT NULL | -- |
| `notes` | Text | NULLABLE | -- |

**Relationships:**
- `deal` -> Deal (many-to-one)
- `user` -> User (many-to-one)

---

### 10. `portfolio_entries`

**Model:** `PortfolioEntry` | **File:** `models/portfolio_entries.py`
**RLS scope:** `user_id`

| Column | Type | Constraints | Index |
|---|---|---|---|
| `id` | UUID | PK | PK |
| `created_at` | DateTime | NOT NULL | -- |
| `updated_at` | DateTime | NOT NULL | -- |
| `deal_id` | UUID | FK -> `deals.id`, NOT NULL | Yes |
| `user_id` | UUID | FK -> `users.id`, NOT NULL | Yes |
| `team_id` | UUID | FK -> `teams.id`, NULLABLE | -- |
| `closed_date` | Date | NOT NULL | -- |
| `closed_price` | Numeric(12,2) | NOT NULL | -- |
| `profit` | Numeric(12,2) | NOT NULL | -- |
| `monthly_cash_flow` | Numeric(12,2) | NULLABLE | -- |
| `notes` | Text | NULLABLE | -- |

**Relationships:**
- `deal` -> Deal (many-to-one)
- `user` -> User (many-to-one)

---

### 11. `contacts`

**Model:** `Contact` | **File:** `models/contacts.py`
**RLS scope:** `created_by`

| Column | Type | Constraints | Index |
|---|---|---|---|
| `id` | UUID | PK | PK |
| `created_at` | DateTime | NOT NULL | -- |
| `updated_at` | DateTime | NOT NULL | -- |
| `team_id` | UUID | NULLABLE | -- |
| `created_by` | UUID | NOT NULL | Yes |
| `first_name` | String | NOT NULL | -- |
| `last_name` | String | NULLABLE | -- |
| `email` | String | NULLABLE | -- |
| `phone` | String | NULLABLE | -- |
| `company` | String | NULLABLE | -- |
| `contact_type` | String | NULLABLE | -- |
| `notes` | Text | NULLABLE | -- |
| `tags` | JSONB | NULLABLE | -- |
| `is_deleted` | Boolean | NOT NULL, default `false` | -- |
| `opted_out_sms` | Boolean | NOT NULL, default `false` | -- |

**Relationships:**
- `buy_boxes` -> BuyBox (one-to-many, cascade `all, delete-orphan`)

---

### 12. `deal_contacts`

**Model:** `DealContact` | **File:** `models/deal_contacts.py`
**Junction table:** Deal <-> Contact (many-to-many)

| Column | Type | Constraints | Index |
|---|---|---|---|
| `id` | UUID | PK | PK |
| `created_at` | DateTime | NOT NULL | -- |
| `updated_at` | DateTime | NOT NULL | -- |
| `deal_id` | UUID | FK -> `deals.id`, NOT NULL | Yes |
| `contact_id` | UUID | FK -> `contacts.id`, NOT NULL | Yes |
| `role` | String | NULLABLE | -- |

**Constraints:**
- Unique: `(deal_id, contact_id)` -- `uq_deal_contact`

---

### 13. `communications`

**Model:** `Communication` | **File:** `models/communications.py`
**RLS scope:** `created_by`

| Column | Type | Constraints | Index |
|---|---|---|---|
| `id` | UUID | PK | PK |
| `created_at` | DateTime | NOT NULL | -- |
| `updated_at` | DateTime | NOT NULL | -- |
| `team_id` | UUID | NULLABLE | -- |
| `created_by` | UUID | NOT NULL | Yes |
| `channel` | String | NOT NULL | -- |
| `direction` | String | NULLABLE | -- |
| `subject` | String | NULLABLE | -- |
| `body` | Text | NULLABLE | -- |
| `contact_id` | UUID | FK -> `contacts.id`, NULLABLE | -- |
| `deal_id` | UUID | FK -> `deals.id`, NULLABLE | -- |
| `property_id` | UUID | FK -> `properties.id`, NULLABLE | -- |
| `occurred_at` | DateTime | NOT NULL | -- |
| `is_deleted` | Boolean | NOT NULL, default `false` | -- |
| `external_id` | String | NULLABLE | Yes |
| `status` | String | NOT NULL, default `logged` | -- |
| `status_updated_at` | DateTime | NULLABLE | -- |
| `error_message` | String | NULLABLE | -- |
| `cost_cents` | Integer | NULLABLE | -- |
| `metadata` (mapped as `delivery_metadata`) | JSONB | NULLABLE | -- |

---

### 14. `tasks`

**Model:** `Task` | **File:** `models/tasks.py`
**RLS scope:** `created_by`

| Column | Type | Constraints | Index |
|---|---|---|---|
| `id` | UUID | PK | PK |
| `created_at` | DateTime | NOT NULL | -- |
| `updated_at` | DateTime | NOT NULL | -- |
| `team_id` | UUID | NULLABLE | -- |
| `created_by` | UUID | NOT NULL | Yes |
| `assigned_to` | UUID | NULLABLE | -- |
| `title` | String | NOT NULL | -- |
| `description` | Text | NULLABLE | -- |
| `status` | String | NOT NULL, default `open` | -- |
| `priority` | String | NOT NULL, default `normal` | -- |
| `due_date` | DateTime | NULLABLE | -- |
| `completed_at` | DateTime | NULLABLE | -- |
| `property_id` | UUID | FK -> `properties.id`, NULLABLE | -- |
| `deal_id` | UUID | FK -> `deals.id`, NULLABLE | -- |
| `contact_id` | UUID | FK -> `contacts.id`, NULLABLE | -- |
| `is_deleted` | Boolean | NOT NULL, default `false` | -- |

---

### 15. `transactions`

**Model:** `Transaction` | **File:** `models/transactions.py`
**RLS scope:** `created_by`

| Column | Type | Constraints | Index |
|---|---|---|---|
| `id` | UUID | PK | PK |
| `created_at` | DateTime | NOT NULL | -- |
| `updated_at` | DateTime | NOT NULL | -- |
| `team_id` | UUID | NULLABLE | -- |
| `created_by` | UUID | NOT NULL | Yes |
| `property_id` | UUID | FK -> `properties.id`, NOT NULL | -- |
| `deal_id` | UUID | FK -> `deals.id`, NULLABLE | -- |
| `transaction_type` | String | NOT NULL | -- |
| `amount` | Numeric(12,2) | NOT NULL | -- |
| `description` | String | NULLABLE | -- |
| `occurred_at` | Date | NOT NULL | -- |
| `category` | String | NULLABLE | -- |
| `vendor` | String | NULLABLE | -- |
| `is_deleted` | Boolean | NOT NULL, default `false` | -- |

---

### 16. `reports`

**Model:** `Report` | **File:** `models/reports.py`
**RLS scope:** `created_by`

| Column | Type | Constraints | Index |
|---|---|---|---|
| `id` | UUID | PK | PK |
| `created_at` | DateTime | NOT NULL | -- |
| `updated_at` | DateTime | NOT NULL | -- |
| `team_id` | UUID | NULLABLE | -- |
| `created_by` | UUID | NOT NULL | Yes |
| `title` | String | NOT NULL | -- |
| `report_type` | String | NOT NULL | -- |
| `property_id` | UUID | FK -> `properties.id`, NULLABLE | -- |
| `deal_id` | UUID | FK -> `deals.id`, NULLABLE | -- |
| `scenario_id` | UUID | FK -> `analysis_scenarios.id`, NULLABLE | -- |
| `report_data` | JSONB | NULLABLE | -- |
| `audience` | String | NULLABLE | -- |
| `brand_logo_url` | String | NULLABLE | -- |
| `brand_colors` | JSONB | NULLABLE | -- |
| `share_token` | String | UNIQUE, NULLABLE | -- |
| `is_public` | Boolean | NOT NULL, default `false` | -- |
| `view_count` | Integer | NOT NULL, default `0` | -- |
| `last_viewed_at` | DateTime | NULLABLE | -- |
| `pdf_s3_key` | String | NULLABLE | -- |
| `pdf_generated_at` | DateTime | NULLABLE | -- |
| `is_deleted` | Boolean | NOT NULL, default `false` | -- |

---

### 17. `report_views`

**Model:** `ReportView` | **File:** `models/report_views.py`

| Column | Type | Constraints | Index |
|---|---|---|---|
| `id` | UUID | PK | PK |
| `created_at` | DateTime | NOT NULL | -- |
| `updated_at` | DateTime | NOT NULL | -- |
| `report_id` | UUID | FK -> `reports.id`, NOT NULL | Yes |
| `ip_hash` | String | NULLABLE | -- |
| `user_agent` | String | NULLABLE | -- |
| `referrer` | String | NULLABLE | -- |
| `sections_viewed` | JSONB | NULLABLE | -- |
| `time_spent_seconds` | Integer | NULLABLE | -- |

---

### 18. `data_source_events`

**Model:** `DataSourceEvent` | **File:** `models/data_source_events.py`

| Column | Type | Constraints | Index |
|---|---|---|---|
| `id` | UUID | PK | PK |
| `created_at` | DateTime | NOT NULL | -- |
| `updated_at` | DateTime | NOT NULL | -- |
| `property_id` | UUID | FK -> `properties.id`, NOT NULL | Yes |
| `provider` | String | NOT NULL | -- |
| `request_type` | String | NOT NULL | -- |
| `response_status` | String | NOT NULL | -- |
| `response_data` | JSONB | NULLABLE | -- |
| `fields_populated` | JSONB | NULLABLE | -- |
| `confidence_scores` | JSONB | NULLABLE | -- |
| `latency_ms` | Integer | NULLABLE | -- |
| `cost_cents` | Integer | NULLABLE | -- |
| `fetched_at` | DateTime | NOT NULL, server_default `now()` | -- |

---

### 19. `import_jobs`

**Model:** `ImportJob` | **File:** `models/import_jobs.py`
**RLS scope:** `created_by`

| Column | Type | Constraints | Index |
|---|---|---|---|
| `id` | UUID | PK | PK |
| `created_at` | DateTime | NOT NULL | -- |
| `updated_at` | DateTime | NOT NULL | -- |
| `created_by` | UUID | NOT NULL | Yes |
| `source_type` | String | NOT NULL | -- |
| `file_url` | String | NULLABLE | -- |
| `total_rows` | Integer | NULLABLE | -- |
| `processed_rows` | Integer | NOT NULL, default `0` | -- |
| `success_rows` | Integer | NOT NULL, default `0` | -- |
| `error_rows` | Integer | NOT NULL, default `0` | -- |
| `status` | String | NOT NULL, default `pending` | -- |
| `errors` | JSONB | NULLABLE | -- |
| `started_at` | DateTime | NULLABLE | -- |
| `completed_at` | DateTime | NULLABLE | -- |

---

### 20. `chat_messages`

**Model:** `ChatMessage` | **File:** `models/chat_messages.py`
**RLS scope:** `user_id`

| Column | Type | Constraints | Index |
|---|---|---|---|
| `id` | UUID | PK | PK |
| `created_at` | DateTime | NOT NULL | -- |
| `updated_at` | DateTime | NOT NULL | -- |
| `user_id` | UUID | FK -> `users.id`, NOT NULL | Yes |
| `session_id` | String | NOT NULL | Yes |
| `role` | Enum(`user`, `assistant`) | NOT NULL | -- |
| `content` | Text | NOT NULL | -- |
| `context_type` | Enum(`general`, `deal`, `document`) | NULLABLE | -- |
| `context_id` | UUID | NULLABLE | -- |
| `citations` | JSONB | NULLABLE | -- |

---

### 21. `password_reset_tokens`

**Model:** `PasswordResetToken` | **File:** `models/password_reset_tokens.py`

| Column | Type | Constraints | Index |
|---|---|---|---|
| `id` | UUID | PK | PK |
| `created_at` | DateTime | NOT NULL | -- |
| `updated_at` | DateTime | NOT NULL | -- |
| `user_id` | UUID | FK -> `users.id`, NOT NULL | Yes |
| `token_hash` | String | NOT NULL, UNIQUE | Yes (unique) |
| `expires_at` | DateTime | NOT NULL | -- |
| `used_at` | DateTime | NULLABLE | -- |

---

### 22. `subscriptions`

**Model:** `Subscription` | **File:** `models/subscriptions.py`

| Column | Type | Constraints | Index |
|---|---|---|---|
| `id` | UUID | PK | PK |
| `created_at` | DateTime | NOT NULL | -- |
| `updated_at` | DateTime | NOT NULL | -- |
| `user_id` | UUID | FK -> `users.id`, NOT NULL | Yes |
| `stripe_subscription_id` | String | UNIQUE, NULLABLE | Yes (unique) |
| `stripe_customer_id` | String | NULLABLE | Yes |
| `status` | Enum(`trialing`, `active`, `past_due`, `canceled`, `unpaid`, `incomplete`, `paused`) | NOT NULL, server_default `active` | -- |
| `plan_tier` | String(20) | NOT NULL, server_default `free` | -- |
| `current_period_start` | DateTime | NULLABLE | -- |
| `current_period_end` | DateTime | NULLABLE | -- |
| `trial_start` | DateTime | NULLABLE | -- |
| `trial_end` | DateTime | NULLABLE | -- |
| `cancel_at_period_end` | Boolean | NOT NULL, default `false` | -- |
| `canceled_at` | DateTime | NULLABLE | -- |
| `cancel_reason` | String | NULLABLE | -- |
| `ended_at` | DateTime | NULLABLE | -- |

**Relationships:**
- `user` -> User (many-to-one)

---

### 23. `usage_records`

**Model:** `UsageRecord` | **File:** `models/usage_records.py`
**RLS scope:** `user_id`

| Column | Type | Constraints | Index |
|---|---|---|---|
| `id` | UUID | PK | PK |
| `created_at` | DateTime | NOT NULL | -- |
| `updated_at` | DateTime | NOT NULL | -- |
| `user_id` | UUID | FK -> `users.id`, NOT NULL | Yes |
| `metric` | String(50) | NOT NULL | -- |
| `period_start` | DateTime | NOT NULL | -- |
| `count` | Integer | NOT NULL, default `1` | -- |

**Relationships:**
- `user` -> User (many-to-one)

---

### 24. `webhook_events`

**Model:** `WebhookEvent` | **File:** `models/webhook_events.py`

| Column | Type | Constraints | Index |
|---|---|---|---|
| `id` | UUID | PK | PK |
| `created_at` | DateTime | NOT NULL | -- |
| `updated_at` | DateTime | NOT NULL | -- |
| `stripe_event_id` | String | NOT NULL, UNIQUE | Yes (unique) |
| `event_type` | String | NOT NULL | Yes |
| `payload` | JSONB | NOT NULL | -- |
| `processed` | Boolean | NOT NULL, default `false` | -- |
| `processed_at` | DateTime | NULLABLE | -- |
| `error` | Text | NULLABLE | -- |
| `retry_count` | Integer | NOT NULL, default `0` | -- |

---

### 25. `financing_instruments`

**Model:** `FinancingInstrument` | **File:** `models/financing_instruments.py`

| Column | Type | Constraints | Index |
|---|---|---|---|
| `id` | UUID | PK | PK |
| `created_at` | DateTime | NOT NULL | -- |
| `updated_at` | DateTime | NOT NULL | -- |
| `property_id` | UUID | FK -> `properties.id`, NOT NULL | Yes |
| `deal_id` | UUID | FK -> `deals.id`, NULLABLE | Yes |
| `created_by` | UUID | FK -> `users.id`, NOT NULL | -- |
| `team_id` | UUID | FK -> `teams.id`, NULLABLE | -- |
| `name` | String | NOT NULL | -- |
| `instrument_type` | String | NOT NULL | -- |
| `position` | Integer | NOT NULL, default `1` | -- |
| `status` | String | NOT NULL, default `active` | -- |
| `original_balance` | Numeric(14,2) | NULLABLE | -- |
| `current_balance` | Numeric(14,2) | NULLABLE | -- |
| `interest_rate` | Numeric(6,4) | NULLABLE | -- |
| `rate_type` | String | NULLABLE | -- |
| `term_months` | Integer | NULLABLE | -- |
| `amortization_months` | Integer | NULLABLE | -- |
| `monthly_payment` | Numeric(10,2) | NULLABLE | -- |
| `origination_date` | Date | NULLABLE | -- |
| `maturity_date` | Date | NULLABLE | -- |
| `first_payment_date` | Date | NULLABLE | -- |
| `has_balloon` | Boolean | default `false` | -- |
| `balloon_date` | Date | NULLABLE | -- |
| `balloon_amount` | Numeric(14,2) | NULLABLE | -- |
| `is_sub_to` | Boolean | default `false` | -- |
| `original_borrower` | String | NULLABLE | -- |
| `servicer` | String | NULLABLE | -- |
| `loan_number_last4` | String(4) | NULLABLE | -- |
| `due_on_sale_risk` | String | NULLABLE | -- |
| `is_wrap` | Boolean | default `false` | -- |
| `underlying_instrument_id` | UUID | FK -> `financing_instruments.id`, NULLABLE | -- |
| `wrap_rate` | Numeric(6,4) | NULLABLE | -- |
| `wrap_payment` | Numeric(10,2) | NULLABLE | -- |
| `option_consideration` | Numeric(10,2) | NULLABLE | -- |
| `option_expiration` | Date | NULLABLE | -- |
| `monthly_credit` | Numeric(10,2) | NULLABLE | -- |
| `strike_price` | Numeric(14,2) | NULLABLE | -- |
| `down_payment` | Numeric(14,2) | NULLABLE | -- |
| `late_fee_pct` | Numeric(5,2) | NULLABLE | -- |
| `late_fee_grace_days` | Integer | NULLABLE | -- |
| `prepayment_penalty` | Boolean | default `false` | -- |
| `requires_insurance` | Boolean | default `true` | -- |
| `insurance_verified_date` | Date | NULLABLE | -- |
| `escrow_amount` | Numeric(10,2) | NULLABLE | -- |
| `terms_extended` | JSONB | NULLABLE | -- |
| `notes` | Text | NULLABLE | -- |
| `deleted_at` | DateTime | NULLABLE | -- |

**Relationships:**
- `property` -> Property (many-to-one)
- `deal` -> Deal (many-to-one)
- `underlying_instrument` -> FinancingInstrument (self-referential, many-to-one)
- `obligations` -> Obligation (one-to-many, cascade `all, delete-orphan`)
- `payments` -> Payment (one-to-many, cascade `all, delete-orphan`)

---

### 26. `obligations`

**Model:** `Obligation` | **File:** `models/obligations.py`

| Column | Type | Constraints | Index |
|---|---|---|---|
| `id` | UUID | PK | PK |
| `created_at` | DateTime | NOT NULL | -- |
| `updated_at` | DateTime | NOT NULL | -- |
| `instrument_id` | UUID | FK -> `financing_instruments.id`, NOT NULL | Yes |
| `property_id` | UUID | FK -> `properties.id`, NOT NULL | Yes |
| `created_by` | UUID | FK -> `users.id`, NOT NULL | -- |
| `team_id` | UUID | FK -> `teams.id`, NULLABLE | -- |
| `obligation_type` | String | NOT NULL | -- |
| `title` | String | NOT NULL | -- |
| `description` | Text | NULLABLE | -- |
| `amount` | Numeric(14,2) | NULLABLE | -- |
| `amount_type` | String | NULLABLE | -- |
| `due_date` | Date | NULLABLE | -- |
| `recurrence` | String | NULLABLE | -- |
| `recurrence_day` | Integer | NULLABLE | -- |
| `next_due` | Date | NULLABLE | -- |
| `end_date` | Date | NULLABLE | -- |
| `status` | String | NOT NULL, default `active` | -- |
| `alert_days_before` | JSONB | NULLABLE | -- |
| `severity` | String | NOT NULL, default `normal` | -- |
| `deleted_at` | DateTime | NULLABLE | -- |

**Relationships:**
- `instrument` -> FinancingInstrument (many-to-one)
- `property` -> Property (many-to-one)

---

### 27. `payments`

**Model:** `Payment` | **File:** `models/payments.py`

| Column | Type | Constraints | Index |
|---|---|---|---|
| `id` | UUID | PK | PK |
| `created_at` | DateTime | NOT NULL | -- |
| `updated_at` | DateTime | NOT NULL | -- |
| `instrument_id` | UUID | FK -> `financing_instruments.id`, NOT NULL | Yes |
| `obligation_id` | UUID | FK -> `obligations.id`, NULLABLE | Yes |
| `property_id` | UUID | FK -> `properties.id`, NOT NULL | Yes |
| `created_by` | UUID | FK -> `users.id`, NOT NULL | -- |
| `team_id` | UUID | FK -> `teams.id`, NULLABLE | -- |
| `payment_type` | String | NOT NULL | -- |
| `amount` | Numeric(14,2) | NOT NULL | -- |
| `principal_portion` | Numeric(14,2) | NULLABLE | -- |
| `interest_portion` | Numeric(14,2) | NULLABLE | -- |
| `escrow_portion` | Numeric(14,2) | NULLABLE | -- |
| `payment_date` | Date | NOT NULL | -- |
| `due_date` | Date | NULLABLE | -- |
| `is_late` | Boolean | default `false` | -- |
| `late_fee_amount` | Numeric(10,2) | NULLABLE | -- |
| `payment_method` | String | NULLABLE | -- |
| `confirmation_number` | String | NULLABLE | -- |
| `direction` | String | NOT NULL, default `outgoing` | -- |
| `notes` | Text | NULLABLE | -- |
| `deleted_at` | DateTime | NULLABLE | -- |

**Relationships:**
- `instrument` -> FinancingInstrument (many-to-one)
- `obligation` -> Obligation (many-to-one)
- `property` -> Property (many-to-one)

---

### 28. `rehab_projects`

**Model:** `RehabProject` | **File:** `models/rehab_projects.py`

| Column | Type | Constraints | Index |
|---|---|---|---|
| `id` | UUID | PK | PK |
| `created_at` | DateTime | NOT NULL | -- |
| `updated_at` | DateTime | NOT NULL | -- |
| `property_id` | UUID | FK -> `properties.id`, NOT NULL | Yes |
| `deal_id` | UUID | FK -> `deals.id`, NULLABLE | -- |
| `created_by` | UUID | NOT NULL | Yes |
| `team_id` | UUID | NULLABLE | -- |
| `name` | String | NOT NULL | -- |
| `status` | String | NOT NULL, default `planning` | -- |
| `estimated_budget` | Numeric(14,2) | NULLABLE | -- |
| `actual_spent` | Numeric(14,2) | NULLABLE, default `0` | -- |
| `start_date` | Date | NULLABLE | -- |
| `target_completion` | Date | NULLABLE | -- |
| `actual_completion` | Date | NULLABLE | -- |
| `notes` | Text | NULLABLE | -- |
| `deleted_at` | DateTime | NULLABLE | -- |

**Relationships:**
- `property` -> Property (many-to-one)
- `items` -> RehabItem (one-to-many, cascade `all, delete-orphan`)

---

### 29. `rehab_items`

**Model:** `RehabItem` | **File:** `models/rehab_projects.py`

| Column | Type | Constraints | Index |
|---|---|---|---|
| `id` | UUID | PK | PK |
| `created_at` | DateTime | NOT NULL | -- |
| `updated_at` | DateTime | NOT NULL | -- |
| `project_id` | UUID | FK -> `rehab_projects.id`, NOT NULL | Yes |
| `created_by` | UUID | NOT NULL | -- |
| `category` | String | NOT NULL | -- |
| `description` | String | NOT NULL | -- |
| `estimated_cost` | Numeric(10,2) | NULLABLE | -- |
| `actual_cost` | Numeric(10,2) | NULLABLE | -- |
| `status` | String | NOT NULL, default `planned` | -- |
| `contractor_name` | String | NULLABLE | -- |
| `contractor_bid` | Numeric(10,2) | NULLABLE | -- |
| `priority` | String | NULLABLE, default `normal` | -- |
| `notes` | Text | NULLABLE | -- |
| `deleted_at` | DateTime | NULLABLE | -- |

**Relationships:**
- `project` -> RehabProject (many-to-one)

---

### 30. `buy_boxes`

**Model:** `BuyBox` | **File:** `models/buy_boxes.py`

| Column | Type | Constraints | Index |
|---|---|---|---|
| `id` | UUID | PK | PK |
| `created_at` | DateTime | NOT NULL | -- |
| `updated_at` | DateTime | NOT NULL | -- |
| `contact_id` | UUID | FK -> `contacts.id`, NOT NULL | Yes |
| `created_by` | UUID | NOT NULL | Yes |
| `team_id` | UUID | NULLABLE | -- |
| `name` | String | NOT NULL | -- |
| `is_active` | Boolean | NOT NULL, default `true` | -- |
| `target_markets` | JSONB | NULLABLE | -- |
| `max_distance_miles` | Integer | NULLABLE | -- |
| `min_price` | Numeric(14,2) | NULLABLE | -- |
| `max_price` | Numeric(14,2) | NULLABLE | -- |
| `min_arv` | Numeric(14,2) | NULLABLE | -- |
| `max_arv` | Numeric(14,2) | NULLABLE | -- |
| `min_cash_flow` | Numeric(10,2) | NULLABLE | -- |
| `min_cap_rate` | Numeric(6,4) | NULLABLE | -- |
| `min_coc_return` | Numeric(6,4) | NULLABLE | -- |
| `max_repair_cost` | Numeric(14,2) | NULLABLE | -- |
| `property_types` | JSONB | NULLABLE | -- |
| `min_bedrooms` | Integer | NULLABLE | -- |
| `min_bathrooms` | Integer | NULLABLE | -- |
| `min_sqft` | Integer | NULLABLE | -- |
| `max_year_built` | Integer | NULLABLE | -- |
| `min_year_built` | Integer | NULLABLE | -- |
| `strategies` | JSONB | NULLABLE | -- |
| `funding_type` | String | NULLABLE | -- |
| `can_close_days` | Integer | NULLABLE | -- |
| `proof_of_funds` | Boolean | NOT NULL, default `false` | -- |
| `notes` | Text | NULLABLE | -- |
| `deleted_at` | DateTime | NULLABLE | -- |

**Relationships:**
- `contact` -> Contact (many-to-one)

---

### 31. `buyer_packets`

**Model:** `BuyerPacket` | **File:** `models/buyer_packets.py`

| Column | Type | Constraints | Index |
|---|---|---|---|
| `id` | UUID | PK | PK |
| `created_at` | DateTime | NOT NULL | -- |
| `updated_at` | DateTime | NOT NULL | -- |
| `property_id` | UUID | FK -> `properties.id`, NOT NULL | Yes |
| `scenario_id` | UUID | FK -> `analysis_scenarios.id`, NOT NULL | -- |
| `created_by` | UUID | FK -> `users.id`, NOT NULL | Yes |
| `team_id` | UUID | NULLABLE | -- |
| `title` | String | NOT NULL | -- |
| `share_token` | String | NOT NULL, UNIQUE | Yes (unique) |
| `packet_data` | JSONB | NOT NULL | -- |
| `asking_price` | Numeric(14,2) | NULLABLE | -- |
| `assignment_fee` | Numeric(14,2) | NULLABLE | -- |
| `is_public` | Boolean | NOT NULL, default `true` | -- |
| `view_count` | Integer | NOT NULL, default `0` | -- |
| `last_viewed_at` | DateTime | NULLABLE | -- |
| `notes_to_buyer` | Text | NULLABLE | -- |
| `deleted_at` | DateTime | NULLABLE | -- |

**Relationships:**
- `property` -> Property (many-to-one)
- `scenario` -> AnalysisScenario (many-to-one)
- `sends` -> BuyerPacketSend (one-to-many, cascade `all, delete-orphan`)

---

### 32. `buyer_packet_sends`

**Model:** `BuyerPacketSend` | **File:** `models/buyer_packets.py`

| Column | Type | Constraints | Index |
|---|---|---|---|
| `id` | UUID | PK | PK |
| `created_at` | DateTime | NOT NULL | -- |
| `updated_at` | DateTime | NOT NULL | -- |
| `packet_id` | UUID | FK -> `buyer_packets.id`, NOT NULL | Yes |
| `contact_id` | UUID | FK -> `contacts.id`, NOT NULL | Yes |
| `communication_id` | UUID | FK -> `communications.id`, NULLABLE | -- |
| `sent_at` | DateTime | NOT NULL | -- |
| `opened_at` | DateTime | NULLABLE | -- |

**Relationships:**
- `packet` -> BuyerPacket (many-to-one)
- `contact` -> Contact (many-to-one)

---

### 33. `sequences`

**Model:** `Sequence` | **File:** `models/sequences.py`

| Column | Type | Constraints | Index |
|---|---|---|---|
| `id` | UUID | PK | PK |
| `created_at` | DateTime | NOT NULL | -- |
| `updated_at` | DateTime | NOT NULL | -- |
| `created_by` | UUID | FK -> `users.id`, NOT NULL | Yes |
| `team_id` | UUID | FK -> `teams.id`, NULLABLE | -- |
| `name` | String | NOT NULL | -- |
| `description` | Text | NULLABLE | -- |
| `status` | String | NOT NULL, default `active` | -- |
| `trigger_type` | String | NULLABLE, default `manual` | -- |
| `stop_on_reply` | Boolean | NOT NULL, default `true` | -- |
| `stop_on_deal_created` | Boolean | NOT NULL, default `false` | -- |
| `total_enrolled` | Integer | NOT NULL, default `0` | -- |
| `total_completed` | Integer | NOT NULL, default `0` | -- |
| `total_replied` | Integer | NOT NULL, default `0` | -- |
| `deleted_at` | DateTime | NULLABLE | -- |

**Relationships:**
- `steps` -> SequenceStep (one-to-many, cascade `all, delete-orphan`, ordered by `step_order`)
- `enrollments` -> SequenceEnrollment (one-to-many)

---

### 34. `sequence_steps`

**Model:** `SequenceStep` | **File:** `models/sequences.py`

| Column | Type | Constraints | Index |
|---|---|---|---|
| `id` | UUID | PK | PK |
| `created_at` | DateTime | NOT NULL | -- |
| `updated_at` | DateTime | NOT NULL | -- |
| `sequence_id` | UUID | FK -> `sequences.id`, NOT NULL | Yes |
| `step_order` | Integer | NOT NULL | -- |
| `channel` | String | NOT NULL | -- |
| `delay_days` | Integer | NOT NULL, default `0` | -- |
| `delay_hours` | Integer | NOT NULL, default `0` | -- |
| `subject` | String | NULLABLE | -- |
| `body_template` | Text | NOT NULL | -- |
| `deleted_at` | DateTime | NULLABLE | -- |

**Relationships:**
- `sequence` -> Sequence (many-to-one)

---

### 35. `sequence_enrollments`

**Model:** `SequenceEnrollment` | **File:** `models/sequences.py`

| Column | Type | Constraints | Index |
|---|---|---|---|
| `id` | UUID | PK | PK |
| `created_at` | DateTime | NOT NULL | -- |
| `updated_at` | DateTime | NOT NULL | -- |
| `sequence_id` | UUID | FK -> `sequences.id`, NOT NULL | Yes |
| `contact_id` | UUID | FK -> `contacts.id`, NOT NULL | Yes |
| `property_id` | UUID | FK -> `properties.id`, NULLABLE | -- |
| `deal_id` | UUID | FK -> `deals.id`, NULLABLE | -- |
| `created_by` | UUID | FK -> `users.id`, NOT NULL | -- |
| `status` | String | NOT NULL, default `active` | -- |
| `current_step` | Integer | NOT NULL, default `0` | -- |
| `next_send_at` | DateTime | NULLABLE | Yes |
| `enrolled_at` | DateTime | NOT NULL, server_default `now()` | -- |
| `completed_at` | DateTime | NULLABLE | -- |
| `stopped_at` | DateTime | NULLABLE | -- |
| `stopped_reason` | String | NULLABLE | -- |
| `deleted_at` | DateTime | NULLABLE | -- |

**Partial unique index:** `uq_active_enrollment` on `(sequence_id, contact_id)` WHERE `status = 'active' AND deleted_at IS NULL`

---

### 36. `skip_traces`

**Model:** `SkipTrace` | **File:** `models/skip_traces.py`

| Column | Type | Constraints | Index |
|---|---|---|---|
| `id` | UUID | PK | PK |
| `created_at` | DateTime | NOT NULL | -- |
| `updated_at` | DateTime | NOT NULL | -- |
| `property_id` | UUID | FK -> `properties.id`, NULLABLE | Yes |
| `contact_id` | UUID | FK -> `contacts.id`, NULLABLE | Yes |
| `created_by` | UUID | FK -> `users.id`, NOT NULL | Yes |
| `team_id` | UUID | NULLABLE | -- |
| `input_address` | String | NULLABLE | -- |
| `input_name` | String | NULLABLE | -- |
| `input_city` | String | NULLABLE | -- |
| `input_state` | String | NULLABLE | -- |
| `input_zip` | String | NULLABLE | -- |
| `status` | String | NOT NULL, default `pending` | -- |
| `owner_first_name` | String | NULLABLE | -- |
| `owner_last_name` | String | NULLABLE | -- |
| `phones` | JSONB | NULLABLE | -- |
| `emails` | JSONB | NULLABLE | -- |
| `mailing_address` | JSONB | NULLABLE | -- |
| `is_absentee_owner` | Boolean | NULLABLE | -- |
| `demographics` | JSONB | NULLABLE | -- |
| `raw_response` | JSONB | NULLABLE | -- |
| `cost_cents` | Integer | NULLABLE | -- |
| `traced_at` | DateTime | NULLABLE | -- |
| `batch_id` | String | NULLABLE | Yes |
| `deleted_at` | DateTime | NULLABLE | -- |
| `compliance_acknowledged_at` | DateTime | NULLABLE | -- |

**Relationships:**
- `property` -> Property (many-to-one)
- `contact` -> Contact (many-to-one)

---

### 37. `mail_campaigns`

**Model:** `MailCampaign` | **File:** `models/mail_campaigns.py`

| Column | Type | Constraints | Index |
|---|---|---|---|
| `id` | UUID | PK | PK |
| `created_at` | DateTime | NOT NULL | -- |
| `updated_at` | DateTime | NOT NULL | -- |
| `created_by` | UUID | FK -> `users.id`, NOT NULL | Yes |
| `team_id` | UUID | NULLABLE | -- |
| `name` | String | NOT NULL | -- |
| `description` | Text | NULLABLE | -- |
| `status` | String | NOT NULL, default `draft` | -- |
| `mail_type` | String | NOT NULL | -- |
| `template_front_html` | Text | NULLABLE | -- |
| `template_back_html` | Text | NULLABLE | -- |
| `from_address` | JSONB | NULLABLE | -- |
| `scheduled_date` | Date | NULLABLE | -- |
| `sent_at` | DateTime | NULLABLE | -- |
| `total_recipients` | Integer | NOT NULL, default `0` | -- |
| `total_sent` | Integer | NOT NULL, default `0` | -- |
| `total_delivered` | Integer | NOT NULL, default `0` | -- |
| `total_returned` | Integer | NOT NULL, default `0` | -- |
| `total_cost_cents` | Integer | NOT NULL, default `0` | -- |
| `deleted_at` | DateTime | NULLABLE | -- |

**Relationships:**
- `recipients` -> MailRecipient (one-to-many, cascade `all, delete-orphan`)

---

### 38. `mail_recipients`

**Model:** `MailRecipient` | **File:** `models/mail_campaigns.py`

| Column | Type | Constraints | Index |
|---|---|---|---|
| `id` | UUID | PK | PK |
| `created_at` | DateTime | NOT NULL | -- |
| `updated_at` | DateTime | NOT NULL | -- |
| `campaign_id` | UUID | FK -> `mail_campaigns.id`, NOT NULL | Yes |
| `contact_id` | UUID | FK -> `contacts.id`, NULLABLE | Yes (via migration) |
| `property_id` | UUID | FK -> `properties.id`, NULLABLE | Yes (via migration) |
| `to_name` | String | NULLABLE | -- |
| `to_address` | JSONB | NOT NULL | -- |
| `address_verified` | Boolean | NOT NULL, default `false` | -- |
| `deliverability` | String | NULLABLE | -- |
| `lob_mail_id` | String | NULLABLE | -- |
| `status` | String | NOT NULL, default `pending` | -- |
| `cost_cents` | Integer | NULLABLE | -- |
| `rendered_front` | Text | NULLABLE | -- |
| `rendered_back` | Text | NULLABLE | -- |
| `deleted_at` | DateTime | NULLABLE | -- |

**Relationships:**
- `campaign` -> MailCampaign (many-to-one)
- `contact` -> Contact (many-to-one)
- `property` -> Property (many-to-one)

---

## Entity Relationship Summary

```
users
  |-- 1:N --> deals (user_id)
  |-- 1:N --> team_members (user_id)
  |-- 1:N --> pipeline_entries (user_id)
  |-- 1:N --> documents (user_id)
  |-- 1:N --> chat_messages (user_id)
  |-- 1:N --> portfolio_entries (user_id)
  |-- 1:N --> subscriptions (user_id)
  |-- 1:N --> usage_records (user_id)
  |-- N:1 --> teams (team_id)

teams
  |-- 1:N --> team_members
  |-- 1:N --> deals (team_id)
  |-- N:1 --> users (created_by)

properties
  |-- 1:N --> analysis_scenarios
  |-- 1:N --> deals
  |-- 1:N --> documents
  |-- 1:N --> financing_instruments
  |-- 1:N --> rehab_projects
  |-- 1:N --> tasks (property_id)
  |-- 1:N --> transactions (property_id)
  |-- 1:N --> communications (property_id)
  |-- 1:N --> obligations (property_id)
  |-- 1:N --> payments (property_id)
  |-- 1:N --> data_source_events (property_id)
  |-- 1:N --> reports (property_id)
  |-- 1:N --> buyer_packets (property_id)
  |-- 1:N --> skip_traces (property_id)
  |-- 1:N --> sequence_enrollments (property_id)
  |-- 1:N --> mail_recipients (property_id)

deals
  |-- 1:N --> pipeline_entries
  |-- 1:N --> portfolio_entries
  |-- 1:N --> financing_instruments (deal_id)
  |-- M:N --> contacts (via deal_contacts)

contacts
  |-- 1:N --> buy_boxes
  |-- M:N --> deals (via deal_contacts)
  |-- 1:N --> communications (contact_id)
  |-- 1:N --> tasks (contact_id)
  |-- 1:N --> sequence_enrollments (contact_id)
  |-- 1:N --> skip_traces (contact_id)
  |-- 1:N --> buyer_packet_sends (contact_id)
  |-- 1:N --> mail_recipients (contact_id)

financing_instruments
  |-- 1:N --> obligations
  |-- 1:N --> payments
  |-- N:1 --> financing_instruments (underlying_instrument_id, self-referential wraps)

documents
  |-- 1:N --> document_chunks (CASCADE delete)

reports
  |-- 1:N --> report_views

sequences
  |-- 1:N --> sequence_steps
  |-- 1:N --> sequence_enrollments

mail_campaigns
  |-- 1:N --> mail_recipients

buyer_packets
  |-- 1:N --> buyer_packet_sends
```

---

## Migration History

### Chain Summary (31 migrations total)

The migration chain starts at `f6c95c03e2a5` (2026-02-28) and has the HEAD at `t0u1v2w3x4y5` (2026-04-09).

There is a merge migration at `8ccd45796e92` that merges two branches:
- Branch 1 (financing): ... -> `l2g3h4i5j6k7` (add deleted_at to financing)
- Branch 2 (outreach): ... -> `s9t0u1v2w3x4` (add mail campaigns)

### Chronological Order

| # | Revision | Description | Date |
|---|---|---|---|
| 1 | `f6c95c03e2a5` | Initial schema (users, teams, team_members, deals, documents, pipeline_entries, portfolio_entries, chat_messages) | 2026-02-28 |
| 2 | `a3d8f1b24c07` | Rebuild documents for S3 | -- |
| 3 | `b7e2a4f19d03` | Add risk_factors JSONB to deals | -- |
| 4 | `c1e4f2a83b09` | Add email_notifications to users | -- |
| 5 | `d4a7e3b58f12` | Add password_reset_tokens table | -- |
| 6 | `1642524fa0f6` | Add billing infrastructure (subscriptions, usage_records, webhook_events, stripe columns on users) | -- |
| 7 | `e1a0b2c3d4e5` | Enable PG extensions (vector, pg_trgm, postgis) | 2026-04-03 |
| 8 | `f2b1c3d4e5f6` | Rename tiers plus/business | -- |
| 9 | `a1b2c3d4e5f6` | Add properties, analysis_scenarios, deal refactor | -- |
| 10 | `b2c3d4e5f6a7` | Add contacts, tasks, communications, transactions | -- |
| 11 | `c3d4e5f6a7b8` | Add reports, data_source_events, import_jobs | -- |
| 12 | `d4e5f6a7b8c9` | Add clerk_user_id to users | -- |
| 13 | `e5f6a7b8c9d0` | Add onboarding and is_sample columns | -- |
| 14 | `f6a7b8c9d0e1` | Add deal_contacts junction table | -- |
| 15 | `g7b8c9d0e1f2` | Add task completed_at column | -- |
| 16 | `h8c9d0e1f2g3` | Add document_chunks (RAG) | -- |
| 17 | `i9d0e1f2g3h4` | Add report_data, brand_kit, report_views | -- |
| 18 | `j0e1f2g3h4i5` | Add financing_instruments, obligations, payments | -- |
| 19 | `k1f2g3h4i5j6` | Add unique document chunk index | -- |
| **Branch 1 (financing):** | | | |
| 20 | `k1l2m3n4o5p6` | Add rehab_projects and rehab_items | -- |
| 21 | `l2g3h4i5j6k7` | Add deleted_at to financing tables | -- |
| **Branch 2 (outreach):** | | | |
| 20 | `l2m3n4o5p6q7` | Add buy_boxes | -- |
| 21 | `m3n4o5p6q7r8` | Add buyer_packets / buyer_packet_sends | -- |
| 22 | `n4o5p6q7r8s9` | Add communication delivery fields | -- |
| 23 | `o5p6q7r8s9t0` | Add sequences, sequence_steps, sequence_enrollments | -- |
| 24 | `p6q7r8s9t0u1` | Add partial unique index for active enrollments | 2026-04-05 |
| 25 | `q7r8s9t0u1v2` | Add opted_out_sms to contacts | 2026-04-05 |
| 26 | `r8s9t0u1v2w3` | Add skip_traces table | 2026-04-05 |
| 27 | `s9t0u1v2w3x4` | Add mail_campaigns / mail_recipients | 2026-04-05 |
| **Merge:** | | | |
| 28 | `8ccd45796e92` | Merge financing and outreach branches | 2026-04-05 |
| **Post-merge:** | | | |
| 29 | `t0u1v2w3x4y5` | Add geocoding columns (lat/lng/place_id) to properties | 2026-04-09 |

### Latest HEAD

The current migration head is `t0u1v2w3x4y5`. To verify database is up-to-date, run:
```
alembic current   # shows what revision the DB is at
alembic heads     # shows the latest migration (should be t0u1v2w3x4y5)
```

---

## Findings

### FINDING-1: Unused Table -- `password_reset_tokens`

**Severity:** Low
**Details:** The `PasswordResetToken` model is defined in `models/password_reset_tokens.py` and registered in `models/__init__.py`, but it is referenced nowhere else in the codebase -- no router, no core service, no schema file. This table was likely obsoleted when authentication moved to Clerk (external auth provider). It exists in the database but has no application code paths that read from or write to it.

**Recommendation:** Consider removing the model and table via migration if Clerk is the sole auth provider.

---

### FINDING-2: Mostly Unused Table -- `import_jobs`

**Severity:** Low
**Details:** The `ImportJob` model is only referenced in `models/__init__.py` and `core/security/rls.py` (as a name in the RLS filter list). No router, no schema, and no core service code actually creates or queries `ImportJob` records. The table exists for future CSV import functionality that has not yet been built.

**Recommendation:** No action needed if this is planned for a future wave. Document as a stub.

---

### FINDING-3: Missing Foreign Keys on `created_by` Columns (12 tables)

**Severity:** Medium
**Details:** The following 12 tables have a `created_by` column of type `UUID` that is NOT declared as a `ForeignKey("users.id")`:

| Table | Column |
|---|---|
| `properties` | `created_by` |
| `analysis_scenarios` | `created_by` |
| `contacts` | `created_by` |
| `tasks` | `created_by` |
| `communications` | `created_by` |
| `transactions` | `created_by` |
| `reports` | `created_by` |
| `import_jobs` | `created_by` |
| `buy_boxes` | `created_by` |
| `rehab_projects` | `created_by` |
| `rehab_items` | `created_by` |
| `data_source_events` | (no `created_by`, but the pattern applies to the tables below) |

These columns store user UUIDs and are filtered on by the application-level RLS, but the database has no referential integrity constraint. A stale or invalid UUID in `created_by` would not be caught by the database.

**Recommendation:** Add `ForeignKey("users.id")` constraints to all `created_by` columns via an Alembic migration.

---

### FINDING-4: Missing Foreign Keys on `team_id` Columns (12 tables)

**Severity:** Medium
**Details:** The following tables have `team_id` columns declared as bare `UUID` without a `ForeignKey("teams.id")` constraint:

| Table |
|---|
| `properties` |
| `analysis_scenarios` |
| `contacts` |
| `tasks` |
| `communications` |
| `transactions` |
| `reports` |
| `buy_boxes` |
| `rehab_projects` |
| `skip_traces` |
| `mail_campaigns` |
| `buyer_packets` |

By contrast, `deals`, `pipeline_entries`, `portfolio_entries`, `financing_instruments`, `obligations`, `payments`, `sequences`, and `team_members` all correctly have `ForeignKey("teams.id")`.

**Recommendation:** Add `ForeignKey("teams.id")` to all `team_id` columns for referential integrity. This is especially important before the multi-tenant / team features ship (noted in the RLS TODO).

---

### FINDING-5: Missing Indexes on Frequently Queried FK Columns

**Severity:** Medium
**Details:** Several foreign key columns that are used in `WHERE` clauses in routers lack indexes:

| Table | Column | Used in | Has Index? |
|---|---|---|---|
| `tasks` | `property_id` | `routers/tasks.py` filter | No |
| `tasks` | `deal_id` | `routers/tasks.py` filter | No |
| `tasks` | `contact_id` | `routers/tasks.py` filter | No |
| `communications` | `contact_id` | `routers/buyers.py` filter | No |
| `communications` | `deal_id` | `routers/communications.py` filter | No |
| `communications` | `property_id` | `routers/communications.py` filter | No |
| `transactions` | `property_id` | `routers/transactions.py` filter | No |
| `transactions` | `deal_id` | `routers/transactions.py` filter | No |
| `deals` | `property_id` | `routers/properties.py` | No |
| `reports` | `property_id` | `routers/reports.py` | No |
| `reports` | `deal_id` | `routers/reports.py` | No |
| `reports` | `scenario_id` | `routers/reports.py` | No |
| `sequence_enrollments` | `created_by` | `core/communications/sequence_engine.py` | No |
| `usage_records` | `metric` + `period_start` | `core/billing/` (composite lookup) | No |

**Recommendation:** Add indexes on these columns. Priority should be:
1. `transactions.property_id` (queried on every property detail page)
2. `communications.contact_id` (buyer CRM feature)
3. `tasks.property_id`, `tasks.deal_id`, `tasks.contact_id` (task list filtering)
4. `usage_records` composite index on `(user_id, metric, period_start)` for billing lookups

---

### FINDING-6: RLS Coverage Gaps

**Severity:** High
**Details:** The application-level RLS system (`core/security/rls.py`) only covers 16 models split across two lists (`_USER_ID_MODELS` and `_CREATED_BY_MODELS`). The following models with user-scoped data are NOT covered:

| Model | Has user-scoping column? | In RLS? |
|---|---|---|
| `Subscription` | `user_id` | No |
| `FinancingInstrument` | `created_by` (FK) | No |
| `Obligation` | `created_by` (FK) | No |
| `Payment` | `created_by` (FK) | No |
| `RehabProject` | `created_by` | No |
| `RehabItem` | `created_by` (via project) | No |
| `BuyBox` | `created_by` | No |
| `BuyerPacket` | `created_by` (FK) | No |
| `BuyerPacketSend` | (via packet) | No |
| `Sequence` | `created_by` (FK) | No |
| `SequenceStep` | (via sequence) | No |
| `SequenceEnrollment` | `created_by` (FK) | No |
| `SkipTrace` | `created_by` (FK) | No |
| `MailCampaign` | `created_by` (FK) | No |
| `MailRecipient` | (via campaign) | No |
| `DealContact` | (via deal) | No |
| `ReportView` | (via report) | No |
| `DataSourceEvent` | (via property) | No |

These models were added in Waves 2-6 but the RLS filter sets were never updated.

**Important caveat:** Many of these routers perform manual ownership checks (e.g., querying the parent property by `created_by` first, then filtering children). But the RLS event listener would not protect against direct ORM queries on these models.

**Recommendation:** Add all `created_by` models to `_CREATED_BY_MODELS` and `user_id` models to `_USER_ID_MODELS` in `core/security/rls.py`. For child tables (RehabItem, SequenceStep, etc.), consider either adding a `created_by` column or relying on the parent table's RLS filtering.

---

### FINDING-7: Inconsistent Soft Delete Patterns

**Severity:** Low
**Details:** The codebase uses two different patterns for soft deletes:

**Pattern A -- `deleted_at` (DateTime, nullable):**
- `deals`, `financing_instruments`, `obligations`, `payments`, `rehab_projects`, `rehab_items`, `buy_boxes`, `buyer_packets`, `sequences`, `sequence_steps`, `sequence_enrollments`, `skip_traces`, `mail_campaigns`, `mail_recipients`

**Pattern B -- `is_deleted` (Boolean, default false):**
- `properties`, `analysis_scenarios`, `contacts`, `tasks`, `communications`, `transactions`, `reports`

Some tables use `deleted_at` while others use `is_deleted`. This inconsistency creates confusion for developers and makes it harder to write generic soft-delete utilities.

**Recommendation:** Standardize on one pattern. `deleted_at` is generally preferred as it doubles as an audit trail timestamp.

---

### FINDING-8: Missing CASCADE Deletes on Some Relationships

**Severity:** Low
**Details:** The following parent-child relationships have ORM-level cascade (`cascade="all, delete-orphan"`) but lack database-level `ON DELETE CASCADE`:

| Parent | Child | ORM Cascade? | DB CASCADE? |
|---|---|---|---|
| `documents` | `document_chunks` | Yes | Yes (only one with both) |
| `financing_instruments` | `obligations` | Yes | No |
| `financing_instruments` | `payments` | Yes | No |
| `rehab_projects` | `rehab_items` | Yes | No |
| `contacts` | `buy_boxes` | Yes | No |
| `buyer_packets` | `buyer_packet_sends` | Yes | No |
| `sequences` | `sequence_steps` | Yes | No |
| `mail_campaigns` | `mail_recipients` | Yes | No |

Without `ON DELETE CASCADE` at the database level, deleting a parent record via raw SQL or a non-ORM path would leave orphaned children. The ORM cascade only fires when SQLAlchemy performs the delete.

**Recommendation:** Add `ondelete="CASCADE"` to the ForeignKey declarations on child tables to match the `document_chunks` pattern.

---

### FINDING-9: Deprecated Columns on `deals`

**Severity:** Info
**Details:** The `deals` table contains `inputs` (JSONB) and `outputs` (JSONB) columns that are explicitly marked as `DEPRECATED` in the source code, with a comment saying they should migrate to `AnalysisScenario` in Wave 2. Wave 2 is complete but these columns remain.

**Recommendation:** Once confirmed that no code reads from `deals.inputs` or `deals.outputs`, create a migration to drop them or at minimum mark them nullable with no default.

---

### FINDING-10: `chat_messages.context_id` -- Unlinked Polymorphic UUID

**Severity:** Low
**Details:** `chat_messages.context_id` is a bare UUID with no ForeignKey constraint. It can reference either a deal or a document depending on `context_type`. This is a valid polymorphic pattern, but it means there is no referential integrity check. If the referenced deal or document is deleted, the `context_id` becomes an orphan.

**Recommendation:** Acceptable as-is for a chat context column. Consider adding a cleanup job or setting to NULL on parent delete.

---

### FINDING-11: `properties.created_by` and `properties.team_id` Have No FK Constraints

**Severity:** Medium
**Details:** The `properties` table is the central entity in the domain model, but its `created_by` and `team_id` columns are plain UUIDs without foreign key constraints. This means:
1. The database cannot enforce that a property's creator actually exists in `users`
2. The database cannot enforce that a property's team actually exists in `teams`
3. ON DELETE behavior is undefined -- deleting a user would not cascade or restrict

**Recommendation:** Add FK constraints. This is the highest-impact missing-FK issue since `properties` is referenced by 15+ other tables.

---

## Statistics Summary

| Metric | Count |
|---|---|
| Total tables (from models) | 38 |
| Total migrations | 31 (including 1 merge) |
| Tables with explicit indexes | 26 |
| Tables with JSONB columns | 19 |
| Tables with Vector columns | 1 (`document_chunks`) |
| Tables using soft delete | 21 (14 via `deleted_at`, 7 via `is_deleted`) |
| FK-constrained `created_by` columns | 5 of 11 |
| FK-constrained `team_id` columns | 8 of 20 |
| Models covered by RLS | 16 of ~30 user-scoped |
| Cascade delete (ORM level) | 8 relationships |
| Cascade delete (DB level) | 1 relationship (`document_chunks`) |
| Unused tables | 1 confirmed (`password_reset_tokens`), 1 stub (`import_jobs`) |
