# App Shell & Navigation -- Luxury Dark Redesign

> Spec for Parcel's sidebar, topbar, mobile drawer, page transitions, and chrome components.
> Locked tokens: bg `#0C0B0A`, sidebar `#111110`, border `rgba(255,255,255,0.06)`,
> text `#F0EDE8` cream / `#8A8580` idle, accent `#8B7AFF` violet.
> Reference: Mercury, Linear, Raycast. Agent 01 audit + Agent 14 navigation research.

---

## 1. Sidebar -- Desktop (240px)

Full-height flex column: logo area (pinned top), scrollable nav, user footer (pinned bottom).

```tsx
<aside
  className={cn(
    'hidden md:flex shrink-0 flex-col h-screen sticky top-0',
    'bg-[#111110] border-r border-white/[0.06]',
    'transition-[width] duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)]',
    collapsed ? 'w-16' : 'w-60'
  )}
>
  {/* 1 — Logo area: 56px */}
  <SidebarLogo collapsed={collapsed} onToggle={toggleCollapsed} />

  {/* 2 — Search trigger pill */}
  <div className={cn('px-3', collapsed ? 'px-2 mt-3' : 'mt-3')}>
    <SearchTrigger collapsed={collapsed} onClick={openCommandPalette} />
  </div>

  {/* 3 — Scrollable nav */}
  <nav
    className={cn(
      'flex-1 overflow-y-auto px-3 pt-4 space-y-5',
      'scrollbar-thin scrollbar-thumb-white/[0.06] scrollbar-track-transparent',
      collapsed && 'px-2 space-y-3'
    )}
    aria-label="Main navigation"
  >
    <NavSection items={NAV_ANALYZE} collapsed={collapsed} />
    <SidebarDivider />
    <NavSection items={NAV_MANAGE} collapsed={collapsed} />
    <SidebarDivider />
    <NavSection items={NAV_AI} collapsed={collapsed} />
    <SidebarDivider />
    <NavSection items={NAV_ACCOUNT} collapsed={collapsed} />
  </nav>

  {/* 4 — Trial banner (above footer) */}
  <SidebarTrialBanner collapsed={collapsed} />

  {/* 5 — User footer */}
  <SidebarUserFooter collapsed={collapsed} />
</aside>
```

### Vertical layout budget

| Zone              | Height   | Behavior       |
|-------------------|----------|----------------|
| Logo area         | 56px     | Pinned top     |
| Search trigger    | ~44px    | Pinned below logo (8px padding + 36px pill) |
| Nav scroll area   | flex-1   | Scrolls independently |
| Trial banner      | 0-80px   | Conditionally rendered |
| User footer       | ~56px    | Pinned bottom  |

---

## 2. Logo Area (56px)

The logo row holds the P mark, wordmark (expanded), plan badge (expanded), and collapse toggle.

```tsx
function SidebarLogo({
  collapsed,
  onToggle,
}: {
  collapsed: boolean
  onToggle: () => void
}) {
  const user = useAuthStore((s) => s.user)
  const to = user?.email === 'demo@parcel.app' ? '/' : '/dashboard'

  return (
    <div className="h-14 flex items-center justify-between px-4 border-b border-white/[0.06]">
      <Link to={to} className="flex items-center gap-2.5 group min-w-0">
        {/* P mark with violet ambient glow */}
        <div className="relative shrink-0">
          <div className="w-7 h-7 rounded-lg bg-[#8B7AFF] flex items-center justify-center">
            <span className="text-white text-xs font-bold tracking-tight">P</span>
          </div>
          {/* Ambient glow — subtle radial behind logo mark */}
          <div
            className="absolute inset-0 rounded-lg opacity-40 blur-md -z-10"
            style={{ background: 'radial-gradient(circle, #8B7AFF 0%, transparent 70%)' }}
          />
        </div>

        {/* Wordmark — fades out on collapse */}
        {!collapsed && (
          <motion.span
            initial={false}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.15 }}
            className="text-[15px] font-semibold text-[#F0EDE8] tracking-tight"
          >
            Parcel
          </motion.span>
        )}
      </Link>

      {/* Right side: plan badge (expanded) / collapse toggle */}
      <div className="flex items-center gap-2">
        {!collapsed && user && (
          <PlanBadge planTier={user.plan_tier} trialActive={user.trial_active ?? false} />
        )}
        <button
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'w-6 h-6 rounded-md flex items-center justify-center',
            'text-[#F0EDE8]/20 hover:text-[#F0EDE8]/50 hover:bg-white/[0.04]',
            'transition-colors duration-150 cursor-pointer',
            'opacity-0 group-hover:opacity-100',
            collapsed && 'opacity-100'
          )}
        >
          <ChevronsLeft
            size={14}
            className={cn(
              'transition-transform duration-200',
              collapsed && 'rotate-180'
            )}
          />
        </button>
      </div>
    </div>
  )
}
```

