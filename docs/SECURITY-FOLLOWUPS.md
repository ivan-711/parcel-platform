# Security Follow-ups — Lower Priority

Items identified during the 2026-04-16 security remediation that don't need immediate action but should be addressed before scaling.

---

## HIGH — Wave 2

### 1. PostgreSQL RLS Policies (defense-in-depth)
**Effort:** 2-3 days
**File:** `backend/core/security/rls.py` (TODO on line 10)
Current RLS is application-level only (SQLAlchemy ORM event hook). Real database-level `CREATE POLICY` / `ENABLE ROW LEVEL SECURITY` would catch any bypasses from raw SQL, direct connections, or non-ORM operations.

### 2. React Query Cache Keys — Add User Scoping
**Effort:** 1 day
**Files:** All hooks in `frontend/src/hooks/`
Cache keys like `['properties', filters]` don't include user_id. Currently mitigated by `queryClient.clear()` on logout, but adding user_id to keys is cheap insurance against shared-device cache leaks.

---

## MEDIUM

### 3. CORS Header Tightening
**Effort:** 30 minutes
**File:** `backend/main.py:64-75`
`allow_methods=["*"]` and `allow_headers=["*"]` are overly permissive. Restrict to actual methods/headers used.

### 4. SSE Stream Timeout
**Effort:** 1 hour
**File:** `backend/routers/analysis.py:626-634`
No explicit timeout on SSE streams. Add a 5-minute max and session validity check.

### 5. Unique Constraint on clerk_user_id
**Effort:** 30 minutes
Verify the UNIQUE constraint on `clerk_user_id` is enforced at the DB level (it's declared in the SQLAlchemy model but should be confirmed via migration/live schema).

---

## LOW

### 6. Module-level Token Cache
**Effort:** 1 hour
**File:** `frontend/src/lib/api.ts:38-73`
`_clerkTokenCache` is module-level, not per-user. Mitigated by Clerk token lifecycle (refreshes every 50s) but could be scoped.

### 7. localStorage User Data
**Effort:** 1 hour
**File:** `frontend/src/stores/authStore.ts`
User profile stored in localStorage as plaintext JSON. Only contains non-sensitive data (name, email, tier) and JWT is NOT stored there. Consider using sessionStorage instead.
