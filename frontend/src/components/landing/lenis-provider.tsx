/** LenisProvider — smooth scroll wrapper synced with Framer Motion's RAF loop. Scoped to landing page only. */

import { ReactLenis, type LenisRef } from 'lenis/react'
import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'framer-motion'

export function LenisProvider({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<LenisRef>(null)
  const prefersReduced = useReducedMotion()

  useEffect(() => {
    if (prefersReduced) return

    let rafId: number
    function raf(time: number) {
      lenisRef.current?.lenis?.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)
    return () => cancelAnimationFrame(rafId)
  }, [prefersReduced])

  if (prefersReduced) {
    return <>{children}</>
  }

  return (
    <ReactLenis ref={lenisRef} root options={{ autoRaf: false, lerp: 0.08 }}>
      {children}
    </ReactLenis>
  )
}
