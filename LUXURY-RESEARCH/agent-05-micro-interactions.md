# Premium Micro-Interactions & Details for Luxury Dark Interfaces

Research for Parcel Platform -- React 18 + TypeScript + Tailwind CSS + Framer Motion + Recharts

---

## 1. Superscript Cents on Dollar Amounts

The gold standard for financial UI. Mercury, Stripe Dashboard, and Robinhood all split the dollar value from the cents and render cents as a superscript. This signals "we understand money" at a subconscious level.

**Exact CSS values:**

```css
.cents {
  font-size: 0.55em;       /* ~55% of the parent dollar amount */
  vertical-align: super;
  line-height: 1;
  opacity: 0.7;            /* dimmed -- cents are secondary */
  font-weight: 500;        /* one step lighter than the dollar portion */
  letter-spacing: 0.01em;
  font-feature-settings: "tnum";  /* tabular nums to prevent layout shifts */
}
```

**React component pattern:**

```tsx
function CurrencyDisplay({ value, className }: { value: number; className?: string }) {
  const [dollars, cents] = value.toFixed(2).split('.')
  const formattedDollars = Number(dollars).toLocaleString('en-US')
  return (
    <span className={cn('tabular-nums', className)}>
      <span className="text-xs text-muted-foreground/60 font-medium">$</span>
      {formattedDollars}
      <span className="text-[0.55em] align-super opacity-70 font-medium ml-px">
        {cents}
      </span>
    </span>
  )
}
```

**Key details:** The dollar sign should also be slightly smaller (about 60% of the main value) and lower opacity. Mercury renders the dollar sign at `font-size: 0.65em; opacity: 0.5`. The combination of small dollar sign + superscript cents frames the integer portion as the hero.

---

## 2. Glowing Dot Indicators

A static green dot says "online." A glowing, breathing dot says "alive." The difference is a layered animation: a solid core, a semi-transparent halo that pulses, and optionally a second outer ring that fades.

**CSS approach (Tailwind + custom keyframes):**

```css
@keyframes pulse-glow {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(2.2); }
}
```

```tsx
function GlowDot({ color = 'lime' }: { color?: 'lime' | 'sky' | 'red' | 'amber' }) {
  const colorMap = {
    lime:  { core: 'bg-lime-500', glow: 'bg-lime-400/40' },
    sky:   { core: 'bg-sky-500', glow: 'bg-sky-400/40' },
    red:   { core: 'bg-red-500', glow: 'bg-red-400/40' },
    amber: { core: 'bg-amber-500', glow: 'bg-amber-400/40' },
  }
  const c = colorMap[color]
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className={cn(
        'absolute inset-0 rounded-full animate-ping',
        c.glow
      )} style={{ animationDuration: '2s' }} />
      <span className={cn('relative inline-flex h-2.5 w-2.5 rounded-full', c.core)} />
    </span>
  )
}
```

**Critical tuning:** The ping animation must be slow -- 1.5s to 2.5s cycle. Anything faster feels like an error state. The glow layer opacity should never exceed 40%. For dark backgrounds, add a third layer with `box-shadow: 0 0 8px 2px rgba(132, 204, 22, 0.25)` on the core dot for ambient light bleed.

**Mercury's approach:** Their activity indicators use a 2s ease-in-out cycle, never hard blinking. The dot is 6px, the glow reaches 14px at peak.

---

## 3. Keyboard Shortcut Hints

The `kbd` element is a premium detail that signals power-user awareness. Stripe, Linear, and Raycast all style these identically: monospace, bordered, slight background, reduced opacity so they don't compete with the primary action label.

**Exact styling:**

```tsx
function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className={cn(
      'inline-flex items-center gap-0.5',
      'rounded-[5px] border border-gray-200/80',
      'bg-gray-100/80 dark:bg-white/[0.06] dark:border-white/[0.08]',
      'px-1.5 py-0.5',
      'font-mono text-[11px] leading-none',
      'text-gray-400 dark:text-white/30',
      'shadow-[0_1px_0_rgba(0,0,0,0.04)]',  /* subtle bottom shadow like a physical key */
    )}>
      {children}
    </kbd>
  )
}
```

**Placement rules:**
- Inside buttons: right-aligned, after the label, separated by `gap-2`
- In navigation items: far-right of the row, opacity 0 by default, fading to 0.6 on row hover
- In the command palette footer: always visible at reduced opacity
- Never show on mobile (use `hidden sm:inline-flex`)

