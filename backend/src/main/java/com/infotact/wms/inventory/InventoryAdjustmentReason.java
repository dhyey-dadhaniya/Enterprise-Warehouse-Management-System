package com.infotact.wms.inventory;

/**
 * Posted to {@link InventoryLedger#getReason()} for adjustments (cycle count, damage write-off, etc.).
 */
public enum InventoryAdjustmentReason {
    CYCLE_COUNT,
    DAMAGE,
    CORRECTION,
    QUARANTINE,
    OTHER
}
