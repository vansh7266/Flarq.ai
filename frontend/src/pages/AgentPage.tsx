import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Settings } from 'lucide-react'
import { AgentChatPanel } from '../components/agent/AgentChatPanel'
import { FlarqOrb } from '../components/ui/FlarqOrb'
import { useAgentHistory } from '../hooks/useAgent'
import { useAuth } from '../hooks/useAuth'
import { usePageTitle } from '../hooks/usePageTitle'
import * as agentService from '../services/agentService'
import { streamChat } from '../services/api'
import type { AgentMessage, ToolExecutionEntry } from '../types/agent.types'
import { initials } from '../utils/helpers'

function createMessage(
  role: AgentMessage['role'],
  content: string,
  toolChips?: string[],
  isStreaming?: boolean
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
    isStreaming,
  }
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
  const historyQuery = useAgentHistory(isAuthenticated)
  const promptHandledRef = useRef(false)

  // ── Streaming state ──
  const [isSending, setIsSending] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [thinkingMessage, setThinkingMessage] = useState<string | null>(null)
  const [toolTimeline, setToolTimeline] = useState<ToolExecutionEntry[]>([])
  const streamingMsgIdRef = useRef<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const orderedMessages = useMemo(
    () => [...messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [messages]
  )

  const handleSend = useCallback(
    async (text: string) => {
      if (isSending) return
      const userMessage = createMessage('user', text)
      setMessages((previous) => [...previous, userMessage])

      // Reset streaming state
      setIsSending(true)
      setIsThinking(true)
      setThinkingMessage('Analyzing your request...')
      setToolTimeline([])

      // Create a placeholder for the streaming assistant message
      const assistantId =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-assistant-${Math.random().toString(16).slice(2)}`
      streamingMsgIdRef.current = assistantId

      const assistantPlaceholder = createMessage('assistant', '', undefined, true)
      assistantPlaceholder.id = assistantId
      setMessages((previous) => [...previous, assistantPlaceholder])

      // Use the callback-based streaming API from api.ts
      const controller = streamChat(text, conversationId, {
        onThinking: (msg) => {
          setIsThinking(true)
          setThinkingMessage(msg)
        },

        onToolStart: (tool, msg) => {
          setIsThinking(false)
          setToolTimeline((prev) => [
            ...prev,
            { tool, message: msg, status: 'running' },
          ])
        },

        onToolComplete: (tool) => {
          setToolTimeline((prev) =>
            prev.map((t) =>
              t.tool === tool ? { ...t, status: 'complete' } : t
            )
          )
        },

        onToken: (content) => {
          setIsThinking(false)
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamingMsgIdRef.current
                ? { ...m, content: m.content + content }
                : m
            )
          )
        },

        onDone: (data) => {
          setIsSending(false)
          setIsThinking(false)
          setThinkingMessage(null)
          setConversationId(data.conversation_id)
          setSuggestions(
            data.suggestions && data.suggestions.length >= 3
              ? data.suggestions
              : ['How am I doing?', 'What needs follow-up?', 'Show analytics']
          )
          // Mark message as done streaming and add tool chips
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamingMsgIdRef.current
                ? {
                    ...m,
                    isStreaming: false,
                    toolChips:
                      data.tools_used && data.tools_used.length > 0
                        ? data.tools_used
                        : m.toolChips,
                  }
                : m
            )
          )
          setToolTimeline([])
          void historyQuery.refetch()
        },

        onError: (errorMsg) => {
          setIsSending(false)
          setIsThinking(false)
          setThinkingMessage(null)
          setToolTimeline([])
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamingMsgIdRef.current
                ? {
                    ...m,
                    isStreaming: false,
                    content:
                      m.content ||
                      errorMsg ||
                      'Something went wrong reaching the agent. Check Vertex AI auth and try again.',
                  }
                : m
            )
          )
        },
      })

      abortRef.current = controller
    },
    [conversationId, historyQuery, isSending]
  )

  const handleCancel = useCallback(() => {
    abortRef.current?.abort()
    setIsSending(false)
    setIsThinking(false)
    setThinkingMessage(null)
    setToolTimeline([])
    // Mark the streaming message as done (partial content)
    if (streamingMsgIdRef.current) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === streamingMsgIdRef.current
            ? { ...m, isStreaming: false }
            : m
        )
      )
    }
  }, [])

  useEffect(() => {
    const prompt = searchParams.get('prompt')
    if (!prompt || promptHandledRef.current) return
    promptHandledRef.current = true
    void handleSend(prompt)
    setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams, handleSend])

  const startNew = () => {
    promptHandledRef.current = false
    abortRef.current?.abort()
    setMessages([])
    setConversationId(null)
    setIsSending(false)
    setIsThinking(false)
    setThinkingMessage(null)
    setToolTimeline([])
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
      isStreaming: false,
    }))
    setMessages(mapped)
  }

  return (
    <div className="flex h-screen bg-void text-text">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border/40 bg-card md:flex">
        <div className="border-b border-border p-4">
          <div className="flex items-center gap-3">
            <FlarqOrb size={40} state={isSending ? 'thinking' : 'idle'} />
            <div>
              <p className="font-display font-semibold text-gradient">FLARQ</p>
              <p className="font-mono text-xs text-accent">AGENT</p>
            </div>
          </div>
          <button
            type="button"
            className="grad-neural mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold text-white"
            onClick={startNew}
          >
            <Plus className="h-4 w-4" />
            New Chat
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
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-3 text-left transition hover:bg-surface/50 ${
                    conversationId === row.conversationId
                      ? 'border-l-2 border-accent bg-surface text-text'
                      : 'border-l-2 border-transparent'
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate text-sm text-text-secondary">
                    {row.preview || 'Conversation'}
                  </span>
                  <span className="text-xs text-muted">{timeAgo(row.updatedAt)}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center whitespace-pre-line text-center text-sm text-muted">
              No conversations yet.{'\n'}Ask Flarq anything.
            </div>
          )}
        </div>

        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/20 text-sm font-extrabold text-accent">
              {initials(user?.fullName, user?.email)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-text">{user?.fullName ?? 'Flarq user'}</p>
              <p className="text-xs text-muted">Workspace</p>
            </div>
            <Settings className="h-4 w-4 text-muted transition hover:text-accent" />
          </div>
        </div>
      </aside>

      <AgentChatPanel
        messages={orderedMessages}
        isSending={isSending}
        suggestions={suggestions}
        onSend={handleSend}
        onPickSuggestion={(text) => void handleSend(text)}
        onCancel={handleCancel}
        toolTimeline={toolTimeline}
        isThinking={isThinking}
        thinkingMessage={thinkingMessage}
      />
    </div>
  )
}
