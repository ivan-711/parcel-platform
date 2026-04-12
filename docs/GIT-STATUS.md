# Git Repository Audit -- Parcel Platform

**Generated:** 2026-04-12  
**Branch:** `main` (up to date with `origin/main`)

---

## 1. Current Branch & Recent Commit History

**Branch:** `main`  
**Tracking:** `origin/main` (up to date)

### Last 30 Commits

```
dc7913c fix: generate AI narrative for existing properties missing one
dfe1cc9 fix: use db.expire_all() instead of db.rollback() to avoid DetachedInstanceError
9a0802a fix: refresh stale DB connection after long-running enrichment threads
0f4449a fix: replace PlaceAutocompleteElement with headless Autocomplete Data API
9867386 fix: restructure address input as flex siblings
53abf7e fix: hide Places autocomplete clear button (multi-layer CSS)
21f2991 fix: hide Places autocomplete clear button that overlapped Analyze button
5fe9870 fix: correct Alembic down_revision to merge head for geocoding migration
bb9f6b7 feat: Google Maps foundation -- Places API (New), geocoding, production bugfixes
3753612 fix: add missing ClerkProvider routing props for OAuth callback flow
44768b4 fix: detect Clerk OAuth callback from hash fragment params
54c41e6 fix: detect Clerk OAuth callback via query params and hash to bypass TOS gate
721295c fix: TOS gate bypass for SSO callback, prevent checkbox auto-advance
88ed881 fix: TOS checkbox should not auto-advance to signup form
7319c76 chore: backend housekeeping -- CI tsc, Alembic idempotency, worker health
3690a79 feat: Coming Soon gates for unconfigured services, fix document upload 500
e7f7c43 fix: critical mobile -- dialog viewport clamp, action bar overflow, AppShell CTAs
8c39701 fix: replace hardcoded hex colors with semantic CSS variables
840fcdf feat: SEO & public presence -- meta tags, robots/sitemap, public pricing
f0f2903 feat: billing & feature gates -- trial config, tier gates, banner fixes
5538a35 feat: legal compliance -- TOS/privacy pages, cookie consent, account deletion
f3c09e5 feat: product loop completion -- Today resilience, error states, chat/PDF timeouts
35f9555 fix: financial accuracy -- chart projections, billing copy, reverse calc
3079457 feat: fix SSE analysis flow, auto-create deals, wire Save/Pipeline buttons
6377071 fix: resolve login/today redirect loop with production Clerk
d51e69c fix: remove unused vi import in integration test
676e77d feat: migrate to Clerk-only auth, remove all legacy JWT/cookie code
3036819 chore: remove API URL debug log
beb8114 fix: add upgrade-insecure-requests CSP to eliminate mixed-content
09181e8 fix: pre-launch hardening -- billing, worker, blocking I/O, tests
```

### Branches (Local & Remote)

| Branch | Type |
|--------|------|
| `main` | local + remote (current) |
| `feat/brrrr-creative-finance-calculators` | local + remote |
| `pre-dark-theme` | local + remote |
| `worktree-agent-a8b8abb3` | remote only |
| `worktree-agent-aceec8c2` | remote only |
| `worktree-agent-afb75d79` | remote only |

### Stashes

None.

---

## 2. Uncommitted Changes Summary

**149 files changed** -- 7,701 insertions(+), 4,507 deletions(-)  
**Staged:** None (all changes are unstaged)  
**Deleted files:** 5 files removed (landing page components: BackgroundPaths, FeatureSection, FeatureSections, SpiralBackground, testimonials)  
**Untracked files/dirs:** ~50 entries (new components, research docs, media assets, config files)

### Top 15 Files by Change Volume

