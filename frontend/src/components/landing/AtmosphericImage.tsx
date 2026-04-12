/**
 * AtmosphericImage — Apple-style scroll-pinned atmospheric reveal + text.
 *
 * Three visual layers stacked inside a sticky-pinned viewport:
 *
 *   1. Canvas (bottom)  — WebP frame sequence, scroll-driven, tight radial
 *                         mask so the image only shows in a center ellipse
 *                         and dissolves in all four directions. Opacity
 *                         0.14 — atmospheric, not focal.
 *   2. Edge overlay     — radial `#0C0B0A` gradient: transparent at the
 *                         center, solid page-color at 70% out. Guarantees
 *                         the edges literally *are* the page background
 *                         regardless of what the WebP frames contain
 *                         (belt-and-suspenders with layer 1's alpha mask).
 *   3. Text (top)       — centered headline + subheading with scroll-
 *                         progress driven fade-in (invisible at frame 0,
 *                         fully visible by frame 24 / progress 0.5).
 *                         `text-shadow` creates a luminance cushion so the
 *                         warm cream text stays legible over the warmer
 *                         regions of the bright frames.
 *
 * The outer container is `h-[300vh]` and the inner element is
 * `sticky top-0 h-screen`, so the sticky child pins to the viewport for
 * 200vh of scroll — during which the frames play 0 → totalFrames and the
 * text fades from 0 → 1 opacity. The animation "owns" its scroll range:
 * the user physically scrolls through the full reveal before the next
 * section appears.
 *
 * Why `useScroll` offset `['start start', 'end end']`?
 *   - `start start` — progress 0 when the outer container's top aligns
 *     with the viewport's top (the moment the sticky child begins pinning)
 *   - `end end`     — progress 1 when the outer container's bottom aligns
 *     with the viewport's bottom (the moment the sticky child releases)
 *   - For a 300vh container in a 100vh viewport that's exactly 200vh of
 *     scroll — a 1:1 map onto the pinned phase. No frames wasted.
 *
 * Behavior matrix:
 *   - Desktop, motion allowed → 200vh sticky-scroll canvas + scroll-faded text
 *   - Mobile (<768px)         → 40vh static slot, last frame, text always visible
 *   - prefers-reduced-motion  → same 40vh static slot as mobile
 *   - Light theme             → entire wrapper hidden via `[.light_&]:hidden`
 */

import { useRef, useEffect, useState, useCallback } from 'react'
import {
  motion,
  useScroll,
  useMotionValueEvent,
  useTransform,
} from 'framer-motion'
import { prefersReducedMotion } from '@/lib/motion'

interface AtmosphericImageProps {
  /** Directory under `/public/images/` containing `frame_0001.webp`..`frame_{N}.webp` */
  framePrefix: string
  /** Headline copy centered over the animation (required) */
  heading: string
  /** Optional subheading shown under the headline */
  subheading?: string
  /** Total frames in the sequence (default 48) */
  totalFrames?: number
  /** Layer opacity — atmospheric, not focal. Default 0.14. */
  opacity?: number
  /** How many frames to preload eagerly before marking the canvas ready */
  preloadCount?: number
}

function frameSrc(framePrefix: string, index: number): string {
  const padded = String(index).padStart(4, '0')
  return `/images/${framePrefix}/frame_${padded}.webp`
}

// ─── Shared layer styles ───────────────────────────────────────────────────

// Tight radial mask: image shows in a center ellipse ~60% wide × 50% tall,
// solid from 0-30% of the ellipse radius, fading to transparent by 70%.
// All four edges dissolve — no visible rectangular seam at the viewport.
const MASK_STYLE = {
  maskImage:
    'radial-gradient(ellipse 60% 50% at center, black 30%, transparent 70%)',
  WebkitMaskImage:
    'radial-gradient(ellipse 60% 50% at center, black 30%, transparent 70%)',
} as const

// Edge overlay: transparent in the center (lets the masked canvas through),
// fades to solid `#0C0B0A` at 70% out (guarantees the outer pixels are
// literally the page background color). Same 30/70 geometry as the mask
// so the two layers compose cleanly.
const EDGE_OVERLAY_STYLE = {
  background:
    'radial-gradient(ellipse at center, transparent 30%, #0C0B0A 70%)',
} as const

const HEADING_STYLE = {
  fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
  textShadow: '0 2px 20px rgba(0,0,0,0.8)',
} as const

const SUBHEADING_STYLE = {
  textShadow: '0 2px 20px rgba(0,0,0,0.8)',
} as const

