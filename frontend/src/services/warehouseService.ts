import { api } from './http'
import type { WarehouseDetail, Zone, Aisle, Bin, PageResponse } from '../types/domain'

// ── Warehouse ──────────────────────────────────────────────────────────────
export const getWarehouses = (q?: string) =>
  api.get<PageResponse<WarehouseDetail>>('/warehouses', { params: { q, size: 100 } }).then((r) => r.data)

export const getWarehouse = (id: number) =>
  api.get<WarehouseDetail>(`/warehouses/${id}`).then((r) => r.data)

export const createWarehouse = (data: { code: string; name: string; addressLine?: string }) =>
  api.post<WarehouseDetail>('/warehouses', data).then((r) => r.data)

export const updateWarehouse = (id: number, data: { code: string; name: string; addressLine?: string }) =>
  api.put<WarehouseDetail>(`/warehouses/${id}`, data).then((r) => r.data)

export const deleteWarehouse = (id: number) => api.delete(`/warehouses/${id}`)

// ── Zone ───────────────────────────────────────────────────────────────────
export const getZones = (warehouseId: number) =>
  api.get<PageResponse<Zone>>('/zones', { params: { warehouseId, size: 100 } }).then((r) => r.data)

export const getZone = (id: number) =>
  api.get<Zone>(`/zones/${id}`).then((r) => r.data)

export const createZone = (warehouseId: number, data: { code: string; name: string }) =>
  api.post<Zone>('/zones', data, { params: { warehouseId } }).then((r) => r.data)

export const updateZone = (id: number, data: { code: string; name: string }) =>
  api.put<Zone>(`/zones/${id}`, data).then((r) => r.data)

export const deleteZone = (id: number) => api.delete(`/zones/${id}`)

// ── Aisle ──────────────────────────────────────────────────────────────────
export const getAisles = (zoneId: number) =>
  api.get<PageResponse<Aisle>>('/aisles', { params: { zoneId, size: 100 } }).then((r) => r.data)

export const getAisle = (id: number) =>
  api.get<Aisle>(`/aisles/${id}`).then((r) => r.data)

export const createAisle = (zoneId: number, data: { code: string; name: string }) =>
  api.post<Aisle>('/aisles', data, { params: { zoneId } }).then((r) => r.data)

export const updateAisle = (id: number, data: { code: string; name: string }) =>
  api.put<Aisle>(`/aisles/${id}`, data).then((r) => r.data)

export const deleteAisle = (id: number) => api.delete(`/aisles/${id}`)

// ── Bin ────────────────────────────────────────────────────────────────────
export const getBins = (zoneId: number) =>
  api.get<PageResponse<Bin>>('/bins', { params: { zoneId, size: 100 } }).then((r) => r.data)

export const getBin = (id: number) =>
  api.get<Bin>(`/bins/${id}`).then((r) => r.data)

export const createBin = (
  zoneId: number,
  data: { code: string; description?: string; capacityUnits?: number },
) => api.post<Bin>('/bins', data, { params: { zoneId } }).then((r) => r.data)

export const updateBin = (
  id: number,
  data: { code: string; description?: string; capacityUnits?: number },
) => api.put<Bin>(`/bins/${id}`, data).then((r) => r.data)

export const deleteBin = (id: number) => api.delete(`/bins/${id}`)
