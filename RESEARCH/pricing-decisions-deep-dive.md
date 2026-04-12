# Pricing Decisions — Deep Dive Research

> Date: April 6, 2026
> Status: Research complete, definitive recommendations made

---

## Decision 1: 3 Tiers vs 4 Tiers

### Research Findings

**Conversion data overwhelmingly favors 3 tiers:**

| Study | Finding | Source |
|---|---|---|
| ConversionXL | 4→3 tiers increased conversion by 27% | ConversionXL |
| HubSpot | 3 tiers → 40% higher conversion than 5+ | HubSpot Benchmark |
| Price Intelligently (512 companies) | 3 tiers → 30% higher ARPU than 4+ | ProfitWell |
| Intercom | 6→3 tiers → 17% conversion increase | SaaStock |
| Zoho CRM | 5→3 tiers → 17% trial-to-paid increase | Zoho Case Study |
| HubSpot redesign | Tier consolidation → 112% conversion increase | HelloAdvisr |

**The compromise effect (middle-tier bias):**
- 66% of consumers choose the middle option in a 3-tier structure (Stanford, Journal of Consumer Psychology)
- "Most Popular" badges increase middle-tier selection by up to 25% (Nielsen Norman)
- The top tier serves as a price anchor — even if few buy it, it makes the middle tier feel reasonable

**Patrick Campbell (ProfitWell founder):**
- Tiers should map to buyer personas, not features
- Start by identifying willingness-to-pay segments
- His frameworks naturally produce 3 tiers when segmenting by company size

**Startup best practice:**
- Y Combinator: "Start simple, iterate later"
- Multiple founders: "Expand tiers only when customer data demands it"
- Adding a tier later is easy; removing one creates pricing migration pain

**How best companies evolved:**
- Notion: Currently 4 tiers, but started simpler. Added tiers as they identified enterprise segment.
- Figma: 4 tiers (Starter/Pro/Organization/Enterprise) — but Organization/Enterprise are clearly team tiers
- Vercel: 3 tiers (Hobby/Pro/Enterprise) — clean and effective
- Linear: 3 tiers (Free/Standard/Plus) — minimal and clear

### Parcel-Specific Analysis

| Factor | 3 Tiers (Free/Pro/Business) | 4 Tiers (Free/Plus/Pro/Business) |
|---|---|---|
| Current state | Already functional (only Free + Pro are purchasable) | Plus checkout doesn't exist yet |
| Build cost to launch | $0 (already works) | ~1 hour (add Plus checkout section) |
| Conversion psychology | 66% choose middle (Pro at $79) | Middle shifts to Plus ($29) — less revenue |
| Price anchoring | $0 → $79 → $149 — $79 feels right | $0 → $29 → $79 → $149 — $29 makes $79 feel expensive |
| Operational cost | 3 Stripe products, 3 upgrade paths | 6 Stripe products, 6 upgrade/downgrade paths |
| Feature gate complexity | Binary: free vs paid | Plus vs Pro distinction is weak (pipeline+PDF vs everything) |
| Risk of launching with 3 | Miss $29 revenue from casual users | None — can add Plus later |
| Risk of launching with 4 | N/A | Decision paralysis, lower ARPU, more support |

### Quantitative Impact

If Parcel launches with 4 tiers and the compromise effect applies:
- 66% of paid users choose Plus ($29) instead of Pro ($79)
- ARPU drops from ~$79 to ~$44 ((66% × $29) + (23% × $79) + (11% × $149))
- That's a **44% ARPU reduction**

With 3 tiers:
- 66% choose Pro ($79), 11% choose Business ($149)
- ARPU: ~$96 ((66% × $79) + (23% × $0) + (11% × $149))

**The $29 tier cannibalizes Pro more than it captures new revenue.**

### Recommendation: Launch with 3 Tiers

**Free / Pro ($79) / Business ($149)**

- Drop Plus from the pricing page and landing page
- Keep Plus in the backend tier_config.py as a dormant tier (no need to delete the code)
- If customer feedback reveals demand for a mid-tier, add it in Q3 with data to justify it
- Business stays "Coming Soon" until team features are fully tested

---

## Decision 2: Business Tier Direct Mail Margin

