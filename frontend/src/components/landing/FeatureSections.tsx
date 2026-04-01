/**
 * FeatureSections — orchestrates 5 alternating feature blocks.
 */

import { FeatureSection } from './FeatureSection'

const FEATURES = [
  {
    label: 'DEAL ANALYSIS',
    title: 'Five Strategies, One Click',
    description:
      'Wholesale, BRRRR, buy-and-hold, flip, and creative finance — each with dedicated calculators built for how investors actually think.',
    accentDot: true,
  },
  {
    label: 'AI ASSISTANT',
    title: 'Ask Anything About Your Deals',
    description:
      'Get instant analysis, comparisons, and recommendations from an AI that understands real estate investing terminology and strategy.',
  },
  {
    label: 'DEAL PIPELINE',
    title: 'Track Every Deal from Lead to Close',
    description:
      'Kanban board built for real estate workflows. Drag deals through your custom stages, attach documents, and never lose track of an opportunity.',
  },
  {
    label: 'PORTFOLIO',
    title: 'See Your Entire Portfolio at a Glance',
    description:
      'Track property performance, monitor cash flow projections, and understand your portfolio composition with visual analytics.',
  },
  {
    label: 'DOCUMENTS',
    title: 'Every Document, Organized and Analyzed',
    description:
      'Upload contracts, inspections, and financials. AI extracts key data points and flags potential risks automatically.',
  },
]

export function FeatureSections() {
  return (
    <section id="features">
      {FEATURES.map((feature, i) => (
        <FeatureSection
          key={feature.label}
          label={feature.label}
          title={feature.title}
          description={feature.description}
          reversed={i % 2 === 1}
          accentDot={feature.accentDot}
        />
      ))}
    </section>
  )
}
