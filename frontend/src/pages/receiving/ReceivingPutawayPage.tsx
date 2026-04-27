import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { CheckCircle2, Wand2 } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import type { Bin, Item, Warehouse, Zone } from '../../types/domain'
import { listBins, listItems, listWarehouses, listZones } from '../../services/catalogService'
import { suggestBinLocation } from '../../services/putawayLogic'
import { createPutawayTask, type PutawayTaskResponse } from '../../services/putawayService'
import { addInboundLine, buildInboundDocumentNumber, createInboundDocument, postReceipt } from '../../services/receivingService'

const schema = z.object({
  itemId: z.string().min(1, 'Select an item'),
  warehouseId: z.string().min(1, 'Select a warehouse'),
  zoneId: z.string().min(1, 'Select a zone'),
  binId: z.string().min(1, 'Select a bin'),
  quantity: z.coerce.number().int().min(1).max(10_000),
})

type FormValues = z.infer<typeof schema>

export function ReceivingPutawayPage() {
  const [confirmed, setConfirmed] = useState<{
    item: Item
    warehouse: Warehouse
    zone: Zone
    bin: Bin
    quantity: number
    inboundLineId: number
    suggestion: { aisle: string; bin: string; confidence: number; reason: string }
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

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { itemId: '', warehouseId: '', zoneId: '', binId: '', quantity: 1 },
    mode: 'onChange',
  })

  const items = itemsQ.data ?? []
  const warehouses = warehousesQ.data ?? []

  const selected = useMemo(() => {
    const item = items.find((p) => p.id === form.watch('itemId'))
    const warehouse = warehouses.find((w) => w.id === form.watch('warehouseId'))
    return { item, warehouse }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, warehouses, form.watch('itemId'), form.watch('warehouseId')])

  const warehouseId = form.watch('warehouseId')
  const zoneId = form.watch('zoneId')

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

  const suggestion = useMemo(() => {
    if (!selected.item || !selected.warehouse) return null
    const qty = form.watch('quantity') ?? 1
    return suggestBinLocation({
      sku: selected.item.sku,
      warehouseName: selected.warehouse.name,
      qty,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected.item, selected.warehouse, form.watch('quantity')])

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
        </div>

        <Card className="p-0">
          <CardHeader className="p-4">
            <CardTitle>Receive Stock</CardTitle>
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
                onSubmit={form.handleSubmit(async (vals) => {
                  const item = items.find((p) => p.id === vals.itemId)
                  const warehouse = warehouses.find((w) => w.id === vals.warehouseId)
                  const zone = zones.find((z) => z.id === vals.zoneId)
                  const bin = bins.find((b) => b.id === vals.binId)
                  if (!item || !warehouse || !zone || !bin) return

                  const s =
                    suggestion ??
                    suggestBinLocation({
                      sku: item.sku,
                      warehouseName: warehouse.name,
                      qty: vals.quantity,
                    })

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
                      suggestion: s,
                      at: new Date().toISOString(),
                      putawayTask: null,
                    })
                    toast.success('Receiving posted to backend.')
                  } catch {
                    toast.error('Failed to post receiving. Check backend logs.')
                  } finally {
                    setPosting(false)
                  }
                })}
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Item
                    </label>
                    <select
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white/85 px-3 text-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-800 dark:bg-slate-950/70 dark:focus:border-slate-700 dark:focus:ring-amber-400/20"
                      {...form.register('itemId')}
                    >
                      <option value="">Select item…</option>
                      {items.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.sku} · {p.name}
                        </option>
                      ))}
                    </select>
                    {form.formState.errors.itemId && (
                      <div className="text-xs text-rose-600 dark:text-rose-300">
                        {form.formState.errors.itemId.message}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Warehouse
                    </label>
                    <select
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white/85 px-3 text-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-800 dark:bg-slate-950/70 dark:focus:border-slate-700 dark:focus:ring-amber-400/20"
                      {...form.register('warehouseId')}
                    >
                      <option value="">Select warehouse…</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                    {form.formState.errors.warehouseId && (
                      <div className="text-xs text-rose-600 dark:text-rose-300">
                        {form.formState.errors.warehouseId.message}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">Zone</label>
                    <select
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white/85 px-3 text-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-amber-200 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950/70 dark:focus:border-slate-700 dark:focus:ring-amber-400/20"
                      {...form.register('zoneId')}
                      onChange={(e) => {
                        form.setValue('zoneId', e.target.value, { shouldDirty: true, shouldValidate: true })
                        form.setValue('binId', '', { shouldDirty: true, shouldValidate: true })
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
                    {form.formState.errors.zoneId && (
                      <div className="text-xs text-rose-600 dark:text-rose-300">{form.formState.errors.zoneId.message}</div>
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
                      {...form.register('binId')}
                      disabled={!zoneId}
                    >
                      <option value="">Select bin…</option>
                      {bins.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.code}
                        </option>
                      ))}
                    </select>
                    {form.formState.errors.binId && (
                      <div className="text-xs text-rose-600 dark:text-rose-300">{form.formState.errors.binId.message}</div>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min={1}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white/85 px-3 text-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-800 dark:bg-slate-950/70 dark:focus:border-slate-700 dark:focus:ring-amber-400/20"
                      {...form.register('quantity')}
                    />
                    {form.formState.errors.quantity && (
                      <div className="text-xs text-rose-600 dark:text-rose-300">
                        {form.formState.errors.quantity.message}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Suggested Putaway Bin
                    </label>
                    <div className="flex h-10 items-center justify-between rounded-xl border border-slate-200 bg-white/70 px-3 text-sm dark:border-slate-800 dark:bg-slate-950/50">
                      {suggestion ? (
                        <div className="flex items-center gap-2">
                          <Wand2 className="size-4 text-amber-500 dark:text-amber-300" />
                          <span className="text-mono font-semibold text-slate-900 dark:text-slate-100">
                            {suggestion.aisle} / {suggestion.bin}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500 dark:text-slate-400">
                          Select item + warehouse
                        </span>
                      )}
                      {suggestion && (
                        <Badge variant="info" className="text-mono">
                          {(suggestion.confidence * 100).toFixed(0)}%
                        </Badge>
                      )}
                    </div>
                    {suggestion && (
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        {suggestion.reason}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button type="submit" disabled={!form.formState.isValid || posting}>
                    Confirm Receiving
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      form.reset({ itemId: '', warehouseId: '', zoneId: '', binId: '', quantity: 1 })
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
          <CardHeader>
            <CardTitle>Confirmation</CardTitle>
          </CardHeader>
          {!confirmed ? (
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Submit the receiving form to generate a putaway confirmation.
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
                  <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    Suggested: {confirmed.suggestion.aisle} / {confirmed.suggestion.bin}
                  </div>
                </div>
              </div>

              <Button
                variant="secondary"
                onClick={async () => {
                  if (!confirmed) return
                  if (confirmed.putawayTask) {
                    toast('Putaway task already created.')
                    return
                  }

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
                  } catch {
                    toast.error('Failed to create putaway task. Check backend logs.')
                  } finally {
                    setCreatingPutaway(false)
                  }
                }}
                className="w-full"
                disabled={!confirmed || creatingPutaway || !!confirmed.putawayTask}
              >
                Create Putaway Task
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

