package com.infotact.wms.inventory.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record InventoryBalanceResponse(
        Long id,
        Long warehouseId,
        String warehouseCode,
        Long zoneId,
        String zoneCode,
        Long binId,
        String binCode,
        Long itemId,
        String sku,
        String itemName,
        BigDecimal onHandQty,
        BigDecimal reservedQty,
        BigDecimal availableQty,
        LocalDateTime updatedAt
) {
}
