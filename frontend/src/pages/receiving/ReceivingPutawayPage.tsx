import { useEffect, useMemo, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Wand2, RefreshCcw, CheckCircle2, UserCheck, Plus, Eye, X } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader, CardTitle } from '../../components/ui/Card'
import { Table, THead, TH, TBody, TR, TD } from '../../components/ui/Table'
import { cn } from '../../lib/cn'
import { listBins, listWarehouses, listZones, listAllItems } from '../../services/catalogService'
import { createAdjustment } from '../../services/inventoryService'
import {
  suggestPutaway,
  createPutawayTask,
  getPutawayTask,
  listPutawayTasks,
  claimPutawayTask,
  confirmPutawayTask,
  type PutawayTask,
  type PutawayTaskStatus,
} from '../../services/putawayService'

const statusColor: Record<PutawayTaskStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  IN_PROGRESS: 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400',
  COMPLETED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
}

export function ReceivingPutawayPage() {
  // ── Master data ────────────────────────────────────────────────────
  const [warehouses, setWarehouses] = useState<Array<{ id: number; code: string; name: string }>>([])
  const [zones, setZones] = useState<Array<{ id: number; code: string; name: string }>>([])
  const [bins, setBins] = useState<Array<{ id: number; code: string; capacityUnits: number | null }>>([])
  const [allItems, setAllItems] = useState<Array<{ id: number; sku: string; name: string }>>([])

  // ── Form state ─────────────────────────────────────────────────────
  const [warehouseId, setWarehouseId] = useState<number | null>(null)
  const [zoneId, setZoneId] = useState<number | null>(null)
  const [fromBinId, setFromBinId] = useState<number | null>(null)
  const [itemQuery, setItemQuery] = useState('')
  const [itemId, setItemId] = useState<number | null>(null)
  const [quantity, setQuantity] = useState(100)

  // ── Suggestion state ───────────────────────────────────────────────
  const [suggestion, setSuggestion] = useState<{ suggestedBinId: number; suggestedBinCode?: string; rule: string } | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  // ── Quick stock add ────────────────────────────────────────────────
  const [quickQty, setQuickQty] = useState('500')
  const [quickAdding, setQuickAdding] = useState(false)

  // ── Task list state ────────────────────────────────────────────────
  const [tasks, setTasks] = useState<PutawayTask[]>([])
  const [tasksTotal, setTasksTotal] = useState(0)
  const [tasksPage, setTasksPage] = useState(0)
  const [tasksLoading, setTasksLoading] = useState(false)

  // ── Task detail modal ──────────────────────────────────────────────
  const [viewTask, setViewTask] = useState<PutawayTask | null>(null)
  const [viewTaskLoading, setViewTaskLoading] = useState(false)

  // ── Load master data on mount ──────────────────────────────────────
  useEffect(() => {
    ;(async () => {
      try {
        setFormLoading(true)
        const [wh, its] = await Promise.all([listWarehouses(), listAllItems()])
        setWarehouses(wh)
        setAllItems(its)
      } catch {
        toast.error('Failed to load data. Ensure you are logged in.')
      } finally {
        setFormLoading(false)
      }
    })()
  }, [])

  useEffect(() => {
    if (!warehouseId) return
    setZones([])
    setBins([])
    setZoneId(null)
    setFromBinId(null)
    listZones(warehouseId).then(setZones).catch(() => toast.error('Failed to load zones.'))
  }, [warehouseId])

  useEffect(() => {
    if (!zoneId) return
    setBins([])
    setFromBinId(null)
    listBins(zoneId).then(setBins).catch(() => toast.error('Failed to load bins.'))
  }, [zoneId])

  // ── Load tasks ─────────────────────────────────────────────────────
  const fetchTasks = useCallback(async () => {
    setTasksLoading(true)
    try {
      const res = await listPutawayTasks({ page: tasksPage, size: 20 })
      setTasks(res.content)
      setTasksTotal(res.totalElements)
    } catch {
      toast.error('Failed to load putaway tasks.')
    } finally {
      setTasksLoading(false)
    }
  }, [tasksPage])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  // ── Derived ────────────────────────────────────────────────────────
  const selectedWarehouse = useMemo(() => warehouses.find((w) => w.id === warehouseId) ?? null, [warehouses, warehouseId])
  const selectedItem = useMemo(() => allItems.find((i) => i.id === itemId) ?? null, [allItems, itemId])
  const filteredItems = useMemo(() => {
    const q = itemQuery.trim().toLowerCase()
    return q ? allItems.filter((i) => i.sku.toLowerCase().includes(q) || i.name.toLowerCase().includes(q)) : allItems
  }, [allItems, itemQuery])

  const tasksTotalPages = Math.max(1, Math.ceil(tasksTotal / 20))

  // ── Actions ────────────────────────────────────────────────────────
  const handleQuickStock = async () => {
    if (!warehouseId || !fromBinId || !itemId) return
    setQuickAdding(true)
    try {
      await createAdjustment({
        warehouseId,
        binId: fromBinId,
        itemId,
        quantityDelta: Number(quickQty),
        reason: 'CORRECTION',
        note: 'Stock added for putaway test',
      })
      toast.success(`Added ${quickQty} units to bin — now get a suggestion!`)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Failed to add stock.')
    } finally {
      setQuickAdding(false)
    }
  }

  const handleSuggest = async () => {
    if (!warehouseId || !fromBinId || !itemId) {
      toast.error('Select warehouse, from-bin, and item')
      return
    }
    try {
      setFormLoading(true)
      const res = await suggestPutaway({ warehouseId, itemId, fromBinId, quantity })
      setSuggestion(res)
      toast.success('Suggestion loaded')
    } catch {
      toast.error('No suitable bin found. Check bin capacity and quantity.')
    } finally {
      setFormLoading(false)
    }
  }

  const handleCreateTask = async () => {
    if (!warehouseId || !fromBinId || !itemId) return
    try {
      setFormLoading(true)
      await createPutawayTask({ warehouseId, fromBinId, itemId, quantity })
      toast.success('Putaway task created!')
      setSuggestion(null)
      setFromBinId(null)
      setItemId(null)
      setItemQuery('')
      setQuantity(100)
      fetchTasks()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Failed to create task.')
    } finally {
      setFormLoading(false)
    }
  }

  const handleClaim = async (id: number) => {
    try {
      await claimPutawayTask(id)
      toast.success('Task claimed — now IN PROGRESS')
      fetchTasks()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Failed to claim task.')
    }
  }

  const handleConfirm = async (task: PutawayTask) => {
    try {
      await confirmPutawayTask(task.id)
      toast.success('Task confirmed — inventory moved!')
      fetchTasks()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Failed to confirm task.')
    }
  }

  const openTaskDetail = async (id: number) => {
    setViewTaskLoading(true)
    setViewTask(null)
    try {
      const t = await getPutawayTask(id)
      setViewTask(t)
    } catch {
      toast.error('Failed to load task detail.')
    } finally {
      setViewTaskLoading(false)
    }
  }

  const handleReset = () => {
    setWarehouseId(null)
    setZoneId(null)
    setFromBinId(null)
    setItemQuery('')
    setItemId(null)
    setQuantity(100)
    setSuggestion(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-slate-600 dark:text-slate-400">Inbound</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          Receiving & Putaway
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Left: Suggestion form ─────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="p-0">
            <CardHeader className="p-4">
              <CardTitle>1. Get Suggestion</CardTitle>
            </CardHeader>
            <div className="border-t border-slate-200 p-4 space-y-4 dark:border-slate-800">
              {/* Warehouse */}
              <Field label="Warehouse">
                <select
                  className={selectCls}
                  value={warehouseId ?? ''}
                  onChange={(e) => { setWarehouseId(e.target.value ? Number(e.target.value) : null); setSuggestion(null) }}
                >
                  <option value="">Select warehouse…</option>
                  {warehouses.map((w) => <option key={w.id} value={w.id}>{w.code} · {w.name}</option>)}
                </select>
              </Field>

              {/* Zone */}
              <Field label="Zone">
                <select
                  className={selectCls}
                  value={zoneId ?? ''}
                  onChange={(e) => { setZoneId(e.target.value ? Number(e.target.value) : null); setSuggestion(null) }}
                  disabled={!warehouseId}
                >
                  <option value="">Select zone…</option>
                  {zones.map((z) => <option key={z.id} value={z.id}>{z.code} · {z.name}</option>)}
                </select>
              </Field>

              {/* From bin */}
              <Field label="From bin (staging)">
                <select
                  className={selectCls}
                  value={fromBinId ?? ''}
                  onChange={(e) => { setFromBinId(e.target.value ? Number(e.target.value) : null); setSuggestion(null) }}
                  disabled={!zoneId}
                >
                  <option value="">Select bin…</option>
                  {bins.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code}{b.capacityUnits != null ? ` (cap ${b.capacityUnits})` : ''}
                    </option>
                  ))}
                </select>
              </Field>

              {/* Item */}
              <Field label="Item">
                <input
                  value={itemQuery}
                  onChange={(e) => { setItemQuery(e.target.value); setItemId(null); setSuggestion(null) }}
                  placeholder="Filter by SKU or name…"
                  className={selectCls}
                />
                {filteredItems.length > 0 ? (
                  <select
                    className={cn(selectCls, 'mt-1.5')}
                    value={itemId ?? ''}
                    onChange={(e) => { setItemId(e.target.value ? Number(e.target.value) : null); setSuggestion(null) }}
                  >
                    <option value="">Select item…</option>
                    {filteredItems.map((i) => <option key={i.id} value={i.id}>{i.sku} · {i.name}</option>)}
                  </select>
                ) : (
                  <p className="mt-1 text-xs text-slate-400">
                    {allItems.length === 0
                      ? 'No items. Create via Inventory → Item Catalog first.'
                      : `No items match "${itemQuery}"`}
                  </p>
                )}
              </Field>

              {/* Quantity */}
              <Field label="Quantity">
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => { setQuantity(Math.max(1, Number(e.target.value))); setSuggestion(null) }}
                  className={selectCls}
                />
              </Field>

              {/* Quick stock add — shown when bin + item selected */}
              {fromBinId && itemId && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                    Add stock to from-bin first
                  </p>
                  <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-500">
                    Putaway requires inventory at the source bin.
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="number"
                      value={quickQty}
                      onChange={(e) => setQuickQty(e.target.value)}
                      className="h-8 w-24 rounded-lg border border-amber-200 bg-white px-2 text-sm outline-none focus:ring-2 focus:ring-amber-300 dark:border-amber-700 dark:bg-slate-900 dark:text-slate-100"
                      min={1}
                    />
                    <Button size="sm" variant="secondary" onClick={handleQuickStock} disabled={quickAdding || !quickQty}>
                      {quickAdding ? 'Adding…' : `Add ${quickQty} units`}
                    </Button>
                  </div>
                </div>
              )}

              {/* Suggestion result */}
              {suggestion && (
                <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 dark:border-sky-800 dark:bg-sky-950/30">
                  <div className="flex items-center gap-2 text-sm">
                    <Wand2 className="size-4 text-sky-500" />
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      Suggested: {suggestion.suggestedBinCode ?? `Bin #${suggestion.suggestedBinId}`}
                    </span>
                    <Badge variant="info">{suggestion.rule}</Badge>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button
                  onClick={handleSuggest}
                  disabled={formLoading || !selectedWarehouse || !selectedItem || !fromBinId}
                  className="flex-1"
                >
                  <Wand2 className="size-4" />
                  Suggest putaway bin
                </Button>
                <Button variant="secondary" onClick={handleReset} disabled={formLoading}>
                  Reset
                </Button>
              </div>
            </div>
          </Card>

          {/* ── Step 2: Create task ─────────────────────────────────── */}
          {suggestion && (
            <Card className="p-0">
              <CardHeader className="p-4">
                <CardTitle>2. Create Putaway Task</CardTitle>
              </CardHeader>
              <div className="border-t border-slate-200 p-4 dark:border-slate-800">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                  Move <span className="font-semibold">{quantity} × {selectedItem?.sku}</span> from{' '}
                  <span className="font-mono text-xs">{bins.find((b) => b.id === fromBinId)?.code}</span>{' '}
                  → <span className="font-mono text-xs">{suggestion.suggestedBinCode ?? `Bin #${suggestion.suggestedBinId}`}</span>
                </p>
                <Button onClick={handleCreateTask} disabled={formLoading} className="w-full">
                  <Plus className="size-4" />
                  Create Task
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* ── Right: Task list ──────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Putaway Tasks</h2>
            <Button variant="secondary" size="sm" onClick={fetchTasks} disabled={tasksLoading}>
              <RefreshCcw className={cn('size-4', tasksLoading && 'animate-spin')} />
              Refresh
            </Button>
          </div>

          {tasksLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 w-full animate-pulse rounded-xl bg-slate-900/5 dark:bg-white/5" />
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex justify-center rounded-xl border border-slate-200 bg-white/60 py-16 text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-950/40">
              No putaway tasks yet. Use the form to create one.
            </div>
          ) : (
            <>
              <Table>
                <THead>
                  <tr>
                    <TH>ID</TH>
                    <TH>SKU</TH>
                    <TH>Qty</TH>
                    <TH>From</TH>
                    <TH>To (suggested)</TH>
                    <TH>Status</TH>
                    <TH>Assigned</TH>
                    <TH className="text-right">Actions</TH>
                  </tr>
                </THead>
                <TBody>
                  {tasks.map((t) => (
                    <TR key={t.id}>
                      <TD className="font-mono text-xs text-slate-500">#{t.id}</TD>
                      <TD className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">{t.sku}</TD>
                      <TD className="text-slate-700 dark:text-slate-300">{t.quantity}</TD>
                      <TD className="font-mono text-xs text-slate-600 dark:text-slate-400">{t.fromBinCode}</TD>
                      <TD className="font-mono text-xs text-slate-600 dark:text-slate-400">
                        {t.confirmedToBinCode ?? t.suggestedToBinCode}
                      </TD>
                      <TD>
                        <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', statusColor[t.status])}>
                          {t.status.replace('_', ' ')}
                        </span>
                      </TD>
                      <TD className="text-xs text-slate-500">{t.assignedUsername ?? '—'}</TD>
                      <TD className="text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => openTaskDetail(t.id)}
                            title="View detail"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                          >
                            <Eye className="size-4" />
                          </button>
                          {t.status === 'PENDING' && (
                            <Button variant="secondary" size="sm" onClick={() => handleClaim(t.id)} title="Claim task">
                              <UserCheck className="size-4" />
                              Claim
                            </Button>
                          )}
                          {t.status === 'IN_PROGRESS' && (
                            <Button size="sm" onClick={() => handleConfirm(t)} title="Confirm & move inventory">
                              <CheckCircle2 className="size-4" />
                              Confirm
                            </Button>
                          )}
                          {t.status === 'COMPLETED' && (
                            <span className="text-xs text-emerald-600 dark:text-emerald-400">Done ✓</span>
                          )}
                        </div>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>

              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>{tasksTotal} total tasks</span>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setTasksPage((p) => Math.max(0, p - 1))} disabled={tasksPage === 0}>Prev</Button>
                  <span className="text-xs">{tasksPage + 1} / {tasksTotalPages}</span>
                  <Button variant="secondary" size="sm" onClick={() => setTasksPage((p) => Math.min(tasksTotalPages - 1, p + 1))} disabled={tasksPage >= tasksTotalPages - 1}>Next</Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Task detail modal ──────────────────────────────────────────── */}
      {(viewTaskLoading || viewTask) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {viewTask ? `Putaway Task #${viewTask.id}` : 'Loading…'}
              </h2>
              <button
                onClick={() => setViewTask(null)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="p-6">
              {viewTaskLoading && (
                <div className="space-y-2">
                  <div className="h-6 w-full animate-pulse rounded bg-slate-900/5 dark:bg-white/5" />
                  <div className="h-6 w-2/3 animate-pulse rounded bg-slate-900/5 dark:bg-white/5" />
                </div>
              )}
              {viewTask && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <DetailCell label="SKU" value={viewTask.sku} />
                  <DetailCell label="Status">
                    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', statusColor[viewTask.status])}>
                      {viewTask.status.replace('_', ' ')}
                    </span>
                  </DetailCell>
                  <DetailCell label="Quantity" value={String(viewTask.quantity)} />
                  <DetailCell label="Rule" value={viewTask.suggestionRule} />
                  <DetailCell label="From Bin" value={viewTask.fromBinCode} />
                  <DetailCell label="Suggested To Bin" value={viewTask.suggestedToBinCode} />
                  <DetailCell label="Confirmed To Bin" value={viewTask.confirmedToBinCode ?? '—'} />
                  <DetailCell label="Assigned To" value={viewTask.assignedUsername ?? '—'} />
                  <DetailCell label="Warehouse ID" value={String(viewTask.warehouseId)} />
                  <DetailCell label="Item ID" value={String(viewTask.itemId)} />
                  <DetailCell label="Created" value={new Date(viewTask.createdAt).toLocaleString()} />
                  <DetailCell label="Updated" value={new Date(viewTask.updatedAt).toLocaleString()} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const selectCls = 'h-10 w-full rounded-xl border border-slate-200 bg-white/85 px-3 text-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-800 dark:bg-slate-950/70 dark:focus:border-slate-700 dark:focus:ring-amber-400/20 disabled:cursor-not-allowed disabled:opacity-50'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">{label}</label>
      {children}
    </div>
  )
}

function DetailCell({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      {children ?? <p className="font-mono text-sm font-medium text-slate-900 dark:text-slate-100">{value ?? '—'}</p>}
    </div>
  )
}
