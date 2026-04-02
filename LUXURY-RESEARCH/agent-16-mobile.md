# Responsive & Mobile Design for Luxury Dark Interfaces

Research for Parcel Platform dark theme redesign. Stack: React 18, TypeScript, Tailwind CSS, Framer Motion. Palette: `#0C0B0A` background, `#F0EDE8` cream text, `#8B7AFF` violet accent.

---

## 1. Dark Theme on Mobile: OLED Considerations

OLED displays turn off pixels for true black (`#000000`), saving 40-60% battery vs white. But pure black causes **smearing** -- pixels transitioning from off to on leave ghostly trails during scroll, especially at 120Hz on iPhone Pro and recent Android flagships.

**Near-black, not true black.** Parcel's `#0C0B0A` is ideal -- dark enough for major battery savings (pixels at ~3-5% brightness) while avoiding smear. Apple, Linear, and Vercel all use near-blacks between `#0A0A0A` and `#111111`.

```css
.dark {
  --app-bg:       #0C0B0A;  /* page bg: near-black, avoids smear */
  --app-surface:  #161514;  /* cards, panels */
  --app-elevated: #1E1D1B;  /* modals, popovers */
  --app-overlay:  #262523;  /* sidebar, drawers */
}
```

Each level steps ~10 lightness points in LCH, creating depth hierarchy without shadows (which vanish on dark backgrounds).

---

## 2. Mobile Sidebar: Bottom Tab Bar vs Hamburger

Parcel currently uses a hamburger `Sheet` drawer on mobile. Hamburger menus reduce feature discoverability by 50%+ (Nielsen Norman Group). Investors in the field need instant access.

Every premium mobile finance app (Mercury, Robinhood, Stripe Dashboard) uses a **bottom tab bar**: thumb-zone placement, persistent context, premium native feel.

**Recommended 5-tab layout:**

| Tab | Icon | Route | Rationale |
|-----|------|-------|-----------|
| Dashboard | `LayoutDashboard` | `/dashboard` | Home base |
| Analyze | `Calculator` | `/analyze` | Primary action |
| Pipeline | `GitBranch` | `/pipeline` | Deal tracking |
| Chat | `MessageSquare` | `/chat` | AI assistant |
| More | `Menu` | sheet | Settings, Docs, Portfolio, Billing |

```tsx
<nav className="md:hidden fixed bottom-0 inset-x-0 z-50
  h-[82px] pb-[env(safe-area-inset-bottom)]
  bg-[#0C0B0A]/80 backdrop-blur-xl border-t border-white/[0.06]">
  <div className="flex items-center justify-around h-[52px]">
    {tabs.map(({ icon: Icon, path, label }) => (
      <Link key={path} to={path} className={cn(
        'flex flex-col items-center gap-0.5 min-w-[64px] py-1',
        active ? 'text-[#8B7AFF]' : 'text-[#F0EDE8]/40'
      )}>
        <Icon size={20} strokeWidth={active ? 2 : 1.5} />
        <span className="text-[10px] font-medium">{label}</span>
      </Link>
    ))}
  </div>
</nav>
```

Key: `env(safe-area-inset-bottom)` for iPhone home indicator, `backdrop-blur-xl` for frosted glass, `border-white/[0.06]` for depth without harshness. Active = violet `#8B7AFF`, inactive = cream at 40%.

---

## 3. Touch Targets on Dark Interfaces

WCAG 2.2 AAA requires 44x44px. On dark UIs, undersized targets are worse because low-contrast surroundings make elements harder to locate. Adjacent targets need 12px gap (8px minimum).

```css
@layer utilities {
  .touch-target    { @apply min-h-[44px] min-w-[44px]; }
  .touch-target-lg { @apply min-h-[48px] min-w-[48px]; }
}
```

**Tap feedback on dark must brighten, not darken:** `.dark .btn:active { background: rgba(255,255,255,0.12); }`. Pair with Framer Motion: `whileTap={{ scale: 0.97 }}`.

Haptic feedback via Vibration API for meaningful actions only:

```ts
function hapticTap(style: 'light' | 'medium' | 'heavy' = 'light') {
  if ('vibrate' in navigator) navigator.vibrate({ light: 10, medium: 20, heavy: 40 }[style])
}
```

---

## 4. Mobile Forms on Dark Backgrounds

