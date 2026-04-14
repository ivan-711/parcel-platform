# Pipeline Kanban Redesign: Light Theme Research

> Research focus: redesigning Parcel's 7-stage deal pipeline for a light theme,
> inspired by Linear's board view. Covers column layout, card anatomy, dnd-kit
> drag feedback, scroll behavior, filters, empty states, mobile, and accessibility.

---

## 1. Current State Audit

Parcel's pipeline today is a dark-theme Kanban with 7 stages (`lead`, `analyzing`,
`offer_sent`, `under_contract`, `due_diligence`, `closed`, `dead`). Key components:

| Component          | File                                      | Role                              |
|--------------------|-------------------------------------------|-----------------------------------|
| Pipeline page      | `pages/Pipeline.tsx`                      | DndContext, DragOverlay, layout   |
| KanbanColumn       | `components/pipeline/kanban-column.tsx`    | SortableContext per stage         |
| DealCard           | `components/pipeline/deal-card.tsx`        | Card content + context menu       |
| MobilePipeline     | `components/pipeline/mobile-pipeline.tsx`  | Tabbed stage switcher for <md     |
| useKanbanKeyboard  | `hooks/useKanbanKeyboard.ts`              | Arrow/Enter/Escape navigation     |
| Constants          | `components/pipeline/constants.ts`         | Stage defs, strategy colors       |

Current pain points for a light-theme migration:
- All colors are hardcoded hex values (`#0F0F1A`, `#1A1A2E`, `#475569`) scoped to dark mode.
- Strategy badge backgrounds use dark-on-dark palettes (`#451A03`, `#2E1065`) that would wash out on white.
- Drop zone feedback uses low-opacity tints of stage colors that need recalibration for light backgrounds.
- Skeleton shimmer uses `rgba(255,255,255,0.04)` -- invisible on white.

---

## 2. Linear's Board View: Design Principles

Linear's Kanban is the benchmark for minimal, high-density project boards. Key patterns:

**Column structure:**
- Columns have no visible container or background. The board itself is white/off-white.
- Column header is a single line: status icon (colored circle) + label + count badge.
- No borders between columns -- spatial separation via consistent gap (16-20px).
- Column width is fixed at approximately 280px.

**Card design:**
- Flat white card with a 1px `#E5E7EB` (gray-200) border, 8px border-radius.
- No visible shadow at rest. Subtle `0 1px 2px rgba(0,0,0,0.05)` on hover.
- Title is the dominant element (14px, font-weight 500, near-black).
- Metadata sits below in muted gray (12px): assignee avatar, labels as small pills, priority icon.
- No gradient, no background tint -- content density over decoration.

**Interaction:**
- Drag pickup: card lifts with a 4px shadow, slight scale(1.02), cursor becomes `grabbing`.
- Drop target: destination column gets a faint blue-tinted background.
- Drop animation: card eases into position with a 150ms spring, no bounce.

**Spacing:**
- Board horizontal padding: 24px.
- Card-to-card gap: 8px vertical.
- Column header to first card: 12px.

---

## 3. Column Layout Specification

### 3.1 Column Container

```
Width:           280px fixed (min-w-[280px] max-w-[280px])
Background:      transparent (no column bg -- cards sit directly on page bg)
Gap between:     20px (gap-5)
Vertical scroll: per-column, hidden scrollbar, max-height calc(100vh - 180px)
```

The page background should be `#FAFAFA` or `#F8F9FA` (not pure white -- too clinical for
a finance tool). Columns themselves carry no background, border, or shadow.

### 3.2 Column Header

```
Layout:          flex items-center gap-2 h-9 px-1
Stage dot:       w-2 h-2 rounded-full (keep existing stage colors, recalibrated -- see 3.3)
Label:           text-[13px] font-semibold text-gray-900 tracking-[-0.01em]
                 NOT uppercase (Linear avoids shouting caps in headers)
Count badge:     text-[12px] font-mono text-gray-500 bg-gray-100 rounded px-1.5 py-0.5
Total value:     text-[12px] font-mono text-gray-400 ml-auto
                 e.g. "$1.2M" -- sum of asking_price for that column
Separator:       none (no bottom border; spatial gap is enough)
```

### 3.3 Stage Colors (Light-Theme Recalibration)

Current dark-mode stage colors are adequate in hue but some lack contrast on white.
Recommended adjustments:

