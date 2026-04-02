/**
 * Branded PDF deal report generation (light theme).
 *
 * Produces a professional multi-page deal analysis report using jsPDF.
 * Each strategy renders its own primary KPIs. The report is designed to be
 * shared with lenders, partners, and co-investors.
 *
 * Color scheme follows the light theme spec (agent-17-pdf-theme.md):
 * - White page background with indigo-600 accent headings/rules
 * - Cool-tinted grays from Untitled UI scale for text
 * - Print-friendly: minimal background fills, high contrast ratios
 */

import { getStrategyKPIs } from '@/lib/strategy-kpis'
import type { KPIDefinition } from '@/lib/strategy-kpis'
import type { Strategy, DealResponse } from '@/types'

// ---------------------------------------------------------------------------
// Color constants (light theme — per agent-17-pdf-theme.md)
// ---------------------------------------------------------------------------

// Brand accent
const INDIGO_600: [number, number, number] = [79, 70, 229]
const INDIGO_50: [number, number, number] = [238, 240, 255]

// Neutral text & backgrounds
const GRAY_900: [number, number, number] = [16, 24, 40]
const GRAY_700: [number, number, number] = [52, 64, 84]
const GRAY_500: [number, number, number] = [102, 112, 133]
const GRAY_300: [number, number, number] = [208, 213, 221]
const GRAY_200: [number, number, number] = [234, 236, 240]
const WHITE: [number, number, number] = [255, 255, 255]

// Semantic: cash flow / risk
const SUCCESS_700: [number, number, number] = [4, 120, 87]
const WARNING_600: [number, number, number] = [217, 119, 6]
const ERROR_700: [number, number, number] = [185, 28, 28]
const CRITICAL: [number, number, number] = [127, 29, 29]

// Strategy badge colors (from design tokens — pastel bg, dark text)
const STRATEGY_COLORS: Record<Strategy, { bg: [number, number, number]; text: [number, number, number] }> = {
  wholesale: { bg: [254, 243, 199], text: [146, 64, 14] },
  creative_finance: { bg: [237, 233, 254], text: [91, 33, 182] },
  brrrr: { bg: [219, 234, 254], text: [30, 64, 175] },
  buy_and_hold: { bg: [209, 250, 229], text: [6, 95, 70] },
  flip: { bg: [255, 228, 230], text: [159, 18, 57] },
}

// Cash-flow-sensitive keys that get green coloring when positive
const CASH_FLOW_KEYS = [
  'monthly_cash_flow', 'annual_cash_flow', 'net_profit',
  'total_profit', 'cash_flow', 'spread',
]

// ---------------------------------------------------------------------------
// Formatting helpers (PDF-specific, no `any`)
// ---------------------------------------------------------------------------

function formatStrategyLabel(strategy: Strategy): string {
  const map: Record<Strategy, string> = {
    wholesale: 'WHOLESALE',
    creative_finance: 'CREATIVE FINANCE',
    brrrr: 'BRRRR',
    buy_and_hold: 'BUY & HOLD',
    flip: 'FIX & FLIP',
  }
  return map[strategy]
}

function getRiskLabel(score: number): string {
  if (score <= 30) return 'Low Risk'
  if (score <= 60) return 'Medium Risk'
  if (score <= 80) return 'High Risk'
  return 'Critical Risk'
}

function getRiskColor(score: number): [number, number, number] {
  if (score <= 30) return SUCCESS_700
  if (score <= 60) return WARNING_600
  if (score <= 80) return ERROR_700
  return CRITICAL
}

function isPercentKey(key: string): boolean {
  return /rate|return|pct|cap_rate|coc|roi|vacancy|maintenance_pct|mgmt_pct|yield/i.test(key)
}

function isCurrencyKey(key: string): boolean {
  return /price|cost|payment|flow|income|rent|noi|mao|profit|equity|down|taxes|insurance|proceeds|money_left|all_in|monthly_pi|budget|fee|deposit|loan|amount|arv|spread/i.test(key)
}

