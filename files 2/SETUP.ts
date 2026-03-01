// ─────────────────────────────────────────────────────────────────────────────
// SETUP CHECKLIST — Pipeline Kanban
// ─────────────────────────────────────────────────────────────────────────────

// ── 1. Install dnd-kit (if not already) ──────────────────────────────────────
// cd frontend
// npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

// ── 2. Add route in frontend/src/App.tsx (or your router file) ───────────────
//
// import PipelinePage from '@/pages/pipeline/PipelinePage'
//
// Inside your <Routes>:
//   <Route path="/pipeline" element={<PipelinePage />} />

// ── 3. Place the file ─────────────────────────────────────────────────────────
// frontend/src/pages/pipeline/PipelinePage.tsx

// ── 4. Update api.ts ──────────────────────────────────────────────────────────
// Merge api-pipeline-additions.ts into frontend/src/lib/api.ts
// Add the pipelineApi object and export it as api.pipeline

// ── 5. Add types ──────────────────────────────────────────────────────────────
// Create frontend/src/types/pipeline.ts with the Stage / PipelineCard / PipelineEntry
// types from api-pipeline-additions.ts
// Then update the import in PipelinePage.tsx:
//   import type { Stage, PipelineCard } from '@/types/pipeline'

// ── 6. Apply bug fixes ────────────────────────────────────────────────────────
// See fix1-backend-metric-map.py  → backend/routers/deals.py
// See fix2-3-5-frontend-patches.ts → frontend/src/pages/analyze/ResultsPage.tsx
//                                    frontend/src/pages/analyze/AnalyzerFormPage.tsx

// ── 7. Build check ────────────────────────────────────────────────────────────
// cd frontend && npx tsc --noEmit && npm run build
