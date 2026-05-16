import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Check, Copy, RefreshCw, Save, X as XIcon } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { FlarqOrb } from '../components/ui/FlarqOrb'
import { GlowCard } from '../components/ui/GlowCard'
import { MatchScoreRing } from '../components/analyze/MatchScoreRing'
import { AddApplicationModal } from '../components/analyze/AddApplicationModal'
import { useAuth } from '../hooks/useAuth'
import { usePageTitle } from '../hooks/usePageTitle'
import * as jobService from '../services/jobService'
import * as applicationService from '../services/applicationService'
import { staggerContainer, fadeUp } from '../utils/animations'
import type { CoverLetterResult, CoverTone, GapAnalysis, JdAnalysis } from '../types/job.types'

const LOADING_MESSAGES = [
  'Reading the job description...',
  'Comparing your profile...',
  'Writing your cover letter...',
  'Finalizing insights...',
] as const

const tones: CoverTone[] = ['professional', 'conversational', 'bold']

function scoreBadge(score: number) {
  if (score >= 75) return 'STRONG MATCH'
  if (score >= 50) return 'GOOD MATCH'
  if (score >= 25) return 'FAIR MATCH'
  return 'WEAK'
}

function scoreClass(score: number) {
  if (score >= 75) return 'text-primary'
  if (score >= 50) return 'text-warning'
  if (score >= 25) return 'text-orange-500'
  return 'text-danger'
}

