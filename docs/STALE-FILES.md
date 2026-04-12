# Stale File Cleanup Recommendations

## Summary
- Files/directories to delete: 14
- Files/directories to archive (move out of repo): 8
- Items to assess (need your decision): 5
- Files OK to keep: 11

Estimated reclaimable space in working tree: ~57 MB
Estimated reclaimable space in git history (tracked items): ~14 MB

---

## By Category

### 1. Backup/Old Files

No `.bak`, `.old`, `.orig`, `.copy`, `*~`, or `.backup` files found. Clean.

However, there is one **versioned duplicate** pattern:

| File | Size | Recommendation | Notes |
|------|------|----------------|-------|
| `backend/routers/portfolio.py` | 5.5 KB | **Assess** | Mounted at `/api/v1` while `portfolio_v2.py` (12 KB) is mounted at `/api`. Both are imported in `main.py`. If v1 has no active consumers, it should be removed. |
| `SAD/LANDING-PAGE-REDESIGN-V2.md` | -- | **OK** | Naming reflects iteration, not a stale copy. Part of SAD workflow. |

### 2. Generated / Build Files

| Item | Size | Tracked in Git? | Recommendation | Notes |
|------|------|-----------------|----------------|-------|
| `frontend/dist/` | 499 files | No | **OK** | Correctly in `.gitignore`. Build output, not tracked. |
| `__pycache__/` (29 dirs outside venv) | 2.4 MB | No | **Delete** | Listed in `.gitignore` but not cleaned up locally. Includes root-level `__pycache__/` with `random.cpython-314.pyc` and `table_decoder.cpython-314.pyc`. Run `find . -name "__pycache__" -not -path "*/venv/*" -exec rm -rf {} +` |
| `backend/.pytest_cache/` | 32 KB | No | **Delete** | Test cache. Add `.pytest_cache/` to `.gitignore` for safety. |
| `.DS_Store` (2 files) | ~16 KB | No | **Delete** | At root and `RESEARCH/`. Already in `.gitignore` but not cleaned. |

### 3. Temporary / Development Files

| File | Size | Recommendation | Notes |
|------|------|----------------|-------|
| `table_decoder.py` (root) | 1 KB | **Delete** | Decodes messages from Markdown tables via URL fetch. Not imported anywhere in backend, frontend, or scripts. Has its own `__pycache__` entry. Appears to be a one-off coding challenge or utility -- not part of the platform. **Tracked in git.** |
| `scripts/kie_api.py` | 14 KB | **Assess** | Wrapper around kie.ai API for atmospheric image generation pipeline. Not referenced from backend or frontend code. Has its own `__pycache__/`. May be a standalone tool used manually for asset generation. If still needed, consider moving to a `tools/` directory outside the main repo. |
| `scripts/__pycache__/` | -- | **Delete** | Compiled cache for `kie_api.py`. |

### 4. Empty / Placeholder Files

| File | Size | Recommendation | Notes |
|------|------|----------------|-------|
| `backend/routers/__init__.py` | 0 B | **OK** | Required Python package marker. |
| `backend/core/*/__init__.py` (12 files) | 0 B each | **OK** | Required Python package markers. All legitimate. |
| `backend/tests/__init__.py` | 0 B | **OK** | Required Python package marker. |

All empty files found are Python `__init__.py` files. No stale placeholders.

### 5. Redundant Documentation Directories

These are **AI agent research/design output** directories from planning phases. All are tracked in git. None are referenced at runtime. Some front-end code has comments referencing `LUXURY-DESIGN-SYSTEM.md` (3 files in `frontend/src/`), but these are documentation references in comments only.

