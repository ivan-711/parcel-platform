# Animation System Specification

Design spec for Parcel Platform's motion language. Stack: Framer Motion + dnd-kit + CSS transitions. Philosophy: Mercury-style radical restraint. "If you notice the animation, it's too much."

Every animation in the app exists to confirm a state change the user caused. Nothing moves for decoration. Stillness is the default.

---

## 1. Timing Tokens

Five duration steps. Every animation in the codebase must use one of these values. No ad-hoc durations.

```ts
// lib/motion.ts
export const duration = {
  instant:  0.08,  // 80ms  — hover, focus, press feedback
  fast:     0.15,  // 150ms — tooltips, dropdowns, border shifts
  normal:   0.20,  // 200ms — page enter, card entrance, menus
  slow:     0.30,  // 300ms — backdrop fade, complex state changes
  dramatic: 0.50,  // 500ms — chart entrance, landing-page only
} as const;
```

Usage rule: nothing in the authenticated app exceeds `duration.dramatic` (500ms). The landing page may use `duration.dramatic` for scroll-triggered sections. If a proposed animation exceeds 500ms, it must be justified in a code comment or it gets cut.

---

## 2. Easing Curves

Two named bezier curves and two spring presets. These are the only easing values allowed.

```ts
// lib/motion.ts
export const ease = {
  /** Default for all tween animations. Subtle deceleration, no bounce. */
  luxury: [0.25, 0.1, 0.25, 1.0] as const,

  /** Aggressive deceleration for entrances that need snap. Vercel-style. */
  vercel: [0.22, 1, 0.36, 1] as const,
} as const;

export const spring = {
  /** Modals, drag-and-drop settle, any "land in place" moment. */
  snappy: { type: "spring" as const, stiffness: 500, damping: 30, mass: 0.8 },

  /** Tooltips, popovers, lighter UI elements. */
  gentle: { type: "spring" as const, stiffness: 400, damping: 28, mass: 0.5 },
} as const;
```

CSS equivalents for use in Tailwind `transition-timing-function`:

```css
/* In index.css or tailwind theme extension */
:root {
  --ease-luxury: cubic-bezier(0.25, 0.1, 0.25, 1.0);
  --ease-vercel: cubic-bezier(0.22, 1, 0.36, 1);
}
```

---

## 3. Transition Presets

Three pre-built transition objects that cover 95% of use cases. Components import these instead of writing inline configs.

```ts
// lib/motion.ts
export const transition = {
  /** Hover, focus, tooltips, any fast state feedback */
  fast: { duration: duration.fast, ease: ease.luxury },

  /** Page fades, card entrances, dropdown open */
  default: { duration: duration.normal, ease: ease.luxury },

  /** Modals, drag-and-drop — the only spring transitions in the app */
  spring: spring.snappy,
} as const;
```

---

## 4. Page Transitions

Opacity + subtle Y-shift. Enter is slower than exit (asymmetric timing feels natural).

```ts
// lib/motion.ts
export const pageVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -4 },
} as const;

export const pageTransition = {
  enter: { duration: duration.normal, ease: ease.luxury },        // 200ms in
  exit:  { duration: 0.12, ease: [0.4, 0, 1, 1] as const },      // 120ms out, ease-in
} as const;
```

Implementation at the router level:

```tsx
// App.tsx or layout wrapper
import { AnimatePresence, motion } from "framer-motion";
import { pageVariants, pageTransition } from "@/lib/motion";

<AnimatePresence mode="wait">
  <motion.div
    key={pathname}
    variants={pageVariants}
    initial="initial"
    animate="animate"
    exit="exit"
    transition={pageTransition.enter}
  >
    <Outlet />
  </motion.div>
</AnimatePresence>
```

Rules:
- `mode="wait"` always. Overlapping fades look broken.
- Y-shift is 6px max. Anything above 12px feels like a mobile slide transition.
- Never slide pages horizontally. Horizontal slides signal mobile or wizard flows.
- Exit transition uses ease-in (accelerating out) while enter uses ease-out (decelerating in).

---

## 5. Card Entrance

Staggered opacity + Y-shift. Spring physics with high stiffness and heavy damping so there is zero visible bounce.

