import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, RefreshCcw, Search, Plus, Trash2, Eye, X } from 'lucide-react'
import type { Order, OrderStatus } from '../../types/domain'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Table, TBody, TD, TH, THead, TR } from '../../components/ui/Table'
import { cn } from '../../lib/cn'
import { getNextStatus, createOrder, getSalesOrder, type SalesOrderDetail } from '../../services/ordersService'
import { listWarehouses, listAllItems } from '../../services/catalogService'
import { useOrdersStore } from '../../store/ordersStore'

function statusVariant(status: OrderStatus) {
  if (status === 'SHIPPED') return 'success'
  if (status === 'PACKED') return 'info'
  if (status === 'PICKING') return 'warning'
  if (status === 'CANCELLED') return 'danger'
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

function advanceLabel(status: OrderStatus): string {
  if (status === 'PENDING') return 'Allocate & Pick'
  if (status === 'PICKING') return 'Pack'
  if (status === 'PACKED') return 'Ship'
  return 'Advance'
}

type OrderLine = { itemId: number | ''; qty: string }

export function OrdersPage() {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<OrderStatus | ''>('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // ── Create order modal ─────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false)
  const [warehouses, setWarehouses] = useState<Array<{ id: number; code: string; name: string }>>([])
  const [allItems, setAllItems] = useState<Array<{ id: number; sku: string; name: string }>>([])
  const [orderNumber, setOrderNumber] = useState('')
  const [orderWarehouse, setOrderWarehouse] = useState<number | ''>('')
  const [lines, setLines] = useState<OrderLine[]>([{ itemId: '', qty: '10' }])
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // ── View order detail modal ────────────────────────────────────────
  const [viewOrder, setViewOrder] = useState<SalesOrderDetail | null>(null)
  const [viewLoading, setViewLoading] = useState(false)
  const [viewError, setViewError] = useState<string | null>(null)

  useEffect(() => {
    listWarehouses().then(setWarehouses).catch(() => {})
    listAllItems().then(setAllItems).catch(() => {})
  }, [])

  const openModal = () => {
    setOrderNumber('')
    setOrderWarehouse('')
    setLines([{ itemId: '', qty: '10' }])
    setCreateError(null)
    setShowModal(true)
  }

  const handleCreateOrder = async () => {
    if (orderWarehouse === '' || lines.some((l) => l.itemId === '' || !l.qty)) return
    setCreating(true)
    setCreateError(null)
    try {
      await createOrder({
        orderNumber: orderNumber || undefined,
        warehouseId: Number(orderWarehouse),
        lines: lines.map((l) => ({ itemId: Number(l.itemId), quantityOrdered: Number(l.qty) })),
      })
      setShowModal(false)
      fetchOrders({ page, pageSize })
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setCreateError(msg ?? 'Failed to create order.')
    } finally {
      setCreating(false)
    }
  }

  const openViewOrder = async (id: string) => {
    setViewLoading(true)
    setViewError(null)
    setViewOrder(null)
    try {
      const detail = await getSalesOrder(Number(id))
      setViewOrder(detail)
    } catch {
      setViewError('Failed to load order details.')
    } finally {
      setViewLoading(false)
    }
  }

  const items = useOrdersStore((s) => s.items)
  const total = useOrdersStore((s) => s.total)
  const loading = useOrdersStore((s) => s.loading)
  const error = useOrdersStore((s) => s.error)
  const fetchOrders = useOrdersStore((s) => s.fetch)
  const advance = useOrdersStore((s) => s.advance)
  const cancel = useOrdersStore((s) => s.cancel)

  useEffect(() => {
    fetchOrders({ page, pageSize })
  }, [fetchOrders, page, pageSize])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((o) => {
      if (status && o.status !== status) return false
      if (!q) return true
      if (o.number.toLowerCase().includes(q)) return true
      return o.lines.some((l) => l.sku.toLowerCase().includes(q) || l.name.toLowerCase().includes(q))
    })
  }, [items, query, status])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const canCancel = (s: OrderStatus) => s === 'PENDING' || s === 'PICKING' || s === 'PACKED'

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
          <Button size="sm" onClick={openModal}>
            <Plus className="size-4" /> New Order
          </Button>
          <Button variant="secondary" size="sm" onClick={() => fetchOrders({ page, pageSize })} disabled={loading}>
            <RefreshCcw className={cn('size-4', loading && 'animate-spin')} />
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
          {loading ? (
            <div className="space-y-3">
              <div className="h-10 w-full animate-pulse rounded-xl bg-slate-900/5 dark:bg-white/5" />
              <div className="h-10 w-full animate-pulse rounded-xl bg-slate-900/5 dark:bg-white/5" />
              <div className="h-10 w-full animate-pulse rounded-xl bg-slate-900/5 dark:bg-white/5" />
            </div>
          ) : error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
              Failed to load orders. Try refresh.
            </div>
          ) : filtered.length === 0 ? (
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
                  <TH className="text-right">Actions</TH>
                </tr>
              </THead>
              <TBody>
                {filtered.map((o) => {
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
                        <div className="inline-flex items-center gap-1.5">
                          {/* View detail */}
                          <button
                            onClick={() => openViewOrder(o.id)}
                            title="View detail"
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                          >
                            <Eye className="size-4" />
                          </button>

                          {/* Advance with explicit label */}
                          {next && (
                            <Button
                              size="sm"
                              onClick={() => advance({ order: o })}
                              disabled={loading}
                            >
                              {advanceLabel(o.status)}
                              <ArrowRight className="size-4" />
                            </Button>
                          )}

                          {/* Cancel */}
                          {canCancel(o.status) && (
                            <button
                              onClick={() => cancel({ order: o, onDone: () => {} })}
                              title="Cancel order"
                              className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                            >
                              <X className="size-4" />
                            </button>
                          )}

                          {/* Terminal states */}
                          {!next && !canCancel(o.status) && (
                            <Button variant="secondary" size="sm" disabled>
                              {o.status === 'SHIPPED' ? 'Shipped' : 'Cancelled'}
                            </Button>
                          )}
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
            Showing <span className="text-mono font-semibold">{filtered.length}</span> of{' '}
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

      {/* ── New Order modal ───────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-950">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">New Order</h2>

            <div className="mt-4 space-y-3">
              <div>
                <label className={labelCls}>Order Number <span className="font-normal text-slate-400">(optional — auto-generated if blank)</span></label>
                <input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="e.g. ORD-001" className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Warehouse *</label>
                <select value={orderWarehouse} onChange={(e) => setOrderWarehouse(e.target.value === '' ? '' : Number(e.target.value))} className={inputCls}>
                  <option value="">Select warehouse…</option>
                  {warehouses.map((w) => <option key={w.id} value={w.id}>{w.code} · {w.name}</option>)}
                </select>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className={labelCls}>Order Lines *</label>
                  <button onClick={() => setLines((l) => [...l, { itemId: '', qty: '10' }])} className="text-xs text-slate-500 hover:text-slate-900 underline dark:hover:text-slate-100">
                    + Add line
                  </button>
                </div>
                <div className="space-y-2">
                  {lines.map((line, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <select
                        value={line.itemId}
                        onChange={(e) => setLines((ls) => ls.map((l, idx) => idx === i ? { ...l, itemId: e.target.value === '' ? '' : Number(e.target.value) } : l))}
                        className={cn(inputCls, 'flex-1')}
                      >
                        <option value="">Select item…</option>
                        {allItems.map((it) => <option key={it.id} value={it.id}>{it.sku} · {it.name}</option>)}
                      </select>
                      <input
                        type="number"
                        min={1}
                        value={line.qty}
                        onChange={(e) => setLines((ls) => ls.map((l, idx) => idx === i ? { ...l, qty: e.target.value } : l))}
                        placeholder="Qty"
                        className={cn(inputCls, 'w-20')}
                      />
                      {lines.length > 1 && (
                        <button onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))} className="text-rose-400 hover:text-rose-600">
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {createError && <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">{createError}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowModal(false)} disabled={creating}>Cancel</Button>
              <Button
                onClick={handleCreateOrder}
                disabled={creating || orderWarehouse === '' || lines.some((l) => l.itemId === '' || !l.qty)}
              >
                {creating ? 'Creating…' : 'Create Order'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Order detail modal ────────────────────────────────────────── */}
      {(viewLoading || viewError || viewOrder) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {viewOrder ? `Order ${viewOrder.orderNumber}` : 'Order Detail'}
              </h2>
              <button
                onClick={() => { setViewOrder(null); setViewError(null) }}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="p-6">
              {viewLoading && (
                <div className="space-y-3">
                  <div className="h-8 w-full animate-pulse rounded-lg bg-slate-900/5 dark:bg-white/5" />
                  <div className="h-8 w-2/3 animate-pulse rounded-lg bg-slate-900/5 dark:bg-white/5" />
                </div>
              )}

              {viewError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                  {viewError}
                </div>
              )}

              {viewOrder && (
                <div className="space-y-5">
                  {/* Meta */}
                  <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    <InfoCell label="Order #" value={viewOrder.orderNumber} />
                    <InfoCell label="Status">
                      <Badge variant={statusVariant(viewOrder.status)} className="text-mono">
                        {viewOrder.status}
                      </Badge>
                    </InfoCell>
                    <InfoCell label="Warehouse" value={viewOrder.warehouseCode} />
                    <InfoCell label="Created" value={formatWhen(viewOrder.createdAt)} />
                  </div>

                  {/* Lines */}
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Order Lines
                    </p>
                    {viewOrder.lines.length === 0 ? (
                      <p className="text-sm text-slate-500">No lines.</p>
                    ) : (
                      <Table>
                        <THead>
                          <tr>
                            <TH>#</TH>
                            <TH>SKU</TH>
                            <TH className="text-right">Ordered</TH>
                            <TH className="text-right">Allocated</TH>
                            <TH className="text-right">Picked</TH>
                          </tr>
                        </THead>
                        <TBody>
                          {viewOrder.lines.map((l) => (
                            <TR key={l.id}>
                              <TD className="text-xs text-slate-500">{l.lineNumber}</TD>
                              <TD className="text-mono font-medium">{l.sku}</TD>
                              <TD className="text-right text-mono">{l.quantityOrdered}</TD>
                              <TD className="text-right text-mono">{l.quantityAllocated}</TD>
                              <TD className="text-right text-mono">{l.quantityPicked}</TD>
                            </TR>
                          ))}
                        </TBody>
                      </Table>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoCell({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      {children ?? <p className="font-medium text-slate-900 dark:text-slate-100">{value ?? '—'}</p>}
    </div>
  )
}

const labelCls = 'mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300'
const inputCls = 'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-amber-400/20 disabled:opacity-50'
