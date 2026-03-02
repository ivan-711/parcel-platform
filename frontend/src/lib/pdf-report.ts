/**
 * Branded PDF deal report generation.
 *
 * Produces a professional multi-page deal analysis report using jsPDF.
 * Each strategy renders its own primary KPIs. The report is designed to be
 * shared with lenders, partners, and co-investors.
 */

import jsPDF from 'jspdf'
import { getStrategyKPIs } from '@/lib/strategy-kpis'
import type { KPIDefinition } from '@/lib/strategy-kpis'
import type { Strategy, DealResponse } from '@/types'

// ---------------------------------------------------------------------------
// Color constants (from design-brief.jsonc)
// ---------------------------------------------------------------------------

const INDIGO: [number, number, number] = [99, 102, 241]
const WHITE: [number, number, number] = [255, 255, 255]
const DARK_HEADER: [number, number, number] = [8, 8, 15]
const TEXT_PRIMARY: [number, number, number] = [30, 30, 30]
const TEXT_SECONDARY: [number, number, number] = [100, 100, 110]
const ROW_EVEN: [number, number, number] = [245, 245, 250]
const ROW_ODD: [number, number, number] = [255, 255, 255]
const BORDER_LIGHT: [number, number, number] = [220, 220, 230]

// Strategy badge colors (print-friendly versions of design-brief values)
const STRATEGY_COLORS: Record<Strategy, { bg: [number, number, number]; text: [number, number, number] }> = {
  wholesale: { bg: [255, 237, 180], text: [120, 80, 0] },
  creative_finance: { bg: [220, 210, 255], text: [80, 40, 150] },
  brrrr: { bg: [200, 220, 255], text: [30, 60, 140] },
  buy_and_hold: { bg: [200, 240, 220], text: [20, 100, 60] },
  flip: { bg: [255, 215, 210], text: [150, 40, 30] },
}

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
  if (score <= 30) return [16, 185, 129]     // success green
  if (score <= 60) return [245, 158, 11]      // warning amber
  if (score <= 80) return [239, 68, 68]       // danger red
  return [127, 29, 29]                         // critical dark red
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
const FOOTER_HEIGHT = 12

function drawPageHeader(doc: jsPDF): void {
  // Dark bar across top
  doc.setFillColor(...DARK_HEADER)
  doc.rect(0, 0, PAGE_WIDTH, HEADER_HEIGHT, 'F')

  // PARCEL text
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...WHITE)
  doc.text('PARCEL', MARGIN, 15)

  // Indigo accent line beneath header
  doc.setDrawColor(...INDIGO)
  doc.setLineWidth(0.8)
  doc.line(0, HEADER_HEIGHT, PAGE_WIDTH, HEADER_HEIGHT)
}

function drawPageFooter(doc: jsPDF, pageNum: number, totalPages: number, dateStr: string): void {
  const y = PAGE_HEIGHT - FOOTER_HEIGHT
  doc.setDrawColor(...BORDER_LIGHT)
  doc.setLineWidth(0.3)
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y)

  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...TEXT_SECONDARY)
  doc.text(`Generated by Parcel  \u2022  ${dateStr}  \u2022  parcel-platform.com`, MARGIN, y + 7)
  doc.text(`Page ${pageNum} of ${totalPages}`, PAGE_WIDTH - MARGIN, y + 7, { align: 'right' })
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
}

function drawTable(doc: jsPDF, title: string, rows: TableRow[], startY: number): number {
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
  doc.setTextColor(...INDIGO)
  doc.text(title, MARGIN, y)
  y += 2

  // Thin accent line under title
  doc.setDrawColor(...INDIGO)
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
    const bgColor = i % 2 === 0 ? ROW_EVEN : ROW_ODD
    doc.setFillColor(...bgColor)
    doc.rect(MARGIN, y - 4.5, CONTENT_WIDTH, ROW_HEIGHT, 'F')

    // Label
    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...TEXT_SECONDARY)
    doc.text(row.label, LABEL_X, y)

    // Value (monospace for financial numbers)
    doc.setFont('Courier', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...TEXT_PRIMARY)
    doc.text(row.value, VALUE_X, y, { align: 'right' })

    y += ROW_HEIGHT
  }

  return y + 4
}

