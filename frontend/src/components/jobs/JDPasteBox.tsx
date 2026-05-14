import { useState } from 'react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'

interface JDPasteBoxProps {
  onAnalyze?: (text: string) => void
}

export function JDPasteBox({ onAnalyze }: JDPasteBoxProps) {
  const [text, setText] = useState('')

  return (
    <Card className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-text-primary">Job description</p>
        <p className="text-xs text-text-muted">
          Paste the JD text. Gemini extraction wires in during Phase 2.
        </p>
      </div>
      <textarea
        className="min-h-[180px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/40"
        placeholder="Paste responsibilities, requirements, and nice-to-haves..."
        value={text}
        onChange={(event) => {
          setText(event.target.value)
        }}
      />
      <Button
        type="button"
        disabled={!text.trim()}
        onClick={() => {
          onAnalyze?.(text)
        }}
      >
        Analyze requirements
      </Button>
    </Card>
  )
}
