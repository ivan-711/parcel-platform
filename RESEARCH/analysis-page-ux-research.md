# Analysis Page UX Research: What to Keep, Cut, and Add

> Research date: 2026-04-05
> Scope: Parcel analysis results page audit, competitive analysis (6 tools), investor user research, UX best practices

---

## Part 1: Current Parcel Inventory

### Page Structure (top-to-bottom)
1. Header — property info + action CTAs (Save, Pipeline, Report, Find Buyers)
2. AI Narrative Card — strategy assessment with confidence dots (HIGH/MEDIUM/LOW)
3. Strategy Selector + Key Metrics Grid — 5 strategy tabs (left sidebar) + hero metric + 7-10 supporting KPIs
4. 30-Year Cash Flow Projection Chart (buy_and_hold & BRRRR only)
5. Break-Even Timeline Chart (all strategies)
6. Comparable Sales + Repairs Card (comps list, repair breakdown, renovation score)
7. Financial Inputs + Sensitivity Analysis (2-column: editable inputs left, 5x5 matrix right)
8. Strategy Comparison Table (5-strategy sortable table with 8 columns)

### Every Metric Currently Displayed

**Buy & Hold (10 metrics):** Net Cash Flow (hero), Cap Rate, CoC Return, DSCR, Annual Cash Flow, Monthly PMT, Break-Even Rent, 1% Rule, Expense Ratio, Debt Yield, 5yr Return

**Wholesale (7 metrics):** MAO (hero), Profit at Ask, Break-Even Price, Closing Costs, Verdict, MAO 65%, MAO 75%, Fee % ARV

**Flip (7 metrics):** Net Profit (hero), ROI, Annualized ROI, Total Cost, Margin, Selling Costs, $/sqft Rehab, Total Profit

**BRRRR (8 metrics):** Cash Left in Deal (hero), Refi Proceeds, Equity Captured, Capital Recycled %, Cash Flow/mo, CoC Return, Infinite Return, Forced Appreciation, 5yr Return

**Creative Finance (7 metrics):** Monthly Spread (hero), DSCR, Day-1 Equity, Yield, Annual Flow, Wrap Spread, Sub-To Risk, 5yr Return

### Charts (3)
1. 30-Year Cash Flow Projection — area chart, cumulative toggle, buy_and_hold/BRRRR only
2. Break-Even Timeline — area chart with green/red zones, 60-month horizon, all strategies
3. Sensitivity Matrix — 5x5 grid (price deltas vs rate deltas), 4 metric toggles (Cash Flow, Cap Rate, CoC, ROI), buy_and_hold/BRRRR/creative only

### Interactive Elements
- Strategy selector (5 tabs, switches all content)
- Financial inputs with real-time recalculation (debounced 500ms)
- Confidence badges per input (VERIFIED/ESTIMATED/NEEDED/YOUR INPUT)
- Sensitivity metric toggle (4 options)
- Comparison table sorting (4 sortable columns)
- "Refresh AI Narrative" button (appears after input changes)
- "View Assumptions" accordion in narrative card
- Advanced expenses expandable section
- Comps repair breakdown toggle

### CTAs
- **Save** — toggle save state
- **Pipeline** — navigate to /pipeline
- **Report** — open report generation modal (audience selector)
- **Find Buyers** — navigate to disposition matches
- **Add to Pipeline** (ResultsPage) — stage selection
- **Share Deal** (ResultsPage) — generate share link
- **Download Report** (ResultsPage, Pro only) — PDF export
- **Chat about Deal** (ResultsPage) — AI chat with deal context
- **Offer Letter** (ResultsPage, Pro only) — generate buyer offer

---

## Part 2: Competitive Analysis

### Summary Table

| Feature | DealCheck | REsimpli | BiggerPockets | Mashvisor | Privy | Rehab Valuator |
|---|---|---|---|---|---|---|
| **Focus** | Deal analysis | CRM + ops | Calculator | Market analysis | Deal finding | Flip/fund analysis |
| **AI Narratives** | No | CRM AI only | No | No | No | No |
| **Cash Flow Charts** | Yes (35yr) | No | Yes (loan term) | No | No | No |
| **Heatmaps** | No | No | No | Yes | Yes (investors) | No |
| **Multi-Strategy/Property** | No | Calculator modes | No | Trad vs Airbnb | 5 types | What-if scenarios |
| **Side-by-Side Compare** | Yes (2+) | No | No | Yes (up to 4) | Comps | Financing options |
| **Shareable Reports** | URL + PDF | No | PDF (Pro) | No | No | Branded PDF |
| **Lender Presentations** | Basic | No | Forum sharing | No | No | Core feature |

