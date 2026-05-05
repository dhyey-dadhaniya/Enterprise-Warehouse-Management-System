import {
  Boxes,
  Layers,
  PackageMinus,
  ScrollText,
  TrendingUp,
} from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { Card, CardHeader, CardTitle } from '../components/ui/Card'
import { cn } from '../lib/cn'

const kpis = [
  {
    label: 'Total Products',
    value: '1,248',
    icon: Boxes,
    accent: 'from-sky-400/25 via-transparent to-amber-400/20',
    spark: [4, 8, 6, 10, 9, 12, 11],
  },
  {
    label: 'Low Stock Items',
    value: '23',
    icon: PackageMinus,
    accent: 'from-rose-500/20 via-transparent to-amber-400/15',
    spark: [9, 8, 9, 7, 6, 7, 6],
  },
  {
    label: 'Active Orders',
    value: '71',
    icon: ScrollText,
    accent: 'from-amber-400/25 via-transparent to-sky-400/15',
    spark: [6, 7, 6, 8, 10, 9, 11],
  },
  {
    label: 'Warehouses',
    value: '4',
    icon: Layers,
    accent: 'from-slate-400/15 via-transparent to-sky-400/15',
    spark: [4, 4, 4, 4, 4, 4, 4],
  },
]

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const span = Math.max(max - min, 1)
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * 100
      const y = 100 - ((v - min) / span) * 100
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')

  return (
    <svg viewBox="0 0 100 100" className="h-10 w-24">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
        className="text-slate-900/20 dark:text-white/15"
      />
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
        className="text-amber-500 dark:text-amber-300"
        style={{ filter: 'drop-shadow(0 6px 18px rgba(245,158,11,0.25))' }}
      />
    </svg>
  )
}

export function DashboardPage() {
  const { pathname } = useLocation()
  const isAdminRoute = pathname.startsWith('/admin')
  const scopeLabel = isAdminRoute ? 'Administration' : 'Operations'
  const title = isAdminRoute ? 'Admin overview' : 'Console overview'

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-slate-600 dark:text-slate-400">{scopeLabel}</div>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{title}</h1>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs text-slate-600 shadow-soft dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
            <TrendingUp className="size-3.5 text-amber-500 dark:text-amber-300" />
            Ops signal is mock · Replace with API
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="relative overflow-hidden p-0">
            <div className={cn('pointer-events-none absolute inset-0 bg-gradient-to-br', k.accent)} />
            <div className="relative p-4">
              <CardHeader className="mb-2">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-xl border border-slate-200 bg-white/70 shadow-soft dark:border-slate-800 dark:bg-slate-950/60">
                    <k.icon className="size-5 text-slate-900 dark:text-slate-100" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="truncate">{k.label}</CardTitle>
                    <div className="text-mono mt-0.5 text-[11px] text-slate-600 dark:text-slate-400">
                      realtime: off
                    </div>
                  </div>
                </div>
                <div className="hidden sm:block">
                  <Sparkline values={k.spark} />
                </div>
              </CardHeader>

              <div className="mt-1 flex items-end justify-between gap-3">
                <div className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                  {k.value}
                </div>
                <div className="rounded-full bg-amber-500/15 px-2 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                  +{Math.max(0, k.spark.at(-1)! - k.spark[0])}
                </div>
              </div>
              <div className="mt-3 h-px w-full bg-slate-900/5 dark:bg-white/5" />
              <div className="mt-3 text-xs text-slate-600 dark:text-slate-400">
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  Target:
                </span>{' '}
                steady throughput
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Performance (Mock)</CardTitle>
          </CardHeader>
          <div className="relative h-64 overflow-hidden rounded-xl border border-slate-200 bg-white/60 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="absolute inset-0 bg-grid opacity-[0.55]" />
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-amber-400/15 to-transparent" />
            <div className="absolute inset-0 p-4">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Pick/Pack Throughput
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Placeholder panel · wire a real chart later
              </div>
              <div className="mt-5 grid gap-2">
                {[
                  { label: 'Orders/hr', v: 72, color: 'bg-amber-400' },
                  { label: 'Pick accuracy', v: 96, color: 'bg-sky-400' },
                  { label: 'Dock to bin', v: 41, color: 'bg-slate-400' },
                ].map((m) => (
                  <div key={m.label} className="flex items-center gap-3">
                    <div className="w-24 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                      {m.label}
                    </div>
                    <div className="h-2 flex-1 rounded-full bg-slate-900/5 dark:bg-white/5">
                      <div
                        className={cn('h-2 rounded-full', m.color)}
                        style={{ width: `${m.v}%` }}
                      />
                    </div>
                    <div className="text-mono w-10 text-right text-[11px] text-slate-600 dark:text-slate-300">
                      {m.v}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <ul className="space-y-3 text-sm">
            {[
              {
                title: 'Inventory updated',
                meta: 'SKU-1042 · Bin B-12',
                t: '2m',
                dot: 'bg-sky-400',
              },
              {
                title: 'Order moved to PICKING',
                meta: '#A-0911 · WH-1',
                t: '12m',
                dot: 'bg-amber-400',
              },
              {
                title: 'Low stock alert',
                meta: 'SKU-0031 · Qty 6',
                t: '1h',
                dot: 'bg-rose-400',
              },
            ].map((a) => (
              <li key={a.title} className="flex gap-3">
                <span className={cn('mt-1.5 inline-block size-2 rounded-full', a.dot)} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate font-semibold text-slate-900 dark:text-slate-100">
                      {a.title}
                    </span>
                    <span className="text-mono shrink-0 text-[11px] text-slate-500 dark:text-slate-400">
                      {a.t}
                    </span>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-slate-600 dark:text-slate-400">
                    {a.meta}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}

