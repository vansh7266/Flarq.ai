import { PageWrapper } from '../components/layout/PageWrapper'
import { InsightCard } from '../components/analytics/InsightCard'
import { ResponseRateChart } from '../components/analytics/ResponseRateChart'
import { PatternSummary } from '../components/analytics/PatternSummary'

export function AnalyticsPage() {
  return (
    <PageWrapper>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">Analytics</h1>
          <p className="mt-2 max-w-2xl text-text-secondary">
            Response curves, company patterns, and skill demand — all backed by MongoDB
            aggregation pipelines and MCP-powered introspection.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <InsightCard
            title="Interview rate"
            description="Share of applications that advanced to phone or onsite stages."
            metric="—"
          />
          <InsightCard
            title="Average time-to-response"
            description="Median days from application submitted to first recruiter touch."
            metric="—"
          />
          <InsightCard
            title="Stale applications"
            description="Roles with no movement beyond your follow-up SLA."
            metric="—"
          />
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <ResponseRateChart />
          <PatternSummary />
        </div>
      </div>
    </PageWrapper>
  )
}
