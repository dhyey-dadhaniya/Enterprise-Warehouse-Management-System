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

export type OrderStatus = 'PENDING' | 'PICKING' | 'PACKED' | 'SHIPPED'

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

