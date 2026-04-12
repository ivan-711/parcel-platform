# SAD Directory Manifest

_Generated: 2026-04-12_
_Total files: 51 markdown, 43 images (designs/), 11 video transcripts, 238 video screenshots, 11 video screenshot directories_

## Summary

The SAD (Software Architecture Documents) directory is the strategic brain of Parcel Platform. It contains the complete product planning lifecycle: from initial research audits and persona development, through multiple rounds of product blueprinting and adversarial review, to landing page creative direction and UI compliance audits. The directory grew organically over ~10 days (April 2-12, 2026) and reflects rapid iteration -- multiple blueprint variants exist because they were authored by different AI models (Claude Code vs Codex) before being reconciled into a canonical version.

**Overall state:** The core planning documents (blueprint, personas, domain model) remain valid and are actively referenced. The adversarial reviews are a valuable historical record of quality gates. The landing page docs are the most layered -- six documents track a redesign that went through research, creative direction, build, two overhauls, and two final audits. Several documents are now superseded or partially stale.

---

## Files by Category

### Blueprints & Core Specs

| File | Type | Date | Status | Recommendation | Notes |
|------|------|------|--------|----------------|-------|
| `CANONICAL-PRODUCT-BLUEPRINT.md` | blueprint | Apr 3 | **Current -- THE source of truth** | **KEEP** | 52KB. Reconciled from Claude Code + Codex blueprints + 5 audits + IA review + persona synthesis + 29 research reports. Explicitly marked "supersedes all prior blueprints." Defines product vision, persona priority, domain model, wave plan, pricing (Free/$29/$79/$149), and architecture decisions. |
| `FINAL-PRODUCT-BLUEPRINT.md` | blueprint | Apr 2 | Superseded by CANONICAL | **ARCHIVE** | 45KB. Claude Code's pre-reconciliation blueprint. Same structure as CANONICAL but missing Codex's contributions (explicit module map, support entities, sub-wave breakdown, intra-wave dependencies). Date is one day before CANONICAL. |
| `CODEX-FINAL-PRODUCT-BLUEPRINT.md` | blueprint | Apr 2 | Superseded by CANONICAL | **ARCHIVE** | 34KB. Codex's independent blueprint. Useful for understanding which decisions came from Codex vs Claude Code, but all surviving decisions are already merged into CANONICAL. |
| `Codex-Parcel-Product-Blueprint.md` | blueprint | Apr 2 | Superseded by CODEX-FINAL | **ARCHIVE** | 24KB. Codex's earlier draft, before the pressure test. Intermediate artifact -- CODEX-FINAL already incorporates its content. |
| `Codex-Blueprint-Codebase-Pressure-Test.md` | audit | Apr 2 | Historically valuable | **ARCHIVE** | 18KB. Codex's assessment of whether the existing codebase could support the blueprint vision. Key finding: "credible foundation for deal-analysis, not yet for property-centric OS." Still useful for understanding the Deal-to-Property structural shift, but the codebase has since been restructured. |
| `Codex-Codebase-Direction-Evaluation.md` | audit | Apr 3 | Historically valuable | **ARCHIVE** | 12KB. Companion to the pressure test. Evaluates codebase strengths (deal analysis, backend foundations, design system) and structural gaps. Largely superseded by the implementation work that followed. |
| `blueprint-comparison.md` | comparison | Apr 2 | Historically valuable | **ARCHIVE** | 15KB. Side-by-side analysis of Claude Code vs Codex blueprints with 11 disagreements, evidence assessment, and resolution for each. Excellent reference for understanding WHY specific decisions were made in CANONICAL. Best archival candidate -- the reasoning is unique and not duplicated elsewhere. |
| `ia-review.md` | spec | Apr 2 | Partially current | **KEEP** | 25KB. Information Architecture review. Covers module gating (3-state: Available/Locked/Planned), sidebar structure (6 groups), Today vs Dashboard, mobile tabs, AI surface design. Core IA decisions are incorporated into CANONICAL but this doc has more detailed reasoning about progressive reveal, persona-specific upgrade prompts, and nav evolution by wave. |
| `implementation-readiness.md` | plan | Apr 2 | Stale | **ARCHIVE** | 8KB. Pre-implementation checklist for Wave 0. Questions about deal migration strategy, PostgreSQL extensions, and billing tier rename have all been answered and implemented. Contains a Claude Code prompt template for Wave 0 -- no longer needed. |

