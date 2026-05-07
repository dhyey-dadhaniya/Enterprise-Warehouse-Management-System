import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { CheckCircle2, RefreshCcw, MapPin, Package, Eye, X, Search, Plus } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader, CardTitle } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Table, TBody, TD, TH, THead, TR } from '../../components/ui/Table'
import { cn } from '../../lib/cn'
import {
  listPickTasks,
  listPickTasksByWave,
  getPickTask,
  getPickWave,
  createPickWave,
  confirmPickTask,
  type PickTask,
  type PickWave,
} from '../../services/ordersService'
import { listWarehouses } from '../../services/catalogService'

export function PickingPage() {
  const [tasks, setTasks] = useState<PickTask[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  // ── Filters ────────────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'COMPLETED' | ''>('PENDING')
  const [waveIdInput, setWaveIdInput] = useState('')
  const [activeWaveId, setActiveWaveId] = useState<number | null>(null)

  // ── Task detail modal ──────────────────────────────────────────────
  const [viewTask, setViewTask] = useState<PickTask | null>(null)
  const [viewTaskLoading, setViewTaskLoading] = useState(false)

  // ── Create wave modal ──────────────────────────────────────────────
  const [showCreateWave, setShowCreateWave] = useState(false)
  const [waveWarehouses, setWaveWarehouses] = useState<Array<{ id: number; code: string; name: string }>>([])
  const [waveWarehouseId, setWaveWarehouseId] = useState<number | ''>('')
  const [waveOrderIds, setWaveOrderIds] = useState('')
  const [creatingWave, setCreatingWave] = useState(false)
  const [createWaveError, setCreateWaveError] = useState<string | null>(null)
  const [createWaveResult, setCreateWaveResult] = useState<PickWave | null>(null)

  // ── Wave lookup ────────────────────────────────────────────────────
  const [waveLookupInput, setWaveLookupInput] = useState('')
  const [waveLookupResult, setWaveLookupResult] = useState<PickWave | null>(null)
  const [waveLookupLoading, setWaveLookupLoading] = useState(false)
  const [waveLookupError, setWaveLookupError] = useState<string | null>(null)

  useEffect(() => {
    listWarehouses().then(setWaveWarehouses).catch(() => {})
  }, [])

  const openCreateWave = () => {
    setWaveWarehouseId('')
    setWaveOrderIds('')
    setCreateWaveError(null)
    setCreateWaveResult(null)
    setShowCreateWave(true)
  }

  const handleCreateWave = async () => {
    if (waveWarehouseId === '' || !waveOrderIds.trim()) return
    const ids = waveOrderIds
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n))
    if (ids.length === 0) {
      setCreateWaveError('Enter at least one valid sales order ID.')
      return
    }
    setCreatingWave(true)
    setCreateWaveError(null)
    setCreateWaveResult(null)
    try {
      const wave = await createPickWave({ warehouseId: Number(waveWarehouseId), salesOrderIds: ids })
      setCreateWaveResult(wave)
      toast.success(`Wave ${wave.waveCode} created — ${wave.taskCount} tasks`)
      fetchTasks(activeWaveId)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setCreateWaveError(msg ?? 'Failed to create pick wave.')
    } finally {
      setCreatingWave(false)
    }
  }

  const fetchTasks = useCallback(async (waveId?: number | null) => {
    setLoading(true)
    setError(null)
    try {
      if (waveId != null) {
        const items = await listPickTasksByWave(waveId)
        setTasks(items)
        setTotal(items.length)
      } else {
        const res = await listPickTasks({
          status: statusFilter || undefined,
          size: 50,
        })
        setTasks(res.content)
        setTotal(res.totalElements)
      }
    } catch {
      setError('Failed to load pick tasks. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchTasks(activeWaveId)
  }, [fetchTasks, activeWaveId])

  const applyWaveFilter = () => {
    const id = parseInt(waveIdInput, 10)
    if (!waveIdInput.trim()) {
      setActiveWaveId(null)
    } else if (!isNaN(id)) {
      setActiveWaveId(id)
    }
  }

  const clearWaveFilter = () => {
    setWaveIdInput('')
    setActiveWaveId(null)
  }

  async function handleConfirm(task: PickTask) {
    setConfirming(task.id)
    try {
      await confirmPickTask(task.id)
      toast.success(`Picked ${task.sku} from ${task.zoneCode}/${task.binCode}`)
      await fetchTasks(activeWaveId)
    } catch {
      toast.error('Failed to confirm pick. Try again.')
    } finally {
      setConfirming(null)
    }
  }

  async function openTaskDetail(id: number) {
    setViewTaskLoading(true)
    setViewTask(null)
    try {
      const t = await getPickTask(id)
      setViewTask(t)
    } catch {
      toast.error('Failed to load task detail.')
    } finally {
      setViewTaskLoading(false)
    }
  }

  async function handleWaveLookup() {
    const id = parseInt(waveLookupInput, 10)
    if (isNaN(id)) return
    setWaveLookupLoading(true)
    setWaveLookupError(null)
    setWaveLookupResult(null)
    try {
      const w = await getPickWave(id)
      setWaveLookupResult(w)
    } catch {
      setWaveLookupError(`Wave #${id} not found.`)
    } finally {
      setWaveLookupLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Operator</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Pick Queue
          </h1>
          {!loading && (
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {total === 0
                ? 'No pending tasks — queue is clear.'
                : `${total} task${total !== 1 ? 's' : ''} pending`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={openCreateWave}>
            <Plus className="size-4" /> Create Wave
          </Button>
          <Button variant="secondary" size="sm" onClick={() => fetchTasks(activeWaveId)} disabled={loading}>
            <RefreshCcw className={cn('size-4', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────── */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'PENDING' | 'COMPLETED' | '')}
            disabled={activeWaveId != null}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 disabled:opacity-50"
          >
            <option value="PENDING">Pending</option>
            <option value="COMPLETED">Completed</option>
            <option value="">All statuses</option>
          </select>

          {/* Wave ID filter */}
          <div className="flex flex-1 min-w-[200px] items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="number"
                value={waveIdInput}
                onChange={(e) => setWaveIdInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyWaveFilter()}
                placeholder="Filter by Wave ID…"
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <Button size="sm" onClick={applyWaveFilter}>Apply</Button>
            {activeWaveId != null && (
              <button onClick={clearWaveFilter} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>

        {activeWaveId != null && (
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
            Showing tasks for Wave #{activeWaveId} — status filter disabled
          </p>
        )}
      </Card>

      {/* ── Error ───────────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
          {error}
        </div>
      )}

      {/* ── Task list ───────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 w-full animate-pulse rounded-xl bg-slate-900/5 dark:bg-white/5" />
          ))}
        </div>
      ) : tasks.length === 0 && !error ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <CheckCircle2 className="size-12 text-emerald-400" />
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {activeWaveId != null ? `No tasks for Wave #${activeWaveId}.` : 'All done! No pending pick tasks.'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {activeWaveId != null ? 'Check the wave ID or try a different one.' : 'Check back after the next pick wave is released.'}
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task, idx) => (
            <Card key={task.id} className="p-0">
              <CardHeader className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-mono">{task.sku}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="neutral" className="text-mono shrink-0 text-xs">
                      #{idx + 1}
                    </Badge>
                    <button
                      onClick={() => openTaskDetail(task.id)}
                      title="View task detail"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    >
                      <Eye className="size-4" />
                    </button>
                  </div>
                </div>
              </CardHeader>
              <div className="space-y-3 border-t border-slate-200 p-4 dark:border-slate-800">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                    <MapPin className="size-4 shrink-0 text-amber-500" />
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Location</div>
                      <div className="text-mono font-semibold">
                        {task.zoneCode} / {task.binCode}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                    <Package className="size-4 shrink-0 text-sky-500" />
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Qty to pick</div>
                      <div className="text-mono font-semibold">
                        {Number(task.quantityToPick).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>Order #{task.salesOrderId}</span>
                  <span>·</span>
                  <span>Wave #{task.pickWaveId}</span>
                  <span>·</span>
                  <span>Seq {task.routeSequence}</span>
                </div>

                <Button
                  className="w-full"
                  onClick={() => handleConfirm(task)}
                  disabled={confirming === task.id || task.status === 'COMPLETED'}
                >
                  {confirming === task.id ? (
                    <RefreshCcw className="size-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-4" />
                  )}
                  {confirming === task.id
                    ? 'Confirming…'
                    : task.status === 'COMPLETED'
                    ? 'Already Picked'
                    : 'Mark as Picked'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Wave Lookup ─────────────────────────────────────────────── */}
      <Card className="p-0">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Wave Lookup</h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Enter a wave ID to inspect its details
          </p>
        </div>
        <div className="p-5">
          <div className="flex gap-2">
            <input
              type="number"
              value={waveLookupInput}
              onChange={(e) => setWaveLookupInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleWaveLookup()}
              placeholder="Wave ID…"
              className="h-10 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
            <Button size="sm" onClick={handleWaveLookup} disabled={waveLookupLoading || !waveLookupInput}>
              {waveLookupLoading ? <RefreshCcw className="size-4 animate-spin" /> : 'Look Up'}
            </Button>
          </div>

          {waveLookupError && (
            <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">{waveLookupError}</p>
          )}

          {waveLookupResult && (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <WaveCell label="Wave Code" value={waveLookupResult.waveCode} />
                <WaveCell label="Status">
                  <Badge variant="neutral" className="text-mono text-xs">
                    {waveLookupResult.status}
                  </Badge>
                </WaveCell>
                <WaveCell label="Task Count" value={String(waveLookupResult.taskCount)} />
              </div>

              <div>
                <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">Sales Orders in Wave</p>
                {waveLookupResult.salesOrderIds.length === 0 ? (
                  <p className="text-xs text-slate-500">None</p>
                ) : (
                  <Table>
                    <THead>
                      <tr>
                        <TH>Sales Order ID</TH>
                      </tr>
                    </THead>
                    <TBody>
                      {waveLookupResult.salesOrderIds.map((id) => (
                        <TR key={id}>
                          <TD className="text-mono">{id}</TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* ── Create Wave modal ────────────────────────────────────────── */}
      {showCreateWave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Create Pick Wave</h2>
              <button
                onClick={() => setShowCreateWave(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div>
                <label className={labelCls}>Warehouse *</label>
                <select
                  value={waveWarehouseId}
                  onChange={(e) => setWaveWarehouseId(e.target.value === '' ? '' : Number(e.target.value))}
                  className={inputCls}
                >
                  <option value="">Select warehouse…</option>
                  {waveWarehouses.map((w) => (
                    <option key={w.id} value={w.id}>{w.code} · {w.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelCls}>Sales Order IDs *</label>
                <input
                  value={waveOrderIds}
                  onChange={(e) => setWaveOrderIds(e.target.value)}
                  placeholder="e.g. 1, 2, 3"
                  className={inputCls}
                />
                <p className="mt-1 text-xs text-slate-500">Comma-separated IDs. Find them on the Orders page.</p>
              </div>

              {createWaveError && (
                <p className="text-sm text-rose-600 dark:text-rose-400">{createWaveError}</p>
              )}

              {createWaveResult && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-900/40 dark:bg-emerald-950/30">
                  <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                    Wave created: {createWaveResult.waveCode}
                  </p>
                  <p className="mt-0.5 text-emerald-600 dark:text-emerald-400">
                    {createWaveResult.taskCount} pick task{createWaveResult.taskCount !== 1 ? 's' : ''} generated · Wave ID: {createWaveResult.id}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-800">
              <Button variant="secondary" onClick={() => setShowCreateWave(false)} disabled={creatingWave}>
                {createWaveResult ? 'Close' : 'Cancel'}
              </Button>
              {!createWaveResult && (
                <Button
                  onClick={handleCreateWave}
                  disabled={creatingWave || waveWarehouseId === '' || !waveOrderIds.trim()}
                >
                  {creatingWave ? 'Creating…' : 'Create Wave'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Task detail modal ────────────────────────────────────────── */}
      {(viewTaskLoading || viewTask) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {viewTask ? `Task #${viewTask.id} — ${viewTask.sku}` : 'Loading…'}
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
                  <TaskCell label="SKU" value={viewTask.sku} />
                  <TaskCell label="Status">
                    <Badge variant={viewTask.status === 'COMPLETED' ? 'success' : 'warning'} className="text-mono text-xs">
                      {viewTask.status}
                    </Badge>
                  </TaskCell>
                  <TaskCell label="Zone / Bin" value={`${viewTask.zoneCode} / ${viewTask.binCode}`} />
                  <TaskCell label="Route Seq" value={String(viewTask.routeSequence)} />
                  <TaskCell label="Qty to Pick" value={String(Number(viewTask.quantityToPick))} />
                  <TaskCell label="Qty Picked" value={String(Number(viewTask.quantityPicked))} />
                  <TaskCell label="Sales Order ID" value={String(viewTask.salesOrderId)} />
                  <TaskCell label="Pick Wave ID" value={String(viewTask.pickWaveId)} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const labelCls = 'mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300'
const inputCls = 'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-amber-400/20 disabled:opacity-50'

function WaveCell({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      {children ?? <p className="font-medium text-slate-900 dark:text-slate-100">{value ?? '—'}</p>}
    </div>
  )
}

function TaskCell({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      {children ?? <p className="font-medium text-mono text-slate-900 dark:text-slate-100">{value ?? '—'}</p>}
    </div>
  )
}
