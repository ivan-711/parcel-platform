/**
 * LandingPage — page orchestrator for the public marketing landing page.
 * Dark luxury aesthetic. No AppShell — standalone full-page experience.
 *
 * Hero is eagerly loaded. All below-fold sections are code-split via React.lazy.
 * Lenis provides smooth scroll normalization.
 */

import { lazy, Suspense, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { LazyMotion, motion, useScroll } from 'framer-motion'
import Lenis from 'lenis'
import { LandingNavbar } from './navbar'
import { HeroSection } from './HeroSection'

/* -- Async Framer Motion features (reduces initial bundle) -- */
const loadFeatures = () =>
  import('framer-motion').then((res) => res.domMax)

/* -- Lazy-loaded below-fold sections -- */
const ProblemSection = lazy(() =>
  import('./ProblemSection').then((m) => ({ default: m.ProblemSection }))
)
const ProductPreview = lazy(() =>
  import('./ProductPreview').then((m) => ({ default: m.ProductPreview }))
)
const HowItWorks = lazy(() =>
  import('./HowItWorks').then((m) => ({ default: m.HowItWorks }))
)
const StrategyTabs = lazy(() =>
  import('./StrategyTabs').then((m) => ({ default: m.StrategyTabs }))
)
const AINarrativeDemo = lazy(() =>
  import('./AINarrativeDemo').then((m) => ({ default: m.AINarrativeDemo }))
)
const StatsStrip = lazy(() =>
  import('./StatsStrip').then((m) => ({ default: m.StatsStrip }))
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
const AtmosphericImage = lazy(() =>
  import('./AtmosphericImage').then((m) => ({ default: m.AtmosphericImage }))
)

/** Dark-themed section skeleton for lazy chunk loading. */
function SectionSkeleton() {
  return (
    <div className="py-20 flex justify-center">
      <div className="w-full max-w-5xl px-6 space-y-4 animate-pulse">
        <div className="h-6 w-1/3 rounded bg-border-subtle" />
        <div className="h-4 w-2/3 rounded bg-border-subtle" />
        <div className="h-4 w-1/2 rounded bg-border-subtle" />
      </div>
    </div>
  )
}

export default function LandingPage() {
  const { scrollYProgress } = useScroll()

  // Lenis smooth scroll
  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true })
    function raf(time: number) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }
    requestAnimationFrame(raf)
    return () => lenis.destroy()
  }, [])

  return (
    <LazyMotion features={loadFeatures} strict={false}>
      <Helmet>
        <title>Parcel — Real Estate Deal Analysis in Under 60 Seconds</title>
        <meta name="description" content="Analyze any US property across 5 investment strategies — wholesale, BRRRR, flip, buy & hold, creative finance — in under 60 seconds." />
      </Helmet>
      <div className="min-h-screen bg-app-bg text-text-primary">
        <LandingNavbar />
        {/* Scroll progress indicator */}
        <motion.div
          style={{ scaleX: scrollYProgress }}
          role="progressbar"
          aria-label="Page reading progress"
          className="fixed top-0 left-0 right-0 h-[2px] bg-accent-primary origin-left z-[60]"
        />
        <main>
          {/* Above-fold — eagerly loaded */}
          <HeroSection />

          {/* Below-fold — one continuous dark surface; sections emerge from the void via spacing and type. */}
          <Suspense fallback={<SectionSkeleton />}>
            <StatsStrip />
          </Suspense>

          {/* Atmospheric interlude — "The Hour", scroll-driven light sweep across brutalist concrete */}
          <Suspense fallback={null}>
            <AtmosphericImage
              framePrefix="atmospheric-hour-frames"
              heading="Every property has a story."
              subheading="We read it in 60 seconds."
              opacity={0.28}
            />
          </Suspense>

          <Suspense fallback={<SectionSkeleton />}>
            <ProblemSection />
          </Suspense>
          <Suspense fallback={<SectionSkeleton />}>
            <ProductPreview />
          </Suspense>
          <Suspense fallback={<SectionSkeleton />}>
            <HowItWorks />
          </Suspense>

          {/* Atmospheric interlude — "The Dwelling", scroll-driven reveal as windows warm to life */}
          <Suspense fallback={null}>
            <AtmosphericImage
              framePrefix="atmospheric-dwelling-frames"
              heading="See what others miss."
              subheading="AI-powered analysis for smarter decisions."
              opacity={0.25}
            />
          </Suspense>

          <Suspense fallback={<SectionSkeleton />}>
            <StrategyTabs />
          </Suspense>
          <Suspense fallback={<SectionSkeleton />}>
            <AINarrativeDemo />
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
