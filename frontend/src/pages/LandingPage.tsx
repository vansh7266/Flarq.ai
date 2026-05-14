import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, ClipboardList, FilePenLine, Play, Target } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '../components/ui/Button'
import { usePageTitle } from '../hooks/usePageTitle'
import { fadeUp, staggerContainer } from '../utils/animations'

const stats = [
  '10,000+ cover letters generated',
  '3.2x average response rate',
  'Trusted by job seekers worldwide',
] as const

const features = [
  {
    title: 'Gap Analysis',
    description:
      "Know exactly which skills you're missing before you apply. Flarq compares your profile to any job description.",
    icon: Target,
  },
  {
    title: 'Cover Letters',
    description:
      'Never send a generic cover letter. AI-written, role-specific, in your tone, generated in seconds.',
    icon: FilePenLine,
  },
  {
    title: 'Application Tracking',
    description:
      'Your entire job search in one board. Know exactly where every application stands.',
    icon: ClipboardList,
  },
] as const

const steps = [
  {
    title: 'Upload your resume',
    description: 'Parsed by Gemini instantly.',
  },
  {
    title: 'Paste a job description',
    description: 'AI extracts requirements.',
  },
  {
    title: 'Review your gap analysis',
    description: 'See where you stand.',
  },
  {
    title: 'Apply with confidence',
    description: 'Cover letter ready to go.',
  },
] as const

function NodeGraph() {
  const nodes = [
    [72, 74],
    [192, 46],
    [308, 100],
    [220, 210],
    [92, 236],
    [342, 250],
  ]
  const lines = [
    [0, 1],
    [1, 2],
    [1, 3],
    [0, 4],
    [3, 4],
    [3, 5],
    [2, 5],
  ]

  return (
    <motion.svg
      viewBox="0 0 420 310"
      className="h-full w-full animate-float"
      aria-hidden="true"
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      <defs>
        <linearGradient id="nodeStroke" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#0d9488" />
          <stop offset="100%" stopColor="#0891b2" />
        </linearGradient>
      </defs>
      {lines.map(([from, to], index) => (
        <motion.line
          key={`${from}-${to}`}
          x1={nodes[from][0]}
          y1={nodes[from][1]}
          x2={nodes[to][0]}
          y2={nodes[to][1]}
          stroke="url(#nodeStroke)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="1000"
          initial={{ strokeDashoffset: 1000, opacity: 0.2 }}
          animate={{ strokeDashoffset: 0, opacity: 0.75 }}
          transition={{ delay: index * 0.12, duration: 1.8, ease: 'easeOut' }}
        />
      ))}
      {nodes.map(([cx, cy], index) => (
        <motion.g
          key={`${cx}-${cy}`}
          variants={{
            hidden: { opacity: 0, scale: 0.6 },
            visible: {
              opacity: 1,
              scale: 1,
              transition: { type: 'spring', stiffness: 260, damping: 18, delay: index * 0.1 },
            },
          }}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        >
          <circle cx={cx} cy={cy} r="25" fill="#f0fdfa" stroke="#0d9488" strokeWidth="2.5" />
          <circle cx={cx} cy={cy} r="6" fill="#0d9488" />
        </motion.g>
      ))}
    </motion.svg>
  )
}

function DrawIcon({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-light text-primary transition-transform group-hover:-rotate-3 group-hover:scale-105">
      {children}
    </div>
  )
}

export function LandingPage() {
  usePageTitle('Landing')

  return (
    <div className="min-h-screen bg-white text-text-primary">
      <section className="mesh-bg flex min-h-[82vh] flex-col">
        <header className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center">
            <img src="/logo.svg" alt="Flarq" className="h-8 w-auto" />
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button type="button" variant="ghost" className="h-10">
                Sign in
              </Button>
            </Link>
            <Link to="/auth?mode=signup">
              <Button type="button" className="h-10">
                Start free
              </Button>
            </Link>
          </div>
        </header>

        <main className="mx-auto grid w-full max-w-7xl flex-1 items-center gap-10 px-4 pb-6 pt-4 sm:px-6 lg:grid-cols-[1.2fr_0.8fr]">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="max-w-3xl"
          >
            <motion.div
              variants={fadeUp}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-white/80 px-4 py-2 text-sm font-semibold text-primary shadow-sm"
            >
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse-glow" />
              Powered by Gemini + Google Cloud
            </motion.div>
            <motion.h1
              variants={fadeUp}
              className="text-5xl font-extrabold leading-[0.95] text-text-primary sm:text-6xl lg:text-[72px]"
            >
              <span className="block">Land your next</span>
              <span className="block text-gradient">role faster</span>
              <span className="block">with AI.</span>
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="mt-6 max-w-xl text-lg leading-8 text-text-secondary sm:text-xl"
            >
              Flarq analyzes job descriptions, identifies skill gaps, writes tailored cover
              letters, and tracks every application so you can focus on interviews.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-4">
              <Link to="/auth?mode=signup">
                <Button type="button" className="h-[52px] px-6">
                  Start for free
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/analyze">
                <Button type="button" variant="secondary" className="h-[52px] px-6">
                  <Play className="h-4 w-4 fill-current" />
                  See how it works
                </Button>
              </Link>
            </motion.div>
            <motion.div variants={fadeUp} className="mt-6 flex flex-wrap gap-3">
              {stats.map((stat) => (
                <span
                  key={stat}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-white/85 px-3 py-1.5 text-xs font-semibold text-text-secondary shadow-sm"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {stat}
                </span>
              ))}
            </motion.div>
          </motion.div>

          <div className="hidden min-h-[310px] lg:block lg:min-h-[420px]">
            <NodeGraph />
          </div>
        </main>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold text-text-primary sm:text-4xl">
              Everything you need to land the job
            </h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="gradient-border-hover group rounded-xl border border-border bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-soft"
              >
                <DrawIcon>
                  <feature.icon className="h-6 w-6" strokeWidth={2.2} />
                </DrawIcon>
                <h3 className="mt-5 text-lg font-extrabold text-text-primary">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-text-secondary">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-surface py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-extrabold text-text-primary sm:text-4xl">
            Get hired in 4 steps
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-4">
            {steps.map((step, index) => (
              <div key={step.title} className="relative">
                {index < steps.length - 1 ? (
                  <div className="absolute left-10 top-6 hidden h-px w-[calc(100%_-_2.5rem)] border-t border-dashed border-primary/40 md:block" />
                ) : null}
                <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-sm font-extrabold text-white shadow-glow">
                  {index + 1}
                </div>
                <h3 className="mt-5 text-base font-extrabold text-text-primary">{step.title}</h3>
                <p className="mt-2 text-sm text-text-secondary">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-text-secondary sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="Flarq" className="h-7 w-auto" />
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
