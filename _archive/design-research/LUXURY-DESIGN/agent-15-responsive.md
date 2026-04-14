# Responsive & Mobile Design Specification

Parcel Platform luxury dark theme. React 18 + TypeScript + Tailwind CSS + Framer Motion.
Palette: `#0C0B0A` background, `#F0EDE8` cream text, `#8B7AFF` violet accent.

---

## 1. Breakpoint System

Four tiers mapped to Tailwind's default breakpoints. No custom breakpoint config needed.

| Token | Range | Layout | Sidebar | Nav |
|-------|-------|--------|---------|-----|
| `lg` | 1024px+ | Full sidebar (240px), max-w-7xl content, 4-col KPI grids | Persistent, collapsible to 64px rail | Sidebar |
| `md` | 768-1023px | Sidebar visible, 2-col KPIs, horizontal-scroll Kanban | Persistent 240px, no rail mode | Sidebar |
| `sm` | 640-767px | No sidebar, bottom tab bar, 2-col KPIs, tabbed pipeline | Drawer (280px) via hamburger | Bottom tabs |
| `<640` | 0-639px | Bottom tab bar, single-col forms, stacked cards | Drawer (280px) via hamburger | Bottom tabs |

### Content padding scale

```
px-4 py-4           /* mobile (<640) */
sm:px-4 sm:py-5     /* sm */
md:px-8 md:py-6     /* md: sidebar present, more breathing room */
lg:px-10 lg:py-6    /* lg: max comfort */
```

### Main content clearance

Every page wrapping `<main>` gets bottom padding to clear the fixed bottom tab bar on mobile:

```tsx
<main className="pb-[84px] sm:pb-[84px] md:pb-0">
```

The 84px = 52px tab bar height + 32px safe-area estimate. Actual safe area handled by `env()`.

---

## 2. Mobile Navigation: Bottom Tab Bar

Replace the hamburger-only approach below `md` with a persistent 5-tab bottom bar. The hamburger drawer remains accessible from the "More" tab for secondary pages.

### Tab definitions

| Position | Label | Icon (Lucide) | Route | Badge |
|----------|-------|---------------|-------|-------|
| 1 | Dashboard | `LayoutDashboard` | `/dashboard` | -- |
| 2 | Analyze | `Calculator` | `/analyze` | -- |
| 3 | Pipeline | `GitBranch` | `/pipeline` | Count dot |
| 4 | Chat | `MessageSquare` | `/chat` | Unread dot |
| 5 | More | `Menu` | opens drawer | -- |

### Implementation

```tsx
<nav
  className="md:hidden fixed bottom-0 inset-x-0 z-50
    bg-[#0C0B0A]/80 backdrop-blur-xl
    border-t border-white/[0.06]"
  style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
  aria-label="Main navigation"
>
  <div className="flex items-center justify-around h-[52px]">
    {tabs.map(({ icon: Icon, path, label }) => {
      const isActive = pathname === path || pathname.startsWith(path + '/')
      return (
        <Link
          key={path}
          to={path}
          className={cn(
            'flex flex-col items-center justify-center gap-0.5',
            'min-w-[64px] min-h-[44px] py-1',
            'transition-colors duration-150',
            isActive ? 'text-[#8B7AFF]' : 'text-[#F0EDE8]/40'
          )}
        >
          <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
          <span className="text-[10px] font-medium leading-none">{label}</span>
        </Link>
      )
    })}
  </div>
</nav>
```

### Key details
- **Frosted glass:** `bg-[#0C0B0A]/80 backdrop-blur-xl` -- 80% opacity near-black with heavy blur.
- **Safe area:** `paddingBottom: env(safe-area-inset-bottom)` handles iPhone home indicator.
- **Active state:** Violet `#8B7AFF` icon + label. Inactive at cream 40% opacity.
- **Touch targets:** Each tab is `min-w-[64px] min-h-[44px]` -- exceeds WCAG 44px requirement.
- **Z-index:** `z-50` ensures it sits above all page content and drawers.
- **Total height:** 52px bar + ~32px safe area = ~84px. Content must account for this.

### "More" tab drawer

Tapping "More" opens the existing `Sheet` drawer from the left at 280px. It contains nav items not in the tab bar: My Deals, Portfolio, Documents, Pricing, Settings, plus the user section and trial banner. The drawer uses the same dark styling as the desktop sidebar.

---

## 3. Per-Page Responsive Summaries

### 3a. Dashboard

