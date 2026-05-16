import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Bot, ClipboardList, FilePenLine, Play, Target } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { GlowCard } from '../components/ui/GlowCard'
import { MatchScoreRing } from '../components/analyze/MatchScoreRing'
import { FlarqOrb } from '../components/ui/FlarqOrb'
import { usePageTitle } from '../hooks/usePageTitle'
import { fadeUp, staggerContainer } from '../utils/animations'

const features = [
  {
    title: 'Gap Analysis',
    description:
      'Compare your profile to any role and see the exact skills, signals, and risks before you apply.',
    icon: Target,
  },
  {
    title: 'Cover Letters',
    description:
      'Generate role-specific letters that sound like you, with tone controls and one-click tracking.',
    icon: FilePenLine,
  },
  {
    title: 'Application Tracking',
    description:
      'A complete Kanban pipeline, stale follow-up alerts, and analytics from your real search activity.',
    icon: ClipboardList,
  },
] as const

const steps = [
  ['Upload your resume', 'Gemini extracts your skills, experience, and career profile.'],
  ['Paste a job description', 'Flarq reads the role and pulls out the requirements.'],
  ['Review match intelligence', 'See your score, missing skills, and strengths instantly.'],
  ['Apply with confidence', 'Save the opportunity and launch with a tailored letter.'],
] as const

export function LandingPage() {
  usePageTitle('Landing')

  return (
    <div className="min-h-screen bg-void text-text">
      <section className="bg-mesh flex min-h-screen flex-col overflow-hidden">
        <header className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.svg" alt="Flarq" className="h-8 w-auto brightness-125" />
            <span className="font-display text-sm font-semibold tracking-[0.25em] text-gradient">
              FLARQ
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button type="button" variant="ghost" className="h-10">
                Sign in
              </Button>
            </Link>
            <Link to="/auth?mode=signup">
              <Button type="button" className="h-10 grad-sunset text-void hover:glow-amber">
                Start free
              </Button>
            </Link>
          </div>
        </header>

        <main className="mx-auto grid w-full max-w-7xl flex-1 items-center gap-12 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
            <motion.p
              variants={fadeUp}
              className="font-mono text-xs font-semibold uppercase tracking-[0.35em] text-primary"
            >
              AI career OS
            </motion.p>
            <motion.h1
              variants={fadeUp}
              className="mt-5 max-w-4xl font-display text-5xl font-bold leading-[0.95] sm:text-6xl lg:text-[72px]"
            >
              Your AI-Powered
              <span className="block text-gradient">Job Search Agent</span>
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="mt-6 max-w-lg text-base leading-relaxed text-text-secondary"
            >
              Paste any job description. Get instant match analysis, skill gap breakdown,
              and a tailored cover letter powered by Google Gemini.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-4">
              <Link to="/auth?mode=signup">
                <Button
                  type="button"
                  className="h-14 rounded-xl px-8 font-semibold text-void grad-sunset hover:glow-amber"
                >
                  Start for free
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/analyze">
                <Button type="button" variant="secondary" className="h-14 rounded-xl px-8">
                  <Play className="h-4 w-4 fill-current" />
                  Watch demo
                </Button>
              </Link>
            </motion.div>
            <motion.div variants={fadeUp} className="mt-10 grid max-w-xl grid-cols-3 gap-6">
              {[
                ['10K+', 'Letters generated'],
                ['3.2x', 'Response rate'],
                ['94%', 'Satisfaction'],
              ].map(([value, label]) => (
                <div key={label}>
                  <span className="font-display text-4xl font-bold text-gradient">{value}</span>
                  <p className="mt-1 text-sm text-text-secondary">{label}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="animate-float"
          >
            <GlowCard hover={false} contentClassName="p-8">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted">
                    Match intelligence
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-semibold">Senior Product Engineer</h2>
                </div>
                <FlarqOrb size={48} state="responding" />
              </div>
              <MatchScoreRing score={87} />
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-emerald/20 bg-emerald/10 p-4">
                  <p className="text-sm font-semibold text-emerald">You have</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    {['React', 'FastAPI', 'MongoDB'].map((skill) => (
                      <span key={skill} className="rounded-full border border-emerald/30 px-2 py-1 text-emerald">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-amber/20 bg-amber/10 p-4">
                  <p className="text-sm font-semibold text-amber">Missing</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    {['Terraform', 'Kubernetes'].map((skill) => (
                      <span key={skill} className="rounded-full border border-amber/30 px-2 py-1 text-amber">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </GlowCard>
          </motion.div>
        </main>
      </section>

      <section className="border-y border-border bg-surface py-12">
        <div className="mx-auto grid max-w-5xl gap-6 px-4 text-center sm:grid-cols-3">
          {['10,000+ cover letters', '3.2x average response', 'Global launch ready'].map((text) => (
            <p key={text} className="font-display text-2xl font-semibold text-gradient">
              {text}
            </p>
          ))}
        </div>
      </section>

      <section className="bg-void py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-center font-display text-4xl font-bold">
            Intelligence for every application
          </h2>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {features.map((feature) => (
              <GlowCard key={feature.title} contentClassName="p-6">
                <div className="grad-neural flex h-12 w-12 items-center justify-center rounded-xl text-white">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 font-display text-xl font-semibold">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-text-secondary">{feature.description}</p>
              </GlowCard>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-surface py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-center font-display text-4xl font-bold">From resume to interview loop</h2>
          <div className="relative mt-14 grid gap-8 md:grid-cols-4">
            <div className="absolute left-8 right-8 top-6 hidden h-px grad-neural md:block" />
            {steps.map(([title, description], index) => (
              <div key={title} className="relative">
                <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full grad-neural font-display font-bold text-white">
                  {index + 1}
                </div>
                <h3 className="mt-5 font-display text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-text-secondary">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-void py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <GlowCard gradient="linear-gradient(135deg, #7c5cfc, #f472b6)" contentClassName="p-8">
            <div className="grid gap-8 md:grid-cols-[auto_1fr_auto] md:items-center">
              <FlarqOrb size={72} state="thinking" />
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">
                  Agent preview
                </p>
                <h2 className="mt-2 font-display text-3xl font-semibold">Ask Flarq what to do next.</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {['Ran analytics', 'Checked follow-ups', 'Searched applications'].map((chip) => (
                    <span key={chip} className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
              <Link to="/auth?mode=signup">
                <Button className="h-12 grad-sunset text-void hover:glow-amber">
                  Try Flarq for free
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </GlowCard>
        </div>
      </section>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-text-secondary sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="Flarq" className="h-7 w-auto brightness-125" />
            <span className="font-display font-semibold text-gradient">FLARQ</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/privacy" className="hover:text-primary">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-primary">
              Terms of Service
            </Link>
          </div>
          <span>© 2026 Flarq. All rights reserved.</span>
        </div>
      </footer>
    </div>
  )
}
