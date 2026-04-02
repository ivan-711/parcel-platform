# Pipeline (Kanban) Design Research: Luxury Dark Treatment

## 1. Board-Level Background Separation

The most critical challenge in a dark Kanban is distinguishing the board backdrop from the
column surfaces without introducing visual noise. Linear, Notion, and Height all solve this
with a two-tier elevation system.

**Board background:** Use the app's base dark `#0C0B0A`. This is the deepest layer.

**Column background:** Lift columns one step to `#141312` (a warm near-black that sits
visibly above the base without feeling gray). Avoid pure neutral grays -- the warmth in
Parcel's palette demands warm undertones in every surface.

**Column container treatment:**

```css
/* Tailwind: bg-[#141312] rounded-2xl border border-white/[0.04] */
.kanban-column {
  background: #141312;
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 16px;
}
```

The `border-white/[0.04]` is nearly invisible but creates just enough edge definition
under side-lighting conditions (e.g., a monitor in a bright room). Linear uses the same
technique -- a 3-4% white border on dark containers.

**Board horizontal scroll area:** Apply a subtle gradient mask at left/right edges to signal
overflow:

```css
.pipeline-board {
  mask-image: linear-gradient(
    to right,
    transparent 0px,
    black 24px,
    black calc(100% - 24px),
    transparent 100%
  );
}
```

**Scrollbar treatment for dark:**

```css
.pipeline-board::-webkit-scrollbar { height: 6px; }
.pipeline-board::-webkit-scrollbar-track { background: transparent; }
.pipeline-board::-webkit-scrollbar-thumb {
  background: rgba(240, 237, 232, 0.10); /* cream at 10% */
  border-radius: 3px;
}
.pipeline-board::-webkit-scrollbar-thumb:hover {
  background: rgba(240, 237, 232, 0.18);
}
```

## 2. Deal Cards: Surface, Border, Hover, Selected State

### Resting State

Cards sit on the column surface. They need a third elevation tier -- `#1A1918` -- with
a very subtle border:

```
/* Tailwind approximation */
className="rounded-xl bg-[#1A1918] border border-white/[0.06] transition-all duration-150"
```

