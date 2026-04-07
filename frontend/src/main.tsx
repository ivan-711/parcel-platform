// Fonts — self-hosted via Fontsource (bundled into Vite build)
import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'

import React from 'react'
import ReactDOM from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>,
)
