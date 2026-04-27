import type { UserRole } from '../types/roles'

export type PanelKind = 'ADMIN' | 'CONSOLE'

export function getPanelKindForRoles(roles: UserRole[]): PanelKind {
  return roles.includes('ADMIN') ? 'ADMIN' : 'CONSOLE'
}

export function getDefaultLandingPath(roles: UserRole[]): string {
  const panel = getPanelKindForRoles(roles)
  return panel === 'ADMIN' ? '/admin/dashboard' : '/console/dashboard'
}

