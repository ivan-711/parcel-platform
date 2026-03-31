/**
 * CursorSpotlight — radial gradient that smoothly follows the cursor position.
 * Uses Framer Motion useMotionValue + useSpring to bypass React render cycle.
 * Disabled on touch devices and when prefers-reduced-motion is set.
 */

import { useEffect, useRef } from 'react'
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion'

const SPRING_CONFIG = { damping: 25, stiffness: 200, mass: 0.5 }
const SPOTLIGHT_SIZE = 600

export function CursorSpotlight() {
  const containerRef = useRef<HTMLDivElement>(null)
  const prefersReduced = useReducedMotion()

  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const springX = useSpring(mouseX, SPRING_CONFIG)
  const springY = useSpring(mouseY, SPRING_CONFIG)

  useEffect(() => {
    // Bail out on touch-only devices
    if (!window.matchMedia('(pointer: fine)').matches) return
    if (prefersReduced) return

    const container = containerRef.current
    if (!container) return

    function handleMouseMove(e: MouseEvent) {
      const rect = container!.getBoundingClientRect()
      mouseX.set(e.clientX - rect.left)
      mouseY.set(e.clientY - rect.top)
    }

    container.addEventListener('mousemove', handleMouseMove)
    return () => container.removeEventListener('mousemove', handleMouseMove)
  }, [mouseX, mouseY, prefersReduced])

  // For reduced-motion or touch devices, render a static ambient glow instead
  if (prefersReduced || (typeof window !== 'undefined' && !window.matchMedia('(pointer: fine)').matches)) {
    return (
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background: 'radial-gradient(circle at 50% 40%, rgba(132,204,22,0.04) 0%, transparent 60%)',
        }}
      />
    )
  }

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <motion.div
        className="absolute pointer-events-none"
        style={{
          x: springX,
          y: springY,
          width: SPOTLIGHT_SIZE,
          height: SPOTLIGHT_SIZE,
          marginLeft: -SPOTLIGHT_SIZE / 2,
          marginTop: -SPOTLIGHT_SIZE / 2,
          background: 'radial-gradient(circle, rgba(132,204,22,0.06) 0%, rgba(132,204,22,0.02) 40%, transparent 70%)',
          borderRadius: '50%',
        }}
      />
    </div>
  )
}
