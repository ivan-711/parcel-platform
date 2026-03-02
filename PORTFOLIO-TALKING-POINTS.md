# Portfolio Talking Points

Interview-ready answers for discussing the Parcel platform.

---

## "Walk me through this project."

Parcel is a full-stack SaaS platform I built for real estate investors. The core problem is that investors currently juggle 4-6 separate tools — a spreadsheet for deal analysis, a CRM for pipeline tracking, a separate tool for document review, and maybe a portfolio tracker. Parcel replaces all of them with one workspace.

The frontend is React with TypeScript in strict mode — zero `any` types across 15,000 lines. The backend is FastAPI with PostgreSQL. I integrated the Claude AI API for three features: a streaming chat specialist that understands real estate investment concepts, document processing that extracts key terms, risk flags, and financial figures from uploaded contracts, and one-click offer letter generation.

The deal analysis engine supports five investment strategies — wholesale, BRRRR, buy-and-hold, flip, and creative finance. Each has its own calculator with strategy-specific inputs and outputs, plus a composite risk scoring system that weighs 7 factors. Users can compare deals side-by-side with a radar chart, generate PDF reports, and share analysis pages via public URLs.

The pipeline is a Kanban board with drag-and-drop, 7 stages, days-in-stage tracking, and a flow to close deals directly into a portfolio dashboard. The whole thing is deployed — React on Vercel, FastAPI on Railway with managed PostgreSQL — with a CI pipeline that runs TypeScript checks, 44 tests, and a production build on every push.

---

## "What was the hardest technical challenge?"

**The streaming AI chat architecture.** The challenge wasn't just getting Claude's API to stream — it was building the full pipeline correctly. The backend uses FastAPI's `StreamingResponse` with Server-Sent Events, and the frontend consumes that with a `ReadableStream` reader that processes chunks as they arrive. I had to handle partial JSON chunks that split across stream boundaries, implement proper connection cleanup on component unmount, and add a typing indicator that appears before the first token arrives.

The context injection was the interesting design decision. When a user chats about a specific deal, I inject the full deal analysis (inputs, outputs, risk factors) directly into the system prompt rather than using RAG. I considered RAG but decided against it — the context window is large enough to hold a deal analysis, and RAG would have added retrieval latency, an embedding pipeline, and a vector database for a problem that fits cleanly in-context. The tradeoff is that this approach won't scale to thousands of documents per user, but for the current use case (one deal or one document per conversation), direct injection gives faster first-token latency and simpler architecture.

**Second hardest: the drag-and-drop Kanban board.** Getting dnd-kit to work smoothly across 7 columns with cross-column drags, proper drop indicators, and optimistic state updates was surprisingly tricky. The card needs to lift with a subtle scale and shadow animation, columns need to glow when a card is dragged over them, and the state update needs to hit the API and roll back on failure. I also had to build a separate mobile view (tabbed stages instead of columns) because a 7-column Kanban is unusable on phones, and real estate investors frequently work from their phones at properties. I added full keyboard navigation too — arrow keys between cards and columns, Enter to open, Escape to deselect.

---

## "Why did you make [X] architectural decision?"

### "Why httpOnly cookies instead of localStorage for JWTs?"

Security. A single XSS vulnerability would expose every token stored in localStorage — `document.cookie` reads them, `window.localStorage.getItem` reads them, and any injected script has full access. httpOnly cookies are invisible to JavaScript entirely. The browser sends them automatically, so the frontend doesn't need to manage tokens at all — I just set `credentials: 'include'` on fetch calls. The tradeoff is that cookies require CORS configuration and are slightly more complex to debug (you can't inspect them in the browser console), but the security improvement is worth it.

### "Why split deployment (Vercel + Railway) instead of a monolith?"

Three reasons. First, the frontend serves from Vercel's global CDN — the landing page loads from an edge node close to the user, not from a single origin server. Second, independent scaling — the API server scales based on request volume while the frontend is just static files. Third, deployment isolation — a backend deploy with a bad migration doesn't take down the frontend, and a frontend deploy with a CSS regression doesn't require restarting the API server.

