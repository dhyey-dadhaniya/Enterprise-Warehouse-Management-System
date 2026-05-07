export type PickTaskStatus = 'PENDING' | 'COMPLETED'

export interface PickTask {
  id: string
  pickWaveId: string | null
  salesOrderId: string
  salesOrderLineId: string
  warehouseId: string
  binId: string
  binCode: string
  zoneCode: string | null
  itemId: string
  sku: string
  quantityToPick: number
  quantityPicked: number
  status: PickTaskStatus
  routeSequence: number
}

