import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import type { AgentMessage } from '../../types/agent.types'
import { FlarqOrb } from '../ui/FlarqOrb'

interface MessageBubbleProps {
  message: AgentMessage
}

function toolLabel(name: string): { label: string; emoji: string; className: string } {
  const map: Record<string, { label: string; emoji: string; className: string }> = {
    get_profile_summary: {
      label: 'Reading your profile',
      emoji: '👤',
      className: 'border-emerald/30 bg-emerald/10 text-emerald',
    },
    search_applications: {
      label: 'Searching applications',
      emoji: '🔍',
      className: 'border-sky/30 bg-sky/10 text-sky',
    },
    get_analytics_insight: {
      label: 'Running analytics',
      emoji: '📊',
      className: 'border-amber/30 bg-amber/10 text-amber',
    },
    get_stale_applications: {
      label: 'Checking for alerts',
      emoji: '🔔',
      className: 'border-rose/30 bg-rose/10 text-rose',
    },
    generate_follow_up: {
      label: 'Generating follow-up',
      emoji: '✉️',
      className: 'border-primary/30 bg-primary/10 text-primary',
    },
    update_application_status: {
      label: 'Updating status',
      emoji: '✏️',
      className: 'border-emerald/30 bg-emerald/10 text-emerald',
    },
  }
  return map[name] ?? { label: name, emoji: '⚡', className: 'border-primary/30 bg-primary/10 text-primary' }
}

function timeLabel(iso: string) {
  const parsed = Date.parse(iso)
  if (Number.isNaN(parsed)) return ''
  return new Date(parsed).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/** Markdown renderer for assistant messages, with streaming cursor support */
function MarkdownContent({ content, isStreaming }: { content: string; isStreaming: boolean }) {
  return (
    <>
      <ReactMarkdown
        components={{
          strong: ({ children }) => (
            <strong className="font-semibold text-text">{children}</strong>
          ),
          code: ({ children, className }) => {
            const isBlock = className?.includes('language-')
            if (isBlock) {
              const lang = className?.replace('language-', '') ?? ''
              return (
                <div className="my-3 overflow-hidden rounded-lg border border-border">
                  {lang && (
                    <div className="flex items-center border-b border-border bg-surface px-3 py-1.5">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
                        {lang}
                      </span>
                    </div>
                  )}
                  <pre className="overflow-x-auto bg-void p-3 text-xs">
                    <code className={className}>{children}</code>
                  </pre>
                </div>
              )
            }
            return (
              <code className="rounded-md border border-border bg-surface px-1.5 py-0.5 font-mono text-xs text-accent">
                {children}
              </code>
            )
          },
          p: ({ children }) => (
            <p className="mb-3 last:mb-0 leading-7">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="mb-3 ml-5 list-disc space-y-1.5 last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-3 ml-5 list-decimal space-y-1.5 last:mb-0">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="leading-7">{children}</li>
          ),
          h1: ({ children }) => (
            <h1 className="mb-3 mt-5 font-display text-xl font-bold text-text first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-2 mt-4 font-display text-lg font-bold text-text first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-1.5 mt-3 font-display text-base font-semibold text-text first:mt-0">
              {children}
            </h3>
          ),
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-surface">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-left font-semibold text-text-secondary">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-t border-border px-3 py-2">{children}</td>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-2 border-accent/40 pl-4 text-text-secondary italic">
              {children}
            </blockquote>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline underline-offset-2 transition hover:text-accent-light"
            >
              {children}
            </a>
          ),
          hr: () => (
            <hr className="my-4 border-border" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span className="ml-0.5 inline-block h-4 w-0.5 animate-blink bg-accent" />
      )}
    </>
  )
}

function UserMessageBubble({ message }: { message: AgentMessage }) {
  return (
    <div className="group flex justify-end">
      <div className="max-w-[70%]">
        <motion.div
          layout
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="grad-neural rounded-2xl rounded-br-sm px-5 py-3 text-sm leading-relaxed text-white shadow-sm"
        >
          {message.content}
        </motion.div>
        <p className="mt-1 text-right text-xs text-muted opacity-0 transition group-hover:opacity-100">
          {timeLabel(message.createdAt)}
        </p>
      </div>
    </div>
  )
}

function AssistantMessageBubble({ message }: { message: AgentMessage }) {
  const isStreaming = message.isStreaming ?? false

  return (
    <div className="group flex items-start gap-3">
      <FlarqOrb size={32} state={isStreaming ? 'responding' : 'idle'} className="mt-0.5 shrink-0" />
      <div className="max-w-[75%] flex-1 min-w-0">
        {message.toolChips && message.toolChips.length > 0 ? (
          <div className="mb-3 flex flex-wrap gap-2">
            {message.toolChips.map((tool, index) => {
              const chip = toolLabel(tool)
              return (
                <motion.span
                  key={`${message.id}-${tool}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-xs ${chip.className}`}
                >
                  <span>{chip.emoji}</span>
                  {chip.label}
                </motion.span>
              )
            })}
          </div>
        ) : null}
        <div className="relative">
          <div className="absolute -inset-2 rounded-2xl bg-accent/5 blur-xl" />
          <motion.div
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative rounded-2xl rounded-bl-sm border border-border bg-card px-5 py-4 text-sm leading-relaxed text-text shadow-sm"
          >
            <MarkdownContent content={message.content} isStreaming={isStreaming} />
          </motion.div>
        </div>
        {!isStreaming && (
          <p className="mt-1 text-xs text-muted opacity-0 transition group-hover:opacity-100">
            {timeLabel(message.createdAt)}
          </p>
        )}
      </div>
    </div>
  )
}

export function MessageBubble({ message }: MessageBubbleProps) {
  if (message.role === 'user') return <UserMessageBubble message={message} />
  return <AssistantMessageBubble message={message} />
}
