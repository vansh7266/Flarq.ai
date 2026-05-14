import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { AgentMessage } from '../../types/agent.types'

interface MessageBubbleProps {
  message: AgentMessage
}

function toolLabel(name: string): string {
  const map: Record<string, string> = {
    get_profile_summary: '🔍 Profile',
    search_applications: '🔎 Applications',
    get_analytics_insight: '📊 Analytics',
    get_stale_applications: '⏰ Stale pipeline',
    generate_follow_up: '✉️ Follow-up draft',
    update_application_status: '✅ Status update',
  }
  return map[name] ?? `🛠 ${name}`
}

function UserMessageBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <motion.div
        layout
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-[80%] rounded-2xl bg-indigo-600 px-4 py-2 text-sm leading-relaxed text-white shadow-sm"
      >
        {content}
      </motion.div>
    </div>
  )
}

function AssistantMessageBubble({ message }: { message: AgentMessage }) {
  const [displayed, setDisplayed] = useState('')

  useEffect(() => {
    let index = 0
    const timer = window.setInterval(() => {
      index += 1
      setDisplayed(message.content.slice(0, index))
      if (index >= message.content.length) {
        window.clearInterval(timer)
      }
    }, 10)
    return () => {
      window.clearInterval(timer)
    }
  }, [message.content, message.id])

  return (
    <div className="flex flex-col items-start gap-2">
      {message.toolChips && message.toolChips.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {message.toolChips.map((t) => (
            <motion.span
              key={t}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-full bg-background px-2 py-0.5 text-[10px] font-medium text-text-muted ring-1 ring-border"
            >
              {toolLabel(t)}
            </motion.span>
          ))}
        </div>
      ) : null}
      <motion.div
        layout
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-[80%] rounded-2xl border border-border bg-surface-elevated px-4 py-2 text-sm leading-relaxed text-text-secondary shadow-sm"
      >
        {displayed}
      </motion.div>
    </div>
  )
}

export function MessageBubble({ message }: MessageBubbleProps) {
  if (message.role === 'user') {
    return <UserMessageBubble content={message.content} />
  }

  return <AssistantMessageBubble message={message} />
}
