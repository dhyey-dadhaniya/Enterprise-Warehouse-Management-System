import type { UserRole } from '../types/roles'

const KNOWN_ROLES: UserRole[] = ['ADMIN', 'MANAGER', 'RECEIVER', 'PICKER', 'OPERATOR']

/** Console / floor roles (not admin configuration). */
const CONSOLE_FEATURE_ROLES: UserRole[] = ['OPERATOR', 'PICKER', 'MANAGER', 'RECEIVER']

export function normalizeRoles(roles: string[]): UserRole[] {
  return roles
    .map((r) => r.replace(/^ROLE_/, ''))
    .filter((r): r is UserRole => KNOWN_ROLES.includes(r as UserRole))
}

export function isAdmin(roles: readonly UserRole[]): boolean {
  return roles.includes('ADMIN')
}

export function hasConsoleRole(roles: readonly UserRole[]): boolean {
  return roles.some((r) => CONSOLE_FEATURE_ROLES.includes(r))
}

/** User can switch between admin and console top nav (has both admin and at least one floor role). */
export function canSwitchAdminAndConsole(roles: readonly UserRole[]): boolean {
  return isAdmin(roles) && hasConsoleRole(roles)
}