| Stage           | Current     | Light Theme | Usage                        |
|-----------------|-------------|-------------|------------------------------|
| Lead            | `#475569`   | `#64748B`   | Dot, badge bg at 10% opacity |
| Analyzing       | `#6366F1`   | `#6366F1`   | Unchanged, strong on white   |
| Offer Sent      | `#F59E0B`   | `#D97706`   | Darken slightly for contrast |
| Under Contract  | `#3B82F6`   | `#3B82F6`   | Unchanged                    |
| Due Diligence   | `#8B5CF6`   | `#7C3AED`   | Slightly deeper purple       |
| Closed          | `#10B981`   | `#059669`   | Darken for white bg contrast |
| Dead            | `#EF4444`   | `#DC2626`   | Darken for readability       |

---

## 4. Deal Card Specification

### 4.1 Card Shell

```
Background:      white (#FFFFFF)
Border:          1px solid #E5E7EB (gray-200)
Border-radius:   10px (rounded-[10px])
Padding:         14px 16px (py-3.5 px-4)
Shadow (rest):   none
Shadow (hover):  0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)
Transition:      shadow 150ms ease, border-color 150ms ease
Hover border:    #D1D5DB (gray-300) -- subtle darkening
Gap between:     8px vertical (gap-2)
```

### 4.2 Card Content Anatomy (top to bottom)

```
ROW 1: Address + Actions
  ├── Address text:     text-[13px] font-medium text-gray-900 leading-snug line-clamp-2
  └── Actions:          opacity-0 group-hover:opacity-100
       ├── More (...)   text-gray-400 hover:text-gray-600 (14px icon)
       └── Grip         text-gray-300 hover:text-gray-400 cursor-grab (14px icon)

ROW 2: Strategy Badge
  └── Pill badge:       text-[10px] font-medium rounded-full px-2 py-0.5
                         Light-theme palette (see 4.3)

ROW 3: Key Metric + Days-in-Stage + Risk
  ├── Asking price:     text-[12px] font-mono font-medium text-gray-700
  ├── Days in stage:    text-[11px] text-gray-400 ml-auto
  │                      e.g. "12d" -- turns amber at 14d, red at 30d
  └── Risk dot:         w-1.5 h-1.5 rounded-full ml-1
                         green = low risk, amber = medium, red = high
                         (future: derive from days_in_stage thresholds)
```

### 4.3 Strategy Badge Colors (Light Theme)

Dark-theme badge colors use dark backgrounds with light text. On a white card,
flip to light tinted backgrounds with dark-saturated text:

| Strategy         | Background  | Text        | Example              |
|------------------|-------------|-------------|----------------------|
| Wholesale        | `#FEF3C7`   | `#92400E`   | Warm amber tint      |
| Creative Finance | `#EDE9FE`   | `#5B21B6`   | Soft violet tint     |
| BRRRR            | `#DBEAFE`   | `#1E40AF`   | Light blue tint      |
| Buy & Hold       | `#D1FAE5`   | `#065F46`   | Soft green tint      |
| Flip             | `#FEE2E2`   | `#991B1B`   | Light red tint       |

These use Tailwind's 100-level and 800-level pairings for maximum readability
on white backgrounds while keeping each strategy visually distinct.

### 4.4 Risk Indicator Logic

Days-in-stage already exists on PipelineCard. Add visual urgency thresholds:

```
0-13 days:   no indicator (or subtle gray dot)
14-29 days:  amber dot (#D97706) + optional "Aging" tooltip
30+ days:    red dot (#DC2626) + optional "Stale" tooltip
```

This is a lightweight way to surface risk without adding new backend fields.
Tooltip on hover provides context; the dot alone is enough at scan-speed.

---

## 5. Drag-and-Drop Visual Feedback

### 5.1 Pickup (DragOverlay)

When a card is picked up:

```
DragOverlay card:
  - shadow: 0 12px 24px rgba(0,0,0,0.10), 0 4px 8px rgba(0,0,0,0.06)
  - transform: rotate(1.5deg) scale(1.02)
  - border: 1px solid #D1D5DB
  - background: white
  - cursor: grabbing
  - width: 280px (match column width)
  - opacity: 1
```

The source card (still in the column) should fade to 40% opacity (current behavior,
keep it). This ghost effect clearly communicates "this card has been picked up."

### 5.2 Drop Zone Highlight

When a card is dragged over a target column:

