import { api } from './api'
import type { ApiEnvelope } from '../types/auth.types'
import type { AgentChatResponse, AgentConversationSummary, SSEEvent } from '../types/agent.types'
import { API_BASE_URL } from '../utils/constants'
import { useAuthStore } from '../store/authStore'

export async function sendAgentMessage(
  message: string,
  conversationId?: string | null,
  signal?: AbortSignal
): Promise<AgentChatResponse> {
  const { data } = await api.post<ApiEnvelope<AgentChatResponse>>(
    '/api/v1/agent/chat',
    { message, conversationId: conversationId ?? undefined },
    { signal }
  )
  if (!data.success || data.data == null) {
    throw new Error(data.message)
  }
  return data.data
}

/**
 * Stream agent responses via SSE. Calls `onEvent` for each parsed SSE event.
 * Returns a cleanup function that aborts the fetch.
 */
export function streamAgentMessage(
  message: string,
  conversationId: string | null | undefined,
  onEvent: (event: SSEEvent) => void,
  signal?: AbortSignal
): { cancel: () => void } {
  const controller = new AbortController()
  const combinedSignal = signal
    ? AbortSignal.any([signal, controller.signal])
    : controller.signal

  const doStream = async () => {
    const token = useAuthStore.getState().accessToken
    const response = await fetch(`${API_BASE_URL}/api/v1/agent/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        message,
        conversationId: conversationId ?? undefined,
      }),
      signal: combinedSignal,
    })

    if (!response.ok) {
      onEvent({ type: 'error', message: `Server error: ${response.status}` })
      return
    }

    const reader = response.body?.getReader()
    if (!reader) {
      onEvent({ type: 'error', message: 'No response stream' })
      return
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      // Keep the last incomplete line in the buffer
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data: ')) continue
        const jsonStr = trimmed.slice(6)
        try {
          const event: SSEEvent = JSON.parse(jsonStr)
          onEvent(event)
        } catch {
          // skip malformed JSON
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim().startsWith('data: ')) {
      const jsonStr = buffer.trim().slice(6)
      try {
        const event: SSEEvent = JSON.parse(jsonStr)
        onEvent(event)
      } catch {
        // skip
      }
    }
  }

  doStream().catch((err) => {
    if (err instanceof DOMException && err.name === 'AbortError') return
    onEvent({ type: 'error', message: err instanceof Error ? err.message : 'Stream failed' })
  })

  return { cancel: () => controller.abort() }
}

export async function fetchAgentHistory(): Promise<AgentConversationSummary[]> {
  const { data } = await api.get<ApiEnvelope<AgentConversationSummary[]>>('/api/v1/agent/history')
  if (!data.success) {
    throw new Error(data.message)
  }
  return data.data ?? []
}

export async function fetchAgentConversation(conversationId: string): Promise<{
  conversationId: string
  messages: { role: string; content: string; tool_calls?: string[] | null }[]
}> {
  const { data } = await api.get<
    ApiEnvelope<{
      conversationId: string
      messages: { role: string; content: string; tool_calls?: string[] | null }[]
    }>
  >(`/api/v1/agent/conversations/${conversationId}`)
  if (!data.success || !data.data) {
    throw new Error(data.message)
  }
  return data.data
}
