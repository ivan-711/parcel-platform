/** Radar chart for multi-dimensional deal comparison — overlays 2+ deals on a single spider chart. */

import { useMemo } from 'react'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { Strategy } from '@/types'
import { formatOutputValue } from '@/lib/format'

/** Deal shape passed into the radar chart. */
interface RadarDeal {
  id: string
  address: string
  strategy: Strategy
  outputs: Record<string, number | string>
  riskScore: number | null
}

export interface ComparisonRadarProps {
  deals: RadarDeal[]
}

/** Colors assigned to each deal slot in the radar — light-theme optimized. */
const DEAL_COLORS = ['#4D7C0F', '#0284C7', '#D97706', '#DC2626', '#7C3AED'] as const

/** Radar dimension definition. */
interface RadarDimension {
  key: string
  label: string
  /** Higher raw value = better. If false, lower is better and we invert for display. */
  higherIsBetter: boolean
  /** Output keys to check for this dimension — first match wins. */
  outputKeys: string[]
  /** If true, pull from deal.riskScore instead of outputs. */
  fromRiskScore?: boolean
}

/**
 * Dimensions compared on the radar chart. Each dimension maps to one or more
 * output keys so the chart adapts across strategies.
 */
const RADAR_DIMENSIONS: RadarDimension[] = [
  {
    key: 'return',
    label: 'Return',
    higherIsBetter: true,
    outputKeys: ['coc_return', 'roi', 'annualized_roi', 'effective_yield'],
  },
  {
    key: 'cash_flow',
    label: 'Cash Flow',
    higherIsBetter: true,
    outputKeys: ['monthly_cash_flow', 'annual_cash_flow'],
  },
  {
    key: 'risk',
    label: 'Risk Score',
    higherIsBetter: false,
    outputKeys: [],
    fromRiskScore: true,
  },
  {
    key: 'equity',
    label: 'Equity',
    higherIsBetter: true,
    outputKeys: ['equity_captured', 'equity_day_one', 'estimated_profit', 'net_profit', 'gross_profit'],
  },
  {
    key: 'cap_rate',
    label: 'Cap Rate',
    higherIsBetter: true,
    outputKeys: ['cap_rate'],
  },
  {
    key: 'deal_score',
    label: 'Deal Score',
    higherIsBetter: true,
    outputKeys: ['deal_score', 'spread', 'dscr'],
  },
]

/** Extract a raw numeric value for a dimension from a deal. */
function extractRawValue(deal: RadarDeal, dim: RadarDimension): number | null {
  if (dim.fromRiskScore) {
    return deal.riskScore
  }
  for (const key of dim.outputKeys) {
    const val = deal.outputs?.[key]
    if (typeof val === 'number' && !isNaN(val)) return val
  }
  return null
}

/** Find the output key that matched for a deal and dimension (for tooltip display). */
function findMatchedKey(deal: RadarDeal, dim: RadarDimension): string | null {
  if (dim.fromRiskScore) return 'risk_score'
  for (const key of dim.outputKeys) {
    const val = deal.outputs?.[key]
    if (typeof val === 'number' && !isNaN(val)) return key
  }
  return null
}

/** Normalize a raw value to 0-100 scale given min/max across all deals. */
function normalize(
  value: number,
  min: number,
  max: number,
  higherIsBetter: boolean
): number {
  if (max === min) return 50
  const ratio = (value - min) / (max - min)
  const scaled = higherIsBetter ? ratio : 1 - ratio
  return Math.round(Math.max(0, Math.min(100, scaled * 100)))
}

/** Data shape for a single radar axis point. */
interface RadarDataPoint {
  dimension: string
  fullMark: number
  [dealKey: string]: string | number
}

