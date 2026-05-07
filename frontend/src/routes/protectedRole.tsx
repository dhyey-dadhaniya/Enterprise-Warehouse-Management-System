import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import type { UserRole } from '../types/roles'

export function ProtectedRole({ allow }: { allow: UserRole[] }) {
  const token = useAuthStore((s) => s.token)
  const role = useAuthStore((s) => s.role)
  const location = useLocation()

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  // Auth is present, but role is not resolved yet (e.g. right after login / rehydrate).
  // Avoid redirect loops by waiting for role to load.
  if (!role) {
    return null
  }

  if (!role || !allow.includes(role)) {
    // If we're already on /dashboard, redirecting to /dashboard would cause a loop.
    if (location.pathname === '/dashboard') return null
    return <Navigate to="/dashboard" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}

