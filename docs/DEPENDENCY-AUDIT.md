# Dependency Audit

**Date:** 2026-04-12
**Scope:** Frontend (npm) and Backend (pip) packages

## Summary

| Metric | Count |
|---|---|
| Frontend dependencies | 36 deps, 14 devDeps |
| Backend packages | 24 |
| Security vulnerabilities | 6 (1 critical, 4 high, 1 moderate) |
| Unused packages | 3 frontend, 0 backend |
| Major version behind | 12 frontend packages |
| Backend packages with loose pinning | 24/24 (all use `>=` ranges) |

---

## Frontend Dependencies

### Security Vulnerabilities

**6 vulnerabilities found** (1 critical, 4 high, 1 moderate). All have fixes available via `npm audit fix`.

| Package | Severity | Issue | Pulled in by |
|---|---|---|---|
| **jspdf** <=4.2.0 | **CRITICAL** | HTML Injection in New Window paths (CVSS 9.6) + PDF Object Injection via FreeText color (CVSS 8.1) | Direct dependency |
| **lodash** <=4.17.23 | HIGH | Code Injection via `_.template` (CVSS 8.1) + Prototype Pollution via `_.unset`/`_.omit` | recharts |
| **undici** 7.0.0-7.23.0 | HIGH | WebSocket overflow crash, HTTP Smuggling, Unbounded Memory, CRLF Injection (6 advisories) | jsdom (devDep) |
| **vite** <=6.4.1 | HIGH | Path Traversal in optimized deps `.map` handling + Arbitrary File Read via WebSocket | Direct devDep |
| **picomatch** <2.3.2 / 4.0.0-4.0.3 | HIGH | ReDoS via extglob quantifiers + Method Injection in POSIX classes | vite, vitest, tinyglobby |
| **dompurify** <=3.3.1 | MODERATE | mutation-XSS, ADD_ATTR URI validation skip, USE_PROFILES prototype pollution (4 advisories) | jspdf |

**Priority actions:**
1. `jspdf` -- CRITICAL. Update to latest patched version immediately (check >=4.2.1).
2. `vite` -- HIGH but dev-only. Update `vite` to >=6.4.2 (resolves picomatch too).
3. `jsdom` / `undici` -- HIGH but dev-only (test runner). Update jsdom to >=29.x.
4. `lodash` via `recharts` -- indirect. Recharts 3.x drops lodash; upgrading recharts resolves this.

### Unused Packages

Confirmed unused in source code (verified via grep):

| Package | Type | Size on disk | Notes |
|---|---|---|---|
| `@react-pdf/renderer` | dependency | 3.0 MB | Not imported anywhere in `src/`. Remove. |
| `gsap` | dependency | 6.3 MB | Not imported anywhere in `src/`. Remove. |
| `next-themes` | dependency | small | Not imported in `src/`. Only `sonner.tsx` references theme but uses a custom `useTheme` hook, not next-themes. Remove. |
| `@testing-library/user-event` | devDependency | small | No test files import it. Keep if planning to write tests, otherwise remove. |
| `@types/google.maps` | devDependency | small | Used -- `PlaceAutocompleteInput.tsx` uses `google.maps` types. Depcheck false positive. **Keep.** |
| `autoprefixer` | devDependency | small | Required by PostCSS/Tailwind pipeline even if not directly imported. **Keep.** |
| `postcss` | devDependency | small | Required by Tailwind build. **Keep.** |
| `shadcn` | devDependency | small | CLI tool for adding components. Used via `npx shadcn`. **Keep.** |

**Savings from removing truly unused packages:** ~9.3 MB from node_modules, reduced bundle size.

### Outdated / Risky Packages

#### Major Versions Behind

| Package | Current | Latest | Gap | Risk |
|---|---|---|---|---|
| `lucide-react` | 0.468.0 | 1.8.0 | v0.x -> v1.x | **Still on v0.x.** v1.0 shipped; icon API may have changed. |
| `recharts` | 2.15.x | 3.8.x | v2 -> v3 | Major rewrite. v3 drops lodash (fixes vuln). Breaking API changes. |
| `react` / `react-dom` | 18.3.1 | 19.2.5 | v18 -> v19 | React 19 available. Not urgent but plan migration. |
| `react-router-dom` | 6.30.x | 7.14.0 | v6 -> v7 | v7 is a major shift (Remix merge). Large migration effort. |
| `framer-motion` | 11.18.x | 12.38.0 | v11 -> v12 | Check changelog for breaking changes. |
| `zustand` | 4.5.x | 5.0.x | v4 -> v5 | v5 has breaking changes in middleware API. |
| `tailwindcss` | 3.4.x | 4.2.x | v3 -> v4 | Major config/plugin changes in v4. Large migration. |
| `tailwind-merge` | 2.6.x | 3.5.x | v2 -> v3 | Should align with tailwindcss version. |
| `@dnd-kit/sortable` | 8.0.0 | 10.0.0 | v8 -> v10 | Two major versions behind. |
| `vite` | 6.4.x | 8.0.x | v6 -> v8 | Two majors behind. v8 released. Update also fixes security vuln. |
| `@vitejs/plugin-react` | 4.7.0 | 6.0.1 | v4 -> v6 | Should match vite major. |
| `typescript` | 5.9.x | 6.0.x | v5 -> v6 | TS 6.0 just released. Not urgent. |

