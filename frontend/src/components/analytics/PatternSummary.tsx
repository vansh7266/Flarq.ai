import { Card } from '../ui/Card'

interface PatternSummaryProps {
  summary?: string
}

export function PatternSummary({ summary }: PatternSummaryProps) {
  return (
    <Card>
      <p className="text-sm font-semibold text-text-primary">Application patterns</p>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">
        {summary ??
          'Company-level funnel insights, skill demand trends, and stale-application alerts will render here using MongoDB MCP-backed aggregations.'}
      </p>
    </Card>
  )
}
