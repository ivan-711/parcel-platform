# Pipeline Kanban Board — Light Theme Design Spec

Implementation-ready spec for the Pipeline page light-theme migration. Covers board layout, card anatomy, drag-and-drop feedback, column overflow, toolbar, empty states, mobile, and paywall. Every value is exact.

References:
- Research: `UI-RESEARCH/agent-10-pipeline.md` (pipeline Kanban)
- Research: `UI-RESEARCH/agent-15-animations.md` (Framer Motion)
- Tokens: `UI-DESIGN/agent-01-design-tokens.md`
- Existing code: `frontend/src/pages/Pipeline.tsx`, `components/pipeline/*`

**Existing files** (style pass only, no architecture change):

| Component        | File                                              |
|------------------|---------------------------------------------------|
| Pipeline page    | `pages/Pipeline.tsx`                              |
| KanbanColumn     | `components/pipeline/kanban-column.tsx`            |
| DealCard         | `components/pipeline/deal-card.tsx`                |
| MobilePipeline   | `components/pipeline/mobile-pipeline.tsx`          |
| ColumnSkeleton   | `components/pipeline/column-skeleton.tsx`          |
| PipelineEmpty    | `components/pipeline/pipeline-empty.tsx`           |
| Constants        | `components/pipeline/constants.ts`                 |

---

## 1. Board Layout

The board is a horizontally scrolling row of fixed-width columns on a warm off-white page. No column containers -- cards sit directly on the page background. Linear-style spatial separation only.

### 1.1 Page Background

```
Background:          bg-page (#F9FAFB / gray-50)
                     Not pure white -- gives white cards a visible edge
Min height:          calc(100vh - 64px) (below topbar)
```

### 1.2 Horizontal Scroll Container

```tsx
// Pipeline.tsx — the board wrapper
<div
  className="pipeline-board flex gap-5 overflow-x-auto pb-6 px-1
             min-h-[calc(100vh-180px)]"
  role="grid"
  aria-label="Pipeline Kanban board. Use arrow keys to navigate
              between columns and cards, Enter to open a deal,
              Escape to go back."
>
```

Key values:

```
Column width:        min-w-[280px] max-w-[280px]    (up from current 240px)
Column gap:          20px (gap-5)                    (up from current gap-4)
Board padding:       inherit from PageContent (24px horizontal)
```

### 1.3 Board Scrollbar

```css
.pipeline-board::-webkit-scrollbar { height: 6px; }
.pipeline-board::-webkit-scrollbar-track { background: transparent; }
.pipeline-board::-webkit-scrollbar-thumb {
  background: #D0D5DD;       /* gray-300 */
  border-radius: 3px;
}
.pipeline-board::-webkit-scrollbar-thumb:hover { background: #98A2B3; }

/* Firefox */
.pipeline-board {
  scrollbar-width: thin;
  scrollbar-color: #D0D5DD transparent;
}
```

### 1.4 Right Edge Fade

Horizontal scroll indicator -- fades the right edge when content overflows:

```css
.board-scroll-fade {
  mask-image: linear-gradient(
    to right,
    black 0%,
    black calc(100% - 40px),
    transparent 100%
  );
}
```

Remove the mask when the user has scrolled to the rightmost column.

---

## 2. Column

### 2.1 Column Header

```
Layout:              flex items-center gap-2 h-9 px-1 mb-3
Stage dot:           w-2 h-2 rounded-full (stage color — see 2.2)
Label:               text-[13px] font-semibold text-gray-900 tracking-[-0.01em]
                     Sentence case, NOT uppercase (Linear style, no shouting)
Count badge:         text-[12px] font-mono text-gray-500
                     bg-gray-100 rounded-md px-1.5 py-0.5
Total value:         text-[12px] font-mono text-gray-400 ml-auto
                     Format: "$1.2M" (Intl.NumberFormat compact)
                     Sum of asking_price for that column
                     Hidden when value is $0
Separator:           none (spatial gap suffices)
```

### 2.2 Stage Colors (Light-Theme Recalibration)