```ts
// lib/motion.ts
export const cardContainerVariants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,    // 50ms between each card
      delayChildren: 0.04,      // 40ms initial delay after page settles
    },
  },
} as const;

export const cardVariants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 30,
      mass: 0.8,
    },
  },
} as const;
```

Implementation:

```tsx
<motion.div
  variants={cardContainerVariants}
  initial="initial"
  animate="animate"
  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
>
  {deals.map((deal) => (
    <motion.div key={deal.id} variants={cardVariants}>
      <DealCard deal={deal} />
    </motion.div>
  ))}
</motion.div>
```

Rules:
- Cap total stagger at 300ms. With 50ms per card, that means 6 cards before the stagger saturates. If more than 6 cards are visible, the remaining ones enter with the 6th.
- If the list exceeds 20 items, disable per-card stagger and use a single container fade (`pageVariants` on the grid wrapper).
- The spring config here (stiffness 500, damping 30, mass 0.8) resolves in ~180ms with zero oscillation. It feels snappy, not bouncy.

---

## 6. Hover Effects

CSS only. Zero React re-renders. Zero Framer Motion involvement. Hover is the highest-frequency interaction in the app and must be zero-cost.

```css
/* Applied to all interactive cards */
.card-hover {
  border: 1px solid rgba(240, 237, 232, 0.06);
  transition:
    border-color 150ms var(--ease-luxury),
    background-color 150ms var(--ease-luxury),
    filter 150ms var(--ease-luxury);
}

.card-hover:hover {
  border-color: rgba(240, 237, 232, 0.12);
  background-color: rgba(240, 237, 232, 0.02);
}
```

Tailwind equivalent (for inline use):

```
border border-cream/6
transition-[border-color,background-color] duration-150
hover:border-cream/12 hover:bg-cream/2
```

Rules:
- No `scale` on hover. Scale on hover is the single most "consumer app" tell.
- No `translateY` lift on hover. This is an e-commerce pattern.
- No `whileHover` from Framer Motion on cards. CSS handles this.
- Brightness shifts are acceptable for icon buttons: `filter: brightness(1.15)` on hover, 150ms transition.

---

## 7. Press Feedback

Scale down + brightness shift. Fast enough to feel instantaneous.

```css
/* Applied to all buttons and clickable elements */
.press-feedback {
  transition:
    transform 80ms var(--ease-luxury),
    filter 80ms var(--ease-luxury);
}

.press-feedback:active {
  transform: scale(0.98);
  filter: brightness(0.92);
}
```

Tailwind equivalent:

```
transition-[transform,filter] duration-[80ms]
active:scale-[0.98] active:brightness-[0.92]
```

Rules:
- Scale is 0.98, never lower than 0.96. Exaggerated press feels like a toy.
- Duration is 80ms (instant token). Press feedback that lags behind the finger feels broken.
- Brightness goes down (0.92) on dark backgrounds — the button appears to "sink."
- Do not use Framer Motion `whileTap` for standard buttons. CSS `:active` is sufficient and cheaper. Reserve `whileTap` for drag handles where React state is already involved.

---

## 8. Modal Entrance

Spring entrance, fast ease-out exit. Backdrop fades independently at a slower pace.

```ts
// lib/motion.ts
export const backdropVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: duration.slow } },  // 300ms
  exit:    { opacity: 0, transition: { duration: duration.fast } },   // 150ms
} as const;

export const modalVariants = {
  initial: { opacity: 0, scale: 0.97, y: 8 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 25,
      mass: 0.8,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: 4,
    transition: { duration: 0.10, ease: [0.4, 0, 1, 1] },
  },
} as const;
```

Implementation:

```tsx
<AnimatePresence>
  {isOpen && (
    <>
      <motion.div
        className="fixed inset-0 bg-black/60 backdrop-blur-[2px]"
        variants={backdropVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        onClick={onClose}
      />
      <motion.div
        className="fixed inset-0 flex items-center justify-center p-4"
        variants={modalVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        <DialogContent />
      </motion.div>
    </>
  )}
</AnimatePresence>
```

