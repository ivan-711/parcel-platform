import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'

export default function LockedFeaturePage() {
  return (
    <AppShell title="Pro Feature">
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] px-4 text-center">
        <div className="max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-violet-400/10 flex items-center justify-center mx-auto mb-6">
            <Lock size={24} className="text-violet-400" />
          </div>
          <h1 className="text-2xl text-text-primary font-brand font-light mb-3">
            Available on Pro
          </h1>
          <p className="text-sm text-text-muted mb-6">
            This feature is available on the Pro plan. Upgrade to unlock it.
          </p>
          <Link
            to="/pricing"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium bg-violet-400 text-white hover:bg-violet-500 transition-colors"
          >
            View Plans
          </Link>
        </div>
      </div>
    </AppShell>
  )
}
