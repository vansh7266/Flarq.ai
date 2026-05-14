export type SkillCategory = 'technical' | 'soft' | 'tool' | 'language'

export type SkillProficiency = 'beginner' | 'intermediate' | 'advanced' | 'expert'

export interface ParsedSkill {
  name: string
  category: SkillCategory
  proficiency: SkillProficiency
}

export interface ParsedExperience {
  company: string
  title: string
  start_date: string
  end_date: string | 'present'
  description: string
  key_achievements: string[]
}

export interface ParsedEducation {
  institution: string
  degree: string
  field: string
  graduation_year: number | null
}

export interface ParsedResumeData {
  full_name: string
  email: string | null
  phone: string | null
  location: string | null
  summary: string | null
  total_years_experience: number
  skills: ParsedSkill[]
  experience: ParsedExperience[]
  education: ParsedEducation[]
  certifications: string[]
  languages: string[]
}

export interface UserProfile {
  userId: string
  headline?: string
  summary?: string
  skills: string[]
  parsedResume?: ParsedResumeData | null
  resumeFileName?: string
  resumeUploadedAt?: string
  profileCompleteness: number
  skillCategoryCounts: Record<string, number>
  updatedAt: string
}

export interface UploadResumeResponse {
  profile_id: string
  parsed_data: ParsedResumeData
}
