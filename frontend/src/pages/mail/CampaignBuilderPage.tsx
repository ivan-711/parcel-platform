/**
 * CampaignBuilderPage — 4-step direct mail campaign builder.
 * Route: /mail-campaigns/new (create) | /mail-campaigns/:id (edit)
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Send, Loader2, X, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import {
  useMailCampaign,
  useCreateMailCampaign,
  useUpdateMailCampaign,
  useAddRecipients,
  useVerifyAddresses,
  useSendCampaign,
  useRemoveRecipient,
} from '@/hooks/useMailCampaigns'
import type { RecipientInput, MailRecipient } from '@/types'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAIL_TYPES = [
  { value: 'postcard_4x6',  label: '4×6 Postcard',  size: '4" × 6"',   costCents: 63  },
  { value: 'postcard_6x9',  label: '6×9 Postcard',  size: '6" × 9"',   costCents: 84  },
  { value: 'postcard_6x11', label: '6×11 Postcard', size: '6" × 11"',  costCents: 95  },
  { value: 'letter',        label: 'Letter',         size: '8.5" × 11"', costCents: 105 },
] as const

const SAMPLE_DATA: Record<string, string> = {
  recipient_name:    'John Smith',
  property_address:  '123 Main St, Milwaukee, WI',
  sender_name:       'Desiree',
  sender_phone:      '(414) 555-0199',
  sender_company:    'Parcel Investments',
}

const VARIABLES = [
  { token: '{{recipient_name}}',   label: 'Recipient Name' },
  { token: '{{property_address}}', label: 'Property Address' },
  { token: '{{sender_name}}',      label: 'Sender Name' },
  { token: '{{sender_phone}}',     label: 'Sender Phone' },
  { token: '{{sender_company}}',   label: 'Sender Company' },
]

const STEP_LABELS = ['Setup', 'Design', 'Recipients', 'Review & Send']

// ---------------------------------------------------------------------------
// Style helpers
// ---------------------------------------------------------------------------

const inputCls =
  'w-full px-3 py-2 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg text-sm text-[#F0EDE8] placeholder:text-[#8A8580] focus:border-[#8B7AFF] focus:outline-none transition-colors'
const labelCls = 'text-[10px] uppercase tracking-wider text-[#8A8580] mb-1 block'
const btnPrimary =
  'flex items-center gap-2 px-4 py-2 bg-[#8B7AFF] text-white text-sm rounded-lg hover:bg-[#7C6BF0] transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
const btnSecondary =
  'flex items-center gap-2 px-4 py-2 border border-[#1E1D1B] text-[#C5C0B8] text-sm rounded-lg hover:border-[#8B7AFF] hover:text-[#F0EDE8] transition-colors'

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  )
}

function StepIndicator({ step }: { step: number }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        {STEP_LABELS.map((label, i) => (
          <div key={i} className="flex items-center gap-2 flex-1 last:flex-none">
            <div className="flex items-center gap-1.5 shrink-0">
              <div
                className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium transition-colors',
                  i + 1 < step
                    ? 'bg-[#8B7AFF] text-white'
                    : i + 1 === step
                    ? 'bg-[#8B7AFF] text-white ring-2 ring-[#8B7AFF]/30'
                    : 'bg-[#1E1D1B] text-[#8A8580]',
                )}
              >
                {i + 1 < step ? '✓' : i + 1}
              </div>
              <span
                className={cn(
                  'text-xs hidden sm:block',
                  i + 1 === step ? 'text-[#F0EDE8]' : 'text-[#8A8580]',
                )}
              >
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div
                className={cn(
                  'h-px flex-1 transition-colors',
                  i + 1 < step ? 'bg-[#8B7AFF]' : 'bg-[#1E1D1B]',
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function renderTemplate(template: string) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => SAMPLE_DATA[key] ?? `{{${key}}}`)
}

function TemplatePreview({ front, back, isLetter }: { front: string; back: string; isLetter: boolean }) {
  return (
    <div className="mt-4 space-y-3">
      <p className={labelCls}>Preview (sample data)</p>
      <div className="p-4 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg">
        <p className="text-[10px] uppercase tracking-wider text-[#8A8580] mb-2">{isLetter ? 'Content' : 'Front'}</p>
        <p className="text-sm text-[#C5C0B8] whitespace-pre-wrap leading-relaxed">
          {front ? renderTemplate(front) : <span className="italic text-[#8A8580]">No content yet</span>}
        </p>
      </div>
      {!isLetter && (
        <div className="p-4 bg-[#0C0B0A] border border-[#1E1D1B] rounded-lg">
          <p className="text-[10px] uppercase tracking-wider text-[#8A8580] mb-2">Back</p>
          <p className="text-sm text-[#C5C0B8] whitespace-pre-wrap leading-relaxed">
            {back ? renderTemplate(back) : <span className="italic text-[#8A8580]">No content yet</span>}
          </p>
        </div>
      )}
    </div>
  )
}

function DeliverabilityBadge({ value }: { value: string | null }) {
  if (!value) return (
    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-[#8A8580]/15 text-[#8A8580]">
      <HelpCircle size={10} /> Unverified
    </span>
  )
  const map: Record<string, { bg: string; label: string; Icon: typeof CheckCircle2 }> = {
    deliverable:   { bg: 'bg-[#4ADE80]/15 text-[#4ADE80]', label: 'Deliverable',   Icon: CheckCircle2 },
    undeliverable: { bg: 'bg-[#EF4444]/15 text-[#EF4444]', label: 'Undeliverable', Icon: AlertCircle  },
    no_match:      { bg: 'bg-[#FBBF24]/15 text-[#FBBF24]', label: 'No Match',      Icon: AlertCircle  },
  }
  const cfg = map[value] ?? map.undeliverable
  return (
    <span className={cn('inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded', cfg.bg)}>
      <cfg.Icon size={10} /> {cfg.label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Step 1: Setup
// ---------------------------------------------------------------------------

interface SetupStepProps {
  name: string
  setName: (v: string) => void
  mailType: string
  setMailType: (v: string) => void
  fromAddress: { name: string; line1: string; city: string; state: string; zip: string }
  setFromAddress: (v: SetupStepProps['fromAddress']) => void
  onNext: () => void
  loading: boolean
}

function SetupStep({ name, setName, mailType, setMailType, fromAddress, setFromAddress, onNext, loading }: SetupStepProps) {
  const canNext = name.trim() !== '' && mailType !== ''

  return (
    <div className="space-y-6">
      {/* Name */}
      <Field label="Campaign Name *">
        <input
          type="text"
          className={inputCls}
          placeholder="e.g. Spring Absentee Owner Outreach"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </Field>

      {/* Mail type */}
      <div>
        <label className={labelCls}>Mail Type *</label>
        <div className="grid grid-cols-2 gap-3">
          {MAIL_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setMailType(t.value)}
              className={cn(
                'p-4 border rounded-lg text-left transition-colors',
                mailType === t.value
                  ? 'border-[#8B7AFF] bg-[#8B7AFF]/10'
                  : 'border-[#1E1D1B] bg-[#0C0B0A] hover:border-[#8B7AFF]/50',
              )}
            >
              <p className={cn('text-sm font-medium', mailType === t.value ? 'text-[#8B7AFF]' : 'text-[#F0EDE8]')}>
                {t.label}
              </p>
              <p className="text-[11px] text-[#8A8580] mt-0.5">{t.size}</p>
              <p className="text-[11px] text-[#C5C0B8] mt-1">${(t.costCents / 100).toFixed(2)} / piece</p>
            </button>
          ))}
        </div>
      </div>

      {/* From address */}
      <div>
        <label className={labelCls}>From Address</label>
        <div className="space-y-3">
          <Field label="Name">
            <input
              type="text"
              className={inputCls}
              placeholder="Parcel Investments"
              value={fromAddress.name}
              onChange={(e) => setFromAddress({ ...fromAddress, name: e.target.value })}
            />
          </Field>
          <Field label="Street">
            <input
              type="text"
              className={inputCls}
              placeholder="123 Business Ave, Suite 100"
              value={fromAddress.line1}
              onChange={(e) => setFromAddress({ ...fromAddress, line1: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <Field label="City">
                <input
                  type="text"
                  className={inputCls}
                  placeholder="Milwaukee"
                  value={fromAddress.city}
                  onChange={(e) => setFromAddress({ ...fromAddress, city: e.target.value })}
                />
              </Field>
            </div>
            <div>
              <Field label="State">
                <input
                  type="text"
                  className={inputCls}
                  placeholder="WI"
                  maxLength={2}
                  value={fromAddress.state}
                  onChange={(e) => setFromAddress({ ...fromAddress, state: e.target.value.toUpperCase() })}
                />
              </Field>
            </div>
            <div>
              <Field label="ZIP">
                <input
                  type="text"
                  className={inputCls}
                  placeholder="53202"
                  value={fromAddress.zip}
                  onChange={(e) => setFromAddress({ ...fromAddress, zip: e.target.value })}
                />
              </Field>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button onClick={onNext} disabled={!canNext || loading} className={btnPrimary}>
          {loading && <Loader2 size={14} className="animate-spin" />}
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 2: Design
// ---------------------------------------------------------------------------

interface DesignStepProps {
  frontHtml: string
  setFrontHtml: (v: string) => void
  backHtml: string
  setBackHtml: (v: string) => void
  isLetter: boolean
  onBack: () => void
  onNext: () => void
  loading: boolean
}

function DesignStep({ frontHtml, setFrontHtml, backHtml, setBackHtml, isLetter, onBack, onNext, loading }: DesignStepProps) {
  const frontRef = useRef<HTMLTextAreaElement>(null)
  const backRef = useRef<HTMLTextAreaElement>(null)

  function insertVariable(ref: React.RefObject<HTMLTextAreaElement | null>, token: string, setter: (v: string) => void) {
    const ta = ref.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const value = ta.value
    const next = value.slice(0, start) + token + value.slice(end)
    setter(next)
    // Restore cursor after React re-render
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(start + token.length, start + token.length)
    })
  }

  return (
    <div className="space-y-6">
      {/* Front / Content */}
      <div>
        <label className={labelCls}>{isLetter ? 'Content' : 'Front'}</label>
        <textarea
          ref={frontRef}
          className={cn(inputCls, 'min-h-[200px] resize-y font-mono text-xs leading-relaxed')}
          placeholder={isLetter ? 'Dear {{recipient_name}},\n\nWe are interested in purchasing your property at {{property_address}}...' : 'Front side content...'}
          value={frontHtml}
          onChange={(e) => setFrontHtml(e.target.value)}
        />
        <div className="flex flex-wrap gap-1.5 mt-2">
          {VARIABLES.map((v) => (
            <button
              key={v.token}
              onClick={() => insertVariable(frontRef, v.token, setFrontHtml)}
              className="text-[10px] px-2 py-1 bg-[#8B7AFF]/15 text-[#8B7AFF] rounded border border-[#8B7AFF]/20 hover:bg-[#8B7AFF]/25 transition-colors"
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Back (postcards only) */}
      {!isLetter && (
        <div>
          <label className={labelCls}>Back</label>
          <textarea
            ref={backRef}
            className={cn(inputCls, 'min-h-[200px] resize-y font-mono text-xs leading-relaxed')}
            placeholder="Back side content..."
            value={backHtml}
            onChange={(e) => setBackHtml(e.target.value)}
          />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {VARIABLES.map((v) => (
              <button
                key={v.token}
                onClick={() => insertVariable(backRef, v.token, setBackHtml)}
                className="text-[10px] px-2 py-1 bg-[#8B7AFF]/15 text-[#8B7AFF] rounded border border-[#8B7AFF]/20 hover:bg-[#8B7AFF]/25 transition-colors"
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <TemplatePreview front={frontHtml} back={backHtml} isLetter={isLetter} />

      <div className="flex justify-between pt-2">
        <button onClick={onBack} className={btnSecondary}>
          <ChevronLeft size={14} /> Back
        </button>
        <button onClick={onNext} disabled={loading} className={btnPrimary}>
          {loading && <Loader2 size={14} className="animate-spin" />}
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 3: Recipients
// ---------------------------------------------------------------------------

interface RecipientsStepProps {
  campaignId: string
  recipients: MailRecipient[]
  onBack: () => void
  onNext: () => void
  onRecipientsChanged: () => void
}

const emptyAddr = { line1: '', city: '', state: '', zip: '' }

function RecipientsStep({ campaignId, recipients, onBack, onNext, onRecipientsChanged }: RecipientsStepProps) {
  const addRecipients = useAddRecipients(campaignId)
  const removeRecipient = useRemoveRecipient(campaignId)
  const verifyAddresses = useVerifyAddresses(campaignId)

  const [toName, setToName] = useState('')
  const [addr, setAddr] = useState(emptyAddr)

  function handleAdd() {
    if (!addr.line1.trim() || !addr.city.trim() || !addr.state.trim() || !addr.zip.trim()) return
    const input: RecipientInput = {
      to_name: toName.trim() || undefined,
      to_address: { line1: addr.line1.trim(), city: addr.city.trim(), state: addr.state.trim(), zip: addr.zip.trim() },
    }
    addRecipients.mutate({ recipients: [input] }, {
      onSuccess: () => {
        setToName('')
        setAddr(emptyAddr)
        onRecipientsChanged()
      },
    })
  }

  function handleVerify() {
    verifyAddresses.mutate(undefined, { onSuccess: onRecipientsChanged })
  }

  const deliverable = recipients.filter((r) => r.deliverability === 'deliverable').length
  const undeliverable = recipients.filter((r) => r.deliverability === 'undeliverable').length
  const canAdd = addr.line1.trim() && addr.city.trim() && addr.state.trim() && addr.zip.trim()

  return (
    <div className="space-y-6">
      {/* Add form */}
      <div className="p-4 border border-[#1E1D1B] rounded-lg bg-[#0C0B0A] space-y-3">
        <p className="text-xs text-[#C5C0B8] font-medium">Add Recipient</p>
        <Field label="Name">
          <input
            type="text"
            className={inputCls}
            placeholder="John Smith"
            value={toName}
            onChange={(e) => setToName(e.target.value)}
          />
        </Field>
        <Field label="Street *">
          <input
            type="text"
            className={inputCls}
            placeholder="123 Main St"
            value={addr.line1}
            onChange={(e) => setAddr({ ...addr, line1: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-1">
            <Field label="City *">
              <input type="text" className={inputCls} placeholder="Milwaukee" value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} />
            </Field>
          </div>
          <div>
            <Field label="State *">
              <input type="text" className={inputCls} placeholder="WI" maxLength={2} value={addr.state} onChange={(e) => setAddr({ ...addr, state: e.target.value.toUpperCase() })} />
            </Field>
          </div>
          <div>
            <Field label="ZIP *">
              <input type="text" className={inputCls} placeholder="53202" value={addr.zip} onChange={(e) => setAddr({ ...addr, zip: e.target.value })} />
            </Field>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleAdd}
            disabled={!canAdd || addRecipients.isPending}
            className={btnPrimary}
          >
            {addRecipients.isPending && <Loader2 size={14} className="animate-spin" />}
            Add
          </button>
        </div>
      </div>

      {/* Count + verify */}
      {recipients.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[#C5C0B8]">
            <span className="text-[#F0EDE8] font-medium">{recipients.length}</span> recipient{recipients.length !== 1 ? 's' : ''}
            {deliverable > 0 && (
              <span className="text-[#8A8580]">
                {' '}({deliverable} deliverable{undeliverable > 0 ? `, ${undeliverable} undeliverable` : ''})
              </span>
            )}
          </p>
          <button
            onClick={handleVerify}
            disabled={verifyAddresses.isPending}
            className={btnSecondary}
          >
            {verifyAddresses.isPending && <Loader2 size={14} className="animate-spin" />}
            Verify All Addresses
          </button>
        </div>
      )}

      {/* Table */}
      {recipients.length > 0 && (
        <div className="border border-[#1E1D1B] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1E1D1B]">
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-[#8A8580]">Name</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-[#8A8580]">Address</th>
                <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-[#8A8580]">Status</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {recipients.map((r, i) => (
                <tr
                  key={r.id}
                  className={cn('border-b border-[#1E1D1B] last:border-0', i % 2 === 0 ? 'bg-transparent' : 'bg-[#0C0B0A]')}
                >
                  <td className="px-3 py-2 text-[#C5C0B8]">{r.to_name || '—'}</td>
                  <td className="px-3 py-2 text-[#8A8580] text-xs">
                    {r.to_address.line1}, {r.to_address.city}, {r.to_address.state} {r.to_address.zip}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <DeliverabilityBadge value={r.deliverability} />
                  </td>
                  <td className="px-2 py-2">
                    <button
                      onClick={() => removeRecipient.mutate(r.id, { onSuccess: onRecipientsChanged })}
                      className="text-[#8A8580] hover:text-[#EF4444] transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {recipients.length === 0 && (
        <div className="text-center py-8 text-[#8A8580] text-sm border border-dashed border-[#1E1D1B] rounded-lg">
          No recipients yet — add one above
        </div>
      )}

      <div className="flex justify-between pt-2">
        <button onClick={onBack} className={btnSecondary}>
          <ChevronLeft size={14} /> Back
        </button>
        <button onClick={onNext} disabled={recipients.length === 0} className={btnPrimary}>
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 4: Review & Send
// ---------------------------------------------------------------------------

interface ReviewStepProps {
  name: string
  mailType: string
  recipients: MailRecipient[]
  frontHtml: string
  backHtml: string
  isLetter: boolean
  campaignId: string
  onBack: () => void
  onSent: () => void
}

function ReviewStep({ name, mailType, recipients, frontHtml, backHtml, isLetter, campaignId, onBack, onSent }: ReviewStepProps) {
  const sendCampaign = useSendCampaign(campaignId)

  const typeConfig = MAIL_TYPES.find((t) => t.value === mailType)
  const deliverable = recipients.filter((r) => r.deliverability === 'deliverable').length
  const billedCount = deliverable > 0 ? deliverable : recipients.length
  const costCents = (typeConfig?.costCents ?? 0) * billedCount
  const costDollars = (costCents / 100).toFixed(2)

  function handleSend() {
    sendCampaign.mutate(undefined, { onSuccess: onSent })
  }

  return (
    <div className="space-y-6">
      {/* Summary card */}
      <div className="p-5 border border-[#1E1D1B] rounded-lg bg-[#0C0B0A] space-y-3">
        <p className="text-xs uppercase tracking-wider text-[#8A8580]">Campaign Summary</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className={labelCls}>Name</p>
            <p className="text-sm text-[#F0EDE8]">{name}</p>
          </div>
          <div>
            <p className={labelCls}>Mail Type</p>
            <p className="text-sm text-[#F0EDE8]">{typeConfig?.label ?? mailType}</p>
          </div>
          <div>
            <p className={labelCls}>Recipients</p>
            <p className="text-sm text-[#F0EDE8]">
              {recipients.length} total
              {deliverable > 0 && <span className="text-[#4ADE80] ml-1">({deliverable} deliverable)</span>}
            </p>
          </div>
          <div>
            <p className={labelCls}>Estimated Cost</p>
            <p className="text-sm text-[#F0EDE8]">
              ${costDollars}
              <span className="text-[#8A8580] text-xs ml-1">
                (${((typeConfig?.costCents ?? 0) / 100).toFixed(2)} × {billedCount})
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Template preview */}
      <TemplatePreview front={frontHtml} back={backHtml} isLetter={isLetter} />

      <div className="flex justify-between pt-2">
        <button onClick={onBack} className={btnSecondary}>
          <ChevronLeft size={14} /> Back
        </button>
        <button onClick={handleSend} disabled={sendCampaign.isPending} className={btnPrimary}>
          {sendCampaign.isPending ? (
            <><Loader2 size={14} className="animate-spin" /> Sending…</>
          ) : (
            <><Send size={14} /> Send Now</>
          )}
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function CampaignBuilderPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)

  // Step 1 state
  const [name, setName] = useState('')
  const [mailType, setMailType] = useState<string>('')
  const [fromAddress, setFromAddress] = useState({ name: '', line1: '', city: '', state: '', zip: '' })

  // Step 2 state
  const [frontHtml, setFrontHtml] = useState('')
  const [backHtml, setBackHtml] = useState('')

  // Campaign ID (set after create)
  const [campaignId, setCampaignId] = useState<string | null>(id ?? null)

  // Load existing campaign for edit mode
  const { data: existing } = useMailCampaign(campaignId ?? undefined)

  useEffect(() => {
    if (existing && isEdit) {
      setName(existing.name)
      setMailType(existing.mail_type)
      if (existing.from_address) {
        setFromAddress({
          name: existing.from_address.name ?? '',
          line1: existing.from_address.line1,
          city: existing.from_address.city,
          state: existing.from_address.state,
          zip: existing.from_address.zip,
        })
      }
      setFrontHtml(existing.template_front_html ?? '')
      setBackHtml(existing.template_back_html ?? '')
    }
  }, [existing, isEdit])

  const createCampaign = useCreateMailCampaign()
  const updateCampaign = useUpdateMailCampaign(campaignId ?? '')

  const isLetter = mailType === 'letter'

  // Build from_address payload (only if at least line1 present)
  function buildFromAddress() {
    if (!fromAddress.line1.trim()) return undefined
    return {
      name: fromAddress.name.trim() || undefined,
      line1: fromAddress.line1.trim(),
      city: fromAddress.city.trim(),
      state: fromAddress.state.trim(),
      zip: fromAddress.zip.trim(),
    }
  }

  // Step 1 → 2: create or update
  function handleStep1Next() {
    const payload = {
      name: name.trim(),
      mail_type: mailType,
      from_address: buildFromAddress(),
    }

    if (!campaignId) {
      createCampaign.mutate(payload, {
        onSuccess: (data) => {
          setCampaignId(data.id)
          setStep(2)
        },
      })
    } else {
      updateCampaign.mutate(payload, {
        onSuccess: () => setStep(2),
      })
    }
  }

  // Step 2 → 3: save templates
  function handleStep2Next() {
    if (!campaignId) return
    updateCampaign.mutate(
      { template_front_html: frontHtml, template_back_html: isLetter ? undefined : backHtml },
      { onSuccess: () => setStep(3) },
    )
  }

  const handleRecipientsChanged = useCallback(() => {
    // react-query will refetch the campaign; existing.recipients will update
  }, [])

  function handleSent() {
    navigate('/mail-campaigns')
  }

  const pageTitle = isEdit ? 'Edit Campaign' : 'New Campaign'
  const recipients = existing?.recipients ?? []

  return (
    <AppShell title={pageTitle}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <StepIndicator step={step} />

        <div className="bg-[#141311] border border-[#1E1D1B] rounded-xl p-6">
          <h2
            className="text-lg text-[#F0EDE8] mb-6"
            style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 300 }}
          >
            {STEP_LABELS[step - 1]}
          </h2>

          {step === 1 && (
            <SetupStep
              name={name}
              setName={setName}
              mailType={mailType}
              setMailType={setMailType}
              fromAddress={fromAddress}
              setFromAddress={setFromAddress}
              onNext={handleStep1Next}
              loading={createCampaign.isPending || updateCampaign.isPending}
            />
          )}

          {step === 2 && (
            <DesignStep
              frontHtml={frontHtml}
              setFrontHtml={setFrontHtml}
              backHtml={backHtml}
              setBackHtml={setBackHtml}
              isLetter={isLetter}
              onBack={() => setStep(1)}
              onNext={handleStep2Next}
              loading={updateCampaign.isPending}
            />
          )}

          {step === 3 && campaignId && (
            <RecipientsStep
              campaignId={campaignId}
              recipients={recipients}
              onBack={() => setStep(2)}
              onNext={() => setStep(4)}
              onRecipientsChanged={handleRecipientsChanged}
            />
          )}

          {step === 4 && campaignId && (
            <ReviewStep
              name={name}
              mailType={mailType}
              recipients={recipients}
              frontHtml={frontHtml}
              backHtml={backHtml}
              isLetter={isLetter}
              campaignId={campaignId}
              onBack={() => setStep(3)}
              onSent={handleSent}
            />
          )}
        </div>
      </div>
    </AppShell>
  )
}