**Critical: use `text-base` (16px) on mobile inputs.** iOS Safari auto-zooms the viewport on inputs with font-size < 16px. Parcel's 13px base must be overridden:

```css
@media (max-width: 767px) { input, select, textarea { font-size: 16px !important; } }
```

Dark input pattern -- visible borders, cream text, violet focus ring:

```tsx
<input inputMode="decimal" className="w-full h-12 px-4 rounded-lg
  bg-white/[0.04] border border-white/[0.08] text-[#F0EDE8] text-base
  placeholder:text-[#F0EDE8]/30 focus:border-[#8B7AFF]/50 focus:ring-1 focus:ring-[#8B7AFF]/20" />
```

Use `inputMode="decimal"` (not `type="number"`) for financial fields -- numeric keyboard with decimal point, no spinner arrows. Stack fields single-column below `sm`: `grid grid-cols-1 sm:grid-cols-2 gap-4`.

---

## 5. Mobile Dashboard on Dark: Above-the-Fold

On iPhone 15 (390x844), after top bar (56px) and bottom tab (82px), visible area is ~706px. Priority order:

1. **Greeting + quick action** (48px) -- "Good morning" + "New Analysis" pill
2. **2x2 KPI grid** (200px) -- Deals, Portfolio value, Pipeline active, Avg CoC
3. **Recent activity** (remaining) -- Scrollable deal movements

```tsx
<div className="grid grid-cols-2 gap-3 px-4">
  <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-4">
    <p className="text-[11px] uppercase tracking-wider text-[#F0EDE8]/40 mb-1">Deals</p>
    <p className="text-xl font-semibold text-[#F0EDE8] tabular-nums">24</p>
  </div>
</div>
```

---

## 6. Mobile Pipeline on Dark: Swipe Gestures

Parcel's `MobilePipeline` horizontally scrollable tabs are correct. Dark theme update:

```tsx
className={isActive
  ? 'bg-[#8B7AFF] text-white shadow-lg shadow-[#8B7AFF]/20'
  : 'bg-white/[0.06] text-[#F0EDE8]/50'}
```

**Swipe between stages** via Framer Motion `drag="x"` with threshold detection (`offset.x < -100` = next stage). **Swipe-to-action on cards** (Apple Mail pattern): `drag="x" dragConstraints={{ left: -120, right: 0 }} dragSnapToOrigin` reveals action buttons (move stage, remove) behind the card.

---

## 7. Mobile Chat on Dark: Full-Screen Treatment

Chat is the most mobile-critical feature -- investors message from cars, at properties, between meetings. Use `noPadding` AppShell mode, full-height flex layout:

```tsx
<div className="flex flex-col h-full">
  <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">{/* messages */}</div>
  <div className="shrink-0 border-t border-white/[0.06] px-4 py-3
    pb-[calc(12px+env(safe-area-inset-bottom))] bg-[#0C0B0A]/95 backdrop-blur-md">
    <div className="flex items-end gap-2">
      <textarea className="flex-1 resize-none rounded-xl bg-white/[0.06] border border-white/[0.08]
        text-[#F0EDE8] text-base px-4 py-3 max-h-[120px]" placeholder="Ask about a deal..." />
      <button className="w-10 h-10 rounded-xl bg-[#8B7AFF]">
        <Send size={18} className="text-white" />
      </button>
    </div>
  </div>
</div>
```

Message styling: user = `bg-[#8B7AFF]/15`, AI = `bg-white/[0.04]`. Full-width rows (not bubbles) feel more premium and use the narrow mobile viewport better.

---

## 8. PWA Dark Mode Configuration

```html
<meta name="theme-color" content="#0C0B0A" media="(prefers-color-scheme: dark)" />
<meta name="theme-color" content="#F9FAFB" media="(prefers-color-scheme: light)" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-capable" content="yes" />
```

Manifest: `theme_color` and `background_color` both `#0C0B0A`. `black-translucent` on iOS overlays status bar content seamlessly -- add `pt-[env(safe-area-inset-top)]`. App icon: dark violet `#1A1640` background with white "P" glyph; maskable variant within inner 80% safe zone.

---

## 9. Responsive Breakpoints

