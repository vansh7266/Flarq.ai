import { api } from './api'
import type { ApiEnvelope } from '../types/auth.types'
import type {
  ApplicationPriority,
  ApplicationStatus,
  ApplicationsResponse,
  JobApplication,
  StaleApplicationItem,
} from '../types/application.types'

export async function fetchApplications(params?: {
  status?: string
  sort?: 'last_updated' | 'created_at' | 'applied_date'
  limit?: number
}): Promise<ApplicationsResponse> {
  const { data } = await api.get<ApiEnvelope<ApplicationsResponse>>('/api/v1/applications', {
    params: {
      status: params?.status,
      sort: params?.sort ?? 'last_updated',
      limit: params?.limit ?? 80,
    },
  })
  if (!data.success || !data.data) {
    throw new Error(data.message)
  }
  return data.data
}

export async function fetchStaleApplications(): Promise<StaleApplicationItem[]> {
  const { data } = await api.get<ApiEnvelope<{ items: StaleApplicationItem[] }>>(
    '/api/v1/applications/stale'
  )
  if (!data.success) {
    throw new Error(data.message)
  }
  return data.data?.items ?? []
}

export async function createApplication(payload: {
  companyName: string
  jobTitle: string
  status?: ApplicationStatus
  jobDescriptionId?: string
  coverLetterId?: string
  notes?: string
  source?: string
  priority?: ApplicationPriority
  tags?: string[]
  matchScore?: number
}): Promise<JobApplication> {
  const { data } = await api.post<ApiEnvelope<JobApplication>>('/api/v1/applications', {
    companyName: payload.companyName,
    jobTitle: payload.jobTitle,
    status: payload.status ?? 'saved',
    jobDescriptionId: payload.jobDescriptionId,
    coverLetterId: payload.coverLetterId,
    notes: payload.notes,
    source: payload.source,
    priority: payload.priority,
    tags: payload.tags,
    matchScore: payload.matchScore,
  })
  if (!data.success || !data.data) {
    throw new Error(data.message)
  }
  return data.data
}

export async function updateApplication(
  id: string,
  payload: Partial<{
    companyName: string
    jobTitle: string
    status: ApplicationStatus
    jobDescriptionId: string | null
    coverLetterId: string | null
    source: string | null
    priority: ApplicationPriority
    tags: string[]
    matchScore: number | null
  }>
): Promise<JobApplication> {
  const { data } = await api.put<ApiEnvelope<JobApplication>>(`/api/v1/applications/${id}`, {
    ...payload,
    jobDescriptionId: payload.jobDescriptionId,
    coverLetterId: payload.coverLetterId,
  })
  if (!data.success || !data.data) {
    throw new Error(data.message)
  }
  return data.data
}

export async function deleteApplication(id: string): Promise<void> {
  const { data } = await api.delete<ApiEnvelope<null>>(`/api/v1/applications/${id}`)
  if (!data.success) {
    throw new Error(data.message)
  }
}

export async function appendApplicationNote(id: string, text: string): Promise<JobApplication> {
  const { data } = await api.post<ApiEnvelope<JobApplication>>(
    `/api/v1/applications/${id}/notes`,
    { text }
  )
  if (!data.success || !data.data) {
    throw new Error(data.message)
  }
  return data.data
}

export async function addApplicationInterview(id: string, scheduledAt: string): Promise<JobApplication> {
  const { data } = await api.post<ApiEnvelope<JobApplication>>(
    `/api/v1/applications/${id}/interview`,
    { scheduledAt }
  )
  if (!data.success || !data.data) {
    throw new Error(data.message)
  }
  return data.data
}
