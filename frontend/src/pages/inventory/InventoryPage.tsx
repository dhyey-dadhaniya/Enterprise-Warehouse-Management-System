import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { RefreshCcw, Shield, TrendingDown } from 'lucide-react'

import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card'
import { Table, TBody, TD, TH, THead, TR } from '../../components/ui/Table'
import { cn } from '../../lib/cn'
import { useAuthStore } from '../../store/authStore'
import type { InventoryAdjustmentReason } from '../../types/inventory'
import {
  createInventoryAdjustment,
  createInventoryTransfer,
  listInventoryBalances,
  listLowStock,
} from '../../services/inventoryService'

const adjustSchema = z.object({
  warehouseId: z.coerce.number().int().positive(),
  binId: z.coerce.number().int().positive(),
  itemId: z.coerce.number().int().positive(),
  quantityDelta: z.coerce.number().refine((n) => n !== 0, 'Must not be 0'),
  reason: z.enum(['CYCLE_COUNT', 'DAMAGE', 'CORRECTION', 'QUARANTINE', 'OTHER']),
  note: z.string().max(255).optional(),
})

const transferSchema = z.object({
  warehouseId: z.coerce.number().int().positive(),
  fromBinId: z.coerce.number().int().positive(),
  toBinId: z.coerce.number().int().positive(),
  itemId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().positive(),
  note: z.string().max(255).optional(),
})

type AdjustForm = z.infer<typeof adjustSchema>
type TransferForm = z.infer<typeof transferSchema>

function qtyBadge(available: number) {
  if (available <= 0) return 'danger'
  if (available < 5) return 'warning'
  return 'success'
}

