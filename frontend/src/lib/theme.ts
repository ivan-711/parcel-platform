/**
 * Theme management — persists user preference to localStorage and applies
 * the .light class on <html> accordingly. Dark is the default (no class).
 */

export type Theme = 'system' | 'dark' | 'light'

const STORAGE_KEY = 'parcel-theme'

export function getTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'dark' || stored === 'light' || stored === 'system') return stored
  return 'system'
}

export function setTheme(theme: Theme): void {
  localStorage.setItem(STORAGE_KEY, theme)
  applyTheme(theme)
}

export function applyTheme(theme: Theme): void {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const shouldBeLight =
    theme === 'light' || (theme === 'system' && !prefersDark)

  if (shouldBeLight) {
    document.documentElement.classList.add('light')
  } else {
    document.documentElement.classList.remove('light')
  }
}

/**
 * Initialise theme on app boot. Returns a cleanup function that removes
 * the matchMedia listener (for use in useEffect teardown).
 */
export function initTheme(): () => void {
  const theme = getTheme()
  applyTheme(theme)

  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const onChange = () => {
    if (getTheme() === 'system') applyTheme('system')
  }
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}
