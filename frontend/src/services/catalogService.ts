import type { Item, Warehouse } from '../types/domain'
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

export async function listWarehouses(): Promise<Warehouse[]> {
  const res = await api.get<PageResponse<Warehouse>>('/warehouses', { params: { page: 0, size: 200 } })
  return res.data.content
}

export async function listItems(): Promise<Item[]> {
  const res = await api.get<PageResponse<Item>>('/items', { params: { page: 0, size: 200 } })
  return res.data.content
}