function formatPDFValue(key: string, value: number | string | null | undefined): string {
  if (value === null || value === undefined) return 'N/A'
  if (typeof value === 'string') {
    // Try parsing as number for formatted output
    const parsed = parseFloat(value)
    if (isNaN(parsed)) {
      return value
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    }
    return formatPDFValue(key, parsed)
  }
  if (isPercentKey(key)) return `${value.toFixed(2)}%`
  if (isCurrencyKey(key)) return `$${Math.round(value).toLocaleString('en-US')}`
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

function formatKPIValue(kpi: KPIDefinition, rawValue: number | string | null | undefined): string {
  if (rawValue === null || rawValue === undefined) {
    if (kpi.format === 'percent_or_infinite') return '\u221E'
    return 'N/A'
  }
  if (typeof rawValue === 'string') return rawValue
  switch (kpi.format) {
    case 'currency':
      return `$${Math.round(rawValue).toLocaleString('en-US')}`
    case 'percent':
    case 'percent_or_infinite':
      return `${rawValue.toFixed(2)}%`
    case 'decimal':
      return rawValue.toFixed(2)
    default:
      return rawValue.toLocaleString('en-US', { maximumFractionDigits: 2 })
  }
}

function formatInputLabel(key: string): string {
  const overrides: Record<string, string> = {
    mao: 'MAO',
    arv: 'ARV',
    noi: 'NOI',
    roi: 'ROI',
    dscr: 'DSCR',
    grm: 'GRM',
    monthly_piti: 'Monthly PITI',
    monthly_pi: 'Monthly P&I',
  }
  if (overrides[key]) return overrides[key]
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

// ---------------------------------------------------------------------------
// Page header / footer helpers
// ---------------------------------------------------------------------------

const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const MARGIN = 15
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const HEADER_HEIGHT = 22
const FOOTER_HEIGHT = 18

function drawPageHeader(doc: any): void {
  // Logo icon — indigo rounded square
  doc.setFillColor(...INDIGO_600)
  doc.roundedRect(MARGIN, 6, 8, 8, 1.5, 1.5, 'F')
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...WHITE)
  doc.text('P', MARGIN + 4, 12.5, { align: 'center' })

  // Brand name
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...INDIGO_600)
  doc.text('PARCEL', MARGIN + 11, 13)

  // Tagline
  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...GRAY_500)
  doc.text('Real Estate Deal Intelligence', PAGE_WIDTH - MARGIN, 13, { align: 'right' })

  // Accent underline (margin-to-margin, not full bleed)
  doc.setDrawColor(...INDIGO_600)
  doc.setLineWidth(0.8)
  doc.line(MARGIN, HEADER_HEIGHT, PAGE_WIDTH - MARGIN, HEADER_HEIGHT)
}

function drawPageFooter(doc: any, pageNum: number, totalPages: number, dateStr: string): void {
  const y = PAGE_HEIGHT - FOOTER_HEIGHT
  doc.setDrawColor(...GRAY_300)
  doc.setLineWidth(0.3)
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y)

  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...GRAY_500)
  doc.text(`Generated by Parcel  |  ${dateStr}  |  parcel-platform.com`, MARGIN, y + 7)
  doc.text(`Page ${pageNum} of ${totalPages}`, PAGE_WIDTH - MARGIN, y + 7, { align: 'right' })

  // Legal disclaimer
  doc.setFontSize(6)
  doc.text(
    'For informational purposes only. Not an appraisal, financial advice, or investment recommendation. AI content may contain errors.',
    MARGIN, y + 11
  )
}

function contentStartY(): number {
  return HEADER_HEIGHT + 10
}

function maxContentY(): number {
  return PAGE_HEIGHT - FOOTER_HEIGHT - 8
}

// ---------------------------------------------------------------------------
// Table drawing
// ---------------------------------------------------------------------------

interface TableRow {
  label: string
  value: string
  /** Raw numeric value for cash-flow coloring (optional). */
  rawNumeric?: number
  /** Whether this key is a cash-flow-sensitive key. */
  isCashFlow?: boolean
}

