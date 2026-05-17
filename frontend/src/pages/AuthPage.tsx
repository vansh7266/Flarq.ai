import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { LoginForm } from '../components/auth/LoginForm'
import { SignupForm } from '../components/auth/SignupForm'
import { GoogleOAuthButton } from '../components/GoogleOAuthButton'
import { FlarqOrb } from '../components/ui/FlarqOrb'
import { useAuth } from '../hooks/useAuth'
import { usePageTitle } from '../hooks/usePageTitle'
import * as authService from '../services/authService'
import { useAuthStore } from '../store/authStore'
import type { LoginFormValues, SignupFormValues } from '../utils/validators'

type AuthMode = 'login' | 'signup'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

export function AuthPage() {
  usePageTitle('Auth')
  const [searchParams, setSearchParams] = useSearchParams()
  const { login, register, isLoggingIn, isRegistering, isAuthenticated, isHydrated } = useAuth()
  const setSession = useAuthStore((s) => s.setSession)

  const mode: AuthMode = searchParams.get('mode') === 'signup' ? 'signup' : 'login'
  const setMode = (next: AuthMode) => {
    setSearchParams(next === 'signup' ? { mode: 'signup' } : {})
  }

  const handleGoogleSuccess = async (credential: string) => {
    try {
      const result = await authService.googleAuth(credential)
      setSession(result)
    } catch {
      // Error is handled by the API interceptor / toast
    }
  }

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mesh">
        <FlarqOrb state="thinking" />
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  const authForm = (
    <main className="grid min-h-screen bg-void text-text lg:grid-cols-2">
      <section className="bg-mesh hidden items-center justify-center border-r border-border p-10 lg:flex">
        <div className="max-w-md text-center">
          <FlarqOrb size={96} state="idle" className="mx-auto" />
          <h1 className="mt-8 font-display text-4xl font-bold text-gradient">
            Your AI career strategist
          </h1>
          <div className="mt-8 space-y-4 text-left">
            {[
              'Instant role fit analysis',
              'Tailored cover letters in your voice',
              'Pipeline analytics and follow-up intelligence',
            ].map((item) => (
              <p key={item} className="flex items-center gap-3 text-text-secondary">
                <CheckCircle2 className="h-5 w-5 text-emerald" />
                {item}
              </p>
            ))}
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center bg-void px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8">
          <Link to="/" className="mx-auto mb-6 flex w-fit items-center gap-3">
            <img src="/logo.svg" alt="Flarq" className="h-10 w-auto brightness-125" />
            <span className="font-display font-semibold tracking-[0.2em] text-gradient">FLARQ</span>
          </Link>

          <div className="mb-6 grid grid-cols-2 rounded-xl bg-surface p-1">
            {(['login', 'signup'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setMode(tab)}
                className={`relative rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  mode === tab ? 'text-text' : 'text-muted hover:text-primary'
                }`}
              >
                {mode === tab ? (
                  <motion.span
                    layoutId="auth-tab"
                    className="absolute inset-0 rounded-lg bg-card shadow-sm"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                ) : null}
                <span className="relative z-10">{tab === 'login' ? 'Sign in' : 'Create account'}</span>
              </button>
            ))}
          </div>

          {/* Google OAuth Button */}
          {GOOGLE_CLIENT_ID && (
            <>
              <div className="flex items-center justify-center">
                <GoogleOAuthButton
                  onSuccess={handleGoogleSuccess}
                  onError={() => {
                    // Google OAuth error — silent fail, user can still use email/password
                  }}
                />
              </div>

              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-medium text-muted">or continue with email</span>
                <div className="h-px flex-1 bg-border" />
              </div>
            </>
          )}

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
                    await login({ email: values.email, password: values.password })
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

          <p className="mt-6 text-center text-xs leading-5 text-muted">
            By continuing you agree to our Terms of Service
          </p>
        </div>
      </section>
    </main>
  )

  // Wrap with GoogleOAuthProvider only if client ID is configured
  if (GOOGLE_CLIENT_ID) {
    return (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        {authForm}
      </GoogleOAuthProvider>
    )
  }

  return authForm
}
