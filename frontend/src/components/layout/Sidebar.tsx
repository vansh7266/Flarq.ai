import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  UserCircle2,
  ScanSearch,
  ClipboardList,
  LineChart,
  Bot,
} from 'lucide-react'
import { cn } from '../../utils/helpers'

const items = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/profile', label: 'Profile', icon: UserCircle2 },
  { to: '/analyze', label: 'Analyze', icon: ScanSearch },
  { to: '/applications', label: 'Applications', icon: ClipboardList },
  { to: '/analytics', label: 'Analytics', icon: LineChart },
  { to: '/agent', label: 'Agent', icon: Bot },
] as const

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-surface/40 p-4 lg:block">
      <nav className="flex flex-col gap-1">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/15 text-primary'
                  : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
