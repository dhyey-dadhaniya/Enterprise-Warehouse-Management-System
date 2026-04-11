package com.infotact.wms.inventory.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record InventoryTransferRequest(
        @NotNull Long warehouseId,
        @NotNull Long fromBinId,
        @NotNull Long toBinId,
        @NotNull Long itemId,
        @NotNull @Positive BigDecimal quantity,
        String note
) {
}
