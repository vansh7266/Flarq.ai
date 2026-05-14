import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import * as applicationService from '../services/applicationService'
import { useAuth } from '../hooks/useAuth'

export function DashboardPage() {
  const { isAuthenticated } = useAuth()
  const stale = useQuery({
    queryKey: ['stale-apps'],
    queryFn: applicationService.fetchStaleApplications,
    enabled: isAuthenticated,
  })

  return (
    <PageWrapper>
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">Mission control</h1>
          <p className="max-w-2xl text-text-secondary">
            FLARQ Phase 3 — applications Kanban, MongoDB-backed analytics, and a Gemini agent that can read your
            real pipeline data and draft follow-ups.
          </p>
        </div>

        <Card className="space-y-3 border-amber-500/25 bg-amber-500/5 p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-text-primary">Follow-up radar</p>
            {stale.isLoading ? <Spinner className="h-5 w-5" /> : null}
          </div>
          {stale.data && stale.data.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-text-secondary">
                {stale.data.length} application{stale.data.length === 1 ? '' : 's'} quiet for 7+ days in active
                stages.
              </p>
              <ul className="space-y-1 text-sm text-text-primary">
                {stale.data.slice(0, 4).map((s) => (
                  <li key={s.applicationId}>
                    {s.companyName} — {s.jobTitle}{' '}
                    <span className="text-text-muted">({s.daysSinceUpdate}d)</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                <Link to="/applications">
                  <Button type="button" variant="secondary" className="text-xs">
                    Open Kanban
                  </Button>
                </Link>
                <Link to="/agent">
                  <Button type="button" className="text-xs">
                    Ask FLARQ agent
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <p className="text-sm text-text-secondary">No stale applications detected. Keep the momentum.</p>
          )}
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="space-y-3">
            <p className="text-sm font-semibold text-text-primary">Profile & resume</p>
            <p className="text-sm text-text-secondary">
              Upload once, parse with Gemini, and keep structured skills synchronized.
            </p>
            <Link to="/profile">
              <Button type="button" variant="secondary" className="w-full">
                Open profile
              </Button>
            </Link>
          </Card>
          <Card className="space-y-3">
            <p className="text-sm font-semibold text-text-primary">Role intelligence</p>
            <p className="text-sm text-text-secondary">
              Paste any JD, extract requirements, gap-fit, and tailored cover letters.
            </p>
            <Link to="/analyze">
              <Button type="button" variant="secondary" className="w-full">
                Analyze a role
              </Button>
            </Link>
          </Card>
          <Card className="space-y-3">
            <p className="text-sm font-semibold text-text-primary">Applications</p>
            <p className="text-sm text-text-secondary">
              Drag-and-drop Kanban with MongoDB-backed status history.
            </p>
            <Link to="/applications">
              <Button type="button" variant="secondary" className="w-full">
                View board
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </PageWrapper>
  )
}
