// ─────────────────────────────────────────────────────────────────────────────
// ADD these methods to your api object in frontend/src/lib/api.ts
// ─────────────────────────────────────────────────────────────────────────────
// Merge into the existing api export, e.g.:
//
//   export const api = {
//     auth: { ... },
//     deals: { ... },
//     pipeline: pipelineApi,   // <-- add this
//     dashboard: { ... },
//   }
// ─────────────────────────────────────────────────────────────────────────────

const pipelineApi = {
  /** GET /api/v1/pipeline/ — returns all 7 stage columns */
  list: () =>
    apiFetch<{ data: Record<string, PipelineCard[]> }>('/api/v1/pipeline/'),

  /** POST /api/v1/pipeline/ — add a deal to the pipeline */
  create: (body: { deal_id: string; stage: string }) =>
    apiFetch<PipelineEntry>('/api/v1/pipeline/', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  /** PUT /api/v1/pipeline/:id/stage — move a card to a new stage */
  updateStage: (pipelineId: string, body: { stage: string; notes?: string }) =>
    apiFetch<PipelineEntry>(`/api/v1/pipeline/${pipelineId}/stage/`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  /** DELETE /api/v1/pipeline/:id — remove a card from the pipeline */
  remove: (pipelineId: string) =>
    apiFetch<{ message: string }>(`/api/v1/pipeline/${pipelineId}/`, {
      method: 'DELETE',
    }),
}

// ─────────────────────────────────────────────────────────────────────────────
// ADD these TypeScript types to frontend/src/types/pipeline.ts (create if needed)
// ─────────────────────────────────────────────────────────────────────────────

export type Stage =
  | 'lead'
  | 'analyzing'
  | 'offer_sent'
  | 'under_contract'
  | 'due_diligence'
  | 'closed'
  | 'dead'

export interface PipelineCard {
  pipeline_id: string
  deal_id: string
  address: string
  strategy: string
  asking_price: number
  stage: Stage
  days_in_stage: number
  entered_stage_at: string
}

export interface PipelineEntry {
  id: string
  deal_id: string
  stage: Stage
  notes: string | null
  created_at: string
}
