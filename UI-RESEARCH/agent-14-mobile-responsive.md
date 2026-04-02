# Agent 14 — Mobile & Responsive Design Research for Parcel

## Context

Parcel is a real estate deal analysis SaaS. Users are investors aged 32-45 who frequently access the platform from properties in the field — standing at a rehab site checking deal numbers, reviewing comps from a car, or chatting with the AI specialist between showings. Mobile is not a secondary concern; it is the primary field-use context.

Stack: React 18 + Tailwind CSS v3 + Framer Motion v11 + shadcn/ui.

---

## 1. Tailwind Responsive Breakpoints

Tailwind's default breakpoints and how they map to Parcel's device targets:

| Prefix | Min-width | Device context |
|--------|-----------|----------------|
| (none) | 0px       | Small phones (iPhone SE, older Android) |
| `sm:`  | 640px     | Large phones (iPhone 15 Pro, Pixel 8) |
| `md:`  | 768px     | Tablets, small laptops |
| `lg:`  | 1024px    | Laptops, desktops |
| `xl:`  | 1280px    | Large desktops, ultra-wide |

**Current usage in Parcel:** The `md:` breakpoint (768px) is the primary toggle between mobile and desktop layouts. The sidebar uses `hidden md:flex` / `md:hidden` to swap between the Sheet drawer and the permanent sidebar. This is correct — 768px cleanly separates phones from tablets/laptops.

**Recommendation:** Keep `md:` as the primary layout breakpoint. Use `sm:` for minor adjustments within mobile (e.g., 1-col to 2-col grid on larger phones). Use `lg:` for expanding content grids (e.g., KPI cards from 2-col to 4-col). Avoid relying on `xl:` for essential layout shifts.

---

## 2. Navigation: Sidebar to Bottom Tab Bar

### Current State
Parcel uses a `Sheet` drawer (hamburger menu) on mobile. This requires two taps to navigate — one to open, one to select. For a field-use app, this adds friction.

### Recommendation: Persistent Bottom Tab Bar
Replace the hamburger drawer with a fixed bottom tab bar on screens below `md:`. Show the 5 most-used destinations:

```
Dashboard | Pipeline | Analyzer | Chat | More
```

The "More" tab opens a half-sheet with remaining items (Documents, Portfolio, Settings, Compare).

**Tailwind pattern:**

```tsx
{/* Bottom tab bar — visible below md */}
<nav className="fixed bottom-0 inset-x-0 z-50 md:hidden
  bg-app-bg/95 backdrop-blur-md border-t border-border-subtle
  flex items-center justify-around
  h-16 pb-[env(safe-area-inset-bottom)]">
  {tabs.map(tab => (
    <Link
      to={tab.path}
      className="flex flex-col items-center justify-center gap-0.5
        min-w-[64px] min-h-[44px] px-3 py-2
        text-text-muted active:text-accent-primary
        transition-colors"
    >
      <tab.icon size={20} />
      <span className="text-[10px] font-medium">{tab.label}</span>
    </Link>
  ))}
</nav>

{/* Add bottom padding to main content to prevent overlap */}
<main className="pb-20 md:pb-0">...</main>
```

Key considerations:
- `pb-[env(safe-area-inset-bottom)]` handles the iPhone home indicator bar.
- `backdrop-blur-md` with semi-transparent background keeps the bar visible over scrolling content.
- Each tab target is at least 44x44px (see Section 4).
- `active:` pseudo-class provides instant visual feedback on tap.

---

## 3. Touch Targets: 44x44px Minimum

Apple's Human Interface Guidelines and WCAG 2.2 both specify a minimum 44x44px touch target. Google's Material Design recommends 48x48dp. For a field-use app where users may be tapping with one hand while holding a clipboard, err toward 48px.

