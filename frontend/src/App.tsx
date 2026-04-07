import { lazy, Suspense, useEffect } from 'react'
import { initTheme } from '@/lib/theme'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { Toaster } from '@/components/ui/sonner'
import { ErrorBoundary, PageErrorBoundary } from '@/components/error-boundary'
import { useAuthStore } from '@/stores/authStore'
import { useOnboardingStore } from '@/stores/onboardingStore'
import { ClerkProviderWrapper } from '@/components/auth/ClerkProviderWrapper'
import { AuthSyncProvider } from '@/components/auth/AuthSyncProvider'

// ── Dev Preview Mode ──
// Dynamic import ensures mock code is fully tree-shaken from production builds.
if (import.meta.env.VITE_DEV_PREVIEW === 'true') {
  import('./dev/devPreview').then(m => m.installMockApi())
}

// Lazy-loaded pages
const Landing = lazy(() => import('@/components/landing/LandingPage'))
const Login = lazy(() => import('@/pages/Login'))
const Register = lazy(() => import('@/pages/Register'))
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'))
const ResetPassword = lazy(() => import('@/pages/ResetPassword'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const StrategySelectPage = lazy(() => import('@/pages/analyze/StrategySelectPage'))
const AnalyzePage = lazy(() => import('@/pages/analyze/AnalyzePage'))
const AnalyzerFormPage = lazy(() => import('@/pages/analyze/AnalyzerFormPage'))
const ResultsPage = lazy(() => import('@/pages/analyze/ResultsPage'))
const AnalysisResultsPage = lazy(() => import('@/pages/analyze/AnalysisResultsPage'))
const MyDeals = lazy(() => import('@/pages/MyDeals'))
const Pipeline = lazy(() => import('@/pages/Pipeline'))
const Portfolio = lazy(() => import('@/pages/portfolio/PortfolioPage'))
const Documents = lazy(() => import('@/pages/documents/DocumentsPage'))
const Chat = lazy(() => import('@/pages/chat/ChatPage'))
const Settings = lazy(() => import('@/pages/settings/SettingsPage'))
const PricingPage = lazy(() => import('@/pages/PricingPage'))
const ShareDeal = lazy(() => import('@/pages/share/ShareDealPage'))
const ComparePage = lazy(() => import('@/pages/compare/ComparePage'))
const Onboarding = lazy(() => import('@/pages/OnboardingPage'))
const TodayPage = lazy(() => import('@/pages/TodayPage'))
const PropertiesListPage = lazy(() => import('@/pages/properties/PropertiesListPage'))
const PropertyDetailPage = lazy(() => import('@/pages/properties/PropertyDetailPage'))
const ContactsListPage = lazy(() => import('@/pages/contacts/ContactsListPage'))
const ContactDetailPage = lazy(() => import('@/pages/contacts/ContactDetailPage'))
const TransactionsPage = lazy(() => import('@/pages/transactions/TransactionsPage'))
const ReportsListPage = lazy(() => import('@/pages/reports/ReportsListPage'))
const SharedReportPage = lazy(() => import('@/pages/reports/SharedReportPage'))
const LockedFeaturePage = lazy(() => import('@/pages/LockedFeaturePage'))
const ObligationsPage = lazy(() => import('@/pages/financing/ObligationsPage'))
const FinancingDashboardPage = lazy(() => import('@/pages/financing/FinancingDashboardPage'))
const RehabsPage = lazy(() => import('@/pages/rehab/RehabsPage'))
const RehabDetailPage = lazy(() => import('@/pages/rehab/RehabDetailPage'))
const BuyersListPage = lazy(() => import('@/pages/buyers/BuyersListPage'))
const BuyerDetailPage = lazy(() => import('@/pages/buyers/BuyerDetailPage'))
const MatchResultsPage = lazy(() => import('@/pages/dispositions/MatchResultsPage'))
const SharedPacketPage = lazy(() => import('@/pages/dispositions/SharedPacketPage'))
const SequencesListPage = lazy(() => import('@/pages/sequences/SequencesListPage'))
const SequenceBuilderPage = lazy(() => import('@/pages/sequences/SequenceBuilderPage'))
const SkipTracingPage = lazy(() => import('@/pages/skip-tracing/SkipTracingPage'))
const BatchSkipTracePage = lazy(() => import('@/pages/skip-tracing/BatchSkipTracePage'))
const MailCampaignsPage = lazy(() => import('@/pages/mail/MailCampaignsPage'))
const CampaignBuilderPage = lazy(() => import('@/pages/mail/CampaignBuilderPage'))
const CampaignAnalyticsPage = lazy(() => import('@/pages/mail/CampaignAnalyticsPage'))
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

/** Fetches onboarding status when the user is authenticated (Clerk session synced). */
function useSessionValidation() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const fetchOnboardingStatus = useOnboardingStore((s) => s.fetchStatus)
  const onboardingFetched = useOnboardingStore((s) => s.fetched)

  useEffect(() => {
    if (isAuthenticated && !onboardingFetched) {
      fetchOnboardingStatus()
    }
  }, [isAuthenticated, onboardingFetched, fetchOnboardingStatus])
}

/** Redirects unauthenticated users to /login. Redirects to /onboarding if not completed. */
function ProtectedRoute({ children, skipOnboarding }: { children: React.ReactNode; skipOnboarding?: boolean }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const onboardingCompleted = useOnboardingStore((s) => s.completed)
  const onboardingFetched = useOnboardingStore((s) => s.fetched)

  if (!isAuthenticated) return <Navigate to="/login" replace />

  // Wait for onboarding status to load before redirecting
  if (!skipOnboarding && onboardingFetched && !onboardingCompleted) {
    return <Navigate to="/onboarding" replace />
  }

  return <>{children}</>
}

/** Redirects authenticated users to /dashboard (prevents accessing login/register when logged in). */
function GuestRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (isAuthenticated) return <Navigate to="/today" replace />
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
        <Route path="/reports/view/:shareToken" element={<SharedReportPage />} />
        <Route path="/packets/view/:shareToken" element={<SharedPacketPage />} />

        {/* Onboarding — protected but skips the onboarding guard */}
        <Route path="/onboarding" element={<ProtectedRoute skipOnboarding><Onboarding /></ProtectedRoute>} />

        {/* Protected app routes — AppShell handles page transitions via AnimatePresence */}
        <Route path="/dashboard" element={<ProtectedRoute><PageErrorBoundary><Dashboard /></PageErrorBoundary></ProtectedRoute>} />
        <Route path="/analyze" element={<ProtectedRoute><PageErrorBoundary><AnalyzePage /></PageErrorBoundary></ProtectedRoute>} />
        <Route path="/analyze/strategies" element={<ProtectedRoute><PageErrorBoundary><StrategySelectPage /></PageErrorBoundary></ProtectedRoute>} />
        <Route path="/analyze/results/:propertyId" element={<ProtectedRoute><PageErrorBoundary><AnalysisResultsPage /></PageErrorBoundary></ProtectedRoute>} />
        <Route path="/analyze/deal/:dealId" element={<ProtectedRoute><PageErrorBoundary><ResultsPage /></PageErrorBoundary></ProtectedRoute>} />
        <Route path="/analyze/:strategy" element={<ProtectedRoute><PageErrorBoundary><AnalyzerFormPage /></PageErrorBoundary></ProtectedRoute>} />
        <Route path="/deals" element={<ProtectedRoute><PageErrorBoundary><MyDeals /></PageErrorBoundary></ProtectedRoute>} />
        <Route path="/compare" element={<ProtectedRoute><PageErrorBoundary><ComparePage /></PageErrorBoundary></ProtectedRoute>} />
        <Route path="/pipeline" element={<ProtectedRoute><PageErrorBoundary><Pipeline /></PageErrorBoundary></ProtectedRoute>} />
        <Route path="/portfolio" element={<ProtectedRoute><PageErrorBoundary><Portfolio /></PageErrorBoundary></ProtectedRoute>} />
        <Route path="/documents" element={<ProtectedRoute><PageErrorBoundary><Documents /></PageErrorBoundary></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><PageErrorBoundary><Chat /></PageErrorBoundary></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><PageErrorBoundary><Settings /></PageErrorBoundary></ProtectedRoute>} />
        <Route path="/pricing" element={<ProtectedRoute><PageErrorBoundary><PricingPage /></PageErrorBoundary></ProtectedRoute>} />
        <Route path="/today" element={<ProtectedRoute><PageErrorBoundary><TodayPage /></PageErrorBoundary></ProtectedRoute>} />
        <Route path="/properties" element={<ProtectedRoute><PageErrorBoundary><PropertiesListPage /></PageErrorBoundary></ProtectedRoute>} />
        <Route path="/properties/:propertyId" element={<ProtectedRoute><PageErrorBoundary><PropertyDetailPage /></PageErrorBoundary></ProtectedRoute>} />
        <Route path="/contacts" element={<ProtectedRoute><PageErrorBoundary><ContactsListPage /></PageErrorBoundary></ProtectedRoute>} />
        <Route path="/contacts/:contactId" element={<ProtectedRoute><PageErrorBoundary><ContactDetailPage /></PageErrorBoundary></ProtectedRoute>} />
        <Route path="/transactions" element={<ProtectedRoute><PageErrorBoundary><TransactionsPage /></PageErrorBoundary></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><PageErrorBoundary><ReportsListPage /></PageErrorBoundary></ProtectedRoute>} />
        <Route path="/obligations" element={<ProtectedRoute><PageErrorBoundary><ObligationsPage /></PageErrorBoundary></ProtectedRoute>} />
        <Route path="/financing" element={<ProtectedRoute><PageErrorBoundary><FinancingDashboardPage /></PageErrorBoundary></ProtectedRoute>} />
        <Route path="/rehabs" element={<ProtectedRoute><PageErrorBoundary><RehabsPage /></PageErrorBoundary></ProtectedRoute>} />
        <Route path="/rehabs/:projectId" element={<ProtectedRoute><PageErrorBoundary><RehabDetailPage /></PageErrorBoundary></ProtectedRoute>} />
        <Route path="/buyers" element={<ProtectedRoute><PageErrorBoundary><BuyersListPage /></PageErrorBoundary></ProtectedRoute>} />
        <Route path="/buyers/:contactId" element={<ProtectedRoute><PageErrorBoundary><BuyerDetailPage /></PageErrorBoundary></ProtectedRoute>} />
        <Route path="/dispositions/matches/:propertyId" element={<ProtectedRoute><PageErrorBoundary><MatchResultsPage /></PageErrorBoundary></ProtectedRoute>} />

        {/* Locked feature routes — show upgrade prompt instead of 404 */}
        <Route path="/sequences" element={<ProtectedRoute><PageErrorBoundary><SequencesListPage /></PageErrorBoundary></ProtectedRoute>} />
        <Route path="/sequences/new" element={<ProtectedRoute><PageErrorBoundary><SequenceBuilderPage /></PageErrorBoundary></ProtectedRoute>} />
        <Route path="/sequences/:id" element={<ProtectedRoute><PageErrorBoundary><SequenceBuilderPage /></PageErrorBoundary></ProtectedRoute>} />
        <Route path="/skip-tracing" element={<ProtectedRoute><PageErrorBoundary><SkipTracingPage /></PageErrorBoundary></ProtectedRoute>} />
        <Route path="/skip-tracing/batch" element={<ProtectedRoute><PageErrorBoundary><BatchSkipTracePage /></PageErrorBoundary></ProtectedRoute>} />
        <Route path="/mail-campaigns" element={<ProtectedRoute><PageErrorBoundary><MailCampaignsPage /></PageErrorBoundary></ProtectedRoute>} />
        <Route path="/mail-campaigns/new" element={<ProtectedRoute><PageErrorBoundary><CampaignBuilderPage /></PageErrorBoundary></ProtectedRoute>} />
        <Route path="/mail-campaigns/:id" element={<ProtectedRoute><PageErrorBoundary><CampaignBuilderPage /></PageErrorBoundary></ProtectedRoute>} />
        <Route path="/mail-campaigns/:id/analytics" element={<ProtectedRoute><PageErrorBoundary><CampaignAnalyticsPage /></PageErrorBoundary></ProtectedRoute>} />
        <Route path="/d4d" element={<ProtectedRoute><LockedFeaturePage /></ProtectedRoute>} />
        <Route path="/compliance" element={<ProtectedRoute><LockedFeaturePage /></ProtectedRoute>} />

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
      <ClerkProviderWrapper>
        <QueryClientProvider client={queryClient}>
          <AuthSyncProvider>
            <BrowserRouter>
              <AnimatedRoutes />
              <Toaster />
            </BrowserRouter>
          </AuthSyncProvider>
        </QueryClientProvider>
      </ClerkProviderWrapper>
    </ErrorBoundary>
  )
}
