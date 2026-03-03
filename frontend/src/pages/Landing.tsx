/**
 * Landing page — public marketing page.
 * Dark fintech SaaS aesthetic: Bloomberg data density x Stripe visual confidence.
 * Sections: Navbar -> Hero + Demo Card -> Ticker -> Stats -> Testimonials ->
 *           Features (bento) -> Comparison Table -> How It Works ->
 *           Interactive Calculator -> Pricing -> Final CTA -> Footer
 */

import { LenisProvider } from '@/components/landing/lenis-provider'
import { ParallaxBackground } from '@/components/landing/ParallaxBackground'
import { ScrollProgressBar } from '@/components/landing/scroll-progress'
import { SkipToContent } from '@/components/landing/skip-to-content'
import { Navbar } from '@/components/landing/navbar'
import { Hero } from '@/components/landing/hero'
import { Ticker } from '@/components/landing/ticker'
import { StatsStrip } from '@/components/landing/stats-strip'
import { Testimonials } from '@/components/landing/testimonials'
import { FeaturesBento } from '@/components/landing/features-bento'
import { ComparisonTable } from '@/components/landing/comparison-table'
import { HowItWorks } from '@/components/landing/how-it-works'
import { InteractiveDealCalc } from '@/components/landing/deal-calculator'
import { Pricing } from '@/components/landing/pricing'
import { FinalCTA } from '@/components/landing/final-cta'
import { Footer } from '@/components/landing/footer'

export default function Landing() {
  return (
    <LenisProvider>
      <div className="min-h-screen text-text-primary">
        <SkipToContent />
        <ScrollProgressBar />
        <ParallaxBackground />
        <div className="relative z-10">
          <Navbar />
          <main id="main-content">
            <Hero />
            <Ticker />
            <StatsStrip />
            <Testimonials />
            <FeaturesBento />
            <ComparisonTable />
            <HowItWorks />
            <InteractiveDealCalc />
            <Pricing />
            <FinalCTA />
            <Footer />
          </main>
        </div>
      </div>
    </LenisProvider>
  )
}
