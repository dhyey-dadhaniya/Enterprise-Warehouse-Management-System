package com.infotact.wms.master.dto;

import java.time.LocalDateTime;

public record WarehouseResponse(
        Long id,
        String code,
        String name,
        String addressLine,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
