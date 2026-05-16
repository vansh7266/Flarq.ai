import { cn } from '../../utils/helpers'

type OrbState = 'idle' | 'thinking' | 'responding'

interface FlarqOrbProps {
  size?: number
  state?: OrbState
  className?: string
}

export function FlarqOrb({ size = 64, state = 'idle', className }: FlarqOrbProps) {
  const orbitSpeeds: Record<OrbState, string[]> = {
    idle: ['animate-orbit-slow', 'animate-orbit-med', 'animate-orbit-fast'],
    thinking: [
      'animate-[orbit_4.5s_linear_infinite]',
      'animate-[orbit_3s_linear_infinite]',
      'animate-[orbit_2s_linear_infinite]',
    ],
    responding: ['animate-orbit-slow', 'animate-orbit-med', 'animate-orbit-fast'],
  }
  const glow =
    state === 'thinking'
      ? 'shadow-[0_0_30px_rgba(124,92,252,0.7)]'
      : 'shadow-[0_0_20px_rgba(124,92,252,0.4)]'

  return (
    <div
      className={cn('relative flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      {state === 'responding' ? (
        <div className="absolute inset-0 animate-ripple rounded-full border border-primary/40" />
      ) : null}
      <div
        className={cn(
          'absolute inset-0 rounded-full border border-primary/30',
          state === 'thinking' && 'animate-[orbit_3s_linear_infinite]'
        )}
        style={{
          background:
            'conic-gradient(from 0deg, transparent 0%, rgba(124,92,252,0.3) 50%, transparent 100%)',
        }}
      />
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn('absolute rounded-full bg-primary', orbitSpeeds[state][i])}
          style={{
            width: size * 0.1,
            height: size * 0.1,
            top: '50%',
            left: '50%',
            marginTop: -(size * 0.05),
            marginLeft: -(size * 0.05),
            transformOrigin: `${size * (0.3 + i * 0.1)}px 0px`,
            opacity: 0.6 + i * 0.1,
          }}
        />
      ))}
      <div
        className={cn(
          'grad-neural flex items-center justify-center rounded-full',
          glow,
          state === 'idle' && 'animate-pulse-glow'
        )}
        style={{ width: size * 0.7, height: size * 0.7 }}
      >
        <span className="font-display font-bold text-white" style={{ fontSize: size * 0.25 }}>
          F
        </span>
      </div>
    </div>
  )
}
