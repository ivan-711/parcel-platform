import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { useCreateContact, useUpdateContact } from '@/hooks/useContacts'
import { cn } from '@/lib/utils'
import type { ContactDetail, ContactType } from '@/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  contact?: ContactDetail | null
}

const TYPE_OPTIONS: { value: ContactType; label: string; color: string }[] = [
  { value: 'seller', label: 'Seller', color: '#F97316' },
  { value: 'buyer', label: 'Buyer', color: '#4ADE80' },
  { value: 'agent', label: 'Agent', color: '#60A5FA' },
  { value: 'lender', label: 'Lender', color: '#8B7AFF' },
  { value: 'contractor', label: 'Contractor', color: '#8A8580' },
  { value: 'tenant', label: 'Tenant', color: '#2DD4BF' },
  { value: 'partner', label: 'Partner', color: '#FBBF24' },
  { value: 'other', label: 'Other', color: '#8A8580' },
]

export function ContactModal({ open, onOpenChange, contact }: Props) {
  const isEdit = !!contact
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [contactType, setContactType] = useState<ContactType | ''>('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  const createMutation = useCreateContact()
  const updateMutation = useUpdateContact(contact?.id ?? '')

  useEffect(() => {
    if (open && contact) {
      setFirstName(contact.first_name)
      setLastName(contact.last_name ?? '')
      setEmail(contact.email ?? '')
      setPhone(contact.phone ?? '')
      setCompany(contact.company ?? '')
      setContactType(contact.contact_type ?? '')
      setNotes(contact.notes ?? '')
    } else if (open && !contact) {
      setFirstName('')
      setLastName('')
      setEmail('')
      setPhone('')
      setCompany('')
      setContactType('')
      setNotes('')
    }
    setError('')
  }, [open, contact])

  const handleSave = () => {
    if (!firstName.trim()) {
      setError('First name is required')
      return
    }

    const data = {
      first_name: firstName.trim(),
      ...(lastName && { last_name: lastName.trim() }),
      ...(email && { email: email.trim() }),
      ...(phone && { phone: phone.trim() }),
      ...(company && { company: company.trim() }),
      ...(contactType && { contact_type: contactType as ContactType }),
      ...(notes && { notes: notes.trim() }),
    }

    if (isEdit) {
      updateMutation.mutate(data, {
        onSuccess: () => {
          toast.success('Contact updated')
          onOpenChange(false)
          try { (window as any).posthog?.capture?.('contact_edited', { contact_id: contact?.id }) } catch {}
        },
        onError: () => toast.error('Failed to update contact'),
      })
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          toast.success('Contact created')
          onOpenChange(false)
          try { (window as any).posthog?.capture?.('contact_created', { type: contactType }) } catch {}
        },
        onError: () => toast.error('Failed to create contact'),
      })
    }
  }

  if (!open) return null

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#0C0B0A]/75 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-lg mx-4 bg-[#141311] border border-[#1E1D1B] rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E1D1B]">
          <h2 className="text-lg text-[#F0EDE8] font-medium">
            {isEdit ? 'Edit Contact' : 'Add Contact'}
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            className="w-7 h-7 rounded-md flex items-center justify-center text-[#8A8580] hover:text-[#C5C0B8] hover:bg-[#1A1918] transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#8A8580] mb-1 block">First Name *</label>
              <input
                type="text"
                value={firstName}
                onChange={e => { setFirstName(e.target.value); setError('') }}
                className={cn(
                  'w-full h-10 px-3 rounded-lg bg-[#0C0B0A] border text-sm text-[#F0EDE8] focus:outline-none focus:border-[#8B7AFF]/40 focus:ring-2 focus:ring-[#8B7AFF]/20 transition-all',
                  error ? 'border-[#F87171]' : 'border-[#1E1D1B]'
                )}
              />
              {error && <p className="text-xs text-[#F87171] mt-1">{error}</p>}
            </div>
            <div>
              <label className="text-xs text-[#8A8580] mb-1 block">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-[#0C0B0A] border border-[#1E1D1B] text-sm text-[#F0EDE8] focus:outline-none focus:border-[#8B7AFF]/40 focus:ring-2 focus:ring-[#8B7AFF]/20 transition-all"
              />
            </div>
          </div>

          {/* Email + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#8A8580] mb-1 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-[#0C0B0A] border border-[#1E1D1B] text-sm text-[#F0EDE8] focus:outline-none focus:border-[#8B7AFF]/40 focus:ring-2 focus:ring-[#8B7AFF]/20 transition-all"
              />
            </div>
            <div>
              <label className="text-xs text-[#8A8580] mb-1 block">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-[#0C0B0A] border border-[#1E1D1B] text-sm text-[#F0EDE8] focus:outline-none focus:border-[#8B7AFF]/40 focus:ring-2 focus:ring-[#8B7AFF]/20 transition-all"
              />
            </div>
          </div>

          {/* Company */}
          <div>
            <label className="text-xs text-[#8A8580] mb-1 block">Company</label>
            <input
              type="text"
              value={company}
              onChange={e => setCompany(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-[#0C0B0A] border border-[#1E1D1B] text-sm text-[#F0EDE8] focus:outline-none focus:border-[#8B7AFF]/40 focus:ring-2 focus:ring-[#8B7AFF]/20 transition-all"
            />
          </div>

          {/* Type */}
          <div>
            <label className="text-xs text-[#8A8580] mb-1 block">Type</label>
            <div className="flex flex-wrap gap-1.5">
              {TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setContactType(contactType === opt.value ? '' : opt.value)}
                  className={cn(
                    'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors cursor-pointer',
                    contactType === opt.value
                      ? 'bg-[#8B7AFF]/15 text-[#F0EDE8] border-[#8B7AFF]/30'
                      : 'bg-[#0C0B0A] text-[#8A8580] border-[#1E1D1B] hover:text-[#C5C0B8]'
                  )}
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-[#8A8580] mb-1 block">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-[#0C0B0A] border border-[#1E1D1B] text-sm text-[#F0EDE8] focus:outline-none focus:border-[#8B7AFF]/40 focus:ring-2 focus:ring-[#8B7AFF]/20 transition-all resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[#1E1D1B]">
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 rounded-lg text-sm text-[#C5C0B8] hover:text-[#F0EDE8] hover:bg-[#1A1918] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-[#8B7AFF] text-white hover:bg-[#7B6AEF] transition-colors disabled:opacity-40 cursor-pointer"
          >
            {isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Contact'}
          </button>
        </div>
      </div>
    </div>
  )
}
