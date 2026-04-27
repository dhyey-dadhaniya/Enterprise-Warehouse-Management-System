import { api } from './http'

export type PutawayTaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export interface PutawayTaskResponse {
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
  quantity: number
  suggestionRule: string | null
  inboundDocumentLineId: number | null
  createdAt: string
  updatedAt: string
}

export async function createPutawayTask(input: {
  warehouseId: number
  fromBinId: number
  itemId: number
  quantity: number
  inboundDocumentLineId?: number | null
}): Promise<PutawayTaskResponse> {
  const res = await api.post<PutawayTaskResponse>('/putaway-tasks', {
    warehouseId: input.warehouseId,
    fromBinId: input.fromBinId,
    itemId: input.itemId,
    quantity: input.quantity,
    inboundDocumentLineId: input.inboundDocumentLineId ?? null,
  })
  return res.data
}