The tradeoff is managing two deployment targets and CORS configuration, but in practice that's a one-time setup cost. The latency benefit for a marketing-heavy landing page is significant.

### "Why JSONB for calculator inputs/outputs instead of typed columns?"

Each of the five strategies has a completely different input schema. Wholesale needs ARV, repair costs, and desired profit. Buy-and-hold needs loan terms, rental income, and expense ratios. That's 30+ unique fields across strategies. Typed columns would mean either a 50+ column table (mostly null for any given deal) or 5 separate tables that need JOINs on every query.

JSONB gives me schema flexibility — adding a field to a calculator requires zero Alembic migrations. PostgreSQL's JSONB operators let me index and query into the JSON when needed. The tradeoff is that the database doesn't enforce the schema — that's Pydantic's job on the API layer, and Zod's job on the frontend.

### "Why Zustand for state instead of Redux or Context?"

Zustand handles only UI state — sidebar open/close, command palette visibility, modal state. All server data goes through React Query, which handles caching, background refetching, and optimistic updates. This means the Zustand stores are tiny (under 20 lines each) and there's no action/reducer boilerplate. Redux would be over-engineered for this use case, and raw Context causes unnecessary re-renders without `useMemo` wrapping.

### "Why direct system prompt injection instead of RAG for AI context?"

The use case is one deal or one document per conversation. A deal analysis is about 2KB of structured JSON. Claude's context window comfortably holds that alongside the conversation history and system prompt. RAG would require an embedding pipeline (choosing a model, chunking strategy, similarity threshold), a vector database (Pinecone/Weaviate/pgvector), and retrieval latency on every message — all to solve a problem that fits in-context.

If the product grew to support searching across hundreds of deals or a user's entire document library, I'd add RAG. But for the current feature set, direct injection is simpler, faster, and cheaper.

---

## "What would you do differently?"

### Start with end-to-end tests from day one
I have 44 unit and component tests, which catch formatting bugs and schema regressions well. But I don't have end-to-end tests (Playwright or Cypress) that exercise the full flow — register, analyze a deal, move it through the pipeline, close it into the portfolio. These would have caught integration bugs faster than manual testing. If I were starting over, I'd set up Playwright on day one and write a single happy-path E2E test before building the second feature.

### Use a monorepo tool (Turborepo) earlier
The frontend and backend are in one repo but don't share anything — there's no shared types package, and the API contract is documented in a Markdown file that I manually keep in sync. With Turborepo and a shared `@parcel/types` package, I could generate TypeScript types from Pydantic schemas (or vice versa) and catch frontend/backend contract mismatches at compile time instead of at runtime.

### Add WebSocket support for the pipeline
The Kanban board uses optimistic updates — when you drag a card, it moves immediately and the API call happens in the background. But if two users are looking at the same pipeline (team feature), they won't see each other's changes until they refresh. WebSocket-based real-time updates would solve this. I chose not to build it because the team collaboration feature isn't implemented yet, but I'd architect the pipeline for real-time from the start if I could redo it.

### Abstract the calculator interface
The five strategy calculators were written independently with slightly different function signatures and return shapes. If I were redesigning them, I'd define a `Calculator` protocol (Python Protocol class) with a standard `calculate(inputs: dict) -> CalculatorResult` interface and a `CalculatorResult` dataclass with common fields (primary_metric, risk_factors, monthly_cash_flow). This would make adding a sixth strategy trivial and simplify the risk scoring module, which currently has strategy-specific logic paths.

### Consider tRPC or similar for type-safe API calls
The API client (`api.ts`) manually types every request and response. There's no compile-time guarantee that the frontend's type definitions match what the backend actually returns. tRPC (or a code-generated OpenAPI client from FastAPI's auto-generated schema) would give end-to-end type safety. The tradeoff is added complexity in the build pipeline, but for a project this size, the type safety pays for itself in fewer runtime surprises.
