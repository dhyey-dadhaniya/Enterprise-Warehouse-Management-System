import toast from 'react-hot-toast'
import { create } from 'zustand'
import type { Order, OrderStatus } from '../types/domain'
import { advanceOrder, cancelOrder, listOrders } from '../services/ordersService'

type OrdersState = {
  items: Order[]
  total: number
  loading: boolean
  error: string | null
  fetch: (input: { page: number; pageSize: number; warehouseId?: number }) => Promise<void>
  advance: (input: { order: Order }) => Promise<void>
  cancel: (input: { order: Order; onDone: () => void }) => Promise<void>
}

export const useOrdersStore = create<OrdersState>((set, get) => ({
  items: [],
  total: 0,
  loading: false,
  error: null,
  fetch: async ({ page, pageSize, warehouseId }) => {
    try {
      set(() => ({ loading: true, error: null }))
      const res = await listOrders({ page, pageSize, warehouseId })
      set(() => ({ items: res.items, total: res.total, loading: false }))
    } catch (e) {
      set(() => ({ loading: false, error: 'Failed to load orders' }))
    }
  },
  advance: async ({ order }) => {
    try {
      await advanceOrder({ id: order.id, current: order.status as OrderStatus, warehouseId: order.warehouseId })
      toast.success(`Order ${order.number} advanced`)
      await get().fetch({ page: 1, pageSize: 10 })
    } catch (e: any) {
      toast.error(e?.message ? String(e.message) : 'Failed to advance order')
    }
  },
  cancel: async ({ order, onDone }) => {
    try {
      await cancelOrder(Number(order.id))
      toast.success(`Order ${order.number} cancelled`)
      onDone()
      await get().fetch({ page: 1, pageSize: 10 })
    } catch (e: any) {
      toast.error(e?.message ? String(e.message) : 'Failed to cancel order')
    }
  },
}))

