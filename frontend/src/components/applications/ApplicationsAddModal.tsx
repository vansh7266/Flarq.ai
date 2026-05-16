import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'

interface ApplicationsAddModalProps {
  open: boolean
  onClose: () => void
  defaultStatus?: string
  onCreate: (payload: {
    companyName: string
    jobTitle: string
    source?: string
    priority: 'high' | 'medium' | 'low'
    tags: string[]
    jobDescriptionId?: string
    status?: string
  }) => Promise<void>
}

export function ApplicationsAddModal({
  open,
  onClose,
  defaultStatus = 'saved',
  onCreate,
}: ApplicationsAddModalProps) {
  const [companyName, setCompanyName] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [source, setSource] = useState('')
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium')
  const [tags, setTags] = useState('')
  const [saving, setSaving] = useState(false)

  return (
    <Modal open={open} onClose={onClose} title="Add application">
      <p className="mb-4 text-sm text-text-secondary">
        Track a role in your Flarq pipeline.
      </p>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault()
          setSaving(true)
          try {
            await onCreate({
              companyName: companyName.trim(),
              jobTitle: jobTitle.trim(),
              source: source.trim() || undefined,
              priority,
              tags: tags
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean),
              status: defaultStatus,
            })
            setCompanyName('')
            setJobTitle('')
            setSource('')
            setTags('')
            setPriority('medium')
            onClose()
          } finally {
            setSaving(false)
          }
        }}
      >
        <Input
          label="Company name"
          required
          value={companyName}
          onChange={(ev) => setCompanyName(ev.target.value)}
        />
        <Input
          label="Job title"
          required
          value={jobTitle}
          onChange={(ev) => setJobTitle(ev.target.value)}
        />
        <Input
          label="Source (LinkedIn, referral, site…)"
          value={source}
          onChange={(ev) => setSource(ev.target.value)}
        />
        <div>
          <p className="mb-2 text-xs font-medium text-text-secondary">Priority</p>
          <div className="flex gap-2">
            {(['high', 'medium', 'low'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ring-border transition ${
                  priority === p ? 'grad-neural text-white ring-primary' : 'bg-surface text-text-secondary'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <Input
          label="Tags (comma separated)"
          value={tags}
          onChange={(ev) => setTags(ev.target.value)}
          aria-label="Tags"
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={saving}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  )
}
