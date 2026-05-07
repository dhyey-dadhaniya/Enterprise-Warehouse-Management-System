import type { Order, OrderStatus } from '../types/domain'
import { api } from './http'
import type { ID } from '../types/domain'

export interface SalesOrderDetailLine {
  id: number
  lineNumber: number
  itemId: number
  sku: string
  quantityOrdered: number
  quantityAllocated: number
  quantityPicked: number
}

export interface SalesOrderDetail {
  id: number
  orderNumber: string
  warehouseId: number
  warehouseCode: string
  status: OrderStatus
  lines: SalesOrderDetailLine[]
  createdAt: string
  updatedAt: string
}

export async function listOrders(input: {
  page: number
  pageSize: number
  warehouseId?: number
}): Promise<{ items: Order[]; total: number }> {
  const params = new URLSearchParams()
  if (input.warehouseId != null) params.set('warehouseId', String(input.warehouseId))
  params.set('page', String(Math.max(0, input.page - 1)))
  params.set('size', String(input.pageSize))

  const res = await api.get<{
    content: Array<{
      id: number
      warehouseId: number
      warehouseCode: string
      orderNumber: string
      status: OrderStatus
      createdAt: string
      updatedAt: string
      lines: Array<{
        id: number
        lineNumber: number
        itemId: number
        sku: string
        quantityOrdered: string
        quantityAllocated: string
        quantityPicked: string
      }>
    }>
    totalElements: number
  }>(`/sales-orders?${params.toString()}`)

  return {
    items: res.data.content.map((o) => ({
      id: String(o.id) as ID,
      number: o.orderNumber,
      status: o.status,
      priority: 'MEDIUM',
      warehouseId: o.warehouseId,
      createdAt: o.createdAt,
      lines: o.lines.map((l) => ({
        id: String(l.id) as ID,
        sku: l.sku,
        name: l.sku,
        qty: Number(l.quantityOrdered),
        warehouseName: o.warehouseCode,
        aisle: '',
        bin: '',
      })),
    })),
    total: res.data.totalElements,
  }
}

export async function getSalesOrder(id: number): Promise<SalesOrderDetail> {
  const res = await api.get<{
    id: number
    orderNumber: string
    warehouseId: number
    warehouseCode: string
    status: OrderStatus
    createdAt: string
    updatedAt: string
    lines: Array<{
      id: number
      lineNumber: number
      itemId: number
      sku: string
      quantityOrdered: string
      quantityAllocated: string
      quantityPicked: string
    }>
  }>(`/sales-orders/${id}`)
  const o = res.data
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    warehouseId: o.warehouseId,
    warehouseCode: o.warehouseCode,
    status: o.status,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    lines: o.lines.map((l) => ({
      id: l.id,
      lineNumber: l.lineNumber,
      itemId: l.itemId,
      sku: l.sku,
      quantityOrdered: Number(l.quantityOrdered),
      quantityAllocated: Number(l.quantityAllocated),
      quantityPicked: Number(l.quantityPicked),
    })),
  }
}

export async function cancelOrder(id: number): Promise<void> {
  await api.patch(`/sales-orders/${id}/cancel`, null)
}

export async function createOrder(data: {
  orderNumber?: string
  warehouseId: number
  lines: Array<{ itemId: number; quantityOrdered: number }>
}): Promise<void> {
  await api.post('/sales-orders', data)
}

export async function advanceOrder(input: { id: string; current: OrderStatus; warehouseId?: number }): Promise<void> {
  const orderId = Number(input.id)

  if (input.current === 'PENDING') {
    try {
      await api.post(`/sales-orders/${orderId}/allocate`, null)
    } catch {
      // Ignore if already allocated (409) — proceed to wave creation
    }
    await api.post('/pick-waves', { warehouseId: input.warehouseId, salesOrderIds: [orderId] })
    return
  }
  if (input.current === 'PICKING') {
    await api.patch(`/sales-orders/${orderId}/pack`, null)
    return
  }
  if (input.current === 'PACKED') {
    await api.patch(`/sales-orders/${orderId}/ship`, null)
    return
  }
}

export function getNextStatus(current: OrderStatus): OrderStatus | null {
  if (current === 'PENDING') return 'PICKING'
  if (current === 'PICKING') return 'PACKED'
  if (current === 'PACKED') return 'SHIPPED'
  return null
}

export interface PickTask {
  id: number
  pickWaveId: number
  salesOrderId: number
  warehouseId: number
  binId: number
  binCode: string
  zoneCode: string
  itemId: number
  sku: string
  quantityToPick: string
  quantityPicked: string
  status: 'PENDING' | 'COMPLETED'
  routeSequence: number
}

export async function listPickTasks(params: {
  status?: 'PENDING' | 'COMPLETED'
  warehouseId?: number
  page?: number
  size?: number
}): Promise<{ content: PickTask[]; totalElements: number }> {
  const p = new URLSearchParams()
  if (params.status) p.set('status', params.status)
  if (params.warehouseId != null) p.set('warehouseId', String(params.warehouseId))
  p.set('page', String(params.page ?? 0))
  p.set('size', String(params.size ?? 50))
  const res = await api.get<{ content: PickTask[]; totalElements: number }>(
    `/pick-tasks?${p.toString()}`,
  )
  return res.data
}

export async function listPickTasksByWave(waveId: number): Promise<PickTask[]> {
  const res = await api.get<PickTask[]>(`/pick-tasks?waveId=${waveId}`)
  return res.data
}

export async function getPickTask(id: number): Promise<PickTask> {
  const res = await api.get<PickTask>(`/pick-tasks/${id}`)
  return res.data
}

export interface PickWave {
  id: number
  waveCode: string
  warehouseId: number
  status: string
  salesOrderIds: number[]
  taskCount: number
  createdAt: string
}

export async function getPickWave(id: number): Promise<PickWave> {
  const res = await api.get<PickWave>(`/pick-waves/${id}`)
  return res.data
}

export async function createPickWave(data: {
  warehouseId: number
  salesOrderIds: number[]
}): Promise<PickWave> {
  const res = await api.post<PickWave>('/pick-waves', data)
  return res.data
}

export async function confirmPickTask(id: number): Promise<void> {
  await api.post(
    `/pick-tasks/${id}/confirm-pick`,
    null,
    { headers: { 'Idempotency-Key': `pick-${id}-${Date.now()}` } },
  )
}
