import type { LucideIcon } from 'lucide-react'
import { ArrowUpRight } from 'lucide-react'
import { useCountUp } from '../../hooks/useCountUp'
import { cn } from '../../utils/helpers'
import { GlowCard } from './GlowCard'

interface StatCardProps {
  title: string
  value: number
  suffix?: string
  icon: LucideIcon
  gradient?: string
  trend?: string
  className?: string
}

export function StatCard({
  title,
  value,
  suffix = '',
  icon: Icon,
  gradient = 'linear-gradient(135deg, #7c5cfc, #38bdf8)',
  trend = '+0% this week',
  className,
}: StatCardProps) {
  const display = useCountUp(value)

  return (
    <GlowCard gradient={gradient} className={className} contentClassName="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted">{title}</p>
          <p className="mt-3 font-display text-4xl font-bold leading-none text-text">
            {display}
            {suffix}
          </p>
          <p className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-emerald">
            <ArrowUpRight className="h-3.5 w-3.5" />
            {trend}
          </p>
        </div>
        <div
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-glow'
          )}
          style={{ background: gradient }}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </GlowCard>
  )
}
