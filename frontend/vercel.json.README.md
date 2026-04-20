# `frontend/vercel.json` — notes

vercel.json is strict JSON (no comments allowed, no unknown top-level keys —
Vercel's cloud deploy rejects files with a top-level `_comment`, even though
the CLI tolerates them locally). This file captures what would otherwise be
inline comments.

## Why `/ingest/:path(.*)` and NOT `/ingest/:path*`

The PostHog JS SDK hits these endpoints with **trailing slashes** every time:

- `POST /ingest/e/`
- `POST /ingest/i/v0/e/`
- `POST /ingest/decide/`
- `POST /ingest/batch/`
- `GET  /ingest/decide/`
- `GET  /ingest/flags/`

**Vercel's `:path*` matcher does NOT match URLs ending in `/`.** Confirmed via
the production curl matrix (see `/tmp/vercel-ingest-diagnosis.md` or the commit
that introduced the fix):

| URL | Rule `:path*` | Rule `:path(.*)` |
|---|---|---|
| `/ingest/decide` | ✅ matches | ✅ matches |
| `/ingest/decide/` | ❌ falls through to SPA catch-all → `index.html` → 405 | ✅ matches |
| `/ingest/e/` POST | ❌ 405 | ✅ proxies |

Named regex `:path(.*)` is the path-to-regexp form that unambiguously captures
everything, including trailing slashes. The destination then uses the named
param `:path` (no asterisk) to interpolate the captured value.

**If you restructure these rewrites, keep the `:path(.*)` form**, or update the
regression smoke test at `.github/workflows/posthog-proxy-smoke.yml` accordingly.

## Why not `trailingSlash: false` at the top level

Setting `"trailingSlash": false` would redirect every URL app-wide to drop its
trailing slash — including routes we don't control (PostHog endpoints we're
proxying to). A project-wide URL shape change is out of scope for a fix to one
family of rewrites.

## Related

- `docs/PERSONA-DIFFERENTIATION-AUDIT.md` — why we need the telemetry this
  proxy carries.
- `.github/workflows/posthog-proxy-smoke.yml` — post-deploy guard that fails
  CI if any trailing-slash `/ingest/*` URL ever regresses to serving index.html
  again.
