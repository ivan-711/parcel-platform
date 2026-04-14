# App Shell & Navigation — Light Theme

Implementation-ready specification for Parcel's root layout component. Every class, every pixel, every animation parameter is final. No placeholders.

---

## 1. AppShell: Structural Layout

### Architecture

```
+--[240px Sidebar]--+---[Main Area: #F8FAFC]------------------------------+
|  bg-white         |  Topbar (56px, bg-white, border-b)                  |
|  border-r         |  +-------------------------------------------------+
|  border-gray-200  |  |  Content (scrollable, max-w-7xl default)         |
|                   |  |  px-6 py-6 md:px-8 lg:px-10                      |
|  [Logo]           |  |                                                   |
|  [Nav Groups]     |  |  { children }                                     |
|  [Plan Badge]     |  |                                                   |
|  [User Section]   |  +-------------------------------------------------+
+-------------------+-+---------------------------------------------------+
```

### Root Container

```tsx
<div className="flex h-screen bg-gray-50 overflow-hidden">
  <Sidebar />
  <MobileSidebar open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
  <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
    <Topbar />
    <main className={cn(
      'flex-1 outline-none',
      noPadding
        ? 'overflow-hidden'
        : 'overflow-y-auto'
    )}>
      {!noPadding && !fullWidth ? (
        <div className="max-w-7xl mx-auto px-4 py-5 md:px-8 md:py-6 lg:px-10">
          {children}
        </div>
      ) : (
        children
      )}
    </main>
  </div>
</div>
```

### Props Interface

```tsx
interface AppShellProps {
  children: React.ReactNode
  title?: string
  noPadding?: boolean    // Chat page: no padding, no scroll, child controls layout
  fullWidth?: boolean    // Pipeline, Compare: padding but no max-w-7xl constraint
  breadcrumbs?: { label: string; href?: string }[]
  actions?: React.ReactNode  // Slot for page-level action buttons in topbar
}
```

### Background Colors

| Zone | Color | Tailwind | Hex |
|------|-------|----------|-----|
| Sidebar | White | `bg-white` | `#FFFFFF` |
| Topbar | White | `bg-white` | `#FFFFFF` |
| Main content area | Slate-50 | `bg-gray-50` | `#F9FAFB` |
| Cards / elevated surfaces | White | `bg-white` | `#FFFFFF` |

The two-tone approach (white chrome, gray-50 content) gives cards natural elevation without heavy shadows. Aligns with Mercury, Vercel, and Stripe patterns.

---

## 2. Sidebar

### Dimensions

- Width: **240px** (`w-60`)
- Full viewport height: `h-screen sticky top-0`
- Internal padding: `p-3` for the nav area
- Hidden below `md:` (768px), replaced by hamburger drawer

### Structure

```tsx
function Sidebar() {
  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col
      bg-white border-r border-gray-200 h-screen sticky top-0">

      {/* Logo area: 56px tall */}
      <SidebarLogo />

      {/* Navigation groups */}
      <nav className="flex-1 overflow-y-auto px-3 pt-4 space-y-6"
        aria-label="Main navigation">
        <NavSection items={NAV_ANALYZE} />
        <SidebarDivider />
        <NavSection items={NAV_MANAGE} />
        <SidebarDivider />
        <NavSection items={NAV_AI} />
        <SidebarDivider />
        <NavSection items={NAV_ACCOUNT} />
      </nav>

      {/* Plan badge + trial banner pinned to bottom */}
      <div className="mt-auto border-t border-gray-200">
        <TrialBanner />
        <PlanBadge />
      </div>
    </aside>
  )
}
```

### Logo Area

```tsx
function SidebarLogo() {
  const user = useAuthStore((s) => s.user)
  const to = user?.email === 'demo@parcel.app' ? '/' : '/dashboard'

  return (
    <div className="h-14 flex items-center px-4 border-b border-gray-100">
      <Link
        to={to}
        className="flex items-center gap-2 group"
      >
        {/* Logo mark: 28x28 indigo square with rounded corners */}
        <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center
          group-hover:bg-indigo-600 transition-colors">
          <span className="text-white text-xs font-bold">P</span>
        </div>
        <span className="text-[15px] font-semibold text-gray-900 tracking-tight">
          Parcel
        </span>
      </Link>
    </div>
  )
}
```

The logo uses a compact indigo mark plus wordmark. The `border-b border-gray-100` is lighter than the sidebar's outer border to create a subtle separation without visual heaviness.

### Sidebar Divider

```tsx
function SidebarDivider() {
  return <hr className="border-t border-gray-100 mx-1" />
}
```

Uses `gray-100` (not `gray-200`) so dividers recede behind nav items. The `mx-1` gives slight inset from sidebar edges.

---

## 3. Navigation Items & Grouping

### Groups

No uppercase section labels. Groups are separated by thin dividers only (Mercury pattern). With 10 items across 4 groups, labels add visual noise without aiding scanability.

