/** Reusable SVG linearGradient element for Recharts chart <defs>. */

interface GradientDefProps {
  id: string
  color: string
  fromOpacity?: number
  toOpacity?: number
  midStop?: number
  midOpacity?: number
}

export function GradientDef({ id, color, fromOpacity = 0.25, toOpacity = 0, midStop, midOpacity }: GradientDefProps) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor={color} stopOpacity={fromOpacity} />
      {midStop != null && midOpacity != null && (
        <stop offset={`${midStop}%`} stopColor={color} stopOpacity={midOpacity} />
      )}
      <stop offset="95%" stopColor={color} stopOpacity={toOpacity} />
    </linearGradient>
  )
}
