import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { prefersReducedMotion } from '@/lib/motion'
import { ChevronDown, RefreshCw, Loader2 } from 'lucide-react'
import type { ScenarioDetail } from '@/types'

interface Props {
  scenario: ScenarioDetail | null
  loading?: boolean
  onRefreshNarrative?: () => void
  refreshing?: boolean
  inputsChanged?: boolean
}

function confidenceDots(confidence: string) {
  const filled = confidence === 'high' ? 4 : confidence === 'medium' ? 3 : 2
  const color = confidence === 'high' ? '#7CCBA5' : confidence === 'medium' ? '#D4A867' : '#D4766A'
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2, 3].map(i => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: i < filled ? color : 'var(--border-default)' }}
        />
      ))}
      <span className="ml-1 text-[10px] uppercase tracking-wider" style={{ color }}>
        {confidence}
      </span>
    </div>
  )
}

function deriveConfidence(scenario: ScenarioDetail): string {
  if (!scenario.source_confidence) return 'low'
  const values = Object.values(scenario.source_confidence)
  if (values.length === 0) return 'low'  // no provenance data = low confidence
  const verified = values.filter(v => v.confidence === 'single_source' || v.confidence === 'high').length
  if (verified >= values.length * 0.7) return 'high'
  if (verified >= values.length * 0.4) return 'medium'
  return 'low'
}

/** Strip all markdown formatting down to clean prose. */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')       // **bold**
    .replace(/\*(.*?)\*/g, '$1')            // *italic*
    .replace(/^#{1,6}\s+(.*)$/gm, '$1')    // ## headers → just the text
    .replace(/^[-*+]\s+/gm, '')            // - list items → remove bullet prefix
    .replace(/^\d+\.\s+/gm, '')            // 1. ordered list → remove number prefix
    .replace(/`([^`]+)`/g, '$1')           // `code`
    .replace(/\n{2,}/g, '\n')              // collapse multiple blank lines
    .trim()
}

/** Extract the first 2 prose sentences for the truncated preview. */
function getPreview(text: string): string | null {
  if (text.length <= 200) return null

  // Split into lines, filter out empty lines / header-only lines
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  // Collect prose lines (skip lines that look like standalone headers after stripping)
  const prose = lines.filter(l => l.length > 20).join(' ')
  if (!prose) return null

  // Match sentences — require ". " (period + space/end) to avoid splitting on
  // decimals like "$185,000.17" or abbreviations like "e.g."
  const sentences: string[] = []
  let remaining = prose
  // Sentence boundary: period/!/? followed by a space and an uppercase letter, or end of string.
  // Negative lookbehind excludes common abbreviations (e.g., vs., i.e., Dr., Mr., St.)
  const sentenceEnd = /([^.!?]*[.!?])(?<!\be\.g)(?<!\bi\.e)(?<!\bvs)(?<!\bDr)(?<!\bMr)(?<!\bSt)(?=\s+[A-Z]|\s*$)/g
  let match: RegExpExecArray | null
  while ((match = sentenceEnd.exec(remaining)) !== null) {
    sentences.push(match[1].trim())
    if (sentences.length >= 2) break
  }

  if (sentences.length < 2) return null
  const preview = sentences.join(' ').trim()
  return preview.length < text.length ? preview : null
}

export function NarrativeCard({ scenario, loading, onRefreshNarrative, refreshing, inputsChanged }: Props) {
  const [showAssumptions, setShowAssumptions] = useState(false)
  const [expanded, setExpanded] = useState(false)

  if (loading || !scenario) {
    return (
      <div className="bg-app-surface rounded-xl p-6 mb-6">
        <div className="space-y-3 animate-pulse">
          <div className="h-3 bg-border-default rounded w-40" />
          <div className="h-4 bg-border-default rounded w-full" />
          <div className="h-4 bg-border-default rounded w-5/6" />
          <div className="h-4 bg-border-default rounded w-4/6" />
        </div>
      </div>
    )
  }

  const confidence = deriveConfidence(scenario)
  const narrative = scenario.ai_narrative
  const plainText = useMemo(() => narrative ? stripMarkdown(narrative) : '', [narrative])
  const preview = useMemo(() => getPreview(plainText), [plainText])
  const isTruncatable = preview !== null

  return (
    <div className="bg-app-surface rounded-xl p-6 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] text-text-muted uppercase tracking-wider font-medium">
          AI Narrative Assessment
        </span>
        {confidenceDots(confidence)}
      </div>

      {/* Narrative text */}
      {narrative ? (
        <div>
          <p className="text-text-primary text-[15px] leading-[1.7] whitespace-pre-line">
            {isTruncatable && !expanded ? `${preview}...` : plainText}
          </p>
          {isTruncatable && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-violet-400 hover:text-violet-300 mt-2 transition-colors"
            >
              {expanded ? 'Show less' : 'Read full analysis \u203A'}
            </button>
          )}
        </div>
      ) : (
        <p className="text-text-muted text-sm italic">
          AI analysis unavailable. The numbers below are still accurate.
        </p>
      )}

      {/* Refresh link */}
      {inputsChanged && onRefreshNarrative && (
        <button
          onClick={onRefreshNarrative}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 mt-3 transition-colors"
        >
          {refreshing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          Refresh AI Narrative
        </button>
      )}

      {/* Assumptions accordion — only visible when narrative is expanded or not truncatable */}
      {narrative && (!isTruncatable || expanded) && (
        <button
          onClick={() => setShowAssumptions(!showAssumptions)}
          className="flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary mt-4 transition-colors"
        >
          <ChevronDown size={14} className={`transition-transform ${showAssumptions ? 'rotate-180' : ''}`} />
          {showAssumptions ? 'Hide assumptions' : 'View assumptions'}
        </button>
      )}

      <AnimatePresence initial={false}>
        {showAssumptions && (
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={prefersReducedMotion ? {} : { height: 0, opacity: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden mt-3 pl-4 border-l border-border-default"
          >
            <p className="text-text-secondary text-sm leading-relaxed">
              Assumptions and risks are stated inline in the narrative above. All auto-filled values are labeled with their data source.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
