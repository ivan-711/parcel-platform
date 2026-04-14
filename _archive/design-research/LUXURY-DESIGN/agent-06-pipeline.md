# Pipeline Kanban -- Luxury Dark Design Spec

## 1. Board Layout: Three-Tier Elevation System

The board uses a strict three-tier elevation hierarchy that creates spatial depth without relying on heavy shadows.

| Layer   | Surface   | Tailwind / CSS                          | Purpose                 |
|---------|-----------|-----------------------------------------|-------------------------|
| Base    | `#0C0B0A` | `bg-[#0C0B0A]`                          | Board background        |
| Column  | `#141312` | `bg-[#141312] border border-white/[0.04]` | Column containers     |
| Card    | `#1A1918` | `bg-[#1A1918] border border-white/[0.06]` | Deal cards            |

Each tier is separated by exactly one step of warmth and luminance. The 4% white border on columns and 6% on cards provides edge definition under varied ambient lighting without visible line artifacts.

### Board Container

```tsx
{/* Pipeline board -- horizontal scroll with gradient edge masks */}
<div
  className="pipeline-board flex gap-5 overflow-x-auto pb-6 px-1 min-h-[calc(100vh-180px)]"
  style={{
    maskImage: `linear-gradient(
      to right,
      transparent 0px,
      black 24px,
      black calc(100% - 24px),
      transparent 100%
    )`,
  }}
  role="grid"
  aria-label="Pipeline Kanban board"
  onKeyDown={kanbanKeyDown}
  onMouseDown={kanbanMouseDown}
>
  {/* columns */}
</div>
```

### Scrollbar Treatment (Dark)

```css
/* Board horizontal scrollbar */
.pipeline-board::-webkit-scrollbar { height: 6px; }
.pipeline-board::-webkit-scrollbar-track { background: transparent; }
.pipeline-board::-webkit-scrollbar-thumb {
  background: rgba(240, 237, 232, 0.10);
  border-radius: 3px;
}
.pipeline-board::-webkit-scrollbar-thumb:hover {
  background: rgba(240, 237, 232, 0.18);
}
.pipeline-board {
  scrollbar-width: thin;
  scrollbar-color: rgba(240, 237, 232, 0.10) transparent;
}

/* Column vertical scrollbar */
.column-scroll::-webkit-scrollbar { width: 4px; }
.column-scroll::-webkit-scrollbar-track { background: transparent; }
.column-scroll::-webkit-scrollbar-thumb {
  background: rgba(240, 237, 232, 0.10);
  border-radius: 9999px;
}
.column-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(240, 237, 232, 0.18);
}
.column-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgba(240, 237, 232, 0.10) transparent;
}

/* Column scroll gradient fade mask */
.column-scroll-mask {
  mask-image: linear-gradient(
    to bottom,
    transparent 0px,
    black 8px,
    black calc(100% - 8px),
    transparent 100%
  );
}
```

---

## 2. Column Design

Each column is a `min-w-[280px] max-w-[280px]` flex column container. The column body uses a subtle container with a gradient top-line accent for stage identity.

### Column Container

