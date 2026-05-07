import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import type { UserRole } from '../types/roles'
import { getDefaultLandingPath } from './roleLanding'

export function ProtectedRole({ allow }: { allow: UserRole[] }) {
  const { accessToken, roles } = useAuthStore()
  const location = useLocation()

  if (!accessToken) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  const ok = roles.some((r) => allow.includes(r))
  if (!ok) {
    return <Navigate to={getDefaultLandingPath(roles)} replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}

