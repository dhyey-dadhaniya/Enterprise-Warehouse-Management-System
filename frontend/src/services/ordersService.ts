import type { SalesOrder, SalesOrderStatus } from '../types/domain'
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

type SalesOrdersListResponse = {
  items: SalesOrder[]
  total: number
}

export async function listOrders(input: {
  query?: string
  status?: SalesOrderStatus | ''
  page: number
  pageSize: number
}): Promise<SalesOrdersListResponse> {
  const res = await api.get<PageResponse<SalesOrder>>('/sales-orders', {
    params: { page: Math.max(0, input.page - 1), size: input.pageSize },
  })

  // Backend doesn't currently expose free-text search params; filter client-side for now.
  const q = (input.query ?? '').trim().toLowerCase()
  const status = (input.status ?? '').trim()

  let items = res.data.content
  if (status) items = items.filter((o) => o.status === status)
  if (q) {
    items = items.filter((o) => {
      if (o.orderNumber.toLowerCase().includes(q)) return true
      return o.lines.some((l) => l.sku.toLowerCase().includes(q))
    })
  }

  return { items, total: res.data.totalElements }
}

export async function advanceOrder(input: { id: string; currentStatus: SalesOrderStatus }): Promise<SalesOrder> {
  if (input.currentStatus === 'PENDING') {
    const res = await api.post<SalesOrder>(`/sales-orders/${input.id}/allocate`)
    return res.data
  }
  if (input.currentStatus === 'PICKING') {
    const res = await api.patch<SalesOrder>(`/sales-orders/${input.id}/pack`, undefined, {
      headers: { 'Idempotency-Key': crypto.randomUUID() },
    })
    return res.data
  }
  if (input.currentStatus === 'PACKED') {
    const res = await api.patch<SalesOrder>(`/sales-orders/${input.id}/ship`)
    return res.data
  }
  return await api.get<SalesOrder>(`/sales-orders/${input.id}`).then((r) => r.data)
}

export async function createSalesOrder(input: {
  orderNumber?: string
  warehouseId: number
  lines: Array<{ itemId: number; quantityOrdered: number }>
}): Promise<SalesOrder> {
  const res = await api.post<SalesOrder>('/sales-orders', {
    orderNumber: input.orderNumber?.trim() || undefined,
    warehouseId: input.warehouseId,
    lines: input.lines.map((l) => ({ itemId: l.itemId, quantityOrdered: l.quantityOrdered })),
  })
  return res.data
}

export async function cancelSalesOrder(id: string): Promise<SalesOrder> {
  const res = await api.patch<SalesOrder>(`/sales-orders/${id}/cancel`)
  return res.data
}

export function getNextStatus(current: SalesOrderStatus): SalesOrderStatus | null {
  if (current === 'PENDING') return 'PICKING'
  if (current === 'PICKING') return 'PACKED'
  if (current === 'PACKED') return 'SHIPPED'
  return null
}

