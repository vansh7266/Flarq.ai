import { Card } from '../ui/Card'
import type { JobApplication } from '../../types/application.types'
import { ApplicationCard } from './ApplicationCard'

interface KanbanBoardProps {
  applications: JobApplication[]
}

const columns: Array<{ id: JobApplication['status']; title: string }> = [
  { id: 'saved', title: 'Saved' },
  { id: 'applied', title: 'Applied' },
  { id: 'interviewing', title: 'Interviewing' },
  { id: 'offer', title: 'Offer' },
]

export function KanbanBoard({ applications }: KanbanBoardProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {columns.map((column) => (
        <Card key={column.id} className="space-y-3 bg-surface/60 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-text-primary">{column.title}</p>
            <span className="text-xs text-text-muted">
              {applications.filter((item) => item.status === column.id).length}
            </span>
          </div>
          <div className="space-y-3">
            {applications
              .filter((item) => item.status === column.id)
              .map((item) => (
                <ApplicationCard key={item.id} application={item} />
              ))}
          </div>
        </Card>
      ))}
    </div>
  )
}
