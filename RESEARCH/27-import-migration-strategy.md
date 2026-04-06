# Import / Migration Strategy

Date: 2026-04-02

Research question:
- What migration expectations do Parcel's target users bring from existing tools?
- What should Parcel import first to reduce switching risk and accelerate activation?
- How should Parcel structure migration so users can replace tools progressively rather than through a risky big-bang cutover?

Inputs used:
- `SAD/personas/02-desiree-solo-wholesaler.md`
- `SAD/personas/07-tamara-hybrid-investor.md`
- `SAD/personas/08-james-agent-serving-investors.md`
- `RESEARCH/22-competitive-journey-teardowns.md`
- `RESEARCH/21-portfolio-lite-boundary-definition.md`
- `SAD/current-state-audit.md`
- Fresh external research on Follow Up Boss, FreedomSoft, DealMachine, Stessa, and Baselane import/export patterns

## Executive Verdict

Migration is not onboarding garnish.

It is a core product surface.

Parcel will win migrations only if it preserves context, not just records.

That means Parcel must import:

- people
- properties / deals
- notes and history
- tags and stages
- portfolio transactions where relevant
- source provenance

It also means Parcel should support phased migration.

The correct promise is not:

- "move your whole business in one click"

The correct promise is:

- "start getting value immediately, migrate safely in layers, and keep your historical context intact"

## Why This Matters for Parcel

Tamara's displacement sequence already points to the right model:

1. replace DealCheck and spreadsheets
2. replace Stessa
3. evaluate comms vs REsimpli
4. replace field notes later

That is not a bug.
That is how serious operators adopt new platforms.

James and Desiree behave similarly:

- they want proof first
- then selective migration
- then full replacement after trust is earned

Parcel should design for progressive displacement, not demand all-or-nothing switching on day one.

## What External Products Reveal

## 1. Follow Up Boss treats imports as structured data mapping, but with clear limits

Follow Up Boss currently supports:

- CSV contact import
- field mapping
- assigned agent and stage mapping
- tags on import
- custom fields
- contact notes import

It also clearly documents limits:

- no task import
- no appointment import
- no deal import

It preserves imperfect mappings using tags such as imported agent or imported stage when exact matches fail.

Sources:
- https://help.followupboss.com/hc/en-us/articles/4402323033751-Importing-Contacts-Overview
- https://help.followupboss.com/hc/en-us/articles/14529175079447-Importing-Contact-Note-Files-Overview
- https://help.followupboss.com/hc/en-us/articles/360015269133-Export-Contacts-to-a-Spreadsheet

Lesson:
- users accept migration limits if the product is explicit
- preserving meaning via tags is better than dropping data
- notes are critical migration material

## 2. FreedomSoft separates imports by business object

FreedomSoft distinguishes:

- seller leads
- buyer prospects
- active buyers
- contacts

Its import flow emphasizes:

- CSV file preparation
- destination object selection
- field mapping
- preview before import
- permissions / automation choices at list creation

Sources:
- https://helpdesk.freedomsoft.com/hc/en-us/articles/360020971653-How-to-Import-Prospects-Leads-Buyers-and-Contacts-into-FreedomSoft

Lesson:
- business-object-aware imports reduce ambiguity
- different record types should not be forced through one generic wizard

## 3. DealMachine shows the importance of resilient bulk import and rich export

DealMachine currently supports:

- CSV / XLSX imports
- auto-mapping
- multiple address formats
- import troubleshooting
- export of properties or contacts
- selective export columns
- over 200 data points in exports
- note export via `recent_note`

Sources:
- https://help.dealmachine.com/en/articles/6109824-how-to-import-upload-your-leads-list-into-dealmachine
- https://help.dealmachine.com/en/articles/10768882-importing-tips-and-tricks
- https://help.dealmachine.com/en/articles/1905945-how-can-i-export-my-leads
- https://help.dealmachine.com/en/articles/1893417-how-to-add-notes

Lesson:
- import quality depends heavily on address normalization
- users care about exporting rich context, not just raw rows
- note preservation matters

## 4. Stessa and Baselane show that portfolio migrations are transaction migrations

Stessa supports:

- CSV / QIF / QFX / OFX upload
- property assignment during or after upload

Baselane supports:

- CSV transaction import
- templates
- required field mapping
- property mapping where possible

Sources:
- https://support.stessa.com/en/articles/3840221-transactions-explained
- https://support.stessa.com/en/articles/2410934-how-to-upload-transaction-data
- https://support.baselane.com/hc/en-us/articles/30325548750619-Can-I-import-CSV-files-into-Baselane

Lesson:
- portfolio migration is not just "add properties"
- it is "bring the property plus its financial history"

## Recommended Parcel Migration Model

## 1. Design migration around phases, not one wizard

Parcel should support five migration tracks:

1. contacts / buyers / clients
2. deals / properties / pipeline
3. notes / history / documents
4. analysis assumptions / legacy spreadsheets
5. portfolio transactions / leases / obligations