```tsx
<div className="flex flex-col min-w-[280px] max-w-[280px]" role="listbox">
  {/* Header */}
  <div className="flex items-center gap-2 h-10 px-3 mb-3">
    {/* Stage dot -- 80% opacity to avoid neon on dark */}
    <div
      className="w-2 h-2 rounded-full flex-shrink-0"
      style={{ backgroundColor: stage.color, opacity: 0.8 }}
    />
    {/* Stage name -- primary cream text */}
    <span className="text-[13px] font-semibold text-[#F0EDE8] tracking-[-0.01em]">
      {stage.label}
    </span>
    {/* Count badge -- glass chip */}
    <span className="text-[11px] tabular-nums text-[#F0EDE8]/50 bg-white/[0.06] rounded-md px-1.5 py-0.5">
      {cards.length}
    </span>
    {/* Total value -- tertiary */}
    {totalValue > 0 && (
      <span className="text-[11px] tabular-nums text-[#F0EDE8]/30 ml-auto font-medium">
        {formatCompactValue(totalValue)}
      </span>
    )}
  </div>

  {/* Drop zone body with gradient accent line */}
  <div className="relative rounded-2xl bg-[#141312] border border-white/[0.04] overflow-hidden">
    {/* Gradient top-line accent -- fades to transparent at edges */}
    <div
      className="absolute top-0 left-3 right-3 h-[2px] rounded-full"
      style={{
        background: `linear-gradient(90deg, ${stage.color}00, ${stage.color}60, ${stage.color}00)`,
      }}
    />
    {/* Card list */}
    <div
      ref={scrollRef}
      className={cn(
        'column-scroll flex flex-col gap-2 p-2 min-h-[100px]',
        'max-h-[calc(100vh-240px)] overflow-y-auto',
        isScrollable && 'column-scroll-mask',
      )}
    >
      {/* cards or empty state */}
    </div>
  </div>
</div>
```

### Active Filter Count Display

When filters are active, the count badge shows filtered/total:

```tsx
<span className="text-[11px] tabular-nums text-[#F0EDE8]/50 bg-white/[0.06] rounded-md px-1.5 py-0.5">
  {filteredCount}<span className="text-[#F0EDE8]/25">/{totalCount}</span>
</span>
```

### Desaturated Stage Colors for Dark

All stage colors are shifted +10-15% lightness and -5-10% saturation from the light theme originals. Full-saturation colors on dark backgrounds read as neon.

```ts
export const STAGES_DARK: { key: Stage; label: string; color: string }[] = [
  { key: 'lead',           label: 'Lead',           color: '#8B95A5' },
  { key: 'analyzing',      label: 'Analyzing',      color: '#6B9A2B' },
  { key: 'offer_sent',     label: 'Offer Sent',     color: '#E5A530' },
  { key: 'under_contract', label: 'Under Contract', color: '#5B9AE8' },
  { key: 'due_diligence',  label: 'Due Diligence',  color: '#9B7AED' },
  { key: 'closed',         label: 'Closed',         color: '#34B87A' },
  { key: 'dead',           label: 'Dead',            color: '#E05252' },
]
```

---

## 3. Deal Cards

### Resting State

```tsx
<div
  className="group relative rounded-xl bg-[#1A1918] border border-white/[0.06]
    py-3.5 px-4 space-y-2.5 transition-all duration-150 outline-none"
>
```

### Hover State

Border opacity increase to 10%, subtle lift of 1px, faint shadow:

```tsx
className="... hover:border-white/[0.10] hover:-translate-y-px"
style={{
  // Applied conditionally on hover via group state or JS
  boxShadow: isHovered
    ? '0 2px 8px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.06)'
    : 'none',
}}
```

Or use Tailwind's hover pseudo-classes directly:

```tsx
className="... hover:border-white/[0.10] hover:-translate-y-px
  hover:shadow-[0_2px_8px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.06)]"
```

### Selected / Keyboard Focus State

Violet accent ring with ring-offset matching the column background:

```tsx
className={isFocused
  ? 'ring-2 ring-[#8B7AFF]/40 ring-offset-2 ring-offset-[#141312] border-[#8B7AFF]/30'
  : ''
}
```

### Dragging Source (Ghost)

When a card is picked up, the source position shows a dashed recessed placeholder:

```tsx
className={isDragging
  ? 'opacity-30 border-dashed border-white/[0.08] bg-[#141312] rounded-xl'
  : 'rounded-xl bg-[#1A1918] border border-white/[0.06]'
}
```

The ghost background matches the column surface `#141312` so it recedes visually.

### Card Content Layout