Rules:
- Damping 25 on modal entrance (slightly less than the standard 30) gives a micro-settle that makes the modal feel like it "landed." There is no visible bounce — just a subtle deceleration curve.
- Exit is always a tween, never a spring. Springs on exit feel like the modal is being yanked away.
- Backdrop blur is 2px max. Heavy blur (8px+) is expensive and looks like frosted glass — wrong for a financial tool.
- Backdrop color: `rgba(0, 0, 0, 0.60)`. Dark enough to focus attention, not so dark it feels oppressive.

---

## 9. Loading States

### Skeleton Shimmer

Background-position animation on a gradient. Pure CSS, no JS.

```css
@keyframes skeleton-shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    rgba(240, 237, 232, 0.04) 0%,
    rgba(240, 237, 232, 0.08) 40%,
    rgba(240, 237, 232, 0.04) 100%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.8s ease-in-out infinite;
  border-radius: 6px;
}
```

Stagger skeleton lines by offsetting `animation-delay`:

```tsx
{[0, 1, 2, 3].map((i) => (
  <div
    key={i}
    className="skeleton h-3 rounded-md"
    style={{
      animationDelay: `${i * 80}ms`,
      width: i === 3 ? "60%" : "100%",
    }}
  />
))}
```

### Spinner

For inline loading states (buttons, small areas). Rotate animation, not pulse.

```css
@keyframes spin-smooth {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(240, 237, 232, 0.12);
  border-top-color: rgba(240, 237, 232, 0.6);
  border-radius: 50%;
  animation: spin-smooth 600ms linear infinite;
}
```

Rules:
- Prefer skeleton shimmer over spinners. Skeletons communicate structure; spinners communicate waiting.
- Skeleton shapes must match the content they replace. Mismatched skeletons cause layout shift.
- Show skeletons for a maximum of 3 seconds. If data takes longer, transition to a centered spinner with a text label.
- Spinner duration is 600ms per rotation. Faster feels frantic; slower feels stuck.

---

## 10. Chart Animations

### Entrance

Charts fade in as a container. Internal data animation is handled by Recharts, not Framer Motion.

```ts
// lib/motion.ts
export const chartVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      duration: duration.dramatic,   // 500ms
      ease: "easeOut",
    },
  },
} as const;
```

Recharts configuration for internal animation:

```tsx
<Area
  isAnimationActive={true}
  animationDuration={500}
  animationEasing="ease-out"
/>
```

### Tooltip Follow

Chart tooltips track the cursor with a spring for smooth interpolation.

```ts
export const chartTooltipTransition = {
  type: "spring" as const,
  stiffness: 300,
  damping: 28,
  mass: 0.3,
} as const;
```

In practice with Recharts, tooltip positioning is handled internally. The spring config above applies if building a custom tooltip overlay with Framer Motion:

```tsx
<motion.div
  className="pointer-events-none absolute"
  animate={{ x: tooltipX, y: tooltipY }}
  transition={chartTooltipTransition}
>
  <ChartTooltipContent />
</motion.div>
```

### Hover Highlight (Dim the Rest)

When hovering a data series, non-hovered series reduce to 30% opacity:

```tsx
<Area
  opacity={hoveredSeries && hoveredSeries !== seriesKey ? 0.3 : 1}
  style={{ transition: "opacity 150ms ease-out" }}
/>
```

Rules:
- Never wrap individual chart bars, lines, or dots in Framer Motion. This is a performance disaster with Recharts.
- Let Recharts handle data-level animation internally. Framer Motion only wraps the outer chart container.
- Chart entrance at 500ms is the slowest animation in the authenticated app. It is justified because charts are visual anchors and the entrance draws the eye to the data.

---

## 11. Scroll Animations (Landing Page Only)

Fade-in-up triggered by intersection observer. Used exclusively on the landing page. Never used in the authenticated app.

```ts
// lib/motion.ts
export const fadeInUpVariants = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: duration.normal,   // 200ms
      ease: ease.luxury,
    },
  },
} as const;

export const staggerContainerVariants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,    // 50ms between siblings
    },
  },
} as const;
```

Implementation:

```tsx
<motion.section
  initial="initial"
  whileInView="animate"
  viewport={{ once: true, amount: 0.3 }}
  variants={staggerContainerVariants}
>
  <motion.h2 variants={fadeInUpVariants}>...</motion.h2>
  <motion.p variants={fadeInUpVariants}>...</motion.p>
</motion.section>
```

