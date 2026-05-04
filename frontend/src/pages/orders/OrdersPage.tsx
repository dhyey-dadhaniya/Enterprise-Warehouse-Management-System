import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ArrowRight, Plus, RefreshCcw, Search, X } from 'lucide-react'
import type { SalesOrder, SalesOrderStatus } from '../../types/domain'
import { Card, CardHeader, CardTitle } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Table, TBody, TD, TH, THead, TR } from '../../components/ui/Table'
import { getApiErrorMessage } from '../../lib/apiErrorMessage'
import { cn } from '../../lib/cn'
import { useAuthStore } from '../../store/authStore'
import { listItems, listWarehouses } from '../../services/catalogService'
import { advanceOrder, cancelSalesOrder, createSalesOrder, getNextStatus, listOrders } from '../../services/ordersService'

const createSchema = z.object({
  orderNumber: z.string().max(64).optional(),
  warehouseId: z.coerce.number().int().positive(),
  itemId: z.coerce.number().int().positive(),
  quantityOrdered: z.coerce.number().positive(),
})

type CreateForm = z.infer<typeof createSchema>

function statusVariant(status: SalesOrderStatus) {
  if (status === 'SHIPPED') return 'success'
  if (status === 'PACKED') return 'info'
  if (status === 'PICKING') return 'warning'
  return 'neutral'
}

