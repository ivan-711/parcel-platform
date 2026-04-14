import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export interface ThresholdBracket {
  max: number          // upper bound. Use Infinity for the last bracket
  color: string        // CSS color value
  label: string        // "Conservative", "Moderate leverage", etc.
  dotClass: string     // Tailwind class: "bg-profit", "bg-warning", "bg-error"
}

interface ThresholdBadgeProps {
  value: number
  thresholds: ThresholdBracket[]
  format?: 'percent' | 'currency' | 'number' | 'ratio' | 'months'
  showHint?: boolean   // default FALSE
  className?: string
}

export function ThresholdBadge({ value, thresholds, format = 'number', showHint = false, className }: ThresholdBadgeProps) {
  const bracket = thresholds.find(t => value <= t.max) ?? thresholds[thresholds.length - 1]

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn('inline-flex items-center gap-1.5', className)}>
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: bracket.color }}
            />
            {showHint && (
              <span className="text-[10px] text-text-muted">
                {bracket.label}
              </span>
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-[220px] bg-app-overlay border border-border-strong p-2.5 rounded-lg shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)]"
          sideOffset={4}
        >
          <div className="space-y-1">
            {thresholds.map((t, i) => {
              const isActive = t === bracket
              const prevMax = i > 0 ? thresholds[i - 1].max : 0
              // Build range text
              let range: string
              if (i === 0) range = formatThreshold(t.max, format, '\u2264')
              else if (t.max === Infinity) range = formatThreshold(prevMax, format, '>')
              else range = `${formatThreshold(prevMax, format, '>')} to ${formatThreshold(t.max, format, '\u2264')}`

              return (
                <div
                  key={i}
                  className={cn(
                    'flex items-center gap-2 text-xs py-0.5 rounded px-1',
                    isActive && 'bg-layer-2'
                  )}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: t.color }}
                  />
                  <span className={cn('text-text-secondary', isActive && 'text-text-primary font-medium')}>
                    {t.label}
                  </span>
                  <span className="text-text-muted ml-auto">{range}</span>
                </div>
              )
            })}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function formatThreshold(val: number, format: string, op: string): string {
  if (val === Infinity) return '\u221E'
  switch (format) {
    case 'percent': return `${op} ${val}%`
    case 'currency': return `${op} $${val.toLocaleString()}`
    case 'ratio': return `${op} ${val}`
    case 'months': return `${op} ${val}mo`
    default: return `${op} ${val}`
  }
}

// ── Threshold Presets ──

export const LTV_THRESHOLDS: ThresholdBracket[] = [
  { max: 70, color: '#7CCBA5', label: 'Conservative', dotClass: 'bg-profit' },
  { max: 80, color: '#D4A867', label: 'Moderate leverage', dotClass: 'bg-warning' },
  { max: Infinity, color: '#D4766A', label: 'High leverage', dotClass: 'bg-error' },
]

export const CAP_RATE_THRESHOLDS: ThresholdBracket[] = [
  { max: 5, color: '#D4766A', label: 'Low return', dotClass: 'bg-error' },
  { max: 7, color: '#D4A867', label: 'Moderate', dotClass: 'bg-warning' },
  { max: Infinity, color: '#7CCBA5', label: 'Strong return', dotClass: 'bg-profit' },
]

export const DSCR_THRESHOLDS: ThresholdBracket[] = [
  { max: 1.0, color: '#D4766A', label: 'Negative cash flow', dotClass: 'bg-error' },
  { max: 1.25, color: '#D4A867', label: 'Break-even zone', dotClass: 'bg-warning' },
  { max: Infinity, color: '#7CCBA5', label: 'Well-covered', dotClass: 'bg-profit' },
]

export const RISK_THRESHOLDS: ThresholdBracket[] = [
  { max: 30, color: '#7CCBA5', label: 'Low risk', dotClass: 'bg-profit' },
  { max: 60, color: '#D4A867', label: 'Moderate risk', dotClass: 'bg-warning' },
  { max: 80, color: '#E5A84B', label: 'High risk', dotClass: 'bg-warning' },
  { max: Infinity, color: '#D4766A', label: 'Very high risk', dotClass: 'bg-error' },
]

export const DEAL_SCORE_THRESHOLDS: ThresholdBracket[] = [
  { max: 25, color: '#D4766A', label: 'Pass', dotClass: 'bg-error' },
  { max: 45, color: '#E5A84B', label: 'Risky', dotClass: 'bg-warning' },
  { max: 75, color: '#D4A867', label: 'Fair', dotClass: 'bg-warning' },
  { max: 90, color: '#7B9FCC', label: 'Good deal', dotClass: 'bg-info' },
  { max: Infinity, color: '#7CCBA5', label: 'Strong buy', dotClass: 'bg-profit' },
]
