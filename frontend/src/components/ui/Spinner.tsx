import { cn } from '../../utils/helpers'

export interface SpinnerProps {
  className?: string
  label?: string
}

export function Spinner({ className, label }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label ?? 'Loading'}
      className={cn(
        'inline-flex h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary',
        className
      )}
    />
  )
}
