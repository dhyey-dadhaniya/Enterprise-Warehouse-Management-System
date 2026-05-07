import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layers3, Pencil, Plus, RefreshCcw, Trash2, Warehouse as WarehouseIcon, X } from 'lucide-react'

import { Button } from '../../components/ui/Button'
import { Card, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card'
import { Table, TBody, TD, TH, THead, TR } from '../../components/ui/Table'
import { cn } from '../../lib/cn'
import { useAuthStore } from '../../store/authStore'
import type { Aisle, Bin, Warehouse, Zone } from '../../types/domain'
import {
  createAisle,
  createBin,
  createZone,
  deleteAisle,
  deleteBin,
  deleteZone,
  listAisles,
  listBins,
  listZones,
  createWarehouse,
  deleteWarehouse,
  listWarehouses,
  updateAisle,
  updateBin,
  updateZone,
  updateWarehouse,
  type AisleUpsertInput,
  type BinUpsertInput,
  type ZoneUpsertInput,
  type WarehouseUpsertInput,
} from '../../services/catalogService'

const schema = z.object({
  code: z
    .string()
    .min(1, 'Code is required')
    .max(32, 'Max 32 characters')
    .regex(/^[A-Za-z0-9][A-Za-z0-9-_]*$/, 'Use letters/numbers and -/_ only'),
  name: z.string().min(1, 'Name is required').max(120, 'Max 120 characters'),
  addressLine: z.string().max(255, 'Max 255 characters').optional(),
})

type FormValues = z.infer<typeof schema>

type Mode = { type: 'create' } | { type: 'edit'; warehouse: Warehouse } | { type: 'none' }

const zoneSchema = z.object({
  code: z.string().min(1, 'Code is required').max(64, 'Max 64 characters'),
  name: z.string().min(1, 'Name is required').max(255, 'Max 255 characters'),
})
type ZoneForm = z.infer<typeof zoneSchema>

const aisleSchema = z.object({
  code: z.string().min(1, 'Code is required').max(64, 'Max 64 characters'),
  name: z.string().min(1, 'Name is required').max(255, 'Max 255 characters'),
})
type AisleForm = z.infer<typeof aisleSchema>

const binSchema = z.object({
  code: z.string().min(1, 'Code is required').max(64, 'Max 64 characters'),
  description: z.string().max(512, 'Max 512 characters').optional(),
  aisleId: z.string().optional(),
  active: z.boolean().optional(),
})
type BinForm = z.infer<typeof binSchema>

export function WarehouseStructurePage() {
  const qc = useQueryClient()
  const roles = useAuthStore((s) => s.roles)
  const isAdmin = roles.includes('ADMIN')

  const [tab, setTab] = useState<'warehouses' | 'zones' | 'aisles' | 'bins'>('warehouses')

  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('')
  const [selectedZoneId, setSelectedZoneId] = useState<string>('')
  const [selectedAisleId, setSelectedAisleId] = useState<string>('')

  const [mode, setMode] = useState<Mode>({ type: 'none' })

  const warehousesQ = useQuery({
    queryKey: ['catalog', 'warehouses'],
    queryFn: listWarehouses,
    staleTime: 30_000,
  })

  const warehouses = warehousesQ.data ?? []
  const selected = mode.type === 'edit' ? mode.warehouse : null

  useEffect(() => {
    // UX: if user opens Zones/Aisles/Bins first, pick the first warehouse automatically.
    if (tab !== 'warehouses' && !selectedWarehouseId && warehouses.length > 0) {
      setSelectedWarehouseId(warehouses[0]!.id)
    }
  }, [selectedWarehouseId, tab, warehouses])

  const zonesQ = useQuery({
    queryKey: ['catalog', 'zones', { warehouseId: selectedWarehouseId }],
    queryFn: () => listZones(selectedWarehouseId),
    enabled: tab !== 'warehouses' && !!selectedWarehouseId,
    staleTime: 30_000,
  })
  const zones = zonesQ.data ?? []

  const aislesQ = useQuery({
    queryKey: ['catalog', 'aisles', { zoneId: selectedZoneId }],
    queryFn: () => listAisles(selectedZoneId),
    enabled: (tab === 'aisles' || tab === 'bins') && !!selectedZoneId,
    staleTime: 30_000,
  })
  const aisles = aislesQ.data ?? []

  const binsQ = useQuery({
    queryKey: ['catalog', 'bins', { zoneId: selectedZoneId }],
    queryFn: () => listBins(selectedZoneId),
    enabled: tab === 'bins' && !!selectedZoneId,
    staleTime: 30_000,
  })
  const bins = binsQ.data ?? []

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { code: '', name: '', addressLine: '' },
    mode: 'onChange',
  })

  const zoneForm = useForm<ZoneForm>({
    resolver: zodResolver(zoneSchema),
    defaultValues: { code: '', name: '' },
    mode: 'onChange',
  })

  const aisleForm = useForm<AisleForm>({
    resolver: zodResolver(aisleSchema),
    defaultValues: { code: '', name: '' },
    mode: 'onChange',
  })

  const binForm = useForm<BinForm>({
    resolver: zodResolver(binSchema),
    defaultValues: { code: '', description: '', aisleId: '', active: true },
    mode: 'onChange',
  })

  const busy = warehousesQ.isPending

  const createM = useMutation({
    mutationFn: (input: WarehouseUpsertInput) => createWarehouse(input),
    onSuccess: async () => {
      toast.success('Warehouse created.')
      setMode({ type: 'none' })
      form.reset({ code: '', name: '', addressLine: '' })
      await qc.invalidateQueries({ queryKey: ['catalog', 'warehouses'] })
    },
    onError: () => toast.error('Failed to create warehouse.'),
  })

  const updateM = useMutation({
    mutationFn: (vars: { id: string; input: WarehouseUpsertInput }) => updateWarehouse(vars.id, vars.input),
    onSuccess: async () => {
      toast.success('Warehouse updated.')
      setMode({ type: 'none' })
      form.reset({ code: '', name: '', addressLine: '' })
      await qc.invalidateQueries({ queryKey: ['catalog', 'warehouses'] })
    },
    onError: () => toast.error('Failed to update warehouse.'),
  })

  const deleteM = useMutation({
    mutationFn: (id: string) => deleteWarehouse(id),
    onSuccess: async () => {
      toast.success('Warehouse deleted.')
      await qc.invalidateQueries({ queryKey: ['catalog', 'warehouses'] })
    },
    onError: () => toast.error('Failed to delete warehouse.'),
  })

  const createZoneM = useMutation({
    mutationFn: (vars: { warehouseId: string; input: ZoneUpsertInput }) => createZone(vars.warehouseId, vars.input),
    onSuccess: async () => {
      toast.success('Zone created.')
      zoneForm.reset({ code: '', name: '' })
      await qc.invalidateQueries({ queryKey: ['catalog', 'zones'] })
    },
    onError: () => toast.error('Failed to create zone.'),
  })

  const updateZoneM = useMutation({
    mutationFn: (vars: { id: string; input: ZoneUpsertInput }) => updateZone(vars.id, vars.input),
    onSuccess: async () => {
      toast.success('Zone updated.')
      await qc.invalidateQueries({ queryKey: ['catalog', 'zones'] })
    },
    onError: () => toast.error('Failed to update zone.'),
  })

  const deleteZoneM = useMutation({
    mutationFn: (id: string) => deleteZone(id),
    onSuccess: async () => {
      toast.success('Zone deleted.')
      await qc.invalidateQueries({ queryKey: ['catalog', 'zones'] })
    },
    onError: () => toast.error('Failed to delete zone.'),
  })

  const createAisleM = useMutation({
    mutationFn: (vars: { zoneId: string; input: AisleUpsertInput }) => createAisle(vars.zoneId, vars.input),
    onSuccess: async () => {
      toast.success('Aisle created.')
      aisleForm.reset({ code: '', name: '' })
      await qc.invalidateQueries({ queryKey: ['catalog', 'aisles'] })
    },
    onError: () => toast.error('Failed to create aisle.'),
  })

  const updateAisleM = useMutation({
    mutationFn: (vars: { id: string; input: AisleUpsertInput }) => updateAisle(vars.id, vars.input),
    onSuccess: async () => {
      toast.success('Aisle updated.')
      await qc.invalidateQueries({ queryKey: ['catalog', 'aisles'] })
    },
    onError: () => toast.error('Failed to update aisle.'),
  })

  const deleteAisleM = useMutation({
    mutationFn: (id: string) => deleteAisle(id),
    onSuccess: async () => {
      toast.success('Aisle deleted.')
      await qc.invalidateQueries({ queryKey: ['catalog', 'aisles'] })
    },
    onError: () => toast.error('Failed to delete aisle.'),
  })

  const createBinM = useMutation({
    mutationFn: (vars: { zoneId: string; input: BinUpsertInput }) => createBin(vars.zoneId, vars.input),
    onSuccess: async () => {
      toast.success('Bin created.')
      binForm.reset({ code: '', description: '', aisleId: '', active: true })
      await qc.invalidateQueries({ queryKey: ['catalog', 'bins'] })
    },
    onError: () => toast.error('Failed to create bin.'),
  })

  const updateBinM = useMutation({
    mutationFn: (vars: { id: string; input: BinUpsertInput }) => updateBin(vars.id, vars.input),
    onSuccess: async () => {
      toast.success('Bin updated.')
      await qc.invalidateQueries({ queryKey: ['catalog', 'bins'] })
    },
    onError: () => toast.error('Failed to update bin.'),
  })

  const deleteBinM = useMutation({
    mutationFn: (id: string) => deleteBin(id),
    onSuccess: async () => {
      toast.success('Bin deleted.')
      await qc.invalidateQueries({ queryKey: ['catalog', 'bins'] })
    },
    onError: () => toast.error('Failed to delete bin.'),
  })

  const actionBusy =
    createM.isPending ||
    updateM.isPending ||
    deleteM.isPending ||
    createZoneM.isPending ||
    updateZoneM.isPending ||
    deleteZoneM.isPending ||
    createAisleM.isPending ||
    updateAisleM.isPending ||
    deleteAisleM.isPending ||
    createBinM.isPending ||
    updateBinM.isPending ||
    deleteBinM.isPending

  const title = useMemo(() => {
    if (mode.type === 'create') return 'Add Warehouse'
    if (mode.type === 'edit') return 'Edit Warehouse'
    return 'Warehouses'
  }, [mode.type])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Master data</div>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            <WarehouseIcon className="size-6" />
            Warehouse Structure
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (tab === 'warehouses') warehousesQ.refetch()
              if (tab === 'zones') zonesQ.refetch()
              if (tab === 'aisles') aislesQ.refetch()
              if (tab === 'bins') binsQ.refetch()
            }}
            disabled={warehousesQ.isFetching || zonesQ.isFetching || aislesQ.isFetching || binsQ.isFetching}
          >
            <RefreshCcw
              className={cn(
                'size-4',
                (warehousesQ.isFetching || zonesQ.isFetching || aislesQ.isFetching || binsQ.isFetching) && 'animate-spin',
              )}
            />
            Refresh
          </Button>

          {tab === 'warehouses' && (
            <Button
              size="sm"
              onClick={() => {
                if (!isAdmin) {
                  toast.error('Only ADMIN can create warehouses.')
                  return
                }
                setMode({ type: 'create' })
                form.reset({ code: '', name: '', addressLine: '' })
              }}
              disabled={!isAdmin}
            >
              <Plus className="size-4" />
              Add
            </Button>
          )}
        </div>
      </div>

      <Card className="p-0">
        <CardHeader className="p-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Layers3 className="size-4" />
              {tab === 'warehouses' ? title : tab === 'zones' ? 'Zones' : tab === 'aisles' ? 'Aisles' : 'Bins'}
            </CardTitle>
            <CardDescription>
              ADMIN can create/update/delete.
            </CardDescription>
          </div>
          {tab === 'warehouses' && mode.type !== 'none' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setMode({ type: 'none' })
                form.reset({ code: '', name: '', addressLine: '' })
              }}
            >
              <X className="size-4" />
              Close
            </Button>
          )}
        </CardHeader>

        <div className="border-t border-slate-200 p-4 dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant={tab === 'warehouses' ? 'primary' : 'secondary'} onClick={() => setTab('warehouses')}>
                Warehouses
              </Button>
              <Button
                size="sm"
                variant={tab === 'zones' ? 'primary' : 'secondary'}
                onClick={() => setTab('zones')}
              >
                Zones
              </Button>
              <Button
                size="sm"
                variant={tab === 'aisles' ? 'primary' : 'secondary'}
                onClick={() => setTab('aisles')}
              >
                Aisles
              </Button>
              <Button size="sm" variant={tab === 'bins' ? 'primary' : 'secondary'} onClick={() => setTab('bins')}>
                Bins
              </Button>
            </div>

            {tab !== 'warehouses' && (
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedWarehouseId}
                  onChange={(e) => {
                    const wid = e.target.value
                    setSelectedWarehouseId(wid)
                    setSelectedZoneId('')
                    setSelectedAisleId('')
                  }}
                  className="h-10 rounded-xl border border-slate-200 bg-white/85 px-3 text-sm outline-none focus:ring-2 focus:ring-amber-200 dark:border-slate-800 dark:bg-slate-950/70 dark:focus:ring-amber-400/20"
                >
                  <option value="">Select warehouse…</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.code} · {w.name}
                    </option>
                  ))}
                </select>

                {(tab === 'aisles' || tab === 'bins') && (
                  <select
                    value={selectedZoneId}
                    onChange={(e) => {
                      const zid = e.target.value
                      setSelectedZoneId(zid)
                      setSelectedAisleId('')
                    }}
                    disabled={!selectedWarehouseId}
                    className="h-10 rounded-xl border border-slate-200 bg-white/85 px-3 text-sm outline-none focus:ring-2 focus:ring-amber-200 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950/70 dark:focus:ring-amber-400/20"
                  >
                    <option value="">Select zone…</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.code} · {z.name}
                      </option>
                    ))}
                  </select>
                )}

                {tab === 'bins' && (
                  <select
                    value={selectedAisleId}
                    onChange={(e) => setSelectedAisleId(e.target.value)}
                    disabled={!selectedZoneId}
                    className="h-10 rounded-xl border border-slate-200 bg-white/85 px-3 text-sm outline-none focus:ring-2 focus:ring-amber-200 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950/70 dark:focus:ring-amber-400/20"
                  >
                    <option value="">(Optional) Aisle…</option>
                    {aisles.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} · {a.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>
        </div>

        {tab === 'warehouses' && mode.type !== 'none' && (
          <div className="border-t border-slate-200 p-4 dark:border-slate-800">
            <form
              className="grid gap-3 md:grid-cols-3"
              onSubmit={form.handleSubmit((vals) => {
                if (!isAdmin) {
                  toast.error('Only ADMIN can save warehouses.')
                  return
                }
                const input: WarehouseUpsertInput = {
                  code: vals.code.trim(),
                  name: vals.name.trim(),
                  addressLine: vals.addressLine?.trim() ? vals.addressLine.trim() : null,
                }
                if (mode.type === 'create') {
                  createM.mutate(input)
                } else if (mode.type === 'edit') {
                  updateM.mutate({ id: mode.warehouse.id, input })
                }
              })}
            >
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">Code</label>
                <input
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white/85 px-3 text-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-800 dark:bg-slate-950/70 dark:focus:border-slate-700 dark:focus:ring-amber-400/20"
                  {...form.register('code')}
                />
                {form.formState.errors.code && (
                  <div className="text-xs text-rose-600 dark:text-rose-300">
                    {form.formState.errors.code.message}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">Name</label>
                <input
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white/85 px-3 text-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-800 dark:bg-slate-950/70 dark:focus:border-slate-700 dark:focus:ring-amber-400/20"
                  {...form.register('name')}
                />
                {form.formState.errors.name && (
                  <div className="text-xs text-rose-600 dark:text-rose-300">
                    {form.formState.errors.name.message}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">Address</label>
                <input
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white/85 px-3 text-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-800 dark:bg-slate-950/70 dark:focus:border-slate-700 dark:focus:ring-amber-400/20"
                  {...form.register('addressLine')}
                />
                {form.formState.errors.addressLine && (
                  <div className="text-xs text-rose-600 dark:text-rose-300">
                    {form.formState.errors.addressLine.message}
                  </div>
                )}
              </div>

              <div className="md:col-span-3 flex flex-wrap items-center gap-2 pt-1">
                <Button type="submit" disabled={!form.formState.isValid || !isAdmin || actionBusy}>
                  {mode.type === 'create' ? 'Create' : 'Save'}
                </Button>
                {mode.type === 'edit' && selected && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      form.reset({
                        code: selected.code ?? '',
                        name: selected.name ?? '',
                        addressLine: selected.addressLine ?? '',
                      })
                    }}
                    disabled={actionBusy}
                  >
                    Reset
                  </Button>
                )}
              </div>
            </form>
          </div>
        )}

        {tab === 'zones' && (
          <div className="border-t border-slate-200 p-4 dark:border-slate-800 space-y-4">
            {!selectedWarehouseId ? (
              <div className="rounded-xl border border-slate-200 bg-white/60 p-6 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300">
                Select a warehouse to manage zones.
              </div>
            ) : (
              <>
                <form
                  className="grid gap-3 md:grid-cols-3"
                  onSubmit={zoneForm.handleSubmit((vals) => {
                    if (!isAdmin) return toast.error('Only ADMIN can create zones.')
                    createZoneM.mutate({ warehouseId: selectedWarehouseId, input: { code: vals.code.trim(), name: vals.name.trim() } })
                  })}
                >
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">Code</label>
                    <input className="h-10 w-full rounded-xl border border-slate-200 bg-white/85 px-3 text-sm dark:border-slate-800 dark:bg-slate-950/70" {...zoneForm.register('code')} />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">Name</label>
                    <input className="h-10 w-full rounded-xl border border-slate-200 bg-white/85 px-3 text-sm dark:border-slate-800 dark:bg-slate-950/70" {...zoneForm.register('name')} />
                  </div>
                  <div className="md:col-span-3">
                    <Button type="submit" disabled={!isAdmin || !zoneForm.formState.isValid || actionBusy}>
                      <Plus className="size-4" />
                      Add Zone
                    </Button>
                  </div>
                </form>

                {zonesQ.isError ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                    Failed to load zones.
                  </div>
                ) : zonesQ.isPending ? (
                  <div className="space-y-3">
                    <div className="h-10 w-full animate-pulse rounded-xl bg-slate-900/5 dark:bg-white/5" />
                    <div className="h-10 w-full animate-pulse rounded-xl bg-slate-900/5 dark:bg-white/5" />
                  </div>
                ) : zones.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-white/60 p-6 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300">
                    No zones yet.
                  </div>
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
                      {zones.map((z: Zone) => (
                        <TR key={z.id}>
                          <TD className="text-mono font-semibold text-slate-900 dark:text-slate-100">{z.code}</TD>
                          <TD className="text-slate-900 dark:text-slate-100">{z.name}</TD>
                          <TD className="text-right">
                            <div className="inline-flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  if (!isAdmin) return toast.error('Only ADMIN can edit zones.')
                                  const code = window.prompt('Zone code', z.code) ?? z.code
                                  const name = window.prompt('Zone name', z.name) ?? z.name
                                  updateZoneM.mutate({ id: z.id, input: { code: code.trim(), name: name.trim() } })
                                }}
                                disabled={!isAdmin || actionBusy}
                              >
                                <Pencil className="size-4" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => {
                                  if (!isAdmin) return toast.error('Only ADMIN can delete zones.')
                                  const ok = window.confirm(`Delete zone "${z.code}"?`)
                                  if (!ok) return
                                  deleteZoneM.mutate(z.id)
                                }}
                                disabled={!isAdmin || actionBusy}
                              >
                                <Trash2 className="size-4" />
                                Delete
                              </Button>
                            </div>
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                )}
              </>
            )}
          </div>
        )}

        {tab === 'aisles' && (
          <div className="border-t border-slate-200 p-4 dark:border-slate-800 space-y-4">
            {!selectedZoneId ? (
              <div className="rounded-xl border border-slate-200 bg-white/60 p-6 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300">
                Select a warehouse + zone to manage aisles. If your zone list is empty, create a zone first in the Zones tab.
                <div className="mt-3">
                  <Button variant="secondary" size="sm" onClick={() => setTab('zones')}>
                    Go to Zones
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <form
                  className="grid gap-3 md:grid-cols-3"
                  onSubmit={aisleForm.handleSubmit((vals) => {
                    if (!isAdmin) return toast.error('Only ADMIN can create aisles.')
                    createAisleM.mutate({ zoneId: selectedZoneId, input: { code: vals.code.trim(), name: vals.name.trim() } })
                  })}
                >
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">Code</label>
                    <input className="h-10 w-full rounded-xl border border-slate-200 bg-white/85 px-3 text-sm dark:border-slate-800 dark:bg-slate-950/70" {...aisleForm.register('code')} />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">Name</label>
                    <input className="h-10 w-full rounded-xl border border-slate-200 bg-white/85 px-3 text-sm dark:border-slate-800 dark:bg-slate-950/70" {...aisleForm.register('name')} />
                  </div>
                  <div className="md:col-span-3">
                    <Button type="submit" disabled={!isAdmin || !aisleForm.formState.isValid || actionBusy}>
                      <Plus className="size-4" />
                      Add Aisle
                    </Button>
                  </div>
                </form>

                {aislesQ.isError ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                    Failed to load aisles.
                  </div>
                ) : aislesQ.isPending ? (
                  <div className="space-y-3">
                    <div className="h-10 w-full animate-pulse rounded-xl bg-slate-900/5 dark:bg-white/5" />
                    <div className="h-10 w-full animate-pulse rounded-xl bg-slate-900/5 dark:bg-white/5" />
                  </div>
                ) : aisles.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-white/60 p-6 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300">
                    No aisles yet.
                  </div>
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
                      {aisles.map((a: Aisle) => (
                        <TR key={a.id}>
                          <TD className="text-mono font-semibold text-slate-900 dark:text-slate-100">{a.code}</TD>
                          <TD className="text-slate-900 dark:text-slate-100">{a.name}</TD>
                          <TD className="text-right">
                            <div className="inline-flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  if (!isAdmin) return toast.error('Only ADMIN can edit aisles.')
                                  const code = window.prompt('Aisle code', a.code) ?? a.code
                                  const name = window.prompt('Aisle name', a.name) ?? a.name
                                  updateAisleM.mutate({ id: a.id, input: { code: code.trim(), name: name.trim() } })
                                }}
                                disabled={!isAdmin || actionBusy}
                              >
                                <Pencil className="size-4" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => {
                                  if (!isAdmin) return toast.error('Only ADMIN can delete aisles.')
                                  const ok = window.confirm(`Delete aisle "${a.code}"?`)
                                  if (!ok) return
                                  deleteAisleM.mutate(a.id)
                                }}
                                disabled={!isAdmin || actionBusy}
                              >
                                <Trash2 className="size-4" />
                                Delete
                              </Button>
                            </div>
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                )}
              </>
            )}
          </div>
        )}

        {tab === 'bins' && (
          <div className="border-t border-slate-200 p-4 dark:border-slate-800 space-y-4">
            {!selectedZoneId ? (
              <div className="rounded-xl border border-slate-200 bg-white/60 p-6 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300">
                Select a warehouse + zone to manage bins. If your zone list is empty, create a zone first in the Zones tab.
                <div className="mt-3">
                  <Button variant="secondary" size="sm" onClick={() => setTab('zones')}>
                    Go to Zones
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <form
                  className="grid gap-3 md:grid-cols-4"
                  onSubmit={binForm.handleSubmit((vals) => {
                    if (!isAdmin) return toast.error('Only ADMIN can create bins.')
                    createBinM.mutate({
                      zoneId: selectedZoneId,
                      input: {
                        code: vals.code.trim(),
                        description: vals.description?.trim() ? vals.description.trim() : null,
                        aisleId: vals.aisleId?.trim() ? vals.aisleId.trim() : null,
                        active: vals.active ?? true,
                      },
                    })
                  })}
                >
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">Code</label>
                    <input className="h-10 w-full rounded-xl border border-slate-200 bg-white/85 px-3 text-sm dark:border-slate-800 dark:bg-slate-950/70" {...binForm.register('code')} />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">Description</label>
                    <input className="h-10 w-full rounded-xl border border-slate-200 bg-white/85 px-3 text-sm dark:border-slate-800 dark:bg-slate-950/70" {...binForm.register('description')} />
                  </div>
                  <div className="flex items-center gap-2 pt-7">
                    <input type="checkbox" {...binForm.register('active')} />
                    <span className="text-sm text-slate-700 dark:text-slate-200">Active</span>
                  </div>
                  <div className="md:col-span-4">
                    <Button type="submit" disabled={!isAdmin || !binForm.formState.isValid || actionBusy}>
                      <Plus className="size-4" />
                      Add Bin
                    </Button>
                  </div>
                </form>

                {binsQ.isError ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                    Failed to load bins.
                  </div>
                ) : binsQ.isPending ? (
                  <div className="space-y-3">
                    <div className="h-10 w-full animate-pulse rounded-xl bg-slate-900/5 dark:bg-white/5" />
                    <div className="h-10 w-full animate-pulse rounded-xl bg-slate-900/5 dark:bg-white/5" />
                  </div>
                ) : bins.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-white/60 p-6 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300">
                    No bins yet.
                  </div>
                ) : (
                  <Table>
                    <THead>
                      <tr>
                        <TH>Code</TH>
                        <TH>Description</TH>
                        <TH>Status</TH>
                        <TH className="text-right">Actions</TH>
                      </tr>
                    </THead>
                    <TBody>
                      {bins.map((b: Bin) => (
                        <TR key={b.id}>
                          <TD className="text-mono font-semibold text-slate-900 dark:text-slate-100">{b.code}</TD>
                          <TD className="text-slate-700 dark:text-slate-200">{b.description ?? '—'}</TD>
                          <TD className="text-mono">{b.active ? 'ACTIVE' : 'INACTIVE'}</TD>
                          <TD className="text-right">
                            <div className="inline-flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  if (!isAdmin) return toast.error('Only ADMIN can edit bins.')
                                  const code = window.prompt('Bin code', b.code) ?? b.code
                                  const description = window.prompt('Bin description', b.description ?? '') ?? (b.description ?? '')
                                  const activeStr = window.prompt('Active? (true/false)', String(b.active)) ?? String(b.active)
                                  updateBinM.mutate({
                                    id: b.id,
                                    input: {
                                      code: code.trim(),
                                      description: description.trim() ? description.trim() : null,
                                      aisleId: b.aisleId,
                                      active: activeStr.trim().toLowerCase() === 'true',
                                    },
                                  })
                                }}
                                disabled={!isAdmin || actionBusy}
                              >
                                <Pencil className="size-4" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => {
                                  if (!isAdmin) return toast.error('Only ADMIN can delete bins.')
                                  const ok = window.confirm(`Delete bin "${b.code}"?`)
                                  if (!ok) return
                                  deleteBinM.mutate(b.id)
                                }}
                                disabled={!isAdmin || actionBusy}
                              >
                                <Trash2 className="size-4" />
                                Delete
                              </Button>
                            </div>
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                )}
              </>
            )}
          </div>
        )}

        {tab === 'warehouses' && (
          <div className="border-t border-slate-200 p-4 dark:border-slate-800">
            {warehousesQ.isError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
              Failed to load warehouses.
            </div>
          ) : busy ? (
            <div className="space-y-3">
              <div className="h-10 w-full animate-pulse rounded-xl bg-slate-900/5 dark:bg-white/5" />
              <div className="h-10 w-full animate-pulse rounded-xl bg-slate-900/5 dark:bg-white/5" />
              <div className="h-10 w-full animate-pulse rounded-xl bg-slate-900/5 dark:bg-white/5" />
            </div>
          ) : warehouses.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white/60 p-6 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300">
              No warehouses yet. {isAdmin ? 'Create your first warehouse using Add.' : ''}
            </div>
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
                    <TD className="text-mono font-semibold text-slate-900 dark:text-slate-100">{w.code}</TD>
                    <TD className="text-slate-900 dark:text-slate-100">{w.name}</TD>
                    <TD className="text-slate-600 dark:text-slate-300">{w.addressLine ?? '—'}</TD>
                    <TD className="text-right">
                      <div className="inline-flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            if (!isAdmin) {
                              toast.error('Only ADMIN can edit warehouses.')
                              return
                            }
                            setMode({ type: 'edit', warehouse: w })
                            form.reset({
                              code: w.code ?? '',
                              name: w.name ?? '',
                              addressLine: w.addressLine ?? '',
                            })
                          }}
                          disabled={!isAdmin}
                        >
                          <Pencil className="size-4" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            if (!isAdmin) {
                              toast.error('Only ADMIN can delete warehouses.')
                              return
                            }
                            const ok = window.confirm(`Delete warehouse "${w.name}"?`)
                            if (!ok) return
                            deleteM.mutate(w.id)
                          }}
                          disabled={!isAdmin || actionBusy}
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </div>
        )}
      </Card>
    </div>
  )
}

