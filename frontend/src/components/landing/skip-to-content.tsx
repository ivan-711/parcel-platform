/** SkipToContent — screen-reader-only skip link that becomes visible on focus. */

export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-lime-700 focus:text-white focus:text-sm focus:font-medium focus:outline-none focus:ring-2 focus:ring-lime-500 focus:ring-offset-2 focus:ring-offset-white"
    >
      Skip to main content
    </a>
  )
}
