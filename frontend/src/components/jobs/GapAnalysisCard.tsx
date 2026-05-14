import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'

interface GapRow {
  skill: string
  match: 'strong' | 'partial' | 'missing'
}

interface GapAnalysisCardProps {
  rows?: GapRow[]
}

const variantForMatch: Record<GapRow['match'], 'success' | 'warning' | 'danger'> = {
  strong: 'success',
  partial: 'warning',
  missing: 'danger',
}

export function GapAnalysisCard({ rows }: GapAnalysisCardProps) {
  if (!rows || rows.length === 0) {
    return (
      <Card>
        <p className="text-sm font-semibold text-text-primary">Gap analysis</p>
        <p className="mt-2 text-sm text-text-secondary">
          Run an analysis to see how your profile stacks up against this role.
        </p>
      </Card>
    )
  }

  return (
    <Card className="space-y-3">
      <p className="text-sm font-semibold text-text-primary">Gap analysis</p>
      <div className="space-y-2">
        {rows.map((row) => (
          <div
            key={row.skill}
            className="flex items-center justify-between rounded-lg border border-border bg-background/60 px-3 py-2"
          >
            <span className="text-sm text-text-primary">{row.skill}</span>
            <Badge variant={variantForMatch[row.match]}>{row.match}</Badge>
          </div>
        ))}
      </div>
    </Card>
  )
}
