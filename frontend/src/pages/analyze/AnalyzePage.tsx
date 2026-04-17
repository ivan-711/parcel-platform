import { useState, useRef, useCallback, useEffect, lazy, Suspense } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MapPin, Sparkles, ArrowRight, AlertCircle } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { AnalysisLoadingState, type LoadingStep, type StepStatus } from './components/AnalysisLoadingState'
import { ManualCalculator } from './components/ManualCalculator'
import { api, ensureAuthHeaders } from '@/lib/api'
import { isMapsEnabled } from '@/components/maps/MapsProvider'
import { PlaceAutocompleteInput } from '@/components/maps/PlaceAutocompleteInput'
import type { PlaceSelection, GeoPoint } from '@/types/maps'

const MapsProvider = lazy(() => import('@/components/maps/MapsProvider'))

type PageState = 'input' | 'loading' | 'manual'

const API_URL = (import.meta.env.VITE_API_URL ?? 'https://api.parceldesk.io').replace('http://', 'https://')

export default function AnalyzePage() {
  const [state, setState] = useState<PageState>('input')
  const [address, setAddress] = useState('')
  const [geoLocation, setGeoLocation] = useState<GeoPoint | null>(null)
  const [placeId, setPlaceId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [steps, setSteps] = useState<LoadingStep[]>(initialSteps())
  const [partialResult, setPartialResult] = useState<Record<string, unknown> | null>(null)
  const partialResultRef = useRef<Record<string, unknown> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const autoDispatchedRef = useRef(false)

  const handlePlaceSelect = useCallback((place: PlaceSelection) => {
    setAddress(place.formattedAddress)
    setGeoLocation(place.location)
    setPlaceId(place.placeId)
    if (error) setError('')
  }, [error])

  useEffect(() => {
    try {
      (window as any).posthog?.capture?.('analyze_page_viewed', { mode: state })
    } catch { /* ignore */ }
  }, [])

  // Keep ref in sync with state so SSE handlers read the latest value
  useEffect(() => { partialResultRef.current = partialResult }, [partialResult])

  // Client-side validation
  const validate = (addr: string): string | null => {
    const trimmed = addr.trim()
    if (trimmed.length < 5) return 'Please enter a valid US address'
    if (!/\d/.test(trimmed) || !/[a-zA-Z]/.test(trimmed)) return 'Please enter a valid US address'
    return null
  }

  const handleSubmit = () => {
    const trimmed = address.trim()
    const err = validate(trimmed)
    if (err) {
      setError(err)
      return
    }
    setError('')
    setState('loading')
    setSteps(initialSteps())
    setPartialResult(null)

    try {
      (window as any).posthog?.capture?.('analysis_address_submitted', { address_length: trimmed.length })
    } catch { /* ignore */ }

    startStream(trimmed)
  }

  const startStream = useCallback(async (addr: string) => {
    const controller = new AbortController()
    abortRef.current = controller

    try {
      (window as any).posthog?.capture?.('analysis_stream_started')
    } catch { /* ignore */ }

    try {
      let authHeaders = await ensureAuthHeaders()

      // Guard: if auth isn't ready yet (token getter not hydrated), retry once
      if (!authHeaders.Authorization) {
        await new Promise(r => setTimeout(r, 500))
        authHeaders = await ensureAuthHeaders()
      }
      if (!authHeaders.Authorization) {
        throw new Error('Authentication not ready — please try again.')
      }

      let streamUrl = `${API_URL}/api/analysis/quick/stream?address=${encodeURIComponent(addr)}`
      if (geoLocation) {
        streamUrl += `&lat=${geoLocation.lat}&lng=${geoLocation.lng}`
      }
      if (placeId) {
        streamUrl += `&place_id=${encodeURIComponent(placeId)}`
      }
      console.log('[SAFARI-DIAG] stream fetch starting:', streamUrl.slice(0, 80))
      const res = await fetch(streamUrl, {
        credentials: 'include',
        signal: controller.signal,
        headers: authHeaders,
      })

      console.log('[SAFARI-DIAG] stream response:', res.status, res.ok, 'body:', !!res.body)
      if (!res.ok || !res.body) {
        throw new Error(`Stream failed: ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          console.log('[SAFARI-DIAG] reader done=true, buffer remaining:', buffer.length, 'chars')
          break
        }

        const chunk = decoder.decode(value, { stream: true })
        console.log('[SAFARI-DIAG] chunk received:', chunk.length, 'chars, first 100:', chunk.slice(0, 100))
        buffer += chunk
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        let currentEvent = ''
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim()
          } else if (line.startsWith('data: ') && currentEvent) {
            const data = line.slice(6)
            console.log('[SAFARI-DIAG] event parsed:', currentEvent, 'payload:', data.slice(0, 80))
            handleSSEEvent(currentEvent, data, addr)
            currentEvent = ''
          }
        }
      }
      console.log('[SAFARI-DIAG] stream loop exited normally (done=true). partialResultRef:', !!partialResultRef.current, 'property:', !!(partialResultRef.current as any)?.property)
    } catch (e: any) {
      console.log('[SAFARI-DIAG] stream catch fired:', e?.name, e?.message?.slice(0, 100))
      if (e?.name === 'AbortError') return

      // Fallback to non-streaming POST
      console.log('[SAFARI-DIAG] falling back to non-streaming POST')
      try {
        updateStep(1, 'active')
        const result = await api.analysis.quick(addr)
        console.log('[SAFARI-DIAG] fallback POST succeeded, property:', !!(result as any)?.property)
        setPartialResult(result)
        updateStep(0, 'success')
        updateStep(1, 'success')
        updateStep(2, 'success')
        updateStep(3, 'success')
        navigateToResults(result)
      } catch (fallbackErr: any) {
        console.log('[SAFARI-DIAG] fallback POST also failed:', (fallbackErr as Error)?.message?.slice(0, 100))
        setSteps(prev => prev.map((s, i) =>
          i === 0 ? { ...s, status: 'success' as StepStatus } :
          i === 1 ? { ...s, status: 'failed' as StepStatus, label: 'Connection error', detail: 'FAILED' } :
          s
        ))
      }
    }
  }, [navigate])

  const handleSSEEvent = (event: string, rawData: string, _addr: string) => {
    try {
      const data = JSON.parse(rawData)

      switch (event) {
        case 'status':
          if (data.stage === 'parsing_address') updateStep(0, 'active')
          if (data.stage === 'fetching_property_data') { updateStep(0, 'success'); updateStep(1, 'active') }
          if (data.stage === 'fetching_advanced_data') { /* Bricked in progress — keep step 1 active */ }
          if (data.stage === 'generating_analysis') { updateStep(1, 'success'); updateStep(2, 'active') }
          if (data.stage === 'generating_narrative') { updateStep(2, 'success'); updateStep(3, 'active') }
          break

        case 'enrichment':
          setPartialResult(prev => ({ ...prev, ...data }))
          updateStep(1, 'success')
          updateStep(2, 'active')
          break

        case 'enrichment_update':
          // Bricked degradation status — non-critical, analysis continues with RentCast data
          break

        case 'scenario':
          setPartialResult(prev => ({ ...prev, scenario: data }))
          updateStep(2, 'success')
          updateStep(3, 'active')
          break

        case 'narrative':
          setPartialResult(prev => ({
            ...prev,
            narrative: data,
            scenario: prev?.scenario
              ? { ...prev.scenario, ai_narrative: data.narrative, ai_narrative_generated_at: new Date().toISOString() }
              : prev?.scenario,
          }))
          updateStep(3, 'success')
          break

        case 'complete':
          console.log('[SAFARI-DIAG] complete event received, deal_id:', data.deal_id)
          console.log('[SAFARI-DIAG] partialResultRef at complete time:', !!partialResultRef.current, 'keys:', partialResultRef.current ? Object.keys(partialResultRef.current) : 'null')
          updateStep(3, 'success')
          // Store deal_id from the complete event
          if (data.deal_id) {
            setPartialResult(prev => ({ ...prev, deal_id: data.deal_id }))
          }
          // Navigate to results after a beat — read from ref to avoid stale closure
          setTimeout(() => {
            const result = partialResultRef.current
            console.log('[SAFARI-DIAG] setTimeout fired (600ms). result:', !!result, 'keys:', result ? Object.keys(result) : 'null', 'property?.id:', (result as any)?.property?.id)
            // Include deal_id from complete event
            if (data.deal_id && result) {
              result.deal_id = data.deal_id
            }
            if (result) {
              console.log('[SAFARI-DIAG] calling navigateToResults')
              navigateToResults(result)
            } else {
              console.log('[SAFARI-DIAG] navigate NOT called — result is null, resetting to input')
              setState('input')
            }
          }, 600)
          break

        case 'error': {
          // Mark the current active step as failed, then exit loading state
          const activeIdx = steps.findIndex(s => s.status === 'active')
          if (activeIdx >= 0) {
            updateStep(activeIdx, 'failed', data.error || 'Analysis failed')
          } else {
            updateStep(1, 'failed', data.error || 'Analysis failed')
          }
          setError(data.error || 'Analysis failed. Please try again.')
          // Return to input state after a brief delay so user sees the failure
          setTimeout(() => setState('input'), 2000)
          break
        }
      }
    } catch (parseErr) { console.log('[SAFARI-DIAG] handleSSEEvent parse error:', event, (parseErr as Error)?.message) }
  }

  const updateStep = (index: number, status: StepStatus, detail?: string) => {
    setSteps(prev => prev.map((s, i) =>
      i === index ? { ...s, status, detail } : s
    ))
  }

  const navigateToResults = (result: Record<string, unknown>) => {
    const property = result.property as any
    console.log('[SAFARI-DIAG] navigateToResults called. property?.id:', property?.id, 'result keys:', Object.keys(result))
    if (property?.id) {
      const url = `/analyze/results/${property.id}`
      console.log('[SAFARI-DIAG] navigate() called with:', url)
      navigate(url, { state: { analysisResult: result } })
    } else {
      console.log('[SAFARI-DIAG] navigate NOT called — property.id missing, resetting to input')
      setState('input')
    }
  }

  const handleCancel = () => {
    abortRef.current?.abort()
    setState('input')
    try {
      const currentStep = steps.find(s => s.status === 'active')
      ;(window as any).posthog?.capture?.('analysis_cancelled', { step: currentStep?.label })
    } catch { /* ignore */ }
  }

  const handleViewDraft = () => {
    if (partialResult) {
      try { (window as any).posthog?.capture?.('analysis_draft_viewed') } catch { /* ignore */ }
      navigateToResults(partialResult)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit()
  }

  // Auto-dispatch when navigated with ?address= (e.g. from PropertyDetailPage)
  useEffect(() => {
    const addressParam = searchParams.get('address')
    if (addressParam && state === 'input' && !autoDispatchedRef.current) {
      autoDispatchedRef.current = true
      setAddress(addressParam)
      const trimmed = addressParam.trim()
      const err = validate(trimmed)
      if (!err) {
        setState('loading')
        setSteps(initialSteps())
        setPartialResult(null)
        startStream(trimmed)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // --- RENDER ---

  if (state === 'manual') {
    return (
      <AppShell title="Quick Calculator">
        <div className="py-8 px-4">
          <ManualCalculator onBack={() => { setState('input'); try { (window as any).posthog?.capture?.('analyze_page_viewed', { mode: 'address' }) } catch {} }} />
        </div>
      </AppShell>
    )
  }

  if (state === 'loading') {
    return (
      <AppShell title="Analyzing">
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4">
          <AnalysisLoadingState
            address={address}
            steps={steps}
            onCancel={handleCancel}
            onViewDraft={handleViewDraft}
          />
        </div>
      </AppShell>
    )
  }

  // STATE 1: Address Input
  return (
    <AppShell title="Analyze">
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-xl text-center"
        >
          {/* Heading */}
          <h1
            className="text-3xl sm:text-4xl text-text-primary font-brand font-light mb-3"
          >
            Analyze a Property
          </h1>
          <p className="text-text-secondary text-sm sm:text-base mb-8">
            Enter any US address to get an AI-powered analysis in seconds
          </p>

          {/* Address input + Analyze button — flex siblings, no overlap */}
          <div className="flex items-center gap-2 mb-2">
            <div className="relative flex-1 min-w-0">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted z-10 pointer-events-none">
                <MapPin size={18} />
              </div>
              {isMapsEnabled ? (
                <Suspense fallback={<AddressFallbackInput address={address} onChange={v => { setAddress(v); if (error) setError('') }} onKeyDown={handleKeyDown} hasError={!!error} />}>
                  <MapsProvider>
                    <PlaceAutocompleteInput
                      onPlaceSelect={handlePlaceSelect}
                      onInputChange={v => { setAddress(v); if (error) setError('') }}
                      value={address}
                      className={error ? 'autocomplete-error' : ''}
                    />
                  </MapsProvider>
                </Suspense>
              ) : (
                <AddressFallbackInput address={address} onChange={v => { setAddress(v); if (error) setError('') }} onKeyDown={handleKeyDown} hasError={!!error} />
              )}
            </div>
            <button
              onClick={handleSubmit}
              disabled={!address.trim()}
              className="shrink-0 h-12 px-5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all bg-accent-primary text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Analyze
            </button>
          </div>

          {/* Error */}
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-1.5 text-loss text-xs mb-2 justify-center"
            >
              <AlertCircle size={12} />
              {error}
            </motion.p>
          )}

          {/* Powered by */}
          <p className="flex items-center gap-1.5 text-text-muted/60 text-xs justify-center mt-3 mb-10">
            <Sparkles size={12} />
            Powered by market data + AI
          </p>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-8">
            <div className="flex-1 h-px bg-border-default" />
            <span className="text-xs text-text-muted">or</span>
            <div className="flex-1 h-px bg-border-default" />
          </div>

          {/* Manual mode link */}
          <button
            onClick={() => {
              setState('manual')
              try { (window as any).posthog?.capture?.('manual_mode_entered') } catch {}
            }}
            className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors mx-auto"
          >
            Run the numbers manually
            <ArrowRight size={14} />
          </button>
        </motion.div>
      </div>
    </AppShell>
  )
}

/** Plain <input> fallback when Maps SDK is unavailable or still loading. */
function AddressFallbackInput({ address, onChange, onKeyDown, hasError }: {
  address: string
  onChange: (v: string) => void
  onKeyDown?: (e: React.KeyboardEvent) => void
  hasError: boolean
}) {
  return (
    <input
      type="text"
      value={address}
      onChange={e => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder="Enter an address — e.g. 613 N 14th St, Sheboygan, WI"
      className={`w-full h-12 pl-11 pr-4 rounded-xl bg-app-recessed text-text-primary text-sm placeholder-text-muted/60 focus:outline-none focus:ring-2 transition-all ${
        hasError ? 'border border-loss focus:ring-loss/30' : 'border border-border-default focus:ring-accent-primary/30'
      }`}
    />
  )
}

function initialSteps(): LoadingStep[] {
  return [
    { label: 'Parsing address...', status: 'active' },
    { label: 'Fetching property data...', status: 'waiting' },
    { label: 'Running analysis', status: 'waiting' },
    { label: 'Generating AI insights', status: 'waiting' },
  ]
}

