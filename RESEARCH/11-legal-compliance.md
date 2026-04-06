# Legal & Compliance Research for Parcel Platform

> **Date:** 2026-04-02
> **Scope:** Wholesaling regulations, cold outreach compliance, tenant screening, data privacy, iOS App Store rules
> **Purpose:** Inform platform guardrails -- Parcel is NOT a law firm and will not provide legal advice, but features must be designed to help users stay compliant.

---

## Table of Contents

1. [Wholesaling Regulations by State](#1-wholesaling-regulations-by-state)
2. [Cold Outreach Compliance (TCPA / A2P 10DLC / DNC)](#2-cold-outreach-compliance)
3. [Tenant Screening Compliance](#3-tenant-screening-compliance)
4. [Data Privacy](#4-data-privacy)
5. [iOS App Store Compliance](#5-ios-app-store-compliance)
6. [Platform Design Implications -- Master Guardrail Matrix](#6-platform-design-implications)

---

## 1. Wholesaling Regulations by State

### 1.1 The Regulatory Landscape (2019--2026)

Since 2019, state legislatures have been steadily tightening regulation of real estate wholesaling. The pace accelerated sharply in 2024-2025, with six new laws enacted across five states in 2025 alone. The trend shows no sign of slowing.

**Core regulatory themes across states:**
- Mandatory written disclosure of wholesaler intent to assign
- Homeowner cancellation / rescission rights (2-30 days)
- Licensing or registration requirements for repeat wholesalers
- Restrictions on public marketing without a license
- Penalties including fines, misdemeanor charges, and contract voidability

### 1.2 State-by-State Requirements

#### Tier 1: Strictest Regulation (Licensing + Disclosure + Restrictions)

**Illinois -- Public Act 101-0357 (effective August 2019)**
- **The "one deal" rule:** Wholesaling more than one property in a 12-month period constitutes brokerage activity requiring a license.
- Two or more contract dealings in 12 months = broker definition triggered.
- Doing two deals without a license = Class A misdemeanor.
- Posting property photos publicly on social media without a license is a violation.
- Compensation to non-licensed persons is prohibited.
- Double closing may be legal (statute language is ambiguous), but assignment-based wholesaling at volume requires licensing.
- **Platform implication:** Parcel must detect Illinois-based users and warn them about the one-deal threshold; restrict public deal marketing features for unlicensed IL users.

**South Carolina -- HB 4754 (2024)**
- Closest any state has come to an outright ban on wholesaling.
- Defines "advertising or marketing real estate owned by another individual or entity with the expectation of compensation" as broker activity requiring licensure.
- Licensed brokers cannot engage in wholesaling.
- Double closing viability is unclear.
- **Platform implication:** Strongest possible warning for SC users; consider blocking assignment-related workflow features for unlicensed SC users.

**Pennsylvania -- Act 52 (effective January 8, 2025)**
- Amends the Real Estate Licensing and Registration Act to classify wholesaling as broker/salesperson activity.
- **Licensing required** for all wholesale transactions.
- **30-day cancellation right** -- sellers can cancel until midnight on the 30th day following contract execution.
- Wholesaler must provide bold-faced written disclosure stating: (a) transaction is wholesale, (b) purchaser intends to transfer interest without taking title, (c) consumer may consult appraisers and legal counsel, (d) cancellation right exists.
- All payments refunded within 10 business days if cancelled.
- Wholesalers cannot require sellers to waive these rights.
- Philadelphia additionally requires a special residential property wholesaler license.
- **Platform implication:** PA contract templates must include mandatory disclosure language; workflow must enforce 30-day cancellation window tracking.

**Oregon -- HB 4058 (registration required starting July 1, 2025)**
- All residential property wholesalers must register with the Oregon Real Estate Agency (OREA).
- Annual registration renewal by June 30 each year, fee of $300.
- "Residential property wholesaling" = marketing property where marketer holds equitable interest or option for fewer than 90 days and has invested less than $10,000 in improvements.
- Written disclosure required to: potential buyers, potential sellers, any assisting brokers, and in all advertising.
- Violations: maximum 364 days imprisonment, $6,250 fine, or both.
- **Platform implication:** Verify Oregon user registration status; require disclosure attestation before deal listing.

**North Carolina -- HB 797 (effective October 1, 2025)**
- Wholesaling classified as real estate brokerage requiring a license.
- **30-day non-waivable cancellation right** for homeowners.
- Refund within 10 business days after cancellation.
- Contract must include cancellation statement in 14-point font.
- Full copy of contract must be provided to homeowner at signing.
- Failure to provide cancellation right = per se unfair or deceptive trade practice.
- **Platform implication:** NC contract templates must include 14-point cancellation disclosure; track cancellation windows.

**Oklahoma -- SB 1075, Predatory Real Estate Wholesaler Prohibition Act (effective November 1, 2025)**
- **Most comprehensive statute in the country.**
- Defines wholesaler as someone who contracts to purchase residential property without intent to occupy/improve and intends to assign.
- Expressly includes double closing in the definition of wholesaling.
- **Mandatory written disclosures:** intent to assign for higher price, urge homeowner to seek legal advice, homeowner's 2-business-day cancellation right.
- Earnest money must be held in Oklahoma escrow at a federally insured institution with a physical OK branch.
- Public marketing of wholesale deals = licensed brokerage activity (must market privately to pre-existing buyer relationships only).
- Misrepresenting oneself as licensed or placing liens/clouding titles is prohibited.
- Contract is invalid and unenforceable if disclosures are missing; homeowner keeps earnest money.
- **Platform implication:** Critical state. OK users must attest to private-only marketing; deal listing features restricted; contract templates must include all mandated disclosures; escrow tracking required.

#### Tier 2: Disclosure + Registration Requirements

**Ohio -- SB 155 (2024/2025)**
- Bold-faced written disclosure (minimum 12-point font) required before seller signs purchase agreement.
- Disclosure must identify party as wholesaler, state they don't represent the seller, inform of right to seek attorney/RE professional advice, explain assignment process and profit motive.
- Failure to have disclosure signed = unfair/deceptive practice under Consumer Sales Practices Act.
- Seller can cancel without penalty if disclosure not provided; earnest money returned within 30 days.
- Attorney General enforces the law.
- **Platform implication:** OH contract templates need bold 12-point disclosure; track disclosure signing.

**Wisconsin -- Act 208 (effective March 2024)**
- Applies to residential real property with 1-4 dwelling units.
- Written notice to seller (no later than contract execution) that buyer is a wholesaler.
- Written notice to assignee that assignor is a wholesaler conveying equitable interest, not title.
- If disclosures not provided: seller may rescind without liability; seller retains all deposits/option fees.
- Pattern-based licensing trigger: 5+ sales/year or 10+ in 5 years.
- Penalties: up to $5,000 fine and 6 months imprisonment.
- **Platform implication:** Dual disclosure tracking (seller + assignee); warn users approaching activity thresholds.

**Maryland -- HB 124/SB 160 (effective October 1, 2025)**
- Wholesalers must disclose intent to assign or sell equitable interest.
- Must clarify they may not be able to convey property title to assignee.
- Property owner can cancel without penalty if disclosures not made.
- **Platform implication:** MD-specific disclosure templates and cancellation tracking.

**Tennessee -- SB 909 (effective immediately, March 25, 2025)**
- Wholesalers must clarify intent to assign or sell equitable interest.
- Must detail the nature of their interest in the property.
- All disclosures must be in bold, large font within the written agreement.
- **Platform implication:** TN contract templates with bold disclosure formatting.

**Connecticut -- HB 7287 (effective July 1, 2026)**
- Registration with Department of Consumer Protection required.
- $285 nonrefundable application fee; registration valid 2 years, renewable biennially.
- 3-business-day cancellation window for sellers after signing.
- Closing date cannot exceed 90 days after contract execution.
- Can simultaneously hold broker/salesperson license and wholesaler registration.
- **Platform implication:** Track CT registration status; enforce 90-day closing deadline; 3-day cancellation period.

**North Dakota -- HB 1125 (effective August 1, 2025)**
- Expands wholesale law requirements to ALL real estate wholesale transactions (not just residential).
- **Platform implication:** No residential-only carveout; broader scope for ND users.

**Iowa -- HF 2394**
- Requires a real estate broker's license to wholesale.
- Tightens marketing rules with penalties for circumvention.
- **Platform implication:** License verification for IA users.

**Virginia -- HB 917**
- If you wholesale more than once in a year, a real estate license is required.
- First deal permitted without license.
- **Platform implication:** Track deal count for VA users; warn at threshold.

#### Tier 3: Emerging or Moderate Regulation

**Minnesota -- Statute 82.55, Subd. 19**
- 5+ transactions in 12 months triggers licensing requirement.
- Exception if represented by licensed broker.

**Nebraska -- Choice Homes v. Donner (2022 court ruling)**
- Soliciting sale of another's property in exchange for an option = acting as broker.
- Fee/commission collection triggers licensing.

**Kentucky -- HB 62**
- Advertising equitable interest in a purchase contract may trigger broker definition.
- Distinction between activity "for others" vs. personal activity.

### 1.3 Double-Closing Restrictions

Double closing is legal in most states but increasingly regulated:

| State | Double Close Status |
|-------|-------------------|
| Oklahoma | Expressly included in wholesaling definition; same rules apply |
| North Carolina | Included in definition of wholesaling |
| South Carolina | Legally risky if marketing before taking title |
| Illinois | Ambiguous; may be legal but untested |
| Pennsylvania | Not explicitly prohibited but licensing still required |
| Most other states | Generally permitted with proper disclosure |

### 1.4 How Competitors Handle State Compliance

**REsimpli:**
- Provides customizable contract templates with disclosure language.
- Tagging features for assignment, double close, or direct purchase.
- Full audit trails to protect during legal reviews.
- Buyer CRM to avoid public advertising (relevant for states restricting public marketing).

**InvestorLift:**
- Requires interested parties to agree to conduct all inquiries solely through the listing investor (not the owner).
- Terms of service place compliance burden on individual users.
- Marketplace model with private buyer networks.

**Common approach:** Competitors generally provide tools and templates but place the legal compliance burden on the individual user through Terms of Service, while providing educational content about state-specific requirements.

---

## 2. Cold Outreach Compliance

### 2.1 TCPA Rules for Cold Texting/Calling

#### Current Requirements (as of April 2026)

**Consent for Automated Communications:**
- **Prior express written consent** required for any call or text using regulated technology (auto-dialers/ATDS, prerecorded/artificial voice, AI voice, outbound IVR, voicemail technology).
- Consent must be in writing -- verbal agreements are not valid under the TCPA.
- Consent must be tied directly to the specific business and purpose of communication.

**One-to-One Consent Rule:**
- The FCC adopted a rule requiring prior express written consent be obtained separately for each company seeking to use it.
- Originally set for January 27, 2025; postponed to January 26, 2026, pending the IMC case decision.
- Broad consents obtained from lead generators covering multiple companies are no longer valid once effective.
- **Critical for Parcel:** If Parcel users purchase leads from lead generators, those leads' consent must name the specific user/company, not just the lead gen platform.

**Opt-Out / Revocation Requirements (effective April 11, 2025):**
- Consumers can revoke consent through any medium -- text, email, or verbal request.
- Callers must cease ALL calls and texts across ALL channels within 10 business days.
- This is a cross-channel obligation: revoking consent for texts also revokes consent for calls.

**Penalties:**
- $500 to $1,500 per violation.
- Damages can include EVERY call made by a caller that violates the rule in a single case.
- TCPA lawsuits surged nearly 95% in 2024-2025, with class actions spiking 285% in September alone.

#### AI-Generated Calls

- FCC Declaratory Ruling (February 2024): AI-generated voices are "artificial or prerecorded" under TCPA.
- FTC "Operation AI Comply" (September 2024): Enforcement sweep against deceptive AI practices including illegal robocalls.
- FCC NPRM (July 2024): Proposing specific consent for AI-generated calls and in-call disclosure that AI is being used.

### 2.2 Ringless Voicemail (RVM)

**Definitively regulated:** The FCC ruled (November 2022) that ringless voicemail to wireless phones is a "call" under the TCPA.

- Express written consent required for marketing RVM.
- Express consent required for informational RVM.
- Every court to examine the issue has upheld this ruling.
- **Platform implication:** If Parcel ever integrates RVM, it requires the same consent framework as calls/texts. No "loophole" exists.

### 2.3 A2P 10DLC Registration

**What Parcel Needs as an ISV (Independent Software Vendor):**

1. **Platform Registration:**
   - Register Parcel's own brand with The Campaign Registry (TCR) via a messaging provider (e.g., Twilio).
   - Create a Primary Business Profile with ISV/Reseller designation.
   - Requires: EIN, legal business name, contact info, website.

2. **Per-Customer Registration:**
   - Each Parcel user who sends SMS must have a Secondary Customer Profile registered under their subaccount.
   - Each user needs their own Brand registration.
   - Each messaging use case needs a Campaign registration.

3. **Campaign Types:**
   - Each distinct message purpose (marketing, transactional notifications, etc.) = separate campaign.
   - Standard campaigns: 3-7 business days for approval.

4. **Enforcement:**
   - As of February 1, 2025, unregistered 10DLC numbers are blocked by US carriers.
   - Non-compliance = delivery failures, surcharges, rate limiting, or suspension.

5. **Ineligible Industries:**
   - Cannabis/hemp, firearms, payday loans, third-party debt collection are blocked from 10DLC.
   - Real estate investment is eligible.

### 2.4 National Do Not Call (DNC) List

**Integration Requirements:**
- Telemarketers must subscribe annually to access the FTC's National DNC Registry.
- Cost: First 5 area codes free; $82 per area code in FY 2026; max $22,626 for all area codes nationwide.
- Registry must be accessed no more than 31 days before calling any consumer.

**Safe Harbor:**
To avoid penalties for accidentally calling a DNC-listed number, a platform/user must demonstrate:
1. Written procedures to comply with DNC requirements.
2. Registry accessed within 31 days of the call.
3. Records documenting the scrubbing process.
4. Any violation was the result of error, not intentional.

**Penalty for calling DNC numbers:** Up to $43,280 per call.

**Platform Integration Options:**
- Direct FTC registry subscription + scrubbing.
- Third-party DNC checking APIs: DNCSolution (PossibleNOW), Data247, SearchBug, RealValidito.
- Integration into CRM to auto-scrub numbers at point of capture or before dialing.

### 2.5 State-Specific Calling Regulations (Stricter Than Federal)

Several states have "Mini-TCPA" laws that exceed federal requirements:

**Florida (HB 761 -- Florida Telephone Solicitation Act):**
- Written consent required for automated calls (stricter than federal).
- Ban on more than 3 sales calls in 24 hours about the same subject matter.
- 15-day safe harbor period from date consumer notifies of opt-out.
- Private right of action with statutory damages.

**California:**
- Maintains its own state Do Not Call list (separate from federal).
- Telemarketers must honor BOTH state and federal DNC lists.
- Must maintain internal DNC list for 10 years.
- Prior consent required for robocalls; disclosure required for recorded calls or auto-dialing.

**New York:**
- Limits on calling hours.
- Immediate identification requirements for telemarketers.
- Strong enforcement against robocalls with clear opt-out provisions.

**Texas (updated August 2025):**
- Latest state to update its Mini-TCPA rules.
- Growing trend of state-level enforcement supplements federal TCPA.

**Oklahoma & Maryland:**
- Ban on more than 3 sales calls in 24 hours about the same subject.

### 2.6 Platform Liability (SaaS Provider Exposure)

**This is a critical risk area for Parcel.**

**Key Legal Standard (Connor v. Servicequick Inc. and Woosender, 2025):**
- Court denied dismissal of claims against Woosender, the messaging platform.
- "No blanket rule immunizing cloud-based service providers that transmit third-party content from TCPA liability."
- Platform liability based on "totality of the facts and circumstances."

**When a Platform Crosses the Line:**
- Providing "intimate support for customers' campaigns and strategies" (not just neutral infrastructure).
- "Setting up and providing intimate support" for customer messaging operations.
- Going "far beyond merely providing the platform that enables them to send messages."

**What Does NOT Shield a Platform:**
- Terms of service requiring clients to comply with federal regulations.
- General client statements that they "will not violate the law."

**Risk Mitigation for Parcel:**
- Provide tools, not campaign strategy services.
- Require users to attest to consent collection.
- Build automated compliance checks (DNC scrubbing, consent verification).
- Maintain clear ToS placing compliance burden on users.
- Do NOT actively assist in crafting outreach campaigns or strategies.
- Log all compliance actions as audit trail.

---

## 3. Tenant Screening Compliance

### 3.1 Fair Housing Act (FHA) Liability

**HUD Guidance (May 2024):**
HUD issued two guidance documents on Fair Housing Act application to tenant screening and AI-powered advertising:

**Features That Could Create Liability:**
- Blanket bans on tenants with criminal histories (disparate impact on race/ethnicity).
- Credit score thresholds without individualized assessment (disparate impact on protected classes).
- Automated rejection based on eviction history without context (disparate impact on race, familial status, disability).
- Screening that excludes Housing Choice Voucher holders (discriminatory in jurisdictions with source-of-income protections).
- AI/algorithmic screening that uses variables correlated with protected classes.

**HUD Best Practices for Software Platforms:**
1. Use only screening criteria relevant to tenancy.
2. Publish screening policies in advance.
3. Apply discretion to third-party screening results (don't auto-reject).
4. Give applicants the chance to contest negative determinations.
5. Ensure screening models are accurate and non-discriminatory.
6. Provide all records to applicants with reasons for denial.

**Joint Liability:**
Both the housing provider AND the screening company/software platform can be jointly liable. Delegation to a screening tool does not shield the landlord, and the tool provider shares exposure.

### 3.2 FCRA Requirements

**When Does FCRA Apply?**
If Parcel integrates with or provides access to consumer reports (credit reports, background checks, eviction records), it may be acting as or facilitating a Consumer Reporting Agency (CRA).

**Key Obligations:**

**For CRAs:**
- Implement reasonable procedures to confirm accuracy of information.
- Provide consumers access to their files.
- Investigate disputed information within 30 days.

**For Users of Consumer Reports (Landlords):**
- Must have a permissible purpose (housing application/lease renewal).
- Must certify to the CRA that report will be used only for housing purposes.
- Must securely dispose of reports after use.

**Adverse Action Notice Requirements:**
When a landlord denies an application based (even partly) on a consumer report, they must provide a notice containing:

1. **Notice of the adverse action** -- clear statement of denial/unfavorable terms.
2. **Credit score and factor disclosures** -- the score used, its source, date, range, and key negative factors in order of importance.
3. **Consumer agency disclosures** -- name, address, phone of the CRA; statement that CRA did not make the decision.
4. **Statement of applicant's rights** -- right to free copy of report within 60 days; right to dispute inaccurate information.

**Timing:** Best practice is within 5 days of decision.
**Format:** Written notice recommended (oral is technically allowed but creates compliance risk).
**Retention:** Keep records for at least 5 years.

### 3.3 Ban-the-Box / Criminal History Restrictions

**Overview:** 37 states plus DC have some form of ban-the-box law (primarily employment-focused), but housing-specific criminal history restrictions are growing.

**Key State/Local Housing Restrictions:**

| Jurisdiction | Criminal History Rule |
|-------------|----------------------|
| San Francisco, CA | Bans landlords from using criminal records in tenant screening |
| Oakland & Berkeley, CA | Ban asking about most criminal backgrounds |
| Richmond, CA | Fair Chance Housing Ordinance |
| California (statewide) | Can consider convictions within 7 years; cannot deny based solely on arrest records without conviction |
| New York City (proposed) | Misdemeanors limited to 3 years; felonies limited to 5 years; sex offenses unlimited |
| Seattle, WA | Fair Chance Housing law |
| Portland, OR | Screening criteria ordinance |
| Illinois | Restrictions on criminal history use in housing |

**Trend:** More jurisdictions adding housing-specific criminal history restrictions. Platforms must anticipate expansion.

### 3.4 State Landlord-Tenant Law Variations

These variations affect what features a property management CRM can offer:

**Security Deposit Return Timelines:**

| State | Return Deadline | Notable Rules |
|-------|----------------|---------------|
| California | 21 days | Cap of 1 month's rent (July 2024) |
| Florida | 30 days | Written notice of intent to impose claims |
| Texas | 30 days | Itemized deductions required; no statutory deposit limit |
| Maryland | 45 days | Itemized list of damages |
| New Hampshire | 30 days | -- |
| Illinois | 30-45 days | Varies by unit count |
| New York | 14 days | Must hold in interest-bearing account |
| Colorado | 30 days (or per lease) | -- |

**Eviction Notice Periods:**

| State | Nonpayment | Lease Violation |
|-------|-----------|----------------|
| Illinois | 5 days | 10 days |
| California | 3 days | 3 days cure / 3 days quit |
| Texas | 3 days | Varies |
| Florida | 3 days | 7 days |
| New York | 14 days | Varies by lease type |

**Platform implication:** Any eviction tracking, security deposit management, or notice generation features must be state-aware and use correct timelines/amounts.

---

## 4. Data Privacy

### 4.1 CCPA/CPRA (California)

**Applicability Threshold:**
A business must comply if it: (a) has annual gross revenue over $25 million, OR (b) buys/sells/shares personal information of 100,000+ California consumers annually, OR (c) derives 50%+ of annual revenue from selling/sharing personal information.

**Key Requirements for a CRM Storing Contact Data:**

1. **Right to Know:** Consumers can request what personal information is collected, used, and disclosed.
2. **Right to Delete:** Consumers can request deletion of their personal information. Must also direct third-party vendors to delete.
3. **Right to Correct:** Consumers can request correction of inaccurate information.
4. **Right to Opt-Out:** Of sale or sharing of personal information.
5. **Right to Limit:** Use and disclosure of sensitive personal information.
6. **Data Minimization:** Collect only what is needed; use only for stated purposes.
7. **Storage Limitation:** Disclose retention periods; avoid indefinite storage.

**Publicly Available Exception:**
Public real estate/property records are generally exempt from CCPA's definition of "personal information." However, skip tracing data that goes beyond public records (phone numbers, email addresses, social media profiles) likely IS covered.

**Enforcement (as of January 1, 2026):**
- California Privacy Protection Agency (CPPA) can directly impose fines without a cure period.
- $2,500 per unintentional violation; $7,500 per intentional violation.
- No cure period for certain violations under new 2026 regulations.

### 4.2 State Comprehensive Privacy Laws

As of early 2026, 20+ states have enacted comprehensive consumer data privacy laws:

**Currently Effective:**

| State | Law | Effective Date |
|-------|-----|---------------|
| California | CCPA/CPRA | Jan 2020/Jan 2023 |
| Virginia | VCDPA | Jan 2023 |
| Colorado | CPA | Jul 2023 |
| Connecticut | CTDPA | Jul 2023 |
| Utah | UCPA | Dec 2023 |
| Oregon | OCPA | Jul 2024 |
| Texas | TDPSA | Jul 2024 |
| Montana | MCDPA | Oct 2024 |
| Delaware | DPDPA | Jan 2025 |
| Iowa | ICDPA | Jan 2025 |
| Nebraska | NDPA | Jan 2025 |
| New Hampshire | NHPA | Jan 2025 |
| New Jersey | NJDPA | Jan 2025 |
| Tennessee | TIPA | Jul 2025 |
| Minnesota | MCDPA | Jul 2025 |
| Maryland | MODPA | Oct 2025 |
| Indiana | INPA | Jan 2026 |
| Kentucky | KCDPA | Jan 2026 |
| Rhode Island | RIDPA | Jan 2026 |

**Common Rights Across All Laws:**
- Right of access, correction, deletion, data portability.
- Right to opt out of sale/targeted advertising.

**Notable Variations:**
- Colorado and Virginia require risk assessments for high-risk processing (biometric data, profiling).
- Colorado added biometric data requirements (July 2025) and minor data processing requirements (October 2025).
- Some states require Data Processing Agreements with all vendors.

### 4.3 Data Retention and Deletion Requirements

**Right to Delete:**
- Present in virtually all state privacy laws.
- Must be able to process verifiable consumer requests.
- Must direct downstream processors/vendors to also delete.
- Exceptions: legal compliance, completing transactions, exercising legal claims.

**Retention Limits:**
- CPRA requires disclosing retention periods and avoiding indefinite storage.
- Best practice: Define and publish retention schedules for each data type.

**Skip Tracing Data Considerations:**
- Phone numbers, emails from skip tracing likely covered as personal information.
- Property records from public databases may be exempt (varies by state).
- Platform must be able to identify and delete all data associated with a specific individual upon request.

### 4.4 Data Breach Notification

**All 50 states** plus DC, Guam, Puerto Rico, and the US Virgin Islands have breach notification laws.

**Key State Notification Timelines:**

| State | Deadline | AG Notification |
|-------|----------|----------------|
| California | 30 days (SB 446, Sep 2025) | Within 15 days of individual notice if 500+ residents |
| Colorado | 30 days | Required |
| Florida | 30 days | Required for 500+ individuals |
| New York | 30 days | Required |
| Texas | 30 days | Required for 250+ residents |
| Maine | 30 days | Required |
| Washington | 30 days | Required |
| Delaware | 60 days | Required |
| North Dakota | 45 days to financial commissioner if 500+ consumers | Required |
| Most other states | "Without unreasonable delay" (typically 45-90 days) | Varies |

**SaaS-Specific Requirements:**
- Encryption, access controls, and audit logs are expected safeguards.
- Clear contractual obligations with customers for breach notification procedures.
- Processor must notify controller "without unreasonable delay."

### 4.5 GDPR Considerations

Low priority for Parcel given the US-focused real estate market. However:
- If any user or data subject is in the EU, GDPR applies to their data.
- Practical approach: Include GDPR-compliant data handling as a baseline (consent, right to delete, data portability) which also satisfies most US state requirements.
- Consider geo-blocking EU users from skip tracing features if full GDPR compliance is not implemented.

---

## 5. iOS App Store Compliance

### 5.1 Subscription and Payment Rules

**In-App Purchase (IAP) Requirement:**
- Parcel's Pro subscription ($69/$55/mo) must use Apple IAP if purchased through the iOS app.
- Auto-renewable subscriptions must be at least 7 days.
- Must work across all user devices.
- Must provide ongoing value (updates, cloud features, etc.).
- Cannot remove functionality that existing users already purchased.
- Free trial terms must be clearly disclosed.

**Apple's Commission:**
- 30% on first year of subscription purchases.
- 15% after customer completes one year of paid subscription (Auto-Renewable Subscription rate).
- For qualifying small businesses (under $1M annual App Store revenue): 15% from day one via Apple Small Business Program.

**US Storefront Exception (May 2025):**
- Following the April 30, 2025 court ruling, US App Store apps can now include buttons, external links, and calls-to-action directing users to purchase through the developer's website.
- This means Parcel can link to parceldesk.io for subscription purchases from within the iOS app (US only).
- Significant cost savings vs. 30% Apple commission.

**Enterprise Services Exception (3.1.3(c)):**
- Apps sold directly to organizations for employees are exempt from IAP.
- Unlikely to apply to Parcel's individual investor user base.

### 5.2 Privacy Requirements (Section 5.1)

**Privacy Policy:**
- Required in App Store Connect and in-app.
- Must clearly explain: what data is collected, how it's collected, all uses, third-party access, retention/deletion policies, consent revocation process.

**Data Minimization:**
- Request only data relevant to core functionality.
- Cannot require system functionalities (push notifications, location) as conditions for app access.

**Account Deletion:**
- If account creation is supported, must offer account deletion within the app.
- This aligns with CCPA right-to-delete requirements.

**Contact Data Rules (5.1.1(viii)):**
- **Critical for Parcel's skip tracing feature:** Apps that compile personal data from public databases are prohibited unless the user whose data is being compiled has consented.
- This could affect how skip tracing results are displayed in the iOS app.
- Possible mitigation: present skip tracing as a user-initiated lookup rather than a compiled database.

**Contact Database Prohibition (5.1.2(iv)):**
- Cannot use Contacts or Photos APIs to build contact databases for own use or sale.
- Parcel should not auto-import device contacts without explicit user consent and clear purpose.

### 5.3 Privacy Nutrition Labels

**Required Disclosures:**
- Must categorize all data collection into Apple's framework: Data Used to Track You, Data Linked to You, Data Not Linked to You, Data Not Collected.
- For Parcel, likely disclosures include: Contact Info, Identifiers, Usage Data, Financial Info (payment), Location (if property search features use it).

**App Tracking Transparency (ATT):**
- If Parcel uses any ad-related features or shares data with advertising networks, must implement ATT framework to request user permission.
- If Parcel does not track users across other apps/websites, ATT may not be required but the privacy label must still be accurate.

### 5.4 Financial Services Classification

- Parcel is a CRM/investment tool, not a financial services provider.
- However, Apple's guideline 5.1.1(ix) lists financial services in "highly regulated fields" requiring submission by the legal entity providing services.
- Parcel should position itself as a management tool, not a financial advisory or transaction platform, to avoid triggering these stricter requirements.

### 5.5 User-Generated Content

If Parcel includes community features, deal sharing, or messaging:
- Must include content filtering, reporting mechanism, blocking capability, and published contact info.
- Must moderate user-generated content.

---

## 6. Platform Design Implications -- Master Guardrail Matrix

### 6.1 Wholesaling Guardrails

| Feature | Implementation |
|---------|---------------|
| **State detection** | Detect user's operating state during onboarding; store as profile attribute |
| **State-specific disclaimers** | Display relevant legal disclaimer before any wholesale workflow based on user state |
| **License verification prompt** | For IL, SC, PA, OR, NC, OK, IA, VA: prompt for license number during onboarding; restrict wholesale features for unlicensed users in strict states |
| **Contract template engine** | State-aware templates with mandatory disclosure language pre-populated. Bold formatting where required (OH: 12pt, NC: 14pt, TN: bold/large) |
| **Cancellation period tracking** | Auto-calculate cancellation deadlines per state: PA (30 days), NC (30 days), OK (2 business days), CT (3 business days); send reminders |
| **Deal marketing restrictions** | In OK: block public deal listings for unlicensed users; limit to private buyer list distribution. In SC: strongest warnings about marketing restrictions |
| **Activity threshold warnings** | Track deal count per 12-month period. Warn at: IL (1 deal), VA (1 deal), WI (5 deals/year), MN (5 deals/12 months) |
| **Audit trail** | Log every disclosure shown, contract generated, and user acknowledgment with timestamp |
| **Earnest money tracking** | For OK: verify escrow is at OK-based federally insured institution |
| **Double close flagging** | When deal type = double close, show state-specific warnings (OK, NC, SC in particular) |
| **Registration reminders** | For OR: annual renewal reminder by June 30; for CT: biennial renewal |

### 6.2 Cold Outreach Guardrails

| Feature | Implementation |
|---------|---------------|
| **Consent management system** | Track consent per contact: type (written/verbal), date obtained, source, specific company named, purpose. Store proof documents |
| **DNC scrubbing** | Integrate DNC check API; auto-scrub all numbers before any outreach. Flag DNC-listed numbers as non-contactable. Re-scrub every 31 days maximum |
| **State DNC lists** | For CA users: also check California state DNC list. Maintain internal DNC for 10 years |
| **Opt-out processing** | Accept opt-outs via any channel (text reply, email, in-app). Process within 10 business days max. Apply across ALL communication channels (cross-channel revocation) |
| **A2P 10DLC onboarding** | Guide each user through brand + campaign registration via Twilio/messaging provider. Block SMS features until registration is complete and approved |
| **Rate limiting** | For FL, OK, MD: enforce max 3 calls per 24 hours per contact on same subject. Display warning before exceeding |
| **Calling hours** | Enforce state-specific calling hour restrictions. Default: 8 AM - 9 PM recipient's local time |
| **AI disclosure** | If AI is used for any voice calls: implement pre-call disclosure that AI is being used (per pending FCC NPRM) |
| **Consent attestation** | Before first outreach to any contact, require user to confirm they have obtained proper written consent. Log attestation |
| **Message template review** | Provide compliant message templates. Flag user-composed messages that lack required elements (opt-out language, sender identification) |
| **RVM blocking** | If ringless voicemail is offered: require same consent level as regular calls. Display clear compliance warning |
| **Audit logging** | Log every outreach attempt: timestamp, number called/texted, consent record referenced, DNC check result, opt-out status |

### 6.3 Tenant Screening Guardrails

| Feature | Implementation |
|---------|---------------|
| **Fair Housing compliance banner** | Display persistent reminder in screening workflows: "Screening criteria must be applied consistently to all applicants regardless of race, color, religion, sex, national origin, familial status, or disability" |
| **No auto-reject** | Do NOT automatically reject applicants based on screening results. Present results for landlord review with individualized assessment prompt |
| **Adverse action notice generator** | Auto-generate compliant adverse action notices with all 4 required FCRA elements. Pre-populate CRA info, score details, and applicant rights statement |
| **Adverse action timing tracker** | Prompt landlord to send adverse action notice within 5 business days of decision. Track completion |
| **Criminal history guardrails** | For jurisdictions with ban-the-box housing laws: suppress criminal history fields or display "not available in your jurisdiction" with legal citation. Implement lookback period limits (e.g., NYC: 3yr misdemeanor, 5yr felony) |
| **Screening criteria documentation** | Require landlords to pre-define screening criteria before running checks. Store criteria as evidence of consistent application |
| **Housing voucher flag** | In source-of-income protection jurisdictions: prevent filtering or rejecting based on Housing Choice Voucher status |
| **FCRA consent workflow** | Require applicant's written permission before pulling any consumer report. Store signed consent form |
| **Report disposal** | Auto-flag or auto-delete consumer reports after a defined retention period. Prompt secure disposal |
| **State-specific eviction/deposit tools** | All notice generators, deposit calculators, and timeline tools must reference the correct state's law. Never display a generic number without state qualification |

### 6.4 Data Privacy Guardrails

| Feature | Implementation |
|---------|---------------|
| **Privacy policy** | Comprehensive, accessible privacy policy covering all data types collected, purposes, third-party sharing, retention periods, and consumer rights |
| **Right to delete workflow** | Build consumer request intake form. Process deletions within 30 days. Extend deletion to all downstream processors/vendors. Confirm completion to requester |
| **Right to know / access** | Provide mechanism for individuals to request what data is stored about them. Respond within 45 days (CCPA) |
| **Data retention schedule** | Define and publish retention periods per data type: skip trace data (X months), contact records (X months), communication logs (X years per TCPA safe harbor) |
| **Consent management** | Track opt-in/opt-out status for each contact per purpose. Honor cross-purpose opt-outs where required |
| **Data minimization** | Only collect fields necessary for stated purpose. Audit data fields periodically |
| **Breach response plan** | Pre-drafted notification templates. Defined escalation procedures. Comply with fastest applicable state deadline (30 days for CA, CO, FL, NY, TX). Notify AGs per state thresholds |
| **Skip tracing data handling** | Distinguish between public record data (may be exempt from some privacy laws) and enriched/appended data (likely covered). Enable per-contact deletion |
| **Cookie/tracking consent** | On web app: implement cookie consent banner compliant with CA, CO, CT, VA requirements. Provide opt-out of sale/sharing |
| **Data processing agreements** | Execute DPAs with all third-party processors (skip trace providers, messaging providers, payment processors) |

### 6.5 iOS App Store Guardrails

| Feature | Implementation |
|---------|---------------|
| **Subscription management** | Support both Apple IAP and web-based subscription. For US users, can link to web checkout. For non-US, must use IAP |
| **Privacy nutrition label** | Accurately declare: Contact Info (collected), Identifiers (collected), Usage Data (collected), Financial Info (payment processing), Location (if applicable) |
| **Account deletion** | Provide in-app account deletion flow that removes all user data |
| **Skip tracing display** | Frame as user-initiated lookup, not pre-compiled database. Do not auto-populate contact details without user action |
| **App Tracking Transparency** | Implement ATT prompt if ANY advertising SDK or cross-app tracking is used. If no tracking: do not include ATT prompt but declare accurately in privacy label |
| **Content moderation** | If community features exist: implement reporting, blocking, and content filtering per Section 1.2 |
| **Financial app positioning** | Market as CRM/management tool, not financial advisory. Avoid language implying Parcel provides investment advice |
| **Subscription transparency** | Clear disclosure of subscription terms, pricing, trial duration, and what happens after trial. Mandatory per Section 3.1.2 |

### 6.6 Audit Trail Requirements (Cross-Cutting)

Every compliance-relevant action should be logged with:

| Field | Purpose |
|-------|---------|
| Timestamp (UTC) | When the action occurred |
| User ID | Who performed the action |
| Action type | What was done (disclosure shown, consent recorded, DNC checked, adverse action sent, etc.) |
| Target | The contact/property/deal affected |
| State context | Which state's laws applied |
| Result | Outcome (consent obtained, DNC flagged, notice sent, etc.) |
| Evidence | Document/screenshot/recording reference |

**Retention:** Minimum 5 years for all compliance audit records (covers FCRA, TCPA, state privacy law statute of limitations).

### 6.7 User Education Requirements

| Topic | Implementation |
|-------|---------------|
| **Onboarding compliance module** | Brief required walkthrough covering: wholesaling laws in user's state, TCPA basics, fair housing principles |
| **State-specific alerts** | When user operates in a new state, show that state's key compliance requirements |
| **In-context help** | Tooltips on compliance-sensitive fields explaining why they exist and what the law requires |
| **Compliance dashboard** | Surface: expiring consents, overdue DNC scrubs, approaching activity thresholds, pending adverse action notices |
| **Legal disclaimer** | Persistent footer: "Parcel is not a law firm and does not provide legal advice. Users are responsible for compliance with all applicable laws. Consult a licensed attorney for legal guidance." |
| **Resource library** | Links to official sources: FTC DNC info, FCC TCPA guidance, HUD fair housing resources, state-specific regulatory pages |

---

## Appendix: Key Regulatory Sources

- [FTC - Using Consumer Reports: What Landlords Need to Know](https://www.ftc.gov/business-guidance/resources/using-consumer-reports-what-landlords-need-know)
- [FCC - Telemarketing and Robocalls](https://www.fcc.gov/general/telemarketing-and-robocalls)
- [HUD - Fair Housing Act Guidance on AI](https://archives.hud.gov/news/2024/pr24-098.cfm)
- [California Attorney General - CCPA](https://oag.ca.gov/privacy/ccpa)
- [CPPA FAQ](https://cppa.ca.gov/faq.html)
- [Apple App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Twilio A2P 10DLC ISV Onboarding](https://www.twilio.com/docs/messaging/compliance/a2p-10dlc/onboarding-isv)
- [IAPP US State Privacy Legislation Tracker](https://iapp.org/resources/article/us-state-privacy-legislation-tracker)
- [FTC DNC Registry for Telemarketers](https://www.ftc.gov/business-guidance/resources/qa-telemarketers-sellers-about-dnc-provisions-tsr-0)
- [Oregon Real Estate Agency - Wholesaling Disclosure](https://www.oregon.gov/rea/newsroom/pages/2025-oren-j/wholesaling-disclosure-requirements-for-brokers-and-principal-brokers.aspx)
- [Pennsylvania Act 52 - Barley Snyder Analysis](https://www.barley.com/act-52-imposes-new-regulations-on-real-estate-wholesaling-in-pennsylvania/)
- [Oklahoma SB 1075 - Avenue Legal Group](https://avenuelegalgroup.com/2025-oklahoma-wholesaling-update/)
- [TCPA Platform Liability - Henson Legal](https://www.henson-legal.com/newsroom/were-just-the-platform-a-court-explains-why-that-might-not-be-enough)
- [Leonine Public Affairs - 2025 Wholesaling Laws](https://leoninepublicaffairs.com/new-state-laws-for-real-estate-wholesaling-in-2025/)
- [REsimpli - Wholesaling Laws by State](https://resimpli.com/blog/wholesaling-laws-and-regulations/)
- [Real Estate Bees - Wholesaling Legal Status](https://realestatebees.com/statistics/is-wholesaling-real-estate-legal/)
- [NCLC - TCPA/Robocall Developments](https://www.nclc.org/top-six-tcpa-robocall-developments-in-2024-2025/)
- [Perkins Coie - Security Breach Notification Chart](https://perkinscoie.com/insights/publication/security-breach-notification-chart)
- [IAPP - State Data Breach Notification Chart](https://iapp.org/resources/article/state-data-breach-notification-chart)
- [MultiState - 20 State Privacy Laws in 2026](https://www.multistate.us/insider/2026/2/4/all-of-the-comprehensive-privacy-laws-that-take-effect-in-2026)
