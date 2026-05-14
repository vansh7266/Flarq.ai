import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { AgentMessage } from '../../types/agent.types'

interface MessageBubbleProps {
  message: AgentMessage
}

function UserMessageBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <motion.div
        layout
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-[80%] rounded-2xl bg-primary px-4 py-2 text-sm leading-relaxed text-white"
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
    }, 12)

    return () => {
      window.clearInterval(timer)
    }
  }, [message.content, message.id])

  return (
    <div className="flex justify-start">
      <motion.div
        layout
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-[80%] rounded-2xl border border-border bg-surface-elevated px-4 py-2 text-sm leading-relaxed text-text-secondary"
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
