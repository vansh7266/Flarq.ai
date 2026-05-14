export type ApplicationStatus =
  | 'saved'
  | 'applied'
  | 'interviewing'
  | 'offer'
  | 'rejected'
  | 'withdrawn'

export interface JobApplication {
  id: string
  userId: string
  company: string
  roleTitle: string
  status: ApplicationStatus
  jobDescriptionId?: string
  notes?: string
  appliedAt?: string
  nextFollowUpAt?: string
  createdAt: string
  updatedAt: string
}
