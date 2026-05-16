import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import type { AgentMessage } from '../../types/agent.types'
import { FlarqOrb } from '../ui/FlarqOrb'

interface MessageBubbleProps {
  message: AgentMessage
}

function toolLabel(name: string): { label: string; className: string } {
  const map: Record<string, { label: string; className: string }> = {
    get_profile_summary: {
      label: 'Profile checked',
      className: 'border-emerald/30 bg-emerald/10 text-emerald',
    },
    search_applications: {
      label: 'Searched applications',
      className: 'border-sky/30 bg-sky/10 text-sky',
    },
    get_analytics_insight: {
      label: 'Ran analytics',
      className: 'border-amber/30 bg-amber/10 text-amber',
    },
    get_stale_applications: {
      label: 'Checked alerts',
      className: 'border-rose/30 bg-rose/10 text-rose',
    },
    generate_follow_up: {
      label: 'Generated follow-up',
      className: 'border-primary/30 bg-primary/10 text-primary',
    },
    update_application_status: {
      label: 'Updated status',
      className: 'border-emerald/30 bg-emerald/10 text-emerald',
    },
  }
  return map[name] ?? { label: name, className: 'border-primary/30 bg-primary/10 text-primary' }
}

function timeLabel(iso: string) {
  const parsed = Date.parse(iso)
  if (Number.isNaN(parsed)) return ''
  return new Date(parsed).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function TypewriterText({ content, messageId }: { content: string; messageId: string }) {
  const [displayed, setDisplayed] = useState('')
  const animatedIdRef = useRef<string | null>(null)
  const indexRef = useRef(0)

  useEffect(() => {
    if (animatedIdRef.current === messageId) return
    animatedIdRef.current = messageId
    indexRef.current = 0
    setDisplayed('')

    const interval = window.setInterval(() => {
      indexRef.current += 1
      setDisplayed(content.slice(0, indexRef.current))
      if (indexRef.current >= content.length) {
        window.clearInterval(interval)
      }
    }, 18)

    return () => window.clearInterval(interval)
  }, [messageId, content])

  const complete = displayed.length >= content.length

  return (
    <>
      <ReactMarkdown
        components={{
          strong: ({ children }) => <strong className="font-semibold text-gradient">{children}</strong>,
          code: ({ children }) => (
            <code className="rounded bg-surface px-1 font-mono text-primary">{children}</code>
          ),
          p: ({ children }) => <p className="leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="ml-4 list-disc space-y-1">{children}</ul>,
        }}
      >
        {displayed}
      </ReactMarkdown>
      {!complete ? <span className="ml-0.5 animate-blink">|</span> : null}
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
  return (
    <div className="group flex items-start gap-3">
      <FlarqOrb size={32} state="idle" className="shrink-0" />
      <div className="max-w-[75%] flex-1">
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
                  className={`rounded-full border px-3 py-1 font-mono text-xs ${chip.className}`}
                >
                  {chip.label}
                </motion.span>
              )
            })}
          </div>
        ) : null}
        <div className="relative">
          <div className="absolute -inset-2 rounded-2xl bg-primary/5 blur-xl" />
          <motion.div
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative rounded-2xl rounded-bl-sm border border-border bg-card px-5 py-4 text-sm leading-relaxed text-text shadow-sm"
          >
            <TypewriterText content={message.content} messageId={message.id} />
          </motion.div>
        </div>
        <p className="mt-1 text-xs text-muted opacity-0 transition group-hover:opacity-100">
          {timeLabel(message.createdAt)}
        </p>
      </div>
    </div>
  )
}

export function MessageBubble({ message }: MessageBubbleProps) {
  if (message.role === 'user') return <UserMessageBubble message={message} />
  return <AssistantMessageBubble message={message} />
}
