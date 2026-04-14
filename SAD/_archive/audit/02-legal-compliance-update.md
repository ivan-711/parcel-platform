# Legal & Compliance Audit Update

> **Date:** 2026-04-02
> **Baseline:** RESEARCH/11-legal-compliance.md (dated 2026-04-02)
> **Purpose:** Fresh web research to validate, update, or flag new risks across all compliance areas relevant to the Parcel platform.

---

## 1. TCPA -- New Rulings & Enforcement Actions

**Status: UPDATED -- SIGNIFICANT CHANGES**

### What Changed

**One-to-One Consent Rule -- STRUCK DOWN**
- The Eleventh Circuit in *Insurance Marketing Coalition Ltd. v. FCC* (January 24, 2025) vacated the FCC's one-to-one consent rule before it took effect on January 27, 2025.
- The court held the FCC's interpretation of "prior express consent" to require one-to-one consent was impermissible and conflicted with the common-law meaning of the term.
- The "lead generator loophole" remains open -- broad consents obtained from lead generators covering multiple companies are NOT currently prohibited by federal rule.
- The existing research document stated this rule was "postponed to January 26, 2026, pending the IMC case decision." That is now outdated -- the rule was vacated entirely, not just postponed.

**Supreme Court McLaughlin Decision (June 20, 2025)**
- In *McLaughlin Chiropractic Associates, Inc. v. McKesson Corporation*, the Supreme Court held 6-3 that district courts can independently interpret TCPA provisions without deferring to FCC interpretations.
- Combined with *Loper Bright*, this means FCC orders and rules are now open to challenge in individual TCPA lawsuits. District courts can reject FCC interpretations they disagree with.
- A March 2026 Maryland district court already relied on *Loper Bright* to hold that written consent is not required for certain telemarketing calls -- directly contradicting the FCC's prior interpretation.

**Consent Revocation Rule -- DELAYED FURTHER**
- The universal revocation requirement (originally April 11, 2025, then April 11, 2026) has been extended again. In January 2026, the FCC issued a Second Extension Order pushing the "revocation-all" requirement to January 31, 2027.
- The cross-channel revocation provision (opt-out of texts = opt-out of calls from same sender) is the specific element being delayed.

**Litigation Surge**
- TCPA lawsuits surged ~95% in 2024-2025, with class actions spiking 285% in September 2024.
- This trend has continued into 2025-2026 with no sign of slowing.

**State Mini-TCPA Expansion**
- Texas SB 140 (effective September 1, 2025): Expands "telephone solicitation" to include text and image messages.
- Virginia SB 1339 (effective January 1, 2026): Requires honoring text opt-out commands for 10 years.
- At least 15 jurisdictions now enforce mini-TCPA statutes as of fall 2025.

### Impact on Parcel

- The vacated one-to-one consent rule is actually favorable for Parcel users who purchase leads from lead generators. However, this could change -- the FCC or Congress could enact new rules, and the *McLaughlin* decision creates uncertainty as courts may interpret consent requirements differently.
- The delayed cross-channel revocation requirement gives Parcel more time to implement unified opt-out tracking, but the requirement IS coming (now January 2027).
- The litigation surge means Parcel's compliance guardrails are more important than ever -- users who violate TCPA are increasingly likely to be sued.

### Recommended Actions

1. **Update the research document** to reflect the vacated one-to-one consent rule and the McLaughlin decision.
2. **Continue building** unified opt-out tracking (cross-channel revocation) -- the rule is delayed, not cancelled.
3. **Add Virginia 10-year opt-out retention** to the state-specific compliance matrix.
4. **Add Texas text/image message expansion** to the state-specific compliance matrix.
5. **Consider displaying** a litigation risk warning to users in the compliance dashboard.

---

## 2. State Wholesaling Laws

**Status: NO CHANGE (from baseline)**

### What Changed

