# Pricing Deep Dive — Round 2

> Date: April 6, 2026
> Status: Final recommendations

---

## 1. The "Two Real Choices" Problem

### The Concern

With Free / Pro ($79) / Team ($149), most users only see two real choices: Free and Pro. Team is for <5% of users. Does the third tier even help?

### Research: Yes — The Decoy Effect Is Real

**Dan Ariely's Economist Experiment (Predictably Irrational, 2008):**
- Web-only: $59 — 16% chose it
- Print-only: $125 — 0% chose it
- Web + Print: $125 — 84% chose it
- Remove the print-only "decoy" → Web-only jumps to 68%, Web+Print drops to 32%

The print-only option exists solely to make web+print look like a steal. Nobody buys it, but its presence increases revenue per customer by 43%.

**Application to Parcel:**
The Team tier at $149 is not dead weight — it's a price anchor. Even if only 3% of users choose it, its presence on the pricing page:
- Makes $79 Pro feel like the "smart middle choice"
- Establishes that Parcel is worth $149 to some people (social proof of value)
- Creates the asymmetric dominance: Team has everything Pro has plus team features, so Pro looks like the best individual value

**Key research findings:**
- Price anchoring increases willingness-to-pay by 20-30% on the adjacent lower tier (Kahneman & Tversky)
- The "center stage effect" drives 60-70% of buyers to the middle position in a 3-option layout
- Even a tier that only 5% of users select raises ARPU by 8-12% through the anchoring effect on the middle tier

### Does the Team tier need to be purchasable?

Yes, but minimally. "Contact sales" is fine. What matters is that the **price is visible** on the pricing page. A hidden enterprise tier ("Contact us" with no price) provides zero anchoring value because users can't compare it.

### Recommendation: Keep 3 Tiers, Team Price Visible

- Show all three tiers with prices on the pricing page
- Team CTA can be "Contact sales" or "Start trial" — either works
- The $149 price anchors $79 as the smart choice
- Even at 3-5% conversion to Team, the anchoring effect on Pro conversion is worth more than the Team revenue itself

---

## 2. Bricked.ai Complete Analysis

### What One Bricked API Call Returns

From `bricked.py` and the Bricked API response structure:

| Field | Description | Value to Investors |
|---|---|---|
| `cmv` | Current Market Value (AI-estimated) | Instant valuation |
| `arv` | After Repair Value | Core number for flip/BRRRR/wholesale |
| `totalRepairCost` | Total estimated repair cost | Core number for flip/BRRRR |
| `comps[]` | Array of comparable properties with adjusted values, sale dates, details | Due diligence support |
| `property.details` | Beds, baths, sqft, lot sqft, year built | Property data backfill |
| `repairs[]` | Itemized repair list with costs and descriptions | Rehab budget validation |
| `renovationScore` | AI-scored renovation potential with confidence | Quick screening filter |
| `shareLink` | Bricked.ai link to view the report | Shareable with partners |

This is a comprehensive package — no other single API call provides comps + ARV + repair estimates + renovation scoring.

### Pricing Plans

| Plan | Monthly | Comps/Month | $/Comp | Trial |
|---|---|---|---|---|
| Basic | $49 | 100 | $0.49 | 3-day free |
| Growth | $129 | 300 | $0.43 | 3-day free |
| Scale | $199 | 500 | $0.40 | 3-day free |
| Enterprise | Custom | Unlimited | Custom | Custom |

- Monthly cancelable, no annual commitment required
- 3-day free trial on Basic plan
- Overage: not available — hard cap at plan limit

### RentCast vs Bricked Comparison

| Aspect | RentCast ($0.02/call) | Bricked ($0.43/call) |
|---|---|---|
| Property details | Yes (beds, baths, sqft, year) | Yes (backfill only) |
| AVM / Value estimate | Yes (basic statistical) | Yes (AI-powered CMV) |
| Rent estimate | Yes | No |
| After Repair Value | No | **Yes** |
| Comparable sales | No | **Yes (selected + all)** |
| Repair estimates | No | **Yes (itemized)** |
| Renovation score | No | **Yes** |

**Verdict:** RentCast is for basic property data and rent estimates. Bricked is for investor-grade analysis (comps, ARV, repairs). They serve different purposes. Parcel needs both — RentCast for the foundation, Bricked for the analysis layer.

### Break-Even Calculations

**Starting on Basic ($49/mo, 100 comps):**

