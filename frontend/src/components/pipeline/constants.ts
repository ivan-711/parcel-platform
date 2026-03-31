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
  { key: 'lead',           label: 'Lead',           color: '#64748B' },
  { key: 'analyzing',      label: 'Analyzing',      color: '#4D7C0F' },
  { key: 'offer_sent',     label: 'Offer Sent',     color: '#D97706' },
  { key: 'under_contract', label: 'Under Contract', color: '#3B82F6' },
  { key: 'due_diligence',  label: 'Due Diligence',  color: '#7C3AED' },
  { key: 'closed',         label: 'Closed',         color: '#059669' },
  { key: 'dead',           label: 'Dead',            color: '#DC2626' },
]

export const STRATEGY_COLORS: Record<string, { bg: string; text: string }> = {
  wholesale:        { bg: '#FEF3C7', text: '#92400E' },
  creative_finance: { bg: '#EDE9FE', text: '#5B21B6' },
  brrrr:            { bg: '#DBEAFE', text: '#1E40AF' },
  buy_and_hold:     { bg: '#D1FAE5', text: '#065F46' },
  flip:             { bg: '#FEE2E2', text: '#991B1B' },
}

export const STRATEGY_LABELS: Record<string, string> = {
  wholesale:        'Wholesale',
  creative_finance: 'Creative Finance',
  brrrr:            'BRRRR',
  buy_and_hold:     'Buy & Hold',
  flip:             'Flip',
}

/** Format a dollar amount in compact notation (e.g. "$1.2M", "$450K"). */
export function formatCompactValue(value: number): string {
  if (value === 0) return ''
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}