### Master Audit & Current State

| File | Type | Date | Status | Recommendation | Notes |
|------|------|------|--------|----------------|-------|
| `MASTER-AUDIT-FINDINGS.md` | audit | Apr 6 | Partially stale | **UPDATE** | 56KB. Consolidated findings from 8 audits, deduplicated and cross-referenced. Tracks P1-P10 core product loop issues, design/UX issues, billing/pricing issues, with fix status per item. Many issues marked "Not Fixed" on Apr 6 have since been resolved (e.g., address autocomplete, SSE stale closure, dealId navigation). The status column needs a pass to reflect current state. |
| `current-state-audit.md` | audit | Apr 10 | Current (landing only) | **KEEP** | 31KB. Impeccable design audit of the landing page, scoring 36/40. Introduced the 7-dimension scoring framework (Typography, Color, Layout, Visual Details, Motion, Interaction/A11y, UX Writing). Superseded as the latest landing score by FINAL-LANDING-AUDIT.md (38/40), but useful as the baseline reference. Note: currently has uncommitted local changes. |

### Implementation Plans

| File | Type | Date | Status | Recommendation | Notes |
|------|------|------|--------|----------------|-------|
| `IMPLEMENTATION-PLAN.md` | plan | Apr 6 | Partially current | **UPDATE** | 64KB. The definitive implementation plan. 12 sprints covering auth migration, core UX fixes, billing, UI overhaul, and more. Defines shared patterns (error response shape, frontend error/empty state, ComingSoonGate, auth pattern, feature gates). Sprint 1-4 patterns are actively referenced. Later sprints may not match what was actually built. The shared patterns in Section 1 remain the canonical coding conventions. |
| `MAPS-ARCHITECTURE-PLAN.md` | plan | Apr 9 | Partially current | **KEEP** | 15KB. Google Maps integration plan. Tier 1 (fix autocomplete, property map, geocoding) was implemented -- the autocomplete was rewritten to use headless Autocomplete Data API per recent commits. Tier 2 (comps overlay, Street View) and Tier 3 (pipeline map, portfolio heat map) are future work and still valid. |

### Landing Page Documentation

| File | Type | Date | Status | Recommendation | Notes |
|------|------|------|--------|----------------|-------|
| `LANDING-PAGE-REDESIGN-RESEARCH.md` | research | Apr 9 | Completed reference | **ARCHIVE** | 16KB. Tool inventory (shadcn MCP, impeccable.style, Magic UI Pro) and setup guidance for the landing redesign. All tools have been installed and used. The tool evaluations are done. |
| `LANDING-PAGE-CREATIVE-DIRECTIONS.md` | creative-direction | Apr 9 | Partially current | **KEEP** | 31KB. Defines "The Architect" creative direction (cinematic authority aesthetic). Chosen direction with hero concept (scroll-driven building assembly), section flow (Daniel Priestley Sales Framework), and the full 10-section specification. The creative vision document -- still the reference for the landing page's design intent, even though specific implementations have evolved. |
| `LANDING-PAGE-BUILD-PLAN.md` | plan | Apr 9 | Completed | **ARCHIVE** | 18KB. Component discovery results and 10-section build plan for "The Architect." Lists what to keep/replace/delete from the existing landing page. The build has been executed -- this is now a historical record of the build decisions. |
| `LANDING-PAGE-REDESIGN-V2.md` | spec | Apr 9 | Completed | **ARCHIVE** | 10KB. Post-build redesign spec synthesized from 12 parallel subagent audits. Section-by-section changes (headline rewrites, CTA text, trust signals, mobile fixes). These changes were implemented in the landing overhaul. |
| `LANDING-OVERHAUL-AUDIT.md` | audit | Apr 10 | Superseded | **ARCHIVE** | 23KB. Audit of the 6-issue landing page overhaul. All 6 issues passed. Superseded by current-state-audit.md (36/40 scoring) and then FINAL-LANDING-AUDIT.md (38/40 scoring). |
| `FINAL-LANDING-AUDIT.md` | audit | Apr 12 | **Current** | **KEEP** | 17KB. Latest landing page audit. Score: 38/40 (Excellent). Color improved 5->6, Interaction/A11y improved 3->4. Documents focus-ring coverage, ARIA improvements, and remaining minor flags. This is the current landing page quality baseline. |
| `VIDEO-RESEARCH-DEEP-DIVE.md` | research | Apr 9 | Reference | **KEEP** | 32KB. Synthesis of 11 YouTube videos on web design, landing pages, and scroll-driven animations. Contains per-video summaries, master findings, and Parcel-specific recommendations. Timeless design principles (clarity, restraint, typography dominance, single CTA path). Still valuable as a design reference. |
| `TYPOGRAPHY-AND-STYLING-AUDIT.md` | audit | Apr 9 | Partially stale | **ARCHIVE** | 24KB. Pre-overhaul audit of background colors, typography, violet discipline, and emotional word placement. Identifies frame background mismatch and Inter-vs-General-Sans issues. Most findings have been addressed in subsequent overhauls. |
| `ATMOSPHERIC-IMAGERY-PLAN.md` | creative-direction | Apr 10 | Current | **KEEP** | 20KB. Creative vision for atmospheric imagery ("The Blueprint," "The Hour," "The Dwelling"). Defines the anti-Zillow imagery philosophy (architectural abstraction over property photography). The pipeline was implemented -- frames exist in frontend/public/images/. |
| `IMAGE-GENERATION-PROMPTS.md` | prompts | Apr 10 | Current | **KEEP** | 18KB. Production-ready Nano Banana Pro prompts for generating the three atmospheric images plus SVG/CSS assets. Global rules (aspect ratio, resolution, color temperature, grain). Reusable if images need regeneration or new atmospheric images are needed. |
| `POST-ATMOSPHERIC-AUDIT.md` | audit | Apr 10 | Superseded | **ARCHIVE** | 19KB. Audit of the atmospheric imagery pipeline. Verdict: PASS. Confirmed TypeScript/Vite build clean, frame assets verified, DESIGN.md compliance checked. Superseded by current-state-audit.md and FINAL-LANDING-AUDIT.md. |

