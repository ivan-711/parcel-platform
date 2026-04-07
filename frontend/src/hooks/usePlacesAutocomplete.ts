/**
 * Lightweight Google Places autocomplete hook.
 * Loads the Places API script dynamically; gracefully degrades when API key is missing.
 */

import { useEffect, useRef, useCallback } from 'react'

const PLACES_API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY as string | undefined
const SCRIPT_ID = 'google-places-script'

let scriptLoaded = false
let scriptLoading = false
const loadCallbacks: (() => void)[] = []

function loadScript(): Promise<void> {
  if (scriptLoaded) return Promise.resolve()
  if (!PLACES_API_KEY) return Promise.reject(new Error('No API key'))

  return new Promise((resolve, reject) => {
    if (scriptLoading) {
      loadCallbacks.push(resolve)
      return
    }
    scriptLoading = true
    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = `https://maps.googleapis.com/maps/api/js?key=${PLACES_API_KEY}&libraries=places`
    script.async = true
    script.onload = () => {
      scriptLoaded = true
      scriptLoading = false
      resolve()
      loadCallbacks.forEach((cb) => cb())
      loadCallbacks.length = 0
    }
    script.onerror = () => {
      scriptLoading = false
      reject(new Error('Failed to load Google Places'))
    }
    document.head.appendChild(script)
  })
}

interface UsePlacesOptions {
  onSelect: (address: string) => void
}

export function usePlacesAutocomplete(
  inputRef: React.RefObject<HTMLInputElement | null>,
  { onSelect }: UsePlacesOptions,
) {
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  const init = useCallback(async () => {
    if (!PLACES_API_KEY || !inputRef.current) return

    try {
      await loadScript()
    } catch {
      return // Graceful degradation — plain input continues to work
    }

    if (!inputRef.current || autocompleteRef.current) return

    const ac = new google.maps.places.Autocomplete(inputRef.current, {
      types: ['address'],
      componentRestrictions: { country: 'us' },
      fields: ['formatted_address'],
    })

    ac.addListener('place_changed', () => {
      const place = ac.getPlace()
      if (place?.formatted_address) {
        onSelectRef.current(place.formatted_address)
      }
    })

    autocompleteRef.current = ac
  }, [inputRef])

  useEffect(() => {
    init()
    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current)
        autocompleteRef.current = null
      }
    }
  }, [init])

  return { isEnabled: !!PLACES_API_KEY }
}