| File | Insertions | Deletions | Notes |
|------|-----------|-----------|-------|
| `frontend/package-lock.json` | 3,709 | 50 | New dependencies added |
| `SAD/current-state-audit.md` | 603 | 752 | Documentation rewrite |
| `frontend/src/components/layout/AppShell.tsx` | 167 | 136 | Major layout refactor |
| `frontend/src/components/landing/HeroSection.tsx` | 162 | 264 | Landing page redesign |
| `frontend/src/components/landing/CTASection.tsx` | 96 | 26 | CTA rewrite |
| `frontend/src/components/financing/AddInstrumentModal.tsx` | 95 | 95 | Modal refactor |
| `frontend/src/components/landing/LandingPage.tsx` | 78 | 20 | Page composition changes |
| `frontend/src/pages/analyze/AnalyzerFormPage.tsx` | 73 | 73 | Form refactor |
| `frontend/src/pages/Dashboard.tsx` | 72 | 61 | Dashboard updates |
| `frontend/src/pages/dispositions/MatchResultsPage.tsx` | 69 | 60 | Match results UI |
| `frontend/src/components/landing/navbar.tsx` | 64 | 6 | Navbar expansion |
| `frontend/src/pages/buyers/BuyerDetailPage.tsx` | 63 | 67 | Buyer detail updates |
| `frontend/src/pages/settings/SettingsPage.tsx` | 63 | 60 | Settings page overhaul |
| `frontend/src/pages/skip-tracing/BatchSkipTracePage.tsx` | 63 | 56 | Skip trace UI updates |
| `frontend/src/pages/rehab/RehabDetailPage.tsx` | 62 | 62 | Rehab detail refactor |

### Nature of Uncommitted Changes

The uncommitted work represents a **cohesive but large** set of changes spanning:

1. **Landing page redesign ("The Architect" build)** -- HeroSection, CTASection, HowItWorks, LandingPage, navbar, footer, PricingSection, StatsStrip rewritten; old components deleted (BackgroundPaths, FeatureSection, FeatureSections, SpiralBackground, testimonials)
2. **App-wide UI theme overhaul** -- Nearly every page and component touched with design system updates (buttons, cards, inputs, dialogs, badges, etc.)
3. **Billing frontend wiring** -- LimitReachedModal, PaywallOverlay, PlanBadge, SuccessOverlay, TrialBanner, UsageMeter, BillingSettings
4. **Backend billing update** -- `stripe_service.py` modified
5. **New dependencies** -- `package.json` / `package-lock.json` changes (3,700+ lines in lockfile)
6. **New landing components** -- AINarrativeDemo, AtmosphericImage, ProblemSection, ProductPreview, StrategyTabs (untracked)
7. **CSS/Tailwind updates** -- `index.css`, `tailwind.config.ts`, motion utilities

### Untracked Files/Directories

**Should likely be committed:**
- `frontend/src/components/landing/AINarrativeDemo.tsx` -- new landing component
- `frontend/src/components/landing/AtmosphericImage.tsx` -- new landing component
- `frontend/src/components/landing/ProblemSection.tsx` -- new landing component
- `frontend/src/components/landing/ProductPreview.tsx` -- new landing component
- `frontend/src/components/landing/StrategyTabs.tsx` -- new landing component
- `frontend/src/components/ui/tabs.tsx` -- new UI component
- `frontend/public/fonts/GeneralSans-*.woff2` (4 files) -- design system fonts
- `frontend/public/images/` -- production assets (hero images, atmospheric frames)
- `frontend/public/videos/` -- hero animation videos (mp4, webm)
- `frontend/.gitignore` -- frontend-specific ignore rules
- `LEGAL/` -- legal documents
- `scripts/` -- utility scripts

**Should likely NOT be committed (development artifacts):**
- `.agents/` -- AI tool working directory
- `.mcp.json` -- MCP configuration (may contain local paths)
- `.vercel/` -- Vercel CLI local state
- `frontend/.agents/` -- AI tool working directory
- `frontend/.mcp.json` -- MCP configuration
- `frontend/skills-lock.json` -- local skill lock
- `skills-lock.json` -- local skill lock
- `package.json` / `package-lock.json` (root level) -- appears to be an accidental root-level npm init (54 bytes)
- `DESIGN.md` -- could go either way (16KB design doc)

**Research/SAD documents (commit decision depends on team preference):**
- `RESEARCH/` -- 22MB total (includes 21MB of screenshots)
- `SAD/*.md` files (12 new markdown docs) -- architecture/design audit documents
- `SAD/video-screenshots/` -- 18MB of video screenshot directories
- `SAD/video-transcripts/` -- 148KB of transcripts

---

## 3. .gitignore Audit

### Current `.gitignore` (root)

```
node_modules/
__pycache__/
*.pyc
.env
.env.local
.env*.local
venv/
dist/
.DS_Store
*.egg-info/
.vite/

# AI tool directories
.claude/
.cursor/
.aider*
```

### Frontend `.gitignore` (untracked)

