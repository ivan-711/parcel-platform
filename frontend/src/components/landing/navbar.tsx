/** Navbar — fixed top navigation with scroll-triggered backdrop blur. */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      className={cn(
        'fixed top-0 w-full z-50 transition-all duration-300',
        scrolled
          ? 'backdrop-blur-xl bg-app-bg/85 border-b border-border-subtle'
          : 'bg-transparent',
      )}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-accent-primary flex items-center justify-center">
            <span className="text-[10px] font-bold text-white font-mono">P</span>
          </div>
          <span className="text-sm font-semibold text-text-primary tracking-tight">Parcel</span>
        </div>

        {/* Center nav */}
        <div className="hidden md:flex items-center gap-7 text-sm text-text-secondary">
          {[
            { label: 'Features', href: '#features' },
            { label: 'How it works', href: '#how-it-works' },
            { label: 'Pricing', href: '#pricing' },
          ].map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="hover:text-text-primary transition-colors duration-150 cursor-pointer"
            >
              {label}
            </a>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="text-sm text-text-secondary hover:text-text-primary transition-colors duration-150 cursor-pointer"
          >
            Sign in
          </Link>
          <Link to="/register">
            <Button
              size="sm"
              className="bg-accent-primary hover:bg-accent-hover text-white text-sm h-8 px-4 cursor-pointer transition-colors duration-150"
            >
              Get started
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  )
}
