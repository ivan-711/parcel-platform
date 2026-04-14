# Agent 18 -- Premium Extras & Unknown Unknowns

> Design spec for the UX layer between "dark theme" and "product that feels inevitable."
> Builds on Parcel's existing cmdk palette, deal cards, and dnd-kit pipeline.
> All tokens reference the luxury dark system from `agent-01-design-tokens.md`.
> Date: 2026-03-31

---

## 1. Command Palette Enhancement

The palette already works (cmdk, Framer Motion, deal search). These upgrades make it feel like Raycast.

### 1a. Recency-Weighted Default Results

When the palette opens with an empty query, show a "Recent" group before Pages and Quick Actions. Populated from a `useRecentDeals` hook backed by a localStorage ring buffer (max 6 items). Track on every deal-detail navigation.

```tsx
// Hook shape -- ring buffer in localStorage
const STORAGE_KEY = 'parcel_recent_deals'
const MAX_RECENT = 6

export function useRecentDeals() {
  const [recent, setRecent] = useState<DealListItem[]>(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  })
  const track = useCallback((deal: DealListItem) => {
    setRecent(prev => {
      const filtered = prev.filter(d => d.id !== deal.id)
      const next = [deal, ...filtered].slice(0, MAX_RECENT)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])
  return { recent, track }
}
```

**Palette integration:** Add a `<CommandPrimitive.Group heading="Recent">` as the first group, rendered only when `search === '' && recent.length > 0`. Each item uses a `Clock` icon from Lucide in `--luxury-gray-9` instead of `MapPin`.

### 1b. Contextual Actions by Route

Detect `useLocation().pathname` and inject page-specific actions into the Quick Actions group. The palette becomes aware of where you are.

| Route Pattern        | Injected Actions                                          |
|----------------------|-----------------------------------------------------------|
| `/pipeline`          | Add deal to pipeline, Filter by stage, Show stale deals   |
| `/analyze/results/*` | Export PDF, Compare with..., Send offer letter             |
| `/deals`             | Toggle selection mode, Sort by date, Filter by strategy   |
| `/dashboard`         | Refresh data, Export summary                               |
| `/documents`         | Upload document, Filter by type                            |

Implementation: a `getContextualActions(pathname: string): ActionItem[]` function. Switch on pathname prefix, return an array. Merge into QUICK_ACTIONS at render time. Mark contextual items with a subtle `(this page)` suffix in `--luxury-gray-9`.

### 1c. Dark Glass Styling

Replace the current light palette styling with the luxury dark system.

```
Container:
  bg: --luxury-gray-2 (#1A1916)
  border: 1px solid --luxury-gray-6 (#3A3835)
  shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5)
  backdrop-filter: blur(16px) saturate(1.2)

Search input area:
  border-bottom: 1px solid --luxury-gray-5 (#33322C)
  Search icon: --luxury-violet-6 (#8B7AFF)
  Placeholder text: --luxury-gray-8 (#5C5A56)
  Input text: --luxury-gray-11 (#F0EDE8)

Group headings:
  color: --luxury-gray-9 (#7A7872)
  text: 11px uppercase tracking-[0.08em]

Items:
  Default text: --luxury-gray-11
  Icon color: --luxury-violet-7 (#A89FFF)
  Selected state: bg --luxury-violet-1 (#1A1726), left border 2px --luxury-violet-6
  Hover: bg --luxury-gray-3 (#22211D)

Footer:
  border-top: 1px solid --luxury-gray-5
  kbd elements: bg --luxury-gray-3, border --luxury-gray-6, text --luxury-gray-9, font-mono text-[10px]
```

Tailwind classes for the container:
```
className="w-full max-w-[540px] rounded-xl border border-[#3A3835] bg-[#1A1916]/95 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden"
```

### 1d. Keyboard Hint Footer (Enhanced)

Expand the existing footer with context-aware hints. When a deal item is selected, show `Tab` to preview. When on a page item, show the shortcut if one exists.

```
  [arrows] navigate   [enter] select   [tab] preview   [esc] close
```

Each hint uses the same `<kbd>` dark glass styling. The footer is always visible, never scrolls with the list.

