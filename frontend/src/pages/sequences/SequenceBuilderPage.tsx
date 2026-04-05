/** Sequence builder page — create or edit a sequence (Task 6). */

import { useRef, useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp, Mail, MessageSquare } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { useSequence, useCreateSequence, useUpdateSequence } from '@/hooks/useSequences'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { SequenceDetail } from '@/types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SAMPLE_DATA: Record<string, string> = {
  first_name: 'John',
  last_name: 'Smith',
  full_name: 'John Smith',
  property_address: '123 Main St',
  property_city: 'Milwaukee',
  property_state: 'WI',
  asking_price: '$85,000',
  arv: '$120,000',
  sender_name: 'Desiree',
  sender_phone: '(414) 555-0199',
  sender_company: 'Parcel Investments',
}

const VARIABLES = [
  '{{first_name}}',
  '{{last_name}}',
  '{{full_name}}',
  '{{property_address}}',
  '{{property_city}}',
  '{{sender_name}}',
]

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LocalStep {
  id: string
  channel: 'sms' | 'email'
  delay_days: number
  delay_hours: number
  subject: string
  body_template: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderPreview(template: string): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => SAMPLE_DATA[key] ?? `{{${key}}}`)
}

function delaySummary(days: number, hours: number): string {
  if (days === 0 && hours === 0) return 'Immediately'
  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  return `${parts.join(' ')} later`
}

function newStep(): LocalStep {
  return {
    id: crypto.randomUUID(),
    channel: 'sms',
    delay_days: 0,
    delay_hours: 0,
    subject: '',
    body_template: '',
  }
}

function stepsFromDetail(detail: SequenceDetail): LocalStep[] {
  return [...detail.steps]
    .sort((a, b) => a.step_order - b.step_order)
    .map((s) => ({
      id: s.id,
      channel: s.channel,
      delay_days: s.delay_days,
      delay_hours: s.delay_hours,
      subject: s.subject ?? '',
      body_template: s.body_template,
    }))
}

// ---------------------------------------------------------------------------
// Toggle switch
// ---------------------------------------------------------------------------

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description?: string
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm text-[#F0EDE8]">{label}</p>
        {description && <p className="text-xs text-[#8A8580] mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-[#8B7AFF] focus:ring-offset-2 focus:ring-offset-[#0C0B0A]',
          checked ? 'bg-[#8B7AFF]' : 'bg-[#2A2927]',
        )}
        role="switch"
        aria-checked={checked}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0',
          )}
        />
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Channel toggle buttons
// ---------------------------------------------------------------------------

