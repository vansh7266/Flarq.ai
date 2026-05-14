import { useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, UploadCloud } from 'lucide-react'
import { cn } from '../../utils/helpers'

interface ProfileUploadZoneProps {
  disabled?: boolean
  progress: number | null
  onFile: (file: File) => void
}

export function ProfileUploadZone({
  disabled,
  progress,
  onFile,
}: ProfileUploadZoneProps) {
  const [dragOver, setDragOver] = useState(false)

  const handleFiles = useCallback(
    (list: FileList | null) => {
      const file = list?.[0]
      if (!file) {
        return
      }
      onFile(file)
    },
    [onFile]
  )

  return (
    <div
      className={cn(
        'relative rounded-xl border-2 border-dashed p-8 transition-colors',
        dragOver
          ? 'border-primary bg-primary/10 shadow-glow'
          : 'border-border bg-surface/60',
        disabled && 'pointer-events-none opacity-60'
      )}
      onDragEnter={() => setDragOver(true)}
      onDragLeave={() => setDragOver(false)}
      onDragOver={(event) => {
        event.preventDefault()
        setDragOver(true)
      }}
      onDrop={(event) => {
        event.preventDefault()
        setDragOver(false)
        handleFiles(event.dataTransfer.files)
      }}
    >
      {dragOver ? (
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-xl border-2 border-primary/60"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      ) : null}
      <label className="flex cursor-pointer flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
          <UploadCloud className="h-7 w-7" />
        </div>
        <div>
          <p className="text-sm font-semibold text-text-primary">
            Drag & drop your resume, or click to browse
          </p>
          <p className="mt-1 text-xs text-text-muted">PDF or DOCX · up to 5 MB</p>
        </div>
        <input
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          disabled={disabled}
          onChange={(event) => handleFiles(event.target.files)}
        />
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1 text-xs text-text-secondary">
          <FileText className="h-3.5 w-3.5" />
          PDF / DOCX
        </span>
      </label>
      {progress != null ? (
        <div className="mt-6 space-y-2">
          <div className="h-2 overflow-hidden rounded-full bg-border">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-accent"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 18 }}
            />
          </div>
          <p className="text-center text-xs text-text-muted">Uploading {progress}%</p>
        </div>
      ) : null}
    </div>
  )
}
