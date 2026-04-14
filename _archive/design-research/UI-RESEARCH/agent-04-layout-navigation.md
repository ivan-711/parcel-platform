# Layout & Navigation Patterns — Research for Parcel Light Theme Redesign

## Current State

Parcel uses a fixed 216px sidebar (`w-[216px]`) with a 52px topbar. Three nav groups
(Main, Tools, Account) hold 9 items. Mobile uses a Sheet drawer triggered by a
hamburger. Command palette (Cmd+K) is already wired. Content area has `p-4 md:p-6`
padding with no max-width constraint. All surfaces are dark (#08080F base, #0F0F1A
surface). The sidebar border uses `border-border-subtle` (#1A1A2E).

---

## 1. Sidebar Patterns

### Fixed (always visible)
Used by: Mercury, Notion, Figma, Vercel dashboard.
Best for apps with 6-15 nav items where users switch contexts often.
Trade-off: consumes horizontal space on every page, including full-bleed pages
like Pipeline/Kanban where width is critical.

### Collapsible (toggle open/closed)
Used by: Linear, GitHub (new nav), VS Code.
A toggle button (usually top-left, or hover-to-reveal) collapses the sidebar to
0px. The main content reflows to fill the freed space. Requires animation to
avoid layout jank.

### Mini / Rail (icons-only when collapsed)
Used by: Slack, Discord, Jira, Google Workspace.
Collapsed state shows a narrow rail (48-64px) of icon buttons. Hover or click
expands to full width. Good for power users who memorize icons.
Risk: Parcel has only 9 nav items, so a rail feels over-engineered.

### Hidden (no persistent sidebar)
Used by: Stripe (uses top tabs), some mobile-first apps.
Navigation lives in a top bar, command palette, or slide-out drawer. Maximizes
content width but adds clicks to reach secondary pages.

**Verdict for Parcel:** Fixed sidebar with a collapsible option (user-triggered,
persisted to localStorage). 9 items is the sweet spot for fixed sidebars.
Collapsible mode reclaims space for Pipeline/Kanban and Chat, which are the two
pages that benefit most from full width.

---

## 2. Mercury Sidebar Analysis

Mercury's sidebar is the gold standard for fintech/SaaS light themes:

- **Width:** ~240px, generous but not sprawling.
- **Background:** pure white (`#FFFFFF`), same as the page background. The sidebar
  is delineated only by a single 1px right border in a cool gray (`#E5E7EB` /
  Tailwind `gray-200`).
- **Logo area:** 56px height, logo + wordmark left-aligned, no background fill.
- **Nav items:** 36px row height, 12px horizontal padding, 8px border-radius.
  Icon (20px, `gray-400` idle, `gray-900` active) + label (14px/500 weight).
- **Active state:** Light indigo/blue background tint (`bg-blue-50` or similar),
  darker text (`gray-900`), bolder icon weight. No left border accent.
- **Grouping:** Minimal. No uppercase section headers. Instead, visual spacing
  (24px gap) separates groups. A thin `<hr>` divider between primary nav and
  secondary nav.
- **Hover:** Subtle gray background (`gray-50`). Transition 150ms.
- **User section:** Pinned to sidebar bottom. Avatar circle + name + chevron for
  dropdown. Separated by a top border.
- **Key lesson:** Restraint. No bold colors in the sidebar chrome. The accent
  color appears only in the active-item background tint and the primary CTA
  button elsewhere on the page.

### Tailwind Translation (light theme)
```
Sidebar container:   w-60 bg-white border-r border-gray-200
Nav item idle:       flex items-center gap-3 px-3 py-2 rounded-lg text-sm
                     text-gray-600 hover:bg-gray-50 hover:text-gray-900
                     transition-colors duration-150
Nav item active:     bg-indigo-50 text-gray-900 font-medium
Section gap:         space-y-1 (within group), mt-6 or border-t (between groups)
Logo row:            h-14 flex items-center px-4
```

---

## 3. Linear Sidebar Analysis

Linear pushes the sidebar further with power-user affordances:

- **Width:** ~240px, but collapsible to 0px via a toggle or keyboard shortcut.
- **Background:** Near-white in light mode (`#FAFAFA`), slightly differentiated
  from the main content area (`#FFFFFF`). Creates a subtle two-tone effect.
- **Collapsible groups:** "My Issues", "Favorites", "Teams" are accordion
  sections. Chevron icon toggles children. Collapsed state persists.
- **Keyboard navigation:** Arrow keys move focus between items. Enter navigates.
  The sidebar itself is a focus-managed list.
- **Command palette (Cmd+K):** Central to Linear's nav model. Users can ignore
  the sidebar entirely and navigate by keyboard. Pages, actions, issues, and
  settings are all searchable.
- **Workspace switcher:** Top of sidebar, a dropdown showing org name + avatar.
  Parcel equivalent: user/team switcher if multi-team is added later.
- **Drag-and-drop reorder:** Users can reorder sidebar items (favorites,
  custom views). Overkill for Parcel now, but a pattern to keep in mind.
- **Inline counts:** Badge counts on nav items (e.g., "Inbox 3"). Parcel could
  show Pipeline stage counts or unread chat messages.

### Key Takeaway for Parcel
Collapsible groups are useful when item count exceeds ~12. Parcel has 9, so
flat groups with spacing dividers (Mercury style) are cleaner. However, the
command palette integration is directly applicable — Parcel already has this.

---

## 4. Stripe Navigation Analysis

Stripe uses a hybrid top-tabs + sidebar model:

- **Top-level tabs:** A horizontal tab bar in the topbar (Home, Payments,
  Balances, Customers, Products, More). These represent major product areas.
- **Contextual sidebar:** Within each product area, a left sidebar shows
  sub-pages. E.g., under "Payments": Overview, All transactions, Disputes,
  Payment links, etc.
- **Breadcrumbs:** Every page shows breadcrumbs below the topbar, reflecting
  the top-tab > sub-page > detail hierarchy.
- **Width:** Sidebar is ~220px. Content area is constrained to ~960-1080px
  centered, with generous whitespace on wide screens.

### Applicability to Parcel
Parcel does not have deep enough hierarchy to justify two navigation layers.
All 9 items are peers. The Stripe model works when you have 5+ product areas
each with 4-8 sub-pages. Parcel should stay with sidebar-only.

**However, Stripe's breadcrumb pattern is directly useful.** Parcel already has
breadcrumbs on AnalyzerFormPage and ResultsPage. Standardizing breadcrumbs on
every page (even as a simple "Section > Page" trail) improves orientation.

---

## 5. Sidebar Width

| Width  | Feels           | Fits label length | Real-world usage              |
|--------|-----------------|-------------------|-------------------------------|
| 200px  | Compact/tight   | Short labels only | Vercel (old)                  |
| 216px  | Slightly narrow | Current Parcel    | Custom                        |
| 240px  | Balanced        | Most labels       | Mercury, Linear, Notion       |
| 256px  | Generous        | Long labels + badge| GitHub, Figma                |
| 280px  | Wide            | Descriptions too  | Slack (with workspace rail)   |

**Recommendation: 240px (`w-60`).** This is the industry consensus for SaaS
dashboards. It accommodates labels like "Pipeline" and "Documents" with room
for a count badge, without feeling wasteful. The 24px increase from the current
216px lets nav items breathe and aligns with the Mercury/Linear standard.

Collapsed state: **0px** (fully hidden, not a rail). A 48px rail is
disproportionate for 9 items. When collapsed, the content area takes 100% width.
A floating toggle button (top-left, 32x32px) or keyboard shortcut (Cmd+\)
re-expands the sidebar.

---

## 6. Main Content Area

### Max-width constraints
Financial data (tables, KPI grids, forms) becomes unreadable at extreme widths.
A max-width on the content wrapper prevents 2560px-wide lines of data.

| Pattern              | Width        | Used by                    |
|----------------------|--------------|----------------------------|
| No constraint        | 100%         | Parcel (current), Jira     |
| Soft max             | max-w-7xl    | Stripe, Vercel             |
| Narrow max           | max-w-5xl    | Linear (issues), Notion    |
| Full bleed (opt-in)  | 100%         | Pipeline, Chat, dashboards |

**Recommendation:** Default content wrapper at `max-w-7xl` (1280px) centered with
`mx-auto`. Opt-out with a `fullWidth` prop on AppShell for pages that need
100% (Pipeline/Kanban, Chat, Compare).

### Padding
```
Current:    p-4 md:p-6         (16px mobile, 24px desktop)
Proposed:   px-4 py-5 md:px-8 md:py-6 lg:px-10
```
Rationale: Slightly more horizontal breathing room on desktop (32-40px) while
keeping vertical padding tighter. Most SaaS apps use 24-40px horizontal padding
in the content area.

### Responsive breakpoints (Tailwind defaults)
```
sm:   640px    — phone landscape / small tablet
md:   768px    — sidebar appears, tablet portrait
lg:   1024px   — comfortable desktop, 2-col layouts
xl:   1280px   — max-w-7xl content fills naturally
2xl:  1536px   — content centered with margins
```

The `md:768px` breakpoint is correct for sidebar show/hide. Below 768px, the
sidebar becomes a slide-out Sheet (current behavior, keep it).

---

## 7. Page Header Patterns

Current PageHeader is minimal: title + optional subtitle + optional action slot.
For the redesign, consider a richer header that standardizes breadcrumbs and
description text.

### Proposed Structure
```
[ Breadcrumbs: Main > Pipeline                    ]
[ Page Title              [Action Button(s)]      ]
[ Optional description text                       ]
[ ─────────────── border-b ────────────────────── ]
```

### Tailwind Spec
```tsx
<div className="mb-6 space-y-1">
  {/* Breadcrumbs */}
  <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-gray-500">
    <Link className="hover:text-gray-700 transition-colors">Main</Link>
    <ChevronRight className="h-3.5 w-3.5" />
    <span className="text-gray-900 font-medium" aria-current="page">Pipeline</span>
  </nav>

  {/* Title row */}
  <div className="flex items-center justify-between pt-1">
    <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Pipeline</h1>
    <div className="flex items-center gap-2">
      {/* Action buttons */}
    </div>
  </div>

  {/* Optional description */}
  <p className="text-sm text-gray-500 max-w-2xl">
    Track your deals from lead to closing.
  </p>
</div>
```

Title size: `text-xl` (20px) or `text-2xl` (24px). Mercury uses 20px. Linear
uses 24px on main pages, 20px on sub-pages. **Recommend 20px** for density.

---

## 8. Content Area Backgrounds

### Options
| Surface          | Hex       | Tailwind      | Used by                |
|------------------|-----------|---------------|------------------------|
| Pure white       | #FFFFFF   | `bg-white`    | Mercury, Stripe        |
| Off-white        | #FAFAFA   | `bg-gray-50`  | Linear (sidebar only)  |
| Warm gray        | #F9FAFB   | `bg-gray-50`  | Notion, GitHub         |
| Cool gray        | #F8FAFC   | `bg-slate-50` | Vercel                 |

### Recommended Two-Tone Approach
```
Sidebar background:      bg-white      (#FFFFFF)
Main content background: bg-slate-50   (#F8FAFC)
Card / elevated surface: bg-white      (#FFFFFF)
```

This creates a visual hierarchy: sidebar is "chrome" (white), content area is
slightly recessed (slate-50), and cards/panels pop forward (white). It is the
most common pattern in modern SaaS because:

1. Cards get natural elevation without needing shadows.
2. The sidebar reads as part of the "frame" rather than a separate panel.
3. Pure white content areas feel clinical; the slight warmth of slate-50
   softens the interface.

### Border colors for light theme
```
Subtle dividers:   border-gray-200  (#E5E7EB)  — sidebar border, card borders
Default borders:   border-gray-300  (#D1D5DB)  — input borders, stronger dividers
Focus rings:       ring-indigo-500  (#6366F1)   — keep the accent consistent
```

---

## 9. Responsive Sidebar to Bottom Nav

### Mobile (< 768px / below `md`)
Current: Hamburger menu opens a Sheet drawer from the left. This works and
should be kept. Bottom nav is an alternative but adds persistent chrome that
eats into vertical space on small screens. For a data-heavy app like Parcel
where users scroll through deal tables and financial projections, maximizing
vertical space is more important than persistent nav.

**Keep the hamburger + Sheet drawer.** Do not add a bottom nav.

### Breakpoint Strategy
```
< 640px (sm):
  - Single column layouts
  - Sidebar hidden, Sheet drawer for nav
  - KPI cards stack vertically
  - Pipeline uses mobile tabbed view (already built)
  - Tables become card lists

640-767px (sm to md):
  - Two-column grids where appropriate
  - Sidebar still hidden

768-1023px (md to lg):
  - Sidebar appears (240px fixed)
  - Content area: 768 - 240 = 528px available
  - Two-column grids for KPI cards
  - Tables show in standard format

1024-1279px (lg to xl):
  - Comfortable 3-column KPI grids
  - Pipeline shows 3-4 Kanban columns comfortably
  - Content width: 1024 - 240 = 784px

1280px+ (xl):
  - Content hits max-w-7xl, begins centering
  - Full Pipeline/Chat pages still use 100% width
  - Dashboard shows full 4-column KPI grid

1536px+ (2xl):
  - Content area has visible side margins
  - Pipeline can show 5+ columns without scroll
```

---

## 10. Navigation Grouping for Parcel

Current groups: Main (4), Tools (3), Account (2). Proposed regrouping for the
light theme with a new Pricing/Billing page:

### Option A — Flat with Dividers (Mercury style)
```
[Logo: Parcel]
─────────────
Dashboard
Pipeline
My Deals
Compare
─────────────
Analyzer
AI Chat
Documents
─────────────
Portfolio
Settings
Billing           ← NEW
```
Three visual sections separated by `<hr>` dividers (1px `border-gray-200`).
No uppercase group labels. Cleaner, more minimal.

### Option B — Labeled Groups (current pattern, refined)
```
[Logo: Parcel]

OVERVIEW
  Dashboard
  Pipeline

DEALS
  My Deals
  Analyzer
  Compare

TOOLS
  AI Chat
  Documents

ACCOUNT
  Portfolio
  Settings
  Billing           ← NEW
```
Uppercase 10px labels in `text-gray-400` with `tracking-[0.08em]`.

### Recommendation: Option A
With 10 items, labeled groups add visual noise without aiding scanability.
Mercury proves that spacing alone is sufficient for groups of 3-5 items.
The labels ("Main", "Tools", "Account") do not carry enough meaning — users
scan by icon and label, not by group heading.

If item count grows to 14+, switch to Option B or Linear-style collapsible
groups.

---

## 11. Command Palette Integration

Parcel's command palette is already well-built (cmdk + Framer Motion, search
across pages and deals). For the light theme redesign, update the visual tokens:

### Light Theme Palette Styles
```
Overlay:           bg-black/40 backdrop-blur-sm   (slightly lighter than current bg-black/60)
Dialog:            bg-white border border-gray-200 shadow-xl
Input area:        border-b border-gray-100, placeholder text-gray-400
Group heading:     text-gray-400 text-[11px] uppercase tracking-wide
Item idle:         text-gray-700
Item selected:     bg-indigo-50 text-gray-900 border-l-2 border-l-indigo-500
Item icon:         text-indigo-500 (accent)
Footer:            border-t border-gray-100, kbd bg-gray-100 text-gray-500
```

### Enhancements to Consider
- **Recent pages:** Show last 3 visited pages as a "Recent" group above
  "Pages" when the search input is empty.
- **Keyboard shortcut hints:** Show shortcuts next to items (e.g., "Pipeline"
  with a "G then P" shortcut if Vim-style nav is added).
- **Billing shortcut:** Add "Billing" to the PAGES array.

---

## RECOMMENDATIONS FOR PARCEL

### Sidebar
1. Increase width from 216px to **240px** (`w-60`).
2. Add a collapsible mode (0px, toggled via button or Cmd+\, persisted to
   localStorage). The collapsed state fully hides the sidebar; no icon rail.
3. Switch to **flat grouping with dividers** (no uppercase group labels).
   Three sections separated by 1px `border-gray-200` lines.
