# Parcel Pricing Strategy — Research & Recommendations

> Date: April 6, 2026
> Status: Research complete, recommendations ready for decision

---

## Part 1: Competitive Pricing Research

### 1. DealCheck
- **Free tier:** Yes — "Starter" plan, 15 saved properties, basic analysis
- **Paid tiers:** Plus ~$10/mo, Pro ~$20/mo (annual billing)
- **Key differentiator:** Property save limits (15 → 50 → unlimited), comp limits, branded reports
- **Upgrade triggers:** Usage limits (property saves) + feature gates (branded reports, owner lookup)
- **Annual discount:** ~17-20%
- **Trial:** 14-day free trial on paid plans

### 2. REsimpli
- **Free tier:** No. 30-day free trial.
- **Paid tiers:** Basic $149/mo, Pro $299/mo, Enterprise $599/mo
- **Key differentiator:** All-in-one CRM with free skip tracing included
- **Upgrade triggers:** Team size, deal volume, feature gates
- **Annual discount:** Up to 29%

### 3. PropStream
- **Free tier:** No. 7-day trial with 50 leads.
- **Paid tiers:** Essentials $99/mo, Pro $199/mo, Elite $699/mo
- **Key differentiator:** Data/leads platform with massive export limits
- **Upgrade triggers:** Export/save limits, team members, Lead Automator capacity
- **Usage-based:** Postcards $0.48/ea, emails $0.02/ea, extra team members $30/mo
- **Annual discount:** 18-38%

### 4. BatchLeads
- **Free tier:** No. 7-day trial with 100 leads.
- **Paid tiers:** Growth $119/mo ($71 annual), Professional $349/mo ($209 annual), Scale $749/mo ($449 annual)
- **Key differentiator:** Lead generation with AI scoring
- **Upgrade triggers:** Lead limits, user seats, AI access, dialer
- **Usage-based:** Dialer AI $89/mo add-on, direct mail per-piece
- **Annual discount:** 40%

### 5. Privy
- **Free tier:** No.
- **Paid tiers:** 1 State $79/mo, 3 States $119/mo, National $199/mo, Agent $46/mo
- **Key differentiator:** MLS investment data, geographic coverage pricing
- **Upgrade triggers:** Geographic expansion (state count)
- **Annual discount:** 20%

### 6. InvestNext
- **Free tier:** No. 30-day trial.
- **Paid tiers:** Fundraising $99/mo, Core $499/mo, Firm $699+/mo, Institution custom
- **Key differentiator:** Syndication/fundraising platform, priced by AUM
- **Upgrade triggers:** AUM, user/co-sponsor count
- **Annual discount:** 12-month commitment required

### 7. Rehab Valuator
- **Free tier:** Yes — 3 saved projects, basic analysis
- **Paid tiers:** Premium $49/mo, Pro $99/mo
- **Key differentiator:** Rehab-focused with funding presentations
- **Upgrade triggers:** Project save limits (3 → unlimited), feature gates (branded reports, commercial)
- **Annual discount:** Available (~$199/yr promotional)

### 8. Mashvisor
- **Free tier:** No. 7-day trial.
- **Paid tiers:** Lite $40/mo, Standard $75/mo, Professional $100/mo (annual)
- **Key differentiator:** Market analytics, heatmaps, neighborhood data
- **Upgrade triggers:** Search scope, export limits, property type filters
- **Annual discount:** 17-20%

### 9. Stessa (Yardi)
- **Free tier:** Yes — Essentials, unlimited properties, bank feeds, basic reports, rent collection
- **Paid tiers:** Manage $15/mo ($12 annual), Pro $35/mo ($28 annual)
- **Key differentiator:** Extremely generous free tier to drive adoption
- **Upgrade triggers:** Feature gates (eSignatures, advanced reports, budgeting, Schedule E)
- **Annual discount:** 20%

