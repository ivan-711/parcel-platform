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
    title: 'Company',
    links: [
      { label: 'About', href: '#' },
      { label: 'Blog', href: '#' },
      { label: 'Contact', href: '#' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms', href: '#' },
      { label: 'Privacy', href: '#' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="bg-[#131210] border-t border-white/[0.04] py-16">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
        {/* Logo column */}
        <div>
          <Link
            to="/"
            className="font-brand text-lg font-light text-[#F0EDE8] tracking-[-0.02em]"
          >
            Parcel
          </Link>
          <p className="text-sm text-[#A09D98] mt-2">
            Real estate deal analysis for serious investors.
          </p>
          <p className="text-[11px] text-[#7A7872] mt-4">
            &copy; {new Date().getFullYear()} Parcel. All rights reserved.
          </p>
        </div>

        {/* Link columns */}
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <p className="text-[11px] uppercase tracking-[0.08em] font-medium text-[#7A7872] mb-4">
              {col.title}
            </p>
            <ul className="space-y-3">
              {col.links.map((link) => (
                <li key={link.label}>
                  {'action' in link && link.action ? (
                    <button
                      onClick={link.action}
                      className="text-sm text-[#A09D98] hover:text-[#F0EDE8] transition-colors duration-200 cursor-pointer"
                    >
                      {link.label}
                    </button>
                  ) : (
                    <a
                      href={'href' in link ? link.href : '#'}
                      className="text-sm text-[#A09D98] hover:text-[#F0EDE8] transition-colors duration-200"
                    >
                      {link.label}
                    </a>
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
