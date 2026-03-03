/**
 * ParallaxBackground — ghost deal cards drifting upward at 3 speeds on scroll.
 * Pure atmosphere: opacity 0.07–0.12. Never competes with foreground content.
 * Uses Framer Motion useScroll + useTransform. Fixed behind z-index 0.
 */

import { useRef } from 'react'
import { motion, useScroll, useTransform, useReducedMotion, type MotionValue } from 'framer-motion'

/* ── Strategy badge colors (from design-brief.jsonc) ── */
type Strategy = 'Buy & Hold' | 'BRRRR' | 'Wholesale' | 'Creative Finance' | 'Flip'

const BADGE: Record<Strategy, { bg: string; text: string; label: string }> = {
  'Buy & Hold':       { bg: '#064E3B', text: '#6EE7B7', label: 'Buy & Hold' },
  'BRRRR':            { bg: '#0C1A4A', text: '#93C5FD', label: 'BRRRR' },
  'Wholesale':        { bg: '#451A03', text: '#FCD34D', label: 'Wholesale' },
  'Creative Finance': { bg: '#2E1065', text: '#C4B5FD', label: 'Creative Finance' },
  'Flip':             { bg: '#431407', text: '#FCA5A1', label: 'Flip' },
}

/* ── Card data ── */
interface GhostCard {
  address: string
  strategy: Strategy
  metric: string
  top: number       // px from top of scroll canvas
  left: string      // percent string
  rotation: number  // deg, hardcoded
  floatDelay: number
  floatDuration: number
}

interface Layer {
  cards: GhostCard[]
  yEnd: number      // how far (px) this layer moves over full scroll
  width: number     // card width px
  opacity: number
}

const LAYERS: Layer[] = [
  {
    yEnd: -400,
    width: 240,
    opacity: 0.09,
    cards: [
      { address: '1842 Vine St, Nashville TN',       strategy: 'Buy & Hold',       metric: 'CoC  9.1%',       top:   80, left: '8%',                    rotation: -1.2, floatDelay: 0,   floatDuration: 7 },
      { address: '328 Harbor View, Phoenix AZ',      strategy: 'BRRRR',            metric: 'CoC  12.8%',      top:  260, left: '-20px',                  rotation:  0.5, floatDelay: 1.1, floatDuration: 6 },
      { address: '7215 Mission Blvd, Denver CO',     strategy: 'Flip',             metric: 'Profit  $29,400', top:  460, left: '18%',                    rotation: -1.8, floatDelay: 0.4, floatDuration: 7 },
      { address: '4407 Ridge Ave, Atlanta GA',       strategy: 'BRRRR',            metric: 'CoC  14.2%',      top:  680, left: 'calc(100% - 160px)',      rotation:  1.0, floatDelay: 1.4, floatDuration: 6 },
      { address: '1590 Riverside Dr, Portland OR',   strategy: 'Buy & Hold',       metric: 'CoC  7.9%',       top:  900, left: '10%',                    rotation: -0.8, floatDelay: 0.7, floatDuration: 8 },
      { address: '903 Maple Dr, Columbus OH',        strategy: 'Wholesale',        metric: 'Fee  $22,400',    top: 1100, left: '62%',                    rotation:  1.8, floatDelay: 2.0, floatDuration: 6 },
    ],
  },
  {
    yEnd: -700,
    width: 200,
    opacity: 0.10,
    cards: [
      { address: '6601 Oak Rd, Dallas TX',           strategy: 'Creative Finance', metric: '$0 down',         top:  160, left: '72%',                    rotation:  1.2, floatDelay: 0.5, floatDuration: 6 },
      { address: '4822 Summit Ave, Seattle WA',      strategy: 'BRRRR',            metric: 'CoC  15.1%',      top:  380, left: 'calc(100% - 160px)',      rotation: -0.8, floatDelay: 1.6, floatDuration: 7 },
      { address: '2103 Pine Blvd, Memphis TN',       strategy: 'Flip',             metric: 'Profit  $38,200', top:  600, left: '34%',                    rotation: -1.6, floatDelay: 2.1, floatDuration: 7 },
      { address: '661 Bayshore Dr, Miami FL',        strategy: 'Wholesale',        metric: 'Fee  $41,500',    top:  820, left: '-20px',                   rotation:  0.9, floatDelay: 0.3, floatDuration: 6 },
      { address: '7720 Cedar Ave, Tampa FL',         strategy: 'Buy & Hold',       metric: 'CoC  8.8%',       top: 1040, left: '80%',                    rotation:  0.6, floatDelay: 0.2, floatDuration: 5 },
      { address: '3310 Elm St, Indianapolis IN',     strategy: 'Wholesale',        metric: 'Fee  $18,900',    top: 1260, left: '44%',                    rotation: -2.0, floatDelay: 1.8, floatDuration: 8 },
    ],
  },
  {
    yEnd: -1100,
    width: 180,
    opacity: 0.14,
    cards: [
      { address: '5544 Birch Ln, Charlotte NC',      strategy: 'BRRRR',            metric: 'CoC  16.8%',      top:   80, left: '52%',                    rotation:  1.5, floatDelay: 0.9, floatDuration: 6 },
      { address: '1207 Walnut St, Kansas City MO',   strategy: 'Buy & Hold',       metric: 'CoC  7.4%',       top:  280, left: '14%',                    rotation: -1.0, floatDelay: 2.6, floatDuration: 7 },
      { address: '3381 Meadow Ln, Houston TX',       strategy: 'Creative Finance', metric: '$0 down',         top:  460, left: '-20px',                   rotation:  0.6, floatDelay: 0.4, floatDuration: 6 },
      { address: '8834 Spruce Dr, Jacksonville FL',  strategy: 'Flip',             metric: 'Profit  $44,200', top:  660, left: '68%',                    rotation:  2.0, floatDelay: 0.3, floatDuration: 5 },
      { address: '9104 Lakeview Dr, Detroit MI',     strategy: 'BRRRR',            metric: 'CoC  13.4%',      top:  860, left: 'calc(100% - 160px)',      rotation: -0.8, floatDelay: 1.5, floatDuration: 7 },
      { address: '445 Linden Ave, Louisville KY',    strategy: 'Creative Finance', metric: '$0 down',         top: 1060, left: '28%',                    rotation: -1.4, floatDelay: 1.2, floatDuration: 8 },
      { address: '2756 Sunset Blvd, Las Vegas NV',   strategy: 'Buy & Hold',       metric: 'CoC  8.2%',       top: 1260, left: '56%',                    rotation:  1.1, floatDelay: 2.2, floatDuration: 6 },
      { address: '2967 Ash Blvd, Cincinnati OH',     strategy: 'Wholesale',        metric: 'Fee  $31,600',    top: 1460, left: '76%',                    rotation:  0.9, floatDelay: 3.0, floatDuration: 6 },
    ],
  },
]

