## Required Skills (read in this order before any UI work)
1. /Users/ivanflores/parcel-platform/.claude/skills/ui-ux-pro-max/SKILL.md
2. Built-in frontend-design skill
If instructions conflict, ui-ux-pro-max wins.

# CLAUDE.md — Parcel Platform
> This file tells Claude Code exactly how to work on this project.
> Read this file completely before doing anything else.

---

## Project Overview

**Parcel** is a nationwide SaaS platform for real estate professionals.  
**Repo:** ivan-711/parcel-platform  
**Frontend:** React + TypeScript + Vite → deployed on Vercel  
**Backend:** FastAPI + PostgreSQL → deployed on Railway  
**AI:** Anthropic Claude API (chat, document processing, recommendations)

Full product spec is in `PRD.md`. Full design spec is in `design-brief.jsonc`.  
Read both before writing any code.

---

## Monorepo Structure

```
parcel-platform/
├── frontend/          # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/    # shared UI components
│   │   ├── pages/         # one file per route
│   │   ├── hooks/         # custom React hooks
│   │   ├── lib/           # utilities, API client, helpers
│   │   ├── store/         # Zustand stores (UI state only)
│   │   └── types/         # TypeScript interfaces
│   └── ...
├── backend/           # FastAPI + PostgreSQL
│   ├── core/
│   │   ├── calculators/   # ⚠️ NEVER TOUCH — Ivan writes these
│   │   ├── ai/            # Claude API integrations
│   │   └── security/      # auth, JWT
│   ├── models/            # SQLAlchemy models
│   ├── routers/           # FastAPI route handlers
│   ├── schemas/           # Pydantic schemas
│   └── main.py
├── PRD.md             # Product requirements — read this
├── design-brief.jsonc # Design system — read this
└── CLAUDE.md          # This file
```

---

## Critical Rules (Read Every Session)

### ❌ NEVER touch these files/folders without explicit instruction:
- `backend/core/calculators/` — Ivan writes all business logic here
- `backend/core/ai/chat_specialist.py` — Ivan writes the system prompt
- Any file containing `# HAND-WRITTEN — DO NOT MODIFY`

### ✅ Claude Code owns:
- All React components and pages
- All FastAPI route handlers and Pydantic schemas
- All SQLAlchemy models
- All TypeScript types and interfaces
- Test files
- Database migrations (Alembic)

### ⚠️ Always ask before:
- Changing the database schema
- Adding a new npm or pip dependency
- Modifying auth logic
- Changing API response shapes that frontend already uses

---

## Code Style

### TypeScript / React
- Strict TypeScript — no `any` types ever
- Functional components only — no class components
- Custom hooks for all data fetching (React Query)
- Zustand for UI state only (modals, sidebar open/close, etc.)
- Named exports preferred over default exports (except pages)
- File naming: `kebab-case.tsx` for components, `camelCase.ts` for utils

### Python / FastAPI
- Type hints on all functions
- Pydantic schemas for all request/response shapes
- SQLAlchemy ORM (not raw SQL) except for complex analytics queries
- Async endpoints where possible
- Structured error responses: `{"error": "message", "code": "ERROR_CODE"}`

### General
- No commented-out code in commits
- Every component gets a brief JSDoc comment explaining its purpose
- Every API endpoint gets a docstring

---

## Design Rules (Non-Negotiable)

Always follow `design-brief.jsonc`. Key rules:

1. **Dark backgrounds only** — base `#08080F`, surface `#0F0F1A`
2. **JetBrains Mono for ALL financial numbers** — cap rates, cash flow, prices, %, $
3. **Primary accent: Indigo `#6366F1`** — CTAs, selected states, active nav items
4. **shadcn/ui** for forms, dialogs, dropdowns, tooltips
5. **Recharts** for all charts — no Chart.js, no D3 unless explicitly asked
6. **dnd-kit** for drag-and-drop (pipeline Kanban)
7. **Skeleton screens for loading** — never use spinners
8. **Framer Motion** for page transitions and component animations
9. **No confetti, no particles, no bounce animations**
10. **Mercury-style sidebar** — 216px wide, icon + label, grouped sections

---

## Component Conventions

### KPI Card
```tsx
// Always use JetBrains Mono for the value
// Always show a delta badge (green up arrow / red down arrow)
// Always animate count-up on mount (1.2s ease-out)
<KPICard
  label="Cash-on-Cash Return"
  value={8.4}
  format="percent"
  delta={+1.2}
/>
```

### Strategy Badge
```tsx
// Color-coded by strategy — see design-brief.jsonc for colors
<StrategyBadge strategy="wholesale" />
<StrategyBadge strategy="creative_finance" />
<StrategyBadge strategy="brrrr" />
<StrategyBadge strategy="buy_and_hold" />
<StrategyBadge strategy="flip" />
```

### Page Layout (app pages)
```tsx
// Always wrap app pages in this structure
<AppShell>
  <PageHeader title="Pipeline" action={<Button>Add Deal</Button>} />
  <PageContent>
    {/* page content here */}
  </PageContent>
</AppShell>
```

---

## API Client

All API calls go through `frontend/src/lib/api.ts`.  
Never use `fetch` directly in components — always use React Query hooks.

