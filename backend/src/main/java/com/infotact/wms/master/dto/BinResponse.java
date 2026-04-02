package com.infotact.wms.master.dto;

import java.time.LocalDateTime;

public record BinResponse(
        Long id,
        Long zoneId,
        Long warehouseId,
        String code,
        String description,
        boolean active,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
