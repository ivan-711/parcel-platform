import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { MOBILE_PRIMARY_TABS, MORE_ICON, NAV_SECTIONS, BOTTOM_NAV } from './nav-data'

const PRIMARY_PATHS = MOBILE_PRIMARY_TABS.map((t) => t.path)
const CHAT_PATH = '/chat'

function trackEvent(event: string, props?: Record<string, unknown>) {
  try { (window as any).posthog?.capture?.(event, props) } catch { /* ignore */ }
}

function handleLockedClick(label: string, path: string) {
  trackEvent('locked_feature_clicked', { item: label, path })
  toast('Available on Pro plan', {
    description: `${label} requires an upgrade.`,
    action: { label: 'Upgrade', onClick: () => window.location.assign('/settings') },
  })
}

export function MobileTabBar() {
  const [moreOpen, setMoreOpen] = useState(false)
  const { pathname } = useLocation()
  const navigate = useNavigate()

  // Is "More" active? True if sheet is open or current path is in more items
  const isMoreActive = moreOpen || (
    !PRIMARY_PATHS.some((p) => pathname.startsWith(p)) &&
    !pathname.startsWith(CHAT_PATH) &&
    pathname !== '/today'
  )

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-app-bg border-t border-border-default h-16 pb-[env(safe-area-inset-bottom)] flex items-center justify-around"
        aria-label="Mobile navigation"
      >
        {MOBILE_PRIMARY_TABS.map((tab) => {
          const active = pathname.startsWith(tab.path) || (tab.path === '/today' && pathname === '/today')
          const Icon = tab.icon
          return (
            <Link
              key={tab.path}
              to={tab.path}
              onClick={() => trackEvent('mobile_tab_clicked', { tab: tab.label })}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 min-w-[64px] min-h-[44px] py-2 active:opacity-70 transition-colors duration-150 focus-ring rounded-lg',
                active ? 'text-violet-400' : 'text-text-muted'
              )}
            >
              <div className={cn('w-4 h-0.5 rounded-full mx-auto mb-0.5', active ? 'bg-violet-400' : 'bg-transparent')} />
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium tracking-wide">{tab.label}</span>
            </Link>
          )
        })}

        {/* More tab */}
        <button
          onClick={() => {
            setMoreOpen(true)
            trackEvent('mobile_more_opened')
          }}
          className={cn(
            'flex flex-col items-center justify-center gap-0.5 min-w-[64px] min-h-[44px] py-2 active:opacity-70 transition-colors duration-150 cursor-pointer focus-ring rounded-lg',
            isMoreActive ? 'text-violet-400' : 'text-text-muted'
          )}
        >
          <div className={cn('w-4 h-0.5 rounded-full mx-auto mb-0.5', isMoreActive ? 'bg-violet-400' : 'bg-transparent')} />
          <MORE_ICON className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-wide">More</span>
        </button>
      </nav>

      {/* More bottom sheet — grouped by section */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl bg-app-recessed max-h-[70vh] p-0 overflow-y-auto">
          <SheetTitle className="sr-only">More navigation</SheetTitle>
          {/* Drag handle */}
          <div className="w-10 h-1 rounded-full bg-border-default mx-auto mt-3 mb-2 sticky top-0" />

          <nav className="pb-8" aria-label="More pages">
            {NAV_SECTIONS.map((section) => {
              // Filter out primary tab paths — they're already in the tab bar
              const items = section.items.filter(
                (item) => !PRIMARY_PATHS.includes(item.path) && item.path !== CHAT_PATH
              )
              if (items.length === 0) return null

              return (
                <div key={section.label}>
                  <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium px-5 mt-4 mb-1.5">
                    {section.label}
                  </p>
                  {items.map((item) => {
                    const Icon = item.icon
                    const active = pathname.startsWith(item.path)

                    if (item.locked) {
                      return (
                        <button
                          key={item.path}
                          onClick={() => {
                            handleLockedClick(item.label, item.path)
                            setMoreOpen(false)
                          }}
                          className="flex items-center gap-3 w-full h-12 px-5 text-sm opacity-50 text-text-secondary hover:bg-app-surface transition-colors cursor-pointer focus-ring rounded-lg"
                        >
                          <Icon className="w-5 h-5 shrink-0" />
                          <span className="flex-1 text-left">{item.label}</span>
                          <Lock size={12} className="shrink-0 text-text-muted" />
                        </button>
                      )
                    }

                    return (
                      <button
                        key={item.path}
                        onClick={() => {
                          navigate(item.path)
                          setMoreOpen(false)
                          trackEvent('mobile_tab_clicked', { tab: item.label })
                        }}
                        className={cn(
                          'flex items-center gap-3 w-full h-12 px-5 text-sm transition-colors duration-150 cursor-pointer focus-ring rounded-lg',
                          active ? 'text-violet-400' : 'text-text-primary hover:bg-app-surface'
                        )}
                      >
                        <Icon className="w-5 h-5 shrink-0" />
                        {item.label}
                      </button>
                    )
                  })}
                </div>
              )
            })}

            {/* Bottom nav items in More sheet */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium px-5 mt-4 mb-1.5">
                ACCOUNT
              </p>
              {BOTTOM_NAV.map((item) => {
                const Icon = item.icon
                if (item.locked) {
                  return (
                    <button
                      key={item.path}
                      onClick={() => {
                        handleLockedClick(item.label, item.path)
                        setMoreOpen(false)
                      }}
                      className="flex items-center gap-3 w-full h-12 px-5 text-sm opacity-50 text-text-secondary hover:bg-app-surface transition-colors cursor-pointer focus-ring rounded-lg"
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      <span className="flex-1 text-left">{item.label}</span>
                      <Lock size={12} className="shrink-0 text-text-muted" />
                    </button>
                  )
                }
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path)
                      setMoreOpen(false)
                    }}
                    className="flex items-center gap-3 w-full h-12 px-5 text-sm text-text-primary hover:bg-app-surface transition-colors cursor-pointer focus-ring rounded-lg"
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    {item.label}
                  </button>
                )
              })}
            </div>
          </nav>
        </SheetContent>
      </Sheet>
    </>
  )
}