Update `STAGES` in `constants.ts`. Hues stay consistent; some darkened for white-bg contrast.

| Stage           | Dark Theme  | Light Theme | Notes                        |
|-----------------|-------------|-------------|------------------------------|
| Lead            | `#475569`   | `#64748B`   | Warmer slate for contrast    |
| Analyzing       | `#6366F1`   | `#6366F1`   | Unchanged -- strong on white |
| Offer Sent      | `#F59E0B`   | `#D97706`   | Darkened amber               |
| Under Contract  | `#3B82F6`   | `#3B82F6`   | Unchanged                    |
| Due Diligence   | `#8B5CF6`   | `#7C3AED`   | Deeper purple                |
| Closed          | `#10B981`   | `#059669`   | Darker emerald               |
| Dead            | `#EF4444`   | `#DC2626`   | Darker red                   |

### 2.3 Cards Area (Drop Zone)

```
Container:           flex flex-col gap-2 min-h-[100px] rounded-xl p-2
                     transition-all duration-150
Default:             bg-transparent, border 1px dashed transparent
Drag hover:          bg-[stageColor]/6  (e.g. rgba(99,102,241,0.06))
                     border: 1px dashed [stageColor]/30
```

### 2.4 Empty Column

When a column has zero cards:

```
Container:           flex flex-col items-center justify-center min-h-[100px] py-8
                     border border-dashed border-gray-200 rounded-xl
Icon:                Inbox (16px) text-gray-300
Text:                text-[12px] text-gray-400 "No deals"
```

The permanent dashed border (not just on drag-over) signals a valid drop target. Essential for drag-and-drop discoverability.

---

## 3. Deal Card

### 3.1 Card Shell

White card on the off-white page. Flat at rest, subtle lift on hover. Linear-style minimal chrome.

```
Background:          white (#FFFFFF) / bg-white
Border:              1px solid gray-200 (#EAECF0)
Border radius:       10px (rounded-[10px])
Padding:             14px 16px (py-3.5 px-4)
Shadow (rest):       none
Shadow (hover):      0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)
Border (hover):      gray-300 (#D0D5DD) — subtle darkening
Transition:          shadow 150ms ease, border-color 150ms ease
Card-to-card gap:    8px (gap-2)
```

### 3.2 Card Content Anatomy

Top-to-bottom, three rows with `space-y-2.5` (10px).

```
ROW 1: Address + Actions
  |-- Address:       text-[13px] font-medium text-gray-900 leading-snug line-clamp-2
  |-- Actions:       opacity-0 group-hover:opacity-100 (touch: always visible)
       |-- More ...  text-gray-400 hover:text-gray-600 (14px MoreHorizontal icon)
       |-- Grip      text-gray-300 hover:text-gray-400 cursor-grab (14px GripVertical)
                     hidden on mobile (no drag on touch, use "Move to..." menu)

ROW 2: Strategy Badge
  |-- Pill:          text-[10px] font-medium rounded-full px-2 py-0.5
                     Light-tinted bg + dark-saturated text (see 3.3)

ROW 3: Key Metric + Days-in-Stage + Risk Dot
  |-- Asking price:  text-[12px] font-mono font-medium text-gray-700
  |-- Days in stage: text-[11px] text-gray-400 ml-auto
  |                  Format: "12d" -- amber text at 14d, red text at 30d
  |-- Risk dot:      w-1.5 h-1.5 rounded-full ml-1
                     See 3.4 for thresholds
```

### 3.3 Strategy Badge Colors (Light Theme)

Flip from dark-bg/light-text to light-tinted-bg/dark-saturated-text. Update `STRATEGY_COLORS` in `constants.ts`.

| Strategy         | Background  | Text        | Palette basis            |
|------------------|-------------|-------------|--------------------------|
| Wholesale        | `#FEF3C7`   | `#92400E`   | warning-100 / amber-800  |
| Creative Finance | `#EDE9FE`   | `#5B21B6`   | violet-100 / violet-800  |
| BRRRR            | `#DBEAFE`   | `#1E40AF`   | blue-100 / blue-800      |
| Buy & Hold       | `#D1FAE5`   | `#065F46`   | success-100 / emerald-800|
| Flip             | `#FEE2E2`   | `#991B1B`   | red-100 / red-800        |

