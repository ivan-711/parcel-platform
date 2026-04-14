# Blueprint Comparison: Claude Code vs Codex

**Date:** 2026-04-02
**Purpose:** Side-by-side analysis to produce the canonical blueprint

---

## Agreements (Locked — No Further Debate)

These positions are identical or substantively equivalent in both blueprints:

1. **Product definition.** Parcel is a property-centric investor OS. Address-first front door. Continuity across stages is the wedge.
2. **Core promise.** Enter an address, get AI-narrated analysis in under 60 seconds, keep moving without re-entry.
3. **What Parcel is not.** Both share the same exclusion list (tenant portal, rent collection, maintenance, accounting, marketplace, MLS, white-label, loan servicing).
4. **AI identity.** Confident analyst, not financial advisor. Adapts depth by experience level. Embedded everywhere, globally summonable.
5. **Persona ordering.** Both use the locked order: Carlos, Desiree, Tamara, James, Angela, Ray, Marcus, Kyle.
6. **Persona distortion risks.** Both identify the same four traps (REsimpli trap, Stessa trap, white-label trap, tutorial trap).
7. **Growth channel personas.** Both identify Carlos (referral velocity) and James (report-as-product-demo) as disproportionate growth engines.
8. **Domain model.** Identical entity list, identical lifecycle rules, identical Property-as-root principle. Both agree on the relationship hierarchy.
9. **Pricing.** Free / Plus ($29) / Pro ($79) / Business ($149). Both use two ARPU figures ($76 direct, $85 with referrals).
10. **Architecture.** Approach C (modular platform). Own Alembic migration, own FastAPI router, own React lazy bundle per module, gated by tier + feature flag.
11. **Team-ready schema.** `team_id` FK and RLS from Wave 0. Team UI ships on demand.
12. **API failure modes.** No silent premium fallback. Always give the user a path forward. Manual entry is the last-resort UX.
13. **Reports.** Link-first, PDF-second. Engagement tracking. Brand kit. "Powered by Parcel" CTA on shares.
14. **Creative finance is the moat.** FinancingInstrument + Obligation engine. Not just calculators.
15. **Dispositions include double-close.** Assignment contract generation OUT for v1.
16. **Kyle is future.** Flag in schema, don't build for.
17. **Progressive reveal.** Only shipped modules in nav. No "coming soon" clutter.
18. **Hard boundaries.** Nearly identical lists. Both add edge cases (inherited properties, tax liens, land, mobile home, commercial).
19. **Spreadsheet migration.** Template-first approach. No magic AI import in v1.
20. **Module gating.** Three states: Available, Locked, Planned. Persona-aware upgrade prompts.
21. **Obligation as top-level nav.** Both agree it should be a top-level destination, not just a property sub-tab.

---

## Disagreements

### 1. Today vs Dashboard as Default Landing

| | Claude Code | Codex |
|---|---|---|
| **Position** | Today is the default landing page. Dashboard is one click away. | Dashboard is the primary home. Today is an action mode launched from Dashboard. |
| **Reasoning** | Carlos needs a dedicated action surface. "Dashboard is orientation, Today is work." IA review agrees a card is insufficient. New users see onboarding CTAs on Today — never empty. | Solo users orient first, not just clear tasks. Locked mobile tabs already commit to Dashboard. Morning briefing card is habit-forming. |
| **Mobile tabs** | Today / Analyze / Pipeline / Chat / More | Dashboard / Analyze / Pipeline / Chat / More |

**Evidence assessment:** The original Codex Blueprint (the earlier document, not this final blueprint) explicitly recommended "Today should be the default post-login landing page." The IA review recommended a dedicated Today surface. Codex's final blueprint reversed this position — the reversal argument ("solo users orient first") is plausible but less supported by persona evidence. Carlos's persona doc explicitly ties activation to a consolidated obligation view, and the IA review calls a dashboard card "not enough."

**Recommendation: Today wins as default landing.** The evidence is stronger. Dashboard remains the strategic-health surface. Mobile first tab should be Today, not Dashboard.

