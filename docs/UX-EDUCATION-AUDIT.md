# UX Education Audit — Parcel Platform

**Date:** 2026-04-13
**Scope:** Every user-facing page and component in the frontend
**Lens:** Where would a beginner or intermediate real estate investor be confused, lost, or unable to understand what they're looking at?

---

## Executive Summary

Parcel has **excellent financial analysis depth** but **almost no educational layer** outside the `/analyze` results page. The app currently assumes expert-level real estate vocabulary everywhere. Two high-quality educational components exist (`ConceptTooltip` and `MetricTooltips`) but are used in only 2 of ~48 user-facing pages.

**By the numbers:**
- ~35 financial abbreviations used without expansion across the app
- ~20 metrics shown with color-coded thresholds but zero explanation of what makes a value "good" or "bad"
- 2 educational components exist; used in 2 pages out of ~48
- 0 glossary, 0 help page, 0 inline "what is this?" affordances outside `/analyze`
- The onboarding flow captures persona (investor type) but doesn't tailor subsequent education

---

## 1. Existing Educational Infrastructure

### What's already built (and good)

| Component | Location | What It Does | Where Used |
|-----------|----------|--------------|------------|
| `ConceptTooltip` | `components/ui/ConceptTooltip.tsx` | Dashed underline on terms, dark popover with definition on hover | **Only** `AnalyzerFormPage.tsx` (1 page) |
| `MetricTooltips` | `pages/analyze/components/MetricTooltips.ts` | 35+ metric definitions with descriptions, formulas, and live computed values | **Only** `KeyMetrics.tsx` (1 component) |
| `Tooltip` (Radix) | `components/ui/tooltip.tsx` | Generic shadcn/ui tooltip primitive | Used in ~12 places for generic hover text |
| `VerdictBadge` | `pages/analyze/components/VerdictBadge.tsx` | Color-coded deal verdict (Strong/Good/Fair/Risky/Pass) with score | Only analyze results |
| `RiskGauge` | `components/ui/RiskGauge.tsx` | SVG gauge with risk score and label | Only analyze results + shared reports |
| `NarrativeCard` | `pages/analyze/components/NarrativeCard.tsx` | AI-generated natural language explanation with confidence badge | Only analyze results |
| Onboarding | `pages/OnboardingPage.tsx` + `stores/onboardingStore.ts` | Persona selection (investor type), seeds sample data | First-run only, doesn't tailor education |
| AI Chat | `components/chat/ChatPanel.tsx` | Suggested questions include educational prompts ("What is BRRRR?", "Explain cap rate") | Available via slide-over, not contextual |

### The core problem

`MetricTooltips.ts` is a **gold mine** — 35+ metrics with plain-English descriptions, exact formulas, and computed values from the current property. But it's only wired into the `/analyze` results page. The same abbreviations (Cap Rate, DSCR, CoC, MAO, LTV) appear across Dashboard, Portfolio, Pipeline, Financing, Properties, and Reports pages with **zero education**.

---

## 2. Critical Gaps — Blocks Understanding for Even Intermediate Investors

### 2.1 Financial abbreviations used as bare labels

| Abbreviation | Full Term | Pages Where Shown Without Definition | Severity |
|---|---|---|---|
| **LTV** | Loan-to-Value Ratio | Dashboard:312, Portfolio:282, Financing | HIGH |
| **DSCR** | Debt Service Coverage Ratio | KeyMetrics, Reports:87, StrategyComparison | HIGH |
| **CoC** / **COC** | Cash-on-Cash Return | Portfolio:237, KeyMetrics, ManualCalc, StrategyComp | HIGH |
| **MAO** | Maximum Allowable Offer | Properties:67, KeyMetrics, ComparePage, Reports | HIGH |
| **ARV** | After Repair Value | FinancialInputs:16, ManualCalc, KeyMetrics | HIGH |
| **CF** | Cash Flow | Dashboard:306 (shows "Monthly CF") | HIGH |
| **PITI** | Principal, Interest, Taxes, Insurance | CashFlowBreakdown:31 | HIGH |
| **NOI** | Net Operating Income | Used in formulas, shown in tooltips but never defined in main UI | MEDIUM |
| **1% Rule** | Rent-to-Price screening filter | KeyMetrics:32 | MEDIUM |
| **BRRRR** | Buy, Rehab, Rent, Refinance, Repeat | Everywhere as strategy label — acronym never expanded | MEDIUM |
| **LTV** | Loan-to-Value | ManualCalculator:68 ("Refinance LTV") | HIGH |

