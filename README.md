# Parcel

**AI-powered real estate investor operating system.**

Parcel gives real estate investors a single workspace to analyze deals across five strategies, manage their pipeline from lead to close, and use AI to process documents, generate offer letters, and chat about deals. Deployed at [parceldesk.io](https://parceldesk.io).

---

## Tech Stack

**Frontend**
React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, TanStack Query, Zustand, shadcn/ui, Recharts, dnd-kit, Zod, jsPDF

**Backend**
FastAPI, Python 3.12, SQLAlchemy 2, Alembic, Pydantic 2

**Database**
PostgreSQL 16 + pgvector

**Auth**
Clerk

**Billing**
Stripe -- Steel (free) / Carbon ($79/mo) / Titanium ($149/mo)

**AI**
Anthropic Claude -- streaming chat, document analysis, offer letter generation

**Property Data**
RentCast, Google Places

**Storage**
Cloudflare R2

**Background Jobs**
Dramatiq + Redis

**Monitoring**
Sentry, PostHog

---

## Architecture

```
Frontend  -->  Vercel at parceldesk.io
Backend   -->  Railway at api.parceldesk.io
```

Mono-repo with two top-level directories:

```
/frontend    React SPA (Vite build, deployed to Vercel)
/backend     FastAPI application (deployed to Railway)
```

The frontend calls the backend over REST. AI chat streams via Server-Sent Events. Documents are stored in Cloudflare R2 with presigned URLs. Background jobs (Dramatiq workers) handle async tasks through Redis.

---

## Key Stats

| Metric | Count |
|---|---|
| API endpoints | 141+ |
| Routers | 33 |
| Database tables | 38 |
| Frontend routes | 48 |
| Investment strategies | 5 |

**Strategies:** Wholesale, Creative Finance, BRRRR, Buy & Hold, Flip

---

## Getting Started

### Prerequisites

- Node 20+
- Python 3.11+
- PostgreSQL 16

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

### Backend

```bash
cd backend
cp .env.example .env
pip install -r requirements.txt
uvicorn main:app --reload
```

Both directories have `.env.example` files with the required environment variables.

---

## Design System

See [DESIGN.md](./DESIGN.md) for the full design system specification.

- **Fonts:** Satoshi 300 (headings), General Sans (body)
- **Accent:** Violet `#8B7AFF`
- **Themes:** Dual dark/light theme with semantic color tokens

---

## Author

Ivan Flores
