/** SVG circle gauge for deal risk score — animated arc with color ranges and JetBrains Mono center text. */

import { useCountUp } from '@/hooks/useCountUp'
import { cn } from '@/lib/utils'

interface RiskGaugeProps {
  score: number
  className?: string
}

const RADIUS = 70
const STROKE_WIDTH = 12
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function getColor(score: number): string {
  if (score <= 30) return '#10B981'
  if (score <= 60) return '#F59E0B'
  if (score <= 80) return '#EF4444'
  return '#7F1D1D'
}

function getLabel(score: number): string {
  if (score <= 30) return 'Low Risk'
  if (score <= 60) return 'Moderate Risk'
  if (score <= 80) return 'High Risk'
  return 'Very High Risk'
}

function getLabelColor(score: number): string {
  if (score <= 30) return 'text-emerald-400'
  if (score <= 60) return 'text-amber-400'
  if (score <= 80) return 'text-red-400'
  return 'text-red-700'
}

export function RiskGauge({ score, className }: RiskGaugeProps) {
  const animated = useCountUp(score)
  const normalizedScore = Math.min(Math.max(score, 0), 100)
  const offset = CIRCUMFERENCE - (normalizedScore / 100) * CIRCUMFERENCE
  const color = getColor(score)
  const label = getLabel(score)
  const labelColor = getLabelColor(score)

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <svg width={180} height={180} viewBox="0 0 180 180">
        {/* Background circle */}
        <circle
          cx={90}
          cy={90}
          r={RADIUS}
          fill="none"
          stroke="#1A1A2E"
          strokeWidth={STROKE_WIDTH}
        />
        {/* Animated foreground arc */}
        <circle
          cx={90}
          cy={90}
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 1.2s ease-out',
            transform: 'rotate(-90deg)',
            transformOrigin: '50% 50%',
          }}
        />
        {/* Center score text */}
        <text
          x={90}
          y={90}
          textAnchor="middle"
          dominantBaseline="central"
          className="font-mono"
          style={{
            fontSize: '36px',
            fontWeight: 600,
            fill: 'currentColor',
          }}
        >
          {Math.round(animated)}
        </text>
      </svg>
      <span
        className={cn(
          'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold',
          labelColor
        )}
        style={{ backgroundColor: `${color}20` }}
      >
        {label}
      </span>
    </div>
  )
}
