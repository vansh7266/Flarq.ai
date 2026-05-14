import { api } from './api'
import type { ApiEnvelope } from '../types/auth.types'
import type {
  ParsedResumeData,
  UploadResumeResponse,
  UserProfile,
} from '../types/profile.types'

export async function fetchProfile(): Promise<UserProfile | null> {
  const { data } = await api.get<ApiEnvelope<UserProfile | null>>('/api/v1/profile')
  if (!data.success) {
    throw new Error(data.message)
  }
  return data.data
}

export async function updateProfile(
  payload: Partial<{
    headline: string
    summary: string
    skills: string[]
    parsedResume: ParsedResumeData
  }>
): Promise<UserProfile | null> {
  const { data } = await api.put<ApiEnvelope<UserProfile | null>>(
    '/api/v1/profile',
    payload
  )
  if (!data.success) {
    throw new Error(data.message)
  }
  return data.data
}

export async function uploadResume(
  file: File,
  onProgress?: (percent: number) => void
): Promise<UploadResumeResponse> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post<ApiEnvelope<UploadResumeResponse>>(
    '/api/v1/profile/upload-resume',
    form,
    {
      onUploadProgress: (event) => {
        if (!onProgress || !event.total) {
          return
        }
        onProgress(Math.round((event.loaded / event.total) * 100))
      },
    }
  )
  if (!data.success || !data.data) {
    throw new Error(data.message)
  }
  return data.data
}

export async function confirmParsedResume(
  payload: ParsedResumeData
): Promise<UserProfile | null> {
  const { data } = await api.post<ApiEnvelope<UserProfile | null>>(
    '/api/v1/profile/confirm-parsed-resume',
    payload
  )
  if (!data.success) {
    throw new Error(data.message)
  }
  return data.data
}
