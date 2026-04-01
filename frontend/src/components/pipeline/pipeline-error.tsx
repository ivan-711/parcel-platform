/** PipelineError — error state shown when pipeline data fails to load (dark theme). */

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
            <div className="w-12 h-12 rounded-xl bg-[#D4766A]/10 border border-[#D4766A]/20 flex items-center justify-center">
              <AlertTriangle size={24} className="text-[#D4766A]" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-[#F0EDE8]">Failed to load pipeline</p>
              <p className="text-[13px] text-[#A09D98]">
                {error ? error.message : 'Something went wrong. Please try again.'}
              </p>
            </div>
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#8B7AFF] hover:bg-[#7B6AEF] text-[#0C0B0A] text-[13px] font-medium transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      </PageContent>
    </AppShell>
  )
}