```tsx
// ── Analyze ──
const NAV_ANALYZE: NavItem[] = [
  { label: 'Dashboard',    path: '/dashboard',  icon: LayoutDashboard },
  { label: 'New Analysis', path: '/analyze',    icon: Calculator },
]

// ── Manage ──
const NAV_MANAGE: NavItem[] = [
  { label: 'My Deals',  path: '/deals',     icon: FolderOpen },
  { label: 'Pipeline',  path: '/pipeline',  icon: GitBranch },
  { label: 'Portfolio', path: '/portfolio', icon: BarChart3 },
]

// ── AI ──
const NAV_AI: NavItem[] = [
  { label: 'Chat',      path: '/chat',      icon: MessageSquare },
  { label: 'Documents', path: '/documents', icon: FileText },
]

// ── Account ──
const NAV_ACCOUNT: NavItem[] = [
  { label: 'Settings', path: '/settings', icon: Settings },
]
```

**Grouping rationale:**
- **Analyze** (Dashboard + New Analysis): The entry points. Dashboard is home; New Analysis is the primary CTA.
- **Manage** (My Deals, Pipeline, Portfolio): Where deals live after analysis. Natural workflow progression.
- **AI** (Chat, Documents): AI-powered tools. Chat is the AI specialist; Documents is the upload/storage layer.
- **Account** (Settings): User configuration. Billing will be added here when implemented.

Compare is removed from the sidebar. It is accessed contextually from the My Deals page (select 2+ deals, click "Compare"). It does not warrant a permanent nav slot.

### NavSection Component

```tsx
function NavSection({ items, onNavigate }: {
  items: NavItem[]
  onNavigate?: () => void
}) {
  const { pathname } = useLocation()

  return (
    <div className="space-y-0.5">
      {items.map((item) => {
        const active = item.path === '/dashboard'
          ? pathname === item.path
          : pathname.startsWith(item.path)
        const Icon = item.icon

        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm',
              'transition-colors duration-150',
              active
                ? 'bg-indigo-50 text-gray-900 font-medium'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
            )}
          >
            <Icon
              size={18}
              className={cn(
                'shrink-0 transition-colors duration-150',
                active ? 'text-indigo-600' : 'text-gray-400'
              )}
            />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
```

### Active State