These use Tailwind 100-level and 800-level pairings for WCAG AA readability on white cards.

### 3.4 Risk Dot (Days-in-Stage Thresholds)

Data already exists on `PipelineCard.days_in_stage`. No backend changes needed.

```
0-13 days:           hidden (no dot) — deal is fresh
14-29 days:          amber dot (#D97706) — tooltip: "Aging -- 18d in stage"
30+ days:            red dot (#DC2626)   — tooltip: "Stale -- 42d in stage"
```

Implementation: one-line conditional in DealCard. Dot renders inline after days text, vertically centered.

---

## 4. Card Hover: Subtle Elevation + Border

Hover uses CSS transitions only (not Framer Motion -- dnd-kit owns transforms on sortable cards).

```tsx
// In DealCard, on the outer container:
className={cn(
  'group relative rounded-[10px] border bg-white',
  'py-3.5 px-4 space-y-2.5',
  'transition-all duration-150',
  isDragging
    ? 'opacity-35 border-dashed border-gray-300 bg-gray-50'
    : isFocused
      ? 'ring-2 ring-indigo-500/50 ring-offset-2 ring-offset-gray-50 border-indigo-400/40'
      : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
)}
```

Key decisions:
- No `whileHover` or `whileTap` on sortable pipeline cards. dnd-kit manages `transform` during drag; Framer Motion hover animations cause jitter.
- Hover feedback is border darkening (200 -> 300) and `shadow-sm` (`0 1px 2px rgba(0,0,0,0.05)`). Enough to feel interactive without competing with drag physics.
- Ghost card (isDragging source): opacity 0.35, dashed border, gray-50 bg. Communicates "slot reserved."

---

## 5. Drag-and-Drop Feedback

### 5.1 Pickup (DragOverlay)

When a card is picked up, the DragOverlay renders a floating copy under the cursor:

```tsx
<DragOverlay dropAnimation={{
  duration: 180,
  easing: 'cubic-bezier(0.25, 0.1, 0.25, 1.0)',
}}>
  {activeCard ? (
    <div
      className="rounded-[10px] border border-gray-300 bg-white space-y-2.5"
      style={{
        width: 280,
        padding: '14px 16px',
        cursor: 'grabbing',
        boxShadow: '0 12px 24px rgba(0,0,0,0.10), 0 4px 8px rgba(0,0,0,0.06)',
        transform: 'rotate(1.5deg) scale(1.02)',
      }}
    >
      <p className="text-[13px] font-medium text-gray-900 leading-tight line-clamp-2">
        {activeCard.address}
      </p>
      <OverlayStrategyBadge strategy={activeCard.strategy} />
      {activeCard.asking_price != null && activeCard.asking_price > 0 && (
        <span className="block text-[12px] font-mono font-medium text-gray-700">
          ${activeCard.asking_price.toLocaleString()}
        </span>
      )}
    </div>
  ) : null}
</DragOverlay>
```

### 5.2 Ghost Card (Source Position)

The card left behind in its original column:

```
Opacity:             0.35
Background:          gray-50 (#F9FAFB)
Border:              1px dashed gray-300 (#D0D5DD)
Content:             same layout, visually muted
```

This "dashed outline" ghost is more informative than a simple fade. It says "this slot is reserved."

### 5.3 Column Drop Highlight

When dragging over a target column, the drop zone activates:

```
Background:          stageColor at 6% opacity
Border:              1px dashed stageColor at 30% opacity
Border radius:       12px (rounded-xl)
Transition:          background 150ms ease, border-color 150ms ease
```

6% opacity keeps the tint subtle on the light page. The dashed border is the primary affordance.

### 5.4 Spring Drop Animation

```tsx
dropAnimation={{
  duration: 180,
  easing: 'cubic-bezier(0.25, 0.1, 0.25, 1.0)',  // smooth deceleration
}}
```