---

### 2. Desktop Sidebar Groups

| | Claude Code | Codex |
|---|---|---|
| **Groups** | HOME, DEALS, PEOPLE, ASSETS, OUTPUTS, OUTREACH (6 groups) | DEALS, PEOPLE, OUTREACH, TOOLS (4 groups — matches locked labels) |
| **Items under DEALS** | Analyze, Pipeline, Properties (3 items) | Dashboard, Analyze, Pipeline, Properties, Portfolio, Obligations, Transactions, Rehabs (8 items) |
| **Reports/Docs** | Under OUTPUTS | Under TOOLS (alongside AI/Chat) |
| **Portfolio, Obligations, Transactions, Rehabs** | Under ASSETS | Under DEALS |

**Evidence assessment:** Codex preserved the 4 locked group names but stuffed 8 items under DEALS — that's bloated and makes DEALS feel like "everything." Claude Code's 6-group structure better separates acquisition (DEALS) from ownership (ASSETS) and deliverables (OUTPUTS). The HOME group for Today + Dashboard is a clear improvement.

However, Codex correctly puts AI/Chat in the sidebar under TOOLS. Claude Code removes it from the sidebar entirely, arguing for a floating launcher only. Both approaches have merit — the floating launcher is better UX, but having no sidebar entry at all may confuse users looking for Chat.

**Recommendation: Claude Code's 6-group structure wins**, with one modification: add Chat as the last item under the HOME group (below Dashboard) so there's always a sidebar path to the full Chat experience. AI remains globally summonable via floating launcher.

---

### 3. AI Surface

| | Claude Code | Codex |
|---|---|---|
| **Position** | Global floating launcher (keyboard shortcut + header icon). No sidebar entry. Chat page secondary, accessible only from launcher. | In sidebar under TOOLS > AI/Chat. Also globally summonable. |

**Evidence assessment:** Both agree AI should be embedded and globally accessible. The question is whether Chat/AI also needs a sidebar entry. The original Codex Blueprint said "A separate Chat page can still exist, but it should be secondary." The IA review said "AI should be global, not a sidebar afterthought."

**Recommendation: Floating launcher wins as primary entry.** Add Chat as a sidebar item under HOME (after Dashboard) as a secondary path for discoverability, especially for users who specifically want to have a conversation with AI about a document or scenario.

---

### 4. Wave 0 Duration

| | Claude Code | Codex |
|---|---|---|
| **Duration** | 3 weeks | 4-5 weeks |
| **Scope** | Schema only: Property, AnalysisScenario, Deal refactor, Contact, Task, Communication, Transaction, Report tables + PostGIS + pgvector + RLS + billing rename. No UI. | Same schema scope plus explicit module scaffolds. |

**Evidence assessment:** At 25-30 hrs/week, 3 weeks = 75-90 working hours. The scope includes: creating 8+ new tables with relationships, refactoring the Deal model (the most complex existing table), enabling 2 PostgreSQL extensions, writing RLS policies, and updating billing config. This is aggressive. Codex's 4-5 weeks (100-150 hours) is more realistic for the Deal refactor alone — it touches backend models, routers, frontend components, and tests.

**Recommendation: 4 weeks.** Split the difference. 3 is too tight, 5 is too cautious. The Deal refactor is the hardest part — budget 2 weeks for it alone, 2 weeks for everything else.

---

### 5. Wave 1 Structure

| | Claude Code | Codex |
|---|---|---|
| **Structure** | Monolithic Wave 1 (5 weeks) shipping onboarding, property pages, CRM, Today, portfolio, reports, rehab, transactions, RAG all at once | Split into 1A (3 weeks: onboarding + RentCast analysis + failure UX), 1B (3 weeks: property detail + CRM + pipeline + morning briefing + tasks), 1C (2 weeks: Bricked + multi-strategy + branded report + RAG + CSV import) |
| **Total time** | 5 weeks | 8 weeks |

