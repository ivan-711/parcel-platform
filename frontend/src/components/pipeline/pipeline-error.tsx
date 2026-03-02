/** PipelineError — error state shown when pipeline data fails to load. */

import { AlertTriangle } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageContent } from '@/components/layout/PageContent'

interface PipelineErrorProps {
  error: Error | null
  onRetry: () => void
}

export function PipelineError({ error, onRetry }: PipelineErrorProps) {
  return (
    <AppShell>
      <PageHeader title="Pipeline" />
      <PageContent>
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
          <div className="flex flex-col items-center gap-4 max-w-md text-center">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <AlertTriangle size={24} className="text-red-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-[#F1F5F9]">Failed to load pipeline</p>
              <p className="text-xs text-[#94A3B8]">
                {error ? error.message : 'Something went wrong. Please try again.'}
              </p>
            </div>
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#6366F1] hover:bg-[#4F46E5] text-white text-[13px] font-medium transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      </PageContent>
    </AppShell>
  )
}
