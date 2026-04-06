/**
 * Command palette (Cmd+K / Ctrl+K) for quick navigation and deal search.
 * Uses cmdk library with Framer Motion for entry/exit animations.
 * Renders as a dialog overlay available on all authenticated pages via AppShell.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Command as CommandPrimitive } from 'cmdk'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LayoutDashboard,
  LayoutGrid,
  Calendar,
  KanbanSquare,
  GitBranch,
  FolderOpen,
  Building,
  Calculator,
  FileText,
  MessageSquare,
  BarChart3,
  DollarSign,
  Users,
  Settings,
  Search,
  Columns,
  MapPin,
} from 'lucide-react'
import { api } from '@/lib/api'
import { DURATION, EASING } from '@/lib/motion'
import type { DealListItem } from '@/types'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface PageItem {
  label: string
  path: string
  icon: React.ElementType
  keywords: string[]
}

interface ActionItem {
  label: string
  description: string
  path: string
  icon: React.ElementType
  keywords: string[]
}

const PAGES: PageItem[] = [
  { label: 'Today', path: '/today', icon: Calendar, keywords: ['home', 'briefing', 'daily'] },
  { label: 'Dashboard', path: '/dashboard', icon: LayoutGrid, keywords: ['overview', 'stats', 'kpis'] },
  { label: 'Analyze', path: '/analyze', icon: Search, keywords: ['calculate', 'new deal', 'strategy', 'address'] },
  { label: 'Pipeline', path: '/pipeline', icon: KanbanSquare, keywords: ['kanban', 'stages', 'board', 'track'] },
  { label: 'Properties', path: '/properties', icon: Building, keywords: ['property', 'portfolio', 'address'] },
  { label: 'My Deals', path: '/deals', icon: FolderOpen, keywords: ['list', 'all deals', 'saved'] },
  { label: 'Contacts', path: '/contacts', icon: Users, keywords: ['people', 'sellers', 'agents', 'relationships'] },
  { label: 'Portfolio', path: '/portfolio', icon: BarChart3, keywords: ['closed', 'returns', 'equity', 'cash flow'] },
  { label: 'Transactions', path: '/transactions', icon: DollarSign, keywords: ['money', 'payments', 'income', 'expenses'] },
  { label: 'Reports', path: '/reports', icon: FileText, keywords: ['generate', 'export', 'pdf'] },
  { label: 'Documents', path: '/documents', icon: FileText, keywords: ['upload', 'contracts', 'files', 'pdf'] },
  { label: 'AI Chat', path: '/chat', icon: MessageSquare, keywords: ['ask', 'question', 'ai', 'assistant'] },
  { label: 'Compare', path: '/compare', icon: Columns, keywords: ['side by side', 'compare deals'] },
  { label: 'Settings', path: '/settings', icon: Settings, keywords: ['profile', 'account', 'preferences'] },
]

const QUICK_ACTIONS: ActionItem[] = [
  {
    label: 'Analyze New Deal',
    description: 'Start a new deal analysis',
    path: '/analyze',
    icon: Calculator,
    keywords: ['new', 'create', 'analyze', 'calculate'],
  },
  {
    label: 'Go to Pipeline',
    description: 'View your deal pipeline',
    path: '/pipeline',
    icon: GitBranch,
    keywords: ['kanban', 'board', 'stages'],
  },
  {
    label: 'Open Chat',
    description: 'Ask the AI assistant anything',
    path: '/chat',
    icon: MessageSquare,
    keywords: ['ai', 'question', 'ask', 'help'],
  },
]

/** Debounce hook — returns a debounced version of the value. */
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}

/** Overlay animation variants. */
const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATION.fast } },
  exit: { opacity: 0, transition: { duration: DURATION.fast } },
}

/** Dialog content animation variants — scale from 0.95, opacity fade. */
const contentVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: DURATION.normal, ease: EASING.snappy },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: DURATION.fast },
  },
}

