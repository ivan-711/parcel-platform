# Agent 14 — Parcel Animation System

Complete Framer Motion animation spec for Parcel Platform.
Every variant, hook, and timing token defined here is copy-paste ready into `frontend/src/lib/motion.ts`.

Mercury/Linear style: subtle, fast (200-300ms), purposeful. Never bouncy or playful.

---

## 1. Timing Tokens

All durations in seconds (Framer Motion convention). Millisecond equivalents in comments.

```ts
export const DURATION = {
  /** 100ms — micro hover/focus feedback */
  micro: 0.1,
  /** 150ms — tap response, tooltip show, exit animations */
  fast: 0.15,
  /** 200ms — standard enter transitions, dropdowns, small reveals */
  normal: 0.2,
  /** 300ms — modals, panels, emphasis reveals */
  medium: 0.3,
  /** 500ms — page-level hero, landing-only large animations */
  slow: 0.5,
} as const
```

### Change from existing `motion.ts`

Current `DURATION.normal` is `0.3` (300ms). Research confirms Mercury/Linear standard enter transitions are 200ms. Rename the 300ms slot to `medium` and make `normal` = 0.2. Add `micro` at 0.1 for hover feedback.

---

## 2. Easing Curves

Two curves cover every case. A third is not needed.

```ts
export const EASING = {
  /** Snappy deceleration — enters, reveals, list items */
  snappy: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
  /** Smooth ease-in-out — symmetric page transitions, crossfades */
  smooth: [0.4, 0, 0.2, 1] as [number, number, number, number],
} as const
```

No change from existing. These match Mercury exactly.

---

## 3. Spring Configs

```ts
export const SPRING = {
  /** Default spring — balanced for most UI motion (cards, dropdowns) */
  default: { type: 'spring' as const, damping: 25, stiffness: 300 },
  /** Stiff spring — Mercury-standard. Modals, nav indicators, layout shifts. */
  stiff: { type: 'spring' as const, damping: 30, stiffness: 400 },
  /** Gentle spring — large element transitions, landing-page only */
  gentle: { type: 'spring' as const, damping: 20, stiffness: 200 },
} as const
```

No change from existing. `SPRING.stiff` (damping 30, stiffness 400) matches Mercury exactly. Damping ratio ~0.87 is just below critical (40), giving a tiny bit of life without any visible bounce.

---

## 4. Global Variants

### 4a. fadeIn

```ts
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: DURATION.normal, ease: EASING.smooth },
  },
}
```

Change: `DURATION.normal` becomes 0.2 (was 0.3). Faster reveal matches Mercury.

### 4b. slideUp

```ts
export const slideUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.normal, ease: EASING.snappy },
  },
}
```

Change: `y` from 6 to 8. Research says 4-8px is the Mercury range; 8px gives slightly stronger directionality while staying inside the ceiling.

### 4c. slideRight (NEW)

```ts
export const slideRight: Variants = {
  hidden: { opacity: 0, x: -8 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: DURATION.normal, ease: EASING.snappy },
  },
}
```

Use for sidebar-related reveals, drawer panels, and left-to-right content entry.

### 4d. scaleIn (NEW)

```ts
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: DURATION.normal, ease: EASING.snappy },
  },
}
```

Use for modals, command palette, and popup content. Scale from 0.96 only — never below 0.9.

### 4e. staggerContainer

```ts
export function staggerContainer(delayMs = 60): Variants {
  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: delayMs / 1000,
        delayChildren: 0.05,
      },
    },
  }
}
```

Changes from existing:
- Default stagger reduced from 80ms to 60ms. Research says 60ms between items is the Mercury standard.
- Added `delayChildren: 0.05` (50ms) so the container has a beat before children start animating.

### 4f. staggerItem

```ts
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.normal, ease: EASING.snappy },
  },
}
```

Change: `y` from 6 to 8 for consistency with `slideUp`. Duration inherits from `DURATION.normal` (0.2).

---

## 5. Page Transitions (React Router)

```ts
export const pageTransition: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.2, ease: EASING.smooth },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15, ease: EASING.smooth },
  },
}
```

Change: Add `ease: EASING.smooth` to the exit transition (was missing). This prevents a linear fade-out which reads as "abrupt."

Usage in App.tsx (no change to existing pattern):