function drawTable(doc: any, title: string, rows: TableRow[], startY: number): number {
  let y = startY

  // Check if we need a new page just for the title
  if (y + 20 > maxContentY()) {
    doc.addPage()
    drawPageHeader(doc)
    y = contentStartY()
  }

  // Section title
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...INDIGO_600)
  doc.text(title, MARGIN, y)
  y += 2

  // Thin accent line under title
  doc.setDrawColor(...INDIGO_600)
  doc.setLineWidth(0.4)
  doc.line(MARGIN, y, MARGIN + CONTENT_WIDTH, y)
  y += 6

  const ROW_HEIGHT = 7
  const LABEL_X = MARGIN + 2
  const VALUE_X = PAGE_WIDTH - MARGIN - 2

  for (let i = 0; i < rows.length; i++) {
    if (y + ROW_HEIGHT > maxContentY()) {
      doc.addPage()
      drawPageHeader(doc)
      y = contentStartY()
    }

    const row = rows[i]
    const bgColor = i % 2 === 0 ? GRAY_200 : WHITE
    doc.setFillColor(...bgColor)
    doc.rect(MARGIN, y - 4.5, CONTENT_WIDTH, ROW_HEIGHT, 'F')

    // Label
    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...GRAY_500)
    doc.text(row.label, LABEL_X, y)

    // Value (monospace for financial numbers) with cash-flow coloring
    doc.setFont('Courier', 'bold')
    doc.setFontSize(9)
    if (row.isCashFlow && row.rawNumeric !== undefined && row.rawNumeric > 0) {
      doc.setTextColor(...SUCCESS_700)
    } else if (row.rawNumeric !== undefined && row.rawNumeric < 0) {
      doc.setTextColor(...ERROR_700)
    } else {
      doc.setTextColor(...GRAY_700)
    }
    doc.text(row.value, VALUE_X, y, { align: 'right' })

    y += ROW_HEIGHT
  }

  // Table bottom border
  doc.setDrawColor(...GRAY_300)
  doc.setLineWidth(0.2)
  doc.line(MARGIN, y - 3.5, MARGIN + CONTENT_WIDTH, y - 3.5)

  return y + 4
}

// ---------------------------------------------------------------------------
// KPI grid (2x2)
// ---------------------------------------------------------------------------

function drawKPIGrid(
  doc: any,
  kpis: KPIDefinition[],
  outputs: Record<string, number | string>,
  startY: number,
): number {
  const CARD_W = (CONTENT_WIDTH - 6) / 2
  const CARD_H = 28
  const GAP = 6

  let y = startY

  for (let i = 0; i < kpis.length; i++) {
    const col = i % 2
    const row = Math.floor(i / 2)
    const x = MARGIN + col * (CARD_W + GAP)
    const cardY = y + row * (CARD_H + GAP)

    // Card background with border (INDIGO_50 fill, GRAY_300 border)
    doc.setFillColor(...INDIGO_50)
    doc.setDrawColor(...GRAY_300)
    doc.setLineWidth(0.3)
    doc.roundedRect(x, cardY, CARD_W, CARD_H, 3, 3, 'FD')

    // Label
    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...GRAY_500)
    doc.text(kpis[i].label.toUpperCase(), x + 6, cardY + 10)

    // Value
    const rawValue = outputs[kpis[i].key] as number | string | null | undefined
    const formattedValue = formatKPIValue(kpis[i], rawValue)
    doc.setFont('Courier', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(...GRAY_900)
    doc.text(formattedValue, x + 6, cardY + 22)
  }

  const numRows = Math.ceil(kpis.length / 2)
  return y + numRows * (CARD_H + GAP) + 4
}

// ---------------------------------------------------------------------------
// Risk score display
// ---------------------------------------------------------------------------

