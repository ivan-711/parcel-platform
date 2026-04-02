# Agent 18 — Unknown Unknowns: Premium Patterns for Luxury SaaS

> The details your users will never ask for but will absolutely feel.
> Research focused on Parcel's light-theme, olive-accent design system
> with React 18 + TypeScript + Tailwind + Framer Motion + dnd-kit stack.

---

## 1. Command Palette Evolution (Beyond Basic Cmd+K)

Parcel already has a solid `cmdk`-based command palette with page navigation, quick actions, and deal search. The next tier is **contextual intelligence** — making the palette aware of *where* the user is and *what* they were just doing.

### 1a. Recency-Weighted Results

Raycast and Linear both rank recent items above static pages. Store last-accessed deals in `localStorage` and show them as a "Recent" group *before* the user types anything:

```tsx
// useRecentDeals.ts — ring buffer in localStorage
const MAX_RECENT = 6
export function useRecentDeals() {
  const [recent, setRecent] = useState<DealListItem[]>(() => {
    const raw = localStorage.getItem('parcel_recent_deals')
    return raw ? JSON.parse(raw) : []
  })
  const track = (deal: DealListItem) => {
    setRecent(prev => {
      const filtered = prev.filter(d => d.id !== deal.id)
      const next = [deal, ...filtered].slice(0, MAX_RECENT)
      localStorage.setItem('parcel_recent_deals', JSON.stringify(next))
      return next
    })
  }
  return { recent, track }
}
```

When the palette opens with an empty query, render `recent` as the default group. This eliminates the cold-start problem where users see generic page links they already know.

### 1b. Contextual Quick Actions

On the Pipeline page, the palette should surface pipeline-specific verbs: "Add deal to pipeline", "Filter by stage: Analyzing", "Show stale deals". On the Results page: "Export PDF", "Compare with...", "Send offer letter". Detect `useLocation().pathname` and inject route-specific `ActionItem[]`.

### 1c. Slash-Command Grammar

Power users in Linear and Notion expect `/` syntax inside the palette. Typing `/export` narrows to export actions, `/compare` jumps to compare mode. Implementation: detect leading `/`, switch to a filtered action-only mode, and show a hint row explaining the grammar.

### 1d. Fuzzy Scoring with Visual Match Highlighting

Replace the current `includes()` filter with a library like `fuse.js` or `match-sorter`. Highlight the matched characters in result text using a `<mark>` element with your olive accent:

```css
cmdk-item mark {
  background: transparent;
  color: #4D7C0F;
  font-weight: 600;
}
```

---

## 2. Keyboard Shortcuts System

Parcel already has Cmd+K and arrow-key Kanban navigation. The next level is a **discoverable shortcut layer** that makes every major action reachable without a mouse.

### 2a. Global Shortcut Map

```
g d  → Go to Dashboard         g p  → Go to Pipeline
g a  → Go to Analyzer          g c  → Go to Chat
g m  → Go to My Deals          g s  → Go to Settings
n    → New Analysis             /    → Focus search
?    → Show shortcut reference  Esc  → Close modal/palette
```

Use a two-key "go to" grammar (press `g`, then a letter within 500ms). Implement with a tiny state machine in a `useShortcuts` hook that listens on `document` and resets after the timeout window.

### 2b. Shortcut Toast / Cheat Sheet Modal

When the user presses `?`, render a modal (not the command palette) showing all available shortcuts grouped by context. Mercury does this beautifully — a two-column grid with section headers ("Navigation", "Deals", "Pipeline") and `<kbd>` elements.

```tsx
function ShortcutReference() {
  return (
    <Dialog>
      <div className="grid grid-cols-2 gap-x-12 gap-y-1.5 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Go to Dashboard</span>
          <span className="flex gap-1">
            <kbd className="px-1.5 py-0.5 rounded border border-gray-200 bg-gray-50 text-[11px] font-mono text-gray-500">g</kbd>
            <kbd className="px-1.5 py-0.5 rounded border border-gray-200 bg-gray-50 text-[11px] font-mono text-gray-500">d</kbd>
          </span>
        </div>
        {/* ... */}
      </div>
    </Dialog>
  )
}
```

### 2c. Inline Shortcut Hints

