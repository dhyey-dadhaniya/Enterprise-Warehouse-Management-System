import { isAdmin } from '../lib/roleUtils'
import type { UserRole } from '../types/roles'

export type PanelKind = 'ADMIN' | 'CONSOLE'

export function getPanelKindForRoles(roles: UserRole[]): PanelKind {
  return isAdmin(roles) ? 'ADMIN' : 'CONSOLE'
}

export function getDefaultLandingPath(roles: UserRole[]): string {
  const panel = getPanelKindForRoles(roles)
  return panel === 'ADMIN' ? '/admin/dashboard' : '/console/dashboard'
}

