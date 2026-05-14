import { useEffect, useRef, useState } from 'react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { MessageBubble } from './MessageBubble'
import { TypingIndicator } from './TypingIndicator'
import type { AgentMessage } from '../../types/agent.types'

interface AgentChatPanelProps {
  messages: AgentMessage[]
  isSending: boolean
  suggestions: string[]
  onSend: (message: string) => Promise<void>
  onPickSuggestion: (text: string) => void
}

export function AgentChatPanel({
  messages,
  isSending,
  suggestions,
  onSend,
  onPickSuggestion,
}: AgentChatPanelProps) {
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isSending])

  return (
    <Card className="flex h-[min(640px,calc(100vh-200px))] flex-col gap-4">
      <div>
        <p className="text-sm font-semibold text-text-primary">FLARQ agent</p>
        <p className="text-xs text-text-muted">
          Gemini + your MongoDB-backed job search graph — tools run automatically when useful.
        </p>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto rounded-lg border border-border bg-background/60 p-3">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {isSending ? <TypingIndicator /> : null}
        <div ref={bottomRef} />
      </div>
      {suggestions.length > 0 && !isSending ? (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onPickSuggestion(s)}
              className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-500/20 hover:bg-indigo-500/20"
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}
      <form
        className="flex flex-col gap-2"
        onSubmit={async (event) => {
          event.preventDefault()
          const trimmed = draft.trim()
          if (!trimmed || isSending) {
            return
          }
          setDraft('')
          await onSend(trimmed)
        }}
      >
        <textarea
          rows={2}
          placeholder="Ask about your pipeline, follow-ups, or patterns… (Enter to send, Shift+Enter for newline)"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              e.currentTarget.form?.requestSubmit()
            }
          }}
          className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary"
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={isSending || !draft.trim()} isLoading={isSending}>
            Send
          </Button>
        </div>
      </form>
    </Card>
  )
}
