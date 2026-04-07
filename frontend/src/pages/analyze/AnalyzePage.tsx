import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MapPin, Sparkles, ArrowRight, AlertCircle } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { AnalysisLoadingState, type LoadingStep, type StepStatus } from './components/AnalysisLoadingState'
import { ManualCalculator } from './components/ManualCalculator'
import { api, getAuthHeaders } from '@/lib/api'
import { usePlacesAutocomplete } from '@/hooks/usePlacesAutocomplete'

type PageState = 'input' | 'loading' | 'manual'

const API_URL = (import.meta.env.VITE_API_URL ?? 'https://api.parceldesk.io').replace('http://', 'https://')

export default function AnalyzePage() {
  const [state, setState] = useState<PageState>('input')
  const [address, setAddress] = useState('')
  const [error, setError] = useState('')
  const [steps, setSteps] = useState<LoadingStep[]>(initialSteps())
  const [partialResult, setPartialResult] = useState<Record<string, unknown> | null>(null)
  const partialResultRef = useRef<Record<string, unknown> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const addressInputRef = useRef<HTMLInputElement | null>(null)
  const navigate = useNavigate()

  usePlacesAutocomplete(addressInputRef, {
    onSelect: (formatted) => { setAddress(formatted); if (error) setError('') },
  })

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
      const res = await fetch(`${API_URL}/api/analysis/quick/stream?address=${encodeURIComponent(addr)}`, {
        credentials: 'include',
        signal: controller.signal,
        headers: {
          ...(getAuthHeaders()),
        },
      })

      if (!res.ok || !res.body) {
        throw new Error(`Stream failed: ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        let currentEvent = ''
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim()
          } else if (line.startsWith('data: ') && currentEvent) {
            const data = line.slice(6)
            handleSSEEvent(currentEvent, data, addr)
            currentEvent = ''
          }
        }
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') return

      // Fallback to non-streaming POST
      try {
        updateStep(1, 'active')
        const result = await api.analysis.quick(addr)
        setPartialResult(result)
        updateStep(0, 'success')
        updateStep(1, 'success')
        updateStep(2, 'success')
        updateStep(3, 'success')
        navigateToResults(result)
      } catch (fallbackErr: any) {
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
          setPartialResult(prev => ({ ...prev, narrative: data }))
          updateStep(3, 'success')
          break

        case 'complete':
          updateStep(3, 'success')
          // Store deal_id from the complete event
          if (data.deal_id) {
            setPartialResult(prev => ({ ...prev, deal_id: data.deal_id }))
          }
          // Navigate to results after a beat — read from ref to avoid stale closure
          setTimeout(() => {
            const result = partialResultRef.current
            // Include deal_id from complete event
            if (data.deal_id && result) {
              result.deal_id = data.deal_id
            }
            if (result) navigateToResults(result)
            else setState('input')
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
    } catch { /* parse error, ignore */ }
  }

  const updateStep = (index: number, status: StepStatus, detail?: string) => {
    setSteps(prev => prev.map((s, i) =>
      i === index ? { ...s, status, detail } : s
    ))
  }

  const navigateToResults = (result: Record<string, unknown>) => {
    const property = result.property as any
    if (property?.id) {
      // For now navigate to the analysis results using deal ID pattern
      // In a future sprint this will go to the property detail page
      navigate(`/analyze/results/${property.id}`, { state: { analysisResult: result } })
    } else {
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
            className="text-3xl sm:text-4xl text-[#F0EDE8] mb-3"
            style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 300 }}
          >
            Analyze a Property
          </h1>
          <p className="text-[#C5C0B8] text-sm sm:text-base mb-8">
            Enter any US address to get an AI-powered analysis in seconds
          </p>

          {/* Address input */}
          <div className="relative mb-2">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8A8580]">
              <MapPin size={18} />
            </div>
            <input
              ref={addressInputRef}
              type="text"
              value={address}
              onChange={e => { setAddress(e.target.value); if (error) setError('') }}
              onKeyDown={handleKeyDown}
              placeholder="Enter an address — e.g. 613 N 14th St, Sheboygan, WI"
              className={`w-full h-12 pl-11 pr-28 rounded-xl bg-[#141311] text-[#F0EDE8] text-sm placeholder-[#8A8580]/60 focus:outline-none focus:ring-2 transition-all ${
                error ? 'border border-[#F87171] focus:ring-[#F87171]/30' : 'border border-[#1E1D1B] focus:ring-[#8B7AFF]/30'
              }`}
            />
            <button
              onClick={handleSubmit}
              disabled={!address.trim()}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all bg-[#8B7AFF] text-white hover:bg-[#7B6AEF] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Analyze
            </button>
          </div>

          {/* Error */}
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-1.5 text-[#F87171] text-xs mb-2 justify-center"
            >
              <AlertCircle size={12} />
              {error}
            </motion.p>
          )}

          {/* Powered by */}
          <p className="flex items-center gap-1.5 text-[#8A8580]/60 text-xs justify-center mt-3 mb-10">
            <Sparkles size={12} />
            Powered by market data + AI
          </p>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-8">
            <div className="flex-1 h-px bg-[#1E1D1B]" />
            <span className="text-xs text-[#8A8580]">or</span>
            <div className="flex-1 h-px bg-[#1E1D1B]" />
          </div>

          {/* Manual mode link */}
          <button
            onClick={() => {
              setState('manual')
              try { (window as any).posthog?.capture?.('manual_mode_entered') } catch {}
            }}
            className="flex items-center gap-1.5 text-sm text-[#C5C0B8] hover:text-[#F0EDE8] transition-colors mx-auto"
          >
            Run the numbers manually
            <ArrowRight size={14} />
          </button>
        </motion.div>
      </div>
    </AppShell>
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

