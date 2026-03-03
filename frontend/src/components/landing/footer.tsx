/** Footer — site footer with logo, nav columns, social icons, status indicator, and copyright. */

import { Github, Linkedin, AtSign } from 'lucide-react'

const linkClasses =
  'hover:text-text-secondary transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg focus-visible:outline-none rounded'

const iconLinkClasses =
  'text-text-muted hover:text-text-secondary transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg focus-visible:outline-none rounded p-1'

const footerColumns = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'How it Works', href: '#how-it-works' },
      { label: 'Pricing', href: '#pricing' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', href: '/docs' },
      { label: 'API', href: '/api' },
      { label: 'Support', href: 'mailto:support@parcel.app' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
    ],
  },
] as const

export function Footer() {
  return (
    <footer className="border-t border-border-subtle py-12 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Top section: Logo/status + nav columns */}
        <div className="flex flex-col md:flex-row gap-10 md:gap-16">
          {/* Logo + status indicator */}
          <div className="flex flex-col gap-4 md:min-w-[180px]">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-accent-primary/20 border border-accent-primary/30 flex items-center justify-center">
                <span className="text-[10px] font-bold text-accent-primary font-mono">
                  P
                </span>
              </div>
              <span className="text-sm font-semibold text-text-secondary">
                Parcel
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-xs text-text-muted">
                All systems operational
              </span>
            </div>
          </div>

          {/* Nav columns */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-16 flex-1">
            {footerColumns.map((column) => (
              <div key={column.title}>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-3">
                  {column.title}
                </h4>
                <ul className="flex flex-col gap-2">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className={`text-sm text-text-muted ${linkClasses}`}
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border-subtle mt-10 pt-6" />

        {/* Bottom section: Social icons + copyright */}
        <div className="flex flex-col-reverse md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-text-muted">
            &copy; 2026 Parcel &middot; Powered by{' '}
            <span className="text-text-secondary">Anthropic</span>
          </p>

          <div className="flex items-center gap-3">
            <a
              href="#"
              aria-label="Follow Parcel on X (Twitter)"
              className={iconLinkClasses}
            >
              <AtSign className="h-4 w-4" />
            </a>
            <a
              href="#"
              aria-label="Parcel on GitHub"
              className={iconLinkClasses}
            >
              <Github className="h-4 w-4" />
            </a>
            <a
              href="#"
              aria-label="Parcel on LinkedIn"
              className={iconLinkClasses}
            >
              <Linkedin className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