### Key Competitor Insights

**DealCheck (market leader):**
- Structured as pages: Property Analysis → Purchase Worksheet → Projections → Comps → Report
- Every metric has a hoverable "?" showing its formula
- Reverse-valuation offer calculator (max price for target returns) — unique and loved by users
- Under 2 minutes from address to results
- Professional shareable reports are a major conversion driver

**BiggerPockets (most used free tool):**
- Summary cards at top (cash flow, CoC, 5yr return), interactive sliders below
- Single chart: property value + equity + loan balance over time
- Forum integration for peer review — social proof layer
- 50% rule benchmark built into results
- Very simple, linear input wizard

**Mashvisor:**
- Core differentiator: Traditional vs. Airbnb side-by-side on every property
- Color-coded heatmap on real map (cap rate, CoC, price-to-rent)
- Neighborhood scoring algorithm
- No long-term projection charts

**Privy:**
- Investor activity tracking — "follow the money" feature (unique)
- LiveCMA with before/after photos and flip timelines
- Deal feed with ARV and profit margin inline on every card
- Focus on deal finding, not deep analysis

**Rehab Valuator:**
- Funding proposal generator — branded pitch decks for lenders (unique niche)
- Budget vs. Actual tracking for active projects
- "What if" scenario analysis
- Designed for the lender-facing workflow

### What Nobody Does
**None of the 6 competitors offer AI-generated narrative analysis.** This is Parcel's most significant differentiator. The closest things are Mashvisor's neighborhood scoring and Privy's investor activity tracking, but neither produces written analysis or strategy recommendations.

---

## Part 3: What Investors Actually Care About

### Tier 1 — Screening Metrics (go/no-go in under 60 seconds)

1. **Cash Flow (monthly net)** — The single most universally cited metric across all strategies. "Cash flow is a sign of how well your business is or isn't doing."
2. **The 1% Rule** — Used as an instant filter before doing any real math. If monthly rent < 1% of purchase price, most investors pass immediately.
3. **Cash-on-Cash Return** — The "levered" return. Target: 8-12%. Answers "what does my actual cash earn?"
4. **Cap Rate** — Market comparison metric. Ideal: 5-10%. Used to price-compare within a market, then investors switch to CoC for deal-level decisions.
5. **Purchase Price vs. ARV** — Especially for BRRRR/flippers. "If you're not getting the deal upfront when you buy, there won't be enough equity."

### Tier 2 — Nice to Have (not decision-drivers)
- IRR — Important for institutional, confusing for individuals
- GRM — Too crude for decision-making
- Operating Expense Ratio — Portfolio monitoring, not deal screening
- LTV — Lending metric, not investment metric
- DSCR — Qualifying metric for DSCR loans, not a "should I buy" metric
- Annualized ROI — More accurate for flippers but rarely calculated by beginners

### What's MISSING from Existing Tools (investor complaints)
1. **Creative financing support** — "How inflexible BiggerPockets calculator was when trying to enter creative financing options." Subject-to, seller finance, wraps poorly served.
2. **Multi-strategy comparison on same property** — Tools force choosing a calculator type upfront. Investors want "what if I hold vs flip vs BRRRR" side-by-side.
3. **Consolidated data** — Investors juggle multiple platforms for property data, market analytics, and contract analysis.
4. **Predictive analytics** — Forward-looking signals (neighborhood trajectory, rent growth forecasts), not just static snapshots.
5. **Integrated rehab estimation** — Repair costs baked into deal analysis, not as a separate exercise.

### Common Complaints
- **"Too many numbers"** — "One of the biggest hurdles for new investors is figuring out how to properly analyze a deal. At first it can feel overwhelming."
- **Analysis paralysis is real** — "An individual is trying to make the best choice out of an overwhelming number of options, resulting in overthinking and ultimately no decision."
- **Fragmented experience** — BiggerPockets requires "at least two calculators to be open to analyze deals."
- **Wrong defaults** — Forcing users to know vacancy rates, CapEx reserves, and management fees before seeing any output.

### What Makes Investors Say "This Gets It"
- Progressive disclosure: 3-4 key numbers up front, details on demand
- Speed: Under 2 minutes from address to decision-quality numbers
- One verdict, not 20 numbers
- Mobile-first (analyzing deals at meetups, viewings, in the car)
- Professional shareable reports for lenders/partners

