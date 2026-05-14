import { api } from './api'
import type { ApiEnvelope } from '../types/auth.types'

export interface AnalyticsOverview {
  totals: {
    applications: number
    response_rate_percent: number
    interview_rate_percent: number
    offer_rate_percent: number
    avg_days_to_response: number | null
  }
  response_rate: Record<string, unknown>
  company_patterns: Record<string, unknown>
  skill_demand: Record<string, unknown>
  timeline: Record<string, unknown>
  cached_at?: string
}

export async function fetchAnalyticsOverview(): Promise<AnalyticsOverview> {
  const { data } = await api.get<ApiEnvelope<AnalyticsOverview>>('/api/v1/analytics/overview')
  if (!data.success || !data.data) {
    throw new Error(data.message)
  }
  return data.data
}

export async function fetchAnalyticsPatterns(): Promise<{
  companies: Record<string, unknown>
  skills: Record<string, unknown>
}> {
  const { data } = await api.get<
    ApiEnvelope<{ companies: Record<string, unknown>; skills: Record<string, unknown> }>
  >('/api/v1/analytics/patterns')
  if (!data.success || !data.data) {
    throw new Error(data.message)
  }
  return data.data
}