4. Add **Billing** as the last item in the account section.
5. Active state: `bg-indigo-50 text-gray-900 font-medium` (no left border
   accent — cleaner in light theme).
6. Hover state: `bg-gray-50 text-gray-700` with `duration-150` transition.
7. Sidebar background: `bg-white`, delineated by `border-r border-gray-200`.

### Topbar
8. Keep at 52px height (`h-[52px]`). This matches Mercury and is the tightest
   reasonable height that fits a search pill + avatar.
9. Background: `bg-white border-b border-gray-200`.
10. Page title: keep `text-sm font-semibold`, change color to `text-gray-900`.
11. Search pill: `border-gray-200 bg-gray-50 text-gray-500` with the existing
    Cmd+K shortcut badge.

### Content Area
12. Default wrapper: `max-w-7xl mx-auto` on standard pages.
13. Full-width opt-out via `fullWidth` prop for Pipeline, Chat, Compare.
14. Padding: `px-4 py-5 md:px-8 md:py-6 lg:px-10 lg:py-6`.
15. Background: `bg-slate-50` for the content area. Cards render as `bg-white`
    with `border border-gray-200 rounded-xl` (or `rounded-lg`).

### Page Headers
16. Standardize breadcrumbs on every page (already present on Analyzer/Results,
    extend to Dashboard, Pipeline, MyDeals, Portfolio, Settings, Billing).
