import type { ReactNode } from 'react'
import { cn } from '../../utils/helpers'

interface GlowCardProps {
  children: ReactNode
  gradient?: string
  className?: string
  contentClassName?: string
  hover?: boolean
  onClick?: () => void
}

export function GlowCard({
  children,
  gradient = 'linear-gradient(135deg, #7c5cfc, #38bdf8)',
  className,
  contentClassName,
  hover = true,
  onClick,
}: GlowCardProps) {
  return (
    <div
      className={cn('group relative', onClick && 'cursor-pointer', className)}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div
        className={cn(
          'absolute -inset-px rounded-xl transition-opacity duration-500',
          hover ? 'opacity-0 group-hover:opacity-60' : 'opacity-30'
        )}
        style={{ background: gradient }}
      />
      <div className={cn('relative rounded-xl border border-border bg-card', contentClassName)}>
        {children}
      </div>
    </div>
  )
}
