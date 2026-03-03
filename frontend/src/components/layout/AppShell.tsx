import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  GitBranch,
  FolderOpen,
  Columns,
  Calculator,
  FileText,
  MessageSquare,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  Search,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useLogout } from '@/hooks/useAuth'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { CommandPalette } from '@/components/command-palette'

interface AppShellProps {
  children: React.ReactNode
  title?: string
  noPadding?: boolean
}

interface NavItem {
  label: string
  path: string
  icon: React.ElementType
}

const NAV_MAIN: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Pipeline', path: '/pipeline', icon: GitBranch },
  { label: 'My Deals', path: '/deals', icon: FolderOpen },
  { label: 'Compare', path: '/compare', icon: Columns },
]

const NAV_TOOLS: NavItem[] = [
  { label: 'Analyzer', path: '/analyze', icon: Calculator },
  { label: 'Documents', path: '/documents', icon: FileText },
  { label: 'AI Chat', path: '/chat', icon: MessageSquare },
]

const NAV_ACCOUNT: NavItem[] = [
  { label: 'Portfolio', path: '/portfolio', icon: BarChart3 },
  { label: 'Settings', path: '/settings', icon: Settings },
]

/** Sidebar logo — links to landing page for demo users, dashboard for real users. */
function SidebarLogo() {
  const user = useAuthStore((s) => s.user)
  const to = user?.email === 'demo@parcel.app' ? '/' : '/dashboard'

  return (
    <div className="h-[52px] flex items-center px-4 border-b border-border-subtle">
      <Link to={to} className="text-lg font-semibold text-accent-primary tracking-tight hover:opacity-80 transition-opacity">
        Parcel
      </Link>
    </div>
  )
}

function NavGroup({ label, items, onNavigate }: { label: string; items: NavItem[]; onNavigate?: () => void }) {
  const { pathname } = useLocation()

  return (
    <div className="space-y-0.5">
      <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">
        {label}
      </p>
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
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              active
                ? 'border-l-2 border-accent-primary bg-app-elevated text-text-primary font-medium ml-[-1px] rounded-l-none pl-[calc(0.75rem-1px)]'
                : 'text-text-secondary hover:text-text-primary hover:bg-app-elevated/50'
            )}
          >
            <Icon size={16} className="shrink-0" />
            {item.label}
          </Link>
        )
      })}
    </div>
  )
}

/** Desktop sidebar, hidden below md breakpoint. */
function Sidebar() {
  return (
    <aside
      className="hidden md:flex w-[216px] shrink-0 flex-col border-r border-border-subtle bg-app-bg h-screen sticky top-0"
    >
      <SidebarLogo />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-5 mt-2">
        <NavGroup label="Main" items={NAV_MAIN} />
        <NavGroup label="Tools" items={NAV_TOOLS} />
        <NavGroup label="Account" items={NAV_ACCOUNT} />
      </nav>
    </aside>
  )
}

/** Mobile sidebar drawer, visible only below md breakpoint. Uses shadcn Sheet sliding from the left. */
function MobileSidebar({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const closeDrawer = () => onOpenChange(false)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-[216px] p-0 bg-app-bg border-border-subtle"
      >
        {/* Accessible title (visually hidden) */}
        <SheetTitle className="sr-only">Navigation</SheetTitle>

        <SidebarLogo />

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-5 mt-2">
          <NavGroup label="Main" items={NAV_MAIN} onNavigate={closeDrawer} />
          <NavGroup label="Tools" items={NAV_TOOLS} onNavigate={closeDrawer} />
          <NavGroup label="Account" items={NAV_ACCOUNT} onNavigate={closeDrawer} />
        </nav>
      </SheetContent>
    </Sheet>
  )
}

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
          className="w-8 h-8 rounded-full bg-accent-primary/20 border border-accent-primary/30 flex items-center justify-center hover:bg-accent-primary/30 transition-colors cursor-pointer"
        >
          <span className="text-xs font-semibold text-accent-primary">{initials}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-2 bg-app-surface border-border-subtle">
        <div className="px-2 py-1.5 border-b border-border-subtle mb-1">
          <p className="text-sm font-medium text-text-primary truncate">{user?.name ?? 'User'}</p>
          <p className="text-xs text-text-muted truncate">{user?.email ?? ''}</p>
        </div>
        <button
          onClick={() => logout()}
          disabled={isPending}
          className="flex w-full items-center gap-2 px-2 py-1.5 rounded-md text-sm text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-50"
        >
          <LogOut size={14} />
          {isPending ? 'Logging out…' : 'Log out'}
        </button>
      </PopoverContent>
    </Popover>
  )
}

