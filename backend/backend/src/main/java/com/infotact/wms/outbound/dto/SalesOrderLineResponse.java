package com.infotact.wms.outbound.dto;

import java.math.BigDecimal;

public record SalesOrderLineResponse(
        Long id,
        int lineNumber,
        Long itemId,
        String sku,
        BigDecimal quantityOrdered,
        BigDecimal quantityAllocated,
        BigDecimal quantityPicked
) {
}
