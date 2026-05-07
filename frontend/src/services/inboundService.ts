import { api } from './http'
import type {
  InboundDocument,
  InboundDocumentStatus,
  InboundDocumentType,
  InboundLine,
  ReceivingPostResult,
  PageResponse,
} from '../types/domain'

export interface InboundListParams {
  warehouseId?: number
  status?: InboundDocumentStatus | ''
  documentType?: InboundDocumentType | ''
  q?: string
  page?: number
  size?: number
}

export interface InboundCreatePayload {
  documentNumber: string
  documentType: InboundDocumentType
  warehouseId: number
  supplierName?: string
  reference?: string
  expectedDeliveryDate?: string
  notes?: string
}

export interface InboundUpdatePayload {
  supplierName?: string
  reference?: string
  expectedDeliveryDate?: string
  notes?: string
}

export interface InboundLinePayload {
  itemId: number
  expectedQty: number
  receivedQty?: number
  lineNumber?: number
  notes?: string
}

// ── Documents ──────────────────────────────────────────────────────────────
export const listInboundDocuments = (params: InboundListParams = {}) => {
  const p: Record<string, string | number> = { size: params.size ?? 20, page: params.page ?? 0 }
  if (params.warehouseId) p.warehouseId = params.warehouseId
  if (params.status) p.status = params.status
  if (params.documentType) p.documentType = params.documentType
  if (params.q) p.q = params.q
  return api.get<PageResponse<InboundDocument>>('/inbound-documents', { params: p }).then((r) => r.data)
}

export const getInboundDocument = (id: number) =>
  api.get<InboundDocument>(`/inbound-documents/${id}`).then((r) => r.data)

export const createInboundDocument = (data: InboundCreatePayload) =>
  api.post<InboundDocument>('/inbound-documents', data).then((r) => r.data)

export const updateInboundDocument = (id: number, data: InboundUpdatePayload) =>
  api.put<InboundDocument>(`/inbound-documents/${id}`, data).then((r) => r.data)

export const patchInboundDocumentStatus = (id: number, status: InboundDocumentStatus) =>
  api.patch<InboundDocument>(`/inbound-documents/${id}/status`, { status }).then((r) => r.data)

// ── Lines ──────────────────────────────────────────────────────────────────
export const addInboundLine = (docId: number, data: InboundLinePayload) =>
  api.post<InboundDocument>(`/inbound-documents/${docId}/lines`, data).then((r) => r.data)

export const updateInboundLine = (docId: number, lineId: number, data: Partial<InboundLinePayload>) =>
  api.put<InboundDocument>(`/inbound-documents/${docId}/lines/${lineId}`, data).then((r) => r.data)

export const deleteInboundLine = (docId: number, lineId: number) =>
  api.delete(`/inbound-documents/${docId}/lines/${lineId}`)

// ── Post Receipt ───────────────────────────────────────────────────────────
export const postReceipt = (
  documentId: number,
  lineId: number,
  data: { stagingBinId: number; quantity: number; note?: string },
  idempotencyKey?: string,
) =>
  api.post<ReceivingPostResult>(
    `/inbound-documents/${documentId}/lines/${lineId}/post-receipt`,
    data,
    idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : undefined,
  ).then((r) => r.data)