180ms ease-out, not a spring. Kanban drops should feel instant and precise, not bouncy. Matches Linear.

### 5.5 Cursor States

```
Default card:        cursor-default
Grip handle hover:   cursor-grab
Grip handle active:  cursor-grabbing
During drag:         cursor-grabbing (on DragOverlay)
Invalid drop:        cursor-not-allowed (via onDragOver validation)
```

---

## 6. dnd-kit + Framer Motion Configuration

### 6.1 Coexistence Rules

dnd-kit and Framer Motion both manipulate `transform`. They must not fight.

- **During drag**: dnd-kit owns the transform (via `useSortable`). No Framer Motion `whileHover`/`whileTap` on sortable cards.
- **At rest**: Framer Motion handles entry stagger animation only.
- **DragOverlay**: uses CSS `transform` for rotation/scale and dnd-kit's `dropAnimation` for the return. No Framer Motion on the overlay.

### 6.2 Sensor Configuration

```tsx
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: { distance: 6 },  // 6px dead zone before drag
  }),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  })
)
```

Add `KeyboardSensor` for native dnd-kit keyboard drag support alongside the custom `useKanbanKeyboard` hook. They serve different roles:
- `KeyboardSensor`: drag-by-keyboard (Space to pick up, arrows to move, Space to drop)
- `useKanbanKeyboard`: focus navigation (arrow keys, Enter to open, Escape to blur)

### 6.3 Entry Animation (Column Cards)

Stagger cards within each column on initial load. Capped at 8 items to avoid slow renders.

```tsx
// In KanbanColumn, wrapping each card:
<motion.div
  key={card.pipeline_id}
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -4 }}
  transition={{ duration: 0.18, delay: Math.min(i, 8) * 0.04 }}
>
```

### 6.4 Screen Reader Announcements

Use dnd-kit's built-in `announcements` prop on `DndContext`:

```tsx
<DndContext
  announcements={{
    onDragEnd({ active, over }) {
      if (over) {
        return `Moved ${active.data.current?.card?.address} to ${over.id}`
      }
      return 'Drag cancelled'
    }
  }}
>
```

Supplementary `aria-live="polite"` region:

```tsx
<div aria-live="polite" className="sr-only">{announcement}</div>
```

---

## 7. Column Overflow: Vertical Scroll + Gradient Fade Masks

### 7.1 Per-Column Scroll

Each column scrolls independently when cards exceed the viewport.

```
Column body:
  max-height: calc(100vh - 200px)
  overflow-y: auto
```

### 7.2 Scrollbar Styling

```css
/* WebKit (Chrome, Safari, Edge) */
.column-scroll::-webkit-scrollbar { width: 4px; }
.column-scroll::-webkit-scrollbar-track { background: transparent; }
.column-scroll::-webkit-scrollbar-thumb {
  background: #D0D5DD;          /* gray-300 */
  border-radius: 9999px;
}
.column-scroll::-webkit-scrollbar-thumb:hover { background: #98A2B3; }

/* Firefox */
.column-scroll {
  scrollbar-width: thin;
  scrollbar-color: #D0D5DD transparent;
}
```

### 7.3 Gradient Fade Masks

CSS mask at top and bottom of scrollable columns to indicate more content:

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

Only apply when the column is scrollable (content exceeds max-height). Use a ref + `ResizeObserver` to detect overflow and conditionally add the class.

---

## 8. Toolbar: Search, Filter, Sort

Position a horizontal filter bar between PageHeader and the board. Fixed position (does not scroll with the board).

### 8.1 Layout

```
Container:           flex items-center gap-3 py-3 mb-4
                     border-b border-gray-100 pb-3
Background:          transparent (inherits page bg)
```

### 8.2 Search Input

```
Input:               h-8 w-[200px] rounded-lg border border-gray-200
                     bg-white text-[13px] text-gray-900
                     placeholder:text-gray-400 pl-8
                     focus: ring-2 ring-indigo-500/30 border-indigo-300
Icon:                Search (14px) text-gray-400, positioned absolute left-2.5
Behavior:            Debounced 300ms via useDebouncedValue hook
                     Filters cards by address substring (case-insensitive)
```