| Directory | Files Tracked | Size | Recommendation | Notes |
|-----------|--------------|------|----------------|-------|
| `RESEARCH/` | 46 files | 22 MB | **Archive** | 58 research docs + 38 competitor screenshots (21 MB of PNGs, **untracked**). The markdown research is tracked. Screenshots are not tracked but bloat the working tree. |
| `RESEARCH/screenshots/` | 0 (untracked) | 21 MB | **Delete** | Competitor UI screenshots (Fey, Mercury, etc.). Not tracked in git, not referenced anywhere. Pure working-tree clutter. |
| `LUXURY-DESIGN/` | 20 files | 600 KB | **Archive** | Pre-implementation luxury dark design system. 19 agent specs + master doc. Superseded by `DESIGN.md` at root. Referenced in 3 code comments. |
| `LUXURY-RESEARCH/` | 18 files | 424 KB | **Archive** | Research backing the luxury design. Superseded. |
| `UI-DESIGN/` | 20 files | 884 KB | **Archive** | Light-theme design system (dated 2026-03-30). Superseded by the luxury dark redesign. |
| `UI-RESEARCH/` | 18 files | 468 KB | **Archive** | Research backing the light UI design. Superseded. |
| `BILLING-DESIGN/` | 20 files | 1.4 MB | **Archive** | Billing system design specs. Per memory, billing backend is COMPLETE. These are build-phase artifacts. |
| `BILLING-RESEARCH/` | 18 files | 708 KB | **Archive** | Billing research. Same lifecycle as BILLING-DESIGN. |
| `SAD/video-screenshots/` | 0 (untracked) | 18 MB | **Delete** | 238 video frame screenshots across 11 video directories. Not tracked in git. Working-tree-only artifacts from video research. |
| `SAD/video-transcripts/` | 0 (untracked) | 148 KB | **Assess** | 11 video transcripts. Not tracked in git. May have ongoing reference value for landing page copy. |
| `SAD/designs/` | 64 files tracked | 12 MB | **Assess** | Design mockup PNGs. Tracked in git (bloating history). Useful reference but could be moved to external storage. |
| `screenshots/` (root) | 4 files tracked | 1 MB | **Archive** | Early development screenshots (dashboard.png, pipeline.png, etc.) from March 4. Tracked in git. Likely README illustrations from initial commit era. |

**Subtotal of archivable/deletable documentation:** ~56 MB working tree, ~14 MB in git history.

### 6. Duplicate Content

| Source | Duplicate | Verdict |
|--------|-----------|---------|
| `LEGAL/PRIVACY-POLICY.md` | `frontend/public/legal/privacy-policy.md` | **Exact duplicate.** LEGAL/ directory is untracked. The frontend/public copy is the canonical one served to users. Delete `LEGAL/` or stop maintaining it separately. |
| `LEGAL/TERMS-OF-SERVICE.md` | `frontend/public/legal/terms-of-service.md` | **Exact duplicate.** Same situation. |
| `LEGAL/COMPLIANCE-COPY.md` | (no duplicate) | Unique file with UI copy snippets for compliance. Untracked. If valuable, track it or move to SAD/. |
| `LUXURY-DESIGN/` vs `UI-DESIGN/` | -- | **Parallel variants**, not duplicates. LUXURY is dark-theme, UI is light-theme. Same agent structure (19-20 files each) but different content. Both are superseded by `DESIGN.md`. |
| `DESIGN.md` (root, 370 lines) | `LUXURY-DESIGN/LUXURY-DESIGN-SYSTEM.md` (1447 lines) | DESIGN.md appears to be a condensed/current version. The LUXURY doc is the full pre-build spec. Not exact duplicates. |

### 7. Root-Level Files

| File | Size | Tracked? | Recommendation | Notes |
|------|------|----------|----------------|-------|
| `table_decoder.py` | 1 KB | Yes | **Delete** | Orphan utility. Not imported anywhere. See Section 3. |
| `package.json` | 54 B | Yes | **Assess** | Contains only `{ "devDependencies": { "shadcn": "^4.2.0" } }`. This exists to support the shadcn MCP server at root level. The real app package.json is at `frontend/package.json`. May confuse contributors. Consider moving shadcn dep to frontend. |
| `package-lock.json` | 162 KB | Yes | **Assess** | Lock file for the root `package.json`. Only locks shadcn. Same concern -- could live in frontend. |
| `node_modules/` (root) | ~9 MB | No | **OK** | In `.gitignore`. Local install for root package.json (shadcn MCP). |
| `skills-lock.json` | 612 B | Yes | **OK** | Claude Code skill lock file for Stripe skills. Part of the `.agents/` tooling ecosystem. Needed for reproducible skill resolution. |
| `.mcp.json` | 135 B | No | **OK** | MCP server config (shadcn). Part of development tooling. |
| `DEPLOY-CHECKLIST.md` | 11 KB | Yes | **OK** | Active operational reference for deploys. Keep. |
| `DESIGN.md` | 15 KB | Yes | **OK** | Current canonical design system reference. Referenced by active code. Keep. |
| `HANDOFF-2-DESIGN-PHASE.md` | 19 KB | Yes | **Archive** | Session handoff document from April 1-2. Historical context for Claude sessions. No runtime value. Could move to SAD/. |
| `UI-REDESIGN-SUMMARY.md` | 27 KB | Yes | **Archive** | Summary from March 30 redesign. Historical. Superseded by DESIGN.md and actual implementation. |
| `README.md` | 9 KB | Yes | **OK** | Standard repo README. Keep. |
| `LICENSE` | 1 KB | Yes | **OK** | Keep. |
| `.gitignore` | 151 B | Yes | **OK** | Keep. Needs additions (see Recommendations). |

