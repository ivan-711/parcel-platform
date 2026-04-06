# AI Trust and Explanation Design Research

Date: 2026-04-02

Research question:
- How should Parcel's AI present analysis so users trust it enough to act?
- What should differ between beginner and experienced users?
- How should Parcel express uncertainty, rationale, and correction paths without feeling like a generic chatbot?

Inputs used:
- `RESEARCH/00-MASTER-RESEARCH-SYNTHESIS.md`
- `RESEARCH/06-vector-db-rag.md`
- `SAD/current-state-audit.md`
- `SAD/personas/01-marcus-complete-beginner.md`
- `SAD/personas/02-desiree-solo-wholesaler.md`
- `SAD/personas/04-angela-buy-hold-landlord.md`
- `SAD/personas/06-carlos-creative-finance.md`
- `SAD/personas/07-tamara-hybrid-investor.md`
- `SAD/personas/08-james-agent-serving-investors.md`
- Fresh external research on Microsoft Human-AI guidelines, Google PAIR, NIST explainable AI principles, and OpenAI uncertainty research

## Executive Verdict

Parcel should not try to earn trust with personality.

Parcel should earn trust with:
- calibrated claims
- clear rationale
- editable assumptions
- visible data sources
- persona-appropriate explanation depth
- easy correction

The right design pattern is:

- AI as the platform's analytical voice
- chat as an optional drill-down surface

The wrong pattern is:

- AI as a free-floating chatbot that produces confident prose disconnected from assumptions and evidence

## What Trust Means in Parcel's Context

Trust in Parcel is not generic "I like the AI."

It is:
- "I believe these numbers enough to make a decision"
- "I can see why the system said this"
- "I can correct it quickly if one assumption is wrong"
- "It knows when to be confident and when to hedge"
- "It doesn't talk down to me or bluff"

That is a much higher bar than conversational helpfulness.

## Persona Evidence

### Marcus needs confidence-building explanation

Marcus's trust problem is not math literacy. It is:
- assumption uncertainty
- fear of missing something important
- fear of acting on bad numbers

His persona explicitly values:
- explanations in context
- definitions inline
- normalized uncertainty
- "here's what this means for you"

For Marcus, AI trust grows when the system:
- catches something he would have missed
- explains why it matters
- shows the impact on the deal
- suggests a concrete next move

### Angela needs plain language without hype

Angela is experienced enough to reject oversimplification, but new enough to creative finance that she still needs:
- plain-language structure explanations
- concise interpretation
- time-respecting tone

### Desiree needs relevance and accuracy, not generic narration

Her persona explicitly says:
- if AI insights feel generic or wrong, trust is lost
- one bad ARV or rent suggestion can poison the feature permanently

She needs:
- conservative estimates
- visible sources
- override paths

### Tamara, Carlos, James need analyst mode

These personas do not want a tutor.

Tamara wants:
- strategic-peer framing
- comparative trade-offs
- capital-aware conclusions

Carlos wants:
- operational shorthand
- zero hand-holding
- no false negatives

James wants:
- something like a sharp junior analyst
- concise, metrics-forward findings
- formula and methodology transparency because one bad number breaks credibility

## External Research: What Good AI Trust Design Requires

### 1. Expectation-setting matters before the first answer

Microsoft Research's human-AI guidelines explicitly recommend:
- make clear what the system can do
- make clear how well the system can do what it can do

They also emphasize:
- contextually relevant information
- easy correction when wrong
- scoping down when uncertain
- making clear why the system did what it did

Sources:
- https://www.microsoft.com/en-us/research/articles/guidelines-for-human-ai-interaction-eighteen-best-practices-for-human-centered-ai-design/

### 2. Explanations should help decisions, not attempt full transparency theater

Google PAIR's guidebook is especially relevant for Parcel.

Key guidance:
- show model confidence only if it is genuinely helpful
- avoid numeric confidence when it is hard to interpret
- provide recourse when the system is less than fully confident
- explain for understanding, not completeness
- expose the aspects that impact trust and decision-making
- move deeper system explanations outside the active flow