/** Command Palette — global search and navigation dialog. */
function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch deals for search when there is a debounced query
  const { data: deals, isLoading: isLoadingDeals } = useQuery({
    queryKey: ['command-palette-deals', debouncedSearch],
    queryFn: () => api.deals.list(),
    enabled: open && debouncedSearch.length > 0,
    staleTime: 60_000,
  })

  // Filter deals client-side based on search query
  const filteredDeals: DealListItem[] = deals
    ? deals.filter((deal) => {
        const q = debouncedSearch.toLowerCase()
        return (
          deal.address.toLowerCase().includes(q) ||
          deal.zip_code.toLowerCase().includes(q) ||
          deal.strategy.toLowerCase().includes(q)
        )
      }).slice(0, 5)
    : []

  const close = useCallback(() => {
    onOpenChange(false)
    setSearch('')
  }, [onOpenChange])

  const handleSelect = useCallback(
    (path: string) => {
      close()
      navigate(path)
    },
    [close, navigate],
  )

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      // Small delay to ensure the element is mounted
      const timer = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(timer)
    }
  }, [open])

  // Global keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        onOpenChange(!open)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onOpenChange])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            className="fixed inset-0 z-50 bg-[#0C0B0A]/75 backdrop-blur-[20px] backdrop-saturate-[180%]"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={close}
            aria-hidden="true"
          />

          {/* Dialog content */}
          <motion.div
            className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
            variants={contentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <CommandPrimitive
              label="Command palette"
              loop
              className="w-full max-w-xl rounded-2xl border border-[#3A3835] bg-[#1A1916]/95 backdrop-blur-xl shadow-2xl overflow-hidden"
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Escape') {
                  e.preventDefault()
                  close()
                }
              }}
            >
              {/* Search input */}
              <div className="flex items-center gap-3 border-b border-border-default px-4">
                <Search size={16} className="shrink-0 text-[#8B7AFF]" />
                <CommandPrimitive.Input
                  ref={inputRef}
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Search deals, pages, actions..."
                  className="flex-1 h-12 bg-transparent text-sm text-text-primary placeholder:text-text-disabled outline-none"
                />
                <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border-default bg-layer-3 px-1.5 py-0.5 text-[10px] font-mono text-text-muted">
                  ESC
                </kbd>
              </div>

              {/* Results list */}
              <CommandPrimitive.List className="max-h-[320px] overflow-y-auto p-2 scroll-smooth [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/10">
                <CommandPrimitive.Empty className="py-8 text-center text-sm text-text-secondary">
                  No results found.
                </CommandPrimitive.Empty>

                {/* Pages group */}
                <CommandPrimitive.Group
                  heading="Pages"
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-text-secondary"
                >
                  {PAGES.map((page) => {
                    const Icon = page.icon
                    return (
                      <CommandPrimitive.Item
                        key={page.path}
                        value={page.label}
                        keywords={page.keywords}
                        onSelect={() => handleSelect(page.path)}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-text-secondary cursor-pointer transition-colors data-[selected=true]:bg-[#8B7AFF]/[0.08] data-[selected=true]:border-l-2 data-[selected=true]:border-l-[#8B7AFF] data-[selected=true]:pl-[calc(0.75rem-2px)] data-[selected=true]:text-text-primary"
                      >
                        <Icon size={16} className="shrink-0 text-text-secondary data-[selected=true]:text-[#8B7AFF]" />
                        <span>{page.label}</span>
                      </CommandPrimitive.Item>
                    )
                  })}
                </CommandPrimitive.Group>

                {/* Quick Actions group */}
                <CommandPrimitive.Group
                  heading="Quick Actions"
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-text-secondary"
                >
                  {QUICK_ACTIONS.map((action) => {
                    const ActionIcon = action.icon
                    return (
                      <CommandPrimitive.Item
                        key={`action-${action.label}`}
                        value={`action ${action.label}`}
                        keywords={action.keywords}
                        onSelect={() => handleSelect(action.path)}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-text-secondary cursor-pointer transition-colors data-[selected=true]:bg-[#8B7AFF]/[0.08] data-[selected=true]:border-l-2 data-[selected=true]:border-l-[#8B7AFF] data-[selected=true]:pl-[calc(0.75rem-2px)] data-[selected=true]:text-text-primary"
                      >
                        <ActionIcon size={16} className="shrink-0 text-text-secondary" />
                        <div className="flex flex-col">
                          <span className="text-text-primary">{action.label}</span>
                          <span className="text-xs text-text-secondary">{action.description}</span>
                        </div>
                      </CommandPrimitive.Item>
                    )
                  })}
                </CommandPrimitive.Group>

                {/* Recent Deals group — only shown when user is typing */}
                {debouncedSearch.length > 0 && (
                  <CommandPrimitive.Group
                    heading="Deals"
                    forceMount
                    className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-text-secondary"
                  >
                    {isLoadingDeals && (
                      <div className="px-3 py-4 text-xs text-text-secondary">Searching deals...</div>
                    )}
                    {!isLoadingDeals && filteredDeals.length === 0 && (
                      <div className="px-3 py-4 text-xs text-text-secondary">No deals match your search.</div>
                    )}
                    {filteredDeals.map((deal) => (
                      <CommandPrimitive.Item
                        key={deal.id}
                        value={`deal ${deal.address} ${deal.zip_code}`}
                        keywords={[deal.strategy, deal.address, deal.zip_code]}
                        onSelect={() => handleSelect(`/analyze/results/${deal.id}`)}
                        forceMount
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-text-secondary cursor-pointer transition-colors data-[selected=true]:bg-[#8B7AFF]/[0.08] data-[selected=true]:border-l-2 data-[selected=true]:border-l-[#8B7AFF] data-[selected=true]:pl-[calc(0.75rem-2px)] data-[selected=true]:text-text-primary"
                      >
                        <MapPin size={16} className="shrink-0 text-text-secondary" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-text-primary truncate">{deal.address}</span>
                          <span className="text-xs text-text-secondary">
                            {deal.strategy.replace('_', ' ')} &middot; {deal.zip_code}
                          </span>
                        </div>
                      </CommandPrimitive.Item>
                    ))}
                  </CommandPrimitive.Group>
                )}
              </CommandPrimitive.List>

              {/* Footer with keyboard hints */}
              <div className="flex items-center gap-4 border-t border-border-default bg-layer-1 px-4 py-2">
                <div className="flex items-center gap-1.5 text-[10px] text-text-secondary">
                  <kbd className="rounded border border-border-default bg-layer-3 px-1 py-0.5 font-mono text-text-muted">&uarr;</kbd>
                  <kbd className="rounded border border-border-default bg-layer-3 px-1 py-0.5 font-mono text-text-muted">&darr;</kbd>
                  <span>navigate</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-text-secondary">
                  <kbd className="rounded border border-border-default bg-layer-3 px-1 py-0.5 font-mono text-text-muted">&crarr;</kbd>
                  <span>select</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-text-secondary">
                  <kbd className="rounded border border-border-default bg-layer-3 px-1 py-0.5 font-mono text-text-muted">esc</kbd>
                  <span>close</span>
                </div>
              </div>
            </CommandPrimitive>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export { CommandPalette }
