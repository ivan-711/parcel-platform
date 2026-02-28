import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SkeletonCard } from '@/components/ui/SkeletonCard'

// Lazy-loaded pages
const Landing = lazy(() => import('@/pages/Landing'))
const Login = lazy(() => import('@/pages/Login'))
const Register = lazy(() => import('@/pages/Register'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Analyze = lazy(() => import('@/pages/Analyze'))
const DealResults = lazy(() => import('@/pages/DealResults'))
const MyDeals = lazy(() => import('@/pages/MyDeals'))
const Pipeline = lazy(() => import('@/pages/Pipeline'))
const Portfolio = lazy(() => import('@/pages/Portfolio'))
const Documents = lazy(() => import('@/pages/Documents'))
const Chat = lazy(() => import('@/pages/Chat'))
const Settings = lazy(() => import('@/pages/Settings'))
const ShareDeal = lazy(() => import('@/pages/ShareDeal'))

const queryClient = new QueryClient()

function PageFallback() {
  return (
    <div className="min-h-screen bg-app-bg p-8 space-y-4">
      <SkeletonCard lines={2} />
      <SkeletonCard lines={4} />
    </div>
  )
}

/** Root application component — sets up routing, React Query, and lazy page loading. */
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* Public routes — no AppShell */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/share/:dealId" element={<ShareDeal />} />

            {/* App routes — AppShell is rendered inside each page */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/analyze" element={<Analyze />} />
            <Route path="/analyze/results/:dealId" element={<DealResults />} />
            <Route path="/deals" element={<MyDeals />} />
            <Route path="/pipeline" element={<Pipeline />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