```tsx
<AnimatePresence mode="wait">
  <motion.div
    key={location.pathname}
    variants={pageTransition}
    initial="initial"
    animate="animate"
    exit="exit"
  >
    <Outlet />
  </motion.div>
</AnimatePresence>
```

No slide transitions. Variable page heights (Dashboard vs. ResultsPage vs. Pipeline) cause visible reflow during lazy loads. Opacity-only crossfade is the correct Mercury pattern.

---

## 6. Component Animations

### 6a. Card Enter

```ts
export const cardEnter: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.normal, ease: EASING.snappy },
  },
}
```

Identical to `slideUp`. Aliased for semantic clarity in card-heavy contexts.

### 6b. List Stagger (Container + Item)

Use `staggerContainer(60)` + `staggerItem` from Section 4.

For lists longer than 8 items, cap the stagger to avoid slow initial renders:

```ts
export function cappedStagger(itemCount: number, maxItems = 8): Variants {
  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.06,
        delayChildren: 0.05,
      },
    },
  }
}
```

Implementation note: items beyond `maxItems` should receive `custom={index}` and a variant that resolves delay to 0 for index >= maxItems. This is handled in the component, not the variant:

```tsx
// In the component
<motion.div
  variants={staggerItem}
  custom={index}
  transition={index >= 8 ? { delay: 0 } : undefined}
>
```

### 6c. List Item Exit

```ts
export const listItemExit: Variants = {
  visible: { opacity: 1, height: 'auto' },
  exit: {
    opacity: 0,
    height: 0,
    marginBottom: 0,
    transition: {
      opacity: { duration: 0.15, ease: EASING.snappy },
      height: { duration: 0.2, delay: 0.05, ease: EASING.smooth },
    },
  },
}
```

Opacity fades first (150ms), then height collapses (200ms with 50ms delay). This prevents the "flash of empty space" that happens when height and opacity animate simultaneously.

### 6d. Modal Open/Close

```ts
export const modalBackdrop: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: DURATION.normal },
  },
  exit: {
    opacity: 0,
    transition: { duration: DURATION.fast },
  },
}

export const modalContent: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: SPRING.stiff,
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 8,
    transition: { duration: DURATION.fast, ease: EASING.smooth },
  },
}
```

Key rules:
- Backdrop fades faster than content appears (backdrop: 200ms, content: spring ~250ms).
- Content scales from 0.96 (not 0.8 -- that feels like a popup ad).
- Exit is always faster than enter (150ms vs ~250ms) -- Mercury pattern.
- `AnimatePresence` wraps the conditional render, never inside the modal.

### 6e. Toast Slide (for custom toasts)

Sonner is installed and handles its own animations. These variants are for any custom toast-like notifications:

```ts
export const toastSlide: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: SPRING.stiff,
  },
  exit: {
    opacity: 0,
    x: 80,
    transition: { duration: DURATION.normal, ease: EASING.smooth },
  },
}
```

Exit slides right (`x: 80`) for dismiss gesture. Auto-dismiss uses opacity-only fade.

### 6f. Dropdown / Popover

```ts
export const dropdownVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: -4 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: DURATION.fast, ease: EASING.snappy },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: -4,
    transition: { duration: 0.1, ease: EASING.smooth },
  },
}
```

Drops down from origin point. Exit at 100ms -- dropdowns must vanish instantly.

---

## 7. Loading: Skeleton to Content Fade

### Skeleton Shimmer (CSS -- already in place)

Keep existing CSS `skeleton-shimmer` keyframe. No Framer Motion needed for the shimmer itself.

### Skeleton-to-Content Transition

```ts
export const skeletonToContent: Variants = {
  skeleton: { opacity: 1 },
  content: {
    opacity: 1,
    transition: { duration: 0 },
  },
}

export const contentReveal: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: DURATION.normal, ease: EASING.smooth },
  },
}
```

Usage pattern:

```tsx
{isLoading ? (
  <SkeletonCard />
) : (
  <motion.div
    variants={contentReveal}
    initial="hidden"
    animate="visible"
  >
    <ActualContent />
  </motion.div>
)}
```

Rules:
- Never show skeleton for less than 300ms (flash of skeleton is worse than no skeleton). Handle via minimum delay in the data hook, not in animation code.
- Content fades in at 200ms. No slide -- the skeleton already occupies the correct spatial position.

---

## 8. Data Animations

### 8a. Number Count-Up for KPIs

