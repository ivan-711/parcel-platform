import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { Toaster } from '@/components/ui/sonner'
import { ErrorBoundary, PageErrorBoundary } from '@/components/error-boundary'
import { useAuthStore } from '@/stores/authStore'
import { pageTransition } from '@/lib/motion'

// Lazy-loaded pages
const Landing = lazy(() => import('@/pages/Landing'))
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
const ShareDeal = lazy(() => import('@/pages/share/ShareDealPage'))
const ComparePage = lazy(() => import('@/pages/compare/ComparePage'))
const NotFound = lazy(() => import('@/pages/NotFound'))

const queryClient = new QueryClient()

function PageFallback() {
  return (
    <div className="min-h-screen bg-app-bg p-8 space-y-4">
      <SkeletonCard lines={2} />
      <SkeletonCard lines={4} />
    </div>
  )
}

/** Redirects unauthenticated users to /login. */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

/** Renders all routes wrapped in AnimatePresence for opacity crossfade transitions. */
function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={pageTransition}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        <Suspense fallback={<PageFallback />}>
          <Routes location={location}>
            {/* Public routes — no auth guard */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/share/:dealId" element={<ShareDeal />} />

            {/* Protected app routes — AppShell is rendered inside each page */}
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

            {/* Catch-all 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  )
}

/** Root application component — sets up routing, React Query, and lazy page loading. */
export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AnimatedRoutes />
          <Toaster position="bottom-right" theme="dark" />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
