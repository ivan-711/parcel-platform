/** @react-pdf/renderer Document for deal analysis PDF export. */

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'
import { registerPDFFonts } from '@/lib/pdf-fonts'
import { getStrategyKPIs } from '@/lib/strategy-kpis'
import {
  formatLabel,
  formatOutputValue,
  formatCurrency,
  formatPercent,
} from '@/lib/format'
import type { DealResponse } from '@/types'

registerPDFFonts()

const STRATEGY_COLORS: Record<string, string> = {
  wholesale: '#FCD34D',
  creative_finance: '#C4B5FD',
  brrrr: '#93C5FD',
  buy_and_hold: '#6EE7B7',
  flip: '#FCA5A1',
}

const STRATEGY_LABELS: Record<string, string> = {
  wholesale: 'Wholesale',
  creative_finance: 'Creative Finance',
  brrrr: 'BRRRR',
  buy_and_hold: 'Buy & Hold',
  flip: 'Flip',
}

function getRiskColor(score: number): string {
  if (score <= 30) return '#10B981'
  if (score <= 60) return '#F59E0B'
  return '#EF4444'
}

function getRiskLabel(score: number): string {
  if (score <= 30) return 'Low Risk'
  if (score <= 60) return 'Moderate Risk'
  return 'High Risk'
}

function formatKPIValue(
  key: string,
  value: number | string | null | undefined,
  format: string,
): string {
  if (format === 'percent_or_infinite' && (value === null || value === undefined)) {
    return '\u221E'
  }
  if (format === 'badge' && typeof value === 'string') return value
  if (value === null || value === undefined) return 'N/A'
  if (typeof value === 'string') return value
  if (format === 'percent' || format === 'percent_or_infinite') return formatPercent(value)
  if (format === 'currency') return formatCurrency(value)
  if (format === 'decimal') return value.toLocaleString('en-US', { maximumFractionDigits: 2 })
  return formatOutputValue(key, value)
}

const s = StyleSheet.create({
  page: {
    backgroundColor: '#08080F',
    padding: 40,
    fontFamily: 'Inter',
    color: '#F1F5F9',
    fontSize: 10,
  },
  /* Header */
  header: {
    marginBottom: 24,
    borderBottom: '1 solid #1A1A2E',
    paddingBottom: 16,
  },
  wordmark: {
    fontFamily: 'JetBrains Mono',
    fontWeight: 700,
    fontSize: 20,
    color: '#6366F1',
    letterSpacing: 3,
  },
  subtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  dateText: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 2,
  },
  /* Property Section */
  section: {
    backgroundColor: '#0F0F1A',
    borderRadius: 6,
    border: '1 solid #1A1A2E',
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 600,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  address: {
    fontSize: 16,
    fontWeight: 700,
    color: '#F1F5F9',
    marginBottom: 6,
  },
  strategyText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 11,
    fontWeight: 700,
  },
  propertyType: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4,
  },
  /* Risk */
  riskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  riskScore: {
    fontFamily: 'JetBrains Mono',
    fontWeight: 700,
    fontSize: 28,
  },
  riskLabel: {
    fontSize: 12,
    fontWeight: 600,
  },
  /* KPI Grid */
  kpiGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#0F0F1A',
    borderRadius: 6,
    border: '1 solid #1A1A2E',
    padding: 12,
  },
  kpiLabel: {
    fontSize: 8,
    fontWeight: 600,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  kpiValue: {
    fontFamily: 'JetBrains Mono',
    fontWeight: 700,
    fontSize: 16,
    color: '#F1F5F9',
  },
  /* Table */
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0F0F1A',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    border: '1 solid #1A1A2E',
    padding: '8 12',
  },
  tableHeaderText: {
    fontSize: 8,
    fontWeight: 600,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tableRow: {
    flexDirection: 'row',
    padding: '6 12',
    borderLeft: '1 solid #1A1A2E',
    borderRight: '1 solid #1A1A2E',
    borderBottom: '1 solid #1A1A2E',
  },
  tableRowEven: {
    backgroundColor: '#0F0F1A',
  },
  tableRowOdd: {
    backgroundColor: '#08080F',
  },
  tableLabel: {
    flex: 1,
    fontSize: 9,
    color: '#94A3B8',
  },
  tableValue: {
    flex: 1,
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    color: '#F1F5F9',
    textAlign: 'right',
  },
  /* Footer */
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTop: '1 solid #1A1A2E',
    paddingTop: 8,
  },
  footerText: {
    fontSize: 8,
    color: '#64748B',
  },
})

