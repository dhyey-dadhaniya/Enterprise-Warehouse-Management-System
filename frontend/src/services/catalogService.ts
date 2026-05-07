import type { Aisle, Bin, Item, Warehouse, Zone } from '../types/domain'
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

export type WarehouseUpsertInput = {
  code: string
  name: string
  addressLine?: string | null
}

export async function createWarehouse(input: WarehouseUpsertInput): Promise<Warehouse> {
  const res = await api.post<Warehouse>('/warehouses', {
    code: input.code,
    name: input.name,
    addressLine: input.addressLine ?? null,
  })
  return res.data
}

export async function updateWarehouse(id: string, input: WarehouseUpsertInput): Promise<Warehouse> {
  const res = await api.put<Warehouse>(`/warehouses/${id}`, {
    code: input.code,
    name: input.name,
    addressLine: input.addressLine ?? null,
  })
  return res.data
}

export async function deleteWarehouse(id: string): Promise<void> {
  await api.delete(`/warehouses/${id}`)
}

export async function listItems(): Promise<Item[]> {
  const res = await api.get<PageResponse<Item>>('/items', { params: { page: 0, size: 200 } })
  return res.data.content
}

export type ItemUpsertInput = {
  sku: string
  name: string
  description?: string | null
  baseUom?: string | null
  active?: boolean | null
}

export async function createItem(input: ItemUpsertInput): Promise<Item> {
  const res = await api.post<Item>('/items', {
    sku: input.sku,
    name: input.name,
    description: input.description ?? null,
    baseUom: input.baseUom ?? null,
    active: input.active ?? true,
  })
  return res.data
}

export async function updateItem(id: string, input: ItemUpsertInput): Promise<Item> {
  const res = await api.put<Item>(`/items/${id}`, {
    sku: input.sku,
    name: input.name,
    description: input.description ?? null,
    baseUom: input.baseUom ?? null,
    active: input.active ?? true,
  })
  return res.data
}

export async function deleteItem(id: string): Promise<void> {
  await api.delete(`/items/${id}`)
}

export type ZoneUpsertInput = { code: string; name: string }

export async function listZones(warehouseId: string): Promise<Zone[]> {
  const res = await api.get<PageResponse<Zone>>('/zones', { params: { warehouseId, page: 0, size: 200 } })
  return res.data.content
}

export async function createZone(warehouseId: string, input: ZoneUpsertInput): Promise<Zone> {
  const res = await api.post<Zone>('/zones', { code: input.code, name: input.name }, { params: { warehouseId } })
  return res.data
}

export async function updateZone(id: string, input: ZoneUpsertInput): Promise<Zone> {
  const res = await api.put<Zone>(`/zones/${id}`, { code: input.code, name: input.name })
  return res.data
}

export async function deleteZone(id: string): Promise<void> {
  await api.delete(`/zones/${id}`)
}

export type AisleUpsertInput = { code: string; name: string }

export async function listAisles(zoneId: string): Promise<Aisle[]> {
  const res = await api.get<PageResponse<Aisle>>('/aisles', { params: { zoneId, page: 0, size: 200 } })
  return res.data.content
}

export async function createAisle(zoneId: string, input: AisleUpsertInput): Promise<Aisle> {
  const res = await api.post<Aisle>('/aisles', { code: input.code, name: input.name }, { params: { zoneId } })
  return res.data
}

export async function updateAisle(id: string, input: AisleUpsertInput): Promise<Aisle> {
  const res = await api.put<Aisle>(`/aisles/${id}`, { code: input.code, name: input.name })
  return res.data
}

export async function deleteAisle(id: string): Promise<void> {
  await api.delete(`/aisles/${id}`)
}

export type BinUpsertInput = { code: string; description?: string | null; aisleId?: string | null; active?: boolean | null }

export async function listBins(zoneId: string): Promise<Bin[]> {
  const res = await api.get<PageResponse<Bin>>('/bins', { params: { zoneId, page: 0, size: 200 } })
  return res.data.content
}

export async function createBin(zoneId: string, input: BinUpsertInput): Promise<Bin> {
  const res = await api.post<Bin>(
    '/bins',
    {
      code: input.code,
      description: input.description ?? null,
      aisleId: input.aisleId ?? null,
      active: input.active ?? true,
    },
    { params: { zoneId } },
  )
  return res.data
}

export async function updateBin(id: string, input: BinUpsertInput): Promise<Bin> {
  const res = await api.put<Bin>(`/bins/${id}`, {
    code: input.code,
    description: input.description ?? null,
    aisleId: input.aisleId ?? null,
    active: input.active ?? true,
  })
  return res.data
}

export async function deleteBin(id: string): Promise<void> {
  await api.delete(`/bins/${id}`)
}

