import { Component, type ReactNode } from 'react'
import { Button } from './ui/Button'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch() {
    // Keep stack traces out of the UI; runtime logs can still be collected by the host.
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="mesh-bg flex min-h-screen items-center justify-center px-4">
          <section className="gradient-border w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-soft">
            <h1 className="text-xl font-extrabold text-text-primary">
              Something went wrong
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              Flarq hit an unexpected issue while loading this view.
            </p>
            <Button
              type="button"
              className="mt-6 h-12 w-full"
              onClick={() => window.location.reload()}
            >
              Refresh page
            </Button>
          </section>
        </main>
      )
    }

    return this.props.children
  }
}
