/** Themed chart wrapper — consistent card, title, responsive height. */

import { cn } from '@/lib/utils'
import { ResponsiveContainer } from 'recharts'
import type { ReactElement } from 'react'

interface ChartContainerProps {
  children: ReactElement
  className?: string
  title?: string
  subtitle?: string
  height?: number
  actions?: React.ReactNode
}

export function ChartContainer({ children, className, title, subtitle, height = 250, actions }: ChartContainerProps) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-[var(--chart-bg)] border-[var(--chart-border)]',
        'p-4 md:p-5',
        className,
      )}
    >
      {(title || actions) && (
        <div className="flex items-center justify-between mb-3">
          <div>
            {title && (
              <h3 className="text-[10px] uppercase tracking-wider font-medium text-[var(--chart-axis-text)]">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-[var(--chart-label-text)] mt-0.5">{subtitle}</p>
            )}
          </div>
          {actions}
        </div>
      )}
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  )
}
