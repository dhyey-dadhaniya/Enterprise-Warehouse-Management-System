import { NavLink } from 'react-router-dom'
import {
  Barcode,
  Boxes,
  Cable,
  ClipboardList,
  LayoutDashboard,
  PackageSearch,
  PanelLeftClose,
  PanelLeftOpen,
  Spline,
  Truck,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import { useAuthStore } from '../../store/authStore'
import { useUiStore } from '../../store/uiStore'
import type { UserRole } from '../../types/roles'
import { Button } from '../ui/Button'

type NavItem = {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  roles: UserRole[]
}

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER', 'RECEIVER', 'PICKER', 'OPERATOR'] },
  { to: '/inventory', label: 'Inventory', icon: Boxes, roles: ['ADMIN', 'MANAGER'] },
  { to: '/warehouse-structure', label: 'Warehouse', icon: Spline, roles: ['ADMIN', 'MANAGER'] },
  { to: '/receiving-putaway', label: 'Receiving', icon: Truck, roles: ['ADMIN', 'MANAGER', 'RECEIVER'] },
  { to: '/orders', label: 'Orders', icon: ClipboardList, roles: ['ADMIN', 'MANAGER'] },
  { to: '/picking', label: 'Picking', icon: PackageSearch, roles: ['OPERATOR', 'PICKER'] },
  { to: '/barcode', label: 'Barcode/QR', icon: Barcode, roles: ['ADMIN', 'MANAGER', 'RECEIVER', 'PICKER', 'OPERATOR'] },
]

export function Sidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed)
  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-screen shrink-0 border-r border-slate-200 bg-white/75 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/55 md:block',
        collapsed ? 'w-20' : 'w-72',
      )}
    >
      <SidebarContent />
    </aside>
  )
}

export function SidebarContent({
  onNavigate,
  forceExpanded,
}: {
  onNavigate?: () => void
  forceExpanded?: boolean
}) {
  const roles = useAuthStore((s) => s.roles)
  const collapsed = useUiStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useUiStore((s) => s.toggleSidebar)
  const isCollapsed = forceExpanded ? false : collapsed
  const primaryRole: UserRole | null = roles[0] ?? null

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3 px-4 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="relative grid size-10 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-950">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-400/20 via-transparent to-sky-400/20" />
              <Cable className="relative size-5 text-slate-900 dark:text-slate-100" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Fulfill<span className="hazard-underline">Ops</span>
                </div>
                <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {primaryRole ? `${primaryRole} Console` : 'Not signed in'}
                </div>
              </div>
            )}
          </div>
        </div>

        {!forceExpanded && (
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
            className="hidden md:inline-flex"
          >
            {isCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </Button>
        )}
      </div>

      <nav className="flex-1 space-y-1 px-2">
        {navItems
          .filter((i) => i.roles.some((r) => roles.includes(r)))
          .map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                    'text-slate-700 hover:bg-slate-100/70 hover:shadow-soft dark:text-slate-200 dark:hover:bg-slate-800/60',
                    isActive &&
                      'bg-white/90 text-slate-900 shadow-soft ring-1 ring-slate-200 dark:bg-slate-950/80 dark:text-white dark:ring-slate-800',
                  )
                }
              >
                <div
                  className={cn(
                    'grid size-9 shrink-0 place-items-center rounded-lg border border-transparent transition',
                    'group-hover:border-slate-200 group-hover:bg-white/70 dark:group-hover:border-slate-800 dark:group-hover:bg-slate-950/60',
                  )}
                >
                  <Icon className="size-5" />
                </div>
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            )
          })}
      </nav>

      <div className="p-3">
        <div className="rounded-xl border border-slate-200 bg-white/70 p-3 text-xs text-slate-600 shadow-soft dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
          {!isCollapsed ? (
            <>
              <div className="font-semibold text-slate-900 dark:text-slate-100">Roles</div>
              <div className="mt-1 flex items-center justify-between gap-3">
                <span className="text-mono">{roles.length ? roles.join(', ') : '—'}</span>
              </div>
            </>
          ) : (
            <div className="text-center font-semibold">WMS</div>
          )}
        </div>
      </div>
    </div>
  )
}