### Research Findings

**Lob's actual per-piece pricing (Growth plan, $550/mo base):**

| Piece Type | Per-Unit Cost |
|---|---|
| 4x6 Postcard (1st Class) | $0.582 |
| 6x9 Postcard (1st Class) | $0.623 |
| B&W Letter (Standard) | $0.606 |
| Color Letter (Standard) | $0.636 |
| Color Letter (1st Class) | $0.859 |

**What competitors charge users:**

| Platform | Per-Piece to User | Model |
|---|---|---|
| PropStream | $0.40-$0.78 | Pay-per-piece on top of subscription |
| REsimpli | $0.30-$0.70 | Included in subscription (Basic $149+) |
| BatchLeads | ~$0.40 | Varies by tier, separate from subscription |
| Ballpoint Marketing | $0.50+ | Standalone direct mail service |

**Key insight:** PropStream and BatchLeads charge per-piece ON TOP of subscription. REsimpli is the only competitor that includes mail in the subscription, and they start at $149/mo with a higher margin on their other features.

**Typical investor mail volume:**

| Type | Monthly Volume |
|---|---|
| Beginner/part-time | 500-1,000 |
| Active wholesaler | 1,000-2,000 |
| Serious investor | 4,000-10,000 |

Even beginners send 500+/month. Parcel's 100 included pieces at Business ($149) covers less than a single campaign. This means either:
- Users blow through the included 100 in week 1 and need overages
- Or users don't use mail through Parcel at all (they use a dedicated service)

### Option Analysis

**Assumptions:** Lob Growth plan, 4x6 postcards at $0.582/piece. Business tier at $149/mo.

| Option | Included | Overage | Base Mail Cost | Max Mail Cost | Gross Margin (typical) | Gross Margin (max) |
|---|---|---|---|---|---|---|
| **A: 50 included, no overage** | 50 | None | $29 | $29 | 80% ($120) | 80% ($120) |
| **B: 50 included + $0.89 overage** | 50 | $0.89/piece | $29 | $29 + overage revenue | 80%+ (overage is profitable) | 80%+ |
| **C: Mail as $49 add-on** | 100 | $0.89/piece | $0 or $58 | $0 or $58 | 100% or 61% | 61%+ |
| **D: Raise to $199 with 100** | 100 | $0.89/piece | $58 | $58 | 71% ($141) | 71%+ |
| **E: No included, all per-piece** | 0 | $0.89/piece | $0 | $0 + revenue | 100% base | 100% base |

### Recommendation: Option B — 50 included + $0.89/piece overage

Why:
1. **50 pieces is a reasonable "taste"** — enough for one small test campaign, not enough to burn margin
2. **$0.89/piece overage is profitable** — Lob costs $0.58, Parcel charges $0.89, that's $0.31 margin per piece (35% gross margin on overage)
3. **Competitors validate per-piece pricing** — PropStream, BatchLeads both charge per-piece. This is expected in the market.
4. **Business tier margin stays healthy**: Base cost $29 (50 × $0.58) + ~$70 other APIs = ~$99 total cost against $149 = **33% gross margin** at base. Every overage piece adds margin.
5. **Users who send 1,000+ pieces/month will pay $845+ in overages** — this becomes significant revenue for heavy users

**Implementation:** Add `mail_overage_price_cents: 89` to tier_config.py. Add overage billing logic to the mail campaign endpoint. Update pricing page copy: "50 mail pieces included, then $0.89/piece."

---

## Decision 3: Bricked.ai Cost & Comp Margin

### Research Findings

**Current Bricked.ai pricing:**

| Plan | Price | Comps/Month | Effective $/Comp |
|---|---|---|---|
| Basic | $49/mo | 100 | $0.49 |
| Growth | $129/mo | 300 | $0.43 |
| Scale | $199/mo | 500 | $0.40 |
| Enterprise | Custom | Unlimited | Custom |

**Parcel's current config:** `COST_CENTS_PER_CALL = 43` ($0.43/comp on Growth plan)

**Alternative comp providers:**