Show the shortcut next to the action it triggers. In the sidebar, next to "New Analysis", show a ghosted `N` key hint. In the command palette footer, show context-aware hints. This trains users passively without forcing them to read documentation.

---

## 3. Contextual Right-Click Menus

The pipeline deal cards already have a three-dot menu, but native right-click context menus feel dramatically more professional. Use `@radix-ui/react-context-menu` (already compatible with your Radix-based UI library).

### 3a. Pipeline Card Context Menu

```
View Analysis          ⌘ Enter
Move to → [submenu]
Close Deal             ⌘ D
Generate Offer Letter
Copy Address
Remove from Pipeline   ⌫
```

### 3b. Deal Grid Context Menu (My Deals Page)

```
View Analysis
Add to Pipeline → [stage submenu]
Compare with...
Export as PDF
Delete Deal
```

### 3c. Implementation Pattern

```tsx
import * as ContextMenu from '@radix-ui/react-context-menu'

<ContextMenu.Root>
  <ContextMenu.Trigger asChild>
    <div className="...">{/* existing deal card */}</div>
  </ContextMenu.Trigger>
  <ContextMenu.Portal>
    <ContextMenu.Content
      className="min-w-[200px] rounded-xl border border-gray-200 bg-white p-1 shadow-lg shadow-black/8"
    >
      <ContextMenu.Item className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50 outline-none cursor-default data-[highlighted]:bg-gray-50">
        View Analysis
        <span className="ml-auto text-xs text-gray-400 font-mono">⌘↵</span>
      </ContextMenu.Item>
      <ContextMenu.Sub>
        <ContextMenu.SubTrigger className="...">Move to...</ContextMenu.SubTrigger>
        <ContextMenu.SubContent className="...">
          {STAGES.map(s => (
            <ContextMenu.Item key={s.key}>
              <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
              {s.label}
            </ContextMenu.Item>
          ))}
        </ContextMenu.SubContent>
      </ContextMenu.Sub>
      <ContextMenu.Separator className="h-px bg-gray-100 my-1" />
      <ContextMenu.Item className="... text-red-600">Delete</ContextMenu.Item>
    </ContextMenu.Content>
  </ContextMenu.Portal>
</ContextMenu.Root>
```

---

## 4. Smart Defaults and Auto-Population

### 4a. ZIP Code Intelligence

When the user enters a ZIP code in the analyzer, auto-fill market-level defaults: typical property tax rate, insurance estimate, median rent for the area. Cache this data per-ZIP in `react-query` with a long `staleTime`. Even if the data is approximate, the *feeling* of the form filling itself in is worth more than precision. Show a subtle tooltip: "Based on 78745 market data. Adjust as needed."

### 4b. Strategy Memory

Track which strategy the user picks most often. When they start a new analysis, pre-select their most-used strategy. Store counts in the auth store or a dedicated preferences store.

### 4c. Recent Values Autosuggest

For numeric fields like interest rate, down payment percentage, and rehab budget, show a small dropdown of the last 3 distinct values the user entered across all deals. This is the kind of invisible convenience that makes a tool feel like it knows you.

```tsx
function RecentValueHint({ field, recentValues }: { field: string; recentValues: number[] }) {
  if (!recentValues.length) return null
  return (
    <div className="flex gap-1.5 mt-1">
      {recentValues.map((val, i) => (
        <button
          key={i}
          type="button"
          onClick={() => setValue(field, val)}
          className="px-2 py-0.5 text-xs rounded-full border border-gray-200 text-gray-500 hover:border-lime-400 hover:text-lime-700 transition-colors"
        >
          {val}%
        </button>
      ))}
    </div>
  )
}
```

---

## 5. Ambient Status Indicators

### 5a. "Last Synced" Heartbeat

