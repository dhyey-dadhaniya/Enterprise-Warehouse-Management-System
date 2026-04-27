import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { getDefaultLandingPath } from './roleLanding'

export function PanelIndexRedirect() {
  const location = useLocation()
  const { accessToken, roles } = useAuthStore()

  if (!accessToken) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Navigate to={getDefaultLandingPath(roles)} replace />
}

