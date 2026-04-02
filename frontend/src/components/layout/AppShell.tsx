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
  CreditCard,
  LogOut,
  Menu,
  Search,
  ChevronRight,
  ChevronsLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useLogout } from '@/hooks/useAuth'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { CommandPalette } from '@/components/command-palette'
import { PlanBadge } from '@/components/billing/PlanBadge'
import { TrialBanner } from '@/components/billing/TrialBanner'
import { duration, ease } from '@/lib/motion'

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

/* ─── Nav Data (4 groups, no labels, dividers only) ─── */

const NAV_ANALYZE: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'New Analysis', path: '/analyze', icon: Calculator },
]

const NAV_MANAGE: NavItem[] = [
  { label: 'My Deals', path: '/deals', icon: FolderOpen },
  { label: 'Pipeline', path: '/pipeline', icon: GitBranch },
  { label: 'Portfolio', path: '/portfolio', icon: BarChart3 },
]

const NAV_AI: NavItem[] = [
  { label: 'Chat', path: '/chat', icon: MessageSquare },
  { label: 'Documents', path: '/documents', icon: FileText },
]

const NAV_ACCOUNT: NavItem[] = [
  { label: 'Pricing', path: '/pricing', icon: CreditCard },
  { label: 'Settings', path: '/settings', icon: Settings },
]

/* ─── Sidebar Primitives ─── */

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
    <div className="h-14 flex items-center justify-between px-4 border-b border-border-default">
      <Link to={to} className="flex items-center gap-2.5 group min-w-0">
        {/* P mark with violet ambient glow */}
        <div className="relative shrink-0">
          <div className="w-7 h-7 rounded-lg bg-[#8B7AFF] flex items-center justify-center">
            <span className="text-text-primary text-xs font-bold tracking-tight">P</span>
          </div>
          {/* Ambient glow — subtle radial behind logo mark */}
          <div
            className="absolute inset-0 rounded-lg opacity-40 blur-md -z-10"
            style={{ background: 'radial-gradient(circle, #8B7AFF 0%, transparent 70%)' }}
          />
        </div>

        {/* Wordmark — hidden when collapsed */}
        {!collapsed && (
          <span className="text-[15px] font-semibold text-text-primary tracking-tight">
            Parcel
          </span>
        )}
      </Link>

      {/* Right side: plan badge (expanded) / collapse toggle */}
      <div className="flex items-center gap-2">
        {!collapsed && user && (
          <PlanBadge
            planTier={user.plan_tier}
            trialActive={user.trial_active ?? false}
          />
        )}
        <button
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'w-6 h-6 rounded-md flex items-center justify-center',
            'text-text-primary/20 hover:text-text-primary/50 hover:bg-layer-2',
            'transition-colors duration-150 cursor-pointer',
            collapsed && 'mx-auto'
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

function SidebarDivider() {
  return <hr className="border-t border-border-default mx-1" />
}

/* ─── Search Trigger Pill ─── */

function SearchTrigger({
  collapsed,
  onClick,
}: {
  collapsed: boolean
  onClick: () => void
}) {
  if (collapsed) {
    return (
      <button
        onClick={onClick}
        aria-label="Search (Cmd+K)"
        className={cn(
          'w-10 h-10 mx-auto rounded-lg flex items-center justify-center',
          'text-[#8A8580] hover:text-[#C4C0BA] hover:bg-layer-2',
          'transition-colors duration-150 cursor-pointer'
        )}
      >
        <Search size={18} strokeWidth={1.5} />
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 w-full h-9 px-3 rounded-lg',
        'border border-border-default bg-white/[0.03]',
        'text-text-primary/25 text-xs',
        'hover:border-white/[0.10] hover:bg-white/[0.05]',
        'transition-colors duration-150 cursor-pointer'
      )}
    >
      <Search size={14} strokeWidth={1.5} className="shrink-0 text-[#8A8580]" />
      <span className="flex-1 text-left">Search...</span>
      <kbd className="text-[10px] font-mono bg-layer-3 border border-border-default px-1.5 py-0.5 rounded text-text-primary/20">
        &#8984;K
      </kbd>
    </button>
  )
}

/* ─── Nav Section ─── */

