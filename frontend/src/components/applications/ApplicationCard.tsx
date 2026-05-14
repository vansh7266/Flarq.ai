import { Card } from '../ui/Card'
import type { JobApplication } from '../../types/application.types'
import { StatusBadge } from './StatusBadge'

interface ApplicationCardProps {
  application: JobApplication
}

export function ApplicationCard({ application }: ApplicationCardProps) {
  return (
    <Card className="space-y-2 border-border/80 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-text-primary">
            {application.roleTitle}
          </p>
          <p className="text-xs text-text-secondary">{application.company}</p>
        </div>
        <StatusBadge status={application.status} />
      </div>
      {application.notes ? (
        <p className="text-xs text-text-muted line-clamp-3">{application.notes}</p>
      ) : null}
    </Card>
  )
}