/** Custom tooltip content for the radar chart. */
function RadarTooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
    color: string
    payload: RadarDataPoint
  }>
  label?: string
}) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg">
      <p className="mb-1.5 text-xs font-medium text-gray-500">{label}</p>
      {payload.map((entry) => {
        const rawKey = `${entry.name}_raw`
        const unitKey = `${entry.name}_unit`
        const rawValue = entry.payload[rawKey]
        const unit = entry.payload[unitKey]
        return (
          <div key={entry.name} className="flex items-center gap-2 text-xs">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-500">{entry.name}:</span>
            <span className="font-medium text-gray-900 tabular-nums">
              {typeof rawValue === 'number' && typeof unit === 'string'
                ? formatOutputValue(unit, rawValue)
                : `${entry.value}/100`}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/** Custom legend matching the light theme aesthetic. */
function RadarLegendContent({
  payload,
}: {
  payload?: Array<{
    value: string
    color: string
  }>
}) {
  if (!payload) return null

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
      {payload.map((entry) => (
        <div key={entry.value} className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs text-gray-600">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

export function ComparisonRadar({ deals }: ComparisonRadarProps) {
  /** Build radar data: filter dimensions to those with data, normalize values. */
  const { data, activeDimensions, dealAddresses } = useMemo(() => {
    if (deals.length < 2) {
      return { data: [], activeDimensions: [] as RadarDimension[], dealAddresses: [] as string[] }
    }

    // For each dimension, gather raw values across all deals
    const dimValues: Array<{
      dim: RadarDimension
      values: Array<{ dealIndex: number; raw: number; matchedKey: string | null }>
    }> = []

    for (const dim of RADAR_DIMENSIONS) {
      const values: Array<{ dealIndex: number; raw: number; matchedKey: string | null }> = []
      for (let i = 0; i < deals.length; i++) {
        const raw = extractRawValue(deals[i], dim)
        if (raw !== null) {
          values.push({ dealIndex: i, raw, matchedKey: findMatchedKey(deals[i], dim) })
        }
      }
      // Include dimension if at least 2 deals have data for it
      if (values.length >= 2) {
        dimValues.push({ dim, values })
      }
    }

    const active = dimValues.map((dv) => dv.dim)
    const addresses = deals.map((d) => d.address)

    const radarData: RadarDataPoint[] = dimValues.map(({ dim, values }) => {
      const rawNums = values.map((v) => v.raw)
      const min = Math.min(...rawNums)
      const max = Math.max(...rawNums)

      const point: RadarDataPoint = {
        dimension: dim.label,
        fullMark: 100,
      }

      // Initialize all deals to 0 (for deals missing this dimension)
      for (let i = 0; i < deals.length; i++) {
        const dealKey = addresses[i]
        point[dealKey] = 0
      }

      // Fill normalized values and raw data for tooltip
      for (const { dealIndex, raw, matchedKey } of values) {
        const dealKey = addresses[dealIndex]
        point[dealKey] = normalize(raw, min, max, dim.higherIsBetter)
        point[`${dealKey}_raw`] = raw
        point[`${dealKey}_unit`] = matchedKey ?? ''
      }

      return point
    })

    return { data: radarData, activeDimensions: active, dealAddresses: addresses }
  }, [deals])

  // Not enough data for a chart
  if (deals.length < 2 || activeDimensions.length < 3) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-12 shadow-xs">
        <p className="text-sm text-gray-400">
          {deals.length < 2
            ? 'Select at least two deals to see the radar comparison.'
            : 'Not enough comparable metrics to render the radar chart.'}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs" aria-label="Deal comparison radar chart">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Deal Comparison Overview</h2>
      <ResponsiveContainer width="100%" height={380}>
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid
            stroke="#EAECF0"
          />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fill: '#667085', fontSize: 12 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: '#98A2B3', fontSize: 10 }}
            tickCount={5}
            axisLine={false}
          />
          {dealAddresses.map((address, i) => (
            <Radar
              key={deals[i].id}
              name={address}
              dataKey={address}
              stroke={DEAL_COLORS[i % DEAL_COLORS.length]}
              fill={DEAL_COLORS[i % DEAL_COLORS.length]}
              fillOpacity={0.15}
              strokeWidth={2}
            />
          ))}
          <Legend content={<RadarLegendContent />} />
          <Tooltip
            content={<RadarTooltipContent />}
            wrapperStyle={{ outline: 'none' }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
