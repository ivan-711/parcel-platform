/**
 * Navbar — floating pill navigation for the landing page.
 * Shrinks and increases background opacity on scroll past 80px.
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { scrollToSection } from './landing-utils'

const NAV_LINKS = [
  { label: 'Features', target: 'features' },
  { label: 'Pricing', target: 'pricing' },
]

export function LandingNavbar({ onNavClick }: { onNavClick?: () => void }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      className={cn(
        'fixed top-6 left-1/2 -translate-x-1/2 z-50',
        'flex items-center gap-3 md:gap-6',
        'border border-border-default rounded-full',
        'shadow-[0_4px_24px_rgba(0,0,0,0.3)]',
        'transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]',
        scrolled
          ? 'bg-[#0C0B0A]/80 backdrop-blur-xl px-4 md:px-5 py-2 [.light_&]:bg-[#F5F3EF]/80'
          : 'bg-[#0C0B0A]/60 backdrop-blur-xl px-4 md:px-6 py-3 [.light_&]:bg-[#F5F3EF]/80',
      )}
    >
      {/* Logo */}
      <Link to="/" className="font-brand text-lg font-light tracking-[-0.02em] text-text-primary">
        Parcel
      </Link>

      {/* Nav links — desktop only */}
      <div className="hidden md:flex items-center gap-5">
        {NAV_LINKS.map(({ label, target }) => (
          <button
            key={label}
            onClick={() => { onNavClick?.(); scrollToSection(target) }}
            className="text-sm text-text-secondary hover:text-text-primary transition-colors duration-200 cursor-pointer"
          >
            {label}
          </button>
        ))}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 md:gap-4">
        <Link
          to="/login"
          className="hidden md:inline text-sm text-text-secondary hover:text-text-primary transition-colors duration-200"
        >
          Log in
        </Link>
        <Link
          to="/register"
          className="inline-block rounded-full px-5 py-2 text-sm font-medium text-accent-text-on-accent hover:opacity-90 transition-opacity duration-200"
          style={{ background: 'linear-gradient(to right, #8B7AFF, #6C5CE7)' }}
        >
          Get Started
        </Link>
      </div>
    </nav>
  )
}
