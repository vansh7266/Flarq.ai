import { useQuery } from '@tanstack/react-query'
import * as applicationService from '../services/applicationService'
import type { ApplicationsResponse } from '../types/application.types'

export function useApplications(enabled: boolean) {
  return useQuery<ApplicationsResponse>({
    queryKey: ['applications'],
    queryFn: () => applicationService.fetchApplications({ limit: 120 }),
    enabled,
  })
}
