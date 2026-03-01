# Parcel — Product Requirements Document
**Version:** 1.0  
**Last Updated:** 2026-02-27  
**Author:** Ivan Flores  
**Repo:** ivan-711/parcel-platform  
**Stack:** FastAPI + PostgreSQL (Railway) · React + TypeScript + Vite (Vercel)  
**AI:** Anthropic Claude API

---

## 1. Product Vision

Parcel is a nationwide SaaS platform for real estate professionals — wholesalers, creative finance investors, buy-and-hold investors, and agents. It combines deal analysis, document processing, pipeline management, and an AI real estate specialist into one unified workspace.

**The hiring argument:** Parcel demonstrates full-stack engineering, AI integration, multi-user architecture, and product thinking — all in one live, deployed application.

**The user argument:** Real estate professionals currently use 4-6 separate tools to do what Parcel does in one place.

---

## 2. User Types

| Type | Primary Need | Willingness to Pay |
|---|---|---|
| Wholesalers | MAO calculator, deal pipeline, offer letters | High |
| Creative Finance Investors | Subject-to / seller finance analysis, document review | High |
| Buy-and-Hold Investors | BRRRR / cash flow analysis, portfolio tracking | Medium |
| Agents / Teams | Deal sharing, client analysis, team collaboration | High (per-seat) |

---

## 3. User Flow (Critical — Build in This Order)

```
Landing Page (public)
  ↓ "Get Started Free" CTA
Register / Login
  ↓
Dashboard — Empty State
  → Single CTA: "Analyze Your First Deal →"
  ↓ (after first deal)
Dashboard — Populated
  → KPI cards + recent deals + pipeline summary
  ↓
Full App (sidebar navigation to all modules)
```

**The empty state dashboard is not a bug — it's the onboarding flow.** First-time users should feel guided, not overwhelmed.

---

## 4. Pages & Screens

### 4.1 Landing Page (`/`)
**Purpose:** Tell the product story. Build trust. Convert visitors to sign-ups.

