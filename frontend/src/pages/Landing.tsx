/**
 * Landing page — public marketing page.
 * Dark fintech SaaS aesthetic: Bloomberg data density x Stripe visual confidence.
 * Sections: Navbar -> Hero + Demo Card -> Ticker -> Stats -> Testimonials ->
 *           Features (bento) -> Comparison Table -> How It Works ->
 *           Interactive Calculator -> Pricing -> Final CTA -> Footer
 *
 * Performance: LazyMotion defers framer-motion features. Below-fold sections
 * are code-split via React.lazy + Suspense for faster initial paint.
 */

import { lazy, Suspense } from 'react'
import { LazyMotion } from 'framer-motion'
import { LenisProvider } from '@/components/landing/lenis-provider'
import { ParallaxBackground } from '@/components/landing/ParallaxBackground'
import { ScrollProgressBar } from '@/components/landing/scroll-progress'
import { SkipToContent } from '@/components/landing/skip-to-content'
import { Navbar } from '@/components/landing/navbar'
import { Hero } from '@/components/landing/hero'
import { Ticker } from '@/components/landing/ticker'
import { StatsStrip } from '@/components/landing/stats-strip'

/* ── Async Framer Motion features (reduces initial bundle ~29KB) ── */
const loadFeatures = () =>
  import('framer-motion').then((res) => res.domMax)

/* ── Lazy-loaded below-fold sections ── */
const Testimonials = lazy(() =>
  import('@/components/landing/testimonials').then((m) => ({ default: m.Testimonials }))
)
const FeaturesBento = lazy(() =>
  import('@/components/landing/features-bento').then((m) => ({ default: m.FeaturesBento }))
)
const ComparisonTable = lazy(() =>
  import('@/components/landing/comparison-table').then((m) => ({ default: m.ComparisonTable }))
)
const HowItWorks = lazy(() =>
  import('@/components/landing/how-it-works').then((m) => ({ default: m.HowItWorks }))
)
const InteractiveDealCalc = lazy(() =>
  import('@/components/landing/deal-calculator').then((m) => ({ default: m.InteractiveDealCalc }))
)
const Pricing = lazy(() =>
  import('@/components/landing/pricing').then((m) => ({ default: m.Pricing }))
)
const FinalCTA = lazy(() =>
  import('@/components/landing/final-cta').then((m) => ({ default: m.FinalCTA }))
)
const Footer = lazy(() =>
  import('@/components/landing/footer').then((m) => ({ default: m.Footer }))
)

/** Minimal section placeholder while lazy chunks load. */
function SectionSkeleton() {
  return (
    <div className="py-20 flex justify-center">
      <div className="w-full max-w-5xl px-6 space-y-4 animate-pulse">
        <div className="h-6 w-1/3 rounded bg-gray-200/60" />
        <div className="h-4 w-2/3 rounded bg-gray-200/40" />
        <div className="h-4 w-1/2 rounded bg-gray-200/30" />
      </div>
    </div>
  )
}

export default function Landing() {
  return (
    <LazyMotion features={loadFeatures} strict={false}>
      <LenisProvider>
        <div className="min-h-screen text-gray-900 bg-[#F9FAFB]">
          <SkipToContent />
          <ScrollProgressBar />
          <ParallaxBackground />
          <div className="relative z-10">
            <Navbar />
            <main id="main-content">
              {/* Above-fold — eagerly loaded */}
              <Hero />
              <Ticker />
              <StatsStrip />

              {/* Below-fold — code-split for faster initial paint */}
              <Suspense fallback={<SectionSkeleton />}>
                <Testimonials />
              </Suspense>
              <Suspense fallback={<SectionSkeleton />}>
                <FeaturesBento />
              </Suspense>
              <Suspense fallback={<SectionSkeleton />}>
                <ComparisonTable />
              </Suspense>
              <Suspense fallback={<SectionSkeleton />}>
                <HowItWorks />
              </Suspense>
              <Suspense fallback={<SectionSkeleton />}>
                <InteractiveDealCalc />
              </Suspense>
              <Suspense fallback={<SectionSkeleton />}>
                <Pricing />
              </Suspense>
              <Suspense fallback={<SectionSkeleton />}>
                <FinalCTA />
              </Suspense>
              <Suspense fallback={<SectionSkeleton />}>
                <Footer />
              </Suspense>
            </main>
          </div>
        </div>
      </LenisProvider>
    </LazyMotion>
  )
}
