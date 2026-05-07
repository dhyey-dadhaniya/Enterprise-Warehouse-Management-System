import { api } from './http'

export type PutawayTaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
export type PutawayRule = 'CONSOLIDATE' | 'EMPTY_BIN' | 'FALLBACK'

export interface PutawayTask {
  id: number
  warehouseId: number
  status: PutawayTaskStatus
  fromBinId: number
  fromBinCode: string
  suggestedToBinId: number
  suggestedToBinCode: string
  confirmedToBinId: number | null
  confirmedToBinCode: string | null
  assignedUserId: number | null
  assignedUsername: string | null
  itemId: number
  sku: string
  quantity: string
  suggestionRule: PutawayRule
  createdAt: string
  updatedAt: string
}

export async function suggestPutaway(input: {
  warehouseId: number
  itemId: number
  fromBinId: number
  quantity: number
}): Promise<{ suggestedBinId: number; suggestedBinCode?: string; rule: string }> {
  const params = new URLSearchParams()
  params.set('warehouseId', String(input.warehouseId))
  params.set('itemId', String(input.itemId))
  params.set('fromBinId', String(input.fromBinId))
  params.set('quantity', String(input.quantity))
  const res = await api.get<{ suggestedBinId: number; suggestedBinCode?: string; rule: string }>(
    `/putaway-tasks/suggestion?${params.toString()}`,
  )
  return res.data
}

export async function createPutawayTask(input: {
  warehouseId: number
  fromBinId: number
  itemId: number
  quantity: number
}): Promise<PutawayTask> {
  const res = await api.post<PutawayTask>('/putaway-tasks', input)
  return res.data
}

export async function getPutawayTask(id: number): Promise<PutawayTask> {
  const res = await api.get<PutawayTask>(`/putaway-tasks/${id}`)
  return res.data
}

export async function listPutawayTasks(params: {
  warehouseId?: number
  page?: number
  size?: number
} = {}): Promise<{ content: PutawayTask[]; totalElements: number }> {
  const p = new URLSearchParams()
  if (params.warehouseId != null) p.set('warehouseId', String(params.warehouseId))
  p.set('page', String(params.page ?? 0))
  p.set('size', String(params.size ?? 20))
  const res = await api.get<{ content: PutawayTask[]; totalElements: number }>(
    `/putaway-tasks?${p.toString()}`,
  )
  return res.data
}

export async function claimPutawayTask(id: number): Promise<PutawayTask> {
  const res = await api.post<PutawayTask>(`/putaway-tasks/${id}/claim`)
  return res.data
}

export async function confirmPutawayTask(id: number, toBinId?: number, note?: string): Promise<PutawayTask> {
  const res = await api.post<PutawayTask>(`/putaway-tasks/${id}/confirm`, {
    toBinId: toBinId ?? null,
    note: note ?? null,
  })
  return res.data
}