The 6% white border provides card-edge definition. Mercury (Stripe's email client) uses
exactly this pattern: warm dark cards with a barely-visible white border.

### Hover State

On hover, increase border opacity and add a faint vertical-shifted shadow:

```css
.deal-card:hover {
  border-color: rgba(255, 255, 255, 0.10);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.06);
  transform: translateY(-1px);
}
```

The `translateY(-1px)` is subtle -- Linear does exactly 1px on their issue cards. Avoid
anything larger; it becomes distracting in a dense board.

### Selected / Keyboard Focus State

Use the violet accent ring rather than background tinting:

```
/* Tailwind */
className="ring-2 ring-[#8B7AFF]/40 ring-offset-2 ring-offset-[#141312] border-[#8B7AFF]/30"
```

The `ring-offset-[#141312]` must match the column background, not the board background,
so the ring appears to float above the column surface.

### Dragging Source (Ghost Left Behind)

When a card is picked up, the source position should show a dashed placeholder:

```
/* Tailwind for isDragging=true */
className="opacity-30 border-dashed border-white/[0.08] bg-[#141312]"
```

Match the ghost background to the column background so it recedes.

## 3. Drag-and-Drop Visual Feedback

### Pick-Up Glow (DragOverlay)

The floating card under the cursor is the hero moment. Use a violet-tinted glow, slight
rotation, and scale:

```tsx
<DragOverlay dropAnimation={{
  duration: 200,
  easing: 'cubic-bezier(0.25, 0.1, 0.25, 1.0)',
}}>
  {activeCard ? (
    <div
      className="rounded-xl border border-[#8B7AFF]/25 bg-[#1A1918]"
      style={{
        width: 280,
        padding: '14px 16px',
        cursor: 'grabbing',
        boxShadow: [
          '0 20px 40px rgba(0, 0, 0, 0.35)',
          '0 8px 16px rgba(0, 0, 0, 0.25)',
          '0 0 0 1px rgba(139, 122, 255, 0.15)',
          '0 0 24px rgba(139, 122, 255, 0.08)',
        ].join(', '),
        transform: 'rotate(1.5deg) scale(1.03)',
      }}
    >
      {/* card content */}
    </div>
  ) : null}
</DragOverlay>
```

Key decisions:
- **Violet halo** (`rgba(139,122,255,0.08)` at 24px spread) -- enough to signal "active"
  without neon. Linear uses blue for this; Parcel's violet maps naturally.
- **Rotation 1.5deg** -- the "picked up from a surface" metaphor. Must be small enough
  that text remains readable.
- **Scale 1.03** -- not 1.05 or larger. On a dense board, large scaling feels jumpy.
- **Drop animation 200ms** with ease-out-quad. Faster than 180ms feels snappy; slower
  than 250ms feels laggy.

### Drop Zone Highlight

When dragging over a column, the column needs to signal receptivity:

```tsx
style={{
  backgroundColor: isOver ? 'rgba(139, 122, 255, 0.04)' : 'transparent',
  border: isOver
    ? '1px dashed rgba(139, 122, 255, 0.25)'
    : '1px dashed transparent',
  transition: 'all 150ms ease',
}}
```

Using the accent color (violet) at very low opacity (4% fill, 25% border) avoids the
per-stage color noise that the current light theme uses. On dark backgrounds, colored
tints are far more visible, so opacity must drop significantly.

An alternative Linear-style approach: instead of tinting the entire column, show a 2px
insertion line at the drop position:

```css
.drop-indicator {
  height: 2px;
  background: #8B7AFF;
  border-radius: 1px;
  box-shadow: 0 0 8px rgba(139, 122, 255, 0.3);
  margin: 4px 0;
}
```

This is more precise and less visually heavy than column tinting. Consider implementing
both: column tint for cross-column drops, insertion line for within-column reordering.

### Ghost Card (Placeholder)

The ghost left in the source column should fade to column-level background:

```tsx
// When isDragging, the SortableDealCard renders a recessed placeholder
className={isDragging
  ? "rounded-xl border border-dashed border-white/[0.06] bg-[#141312] opacity-40"
  : "rounded-xl border border-white/[0.06] bg-[#1A1918]"
}
```

## 4. Column Headers

### Structure

Each column header needs: stage dot, stage name, count badge, and total value.

```tsx
<div className="flex items-center gap-2 h-10 px-3">
  {/* Stage dot */}
  <div
    className="w-2 h-2 rounded-full flex-shrink-0"
    style={{ backgroundColor: stage.color, opacity: 0.8 }}
  />
  {/* Stage name */}
  <span className="text-[13px] font-semibold text-[#F0EDE8] tracking-[-0.01em]">
    {stage.label}
  </span>
  {/* Count badge */}
  <span className="text-[11px] tabular-nums text-[#F0EDE8]/50 bg-white/[0.06] rounded-md px-1.5 py-0.5">
    {cards.length}
  </span>
  {/* Total value */}
  {totalValue > 0 && (
    <span className="text-[11px] tabular-nums text-[#F0EDE8]/30 ml-auto font-medium">
      {formatCompactValue(totalValue)}
    </span>
  )}
</div>
```

**Design rationale:**
- Stage name uses cream `#F0EDE8` at full opacity -- this is primary text.
- Count badge uses `bg-white/[0.06]` -- a glass-like chip. Linear uses similar for their
  count indicators.
- Total value uses cream at 30% opacity -- tertiary information, visible but quiet.
- The stage dot carries the color at 80% -- on dark backgrounds, full-saturation small
  dots can feel hot. 80% softens them.

### Stage Color Palette for Dark

The existing stage colors need adjustment for dark backgrounds. Full-saturation colors
that work on white appear neon on dark. Desaturate slightly:

```ts
export const STAGES_DARK: { key: Stage; label: string; color: string }[] = [
  { key: 'lead',           label: 'Lead',           color: '#8B95A5' }, // was #64748B
  { key: 'analyzing',      label: 'Analyzing',      color: '#6B9A2B' }, // was #4D7C0F
  { key: 'offer_sent',     label: 'Offer Sent',     color: '#E5A530' }, // was #D97706
  { key: 'under_contract', label: 'Under Contract', color: '#5B9AE8' }, // was #3B82F6
  { key: 'due_diligence',  label: 'Due Diligence',  color: '#9B7AED' }, // was #7C3AED
  { key: 'closed',         label: 'Closed',         color: '#34B87A' }, // was #059669
  { key: 'dead',           label: 'Dead',           color: '#E05252' }, // was #DC2626
]
```

These are the same hues shifted +10-15% lightness and -5-10% saturation. The result:
visible color coding without the "Christmas tree" effect on dark backgrounds.

## 5. Stage Progress Indicators

### Subtle Top Border Accent

A thin colored line at the top of each column provides stage identity without overwhelming:

```tsx
<div className="relative rounded-2xl bg-[#141312] border border-white/[0.04] overflow-hidden">
  {/* Gradient accent line */}
  <div
    className="absolute top-0 left-3 right-3 h-[2px] rounded-full"
    style={{
      background: `linear-gradient(90deg, ${stage.color}00, ${stage.color}60, ${stage.color}00)`,
    }}
  />
  {/* Column content */}
</div>
```

The gradient fades to transparent at both ends, producing a Mercury-style whisper of color.

### Card-Level Stage Indicators

On each deal card, a 2px left border accent indicates the parent stage:

```tsx
<div
  className="rounded-xl bg-[#1A1918] border border-white/[0.06]"
  style={{ borderLeftColor: stage.color, borderLeftWidth: '2px' }}
>
```

This is optional -- it adds information density but can feel heavy with 20+ cards. Consider
enabling it only when the board has multiple strategies per column and users need the
visual anchor.

## 6. Empty Column State

Empty columns should feel inviting, not dead:

```tsx
<div className="flex flex-col items-center justify-center min-h-[120px] py-10
  border border-dashed border-white/[0.06] rounded-xl">
  <Inbox size={18} className="text-[#F0EDE8]/15 mb-2" />
  <p className="text-[12px] text-[#F0EDE8]/25">No deals</p>
</div>
```

The extremely low opacity (15% icon, 25% text) makes the empty state recede. On dark,
even 30% opacity text feels prominent. Stripe and Linear both push empty states to
near-invisible on dark.

For an enhanced empty state, add a subtle drop zone hint when a drag is active globally:

```tsx
{isDragActive && cards.length === 0 && (
  <div className="flex flex-col items-center justify-center min-h-[120px] py-10
    border border-dashed border-[#8B7AFF]/20 rounded-xl bg-[#8B7AFF]/[0.02]
    transition-all duration-200">
    <p className="text-[12px] text-[#8B7AFF]/40">Drop here</p>
  </div>
)}
```

## 7. Pipeline Filters and Search

### Filter Bar

The filter bar sits above the board. On dark, input fields need careful contrast:

```tsx
<div className="flex items-center gap-3 mb-4">
  {/* Search input */}
  <div className="relative flex-1 max-w-xs">
    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#F0EDE8]/30" />
    <input
      placeholder="Search deals..."
      className="w-full pl-9 pr-3 py-2 rounded-lg
        bg-white/[0.04] border border-white/[0.06]
        text-[13px] text-[#F0EDE8] placeholder:text-[#F0EDE8]/25
        focus:outline-none focus:ring-1 focus:ring-[#8B7AFF]/40 focus:border-[#8B7AFF]/30
        transition-all duration-150"
    />
  </div>
  {/* Strategy filter chips */}
  <div className="flex items-center gap-1.5">
    {strategies.map((s) => (
      <button
        key={s.key}
        className={`px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150
          ${isActive
            ? 'bg-[#8B7AFF]/15 text-[#8B7AFF] border border-[#8B7AFF]/25'
            : 'bg-white/[0.04] text-[#F0EDE8]/50 border border-white/[0.06] hover:bg-white/[0.06]'
          }`}
      >
        {s.label}
      </button>
    ))}
  </div>
</div>
```

**Key patterns:**
- `bg-white/[0.04]` for input backgrounds -- transparent enough to not create floating
  rectangles, opaque enough to signal interactivity.
- `placeholder:text-[#F0EDE8]/25` -- placeholders must be very subdued on dark.
- Focus ring uses violet at 40% -- consistent with the accent system.

### Column-Level Count Filters

When filters are active, update column count badges to show filtered/total:

```tsx
<span className="text-[11px] tabular-nums text-[#F0EDE8]/50 bg-white/[0.06] rounded-md px-1.5 py-0.5">
  {filteredCount}<span className="text-[#F0EDE8]/25">/{totalCount}</span>
</span>
```

## 8. Mobile Pipeline on Dark

### Tab Bar

The mobile tab bar translates directly to dark with adjusted surfaces:

```tsx
<button
  className={`flex-shrink-0 inline-flex items-center gap-1.5
    px-3 py-2 rounded-full text-[13px] font-medium
    transition-all duration-200 min-h-[44px]
    ${isActive
      ? 'bg-[#8B7AFF] text-white shadow-[0_2px_8px_rgba(139,122,255,0.25)]'
      : 'bg-white/[0.06] text-[#F0EDE8]/60 hover:bg-white/[0.08]'
    }`}
>
```

The active tab uses the violet accent with a colored shadow -- this replaces the
light theme's indigo-600 and provides brand consistency.

### Mobile Card Adjustments

Mobile cards need larger touch targets (already 44px min in current implementation)
and slightly more padding on dark because the border-based separation is harder to
perceive on small screens:

```tsx
className="rounded-xl bg-[#1A1918] border border-white/[0.06] py-4 px-4 space-y-3"
```

### Swipe Interactions

For mobile stage transitions via swipe, use Framer Motion's drag gesture:

```tsx
<motion.div
  drag="x"
  dragConstraints={{ left: 0, right: 0 }}
  dragElastic={0.15}
  onDragEnd={(_, info) => {
    if (info.offset.x > 80 && info.velocity.x > 200) {
      onMoveToNextStage()
    } else if (info.offset.x < -80 && info.velocity.x < -200) {
      onMoveToPreviousStage()
    }
  }}
>
```

Visual feedback during swipe: show the destination stage name with a fade-in at the
edge of the card:

```tsx
{/* Swipe direction hint */}
{dragX > 40 && (
  <motion.div
    className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#8B7AFF]/60"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
  >
    {nextStage.label} →
  </motion.div>
)}
```

Threshold: 80px horizontal + 200px/s velocity. These values come from iOS gesture
guidelines and feel natural for "intentional" swipes.

## 9. How Linear Handles Board Views on Dark

Linear's board view is the gold standard for dark Kanban. Key observations:

1. **No column backgrounds.** Linear's columns have no visible background container.
   Cards float directly on the board surface. Separation comes purely from spacing
   (16-20px column gaps) and the column header.

2. **Column headers are minimal.** Status dot + label + count. No background chip on
   the header row. The count is plain text in a muted color.

3. **Cards use a single elevation.** All cards share one surface color with a 1px border
   at ~5% white opacity. No gradients, no inner shadows.

4. **Drag overlay is the only moment of elevation.** When a card is picked up, it gets
   a larger shadow and a very faint blue ring (their accent). Everything else stays flat.

5. **Drop indicator is an insertion line**, not a column highlight. A 2px blue line
   appears between cards at the insertion point. This is more precise and less visually
   heavy than tinting an entire column.

6. **No color coding on cards** beyond a small status icon. Labels use muted background
   chips. This prevents the "rainbow board" problem where every card is a different color.

7. **Hover effect is border-only.** Card hover increases border opacity from ~5% to ~12%.
   No shadow, no translate, no background change.

8. **Keyboard navigation** uses a blue ring identical to focus-visible, with ring-offset
   matching the board background.

**What to adopt from Linear:**
- Minimal column containers (no heavy column backgrounds)
- Insertion-line drop indicator
- Border-only hover state
- Single-accent-color drag feedback

**Where Parcel should diverge:**
- Parcel's pipeline has financial data (dollar amounts) that benefits from column grouping.
  A subtle column container helps users parse dense financial information.
- Stage progress is more meaningful in real estate (Lead -> Closed is a long funnel).
  The subtle top-line accent helps users orient.

## 10. Drag Animation Physics

### Pick-Up Animation

Use spring physics for the initial pick-up to feel organic:

```tsx
// dnd-kit doesn't expose spring directly, but the DragOverlay
// can be wrapped in a Framer Motion container
<DragOverlay>
  <motion.div
    initial={{ scale: 1, rotate: 0 }}
    animate={{ scale: 1.03, rotate: 1.5 }}
    transition={{
      type: 'spring',
      stiffness: 400,
      damping: 25,
      mass: 0.8,
    }}
  >
    {/* card content */}
  </motion.div>
</DragOverlay>
```

**Spring parameters explained:**
- `stiffness: 400` -- responsive but not snappy-harsh
- `damping: 25` -- slight overshoot, settles quickly
- `mass: 0.8` -- lighter than default (1.0), feels nimble

### Drop Animation

The dnd-kit `dropAnimation` config controls the return/settle:

```tsx
dropAnimation={{
  duration: 200,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)', // ease-out-expo
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: '0.5' } },
  }),
}}
```

`ease-out-expo` (0.22, 1, 0.36, 1) decelerates sharply -- the card "snaps" into place.
Linear uses a similar curve. Avoid linear or ease-in-out, which feel floaty.

### Column Transition

When a card enters a new column, the existing cards should shift to make room. This
happens automatically with dnd-kit's SortableContext, but the transition timing matters:

```tsx
// In useSortable, the transform transition is controlled by:
const style = {
  transform: CSS.Transform.toString(transform),
  transition: transition ?? 'transform 200ms cubic-bezier(0.22, 1, 0.36, 1)',
}
```

### Activation Constraint

The current `distance: 6` activation constraint is good. This prevents accidental drags
when clicking. For touch devices, consider adding a `delay` sensor:

```tsx
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: { distance: 6 },
  }),
  useSensor(TouchSensor, {
    activationConstraint: { delay: 200, tolerance: 5 },
  }),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  })
)
```

The 200ms delay on touch prevents drag activation during scroll gestures.

## 11. Strategy Badge Colors on Dark

The current strategy badges use light tinted backgrounds with dark text. On a dark
card surface, these need inversion -- dark tinted backgrounds with light text:

```ts
export const STRATEGY_COLORS_DARK: Record<string, { bg: string; text: string }> = {
  wholesale:        { bg: 'rgba(234, 179, 8, 0.12)',  text: '#F0C040' },
  creative_finance: { bg: 'rgba(139, 122, 255, 0.12)', text: '#A89AFF' },
  brrrr:            { bg: 'rgba(96, 165, 250, 0.12)',  text: '#7CB8FF' },
  buy_and_hold:     { bg: 'rgba(52, 184, 122, 0.12)',  text: '#5CD4A0' },
  flip:             { bg: 'rgba(248, 113, 113, 0.12)', text: '#F09090' },
}
```

These use 12% opacity backgrounds of the hue color, with a lightened text variant.
The result: recognizable color coding without the jarring contrast of opaque colored
chips on dark cards.

## 12. Risk Indicators on Dark

The current `RiskDot` uses red (#DC2626) and amber (#D97706) dots. On dark, these
need to be visible but not alarming:

```ts
// Aging (14-29 days): warm amber at reduced saturation
const agingColor = '#D4A04A'  // softer than #D97706

// Stale (30+ days): muted red
const staleColor = '#D46B6B'   // softer than #DC2626
```

For the days-in-stage text, use opacity rather than strong color changes:

```tsx
const daysColor = card.days_in_stage >= 30
  ? 'text-red-400/80'
  : card.days_in_stage >= 14
    ? 'text-amber-400/70'
    : 'text-[#F0EDE8]/30'
```

## 13. Skeleton Loading on Dark

The shimmer animation needs a dark-appropriate gradient:

```css
@keyframes shimmer-dark {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
.shimmer-dark {
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(240, 237, 232, 0.03) 50%,
    transparent 100%
  );
  animation: shimmer-dark 1.8s infinite;
}
```

Skeleton blocks use `bg-white/[0.04]` instead of `bg-gray-100`:

```tsx
<div className="rounded-xl border border-white/[0.04] bg-[#1A1918] p-4 space-y-3"
  style={{ opacity: 1 - i * 0.15 }}>
  <div className="h-3 w-3/4 rounded bg-white/[0.04] overflow-hidden relative">
    <div className="shimmer-dark absolute inset-0" />
  </div>
</div>
```

---

## RECOMMENDATIONS FOR PARCEL

1. **Two-tier elevation system.** Board at `#0C0B0A`, columns at `#141312` with
   `border-white/[0.04]`, cards at `#1A1918` with `border-white/[0.06]`. This is
   the highest-impact change -- it establishes spatial hierarchy across the entire board.

2. **Violet-accent drag feedback.** Replace per-stage color tinting in drop zones with
   a unified `rgba(139,122,255,0.04)` fill and `rgba(139,122,255,0.25)` dashed border.
   The DragOverlay card gets a violet halo shadow. This reduces visual noise during
   drag operations and reinforces brand.

3. **Desaturated stage colors.** Shift all seven stage dot colors +10-15% lightness and
   -5-10% saturation. Full-saturation colors that work on white backgrounds read as neon
   on dark. Use the `STAGES_DARK` palette provided in section 4.

4. **Linear-style insertion indicator.** Add a 2px violet line at the drop position
   between cards, in addition to the column tint. This provides precise placement
   feedback that column-level tinting alone cannot.

5. **Spring-based pick-up animation.** Wrap the DragOverlay content in a Framer Motion
   container with `stiffness: 400, damping: 25`. The physical feel of spring animation
   differentiates a luxury product from a commodity tool.

6. **Border-only hover state.** Cards hover by increasing border opacity from 6% to 12%
   and adding `translateY(-1px)`. No background color change, no heavy shadow. This
   matches Linear's restraint.

7. **Inverted strategy badges.** Switch from opaque light-background chips to 12%-opacity
   dark-background chips with lightened text. Use the `STRATEGY_COLORS_DARK` map from
   section 11.

8. **Touch sensor with delay.** Add `TouchSensor` with `{ delay: 200, tolerance: 5 }` to
   prevent accidental drag activation during mobile scroll. The current implementation
   only uses `PointerSensor` and `KeyboardSensor`.

9. **Mobile tab bar with violet accent.** Replace the light theme's `bg-indigo-600` active
   tab with `bg-[#8B7AFF]` plus a colored `shadow-[0_2px_8px_rgba(139,122,255,0.25)]`.
   Inactive tabs use `bg-white/[0.06]`.

10. **Subdued empty states.** Push empty column content to 15-25% opacity cream. When a
    drag is active globally, enhance empty columns with a faint violet dashed border
    and "Drop here" label to guide placement.

11. **Dark scrollbar treatment.** Replace gray scrollbar thumbs with `rgba(240,237,232,0.10)`
    (cream at 10%). Scrollbars should be nearly invisible until hovered, matching the
    minimal-chrome aesthetic.

12. **Skeleton shimmer at 3% cream.** The light theme's `rgba(0,0,0,0.04)` shimmer inverts
    to `rgba(240,237,232,0.03)` on dark. Run at 1.8s cycle (slightly slower than light)
    for a more relaxed feel.