**The physical key illusion:** The 1px bottom shadow (`shadow-[0_1px_0_...]`) makes the kbd look slightly raised, like a physical keycap. This is the detail that separates premium from generic. Linear and Raycast both use this.

---

## 4. Hover Underlines on Links

The animated underline that slides in from left to right (or grows from center) is a signature Mercury/Stripe detail. Never use `text-decoration: underline`. Build it with a pseudo-element or a span.

**CSS pattern (grow from left):**

```tsx
function AnimatedLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className={cn(
        'relative text-sm font-medium text-gray-900 dark:text-white/90',
        'after:absolute after:bottom-0 after:left-0',
        'after:h-px after:w-0 after:bg-current',
        'after:transition-[width] after:duration-200 after:ease-out',
        'hover:after:w-full',
      )}
    >
      {children}
    </a>
  )
}
```

**Grow from center variant:** Replace `after:left-0` with `after:left-1/2 after:-translate-x-1/2` and change `after:w-0 hover:after:w-full` to use `after:scale-x-0 hover:after:scale-x-100 after:origin-center`. The scale transform is smoother (GPU-accelerated) than width animation.

**Color choices:** The underline color should match the text color via `bg-current`, or use the accent at reduced opacity: `after:bg-lime-600/60`. On dark backgrounds, `after:bg-white/40` reads as elegant.

**Duration:** 150-200ms. Any slower feels laggy. Mercury uses exactly 150ms ease-out.

---

## 5. Number Transitions (Count-Up Animations)

Parcel already has `useCountUp` with ease-out cubic over 1200ms. This is solid. The premium enhancements are: (a) animating value *changes* (not just initial load), (b) digit-by-digit slot-machine rolling, and (c) color flashing on change.

**Enhanced count-up with change detection:**

```tsx
function useAnimatedValue(target: number, duration = 800) {
  const [display, setDisplay] = useState(target)
  const prevRef = useRef(target)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    const from = prevRef.current
    prevRef.current = target
    if (from === target) return

    const start = performance.now()
    const animate = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      setDisplay(from + (target - from) * eased)
      if (progress < 1) frameRef.current = requestAnimationFrame(animate)
    }
    frameRef.current = requestAnimationFrame(animate)
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current) }
  }, [target, duration])

  return display
}
```

**Framer Motion approach for slot-machine rolling:**

```tsx
<motion.span
  key={value}  // key change triggers AnimatePresence
  initial={{ y: 12, opacity: 0 }}
  animate={{ y: 0, opacity: 1 }}
  exit={{ y: -12, opacity: 0 }}
  transition={{ type: 'spring', damping: 25, stiffness: 350 }}
>
  {formattedValue}
</motion.span>
```

**Color flash on change:** When a KPI updates, briefly flash the text color to the accent (lime-500) or success/danger depending on direction, then ease back to the default color over 600ms. This is `transition: color 0.6s ease-out` triggered by a temporary class toggle.

---

## 6. Progress Bar Micro-Details

A basic progress bar is a rectangle inside a rectangle. A premium one has: rounded ends, gradient fill, animated shimmer, and a glow on the leading edge.

**Full implementation:**

```tsx
function PremiumProgressBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.06]">
      {/* Fill */}
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-lime-600 to-lime-400"
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
      />
      {/* Shimmer overlay */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer-slide 2s ease-in-out infinite',
        }}
      />
    </div>
  )
}
```

```css
@keyframes shimmer-slide {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```

**Leading edge glow:** Add a 4px-wide pseudo-element at the right edge of the fill with `box-shadow: 0 0 8px 2px rgba(132, 204, 22, 0.4)`. This makes the bar look like it's actively progressing.

**Track styling:** The background track should be barely visible -- `bg-gray-100` in light mode, `bg-white/[0.06]` in dark. Never use a heavy border.

---

## 7. Status Dots with Glow Rings

Different from the pulsing alive dot in section 2. Status dots indicate discrete states (active, idle, error) with a static ring that provides depth.

**Pattern:**

```tsx
const statusConfig = {
  active:  { dot: 'bg-lime-500', ring: 'ring-lime-500/20', shadow: '0 0 6px rgba(132,204,22,0.3)' },
  idle:    { dot: 'bg-gray-400', ring: 'ring-gray-400/15', shadow: 'none' },
  error:   { dot: 'bg-red-500', ring: 'ring-red-500/20', shadow: '0 0 6px rgba(239,68,68,0.3)' },
  warning: { dot: 'bg-amber-500', ring: 'ring-amber-500/20', shadow: '0 0 6px rgba(245,158,11,0.3)' },
}

function StatusDot({ status }: { status: keyof typeof statusConfig }) {
  const cfg = statusConfig[status]
  return (
    <span
      className={cn('inline-block h-2 w-2 rounded-full ring-4', cfg.dot, cfg.ring)}
      style={{ boxShadow: cfg.shadow }}
    />
  )
}
```

