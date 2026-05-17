export type AgentMessageRole = 'user' | 'assistant' | 'system'

export interface AgentMessage {
  id: string
  role: AgentMessageRole
  content: string
  createdAt: string
  toolChips?: string[]
  /** Whether this message is still receiving streaming tokens */
  isStreaming?: boolean
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

/* ── SSE streaming types ── */

export interface SSEThinkingEvent {
  type: 'thinking'
  message: string
}

export interface SSEToolStartEvent {
  type: 'tool_start'
  tool: string
  message: string
}

export interface SSEToolCompleteEvent {
  type: 'tool_complete'
  tool: string
}

export interface SSETokenEvent {
  type: 'token'
  content: string
}

export interface SSEDoneEvent {
  type: 'done'
  conversation_id: string
  tools_used: string[]
  suggestions: string[]
}

export interface SSEErrorEvent {
  type: 'error'
  message: string
}

export type SSEEvent =
  | SSEThinkingEvent
  | SSEToolStartEvent
  | SSEToolCompleteEvent
  | SSETokenEvent
  | SSEDoneEvent
  | SSEErrorEvent

/** Tracks a single tool's execution state for the timeline */
export interface ToolExecutionEntry {
  tool: string
  message: string
  status: 'running' | 'complete'
}