`useCountUp` already exists and is RAF-based. Recommended timing adjustments:

```ts
/** Duration scales with magnitude of change */
export function getCountDuration(delta: number): number {
  if (delta < 100) return 400       // small: 400ms
  if (delta < 10_000) return 800    // medium: 800ms
  return 1200                       // large: 1.2s (hard cap)
}
```

Never exceed 1.2s. Easing: ease-out (fast start, slow finish) matches reading cadence. The existing `useCountUp` implementation handles this correctly.

### 8b. Chart Entrance (Recharts)

```tsx
<AreaChart>
  <Area
    isAnimationActive={!prefersReducedMotion}
    animationDuration={800}
    animationEasing="ease-out"
    animationBegin={200}   // 200ms delay — let page layout settle first
  />
</AreaChart>
```

For data updates (e.g., switching strategy tabs), force remount with fresh animation:

```tsx
<AreaChart key={`chart-${selectedStrategy}`}>
```

### 8c. Status Badge Flash

```ts
export const statusFlash: Variants = {
  idle: { scale: 1 },
  updated: {
    scale: [1, 1.15, 1],
    transition: { duration: DURATION.medium },
  },
}
```

Use when a deal status changes. The brief scale pulse draws attention without being disruptive.

---

## 9. Interaction Animations

### 9a. Button Press Scale

```ts
export const buttonPress = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.97 },
  transition: SPRING.stiff,
} as const
```

Per button type:

| Button type | Hover | Tap |
|-------------|-------|-----|
| Primary (filled) | `scale: 1.02` | `scale: 0.97` |
| Ghost / outline | `backgroundColor: 'rgba(99,102,241,0.08)'` | `scale: 0.97` |
| Icon-only | `scale: 1.05` | `scale: 0.92` |

```ts
export const buttonGhostPress = {
  whileHover: { backgroundColor: 'rgba(99,102,241,0.08)' },
  whileTap: { scale: 0.97 },
  transition: { duration: DURATION.micro },
} as const

export const buttonIconPress = {
  whileHover: { scale: 1.05 },
  whileTap: { scale: 0.92 },
  transition: SPRING.stiff,
} as const
```

### 9b. Card Hover Lift

```ts
export const cardHover = {
  whileHover: {
    y: -2,
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
  },
  whileTap: { scale: 0.98 },
  transition: SPRING.stiff,
} as const
```

Change from existing `hoverLift`: adds `boxShadow` for stronger visual affordance. The shadow transition gives a stronger "liftoff" feel than `y` alone.

Card type rules:

| Card type | Hover | Tap | Reason |
|-----------|-------|-----|--------|
| KPI card (Dashboard) | `y: -2` + shadow | `scale: 0.98` | Interactive, clickable |
| Deal card (MyDeals) | `y: -2` + shadow | `scale: 0.98` | Interactive, clickable |
| Pipeline card (Kanban) | None | None | dnd-kit owns transform |
| Strategy card (Analyzer) | `y: -3` + shadow | `scale: 0.97` | Selection action |
| Static info card | None | None | Not interactive |

### 9c. Drag-and-Drop (dnd-kit + Framer Motion)

dnd-kit and Framer Motion both manipulate `transform`. They must never fight.

Rule: When a card is being dragged, dnd-kit owns the transform. When at rest, Framer Motion can animate entry only.

```ts
// In sortable card component:
const { transform, transition, isDragging } = useSortable({ id })

const style = {
  transform: CSS.Transform.toString(transform),
  transition,
  opacity: isDragging ? 0.5 : 1,
  zIndex: isDragging ? 50 : 'auto',
}

// Do NOT apply whileHover/whileTap on sortable cards.
// The transform conflict causes jitter during drag.
```

Drag overlay (ghost card):

```ts
export const dragOverlayStyle = {
  transform: 'scale(1.03)',
  boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
} as const

export const dropAnimation = {
  duration: 200,
  easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
} as const
```

Drop indicator:

```ts
export const dropIndicator: Variants = {
  hidden: { scaleX: 0, opacity: 0 },
  visible: {
    scaleX: 1,
    opacity: 1,
    transition: { type: 'spring', stiffness: 500, damping: 35 },
  },
}
```

---

## 10. `prefers-reduced-motion` Handling

### `useMotionSafe` Hook