**Key:** The `ring-4` with 15-20% opacity creates a subtle halo without animation. The box-shadow adds ambient light bleed only for active/error states. Idle states should have no glow -- this creates visual hierarchy between states.

---

## 8. Tooltip Animations

Parcel currently uses Radix UI tooltips with CSS `animate-in` and `zoom-in-95`. The premium upgrade is switching to Framer Motion springs for a more organic entrance with slight overshoot.

**Spring-based tooltip with Framer Motion:**

```tsx
const tooltipVariants: Variants = {
  hidden: { opacity: 0, y: 4, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      damping: 22,
      stiffness: 400,
      mass: 0.5,
    },
  },
  exit: {
    opacity: 0,
    y: 2,
    scale: 0.98,
    transition: { duration: 0.1, ease: 'easeIn' },
  },
}
```

**The arrow:** Use a 6px CSS triangle rotated to point at the trigger element. Match the tooltip background color exactly. The arrow should cast the same shadow as the tooltip body -- achieve this with `filter: drop-shadow(0 1px 2px rgba(0,0,0,0.08))` on the parent container.

**Backdrop:** Dark tooltips (`bg-gray-900 text-white text-xs px-2.5 py-1.5 rounded-lg`) on light interfaces. Light tooltips (`bg-white border border-gray-200 shadow-lg`) on dark interfaces. Never match the surface -- always use contrast.

**Delay:** 300ms open delay to avoid flicker on accidental hovers. 0ms close delay for snappy feel. Radix's `delayDuration={300}` handles this.

---

## 9. Button Press Feedback

Parcel's current button has no scale/brightness feedback beyond hover background changes. Premium buttons feel physical -- they depress slightly and brighten on click.

**Framer Motion approach:**

```tsx
<motion.button
  whileHover={{ scale: 1.01, brightness: 1.05 }}
  whileTap={{ scale: 0.97 }}
  transition={{ type: 'spring', damping: 20, stiffness: 400 }}
  className="..."
>
  {children}
</motion.button>
```

**CSS-only approach (for shadcn Button):**

```css
.btn-press {
  transition: transform 0.1s ease-out, box-shadow 0.1s ease-out, filter 0.1s ease-out;
}
.btn-press:active {
  transform: scale(0.97);
  filter: brightness(0.95);  /* slightly darker on press for light theme */
}
```

**Critical details:**
- Scale should be 0.97-0.98. Anything below 0.96 feels exaggerated.
- Duration must be under 120ms. Slow press feedback feels broken.
- On release, the spring-back should be slightly bouncy (damping: 15-20) for playfulness.
- Primary buttons benefit from a subtle `box-shadow` increase on hover to create a "lift" effect before the "press" on click.

---

## 10. Skeleton Loading (Premium Shimmer on Dark)

Parcel's current `SkeletonCard` uses Tailwind's `animate-pulse` with `bg-gray-100`. This is functional but reads as generic. Premium shimmer uses a gradient sweep.

**Premium shimmer implementation:**

```css
@keyframes skeleton-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton-premium {
  background: linear-gradient(
    90deg,
    hsl(220 14% 96%) 0%,      /* gray-100 */
    hsl(220 14% 92%) 40%,      /* slightly lighter */
    hsl(220 14% 96%) 100%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.8s ease-in-out infinite;
  border-radius: 6px;
}

/* Dark mode */
.dark .skeleton-premium {
  background: linear-gradient(
    90deg,
    rgba(255,255,255,0.04) 0%,
    rgba(255,255,255,0.08) 40%,
    rgba(255,255,255,0.04) 100%
  );
}
```

**Tailwind-only approach:**

```tsx
function SkeletonLine({ width = 'w-full' }: { width?: string }) {
  return (
    <div
      className={cn(
        'h-3 rounded-md',
        'bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 bg-[length:200%_100%]',
        'dark:from-white/[0.04] dark:via-white/[0.08] dark:to-white/[0.04]',
        'animate-[shimmer-slide_1.8s_ease-in-out_infinite]',
        width,
      )}
    />
  )
}
```