### Accent glow treatment

The P mark uses `bg-[#8B7AFF]` as a solid fill. Behind it, a `::before` pseudo (or sibling div) renders a `radial-gradient` of `#8B7AFF` at 40% opacity with `blur-md`. This creates a warm violet halo visible against `#111110` without being garish. The glow is static (no animation) to maintain institutional restraint.

---

## 3. Nav Item States

Three states, all on `rounded-lg` (8px radius), 36px row height, 18px icons at `strokeWidth={1.5}`.

```tsx
function NavItem({
  item,
  active,
  collapsed,
  notification,
  onNavigate,
}: {
  item: NavItem
  active: boolean
  collapsed: boolean
  notification?: 'dot' | number
  onNavigate?: () => void
}) {
  const Icon = item.icon

  const content = (
    <Link
      to={item.path}
      onClick={onNavigate}
      className={cn(
        'relative flex items-center rounded-lg',
        'transition-colors duration-150',
        collapsed ? 'w-10 h-10 justify-center mx-auto' : 'gap-3 px-3 h-9 text-sm',
        active
          ? 'bg-[#8B7AFF]/[0.08] text-[#F0EDE8] font-medium'
          : 'text-[#8A8580] hover:bg-white/[0.04] hover:text-[#C4C0BA]'
      )}
    >
      <Icon
        size={18}
        strokeWidth={1.5}
        className={cn(
          'shrink-0 transition-colors duration-150',
          active ? 'text-[#8B7AFF]' : 'text-current'
        )}
      />

      {/* Label — hidden when collapsed */}
      {!collapsed && (
        <motion.span
          initial={false}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.15 }}
        >
          {item.label}
        </motion.span>
      )}

      {/* Notification indicator */}
      {notification && !collapsed && (
        <span className="ml-auto">
          <NotificationBadge type={notification} />
        </span>
      )}

      {/* Notification dot in collapsed mode — positioned on icon */}
      {notification && collapsed && (
        <span className="absolute top-1 right-1">
          <span className="w-2 h-2 rounded-full bg-[#8B7AFF] block" />
        </span>
      )}
    </Link>
  )

  // In collapsed mode, wrap with tooltip
  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent
          side="right"
          sideOffset={12}
          className="bg-[#161514] border border-white/[0.08] text-[#F0EDE8] text-xs px-2.5 py-1.5 rounded-lg shadow-lg"
        >
          {item.label}
        </TooltipContent>
      </Tooltip>
    )
  }

  return content
}
```

### State table

| State  | Text color   | Icon color   | Background           | Font weight |
|--------|-------------|-------------|----------------------|-------------|
| Idle   | `#8A8580`   | `#8A8580`   | transparent          | 400         |
| Hover  | `#C4C0BA`   | `#C4C0BA`   | `rgba(255,255,255,0.04)` | 400     |
| Active | `#F0EDE8`   | `#8B7AFF`   | `rgba(139,122,255,0.08)` | 500     |

