/**
 * Navbar — floating pill navigation for the landing page.
 * Shrinks and increases background opacity on scroll past 80px.
 * Mobile: hamburger menu opens a left-side Sheet drawer with nav links + Log in.
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { scrollToSection } from './landing-utils'

const NAV_LINKS = [
  { label: 'Features', target: 'features' },
  { label: 'Pricing', target: 'pricing' },
]

export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      className={cn(
        'fixed top-[max(1.5rem,env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-50',
        'flex items-center gap-3 md:gap-6',
        'border border-border-default rounded-full',
        'shadow-[0_4px_24px_rgba(0,0,0,0.3)]',
        'transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]',
        scrolled
          ? 'bg-[#0C0B0A]/80 backdrop-blur-xl px-4 md:px-5 py-2 [.light_&]:bg-[#F5F3EF]/80'
          : 'bg-[#0C0B0A]/60 backdrop-blur-xl px-4 md:px-6 py-3 [.light_&]:bg-[#F5F3EF]/80',
      )}
    >
      {/* Mobile hamburger — far-left, visible only below md */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            aria-label="Open navigation menu"
            className="md:hidden inline-flex items-center justify-center h-11 w-11 -ml-1 rounded-full text-text-secondary hover:text-text-primary transition-colors duration-200 cursor-pointer focus-ring"
          >
            <Menu size={24} strokeWidth={1.5} />
          </button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="bg-app-bg border-border-default flex flex-col gap-0 p-0"
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>

          {/* Drawer logo */}
          <div className="px-6 pt-6 pb-4 border-b border-border-default">
            <span className="font-brand text-lg font-light tracking-[-0.02em] text-text-primary">
              Parcel
            </span>
          </div>

          {/* Nav links */}
          <div className="flex flex-col px-2 py-4">
            {NAV_LINKS.map(({ label, target }) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  scrollToSection(target)
                  setOpen(false)
                }}
                className="text-left font-brand font-light text-xl text-text-secondary hover:text-text-primary transition-colors duration-200 px-4 py-4 cursor-pointer focus-ring"
              >
                {label}
              </button>
            ))}
          </div>

          {/* Log in — below nav links */}
          <div className="mt-auto px-2 pb-8 pt-4 border-t border-border-default">
            <Link
              to="/login"
              onClick={() => setOpen(false)}
              className="block font-brand font-light text-lg text-text-secondary hover:text-text-primary transition-colors duration-200 px-4 py-4 focus-ring"
            >
              Log in
            </Link>
          </div>
        </SheetContent>
      </Sheet>

      {/* Logo */}
      <Link to="/" className="font-brand text-lg font-light tracking-[-0.02em] text-text-primary focus-ring rounded-sm">
        Parcel
      </Link>

      {/* Nav links — desktop only */}
      <div className="hidden md:flex items-center gap-5">
        {NAV_LINKS.map(({ label, target }) => (
          <button
            key={label}
            onClick={() => scrollToSection(target)}
            className="text-sm text-text-secondary hover:text-text-primary transition-colors duration-200 cursor-pointer focus-ring rounded-sm"
          >
            {label}
          </button>
        ))}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 md:gap-4">
        <Link
          to="/login"
          className="hidden md:inline text-sm text-text-secondary hover:text-text-primary transition-colors duration-200 focus-ring rounded-sm"
        >
          Log in
        </Link>
        <Link
          to="/register"
          className="inline-block rounded-full px-5 py-2 text-sm font-medium text-accent-text-on-accent hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(139,122,255,0.3)] transition-all duration-200 focus-ring"
          style={{ background: 'linear-gradient(to right, #8B7AFF, #6C5CE7)' }}
        >
          Get Started
        </Link>
      </div>
    </nav>
  )
}
