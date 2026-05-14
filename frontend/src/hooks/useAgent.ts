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
    mutationFn: agentService.sendAgentMessage,
  })
}