17. Use the proposed header structure: breadcrumbs, then title row with actions,
    then optional description.
18. Title: `text-xl font-semibold text-gray-900 tracking-tight` (20px).

### Responsive
19. Keep the `md:768px` breakpoint for sidebar visibility.
20. Keep the hamburger + Sheet drawer for mobile nav. Do not add a bottom tab
    bar.
21. Apply the breakpoint strategy from Section 9 for grid and table layouts.

### Command Palette
22. Update tokens to light theme (see Section 11).
23. Add "Billing" to the PAGES array in command-palette.tsx.
24. Consider adding a "Recent" group for empty-state queries.

### CSS Variables (index.css) — Light Theme Values
```css
:root {
  --background: 0 0% 100%;           /* #FFFFFF */
  --foreground: 220 9% 12%;          /* ~#1E2025 */
  --card: 0 0% 100%;                 /* #FFFFFF */
  --card-foreground: 220 9% 12%;
  --popover: 0 0% 100%;
  --popover-foreground: 220 9% 12%;
  --primary: 239 84% 67%;            /* #6366F1 — keep indigo */
  --primary-foreground: 0 0% 100%;
  --secondary: 220 14% 96%;          /* #F4F5F7 */
  --secondary-foreground: 220 9% 12%;
  --muted: 220 14% 96%;
  --muted-foreground: 220 9% 46%;    /* #6B7280 */
  --accent: 226 100% 97%;            /* #EEF2FF — indigo-50 */
  --accent-foreground: 220 9% 12%;
  --destructive: 0 84% 60%;          /* #EF4444 */
  --destructive-foreground: 0 0% 100%;
  --border: 220 13% 91%;             /* #E5E7EB — gray-200 */
  --input: 220 13% 91%;
  --ring: 239 84% 67%;               /* #6366F1 */
  --radius: 0.5rem;
}
```