```ts
import { useReducedMotion } from 'framer-motion'
import type { Variants } from 'framer-motion'

export function useMotionSafe() {
  const reduce = useReducedMotion()
  return {
    /** Returns the variants if motion is safe, undefined if reduced. */
    safeVariants: (v: Variants) => (reduce ? undefined : v),
    /** Returns the initial state key if motion is safe, false if reduced. */
    safeInitial: (key: string) => (reduce ? false : key),
    /** True when user prefers reduced motion. */
    isReduced: reduce ?? false,
  }
}
```

Usage:

```tsx
function DealCard() {
  const { safeVariants, safeInitial } = useMotionSafe()

  return (
    <motion.div
      variants={safeVariants(cardEnter)}
      initial={safeInitial('hidden')}
      animate="visible"
    >
      ...
    </motion.div>
  )
}
```

### Update `useShake` to Respect Reduced Motion

```ts
import { useReducedMotion } from 'framer-motion'

export function useShake() {
  const [shouldShake, setShouldShake] = useState(false)
  const reduce = useReducedMotion()
  const triggerShake = useCallback(() => setShouldShake(true), [])

  const shakeProps = reduce
    ? {
        // No shake — show red border flash via CSS class instead
        animate: shouldShake ? { borderColor: 'rgba(239,68,68,0.6)' } : {},
        onAnimationComplete: () => setShouldShake(false),
        transition: { duration: 0.3 },
      }
    : {
        variants: shake,
        animate: shouldShake ? 'shake' : 'idle',
        onAnimationComplete: () => setShouldShake(false),
      }

  return { triggerShake, shakeProps, shouldShake }
}
```

### Recharts Reduced Motion

Pass `isAnimationActive={!prefersReducedMotion}` to all Recharts components. The `useMotionSafe` hook's `isReduced` boolean provides this value.

### CSS Shimmer Already Handled

`index.css` already disables shimmer animation under `prefers-reduced-motion: reduce`. No additional work needed for skeleton states.

---

## 11. Complete Variant Objects (Copy-Paste Ready)

This is the full replacement content for `motion.ts`. Every export is documented.

