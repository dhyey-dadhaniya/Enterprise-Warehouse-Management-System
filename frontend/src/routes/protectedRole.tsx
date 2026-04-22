import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import type { UserRole } from '../types/roles'

export function ProtectedRole({ allow }: { allow: UserRole[] }) {
  const role = useAuthStore((s) => s.role)
  const location = useLocation()

  if (!allow.includes(role)) {
    return <Navigate to="/dashboard" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}

