interface MatchScoreRingProps {
  score: number
}

function ringColor(score: number): string {
  if (score >= 75) return '#10b981'
  if (score >= 50) return '#f59e0b'
  if (score >= 25) return '#f97316'
  return '#ef4444'
}

export function MatchScoreRing({ score }: MatchScoreRingProps) {
  const clamped = Math.max(0, Math.min(100, score))
  const radius = 54
  const stroke = 10
  const normalized = radius * 2 * Math.PI
  const dash = (clamped / 100) * normalized

  return (
    <div className="relative mx-auto flex h-40 w-40 items-center justify-center">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r={radius}
          stroke="#2a2a3a"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          stroke={ringColor(clamped)}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${normalized}`}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-text-primary">{clamped}</span>
        <span className="text-xs uppercase tracking-wide text-text-muted">match</span>
      </div>
    </div>
  )
}
