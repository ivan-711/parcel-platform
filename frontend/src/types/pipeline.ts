/** Pipeline-specific TypeScript types. */

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
  asking_price: number | null
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
