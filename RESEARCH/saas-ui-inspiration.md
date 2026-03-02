# SaaS Dashboard UI/UX Inspiration Research

> Compiled for **Parcel Platform** -- a dark-theme real estate deal analysis SaaS
> Primary accent: Indigo `#6366F1` | Base: `#08080F` | Surface: `#0F0F1A`
> Date: 2026-03-02

---

## Table of Contents

1. [Data Tables](#1-data-tables)
2. [KPI Cards & Metrics Display](#2-kpi-cards--metrics-display)
3. [Pipeline / Kanban Boards](#3-pipeline--kanban-boards)
4. [Deal / Record Cards](#4-deal--record-cards)
5. [Chart Visualizations](#5-chart-visualizations)
6. [Empty States](#6-empty-states)
7. [Loading Skeletons](#7-loading-skeletons)
8. [Mobile-Responsive Dashboards](#8-mobile-responsive-dashboards)
9. [Navigation Patterns](#9-navigation-patterns)
10. [Micro-Interactions](#10-micro-interactions)
11. [Product-Specific Findings](#11-product-specific-findings)
12. [Actionable Recommendations for Parcel](#12-actionable-recommendations-for-parcel)

---

## 1. Data Tables

### What Makes a Great SaaS Data Table

The best data tables (Airtable, Linear, Attio) share common traits: they treat the table as a living workspace rather than a static display. Users can sort, filter, group, resize, reorder, hide columns, and perform bulk actions all without leaving the view.

### Text & Number Alignment

- **Left-align text columns** -- follows Western reading patterns for scannability
- **Right-align numeric columns** (prices, percentages, dollar amounts) -- enables decimal alignment and quick comparison
- **Match heading alignment to column content** -- reduces visual noise
- **Never center-align** data columns -- it prevents quick scanning and creates unnecessary eye movement
- **Use monospace/tabular typography for numbers** -- prevents visual size distortion (e.g., `$1,111.11` appearing smaller than `$999.99`)
  - **Parcel Application**: JetBrains Mono is already mandated for financial numbers. Ensure ALL table cells containing `$`, `%`, cap rates, and cash flow values use `font-family: 'JetBrains Mono'` with `font-variant-numeric: tabular-nums`

### Row & Column Structure

**Division Styles (ranked for dark themes):**

1. **Simple line divisions** -- 1px borders in `rgba(255, 255, 255, 0.06)` work best on dark backgrounds
2. **Card-style rows** -- subtle background differences (e.g., alternating `#0F0F1A` and `#12121F`) for row distinction
3. **Free-form** -- no separators for low-density data
4. **Avoid zebra stripes** on dark themes -- they create complexity managing disabled/hover/active states across multiple grey levels

**Row Height / Density Options:**
- Condensed: `40px` -- for power users scanning large datasets
- Regular: `48px` -- default for most views
- Relaxed: `56px` -- when rows contain multi-line content or avatars

**Column Management:**
- **Freeze columns**: leftmost column (deal name) stays sticky during horizontal scroll; rightmost for totals
- **Reorder columns**: drag handles on column headers
- **Hide/show columns**: toggle visibility via a column settings dropdown
- **Resize columns**: drag handles on column separators
- **Reset to default**: always provide this -- gives users confidence to experiment

### Sorting

- Show a small chevron next to sortable column headings
- Default sort should make sense for the data: most recent deals at top, or deals needing action
- Standard options: A-Z, Z-A, oldest-to-newest, newest-to-oldest, highest-to-lowest value
- **Never interfere with content alignment** when showing sort indicators

### Filtering

- **Airtable approach**: side filter panel that stays open alongside the table, with AND/OR logic builders
- **Linear approach**: inline filter chips above the table with quick presets
- **Power pattern**: combine both -- quick filter chips for common filters, expandable side panel for advanced AND/OR filtering
- **Parcel Application**: Filter by strategy type (wholesale, BRRRR, flip, etc.), date range, price range, cap rate range, pipeline stage

### Bulk Actions

- Show checkboxes on hover (not permanently -- saves horizontal space)
- After selection, display a **floating bottom toolbar** (sticky footer) with actions: Delete, Archive, Export, Move to Pipeline Stage, Add Tags
- Include a count of selected items: `"3 deals selected"`
- Always provide an **undo snackbar** (toast) after destructive bulk actions -- 5-second window with "Undo" button

### Inline Editing

- Show a text cursor on hover to indicate editability
- Clicking a cell enters edit mode with a focus ring in indigo (`#6366F1`)
- Confirm changes with Enter key or clicking outside (auto-save pattern)
- Show a subtle green flash on the cell after successful save
- For complex fields: open a modal or side drawer instead
- **Parcel Application**: Allow inline editing of deal names, notes, tags. Open a drawer for editing financial inputs

### Row Detail Views

Best patterns for viewing full record details (ordered by preference):

1. **Side drawer** (Linear, Attio) -- opens from the right, 400-500px wide, doesn't navigate away from the table
2. **Expandable row** -- inline expansion for quick peek at extra fields
3. **Full-screen modal** -- for complex deal analysis views with charts and calculations
4. **Tooltip preview on hover** -- for desktop "sneak peek" of key data

### Search Highlighting

When users search within a table, highlight matching text within cells. This reduces the cognitive load of "mental matching" -- the user doesn't have to scan each row to find why it matched.

### CSS Techniques for Dark Theme Tables

```css
/* Row hover with indigo tint */
.table-row:hover {
  background: rgba(99, 102, 241, 0.04);
}

/* Selected row */
.table-row.selected {
  background: rgba(99, 102, 241, 0.08);
  border-left: 2px solid #6366F1;
}

/* Column separator */
.table-header th {
  border-right: 1px solid rgba(255, 255, 255, 0.04);
}

/* Sticky header */
.table-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #0F0F1A;
  backdrop-filter: blur(8px);
}

/* Editable cell focus */
.cell-editing {
  outline: 2px solid #6366F1;
  outline-offset: -2px;
  border-radius: 4px;
}
```

### Sources

- [Pencil & Paper: Enterprise Data Tables UX Patterns](https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables)
- [Eleken: Table Design UX Guide](https://www.eleken.co/blog-posts/table-design-ux)
- [SaaSFrame: 65 SaaS Table UI Design Examples](https://www.saasframe.io/categories/table)
- [Airtable: Grid View](https://support.airtable.com/docs/airtable-grid-view)

---

## 2. KPI Cards & Metrics Display

### Anatomy of the Perfect KPI Card

Every KPI card must contain these five elements in order of visual hierarchy:

1. **Label** (metric name) -- simplified, e.g., "Cash-on-Cash Return" not "Total Cash-on-Cash Return Percentage"
2. **Value** (the primary number) -- largest font size, JetBrains Mono
3. **Delta indicator** (change from comparison period) -- arrow + percentage + color
4. **Time period** -- subtle text, e.g., "vs. last month" or "Q4 2025"
5. **Sparkline** (optional but powerful) -- tiny inline chart showing trend over time

### Typography Hierarchy

- **Value**: `32-40px`, `font-weight: 700`, JetBrains Mono, white (`#F8FAFC`)
- **Label**: `13-14px`, `font-weight: 500`, Inter/system font, muted (`#94A3B8`)
- **Delta**: `13px`, `font-weight: 600`, JetBrains Mono, semantic color (green/red)
- **Period**: `12px`, `font-weight: 400`, Inter, very muted (`#64748B`)

### Delta Indicators -- Color & Icon Strategy

**Semantic coloring:**
- Positive change: `#22C55E` (green-500) with `^` or `\u25B2` triangle
- Negative change: `#EF4444` (red-500) with `v` or `\u25BC` triangle
- Neutral/no change: `#94A3B8` (slate-400) with `--` or `\u25C6` diamond

**Important nuance for real estate**: Not all "up" numbers are good. A rising vacancy rate is bad. Color should follow the *business meaning*, not just the direction:
- Cap rate UP = contextual (good for buyers, bad for sellers)
- Cash flow UP = always green
- Vacancy rate UP = always red
- Debt service UP = always red

### Sparkline Implementation

Sparklines provide historical context without taking up space of a full chart. Best practices:

- Height: `32-40px`, no y-axis labels, no x-axis labels
- Use a gradient fill from indigo to transparent beneath the line
- Line width: `1.5-2px`
- Color: match the delta direction (green line for uptrend, red for downtrend) OR use a neutral indigo
- Animate on mount: draw from left to right over `800ms`

```css
/* Sparkline gradient fill for dark theme */
.sparkline-fill {
  fill: url(#indigo-gradient);
}
/* Gradient definition */
#indigo-gradient {
  stop-color-1: rgba(99, 102, 241, 0.3);  /* top */
  stop-color-2: rgba(99, 102, 241, 0.0);  /* bottom */
}
```

### Layout Rules

- **Left-align all content** within cards for consistent visual symmetry
- All KPI cards on a dashboard should share consistent dimensions and design language
- Use a responsive grid: 4 columns on desktop, 2 on tablet, 1 on mobile
- Cards should be uniform height -- use CSS Grid with `grid-auto-rows: 1fr`
- Maintain `16-24px` gap between cards

### Count-Up Animation

Animate the main value from 0 to the actual number on mount:
- Duration: `1.2s` with `ease-out` easing
- Use `requestAnimationFrame` for smooth 60fps
- Format numbers progressively (show decimal places only near the end)
- **Already implemented in Parcel**: `useCountUp.ts` hook exists

### Advanced Pattern: Smart Narratives

Next-gen KPI cards add a small AI-generated text footer combining quantitative data with qualitative explanation:
- "Cash flow is up 12% due to rent increases across 3 properties"
- "Cap rate compressed 0.3% following the market trend in DFW"
- **Parcel Application**: Use Claude API to generate brief contextual summaries beneath portfolio KPIs

### Responsive Behavior

"Liquid Design" approach: font size and sparkline complexity adjust based on screen real estate:
- Desktop: full sparkline, full delta with absolute + percentage values
- Tablet: sparkline becomes a simple trend arrow, delta shows percentage only
- Mobile: stack cards vertically, simplify to value + delta only

### Sources

- [Anatomy of the KPI Card](https://nastengraph.substack.com/p/anatomy-of-the-kpi-card)
- [FanRuan: KPI Card Design Examples](https://gallery.fanruan.com/kpi-card-example)
- [DataCamp: Dashboard Design Principles](https://www.datacamp.com/tutorial/dashboard-design-tutorial)
- [Dribbble: KPI Cards](https://dribbble.com/tags/kpi-cards)

---

## 3. Pipeline / Kanban Boards

### What Makes Linear & Attio Kanban Boards Exceptional

**Linear's approach:**
- Toggle between board and list with `Cmd+B`
- Group by Status (default), Priority, Project, Label, Cycle, or SLA status
- Create issues from anywhere with `C` key
- Move cards via keyboard: `Option+Shift+Up/Down` moves to top/bottom of column
- Swimlanes allow secondary grouping within kanban view
- Minimal chrome: columns are just headers with a count badge and `+` button

**Attio's approach:**
- A pipeline isn't a separate module -- it's a list switched to kanban view
- Same underlying data, different lens -- reduces cognitive overhead
- Inline attribute editing directly on kanban cards
- Drag-and-drop updates are instant, even with large deal volumes
- Attribute visibility is configurable per-view

### Drag-and-Drop Visual Feedback States

Every drag action flows through microstates, each communicating something:

1. **Idle** -- card at rest, no special styling
2. **Hover** -- cursor changes, subtle highlight or lift shadow appears
3. **Grab** -- card lifts with drop shadow, slight scale increase (`scale(1.02)`), reduced opacity on original position
4. **Move** -- ghost card follows cursor, valid drop zones highlight, invalid zones fade
5. **Drop** -- card snaps into position with a subtle bounce, confirmation feedback

**Drop Zone Indicators:**
- Valid zones: indigo highlight border (`2px dashed #6366F1`) or a glowing placeholder
- Invalid zones: faded with prohibition icon
- Between-card insertion: thin horizontal line indicator (a la Notion)

### Column Design

- Header: column name + deal count + total value (e.g., "Under Contract (5) -- $2.3M")
- `+` button at top of each column for quick deal creation
- Three-dot menu for column options: hide, rename, add automation
- Column backgrounds: slightly different shade from base (`rgba(255, 255, 255, 0.02)`)
- Column widths: `280-320px`, with horizontal scroll for overflow

### Card Design on Kanban

Keep cards information-dense but scannable:
- **Line 1**: Deal name/address (bold, truncated with ellipsis)
- **Line 2**: Strategy badge (color-coded pill) + price in JetBrains Mono
- **Line 3**: Key metric (cap rate or ARV) + days in stage
- **Line 4**: Assignee avatar + due date (if applicable)
- **Hover reveals**: quick action buttons (archive, move, open detail)

### Keyboard Navigation (Linear-inspired)

Essential shortcuts for a power-user experience:
- `C` -- create new deal in current view
- `Cmd+K` -- command palette
- `X` -- select card
- `Shift+Up/Down` -- multi-select
- `Esc` -- deselect / go back
- Arrow keys -- navigate between cards
- `Enter` -- open card detail
- `Cmd+B` -- toggle board/list view

### Accessibility

- All drag-and-drop must be operable via keyboard (Tab + Arrow keys + Space)
- Implement `aria-grabbed` and `aria-dropeffect` ARIA roles
- Include live region announcements for screen readers: "Deal moved to Under Contract"
- Touch targets on mobile: minimum `44x44px`

### Implementation Notes for Parcel

- Use **dnd-kit** (already specified in design brief)
- dnd-kit is headless and modular -- pair with Framer Motion for animation layer
- Columns represent pipeline stages: Lead, Analyzing, Negotiating, Under Contract, Closing, Closed
- Cards should show strategy-specific metrics

### Sources

- [Linear: Board Layout Docs](https://linear.app/docs/board-layout)
- [Eleken: Drag and Drop UI Examples](https://www.eleken.co/blog-posts/drag-and-drop-ui)
- [Attio: Kanban Views](https://attio.com/help/reference/managing-your-data/views/create-and-manage-kanban-views)
- [SaaS UI Workflow Patterns Gist](https://gist.github.com/mpaiva-cc/d4ef3a652872cb5a91aa529db98d62dd)
- [Marmelab: Kanban with Shadcn](https://marmelab.com/blog/2026/01/15/building-a-kanban-board-with-shadcn.html)

---

## 4. Deal / Record Cards

### Information Density Strategy

The best deal cards (Attio, HubSpot, PropStream) balance density with scannability. Key principle: **show just enough to decide whether to click, not enough to overwhelm**.

### Card Layout Structure

```
+------------------------------------------+
| [Strategy Badge]        [$Price JBMono]  |
| Deal Name / Property Address (bold)      |
| City, ST 12345                           |
|                                          |
| Cap Rate: 8.4%   |  Cash Flow: $1,240   |
| ARV: $340,000     |  COC: 12.3%         |
|                                          |
| [Avatar] Agent Name     3d in stage      |
| [Tag] [Tag]                              |
+------------------------------------------+
```

### Visual Hierarchy Within Cards

1. **Strategy badge** -- top-left, color-coded pill (use the design-brief strategy colors)
2. **Price** -- top-right, JetBrains Mono, larger weight, white
3. **Address** -- bold, primary text color
4. **Key metrics** -- 2x2 grid, JetBrains Mono for values, muted labels
5. **Meta info** -- avatar, agent name, time in stage, tags at bottom

### Status Indicators

- **Pipeline stage**: colored left border on the card (indigo for active stages)
- **Time urgency**: if a deal has been in a stage too long, show an amber/red indicator
- **Activity recency**: green dot for recently updated, no dot for stale
- **AI flag**: small sparkle icon if Claude has generated recommendations for this deal

### Action Buttons (Hover-Revealed)

Show action buttons only on card hover to keep the default view clean:
- **Star/Favorite** -- top-right corner
- **Quick Edit** -- pencil icon, opens inline edit or drawer
- **Move** -- arrow icon for quick pipeline stage change
- **Share** -- link icon for generating shareable deal link
- **More** -- three-dot menu for archive, delete, duplicate, export

### PropStream-Inspired Property Details

PropStream organizes property data into distinct cards:
- **Property Summary Card** -- address, type, beds/baths/sqft, year built
- **Value Card** -- estimated value, equity percentage, comps data
- **Mortgage & Debt Card** -- loan balance, rate, payment, lien info
- **Opportunity Card** -- estimated equity %, comparable properties, investment potential

**Parcel Application**: Organize deal detail views into similar card sections:
1. Property Overview card
2. Financial Analysis card (strategy-specific inputs/outputs)
3. Market Comps card
4. AI Insights card

### CSS for Dark Theme Deal Cards

```css
/* Base card */
.deal-card {
  background: #0F0F1A;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 16px;
  transition: all 0.2s ease;
}

/* Hover state */
.deal-card:hover {
  border-color: rgba(99, 102, 241, 0.3);
  box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.1),
              0 4px 16px rgba(0, 0, 0, 0.3);
  transform: translateY(-1px);
}

/* Strategy-colored left border */
.deal-card[data-strategy="wholesale"] {
  border-left: 3px solid #F59E0B; /* amber */
}
.deal-card[data-strategy="brrrr"] {
  border-left: 3px solid #6366F1; /* indigo */
}
.deal-card[data-strategy="flip"] {
  border-left: 3px solid #EC4899; /* pink */
}
```

### Sources

- [PropStream: Features](https://www.propstream.com/propstream-features)
- [PropStream: UI/UX Updates](https://www.propstream.com/news/propstreams-ui-ux-updates-a-fresh-look-enhanced-features-await)
- [Attio: Pipeline Views](https://attio.com/help/reference/managing-your-data/views/create-and-manage-kanban-views)
- [Card UI Design Examples](https://bricxlabs.com/blogs/card-ui-design-examples)

---

## 5. Chart Visualizations

### Dark Theme Chart Design Principles

Dark theme charts require different considerations than light theme:

- **Background**: use `transparent` or match the surface color (`#0F0F1A`), never `#000000`
- **Grid lines**: very subtle, `rgba(255, 255, 255, 0.04)` -- barely visible
- **Axis labels**: muted color (`#64748B`), `12px`, Inter font
- **Data lines**: bright and saturated to stand out against dark backgrounds
- **Gradient fills**: indigo-to-transparent beneath area charts
- **Tooltip background**: slightly lighter surface (`#1A1A2E`) with border `rgba(255, 255, 255, 0.08)`

### Chart Types for Real Estate Analytics

**Area Charts** -- best for:
- Portfolio value over time
- Cash flow trends
- Market value appreciation

**Bar Charts** -- best for:
- Revenue by property/strategy
- Monthly income vs expenses comparison
- Deal count by pipeline stage

**Donut Charts** -- best for:
- Portfolio allocation by strategy
- Income source breakdown
- Expense categories

**Line Charts** -- best for:
- Cap rate trends across market
- Interest rate tracking
- Occupancy rate over time

### Recharts + shadcn/ui Integration

shadcn/ui provides 53 chart components built on Recharts with automatic dark mode support via CSS variables:

```tsx
// Chart color configuration using CSS variables
const chartConfig = {
  cashFlow: {
    label: "Cash Flow",
    color: "hsl(var(--chart-1))",  // maps to indigo
  },
  expenses: {
    label: "Expenses",
    color: "hsl(var(--chart-2))",  // maps to secondary color
  },
}
```

**Key component pattern:**
- Wrap in `<ChartContainer>` with config for theming
- Use `<ResponsiveContainer>` for automatic sizing
- Custom `<ChartTooltip>` with `<ChartTooltipContent>` for styled tooltips
- All copied into your project as ownable React components

### Interactive Tooltip Design

Best practices for chart tooltips on dark themes:

- **Background**: `#1A1A2E` with `backdrop-filter: blur(8px)`
- **Border**: `1px solid rgba(255, 255, 255, 0.08)`
- **Border radius**: `8px`
- **Shadow**: `0 4px 16px rgba(0, 0, 0, 0.4)`
- **Content**: metric name (muted), value (JetBrains Mono, white, bold), delta (colored)
- **Indicator**: small colored dot matching the chart series
- **Animation**: fade in with `150ms` ease, follow cursor with slight lag

### Responsive Chart Sizing

- Desktop: full-width charts with hover interactions
- Tablet: slightly reduced, maintain hover
- Mobile: simplified charts, tap-to-reveal tooltips, reduce data point density
- Always wrap in `<ResponsiveContainer width="100%" height={300}>`
- Consider reducing animation complexity on mobile for performance

### Color Palette for Multi-Series Charts

For Parcel's dark theme with indigo accent:

```
Series 1 (primary):  #6366F1  (indigo-500)
Series 2:            #8B5CF6  (violet-500)
Series 3:            #EC4899  (pink-500)
Series 4:            #F59E0B  (amber-500)
Series 5:            #22C55E  (green-500)
Series 6:            #06B6D4  (cyan-500)
```

Ensure sufficient contrast between adjacent series. Avoid red-green adjacent pairs for colorblind accessibility.

### Sources

- [shadcn/ui Charts](https://ui.shadcn.com/docs/components/radix/chart)
- [shadcn/ui Area Charts](https://ui.shadcn.com/charts/area)
- [shadcn/ui Bar Charts](https://ui.shadcn.com/charts/bar)
- [Subframe: 25 Interactive Chart Design Examples](https://www.subframe.com/tips/interactive-chart-design-examples)
- [Syncfusion: Top 5 React Chart Libraries](https://www.syncfusion.com/blogs/post/top-5-react-chart-libraries)

---

## 6. Empty States

### Why Empty States Matter

Empty states are the first thing a new user sees after signing up. They are your #1 onboarding conversion tool. A bad empty state (blank page with "No data") causes immediate churn. A good empty state teaches, encourages, and accelerates time-to-value.

### Structure of an Effective Empty State

```
+------------------------------------------+
|                                          |
|          [Illustration / Icon]           |
|                                          |
|        Headline (short, clear)           |
|   Supporting text (1-2 sentences)        |
|                                          |
|        [ Primary CTA Button ]            |
|         Secondary link (optional)        |
|                                          |
+------------------------------------------+
```

### Content Strategy by Context

**First-use (Onboarding):**
- Headline: Action-oriented -- "Analyze Your First Deal"
- Supporting: Benefit-focused -- "Enter a property address and we'll calculate returns across 5 strategies in seconds"
- CTA: Primary action -- "Start Analysis"
- Tone: Encouraging, momentum-building

**No Results (Search/Filter):**
- Headline: Descriptive -- "No deals match your filters"
- Supporting: Helpful -- "Try adjusting your search criteria or removing some filters"
- CTA: "Clear Filters" or "Browse All Deals"
- Tone: Helpful, non-judgmental

**Success/Completed:**
- Headline: Celebratory -- "Pipeline is clear"
- Supporting: Reassuring -- "All deals have been moved to closed. Nice work."
- CTA: "Analyze New Deal"
- Tone: Calm, affirming

**Error State:**
- Headline: Honest -- "Something went wrong"
- Supporting: Actionable -- "We couldn't load your deals. Try refreshing the page."
- CTA: "Retry" + "Contact Support"
- Tone: Direct, non-panicking

### Illustration Style for Dark Themes

- Use **monochrome or duotone illustrations** that blend into the dark interface (Linear, Notion approach)
- Primary color in illustrations should be indigo `#6366F1` at reduced opacity
- No full-color illustrations -- they clash with dark themes
- Consider abstract geometric shapes or simple line art over detailed scenes
- Size: illustrations should be `180-240px` wide -- personality without stealing attention
- **Alternative**: use a large, subtle icon (e.g., a property outline or chart icon) at `64px` in `rgba(99, 102, 241, 0.2)`

### Pre-loaded / Sample Data Strategy

Some products pre-load sample data so users never see an empty state:

- **Parcel Application**: Show a sample deal analysis (e.g., "123 Main St, Austin TX") that the user can interact with immediately. Label it clearly as "Sample Deal" with an option to remove it.
- Include a guided walkthrough overlay that highlights key features using the sample data
- After the user creates their first real deal, auto-archive the sample

### Emotional Hooks

- **Encouragement**: "It all starts with your first deal."
- **Reassurance**: "Your pipeline is empty -- for now."
- **Curiosity**: "What will your first investment look like?"
- **Momentum**: "You're 30 seconds away from your first analysis."

### CSS for Empty States on Dark Theme

```css
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  text-align: center;
  padding: 48px 24px;
}

.empty-state-icon {
  width: 64px;
  height: 64px;
  color: rgba(99, 102, 241, 0.3);
  margin-bottom: 24px;
}

.empty-state-headline {
  font-size: 20px;
  font-weight: 600;
  color: #F8FAFC;
  margin-bottom: 8px;
}

.empty-state-description {
  font-size: 14px;
  color: #94A3B8;
  max-width: 400px;
  line-height: 1.6;
  margin-bottom: 24px;
}
```

### Sources

- [Pencil & Paper: Empty States UX](https://www.pencilandpaper.io/articles/empty-states)
- [Eleken: Empty State UX Examples](https://www.eleken.co/blog-posts/empty-state-ux)
- [UserPilot: Empty State in SaaS](https://userpilot.com/blog/empty-state-saas/)
- [SaaSFrame: 90 SaaS Empty State Examples](https://www.saasframe.io/categories/empty-state)
- [Carbon Design System: Empty States Pattern](https://carbondesignsystem.com/patterns/empty-states-pattern/)

---

## 7. Loading Skeletons

### Why Skeletons Over Spinners

Skeleton screens are mandatory for Parcel (per design brief -- "never use spinners"). The psychology behind this:

- **Perceived performance**: skeletons make loading feel 20-30% faster than spinners
- **Layout stability**: they reserve space, preventing content layout shift (CLS)
- **Context preservation**: users see what type of content is coming
- **Professional feel**: skeletons signal a polished, intentional product

### Shimmer Effect Implementation

The shimmer effect uses a wide linear gradient that animates across the placeholder element:

```css
/* Base skeleton element */
.skeleton {
  background: #1A1A2E;
  border-radius: 8px;
  position: relative;
  overflow: hidden;
}

/* Shimmer animation */
.skeleton::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(99, 102, 241, 0.04) 50%,
    transparent 100%
  );
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
```

### Skeleton Types for Parcel

**KPI Card Skeleton:**
```
+------------------------------------------+
| [_____ 80px ____]                        |  <- label placeholder
| [_________ 120px _________]              |  <- value placeholder (taller)
| [____ 60px ___]  [sparkline area]        |  <- delta + sparkline
+------------------------------------------+
```

**Table Row Skeleton:**
```
| [O] [_______ 180px _______] | [__60px__] | [__80px__] | [__60px__] |
```

**Deal Card Skeleton:**
```
+------------------------------------------+
| [badge 60px]              [price 80px]   |
| [________ 200px ________]                |
| [____ 100px ____]                        |
| [__60px__] | [__60px__]                  |
| [O 24px] [_____ 120px _____]             |
+------------------------------------------+
```

**Chart Skeleton:**
```
+------------------------------------------+
|                                          |
|  [wavy line placeholder area]            |
|  with subtle gradient fill               |
|                                          |
+------------------------------------------+
```

### Progressive Loading

Load content in priority order:

1. **Page chrome** (sidebar, topbar) -- instant, no skeleton needed (already rendered)
2. **KPI cards** -- show skeletons, load first (most important metrics)
3. **Primary data table** -- show row skeletons, load second
4. **Charts** -- show chart-shaped skeletons, load third
5. **Secondary widgets** -- load last

### Animation Preferences

- Shimmer (wave) is preferred over pulse for dark themes -- it conveys more activity
- Tilt the gradient slightly (110deg instead of 90deg) for a more dynamic feel
- Duration: `1.5-2s` per sweep
- Respect `prefers-reduced-motion`: fall back to a static placeholder with no animation

### Tailwind Classes

```html
<!-- Skeleton with shimmer -->
<div class="animate-pulse bg-white/5 rounded-lg h-10 w-full" />

<!-- Custom shimmer (more premium feel) -->
<div class="relative overflow-hidden bg-white/[0.03] rounded-lg h-10">
  <div class="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite]
    bg-gradient-to-r from-transparent via-indigo-500/[0.04] to-transparent" />
</div>
```

### Sources

- [Frontend Hero: CSS Skeleton Loaders](https://frontend-hero.com/how-to-create-skeleton-loader)
- [Subframe: 10 CSS Skeleton Loading Examples](https://www.subframe.com/tips/css-skeleton-loading-examples)
- [Mat Simon: Simple Skeleton Loaders](https://www.matsimon.dev/blog/simple-skeleton-loaders)
- [Dark CSS: Skeleton Loading Animation](https://darkcssweb.com/skeleton-loading-animation/)
- [Free Frontend: 12 CSS Skeleton Loadings](https://freefrontend.com/css-skeleton-loadings/)

---

## 8. Mobile-Responsive Dashboards

### Collapsible Sidebar Strategy

**Desktop (>1280px):**
- Full sidebar: 216px wide (Parcel spec), icon + label, grouped sections
- Always visible

**Tablet (768-1279px):**
- Collapsed sidebar: 64px wide, icons only, tooltip on hover for labels
- Toggle to full width with hamburger button
- Sheet overlay (shadcn Sheet component) for full sidebar on tap

**Mobile (<768px):**
- Sidebar completely hidden
- Bottom navigation bar with 4-5 key icons (Dashboard, Deals, Pipeline, Chat, Profile)
- Full sidebar accessible via hamburger menu (slides in from left as an overlay)

### Stacked Layout Patterns

**KPI Cards:**
- Desktop: 4 columns
- Tablet: 2 columns
- Mobile: 1 column, horizontally scrollable carousel (swipe between cards)

**Data Tables:**
- Desktop: full table with all columns
- Tablet: hide non-essential columns, show horizontal scroll indicator
- Mobile: transform into a **card list** -- each row becomes a card with key fields stacked vertically

**Kanban Board:**
- Desktop: all columns visible, horizontal scroll
- Tablet: 2-3 columns visible, horizontal scroll
- Mobile: single column view with tab/chip navigation between stages, or vertical stacking

**Charts:**
- Desktop: side-by-side charts
- Tablet: full-width, stacked vertically
- Mobile: full-width, simplified (fewer data points, remove legends, use swipe for tooltips)

### Touch-Friendly Targets

- Minimum tap target: `44x44px` (Apple HIG standard)
- Button padding: minimum `12px` vertical, `16px` horizontal on mobile
- Spacing between interactive elements: minimum `8px` gap
- Use explicit drag handles on mobile instead of tap-and-hold gestures
- Consider swipe-to-move or arrow button controls as drag-and-drop alternatives on mobile

### Responsive CSS Grid Pattern

```css
/* Dashboard grid */
.dashboard-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(4, 1fr);
}

@media (max-width: 1279px) {
  .dashboard-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 767px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}
```

### Performance on Mobile

- Reduce animation complexity (disable Framer Motion spring physics, use simple fades)
- Limit backdrop-filter usage (expensive on mobile GPUs)
- Lazy-load charts and heavy components below the fold
- Use `will-change: transform` sparingly and only during active animations

### Sources

- [Toptal: Mobile Dashboard UI Best Practices](https://www.toptal.com/designers/dashboard-design/mobile-dashboard-ui)
- [Navbar Gallery: Best Sidebar Menu Design Examples](https://www.navbar.gallery/blog/best-side-bar-navigation-menu-design-examples)
- [Medium: Mastering Responsive Design for SaaS Dashboard](https://medium.com/@drizzleshine/mastering-responsive-design-for-a-saas-dashboard-a-design-challenge-c8401df0eb13)
- [SaaSFrame: Dashboard UI Design Examples](https://www.saasframe.io/categories/dashboard)

---

## 9. Navigation Patterns

### Command Palette (Cmd+K)

The command palette is the single most impactful navigation upgrade for power users. Linear, Superhuman, Slack, Notion, Figma all implement it.

**Layout:**
- Centered modal overlay, `560-640px` wide, `max-height: 400px`
- Search input at top with placeholder: "Search deals, run commands..."
- Scrollable results list below, grouped by category
- Keyboard shortcut hints on the right side of each result row
- Dark background with high contrast: `#1A1A2E` bg, `#F8FAFC` text

**Search Behavior:**
- Fuzzy search -- typing "whl" should match "Wholesale"
- Search across: deal names, addresses, commands, pages, contacts
- Show recent items when palette opens with no query
- Debounce input: `150ms`

**Result Categories:**
```
Recent
  > 123 Main St Deal Analysis        Cmd+Enter
  > Pipeline Board                    G then P

Deals
  > Search deals...                   /deals
  > Create new deal                   C

Navigation
  > Dashboard                         G then D
  > Pipeline                          G then P
  > My Deals                          G then M
  > Portfolio                         G then F
  > AI Chat                           G then A

Actions
  > Export deals to CSV               Cmd+Shift+E
  > Toggle dark/light mode            Cmd+Shift+D
```

**Animation:**
- Fade in + scale from `0.95` to `1.0` over `150ms`
- Backdrop blur: `backdrop-filter: blur(4px)` with dark overlay `rgba(0, 0, 0, 0.5)`
- Results animate in with staggered fade (`50ms` delay between items)

### Sidebar Navigation (Mercury-style)

Parcel uses a 216px sidebar. Best practices from Linear and Attio:

**Grouping:**
```
-- OVERVIEW --
  Dashboard
  AI Chat

-- DEALS --
  Analyze
  My Deals
  Pipeline
  Portfolio

-- SETTINGS --
  Account
  Team
  Billing
```

**Active State:**
- Background: `rgba(99, 102, 241, 0.1)`
- Left border: `2px solid #6366F1`
- Text color: `#F8FAFC` (white)
- Icon color: `#6366F1` (indigo)

**Inactive State:**
- Background: transparent
- Text color: `#94A3B8` (muted)
- Icon color: `#64748B` (dim)

**Hover State:**
- Background: `rgba(255, 255, 255, 0.04)`
- Text color: `#CBD5E1` (slightly brighter)
- Transition: `150ms ease`

### Breadcrumbs

For deep navigation (Deal > Analysis > Results > Share):
- Use `>` or `/` as separator (Linear uses `/`)
- Each segment is clickable for navigation back
- Current page is not a link (just text)
- Truncate middle segments on mobile with `...`
- Place above the page title, `12px` font, muted color

### Global Keyboard Shortcuts

**Navigation:**
- `G then D` -- go to Dashboard
- `G then P` -- go to Pipeline
- `G then M` -- go to My Deals
- `G then A` -- go to AI Chat
- `G then S` -- go to Settings

**Actions:**
- `C` -- create new deal
- `Cmd+K` -- command palette
- `Cmd+/` -- keyboard shortcuts help
- `/` -- focus search (when not in input)
- `Esc` -- close modal/drawer, deselect

### Sources

- [Maggie Appleton: Command-K Bars](https://maggieappleton.com/command-bar)
- [Mobbin: Command Palette UI Design](https://mobbin.com/glossary/command-palette)
- [HashBuilds: Command Palette Keyboard-First Navigation](https://www.hashbuilds.com/patterns/what-is-command-palette)
- [Linear Docs: Concepts](https://linear.app/docs/conceptual-model)
- [SaaS UI Workflow Patterns: AppShell](https://gist.github.com/mpaiva-cc/d4ef3a652872cb5a91aa529db98d62dd)

---

## 10. Micro-Interactions

### Core Principles

Micro-interactions should enhance the experience without interrupting workflow or slowing down the system. They serve four purposes:

1. **Feedback** -- confirming an action was received
2. **Guidance** -- showing what's interactive or what changed
3. **Status** -- indicating system state (loading, success, error)
4. **Delight** -- adding personality without distraction (carefully -- Parcel design brief says no confetti, particles, or bounce animations)

### Hover States

**Cards:**
- Subtle lift: `translateY(-1px)` with increased shadow
- Border color shift: from `rgba(255,255,255,0.06)` to `rgba(99,102,241,0.3)`
- Transition: `200ms ease`

**Buttons:**
- Primary: slight brightness increase, `filter: brightness(1.1)`
- Secondary: background fill from transparent to `rgba(255,255,255,0.05)`
- Ghost: text color brightens from muted to white

**Table Rows:**
- Full row highlight: `rgba(99, 102, 241, 0.04)` background
- Reveal hidden actions (edit, delete, share) on the right side
- Cursor changes to pointer if row is clickable

**Nav Items:**
- Background slides in from left (Framer Motion `layoutId` animation)
- Icon color transitions from muted to indigo

### Transitions

**Page Transitions (Framer Motion):**
```tsx
// Subtle fade + slide for page changes
const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
}
// Duration: 200ms, ease: [0.25, 0.1, 0.25, 1]
```

**Modal/Drawer Transitions:**
- Modal: fade in backdrop + scale content from `0.95` to `1.0` over `200ms`
- Drawer: slide in from right over `250ms` with spring physics
- Both: `backdrop-filter: blur(4px)` on overlay

**Accordion/Expand:**
- Height animation: `max-height` transition or Framer Motion `AnimatePresence`
- Chevron rotation: `180deg` with `200ms` ease
- Content fades in as it expands

### Feedback Animations

**Successful Action:**
- Brief green flash on the affected element (`200ms`)
- Toast notification slides in from top-right
- Check icon with a quick draw animation (SVG path animation)

**Error:**
- Element border flashes red (`#EF4444`) briefly
- Subtle shake animation: `translateX` oscillation `[-4px, 4px]` 3 times over `400ms`
- Error toast with red accent

**Saving/Auto-save:**
- Small "Saving..." text with a subtle pulse, transitions to "Saved" with a check
- No full-screen overlays or blocking modals for auto-save

**Deletion:**
- Element fades out + collapses height over `300ms`
- "Undo" toast appears at the bottom for `5000ms`

### Button Click Feedback

```css
/* Press effect */
.button:active {
  transform: scale(0.98);
  transition: transform 50ms ease;
}

/* Ripple effect (optional, subtle) */
.button::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  transform: scale(0);
  animation: ripple 400ms ease-out;
}
```

### Count-Up Animations (KPI Cards)

Already implemented in Parcel's `useCountUp.ts`, but here are refinements:
- Duration: `1.2s` with `ease-out`
- Use `requestAnimationFrame` for smooth 60fps
- Start from 0, not from a previous value (unless it's a live update)
- For currency: format progressively (show cents only in the last 200ms)
- For percentages: show 1 decimal place throughout

### What NOT to Do (per Parcel Design Brief)

- No confetti
- No particle effects
- No bounce animations
- No excessive spring physics
- No decorative animations that serve no functional purpose

### Sources

- [UserPilot: 14 Micro-interaction Examples](https://userpilot.com/blog/micro-interaction-examples/)
- [Stan Vision: Micro Interactions in Web Design 2025](https://www.stan.vision/journal/micro-interactions-2025-in-web-design)
- [IxDF: Role of Micro-interactions in Modern UX](https://www.interaction-design.org/literature/article/micro-interactions-ux)
- [Webflow: 15 Microinteraction Examples](https://webflow.com/blog/microinteractions)
- [DesignerUp: Complete Guide to UI Animations](https://designerup.co/blog/complete-guide-to-ui-animations-micro-interactions-and-tools/)

---

## 11. Product-Specific Findings

### Linear

**What makes it great:**
- Speed is the product. Every interaction feels instant. No loading spinners anywhere.
- Keyboard-first design: everything is accessible without a mouse
- "Inverted L-shape" layout: sidebar + topbar chrome controls all content
- LCH color space for perceptually uniform themes (reduced 98 CSS variables to just 3: base color, accent color, contrast)
- Inter Display for headings, regular Inter for body
- Multiple view modes: list, board, timeline, split, fullscreen
- Reduced visual chrome -- limited use of accent color for a more neutral, timeless appearance

**What Parcel can learn:**
- Implement keyboard shortcuts from day one (not as an afterthought)
- Use LCH-based color generation for accessible high-contrast themes
- Support multiple view modes for the same data (table, kanban, calendar)
- Speed = trust. Optimize every interaction to feel instant

### Attio

**What makes it great:**
- A pipeline isn't a separate module -- it's just a list switched to kanban view
- Same underlying data, different visual lens
- Inline attribute editing on kanban cards
- "It feels like a tool built by people who use Linear and Notion"
- Language choice: "collections, entries, views" instead of CRM jargon
- Modular tables with flexible schema

**What Parcel can learn:**
- Don't create separate "pipeline" and "deals" systems -- they should be the same data with different views
- Allow users to switch between table and kanban without navigating to a new page
- Use clear, non-jargon language (real estate has enough jargon already)
- Let users configure which fields appear on kanban cards

### Airtable

**What makes it great:**
- Multiple view types: Grid, Gallery, Kanban, Calendar, Timeline
- Powerful filtering with AND/OR logic
- Column customization (hide, reorder, resize, add/remove)
- "Viewer's records only" permission pattern
- Responsive container that adjusts visualization types

**What Parcel can learn:**
- Implement a views system -- same deal data viewable as table, cards, kanban, or calendar
- Build a filter builder component with AND/OR logic
- Allow users to save and name custom views (e.g., "My Active Wholesale Deals > $200K")
- Column memory: remember user's column preferences across sessions

### PropStream

**What makes it great:**
- Property-centric card system: Summary, Value, Mortgage, Opportunity cards
- 165+ filters with 20 pre-built Lead Lists
- Heat map visualization for market analysis
- Comp analysis with custom drawn areas
- "Estimated equity percentage" as a key data point
- Analysis tool with tabbed interface: Purchase, Mortgage, Closing, Income, Expenses, Sale

**What Parcel can learn:**
- Organize deal details into distinct information cards (not one long scrolling form)
- Provide pre-built filter templates (e.g., "High Cash Flow Deals", "BRRRR Candidates")
- Show equity percentage as a prominently displayed metric
- Tabbed analysis interface for different financial aspects of a deal

### Sources

- [Linear: How We Redesigned the Linear UI](https://linear.app/now/how-we-redesigned-the-linear-ui)
- [LogRocket: Linear Design Trend](https://blog.logrocket.com/ux-design/linear-design/)
- [SaaSUI Design: Attio](https://www.saasui.design/application/attio)
- [Airtable: Interface Designer](https://support.airtable.com/docs/getting-started-with-airtable-interface-designer)
- [PropStream: Features](https://www.propstream.com/propstream-features)

---

## 12. Actionable Recommendations for Parcel

### Priority 1: Must-Have Patterns

These patterns are non-negotiable for a professional real estate SaaS:

1. **Command Palette (Cmd+K)** -- implement early, wire up to deal search + navigation + actions. Use `cmdk` library (React).

2. **Skeleton Loading Everywhere** -- every page, every component. Use the shimmer variant with indigo tint on dark backgrounds. Build a `<Skeleton>` component library (line, circle, card, table row, chart).

3. **Data Table with Full Features** -- sorting, filtering, column management, bulk actions, inline editing. Use `@tanstack/react-table` v8 with custom rendering.

4. **Consistent Deal Card Component** -- one reusable card that works in table rows, kanban cards, search results, and detail drawers. Strategy-colored left border, JetBrains Mono financials, hover-revealed actions.

5. **Keyboard Shortcuts System** -- implement a global shortcut handler. Start with navigation shortcuts and `Cmd+K`. Use `react-hotkeys-hook` or build a custom `useHotkeys` hook.

### Priority 2: High-Impact Improvements

6. **View Switching** -- allow My Deals to toggle between table, card grid, and kanban views without page navigation. Use a segmented control at the top of the page.

7. **Smart Empty States** -- custom empty state for each page with contextual CTAs. Include a sample deal on first load for immediate interactivity.

8. **KPI Cards with Sparklines** -- add trend sparklines to dashboard KPI cards using Recharts `<AreaChart>` with no axes, just the line + gradient fill. Animate on mount.

9. **Side Drawer for Deal Details** -- clicking a deal anywhere (table, kanban, search) opens a `400px` right drawer with full deal info. Avoids full page navigation, preserves context.

10. **Floating Bulk Action Bar** -- appears at the bottom when items are selected in a table. Shows count + actions. Animate in from below with Framer Motion.

### Priority 3: Delight & Polish

11. **AI-Powered KPI Narratives** -- use Claude to generate brief contextual summaries beneath key portfolio metrics. E.g., "Cash flow increased 12% this month, primarily from rent adjustments on 3 properties."

12. **Undo Snackbar** -- after destructive actions (delete, archive), show a toast with "Undo" button for 5 seconds. Use optimistic updates.

13. **Auto-Save with Status Indicator** -- "Saving..." / "Saved" indicator in the topbar for deal editing. No manual save buttons.

14. **Custom Filter Presets** -- let users save named filter configurations: "BRRRR deals > 10% CoC" and access them from a dropdown.

15. **Responsive Kanban** -- mobile kanban shows one column at a time with swipe navigation between stages. Tab chips at top for quick stage switching.

### CSS Variables for Consistent Theming

```css
:root {
  /* Surfaces */
  --bg-base: #08080F;
  --bg-surface: #0F0F1A;
  --bg-elevated: #1A1A2E;
  --bg-overlay: rgba(0, 0, 0, 0.5);

  /* Borders */
  --border-default: rgba(255, 255, 255, 0.06);
  --border-hover: rgba(99, 102, 241, 0.3);
  --border-focus: #6366F1;

  /* Text */
  --text-primary: #F8FAFC;
  --text-secondary: #94A3B8;
  --text-muted: #64748B;
  --text-disabled: #475569;

  /* Accent */
  --accent-primary: #6366F1;
  --accent-primary-hover: #818CF8;
  --accent-primary-muted: rgba(99, 102, 241, 0.1);
  --accent-primary-subtle: rgba(99, 102, 241, 0.04);

  /* Semantic */
  --success: #22C55E;
  --error: #EF4444;
  --warning: #F59E0B;
  --info: #06B6D4;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.4);
  --shadow-glow: 0 0 20px rgba(99, 102, 241, 0.15);

  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-normal: 200ms ease;
  --transition-slow: 300ms ease;

  /* Typography */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

### Component Architecture Summary

```
src/components/
  ui/                         # shadcn/ui primitives
  layout/
    AppShell.tsx              # sidebar + topbar
    PageHeader.tsx            # page title + actions
    PageContent.tsx           # content wrapper
  data/
    DataTable.tsx             # full-featured table (TanStack)
    DataTableToolbar.tsx      # filter chips + search + column settings
    DataTableBulkBar.tsx      # floating bottom bar for bulk actions
    DataTableColumnHeader.tsx # sortable header with chevrons
  cards/
    KPICard.tsx               # metric + delta + sparkline
    DealCard.tsx              # reusable deal display card
    SkeletonCard.tsx          # loading placeholder
  pipeline/
    KanbanBoard.tsx           # dnd-kit board
    KanbanColumn.tsx          # single stage column
    KanbanCard.tsx            # draggable deal card
  navigation/
    CommandPalette.tsx        # Cmd+K overlay
    Breadcrumbs.tsx           # navigation breadcrumbs
  feedback/
    EmptyState.tsx            # configurable empty state
    UndoToast.tsx             # undo snackbar
    SaveIndicator.tsx         # auto-save status
  charts/
    AreaChart.tsx             # Recharts area wrapper
    BarChart.tsx              # Recharts bar wrapper
    DonutChart.tsx            # Recharts pie wrapper
    Sparkline.tsx             # tiny inline chart
```

---

## Appendix: All Sources Referenced

### Product Research
- [Linear: Board Layout Docs](https://linear.app/docs/board-layout)
- [Linear: How We Redesigned the Linear UI](https://linear.app/now/how-we-redesigned-the-linear-ui)
- [Linear: Changelog -- New UI](https://linear.app/changelog/2024-03-20-new-linear-ui)
- [LogRocket: Linear Design Trend](https://blog.logrocket.com/ux-design/linear-design/)
- [Attio: Kanban Views](https://attio.com/help/reference/managing-your-data/views/create-and-manage-kanban-views)
- [SaaSUI Design: Attio](https://www.saasui.design/application/attio)
- [Airtable: Interface Designer](https://support.airtable.com/docs/getting-started-with-airtable-interface-designer)
- [Airtable: Grid View](https://support.airtable.com/docs/airtable-grid-view)
- [PropStream: Features](https://www.propstream.com/propstream-features)
- [PropStream: UI/UX Updates](https://www.propstream.com/news/propstreams-ui-ux-updates-a-fresh-look-enhanced-features-await)

### Design Patterns & Best Practices
- [Pencil & Paper: Enterprise Data Tables UX Patterns](https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables)
- [Anatomy of the KPI Card](https://nastengraph.substack.com/p/anatomy-of-the-kpi-card)
- [Eleken: Drag and Drop UI Examples](https://www.eleken.co/blog-posts/drag-and-drop-ui)
- [Eleken: Empty State UX Examples](https://www.eleken.co/blog-posts/empty-state-ux)
- [Eleken: Table Design UX Guide](https://www.eleken.co/blog-posts/table-design-ux)
- [Maggie Appleton: Command-K Bars](https://maggieappleton.com/command-bar)
- [Mobbin: Command Palette UI Design](https://mobbin.com/glossary/command-palette)
- [SaaS UI Workflow Patterns (GitHub Gist)](https://gist.github.com/mpaiva-cc/d4ef3a652872cb5a91aa529db98d62dd)
- [Carbon Design System: Empty States](https://carbondesignsystem.com/patterns/empty-states-pattern/)
- [UserPilot: Empty State in SaaS](https://userpilot.com/blog/empty-state-saas/)

### Component Libraries & Frameworks
- [21st.dev: Dashboard Components](https://21st.dev/s/dashboard)
- [21st.dev: Community Components](https://21st.dev/community/components/s/dashboard)
- [shadcn/ui: Charts](https://ui.shadcn.com/docs/components/radix/chart)
- [shadcn/ui: Area Charts](https://ui.shadcn.com/charts/area)
- [shadcn/ui: Dashboard Example](https://ui.shadcn.com/examples/dashboard)
- [Marmelab: Kanban Board with Shadcn](https://marmelab.com/blog/2026/01/15/building-a-kanban-board-with-shadcn.html)

### Design Galleries & Inspiration
- [Dribbble: SaaS Dashboard](https://dribbble.com/search/saas-dashboard)
- [Dribbble: Dark Dashboard](https://dribbble.com/tags/dark-dashboard)
- [Dribbble: KPI Cards](https://dribbble.com/tags/kpi-cards)
- [Dribbble: Real Estate Dashboard](https://dribbble.com/tags/real-estate-dashboard)
- [SaaSFrame: Dashboard Examples](https://www.saasframe.io/categories/dashboard)
- [SaaSFrame: Empty State Examples](https://www.saasframe.io/categories/empty-state)
- [SaaSFrame: Table Examples](https://www.saasframe.io/categories/table)

### Technical References
- [Tailwind CSS: Dark Mode](https://tailwindcss.com/docs/dark-mode)
- [Tailwind CSS: Box Shadow](https://tailwindcss.com/docs/box-shadow)
- [Frontend Hero: CSS Skeleton Loaders](https://frontend-hero.com/how-to-create-skeleton-loader)
- [Subframe: Interactive Chart Design Examples](https://www.subframe.com/tips/interactive-chart-design-examples)
- [FanRuan: KPI Card Examples](https://gallery.fanruan.com/kpi-card-example)
- [DesignRush: Dashboard Design Principles 2026](https://www.designrush.com/agency/ui-ux-design/dashboard/trends/dashboard-design-principles)
