/**
 * Footer — minimal site footer with logo, link columns, and copyright.
 */

import { Link } from 'react-router-dom'
import { scrollToSection } from './landing-utils'

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Features', action: () => scrollToSection('features') },
      { label: 'Pricing', action: () => scrollToSection('pricing') },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms', href: '/terms' },
      { label: 'Privacy', href: '/privacy' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-12">
        {/* Logo column */}
        <div className="col-span-2 md:col-span-1">
          <Link
            to="/"
            className="font-brand text-lg font-light text-text-primary tracking-[-0.02em] focus-ring rounded-sm"
          >
            Parcel
          </Link>
          <p className="text-sm text-text-secondary mt-2">
            Real estate deal analysis for serious investors.
          </p>
          <p className="text-[11px] text-text-secondary mt-4">
            &copy; {new Date().getFullYear()} Parcel. All rights reserved.
          </p>
        </div>

        {/* Link columns */}
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <p className="text-[11px] uppercase tracking-[0.08em] font-medium text-text-muted mb-4">
              {col.title}
            </p>
            <ul className="space-y-3">
              {col.links.map((link) => (
                <li key={link.label}>
                  {'action' in link && link.action ? (
                    <button
                      onClick={link.action}
                      className="text-sm text-text-secondary hover:text-text-primary transition-colors duration-200 cursor-pointer focus-ring rounded-sm"
                    >
                      {link.label}
                    </button>
                  ) : (
                    <Link
                      to={'href' in link ? link.href : '/'}
                      className="text-sm text-text-secondary hover:text-text-primary transition-colors duration-200 focus-ring rounded-sm"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </footer>
  )
}
