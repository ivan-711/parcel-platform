/**
 * Lazy-loaded APIProvider wrapper — loads the Google Maps SDK only when a
 * map page is rendered. Non-map pages (Dashboard, Settings, etc.) never
 * pay the ~200 KB download cost.
 *
 * Usage:
 *   const MapsProvider = lazy(() => import('@/components/maps/MapsProvider'))
 *   <Suspense fallback={<MapSkeleton />}><MapsProvider>…</MapsProvider></Suspense>
 */

import { APIProvider } from '@vis.gl/react-google-maps'
import type { ReactNode } from 'react'

const API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY as string | undefined

export const isMapsEnabled = Boolean(API_KEY)

export default function MapsProvider({ children }: { children: ReactNode }) {
  if (!API_KEY) return <>{children}</>

  return (
    <APIProvider apiKey={API_KEY}>
      {children}
    </APIProvider>
  )
}