### 2.2 Color-coded thresholds without explanation

These metrics show green/yellow/red indicators but never tell the user what the thresholds mean or why:

| Metric | Thresholds (hardcoded) | File | Line |
|--------|----------------------|------|------|
| Cap Rate | Green > 7%, Yellow > 5%, Red <= 5% | Portfolio:291-298 | |
| LTV Ratio | Green < 70%, Yellow < 80%, Red >= 80% | Portfolio:282-289, Dashboard:312 | |
| Risk Score | Low <= 30, Moderate <= 60, High <= 80, Very High > 80 | RiskGauge:22-27 | |
| DSCR | Green >= 1.25 | KeyMetrics (implicit) | |
| Days in Stage | Yellow at 14d ("Aging"), Red at 30d ("Stale") | pipeline/deal-card:96-99 | |
| Balloon Payment | Danger < 90 days | FinancingDashboard:97 | |
| Deal Score | Strong 90+, Good 75+, Fair 45+, Risky 25+, Pass < 25 | VerdictBadge:13-19 | |

**Impact:** Users see a red number and feel alarmed but don't know if it actually matters for their situation. A 6% cap rate might be excellent in San Francisco but poor in Memphis — zero market context.

### 2.3 Financing jargon (Creative Finance-specific)

These terms appear in the Financing module with zero explanation:

| Term | Where | Why It's Confusing |
|------|-------|--------------------|
| "Wrap Spread" | FinancingDashboard:113 | Jargon — "wraparound mortgage" is advanced creative finance |
| "Upcoming Balloons" | FinancingDashboard:97 | Balloon payment is never defined; shown with danger styling |
| "Due-on-Sale Risk" | FinancingDashboard:148 | Legal concept — lender can demand full repayment if property sold |
| "Sub-To Risk" | KeyMetrics:84 | Subject-to deals — taking over existing mortgage |
| "Effective Yield" | KeyMetrics:80 | Annual CF / day-1 equity — different from standard yield |
| "Monthly Spread" | FinancingDashboard:113 | Difference between wrap payment received and underlying payment made |
| "Financing Instrument" | FinancingDashboard:44-55 (empty state) | Jargon used in the CTA itself |

---

## 3. Beginner Gaps — First-Time Investors Would Be Lost

### 3.1 Analysis results page — metric overload

**File:** `pages/analyze/components/KeyMetrics.tsx`

Each strategy shows 4-6 metrics in a grid. A beginner seeing their first analysis gets hit with:
- **Buy & Hold:** Cap Rate, CoC Return, DSCR, 1% Rule, Monthly Cash Flow, Debt Yield
- **Wholesale:** MAO (at 65%, 70%, 75% rules), Profit at Ask, Break-Even Price, Assignment Fee %
- **BRRRR:** Money Left In, Refi Proceeds, Equity Captured, Capital Recycled %, Cash Flow, Infinite Return
- **Flip:** ROI, Annualized ROI, Profit Margin %, Total Cost, Gross Profit, Cost/sqft Rehab
- **Creative Finance:** Equity Day One, DSCR, Effective Yield, Monthly Spread, Sub-To Risk

`MetricTooltips` provides excellent definitions for ALL of these, but:
- The tooltip is only visible if you **hover over the metric name** (not the value, not the card)
- On mobile, hover tooltips don't work
- There's no "what should I focus on?" guidance — all metrics shown equally
- No "this is the most important metric for this strategy" indicator

### 3.2 Strategy comparison table — no guidance on how to read it

**File:** `pages/analyze/components/StrategyComparison.tsx`

Shows a table comparing all 5 strategies with columns: ROI, Risk, Cash Flow, Horizon, Break-Even, 5yr Return. No explanation of:
- How to compare across strategies (e.g., high ROI + high risk vs lower ROI + lower risk)
- What "Horizon" means (how many months the strategy takes)
- Why some strategies show "N/A" for certain metrics
- Which strategy is best for a beginner

