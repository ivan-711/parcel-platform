/**
 * HeroSection — scroll-driven frame sequence hero.
 *
 * Desktop: 121 WebP frames rendered on canvas, driven by scroll position.
 * Mobile / Reduced motion: static building-complete.jpg fallback.
 * Layout: text + CTA left, building animation right.
 */

import { useRef, useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform, useMotionValueEvent } from 'framer-motion'
import { ease, prefersReducedMotion } from '@/lib/motion'
import { scrollToSection } from './landing-utils'

const TOTAL_FRAMES = 121
const PRELOAD_COUNT = 10

function frameSrc(index: number): string {
  const padded = String(index).padStart(4, '0')
  return `/images/hero-frames/frame_${padded}.webp`
}

function useFrameImages() {
  const imagesRef = useRef<HTMLImageElement[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const images: HTMLImageElement[] = new Array(TOTAL_FRAMES)

    let eagersLoaded = 0
    const onEagerLoad = () => {
      eagersLoaded++
      if (eagersLoaded >= PRELOAD_COUNT) {
        setReady(true)
        for (let i = PRELOAD_COUNT + 1; i <= TOTAL_FRAMES; i++) {
          const img = new Image()
          img.src = frameSrc(i)
          images[i - 1] = img
        }
      }
    }

    for (let i = 1; i <= PRELOAD_COUNT; i++) {
      const img = new Image()
      img.src = frameSrc(i)
      img.onload = onEagerLoad
      img.onerror = onEagerLoad
      images[i - 1] = img
    }

    for (let i = PRELOAD_COUNT + 1; i <= TOTAL_FRAMES; i++) {
      images[i - 1] = new Image()
    }

    imagesRef.current = images
  }, [])

  return { imagesRef, ready }
}

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { imagesRef, ready } = useFrameImages()
  const currentFrameRef = useRef(0)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check, { passive: true })
    return () => window.removeEventListener('resize', check)
  }, [])

  const useStaticFallback = isMobile || prefersReducedMotion

  // `end end` (not `end start`) so progress 0→1 maps to the 100vh sticky
  // phase — the exact window during which the inner `sticky top-0 h-[100vh]`
  // child is pinned to the viewport. Using `end start` stretches the 121
  // frames across 200vh of scroll, wasting half the animation on the
  // element scrolling away off-screen.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  })

  const headlineOpacity = useTransform(scrollYProgress, [0, 0.6, 1], [1, 1, 0])

  const drawFrame = useCallback((index: number) => {
    const canvas = canvasRef.current
    const images = imagesRef.current
    if (!canvas || !images.length) return

    const img = images[index]
    if (!img || !img.complete || !img.naturalWidth) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight) {
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0)
  }, [imagesRef])

  useEffect(() => {
    if (!ready || useStaticFallback) return
    drawFrame(0)
    currentFrameRef.current = 0
  }, [ready, useStaticFallback, drawFrame])

  useMotionValueEvent(scrollYProgress, 'change', (progress) => {
    if (useStaticFallback) return
    const frameIndex = Math.min(
      TOTAL_FRAMES - 1,
      Math.floor(progress * TOTAL_FRAMES)
    )
    if (frameIndex !== currentFrameRef.current) {
      currentFrameRef.current = frameIndex
      drawFrame(frameIndex)
    }
  })

  return (
    <section
      ref={sectionRef}
      className={useStaticFallback ? 'relative h-[100vh]' : 'relative h-[200vh]'}
    >
      <div className="sticky top-0 h-[100vh] overflow-hidden bg-[#020202]">
        {/* Skip link */}
        <a
          href="#features"
          onClick={(e) => { e.preventDefault(); scrollToSection('features') }}
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#8B7AFF] focus:text-accent-text-on-accent focus:rounded-lg focus:text-sm"
        >
          Skip to content
        </a>

        {/* Left: headline + subhead + CTA — positioned over the canvas */}
        <motion.div
          className="absolute inset-y-0 left-0 z-10 flex flex-col justify-center w-full md:w-[40%] px-6 md:pl-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))] md:pr-12 pt-20 md:pt-0"
          style={useStaticFallback ? undefined : { opacity: headlineOpacity }}
        >
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: ease.luxury }}
            className="font-brand font-light tracking-[-0.03em] text-text-primary leading-[1.08]"
            style={{ fontSize: 'clamp(2rem, 5vw + 0.5rem, 3.5rem)' }}
          >
            Every deal. Every angle.<br /><span className="font-medium">60 seconds.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: ease.luxury }}
            className="text-base md:text-lg text-text-secondary mt-6 max-w-md"
          >
            Analyze any US property across wholesale, BRRRR, buy &amp; hold, flip, and creative finance — with AI narrative.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2, ease: ease.luxury }}
            className="mt-8"
          >
            <Link
              to="/register"
              className="inline-block rounded-full px-8 py-3 text-base font-medium text-accent-text-on-accent hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(139,122,255,0.3)] transition-all duration-200"
              style={{ background: 'linear-gradient(to right, #8B7AFF, #6C5CE7)' }}
            >
              Analyze Your First Deal Free
            </Link>
            <p className="text-[11px] text-text-secondary/60 mt-3">No credit card required. Results in 60 seconds.</p>
            <p className="text-xs text-text-muted mt-4">Built for real estate investors</p>
          </motion.div>
        </motion.div>

        {/* Right: frame sequence canvas or static fallback — fills right 2/3, bleeds to edge */}
        <div className="absolute right-0 top-0 h-full hidden md:flex md:w-[65%] items-center justify-end">
          {useStaticFallback ? (
            <img
              src="/images/building-complete.jpg"
              alt="Parcel platform — completed building analysis"
              className="h-[75vh] w-auto max-w-none object-contain translate-x-[25%]"
            />
          ) : (
            <canvas
              ref={canvasRef}
              className="h-[80vh] w-auto max-w-none translate-x-[25%]"
            />
          )}

          {/* Gradient overlays — blends frame edges into hero bg */}
          <div className="absolute inset-y-0 left-0 w-40 bg-gradient-to-r from-[#020202] to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#020202] to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0C0B0A] to-transparent pointer-events-none" />
        </div>
      </div>
    </section>
  )
}