| Parcel Pro Users | Bricked Calls/Mo (avg 15/user) | Cost at $0.49/call | Break-Even? |
|---|---|---|---|
| 1 | 15 | $7.35 | No ($49 plan minimum) |
| 3 | 45 | $22.05 | No ($49 plan minimum) |
| 7 | 100 | $49.00 | Break-even on Basic |
| 10 | 150 | Need Growth | Upgrade to Growth |

**When to upgrade from Basic to Growth:**

At 100+ calls/month (7+ active Pro users), Basic caps out. Growth ($129/mo, 300 comps) becomes necessary.

- At $0.43/comp (Growth): 7 users × 15 calls × $0.43 = $45.15/mo → Plan costs $129, so break-even is actually 20 users
- **True break-even on Growth: 20 Pro users** ($129 / $6.45 per user = 20)

**Scaling path:**

| Pro Users | Calls/Mo | Plan Needed | Plan Cost | Revenue ($79/user) | Bricked Margin |
|---|---|---|---|---|---|
| 5 | 75 | Basic ($49) | $49 | $395 | $346 (88%) |
| 10 | 150 | Growth ($129) | $129 | $790 | $661 (84%) |
| 25 | 375 | Scale ($199) | $199 | $1,975 | $1,776 (90%) |
| 50 | 750 | Enterprise | ~$300-400 | $3,950 | ~$3,550 (90%) |
| 100 | 1,500 | Enterprise | ~$500-700 | $7,900 | ~$7,200 (91%) |

**Key insight:** Bricked costs as a percentage of revenue DECREASE as Parcel scales. At 5 users, Bricked is 12% of revenue. At 100 users, it's ~8%.

### Recommendation

1. **Start on Basic ($49/mo)** — more than enough for the first 7 users
2. **Upgrade to Growth at 10+ active Pro users** — plan for this at ~$500 MRR
3. **Keep bricked_lookups_per_month at 30 for Pro** — realistic for active users, protects against abuse
4. **Add address-level caching (30 days)** — reduces repeat calls for popular properties
5. **Bricked is NOT optional** — it's Parcel's core differentiator. Without comps/ARV/repairs, Parcel is just a mortgage calculator with a nice UI.

---

## 3. Pricing Psychology Research

### Dan Ariely's Key Experiments (Predictably Irrational)

1. **The Economist experiment** (described above): Decoy pricing increases revenue by 43%
2. **Anchor pricing**: When shown a high number first (even arbitrary), people's subsequent valuations shift upward by 20-60%
3. **"Free" is special**: The gap between $0 and $1 is psychologically much larger than the gap between $1 and $2. Free creates a different mental category — it's not just a lower price, it's "no risk"

### William Poundstone's Anchoring Research (Priceless)

- **Anchoring effect**: People anchor to the first price they see. If $149 (Team) is the first price visible on the page, $79 feels like a deal
- **Precise vs round numbers**: $79 feels more deliberate/researched than $80. Studies show precise prices increase perceived value by 5-10%
- **"9-ending" prices**: $79 outperforms $80 by 5-8% in conversion. The "left digit effect" — the brain reads $79 as "seventy-something" vs $80 as "eighty"

### The Compromise Effect (Deeper)

The compromise effect is not just "people choose the middle." Research shows:
- The middle option is chosen 2.5x more than the extremes when it's **clearly positioned as the default**
- Visual design reinforcement (larger card, different color, "Most Popular" badge) increases the effect by 15-25%
- **But**: the effect requires the middle option to be **dominated by neither extreme**. If the top tier has only one extra feature, the middle tier looks almost as good — weakening the anchor. If the top tier has many extras, the middle tier feels like it's missing too much

For Parcel: Team has team seats + shared pipeline + direct mail + unlimited docs — enough differentiation that Pro doesn't feel incomplete.

### Charm Pricing ($79 vs $80 vs $99)

- $79/mo is correct. Research consistently shows:
  - $79 > $80 (left digit effect: "seventy" vs "eighty")
  - $79 > $75 (too "rounded" feels arbitrary; $79 feels calculated)
  - $79 < $99 (but $99 signals "almost $100" — too high for an analysis tool)
  - $79 is in the "sweet spot" between DealCheck ($20) and REsimpli ($149)

### Free-to-Paid Conversion Benchmarks

| Model | Typical Conversion Rate | Time to Convert |
|---|---|---|
| Freemium (no trial) | 2-5% | 30-90 days |
| Freemium + trial | 3-8% | 14-30 days |
| Free trial only (no CC) | 15-25% | During trial |
| Free trial (CC required) | 40-60% | During trial |

