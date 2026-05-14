import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { LoginForm } from '../components/auth/LoginForm'
import { SignupForm } from '../components/auth/SignupForm'
import { Card } from '../components/ui/Card'
import { useAuth } from '../hooks/useAuth'
import type { LoginFormValues, SignupFormValues } from '../utils/validators'

type AuthMode = 'login' | 'signup'

export function AuthPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { login, register, isLoggingIn, isRegistering, isAuthenticated, isHydrated } =
    useAuth()

  const mode: AuthMode = searchParams.get('mode') === 'signup' ? 'signup' : 'login'

  const setMode = (next: AuthMode) => {
    if (next === 'signup') {
      setSearchParams({ mode: 'signup' })
    } else {
      setSearchParams({})
    }
  }

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-4 py-12 lg:flex-row lg:items-center">
        <div className="flex-1 space-y-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            FLARQ
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
            Sign in to orchestrate your entire job search.
          </h1>
          <p className="max-w-xl text-text-secondary">
            Secure authentication, structured memory in MongoDB, and an agent that
            keeps every application, insight, and follow-up in sync.
          </p>
          <Link
            to="/"
            className="inline-flex text-sm font-medium text-primary hover:text-primary-hover"
          >
            ← Back to landing
          </Link>
        </div>

        <Card className="flex-1 max-w-md border-border/80 bg-surface/80 p-6 backdrop-blur">
          <div className="mb-6 flex rounded-lg bg-background/60 p-1">
            {(['login', 'signup'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setMode(tab)
                }}
                className={`relative flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  mode === tab
                    ? 'text-text-primary'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {mode === tab ? (
                  <motion.span
                    layoutId="auth-tab"
                    className="absolute inset-0 rounded-md bg-surface-elevated shadow-sm"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                ) : null}
                <span className="relative z-10">
                  {tab === 'login' ? 'Sign in' : 'Create account'}
                </span>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: mode === 'login' ? -8 : 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: mode === 'login' ? 8 : -8 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              {mode === 'login' ? (
                <LoginForm
                  isSubmitting={isLoggingIn}
                  onSubmit={async (values: LoginFormValues) => {
                    await login({
                      email: values.email,
                      password: values.password,
                    })
                  }}
                />
              ) : (
                <SignupForm
                  isSubmitting={isRegistering}
                  onSubmit={async (values: SignupFormValues) => {
                    await register({
                      email: values.email,
                      password: values.password,
                      fullName: values.fullName,
                    })
                  }}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </Card>
      </div>
    </div>
  )
}