### 3.3 Sensitivity matrix — advanced but no intro

**File:** `pages/analyze/components/SensitivityMatrix.tsx`

Shows a 2D matrix of cash flow at different rent/price combinations. Uses a hardcoded 35% expense ratio (line 67) that:
- Is never exposed to the user
- Can't be adjusted
- Isn't labeled in the UI
- Affects every cell in the matrix

### 3.4 Pipeline stages — no stage definitions

**File:** `components/pipeline/constants.ts`

Stages: Lead, Prospect, Analyzing, Under Contract, Due Diligence, Closed, Dead

A beginner doesn't know:
- What actions to take in each stage
- How long deals typically spend in each stage
- What triggers a move from one stage to the next
- The difference between "Lead" and "Prospect"

### 3.5 Properties list — key metric changes by strategy silently

**File:** `pages/properties/PropertiesListPage.tsx:56-85`

The "Key Metric" column shows different values depending on strategy:
- Buy & Hold: Monthly cash flow
- Wholesale: MAO
- Flip: Gross profit
- BRRRR: Money left in deal
- Creative: Monthly spread

The column header just says "Key Metric" — no indication that it changes per strategy or why that particular metric was chosen.

### 3.6 Buyer funding types unexplained

**File:** `pages/buyers/BuyersListPage.tsx:14-28`

Shows: Cash, Hard Money, Conventional, Creative as colored pills without definitions. A beginner doesn't know:
- What "Hard Money" is (short-term, high-interest private lending)
- When each type is appropriate
- How funding type affects deal structure

---

## 4. Methodology Gaps — Results Without Explanation

### 4.1 Data sources hidden

**File:** `pages/analyze/components/FinancialInputs.tsx:50-57`

Confidence badges ("VERIFIED", "ESTIMATED", "NEEDED") appear but:
- "Verified" doesn't say verified by whom (RentCast? County records? User input?)
- "Estimated" doesn't reveal the estimation method
- No source attribution (e.g., "Rent estimate from RentCast" or "Tax data from county records")

### 4.2 Risk score methodology opaque

**File:** `pages/analyze/ResultsPage.tsx:443-469`

Risk Score is displayed as a gauge with a number. A popover exists showing "Risk Score Breakdown" with individual factors, but:
- The popover is hidden (requires clicking an info icon)
- Risk factor severity labels (Low/Medium/High) aren't defined
- The weighting of each factor is invisible
- Market-specific context is absent

### 4.3 AI narrative confidence badge

**File:** `pages/analyze/components/NarrativeCard.tsx:34-41`

Shows "high/medium/low" confidence but:
- Doesn't explain what confidence refers to (data quality? calculation certainty? market conditions?)
- Algorithm for determining confidence is opaque to users
- No link to "improve confidence" (e.g., by adding more data)

### 4.4 Cash flow projections unexplained

**File:** `components/today/TodayCashFlowChart.tsx:64-68`

Shows "Actual vs Projected" chart with no explanation of:
- What the projection model is
- What assumptions drive the projection
- How accurate projections have been historically

### 4.5 Sensitivity matrix hidden assumptions

**File:** `pages/analyze/components/SensitivityMatrix.tsx:67`

Uses `expenseRatio = 0.35` (35% of rent) as a hardcoded assumption. This:
- Isn't labeled in the UI
- Can't be adjusted by the user
- Significantly affects all matrix values
- May not match the actual expense ratio from the full analysis

---

## 5. Strategy Literacy Gaps

### 5.1 Strategy names used as common knowledge

The five strategy names appear everywhere as colored badges: **Wholesale**, **BRRRR**, **Buy & Hold**, **Flip**, **Creative Finance**. None are ever defined outside the AI chat's suggested questions.

| Strategy | What a Beginner Doesn't Know |
|----------|------------------------------|
| Wholesale | That you're NOT buying the property — you're assigning the contract |
| BRRRR | What the acronym stands for, or that it's a cyclical strategy |
| Buy & Hold | That it's passive income focused, not appreciation focused |
| Flip | How it differs from wholesale (you actually close on the property) |
| Creative Finance | That it involves non-traditional financing (seller financing, subject-to) |

