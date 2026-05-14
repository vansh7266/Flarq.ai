import { api } from './api'
import type { ApiEnvelope } from '../types/auth.types'
import type { AgentChatResponse, AgentMessage } from '../types/agent.types'

export async function sendAgentMessage(
  message: string
): Promise<AgentChatResponse> {
  const { data } = await api.post<ApiEnvelope<AgentChatResponse>>(
    '/api/v1/agent/chat',
    { message }
  )
  if (!data.success || data.data == null) {
    throw new Error(data.message)
  }
  return data.data
}

export async function fetchAgentHistory(): Promise<AgentMessage[]> {
  const { data } = await api.get<ApiEnvelope<AgentMessage[]>>(
    '/api/v1/agent/history'
  )
  if (!data.success) {
    throw new Error(data.message)
  }
  return data.data ?? []
}
