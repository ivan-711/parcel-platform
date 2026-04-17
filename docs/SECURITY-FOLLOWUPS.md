# Security Follow-ups — Lower Priority

Items identified during the 2026-04-16 security remediation that don't need immediate action but should be addressed before scaling.

---

## Shipped (2026-04-16)

- **#2 React Query Cache Keys** — `306698e` scoped all 50+ query keys by userId across 36 files
- **#3 CORS Header Tightening** — `65dc9ba` restricted methods/headers to actual frontend usage
- **#5 clerk_user_id Unique Constraint** — `fa7726f` verified: unique index `ix_users_clerk_user_id` exists at DB level, zero duplicates

---

## HIGH — Wave 2

### 1. PostgreSQL RLS Policies (defense-in-depth)
**Effort:** 2-3 days
**File:** `backend/core/security/rls.py` (TODO on line 10)
Current RLS is application-level only (SQLAlchemy ORM event hook). Real database-level `CREATE POLICY` / `ENABLE ROW LEVEL SECURITY` would catch any bypasses from raw SQL, direct connections, or non-ORM operations.

---

## MEDIUM

### 4. SSE Stream Timeout
**Effort:** 1 hour
**File:** `backend/routers/analysis.py:626-634`
No explicit timeout on SSE streams. Add a 5-minute max and session validity check.

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
