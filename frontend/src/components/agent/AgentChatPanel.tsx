import { useEffect, useRef, useState } from 'react'
import { ArrowUp, Square } from 'lucide-react'
import { MessageBubble } from './MessageBubble'
import { ThinkingIndicator } from './ThinkingIndicator'
import { ToolExecutionTimeline } from './ToolExecutionTimeline'
import type { AgentMessage, ToolExecutionEntry } from '../../types/agent.types'
import { FlarqOrb } from '../ui/FlarqOrb'

interface AgentChatPanelProps {
  messages: AgentMessage[]
  isSending: boolean
  suggestions: string[]
  onSend: (message: string) => Promise<void>
  onPickSuggestion: (text: string) => void
  onCancel: () => void
  /** Current tool execution entries for the active agent turn */
  toolTimeline: ToolExecutionEntry[]
  /** Whether the agent is in the "thinking" phase (before tokens arrive) */
  isThinking: boolean
  thinkingMessage: string | null
}

export function AgentChatPanel({
  messages,
  isSending,
  suggestions,
  onSend,
  onPickSuggestion,
  onCancel,
  toolTimeline,
  isThinking,
  thinkingMessage,
}: AgentChatPanelProps) {
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  // Auto-scroll on new messages, streaming updates, or status changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isSending, toolTimeline, isThinking])

  // Auto-resize textarea
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

  // Show thinking indicator when agent is thinking and no streaming tokens yet
  const showThinking = isSending && isThinking

  // Show tool timeline when there are tools executing
  const showToolTimeline = toolTimeline.length > 0

  // Check if the last assistant message is still streaming
  const lastAssistantMsg = [...messages].reverse().find((m) => m.role === 'assistant')
  const isLastMsgStreaming = lastAssistantMsg?.isStreaming ?? false

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-void">
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        {messages.length === 0 && !isSending ? (
          /* ── Empty state with FlarqOrb ── */
          <div className="flex min-h-full items-center justify-center">
            <div className="max-w-xl text-center">
              <FlarqOrb size={120} state="idle" className="mx-auto" />
              <h1 className="mt-8 font-display text-3xl font-bold text-gradient">
                Hi, I&apos;m Flarq.
              </h1>
              <p className="mx-auto mt-3 max-w-sm text-center text-base leading-7 text-text-secondary">
                Your AI job search agent. Ask me anything about your applications,
                skills, or strategy.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {['How am I doing?', 'What needs follow-up?', 'Analyze my patterns'].map(
                  (chip) => (
                    <button
                      key={chip}
                      type="button"
                      className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition hover:border-accent hover:bg-accent/10 hover:text-accent"
                      onClick={() => onPickSuggestion(chip)}
                    >
                      {chip}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ── Conversation thread ── */
          <div className="mx-auto max-w-4xl space-y-6">
            {/* Date separator */}
            <div className="flex items-center gap-3 py-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-semibold text-muted">Today</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Messages */}
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {/* Tool Execution Timeline — shows between last user message and assistant response */}
            {showToolTimeline && (
              <ToolExecutionTimeline tools={toolTimeline} />
            )}

            {/* Thinking indicator — shown while the agent is reasoning before producing tokens */}
            {showThinking && (
              <ThinkingIndicator
                message={thinkingMessage ?? 'Analyzing your request...'}
              />
            )}

            {/* Streaming cursor placeholder — ensures scroll target stays at bottom */}
            {isLastMsgStreaming && !showThinking && !showToolTimeline && (
              <div className="h-1" />
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* ── Input bar ── */}
      <div className="border-t border-border bg-surface px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-[720px]">
          {/* Suggestion chips */}
          <div className="mb-2 flex flex-wrap gap-2">
            {defaultChips.slice(0, 3).map((chip) => (
              <button
                key={chip}
                type="button"
                className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-text-secondary transition hover:border-accent hover:bg-accent/10 hover:text-accent"
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
              className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-text outline-none transition placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/30"
            />

            {/* Cancel / Stop button while streaming */}
            {isSending ? (
              <button
                type="button"
                onClick={onCancel}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-rose/30 bg-rose/10 text-rose transition hover:bg-rose/20"
                aria-label="Stop generating"
              >
                <Square className="h-4 w-4 fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!draft.trim()}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition ${
                  !draft.trim()
                    ? 'border border-border bg-surface text-muted'
                    : 'grad-neural hover:rotate-45 hover:scale-105 hover:shadow-glow'
                }`}
                aria-label="Send message"
              >
                <ArrowUp className="h-5 w-5" />
              </button>
            )}
          </form>
        </div>
      </div>
    </section>
  )
}