### Strategy-Specific Priorities

| Strategy | Primary Metrics | Unique Needs | Speed Priority |
|---|---|---|---|
| **Buy & Hold** | Cash flow, CoC, cap rate, 1% rule | Long-term projections, DSCR for loans | Medium |
| **BRRRR** | ARV, investment < 75% ARV, cash left in deal | Refinance modeling, equity recapture | Medium |
| **Flip** | ARV, 70% rule, annualized ROI, profit | Rehab budget, holding costs, timeline ROI | High |
| **Wholesale** | ARV, MAO, assignment fee | Go/no-go in under 2 minutes | Very high |
| **Creative Finance** | Monthly cash flow, balloon timeline, equity position | Existing loan modeling, due-on-sale risk | Medium |

---

## Part 4: UX Best Practices for Data-Dense Pages

### The 10 Rules

1. **5-7 KPIs above the fold**, never more than 10
2. **Inverted pyramid**: status → trends → details (top → middle → bottom)
3. **Every number needs context**: delta, comparison, or benchmark
4. **Progressive disclosure** for secondary data; tabs for parallel content; separate pages for different purposes
5. **Typography carries hierarchy** — large/bold for primary, smaller/lighter for secondary
6. **Monochrome base + 1-2 accent colors** — restraint signals premium
7. **Mobile gets 2-3 KPIs and one chart**, everything else behind interaction
8. **Charts answer questions**, not display data — if you can't name the question, cut the chart
9. **Default to simple, reward depth-seeking** — tooltips, expandable sections, command palette
10. **Performance is a design feature** — instant transitions and filters matter as much as visuals

### Progressive Disclosure Guide
- **Expandable sections:** Content has clear primary/secondary split (80/20 rule)
- **Tabs:** Content is parallel and equally weighted (Overview | Financials | Comps)
- **Separate pages:** Fundamentally different in purpose or needs full-screen space
- **Avoid:** 3+ nested disclosure levels (redesign signal)

### Premium Finance Tool Patterns (Mercury, Fey, Linear)
- Summary first, detail on demand
- Typography does hierarchy, not color
- Generous whitespace signals quality
- Performance is a UX feature
- Single interface with layered depth (not separate beginner/expert dashboards)

---

## Part 5: Recommendations

### Section A — CUT (Remove or Hide)

| Element | Action | Reasoning |
|---|---|---|
| **Debt Yield** | Remove entirely | Not a screening metric. Niche institutional metric that no competitor shows and no individual investor mentioned needing. |
| **Expense Ratio** | Collapse behind expandable | Useful for portfolio monitoring but not deal screening. No competitor shows this on primary results. |
| **Break-Even Rent** | Collapse behind expandable | Derivative of other inputs. Investors know their market rents — they don't need to see the minimum. |
| **MAO 65% / MAO 75%** (wholesale) | Collapse behind expandable | Power user detail. The primary MAO is the hero metric; showing 3 MAO variants adds noise. |
| **Fee % ARV** (wholesale) | Collapse behind expandable | Secondary ratio. Profit at Ask already tells the story. |
| **Closing Costs** (wholesale) | Collapse behind expandable | Input detail, not an output metric investors screen on. |
| **Selling Costs** (flip) | Collapse behind expandable | Standard 6-8% of sale price — experienced flippers already know this. |
| **$/sqft Rehab** (flip) | Collapse behind expandable | Useful for budgeting but not decision-driving. |
| **Sub-To Risk score** (creative) | Rethink or remove | A bare number (risk score) without explanation is confusing. Either expand with explanation or cut. |
| **Sensitivity Matrix** | Move to expandable or tab | Takes significant screen space. Power users love it, but most investors skip past it. Should not occupy prime real estate. |
| **30-Year Cash Flow Chart** | Reduce to 10-year default | 30 years is too abstract for most investors. Default to 10-year projection with option to extend. DealCheck's 35-year view exists but is behind a dropdown. |

### Section B — KEEP (Critical, Don't Touch)

