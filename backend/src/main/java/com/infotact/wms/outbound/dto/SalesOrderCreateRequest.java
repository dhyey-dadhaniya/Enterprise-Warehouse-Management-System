package com.infotact.wms.outbound.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record SalesOrderCreateRequest(
        @Size(max = 64) String orderNumber,
        @NotNull Long warehouseId,
        @NotEmpty @Valid List<SalesOrderLineRequest> lines
) {
}
