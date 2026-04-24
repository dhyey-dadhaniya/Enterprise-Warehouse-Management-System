export type InventoryAdjustmentReason = 'CYCLE_COUNT' | 'DAMAGE' | 'CORRECTION' | 'QUARANTINE' | 'OTHER'

export interface InventoryBalance {
  id: string
  warehouseId: string
  warehouseCode: string
  zoneId: string | null
  zoneCode: string | null
  binId: string
  binCode: string
  itemId: string
  sku: string
  itemName: string
  onHandQty: number
  reservedQty: number
  availableQty: number
  updatedAt: string
}

// Backend responses for adjustments/transfers include more fields; we only surface a minimal
// shape for confirmation messaging and debug display.
export type InventoryOperationResult =
  | {
      ledgerId: number
      quantityDelta: number
      onHandQty: number
      reservedQty: number
      availableQty: number
    }
  | {
      transferRef: string
      outLedgerId: number
      inLedgerId: number
      fromBinOnHandAfter: number
      toBinOnHandAfter: number
    }

