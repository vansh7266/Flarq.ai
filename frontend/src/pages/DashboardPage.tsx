import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Bot, Briefcase, FileSearch, LayoutPanelTop, Trophy } from 'lucide-react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Button } from '../components/ui/Button'
import { GlowCard } from '../components/ui/GlowCard'
import { Skeleton } from '../components/ui/Skeleton'
import { StatCard } from '../components/ui/StatCard'
import { StatusBadge } from '../components/applications/StatusBadge'
import { FlarqOrb } from '../components/ui/FlarqOrb'
import * as applicationService from '../services/applicationService'
import { useAuth } from '../hooks/useAuth'
import { useApplications } from '../hooks/useApplications'
import { usePageTitle } from '../hooks/usePageTitle'
import type { JobApplication } from '../types/application.types'

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

const gradients = {
  neural: 'linear-gradient(135deg, #7c5cfc, #38bdf8)',
  horizon: 'linear-gradient(135deg, #34d399, #38bdf8)',
  aurora: 'linear-gradient(135deg, #7c5cfc, #f472b6)',
  sunset: 'linear-gradient(135deg, #f5a623, #f472b6)',
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
  const offers = applications.filter((app) => ['offer', 'accepted'].includes(app.status)).length
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
            <p className="text-sm font-medium text-text-secondary">{greeting()},</p>
            <h1 className="font-display text-4xl font-bold text-gradient">{name}.</h1>
          </div>
          <Link to="/analyze">
            <Button type="button" className="h-11 grad-sunset text-void hover:glow-amber">
              Analyze a job
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {stale.data && stale.data.length > 0 ? (
          <GlowCard gradient="linear-gradient(135deg, #ef4444, #f472b6)" contentClassName="p-4">
            <Link to="/applications" className="flex items-center gap-3 text-sm font-semibold text-rose">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-rose" />
              {stale.data.length} applications need follow-up
              <ArrowRight className="h-4 w-4" />
            </Link>
          </GlowCard>
        ) : null}

        {isEmpty ? (
          <GlowCard contentClassName="py-12 text-center">
            <FlarqOrb size={88} className="mx-auto" />
            <h2 className="mt-6 font-display text-3xl font-bold text-gradient">Welcome to Flarq</h2>
            <p className="mt-2 text-text-secondary">Start with your profile, then analyze a role.</p>
            <div className="mx-auto mt-8 grid max-w-3xl gap-4 md:grid-cols-3">
              {[
                ['Upload resume', '/profile'],
                ['Analyze a role', '/analyze'],
                ['Track applications', '/applications'],
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
          </GlowCard>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {appsQuery.isLoading ? (
                Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-32" />)
              ) : (
                <>
                  <StatCard title="Applications" value={applications.length} icon={Briefcase} gradient={gradients.neural} />
                  <StatCard title="Interviews" value={interviews} icon={LayoutPanelTop} gradient={gradients.horizon} />
                  <StatCard title="Offers" value={offers} icon={Trophy} gradient={gradients.aurora} />
                  <StatCard title="Response Rate" value={responseRate} suffix="%" icon={FileSearch} gradient={gradients.sunset} />
                </>
              )}
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
              <GlowCard contentClassName="p-0">
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                  <h2 className="font-display text-lg font-semibold">Recent Applications</h2>
                  <Link to="/applications" className="text-sm font-semibold text-primary hover:text-primary-light">
                    View all <ArrowRight className="inline h-4 w-4" />
                  </Link>
                </div>
                <div className="divide-y divide-border">
                  {recent.map((app) => (
                    <div key={app.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition hover:bg-surface">
                      <div>
                        <p className="font-display font-semibold text-text">{app.companyName}</p>
                        <p className="text-sm text-text-secondary">{app.jobTitle}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={app.status} />
                        <span className="text-xs font-semibold text-muted">{daysAgo(app)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </GlowCard>

              <div className="grid gap-4">
                {[
                  ['Analyze a Job', '/analyze', FileSearch, gradients.neural],
                  ['View Applications', '/applications', LayoutPanelTop, gradients.horizon],
                  ['Ask Flarq Agent', '/agent', Bot, gradients.aurora],
                ].map(([label, to, Icon, gradient]) => (
                  <Link key={String(label)} to={String(to)}>
                    <motion.div whileHover={{ y: -2 }}>
                      <GlowCard gradient={String(gradient)} contentClassName="flex min-h-28 items-center justify-between p-5">
                        <div>
                          <p className="font-display text-lg font-semibold">{String(label)}</p>
                          <p className="text-sm text-text-secondary">Open command surface</p>
                        </div>
                        {label === 'Ask Flarq Agent' ? (
                          <FlarqOrb size={48} />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl text-white" style={{ background: String(gradient) }}>
                            <Icon className="h-5 w-5" />
                          </div>
                        )}
                      </GlowCard>
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