| Element | Why |
|---|---|
| **Hero metric per strategy** (Cash Flow, MAO, Profit, Cash Left, Monthly Spread) | Every competitor leads with the primary number. Investors look at this first. |
| **Cap Rate** | Universal market comparison metric. Every competitor shows it. |
| **CoC Return** | The levered return metric investors care most about after cash flow. |
| **1% Rule** | The fastest screening metric. BiggerPockets has it built in. |
| **DSCR** | Increasingly critical with DSCR loan products. Lenders require it. |
| **AI Narrative Card** | Parcel's biggest differentiator — no competitor has this. Keep prominent. |
| **Confidence badges** (VERIFIED/ESTIMATED/NEEDED) | Unique trust-building feature. No competitor does this. |
| **Strategy Comparison Table** | Multi-strategy comparison on one property is the #2 feature investors say is missing from tools. |
| **Break-Even Timeline** | Quick visual answer to "when do I get my money back?" Every strategy needs this. |
| **Financial Inputs with live recalculation** | Table stakes — DealCheck and BiggerPockets both do real-time recalc. |
| **Save / Pipeline / Report CTAs** | Core workflow actions. Keep in header. |
| **5-Year Return** | Practical planning horizon for most investors. |

### Section C — ADD (Missing from Parcel)

| Feature | Persona(s) | Priority | Placement |
|---|---|---|---|
| **Reverse-valuation offer calculator** ("What's the max I can pay to hit X% CoC?") | All | Must-have | New section or modal from hero metric area. DealCheck's most-loved feature. |
| **Monthly cash flow waterfall** (rent → vacancy → expenses → debt service → net) | Buy & Hold, BRRRR, Creative | Must-have | Replace or supplement break-even chart. Shows WHERE money goes, not just the net number. |
| **Shareable analysis link** (no login required for viewers) | All (especially for partners/lenders) | Must-have | Add to Share CTA. DealCheck's shareable URL is a major conversion driver. |
| **Metric tooltips with formulas** | All (especially beginners) | Must-have | Hover/tap "?" on every metric. DealCheck does this on every single number. Reduces "what does this mean" friction. |
| **Deal score / verdict badge** (go/no-go signal) | All | Should-have | Top of page, next to hero metric. A single "Strong Deal" / "Marginal" / "Pass" signal investors want. The AI narrative is long — a 1-word verdict is the TL;DR. |
| **Holding costs breakdown** (flip) | Flippers | Should-have | Financial inputs section. Flippers need monthly holding cost × months to see how timeline affects profit. |
| **Balloon payment / loan maturity timeline** (creative) | Creative Finance | Should-have | Creative finance metrics section. Due date visibility for subject-to and seller finance deals. |
| **Neighborhood context** (school rating, crime, walkability) | Buy & Hold, BRRRR | Nice-to-have | Collapsible section below comps. Mashvisor does this with neighborhood scoring. |
| **Rental comp range** (not just property-level rent) | Buy & Hold, BRRRR, Creative | Nice-to-have | Near financial inputs or comps section. Shows if entered rent is realistic vs market range. |
| **Property image** | All | Nice-to-have | Header area. Every competitor shows property photos. Adds context and feels more professional. |

### Section D — REORDER (Information Hierarchy)

**Proposed top-to-bottom order (inverted pyramid):**

#### Layer 1 — The Verdict (above the fold, no scrolling)
1. **Property header** — address, specs, property image
2. **Deal score badge** — single-word verdict (Strong/Marginal/Pass) with confidence indicator
3. **Hero metric** — the one number for this strategy, large and color-coded
4. **3-4 supporting KPIs** — Cap Rate, CoC, DSCR/1% Rule (strategy-dependent), in summary cards
5. **Action buttons** — Save, Pipeline, Report, Share

#### Layer 2 — The Story (first scroll)
6. **AI Narrative** — condensed to 2-3 sentences max, with "Read more" expansion. Currently can be too long.
7. **Cash flow waterfall** (new) — visual breakdown of income → expenses → net
8. **Break-Even Timeline** — when you get your money back

#### Layer 3 — Deep Dive (on demand)
9. **Financial Inputs** — editable, with confidence badges
10. **All remaining metrics** — in expandable section, organized by category
11. **Comparable Sales + Repairs** — collapsed by default
12. **Sensitivity Analysis** — collapsed by default
13. **Strategy Comparison Table** — at bottom or in separate tab

#### Tab Structure Alternative
Instead of one long scroll, consider tabs:
- **Overview** — Layers 1 + 2 (verdict, hero metrics, narrative, key chart)
- **Financials** — All metrics, inputs, sensitivity matrix
- **Comps & Market** — Comparable sales, repairs, neighborhood data
- **Compare** — Strategy comparison table

