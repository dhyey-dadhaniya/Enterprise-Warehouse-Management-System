import { useEffect, useState } from 'react'
import { Boxes, Layers, PackageMinus, PackageSearch } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { cn } from '../lib/cn'
import { api } from '../services/http'
import { getLowStockCount } from '../services/inventoryService'
import { listPickTasks } from '../services/ordersService'
import type { OrderStatus } from '../types/domain'

interface DashStats {
  totalItems: number
  lowStock: number
  pendingPicks: number
  warehouses: number
}

interface RecentOrder {
  id: number
  orderNumber: string
  status: OrderStatus
  warehouseCode: string
  updatedAt: string
}

function statusVariant(s: OrderStatus) {
  if (s === 'SHIPPED') return 'success'
  if (s === 'PACKED') return 'info'
  if (s === 'PICKING') return 'warning'
  if (s === 'CANCELLED') return 'danger'
  return 'neutral'
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export function DashboardPage() {
  const [stats, setStats] = useState<DashStats | null>(null)
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [completedCount, setCompletedCount] = useState(0)
  const [totalOrders, setTotalOrders] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [itemsRes, warehouseRes, lowStockRes, pendingPicksRes, ordersRes, completedPicksRes] =
          await Promise.allSettled([
            api.get<{ totalElements: number }>('/items?size=1'),
            api.get<{ totalElements: number }>('/warehouses?size=1'),
            getLowStockCount(10),
            listPickTasks({ status: 'PENDING', size: 1 }),
            api.get<{ content: RecentOrder[]; totalElements: number }>('/sales-orders?size=3'),
            listPickTasks({ status: 'COMPLETED', size: 1 }),
          ])

        if (cancelled) return

        setStats({
          totalItems: itemsRes.status === 'fulfilled' ? itemsRes.value.data.totalElements : 0,
          warehouses: warehouseRes.status === 'fulfilled' ? warehouseRes.value.data.totalElements : 0,
          lowStock: lowStockRes.status === 'fulfilled' ? lowStockRes.value : 0,
          pendingPicks: pendingPicksRes.status === 'fulfilled' ? pendingPicksRes.value.totalElements : 0,
        })

        if (ordersRes.status === 'fulfilled') {
          setRecentOrders(ordersRes.value.data.content ?? [])
          setTotalOrders(ordersRes.value.data.totalElements ?? 0)
        }

        setPendingCount(pendingPicksRes.status === 'fulfilled' ? pendingPicksRes.value.totalElements : 0)
        setCompletedCount(completedPicksRes.status === 'fulfilled' ? completedPicksRes.value.totalElements : 0)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const kpis = [
    {
      label: 'Total Products',
      value: stats?.totalItems ?? '—',
      icon: Boxes,
      accent: 'from-sky-400/25 via-transparent to-amber-400/20',
    },
    {
      label: 'Low Stock Items',
      value: stats?.lowStock ?? '—',
      icon: PackageMinus,
      accent: 'from-rose-500/20 via-transparent to-amber-400/15',
    },
    {
      label: 'Open Pick Tasks',
      value: stats?.pendingPicks ?? '—',
      icon: PackageSearch,
      accent: 'from-amber-400/25 via-transparent to-sky-400/15',
    },
    {
      label: 'Warehouses',
      value: stats?.warehouses ?? '—',
      icon: Layers,
      accent: 'from-slate-400/15 via-transparent to-sky-400/15',
    },
  ]

  const totalPicks = pendingCount + completedCount
  const completedPct = totalPicks > 0 ? Math.round((completedCount / totalPicks) * 100) : 0
  const pendingPct = totalPicks > 0 ? Math.round((pendingCount / totalPicks) * 100) : 0

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-slate-600 dark:text-slate-400">Overview</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          Warehouse Dashboard
        </h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="relative overflow-hidden p-0">
            <div className={cn('pointer-events-none absolute inset-0 bg-gradient-to-br', k.accent)} />
            <div className="relative p-4">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl border border-slate-200 bg-white/70 shadow-soft dark:border-slate-800 dark:bg-slate-950/60">
                  <k.icon className="size-5 text-slate-900 dark:text-slate-100" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-600 dark:text-slate-400">
                    {k.label}
                  </div>
                </div>
              </div>
              <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                {loading ? (
                  <div className="h-8 w-16 animate-pulse rounded-lg bg-slate-900/5 dark:bg-white/5" />
                ) : (
                  k.value.toLocaleString()
                )}
              </div>
              <div className="mt-3 h-px w-full bg-slate-900/5 dark:bg-white/5" />
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">Live from API</div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Pick Task Overview</CardTitle>
          </CardHeader>
          {loading ? (
            <div className="space-y-3">
              <div className="h-8 w-full animate-pulse rounded-xl bg-slate-900/5 dark:bg-white/5" />
              <div className="h-8 w-full animate-pulse rounded-xl bg-slate-900/5 dark:bg-white/5" />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-28 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                  Completed
                </div>
                <div className="h-2.5 flex-1 rounded-full bg-slate-900/5 dark:bg-white/5">
                  <div
                    className="h-2.5 rounded-full bg-sky-400 transition-all duration-500"
                    style={{ width: `${completedPct}%` }}
                  />
                </div>
                <div className="text-mono w-16 text-right text-[11px] text-slate-600 dark:text-slate-300">
                  {completedCount} ({completedPct}%)
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-28 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                  Pending
                </div>
                <div className="h-2.5 flex-1 rounded-full bg-slate-900/5 dark:bg-white/5">
                  <div
                    className="h-2.5 rounded-full bg-amber-400 transition-all duration-500"
                    style={{ width: `${pendingPct}%` }}
                  />
                </div>
                <div className="text-mono w-16 text-right text-[11px] text-slate-600 dark:text-slate-300">
                  {pendingCount} ({pendingPct}%)
                </div>
              </div>
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
                {totalPicks === 0
                  ? 'No pick tasks in system yet.'
                  : `${totalPicks} total pick tasks · ${totalOrders} total orders`}
              </div>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          {loading ? (
            <div className="space-y-3">
              <div className="h-10 w-full animate-pulse rounded-xl bg-slate-900/5 dark:bg-white/5" />
              <div className="h-10 w-full animate-pulse rounded-xl bg-slate-900/5 dark:bg-white/5" />
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400">
              No orders yet.
            </div>
          ) : (
            <ul className="space-y-3 text-sm">
              {recentOrders.map((o) => (
                <li key={o.id} className="flex gap-3">
                  <span
                    className={cn(
                      'mt-1.5 inline-block size-2 shrink-0 rounded-full',
                      o.status === 'SHIPPED'
                        ? 'bg-sky-400'
                        : o.status === 'PICKING'
                          ? 'bg-amber-400'
                          : 'bg-slate-400',
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-mono truncate font-semibold text-slate-900 dark:text-slate-100">
                        {o.orderNumber}
                      </span>
                      <span className="text-mono shrink-0 text-[11px] text-slate-500 dark:text-slate-400">
                        {timeAgo(o.updatedAt)}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <Badge variant={statusVariant(o.status)} className="text-mono text-[10px]">
                        {o.status}
                      </Badge>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {o.warehouseCode}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
