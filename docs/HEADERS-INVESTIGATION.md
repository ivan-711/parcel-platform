# Headers Investigation — 2026-04-18

## TL;DR

The frontend security headers have actually been working since April 7 — the original diagnosis was wrong because `curl parceldesk.io` hits a 307 redirect to `www.parceldesk.io`, and the redirect response only carries Vercel's default HSTS. The actual content responses on `www.parceldesk.io` DO include X-Frame-Options, X-Content-Type-Options, and Referrer-Policy from `frontend/vercel.json`. The missing header is `Permissions-Policy`, which was only added to the root `vercel.json` (created today). That file is ignored because the Vercel project's Root Directory is set to `frontend/` — so Vercel reads `frontend/vercel.json`, not the repo-root one. Fix: add `Permissions-Policy` to `frontend/vercel.json` and delete the root `vercel.json`.

Backend headers deployed successfully — all 6 security headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) are confirmed present on `api.parceldesk.io`.

---

## Section 1: vercel.json Diagnosis

### Evidence

**Two vercel.json files exist:**

| File | Created | Contains |
|------|---------|----------|
| `vercel.json` (repo root) | Today (`e74f774`) | HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy |
| `frontend/vercel.json` | Feb 28 (`ddfbc58`), updated Apr 7 (`840fcdf`) | X-Frame-Options, X-Content-Type-Options, Referrer-Policy, asset cache-control, SPA rewrite |

**Two `.vercel/project.json` files exist with identical projectId:**
- `/parcel-platform/.vercel/project.json` → `prj_agdFkG6544QAIySZ8M6KQ4BahFIC`
- `/parcel-platform/frontend/.vercel/project.json` → `prj_agdFkG6544QAIySZ8M6KQ4BahFIC`

Both are linked to the same Vercel project. This is harmless (Vercel CLI creates `.vercel/` in whatever directory you run `vercel link` from) but confusing.

**Vercel project settings (`vercel project inspect`):**
```
Root Directory:    frontend
Framework Preset:  Other
Build Command:     npm run vercel-build or npm run build
Output Directory:  public if it exists, or .
```

**Root Directory = `frontend`** — this is the root cause. Vercel only reads config files from within the root directory. The repo-root `vercel.json` is outside `frontend/` and is completely ignored.

### Header verification

**`parceldesk.io` (non-www, redirect):**
```
HTTP/2 307
location: https://www.parceldesk.io/
strict-transport-security: max-age=63072000     ← Vercel's auto-HSTS on redirect
```
No custom headers. This is a Vercel edge redirect, not a response from our app.

**`www.parceldesk.io` (actual app):**
```
HTTP/2 200
x-frame-options: DENY                           ← from frontend/vercel.json ✓
x-content-type-options: nosniff                  ← from frontend/vercel.json ✓
referrer-policy: strict-origin-when-cross-origin ← from frontend/vercel.json ✓
strict-transport-security: max-age=63072000      ← Vercel's auto-HSTS (longer than ours)
                                                   Permissions-Policy: MISSING ✗
```

**`api.parceldesk.io` (backend, Railway):**
```
HTTP/2 200
strict-transport-security: max-age=31536000; includeSubDomains  ✓
x-frame-options: DENY                                           ✓
x-content-type-options: nosniff                                 ✓
referrer-policy: strict-origin-when-cross-origin                ✓
permissions-policy: geolocation=(), microphone=(), camera=()    ✓
content-security-policy: default-src 'self'; ...                ✓
```

All 6 backend security headers are live and working.

### Root Cause

**Diagnosis (d) from the prompt: duplicate `.vercel` directories masking the real issue, which is (a): Root Directory is set to `frontend/`.**

The repo-root `vercel.json` was created today assuming Vercel reads from the repo root. It doesn't — Vercel uses `frontend/` as its root directory, so only `frontend/vercel.json` is read. The `frontend/vercel.json` that has existed since April 7 IS working — it just doesn't include `Permissions-Policy`.

