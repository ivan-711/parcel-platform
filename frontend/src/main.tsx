// Fonts — JetBrains Mono via Fontsource, General Sans + Satoshi self-hosted in public/fonts
import '@fontsource-variable/jetbrains-mono'

import React from 'react'
import ReactDOM from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import posthog from 'posthog-js'
import App from './App'
import './index.css'

/* ─── PostHog Analytics ─── */
// Events are proxied through /ingest (see frontend/vercel.json rewrites) so
// ad blockers that target posthog.com hostnames don't drop beacons client-side.
// ui_host keeps dashboard links (e.g. "View person") pointing at real PostHog.
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY

if (POSTHOG_KEY) {
  posthog.init(POSTHOG_KEY, {
    api_host: '/ingest',
    ui_host: 'https://us.i.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: false,
    capture_performance: false,
    autocapture: false,
    disable_session_recording: true,
  })
  ;(window as any).posthog = posthog
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>,
)
