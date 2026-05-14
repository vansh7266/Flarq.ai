/** Types aligned with Flarq backend / Gemini JSON (snake_case). */

export interface JdRequiredSkill {
  name: string
  category: 'technical' | 'soft' | 'tool' | 'language'
  importance: 'must-have' | 'nice-to-have'
}

export interface JdAnalysis {
  job_title: string
  company_name: string | null
  employment_type: 'full-time' | 'part-time' | 'contract' | 'internship' | null
  experience_required: {
    min_years: number | null
    max_years: number | null
    level: 'entry' | 'mid' | 'senior' | 'lead' | 'executive' | null
  }
  required_skills: JdRequiredSkill[]
  responsibilities: string[]
  benefits: string[]
  location: string | null
  remote_policy: 'remote' | 'hybrid' | 'onsite' | null
  salary_range: {
    min: number | null
    max: number | null
    currency: string | null
  } | null
  company_size: string | null
  industry: string | null
}

export interface GapAnalysis {
  match_score: number
  match_level: 'strong' | 'good' | 'fair' | 'weak'
  matching_skills: { skill: string; importance: 'must-have' | 'nice-to-have' }[]
  missing_skills: {
    skill: string
    importance: 'must-have' | 'nice-to-have'
    how_to_acquire: string
  }[]
  experience_match: {
    required_years: number | null
    candidate_years: number
    verdict: 'overqualified' | 'match' | 'slightly-under' | 'underqualified'
  }
  strengths: string[]
  weaknesses: string[]
  recommendation: string
  application_strategy: string
}

export interface CoverLetterResult {
  subject_line: string
  body: string
  word_count: number
  key_points_highlighted: string[]
}

export type CoverTone = 'professional' | 'conversational' | 'bold'