```
Column drop zone:
  - background: stage-color at 6% opacity (e.g. #6366F1 at 0.06 for Analyzing)
  - border: 1px dashed stage-color at 30% opacity
  - border-radius: 12px (rounded-xl)
  - transition: background 150ms ease, border-color 150ms ease
```

On light backgrounds, keep opacity low (6% not 12%) to avoid the tinted zone
looking too heavy. The dashed border is the primary affordance.

### 5.3 Drop Animation (dnd-kit config)

```tsx
<DragOverlay dropAnimation={{
  duration: 180,
  easing: 'cubic-bezier(0.25, 0.1, 0.25, 1.0)',  // smooth decel
}}>
```

Linear uses a ~180ms ease-out for drops. Avoid spring physics here -- Kanban
drops should feel instant and precise, not bouncy.

### 5.4 Cursor States

```
Default card:        cursor-default
Grip handle hover:   cursor-grab
Grip handle active:  cursor-grabbing
During drag:         cursor-grabbing (on DragOverlay)
Invalid drop:        cursor-not-allowed (via dnd-kit onDragOver validation)
```

---

## 6. Column Overflow and Scroll Behavior

### 6.1 Per-Column Scroll

Each column should scroll independently when cards exceed the viewport:

```
Column body container:
  max-height: calc(100vh - 200px)     // below header + page header + column header
  overflow-y: auto
  scrollbar-width: thin                // Firefox
  scrollbar-color: #D1D5DB transparent // Firefox

  // WebKit (Chrome/Safari)
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 2px; }
  &::-webkit-scrollbar-thumb:hover { background: #9CA3AF; }
```

### 6.2 Scroll Fade Indicators

Add CSS gradient masks at top/bottom of scrollable columns to indicate
more content exists:

```css
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

This is a subtle cue that avoids a "Show more" button (which breaks drag flow).

### 6.3 "Show More" Alternative (Reject)

A "Show 5 more" button at column bottom works for static lists but conflicts with
drag-and-drop. If a user drags a card to the bottom of a truncated column, they
cannot drop it after the hidden cards. Per-column scroll is the correct pattern.

---

## 7. Pipeline Filters

### 7.1 Filter Bar (above board)

Position a horizontal filter bar between the page header and the board:

```
Layout:       flex items-center gap-3 py-3 border-b border-gray-100
Background:   transparent (inherits page bg)
```

Filter controls:

| Filter          | UI Pattern            | Values                                           |
|-----------------|-----------------------|--------------------------------------------------|
| Strategy        | Multi-select dropdown | Wholesale, Creative Finance, BRRRR, B&H, Flip   |
| Risk / Aging    | Toggle button group   | All, Aging (14d+), Stale (30d+)                  |
| Date range      | Date picker pair      | "Added after" / "Added before"                   |
| Search          | Text input            | Filters by address (already exists in MyDeals)   |

Active filters should show as removable chips (pill with X button) below the
filter bar, using the same pattern as Linear's filter pills.

### 7.2 Filter Effect on Columns

Filtered-out cards should be hidden, not grayed out. Column counts and total
value should update to reflect the filtered subset. If a filter results in an
empty column, show the empty state (Section 8).

---

## 8. Empty Column State

### 8.1 Within-Board Empty Column

When a column has zero cards (common for "Closed" and "Dead" initially):

```
Container:     flex flex-col items-center justify-center min-h-[100px] py-8
Icon:          Inbox (16px) text-gray-300
Text:          text-[12px] text-gray-400 "No deals"
Border:        1px dashed #E5E7EB rounded-xl (always visible, not just on drag-over)
```

The permanent dashed border differentiates "empty but valid drop target" from
non-existent space. This is critical for drag-and-drop discoverability.

### 8.2 Entire Pipeline Empty

Keep existing PipelineEmpty component but adapt colors:

```
Background icon container:  bg-gray-50 border border-gray-200
Icon:                       text-gray-400
Title:                      text-gray-900 font-medium
Description:                text-gray-500
CTA button:                 bg-indigo-600 hover:bg-indigo-700 text-white
```

---

## 9. Mobile Pipeline

### 9.1 Current Approach: Tabbed Stages

MobilePipeline uses a horizontally scrollable tab bar with stage pills, switching
the card list via AnimatePresence. This works well and should be preserved.

### 9.2 Light Theme Adaptations

Tab bar (active tab):
```
Active:     bg-indigo-600 text-white shadow-sm
Inactive:   bg-gray-100 text-gray-600 hover:bg-gray-200
Count pill:
  Active:   bg-white/20 text-white
  Inactive: bg-gray-200 text-gray-500
