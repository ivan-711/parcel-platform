# Skip Tracing & Contact Enrichment API Research

**Prepared for:** Parcel (parceldesk.io) — Real Estate Investor CRM  
**Date:** 2026-04-02  
**Target Users:** Wholesale, BRRRR, buy-and-hold, flip, and creative finance investors

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Provider Deep Dives](#provider-deep-dives)
   - [BatchData (formerly BatchSkipTracing)](#1-batchdata-formerly-batchskiptracing)
   - [TLOxp / IDI (TransUnion)](#2-tloxp--idi-transunion)
   - [Spokeo](#3-spokeo)
   - [REISkip](#4-reiskip)
   - [SkipGenie](#5-skipgenie)
   - [BeenVerified](#6-beenverified)
   - [PropStream (built-in skip tracing)](#7-propstream-built-in-skip-tracing)
   - [REsimpli (integrated skip tracing)](#8-resimpli-integrated-skip-tracing)
   - [Accurate Append](#9-accurate-append)
   - [LexisNexis Accurint](#10-lexisnexis-accurint)
   - [Melissa Data](#11-melissa-data)
   - [Tracerfy (bonus)](#12-tracerfy-bonus---strong-api-contender)
   - [Tracers (bonus)](#13-tracers-bonus---enterprise-alternative)
3. [Hit Rate Benchmarks](#hit-rate-benchmarks)
4. [Compliance Deep Dive](#compliance-deep-dive)
5. [Competitor Integration Map](#competitor-integration-map)
6. [iOS and Mobile Considerations](#ios-and-mobile-considerations)
7. [Recommendation for Parcel](#recommendation-for-parcel)
8. [Cost Model](#cost-model)
9. [Data Storage and Refresh Strategy](#data-storage-and-refresh-strategy)

---

## Executive Summary

Skip tracing for RE investors is a mature market with providers ranging from $0.02/record (Tracerfy) to $2.00+/record (TLOxp/LexisNexis). The key tradeoffs are:

- **Price vs. accuracy**: Budget providers ($0.02-0.05) deliver 70-80% match rates; mid-tier ($0.10-0.15) hit 85-90%; enterprise ($0.50+) claim 90%+ with credit-bureau-grade data.
- **API readiness**: BatchData, Tracerfy, Spokeo, and Accurate Append offer production-ready REST APIs suitable for CRM integration. Most RE-focused providers (PropStream, REsimpli, SkipGenie) are walled-garden platforms without embeddable APIs.
- **Compliance**: RE investor marketing outreach (cold calling, SMS, direct mail) generally uses non-FCRA skip tracing data derived from public records. FCRA obligations are triggered only when credit decisions are involved (tenant screening, lending). TCPA/DNC compliance is mandatory for all outbound calls.

**Top recommendation for Parcel:** Start with **BatchData** as the primary provider (best API, RE-focused, scalable pricing) and **Melissa Data** for address verification/enrichment. Consider **Tracerfy** as a cost-optimized secondary provider for high-volume users.

---

## Provider Deep Dives

### 1. BatchData (formerly BatchSkipTracing)

**Website:** batchdata.io (rebranded from batchskiptracing.com)

**Data Returned:**
- Multiple phone numbers (flagged as mobile/landline)
- Do-not-call status and consent_status per number
- Deliverable email addresses
- Owner mailing address (current)
- Phone type (mobile, landline, VOIP)
- Confidence scores per data point
- Coverage: 221M+ homeowners, 350M+ phone numbers, 260M+ email addresses

**Cost per Record:**

| Tier | Monthly Records | Monthly Cost | Per-Record Cost |
|------|----------------|-------------|-----------------|
| Lite | 20,000 | $500/mo | $0.025 |
| Growth | 100,000 | $1,500/mo | $0.015 |
| Professional | 300,000 | $2,500/mo | ~$0.008 |
| Scale | 500,000 | $5,000/mo | $0.010 |
| Enterprise | 750,000+ | Custom | ~$0.006 |
| Pay-per-result (no subscription) | Any | N/A | $0.03-$0.12 |

**API Availability:**
- REST API with JSON responses
- Property Skip Trace endpoint: POST up to 100 properties per request
- Endpoints: `/owners/by-property`, `/owners/search`, `/skip-trace`
- Real-time single lookup and bulk CSV upload both supported
- Webhook support not explicitly documented but batch async processing available
- MCP server available (GitHub: zellerhaus/batchdata-mcp-real-estate)
- n8n workflow template available for CRM integration

**Hit Rate:** Industry reputation for high accuracy. Pay-per-result model means you only pay for successful matches. Estimated 80-88% match rate based on community reports.

**Data Freshness:** Self-enriching engine refreshes data daily, cross-checking 12+ sources.

**Data Retention:** Results can be stored in your CRM. No explicit re-fetch requirement documented, but data ages quickly (recommended re-skip every 90 days).

**Bulk vs. Real-time:** Both supported. Bulk via CSV upload or batch API. Real-time via single-property API call.

**FCRA:** Non-FCRA data source. Uses public records and proprietary aggregation (not credit bureau data). Safe for marketing outreach.

**Who Uses It:** BatchLeads (PropStream acquired BatchLeads July 2025), GoHighLevel integrations, n8n automations, numerous RE investor CRMs.

**Verdict for Parcel:** STRONG CANDIDATE. Best combination of API maturity, RE focus, scalable pricing, and data quality. This is the top recommendation for primary integration.

---

### 2. TLOxp / IDI (TransUnion)

**Website:** tlo.com / transunion.com

**Data Returned:**
- 360-degree subject profiles: addresses, phone numbers, employment history
- Criminal records, bankruptcies, liens, judgments
- Assets and property ownership
- Relatives and associates
- 100+ billion public and proprietary data points
- Credit-bureau-grade data (TransUnion)

**Cost per Record:**

| Volume | Est. Cost/Search |
|--------|-----------------|
| Low volume | $1.00-$2.00 |
| Medium volume | $0.50-$1.00 |
| Deep Skip feature | $0.50 (introductory) |
| Enterprise | Custom quote required |

**API Availability:**
- Direct API connections available
- Batch services for bulk data appends
- Requires DPPA code and GLBA code in API requests (determines data access level)
- Stringent business credentialing process required (may include site inspection)

**Hit Rate:** 90%+ claimed. Enterprise-grade data quality with credit bureau backing.

**Data Freshness:** Real-time access to TransUnion's data ecosystem. Among the freshest data available.

**FCRA Compliance:**
- FCRA-regulated data source
- Requires demonstrated permissible purpose under FCRA
- DPPA and GLBA permissible purpose codes required
- Pre-adverse and adverse action notice obligations apply
- NOT suitable for cold marketing outreach without permissible purpose

**Data Retention:** Governed by strict FCRA retention and disposal rules. Must follow Disposal Rule requirements.

**Bulk vs. Real-time:** Both available. Batch services and real-time API.

**Who Uses It:** Debt collectors, legal professionals, government agencies, licensed investigators. Generally NOT used by RE investor CRMs for marketing due to FCRA requirements.

**Verdict for Parcel:** NOT RECOMMENDED for initial integration. FCRA compliance overhead is excessive for RE marketing outreach. Overkill for Parcel's use case. Consider only if Parcel expands into tenant screening or lending (where FCRA permissible purpose exists).

---

### 3. Spokeo

**Website:** spokeo.com/business/api

**Data Returned:**
- Full name, aliases, demographics (gender, age, marital status)
- Current and historical addresses (with coordinates)
- Phone numbers and email addresses
- Social media profiles (platform name, URLs, profile photos)
- Relatives and associates
- Work history / employment
- Property data: ownership details, structure data, valuation, nearby schools
- 300M+ unique person profiles
- Hundreds of unique enrichment attributes

**API Endpoints:**
- Name Search
- Phone Search (reverse lookup)
- Email Search
- Address Search (returns property + resident profiles)
- Username Search
- Person ID Search
- All endpoints return JSON

**Cost per Record:**

| Tier | Est. Cost |
|------|----------|
| Single consumer report | ~$0.95 |
| Enterprise API (volume) | Custom quote required |
| Business plans | $40-$120/mo depending on search volume |
| Free test API key available | Yes |
| No charge for failed lookups | Confirmed |

**Hit Rate:** Not publicly disclosed. Data quality is consumer-grade (aggregated from 99+ public web sources).

**Data Freshness:** Aggregated from public web sources. Not real-time; may lag days to weeks.

**FCRA:** Non-FCRA data. Explicitly NOT a consumer reporting agency. Safe for marketing outreach.

**Who Uses It:** Collections agencies, fraud investigators, small businesses for contact enrichment.

**Verdict for Parcel:** POSSIBLE SECONDARY PROVIDER. Strong social media enrichment (unique differentiator). API is production-ready. Pricing may be high for bulk skip tracing but valuable for enriching individual leads with social profiles. Consider for a "deep lookup" feature on individual contacts.

---

### 4. REISkip

**Website:** reiskip.com

**Data Returned:**
- Phone numbers and email addresses
- Social media profiles
- Property and financial insights
- Corporate/LLC resolution (better than budget providers for entity-owned properties)
- Skip Trace Triangulation Technology (proprietary multi-source matching)

**Cost per Record:**

| Volume | Cost |
|--------|------|
| All volumes | $0.15/search (flat fee) |
| Minimum bulk order | 50 records |
| Minimum volume order | 1,001 records |
| Duplicates | Excluded from cost |

**API Availability:**
- API available for integration
- Zapier integration included
- Internal lead tracking / CRM features included
- Flat-fee means no volume discount

**Hit Rate:** 85-90% match rate (provider claim, consistently reported by users).

**Data Freshness:** Not explicitly documented. Uses proprietary Skip Trace Triangulation Technology across multiple data sources.

**FCRA:** Non-FCRA. Public records and proprietary aggregation. Safe for marketing.

**Bulk vs. Real-time:** Bulk upload supported. API for real-time single lookups.

**Who Uses It:** Independent RE investors, wholesalers. Popular in BiggerPockets community.

**Verdict for Parcel:** POSSIBLE but limited. Good hit rate and RE focus, but flat $0.15/record pricing does not scale well for high-volume users. No volume discounts. API exists but documentation quality unclear.

---

### 5. SkipGenie

**Website:** skipgenie.com

**Data Returned:**
- Up to 10 phone numbers per lead (ranked by probability)
- Cell vs. landline identification
- Email addresses
- Relative/associate names (for secondary "relative linking" searches)
- Credit-bureau-grade data (higher quality than public records alone)

**Cost per Record:**

| Type | Cost |
|------|------|
| Individual search | $0.17/record |
| Bulk list processing | Starting at $0.13/record |
| Monthly included searches | 100/account |
| Smart Credits (DNC/Caller ID scrubs) | $0.02/phone number |
| Starter plan | $59/mo |
| Team plan | Up to $299/mo |

**API Availability:**
- NO CRM or API integration. Standalone platform only.
- No disposition tracking integration.
- Manual CSV export/import workflow required.

**Hit Rate:** Provider avoids specific percentage claims, stating "best overall probability of skip tracing success."

**Data Freshness:** Not documented. DNC scrubbing and Caller ID verification available as add-ons.

**FCRA:** Non-FCRA. Public records and credit-bureau-grade data aggregation.

**Bulk vs. Real-time:** Bulk list upload available. Real-time single lookup through web UI.

**Who Uses It:** RE investors who prioritize phone number quantity (up to 10 per lead) and relative linking for hard-to-reach owners.

**Verdict for Parcel:** NOT RECOMMENDED. No API means no integration path. Manual-only workflow. Parcel cannot embed SkipGenie into its CRM programmatically.

---

### 6. BeenVerified

**Website:** beenverified.com

**Data Returned:**
- Contact information (phone, email, address)
- Background report data
- Associates and relatives
- Property records
- Social media profiles

**Cost per Record:**

| Plan | Cost |
|------|------|
| Monthly plan | ~$26.89/mo (100 reports) |
| Quarterly plan | ~$17.48/mo (billed quarterly, 100 reports) |
| 7-day trial | $1 (100 reports) |
| Per-report cost | ~$0.17-$0.27 depending on plan |

**API Availability:**
- Legacy API exists (OAuth-based, Ruby gem on GitHub)
- NOT designed for bulk data operations
- Cannot build lead lists or do scale operations
- Consumer-focused platform, not B2B/developer-focused
- 100-report monthly limit across all plans

**Hit Rate:** Not disclosed. Consumer-grade data quality.

**FCRA:** Non-FCRA. Not a consumer reporting agency.

**Bulk vs. Real-time:** Neither is practical at scale. 100-report limit per month. No batch processing.

**Who Uses It:** Individual consumers for background checks, not businesses.

**Verdict for Parcel:** NOT RECOMMENDED. Not built for B2B API integration. Volume limits are prohibitive. Consumer-facing product that cannot support CRM-level throughput.

---

### 7. PropStream (Built-in Skip Tracing)

**Website:** propstream.com

**Data Returned:**
- Up to 4 phone numbers per match (ranked by relevancy)
- Up to 4 email addresses per match
- Automatic DNC flagging
- Litigator scrubbing (identifies serial TCPA litigators)
- Phone type identification
- Multi-sourced data from third-party vendors
- Corporate skip tracing (LLC/trust resolution)

**Cost per Record:**

| Plan | Skip Trace Cost | Monthly Subscription |
|------|----------------|---------------------|
| Essentials (monthly) | $0.12/result | $99/mo |
| Essentials (annual) | Free (with Lead Automator) | $81/mo |
| Pro | Free (included) | $199/mo |
| Elite | Free (included) | $699/mo |
| Standalone (no subscription) | $0.12/result | N/A |

No charge for empty results. Pay only for successful matches.

**API Availability:**
- NO public developer API for third-party integration
- Native API sync with BatchDialer only
- Push leads from PropStream to BatchDialer campaigns
- Walled-garden platform; cannot embed PropStream skip tracing into another CRM
- PropStream acquired BatchLeads in July 2025

**Hit Rate:** Mixed community reviews. Multi-sourced data since 2025 upgrade improved accuracy. Estimated 75-85%.

**Data Freshness:** 160M+ public records. Third-party vendor data refresh cadence not disclosed.

**FCRA:** Non-FCRA. Public records aggregation.

**Who Uses It:** 200,000+ RE investors. Largest market share among RE investor platforms.

**Verdict for Parcel:** NOT INTEGRABLE. PropStream is a competitor to Parcel, not a data provider. No API for third-party CRM embedding. Their data comes from unnamed third-party vendors. Useful for competitive intelligence only.

---

### 8. REsimpli (Integrated Skip Tracing)

**Website:** resimpli.com

**Data Returned:**
- Up to 3 verified email addresses
- Up to 3 verified phone numbers
- Processed through multiple data sources
- LLC and trust resolution
- USPS integration for address freshness

**Cost per Record:**

| Plan | Included Credits | Subscription |
|------|-----------------|-------------|
| Basic | 10,000/mo | (plan price) |
| Pro | 20,000/mo | (plan price) |
| Enterprise | 50,000/mo | (plan price) |
| Additional credits | ~$0.15/trace estimated | N/A |

At $0.15/trace market rate, the included credits represent $1,500-$7,500/mo in value.

**API Availability:**
- NO public API for third-party integration
- All-in-one platform; skip tracing is internal feature
- No webhook or REST endpoint exposure
- Zapier integration available for some workflows

**Hit Rate:** Claims 95% accuracy. Higher than industry average if accurate.

**FCRA:** Non-FCRA. Public records and proprietary sources.

**Who Uses It:** Wholesalers and RE investors who want an all-in-one CRM.

**Verdict for Parcel:** NOT INTEGRABLE. Direct competitor to Parcel. Walled-garden CRM with no embeddable skip tracing API. Useful for competitive intelligence and pricing benchmarks only.

---

### 9. Accurate Append

**Website:** accurateappend.com

**Data Returned:**
- Current addresses
- Phone numbers (with type identification)
- Email addresses (from 900M+ email database)
- Triple-scrub validation process
- Focused on precision over volume (fewer matches, higher quality)

**Cost per Record:**

| Method | Est. Cost |
|--------|----------|
| API (real-time) | Custom quote required |
| SFTP batch processing | Custom quote required |
| Self-service portal | Custom quote required |
| Industry benchmark comparison | Positioned as premium; likely $0.10-$0.20/record |

**API Availability:**
- REST API for real-time appending
- SFTP batch processing for bulk
- Self-service portal for manual uploads
- Seamless integration into existing tech stacks
- Quick turnaround for batch processing

**Hit Rate:** Claims 20%+ boost in contact success over competitors. Estimated 85-90% match rate based on positioning.

**Data Freshness:** Real-time phone validation. Triple-scrub process for email deliverability.

**FCRA:** Non-FCRA. Data append service using public and proprietary records.

**Bulk vs. Real-time:** Both supported via API and SFTP.

**Verdict for Parcel:** POSSIBLE. API is production-ready and supports real-time integration. However, opaque pricing (custom quotes only) makes cost modeling difficult. Worth contacting for a quote if BatchData does not meet accuracy requirements.

---

### 10. LexisNexis Accurint

**Website:** lexisnexis.com / accurint.com

**Data Returned:**
- 84+ billion public records
- Addresses, phone numbers, email
- Employment / workplace (Workplace Locator)
- Criminal records, bankruptcies, liens, judgments
- Assets and property ownership
- Relatives and associates
- Business reports

**Cost per Record:**

| Product | Est. Cost |
|---------|----------|
| Deep Skip search | $0.50/search (introductory) |
| Standard searches | Custom pricing |
| Batch services | Volume-discounted, custom quote |
| Government pricing | Published per-search schedule |
| Law firm pricing | Published per-search schedule |

**API Availability:**
- Batch Services for bulk processing (thousands of records at once)
- API integration available
- Account monitoring for ongoing surveillance of leads
- Requires business credentialing and compliance review

**Hit Rate:** 90%+ claimed. Enterprise-grade, backed by comprehensive public records database.

**FCRA:** FCRA-regulated for certain data types. Requires demonstrated permissible purpose. Compliance review and credentialing process mandatory.

**Data Freshness:** Real-time access to public records. Among the most current data available.

**Who Uses It:** Law firms, government agencies, debt collectors, insurance companies, licensed investigators. Some RE platforms (e.g., used by Redfin for property data).

**Verdict for Parcel:** NOT RECOMMENDED for initial launch. Same issues as TLOxp: FCRA overhead, expensive credentialing, pricing 5-10x higher than RE-focused providers. Overkill for marketing outreach. Consider only for premium "deep investigation" tier if demand exists.

---

### 11. Melissa Data

**Website:** melissa.com

**Data Returned (Personator API):**
- Verified/corrected U.S. addresses (CASS/DPV certified)
- ZIP+4 standardization
- Phone number append
- Email append and deliverability scoring
- Full name (parsed first, middle, last)
- Demographics: DOB, deceased status, gender, presence of children, marital status, household income range, occupation, renter/owner status, length of residence
- Geographic data (coordinates, time zone)
- NCOA (National Change of Address): 18-month and 48-month move updates

**Cost per Record:**

| Tier | Credits | Cost | Per-Verification |
|------|---------|------|-----------------|
| Tier 1 | 10,000 | $30 | $0.003 |
| Tier 2 | 30,000 | $84 | $0.0028 |
| Tier 3 | 100,000 | $285 | $0.00285 |
| Tier 4 | 500,000 | $1,395 | $0.0028 |
| Free trial | 1,000 lookups/mo | $0 | $0 |

Note: Each API feature/component consumes a specific number of credits. Simple address verification is 1 credit; full Personator enrichment may consume 3-5 credits per record.

**API Availability:**
- REST API with JSON responses
- Personator API (contact verification + enrichment)
- Global Address Verification API
- Available on RapidAPI marketplace
- Postman collections available
- Sample code: JavaScript, .NET, Python3
- 240+ countries supported for address verification
- Real-time and batch processing

**Hit Rate:** N/A (address verification service, not skip tracing). Address verification accuracy is 95%+.

**FCRA:** Not FCRA-regulated. Address verification and data enrichment service.

**Data Freshness:** CASS-certified (USPS data), NCOA 18/48-month updates. Government-sourced data updated continuously.

**Who Uses It:** Enterprise data quality operations, e-commerce, financial services, marketing operations. Used alongside skip tracing for address standardization.

**Verdict for Parcel:** RECOMMENDED as COMPLEMENTARY SERVICE. Not a skip tracer, but essential for: (1) validating addresses before skip tracing (reduces wasted lookups), (2) NCOA move updates to catch relocated owners, (3) demographic enrichment for lead scoring. Extremely affordable ($0.003/record). Should be integrated alongside primary skip trace provider.

---

### 12. Tracerfy (Bonus - Strong API Contender)

**Website:** tracerfy.com

**Data Returned:**
- Up to 8 phone numbers (cell, landline, VOIP)
- Up to 5 email addresses
- Mailing addresses
- Property ownership details
- Results delivered in CSV format

**Cost per Record:**

| Volume | Cost |
|--------|------|
| All volumes | $0.02/record |
| No monthly minimums | N/A |
| No subscriptions | Credit-based |

**API Availability:**
- REST API with Bearer token authentication
- 7 endpoints: POST /trace/, GET /queues/, GET /queue/:id, GET /analytics/, POST /dnc/scrub/, POST /dnc/scrub-from-queue/, GET /dnc/queue/:id
- Webhook support for async job completion notifications
- CRM integrations: Salesforce, HubSpot
- Zapier/Make.com compatible
- White-label platform capability
- 99.8% uptime guarantee

**Hit Rate:** Claims 70-95% accuracy and 97% data coverage across US properties.

**Data Freshness:** Not specifically documented.

**FCRA:** Non-FCRA. Public records aggregation.

**Bulk vs. Real-time:** Batch processing via CSV upload with async notifications. Not clear if real-time single-record lookup is available.

**Built-in DNC Scrubbing:** Yes, dedicated endpoints for DNC scrubbing.

**Verdict for Parcel:** STRONG CANDIDATE for cost-sensitive integration. At $0.02/record with no minimums, this is the cheapest option with a real API. Good for high-volume users. Consider as secondary/budget tier alongside BatchData.

---

### 13. Tracers (Bonus - Enterprise Alternative)

**Website:** tracers.com

**Data Returned:**
- Addresses, emails, phone numbers, address history
- Relatives and associates
- 120+ billion records from 6,000+ data sources
- 98% adult US population coverage
- Real-time credit bureau data access
- First $100 in searches free

**API Availability:**
- Cloud-based platform
- Batch processing (thousands at once)
- API for direct software integration
- Dedicated endpoints: Phone Append, Identity Verification, Collection Agency, Financial Institutions, Healthcare
- Business credentialing required

**Cost:** Custom enterprise pricing. Not publicly disclosed.

**Hit Rate:** Not publicly disclosed. Enterprise-grade data quality with credit bureau access.

**FCRA:** Likely FCRA-regulated for some data products (credit bureau data). Credentialing process mirrors TLOxp.

**Verdict for Parcel:** NOT RECOMMENDED for initial launch due to credentialing overhead and opaque pricing. Worth revisiting for enterprise tier if Parcel grows to institutional-scale customers.

---

## Hit Rate Benchmarks

Industry-wide benchmarks based on research across multiple providers and community reports:

| Metric | Budget Providers ($0.02-0.05) | Mid-Tier ($0.10-0.15) | Enterprise ($0.50+) |
|--------|-------------------------------|----------------------|---------------------|
| Phone number (any) | 70-80% | 80-88% | 88-95% |
| Mobile phone (verified active) | 45-55% | 55-65% | 65-80% |
| Email address | 55-65% | 65-75% | 75-85% |
| Both phone + email | 40-50% | 50-60% | 60-75% |

**Critical distinction:** "Match rate" (provider returns a result) is different from "contactable rate" (the number actually works and reaches the right person). Industry-wide:
- Match rate is typically 15-25% higher than contactable rate
- A 60-80% contactable match rate is considered excellent
- Best practice: Run a 200-500 record A/B test across two providers before committing

**Provider-Claimed Hit Rates:**

| Provider | Claimed Match Rate |
|----------|-------------------|
| BatchData | 80-88% (estimated from community) |
| REISkip | 85-90% |
| Tracerfy | 70-95% (wide range) |
| SkipGenie | Not disclosed |
| PropStream | 75-85% (post-2025 upgrade) |
| REsimpli | 95% (provider claim) |
| TLOxp | 90%+ |
| LexisNexis | 90%+ |

---

## Compliance Deep Dive

### What is FCRA and When Does It Apply?

The **Fair Credit Reporting Act (FCRA)** regulates "consumer reports" -- information collected by consumer reporting agencies (CRAs) that relates to a consumer's creditworthiness, credit standing, credit capacity, character, general reputation, personal characteristics, or mode of living. It applies when:

1. The data comes from a Consumer Reporting Agency (e.g., TransUnion, Equifax, Experian)
2. The data is used for a "permissible purpose" (credit decisions, employment screening, insurance underwriting, tenant screening)
3. The data includes credit history, payment behavior, or financial risk indicators

### FCRA vs. Non-FCRA Skip Tracing

| Aspect | FCRA Skip Tracing | Non-FCRA Skip Tracing |
|--------|-------------------|----------------------|
| Data sources | Credit bureaus, CRAs | Public records, proprietary aggregation, web scraping |
| Permissible purpose required | YES | NO |
| Pre-adverse action notice | Required | Not required |
| Adverse action notice | Required | Not required |
| Consumer dispute rights | Must be supported | Not applicable |
| Data retention rules | Strict (Disposal Rule) | General data privacy laws only |
| Cost | 5-20x higher | Standard market rate |
| Providers | TLOxp, LexisNexis, Tracers | BatchData, REISkip, Tracerfy, SkipGenie, Spokeo |
| Use for marketing outreach | PROHIBITED without permissible purpose | PERMITTED (with TCPA/DNC compliance) |

### What RE Investor Use Cases Trigger FCRA Obligations?

| Use Case | FCRA Required? | Notes |
|----------|---------------|-------|
| Cold calling property owners to buy their house | NO | Marketing outreach, non-FCRA |
| Sending direct mail to property owners | NO | Marketing, non-FCRA |
| SMS outreach to skip-traced numbers | NO (but TCPA applies) | Marketing, non-FCRA |
| Screening a tenant's credit for rental | YES | Credit decision, FCRA applies |
| Evaluating a borrower for private lending | YES | Credit/lending decision |
| Verifying a seller's identity in a transaction | NO | Due diligence, not credit decision |
| Running background check on a contractor | YES (if using CRA) | Employment-related screening |

**Bottom line for Parcel:** RE investor marketing outreach (wholesale, buy offers, direct mail) does NOT require FCRA-compliant data. Use non-FCRA providers (BatchData, Tracerfy, REISkip). If Parcel adds tenant screening or lending features, FCRA providers would be needed.

### State-Specific Regulations

**California:**
- CCPA gives consumers rights to know, delete, and opt-out of data sales
- Skip tracing by non-PIs may require a Private Investigator license for certain activities
- California Debt Collection Licensing Act applies to debt-related skip tracing

**Texas:**
- Texas Data Privacy and Security Act (TDPSA) effective July 2024
- PI licensing requirements for professional skip tracing services
- Applies to large companies handling Texas residents' data

**Florida:**
- PI licensing required under Chapter 493
- Florida Digital Bill of Rights (FDBR) has narrower scope
- Strict rules on consumer information disclosure

**All states must comply with federal:** FCRA, FDCPA, GLBA, TCPA, CAN-SPAM.

### Do-Not-Call (DNC) Integration Requirements

Mandatory for any outbound calling on skip-traced numbers:

1. **National DNC Registry:** Scrub all call lists against the FTC's National Do Not Call Registry before calling. Updated regularly; lists must be scrubbed at least every 31 days.
2. **State DNC Lists:** Many states maintain separate DNC lists (e.g., California, Texas, Pennsylvania). Must scrub against state lists independently.
3. **Internal DNC List:** Must maintain and honor an internal DNC list of any consumer who requests not to be called.
4. **Existing Business Relationship (EBR):** Exemption for consumers you have an existing business relationship with, but this exemption has limits (18 months for purchases, 3 months for inquiries).
5. **Calling hours:** 8 AM to 9 PM local time for the recipient.

**Parcel implementation:** Must integrate DNC scrubbing into the skip tracing workflow. Some providers (PropStream, Tracerfy, SkipGenie) include DNC flagging. BatchData includes do_not_call status in API responses. Parcel should scrub against National DNC Registry independently as an additional safety layer.

### TCPA Implications

The Telephone Consumer Protection Act imposes strict rules on calling skip-traced numbers:

1. **One-to-One Consent Rule (effective Jan 27, 2025, delayed to Jan 26, 2026):** Prior express written consent must be obtained separately for EACH company. Closes the "lead generator loophole."
2. **Skip-traced numbers are NOT consented:** Collecting a phone number via skip tracing does NOT constitute express consent. Manual dialing is required for cold outreach.
3. **Autodialer restrictions:** Cannot use an autodialer or prerecorded voice to call skip-traced mobile numbers without prior express written consent.
4. **Withdrawal of consent (effective April 11, 2025):** Consumers can withdraw consent at any time. Businesses must honor opt-out within 10 business days.
5. **Penalties:** $500-$1,500 per violation. NOT per consumer -- per call. Class action exposure is significant.

**Parcel implementation:**
- Default to manual dialing for skip-traced leads
- Track consent status per phone number in CRM
- Implement opt-out/DNC request handling with <10 day compliance
- Display DNC and litigator flags prominently in UI
- Consider serial litigator scrubbing (PropStream includes this; Parcel should too)

---

## Competitor Integration Map

Which RE investor CRMs use which skip tracing providers:

| Platform | Skip Trace Provider | Integration Type | API Available? |
|----------|-------------------|-----------------|---------------|
| PropStream | Unnamed third-party vendors (multi-source) | Built-in | No (walled garden) |
| REsimpli | Internal proprietary (multi-source) | Built-in | No (walled garden) |
| BatchLeads | BatchData (parent company) | Built-in | BatchData API available |
| DealMachine | Internal (proprietary) | Built-in | No |
| InvestorFuse | None built-in; uses integrations | Third-party | Via Zapier |
| Carrot | None built-in | Third-party | Via integrations |
| REIPro | Internal skip tracing | Built-in | No |
| Mojo | Mojo Skip Tracer (internal) | Built-in | No |
| GoHighLevel | BatchData via API | Third-party integration | Yes |
| Podio | Various via Zapier | Third-party | Via Zapier |

**Key insight:** Most RE investor CRMs build skip tracing as a walled-garden feature to increase lock-in. Parcel has an opportunity to integrate a best-in-class API and differentiate on data quality, transparency, and cost.

---

## iOS and Mobile Considerations

### Push Notifications for Skip Trace Results

- iOS 16.4+ supports Web Push API for PWAs installed to home screen
- Skip trace results from async/batch processing can trigger push notifications when complete
- Implementation: Webhook from skip trace provider -> Parcel backend -> Push notification to user's device
- PWA service workers enable background notification delivery

### Offline Caching of Contact Data

- Service workers can cache skip-traced contact data for offline access
- iOS has a volatile cache -- Safari can clear PWA cache without warning to save storage
- Recommendation: Use IndexedDB for structured contact data storage
- Cache the most recent 100-500 contacts for offline access during driving-for-dollars activities
- Sync strategy: cache-first for reads, queue-then-sync for new skip trace requests

### Mobile-Specific UX Patterns

- One-tap skip trace from property detail view
- Click-to-call on skip-traced phone numbers
- Click-to-text with template messages
- Swipe gestures to mark numbers as "reached" / "wrong number" / "DNC request"
- DNC and litigator flags must be prominently visible (red badges)
- Offline mode: show cached contacts, queue new skip trace requests for when connectivity returns

---

## Recommendation for Parcel

### Primary Integration: BatchData

**Why:**
- Most mature REST API in the RE skip tracing space
- Property-centric data model aligns with Parcel's CRM architecture
- Scalable pricing from $0.01/call (enterprise) to $0.12/call (pay-as-you-go)
- DNC status and phone type included in API response
- Real-time single lookups AND bulk batch processing
- Non-FCRA -- safe for marketing outreach
- Already integrated by GoHighLevel, n8n, and other RE tech platforms
- MCP server available for AI-assisted workflows

**Integration architecture:**
1. Single-property lookup: POST to /skip-trace with property address -> JSON response with phones, emails, owner data
2. Bulk list processing: Upload CSV via API -> Async processing -> Webhook or poll for results
3. Store results in Parcel CRM contact records
4. Flag DNC numbers, litigator status in UI
5. Re-skip timer: prompt users to re-skip after 90 days

### Complementary: Melissa Data (Address Verification)

**Why:**
- Address verification BEFORE skip tracing saves money (don't skip trace invalid addresses)
- NCOA move detection catches relocated owners before skip tracing
- Demographic enrichment (income, owner/renter, household size) enables lead scoring
- Extremely affordable at $0.003/record
- CASS/DPV certified -- gold standard for address data

**Integration architecture:**
1. Validate all imported property addresses through Melissa Personator
2. Flag undeliverable/vacant addresses
3. Run NCOA check to detect recent moves
4. Enrich with demographics for lead scoring
5. Only send validated addresses to skip trace provider

### Budget Tier: Tracerfy

**Why:**
- $0.02/record is 5-6x cheaper than BatchData's pay-per-result pricing
- REST API with webhook support
- Built-in DNC scrubbing endpoints
- No monthly minimums or subscriptions
- White-label capability

**Integration architecture:**
- Offer as "Standard" skip trace tier in Parcel pricing
- BatchData as "Premium" tier with higher accuracy
- Let users choose based on budget and volume needs

### Future Consideration: Spokeo

**Why:**
- Social media enrichment is unique -- no other provider offers LinkedIn/Facebook/Instagram profile matching at this level
- Useful for "deep lookup" on high-value leads
- API is production-ready with multiple search endpoints

**When:** After core skip tracing is launched and users request social media data.

---

## Cost Model

### What Skip Tracing Costs Parcel at Scale

Assuming Parcel passes through cost + margin:

#### Using BatchData (Primary)

| Monthly Volume | BatchData Cost | Parcel Charge (2x markup) | Parcel Gross Margin |
|---------------|---------------|--------------------------|-------------------|
| 1,000 records | $30-$120 | $200-$300 | $80-$270 |
| 10,000 records | $150-$250 | $1,000-$1,500 | $750-$1,350 |
| 100,000 records | $1,500 (Growth tier) | $10,000-$12,000 | $8,500-$10,500 |

#### Using Tracerfy (Budget Tier)

| Monthly Volume | Tracerfy Cost | Parcel Charge (3x markup) | Parcel Gross Margin |
|---------------|--------------|--------------------------|-------------------|
| 1,000 records | $20 | $90-$120 | $70-$100 |
| 10,000 records | $200 | $600-$900 | $400-$700 |
| 100,000 records | $2,000 | $6,000-$9,000 | $4,000-$7,000 |

#### Using Melissa Data (Address Verification)

| Monthly Volume | Melissa Cost | Notes |
|---------------|-------------|-------|
| 10,000 records | $28-$84 | Negligible cost; high ROI from avoiding wasted skip traces |
| 100,000 records | $285 | Less than the cost of 2,000 wasted skip traces |

### Suggested Parcel Pricing to Users

| Tier | Per-Record Charge | Included in Plan | Data Source |
|------|------------------|-----------------|-------------|
| Free tier | N/A | 0 skip traces | N/A |
| Pro plan | $0.10-$0.15/record | 500/mo included | Tracerfy (budget) |
| Pro plan (premium) | $0.20-$0.25/record | 500/mo included | BatchData (premium) |
| Bulk pricing (1K+) | $0.08-$0.12/record | Volume discount | Provider mix |
| Enterprise | Custom | Negotiated | Direct BatchData contract |

### Revenue Opportunity

At 1,000 active Pro users averaging 200 skip traces/month:
- 200,000 skip traces/month
- At BatchData Growth tier: $1,500/mo cost
- At $0.12/trace to users: $24,000/mo revenue
- **Gross margin: ~$22,500/mo (~94%)**

At scale with Tracerfy as default:
- 200,000 traces at $0.02 = $4,000/mo cost
- At $0.10/trace to users: $20,000/mo revenue
- **Gross margin: ~$16,000/mo (80%)**

---

## Data Storage and Refresh Strategy

### Storage Policy

1. **Store all skip trace results in Parcel's database.** No provider prohibits storage of returned results for the purchasing customer's use.
2. **Associate results with a timestamp.** Display "Last skip traced: X days ago" in the UI.
3. **Do NOT resell or redistribute skip trace data.** Provider terms universally prohibit resale.
4. **Encrypt PII at rest** (phone numbers, emails, addresses). Standard practice and likely required under state privacy laws (CCPA, TDPSA).

### Refresh Cycle

| Data Age | Action | Rationale |
|----------|--------|-----------|
| 0-30 days | Fresh; no action needed | Data is current |
| 31-60 days | Display "aging" indicator | Phone numbers may have changed |
| 61-90 days | Prompt user to re-skip | Industry standard refresh window |
| 90+ days | Strong recommendation to re-skip | Data reliability drops significantly |
| 180+ days | Mark as "stale" with warning | Do not auto-dial stale numbers |

### Implementation

1. Store `skip_traced_at` timestamp on each contact record
2. Background job: flag contacts approaching 90-day threshold
3. Optional: auto-re-skip for Pro/Enterprise users (with budget cap)
4. Batch re-skip: let users select stale contacts and re-skip in bulk
5. De-duplicate: don't charge users for re-skipping if data hasn't changed (compare response hash)

### DNC List Refresh

- National DNC Registry must be re-scrubbed every 31 days minimum
- Store DNC status per phone number with `dnc_checked_at` timestamp
- Background job: batch re-scrub all stored phone numbers monthly
- Immediately honor any user-reported DNC requests (internal DNC list)

---

## Appendix: Provider Contact Information

| Provider | Sales Contact | Website |
|----------|--------------|---------|
| BatchData | batchdata.io/contact | batchdata.io |
| Tracerfy | tracerfy.com | tracerfy.com |
| REISkip | reiskip.com | reiskip.com |
| Spokeo Business | (888) 895-5122 | spokeo.com/business/api |
| Accurate Append | accurateappend.com | accurateappend.com |
| Melissa Data | (800) 635-4772 x3 | melissa.com |
| LexisNexis | Contact via lexisnexis.com | accurint.com |
| TLOxp (TransUnion) | transunion.com | tlo.com |
| SkipGenie | support@skipgenie.com | skipgenie.com |
| Tracers | tracers.com | tracers.com |