### Current Gaps in Parcel
- Mobile pipeline tabs: `min-h-[44px]` — correct.
- Hamburger menu button: `w-8 h-8` (32px) — too small.
- Command palette trigger: `px-2 py-1.5` — likely under 44px tall.
- Chat send button: `w-11 h-11` (44px) — correct.
- Table row "View" links: plain text links with no padding — hard to tap.
- Breadcrumb links: `text-xs` with minimal padding — too small for touch.

### Tailwind Pattern for Touch-Friendly Targets

```tsx
{/* Use min-h and min-w to guarantee minimum touch area */}
<button className="min-h-[44px] min-w-[44px] flex items-center justify-center
  px-3 py-2 rounded-lg
  active:bg-app-elevated/50 transition-colors">
  <Icon size={20} />
</button>

{/* For inline text links in tables, wrap with padding */}
<Link className="inline-flex items-center min-h-[44px] px-3
  text-accent-primary font-medium">
  View deal
</Link>
```

### Spacing Between Targets
Adjacent touch targets need at least 8px gap to prevent mis-taps. Tailwind's `gap-2` (8px) is the minimum; `gap-3` (12px) is preferred for button groups.

```tsx
{/* Action button row */}
<div className="flex gap-3 flex-wrap">
  <Button className="min-h-[44px]">Save</Button>
  <Button className="min-h-[44px]">Share</Button>
</div>
```

---

## 4. Mobile-First vs Desktop-First

### Recommendation: Mobile-First

Write base styles for the smallest screen, then layer on complexity with responsive prefixes. This aligns with Tailwind's default behavior (unprefixed = mobile, `md:` = tablet+, `lg:` = desktop).

**Why mobile-first for Parcel specifically:**
1. Field use is the highest-value moment — an investor standing at a property needs numbers fast.
2. Mobile-first forces you to prioritize content hierarchy. If a KPI card works at 320px, it will work anywhere.
3. Tailwind's responsive system is inherently mobile-first (`min-width` media queries).

**Pattern:**

```tsx
{/* Mobile: single column. sm: 2 columns. lg: 4 columns. */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
```

**Current state:** Parcel already follows this pattern in some places (Dashboard KPI grid uses `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`). The pattern should be applied consistently across all pages.

---

## 5. Calculator Forms on Mobile

Analyzer forms are the core product interaction. On mobile, form usability determines whether an investor finishes the analysis at the property or abandons it.

### Single-Column Layout
All form fields should stack vertically on mobile. The current implementation likely does this since fields are rendered in a loop, but verify that no side-by-side field pairs exist below `md:`.

```tsx
{/* Always single-column on mobile, optional 2-col on desktop */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {fields.map(field => (
    <div key={field.name} className="space-y-1.5">
      <Label>{field.label}</Label>
      <Input
        type="text"          {/* NOT type="number" — see below */}
        inputMode="decimal"  {/* triggers numeric keyboard */}
        pattern="[0-9]*"     {/* iOS numeric keyboard hint */}
      />
    </div>
  ))}
</div>
```

### Numeric Keyboard
For financial inputs (dollar amounts, percentages), use `inputMode="decimal"` instead of `type="number"`. This triggers the numeric keyboard on iOS/Android without the problematic increment spinners that `type="number"` adds. The `pattern="[0-9]*"` attribute further hints iOS to show the simple numeric pad.

### Input Adornments
Dollar signs and percent symbols should be inside the input (left/right adornment) rather than in the label, so users see context while typing.

```tsx
<div className="relative">
  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">$</span>
  <Input className="pl-7" inputMode="decimal" />
</div>
```

### Sticky Submit Button
On long forms (BRRRR has 10+ fields), the submit button scrolls out of view. Pin it to the bottom on mobile:

```tsx
<div className="sticky bottom-0 bg-app-bg/95 backdrop-blur-sm
  border-t border-border-subtle p-4 -mx-4 mt-6 md:relative md:border-0 md:p-0 md:m-0">
  <Button className="w-full md:w-auto min-h-[48px]">Analyze Deal</Button>
</div>
```

