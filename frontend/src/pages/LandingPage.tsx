import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, BarChart3, FileText, Radar } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { APP_NAME } from '../utils/constants'

const features = [
  {
    title: 'Gap analysis',
    description:
      'Map your resume to any job description and surface the highest-impact gaps before you apply.',
    icon: Radar,
  },
  {
    title: 'Cover letters',
    description:
      'Generate tailored, professional narratives grounded in your profile and the role itself.',
    icon: FileText,
  },
  {
    title: 'Smart analytics',
    description:
      'MongoDB aggregations reveal response patterns, company trends, and where to double down.',
    icon: BarChart3,
  },
] as const

const steps = [
  'Upload your resume and capture structured skills.',
  'Paste a job description for deep requirement extraction.',
  'Run gap analysis and generate a tailored cover letter.',
  'Track every application on a Kanban board with proactive follow-ups.',
] as const

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.35, ease: 'easeOut' as const },
}

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-text-primary">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-6">
        <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <span className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent" />
          {APP_NAME}
        </div>
        <div className="flex items-center gap-3">
          <Link to="/auth">
            <Button type="button" variant="ghost">
              Sign in
            </Button>
          </Link>
          <Link to="/auth?mode=signup">
            <Button type="button" className="gap-2">
              Launch console
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pb-20 pt-10 md:flex-row md:items-center">
          <motion.div className="flex-1 space-y-6" {...fadeUp}>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
              Google Cloud Rapid Agent Hackathon
            </p>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
              Your{' '}
              <span className="animate-gradient-shift bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] bg-clip-text text-transparent">
                AI-powered job search co-pilot
              </span>
            </h1>
            <p className="max-w-xl text-lg text-text-secondary">
              {APP_NAME} is an agentic operating system for your career: structured memory,
              analytical superpowers in MongoDB, and proactive guidance across every stage
              of your search.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/auth?mode=signup">
                <Button type="button" className="gap-2">
                  Start for free
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button type="button" variant="secondary">
                  View live workspace
                </Button>
              </Link>
            </div>
          </motion.div>

          <motion.div
            className="flex-1"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut', delay: 0.05 }}
          >
            <Card className="border-primary/30 bg-gradient-to-br from-surface to-surface-elevated p-6 shadow-glow">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                Live agent preview
              </p>
              <p className="mt-4 text-sm text-text-secondary">
                Gemini parses resumes, analyzes job descriptions, and reasons over your
                application history — with MongoDB MCP as the analytical backbone.
              </p>
              <div className="mt-6 grid gap-3 text-xs text-text-muted">
                <div className="rounded-lg border border-border bg-background/60 p-3">
                  Detected 14 missing keywords for Staff Engineer @ Northwind
                </div>
                <div className="rounded-lg border border-border bg-background/60 p-3">
                  Suggested follow-up for applications idle &gt; 10 days
                </div>
              </div>
            </Card>
          </motion.div>
        </section>

        <section className="border-y border-border bg-surface/40 py-16">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 md:grid-cols-3">
            {features.map((feature) => (
              <motion.div key={feature.title} {...fadeUp}>
                <Card hoverable className="h-full space-y-3 border-border/80">
                  <feature.icon className="h-6 w-6 text-primary" />
                  <h3 className="text-lg font-semibold tracking-tight">{feature.title}</h3>
                  <p className="text-sm text-text-secondary">{feature.description}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl space-y-8 px-4 py-16">
          <motion.div className="space-y-3" {...fadeUp}>
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">How it works</h2>
            <p className="max-w-2xl text-text-secondary">
              A guided, four-step flow takes you from raw materials to a living, searchable
              record of your search — optimized for both humans and agents.
            </p>
          </motion.div>
          <div className="grid gap-4 md:grid-cols-2">
            {steps.map((step, index) => (
              <motion.div key={step} {...fadeUp} transition={{ delay: index * 0.05 }}>
                <Card className="flex gap-4 border-dashed border-border/80">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                    {index + 1}
                  </div>
                  <p className="text-sm text-text-secondary">{step}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-surface/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-text-muted md:flex-row md:items-center md:justify-between">
          <span>© {new Date().getFullYear()} {APP_NAME}. Built for serious job seekers.</span>
          <span className="text-xs text-text-secondary">
            MongoDB Atlas · Gemini · Google Cloud Agent Builder
          </span>
        </div>
      </footer>
    </div>
  )
}
