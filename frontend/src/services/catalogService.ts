import { api } from './http'

export interface Item {
  id: number
  sku: string
  name: string
  description?: string
  baseUom: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export async function listItems(params: { q?: string; active?: boolean; page?: number; size?: number } = {}): Promise<{ content: Item[]; totalElements: number }> {
  const p = new URLSearchParams()
  if (params.q) p.set('q', params.q)
  if (params.active != null) p.set('active', String(params.active))
  p.set('page', String(params.page ?? 0))
  p.set('size', String(params.size ?? 20))
  const res = await api.get<{ content: Item[]; totalElements: number }>(`/items?${p}`)
  return res.data
}

export async function getItem(id: number): Promise<Item> {
  const res = await api.get<Item>(`/items/${id}`)
  return res.data
}

export async function createItem(data: { sku: string; name: string; description?: string; baseUom?: string }): Promise<Item> {
  const res = await api.post<Item>('/items', data)
  return res.data
}

export async function updateItem(
  id: number,
  data: { sku: string; name: string; description?: string; baseUom?: string; active?: boolean },
): Promise<Item> {
  const res = await api.put<Item>(`/items/${id}`, data)
  return res.data
}

export async function deleteItem(id: number): Promise<void> {
  await api.delete(`/items/${id}`)
}

export async function listWarehouses(): Promise<Array<{ id: number; code: string; name: string }>> {
  const res = await api.get<{
    content: Array<{ id: number; code: string; name: string }>
  }>('/warehouses?size=100')
  return res.data.content
}

export async function findItemBySku(sku: string): Promise<{ id: number; sku: string; name: string } | null> {
  const q = (sku ?? '').trim()
  if (!q) return null

  const res = await api.get<{
    content: Array<{ id: number; sku: string; name: string }>
  }>(`/items?q=${encodeURIComponent(q)}&size=5`)

  const exact = res.data.content.find((i) => i.sku.toUpperCase() === q.toUpperCase())
  return exact ?? res.data.content[0] ?? null
}

export async function searchItems(q: string): Promise<Array<{ id: number; sku: string; name: string }>> {
  const query = (q ?? '').trim()
  if (!query) return []
  const res = await api.get<{ content: Array<{ id: number; sku: string; name: string }> }>(
    `/items?q=${encodeURIComponent(query)}&size=20`,
  )
  return res.data.content
}

export async function listAllItems(): Promise<Array<{ id: number; sku: string; name: string }>> {
  const res = await api.get<{ content: Array<{ id: number; sku: string; name: string }> }>(
    '/items?size=200&sort=sku,asc',
  )
  return res.data.content
}

export async function listZones(warehouseId: number): Promise<Array<{ id: number; code: string; name: string }>> {
  const res = await api.get<{ content: Array<{ id: number; code: string; name: string }> }>(
    `/zones?warehouseId=${warehouseId}&size=100`,
  )
  return res.data.content
}

export async function listBins(zoneId: number): Promise<Array<{ id: number; code: string; capacityUnits: number | null }>> {
  const res = await api.get<{ content: Array<{ id: number; code: string; capacityUnits: number | null }> }>(
    `/bins?zoneId=${zoneId}&active=true&size=200`,
  )
  return res.data.content
}