```

Mobile cards use the same spec as desktop cards (Section 4) with these overrides:
```
Card padding:          12px 14px (slightly tighter)
Actions button:        always visible (no hover gating on touch)
Grip handle:           hidden (no drag on mobile -- use "Move to..." menu)
Min touch target:      44x44px (already implemented, keep)
```

### 9.3 Horizontal Scroll vs. Stacked List (Analysis)

| Pattern             | Pros                                      | Cons                                        |
|---------------------|-------------------------------------------|---------------------------------------------|
| Tabbed (current)    | Full-width cards, familiar mobile pattern | Only one stage visible at a time            |
| Horizontal scroll   | See multiple stages, closer to desktop    | Cards too narrow (<200px), poor readability |
| Stacked accordion   | All stages visible, expand to see cards   | Lots of vertical space, hard to scan        |

**Verdict:** Keep tabbed. Horizontal scroll columns are too narrow for deal cards
that need address text + price + badge. Tabbed is the right tradeoff for mobile.

### 9.4 Swipe Gesture (Future Enhancement)

Consider adding horizontal swipe on the card list area to advance to the next
stage tab. Framer Motion's `drag="x"` with `onDragEnd` threshold detection would
enable flicking between stages without reaching for the tab bar.

---

## 10. dnd-kit Styling Specifics

### 10.1 Sensor Configuration

```tsx
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: { distance: 6 },  // current: 6px, keep
  }),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  })
)
```

Add KeyboardSensor for native dnd-kit keyboard support alongside the custom
useKanbanKeyboard hook (they serve different roles: KeyboardSensor handles
drag-by-keyboard, useKanbanKeyboard handles focus navigation).

### 10.2 Ghost Card (Source Position)

The card left behind during drag should be styled as a ghost:

```tsx
// In SortableDealCard
<DealCard
  card={card}
  isDragging={isDragging}
  // ...
/>

// In DealCard, when isDragging:
style={{
  opacity: 0.35,
  border: '1px dashed #D1D5DB',
  background: '#F9FAFB',
}}
```

This "dashed outline" ghost is more informative than just fading opacity. It says
"this card's slot is reserved" while the overlay floats.

### 10.3 DragOverlay Styling

```tsx
<DragOverlay dropAnimation={{
  duration: 180,
  easing: 'cubic-bezier(0.25, 0.1, 0.25, 1.0)',
}}>
  {activeCard ? (
    <div
      className="rounded-[10px] border border-gray-300 bg-white p-4 space-y-3"
      style={{
        width: 280,
        cursor: 'grabbing',
        boxShadow: '0 12px 24px rgba(0,0,0,0.10), 0 4px 8px rgba(0,0,0,0.06)',
        transform: 'rotate(1.5deg)',
      }}
    >
      {/* Same card content as DealCard */}
    </div>
  ) : null}
</DragOverlay>
```

### 10.4 Drop Zone Droppable Container

Each column needs a droppable container wrapping the SortableContext:

```tsx
// In KanbanColumn, the drop zone div:
<div
  className="flex flex-col gap-2 min-h-[100px] rounded-xl p-2 transition-all duration-150"
  style={{
    backgroundColor: isOver ? `${stageColor}0F` : 'transparent',  // 6% opacity
    border: isOver
      ? `1px dashed ${stageColor}4D`   // 30% opacity
      : '1px dashed transparent',
  }}
