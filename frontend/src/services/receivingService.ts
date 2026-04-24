import type { Item, Warehouse } from '../types/domain'
import { api } from './http'

export type InboundDocumentType = 'ASN' | 'PO' | 'RETURN' | 'TRANSFER_IN'

export interface InboundLineResponse {
  id: number
  lineNumber: number
  itemId: number
  sku: string
  itemName: string
  expectedQty: number
  receivedQty: number
  postedQty: number
  notes: string | null
}

export interface InboundDocumentResponse {
  id: number
  documentNumber: string
  documentType: InboundDocumentType
  warehouseId: number
  warehouseCode: string
  status: string
  supplierName: string | null
  reference: string | null
  expectedDeliveryDate: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  lineCount: number
  lines: InboundLineResponse[]
}

export interface ReceivingPostResponse {
  ledgerId: number
  lineId: number
  postedQty: number
  availableQty: number
}

export async function createInboundDocument(input: {
  documentNumber: string
  documentType: InboundDocumentType
  warehouseId: number
  supplierName?: string
  reference?: string
  notes?: string
}): Promise<InboundDocumentResponse> {
  const res = await api.post<InboundDocumentResponse>('/inbound-documents', {
    documentNumber: input.documentNumber,
    documentType: input.documentType,
    warehouseId: input.warehouseId,
    supplierName: input.supplierName ?? null,
    reference: input.reference ?? null,
    expectedDeliveryDate: null,
    notes: input.notes ?? null,
    lines: [],
  })
  return res.data
}

export async function addInboundLine(input: {
  documentId: number
  itemId: number
  expectedQty: number
  lineNumber?: number
  notes?: string
}): Promise<InboundDocumentResponse> {
  const res = await api.post<InboundDocumentResponse>(`/inbound-documents/${input.documentId}/lines`, {
    itemId: input.itemId,
    expectedQty: input.expectedQty,
    lineNumber: input.lineNumber ?? null,
    notes: input.notes ?? null,
  })
  return res.data
}

export async function postReceipt(input: {
  documentId: number
  lineId: number
  stagingBinId: number
  quantity: number
  note?: string
}): Promise<ReceivingPostResponse> {
  const res = await api.post<ReceivingPostResponse>(
    `/inbound-documents/${input.documentId}/lines/${input.lineId}/post-receipt`,
    {
      stagingBinId: input.stagingBinId,
      quantity: input.quantity,
      note: input.note ?? null,
    },
    { headers: { 'Idempotency-Key': crypto.randomUUID() } },
  )
  return res.data
}

export function buildInboundDocumentNumber(input: { warehouse: Warehouse; item: Item }) {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const t = String(d.getTime()).slice(-5)
  return `RCV-${input.warehouse.code}-${input.item.sku}-${y}${m}${day}-${t}`.slice(0, 64)
}

