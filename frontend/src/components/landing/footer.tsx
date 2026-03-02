/** Footer — site footer with logo, nav links, and copyright. */

export function Footer() {
  return (
    <footer className="border-t border-border-subtle py-10 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-5">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-accent-primary/20 border border-accent-primary/30 flex items-center justify-center">
            <span className="text-[8px] font-bold text-accent-primary font-mono">P</span>
          </div>
          <span className="text-sm font-semibold text-text-secondary">Parcel</span>
        </div>

        <div className="flex gap-6 text-xs text-text-muted">
          {['Privacy', 'Terms', 'Support', 'GitHub'].map((link) => (
            <a
              key={link}
              href="#"
              className="hover:text-text-secondary transition-colors duration-150 cursor-pointer"
            >
              {link}
            </a>
          ))}
        </div>

        <p className="text-xs text-text-muted">
          © 2026 Parcel · Powered by{' '}
          <span className="text-text-secondary">Anthropic</span>
        </p>
      </div>
    </footer>
  )
}
