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
          Paste the role details and Flarq will extract the requirements.
        </p>
      </div>
      <textarea
        className="min-h-[180px] w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
        aria-label="Job description"
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