```
Mobile (<640):
  - Greeting row: "Good morning, Ivan" + "New Analysis" pill button
  - 2x2 KPI grid: grid grid-cols-2 gap-3
  - Chart stacked full-width below KPIs (no side-by-side)
  - Recent activity: scrollable list, last visible section

sm (640-767):
  - Same as mobile, slightly more horizontal breathing room

md (768-1023):
  - 3-col KPI grid: grid grid-cols-3 gap-4
  - Charts in 2-col layout: grid grid-cols-2 gap-6

lg (1024+):
  - 4-col KPI grid: grid grid-cols-4 gap-4
  - Charts side-by-side, max-w-7xl centered
```

KPI card mobile pattern:
```tsx
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
  <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-4">
    <p className="text-[11px] uppercase tracking-wider text-[#F0EDE8]/40 mb-1">
      Total Deals
    </p>
    <p className="text-xl font-semibold text-[#F0EDE8] tabular-nums">24</p>
  </div>
</div>
```

### 3b. Deal Analysis (Analyzer Form + Results)

```
Mobile (<640):
  - Strategy selector: full-width cards, vertically stacked
  - Form: single column, grid-cols-1
  - All inputs at text-base (16px) to prevent iOS zoom
  - inputMode="decimal" on financial fields
  - Results: stacked metric cards, full-width charts
  - "Run Analysis" sticky at bottom above tab bar

sm-md:
  - Form: grid grid-cols-2 gap-4
  - Results: 2-col metrics, charts side-by-side where sensible

lg:
  - Form: grid grid-cols-2 lg:grid-cols-3 gap-6
  - Results: multi-column layout with sidebar summary
```

