import { api } from './api'
import type { ApiEnvelope } from '../types/auth.types'
import type { AgentChatResponse, AgentConversationSummary } from '../types/agent.types'

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
