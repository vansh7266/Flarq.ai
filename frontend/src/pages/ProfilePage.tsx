import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import { PageWrapper } from '../components/layout/PageWrapper'
import { ProfileCard } from '../components/profile/ProfileCard'
import { ProfileUploadZone } from '../components/profile/ProfileUploadZone'
import { ParsedResumeConfirmModal } from '../components/profile/ParsedResumeConfirmModal'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useAuth } from '../hooks/useAuth'
import * as profileService from '../services/profileService'
import type { ParsedResumeData } from '../types/profile.types'

export function ProfilePage() {
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
      toast.success('Resume parsed — review and confirm')
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

  if (!user) {
    return null
  }

  const profile = profileQuery.data
  const completeness = profile?.profileCompleteness ?? 0
  const counts = profile?.skillCategoryCounts ?? {}

  return (
    <PageWrapper>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">Profile</h1>
          <p className="mt-2 max-w-2xl text-text-secondary">
            FLARQ uses your resume as structured memory in MongoDB — parsed by Gemini, confirmed
            by you, and ready for gap analysis across any role.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <ProfileCard fullName={user.fullName} email={user.email} />
            <ProfileUploadZone
              disabled={uploadMutation.isPending}
              progress={uploadProgress}
              onFile={(file) => {
                setUploadProgress(0)
                uploadMutation.mutate(file)
              }}
            />
            {manualMode ? (
              <Card className="space-y-3">
                <p className="text-sm font-semibold text-text-primary">Manual edit</p>
                <Input
                  label="Headline"
                  value={manualHeadline}
                  onChange={(e) => setManualHeadline(e.target.value)}
                />
                <label className="flex flex-col gap-2 text-sm text-text-secondary">
                  <span className="font-medium">Summary</span>
                  <textarea
                    className="min-h-[100px] rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
                    value={manualSummary}
                    onChange={(e) => setManualSummary(e.target.value)}
                  />
                </label>
                <Input
                  label="Skills (comma-separated)"
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

          <div className="space-y-4">
            {profile?.parsedResume ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <Card className="space-y-3 border-success/30">
                  <p className="text-sm font-semibold text-success">Profile synced</p>
                  <div>
                    <div className="mb-1 flex justify-between text-xs text-text-muted">
                      <span>Completeness</span>
                      <span>{completeness}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-border">
                      <motion.div
                        className="h-full bg-gradient-to-r from-success to-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${completeness}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-text-secondary">
                    {Object.entries(counts).map(([cat, n]) => (
                      <div
                        key={cat}
                        className="rounded-lg border border-border bg-background/60 px-2 py-1"
                      >
                        <span className="capitalize text-text-muted">{cat}</span>
                        <span className="ml-2 font-semibold text-text-primary">{n}</span>
                      </div>
                    ))}
                  </div>
                  <Button type="button" variant="secondary" onClick={() => setManualMode(true)}>
                    Quick edit
                  </Button>
                </Card>
              </motion.div>
            ) : (
              <Card>
                <p className="text-sm font-semibold text-text-primary">Skills snapshot</p>
                <p className="mt-2 text-sm text-text-muted">
                  Upload a resume to extract structured skills and experience with FLARQ + Gemini.
                </p>
              </Card>
            )}
          </div>
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
            if (preview) {
              setManualHeadline(profile?.headline ?? preview.full_name)
              setManualSummary(profile?.summary ?? preview.summary ?? '')
            }
            setManualSkills((profile?.skills ?? []).join(', '))
          }}
          isSubmitting={confirmMutation.isPending}
        />
      ) : null}
    </PageWrapper>
  )
}