```
.vercel
.env*.local
```

### Properly Ignored (confirmed)

| Pattern | Status |
|---------|--------|
| `node_modules/` | Ignored, not tracked |
| `__pycache__/` | Ignored, not tracked |
| `.env` / `.env.local` | Ignored (backend/.env, frontend/.env.local exist locally but not tracked) |
| `venv/` | Ignored, not tracked |
| `dist/` | Ignored, not tracked |
| `.DS_Store` | Ignored at root level |
| `.claude/` | Ignored, not tracked |

### Tracked Files That Should Be Ignored

| File | Issue |
|------|-------|
| `backend/.env.example` | Tracked -- this is CORRECT (example files are fine) |
| `frontend/.env.example` | Tracked -- this is CORRECT |

No secrets are being tracked. The `.env.example` files are templates and are safe to track.

### Missing from .gitignore (Recommendations)

| Pattern | Reason |
|---------|--------|
| `.agents/` | AI agent working directories (currently untracked but not ignored) |
| `.mcp.json` | MCP tool configuration (local paths, potentially sensitive) |
| `.vercel/` | Vercel CLI local state |
| `skills-lock.json` | Skill lock files (local state) |
| `*.DS_Store` | Current pattern only catches root-level; should use `**/.DS_Store` or just `.DS_Store` recursively (note: git already ignores `.DS_Store` at any level with the current pattern) |

---

## 4. Large File Inventory

### Files Over 1MB

| Size | File | In Git? |
|------|------|---------|
| 18 MB | `frontend/public/images/building-complete.png` | Untracked |
| 18 MB | `frontend/dist/images/building-complete.png` | Ignored (dist/) |
| 7.6 MB | `frontend/public/images/building-complete.jpg` | Untracked |
| 7.6 MB | `frontend/dist/images/building-complete.jpg` | Ignored (dist/) |
| 4.3 MB | `RESEARCH/screenshots/mercury-full-page.png` | Untracked |
| 2.4 MB | `RESEARCH/screenshots/fey-full-page.png` | Untracked |
| 1.6 MB | `frontend/public/videos/hero-assembly.mp4` | Untracked |
| 1.6 MB | `frontend/dist/videos/hero-assembly.mp4` | Ignored (dist/) |
| 1.4 MB | `frontend/public/videos/hero-assembly.webm` | Untracked |
| 1.4 MB | `frontend/dist/videos/hero-assembly.webm` | Ignored (dist/) |
| 1.6 MB | `RESEARCH/screenshots/mercury-01-hero.png` | Untracked |
| 1.1 MB | `RESEARCH/screenshots/mercury-02-scroll.png` | Untracked |

### Frame Sequence Directories (Animation Assets)

| Directory | Files | Size | Purpose |
|-----------|-------|------|---------|
| `frontend/public/images/hero-frames/` | 121 frames | 7.2 MB | Hero animation frames |
| `frontend/public/images/atmospheric-dwelling-frames/` | 48 frames | 1.5 MB | Atmospheric animation |
| `frontend/public/images/atmospheric-hour-frames/` | 48 frames | 1.4 MB | Atmospheric animation |
| `frontend/public/videos/frames/` | 121 frames | 18 MB | Video frame sequence |

**Total frame sequences: 338 individual files, ~28 MB**

---

## 5. Directory Size Breakdown

### Production Assets

| Directory | Size | Notes |
|-----------|------|-------|
| `frontend/public/images/` | 36 MB | Includes hero images + 3 frame directories |
| `frontend/public/videos/` | 21 MB | Hero video (mp4/webm) + frame directory |
| `frontend/public/fonts/` | 184 KB | GeneralSans woff2 files |
| `frontend/public/` (total) | 58 MB | All public assets |
| `frontend/dist/` | 69 MB | Build output (properly ignored) |

### Development/Research Artifacts

| Directory | Size | Notes |
|-----------|------|-------|
| `RESEARCH/screenshots/` | 21 MB | 37 reference site screenshots |
| `SAD/designs/` | 12 MB | 22 design mockup PNGs |
| `SAD/video-screenshots/` | 18 MB | 11 video screenshot directories |
| `SAD/video-transcripts/` | 148 KB | Transcript text files |
| `screenshots/` | 1 MB | Development screenshots |
| `RESEARCH/` (total) | 22 MB | All research materials |
| `SAD/` (total) | 31 MB | All architecture/design docs |