// ---------------------------------------------------------------------------
// KPI grid (2x2)
// ---------------------------------------------------------------------------

function drawKPIGrid(
  doc: jsPDF,
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

    // Card background with border
    doc.setFillColor(250, 250, 255)
    doc.setDrawColor(...BORDER_LIGHT)
    doc.setLineWidth(0.3)
    doc.roundedRect(x, cardY, CARD_W, CARD_H, 3, 3, 'FD')

    // Label
    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...TEXT_SECONDARY)
    doc.text(kpis[i].label.toUpperCase(), x + 6, cardY + 10)

    // Value
    const rawValue = outputs[kpis[i].key] as number | string | null | undefined
    const formattedValue = formatKPIValue(kpis[i], rawValue)
    doc.setFont('Courier', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(...TEXT_PRIMARY)
    doc.text(formattedValue, x + 6, cardY + 22)
  }

  const numRows = Math.ceil(kpis.length / 2)
  return y + numRows * (CARD_H + GAP) + 4
}

// ---------------------------------------------------------------------------
// Risk score display
// ---------------------------------------------------------------------------

function drawRiskScore(doc: jsPDF, score: number, startY: number): number {
  let y = startY

  if (y + 24 > maxContentY()) {
    doc.addPage()
    drawPageHeader(doc)
    y = contentStartY()
  }

  const label = getRiskLabel(score)
  const color = getRiskColor(score)

  // Risk score badge
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...INDIGO)
  doc.text('RISK SCORE', MARGIN, y)

  // Score circle-like badge
  const badgeX = MARGIN + 42
  doc.setFillColor(...color)
  doc.roundedRect(badgeX, y - 6, 24, 9, 2, 2, 'F')
  doc.setFont('Courier', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...WHITE)
  doc.text(`${score}`, badgeX + 12, y, { align: 'center' })

  // Label text
  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...color)
  doc.text(`  ${label}`, badgeX + 26, y)

  return y + 12
}

// ---------------------------------------------------------------------------
// Strategy badge
// ---------------------------------------------------------------------------

function drawStrategyBadge(doc: jsPDF, strategy: Strategy, x: number, y: number): void {
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
export function generateDealReport(deal: DealResponse): void {
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
  doc.setTextColor(...TEXT_SECONDARY)
  doc.text('Deal Analysis Report', MARGIN, y)
  y += 5

  // Date
  doc.setFontSize(9)
  doc.text(dateStr, MARGIN, y)
  y += 10

  // Indigo divider
  doc.setDrawColor(...INDIGO)
  doc.setLineWidth(0.5)
  doc.line(MARGIN, y, MARGIN + CONTENT_WIDTH, y)
  y += 10

  // Property address (large, bold)
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(...TEXT_PRIMARY)

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
    doc.setTextColor(...TEXT_SECONDARY)
    const details: string[] = []
    if (deal.zip_code) details.push(`ZIP: ${deal.zip_code}`)
    if (deal.property_type) details.push(`Type: ${formatInputLabel(deal.property_type)}`)
    doc.text(details.join('   |   '), MARGIN, y)
    y += 10
  }

  // KPI Grid (2x2)
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...INDIGO)
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
    doc.setTextColor(...INDIGO)
    doc.text('AI RECOMMENDATION', MARGIN, y)
    y += 6

    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...TEXT_PRIMARY)
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

  // Outputs table
  const outputRows: TableRow[] = Object.entries(outputs)
    .filter(([key]) => key !== 'recommendation')
    .map(([key, value]) => ({
      label: formatInputLabel(key),
      value: formatPDFValue(key, value as number | string | null),
    }))

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
      doc.setTextColor(...INDIGO)
      doc.text('Deal Status', MARGIN, y)
      y += 6
      doc.setFont('Helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(...TEXT_PRIMARY)
      doc.text(deal.status.charAt(0).toUpperCase() + deal.status.slice(1), MARGIN, y)
      y += 8
    }

    // Created / updated dates
    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...TEXT_SECONDARY)
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
