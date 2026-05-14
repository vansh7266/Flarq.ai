export type ApplicationStatus =
  | 'saved'
  | 'applied'
  | 'phone_screen'
  | 'interview'
  | 'offer'
  | 'accepted'
  | 'rejected'
  | 'ghosted'

export type ApplicationPriority = 'high' | 'medium' | 'low'

export interface ApplicationNote {
  text: string
  createdAt?: string | null
}

export interface JobApplication {
  id: string
  userId: string
  companyName: string
  jobTitle: string
  status: ApplicationStatus
  jdId?: string | null
  coverLetterId?: string | null
  appliedDate?: string | null
  lastUpdated?: string | null
  notes: ApplicationNote[]
  source?: string | null
  salaryExpectation?: string | null
  contactName?: string | null
  contactEmail?: string | null
  interviewDates: string[]
  rejectionReason?: string | null
  offerAmount?: string | null
  priority: ApplicationPriority
  tags: string[]
  matchScore?: number | null
  statusHistory: { status?: string; at?: string }[]
  createdAt?: string | null
  updatedAt?: string | null
}

export interface ApplicationsResponse {
  grouped: Record<string, JobApplication[]>
  flat: JobApplication[]
  columnsOrder: string[]
}

export interface StaleApplicationItem {
  applicationId: string
  companyName: string
  jobTitle: string
  status: ApplicationStatus
  daysSinceUpdate: number
  suggestedAction: string
}
