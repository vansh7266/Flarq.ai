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
        'rounded-xl border border-border bg-white p-6 shadow-sm transition-all duration-200',
        hoverable &&
          'gradient-border-hover hover:-translate-y-0.5 hover:shadow-soft will-change-transform',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
