import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  BarChart2,
  ChevronLeft,
  ChevronRight,
  Kanban,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Search,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { cn, initials } from '../../utils/helpers'
import { FlarqOrb } from '../ui/FlarqOrb'

const items = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/analyze', label: 'Analyze', icon: Search },
  { to: '/applications', label: 'Applications', icon: Kanban },
  { to: '/analytics', label: 'Analytics', icon: BarChart2 },
  { to: '/agent', label: 'Agent', icon: MessageSquare, pulse: true },
] as const

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { user, logout } = useAuth()

  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-surface transition-all duration-300 md:flex',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <div className="flex h-16 items-center gap-3 border-b border-border px-4">
        <FlarqOrb size={32} />
        {!collapsed ? (
          <span className="font-display text-sm font-semibold tracking-[0.25em] text-gradient">
            FLARQ
          </span>
        ) : null}
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {items.map(({ to, label, icon: Icon, pulse }) => (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              cn(
                'relative flex items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-transparent text-text-secondary hover:bg-card hover:text-text'
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed ? <span>{label}</span> : null}
            {pulse ? (
              <span className="ml-auto h-2 w-2 animate-pulse rounded-full bg-emerald" />
            ) : null}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <button
          type="button"
          className="mb-3 flex w-full items-center justify-center rounded-lg border border-border py-2 text-muted transition hover:border-primary hover:text-primary"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
        <div className="flex items-center gap-3">
          <div className="grad-neural flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white">
            {initials(user?.fullName, user?.email)}
          </div>
          {!collapsed ? (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text">{user?.fullName ?? 'Flarq user'}</p>
                <p className="text-xs text-muted">Workspace</p>
              </div>
              <button
                type="button"
                className="rounded-lg p-2 text-muted transition hover:bg-card hover:text-danger"
                onClick={() => void logout()}
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : null}
        </div>
      </div>
    </aside>
  )
}
