package com.infotact.wms.master.dto;

import java.time.LocalDateTime;

public record AisleResponse(
        Long id,
        Long zoneId,
        Long warehouseId,
        String code,
        String name,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}