```typescript
// Pattern for all data fetching
const { data: deals, isLoading } = useQuery({
  queryKey: ['deals'],
  queryFn: () => api.deals.list()
})
```

---

## Environment Variables

### Frontend (.env.local)
```
VITE_API_URL=http://localhost:8000
```

### Backend (.env)
```
DATABASE_URL=postgresql://...
ANTHROPIC_API_KEY=sk-ant-...
SECRET_KEY=...
ENVIRONMENT=development
FRONTEND_URL=http://localhost:5173
```

---

## Database Rules

1. **Every table has:** `id` (UUID), `created_at`, `updated_at`
2. **Every user-owned table has:** `user_id` (FK to users) AND `team_id` (FK to teams, nullable)
3. **Soft deletes only** — never hard delete deals, documents, or pipeline entries. Use `deleted_at` timestamp.
4. **Inputs and outputs stored as JSONB** — deal calculator inputs/outputs are strategy-specific, store as JSON not individual columns

---

## Auth Pattern

- JWT tokens stored in httpOnly cookies (not localStorage)
- Access token: 15 min expiry
- Refresh token: 7 day expiry
- All protected routes use `get_current_user` dependency
- Role-based access: `owner` > `analyst` > `viewer`

---

## Claude API Integration

All Claude API calls are in `backend/core/ai/`.

```python
# Standard pattern for all Claude API calls
async def call_claude(prompt: str, system: str, max_tokens: int = 1000):
    response = await anthropic_client.messages.create(
        model="claude-opus-4-5",
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.content[0].text
```

For streaming (chat):
- Use SSE (Server-Sent Events) via FastAPI `StreamingResponse`
- Frontend consumes with `EventSource` or `fetch` with `ReadableStream`

---

## Deployment

### Frontend (Vercel)
- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`
- Env vars: set in Vercel dashboard

### Backend (Railway)
- Root directory: `backend`
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Env vars: set in Railway dashboard
- Database: Railway PostgreSQL (link via `DATABASE_URL`)

### Deploy Checklist (before every deploy)
- [ ] `npm run build` passes with no TypeScript errors
- [ ] `pytest` passes (backend)
- [ ] No `console.log` left in frontend code
- [ ] No hardcoded localhost URLs
- [ ] Alembic migrations are up to date

### Alembic Migration Rule

Every time you create a new Alembic migration file, you MUST run it against the production database before or immediately after deploying. Use this command:

```bash
cd backend
source venv/bin/activate
DATABASE_URL="<public_url>" alembic upgrade head
```

The public DATABASE_URL can be found in Railway → Postgres service → Variables tab → `DATABASE_PUBLIC_URL`. The internal URL (`postgres.railway.internal`) only works inside Railway's network and will fail DNS lookup when run locally. Always use the public URL for local migration runs.

Never assume Railway will auto-run migrations on deploy unless the Procfile explicitly contains an `alembic upgrade head` command. Check the Procfile first — if it does not run migrations, you must run them manually.

This rule applies to every agent session. No exceptions.

---

## Session Workflow for Claude Code

**Start of every session:**
1. Read CLAUDE.md (this file)
2. Read PRD.md (product requirements)
3. Read design-brief.jsonc (design system)
4. Ask: "What are we building this session?"

**During the session:**
- Build one feature at a time
- After each feature: "Does this match the PRD and design brief?"
- Commit frequently with descriptive messages

**End of every session:**
- Run TypeScript check: `cd frontend && npx tsc --noEmit`
- Run build: `cd frontend && npm run build`
- Confirm no errors before ending

---

## Commit Message Format

```
feat: add deal pipeline Kanban board with dnd-kit
fix: correct cap rate calculation for buy-and-hold
ui: update dashboard KPI cards with count-up animation
refactor: extract deal calculator logic to separate module
docs: update API documentation for /deals endpoint
```

---

## What To Build (Priority Order)

See PRD.md Section 3 for the full flow. Build in this order:

### Phase 0 (Current — Foundation)
- [x] Monorepo scaffold
- [ ] FastAPI + PostgreSQL connected
- [ ] React + Vite running
- [ ] Both deployed (Vercel + Railway)
- [ ] design-brief.jsonc in repo

### Phase 1 (Landing + App Shell)
- [ ] Design system (Tailwind config, color tokens, typography)
- [ ] Landing page with animated hero
- [ ] Auth pages (login + register)
- [ ] App shell (sidebar + topbar)
- [ ] Dashboard empty state

### Phase 2 (Core Deal Engine)
- [ ] Deal analyzer (all 5 strategies)
- [ ] Deal results page
- [ ] My Deals list
- [ ] Pipeline Kanban
- [ ] AI chat (basic)
- [ ] Concept glossary tooltips

### Phase 3 (Portfolio + Sharing)
- [ ] Portfolio dashboard
- [ ] Shared deal page
- [ ] Offer letter generator
- [ ] Saved templates

### Phase 4 (Document Processing)
- [ ] File upload UI
- [ ] Claude document parsing
- [ ] Document chat

### Phase 5 (Team + Polish)
- [ ] Team management
- [ ] Role-based access
- [ ] README + screenshots + GIF demo
