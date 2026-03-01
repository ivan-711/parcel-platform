import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { Toaster } from '@/components/ui/sonner'
import { useAuthStore } from '@/stores/authStore'

// Lazy-loaded pages
const Landing = lazy(() => import('@/pages/Landing'))
const Login = lazy(() => import('@/pages/Login'))
const Register = lazy(() => import('@/pages/Register'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const StrategySelectPage = lazy(() => import('@/pages/analyze/StrategySelectPage'))
const AnalyzerFormPage = lazy(() => import('@/pages/analyze/AnalyzerFormPage'))
const ResultsPage = lazy(() => import('@/pages/analyze/ResultsPage'))
const MyDeals = lazy(() => import('@/pages/MyDeals'))
const Pipeline = lazy(() => import('@/pages/Pipeline'))
const Portfolio = lazy(() => import('@/pages/portfolio/PortfolioPage'))
const Documents = lazy(() => import('@/pages/Documents'))
const Chat = lazy(() => import('@/pages/chat/ChatPage'))
const Settings = lazy(() => import('@/pages/settings/SettingsPage'))
const ShareDeal = lazy(() => import('@/pages/share/ShareDealPage'))

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

/** Root application component — sets up routing, React Query, and lazy page loading. */
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* Public routes — no auth guard */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/share/:dealId" element={<ShareDeal />} />

            {/* Protected app routes — AppShell is rendered inside each page */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/analyze" element={<ProtectedRoute><StrategySelectPage /></ProtectedRoute>} />
            <Route path="/analyze/results/:dealId" element={<ProtectedRoute><ResultsPage /></ProtectedRoute>} />
            <Route path="/analyze/:strategy" element={<ProtectedRoute><AnalyzerFormPage /></ProtectedRoute>} />
            <Route path="/deals" element={<ProtectedRoute><MyDeals /></ProtectedRoute>} />
            <Route path="/pipeline" element={<ProtectedRoute><Pipeline /></ProtectedRoute>} />
            <Route path="/portfolio" element={<ProtectedRoute><Portfolio /></ProtectedRoute>} />
            <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
            <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          </Routes>
          <Toaster position="bottom-right" theme="dark" />
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
