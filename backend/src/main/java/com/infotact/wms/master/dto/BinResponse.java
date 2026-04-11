package com.infotact.wms.master.dto;

import java.time.LocalDateTime;

public record BinResponse(
        Long id,
        Long zoneId,
        Long warehouseId,
        Long aisleId,
        String code,
        String description,
        boolean active,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