The existing research document already captures all 2025 state wholesaling laws comprehensively:
- Connecticut HB 7287 (effective July 1, 2026)
- Maryland HB 124/SB 160 (effective October 1, 2025)
- North Dakota HB 1125 (effective August 1, 2025)
- Oklahoma SB 1075 (effective November 1, 2025)
- Tennessee SB 909 (effective immediately, March 25, 2025)
- Pennsylvania Act 52 (effective January 8, 2025)
- North Carolina HB 797 (effective October 1, 2025)
- Oregon HB 4058 (effective July 1, 2025)

No additional states have passed new wholesaling legislation since the baseline research was compiled. However, the overall trend continues to accelerate -- the "Wild West" era of unregulated wholesaling is definitively over.

### Impact on Parcel

No new states to add to the compliance matrix at this time. The Connecticut law (July 1, 2026) is the next upcoming effective date.

### Recommended Actions

1. **Monitor 2026 legislative sessions** -- the pace of new state laws has been accelerating year-over-year since 2019.
2. **Ensure Connecticut compliance features** are ready before July 1, 2026 (registration verification, 3-day cancellation tracking, 90-day closing deadline enforcement).

---

## 3. App Store Policies

**Status: UPDATED -- NEW REQUIREMENTS**

### What Changed

**Third-Party AI Data Sharing (November 2025)**
- Apple added Guideline 5.1.2(i): Apps must "clearly disclose where personal data will be shared with third parties, including with third-party AI, and obtain explicit permission before doing so."
- This is Apple's first time regulating third-party AI as a specific category.

**Age Verification / App Store Accountability Acts (Effective January 1, 2026)**
- Several states (California, Louisiana, Texas, Utah) now impose App Store Accountability (ASA) laws requiring app store operators AND developers to implement age verification, age rating, parental consent, and data minimization safeguards.
- Apple and Google have rolled out new APIs for compliance.

**WebView Clarification**
- Apple clarified that if a WebView is used for app functionality (not open web browsing), it must be treated the same as native functionality. HTML5 and JavaScript mini apps/games are explicitly in scope.
- No specific changes targeting skip tracing or property data apps were found.

**Guideline 5.1.1(viii) -- Public Database Apps**
- No changes found to the existing rule prohibiting apps that compile personal data from public databases without consent of the individuals whose data is compiled.
- This remains the key risk area for Parcel's skip tracing feature in the iOS app.

### Impact on Parcel

- If Parcel uses any third-party AI services (e.g., for CRM features, chat, analytics), it must now explicitly disclose this and obtain user permission under the new 5.1.2(i) guideline.
- The WebView clarification is relevant if Parcel uses a WebView-based architecture -- it must provide full native-equivalent functionality and cannot just wrap a web app.
- Age verification requirements are low-risk for Parcel (B2B investor tool, not targeting minors) but should be confirmed during App Store submission.

### Recommended Actions

1. **Audit any third-party AI integrations** and add disclosure/consent prompts before App Store submission.
2. **Confirm Parcel's app architecture** (native vs. WebView hybrid) meets Apple's updated WebView guidelines.
3. **No change needed** for skip tracing display approach -- continue framing as user-initiated lookup.

---

## 4. iOS Payment Rules Post-Epic

**Status: UPDATED -- SITUATION IN FLUX**

### What Changed

**April 2025 District Court Ruling**
- On April 29, 2025, Judge Yvonne Gonzalez Rogers ruled Apple violated the 2021 injunction by restricting external payment links. Apple was barred from impeding developers' ability to direct users to external checkout.
- For a period in mid-2025, iOS apps on the US storefront could link to web checkout with ZERO Apple commission.

**December 2025 Appeals Court Reversal**
- On December 11, 2025, the Ninth Circuit Court of Appeals modified the injunction. Apple CAN charge a "reasonable commission" on purchases made through external payment links.
- The appeals court directed the district court to calculate a fee based on Apple's costs for coordinating external links plus "some compensation" for Apple's intellectual property.
- Apple had previously proposed commissions of 12-27% on external purchases. The final approved fee has NOT been set yet.
- **Apple cannot charge any commission until the district court approves an appropriate fee.**

