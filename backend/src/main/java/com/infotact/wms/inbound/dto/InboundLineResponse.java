package com.infotact.wms.inbound.dto;

import java.math.BigDecimal;

public record InboundLineResponse(
        Long id,
        int lineNumber,
        Long itemId,
        String sku,
        String itemName,
        BigDecimal expectedQty,
        BigDecimal receivedQty,
        BigDecimal postedQty,
        String notes
) {
}
