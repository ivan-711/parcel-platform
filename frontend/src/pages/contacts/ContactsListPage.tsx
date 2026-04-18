import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Users,
  Search,
  X,
  Plus,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { prefersReducedMotion } from '@/lib/motion'
import { AppShell } from '@/components/layout/AppShell'
import { EmptyState } from '@/components/EmptyState'
import { useContacts, useDeleteContact } from '@/hooks/useContacts'
import { ContactModal } from '@/components/contacts/ContactModal'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { ContactFilters, ContactItem } from '@/types'

const PER_PAGE = 20

const TYPE_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'seller', label: 'Seller' },
  { value: 'buyer', label: 'Buyer' },
  { value: 'agent', label: 'Agent' },
  { value: 'lender', label: 'Lender' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'tenant', label: 'Tenant' },
]

const TYPE_COLORS: Record<string, string> = {
  seller: 'bg-warning-bg text-warning border-warning/30', // TODO: verify token mapping — #F97316/#FB923C mapped to warning
  buyer: 'bg-profit-bg text-profit border-profit/30',
  agent: 'bg-info-bg text-info border-info/30', // TODO: verify token mapping — #60A5FA/#93C5FD mapped to info
  lender: 'bg-violet-400/15 text-violet-300 border-violet-400/30',
  contractor: 'bg-gray-9/15 text-text-secondary border-gray-9/30', // TODO: verify token mapping — #8A8580/#C5C0B8 mapped to gray-9/text-secondary
  tenant: 'bg-success-bg text-success border-success/30', // TODO: verify token mapping — #2DD4BF/#5EEAD4 mapped to success
  partner: 'bg-warning-bg text-warning border-warning/30', // TODO: verify token mapping — #FBBF24/#FCD34D mapped to warning
  other: 'bg-border-default text-text-muted border-border-default',
}

export function TypeBadge({ type }: { type: string | null }) {
  if (!type) return null
  const colors = TYPE_COLORS[type] || TYPE_COLORS.other
  return (
    <span className={cn('text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border whitespace-nowrap', colors)}>
      {type}
    </span>
  )
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}

