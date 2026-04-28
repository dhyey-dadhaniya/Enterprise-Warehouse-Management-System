import type { PickTask, PickTaskStatus } from '../types/picking'
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

export async function listPickTasks(input: {
  status?: PickTaskStatus
  warehouseId?: number
  page: number
  pageSize: number
}): Promise<{ items: PickTask[]; total: number }> {
  const res = await api.get<PageResponse<PickTask>>('/pick-tasks', {
    params: {
      status: input.status ?? 'PENDING',
      warehouseId: input.warehouseId,
      page: Math.max(0, input.page - 1),
      size: input.pageSize,
    },
  })
  return { items: res.data.content, total: res.data.totalElements }
}

export async function confirmPick(id: string): Promise<PickTask> {
  const res = await api.post<PickTask>(`/pick-tasks/${id}/confirm-pick`, undefined, {
    headers: { 'Idempotency-Key': crypto.randomUUID() },
  })
  return res.data
}