**Evidence assessment:** Claude Code's 5-week monolithic Wave 1 is unrealistic. It ships 14 features in 5 weeks at part-time hours. Codex's sub-wave breakdown (1A/1B/1C = 8 weeks) is more honest and provides clear milestones. The intra-wave dependency ordering (Property → address analysis → CRM → reports → RAG) also matters — Claude Code doesn't specify this.

**Recommendation: Codex's sub-wave approach wins.** Wave 1A/1B/1C with explicit dependency ordering. Each sub-wave is a shippable milestone with clear persona activations.

---

### 6. Dispositions Placement

| | Claude Code | Codex |
|---|---|---|
| **Wave** | Wave 4 (merged with Twilio Communications) | Wave 3B (before Communications) |
| **Rationale** | Merging accelerates Desiree's stack replacement | Dispositions don't need Twilio. Buyer matching + packet generation can work without SMS integration. |

**Evidence assessment:** Codex is right. Dispositions (buyer profiles, matching, deal packets, disposition pipeline) are entirely independent of Twilio SMS. Merging them delays buyer matching unnecessarily. Desiree can use dispositions to match buyers and generate packets in Wave 3B, then add SMS outreach when Wave 4 ships.

**Recommendation: Codex's Wave 3B wins.** Dispositions ship earlier, independent of communications infrastructure.

---

### 7. Total Timeline

| | Claude Code | Codex |
|---|---|---|
| **Calendar time** | ~22 weeks (~5.5 months) | ~36-44 weeks (~8-10 months) |
| **Working hours assumption** | Implicit 40 hrs/week | Explicit 25-30 hrs/week + 15-20% slippage |
| **Dev weeks** | 33 dev-weeks | ~35 dev-weeks |

**Evidence assessment:** Both blueprints have ~33-35 development weeks of work. The difference is entirely in hours-per-week assumptions. Ivan works 25-30 hrs/week on Parcel alongside other commitments. At 27.5 hrs/week average: 33 dev-weeks × 40hrs = 1,320 hours ÷ 27.5 hrs/week = ~48 calendar weeks. With 15% slippage = ~55 weeks. Codex's 36-44 weeks is actually optimistic when you do this math; Claude Code's 22 weeks is fiction for a part-time solo dev.

**Recommendation: Use Codex's framing.** ~36-44 calendar weeks. State the assumption explicitly. Each wave's "week" estimates are development-effort weeks, not calendar weeks. A "3 dev-week" wave at 25-30 hrs/week takes ~4-5 calendar weeks.

---

### 8. Onboarding Question Wording

| | Claude Code | Codex |
|---|---|---|
| **Question** | "What best describes you?" | "What's your primary strategy?" |
| **Options** | 8 branches (A-H per persona synthesis) | Wholesale, BRRRR, Buy and hold, Flip, Creative finance, Multiple strategies, Agent serving investors, I'm just getting started |

**Evidence assessment:** "What's your primary strategy?" is more action-oriented and avoids identity-labeling. It also naturally handles Tamara ("Multiple strategies") and Marcus ("I'm just getting started") without requiring a role-based self-identification that beginners may not have.

**Recommendation: Codex's wording wins.** "What's your primary strategy?" with the 8 options listed.

---

### 9. Support Entities

| | Claude Code | Codex |
|---|---|---|
| **Named** | Communication, Document | Communication, Document, PartyRole, ImportJob, DataSourceEvent |

**Evidence assessment:** Codex adds three support entities that Claude Code doesn't mention:
- `PartyRole`: Junction table linking Contacts to Deals/Properties with role context (seller, buyer, agent). Without it, contact-to-deal relationships are ambiguous.
- `ImportJob`: Tracks migration quality — which records came from where, what was mapped, what was lost. Without it, import debugging is opaque.
- `DataSourceEvent`: Records API call provenance — which data came from RentCast vs. Bricked vs. manual entry, with timestamps and confidence. Without it, AI confidence labels are not defensible.

**Recommendation: Include all five support entities.** PartyRole, ImportJob, and DataSourceEvent are architecturally necessary.