Form field responsive pattern:
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
  <label className="space-y-1.5">
    <span className="text-xs font-medium text-[#F0EDE8]/60">Purchase Price</span>
    <input
      inputMode="decimal"
      className="w-full h-12 px-4 rounded-lg text-base
        bg-white/[0.04] border border-white/[0.08]
        text-[#F0EDE8] placeholder:text-[#F0EDE8]/30
        focus:border-[#8B7AFF]/50 focus:ring-1 focus:ring-[#8B7AFF]/20
        transition-colors duration-150"
    />
  </label>
</div>
```

### 3c. Pipeline (Kanban)

```
Mobile (<640):
  - Horizontal scrollable stage tabs (pill buttons)
  - Active stage: bg-[#8B7AFF] text-white shadow-lg shadow-[#8B7AFF]/20
  - Inactive: bg-white/[0.06] text-[#F0EDE8]/50
  - Card list below: vertical scroll, full-width cards
  - Swipe left/right on card list to switch stages (Framer drag="x")
  - Swipe-to-action on individual cards: reveals move/remove buttons

sm:
  - Same tabbed layout, more horizontal space for tab labels

md:
  - Horizontal-scroll Kanban: columns side-by-side, overflow-x-auto
  - Each column min-w-[280px]

lg:
  - Full Kanban board: columns flex, no scroll needed (up to 5 visible)
```

Stage tab dark pattern:
```tsx
<button
  className={cn(
    'flex-shrink-0 inline-flex items-center gap-1.5',
    'px-3 py-2 rounded-full text-[13px] font-medium',
    'min-h-[44px] transition-all duration-200',
    isActive
      ? 'bg-[#8B7AFF] text-white shadow-lg shadow-[#8B7AFF]/20'
      : 'bg-white/[0.06] text-[#F0EDE8]/50 active:bg-white/[0.10]'
  )}
/>
```

### 3d. Chat

```
Mobile (<640):
  - Full-screen flex layout, noPadding AppShell mode
  - Messages: flex-1 overflow-y-auto, full-width rows (not bubbles)
  - User msg: bg-[#8B7AFF]/15 rounded-xl
  - AI msg: bg-white/[0.04] rounded-xl
  - Sticky input bar: fixed above bottom tab bar
    pb-[calc(12px+84px+env(safe-area-inset-bottom))]
  - Input: text-base, auto-grow textarea, max-h-[120px]
  - Send button: 40x40 rounded-xl bg-[#8B7AFF]

md+:
  - Same layout but with sidebar visible
  - Messages constrained to max-w-3xl mx-auto
```

Chat input bar (accounts for bottom tab bar on mobile):
```tsx
<div className="shrink-0 border-t border-white/[0.06]
  px-4 py-3 bg-[#0C0B0A]/95 backdrop-blur-md
  pb-[calc(12px+env(safe-area-inset-bottom))]
  md:pb-3">
  <div className="flex items-end gap-2 max-w-3xl mx-auto">
    <textarea
      className="flex-1 resize-none rounded-xl text-base
        bg-white/[0.06] border border-white/[0.08]
        text-[#F0EDE8] px-4 py-3 max-h-[120px]
        placeholder:text-[#F0EDE8]/30
        focus:border-[#8B7AFF]/50 focus:ring-1 focus:ring-[#8B7AFF]/20"
      placeholder="Ask about a deal..."
    />
    <button className="w-10 h-10 rounded-xl bg-[#8B7AFF]
      flex items-center justify-center shrink-0
      active:bg-[#7B6AEF] transition-colors">
      <Send size={18} className="text-white" />
    </button>
  </div>
</div>
```

On mobile, the chat input must clear both the safe area AND the 84px bottom tab bar. Use `pb-[calc(12px+84px+env(safe-area-inset-bottom))]` on mobile, `md:pb-3` on desktop.

### 3e. Documents

```
Mobile (<640):
  - List view only (no grid): stacked document cards, full-width
  - Upload zone: simplified single-button "Upload" with drag hidden
  - Document detail: full-screen sheet sliding up from bottom
  - Processing steps: vertical stepper, compact

md+:
  - Two-pane: document list left, detail/preview right
  - Upload zone: full drag-and-drop area
```

### 3f. Portfolio

```
Mobile (<640):
  - KPIs stacked 2x2: grid grid-cols-2 gap-3
  - Properties table: horizontal scroll with sticky first column
    overflow-x-auto, first column sticky left-0 bg-[#0C0B0A]
  - Charts: stacked full-width

md:
  - 3-col KPI row
  - Table with more columns visible

lg:
  - 4-col KPIs, full table, charts side-by-side
```

Scrollable table pattern:
```tsx
<div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
  <table className="w-full min-w-[640px]">
    <thead>
      <tr className="border-b border-white/[0.06]">
        <th className="sticky left-0 bg-[#0C0B0A] z-10
          text-left text-xs font-medium text-[#F0EDE8]/40
          uppercase tracking-wider py-3 pr-4">
          Property
        </th>
        {/* ... */}
      </tr>
    </thead>
  </table>
</div>
```

### 3g. Settings

```
Mobile (<640):
  - Tab navigation becomes a dropdown/select
  - <select> styled as dark input, full-width
  - Settings sections: single column, stacked
  - All form inputs at text-base (16px)

sm-md:
  - Vertical tabs on left (160px) + content right
  - grid grid-cols-[160px_1fr] gap-6

lg:
  - Same as md with more breathing room
```

### 3h. Pricing

```
Mobile (<640):
  - Cards stacked vertically, Pro card FIRST (reorder with order-first)
  - Full-width cards with violet border on Pro
  - Feature comparison: collapsible accordion, not table
  - CTA buttons: full-width, min-h-[48px]

md:
  - Side-by-side: grid grid-cols-2 gap-6 max-w-3xl mx-auto

lg:
  - Same as md, wider gap
```

Pricing card order:
```tsx
<div className="flex flex-col md:grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
  <div className="order-first md:order-last  /* Pro card */
    rounded-2xl border-2 border-[#8B7AFF]/40 bg-white/[0.04] p-6">
    {/* Pro plan */}
  </div>
  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-6">
    {/* Free plan */}
  </div>
</div>
```

### 3i. Landing Page

```
Mobile (<640):
  - Hero: single column, text-center, stacked CTA buttons
  - Stats strip: 2x2 grid (not horizontal scroll)
  - Features bento: stacked single column
  - Testimonials: horizontal swipe carousel
  - Pricing: stacked (Pro first)
  - Footer: stacked columns, accordion for link groups

sm-md:
  - Hero: still centered, larger type
  - Stats: 4-col row
  - Features: 2-col bento

lg:
  - Hero: left-aligned with right-side visual
  - Full bento grid
  - Three-column footer
```

---

## 4. Touch Feedback

### Brighten-on-press (not darken)

On dark UIs, `active` state must brighten. Darkening is invisible on near-black surfaces.

```css
/* Global utility */
@layer utilities {
  .touch-target {
    @apply min-h-[44px] min-w-[44px];
  }
  .touch-target-lg {
    @apply min-h-[48px] min-w-[48px];
  }
}
```

```tsx
/* Interactive element pattern */
<motion.button
  whileTap={{ scale: 0.97 }}
  className="active:bg-white/[0.12] transition-colors touch-target"
>
```

### Haptic utility

```ts
type HapticStyle = 'light' | 'medium' | 'heavy' | 'double'

export function hapticFeedback(style: HapticStyle = 'light') {
  if (!('vibrate' in navigator)) return
  const patterns: Record<HapticStyle, number | number[]> = {
    light: 10,
    medium: 20,
    heavy: 40,
    double: [10, 50, 10],
  }
  navigator.vibrate(patterns[style])
}
```

### Haptic mapping

| Action | Style | When |
|--------|-------|------|
| Deal analyzed successfully | `medium` | Result appears |
| Pipeline card stage move | `light` | Drop confirmed |
| Deal closed/won | `heavy` | Modal confirms |
| Destructive action confirm | `double` | Delete/remove confirmed |
| Pull-to-refresh release | `light` | Spinner starts |
| Tab bar navigation | -- | No haptic (too frequent) |

---

## 5. Mobile Forms

### iOS 16px zoom fix

iOS Safari auto-zooms viewport when focusing inputs with `font-size < 16px`. This is critical since the design system uses 13-14px as the base text size.

```css
/* In index.css -- mobile input zoom prevention */
@media (max-width: 767px) {
  input,
  select,
  textarea {
    font-size: 16px !important;
  }
}
```

Alternatively, per-component via Tailwind:
```tsx
className="text-base md:text-sm"  /* 16px mobile, 14px desktop */
```

### Financial input pattern

Use `inputMode="decimal"` instead of `type="number"` for all monetary/percentage fields. This gives the numeric keyboard with decimal point on both iOS and Android, without browser spinner arrows or scientific notation issues.

```tsx
<input
  inputMode="decimal"
  pattern="[0-9]*\.?[0-9]*"
  className="w-full h-12 px-4 rounded-lg text-base
    bg-white/[0.04] border border-white/[0.08]
    text-[#F0EDE8] placeholder:text-[#F0EDE8]/30
    focus:border-[#8B7AFF]/50 focus:ring-1 focus:ring-[#8B7AFF]/20"
/>
```

### Form layout rules
- **< 640px:** Always `grid-cols-1`. No side-by-side fields.
- **sm (640-767):** `grid-cols-2` for short fields (price, rate). Single col for address/notes.
- **md+:** `grid-cols-2` or `grid-cols-3` depending on field count.
- **Labels:** Always above input (never inline) on mobile for thumb reachability.

---

## 6. OLED Mode (Optional Toggle)

The default `#0C0B0A` avoids OLED pixel smearing during scrolling. For users who prefer maximum battery savings, offer a pure black toggle in Settings.

### CSS custom property override

```css
/* Default: near-black (avoids smear) */
:root {
  --app-bg: #0C0B0A;
  --app-surface: #161514;
  --app-elevated: #1E1D1B;
  --app-overlay: #262523;
}

/* OLED mode: true black backgrounds */
.oled-mode {
  --app-bg: #000000;
  --app-surface: #0C0B0A;
  --app-elevated: #161514;
  --app-overlay: #1E1D1B;
}
```

### Implementation notes
- Toggle in Settings > Appearance: "OLED black mode" with description "Uses pure black for maximum battery savings on OLED screens. May cause slight smearing during fast scrolling."
- Persist to `localStorage` key `parcel:oled-mode`.
- Apply `.oled-mode` class to `<html>` element alongside the existing dark theme class.
- The entire surface hierarchy shifts one step darker. Cards that were `#161514` become `#0C0B0A`, etc.
- Borders remain at `border-white/[0.06]` -- they become more important for separation when the background is true black.

---

## 7. Outdoor Readability

Ambient light reduces perceived contrast from ~15:1 (indoor) to ~3:1 (outdoor with reflections). Dark UIs are disproportionately affected because screen reflections wash out dark surfaces.

### Contrast safeguards

| Element | Color | Contrast on #0C0B0A | Outdoor viable |
|---------|-------|---------------------|----------------|
| Primary text (financial data) | `#F0EDE8` 100% | 16.5:1 | Yes |
| Secondary text (labels) | `#F0EDE8` at 60% / `#9A9590` | ~6.8:1 | Yes |
| Muted text (decorative) | `#F0EDE8` at 40% / `#6B6560` | ~3.2:1 | Marginal |
| Violet accent as text | `#8B7AFF` | ~4.1:1 | No -- use #B4A9FF |
| Lighter violet for text | `#B4A9FF` | ~7.2:1 | Yes |

### Rules

1. **Financial numbers and KPI values:** Always `text-[#F0EDE8]` at 100% opacity. Never dim monetary amounts.
2. **Violet as text:** Use `#B4A9FF` (lighter tint) whenever violet appears as readable text. Reserve `#8B7AFF` for backgrounds, borders, and icons.
3. **40% opacity text:** Only for decorative/non-essential labels (section dividers, timestamps on hover). Never for actionable content.
4. **Interactive element labels:** Minimum `text-[#F0EDE8]/60` (6.8:1 ratio) to survive outdoor halving.
5. **Light theme escape hatch:** Keep the existing light/dark toggle accessible in Settings. Some users will prefer light theme outdoors regardless of dark UI quality.

---

## 8. PWA Configuration

### Meta tags (in `index.html` `<head>`)

```html
<!-- Theme color: matches OS chrome to app background -->
<meta name="theme-color" content="#0C0B0A" media="(prefers-color-scheme: dark)" />
<meta name="theme-color" content="#FAFAF9" media="(prefers-color-scheme: light)" />

<!-- iOS standalone PWA -->
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="Parcel" />

<!-- Viewport: include viewport-fit for safe areas -->
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

### Manifest (`manifest.json`)

```json
{
  "name": "Parcel",
  "short_name": "Parcel",
  "description": "Real estate deal analysis platform",
  "start_url": "/dashboard",
  "display": "standalone",
  "theme_color": "#0C0B0A",
  "background_color": "#0C0B0A",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-maskable-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

### App icon design
- **Standard icon:** Dark violet `#1A1640` background with white "P" glyph. Rounded corners handled by OS.
- **Maskable icon:** Same design but content within inner 80% safe zone (allows OS-level shape masking on Android).

### Safe area handling for standalone mode

When installed as PWA with `black-translucent`, the status bar overlaps app content. Add top padding:

```tsx
/* AppShell root container */
<div
  className="flex h-screen overflow-hidden"
  style={{ paddingTop: 'env(safe-area-inset-top)' }}
>
```

This only affects standalone PWA mode. In-browser usage ignores the env() value (resolves to 0).

---

## CRITICAL DECISIONS

1. **Bottom tab bar replaces hamburger for mobile (<768px).** The single highest-impact mobile UX change. Hamburger menus reduce feature discoverability by 50%+. Five tabs: Dashboard, Analyze, Pipeline, Chat, More. The "More" tab opens the existing drawer for secondary items.

2. **Drawer remains for secondary navigation.** My Deals, Portfolio, Documents, Pricing, and Settings live in the "More" drawer. This avoids cramming 10+ items into a tab bar while keeping primary workflows one tap away.

3. **84px bottom clearance on all mobile pages.** The tab bar (52px) + safe area (~32px) requires `pb-[84px] md:pb-0` on all page content. Missing this causes content to hide behind the fixed nav.

4. **16px input font-size on mobile is mandatory.** Without it, iOS Safari auto-zooms the viewport on focus, breaking the layout. Applied via CSS media query override, not per-component.

5. **`inputMode="decimal"` for all financial fields.** Gives numeric keyboard with decimal on mobile without the pitfalls of `type="number"` (spinner arrows, exponential notation, empty-string-on-invalid).

6. **OLED mode is opt-in, not default.** `#0C0B0A` is the safe default that avoids pixel smearing on 120Hz OLED displays. Pure black (`#000`) available as a toggle for battery-conscious users who accept the tradeoff.

7. **Violet text always uses `#B4A9FF`, not `#8B7AFF`.** The standard violet at 4.1:1 contrast fails outdoors and barely passes WCAG AA. The lighter `#B4A9FF` at 7.2:1 is safe everywhere. Reserve `#8B7AFF` for non-text use (backgrounds, icons, borders).

8. **Chat input must clear both tab bar and safe area.** Use `pb-[calc(12px+84px+env(safe-area-inset-bottom))]` on mobile. The chat page uses `noPadding` AppShell mode and manages its own spacing.

9. **Pro card renders first on mobile pricing.** Use `order-first md:order-last` to show the Pro tier above Free on mobile, matching conversion best practices (highest-value option visible without scrolling).

10. **No swipe-back interference.** All horizontal drag gestures (pipeline swipe, card swipe-to-action) must not trigger from the left 20px edge zone, which iOS reserves for swipe-right-to-go-back. Set `dragConstraints` and detect `touchstart.clientX > 20` before engaging drag.

11. **Page transitions capped at 200ms on mobile.** 150ms animate-in, 100ms animate-out. Spring/bounce easing is forbidden -- use `cubic-bezier(0.25, 0.1, 0.25, 1)` for a clean, native-feeling settle.

12. **`viewport-fit=cover` is required.** Without this meta viewport value, `env(safe-area-inset-*)` functions resolve to 0 on all devices, breaking the bottom tab bar and PWA status bar handling.
