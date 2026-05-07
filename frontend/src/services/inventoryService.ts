import type { InventoryAdjustmentReason, InventoryBalance, InventoryOperationResult } from '../types/inventory'
import { api } from './http'

type PageResponse<T> = {
  content: T[]
  totalElements: number
  totalPages: number
  page: number
  size: number
  first: boolean
  last: boolean
}

export async function listInventoryBalances(input: {
  page: number
  pageSize: number
  warehouseId?: number
  sku?: string
  nonZeroOnly?: boolean
}): Promise<{ items: InventoryBalance[]; total: number }> {
  const res = await api.get<PageResponse<InventoryBalance>>('/inventory/balances', {
    params: {
      page: Math.max(0, input.page - 1),
      size: input.pageSize,
      warehouseId: input.warehouseId,
      sku: input.sku?.trim() || undefined,
      nonZeroOnly: input.nonZeroOnly ?? false,
    },
  })
  return { items: res.data.content, total: res.data.totalElements }
}

export async function listLowStock(input: {
  page: number
  pageSize: number
  warehouseId?: number
  maxAvailable: number
}): Promise<{ items: InventoryBalance[]; total: number }> {
  const res = await api.get<PageResponse<InventoryBalance>>('/inventory/balances/low-stock', {
    params: {
      page: Math.max(0, input.page - 1),
      size: input.pageSize,
      warehouseId: input.warehouseId,
      maxAvailable: input.maxAvailable,
    },
  })
  return { items: res.data.content, total: res.data.totalElements }
}

export async function createInventoryAdjustment(input: {
  warehouseId: number
  binId: number
  itemId: number
  quantityDelta: number
  reason: InventoryAdjustmentReason
  note?: string
}): Promise<InventoryOperationResult> {
  const res = await api.post<InventoryOperationResult>(
    '/inventory/adjustments',
    {
      warehouseId: input.warehouseId,
      binId: input.binId,
      itemId: input.itemId,
      quantityDelta: input.quantityDelta,
      reason: input.reason,
      note: input.note?.trim() || null,
    },
    { headers: { 'Idempotency-Key': crypto.randomUUID() } },
  )
  return res.data
}

export async function createInventoryTransfer(input: {
  warehouseId: number
  fromBinId: number
  toBinId: number
  itemId: number
  quantity: number
  note?: string
}): Promise<InventoryOperationResult> {
  const res = await api.post<InventoryOperationResult>(
    '/inventory/transfers',
    {
      warehouseId: input.warehouseId,
      fromBinId: input.fromBinId,
      toBinId: input.toBinId,
      itemId: input.itemId,
      quantity: input.quantity,
      note: input.note?.trim() || null,
    },
    { headers: { 'Idempotency-Key': crypto.randomUUID() } },
  )
  return res.data
}

