import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { LandingPage } from './pages/LandingPage'
import { AuthPage } from './pages/AuthPage'
import { DashboardPage } from './pages/DashboardPage'
import { ProfilePage } from './pages/ProfilePage'
import { AnalyzePage } from './pages/AnalyzePage'
import { ApplicationsPage } from './pages/ApplicationsPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { AgentPage } from './pages/AgentPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { TermsPage } from './pages/TermsPage'
import { useAuth } from './hooks/useAuth'
import { Spinner } from './components/ui/Spinner'

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
  )
}
