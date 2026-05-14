import { useDroppable } from '@dnd-kit/core'
import clsx from 'clsx'
import { motion } from 'framer-motion'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import type { JobApplication } from '../../types/application.types'
import { ApplicationCard } from './ApplicationCard'

interface KanbanColumnProps {
  columnId: string
  title: string
  borderClass: string
  applications: JobApplication[]
  onAdd?: () => void
  onNotes: (app: JobApplication) => void
  onInterview: (app: JobApplication) => void
  onCoverLetter: (app: JobApplication) => void
  onDelete: (app: JobApplication) => void
}

export function KanbanColumn({
  columnId,
  title,
  borderClass,
  applications,
  onAdd,
  onNotes,
  onInterview,
  onCoverLetter,
  onDelete,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `column-${columnId}` })

  return (
    <div ref={setNodeRef} className="flex min-w-[220px] max-w-[320px] flex-1 flex-col">
      <Card
        className={clsx(
          'flex max-h-[calc(100vh-220px)] flex-1 flex-col border-t-4 bg-surface p-3 shadow-sm transition-colors',
          borderClass,
          isOver && 'ring-2 ring-primary/40'
        )}
      >
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-text-primary">{title}</p>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-text-muted">
          {applications.length}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto pr-1">
        {applications.map((app, index) => (
          <motion.div
            key={app.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
          >
            <ApplicationCard
              application={app}
              onNotes={onNotes}
              onInterview={onInterview}
              onCoverLetter={onCoverLetter}
              onDelete={onDelete}
            />
          </motion.div>
        ))}
      </div>
      {applications.length === 0 ? (
        <div className="flex min-h-28 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-white text-center text-xs text-text-muted">
          Drop cards here
        </div>
      ) : null}
      {onAdd ? (
        <Button type="button" variant="ghost" className="mt-3 w-full text-xs" onClick={onAdd}>
          + Add
        </Button>
      ) : null}
      </Card>
    </div>
  )
}
