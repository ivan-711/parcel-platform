/**
 * Shared animation system for Parcel Platform — Luxury Dark Edition.
 *
 * Provides standardized durations, easings, spring configs, and Framer Motion
 * variants used across all pages. Import from here instead of duplicating
 * animation constants in individual components.
 *
 * Design system ref: LUXURY-DESIGN-SYSTEM.md Section 8
 */

import { useState, useCallback } from 'react'
import type { Variants } from 'framer-motion'

// ── Reduced Motion Detection (BLOCK-06 resolution) ────────────────────────────

export const prefersReducedMotion =
  typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false

// ── Timing Tokens ─────────────────────────────────────────────────────────────

export const duration = {
  /** 80ms — hover color, focus, press */
  instant: 0.08,
  /** 150ms — tooltips, dropdowns, button states */
  fast: 0.15,
  /** 200ms — page enter, card entrance, nav transitions */
  normal: 0.20,
  /** 300ms — backdrop fade, complex state changes, accordions */
  slow: 0.30,
  /** 500ms — chart entrance, landing page (NEVER in auth'd app) */
  dramatic: 0.50,
} as const

// Legacy aliases — kept for backward compatibility, prefer motion.duration.*, motion.easing.*, motion.spring.*
export const DURATION = {
  fast: duration.fast,
  normal: duration.slow,
  slow: duration.dramatic,
} as const

// ── Easing Curves (canonical — BLOCK-04 resolution) ───────────────────────────

export const ease = {
  /** Default for ALL CSS transitions */
  luxury: [0.25, 0.1, 0.25, 1.0] as [number, number, number, number],
  /** Framer Motion page entrances and landing sections ONLY */
  vercel: [0.22, 1, 0.36, 1] as [number, number, number, number],
} as const

// Legacy aliases — kept for backward compatibility, prefer motion.duration.*, motion.easing.*, motion.spring.*
export const EASING = {
  snappy: ease.luxury,
  smooth: [0.4, 0, 0.2, 1] as [number, number, number, number],
} as const

// ── Spring Presets ────────────────────────────────────────────────────────────

export const spring = {
  /** Cards, modals, general UI — snappy */
  snappy: { type: 'spring' as const, stiffness: 500, damping: 30, mass: 0.8 },
  /** Charts, tooltips — gentle follow */
  gentle: { type: 'spring' as const, stiffness: 400, damping: 28, mass: 0.5 },
} as const

// ── Transition Presets ────────────────────────────────────────────────────────

export const transition = {
  fast:    { duration: duration.fast, ease: ease.luxury },
  default: { duration: duration.normal, ease: ease.luxury },
  spring:  spring.snappy,
} as const

// ── Shared Variants (preserved from v1) ───────────────────────────────────────

const slideUp: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.normal, ease: ease.luxury },
  },
}

export function staggerContainer(delayMs = 50): Variants {
  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: delayMs / 1000 },
    },
  }
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.normal, ease: ease.luxury },
  },
}

// ── Safe Shared Variants (reduced motion) ────────────────────────────────────

export const safeSlideUp = prefersReducedMotion
  ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
  : slideUp

export const safeStaggerItem = prefersReducedMotion
  ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
  : staggerItem

export function safeStaggerContainer(delayMs = 50): Variants {
  return prefersReducedMotion
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
    : staggerContainer(delayMs)
}

// ── Utility Variants ──────────────────────────────────────────────────────────

/** Validation shake — single-cycle horizontal shake for form errors. */
export const shake: Variants = {
  idle: {},
  shake: {
    x: [0, -6, 6, -6, 6, 0],
    transition: { duration: 0.4 },
  },
}

/** Hook: shake a form wrapper on validation errors. */
export function useShake() {
  const [shouldShake, setShouldShake] = useState(false)
  const triggerShake = useCallback(() => setShouldShake(true), [])
  const shakeProps = {
    variants: shake,
    animate: shouldShake ? 'shake' : 'idle',
    onAnimationComplete: () => setShouldShake(false),
  } as const
  return { triggerShake, shakeProps }
}