---

## 6. Results Page on Mobile

The results page is information-dense: 4 KPI cards, an outputs table (15-25 rows), a risk gauge, a cash flow chart, and 7+ action buttons.

### KPI Cards: Stacked or Horizontal Scroll
Currently uses `grid-cols-2 md:grid-cols-4`. This is acceptable — 2-column on mobile keeps cards visible. An alternative is a horizontally scrollable row:

```tsx
{/* Horizontal scroll KPIs on mobile, grid on desktop */}
<div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory
  md:grid md:grid-cols-4 md:overflow-visible">
  {kpis.map(kpi => (
    <div key={kpi.key} className="min-w-[160px] snap-start shrink-0 md:min-w-0">
      <KPICard {...kpi} />
    </div>
  ))}
</div>
```

### Outputs Table: Convert to Card List
The "All Outputs" table has 2 narrow columns (label + value). On mobile, this actually works as-is because it is a simple key-value list. However, if column count grows, convert to stacked cards:

```tsx
{/* Mobile: stacked cards. Desktop: table rows. */}
<div className="md:hidden space-y-2">
  {entries.map(([key, value]) => (
    <div key={key} className="flex justify-between items-center
      p-3 rounded-lg bg-app-surface border border-border-subtle">
      <span className="text-sm text-text-secondary">{formatLabel(key)}</span>
      <span className="font-mono text-sm text-text-primary">{formatValue(value)}</span>
    </div>
  ))}
</div>
<div className="hidden md:block">
  <table>...</table>
</div>
```

### Action Buttons
The results page has 7 action buttons (`flex gap-2 flex-wrap`). On mobile, these wrap into 3-4 rows of small buttons. Better approach — group into primary/secondary:

```tsx
{/* Primary actions: full-width stack on mobile */}
<div className="flex flex-col gap-2 sm:flex-row sm:gap-3 sm:justify-end">
  <Button className="w-full sm:w-auto">Save Deal</Button>
  <Button className="w-full sm:w-auto">Add to Pipeline</Button>
</div>

{/* Secondary actions: collapsed into a dropdown on mobile */}
<DropdownMenu>
  <DropdownMenuTrigger className="sm:hidden">
    More Actions...
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>Share Deal</DropdownMenuItem>
    <DropdownMenuItem>Download Report</DropdownMenuItem>
    <DropdownMenuItem>Offer Letter</DropdownMenuItem>
    <DropdownMenuItem>Chat about Deal</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>

{/* On desktop, show all buttons inline */}
<div className="hidden sm:flex gap-3">
  {/* all buttons */}
</div>
```

---

## 7. Kanban Pipeline on Mobile

### Current State
Parcel already implements a dual approach: `MobilePipeline` (tabbed stage view below `md:`) and the full DnD Kanban above `md:`. This is well-executed.

### Assessment
The tabbed approach is correct for mobile. Horizontal-scrolling Kanban columns do not work well on small screens because:
- Column widths compress below usable size.
- Horizontal scroll conflicts with system back-swipe gestures on iOS.
- Drag-and-drop is unreliable on touch screens in narrow scroll containers.

### Potential Improvements
- Add swipe gesture to switch between tabs (left/right swipe changes active stage).
- Show a small count badge for each stage tab so the user sees distribution at a glance (already implemented).
- Consider a "Move to..." long-press context menu for quick stage changes (already implemented via `onMoveStage`).

---

## 8. Chat on Mobile

### Current State
Chat uses `noPadding` on AppShell and `flex flex-col h-full` to fill the viewport. Input is at the bottom with a textarea. This is close to correct.

### Full-Screen Chat Pattern
On mobile, the chat should feel like iMessage/WhatsApp — messages fill the screen, input is sticky at the bottom, keyboard push-up works correctly.

Key fixes needed:

