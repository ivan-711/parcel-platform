/** ProcessingSteps — step indicator showing upload/extraction/analysis progress. */

import { Check, Loader2, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProcessingStepsProps {
  status: 'pending' | 'processing'
}

export function ProcessingSteps({ status }: ProcessingStepsProps) {
  const steps = [
    { label: 'Uploading to secure storage', done: true },
    { label: 'Extracting document content', done: status === 'processing', active: status === 'processing' },
    { label: 'Running AI analysis', done: false, active: false },
  ]

  return (
    <div className="space-y-3">
      {steps.map((step, i) => {
        const isActive = status === 'processing' && i === 1
        const isWaiting = !step.done && !isActive

        return (
          <div key={i} className="flex items-center gap-3">
            {step.done && !isActive ? (
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Check size={12} className="text-emerald-400" />
              </div>
            ) : isActive ? (
              <div className="w-5 h-5 rounded-full bg-accent-primary/20 flex items-center justify-center">
                <Loader2 size={12} className="text-accent-primary animate-spin" />
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full bg-app-elevated flex items-center justify-center">
                <Clock size={10} className="text-text-muted" />
              </div>
            )}
            <span
              className={cn(
                'text-sm',
                step.done && !isActive && 'text-text-secondary',
                isActive && 'text-text-primary',
                isWaiting && 'text-text-muted',
              )}
            >
              {step.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
