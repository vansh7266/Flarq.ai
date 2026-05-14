import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Bot, Briefcase, FileSearch, LayoutPanelTop, Trophy } from 'lucide-react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Skeleton } from '../components/ui/Skeleton'
import { StatusBadge } from '../components/applications/StatusBadge'
import * as applicationService from '../services/applicationService'
import { useAuth } from '../hooks/useAuth'
import { useApplications } from '../hooks/useApplications'
import { usePageTitle } from '../hooks/usePageTitle'
import type { JobApplication } from '../types/application.types'

function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      setValue(Math.round(target * progress))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, duration])
  return value
}

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function daysAgo(app: JobApplication) {
  const raw = app.lastUpdated ?? app.updatedAt ?? app.createdAt
  if (!raw) return 'Recently'
  const parsed = Date.parse(raw)
  if (Number.isNaN(parsed)) return 'Recently'
  const days = Math.max(0, Math.floor((Date.now() - parsed) / 86400000))
  return days === 0 ? 'Today' : `${days}d ago`
}

function StatCard({
  title,
  value,
  suffix = '',
  icon: Icon,
}: {
  title: string
  value: number
  suffix?: string
  icon: typeof Briefcase
}) {
  const display = useCountUp(value)
  return (
    <Card className="gradient-border p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-text-secondary">{title}</p>
          <p className="mt-3 text-4xl font-extrabold leading-none text-text-primary">
            {display}
            {suffix}
          </p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-light text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  )
}

function RocketSketch() {
  return (
    <svg viewBox="0 0 180 150" className="mx-auto h-36 w-44 text-primary" aria-hidden="true">
      <path
        d="M92 20 C118 34 128 62 118 94 L98 86 L82 102 L70 80 C75 52 82 34 92 20Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="1000"
        className="animate-draw-in"
      />
      <path d="M76 92 L50 116" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M102 88 L124 110" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <circle cx="96" cy="56" r="9" fill="#ccfbf1" stroke="currentColor" strokeWidth="4" />
      <path d="M78 106 C64 112 58 124 54 136" fill="none" stroke="#0891b2" strokeWidth="3" strokeLinecap="round" />
      <path d="M91 105 C84 118 82 128 82 140" fill="none" stroke="#0891b2" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export function DashboardPage() {
  usePageTitle('Dashboard')
  const { isAuthenticated, user } = useAuth()
  const appsQuery = useApplications(isAuthenticated)
  const stale = useQuery({
    queryKey: ['stale-apps'],
    queryFn: applicationService.fetchStaleApplications,
    enabled: isAuthenticated,
  })

  const applications = useMemo(() => appsQuery.data?.flat ?? [], [appsQuery.data])
  const recent = useMemo(
    () =>
      [...applications]
        .sort((a, b) =>
          String(b.lastUpdated ?? b.updatedAt ?? b.createdAt ?? '').localeCompare(
            String(a.lastUpdated ?? a.updatedAt ?? a.createdAt ?? '')
          )
        )
        .slice(0, 5),
    [applications]
  )

  const interviews = applications.filter((app) =>
    ['phone_screen', 'interview'].includes(app.status)
  ).length
  const offers = applications.filter((app) =>
    ['offer', 'accepted'].includes(app.status)
  ).length
  const responseRate = applications.length
    ? Math.round(((interviews + offers) / applications.length) * 100)
    : 0

  const isEmpty = !appsQuery.isLoading && applications.length === 0
  const name = user?.fullName?.split(' ')[0] ?? 'there'

  return (
    <PageWrapper>
      <div className="space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-text-primary sm:text-4xl">
              {greeting()}, {name}.
            </h1>
            <p className="mt-2 max-w-2xl text-text-secondary">
              Your job search command center is ready when you are.
            </p>
          </div>
          <Link to="/analyze">
            <Button type="button" className="h-11">
              Analyze a job
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {stale.data && stale.data.length > 0 ? (
          <Link
            to="/applications"
            className="block rounded-2xl border border-primary/30 bg-primary-light/70 px-5 py-4 text-sm font-semibold text-primary transition hover:border-primary"
          >
            {stale.data.length} applications need follow-up <ArrowRight className="ml-2 inline h-4 w-4" />
          </Link>
        ) : null}

        {isEmpty ? (
          <Card className="py-10 text-center">
            <RocketSketch />
            <h2 className="mt-4 text-2xl font-extrabold text-text-primary">
              Welcome to Flarq. Let&apos;s find you a job.
            </h2>
            <div className="mx-auto mt-8 grid max-w-3xl gap-4 md:grid-cols-3">
              {[
                ['Upload resume', '/profile'],
                ['Analyze a JD', '/analyze'],
                ['Track apps', '/applications'],
              ].map(([label, to]) => (
                <Link
                  key={label}
                  to={to}
                  className="rounded-xl border border-border bg-surface px-4 py-4 text-sm font-semibold text-text-secondary transition hover:border-primary hover:text-primary"
                >
                  {label}
                </Link>
              ))}
            </div>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {appsQuery.isLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-32" />
                ))
              ) : (
                <>
                  <StatCard title="Total Applications" value={applications.length} icon={Briefcase} />
                  <StatCard title="Interviews" value={interviews} icon={LayoutPanelTop} />
                  <StatCard title="Offers" value={offers} icon={Trophy} />
                  <StatCard title="Response Rate" value={responseRate} suffix="%" icon={FileSearch} />
                </>
              )}
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
              <Card className="p-0">
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                  <h2 className="text-lg font-extrabold text-text-primary">Recent Applications</h2>
                  <Link to="/applications" className="text-sm font-semibold text-primary hover:text-primary-hover">
                    View all <ArrowRight className="inline h-4 w-4" />
                  </Link>
                </div>
                <div className="divide-y divide-border">
                  {recent.map((app) => (
                    <div key={app.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                      <div>
                        <p className="font-bold text-text-primary">{app.companyName}</p>
                        <p className="text-sm text-text-secondary">{app.jobTitle}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={app.status} />
                        <span className="text-xs font-semibold text-text-muted">{daysAgo(app)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <div className="grid gap-4">
                {[
                  ['Analyze a job', '/analyze', FileSearch],
                  ['View Kanban', '/applications', LayoutPanelTop],
                  ['Ask Flarq', '/agent', Bot],
                ].map(([label, to, Icon]) => (
                  <Link key={String(label)} to={String(to)}>
                    <motion.div
                      whileHover={{ y: -2 }}
                      className="group flex min-h-28 items-center justify-between rounded-2xl border border-border bg-white p-5 shadow-sm transition hover:border-primary hover:shadow-soft"
                    >
                      <div>
                        <p className="text-lg font-extrabold text-text-primary">{String(label)}</p>
                        <p className="text-sm text-text-secondary">Open workspace</p>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-light text-primary group-hover:teal-cta group-hover:text-white">
                        <Icon className="h-5 w-5" />
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </PageWrapper>
  )
}