function drawRiskScore(doc: any, score: number, startY: number): number {
  let y = startY

  if (y + 24 > maxContentY()) {
    doc.addPage()
    drawPageHeader(doc)
    y = contentStartY()
  }

  const label = getRiskLabel(score)
  const color = getRiskColor(score)

  // Section label
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...INDIGO_600)
  doc.text('RISK SCORE', MARGIN, y)

  // Score badge — filled rounded rect
  const badgeX = MARGIN + 42
  doc.setFillColor(...color)
  doc.roundedRect(badgeX, y - 6, 24, 9, 2, 2, 'F')
  doc.setFont('Courier', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...WHITE)
  doc.text(`${score}`, badgeX + 12, y, { align: 'center' })

  // Label text in matching semantic color
  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...color)
  doc.text(`  ${label}`, badgeX + 26, y)

  return y + 12
}

// ---------------------------------------------------------------------------
// Strategy badge
// ---------------------------------------------------------------------------

function drawStrategyBadge(doc: any, strategy: Strategy, x: number, y: number): void {
  const label = formatStrategyLabel(strategy)
  const colors = STRATEGY_COLORS[strategy]

  const textWidth = doc.getTextWidth(label)
  const badgeW = textWidth + 10
  const badgeH = 8

  doc.setFillColor(...colors.bg)
  doc.roundedRect(x, y - 6, badgeW, badgeH, 2, 2, 'F')
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...colors.text)
  doc.text(label, x + 5, y - 1)
}

// ---------------------------------------------------------------------------
// Main export function
// ---------------------------------------------------------------------------

/**
 * Generate and download a branded PDF deal analysis report.
 *
 * The report includes:
 * - Page 1: Cover with property info, strategy badge, 4 KPIs, risk score
 * - Page 2: Financial details (inputs table, outputs table, AI recommendation)
 * - Page 3 (optional): Property details if beds/baths/sqft/year data exists
 *
 * @param deal - The full DealResponse object from the API
 */
