import { Link } from 'react-router-dom'
import type { TodayPipelineSummary } from '@/types'

/** Must match backend _ALL_STAGES and frontend pipeline/constants.ts STAGES. */
const STAGE_CONFIG: { key: string; label: string; color: string }[] = [
  { key: 'lead',           label: 'Lead',           color: '#7A7872' },
  { key: 'analyzing',      label: 'Analyzing',      color: '#8B7AFF' },
  { key: 'offer_sent',     label: 'Offer Sent',     color: '#D4A867' },
  { key: 'under_contract', label: 'Under Contract', color: '#7B9FCC' },
  { key: 'due_diligence',  label: 'Due Diligence',  color: '#A89FFF' },
  { key: 'closed',         label: 'Closed',         color: '#7CCBA5' },
  { key: 'dead',           label: 'Dead',           color: '#D4766A' },
]

interface Props {
  pipeline: TodayPipelineSummary
}

export function PipelineSummaryBar({ pipeline }: Props) {
  const total = Object.values(pipeline.by_stage).reduce(
    (a, b) => a + b, 0
  )

  if (total === 0) {
    return (
      <div className="bg-[#141311] border border-[#1E1D1B] rounded-xl p-5">
        <h3 className="text-[11px] uppercase tracking-wider text-[#8A8580] font-medium mb-4">
          Pipeline Velocity
        </h3>
        <p className="text-sm text-[#8A8580] py-4 text-center">
          No active deals.{' '}
          <Link to="/analyze" className="text-[#8B7AFF] hover:text-[#A89FFF] transition-colors">
            Analyze a property
          </Link>{' '}
          to get started.
        </p>
      </div>
    )
  }

  const activeStages = STAGE_CONFIG.filter(
    s => (pipeline.by_stage[s.key] ?? 0) > 0
  )

  return (
    <div className="bg-[#141311] border border-[#1E1D1B] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[11px] uppercase tracking-wider text-[#8A8580] font-medium">
          Pipeline Velocity
        </h3>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-[#C5C0B8]">
            Active: <span className="text-[#F0EDE8] font-medium tabular-nums">{pipeline.total_active}</span>
          </span>
          <span className="text-[#C5C0B8]">
            Total: <span className="text-[#F0EDE8] font-medium tabular-nums">{total}</span>
          </span>
        </div>
      </div>

      {/* Segmented bar */}
      <div className="flex h-3 rounded-full overflow-hidden bg-[#0C0B0A] mb-4">
        {STAGE_CONFIG.map((stage) => {
          const count = pipeline.by_stage[stage.key] ?? 0
          if (count === 0) return null
          const pct = (count / total) * 100
          return (
            <div
              key={stage.key}
              className="h-full transition-all duration-300"
              style={{
                width: `${pct}%`,
                backgroundColor: stage.color,
                minWidth: count > 0 ? '8px' : '0px',
              }}
            />
          )
        })}
      </div>

      {/* Stage labels */}
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {activeStages.map((stage) => {
          const count = pipeline.by_stage[stage.key] ?? 0
          const pct = Math.round((count / total) * 100)
          return (
            <div key={stage.key} className="flex items-center gap-1.5 text-xs">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: stage.color }}
              />
              <span className="text-[#8A8580]">{stage.label}</span>
              <span className="text-[#C5C0B8] tabular-nums">{count}</span>
              <span className="text-[#8A8580]/60 tabular-nums">{pct}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