### Tailwind Config — Light Theme Color Tokens
```js
colors: {
  'app-bg':       '#F8FAFC',   // slate-50 — main content background
  'app-surface':  '#FFFFFF',   // white — cards, sidebar, topbar
  'app-elevated': '#F1F5F9',   // slate-100 — hover states, kbd backgrounds
  'app-overlay':  '#E2E8F0',   // slate-200 — dropdowns, tooltips

  'border-subtle':  '#E5E7EB', // gray-200
  'border-default': '#D1D5DB', // gray-300
  'border-strong':  '#9CA3AF', // gray-400

  'accent-primary':   '#6366F1', // indigo-500 — unchanged
  'accent-hover':     '#4F46E5', // indigo-600
  'accent-secondary': '#8B5CF6', // violet-500
  'accent-success':   '#10B981', // emerald-500
  'accent-warning':   '#F59E0B', // amber-500
  'accent-danger':    '#EF4444', // red-500
  'accent-info':      '#3B82F6', // blue-500

  'text-primary':   '#111827', // gray-900
  'text-secondary': '#6B7280', // gray-500
  'text-muted':     '#9CA3AF', // gray-400
  'text-disabled':  '#D1D5DB', // gray-300
}
```

### Implementation Priority
1. **Sidebar width + grouping** — smallest diff, biggest visual impact.
2. **Color tokens** — swap dark palette to light in tailwind.config.js and
   index.css. All components referencing semantic tokens update automatically.
3. **Content area max-width + padding** — wrap content in a constrained
   container on standard pages.
4. **Page headers with breadcrumbs** — standardize across all pages.
5. **Command palette light tokens** — update the overlay and dialog styles.
6. **Collapsible sidebar** — add toggle button, localStorage persistence,
   Framer Motion expand/collapse animation.
