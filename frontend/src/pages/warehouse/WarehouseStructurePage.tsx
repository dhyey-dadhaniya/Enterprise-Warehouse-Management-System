import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Pencil, Eye, ChevronDown, X } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Table, THead, TH, TBody, TR, TD } from '../../components/ui/Table'
import {
  getWarehouses, getWarehouse, createWarehouse, updateWarehouse, deleteWarehouse,
  getZones, getZone, createZone, updateZone, deleteZone,
  getAisles, getAisle, createAisle, updateAisle, deleteAisle,
  getBins, getBin, createBin, updateBin, deleteBin,
} from '../../services/warehouseService'
import type { WarehouseDetail, Zone, Aisle, Bin } from '../../types/domain'
import { cn } from '../../lib/cn'

type Tab = 'warehouses' | 'zones' | 'aisles' | 'bins'

const emptyForm = { code: '', name: '', addressLine: '', description: '', capacityUnits: '' }

export function WarehouseStructurePage() {
  const [tab, setTab] = useState<Tab>('warehouses')

  // Data
  const [warehouses, setWarehouses] = useState<WarehouseDetail[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [aisles, setAisles] = useState<Aisle[]>([])
  const [bins, setBins] = useState<Bin[]>([])

  // Selectors
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | ''>('')
  const [selectedZoneId, setSelectedZoneId] = useState<number | ''>('')
  const [zonesForSubTab, setZonesForSubTab] = useState<Zone[]>([])

  // UI state
  const [loading, setLoading] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // View modal state
  const [viewItem, setViewItem] = useState<WarehouseDetail | Zone | Aisle | Bin | null>(null)
  const [viewLoading, setViewLoading] = useState(false)
  const [viewError, setViewError] = useState<string | null>(null)

  // ── Load warehouses once ──────────────────────────────────────────
  useEffect(() => {
    getWarehouses()
      .then((r) => setWarehouses(r.content))
      .catch(() => setPageError('Failed to load warehouses'))
  }, [])

  // ── Loaders ───────────────────────────────────────────────────────
  const loadZones = useCallback(async (warehouseId: number) => {
    setLoading(true)
    setPageError(null)
    try {
      setZones((await getZones(warehouseId)).content)
    } catch {
      setPageError('Failed to load zones')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadZonesForSubTab = useCallback(async (warehouseId: number) => {
    try {
      setZonesForSubTab((await getZones(warehouseId)).content)
    } catch {
      setZonesForSubTab([])
    }
  }, [])

  const loadAisles = useCallback(async (zoneId: number) => {
    setLoading(true)
    setPageError(null)
    try {
      setAisles((await getAisles(zoneId)).content)
    } catch {
      setPageError('Failed to load aisles')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadBins = useCallback(async (zoneId: number) => {
    setLoading(true)
    setPageError(null)
    try {
      setBins((await getBins(zoneId)).content)
    } catch {
      setPageError('Failed to load bins')
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Selection handlers ────────────────────────────────────────────
  const handleWarehouseSelect = (id: number | '') => {
    setSelectedWarehouseId(id)
    setZones([])
    if (id !== '') loadZones(id)
  }

  const handleWarehouseSelectForSubTab = (id: number | '') => {
    setSelectedWarehouseId(id)
    setSelectedZoneId('')
    setAisles([])
    setBins([])
    setZonesForSubTab([])
    if (id !== '') loadZonesForSubTab(id)
  }

  const handleZoneSelect = (id: number | '') => {
    setSelectedZoneId(id)
    setAisles([])
    setBins([])
    if (id !== '') {
      if (tab === 'aisles') loadAisles(id)
      else loadBins(id)
    }
  }

  // ── Tab switch ────────────────────────────────────────────────────
  const switchTab = (t: Tab) => {
    setTab(t)
    setPageError(null)
    setSelectedWarehouseId('')
    setSelectedZoneId('')
    setZones([])
    setAisles([])
    setBins([])
    setZonesForSubTab([])
  }

  // ── Open create modal ─────────────────────────────────────────────
  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setFormError(null)
    setShowModal(true)
  }

  // ── Open edit modal ───────────────────────────────────────────────
  const openEdit = (id: number, prefill: Partial<typeof emptyForm>) => {
    setEditingId(id)
    setForm({ ...emptyForm, ...prefill })
    setFormError(null)
    setShowModal(true)
  }

  // ── Open view modal ───────────────────────────────────────────────
  const openView = async (id: number) => {
    setViewItem(null)
    setViewError(null)
    setViewLoading(true)
    try {
      if (tab === 'warehouses') setViewItem(await getWarehouse(id))
      else if (tab === 'zones') setViewItem(await getZone(id))
      else if (tab === 'aisles') setViewItem(await getAisle(id))
      else setViewItem(await getBin(id))
    } catch {
      setViewError('Failed to load details.')
    } finally {
      setViewLoading(false)
    }
  }

  // ── Submit (create or update) ─────────────────────────────────────
  const handleSubmit = async () => {
    setSaving(true)
    setFormError(null)
    try {
      if (tab === 'warehouses') {
        const payload = { code: form.code, name: form.name, addressLine: form.addressLine || undefined }
        if (editingId !== null) {
          const updated = await updateWarehouse(editingId, payload)
          setWarehouses((prev) => prev.map((w) => (w.id === editingId ? updated : w)))
        } else {
          await createWarehouse(payload)
          setWarehouses((await getWarehouses()).content)
        }
      } else if (tab === 'zones' && selectedWarehouseId !== '') {
        const payload = { code: form.code, name: form.name }
        if (editingId !== null) {
          const updated = await updateZone(editingId, payload)
          setZones((prev) => prev.map((z) => (z.id === editingId ? updated : z)))
        } else {
          await createZone(selectedWarehouseId, payload)
          loadZones(selectedWarehouseId)
        }
      } else if (tab === 'aisles' && selectedZoneId !== '') {
        const payload = { code: form.code, name: form.name }
        if (editingId !== null) {
          const updated = await updateAisle(editingId, payload)
          setAisles((prev) => prev.map((a) => (a.id === editingId ? updated : a)))
        } else {
          await createAisle(selectedZoneId, payload)
          loadAisles(selectedZoneId)
        }
      } else if (tab === 'bins' && selectedZoneId !== '') {
        const payload = {
          code: form.code,
          description: form.description || undefined,
          capacityUnits: form.capacityUnits ? parseInt(form.capacityUnits, 10) : undefined,
        }
        if (editingId !== null) {
          const updated = await updateBin(editingId, payload)
          setBins((prev) => prev.map((b) => (b.id === editingId ? updated : b)))
        } else {
          await createBin(selectedZoneId, payload)
          loadBins(selectedZoneId)
        }
      }
      setShowModal(false)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setFormError(msg ?? `Failed to ${editingId !== null ? 'update' : 'create'}. Ensure the code is unique.`)
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────
  const handleDelete = async (id: number) => {
    const noun = { warehouses: 'warehouse', zones: 'zone', aisles: 'aisle', bins: 'bin' }[tab]
    if (!window.confirm(`Delete this ${noun}? This cannot be undone.`)) return
    setPageError(null)
    try {
      if (tab === 'warehouses') {
        await deleteWarehouse(id)
        setWarehouses((await getWarehouses()).content)
      } else if (tab === 'zones' && selectedWarehouseId !== '') {
        await deleteZone(id)
        loadZones(selectedWarehouseId)
      } else if (tab === 'aisles' && selectedZoneId !== '') {
        await deleteAisle(id)
        loadAisles(selectedZoneId)
      } else if (tab === 'bins' && selectedZoneId !== '') {
        await deleteBin(id)
        loadBins(selectedZoneId)
      }
    } catch {
      setPageError('Failed to delete. It may have dependent records.')
    }
  }

  const createLabel = { warehouses: 'New Warehouse', zones: 'New Zone', aisles: 'New Aisle', bins: 'New Bin' }[tab]
  const modalTitle = editingId !== null
    ? `Edit ${tab.slice(0, -1).charAt(0).toUpperCase() + tab.slice(1, -1)}`
    : createLabel

  const requiresName = tab !== 'bins'
  const canSubmit = !saving && !!form.code && (!requiresName || !!form.name)

  const createDisabled =
    (tab === 'zones' && selectedWarehouseId === '') ||
    (tab === 'aisles' && selectedZoneId === '') ||
    (tab === 'bins' && selectedZoneId === '')

  const needsZoneSelector = tab === 'aisles' || tab === 'bins'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Warehouse Structure
        </h1>
        <Button onClick={openCreate} disabled={createDisabled} title={createDisabled ? 'Select a parent first' : undefined}>
          <Plus className="size-4" />
          {createLabel}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-100/70 p-1 dark:border-slate-800 dark:bg-slate-900/50">
        {(['warehouses', 'zones', 'aisles', 'bins'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            className={cn(
              'flex-1 rounded-lg py-2 text-sm font-medium capitalize transition',
              tab === t
                ? 'bg-white text-slate-900 shadow-soft dark:bg-slate-950 dark:text-slate-100'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Selectors */}
      {tab === 'zones' && (
        <SelectField
          label="Select Warehouse"
          value={selectedWarehouseId}
          onChange={(v) => handleWarehouseSelect(v === '' ? '' : Number(v))}
          options={warehouses.map((w) => ({ value: w.id, label: `${w.code} — ${w.name}` }))}
          placeholder="Choose a warehouse…"
        />
      )}

      {needsZoneSelector && (
        <div className="flex gap-4">
          <SelectField
            label="Select Warehouse"
            value={selectedWarehouseId}
            onChange={(v) => handleWarehouseSelectForSubTab(v === '' ? '' : Number(v))}
            options={warehouses.map((w) => ({ value: w.id, label: `${w.code} — ${w.name}` }))}
            placeholder="Choose a warehouse…"
            className="flex-1"
          />
          <SelectField
            label="Select Zone"
            value={selectedZoneId}
            onChange={(v) => handleZoneSelect(v === '' ? '' : Number(v))}
            options={zonesForSubTab.map((z) => ({ value: z.id, label: `${z.code} — ${z.name}` }))}
            placeholder={selectedWarehouseId === '' ? 'Select warehouse first' : 'Choose a zone…'}
            disabled={selectedWarehouseId === ''}
            className="flex-1"
          />
        </div>
      )}

      {pageError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">
          {pageError}
        </div>
      )}

      {/* Tables */}
      {loading ? (
        <div className="flex justify-center py-16 text-sm text-slate-400">Loading…</div>
      ) : tab === 'warehouses' ? (
        warehouses.length === 0 ? (
          <EmptyState label="warehouse" onAdd={openCreate} />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Code</TH>
                <TH>Name</TH>
                <TH>Address</TH>
                <TH className="text-right">Actions</TH>
              </tr>
            </THead>
            <TBody>
              {warehouses.map((w) => (
                <TR key={w.id}>
                  <TD className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">{w.code}</TD>
                  <TD className="font-medium text-slate-900 dark:text-slate-100">{w.name}</TD>
                  <TD className="text-slate-500 dark:text-slate-400">{w.addressLine ?? '—'}</TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openView(w.id)}>
                        <Eye className="size-4 text-slate-400" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(w.id, { code: w.code, name: w.name, addressLine: w.addressLine ?? '' })}>
                        <Pencil className="size-4 text-slate-500" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(w.id)}>
                        <Trash2 className="size-4 text-rose-500" />
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )
      ) : tab === 'zones' ? (
        selectedWarehouseId === '' ? (
          <div className="flex justify-center py-16 text-sm text-slate-400">Select a warehouse to view its zones.</div>
        ) : zones.length === 0 ? (
          <EmptyState label="zone" onAdd={openCreate} />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Code</TH>
                <TH>Name</TH>
                <TH className="text-right">Actions</TH>
              </tr>
            </THead>
            <TBody>
              {zones.map((z) => (
                <TR key={z.id}>
                  <TD className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">{z.code}</TD>
                  <TD className="font-medium text-slate-900 dark:text-slate-100">{z.name}</TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openView(z.id)}>
                        <Eye className="size-4 text-slate-400" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(z.id, { code: z.code, name: z.name })}>
                        <Pencil className="size-4 text-slate-500" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(z.id)}>
                        <Trash2 className="size-4 text-rose-500" />
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )
      ) : tab === 'aisles' ? (
        selectedZoneId === '' ? (
          <div className="flex justify-center py-16 text-sm text-slate-400">Select a warehouse and zone to view aisles.</div>
        ) : aisles.length === 0 ? (
          <EmptyState label="aisle" onAdd={openCreate} />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Code</TH>
                <TH>Name</TH>
                <TH className="text-right">Actions</TH>
              </tr>
            </THead>
            <TBody>
              {aisles.map((a) => (
                <TR key={a.id}>
                  <TD className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">{a.code}</TD>
                  <TD className="font-medium text-slate-900 dark:text-slate-100">{a.name}</TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openView(a.id)}>
                        <Eye className="size-4 text-slate-400" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(a.id, { code: a.code, name: a.name })}>
                        <Pencil className="size-4 text-slate-500" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(a.id)}>
                        <Trash2 className="size-4 text-rose-500" />
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )
      ) : (
        selectedZoneId === '' ? (
          <div className="flex justify-center py-16 text-sm text-slate-400">Select a warehouse and zone to view bins.</div>
        ) : bins.length === 0 ? (
          <EmptyState label="bin" onAdd={openCreate} />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Code</TH>
                <TH>Description</TH>
                <TH>Capacity</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </tr>
            </THead>
            <TBody>
              {bins.map((b) => (
                <TR key={b.id}>
                  <TD className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">{b.code}</TD>
                  <TD className="text-slate-700 dark:text-slate-300">{b.description ?? '—'}</TD>
                  <TD className="text-slate-500 dark:text-slate-400">{b.capacityUnits != null ? b.capacityUnits : '∞'}</TD>
                  <TD>
                    <span className={cn(
                      'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                      b.active
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                    )}>
                      {b.active ? 'Active' : 'Inactive'}
                    </span>
                  </TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openView(b.id)}>
                        <Eye className="size-4 text-slate-400" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(b.id, { code: b.code, description: b.description ?? '', capacityUnits: b.capacityUnits != null ? String(b.capacityUnits) : '' })}>
                        <Pencil className="size-4 text-slate-500" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(b.id)}>
                        <Trash2 className="size-4 text-rose-500" />
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )
      )}

      {/* View modal */}
      {(viewLoading || viewItem || viewError) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {{ warehouses: 'Warehouse', zones: 'Zone', aisles: 'Aisle', bins: 'Bin' }[tab]} Details
              </h2>
              <button
                onClick={() => { setViewItem(null); setViewError(null) }}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <X className="size-4" />
              </button>
            </div>

            {viewLoading && (
              <div className="mt-6 flex justify-center py-8 text-sm text-slate-400">Loading…</div>
            )}

            {viewError && (
              <p className="mt-4 text-sm text-rose-600 dark:text-rose-400">{viewError}</p>
            )}

            {viewItem && !viewLoading && (
              <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
                {tab === 'warehouses' && (() => {
                  const w = viewItem as WarehouseDetail
                  return (
                    <>
                      <DetailRow label="ID" value={String(w.id)} />
                      <DetailRow label="Code" value={w.code} mono />
                      <DetailRow label="Name" value={w.name} />
                      <DetailRow label="Address" value={w.addressLine ?? '—'} />
                      <DetailRow label="Created" value={new Date(w.createdAt).toLocaleString()} />
                      <DetailRow label="Updated" value={new Date(w.updatedAt).toLocaleString()} />
                    </>
                  )
                })()}
                {tab === 'zones' && (() => {
                  const z = viewItem as Zone
                  return (
                    <>
                      <DetailRow label="ID" value={String(z.id)} />
                      <DetailRow label="Code" value={z.code} mono />
                      <DetailRow label="Name" value={z.name} />
                      <DetailRow label="Warehouse ID" value={String(z.warehouseId)} />
                      <DetailRow label="Created" value={new Date(z.createdAt).toLocaleString()} />
                      <DetailRow label="Updated" value={new Date(z.updatedAt).toLocaleString()} />
                    </>
                  )
                })()}
                {tab === 'aisles' && (() => {
                  const a = viewItem as Aisle
                  return (
                    <>
                      <DetailRow label="ID" value={String(a.id)} />
                      <DetailRow label="Code" value={a.code} mono />
                      <DetailRow label="Name" value={a.name} />
                      <DetailRow label="Zone ID" value={String(a.zoneId)} />
                      <DetailRow label="Warehouse ID" value={String(a.warehouseId)} />
                      <DetailRow label="Created" value={new Date(a.createdAt).toLocaleString()} />
                      <DetailRow label="Updated" value={new Date(a.updatedAt).toLocaleString()} />
                    </>
                  )
                })()}
                {tab === 'bins' && (() => {
                  const b = viewItem as Bin
                  return (
                    <>
                      <DetailRow label="ID" value={String(b.id)} />
                      <DetailRow label="Code" value={b.code} mono />
                      <DetailRow label="Description" value={b.description ?? '—'} />
                      <DetailRow label="Capacity" value={b.capacityUnits != null ? String(b.capacityUnits) : '∞'} />
                      <DetailRow label="Status" value={b.active ? 'Active' : 'Inactive'} />
                      <DetailRow label="Zone ID" value={String(b.zoneId)} />
                      <DetailRow label="Warehouse ID" value={String(b.warehouseId)} />
                      {b.aisleId != null && <DetailRow label="Aisle ID" value={String(b.aisleId)} />}
                      <DetailRow label="Created" value={new Date(b.createdAt).toLocaleString()} />
                      <DetailRow label="Updated" value={new Date(b.updatedAt).toLocaleString()} />
                    </>
                  )
                })()}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <Button variant="secondary" onClick={() => { setViewItem(null); setViewError(null) }}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-950">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{modalTitle}</h2>

            <div className="mt-4 space-y-3">
              <FormField
                label="Code *"
                value={form.code}
                onChange={(v) => setForm((f) => ({ ...f, code: v }))}
                placeholder={tab === 'warehouses' ? 'e.g. WH-01' : tab === 'zones' ? 'e.g. ZONE-A' : tab === 'aisles' ? 'e.g. AISLE-1' : 'e.g. BIN-001'}
              />
              {requiresName && (
                <FormField
                  label="Name *"
                  value={form.name}
                  onChange={(v) => setForm((f) => ({ ...f, name: v }))}
                  placeholder={tab === 'warehouses' ? 'e.g. Main Warehouse' : tab === 'zones' ? 'e.g. Frozen Zone' : 'e.g. Aisle 1'}
                />
              )}
              {tab === 'warehouses' && (
                <FormField
                  label="Address"
                  value={form.addressLine}
                  onChange={(v) => setForm((f) => ({ ...f, addressLine: v }))}
                  placeholder="Optional"
                />
              )}
              {tab === 'bins' && (
                <>
                  <FormField
                    label="Description"
                    value={form.description}
                    onChange={(v) => setForm((f) => ({ ...f, description: v }))}
                    placeholder="Optional"
                  />
                  <FormField
                    label="Capacity (units)"
                    type="number"
                    value={form.capacityUnits}
                    onChange={(v) => setForm((f) => ({ ...f, capacityUnits: v }))}
                    placeholder="Leave blank for unlimited"
                  />
                </>
              )}
            </div>

            {formError && (
              <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">{formError}</p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowModal(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!canSubmit}>
                {saving ? (editingId !== null ? 'Saving…' : 'Creating…') : (editingId !== null ? 'Save' : 'Create')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Helper components ───────────────────────────────────────────────────────

function SelectField({
  label, value, onChange, options, placeholder, disabled, className,
}: {
  label: string
  value: number | ''
  onChange: (v: string) => void
  options: { value: number; label: string }[]
  placeholder?: string
  disabled?: boolean
  className?: string
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 pr-8 text-sm text-slate-900 focus:border-slate-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-500"
        >
          <option value="">{placeholder ?? 'Select…'}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
      </div>
    </div>
  )
}

function FormField({
  label, value, onChange, placeholder, type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-slate-500"
      />
    </div>
  )
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 py-2.5">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      <span className={cn('text-right text-sm text-slate-900 dark:text-slate-100', mono && 'font-mono')}>{value}</span>
    </div>
  )
}

function EmptyState({ label, onAdd }: { label: string; onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-sm text-slate-400">
      <span>No {label}s found.</span>
      <button onClick={onAdd} className="text-slate-600 underline hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100">
        Create your first {label}
      </button>
    </div>
  )
}