**Structure (top to bottom):**
1. **Navbar** — Parcel logo left · Features / Pricing / For Investors / For Agents center · Sign In + Get Started right
2. **Hero Section** — Animated gradient background (Stripe-style, slow-moving indigo/purple blobs) · Bold 2-line headline · Short subhead · Two CTAs (Get Started Free + View Demo) · Small "Built for real estate professionals" pill above headline
3. **Social Proof Strip** — "Analyzing deals across X markets" + simple metric counters
4. **Product Preview** — Screenshot or animated GIF of the dashboard (shows what they're signing up for)
5. **Features Section** — 3 columns: Deal Analysis · Document AI · Pipeline Management
6. **How It Works** — 3 steps: Analyze → Track → Close
7. **Strategy Section** — Shows support for Wholesale, Creative Finance, BRRRR, Buy & Hold, Flip
8. **Pricing Section** — Free / Pro ($29/mo) / Team ($99/mo)
9. **Final CTA** — Full-width dark section, big headline, single "Get Started Free" button
10. **Footer** — Links + copyright

**Animation rules:**
- Hero background: 3-4 radial gradient blobs, slow drift, 10-15s CSS keyframe loop
- Navbar: transparent → blur+border on scroll (IntersectionObserver)
- Sections: fade + slight translateY(8px) on scroll into view
- NO particles, NO confetti, NO aggressive motion

---

### 4.2 Auth Pages (`/login`, `/register`)
- Centered card on dark background, no sidebar
- Register fields: Full Name, Email, Password, Role (Wholesaler / Investor / Agent)
- Login fields: Email, Password
- Role selection affects default dashboard layout and terminology
- JWT auth stored in localStorage under key 'parcel_token'. Token is attached to all requests via Bearer header in frontend/src/lib/api.ts.

---

### 4.3 Dashboard (`/dashboard`)

**Empty State (first login):**
- Welcome message: "Welcome, [Name]. Let's analyze your first deal."
- Single large CTA card: "Analyze Your First Deal →"
- 3 small feature hint cards below (pipeline, documents, chat)
- No empty charts or placeholder KPIs — clean, intentional

**Populated State (after first deal):**
- Top row: 4 KPI cards (Total Deals Analyzed · Active Pipeline Deals · Avg Cash-on-Cash · Portfolio Cash Flow)
- Left column: Recent Deals list (last 5)
- Right column: Pipeline summary (count per stage) + Quick Analyze button
- Bottom: Recent Documents (if any)
- All numbers use JetBrains Mono font
- KPI cards animate count-up on load

---

### 4.4 Deal Analyzer (`/analyze`)
**Purpose:** The core product feature. Multi-strategy deal calculator.

**Step 1 — Strategy Selection:**
- 5 strategy cards: Wholesale · Creative Finance · BRRRR · Buy & Hold · Flip
- Each card has icon, name, short description, color-coded badge
- User clicks one → form adapts to that strategy's inputs

**Step 2 — Property Details (all strategies):**
- Property address (text input)
- Asking price
- Bedrooms / Bathrooms / Sqft / Year Built
- Property type (Single Family / Duplex / Triplex / Quad / Commercial)
- Market (ZIP code)

**Step 3 — Strategy-Specific Inputs:**

*Wholesale:*
- ARV (After Repair Value)
- Estimated Repair Costs
- Desired Profit Margin
- Holding Costs
- Closing Costs %
- → Outputs: MAO (Maximum Allowable Offer), Profit at MAO, Deal Score

*Creative Finance (Subject-To / Seller Finance):*
- Existing loan balance
- Existing interest rate
- Monthly PITI
- New terms (if seller finance)
- Monthly rent estimate
- → Outputs: Monthly cash flow, equity position, DSCR, cost of capital

*BRRRR:*
- Purchase price
- Rehab costs
- ARV post-rehab
- Refinance LTV %
- New loan rate
- Monthly rent
- Monthly expenses
- → Outputs: Cash left in deal, cash-on-cash return, equity captured, monthly cash flow

*Buy & Hold:*
- Purchase price
- Down payment %
- Interest rate / Loan term
- Monthly rent
- Monthly expenses (taxes, insurance, maintenance, vacancy, mgmt)
- → Outputs: Cap rate, cash-on-cash, NOI, monthly cash flow, break-even rent

*Flip:*
- Purchase price
- Rehab budget
- ARV
- Holding period (months)
- Selling costs %
- → Outputs: Gross profit, net profit, ROI, annualized return

**Step 4 — Results Page (auto-navigates after calculation):**
→ See 4.5

---

### 4.5 Deal Results (`/analyze/results/:dealId`)
**Purpose:** Show the deal analysis output clearly and compellingly.

**Layout:**
- Top: Property address + strategy badge + "Save Deal" button + "Share" button
- KPI cards row: 4 primary metrics for the strategy (e.g., for Buy & Hold: Cap Rate · Cash-on-Cash · Monthly Cash Flow · NOI)
- Risk Score: circular gauge 0-100 · label (Low/Medium/High/Critical) · color coded
- Recommendation card: AI-generated 3-sentence recommendation (Claude API)
- Financial breakdown: expandable table showing all inputs and calculated outputs
- Charts: Recharts — cash flow projection (12 months), equity growth
- Action buttons: Save to Deals · Add to Pipeline · Generate Offer Letter · Analyze Another

**Risk Score Factors (hand-written business logic — interview-critical):**
- Cash flow margin (is it positive?)
- DSCR (debt service coverage ratio)
- Vacancy risk (market-based)
- Repair cost % of ARV
- Days on market trend
- LTV ratio
- Price per sqft vs market

---

### 4.6 My Deals (`/deals`)
- Card grid of all saved deals
- Filter by: strategy, status, date, ZIP code, min/max ROI
- Sort by: newest, ROI, cash flow, risk score
- Each card: address · strategy badge · primary metric · status pill · quick actions
- Clicking a card → goes to that deal's results page

---

### 4.7 Pipeline (`/pipeline`)
**Purpose:** Kanban board to track deals through the transaction process.

**Columns:** Lead → Analyzing → Offer Sent → Under Contract → Due Diligence → Closed → Dead

**Card contains:** Property address · strategy badge · asking price · days in current stage

**Features:**
- Drag-and-drop between columns (dnd-kit)
- Click card → opens deal detail panel (right slide-out)
- Add new deal card directly from pipeline
- Stage timestamps (when did it enter this stage?)
- Archive dead deals (not permanent delete)

---

### 4.8 Portfolio (`/portfolio`)
**Purpose:** Track performance of closed deals over time.

**Metrics:**
- Total equity across all closed deals
- Total monthly cash flow (active rentals)
- Annualized average return
- Total profit (flips + wholesale fees)

**Views:**
- Summary cards (KPIs)
- Deals table (all closed deals, key metrics)
- Cash flow chart (monthly, Recharts area chart)
- Equity growth chart (cumulative)

---

### 4.9 Documents (`/documents`)
**Purpose:** Upload and AI-analyze real estate documents.

**Supported formats:** PDF, DOCX

**Flow:**
1. User drags/drops or selects file
2. File uploads → stored (Railway file storage or Cloudinary)
3. Claude API processes: extracts key terms, flags risk clauses, generates plain-English summary
4. User sees: summary card + risk flags list + key terms extracted + full document chat

**Document Chat:**
- Right panel chat interface
- Context: Claude has read the document and can answer questions about it
- Example questions: "What are the contingencies?" "Is there an inspection period?" "What happens if the buyer defaults?"

**Document types handled:**
- Purchase agreements
- Lease agreements
- Assignment contracts
- Subject-to agreements
- Seller finance agreements
- Due diligence checklists

---

### 4.10 AI Chat (`/chat`)
**Purpose:** Dedicated page for the Parcel AI real estate specialist.

**Persona:** Expert who knows wholesale, creative finance, BRRRR, DSCR, subject-to, seller finance, cap rates, NOI, ARV, MAO — speaks like an experienced investor, not a textbook.

**Context awareness:**
- If user came from a deal page → chat knows the deal details
- If user came from a document → chat knows the document content
- Otherwise → general real estate Q&A

**Features:**
- Full message history for the session
- Renders markdown (bold, lists, tables, formulas)
- Concept explainer mode: user can ask "what is subject-to?" and get a clear, jargon-free explanation with a real example
- Suggested questions (shown in empty state)

---

### 4.11 Settings (`/settings`)
- Profile (name, email, role, avatar)
- Notification preferences
- Team management (invite members, set roles: Owner / Analyst / Viewer)
- API/integrations (future: RentCast key, MLS)
- Danger zone (delete account)

---

### 4.12 Shared Deal (`/share/:dealId`)
- Public, read-only, no auth required
- Shows deal results in a clean, branded layout
- "Powered by Parcel" watermark at bottom
- CTA: "Analyze your own deals — get started free"
- No sidebar, no navigation — clean presentation

---

## 5. Data Model

```sql
-- Every table has team_id + user_id from day one (critical for future team features)

users (id, name, email, password_hash, role, created_at)
teams (id, name, created_by, created_at)
team_members (id, team_id, user_id, role: owner|analyst|viewer, joined_at)

deals (
  id, user_id, team_id,
  address, zip_code, property_type,
  strategy: wholesale|creative_finance|brrrr|buy_hold|flip,
  inputs JSONB,        -- strategy-specific inputs stored as JSON
  outputs JSONB,       -- calculated results stored as JSON
  risk_score INT,
  status: draft|saved|shared,
  created_at, updated_at
)

pipeline_entries (
  id, deal_id, user_id, team_id,
  stage: lead|analyzing|offer_sent|under_contract|due_diligence|closed|dead,
  entered_stage_at, notes,
  created_at
)

documents (
  id, user_id, team_id,
  filename, file_url, file_type,
  doc_type: purchase_agreement|lease|assignment|subject_to|seller_finance|other,
  ai_summary TEXT,
  ai_risk_flags JSONB,
  ai_key_terms JSONB,
  processing_status: pending|processing|ready|error,
  deal_id (nullable — can link to a deal),
  created_at
)

chat_messages (
  id, user_id, session_id,
  role: user|assistant,
  content TEXT,
  context_type: general|deal|document (nullable),
  context_id (nullable — deal_id or document_id),
  created_at
)

portfolio_entries (
  id, deal_id, user_id, team_id,
  closed_date, closed_price, profit, monthly_cash_flow,
  notes,
  created_at
)
```

---

## 6. API Routes

```
AUTH
POST   /auth/register
POST   /auth/login
POST   /auth/logout
GET    /auth/me

DEALS
POST   /deals                    # create + calculate
GET    /deals                    # list (filtered)
GET    /deals/:id                # get one
PUT    /deals/:id                # update
DELETE /deals/:id                # soft delete
GET    /deals/:id/share          # public share view

PIPELINE
GET    /pipeline                 # all entries for user
POST   /pipeline                 # add deal to pipeline
PUT    /pipeline/:id/stage       # move to new stage
DELETE /pipeline/:id             # remove from pipeline

DOCUMENTS
POST   /documents/upload         # upload + trigger AI processing
GET    /documents                # list
GET    /documents/:id            # get one with AI results
DELETE /documents/:id
POST   /documents/:id/chat       # chat about a document

CHAT
POST   /chat                     # send message, get AI response (streaming)
GET    /chat/history             # get session history

PORTFOLIO
GET    /portfolio                # summary + all entries
POST   /portfolio                # add closed deal
PUT    /portfolio/:id
DELETE /portfolio/:id

TEAMS
POST   /teams                    # create team
GET    /teams/me                 # get user's team
POST   /teams/invite             # invite member
PUT    /teams/members/:id/role   # change role
DELETE /teams/members/:id        # remove member
```

---

## 7. Business Logic (Hand-Written — Do Not Let AI Write These)

These functions must be written by Ivan, not generated by Claude Code. They are interview-critical.

```python
# backend/core/calculators/

wholesale.py
  → calculate_mao(arv, repair_costs, desired_profit, holding_costs, closing_pct)
  → calculate_deal_score(mao, asking_price, arv, repair_costs)

creative_finance.py
  → calculate_subject_to(existing_balance, existing_rate, piti, rent, expenses)
  → calculate_seller_finance(purchase_price, terms, rent, expenses)
  → calculate_dscr(noi, debt_service)

brrrr.py
  → calculate_brrrr(purchase, rehab, arv, refi_ltv, refi_rate, rent, expenses)
  → calculate_cash_left_in_deal(purchase, rehab, refi_proceeds)

buy_hold.py
  → calculate_cap_rate(noi, purchase_price)
  → calculate_cash_on_cash(annual_cash_flow, total_cash_invested)
  → calculate_noi(gross_rent, vacancy_rate, expenses)
  → calculate_monthly_cash_flow(noi, debt_service)

flip.py
  → calculate_flip_profit(purchase, rehab, arv, holding_months, selling_pct)
  → calculate_annualized_roi(profit, total_invested, holding_months)

risk_scoring.py
  → calculate_risk_score(deal_outputs, market_data) → int 0-100
  → 7 weighted factors, returns composite score
```

---

## 8. AI Integration Points

All Claude API calls live in `backend/core/ai/`

```python
deal_recommendation.py
  → generate_recommendation(deal_outputs, strategy) → 3-sentence recommendation

document_processor.py
  → extract_key_terms(document_text) → structured JSON
  → generate_summary(document_text) → plain English paragraph
  → flag_risk_clauses(document_text) → list of risk items with severity

chat_specialist.py
  → stream_response(message, context_type, context_data, history) → SSE stream
  → SYSTEM PROMPT: "You are a real estate investment specialist..."

offer_letter_generator.py
  → generate_offer_letter(deal_data, user_data) → formatted offer letter text
```

---

## 9. Design System Reference

See `design-brief.jsonc` in the root of this repository for the complete design system including colors, typography, component specs, motion rules, and layout guidelines.

**Key rules:**
- All financial numbers use JetBrains Mono font
- Dark background only (#08080F base)
- Primary accent: Indigo (#6366F1)
- Mercury-style sidebar + topbar for app shell
- Stripe-style animated gradient on landing page hero
- shadcn/ui for forms, dialogs, dropdowns
- Recharts for all charts
- dnd-kit for drag-and-drop pipeline

---

## 10. Non-Negotiables

1. **Deploy early and often.** Every phase ends with a working deployment.
2. **Hand-write all business logic.** Never let Claude Code write calculator functions.
3. **team_id on every table.** Even if teams aren't built yet, the column exists.
4. **Skeleton screens, not spinners.** Loading states use shimmer skeletons.
5. **Mobile-responsive.** Not mobile-first, but nothing should break on mobile.
6. **TypeScript strict mode.** No `any` types.
7. **Error boundaries.** Every page has an error state, not just a blank screen.

---

## 11. Out of Scope (For Now)

- MLS integration
- Native mobile app
- Zapier/API integrations
- Email notifications
- Payment processing (pricing page is UI only for now)
- Map/satellite view of properties
- Contractor management / scope of work (Phase 5+)