/* ── Single ghost card ── */
interface GhostCardProps {
  card: GhostCard
  width: number
  opacity: number
  layerY: MotionValue<number>
}

function GhostCardEl({ card, width, opacity, layerY }: GhostCardProps) {
  const badge = BADGE[card.strategy]
  const prefersReduced = useReducedMotion()

  const floatProps = prefersReduced
    ? {}
    : {
        animate: { y: [0, -6, 0] },
        transition: {
          duration: card.floatDuration,
          delay: card.floatDelay,
          repeat: Infinity,
          ease: 'easeInOut' as const,
        },
      }

  return (
    <motion.div
      style={{
        position: 'absolute',
        top: card.top,
        left: card.left,
        width,
        rotate: card.rotation,
        y: layerY,
        opacity,
      }}
    >
      {/* Floating drift on top of parallax — disabled when user prefers reduced motion */}
      <motion.div
        {...floatProps}
        style={{
          background: 'rgba(15,15,26,0.4)',
          border: '1px solid rgba(99,102,241,0.15)',
          borderRadius: 12,
          padding: 16,
          boxShadow: '0 0 20px rgba(99,102,241,0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {/* Address */}
        <p style={{ color: '#F1F5F9', fontSize: 11, lineHeight: 1.3, fontFamily: 'Inter, sans-serif', margin: 0 }}>
          {card.address}
        </p>

        {/* Strategy badge */}
        <span
          style={{
            display: 'inline-flex',
            alignSelf: 'flex-start',
            backgroundColor: badge.bg,
            color: badge.text,
            fontSize: 9,
            fontWeight: 600,
            padding: '2px 6px',
            borderRadius: 4,
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {badge.label}
        </span>

        {/* Metric */}
        <p
          style={{
            color: '#94A3B8',
            fontSize: 11,
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 500,
            margin: 0,
          }}
        >
          {card.metric}
        </p>
      </motion.div>
    </motion.div>
  )
}

/* ── Parallax layer wrapper ── */
interface ParallaxLayerProps {
  layer: Layer
  scrollYProgress: MotionValue<number>
}

const CARD_OPACITIES = [0.06, 0.09, 0.13]

function ParallaxLayer({ layer, scrollYProgress }: ParallaxLayerProps) {
  const y = useTransform(scrollYProgress, [0, 1], [0, layer.yEnd])

  return (
    <>
      {layer.cards.map((card, i) => (
        <GhostCardEl
          key={card.address}
          card={card}
          width={layer.width}
          opacity={CARD_OPACITIES[i % 3]}
          layerY={y}
        />
      ))}
    </>
  )
}

/* ── Main component ── */
export function ParallaxBackground() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll()

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        backgroundColor: '#08080F',
      }}
    >
      {/* Dot grid overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(circle, #1A1A2E 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          opacity: 0.4,
        }}
      />

      {/* Ambient blob 1 — indigo */}
      <div
        className="blob-1"
        style={{
          position: 'absolute',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: '#6366F1',
          opacity: 0.08,
          filter: 'blur(140px)',
          top: '5%',
          left: '10%',
        }}
      />

      {/* Ambient blob 2 — purple */}
      <div
        className="blob-2"
        style={{
          position: 'absolute',
          width: 480,
          height: 480,
          borderRadius: '50%',
          background: '#8B5CF6',
          opacity: 0.06,
          filter: 'blur(120px)',
          top: '35%',
          right: '8%',
        }}
      />

      {/* Ghost card layers — scroll canvas. Hidden on mobile for performance. */}
      <div className="hidden md:block" style={{ position: 'absolute', inset: 0 }}>
        {LAYERS.map((layer) => (
          <ParallaxLayer
            key={layer.yEnd}
            layer={layer}
            scrollYProgress={scrollYProgress}
          />
        ))}
      </div>

      {/* Center fade mask — clears space behind hero headline */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse 55% 60% at 50% 35%, rgba(8,8,15,0.85) 0%, transparent 100%)',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />
    </div>
  )
}
