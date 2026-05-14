import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart,
  Cell,
} from 'recharts'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { useAuth } from '../hooks/useAuth'
import * as analyticsService from '../services/analyticsService'
import * as applicationService from '../services/applicationService'
import type { AnalyticsOverview } from '../services/analyticsService'

function useCountUp(target: number, duration = 900) {
  const [v, setV] = useState(0)
  useEffect(() => {
    let raf: number
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration)
      setV(Math.round(target * p))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return v
}
function StatCard({ title, value, suffix = '' }: { title: string; value: number; suffix?: string }) {
  const display = useCountUp(value)
  return (
    <Card className="space-y-1 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{title}</p>
      <p className="text-3xl font-bold text-text-primary">
        {display}
        {suffix}
      </p>
    </Card>
  )
}

function FunnelChart({ counts }: { counts: { applied: number; phone: number; interview: number; offer: number } }) {
  const max = Math.max(1, counts.applied, counts.phone, counts.interview, counts.offer)
  const stages = [
    { label: 'Applied', v: counts.applied, color: '#6366f1' },
    { label: 'Phone', v: counts.phone, color: '#8b5cf6' },
    { label: 'Interview', v: counts.interview, color: '#22c55e' },
    { label: 'Offer', v: counts.offer, color: '#f97316' },
  ]
  return (
    <svg viewBox="0 0 360 200" className="h-48 w-full">
      {stages.map((s, i) => {
        const w = 60 + (s.v / max) * 220
        const x = 180 - w / 2
        const y = 12 + i * 46
        return (
          <g key={s.label}>
            <polygon
              points={`${x},${y} ${x + w},${y} ${x + w - 18},${y + 34} ${x + 18},${y + 34}`}
              fill={s.color}
              opacity={0.85}
            />
            <text x={24} y={y + 22} className="fill-text-primary text-[11px] font-semibold">
              {s.label}
            </text>
            <text x={x + w - 8} y={y + 22} textAnchor="end" className="fill-white text-[11px] font-bold">
              {s.v}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export function AnalyticsPage() {
  const { isAuthenticated } = useAuth()
  const overview = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: analyticsService.fetchAnalyticsOverview,
    enabled: isAuthenticated,
    staleTime: 60_000,
  })
  const stale = useQuery({
    queryKey: ['stale-apps'],
    queryFn: applicationService.fetchStaleApplications,
    enabled: isAuthenticated,
  })

  const data = overview.data as AnalyticsOverview | undefined

  const chartData = useMemo(() => {
    const w = data?.response_rate?.week_over_week as { week?: string; applications?: number }[] | undefined
    if (!w?.length) return []
    return w.map((row) => ({
      week: String(row.week ?? ''),
      count: Number(row.applications ?? 0),
    }))
  }, [data])

  const funnelCounts = useMemo(() => {
    const byStatus = (data?.response_rate?.by_status ?? {}) as Record<string, number>
    return {
      applied: byStatus.applied ?? 0,
      phone: byStatus.phone_screen ?? 0,
      interview: byStatus.interview ?? 0,
      offer: (byStatus.offer ?? 0) + (byStatus.accepted ?? 0),
    }
  }, [data])

  const skillHave = (data?.skill_demand?.top_skills_you_have ?? []) as { name: string; count: number }[]
  const skillMiss = (data?.skill_demand?.top_skills_missing ?? []) as { name: string; count: number }[]

  const bullets = useMemo(() => {
    const miss = (data?.skill_demand?.top_skills_missing ?? []) as { name: string; count: number }[]
    const b: string[] = []
    const insight = String((data?.company_patterns as { top_insight?: string })?.top_insight ?? '')
    if (insight) b.push(insight)
    if (miss[0]) {
      b.push(`Most common missing skill across JDs: ${miss[0].name} (${miss[0].count} mentions).`)
    }
    b.push('Keep linking applications to analyzed JDs so FLARQ can sharpen conversion insights.')
    return b.slice(0, 3)
  }, [data])

  if (overview.isLoading) {
    return (
      <PageWrapper>
        <div className="flex justify-center py-24">
          <Spinner className="h-10 w-10" />
        </div>
      </PageWrapper>
    )
  }

  if (overview.isError || !data) {
    return (
      <PageWrapper>
        <p className="text-danger">Could not load analytics.</p>
      </PageWrapper>
    )
  }

  const totals = data.totals

  return (
    <PageWrapper>
      <div className="space-y-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">Analytics</h1>
          <p className="mt-2 max-w-2xl text-text-secondary">
            FLARQ aggregates your applications, JDs, and outcomes — cached for speed, refreshed every hour.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Total applications" value={totals.applications} />
          <StatCard title="Response rate" value={Math.round(totals.response_rate_percent)} suffix="%" />
          <StatCard title="Interview rate" value={Math.round(totals.interview_rate_percent)} suffix="%" />
          <StatCard
            title="Avg days to movement"
            value={Math.round(totals.avg_days_to_response ?? 0)}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-4">
            <p className="mb-2 text-sm font-semibold text-text-primary">Applications (recent weeks)</p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="flFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} width={32} tick={{ fontSize: 10 }} />
                  <Tooltip labelFormatter={(l) => `Week ${l}`} />
                  <Area type="monotone" dataKey="count" stroke="#4f46e5" fill="url(#flFill)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-4">
            <p className="mb-2 text-sm font-semibold text-text-primary">Stage funnel (snapshot)</p>
            <FunnelChart counts={funnelCounts} />
          </Card>
        </div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="space-y-3 border-indigo-500/30 bg-indigo-500/5 p-5">
            <p className="text-sm font-semibold text-text-primary">Strategy insight</p>
            <p className="text-sm text-text-secondary">
              {(data.company_patterns as { top_insight?: string })?.top_insight}
            </p>
            <p className="text-xs font-semibold uppercase text-text-muted">Flarq recommends</p>
            <ul className="list-inside list-disc space-y-1 text-sm text-text-secondary">
              {bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </Card>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-4">
            <p className="mb-2 text-sm font-semibold text-text-primary">Your most in-demand skills</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={skillHave}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.2} />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {skillHave.map((_, i) => (
                      <Cell key={i} fill="#4f46e5" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card className="p-4">
            <p className="mb-2 text-sm font-semibold text-text-primary">Skills you&apos;re missing (JD aggregate)</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={skillMiss}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.2} />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {skillMiss.map((_, i) => (
                      <Cell key={i} fill="#f97316" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <Card className="space-y-3 border-amber-500/30 bg-amber-500/5 p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-text-primary">Stale applications</p>
            {stale.isLoading ? <Spinner className="h-5 w-5" /> : null}
          </div>
          {stale.data && stale.data.length > 0 ? (
            <ul className="space-y-2">
              {stale.data.map((s) => (
                <li
                  key={s.applicationId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm"
                >
                  <span className="text-text-primary">
                    {s.companyName} — {s.jobTitle}{' '}
                    <span className="text-text-muted">({s.daysSinceUpdate}d idle)</span>
                  </span>
                  <Link
                    to={`/agent?prompt=${encodeURIComponent(
                      `Draft a follow-up for my application to ${s.companyName} for ${s.jobTitle}. Application id: ${s.applicationId}`
                    )}`}
                  >
                    <Button type="button" variant="secondary" className="text-xs">
                      Write follow-up
                    </Button>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-text-secondary">No stale applications in the last week. Nice momentum.</p>
          )}
        </Card>
      </div>
    </PageWrapper>
  )
}