function ChannelToggle({
  value,
  onChange,
}: {
  value: 'sms' | 'email'
  onChange: (v: 'sms' | 'email') => void
}) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-[#1E1D1B]">
      {(['sms', 'email'] as const).map((ch) => (
        <button
          key={ch}
          type="button"
          onClick={() => onChange(ch)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors',
            value === ch
              ? 'bg-[#8B7AFF] text-white'
              : 'bg-[#141311] text-[#8A8580] hover:text-[#F0EDE8] hover:bg-[#1E1D1B]',
          )}
        >
          {ch === 'sms' ? <MessageSquare size={11} /> : <Mail size={11} />}
          {ch === 'sms' ? 'SMS' : 'Email'}
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step card
// ---------------------------------------------------------------------------

function StepCard({
  step,
  index,
  isExpanded,
  onToggleExpand,
  onChange,
  onDelete,
}: {
  step: LocalStep
  index: number
  isExpanded: boolean
  onToggleExpand: () => void
  onChange: (updated: LocalStep) => void
  onDelete: () => void
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Auto-grow textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${ta.scrollHeight}px`
  }, [step.body_template, isExpanded])

  function insertVariable(variable: string) {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart ?? 0
    const end = ta.selectionEnd ?? 0
    const before = step.body_template.slice(0, start)
    const after = step.body_template.slice(end)
    const next = before + variable + after
    onChange({ ...step, body_template: next })
    // Restore cursor after render
    requestAnimationFrame(() => {
      ta.focus()
      const pos = start + variable.length
      ta.setSelectionRange(pos, pos)
    })
  }

  const previewText = renderPreview(step.body_template)
  const collapsedBody = step.body_template.slice(0, 60) + (step.body_template.length > 60 ? '…' : '')

  return (
    <div className="bg-[#141311] border border-[#1E1D1B] rounded-xl overflow-hidden hover:border-[#8B7AFF]/25 transition-colors">
      {/* Collapsed header — always visible */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Channel icon */}
          <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#8B7AFF]/15 text-[#8B7AFF] flex items-center justify-center">
            {step.channel === 'sms' ? <MessageSquare size={13} /> : <Mail size={13} />}
          </span>
          <div className="min-w-0">
            <p className="text-xs text-[#C5C0B8] truncate">
              <span className="uppercase tracking-wide text-[10px] text-[#8A8580] mr-1.5">
                {step.channel}
              </span>
              · {delaySummary(step.delay_days, step.delay_hours)}
            </p>
            {!isExpanded && step.body_template && (
              <p className="text-xs text-[#8A8580] truncate mt-0.5">{collapsedBody}</p>
            )}
          </div>
        </div>
        <span className="flex-shrink-0 text-[#8A8580]">
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {/* Expanded editor */}
      {isExpanded && (
        <div className="border-t border-[#1E1D1B] px-4 pb-4 pt-3 space-y-4">
          {/* Channel + delay row */}
          <div className="flex flex-wrap items-center gap-3">
            <ChannelToggle value={step.channel} onChange={(ch) => onChange({ ...step, channel: ch })} />

            {/* Delay inputs */}
            <div className="flex items-center gap-1.5 text-xs text-[#8A8580]">
              <span>Wait</span>
              <input
                type="number"
                min={0}
                value={step.delay_days}
                onChange={(e) => onChange({ ...step, delay_days: Math.max(0, parseInt(e.target.value) || 0) })}
                className="w-12 px-2 py-1 bg-[#1E1D1B] border border-[#2A2927] rounded text-[#F0EDE8] text-xs text-center focus:outline-none focus:border-[#8B7AFF]"
              />
              <span>days</span>
              <input
                type="number"
                min={0}
                max={23}
                value={step.delay_hours}
                onChange={(e) => onChange({ ...step, delay_hours: Math.max(0, Math.min(23, parseInt(e.target.value) || 0)) })}
                className="w-12 px-2 py-1 bg-[#1E1D1B] border border-[#2A2927] rounded text-[#F0EDE8] text-xs text-center focus:outline-none focus:border-[#8B7AFF]"
              />
              <span>hrs after {index === 0 ? 'enrollment' : 'previous step'}</span>
            </div>
          </div>

          {/* Subject (email only) */}
          {step.channel === 'email' && (
            <div>
              <label className="block text-xs text-[#8A8580] mb-1">Subject</label>
              <input
                type="text"
                value={step.subject}
                onChange={(e) => onChange({ ...step, subject: e.target.value })}
                placeholder="Subject line…"
                className="w-full px-3 py-2 bg-[#1E1D1B] border border-[#2A2927] rounded-lg text-sm text-[#F0EDE8] placeholder-[#8A8580] focus:outline-none focus:border-[#8B7AFF]"
              />
            </div>
          )}

          {/* Body template */}
          <div>
            <label className="block text-xs text-[#8A8580] mb-1">Message</label>
            <textarea
              ref={textareaRef}
              value={step.body_template}
              onChange={(e) => onChange({ ...step, body_template: e.target.value })}
              placeholder="Write your message… use variables below to personalize."
              rows={4}
              className="w-full px-3 py-2 bg-[#1E1D1B] border border-[#2A2927] rounded-lg text-sm text-[#F0EDE8] placeholder-[#8A8580] resize-none overflow-hidden focus:outline-none focus:border-[#8B7AFF]"
            />
          </div>

          {/* Variable insertion buttons */}
          <div className="flex flex-wrap gap-1.5">
            {VARIABLES.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => insertVariable(v)}
                className="px-2 py-0.5 rounded text-[11px] bg-[#8B7AFF]/10 text-[#8B7AFF] border border-[#8B7AFF]/20 hover:bg-[#8B7AFF]/20 transition-colors font-mono"
              >
                {v}
              </button>
            ))}
          </div>

          {/* Preview */}
          {step.body_template && (
            <div className="rounded-lg bg-[#0C0B0A] border border-[#1E1D1B] px-3 py-2.5">
              <p className="text-[10px] text-[#8A8580] mb-1.5 uppercase tracking-wide">Preview</p>
              {step.channel === 'email' && step.subject && (
                <p className="text-xs text-[#C5C0B8] mb-1">
                  <span className="text-[#8A8580]">Subject: </span>
                  {renderPreview(step.subject)}
                </p>
              )}
              <p className="text-xs text-[#C5C0B8] whitespace-pre-wrap">{previewText}</p>
            </div>
          )}

          {/* Delete */}
          <div className="flex justify-end pt-1">
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#8A8580]">Remove this step?</span>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs text-[#8A8580] hover:text-[#F0EDE8] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1 text-xs text-[#8A8580] hover:text-red-400 transition-colors"
              >
                <Trash2 size={12} />
                Remove step
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function SequenceBuilderPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEdit = Boolean(id)

  // Load existing sequence when editing
  const { data: existing, isLoading: loadingExisting } = useSequence(id)

  const createSeq = useCreateSequence()
  const updateSeq = useUpdateSequence()

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [stopOnReply, setStopOnReply] = useState(true)
  const [stopOnDealCreated, setStopOnDealCreated] = useState(false)
  const [steps, setSteps] = useState<LocalStep[]>([])
  const [expandedStep, setExpandedStep] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)

  // Populate form from loaded sequence (edit mode)
  useEffect(() => {
    if (existing && !hydrated) {
      setName(existing.name)
      setDescription(existing.description ?? '')
      setStopOnReply(existing.stop_on_reply)
      setStopOnDealCreated(existing.stop_on_deal_created)
      setSteps(stepsFromDetail(existing))
      setHydrated(true)
    }
  }, [existing, hydrated])

  const updateStep = useCallback((updatedStep: LocalStep) => {
    setSteps((prev) => prev.map((s) => (s.id === updatedStep.id ? updatedStep : s)))
  }, [])

  const deleteStep = useCallback((stepId: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== stepId))
    setExpandedStep((cur) => (cur === stepId ? null : cur))
  }, [])

  const addStep = useCallback(() => {
    const step = newStep()
    setSteps((prev) => [...prev, step])
    setExpandedStep(step.id)
  }, [])

  const toggleExpand = useCallback((stepId: string) => {
    setExpandedStep((cur) => (cur === stepId ? null : stepId))
  }, [])

  async function handleSave() {
    if (!name.trim()) return

    if (isEdit && id) {
      await updateSeq.mutateAsync({
        id,
        data: {
          name: name.trim(),
          description: description.trim() || undefined,
          stop_on_reply: stopOnReply,
          stop_on_deal_created: stopOnDealCreated,
        },
      })

      // Persist step changes (add / update / delete)
      if (existing) {
        const serverStepIds = new Set(existing.steps.map((s) => s.id))
        const localStepIds = new Set(steps.map((s) => s.id))

        // Delete steps that were removed locally
        for (const serverStep of existing.steps) {
          if (!localStepIds.has(serverStep.id)) {
            await api.sequences.steps.delete(id, serverStep.id)
          }
        }

        // Add new steps or update changed existing steps
        for (const localStep of steps) {
          if (serverStepIds.has(localStep.id)) {
            await api.sequences.steps.update(id, localStep.id, {
              channel: localStep.channel,
              delay_days: localStep.delay_days,
              delay_hours: localStep.delay_hours,
              subject: localStep.subject || undefined,
              body_template: localStep.body_template,
            })
          } else {
            await api.sequences.steps.add(id, {
              channel: localStep.channel,
              delay_days: localStep.delay_days,
              delay_hours: localStep.delay_hours,
              subject: localStep.subject || undefined,
              body_template: localStep.body_template,
            })
          }
        }

        // Invalidate so list/detail pages show fresh data
        queryClient.invalidateQueries({ queryKey: ['sequences'] })
        queryClient.invalidateQueries({ queryKey: ['sequences', id] })
      }

      navigate('/sequences')
    } else {
      await createSeq.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        stop_on_reply: stopOnReply,
        stop_on_deal_created: stopOnDealCreated,
        steps: steps.map((s) => ({
          channel: s.channel,
          delay_days: s.delay_days,
          delay_hours: s.delay_hours,
          subject: s.subject || undefined,
          body_template: s.body_template,
        })),
      })
      navigate('/sequences')
    }
  }

  const isSaving = createSeq.isPending || updateSeq.isPending
  const canSave = name.trim().length > 0 && !isSaving

  const pageTitle = isEdit
    ? (loadingExisting ? 'Loading…' : (existing?.name ?? 'Edit Sequence'))
    : 'New Sequence'

  return (
    <AppShell title={pageTitle}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/sequences"
              className="text-[#8A8580] hover:text-[#F0EDE8] transition-colors"
            >
              <ArrowLeft size={18} />
            </Link>
            <h1
              className="text-xl text-[#F0EDE8]"
              style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 300 }}
            >
              {pageTitle}
            </h1>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="inline-flex items-center px-4 py-2 rounded-lg text-sm bg-[#8B7AFF] text-white hover:bg-[#7B6AEF] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 300 }}
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>

        {/* Loading skeleton for edit mode */}
        {isEdit && loadingExisting ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-10 rounded-lg bg-[#141311]" />
            <div className="h-20 rounded-lg bg-[#141311]" />
            <div className="h-14 rounded-xl bg-[#141311]" />
            <div className="h-14 rounded-xl bg-[#141311]" />
          </div>
        ) : (
          <>
            {/* Sequence info */}
            <div className="bg-[#141311] border border-[#1E1D1B] rounded-xl p-4 space-y-3">
              <div>
                <label className="block text-xs text-[#8A8580] mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Cold Outreach — Absentee Owners"
                  className="w-full px-3 py-2 bg-[#1E1D1B] border border-[#2A2927] rounded-lg text-sm text-[#F0EDE8] placeholder-[#8A8580] focus:outline-none focus:border-[#8B7AFF]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#8A8580] mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional — describe who this sequence is for."
                  rows={2}
                  className="w-full px-3 py-2 bg-[#1E1D1B] border border-[#2A2927] rounded-lg text-sm text-[#F0EDE8] placeholder-[#8A8580] resize-none focus:outline-none focus:border-[#8B7AFF]"
                />
              </div>
            </div>

            {/* Stop rules */}
            <div className="bg-[#141311] border border-[#1E1D1B] rounded-xl p-4 space-y-4">
              <p
                className="text-xs text-[#8A8580] uppercase tracking-wider"
                style={{ fontFamily: 'Satoshi, sans-serif' }}
              >
                Stop Rules
              </p>
              <Toggle
                checked={stopOnReply}
                onChange={setStopOnReply}
                label="Stop on reply"
                description="Automatically stop sending when the contact replies."
              />
              <Toggle
                checked={stopOnDealCreated}
                onChange={setStopOnDealCreated}
                label="Stop when deal created"
                description="Stop the sequence once a deal is created for this contact."
              />
            </div>

            {/* Step timeline */}
            <div>
              <p
                className="text-xs text-[#8A8580] uppercase tracking-wider mb-3"
                style={{ fontFamily: 'Satoshi, sans-serif' }}
              >
                Steps{steps.length > 0 ? ` · ${steps.length}` : ''}
              </p>

              {steps.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#1E1D1B] px-4 py-8 text-center">
                  <p className="text-sm text-[#8A8580]">No steps yet.</p>
                  <p className="text-xs text-[#8A8580] mt-1">Add a step to start building your sequence.</p>
                </div>
              ) : (
                <div className="relative">
                  {steps.map((step, i) => (
                    <div key={step.id} className="relative">
                      {/* Step label */}
                      <p className="text-[11px] text-[#8A8580] mb-1.5 ml-0.5">Step {i + 1}</p>

                      <StepCard
                        step={step}
                        index={i}
                        isExpanded={expandedStep === step.id}
                        onToggleExpand={() => toggleExpand(step.id)}
                        onChange={updateStep}
                        onDelete={() => deleteStep(step.id)}
                      />

                      {/* Connecting line between steps */}
                      {i < steps.length - 1 && (
                        <div className="flex justify-start ml-3.5 my-1">
                          <div className="w-px h-5 bg-[#2A2927]" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add step button */}
              <button
                type="button"
                onClick={addStep}
                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-[#2A2927] text-sm text-[#8A8580] hover:text-[#8B7AFF] hover:border-[#8B7AFF]/40 transition-colors"
                style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 300 }}
              >
                <Plus size={14} />
                Add Step
              </button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