function NavSection({
  items,
  collapsed,
  onNavigate,
}: {
  items: NavItem[]
  collapsed?: boolean
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
              'flex items-center rounded-lg',
              'transition-colors duration-150',
              collapsed
                ? 'w-10 h-10 justify-center mx-auto'
                : 'gap-3 px-3 h-9 text-sm',
              active
                ? 'bg-[#8B7AFF]/[0.08] border border-[#8B7AFF]/25 text-text-primary font-medium'
                : 'text-text-secondary hover:bg-layer-2 hover:text-text-primary'
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
            {!collapsed && <span>{item.label}</span>}
          </Link>
        )
      })}
    </div>
  )
}

/* ─── Desktop Sidebar ─── */

function SidebarTrialBanner({ collapsed }: { collapsed: boolean }) {
  const user = useAuthStore((s) => s.user)
  if (!user || collapsed) return null
  return (
    <TrialBanner
      trialEndsAt={user.trial_ends_at}
      planTier={user.plan_tier}
      trialActive={user.trial_active ?? false}
    />
  )
}

function Sidebar({
  collapsed,
  onToggle,
  onSearchClick,
}: {
  collapsed: boolean
  onToggle: () => void
  onSearchClick: () => void
}) {
  return (
    <aside
      className={cn(
        'hidden md:flex shrink-0 flex-col h-screen sticky top-0',
        'bg-app-recessed border-r border-border-default',
        'transition-[width] duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)]',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* 1 — Logo area: 56px */}
      <SidebarLogo collapsed={collapsed} onToggle={onToggle} />

      {/* 2 — Search trigger pill */}
      <div className={cn('px-3', collapsed ? 'px-2 mt-3' : 'mt-3')}>
        <SearchTrigger collapsed={collapsed} onClick={onSearchClick} />
      </div>

      {/* 3 — Scrollable nav */}
      <nav
        className={cn(
          'flex-1 overflow-y-auto px-3 pt-4 space-y-5 scrollbar-luxury',
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
    </aside>
  )
}

/* ─── Mobile Sidebar Drawer ─── */

function MobileSidebar({
  open,
  onOpenChange,
  onSearchClick,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSearchClick: () => void
}) {
  const closeDrawer = () => onOpenChange(false)
  const user = useAuthStore((s) => s.user)
  const to = user?.email === 'demo@parcel.app' ? '/' : '/dashboard'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-[280px] p-0 bg-app-recessed border-r border-border-default"
      >
        <SheetTitle className="sr-only">Navigation</SheetTitle>

        {/* Logo row */}
        <div className="h-14 flex items-center px-4 border-b border-border-default">
          <Link
            to={to}
            onClick={closeDrawer}
            className="flex items-center gap-2.5"
          >
            <div className="relative shrink-0">
              <div className="w-7 h-7 rounded-lg bg-[#8B7AFF] flex items-center justify-center">
                <span className="text-text-primary text-xs font-bold tracking-tight">P</span>
              </div>
              <div
                className="absolute inset-0 rounded-lg opacity-40 blur-md -z-10"
                style={{ background: 'radial-gradient(circle, #8B7AFF 0%, transparent 70%)' }}
              />
            </div>
            <span className="text-[15px] font-semibold text-text-primary tracking-tight">
              Parcel
            </span>
          </Link>
          {user && (
            <div className="ml-auto">
              <PlanBadge
                planTier={user.plan_tier}
                trialActive={user.trial_active ?? false}
              />
            </div>
          )}
        </div>

        {/* Search trigger */}
        <div className="px-3 mt-3">
          <SearchTrigger
            collapsed={false}
            onClick={() => {
              closeDrawer()
              // Slight delay so drawer closes before palette opens
              setTimeout(onSearchClick, 150)
            }}
          />
        </div>

        {/* Nav */}
        <nav
          className="flex-1 overflow-y-auto px-3 pt-4 space-y-5 scrollbar-luxury"
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

        {/* Trial banner */}
        {user && (
          <TrialBanner
            trialEndsAt={user.trial_ends_at}
            planTier={user.plan_tier}
            trialActive={user.trial_active ?? false}
          />
        )}
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
          className="w-8 h-8 rounded-full bg-[#8B7AFF]/15 border border-[#8B7AFF]/20 flex items-center justify-center hover:bg-[#8B7AFF]/25 transition-colors cursor-pointer"
        >
          <span className="text-xs font-semibold text-[#8B7AFF]">
            {initials}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-56 p-1.5 bg-app-elevated border border-border-strong shadow-lg rounded-xl"
      >
        <div className="px-2.5 py-2 border-b border-border-default mb-1">
          <p className="text-sm font-medium text-text-primary truncate">
            {user?.name ?? 'User'}
          </p>
          <p className="text-xs text-text-secondary truncate">
            {user?.email ?? ''}
          </p>
        </div>
        <Link
          to="/settings"
          className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-text-secondary hover:bg-layer-2 hover:text-text-primary transition-colors"
        >
          <Settings size={14} className="text-text-muted" />
          Settings
        </Link>
        <button
          onClick={() => logout()}
          disabled={isPending}
          className="flex w-full items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-[#D4766A] hover:bg-[#D4766A]/10 transition-colors cursor-pointer disabled:opacity-50"
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
    <header className="h-14 shrink-0 flex items-center justify-between px-4 md:px-6 lg:px-8 bg-app-bg border-b border-border-default">
      {/* Left */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger -- mobile only */}
        <button
          onClick={onMenuToggle}
          aria-label="Open navigation"
          className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg text-[#8A8580] hover:text-[#C4C0BA] hover:bg-layer-2 transition-colors cursor-pointer"
        >
          <Menu size={20} />
        </button>

        {/* Mobile logo -- visible only below md */}
        <Link
          to={user?.email === 'demo@parcel.app' ? '/' : '/dashboard'}
          className="md:hidden flex items-center gap-1.5"
        >
          <div className="w-6 h-6 rounded-md bg-[#8B7AFF] flex items-center justify-center">
            <span className="text-text-primary text-[10px] font-bold">P</span>
          </div>
        </Link>

        {/* Breadcrumbs or page title */}
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
                        className="text-text-primary/20 shrink-0"
                      />
                    )}
                    {isLast || !crumb.href ? (
                      <span
                        className="text-text-primary font-medium truncate"
                        aria-current={isLast ? 'page' : undefined}
                      >
                        {crumb.label}
                      </span>
                    ) : (
                      <Link
                        to={crumb.href}
                        className="text-text-secondary hover:text-text-primary transition-colors truncate"
                      >
                        {crumb.label}
                      </Link>
                    )}
                  </span>
                )
              })}
            </nav>
          ) : (
            <h1 className="text-sm font-semibold text-text-primary truncate">
              {title ?? 'Parcel'}
            </h1>
          )}
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        {/* Page-level action buttons */}
        {actions && (
          <div className="hidden sm:flex items-center gap-2">{actions}</div>
        )}

        {/* Search pill -- desktop topbar (hidden on md+ since sidebar has it) */}
        <button
          onClick={onSearchClick}
          aria-label="Open command palette"
          className="md:hidden flex items-center gap-2 h-8 px-2.5 rounded-lg border border-border-default bg-white/[0.03] text-[#8A8580] text-xs hover:border-white/[0.10] hover:bg-white/[0.05] transition-colors cursor-pointer"
        >
          <Search size={14} className="shrink-0" />
        </button>

        {/* User avatar + dropdown */}
        <UserMenu />
      </div>
    </header>
  )
}