**Complexity:** M (medium) -- touches existing component, adds hook + contextual logic.
**Solo founder verdict:** YES, build this. The palette is already the power-user entry point. Making it smarter costs a day and pays back every session.

---

## 2. Keyboard Shortcuts System

### 2a. Global Shortcut Map

Two-key "go to" grammar with 500ms timeout window between keys. Press `g`, then a second key within the window.

```
g d  -> Dashboard        g p  -> Pipeline
g a  -> Analyzer         g c  -> Chat
g m  -> My Deals         g s  -> Settings
g o  -> Portfolio        g u  -> Documents

n    -> New Analysis (navigate to /analyze)
/    -> Focus search (open palette)
?    -> Shortcut reference modal
Esc  -> Close any modal or palette
```

### 2b. useShortcuts Hook

A tiny state machine that listens on `document.keydown`. Ignores events when focus is inside `<input>`, `<textarea>`, or `[contenteditable]`. Stores the first key press, starts a 500ms timer for the second key. Resets on timeout or non-matching key.

```tsx
function useShortcuts(shortcuts: ShortcutMap) {
  const pending = useRef<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      if (target.isContentEditable) return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      const key = e.key.toLowerCase()
      if (pending.current) {
        const combo = `${pending.current} ${key}`
        if (shortcuts[combo]) {
          e.preventDefault()
          shortcuts[combo]()
        }
        pending.current = null
        clearTimeout(timer.current)
        return
      }
      if (shortcuts[key]) {
        e.preventDefault()
        shortcuts[key]()
        return
      }
      if (key === 'g') {
        pending.current = 'g'
        timer.current = setTimeout(() => { pending.current = null }, 500)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [shortcuts])
}
```

### 2c. Shortcut Reference Modal (? key)

A dedicated modal -- not the command palette. Two-column grid with dark glass styling.

```
Container:
  bg: --luxury-gray-2
  border: --luxury-gray-6
  max-width: 520px
  rounded-xl, p-6

Section headers:
  text: --luxury-gray-9, uppercase, 11px, tracking-wide
  margin-bottom: 8px

Rows:
  flex justify-between
  Left: action label in --luxury-gray-11, text-sm
  Right: <kbd> elements

kbd elements (dark):
  bg: --luxury-gray-3 (#22211D)
  border: 1px solid --luxury-gray-6 (#3A3835)
  color: --luxury-gray-10 (#A09D98)
  px-1.5 py-0.5 rounded text-[11px] font-mono
  gap-1 between multiple keys
```

Sections: Navigation, Deals, General. Dismissible via Esc or click outside.

### 2d. Inline Shortcut Hints

Show ghosted key hints next to actions in the sidebar and command palette:

- Sidebar "New Analysis" link: show a faint `N` key hint on the right
- Command palette items for pages: show `g d`, `g p`, etc. aligned right in `--luxury-gray-8`
- Only render hints on non-touch devices: `@media (hover: hover)`

**Complexity:** M -- new hook, new modal, scattered inline hints.
**Solo founder verdict:** YES. Keyboard-heavy users (spreadsheet investors) will feel this immediately. The `?` modal is the gateway to discoverability.

---

## 3. Contextual Right-Click Menus

### 3a. Dependency

Requires `@radix-ui/react-context-menu`. This is fully compatible with the existing Radix UI primitives in the stack.

### 3b. Pipeline Card Context Menu

Wrap the pipeline `DealCard` component's outer div with `ContextMenu.Root > ContextMenu.Trigger`.

```
Menu items:
  View Analysis          [Cmd+Enter]
  --------------------------------
  Move to ->             [submenu with stages]
    Lead
    Analyzing
    Under Contract
    Due Diligence
    Closed
  --------------------------------
  Close Deal             [Cmd+D]
  Generate Offer Letter
  Copy Address
  --------------------------------
  Remove from Pipeline   [Backspace]     (text-red / --luxury-error)
```

### 3c. My Deals Card Context Menu

Wrap the deal-grid `DealCard` component's `<Link>` or `<div>` with context menu trigger.

```
Menu items:
  View Analysis
  Add to Pipeline ->     [stage submenu]
  Compare with...
  Export as PDF
  --------------------------------
  Delete Deal            (text-red)
```

