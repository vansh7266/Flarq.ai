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
import { Skeleton } from '../components/ui/Skeleton'
import { useAuth } from '../hooks/useAuth'
import { usePageTitle } from '../hooks/usePageTitle'
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
    <Card className="gradient-border space-y-1 p-4">
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
    { label: 'Applied', v: counts.applied, gradient: 'grad-neural' },
    { label: 'Phone', v: counts.phone, gradient: 'grad-horizon' },
    { label: 'Interview', v: counts.interview, gradient: 'grad-sunset' },
    { label: 'Offer', v: counts.offer, gradient: 'grad-aurora' },
  ]
  return (
    <div className="space-y-4">
      {stages.map((stage) => {
        const width = Math.max(8, (stage.v / max) * 100)
        return (
          <div key={stage.label}>
            <div className="mb-1 flex items-center justify-between text-xs text-muted">
              <span>{stage.label}</span>
              <span>{stage.v}</span>
            </div>
            <div className="h-10 overflow-hidden rounded-full bg-surface">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${width}%` }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                className={`h-full rounded-full ${stage.gradient}`}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function AnalyticsPage() {
  usePageTitle('Analytics')
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
    b.push('Keep linking applications to analyzed JDs so Flarq can sharpen conversion insights.')
    return b.slice(0, 3)
  }, [data])

  if (overview.isLoading) {
    return (
      <PageWrapper>
        <div className="space-y-6">
          <Skeleton className="h-20" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-80" />
        </div>
      </PageWrapper>
    )
  }

  if (overview.isError || !data) {
    return (
      <PageWrapper>
        <Card className="border-danger/25 bg-red-50">
          <p className="font-bold text-danger">Could not load analytics.</p>
          <p className="mt-1 text-sm text-red-700">Refresh the page or try again after the API is reachable.</p>
        </Card>
      </PageWrapper>
    )
  }

  const totals = data.totals

  return (
    <PageWrapper>
      <div className="space-y-10">
        <div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold text-gradient sm:text-4xl">
                Your job search at a glance
              </h1>
              <p className="mt-2 max-w-2xl text-text-secondary">Data from your applications</p>
            </div>
            <select className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-text">
              <option>Last 30 days</option>
            </select>
          </div>
        </div>

        {stale.data && stale.data.length > 0 ? (
          <Card className="border-primary/25 bg-primary-light/60 p-4">
            <p className="text-sm font-semibold text-primary">
              {stale.data.length} applications are ready for follow-up.
            </p>
          </Card>
        ) : null}

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
                      <stop offset="0%" stopColor="#7c5cfc" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#7c5cfc" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} width={32} tick={{ fontSize: 10 }} />
                  <Tooltip labelFormatter={(l) => `Week ${l}`} />
                  <Area type="monotone" dataKey="count" stroke="#38bdf8" fill="url(#flFill)" strokeWidth={2} />
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
          <Card className="space-y-3 border-l-[3px] border-l-primary p-5">
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
                      <Cell key={i} fill="#34d399" />
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
                      <Cell key={i} fill="#f472b6" />
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