**Stagger the shimmer:** Each skeleton line should have a slight animation delay (`style={{ animationDelay: '${i * 80}ms' }}`). This prevents the "synchronized wave" look and reads as more organic. Mercury does this with 60ms offsets.

---

## 11. Chart Interactions

Parcel uses Recharts. The premium details here are: crosshair cursor, value callout tooltip, and highlighted data point with glow.

**Crosshair cursor:**

```tsx
<LineChart>
  <XAxis ... />
  <YAxis ... />
  <Tooltip
    cursor={{
      stroke: 'rgba(132, 204, 22, 0.3)',  /* lime accent, very subtle */
      strokeWidth: 1,
      strokeDasharray: '4 4',
    }}
    content={<CustomTooltip />}
  />
</LineChart>
```

**Custom tooltip for Recharts:**

```tsx
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-gray-200 bg-white/95 backdrop-blur-sm px-3 py-2 shadow-lg">
      <p className="text-[11px] text-gray-400 mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm font-semibold tabular-nums text-gray-900">
          {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  )
}
```

**Active dot glow:** Recharts supports `activeDot` prop on Line/Area components:

```tsx
<Area
  activeDot={{
    r: 5,
    stroke: '#84CC16',
    strokeWidth: 2,
    fill: '#fff',
    filter: 'drop-shadow(0 0 4px rgba(132,204,22,0.4))',
  }}
/>
```

**Hover state on data points:** The active dot should be slightly larger (r=5 vs r=0 for inactive), with a white fill and accent-colored stroke. The drop-shadow creates the glow effect.

---

## 12. Time/Date Display Formatting

Premium SaaS applications never show raw ISO timestamps. The formatting communicates care.

**Patterns by context:**

| Context | Format | Example |
|---------|--------|---------|
| Dashboard activity | Relative with threshold | "2m ago", "3h ago", then "Mar 28" |
| Deal creation date | Short readable | "Mar 28, 2026" |
| Last updated | Relative | "Updated 5 min ago" |
| Pipeline stage change | Relative with verb | "Moved 2 days ago" |
| Exact timestamp hover | Full with timezone | "March 28, 2026 at 3:42 PM EDT" |

**Relative time utility:**

```ts
function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)

  if (diffSec < 60) return 'Just now'
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
```

**Premium typographic detail:** Dates and times should use `tabular-nums` and `text-muted-foreground` (gray-400/gray-500). They are metadata, not content -- they should recede visually. Mercury dims timestamps to about 40% opacity relative to the primary text.

---

## 13. Sound Design Considerations

Sound in SaaS is almost always wrong -- either absent or annoying. The exceptions (Linear's notification chime, Stripe's success tone) work because they are: infrequent, brief (under 200ms), quiet, and tied to meaningful completions.

**Where sound could work in Parcel:**
- Deal analysis complete (a single soft "ding" -- 150ms, sine wave, 440Hz fading to 880Hz)
- Payment successful (confirmation chime after Stripe checkout)
- Pipeline stage change via drag-and-drop (subtle "thock" -- satisfying physical feedback)

**Where sound must NOT be used:**
- Navigation, hover, typing, scrolling, opening modals, toggling filters

**Implementation approach:** Use the Web Audio API for generated tones (no audio file loading):

```ts
function playSuccessTone() {
  const ctx = new AudioContext()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.frequency.setValueAtTime(523, ctx.currentTime)      // C5
  osc.frequency.setValueAtTime(659, ctx.currentTime + 0.08) // E5
  gain.gain.setValueAtTime(0.08, ctx.currentTime)           // very quiet
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
  osc.start()
  osc.stop(ctx.currentTime + 0.2)
}
```

**Must be opt-in.** Always off by default. Provide a toggle in Settings. Never autoplay sound.

---

## 14. What Mercury Does That Most People Don't Notice

Mercury is the benchmark for premium financial SaaS. These are the details that create the "it just feels expensive" reaction:

1. **Superscript cents with dimmed dollar sign.** Every currency value on the page uses the pattern from section 1. The consistency is what makes it work -- not a one-off, but a system.

2. **Tabular numbers everywhere.** Every numeric value uses `font-variant-numeric: tabular-nums`. This prevents columns from shifting when values update. Mercury applies this globally to any element containing numbers.

3. **Micro-staggered list entrances.** Lists of transactions, cards, or rows never appear all at once. Each row enters 40-60ms after the previous one. The stagger is fast enough that you don't consciously notice the animation -- you just feel the content "cascading."