### 3d. Dark Glass Menu Styling

```
ContextMenu.Content:
  bg: --luxury-gray-2 (#1A1916)
  border: 1px solid --luxury-gray-6 (#3A3835)
  shadow: 0 10px 30px rgba(0, 0, 0, 0.4)
  rounded-xl, p-1, min-w-[200px]

ContextMenu.Item:
  px-3 py-2 text-sm rounded-lg
  text: --luxury-gray-11 (#F0EDE8)
  outline-none cursor-default
  data-[highlighted]: bg --luxury-gray-4 (#2A2924)

Shortcut hint (right-aligned):
  text: --luxury-gray-8, text-xs, font-mono

ContextMenu.Separator:
  h-px bg --luxury-gray-5 my-1

Destructive items:
  text: --luxury-error (#D4766A)
  data-[highlighted]: bg rgba(212, 118, 106, 0.10)

SubContent:
  Same styling as Content. SubTrigger has a chevron-right icon.
```

**Complexity:** M -- new dependency, wrapping two existing card components.
**Solo founder verdict:** YES, but sprint 2. It is polish, not activation. Users will not miss it if absent, but will notice once present.

---

## 4. Ambient Status Indicator

### 4a. Sync Heartbeat

A `SyncIndicator` component placed in the sidebar footer, below the trial/billing banner. Uses `react-query`'s `dataUpdatedAt` from the dashboard query.

```tsx
function SyncIndicator({ dataUpdatedAt }: { dataUpdatedAt: number }) {
  const [, forceUpdate] = useState(0)
  useEffect(() => {
    const id = setInterval(() => forceUpdate(n => n + 1), 30_000)
    return () => clearInterval(id)
  }, [])
  const ago = Math.floor((Date.now() - dataUpdatedAt) / 60_000)
  const stale = ago > 5
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-[#7A7872]">
      <span className={cn(
        "w-1.5 h-1.5 rounded-full transition-colors",
        stale ? "bg-[#D4A867] animate-pulse" : "bg-[#6DBEA3]"
      )} />
      {ago < 1 ? 'Just now' : `${ago}m ago`}
    </div>
  )
}
```

**Styling in dark theme:**
- Dot: `--luxury-success (#6DBEA3)` when fresh, `--luxury-warning (#D4A867)` with `animate-pulse` when stale
- Text: `--luxury-gray-9 (#7A7872)`, 11px
- Container: flush with sidebar bottom padding, no additional background

### 4b. Skeleton-to-Content Crossfade

Wrap skeleton/content swaps with `AnimatePresence mode="wait"`. Each state gets `motion.div` with `initial={{ opacity: 0 }}`, `animate={{ opacity: 1 }}`, `exit={{ opacity: 0 }}`, and `transition={{ duration: 0.15 }}`. This eliminates the hard pop-in that breaks the luxury feel.

**Complexity:** S (small) -- one component, one interval, plug into sidebar.
**Solo founder verdict:** YES, sprint 1. Costs 20 minutes, makes the app feel alive. The crossfade is a tasteful add but lower priority.

---

## 5. Data Density Toggle

### 5a. Two Modes: Comfortable vs Compact

A toggle in the top bar (next to the user avatar area). Two Lucide icons: `LayoutGrid` for comfortable, `AlignJustify` for compact. Tooltip on hover explains the mode.

### 5b. CSS Variable Architecture

Define density tokens at the root level. Toggle by adding `.compact` class to `<html>`.

```css
:root {
  --density-card-px: 1.25rem;   /* p-5 */
  --density-card-gap: 1rem;     /* gap-4 */
  --density-body-size: 0.875rem; /* text-sm / 14px */
  --density-row-py: 0.75rem;    /* py-3 */
  --density-kpi-h: 120px;
}

:root.compact {
  --density-card-px: 0.75rem;   /* p-3 */
  --density-card-gap: 0.5rem;   /* gap-2 */
  --density-body-size: 0.75rem; /* text-xs / 12px */
  --density-row-py: 0.375rem;   /* py-1.5 */
  --density-kpi-h: 88px;
}
```

### 5c. Component Integration