```tsx
{/* Message area — use dvh for dynamic viewport height (accounts for mobile browser chrome) */}
<div className="flex flex-col h-[100dvh] md:h-full">
  {/* Header */}
  <div className="shrink-0 px-4 md:px-6 py-3 border-b border-border-subtle">...</div>

  {/* Messages — flex-1 with overflow */}
  <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4
    overscroll-behavior-y-contain">
    {/* messages */}
  </div>

  {/* Input — sticky bottom, respects safe area */}
  <div className="shrink-0 px-4 md:px-6 py-3
    border-t border-border-subtle bg-app-bg
    pb-[max(0.75rem,env(safe-area-inset-bottom))]">
    <div className="flex gap-2 items-end">
      <textarea className="flex-1 min-h-[44px] max-h-[120px]
        rounded-xl resize-none" />
      <button className="w-11 h-11 shrink-0">
        <Send size={16} />
      </button>
    </div>
  </div>
</div>
```

`overscroll-behavior-y-contain` prevents the "rubber band" scroll from propagating to the parent page on iOS. `100dvh` uses the dynamic viewport height that shrinks/grows as the mobile browser chrome hides/shows.

### Suggested Questions Grid
Currently `grid-cols-1 sm:grid-cols-2`. On very small screens, the 6 suggestion cards take up a lot of vertical space. Consider showing only 4 on mobile or using a horizontally scrollable row.

---

## 9. Dashboard on Mobile

### Current State
KPI row: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` — correct.
Recent Deals table: `overflow-x-auto` with `min-w-[600px]` — works but not ideal.
Pipeline Summary: `grid-cols-2 sm:grid-cols-3` — correct.

### Horizontal Scroll KPIs (Alternative)
For dashboards where KPIs are the hero content, a horizontal scroll row with snap points lets users scan KPIs quickly with one thumb swipe:

```tsx
<div className="flex gap-3 overflow-x-auto snap-x snap-mandatory
  -mx-4 px-4 pb-2 scrollbar-hide
  sm:grid sm:grid-cols-2 sm:overflow-visible sm:mx-0 sm:px-0
  lg:grid-cols-4">
  {kpis.map(kpi => (
    <div key={kpi.label} className="min-w-[200px] snap-start shrink-0
      sm:min-w-0 sm:shrink">
      <KPICard {...kpi} />
    </div>
  ))}
</div>
```

The `-mx-4 px-4` pattern creates a full-bleed scroll container that extends to screen edges while maintaining internal padding. `scrollbar-hide` (a Tailwind plugin or custom utility) hides the scrollbar for a cleaner mobile look.

### Recent Deals Table
On mobile, replace the table with a card list. Tables with horizontal scroll are a last resort — they work, but tapping specific cells is hard on a 375px screen.

```tsx
{/* Mobile: card list */}
<div className="md:hidden space-y-2">
  {deals.map(deal => (
    <Link to={`/analyze/results/${deal.id}`}
      className="block p-3 rounded-xl bg-app-surface border border-border-subtle
        active:bg-app-elevated transition-colors">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-text-primary truncate">{deal.address}</span>
        <StrategyBadge strategy={deal.strategy} />
      </div>
      <div className="flex items-center gap-4 text-xs text-text-secondary">
        <span>Risk: {deal.risk_score}</span>
        <span>{statusLabel(deal.status)}</span>
      </div>
    </Link>
  ))}
</div>

{/* Desktop: table */}
<div className="hidden md:block overflow-x-auto">
  <table>...</table>
