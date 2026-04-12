# Parcel Platform Security Audit

**Date:** 2026-04-12
**Scope:** Full codebase read-only review (backend + frontend)
**Auditor:** Automated (Claude)

---

## Summary

The Parcel Platform demonstrates solid security fundamentals: Clerk-only authentication with RS256 JWT verification, parameterized SQL queries via SQLAlchemy ORM, Stripe webhook signature verification, Pydantic request validation on all endpoints, and no hardcoded secrets in source. Several medium-severity items warrant attention before production launch.

**Findings by severity:**
- CRITICAL: 0
- HIGH: 3
- MEDIUM: 8
- LOW: 6

---

## CRITICAL

*No critical findings.*

---

## HIGH

### H-1. Internal API Key Compared with `!=` Instead of `hmac.compare_digest`

**File:** `backend/routers/sequences.py`, lines 718-721
**Description:** The internal cron endpoint `/internal/process-sequences` compares the provided API key with a simple `!=` operator rather than a timing-safe comparison. This makes the endpoint vulnerable to timing attacks where an attacker can iteratively determine the key character-by-character by measuring response times.

```python
internal_key = os.getenv("INTERNAL_API_KEY", "")
provided_key = request.headers.get("X-Internal-Key", "")
if not internal_key or provided_key != internal_key:
```

**Recommendation:** Replace `provided_key != internal_key` with `not hmac.compare_digest(provided_key, internal_key)`. The codebase already uses `hmac.compare_digest` in five other locations (Twilio, SendGrid, Clerk webhooks), so this pattern is established.

---

### H-2. Hardcoded IP Hash Salt Fallback

**File:** `backend/routers/reports.py`, line 24
**Description:** The IP hash salt has a hardcoded default value when the environment variable is not set:

```python
_IP_HASH_SALT = os.getenv("IP_HASH_SALT", "parcel-default-salt-change-me")
```

If `IP_HASH_SALT` is not configured in production, all deployments share the same predictable salt. An attacker who knows this default can reverse-lookup hashed IPs or precompute rainbow tables. IP hashes are stored in the `report_views` table.

**Recommendation:** Remove the default value and fail loudly at startup if the variable is not set (similar to how Clerk configuration validates presence). Alternatively, generate a random salt at first boot and persist it.

---

### H-3. Advisory Lock Parameter Built with f-string (Potential Integer Overflow)

**File:** `backend/routers/webhooks/__init__.py`, line 43
**Description:** The PostgreSQL advisory lock key is constructed using an f-string:

```python
lock_key = int(hashlib.sha256(str(user_id).encode()).hexdigest(), 16) % (2**31 - 1)
db.execute(text(f"SELECT pg_advisory_xact_lock({lock_key})"))
```

While `lock_key` is always an integer derived from a SHA-256 hash (not user-controlled string input), using `text(f"...")` for SQL is a risky pattern. The value is safely bounded by `% (2**31 - 1)`, so this is not SQL injection in practice, but it sets a bad precedent and could be dangerous if refactored carelessly.

**Recommendation:** Use a parameterized query: `db.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": lock_key})`.

---

## MEDIUM

### M-1. Application-Level RLS Is Not Database-Enforced

**File:** `backend/core/security/rls.py`, lines 1-10
**Description:** The file's own header comment states:

> WARNING: This is NOT database-level PostgreSQL RLS. It only filters SELECT queries issued through the SQLAlchemy ORM. Raw SQL queries, direct database connections, and non-ORM operations bypass this filter entirely.

The RAG retrieval module (`backend/core/ai/rag_retrieval.py`) uses raw SQL via `db.execute(text(...))` which bypasses ORM-level RLS filtering. While these queries do include `WHERE d.user_id = :user_id` clauses manually, any new raw SQL query that omits user filtering would create a data leak.

**Recommendation:** Implement PostgreSQL-level RLS policies (`CREATE POLICY ... ENABLE ROW LEVEL SECURITY`) as defense-in-depth, as the TODO in the file already acknowledges.

---

### M-2. File Upload Validates Extension Only, Not Content (Magic Bytes)

**File:** `backend/routers/documents.py`, lines 57-67
**Description:** File type validation relies solely on the filename extension:

```python
ext = file.filename.rsplit(".", 1)[-1].lower()
if ext not in ALLOWED_TYPES:
    raise HTTPException(...)
```

An attacker can upload a malicious file (e.g., an executable or HTML with embedded JavaScript) by simply renaming it to `.pdf`. The uploaded content type sent to S3 is also derived from the extension, not from inspecting the file contents.

**Recommendation:** Add magic byte validation using `python-magic` or a simple header check (e.g., PDF files start with `%PDF-`, DOCX files are ZIP archives starting with `PK`). Also consider scanning with ClamAV for document uploads.

---

### M-3. Filename Not Sanitized in S3 Key

**File:** `backend/routers/documents.py`, line 94
**Description:** The original filename is used directly in the S3 key:

```python
s3_key = f"documents/{current_user.id}/{uuid.uuid4()}/{file.filename}"
```