All transitions: `duration-150 ease-out`. WCAG AA contrast: idle `#8A8580` on `#111110` = 4.5:1 (passes). Active cream on violet tint = 13.8:1 (passes AAA).

### Divider between groups

```tsx
function SidebarDivider() {
  return <hr className="border-t border-white/[0.06] mx-1" />
}
```

No section labels. Groups separated by horizontal rules only (Mercury model).

---

## 4. Search / Command Bar Trigger

Mercury-style recessed pill that opens the `Cmd+K` command palette. Lives directly below the logo area.

```tsx
function SearchTrigger({
  collapsed,
  onClick,
}: {
  collapsed: boolean
  onClick: () => void
}) {
  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            aria-label="Search (Cmd+K)"
            className={cn(
              'w-10 h-10 mx-auto rounded-lg flex items-center justify-center',
              'text-[#8A8580] hover:text-[#C4C0BA] hover:bg-white/[0.04]',
              'transition-colors duration-150 cursor-pointer'
            )}
          >
            <Search size={18} strokeWidth={1.5} />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="right"
          sideOffset={12}
          className="bg-[#161514] border border-white/[0.08] text-[#F0EDE8] text-xs px-2.5 py-1.5 rounded-lg shadow-lg"
        >
          Search
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 w-full h-9 px-3 rounded-lg',
        'border border-white/[0.06] bg-white/[0.03]',
        'text-[#F0EDE8]/25 text-xs',
        'hover:border-white/[0.10] hover:bg-white/[0.05]',
        'transition-colors duration-150 cursor-pointer'
      )}
    >
      <Search size={14} strokeWidth={1.5} className="shrink-0 text-[#8A8580]" />
      <span className="flex-1 text-left">Search...</span>
      <kbd className="text-[10px] font-mono bg-white/[0.06] border border-white/[0.06] px-1.5 py-0.5 rounded text-[#F0EDE8]/20">
        &#8984;K
      </kbd>
    </button>
  )
}
```

The pill feels recessed (darker than sidebar surface via `bg-white/[0.03]`) with a barely-visible border. On hover, the border and background brighten by one step. The `Cmd+K` kbd badge uses the same glass treatment as the border system.

---

## 5. PlanBadge -- Dark Treatment

Glass-morphic pill in the logo row. Three variants: Pro, Trial, Free.

```tsx
export function PlanBadge({ planTier, trialActive }: PlanBadgeProps) {
  // Trial state
  if (trialActive && planTier === 'free') {
    return (
      <span className={cn(
        'px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide',
        'bg-[#8B7AFF]/10 text-[#8B7AFF] border border-[#8B7AFF]/15'
      )}>
        Trial
      </span>
    )
  }

  // Pro / paid tiers
  if (planTier === 'pro' || planTier === 'team' || planTier === 'starter') {
    return (
      <span className={cn(
        'px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide',
        'bg-[#8B7AFF]/15 text-[#8B7AFF] border border-[#8B7AFF]/20'
      )}>
        {planTier === 'team' ? 'Team' : planTier === 'starter' ? 'Starter' : 'Pro'}
      </span>
    )
  }

  // Free tier
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn(
        'px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide',
        'bg-white/[0.04] text-[#F0EDE8]/40 border border-white/[0.06]'
      )}>
        Free
      </span>
      <Link
        to="/pricing"
        className="text-[10px] text-[#8B7AFF] hover:text-[#A094FF] font-medium transition-colors"
      >
        Upgrade
      </Link>
    </span>
  )
}
```

The glass treatment uses low-opacity accent fills and borders. Pro/Trial badges glow faintly violet. Free badges are neutral with a subtle "Upgrade" link in accent color.

---

## 6. TrialBanner -- Sidebar Placement

Positioned between the nav scroll area and the user footer. Three urgency states mapped to dark tokens.

