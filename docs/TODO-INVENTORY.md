# TODO/FIXME/HACK Inventory

> Generated: 2026-04-12
> Scope: `frontend/src/` and `backend/` (excluding node_modules, venv, __pycache__)

## Summary

| Category             | Count |
|----------------------|-------|
| TODOs                | 7     |
| FIXMEs               | 0     |
| HACKs                | 0     |
| XXX                  | 0     |
| Workarounds          | 0     |
| DEPRECATED markers   | 1     |
| WARNING annotations  | 2     |
| Lint suppressions    | 8     |
| Commented-out code   | 0     |
| **Grand total**      | **18 items** |

---

## By Priority

### Critical (blocking or security-related)

| # | File | Line | Description |
|---|------|------|-------------|
| 1 | `backend/core/security/rls.py` | 10-12 | **TODO: Implement real PostgreSQL RLS policies.** Current implementation is application-level ORM filtering only -- raw SQL, direct DB connections, and non-ORM operations bypass it entirely. Marked for Wave 2 (multi-tenant). This is a defense-in-depth gap; acceptable for single-tenant but critical before team/multi-tenant features ship. |
| 2 | `backend/core/sync/deal_scenario_sync.py` | 6-8 | **WARNING: Dual-write pattern can drift.** If one write succeeds and the other fails, data is inconsistent. Logged to Sentry but no automated repair job exists. A scan/repair job should be built to detect deals with null `property_id` or stale scenario data. |

### Should Fix Soon

| # | File | Line | Description |
|---|------|------|-------------|
| 3 | `backend/models/deals.py` | 45 | **DEPRECATED: inputs/outputs will migrate to AnalysisScenario.** Marked "Remove in Wave 2." These deprecated columns on the Deal model should be cleaned up once migration to AnalysisScenario is complete. |

### Nice to Have

| # | File | Line | Description |
|---|------|------|-------------|
| 4-8 | `frontend/src/pages/contacts/ContactsListPage.tsx` | 39, 41, 43-45 | **TODO: verify token mapping** (5 occurrences). Design token color mappings for contact type badges (seller, agent, contractor, tenant, partner) need visual verification against the design system. Low risk -- purely cosmetic. |
| 9 | `frontend/src/components/contacts/CommunicationLog.tsx` | 18 | **TODO: verify token mapping** for `note` type badge. Same class of issue as above. |

---

## By Category

### TODO

| File | Line | Comment | Still Relevant? |
|------|------|---------|-----------------|
| `backend/core/security/rls.py` | 10 | `# TODO: Implement real PostgreSQL RLS policies (CREATE POLICY / ENABLE ROW LEVEL SECURITY) for defense-in-depth. This should be done in Wave 2 when team/multi-tenant features ship.` | Yes -- critical for multi-tenant. Not blocking single-user launch. |
| `frontend/src/pages/contacts/ContactsListPage.tsx` | 39 | `// TODO: verify token mapping -- #F97316/#FB923C mapped to warning` (seller) | Yes -- minor visual verification task. |
| `frontend/src/pages/contacts/ContactsListPage.tsx` | 41 | `// TODO: verify token mapping -- #60A5FA/#93C5FD mapped to info` (agent) | Yes -- minor visual verification task. |
| `frontend/src/pages/contacts/ContactsListPage.tsx` | 43 | `// TODO: verify token mapping -- #8A8580/#C5C0B8 mapped to gray-9/text-secondary` (contractor) | Yes -- minor visual verification task. |
| `frontend/src/pages/contacts/ContactsListPage.tsx` | 44 | `// TODO: verify token mapping -- #2DD4BF/#5EEAD4 mapped to success` (tenant) | Yes -- minor visual verification task. |
| `frontend/src/pages/contacts/ContactsListPage.tsx` | 45 | `// TODO: verify token mapping -- #FBBF24/#FCD34D mapped to warning` (partner) | Yes -- minor visual verification task. |
| `frontend/src/components/contacts/CommunicationLog.tsx` | 18 | `// TODO: verify token mapping -- #8A8580 mapped to text-muted/gray-9` (note) | Yes -- minor visual verification task. |

### FIXME

_None found._

### HACK

_None found._

### XXX

_None found._

### Workarounds

_None found._ (The word "Temporary" in `backend/core/billing/exceptions.py:11` is a class docstring for `StripeTransientError`, not a workaround marker.)

---

## Additional Technical Debt Markers

### DEPRECATED

| File | Line | Comment | Still Relevant? |
|------|------|---------|-----------------|
| `backend/models/deals.py` | 45 | `# DEPRECATED: inputs/outputs will migrate to AnalysisScenario. Remove in Wave 2.` | Yes -- should be cleaned up when Wave 2 migration is complete. |

