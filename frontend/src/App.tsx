import { lazy, Suspense, useEffect } from 'react'
import { initTheme } from '@/lib/theme'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { Toaster } from '@/components/ui/sonner'
import { ErrorBoundary, PageErrorBoundary } from '@/components/error-boundary'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/lib/api'

// Lazy-loaded pages
const Landing = lazy(() => import('@/components/landing/LandingPage'))
const Login = lazy(() => import('@/pages/Login'))
const Register = lazy(() => import('@/pages/Register'))
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'))
const ResetPassword = lazy(() => import('@/pages/ResetPassword'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const StrategySelectPage = lazy(() => import('@/pages/analyze/StrategySelectPage'))
const AnalyzerFormPage = lazy(() => import('@/pages/analyze/AnalyzerFormPage'))
const ResultsPage = lazy(() => import('@/pages/analyze/ResultsPage'))
const MyDeals = lazy(() => import('@/pages/MyDeals'))
const Pipeline = lazy(() => import('@/pages/Pipeline'))
const Portfolio = lazy(() => import('@/pages/portfolio/PortfolioPage'))
const Documents = lazy(() => import('@/pages/documents/DocumentsPage'))
const Chat = lazy(() => import('@/pages/chat/ChatPage'))
const Settings = lazy(() => import('@/pages/settings/SettingsPage'))
const PricingPage = lazy(() => import('@/pages/PricingPage'))
const ShareDeal = lazy(() => import('@/pages/share/ShareDealPage'))
const ComparePage = lazy(() => import('@/pages/compare/ComparePage'))
const NotFound = lazy(() => import('@/pages/NotFound'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        if (error instanceof Error && error.message === 'Session expired') return false
        return failureCount < 2
      },
    },
  },
})

function PageFallback() {
  return (
    <div className="min-h-screen bg-app-bg p-8 space-y-4">
      <SkeletonCard lines={2} />
      <SkeletonCard lines={4} />
    </div>
  )
}

/** Validates the session cookie on mount when localStorage says we're authenticated. */
function useSessionValidation() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const setAuth = useAuthStore((s) => s.setAuth)

  const { data, isError } = useQuery({
    queryKey: ['session-check'],
    queryFn: () => api.auth.me(),
    enabled: isAuthenticated,
    retry: false,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    if (isError) {
      clearAuth()
    }
  }, [isError, clearAuth])

  useEffect(() => {
    if (data) {
      setAuth(data)
    }
  }, [data, setAuth])
}

/** Redirects unauthenticated users to /login. */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

/** Redirects authenticated users to /dashboard (prevents accessing login/register when logged in). */
function GuestRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

/** Renders all routes wrapped in AnimatePresence for opacity crossfade transitions. */
function AnimatedRoutes() {
  const location = useLocation()
  useSessionValidation()

  return (
    <Suspense fallback={<PageFallback />}>
      <Routes location={location}>
        {/* Public routes — no auth guard */}
        <Route path="/" element={<GuestRoute><Landing /></GuestRoute>} />
        <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
        <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
        <Route path="/reset-password" element={<GuestRoute><ResetPassword /></GuestRoute>} />
        <Route path="/share/:dealId" element={<ShareDeal />} />

        {/* Protected app routes — AppShell handles page transitions via AnimatePresence */}
        <Route path="/dashboard" element={<ProtectedRoute><PageErrorBoundary><Dashboard /></PageErrorBoundary></ProtectedRoute>} />
        <Route path="/analyze" element={<ProtectedRoute><PageErrorBoundary><StrategySelectPage /></PageErrorBoundary></ProtectedRoute>} />
        <Route path="/analyze/results/:dealId" element={<ProtectedRoute><PageErrorBoundary><ResultsPage /></PageErrorBoundary></ProtectedRoute>} />
        <Route path="/analyze/:strategy" element={<ProtectedRoute><PageErrorBoundary><AnalyzerFormPage /></PageErrorBoundary></ProtectedRoute>} />
        <Route path="/deals" element={<ProtectedRoute><PageErrorBoundary><MyDeals /></PageErrorBoundary></ProtectedRoute>} />
        <Route path="/compare" element={<ProtectedRoute><PageErrorBoundary><ComparePage /></PageErrorBoundary></ProtectedRoute>} />
        <Route path="/pipeline" element={<ProtectedRoute><PageErrorBoundary><Pipeline /></PageErrorBoundary></ProtectedRoute>} />
        <Route path="/portfolio" element={<ProtectedRoute><PageErrorBoundary><Portfolio /></PageErrorBoundary></ProtectedRoute>} />
        <Route path="/documents" element={<ProtectedRoute><PageErrorBoundary><Documents /></PageErrorBoundary></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><PageErrorBoundary><Chat /></PageErrorBoundary></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><PageErrorBoundary><Settings /></PageErrorBoundary></ProtectedRoute>} />
        <Route path="/pricing" element={<ProtectedRoute><PageErrorBoundary><PricingPage /></PageErrorBoundary></ProtectedRoute>} />

        {/* Catch-all 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}

/** Root application component — sets up routing, React Query, and lazy page loading. */
export default function App() {
  useEffect(() => {
    const cleanup = initTheme()
    return cleanup
  }, [])

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AnimatedRoutes />
          <Toaster />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