No left border accent. The active item uses:
- Background: `bg-indigo-50` (#EEF0FF from token system)
- Text: `text-gray-900` (#101828) with `font-medium`
- Icon: `text-indigo-600` (#4F46E5)

This is cleaner in light theme than the previous `border-l-2` approach from dark mode. The indigo tint is visible but restrained.

### Hover State

- Background: `bg-gray-50` (#F9FAFB)
- Text: `text-gray-700` (#344054)
- Duration: `150ms`

### Idle State

- Text: `text-gray-500` (#667085)
- Icon: `text-gray-400` (#98A2B3)

### Icon Size

Increased from 16px to **18px**. At 16px, icons feel undersized next to 14px text in a 240px sidebar. 18px provides better visual balance. Icons use `shrink-0` to prevent compression.

---

## 4. PlanBadge & TrialBanner

### TrialBanner

Shown only when the user is on a free trial with days remaining. Pinned above PlanBadge in the sidebar footer.

```tsx
function TrialBanner() {
  const user = useAuthStore((s) => s.user)
  if (!user?.trial_ends_at) return null

  const daysLeft = Math.max(0, Math.ceil(
    (new Date(user.trial_ends_at).getTime() - Date.now()) / 86_400_000
  ))
  if (daysLeft <= 0) return null

  const urgent = daysLeft <= 3

  return (
    <div className={cn(
      'mx-3 mt-3 px-3 py-2.5 rounded-lg text-xs',
      urgent
        ? 'bg-amber-50 border border-amber-200 text-amber-800'
        : 'bg-indigo-50 border border-indigo-100 text-indigo-700'
    )}>
      <p className="font-medium">
        {daysLeft} day{daysLeft !== 1 ? 's' : ''} left in trial
      </p>
      <Link
        to="/settings/billing"
        className={cn(
          'mt-1 inline-flex items-center text-xs font-medium',
          'underline underline-offset-2 decoration-1',
          urgent
            ? 'text-amber-900 hover:text-amber-950'
            : 'text-indigo-600 hover:text-indigo-700'
        )}
      >
        Upgrade now
      </Link>
    </div>
  )
}
```

**Color logic:** Default state uses soft indigo (matches accent). When 3 or fewer days remain, switches to amber for urgency without red panic.

### PlanBadge

Always visible. Shows current plan tier in the sidebar footer.

```tsx
function PlanBadge() {
  const user = useAuthStore((s) => s.user)
  const planLabel = user?.plan === 'pro' ? 'Pro' : 'Free'
  const isPro = user?.plan === 'pro'

  return (
    <div className="px-3 py-3 flex items-center gap-2">
      <div className={cn(
        'px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wide',
        isPro
          ? 'bg-indigo-500 text-white'
          : 'bg-gray-100 text-gray-500'
      )}>
        {planLabel}
      </div>
      {!isPro && (
        <Link
          to="/settings/billing"
          className="text-xs text-indigo-600 hover:text-indigo-700
            font-medium transition-colors"
        >
          Upgrade
        </Link>
      )}
    </div>
  )
}
```

**Pro badge:** Solid indigo pill with white text. Compact reward signal.
**Free badge:** Gray pill with "Upgrade" link beside it.

---

## 5. Top Bar

### Dimensions

- Height: **56px** (`h-14`)
- Background: `bg-white`
- Bottom border: `border-b border-gray-200`
- Horizontal padding: `px-4 md:px-6 lg:px-8`

### Structure

```tsx
function Topbar({
  title,
  breadcrumbs,
  actions,
  onMenuToggle,
  onSearchClick,
}: {
  title?: string
  breadcrumbs?: { label: string; href?: string }[]
  actions?: React.ReactNode
  onMenuToggle: () => void
  onSearchClick: () => void
}) {
  const user = useAuthStore((s) => s.user)

  return (
    <header className="h-14 shrink-0 flex items-center justify-between
      px-4 md:px-6 lg:px-8 bg-white border-b border-gray-200">

      {/* Left side */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuToggle}
          aria-label="Open navigation"
          className="md:hidden flex items-center justify-center
            w-9 h-9 rounded-lg text-gray-500
            hover:text-gray-700 hover:bg-gray-50
            transition-colors cursor-pointer"
        >
          <Menu size={20} />
        </button>

        {/* Mobile logo — visible only below md */}
        <Link
          to={user?.email === 'demo@parcel.app' ? '/' : '/dashboard'}
          className="md:hidden flex items-center gap-1.5"
        >
          <div className="w-6 h-6 rounded-md bg-indigo-500 flex items-center justify-center">
            <span className="text-white text-[10px] font-bold">P</span>
          </div>
        </Link>

        {/* Breadcrumbs + page title */}
        <div className="min-w-0">
          {breadcrumbs && breadcrumbs.length > 0 ? (
            <nav aria-label="Breadcrumb"
              className="flex items-center gap-1.5 text-sm">
              {breadcrumbs.map((crumb, i) => {
                const isLast = i === breadcrumbs.length - 1
                return (
                  <span key={i} className="flex items-center gap-1.5">
                    {i > 0 && (
                      <ChevronRight
                        size={14}
                        className="text-gray-300 shrink-0"
                      />
                    )}
                    {isLast || !crumb.href ? (
                      <span
                        className="text-gray-900 font-medium truncate"
                        aria-current={isLast ? 'page' : undefined}
                      >
                        {crumb.label}
                      </span>
                    ) : (
                      <Link
                        to={crumb.href}
                        className="text-gray-500 hover:text-gray-700
                          transition-colors truncate"
                      >
                        {crumb.label}
                      </Link>
                    )}
                  </span>
                )
              })}
            </nav>
          ) : (
            <h1 className="text-sm font-semibold text-gray-900 truncate">
              {title ?? 'Parcel'}
            </h1>
          )}
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        {/* Page-level action buttons */}
        {actions && (
          <div className="hidden sm:flex items-center gap-2">
            {actions}
          </div>
        )}

        {/* Search pill */}
        <button
          onClick={onSearchClick}
          aria-label="Open command palette"
          className="flex items-center gap-2 h-8 px-2.5 md:px-3
            rounded-lg border border-gray-200 bg-gray-50
            text-gray-400 text-xs
            hover:border-gray-300 hover:bg-gray-100
            transition-colors cursor-pointer"
        >
          <Search size={14} className="shrink-0" />
          <span className="hidden md:inline text-gray-500">Search...</span>
          <kbd className="hidden md:inline text-[10px] font-mono
            bg-white border border-gray-200 px-1.5 py-0.5 rounded
            text-gray-400">
            &#8984;K
          </kbd>
        </button>

        {/* User avatar + dropdown */}
        <UserMenu />
      </div>
    </header>
  )
}
```

### Hamburger Button

Increased from 32px to **36px** (`w-9 h-9`). The 32px button was below the 44px touch target minimum for mobile. At 36px with the `gap-3` padding context, the effective tap area reaches 44px. A `rounded-lg` with `hover:bg-gray-50` gives clear affordance.

### Search Pill

Updated from dark tokens to light:
- Border: `border-gray-200` (idle), `border-gray-300` (hover)
- Background: `bg-gray-50` (idle), `bg-gray-100` (hover)
- Text: `text-gray-400` for icon, `text-gray-500` for "Search..."
- Kbd badge: `bg-white border border-gray-200 text-gray-400`

### Breadcrumb vs Title

The topbar renders **either** breadcrumbs **or** a plain page title, never both simultaneously. Breadcrumbs inherently include the page title as the last segment. When `breadcrumbs` prop is provided, the title prop is ignored.

---

## 6. UserMenu (Updated for Light Theme)

```tsx
function UserMenu() {
  const user = useAuthStore((s) => s.user)
  const { mutate: logout, isPending } = useLogout()

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label="User menu"
          className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200
            flex items-center justify-center
            hover:bg-indigo-200 transition-colors cursor-pointer"
        >
          <span className="text-xs font-semibold text-indigo-600">{initials}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8}
        className="w-56 p-1.5 bg-white border border-gray-200 shadow-lg rounded-xl">
        {/* User info */}
        <div className="px-2.5 py-2 border-b border-gray-100 mb-1">
          <p className="text-sm font-medium text-gray-900 truncate">
            {user?.name ?? 'User'}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {user?.email ?? ''}
          </p>
        </div>

        {/* Links */}
        <Link
          to="/settings"
          className="flex items-center gap-2 px-2.5 py-2 rounded-lg
            text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Settings size={14} className="text-gray-400" />
          Settings
        </Link>

        {/* Logout */}
        <button
          onClick={() => logout()}
          disabled={isPending}
          className="flex w-full items-center gap-2 px-2.5 py-2 rounded-lg
            text-sm text-red-600 hover:bg-red-50
            transition-colors cursor-pointer disabled:opacity-50"
        >
          <LogOut size={14} />
          {isPending ? 'Logging out...' : 'Log out'}
        </button>
      </PopoverContent>
    </Popover>
  )
}
```

Changes from dark theme:
- Avatar: `bg-indigo-100 border-indigo-200` instead of `bg-accent-primary/20`
- Popover: `bg-white border-gray-200 shadow-lg` instead of `bg-app-surface`
- Logout: `text-red-600 hover:bg-red-50` instead of `text-red-400 hover:bg-red-500/10`
- Separator: `border-gray-100` (lighter than card borders for visual hierarchy)

---

## 7. Mobile Sidebar Drawer

### Implementation

```tsx
function MobileSidebar({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const closeDrawer = () => onOpenChange(false)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-[280px] p-0 bg-white border-r border-gray-200"
      >
        <SheetTitle className="sr-only">Navigation</SheetTitle>

        <SidebarLogo />

        <nav className="flex-1 overflow-y-auto px-3 pt-4 space-y-6"
          aria-label="Main navigation">
          <NavSection items={NAV_ANALYZE} onNavigate={closeDrawer} />
          <SidebarDivider />
          <NavSection items={NAV_MANAGE} onNavigate={closeDrawer} />
          <SidebarDivider />
          <NavSection items={NAV_AI} onNavigate={closeDrawer} />
          <SidebarDivider />
          <NavSection items={NAV_ACCOUNT} onNavigate={closeDrawer} />
        </nav>

        <div className="mt-auto border-t border-gray-200">
          <TrialBanner />
          <PlanBadge />
        </div>
      </SheetContent>
    </Sheet>
  )
}
```

### Mobile Drawer Differences from Desktop Sidebar

| Property | Desktop Sidebar | Mobile Drawer |
|----------|----------------|---------------|
| Width | 240px (`w-60`) | 280px (`w-[280px]`) |
| Visibility | `hidden md:flex` | Sheet component, opens on hamburger tap |
| Close behavior | Always visible | Closes on nav item click, overlay tap, swipe left |
| Background | Same (`bg-white`) | Same, with Sheet's scrim overlay |

The mobile drawer is 280px (wider than desktop's 240px) because mobile users benefit from larger touch targets when the drawer overlays content rather than sitting beside it.

### Sheet Overlay

The shadcn Sheet overlay should be updated for light theme:
- Scrim: `bg-black/40` (lighter than the dark theme's `bg-black/60`)
- `backdrop-blur-sm` for a subtle frosted effect

---

## 8. Responsive Breakpoints

### Breakpoint Map

| Breakpoint | Width | Sidebar | Content Layout | Nav Mode |
|------------|-------|---------|----------------|----------|
| Base (0px) | 0-639px | Hidden | Single column | Hamburger drawer |
| `sm:` | 640-767px | Hidden | Two-column grids | Hamburger drawer |
| `md:` | 768-1023px | Fixed 240px | Content: 528px+ | Sidebar |
| `lg:` | 1024-1279px | Fixed 240px | Content: 784px+ | Sidebar |
| `xl:` | 1280-1535px | Fixed 240px | Content hits max-w-7xl | Sidebar |
| `2xl:` | 1536px+ | Fixed 240px | Content centered with margins | Sidebar |

### Key Breakpoint Decisions

**`md:` (768px) is the sidebar pivot.** Below 768px, the sidebar is fully hidden and nav is via the hamburger drawer. This is the correct threshold because:
- iPad Mini in portrait: 768px -- sidebar appears, content has 528px (tight but workable)
- Large phones in landscape: ~640-736px -- sidebar would leave only ~400px for content (unusable)

**No bottom tab bar.** The research suggested one for field use, but the hamburger drawer is sufficient for Parcel's 8-item nav. A bottom tab bar consumes 64px of vertical space permanently, which hurts data-dense pages (results tables, chat). The hamburger adds one extra tap but preserves vertical real estate.

### Content Area by Breakpoint

```tsx
// Standard pages (Dashboard, My Deals, Results, Settings, Portfolio)
<div className="max-w-7xl mx-auto px-4 py-5 md:px-8 md:py-6 lg:px-10">
  {children}
</div>

// Full-width pages (Pipeline, Chat, Compare)
// No max-w wrapper, no horizontal padding from AppShell
// Each page controls its own padding internally
```

### Page-Level fullWidth Usage

| Page | `fullWidth` | `noPadding` | Reason |
|------|-------------|-------------|--------|
| Dashboard | no | no | Standard content page |
| New Analysis | no | no | Form, benefits from max-w |
| Results | no | no | KPI cards + table, max-w prevents stretching |
| My Deals | no | no | Table + search, standard width |
| Pipeline | yes | no | Kanban columns need horizontal space |
| Portfolio | no | no | Standard content |
| Chat | - | yes | Full-bleed, manages own layout |
| Documents | no | no | Standard content |
| Settings | no | no | Form, narrow is better |
| Compare | yes | no | Wide comparison table |

---

## 9. Framer Motion Transitions

### Page Transition (Content Area)

```tsx
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation } from 'react-router-dom'

const pageVariants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.25,
      ease: [0.25, 0.1, 0.25, 1], // cubic-bezier for smooth decel
    },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: {
      duration: 0.15,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
}

// Inside AppShell, wrapping the content area:
function AnimatedContent({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
```

**Parameters:**
- Enter: 250ms, fade in + 8px upward slide (content rises into place)
- Exit: 150ms, fade out + 4px upward drift (content lifts away quickly)
- `mode="wait"` ensures exit completes before enter begins (prevents layout doubling)
- `initial={false}` skips animation on first mount (app load should be instant)

### Sidebar Nav Item Hover

No Framer Motion needed. Tailwind's `transition-colors duration-150` on the Link element handles the hover bg/text color change at 150ms. Adding Framer Motion for a simple color change would be over-engineering.

### Mobile Drawer

The shadcn Sheet component handles its own enter/exit animations (slide from left + fade overlay). No additional Framer Motion configuration needed. The Sheet uses CSS transforms internally, which are hardware-accelerated.

### Sidebar Collapse (Future Enhancement)

When collapsible mode is implemented:

```tsx
const sidebarVariants = {
  expanded: {
    width: 240,
    transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] },
  },
  collapsed: {
    width: 0,
    transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] },
  },
}

<motion.aside
  variants={sidebarVariants}
  animate={collapsed ? 'collapsed' : 'expanded'}
  className="hidden md:flex shrink-0 flex-col overflow-hidden
    bg-white border-r border-gray-200 h-screen sticky top-0"
>
  {/* inner content with min-w-[240px] to prevent text wrapping during animation */}
  <div className="min-w-60">
    ...
  </div>
</motion.aside>
```

The `overflow-hidden` on the aside clips content as width shrinks to 0. The inner `min-w-60` prevents label text from reflowing during the transition. Collapse state persists to `localStorage` via a `useSidebarCollapsed` hook.

Toggle button appears as a floating pill at the left edge of the content area when sidebar is collapsed:

```tsx
{collapsed && (
  <motion.button
    initial={{ opacity: 0, x: -8 }}
    animate={{ opacity: 1, x: 0 }}
    onClick={() => setCollapsed(false)}
    className="fixed top-4 left-4 z-40 w-8 h-8 rounded-lg
      bg-white border border-gray-200 shadow-sm
      flex items-center justify-center
      hover:bg-gray-50 transition-colors cursor-pointer"
    aria-label="Expand sidebar"
  >
    <PanelLeftOpen size={16} className="text-gray-500" />
  </motion.button>
)}
```

---

## 10. Complete JSX — AppShell Component

```tsx
import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Calculator,
  FolderOpen,
  GitBranch,
  BarChart3,
  MessageSquare,
  FileText,
  Settings,
  LogOut,
  Menu,
  Search,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useLogout } from '@/hooks/useAuth'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { CommandPalette } from '@/components/command-palette'

/* ─── Types ─── */

interface AppShellProps {
  children: React.ReactNode
  title?: string
  noPadding?: boolean
  fullWidth?: boolean
  breadcrumbs?: { label: string; href?: string }[]
  actions?: React.ReactNode
}

interface NavItem {
  label: string
  path: string
  icon: React.ElementType
}

/* ─── Nav Data ─── */

const NAV_ANALYZE: NavItem[] = [
  { label: 'Dashboard',    path: '/dashboard', icon: LayoutDashboard },
  { label: 'New Analysis', path: '/analyze',   icon: Calculator },
]

const NAV_MANAGE: NavItem[] = [
  { label: 'My Deals',  path: '/deals',     icon: FolderOpen },
  { label: 'Pipeline',  path: '/pipeline',  icon: GitBranch },
  { label: 'Portfolio', path: '/portfolio', icon: BarChart3 },
]

const NAV_AI: NavItem[] = [
  { label: 'Chat',      path: '/chat',      icon: MessageSquare },
  { label: 'Documents', path: '/documents', icon: FileText },
]

const NAV_ACCOUNT: NavItem[] = [
  { label: 'Settings', path: '/settings', icon: Settings },
]

/* ─── Sidebar Primitives ─── */

function SidebarLogo() {
  const user = useAuthStore((s) => s.user)
  const to = user?.email === 'demo@parcel.app' ? '/' : '/dashboard'

  return (
    <div className="h-14 flex items-center px-4 border-b border-gray-100">
      <Link to={to} className="flex items-center gap-2 group">
        <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center
          group-hover:bg-indigo-600 transition-colors">
          <span className="text-white text-xs font-bold">P</span>
        </div>
        <span className="text-[15px] font-semibold text-gray-900 tracking-tight">
          Parcel
        </span>
      </Link>
    </div>
  )
}

function SidebarDivider() {
  return <hr className="border-t border-gray-100 mx-1" />
}

function NavSection({
  items,
  onNavigate,
}: {
  items: NavItem[]
  onNavigate?: () => void
}) {
  const { pathname } = useLocation()

  return (
    <div className="space-y-0.5">
      {items.map((item) => {
        const active =
          item.path === '/dashboard'
            ? pathname === item.path
            : pathname.startsWith(item.path)
        const Icon = item.icon

        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm',
              'transition-colors duration-150',
              active
                ? 'bg-indigo-50 text-gray-900 font-medium'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
            )}
          >
            <Icon
              size={18}
              className={cn(
                'shrink-0 transition-colors duration-150',
                active ? 'text-indigo-600' : 'text-gray-400'
              )}
            />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </div>
  )
}

/* ─── Trial Banner & Plan Badge ─── */

function TrialBanner() {
  const user = useAuthStore((s) => s.user)
  if (!user?.trial_ends_at) return null

  const daysLeft = Math.max(
    0,
    Math.ceil(
      (new Date(user.trial_ends_at).getTime() - Date.now()) / 86_400_000
    )
  )
  if (daysLeft <= 0) return null

  const urgent = daysLeft <= 3

  return (
    <div
      className={cn(
        'mx-3 mt-3 px-3 py-2.5 rounded-lg text-xs',
        urgent
          ? 'bg-amber-50 border border-amber-200 text-amber-800'
          : 'bg-indigo-50 border border-indigo-100 text-indigo-700'
      )}
    >
      <p className="font-medium">
        {daysLeft} day{daysLeft !== 1 ? 's' : ''} left in trial
      </p>
      <Link
        to="/settings/billing"
        className={cn(
          'mt-1 inline-flex items-center text-xs font-medium',
          'underline underline-offset-2 decoration-1',
          urgent
            ? 'text-amber-900 hover:text-amber-950'
            : 'text-indigo-600 hover:text-indigo-700'
        )}
      >
        Upgrade now
      </Link>
    </div>
  )
}

function PlanBadge() {
  const user = useAuthStore((s) => s.user)
  const planLabel = user?.plan === 'pro' ? 'Pro' : 'Free'
  const isPro = user?.plan === 'pro'

  return (
    <div className="px-3 py-3 flex items-center gap-2">
      <div
        className={cn(
          'px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wide',
          isPro
            ? 'bg-indigo-500 text-white'
            : 'bg-gray-100 text-gray-500'
        )}
      >
        {planLabel}
      </div>
      {!isPro && (
        <Link
          to="/settings/billing"
          className="text-xs text-indigo-600 hover:text-indigo-700
            font-medium transition-colors"
        >
          Upgrade
        </Link>
      )}
    </div>
  )
}

/* ─── Desktop Sidebar ─── */

function Sidebar() {
  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col
      bg-white border-r border-gray-200 h-screen sticky top-0">
      <SidebarLogo />

      <nav
        className="flex-1 overflow-y-auto px-3 pt-4 space-y-6"
        aria-label="Main navigation"
      >
        <NavSection items={NAV_ANALYZE} />
        <SidebarDivider />
        <NavSection items={NAV_MANAGE} />
        <SidebarDivider />
        <NavSection items={NAV_AI} />
        <SidebarDivider />
        <NavSection items={NAV_ACCOUNT} />
      </nav>

      <div className="mt-auto border-t border-gray-200">
        <TrialBanner />
        <PlanBadge />
      </div>
    </aside>
  )
}

/* ─── Mobile Sidebar Drawer ─── */

function MobileSidebar({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const closeDrawer = () => onOpenChange(false)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-[280px] p-0 bg-white border-r border-gray-200"
      >
        <SheetTitle className="sr-only">Navigation</SheetTitle>

        <SidebarLogo />

        <nav
          className="flex-1 overflow-y-auto px-3 pt-4 space-y-6"
          aria-label="Main navigation"
        >
          <NavSection items={NAV_ANALYZE} onNavigate={closeDrawer} />
          <SidebarDivider />
          <NavSection items={NAV_MANAGE} onNavigate={closeDrawer} />
          <SidebarDivider />
          <NavSection items={NAV_AI} onNavigate={closeDrawer} />
          <SidebarDivider />
          <NavSection items={NAV_ACCOUNT} onNavigate={closeDrawer} />
        </nav>

        <div className="mt-auto border-t border-gray-200">
          <TrialBanner />
          <PlanBadge />
        </div>
      </SheetContent>
    </Sheet>
  )
}

/* ─── User Menu ─── */

function UserMenu() {
  const user = useAuthStore((s) => s.user)
  const { mutate: logout, isPending } = useLogout()

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U'

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label="User menu"
          className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200
            flex items-center justify-center
            hover:bg-indigo-200 transition-colors cursor-pointer"
        >
          <span className="text-xs font-semibold text-indigo-600">
            {initials}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-56 p-1.5 bg-white border border-gray-200
          shadow-lg rounded-xl"
      >
        <div className="px-2.5 py-2 border-b border-gray-100 mb-1">
          <p className="text-sm font-medium text-gray-900 truncate">
            {user?.name ?? 'User'}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {user?.email ?? ''}
          </p>
        </div>
        <Link
          to="/settings"
          className="flex items-center gap-2 px-2.5 py-2 rounded-lg
            text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Settings size={14} className="text-gray-400" />
          Settings
        </Link>
        <button
          onClick={() => logout()}
          disabled={isPending}
          className="flex w-full items-center gap-2 px-2.5 py-2 rounded-lg
            text-sm text-red-600 hover:bg-red-50
            transition-colors cursor-pointer disabled:opacity-50"
        >
          <LogOut size={14} />
          {isPending ? 'Logging out...' : 'Log out'}
        </button>
      </PopoverContent>
    </Popover>
  )
}

/* ─── Top Bar ─── */

function Topbar({
  title,
  breadcrumbs,
  actions,
  onMenuToggle,
  onSearchClick,
}: {
  title?: string
  breadcrumbs?: { label: string; href?: string }[]
  actions?: React.ReactNode
  onMenuToggle: () => void
  onSearchClick: () => void
}) {
  const user = useAuthStore((s) => s.user)

  return (
    <header className="h-14 shrink-0 flex items-center justify-between
      px-4 md:px-6 lg:px-8 bg-white border-b border-gray-200">
      {/* Left */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuToggle}
          aria-label="Open navigation"
          className="md:hidden flex items-center justify-center
            w-9 h-9 rounded-lg text-gray-500
            hover:text-gray-700 hover:bg-gray-50
            transition-colors cursor-pointer"
        >
          <Menu size={20} />
        </button>

        <Link
          to={user?.email === 'demo@parcel.app' ? '/' : '/dashboard'}
          className="md:hidden flex items-center gap-1.5"
        >
          <div className="w-6 h-6 rounded-md bg-indigo-500
            flex items-center justify-center">
            <span className="text-white text-[10px] font-bold">P</span>
          </div>
        </Link>

        <div className="min-w-0">
          {breadcrumbs && breadcrumbs.length > 0 ? (
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-1.5 text-sm"
            >
              {breadcrumbs.map((crumb, i) => {
                const isLast = i === breadcrumbs.length - 1
                return (
                  <span key={i} className="flex items-center gap-1.5">
                    {i > 0 && (
                      <ChevronRight
                        size={14}
                        className="text-gray-300 shrink-0"
                      />
                    )}
                    {isLast || !crumb.href ? (
                      <span
                        className="text-gray-900 font-medium truncate"
                        aria-current={isLast ? 'page' : undefined}
                      >
                        {crumb.label}
                      </span>
                    ) : (
                      <Link
                        to={crumb.href}
                        className="text-gray-500 hover:text-gray-700
                          transition-colors truncate"
                      >
                        {crumb.label}
                      </Link>
                    )}
                  </span>
                )
              })}
            </nav>
          ) : (
            <h1 className="text-sm font-semibold text-gray-900 truncate">
              {title ?? 'Parcel'}
            </h1>
          )}
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        {actions && (
          <div className="hidden sm:flex items-center gap-2">{actions}</div>
        )}
        <button
          onClick={onSearchClick}
          aria-label="Open command palette"
          className="flex items-center gap-2 h-8 px-2.5 md:px-3
            rounded-lg border border-gray-200 bg-gray-50
            text-gray-400 text-xs
            hover:border-gray-300 hover:bg-gray-100
            transition-colors cursor-pointer"
        >
          <Search size={14} className="shrink-0" />
          <span className="hidden md:inline text-gray-500">Search...</span>
          <kbd className="hidden md:inline text-[10px] font-mono
            bg-white border border-gray-200 px-1.5 py-0.5 rounded
            text-gray-400">
            &#8984;K
          </kbd>
        </button>
        <UserMenu />
      </div>
    </header>
  )
}

/* ─── Page Transition ─── */

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: 0.15, ease: [0.25, 0.1, 0.25, 1] },
  },
}

/* ─── AppShell (Root Export) ─── */

export function AppShell({
  children,
  title,
  noPadding,
  fullWidth,
  breadcrumbs,
  actions,
}: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const mainRef = useRef<HTMLElement>(null)
  const { pathname } = useLocation()

  /* Focus management for screen readers on route change */
  useEffect(() => {
    const main = mainRef.current
    if (!main) return
    const heading = main.querySelector<HTMLElement>('h1')
    if (heading) {
      heading.setAttribute('tabindex', '-1')
      heading.focus({ preventScroll: true })
    } else {
      main.focus({ preventScroll: true })
    }
  }, [pathname])

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Skip nav */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3
          focus:left-3 focus:z-[100] focus:px-4 focus:py-2
          focus:rounded-lg focus:bg-indigo-500 focus:text-white
          focus:text-sm focus:font-medium focus:shadow-lg
          focus:outline-none"
      >
        Skip to main content
      </a>

      {/* Desktop sidebar */}
      <Sidebar />

      {/* Mobile drawer */}
      <MobileSidebar
        open={mobileNavOpen}
        onOpenChange={setMobileNavOpen}
      />

      {/* Main column */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <Topbar
          title={title}
          breadcrumbs={breadcrumbs}
          actions={actions}
          onMenuToggle={() => setMobileNavOpen(true)}
          onSearchClick={() => setCommandPaletteOpen(true)}
        />

        <main
          ref={mainRef}
          id="main-content"
          tabIndex={-1}
          className={cn(
            'flex-1 outline-none',
            noPadding ? 'overflow-hidden' : 'overflow-y-auto'
          )}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pathname}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="h-full"
            >
              {noPadding ? (
                children
              ) : fullWidth ? (
                <div className="px-4 py-5 md:px-8 md:py-6 lg:px-10">
                  {children}
                </div>
              ) : (
                <div className="max-w-7xl mx-auto px-4 py-5 md:px-8 md:py-6 lg:px-10">
                  {children}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Command palette */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
      />
    </div>
  )
}
```

---

## CRITICAL DECISIONS

### 1. Sidebar width: 240px (not 216px, not 256px)

The current 216px sidebar is 24px narrower than the industry consensus (Mercury, Linear, Notion all use 240px). Labels like "New Analysis" and "Documents" need breathing room, especially with 18px icons and the plan badge. 256px is too generous for 8 items.

**Reversal cost: Low.** Width is a single class change (`w-60`), and no content layout depends on the exact sidebar width since the main area uses `flex-1`.

### 2. No group labels (dividers only)

The existing `NavGroup` renders uppercase 10px section headers ("Main", "Tools", "Account"). These are removed in favor of `<hr>` dividers between groups. With 8 nav items in 4 groups averaging 2 items each, labels add 4 extra visual elements without improving navigation speed. Users scan by icon and label, not by group heading.

**Reversal cost: Low.** Adding labels back requires a `<p>` above each `NavSection`. The divider-only approach is strictly simpler.

### 3. No collapsible sidebar in v1

The research recommends a collapsible sidebar (0px, toggled via button or Cmd+\). This is deferred. The primary beneficiaries are Pipeline (Kanban) and Chat, which already use `fullWidth`/`noPadding` to reclaim the content area. Adding collapse introduces state management (localStorage persistence), a floating expand button, keyboard shortcut registration, and animation complexity.

**Implementation path when needed:** Section 9 of this document provides the complete Framer Motion variant spec. Estimated effort: 2-3 hours.

### 4. No bottom tab bar on mobile

Agent 14 recommended a persistent 5-tab bottom bar for mobile. This is rejected for Parcel because:
- 64px of permanently consumed vertical space hurts data-dense pages (results tables with 15-25 rows, chat messages, pipeline cards)
- Parcel has 8 nav items, not 5. The "More" tab to hold 3 overflow items is inelegant
- The hamburger drawer is one tap away and shows all items with labels
- Field-use investors primarily use Dashboard and Results, which are already the entry points

**Reversal cost: Medium.** Adding a bottom tab bar later requires `pb-16 md:pb-0` on the content area and the tab bar component itself. No existing layout would break.

### 5. Compare removed from sidebar

Compare is a contextual action (select 2+ deals, then compare), not a primary destination. Keeping it in the sidebar creates a dead-end for users who navigate to `/compare` with no deals selected. It remains accessible via:
- My Deals page: select deals, click "Compare Selected"
- Command palette: search "Compare"
- Direct URL: `/compare?deals=id1,id2`

**Reversal cost: Low.** Add one entry to `NAV_MANAGE` array.

### 6. Topbar height: 56px (not 52px)

Increased from 52px to 56px (`h-14`). The extra 4px accommodates the breadcrumb text, search pill, and avatar without vertical crowding. Mercury uses 56px. Stripe uses 60px. The difference is imperceptible to users but prevents elements from feeling pinched.

### 7. Page transitions via Framer Motion AnimatePresence

Every route change animates with a 250ms fade-in + 8px upward slide. This was not in the existing AppShell. The `mode="wait"` ensures clean transitions without layout doubling. `initial={false}` prevents animation on first load.

**Risk:** AnimatePresence with `key={pathname}` re-mounts the entire page content on every route change. React Query caches prevent unnecessary API calls, but component-level state (scroll position, form inputs) will reset. This is the correct behavior for page navigation but could surprise users editing a form who navigate away and back.

### 8. Content max-width: 7xl (1280px) with fullWidth escape hatch

Standard pages are capped at `max-w-7xl` (1280px). On a 1920px screen with a 240px sidebar, this leaves ~200px of whitespace on each side of the content. This prevents data tables and KPI grids from stretching to unreadable widths.

Pages that need full width (Pipeline, Compare) use the `fullWidth` prop to opt out. Chat uses `noPadding` which also removes the wrapper entirely.

### 9. Active nav state: indigo-50 background (no left border)

The existing dark-theme AppShell uses `border-l-2 border-accent-primary` with `rounded-l-none` for the active state. In light theme, this is replaced with `bg-indigo-50` (full rounded-lg, no border accent). Reasons:
- The left border requires `ml-[-1px]` and `pl-[calc(0.75rem-1px)]` hacks to maintain alignment -- fragile
- In light theme, the indigo-50 background tint is visually sufficient to indicate active state
- Mercury, Linear, and Notion all use background tint without border accents in light mode
- The icon color change (gray-400 to indigo-600) provides a secondary active signal

### 10. Icon size: 18px (not 16px)

Nav icons increased from 16px to 18px. At 240px sidebar width with 14px text, 16px icons create an awkward size ratio where icons and text look too similar in scale. 18px gives icons clear visual primacy as navigation landmarks. Lucide icons render crisply at 18px.
