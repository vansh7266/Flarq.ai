import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MapPin, Mail, Plus, UserRound, X } from 'lucide-react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { ProfileUploadZone } from '../components/profile/ProfileUploadZone'
import { ParsedResumeConfirmModal } from '../components/profile/ParsedResumeConfirmModal'
import { FlarqOrb } from '../components/ui/FlarqOrb'
import { GlowCard } from '../components/ui/GlowCard'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'
import { useAuth } from '../hooks/useAuth'
import { usePageTitle } from '../hooks/usePageTitle'
import * as profileService from '../services/profileService'
import type { ParsedResumeData, ParsedSkill, SkillCategory } from '../types/profile.types'

const categoryClasses: Record<SkillCategory, string> = {
  technical: 'bg-primary/20 text-primary border-primary/30',
  soft: 'bg-sky/20 text-sky border-sky/30',
  tool: 'bg-amber/20 text-amber border-amber/30',
  language: 'bg-emerald/20 text-emerald border-emerald/30',
}

function groupedSkills(skills: ParsedSkill[]) {
  return skills.reduce<Record<SkillCategory, ParsedSkill[]>>(
    (acc, skill) => {
      acc[skill.category].push(skill)
      return acc
    },
    { technical: [], soft: [], tool: [], language: [] }
  )
}