export function AnalyzePage() {
  usePageTitle('Analyze')
  const { user } = useAuth()
  const [jdText, setJdText] = useState('')
  const [tone, setTone] = useState<CoverTone>('professional')
  const [loadingIndex, setLoadingIndex] = useState(0)
  const [result, setResult] = useState<{
    jd_id: string
    jd_analysis: JdAnalysis
    gap_analysis: GapAnalysis
    cover_letter: CoverLetterResult
  } | null>(null)
  const [copyFlash, setCopyFlash] = useState(false)
  const [appModalOpen, setAppModalOpen] = useState(false)
  const timerRef = useRef<number | null>(null)

  const charCount = jdText.length
  const minChars = 50
  const maxChars = 10_000

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error('Sign in to analyze roles.')
      }
      const gap = await jobService.runGapAnalysis(user.id, jdText)
      const letter = await jobService.generateCoverLetterApi(user.id, gap.jd_id, tone)
      return {
        jd_id: gap.jd_id,
        jd_analysis: gap.jd_analysis,
        gap_analysis: gap.gap_analysis,
        cover_letter: letter.cover_letter,
      }
    },
    onSuccess: (data) => {
      setResult(data)
      toast.success('Analysis ready')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  useEffect(() => {
    if (!analyzeMutation.isPending) {
      if (timerRef.current) {
        window.clearInterval(timerRef.current)
        timerRef.current = null
      }
      return
    }
    timerRef.current = window.setInterval(() => {
      setLoadingIndex((i) => (i + 1) % LOADING_MESSAGES.length)
    }, 1400)
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current)
      }
    }
  }, [analyzeMutation.isPending])

  const regenerateMutation = useMutation({
    mutationFn: async (nextTone: CoverTone) => {
      if (!user || !result) {
        throw new Error('Nothing to regenerate')
      }
      const letter = await jobService.generateCoverLetterApi(user.id, result.jd_id, nextTone)
      return {
        nextTone,
        merged: {
          ...result,
          cover_letter: letter.cover_letter,
          gap_analysis: letter.gap_analysis,
        },
      }
    },
    onSuccess: (payload) => {
      setResult(payload.merged)
      setTone(payload.nextTone)
      toast.success('Regenerated')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const handleCopy = async () => {
    if (!result) return
    const text = `${result.cover_letter.subject_line}\n\n${result.cover_letter.body}`
    await navigator.clipboard.writeText(text)
    setCopyFlash(true)
    toast.success('Copied')
    window.setTimeout(() => setCopyFlash(false), 1200)
  }

  const score = result?.gap_analysis.match_score ?? 0
  const matchColor = useMemo(() => scoreClass(score), [score])

  return (
    <PageWrapper>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <GlowCard contentClassName="h-fit space-y-5 p-6">
          <div>
            <h1 className="font-display text-3xl font-bold text-gradient sm:text-4xl">
              Paste a job description
            </h1>
            <p className="mt-2 text-text-secondary">
              Flarq will compare the role against your profile and prepare an application strategy.
            </p>
          </div>

          <label className="flex flex-col gap-2">
            <span className="font-display text-base font-semibold text-text">Paste a job description</span>
            <textarea
              className="min-h-72 w-full resize-none rounded-xl border-0 border-b-2 border-border bg-surface px-4 py-3 text-sm leading-6 text-text outline-none transition placeholder:text-muted focus:border-primary"
              aria-label="Job description text"
              placeholder="Paste the role description, responsibilities, and requirements here..."
              value={jdText}
              maxLength={maxChars}
              onChange={(e) => setJdText(e.target.value)}
            />
            <div className="flex justify-between text-xs font-semibold">
              <span className={charCount >= minChars ? 'text-primary' : 'text-text-muted'}>
                {charCount} / {maxChars}
              </span>
              <span className={charCount >= minChars ? 'text-primary' : 'text-warning'}>
                Minimum {minChars} characters
              </span>
            </div>
          </label>

          <div>
            <p className="mb-2 text-sm font-semibold text-text-primary">Tone</p>
            <div className="flex flex-wrap gap-2">
              {tones.map((item) => (
                <Button
                  key={item}
                  type="button"
                  onClick={() => setTone(item)}
                  variant="secondary"
                  className={`rounded-full px-4 py-2 text-sm font-semibold capitalize transition ${
                    tone === item
                      ? 'grad-neural border-transparent text-white shadow-glow'
                      : 'border-border bg-card text-muted hover:border-primary hover:text-primary'
                  }`}
                >
                  {item}
                </Button>
              ))}
            </div>
          </div>

          <Button
            type="button"
            className="h-[52px] w-full grad-sunset text-void hover:glow-amber"
            disabled={charCount < minChars || analyzeMutation.isPending}
            onClick={() => void analyzeMutation.mutateAsync()}
          >
            {analyzeMutation.isPending ? (
              <>
                <FlarqOrb size={24} state="thinking" />
                <motion.span
                  key={LOADING_MESSAGES[loadingIndex]}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {LOADING_MESSAGES[loadingIndex]}
                </motion.span>
              </>
            ) : (
              'Analyze with Flarq'
            )}
          </Button>
        </GlowCard>

        <div>
          {!result ? (
            <Card className="flex min-h-[560px] items-center justify-center border-dashed text-center">
              <div>
                <FlarqOrb size={72} className="mx-auto" />
                <p className="mt-4 text-sm font-semibold text-text-secondary">
                  Your match score, skill breakdown, cover letter, and strategy will appear here.
                </p>
              </div>
            </Card>
          ) : (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="space-y-5"
            >
              <motion.div variants={fadeUp}>
                <GlowCard contentClassName="p-6 text-center">
                  <MatchScoreRing score={score} />
                  <div className={`text-3xl font-extrabold ${matchColor}`}>{score}%</div>
                  <Badge variant="outline" className="mx-auto mt-3 border-primary/30 text-primary">
                    {scoreBadge(score)}
                  </Badge>
                </GlowCard>
              </motion.div>

              <motion.div variants={fadeUp}>
                <GlowCard contentClassName="p-6">
                  <h2 className="font-display text-lg font-semibold text-text">Skills Breakdown</h2>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="mb-2 text-sm font-bold text-success">You have</p>
                      <div className="flex flex-wrap gap-2">
                        {result.gap_analysis.matching_skills.map((skill, index) => (
                          <motion.span
                            key={`m-${skill.skill}`}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.04 }}
                            className="inline-flex items-center gap-1 rounded-full border border-emerald/30 bg-emerald/10 px-3 py-1 text-xs font-semibold text-emerald"
                          >
                            <Check className="h-3 w-3" />
                            {skill.skill}
                          </motion.span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-bold text-danger">You&apos;re missing</p>
                      <div className="flex flex-wrap gap-2">
                        {result.gap_analysis.missing_skills.map((skill, index) => (
                          <motion.span
                            key={`x-${skill.skill}`}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.04 }}
                            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                              skill.importance === 'must-have'
                                ? 'border border-rose/30 bg-rose/10 text-rose'
                                : 'border border-amber/30 bg-amber/10 text-amber'
                            }`}
                          >
                            <XIcon className="h-3 w-3" />
                            {skill.skill}
                          </motion.span>
                        ))}
                      </div>
                    </div>
                  </div>
                </GlowCard>
              </motion.div>

              <motion.div variants={fadeUp}>
                <GlowCard contentClassName="relative border-l-[3px] border-l-primary p-6">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                    Subject line
                  </p>
                  <h2 className="mt-1 font-display text-base font-semibold text-text">
                    {result.cover_letter.subject_line}
                  </h2>
                  <div className="prose prose-invert mt-4 max-w-none text-sm leading-7 text-text">
                    <ReactMarkdown>{result.cover_letter.body}</ReactMarkdown>
                  </div>
                  <div className="mt-5 flex flex-wrap items-center gap-2 pr-28">
                    <Button type="button" className="grad-sunset text-void" onClick={() => void handleCopy()}>
                      {copyFlash ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copyFlash ? 'Copied' : 'Copy'}
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => setAppModalOpen(true)}>
                      <Save className="h-4 w-4" />
                      Save & Track
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => void regenerateMutation.mutateAsync(tone)}
                      disabled={regenerateMutation.isPending}
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${regenerateMutation.isPending ? 'animate-spin' : ''}`}
                      />
                      Regenerate
                    </Button>
                  </div>
                  <span className="absolute bottom-6 right-6 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted">
                    {result.cover_letter.word_count} words
                  </span>
                </GlowCard>
              </motion.div>

              <motion.div variants={fadeUp}>
                <GlowCard gradient="linear-gradient(135deg, #34d399, #38bdf8)" contentClassName="border-l-[3px] border-l-emerald p-6">
                  <p className="text-sm italic leading-7 text-text-secondary">
                    {result.gap_analysis.recommendation}
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-text-primary">
                    {result.gap_analysis.strengths.slice(0, 3).map((strength) => (
                      <li key={strength} className="flex gap-2">
                        <Check className="mt-1 h-4 w-4 shrink-0 text-primary" />
                        {strength}
                      </li>
                    ))}
                  </ul>
                </GlowCard>
              </motion.div>
            </motion.div>
          )}
        </div>
      </div>

      <AddApplicationModal
        key={`${result?.jd_id ?? 'jd'}-${appModalOpen ? 'open' : 'closed'}`}
        open={appModalOpen}
        onClose={() => setAppModalOpen(false)}
        defaultCompany={result?.jd_analysis.company_name ?? ''}
        defaultRole={result?.jd_analysis.job_title ?? ''}
        jobDescriptionId={result?.jd_id}
        onCreate={async (payload) => {
          await applicationService.createApplication({
            companyName: payload.company,
            jobTitle: payload.roleTitle,
            jobDescriptionId: payload.jobDescriptionId,
            status: 'saved',
          })
          toast.success('Saved to applications')
        }}
      />
    </PageWrapper>
  )
}
