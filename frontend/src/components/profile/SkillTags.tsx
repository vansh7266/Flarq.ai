import { Badge } from '../ui/Badge'

interface SkillTagsProps {
  skills: string[]
}

export function SkillTags({ skills }: SkillTagsProps) {
  if (skills.length === 0) {
    return (
      <p className="text-sm text-text-muted">
        Parsed skills from your resume will appear here after upload.
      </p>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {skills.map((skill) => (
        <Badge key={skill} variant="outline">
          {skill}
        </Badge>
      ))}
    </div>
  )
}
