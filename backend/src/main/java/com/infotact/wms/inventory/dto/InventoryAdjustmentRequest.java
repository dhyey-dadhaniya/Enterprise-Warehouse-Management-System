package com.infotact.wms.inventory.dto;

import com.infotact.wms.inventory.InventoryAdjustmentReason;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record InventoryAdjustmentRequest(
        @NotNull Long warehouseId,
        @NotNull Long binId,
        @NotNull Long itemId,
        /**
         * Change applied to on-hand (positive increases, negative decreases). Must not be zero.
         */
        @NotNull BigDecimal quantityDelta,
        @NotNull InventoryAdjustmentReason reason,
        String note
) {
}
