# Framer Motion Animation Research for Parcel

Research document covering animation best practices for a real estate deal analysis SaaS.
Tailored to Parcel's stack: Framer Motion v11, React, dnd-kit, Recharts, shadcn/ui.

---

## 1. What to Animate vs. Leave Static

### Animate (high-value motion)
- **Route transitions** — signal spatial navigation, reduce perceived load time
- **Data state changes** — KPI counters, chart redraws, badge updates
- **User-initiated actions** — button presses, card drags, form submissions
- **Enter/exit of dynamic elements** — toasts, modals, dropdowns, list items
- **Loading states** — skeleton shimmer, placeholder pulse

### Leave static (motion adds no value)
- Sidebar navigation links, breadcrumbs, static labels
- Form field labels and helper text
- Table headers and column dividers
- Persistent layout chrome (topbar, footer)
- Icons that are always visible (non-interactive status indicators)

### Rule of thumb
If removing the animation would make the UI feel broken or disorienting, keep it.
If removing it changes nothing, delete it.

---

## 2. Page Transitions

### Current state
Parcel uses an opacity-only crossfade (200ms in, 150ms out) via `pageTransition` in `motion.ts`.

### Options evaluated

| Pattern | Duration | Pros | Cons |
|---------|----------|------|------|
| Opacity crossfade | 150-200ms | Simple, no layout shift | Can feel flat |
| Slide + fade | 200-300ms | Directional context | Risky with variable page heights |
| Cross-dissolve (shared layout) | 200-250ms | Smooth content swap | Complex with lazy routes |
| Scale + fade | 150-200ms | Modern, app-like | Can feel "zoomy" if overdone |

### Recommended config for Parcel

```ts
// Keep the current crossfade — it is the Mercury/Linear standard.
// Tighten the exit to match enter duration for symmetry.
export const pageTransition: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15, ease: [0.4, 0, 1, 1] },
  },
}
```

The current implementation is already correct. No change needed.
Slide transitions are not recommended for Parcel because page heights vary significantly
(Dashboard vs. ResultsPage vs. Pipeline) and slides amplify layout reflow during lazy loads.

---

## 3. Loading States

### Skeleton shimmer (recommended for Parcel)

Parcel already uses `SkeletonCard` with a CSS `skeleton-shimmer` keyframe.
This is the right approach for a data-heavy SaaS. Key principles:

- Match skeleton shapes to final content layout (not generic rectangles)
- Shimmer direction: left-to-right, 1.5s cycle, ease-in-out
- Never show skeleton for less than 300ms (flash of skeleton is worse than no skeleton)
- Use `prefers-reduced-motion` to disable shimmer, show static gray blocks

```css
/* Already in index.css — keep as-is */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-shimmer { animation: none; }
}
```

### When to use each loading pattern

| Pattern | Use case |
|---------|----------|
| Skeleton screens | Page-level data (Dashboard, MyDeals, Pipeline columns) |
| Inline spinner | Button loading state (small, contained) |
| Progress bar | File uploads, PDF generation |
| Optimistic update | Pipeline card moves, toggle switches |

Never use full-screen spinners.

---

## 4. Button Interactions

### Hover + press feedback

```ts
// Subtle scale — Mercury style. No bouncy overshoot.
export const buttonMotion = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.97 },
  transition: { type: 'spring', stiffness: 400, damping: 30 },
} as const
```

### Loading state (spinner inside button)

```ts
// Framer Motion layout animation keeps button width stable
// while swapping text for spinner.
export const buttonLoadingVariants: Variants = {
  idle: { opacity: 1 },
  loading: {
    opacity: 1,
    transition: { duration: 0.15 },
  },
}

// Spinner rotation (CSS is fine here — no need for Framer Motion)
// .btn-spinner { animation: spin 0.6s linear infinite; }
```

### Primary vs. ghost buttons
- Primary (filled): `whileHover: { scale: 1.02 }`, `whileTap: { scale: 0.97 }`
- Ghost/outline: `whileHover: { backgroundColor: 'rgba(99,102,241,0.08)' }` — no scale
- Icon-only: `whileHover: { scale: 1.05 }`, `whileTap: { scale: 0.92 }`

---

## 5. Card Hover Effects

### Current state
Parcel uses `hoverLift` in `motion.ts`: `whileHover: { y: -2 }`, `whileTap: { scale: 0.98 }`.

### Recommended enhancement

