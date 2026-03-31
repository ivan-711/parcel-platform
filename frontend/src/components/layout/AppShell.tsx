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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useLogout } from '@/hooks/useAuth'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { CommandPalette } from '@/components/command-palette'
import { PlanBadge } from '@/components/billing/PlanBadge'
import { TrialBanner } from '@/components/billing/TrialBanner'

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

function SidebarLogo() {
  const user = useAuthStore((s) => s.user)
  const to = user?.email === 'demo@parcel.app' ? '/' : '/dashboard'

  return (
    <div className="h-14 flex items-center justify-between px-4 border-b border-gray-100">
      <Link to={to} className="flex items-center gap-2 group">
        <div className="w-7 h-7 rounded-lg bg-lime-700 flex items-center justify-center group-hover:bg-lime-800 transition-colors">
          <span className="text-white text-xs font-bold">P</span>
        </div>
        <span className="text-[15px] font-semibold text-gray-900 tracking-tight">
          Parcel
        </span>
      </Link>
      {user && (
        <PlanBadge
          planTier={user.plan_tier}
          trialActive={user.trial_active ?? false}
        />
      )}
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
                ? 'bg-lime-50 text-gray-900 font-medium'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
            )}
          >
            <Icon
              size={18}
              className={cn(
                'shrink-0 transition-colors duration-150',
                active ? 'text-lime-700' : 'text-gray-400'
              )}
            />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </div>
  )
}

/* ─── Desktop Sidebar ─── */

function SidebarTrialBanner() {
  const user = useAuthStore((s) => s.user)
  if (!user) return null
  return (
    <TrialBanner
      trialEndsAt={user.trial_ends_at}
      planTier={user.plan_tier}
      trialActive={user.trial_active ?? false}
    />
  )
}

function Sidebar() {
  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col bg-white border-r border-gray-200 h-screen sticky top-0">
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

      <SidebarTrialBanner />
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

        <SidebarTrialBanner />
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
          className="w-8 h-8 rounded-full bg-lime-100 border border-lime-200 flex items-center justify-center hover:bg-lime-200 transition-colors cursor-pointer"
        >
          <span className="text-xs font-semibold text-lime-700">
            {initials}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-56 p-1.5 bg-white border border-gray-200 shadow-lg rounded-xl"
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
          className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Settings size={14} className="text-gray-400" />
          Settings
        </Link>
        <button
          onClick={() => logout()}
          disabled={isPending}
          className="flex w-full items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50"
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
    <header className="h-14 shrink-0 flex items-center justify-between px-4 md:px-6 lg:px-8 bg-white border-b border-gray-200">
      {/* Left */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger -- mobile only */}
        <button
          onClick={onMenuToggle}
          aria-label="Open navigation"
          className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <Menu size={20} />
        </button>

        {/* Mobile logo -- visible only below md */}
        <Link
          to={user?.email === 'demo@parcel.app' ? '/' : '/dashboard'}
          className="md:hidden flex items-center gap-1.5"
        >
          <div className="w-6 h-6 rounded-md bg-lime-700 flex items-center justify-center">
            <span className="text-white text-[10px] font-bold">P</span>
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
                        className="text-gray-500 hover:text-gray-700 transition-colors truncate"
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
        {/* Page-level action buttons */}
        {actions && (
          <div className="hidden sm:flex items-center gap-2">{actions}</div>
        )}

        {/* Search pill */}
        <button
          onClick={onSearchClick}
          aria-label="Open command palette"
          className="flex items-center gap-2 h-8 px-2.5 md:px-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-400 text-xs hover:border-gray-300 hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <Search size={14} className="shrink-0" />
          <span className="hidden md:inline text-gray-500">Search...</span>
          <kbd className="hidden md:inline text-[10px] font-mono bg-white border border-gray-200 px-1.5 py-0.5 rounded text-gray-400">
            &#8984;K
          </kbd>
        </button>

        {/* User avatar + dropdown */}
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
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-lime-700 focus:text-white focus:text-sm focus:font-medium focus:shadow-lg focus:outline-none"
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