Key surfaces that consume density tokens:
- `DealCard` (deal-card.tsx): padding, font size, gap between rows
- `KPICard` (KPICard.tsx): height, internal padding
- Pipeline `kanban-column.tsx`: card gap within columns
- `deal-grid.tsx`: grid gap
- Table views (if any): row height

Use `style={{ padding: 'var(--density-card-px)' }}` or map to Tailwind arbitrary values: `p-[var(--density-card-px)]`.

### 5d. Persistence

Store in `localStorage` under `parcel_density`. On mount, read and apply class to `<html>`. The toggle handler:

```tsx
function toggleDensity() {
  const html = document.documentElement
  const isCompact = html.classList.toggle('compact')
  localStorage.setItem('parcel_density', isCompact ? 'compact' : 'comfortable')
}
```

**Complexity:** S -- CSS variables + one toggle button + localStorage.
**Solo founder verdict:** YES, sprint 2. Users with 30+ deals will immediately switch to compact. Zero backend cost.

---

## 6. Changelog / What's New

### 6a. "New" Dot Indicator

A small notification dot on sidebar nav items when a feature ships. Backed by a static JSON array of releases with a `featureKey` and `releaseDate`. Compare against localStorage `parcel_seen_{featureKey}` timestamps.

```tsx
function NewDot({ featureKey, releaseDate }: { featureKey: string; releaseDate: string }) {
  const seen = localStorage.getItem(`parcel_seen_${featureKey}`)
  if (seen && new Date(seen) >= new Date(releaseDate)) return null
  return (
    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#8B7AFF]" />
  )
}
```

Dot color: `--luxury-violet-6 (#8B7AFF)`. Position: absolute, top-right of the nav icon container. Clicking the nav item marks it as seen.

### 6b. Changelog Drawer

A slide-out panel triggered from a "What's new" link in the sidebar footer. Uses `framer-motion` for slide-in from right.

```
Drawer:
  width: 360px (desktop), full-width (mobile)
  bg: --luxury-gray-1 (#131210)
  border-left: 1px solid --luxury-gray-5

Header:
  "What's new" in --luxury-gray-11, text-lg, font-semibold
  Close (X) button top-right

Entries (date-grouped):
  Date header: --luxury-gray-9, text-xs, uppercase
  Title: --luxury-gray-11, text-sm, font-medium
  Description: --luxury-gray-10, text-sm
  Optional badge: "New" pill in --luxury-violet-6 bg with white text, rounded-full, text-[10px]
```

### 6c. Release Data Shape

```tsx
interface ChangelogEntry {
  id: string
  date: string          // ISO date
  title: string
  description: string
  featureKey: string    // matches nav item for dot indicator
  category: 'feature' | 'improvement' | 'fix'
}
```

Store in a `changelog.json` file in `frontend/src/data/`. Update manually with each deploy. No backend needed.

**Complexity:** S-M -- static data, one drawer component, dot indicators on nav items.
**Solo founder verdict:** YES, sprint 2. Keeps engaged users informed. The dot indicator alone is worth it for feature awareness without email newsletters.

---

## 7. Onboarding: Guided First-Deal Flow

### 7a. Design Philosophy

NOT a checklist. A guided spotlight flow that surfaces at the right moments. Each step is a single tooltip/overlay that appears when the user first visits a relevant page.

### 7b. Spotlight Overlay

A semi-transparent dark overlay (`bg-black/70`) with a cut-out around the target element. The cut-out uses a CSS `clip-path` or `box-shadow` inset trick.

```tsx
function SpotlightOverlay({ targetRect, content, onDismiss }: SpotlightProps) {
  return (
    <div className="fixed inset-0 z-50">
      {/* Dark overlay with cutout */}
      <div
        className="absolute inset-0"
        style={{
          background: 'rgba(12, 11, 10, 0.80)',
          maskImage: `radial-gradient(ellipse ${targetRect.width + 24}px ${targetRect.height + 24}px at ${targetRect.centerX}px ${targetRect.centerY}px, transparent 50%, black 51%)`,
          WebkitMaskImage: /* same */,
        }}
      />
      {/* Floating card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute bg-[#1A1916] border border-[#3A3835] rounded-xl p-4 shadow-xl max-w-[280px]"
        style={{ top: targetRect.bottom + 12, left: targetRect.centerX - 140 }}
      >
        <p className="text-sm text-[#F0EDE8]">{content}</p>
        <button onClick={onDismiss} className="mt-3 text-xs text-[#8B7AFF] hover:text-[#A89FFF]">
          Got it
        </button>
      </motion.div>
    </div>
  )
}
```

