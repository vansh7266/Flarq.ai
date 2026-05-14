import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { AgentChatPanel } from '../components/agent/AgentChatPanel'
import { useAgentChat, useAgentHistory } from '../hooks/useAgent'
import { useAuth } from '../hooks/useAuth'
import * as agentService from '../services/agentService'
import type { AgentMessage } from '../types/agent.types'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'

function createMessage(
  role: AgentMessage['role'],
  content: string,
  toolChips?: string[]
): AgentMessage {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`

  return {
    id,
    role,
    content,
    createdAt: new Date().toISOString(),
    toolChips,
  }
}

export function AgentPage() {
  const { isAuthenticated } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([
    'How am I doing?',
    'What needs follow-up?',
    'Analyze my patterns',
  ])
  const chatMutation = useAgentChat()
  const historyQuery = useAgentHistory(isAuthenticated)
  const abortRef = useRef<AbortController | null>(null)
  const promptHandledRef = useRef(false)

  const isSending = chatMutation.isPending

  const orderedMessages = useMemo(
    () => [...messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [messages]
  )

  const handleSend = useCallback(
    async (text: string) => {
      const userMessage = createMessage('user', text)
      setMessages((previous) => [...previous, userMessage])
      abortRef.current?.abort()
      abortRef.current = new AbortController()
      try {
        const response = await chatMutation.mutateAsync({
          message: text,
          conversationId,
          signal: abortRef.current.signal,
        })
        setConversationId(response.conversationId)
        setSuggestions(
          response.suggestions && response.suggestions.length >= 3
            ? response.suggestions
            : ['How am I doing?', 'What needs follow-up?', 'Analyze my patterns']
        )
        setMessages((previous) => [
          ...previous,
          createMessage('assistant', response.response, response.toolsUsed),
        ])
        void historyQuery.refetch()
      } catch {
        setMessages((previous) => [
          ...previous,
          createMessage(
            'assistant',
            'Something went wrong reaching the agent. Check GEMINI_API_KEY and try again.'
          ),
        ])
      }
    },
    [chatMutation, conversationId, historyQuery]
  )

  useEffect(() => {
    const prompt = searchParams.get('prompt')
    if (!prompt || promptHandledRef.current) return
    promptHandledRef.current = true
    void handleSend(prompt)
    setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams, handleSend])

  const startNew = () => {
    promptHandledRef.current = false
    setMessages([])
    setConversationId(null)
    setSuggestions(['How am I doing?', 'What needs follow-up?', 'Analyze my patterns'])
  }

  const loadConversation = async (id: string) => {
    const data = await agentService.fetchAgentConversation(id)
    setConversationId(data.conversationId)
    const mapped: AgentMessage[] = (data.messages ?? []).map((m, index) => ({
      id: `${id}-${index}`,
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content ?? '',
      createdAt: new Date().toISOString(),
      toolChips:
        m.tool_calls && Array.isArray(m.tool_calls)
          ? (m.tool_calls.filter(Boolean) as string[])
          : undefined,
    }))
    setMessages(mapped)
  }

  return (
    <PageWrapper>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">FLARQ agent</h1>
          <p className="mt-2 max-w-2xl text-text-secondary">
            Ask in natural language — the agent pulls your profile, applications, analytics, and
            drafts follow-ups when it helps.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]">
          <aside className="space-y-3 rounded-xl border border-border bg-surface/50 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-text-primary">History</p>
              <Button type="button" variant="secondary" className="text-xs" onClick={startNew}>
                New
              </Button>
            </div>
            {historyQuery.isLoading ? (
              <Spinner className="h-6 w-6" />
            ) : (
              <ul className="max-h-[520px] space-y-2 overflow-y-auto text-sm">
                {(historyQuery.data ?? []).map((row) => (
                  <li key={row.conversationId}>
                    <button
                      type="button"
                      onClick={() => void loadConversation(row.conversationId)}
                      className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                        conversationId === row.conversationId
                          ? 'border-indigo-500 bg-indigo-500/10'
                          : 'border-transparent hover:border-border hover:bg-background'
                      }`}
                    >
                      <p className="line-clamp-2 text-text-primary">{row.preview || 'Chat'}</p>
                      <p className="text-[10px] text-text-muted">
                        {row.messageCount} msgs ·{' '}
                        {row.updatedAt ? new Date(row.updatedAt).toLocaleString() : ''}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          <AgentChatPanel
            messages={orderedMessages}
            isSending={isSending}
            suggestions={suggestions}
            onSend={handleSend}
            onPickSuggestion={(s) => void handleSend(s)}
          />
        </div>
      </div>
    </PageWrapper>
  )
}
