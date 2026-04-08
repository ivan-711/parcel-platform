/**
 * ComingSoonGate — renders a "Coming Soon" placeholder when an external
 * service is not configured. Otherwise renders children normally.
 *
 * Usage: wrap page content inside an AppShell with this gate.
 * Pattern 1.3 from IMPLEMENTATION-PLAN.md.
 */

import { useQuery } from '@tanstack/react-query'
import { Clock } from 'lucide-react'
import { api } from '@/lib/api'

type ServiceKey = 'skip_tracing' | 'direct_mail' | 'sms' | 'email_outbound'

interface ComingSoonGateProps {
  service: ServiceKey
  featureName: string
  children: React.ReactNode
}

export function ComingSoonGate({ service, featureName, children }: ComingSoonGateProps) {
  const { data: status } = useQuery({
    queryKey: ['service-status'],
    queryFn: () => api.serviceStatus(),
    staleTime: 5 * 60_000,
  })

  // While loading or if status not yet fetched, render children (optimistic)
  if (!status || status[service]) {
    return <>{children}</>
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] px-4 text-center">
      <div className="max-w-sm">
        <div className="w-14 h-14 rounded-2xl bg-[#8B7AFF]/10 flex items-center justify-center mx-auto mb-6">
          <Clock size={24} className="text-[#8B7AFF]" />
        </div>
        <h1
          className="text-2xl text-text-primary mb-3"
          style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 300 }}
        >
          Coming Soon
        </h1>
        <p className="text-sm text-text-secondary">
          {featureName} is coming soon. We'll let you know when it's ready.
        </p>
      </div>
    </div>
  )
}
