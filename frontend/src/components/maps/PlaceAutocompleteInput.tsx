/**
 * Address autocomplete input using the headless Places Autocomplete Data API.
 *
 * Uses AutocompleteSuggestion.fetchAutocompleteSuggestions() with our own
 * <input> and dropdown — no shadow DOM, no PlaceAutocompleteElement web
 * component. This gives full control over styling and layout.
 *
 * Must be rendered inside a <MapsProvider> (APIProvider ancestor).
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'
import type { PlaceSelection } from '@/types/maps'

interface PlaceAutocompleteInputProps {
  onPlaceSelect: (place: PlaceSelection) => void
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
  value = '',
  autoFocus,
}: PlaceAutocompleteInputProps) {
  const placesLib = useMapsLibrary('places')
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null)
  const onSelectRef = useRef(onPlaceSelect)
  const onChangeRef = useRef(onInputChange)
  onSelectRef.current = onPlaceSelect
  onChangeRef.current = onInputChange

  // Create a session token for billing purposes (groups keystrokes into one session)
  useEffect(() => {
    if (placesLib) {
      sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken()
    }
  }, [placesLib])

  const fetchSuggestions = useCallback(async (input: string) => {
    if (!placesLib || input.trim().length < 3) {
      setSuggestions([])
      setIsOpen(false)
      return
    }

    try {
      const { suggestions: results } = await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input,
        includedRegionCodes: ['us'],
        includedPrimaryTypes: ['street_address', 'subpremise', 'premise', 'route'],
        sessionToken: sessionTokenRef.current ?? undefined,
      })
      setSuggestions(results)
      setIsOpen(results.length > 0)
      setHighlightIdx(-1)
    } catch {
      setSuggestions([])
      setIsOpen(false)
    }
  }, [placesLib])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    onChangeRef.current?.(val)

    // Debounce suggestions fetch
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300)
  }

  const handleSelect = useCallback(async (suggestion: google.maps.places.AutocompleteSuggestion) => {
    const prediction = suggestion.placePrediction
    if (!prediction) return

    setIsOpen(false)
    setSuggestions([])

    try {
      const place = prediction.toPlace()
      await place.fetchFields({ fields: ['formattedAddress', 'location', 'id'] })

      const result: PlaceSelection = {
        formattedAddress: place.formattedAddress ?? '',
        location: place.location
          ? { lat: place.location.lat(), lng: place.location.lng() }
          : null,
        placeId: place.id ?? null,
      }

      onSelectRef.current(result)

      // Reset session token after a selection (starts a new billing session)
      sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken()
    } catch {
      // If fetchFields fails, still use the prediction text
      const text = prediction.mainText?.text ?? ''
      const secondary = prediction.secondaryText?.text ?? ''
      onSelectRef.current({
        formattedAddress: secondary ? `${text}, ${secondary}` : text,
        location: null,
        placeId: null,
      })
    }
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIdx(prev => (prev + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIdx(prev => (prev <= 0 ? suggestions.length - 1 : prev - 1))
    } else if (e.key === 'Enter' && highlightIdx >= 0) {
      e.preventDefault()
      handleSelect(suggestions[highlightIdx])
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fallback: if Places library isn't loaded yet, render a plain input
  if (!placesLib) {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChangeRef.current?.(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        aria-label="Property address"
        className={`parcel-autocomplete-fallback ${className}`}
      />
    )
  }

  return (
    <div ref={containerRef} className={`parcel-autocomplete-container ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (suggestions.length > 0) setIsOpen(true) }}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        aria-label="Property address"
        role="combobox"
        aria-expanded={isOpen && suggestions.length > 0}
        aria-controls="address-suggestions"
        aria-activedescendant={highlightIdx >= 0 ? `address-option-${highlightIdx}` : undefined}
        className="parcel-autocomplete-input"
      />
      {isOpen && suggestions.length > 0 && (
        <ul id="address-suggestions" role="listbox" aria-label="Address suggestions" className="parcel-autocomplete-dropdown">
          {suggestions.map((s, i) => {
            const prediction = s.placePrediction
            if (!prediction) return null
            return (
              <li
                key={i}
                id={`address-option-${i}`}
                role="option"
                aria-selected={i === highlightIdx}
                onMouseDown={() => handleSelect(s)}
                onMouseEnter={() => setHighlightIdx(i)}
                className={`parcel-autocomplete-item${i === highlightIdx ? ' highlighted' : ''}`}
              >
                <span className="parcel-autocomplete-main">
                  {prediction.mainText?.text ?? ''}
                </span>
                {prediction.secondaryText?.text && (
                  <span className="parcel-autocomplete-secondary">
                    {' '}{prediction.secondaryText.text}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {isOpen && suggestions.length > 0
          ? `${suggestions.length} suggestion${suggestions.length === 1 ? '' : 's'} available`
          : ''}
      </div>
    </div>
  )
}
