import { Card } from '../ui/Card'

interface InsightCardProps {
  title: string
  description: string
  metric?: string
}

export function InsightCard({ title, description, metric }: InsightCardProps) {
  return (
    <Card className="space-y-2">
      {metric ? (
        <p className="text-2xl font-semibold tracking-tight text-primary">{metric}</p>
      ) : null}
      <p className="text-sm font-semibold text-text-primary">{title}</p>
      <p className="text-sm text-text-secondary">{description}</p>
    </Card>
  )
}
