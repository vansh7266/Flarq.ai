import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'

interface CoverLetterModalProps {
  open: boolean
  onClose: () => void
  content?: string
}

export function CoverLetterModal({ open, onClose, content }: CoverLetterModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Tailored cover letter">
      <div className="space-y-4">
        <div className="max-h-80 overflow-y-auto rounded-lg border border-border bg-background/80 p-4 text-sm leading-relaxed text-text-secondary">
          {content ?? 'Generated cover letters will stream here in Phase 2.'}
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button type="button" variant="secondary" disabled>
            Copy to clipboard
          </Button>
        </div>
      </div>
    </Modal>
  )
}
