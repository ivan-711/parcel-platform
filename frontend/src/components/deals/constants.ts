/** Shared constants and utility functions for the My Deals page. */

import type { Variants } from 'framer-motion'

export const STRATEGIES: { value: string; label: string }[] = [
  { value: 'all', label: 'All Strategies' },
  { value: 'wholesale', label: 'Wholesale' },
  { value: 'creative_finance', label: 'Creative Finance' },
  { value: 'brrrr', label: 'BRRRR' },
  { value: 'buy_and_hold', label: 'Buy & Hold' },
  { value: 'flip', label: 'Flip' },
]

export const STATUSES: { value: string; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'saved', label: 'Saved' },
  { value: 'shared', label: 'Shared' },
]

export const SORTS: { value: string; label: string }[] = [
  { value: 'created_at_desc', label: 'Newest First' },
  { value: 'created_at_asc', label: 'Oldest First' },
]

export const PER_PAGE = 12

export function riskColor(score: number | null): string {
  if (score === null) return 'text-text-muted'
  if (score <= 30) return 'text-accent-success'
  if (score <= 60) return 'text-yellow-400'
  return 'text-accent-danger'
}

export function statusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function formatMetricValue(label: string | null, value: number | null): string {
  if (label === null || value === null) return '—'
  const lower = label.toLowerCase()
  if (lower.includes('%') || lower.includes('rate') || lower.includes('return') || lower.includes('coc') || lower.includes('roi')) {
    return `${value.toFixed(1)}%`
  }
  if (lower.includes('$') || lower.includes('profit') || lower.includes('cash') || lower.includes('flow') || lower.includes('fee') || lower.includes('price') || lower.includes('equity')) {
    return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  }
  return value.toLocaleString('en-US', { maximumFractionDigits: 1 })
}

export const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
}

export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.18, ease: 'easeOut' },
  },
}
