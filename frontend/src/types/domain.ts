export type ID = string

export interface Item {
  id: ID
  sku: string
  name: string
  description: string | null
  baseUom: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface Warehouse {
  id: ID
  code: string
  name: string
  addressLine: string | null
  createdAt: string
  updatedAt: string
}

export interface WarehouseNode {
  id: ID
  type: 'WAREHOUSE' | 'ZONE' | 'AISLE' | 'BIN'
  name: string
  children?: WarehouseNode[]
}

export type OrderStatus = 'PENDING' | 'PICKING' | 'PACKED' | 'SHIPPED'

export interface SalesOrderLine {
  id: ID
  lineNumber: number
  itemId: ID
  sku: string
  quantityOrdered: number
  quantityAllocated: number
  quantityPicked: number
}

export type SalesOrderStatus = OrderStatus | 'CANCELLED'

export interface SalesOrder {
  id: ID
  orderNumber: string
  warehouseId: ID
  warehouseCode: string
  status: SalesOrderStatus
  createdAt: string
  updatedAt: string
  lines: SalesOrderLine[]
}

export interface ActivityEvent {
  id: ID
  at: string
  title: string
  meta?: string
  severity?: 'info' | 'warning' | 'success'
}

