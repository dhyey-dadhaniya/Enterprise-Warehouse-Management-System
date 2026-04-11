package com.infotact.wms.inventory.dto;

import java.math.BigDecimal;

public record InventoryTransferResponse(
        String transferRef,
        Long outLedgerId,
        Long inLedgerId,
        BigDecimal fromBinOnHandAfter,
        BigDecimal toBinOnHandAfter
) {
}
