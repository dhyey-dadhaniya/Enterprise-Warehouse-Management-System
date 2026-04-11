package com.infotact.wms.outbound.dto;

import com.infotact.wms.outbound.PickWaveStatus;

import java.time.LocalDateTime;
import java.util.List;

public record PickWaveResponse(
        Long id,
        String waveCode,
        Long warehouseId,
        PickWaveStatus status,
        List<Long> salesOrderIds,
        int taskCount,
        LocalDateTime createdAt
) {
}
