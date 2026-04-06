import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Lock,
  LogOut,
  Menu,
  Bell,
  Settings,
  ChevronRight,
  ChevronsLeft,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { MobileTabBar } from './MobileTabBar'
import { AIFloatingButton } from './AIFloatingButton'
import { NAV_SECTIONS, BOTTOM_NAV, type NavItem, type NavSection as NavSectionType } from './nav-data'
import { useAuthStore } from '@/stores/authStore'
import { useLogout } from '@/hooks/useAuth'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { CommandPalette } from '@/components/command-palette'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
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

/* ─── Helpers ─── */

function isActive(pathname: string, item: NavItem): boolean {
  if (item.matchExact) return pathname === item.path
  return pathname.startsWith(item.path)
}

function trackEvent(event: string, props?: Record<string, unknown>) {
  try { (window as any).posthog?.capture?.(event, props) } catch { /* ignore */ }
}

function handleLockedClick(item: NavItem) {
  trackEvent('locked_feature_clicked', { item: item.label, path: item.path })
  toast('Available on Pro plan', {
    description: `${item.label} requires an upgrade.`,
    action: { label: 'Upgrade', onClick: () => window.location.assign('/settings') },
  })
}

/* ─── Sidebar Logo ─── */

function SidebarLogo({
  collapsed,
  onToggle,
}: {
  collapsed: boolean
  onToggle: () => void
}) {
  return (
    <div className="h-14 flex items-center justify-between px-4 border-b border-[#1E1D1B]">
      <Link to="/today" className="flex items-center gap-2.5 group min-w-0">
        {/* P mark with violet ambient glow */}
        <div className="relative shrink-0">
          <div className="w-7 h-7 rounded-lg bg-[#8B7AFF] flex items-center justify-center">
            <span className="text-[#F0EDE8] text-xs font-bold tracking-tight">P</span>
          </div>
          <div
            className="absolute inset-0 rounded-lg opacity-40 blur-md -z-10"
            style={{ background: 'radial-gradient(circle, #8B7AFF 0%, transparent 70%)' }}
          />
        </div>

        {/* Wordmark — Satoshi 300 */}
        {!collapsed && (
          <span
            className="text-[15px] text-[#F0EDE8] tracking-tight"
            style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 300 }}
          >
            Parcel
          </span>
        )}
      </Link>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className={cn(
          'w-6 h-6 rounded-md flex items-center justify-center',
          'text-[#F0EDE8]/20 hover:text-[#F0EDE8]/50 hover:bg-[#141311]',
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
  )
}

/* ─── Nav Section (with label + items) ─── */

function NavSectionGroup({
  section,
  collapsed,
  isFirst,
  onNavigate,
}: {
  section: NavSectionType
  collapsed?: boolean
  isFirst?: boolean
  onNavigate?: () => void
}) {
  const { pathname } = useLocation()

  return (
    <div>
      {/* Section header */}
      {!collapsed && (
        <p
          className={cn(
            'text-[10px] uppercase tracking-wider text-[#8A8580] font-medium px-3 mb-1.5',
            !isFirst && 'mt-5'
          )}
        >
          {section.label}
        </p>
      )}
      {collapsed && !isFirst && <div className="mt-3" />}

      {/* Items */}
      <div className="space-y-0.5">
        {section.items.map((item) => {
          const active = isActive(pathname, item)
          const Icon = item.icon

          if (item.locked) {
            // Locked item — button, not link
            const btn = (
              <button
                key={item.path}
                onClick={() => handleLockedClick(item)}
                className={cn(
                  'flex items-center rounded-md opacity-50 cursor-pointer',
                  'transition-colors duration-150',
                  collapsed
                    ? 'w-10 h-10 justify-center mx-auto'
                    : 'gap-3 px-3 py-2.5 text-sm w-full',
                  'text-[#C5C0B8] hover:bg-[#141311]'
                )}
              >
                <div className="relative shrink-0">
                  <Icon size={18} strokeWidth={1.5} />
                  {collapsed && (
                    <Lock size={8} className="absolute -bottom-0.5 -right-0.5 text-[#8A8580]" />
                  )}
                </div>
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{item.label}</span>
                    <Lock size={12} className="shrink-0 text-[#8A8580]" />
                  </>
                )}
              </button>
            )

            if (collapsed) {
              return (
                <Tooltip key={item.path}>
                  <TooltipTrigger asChild>{btn}</TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">
                    {item.label} <span className="text-[#8A8580]">(Locked)</span>
                  </TooltipContent>
                </Tooltip>
              )
            }
            return btn
          }

          // Normal nav item
          const link = (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => {
                onNavigate?.()
                trackEvent('sidebar_item_clicked', { item: item.label, path: item.path, section: section.label })
              }}
              className={cn(
                'flex items-center rounded-md',
                'transition-colors duration-150',
                collapsed
                  ? 'w-10 h-10 justify-center mx-auto'
                  : 'gap-3 px-3 py-2.5 text-sm',
                active
                  ? 'bg-[#1A1918] border-l-[3px] border-l-[#8B7AFF] text-[#F0EDE8] font-medium'
                  : 'text-[#C5C0B8] hover:bg-[#141311] hover:text-[#F0EDE8]'
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

          if (collapsed) {
            return (
              <Tooltip key={item.path}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            )
          }
          return link
        })}
      </div>
    </div>
  )
}

