import { motion } from 'framer-motion'
import { FlarqOrb } from '../ui/FlarqOrb'

export function TypingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <FlarqOrb size={32} state="thinking" className="shrink-0" />
      <div className="flex items-center rounded-2xl rounded-bl-sm border border-border bg-card px-4 py-3 shadow-sm">
        <div className="flex h-6 items-end gap-1">
          {[0, 1, 2].map((bar) => (
            <motion.div
              key={bar}
              className="w-1 rounded-full bg-primary"
              animate={{ height: [8, 20, 8] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: bar * 0.1 }}
            />
          ))}
        </div>
        <span className="ml-3 text-xs text-text-muted">Flarq is thinking...</span>
      </div>
    </div>
  )
}