### 8.3 Strategy Filter (Multi-Select Dropdown)

Uses shadcn Popover + Command pattern:

```
Trigger:             h-8 px-3 rounded-lg border border-gray-200 bg-white
                     text-[13px] text-gray-600
                     flex items-center gap-1.5
Label:               "Strategy" with ChevronDown (14px)
Active state:        Count badge "Strategy (2)" — text-indigo-600
Dropdown:            bg-white border border-gray-200 rounded-lg shadow-lg
                     max-h-[240px] overflow-y-auto
Items:               checkbox + strategy color dot + label
                     hover: bg-gray-50
```

### 8.4 Aging/Risk Toggle

Three-button segmented control:

```
Container:           flex rounded-lg border border-gray-200 bg-white overflow-hidden
Buttons:             h-8 px-3 text-[12px] font-medium
Active:              bg-gray-900 text-white
Inactive:            bg-white text-gray-600 hover:bg-gray-50
Dividers:            1px border-gray-200 between buttons
Options:             "All" | "Aging (14d+)" | "Stale (30d+)"
```

### 8.5 Active Filter Chips

When filters are applied, show removable pills below the toolbar:

```
Chip:                inline-flex items-center gap-1 px-2 py-1 rounded-full
                     bg-gray-100 text-[11px] font-medium text-gray-700
X button:            text-gray-400 hover:text-gray-600 (X icon, 12px)
Container:           flex flex-wrap gap-2 mb-3
```

### 8.6 Filter Effects

- Filtered-out cards are hidden (not grayed out).
- Column counts and total values update to reflect the filtered subset.
- If filtering empties a column, show the empty column state (Section 2.4).
- Filter state lives in URL search params for shareability (`?strategy=brrrr,flip&aging=14`).

---

## 9. Empty Pipeline: CTA Illustration

Shown when total deal count across all stages is zero. Full-page centered empty state.

```
Outer:               flex flex-col items-center justify-center
                     min-h-[calc(100vh-200px)]
Container:           flex flex-col items-center gap-4 max-w-md text-center

Icon container:      w-12 h-12 rounded-xl
                     bg-gray-50 border border-gray-200
                     flex items-center justify-center
Icon:                GitBranch (24px) text-gray-400

Title:               text-sm font-medium text-gray-900
                     "Your pipeline is empty"
Description:         text-[13px] text-gray-500 leading-relaxed
                     "Start by analyzing a deal and adding it to your
                      pipeline to track its progress."

CTA button:          inline-flex items-center gap-1.5
                     px-4 py-2 rounded-lg
                     bg-indigo-600 hover:bg-indigo-700 text-white
                     text-[13px] font-medium transition-colors
                     Plus icon (14px) + "Analyze a Deal"
```

---

## 10. Mobile: Tabbed Stage View

### 10.1 Pattern

Keep existing tabbed approach from `mobile-pipeline.tsx`. Horizontal-scroll columns are too narrow for deal cards that need address text + price + badge. Tabs are the correct tradeoff for mobile.

### 10.2 Light Theme Tab Bar

```
Active tab:          bg-indigo-600 text-white shadow-sm
Inactive tab:        bg-gray-100 text-gray-600 hover:bg-gray-200
Active count pill:   bg-white/20 text-white
Inactive count pill: bg-gray-200 text-gray-500
Stage dot (active):  white (#FFFFFF)
Stage dot (inactive): stage color
Tab sizing:          min-h-[44px] (touch target)
Tab radius:          rounded-full
Gap between tabs:    8px (gap-2)
Focus ring:          ring-2 ring-indigo-500/50 ring-offset-2 ring-offset-gray-50
```

### 10.3 Mobile Card Overrides

```
Padding:             12px 14px (slightly tighter than desktop 14px 16px)
Actions button:      always visible (opacity-100, no hover gating on touch)
Grip handle:         hidden (no drag on mobile, use "Move to..." context menu)
Min touch target:    44x44px for all interactive elements
```

