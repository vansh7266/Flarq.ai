import { lazy, Suspense } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from './hooks/useAuth'
import { Spinner } from './components/ui/Spinner'

// Lazy-loaded pages for code splitting (reduces initial bundle by ~600KB)
const LandingPage = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })))
const AuthPage = lazy(() => import('./pages/AuthPage').then(m => ({ default: m.AuthPage })))
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })))
const AnalyzePage = lazy(() => import('./pages/AnalyzePage').then(m => ({ default: m.AnalyzePage })))
const ApplicationsPage = lazy(() => import('./pages/ApplicationsPage').then(m => ({ default: m.ApplicationsPage })))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })))
const AgentPage = lazy(() => import('./pages/AgentPage').then(m => ({ default: m.AgentPage })))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage').then(m => ({ default: m.PrivacyPage })))
const TermsPage = lazy(() => import('./pages/TermsPage').then(m => ({ default: m.TermsPage })))

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <Spinner className="h-10 w-10" />
        <p className="text-sm text-text-muted">Loading...</p>
      </div>
    </div>
  )
}

function ProtectedLayout() {
  const { isAuthenticated, isHydrated } = useAuth()
  const location = useLocation()

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner className="h-10 w-10" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="min-h-screen"
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/analyze" element={<AnalyzePage />} />
          <Route path="/applications" element={<ApplicationsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/agent" element={<AgentPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
