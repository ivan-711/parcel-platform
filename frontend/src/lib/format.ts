/** Shared formatting utilities for deal output values. */

/** Format a byte count into a human-readable file size. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Format a document_type string into a readable label, with null fallback. */
export function formatDocumentType(type: string | null): string {
  if (!type) return 'Document'
  return formatLabel(type)
}

/** Domain-specific label overrides for output keys. */
const LABEL_OVERRIDES: Record<string, string> = {
  mao: 'MAO',
  arv: 'ARV',
  coc_return: 'Cash-on-Cash Return',
  annual_noi: 'Annual NOI',
  noi_annual: 'NOI Annual',
  monthly_noi: 'Monthly NOI',
  roi: 'ROI',
  annualized_roi: 'Annualized ROI',
  dscr: 'DSCR',
  arv_post_rehab: 'ARV Post-Rehab',
  monthly_piti: 'Monthly PITI',
  monthly_pi: 'Monthly P&I',
  grm: 'GRM',
}

/** Format an output key into a human-readable label. */
export function formatLabel(key: string): string {
  if (LABEL_OVERRIDES[key]) return LABEL_OVERRIDES[key]
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Format a numeric value as currency. */
export function formatCurrency(value: number): string {
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

/** Format a numeric value as a percentage. */
export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`
}

/** Color class for recommendation badge. */
export function getRecommendationColor(value: string): string {
  const lower = value.toLowerCase()
  if (lower.includes('strong') || lower.includes('good')) return 'bg-emerald-500/20 text-emerald-400'
  if (lower.includes('marginal') || lower.includes('caution')) return 'bg-amber-500/20 text-amber-400'
  return 'bg-red-500/20 text-red-400'
}

/** Determine if an output key should be formatted as a percentage. */
export function isPercentKey(key: string): boolean {
  const lower = key.toLowerCase()
  return /rate|return|pct|cap_rate|coc|roi|vacancy|maintenance|mgmt|yield/.test(lower)
}

/** Determine if an output key should be formatted as currency. */
export function isCurrencyKey(key: string): boolean {
  const lower = key.toLowerCase()
  return /price|cost|payment|flow|income|rent|noi|mao|profit|equity|down|taxes|insurance|proceeds|money_left|all_in|monthly_pi|mgmt|maintenance/.test(lower)
}

/** Format an output value based on its key name. */
export function formatOutputValue(key: string, value: number | string | null | undefined): string {
  if (key === 'finance_type' && typeof value === 'string') {
    return value
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  if (value === null || value === undefined) {
    return isPercentKey(key) ? '\u221E' : 'N/A'
  }
  if (typeof value === 'string') return value
  if (isPercentKey(key)) return formatPercent(value)
  if (isCurrencyKey(key)) return formatCurrency(value)
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 })
}