```tsx
export function TrialBanner({ trialEndsAt, planTier, trialActive }: TrialBannerProps) {
  // ... existing daysLeft / snoozed logic unchanged ...

  // STATE 1: Expired (always shown, cannot snooze)
  if (daysLeft === 0 || (!trialActive && trialEndsAt)) {
    return (
      <div className="mx-3 mb-2 rounded-lg border border-red-500/20 bg-red-500/[0.08] p-3">
        <div className="flex items-start gap-2">
          <XCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-red-300">Trial expired</p>
            <button
              onClick={() => checkout.mutate({ plan: 'pro', interval: 'annual' })}
              disabled={checkout.isPending}
              className={cn(
                'mt-2 w-full h-8 rounded-lg text-xs font-medium',
                'bg-red-500 hover:bg-red-400 text-white',
                'transition-colors disabled:opacity-50 cursor-pointer'
              )}
            >
              Upgrade to continue
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (snoozed) return null

  const isUrgent = daysLeft !== null && daysLeft <= 3
  const Icon = isUrgent ? AlertTriangle : Clock

  // STATE 2: Urgent (1-3 days left)
  // STATE 3: Comfortable (4-7 days left)
  return (
    <div
      className={cn(
        'mx-3 mb-2 rounded-lg border p-3',
        isUrgent
          ? 'border-amber-500/20 bg-amber-500/[0.08]'
          : 'border-[#8B7AFF]/15 bg-[#8B7AFF]/[0.06]'
      )}
    >
      <div className="flex items-start gap-2">
        <Icon
          size={16}
          className={cn(
            'mt-0.5 shrink-0',
            isUrgent ? 'text-amber-400' : 'text-[#8B7AFF]'
          )}
        />
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'text-sm font-medium',
              isUrgent ? 'text-amber-200' : 'text-[#F0EDE8]/80'
            )}
          >
            {isUrgent
              ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`
              : `Pro Trial: ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}
          </p>

          {isUrgent ? (
            <button
              onClick={() => checkout.mutate({ plan: 'pro', interval: 'annual' })}
              disabled={checkout.isPending}
              className={cn(
                'mt-2 w-full h-8 rounded-lg text-xs font-medium',
                'bg-amber-500 hover:bg-amber-400 text-black',
                'transition-colors disabled:opacity-50 cursor-pointer'
              )}
            >
              Upgrade now
            </button>
          ) : (
            <Link
              to="/pricing"
              className="text-xs text-[#8B7AFF] hover:text-[#A094FF] mt-1 inline-block transition-colors"
            >
              View plans
            </Link>
          )}
        </div>

        {/* Snooze (non-urgent, non-expired only) */}
        {!isUrgent && (
          <button
            onClick={() => {
              sessionStorage.setItem(SNOOZE_KEY, String(Date.now()))
              setSnoozed(true)
            }}
            aria-label="Dismiss for 24 hours"
            className="text-[#F0EDE8]/20 hover:text-[#F0EDE8]/50 transition-colors cursor-pointer shrink-0"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
```

### Urgency state table

| State       | Border                   | Background              | Icon/Text          | CTA              |
|-------------|--------------------------|-------------------------|--------------------|------------------|
| Comfortable | `border-[#8B7AFF]/15`    | `bg-[#8B7AFF]/[0.06]`  | Violet tones       | "View plans" link |
| Urgent      | `border-amber-500/20`    | `bg-amber-500/[0.08]`  | Amber tones        | Solid amber button |
| Expired     | `border-red-500/20`      | `bg-red-500/[0.08]`    | Red tones          | Solid red button |

In collapsed mode, the trial banner reduces to an icon-only indicator in the user footer area (a small colored dot next to the avatar).

---

## 7. Topbar (56px)

