import { useMemo } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { motion } from 'framer-motion'
import { Calendar, FileText, GripVertical, MessageSquare, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { Card } from '../ui/Card'
import { StatusBadge } from './StatusBadge'
import type { JobApplication } from '../../types/application.types'

interface ApplicationCardProps {
  application: JobApplication
  onNotes?: (app: JobApplication) => void
  onInterview?: (app: JobApplication) => void
  onCoverLetter?: (app: JobApplication) => void
  onDelete?: (app: JobApplication) => void
}

function daysBetween(iso: string | null | undefined): number | null {
  if (!iso) return null
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return null
  return Math.max(0, Math.floor((Date.now() - t) / 86400000))
}

function priorityDot(priority: JobApplication['priority']): string {
  if (priority === 'high') return 'bg-rose-500'
  if (priority === 'low') return 'bg-slate-400'
  return 'bg-amber-400'
}

export function ApplicationCard({
  application,
  onNotes,
  onInterview,
  onCoverLetter,
  onDelete,
}: ApplicationCardProps) {
  const dragId = `application-${application.id}`
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dragId,
    data: { application },
  })

  const style = transform
    ? {
        transform: CSS.Transform.toString(transform),
        zIndex: isDragging ? 50 : undefined,
      }
    : undefined

  const appliedDays = useMemo(
    () => daysBetween(application.appliedDate ?? application.createdAt ?? null),
    [application.appliedDate, application.createdAt]
  )

  const appliedBadgeClass =
    appliedDays == null
      ? 'bg-slate-100 text-slate-600'
      : appliedDays <= 7
        ? 'bg-emerald-100 text-emerald-800'
        : appliedDays <= 14
          ? 'bg-amber-100 text-amber-900'
          : 'bg-rose-100 text-rose-900'

  const lastNote = application.notes?.length
    ? application.notes[application.notes.length - 1]?.text
    : undefined

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx(isDragging && 'opacity-95')}
    >
      <Card className="group relative flex gap-1 rounded-xl border-border bg-card p-3 pr-4 transition-shadow hover:scale-[1.02] hover:shadow-glow">
        <button
          type="button"
          className="mt-1 flex shrink-0 cursor-grab touch-none flex-col items-center rounded-md px-0.5 text-text-muted hover:bg-surface-elevated hover:text-text-primary active:cursor-grabbing"
          aria-label="Drag to move"
          {...listeners}
          {...attributes}
        >
          <GripVertical className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start gap-2">
            <span
              className={clsx(
                'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                priorityDot(application.priority)
              )}
              title={`Priority: ${application.priority}`}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-extrabold text-text-primary">
                {application.companyName}
              </p>
              <p className="truncate text-sm text-text-secondary">{application.jobTitle}</p>
            </div>
            {typeof application.matchScore === 'number' ? (
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-primary-light text-xs font-bold text-primary"
                title="Match score"
              >
                {Math.round(application.matchScore)}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={application.status} />
            {appliedDays != null ? (
              <span
                className={clsx(
                  'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                  appliedBadgeClass
                )}
              >
                {appliedDays}d since applied
              </span>
            ) : null}
          </div>

          {lastNote ? (
            <p className="line-clamp-2 text-xs text-text-muted">{lastNote}</p>
          ) : null}

          <div className="flex justify-end gap-1 pt-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
            <button
              type="button"
              className="rounded-md p-1.5 text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
              title="Notes"
              onClick={() => onNotes?.(application)}
            >
              <MessageSquare className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded-md p-1.5 text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
              title="Interview"
              onClick={() => onInterview?.(application)}
            >
              <Calendar className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded-md p-1.5 text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
              title="JD / cover"
              onClick={() => onCoverLetter?.(application)}
            >
              <FileText className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded-md p-1.5 text-danger hover:bg-danger/10"
              title="Archive"
              onClick={() => onDelete?.(application)}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
