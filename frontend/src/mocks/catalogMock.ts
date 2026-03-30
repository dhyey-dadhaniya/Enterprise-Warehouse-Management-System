import type { Product, Warehouse } from '../types/domain'

export const warehousesSeed: Warehouse[] = [
  { id: 'wh_1', name: 'WH-1' },
  { id: 'wh_2', name: 'WH-2' },
  { id: 'wh_3', name: 'WH-3' },
  { id: 'wh_4', name: 'WH-4' },
]

export const productsSeed: Product[] = [
  {
    id: 'prod_1',
    sku: 'SKU-1042',
    name: 'Packaging Tape',
    quantity: 142,
    warehouseId: 'wh_1',
    warehouseName: 'WH-1',
    binLocation: 'A3 / B-12',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod_2',
    sku: 'SKU-0031',
    name: 'Shipping Labels',
    quantity: 6,
    warehouseId: 'wh_1',
    warehouseName: 'WH-1',
    binLocation: 'A1 / B-03',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod_3',
    sku: 'SKU-2201',
    name: 'Corrugated Box (L)',
    quantity: 88,
    warehouseId: 'wh_2',
    warehouseName: 'WH-2',
    binLocation: 'C2 / A-08',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod_4',
    sku: 'SKU-7702',
    name: 'Stretch Wrap',
    quantity: 51,
    warehouseId: 'wh_1',
    warehouseName: 'WH-1',
    binLocation: 'D1 / C-02',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod_5',
    sku: 'SKU-0199',
    name: 'Pallet Straps',
    quantity: 24,
    warehouseId: 'wh_3',
    warehouseName: 'WH-3',
    binLocation: 'B6 / D-01',
    updatedAt: new Date().toISOString(),
  },
]