function Topbar({ title, onMenuToggle, onSearchClick }: { title?: string; onMenuToggle: () => void; onSearchClick: () => void }) {
  const user = useAuthStore((s) => s.user)

  return (
    <header className="h-[52px] shrink-0 flex items-center justify-between px-4 md:px-6 border-b border-border-subtle">
      {/* Left side: hamburger (mobile) + logo (mobile) + page title */}
      <div className="flex items-center gap-3">
        {/* Hamburger menu — visible only below md */}
        <button
          onClick={onMenuToggle}
          aria-label="Open navigation"
          className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg text-text-secondary hover:text-text-primary hover:bg-app-elevated/50 transition-colors cursor-pointer"
        >
          <Menu size={20} />
        </button>

        {/* Mobile Parcel logo — visible only below md (sidebar is hidden) */}
        <Link
          to={user?.email === 'demo@parcel.app' ? '/' : '/dashboard'}
          className="md:hidden text-lg font-semibold text-accent-primary tracking-tight hover:opacity-80 transition-opacity"
        >
          Parcel
        </Link>

        {/* Page title */}
        <h1 className="text-sm font-semibold text-text-primary">{title ?? 'Parcel'}</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Search pill — opens command palette. Icon-only on mobile, full on desktop. */}
        <button
          onClick={onSearchClick}
          aria-label="Open command palette"
          className="flex items-center gap-2 px-2 md:px-3 py-1.5 rounded-lg border border-border-subtle bg-app-surface text-text-muted text-xs hover:border-border-default transition-colors cursor-pointer"
        >
          <Search size={14} className="shrink-0" />
          <span className="hidden md:inline">Search</span>
          <kbd className="hidden md:inline text-[10px] font-mono bg-app-elevated px-1.5 py-0.5 rounded">&#8984;K</kbd>
        </button>

        {/* User avatar + dropdown menu */}
        <UserMenu />
      </div>
    </header>
  )
}

/**
 * Root layout for all authenticated app pages.
 * Renders the desktop sidebar (hidden on mobile), a mobile Sheet drawer,
 * topbar with hamburger toggle, command palette, and scrollable main content area.
 * Includes skip-navigation link and focus management on route changes for accessibility.
 */
export function AppShell({ children, title, noPadding }: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const mainRef = useRef<HTMLElement>(null)
  const { pathname } = useLocation()

  /* Move focus to main content area when the route changes — helps screen readers announce page transitions. */
  useEffect(() => {
    const main = mainRef.current
    if (!main) return
    /* Find the first h1 inside main and focus it; fall back to main itself. */
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
      {/* Skip navigation link — visually hidden until focused, then appears at top of page */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-accent-primary focus:text-white focus:text-sm focus:font-medium focus:shadow-lg focus:outline-none"
      >
        Skip to main content
      </a>

      {/* Desktop sidebar — hidden below md */}
      <Sidebar />

      {/* Mobile sidebar drawer — only renders below md */}
      <MobileSidebar open={mobileNavOpen} onOpenChange={setMobileNavOpen} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar
          title={title}
          onMenuToggle={() => setMobileNavOpen(true)}
          onSearchClick={() => setCommandPaletteOpen(true)}
        />
        <main
          ref={mainRef}
          id="main-content"
          tabIndex={-1}
          className={cn('flex-1 outline-none', noPadding ? 'overflow-hidden' : 'overflow-y-auto p-4 md:p-6')}
        >
          {children}
        </main>
      </div>

      {/* Command palette — Cmd+K / Ctrl+K global search and navigation */}
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
    </div>
  )
}
