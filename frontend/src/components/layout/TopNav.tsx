import { Bell, Menu, Moon, Search, Sun } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useUiStore } from '../../store/uiStore'
import { Button } from '../ui/Button'
import { getPanelKindForRoles } from '../../routes/roleLanding'

export function TopNav() {
  const navigate = useNavigate()
  const { accessToken, username, roles, clearSession } = useAuthStore()
  const { darkMode, toggleDarkMode, openMobileSidebar } = useUiStore()
  const signedIn = Boolean(accessToken)
  const panel = getPanelKindForRoles(roles)
  const canSwitchToAdmin = roles.includes('ADMIN')
  const canSwitchToConsole = roles.some((r) => ['OPERATOR', 'PICKER', 'MANAGER', 'RECEIVER'].includes(r))

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/60 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/45">
      <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-6">
        <div className="md:hidden">
          <Button variant="secondary" size="sm" onClick={openMobileSidebar} aria-label="Open menu">
            <Menu className="size-4" />
          </Button>
        </div>

        <div className="relative hidden w-[520px] max-w-full md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Search SKUs, orders, bins..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-white/85 pl-9 pr-3 text-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-800 dark:bg-slate-950/70 dark:focus:border-slate-700 dark:focus:ring-amber-400/20"
            onKeyDown={(e) => {
              if (e.key === 'Enter') toast('Search is mock in this demo.')
            }}
          />
          <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-slate-900/5 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:bg-white/5 dark:text-slate-300">
            ⌘K
          </div>
        </div>

        <div className="flex items-center gap-2">
          {signedIn && canSwitchToAdmin && canSwitchToConsole ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                navigate(panel === 'ADMIN' ? '/console/dashboard' : '/admin/dashboard')
              }}
            >
              Switch to {panel === 'ADMIN' ? 'Console' : 'Admin'}
            </Button>
          ) : null}

          {signedIn ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                clearSession()
                toast.success('Logged out')
                navigate('/login')
              }}
            >
              Logout
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => navigate('/login')}>
              Login
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => toast('Notifications are mock in this demo.')}
            aria-label="Notifications"
          >
            <Bell className="size-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleDarkMode}
            aria-label="Toggle dark mode"
          >
            {darkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>

          <div className="hidden items-center gap-3 pl-2 md:flex">
            <div className="text-right">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {username ?? '—'}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {roles.length ? `${panel === 'ADMIN' ? 'Admin Panel' : 'Console Panel'} · ${roles.join(', ')}` : '—'}
              </div>
            </div>
            <div className="relative grid size-10 place-items-center overflow-hidden rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-900 shadow-soft dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-400/20 via-transparent to-sky-400/20" />
              {(username ?? '')
                .split(' ')
                .slice(0, 2)
                .map((s) => s[0]?.toUpperCase())
                .join('')}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

