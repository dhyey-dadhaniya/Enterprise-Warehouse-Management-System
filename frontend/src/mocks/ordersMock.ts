import type { Order } from '../types/domain'

function isoMinutesAgo(mins: number) {
  return new Date(Date.now() - mins * 60_000).toISOString()
}

export const ordersSeed: Order[] = [
  {
    id: 'ord_001',
    number: 'A-0911',
    status: 'PICKING',
    priority: 'HIGH',
    createdAt: isoMinutesAgo(78),
    lines: [
      {
        id: 'line_001',
        sku: 'SKU-1042',
        name: 'Packaging Tape',
        qty: 4,
        warehouseName: 'WH-1',
        aisle: 'A3',
        bin: 'B-12',
      },
      {
        id: 'line_002',
        sku: 'SKU-0031',
        name: 'Shipping Labels',
        qty: 2,
        warehouseName: 'WH-1',
        aisle: 'A1',
        bin: 'B-03',
      },
    ],
  },
  {
    id: 'ord_002',
    number: 'A-0912',
    status: 'PENDING',
    priority: 'MEDIUM',
    createdAt: isoMinutesAgo(132),
    lines: [
      {
        id: 'line_003',
        sku: 'SKU-2201',
        name: 'Corrugated Box (L)',
        qty: 6,
        warehouseName: 'WH-2',
        aisle: 'C2',
        bin: 'A-08',
      },
    ],
  },
  {
    id: 'ord_003',
    number: 'A-0913',
    status: 'PACKED',
    priority: 'LOW',
    createdAt: isoMinutesAgo(260),
    lines: [
      {
        id: 'line_004',
        sku: 'SKU-7702',
        name: 'Stretch Wrap',
        qty: 1,
        warehouseName: 'WH-1',
        aisle: 'D1',
        bin: 'C-02',
      },
    ],
  },
  {
    id: 'ord_004',
    number: 'A-0914',
    status: 'SHIPPED',
    priority: 'MEDIUM',
    createdAt: isoMinutesAgo(540),
    lines: [
      {
        id: 'line_005',
        sku: 'SKU-0199',
        name: 'Pallet Straps',
        qty: 3,
        warehouseName: 'WH-3',
        aisle: 'B6',
        bin: 'D-01',
      },
    ],
  },
]

