# Parcel

**AI-powered real estate investment workspace** — analyze deals across 5 strategies, manage your pipeline, process documents with AI, and chat with a real estate specialist, all in one platform.

**[Live Demo](https://parceldesk.io)** &nbsp;|&nbsp; **Demo login:** `demo@parcel.app` / `Demo1234!`

![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Claude AI](https://img.shields.io/badge/Claude_AI-Anthropic-CC785C?logo=anthropic&logoColor=white)
![Vitest](https://img.shields.io/badge/Tests-44_passing-6DA13F?logo=vitest&logoColor=white)
![CI](https://img.shields.io/badge/CI-GitHub_Actions-2088FF?logo=githubactions&logoColor=white)

---

## Features

### Deal Analysis Engine
- **5 investment strategy calculators** — Wholesale (MAO), Creative Finance (subject-to / seller finance), BRRRR, Buy & Hold, Flip
- **Real-time financial calculations** — cap rate, cash-on-cash return, NOI, debt service coverage ratio, net profit, annualized ROI
- **Multi-factor risk scoring** — 7 weighted factors produce a composite 0-100 risk score per deal
- **Side-by-side deal comparison** with 6-dimension radar chart and automatic winner highlighting
- **12-month cash flow projection** — Recharts AreaChart with monthly breakdown
- **Branded PDF report generation** — strategy-specific multi-page reports with financials, risk breakdown, and charts via jsPDF
- **AI offer letter generation** — Claude produces professional offer letters from deal data in one click

### Pipeline Management
- **Kanban board** with 7 stages (Lead → Analyzing → Offer Sent → Under Contract → Due Diligence → Closed / Dead)
- **Drag-and-drop** via dnd-kit with column highlight glow on drag-over
- **Mobile-responsive tabbed view** — stages become swipeable tabs below the `md` breakpoint
- **Full keyboard navigation** — arrow keys between cards/columns, Enter to open, Escape to deselect
- **Days-in-stage tracking** displayed on each card
- **Pipeline-to-portfolio flow** — close deals directly from the Kanban with a modal that captures closing details

### AI Integration (Claude API)
- **Streaming chat** — real-time SSE responses with markdown rendering, 3-dot typing indicator, and conversation history
- **Context-aware conversations** — attach any deal or document to a chat session; Claude sees the full analysis
- **Document processing** — upload PDFs/DOCX/images, Claude extracts document type, parties, key terms, risk flags, and financial figures
- **Offer letters** — one-click generation of professional offer letters built dynamically from deal strategy and outputs

### Portfolio Tracking
- **Aggregate KPIs** — total equity, monthly cash flow, annualized return, total profit, deals closed
- **Strategy breakdown donut chart** and monthly cash flow bar chart (Recharts)
- **Editable entries** — update closed price, profit, cash flow, and notes after closing

### Document Management
- **Drag-and-drop upload** via react-dropzone (PDF, DOCX, JPG, PNG — up to 10 MB)
- **AI-powered analysis pipeline** — pending → processing → complete, with status indicators
- **Structured extraction** — document type classification, party identification, risk flag detection, key terms, financial figure parsing
- **S3 storage** with presigned download URLs (1-hour expiry)
- **Paginated list** with detail view

### Platform & UX
- **Command palette** (Cmd+K / Ctrl+K) — fuzzy search across deals, pages, and actions via cmdk
- **Dark theme** — #08080F base, #0F0F1A surface, indigo #6366F1 accent throughout
- **JetBrains Mono** for all financial figures — cap rates, dollar amounts, percentages, cash flow
- **Skeleton loading screens** — never spinners; shimmer effect with indigo tint
- **Framer Motion animations** — page crossfade transitions, staggered card reveals, sidebar active indicator with `layoutId`, form validation shake
- **Responsive mobile layout** — 216px sidebar collapses to a Sheet drawer below `md`
- **Password reset flow** — secure token-based reset via Resend email with branded HTML template
- **Error boundaries** — app-level and per-page with branded fallback UI
- **404 catch-all** with link back to dashboard
- **Toast notifications** with navigation links ("View Portfolio →", "View My Deals →")
- **Accessibility** — skip-to-content link, focus management on route change, `aria-label` on icon buttons, keyboard-navigable pipeline
- **Breadcrumbs** on analyzer and results pages with `aria-current`
- **Route-level code splitting** — all 18 pages lazy-loaded via `React.lazy` + `Suspense`

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| React | 18.3 | UI framework |
| TypeScript | 5.7 (strict mode, zero `any` types) | Type safety |
| Vite | 6.0 | Build tool and dev server |
| React Router | 6.28 | Client-side routing with lazy-loaded pages |
| TanStack React Query | 5.62 | Server state, caching, optimistic updates |
| Zustand | 4.5 | UI state only (modals, sidebar, command palette) |
| Tailwind CSS | 3.4 | Utility-first styling with design tokens |
| shadcn/ui (Radix) | — | Dialogs, tooltips, popovers, selects, switches, alerts |
| Framer Motion | 11.15 | Page transitions, staggered animations, layout animations |
| Recharts | 2.14 | Area charts, radar charts, bar charts, donut charts |
| dnd-kit | 6.3 | Drag-and-drop Kanban pipeline |
| Zod | 4.3 | Form validation schemas for all 5 strategies |
| cmdk | 1.1 | Command palette (Cmd+K) |
| jsPDF | 4.2 | Client-side PDF deal report generation |
| react-dropzone | 14.3 | Document upload with drag-and-drop |
| Vitest + Testing Library | 4.0 / 16.3 | 44 unit, component, and integration tests |

### Backend

| Technology | Version | Purpose |
|---|---|---|
| FastAPI | 0.115 | Async REST API with automatic OpenAPI docs |
| Python | 3.12+ | Runtime |
| SQLAlchemy | 2.0 | ORM with PostgreSQL |
| Alembic | 1.14 | Database schema migrations |
| PostgreSQL | 16 | Primary database (Railway) |
| Pydantic | 2.0 | Request/response validation with field validators |
| Anthropic SDK | 0.40 | Claude AI — streaming chat, document processing, offer letters |
| Resend | 2.0 | Transactional email (password reset, document notifications) |
| boto3 | 1.35 | S3 document storage with presigned URLs |
| python-jose | 3.3 | JWT creation and verification |
| bcrypt (passlib) | 1.7 | Password hashing |
| pdfplumber + python-docx | — | Server-side document text extraction before Claude analysis |

---

## Architecture Decisions

### httpOnly Cookie Authentication
JWTs are stored in httpOnly cookies, not localStorage. This prevents XSS attacks from accessing tokens via `document.cookie` or JavaScript. The access token has a 15-minute TTL. The frontend never sees or handles the raw token — `credentials: 'include'` sends it automatically on every request. Password reset uses separate SHA-256-hashed tokens stored in a dedicated database table with 1-hour expiry and single-use enforcement.

**Why not localStorage?** A single XSS vulnerability would expose every token in localStorage. httpOnly cookies are invisible to JavaScript, making token theft significantly harder even if an XSS vector exists.

### Vercel + Railway Split Deployment
The React SPA deploys to Vercel (global CDN, automatic preview deploys on PRs, zero-config Vite support) while the FastAPI backend deploys to Railway (managed PostgreSQL, persistent filesystem, environment variable management). Each service scales independently.

**Why not a monolith?** Decoupling lets the frontend serve from edge nodes worldwide while the backend stays close to its database. Vercel's CDN means the landing page loads in under 400ms globally. Railway's managed Postgres eliminates database operations overhead.

### Claude AI for Three Distinct Features
Claude powers streaming chat (SSE via FastAPI `StreamingResponse`), document analysis (structured extraction into typed fields), and offer letter generation. The system prompt is hand-written and strategy-aware — it understands wholesale MAO calculations, DSCR ratios, cap rates, and creative finance structures. Context is injected directly into the system prompt rather than using RAG, which keeps architecture simple and latency low (first token appears in under 500ms).

**Why not RAG?** The context window is large enough to hold a full deal analysis or document summary. RAG adds retrieval latency, embedding infrastructure, and vector DB costs for a problem that fits cleanly in-context.

### S3 Document Storage with Presigned URLs
Uploaded documents are stored in S3. The API returns presigned download URLs with 1-hour expiry. This keeps binary files out of PostgreSQL, enables direct browser downloads without proxying through the API server, and handles arbitrarily large files. The database stores only metadata and AI analysis results.

**Why not store files in Postgres?** Binary blobs in Postgres inflate backup sizes, slow down queries on the same connection pool, and can't be served directly to browsers. S3 with presigned URLs gives CDN-quality download performance with no backend load.

### JSONB for Calculator Inputs/Outputs
Deal inputs and outputs are stored as JSONB columns. Each of the 5 strategies has a different schema — wholesale needs ARV and assignment fee; buy-and-hold needs loan terms, rental income, and expense ratios. JSONB avoids a 50+ column table and eliminates the need for complex EAV (entity-attribute-value) patterns.

**Why not separate tables per strategy?** That creates 5 tables that need to be JOINed on every deal query and adds migration overhead whenever a calculator field changes. JSONB keeps the schema flexible — adding a field to a calculator requires zero migrations.

### Code Splitting with React.lazy
All 18 pages are lazy-loaded. The initial bundle contains only the router, auth store, and landing page. Authenticated pages (which pull in Recharts, dnd-kit, jsPDF, react-dropzone, and cmdk) are downloaded on first navigation. This keeps the landing page bundle small and fast.

---

## Local Development

### Prerequisites
- Node.js 20+
- Python 3.12+
- PostgreSQL 16 (local install or Docker)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env file
cat > .env << 'EOF'
DATABASE_URL=postgresql://localhost/parcel
SECRET_KEY=your-dev-secret-key
ANTHROPIC_API_KEY=sk-ant-your-key
ENVIRONMENT=development
FRONTEND_URL=http://localhost:5173
RESEND_API_KEY=re_your-key      # Optional — emails are skipped without this
EOF

# Set up database
createdb parcel
alembic upgrade head

# Optionally seed demo data
python seed_demo.py

# Run
uvicorn main:app --reload       # → http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install

echo "VITE_API_URL=http://localhost:8000" > .env.local

npm run dev                     # → http://localhost:5173
```

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `ANTHROPIC_API_KEY` | Yes | Claude API key for AI features |
| `SECRET_KEY` | Yes | JWT signing key |
| `FRONTEND_URL` | Yes | Frontend origin for CORS and email links |
| `RESEND_API_KEY` | No | Transactional email — gracefully skipped if missing |
| `AWS_ACCESS_KEY_ID` | For docs | S3 access for document storage |
| `AWS_SECRET_ACCESS_KEY` | For docs | S3 secret for document storage |
| `VITE_API_URL` | No | API base URL (defaults to `http://localhost:8000`) |

---

## API Documentation

Full contract with request/response shapes: [`CONTRACTS.md`](./CONTRACTS.md)

### Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/auth/register` | No | Create account, receive JWT cookie |
| POST | `/api/v1/auth/login` | No | Authenticate, receive JWT cookie |
| POST | `/api/v1/auth/logout` | No | Clear JWT cookie |
| GET | `/api/v1/auth/me` | Yes | Current user profile |
| PUT | `/api/v1/auth/me/` | Yes | Update name, email, or password |
| POST | `/api/v1/auth/forgot-password` | No | Send password reset email (never reveals if email exists) |
| POST | `/api/v1/auth/reset-password` | No | Reset password with secure token |

### Deals
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/deals` | Yes | Analyze deal — runs calculator + risk scoring |
| GET | `/api/v1/deals` | Yes | List with search, filters, pagination, sorting |
| GET | `/api/v1/deals/:id` | Yes | Full deal with risk factors |
| DELETE | `/api/v1/deals/:id` | Yes | Soft delete (sets `deleted_at`) |
| PUT | `/api/v1/deals/:id/share/` | Yes | Generate shareable link |
| GET | `/api/v1/deals/:id/share/` | No | Public shared deal view |
| POST | `/api/v1/deals/:id/offer-letter/` | Yes | AI-generated offer letter |

### Pipeline & Portfolio
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/pipeline` | Yes | All entries grouped by stage |
| POST | `/api/v1/pipeline` | Yes | Add deal to pipeline |
| PUT | `/api/v1/pipeline/:id/stage` | Yes | Move deal to new stage |
| DELETE | `/api/v1/pipeline/:id` | Yes | Remove from pipeline |
| GET | `/api/v1/portfolio` | Yes | Summary KPIs + all entries |
| POST | `/api/v1/portfolio` | Yes | Close deal into portfolio |
| PUT | `/api/v1/portfolio/:id/` | Yes | Edit portfolio entry |

### AI & Documents
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/chat` | Yes | Streaming AI chat (SSE) |
| GET | `/api/v1/chat/history` | Yes | Last 50 messages |
| POST | `/api/v1/documents/` | Yes | Upload document for AI analysis |
| GET | `/api/v1/documents/` | Yes | Paginated document list |
| GET | `/api/v1/documents/:id` | Yes | Full document with AI results |
| DELETE | `/api/v1/documents/:id` | Yes | Delete document and S3 object |

### Dashboard
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/dashboard/stats/` | Yes | KPIs, strategy counts, recent deals |
| GET | `/api/v1/dashboard/activity/` | Yes | Recent activity feed (15 events) |

---

## Testing

```bash
cd frontend
npm test                # Watch mode
npm run test:run        # Single run (used in CI)
```

**44 tests** across 5 suites, all passing:

| Suite | Tests | Coverage |
|---|---|---|
| `utils.test.ts` | 20 | `formatCurrency`, `formatPercent`, `formatLabel`, `formatOutputValue`, `formatFileSize` — null/undefined handling, negative values, string parsing, zero edge case, domain-specific label overrides (MAO, ARV, NOI, Cash-on-Cash Return) |
| `schemas.test.ts` | 12 | Zod validation for all 5 strategy calculators — required fields, min/max value constraints, enum validation (`finance_type`, `loan_term_years`), negative value rejection |
| `components.test.tsx` | 7 | `KPICard` (percent/currency formatting, positive/negative delta arrows with correct colors, loading skeleton state), `StrategyBadge` (all 5 strategy labels), `SkeletonCard` (configurable line count, default behavior) |
| `hooks.test.ts` | 2 | `useCountUp` — requestAnimationFrame-based count-up animation reaching target value, cubic easing curve verification at midpoint |
| `integration.test.tsx` | 3 | Full page renders with providers: `NotFound` (404 text + dashboard link href), `Login` (email/password fields + submit button), `Register` (name/email/password fields + 3 role selection cards + submit) |

**CI Pipeline** (`.github/workflows/ci.yml`) runs on every push to `main`:
1. `npx tsc --noEmit` — TypeScript type checking
2. `npx vitest run` — all 44 tests
3. `npm run build` — production build

---

## Project Structure

```
parcel-platform/
├── frontend/                       # React + TypeScript + Vite → Vercel
│   └── src/
│       ├── components/             # 54 components
│       │   ├── ui/                 # KPICard, StrategyBadge, SkeletonCard, RiskGauge, shadcn primitives
│       │   ├── layout/             # AppShell (sidebar + topbar), PageHeader, PageContent
│       │   ├── landing/            # Hero, DemoCard, Ticker, FeaturesBento, Pricing, HowItWorks, Footer
│       │   ├── pipeline/           # KanbanColumn, DealCard, MobilePipeline, empty/error states
│       │   ├── deals/              # DealCard, DealGrid, FilterBar, PresetChips, CompareBar
│       │   ├── documents/          # UploadZone, DocumentList, DocumentDetail, ProcessingSteps
│       │   └── charts/             # CashFlowProjection (AreaChart), ComparisonRadar (RadarChart)
│       ├── pages/                  # 18 lazy-loaded route pages
│       ├── hooks/                  # useAuth, useDeals, useCountUp, usePortfolio, useDebouncedValue,
│       │                           #   useKanbanKeyboard, useDashboard
│       ├── lib/                    # api.ts, format.ts, schemas.ts, motion.ts, pdf-report.ts,
│       │                           #   chat-stream.ts, strategy-kpis.ts
│       ├── stores/                 # Zustand (authStore, uiStore)
│       └── __tests__/              # 5 test suites, 44 tests
├── backend/                        # FastAPI + PostgreSQL → Railway
│   ├── routers/                    # 8 route modules
│   │   ├── auth.py                 # Register, login, logout, profile, password reset
│   │   ├── deals.py                # CRUD, search, sharing, offer letters
│   │   ├── pipeline.py             # Kanban CRUD, stage transitions
│   │   ├── portfolio.py            # Portfolio entries and summary
│   │   ├── dashboard.py            # Aggregated stats and activity feed
│   │   ├── chat.py                 # Streaming AI chat (SSE)
│   │   ├── documents.py            # Upload, S3, AI analysis pipeline
│   │   └── settings.py             # Notification preferences
│   ├── models/                     # 9 SQLAlchemy models (User, Deal, PipelineEntry, Document,
│   │                               #   ChatMessage, PortfolioEntry, Team, TeamMember, PasswordResetToken)
│   ├── schemas/                    # Pydantic request/response schemas
│   ├── core/
│   │   ├── calculators/            # 5 strategy calculators + risk scoring (hand-written)
│   │   ├── ai/                     # Claude API integration (chat specialist, document analyzer)
│   │   ├── security/               # JWT auth, bcrypt password hashing
│   │   └── email.py                # Resend transactional email (password reset, doc notifications)
│   ├── alembic/                    # 5 database migrations
│   └── main.py                     # FastAPI app entry point
├── .github/workflows/ci.yml       # CI: tsc + vitest + build
├── CONTRACTS.md                    # Full API contract documentation
├── PRD.md                          # Product requirements document
└── design-brief.jsonc              # Design system specification
```

**Codebase:** ~15,000 lines TypeScript/TSX + ~5,400 lines Python across 160 source files.

---

## License

Private repository. All rights reserved.