### App UI Audits

| File | Type | Date | Status | Recommendation | Notes |
|------|------|------|--------|----------------|-------|
| `APP-UI-COMPREHENSIVE-AUDIT.md` | audit | Apr 12 | Superseded by post-overhaul | **ARCHIVE** | 18KB. Pre-overhaul app UI audit. Score: 28.2/40 (Adequate). Identified ~890 hardcoded colors, 62 inline fontFamily, wrong financial colors, missing focus traps. All P0 issues documented here were fixed in the subsequent 5-wave overhaul. |
| `APP-UI-POST-OVERHAUL-AUDIT.md` | audit | Apr 12 | **Current** | **KEEP** | 5KB. Post-overhaul app UI audit. Score: 33.9/40 (Good), up from 28.2/40. Documents the 5-wave execution: cascade fixes, color token migration, typography/motion, accessibility, and polish. 0 hardcoded colors remain, 0 inline fontFamily, 85% focus ring coverage. This is the current app quality baseline. |

### Adversarial Reviews

| File | Type | Date | Status | Recommendation | Notes |
|------|------|------|--------|----------------|-------|
| `adversarial-review-wave-1a.md` | adversarial-review | Apr 6 | Historical | **ARCHIVE** | 24KB. Reviews Wave 0/1A. 4 critical issues (Deal->Property backfill missing, POST /api/analysis/quick not running calculators, dual-write drift, edited numbers vs AI narrative disagreement). Many of these were addressed in subsequent sprints. |
| `adversarial-review-wave-1b.md` | adversarial-review | Apr 6 | Historical | **ARCHIVE** | 30KB. Reviews Wave 1B. Critical: closing deals doesn't feed Today portfolio, snoozed tasks disappear, analysis flow still ships uncalculated scenarios. Security: JWT audience/issuer not enforced, cross-tenant task references. |
| `adversarial-review-wave-1c.md` | adversarial-review | Apr 6 | Historical | **ARCHIVE** | 35KB. Reviews Wave 1C (Claude's version). Critical: unsanitized deal context in chat prompts, Bricked provider blocks async event loop, RAG SQL injection surface, embedding pipeline loses work on partial failure, PDF generation may capture login page. |
| `adversarial-review-wave-1c-codex.md` | adversarial-review | Apr 6 | Historical | **ARCHIVE** | 35KB. Reviews Wave 1C (Codex's version). Different focus: chat session isolation broken, shared-report analytics corrupted, document embedding retries create duplicates, existing-property analysis returns wrong strategy. Security: share tokens exfiltrated to PostHog, brand-kit logos allow tracking URLs. |
| `adversarial-review-wave-2.md` | adversarial-review | Apr 6 | Historical | **ARCHIVE** | 19KB. Reviews Wave 2 (financing). Critical: payment posting corrupts balances, snoozed obligations disappear, wrap circular references, incomplete balloon modeling. Security: payment endpoint trusts arbitrary property_id. |
| `adversarial-review-wave-3a.md` | adversarial-review | Apr 6 | Historical | **ARCHIVE** | 22KB. Reviews Wave 3A. Critical: portfolio month series skips months (timedelta 30 days), cash-flow fallback overstates, analysis shows wrong strategy data. Security: cross-tenant deal_id on transactions and rehab. |
| `adversarial-review-wave-3b.md` | adversarial-review | Apr 6 | Historical | **ARCHIVE** | 17KB. Reviews Wave 3B (dispositions). Critical: canonical value mismatches break buyer filtering/scoring, packet share links 404, match results freeze wrong scenario. Security: packet analytics inflatable, opened_at never populated. |
| `adversarial-review-wave-4.md` | adversarial-review | Apr 6 | Historical | **ARCHIVE** | 21KB. Reviews Wave 4 (communications). Critical: SendGrid webhook wrong verification, Twilio fails open without auth token, sequence cron broken (run_until_complete inside async loop), paused/deleted sequences still send, double-enrollment possible. |
| `adversarial-review-wave-5-6.md` | adversarial-review | Apr 6 | Historical | **ARCHIVE** | 24KB. Reviews Waves 5+6 (skip tracing + direct mail). Critical: verification marks failures as safe-to-send, cross-tenant data exfiltration in mail templates, campaign sending not atomic/idempotent, quick-send can double-send. Security: no compliance gating shipped. |
| `adversarial-review-april-5-session.md` | adversarial-review | Apr 6 | Partially current | **UPDATE** | 30KB. Session-specific review. Tabular format with 31 findings (C1-C5, S1-S4, F1-F5, H1-H8, M3-M4). Covers reverse calculator algebra, verdict badge guards, tooltip formula drift, JIT audience validation, Property.location conditional declaration, mock imports in production. Some findings (calculator, financial chart issues) may still be open. |

### About the Adversarial Reviews

The 10 adversarial review files form a cumulative quality gate series. Each reviews a specific wave of implementation and identifies critical, security, and high-priority issues. They do NOT supersede each other -- each covers different code. Together they form the complete pre-launch quality assessment.

**Key pattern:** Cross-tenant foreign-key poisoning is flagged in nearly every wave (1B, 2, 3A, 3B, 4, 5-6). JWT audience/issuer checking is flagged in waves 1A, 1B, 2, and the April 5 session. These recurring themes suggest systemic patterns that may warrant a dedicated security hardening pass.

**Wave 1C has two versions:** `adversarial-review-wave-1c.md` (Claude) and `adversarial-review-wave-1c-codex.md` (Codex) -- they review the same wave but find different issues. Both are valuable.

---

## Subdirectories

### audit/ (6 files)

Pre-blueprint research audits. All dated April 2, 2026. These verified the research foundation before the product blueprint was written.

| File | Type | Status | Recommendation | Notes |
|------|------|--------|----------------|-------|
| `00-audit-synthesis.md` | audit | Completed | **ARCHIVE** | 12KB. Synthesis of 5 parallel audits. Identifies 4 blockers (API failure matrix missing, onboarding flow undefined, spreadsheet migration not researched, pricing inconsistency). All blockers were resolved in CANONICAL. |
| `01-competitor-verification.md` | audit | Stale | **ARCHIVE** | 19KB. Web-verified competitor pricing and status as of April 2026. Bricked.ai restructured to 4 tiers, RentCast free tier confirmed, DealMachine price doubled. Useful snapshot but will age -- competitor pricing changes frequently. |
| `02-legal-compliance-update.md` | audit | Current | **KEEP** | 29KB. Legal/compliance research: TCPA rulings (one-to-one consent struck down, consent revocation delayed to Jan 2027), CAN-SPAM, state DNC, CCPA, real estate disclaimers. Still relevant -- regulatory landscape referenced here applies to communications features. |
| `03-internal-consistency.md` | audit | Completed | **ARCHIVE** | 26KB. Cross-document consistency audit. Found pricing contradictions ($69 vs $79 Pro), entity naming conflicts, onboarding branch gaps. All contradictions were resolved in CANONICAL. |
| `04-research-gaps.md` | audit | Completed | **ARCHIVE** | 27KB. Gap analysis: missing onboarding mechanics, error handling strategy, spreadsheet migration, empty state design, D4D/mobile field UX. All gaps were addressed in the blueprint or implementation plan. |
| `05-technical-stack-verification.md` | audit | Partially stale | **ARCHIVE** | 17KB. Verifies Capacitor 8, React 19, PostgreSQL 16, Railway limits. Capacitor/mobile is deferred (Wave 7/Kyle). React and PostgreSQL findings were incorporated. |

### personas/ (9 files)

Detailed persona profiles and journey maps. All dated April 2, 2026. These are foundational product strategy documents.

| File | Type | Status | Recommendation | Notes |
|------|------|--------|----------------|-------|
| `00-persona-synthesis.md` | persona | **Current** | **KEEP** | 30KB. Strategic overview: comparison matrix, feature demand heatmap, activation criteria, distortion risks, growth channel analysis. Core product strategy document referenced by CANONICAL. |
| `01-marcus-complete-beginner.md` | persona | Current | **KEEP** | 39KB. Marcus Thompson (28, Columbus OH). Complete beginner, analysis paralysis. Plus->Pro path. Volume acquisition segment. |
| `02-desiree-solo-wholesaler.md` | persona | Current | **KEEP** | 38KB. Desiree Thompson (31, Memphis TN). Solo wholesaler, $472-500/mo tool spend. Largest market segment. |
| `03-ray-house-flipper.md` | persona | Current | **KEEP** | 36KB. Ray Medina (44, Tampa Bay FL). House flipper, multi-flip budget view. Rehab tracker validation. |
| `04-angela-buy-hold-landlord.md` | persona | Current | **KEEP** | 34KB. Angela Drummond (38, Charlotte NC). Buy-and-hold landlord. Steady, low-churn. Price sensitive. |
| `05-kyle-str-airbnb-investor.md` | persona | Current (deferred) | **KEEP** | 29KB. Kyle Nakamura (35, Asheville NC). STR/Airbnb. Explicitly flagged as FUTURE persona -- do not build for. |
| `06-carlos-creative-finance.md` | persona | **Current** | **KEEP** | 55KB. Carlos Medina (42, Phoenix AZ). Creative finance investor. #1 priority persona. Blue ocean moat. Fastest converter (2-7 days). |
| `07-tamara-hybrid-investor.md` | persona | Current | **KEEP** | 29KB. Tamara Chen (36, Houston TX). Hybrid investor. Multi-strategy validation persona. Prevents product collapse into wholesaler CRM. |
| `08-james-agent-serving-investors.md` | persona | Current | **KEEP** | 37KB. James Whitfield (29, Tampa FL). RE agent serving investors. Distribution persona. Reports-as-product-demos growth channel. |

### designs/ (21 PNGs + 1 subdirectory)

UI design screenshots from the design phase. All dated April 6, 2026.

**Root PNGs (21 files):**
- `404_error_state.png` -- 404 page design
- `analysis_results_mobile.png` / `analysis_results_mobile_no_heat_map.png` -- Mobile analysis results variants
- `analysis_results_no_heat_map.png` -- Desktop analysis results without heat map
- `analyze_loading_state_final.png` / `analyze_loading_state_refined.png` -- Loading state iterations
- `contact_detail_wave_1b.png` -- Contact detail page (Wave 1B design)
- `contacts_empty_state.png` / `contacts_list.png` -- Contacts page states
- `notifications_dropdown.png` -- Notification dropdown design
- `onboarding_final.png` -- Onboarding flow design
- `pipeline_mobile.png` -- Mobile pipeline view
- `portfolio_dashboard_wave_1b.png` -- Portfolio dashboard (Wave 1B design)
- `properties_empty_state.png` -- Properties empty state
- `reports_empty_state.png` / `reports_list.png` -- Reports page states
- `settings_tier_management.png` -- Settings/billing tier management
- `shared_report_final.png` -- Shared report public view
- `today_view_empty_state_final.png` / `today_view_final.png` / `today_view_mobile.png` -- Today page designs

**Subdirectory:** `stitch_parcel_investment_dashboard/` (22 files) -- Stitched/composite dashboard screenshots.

**Recommendation:** **KEEP** -- These are the visual design references. Useful for comparing current implementation against original design intent.

### video-screenshots/ (11 directories, 238 images total)

Frame captures from the 11 YouTube videos analyzed in VIDEO-RESEARCH-DEEP-DIVE.md.

| Directory | Frames | Video |
|-----------|--------|-------|
| `vid_01_3hlrCSQSsWs` | 16 | "I Studied 1,000 Websites" |
| `vid_02_wCiM8jYE5yg` | 21 | "The NEW WAY of Web Design in 2026" |
| `vid_03_Y2m6npu9kRI` | 14 | Video 3 |
| `vid_04_C5HaPMPEU78` | 25 | Video 4 |
| `vid_05_rFyOIWMwRdg` | 20 | Video 5 |
| `vid_06_f2mGqlLLqok` | 15 | Video 6 |
| `vid_07_7p-ZPK3GfI8` | 25 | Video 7 |
| `vid_08_wgQTonv9FdM` | 8 | Video 8 |
| `vid_09_mhIAd5lVMag` | 22 | Video 9 |
| `vid_10_q0TgUtj6vIs` | 40 | Video 10 |
| `vid_11_bUt1WpDlI6E` | 32 | Video 11 |

**Recommendation:** **ARCHIVE** -- These are reference screenshots for the video research. Large disk footprint (238 images) for reference material that has already been synthesized into VIDEO-RESEARCH-DEEP-DIVE.md. Could be moved to external storage.

### video-transcripts/ (11 files)

Full transcripts of the 11 analyzed YouTube videos. All dated April 9, 2026. Total ~134KB.

**Recommendation:** **ARCHIVE** -- Same rationale as video-screenshots. The synthesis in VIDEO-RESEARCH-DEEP-DIVE.md captures the actionable findings. Raw transcripts are only needed if revisiting specific video claims.

---

## Key Findings

### 1. Which blueprint is canonical?

**`CANONICAL-PRODUCT-BLUEPRINT.md`** is the single source of truth. It says so explicitly in line 4: "THE single source of truth. Supersedes all prior blueprints." It was created on April 3 by reconciling the Claude Code blueprint (`FINAL-PRODUCT-BLUEPRINT.md`, April 2) and the Codex blueprint (`CODEX-FINAL-PRODUCT-BLUEPRINT.md`, April 2) using the comparison document (`blueprint-comparison.md`). The reconciliation resolved 11 disagreements with evidence-based decisions documented in the comparison file.

**The other four blueprint-like files should be archived:**
- `FINAL-PRODUCT-BLUEPRINT.md` -- Claude Code's pre-reconciliation version
- `CODEX-FINAL-PRODUCT-BLUEPRINT.md` -- Codex's final version
- `Codex-Parcel-Product-Blueprint.md` -- Codex's earlier draft
- `Codex-Blueprint-Codebase-Pressure-Test.md` -- Codex's codebase assessment

### 2. Which landing page docs still reflect reality?

The landing page went through this progression:
1. `LANDING-PAGE-REDESIGN-RESEARCH.md` (Apr 9) -- tool inventory, completed
2. `VIDEO-RESEARCH-DEEP-DIVE.md` (Apr 9) -- design principles, timeless
3. `LANDING-PAGE-CREATIVE-DIRECTIONS.md` (Apr 9) -- "The Architect" chosen, still the design intent reference
4. `LANDING-PAGE-BUILD-PLAN.md` (Apr 9) -- build plan, executed
5. `LANDING-PAGE-REDESIGN-V2.md` (Apr 9) -- post-build revision spec, executed
6. `TYPOGRAPHY-AND-STYLING-AUDIT.md` (Apr 9) -- pre-overhaul audit, findings addressed
7. `ATMOSPHERIC-IMAGERY-PLAN.md` (Apr 10) -- imagery philosophy, still current
8. `IMAGE-GENERATION-PROMPTS.md` (Apr 10) -- AI image prompts, still current
9. `LANDING-OVERHAUL-AUDIT.md` (Apr 10) -- overhaul audit, superseded
10. `POST-ATMOSPHERIC-AUDIT.md` (Apr 10) -- atmospheric audit, superseded
11. `current-state-audit.md` (Apr 10) -- 36/40 baseline, superseded as latest score
12. `FINAL-LANDING-AUDIT.md` (Apr 12) -- 38/40, current baseline

**Still current:** FINAL-LANDING-AUDIT.md (quality baseline), LANDING-PAGE-CREATIVE-DIRECTIONS.md (design intent), ATMOSPHERIC-IMAGERY-PLAN.md + IMAGE-GENERATION-PROMPTS.md (imagery pipeline), VIDEO-RESEARCH-DEEP-DIVE.md (design principles).

**Superseded/completed:** Everything else in the landing page chain.

### 3. Are the adversarial reviews unique or do later ones supersede earlier ones?

Each adversarial review covers a DIFFERENT wave of implementation. They are cumulative, not superseding. The full set (10 files) forms a comprehensive pre-launch quality assessment:

- Wave 1A: schema + core analysis fixes
- Wave 1B: property detail + CRM + pipeline + Today
- Wave 1C (Claude): Bricked + RAG + reports
- Wave 1C (Codex): same wave, different findings
- Wave 2: financing instruments + obligations
- Wave 3A: portfolio v2 + transactions + rehab
- Wave 3B: dispositions + buyer management
- Wave 4: communications + sequences
- Waves 5-6: skip tracing + direct mail
- April 5 session: cross-cutting session review

**Recurring themes across all reviews:**
1. Cross-tenant foreign-key poisoning (flagged in 6 of 10 reviews)
2. JWT audience/issuer enforcement gaps (flagged in 4 reviews)
3. Snoozed items disappearing permanently (tasks in 1B, obligations in Wave 2)
4. Non-atomic operations enabling double-sends/double-writes (Wave 4, 5-6)

### 4. Does the implementation plan match what was built?

`IMPLEMENTATION-PLAN.md` defines 12 sprints with shared patterns. The shared patterns in Section 1 (error response shape, frontend error/empty/loading states, ComingSoonGate, auth pattern, feature gates) are the most valuable part and remain the canonical coding conventions. The sprint-by-sprint plan is harder to assess without a full git history analysis, but based on the adversarial reviews and audit progression, the general architecture was followed even if specific sprint boundaries shifted.

### 5. Recommended cleanup actions

**High priority:**
- Update `MASTER-AUDIT-FINDINGS.md` status column to reflect fixes completed since April 6
- Update `adversarial-review-april-5-session.md` to mark which findings are resolved

**Medium priority -- archive these 15 files (move to SAD/archive/):**
- `FINAL-PRODUCT-BLUEPRINT.md`
- `CODEX-FINAL-PRODUCT-BLUEPRINT.md`
- `Codex-Parcel-Product-Blueprint.md`
- `Codex-Blueprint-Codebase-Pressure-Test.md`
- `Codex-Codebase-Direction-Evaluation.md`
- `blueprint-comparison.md`
- `implementation-readiness.md`
- `LANDING-PAGE-REDESIGN-RESEARCH.md`
- `LANDING-PAGE-BUILD-PLAN.md`
- `LANDING-PAGE-REDESIGN-V2.md`
- `LANDING-OVERHAUL-AUDIT.md`
- `POST-ATMOSPHERIC-AUDIT.md`
- `TYPOGRAPHY-AND-STYLING-AUDIT.md`
- `APP-UI-COMPREHENSIVE-AUDIT.md`
- All 6 files in `audit/` (research verification, completed)

**Medium priority -- archive these asset directories:**
- `video-screenshots/` (238 images, findings already synthesized)
- `video-transcripts/` (11 transcripts, findings already synthesized)

**Keep in place (19 files):**
- `CANONICAL-PRODUCT-BLUEPRINT.md` -- the source of truth
- `IMPLEMENTATION-PLAN.md` -- coding conventions + sprint structure
- `MASTER-AUDIT-FINDINGS.md` -- after status update
- `MAPS-ARCHITECTURE-PLAN.md` -- Tier 2/3 features still future work
- `ia-review.md` -- detailed IA reasoning
- `current-state-audit.md` -- landing baseline (36/40)
- `FINAL-LANDING-AUDIT.md` -- current landing baseline (38/40)
- `APP-UI-POST-OVERHAUL-AUDIT.md` -- current app baseline (33.9/40)
- `LANDING-PAGE-CREATIVE-DIRECTIONS.md` -- design intent
- `ATMOSPHERIC-IMAGERY-PLAN.md` -- imagery philosophy
- `IMAGE-GENERATION-PROMPTS.md` -- reusable prompts
- `VIDEO-RESEARCH-DEEP-DIVE.md` -- timeless design principles
- `adversarial-review-april-5-session.md` -- after status update
- All 9 files in `personas/` -- foundational product strategy
- `designs/` directory -- visual design references
- All 9 adversarial review wave files -- historical quality gates