Rules:
- `viewport={{ once: true }}` always. Elements animate in once and stay. Reversing on scroll-out is distracting.
- `amount: 0.3` — element must be 30% visible before triggering. Prevents animations firing before the user can see them.
- Hero section does NOT use scroll animation. It renders immediately with a single page-level fade (200ms).
- Y-shift is 12px max for landing sections. Anything larger feels like content jumping.
- No parallax on text. Parallax is reserved for decorative background elements with a multiplier under 0.1.

---

## 12. Drag-and-Drop (Pipeline Kanban)

The most physical interaction in the app. Uses dnd-kit with custom motion overlays.

### Pick-Up

```ts
export const dragPickUp = {
  scale: 1.02,
  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35), 0 2px 8px rgba(0, 0, 0, 0.2)",
  transition: { duration: duration.fast },  // 150ms
} as const;
```

### Move (Other Items Shifting)

dnd-kit handles shifting via CSS transitions internally. Override the transition config:

```ts
// dnd-kit sortable transition
export const dndShiftTransition = {
  duration: 200,
  easing: "cubic-bezier(0.25, 0.1, 0.25, 1)",
} as const;
```

Spring config for custom move animations if using `DragOverlay`:

```ts
export const dndMoveSpring = {
  type: "spring" as const,
  stiffness: 400,
  damping: 25,
  mass: 0.8,
} as const;
```

### Drop (Settle)

```ts
export const dndDropSpring = {
  type: "spring" as const,
  stiffness: 500,
  damping: 30,
  mass: 0.8,
} as const;

export const dndDropSettle = {
  scale: 1,
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
  transition: { duration: duration.normal, ease: ease.luxury },
} as const;
```

### Drop Confirmation

Brief border flash on the dropped card to confirm placement:

```css
@keyframes drop-confirm {
  0%   { border-color: rgba(139, 122, 255, 0.5); }
  100% { border-color: rgba(240, 237, 232, 0.06); }
}

.drop-confirmed {
  animation: drop-confirm 300ms ease-out forwards;
}
```

### dnd-kit Layout Animation Control

```ts
import { defaultAnimateLayoutChanges } from "@dnd-kit/sortable";

export const animateLayoutChanges: typeof defaultAnimateLayoutChanges = (args) => {
  const { isSorting, wasDragging } = args;
  if (isSorting || wasDragging) return false;  // No layout animation during active drag
  return defaultAnimateLayoutChanges(args);     // Animate after drop settles
};
```

Rules:
- Pick-up scale is 1.02. Subtle lift. No rotation — skip the "tilted card" pattern.
- Shadow on pick-up uses two layers: a large diffuse shadow + a tight small shadow. This creates realistic depth.
- Drop spring (stiffness 500, damping 30) settles in ~180ms with zero bounce.
- The confirmation border flash uses the violet accent at 50% opacity, fading to the default 6% border.

---

## 13. Reduced Motion

Global configuration. One line at the app root disables all Framer Motion animations for users who request reduced motion at the OS level.

```tsx
// main.tsx or App.tsx
import { MotionConfig } from "framer-motion";

function App() {
  return (
    <MotionConfig reducedMotion="user">
      <RouterProvider router={router} />
    </MotionConfig>
  );
}
```

What `reducedMotion="user"` does:
- All Framer Motion `animate`, `whileInView`, `whileHover`, `whileTap` calls resolve instantly (duration 0).
- Springs snap to their target value with no oscillation.
- `AnimatePresence` exit animations are skipped.

CSS fallbacks for non-Framer animations:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

What this means per interaction:
- Page transitions: instant cut, no fade.
- Card entrances: all cards visible immediately, no stagger.
- Hover effects: CSS border/background transitions remain (subtle enough to be safe) but duration drops to near-zero.
- Modals: instant appear/disappear, no scale or spring.
- Skeletons: static skeleton color, no shimmer animation.
- Charts: data appears immediately, no entrance fade.
- Drag-and-drop: dnd-kit handles reduced motion internally. Custom overlays snap to position.
- Landing scroll animations: all content visible on page load, no `whileInView`.

---

## 14. Performance Rules

### Transform and Opacity Only

Every Framer Motion animation and CSS animation in the codebase must animate only `transform` and `opacity`. These are the two properties that the browser can composite on the GPU without triggering layout or paint.