Add a subtle timestamp in the dashboard or sidebar footer: "Data synced 2m ago". Update it via `react-query`'s `dataUpdatedAt` on the dashboard query. When data is stale (>5 min), pulse the dot from gray-400 to amber-400.

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
    <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
      <span className={cn(
        "w-1.5 h-1.5 rounded-full",
        stale ? "bg-amber-400 animate-pulse" : "bg-emerald-400"
      )} />
      {ago < 1 ? 'Just now' : `${ago}m ago`}
    </div>
  )
}
```

### 5b. Skeleton-to-Content Crossfade

Replace hard content swaps with a 150ms crossfade between skeleton and real content. Framer Motion's `AnimatePresence` with `mode="wait"` makes this trivial. The current `SkeletonCard` components can be wrapped in `motion.div` with `exit={{ opacity: 0 }}`.

### 5c. Optimistic Pipeline Badges

When the user drags a deal on the Kanban board, immediately update the column counts in the header *before* the API responds. Parcel already does optimistic mutation — extend it to the column header counters so the entire board feels instant.

---

## 6. Dashboard Personalization

### 6a. Draggable Widget Grid

Let users rearrange dashboard sections (KPIs, Recent Deals, Pipeline Summary, Activity). Use `dnd-kit` (already installed) with a grid layout. Save layout order in `localStorage` under a `parcel_dashboard_layout` key. Default layout stays the same; users only customize if they want to.

### 6b. Pinned Deals

Add a "Pin" action to deal cards and the command palette. Pinned deals appear as a dedicated row at the top of the dashboard. Store pinned IDs in user preferences (backend) or `localStorage` (quick MVP). Limit to 4 pins to keep it clean.

### 6c. Favorite Strategy Filter

On the My Deals page, let users mark a strategy as their "default filter". When they navigate to My Deals, that filter is pre-applied. A tiny star icon next to the strategy filter chips handles the UI.

---

## 7. Sound Design (Optional, Tasteful)

### 7a. The Sound Palette

Premium tools like Linear, Raycast, and Things 3 use sound as a reward signal. Keep it minimal:

| Action | Sound | Duration |
|---|---|---|
| Deal saved | Soft chime (C5 major) | 200ms |
| Pipeline drag complete | Wooden "thock" | 120ms |
| Offer letter generated | Success arpeggio | 400ms |
| Error / validation fail | Low muted "bonk" | 150ms |
| Milestone reached | Glass bell | 300ms |

### 7b. Implementation

```tsx
// useSoundEffect.ts
const sounds = {
  success: '/sounds/success.mp3',
  drag: '/sounds/thock.mp3',
  error: '/sounds/bonk.mp3',
  milestone: '/sounds/bell.mp3',
} as const

