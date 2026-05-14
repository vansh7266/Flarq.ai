import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.tsx'
import { useAuthStore } from './store/authStore'
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from './utils/constants'

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
        <Suspense
          fallback={
            <div className="flex min-h-screen items-center justify-center bg-background">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
            </div>
          }
        >
          <App />
        </Suspense>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1a1a24',
              color: '#f1f5f9',
              border: '1px solid #2a2a3a',
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
)
