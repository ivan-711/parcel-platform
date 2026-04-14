# Animation & Motion Design for Luxury Dark Interfaces

## Research Context

This document analyzes animation patterns used by Mercury, Linear, Raycast, Vercel, and other premium dark-UI products. The goal: define a motion language for Parcel Platform that feels expensive, intentional, and invisible. Stack context is React 18 + TypeScript + Tailwind CSS + Framer Motion + dnd-kit, with a dark palette (#0C0B0A bg, #F0EDE8 cream text, #8B7AFF violet accent).

---

## 1. Mercury's Animation Philosophy: Radical Restraint

Mercury is the benchmark for "absence as luxury." Their motion philosophy can be summarized in one principle: **most things do not animate at all.**

### What moves in Mercury:
- **Route transitions**: A single ~120ms opacity crossfade. No sliding, no scaling.
- **Dropdown menus**: Appear with a subtle Y-translate (4-6px) + opacity fade, ~150ms.
- **Number formatting in balances**: A brief counter-roll when values update — the only "showy" animation.
- **Focus rings and hover states**: Instant or near-instant (~80ms) color/opacity shifts.

### What does NOT move in Mercury:
- Page layouts do not slide or morph between routes.
- Cards do not stagger on load. They appear immediately, fully formed.
- Sidebars do not collapse with spring animations. They toggle with a clean cut or a 120ms fade.
- Tables and lists do not animate row entrances.
- Charts do not animate data in on load (or if they do, the animation is under 200ms and barely noticeable).

### The takeaway:
Mercury treats stillness as the default. Motion is reserved for state changes that the user caused — confirming an action happened. Nothing moves "for fun." This restraint is what makes the interface feel like a private banking terminal, not a consumer SaaS.

---

## 2. Page Transitions

### Industry patterns:
| Product    | Transition Style            | Duration  |
|------------|-----------------------------|-----------|
| Mercury    | Opacity crossfade           | ~120ms    |
| Linear     | Route-level fade, no slide  | ~150ms    |
| Raycast    | Instant (no visible transition) | 0ms   |
| Vercel     | Opacity fade                | ~100ms    |
| Stripe Dashboard | Subtle fade           | ~120ms    |

### Framer Motion implementation:
```tsx
// Layout wrapper with AnimatePresence
const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const pageTransition = {
  duration: 0.12,
  ease: [0.25, 0.1, 0.25, 1.0], // Subtle ease-out
};

<AnimatePresence mode="wait">
  <motion.div
    key={pathname}
    variants={pageVariants}
    initial="initial"
    animate="animate"
    exit="exit"
    transition={pageTransition}
  />
</AnimatePresence>
```

### Rules:
- Never slide pages horizontally or vertically. Slides feel like mobile apps, not financial tools.
- `mode="wait"` ensures clean exit-before-enter. Overlapping fades look buggy.
- Keep duration at 100-150ms. Anything above 200ms feels sluggish in a data-heavy app.
- Consider skipping exit animation entirely (just fade in) if route changes are frequent — Linear does this.

---

## 3. Card Entrance Animations

### The stagger debate:
Staggered card entrances (each card fading in 30-50ms after the previous) can look premium OR annoying depending on execution. The line is thin.

**Premium stagger** (Linear's approach):
- Total stagger duration under 300ms for the entire grid
- Per-item delay: 30ms
- Each item: opacity 0 -> 1, translateY 6px -> 0
- Duration per item: 200ms
- Easing: ease-out

**Annoying stagger** (to avoid):
- Per-item delay over 60ms
- Total stagger over 500ms (user waits for content)
- Large translateY (>12px) — feels like content is "jumping"
- Spring physics on card entrance — too bouncy, not financial

### Framer Motion config:
```tsx
const containerVariants = {
  animate: {
    transition: {
      staggerChildren: 0.03, // 30ms between each card
    },
  },
};

const cardVariants = {
  initial: { opacity: 0, y: 6 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: [0.25, 0.1, 0.25, 1.0],
    },
  },
};
```

### Alternative — no stagger (Mercury approach):
Simply render all cards at once with a single container fade. This is arguably more premium because it doesn't draw attention to the animation.

```tsx
// One fade for the entire grid, not per-card
const gridVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.15 } },
};
```

---

## 4. Hover Effects

Hover is where luxury interfaces diverge most from consumer products. The rule: **subtle brightness or border changes only. No scale. No bounce.**

### Timing and easing:
| Effect               | Duration | Easing                  | Notes                         |
|----------------------|----------|-------------------------|-------------------------------|
| Background tint      | 120ms    | ease-out                | #FFFFFF at 3-5% opacity overlay |
| Border color shift   | 150ms    | ease-in-out             | From transparent/subtle to visible |
| Text brightness      | 80ms     | linear                  | Cream #F0EDE8 to pure #FFFFFF |
| Accent glow          | 200ms    | ease-out                | Box-shadow with accent color, low spread |

### What NOT to do on hover:
- **scale(1.02)** or any scale transform — this is a consumer e-commerce pattern, not a financial tool.
- **translateY(-2px)** "lift" effect — same problem, feels like a product card on Shopify.
- **Spring physics on hover** — springs are for state changes, not hover.

### CSS implementation (prefer CSS over Framer Motion for hover):
```css
.luxury-card {
  border: 1px solid rgba(240, 237, 232, 0.06);
  transition: border-color 150ms ease-in-out,
              background-color 120ms ease-out;
}

.luxury-card:hover {
  border-color: rgba(240, 237, 232, 0.12);
  background-color: rgba(240, 237, 232, 0.02);
}
```

### Why CSS over Framer Motion for hover:
Framer Motion's `whileHover` creates React re-renders. CSS transitions are GPU-composited and zero-cost. For something as frequent as hover, always use CSS `transition`.

---

## 5. Loading States: Skeleton on Dark

### Pulse vs shimmer:
- **Pulse** (opacity oscillation): Simpler, more Mercury-like. Two-tone: base #161514, pulse to #1C1B19. Duration: 1.5s, ease-in-out, infinite.
- **Shimmer** (gradient sweep): More visually interesting but riskier — can feel cheap if the gradient is too visible. Linear uses a very subtle shimmer.

### Recommendation: Muted pulse
On dark backgrounds, shimmer gradients are harder to tune because the contrast range is narrow. Pulse is safer and more elegant.

```css
@keyframes skeleton-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.7; }
}

.skeleton-block {
  background-color: rgba(240, 237, 232, 0.06);
  border-radius: 6px;
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}
```

### Skeleton shape rules:
- Match the exact layout of the content being loaded. Mismatched skeletons cause layout shift, which feels broken.
- Use rounded rectangles, never circles (unless loading an avatar).
- Skeleton blocks should have 0.06 opacity of the cream text color, not a separate gray — this keeps the palette cohesive.
- Show skeletons for no longer than 3 seconds. If data takes longer, switch to a minimal spinner or progress indicator.

---

## 6. Chart Animations

### Data entrance:
- **Line charts**: Path drawing animation, 400-600ms with ease-out. Framer Motion's `pathLength` or Recharts' `isAnimationActive` with custom duration.
- **Bar charts**: Bars grow from baseline, staggered 20ms each, 300ms per bar, ease-out.
- **Area charts**: Fill opacity fades in after the line draws, 200ms delay, 300ms duration.

### Tooltip follow:
- Tooltip position updates should use `transition: transform 50ms linear` or no transition at all. Lag in tooltip following feels broken.
- Never spring-animate a tooltip. It should snap to position.

### Hover highlight:
- Non-hovered data series: reduce opacity to 0.3 over 150ms.
- Hovered data series: maintain full opacity.
- This "dim the rest" pattern is what Linear and Vercel use. It's more elegant than highlighting the active series.

### Framer Motion for chart entrance:
```tsx
// Wrap chart container, not individual data points
const chartVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};
```

Let the charting library (Recharts) handle internal data animation. Wrapping individual bars/points in Framer Motion is a performance disaster.

---

## 7. Modal & Dialog Animation

### The premium modal entrance:
Mercury and Linear both use a similar pattern: backdrop fades in while the modal scales from ~0.97 to 1.0 with opacity.

```tsx
const backdropVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const modalVariants = {
  initial: { opacity: 0, scale: 0.97, y: 8 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 30,
      mass: 0.8,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    transition: { duration: 0.1, ease: "easeIn" },
  },
};
```

### Spring tuning rationale:
- **stiffness: 500** — Fast response, no sluggishness.
- **damping: 30** — Critical or slightly over-damped. Zero visible bounce. A bouncing modal screams "consumer app."
- **mass: 0.8** — Light feel, quick settle.
- These values produce a ~180ms animation that feels snappy and resolves without oscillation.

### Exit animation:
- Always faster than entrance. 100ms opacity + scale fade-out.
- Never spring the exit. Use a fast ease-in curve.
- The asymmetry (spring in, ease out) mimics physical behavior: things spring open but fall shut.

### Backdrop:
- Color: `rgba(0, 0, 0, 0.6)` — dark enough to establish focus, not so dark it feels oppressive.
- Blur: `backdrop-filter: blur(4px)` — optional luxury touch, but test performance.
- Fade duration: 150ms, ease-out.

---

## 8. Scroll-Triggered Animations (Landing Page)

### Premium vs annoying:
| Premium                              | Annoying                              |
|--------------------------------------|---------------------------------------|
| Fade in + 8-12px translateY          | Slide 40px+ from off-screen           |
| Trigger once, never reverse          | Animate in AND out on scroll          |
| 0.3 threshold (30% visible)          | 0.0 threshold (animates before seen)  |
| 200-300ms per element                | 800ms+ dramatic entrances             |
| Stagger: 50ms between siblings       | Stagger: 150ms+ (user waits)          |
| No rotation, no scale                | rotateX, scale, 3D transforms         |

### Framer Motion `whileInView`:
```tsx
<motion.div
  initial={{ opacity: 0, y: 10 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, amount: 0.3 }}
  transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1.0] }}
>
  {/* Section content */}
</motion.div>
```

### Landing page specific:
- Hero section: No scroll animation. It should be visible immediately. Animate hero elements on page load with a single 200ms fade.
- Stats strip / social proof: Subtle fade-up as user scrolls past the fold.
- Feature sections: Fade in, one section at a time. No per-element stagger within a section unless it's a bento grid.
- Testimonials: Fade in as a group, not individually.
- Pricing cards: Slight stagger (30ms) is acceptable here because the user is comparing options.

### Parallax:
- Avoid parallax on text. Only use parallax on decorative/background elements.
- Keep parallax multiplier under 0.1 (10% of scroll speed). Aggressive parallax causes motion sickness.
- Always respect `prefers-reduced-motion` — parallax must be fully disabled.

---

## 9. Drag-and-Drop Animation (dnd-kit)

Parcel uses dnd-kit for the pipeline Kanban board. The animation here matters because drag-and-drop is the most physical interaction in the app.

### Pick-up:
- Scale to 1.03 (subtle "lift" — this is the ONE place scale is acceptable).
- Add a soft box-shadow to simulate elevation: `0 8px 24px rgba(0, 0, 0, 0.4)`.
- Transition: 150ms ease-out.
- Slight rotation (1-2 degrees toward cursor direction) is optional and polarizing. Mercury would not do it; Linear might. Recommendation: skip it for Parcel.

### Move:
- The dragged item follows the cursor with zero delay (`transform` updated every frame via dnd-kit).
- Other items in the list shift to make room using dnd-kit's `SortableContext` transitions.
- Shift animation: 200ms spring, `stiffness: 400, damping: 25`. This should feel like items are gently pushed aside.

### Drop:
- Spring to final position: `stiffness: 500, damping: 30`. Fast settle, no bounce.
- Scale back to 1.0, shadow fades out: 200ms ease-out.
- Brief highlight on the dropped card (border flash or background pulse) to confirm placement: 300ms fade.

### dnd-kit config:
```tsx
const animateLayoutChanges = (args) => {
  const { isSorting, wasDragging } = args;
  if (isSorting || wasDragging) return false; // Skip layout animation during active drag
  return true; // Animate layout changes after drop
};

// Transition for non-dragged items shifting
const transition = {
  duration: 200,
  easing: "cubic-bezier(0.25, 0.1, 0.25, 1)",
};
```

---

## 10. Performance Budget & GPU Acceleration

### The animation budget:
- **Target**: 60fps on a 2020 MacBook Air (M1 baseline). If animation drops below 60fps on this device, it's cut.
- **Rule**: Only animate `transform` and `opacity`. These are the only CSS properties that can be composited on the GPU without triggering layout or paint.
- **Never animate**: `width`, `height`, `top`, `left`, `margin`, `padding`, `border-width`, `box-shadow` (animate opacity of a shadow layer instead), `background-color` (use pseudo-element opacity), `filter` (expensive on large elements).

### GPU acceleration hints:
```css
.will-animate {
  will-change: transform, opacity;
  /* Apply BEFORE animation starts, remove after */
}

/* Or force GPU layer */
.gpu-layer {
  transform: translateZ(0);
}
```

### Framer Motion performance:
- Use `layout` prop sparingly. Layout animations trigger layout recalculation and can cause jank with many elements.
- Prefer `animate` with explicit `x`, `y`, `scale`, `opacity` over `layout` whenever possible.
- `AnimatePresence` with `mode="wait"` is fine for page transitions but avoid nesting multiple `AnimatePresence` components.
- For lists with many items (>20), disable per-item animation and use a single container fade.

### Bundle size note:
Framer Motion is ~32KB gzipped. This is already in the bundle. Do not add GSAP, Anime.js, or other animation libraries. Framer Motion covers every case needed.

---

## 11. Reduced Motion: Accessibility Compliance

### WCAG 2.1 SC 2.3.3 (AAA) and SC 2.3.1 (A):
- Any animation that is not essential to functionality must be disableable.
- Content that flashes more than 3 times per second must be avoided entirely.

### Implementation:
```tsx
// Hook for reduced motion preference
import { useReducedMotion } from "framer-motion";

function Component() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      animate={{ opacity: 1, y: shouldReduceMotion ? 0 : undefined }}
      transition={shouldReduceMotion ? { duration: 0 } : defaultTransition}
    />
  );
}
```

### Global approach (preferred):
```tsx
// In app root or motion config provider
import { MotionConfig } from "framer-motion";

<MotionConfig reducedMotion="user">
  <App />
</MotionConfig>
```

Setting `reducedMotion="user"` makes Framer Motion automatically respect `prefers-reduced-motion: reduce`. All `animate` calls are applied instantly (duration 0) when the OS preference is set. This is the simplest, most reliable approach.

### What reduced motion should do:
- Page transitions: instant, no fade.
- Card entrances: instant, fully visible.
- Hover effects: CSS transitions can remain (they are subtle enough), but spring animations should be disabled.
- Modals: instant appear/disappear, no scale or spring.
- Drag-and-drop: dnd-kit handles this internally; ensure no custom spring overlays.
- Loading skeletons: Change from animated pulse to static skeleton color (no animation).
- Scroll-triggered: All content visible immediately, no `whileInView`.

---

## 12. The Rule of Luxury Animation

> "If you notice the animation, it's too much."

This principle comes from high-end product design (Braun, Leica, Porsche interior controls). The animation exists to provide **continuity of context** — helping the user understand that a state change occurred — not to entertain or impress.

### Practical application of this rule:

**Test 1: The screenshot test.** Take a screenshot at any point during an animation. If the screenshot looks broken, glitchy, or half-rendered, the animation is too dramatic. Every frame should look like a valid state.

**Test 2: The 2x speed test.** Play the animation at 2x speed. If it still looks fine, the original was probably too slow. Luxury animation should barely register at 1x.

**Test 3: The repeat test.** Trigger the animation 50 times in a row. If it becomes annoying by repetition 10, it's too much. Financial tools are used daily — every animation is seen thousands of times.

**Test 4: The removal test.** Remove the animation entirely. If the interface feels broken without it, the animation was necessary and well-placed. If nobody notices it's gone, the animation was decorative and should stay removed.

### Duration hierarchy for Parcel:
| Interaction          | Target Duration |
|----------------------|-----------------|
| Hover state change   | 80-120ms        |
| Tooltip appear       | 100ms           |
| Page transition      | 120ms           |
| Dropdown open        | 150ms           |
| Modal entrance       | 180ms (spring)  |
| Card stagger (total) | 250ms           |
| Chart data entrance  | 400ms           |
| Scroll-triggered     | 250ms           |

Everything in this table is under 400ms. No animation in the app should exceed 500ms except decorative landing page elements.

---

## RECOMMENDATIONS FOR PARCEL

1. **Adopt `MotionConfig reducedMotion="user"` at the app root.** This is a one-line change that makes every Framer Motion animation automatically respect OS accessibility preferences. Do this first, before any other motion work. It is a compliance requirement.

2. **Standardize on three motion tokens.** Define exactly three transition presets and use them everywhere. No ad-hoc durations or easing curves scattered across components:
   - `TRANSITION_FAST`: `{ duration: 0.12, ease: [0.25, 0.1, 0.25, 1.0] }` — for hover, focus, tooltips
   - `TRANSITION_DEFAULT`: `{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1.0] }` — for page fades, card entrances, dropdowns
   - `TRANSITION_SPRING`: `{ type: "spring", stiffness: 500, damping: 30, mass: 0.8 }` — for modals and drag-and-drop only

3. **Remove all scale transforms from hover states.** If any card or button currently uses `whileHover={{ scale: 1.02 }}` or similar, replace it with a CSS border-color or background-color transition. Scale on hover is the single most "consumer app" tell in dark interfaces.

4. **Use CSS transitions for hover, Framer Motion for state changes.** Hover is high-frequency; CSS is zero-cost. Reserve Framer Motion for entrances, exits, layout shifts, and drag interactions where React state is already involved.

5. **Implement page transitions as a simple opacity crossfade at 120ms.** Use `AnimatePresence mode="wait"` at the router level with the `pageVariants` config from Section 2. No slides, no Y-translate on route change.

6. **For the Kanban pipeline, tune dnd-kit springs to feel weighty.** Use `stiffness: 500, damping: 30` for drop animations. The pipeline is the most tactile part of Parcel — the drag-and-drop should feel precise and settled, not bouncy.

7. **Cap total stagger duration at 250ms for deal card grids.** With 8 cards and 30ms stagger, the last card appears 240ms after the first. This keeps the grid feeling fast. If there are more than 12 cards visible, drop to per-row stagger or use a single container fade.

8. **For chart animations, let Recharts handle internal animation with a 400ms ease-out.** Do not wrap chart internals in Framer Motion. Only wrap the chart container in a fade-in `motion.div` for its entrance.

9. **Use skeleton pulse (not shimmer) on dark backgrounds.** Pulse at `rgba(240, 237, 232, 0.06)` oscillating between 0.4 and 0.7 opacity, 1.5s cycle. Match skeleton block shapes exactly to the content they replace to prevent layout shift.

10. **For the landing page, use `whileInView` with `viewport={{ once: true, amount: 0.3 }}` and keep all scroll-triggered entrances under 250ms.** The hero section should not have a scroll-triggered animation — it renders immediately with a single 200ms fade-in on page load.

11. **Apply the 400ms ceiling.** Audit every animation in the app. If any animation exceeds 400ms (outside of the landing page), either shorten it or justify why it needs the extra time. In a financial tool, speed is trust.

12. **Before shipping any new animation, apply the removal test.** Disable the animation and use the app for 5 minutes. If the absence is not felt, do not ship the animation. Parcel should feel fast and still, with motion appearing only where it genuinely aids comprehension.
