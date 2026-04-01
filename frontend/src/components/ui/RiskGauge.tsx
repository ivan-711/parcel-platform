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
  if (score <= 30) return '#6DBEA3'  // success green
  if (score <= 60) return '#D4A867'  // warm amber
  if (score <= 80) return '#D4766A'  // terracotta
  return '#C45E52'                   // error strong
}

function getLabel(score: number): string {
  if (score <= 30) return 'Low Risk'
  if (score <= 60) return 'Moderate Risk'
  if (score <= 80) return 'High Risk'
  return 'Very High Risk'
}

function getLabelClasses(score: number): string {
  if (score <= 30) return 'bg-[#6DBEA3]/10 text-[#6DBEA3] border border-[#6DBEA3]/20'
  if (score <= 60) return 'bg-[#D4A867]/10 text-[#D4A867] border border-[#D4A867]/20'
  if (score <= 80) return 'bg-[#D4766A]/10 text-[#D4766A] border border-[#D4766A]/20'
  return 'bg-[#C45E52]/10 text-[#C45E52] border border-[#C45E52]/20'
}

export function RiskGauge({ score, className }: RiskGaugeProps) {
  const animated = useCountUp(score)
  const normalizedScore = Math.min(Math.max(score, 0), 100)
  const offset = CIRCUMFERENCE - (normalizedScore / 100) * CIRCUMFERENCE
  const color = getColor(score)
  const label = getLabel(score)
  const labelClasses = getLabelClasses(score)

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <svg width={180} height={180} viewBox="0 0 180 180">
        <defs>
          <filter id="gauge-glow">
            <feGaussianBlur stdDeviation={4} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Background circle — dark track */}
        <circle
          cx={90}
          cy={90}
          r={RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={STROKE_WIDTH}
        />
        {/* Animated foreground arc with glow */}
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
          filter="url(#gauge-glow)"
          style={{
            transition: 'stroke-dashoffset 1.2s ease-out',
            transform: 'rotate(-90deg)',
            transformOrigin: '50% 50%',
          }}
        />
        {/* Center score text */}
        <text
          x={90}
          y={85}
          textAnchor="middle"
          dominantBaseline="central"
          style={{
            fontSize: '36px',
            fontWeight: 300,
            fill: '#F0EDE8',
            fontFamily: "'Satoshi', 'Satoshi Fallback', system-ui, sans-serif",
            fontFeatureSettings: '"tnum"',
          }}
        >
          {Math.round(animated)}
        </text>
        {/* Center label text */}
        <text
          x={90}
          y={110}
          textAnchor="middle"
          dominantBaseline="central"
          style={{
            fontSize: '11px',
            fontWeight: 500,
            fill: '#A09D98',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          / 100
        </text>
      </svg>
      <span
        className={cn(
          'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold',
          labelClasses
        )}
      >
        {label}
      </span>
    </div>
  )
}
