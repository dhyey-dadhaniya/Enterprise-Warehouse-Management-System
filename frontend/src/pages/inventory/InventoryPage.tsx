import { useEffect, useState, useCallback } from 'react'
import { RefreshCcw, Search, Plus, Trash2, Pencil, Eye, X, CheckCircle2 } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Table, TBody, TD, TH, THead, TR } from '../../components/ui/Table'
import { cn } from '../../lib/cn'
import { listInventoryBalances, listLowStock, createAdjustment, createTransfer, type InventoryBalance, type AdjustmentReason, type InventoryTransferResult } from '../../services/inventoryService'
import { listWarehouses, listZones, listBins, listItems, getItem, createItem, updateItem, deleteItem, listAllItems, type Item } from '../../services/catalogService'

type Tab = 'balances' | 'low-stock' | 'items' | 'adjustment' | 'transfer'

const REASONS: { value: AdjustmentReason; label: string }[] = [
  { value: 'CORRECTION', label: 'Correction (add/fix stock)' },
  { value: 'CYCLE_COUNT', label: 'Cycle Count' },
  { value: 'DAMAGE', label: 'Damage (write-off)' },
  { value: 'QUARANTINE', label: 'Quarantine' },
  { value: 'OTHER', label: 'Other' },
]

function formatQty(v: string | number) {
  return Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function InventoryPage() {
  const [tab, setTab] = useState<Tab>('balances')

  // ── Balances state ─────────────────────────────────────────────────
  const [warehouses, setWarehouses] = useState<Array<{ id: number; code: string; name: string }>>([])
  const [warehouseId, setWarehouseId] = useState<number | ''>('')
  const [skuQuery, setSkuQuery] = useState('')
  const [nonZeroOnly, setNonZeroOnly] = useState(true)
  const [page, setPage] = useState(0)
  const [pageSize] = useState(20)

  const [balances, setBalances] = useState<InventoryBalance[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Items state ────────────────────────────────────────────────────
  const [items, setItems] = useState<Item[]>([])
  const [itemsTotal, setItemsTotal] = useState(0)
  const [itemQuery, setItemQuery] = useState('')
  const [itemPage, setItemPage] = useState(0)
  const [itemsLoading, setItemsLoading] = useState(false)
  const [itemsError, setItemsError] = useState<string | null>(null)

  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [form, setForm] = useState({ sku: 'WIDGET-001', name: 'Blue Widget', description: 'Sample inventory item', baseUom: 'EA', active: true })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // ── View state ─────────────────────────────────────────────────────
  const [viewItem, setViewItem] = useState<Item | null>(null)
  const [viewLoading, setViewLoading] = useState(false)

  // ── Adjustment state ───────────────────────────────────────────────
  const [adjWarehouseId, setAdjWarehouseId] = useState<number | ''>('')
  const [adjZoneId, setAdjZoneId] = useState<number | ''>('')
  const [adjBinId, setAdjBinId] = useState<number | ''>('')
  const [adjItemId, setAdjItemId] = useState<number | ''>('')
  const [adjQty, setAdjQty] = useState('100')
  const [adjReason, setAdjReason] = useState<AdjustmentReason>('CORRECTION')
  const [adjNote, setAdjNote] = useState('')
  const [adjZones, setAdjZones] = useState<Array<{ id: number; code: string; name: string }>>([])
  const [adjBins, setAdjBins] = useState<Array<{ id: number; code: string; capacityUnits: number | null }>>([])
  const [adjItems, setAdjItems] = useState<Array<{ id: number; sku: string; name: string }>>([])
  const [adjSaving, setAdjSaving] = useState(false)
  const [adjResult, setAdjResult] = useState<{ onHandQty: string; availableQty: string } | null>(null)
  const [adjError, setAdjError] = useState<string | null>(null)

  // ── Low-stock state ────────────────────────────────────────────────
  const [lowStockItems, setLowStockItems] = useState<InventoryBalance[]>([])
  const [lowStockTotal, setLowStockTotal] = useState(0)
  const [lowStockPage, setLowStockPage] = useState(0)
  const [lowStockThreshold, setLowStockThreshold] = useState('10')
  const [lowStockWarehouseId, setLowStockWarehouseId] = useState<number | ''>('')
  const [lowStockLoading, setLowStockLoading] = useState(false)

  // ── Transfer state ─────────────────────────────────────────────────
  const [transferWarehouseId, setTransferWarehouseId] = useState<number | ''>('')
  const [transferFromZoneId, setTransferFromZoneId] = useState<number | ''>('')
  const [transferFromBinId, setTransferFromBinId] = useState<number | ''>('')
  const [transferToZoneId, setTransferToZoneId] = useState<number | ''>('')
  const [transferToBinId, setTransferToBinId] = useState<number | ''>('')
  const [transferItemId, setTransferItemId] = useState<number | ''>('')
  const [transferQty, setTransferQty] = useState('')
  const [transferNote, setTransferNote] = useState('')
  const [transferZones, setTransferZones] = useState<Array<{ id: number; code: string; name: string }>>([])
  const [transferFromBins, setTransferFromBins] = useState<Array<{ id: number; code: string; capacityUnits: number | null }>>([])
  const [transferToBins, setTransferToBins] = useState<Array<{ id: number; code: string; capacityUnits: number | null }>>([])
  const [transferSaving, setTransferSaving] = useState(false)
  const [transferResult, setTransferResult] = useState<InventoryTransferResult | null>(null)
  const [transferError, setTransferError] = useState<string | null>(null)

  useEffect(() => {
    listWarehouses().then(setWarehouses).catch(() => {})
    listAllItems().then(setAdjItems).catch(() => {})
  }, [])

  // ── Fetch items ────────────────────────────────────────────────────
  const fetchItems = useCallback(async () => {
    setItemsLoading(true)
    setItemsError(null)
    try {
      const res = await listItems({ q: itemQuery.trim() || undefined, page: itemPage, size: 20 })
      setItems(res.content)
      setItemsTotal(res.totalElements)
    } catch {
      setItemsError('Failed to load items.')
    } finally {
      setItemsLoading(false)
    }
  }, [itemQuery, itemPage])

  useEffect(() => {
    if (tab !== 'items') return
    const t = setTimeout(fetchItems, itemQuery ? 300 : 0)
    return () => clearTimeout(t)
  }, [fetchItems, itemQuery, tab])

  // ── Adjustment zone/bin loaders ────────────────────────────────────
  useEffect(() => {
    if (adjWarehouseId === '') { setAdjZones([]); setAdjBins([]); setAdjZoneId(''); setAdjBinId(''); return }
    listZones(Number(adjWarehouseId)).then(setAdjZones).catch(() => {})
    setAdjZoneId('')
    setAdjBinId('')
    setAdjBins([])
  }, [adjWarehouseId])

  useEffect(() => {
    if (adjZoneId === '') { setAdjBins([]); setAdjBinId(''); return }
    listBins(Number(adjZoneId)).then(setAdjBins).catch(() => {})
    setAdjBinId('')
  }, [adjZoneId])

  const handleAdjustment = async () => {
    if (adjWarehouseId === '' || adjBinId === '' || adjItemId === '' || !adjQty) return
    setAdjSaving(true)
    setAdjError(null)
    setAdjResult(null)
    try {
      const res = await createAdjustment({
        warehouseId: Number(adjWarehouseId),
        binId: Number(adjBinId),
        itemId: Number(adjItemId),
        quantityDelta: Number(adjQty),
        reason: adjReason,
        note: adjNote || undefined,
      })
      setAdjResult({ onHandQty: String(res.onHandQty), availableQty: String(res.availableQty) })
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setAdjError(msg ?? 'Adjustment failed.')
    } finally {
      setAdjSaving(false)
    }
  }

  // ── Low-stock fetch ────────────────────────────────────────────────
  const fetchLowStock = useCallback(async () => {
    setLowStockLoading(true)
    try {
      const res = await listLowStock({
        warehouseId: lowStockWarehouseId !== '' ? lowStockWarehouseId : undefined,
        maxAvailable: Number(lowStockThreshold) || 10,
        page: lowStockPage,
        size: 20,
      })
      setLowStockItems(res.content)
      setLowStockTotal(res.totalElements)
    } catch {
      setError('Failed to load low-stock items.')
    } finally {
      setLowStockLoading(false)
    }
  }, [lowStockWarehouseId, lowStockThreshold, lowStockPage])

  useEffect(() => {
    if (tab !== 'low-stock') return
    fetchLowStock()
  }, [fetchLowStock, tab])

  // ── Transfer handlers ──────────────────────────────────────────────
  const handleTransferWarehouseChange = async (id: number | '') => {
    setTransferWarehouseId(id)
    setTransferFromZoneId(''); setTransferFromBinId(''); setTransferFromBins([])
    setTransferToZoneId(''); setTransferToBinId(''); setTransferToBins([])
    setTransferZones([])
    if (id !== '') {
      try { setTransferZones(await listZones(Number(id))) } catch {}
    }
  }

  const handleTransferFromZoneChange = async (zoneId: number | '') => {
    setTransferFromZoneId(zoneId); setTransferFromBinId(''); setTransferFromBins([])
    if (zoneId !== '') {
      try { setTransferFromBins(await listBins(Number(zoneId))) } catch {}
    }
  }

  const handleTransferToZoneChange = async (zoneId: number | '') => {
    setTransferToZoneId(zoneId); setTransferToBinId(''); setTransferToBins([])
    if (zoneId !== '') {
      try { setTransferToBins(await listBins(Number(zoneId))) } catch {}
    }
  }

  const handleTransfer = async () => {
    if (transferWarehouseId === '' || transferFromBinId === '' || transferToBinId === '' || transferItemId === '' || !transferQty) return
    setTransferSaving(true); setTransferError(null); setTransferResult(null)
    try {
      const res = await createTransfer({
        warehouseId: transferWarehouseId as number,
        fromBinId: transferFromBinId as number,
        toBinId: transferToBinId as number,
        itemId: transferItemId as number,
        quantity: Number(transferQty),
        note: transferNote || undefined,
      })
      setTransferResult(res)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setTransferError(msg ?? 'Transfer failed.')
    } finally {
      setTransferSaving(false)
    }
  }

  const resetTransfer = () => {
    setTransferWarehouseId(''); setTransferFromZoneId(''); setTransferFromBinId('')
    setTransferToZoneId(''); setTransferToBinId(''); setTransferItemId('')
    setTransferQty(''); setTransferNote(''); setTransferResult(null); setTransferError(null)
    setTransferZones([]); setTransferFromBins([]); setTransferToBins([])
  }

  const openCreateItem = () => {
    setEditingItem(null)
    setForm({ sku: '', name: '', description: '', baseUom: 'EA', active: true })
    setFormError(null)
    setShowModal(true)
  }

  const openViewItem = async (id: number) => {
    setViewItem(null)
    setViewLoading(true)
    try {
      setViewItem(await getItem(id))
    } catch {
      setItemsError('Failed to load item details.')
    } finally {
      setViewLoading(false)
    }
  }

  const openEditItem = (item: Item) => {
    setEditingItem(item)
    setForm({ sku: item.sku, name: item.name, description: item.description ?? '', baseUom: item.baseUom, active: item.active })
    setFormError(null)
    setShowModal(true)
  }

  const handleSaveItem = async () => {
    setSaving(true)
    setFormError(null)
    try {
      if (editingItem) {
        await updateItem(editingItem.id, {
          sku: form.sku,
          name: form.name,
          description: form.description || undefined,
          baseUom: form.baseUom || 'EA',
          active: form.active,
        })
      } else {
        await createItem({
          sku: form.sku,
          name: form.name,
          description: form.description || undefined,
          baseUom: form.baseUom || 'EA',
        })
      }
      setShowModal(false)
      fetchItems()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setFormError(msg ?? `Failed to ${editingItem ? 'update' : 'create'} item.`)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteItem = async (id: number) => {
    if (!window.confirm('Delete this item? This cannot be undone.')) return
    try {
      await deleteItem(id)
      fetchItems()
    } catch {
      setItemsError('Failed to delete item. It may have inventory records.')
    }
  }

  const itemTotalPages = Math.max(1, Math.ceil(itemsTotal / 20))

  const fetchBalances = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await listInventoryBalances({
        warehouseId: warehouseId !== '' ? warehouseId : undefined,
        sku: skuQuery.trim() || undefined,
        nonZeroOnly,
        page,
        size: pageSize,
      })
      setBalances(res.content)
      setTotal(res.totalElements)
    } catch {
      setError('Failed to load inventory. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }, [warehouseId, skuQuery, nonZeroOnly, page, pageSize])

  useEffect(() => {
    const t = setTimeout(fetchBalances, skuQuery ? 300 : 0)
    return () => clearTimeout(t)
  }, [fetchBalances, skuQuery])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  function handleFilterChange(fn: () => void) {
    fn()
    setPage(0)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Operations</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Inventory Management
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {tab === 'items' && (
            <Button size="sm" onClick={openCreateItem}>
              <Plus className="size-4" /> New Item
            </Button>
          )}
          {tab === 'balances' && (
            <Button variant="secondary" size="sm" onClick={fetchBalances} disabled={loading}>
              <RefreshCcw className={cn('size-4', loading && 'animate-spin')} /> Refresh
            </Button>
          )}
          {tab === 'low-stock' && (
            <Button variant="secondary" size="sm" onClick={fetchLowStock} disabled={lowStockLoading}>
              <RefreshCcw className={cn('size-4', lowStockLoading && 'animate-spin')} /> Refresh
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-100/70 p-1 dark:border-slate-800 dark:bg-slate-900/50">
        {(['balances', 'low-stock', 'items', 'adjustment', 'transfer'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex-1 rounded-lg py-2 text-sm font-medium capitalize transition',
              tab === t
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-100'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
            )}
          >
            {{ balances: 'Balances', 'low-stock': 'Low Stock', items: 'Item Catalog', adjustment: 'Adjustment', transfer: 'Transfer' }[t]}
          </button>
        ))}
      </div>

      {/* ── Items tab ──────────────────────────────────────────────── */}
      {tab === 'items' && (
        <Card className="p-0">
          <div className="border-b border-slate-200 p-4 dark:border-slate-800">
            <div className="relative max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                value={itemQuery}
                onChange={(e) => { setItemQuery(e.target.value); setItemPage(0) }}
                placeholder="Search by SKU or name…"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white/85 pl-9 pr-3 text-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-800 dark:bg-slate-950/70 dark:focus:ring-amber-400/20"
              />
            </div>
          </div>

          <div className="p-4">
            {itemsLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-10 w-full animate-pulse rounded-xl bg-slate-900/5 dark:bg-white/5" />
                ))}
              </div>
            ) : itemsError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                {itemsError}
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white/60 p-6 text-center text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300">
                No items found.{' '}
                <button onClick={openCreateItem} className="underline">
                  Create your first item
                </button>
              </div>
            ) : (
              <Table>
                <THead>
                  <tr>
                    <TH>SKU</TH>
                    <TH>Name</TH>
                    <TH>Description</TH>
                    <TH>UoM</TH>
                    <TH>Status</TH>
                    <TH className="text-right">Actions</TH>
                  </tr>
                </THead>
                <TBody>
                  {items.map((item) => (
                    <TR key={item.id}>
                      <TD className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">{item.sku}</TD>
                      <TD className="font-medium text-slate-800 dark:text-slate-200">{item.name}</TD>
                      <TD className="text-slate-500 dark:text-slate-400">{item.description ?? '—'}</TD>
                      <TD className="font-mono text-xs text-slate-600 dark:text-slate-400">{item.baseUom}</TD>
                      <TD>
                        <span className={cn(
                          'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                          item.active
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                        )}>
                          {item.active ? 'Active' : 'Inactive'}
                        </span>
                      </TD>
                      <TD className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openViewItem(item.id)}>
                            <Eye className="size-4 text-slate-400" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openEditItem(item)}>
                            <Pencil className="size-4 text-slate-500" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteItem(item.id)}>
                            <Trash2 className="size-4 text-rose-500" />
                          </Button>
                        </div>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4 text-sm dark:border-slate-800">
            <div className="text-slate-600 dark:text-slate-400">
              Showing <span className="font-semibold">{items.length}</span> of{' '}
              <span className="font-semibold">{itemsTotal}</span> items
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setItemPage((p) => Math.max(0, p - 1))} disabled={itemPage === 0}>Prev</Button>
              <span className="text-xs text-slate-500">{itemPage + 1} / {itemTotalPages}</span>
              <Button variant="secondary" size="sm" onClick={() => setItemPage((p) => Math.min(itemTotalPages - 1, p + 1))} disabled={itemPage >= itemTotalPages - 1}>Next</Button>
            </div>
          </div>
        </Card>
      )}

      {/* ── Adjustment tab ────────────────────────────────────────────── */}
      {tab === 'adjustment' && (
        <Card className="p-0">
          <div className="border-b border-slate-200 p-4 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Add / Adjust Stock in a Bin</h2>
            <p className="mt-0.5 text-xs text-slate-500">Use a positive quantity to add stock, negative to remove.</p>
          </div>
          <div className="grid gap-4 p-4 md:grid-cols-2">
            {/* Warehouse */}
            <AdjField label="Warehouse *">
              <select value={adjWarehouseId} onChange={(e) => setAdjWarehouseId(e.target.value === '' ? '' : Number(e.target.value))} className={adjSelectCls}>
                <option value="">Select warehouse…</option>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.code} · {w.name}</option>)}
              </select>
            </AdjField>

            {/* Zone */}
            <AdjField label="Zone *">
              <select value={adjZoneId} onChange={(e) => setAdjZoneId(e.target.value === '' ? '' : Number(e.target.value))} disabled={adjWarehouseId === ''} className={adjSelectCls}>
                <option value="">Select zone…</option>
                {adjZones.map((z) => <option key={z.id} value={z.id}>{z.code} · {z.name}</option>)}
              </select>
            </AdjField>

            {/* Bin */}
            <AdjField label="Bin *">
              <select value={adjBinId} onChange={(e) => setAdjBinId(e.target.value === '' ? '' : Number(e.target.value))} disabled={adjZoneId === ''} className={adjSelectCls}>
                <option value="">Select bin…</option>
                {adjBins.map((b) => <option key={b.id} value={b.id}>{b.code}{b.capacityUnits != null ? ` (cap ${b.capacityUnits})` : ''}</option>)}
              </select>
            </AdjField>

            {/* Item */}
            <AdjField label="Item *">
              <select value={adjItemId} onChange={(e) => setAdjItemId(e.target.value === '' ? '' : Number(e.target.value))} className={adjSelectCls}>
                <option value="">Select item…</option>
                {adjItems.map((i) => <option key={i.id} value={i.id}>{i.sku} · {i.name}</option>)}
              </select>
            </AdjField>

            {/* Quantity */}
            <AdjField label="Quantity Delta *">
              <input type="number" value={adjQty} onChange={(e) => setAdjQty(e.target.value)} placeholder="e.g. 100 to add, -10 to remove" className={adjSelectCls} />
            </AdjField>

            {/* Reason */}
            <AdjField label="Reason *">
              <select value={adjReason} onChange={(e) => setAdjReason(e.target.value as AdjustmentReason)} className={adjSelectCls}>
                {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </AdjField>

            {/* Note */}
            <AdjField label="Note" className="md:col-span-2">
              <input value={adjNote} onChange={(e) => setAdjNote(e.target.value)} placeholder="Optional note" className={adjSelectCls} />
            </AdjField>
          </div>

          {adjError && (
            <div className="mx-4 mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">
              {adjError}
            </div>
          )}

          {adjResult && (
            <div className="mx-4 mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-950/40">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="size-4" /> Adjustment successful!
              </div>
              <div className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
                On-hand: <strong>{adjResult.onHandQty}</strong> &nbsp;·&nbsp; Available: <strong>{adjResult.availableQty}</strong>
              </div>
            </div>
          )}

          <div className="border-t border-slate-200 p-4 dark:border-slate-800">
            <Button
              onClick={handleAdjustment}
              disabled={adjSaving || adjWarehouseId === '' || adjBinId === '' || adjItemId === '' || !adjQty}
            >
              {adjSaving ? 'Saving…' : 'Apply Adjustment'}
            </Button>
          </div>
        </Card>
      )}

      {/* ── Low Stock tab ─────────────────────────────────────────────── */}
      {tab === 'low-stock' && (
        <Card className="p-0">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Threshold ≤</label>
              <input
                type="number"
                value={lowStockThreshold}
                onChange={(e) => { setLowStockThreshold(e.target.value); setLowStockPage(0) }}
                className="h-9 w-20 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                min={0}
              />
            </div>
            <select
              value={lowStockWarehouseId}
              onChange={(e) => { setLowStockWarehouseId(e.target.value !== '' ? Number(e.target.value) : ''); setLowStockPage(0) }}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="">All warehouses</option>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.code} · {w.name}</option>)}
            </select>
          </div>
          <div className="p-4">
            {lowStockLoading ? (
              <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-10 w-full animate-pulse rounded-xl bg-slate-900/5 dark:bg-white/5" />)}</div>
            ) : lowStockItems.length === 0 ? (
              <div className="rounded-xl border border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-slate-800">
                No items below threshold {lowStockThreshold}.
              </div>
            ) : (
              <Table>
                <THead>
                  <tr>
                    <TH>SKU</TH><TH>Item</TH><TH>Warehouse</TH><TH>Zone</TH><TH>Bin</TH>
                    <TH className="text-right">On Hand</TH>
                    <TH className="text-right">Reserved</TH>
                    <TH className="text-right text-rose-600">Available</TH>
                  </tr>
                </THead>
                <TBody>
                  {lowStockItems.map((b) => (
                    <TR key={b.id}>
                      <TD className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">{b.sku}</TD>
                      <TD className="text-slate-700 dark:text-slate-200">{b.itemName}</TD>
                      <TD className="font-mono text-xs text-slate-500">{b.warehouseCode}</TD>
                      <TD className="font-mono text-xs text-slate-500">{b.zoneCode}</TD>
                      <TD className="font-mono text-xs text-slate-500">{b.binCode}</TD>
                      <TD className="text-right font-semibold text-slate-900 dark:text-slate-100">{formatQty(b.onHandQty)}</TD>
                      <TD className="text-right text-slate-500">{formatQty(b.reservedQty)}</TD>
                      <TD className="text-right font-semibold text-rose-600 dark:text-rose-400">{formatQty(b.availableQty)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 p-4 text-sm text-slate-500 dark:border-slate-800">
            <span>{lowStockTotal} items below threshold</span>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setLowStockPage((p) => Math.max(0, p - 1))} disabled={lowStockPage === 0}>Prev</Button>
              <span className="text-xs">{lowStockPage + 1} / {Math.max(1, Math.ceil(lowStockTotal / 20))}</span>
              <Button variant="secondary" size="sm" onClick={() => setLowStockPage((p) => p + 1)} disabled={(lowStockPage + 1) * 20 >= lowStockTotal}>Next</Button>
            </div>
          </div>
        </Card>
      )}

      {/* ── Transfer tab ───────────────────────────────────────────────── */}
      {tab === 'transfer' && (
        <Card className="p-0">
          <div className="border-b border-slate-200 p-4 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Move Stock Between Bins</h2>
            <p className="mt-0.5 text-xs text-slate-500">Both bins must be in the same warehouse. Creates paired TRANSFER_OUT / TRANSFER_IN ledger entries.</p>
          </div>

          {transferResult ? (
            <div className="p-4 space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="size-4" /> Transfer complete
                </div>
                <div className="mt-2 space-y-1 text-sm text-emerald-700 dark:text-emerald-300">
                  <div>Ref: <span className="font-mono font-semibold">{transferResult.transferRef}</span></div>
                  <div>From-bin on-hand after: <strong>{transferResult.fromBinOnHandAfter}</strong></div>
                  <div>To-bin on-hand after: <strong>{transferResult.toBinOnHandAfter}</strong></div>
                  <div className="text-xs text-emerald-600 dark:text-emerald-400">Out ledger #{transferResult.outLedgerId} · In ledger #{transferResult.inLedgerId}</div>
                </div>
              </div>
              <Button variant="secondary" onClick={resetTransfer}>New Transfer</Button>
            </div>
          ) : (
            <div className="grid gap-4 p-4 md:grid-cols-2">
              {/* Warehouse */}
              <AdjField label="Warehouse *" className="md:col-span-2">
                <select value={transferWarehouseId} onChange={(e) => handleTransferWarehouseChange(e.target.value === '' ? '' : Number(e.target.value))} className={adjSelectCls}>
                  <option value="">Select warehouse…</option>
                  {warehouses.map((w) => <option key={w.id} value={w.id}>{w.code} · {w.name}</option>)}
                </select>
              </AdjField>

              {/* From */}
              <AdjField label="From Zone *">
                <select value={transferFromZoneId} onChange={(e) => handleTransferFromZoneChange(e.target.value === '' ? '' : Number(e.target.value))} disabled={transferWarehouseId === ''} className={adjSelectCls}>
                  <option value="">Select zone…</option>
                  {transferZones.map((z) => <option key={z.id} value={z.id}>{z.code} · {z.name}</option>)}
                </select>
              </AdjField>
              <AdjField label="From Bin *">
                <select value={transferFromBinId} onChange={(e) => setTransferFromBinId(e.target.value === '' ? '' : Number(e.target.value))} disabled={transferFromZoneId === ''} className={adjSelectCls}>
                  <option value="">Select bin…</option>
                  {transferFromBins.map((b) => <option key={b.id} value={b.id}>{b.code}{b.capacityUnits != null ? ` (cap ${b.capacityUnits})` : ''}</option>)}
                </select>
              </AdjField>

              {/* To */}
              <AdjField label="To Zone *">
                <select value={transferToZoneId} onChange={(e) => handleTransferToZoneChange(e.target.value === '' ? '' : Number(e.target.value))} disabled={transferWarehouseId === ''} className={adjSelectCls}>
                  <option value="">Select zone…</option>
                  {transferZones.map((z) => <option key={z.id} value={z.id}>{z.code} · {z.name}</option>)}
                </select>
              </AdjField>
              <AdjField label="To Bin *">
                <select value={transferToBinId} onChange={(e) => setTransferToBinId(e.target.value === '' ? '' : Number(e.target.value))} disabled={transferToZoneId === ''} className={adjSelectCls}>
                  <option value="">Select bin…</option>
                  {transferToBins.map((b) => <option key={b.id} value={b.id}>{b.code}{b.capacityUnits != null ? ` (cap ${b.capacityUnits})` : ''}</option>)}
                </select>
              </AdjField>

              {/* Item + Qty */}
              <AdjField label="Item *">
                <select value={transferItemId} onChange={(e) => setTransferItemId(e.target.value === '' ? '' : Number(e.target.value))} className={adjSelectCls}>
                  <option value="">Select item…</option>
                  {adjItems.map((i) => <option key={i.id} value={i.id}>{i.sku} · {i.name}</option>)}
                </select>
              </AdjField>
              <AdjField label="Quantity *">
                <input type="number" min={0.01} step="any" value={transferQty} onChange={(e) => setTransferQty(e.target.value)} placeholder="e.g. 50" className={adjSelectCls} />
              </AdjField>

              <AdjField label="Note" className="md:col-span-2">
                <input value={transferNote} onChange={(e) => setTransferNote(e.target.value)} placeholder="Optional" className={adjSelectCls} />
              </AdjField>
            </div>
          )}

          {transferError && (
            <div className="mx-4 mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">{transferError}</div>
          )}

          {!transferResult && (
            <div className="border-t border-slate-200 p-4 dark:border-slate-800">
              <Button
                onClick={handleTransfer}
                disabled={transferSaving || transferWarehouseId === '' || transferFromBinId === '' || transferToBinId === '' || transferItemId === '' || !transferQty}
              >
                {transferSaving ? 'Transferring…' : 'Execute Transfer'}
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* ── Balances tab ──────────────────────────────────────────────── */}
      {tab === 'balances' && <Card className="p-0">
        <div className="border-b border-slate-200 p-4 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                value={skuQuery}
                onChange={(e) => handleFilterChange(() => setSkuQuery(e.target.value))}
                placeholder="Search by SKU…"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white/85 pl-9 pr-3 text-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-800 dark:bg-slate-950/70 dark:focus:ring-amber-400/20"
              />
            </div>

            <select
              value={warehouseId}
              onChange={(e) =>
                handleFilterChange(() =>
                  setWarehouseId(e.target.value !== '' ? Number(e.target.value) : ''),
                )
              }
              className="h-10 rounded-xl border border-slate-200 bg-white/85 px-3 text-sm outline-none focus:ring-2 focus:ring-amber-200 dark:border-slate-800 dark:bg-slate-950/70 dark:focus:ring-amber-400/20"
            >
              <option value="">All warehouses</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.code} · {w.name}
                </option>
              ))}
            </select>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={nonZeroOnly}
                onChange={(e) => handleFilterChange(() => setNonZeroOnly(e.target.checked))}
                className="rounded border-slate-300 accent-amber-500"
              />
              Non-zero only
            </label>
          </div>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 w-full animate-pulse rounded-xl bg-slate-900/5 dark:bg-white/5" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
              {error}
            </div>
          ) : balances.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white/60 p-6 text-center text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300">
              No inventory records match your filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <THead>
                  <tr>
                    <TH>SKU</TH>
                    <TH>Item Name</TH>
                    <TH>Warehouse</TH>
                    <TH>Zone</TH>
                    <TH>Bin</TH>
                    <TH className="text-right">On Hand</TH>
                    <TH className="text-right">Reserved</TH>
                    <TH className="text-right">Available</TH>
                    <TH>Updated</TH>
                  </tr>
                </THead>
                <TBody>
                  {balances.map((b) => (
                    <TR key={b.id}>
                      <TD>
                        <span className="text-mono font-semibold text-slate-900 dark:text-slate-100">
                          {b.sku}
                        </span>
                      </TD>
                      <TD className="text-slate-700 dark:text-slate-200">{b.itemName}</TD>
                      <TD>
                        <span className="text-mono text-xs text-slate-600 dark:text-slate-400">
                          {b.warehouseCode}
                        </span>
                      </TD>
                      <TD>
                        <span className="text-mono text-xs text-slate-600 dark:text-slate-400">
                          {b.zoneCode}
                        </span>
                      </TD>
                      <TD>
                        <span className="text-mono text-xs text-slate-600 dark:text-slate-400">
                          {b.binCode}
                        </span>
                      </TD>
                      <TD className="text-mono text-right font-semibold text-slate-900 dark:text-slate-100">
                        {formatQty(b.onHandQty)}
                      </TD>
                      <TD className="text-mono text-right text-slate-600 dark:text-slate-400">
                        {formatQty(b.reservedQty)}
                      </TD>
                      <TD
                        className={cn(
                          'text-mono text-right font-semibold',
                          Number(b.availableQty) <= 0
                            ? 'text-rose-600 dark:text-rose-400'
                            : Number(b.availableQty) < 10
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-emerald-600 dark:text-emerald-400',
                        )}
                      >
                        {formatQty(b.availableQty)}
                      </TD>
                      <TD className="text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(b.updatedAt)}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4 text-sm dark:border-slate-800">
          <div className="text-slate-600 dark:text-slate-400">
            Showing{' '}
            <span className="text-mono font-semibold">{balances.length}</span> of{' '}
            <span className="text-mono font-semibold">{total}</span> records
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Prev
            </Button>
            <span className="text-mono text-xs text-slate-600 dark:text-slate-400">
              Page {page + 1} / {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>}

      {/* ── Create Item modal ─────────────────────────────────────────── */}
      {(viewLoading || viewItem) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Item Details</h2>
              <button
                onClick={() => setViewItem(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <X className="size-4" />
              </button>
            </div>

            {viewLoading ? (
              <div className="flex justify-center py-10 text-sm text-slate-400">Loading…</div>
            ) : viewItem && (
              <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
                <ViewRow label="ID"          value={String(viewItem.id)} />
                <ViewRow label="SKU"         value={viewItem.sku} mono />
                <ViewRow label="Name"        value={viewItem.name} />
                <ViewRow label="Description" value={viewItem.description ?? '—'} />
                <ViewRow label="Unit of Measure" value={viewItem.baseUom} mono />
                <ViewRow label="Status"      value={viewItem.active ? 'Active' : 'Inactive'} />
                <ViewRow label="Created"     value={new Date(viewItem.createdAt).toLocaleString()} />
                <ViewRow label="Updated"     value={new Date(viewItem.updatedAt).toLocaleString()} />
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <Button variant="secondary" onClick={() => setViewItem(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-950">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {editingItem ? 'Edit Item' : 'New Item'}
            </h2>
            <div className="mt-4 space-y-3">
              <ItemField label="SKU *" value={form.sku} onChange={(v) => setForm((f) => ({ ...f, sku: v }))} placeholder="e.g. WIDGET-001" />
              <ItemField label="Name *" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="e.g. Blue Widget" />
              <ItemField label="Description" value={form.description} onChange={(v) => setForm((f) => ({ ...f, description: v }))} placeholder="Optional" />
              <ItemField label="Unit of Measure" value={form.baseUom} onChange={(v) => setForm((f) => ({ ...f, baseUom: v }))} placeholder="e.g. EA, KG, BOX" />
              {editingItem && (
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                    className="rounded border-slate-300 accent-amber-500"
                  />
                  Active
                </label>
              )}
            </div>
            {formError && <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">{formError}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</Button>
              <Button onClick={handleSaveItem} disabled={saving || !form.sku || !form.name}>
                {saving ? 'Saving…' : editingItem ? 'Save Changes' : 'Create'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const adjSelectCls = 'h-10 w-full rounded-xl border border-slate-200 bg-white/85 px-3 text-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-800 dark:bg-slate-950/70 dark:focus:ring-amber-400/20 disabled:cursor-not-allowed disabled:opacity-50'

function AdjField({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">{label}</label>
      {children}
    </div>
  )
}

function ViewRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 py-2.5">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      <span className={cn('text-right text-sm text-slate-900 dark:text-slate-100', mono && 'font-mono')}>{value}</span>
    </div>
  )
}

function ItemField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-slate-500"
      />
    </div>
  )
}
