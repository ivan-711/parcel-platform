/**
 * Landing page utilities — scroll hooks, intersection observer, count-up animation.
 */

import { useState, useEffect, useRef, useCallback } from 'react'

// ── Scroll Position ─────────────────────────────────────────────────────────

/** Returns current window scroll Y position with passive listener. */
export function useScrollPosition() {
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return scrollY
}

// ── Fade In On Scroll ───────────────────────────────────────────────────────

interface FadeInOptions {
  threshold?: number
  rootMargin?: string
}

/** One-shot IntersectionObserver — sets `isVisible` to true, then disconnects. */
export function useFadeInOnScroll(options: FadeInOptions = {}) {
  const { threshold = 0.15, rootMargin } = options
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold, rootMargin },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold, rootMargin])

  return { ref, isVisible }
}

// ── Scroll Expansion (Hero Browser Frame) ───────────────────────────────────

/**
 * Returns a 0-1 progress value based on how far the user has scrolled
 * through the element's scroll range. Used for the hero browser frame expansion.
 */
export function useScrollExpansion(scrollRange = 400) {
  const ref = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const el = ref.current
      if (!el) return

      const rect = el.getBoundingClientRect()
      const viewportH = window.innerHeight
      // Start expanding when element top reaches bottom of viewport
      const start = viewportH
      // End when element top is `scrollRange`px above that point
      const rawProgress = (start - rect.top) / scrollRange
      setProgress(Math.min(1, Math.max(0, rawProgress)))
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll() // initial check
    return () => window.removeEventListener('scroll', onScroll)
  }, [scrollRange])

  return { ref, progress }
}

// ── Count Up Animation ──────────────────────────────────────────────────────

/**
 * Animates a number from 0 to `target` over `durationMs` when `isVisible` becomes true.
 * Supports decimals via the `decimals` parameter.
 */
export function useCountUp(
  target: number,
  durationMs: number,
  isVisible: boolean,
  decimals = 0,
) {
  const [value, setValue] = useState(0)
  const hasRun = useRef(false)
  const rafId = useRef(0)

  useEffect(() => {
    if (!isVisible || hasRun.current) return
    hasRun.current = true

    const startTime = performance.now()
    const step = (now: number) => {
      const elapsed = now - startTime
      const t = Math.min(elapsed / durationMs, 1)
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3)
      const current = eased * target
      setValue(Number(current.toFixed(decimals)))

      if (t < 1) {
        rafId.current = requestAnimationFrame(step)
      }
    }

    rafId.current = requestAnimationFrame(step)

    return () => cancelAnimationFrame(rafId.current)
  }, [isVisible, target, durationMs, decimals])

  return value
}

// ── Scroll To Section ───────────────────────────────────────────────────────

/** Smooth-scrolls to a section by its DOM id, offset by navbar height. */
export const scrollToSection = (id: string) => {
  const el = document.getElementById(id)
  if (!el) return
  const navbarOffset = 80
  const top = el.getBoundingClientRect().top + window.scrollY - navbarOffset
  window.scrollTo({ top, behavior: 'smooth' })
}

// ── Format Number ───────────────────────────────────────────────────────────

/** Formats a number with commas (e.g., 10000 → "10,000"). */
export function formatWithCommas(n: number): string {
  return n.toLocaleString('en-US')
}
