import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { AgentMessage } from '../../types/agent.types'

interface MessageBubbleProps {
  message: AgentMessage
}

function toolLabel(name: string): string {
  const map: Record<string, string> = {
    get_profile_summary: '🔍 Searched profile',
    search_applications: '🔍 Searched applications',
    get_analytics_insight: '📊 Ran analytics',
    get_stale_applications: '📌 Checked follow-ups',
    generate_follow_up: '✍️ Generated follow-up',
    update_application_status: '✅ Updated status',
  }
  return map[name] ?? name
}

function timeLabel(iso: string) {
  const parsed = Date.parse(iso)
  if (Number.isNaN(parsed)) return ''
  return new Date(parsed).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function UserMessageBubble({ message }: { message: AgentMessage }) {
  return (
    <div className="group flex justify-end">
      <div className="max-w-[70%]">
        <motion.div
          layout
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="teal-cta rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-6 text-white shadow-sm"
        >
          {message.content}
        </motion.div>
        <p className="mt-1 text-right text-[11px] text-text-muted opacity-0 transition group-hover:opacity-100">
          {timeLabel(message.createdAt)}
        </p>
      </div>
    </div>
  )
}

function AssistantMessageBubble({ message }: { message: AgentMessage }) {
  const [displayed, setDisplayed] = useState('')
  const complete = displayed.length >= message.content.length

  useEffect(() => {
    let index = 0
    const timer = window.setInterval(() => {
      index += 1
      setDisplayed(message.content.slice(0, index))
      if (index >= message.content.length) {
        window.clearInterval(timer)
      }
    }, 18)
    return () => {
      window.clearInterval(timer)
    }
  }, [message.content, message.id])

  return (
    <div className="group flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-extrabold text-white">
        F
      </div>
      <div className="max-w-[75%]">
        {message.toolChips && message.toolChips.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {message.toolChips.map((tool, index) => (
              <motion.span
                key={`${message.id}-${tool}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-white"
              >
                {toolLabel(tool)}
              </motion.span>
            ))}
          </div>
        ) : null}
        <motion.div
          layout
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-text-primary shadow-sm"
        >
          {displayed}
          {!complete ? <span className="ml-0.5 animate-pulse">|</span> : null}
        </motion.div>
        <p className="mt-1 text-[11px] text-text-muted opacity-0 transition group-hover:opacity-100">
          {timeLabel(message.createdAt)}
        </p>
      </div>
    </div>
  )
}

export function MessageBubble({ message }: MessageBubbleProps) {
  if (message.role === 'user') {
    return <UserMessageBubble message={message} />
  }

  return <AssistantMessageBubble message={message} />
}