### Repository Size

| Metric | Size |
|--------|------|
| Total repo (excl. node_modules, venv, .git) | ~988 MB |
| `frontend/dist/` (build output, ignored) | 69 MB |
| Estimated working tree without build artifacts | ~920 MB |
| Tracked files count | 776 files |

---

## 6. Recommendations

### HIGH PRIORITY -- Commit Soon

These changes represent substantial feature work that is at risk if only on the local machine:

1. **Landing page redesign** -- All new landing components (AINarrativeDemo, AtmosphericImage, ProblemSection, ProductPreview, StrategyTabs, tabs.tsx), modified landing files (HeroSection, CTASection, HowItWorks, navbar, footer, PricingSection, StatsStrip, LandingPage), and deleted files (BackgroundPaths, FeatureSection, FeatureSections, SpiralBackground, testimonials). This is a cohesive feature.

2. **App-wide theme/UI overhaul** -- ~100+ modified component/page files with design system token updates (buttons, cards, inputs, modals, pages). This is a second cohesive feature.

3. **Billing frontend wiring** -- Billing components + stripe_service.py changes.

4. **Production assets** -- Fonts (GeneralSans woff2), hero images, hero videos, frame sequences. These are needed for the landing page to work.

5. **New dependencies** -- `package.json` and `package-lock.json` changes.

**Recommendation:** Consider splitting into 2-3 focused commits:
- Landing page redesign (new components + modified landing files + deleted files + assets)
- App-wide UI/theme overhaul (all other component/page modifications)
- Billing updates (billing components + stripe_service.py)

### MEDIUM PRIORITY -- Add to .gitignore

Add these patterns to the root `.gitignore`:

```gitignore
# AI agent directories
.agents/
.mcp.json

# Vercel local state
.vercel/

# Skill lock files
skills-lock.json
```

### MEDIUM PRIORITY -- Git LFS Candidates

The following should use Git LFS if they are committed to the repository:

| Asset | Size | Reason |
|-------|------|--------|
| `building-complete.png` | 18 MB | Large raster image |
| `building-complete.jpg` | 7.6 MB | Large raster image |
| `hero-assembly.mp4` | 1.6 MB | Video file |
| `hero-assembly.webm` | 1.4 MB | Video file |
| `hero-frames/` (121 files) | 7.2 MB | Frame sequence |
| `atmospheric-*-frames/` (96 files) | 2.9 MB | Frame sequences |
| `videos/frames/` (121 files) | 18 MB | Video frame sequence |

**Total LFS candidates: ~57 MB of binary assets**

Without LFS, every clone of the repo will download all historical versions of these files, bloating the `.git` directory over time.

### LOW PRIORITY -- Evaluate for Exclusion

These directories are development/research artifacts. Decide whether they belong in the repo:

| Directory | Size | Recommendation |
|-----------|------|----------------|
| `RESEARCH/screenshots/` | 21 MB | Consider excluding -- reference site screenshots are one-time research. Add to `.gitignore` or move to external storage. |
| `SAD/video-screenshots/` | 18 MB | Consider excluding -- video research screenshots. |
| `SAD/designs/` | 12 MB | Could stay if the team references them; otherwise exclude. |
| `screenshots/` | 1 MB | Likely dev artifacts -- exclude or clean up. |

### LOW PRIORITY -- Cleanup

1. **Root-level `package.json` / `package-lock.json`** -- These are untracked and appear to be an accidental `npm init` at the repo root (package.json is only 54 bytes). The real frontend lives in `frontend/`. Consider deleting these if they serve no purpose, or add to `.gitignore`.

2. **Remote worktree branches** -- Three `worktree-agent-*` branches exist on the remote. If these were temporary agent work branches, consider deleting them:
   - `origin/worktree-agent-a8b8abb3`
   - `origin/worktree-agent-aceec8c2`
   - `origin/worktree-agent-afb75d79`

3. **Duplicate frame sequences** -- `frontend/public/images/hero-frames/` (121 files, 7.2MB) and `frontend/public/videos/frames/` (121 files, 18MB) may be duplicates at different resolutions/formats. Verify whether both are needed.

4. **`frontend/.gitignore`** -- This file is untracked. It should be committed (it adds `.vercel` and `.env*.local` patterns specific to the frontend).