4. **Negative space as design element.** Mercury uses generous padding and margins -- cards have 24-32px internal padding, sections have 40-48px between them. The emptiness communicates confidence and luxury.

5. **Muted secondary information.** Timestamps, IDs, account numbers are rendered at 40-50% opacity relative to primary text. This creates a clear visual hierarchy without needing different font sizes.

6. **Single-pixel borders at low opacity.** Mercury's card borders are 1px at approximately 6-8% opacity on dark, 12-15% opacity on light. They're felt more than seen -- they define boundaries without drawing attention.

7. **No loading spinners.** Every loading state is a shimmer skeleton that matches the shape of the incoming content. The skeleton has the same padding, border-radius, and approximate proportions as the real content.

8. **Transitions on everything.** Every color change, opacity change, and layout shift has a 150ms transition. Nothing is instant. This creates the "liquid" feeling.

9. **Monospaced account numbers and IDs.** Any system-generated identifier (account number, transaction ID, deal ID) uses a monospace font at a smaller size with reduced opacity. This signals "system data" vs "human content."

10. **Hover states that reveal, not highlight.** Instead of changing background color on hover, Mercury reveals additional information (a copy button, an expand arrow, a timestamp) that was hidden at rest. The surface color stays the same.

---

## RECOMMENDATIONS FOR PARCEL

Prioritized by impact-to-effort ratio. Items marked with current file references indicate where existing code should be enhanced.

1. **Superscript cents on all currency displays.** Create a `<CurrencyDisplay>` component and use it in `KPICard` (`/frontend/src/components/ui/KPICard.tsx`), Results page, Portfolio page, and Pipeline deal cards. Replace all calls to `formatCurrency` in display contexts with this component. Highest-impact single change for perceived quality.

2. **Upgrade skeleton shimmer.** Replace `animate-pulse` in `SkeletonCard` (`/frontend/src/components/ui/SkeletonCard.tsx`) with the gradient sweep shimmer from section 10. Add staggered animation delays per line. Takes 15 minutes, visible on every page load.

3. **Add button press feedback.** Add `active:scale-[0.97] active:brightness-[0.97] transition-transform duration-100` to the base button variant in `/frontend/src/components/ui/button.tsx`. One line of CSS, immediately makes every button in the app feel physical.

4. **Glowing status dots on Pipeline and Dashboard.** Replace static colored dots with the `GlowDot` component from section 2 for active deal stages. Use the static `StatusDot` from section 7 for non-active states. Apply in Pipeline kanban columns and Dashboard activity feed.

5. **Enhanced chart tooltips and active dots.** Add the custom tooltip component and active dot glow from section 11 to `CashFlowProjection` (`/frontend/src/components/charts/CashFlowProjection.tsx`) and `ComparisonRadar` (`/frontend/src/components/charts/ComparisonRadar.tsx`). Add crosshair cursor with dashed lime stroke.

6. **Animated hover underlines on navigation links.** Apply the pattern from section 4 to sidebar navigation items and in-page text links. Use the `after:` pseudo-element approach -- no new components needed, just Tailwind classes.

7. **Keyboard shortcut hint styling upgrade.** The command palette (`/frontend/src/components/command-palette.tsx`) already has `kbd` elements. Upgrade them with the physical keycap shadow from section 3. Add fade-in kbd hints to sidebar navigation items that appear on hover.

8. **Relative time formatting.** Add the `formatRelativeTime` utility from section 12 to `/frontend/src/lib/format.ts`. Use it for deal creation dates, pipeline stage changes, and document upload times. Show full timestamps on hover via tooltips.

9. **Progress bar upgrade for deal analysis flow.** When the analyzer is running, replace any loading indicator with the premium progress bar from section 6 -- gradient fill, rounded ends, shimmer overlay.

10. **Spring-based tooltip animation.** Replace the CSS `animate-in` on Radix tooltips with Framer Motion springs from section 8. Requires wrapping `TooltipContent` with a motion div. Lower priority since the current implementation is already acceptable.

11. **Value change animations on Dashboard KPIs.** The existing `useCountUp` hook only animates from 0 on mount. Enhance it to animate between any two values using the pattern from section 5. Add a brief color flash (lime for positive, red for negative) when values change.

12. **Sound design -- defer to post-launch.** Sound is high-risk for user annoyance and low-impact for conversion. If implemented, limit to a single success tone on deal analysis completion, always off by default with a Settings toggle. Not recommended for v1.
