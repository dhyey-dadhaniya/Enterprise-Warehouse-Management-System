import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { PackagePlus, Pencil, Plus, RefreshCcw, Trash2, X } from 'lucide-react'

import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card'
import { Table, TBody, TD, TH, THead, TR } from '../../components/ui/Table'
import { cn } from '../../lib/cn'
import { useAuthStore } from '../../store/authStore'
import type { Item } from '../../types/domain'
import { createItem, deleteItem, listItems, updateItem, type ItemUpsertInput } from '../../services/catalogService'

const schema = z.object({
  sku: z.string().min(1, 'SKU is required').max(128, 'Max 128 characters'),
  name: z.string().min(1, 'Name is required').max(255, 'Max 255 characters'),
  description: z.string().max(1024, 'Max 1024 characters').optional(),
  baseUom: z.string().max(32, 'Max 32 characters').optional(),
  active: z.boolean().optional(),
})

type FormValues = z.infer<typeof schema>
type Mode = { type: 'create' } | { type: 'edit'; item: Item } | { type: 'none' }

function activeVariant(active: boolean) {
  return active ? 'success' : 'neutral'
}

export function ItemsPage() {
  const qc = useQueryClient()
  const roles = useAuthStore((s) => s.roles)
  const isAdmin = roles.includes('ADMIN')

  const [mode, setMode] = useState<Mode>({ type: 'none' })
  const [q, setQ] = useState('')
  const [activeOnly, setActiveOnly] = useState(false)

  const itemsQ = useQuery({
    queryKey: ['catalog', 'items', { q, activeOnly }],
    queryFn: async () => {
      const all = await listItems()
      const query = q.trim().toLowerCase()
      let rows = all
      if (query) {
        rows = rows.filter((it) => it.sku.toLowerCase().includes(query) || it.name.toLowerCase().includes(query))
      }
      if (activeOnly) rows = rows.filter((it) => it.active)
      return rows
    },
    staleTime: 30_000,
  })

  const items = itemsQ.data ?? []

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { sku: '', name: '', description: '', baseUom: '', active: true },
    mode: 'onChange',
  })

  const createM = useMutation({
    mutationFn: (input: ItemUpsertInput) => createItem(input),
    onSuccess: async () => {
      toast.success('Item created.')
      setMode({ type: 'none' })
      form.reset({ sku: '', name: '', description: '', baseUom: '', active: true })
      await qc.invalidateQueries({ queryKey: ['catalog', 'items'] })
    },
    onError: () => toast.error('Failed to create item.'),
  })

  const updateM = useMutation({
    mutationFn: (vars: { id: string; input: ItemUpsertInput }) => updateItem(vars.id, vars.input),
    onSuccess: async () => {
      toast.success('Item updated.')
      setMode({ type: 'none' })
      form.reset({ sku: '', name: '', description: '', baseUom: '', active: true })
      await qc.invalidateQueries({ queryKey: ['catalog', 'items'] })
    },
    onError: () => toast.error('Failed to update item.'),
  })

  const deleteM = useMutation({
    mutationFn: (id: string) => deleteItem(id),
    onSuccess: async () => {
      toast.success('Item deleted.')
      await qc.invalidateQueries({ queryKey: ['catalog', 'items'] })
    },
    onError: () => toast.error('Failed to delete item.'),
  })

  const actionBusy = createM.isPending || updateM.isPending || deleteM.isPending

  const title = useMemo(() => {
    if (mode.type === 'create') return 'Add Item'
    if (mode.type === 'edit') return 'Edit Item'
    return 'Items'
  }, [mode.type])

  const selected = mode.type === 'edit' ? mode.item : null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Master data</div>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            <PackagePlus className="size-6" />
            Items
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => itemsQ.refetch()} disabled={itemsQ.isFetching}>
            <RefreshCcw className={cn('size-4', itemsQ.isFetching && 'animate-spin')} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={() => {
              if (!isAdmin) {
                toast.error('Only ADMIN can create items.')
                return
              }
              setMode({ type: 'create' })
              form.reset({ sku: '', name: '', description: '', baseUom: '', active: true })
            }}
            disabled={!isAdmin}
          >
            <Plus className="size-4" />
            Add
          </Button>
        </div>
      </div>

      <Card className="p-0">
        <CardHeader className="p-4">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>ADMIN can create/update/delete. Other roles can view.</CardDescription>
          </div>
          {mode.type !== 'none' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setMode({ type: 'none' })
                form.reset({ sku: '', name: '', description: '', baseUom: '', active: true })
              }}
            >
              <X className="size-4" />
              Close
            </Button>
          )}
        </CardHeader>

        {mode.type !== 'none' && (
          <div className="border-t border-slate-200 p-4 dark:border-slate-800">
            <form
              className="grid gap-3 md:grid-cols-2"
              onSubmit={form.handleSubmit((vals) => {
                if (!isAdmin) {
                  toast.error('Only ADMIN can save items.')
                  return
                }
                const input: ItemUpsertInput = {
                  sku: vals.sku.trim(),
                  name: vals.name.trim(),
                  description: vals.description?.trim() ? vals.description.trim() : null,
                  baseUom: vals.baseUom?.trim() ? vals.baseUom.trim() : null,
                  active: vals.active ?? true,
                }
                if (mode.type === 'create') createM.mutate(input)
                else updateM.mutate({ id: mode.item.id, input })
              })}
            >
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">SKU</label>
                <input
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white/85 px-3 text-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-800 dark:bg-slate-950/70 dark:focus:border-slate-700 dark:focus:ring-amber-400/20"
                  {...form.register('sku')}
                />
                {form.formState.errors.sku && (
                  <div className="text-xs text-rose-600 dark:text-rose-300">{form.formState.errors.sku.message}</div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">Name</label>
                <input
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white/85 px-3 text-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-800 dark:bg-slate-950/70 dark:focus:border-slate-700 dark:focus:ring-amber-400/20"
                  {...form.register('name')}
                />
                {form.formState.errors.name && (
                  <div className="text-xs text-rose-600 dark:text-rose-300">{form.formState.errors.name.message}</div>
                )}
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">Description</label>
                <input
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white/85 px-3 text-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-800 dark:bg-slate-950/70 dark:focus:border-slate-700 dark:focus:ring-amber-400/20"
                  {...form.register('description')}
                />
                {form.formState.errors.description && (
                  <div className="text-xs text-rose-600 dark:text-rose-300">
                    {form.formState.errors.description.message}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">Base UOM</label>
                <input
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white/85 px-3 text-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-800 dark:bg-slate-950/70 dark:focus:border-slate-700 dark:focus:ring-amber-400/20"
                  {...form.register('baseUom')}
                />
                {form.formState.errors.baseUom && (
                  <div className="text-xs text-rose-600 dark:text-rose-300">{form.formState.errors.baseUom.message}</div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-7">
                <input type="checkbox" {...form.register('active')} />
                <span className="text-sm text-slate-700 dark:text-slate-200">Active</span>
              </div>

              <div className="md:col-span-2 flex flex-wrap items-center gap-2 pt-1">
                <Button type="submit" disabled={!form.formState.isValid || !isAdmin || actionBusy}>
                  {mode.type === 'create' ? 'Create' : 'Save'}
                </Button>
                {mode.type === 'edit' && selected && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      form.reset({
                        sku: selected.sku ?? '',
                        name: selected.name ?? '',
                        description: selected.description ?? '',
                        baseUom: selected.baseUom ?? '',
                        active: selected.active ?? true,
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

        <div className="border-t border-slate-200 p-4 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-3 pb-4">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search SKU or name..."
              className="h-10 w-full max-w-md rounded-xl border border-slate-200 bg-white/85 px-3 text-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-amber-200 dark:border-slate-800 dark:bg-slate-950/70 dark:focus:border-slate-700 dark:focus:ring-amber-400/20"
            />
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={activeOnly}
                onChange={(e) => setActiveOnly(e.target.checked)}
              />
              Active only
            </label>
          </div>

          {itemsQ.isError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
              Failed to load items.
            </div>
          ) : itemsQ.isPending ? (
            <div className="space-y-3">
              <div className="h-10 w-full animate-pulse rounded-xl bg-slate-900/5 dark:bg-white/5" />
              <div className="h-10 w-full animate-pulse rounded-xl bg-slate-900/5 dark:bg-white/5" />
              <div className="h-10 w-full animate-pulse rounded-xl bg-slate-900/5 dark:bg-white/5" />
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white/60 p-6 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300">
              No items found. {isAdmin ? 'Create your first item using Add.' : ''}
            </div>
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>SKU</TH>
                  <TH>Name</TH>
                  <TH>UOM</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Actions</TH>
                </tr>
              </THead>
              <TBody>
                {items.map((it) => (
                  <TR key={it.id}>
                    <TD className="text-mono font-semibold text-slate-900 dark:text-slate-100">{it.sku}</TD>
                    <TD className="text-slate-900 dark:text-slate-100">
                      <div className="font-semibold">{it.name}</div>
                      {it.description ? (
                        <div className="text-xs text-slate-600 dark:text-slate-400">{it.description}</div>
                      ) : null}
                    </TD>
                    <TD className="text-mono text-slate-700 dark:text-slate-200">{it.baseUom ?? '—'}</TD>
                    <TD>
                      <Badge variant={activeVariant(it.active)} className="text-mono">
                        {it.active ? 'ACTIVE' : 'INACTIVE'}
                      </Badge>
                    </TD>
                    <TD className="text-right">
                      <div className="inline-flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            if (!isAdmin) {
                              toast.error('Only ADMIN can edit items.')
                              return
                            }
                            setMode({ type: 'edit', item: it })
                            form.reset({
                              sku: it.sku ?? '',
                              name: it.name ?? '',
                              description: it.description ?? '',
                              baseUom: it.baseUom ?? '',
                              active: it.active ?? true,
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
                              toast.error('Only ADMIN can delete items.')
                              return
                            }
                            const ok = window.confirm(`Delete item "${it.sku}"?`)
                            if (!ok) return
                            deleteM.mutate(it.id)
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
      </Card>
    </div>
  )
}