Sources:
- https://pair.withgoogle.com/guidebook-v2/patterns

### 3. Uncertainty should be verbalized and actionable, not hidden

OpenAI research found models can express calibrated uncertainty in natural language.

This is important for Parcel because:
- users do not need fake precision
- they need to know how much to rely on a claim
- they need to know what to verify next

Source:
- https://openai.com/index/teaching-models-to-express-their-uncertainty-in-words/

### 4. Explainable AI needs both meaning and limits

NIST's explainable AI framing is still useful here.

Its four principles are:
- explanation
- meaningful explanation
- explanation accuracy
- knowledge limits

That maps almost perfectly to Parcel:
- explain the claim
- explain it in user-relevant language
- make sure the explanation reflects the real logic
- acknowledge what the system does not know

Source:
- https://nvlpubs.nist.gov/nistpubs/ir/2022/NIST.IR.8423.pdf

## Recommended Trust Model for Parcel

## 1. Separate facts, estimates, and recommendations

Parcel should visibly distinguish between:

### Facts

Examples:
- address
- year built
- lot size
- recorded sale date
- lease expiration date

### Estimates

Examples:
- rent estimate
- ARV
- repair cost
- market value
- refinance proceeds

### Recommendations

Examples:
- "Wholesale is the safer exit"
- "Start refi prep this week"
- "Increase CapEx reserve"

Why this matters:
- users forgive an estimate being rough more than they forgive a fact being wrong
- users forgive a recommendation they disagree with if the rationale is visible
- they do not forgive hidden category mixing

## 2. Use layered explanations

Every major AI output should have five layers:

1. `Conclusion`
2. `Why`
3. `What to do next`
4. `Assumptions and confidence`
5. `Edit / verify / drill down`

Example:

- Conclusion: "This is a marginal BRRRR unless rehab stays under $42K."
- Why: "Projected DSCR after refi is thin, and current rent support is moderate, not strong."
- What to do next: "Stress-test at $1,550 rent and add a 10% rehab contingency."
- Assumptions and confidence: "Rent estimate uses 7 nearby comparables; medium confidence due to limited renovated rentals in radius."
- Edit / verify / drill down: `Adjust rent`, `Adjust rehab`, `View comps`

## 3. Prefer confidence bands and reasons over raw percentages

For most Parcel use cases, `High / Moderate / Low confidence` is better than `82% confidence`.

Good:
- `High confidence: lease expiration pulled from entered lease`
- `Moderate confidence: rent estimate based on 7 nearby comps`
- `Low confidence: repair estimate inferred without interior photos`

Bad:
- `83% confidence`

Why:
- Google PAIR explicitly warns that numeric confidence is often hard to interpret
- a number without context feels scientific but does not help a decision

Exception:
- ranges are useful for economic outputs
- example: rent range, ARV range, payoff estimate range

## 4. Make uncertainty productive

When the system is uncertain, it should not just hedge. It should redirect the user toward the next best action.

Good:
- "Repair estimate is low confidence because there are no interior photos. Upload inspection photos or set a manual rehab budget before trusting the flip margin."

Bad:
- "This may be inaccurate."

## 5. Make correction cheap

Trust grows when correction is easy.

Parcel should support:
- one-click assumption overrides
- instant recalculation
- "tell us what changed" feedback
- source switching when available
- user-set defaults by market or strategy

This aligns directly with Microsoft's guidance around efficient correction.

## How Explanation Depth Should Adapt by Persona

## Beginner mode

Used for:
- Marcus
- Angela in new creative-finance contexts

Characteristics:
- define terms inline
- explain why each variable matters
- lead with one recommended path
- normalize uncertainty
- include stress-test suggestions

## Experienced mode

Used for:
- Desiree
- Ray
- Tamara
- Carlos
- James

Characteristics:
- no definitions
- lead with the conclusion
- highlight non-obvious drivers
- compare alternatives
- reference capital, timeline, and risk
- keep prose tight

## Dynamic adaptation

Parcel should not only rely on signup persona.

It should adapt based on:
- chosen experience level
- strategy familiarity
- whether the user expands deeper explanations
- whether the user repeatedly overrides assumptions