export async function generateDealReport(deal: DealResponse): Promise<void> {
  const { default: jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const strategy = deal.strategy as Strategy
  const outputs = deal.outputs ?? {}
  const inputs = deal.inputs ?? {}
  const riskScore = deal.risk_score ?? 0
  const kpis = getStrategyKPIs(strategy)

  // -----------------------------------------------------------------------
  // PAGE 1 — Cover / Summary
  // -----------------------------------------------------------------------
  drawPageHeader(doc)
  let y = contentStartY()

  // "Deal Analysis Report" subtitle
  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...GRAY_500)
  doc.text('Deal Analysis Report', MARGIN, y)
  y += 5

  // Date
  doc.setFontSize(9)
  doc.text(dateStr, MARGIN, y)
  y += 10

  // Indigo divider
  doc.setDrawColor(...INDIGO_600)
  doc.setLineWidth(0.5)
  doc.line(MARGIN, y, MARGIN + CONTENT_WIDTH, y)
  y += 10

  // Property address (large, bold)
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(...GRAY_900)

  // Wrap address if it's long
  const addressLines = doc.splitTextToSize(deal.address, CONTENT_WIDTH)
  doc.text(addressLines as string[], MARGIN, y)
  y += (addressLines as string[]).length * 8 + 4

  // Strategy badge
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(8)
  drawStrategyBadge(doc, strategy, MARGIN, y)
  y += 10

  // Zip code and property type
  if (deal.zip_code || deal.property_type) {
    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...GRAY_500)
    const details: string[] = []
    if (deal.zip_code) details.push(`ZIP: ${deal.zip_code}`)
    if (deal.property_type) details.push(`Type: ${formatInputLabel(deal.property_type)}`)
    doc.text(details.join('   |   '), MARGIN, y)
    y += 10
  }

  // KPI Grid (2x2)
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...INDIGO_600)
  doc.text('Key Metrics', MARGIN, y)
  y += 8

  y = drawKPIGrid(doc, kpis, outputs, y)

  // Risk Score
  y = drawRiskScore(doc, riskScore, y + 2)

  // AI Recommendation (if present)
  const recommendation = outputs['recommendation']
  if (recommendation && typeof recommendation === 'string') {
    y += 4
    if (y + 16 > maxContentY()) {
      doc.addPage()
      drawPageHeader(doc)
      y = contentStartY()
    }

    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...INDIGO_600)
    doc.text('AI RECOMMENDATION', MARGIN, y)
    y += 6

    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...GRAY_700)
    const recLines = doc.splitTextToSize(recommendation, CONTENT_WIDTH) as string[]
    doc.text(recLines, MARGIN, y)
    y += recLines.length * 5 + 4
  }

  // -----------------------------------------------------------------------
  // PAGE 2 — Financial Details
  // -----------------------------------------------------------------------
  doc.addPage()
  drawPageHeader(doc)
  y = contentStartY()

  // Outputs table (with cash-flow coloring)
  const outputRows: TableRow[] = Object.entries(outputs)
    .filter(([key]) => key !== 'recommendation')
    .map(([key, value]) => {
      const numericVal = typeof value === 'number' ? value : (typeof value === 'string' ? parseFloat(value) : undefined)
      return {
        label: formatInputLabel(key),
        value: formatPDFValue(key, value as number | string | null),
        rawNumeric: isNaN(numericVal as number) ? undefined : numericVal,
        isCashFlow: CASH_FLOW_KEYS.includes(key),
      }
    })

  if (outputRows.length > 0) {
    y = drawTable(doc, 'Analysis Outputs', outputRows, y)
    y += 4
  }

  // Inputs table
  const inputRows: TableRow[] = Object.entries(inputs).map(([key, value]) => ({
    label: formatInputLabel(key),
    value: formatPDFValue(key, value),
  }))

  if (inputRows.length > 0) {
    y = drawTable(doc, 'Deal Inputs', inputRows, y)
    y += 4
  }

  // Risk factors (if available)
  if (deal.risk_factors && Object.keys(deal.risk_factors).length > 0) {
    const riskRows: TableRow[] = Object.entries(deal.risk_factors).map(([key, value]) => ({
      label: formatInputLabel(key),
      value: formatPDFValue(key, value as number | string),
    }))
    y = drawTable(doc, 'Risk Factor Breakdown', riskRows, y)
  }

  // -----------------------------------------------------------------------
  // PAGE 3 (optional) — Property details, notes
  // -----------------------------------------------------------------------
  const propertyKeys = ['beds', 'baths', 'sqft', 'square_feet', 'year_built', 'lot_size']
  const propertyInputs = Object.entries(inputs).filter(([key]) =>
    propertyKeys.some((pk) => key.toLowerCase().includes(pk)),
  )

  const hasPropertyDetails = propertyInputs.length > 0
  const hasStatus = deal.status && deal.status !== 'draft'

  if (hasPropertyDetails || hasStatus) {
    doc.addPage()
    drawPageHeader(doc)
    y = contentStartY()

    if (hasPropertyDetails) {
      const propRows: TableRow[] = propertyInputs.map(([key, value]) => ({
        label: formatInputLabel(key),
        value: formatPDFValue(key, value),
      }))
      y = drawTable(doc, 'Property Details', propRows, y)
      y += 4
    }

    if (hasStatus) {
      doc.setFont('Helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(...INDIGO_600)
      doc.text('Deal Status', MARGIN, y)
      y += 6
      doc.setFont('Helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(...GRAY_700)
      doc.text(deal.status.charAt(0).toUpperCase() + deal.status.slice(1), MARGIN, y)
      y += 8
    }

    // Created / updated dates
    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...GRAY_500)
    if (deal.created_at) {
      doc.text(`Created: ${new Date(deal.created_at).toLocaleDateString('en-US')}`, MARGIN, y)
      y += 5
    }
    if (deal.updated_at) {
      doc.text(`Last Updated: ${new Date(deal.updated_at).toLocaleDateString('en-US')}`, MARGIN, y)
    }
  }

  // -----------------------------------------------------------------------
  // Draw footers on all pages
  // -----------------------------------------------------------------------
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    drawPageFooter(doc, i, totalPages, dateStr)
  }

  // -----------------------------------------------------------------------
  // Save
  // -----------------------------------------------------------------------
  const filename = `${deal.address.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-report.pdf`
  doc.save(filename)
}
