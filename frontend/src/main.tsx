import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.tsx'
import { useAuthStore } from './store/authStore'
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from './utils/constants'
import { ErrorBoundary } from './components/ErrorBoundary'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

useAuthStore.persist?.onFinishHydration?.(() => {
  const state = useAuthStore.getState()
  if (state.accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, state.accessToken)
  }
  if (state.refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, state.refreshToken)
  }
  state.setHydrated(true)
})

// Fallback for Zustand v5
setTimeout(() => {
  if (!useAuthStore.getState().isHydrated) {
    useAuthStore.getState().setHydrated(true)
  }
}, 100)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorBoundary>
          <Suspense
            fallback={
              <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
              </div>
            }
          >
            <App />
          </Suspense>
        </ErrorBoundary>
        <Toaster
          position="top-right"
          toastOptions={{
            success: {
              style: {
                borderLeft: '4px solid #059669',
              },
            },
            error: {
              style: {
                borderLeft: '4px solid #dc2626',
              },
            },
            style: {
              background: '#ffffff',
              color: '#0f172a',
              border: '1px solid #e2e8f0',
              borderRadius: '0.75rem',
              boxShadow: '0 18px 50px -28px rgba(15, 23, 42, 0.28)',
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
)