### 10.4 Mobile Context Menu

```
Container:           bg-white border border-gray-200 rounded-lg shadow-lg
                     shadow: 0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)
                     py-1 z-40
Item:                flex items-center gap-2 px-3 py-2
                     text-[13px] text-gray-600 min-h-[44px]
                     hover: bg-gray-50
Close Deal:          hover:text-emerald-600
Move to...:          hover:text-indigo-600
Remove:              hover:text-red-600
Separator:           border-t border-gray-100
Stage dots:          w-2 h-2 rounded-full (stage color)
```

### 10.5 Mobile Empty State

```
Container:           flex flex-col items-center justify-center py-16 gap-3
Icon:                Inbox (28px) text-gray-300
Text:                text-sm text-gray-400
                     "No deals in {stageName}"
```

### 10.6 Tab Switch Animation

Keep existing AnimatePresence + motion.div. No changes to animation physics, only color values:

```tsx
<motion.div
  key={activeStage}
  initial={{ opacity: 0, x: 12 }}
  animate={{ opacity: 1, x: 0 }}
  exit={{ opacity: 0, x: -12 }}
  transition={{ duration: 0.2, ease: 'easeOut' }}
>
```

---

## 11. Paywall for Free Users

Free-tier users see the pipeline board in a limited state. The paywall appears as an overlay, not a redirect -- users can see the structure but cannot interact.

### 11.1 Board Blur Overlay

```
Board state:         Render 3 placeholder columns (Lead, Analyzing, Offer Sent)
                     with 2-3 skeleton cards each. Real data is NOT shown.
Blur:                backdrop-blur-[6px] on an overlay div covering the board
Overlay bg:          bg-white/60 (semi-transparent white)
Overlay:             absolute inset-0 z-30 flex items-center justify-center
                     rounded-xl
```

### 11.2 Upgrade Card (Centered on Overlay)

```
Card:                max-w-sm w-full bg-white rounded-xl
                     border border-gray-200 shadow-lg
                     p-6 space-y-4 text-center

Lock icon:           w-10 h-10 rounded-full bg-indigo-50
                     flex items-center justify-center mx-auto
                     Lock (20px) text-indigo-600

Title:               text-base font-semibold text-gray-900
                     "Unlock Deal Pipeline"

Description:         text-[13px] text-gray-500 leading-relaxed
                     "Track your deals across 7 stages from Lead to Closed.
                      Drag-and-drop, filters, and deal aging indicators."

Feature list:        text-left text-[13px] text-gray-600 space-y-2
  Each item:         flex items-center gap-2
                     Check icon (14px) text-indigo-500
                     - "7-stage Kanban board"
                     - "Drag-and-drop deal tracking"
                     - "Days-in-stage risk indicators"
                     - "Strategy and aging filters"

CTA:                 w-full py-2.5 rounded-lg
                     bg-indigo-600 hover:bg-indigo-700 text-white
                     text-[13px] font-semibold
                     "Upgrade to Pro"

Secondary link:      text-[12px] text-gray-400 hover:text-gray-600 mt-1
                     "Learn more about Pro"
```

### 11.3 Mobile Paywall

Same upgrade card, but rendered inline (no blur overlay) above a grayed-out tab bar. Tabs are visible but disabled (`opacity-50`, `pointer-events-none`).

---

## 12. Skeleton Loading (Light Theme)

### 12.1 Column Skeleton

Shown per-column while pipeline data loads:

```tsx
<div className="rounded-[10px] border border-gray-200 bg-white p-4 space-y-3">
  <div className="h-3 w-3/4 rounded bg-gray-100 overflow-hidden relative">
    <div className="shimmer-light absolute inset-0" />
  </div>
  <div className="h-2.5 w-16 rounded bg-gray-100 overflow-hidden relative">
    <div className="shimmer-light absolute inset-0" />
  </div>
  <div className="h-2.5 w-1/2 rounded bg-gray-100 overflow-hidden relative">
    <div className="shimmer-light absolute inset-0" />
  </div>
</div>
```

