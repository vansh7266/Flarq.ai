import { type HTMLAttributes } from 'react'
import { cn } from '../../utils/helpers'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean
}

export function Card({
  className,
  hoverable = false,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-surface p-6 shadow-sm transition-transform duration-200',
        hoverable &&
          'hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-glow will-change-transform',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
