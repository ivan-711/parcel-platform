/** Shared constants, types, and configuration for the pipeline Kanban board. */

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

export const STAGES: { key: Stage; label: string; color: string }[] = [
  { key: 'lead',           label: 'Lead',           color: '#475569' },
  { key: 'analyzing',      label: 'Analyzing',      color: '#6366F1' },
  { key: 'offer_sent',     label: 'Offer Sent',     color: '#F59E0B' },
  { key: 'under_contract', label: 'Under Contract', color: '#3B82F6' },
  { key: 'due_diligence',  label: 'Due Diligence',  color: '#8B5CF6' },
  { key: 'closed',         label: 'Closed',         color: '#10B981' },
  { key: 'dead',           label: 'Dead',           color: '#EF4444' },
]

export const STRATEGY_COLORS: Record<string, { bg: string; text: string }> = {
  wholesale:        { bg: '#451A03', text: '#FCD34D' },
  creative_finance: { bg: '#2E1065', text: '#C4B5FD' },
  brrrr:            { bg: '#0C1A4A', text: '#93C5FD' },
  buy_and_hold:     { bg: '#064E3B', text: '#6EE7B7' },
  flip:             { bg: '#431407', text: '#FCA5A1' },
}

export const STRATEGY_LABELS: Record<string, string> = {
  wholesale:        'Wholesale',
  creative_finance: 'Creative Finance',
  brrrr:            'BRRRR',
  buy_and_hold:     'Buy & Hold',
  flip:             'Flip',
}
