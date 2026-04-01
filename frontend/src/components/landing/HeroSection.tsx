/**
 * HeroSection — cinematic scroll-hijack hero.
 *
 * Brand atmosphere → product reveal in a single scroll gesture.
 * Scroll/touch input is captured and drives a 0→1 progress value.
 * At progress=1 scroll hijack releases and native scrolling resumes.
 * Adapted from 21st.dev ScrollExpandMedia for React/Vite (no Next.js).
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { scrollToSection } from './landing-utils'

// ── Scroll Hijack Hook ──────────────────────────────────────────────────────

function useScrollHijack() {
  const [scrollProgress, setScrollProgress] = useState(0)
  const [mediaFullyExpanded, setMediaFullyExpanded] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const touchStartY = useRef(0)
  const progressRef = useRef(0) // mirror for event handlers (avoids stale closures)
  const expandedRef = useRef(false)

  // Sync refs with state
  useEffect(() => {
    progressRef.current = scrollProgress
  }, [scrollProgress])
  useEffect(() => {
    expandedRef.current = mediaFullyExpanded
  }, [mediaFullyExpanded])

  // Mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check, { passive: true })
    return () => window.removeEventListener('resize', check)
  }, [])

  // Core scroll hijack
  useEffect(() => {
    const applyDelta = (delta: number) => {
      const next = Math.min(1, Math.max(0, progressRef.current + delta))
      progressRef.current = next
      setScrollProgress(next)

      if (next >= 1 && !expandedRef.current) {
        expandedRef.current = true
        setMediaFullyExpanded(true)
      }
      if (next < 1 && expandedRef.current) {
        expandedRef.current = false
        setMediaFullyExpanded(false)
      }
    }

    // ── Wheel (desktop) ──
    const onWheel = (e: WheelEvent) => {
      // Fully expanded + scrolling down → let native scroll happen
      if (expandedRef.current && e.deltaY > 0) return

      // Fully expanded + scrolling up + near top of page → reverse expansion
      if (expandedRef.current && e.deltaY < 0 && window.scrollY <= 5) {
        e.preventDefault()
        applyDelta(-Math.abs(e.deltaY) * 0.0009)
        return
      }

      // Not fully expanded → hijack scroll
      if (!expandedRef.current) {
        e.preventDefault()
        applyDelta(e.deltaY * 0.0009)
      }
    }

    // ── Touch (mobile) ──
    const onTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY
    }

    const onTouchMove = (e: TouchEvent) => {
      const deltaY = touchStartY.current - e.touches[0].clientY
      touchStartY.current = e.touches[0].clientY

      // Fully expanded + scrolling down → native scroll
      if (expandedRef.current && deltaY > 0) return

      // Fully expanded + scrolling up + near top → reverse
      if (expandedRef.current && deltaY < 0 && window.scrollY <= 5) {
        e.preventDefault()
        applyDelta(deltaY * 0.008)
        return
      }

      // Not expanded → hijack
      if (!expandedRef.current) {
        e.preventDefault()
        const sensitivity = deltaY > 0 ? 0.005 : 0.008
        applyDelta(deltaY * sensitivity)
      }
    }

    const onTouchEnd = () => {
      touchStartY.current = 0
    }

    // ── Scroll lock while hijacking ──
    const onScroll = () => {
      if (!expandedRef.current) {
        window.scrollTo(0, 0)
      }
    }

    // ── Keyboard bypass ──
    const onKeyDown = (e: KeyboardEvent) => {
      if (expandedRef.current) return
      if (['ArrowDown', 'Enter', 'Escape', ' '].includes(e.key)) {
        e.preventDefault()
        progressRef.current = 1
        setScrollProgress(1)
        expandedRef.current = true
        setMediaFullyExpanded(true)
      }
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  // Imperative skip for navbar links
  const skipHijack = useCallback(() => {
    if (expandedRef.current) return
    progressRef.current = 1
    setScrollProgress(1)
    expandedRef.current = true
    setMediaFullyExpanded(true)
  }, [])

  return { scrollProgress, mediaFullyExpanded, isMobile, skipHijack }
}

// ── Ghost Data Card ─────────────────────────────────────────────────────────

function GhostCard({
  label,
  value,
  progress,
  className,
}: {
  label: string
  value: string
  progress: number
  className?: string
}) {
  const opacity = 0.3 * Math.max(0, 1 - progress * 3)
  if (opacity <= 0) return null

  return (
    <div
      className={`hidden lg:block absolute bg-white/[0.02] border border-white/[0.04] rounded-xl p-3 md:p-4 backdrop-blur-sm pointer-events-none ${className}`}
      style={{ opacity }}
    >
      <p className="text-[9px] md:text-[10px] uppercase tracking-[0.08em] text-[#A09D98]/60">
        {label}
      </p>
      <p className="font-brand text-lg md:text-xl font-light text-[#F0EDE8]/70 mt-0.5">
        {value}
      </p>
    </div>
  )
}

// ── Main Hero ───────────────────────────────────────────────────────────────

export function HeroSection({ onSkipHijack }: { onSkipHijack?: (cb: () => void) => void }) {
  const { scrollProgress, mediaFullyExpanded, isMobile, skipHijack } = useScrollHijack()

  // Expose skipHijack to parent (LandingPage → Navbar)
  useEffect(() => {
    onSkipHijack?.(skipHijack)
  }, [onSkipHijack, skipHijack])

  // ── Derived values ──
  const bgOpacity = 1 - scrollProgress
  const headlineOpacity = Math.max(0, 1 - scrollProgress * 2.5)
  const promptOpacity = Math.max(0, 1 - scrollProgress * 4)

  // Media dimensions
  const mediaW = isMobile
    ? 280 + scrollProgress * 600
    : 340 + scrollProgress * 1200
  const mediaH = isMobile
    ? 180 + scrollProgress * 250
    : 220 + scrollProgress * 500
  const mediaBR = 16 - scrollProgress * 10 // 16 → 6
  const overlayOpacity = Math.max(0, 0.5 - scrollProgress * 0.3)
  const glowScale = 1 + scrollProgress * 0.3

  return (
    <section className="relative min-h-[100dvh] overflow-hidden">
      {/* Skip link for keyboard accessibility */}
      <a
        href="#features"
        onClick={(e) => { e.preventDefault(); skipHijack(); scrollToSection('features') }}
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#8B7AFF] focus:text-white focus:rounded-lg focus:text-sm"
      >
        Skip to content
      </a>

      {/* ── Layer 1: Atmospheric background ── */}
      <div
        className="absolute inset-0 z-0"
        style={{ opacity: bgOpacity }}
      >
        {/* Multi-gradient luxury atmosphere */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 60% at 50% 40%, rgba(30,28,24,1), transparent),
              radial-gradient(ellipse 40% 50% at 20% 70%, rgba(197,160,89,0.06), transparent),
              radial-gradient(ellipse 35% 40% at 80% 30%, rgba(139,122,255,0.04), transparent),
              radial-gradient(ellipse 60% 40% at 50% 0%, rgba(60,55,48,0.3), transparent),
              #0C0B0A
            `,
          }}
        />
        {/* Subtle dark overlay */}
        <div className="absolute inset-0 bg-black/10" />
      </div>

      {/* ── Layer 2: Headline text (slides apart) — ABOVE frame ── */}
      <div
        className="absolute inset-0 z-30 flex flex-col items-center justify-center pointer-events-none"
        style={{ opacity: headlineOpacity }}
      >
        <h1 className="font-brand text-4xl md:text-5xl lg:text-[56px] font-light tracking-[-0.03em] text-[#F0EDE8] leading-[1.1] text-center">
          <span
            className="block"
            style={{ transform: `translateX(-${scrollProgress * 150}vw)` }}
          >
            Analyze Real Estate
          </span>
          <span
            className="block"
            style={{ transform: `translateX(${scrollProgress * 150}vw)` }}
          >
            Deals with Precision
          </span>
        </h1>

        {/* Scroll prompt */}
        <p
          className="text-[11px] uppercase tracking-[0.08em] text-[#A09D98]/60 mt-8"
          style={{ opacity: promptOpacity }}
        >
          Scroll to explore
        </p>
      </div>

      {/* ── Layer 3: Expanding media (browser frame) — BELOW text ── */}
      <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
        {/* Violet glow */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: mediaW + 80,
            height: mediaH + 80,
            filter: 'blur(48px)',
            background: 'radial-gradient(ellipse at center, rgba(139,122,255,0.06), transparent 70%)',
            transform: `scale(${glowScale})`,
          }}
        />

        {/* Frame container */}
        <div
          style={{
            width: mediaW,
            height: mediaH,
            maxWidth: '95vw',
            maxHeight: '85vh',
            borderRadius: mediaBR,
            boxShadow: '0px 0px 50px rgba(0, 0, 0, 0.3)',
            overflow: 'hidden',
            position: 'relative',
          }}
          className="border border-white/[0.06]"
        >
          {/* Browser chrome */}
          <div className="bg-[#131210] h-8 md:h-10 flex items-center px-3 md:px-4 gap-1.5 md:gap-2 shrink-0">
            <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-white/[0.08]" />
            <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-white/[0.06]" />
            <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-white/[0.06]" />
            <div className="bg-white/[0.04] rounded-md h-4 md:h-5 w-32 md:w-48 mx-auto" />
          </div>

          {/* Dashboard content placeholder */}
          <div
            className="bg-gradient-to-br from-[#1A1916] to-[#131210] flex items-center justify-center"
            style={{ height: 'calc(100% - 2rem)' }}
          >
            <p className="text-[#7A7872] text-xs md:text-sm">
              Dashboard preview coming soon
            </p>
          </div>

          {/* Dark overlay that clears as frame expands */}
          <div
            className="absolute inset-0 bg-black/30 pointer-events-none"
            style={{ opacity: overlayOpacity }}
          />
        </div>
      </div>

      {/* ── Layer 4: Ghost data cards ── */}
      <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
        <GhostCard
          label="Cap Rate"
          value="8.2%"
          progress={scrollProgress}
          className="-translate-x-[calc(50%+200px)] lg:-translate-x-[calc(50%+240px)] rotate-[-2deg]"
        />
        <GhostCard
          label="After Repair Value"
          value="$247K"
          progress={scrollProgress}
          className="translate-x-[calc(50%+200px)] lg:translate-x-[calc(50%+240px)] rotate-[2deg]"
        />
      </div>
    </section>
  )
}