| Breakpoint | Layout |
|------------|--------|
| `lg` (1024px+) | Sidebar 240px, max-w-7xl, 4-col KPI grid, Kanban columns |
| `md` (768-1023px) | Sidebar 240px, 2-col KPIs, horizontal-scroll Kanban |
| `sm` (640-767px) | No sidebar, bottom tab bar, 2-col KPIs, tabbed pipeline |
| `<640px` | Bottom tab bar, 1-col forms, stacked pipeline cards |

```tsx
<aside className="hidden md:flex w-60 ...">       {/* sidebar: md+ only */}
<nav className="md:hidden fixed bottom-0 ...">     {/* tab bar: below md */}
<div className="px-4 md:px-8 lg:px-10">            {/* scaling padding */}
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
<main className="pb-[82px] md:pb-0">               {/* tab bar clearance */}
```

---

## 10. Dark Mode on Bright Sunny Days

Ambient light reduces perceived contrast from ~15:1 indoor to ~3:1 outdoor. Dark UIs suffer more than light because reflections wash out dark surfaces disproportionately.

**Mitigations:** (1) `#F0EDE8` on `#0C0B0A` achieves ~16.5:1 ratio -- survives halved outdoor perception. (2) Financial numbers and KPIs at 100% opacity always; reserve 40% for decorative labels only. (3) Violet `#8B7AFF` has low luminance -- use as backgrounds, not text; when text, use lighter `#B4A9FF`. (4) Keep light theme toggle available in Settings as escape hatch.

---

## 11. Mobile Micro-Interactions

| Action | Haptic | Duration |
|--------|--------|----------|
| Deal analyzed | medium | 20ms |
| Pipeline stage move | light | 10ms |
| Deal closed | heavy | 40ms |
| Destructive confirm | double | 10ms, pause, 10ms |
| Pull-to-refresh release | light | 10ms |

**Pull-to-refresh** on Dashboard, Deals, Pipeline: detect `touchmove` delta > 80px when `scrollY === 0`, show violet spinner, trigger refetch. **Skeleton shimmers on dark**: `rgba(255,255,255,0.03)` to `rgba(255,255,255,0.08)` gradient. **Page transitions**: keep under 200ms on mobile (150ms animate, 100ms exit) for native-feeling speed. Do not interfere with iOS swipe-right-to-go-back gesture.

---

## RECOMMENDATIONS FOR PARCEL

1. **Add bottom tab bar for mobile (< md).** Replace hamburger with 5 tabs (Dashboard, Analyze, Pipeline, Chat, More). Frosted glass `backdrop-blur-xl bg-[#0C0B0A]/80`. Highest single-impact mobile UX change.

2. **Fix mobile input zoom.** Override to `font-size: 16px` on all inputs/selects/textareas at mobile. Current 13px triggers iOS Safari auto-zoom. Use `inputMode="decimal"` for financial fields.

3. **Set OLED-friendly dark surface scale.** `#0C0B0A` bg, `#161514` surface, `#1E1D1B` elevated, `#262523` overlay. Never use `#000000`.

4. **Add PWA meta tags.** `theme-color` with media queries, `black-translucent` status bar, manifest with `#0C0B0A` background. Makes installed PWA feel native.

5. **Enforce 44px touch targets.** Audit all interactive elements below `md`. Pipeline tabs, deal card actions, form labels all need explicit `min-h-[44px]`.

6. **Swipe-to-action on pipeline cards.** Framer Motion `drag="x"` with `dragSnapToOrigin` revealing move/remove buttons. Add 10ms haptic.

7. **Full-screen mobile chat.** `noPadding` AppShell, flex layout, `backdrop-blur-md` input area accounting for tab bar and keyboard. Full-width message rows.

8. **Bottom tab bar content clearance.** All pages need `pb-[82px] md:pb-0` to prevent content hiding behind fixed nav.

9. **Maximize outdoor contrast.** `#F0EDE8` at 100% opacity for all financial data. Reserve low opacity for decorative labels. Use `#B4A9FF` instead of `#8B7AFF` for violet text.

10. **Keep light theme toggle.** Existing `:root` CSS vars already support it. Add Settings toggle or `prefers-color-scheme` auto-switch for outdoor use.

11. **Pull-to-refresh on data pages.** Dashboard, Deals, Pipeline with violet spinner and light haptic. Matches native mobile expectations.

12. **Faster mobile page transitions.** 150ms animate / 100ms exit (down from 250ms). Keep spring easing `cubic-bezier(0.25, 0.1, 0.25, 1)`.
