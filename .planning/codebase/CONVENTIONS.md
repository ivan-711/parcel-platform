# Parcel Codebase Conventions

## Frontend conventions

### Patterns in use

- route pages are mostly self-contained and wrap themselves in `AppShell`
- API access is centralized in `frontend/src/lib/api.ts`
- React Query is the default server-state pattern
- Zustand is used for auth/billing local state
- UI primitives live under `frontend/src/components/ui/`

This is a decent pattern set.

### Styling conventions

- Tailwind utility classes dominate
- design tokens are centralized in `frontend/src/index.css`
- a custom luxury dark theme is the current visual default
- colors and tokens are semantically named enough to survive redesign work

### Friction points

- some pages are large and combine UI logic, query logic, and view composition heavily
- there are stale tests that assume old copy/class names
- there are unused imports/variables causing build failures
- product vocabulary in types and pages is now partially outdated

## Backend conventions

### Patterns in use

- routers define endpoints and often contain meaningful business logic
- SQLAlchemy models are simple and readable
- Pydantic schemas are separated cleanly
- helpers live under `backend/core/`

### Friction points

- business rules are not yet organized around durable domain services
- calculations are strategy-based modules, which is fine, but the object model around them is too thin
- some important rules are still implicit in routers
- there is no clear async/job boundary yet

## Testing conventions

- backend tests are meaningful and currently passing
- frontend tests exist but are brittle around UI details

This usually means:

- backend behavior is more trustworthy than frontend polish
- frontend refactors will keep breaking tests until test strategy is tightened

## Product conventions currently encoded in code

The code still assumes:

- plans are `free / starter / pro / team`
- AI is a gated module called `chat`
- portfolio is an add-on to closed deals
- documents are an AI upload feature, not a broader document/report system

Those are not just labels. They are conventions embedded in:

- types
- billing config
- nav
- page titles
- feature gates

## Convention verdict

The codebase has decent engineering conventions.

The bigger problem is product convention drift:

- old plan language
- old entity language
- old module boundaries

Those need to be intentionally rewritten, or the code will keep nudging the product back toward its old shape.