Never animate: `width`, `height`, `top`, `left`, `margin`, `padding`, `border-width`, `background-color` (on large elements), `box-shadow` (animate opacity of a shadow-bearing pseudo-element instead).

Exception: `border-color` and `background-color` transitions on small card elements (hover states) are acceptable because the paint cost is negligible at that scale.

### List Performance Threshold

```ts
// lib/motion.ts
export const STAGGER_ITEM_LIMIT = 20;

// Usage in components:
const shouldStagger = items.length <= STAGGER_ITEM_LIMIT;

return shouldStagger ? (
  <motion.div variants={cardContainerVariants} initial="initial" animate="animate">
    {items.map((item) => (
      <motion.div key={item.id} variants={cardVariants}>
        <Card item={item} />
      </motion.div>
    ))}
  </motion.div>
) : (
  <motion.div variants={pageVariants} initial="initial" animate="animate" transition={transition.default}>
    {items.map((item) => (
      <Card key={item.id} item={item} />
    ))}
  </motion.div>
);
```

### CSS for Hover, Framer for State Changes

| Interaction | Engine | Reason |
|---|---|---|
| Hover background/border | CSS `transition` | Zero React re-renders |
| Press scale | CSS `:active` | Zero React re-renders |
| Page entrance/exit | Framer Motion | Requires `AnimatePresence` |
| Modal open/close | Framer Motion | Requires spring physics + exit |
| Card stagger entrance | Framer Motion | Requires orchestrated stagger |
| Drag-and-drop | dnd-kit + Framer | React state already involved |
| Chart tooltip follow | Framer Motion | Smooth spring interpolation |
| Skeleton shimmer | CSS `@keyframes` | No JS needed, infinite loop |
| Spinner | CSS `@keyframes` | No JS needed, infinite loop |

### GPU Hints

Apply `will-change` before animation starts, remove after:

```css
.will-animate {
  will-change: transform, opacity;
}
```

Do not apply `will-change` permanently to many elements. Each `will-change` element gets its own compositor layer, consuming GPU memory. Apply it on the container that is about to animate, not on every card in a grid.

### Bundle Discipline

Framer Motion (~32KB gzipped) is the only animation library. Do not add GSAP, Anime.js, react-spring, or any other motion library. Framer Motion covers every case.

---

## 15. Framer Motion Variant Exports

All variant objects exported from a single file. Components import what they need.

```ts
// lib/motion.ts — complete export block

import type { Variants, Transition } from "framer-motion";

// ─── Duration tokens ────────────────────────────────────
export const duration = {
  instant:  0.08,
  fast:     0.15,
  normal:   0.20,
  slow:     0.30,
  dramatic: 0.50,
} as const;

// ─── Easing curves ──────────────────────────────────────
export const ease = {
  luxury: [0.25, 0.1, 0.25, 1.0] as [number, number, number, number],
  vercel: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

// ─── Spring presets ─────────────────────────────────────
export const spring = {
  snappy: { type: "spring" as const, stiffness: 500, damping: 30, mass: 0.8 },
  gentle: { type: "spring" as const, stiffness: 400, damping: 28, mass: 0.5 },
};

// ─── Transition presets ─────────────────────────────────
export const transition = {
  fast:    { duration: duration.fast, ease: ease.luxury } satisfies Transition,
  default: { duration: duration.normal, ease: ease.luxury } satisfies Transition,
  spring:  spring.snappy satisfies Transition,
};

// ─── Page ───────────────────────────────────────────────
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -4 },
};

export const pageTransition = {
  enter: { duration: duration.normal, ease: ease.luxury },
  exit:  { duration: 0.12, ease: [0.4, 0, 1, 1] },
};

// ─── Card stagger ───────────────────────────────────────
export const cardContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.04,
    },
  },
};

export const cardVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: spring.snappy,
  },
};

// ─── Modal ──────────────────────────────────────────────
export const backdropVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: duration.slow } },
  exit:    { opacity: 0, transition: { duration: duration.fast } },
};

export const modalVariants: Variants = {
  initial: { opacity: 0, scale: 0.97, y: 8 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 500, damping: 25, mass: 0.8 },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: 4,
    transition: { duration: 0.10, ease: [0.4, 0, 1, 1] },
  },
};

// ─── List (generic stagger) ────────────────────────────
export const listContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.03,
    },
  },
};

export const listItemVariants: Variants = {
  initial: { opacity: 0, y: 4 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.fast, ease: ease.luxury },
  },
};

// ─── Tooltip ────────────────────────────────────────────
export const tooltipVariants: Variants = {
  initial: { opacity: 0, y: 4, scale: 0.96 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: spring.gentle,
  },
  exit: {
    opacity: 0,
    y: 2,
    scale: 0.98,
    transition: { duration: 0.10, ease: "easeIn" },
  },
};

// ─── Fade-in-up (landing scroll) ────────────────────────
export const fadeInUpVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.normal, ease: ease.luxury },
  },
};

export const staggerSectionVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

// ─── Chart container ────────────────────────────────────
export const chartVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: duration.dramatic, ease: "easeOut" },
  },
};

// ─── Performance constant ───────────────────────────────
export const STAGGER_ITEM_LIMIT = 20;
```