#### Mobile-Specific Order
1. Deal score badge + hero metric
2. 2-3 supporting KPIs (cards)
3. AI narrative (truncated, "Read more")
4. Action buttons (sticky bottom bar)
5. Everything else behind "View Details" expansion

### Section E — Per-Strategy View Recommendations

#### Wholesale
- **Emphasize:** MAO (hero), Profit at Ask, Verdict badge, Assignment Fee
- **De-emphasize:** MAO 65%/75% (collapse), Fee % ARV (collapse), Closing Costs (collapse)
- **Unique needs:** Speed is everything. Show the 3-4 numbers needed for a 60-second go/no-go. The wholesale view should be the most minimal of all strategies.
- **Add:** Reverse-valuation ("max offer for $X fee"), quick-share to buyer list

#### BRRRR
- **Emphasize:** Cash Left in Deal (hero), Refi Proceeds, Equity Captured, Capital Recycled %, Post-refi Cash Flow
- **De-emphasize:** Infinite Return (confusing for beginners), Forced Appreciation (derivative)
- **Unique needs:** The BRRRR flow is sequential (Buy → Rehab → Rent → Refinance → Repeat). Consider a step-by-step visualization showing how money flows through each phase, ending with "cash left in deal."
- **Add:** Refi qualification check (does rental income cover DSCR requirement for refi?)

#### Buy & Hold
- **Emphasize:** Monthly Cash Flow (hero), CoC Return, Cap Rate, 1% Rule, DSCR
- **De-emphasize:** Debt Yield (remove), Break-Even Rent (collapse), Expense Ratio (collapse)
- **Unique needs:** This is the most analysis-heavy strategy. Keep the 10-year projection chart prominent. Show year-by-year cash flow table (expandable).
- **Add:** Cash flow waterfall, rental comp range, year-over-year growth assumptions

#### Flip
- **Emphasize:** Net Profit (hero), ROI, Annualized ROI, Total Cost, Profit Margin
- **De-emphasize:** $/sqft Rehab (collapse), Selling Costs (collapse)
- **Unique needs:** Timeline matters enormously. A flip that takes 3 months at 15% ROI is far better than 12 months at 15% ROI. Show annualized ROI prominently. Include holding cost burn rate.
- **Add:** Timeline slider (3/6/9/12 months) showing how holding period affects profit, holding costs breakdown

#### Creative Finance
- **Emphasize:** Monthly Spread (hero), DSCR, Day-1 Equity, Effective Yield
- **De-emphasize:** Sub-To Risk score (rethink — needs explanation or removal), Wrap Spread (only relevant for wraps)
- **Unique needs:** Creative deals have unique risk factors (due-on-sale clause, balloon dates, seller relationship). The narrative should address these. Show existing loan terms alongside new terms.
- **Add:** Balloon/maturity date countdown, existing vs. new payment comparison, due-on-sale risk explanation

---

## Summary: Parcel's Position

**Strengths (keep and amplify):**
- AI narrative is a genuine market differentiator — no competitor has it
- Multi-strategy comparison on one property — the #2 investor request that most tools lack
- Confidence badges on data sources — unique trust feature
- Creative finance support — the #1 gap investors complain about

**Weaknesses (fix):**
- Too many metrics visible at once — 7-10 per strategy vs. the recommended 5-7 above the fold
- No clear go/no-go verdict signal — narrative is too long for quick screening
- Missing metric explanations — no tooltips or formula descriptions
- No reverse-valuation calculator — DealCheck's most-loved feature
- No shareable analysis link (without login) — DealCheck's conversion driver
- Sensitivity matrix occupies prime screen real estate despite being a power-user feature
- No cash flow waterfall visualization — investors want to see WHERE money goes

**Bottom line:** Parcel shows the right data but needs to restructure the hierarchy. Lead with the verdict, show 4-5 hero metrics, push everything else behind progressive disclosure. The AI narrative should get shorter (2-3 sentences + "Read more"), and a single-word deal score should sit at the very top. Add metric tooltips everywhere and a reverse-valuation calculator. These changes would bring Parcel from "impressive but overwhelming" to "fast screening tool that rewards depth-seeking."

---

*Sources: DealCheck (dealcheck.io), REsimpli (resimpli.com), BiggerPockets (biggerpockets.com), Mashvisor (mashvisor.com), Privy (privy.pro), Rehab Valuator (rehabvaluator.com), Nielsen Norman Group, Smashing Magazine, UXPin, BiggerPockets Forums, Reddit r/realestateinvesting, Landlord Studio, Stessa, FNRP, REI Hub*
