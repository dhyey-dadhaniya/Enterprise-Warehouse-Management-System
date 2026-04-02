package com.infotact.wms.master.dto;

import java.time.LocalDateTime;

public record ZoneResponse(
        Long id,
        Long warehouseId,
        String code,
        String name,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
