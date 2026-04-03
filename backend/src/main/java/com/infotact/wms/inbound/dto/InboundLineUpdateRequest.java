package com.infotact.wms.inbound.dto;

import java.math.BigDecimal;

/**
 * When document is {@code DRAFT}: itemId, expectedQty, notes may be updated.
 * When receiving: receivedQty (and notes) may be updated.
 */
public record InboundLineUpdateRequest(
        Long itemId,
        BigDecimal expectedQty,
        BigDecimal receivedQty,
        String notes
) {
}
