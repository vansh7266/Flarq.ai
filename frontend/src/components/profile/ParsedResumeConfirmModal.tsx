import { useState } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import type { ParsedResumeData, ParsedSkill, SkillCategory } from '../../types/profile.types'
import { cn } from '../../utils/helpers'

const categoryChip: Record<SkillCategory, string> = {
  technical: 'bg-primary-light text-primary border-primary/30',
  soft: 'bg-accent-light text-accent border-accent/30',
  tool: 'bg-slate-100 text-slate-700 border-slate-200',
  language: 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

interface ParsedResumeConfirmModalProps {
  open: boolean
  parsed: ParsedResumeData
  onClose: () => void
  onConfirm: (data: ParsedResumeData) => Promise<void>
  onEditManually: () => void
  isSubmitting: boolean
}

export function ParsedResumeConfirmModal({
  open,
  parsed,
  onClose,
  onConfirm,
  onEditManually,
  isSubmitting,
}: ParsedResumeConfirmModalProps) {
  const [draft, setDraft] = useState<ParsedResumeData>(() => structuredClone(parsed))
  const [newSkill, setNewSkill] = useState('')

  const updateSkills = (skills: ParsedSkill[]) => {
    setDraft({ ...draft, skills })
  }

  const removeSkill = (index: number) => {
    updateSkills(draft.skills.filter((_, i) => i !== index))
  }

  const addSkill = () => {
    const name = newSkill.trim()
    if (!name) {
      return
    }
    updateSkills([
      ...draft.skills,
      { name, category: 'technical', proficiency: 'intermediate' },
    ])
    setNewSkill('')
  }

  return (
    <Modal open={open} onClose={onClose} title="Confirm parsed resume">
      <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-text-muted">Name</p>
            <p className="text-sm font-semibold text-text-primary">{draft.full_name}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-text-muted">Email</p>
            <p className="text-sm text-text-secondary">{draft.email ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-text-muted">Location</p>
            <p className="text-sm text-text-secondary">{draft.location ?? '—'}</p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Skills
          </p>
          <div className="flex flex-wrap gap-2">
            {draft.skills.map((skill, index) => (
              <motion.span
                key={`${skill.name}-${index}`}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs',
                  categoryChip[skill.category] ?? categoryChip.technical
                )}
              >
                {skill.name}
                <button
                  type="button"
                  className="rounded p-0.5 hover:bg-white/10"
                  aria-label={`Remove ${skill.name}`}
                  onClick={() => removeSkill(index)}
                >
                  <X className="h-3 w-3" />
                </button>
              </motion.span>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Input
              aria-label="Add skill"
              value={newSkill}
              onChange={(event) => setNewSkill(event.target.value)}
              className="flex-1"
            />
            <Button type="button" variant="secondary" onClick={addSkill}>
              Add
            </Button>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Experience
          </p>
          <div className="space-y-2">
            {draft.experience.slice(0, 5).map((exp, index) => (
              <div
                key={`${exp.company}-${index}`}
                className="rounded-lg border border-border bg-background/60 px-3 py-2 text-xs text-text-secondary"
              >
                <p className="font-semibold text-text-primary">
                  {exp.title} · {exp.company}
                </p>
                <p className="text-text-muted">
                  {exp.start_date} — {exp.end_date}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          {isSubmitting ? <div className="shimmer-surface h-10 w-full animate-shimmer rounded-xl" /> : null}
          <Button
            type="button"
            className="flex-1"
            isLoading={isSubmitting}
            onClick={() => void onConfirm(draft)}
          >
            Looks good, Save Profile
          </Button>
          <Button type="button" variant="ghost" onClick={onEditManually}>
            Edit manually
          </Button>
        </div>
      </div>
    </Modal>
  )
}
