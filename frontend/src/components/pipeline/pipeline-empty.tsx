/** PipelineEmpty — empty state shown when the pipeline has no deals (dark theme). */

import { Link } from 'react-router-dom'
import { Plus, GitBranch } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageContent } from '@/components/layout/PageContent'

export function PipelineEmpty() {
  return (
    <AppShell>
      <PageHeader title="Pipeline" />
      <PageContent>
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
          <div className="flex flex-col items-center gap-4 max-w-md text-center">
            <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-border-default flex items-center justify-center">
              <GitBranch size={24} className="text-text-muted" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-text-primary">Your pipeline is empty</p>
              <p className="text-[13px] text-text-secondary leading-relaxed">
                Start by analyzing a deal and adding it to your pipeline to track its progress.
              </p>
            </div>
            <Link
              to="/analyze"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#8B7AFF] hover:bg-[#7B6AEF] text-accent-text-on-accent text-[13px] font-medium transition-colors"
            >
              <Plus size={14} />
              Analyze a Deal
            </Link>
          </div>
        </div>
      </PageContent>
    </AppShell>
  )
}
