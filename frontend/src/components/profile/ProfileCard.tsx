import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'

interface ProfileCardProps {
  fullName: string
  email: string
  headline?: string
}

export function ProfileCard({ fullName, email, headline }: ProfileCardProps) {
  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold tracking-tight text-text-primary">
            {fullName}
          </p>
          <p className="text-sm text-text-secondary">{email}</p>
        </div>
        <Badge variant="success">Verified</Badge>
      </div>
      {headline ? (
        <p className="text-sm text-text-secondary">{headline}</p>
      ) : (
        <p className="text-sm text-text-muted">
          Add a headline and summary once profile editing ships in Phase 2.
        </p>
      )}
    </Card>
  )
}
