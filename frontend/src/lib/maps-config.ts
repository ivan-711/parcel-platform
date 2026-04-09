/** Shared Google Maps configuration constants. */

/** Default map center — continental US centroid. */
export const DEFAULT_CENTER = { lat: 39.8283, lng: -98.5795 }

/** Default zoom levels by use case. */
export const ZOOM = {
  /** Single property view */
  property: 17,
  /** Comps map (subject + nearby comps) */
  comps: 14,
  /** Pipeline / portfolio map */
  portfolio: 5,
} as const

/** Map type IDs */
export const MAP_TYPES = {
  satellite: 'satellite' as const,
  roadmap: 'roadmap' as const,
  hybrid: 'hybrid' as const,
}
