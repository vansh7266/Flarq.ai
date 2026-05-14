import { Badge } from '../ui/Badge'
import type { ApplicationStatus } from '../../types/application.types'

interface StatusBadgeProps {
  status: ApplicationStatus | string
}

const labels: Record<string, string> = {
  saved: 'Saved',
  applied: 'Applied',
  phone_screen: 'Phone',
  interview: 'Interview',
  offer: 'Offer',
  accepted: 'Accepted',
  rejected: 'Rejected',
  ghosted: 'Ghosted',
  interviewing: 'Interview',
  withdrawn: 'Withdrawn',
}

const variants: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'outline'> = {
  saved: 'outline',
  applied: 'default',
  phone_screen: 'default',
  interview: 'warning',
  offer: 'success',
  accepted: 'success',
  rejected: 'danger',
  ghosted: 'outline',
  interviewing: 'warning',
  withdrawn: 'outline',
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const key = String(status)
  return (
    <Badge variant={variants[key] ?? 'outline'}>{labels[key] ?? key}</Badge>
  )
}
