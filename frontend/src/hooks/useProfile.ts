import { useQuery } from '@tanstack/react-query'
import * as profileService from '../services/profileService'

export function useProfile(enabled: boolean) {
  return useQuery({
    queryKey: ['profile'],
    queryFn: profileService.fetchProfile,
    enabled,
  })
}