export function useSoundEffect() {
  const enabled = useUserPreference('sound_enabled', true)
  const play = useCallback((key: keyof typeof sounds) => {
    if (!enabled) return
    const audio = new Audio(sounds[key])
    audio.volume = 0.3  // Never louder than 30%
    audio.play().catch(() => {})  // Ignore autoplay blocks
  }, [enabled])
  return play
}
```

Add a toggle in Settings > Notifications: "Interface sounds" with a Switch component. Default: **off**. Users who want it will find it; users who do not will never be annoyed.

---

## 8. Haptic Feedback on Mobile

### 8a. Vibration API for Drag-and-Drop

When a user begins dragging a pipeline card on mobile, fire a short haptic pulse. On drag completion (stage change), fire a success pattern.

```tsx
function haptic(pattern: 'light' | 'medium' | 'success') {
  if (!navigator.vibrate) return
  const patterns = {
    light: [10],
    medium: [20],
    success: [10, 50, 10],
  }
  navigator.vibrate(patterns[pattern])
}
```

Call `haptic('light')` in `onDragStart` and `haptic('success')` in `onDragEnd`. The `navigator.vibrate` API is supported on Chrome Android and progressive web apps. iOS Safari ignores it silently — no error handling needed.

### 8b. Button Press Feedback

For high-stakes buttons (Submit Analysis, Send Offer, Close Deal), add `haptic('medium')` to the `onClick` handler. Users making six-figure decisions want to feel the weight of their actions.

---

## 9. Data Density Toggle

### 9a. Comfortable vs. Compact Mode

Professional users with many deals want to see more data per screen. Add a two-mode toggle in the top bar or settings:

| Token | Comfortable | Compact |
|---|---|---|
| Card padding | `p-5` | `p-3` |
| Card gap | `gap-4` | `gap-2` |
| Font size (body) | `text-sm` (14px) | `text-xs` (12px) |
| Table row height | `py-3` | `py-1.5` |
| KPI card height | 120px | 88px |

### 9b. CSS Variable Approach

```css
:root {
  --density-card-padding: 1.25rem;
  --density-card-gap: 1rem;
  --density-row-height: 0.75rem;
}
:root.compact {
  --density-card-padding: 0.75rem;
  --density-card-gap: 0.5rem;
  --density-row-height: 0.375rem;
}
```

Toggle by adding/removing the `.compact` class on `<html>`. Persist in `localStorage`. The toggle itself: a small icon in the top bar — `LayoutGrid` for comfortable, `AlignJustify` for compact — using Lucide icons.

---

## 10. Multi-Deal Selection and Bulk Actions

Parcel's My Deals page already has a selection mode with checkboxes. Extend it with a **floating action bar** that appears when 2+ deals are selected:

```tsx
function BulkActionBar({ count, onCompare, onExport, onDelete, onPipeline }) {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 20, opacity: 0 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-lg shadow-black/8"
    >
      <span className="text-sm font-medium text-gray-700 tabular-nums">{count} selected</span>
      <div className="w-px h-5 bg-gray-200" />
      <button onClick={onCompare} className="text-sm text-gray-600 hover:text-lime-700">Compare</button>
      <button onClick={onExport} className="text-sm text-gray-600 hover:text-lime-700">Export PDF</button>
      <button onClick={onPipeline} className="text-sm text-gray-600 hover:text-lime-700">Add to Pipeline</button>
      <div className="w-px h-5 bg-gray-200" />
      <button onClick={onDelete} className="text-sm text-red-500 hover:text-red-700">Delete</button>
    </motion.div>
  )
}
```

Add `Shift+Click` for range selection and `Cmd+A` for select-all. These are the affordances that Bloomberg Terminal users expect.

---

## 11. Custom Accent Color

### 11a. Theme Picker in Settings

Let Pro users choose their accent color from a curated palette of 6 options (olive stays default). Update CSS variables dynamically:

```tsx
const ACCENTS = [
  { name: 'Olive',   primary: '#4D7C0F', light: '#ECFCCB' },
  { name: 'Indigo',  primary: '#4F46E5', light: '#EEF2FF' },
  { name: 'Teal',    primary: '#0D9488', light: '#CCFBF1' },
  { name: 'Amber',   primary: '#D97706', light: '#FEF3C7' },
  { name: 'Rose',    primary: '#E11D48', light: '#FFE4E6' },
  { name: 'Slate',   primary: '#475569', light: '#F1F5F9' },
]
```

Apply by setting `document.documentElement.style.setProperty('--accent-primary', color)`. This is a Pro-only perk that costs nothing to implement but makes users feel ownership.

---

## 12. Changelog / What's New

### 12a. "New" Badge System

When you ship a feature, add a dot indicator next to the relevant nav item. Track seen/unseen with a version timestamp in `localStorage`.

```tsx
function NewDot({ featureKey, releaseDate }: { featureKey: string; releaseDate: string }) {
  const seen = localStorage.getItem(`parcel_seen_${featureKey}`)
  if (seen) return null
  return (
    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-sky-500" />
  )
}
```

### 12b. In-App Changelog Drawer

A slide-out panel from the sidebar footer ("What's new") with date-grouped entries. Each entry: a title, one-sentence description, and optional screenshot. Inspired by Linear's changelog — minimal, scannable, no marketing fluff.

### 12c. First-Visit Feature Tour

When a user first encounters a new feature, show a single-step tooltip (not a multi-step wizard). Use Framer Motion to animate a highlight ring around the new element and a floating card explaining it. One click dismisses it permanently.

---

## 13. Premium Onboarding: Guided First-Deal Experience

### 13a. Progressive Checklist

After signup, show a persistent (but dismissible) checklist card on the dashboard:

```
[ ] Analyze your first deal
[ ] Add a deal to the pipeline
[ ] Try AI Chat
[ ] Upload a document
[ ] Generate an offer letter
```

Each item links to the relevant page. When completed, animate a checkmark with a spring transition. When all 5 are done, replace the card with a congratulations message and confetti (see Section 17).

### 13b. Empty State Coaching

Every empty state should feel like an invitation, not a dead end. Parcel's Dashboard empty state already does this well. Extend the pattern to Pipeline (empty columns with ghost cards showing "Drag a deal here"), Documents ("Drop a contract to get started"), and Portfolio ("Close your first deal to see returns here").

### 13c. Smart First-Run Tooltips

On the first visit to the Pipeline page, highlight the drag handle with a pulsing ring and a tooltip: "Drag deals between stages". On the Analyzer, highlight the strategy selector: "Pick a strategy to see different metrics". Use `localStorage` flags to show each tooltip only once.

---

## 14. Status Page Integration

### 14a. Subtle Health Indicator

Add a small status dot in the sidebar footer or user menu. Green = all systems operational. Amber = degraded. Red = outage. Poll a lightweight `/api/health` endpoint every 60 seconds.

```tsx
function SystemStatus() {
  const { data } = useQuery({
    queryKey: ['health'],
    queryFn: () => fetch('/api/health').then(r => r.json()),
    refetchInterval: 60_000,
    retry: 1,
  })
  const ok = data?.status === 'ok'
  return (
    <div className="flex items-center gap-1.5 px-3 py-2 text-[11px] text-gray-400">
      <span className={cn(
        "w-1.5 h-1.5 rounded-full",
        ok ? "bg-emerald-400" : "bg-amber-400 animate-pulse"
      )} />
      {ok ? 'All systems normal' : 'Degraded performance'}
    </div>
  )
}
```

When degraded, show a thin amber banner below the topbar: "Some features may be slower than usual. Status page." This is rare but when it happens, proactive communication prevents support tickets and builds trust.

---

## 15. Invite System: "Invite an Investor"

### 15a. Referral-Feel Invite Flow

In the sidebar or settings, add "Invite a colleague" with a personal invite link. The invite page shows the referrer's name: "Ivan invited you to Parcel." This creates social proof at the individual level.

### 15b. Shared Deal Links

Let users generate a read-only shareable link for a specific deal analysis. The recipient sees the results page without needing an account. At the bottom: "Want to run your own numbers? Try Parcel free." Parcel already has a ShareDealPage — extend it with a sleek branded header showing who shared it.

---

## 16. OLED Dark Mode Toggle

### 16a. Three-Mode Theme Switcher

Most SaaS offers light/dark. Offer three: Light (current default), Dark (gray-900 backgrounds), and OLED (pure #000000 backgrounds). OLED mode saves battery on mobile AMOLED screens and looks stunning.

```css
.dark {
  --app-bg: #111827;       /* gray-900 */
  --app-surface: #1F2937;  /* gray-800 */
}
.oled {
  --app-bg: #000000;
  --app-surface: #0A0A0A;
  --border-subtle: #1A1A1A;
}
```

The theme toggle in Settings becomes a three-segment control: `Light | Dark | OLED`. Store preference in `localStorage` and apply the class to `<html>`.

---

## 17. Easter Eggs and Milestone Celebrations

### 17a. Confetti on Achievements

When a user closes their first deal, hits 10 analyses, or completes onboarding, trigger a brief confetti burst. Use `canvas-confetti` (3KB gzipped):

```tsx
import confetti from 'canvas-confetti'

