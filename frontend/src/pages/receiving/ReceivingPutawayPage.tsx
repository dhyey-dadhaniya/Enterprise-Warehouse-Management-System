import { useState } from 'react'
import { useForm, type FieldErrors } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { CheckCircle2 } from 'lucide-react'
import { Card, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import type { Bin, Item, Warehouse, Zone } from '../../types/domain'
import { listBins, listItems, listWarehouses, listZones } from '../../services/catalogService'
import { createPutawayTask, type PutawayTaskResponse } from '../../services/putawayService'
import { getApiErrorMessage } from '../../lib/apiErrorMessage'
import { addInboundLine, buildInboundDocumentNumber, createInboundDocument, postReceipt } from '../../services/receivingService'

const schema = z.object({
  itemId: z.string().min(1, 'Select an item'),
  warehouseId: z.string().min(1, 'Select a warehouse'),
  zoneId: z.string().min(1, 'Select a zone'),
  binId: z.string().min(1, 'Select a bin'),
  quantity: z.coerce.number().int().min(1).max(10_000),
})

type FormValues = z.infer<typeof schema>

function receivingValidationSummary(errors: FieldErrors<FormValues>): string {
  const parts = [
    errors.itemId?.message,
    errors.warehouseId?.message,
    errors.zoneId?.message,
    errors.binId?.message,
    errors.quantity?.message,
  ].filter((m): m is string => typeof m === 'string' && m.length > 0)
  if (parts.length === 0) return 'Please fix the highlighted fields.'
  return parts.join(' · ')
}

export function ReceivingPutawayPage() {
  const [confirmed, setConfirmed] = useState<{
    item: Item
    warehouse: Warehouse
    zone: Zone
    bin: Bin
    quantity: number
    inboundLineId: number
    at: string
    putawayTask: PutawayTaskResponse | null
  } | null>(null)

  const [posting, setPosting] = useState(false)
  const [creatingPutaway, setCreatingPutaway] = useState(false)

  const itemsQ = useQuery({
    queryKey: ['catalog', 'items'],
    queryFn: listItems,
    staleTime: 60_000,
  })

  const warehousesQ = useQuery({
    queryKey: ['catalog', 'warehouses'],
    queryFn: listWarehouses,
    staleTime: 60_000,
  })

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { itemId: '', warehouseId: '', zoneId: '', binId: '', quantity: 1 },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  })

  const items = itemsQ.data ?? []
  const warehouses = warehousesQ.data ?? []

  const warehouseId = watch('warehouseId')
  const zoneId = watch('zoneId')
  const zoneIdRegister = register('zoneId')

  const zonesQ = useQuery({
    queryKey: ['catalog', 'zones', { warehouseId }],
    queryFn: () => listZones(warehouseId),
    enabled: !!warehouseId,
    staleTime: 60_000,
  })

  const binsQ = useQuery({
    queryKey: ['catalog', 'bins', { zoneId }],
    queryFn: () => listBins(zoneId),
    enabled: !!zoneId,
    staleTime: 60_000,
  })

  const zones = zonesQ.data ?? []
  const bins = binsQ.data ?? []

  // TanStack Query keeps a disabled query in "pending" state; only treat as loading after it is enabled.
  const busy =
    itemsQ.isPending ||
    warehousesQ.isPending ||
    (!!warehouseId && zonesQ.isPending) ||
    (!!zoneId && binsQ.isPending)

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-4">
        <div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Inbound</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Receiving & Putaway
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
            <span className="font-medium text-slate-800 dark:text-slate-200">Step 1:</span> receive into a staging bin on the left.{' '}
            <span className="font-medium text-slate-800 dark:text-slate-200">Step 2:</span> on the right, create a putaway task to move stock to storage (the
            button appears only after a successful receive).
          </p>
        </div>

        <Card className="p-0">
          <CardHeader className="p-4">
            <div>
              <CardTitle>Receive Stock</CardTitle>
              <CardDescription className="mt-1.5">
                Step 1 — posts receipt to the backend. Putaway is triggered from the panel on the right after this succeeds.
              </CardDescription>
            </div>
          </CardHeader>
          <div className="border-t border-slate-200 p-4 dark:border-slate-800">
            {itemsQ.isError || warehousesQ.isError || zonesQ.isError || binsQ.isError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                Failed to load catalog data. Refresh the page.
              </div>
            ) : busy ? (
              <div className="space-y-3">
                <div className="h-10 w-full animate-pulse rounded-xl bg-slate-900/5 dark:bg-white/5" />
                <div className="h-10 w-full animate-pulse rounded-xl bg-slate-900/5 dark:bg-white/5" />
                <div className="h-10 w-40 animate-pulse rounded-xl bg-slate-900/5 dark:bg-white/5" />
              </div>
            ) : (
              <form
                className="space-y-4"
                onSubmit={handleSubmit(
                  async (vals) => {
                  const item = items.find((p) => p.id === vals.itemId)
                  const warehouse = warehouses.find((w) => w.id === vals.warehouseId)
                  const zone = zones.find((z) => z.id === vals.zoneId)
                  const bin = bins.find((b) => b.id === vals.binId)
                  if (!item || !warehouse || !zone || !bin) {
                    toast.error('Selected item, warehouse, zone, or bin is no longer valid. Refresh and pick again.')
                    return
                  }

                  try {
                    setPosting(true)
                    const documentNumber = buildInboundDocumentNumber({ warehouse, item })
                    const doc = await createInboundDocument({
                      documentNumber,
                      documentType: 'ASN',
                      warehouseId: Number(warehouse.id),
                      supplierName: 'UI Supplier',
                      reference: 'UI Receiving',
                      notes: `Created from UI for ${item.sku}`,
                    })
                    const withLine = await addInboundLine({
                      documentId: doc.id,
                      itemId: Number(item.id),
                      expectedQty: vals.quantity,
                      lineNumber: 1,
                      notes: null,
                    })

                    const lineId = withLine.lines?.[0]?.id
                    if (!lineId) {
                      toast.error('Inbound line was not created. Check backend response.')
                      return
                    }

                    await postReceipt({
                      documentId: withLine.id,
                      lineId,
                      stagingBinId: Number(bin.id),
                      quantity: vals.quantity,
                      note: `Received into bin ${bin.code}`,
                    })

                    setConfirmed({
                      item,
                      warehouse,
                      zone,
                      bin,
                      quantity: vals.quantity,
                      inboundLineId: lineId,
                      at: new Date().toISOString(),
                      putawayTask: null,
                    })
                    toast.success('Receiving posted to backend.')
                  } catch (e) {
                    toast.error(getApiErrorMessage(e) ?? 'Failed to post receiving.')
                  } finally {
                    setPosting(false)
                  }
                },
                (errs) => {
                  toast.error(receivingValidationSummary(errs))
                },
              )}
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Item
                    </label>
                    <select
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white/85 px-3 text-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-800 dark:bg-slate-950/70 dark:focus:border-slate-700 dark:focus:ring-amber-400/20"
                      {...register('itemId')}
                    >
                      <option value="">Select item…</option>
                      {items.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.sku} · {p.name}
                        </option>
                      ))}
                    </select>
                    {errors.itemId && (
                      <div className="text-xs text-rose-600 dark:text-rose-300">
                        {errors.itemId.message}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Warehouse
                    </label>
                    <select
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white/85 px-3 text-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-800 dark:bg-slate-950/70 dark:focus:border-slate-700 dark:focus:ring-amber-400/20"
                      {...register('warehouseId')}
                    >
                      <option value="">Select warehouse…</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                    {errors.warehouseId && (
                      <div className="text-xs text-rose-600 dark:text-rose-300">
                        {errors.warehouseId.message}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">Zone</label>
                    <select
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white/85 px-3 text-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-amber-200 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950/70 dark:focus:border-slate-700 dark:focus:ring-amber-400/20"
                      {...zoneIdRegister}
                      onChange={(e) => {
                        zoneIdRegister.onChange(e)
                        setValue('binId', '', { shouldDirty: true, shouldValidate: true })
                      }}
                      disabled={!warehouseId}
                    >
                      <option value="">Select zone…</option>
                      {zones.map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.code} · {z.name}
                        </option>
                      ))}
                    </select>
                    {errors.zoneId && (
                      <div className="text-xs text-rose-600 dark:text-rose-300">{errors.zoneId.message}</div>
                    )}
                    {warehouseId && zones.length === 0 ? (
                      <div className="text-xs text-amber-700 dark:text-amber-300">
                        No zones found for this warehouse. Create a zone first in Warehouse → Zones.
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">Bin</label>
                    <select
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white/85 px-3 text-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-amber-200 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950/70 dark:focus:border-slate-700 dark:focus:ring-amber-400/20"
                      {...register('binId')}
                      disabled={!zoneId}
                    >
                      <option value="">Select bin…</option>
                      {bins.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.code}
                        </option>
                      ))}
                    </select>
                    {errors.binId && (
                      <div className="text-xs text-rose-600 dark:text-rose-300">{errors.binId.message}</div>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 max-w-md">
                  <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min={1}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white/85 px-3 text-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-800 dark:bg-slate-950/70 dark:focus:border-slate-700 dark:focus:ring-amber-400/20"
                    {...register('quantity')}
                  />
                  {errors.quantity && (
                    <div className="text-xs text-rose-600 dark:text-rose-300">
                      {errors.quantity.message}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button type="submit" disabled={posting}>
                    Confirm Receiving
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      reset({ itemId: '', warehouseId: '', zoneId: '', binId: '', quantity: 1 })
                      setConfirmed(null)
                      toast('Form reset.')
                    }}
                    disabled={posting}
                  >
                    Reset
                  </Button>
                </div>
              </form>
            )}
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader className="mb-0">
            <div>
              <CardTitle>Putaway</CardTitle>
              <CardDescription className="mt-1.5">
                There is no separate “Putaway” tab — create the warehouse task here after receiving.
              </CardDescription>
            </div>
          </CardHeader>
          {!confirmed ? (
            <div className="mt-3 space-y-3">
              <ol className="list-decimal space-y-2 pl-4 text-sm text-slate-600 dark:text-slate-400">
                <li>
                  Fill <span className="font-medium text-slate-800 dark:text-slate-200">Receive Stock</span> and click{' '}
                  <span className="font-medium text-slate-800 dark:text-slate-200">Confirm Receiving</span>.
                </li>
                <li>
                  When the receive succeeds, the <span className="font-medium text-slate-800 dark:text-slate-200">Create putaway task</span> button appears
                  below with the receipt summary.
                </li>
              </ol>
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/90 px-3 py-2.5 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-400">
                Waiting for a successful receive — then putaway unlocks in this panel.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="grid size-10 place-items-center rounded-xl border border-slate-200 bg-white/70 shadow-soft dark:border-slate-800 dark:bg-slate-950/60">
                  <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-300" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Receiving Confirmed
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    {new Date(confirmed.at).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white/60 p-3 text-sm dark:border-slate-800 dark:bg-slate-950/50">
                <div className="text-xs text-slate-600 dark:text-slate-400">Item</div>
                <div className="mt-0.5 font-semibold text-slate-900 dark:text-slate-100">
                  <span className="text-mono">{confirmed.item.sku}</span> · {confirmed.item.name}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">Warehouse</div>
                    <div className="text-mono font-semibold text-slate-900 dark:text-slate-100">
                      {confirmed.warehouse.name}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">Quantity</div>
                    <div className="text-mono font-semibold text-slate-900 dark:text-slate-100">
                      {confirmed.quantity}
                    </div>
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-xs text-slate-600 dark:text-slate-400">Putaway</div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <div className="text-mono font-semibold text-slate-900 dark:text-slate-100">
                      {confirmed.bin.code} (zone {confirmed.zone.code})
                    </div>
                    <Badge variant="success" className="text-mono">
                      READY
                    </Badge>
                  </div>
                </div>
              </div>

              {confirmed.putawayTask ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 px-3 py-2.5 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-100">
                  <span className="font-semibold">Putaway task created</span>
                  <div className="mt-1 text-mono text-xs opacity-90">
                    ID {confirmed.putawayTask.id} · suggested bin {confirmed.putawayTask.suggestedToBinCode}
                  </div>
                </div>
              ) : (
                <Button
                  onClick={async () => {
                    if (!confirmed) return

                    try {
                      setCreatingPutaway(true)
                      const task = await createPutawayTask({
                        warehouseId: Number(confirmed.warehouse.id),
                        fromBinId: Number(confirmed.bin.id),
                        itemId: Number(confirmed.item.id),
                        quantity: confirmed.quantity,
                        inboundDocumentLineId: confirmed.inboundLineId,
                      })
                      setConfirmed((prev) => (prev ? { ...prev, putawayTask: task } : prev))
                      toast.success(`Putaway task created (ID: ${task.id}). Suggested bin: ${task.suggestedToBinCode}`)
                    } catch (e) {
                      toast.error(getApiErrorMessage(e) ?? 'Failed to create putaway task.')
                    } finally {
                      setCreatingPutaway(false)
                    }
                  }}
                  className="w-full"
                  disabled={creatingPutaway}
                >
                  Create putaway task
                </Button>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