### 5.2 "Break-even" means different things per strategy

- **Wholesale:** Price where you neither profit nor lose on the assignment
- **Buy & Hold:** Rent level needed to cover all expenses
- **Flip:** Months until project costs are recovered from sale
- **BRRRR:** Not typically used (infinite return is the goal)

The term appears in `StrategyComparison.tsx:89` as a column shared across all strategies without disambiguation.

### 5.3 "Cash Flow" means different things per strategy

- **Buy & Hold:** Monthly net income from rent after all expenses
- **BRRRR:** Post-refinance monthly income
- **Creative Finance:** Monthly spread from wrap mortgage
- **Flip:** Not applicable (single sale event)
- **Wholesale:** Not applicable (assignment fee is one-time)

Used generically in Dashboard, Today, Portfolio without strategy qualification.

---

## 6. Empty & Dead-End States

| Page | Empty State Text | What's Missing |
|------|-----------------|----------------|
| Portfolio | "Properties with status 'owned' will appear here" | No explanation of statuses or how to change them |
| Financing Dashboard | "Add instruments to your properties to see your financing overview" | "Instrument" is jargon; no explanation of what it means |
| Reports | "Your analysis shelf is empty" | Unclear metaphor; should explain what reports are and how to create them |
| Pipeline (empty column) | "No deals in this stage" | No guidance on what actions happen in each stage |
| Analysis Results | "No analysis for this strategy yet" | Doesn't explain what the strategy is or why the user should care |
| Cash Flow Chart | "Enter property value and rent estimate below" | No example values or realistic ranges |
| Break-Even Chart | "This deal never breaks even at current terms" | No guidance on what would fix it (lower price? higher rent?) |
| Skip Tracing | Usage counter without explanation | "X of Y used" — doesn't explain limits, rollover, or cost |
| Sequences | Stats (enrolled, completed, replied) without definitions | What's the difference between enrolled and started? |
| Dispositions | Match scores without scale legend | Score of 15/25 — is that good? No scale shown |

---

## 7. Recommendations

### 7.1 Pattern: Extend `MetricTooltips` Platform-Wide

**The biggest win.** `MetricTooltips.ts` already defines 35+ metrics with descriptions, formulas, and live computations. Currently only consumed by `KeyMetrics.tsx`.

**Proposal:** Create a `useMetricTooltip(metricKey: string)` hook that:
1. Looks up the metric in `METRIC_TOOLTIPS`
2. Returns `{ description, formula, compute }` or `null`
3. Can be consumed by a new `<MetricLabel>` component that wraps any metric name with a hover/tap tooltip

**Where to deploy:**
- `KPICard.tsx` — add optional `metricKey` prop for tooltip
- `PortfolioPage.tsx` — Cap Rate, LTV, CoC Return column headers
- `Dashboard.tsx` — "Monthly CF", "LTV" labels
- `FinancingDashboardPage.tsx` — Wrap Spread, Balloon, Due-on-Sale
- `PropertiesListPage.tsx` — "Key Metric" column
- `StrategyComparison.tsx` — all column headers
- `ComparePage.tsx` — all metric rows
- `SharedReportPage.tsx` — all KPI labels

**Scope:** ~2-3 days. Most work is wiring existing definitions into existing components.

### 7.2 Pattern: `<MetricLabel>` Component

```
<MetricLabel metric="cap_rate">Cap Rate</MetricLabel>
```

Renders: `Cap Rate` with a dashed underline (reusing ConceptTooltip styling). On hover/tap, shows the MetricTooltip definition with formula and (optionally) computed value.

**Implementation:** Thin wrapper around `ConceptTooltip` that pulls content from `METRIC_TOOLTIPS`.

**File:** `components/ui/MetricLabel.tsx` (~30 lines)

### 7.3 Pattern: Threshold Context Badges

For metrics with color-coded thresholds, add inline context:

Instead of:
> **LTV** 72% [yellow dot]

Show:
> **LTV** 72% [yellow dot] (< 70% is ideal)

Implementation: A `<ThresholdBadge>` component that takes `value`, `thresholds` array, and `goodLabel`/`badLabel`.

**Where to deploy:** Portfolio KPIs, Dashboard metrics, Risk Gauge, Deal Score Badge.

