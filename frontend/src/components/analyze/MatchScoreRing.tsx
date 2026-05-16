interface MatchScoreRingProps {
  score: number
}

function ringColor(score: number): string {
  if (score >= 80) return '#34d399'
  if (score >= 60) return '#7c5cfc'
  if (score >= 40) return '#f5a623'
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
          stroke="#1e2030"
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
        <span className="font-display text-3xl font-bold text-text">{clamped}</span>
        <span className="font-mono text-xs uppercase tracking-wide text-muted">match</span>
      </div>
    </div>
  )
}
