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
import type { Product, Warehouse } from '../../types/domain'
import { listProducts, listWarehouses } from '../../services/catalogService'
import { suggestBinLocation } from '../../services/putawayLogic'

const schema = z.object({
  productId: z.string().min(1, 'Select a product'),
  warehouseId: z.string().min(1, 'Select a warehouse'),
  quantity: z.coerce.number().int().min(1).max(10_000),
})

type FormValues = z.infer<typeof schema>

export function ReceivingPutawayPage() {
  const [confirmed, setConfirmed] = useState<{
    product: Product
    warehouse: Warehouse
    quantity: number
    suggestion: { aisle: string; bin: string; confidence: number; reason: string }
    at: string
  } | null>(null)

  const productsQ = useQuery({
    queryKey: ['catalog', 'products'],
    queryFn: listProducts,
    staleTime: 60_000,
  })

  const warehousesQ = useQuery({
    queryKey: ['catalog', 'warehouses'],
    queryFn: listWarehouses,
    staleTime: 60_000,
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { productId: '', warehouseId: '', quantity: 1 },
    mode: 'onChange',
  })

  const products = productsQ.data ?? []
  const warehouses = warehousesQ.data ?? []

  const selected = useMemo(() => {
    const product = products.find((p) => p.id === form.watch('productId'))
    const warehouse = warehouses.find((w) => w.id === form.watch('warehouseId'))
    return { product, warehouse }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, warehouses, form.watch('productId'), form.watch('warehouseId')])

  const suggestion = useMemo(() => {
    if (!selected.product || !selected.warehouse) return null
    const qty = form.watch('quantity') ?? 1
    return suggestBinLocation({
      sku: selected.product.sku,
      warehouseName: selected.warehouse.name,
      qty,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected.product, selected.warehouse, form.watch('quantity')])

  const busy = productsQ.isPending || warehousesQ.isPending

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
            {productsQ.isError || warehousesQ.isError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                Failed to load catalog data (mock). Refresh the page.
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
                onSubmit={form.handleSubmit((vals) => {
                  const product = products.find((p) => p.id === vals.productId)
                  const warehouse = warehouses.find((w) => w.id === vals.warehouseId)
                  if (!product || !warehouse || !suggestion) return

                  setConfirmed({
                    product,
                    warehouse,
                    quantity: vals.quantity,
                    suggestion,
                    at: new Date().toISOString(),
                  })
                  toast.success('Receiving confirmed (mock).')
                })}
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Product
                    </label>
                    <select
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white/85 px-3 text-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-800 dark:bg-slate-950/70 dark:focus:border-slate-700 dark:focus:ring-amber-400/20"
                      {...form.register('productId')}
                    >
                      <option value="">Select product…</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.sku} · {p.name}
                        </option>
                      ))}
                    </select>
                    {form.formState.errors.productId && (
                      <div className="text-xs text-rose-600 dark:text-rose-300">
                        {form.formState.errors.productId.message}
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
                          Select product + warehouse
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
                  <Button type="submit" disabled={!form.formState.isValid || !suggestion}>
                    Confirm Receiving
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      form.reset({ productId: '', warehouseId: '', quantity: 1 })
                      setConfirmed(null)
                      toast('Form reset.')
                    }}
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
                <div className="text-xs text-slate-600 dark:text-slate-400">Product</div>
                <div className="mt-0.5 font-semibold text-slate-900 dark:text-slate-100">
                  <span className="text-mono">{confirmed.product.sku}</span> · {confirmed.product.name}
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
                      {confirmed.suggestion.aisle} / {confirmed.suggestion.bin}
                    </div>
                    <Badge variant="success" className="text-mono">
                      READY
                    </Badge>
                  </div>
                </div>
              </div>

              <Button
                variant="secondary"
                onClick={() => toast.success('Putaway task created (mock).')}
                className="w-full"
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

