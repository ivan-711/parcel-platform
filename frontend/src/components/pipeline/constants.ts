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
  city: string | null
  state: string | null
  property_type: string | null
  is_sample: boolean
}

export const STAGES: { key: Stage; label: string; color: string }[] = [
  { key: 'lead',           label: 'Lead',           color: '#7A7872' },
  { key: 'analyzing',      label: 'Analyzing',      color: '#8B7AFF' },
  { key: 'offer_sent',     label: 'Offer Sent',     color: '#D4A867' },
  { key: 'under_contract', label: 'Under Contract', color: '#7B9FCC' },
  { key: 'due_diligence',  label: 'Due Diligence',  color: '#A89FFF' },
  { key: 'closed',         label: 'Closed',         color: '#7CCBA5' },
  { key: 'dead',           label: 'Dead',            color: '#D4766A' },
]

/* Canonical strategy badge colors — Section 1.8 of LUXURY-DESIGN-SYSTEM.md */
export const STRATEGY_COLORS: Record<string, { bg: string; text: string }> = {
  wholesale:        { bg: 'rgba(229,168,75,0.08)',  text: '#E5A84B' },
  creative_finance: { bg: 'rgba(139,122,255,0.08)', text: '#C4BEFF' },
  brrrr:            { bg: 'rgba(123,159,204,0.08)', text: '#7B9FCC' },
  buy_and_hold:     { bg: 'rgba(124,203,165,0.08)', text: '#7CCBA5' },
  flip:             { bg: 'rgba(212,118,106,0.08)', text: '#D4766A' },
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