export function InventoryPage() {
  const qc = useQueryClient()
  const roles = useAuthStore((s) => s.roles)
  const isAdmin = roles.includes('ADMIN')

  const [tab, setTab] = useState<'balances' | 'low-stock'>('balances')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sku, setSku] = useState('')
  const [nonZeroOnly, setNonZeroOnly] = useState(true)

  const balancesKey = useMemo(
    () => ['inventory', 'balances', { page, pageSize, sku, nonZeroOnly }] as const,
    [nonZeroOnly, page, pageSize, sku],
  )

  const balancesQ = useQuery({
    queryKey: balancesKey,
    queryFn: () => listInventoryBalances({ page, pageSize, sku, nonZeroOnly }),
    staleTime: 10_000,
    enabled: tab === 'balances',
  })

  const lowKey = useMemo(() => ['inventory', 'low-stock', { page, pageSize }] as const, [page, pageSize])

  const lowQ = useQuery({
    queryKey: lowKey,
    queryFn: () => listLowStock({ page, pageSize: Math.min(50, pageSize), maxAvailable: 5 }),
    staleTime: 10_000,
    enabled: tab === 'low-stock',
  })

  const adjustForm = useForm<AdjustForm>({
    resolver: zodResolver(adjustSchema),
    defaultValues: {
      warehouseId: 1,
      binId: 1,
      itemId: 1,
      quantityDelta: 0,
      reason: 'CYCLE_COUNT',
      note: '',
    },
    mode: 'onChange',
  })

  const transferForm = useForm<TransferForm>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      warehouseId: 1,
      fromBinId: 1,
      toBinId: 1,
      itemId: 1,
      quantity: 1,
      note: '',
    },
    mode: 'onChange',
  })

  const adjustM = useMutation({
    mutationFn: createInventoryAdjustment,
    onSuccess: async (res) => {
      if ('ledgerId' in res) toast.success(`Adjustment posted. Ledger #${res.ledgerId}`)
      await qc.invalidateQueries({ queryKey: ['inventory'] })
    },
    onError: () => toast.error('Failed to post adjustment.'),
  })

  const transferM = useMutation({
    mutationFn: createInventoryTransfer,
    onSuccess: async (res) => {
      if ('transferRef' in res) toast.success(`Transfer posted. Ref ${res.transferRef}`)
      await qc.invalidateQueries({ queryKey: ['inventory'] })
    },
    onError: () => toast.error('Failed to post transfer.'),
  })

  const activeQ = tab === 'balances' ? balancesQ : lowQ
  const items = activeQ.data?.items ?? []
  const total = activeQ.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Inventory</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Inventory Management
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => activeQ.refetch()} disabled={activeQ.isFetching}>
            <RefreshCcw className={cn('size-4', activeQ.isFetching && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-0">
            <CardHeader className="p-4">
              <div>
                <CardTitle>Stock</CardTitle>
                <CardDescription>Balances for all bins (or low-stock view).</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={tab === 'balances' ? 'primary' : 'secondary'}
                  onClick={() => {
                    setTab('balances')
                    setPage(1)
                  }}
                >
                  Balances
                </Button>
                <Button
                  size="sm"
                  variant={tab === 'low-stock' ? 'primary' : 'secondary'}
                  onClick={() => {
                    setTab('low-stock')
                    setPage(1)
                  }}
                >
                  <TrendingDown className="size-4" />
                  Low stock
                </Button>
              </div>
            </CardHeader>

            {tab === 'balances' && (
              <div className="border-t border-slate-200 p-4 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-[220px] flex-1">
                    <input
                      value={sku}
                      onChange={(e) => {
                        setSku(e.target.value)
                        setPage(1)
                      }}
                      placeholder="Filter by SKU..."
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white/85 px-3 text-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-800 dark:bg-slate-950/70 dark:focus:border-slate-700 dark:focus:ring-amber-400/20"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={nonZeroOnly}
                      onChange={(e) => {
                        setNonZeroOnly(e.target.checked)
                        setPage(1)
                      }}
                    />
                    Non-zero only
                  </label>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value))
                      setPage(1)
                    }}
                    className="h-10 rounded-xl border border-slate-200 bg-white/85 px-3 text-sm outline-none focus:ring-2 focus:ring-amber-200 dark:border-slate-800 dark:bg-slate-950/70 dark:focus:ring-amber-400/20"
                  >
                    {[10, 20, 30, 50].map((n) => (
                      <option key={n} value={n}>
                        {n}/page
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="border-t border-slate-200 p-4 dark:border-slate-800">
              {activeQ.isError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                  Failed to load inventory.
                </div>
              ) : activeQ.isPending ? (
                <div className="space-y-3">
                  <div className="h-10 w-full animate-pulse rounded-xl bg-slate-900/5 dark:bg-white/5" />
                  <div className="h-10 w-full animate-pulse rounded-xl bg-slate-900/5 dark:bg-white/5" />
                  <div className="h-10 w-full animate-pulse rounded-xl bg-slate-900/5 dark:bg-white/5" />
                </div>
              ) : items.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white/60 p-6 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300">
                  No rows found.
                </div>
              ) : (
                <Table>
                  <THead>
                    <tr>
                      <TH>Warehouse</TH>
                      <TH>Bin</TH>
                      <TH>SKU</TH>
                      <TH>On hand</TH>
                      <TH>Reserved</TH>
                      <TH>Available</TH>
                      <TH>Updated</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {items.map((r) => (
                      <TR key={r.id}>
                        <TD className="text-mono">{r.warehouseCode}</TD>
                        <TD className="text-mono">{r.binCode}</TD>
                        <TD>
                          <div className="text-mono font-semibold text-slate-900 dark:text-slate-100">{r.sku}</div>
                          <div className="text-xs text-slate-600 dark:text-slate-400">{r.itemName}</div>
                        </TD>
                        <TD className="text-mono">{r.onHandQty}</TD>
                        <TD className="text-mono">{r.reservedQty}</TD>
                        <TD>
                          <Badge variant={qtyBadge(Number(r.availableQty))} className="text-mono">
                            {r.availableQty}
                          </Badge>
                        </TD>
                        <TD className="text-xs text-slate-600 dark:text-slate-400">
                          {new Date(r.updatedAt).toLocaleString()}
                        </TD>
                      </TR>
                    ))}
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
                <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
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

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="size-4" />
                Admin operations
              </CardTitle>
              <CardDescription>Adjust or transfer stock (ADMIN only).</CardDescription>
            </CardHeader>

            <div className="space-y-6">
              <div className={cn(!isAdmin && 'opacity-60')}>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Adjustment</div>
                <form
                  className="mt-3 space-y-3"
                  onSubmit={adjustForm.handleSubmit((vals) => {
                    if (!isAdmin) {
                      toast.error('Only ADMIN can adjust inventory.')
                      return
                    }
                    adjustM.mutate({
                      warehouseId: vals.warehouseId,
                      binId: vals.binId,
                      itemId: vals.itemId,
                      quantityDelta: vals.quantityDelta,
                      reason: vals.reason as InventoryAdjustmentReason,
                      note: vals.note,
                    })
                  })}
                >
                  <div className="grid grid-cols-2 gap-2">
                    <input className="h-10 rounded-xl border border-slate-200 bg-white/85 px-3 text-sm dark:border-slate-800 dark:bg-slate-950/70" placeholder="Warehouse ID" {...adjustForm.register('warehouseId')} />
                    <input className="h-10 rounded-xl border border-slate-200 bg-white/85 px-3 text-sm dark:border-slate-800 dark:bg-slate-950/70" placeholder="Bin ID" {...adjustForm.register('binId')} />
                    <input className="h-10 rounded-xl border border-slate-200 bg-white/85 px-3 text-sm dark:border-slate-800 dark:bg-slate-950/70" placeholder="Item ID" {...adjustForm.register('itemId')} />
                    <input className="h-10 rounded-xl border border-slate-200 bg-white/85 px-3 text-sm dark:border-slate-800 dark:bg-slate-950/70" placeholder="Qty delta (+/-)" {...adjustForm.register('quantityDelta')} />
                  </div>
                  <select className="h-10 w-full rounded-xl border border-slate-200 bg-white/85 px-3 text-sm dark:border-slate-800 dark:bg-slate-950/70" {...adjustForm.register('reason')}>
                    {(['CYCLE_COUNT', 'DAMAGE', 'CORRECTION', 'QUARANTINE', 'OTHER'] as const).map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <input className="h-10 w-full rounded-xl border border-slate-200 bg-white/85 px-3 text-sm dark:border-slate-800 dark:bg-slate-950/70" placeholder="Note (optional)" {...adjustForm.register('note')} />
                  <Button type="submit" disabled={!isAdmin || !adjustForm.formState.isValid || adjustM.isPending} className="w-full">
                    Post adjustment
                  </Button>
                </form>
              </div>

              <div className={cn(!isAdmin && 'opacity-60')}>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Transfer</div>
                <form
                  className="mt-3 space-y-3"
                  onSubmit={transferForm.handleSubmit((vals) => {
                    if (!isAdmin) {
                      toast.error('Only ADMIN can transfer inventory.')
                      return
                    }
                    transferM.mutate({
                      warehouseId: vals.warehouseId,
                      fromBinId: vals.fromBinId,
                      toBinId: vals.toBinId,
                      itemId: vals.itemId,
                      quantity: vals.quantity,
                      note: vals.note,
                    })
                  })}
                >
                  <div className="grid grid-cols-2 gap-2">
                    <input className="h-10 rounded-xl border border-slate-200 bg-white/85 px-3 text-sm dark:border-slate-800 dark:bg-slate-950/70" placeholder="Warehouse ID" {...transferForm.register('warehouseId')} />
                    <input className="h-10 rounded-xl border border-slate-200 bg-white/85 px-3 text-sm dark:border-slate-800 dark:bg-slate-950/70" placeholder="Item ID" {...transferForm.register('itemId')} />
                    <input className="h-10 rounded-xl border border-slate-200 bg-white/85 px-3 text-sm dark:border-slate-800 dark:bg-slate-950/70" placeholder="From Bin ID" {...transferForm.register('fromBinId')} />
                    <input className="h-10 rounded-xl border border-slate-200 bg-white/85 px-3 text-sm dark:border-slate-800 dark:bg-slate-950/70" placeholder="To Bin ID" {...transferForm.register('toBinId')} />
                    <input className="h-10 rounded-xl border border-slate-200 bg-white/85 px-3 text-sm dark:border-slate-800 dark:bg-slate-950/70" placeholder="Quantity" {...transferForm.register('quantity')} />
                    <input className="h-10 rounded-xl border border-slate-200 bg-white/85 px-3 text-sm dark:border-slate-800 dark:bg-slate-950/70" placeholder="Note (optional)" {...transferForm.register('note')} />
                  </div>
                  <Button type="submit" disabled={!isAdmin || !transferForm.formState.isValid || transferM.isPending} className="w-full">
                    Post transfer
                  </Button>
                </form>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

