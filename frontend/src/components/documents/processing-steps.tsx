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
              <div className="w-5 h-5 rounded-full bg-[#6DBEA3]/10 flex items-center justify-center">
                <Check size={12} className="text-[#6DBEA3]" />
              </div>
            ) : isActive ? (
              <div className="w-5 h-5 rounded-full bg-[#8B7AFF]/10 flex items-center justify-center">
                <Loader2 size={12} className="text-[#8B7AFF] animate-spin" />
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full bg-layer-2 flex items-center justify-center">
                <Clock size={10} className="text-text-disabled" />
              </div>
            )}
            <span
              className={cn(
                'text-sm',
                step.done && !isActive && 'text-[#6DBEA3]',
                isActive && 'text-[#8B7AFF]',
                isWaiting && 'text-text-secondary',
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