interface DealPDFProps {
  deal: DealResponse
}

export function DealPDF({ deal }: DealPDFProps) {
  const outputs = deal.outputs ?? {}
  const inputs = deal.inputs ?? {}
  const riskScore = deal.risk_score ?? 0
  const kpis = getStrategyKPIs(deal.strategy)
  const strategyColor = STRATEGY_COLORS[deal.strategy] ?? '#6366F1'
  const strategyLabel = STRATEGY_LABELS[deal.strategy] ?? deal.strategy
  const riskColor = getRiskColor(riskScore)
  const riskLabel = getRiskLabel(riskScore)
  const outputEntries = Object.entries(outputs)
  const inputEntries = Object.entries(inputs)
  const generatedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.wordmark}>PARCEL</Text>
          <Text style={s.subtitle}>Deal Analysis Report</Text>
          <Text style={s.dateText}>Generated {generatedDate}</Text>
        </View>

        {/* Property Info */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Property</Text>
          <Text style={s.address}>{deal.address}</Text>
          <Text style={[s.strategyText, { color: strategyColor }]}>
            {strategyLabel}
          </Text>
          <Text style={s.propertyType}>
            {formatLabel(deal.property_type)} &middot; {deal.zip_code}
          </Text>
        </View>

        {/* Risk Score */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Risk Assessment</Text>
          <View style={s.riskRow}>
            <Text style={[s.riskScore, { color: riskColor }]}>
              {riskScore}
            </Text>
            <Text style={[s.riskLabel, { color: riskColor }]}>
              {riskLabel}
            </Text>
          </View>
        </View>

        {/* Key Metrics */}
        <View style={s.kpiGrid}>
          {kpis.map((kpi) => {
            const rawValue = outputs[kpi.key]
            const displayValue = formatKPIValue(kpi.key, rawValue, kpi.format)
            return (
              <View key={kpi.key} style={s.kpiCard}>
                <Text style={s.kpiLabel}>{kpi.label}</Text>
                <Text style={s.kpiValue}>{displayValue}</Text>
              </View>
            )
          })}
        </View>

        {/* Full Outputs Table */}
        {outputEntries.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderText, { flex: 1 }]}>Output</Text>
              <Text style={[s.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Value</Text>
            </View>
            {outputEntries.map(([key, value], i) => (
              <View
                key={key}
                style={[
                  s.tableRow,
                  i % 2 === 0 ? s.tableRowEven : s.tableRowOdd,
                ]}
              >
                <Text style={s.tableLabel}>{formatLabel(key)}</Text>
                <Text style={s.tableValue}>
                  {formatOutputValue(key, value as number | string | null | undefined)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Inputs Summary Table */}
        {inputEntries.length > 0 && (
          <View wrap={false}>
            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderText, { flex: 1 }]}>Input</Text>
              <Text style={[s.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Value</Text>
            </View>
            {inputEntries.map(([key, value], i) => (
              <View
                key={key}
                style={[
                  s.tableRow,
                  i % 2 === 0 ? s.tableRowEven : s.tableRowOdd,
                ]}
              >
                <Text style={s.tableLabel}>{formatLabel(key)}</Text>
                <Text style={s.tableValue}>
                  {formatOutputValue(key, value)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            Generated by Parcel &middot; parcel-platform-kappa.vercel.app
          </Text>
          <Text
            style={s.footerText}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  )
}