```tsx
{/* Address + Actions row */}
<div className="flex items-start justify-between gap-2">
  <p className="text-[13px] font-medium text-[#F0EDE8] leading-snug line-clamp-2">
    {card.address}
  </p>
  <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
    <button
      className="opacity-100 md:opacity-0 md:group-hover:opacity-100
        text-[#F0EDE8]/40 hover:text-[#F0EDE8]/70 transition-all
        min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0
        flex items-center justify-center"
    >
      <MoreHorizontal size={14} />
    </button>
    <GripVertical
      size={14}
      className="hidden md:block text-[#F0EDE8]/20 hover:text-[#F0EDE8]/40
        cursor-grab active:cursor-grabbing transition-colors"
    />
  </div>
</div>

{/* Strategy badge */}
<div className="flex items-center gap-2 flex-wrap">
  <StrategyBadge strategy={card.strategy} />
</div>

{/* Price + Days-in-stage + Risk dot */}
<div className="flex items-center justify-between">
  {card.asking_price != null && card.asking_price > 0 && (
    <span className="text-[12px] tabular-nums font-medium text-[#F0EDE8]/70">
      ${card.asking_price.toLocaleString()}
    </span>
  )}
  <span className={`text-[11px] ${daysColor} ml-auto flex items-center`}>
    {card.days_in_stage}d
    <RiskDot days={card.days_in_stage} />
  </span>
</div>
```

### Strategy Badge Colors (Dark)

Inverted from light: 12% opacity tinted backgrounds with lightened text.

```ts
export const STRATEGY_COLORS_DARK: Record<string, { bg: string; text: string }> = {
  wholesale:        { bg: 'rgba(234, 179, 8, 0.12)',   text: '#F0C040' },
  creative_finance: { bg: 'rgba(139, 122, 255, 0.12)', text: '#A89AFF' },
  brrrr:            { bg: 'rgba(96, 165, 250, 0.12)',   text: '#7CB8FF' },
  buy_and_hold:     { bg: 'rgba(52, 184, 122, 0.12)',   text: '#5CD4A0' },
  flip:             { bg: 'rgba(248, 113, 113, 0.12)',  text: '#F09090' },
}
```

### Risk Indicators (Dark)

Softened from light theme to avoid alarm-bell red/amber on dark surfaces:

```ts
// Days-in-stage text color
const daysColor = card.days_in_stage >= 30
  ? 'text-red-400/80'
  : card.days_in_stage >= 14
    ? 'text-amber-400/70'
    : 'text-[#F0EDE8]/30'

// RiskDot colors -- desaturated
const agingColor = '#D4A04A'   // 14-29 days (softer than #D97706)
const staleColor = '#D46B6B'   // 30+ days  (softer than #DC2626)
```

### Context Menu (Dark)

```tsx
<div
  ref={menuRef}
  className="absolute top-10 right-3 z-40 rounded-lg
    border border-white/[0.08] bg-[#1A1918] py-1"
  style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)' }}
>
  <button
    className="flex items-center gap-2 px-3 py-2 text-[13px]
      text-[#F0EDE8]/60 hover:bg-white/[0.06] hover:text-emerald-400
      w-full transition-colors min-h-[44px]"
  >
    <CheckCircle2 size={14} /> Close Deal
  </button>
  <div className="border-t border-white/[0.06]" />
  <button
    className="flex items-center gap-2 px-3 py-2 text-[13px]
      text-[#F0EDE8]/60 hover:bg-white/[0.06] hover:text-red-400
      w-full transition-colors min-h-[44px]"
  >
    <Trash2 size={14} /> Remove from pipeline
  </button>
</div>
```

---

## 4. Drag-and-Drop

### dnd-kit Sensor Configuration

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

The `TouchSensor` with `delay: 200` prevents accidental drag activation during mobile scroll. The existing `PointerSensor` distance of 6px is retained.

### DragOverlay -- Violet Halo

The floating card is the hero moment. It gets a violet-tinted glow, slight rotation, and scale wrapped in a Framer Motion spring.

