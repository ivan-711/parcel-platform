import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useCreateContact, useUpdateContact } from '@/hooks/useContacts'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { ContactDetail, ContactType } from '@/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  contact?: ContactDetail | null
}

const TYPE_OPTIONS: { value: ContactType; label: string; color: string }[] = [
  { value: 'seller', label: 'Seller', color: '#F97316' },
  { value: 'buyer', label: 'Buyer', color: '#7CCBA5' },
  { value: 'agent', label: 'Agent', color: '#7B9FCC' },
  { value: 'lender', label: 'Lender', color: '#8B7AFF' },
  { value: 'contractor', label: 'Contractor', color: '#8A8580' },
  { value: 'tenant', label: 'Tenant', color: '#2DD4BF' },
  { value: 'partner', label: 'Partner', color: '#D4A867' },
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

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-app-recessed p-0" aria-describedby={undefined}>
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-border-default space-y-0">
          <DialogTitle className="text-lg text-text-primary font-medium">
            {isEdit ? 'Edit Contact' : 'Add Contact'}
          </DialogTitle>
        </DialogHeader>

        {/* Body */}
        <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="contact-first-name" className="text-xs text-text-muted mb-1 block">First Name *</label>
              <input
                id="contact-first-name"
                type="text"
                value={firstName}
                onChange={e => { setFirstName(e.target.value); setError('') }}
                aria-required="true"
                aria-describedby={error ? 'contact-first-name-error' : undefined}
                className={cn(
                  'w-full h-10 px-3 rounded-lg bg-app-bg border text-sm text-text-primary focus:outline-none focus:border-violet-400/40 focus:ring-2 focus:ring-violet-400/20 transition-all',
                  error ? 'border-loss' : 'border-border-default'
                )}
              />
              {error && <p id="contact-first-name-error" className="text-xs text-loss mt-1">{error}</p>}
            </div>
            <div>
              <label htmlFor="contact-last-name" className="text-xs text-text-muted mb-1 block">Last Name</label>
              <input
                id="contact-last-name"
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-app-bg border border-border-default text-sm text-text-primary focus:outline-none focus:border-violet-400/40 focus:ring-2 focus:ring-violet-400/20 transition-all"
              />
            </div>
          </div>

          {/* Email + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="contact-email" className="text-xs text-text-muted mb-1 block">Email</label>
              <input
                id="contact-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-app-bg border border-border-default text-sm text-text-primary focus:outline-none focus:border-violet-400/40 focus:ring-2 focus:ring-violet-400/20 transition-all"
              />
            </div>
            <div>
              <label htmlFor="contact-phone" className="text-xs text-text-muted mb-1 block">Phone</label>
              <input
                id="contact-phone"
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-app-bg border border-border-default text-sm text-text-primary focus:outline-none focus:border-violet-400/40 focus:ring-2 focus:ring-violet-400/20 transition-all"
              />
            </div>
          </div>

          {/* Company */}
          <div>
            <label htmlFor="contact-company" className="text-xs text-text-muted mb-1 block">Company</label>
            <input
              id="contact-company"
              type="text"
              value={company}
              onChange={e => setCompany(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-app-bg border border-border-default text-sm text-text-primary focus:outline-none focus:border-violet-400/40 focus:ring-2 focus:ring-violet-400/20 transition-all"
            />
          </div>

          {/* Type */}
          <div>
            <label className="text-xs text-text-muted mb-1 block">Type</label>
            <div className="flex flex-wrap gap-1.5">
              {TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setContactType(contactType === opt.value ? '' : opt.value)}
                  className={cn(
                    'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors cursor-pointer',
                    contactType === opt.value
                      ? 'bg-violet-400/15 text-text-primary border-violet-400/30'
                      : 'bg-app-bg text-text-muted border-border-default hover:text-text-secondary'
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
            <label htmlFor="contact-notes" className="text-xs text-text-muted mb-1 block">Notes</label>
            <textarea
              id="contact-notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-app-bg border border-border-default text-sm text-text-primary focus:outline-none focus:border-violet-400/40 focus:ring-2 focus:ring-violet-400/20 transition-all resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border-default">
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-app-surface transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-violet-400 text-white hover:bg-violet-500 transition-colors disabled:opacity-40 cursor-pointer"
          >
            {isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Contact'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
