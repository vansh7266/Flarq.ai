import { useMemo, useState } from 'react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { AgentChatPanel } from '../components/agent/AgentChatPanel'
import { useAgentChat } from '../hooks/useAgent'
import type { AgentMessage } from '../types/agent.types'

function createMessage(role: AgentMessage['role'], content: string): AgentMessage {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`

  return {
    id,
    role,
    content,
    createdAt: new Date().toISOString(),
  }
}

export function AgentPage() {
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const chatMutation = useAgentChat()

  const isSending = chatMutation.isPending

  const handleSend = async (text: string) => {
    const userMessage = createMessage('user', text)
    setMessages((previous) => [...previous, userMessage])

    try {
      const response = await chatMutation.mutateAsync(text)
      if (response.messages && response.messages.length > 0) {
        setMessages(response.messages)
        return
      }

      setMessages((previous) => [
        ...previous,
        createMessage('assistant', response.reply),
      ])
    } catch {
      const assistantMessage = createMessage(
        'assistant',
        'The live agent endpoint will stream MongoDB-backed answers in a future release. For now, your message is logged locally while we finish wiring Gemini + Agent Builder + MCP tools.'
      )
      setMessages((previous) => [...previous, assistantMessage])
    }
  }

  const orderedMessages = useMemo(
    () => [...messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [messages]
  )

  return (
    <PageWrapper>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">
            Agent console
          </h1>
          <p className="mt-2 max-w-2xl text-text-secondary">
            Ask natural language questions across your search — powered by FLARQ&apos;s
            agent graph and MongoDB MCP memory.
          </p>
        </div>
        <AgentChatPanel messages={orderedMessages} isSending={isSending} onSend={handleSend} />
      </div>
    </PageWrapper>
  )
}
