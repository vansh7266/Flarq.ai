import { api } from './api'
import type { ApiEnvelope } from '../types/auth.types'
import type {
  CoverLetterResult,
  CoverTone,
  GapAnalysis,
  JdAnalysis,
} from '../types/job.types'

export async function analyzeJobDescription(
  jdText: string
): Promise<{ jd_id: string; analysis: JdAnalysis }> {
  const { data } = await api.post<
    ApiEnvelope<{ jd_id: string; analysis: JdAnalysis } | null>
  >('/api/v1/jobs/analyze', { jd_text: jdText })
  if (!data.success || !data.data) {
    throw new Error(data.message)
  }
  return data.data
}

export async function runGapAnalysis(
  profileId: string,
  jdText: string
): Promise<{ jd_id: string; jd_analysis: JdAnalysis; gap_analysis: GapAnalysis }> {
  const { data } = await api.post<
    ApiEnvelope<{
      jd_id: string
      jd_analysis: JdAnalysis
      gap_analysis: GapAnalysis
    } | null>
  >('/api/v1/jobs/gap-analysis', { profile_id: profileId, jd_text: jdText })
  if (!data.success || !data.data) {
    throw new Error(data.message)
  }
  return data.data
}

export async function generateCoverLetterApi(
  profileId: string,
  jdId: string,
  tone: CoverTone
): Promise<{
  cover_letter_id: string
  version: number
  cover_letter: CoverLetterResult
  gap_analysis: GapAnalysis
}> {
  const { data } = await api.post<
    ApiEnvelope<{
      cover_letter_id: string
      version: number
      cover_letter: CoverLetterResult
      gap_analysis: GapAnalysis
    } | null>
  >('/api/v1/jobs/cover-letter', {
    profile_id: profileId,
    jd_id: jdId,
    tone,
  })
  if (!data.success || !data.data) {
    throw new Error(data.message)
  }
  return data.data
}
