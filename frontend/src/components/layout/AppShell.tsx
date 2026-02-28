import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  GitBranch,
  FolderOpen,
  Calculator,
  FileText,
  MessageSquare,
  BarChart3,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AppShellProps {
  children: React.ReactNode
  title?: string
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

function NavGroup({ label, items }: { label: string; items: NavItem[] }) {
  const { pathname } = useLocation()

  return (
    <div className="space-y-0.5">
      <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
        {label}
      </p>
      {items.map((item) => {
        const active = pathname === item.path
        const Icon = item.icon
        return (
          <Link
            key={item.path}
            to={item.path}
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

function Sidebar() {
  return (
    <aside
      className="w-[216px] shrink-0 flex flex-col border-r border-border-subtle bg-app-bg h-screen sticky top-0"
    >
      {/* Logo */}
      <div className="h-[52px] flex items-center px-4 border-b border-border-subtle">
        <span className="text-lg font-semibold text-accent-primary tracking-tight">Parcel</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-5 mt-2">
        <NavGroup label="Main" items={NAV_MAIN} />
        <NavGroup label="Tools" items={NAV_TOOLS} />
        <NavGroup label="Account" items={NAV_ACCOUNT} />
      </nav>
    </aside>
  )
}

function Topbar({ title }: { title?: string }) {
  return (
    <header className="h-[52px] shrink-0 flex items-center justify-between px-6 border-b border-border-subtle">
      {/* Page title */}
      <h1 className="text-sm font-semibold text-text-primary">{title ?? 'Parcel'}</h1>

      {/* Search pill (cosmetic) */}
      <button className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border-subtle bg-app-surface text-text-muted text-xs hover:border-border-default transition-colors">
        <span>Search</span>
        <kbd className="text-[10px] font-mono bg-app-elevated px-1.5 py-0.5 rounded">⌘K</kbd>
      </button>

      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-accent-primary/20 border border-accent-primary/30 flex items-center justify-center">
        <span className="text-xs font-semibold text-accent-primary">U</span>
      </div>
    </header>
  )
}

/**
 * Root layout for all authenticated app pages.
 * Renders the sidebar, topbar, and scrollable main content area.
 */
export function AppShell({ children, title }: AppShellProps) {
  return (
    <div className="flex h-screen bg-app-bg overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar title={title} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
