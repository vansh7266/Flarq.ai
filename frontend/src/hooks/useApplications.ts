import { useQuery } from '@tanstack/react-query'
import * as applicationService from '../services/applicationService'

export function useApplications(enabled: boolean) {
  return useQuery({
    queryKey: ['applications'],
    queryFn: applicationService.fetchApplications,
    enabled,
  })
}
