/** Glassmorphism tooltip for Recharts — works in both dark and light themes via CSS vars. */

import { cn } from '@/lib/utils'

interface FrostedTooltipProps {
  active?: boolean
  payload?: Array<{ name?: string; value?: number; color?: string }>
  label?: string | number
  valueFormatter?: (value: number) => string
  labelFormatter?: (label: string) => string
  className?: string
}

const defaultFmt = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)

export function FrostedTooltip({
  active,
  payload,
  label,
  valueFormatter,
  labelFormatter,
  className,
}: FrostedTooltipProps) {
  if (!active || !payload?.length) return null

  const fmt = valueFormatter ?? defaultFmt

  return (
    <div
      className={cn(
        'rounded-lg px-3 py-2 text-xs',
        'border',
        'backdrop-blur-[var(--chart-tooltip-blur)]',
        'bg-[var(--chart-tooltip-bg)]',
        'border-[var(--chart-tooltip-border)]',
        '[box-shadow:var(--chart-tooltip-shadow)]',
        className,
      )}
    >
      {label != null && (
        <p className="text-[10px] uppercase tracking-wider font-medium mb-1.5 text-[var(--chart-tooltip-label)]">
          {labelFormatter ? labelFormatter(String(label)) : label}
        </p>
      )}
      <div className="space-y-1">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-[var(--chart-tooltip-label)]">
                {entry.name}
              </span>
            </span>
            <span className="font-medium tabular-nums text-[var(--chart-tooltip-text)]">
              {fmt(entry.value as number)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
