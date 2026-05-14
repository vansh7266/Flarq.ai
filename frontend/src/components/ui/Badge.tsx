import { type HTMLAttributes } from 'react'
import { cn } from '../../utils/helpers'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'outline'

const variants: Record<BadgeVariant, string> = {
  default: 'bg-primary/15 text-primary border border-primary/30',
  success: 'bg-success/15 text-success border border-success/30',
  warning: 'bg-warning/15 text-warning border border-warning/30',
  danger: 'bg-danger/15 text-danger border border-danger/30',
  outline: 'border border-border text-text-secondary',
}

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

export function Badge({
  className,
  variant = 'default',
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className
      )}
      {...props}
    />
  )
}
