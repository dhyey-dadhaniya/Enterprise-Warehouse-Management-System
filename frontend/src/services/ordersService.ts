import type { AxiosAdapter, AxiosRequestConfig } from 'axios'
import type { Order, OrderStatus } from '../types/domain'
import { api } from './http'
import { ordersSeed } from '../mocks/ordersMock'

type OrdersListResponse = {
  items: Order[]
  total: number
}

let ordersDb: Order[] = [...ordersSeed]

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

function parseQuery(url?: string) {
  const u = new URL(url ?? '', 'http://local')
  return u.searchParams
}

function mockAdapter(): AxiosAdapter {
  return async (config: AxiosRequestConfig) => {
    await sleep(300)
    const method = (config.method ?? 'get').toLowerCase()
    const url = config.url ?? ''

    // GET /orders?query=&status=&page=&pageSize=
    if (method === 'get' && url.startsWith('/orders')) {
      const q = parseQuery(url)
      const query = (q.get('query') ?? '').trim().toLowerCase()
      const status = (q.get('status') ?? '').trim() as OrderStatus | ''
      const page = Math.max(1, Number(q.get('page') ?? 1))
      const pageSize = Math.min(50, Math.max(5, Number(q.get('pageSize') ?? 10)))

      let filtered = [...ordersDb].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      if (status) filtered = filtered.filter((o) => o.status === status)
      if (query) {
        filtered = filtered.filter((o) => {
          if (o.number.toLowerCase().includes(query)) return true
          return o.lines.some((l) => l.sku.toLowerCase().includes(query) || l.name.toLowerCase().includes(query))
        })
      }

      const total = filtered.length
      const start = (page - 1) * pageSize
      const items = filtered.slice(start, start + pageSize)

      const data: OrdersListResponse = { items, total }
      return {
        status: 200,
        statusText: 'OK',
        config,
        headers: { 'content-type': 'application/json' },
        data,
      }
    }

    // PATCH /orders/:id/status  { status }
    const match = url.match(/^\/orders\/([^/]+)\/status$/)
    if (method === 'patch' && match) {
      const id = match[1]!
      const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data
      const next = body?.status as OrderStatus | undefined
      if (!next) {
        return {
          status: 400,
          statusText: 'Bad Request',
          config,
          headers: { 'content-type': 'application/json' },
          data: { message: 'status is required' },
        }
      }

      const idx = ordersDb.findIndex((o) => o.id === id)
      if (idx === -1) {
        return {
          status: 404,
          statusText: 'Not Found',
          config,
          headers: { 'content-type': 'application/json' },
          data: { message: 'order not found' },
        }
      }

      ordersDb[idx] = { ...ordersDb[idx], status: next }
      return {
        status: 200,
        statusText: 'OK',
        config,
        headers: { 'content-type': 'application/json' },
        data: ordersDb[idx],
      }
    }

    return {
      status: 404,
      statusText: 'Not Found',
      config,
      headers: { 'content-type': 'application/json' },
      data: { message: 'mock route not found', url, method },
    }
  }
}

export async function listOrders(input: {
  query?: string
  status?: OrderStatus | ''
  page: number
  pageSize: number
}): Promise<OrdersListResponse> {
  const params = new URLSearchParams()
  if (input.query) params.set('query', input.query)
  if (input.status) params.set('status', input.status)
  params.set('page', String(input.page))
  params.set('pageSize', String(input.pageSize))

  const res = await api.get<OrdersListResponse>(`/orders?${params.toString()}`, {
    adapter: mockAdapter(),
  })
  return res.data
}

export async function updateOrderStatus(input: {
  id: string
  status: OrderStatus
}): Promise<Order> {
  const res = await api.patch<Order>(`/orders/${input.id}/status`, { status: input.status }, { adapter: mockAdapter() })
  return res.data
}

export function getNextStatus(current: OrderStatus): OrderStatus | null {
  if (current === 'PENDING') return 'PICKING'
  if (current === 'PICKING') return 'PACKED'
  if (current === 'PACKED') return 'SHIPPED'
  return null
}

