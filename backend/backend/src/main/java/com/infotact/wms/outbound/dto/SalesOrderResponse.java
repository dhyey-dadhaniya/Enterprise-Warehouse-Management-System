package com.infotact.wms.outbound.dto;

import com.infotact.wms.outbound.SalesOrderStatus;

import java.time.LocalDateTime;
import java.util.List;

public record SalesOrderResponse(
        Long id,
        String orderNumber,
        Long warehouseId,
        String warehouseCode,
        SalesOrderStatus status,
        List<SalesOrderLineResponse> lines,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