>
```

---

## 11. Keyboard Accessibility

### 11.1 Current Implementation (Preserve)

useKanbanKeyboard already provides:
- Arrow Left/Right: move between columns (skips empty)
- Arrow Up/Down: move between cards within column
- Enter: open deal detail
- Escape: return focus
- Visual focus ring on active card

This is solid. Keep the entire hook unchanged.

### 11.2 Focus Ring Styling (Light Theme)

```
Focus ring (keyboard active):
  ring-2 ring-indigo-500/50 ring-offset-2 ring-offset-[#FAFAFA]
  border-color: #6366F1 at 40%
```

On light backgrounds, the indigo focus ring needs to be visible against white cards
AND the light page background. Use `ring-offset` matching the page bg so the ring
floats cleanly around the card.

### 11.3 Screen Reader Announcements

Add `aria-live="polite"` region to announce stage changes after drag-and-drop:

```tsx
<div aria-live="polite" className="sr-only">
  {announcement}
</div>
```

Set `announcement` in onDragEnd:
```
"Moved 123 Oak Street from Analyzing to Under Contract"
```

dnd-kit has built-in `announcements` prop on DndContext for this purpose.

### 11.4 Column ARIA

Current `role="listbox"` on columns and `role="option"` on cards is correct.
The grid `role="grid"` on the board container is also correct. No changes needed
for the ARIA structure -- only color/contrast adjustments for WCAG on light bg.

---

## 12. Skeleton Loading (Light Theme)

Replace dark shimmer with light shimmer:

```tsx
// ColumnSkeleton
<div className="rounded-[10px] border border-gray-200 bg-white p-4 space-y-3">
  <div className="h-3 w-3/4 rounded bg-gray-100 overflow-hidden relative">
    <div className="shimmer-light absolute inset-0" />
  </div>
  {/* ... */}
</div>

// Shimmer keyframe
@keyframes shimmer-light {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
.shimmer-light {
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(0,0,0,0.04) 50%,
    transparent 100%
  );
  animation: shimmer-light 1.5s infinite;
}
```

---

## 13. Context Menu (Light Theme)

The DealCard dropdown menu needs a light-theme pass:

```
Container:      bg-white border border-gray-200 rounded-lg shadow-lg
                shadow: 0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)
Item text:      text-gray-600 text-[12px]
Item hover:     bg-gray-50 (not gray-100 -- keep it subtle)
Close Deal:     hover:text-emerald-600
Move to...:     hover:text-indigo-600
Remove:         hover:text-red-600
Separator:      border-t border-gray-100
```

---

## RECOMMENDATIONS FOR PARCEL

1. **Do not refactor component structure.** The existing decomposition (Pipeline.tsx,
   KanbanColumn, DealCard, MobilePipeline, useKanbanKeyboard, constants.ts) is clean
   and well-separated. A light-theme migration is a styling pass, not an architecture
   change.

2. **Use CSS custom properties for theming.** Instead of replacing every hardcoded hex,
   define light-theme variables in `index.css` (e.g. `--card-bg`, `--card-border`,
   `--text-primary`, `--page-bg`) and reference them via Tailwind's theme config or
   inline. This makes future dark/light toggle trivial.

3. **Recalibrate strategy badge colors first.** The current dark-bg/light-text badges
   will look wrong on white cards. Swap to the light-tinted palette in Section 4.3.
   Update `STRATEGY_COLORS` in `constants.ts` to accept a `light` variant.

4. **Add total value to column headers.** Sum `asking_price` per stage and display it
   next to the count badge. This is high-value information that costs nothing to compute
   and makes the board scannable for dollar exposure per stage.

5. **Add risk indicators (days-in-stage thresholds).** The data already exists on
   `PipelineCard.days_in_stage`. Adding a colored dot at 14d/30d thresholds is a
   one-line conditional in DealCard. No backend changes needed.

6. **Implement per-column scroll with thin scrollbar.** The current board scrolls
   horizontally but columns extend indefinitely downward. Cap column height at
   `calc(100vh - 200px)` with overflow-y auto and styled scrollbar.

7. **Upgrade DragOverlay drop animation.** Change from 160ms `ease-out` to 180ms
   `cubic-bezier(0.25, 0.1, 0.25, 1.0)` for a smoother deceleration curve. Add
   `rotate(1.5deg)` and elevated shadow to the overlay card.

8. **Style the ghost card.** When a card is being dragged, its source position should
   show a dashed-border placeholder instead of just reduced opacity. This communicates
   "slot reserved" more clearly than a faded card.

9. **Add screen reader announcements for drag outcomes.** Use dnd-kit's built-in
   `announcements` prop on `DndContext` to announce stage changes. This is a WCAG
   requirement for drag-and-drop interfaces.

10. **Keep tabbed mobile pattern.** Horizontal-scroll columns are too narrow for deal
    cards on mobile. The current tabbed approach is correct. Adapt colors to light
    theme per Section 9.2 and consider swipe gestures as a future enhancement.

11. **Add a filter bar.** Strategy and aging/risk filters above the board. Use
    multi-select dropdowns with removable chips. Filter state can live in URL
    search params for shareability.

12. **Page background: `#FAFAFA`, not pure white.** A warm off-white reduces eye
    strain and gives white cards the subtle contrast they need to read as distinct
    surfaces. This is consistent with Linear, Notion, and other light-theme
    productivity tools.
