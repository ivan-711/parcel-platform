/**
 * Landing page — public marketing page.
 * Dark fintech SaaS aesthetic: Bloomberg data density x Stripe visual confidence.
 * Sections: Navbar -> Hero + Demo Card -> Ticker -> Stats -> Features (bento) ->
 *           How It Works -> Pricing -> Final CTA -> Footer
 */

import { ParallaxBackground } from '@/components/landing/ParallaxBackground'
import { SkipToContent } from '@/components/landing/skip-to-content'
import { Navbar } from '@/components/landing/navbar'
import { Hero } from '@/components/landing/hero'
import { Ticker } from '@/components/landing/ticker'
import { StatsStrip } from '@/components/landing/stats-strip'
import { FeaturesBento } from '@/components/landing/features-bento'
import { HowItWorks } from '@/components/landing/how-it-works'
import { Pricing } from '@/components/landing/pricing'
import { FinalCTA } from '@/components/landing/final-cta'
import { Footer } from '@/components/landing/footer'

export default function Landing() {
  return (
    <div className="min-h-screen text-text-primary">
      <SkipToContent />
      <ParallaxBackground />
      <div className="relative z-10">
        <Navbar />
        <main id="main-content">
          <Hero />
          <Ticker />
          <StatsStrip />
          <FeaturesBento />
          <HowItWorks />
          <Pricing />
          <FinalCTA />
          <Footer />
        </main>
      </div>
    </div>
  )
}
