/**
 * ScrollProgressBar — decorative 2px bar fixed at the top of the viewport
 * that fills left-to-right as the user scrolls down the page.
 * Hidden when the user prefers reduced motion.
 */

import { motion, useScroll, useReducedMotion } from 'framer-motion'

export function ScrollProgressBar() {
  const { scrollYProgress } = useScroll()
  const prefersReducedMotion = useReducedMotion()

  if (prefersReducedMotion) return null

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 z-50 h-[2px] origin-left bg-accent-primary"
      style={{ scaleX: scrollYProgress }}
      aria-hidden="true"
    />
  )
}
