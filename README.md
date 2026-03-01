# Parcel — Real Estate Deal Analysis Platform

Parcel is a full-stack SaaS platform that gives real estate investors a single workspace for analyzing deals across five investment strategies (wholesale, BRRRR, buy & hold, flip, and creative finance), tracking them through a pipeline, and managing a portfolio of closed deals. It replaces the 4-6 disconnected spreadsheets and tools that most investors currently juggle, and includes an AI chat specialist trained on real estate investment concepts.

## Live Demo

- **App:** [parcel-platform-kappa.vercel.app](https://parcel-platform-kappa.vercel.app)
- **Demo login:** `demo@parcel.app` / `Demo1234!`
- **Share page example:** [Shared deal analysis](https://parcel-platform-kappa.vercel.app/share/7679eb27-084c-45c2-b9e2-8806fcd41fab)

The demo account comes pre-loaded with sample deals, pipeline entries, and portfolio data so you can explore the full app without creating your own.

## Features

**Deal Analysis**
- Five strategy calculators — wholesale (MAO), BRRRR, buy & hold, flip, creative finance (subject-to / seller finance)
- Composite risk scoring (0-100) across 7 weighted factors per deal
- AI-generated deal recommendations via Claude API
- Full financial breakdown with strategy-specific KPIs (cap rate, cash-on-cash, NOI, ROI, etc.)

**Pipeline Management**
- Kanban board with 7 stages: Lead, Analyzing, Offer Sent, Under Contract, Due Diligence, Closed, Dead
- Drag-and-drop powered by dnd-kit
- Days-in-stage tracking per card

**Portfolio Tracking**
- Aggregate KPIs across all closed deals (total equity, monthly cash flow, total profit)
- Per-entry detail with deal context joined from the deals table

**AI Chat Specialist**
- Real-time streaming responses via SSE
- Deal-aware context injection — navigate to chat from any deal and the AI has full context of that analysis
- Trained on wholesale, creative finance, BRRRR, DSCR, cap rates, and other investment concepts

**Public Share Pages**
- Read-only, unauthenticated deal result pages for sharing with partners or lenders
- Branded layout with "Powered by Parcel" watermark

**Other**
- Demo account with pre-seeded data and one-click login
- Profile settings with email and password update (current password verification required)
- Responsive dark-themed UI with JetBrains Mono for all financial figures
- Animated KPI cards with count-up on mount

## Tech Stack

| Backend | Frontend |
|---|---|
| FastAPI 0.115+ | React 18.3 |
| PostgreSQL (Railway) | TypeScript 5.7 |
| SQLAlchemy 2.0 | Vite 6 |
| Alembic 1.14 | Tailwind CSS 3.4 |
| Pydantic 2.0 | Framer Motion 11 |
| Anthropic Claude API 0.40+ | React Query 5 (@tanstack) |
| python-jose (JWT) | Recharts 2.14 |
| bcrypt (password hashing) | dnd-kit (drag-and-drop) |
| Uvicorn (ASGI) | Zustand 4.5 (UI state) |
| Railway (hosting) | Vercel (hosting) |

## Architecture

The backend is a FastAPI REST API deployed on Railway, serving a React single-page application hosted on Vercel. PostgreSQL handles all persistence, with SQLAlchemy as the ORM and Alembic managing schema migrations. Authentication uses JWT tokens stored in httpOnly cookies with a 15-minute access token TTL. The AI chat feature streams responses from the Anthropic Claude API over Server-Sent Events — deal and document context is injected directly into the system prompt rather than using RAG, which keeps the architecture simple and latency low.

## API Overview

All endpoints are prefixed with `/api/v1`. Auth-required endpoints use JWT via httpOnly cookie or Bearer header.

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | No | Create account |
| POST | `/auth/login` | No | Authenticate, receive JWT |
| POST | `/auth/logout` | No | Clear auth cookie |
| GET | `/auth/me` | Yes | Current user (internal) |
| GET | `/auth/me/` | Yes | User profile for settings |
| PUT | `/auth/me/` | Yes | Update name, email, or password |

### Deals

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/deals` | Yes | Create deal + run calculator |
| GET | `/deals` | Yes | List deals (filterable, paginated) |
| GET | `/deals/:id` | Yes | Full deal with inputs/outputs |
| PUT | `/deals/:id` | Yes | Update deal fields |
| DELETE | `/deals/:id` | Yes | Soft delete (sets deleted_at) |

### Pipeline

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/pipeline` | Yes | Full Kanban board grouped by stage |
| POST | `/pipeline` | Yes | Add deal to pipeline |
| PUT | `/pipeline/:id/stage` | Yes | Move card to new stage |
| DELETE | `/pipeline/:id/` | Yes | Remove from pipeline |

### Portfolio

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/portfolio/` | Yes | Summary metrics + all entries |
| POST | `/portfolio/` | Yes | Add closed deal to portfolio |

### Dashboard

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/dashboard/stats/` | Yes | KPIs, strategy counts, recent deals |

### Chat

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/chat` | Yes | Send message, receive SSE stream |
| GET | `/chat/history` | Yes | Last 50 messages for session |

## Local Development

**Prerequisites:** Python 3.11+, Node.js 18+, PostgreSQL running locally

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create .env
cat > .env << 'EOF'
DATABASE_URL=postgresql://localhost/parcel
SECRET_KEY=your-dev-secret-key
ANTHROPIC_API_KEY=sk-ant-your-key
ENVIRONMENT=development
FRONTEND_URL=http://localhost:5173
EOF

# Set up database
createdb parcel
alembic upgrade head

# Optionally seed demo data
python seed_demo.py

# Run
uvicorn main:app --reload
# → http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install

# Create .env.local
echo "VITE_API_URL=http://localhost:8000" > .env.local

npm run dev
# → http://localhost:5173
```

## Project Structure

```
parcel-platform/
├── frontend/
│   └── src/
│       ├── components/         # Shared UI (KPICard, StrategyBadge, AppShell)
│       ├── pages/              # Route components (Dashboard, Pipeline, etc.)
│       ├── hooks/              # React Query hooks, useCountUp
│       ├── lib/                # API client, utilities
│       ├── store/              # Zustand stores (UI state only)
│       └── types/              # TypeScript interfaces
├── backend/
│   ├── routers/                # FastAPI route handlers
│   │   ├── auth.py             # Register, login, profile
│   │   ├── deals.py            # Deal CRUD + sharing
│   │   ├── pipeline.py         # Kanban board operations
│   │   ├── portfolio.py        # Portfolio tracking
│   │   ├── dashboard.py        # Aggregated stats
│   │   └── chat.py             # AI chat streaming
│   ├── core/
│   │   ├── calculators/        # Hand-written business logic
│   │   │   ├── wholesale.py    # MAO calculator
│   │   │   ├── buy_and_hold.py # Cap rate, cash-on-cash, NOI
│   │   │   ├── brrrr.py        # Cash left in deal, equity captured
│   │   │   ├── flip.py         # Net profit, annualized ROI
│   │   │   ├── creative_finance.py  # Subject-to, seller finance
│   │   │   └── risk_score.py   # 7-factor composite risk scoring
│   │   ├── ai/                 # Claude API integrations
│   │   └── security/           # JWT auth, password hashing
│   ├── models/                 # SQLAlchemy ORM models
│   ├── schemas/                # Pydantic request/response schemas
│   ├── alembic/                # Database migrations
│   └── main.py                 # FastAPI app entry point
├── CLAUDE.md                   # Development instructions
├── PRD.md                      # Product requirements
├── CONTRACTS.md                # API contract documentation
└── design-brief.jsonc          # Design system specification
```
