import { motion } from 'framer-motion'
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
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center w-full max-w-md mx-auto"
    >
      {/* Address pill */}
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#141311] border border-[#1E1D1B] text-sm text-[#C5C0B8] mb-8">
        <span className="text-base">📍</span>
        {address}
      </div>

      {/* Heading */}
      <h2
        className="text-2xl sm:text-3xl text-[#F0EDE8] text-center mb-2"
        style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 300 }}
      >
        Analyzing Property
      </h2>
      <p className="text-sm text-[#8A8580] text-center mb-10">
        Evaluating market position and asset viability
      </p>

      {/* Steps */}
      <div className="relative flex flex-col gap-0 w-full max-w-xs">
        {steps.map((step, i) => (
          <div key={i} className="flex items-start gap-3 relative">
            {/* Vertical line connector */}
            {i < steps.length - 1 && (
              <div
                className="absolute left-[11px] top-[24px] w-px bg-[#1E1D1B]"
                style={{ height: 32 }}
              />
            )}

            {/* Status icon */}
            <div className="flex-shrink-0 w-[24px] h-[24px] flex items-center justify-center">
              {step.status === 'success' && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-5 h-5 rounded-full bg-[#4ADE80]/20 flex items-center justify-center"
                >
                  <Check size={12} className="text-[#4ADE80]" />
                </motion.div>
              )}
              {step.status === 'failed' && (
                <div className="w-5 h-5 rounded-full bg-[#F87171]/20 flex items-center justify-center">
                  <X size={12} className="text-[#F87171]" />
                </div>
              )}
              {step.status === 'active' && (
                <div className="w-5 h-5 rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-[#8B7AFF] animate-pulse" />
                </div>
              )}
              {step.status === 'waiting' && (
                <div className="w-5 h-5 rounded-full border border-[#1E1D1B] flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-[#1E1D1B]" />
                </div>
              )}
            </div>

            {/* Step text */}
            <div className="flex-1 pb-8">
              <div className="flex items-center justify-between">
                <span className={`text-sm ${step.status === 'waiting' ? 'text-[#8A8580]' : 'text-[#F0EDE8]'}`}>
                  {step.label}
                </span>
                <span className={`text-[10px] uppercase tracking-wider font-medium ${
                  step.status === 'success' ? 'text-[#4ADE80]' :
                  step.status === 'active' ? 'text-[#8B7AFF]' :
                  step.status === 'failed' ? 'text-[#F87171]' :
                  'text-[#8A8580]'
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
      <div className="flex items-center gap-1.5 text-[#8A8580] text-xs mt-2 mb-8">
        <Clock size={12} />
        This usually takes 10–15 seconds
      </div>

      {/* Actions */}
      <div className="flex items-center gap-6">
        <button onClick={onCancel} className="text-sm text-[#8A8580] hover:text-[#C5C0B8] transition-colors">
          Cancel Analysis
        </button>
        <button
          onClick={onViewDraft}
          className="text-sm text-[#8A8580] hover:text-[#C5C0B8] transition-colors border border-[#1E1D1B] px-4 py-1.5 rounded-lg hover:border-[#8B7AFF]/30"
        >
          View Draft ↗
        </button>
      </div>
    </motion.div>
  )
}
