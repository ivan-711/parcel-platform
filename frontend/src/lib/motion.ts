/**
 * Shared animation system for Parcel Platform.
 *
 * Provides standardized durations, easings, spring configs, and Framer Motion
 * variants used across all pages. Import from here instead of duplicating
 * animation constants in individual components.
 */

import type { Variants, Transition } from 'framer-motion'

// ── Standard Durations (seconds) ──────────────────────────────────────────────

export const DURATION = {
  /** 150ms — hover feedback, tap response, micro-interactions */
  fast: 0.15,
  /** 300ms — most transitions, card entry, content reveals */
  normal: 0.3,
  /** 500ms — page-level transitions, hero animations, emphasis */
  slow: 0.5,
} as const

// ── Standard Easings ──────────────────────────────────────────────────────────

export const EASING = {
  /** Snappy deceleration — good for enters and reveals */
  snappy: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
  /** Smooth ease-in-out — good for symmetric transitions */
  smooth: [0.4, 0, 0.2, 1] as [number, number, number, number],
} as const

// ── Standard Spring Configs ───────────────────────────────────────────────────

export const SPRING = {
  /** Default spring — balanced snappy feel for most UI motion */
  default: { type: 'spring' as const, damping: 25, stiffness: 300 },
  /** Stiff spring — navigation indicators, layout shifts */
  stiff: { type: 'spring' as const, damping: 30, stiffness: 400 },
  /** Gentle spring — large element transitions, modals */
  gentle: { type: 'spring' as const, damping: 20, stiffness: 200 },
} as const

// ── Shared Variants ───────────────────────────────────────────────────────────

/** Simple opacity fade-in. Use for content reveals and route transitions. */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: DURATION.normal, ease: EASING.smooth },
  },
}

/** Fade in with a subtle upward slide. Use for cards, sections, list items. */
export const slideUp: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.normal, ease: EASING.snappy },
  },
}

/**
 * Stagger container — orchestrates child animations with sequential delays.
 * Pair with `staggerItem` on child elements.
 *
 * @param delayMs — delay between each child in milliseconds (default: 80)
 */
export function staggerContainer(delayMs = 80): Variants {
  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: delayMs / 1000 },
    },
  }
}

/** Standard stagger item — fade + slide up. Use inside a staggerContainer parent. */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.18, ease: 'easeOut' },
  },
}

// ── Page Transition Variants ──────────────────────────────────────────────────

/**
 * Route-level page transition. Opacity-only crossfade (200ms).
 * Used by the AnimatePresence wrapper in App.tsx.
 */
export const pageTransition: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.2, ease: EASING.smooth },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15 },
  },
}

// ── Utility Variants ──────────────────────────────────────────────────────────

/**
 * Table row entrance with index-based stagger delay.
 * Use with `<motion.tr {...tableRowDelay(index)}>`.
 */
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

/** Hover lift preset — for interactive cards. Apply as spread props on motion elements. */
export const hoverLift = {
  whileHover: { y: -2 },
  whileTap: { scale: 0.98 },
  transition: { duration: DURATION.fast },
} as const

/** Validation shake — single-cycle horizontal shake for form errors. */
export const shake: Variants = {
  idle: {},
  shake: {
    x: [0, -6, 6, -6, 6, 0],
    transition: { duration: 0.4 },
  },
}
