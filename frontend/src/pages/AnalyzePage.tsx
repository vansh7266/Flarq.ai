import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Check, Copy, RefreshCw, Sparkles, X as XIcon } from 'lucide-react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { MatchScoreRing } from '../components/analyze/MatchScoreRing'
import { AddApplicationModal } from '../components/analyze/AddApplicationModal'
import { useAuth } from '../hooks/useAuth'
import * as jobService from '../services/jobService'
import * as applicationService from '../services/applicationService'
import type { CoverLetterResult, CoverTone, GapAnalysis, JdAnalysis } from '../types/job.types'

const LOADING_MESSAGES = [
  'Extracting requirements...',
  'Analyzing your fit...',
  'Crafting your cover letter...',
] as const

function levelBadge(level: GapAnalysis['match_level']): string {
  return level.toUpperCase()
}

export function AnalyzePage() {
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
    }, 1600)
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

  const matchColor = useMemo(() => {
    if (!result) return 'text-text-secondary'
    const s = result.gap_analysis.match_score
    if (s >= 75) return 'text-success'
    if (s >= 50) return 'text-warning'
    if (s >= 25) return 'text-orange-400'
    return 'text-danger'
  }, [result])

  const handleCopy = async () => {
    if (!result) return
    const text = `${result.cover_letter.subject_line}\n\n${result.cover_letter.body}`
    await navigator.clipboard.writeText(text)
    setCopyFlash(true)
    toast.success('Copied to clipboard')
    window.setTimeout(() => setCopyFlash(false), 1200)
  }

  return (
    <PageWrapper>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              FLARQ · Analyze
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
              Paste a JD. FLARQ does the rest.
            </h1>
            <p className="mt-2 max-w-2xl text-text-secondary">
              Gemini extracts requirements, compares your MongoDB-backed profile, scores fit,
              and drafts a tailored cover letter — no scraping, no logins.
            </p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <Card className="space-y-4 border-border/80">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-text-primary">
                Paste the job description here
              </span>
              <textarea
                className="min-h-[280px] w-full rounded-lg border border-border bg-background px-3 py-3 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/40"
                placeholder="Copy and paste the full job description. No scraping, no logins. Just paste and let Flarq work."
                value={jdText}
                maxLength={maxChars}
                onChange={(e) => setJdText(e.target.value)}
              />
              <div className="flex justify-between text-xs text-text-muted">
                <span>{charCount} / {maxChars}</span>
                <span className={charCount < minChars ? 'text-warning' : 'text-text-muted'}>
                  Minimum {minChars} characters
                </span>
              </div>
            </label>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                Tone
              </p>
              <div className="flex flex-wrap gap-2">
                {(['professional', 'conversational', 'bold'] as CoverTone[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTone(t)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition ${
                      tone === t
                        ? 'border-primary bg-primary/15 text-primary'
                        : 'border-border text-text-secondary hover:border-primary/40'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <Button
              type="button"
              className="w-full bg-gradient-to-r from-primary to-accent text-white shadow-glow"
              disabled={charCount < minChars || analyzeMutation.isPending}
              isLoading={analyzeMutation.isPending}
              onClick={() => void analyzeMutation.mutateAsync()}
            >
              {analyzeMutation.isPending ? LOADING_MESSAGES[loadingIndex] : 'Analyze & Generate'}
            </Button>
          </Card>

          <div className="space-y-4">
            {!result ? (
              <Card className="flex min-h-[320px] flex-col items-center justify-center border-dashed border-border/80 text-center text-sm text-text-muted">
                <Sparkles className="mb-3 h-8 w-8 text-primary" />
                Results appear here after analysis — match score, skills, cover letter, and
                FLARQ&apos;s application strategy.
              </Card>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <Card className="space-y-4 text-center">
                  <MatchScoreRing score={result.gap_analysis.match_score} />
                  <div className={`text-2xl font-bold ${matchColor}`}>
                    {result.gap_analysis.match_score}%
                  </div>
                  <Badge variant="outline" className="mx-auto uppercase tracking-wide">
                    {levelBadge(result.gap_analysis.match_level)}
                  </Badge>
                </Card>

                <Card className="space-y-4">
                  <h3 className="text-sm font-semibold text-text-primary">Skills breakdown</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="mb-2 text-xs font-semibold text-success">You have ✓</p>
                      <div className="space-y-1">
                        {result.gap_analysis.matching_skills.map((s, i) => (
                          <motion.div
                            key={`m-${s.skill}`}
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 px-2 py-1 text-xs text-text-secondary"
                          >
                            <Check className="h-3.5 w-3.5 text-success" />
                            <span>{s.skill}</span>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-semibold text-danger">You&apos;re missing ✗</p>
                      <div className="space-y-1">
                        {result.gap_analysis.missing_skills.map((s, i) => (
                          <motion.div
                            key={`x-${s.skill}`}
                            initial={{ opacity: 0, x: 6 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className={`flex items-center gap-2 rounded-lg border px-2 py-1 text-xs ${
                              s.importance === 'must-have'
                                ? 'border-danger/50 bg-danger/10 text-danger'
                                : 'border-warning/40 bg-warning/10 text-warning'
                            }`}
                          >
                            <XIcon className="h-3.5 w-3.5" />
                            <span>{s.skill}</span>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="space-y-3 border border-slate-200/20 bg-[#f8fafc] text-slate-900 shadow-inner">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Cover letter
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    {result.cover_letter.subject_line}
                  </p>
                  <div className="space-y-3 text-sm leading-relaxed text-slate-800">
                    {result.cover_letter.body.split(/\n\n+/).map((para, idx) => (
                      <p key={idx}>{para}</p>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="border-slate-300 text-slate-700">
                      {result.cover_letter.word_count} words
                    </Badge>
                    <Button
                      type="button"
                      variant="secondary"
                      className="border-slate-300 bg-white text-slate-900"
                      onClick={() => void handleCopy()}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      {copyFlash ? 'Copied!' : 'Copy to Clipboard'}
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => setAppModalOpen(true)}>
                      Save to Applications
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-slate-800"
                      onClick={() => void regenerateMutation.mutateAsync(tone)}
                      isLoading={regenerateMutation.isPending}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Regenerate
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-slate-800"
                      onClick={() => {
                        const next: CoverTone =
                          tone === 'professional'
                            ? 'conversational'
                            : tone === 'conversational'
                              ? 'bold'
                              : 'professional'
                        void regenerateMutation.mutateAsync(next)
                      }}
                      isLoading={regenerateMutation.isPending}
                    >
                      Change tone
                    </Button>
                  </div>
                </Card>

                <Card className="space-y-3">
                  <h3 className="text-sm font-semibold text-text-primary">FLARQ strategy</h3>
                  <p className="text-sm text-text-secondary">{result.gap_analysis.recommendation}</p>
                  <p className="text-sm text-text-secondary">
                    {result.gap_analysis.application_strategy}
                  </p>
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase text-text-muted">
                      Top strengths for interviews
                    </p>
                    <ul className="list-inside list-disc text-sm text-text-secondary">
                      {result.gap_analysis.strengths.slice(0, 3).map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </div>
                </Card>
              </motion.div>
            )}
          </div>
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
            company: payload.company,
            roleTitle: payload.roleTitle,
            jobDescriptionId: payload.jobDescriptionId,
            status: 'saved',
          })
          toast.success('Saved to applications')
        }}
      />
    </PageWrapper>
  )
}