#### v0.x Packages

| Package | Version | Notes |
|---|---|---|
| `lucide-react` | 0.468.0 | v1.0 has been released. Should upgrade. |
| `class-variance-authority` | 0.7.1 | Still pre-1.0. Stable in practice, widely used. Low risk. |

#### Dev-Only Pre-Release

| Package | Version | Notes |
|---|---|---|
| `lenis` | 1.3.18-dev.1 | Running a **-dev prerelease** version. Should pin to stable 1.3.21. |

### Heaviest Packages (node_modules disk size)

| Package | Size | Notes |
|---|---|---|
| `lucide-react` | 36 MB | Extremely large. Tree-shaking mitigates bundle impact but slows installs. |
| `jspdf` | 29 MB | Large. Used in 2 files. Consider lazy-loading. |
| `@clerk` | 8.3 MB | Auth provider. Required. |
| `gsap` | 6.3 MB | **UNUSED. Remove.** |
| `zod` | 6.0 MB | Validation library. Required. |
| `recharts` | 5.2 MB | Chart library. Required. |
| `@tanstack` | 4.3 MB | Query library. Required. |
| `framer-motion` | 3.8 MB | Animation library. Required. |
| `@react-pdf/renderer` | 3.0 MB | **UNUSED. Remove.** |

### Duplicate/Peer Dependency Issues

- No UNMET PEER or INVALID dependencies detected.
- No peer dependency warnings.
- Many packages properly deduped (react, react-dom, tslib, @types/react).
- **Clean dependency tree overall.**

### Missing Dependencies

| Package | Notes |
|---|---|
| `@emotion/is-prop-valid` | Required by `framer-motion` at runtime. Depcheck flagged it as missing. May cause issues in production builds. Consider adding as explicit dependency. |

---

## Backend Dependencies

### Python Runtime
- **Python 3.11.12** (specified in `runtime.txt`)
- Python 3.11 is supported until October 2027. Current and safe.

### Version Pinning Status

**All 24 packages use `>=` (minimum version) ranges -- none are pinned to exact versions.**

This is risky for production reproducibility. A fresh `pip install` could pull a newer, potentially breaking version at any time.

| Package | Constraint | Concern |
|---|---|---|
| `fastapi>=0.115.0` | Open range | FastAPI ships frequent breaking changes in minor versions |
| `uvicorn[standard]>=0.32.0` | Open range | |
| `sqlalchemy>=2.0.0` | Open range | Very broad -- allows any 2.x |
| `alembic>=1.14.0` | Open range | |
| `psycopg2-binary>=2.9.0` | Open range | Binary wheel; ok for dev, not recommended for production |
| `python-dotenv>=1.0.0` | Open range | |
| `anthropic>=0.40.0` | Open range | SDK changes frequently |
| `python-jose[cryptography]>=3.3.0` | Open range | **python-jose is unmaintained** (see below) |
| `python-multipart>=0.0.12` | Open range | |
| `pydantic>=2.0.0` | Open range | |
| `pydantic-settings>=2.0.0` | Open range | |
| `boto3>=1.35.0` | Open range | |
| `pdfplumber>=0.11.0` | Open range | |
| `python-docx>=1.1.0` | Open range | |
| `resend>=2.0.0` | Open range | |
| `slowapi>=0.1.9` | Open range | |
| `stripe>=8.0.0` | Open range | |
| `sentry-sdk[fastapi]>=2.0.0` | Open range | |
| `posthog>=3.0.0` | Open range | |
| `pgvector>=0.3.0` | Open range | |
| `openai>=1.0.0` | Open range | SDK changes frequently |
| `playwright>=1.49.0` | Open range | Very large package (browsers) |
| `dramatiq[redis]>=1.16.0` | Open range | |
| `clerk-backend-api>=1.0.0` | Open range | |

**Recommendation:** Generate a `requirements.lock` or use `pip freeze > requirements.lock` from your deployed environment to pin exact versions. Consider migrating to `pyproject.toml` + `uv` or `poetry` for proper lockfile support.

### Unused Packages

All 24 packages are imported somewhere in the backend source code. **No unused packages detected.**