---

## CSS Transition Strings Reference

For use in Tailwind `className` or inline `style` attributes:

```ts
// lib/motion.ts — CSS string equivalents
export const cssTransition = {
  /** Cards: border + background on hover */
  cardHover: "border-color 150ms cubic-bezier(0.25,0.1,0.25,1), background-color 150ms cubic-bezier(0.25,0.1,0.25,1)",

  /** Buttons: press feedback */
  press: "transform 80ms cubic-bezier(0.25,0.1,0.25,1), filter 80ms cubic-bezier(0.25,0.1,0.25,1)",

  /** Icons, text brightness on hover */
  fast: "filter 150ms cubic-bezier(0.25,0.1,0.25,1)",

  /** Chart series dim */
  chartDim: "opacity 150ms ease-out",
} as const;
```

---

## CRITICAL DECISIONS

1. **No scale on hover. Anywhere.** Scale transforms on hover are the fastest way to make a financial tool look like a consumer e-commerce site. Parcel uses border-color and background-color shifts only. This is non-negotiable.

2. **CSS for hover and press, Framer for everything else.** Hover and press are high-frequency interactions. CSS transitions are GPU-composited with zero React re-renders. Every `whileHover` in the codebase must be replaced with a CSS `transition` + `:hover` rule. Framer Motion is reserved for entrance/exit orchestration and spring physics.

3. **Springs must be critically damped or over-damped.** No visible bounce anywhere in the authenticated app. The spring presets (damping 25-30 with stiffness 400-500) resolve without oscillation. A bouncing card or modal instantly signals "consumer app" in a financial context.

4. **400ms ceiling in the authenticated app.** The only animation allowed above 400ms is the chart entrance at 500ms. Everything else (page transitions, card stagger, modals, hover, press) resolves in under 300ms. Speed is trust in financial software.

5. **Single motion file.** All variants, transitions, durations, and easing curves are exported from `lib/motion.ts`. No component defines its own timing or easing. This prevents the drift where every developer picks slightly different values and the motion language becomes inconsistent.

6. **`MotionConfig reducedMotion="user"` at the app root.** This is a one-line accessibility compliance measure. It automatically disables all Framer Motion animations when the OS preference is set. Combined with the CSS `prefers-reduced-motion` media query for non-Framer animations, this covers WCAG 2.1 SC 2.3.3.

7. **20-item stagger cutoff.** Lists with more than 20 items get a single container fade instead of per-item stagger. This prevents jank on lower-end devices and avoids the "waterfall of cards" effect that makes large lists feel slow.

8. **Asymmetric enter/exit timing.** Enter animations are slower than exit animations (200ms enter / 120ms exit for pages, spring enter / 100ms tween exit for modals). This mimics physical behavior: things spring open but fall shut. The asymmetry is felt subconsciously as "natural."

9. **No animation on the landing hero.** The hero section renders immediately with the standard page fade. No scroll-triggered entrance, no staggered text reveal, no typewriter effect. The hero must be readable the instant the page loads.

10. **Drag-and-drop is the one place physicality is allowed.** Scale 1.02 on pick-up, shadow bloom, spring settle on drop. This is the only context where scale transforms and shadow animations are permitted because the user is performing a physical gesture and expects physical feedback.