### 10. Landlord Studio
- **Free tier:** Yes — "Go" plan, 3 units, basic features
- **Paid tiers:** Pro $12/mo ($9.60 annual) + $1/unit, Pro Plus $28/mo ($22.40 annual) + $1/unit
- **Key differentiator:** Per-unit pricing scales with portfolio
- **Upgrade triggers:** Unit count (3 cap), document storage, bank feeds, users
- **Usage-based:** $1 per additional unit beyond 3
- **Annual discount:** 20%

### Competitive Pricing Landscape Summary

| Segment | Price Range | Free Tier? | Parcel Competes Here? |
|---|---|---|---|
| Deal analysis only | $0-$20/mo | Yes (DealCheck, Rehab Valuator) | Yes — but Parcel does more |
| Market analytics | $40-$100/mo | No (Mashvisor, Privy) | Partially |
| Portfolio tracking | $0-$35/mo | Yes (Stessa) | Partially |
| Lead gen / CRM | $99-$749/mo | No (PropStream, BatchLeads, REsimpli) | No — Parcel is not a lead gen tool |
| Syndication | $99-$699+/mo | No (InvestNext) | No |

**Parcel's unique position:** It combines deal analysis + pipeline management + portfolio tracking + document AI in one tool. No single competitor covers all of this. The closest is REsimpli ($149-$599) but that's a CRM, not an analysis tool.

---

## Part 2: Parcel's Current Pricing Configuration

### Backend Source of Truth (tier_config.py)

| | FREE | PLUS ($29) | PRO ($79) | BUSINESS ($149) |
|---|---|---|---|---|
| **Analyses/month** | 3 | 25 | Unlimited | Unlimited |
| **Saved deals** | 5 | 50 | Unlimited | Unlimited |
| **AI messages/month** | 5 | 30 | 150 | 500 |
| **Document uploads/month** | 0 | 5 | 25 | Unlimited |
| **Bricked comps/month** | 0 | 10 | 50 | Unlimited |
| **Skip traces/month** | 0 | 0 | 25 | 200 |
| **Mail pieces/month** | 0 | 0 | 0 | 100 |
| **Team seats** | - | - | - | 5 |
| **Pipeline** | No | Yes | Yes | Yes |
| **PDF exports** | No | Yes | Yes | Yes |
| **Portfolio** | No | No | Yes | Yes |
| **Offer letters** | No | No | Yes | Yes |
| **Deal comparison** | No | No | Yes | Yes |

### Frontend Display Status

| Tier | Landing Page | Pricing Page | CTA |
|---|---|---|---|
| Free | Shown ($0) | Shown ($0) | "Start free" |
| Plus | Shown ($29) | Constants defined but **section not rendered** | "Upgrade to Plus" |
| Pro | Shown ($79) | Shown ($79/$63 annual) | "Start 7-day free trial" |
| Business | Shown ($149) | Shown but **"Coming Soon" / disabled** | "Contact sales" |

### Current Issues

1. **Plus tier exists in backend but is NOT purchasable on the Pricing Page** — there's no checkout flow for it
2. **Business tier is disabled** ("Coming Soon") — no checkout flow
3. **All gated features point to Pro** — even features gated at Plus in the backend show "Upgrade to Pro" in the frontend FeatureGate component
4. **Effectively a 2-tier product**: Free and Pro (with trial)

### Stripe Integration Status
- Checkout, portal, subscription sync, cancellation — all fully implemented
- Price IDs configured via env vars for all 3 paid tiers (monthly + annual)
- 7-day free trial, no credit card required for Pro

### Provider Cost Structure

| Feature | Provider | Cost/Unit | Free | Plus | Pro | Business |
|---|---|---|---|---|---|---|
| Property analysis | RentCast | ~$0.02/call | 3/mo | 25/mo | Unlimited | Unlimited |
| Comps/ARV | Bricked.ai | ~$0.43/comp | 0 | 10/mo | 50/mo | Unlimited |
| Skip tracing | BatchData | ~$0.12/hit | 0 | 0 | 25/mo | 200/mo |
| Direct mail | Lob | $0.63-$1.05/piece | 0 | 0 | 0 | 100/mo |
| AI narratives | Anthropic | ~$0.005/narrative | 3/mo | 25/mo | Unlimited | Unlimited |
| Doc embeddings | OpenAI | ~$0.02/1M tokens | 0 | 5/mo | 25/mo | Unlimited |