### 7.4 Pattern: Strategy Explainer Cards

Add a collapsible "About this strategy" card at the top of each strategy-specific view:

- **Analysis results:** Before the metrics grid, show a 2-sentence strategy summary
- **Pipeline:** Each Kanban column could have a (?) icon explaining the stage
- **Properties list:** When filtered by strategy, show a strategy context banner

**Content to write (draft):**

**Wholesale:** "You find a property under market value, put it under contract, then assign (sell) that contract to another investor for a fee. You never close on the property yourself. Key metric: MAO (Maximum Allowable Offer) — the most you should pay to maintain your profit margin."

**BRRRR:** "Buy, Rehab, Rent, Refinance, Repeat. Purchase a distressed property, renovate it, rent it out, refinance based on the new (higher) value, and pull your cash out to repeat. The goal is infinite return — getting 100% of your capital back while still owning the property."

**Buy & Hold:** "Purchase a property and rent it out for ongoing passive income. Key metrics: Cap Rate (income relative to price), Cash-on-Cash Return (income relative to cash invested), and DSCR (whether rental income covers the mortgage)."

**Flip:** "Buy a property, renovate it, and sell it for a profit. It's a short-term project, not a long-term investment. Key metrics: ROI, holding time, and profit margin."

**Creative Finance:** "Structure deals using non-traditional financing — seller financing, subject-to (taking over existing mortgage), or wraparound mortgages. You gain control of properties with little to no money down. Key metric: Equity Day One — the instant equity you gain at closing."

### 7.5 Pattern: Progressive Disclosure by Persona

The onboarding store already captures `persona` (investor type). Use this to control education depth:

- **Beginner persona:** Show all metric labels as `<MetricLabel>` with tooltips active, show strategy explainer cards expanded by default, show threshold context badges
- **Experienced persona:** Show tooltips on hover only, collapse strategy cards, minimal threshold context
- **No persona (skipped onboarding):** Default to beginner behavior

This doesn't "dumb things down" — it adds an optional education layer that experts can ignore.

### 7.6 Specific Content to Write

The following terms need plain-English definitions added to `MetricTooltips.ts` (currently missing from the definitions file):

| Term | Proposed Definition |
|------|-------------------|
| LTV | "Loan-to-Value ratio — what percentage of the property's value is covered by debt. Below 70% is conservative; above 80% means higher risk and often requires mortgage insurance." |
| Balloon Payment | "A large lump-sum payment due at the end of a loan term. Unlike a regular mortgage that's fully amortized, a balloon loan requires you to pay off the remaining balance in one shot — often by refinancing or selling." |
| Due-on-Sale Clause | "A clause in most mortgages that lets the lender demand full repayment if the property is sold or transferred. This is the main risk in subject-to deals — the lender could call the loan." |
| Wrap Spread | "The monthly profit from a wraparound mortgage. You collect a higher payment from your buyer than you owe on the underlying mortgage. The difference is your spread." |
| Pipeline Stage: Lead | "A potential deal you've identified but haven't contacted yet." |
| Pipeline Stage: Prospect | "You've made contact and are exploring whether this deal is worth pursuing." |
| Pipeline Stage: Analyzing | "You're running the numbers — financial analysis, comps, and strategy evaluation." |
| Pipeline Stage: Under Contract | "You have a signed purchase agreement. Now verify everything." |
| Pipeline Stage: Due Diligence | "Inspections, title search, appraisal, and final number verification before closing." |
| PITI | "Principal, Interest, Taxes, Insurance — the four components of a standard monthly mortgage payment." |
| Financing Instrument | "A loan, mortgage, or line of credit attached to a property. Could be a traditional bank loan, hard money loan, seller-financed note, or assumed mortgage." |
| Hard Money | "Short-term, high-interest loans from private lenders. Used for flips and BRRRR because they're fast to get but expensive. Typical terms: 12-18 months, 10-15% interest." |

### 7.7 Structural Recommendations

1. **Do NOT build a separate glossary page.** Inline education (tooltips) is far more effective than making users leave context to read a glossary. The existing `ConceptTooltip` + `MetricTooltips` pattern is the right approach — just needs wider deployment.