| Provider | $/Call | Provides Comps? | Notes |
|---|---|---|---|
| Bricked.ai | $0.40-$0.49 | Yes + AI repairs + ARV | Best for investor use case |
| RentCast | $0.02-$0.07 | No comps — AVM estimates only | Property data, not comps |
| HouseCanary | $0.40-$5.00 | Yes (institutional grade) | Expensive, enterprise-focused |
| ATTOM | ~$2.50/report | Yes | Very expensive |
| CoreLogic | $0.65-$11.50 | Yes | Enterprise-only, prohibitive |
| BatchData | $0.01+ | Basic property data | No AI analysis |

**Key finding:** Bricked.ai is uniquely positioned — it provides AI-powered comps + repair estimates + ARV in a single call. No other provider at this price point offers the full package. RentCast is 20x cheaper but doesn't provide comps at all.

### Margin Analysis at Various Comp Costs

**Pro tier ($79/mo), 50 comps included:**

| Bricked Cost/Comp | Total Bricked Cost | Other API Costs | Total Cost | Gross Margin |
|---|---|---|---|---|
| $0.43 (current) | $21.50 | ~$5.50 | ~$27.00 | **66%** |
| $0.60 | $30.00 | ~$5.50 | ~$35.50 | 55% |
| $0.80 | $40.00 | ~$5.50 | ~$45.50 | 42% |
| $1.00 | $50.00 | ~$5.50 | ~$55.50 | 30% |
| $1.58 | $79.00 | ~$5.50 | ~$84.50 | **Break-even** |

**Pro becomes unprofitable at ~$1.58/comp.** Current $0.43 cost leaves healthy margin.

**But: do users actually use all 50 comps/month?**

Each analysis triggers one Bricked call. A Pro user running 20 analyses/month uses 20 comps, not 50. The 50-comp limit is the ceiling, not the average.

**Estimated actual usage (Pro user):** 15-25 analyses/month → $6.45-$10.75 in Bricked costs. Actual margin is closer to **82-87%**.

### Caching Opportunity

Currently there is NO per-call caching for Bricked results. But:
- Property-level dedup exists (re-analysis of same address skips API calls entirely)
- If multiple users analyze the same property, each triggers a fresh Bricked call
- Adding a 30-day cache keyed by normalized address would reduce calls significantly in shared markets

**Potential savings from caching:** In markets where investors compete on the same properties (e.g., Atlanta, Houston, Dallas), 20-30% of addresses may be analyzed by multiple users. Caching could reduce Bricked costs by 15-25%.

### Recommendation: Keep current Bricked config, reduce Pro limit to 30

1. **Keep Bricked as the comp provider** — no viable alternative at this price point with the same feature set
2. **Reduce Pro comp limit from 50 to 30** — most Pro users won't hit 30 analyses/month. This reduces worst-case cost from $21.50 to $12.90 while not impacting typical usage.
3. **Add address-level caching** — cache Bricked results for 30 days by normalized address. This reduces API costs for popular properties.
4. **Monitor actual usage** — if average Pro user runs <15 analyses/month, the current pricing is very safe. If they run 30+, consider raising Pro to $89.

**At 30 comps and $0.43/comp:** worst-case Bricked cost = $12.90. Total Pro cost = ~$18.40. Margin = **77%**.

---

## Decision 4: Tier Naming

### Research Findings

**What works in premium SaaS:**
- Almost every successful premium SaaS uses generic tier names (Vercel: Hobby/Pro/Enterprise, Linear: Free/Standard/Plus)
- Themed naming has a near-universal failure mode: users spend cognitive energy decoding the metaphor instead of comparing features
- Dark luxury brands use restraint — Amex doesn't call their cards "Obsidian Titan," they use "Platinum" and "Black"

**Key principle:** The pricing page is a conversion tool, not a branding exercise. Clarity converts. Cleverness creates friction.

### Evaluation of 5 Themed Name Sets

| Theme | Names | Hierarchy Clear? | Premium Feel? | Cringe Risk? | "I'm on __ plan" Test |
|---|---|---|---|---|---|
| RE Metaphors | Lot / Estate / Compound | Weak | Mixed | Medium ("Compound" = survivalist) | "Estate" works, "Lot" = bargain bin |
| Investor Progression | Scout / Investor / Mogul | Yes | No | **High** ("Mogul" = Instagram guru) | Hard no on "Mogul" |
| Property Scale | Studio / Portfolio / Empire | Yes | Mixed | Medium ("Empire" = grandiose) | "Portfolio" is excellent |
| Land/Territory | **Acre / Block / District** | Yes | **Yes** | **Low** | All pass |
| Architecture | Foundation / Structure / Skyline | Weak | Mixed | Low | "Foundation" = nonprofit |