### Per-User Cost Estimates (Active User)

| Tier | RentCast | Bricked | Skip | Mail | AI | Total Cost | Price | Gross Margin |
|---|---|---|---|---|---|---|---|---|
| **Free** | $0.06 | $0 | $0 | $0 | $0.015 | ~$0.08 | $0 | -$0.08 |
| **Plus** | $0.50 | $4.30 | $0 | $0 | $0.125 | ~$4.93 | $29 | ~83% |
| **Pro** | $2.00 | $21.50 | $3.00 | $0 | $0.50 | ~$27.00 | $79 | ~66% |
| **Business** | $4.00 | $43.00 | $24.00 | $63-105 | $2.50 | ~$137-179 | $149 | ~-20% to 8% |

**Key margin risk:** Business tier with heavy mail usage is break-even or negative. The 100 mail pieces at $0.63-$1.05 each costs $63-$105/mo alone.

---

## Part 3: Pricing Strategy Analysis

### What the Market Shows

**The "three-tier sweet spot":**
- 3 tiers convert 1.4x better than 2 tiers and 1.8x better than 4+
- 66% of users choose the middle tier ("compromise effect")
- The middle tier should be the one you want most people on

**Freemium wins for RE analysis tools:**
- DealCheck, Rehab Valuator, Stessa, Landlord Studio all have generous free tiers
- Freemium drives 13.3% visitor-to-signup vs 8.5% for free trials
- But freemium converts only 2.6% to paid vs 18.5% for trials
- Parcel's hybrid approach (free tier + trial for Pro) captures both benefits