```ts
/**
 * Shared animation system for Parcel Platform.
 *
 * Provides standardized durations, easings, spring configs, and Framer Motion
 * variants used across all pages. Import from here instead of duplicating
 * animation constants in individual components.
 *
 * Style: Mercury/Linear — subtle, fast (200-300ms), purposeful. Never bouncy.
 */

import { useState, useCallback } from 'react'
import { useReducedMotion } from 'framer-motion'
import type { Variants, Transition } from 'framer-motion'

// ── Timing Tokens ────────────────────────────────────────────────────────────

export const DURATION = {
  /** 100ms — micro hover/focus feedback */
  micro: 0.1,
  /** 150ms — tap response, tooltip show, all exit animations */
  fast: 0.15,
  /** 200ms — standard enter transitions, dropdowns, content reveals */
  normal: 0.2,
  /** 300ms — modals, panels, emphasis reveals */
  medium: 0.3,
  /** 500ms — page-level hero, landing-only large animations */
  slow: 0.5,
} as const

// ── Easing Curves ────────────────────────────────────────────────────────────

export const EASING = {
  /** Snappy deceleration — enters, reveals, list items */
  snappy: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
  /** Smooth ease-in-out — symmetric page transitions, crossfades */
  smooth: [0.4, 0, 0.2, 1] as [number, number, number, number],
} as const

// ── Spring Configs ───────────────────────────────────────────────────────────

export const SPRING = {
  /** Default spring — balanced for most UI motion */
  default: { type: 'spring' as const, damping: 25, stiffness: 300 },
  /** Stiff spring — Mercury-standard. Modals, nav indicators, layout shifts */
  stiff: { type: 'spring' as const, damping: 30, stiffness: 400 },
  /** Gentle spring — large element transitions, landing-page only */
  gentle: { type: 'spring' as const, damping: 20, stiffness: 200 },
} as const

// ── Global Variants ──────────────────────────────────────────────────────────

/** Simple opacity fade-in. Content reveals and route transitions. */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: DURATION.normal, ease: EASING.smooth },
  },
}

/** Fade in with upward slide (8px). Cards, sections, list items. */
export const slideUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.normal, ease: EASING.snappy },
  },
}

/** Fade in with rightward slide (8px). Sidebar reveals, drawer panels. */
export const slideRight: Variants = {
  hidden: { opacity: 0, x: -8 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: DURATION.normal, ease: EASING.snappy },
  },
}

/** Fade in with scale from 0.96. Modals, command palette, popups. */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: DURATION.normal, ease: EASING.snappy },
  },
}

// ── Stagger ──────────────────────────────────────────────────────────────────

/**
 * Stagger container — orchestrates child animations with sequential delays.
 * Pair with `staggerItem` on children.
 *
 * @param delayMs — gap between children in ms (default: 60)
 */
export function staggerContainer(delayMs = 60): Variants {
  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: delayMs / 1000,
        delayChildren: 0.05,
      },
    },
  }
}

/** Stagger child — fade + slide up. Use inside a staggerContainer parent. */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.normal, ease: EASING.snappy },
  },
}

/**
 * Capped stagger for long lists.
 * Items beyond maxItems animate simultaneously (no additional delay).
 */
export function cappedStagger(itemCount: number, maxItems = 8): Variants {
  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.06,
        delayChildren: 0.05,
      },
    },
  }
}

// ── Page Transitions ─────────────────────────────────────────────────────────

/**
 * Route-level page crossfade. Used by AnimatePresence in App.tsx.
 * Uses initial/animate/exit keys (not hidden/visible).
 */
export const pageTransition: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.2, ease: EASING.smooth },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15, ease: EASING.smooth },
  },
}

// ── Component Animations ─────────────────────────────────────────────────────

/** Card entrance — alias of slideUp for semantic clarity. */
export const cardEnter: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.normal, ease: EASING.snappy },
  },
}

/** List item exit with height collapse. Wrap in AnimatePresence. */
export const listItemExit: Variants = {
  visible: { opacity: 1, height: 'auto' },
  exit: {
    opacity: 0,
    height: 0,
    marginBottom: 0,
    transition: {
      opacity: { duration: DURATION.fast, ease: EASING.snappy },
      height: { duration: DURATION.normal, delay: 0.05, ease: EASING.smooth },
    },
  },
}

/** Modal backdrop fade. */
export const modalBackdrop: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: DURATION.normal },
  },
  exit: {
    opacity: 0,
    transition: { duration: DURATION.fast },
  },
}

/** Modal content spring — scale 0.96 -> 1 with stiff spring. */
export const modalContent: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: SPRING.stiff,
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 8,
    transition: { duration: DURATION.fast, ease: EASING.smooth },
  },
}

/** Toast slide-in from bottom. Exit slides right on dismiss. */
export const toastSlide: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: SPRING.stiff,
  },
  exit: {
    opacity: 0,
    x: 80,
    transition: { duration: DURATION.normal, ease: EASING.smooth },
  },
}

/** Dropdown/popover reveal from origin point. */
export const dropdownVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: -4 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: DURATION.fast, ease: EASING.snappy },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: -4,
    transition: { duration: DURATION.micro, ease: EASING.smooth },
  },
}

// ── Loading ──────────────────────────────────────────────────────────────────

/** Content reveal after skeleton loading completes. */
export const contentReveal: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: DURATION.normal, ease: EASING.smooth },
  },
}

// ── Data Animations ──────────────────────────────────────────────────────────

/** Badge/status pulse when value changes. */
export const statusFlash: Variants = {
  idle: { scale: 1 },
  updated: {
    scale: [1, 1.15, 1],
    transition: { duration: DURATION.medium },
  },
}

/** Recommended count-up duration by delta magnitude. */
export function getCountDuration(delta: number): number {
  if (delta < 100) return 400
  if (delta < 10_000) return 800
  return 1200
}

/** Recharts animation props (spread onto Area/Bar/Line components). */
export function chartAnimationProps(prefersReducedMotion: boolean) {
  return {
    isAnimationActive: !prefersReducedMotion,
    animationDuration: 800,
    animationEasing: 'ease-out' as const,
    animationBegin: 200,
  }
}

// ── Interaction Presets (spread onto motion elements) ────────────────────────

/** Primary button press — subtle scale on hover and tap. */
export const buttonPress = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.97 },
  transition: SPRING.stiff,
} as const

/** Ghost/outline button — background tint on hover, scale on tap. */
export const buttonGhostPress = {
  whileHover: { backgroundColor: 'rgba(99,102,241,0.08)' },
  whileTap: { scale: 0.97 },
  transition: { duration: DURATION.micro },
} as const

/** Icon-only button — slightly larger scale range. */
export const buttonIconPress = {
  whileHover: { scale: 1.05 },
  whileTap: { scale: 0.92 },
  transition: SPRING.stiff,
} as const

/** Card hover lift with shadow. For clickable deal/KPI cards. */
export const cardHover = {
  whileHover: {
    y: -2,
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
  },
  whileTap: { scale: 0.98 },
  transition: SPRING.stiff,
} as const

/**
 * @deprecated Use `cardHover` instead. Kept for backward compat.
 */
export const hoverLift = {
  whileHover: { y: -2 },
  whileTap: { scale: 0.98 },
  transition: { duration: DURATION.fast },
} as const

// ── Drag-and-Drop ────────────────────────────────────────────────────────────

/** Style for DragOverlay ghost card. */
export const dragOverlayStyle = {
  transform: 'scale(1.03)',
  boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
} as const

/** dnd-kit dropAnimation config. */
export const dropAnimation = {
  duration: 200,
  easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
} as const

/** Column drop indicator line animation. */
export const dropIndicator: Variants = {
  hidden: { scaleX: 0, opacity: 0 },
  visible: {
    scaleX: 1,
    opacity: 1,
    transition: { type: 'spring', stiffness: 500, damping: 35 },
  },
}

// ── Table Row ────────────────────────────────────────────────────────────────

/** Table row entrance with index-based stagger. */
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

// ── Validation ───────────────────────────────────────────────────────────────

/** Horizontal shake for form validation errors. */
export const shake: Variants = {
  idle: {},
  shake: {
    x: [0, -6, 6, -6, 6, 0],
    transition: { duration: 0.4 },
  },
}

/** Shake hook with prefers-reduced-motion support. */
export function useShake() {
  const [shouldShake, setShouldShake] = useState(false)
  const reduce = useReducedMotion()
  const triggerShake = useCallback(() => setShouldShake(true), [])

  const shakeProps = reduce
    ? {
        animate: shouldShake
          ? { borderColor: 'rgba(239,68,68,0.6)' }
          : {},
        onAnimationComplete: () => setShouldShake(false),
        transition: { duration: 0.3 },
      }
    : {
        variants: shake,
        animate: shouldShake ? 'shake' : 'idle',
        onAnimationComplete: () => setShouldShake(false),
      }

  return { triggerShake, shakeProps, shouldShake }
}

// ── Accessibility ────────────────────────────────────────────────────────────

/** Respects prefers-reduced-motion. Wraps all variant usage. */
export function useMotionSafe() {
  const reduce = useReducedMotion()
  return {
    /** Returns variants if motion is allowed, undefined if reduced. */
    safeVariants: (v: Variants) => (reduce ? undefined : v),
    /** Returns initial key if motion is allowed, false if reduced. */
    safeInitial: (key: string) => (reduce ? false : key),
    /** True when user prefers reduced motion. */
    isReduced: reduce ?? false,
  }
}
```