```tsx
<DragOverlay
  dropAnimation={{
    duration: 200,
    easing: 'cubic-bezier(0.22, 1, 0.36, 1)', // ease-out-expo
    sideEffects: defaultDropAnimationSideEffects({
      styles: { active: { opacity: '0.5' } },
    }),
  }}
>
  {activeCard ? (
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
      <div
        className="rounded-xl border border-[#8B7AFF]/25 bg-[#1A1918] space-y-2.5"
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
        }}
      >
        <p className="text-[13px] font-medium text-[#F0EDE8] leading-tight line-clamp-2">
          {activeCard.address}
        </p>
        <OverlayStrategyBadge strategy={activeCard.strategy} />
        {activeCard.asking_price != null && activeCard.asking_price > 0 && (
          <span className="block text-[12px] tabular-nums font-medium text-[#F0EDE8]/70">
            ${activeCard.asking_price.toLocaleString()}
          </span>
        )}
      </div>
    </motion.div>
  ) : null}
</DragOverlay>
```

Spring physics rationale:
- `stiffness: 400` -- responsive but not harsh
- `damping: 25` -- slight overshoot, settles within ~150ms
- `mass: 0.8` -- lighter than default 1.0, feels nimble
- `rotate: 1.5deg` -- "picked up from surface" metaphor; small enough that text stays readable
- `scale: 1.03` -- not 1.05 which feels jumpy on a dense board

### Drop Animation

```tsx
dropAnimation={{
  duration: 200,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',  // ease-out-expo -- sharp deceleration
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: '0.5' } },
  }),
}}
```

### Column Drop Zone Highlight

When dragging over a column, use unified violet tinting (not per-stage colors):

```tsx
style={{
  backgroundColor: isOver ? 'rgba(139, 122, 255, 0.04)' : 'transparent',
  border: isOver
    ? '1px dashed rgba(139, 122, 255, 0.25)'
    : '1px dashed transparent',
  transition: 'all 150ms ease',
}}
```

### Insertion Line (Between Cards)

A 2px violet line at the exact drop position provides precise feedback:

```tsx
{/* Rendered between cards at the insertion index */}
<div
  className="h-[2px] rounded-full mx-2 my-1"
  style={{
    background: '#8B7AFF',
    boxShadow: '0 0 8px rgba(139, 122, 255, 0.3)',
  }}
/>
```

Implementation: track the `overIndex` from dnd-kit's `onDragOver` event. In the card list render, insert the line element at that index when a drag is active over the column.

### SortableCard Transform Transition

```tsx
const style = {
  transform: CSS.Transform.toString(transform),
  transition: transition ?? 'transform 200ms cubic-bezier(0.22, 1, 0.36, 1)',
  zIndex: isDragging ? 50 : undefined,
}
```

The `ease-out-expo` curve makes neighboring cards shift crisply when the dragged card enters their column.

---

## 5. Empty Column State

Empty columns must feel inviting, not dead. Extremely low opacity so the empty state recedes.

### Default (No Drag Active)

```tsx
<div className="flex flex-col items-center justify-center min-h-[120px] py-10
  border border-dashed border-white/[0.06] rounded-xl">
  <Inbox size={18} className="text-[#F0EDE8]/15 mb-2" />
  <p className="text-[12px] text-[#F0EDE8]/25">No deals</p>
</div>
```

### Enhanced (Drag Active Globally)

When any card is being dragged, empty columns light up with a faint violet drop-zone hint:

```tsx
{isDragActive && cards.length === 0 && (
  <div className="flex flex-col items-center justify-center min-h-[120px] py-10
    border border-dashed border-[#8B7AFF]/20 rounded-xl bg-[#8B7AFF]/[0.02]
    transition-all duration-200">
    <p className="text-[12px] text-[#8B7AFF]/40">Drop here</p>
  </div>
)}
```

---

## 6. Filters and Search

The filter bar sits above the board. Dark input fields use careful contrast to avoid floating-rectangle artifacts.

### Search Input

```tsx
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
```

### Strategy Filter Chips

