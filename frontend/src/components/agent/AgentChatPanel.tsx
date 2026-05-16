import { useEffect, useRef, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { MessageBubble } from './MessageBubble'
import { TypingIndicator } from './TypingIndicator'
import type { AgentMessage } from '../../types/agent.types'
import { FlarqOrb } from '../ui/FlarqOrb'

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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isSending])

  useEffect(() => {
    const node = textareaRef.current
    if (!node) return
    node.style.height = 'auto'
    node.style.height = `${Math.min(node.scrollHeight, 128)}px`
  }, [draft])

  const submit = async () => {
    const trimmed = draft.trim()
    if (!trimmed || isSending) return
    setDraft('')
    await onSend(trimmed)
  }

  const defaultChips = suggestions.length
    ? suggestions
    : ['How am I doing?', 'What needs follow-up?', 'Show analytics']

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-void">
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        {messages.length === 0 && !isSending ? (
          <div className="flex min-h-full items-center justify-center">
            <div className="max-w-xl text-center">
              <FlarqOrb size={120} state="idle" className="mx-auto" />
              <h1 className="mt-8 font-display text-3xl font-bold text-gradient">Hi, I&apos;m Flarq.</h1>
              <p className="mx-auto mt-3 max-w-sm text-center text-base leading-7 text-text-secondary">
                Your AI job search agent. Ask me anything about your applications,
                skills, or strategy.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {['How am I doing?', 'What needs follow-up?', 'Analyze my patterns'].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition hover:border-primary hover:bg-primary/10 hover:text-primary"
                    onClick={() => onPickSuggestion(chip)}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl space-y-6">
            <div className="flex items-center gap-3 py-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-semibold text-muted">Today</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isSending ? <TypingIndicator /> : null}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="border-t border-border bg-surface px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-[720px]">
          <div className="mb-2 flex flex-wrap gap-2">
            {defaultChips.slice(0, 3).map((chip) => (
              <button
                key={chip}
                type="button"
                className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-text-secondary transition hover:border-primary hover:bg-primary/10 hover:text-primary"
                onClick={() => onPickSuggestion(chip)}
              >
                {chip}
              </button>
            ))}
          </div>
          <form
            className="flex items-end gap-3"
            onSubmit={(event) => {
              event.preventDefault()
              void submit()
            }}
          >
            <textarea
              ref={textareaRef}
              rows={1}
              aria-label="Ask Flarq about your job search"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  void submit()
                }
              }}
              className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-text outline-none transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
            <button
              type="submit"
              disabled={isSending || !draft.trim()}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition ${
                isSending || !draft.trim()
                  ? 'border border-border bg-surface text-muted'
                  : 'grad-neural hover:rotate-45 hover:scale-105 hover:shadow-glow'
              }`}
              aria-label="Send message"
            >
              {isSending ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <ArrowUp className="h-5 w-5" />
              )}
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}
