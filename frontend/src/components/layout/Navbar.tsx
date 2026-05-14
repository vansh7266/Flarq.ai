import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { LogOut, Menu, Settings, X } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { cn } from '../../utils/helpers'
import { Button } from '../ui/Button'

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/analyze', label: 'Analyze' },
  { to: '/applications', label: 'Applications' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/agent', label: 'Agent' },
] as const

function initials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || 'Flarq'
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'relative px-1 py-5 text-sm font-semibold transition-colors',
    isActive ? 'text-primary' : 'text-text-secondary hover:text-primary'
  )

export function Navbar() {
  const { isAuthenticated, logout, user } = useAuth()
  const [accountOpen, setAccountOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 h-16 border-b border-slate-100 bg-white">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center">
          <img src="/logo.svg" alt="Flarq" className="h-8 w-auto" />
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={navClass}>
              {({ isActive }) => (
                <>
                  {item.label}
                  {isActive ? (
                    <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary" />
                  ) : null}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <div className="relative">
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-extrabold text-white"
                onClick={() => setAccountOpen((open) => !open)}
                aria-label="Open account menu"
              >
                {initials(user?.fullName, user?.email)}
              </button>
              {accountOpen ? (
                <div className="absolute right-0 mt-3 w-56 rounded-xl border border-border bg-white p-2 shadow-soft">
                  <Link
                    to="/profile"
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-secondary hover:bg-surface hover:text-primary"
                    onClick={() => setAccountOpen(false)}
                  >
                    <Settings className="h-4 w-4" />
                    Account settings
                  </Link>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-text-secondary hover:bg-surface hover:text-danger"
                    onClick={() => {
                      setAccountOpen(false)
                      void logout()
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <Link to="/auth?mode=signup" className="hidden sm:block">
              <Button type="button" className="h-10">
                Start free
              </Button>
            </Link>
          )}

          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-text-secondary md:hidden"
            aria-label="Open navigation"
            onClick={() => setDrawerOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 bg-slate-950/30 md:hidden">
          <div className="ml-auto h-full w-80 max-w-[85vw] bg-white p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <img src="/logo.svg" alt="Flarq" className="h-8 w-auto" />
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-text-secondary"
                aria-label="Close navigation"
                onClick={() => setDrawerOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="mt-8 flex flex-col gap-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setDrawerOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'rounded-xl px-3 py-3 text-sm font-semibold',
                      isActive
                        ? 'bg-primary-light text-primary'
                        : 'text-text-secondary hover:bg-surface hover:text-primary'
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              <NavLink
                to="/profile"
                onClick={() => setDrawerOpen(false)}
                className="rounded-xl px-3 py-3 text-sm font-semibold text-text-secondary hover:bg-surface hover:text-primary"
              >
                Profile
              </NavLink>
            </nav>
          </div>
        </div>
      ) : null}
    </header>
  )
}