---

### 10. Module Map

| | Claude Code | Codex |
|---|---|---|
| **Explicit module list** | Implicit (described in architecture section) | Explicit: property-core, analysis, deals-pipeline, people, portfolio, finance-monitoring, rehabs, reports, documents-rag, communications, outreach, mobile-d4d |

**Recommendation: Include Codex's explicit module map.** It's directly actionable for implementation.

---

### 11. Desiree Parallel-Run Bridge

| | Claude Code | Codex |
|---|---|---|
| **Position** | Acknowledges parallel run. No bridge needed. | Recommends Launch Control / CSV / webhook bridge in Wave 4 |

**Recommendation: Codex's approach is more practical.** Even a simple CSV export/import bridge between Launch Control and Parcel contacts reduces Desiree's friction during the gap period.

---

## Coverage Gaps

### Covered by Codex but missed by Claude Code:
1. **Per-persona activation events table** — Codex defines exact activation criteria for each persona (e.g., "Marcus: completes first analysis and reads one AI explanation panel"). Claude Code defines generic criteria (Activated/Engaged/Converted) but not persona-specific.
2. **Module map** — Explicit list of module names for implementation.
3. **Support entities** — PartyRole, ImportJob, DataSourceEvent.
4. **Intra-wave dependency ordering** — Codex explicitly states: Property → address analysis → CRM → reports → RAG. Claude Code does not specify build order within waves.
5. **Nav evolution by wave** — Codex maps exactly which nav items appear in which wave.
6. **Sample data policy detail** — Archive vs. delete after 14 days of inactivity.
7. **Entity-to-nav mapping table** — Where every entity lives in primary and secondary nav positions.

### Covered by Claude Code but missed by Codex:
1. **Failure mode cost impact column** — Claude Code's failure mode table includes cost implications per scenario.
2. **Mobile floating action button** — Claude Code specifies FAB with Add Property, Scan Document, Quick Analysis. Codex doesn't specify mobile quick-actions beyond tabs.
3. **Specific timeout threshold** — Claude Code specifies 30-second Bricked timeout with progressive loading UX. Codex says "under 15 seconds" for quick analysis path but doesn't specify timeout behavior.
4. **Users who don't fit branches** — Claude Code routes "Other / I'm exploring" to Tamara's branch. Codex routes to "General investor."
5. **Schema foundation rules** — Claude Code specifies `created_by`, `updated_at`, `is_deleted` on all entities.

---

## Summary Decision Table

| Decision | Winner | Reason |
|----------|--------|--------|
| Today vs Dashboard | **Claude Code** | Stronger persona evidence, IA review alignment, original Codex Blueprint agreed |
| Sidebar groups | **Claude Code** (modified) | Better separation of concerns; add Chat under HOME |
| AI surface | **Claude Code** (modified) | Floating launcher primary; Chat as sidebar secondary |
| Wave 0 duration | **Codex** (modified to 4 weeks) | More realistic for part-time dev |
| Wave 1 structure | **Codex** | Sub-waves with milestones and dependency ordering |
| Dispositions wave | **Codex** | Independent of Twilio; ships earlier |
| Total timeline | **Codex** | Honest for 25-30 hrs/week |
| Onboarding wording | **Codex** | Action-oriented, avoids identity labeling |
| Support entities | **Codex** | PartyRole, ImportJob, DataSourceEvent are necessary |
| Module map | **Codex** | Explicit and implementation-ready |
| Parallel-run bridge | **Codex** | Pragmatic for Desiree's gap period |
| Failure mode detail | **Claude Code** | Cost column and timeout specifics |
| Mobile quick actions | **Claude Code** | FAB specification |
| Schema audit fields | **Claude Code** | created_by, updated_at, is_deleted |
| Per-persona activation | **Codex** | More specific and measurable |
| Nav evolution by wave | **Codex** | Implementation-ready mapping |
| Edge case routing | **Claude Code** | "Exploring" → Tamara's branch is smarter than "General investor" |