| Package | Import found in |
|---|---|
| fastapi | 35 files (main.py, all routers, tier_gate, etc.) |
| uvicorn | 0 direct imports -- used as ASGI server via CLI (`uvicorn main:app`). **Expected.** |
| sqlalchemy | 109 files (models, routers, database.py, etc.) |
| alembic | 32 files (migrations, env.py) |
| psycopg2-binary | 0 direct imports -- used as SQLAlchemy database driver. **Expected.** |
| python-dotenv | 6 files (main.py, database.py, scripts, etc.) |
| anthropic | 5 files (AI services: processor, narrator, chat, contextualizer, offer_letter) |
| python-jose | 1 file (core/security/clerk.py via `from jose import ...`) |
| python-multipart | 0 direct imports -- required by FastAPI for form/file uploads. **Expected.** |
| pydantic | 31 files (all schemas, config, etc.) |
| pydantic-settings | 1 file (core/billing/config.py) |
| boto3 | 1 file (core/storage/s3_service.py) |
| pdfplumber | 1 file (core/documents/extractor.py) |
| python-docx | 1 file (core/documents/extractor.py) |
| resend | 1 file (core/email.py) |
| slowapi | 2 files (limiter.py, main.py) |
| stripe | 2 files (webhooks/__init__.py, billing/stripe_service.py) |
| sentry-sdk | 2 files (main.py, core/tasks/__init__.py) |
| posthog | 1 file (core/telemetry.py -- lazy import) |
| pgvector | 1 file (models/document_chunks.py) |
| openai | 1 file (core/ai/embeddings.py) |
| playwright | 1 file (core/tasks/pdf_generation.py) |
| dramatiq | 6 files (all task workers, __init__.py, health) |
| clerk-backend-api | 0 direct imports -- but `clerk` SDK is used via `jose` for JWT verification. **Verify if this package is still needed** since there are no `clerk_backend_api` imports. |

### Missing Packages

Packages imported in backend code but NOT listed in requirements.txt:

| Package | Used in | Notes |
|---|---|---|
| **httpx** | 5 files (twilio_sms, batchdata_provider, sendgrid_email, lob_provider, bricked) | Likely installed as a transitive dependency of `anthropic` or `openai`, but should be **explicitly declared** since it is directly imported. |

### Known Security / Maintenance Concerns

| Package | Issue | Severity |
|---|---|---|
| **python-jose** | Effectively **unmaintained** since 2022. No releases in 3+ years. Known vulnerabilities in older versions. The community has migrated to `PyJWT` or `joserfc`. | HIGH |
| **psycopg2-binary** | The `-binary` variant is not recommended for production by the psycopg2 maintainers. It bundles its own libpq which can have version mismatches. Use `psycopg2` (source build) or migrate to `psycopg` (v3). | LOW |
| **playwright** | Bundles full browser binaries (~500 MB). Heavy for a backend dependency. Ensure browsers are installed in your Docker image / Railway deployment. | LOW (operational) |

---

## Recommendations

### P0 -- Security (do now)

1. **Update `jspdf` to >=4.2.1** -- CRITICAL HTML injection vulnerability (CVSS 9.6). Direct dependency.
2. **Replace `python-jose` with `PyJWT` or `joserfc`** -- unmaintained since 2022, known CVEs. Only used in `core/security/clerk.py`.
3. **Add `httpx` to `requirements.txt`** -- used in 5 backend files but not declared. Could break if a transitive provider stops depending on it.

### P1 -- Hygiene (this sprint)

4. **Remove unused frontend packages:** `gsap` (6.3 MB), `@react-pdf/renderer` (3 MB), `next-themes`. Saves ~9.3 MB and reduces attack surface.
5. **Pin `lenis` to stable** -- currently on `1.3.18-dev.1` prerelease. Pin to `^1.3.21`.
6. **Run `npm audit fix`** -- resolves vite, picomatch, undici, dompurify vulnerabilities (all dev-only or transitive).
7. **Pin backend dependencies** -- generate `requirements.lock` with exact versions from production. At minimum, change `>=` to `~=` (compatible release) to prevent surprise major version jumps.

### P2 -- Maintenance (next cycle)

8. **Upgrade `lucide-react` to v1.x** -- currently on v0.468.0, v1.0 has shipped. May require icon name changes.
9. **Upgrade `recharts` to v3.x** -- eliminates lodash vulnerability, modernizes chart API.
10. **Upgrade `vite` to latest 6.x or 8.x** -- resolves path traversal vuln and picomatch ReDoS.
11. **Add `@emotion/is-prop-valid`** as explicit dependency (required by framer-motion at runtime).
12. **Evaluate `clerk-backend-api`** -- no direct imports found. May be vestigial if JWT verification is done via `python-jose` directly. Remove if unused.

### P3 -- Strategic (plan for)

13. **React 19 migration** -- plan upgrade path from React 18 to 19.
14. **Tailwind v4 migration** -- significant config changes required.
15. **react-router v7 migration** -- major architectural shift (Remix merge).
16. **Consider `psycopg` v3** to replace `psycopg2-binary` for better async support and maintained binary builds.
17. **Consider `uv` or `poetry`** for Python dependency management with proper lockfile support.