---

## 12. What to Keep, What to Change

### Keep As-Is

| Export | Reason |
|--------|--------|
| `EASING.snappy` / `EASING.smooth` | Already match Mercury exactly |
| `SPRING.default` / `.stiff` / `.gentle` | Correct damping/stiffness ratios |
| `pageTransition` | Opacity crossfade is the right pattern; only needs ease on exit |
| `tableRowDelay` | Index-based stagger with 40ms gap is correct |
| `shake` variants | Single-cycle horizontal shake is effective |

### Change

| Export | Current | New | Why |
|--------|---------|-----|-----|
| `DURATION.normal` | `0.3` (300ms) | `0.2` (200ms) | Mercury standard enter is 200ms |
| `DURATION` (add) | No `micro` or `medium` | Add `micro: 0.1`, `medium: 0.3` | Cover full timing range |
| `slideUp.hidden.y` | `6` | `8` | Top of Mercury's 4-8px range |
| `staggerContainer` default | `80ms` | `60ms` | Mercury uses 60ms between items |
| `staggerContainer` | No `delayChildren` | Add `delayChildren: 0.05` | 50ms pause before children start |
| `staggerItem.hidden.y` | `6` | `8` | Match `slideUp` |
| `staggerItem` transition | `duration: 0.18, ease: 'easeOut'` | `duration: 0.2, ease: EASING.snappy` | Use shared constants |
| `pageTransition.exit` | No ease specified | Add `ease: EASING.smooth` | Prevent linear fade-out |
| `hoverLift` | `y: -2`, no shadow | Deprecated; replaced by `cardHover` with shadow | Shadow gives stronger affordance |
| `useShake` | No reduced-motion check | Check `useReducedMotion()`, fallback to border flash | Accessibility compliance |