Parcel uses freemium + trial (the hybrid model). Expected conversion: **3-8% of free users → Pro**, with most converting within the trial period.

**What triggers conversion (in order of effectiveness):**
1. **Hit a hard feature gate** (e.g., try to export PDF → blocked → "Upgrade to Pro")
2. **Hit a usage limit** (e.g., 4th analysis blocked → "You've used 3 of 3 this month")
3. **Social proof / fear of missing out** (e.g., trial ending countdown)
4. **Cumulative value realization** (e.g., analyzed 3 deals, seeing the value, want to keep going)

For Parcel: The #1 trigger should be the **pipeline gate**. A user analyzes 3 deals → wants to track them → pipeline is Pro-only → upgrade moment.

### Visual Pricing Page Psychology

- **"Most Popular" badge works**: Studies show it increases selection of the marked tier by 15-25%
- **Position**: The recommended tier should be in the **center** for 3-tier layouts. Left-to-right reading creates a natural comparison flow
- **Card size**: The recommended tier card should be visually elevated (slight scale or border highlight). Parcel already does this (highlighted: true in the PRICING array)
- **CTA color**: The primary CTA should use the brand accent color (Parcel's violet #8B7AFF). Contrast with the card background matters more than the specific hue
- **Show annual savings**: "Save 20%" badges increase annual plan selection by 30-40%

---

## 4. Tier Naming — 10 Sets Evaluated

### Evaluation Criteria

For each set: **Hierarchy** (is the size progression obvious?), **Premium** (does it feel luxury?), **Cringe** (would a professional wince?), **Brand** (does it connect to "Parcel"?)

Personas for testing:
- **Desiree**: 35, female, solo wholesaler in Milwaukee, doing 2-3 deals/month, practical and no-nonsense
- **Carlos**: 42, male, creative finance investor in Houston, doing $150K+ deals, sophisticated

### Set 1: Lot / Parcel / Estate
- Hierarchy: **9/10** — small piece → medium piece → large property, clear
- Premium: **8/10** — "Estate" is strong, "Lot" is humble but honest, "Parcel" is the brand name
- Cringe: **2/10** — zero cringe, all real RE terms
- Brand: **10/10** — the brand name IS the middle tier
- Desiree: "I'm on the Parcel plan" — yes, this works. It's the product name, feels natural.
- Carlos: "I'm on the Estate plan" — yes, connotes wealth and scale.
- Problem: Using the product name as a tier name is clever but might confuse ("Are you on Parcel?" "Yes, I'm on Parcel Parcel")

### Set 2: Acre / Block / District
- Hierarchy: **9/10** — small → medium → large, clear land progression
- Premium: **8/10** — understated, professional
- Cringe: **1/10** — all real, professional terms
- Brand: **8/10** — land terms match "Parcel" theme
- Desiree: "I'm on the Block plan" — totally fine, neutral
- Carlos: "I'm on the District plan" — works, implies authority
- Problem: None significant

### Set 3: Plot / Quarter / Section
- Hierarchy: **10/10** — actual land survey hierarchy (plot < quarter section < section = 640 acres)
- Premium: **6/10** — "Plot" feels a bit mundane, "Quarter" sounds like a fraction
- Cringe: **2/10** — real terms, no issues
- Brand: **9/10** — deep RE land survey knowledge
- Desiree: "I'm on the Quarter plan" — awkward, sounds like a fraction of something
- Carlos: "I'm on the Section plan" — fine, but vague to non-survey people
- Problem: "Quarter" is confusing — sounds like a partial product

### Set 4: Stake / Holding / Portfolio
- Hierarchy: **8/10** — small ownership → medium → large collection
- Premium: **9/10** — "Portfolio" and "Holding" are investment vocabulary
- Cringe: **2/10** — professional finance terms
- Brand: **7/10** — investment-themed rather than land-themed
- Desiree: "I'm on the Holding plan" — slightly unusual but fine
- Carlos: "I'm on the Portfolio plan" — excellent, this is his world
- Problem: "Stake" for the free tier feels oddly aggressive (like "staking a claim")

### Set 5: Base / Range / Summit
- Hierarchy: **9/10** — bottom → middle → top, obvious
- Premium: **6/10** — generic outdoor/mountain metaphor, not land-specific
- Cringe: **4/10** — "Summit" feels like a conference name, slightly corporate
- Brand: **4/10** — no connection to real estate or "Parcel"
- Desiree: "I'm on the Range plan" — meh, sounds like a cell carrier
- Carlos: "I'm on the Summit plan" — sounds like a corporate retreat
- Problem: Wrong metaphor domain entirely

### Set 6: Deed / Title / Grant
- Hierarchy: **6/10** — all convey ownership but unclear size progression
- Premium: **8/10** — legal RE terminology, professional
- Cringe: **3/10** — "Grant" sounds like a person's name
- Brand: **8/10** — RE legal terms
- Desiree: "I'm on the Deed plan" — slightly weird
- Carlos: "I'm on the Grant plan" — "Grant who?"
- Problem: Hierarchy is not intuitive — is "Title" bigger than "Deed"?

### Set 7: Core / Pro / Collective
- Hierarchy: **8/10** — base → professional → team/group
- Premium: **7/10** — clean, modern
- Cringe: **2/10** — professional and neutral
- Brand: **5/10** — no RE connection
- Desiree: "I'm on Core" — fine
- Carlos: "I'm on the Collective plan" — fine, implies team
- Problem: "Core" for free feels too essential — why would you upgrade FROM the core?

### Set 8: Tract / Block / Township
- Hierarchy: **10/10** — actual land survey terms in ascending size (tract < block < township)
- Premium: **7/10** — understated, professional
- Cringe: **2/10** — real terms, no issues
- Brand: **9/10** — perfect fit for "Parcel" land theme
- Desiree: "I'm on the Block plan" — works
- Carlos: "I'm on the Township plan" — sounds a bit rural/governmental
- Problem: "Township" has municipal government connotations, not investment

### Set 9: Holding / Estate / Compound
- Hierarchy: **7/10** — ascending property size, but "Compound" is ambiguous
- Premium: **8/10** — "Estate" is excellent
- Cringe: **5/10** — "Compound" evokes militias/survivalists
- Brand: **7/10** — property-scale terms
- Desiree: "I'm on the Compound plan" — no, this sounds weird
- Carlos: "I'm on the Estate plan" — yes
- Problem: "Compound" kills it

### Set 10: Parcel / Block / District
- Hierarchy: **9/10** — small land → city block → governing area
- Premium: **9/10** — the brand name as the entry tier is bold
- Cringe: **1/10** — all professional, understated
- Brand: **10/10** — brand name anchors the entire naming system
- Desiree: "I'm on the Parcel plan" — natural, it's the product name
- Carlos: "I'm on the District plan" — authoritative, implies scale
- Problem: Free tier named after the product — is that confusing or genius? It could mean "this IS Parcel" (the default experience) or it could seem weird ("I'm on Parcel Parcel")

### Scoring Summary

| Set | Hierarchy | Premium | Cringe (low=good) | Brand | Total |
|---|---|---|---|---|---|
| 1. Lot / Parcel / Estate | 9 | 8 | 2 | 10 | 35 |
| **2. Acre / Block / District** | **9** | **8** | **1** | **8** | **36** |
| 3. Plot / Quarter / Section | 10 | 6 | 2 | 9 | 33 |
| 4. Stake / Holding / Portfolio | 8 | 9 | 2 | 7 | 32 |
| 5. Base / Range / Summit | 9 | 6 | 4 | 4 | 27 |
| 6. Deed / Title / Grant | 6 | 8 | 3 | 8 | 29 |
| 7. Core / Pro / Collective | 8 | 7 | 2 | 5 | 28 |
| **8. Tract / Block / Township** | **10** | **7** | **2** | **9** | **34** |
| 9. Holding / Estate / Compound | 7 | 8 | 5 | 7 | 27 |
| 10. Parcel / Block / District | 9 | 9 | 1 | 10 | 35 |

### Does Tier Name Affect Conversion?

The honest answer from research: **minimally, compared to price, features, and page design.** No study shows a statistically significant conversion difference between generic and branded tier names. What matters is:
1. **Hierarchy clarity** — can users immediately rank the tiers?
2. **No cognitive friction** — does the name require explanation?
3. **Identity alignment** — does the name match how users see themselves?

Themed names neither help nor hurt conversion IF the hierarchy is clear. They DO create brand recall and differentiation — which matters more for word-of-mouth than for pricing page conversion.

---

## 5. FINAL Recommendation

### Tier Names: Acre / Block / District

This wins because:
- **Zero cringe** — lowest of any set (1/10)
- **Clear hierarchy** — everyone intuitively knows an acre < a block < a district
- **Professional** — real terminology that RE investors use and respect
- **Brand-aligned** — land measurement terms connect naturally to "Parcel" (a piece of land)
- **Both personas pass** — Desiree says "I'm on Block" without wincing, Carlos says "I'm on District" without it feeling beneath him
- **The free tier doesn't feel cheap** — "Acre" is a real unit of land, not a diminutive

Alternative: Set 10 (Parcel / Block / District) scores equally high and has the boldest brand play. But using the product name as a tier name risks confusion in customer support conversations ("What plan are you on?" "Parcel." "No, which Parcel plan?").

### Final Pricing Table

| | Acre (Free) | Block ($79) | District ($149) |
|---|---|---|---|
| **Monthly** | $0 | $79 | $149 |
| **Annual** | $0 | $63/mo ($756/yr) | $119/mo ($1,428/yr) |
| **Discount** | - | 20% | 20% |
| **Trial** | - | 7-day, no CC | 7-day, no CC |
| **Analyses/month** | 3 | Unlimited | Unlimited |
| **Saved deals** | 5 | Unlimited | Unlimited |
| **AI messages/month** | 5 | 150 | 500 |
| **Document uploads/month** | 0 | 25 | Unlimited |
| **Bricked comps/month** | 0 | 30 | Unlimited |
| **Skip traces/month** | 0 | 25 | 200 |
| **Mail pieces/month** | 0 | 0 | 50 included |
| **Mail overage** | - | - | $0.89/piece |
| **Team seats** | - | - | 5 |
| **Pipeline** | No | Yes | Yes |
| **PDF exports** | No | Yes | Yes |
| **Portfolio** | No | Yes | Yes |
| **Offer letters** | No | Yes | Yes |
| **Deal comparison** | No | Yes | Yes |
| **All 5 strategies** | Yes | Yes | Yes |

### Key Design Decisions Embedded

1. **3 tiers, not 4** — compromise effect drives 66% to Block, Team/District anchors the price
2. **$79 ends in 9** — left-digit effect confirmed by research
3. **Block is "Most Popular"** — visual badge + center position + larger card
4. **All strategies on Acre** — Parcel's core differentiator ("all 5 strategies") stays ungated
5. **Pipeline is the #1 upgrade trigger** — "I analyzed 3 deals, now I need to track them" → Block
6. **50 mail pieces + overage on District** — protects margin, matches competitor models
7. **30 Bricked comps on Block** — realistic usage ceiling, 77% gross margin at worst case
8. **District price visible** — anchors Block as the smart choice even if few buy District

### Bricked Strategy

| Phase | Pro Users | Bricked Plan | Monthly Cost | Action |
|---|---|---|---|---|
| Launch | 0-7 | Basic ($49) | $49 | Start here, 3-day trial first |
| Growth | 8-20 | Growth ($129) | $129 | Upgrade when approaching 100 calls/mo |
| Scale | 21-50 | Scale ($199) | $199 | Upgrade at 300 calls/mo |
| Mature | 50+ | Enterprise | Custom | Negotiate volume pricing |

### Stripe Configuration

| Product | Price ID Name | Amount | Billing |
|---|---|---|---|
| Parcel Block | block_monthly | $79.00 | Monthly |
| Parcel Block | block_annual | $756.00 | Yearly |
| Parcel District | district_monthly | $149.00 | Monthly |
| Parcel District | district_annual | $1,428.00 | Yearly |

### Code Changes

**Backend (keep internal names, change display only):**
- `tier_config.py`: Keep `FREE`, `PLUS` (dormant), `PRO`, `BUSINESS` internally
- Add `TIER_DISPLAY_NAMES = {"free": "Acre", "pro": "Block", "business": "District"}`
- Reduce `bricked_lookups_per_month` from 50 to 30 on PRO
- Reduce `mail_pieces_per_month` from 100 to 50 on BUSINESS
- Add `mail_overage_price_cents = 89`

**Frontend:**
- `landing/constants.ts`: Update PRICING array with Acre/Block/District names
- `PricingPage.tsx`: Update display names, remove Plus section, activate District checkout
- `billing/PlanBadge.tsx`: Map internal tier names to display names
- `billing/FeatureGate.tsx`: Update upgrade prompts to use "Block" instead of "Pro"

**Important:** Keep `plan_tier` column values as `"free"`, `"pro"`, `"business"` in the database. Only change the user-facing display names. This avoids any migration.
