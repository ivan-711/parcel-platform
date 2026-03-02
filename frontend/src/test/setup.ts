import '@testing-library/jest-dom'

/** Mock IntersectionObserver — not available in jsdom. */
class IntersectionObserverMock {
  readonly root: Element | null = null
  readonly rootMargin: string = ''
  readonly thresholds: ReadonlyArray<number> = []
  observe(): void { /* noop */ }
  unobserve(): void { /* noop */ }
  disconnect(): void { /* noop */ }
  takeRecords(): IntersectionObserverEntry[] { return [] }
}
globalThis.IntersectionObserver = IntersectionObserverMock as unknown as typeof IntersectionObserver

/** Mock ResizeObserver — not available in jsdom. */
class ResizeObserverMock {
  observe(): void { /* noop */ }
  unobserve(): void { /* noop */ }
  disconnect(): void { /* noop */ }
}
globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver

/** Mock matchMedia — not available in jsdom. */
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => { /* noop */ },
    removeListener: () => { /* noop */ },
    addEventListener: () => { /* noop */ },
    removeEventListener: () => { /* noop */ },
    dispatchEvent: () => false,
  }),
})
