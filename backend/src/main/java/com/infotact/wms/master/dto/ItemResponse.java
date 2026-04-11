package com.infotact.wms.master.dto;

import java.time.LocalDateTime;

public record ItemResponse(
        Long id,
        String sku,
        String name,
        String description,
        String baseUom,
        boolean active,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