### Proposed Fix

1. Add `Permissions-Policy` to `frontend/vercel.json`:
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "geolocation=(), microphone=(), camera=()" }
      ]
    },
    ...existing asset cache rule...
  ],
  ...existing rewrites...
}
```

2. Delete the root `vercel.json` — it has no effect and will confuse future developers.

3. Optionally delete `/.vercel/project.json` (keep only `frontend/.vercel/project.json`). This is cosmetic but removes the duplicate-project-link confusion.

4. HSTS: Don't add a custom value. Vercel's automatic `max-age=63072000` (2 years) is actually stronger than our custom `max-age=31536000` (1 year). Let Vercel handle frontend HSTS.

---

## Section 2: Other Pre-Launch Findings

### HIGH: FastAPI docs/redoc/openapi exposed in production

**Severity: HIGH (information disclosure)**

All three documentation endpoints are accessible on the live API:
- `https://api.parceldesk.io/docs` → 200 (Swagger UI)
- `https://api.parceldesk.io/redoc` → 200 (ReDoc)
- `https://api.parceldesk.io/openapi.json` → 200 (full OpenAPI spec)

Anyone can view the complete API specification including all endpoints, request/response schemas, and parameter definitions. While all sensitive endpoints require auth, this gives attackers a complete map of the attack surface.

**Fix:** Add to `FastAPI()` constructor in `backend/main.py`:
```python
app = FastAPI(
    ...
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)
```

### MEDIUM: Failing test reveals routing bug

**Test:** `test_financing_api.py::TestTodayIntegration::test_today_includes_financing_fields`
**Status:** Failing with 404

**Root cause:** The test calls `GET /api/today` (no trailing slash). The actual route is `/api/today/` (with trailing slash, from prefix concatenation: `/api` + `/today` + `/`). Because `redirect_slashes=False` in `main.py:32`, FastAPI does NOT auto-redirect — it returns 404.

**This is NOT related to F-3 (sporadic 401s).** F-3 is a frontend auth timing issue. This is a backend routing mismatch.

**Fix options (pick one):**
- Change endpoint decorator to `@router.get("")` instead of `@router.get("/")`
- Change the test to call `/api/today/`
- Neither: the production frontend already calls the correct URL with trailing slash, so this is a test-only issue

### LOW: SAFARI-DIAG logs verified clean

All `SAFARI-DIAG` console.log statements were removed in commit `ff1876a`. Grep confirms zero matches in current HEAD. No action needed.

### LOW: CORS secure, secrets clean

- CORS uses `FRONTEND_URL` env var, not `*`. Properly restricted.
- Git history `sk-ant`, `sk_live`, `whsec_` matches are in documentation/config templates, not hardcoded secrets.
- All env vars either have safe defaults or explicit crash-on-missing (IP_HASH_SALT).

### INFO: `access-control-allow-origin: *` on Vercel responses

Vercel's static file serving adds `access-control-allow-origin: *` to all responses. This is Vercel's default behavior for static sites and is harmless — the SPA HTML/JS/CSS contains no sensitive data (auth happens via the backend API).

---

## Section 3: Recommended Actions in Order of Priority

### Before launch

1. **Add Permissions-Policy to `frontend/vercel.json` + delete root `vercel.json`** (5 min)
   Fixes the only missing frontend security header.

2. **Disable FastAPI docs in production** (5 min)
   Set `docs_url=None, redoc_url=None, openapi_url=None` in `main.py`.
   Alternatively, gate on `ENVIRONMENT != "production"` to keep docs in dev.

### Nice to have

3. **Fix the today endpoint test** (5 min)
   Change `@router.get("/")` to `@router.get("")` in `today.py`, or fix the test URL.
   Low priority since production frontend works correctly.

4. **Clean up duplicate `.vercel/project.json`** (2 min)
   Delete `/.vercel/project.json` (keep only `frontend/.vercel/`). Cosmetic.
