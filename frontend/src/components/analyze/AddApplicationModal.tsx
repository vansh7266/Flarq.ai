import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'

interface AddApplicationModalProps {
  open: boolean
  onClose: () => void
  defaultCompany?: string
  defaultRole?: string
  jobDescriptionId?: string
  onCreate: (payload: {
    company: string
    roleTitle: string
    jobDescriptionId?: string
  }) => Promise<void>
}

export function AddApplicationModal({
  open,
  onClose,
  defaultCompany,
  defaultRole,
  jobDescriptionId,
  onCreate,
}: AddApplicationModalProps) {
  const [company, setCompany] = useState(defaultCompany ?? '')
  const [roleTitle, setRoleTitle] = useState(defaultRole ?? '')
  const [saving, setSaving] = useState(false)

  return (
    <Modal open={open} onClose={onClose} title="Save to applications">
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault()
          setSaving(true)
          try {
            await onCreate({
              company: company.trim(),
              roleTitle: roleTitle.trim(),
              jobDescriptionId,
            })
            onClose()
          } finally {
            setSaving(false)
          }
        }}
      >
        <Input
          label="Company"
          required
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
        <Input
          label="Role title"
          required
          value={roleTitle}
          onChange={(e) => setRoleTitle(e.target.value)}
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
