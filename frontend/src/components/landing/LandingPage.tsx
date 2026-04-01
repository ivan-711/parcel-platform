/**
 * LandingPage — page orchestrator for the public marketing landing page.
 * Dark luxury aesthetic. No AppShell — standalone full-page experience.
 *
 * Above-fold sections (Navbar, Hero, StatsStrip) are eagerly loaded.
 * Below-fold sections are code-split via React.lazy + Suspense.
 */

import { lazy, Suspense, useCallback, useRef } from 'react'
import { LazyMotion } from 'framer-motion'
import { LandingNavbar } from './navbar'
import { HeroSection } from './HeroSection'
import { StatsStrip } from './StatsStrip'

/* ── Async Framer Motion features (reduces initial bundle) ── */
const loadFeatures = () =>
  import('framer-motion').then((res) => res.domMax)

/* ── Lazy-loaded below-fold sections ── */
const FeatureSections = lazy(() =>
  import('./FeatureSections').then((m) => ({ default: m.FeatureSections }))
)
const HowItWorks = lazy(() =>
  import('./HowItWorks').then((m) => ({ default: m.HowItWorks }))
)
const Testimonials = lazy(() =>
  import('./testimonials').then((m) => ({ default: m.Testimonials }))
)
const PricingSection = lazy(() =>
  import('./PricingSection').then((m) => ({ default: m.PricingSection }))
)
const CTASection = lazy(() =>
  import('./CTASection').then((m) => ({ default: m.CTASection }))
)
const Footer = lazy(() =>
  import('./footer').then((m) => ({ default: m.Footer }))
)

/** Dark-themed section skeleton for lazy chunk loading. */
function SectionSkeleton() {
  return (
    <div className="py-20 flex justify-center">
      <div className="w-full max-w-5xl px-6 space-y-4 animate-pulse">
        <div className="h-6 w-1/3 rounded bg-white/[0.04]" />
        <div className="h-4 w-2/3 rounded bg-white/[0.03]" />
        <div className="h-4 w-1/2 rounded bg-white/[0.02]" />
      </div>
    </div>
  )
}

export default function LandingPage() {
  const skipHijackRef = useRef<(() => void) | null>(null)
  const handleSkipHijack = useCallback((cb: () => void) => { skipHijackRef.current = cb }, [])
  const onNavClick = useCallback(() => { skipHijackRef.current?.() }, [])

  return (
    <LazyMotion features={loadFeatures} strict={false}>
      <div className="min-h-screen bg-[#0C0B0A] text-[#F0EDE8]">
        <LandingNavbar onNavClick={onNavClick} />
        <main>
          {/* Above-fold — eagerly loaded */}
          <HeroSection onSkipHijack={handleSkipHijack} />
          <StatsStrip />

          {/* Below-fold — code-split for faster initial paint */}
          <Suspense fallback={<SectionSkeleton />}>
            <FeatureSections />
          </Suspense>
          <Suspense fallback={<SectionSkeleton />}>
            <HowItWorks />
          </Suspense>
          <Suspense fallback={<SectionSkeleton />}>
            <Testimonials />
          </Suspense>
          <Suspense fallback={<SectionSkeleton />}>
            <PricingSection />
          </Suspense>
          <Suspense fallback={<SectionSkeleton />}>
            <CTASection />
          </Suspense>
          <Suspense fallback={<SectionSkeleton />}>
            <Footer />
          </Suspense>
        </main>
      </div>
    </LazyMotion>
  )
}