### 8. IDE / Tool Artifacts

| Item | Tracked? | Recommendation | Notes |
|------|----------|----------------|-------|
| `.DS_Store` (root) | No | **Delete** | Already in `.gitignore`. Just needs local cleanup. |
| `RESEARCH/.DS_Store` | No | **Delete** | Same. |
| `.vscode/` | Does not exist | **OK** | No IDE config committed. |
| `.idea/` | Does not exist | **OK** | Clean. |
| `.vercel/` | Not tracked | **OK** | Vercel project config. Local only. Should be in `.gitignore` (currently not listed). |
| `.agents/` | Not tracked | **OK** | Claude Code skill cache. In `.gitignore` via `.claude/` pattern -- but `.agents/` is NOT covered by `.gitignore`. Should add it. |
| `.planning/` | Not tracked | **OK** | GSD planning cache. Same concern -- not explicitly in `.gitignore`. |
| `docs/superpowers/` | Tracked (22 files) | **OK** | Superpowers skill plans/specs. Historical but lightweight. |

---

## Recommendations

Priority-ordered cleanup actions:

### P0 -- Quick wins (safe to do now)

1. **Delete `table_decoder.py`** at root -- orphan file, not imported anywhere, tracked in git.

2. **Delete all `__pycache__/` directories** outside venv:
   ```bash
   find . -name "__pycache__" -not -path "*/venv/*" -exec rm -rf {} + 2>/dev/null
   ```

3. **Delete `.DS_Store` files**:
   ```bash
   find . -name ".DS_Store" -delete
   ```

4. **Delete `backend/.pytest_cache/`**:
   ```bash
   rm -rf backend/.pytest_cache/
   ```

5. **Delete untracked screenshot/video directories** (not in git, just clutter):
   ```bash
   rm -rf RESEARCH/screenshots/
   rm -rf SAD/video-screenshots/
   ```
   This alone recovers ~39 MB from the working tree.

6. **Update `.gitignore`** -- add these missing entries:
   ```
   .vercel/
   .agents/
   .planning/
   .pytest_cache/
   ```

### P1 -- Archive (move out of active repo)

7. **Move superseded design/research directories** to an `_archive/` directory or a separate branch:
   - `LUXURY-DESIGN/`
   - `LUXURY-RESEARCH/`
   - `UI-DESIGN/`
   - `UI-RESEARCH/`
   - `BILLING-DESIGN/`
   - `BILLING-RESEARCH/`
   - `HANDOFF-2-DESIGN-PHASE.md`
   - `UI-REDESIGN-SUMMARY.md`
   - `screenshots/` (root)

   These total ~5.5 MB tracked in git. They served their purpose during design phases and are now superseded. Moving them to a `git archive` branch or `_archive/` keeps history accessible without polluting the working tree.

### P2 -- Assess (needs your decision)

8. **`LEGAL/` directory** -- 3 files, all untracked. Privacy Policy and Terms are exact duplicates of `frontend/public/legal/`. Either delete LEGAL/ or track it and remove the frontend copies. COMPLIANCE-COPY.md is unique and potentially valuable -- move it somewhere permanent if you want to keep it.

9. **`backend/routers/portfolio.py` vs `portfolio_v2.py`** -- Both are imported and mounted in `main.py` at different prefixes (`/api/v1` vs `/api`). If no clients are hitting `/api/v1/portfolio/*`, the v1 router can be removed.

10. **`scripts/kie_api.py`** -- Standalone image generation tool. If still used for asset creation, keep it but consider a `tools/` directory. If one-time use is done, delete it.

11. **Root `package.json` / `package-lock.json`** -- Only purpose is the shadcn MCP dev dependency. This works but creates a confusing dual-package-manager setup. Consider moving the dependency to `frontend/package.json` or documenting why it exists at root.

12. **`SAD/designs/` (64 tracked PNGs, 12 MB)** -- These are design mockups tracked in git history. They bloat the repo. Consider moving to external storage (S3, Figma, etc.) and removing from git. Use `git filter-branch` or BFG to clean history if repo size matters.

### P3 -- Consider for future

13. **`RESEARCH/` directory (46 tracked MDs)** -- 1 MB of markdown research. Still potentially useful for onboarding new contributors or revisiting decisions. Low cost to keep. The 21 MB was from untracked screenshots (handled in P0).

14. **`SAD/` directory** -- 31 MB total, but most of that is `designs/` (12 MB) and `video-screenshots/` (18 MB, untracked). The markdown files are the project's systems analysis backbone. Keep the MDs, handle the images per P0 and P2.