```ts
// Subtle lift + shadow increase. No border color change on hover
// (border changes cause repaints across the full card).
export const cardHover = {
  whileHover: {
    y: -2,
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
  },
  whileTap: { scale: 0.98 },
  transition: {
    type: 'spring',
    stiffness: 400,
    damping: 30,
  },
} as const
```

### Card types and their motion

| Card type | Hover | Tap | Reasoning |
|-----------|-------|-----|-----------|
| KPI card (Dashboard) | `y: -2` + shadow | `scale: 0.98` | Interactive, clickable |
| Deal card (MyDeals) | `y: -2` + shadow | `scale: 0.98` | Interactive, clickable |
| Pipeline card (Kanban) | None (drag handles it) | None | dnd-kit manages transform |
| Strategy card (Analyzer) | `y: -3` + shadow | `scale: 0.97` | Selection action |
| Static info card | None | None | Not interactive |

---

## 6. List Animations

### Stagger children (enter)

```ts
// Container — orchestrates stagger timing
export const listContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,   // 60ms between items
      delayChildren: 0.1,      // 100ms before first child
    },
  },
}

// Item — each child fades + slides up
export const listItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
}
```

### Exit transitions (AnimatePresence)

```ts
// For list item removal (e.g., deleting a deal)
export const listItemExit: Variants = {
  visible: { opacity: 1, height: 'auto' },
  exit: {
    opacity: 0,
    height: 0,
    marginBottom: 0,
    transition: {
      opacity: { duration: 0.15 },
      height: { duration: 0.2, delay: 0.05 },
    },
  },
}
```

### Stagger caps
- Dashboard KPI cards: 4 items, 80ms stagger = 320ms total. Fine.
- Deal list: cap stagger at 8 items max. Beyond that, animate all remaining simultaneously.
- Pipeline columns: stagger columns (4-5), not individual cards within columns.

```ts
export function cappedStagger(itemCount: number, maxStagger = 8): Variants {
  const effectiveCount = Math.min(itemCount, maxStagger)
  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.06,
        delayChildren: 0.05,
        // Items beyond maxStagger get no additional delay
      },
    },
  }
}
```

---

## 7. Drag-and-Drop Animations (dnd-kit + Framer Motion)

### Coexistence strategy
dnd-kit and Framer Motion both manipulate `transform`. They must not fight.

**Rule**: When a card is being dragged, dnd-kit owns the transform.
When a card is at rest, Framer Motion can animate entry/hover.

```ts
// In DealCard component — current approach is correct:
// useSortable provides transform + transition via CSS utility.
// Framer Motion handles entry animation only.

import { CSS } from '@dnd-kit/utilities'
import { useSortable } from '@dnd-kit/sortable'

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

### Drag overlay (the "ghost" card)

```ts
// DragOverlay should use Framer Motion for pickup/drop animation
// dnd-kit's dropAnimation config:
const dropAnimation = {
  duration: 200,
  easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
}

// Pickup scale effect (applied to DragOverlay content):
// style={{ transform: 'scale(1.03)', boxShadow: '0 12px 32px rgba(0,0,0,0.2)' }}
```

### Column drop indicator

```ts
// Animate a thin indigo line where the card will land.
// Use layoutId for smooth position tracking.
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

## 8. Data Update Animations

### KPI number counting

Parcel already has `useCountUp` (RAF-based). Recommended timing:

```ts
// Duration scales with magnitude of change
function getCountDuration(delta: number): number {
  if (delta < 100) return 400       // small change: fast
  if (delta < 10000) return 800     // medium change: moderate
  return 1200                       // large change: full sweep
}

// Easing: ease-out (fast start, slow finish) — matches reading cadence
// Current implementation is likely fine. Key: never exceed 1.2s.
```

### Chart transitions (Recharts)

Recharts has built-in `isAnimationActive` and `animationDuration` props.

```tsx
<AreaChart>
  <Area
    isAnimationActive={!prefersReducedMotion}
    animationDuration={800}
    animationEasing="ease-out"
    animationBegin={200}  // slight delay for page settle
  />
</AreaChart>
```

For chart data updates (e.g., switching strategy tabs on ResultsPage):

```tsx
// Use key prop to force remount with fresh animation
<AreaChart key={`chart-${selectedStrategy}`}>
  ...
</AreaChart>
```

### Badge/status updates

```ts
// When a deal status changes, flash the badge
export const statusFlash: Variants = {
  idle: { scale: 1 },
  updated: {
    scale: [1, 1.15, 1],
    transition: { duration: 0.3 },
  },
}
```

