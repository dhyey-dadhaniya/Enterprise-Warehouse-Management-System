import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ArrowRight, RefreshCcw, Search } from 'lucide-react'
import type { Order, OrderStatus } from '../../types/domain'
import { Card, CardHeader, CardTitle } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Table, TBody, TD, TH, THead, TR } from '../../components/ui/Table'
import { cn } from '../../lib/cn'
import { getNextStatus, listOrders, updateOrderStatus } from '../../services/ordersService'

function statusVariant(status: OrderStatus) {
  if (status === 'SHIPPED') return 'success'
  if (status === 'PACKED') return 'info'
  if (status === 'PICKING') return 'warning'
  return 'neutral'
}

function priorityVariant(p: Order['priority']) {
  if (p === 'HIGH') return 'danger'
  if (p === 'MEDIUM') return 'warning'
  return 'neutral'
}

function formatWhen(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString(undefined, { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export function OrdersPage() {
  const qc = useQueryClient()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<OrderStatus | ''>('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const key = useMemo(() => ['orders', { query, status, page, pageSize }] as const, [query, status, page, pageSize])

  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: key,
    queryFn: () => listOrders({ query, status, page, pageSize }),
    staleTime: 5_000,
  })

  const mutation = useMutation({
    mutationFn: updateOrderStatus,
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ['orders'] })
      const prev = qc.getQueriesData({ queryKey: ['orders'] })

      for (const [k, v] of prev) {
        const typed = v as { items: Order[]; total: number } | undefined
        if (!typed) continue
        qc.setQueryData(k, {
          ...typed,
          items: typed.items.map((o) => (o.id === vars.id ? { ...o, status: vars.status } : o)),
        })
      }

      return { prev }
    },
    onError: () => {
      toast.error('Failed to update status (mock).')
    },
    onSuccess: (updated) => {
      toast.success(`Order ${updated.number} → ${updated.status}`)
    },
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: ['orders'] })
    },
  })

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Operations</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Order Management
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCcw className={cn('size-4', isFetching && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      <Card className="p-0">
        <div className="border-b border-slate-200 p-4 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setPage(1)
                }}
                placeholder="Search order #, SKU, product name..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-white/85 pl-9 pr-3 text-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-800 dark:bg-slate-950/70 dark:focus:border-slate-700 dark:focus:ring-amber-400/20"
              />
            </div>

            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as OrderStatus | '')
                setPage(1)
              }}
              className="h-10 rounded-xl border border-slate-200 bg-white/85 px-3 text-sm outline-none focus:ring-2 focus:ring-amber-200 dark:border-slate-800 dark:bg-slate-950/70 dark:focus:ring-amber-400/20"
            >
              <option value="">All statuses</option>
              <option value="PENDING">PENDING</option>
              <option value="PICKING">PICKING</option>
              <option value="PACKED">PACKED</option>
              <option value="SHIPPED">SHIPPED</option>
            </select>

            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setPage(1)
              }}
              className="h-10 rounded-xl border border-slate-200 bg-white/85 px-3 text-sm outline-none focus:ring-2 focus:ring-amber-200 dark:border-slate-800 dark:bg-slate-950/70 dark:focus:ring-amber-400/20"
            >
              {[10, 15, 20, 25].map((n) => (
                <option key={n} value={n}>
                  {n}/page
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-4">
          {isPending ? (
            <div className="space-y-3">
              <div className="h-10 w-full animate-pulse rounded-xl bg-slate-900/5 dark:bg-white/5" />
              <div className="h-10 w-full animate-pulse rounded-xl bg-slate-900/5 dark:bg-white/5" />
              <div className="h-10 w-full animate-pulse rounded-xl bg-slate-900/5 dark:bg-white/5" />
            </div>
          ) : isError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
              Failed to load orders. Try refresh.
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white/60 p-6 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300">
              No orders match your filters.
            </div>
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Order</TH>
                  <TH>Created</TH>
                  <TH>Status</TH>
                  <TH>Priority</TH>
                  <TH>Lines</TH>
                  <TH className="text-right">Action</TH>
                </tr>
              </THead>
              <TBody>
                {items.map((o) => {
                  const next = getNextStatus(o.status)
                  return (
                    <TR key={o.id}>
                      <TD className="whitespace-nowrap">
                        <div className="text-mono font-semibold text-slate-900 dark:text-slate-100">
                          {o.number}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400">
                          {o.lines[0]?.sku} · {o.lines[0]?.bin}
                          {o.lines.length > 1 ? ` +${o.lines.length - 1}` : ''}
                        </div>
                      </TD>
                      <TD className="whitespace-nowrap text-xs text-slate-600 dark:text-slate-400">
                        {formatWhen(o.createdAt)}
                      </TD>
                      <TD>
                        <Badge variant={statusVariant(o.status)} className="text-mono">
                          {o.status}
                        </Badge>
                      </TD>
                      <TD>
                        <Badge variant={priorityVariant(o.priority)} className="text-mono">
                          {o.priority}
                        </Badge>
                      </TD>
                      <TD className="text-slate-700 dark:text-slate-200">
                        <span className="text-mono">{o.lines.reduce((a, l) => a + l.qty, 0)}</span>{' '}
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          items
                        </span>
                      </TD>
                      <TD className="text-right">
                        {next ? (
                          <Button
                            size="sm"
                            onClick={() => mutation.mutate({ id: o.id, status: next })}
                            disabled={mutation.isPending}
                          >
                            Advance
                            <ArrowRight className="size-4" />
                          </Button>
                        ) : (
                          <Button variant="secondary" size="sm" disabled>
                            Completed
                          </Button>
                        )}
                      </TD>
                    </TR>
                  )
                })}
              </TBody>
            </Table>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4 text-sm dark:border-slate-800">
          <div className="text-slate-600 dark:text-slate-400">
            Showing <span className="text-mono font-semibold">{items.length}</span> of{' '}
            <span className="text-mono font-semibold">{total}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Prev
            </Button>
            <span className="text-mono text-xs text-slate-600 dark:text-slate-400">
              Page {page} / {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

