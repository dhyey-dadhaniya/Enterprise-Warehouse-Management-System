package com.infotact.wms.outbound.dto;

import com.infotact.wms.outbound.PickTaskStatus;

import java.math.BigDecimal;

public record PickTaskResponse(
        Long id,
        Long pickWaveId,
        Long salesOrderId,
        Long salesOrderLineId,
        Long warehouseId,
        Long binId,
        String binCode,
        String zoneCode,
        Long itemId,
        String sku,
        BigDecimal quantityToPick,
        BigDecimal quantityPicked,
        PickTaskStatus status,
        int routeSequence
) {
}
