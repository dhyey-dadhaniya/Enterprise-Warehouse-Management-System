package com.infotact.wms.inventory.dto;

import java.math.BigDecimal;

public record InventoryAdjustmentResponse(
        Long ledgerId,
        BigDecimal quantityDelta,
        BigDecimal onHandQty,
        BigDecimal reservedQty,
        BigDecimal availableQty
) {
}