Users should be able to stop after any phase and still get value.

That is the right shape for progressive replacement.

## 2. Prioritize "context retention" fields

The minimum high-value import set is not just name and address.

For CRM migration, Parcel should preserve:

- source system
- original stage / status
- tags
- assigned owner
- notes
- recent activity date
- next follow-up date if present
- property linkage
- buyer / seller type if known

For buyer data, Parcel should preserve:

- tags
- market
- criteria / buy box signals where available
- notes on responsiveness

For portfolio/accounting data, Parcel should preserve:

- transaction date
- amount
- category
- property / unit association
- memo / description
- external account name if available

## 3. Use source-preserving imports rather than pretending fields map perfectly

Parcel should not silently flatten everything.

If a source field does not map cleanly, Parcel should:

- preserve it in raw metadata
- optionally append it to notes
- or create a clearly named imported custom field

This is better than irreversible data loss.

Examples:

- imported stage
- imported owner / agent
- imported campaign name
- imported recent note

## 4. Offer migration playbooks by persona and source stack

Parcel should not present one generic migration screen to everyone.

Recommended playbooks:

- `REsimpli -> Parcel`
- `Follow Up Boss + DealCheck -> Parcel`
- `DealMachine -> Parcel`
- `Stessa / Baselane -> Parcel`
- `Spreadsheet-first -> Parcel`

Each playbook should state:

- what imports cleanly
- what needs review
- what does not import yet
- the recommended replacement order

This reduces perceived switching risk.

## 5. Support parallel-run without guilt

Serious users will run Parcel beside the incumbent system first.

Parcel should explicitly support that with:

- imported-as-read-only history where needed
- source tags
- duplicate detection
- reminders to complete later migration steps

This is especially important for comms-heavy users who will not trust a same-day cutover.

## Recommended Build Order

## Phase 1: High-confidence, high-value imports

- contacts
- buyers
- properties / deal addresses
- notes
- tags
- stages

This unlocks James and Desiree fastest.

## Phase 2: Analysis continuity

- import spreadsheet templates or CSV deal assumptions
- preserve source calculations as attachments or legacy snapshots
- allow side-by-side recreation in Parcel

This helps convert DealCheck / spreadsheet users without pretending perfect formula conversion.

## Phase 3: Portfolio continuity

- property import
- transaction import
- lease summary import
- obligations import where possible

This unlocks Tamara and portfolio-lite users.

## Phase 4: Advanced migration helpers

- dedupe assistant
- source-specific CSV templates
- import health report
- automatic suggestions for next cleanup step

## What Parcel Should Not Promise

## 1. Do not promise perfect cross-tool migration on day one

Especially for:

- drip campaign logic
- phone / SMS deliverability history
- tasks and appointment objects
- proprietary formulas hidden in spreadsheets

Users will forgive limits.
They will not forgive false claims.

## 2. Do not treat unsupported data as disposable

If Parcel cannot natively use something yet, it should still preserve it in the record whenever possible.

## 3. Do not force migration before value

Parcel's best activation remains:

- enter an address
- get analysis
- see why the product is better

Migration should reinforce that value, not block it.

## Product Implications

Parcel should add:

- source-specific import playbooks
- object-specific import flows
- mapping preview and validation
- raw-field preservation for unmapped data
- source tags / provenance metadata
- phased migration dashboard
- import health summary and error reporting

Strong follow-on capabilities:

- dedupe merge queue
- re-run import from same source file
- import templates for common competitors
- "parallel-run checklist" by persona

## Strategic Conclusion

Parcel does not need to win by promising magical migration.

It needs to win by making migration feel:

- safe
- reversible in spirit
- respectful of history
- incremental

If Parcel preserves user context well, it can displace tool stacks in phases.
That is a much more believable and effective switching strategy.

## Sources

- https://help.followupboss.com/hc/en-us/articles/4402323033751-Importing-Contacts-Overview
- https://help.followupboss.com/hc/en-us/articles/14529175079447-Importing-Contact-Note-Files-Overview
- https://help.followupboss.com/hc/en-us/articles/360015269133-Export-Contacts-to-a-Spreadsheet
- https://helpdesk.freedomsoft.com/hc/en-us/articles/360020971653-How-to-Import-Prospects-Leads-Buyers-and-Contacts-into-FreedomSoft
- https://help.dealmachine.com/en/articles/6109824-how-to-import-upload-your-leads-list-into-dealmachine
- https://help.dealmachine.com/en/articles/10768882-importing-tips-and-tricks
- https://help.dealmachine.com/en/articles/1905945-how-can-i-export-my-leads
- https://help.dealmachine.com/en/articles/1893417-how-to-add-notes
- https://support.stessa.com/en/articles/3840221-transactions-explained
- https://support.stessa.com/en/articles/2410934-how-to-upload-transaction-data
- https://support.baselane.com/hc/en-us/articles/30325548750619-Can-I-import-CSV-files-into-Baselane