While S3 handles arbitrary key names, filenames containing path traversal characters (`../`), null bytes, or very long strings could cause issues with downstream systems that process these keys. The UUID segment mitigates directory traversal risk, but the filename itself is not sanitized.

**Recommendation:** Sanitize the filename by stripping path separators, null bytes, and non-ASCII characters. Consider using only the UUID and extension: `f"documents/{current_user.id}/{uuid.uuid4()}.{ext}"`.

---

### M-4. Calculator Error Messages Expose Internal Exception Details

**Files:**
- `backend/routers/calculators.py`, lines 89, 128
- `backend/routers/communications.py`, lines 119, 165

**Description:** Several endpoints return raw exception messages to the client:

```python
detail={"error": f"Calculation error: {str(e)}", "code": "CALCULATION_ERROR"}
```

```python
raise HTTPException(status_code=400, detail={"error": str(e), "code": "INVALID_REQUEST"})
```

Internal exception messages can reveal implementation details (library names, file paths, stack structures) useful for reconnaissance.

**Recommendation:** Return generic user-facing error messages and log the full exception server-side. The analysis router already implements this pattern via `_sanitize_sse_error()` (line 687) -- apply the same approach elsewhere.

---

### M-5. Missing Rate Limits on Sensitive Endpoints

**Description:** While many endpoints have rate limiting, several sensitive ones do not:

| Endpoint | File | Risk |
|---|---|---|
| `PUT /auth/me/` (profile update) | `backend/routers/auth.py:41` | Email enumeration via repeated email change attempts |
| `POST /auth/delete-account` | `backend/routers/auth.py:78` | Account deletion abuse |
| All document endpoints except upload | `backend/routers/documents.py` | Excessive S3 presigned URL generation |
| All contacts CRUD endpoints | `backend/routers/contacts.py` | Data scraping |
| All tasks CRUD endpoints | `backend/routers/tasks.py` | Abuse |
| All sequence/enrollment endpoints | `backend/routers/sequences.py` | Enrollment flooding |
| All financing endpoints | `backend/routers/financing.py` | Data scraping |

**Recommendation:** Add rate limits to all mutation endpoints and any endpoint that generates presigned URLs or makes external API calls.

---

### M-6. No Security Headers Configured

**File:** `backend/main.py`
**Description:** The application does not set any security response headers. Missing headers include:

- `Strict-Transport-Security` (HSTS)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Content-Security-Policy`
- `Referrer-Policy`

**Recommendation:** Add a FastAPI middleware that sets these headers on all responses. If deployed behind a reverse proxy (Vercel/Railway), verify these headers are set at the proxy level instead.

---

### M-7. Worker Health Endpoint Exposes Redis Connection Errors

**File:** `backend/main.py`, line 135
**Description:** The `/health/worker` endpoint returns raw exception details when Redis is unreachable:

```python
content={"status": "unhealthy", "broker": "redis", "connected": False, "error": str(e)}
```

This can reveal the Redis connection string, hostname, port, and authentication status to unauthenticated callers.

**Recommendation:** Return only the status without the error details, or add authentication to this health endpoint.

---

### M-8. Shared Deal Endpoint Leaks User First Name

**File:** `backend/routers/deals.py`, line 455
**Description:** The public shared deal endpoint returns the deal owner's first name:

```python
first_name = deal.user.name.split()[0] if deal.user and deal.user.name else "Unknown"
```

While this may be intentional for the sharing UX, it constitutes PII disclosure on an unauthenticated endpoint.

**Recommendation:** If intentional, document this as an accepted risk. If not, remove the user name from the public response or allow users to control what name is shown on shared deals.

---

## LOW

### L-1. Legacy Auth Schemas Still Defined

**File:** `backend/schemas/auth.py`
**Description:** The file still contains `RegisterRequest`, `LoginRequest`, `ForgotPasswordRequest`, `ResetPasswordRequest`, and `UpdateProfileRequest` with `current_password`/`new_password` fields. The auth router comment states "All legacy registration, login, logout, token refresh, and password reset endpoints have been removed. Authentication is handled entirely by Clerk."

These orphaned schemas are dead code. While not a direct vulnerability, they suggest incomplete cleanup from the auth migration.

**Recommendation:** Remove unused legacy schemas to reduce attack surface confusion and prevent accidental re-enablement.

---

### L-2. User Model Retains `password_hash` Column

**File:** `backend/models/users.py`, line 24
**Description:** The User model still has `password_hash = Column(String, nullable=True)` even though authentication is exclusively via Clerk. Similarly, `backend/models/password_reset_tokens.py` still defines the `PasswordResetToken` model.

**Recommendation:** Create a migration to drop the `password_hash` column and the `password_reset_tokens` table once Clerk migration is fully confirmed.

---

### L-3. Demo Password Hardcoded in Seed Script

**File:** `backend/scripts/seed_demo.py`, line 60
**Description:** `DEMO_PASSWORD = "Demo1234!"` is hardcoded in the seeding script. While this is a development/demo script, it could be problematic if the demo account is accessible in production with this known password.

**Recommendation:** Since auth is now Clerk-only and the password_hash is likely unused, verify the demo account cannot be logged into with legacy credentials. If it can, generate a random password or remove the field.

---

### L-4. Service Status Endpoint Discloses Configured Services

**File:** `backend/routers/service_status.py`
**Description:** The unauthenticated `/api/service-status` endpoint returns which third-party services are configured:

```python
return {
    "skip_tracing": bool(os.getenv("BATCHDATA_API_KEY")),
    "direct_mail": bool(os.getenv("LOB_API_KEY")),
    "sms": bool(os.getenv("TWILIO_ACCOUNT_SID")),
    "email_outbound": bool(os.getenv("SENDGRID_API_KEY")),
}
```

This reveals infrastructure details to anyone who queries the endpoint.

**Recommendation:** Consider requiring authentication or moving this check to the authenticated user context where it is actually consumed.

---

### L-5. Public Shared Packet Endpoint Lacks Rate Limiting

**File:** `backend/routers/dispositions.py`, line 624
**Description:** The `GET /packets/share/{share_token}` endpoint is public (no auth) and has no rate limiting. While it includes bot detection for view counting, the endpoint itself can be called at unlimited rate.

Compare with the shared report endpoint at `backend/routers/reports.py:330` which has `@limiter.limit("60/minute")`.

**Recommendation:** Add rate limiting consistent with other public share endpoints.

---

### L-6. CORS `allow_headers=["*"]` is Overly Broad

**File:** `backend/main.py`, line 70
**Description:** CORS is configured with `allow_headers=["*"]` which permits any custom header. While `allow_origins` is properly restricted to the frontend URL (not wildcard), the broad header allowance increases the attack surface slightly.

**Recommendation:** Restrict to only the headers the frontend actually sends: `["authorization", "content-type", "x-requested-with"]`.

---

## Positive Security Findings

The following security practices were verified as correctly implemented:

1. **No hardcoded secrets in source:** All API keys, tokens, and credentials are loaded from environment variables. The `.env` file is in `.gitignore` and only `.env.example` files (with placeholder values) are committed.

2. **Clerk JWT verification:** Properly verifies RS256 tokens using JWKS, checks issuer, audience, and expiration. Fails closed when `CLERK_JWT_AUDIENCE` is not configured (line 107-108).

3. **Stripe webhook signature verification:** Uses `stripe.Webhook.construct_event()` which validates the `stripe-signature` header (line 72-75). Includes idempotency checking via `WebhookEvent` table.

4. **Clerk webhook signature verification:** Uses Svix library with fallback to manual HMAC-SHA256 verification. Includes replay protection via timestamp validation (5-minute window).

5. **Twilio webhook validation:** Uses `hmac.compare_digest` for timing-safe signature comparison.

6. **SendGrid webhook validation:** Uses URL token comparison with `hmac.compare_digest`, plus payload signature verification.

7. **All API routes require authentication:** Every router endpoint uses `Depends(get_current_user)` except intentionally public ones (health checks, shared deal/report/packet views, webhooks, service status).

8. **SQL queries are parameterized:** All raw SQL in `rag_retrieval.py` uses SQLAlchemy `text()` with named parameters (`:user_id`, `:query`, etc.). No string concatenation for user input in SQL.

9. **Pydantic validation on all request bodies:** All POST/PUT/PATCH endpoints use Pydantic models for input validation.

10. **File upload restrictions:** Type allowlist (pdf, jpg, jpeg, png, docx), 10MB size limit, user-scoped S3 key paths.

11. **No XSS vectors in frontend:** No usage of `dangerouslySetInnerHTML` or `innerHTML` in the React codebase. Dynamic `href` values are limited to `mailto:` and `tel:` links from user data.

12. **No dangerous code execution:** No usage of `eval()`, `exec()`, `subprocess`, `os.system()`, `pickle`, or `yaml.load()` in the backend.

13. **Rate limiting on sensitive endpoints:** Billing, analysis, chat, communications, and webhook endpoints all have rate limits via `slowapi`.

14. **CORS properly scoped:** Origins are restricted to `FRONTEND_URL` (not wildcard `*`), with automatic www/non-www variant support.

---

## Remediation Priority

| Priority | Finding | Effort |
|---|---|---|
| 1 | H-1: Timing-safe internal key comparison | 5 min |
| 2 | H-3: Parameterize advisory lock query | 5 min |
| 3 | H-2: Remove hardcoded IP hash salt default | 10 min |
| 4 | M-6: Add security headers | 30 min |
| 5 | M-2: Magic byte file validation | 1 hr |
| 6 | M-3: Sanitize upload filenames | 15 min |
| 7 | M-4: Sanitize error messages | 30 min |
| 8 | M-5: Add missing rate limits | 1 hr |
| 9 | M-7: Sanitize worker health errors | 10 min |
| 10 | M-1: PostgreSQL-level RLS | Multi-day |