Example:
- Angela may want plain language on seller finance but not on conventional rentals

## Recommended AI Surface Patterns

## 1. Inline analysis cards, not just chat

Primary AI surfaces should be:
- deal narration
- property risk summary
- morning briefing items
- scenario comparison summary
- document issue summaries
- portfolio / obligation alerts

Chat should remain available for:
- "what if?" exploration
- document Q&A
- follow-up questions

## 2. Show sources and freshness where it matters

For high-consequence outputs, show:
- source type
- source count where relevant
- last refresh
- whether the value was user-entered, imported, or inferred

Examples:
- "Rent estimate based on 7 nearby rentals, refreshed today"
- "Lease expiration from user-entered lease document"
- "Repair estimate inferred from public data only"

## 3. Publish methodology, but outside the main flow

James's persona is right: one error can erode trust.

Parcel should provide:
- calculator methodology pages
- formula breakdowns
- assumption glossary
- model notes

But this should live behind:
- `How this was calculated`
- `View methodology`

Do not dump it into every primary output.

That matches Google PAIR's recommendation to explain for understanding, not completeness.

## 4. Avoid advisor language

Parcel should sound like an analyst, not a financial advisor or hype salesperson.

Preferred phrasing:
- "The data suggests..."
- "Based on your inputs..."
- "This scenario becomes risky if..."
- "Recommend verifying..."

Avoid:
- "You should definitely..."
- "This is a no-brainer..."
- "Guaranteed..."

## Failure Modes Parcel Must Avoid

### 1. Confidently wrong singular numbers

Bad:
- one precise ARV with no range, no comps context, and no edit path

### 2. Generic narration

If the text sounds interchangeable across deals, power users will mentally classify it as marketing copy.

### 3. Hidden assumptions

If the system changes vacancy, rehab, CapEx, rent, or financing assumptions without showing that clearly, users will distrust all downstream outputs.

### 4. Over-explaining everything

Too much explanation is its own trust failure.
It signals:
- the system is compensating
- the user is not respected
- the output is not operational

### 5. No graceful fallback when uncertain

When the model is weakly grounded, it should:
- ask for clarification
- narrow scope
- lower confidence
- suggest verification

Not bluff.

## Product Implications for Parcel

1. AI should be redesigned as a system layer, not primarily a `/chat` page.

2. Every important AI output should include:
- rationale
- confidence reason
- assumption visibility
- correction path

3. Persona calibration should affect:
- verbosity
- terminology
- default recommendation style
- whether to show definitions inline

4. Confidence should usually be verbal and reasoned, not numeric.

5. For high-stakes operational items like creative-finance monitoring, do not let AI-generated wording obscure the underlying deterministic event. Example:
- "Payment not verified" should remain a hard state
- the AI layer should interpret the risk, not replace the state

## Bottom-Line Recommendation

Parcel should build trust by making AI feel like:
- a disciplined analyst
- attached to real records
- honest about uncertainty
- easy to correct
- adapted to the user's actual sophistication

If Parcel gets this right, the AI becomes the product's strongest differentiator.

If Parcel gets it wrong, it becomes the first thing serious users disable.

## Sources

External:
- https://www.microsoft.com/en-us/research/articles/guidelines-for-human-ai-interaction-eighteen-best-practices-for-human-centered-ai-design/
- https://pair.withgoogle.com/guidebook-v2/patterns
- https://openai.com/index/teaching-models-to-express-their-uncertainty-in-words/
- https://nvlpubs.nist.gov/nistpubs/ir/2022/NIST.IR.8423.pdf

Internal:
- `SAD/personas/01-marcus-complete-beginner.md`
- `SAD/personas/02-desiree-solo-wholesaler.md`
- `SAD/personas/04-angela-buy-hold-landlord.md`
- `SAD/personas/06-carlos-creative-finance.md`
- `SAD/personas/07-tamara-hybrid-investor.md`
- `SAD/personas/08-james-agent-serving-investors.md`
- `SAD/current-state-audit.md`
- `RESEARCH/06-vector-db-rag.md`
