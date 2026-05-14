import { useEffect, useRef, useState } from 'react'
import { ArrowUp } from 'lucide-react'
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

function FlarqOrb() {
  return (
    <div className="relative mx-auto h-36 w-36">
      <div className="absolute inset-2 animate-orbit rounded-full border-[3px] border-primary shadow-glow" />
      <div className="absolute inset-[23px] flex items-center justify-center rounded-full bg-[#f0fdfa] text-2xl font-extrabold text-primary">
        F
      </div>
      <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 animate-[orbit_6s_linear_infinite]">
        <span className="absolute -top-1 left-1/2 h-2 w-2 rounded-full bg-primary" />
      </div>
      <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 animate-[orbit_10s_linear_infinite]">
        <span className="absolute bottom-2 right-3 h-2 w-2 rounded-full bg-accent/80" />
      </div>
      <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 animate-[orbit_14s_linear_infinite]">
        <span className="absolute left-3 top-6 h-2 w-2 rounded-full bg-primary/60" />
      </div>
    </div>
  )
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
    <section className="flex h-[calc(100vh-64px)] min-w-0 flex-1 flex-col bg-white">
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        {messages.length === 0 && !isSending ? (
          <div className="flex min-h-full items-center justify-center">
            <div className="max-w-xl text-center">
              <FlarqOrb />
              <h1 className="mt-8 text-2xl font-extrabold text-text-primary">Hi, I&apos;m Flarq.</h1>
              <p className="mt-3 text-sm leading-6 text-text-muted">
                Your AI job search agent. Ask me anything about your applications,
                skills, or strategy.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {['How am I doing?', 'What needs follow-up?', 'Analyze my patterns'].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    className="rounded-full border border-primary bg-white px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white"
                    onClick={() => onPickSuggestion(chip)}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl space-y-5">
            <div className="flex items-center gap-3 py-2">
              <div className="h-px flex-1 bg-slate-300" />
              <span className="text-xs font-semibold text-text-muted">Today</span>
              <div className="h-px flex-1 bg-slate-300" />
            </div>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isSending ? <TypingIndicator /> : null}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="mb-2 flex flex-wrap gap-2">
            {defaultChips.slice(0, 3).map((chip) => (
              <button
                key={chip}
                type="button"
                className="rounded-full border border-primary/40 bg-white px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary hover:text-white"
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
              className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
            <button
              type="submit"
              disabled={isSending || !draft.trim()}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition ${
                isSending || !draft.trim()
                  ? 'bg-slate-300'
                  : 'teal-cta hover:rotate-45'
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
