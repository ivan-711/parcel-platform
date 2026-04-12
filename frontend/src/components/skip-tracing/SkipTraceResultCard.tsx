/** Card displaying full skip trace results — phones, emails, mailing address, demographics, and contact actions. */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Copy, Phone, Mail, MapPin, User } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useCreateContactFromTrace } from '@/hooks/useSkipTracing'
import type { SkipTraceResult, PhoneResult, EmailResult } from '@/types'

// ---------------------------------------------------------------------------
// Phone type badge
// ---------------------------------------------------------------------------

const PHONE_TYPE_STYLES: Record<PhoneResult['type'], string> = {
  mobile:   'bg-profit-bg text-profit border border-profit/30',
  landline: 'bg-text-muted/15 text-text-muted border border-text-muted/30',
  voip:     'bg-info-bg text-info border border-info/30',
  unknown:  'bg-text-muted/15 text-text-muted border border-text-muted/30',
}

function PhoneTypeBadge({ type }: { type: PhoneResult['type'] }) {
  return (
    <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase', PHONE_TYPE_STYLES[type])}>
      {type}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Copy button
// ---------------------------------------------------------------------------

function CopyButton({ value }: { value: string }) {
  function handleCopy() {
    navigator.clipboard.writeText(value).then(() => {
      toast.success('Copied')
    })
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center px-2 py-1 rounded text-xs text-text-muted hover:text-text-primary hover:bg-border-default transition-colors"
      title="Copy"
      aria-label="Copy to clipboard"
    >
      <Copy size={11} />
    </button>
  )
}

// ---------------------------------------------------------------------------
// Phone row
// ---------------------------------------------------------------------------

function PhoneRow({ phone }: { phone: PhoneResult }) {
  const smsHref = `sms:${phone.number}`

  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-sm text-text-primary font-mono tabular-nums">{phone.number}</span>
      <PhoneTypeBadge type={phone.type} />
      {phone.is_primary && (
        <span className="text-[10px] text-text-muted uppercase tracking-wide">(primary)</span>
      )}
      <div className="flex items-center gap-0.5 ml-auto">
        <CopyButton value={phone.number} />
        <a
          href={smsHref}
          className="inline-flex items-center px-2.5 py-1 rounded text-xs text-text-muted hover:text-text-primary hover:bg-border-default transition-colors"
        >
          SMS
        </a>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Email row
// ---------------------------------------------------------------------------

function EmailRow({ email }: { email: EmailResult }) {
  const mailHref = `mailto:${email.email}`

  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-sm text-text-primary truncate">{email.email}</span>
      {email.is_primary && (
        <span className="text-[10px] text-text-muted uppercase tracking-wide">(primary)</span>
      )}
      <div className="flex items-center gap-0.5 ml-auto shrink-0">
        <CopyButton value={email.email} />
        <a
          href={mailHref}
          className="inline-flex items-center px-2.5 py-1 rounded text-xs text-text-muted hover:text-text-primary hover:bg-border-default transition-colors"
        >
          Email
        </a>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  result: SkipTraceResult
  onCreateContact?: () => void
}

// ---------------------------------------------------------------------------
// SkipTraceResultCard
// ---------------------------------------------------------------------------

export function SkipTraceResultCard({ result, onCreateContact }: Props) {
  const createContact = useCreateContactFromTrace()
  const [createdContactId, setCreatedContactId] = useState<string | null>(result.contact_id)
  const [createdContactName, setCreatedContactName] = useState<string | null>(null)
  const [createdContactType, _setCreatedContactType] = useState<string | null>(null)

  const ownerName = [result.owner_first_name, result.owner_last_name].filter(Boolean).join(' ') || 'Unknown Owner'

  const mailingAddr = result.mailing_address
  const mailingLine = mailingAddr
    ? `${mailingAddr.line1}, ${mailingAddr.city}, ${mailingAddr.state} ${mailingAddr.zip}`
    : null

  const inputAddr = [result.input_address, result.input_city, result.input_state, result.input_zip]
    .filter(Boolean)
    .join(', ')

  const hasDemographics = result.demographics && Object.keys(result.demographics).length > 0

  function handleCreateContact() {
    createContact.mutate(
      { id: result.id },
      {
        onSuccess: (data) => {
          setCreatedContactId(data.contact_id)
          setCreatedContactName(data.contact_name)
          onCreateContact?.()
        },
      },
    )
  }

  // Determine contact link path
  function contactPath(id: string) {
    return createdContactType === 'buyer' ? `/buyers/${id}` : `/contacts/${id}`
  }

  const effectiveContactId = createdContactId
  const effectiveContactName = createdContactName || ownerName

  return (
    <div className="bg-app-recessed border border-border-default rounded-xl p-5 space-y-5">
      {/* Owner name + absentee badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-accent-primary/15 flex items-center justify-center shrink-0">
            <User size={15} className="text-accent-primary" />
          </div>
          <h2
            className="text-xl text-text-primary font-brand font-light"
          >
            {ownerName}
          </h2>
        </div>

        {result.is_absentee_owner && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium tracking-wide bg-warning-bg text-warning border border-warning/30 shrink-0">
            ABSENTEE OWNER
          </span>
        )}
      </div>

      {/* Traced address */}
      {inputAddr && (
        <p className="text-xs text-text-muted">{inputAddr}</p>
      )}

      {/* Phones */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Phone size={13} className="text-text-muted" />
          <span className="text-xs text-text-muted uppercase tracking-wide font-medium">
            Phones {(result.phones ?? []).length > 0 && `(${(result.phones ?? []).length})`}
          </span>
        </div>
        {(result.phones ?? []).length > 0 ? (
          <div className="divide-y divide-border-default">
            {(result.phones ?? []).map((p, i) => (
              <PhoneRow key={i} phone={p} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted italic">No phone numbers found</p>
        )}
      </div>

      {/* Emails */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Mail size={13} className="text-text-muted" />
          <span className="text-xs text-text-muted uppercase tracking-wide font-medium">
            Emails {(result.emails ?? []).length > 0 && `(${(result.emails ?? []).length})`}
          </span>
        </div>
        {(result.emails ?? []).length > 0 ? (
          <div className="divide-y divide-border-default">
            {(result.emails ?? []).map((e, i) => (
              <EmailRow key={i} email={e} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted italic">No email addresses found</p>
        )}
      </div>

      {/* Mailing address */}
      {mailingLine && (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <MapPin size={13} className="text-text-muted" />
            <span className="text-xs text-text-muted uppercase tracking-wide font-medium">Mailing Address</span>
          </div>
          <p className="text-sm text-text-secondary pl-5">{mailingLine}</p>
        </div>
      )}

      {/* Demographics */}
      {hasDemographics && (
        <div>
          <p className="text-xs text-text-muted uppercase tracking-wide font-medium mb-1">Demographics</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 pl-0">
            {Object.entries(result.demographics!).map(([key, val]) => (
              <span key={key} className="text-xs text-text-muted">
                <span className="capitalize">{key.replace(/_/g, ' ')}</span>:{' '}
                <span className="text-text-secondary">{String(val)}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="pt-1 border-t border-border-default">
        {effectiveContactId ? (
          <Link
            to={contactPath(effectiveContactId)}
            className="text-sm text-accent-primary hover:text-accent-hover transition-colors"
          >
            Contact: {effectiveContactName} →
          </Link>
        ) : (
          <button
            onClick={handleCreateContact}
            disabled={createContact.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-accent-primary text-accent-text-on-accent hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {createContact.isPending ? 'Creating...' : 'Create Contact'}
          </button>
        )}
      </div>
    </div>
  )
}
