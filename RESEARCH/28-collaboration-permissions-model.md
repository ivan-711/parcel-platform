# Collaboration / Permissions Model

Date: 2026-04-02

Research question:
- How should Parcel evolve from solo-first into team-ready without becoming enterprise software?
- What permission patterns work in adjacent products for investor teams, assistants, and external collaborators?
- Which collaboration model best fits Parcel's current schema and persona mix?

Inputs used:
- `SAD/personas/07-tamara-hybrid-investor.md`
- `SAD/personas/08-james-agent-serving-investors.md`
- `SAD/personas/02-desiree-solo-wholesaler.md`
- `SAD/personas/00-persona-synthesis.md`
- `SAD/current-state-audit.md`
- `backend/models/team_members.py`
- Fresh external research on Follow Up Boss, FlipperForce, REsimpli pricing, and current team / access-control patterns

## Executive Verdict

Parcel should not stay single-user in product design.

But it also should not ship an enterprise RBAC maze.

The right model is:

- solo-first by default
- role presets for most teams
- object-level visibility underneath
- safe external sharing through report links, not full seats, in early phases

This fits both:

- the current codebase, which already has `team_id` and team-member tables
- the product vision, which is solo-first but team-ready from day one

## What the Repo Already Suggests

The current state audit correctly notes:

- `team_id` already exists
- team / member tables already exist
- team-ready schema is visible

That is useful.

It means the product should stop pretending collaboration is a future architectural concern.
The architecture seed is already there.

What Parcel still needs is the actual product model around it.

## Why This Matters by Persona

## Tamara

Tamara's persona explicitly expects team expansion.
One of her conversion triggers is hiring a full-time VA and needing team seats, permissions, and task delegation.

That means Parcel needs to support:

- delegation
- selective visibility
- shared operating rhythm

## James

James is solo today, but one of his biggest pains is that his client intelligence lives in his head.
That makes onboarding an assistant or VA almost impossible.

A collaboration model would let him:

- assign follow-ups
- preserve institutional memory
- keep analysis history searchable by team

## Desiree

Desiree is solo-first, but that does not mean "never team."
Wholesale operators often add:

- VA help
- acquisitions support
- dispositions help

Parcel should support that without forcing her into a heavy admin setup until she needs it.

## What External Products Reveal

## 1. Follow Up Boss uses role presets with clear power boundaries

Follow Up Boss currently supports roles such as:

- account owner
- admin
- agent
- lender

It also reserves specific permissions to the owner, including:

- billing management
- export contacts permission visibility
- custom stages / custom fields management

Sources:
- https://help.followupboss.com/hc/en-us/articles/4402370636567-Users-Roles-Permissions

Lesson:
- preset roles reduce confusion
- export and config permissions are sensitive and should be explicit

## 2. FlipperForce combines role ideas with granular project/tool access

FlipperForce's access-control model explicitly supports:

- workspace admins with full access
- non-admin access control across projects, tools, and features
- per-tool access restrictions

Its help center also makes clear:

- invited users may lack access to specific tools until an admin grants it
- project updates and status changes notify all team members

Sources:
- https://help.flipperforce.com/en/articles/8801815-user-management-access-control-overview
- https://help.flipperforce.com/en/articles/8801812-what-is-a-workspace-admin
- https://help.flipperforce.com/en/articles/8801817-looks-like-you-don-t-have-access-to-this-tool
- https://help.flipperforce.com/en/articles/10949571-what-are-project-stages-how-do-i-update-them-and-why-are-they-important
- https://help.flipperforce.com/en/articles/10949721-what-is-the-project-status-and-how-do-i-update-it

Lesson:
- project-level and tool-level access both matter
- notification behavior depends on collaboration model

## 3. REsimpli validates the demand for multi-seat teams, even if the public role model is simple

REsimpli's pricing emphasizes user counts by tier and paid additional users.

That confirms:

- team growth is real in this market
- seat management matters commercially

Source:
- https://resimpli.com/

Lesson:
- team readiness is not edge-case demand
- but seat count alone is not a permission model

## Recommended Parcel Collaboration Model

## 1. Use role presets for 90% of cases

Recommended initial workspace roles:

- `Owner`
- `Admin / Operator`
- `Analyst`
- `Assistant / VA`
- `Viewer`

Possible later specialist roles:

- `Acquisitions`
- `Dispositions`
- `Bookkeeper / Portfolio Ops`

But Parcel should not surface too many presets initially.

## 2. Back role presets with three permission layers

### Layer A: Workspace permissions

Examples:

- billing
- branding
- integrations
- team invites
- compliance settings
- exports

### Layer B: Tool / module permissions

Examples:

- communications
- skip tracing
- campaigns
- documents
- portfolio
- reports
- admin settings

### Layer C: Record visibility and action scope

Examples:

- view assigned only
- view team records
- edit assigned only
- edit all
- export all
- delete restricted

This is enough sophistication without turning the UI into policy software.

## 3. Make assignment a core primitive

Permissions only solve half the problem.

Parcel also needs:

- owner / assignee on contacts
- owner / assignee on deals
- task assignee
- clear "mine / team / unassigned" filters

This is the operational layer that makes team seats actually useful.

## 4. Keep external collaboration separate from internal seats

Parcel should not invite lenders, partners, or clients into full workspaces early unless there is a strong reason.

Instead:

- internal team = actual seats
- external parties = secure share links and exported deliverables

This is cleaner and safer.

It also matches actual workflows:

- James sends a report to a client
- Tamara sends a lender packet
- Carlos shares an obligation summary with a partner

Those are not internal-seat use cases.

## 5. Treat exports and communications as sensitive permissions

Based on adjacent products, Parcel should explicitly gate:

- mass export
- campaign sending
- document deletion
- compliance-sensitive actions

The goal is not bureaucracy.
It is preventing accidental risk.

## Recommended Role Behavior

## Owner

Can:

- do everything
- manage billing, seats, branding, exports, compliance, and integrations

## Admin / Operator

Can:

- manage most day-to-day operations
- view all team records
- assign work
- manage pipeline / property records

Cannot by default:

- change billing
- remove owner

## Analyst

Can:

- analyze deals
- update records
- create reports
- manage assumptions and notes

Cannot by default:

- manage campaigns
- edit workspace configuration
- export all data

## Assistant / VA

Can:

- update contacts and tasks
- add notes
- manage follow-ups
- perform structured data entry

Cannot by default:

- see every financial detail
- send campaigns without permission
- export data

## Viewer

Can:

- view allowed records and reports

Cannot:

- edit
- export
- send

## Product Implications

Parcel should add:

- role presets in the workspace model
- module-level capability flags
- record ownership / assignment primitives
- record-scope visibility rules
- audit trail on sensitive actions
- explicit export and campaign permissions

Strong follow-on features:

- activity feed by user
- assignment notifications
- "mention teammate" in notes and tasks
- approval gates for campaigns or sensitive sends

## What Parcel Should Not Do

## 1. Do not surface a giant permissions matrix as the default UI

That is the fastest way to make solo users feel like they bought enterprise software they do not need.

## 2. Do not treat external viewers as normal users yet

Client and lender collaboration should happen through deliverables and links first.

## 3. Do not wait too long to operationalize the existing team schema

The backend seed is already present.
Leaving it unused too long creates mismatch between architecture and product behavior.

## Strategic Conclusion

Parcel's collaboration model should feel like:

- a solo tool when you are solo
- an operating console when you add help

That means:

- easy role presets
- assignment everywhere
- selective permissions under the hood
- safe sharing outside the workspace

If Parcel gets this right, it can stay approachable for solo users while being structurally ready for teams.

## Sources

- https://help.followupboss.com/hc/en-us/articles/4402370636567-Users-Roles-Permissions
- https://help.flipperforce.com/en/articles/8801815-user-management-access-control-overview
- https://help.flipperforce.com/en/articles/8801812-what-is-a-workspace-admin
- https://help.flipperforce.com/en/articles/8801817-looks-like-you-don-t-have-access-to-this-tool
- https://help.flipperforce.com/en/articles/10949571-what-are-project-stages-how-do-i-update-them-and-why-are-they-important
- https://help.flipperforce.com/en/articles/10949721-what-is-the-project-status-and-how-do-i-update-it
- https://resimpli.com/
