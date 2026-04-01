import type { ReactNode } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { hasAccess, FEATURE_LABELS, type GatedFeature } from '@/types'
import { PaywallOverlay } from './PaywallOverlay'

interface FeatureGateProps {
  feature: GatedFeature
  children: ReactNode
  fallback?: ReactNode
}

export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const user = useAuthStore((s) => s.user)

  // Demo users always get access
  if (user?.email === 'demo@parcel.app') return <>{children}</>

  const effectiveTier =
    user?.trial_active && user.plan_tier === 'free' ? 'pro' : (user?.plan_tier ?? 'free')

  const required = FEATURE_LABELS[feature].tier

  if (hasAccess(effectiveTier, required)) return <>{children}</>

  const isBlocked = true

  return (
    <div className="relative min-h-[200px]">
      {/* Content behind overlay — inert prevents focus/interaction */}
      <div aria-hidden={isBlocked} {...(isBlocked ? { inert: '' } : {})}>
        {children}
      </div>
      {fallback ?? <PaywallOverlay feature={feature} />}
    </div>
  )
}
