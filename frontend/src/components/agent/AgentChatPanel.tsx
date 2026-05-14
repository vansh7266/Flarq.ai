import { useEffect, useRef, useState } from 'react'
import { Card } from '../ui/Card'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { MessageBubble } from './MessageBubble'
import { TypingIndicator } from './TypingIndicator'
import type { AgentMessage } from '../../types/agent.types'

interface AgentChatPanelProps {
  messages: AgentMessage[]
  isSending: boolean
  onSend: (message: string) => Promise<void>
}

export function AgentChatPanel({ messages, isSending, onSend }: AgentChatPanelProps) {
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isSending])

  return (
    <Card className="flex h-[560px] flex-col gap-4">
      <div>
        <p className="text-sm font-semibold text-text-primary">FLARQ agent</p>
        <p className="text-xs text-text-muted">
          Natural language over your MongoDB-backed job search graph.
        </p>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto rounded-lg border border-border bg-background/60 p-3">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {isSending ? <TypingIndicator /> : null}
        <div ref={bottomRef} />
      </div>
      <form
        className="flex flex-col gap-2 md:flex-row"
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
        <Input
          placeholder="Ask about your pipeline, gaps, or next best actions..."
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value)
          }}
          className="md:flex-1"
        />
        <Button type="submit" disabled={isSending || !draft.trim()} isLoading={isSending}>
          Send
        </Button>
      </form>
    </Card>
  )
}