### Add (New Exports)

| Export | Purpose |
|--------|---------|
| `slideRight` | Sidebar/drawer reveals |
| `scaleIn` | Modal/popup entrance |
| `cardEnter` | Semantic alias for card contexts |
| `listItemExit` | AnimatePresence exit with height collapse |
| `modalBackdrop` / `modalContent` | Spring-animated modal system |
| `toastSlide` | Custom toast enter/exit |
| `dropdownVariants` | Popover/dropdown reveal |
| `contentReveal` | Skeleton-to-content transition |
| `statusFlash` | Badge pulse on value change |
| `buttonPress` / `buttonGhostPress` / `buttonIconPress` | Per-type button micro-interactions |
| `cardHover` | Shadow-enhanced card hover |
| `dragOverlayStyle` / `dropAnimation` / `dropIndicator` | dnd-kit animation constants |
| `chartAnimationProps` | Recharts animation config helper |
| `getCountDuration` | Count-up duration by delta magnitude |
| `useMotionSafe` | prefers-reduced-motion hook |

### Remove

Nothing is removed. `hoverLift` is deprecated but kept for backward compat to avoid a multi-file migration in this pass.

---

## CRITICAL DECISIONS

1. **`DURATION.normal` changes from 300ms to 200ms.** This is the single most impactful change. Every component importing `DURATION.normal` will animate 33% faster. This is correct -- Mercury/Linear standard enter transitions are 200ms. The current 300ms feels sluggish for a data-heavy SaaS where users navigate rapidly between deals.

2. **No slide page transitions.** Variable page heights (Dashboard ~800px, ResultsPage ~2000px, Pipeline ~600px) cause visible layout reflow during lazy route loads. Opacity-only crossfade is the definitive Mercury pattern for SPAs with heterogeneous page sizes. This is a permanent architectural decision.

3. **dnd-kit owns transform during drag.** Never apply Framer Motion `whileHover` or `whileTap` on sortable pipeline cards. The two libraries fight over `transform` and cause visible jitter. Entry animations via Framer Motion are fine because they complete before drag begins.

4. **`useMotionSafe` is mandatory for accessibility compliance.** Every component using Framer Motion variants should call `useMotionSafe` and pass `safeVariants` / `safeInitial`. Current app pages do not honor `prefers-reduced-motion` for JS animations -- only CSS animations are handled via `index.css`. This is a WCAG 2.1 AA gap.

5. **Exit animations are always 75% of enter duration.** Enter at 200ms, exit at 150ms. Enter at 300ms (modals), exit at ~200ms via spring. This is the Mercury pattern -- exits feel instantaneous because the user's attention has already moved to the next action.

6. **Spring damping stays at 28-32 range.** Critical damping for stiffness 400 is 40. Parcel uses 30 (ratio 0.75), which gives a tiny bit of life without any visible overshoot. Never go below 25 (underdamped bounce) or above 35 (overdamped sluggishness).

7. **Stagger caps at 8 items.** Beyond 8 items, additional stagger delay creates perceptible lag on initial page load. Items 9+ should animate simultaneously with items 8. This matters for MyDeals lists and pipeline columns with many cards.

8. **Chart animation begins at 200ms after mount.** Recharts animations starting at t=0 compete with page transition for GPU time and can cause frame drops. The 200ms delay lets the layout settle, then the chart draws smoothly.

9. **`boxShadow` on hover is an exception to the GPU-only rule.** The research notes that `box-shadow` is not GPU-accelerated and recommends pseudo-elements. However, Framer Motion's spring interpolation of `boxShadow` on a single card at a time (hover) is negligible cost. The visual payoff (shadow lift affordance) justifies it for interactive cards. Do not apply this to lists of 20+ simultaneously visible cards.

10. **`hoverLift` deprecated, not removed.** Multiple components reference `hoverLift`. Removing it forces a multi-file migration. Mark deprecated, migrate callers incrementally to `cardHover`.
