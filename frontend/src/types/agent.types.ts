export type AgentMessageRole = 'user' | 'assistant' | 'system'

export interface AgentMessage {
  id: string
  role: AgentMessageRole
  content: string
  createdAt: string
  toolChips?: string[]
}

export interface AgentConversationSummary {
  conversationId: string
  preview: string
  updatedAt?: string | null
  messageCount: number
}

export interface AgentChatResponse {
  response: string
  toolsUsed: string[]
  conversationId: string
  suggestions: string[]
}
