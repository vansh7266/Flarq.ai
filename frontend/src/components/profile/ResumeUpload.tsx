import { useCallback, useState, type ChangeEvent } from 'react'
import { UploadCloud } from 'lucide-react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

interface ResumeUploadProps {
  onFileSelected?: (file: File) => void
}

export function ResumeUpload({ onFileSelected }: ResumeUploadProps) {
  const [fileName, setFileName] = useState<string | null>(null)

  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) {
        return
      }
      setFileName(file.name)
      onFileSelected?.(file)
    },
    [onFileSelected]
  )

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <UploadCloud className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-text-primary">Resume upload</p>
          <p className="text-xs text-text-muted">
            PDF and DOCX supported. Parsed with Gemini in Phase 2.
          </p>
        </div>
      </div>
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-background/60 px-4 py-8 text-center text-sm text-text-secondary transition hover:border-primary/60">
        <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={onChange} />
        <span>Drop your resume or click to browse</span>
        {fileName ? (
          <span className="text-xs text-primary">Selected: {fileName}</span>
        ) : null}
      </label>
      <Button type="button" variant="secondary" disabled>
        Upload (coming soon)
      </Button>
    </Card>
  )
}