---

## 9. Toast/Notification Animations

### Sonner (already installed)

Sonner handles its own enter/exit animations. Default config is close to Mercury style.
Recommended overrides for Parcel:

```tsx
<Toaster
  position="bottom-right"
  toastOptions={{
    style: {
      background: '#0F0F1A',       // surface color
      border: '1px solid rgba(255,255,255,0.06)',
      color: '#fff',
    },
    duration: 4000,
  }}
/>
```

### If building custom toasts

```ts
export const toastEnter: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 30,
    },
  },
  exit: {
    opacity: 0,
    x: 80,
    transition: { duration: 0.2, ease: [0.4, 0, 1, 1] },
  },
}
```

Exit direction: slide right (x: 80) for dismiss, fade for auto-dismiss.
Progress bar: CSS `animation: shrink 4s linear forwards` on a thin indigo bar.

---

## 10. Modal Animations

### Backdrop + content spring

```ts
export const modalBackdrop: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.2 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15 },
  },
}

export const modalContent: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.96,
    y: 8,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 30,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 8,
    transition: { duration: 0.15 },
  },
}
```

### Key principles
- Backdrop fades faster than content appears (backdrop: 200ms, content: spring ~250ms)
- Content scales from 0.96 (not 0.8 — that feels like a popup ad)
- Exit is always faster than enter (150ms vs 250ms) — Mercury pattern
- `AnimatePresence` must wrap the conditional render, not be inside the modal

### Command palette (already in Parcel)
Same pattern applies. The overlay + content should animate independently.

---

## 11. Performance and Accessibility

### prefers-reduced-motion

```ts
import { useReducedMotion } from 'framer-motion'

function AnimatedComponent() {
  const shouldReduce = useReducedMotion()

  return (
    <motion.div
      variants={shouldReduce ? undefined : slideUp}
      initial={shouldReduce ? false : 'hidden'}
      animate="visible"
    />
  )
}
```

### Current gaps in Parcel
- `index.css` disables CSS animations for reduced-motion but does not affect Framer Motion
- Landing page blobs and ticker respect reduced-motion; app pages do not
- `useShake` should check `useReducedMotion()` and skip the shake

### Recommended: global motion wrapper

```ts
// Add to motion.ts
import { useReducedMotion } from 'framer-motion'

export function useMotionSafe() {
  const reduce = useReducedMotion()
  return {
    // Returns empty object if user prefers reduced motion
    safeVariants: (v: Variants) => (reduce ? undefined : v),
    safeInitial: (key: string) => (reduce ? false : key),
    isReduced: reduce ?? false,
  }
}
```

### GPU-accelerated properties only
Only animate these properties for 60fps:
- `opacity`
- `transform` (which Framer Motion uses for `x`, `y`, `scale`, `rotate`)

Never animate via Framer Motion:
- `width`, `height` (use `scaleX`/`scaleY` or CSS `height` with `auto`)
- `background-color` (CSS transitions are fine for this)
- `box-shadow` (use a pseudo-element with opacity transition instead)

Exception: `height: 'auto'` with Framer Motion layout animations is acceptable
for accordion/expandable sections — Framer Motion handles the FLIP internally.

### Layout animation performance

```ts
// Use layout="position" instead of layout={true} when only position changes.
// layout={true} animates both position AND size, which is more expensive.
<motion.div layout="position">...</motion.div>
```

### Low-power device detection

```ts
// Check for low-end devices via navigator API
const isLowEnd =
  navigator.hardwareConcurrency <= 4 ||
  (navigator as { deviceMemory?: number }).deviceMemory <= 4

// Reduce stagger counts and disable spring physics on low-end
const transition = isLowEnd
  ? { duration: 0.15, ease: 'easeOut' }
  : { type: 'spring', stiffness: 400, damping: 30 }
```

---

## 12. Mercury/Linear Style Guide

### Philosophy
Mercury and Linear share a motion language: fast, subtle, purposeful.
Every animation serves a cognitive function — it orients the user or confirms an action.

### Timing rules

| Category | Duration | Easing |
|----------|----------|--------|
| Micro (hover, tap) | 100-150ms | `[0.25, 0.1, 0.25, 1]` (snappy) |
| Small (tooltip, dropdown) | 150-200ms | `[0.25, 0.1, 0.25, 1]` |
| Medium (modal, panel) | 200-300ms | Spring: stiffness 400, damping 30 |
| Large (page transition) | 200-250ms | `[0.4, 0, 0.2, 1]` (smooth) |
| Data (counter, chart) | 400-800ms | ease-out |

