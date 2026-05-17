import { motion } from 'framer-motion'
import { FlarqOrb } from '../ui/FlarqOrb'

interface ThinkingIndicatorProps {
  message?: string
}

export function ThinkingIndicator({ message = 'Analyzing your request...' }: ThinkingIndicatorProps) {
  return (
    <div className="flex items-start gap-3">
      <FlarqOrb size={32} state="thinking" className="mt-0.5 shrink-0" />
      <div className="relative">
        <div className="absolute -inset-2 rounded-2xl bg-accent/5 blur-xl animate-pulse" />
        <div className="relative flex items-center gap-3 rounded-2xl rounded-bl-sm border border-accent/20 bg-card px-5 py-3.5 shadow-sm">
          {/* Animated dots */}
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((dot) => (
              <motion.div
                key={dot}
                className="h-2 w-2 rounded-full bg-accent"
                animate={{
                  scale: [1, 1.4, 1],
                  opacity: [0.4, 1, 0.4],
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: dot * 0.2,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-text-secondary">{message}</span>
        </div>
      </div>
    </div>
  )
}