### WARNING Annotations

| File | Line | Comment | Still Relevant? |
|------|------|---------|-----------------|
| `backend/core/security/rls.py` | 3-8 | `WARNING: This is NOT database-level PostgreSQL RLS. It only filters SELECT queries issued through the SQLAlchemy ORM.` | Yes -- documents the security limitation. |
| `backend/core/sync/deal_scenario_sync.py` | 6-8 | `WARNING: This dual-write pattern can drift if one write succeeds and the other fails.` | Yes -- needs a repair/reconciliation job. |

### Lint Suppressions (eslint-disable, noqa, type: ignore, @ts-expect-error)

These are intentional suppressions, not debt per se, but worth tracking for hygiene.

#### Frontend (3 suppressions)

| File | Line | Suppression | Reason | Can Remove? |
|------|------|-------------|--------|-------------|
| `frontend/src/pages/rehab/RehabsPage.tsx` | 69 | `// eslint-disable-line react-hooks/exhaustive-deps` | Intentional empty-deps effect (runs once on mount). | No -- intentional. |
| `frontend/src/pages/Pipeline.tsx` | 368 | `{/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}` | Drag-and-drop container needs div event handlers. Has ARIA `role="grid"` and keyboard handler. | No -- accessibility is handled via ARIA. |
| `frontend/src/components/chat/ChatPanel.tsx` | 47 | `// @ts-expect-error react-markdown passes inline prop not in types` | Third-party type mismatch in react-markdown. | Not until react-markdown updates its types. |

#### Backend (noqa / type: ignore)

The backend has **~80 `noqa: E712` suppressions** across routers. These are all the same pattern:

```python
Property.is_deleted == False  # noqa: E712
```

This is required by SQLAlchemy -- `== False` generates the correct SQL `WHERE is_deleted = false`, while `is not False` would be a Python identity check. These are **not removable** without changing the ORM query pattern (e.g., using `~Property.is_deleted` or `.is_(False)`).

Other backend suppressions:

| File | Line | Suppression | Reason | Can Remove? |
|------|------|-------------|--------|-------------|
| `backend/main.py` | 73-80 | `# noqa: E402` (8 lines) | Imports after `sys.path` manipulation for Sentry init ordering. | No -- required by startup sequence. |
| `backend/alembic/env.py` | 18-19 | `# noqa: E402, F401` | Late imports after path setup; side-effect import for model registration. | No -- required by Alembic. |
| `backend/scripts/seed_demo.py` | 59 | `# noqa: E402` | Late import after path manipulation. | No -- script pattern. |
| `backend/core/tasks/__init__.py` | 64-68 | `# noqa: F401` (5 lines) | Side-effect imports to register Celery tasks. | No -- required by Celery. |
| `backend/routers/communications.py` | 73 | `sms = None  # type: ignore[assignment]` | Initializing optional SMS client to None. | Could use `Optional` typing instead. |
| `backend/routers/sequences.py` | 93 | `sms = None  # type: ignore[assignment]` | Same pattern as above. | Same -- could type more precisely. |
| `backend/routers/today.py` | 275 | `db.query(Property.id)  # type: ignore` | SQLAlchemy column type inference issue. | No -- SQLAlchemy typing limitation. |

### Commented-Out Code Blocks

_None found._ The codebase is clean of commented-out code. All comment blocks are documentation/section delimiters.

---

## Recommendations

### Immediate (before multi-tenant launch)

1. **Implement real PostgreSQL RLS** (`backend/core/security/rls.py`). The application-level filter is insufficient for defense-in-depth once team/multi-tenant features ship. Create `CREATE POLICY` / `ENABLE ROW LEVEL SECURITY` migrations.

2. **Build dual-write repair job** (`backend/core/sync/deal_scenario_sync.py`). A periodic task should scan for deals where `property_id` is null or scenario data is stale and attempt reconciliation.

### Short-term

3. **Remove deprecated Deal columns** (`backend/models/deals.py:45`). Once the AnalysisScenario migration is verified complete, drop the old `inputs`/`outputs` columns.

4. **Verify design token mappings** (6 TODOs in contacts pages). Quick visual check against the design system to confirm or update the color token assignments.

### Low priority

5. **Consider refactoring `== False` / `== True` patterns** to `~Model.column` / `.is_(False)` to eliminate the ~80 `noqa: E712` suppressions. Purely cosmetic improvement.

6. **Type the SMS client variables** (`communications.py:73`, `sequences.py:93`) more precisely to remove `type: ignore`.
