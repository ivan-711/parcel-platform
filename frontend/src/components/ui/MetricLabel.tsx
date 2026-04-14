import { HelpCircle } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { getMetricDef } from '@/lib/metric-definitions'
import { cn } from '@/lib/utils'

interface MetricLabelProps {
  metric: string
  children: React.ReactNode
  className?: string
  side?: 'top' | 'bottom' | 'left' | 'right'
}

export function MetricLabel({ metric, children, className, side = 'top' }: MetricLabelProps) {
  const def = getMetricDef(metric)
  if (!def) return <span className={className}>{children}</span>

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn('inline-flex items-center gap-1', className)}>
            {children}
            <HelpCircle size={12} className="text-text-muted hover:text-text-secondary transition-colors shrink-0" />
          </span>
        </TooltipTrigger>
        <TooltipContent
          side={side}
          className="max-w-[280px] bg-app-overlay border border-border-strong p-3 rounded-lg shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)]"
          sideOffset={4}
        >
          <p className="text-sm font-semibold text-text-primary mb-1">{def.label}</p>
          <p className="text-xs text-text-secondary leading-relaxed">{def.description}</p>
          {def.formula && (
            <p className="text-xs font-mono text-text-muted mt-1.5 pt-1.5 border-t border-border-subtle">
              {def.formula}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
