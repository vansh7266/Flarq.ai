import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Plus, RotateCcw, Search } from 'lucide-react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { KanbanBoard } from '../components/applications/KanbanBoard'
import { ApplicationsAddModal } from '../components/applications/ApplicationsAddModal'
import { useApplications } from '../hooks/useApplications'
import { useAuth } from '../hooks/useAuth'
import { Spinner } from '../components/ui/Spinner'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import * as applicationService from '../services/applicationService'
import { usePageTitle } from '../hooks/usePageTitle'
import type { ApplicationStatus, ApplicationsResponse, JobApplication } from '../types/application.types'
import { filterApplications, moveApplicationToStatus } from '../utils/applicationsKanban'

export function ApplicationsPage() {
  usePageTitle('Applications')
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data, isLoading, isError } = useApplications(isAuthenticated)

  const [search, setSearch] = useState('')
  const [priority, setPriority] = useState<'all' | JobApplication['priority']>('all')
  const [sort, setSort] = useState<'last_updated' | 'applied_date' | 'match_score'>('last_updated')
  const [addOpen, setAddOpen] = useState(false)
  const [addDefaultStatus, setAddDefaultStatus] = useState<string>('saved')

  const [noteOpen, setNoteOpen] = useState(false)
  const [noteApp, setNoteApp] = useState<JobApplication | null>(null)
  const [noteText, setNoteText] = useState('')

  const [interviewOpen, setInterviewOpen] = useState(false)
  const [interviewApp, setInterviewApp] = useState<JobApplication | null>(null)
  const [interviewWhen, setInterviewWhen] = useState('')

  const filtered = useMemo(() => {
    if (!data) return null
    return filterApplications(data, search, priority, sort)
  }, [data, search, priority, sort])

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ApplicationStatus }) =>
      applicationService.updateApplication(id, { status }),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ['applications'] })
      const prev = qc.getQueryData<ApplicationsResponse>(['applications'])
      if (prev) {
        qc.setQueryData(
          ['applications'],
          moveApplicationToStatus(prev, vars.id, vars.status)
        )
      }
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['applications'], ctx.prev)
      toast.error('Could not move card')
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['applications'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => applicationService.deleteApplication(id),
    onSuccess: () => {
      toast.success('Archived')
      void qc.invalidateQueries({ queryKey: ['applications'] })
    },
    onError: () => toast.error('Delete failed'),
  })

  const appendNoteMutation = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) =>
      applicationService.appendApplicationNote(id, text),
    onSuccess: () => {
      toast.success('Note saved')
      void qc.invalidateQueries({ queryKey: ['applications'] })
      setNoteOpen(false)
      setNoteApp(null)
      setNoteText('')
    },
    onError: () => toast.error('Could not save note'),
  })

  const interviewMutation = useMutation({
    mutationFn: ({ id, when }: { id: string; when: string }) =>
      applicationService.addApplicationInterview(id, when),
    onSuccess: () => {
      toast.success('Interview added')
      void qc.invalidateQueries({ queryKey: ['applications'] })
      setInterviewOpen(false)
      setInterviewApp(null)
      setInterviewWhen('')
    },
    onError: () => toast.error('Could not add interview'),
  })

  const handleStatusChange = async (applicationId: string, newStatus: string) => {
    await updateStatusMutation.mutateAsync({
      id: applicationId,
      status: newStatus as ApplicationStatus,
    })
  }

  return (
    <PageWrapper>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-text-primary sm:text-4xl">Applications</h1>
            <p className="mt-2 max-w-2xl text-text-secondary">
              Drag cards across stages and keep every opportunity moving.
            </p>
          </div>
          <Button type="button" className="h-11" onClick={() => { setAddDefaultStatus('saved'); setAddOpen(true) }}>
            <Plus className="h-4 w-4" />
            Add Application
          </Button>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm lg:flex-row lg:items-center">
          <label className="relative lg:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <Input
              aria-label="Search company or role"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs font-medium text-text-muted">Priority</span>
            {(['all', 'high', 'medium', 'low'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                  priority === p ? 'teal-cta text-white' : 'bg-surface text-text-secondary ring-1 ring-border'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-text-muted">Sort</span>
            <select
              className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={sort}
              onChange={(e) =>
                setSort(e.target.value as 'last_updated' | 'applied_date' | 'match_score')
              }
            >
              <option value="last_updated">Last updated</option>
              <option value="applied_date">Date applied</option>
              <option value="match_score">Match score</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : isError || !filtered ? (
          <div className="rounded-2xl border border-danger/25 bg-red-50 p-5 text-sm text-danger">
            <p className="font-bold">Unable to load applications.</p>
            <p className="mt-1 text-red-700">Check that you are signed in and the API is running.</p>
            <Button
              type="button"
              variant="danger"
              className="mt-4 h-10"
              onClick={() => window.location.reload()}
            >
              <RotateCcw className="h-4 w-4" />
              Retry
            </Button>
          </div>
        ) : (
          <KanbanBoard
            grouped={filtered.grouped}
            onStatusChange={handleStatusChange}
            onAdd={(status) => {
              setAddDefaultStatus(status ?? 'saved')
              setAddOpen(true)
            }}
            onNotes={(app) => {
              setNoteApp(app)
              setNoteText('')
              setNoteOpen(true)
            }}
            onInterview={(app) => {
              setInterviewApp(app)
              setInterviewWhen('')
              setInterviewOpen(true)
            }}
            onCoverLetter={(app) => {
              if (app.jdId) {
                navigate(`/analyze?jdHint=${encodeURIComponent(app.companyName)}`)
              } else {
                navigate('/analyze')
              }
            }}
            onDelete={(app) => {
              if (window.confirm(`Archive application at ${app.companyName}?`)) {
                deleteMutation.mutate(app.id)
              }
            }}
          />
        )}
      </div>

      <ApplicationsAddModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        defaultStatus={addDefaultStatus}
        onCreate={async (payload) => {
          await applicationService.createApplication({
            companyName: payload.companyName,
            jobTitle: payload.jobTitle,
            source: payload.source,
            priority: payload.priority,
            tags: payload.tags,
            status: (payload.status as ApplicationStatus) ?? 'saved',
          })
          void qc.invalidateQueries({ queryKey: ['applications'] })
          toast.success('Application created')
        }}
      />

      <Modal open={noteOpen} onClose={() => setNoteOpen(false)} title="Add note">
        {noteApp ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              if (!noteText.trim()) return
              appendNoteMutation.mutate({ id: noteApp.id, text: noteText.trim() })
            }}
          >
            <p className="text-sm text-text-secondary">
              {noteApp.companyName} — {noteApp.jobTitle}
            </p>
            <textarea
              className="min-h-[100px] w-full rounded-xl border border-border bg-white p-3 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              aria-label="Application note"
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setNoteOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={appendNoteMutation.isPending}>
                Save note
              </Button>
            </div>
          </form>
        ) : null}
      </Modal>

      <Modal open={interviewOpen} onClose={() => setInterviewOpen(false)} title="Schedule interview">
        {interviewApp ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              if (!interviewWhen) return
              const iso = new Date(interviewWhen).toISOString()
              interviewMutation.mutate({ id: interviewApp.id, when: iso })
            }}
          >
            <p className="text-sm text-text-secondary">
              {interviewApp.companyName} — {interviewApp.jobTitle}
            </p>
            <input
              type="datetime-local"
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={interviewWhen}
              onChange={(e) => setInterviewWhen(e.target.value)}
              required
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setInterviewOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={interviewMutation.isPending}>
                Save
              </Button>
            </div>
          </form>
        ) : null}
      </Modal>
    </PageWrapper>
  )
}
