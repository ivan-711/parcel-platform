import { motion } from 'framer-motion'
import { prefersReducedMotion } from '@/lib/motion'
import { Check, X, Clock } from 'lucide-react'

export type StepStatus = 'waiting' | 'active' | 'success' | 'failed'

export interface LoadingStep {
  label: string
  status: StepStatus
  detail?: string
}

interface Props {
  address: string
  steps: LoadingStep[]
  onCancel: () => void
  onViewDraft: () => void
}

export function AnalysisLoadingState({ address, steps, onCancel, onViewDraft }: Props) {
  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3 }}
      className="flex flex-col items-center w-full max-w-md mx-auto"
    >
      {/* Address pill */}
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-app-recessed border border-border-default text-sm text-text-secondary mb-8">
        <span className="text-base">📍</span>
        {address}
      </div>

      {/* Heading */}
      <h2
        className="text-2xl sm:text-3xl text-text-primary text-center mb-2 font-brand font-light"
      >
        Analyzing Property
      </h2>
      <p className="text-sm text-text-muted text-center mb-10">
        Crunching the numbers on your property
      </p>

      {/* Steps */}
      <div className="relative flex flex-col gap-0 w-full max-w-xs">
        {steps.map((step, i) => (
          <div key={i} className="flex items-start gap-3 relative">
            {/* Vertical line connector */}
            {i < steps.length - 1 && (
              <div
                className="absolute left-[11px] top-[24px] w-px bg-border-default"
                style={{ height: 32 }}
              />
            )}

            {/* Status icon */}
            <div className="flex-shrink-0 w-[24px] h-[24px] flex items-center justify-center">
              {step.status === 'success' && (
                <motion.div
                  initial={prefersReducedMotion ? {} : { scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-5 h-5 rounded-full bg-profit/20 flex items-center justify-center"
                >
                  <Check size={12} className="text-profit" />
                </motion.div>
              )}
              {step.status === 'failed' && (
                <div className="w-5 h-5 rounded-full bg-loss/20 flex items-center justify-center">
                  <X size={12} className="text-loss" />
                </div>
              )}
              {step.status === 'active' && (
                <div className="w-5 h-5 rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-violet-400 animate-pulse" />
                </div>
              )}
              {step.status === 'waiting' && (
                <div className="w-5 h-5 rounded-full border border-border-default flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-border-default" />
                </div>
              )}
            </div>

            {/* Step text */}
            <div className="flex-1 pb-8">
              <div className="flex items-center justify-between">
                <span className={`text-sm ${step.status === 'waiting' ? 'text-text-muted' : 'text-text-primary'}`}>
                  {step.label}
                </span>
                <span className={`text-[10px] uppercase tracking-wider font-medium ${
                  step.status === 'success' ? 'text-profit' :
                  step.status === 'active' ? 'text-violet-400' :
                  step.status === 'failed' ? 'text-loss' :
                  'text-text-muted'
                }`}>
                  {step.status === 'success' ? 'SUCCESS' :
                   step.status === 'active' ? 'ACTIVE' :
                   step.status === 'failed' ? (step.detail || 'FAILED') :
                   'WAITING'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Timer hint */}
      <div className="flex items-center gap-1.5 text-text-muted text-xs mt-2 mb-8">
        <Clock size={12} />
        This usually takes 10–15 seconds
      </div>

      {/* Actions */}
      <div className="flex items-center gap-6">
        <button onClick={onCancel} className="text-sm text-text-muted hover:text-text-secondary transition-colors">
          Cancel Analysis
        </button>
        <button
          onClick={onViewDraft}
          className="text-sm text-text-muted hover:text-text-secondary transition-colors border border-border-default px-4 py-1.5 rounded-lg hover:border-violet-400/30"
        >
          View Draft ↗
        </button>
      </div>
    </motion.div>
  )
}