2. **Do NOT add a beginner/expert toggle.** Use the existing persona from onboarding to infer education level. Experts can simply ignore tooltips (they won't hover); beginners will discover them naturally through the dashed underlines.

3. **DO add info icons (?) next to section headers** that show contextual multi-line explanations for complex sections (Sensitivity Matrix, Risk Score Breakdown, Cash Flow Projection). These are more discoverable than hover-only tooltips for beginners.

4. **DO add "how we calculated this" links** on the analysis results page. The `MetricTooltips` already has formulas — surface them more prominently, not just on hover.

5. **DO extend `MetricTooltips.ts` with the missing terms** listed in 7.6 above. This is 90% a content task, 10% code.

### 7.8 Implementation Scope Estimate

| Task | Files Touched | Effort |
|------|--------------|--------|
| Create `<MetricLabel>` component | 1 new file | Small |
| Add missing definitions to `MetricTooltips.ts` | 1 file | Small (content) |
| Wire `MetricLabel` into Portfolio, Dashboard, Financing, Pipeline, Properties | ~8 files | Medium |
| Create `<ThresholdBadge>` component | 1 new file | Small |
| Wire threshold context into KPIs with color dots | ~4 files | Small |
| Write strategy explainer card content | 1 new component + content | Medium |
| Add info icons to complex sections (Sensitivity, Risk, Projections) | ~4 files | Small |
| Wire strategy explainers into analysis results + properties | ~3 files | Small |
| **Total** | ~22 file touches | **~3-4 days** |

---

## Appendix: Complete Findings by File

### Analysis Module (Most Metric-Heavy)

| File | Line | What User Sees | Issue | Severity |
|------|------|---------------|-------|----------|
| `KeyMetrics.tsx` | 20-23 | "BRRRR", "DSCR", "CAP RATE", "COC RETURN" | Labels with no expansion | HIGH |
| `KeyMetrics.tsx` | 29-39 | Green/yellow/red dots on metrics | Thresholds invisible to user | HIGH |
| `KeyMetrics.tsx` | 47-50 | "MAO 65%", "MAO 70%", "MAO 75%" | Three values, no guidance on which to use | HIGH |
| `KeyMetrics.tsx` | 65-73 | "MONEY LEFT IN", "REFI PROCEEDS", "CAPITAL RECYCLED" | BRRRR jargon undefined | HIGH |
| `KeyMetrics.tsx` | 77-84 | "MONTHLY SPREAD", "EFFECTIVE YIELD", "WRAP SPREAD", "SUB-TO RISK" | Creative finance jargon | HIGH |
| `FinancialInputs.tsx` | 50-57 | "VERIFIED" / "ESTIMATED" / "NEEDED" badges | No source attribution | HIGH |
| `FinancialInputs.tsx` | 19-24 | "Vacancy %", "Maintenance %", "Mgmt Fee %" | No guidance on typical ranges | MEDIUM |
| `SensitivityMatrix.tsx` | 67 | (hidden) 35% expense ratio | Hardcoded, unexplained, non-adjustable | HIGH |
| `SensitivityMatrix.tsx` | 132 | Green cells vs red cells | Thresholds invisible | MEDIUM |
| `StrategyComparison.tsx` | 89-102 | "ROI", "Risk", "Horizon", "Break-Even", "5yr Return" | No column definitions | HIGH |
| `ManualCalculator.tsx` | 68-69 | "Refinance LTV", "Refi Interest Rate" | "Refi" and "LTV" undefined | HIGH |
| `CashFlowBreakdown.tsx` | 31 | "PITI" | Abbreviation never expanded | HIGH |
| `VerdictBadge.tsx` | 13-19 | "Strong" / "Good" / "Fair" / "Risky" / "Pass" | Score ranges not shown | MEDIUM |
| `NarrativeCard.tsx` | 34-41 | "high/medium/low" confidence | What does confidence measure? | MEDIUM |
| `ReverseCalculatorModal.tsx` | 312 | "Infinite" return value | Not explained when/why this occurs | MEDIUM |
| `BreakEvenChart.tsx` | 44-56 | "This deal never breaks even" | No guidance on what would fix it | MEDIUM |
| `ResultsPage.tsx` | 443-469 | Risk Score gauge | Methodology hidden behind popover | MEDIUM |

### Dashboard & Today

| File | Line | What User Sees | Issue | Severity |
|------|------|---------------|-------|----------|
| `Dashboard.tsx` | 306 | "Monthly CF" | Abbreviation not expanded | HIGH |
| `Dashboard.tsx` | 312 | "LTV" as bare label | Abbreviation not expanded | HIGH |
| `Dashboard.tsx` | 328-339 | Pipeline stage names | No definition per stage | MEDIUM |
| `TodayPage.tsx` | 283-286 | Monthly Cash Flow dollar amount | No benchmark for good/bad | MEDIUM |
| `TodayCashFlowChart.tsx` | 64-68 | "Actual vs Projected" | Projection methodology hidden | MEDIUM |

### Portfolio & Financing

| File | Line | What User Sees | Issue | Severity |
|------|------|---------------|-------|----------|
| `PortfolioPage.tsx` | 282-289 | "LTV Ratio" with color dot | Threshold not explained | HIGH |
| `PortfolioPage.tsx` | 291-298 | "Avg Cap Rate" with color dot | Threshold not explained | HIGH |
| `PortfolioPage.tsx` | 237-238 | "CoC Return" column header | Abbreviation not expanded | HIGH |
| `PortfolioPage.tsx` | 155-164 | Empty state: "status 'owned'" | Statuses not explained | LOW |
| `FinancingDashboardPage.tsx` | 97 | "Upcoming Balloons" | "Balloon payment" never defined | HIGH |
| `FinancingDashboardPage.tsx` | 113 | "Wrap Spread" | Jargon without definition | HIGH |
| `FinancingDashboardPage.tsx` | 148 | "Due-on-Sale Risk" | Legal jargon, no explanation | HIGH |
| `FinancingDashboardPage.tsx` | 44-55 | "financing instrument" in empty state | Jargon in CTA | MEDIUM |
| `ObligationsPage.tsx` | 42-47 | "critical" / "high" severity labels | Criteria invisible | MEDIUM |
| `ObligationsPage.tsx` | 299-303 | Balloon payment countdown | Concept undefined | HIGH |

### Pipeline & Deals

| File | Line | What User Sees | Issue | Severity |
|------|------|---------------|-------|----------|
| `deal-card.tsx` (pipeline) | 96-99 | "Aging" / "Stale" badges | 14d/30d thresholds unexplained | MEDIUM |
| `DealSidePanel.tsx` | 128 | "In Stage" with color | No context for typical stage duration | MEDIUM |
| `kanban-column.tsx` | 95-98 | Sum of asking prices in column header | Not clear what this total represents | LOW |
| `pipeline-empty.tsx` | 22 | "track its progress" | Progress toward what? | LOW |
| `deal-card.tsx` (deals) | 100 | "Risk Score" number | No scale or legend | HIGH |

### Properties, Contacts, Other

| File | Line | What User Sees | Issue | Severity |
|------|------|---------------|-------|----------|
| `PropertiesListPage.tsx` | 56-85 | "Key Metric" column | Changes by strategy silently | HIGH |
| `PropertiesListPage.tsx` | 67 | "MAO $X" | Abbreviation unexpanded | HIGH |
| `PropertiesListPage.tsx` | 75 | "Money Left In" (BRRRR) | Jargon undefined | HIGH |
| `BuyersListPage.tsx` | 14-28 | "Hard Money", "Creative" funding pills | No definitions | MEDIUM |
| `MatchResultsPage.tsx` | 98-124 | Match scores (0-25) | No scale legend | MEDIUM |
| `ContactsListPage.tsx` | 38-47 | Contact type badges | Roles not explained in context | LOW |
| `SequencesListPage.tsx` | 113-121 | "enrolled", "completed", "replied" | Stats undefined | LOW |
| `CampaignBuilderPage.tsx` | 145-162 | "Deliverable", "No Match" | Verification logic unexplained | LOW |
| `ReportsListPage.tsx` | 198 | "analysis shelf is empty" | Unclear metaphor | LOW |
| `SharedReportPage.tsx` | 66-90 | Strategy KPIs: MAO, BRRRR, DSCR, Equity Day One | All undefined in report context | HIGH |