### 7c. Step Definitions

| Step | Page       | Target Element             | Message                                          |
|------|------------|----------------------------|--------------------------------------------------|
| 1    | /analyze   | Strategy selector          | "Pick a strategy -- we'll calculate the numbers." |
| 2    | /results/* | KPI cards row              | "Key metrics at a glance. Scroll for details."    |
| 3    | /pipeline  | First kanban column        | "Drag deals between stages to track progress."    |
| 4    | /chat      | Chat input                 | "Ask anything about your deals or RE investing."  |

Each step triggers ONLY on first visit to that page. Tracked in localStorage: `parcel_onboarding_step_{n}`. Steps are independent -- they fire whenever the user first visits that page, regardless of order.

### 7d. Pulsing Ring on Target

Before the user clicks the spotlight, add a breathing ring around the target element:

```css
@keyframes spotlight-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(139, 122, 255, 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(139, 122, 255, 0); }
}
```

Color: `--luxury-violet-6` at 40% opacity. Respects `prefers-reduced-motion: reduce` by disabling the animation.

**Complexity:** M-L -- spotlight overlay, per-page trigger logic, rect calculations.
**Solo founder verdict:** YES, but sprint 3. Focus on core product first. When activation metrics plateau, this is the lever to pull. Build it only after you have 50+ signups to measure against.

---

## 8. Easter Eggs & Milestone Celebrations

### 8a. Confetti on Milestones

Use `canvas-confetti` (3KB gzipped). Fire on these events:

| Milestone             | Trigger Location          | Particle Count | Colors                                    |
|-----------------------|---------------------------|----------------|-------------------------------------------|
| First deal analyzed   | Results page mount        | 80             | `#8B7AFF, #A89FFF, #6DBEA3, #D4A867`     |
| 10th analysis         | Results page mount        | 100            | Same palette                               |
| First deal closed     | Close-deal modal success  | 120            | Same palette                               |
| Onboarding complete   | Dashboard (all steps)     | 80             | Same palette                               |

```tsx
import confetti from 'canvas-confetti'

function celebrateMilestone(intensity: 'small' | 'medium' | 'large' = 'medium') {
  const counts = { small: 60, medium: 80, large: 120 }
  confetti({
    particleCount: counts[intensity],
    spread: 60,
    origin: { y: 0.7 },
    colors: ['#8B7AFF', '#A89FFF', '#6DBEA3', '#D4A867'],
    disableForReducedMotion: true,
  })
}
```

Colors use the luxury violet and semantic success/warning accents. The `disableForReducedMotion` flag handles accessibility automatically.

### 8b. Milestone Tracking

Track counts in localStorage: `parcel_milestone_analyses`, `parcel_milestone_closed`. Increment on relevant API success. Check thresholds after increment. Each milestone fires only once (store `parcel_milestone_celebrated_{name}`).

### 8c. Streak Indicator (Low Priority)

Track consecutive days of usage in localStorage. After 7 days, show a subtle flame icon next to the user avatar in the sidebar. No pop-up, no badge page. Just a quiet nod.

```tsx
// Flame appears at 7-day streak
{streak >= 7 && (
  <span className="text-[#D4A867] text-xs" title={`${streak}-day streak`}>
    <Flame size={12} />
  </span>
)}
```

**Complexity:** S -- canvas-confetti is plug-and-play, milestone tracking is localStorage math.
**Solo founder verdict:** YES, sprint 1 (confetti only). It costs 15 minutes and creates emotional peaks. The streak indicator is sprint 3 -- nice but not essential.

---

## 9. Priority Ranking

### Sprint 1 (NOW -- build with the dark theme)

| Feature                        | Complexity | Reason                                              |
|--------------------------------|------------|------------------------------------------------------|
| Command palette dark styling   | S          | Visual consistency -- cannot ship dark theme with light palette |
| Command palette recency        | S          | Eliminates cold-start, feels smarter immediately     |
| Ambient sync indicator         | S          | 20-minute build, makes the app feel alive            |
| Confetti on first analysis     | S          | 15-minute build, memorable emotional peak            |
| Keyboard shortcut hook (core)  | M          | Power users expect this from a professional tool     |

**Sprint 1 total estimate:** 2-3 days

### Sprint 2 (SOON -- next iteration)

| Feature                        | Complexity | Reason                                              |
|--------------------------------|------------|------------------------------------------------------|
| Contextual palette actions     | M          | Builds on sprint 1 palette work                     |
| Shortcut reference modal (?)   | S-M        | Discoverability layer for sprint 1 shortcuts         |
| Right-click context menus      | M          | Professional feel, eliminates three-dot menu hunting |
| Data density toggle            | S          | Power users with many deals will demand this         |
| Changelog drawer + new dots    | S-M        | Feature awareness without email                      |

**Sprint 2 total estimate:** 3-4 days

### Sprint 3 (LATER -- backlog)

| Feature                        | Complexity | Reason                                              |
|--------------------------------|------------|------------------------------------------------------|
| Onboarding spotlight flow      | M-L        | Needs user volume to measure. Build when activation plateaus |
| Skeleton-to-content crossfade  | S          | Polish, not activation                               |
| Streak indicator               | S          | Gamification -- test appetite with confetti first     |
| Inline shortcut hints (sidebar)| S          | Passive training, nice but not essential early        |
| Slash-command grammar in palette| M          | Power-user feature, wait for demand signal           |

**Sprint 3 total estimate:** 3-4 days

---

## CRITICAL DECISIONS

**1. Command palette: enhance, do not replace.**
The existing cmdk implementation is solid. Adding recency and contextual actions is pure logic layering on top of a working component. Do NOT rewrite the palette. Extend it.

**2. Keyboard shortcuts: two-key grammar, not modifier keys.**
The `g d` (go to dashboard) pattern is learnable and does not conflict with browser shortcuts. Avoid inventing new Cmd+Shift combos that fight the OS. The `?` key for the cheat sheet is universally understood from GitHub, Gmail, and Linear.

**3. Context menus: desktop only, three-dot stays on mobile.**
Right-click context menus are a desktop power-user pattern. On touch devices, they are frustrating. Keep the existing three-dot overflow menu for mobile. The context menu is an additive layer, not a replacement.

**4. Density toggle: CSS variables, not component variants.**
Do NOT create `DealCardCompact` and `DealCardComfortable` components. Use CSS custom properties consumed by the same components. This avoids component proliferation and keeps the toggle instant (class swap on `<html>`).

**5. Onboarding: spotlights, not checklists.**
A persistent checklist widget on the dashboard feels like homework. Contextual spotlights that appear at the moment of relevance feel like the product is helping you. Each spotlight is dismissible with one click and never returns. Respect the user's time.

**6. Confetti colors: match the luxury palette.**
The default canvas-confetti colors are garish primary hues. Override with the luxury violet + semantic accent palette (`#8B7AFF, #A89FFF, #6DBEA3, #D4A867`). The celebration should feel on-brand, not like a children's birthday party.

**7. Changelog: static JSON, not a CMS.**
For a solo founder, the overhead of a changelog CMS is not justified. A `changelog.json` file in the frontend source, updated with each deploy, is the right level of effort. If the product grows to need a CMS, migrate then.

**8. Do not ship sounds in sprint 1.**
Sound design (opt-in chimes, drag thocks) is a differentiator, but it requires sourcing or creating audio assets and adds a settings surface area. Defer to sprint 3+ or when there is user demand. The visual and interaction layer is the priority.

**9. Dark palette backdrop: blur(16px), not blur(8px).**
The command palette and context menus need a stronger blur to feel glassy against the warm dark backgrounds. 8px shows too much texture behind the overlay on the dark surfaces. 16px with `saturate(1.2)` creates the frosted glass effect that Mercury and Linear use.

---

*These are the details users will never ask for but will absolutely feel. Build sprint 1 with the dark theme. Measure engagement. Then layer sprints 2 and 3 based on signal.*
