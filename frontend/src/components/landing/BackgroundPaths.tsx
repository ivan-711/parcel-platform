/**
 * BackgroundPaths — adapted from 21st.dev flowing curves component.
 *
 * Three layers of 36 cubic bezier paths each (108 total), continuously
 * animating pathLength + pathOffset for a living, breathing effect.
 * Warm cream palette for Parcel's luxury dark theme.
 *
 * Two layers flow upper-left → lower-right (original math).
 * One layer flows upper-right → lower-left (X-mirrored math)
 * to fill the upper-right quadrant with counter-flowing curves.
 */

import { m as motion } from 'framer-motion'

function FloatingPaths({ position, mirror = false }: { position: number; mirror?: boolean }) {
  const paths = Array.from({ length: 36 }, (_, i) => {
    // Original: paths flow from upper-left (-380,-189) to lower-right (684,875)
    // Mirrored: X-coords reflected about viewBox center (696-x) so paths
    //           flow from upper-right (1076,-189) to lower-left (12,875)
    const d = mirror
      ? `M${1076 - i * 5 * position} -${189 + i * 6}C${1076 - i * 5 * position} -${189 + i * 6} ${1008 - i * 5 * position} ${216 - i * 6} ${544 + i * 5 * position} ${343 - i * 6}C${80 + i * 5 * position} ${470 - i * 6} ${12 + i * 5 * position} ${875 - i * 6} ${12 + i * 5 * position} ${875 - i * 6}`
      : `M-${380 - i * 5 * position} -${189 + i * 6}C-${380 - i * 5 * position} -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${152 - i * 5 * position} ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${684 - i * 5 * position} ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`

    return { id: i, d, width: 0.5 + i * 0.03 }
  })

  return (
    <div className="absolute inset-0">
      <svg
        viewBox="0 0 696 316"
        fill="none"
        aria-hidden="true"
        className="absolute w-full h-full"
        style={{ color: 'rgba(240, 237, 232, 0.9)' }}
      >
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke="currentColor"
            strokeWidth={path.width}
            strokeOpacity={0.12 + path.id * 0.025}
            initial={{ pathLength: 0.3, opacity: 0.6 }}
            animate={{
              pathLength: 1,
              opacity: [0.3, 0.6, 0.3],
              pathOffset: [0, 1, 0],
            }}
            transition={{
              duration: 20 + Math.random() * 10,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        ))}
      </svg>
    </div>
  )
}

export function BackgroundPaths() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Primary layer — flows upper-left to lower-right */}
      <div className="absolute inset-0 pointer-events-none" style={{ transform: 'scale(1.1)' }}>
        <FloatingPaths position={1} />
      </div>
      {/* Spread variation — same direction, different curve spacing */}
      <div className="absolute inset-0 pointer-events-none" style={{ transform: 'scale(1.1)' }}>
        <FloatingPaths position={-1} />
      </div>
      {/* Counter-flow — flows upper-right to lower-left via mirrored SVG path math */}
      <div className="absolute inset-0 pointer-events-none" style={{ transform: 'scale(1.1)' }}>
        <FloatingPaths position={1} mirror />
      </div>
    </div>
  )
}