Spans from sidebar right edge to viewport right edge. Aligns with the logo row height.

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
    <header className="h-14 shrink-0 flex items-center justify-between px-4 md:px-6 lg:px-8 bg-[#0C0B0A] border-b border-white/[0.06]">
      {/* Left side */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger -- mobile only */}
        <button
          onClick={onMenuToggle}
          aria-label="Open navigation"
          className={cn(
            'md:hidden flex items-center justify-center w-9 h-9 rounded-lg',
            'text-[#F0EDE8]/40 hover:text-[#F0EDE8] hover:bg-white/[0.04]',
            'transition-colors cursor-pointer'
          )}
        >
          <Menu size={20} strokeWidth={1.5} />
        </button>

        {/* Mobile logo -- below md only */}
        <Link
          to={user?.email === 'demo@parcel.app' ? '/' : '/dashboard'}
          className="md:hidden flex items-center"
        >
          <div className="w-6 h-6 rounded-md bg-[#8B7AFF] flex items-center justify-center">
            <span className="text-white text-[10px] font-bold">P</span>
          </div>
        </Link>

        {/* Breadcrumbs or page title */}
        <div className="min-w-0">
          {breadcrumbs && breadcrumbs.length > 0 ? (
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
              {breadcrumbs.map((crumb, i) => {
                const isLast = i === breadcrumbs.length - 1
                return (
                  <span key={i} className="flex items-center gap-1.5">
                    {i > 0 && (
                      <ChevronRight size={14} className="text-[#F0EDE8]/15 shrink-0" />
                    )}
                    {isLast || !crumb.href ? (
                      <span
                        className="text-[#F0EDE8] font-medium truncate"
                        aria-current={isLast ? 'page' : undefined}
                      >
                        {crumb.label}
                      </span>
                    ) : (
                      <Link
                        to={crumb.href}
                        className="text-[#F0EDE8]/40 hover:text-[#F0EDE8]/70 transition-colors truncate"
                      >
                        {crumb.label}
                      </Link>
                    )}
                  </span>
                )
              })}
            </nav>
          ) : (
            <h1 className="text-sm font-semibold text-[#F0EDE8] tracking-tight truncate">
              {title ?? 'Parcel'}
            </h1>
          )}
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        {/* Page-level action buttons */}
        {actions && (
          <div className="hidden sm:flex items-center gap-2">{actions}</div>
        )}

        {/* User avatar + dropdown */}
        <UserMenu />
      </div>
    </header>
  )
}
```

Note: The search trigger has moved into the sidebar (Section 4), so the topbar right side is cleaner -- just action buttons and the user avatar. On mobile (below `md`), the search trigger is accessible via the command palette keyboard shortcut or a search icon in the mobile drawer.

### Topbar action button styles (dark)

```
Ghost:    text-[#F0EDE8]/50 hover:text-[#F0EDE8] hover:bg-white/[0.04]
          border border-white/[0.06] rounded-lg h-8 px-3 text-sm font-medium
Primary:  bg-[#8B7AFF] hover:bg-[#7B6AEF] text-white
          rounded-lg h-8 px-4 text-sm font-medium
```

---

## 8. User Avatar & Footer

Anchored at `mt-auto` at the bottom of the sidebar flex column.

```tsx
function SidebarUserFooter({ collapsed }: { collapsed: boolean }) {
  const user = useAuthStore((s) => s.user)
  const { mutate: logout, isPending } = useLogout()

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  if (collapsed) {
    return (
      <div className="border-t border-white/[0.06] p-2 flex justify-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <UserAvatarCircle initials={initials} size="sm" />
          </TooltipTrigger>
          <TooltipContent
            side="right"
            sideOffset={12}
            className="bg-[#161514] border border-white/[0.08] text-[#F0EDE8] text-xs px-2.5 py-1.5 rounded-lg shadow-lg"
          >
            {user?.name ?? 'Account'}
          </TooltipContent>
        </Tooltip>
      </div>
    )
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={cn(
          'w-full border-t border-white/[0.06] px-3 py-3',
          'flex items-center gap-3 cursor-pointer',
          'hover:bg-white/[0.02] transition-colors'
        )}>
          <UserAvatarCircle initials={initials} />
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm text-[#F0EDE8] font-medium truncate">
              {user?.name ?? 'User'}
            </p>
            <p className="text-xs text-[#F0EDE8]/30 truncate">
              {user?.email ?? ''}
            </p>
          </div>
          <ChevronRight size={14} className="text-[#F0EDE8]/15 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={8}
        className="w-56 p-1.5 bg-[#161514] border border-white/[0.08] shadow-xl rounded-xl"
      >
        <div className="px-2.5 py-2 border-b border-white/[0.06] mb-1">
          <p className="text-sm font-medium text-[#F0EDE8] truncate">
            {user?.name ?? 'User'}
          </p>
          <p className="text-xs text-[#F0EDE8]/30 truncate">
            {user?.email ?? ''}
          </p>
        </div>
        <Link
          to="/settings"
          className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-[#F0EDE8]/60 hover:bg-white/[0.04] hover:text-[#F0EDE8] transition-colors"
        >
          <Settings size={14} />
          Settings
        </Link>
        <button
          onClick={() => logout()}
          disabled={isPending}
          className="flex w-full items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors cursor-pointer disabled:opacity-50"
        >
          <LogOut size={14} />
          {isPending ? 'Logging out...' : 'Log out'}
        </button>
      </PopoverContent>
    </Popover>
  )
}
```

### User avatar circle

Violet-tinted circle with initials. A plan indicator dot sits at bottom-right for Pro users.

```tsx
function UserAvatarCircle({
  initials,
  size = 'md',
}: {
  initials: string
  size?: 'sm' | 'md'
}) {
  const user = useAuthStore((s) => s.user)
  const isPro = user?.plan_tier === 'pro' || user?.plan_tier === 'team'

  return (
    <div className={cn(
      'relative rounded-full flex items-center justify-center shrink-0',
      'bg-[#8B7AFF]/15 border border-[#8B7AFF]/20',
      size === 'sm' ? 'w-8 h-8' : 'w-8 h-8'
    )}>
      <span className={cn(
        'font-semibold text-[#8B7AFF]',
        size === 'sm' ? 'text-[10px]' : 'text-xs'
      )}>
        {initials}
      </span>

      {/* Pro plan indicator dot */}
      {isPro && (
        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#8B7AFF] border-2 border-[#111110]" />
      )}
    </div>
  )
}
```

The border on the pro dot matches the sidebar background (`#111110`), creating a "cut-out" effect so the dot appears inset into the avatar edge.

---

## 9. Sidebar Collapse (240px to 64px)

### Animation spec

```tsx
const SIDEBAR_STORAGE_KEY = 'parcel:sidebar-collapsed'

function useCollapsedState() {
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true'
  })

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next))
      return next
    })
  }, [])

  return [collapsed, toggle] as const
}
```

### Framer Motion variants

```tsx
const sidebarVariants = {
  expanded: {
    width: 240,
    transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] },
  },
  collapsed: {
    width: 64,
    transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] },
  },
}

const labelVariants = {
  expanded: { opacity: 1, x: 0, transition: { delay: 0.05, duration: 0.15 } },
  collapsed: { opacity: 0, x: -8, transition: { duration: 0.1 } },
}
```

### Keyboard shortcut

`Cmd+\` (macOS) / `Ctrl+\` (Windows/Linux) toggles the sidebar. Registered as a global `keydown` listener in AppShell. Does not conflict with any existing shortcuts.

### Mini mode (64px rail) behavior

- Logo mark only (no wordmark), centered `w-10 h-10`.
- Search trigger becomes an icon-only button, centered.
- Nav items become `w-10 h-10` centered icon squares with `rounded-lg`.
- Each nav item wraps in a `Tooltip` with `side="right"` and `sideOffset={12}`. Tooltip uses `delayDuration={300}` on the `TooltipProvider`.
- User footer shows avatar only. Clicking opens the popover as normal.
- Trial banner hides (replaced by a colored dot on the avatar if trial is active).
- Dividers remain but use `mx-2` (narrower margin).

### Content area compensation

The main content column uses `flex-1 min-w-0` and naturally fills the remaining space. No manual width calculation needed. The sidebar width transition causes the content to resize smoothly via flexbox.

---

## 10. Mobile Navigation

Hamburger icon triggers a slide-out drawer from the left. Uses the existing `Sheet` component from shadcn/ui.

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
        className={cn(
          'w-[280px] p-0 flex flex-col',
          'bg-[#0C0B0A] border-r border-white/[0.06]',
          '[&>button]:text-[#F0EDE8]/30 [&>button]:hover:text-[#F0EDE8]/60'
        )}
      >
        <SheetTitle className="sr-only">Navigation</SheetTitle>

        {/* Logo area */}
        <SidebarLogo collapsed={false} onToggle={() => {}} />

        {/* Search trigger */}
        <div className="px-3 mt-3">
          <SearchTrigger collapsed={false} onClick={() => {
            closeDrawer()
            // Open command palette after drawer closes
            setTimeout(() => setCommandPaletteOpen(true), 200)
          }} />
        </div>

        {/* Nav groups */}
        <nav
          className="flex-1 overflow-y-auto px-3 pt-4 space-y-5"
          aria-label="Main navigation"
        >
          <NavSection items={NAV_ANALYZE} collapsed={false} onNavigate={closeDrawer} />
          <SidebarDivider />
          <NavSection items={NAV_MANAGE} collapsed={false} onNavigate={closeDrawer} />
          <SidebarDivider />
          <NavSection items={NAV_AI} collapsed={false} onNavigate={closeDrawer} />
          <SidebarDivider />
          <NavSection items={NAV_ACCOUNT} collapsed={false} onNavigate={closeDrawer} />
        </nav>

        {/* Trial banner + user footer */}
        <SidebarTrialBanner collapsed={false} />
        <SidebarUserFooter collapsed={false} />
      </SheetContent>
    </Sheet>
  )
}
```

### Overlay

The `Sheet` component's overlay should be styled: `bg-black/60 backdrop-blur-sm`. If the default shadcn Sheet does not support this, override via `[&~[data-radix-dialog-overlay]]:bg-black/60 [&~[data-radix-dialog-overlay]]:backdrop-blur-sm` or in the Sheet component definition.

### Drawer shadow

Apply `shadow-[20px_0_60px_-15px_rgba(0,0,0,0.5)]` to the `SheetContent` for depth against the dimmed page.

### Tapping behavior

Any nav item tap closes the drawer immediately. The search trigger closes the drawer then opens the command palette after a 200ms delay (prevents overlap).

---

## 11. Page Transitions

Subtle opacity + Y-shift. Fast enough to feel immediate, present enough to signal content change.

```tsx
const pageVariants = {
  initial: { opacity: 0, y: 6 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: 0.12, ease: [0.25, 0.1, 0.25, 1] },
  },
}
```

| Parameter    | Enter | Exit  |
|-------------|-------|-------|
| Duration    | 200ms | 120ms |
| Y offset    | +6px  | -4px  |
| Opacity     | 0 to 1 | 1 to 0 |
| Easing      | `[0.25, 0.1, 0.25, 1]` (subtle ease-out) | Same |

Usage in AppShell:

```tsx
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
```

`mode="wait"` ensures the exiting page fully leaves before the entering page appears. `initial={false}` prevents the animation on first mount.

### What to avoid

- No scale transitions (reserve for modals only).
- No slide-from-side (implies spatial hierarchy that does not exist).
- No spring physics (too playful for financial tooling).
- No blur transitions (expensive, gimmicky).

---

## 12. Notification Dot

Two variants: boolean dot and numeric badge. Both use the violet accent.

### Boolean dot (new activity, no count)

```tsx
function NotificationDot() {
  return (
    <span className="relative flex h-2 w-2">
      {/* Glow ring — pulses outward */}
      <span className="absolute inset-0 rounded-full bg-[#8B7AFF] opacity-40 animate-[ring-pulse_2s_ease-out_infinite]" />
      {/* Solid dot */}
      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#8B7AFF]" />
    </span>
  )
}
```

### Numeric badge (countable items)

```tsx
function NotificationCount({ count }: { count: number }) {
  const display = count > 99 ? '99+' : String(count)

  return (
    <span className={cn(
      'inline-flex items-center justify-center',
      'min-w-[18px] h-[18px] px-1 rounded-full',
      'bg-[#8B7AFF] text-white text-[10px] font-semibold leading-none'
    )}>
      {display}
    </span>
  )
}
```

### Combined component

```tsx
function NotificationBadge({ type }: { type: 'dot' | number }) {
  if (type === 'dot') return <NotificationDot />
  if (typeof type === 'number' && type > 0) return <NotificationCount count={type} />
  return null
}
```

### Ring pulse keyframe (add to `index.css` or Tailwind config)

```css
@keyframes ring-pulse {
  0% { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(2.5); opacity: 0; }
}
```

Reserve the ring-pulse animation for genuinely urgent states only (trial expiring, payment failed). For standard notifications (unread chat), use a static dot without animation.

### Placement in nav row

The badge sits at `ml-auto` within the nav item flex row, pushing it to the right edge. In collapsed mode, the dot positions absolutely at `top-1 right-1` of the icon container.

---

## CRITICAL DECISIONS

1. **Sidebar background is `#111110`, not `#0C0B0A`.** The research suggested matching the content area, but a 2% lightness bump creates just enough separation to register as a distinct zone on all monitor calibrations. The border-right at `white/[0.06]` reinforces the edge. This is a deliberate departure from the pure Mercury model.

2. **Search trigger lives in the sidebar, not the topbar.** Mercury places it in the sidebar and we follow suit. This frees the topbar right side for page-level actions and the avatar only, keeping it minimal. The topbar does not duplicate the search pill.

3. **Active state uses dual signal: background tint + icon color change.** No left-border accent (it creates a 2px layout compensation issue and feels more Linear than Mercury). The `bg-[#8B7AFF]/[0.08]` tint is visible but not garish. The icon shifts to violet while the label shifts to full cream.

4. **Idle text is `#8A8580` (not `#F0EDE8` at 50%).** This specific hex value is the minimum that meets WCAG AA contrast (4.7:1) on `#111110`. Using opacity-based coloring (`text-[#F0EDE8]/50`) would land at `#807D78` which is 3.8:1 and fails AA. The hardcoded value is accessibility-first.

5. **Sidebar collapse persists to `localStorage`.** No server-side preference storage. The collapsed state initializes from localStorage in a `useState` initializer function to prevent flash-of-expanded-sidebar on page load.

6. **No bottom tab bar on mobile.** Parcel has 10 nav items across 4 groups. A bottom bar holds 5 max. The hamburger + full drawer pattern handles all items without truncation and preserves vertical space for financial data tables.

7. **Page transitions are 200ms enter / 120ms exit.** The asymmetric timing (slower in, faster out) ensures the new page appears quickly while the entrance still feels intentional. The 6px Y-shift is less than the current 8px -- reduced to feel more restrained on dark backgrounds where motion is more perceptible.

8. **Trial banner urgency uses amber/red, not violet.** Urgent and expired states deliberately break from the violet accent system to signal danger. The comfortable state uses violet tones to stay harmonious with the sidebar. This prevents urgency from being lost in the brand color.

9. **Topbar height matches sidebar logo row: 56px (`h-14`).** The horizontal alignment of these two elements creates a clean T-junction at the top-left corner where sidebar meets content. Any mismatch (even 1px) would read as a bug on retina displays.

10. **Notification ring-pulse is reserved for critical states only.** Overuse of animation destroys the institutional calm. Standard unread indicators use a static dot. Only trial expiry and payment failure get the animated ring. This restraint is what separates luxury from consumer UI.