```tsx
<div className="flex items-center gap-1.5">
  {strategies.map((s) => (
    <button
      key={s.key}
      className={cn(
        'px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150',
        isActive
          ? 'bg-[#8B7AFF]/15 text-[#8B7AFF] border border-[#8B7AFF]/25'
          : 'bg-white/[0.04] text-[#F0EDE8]/50 border border-white/[0.06] hover:bg-white/[0.06]',
      )}
    >
      {s.label}
    </button>
  ))}
</div>
```

### Add Deal Button

```tsx
<Link
  to="/analyze"
  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
    bg-[#8B7AFF] hover:bg-[#7B6AEF] text-white text-xs font-medium
    transition-colors shadow-[0_1px_4px_rgba(139,122,255,0.25)]"
>
  <Plus size={14} />
  Add Deal
</Link>
```

---

## 7. Mobile Pipeline

### Tab Bar -- Violet Accent

Active tabs use `bg-[#8B7AFF]` with a colored shadow. Inactive tabs use the glass-chip pattern.

```tsx
<button
  className={cn(
    'flex-shrink-0 inline-flex items-center gap-1.5',
    'px-3 py-2 rounded-full text-[13px] font-medium',
    'transition-all duration-200 min-h-[44px] cursor-pointer',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B7AFF]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0C0B0A]',
    isActive
      ? 'bg-[#8B7AFF] text-white shadow-[0_2px_8px_rgba(139,122,255,0.25)]'
      : 'bg-white/[0.06] text-[#F0EDE8]/60 hover:bg-white/[0.08]',
  )}
>
  <span
    className="w-2 h-2 rounded-full flex-shrink-0"
    style={{ backgroundColor: isActive ? '#fff' : stage.color }}
  />
  {stage.label}
  <span
    className={cn(
      'text-[11px] tabular-nums px-1.5 py-0.5 rounded-full min-w-[22px] text-center',
      isActive
        ? 'bg-white/20 text-white'
        : 'bg-white/[0.06] text-[#F0EDE8]/40',
    )}
  >
    {count}
  </span>
</button>
```

### Mobile Card Adjustments

Slightly more padding on dark because border-based separation is harder to perceive on small screens:

```tsx
className="rounded-xl bg-[#1A1918] border border-white/[0.06] py-4 px-4 space-y-3"
```

### Mobile Empty State

```tsx
<div className="flex flex-col items-center justify-center py-16 gap-3">
  <Inbox size={28} className="text-[#F0EDE8]/15" />
  <p className="text-sm text-[#F0EDE8]/30">
    No deals in {stage.label}
  </p>
</div>
```

### Swipe Gestures for Stage Transitions

Use Framer Motion's drag gesture for horizontal swipe-to-move:

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
  {/* card content */}
