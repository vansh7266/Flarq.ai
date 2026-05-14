import { PageWrapper } from '../components/layout/PageWrapper'
import { KanbanBoard } from '../components/applications/KanbanBoard'
import { useApplications } from '../hooks/useApplications'
import { useAuth } from '../hooks/useAuth'
import { Spinner } from '../components/ui/Spinner'

export function ApplicationsPage() {
  const { isAuthenticated } = useAuth()
  const { data, isLoading, isError } = useApplications(isAuthenticated)

  return (
    <PageWrapper>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">
            Applications
          </h1>
          <p className="mt-2 max-w-2xl text-text-secondary">
            Kanban-backed pipeline with MongoDB aggregations for velocity, bottlenecks, and
            stale threads.
          </p>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : isError ? (
          <p className="text-sm text-danger">
            Unable to load applications. Ensure the API is running and you are signed in.
          </p>
        ) : (
          <KanbanBoard applications={data ?? []} />
        )}
      </div>
    </PageWrapper>
  )
}