</div>
```

---

## 10. PDF on Mobile

### Current State
`generateDealReport()` uses jsPDF to generate a multi-page PDF and triggers a download. On mobile Safari, this may open in a new tab or show a blank page before the download sheet appears.

### Mobile PDF Flow
Mobile browsers handle PDF downloads inconsistently. Best practice:

1. Show a preview/confirmation before generating (saves battery and data).
2. Generate the PDF blob.
3. On iOS Safari, use `window.open(blobUrl)` which opens the native PDF viewer with share/save options.
4. On Android Chrome, trigger a standard download via `<a download>`.

```tsx
const handleDownloadReport = async () => {
  setGeneratingPDF(true)
  try {
    const doc = generateDealReportBlob(deal) // returns jsPDF instance
    const blob = doc.output('blob')
    const url = URL.createObjectURL(blob)

    // iOS Safari: open in new tab (triggers native PDF viewer)
    // Android/Desktop: download via anchor click
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    if (isIOS) {
      window.open(url, '_blank')
    } else {
      const a = document.createElement('a')
      a.href = url
      a.download = `parcel-report-${deal.address}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    }
    toast.success('Report ready')
  } catch {
    toast.error('Failed to generate report')
  } finally {
    setGeneratingPDF(false)
  }
}
```

---

## 11. PWA Considerations

Parcel's field-use case is a strong candidate for a Progressive Web App. Key benefits:

### Add to Home Screen
Investors can pin Parcel to their home screen for instant access without App Store distribution. Requires a `manifest.json` with appropriate icons, theme colors, and `display: "standalone"`.

```json
{
  "name": "Parcel",
  "short_name": "Parcel",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#08080F",
  "theme_color": "#6366F1",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### Offline Support
A service worker with a cache-first strategy for static assets (JS, CSS, fonts) and a network-first strategy for API calls means the app shell loads instantly even with poor cell service at rural properties. React Query's `staleTime` and persistence plugins can serve cached deal data when offline.

### Push Notifications
Future feature: notify when a pipeline deal's status changes or when a shared deal gets viewed. Requires `Notification.requestPermission()` and a push service.

### Implementation Priority
PWA is a Phase 3+ item. For now, just adding the `manifest.json` and `<meta name="theme-color">` tag gives the "Add to Home Screen" prompt on mobile browsers with minimal effort.

---

## 12. Pull-to-Refresh and Swipe Gestures

### Pull-to-Refresh
React Query's `refetch()` maps directly to pull-to-refresh. Use a library like `react-pull-to-refresh` or implement with a simple touch-event handler:

```tsx
{/* Conceptual — wrap page content */}
<PullToRefresh onRefresh={() => queryClient.invalidateQueries({ queryKey: ['dashboard'] })}>
  <DashboardContent />
</PullToRefresh>
```

Pages that benefit: Dashboard, Pipeline, My Deals, Portfolio, Documents. Chat does not need pull-to-refresh (it streams in real-time).

### Swipe Gestures
Framer Motion's `drag` prop enables swipe interactions:

1. **Pipeline stage tabs:** Swipe left/right to change active stage (already using Framer Motion `AnimatePresence` with x-axis animation — add `drag="x"` to the panel container).

2. **Deal cards:** Swipe right to add to pipeline, swipe left to archive. Use Framer Motion's `onDragEnd` with a velocity/distance threshold:

```tsx
<motion.div
  drag="x"
  dragConstraints={{ left: 0, right: 0 }}
  onDragEnd={(_, info) => {
    if (info.offset.x > 100) handleAddToPipeline()
    if (info.offset.x < -100) handleArchive()
  }}
>
  <DealCard />
</motion.div>
```

3. **Chat:** Swipe right from left edge to go back (defer to native browser behavior; do not override).

### Haptic Feedback
On iOS Safari, `navigator.vibrate()` is not supported. Haptics on actions like drag-drop completion or successful save are only available through native app wrappers (Capacitor/React Native). Not applicable for a web PWA at this time.

---

## Parcel-Specific Responsive Patterns Summary

| Component | Mobile (<768) | Tablet (768-1023) | Desktop (1024+) |
|-----------|---------------|-------------------|-----------------|
| Navigation | Bottom tab bar | Sidebar (collapsible) | Sidebar (fixed 216px) |
| KPI cards | Horizontal scroll or 2-col grid | 2-col grid | 4-col grid |
| Data tables | Card list | Scrollable table | Full table |
| Calculator forms | Single column, sticky submit | Single column | 2-column optional |
| Pipeline | Tabbed stages (existing) | Kanban (compact columns) | Kanban (full DnD) |
| Chat | Full-screen, sticky input | Full-screen, sticky input | Panel within AppShell |
| Action buttons | Primary stack + "More" menu | Inline wrap | Inline row |
| Charts | Full-width, smaller height | Full-width | Constrained max-width |
| PDF | Generate + open in viewer | Generate + download | Generate + download |
| Modals/dialogs | Full-screen sheet (bottom) | Centered dialog | Centered dialog |

---

## RECOMMENDATIONS FOR PARCEL

1. **Add a bottom tab bar for mobile navigation.** The current hamburger drawer adds friction for field use. A persistent 5-tab bottom bar (Dashboard, Pipeline, Analyzer, Chat, More) keeps the primary workflows one tap away. Keep the Sheet drawer accessible from "More" for secondary pages.

2. **Audit all touch targets for 44px minimum.** The hamburger button (32px), command palette trigger, breadcrumb links, and table row action links are all undersized. Add `min-h-[44px] min-w-[44px]` to all interactive elements on mobile.

3. **Add `inputMode="decimal"` to all financial form inputs.** This triggers the numeric keyboard on mobile without the spinners that `type="number"` adds. Critical for the analyzer forms which are the core product interaction on mobile.

4. **Collapse ResultsPage action buttons on mobile.** Show "Save" and "Add to Pipeline" as full-width primary buttons; group the remaining 5 actions (Share, Download, Offer Letter, Chat, Delete) into a "More Actions" dropdown menu that appears only below `sm:`.

5. **Replace the Dashboard deals table with a card list on mobile.** Use `md:hidden` / `hidden md:block` pattern to show cards on mobile and the existing table on desktop. The cards should be tappable links with `active:` state for touch feedback.

6. **Use `100dvh` for the chat page height.** The current `h-full` may not account for mobile browser chrome (address bar). Switching to `h-[100dvh]` ensures the chat fills the dynamic viewport. Add `pb-[env(safe-area-inset-bottom)]` to the input area for iPhone home indicator clearance.

7. **Add snap-scroll to horizontally scrollable elements.** The mobile pipeline tabs already scroll, but adding `snap-x snap-mandatory` with `snap-start` on each tab ensures clean scroll-stop positions. Apply the same to KPI card rows if horizontal scroll is adopted.

8. **Implement a sticky submit button on long analyzer forms.** BRRRR and Creative Finance forms have 10+ fields. On mobile, the "Analyze" button scrolls out of view. Pin it to the bottom of the viewport with `sticky bottom-0` and a blurred background.

9. **Add PWA manifest for home screen installation.** A `manifest.json` with Parcel's brand colors (`#08080F` background, `#6366F1` theme) and icons enables "Add to Home Screen" on iOS/Android. This is minimal effort with high impact for return-visit rate.

10. **Handle PDF downloads per-platform.** On iOS Safari, use `window.open(blobUrl)` to trigger the native PDF viewer. On Android/desktop, use the standard anchor download pattern. This prevents the blank-tab issue that iOS Safari has with forced downloads.

11. **Consider pull-to-refresh on data-heavy pages.** Dashboard, Pipeline, My Deals, and Portfolio are stale-data-sensitive. Connecting React Query's `invalidateQueries` to a pull-to-refresh gesture gives mobile users a natural way to refresh without hunting for a button.

12. **Maintain the mobile-first CSS authoring pattern.** The codebase already uses this in some places (KPI grid, hint cards). Enforce it consistently: base styles are mobile, `sm:` adjusts for larger phones, `md:` switches to desktop layout, `lg:` expands grids. Never write desktop-first styles that require overriding at smaller breakpoints.
