export type ID = string

export interface Product {
  id: ID
  sku: string
  name: string
  quantity: number
  warehouseId: ID
  warehouseName: string
  binLocation: string
  updatedAt: string
}

export interface Warehouse {
  id: ID
  name: string
}

export interface WarehouseNode {
  id: ID
  type: 'WAREHOUSE' | 'ZONE' | 'AISLE' | 'BIN'
  name: string
  children?: WarehouseNode[]
}

export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
}

export interface WarehouseDetail {
  id: number
  code: string
  name: string
  addressLine?: string
  createdAt: string
  updatedAt: string
}

export interface Zone {
  id: number
  warehouseId: number
  code: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface Aisle {
  id: number
  zoneId: number
  warehouseId: number
  code: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface Bin {
  id: number
  zoneId: number
  warehouseId: number
  aisleId?: number
  code: string
  description?: string
  capacityUnits?: number
  active: boolean
  createdAt: string
  updatedAt: string
}

export type InboundDocumentStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'RECEIVING'
  | 'PARTIALLY_RECEIVED'
  | 'COMPLETED'
  | 'CANCELLED'

export type InboundDocumentType = 'ASN' | 'PURCHASE_ORDER'

export interface InboundLine {
  id: number
  lineNumber: number
  itemId: number
  sku: string
  itemName: string
  expectedQty: number
  receivedQty: number
  postedQty: number
  notes?: string
}

export interface InboundDocument {
  id: number
  documentNumber: string
  documentType: InboundDocumentType
  warehouseId: number
  warehouseCode: string
  status: InboundDocumentStatus
  supplierName?: string
  reference?: string
  expectedDeliveryDate?: string
  notes?: string
  createdAt: string
  updatedAt: string
  lineCount: number
  lines: InboundLine[]
}

export interface ReceivingPostResult {
  inboundDocumentId: number
  lineId: number
  quantityPostedThisRequest: number
  postedQty: number
  receivedQty: number
  expectedQty: number
  receivedVersusExpectedMismatch: boolean
  stagingBinId: number
  inventoryLedgerEntryId: number
  documentStatus: InboundDocumentStatus
  replayed: boolean
}

export type OrderStatus = 'PENDING' | 'PICKING' | 'PACKED' | 'SHIPPED' | 'CANCELLED'

export interface OrderLine {
  id: ID
  sku: string
  name: string
  qty: number
  warehouseName: string
  aisle: string
  bin: string
}

export interface Order {
  id: ID
  number: string
  status: OrderStatus
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  warehouseId: number
  createdAt: string
  lines: OrderLine[]
}

export interface ActivityEvent {
  id: ID
  at: string
  title: string
  meta?: string
  severity?: 'info' | 'warning' | 'success'
}

