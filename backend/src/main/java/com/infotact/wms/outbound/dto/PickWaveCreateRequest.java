package com.infotact.wms.outbound.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record PickWaveCreateRequest(
        @NotNull Long warehouseId,
        @NotEmpty List<Long> salesOrderIds
) {
}