</motion.div>
```

Threshold: 80px displacement + 200px/s velocity (iOS gesture guidelines for intentional swipes).

### Swipe Direction Hint

Show destination stage name at the card edge during swipe:

```tsx
{dragX > 40 && (
  <motion.div
    className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#8B7AFF]/60"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
  >
    {nextStage.label} ->
  </motion.div>
)}
{dragX < -40 && (
  <motion.div
    className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-[#8B7AFF]/60"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
  >
    <- {prevStage.label}
  </motion.div>
)}
```

### Stage Transition Animation (Tab Switch)

```tsx
<AnimatePresence mode="wait">
  <motion.div
    key={activeStage}
    initial={{ opacity: 0, x: 12 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -12 }}
    transition={{ duration: 0.2, ease: 'easeOut' }}
    className="flex flex-col gap-3"
  >
    {/* cards */}
  </motion.div>
</AnimatePresence>
```

---

## 8. Skeleton Loading (Dark)

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
@media (prefers-reduced-motion: reduce) {
  .shimmer-dark { animation: none; }
}
```

Skeleton blocks:

```tsx
<div
  className="rounded-xl border border-white/[0.04] bg-[#1A1918] p-4 space-y-3"
  style={{ opacity: 1 - i * 0.15 }}
>
  <div className="h-3 w-3/4 rounded bg-white/[0.04] overflow-hidden relative">
    <div className="shimmer-dark absolute inset-0" />
  </div>
  <div className="h-2 w-1/2 rounded bg-white/[0.04] overflow-hidden relative">
    <div className="shimmer-dark absolute inset-0" />
  </div>
</div>
```

---

## 9. Confirmation Dialogs (Dark)

The remove-from-pipeline AlertDialog:

```tsx
<AlertDialogContent className="bg-[#1A1918] border border-white/[0.08]">
  <AlertDialogHeader>
    <AlertDialogTitle className="text-[#F0EDE8]">Remove from pipeline?</AlertDialogTitle>
    <AlertDialogDescription className="text-[#F0EDE8]/40">
      This deal will be removed from your pipeline. You can always re-add it later.
    </AlertDialogDescription>
  </AlertDialogHeader>
  <AlertDialogFooter>
    <AlertDialogCancel className="bg-white/[0.04] border-white/[0.08] text-[#F0EDE8]/70 hover:bg-white/[0.06]">
      Cancel
    </AlertDialogCancel>
    <AlertDialogAction className="bg-red-500/80 hover:bg-red-500 text-white">
      Remove
    </AlertDialogAction>
  </AlertDialogFooter>
</AlertDialogContent>
```

---

## CRITICAL DECISIONS

1. **Three-tier elevation is non-negotiable.** `#0C0B0A` -> `#141312` -> `#1A1918` must be maintained exactly. The column container (unlike Linear's no-container approach) is required because Parcel's financial data density benefits from grouped visual containment. Do not flatten to two tiers.

2. **Unified violet for all drag feedback.** Drop-zone highlighting uses `rgba(139, 122, 255, 0.04)` fill and `rgba(139, 122, 255, 0.25)` dashed border -- never per-stage colors during drag. Per-stage tinting creates a rainbow noise problem on dark backgrounds where tinted fills are 3-4x more visible than on light.

3. **Spring physics are exact: stiffness 400, damping 25, mass 0.8.** These values produce a slight overshoot that settles in ~150ms. Do not increase stiffness above 500 (feels mechanical) or decrease damping below 20 (too bouncy for a data-dense board).

4. **Drop animation uses ease-out-expo (0.22, 1, 0.36, 1) at 200ms.** This sharp deceleration creates the "snap into place" feel. Do not use linear or ease-in-out which feel floaty. The 200ms duration is the sweet spot -- faster than 180ms feels harsh, slower than 250ms feels laggy.

5. **Card hover is border-only.** Increase border opacity from 6% to 10% plus `translateY(-1px)`. No background color change, no heavy shadow lift. This matches Linear's restraint and prevents visual noise when mousing across a dense board.

6. **Stage colors must be desaturated.** Use the `STAGES_DARK` palette. Full-saturation stage dots that work on white look neon on `#141312`. The shift is +10-15% lightness, -5-10% saturation per hue.

7. **TouchSensor must be added.** The current implementation only has `PointerSensor` and `KeyboardSensor`. The `TouchSensor` with `{ delay: 200, tolerance: 5 }` is critical to prevent drag activation during mobile scroll gestures.

8. **Insertion line AND column tint.** Both indicators serve different purposes: column tint for cross-column identification ("this is where it will land"), insertion line for precise within-column positioning ("it will go between these two cards"). Implement both.

9. **Strategy badge inversion.** Light-background chips with dark text become invisible on dark cards. Use 12%-opacity tinted backgrounds with lightened text from `STRATEGY_COLORS_DARK`. The bg opacity must be exactly 12% -- lower is invisible, higher competes with card border.

10. **Empty column opacity floor.** Icon at 15%, text at 25%. Even 30% text feels prominent on `#141312`. The drag-active enhanced state uses violet at 2% fill and 20% border -- barely perceptible until a drag is happening, then it guides placement.
