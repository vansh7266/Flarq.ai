import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { LoginForm } from '../components/auth/LoginForm'
import { SignupForm } from '../components/auth/SignupForm'
import { useAuth } from '../hooks/useAuth'
import { usePageTitle } from '../hooks/usePageTitle'
import type { LoginFormValues, SignupFormValues } from '../utils/validators'

type AuthMode = 'login' | 'signup'

export function AuthPage() {
  usePageTitle('Auth')
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
      <div className="mesh-bg flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <main className="mesh-bg flex min-h-screen items-center justify-center px-4 py-10">
      <section className="gradient-border w-full max-w-md rounded-2xl bg-white p-6 shadow-soft sm:p-8">
        <Link to="/" className="mx-auto mb-6 flex w-fit justify-center">
          <img src="/logo.svg" alt="Flarq" className="h-10 w-auto" />
        </Link>

        <div className="mb-6 grid grid-cols-2 rounded-xl bg-surface p-1">
          {(['login', 'signup'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setMode(tab)}
              className={`relative rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                mode === tab ? 'text-primary' : 'text-text-secondary hover:text-primary'
              }`}
            >
              {mode === tab ? (
                <motion.span
                  layoutId="auth-tab"
                  className="absolute inset-0 rounded-lg bg-white shadow-sm"
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

        <p className="mt-6 text-center text-xs leading-5 text-text-muted">
          By continuing you agree to our Terms of Service
        </p>
      </section>
    </main>
  )
}
