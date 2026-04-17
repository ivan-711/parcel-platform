import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Users,
  Mail,
  Phone,
  Building,
  Pencil,
  Trash2,
  Plus,
  GitBranch,
  Repeat,
} from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { TaskList } from '@/components/tasks/TaskList'
import { AddTaskForm } from '@/components/tasks/AddTaskForm'
import { useTasksList } from '@/hooks/useTasks'
import { AppShell } from '@/components/layout/AppShell'
import { EmptyState } from '@/components/EmptyState'
import { ContactModal } from '@/components/contacts/ContactModal'
import { CommunicationLog } from '@/components/contacts/CommunicationLog'
import { LogActivityForm } from '@/components/contacts/LogActivityForm'
import { ConversationThread } from '@/components/communications/ConversationThread'
import { TypeBadge } from './ContactsListPage'
import {
  useContact,
  useContactCommunications,
  useContactDeals,
  useDeleteContact,
} from '@/hooks/useContacts'
import { useSequences } from '@/hooks/useSequences'
import { safeStaggerContainer, safeStaggerItem } from '@/lib/motion'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

export default function ContactDetailPage() {
  const { contactId } = useParams<{ contactId: string }>()
  const navigate = useNavigate()
  const [editOpen, setEditOpen] = useState(false)
  const [showLogForm, setShowLogForm] = useState(false)
  const [seqDropdownOpen, setSeqDropdownOpen] = useState(false)
  const { data: sequences } = useSequences()
  const activeSequences = (sequences ?? []).filter(s => s.status === 'active')
  const queryClient = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)

  const { data: contact, isLoading, isError } = useContact(contactId)
  const { data: communications, isLoading: commsLoading } = useContactCommunications(contactId)
  const { data: linkedDeals } = useContactDeals(contactId)
  const { data: tasksData } = useTasksList({ contact_id: contactId, per_page: 5 })
  const deleteMutation = useDeleteContact()

  if (contact) {
    try {
      (window as any).posthog?.capture?.('contact_detail_viewed', {
        contact_id: contactId,
        type: contact.contact_type,
        deal_count: linkedDeals?.length ?? 0,
      })
    } catch { /* ignore */ }
  }

  const handleDelete = () => {
    if (!contact || !contactId) return
    const name = [contact.first_name, contact.last_name].filter(Boolean).join(' ')
    if (!confirm(`Delete "${name}"?`)) return
    deleteMutation.mutate(contactId, {
      onSuccess: () => {
        toast.success('Contact deleted')
        navigate('/contacts')
      },
      onError: () => toast.error('Failed to delete'),
    })
  }

  if (isLoading) {
    return (
      <AppShell title="Contact">
        <div className="space-y-4">
          <div className="h-8 w-48 bg-app-recessed rounded animate-pulse" />
          <div className="h-40 bg-app-recessed rounded-xl animate-pulse" />
        </div>
      </AppShell>
    )
  }

  if (isError || !contact) {
    return (
      <AppShell title="Contact">
        <EmptyState
          icon={Users}
          heading="Contact not found"
          description="This contact may have been deleted."
          ctaLabel="Back to Contacts"
          ctaHref="/contacts"
        />
      </AppShell>
    )
  }

  const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(' ')

  return (
    <AppShell
      title={fullName}
      breadcrumbs={[
        { label: 'Contacts', href: '/contacts' },
        { label: fullName },
      ]}
    >
      <motion.div
        variants={safeStaggerContainer(100)}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Header */}
        <motion.div variants={safeStaggerItem} className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1
                className="text-xl sm:text-2xl text-text-primary font-brand font-light"
              >
                {fullName}
              </h1>
              <TypeBadge type={contact.contact_type} />
            </div>
            {contact.company && (
              <p className="text-sm text-text-muted">{contact.company}</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setEditOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-text-secondary border border-border-default hover:bg-app-recessed hover:text-text-primary transition-colors cursor-pointer"
            >
              <Pencil size={14} />
              Edit
            </button>
            {seqDropdownOpen && (
              <div className="fixed inset-0 z-10" onClick={() => setSeqDropdownOpen(false)} />
            )}
            <div className="relative">
              <button
                onClick={() => setSeqDropdownOpen(v => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-text-secondary border border-border-default hover:bg-app-recessed hover:text-text-primary transition-colors cursor-pointer"
              >
                <Repeat size={14} />
                Add to Sequence
              </button>
              {seqDropdownOpen && activeSequences.length > 0 && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-app-recessed border border-border-default rounded-xl shadow-xl z-20 py-1">
                  {activeSequences.map(seq => (
                    <button
                      key={seq.id}
                      onClick={async () => {
                        try {
                          await api.sequences.enroll(seq.id, { contact_id: contactId! })
                          toast.success(`Enrolled in "${seq.name}"`)
                          queryClient.invalidateQueries({ queryKey: ['u', userId, 'sequences'] })
                          setSeqDropdownOpen(false)
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : 'Failed to enroll')
                        }
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-border-default hover:text-text-primary transition-colors"
                    >
                      {seq.name}
                      <span className="text-[10px] text-text-muted ml-1">
                        ({seq.step_count} steps)
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {seqDropdownOpen && activeSequences.length === 0 && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-app-recessed border border-border-default rounded-xl shadow-xl z-20 p-3">
                  <p className="text-xs text-text-muted">No active sequences. Create one first.</p>
                </div>
              )}
            </div>
            <Link
              to="/mail-campaigns/new"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-text-secondary border border-border-default hover:bg-app-recessed hover:text-text-primary transition-colors"
            >
              <Mail size={14} />
              Send Mail
            </Link>
            <button
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-loss border border-loss/20 hover:bg-loss-bg transition-colors cursor-pointer"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </motion.div>

        {/* Two-column layout */}
        <motion.div variants={safeStaggerItem} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Contact Info */}
          <div className="space-y-6">
            <Card title="Contact Information">
              <div className="space-y-3">
                {contact.email && (
                  <InfoRow icon={Mail} label="Email">
                    <a href={`mailto:${contact.email}`} className="text-violet-400 hover:text-violet-300 transition-colors">
                      {contact.email}
                    </a>
                  </InfoRow>
                )}
                {contact.phone && (
                  <InfoRow icon={Phone} label="Phone">
                    <a href={`tel:${contact.phone}`} className="text-text-secondary hover:text-text-primary transition-colors">
                      {contact.phone}
                    </a>
                  </InfoRow>
                )}
                {contact.company && (
                  <InfoRow icon={Building} label="Company">
                    <span className="text-text-secondary">{contact.company}</span>
                  </InfoRow>
                )}
                {!contact.email && !contact.phone && !contact.company && (
                  <p className="text-sm text-text-muted">No contact details added.</p>
                )}
              </div>
            </Card>

            {/* Notes */}
            {contact.notes && (
              <Card title="Notes">
                <p className="text-sm text-text-secondary whitespace-pre-line">{contact.notes}</p>
              </Card>
            )}

            {/* Tags */}
            {contact.tags && contact.tags.length > 0 && (
              <Card title="Tags">
                <div className="flex flex-wrap gap-1.5">
                  {contact.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-0.5 rounded bg-border-default text-text-secondary"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </Card>
            )}

            {/* Deal metrics summary */}
            {linkedDeals && linkedDeals.length > 0 && (
              <Card title="Deal Metrics">
                <div className="grid grid-cols-2 gap-3">
                  <MetricBox label="Linked Deals" value={String(linkedDeals.length)} />
                  <MetricBox
                    label="Last Active"
                    value={
                      communications && communications.length > 0
                        ? formatRelativeTime(communications[0].occurred_at)
                        : 'Never'
                    }
                  />
                </div>
              </Card>
            )}

            {/* Tasks */}
            <Card title="Tasks">
              {(!tasksData || tasksData.tasks.length === 0) ? (
                <p className="text-sm text-text-muted py-2">No tasks for this contact.</p>
              ) : (
                <TaskList tasks={tasksData.tasks} compact />
              )}
              <div className="mt-3">
                <AddTaskForm contactId={contactId} />
              </div>
            </Card>
          </div>

          {/* Middle + Right: Communications + Deals */}
          <div className="lg:col-span-2 space-y-6">
            {/* Conversation + Activity Log */}
            <div className="space-y-6">
              {/* Conversation Thread — only if contact has phone or email */}
              {(contact.phone || contact.email) && (
                <div>
                  <h3 className="text-[11px] uppercase tracking-wider text-text-muted font-medium mb-3">
                    Conversation
                  </h3>
                  <div className="bg-app-recessed border border-border-default rounded-xl p-5">
                    <ConversationThread
                      contactId={contactId!}
                      contactPhone={contact.phone}
                      contactEmail={contact.email}
                    />
                  </div>
                </div>
              )}

              {/* Activity Log */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[11px] uppercase tracking-wider text-text-muted font-medium">
                    Activity Log
                  </h3>
                  <button
                    onClick={() => setShowLogForm(!showLogForm)}
                    className="inline-flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors cursor-pointer"
                  >
                    <Plus size={12} />
                    Log Activity
                  </button>
                </div>

                {showLogForm && (
                  <div className="mb-4">
                    <LogActivityForm
                      contactId={contactId!}
                      onLogged={() => setShowLogForm(false)}
                    />
                  </div>
                )}

                <div className="bg-app-recessed border border-border-default rounded-xl p-5">
                  <CommunicationLog
                    communications={communications ?? []}
                    loading={commsLoading}
                  />
                </div>
              </div>
            </div>

            {/* Linked Deals */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[11px] uppercase tracking-wider text-text-muted font-medium">
                  Linked Deals
                </h3>
              </div>

              <div className="bg-app-recessed border border-border-default rounded-xl p-5">
                {!linkedDeals || linkedDeals.length === 0 ? (
                  <p className="text-sm text-text-muted py-4 text-center">
                    No deals linked to this contact.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {linkedDeals.map((deal) => (
                      <div
                        key={deal.deal_id}
                        className="flex items-center justify-between p-3 rounded-lg bg-app-bg border border-border-default"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-border-default flex items-center justify-center">
                            <GitBranch size={14} className="text-text-muted" />
                          </div>
                          <div>
                            <p className="text-sm text-text-primary">{deal.address}</p>
                            <p className="text-xs text-text-muted">
                              {deal.strategy.replace(/_/g, ' ')} · {deal.status}
                              {deal.role && ` · ${deal.role}`}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Edit modal */}
      <ContactModal
        open={editOpen}
        onOpenChange={setEditOpen}
        contact={contact}
      />
    </AppShell>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-app-recessed border border-border-default rounded-xl p-5">
      <h3 className="text-[11px] uppercase tracking-wider text-text-muted font-medium mb-4">
        {title}
      </h3>
      {children}
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-7 h-7 rounded-md bg-border-default flex items-center justify-center shrink-0">
        <Icon size={13} className="text-text-muted" />
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-text-muted">{label}</p>
        <div className="text-sm">{children}</div>
      </div>
    </div>
  )
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-app-bg rounded-lg p-3">
      <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">{label}</p>
      <p className="text-sm text-text-primary font-medium tabular-nums">{value}</p>
    </div>
  )
}

function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