**Current Status (as of April 2026)**
- External payment links ARE allowed in US App Store apps.
- Apple currently cannot charge a commission (pending district court fee determination).
- This is a temporary window -- once the fee is set, Apple will begin collecting commissions on external link purchases.
- The existing research document states Parcel can link to parceldesk.io "with significant cost savings vs. 30% Apple commission." This remains true NOW but may change once the fee is determined.

### Impact on Parcel

- Parcel should implement web checkout linking NOW while the commission-free window exists.
- The eventual commission is expected to be lower than 30% but could still be significant (12-27% range was Apple's proposal).
- Parcel should still offer Apple IAP as a fallback, especially for non-US users.
- The Small Business Program (15% from day one for businesses under $1M App Store revenue) remains a viable alternative if the external link commission ends up being comparable.

### Recommended Actions

1. **Implement external payment link to parceldesk.io** in the US iOS app immediately to take advantage of the current commission-free period.
2. **Monitor the district court fee determination** closely -- this will directly impact pricing strategy.
3. **Maintain dual payment path** (IAP + web checkout) for flexibility.
4. **Update the research document** to reflect the December 2025 appeals court modification.

---

## 5. A2P 10DLC Registration

**Status: UPDATED -- ENFORCEMENT TIGHTENED**

### What Changed

**Full Blocking Now Active**
- As of February 1, 2025, ALL messages from unregistered 10DLC numbers are blocked by US carriers. This was known but is now confirmed as actively enforced.
- Carriers are matching messages against registrations in real-time.

**Enhanced Carrier Enforcement**
- Carriers are tightening enforcement even further in 2025-2026. Phone numbers may be blacklisted for repeated violations, not just rate-limited or surcharged.
- Registration timelines remain 1-3 weeks overall (brand registration: minutes to days; campaign registration: 3-7 business days).

**State-Specific Requirements Layered On**
- Texas and Virginia now have stricter messaging rules than federal A2P requirements. Messages to consumers in these states need state-specific compliance on top of 10DLC registration.

### Impact on Parcel

- The existing research document's A2P 10DLC section is accurate but should note the blacklisting risk for repeated violations.
- Parcel's ISV onboarding flow must block SMS features entirely until brand + campaign registration is complete and approved. No "soft" warnings -- hard blocks required.

### Recommended Actions

1. **Implement hard blocking** of SMS features until 10DLC registration is verified.
2. **Add state-specific compliance checks** for Texas and Virginia messaging rules.
3. **Monitor carrier policies** for additional enforcement changes.

---

## 6. Connor v. Woosender

**Status: UPDATED -- NO APPEAL RESOLUTION YET**

### What Changed

The October 2025 ruling in *Connor v. Servicequick Inc. and Woosender* (D. Colo.) denied Woosender's motion to dismiss. The case has not been resolved on the merits yet -- the denial of the motion to dismiss means the case proceeds to discovery and potentially trial.

Key legal standard from the ruling remains as documented in the existing research:
- No blanket rule immunizing SaaS platforms from TCPA liability.
- Liability based on "totality of the facts and circumstances."
- Platforms that provide "intimate support for customers' campaigns and strategies" cross the line from neutral infrastructure to potential co-liability.

**Related Development: Connor v. Accident LLC (February 2026)**
- A new case, *Connor v. Accident LLC*, was filed in February 2026 in the Southern District of New York (Case No. 1:2026cv02049). The same plaintiff (Jay Connor, a TCPA repeat litigant) is continuing to file platform liability cases.
- This suggests a growing pattern of litigation targeting messaging platforms specifically.

### Impact on Parcel

- The Woosender case remains the most directly relevant precedent for Parcel's platform liability exposure.
- The fact that the case is proceeding (not dismissed) is a warning signal. The legal standard is still being developed.
- The new Connor v. Accident LLC filing suggests this plaintiff is actively pursuing platform-liability theories across multiple jurisdictions.

### Recommended Actions

1. **No change to platform design approach** -- continue positioning Parcel as a neutral tool provider, not a campaign strategy service.
2. **Strengthen audit trails** documenting that Parcel provides tools, not campaign strategy.
3. **Monitor both cases** for developments that could establish binding precedent.
4. **Consider legal review** of Parcel's onboarding and support workflows to ensure they don't cross the "intimate support" line.

---

## 7. CCPA and State Privacy Laws

**Status: UPDATED -- NEW REQUIREMENTS**

### What Changed

**CCPA/CPRA Regulatory Updates (Effective January 1, 2026)**
- The California Privacy Protection Agency (CPPA) finalized new regulations covering:
  - **Cybersecurity audits**: Certain businesses must conduct annual audits and submit attestations by April 1, 2028.
  - **Risk assessments**: Required for processing activities that "might present a risk to consumers' privacy."
  - **Automated decision-making**: Rules require opt-outs when automated decision-making technology "replaces or substantially replaces human decision-making." Human oversight obligations for anyone reviewing automated decisions.
  - **Opt-out confirmations**: Businesses must now provide confirmation when a consumer's opt-out request has been processed.

**California Delete Act / DROP Platform**
- The Delete Request and Opt-out Platform (DROP) launched, with major compliance milestones:
  - **January 31, 2026**: Data broker registration deadline ($6,000 annual fee + processing fees).
  - **August 1, 2026**: Data brokers must process consumer DROP deletion requests every 45 days, completing determinations within 90 days.
  - **January 1, 2028**: First independent compliance audit (recurring every three years).
- Penalties: $200/day for failure to register; $200 per deletion request per day of non-compliance.
- The CPPA launched a "Data Broker Strike Force" for active enforcement.
- SB 361 (2025) expanded disclosure requirements to include sensitive data types (sexual orientation, union membership, citizenship, mobile advertising IDs).

**New State Privacy Laws Taking Effect**
- Several new states took effect since the baseline was compiled:
  - Indiana INPA (January 1, 2026)
  - Kentucky KCDPA (January 1, 2026)
  - Rhode Island RIDPA (January 1, 2026)
- These were already listed in the existing research document.

**Colorado AI Act (SB 24-205) -- Delayed to June 30, 2026**
- Originally set for February 1, 2026, now delayed to June 30, 2026.
- Requires formal impact assessments for any AI system used in "consequential decisions" including housing.
- AI systems that evaluate rental applications, generate tenant scores, or recommend approval/denial are explicitly classified as "high-risk."
- Developers must notify the Colorado AG and all known deployers within 90 days of discovering algorithmic discrimination.
- A Colorado AI Policy Work Group proposed an updated framework in March 2026 that may further modify requirements.

### Impact on Parcel

**Skip Tracing Data**
- The California Delete Act is the most significant new risk. If Parcel's skip tracing data providers are classified as "data brokers" (likely), they must register and process DROP requests. Parcel itself may be classified as a data broker if it collects and provides access to personal information about consumers with whom it has no direct relationship.
- The $200/day/request penalty structure creates substantial financial exposure.

**Automated Decision-Making**
- If Parcel builds any features that automatically score, filter, or prioritize leads/contacts/tenants, the new CCPA automated decision-making rules may apply, requiring opt-out mechanisms and human oversight.

**Colorado AI Act**
- If Parcel offers AI-powered tenant screening or lead scoring features to Colorado users, it must complete impact assessments and implement risk management frameworks before the June 30, 2026 effective date.

### Recommended Actions

1. **Assess whether Parcel qualifies as a "data broker"** under the California Delete Act. If yes, register by next annual deadline and budget for DROP compliance.
2. **Review skip tracing data providers'** Delete Act compliance status.
3. **Add opt-out confirmation** to the privacy workflow (new CCPA requirement).
4. **If building AI-powered features**: plan for Colorado AI Act compliance before June 30, 2026, including impact assessments.
5. **Monitor the Colorado AI Policy Work Group** proposals for framework changes.

---

## 8. CAN-SPAM

**Status: NO CHANGE**

### What Changed

No substantive changes to the CAN-SPAM Act have been enacted in 2025-2026. The core requirements remain unchanged since the law's original 2003 enactment and subsequent amendments:

- Accurate sender information ("From," "To," "Reply-To" fields).
- Subject lines that reflect email content.
- Disclosure that email is an advertisement (unless recipient opted in).
- Physical postal address included.
- Clear opt-out mechanism honored within 10 business days.
- Penalties up to $50,120 per non-compliant email (adjusted for inflation).

State-specific email marketing regulations may layer additional requirements but no new state laws targeting real estate email marketing were identified.

### Impact on Parcel

No new compliance obligations. Existing CAN-SPAM compliance features (opt-out handling, sender identification, physical address) remain sufficient.

### Recommended Actions

1. **No action required** beyond maintaining current compliance features.
2. **Ensure penalty amounts** referenced in user education materials reflect the current $50,120 figure (inflation-adjusted).

---

## 9. Fair Housing -- AI-Powered Real Estate Tools

**Status: UPDATED -- NEW RISK (Colorado AI Act)**

### What Changed

**HUD Guidance (May 2024)**
- The existing research document accurately captures HUD's 2024 guidance on Fair Housing Act application to AI-powered tenant screening and advertising. No new HUD guidance has been issued since.

**AI Chatbot Testing -- Emerging Risk**
- Advocacy organizations are now examining how AI chatbots and automated leasing tools respond to prospective tenants, including questions about housing vouchers, screening criteria, and availability.
- The barrier to fair housing testing of AI tools is much lower than traditional in-person testing -- chatbot interactions can be conducted remotely, quickly, and anonymously.
- This creates a new enforcement vector: fair housing testers can systematically probe AI-powered tools for discriminatory responses.

**Colorado AI Act (SB 24-205) -- Effective June 30, 2026**
- This is the most significant new development for AI in housing.
- AI systems used in housing decisions (tenant screening, application scoring, pricing) are classified as "high-risk."
- **Deployer obligations**: Implement risk management policy aligned to NIST AI RMF or ISO 42001; complete impact assessments before deployment and annually thereafter; notify consumers when AI is used in consequential decisions; provide opt-out or appeal mechanisms.
- **Developer obligations**: Complete and annually update impact assessments covering purpose, intended use cases, known risks, limitations, data inputs/outputs, performance metrics, and transparency measures.
- **Discrimination discovery**: If algorithmic discrimination is discovered, developers must notify the Colorado AG and all known deployers within 90 days.
- The Colorado AI Policy Work Group proposed an updated framework in March 2026 -- this may modify requirements before the June 30 effective date.

### Impact on Parcel

- If Parcel builds AI-powered features for tenant screening, lead scoring, or property valuation that are used by Colorado deployers, it may qualify as both a "developer" AND a "deployer" of high-risk AI systems.
- Fair housing testing of any AI chatbot or automated outreach features is now significantly easier and cheaper for advocacy organizations. Any discriminatory outputs from AI tools could generate both HUD complaints and state enforcement actions.
- The Colorado AI Act creates the first state-level legal framework specifically requiring impact assessments for AI in housing.

### Recommended Actions

1. **If building AI features for tenant screening**: Complete a Colorado AI Act impact assessment before June 30, 2026.
2. **If building AI chatbot features**: Test extensively for fair housing compliance, including scenarios involving protected classes, housing vouchers, and disability accommodations.
3. **Document all AI decision-making logic** with explainability for regulatory review.
4. **Monitor the Colorado AI Policy Work Group** -- the framework may change before the effective date.
5. **Consider implementing AI audit logging** that records inputs, outputs, and decision factors for all AI-powered features.

---

## Summary Matrix

| Topic | Status | Urgency | Key Change |
|-------|--------|---------|------------|
| TCPA | UPDATED | HIGH | One-to-one consent rule struck down; McLaughlin shifts power to courts; consent revocation delayed to Jan 2027; litigation surge continues |
| State Wholesaling | NO CHANGE | LOW | All 2025 laws already captured; CT (July 2026) is next deadline |
| App Store Policies | UPDATED | MEDIUM | New AI data sharing disclosure rule (5.1.2(i)); age verification laws; WebView clarification |
| iOS Payments | UPDATED | HIGH | External links allowed but appeals court approved "reasonable commission" (amount TBD); commission-free window exists NOW |
| A2P 10DLC | UPDATED | MEDIUM | Full blocking active since Feb 2025; blacklisting risk for violations; TX/VA state-specific layers |
| Connor v. Woosender | UPDATED | MEDIUM | Case proceeding past motion to dismiss; new related filing (Connor v. Accident LLC, Feb 2026) |
| CCPA / Privacy | UPDATED | HIGH | New CCPA automated decision-making rules; California Delete Act DROP platform (Aug 2026); Colorado AI Act (June 2026) |
| CAN-SPAM | NO CHANGE | LOW | No substantive changes; penalties adjusted to $50,120/email |
| Fair Housing / AI | UPDATED | MEDIUM | AI chatbot testing emerging as enforcement vector; Colorado AI Act requires housing AI impact assessments by June 2026 |

---

## Sources

- [NCLC -- Top Six TCPA/Robocall Developments in 2024/2025](https://library.nclc.org/article/top-six-tcparobocall-developments-20242025)
- [FCC -- TCPA Applies to AI Technologies](https://www.fcc.gov/document/fcc-confirms-tcpa-applies-ai-technologies-generate-human-voices)
- [Nixon Peabody -- FCC Partially Delays TCPA Consent Revocation Rules](https://www.nixonpeabody.com/insights/alerts/2025/04/11/fcc-partially-delays-new-tcpa-consent-revocation-rules)
- [Wiley -- FCC Extends Limited Waiver for TCPA Consent Revocation Rule](https://www.wiley.law/alert-FCC-Extends-Limited-Waiver-for-Part-of-the-TCPA-Consent-Revocation-Rule)
- [Auto Interview AI -- AI Calling Compliance Guide 2026](https://www.autointerviewai.com/blog/ai-calling-compliance-guide-2026-fcc-tcpa-global-regulations)
- [Corporate Compliance Insights -- How 2025 Redefined Telemarketing Compliance](https://www.corporatecomplianceinsights.com/how-2025-redefined-telemarketing-compliance/)
- [Adams and Reese -- FCC One-to-One Consent Rule Struck Down](https://www.adamsandreese.com/insights/fcc-one-to-one-consent-rule-struck-down)
- [Morrison Foerster -- Eleventh Circuit Vacates FCC's TCPA One-to-One Consent Rule](https://www.mofo.com/resources/insights/250130-eleventh-circuit-vacates-fcc-s-tcpa-one-to-one-consent-rule)
- [FKKS -- TCPA in Turmoil: Supreme Court Shifts Power from FCC to Courts](https://technologylaw.fkks.com/post/102kq0f/tcpa-in-turmoil-supreme-court-shifts-power-from-fcc-to-courts)
- [NCLC -- Supreme Court TCPA Ruling Restricts FCC's Power](https://library.nclc.org/article/supreme-court-tcpa-ruling-restricts-fccs-power)
- [Sidley -- Maryland District Court Relies on Loper Bright](https://www.sidley.com/en/insights/newsupdates/2026/03/maryland-district-court-relies-on-loper-bright-to-hold-written-consent-for-telemarketing-calls)
- [National Law Review -- Court Refuses to Dismiss Woosender from TCPA Class Action](https://natlawreview.com/article/platform-liabile-illegal-calls-court-refuses-dismiss-woosender-tcpa-class-action)
- [Leonine Public Affairs -- New State Laws for Real Estate Wholesaling in 2025](https://leoninepublicaffairs.com/new-state-laws-for-real-estate-wholesaling-in-2025/)
- [Real Estate Skills -- Is Wholesaling Real Estate Legal? (2026)](https://www.realestateskills.com/blog/wholesaling-real-estate-legal)
- [MacRumors -- Apple Wins Ability to Charge Fees on External Payment Links](https://www.macrumors.com/2025/12/11/apple-app-store-fees-external-payment-links/)
- [RevenueCat -- Apple Anti-Steering Ruling Monetization Strategy](https://www.revenuecat.com/blog/growth/apple-anti-steering-ruling-monetization-strategy/)
- [Median -- Epic v. Apple Payment Links Ruling Explained](https://median.co/blog/epic-v-apple-payment-links-ruling-explained)
- [Neon Pay -- Apple App Store Alternative Payment Fees 2026](https://www.neonpay.com/blog/apple-app-store-alternative-payment-fees-what-developers-pay-in-2026)
- [TechCrunch -- Apple's New App Review Guidelines Clamp Down on Third-Party AI](https://techcrunch.com/2025/11/13/apples-new-app-review-guidelines-clamp-down-on-apps-sharing-personal-data-with-third-party-ai/)
- [Apten -- A2P 10DLC Compliance in 2026](https://www.apten.ai/blog/a2p-dlc-compliance-2026)
- [CallHub -- 10DLC 2025 Registration](https://callhub.io/blog/compliance/10dlc-2025-registration-callhub/)
- [Inside Privacy -- California Finalizes Updates to Existing CCPA Regulations](https://www.insideprivacy.com/state-privacy/california-finalizes-updates-to-existing-ccpa-regulations/)
- [California Lawyers Association -- New CCPA Requirements for 2026](https://calawyers.org/intellectual-property-law/new-ccpa-requirements-for-2026/)
- [BDO -- CCPA Updates and New State Privacy Laws for 2026](https://www.bdo.com/insights/advisory/2026-is-a-pivotal-year-for-privacy)
- [IAPP -- New Year, New Rules: US State Privacy Requirements for 2026](https://iapp.org/news/a/new-year-new-rules-us-state-privacy-requirements-coming-online-as-2026-begins)
- [Troutman Pepper -- Analyzing the California Delete Act Regulations](https://www.troutmanprivacy.com/2025/12/analyzing-the-california-delete-act-regulations/)
- [Crowell -- California Privacy Agency Launches Data Broker Strike Force](https://www.crowell.com/en/insights/client-alerts/california-privacy-agency-launches-data-broker-strike-force-amid-delete-act-crackdown)
- [Clark Hill -- Is Your Business a Data Broker? California's DROP Goes Live](https://www.clarkhill.com/news-events/news/is-your-business-a-data-broker-californias-drop-goes-live-and-calprivacy-continues-to-enforce-delete-act/)
- [KPMG -- Colorado AI Act (SB 205) Compliance Guide](https://kpmg.com/us/en/articles/2024/ai-regulation-colorado-artificial-intelligence-act-caia-reg-alert.html)
- [Hudson Cook -- Colorado AI Law Delayed to June 2026](https://www.hudsoncook.com/article/colorado-special-session-update-ai-law-delayed-to-june-2026-what-the-rental-housing-and-financial-services-industries-can-do-next/)
- [Mayer Brown -- Colorado AI Policy Work Group Proposes Updated Framework](https://www.mayerbrown.com/en/insights/publications/2026/03/the-colorado-ai-policy-work-group-proposes-an-updated-framework-to-replace-the-colorado-ai-act)
- [Spencer Fane -- Fair Housing Risk: AI Chatbots and Early-Stage Applicant Interactions](https://www.spencerfane.com/insight/the-next-frontier-of-fair-housing-risk-ai-chatbots-and-early-stage-applicant-interactions/)
- [HUD -- Fair Housing Act Guidance on AI](https://archives.hud.gov/news/2024/pr24-098.cfm)
- [FTC -- CAN-SPAM Act Compliance Guide](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business)
- [Privacy & Data Security Insights -- New App Store Accountability Laws in 2026](https://www.privacyanddatasecurityinsight.com/2025/12/new-app-store-accountability-laws-in-2026-if-your-business-has-an-app-read-on/)
