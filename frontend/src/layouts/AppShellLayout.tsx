import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Sidebar } from '../components/layout/Sidebar'
import { TopNav } from '../components/layout/TopNav'
import { MobileSidebar } from '../components/layout/MobileSidebar'
import { me } from '../services/authService'
import { useAuthStore } from '../store/authStore'
import type { UserRole } from '../types/roles'

function normalizeRoles(roles: string[]): UserRole[] {
  return roles
    .map((r) => r.replace(/^ROLE_/, ''))
    .filter((r): r is UserRole => ['ADMIN', 'MANAGER', 'RECEIVER', 'PICKER', 'OPERATOR'].includes(r))
}

export function AppShellLayout() {
  const navigate = useNavigate()
  const { accessToken, hydrated, username, roles, setSession, clearSession } = useAuthStore()

  useEffect(() => {
    if (!accessToken) {
      navigate('/login', { replace: true })
      return
    }

    // Bootstraps session after refresh: fetch /me if needed.
    if (hydrated && (!username || roles.length === 0)) {
      me()
        .then((info) => {
          setSession({ accessToken, username: info.username, roles: normalizeRoles(info.roles) })
        })
        .catch(() => {
          clearSession()
          navigate('/login', { replace: true })
        })
    }
  }, [accessToken, clearSession, hydrated, navigate, roles.length, setSession, username])

  if (!accessToken) return null

  return (
    <div className="min-h-full">
      <div className="mx-auto flex min-h-full max-w-[1400px]">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopNav />
          <main className="flex-1 p-4 md:p-6">
            <div className="pointer-events-none fixed inset-0 -z-10 opacity-[0.55] dark:opacity-[0.35]">
              <div className="h-full w-full bg-grid" />
            </div>
            <Outlet />
          </main>
        </div>
      </div>
      <MobileSidebar />
    </div>
  )
}