function celebrateMilestone() {
  confetti({
    particleCount: 80,
    spread: 60,
    origin: { y: 0.7 },
    colors: ['#4D7C0F', '#84CC16', '#0EA5E9', '#F59E0B'],
    disableForReducedMotion: true,
  })
}
```

The `disableForReducedMotion` flag respects `prefers-reduced-motion` automatically. Colors match Parcel's accent palette.

### 17b. Konami Code Easter Egg

For engaged users, hide a fun easter egg behind the Konami code (up up down down left right left right b a). Show a brief animation or a playful message: "You found it. You're clearly a power user." This costs nothing but creates word-of-mouth moments.

### 17c. Streak Counter

Track consecutive days of platform usage. After 7 days, show a subtle flame icon next to the user avatar. This is gamification done tastefully — no pop-ups, no badges page, just a quiet acknowledgment.

---

## 18. Progressive Disclosure

### 18a. Tiered Feature Revelation

New users see a simplified Analyzer form with essential fields (address, purchase price, strategy). After their 3rd analysis, reveal advanced fields (cap rate override, custom vacancy rate, rehab contingency) with a smooth expand animation and a label: "Advanced options".

### 18b. "Power User" Mode

After 20+ deals analyzed, offer to enable power user mode in settings. This unlocks:
- Compact density by default
- Keyboard shortcut hints visible everywhere
- Batch operations in the deal grid
- Advanced chart options in results (log scale, custom date ranges)

### 18c. Contextual Upsells for Free Users

When a free user hits the analysis limit, do not just show a wall. Show the result with 2 of 5 sections blurred and a gentle overlay: "Upgrade to see full risk analysis and cash flow projections." This is more persuasive than a hard gate because the user can see what they are missing.

---

## RECOMMENDATIONS FOR PARCEL

Prioritized by impact-to-effort ratio, with Parcel's current codebase and stack in mind:

1. **Command palette recency + contextual actions** (effort: small). Add a `useRecentDeals` hook and inject route-aware quick actions into the existing `CommandPalette` component. The palette is already built — this is pure logic layering. Ship in a single sprint.

2. **Keyboard shortcuts system with `?` cheat sheet** (effort: small-medium). A `useShortcuts` hook with the two-key "go to" grammar plus a modal listing all shortcuts. Dramatically increases perceived professionalism. Real estate investors who use spreadsheets daily are already keyboard-fluent.

3. **Right-click context menus on pipeline and deal cards** (effort: medium). Use `@radix-ui/react-context-menu` which is compatible with the existing Radix primitives. Wrap the pipeline `DealCard` and the My Deals `DealCard` with context menu triggers. Eliminates the need for the three-dot menu on desktop.

4. **Floating bulk action bar for multi-deal selection** (effort: small). The selection mode and checkbox UI already exist in `deal-card.tsx`. Add the floating bar at the bottom of the viewport using Framer Motion's enter/exit. Wire it to existing compare, delete, and export handlers.

5. **Data density toggle (comfortable/compact)** (effort: small). CSS variables + a class toggle on `<html>`. One icon button in the topbar. Persist in localStorage. No backend changes. Power users with 50+ deals will love this.

6. **Ambient sync indicator in sidebar footer** (effort: tiny). A `SyncIndicator` component using `react-query`'s `dataUpdatedAt`. Three lines of JSX, fits in the sidebar below the trial banner. Makes the entire app feel alive.

7. **Onboarding checklist on dashboard** (effort: medium). A persistent card with 5 progressive items. Track completion in localStorage or a backend flag. This directly improves activation rate — the single most important metric for a SaaS in early growth.

8. **Smart defaults from ZIP code** (effort: medium, requires backend). Add a `/api/market-data/{zip}` endpoint returning median rent, tax rate, and insurance estimate. Auto-fill the analyzer form. Even approximate data feels magical. Can start with a static lookup table of the top 200 metros.

9. **Changelog drawer with "new" dots** (effort: small). A JSON file of releases, a sidebar footer link, and dot indicators on nav items. Keeps users informed without email newsletters. Ship once, update the JSON with each release.

10. **Confetti on milestones + streak indicator** (effort: tiny). `canvas-confetti` is 3KB. Fire it on first closed deal and onboarding completion. The streak flame is a CSS-only indicator. These details cost almost nothing but create emotional peaks that users remember and talk about.

11. **Sound design (opt-in)** (effort: small). Five short audio files, a `useSoundEffect` hook, and a toggle in settings. Default off. The subset of users who enable it will feel a tactile connection to their workflow that no competitor offers.

12. **Custom accent color for Pro users** (effort: tiny). Six curated palettes, a picker in settings, CSS variable overrides. This is a zero-cost Pro perk that makes users feel the product is *theirs*.

13. **OLED dark mode** (effort: small). The CSS variable architecture in `index.css` already supports theming. Add a `.oled` class with pure black values. Three-segment toggle in settings. Differentiator for mobile-heavy users.

14. **Progressive disclosure and power-user mode** (effort: medium-large). Requires tracking usage counts and conditionally rendering UI tiers. Best implemented after the core premium patterns above are in place. This is the long-game play that keeps advanced users from outgrowing the product.

---

*End of research. These 18 patterns represent the layer between "good product" and "product that feels inevitable." None of them are features users would request in a survey. All of them are details users would miss if they switched to a competitor.*
