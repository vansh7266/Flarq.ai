import { Link } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'

export function DashboardPage() {
  return (
    <PageWrapper>
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">
            Mission control
          </h1>
          <p className="max-w-2xl text-text-secondary">
            Your personalized cockpit for resumes, roles, applications, and agent-driven
            insights. Phase 1 wires authentication, routing, and API foundations — Gemini
            and MongoDB MCP intelligence land in Phase 2.
          </p>
        </div>

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
              Paste any JD, extract requirements, and close gaps before you hit submit.
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
              Kanban tracking with proactive follow-ups powered by MongoDB aggregations.
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
