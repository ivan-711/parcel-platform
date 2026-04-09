/** Shared map-related type definitions. */

export interface GeoPoint {
  lat: number
  lng: number
}

export interface PlaceSelection {
  formattedAddress: string
  location: GeoPoint | null
  placeId: string | null
}

export interface MapMarker {
  id: string
  position: GeoPoint
  label?: string
}

export interface CompMarker extends MapMarker {
  address: string
  adjustedValue: number | null
  compType: string | null
  sqft: number | null
  bedrooms: number | null
  bathrooms: number | null
}
