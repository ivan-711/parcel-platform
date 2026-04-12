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
import type { Variants, Transition } from 'framer-motion'

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

// Legacy aliases — kept for backward compatibility, prefer motion.duration.*, motion.easing.*, motion.spring.*
export const SPRING = {
  default: { type: 'spring' as const, damping: 25, stiffness: 300 },
  stiff: spring.snappy,
  gentle: { type: 'spring' as const, damping: 20, stiffness: 200 },
} as const

// ── Transition Presets ────────────────────────────────────────────────────────

export const transition = {
  fast:    { duration: duration.fast, ease: ease.luxury },
  default: { duration: duration.normal, ease: ease.luxury },
  spring:  spring.snappy,
} as const

// ── Page Transition Variants ──────────────────────────────────────────────────

export const pageVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -4 },
} as const

export const pageTransitionConfig = {
  enter: { duration: duration.normal, ease: ease.luxury },
  exit:  { duration: 0.12, ease: [0.4, 0, 1, 1] as [number, number, number, number] },
} as const

// Backward compat alias — now uses canonical spec values
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.normal, ease: ease.luxury },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: 0.12, ease: [0.4, 0, 1, 1] },
  },
}

// ── Card Entrance Stagger ─────────────────────────────────────────────────────

export const cardContainerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
}

export const cardVariants: Variants = {
  hidden:  { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: spring.snappy },
}

// ── Safe Variants (reduced motion) ────────────────────────────────────────────

export const safePageVariants = prefersReducedMotion
  ? { initial: {}, animate: {}, exit: {} }
  : pageVariants

export const safeCardContainerVariants = prefersReducedMotion
  ? { hidden: {}, visible: {} }
  : cardContainerVariants

export const safeCardVariants = prefersReducedMotion
  ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
  : cardVariants

export const safeTransition = prefersReducedMotion
  ? { duration: 0 }
  : transition.default

// ── Shared Variants (preserved from v1) ───────────────────────────────────────

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: duration.normal, ease: ease.luxury },
  },
}

export const slideUp: Variants = {
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

export const safeFadeIn = prefersReducedMotion
  ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
  : fadeIn

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

export function tableRowDelay(index: number): {
  initial: { opacity: number; y: number }
  animate: { opacity: number; y: number; transition: Transition }
} {
  return {
    initial: { opacity: 0, y: 4 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.18, delay: index * 0.04 },
    },
  }
}

/** Hover lift — for interactive cards. No scale on hover per design system. */
export const hoverLift = {
  whileHover: { y: -2 },
  whileTap: { scale: 0.98 },
  transition: { duration: duration.fast },
} as const

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

// ── Landing Page Scroll Animations ────────────────────────────────────────────

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.dramatic, ease: ease.vercel },
  },
}

export const scrollStagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}
