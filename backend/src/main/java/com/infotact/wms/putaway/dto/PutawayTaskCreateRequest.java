package com.infotact.wms.putaway.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record PutawayTaskCreateRequest(
        @NotNull Long warehouseId,
        @NotNull Long fromBinId,
        @NotNull Long itemId,
        @NotNull @Positive BigDecimal quantity,
        Long inboundDocumentLineId
) {
}