**RE investors are price-segmented:**
- Analysis-only investors: $0-$20/mo (DealCheck audience)
- Active investors with pipeline: $30-$100/mo (Parcel's sweet spot)
- Full-stack teams: $150-$600/mo (REsimpli/PropStream audience)

**20% annual discount is the market norm** — Stessa, Landlord Studio, Privy, Mashvisor all use 20%.

---

## Part 4: Pricing Recommendations

### Recommendation: Simplify to 3 Tiers (Drop Plus)

**Current problem:** 4 tiers where only 2 are purchasable. Plus is configured but invisible. Business is "Coming Soon." Users see Free vs Pro — that's it.

**Recommended structure:**

| | Free | Pro | Business |
|---|---|---|---|
| **Monthly** | $0 | $79 | $149 |
| **Annual** | $0 | $63/mo ($756/yr) | $119/mo ($1,428/yr) |
| **Annual discount** | - | 20% | 20% |
| **Trial** | - | 7-day, no CC | 7-day, no CC |

### Why Drop Plus ($29)

1. **Nobody can buy it** — the pricing page doesn't render a Plus checkout button
2. **It creates decision paralysis** — research shows 3 tiers > 4 tiers for conversion
3. **The feature gap is weak** — Plus adds pipeline + PDF but not portfolio/comps/comparison. Users who need pipeline usually need everything.
4. **Price anchoring suffers** — $29 makes $79 feel expensive. Without $29, users compare $0 to $79 to $149, and $79 feels like the obvious choice.
5. **Competitors validate this**: DealCheck (3 tiers), Stessa (3 tiers), Landlord Studio (3 tiers)

### Alternative: Keep Plus but Reposition

If you want to keep 4 tiers:

| | Free | Plus | Pro | Business |
|---|---|---|---|---|
| **Monthly** | $0 | $29 | $79 | $149 |
| **Position** | Try it | Casual investor | Active investor | Teams |
| **Key unlock** | 3 analyses | Pipeline + 25 analyses | Everything + skip tracing | Team + mail |

But you'd need to actually build the Plus checkout section on the pricing page.

### Feature Gating Strategy

**Free tier — generous enough to demonstrate value:**
- 3 analyses/month (enough to evaluate 3 deals)
- 5 AI chat messages (taste of AI)
- Basic risk scoring
- All 5 strategies available (this is Parcel's differentiator — don't gate strategies)
- NO pipeline, NO PDF, NO documents

**Pro tier — the "I'm serious about investing" upgrade:**
- Unlimited analyses
- Full pipeline
- PDF reports + offer letters
- Document AI (25/mo)
- Portfolio tracking
- Deal comparison
- Skip tracing (25/mo)
- Bricked comps (50/mo)
- 150 AI messages

**Business tier — obviously for teams:**
- Everything in Pro
- 5 team seats
- Shared pipeline
- Role-based access
- Direct mail (100 pieces/mo)
- Unlimited document AI
- 500 AI messages
- Team analytics

### "Trigger Moment" Psychology

| Moment | What user needs | Gate |
|---|---|---|
| "I found 3 good deals, I need to track them" | Pipeline | Pro |
| "My lender wants a PDF report" | PDF export | Pro |
| "I want to compare these 2 flips" | Deal comparison | Pro |
| "Who owns this property?" | Skip tracing | Pro |
| "My partner needs access" | Team seats | Business |
| "I want to send mailers to this list" | Direct mail | Business |

### Usage-Based Pricing: Include, Don't Overage

**Recommendation: Keep skip traces and mail pieces included in tier limits, not pay-as-you-go.**

Why:
1. **Simplicity** — investors hate surprise bills. "25 skip traces included" is clearer than "$0.12/trace."
2. **Perceived value** — bundling increases the perceived value of Pro vs buying skip traces separately
3. **Parcel is NOT a data provider** — skip tracing is a feature, not the product. Charging per-trace makes it feel like a data tool, not an analysis platform.
4. **Margin protection** — the included limits already cap Parcel's costs. A Pro user who maxes out 25 traces costs $3/mo — well within the $79 margin.

**Exception: Direct mail should stay Business-only** — it's the only feature with real per-unit cost risk ($63-$105/mo). Including it in Pro would destroy margins.

### Free Tier vs Free Trial

**Recommendation: Keep both — free tier + 7-day Pro trial.**

This is exactly what Parcel has now, and it's the optimal approach:
- Free tier captures the 13.3% signup rate (vs 8.5% for trial-only)
- 7-day Pro trial lets users experience the full product
- After trial expires, they keep their data but lose Pro features → strong upgrade motivation
- This matches DealCheck's and Stessa's proven model

### Price Anchoring

**Pro should be the "Recommended" / "Most Popular" tier.** This is already the case (highlighted on pricing page).

The $149 Business tier serves as a price anchor — it makes $79 feel reasonable by comparison. Even though Business is "Coming Soon," showing it on the pricing page with the higher price helps.

### Creative Finance as a Differentiator

**Don't tier-gate strategies.** All 5 strategies (wholesale, flip, buy & hold, BRRRR, creative finance) should be available on Free. This is Parcel's messaging: "the only app that covers all 5 strategies." Gating creative finance behind a paywall would undermine the core value prop.

What TO gate behind Pro for creative finance users:
- Wrap spread calculator
- Sub-to risk score details
- Seller benefit analysis
- Creative deal templates/reports

---

## Summary: What To Do Now

### Immediate (this session):
1. **Decision: 3 tiers or 4?** If 3, remove Plus from landing/pricing. If 4, build the Plus checkout section.
2. **Align all pricing copy** — landing page, pricing page, and tier_config.py must show identical information
3. **Business tier:** Either launch it or keep "Coming Soon" but make sure the copy is accurate

### Before launch:
4. **Monitor Business tier margins** — if direct mail usage is high, consider overage pricing for mail pieces beyond 100
5. **Track upgrade triggers** — instrument which feature gates and quota limits actually drive conversions
6. **A/B test annual discount** — 20% is the market norm but BatchLeads' 40% annual discount suggests higher discounts can work for annual lock-in

### Never:
- Don't gate strategies (all 5 on Free)
- Don't add per-use pricing for core features (analyses, AI chat)
- Don't remove the free tier — it's the #1 acquisition channel for RE tools