### Distance rules
- Fade-in slides: 4-8px max (never 20px+ — that is mobile app territory)
- Scale changes: 0.96-1.04 range (never below 0.9 or above 1.1)
- Hover lifts: 2-4px (Parcel currently uses 2px, which is correct)

### What Mercury/Linear never do
- Bounce/overshoot on UI elements (springs are critically damped, never underdamped)
- Delayed animations (no 500ms+ delays waiting for "dramatic effect")
- Parallax scrolling in the app (acceptable on landing page only)
- Animation on scroll within the app (only on landing page marketing sections)
- Rotation on UI elements (rotate is for loading spinners only)

### Spring config translation

```ts
// Mercury-style spring: critically damped, fast settle
export const SPRING_MERCURY = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 30,    // damping ratio ~0.87 — just below critical
  mass: 1,
}

// For comparison:
// Critical damping = 2 * sqrt(stiffness * mass) = 2 * sqrt(400) = 40
// Mercury uses 30 (slightly underdamped) for a tiny bit of life
// Linear uses ~35 (closer to critical) for even more restraint

// Parcel recommendation: damping 28-32 range
export const SPRING_PARCEL = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 30,
}
```

### Easing curves

```ts
// The two curves you need (Parcel already has both)
const EASE_OUT = [0.25, 0.1, 0.25, 1]   // enters, reveals
const EASE_IN_OUT = [0.4, 0, 0.2, 1]    // symmetric transitions

// You do NOT need ease-in for exits. Use a shorter duration instead.
// Mercury pattern: exit at 75% of enter duration with ease-out.
```

---

## RECOMMENDATIONS FOR PARCEL

### Keep (already correct)
1. **Page transition** — opacity crossfade at 200ms is the right call. No slide.
2. **`hoverLift`** — `y: -2` with `scale: 0.98` tap is Mercury-correct.
3. **`staggerContainer` / `staggerItem`** — 80ms default stagger, 6px slide distance.
4. **`useShake`** — effective form validation feedback.
5. **Skeleton screens** — correct loading pattern for a data SaaS.
6. **Spring configs** — `SPRING.stiff` (damping 30, stiffness 400) matches Mercury exactly.

### Add
1. **`useMotionSafe` hook** — wrap all Framer Motion usage to respect `prefers-reduced-motion`. Current app pages do not honor the system preference.
2. **`cardHover` with shadow** — upgrade `hoverLift` to include `boxShadow` transition for deal cards and KPI cards. Shadow lift gives stronger affordance than `y` alone.
3. **Modal spring animation** — `scale: 0.96 -> 1` with `SPRING_PARCEL` for close-deal-modal and offer-letter-modal. Currently these likely use default CSS transitions from shadcn.
4. **List exit animation** — `AnimatePresence` with `height: 0` collapse for deal deletion in MyDeals. Currently items likely just disappear on re-fetch.
5. **Chart `animationBegin: 200`** — delay Recharts animation by 200ms so the page layout settles first.
6. **Capped stagger** — stop adding stagger delay after 8 items in deal lists to avoid slow initial renders.

### Change
1. **Button hover** — switch from no hover animation to `scale: 1.02` on primary buttons only. Ghost buttons get background opacity change instead.
2. **`useShake` reduced-motion check** — add `useReducedMotion()` guard. If reduced, show a red border flash instead of shake.
3. **Exit timing** — standardize all exit durations to 75% of enter duration (e.g., enter 200ms -> exit 150ms). Some exits currently match enter duration.

### Avoid
1. **Slide page transitions** — variable page heights cause visible reflow during lazy loading.
2. **Hover animations on pipeline cards** — dnd-kit transform conflicts cause jitter.
3. **Scroll-triggered animations inside the app** — only use on Landing.tsx.
4. **`layout={true}` on large lists** — use `layout="position"` or skip layout animation entirely for lists with 20+ items.
5. **Spring on toasts** — Sonner's tween default is faster and more appropriate for ephemeral notifications.
6. **`will-change` on more than 5 elements** — browser optimization budget is finite.

### Priority order for implementation
1. `useMotionSafe` hook (accessibility compliance)
2. Modal spring animations (close-deal, offer-letter)
3. Card shadow hover upgrade
4. Button micro-interactions
5. List exit animations
6. Chart animation timing
