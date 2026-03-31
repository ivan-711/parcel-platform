/** SVG circle gauge for deal risk score — animated arc with color ranges and center text. */

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
  if (score <= 30) return '#0EA5E9'  // sky-500 (success)
  if (score <= 60) return '#F59E0B'  // amber-500
  if (score <= 80) return '#EF4444'  // red-500
  return '#B91C1C'                   // red-700
}

function getLabel(score: number): string {
  if (score <= 30) return 'Low Risk'
  if (score <= 60) return 'Moderate Risk'
  if (score <= 80) return 'High Risk'
  return 'Very High Risk'
}

function getLabelColor(score: number): string {
  if (score <= 30) return 'text-sky-700'
  if (score <= 60) return 'text-amber-700'
  if (score <= 80) return 'text-red-600'
  return 'text-red-800'
}

function getLabelBg(score: number): string {
  if (score <= 30) return 'bg-sky-50'
  if (score <= 60) return 'bg-amber-50'
  if (score <= 80) return 'bg-red-50'
  return 'bg-red-100'
}

export function RiskGauge({ score, className }: RiskGaugeProps) {
  const animated = useCountUp(score)
  const normalizedScore = Math.min(Math.max(score, 0), 100)
  const offset = CIRCUMFERENCE - (normalizedScore / 100) * CIRCUMFERENCE
  const color = getColor(score)
  const label = getLabel(score)
  const labelColor = getLabelColor(score)
  const labelBg = getLabelBg(score)

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <svg width={180} height={180} viewBox="0 0 180 180">
        {/* Background circle — light gray track */}
        <circle
          cx={90}
          cy={90}
          r={RADIUS}
          fill="none"
          stroke="#EAECF0"
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
          style={{
            fontSize: '36px',
            fontWeight: 600,
            fill: '#101828',
            fontFamily: 'Inter, sans-serif',
            fontFeatureSettings: '"tnum"',
          }}
        >
          {Math.round(animated)}
        </text>
      </svg>
      <span
        className={cn(
          'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold',
          labelColor,
          labelBg
        )}
      >
        {label}
      </span>
    </div>
  )
}
