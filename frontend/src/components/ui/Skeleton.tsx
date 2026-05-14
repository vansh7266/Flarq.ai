import { cn } from '../../utils/helpers'

export interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'shimmer-surface animate-shimmer rounded-lg',
        className
      )}
    />
  )
}