function formatWhen(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString(undefined, { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export function OrdersPage() {
  const qc = useQueryClient()
  const roles = useAuthStore((s) => s.roles)
  const isAdmin = roles.includes('ADMIN')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<SalesOrderStatus | ''>('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [createOpen, setCreateOpen] = useState(false)

  const key = useMemo(() => ['orders', { query, status, page, pageSize }] as const, [query, status, page, pageSize])

  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: key,
    queryFn: () => listOrders({ query, status, page, pageSize }),
    staleTime: 5_000,
  })

  const warehousesQ = useQuery({
    queryKey: ['catalog', 'warehouses'],
    queryFn: listWarehouses,
    staleTime: 60_000,
    enabled: createOpen,
  })

  const itemsQ = useQuery({
    queryKey: ['catalog', 'items'],
    queryFn: listItems,
    staleTime: 60_000,
    enabled: createOpen,
  })

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { orderNumber: '', warehouseId: 1, itemId: 1, quantityOrdered: 1 },
    mode: 'onChange',
  })

  const createM = useMutation({
    mutationFn: (vals: CreateForm) =>
      createSalesOrder({
        orderNumber: vals.orderNumber,
        warehouseId: vals.warehouseId,
        lines: [{ itemId: vals.itemId, quantityOrdered: vals.quantityOrdered }],
      }),
    onSuccess: async (created: SalesOrder) => {
      toast.success(`Created ${created.orderNumber}`)
      setCreateOpen(false)
      await qc.invalidateQueries({ queryKey: ['orders'] })
    },
    onError: () => toast.error('Failed to create sales order.'),
  })

  const mutation = useMutation({
    mutationFn: advanceOrder,
    onMutate: async (vars: { id: string; currentStatus: SalesOrderStatus }) => {
      await qc.cancelQueries({ queryKey: ['orders'] })
      const prev = qc.getQueriesData({ queryKey: ['orders'] })

      for (const [k, v] of prev) {
        const typed = v as { items: SalesOrder[]; total: number } | undefined
        if (!typed) continue
        qc.setQueryData(k, {
          ...typed,
          items: typed.items,
        })
      }

      return { prev }
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err) ?? 'Failed to advance order.')
    },
    onSuccess: (updated: SalesOrder) => {
      toast.success(`Order ${updated.orderNumber} → ${updated.status}`)
    },
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: ['orders'] })
    },
  })

  const cancelM = useMutation({
    mutationFn: cancelSalesOrder,
    onSuccess: async (updated: SalesOrder) => {
      toast.success(`Cancelled ${updated.orderNumber}`)
      await qc.invalidateQueries({ queryKey: ['orders'] })
    },
    onError: () => toast.error('Failed to cancel order.'),
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
            size="sm"
            onClick={() => {
              if (!isAdmin) {
                toast.error('Only ADMIN can create sales orders.')
                return
              }
              setCreateOpen((v) => !v)
            }}
            disabled={!isAdmin}
          >
            {createOpen ? <X className="size-4" /> : <Plus className="size-4" />}
            {createOpen ? 'Close' : 'Create order'}
          </Button>
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

      {createOpen && (
        <Card className="p-0">
          <CardHeader className="p-4">
            <CardTitle>Create sales order (ADMIN)</CardTitle>
          </CardHeader>
          <div className="border-t border-slate-200 p-4 dark:border-slate-800">
            {warehousesQ.isError || itemsQ.isError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                Failed to load warehouses/items for create.
              </div>
            ) : warehousesQ.isPending || itemsQ.isPending ? (
              <div className="space-y-3">
                <div className="h-10 w-full animate-pulse rounded-xl bg-slate-900/5 dark:bg-white/5" />
                <div className="h-10 w-full animate-pulse rounded-xl bg-slate-900/5 dark:bg-white/5" />
              </div>
            ) : (
              <form
                className="grid gap-3 md:grid-cols-4"
                onSubmit={createForm.handleSubmit((vals) => createM.mutate(vals))}
              >
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">Order # (optional)</label>
                  <input
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white/85 px-3 text-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-800 dark:bg-slate-950/70 dark:focus:border-slate-700 dark:focus:ring-amber-400/20"
                    {...createForm.register('orderNumber')}
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">Warehouse</label>
                  <select
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white/85 px-3 text-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-800 dark:bg-slate-950/70 dark:focus:border-slate-700 dark:focus:ring-amber-400/20"
                    {...createForm.register('warehouseId')}
                  >
                    {(warehousesQ.data ?? []).map((w) => (
                      <option key={String(w.id)} value={Number(w.id)}>
                        {w.code} · {w.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5 md:col-span-3">
                  <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">Item</label>
                  <select
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white/85 px-3 text-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-800 dark:bg-slate-950/70 dark:focus:border-slate-700 dark:focus:ring-amber-400/20"
                    {...createForm.register('itemId')}
                  >
                    {(itemsQ.data ?? []).map((it) => (
                      <option key={String(it.id)} value={Number(it.id)}>
                        {it.sku} · {it.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">Qty</label>
                  <input
                    type="number"
                    min={1}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white/85 px-3 text-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-800 dark:bg-slate-950/70 dark:focus:border-slate-700 dark:focus:ring-amber-400/20"
                    {...createForm.register('quantityOrdered')}
                  />
                </div>

                <div className="md:col-span-4 flex items-center gap-2">
                  <Button type="submit" disabled={!createForm.formState.isValid || createM.isPending}>
                    Create
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => createForm.reset()} disabled={createM.isPending}>
                    Reset
                  </Button>
                </div>
              </form>
            )}
          </div>
        </Card>
      )}

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
                setStatus(e.target.value as SalesOrderStatus | '')
                setPage(1)
              }}
              className="h-10 rounded-xl border border-slate-200 bg-white/85 px-3 text-sm outline-none focus:ring-2 focus:ring-amber-200 dark:border-slate-800 dark:bg-slate-950/70 dark:focus:ring-amber-400/20"
            >
              <option value="">All statuses</option>
              <option value="PENDING">PENDING</option>
              <option value="PICKING">PICKING</option>
              <option value="PACKED">PACKED</option>
              <option value="SHIPPED">SHIPPED</option>
              <option value="CANCELLED">CANCELLED</option>
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
                  <TH>Lines</TH>
                  <TH className="text-right">Action</TH>
                </tr>
              </THead>
              <TBody>
                {items.map((o) => {
                  const next = getNextStatus(o.status)
                  const canCancel = isAdmin && o.status !== 'SHIPPED' && o.status !== 'CANCELLED'
                  return (
                    <TR key={o.id}>
                      <TD className="whitespace-nowrap">
                        <div className="text-mono font-semibold text-slate-900 dark:text-slate-100">
                          {o.orderNumber}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400">
                          {o.lines[0]?.sku}
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
                      <TD className="text-slate-700 dark:text-slate-200">
                        <span className="text-mono">
                          {o.lines.reduce((a, l) => a + (Number(l.quantityOrdered) || 0), 0)}
                        </span>{' '}
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          items
                        </span>
                      </TD>
                      <TD className="text-right">
                        <div className="inline-flex items-center gap-2">
                          {next ? (
                            <Button
                              size="sm"
                              onClick={() => mutation.mutate({ id: o.id, currentStatus: o.status })}
                              disabled={mutation.isPending}
                            >
                              {o.status === 'PENDING' ? 'Allocate' : o.status === 'PACKED' ? 'Ship' : 'Advance'}
                              <ArrowRight className="size-4" />
                            </Button>
                          ) : (
                            <Button variant="secondary" size="sm" disabled>
                              Completed
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => {
                              if (!canCancel) return
                              const ok = window.confirm(`Cancel order "${o.orderNumber}"?`)
                              if (!ok) return
                              cancelM.mutate(o.id)
                            }}
                            disabled={!canCancel || cancelM.isPending}
                          >
                            Cancel
                          </Button>
                        </div>
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