/* ─── Page Transition ─── */

const pageAnimationVariants = {
  initial: { opacity: 0, y: 6 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.normal, ease: ease.luxury },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: 0.12, ease: [0.4, 0, 1, 1] },
  },
}

/* ─── AppShell (Root Export) ─── */

/**
 * Root layout for all authenticated app pages.
 * Renders the desktop sidebar (hidden on mobile), a mobile Sheet drawer,
 * topbar with hamburger toggle, command palette, and scrollable main content area.
 * Includes skip-navigation link and focus management on route changes for accessibility.
 */
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('parcel-sidebar-collapsed') === 'true'
  })
  const mainRef = useRef<HTMLElement>(null)
  const { pathname } = useLocation()

  /* Persist sidebar collapse state */
  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('parcel-sidebar-collapsed', String(next))
      return next
    })
  }

  /* Keyboard shortcut: Cmd+\ to toggle sidebar */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === '\\') {
        e.preventDefault()
        toggleSidebar()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

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
    <div className="flex h-screen bg-app-bg overflow-hidden">
      {/* Skip nav */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[#8B7AFF] focus:text-text-primary focus:text-sm focus:font-medium focus:shadow-lg focus:outline-none"
      >
        Skip to main content
      </a>

      {/* Desktop sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        onSearchClick={() => setCommandPaletteOpen(true)}
      />

      {/* Mobile drawer */}
      <MobileSidebar
        open={mobileNavOpen}
        onOpenChange={setMobileNavOpen}
        onSearchClick={() => setCommandPaletteOpen(true)}
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
            noPadding ? 'overflow-hidden' : 'overflow-y-auto scrollbar-luxury'
          )}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pathname}
              variants={pageAnimationVariants}
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
