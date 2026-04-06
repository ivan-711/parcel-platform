/** Minimal inline area chart — no axes, grid, or tooltip. For KPI cards. */

import { useMemo } from 'react'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'

interface SparklineProps {
  data: number[]
  color?: string
  height?: number
  strokeWidth?: number
  gradientOpacity?: number
  animate?: boolean
}

export function Sparkline({
  data,
  color = '#8B7AFF',
  height = 40,
  strokeWidth = 1.5,
  gradientOpacity = 0.20,
  animate = false,
}: SparklineProps) {
  const gradientId = useMemo(() => `spark-${Math.random().toString(36).slice(2, 8)}`, [])
  const points = useMemo(() => data.map((value, idx) => ({ idx, value })), [data])

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={points} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={gradientOpacity} />
            <stop offset="50%" stopColor={color} stopOpacity={gradientOpacity * 0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={strokeWidth}
          fill={`url(#${gradientId})`}
          dot={false}
          isAnimationActive={animate}
          animationDuration={500}
          animationEasing="ease-out"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
