/**
 * Address autocomplete input using Google Places API (New).
 *
 * Uses the PlaceAutocompleteElement web component which renders its own
 * <input> inside a shadow DOM. Styled via ::part(input) CSS to match
 * Parcel's dark theme.
 *
 * Must be rendered inside a <MapsProvider> (APIProvider ancestor).
 */

import { useEffect, useRef, useCallback } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'
import type { PlaceSelection } from '@/types/maps'

interface PlaceAutocompleteInputProps {
  onPlaceSelect: (place: PlaceSelection) => void
  /** Called on every keystroke so the parent can track the raw text value. */
  onInputChange?: (value: string) => void
  placeholder?: string
  className?: string
  value?: string
  autoFocus?: boolean
}

export function PlaceAutocompleteInput({
  onPlaceSelect,
  onInputChange,
  placeholder = 'Enter an address — e.g. 613 N 14th St, Sheboygan, WI',
  className = '',
  value,
  autoFocus,
}: PlaceAutocompleteInputProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const elementRef = useRef<google.maps.places.PlaceAutocompleteElement | null>(null)
  const onSelectRef = useRef(onPlaceSelect)
  const onChangeRef = useRef(onInputChange)
  onSelectRef.current = onPlaceSelect
  onChangeRef.current = onInputChange

  const placesLib = useMapsLibrary('places')

  const initAutocomplete = useCallback(() => {
    if (!placesLib || !containerRef.current || elementRef.current) return

    const el = new google.maps.places.PlaceAutocompleteElement({
      componentRestrictions: { country: 'us' },
      types: ['address'],
    })

    // Apply Parcel dark theme classes to the web component host element
    el.classList.add('parcel-autocomplete')

    el.addEventListener('gmp-placeselect', async (event: any) => {
      const place = event.place as google.maps.places.Place
      if (!place) return

      // Fetch the fields we need (included in session pricing — no extra cost)
      await place.fetchFields({ fields: ['formattedAddress', 'location', 'id'] })

      const result: PlaceSelection = {
        formattedAddress: place.formattedAddress ?? '',
        location: place.location
          ? { lat: place.location.lat(), lng: place.location.lng() }
          : null,
        placeId: place.id ?? null,
      }

      onSelectRef.current(result)
    })

    // Track raw input text
    el.addEventListener('input', () => {
      const input = el.querySelector('input') ?? (el.shadowRoot?.querySelector('input'))
      if (input && onChangeRef.current) {
        onChangeRef.current(input.value)
      }
    })

    containerRef.current.appendChild(el)
    elementRef.current = el

    if (autoFocus) {
      // Focus the inner input after a tick (shadow DOM needs time to render)
      requestAnimationFrame(() => {
        const inner = el.querySelector('input') ?? (el.shadowRoot?.querySelector('input'))
        inner?.focus()
      })
    }
  }, [placesLib, autoFocus])

  useEffect(() => {
    initAutocomplete()
    return () => {
      if (elementRef.current && containerRef.current?.contains(elementRef.current)) {
        containerRef.current.removeChild(elementRef.current)
      }
      elementRef.current = null
    }
  }, [initAutocomplete])

  // If API key is missing or Places library isn't loaded yet, render a plain <input>
  // so the user can still type an address manually (graceful degradation).
  if (!placesLib) {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChangeRef.current?.(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={`parcel-autocomplete-fallback ${className}`}
      />
    )
  }

  return <div ref={containerRef} className={`parcel-autocomplete-container ${className}`} />
}
