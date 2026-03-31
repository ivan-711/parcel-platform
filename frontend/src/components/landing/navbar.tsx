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
          ? 'backdrop-blur-xl bg-white/85 border-b border-gray-200'
          : 'bg-transparent',
      )}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-lime-700 flex items-center justify-center">
            <span className="text-[10px] font-bold text-white font-mono">P</span>
          </div>
          <span className="text-sm font-semibold text-gray-900 tracking-tight">Parcel</span>
        </div>

        {/* Center nav */}
        <div className="hidden md:flex items-center gap-7 text-sm text-gray-500">
          {[
            { label: 'Features', href: '#features' },
            { label: 'How it works', href: '#how-it-works' },
            { label: 'Pricing', href: '#pricing' },
          ].map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="hover:text-gray-900 transition-colors duration-150 cursor-pointer rounded focus-visible:ring-2 focus-visible:ring-lime-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none"
            >
              {label}
            </a>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors duration-150 cursor-pointer rounded focus-visible:ring-2 focus-visible:ring-lime-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none"
          >
            Sign in
          </Link>
          <Link to="/register" className="rounded focus-visible:ring-2 focus-visible:ring-lime-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none">
            <Button
              size="sm"
              className="bg-lime-700 hover:bg-lime-800 text-white text-sm h-8 px-4 cursor-pointer transition-colors duration-150"
            >
              Get started
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  )
}
