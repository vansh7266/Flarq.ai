import { Link, NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { APP_NAME } from '../../utils/constants'
import { cn } from '../../utils/helpers'
import { Button } from '../ui/Button'
import { useAuth } from '../../hooks/useAuth'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'text-sm font-medium transition-colors',
    isActive ? 'text-primary' : 'text-text-secondary hover:text-text-primary'
  )

export function Navbar() {
  const { isAuthenticated, logout } = useAuth()

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-4">
        <Link to="/" className="flex items-center gap-2">
          <motion.span
            layout
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface border border-border"
            whileHover={{ rotate: -4, scale: 1.05 }}
          >
            <Sparkles className="h-5 w-5 text-primary" />
          </motion.span>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight text-text-primary">
              {APP_NAME}
            </span>
            <span className="text-xs text-text-muted">Agentic job search OS</span>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <NavLink to="/dashboard" className={navLinkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/profile" className={navLinkClass}>
            Profile
          </NavLink>
          <NavLink to="/analyze" className={navLinkClass}>
            Analyze
          </NavLink>
          <NavLink to="/applications" className={navLinkClass}>
            Applications
          </NavLink>
          <NavLink to="/analytics" className={navLinkClass}>
            Analytics
          </NavLink>
          <NavLink to="/agent" className={navLinkClass}>
            Agent
          </NavLink>
        </nav>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Button type="button" variant="secondary" onClick={() => void logout()}>
              Log out
            </Button>
          ) : (
            <>
              <Link to="/auth">
                <Button type="button" variant="ghost">
                  Sign in
                </Button>
              </Link>
              <Link to="/auth?mode=signup">
                <Button type="button">Get started</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
