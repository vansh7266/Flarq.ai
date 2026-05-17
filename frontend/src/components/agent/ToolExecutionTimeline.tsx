import { motion, AnimatePresence } from 'framer-motion'
import { Check, Search, BarChart3, Bell, Mail, PenTool, Wrench } from 'lucide-react'
import type { ToolExecutionEntry } from '../../types/agent.types'

function toolIcon(name: string) {
  const map: Record<string, typeof Search> = {
    get_profile_summary: Search,
    search_applications: Search,
    get_analytics_insight: BarChart3,
    get_stale_applications: Bell,
    generate_follow_up: Mail,
    update_application_status: PenTool,
  }
  return map[name] ?? Wrench
}

function toolEmoji(name: string): string {
  const map: Record<string, string> = {
    get_profile_summary: '👤',
    search_applications: '🔍',
    get_analytics_insight: '📊',
    get_stale_applications: '🔔',
    generate_follow_up: '✉️',
    update_application_status: '✏️',
  }
  return map[name] ?? '⚡'
}

function toolLabel(name: string): string {
  const map: Record<string, string> = {
    get_profile_summary: 'Reading your profile',
    search_applications: 'Searching applications',
    get_analytics_insight: 'Running analytics',
    get_stale_applications: 'Checking for alerts',
    generate_follow_up: 'Generating follow-up',
    update_application_status: 'Updating status',
  }
  return map[name] ?? name
}

interface ToolExecutionTimelineProps {
  tools: ToolExecutionEntry[]
}

export function ToolExecutionTimeline({ tools }: ToolExecutionTimelineProps) {
  if (tools.length === 0) return null

  return (
    <div className="flex items-start gap-3">
      {/* Left anchor dot */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center">
        <div className="h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_rgba(56,189,248,0.5)]" />
      </div>

      {/* Steps with vertical connecting lines */}
      <div className="flex-1">
        <AnimatePresence mode="popLayout">
          {tools.map((entry, index) => {
            const Icon = toolIcon(entry.tool)
            const isComplete = entry.status === 'complete'
            const isLast = index === tools.length - 1

            return (
              <motion.div
                key={entry.tool}
                initial={{ opacity: 0, x: -12, height: 0 }}
                animate={{ opacity: 1, x: 0, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                <div className="flex items-start gap-3">
                  {/* Status indicator + vertical line */}
                  <div className="flex flex-col items-center">
                    {/* Status circle */}
                    <div className="relative flex h-6 w-6 shrink-0 items-center justify-center">
                      {isComplete ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald/20 ring-1 ring-emerald/30"
                        >
                          <Check className="h-3.5 w-3.5 text-emerald" strokeWidth={3} />
                        </motion.div>
                      ) : (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/20 ring-1 ring-accent/30">
                          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
                        </div>
                      )}
                    </div>

                    {/* Vertical connecting line */}
                    {!isLast && (
                      <div className="w-px flex-1 bg-border/60" style={{ minHeight: 12 }} />
                    )}
                  </div>

                  {/* Tool label */}
                  <div className="flex min-h-6 items-center gap-2 pb-3">
                    <span className="text-sm" role="img" aria-label={toolLabel(entry.tool)}>
                      {toolEmoji(entry.tool)}
                    </span>
                    <Icon className={`h-3.5 w-3.5 ${isComplete ? 'text-emerald' : 'text-accent'}`} />
                    <span
                      className={`text-xs font-medium ${
                        isComplete ? 'text-emerald' : 'text-accent'
                      }`}
                    >
                      {toolLabel(entry.tool)}
                    </span>
                    {!isComplete && (
                      <motion.span
                        className="text-xs text-muted"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        ...
                      </motion.span>
                    )}
                    {isComplete && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-xs text-emerald/60"
                      >
                        Done
                      </motion.span>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
