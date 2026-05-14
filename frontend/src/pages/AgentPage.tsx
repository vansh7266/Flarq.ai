import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Settings } from 'lucide-react'
import { Navbar } from '../components/layout/Navbar'
import { AgentChatPanel } from '../components/agent/AgentChatPanel'
import { useAgentChat, useAgentHistory } from '../hooks/useAgent'
import { useAuth } from '../hooks/useAuth'
import { usePageTitle } from '../hooks/usePageTitle'
import * as agentService from '../services/agentService'
import type { AgentMessage } from '../types/agent.types'

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

function initials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || 'Flarq'
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function timeAgo(iso?: string | null) {
  if (!iso) return ''
  const parsed = Date.parse(iso)
  if (Number.isNaN(parsed)) return ''
  const minutes = Math.max(0, Math.floor((Date.now() - parsed) / 60000))
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  return hours < 24 ? `${hours}h` : `${Math.floor(hours / 24)}d`
}

export function AgentPage() {
  usePageTitle('Agent')
  const { isAuthenticated, user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([
    'How am I doing?',
    'What needs follow-up?',
    'Show analytics',
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
            : ['How am I doing?', 'What needs follow-up?', 'Show analytics']
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
            'Something went wrong reaching the agent. Check Vertex AI auth and try again.'
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
    setSuggestions(['How am I doing?', 'What needs follow-up?', 'Show analytics'])
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
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="flex h-[calc(100vh-64px)]">
        <aside className="hidden w-[280px] shrink-0 flex-col bg-slate-900 text-white md:flex">
          <div className="border-b border-white/10 p-5">
            <div>
              <p className="text-2xl font-extrabold tracking-normal">flarq</p>
              <p className="text-sm font-semibold text-teal-400">Agent</p>
            </div>
            <button
              type="button"
              className="teal-cta mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold text-white"
              onClick={startNew}
            >
              <Plus className="h-4 w-4" />
              New conversation
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {historyQuery.data && historyQuery.data.length > 0 ? (
              <div className="space-y-1">
                {historyQuery.data.map((row) => (
                  <button
                    key={row.conversationId}
                    type="button"
                    onClick={() => void loadConversation(row.conversationId)}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-3 text-left transition hover:bg-slate-800 ${
                      conversationId === row.conversationId
                        ? 'border-l-[3px] border-teal-400 bg-slate-800'
                        : 'border-l-[3px] border-transparent'
                    }`}
                  >
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-100">
                      {row.preview || 'Conversation'}
                    </span>
                    <span className="text-xs text-slate-400">{timeAgo(row.updatedAt)}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-center text-sm text-slate-400">
                No conversations yet.
              </div>
            )}
          </div>

          <div className="border-t border-white/10 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-extrabold text-white">
                {initials(user?.fullName, user?.email)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{user?.fullName ?? 'Flarq user'}</p>
                <p className="text-xs text-slate-400">Workspace</p>
              </div>
              <Settings className="h-4 w-4 text-slate-400" />
            </div>
          </div>
        </aside>

        <AgentChatPanel
          messages={orderedMessages}
          isSending={isSending}
          suggestions={suggestions}
          onSend={handleSend}
          onPickSuggestion={(text) => void handleSend(text)}
        />
      </div>
    </div>
  )
}
