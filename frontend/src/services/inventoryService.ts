import { api } from './http'

export interface InventoryBalance {
  id: number
  warehouseId: number
  warehouseCode: string
  zoneId: number
  zoneCode: string
  binId: number
  binCode: string
  itemId: number
  sku: string
  itemName: string
  onHandQty: string
  reservedQty: string
  availableQty: string
  updatedAt: string
}

export async function listInventoryBalances(params: {
  warehouseId?: number
  sku?: string
  nonZeroOnly?: boolean
  page?: number
  size?: number
}): Promise<{ content: InventoryBalance[]; totalElements: number }> {
  const p = new URLSearchParams()
  if (params.warehouseId != null) p.set('warehouseId', String(params.warehouseId))
  if (params.sku) p.set('sku', params.sku)
  if (params.nonZeroOnly) p.set('nonZeroOnly', 'true')
  p.set('page', String(params.page ?? 0))
  p.set('size', String(params.size ?? 20))
  const res = await api.get<{ content: InventoryBalance[]; totalElements: number }>(
    `/inventory/balances?${p.toString()}`,
  )
  return res.data
}

export type AdjustmentReason = 'CYCLE_COUNT' | 'DAMAGE' | 'CORRECTION' | 'QUARANTINE' | 'OTHER'

export async function createAdjustment(data: {
  warehouseId: number
  binId: number
  itemId: number
  quantityDelta: number
  reason: AdjustmentReason
  note?: string
}): Promise<{ ledgerId: number; quantityDelta: number; onHandQty: string; availableQty: string }> {
  const res = await api.post('/inventory/adjustments', data)
  return res.data
}

export async function getLowStockCount(maxAvailable = 10): Promise<number> {
  const res = await api.get<{ totalElements: number }>(
    `/inventory/balances/low-stock?maxAvailable=${maxAvailable}&size=1`,
  )
  return res.data.totalElements
}

export async function listLowStock(params: {
  warehouseId?: number
  maxAvailable?: number
  page?: number
  size?: number
} = {}): Promise<{ content: InventoryBalance[]; totalElements: number }> {
  const p = new URLSearchParams()
  if (params.warehouseId != null) p.set('warehouseId', String(params.warehouseId))
  p.set('maxAvailable', String(params.maxAvailable ?? 10))
  p.set('page', String(params.page ?? 0))
  p.set('size', String(params.size ?? 20))
  const res = await api.get<{ content: InventoryBalance[]; totalElements: number }>(
    `/inventory/balances/low-stock?${p.toString()}`,
  )
  return res.data
}

export interface InventoryTransferResult {
  transferRef: string
  outLedgerId: number
  inLedgerId: number
  fromBinOnHandAfter: number
  toBinOnHandAfter: number
}

export async function createTransfer(data: {
  warehouseId: number
  fromBinId: number
  toBinId: number
  itemId: number
  quantity: number
  note?: string
}): Promise<InventoryTransferResult> {
  const res = await api.post<InventoryTransferResult>('/inventory/transfers', data)
  return res.data
}
