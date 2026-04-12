/** CompsCard — displays comparable sales and repair estimates when available. */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronUp, MapPin, Wrench } from 'lucide-react'
import { api } from '@/lib/api'

interface Props {
  scenarioId: string | undefined
}

export function CompsCard({ scenarioId }: Props) {
  const [repairsExpanded, setRepairsExpanded] = useState(false)

  const { data } = useQuery({
    queryKey: ['comps', scenarioId],
    queryFn: () => api.analysis.getComps(scenarioId!),
    enabled: !!scenarioId,
    staleTime: 5 * 60_000,
  })

  // Don't render if no comp data exists
  if (!data || (data.comps.length === 0 && data.repairs.length === 0)) {
    return null
  }

  return (
    <div className="bg-app-recessed border border-border-default rounded-xl p-5 space-y-5">
      {/* Comps section */}
      {data.comps.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] uppercase tracking-wider text-text-muted font-medium">
              Comparable Sales
            </h3>
            <span className="text-xs text-text-muted tabular-nums">
              {data.comps.length} comp{data.comps.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* ARV summary */}
          {data.after_repair_value != null && (
            <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-app-bg">
              <span className="text-xs text-text-muted">Estimated ARV</span>
              <span className="text-sm font-medium text-text-primary tabular-nums ml-auto">
                ${data.after_repair_value.toLocaleString()}
              </span>
            </div>
          )}

          {/* Comp list */}
          <div className="space-y-2">
            {data.comps.map((comp, i) => (
              <div
                key={`${comp.address}-${i}`}
                className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg border border-border-default bg-app-bg"
              >
                <MapPin size={12} className="text-text-muted mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text-secondary truncate">{comp.address}</p>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-text-muted">
                    {comp.adjusted_value != null && (
                      <span className="text-text-primary font-medium tabular-nums">
                        ${comp.adjusted_value.toLocaleString()}
                      </span>
                    )}
                    {comp.sqft != null && <span>{comp.sqft.toLocaleString()} sqft</span>}
                    {comp.bedrooms != null && <span>{comp.bedrooms}bd</span>}
                    {comp.bathrooms != null && <span>{comp.bathrooms}ba</span>}
                    {comp.comp_type && (
                      <span className="uppercase tracking-wider text-violet-400">
                        {comp.comp_type}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Repairs section */}
      {data.repairs.length > 0 && data.repair_cost != null && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] uppercase tracking-wider text-text-muted font-medium">
              Repair Estimate
            </h3>
            <span className="text-sm font-medium text-text-primary tabular-nums">
              ${data.repair_cost.toLocaleString()}
            </span>
          </div>

          {/* Expandable breakdown */}
          <button
            onClick={() => setRepairsExpanded((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors cursor-pointer mb-2"
          >
            {repairsExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {repairsExpanded ? 'Hide' : 'Show'} breakdown ({data.repairs.length} items)
          </button>

          {repairsExpanded && (
            <div className="space-y-1.5">
              {data.repairs.map((r, i) => (
                <div
                  key={`${r.repair}-${i}`}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-app-bg text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Wrench size={10} className="text-text-muted shrink-0" />
                    <span className="text-text-secondary truncate">{r.repair}</span>
                  </div>
                  <span className="text-text-primary font-medium tabular-nums shrink-0">
                    ${r.cost.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Renovation score */}
      {data.renovation_score?.has_score && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-app-bg">
          <span className="text-xs text-text-muted">Renovation Score</span>
          <span className="text-sm font-medium text-text-primary tabular-nums ml-auto">
            {(data.renovation_score.score * 10).toFixed(1)}/10
          </span>
        </div>
      )}
    </div>
  )
}
