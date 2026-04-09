/**
 * Places autocomplete hook — thin wrapper that reports whether Google Places
 * is available. The actual autocomplete UI is handled by
 * PlaceAutocompleteInput (web component from Places API New).
 *
 * This hook exists solely for backward compatibility with components that
 * check `isEnabled` to decide whether to show autocomplete-related UI.
 *
 * Script loading is handled by MapsProvider (APIProvider) — NO manual
 * <script> tag creation here.
 */

const PLACES_API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY as string | undefined

/** Returns true when the Google Places API key is configured. */
export function usePlacesAutocompleteStatus() {
  return { isEnabled: !!PLACES_API_KEY }
}
