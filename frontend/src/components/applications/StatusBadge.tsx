import { Badge } from '../ui/Badge'
import type { ApplicationStatus } from '../../types/application.types'

interface StatusBadgeProps {
  status: ApplicationStatus
}

const labels: Record<ApplicationStatus, string> = {
  saved: 'Saved',
  applied: 'Applied',
  interviewing: 'Interviewing',
  offer: 'Offer',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
}

const variants: Record<
  ApplicationStatus,
  'default' | 'success' | 'warning' | 'danger' | 'outline'
> = {
  saved: 'outline',
  applied: 'default',
  interviewing: 'warning',
  offer: 'success',
  rejected: 'danger',
  withdrawn: 'outline',
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return <Badge variant={variants[status]}>{labels[status]}</Badge>
}