/* ─── Sidebar Bottom Section ─── */

function SidebarBottom({ collapsed }: { collapsed: boolean }) {
  const { pathname } = useLocation()
  const user = useAuthStore((s) => s.user)

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  return (
    <div className="border-t border-[#1E1D1B] px-3 py-3 space-y-0.5">
      {BOTTOM_NAV.map((item) => {
        const active = isActive(pathname, item)
        const Icon = item.icon

        if (item.locked) {
          const btn = (
            <button
              key={item.path}
              onClick={() => handleLockedClick(item)}
              className={cn(
                'flex items-center rounded-md opacity-50 cursor-pointer',
                'transition-colors duration-150',
                collapsed
                  ? 'w-10 h-10 justify-center mx-auto'
                  : 'gap-3 px-3 py-2 text-sm w-full',
                'text-[#C5C0B8] hover:bg-[#141311]'
              )}
            >
              <Icon size={18} strokeWidth={1.5} className="shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  <Lock size={12} className="shrink-0 text-[#8A8580]" />
                </>
              )}
            </button>
          )
          if (collapsed) {
            return (
              <Tooltip key={item.path}>
                <TooltipTrigger asChild>{btn}</TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  {item.label} <span className="text-[#8A8580]">(Locked)</span>
                </TooltipContent>
              </Tooltip>
            )
          }
          return btn
        }

        const link = (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => trackEvent('sidebar_item_clicked', { item: item.label, path: item.path, section: 'bottom' })}
            className={cn(
              'flex items-center rounded-md',
              'transition-colors duration-150',
              collapsed
                ? 'w-10 h-10 justify-center mx-auto'
                : 'gap-3 px-3 py-2 text-sm',
              active
                ? 'bg-[#1A1918] border-l-[3px] border-l-[#8B7AFF] text-[#F0EDE8] font-medium'
                : 'text-[#C5C0B8] hover:bg-[#141311] hover:text-[#F0EDE8]'
            )}
          >
            <Icon
              size={18}
              strokeWidth={1.5}
              className={cn('shrink-0', active ? 'text-[#8B7AFF]' : 'text-current')}
            />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        )
        if (collapsed) {
          return (
            <Tooltip key={item.path}>
              <TooltipTrigger asChild>{link}</TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                {item.label}
              </TooltipContent>
            </Tooltip>
          )
        }
        return link
      })}

      {/* User row */}
      {!collapsed ? (
        <div className="flex items-center gap-2.5 px-3 py-2 mt-2">
          <div className="w-7 h-7 rounded-full bg-[#8B7AFF]/15 border border-[#8B7AFF]/20 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-semibold text-[#8B7AFF]">{initials}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-[#F0EDE8] truncate">{user?.name ?? 'User'}</p>
          </div>
          {user && (
            <PlanBadge
              planTier={user.plan_tier}
              trialActive={user.trial_active ?? false}
            />
          )}
        </div>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="w-10 h-10 mx-auto flex items-center justify-center">
              <div className="w-7 h-7 rounded-full bg-[#8B7AFF]/15 border border-[#8B7AFF]/20 flex items-center justify-center">
                <span className="text-[10px] font-semibold text-[#8B7AFF]">{initials}</span>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            {user?.name ?? 'User'}
          </TooltipContent>
        </Tooltip>
      )}
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
}: {
  collapsed: boolean
  onToggle: () => void
}) {
  return (
    <TooltipProvider delayDuration={300}>
      <aside
        className={cn(
          'hidden md:flex shrink-0 flex-col h-screen sticky top-0',
          'bg-[#0C0B0A] border-r border-[#1E1D1B]',
          'transition-[width] duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)]',
          collapsed ? 'w-14' : 'w-60'
        )}
      >
        {/* Logo */}
        <SidebarLogo collapsed={collapsed} onToggle={onToggle} />

        {/* Scrollable nav sections */}
        <nav
          className={cn(
            'flex-1 overflow-y-auto pt-3 scrollbar-luxury',
            collapsed ? 'px-2' : 'px-2'
          )}
          aria-label="Main navigation"
        >
          {NAV_SECTIONS.map((section, i) => (
            <NavSectionGroup
              key={section.label}
              section={section}
              collapsed={collapsed}
              isFirst={i === 0}
            />
          ))}
        </nav>

        {/* Trial banner */}
        <SidebarTrialBanner collapsed={collapsed} />

        {/* Bottom section: Settings, Compliance, User */}
        <SidebarBottom collapsed={collapsed} />
      </aside>
    </TooltipProvider>
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
  const user = useAuthStore((s) => s.user)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-[280px] p-0 bg-[#0C0B0A] border-r border-[#1E1D1B]"
      >
        <SheetTitle className="sr-only">Navigation</SheetTitle>

        {/* Logo row */}
        <div className="h-14 flex items-center px-4 border-b border-[#1E1D1B]">
          <Link
            to="/today"
            onClick={closeDrawer}
            className="flex items-center gap-2.5"
          >
            <div className="relative shrink-0">
              <div className="w-7 h-7 rounded-lg bg-[#8B7AFF] flex items-center justify-center">
                <span className="text-[#F0EDE8] text-xs font-bold tracking-tight">P</span>
              </div>
              <div
                className="absolute inset-0 rounded-lg opacity-40 blur-md -z-10"
                style={{ background: 'radial-gradient(circle, #8B7AFF 0%, transparent 70%)' }}
              />
            </div>
            <span
              className="text-[15px] text-[#F0EDE8] tracking-tight"
              style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 300 }}
            >
              Parcel
            </span>
          </Link>
        </div>

        {/* Nav sections */}
        <nav
          className="flex-1 overflow-y-auto px-2 pt-3 scrollbar-luxury"
          aria-label="Main navigation"
        >
          {NAV_SECTIONS.map((section, i) => (
            <NavSectionGroup
              key={section.label}
              section={section}
              isFirst={i === 0}
              onNavigate={closeDrawer}
            />
          ))}
        </nav>

        {/* Bottom nav */}
        <div className="border-t border-[#1E1D1B] px-2 py-3 space-y-0.5">
          {BOTTOM_NAV.map((item) => {
            const Icon = item.icon
            if (item.locked) {
              return (
                <button
                  key={item.path}
                  onClick={() => handleLockedClick(item)}
                  className="flex items-center gap-3 px-3 py-2 text-sm w-full rounded-md opacity-50 text-[#C5C0B8] hover:bg-[#141311] transition-colors cursor-pointer"
                >
                  <Icon size={18} strokeWidth={1.5} className="shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  <Lock size={12} className="shrink-0 text-[#8A8580]" />
                </button>
              )
            }
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={closeDrawer}
                className="flex items-center gap-3 px-3 py-2 text-sm rounded-md text-[#C5C0B8] hover:bg-[#141311] hover:text-[#F0EDE8] transition-colors"
              >
                <Icon size={18} strokeWidth={1.5} className="shrink-0" />
                <span>{item.label}</span>
              </Link>
            )
          })}

          {/* User info */}
          {user && (
            <div className="flex items-center gap-2.5 px-3 py-2 mt-2">
              <div className="w-7 h-7 rounded-full bg-[#8B7AFF]/15 border border-[#8B7AFF]/20 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-semibold text-[#8B7AFF]">
                  {user.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) ?? 'U'}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-[#F0EDE8] truncate">{user.name ?? 'User'}</p>
                <p className="text-[10px] text-[#8A8580] truncate">{user.email}</p>
              </div>
              <PlanBadge planTier={user.plan_tier} trialActive={user.trial_active ?? false} />
            </div>
          )}

          {/* Trial banner */}
          {user && (
            <TrialBanner
              trialEndsAt={user.trial_ends_at}
              planTier={user.plan_tier}
              trialActive={user.trial_active ?? false}
            />
          )}
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
        className="w-56 p-1.5 bg-[#141311] border border-[#1E1D1B] shadow-lg rounded-xl"
      >
        <div className="px-2.5 py-2 border-b border-[#1E1D1B] mb-1">
          <p className="text-sm font-medium text-[#F0EDE8] truncate">
            {user?.name ?? 'User'}
          </p>
          <p className="text-xs text-[#8A8580] truncate">
            {user?.email ?? ''}
          </p>
        </div>
        <Link
          to="/settings"
          className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-[#C5C0B8] hover:bg-[#1A1918] hover:text-[#F0EDE8] transition-colors"
        >
          <Settings size={14} className="text-[#8A8580]" />
          Settings
        </Link>
        <button
          onClick={() => logout()}
          disabled={isPending}
          className="flex w-full items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-[#F87171] hover:bg-[#F87171]/10 transition-colors cursor-pointer disabled:opacity-50"
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
}: {
  title?: string
  breadcrumbs?: { label: string; href?: string }[]
  actions?: React.ReactNode
  onMenuToggle: () => void
}) {
  return (
    <header className="h-14 shrink-0 flex items-center justify-between px-4 md:px-6 lg:px-8 bg-[#0C0B0A] border-b border-[#1E1D1B] sticky top-0 z-30 pt-[env(safe-area-inset-top)]">
      {/* Left */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuToggle}
          aria-label="Open navigation"
          className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg text-[#8A8580] hover:text-[#C5C0B8] hover:bg-[#141311] transition-colors cursor-pointer"
        >
          <Menu size={20} />
        </button>

        {/* Mobile logo */}
        <Link
          to="/today"
          className="md:hidden flex items-center gap-1.5"
        >
          <div className="w-6 h-6 rounded-md bg-[#8B7AFF] flex items-center justify-center">
            <span className="text-[#F0EDE8] text-[10px] font-bold">P</span>
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
                        className="text-[#F0EDE8]/20 shrink-0"
                      />
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
                        className="text-[#C5C0B8] hover:text-[#F0EDE8] transition-colors truncate"
                      >
                        {crumb.label}
                      </Link>
                    )}
                  </span>
                )
              })}
            </nav>
          ) : (
            <h1 className="text-base font-semibold text-[#F0EDE8] truncate">
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

        {/* Notification bell (placeholder) */}
        <button
          aria-label="Notifications"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8A8580] hover:text-[#C5C0B8] hover:bg-[#141311] transition-colors cursor-pointer"
        >
          <Bell size={18} strokeWidth={1.5} />
        </button>

        {/* Settings gear */}
        <Link
          to="/settings"
          aria-label="Settings"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8A8580] hover:text-[#C5C0B8] hover:bg-[#141311] transition-colors"
        >
          <Settings size={18} strokeWidth={1.5} />
        </Link>

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
      trackEvent(next ? 'sidebar_collapsed' : 'sidebar_expanded')
      return next
    })
  }

  /* Keyboard shortcut: Cmd+\ to toggle sidebar, Cmd+K for palette */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === '\\') {
        e.preventDefault()
        toggleSidebar()
      }
      if (e.metaKey && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(true)
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
    <div className="flex h-screen bg-[#0C0B0A] overflow-hidden">
      {/* Skip nav */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[#8B7AFF] focus:text-[#F0EDE8] focus:text-base focus:font-medium focus:shadow-lg focus:outline-none"
      >
        Skip to main content
      </a>

      {/* Desktop sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
      />

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
                <div className="pb-20 md:pb-0">{children}</div>
              ) : fullWidth ? (
                <div className="px-4 py-5 pb-20 md:px-8 md:py-6 lg:px-10">
                  {children}
                </div>
              ) : (
                <div className="max-w-7xl mx-auto px-4 py-5 pb-20 md:px-8 md:py-6 lg:px-10">
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

      {/* Mobile bottom tab bar */}
      <MobileTabBar />

      {/* AI floating button */}
      <AIFloatingButton />
    </div>
  )
}