export default function ContactsListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const debouncedSearch = useDebouncedValue(search, 300)

  const filters: ContactFilters = {
    page,
    per_page: PER_PAGE,
    ...(typeFilter && { type: typeFilter }),
    ...(debouncedSearch && { q: debouncedSearch }),
  }

  const { data, isLoading, isError } = useContacts(filters)
  const deleteMutation = useDeleteContact()

  const contacts = data?.contacts ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PER_PAGE)
  const hasFilters = !!typeFilter || !!debouncedSearch

  useEffect(() => {
    try {
      (window as any).posthog?.capture?.('contacts_list_viewed', {
        count: total,
        filter_type: typeFilter || 'all',
        search_used: !!debouncedSearch,
      })
    } catch { /* ignore */ }
  }, [total, typeFilter, debouncedSearch])

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success('Contact deleted'),
      onError: () => toast.error('Failed to delete'),
    })
    try {
      (window as any).posthog?.capture?.('contact_deleted', { contact_id: id })
    } catch { /* ignore */ }
  }

  const clearFilters = () => {
    setSearch('')
    setTypeFilter('')
    setPage(1)
  }

  return (
    <AppShell
      title="Contacts"
      actions={
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-violet-400 text-white hover:bg-violet-500 transition-colors cursor-pointer"
        >
          <Plus size={14} />
          Add Contact
        </button>
      }
    >
      <div className="space-y-5">
        {total > 0 && (
          <p className="text-sm text-text-muted">{total} contact{total !== 1 ? 's' : ''}</p>
        )}

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search contacts..."
              className="w-full h-9 pl-9 pr-8 rounded-lg bg-app-recessed border border-border-default text-sm text-text-primary placeholder-text-muted/60 focus:outline-none focus:border-violet-400/40 focus:ring-2 focus:ring-violet-400/20 transition-all"
            />
            {search && (
              <button onClick={() => { setSearch(''); setPage(1) }} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors cursor-pointer">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-luxury">
            {TYPE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => { setTypeFilter(opt.value); setPage(1) }}
                className={cn(
                  'text-xs px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer',
                  typeFilter === opt.value
                    ? 'bg-violet-400/15 text-violet-300 border border-violet-400/30'
                    : 'bg-app-recessed text-text-muted border border-border-default hover:text-text-secondary'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {isError && (
          <div className="bg-loss-bg border border-loss/20 rounded-lg p-4 text-sm text-loss">
            Failed to load contacts.
          </div>
        )}

        {isLoading && (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 bg-app-recessed rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && !isError && contacts.length === 0 && !hasFilters && (
          <EmptyState
            icon={Users}
            heading="No contacts yet"
            description="Add sellers, buyers, agents, and other contacts you work with."
            ctaLabel="Add Contact"
            onCtaClick={() => setModalOpen(true)}
          />
        )}

        {!isLoading && !isError && contacts.length === 0 && hasFilters && (
          <div className="text-center py-12">
            <p className="text-sm text-text-muted mb-2">No contacts match your search.</p>
            <button onClick={clearFilters} className="text-sm text-violet-400 hover:text-violet-300 transition-colors cursor-pointer">
              Clear filters
            </button>
          </div>
        )}

        {/* Table */}
        {!isLoading && contacts.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="border border-border-default rounded-xl overflow-hidden"
          >
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-app-recessed border-b border-border-default">
                    <th className="text-left text-[10px] uppercase tracking-wider text-text-muted font-medium px-4 py-3">Name</th>
                    <th className="text-left text-[10px] uppercase tracking-wider text-text-muted font-medium px-4 py-3">Type</th>
                    <th className="text-left text-[10px] uppercase tracking-wider text-text-muted font-medium px-4 py-3">Phone</th>
                    <th className="text-left text-[10px] uppercase tracking-wider text-text-muted font-medium px-4 py-3">Email</th>
                    <th className="text-right text-[10px] uppercase tracking-wider text-text-muted font-medium px-4 py-3">Deals</th>
                    <th className="text-right text-[10px] uppercase tracking-wider text-text-muted font-medium px-4 py-3">Last Contact</th>
                    <th className="text-right text-[10px] uppercase tracking-wider text-text-muted font-medium px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((c) => {
                    const fullName = [c.first_name, c.last_name].filter(Boolean).join(' ')
                    return (
                      <motion.tr
                        key={c.id}
                        whileHover={prefersReducedMotion ? undefined : { y: -2 }}
                        className="group border-b border-border-default last:border-0 hover:bg-app-recessed/60 transition-shadow duration-200 hover:shadow-lg cursor-pointer"
                        onClick={() => navigate(`/contacts/${c.id}`)}
                      >
                        <td className="px-4 py-3">
                          <span className="text-text-primary font-medium">{fullName}</span>
                          {c.company && <p className="text-xs text-text-muted mt-0.5">{c.company}</p>}
                        </td>
                        <td className="px-4 py-3"><TypeBadge type={c.contact_type} /></td>
                        <td className="px-4 py-3 text-text-secondary">{c.phone || '—'}</td>
                        <td className="px-4 py-3 text-text-secondary max-w-[180px] truncate">{c.email || '—'}</td>
                        <td className="px-4 py-3 text-right text-text-secondary tabular-nums">{c.deal_count}</td>
                        <td className="px-4 py-3 text-right text-xs text-text-muted tabular-nums">
                          {c.last_communication ? formatRelativeTime(c.last_communication) : 'Never'}
                        </td>
                        <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                          <ContactActions
                            contact={c}
                            onDelete={() => handleDelete(c.id, fullName)}
                            onEdit={() => navigate(`/contacts/${c.id}`)}
                          />
                        </td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-border-default">
              {contacts.map((c) => {
                const fullName = [c.first_name, c.last_name].filter(Boolean).join(' ')
                return (
                  <motion.div key={c.id} whileHover={prefersReducedMotion ? undefined : { y: -2 }}>
                  <Link
                    to={`/contacts/${c.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-app-recessed/60 transition-shadow duration-200 hover:shadow-lg"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-text-primary font-medium truncate">{fullName}</span>
                        <TypeBadge type={c.contact_type} />
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">
                        {c.phone || c.email || 'No contact info'}
                      </p>
                    </div>
                    <span className="text-xs text-text-muted shrink-0 ml-3">
                      {c.last_communication ? formatRelativeTime(c.last_communication) : 'Never'}
                    </span>
                  </Link>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted">
              Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, total)} of {total}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-secondary hover:bg-app-recessed disabled:opacity-30 transition-colors cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-2 text-text-secondary tabular-nums">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-secondary hover:bg-app-recessed disabled:opacity-30 transition-colors cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Contact Modal */}
      <ContactModal
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </AppShell>
  )
}

function ContactActions({
  contact,
  onDelete,
  onEdit,
}: {
  contact: ContactItem
  onDelete: () => void
  onEdit: () => void
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button aria-label="Contact actions" className="w-7 h-7 rounded-md flex items-center justify-center text-text-muted hover:text-text-secondary hover:bg-app-recessed opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
          <MoreHorizontal size={14} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={4} className="w-40 p-1 bg-app-recessed border border-border-default shadow-lg rounded-xl">
        <Link to={`/contacts/${contact.id}`} className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-text-secondary hover:bg-app-surface hover:text-text-primary transition-colors">
          <Eye size={14} /> View
        </Link>
        <button onClick={onEdit} className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-sm text-text-secondary hover:bg-app-surface hover:text-text-primary transition-colors cursor-pointer">
          <Pencil size={14} /> Edit
        </button>
        <button onClick={onDelete} className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-sm text-loss hover:bg-loss-bg transition-colors cursor-pointer">
          <Trash2 size={14} /> Delete
        </button>
      </PopoverContent>
    </Popover>
  )
}

function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
