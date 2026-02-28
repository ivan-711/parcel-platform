import { useEffect, useRef, useState } from 'react'

/** Animates a number from 0 to `target` over `duration` ms using requestAnimationFrame. */
export function useCountUp(target: number, duration = 1200): number {
  const [current, setCurrent] = useState(0)
  const startRef = useRef<number | null>(null)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    startRef.current = null

    const animate = (timestamp: number) => {
      if (startRef.current === null) {
        startRef.current = timestamp
      }
      const elapsed = timestamp - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCurrent(eased * target)

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate)
      }
    }

    frameRef.current = requestAnimationFrame(animate)

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [target, duration])

  return current
}