### 12.2 Shimmer Keyframe

Replace dark shimmer with light shimmer:

```css
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

@media (prefers-reduced-motion: reduce) {
  .shimmer-light { animation: none; }
}
```

---

## 13. Keyboard Accessibility

### 13.1 Preserve Existing

`useKanbanKeyboard` is unchanged. Arrow keys navigate columns/cards, Enter opens deal detail, Escape returns focus. No code changes needed.

### 13.2 Focus Ring (Light Theme)

```
Focused card:        ring-2 ring-indigo-500/50 ring-offset-2 ring-offset-[#F9FAFB]
                     border-color: indigo-400/40
```

`ring-offset` matches page bg (#F9FAFB) so the ring floats cleanly around the white card.

### 13.3 Column ARIA

Existing structure is correct:
- Board: `role="grid"` with descriptive `aria-label`
- Column: `role="listbox"` with `aria-label` including stage name and count
- Card: `role="option"` with `aria-selected` and `aria-label` (address, strategy, price)

No changes needed.

---

## CRITICAL DECISIONS

1. **Column width: 280px, not 240px.** The current 240px columns squeeze address text into two lines too aggressively. 280px matches Linear's board width and gives strategy badges + price enough breathing room. This is the single highest-impact layout change.

2. **No column backgrounds.** Columns are transparent -- cards sit directly on the page bg (#F9FAFB). Removing column containers eliminates visual clutter and makes the board feel lighter. The old dark `bg-[#0F0F1A]` containers disappear entirely.

3. **No Framer Motion hover on sortable cards.** dnd-kit and Framer Motion both manipulate `transform`. Using `whileHover` on sortable cards causes jitter during drag pickup. Hover feedback uses CSS-only `transition` for shadow and border-color. Entry stagger animation (Framer Motion) is still used since it runs once at mount before any drag interaction.

4. **Ghost card uses dashed border, not just opacity.** When dragging, the source card shows at 35% opacity with a dashed gray-300 border and gray-50 bg. This "reserved slot" visual is more informative than a simple fade and prevents users from thinking the card has been deleted.

5. **Drop animation: 180ms ease-out, not spring.** Kanban card drops should feel instant and precise. Spring physics add unnecessary bounce to what should be a "place it here" gesture. The cubic-bezier curve `(0.25, 0.1, 0.25, 1.0)` gives smooth deceleration without overshoot.

6. **Strategy badge colors flip to light bg / dark text.** Dark-on-dark badges (`#451A03` bg / `#FCD34D` text) would look muddy on white cards. The new palette uses Tailwind 100/800 pairings (e.g., `#FEF3C7` / `#92400E` for Wholesale) for maximum readability.

7. **Column headers: sentence case, not uppercase.** The current `uppercase tracking-[0.08em]` style reads as aggressive in a light UI. Linear, Notion, and Asana all use sentence-case column headers. Replace with `font-semibold text-gray-900 tracking-[-0.01em]`.

8. **Per-column scroll with thin scrollbar.** Columns cap at `calc(100vh - 200px)` with overflow-y auto. Prevents the entire page from extending vertically when one column has many cards. The 4px scrollbar is thin enough to not waste space.

9. **Paywall is a blur overlay, not a redirect.** Free users see the pipeline structure (skeleton columns) behind a frosted-glass overlay with an upgrade card. "See what you're missing" converts better than a blank page with an upsell.

10. **Filter bar is additive, not a redesign.** The toolbar (search + strategy filter + aging toggle) sits between the page header and the board. It does not change the board's component structure. Filter state lives in URL search params.

11. **Risk dot thresholds: 14d amber, 30d red (flat, not per-stage).** A "Lead" aging at 14d is different from "Due Diligence" aging at 14d, but per-stage thresholds require backend config. Start with flat thresholds; refine later with user feedback.

12. **Total value in column header.** Display `$1.2M` (sum of asking_price) next to the count badge. High-value information at zero backend cost -- the data already exists on each PipelineCard. Format with `Intl.NumberFormat` compact notation.
