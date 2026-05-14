import { useMutation, useQuery } from '@tanstack/react-query'
import * as agentService from '../services/agentService'

export function useAgentHistory(enabled: boolean) {
  return useQuery({
    queryKey: ['agent-history'],
    queryFn: agentService.fetchAgentHistory,
    enabled,
  })
}

export function useAgentChat() {
  return useMutation({
    mutationFn: ({
      message,
      conversationId,
      signal,
    }: {
      message: string
      conversationId?: string | null
      signal?: AbortSignal
    }) => agentService.sendAgentMessage(message, conversationId, signal),
  })
}
