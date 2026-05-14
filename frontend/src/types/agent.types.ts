export type AgentMessageRole = 'user' | 'assistant' | 'system'

export interface AgentMessage {
  id: string
  role: AgentMessageRole
  content: string
  createdAt: string
}

export interface AgentChatResponse {
  reply: string
  messages?: AgentMessage[]
}