export function AtmosphericImage({
  framePrefix,
  heading,
  subheading,
  totalFrames = 48,
  opacity = 0.14,
  preloadCount = 5,
}: AtmosphericImageProps) {
  const sectionRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const imagesRef = useRef<HTMLImageElement[]>([])
  const currentFrameRef = useRef(0)
  const [ready, setReady] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check, { passive: true })
    return () => window.removeEventListener('resize', check)
  }, [])

  const useStaticFallback = isMobile || prefersReducedMotion

  // Preload first N frames eagerly, then lazily hydrate the rest once ready
  useEffect(() => {
    if (useStaticFallback) return
    const images: HTMLImageElement[] = new Array(totalFrames)
    let eagersLoaded = 0

    const onEagerLoad = () => {
      eagersLoaded++
      if (eagersLoaded >= preloadCount) {
        setReady(true)
        for (let i = preloadCount; i < totalFrames; i++) {
          const img = new Image()
          img.src = frameSrc(framePrefix, i + 1)
          images[i] = img
        }
      }
    }

    for (let i = 0; i < preloadCount; i++) {
      const img = new Image()
      img.src = frameSrc(framePrefix, i + 1)
      img.onload = onEagerLoad
      img.onerror = onEagerLoad
      images[i] = img
    }

    imagesRef.current = images
  }, [framePrefix, totalFrames, preloadCount, useStaticFallback])

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  })

  // Text opacity: invisible at frame 0, fully visible by frame 24
  // (progress 0.5), then stays at 1 through the rest of the sticky phase.
  // The three-point input domain clamps the output after 0.5 so the text
  // doesn't accidentally fade back out at the end of the pinned window.
  const scrollTextOpacity = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    [0, 1, 1],
  )

  const drawFrame = useCallback((index: number) => {
    const canvas = canvasRef.current
    const images = imagesRef.current
    if (!canvas || !images.length) return
    const img = images[index]
    if (!img || !img.complete || !img.naturalWidth) return
    if (!ctxRef.current) ctxRef.current = canvas.getContext('2d')
    const ctx = ctxRef.current
    if (!ctx) return
    if (canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight) {
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0)
  }, [])

  // Paint frame 0 as soon as the eagers are ready
  useEffect(() => {
    if (!ready || useStaticFallback) return
    drawFrame(0)
    currentFrameRef.current = 0
  }, [ready, useStaticFallback, drawFrame])

  useMotionValueEvent(scrollYProgress, 'change', (progress) => {
    if (useStaticFallback) return
    const frameIndex = Math.min(
      totalFrames - 1,
      Math.max(0, Math.floor(progress * totalFrames)),
    )
    if (frameIndex !== currentFrameRef.current) {
      currentFrameRef.current = frameIndex
      drawFrame(frameIndex)
    }
  })

  // Static path: mobile / reduced motion — 40vh slot, bright last frame,
  // text always fully visible (no scroll fade).
  if (useStaticFallback) {
    return (
      <div
        aria-hidden="true"
        className="relative w-full h-[40vh] overflow-hidden pointer-events-none [.light_&]:hidden"
      >
        <div className="absolute inset-0" style={MASK_STYLE}>
          <img
            src={frameSrc(framePrefix, totalFrames)}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{ opacity }}
          />
        </div>

        <div className="absolute inset-0" style={EDGE_OVERLAY_STYLE} />

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <h2
            className="font-brand font-light tracking-[-0.02em] text-text-primary"
            style={HEADING_STYLE}
          >
            {heading}
          </h2>
          {subheading && (
            <p
              className="text-base text-text-secondary mt-4 max-w-md"
              style={SUBHEADING_STYLE}
            >
              {subheading}
            </p>
          )}
        </div>
      </div>
    )
  }

  // Scroll-pinned path: outer 300vh reserves scroll space, inner h-screen
  // sticky child pins to the viewport for 100vh of scroll. Three layers
  // inside the sticky child, stacked in source order.
  return (
    <div
      ref={sectionRef}
      aria-hidden="true"
      className="relative w-full h-[300vh] [.light_&]:hidden"
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden pointer-events-none">
        {/* Layer 1 — Canvas with tight radial mask */}
        <div className="absolute inset-0" style={MASK_STYLE}>
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ opacity }}
          />
        </div>

        {/* Layer 2 — Edge overlay forces fade-zone pixels to page color */}
        <div className="absolute inset-0" style={EDGE_OVERLAY_STYLE} />

        {/* Layer 3 — Text: centered, scroll-progress fade-in */}
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center text-center px-6"
          style={{ opacity: scrollTextOpacity }}
        >
          <h2
            className="font-brand font-light tracking-[-0.02em] text-text-primary"
            style={HEADING_STYLE}
          >
            {heading}
          </h2>
          {subheading && (
            <p
              className="text-base text-text-secondary mt-4 max-w-md"
              style={SUBHEADING_STYLE}
            >
              {subheading}
            </p>
          )}
        </motion.div>
      </div>
    </div>
  )
}
