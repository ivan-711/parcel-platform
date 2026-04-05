import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Users,
  Mail,
  Phone,
  Building,
  Pencil,
  Trash2,
  Plus,
  GitBranch,
} from 'lucide-react'
import { toast } from 'sonner'
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

export default function ContactDetailPage() {
  const { contactId } = useParams<{ contactId: string }>()
  const navigate = useNavigate()
  const [editOpen, setEditOpen] = useState(false)
  const [showLogForm, setShowLogForm] = useState(false)

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
          <div className="h-8 w-48 bg-[#141311] rounded animate-pulse" />
          <div className="h-40 bg-[#141311] rounded-xl animate-pulse" />
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1
                className="text-xl sm:text-2xl text-[#F0EDE8]"
                style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 300 }}
              >
                {fullName}
              </h1>
              <TypeBadge type={contact.contact_type} />
            </div>
            {contact.company && (
              <p className="text-sm text-[#8A8580]">{contact.company}</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setEditOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-[#C5C0B8] border border-[#1E1D1B] hover:bg-[#141311] hover:text-[#F0EDE8] transition-colors cursor-pointer"
            >
              <Pencil size={14} />
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-[#F87171] border border-[#F87171]/20 hover:bg-[#F87171]/10 transition-colors cursor-pointer"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Contact Info */}
          <div className="space-y-6">
            <Card title="Contact Information">
              <div className="space-y-3">
                {contact.email && (
                  <InfoRow icon={Mail} label="Email">
                    <a href={`mailto:${contact.email}`} className="text-[#8B7AFF] hover:text-[#A89FFF] transition-colors">
                      {contact.email}
                    </a>
                  </InfoRow>
                )}
                {contact.phone && (
                  <InfoRow icon={Phone} label="Phone">
                    <a href={`tel:${contact.phone}`} className="text-[#C5C0B8] hover:text-[#F0EDE8] transition-colors">
                      {contact.phone}
                    </a>
                  </InfoRow>
                )}
                {contact.company && (
                  <InfoRow icon={Building} label="Company">
                    <span className="text-[#C5C0B8]">{contact.company}</span>
                  </InfoRow>
                )}
                {!contact.email && !contact.phone && !contact.company && (
                  <p className="text-sm text-[#8A8580]">No contact details added.</p>
                )}
              </div>
            </Card>

            {/* Notes */}
            {contact.notes && (
              <Card title="Notes">
                <p className="text-sm text-[#C5C0B8] whitespace-pre-line">{contact.notes}</p>
              </Card>
            )}

            {/* Tags */}
            {contact.tags && contact.tags.length > 0 && (
              <Card title="Tags">
                <div className="flex flex-wrap gap-1.5">
                  {contact.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-0.5 rounded bg-[#1E1D1B] text-[#C5C0B8]"
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
                <p className="text-sm text-[#8A8580] py-2">No tasks for this contact.</p>
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
                  <h3 className="text-[11px] uppercase tracking-wider text-[#8A8580] font-medium mb-3">
                    Conversation
                  </h3>
                  <div className="bg-[#141311] border border-[#1E1D1B] rounded-xl p-5">
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
                  <h3 className="text-[11px] uppercase tracking-wider text-[#8A8580] font-medium">
                    Activity Log
                  </h3>
                  <button
                    onClick={() => setShowLogForm(!showLogForm)}
                    className="inline-flex items-center gap-1 text-xs text-[#8B7AFF] hover:text-[#A89FFF] transition-colors cursor-pointer"
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

                <div className="bg-[#141311] border border-[#1E1D1B] rounded-xl p-5">
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
                <h3 className="text-[11px] uppercase tracking-wider text-[#8A8580] font-medium">
                  Linked Deals
                </h3>
              </div>

              <div className="bg-[#141311] border border-[#1E1D1B] rounded-xl p-5">
                {!linkedDeals || linkedDeals.length === 0 ? (
                  <p className="text-sm text-[#8A8580] py-4 text-center">
                    No deals linked to this contact.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {linkedDeals.map((deal) => (
                      <div
                        key={deal.deal_id}
                        className="flex items-center justify-between p-3 rounded-lg bg-[#0C0B0A] border border-[#1E1D1B]"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#1E1D1B] flex items-center justify-center">
                            <GitBranch size={14} className="text-[#8A8580]" />
                          </div>
                          <div>
                            <p className="text-sm text-[#F0EDE8]">{deal.address}</p>
                            <p className="text-xs text-[#8A8580]">
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
        </div>
      </div>

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
    <div className="bg-[#141311] border border-[#1E1D1B] rounded-xl p-5">
      <h3 className="text-[11px] uppercase tracking-wider text-[#8A8580] font-medium mb-4">
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
      <div className="w-7 h-7 rounded-md bg-[#1E1D1B] flex items-center justify-center shrink-0">
        <Icon size={13} className="text-[#8A8580]" />
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-[#8A8580]">{label}</p>
        <div className="text-sm">{children}</div>
      </div>
    </div>
  )
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#0C0B0A] rounded-lg p-3">
      <p className="text-[10px] uppercase tracking-wider text-[#8A8580] mb-1">{label}</p>
      <p className="text-sm text-[#F0EDE8] font-medium tabular-nums">{value}</p>
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