### The Two Viable Options

**Option 1: Free / Pro / Team** (generic, maximum clarity)
- Zero friction, universally understood
- "I'm on Pro" — everyone knows what that means
- Luxury through restraint — confident, not trying hard
- This is what Vercel, Linear, and Raycast do

**Option 2: Acre / Block / District** (themed, brand-aligned)
- Understated, professional, real terminology
- Aligns with "Parcel" (a piece of land) without being on-the-nose
- Size progression is intuitive: small plot → city block → whole district
- None would sound embarrassing said aloud
- "I'm on the Block plan" — neutral, professional

### Recommendation: Free / Pro / Team

The generic names win because:
1. Parcel's brand differentiation lives in the product (dark UI, violet accents, Satoshi type) — not the pricing page
2. RE investors are professionals who want tools, not metaphors
3. "Pro" at $79 is the universal signal for "this is the main paid tier"
4. "Team" at $149 immediately communicates "this is for more than one person"
5. Zero cognitive load on the pricing page means higher conversion

**If you want brand texture**, rename "Team" to "District" (Free / Pro / District). This gives a single branded touch point without sacrificing clarity on the two tiers that matter most.

---

## Final Recommended Pricing Table

| | Free | Pro | Team |
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

### Changes from Current Config

| Change | Current | Recommended | Why |
|---|---|---|---|
| Drop Plus tier | 4 tiers displayed | 3 tiers | Conversion psychology, ARPU protection |
| Rename Business → Team | "Business" | "Team" | Clearer signal for who it's for |
| Reduce Pro comps | 50/mo | 30/mo | Margin protection, most users won't notice |
| Reduce Business mail | 100 included | 50 included + $0.89 overage | Margin protection |
| Add mail overage | None | $0.89/piece | Revenue from heavy mailers |

### Stripe Product/Price Creation Checklist

| Product | Price Name | Amount | Billing |
|---|---|---|---|
| Parcel Pro | pro_monthly | $79.00 | Monthly recurring |
| Parcel Pro | pro_annual | $756.00 | Yearly recurring ($63/mo) |
| Parcel Team | team_monthly | $149.00 | Monthly recurring |
| Parcel Team | team_annual | $1,428.00 | Yearly recurring ($119/mo) |

Set in `.env`:
```
STRIPE_PRICE_PRO_MONTHLY=price_xxx
STRIPE_PRICE_PRO_ANNUAL=price_xxx
STRIPE_PRICE_TEAM_MONTHLY=price_xxx  (rename from BUSINESS)
STRIPE_PRICE_TEAM_ANNUAL=price_xxx   (rename from BUSINESS)
```

### Code Changes Needed

**Backend:**
1. `tier_config.py` — Rename BUSINESS → TEAM. Reduce bricked_lookups_per_month from 50 to 30 on Pro. Reduce mail_pieces_per_month from 100 to 50 on Team. Add mail overage config.
2. `config.py` — Rename STRIPE_PRICE_BUSINESS_* to STRIPE_PRICE_TEAM_* (or add aliases)
3. Keep Plus tier in tier_config as dormant (no user-facing references, but code doesn't break if a user has plan_tier="plus")

**Frontend:**
1. `landing/constants.ts` — Remove Plus tier from PRICING array. Rename Business → Team.
2. `PricingPage.tsx` — Remove Plus section. Rename Business → Team. Activate Team checkout (remove "Coming Soon").
3. `types/index.ts` — Update PlanTier type if Business → Team rename happens. Or keep "business" internally and only change display names.
4. `billing/` components — Update display name from "Business" to "Team" in PlanBadge, FeatureGate, etc.

**Decision:** The Business → Team rename is cosmetic. Internally keep `plan_tier = "business"` in the database to avoid migration. Only change the display name on the frontend.
