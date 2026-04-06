# Bricked.ai -- Exhaustive Research Analysis

**Prepared for:** Ivan Flores / Parcel (parceldesk.io)
**Date:** 2026-04-02
**Contact at Bricked:** Abhi Bharatham (abhi@bricked.ai)
**Demo Booking:** https://cal.com/abhiram-bharatham-bpga78

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Core Product](#2-core-product)
3. [AI Comping Methodology](#3-ai-comping-methodology)
4. [API & Technical Details](#4-api--technical-details)
5. [Pricing](#5-pricing)
6. [UI/UX & Report Format](#6-uiux--report-format)
7. [Repair Estimates](#7-repair-estimates)
8. [Property Data Coverage](#8-property-data-coverage)
9. [Social & Press Footprint](#9-social--press-footprint)
10. [Founder Background](#10-founder-background)
11. [Tech Stack](#11-tech-stack)
12. [Competitive Landscape](#12-competitive-landscape)
13. [Integration Analysis for Parcel](#13-integration-analysis-for-parcel)
14. [Build vs Buy Analysis](#14-build-vs-buy-analysis)
15. [Risks & Open Questions](#15-risks--open-questions)
16. [Sources](#16-sources)

---

## 1. Executive Summary

Bricked.ai is an AI-powered real estate underwriting and comping platform launched **January 10, 2026** out of **San Francisco, CA**. It targets real estate investors, wholesalers, fix-and-flippers, and acquisitions teams with a single promise: **complete property analysis in under 30 seconds** (marketing claims range from 15-30 seconds depending on source).

The platform delivers four core outputs per property:
- **AI-selected comparable sales** (appraiser-style logic, not just filter matching)
- **After Repair Value (ARV)** and **Current Market Value (CMV)**
- **Line-item repair cost estimates** (localized labor + material pricing)
- **Computer vision condition scoring** (renovation score 0-1 scale)

Bricked has processed **12,000+ deals** since launch (per homepage), claims **1,000+ real estate investor users**, indexes **150M+ properties nationwide**, and reports a **+31% improvement in lead-to-offer conversion** for users.

**API access is available** starting at the Growth tier ($129/mo). The API is clean, RESTful, documented via Mintlify with a full OpenAPI 3.1 spec. This makes it a viable integration target for Parcel.

---

## 2. Core Product

### What It Does

Bricked automates the property underwriting workflow that investors traditionally do manually across multiple tools (MLS searches, spreadsheets, repair calculators, Zillow/Redfin). A user enters a property address and gets back:

1. **Subject property profile** -- beds, baths, sqft, year built, lot size, ownership, mortgage debt, tax history, MLS status, images
2. **Comparable sales** -- AI-selected comps with adjusted values, classified as CMV or ARV comps
3. **Valuations** -- CMV (current market value) and ARV (after-repair value)
4. **Repair estimates** -- Line-item breakdown with costs based on localized labor/material data
5. **Shareable report** -- Dashboard links (public and authenticated)

### Problem Solved

Manual comping takes 30-60+ minutes per property. Investors juggling PropStream, Zillow, MLS, Excel, and contractor estimates lose deals to faster competitors. Bricked compresses this to seconds.

### Target Users

- Real estate investors (fix-and-flip, BRRRR, rental)
- Wholesalers (high volume, speed-critical)
- Acquisitions managers at investment firms
- Portfolio managers evaluating deal flow
- Underwriters producing deal packages
- Real estate agents doing quick CMAs

### Value Proposition vs Alternatives

| Dimension | Bricked | PropStream | BatchLeads | ChatARV |
|-----------|---------|------------|------------|---------|
| **Primary focus** | Comps + underwriting | Property data research | Lead gen + marketing | AI comps |
| **Speed** | ~17 sec average | Manual search | Manual search | ~60 sec |
| **AI comping** | Yes (appraiser-style) | No (filter-based) | No | Yes |
| **Repair estimates** | Yes (localized, line-item) | No | No | Yes |
| **Computer vision** | Yes (renovation scoring) | No | No | Unknown |
| **API** | Yes ($129+/mo) | No public API | No public API | No |
| **Starting price** | $49/mo | $99/mo | Acquired by PropStream | $89/mo |
| **Non-disclosure states** | Yes | Partial | Partial | Disclosure states only |

---

## 3. AI Comping Methodology

### Comparable Selection

Bricked uses an approach modeled on professional appraiser methodology (sales comparison approach):

1. **Geographic boundaries** -- Respects neighborhood-level dividers: major roads, highways, railways, natural features. Does not just use radius circles. This matters because pricing can shift block-by-block.

2. **Condition analysis via computer vision** -- Analyzes property images (curb appeal, exterior, interior, kitchen, bathroom) to assign a **renovation score** (0-1 scale):
   - 0-0.3 = low renovation / as-is
   - 0.3-0.7 = medium renovation
   - 0.7-1.0 = high renovation / fully renovated
   - Confidence score (0-1) included; values > 0.6 indicate reliable scoring

3. **Buyer behavior modeling** -- Adjustments reflect how local buyers actually value differences in size, layout, and amenities, not generic national per-sqft adjustments.

4. **Feature-specific AVM** -- Internal Automated Valuation Model prices individual features (bedrooms, bathrooms, sqft, pools, etc.) **by zip code and property type**. Example cited: a SFH in GA (30024) has an average bedroom value of $12,000.

5. **Comp classification** -- Each comparable is tagged with a `compType` (CMV or ARV) and a `listingType` source label. Selected comps are flagged with `selected: true`.

6. **Adjusted values** -- Each comp returns an `adjusted_value` field representing Bricked's price adjustment for differences from the subject.

### Data Sources

- **MLS** -- Live MLS data including listing status, days on market, agent info, historic listings
- **County records** -- Tax assessments, ownership, mortgage recordings, transactions
- **Public listing sites** -- Zillow and similar public web sources
- **Non-disclosure state data** -- Cross-references multiple sources to provide comps in non-disclosure states (a significant differentiator)

### Accuracy Claims

- No published accuracy metrics (e.g., median absolute percentage error) found in public materials
- Marketing positions it as "appraiser-grade" quality
- Testimonials mention consistency but no independent benchmarks discovered
- One ChatARV user tested 150 properties and found "the most consistent" results (not Bricked specifically, but relevant competitor benchmark)

---

## 4. API & Technical Details

### Overview

The Bricked API is a clean REST API documented with an OpenAPI 3.1 specification hosted on Mintlify (docs.bricked.ai). It allows programmatic property analysis creation and retrieval.

### Authentication

- **Method:** API key in header
- **Header:** `x-api-key: <YOUR_API_KEY>`
- **Access:** Available on Growth plan ($129/mo) and above

### Base URL

```
https://api.bricked.ai
```

### Endpoints

#### POST-equivalent: Create Property
```
GET /v1/property/create?address=<address>
```

**Required Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `address` | string | Property address to analyze |

**Optional Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `bedrooms` | integer (min 1) | Override auto-detected bedroom count |
| `bathrooms` | number (min 0.5, step 0.5) | Override auto-detected bathroom count |
| `squareFeet` | integer (min 1) | Override auto-detected square footage |
| `yearBuilt` | integer (min 1) | Override auto-detected year built |
| `landUse` | enum | Override land use classification (see below) |
| `images` | string | Comma-separated image URLs |
| `repairs` | string | Natural language repair description for AI to price |

**Land Use Enum Values:**
`vacantResidential`, `singleFamily`, `multiFamily2to4`, `multiFamily5plus`, `duplex`, `townhouse`, `mobile`, `apartments`, `vacantLand`

**Note:** This endpoint uses GET method (unusual for a create operation -- likely for simplicity since all params are query strings). The `repairs` parameter is notable: you pass a **natural language description** of repairs needed and the AI researches and generates cost estimates.

**Response:** Full `Property` object (see schema below)

**Status Codes:**
| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Invalid address or storage failure |
| 401 | API key verification failed |
| 402 | Subscription inactive |
| 404 | Property not found |
| 412 | Missing required data (e.g., squareFeet not available) |
| 500 | Internal server error |

#### Get Property
```
GET /v1/property/get/{id}
```

Returns the full Property object by UUID.

#### List Properties
```
GET /v1/property/list?page=<n>
```

Paginated listing (0-based). Returns `properties[]`, `nextPage`, `hasMore`.

### Complete Response Schema

The `Property` object returned by Create and Get endpoints contains:

```
Property
  id: string (UUID)
  cmv: number (nullable) -- Current Market Value
  arv: number (nullable) -- After Repair Value
  totalRepairCost: number
  shareLink: string -- Public dashboard URL
  dashboardLink: string -- Authenticated dashboard URL
  
  property: PropertySummary
    latitude: number
    longitude: number
    address: Address
      streetNumber, streetName, streetSuffix
      zip, plusFour, carrierRoute
      cityName, countyName, stateCode, fullAddress
    images: string[]
    
    details: PropertyDetails
      bedrooms, bathrooms, squareFeet, yearBuilt
      lotSquareFeet, occupancy, stories
      lastSaleDate, lastSaleAmount
      basementType, basementSquareFeet
      poolAvailable, garageType, garageSquareFeet
      airConditioningType, heatingType, heatingFuelType
      hoaPresent, hoa1Fee, hoa1FeeFrequency
      legalDescription, fireplaces
      exteriorWallType, daysOnMarket, marketStatus
      surroundingType, nonDisclosure
      renovationScore: { hasScore, confidence, score }
    
    landLocation: LandLocation
      apn, zoning, landUse, propertyClass
      lotNumber, block, schoolDistrict, subdivision, countyName
    
    mortgageDebt: MortgageDebt
      openMortgageBalance, estimatedEquity
      purchaseMethod, ltvRatio, itvRatio
      mortgages[]: Mortgage
        seq, amount, interestRate
        recordingDate, documentDate, maturityDate
        recordingBook, recordingPage, documentNumber
        lenderName, termType, term, documentCode
        transactionType, granteeName, riders
        description, position, loanType, termDescription
    
    ownership: Ownership
      owners[]: { firstName, lastName }
      ownershipLength, ownerType, ownerOccupancy
      taxExemptions, taxAmount
      taxes[]: TaxEntry
        year, taxAmount, assessedValue
        taxAmountChange, assessedValueChange
      transactions[]: Transaction
        saleDate, amount, purchaseMethod
        sellerNames, buyerNames
    
    mls: MlsListing (nullable)
      status, category, listingDate, amount
      daysOnMarket, mlsName, mlsNumber
      interiorFeatures, applianceFeatures
      agent: { agentName, agentPhone, officeName, officePhone }
      historicListings[]: HistoricListing
        listingDate, status, amount, pricePerSquareFoot
        daysOnMarket, agentName, mlsName, mlsNumber
  
  comps[]: ComparableProperty
    (all PropertySummary fields plus:)
    selected: boolean
    compType: string ("cmv" or "arv")
    listingType: string
    adjusted_value: number
  
  repairs[]: Repair
    repair: string (short label)
    description: string (detailed description)
    cost: number (estimated cost in dollars)
```

### Rate Limits

**Not documented** in the OpenAPI spec or public documentation. This is an open question for the integration conversation.

### LLM Integration

Bricked hosts an `llms.txt` file at `https://docs.bricked.ai/llms.txt`, which is the emerging standard for making documentation discoverable to AI agents and LLMs. This suggests they are thinking about AI-to-AI integrations.

---

## 5. Pricing

### Plan Tiers

| Tier | Monthly Price | Comps/Month | Team Seats | API Access | Key Features |
|------|--------------|-------------|------------|------------|--------------|
| **Basic** | $49 | 100 | 1 | No | Instant Offer Price, Auto Comp Selection, AI Repair Estimates |
| **Growth** | $129 | 300 | 2 | Yes | Everything in Basic + API Access |
| **Scale** | $199 | 500 | Unlimited | Yes | Everything in Growth + Unlimited Team Seats |
| **Enterprise** | Custom | Unlimited | Custom | Yes | Everything in Scale + Priority Queue |

### Key Pricing Notes

- **3-day free trial** available
- No hidden fees, cancel anytime
- API access starts at Growth tier ($129/mo for 300 comps)
- **Cost per comp**: $0.49 (Basic), $0.43 (Growth), $0.40 (Scale)
- No separate API pricing -- API calls consume the same comp allocation as UI usage
- No per-call overage pricing documented (likely hard cap at tier limit)

### Pricing Comparison with Alternatives

| Platform | Starting Price | Comps API | Per-Comp Cost |
|----------|---------------|-----------|---------------|
| **Bricked** | $49/mo (100 comps) | $129/mo (300 comps) | ~$0.43-0.49 |
| **HouseCanary** | $190/yr (2 reports/mo) | $790/yr (15/mo + per-call) | $0.50-6.00/call |
| **ATTOM Data** | ~$95/mo | Custom pricing | Per-call, custom |
| **PropStream** | $99/mo | No public API | N/A |
| **ChatARV** | $89/mo | No API | N/A |
| **DealCheck** | $0-20/mo | No API | N/A |

**Bricked is notably cheaper than HouseCanary** for API access and includes comps + ARV + repairs in a single call, whereas HouseCanary charges separately for basic, premium, and premium plus endpoints ($0.50 to $6.00 per call).

---

## 6. UI/UX & Report Format

### Screens Identified (from marketing materials and documentation)

1. **Property Search** -- Address input with optional overrides (beds, baths, sqft, year built, land use)
2. **Property Dashboard** -- Main analysis view showing subject property details, comps, valuations, and repairs
3. **Comp Map/List** -- Comparable properties displayed with adjusted values, tagged as CMV or ARV
4. **Repair Estimate Panel** -- Line-item breakdown of repairs with individual costs
5. **Shareable Report** -- Public link for sharing with partners, lenders, buyers (via `shareLink`)
6. **Authenticated Dashboard** -- Full-feature view for logged-in users (via `dashboardLink`)
7. **Portfolio/History View** -- List of previously analyzed properties with pagination

### Report Contents

Each analysis produces a shareable report containing:
- Subject property photo(s), address, and key characteristics
- CMV and ARV valuations
- Selected comparable sales with adjustments
- Renovation score with confidence level
- Line-item repair estimates with total cost
- Property details (ownership, mortgage, tax history, MLS info)
- Dashboard links for interactive exploration

---

## 7. Repair Estimates

### Methodology

Bricked generates repair estimates using a combination of:

1. **Natural language input** -- Users can describe repairs needed in plain text (e.g., "needs new roof, kitchen remodel, bathroom update"). The AI parses this and generates cost estimates.

2. **Computer vision analysis** -- When images are provided, the system evaluates condition of exterior, interior, kitchen, and bathrooms to identify needed repairs.

3. **Localized pricing** -- Aggregates material costs from a national database indexed by zip code and labor pricing scraped/aggregated from the web. This produces estimates specific to the property's location, not generic national averages.

### API Response Format

Each repair is returned as:
```json
{
  "repair": "Roof Replacement",
  "description": "Full roof tear-off and replacement with architectural shingles, including underlayment and flashing",
  "cost": 12500
}
```

The response also includes `totalRepairCost` as a sum of all individual repair costs.

### Customization

- Users can provide their own repair descriptions via the `repairs` query parameter
- The AI then researches and generates localized cost estimates for the described work
- No evidence of a drag-and-drop repair builder or per-item override UI was found, though the natural language input is flexible

### Level of Detail

- Line-item level (individual repair tasks)
- Short label + detailed description + dollar cost per item
- Location-adjusted (zip code level)
- No room-by-room breakdown format found, but repairs are specific enough to map to rooms (e.g., "kitchen remodel", "bathroom update")

---

## 8. Property Data Coverage

### Data Richness

Bricked surfaces an unusually complete property profile from a single API call. Here is the full data map:

**Physical Property:**
Bedrooms, bathrooms, sqft, year built, lot sqft, stories, basement (type + sqft), pool, garage (type + sqft), AC type, heating type/fuel, fireplaces, exterior wall type, HOA (present + fee + frequency), legal description

**Location & Land:**
APN (assessor parcel number), zoning code, land use classification, property class, lot/block numbers, school district, subdivision, county, lat/long coordinates

**Ownership:**
Owner names (first + last), ownership length (months), owner type, occupancy status, tax exemptions

**Tax History:**
Annual tax amounts, assessed values, year-over-year changes (multi-year array)

**Transaction History:**
Sale dates, amounts, purchase methods, seller names, buyer names

**Mortgage/Debt:**
Open mortgage balance, estimated equity, LTV ratio, ITV ratio, plus detailed mortgage records: amount, interest rate, recording/document/maturity dates, book/page references, document numbers, lender name, term type/length, loan type, lien position, riders, grantee name

**MLS:**
Listing status, category, date, price, DOM, MLS name/number, interior features, appliance features, agent name/phone, office name/phone, plus historic listing array with dates, statuses, prices, price/sqft, DOM, agents

**Renovation:**
Computer vision renovation score (0-1) with confidence rating

**Comparable Properties:**
Each comp includes ALL of the above fields, plus: `selected` flag, `compType` (cmv/arv), `listingType`, and `adjusted_value`

### Coverage Comparison

| Data Point | Bricked | PropStream | HouseCanary | ATTOM |
|------------|---------|------------|-------------|-------|
| Property details | Yes | Yes | Yes | Yes |
| Ownership | Yes | Yes | Yes | Yes |
| Mortgage debt | Yes | Yes | Limited | Yes |
| Tax history | Yes | Yes | Limited | Yes |
| Transaction history | Yes | Yes | Yes | Yes |
| MLS listings | Yes | Yes | Yes | Partial |
| Historic MLS | Yes | Unknown | Unknown | No |
| AI-selected comps | Yes | No | Partial (AVM) | No |
| Repair estimates | Yes | No | No | No |
| Renovation score | Yes | No | No | No |
| Non-disclosure states | Yes | Partial | Unknown | Partial |
| Computer vision | Yes | No | No | No |

### Geographic Coverage

- **Nationwide** -- 150M+ properties indexed
- **All 50 states** including non-disclosure states (TX, NM, UT, WY, AK, ID, KS, LA, MS, MO, MT, ND, IN)
- Data sourced from MLS, county records, and public listing sites

---

## 9. Social & Press Footprint

### Press Coverage

| Source | Title | URL |
|--------|-------|-----|
| EIN Presswire | "Bricked AI Launches AI Tool Eliminating Manual Real Estate Comping" | https://www.einpresswire.com/article/882078978/ |
| Complete AI Training | "Bricked AI Underwrites Real Estate Deals in 15 Seconds..." | https://completeaitraining.com/news/bricked-ai-underwrites-real-estate-deals-in-15-seconds-with/ |
| Complete AI Training | "Bricked AI Lets Investors Underwrite Real Estate Deals in 15 Seconds" | https://completeaitraining.com/news/bricked-ai-lets-investors-underwrite-real-estate-deals-in/ |

### Social Media

| Platform | Handle | Notes |
|----------|--------|-------|
| Instagram | @bricked_ai | Active account; posts product demos and field examples |
| TikTok | @wholesaling_demon | Posts about generating comps in <30 seconds with Bricked |
| Discord | Community server | Linked from footer; invite at https://discord.com/invite/zRV8p93Pan |
| Twitter/X | Not found | No verified @bricked_ai or similar handle discovered |
| LinkedIn | Not found | No company page found (Bricks.ai is a different company) |
| Product Hunt | Not found | No launch page discovered |
| YouTube | Not found | No official channel or demo videos discovered |

### Content Marketing

- **Blog**: Not found on the main site
- **Podcast appearances**: None discovered
- **Demo videos**: Embedded on homepage (not accessible via scraping), Instagram reels, TikTok videos
- **Documentation**: https://docs.bricked.ai (Mintlify-powered)

### Social Proof on Site

**Company logos displayed (30+):**
Meridian Capital, Sterling Group, Decimal Ventures, Rain City Properties, Kaizen Acquisitions, Eagle Cash Buyers, Vantage Group, Summit Investments, Apex Estates, Pinnacle Group, Crestview Acquisitions, Keystonegroup, Redwood Cash Buyers, Elevate, Skyline Properties, Horizon Group (and more)

**Note:** These appear to be customer logos. Many are small/mid-size real estate investment firms, not large institutional names.

---

## 10. Founder Background

### Abhiram "Abhi" Bharatham

- **Role:** Co-founder of Bricked.ai
- **Email:** abhi@bricked.ai
- **Location:** Suwanee, Georgia (per LinkedIn) / Company based in San Francisco, CA
- **Demo Booking:** https://cal.com/abhiram-bharatham-bpga78

**Education:**
- MS in Computer Science, Georgia Institute of Technology (2022-2024), GPA 3.72

**Work History (from LinkedIn, partially redacted):**
- Amazon -- Software Development Engineer (intern or full-time, details redacted)
- Mintlify -- Solutions Engineer (relevant: Bricked docs are built on Mintlify)
- Old Mission -- Junior Quantitative Trader (post-graduation)
- NVIDIA, BCG -- Also mentioned in search results as prior experience

**Profile:**
- 2,000+ LinkedIn followers, 500+ connections
- Engages with Y Combinator startup content
- Technical background (CS + quant trading + solutions engineering)
- Young founder (graduated MS 2024, likely mid-20s)

**Co-founder:** The press release says "co-founder" (singular Abhi quoted), implying at least one other co-founder exists, but no name was found publicly.

### Observations

- Technical founder with real engineering chops (Amazon, NVIDIA, Georgia Tech CS)
- Mintlify experience explains the polished documentation
- Quant trading background suggests data/analytics sophistication
- No evidence of real estate industry experience prior to Bricked
- Company appears to be bootstrapped or very early-stage (no Crunchbase profile, no funding announcements found)

---

## 11. Tech Stack

### Confirmed Technologies

| Layer | Technology | Evidence |
|-------|-----------|----------|
| **Frontend** | Next.js (React) | `_next/static/chunks` in page source |
| **Rendering** | Server-side rendering (RSC) | Streaming RSC patterns detected |
| **CDN/Security** | Cloudflare | `/cdn-cgi/challenge-platform` path |
| **API** | REST (OpenAPI 3.1) | Full spec at docs.bricked.ai/api-reference/openapi.json |
| **API server** | `api.bricked.ai` | Separate subdomain from main site |
| **Documentation** | Mintlify | Docs platform, founder worked there |
| **Scheduling** | Cal.com | Demo booking via cal.com |
| **Analytics** | Facebook Pixel | `fbq init '897085756094815'` |
| **Fonts** | Custom (WOFF2) | Served via Next.js static |
| **Schema** | JSON-LD (Organization, SoftwareApplication) | Embedded in page head |
| **Social cards** | OG + Twitter cards | Standard meta tags |

### Inferred Technologies

- **Computer vision**: Likely uses a CNN-based model (potentially fine-tuned on property images) for renovation scoring. Could be custom or built on top of services like Restb.ai, HelloData, or similar property CV APIs.
- **Data pipeline**: Pulls from MLS feeds, county record aggregators, and web scraping of public listings. Likely uses a property data provider (ATTOM, CoreLogic, or similar) as a base layer.
- **AI/ML**: The natural language repair parsing and comp selection suggest LLM integration (possibly OpenAI or similar) combined with traditional ML models for valuation.
- **Infrastructure**: Likely AWS or GCP given the founder's Amazon background.

### No Job Postings Found

No open engineering positions were discovered, suggesting a small team (2-5 people, consistent with early-stage startup).

---

## 12. Competitive Landscape

### Direct Competitors

**ChatARV** (chatarv.ai)
- AI-powered comps, ~60 second analysis
- $89/mo, no API
- Disclosure states only (major limitation vs Bricked)
- ~700 users
- No repair estimates in API form

**REI Kit** (reikit.com)
- AI wholesaling software
- Broader wholesaling workflow (not just comps)
- Unknown API status

**Homesage.ai** (homesage.ai)
- Full property reports with AI
- Broader scope (not just investor-focused)

### Adjacent Platforms (not direct competitors but overlap)

**PropStream** ($99-699/mo)
- Industry standard for property data research
- Acquired BatchLeads (July 2025)
- No public API, no AI comping
- Manual research workflow

**HouseCanary** ($190-1990/yr + per-call API)
- Institutional-grade AVMs and analytics
- API available but expensive ($0.50-6.00/call)
- No repair estimates, no computer vision
- Enterprise-focused

**ATTOM Data** (~$95/mo+)
- Raw property data API
- No AI comping or repair estimates
- Requires significant development to build on top of

**DealCheck** ($0-20/mo)
- Deal analysis calculator
- No AI comps, no API
- Manual input required

### Bricked's Moat

1. **Speed** -- 17 sec average vs 60 sec (ChatARV) or manual (everyone else)
2. **Computer vision** -- Renovation scoring is unique in this price segment
3. **Non-disclosure states** -- ChatARV explicitly does not support these
4. **API access** -- Only AI comping tool with a documented, affordable API
5. **Bundled data** -- Comps + ARV + CMV + repairs + property data in one call

---

## 13. Integration Analysis for Parcel

### What Parcel Would Get from Bricked's API

**Per API call (single address), Parcel receives:**

1. **Valuations**: CMV and ARV -- plug directly into Parcel's deal analysis
2. **Comparable sales**: Full property profiles for each comp with adjusted values
3. **Repair estimates**: Line-item breakdown with localized costs
4. **Property profile**: Physical details, ownership, mortgage, tax, MLS, transactions
5. **Renovation score**: AI-assessed condition grade
6. **Shareable reports**: Pre-built dashboard links for users to share

### Integration Scenarios

**Scenario A: Embedded Comps & ARV in Parcel**
- User enters address in Parcel
- Parcel calls Bricked API -> displays CMV, ARV, top comps, repair estimate
- Enriches Parcel's property analysis with institutional-quality data
- Cost: $129/mo for 300 properties (shared across all Parcel users on a plan)

**Scenario B: Property Data Enrichment**
- Use Bricked to populate property cards with ownership, mortgage, tax, MLS data
- Reduces need for separate data provider subscriptions
- Risk: single-vendor dependency for critical data

**Scenario C: Repair Estimate Widget**
- Expose Bricked's repair estimates as a feature within Parcel's deal calculator
- Users describe repairs in natural language, get localized cost breakdown
- High perceived value for fix-and-flip users

### API Integration Complexity

- **Low friction**: Simple GET requests with API key auth
- **Clean schema**: Well-documented OpenAPI 3.1 spec with typed responses
- **Pagination**: Built-in for list endpoint
- **Shareable links**: Can embed Bricked dashboards directly or pull data into Parcel's UI
- **Natural language repairs**: The `repairs` parameter accepts freeform text, which is developer-friendly

### Cost Modeling for Parcel

Assuming Parcel serves the API calls:

| Parcel Users | Est. Comps/Mo | Bricked Plan | Monthly Cost | Per-User Cost |
|--------------|---------------|--------------|--------------|---------------|
| 50 | 200 | Growth ($129) | $129 | $2.58 |
| 100 | 500 | Scale ($199) | $199 | $1.99 |
| 200 | 1,000 | Enterprise | Custom | TBD |
| 500 | 3,000 | Enterprise | Custom | TBD |

At Parcel's Pro pricing ($69/mo or $55/mo annual), spending $1.99-2.58 per user on Bricked data leaves healthy margin.

---

## 14. Build vs Buy Analysis

### Comps + ARV (AI-powered)

**Build in-house:**
- Data acquisition: Need MLS feed access ($$$), county record API (ATTOM ~$95/mo+), public listing scraping
- ML model: Train comp selection model, build AVM, handle non-disclosure states
- Timeline: 12-18 months minimum for quality parity
- Team: 2-3 ML engineers + 1 data engineer
- Annual cost: $300K-800K+ (salaries + data licenses)

**Buy from Bricked:**
- Timeline: Days to integrate
- Cost: $129-199/mo
- Quality: Proven system with 12,000+ deals analyzed

**Verdict: BUY.** The cost difference is orders of magnitude. Building AI comps is a full company's worth of work (which is exactly what Bricked is).

### Repair Estimates

**Build in-house:**
- Need localized labor + material cost database (national scope)
- Build/license computer vision for condition assessment
- Natural language processing for repair descriptions
- Timeline: 6-12 months
- Cost: Significant data licensing + ML development

**Buy from Bricked:**
- Included in the same API call at no extra cost
- Localized, line-item, AI-generated

**Verdict: BUY.** Building a localized repair estimation system from scratch is impractical for a platform at Parcel's stage.

### Property Data (ownership, mortgage, tax)

**Build in-house (via data providers):**
- ATTOM API: ~$95/mo starting, per-call charges
- CoreLogic: Enterprise pricing, complex integration
- Batch Data: Various pricing
- Each gives raw data, no AI analysis

**Buy from Bricked:**
- Property data comes bundled with every comp request
- Very rich schema (ownership, mortgage, tax, MLS, transactions)
- But: limited to properties you comp (not bulk data access)

**Verdict: HYBRID.** Use Bricked for properties being actively analyzed. Consider a separate data provider if Parcel needs bulk property data access (lead lists, market analytics).

### Computer Vision / Renovation Scoring

**Build in-house:**
- Fine-tune a CNN on property photos (need labeled training data)
- Integration with property image sources
- Timeline: 3-6 months
- Requires ML expertise

**Buy from Bricked:**
- Included automatically with image analysis
- 0-1 score with confidence rating

**Verdict: BUY.** This is a nice-to-have feature that Bricked delivers for free with every analysis.

---

## 15. Risks & Open Questions

### Risks

1. **Early-stage company** -- Launched January 2026 (3 months ago). No funding announcements found. Small team. Risk of shutdown or pivot.

2. **No published accuracy benchmarks** -- Claims "appraiser-style" accuracy but no median absolute percentage error or independent validation.

3. **Rate limits unknown** -- Not documented. Need to clarify before integration to understand throughput constraints.

4. **Comp allocation model** -- Each API call consumes a "comp" from the monthly allocation. If Parcel users are heavy, costs could scale quickly. Need to understand how Bricked counts: is it 1 comp per address, or 1 per comparable returned?

5. **Data freshness** -- MLS data freshness not specified. Could be daily, hourly, or real-time. Important for accuracy.

6. **Non-standard API design** -- Using GET for create operations is unusual and may cause issues with URL length limits for long repair descriptions or many image URLs.

7. **Single point of failure** -- If Bricked goes down, any feature built on their API goes down. Need fallback strategy.

8. **Vendor lock-in** -- The response schema is proprietary. Switching to another provider would require significant refactoring.

### Open Questions for Abhi

1. **Rate limits** -- What are the API rate limits? Requests per minute/hour?
2. **Comp counting** -- Does 1 API call = 1 comp from the allocation, regardless of how many comps are returned?
3. **Data freshness** -- How often is MLS/county data updated?
4. **Bulk pricing** -- What does Enterprise pricing look like for 1,000-5,000+ comps/month?
5. **SLA/uptime** -- Any uptime guarantees? Status page?
6. **Webhooks** -- Is there a webhook/callback option for async processing, or is the response always synchronous?
7. **Accuracy metrics** -- Any internal accuracy benchmarks vs manual appraiser comps?
8. **Data retention** -- How long are analyzed properties stored? Can they be re-fetched without consuming a comp?
9. **White-label** -- Any option for white-label reports with Parcel branding?
10. **Roadmap** -- What features are coming next? (Skip tracing, lead lists, batch analysis?)
11. **Reseller/partner pricing** -- Is there a partner tier for platforms integrating Bricked?
12. **Co-founder** -- Who is the other co-founder and what is their background?

---

## 16. Sources

### Primary Sources
- [Bricked.ai Homepage](https://bricked.ai)
- [Bricked API Documentation](https://docs.bricked.ai)
- [Bricked OpenAPI Spec](https://docs.bricked.ai/api-reference/openapi.json)
- [Bricked API Introduction](https://docs.bricked.ai/api-reference/introduction)
- [Create Property Docs](https://docs.bricked.ai/api-reference/property/create)
- [Get Property Docs](https://docs.bricked.ai/api-reference/property/get)
- [List Properties Docs](https://docs.bricked.ai/api-reference/property/list)

### Press & Articles
- [EIN Presswire: Bricked AI Launches AI Tool Eliminating Manual Real Estate Comping](https://www.einpresswire.com/article/882078978/bricked-ai-launches-ai-tool-eliminating-manual-real-estate-comping)
- [Complete AI Training: Bricked AI Underwrites Real Estate Deals in 15 Seconds](https://completeaitraining.com/news/bricked-ai-underwrites-real-estate-deals-in-15-seconds-with/)
- [Complete AI Training: Bricked AI Lets Investors Underwrite Real Estate Deals in 15 Seconds](https://completeaitraining.com/news/bricked-ai-lets-investors-underwrite-real-estate-deals-in/)

### Competitive Intelligence
- [HouseCanary Pricing](https://www.housecanary.com/pricing)
- [PropStream Pricing](https://www.propstream.com/pricing)
- [ChatARV](https://www.chatarv.ai/)
- [DealCheck Pricing](https://dealcheck.io/pricing/)
- [HouseCanary: 10 Best Real Estate APIs in 2026](https://www.housecanary.com/blog/real-estate-api)
- [BatchData: Top 5 Real Estate APIs for Pricing Data](https://batchdata.io/blog/real-estate-apis-pricing-data)
- [The Playbook: Meet the ChatGPT Spinoff Reinventing How Investors Size Up Deals](https://www.theplaybookmb.com/stories/2026/01/28/chatarv-ai-investor-underwriting)

### Founder
- [Abhiram Bharatham LinkedIn](https://www.linkedin.com/in/abhiram-bharatham-8059a5179/)
- [Demo Booking (Cal.com)](https://cal.com/abhiram-bharatham-bpga78)

### Social
- [Instagram @bricked_ai](https://www.instagram.com/bricked_ai/)
- [TikTok @wholesaling_demon - Bricked AI Demo](https://www.tiktok.com/@wholesaling_demon/video/7582473600700108062)
- [Instagram Reel about Bricked.ai](https://www.instagram.com/reel/DQHh_GJCa10/)
- [Bricked Discord](https://discord.com/invite/zRV8p93Pan)

### Build vs Buy Context
- [Build.inc: The Build vs. Buy Decision for AI in Real Estate](https://build.inc/insights/build-vs-buy-ai-real-estate-development)
- [Mashvisor: Real Estate Comps API](https://www.mashvisor.com/blog/real-estate-comps-api/)
