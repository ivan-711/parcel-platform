import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Calculator,
  GitBranch,
  MessageSquare,
  Menu,
  FolderOpen,
  BarChart3,
  FileText,
  CreditCard,
  Settings,
} from 'lucide-react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

const PRIMARY_TABS: { label: string; path: string; icon: LucideIcon }[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Analyze', path: '/analyze', icon: Calculator },
  { label: 'Pipeline', path: '/pipeline', icon: GitBranch },
  { label: 'Chat', path: '/chat', icon: MessageSquare },
]

const MORE_ITEMS: { label: string; path: string; icon: LucideIcon }[] = [
  { label: 'My Deals', path: '/deals', icon: FolderOpen },
  { label: 'Portfolio', path: '/portfolio', icon: BarChart3 },
  { label: 'Documents', path: '/documents', icon: FileText },
  { label: 'Pricing', path: '/pricing', icon: CreditCard },
  { label: 'Settings', path: '/settings', icon: Settings },
]

const MORE_PATHS = MORE_ITEMS.map((i) => i.path)

export function MobileTabBar() {
  const [moreOpen, setMoreOpen] = useState(false)
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const isMoreActive = moreOpen || MORE_PATHS.some((p) => pathname.startsWith(p))

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-app-bg border-t border-border-default h-16 pb-[env(safe-area-inset-bottom)] flex items-center justify-around"
        aria-label="Mobile navigation"
      >
        {PRIMARY_TABS.map((tab) => {
          const active = pathname.startsWith(tab.path)
          const Icon = tab.icon
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 min-w-[64px] py-2 active:opacity-70 transition-colors duration-150',
                active ? 'text-[#8B7AFF]' : 'text-text-muted'
              )}
            >
              <div className={cn('w-4 h-0.5 rounded-full mx-auto mb-0.5', active ? 'bg-[#8B7AFF]' : 'bg-transparent')} />
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium tracking-wide">{tab.label}</span>
            </Link>
          )
        })}

        {/* More tab */}
        <button
          onClick={() => setMoreOpen(true)}
          className={cn(
            'flex flex-col items-center justify-center gap-0.5 min-w-[64px] py-2 active:opacity-70 transition-colors duration-150 cursor-pointer',
            isMoreActive ? 'text-[#8B7AFF]' : 'text-text-muted'
          )}
        >
          <div className={cn('w-4 h-0.5 rounded-full mx-auto mb-0.5', isMoreActive ? 'bg-[#8B7AFF]' : 'bg-transparent')} />
          <Menu className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-wide">More</span>
        </button>
      </nav>

      {/* More bottom sheet */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl bg-app-surface max-h-[60vh] p-0">
          <SheetTitle className="sr-only">More navigation</SheetTitle>
          {/* Drag handle */}
          <div className="w-10 h-1 rounded-full bg-border-default mx-auto mt-3 mb-4" />
          <nav className="pb-8" aria-label="More pages">
            {MORE_ITEMS.map((item) => {
              const Icon = item.icon
              const active = pathname.startsWith(item.path)
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path)
                    setMoreOpen(false)
                  }}
                  className={cn(
                    'flex items-center gap-3 w-full h-12 px-5 text-sm transition-colors duration-150 cursor-pointer',
                    active ? 'text-[#8B7AFF]' : 'text-text-primary hover:bg-layer-2'
                  )}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {item.label}
                </button>
              )
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  )
}