export function ProfilePage() {
  usePageTitle('Profile')
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [preview, setPreview] = useState<ParsedResumeData | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [manualMode, setManualMode] = useState(false)
  const [manualHeadline, setManualHeadline] = useState('')
  const [manualSummary, setManualSummary] = useState('')
  const [manualSkills, setManualSkills] = useState('')

  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: profileService.fetchProfile,
    enabled: Boolean(user),
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) =>
      profileService.uploadResume(file, (pct) => setUploadProgress(pct)),
    onSuccess: (data) => {
      toast.success('Resume parsed. Review and confirm.')
      setUploadProgress(null)
      setPreview(data.parsed_data)
      setConfirmOpen(true)
    },
    onError: (error: Error) => {
      setUploadProgress(null)
      toast.error(error.message)
    },
  })

  const confirmMutation = useMutation({
    mutationFn: profileService.confirmParsedResume,
    onSuccess: () => {
      toast.success('Profile saved')
      setConfirmOpen(false)
      setPreview(null)
      void queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const manualSaveMutation = useMutation({
    mutationFn: () =>
      profileService.updateProfile({
        headline: manualHeadline,
        summary: manualSummary,
        skills: manualSkills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      }),
    onSuccess: () => {
      toast.success('Profile updated')
      setManualMode(false)
      void queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const removeSkillMutation = useMutation({
    mutationFn: async (skillName: string) => {
      const currentSkills =
        profile?.skills ?? parsed?.skills.map((skill) => skill.name).filter(Boolean) ?? []
      const nextSkills = currentSkills.filter((skill) => skill !== skillName)
      const nextParsed = parsed
        ? {
            ...parsed,
            skills: (parsed.skills ?? []).filter((skill) => skill.name !== skillName),
          }
        : undefined
      await profileService.updateProfile({
        skills: nextSkills,
        ...(nextParsed ? { parsedResume: nextParsed } : {}),
      })
    },
    onSuccess: () => {
      toast.success('Skill removed')
      void queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const profile = profileQuery.data
  const parsed = profile?.parsedResume
  const completeness = profile?.profileCompleteness ?? 0
  const skillsByCategory = useMemo(
    () => groupedSkills(parsed?.skills ?? []),
    [parsed?.skills]
  )
  const experience = parsed?.experience ?? []

  if (!user) {
    return (
      <PageWrapper>
        <Card className="mx-auto max-w-md text-center">
          <h1 className="font-display text-xl font-bold text-text">Sign in to manage your profile</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Your resume, skills, and parsed experience stay attached to your Flarq account.
          </p>
          <Link to="/auth">
            <Button type="button" className="mt-6 h-11">
              Go to Login
            </Button>
          </Link>
        </Card>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-gradient sm:text-4xl">Profile</h1>
          <p className="mt-2 max-w-2xl text-text-secondary">
            Upload your resume once and let Flarq keep your skills ready for every analysis.
          </p>
        </div>

        <GlowCard contentClassName="p-5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="grad-neural flex h-16 w-16 items-center justify-center rounded-full font-display text-xl font-bold text-white">
              {(user.fullName || user.email).slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-2xl font-semibold text-text">{user.fullName}</h2>
              <p className="text-sm text-muted">{user.email}</p>
            </div>
            <div className="w-full sm:w-64">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-text-secondary">Profile completeness</span>
                <span className="font-bold text-primary">{completeness}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-surface">
                <motion.div
                  className="h-full grad-horizon"
                  initial={{ width: 0 }}
                  animate={{ width: `${completeness}%` }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                />
              </div>
            </div>
          </div>
        </GlowCard>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="space-y-5">
            <Card>
              <div className="mb-4 flex items-center gap-3">
                <FlarqOrb size={40} />
                <h2 className="font-display text-lg font-semibold text-text">Resume Upload</h2>
              </div>
              <div className="mt-4">
                <ProfileUploadZone
                  disabled={uploadMutation.isPending}
                  progress={uploadProgress}
                  onFile={(file) => {
                    setUploadProgress(0)
                    uploadMutation.mutate(file)
                  }}
                />
              </div>
              {profileQuery.isLoading ? (
                <div className="mt-5 space-y-3">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : parsed ? (
                <div className="mt-5 rounded-xl border border-emerald/30 bg-emerald/10 p-4">
                  <p className="text-sm font-bold text-emerald">{parsed.full_name}</p>
                  <p className="mt-1 text-sm text-text-secondary">{parsed.summary}</p>
                </div>
              ) : null}
            </Card>

            {manualMode ? (
              <Card className="space-y-4">
                <h2 className="text-lg font-extrabold text-text-primary">Edit profile</h2>
                <Input
                  label="Headline"
                  value={manualHeadline}
                  onChange={(e) => setManualHeadline(e.target.value)}
                />
                <label className="flex flex-col gap-2 text-sm text-text-secondary">
                  <span className="font-semibold">Summary</span>
                  <textarea
                    className="min-h-[112px] rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                    value={manualSummary}
                    onChange={(e) => setManualSummary(e.target.value)}
                  />
                </label>
                <Input
                  label="Skills"
                  value={manualSkills}
                  onChange={(e) => setManualSkills(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={() => void manualSaveMutation.mutateAsync()}
                    isLoading={manualSaveMutation.isPending}
                  >
                    Save
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setManualMode(false)}>
                    Cancel
                  </Button>
                </div>
              </Card>
            ) : null}
          </div>

          <Card className="space-y-6">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-primary">
                <UserRound className="h-3.5 w-3.5" />
                {user.fullName}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-accent-light px-3 py-1 text-xs font-semibold text-accent">
                <Mail className="h-3.5 w-3.5" />
                {user.email}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                <MapPin className="h-3.5 w-3.5" />
                {parsed?.location ?? 'Location open'}
              </span>
            </div>

            <div className="space-y-5">
              {(['technical', 'soft', 'tool', 'language'] as SkillCategory[]).map((category) => (
                <div key={category}>
                  <h3 className="mb-2 font-display text-sm font-semibold capitalize text-text">
                    {category}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {skillsByCategory[category].length > 0 ? (
                      skillsByCategory[category].map((skill) => (
                        <span
                          key={`${category}-${skill.name}`}
                          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${categoryClasses[category]}`}
                        >
                          {skill.name}
                          <button
                            type="button"
                            aria-label={`Remove ${skill.name}`}
                            className="ml-1 transition-colors hover:text-danger"
                            onClick={() => removeSkillMutation.mutate(skill.name)}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-text-muted">No skills added yet.</span>
                    )}
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                className="h-10"
                onClick={() => {
                  setManualMode(true)
                  setManualHeadline(profile?.headline ?? '')
                  setManualSummary(profile?.summary ?? parsed?.summary ?? '')
                  setManualSkills((profile?.skills ?? parsed?.skills.map((s) => s.name) ?? []).join(', '))
                }}
              >
                <Plus className="h-4 w-4" />
                Add skill
              </Button>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-text">Experience</h2>
              <div className="mt-4 space-y-4">
                {experience.length > 0 ? (
                  experience.slice(0, 5).map((item, index) => (
                    <div key={`${item.company}-${item.title}`} className="relative pl-6">
                      {index < experience.length - 1 ? (
                        <span className="absolute left-[7px] top-4 h-full w-px bg-border" />
                      ) : null}
                      <span className="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full bg-primary" />
                      <p className="font-display font-semibold text-text">{item.title}</p>
                      <p className="text-sm text-text-secondary">{item.company}</p>
                      <p className="text-xs font-semibold text-text-muted">
                        {item.start_date} - {item.end_date}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-text-muted">Upload a resume to build your experience timeline.</p>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {preview ? (
        <ParsedResumeConfirmModal
          key={preview.full_name}
          open={confirmOpen}
          parsed={preview}
          onClose={() => {
            setConfirmOpen(false)
          }}
          onConfirm={async (data) => {
            await confirmMutation.mutateAsync(data)
          }}
          onEditManually={() => {
            setConfirmOpen(false)
            setManualMode(true)
            setManualHeadline(profile?.headline ?? preview.full_name)
            setManualSummary(profile?.summary ?? preview.summary ?? '')
            setManualSkills((profile?.skills ?? []).join(', '))
          }}
          isSubmitting={confirmMutation.isPending}
        />
      ) : null}
    </PageWrapper>
  )
}
