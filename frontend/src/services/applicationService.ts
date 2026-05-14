import { api } from './api'
import type { ApiEnvelope } from '../types/auth.types'
import type { JobApplication } from '../types/application.types'

export async function fetchApplications(): Promise<JobApplication[]> {
  const { data } = await api.get<ApiEnvelope<JobApplication[]>>(
    '/api/v1/applications'
  )
  if (!data.success) {
    throw new Error(data.message)
  }
  return data.data ?? []
}

export type ApplicationStatus = JobApplication['status']

export async function createApplication(payload: {
  company: string
  roleTitle: string
  status?: ApplicationStatus
  jobDescriptionId?: string
  notes?: string
}): Promise<JobApplication> {
  const { data } = await api.post<ApiEnvelope<JobApplication>>(
    '/api/v1/applications',
    {
      company: payload.company,
      roleTitle: payload.roleTitle,
      status: payload.status ?? 'saved',
      jobDescriptionId: payload.jobDescriptionId,
      notes: payload.notes,
    }
  )
  if (!data.success || !data.data) {
    throw new Error(data.message)
  }
  return data.data
}
