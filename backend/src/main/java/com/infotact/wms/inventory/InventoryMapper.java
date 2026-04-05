package com.infotact.wms.inventory;

import com.infotact.wms.inventory.dto.InventoryBalanceResponse;

import java.math.BigDecimal;

final class InventoryMapper {

    private InventoryMapper() {
    }

    static InventoryBalanceResponse toResponse(InventoryBalance b) {
        BigDecimal onHand = b.getOnHandQty();
        BigDecimal reserved = b.getReservedQty();
        BigDecimal available = onHand.subtract(reserved);
        return new InventoryBalanceResponse(
                b.getId(),
                b.getWarehouse().getId(),
                b.getWarehouse().getCode(),
                b.getBin().getZone().getId(),
                b.getBin().getZone().getCode(),
                b.getBin().getId(),
                b.getBin().getCode(),
                b.getItem().getId(),
                b.getItem().getSku(),
                b.getItem().getName(),
                onHand,
                reserved,
                available,
                b.getUpdatedAt()
        );
    }
}
