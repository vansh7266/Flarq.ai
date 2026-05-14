import {
  DndContext,
  PointerSensor,
  type DragEndEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { KanbanColumn } from './KanbanColumn'
import { Card } from '../ui/Card'
import type { JobApplication } from '../../types/application.types'

const MAIN_COLUMNS: { id: string; title: string; border: string }[] = [
  { id: 'saved', title: 'Saved', border: 'border-l-slate-400' },
  { id: 'applied', title: 'Applied', border: 'border-l-sky-500' },
  { id: 'phone_screen', title: 'Phone Screen', border: 'border-l-violet-500' },
  { id: 'interview', title: 'Interview', border: 'border-l-indigo-500' },
  { id: 'offer', title: 'Offer', border: 'border-l-emerald-500' },
]

const OUTCOME_COLUMNS: { id: string; title: string; border: string }[] = [
  { id: 'accepted', title: 'Accepted', border: 'border-l-emerald-600' },
  { id: 'rejected', title: 'Rejected', border: 'border-l-rose-500' },
  { id: 'ghosted', title: 'Ghosted', border: 'border-l-slate-500' },
]

interface KanbanBoardProps {
  grouped: Record<string, JobApplication[]>
  onStatusChange: (applicationId: string, newStatus: string) => Promise<void>
  onAdd?: (status?: string) => void
  onNotes: (app: JobApplication) => void
  onInterview: (app: JobApplication) => void
  onCoverLetter: (app: JobApplication) => void
  onDelete: (app: JobApplication) => void
}

export function KanbanBoard({
  grouped,
  onStatusChange,
  onAdd,
  onNotes,
  onInterview,
  onCoverLetter,
  onDelete,
}: KanbanBoardProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 10 },
    })
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return
    const activeId = String(active.id)
    const overId = String(over.id)
    if (!activeId.startsWith('application-')) return
    if (!overId.startsWith('column-')) return
    const appId = activeId.replace('application-', '')
    const newStatus = overId.replace('column-', '')
    const prev = (active.data.current as { application?: JobApplication } | undefined)?.application
    if (prev && prev.status === newStatus) return
    await onStatusChange(appId, newStatus)
  }

  return (
    <DndContext sensors={sensors} onDragEnd={(e) => void handleDragEnd(e)}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {MAIN_COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            columnId={col.id}
            title={col.title}
            borderClass={col.border}
            applications={grouped[col.id] ?? []}
            onAdd={() => onAdd?.(col.id)}
            onNotes={onNotes}
            onInterview={onInterview}
            onCoverLetter={onCoverLetter}
            onDelete={onDelete}
          />
        ))}

        <Card className="flex min-w-[720px] gap-2 border border-dashed border-border/70 bg-background/30 p-2">
          <div className="flex w-24 shrink-0 flex-col justify-center">
            <p className="rotate-180 text-xs font-bold uppercase tracking-widest text-text-muted [writing-mode:vertical-rl]">
              Outcomes
            </p>
          </div>
          <div className="flex min-w-0 flex-1 gap-2">
            {OUTCOME_COLUMNS.map((col) => (
              <KanbanColumn
                key={col.id}
                columnId={col.id}
                title={col.title}
                borderClass={col.border}
                applications={grouped[col.id] ?? []}
                onNotes={onNotes}
                onInterview={onInterview}
                onCoverLetter={onCoverLetter}
                onDelete={onDelete}
              />
            ))}
          </div>
        </Card>
      </div>
    </DndContext>
  )
}
