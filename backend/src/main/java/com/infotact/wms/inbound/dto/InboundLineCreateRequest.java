package com.infotact.wms.inbound.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record InboundLineCreateRequest(
        @NotNull Long itemId,
        @NotNull @Positive BigDecimal expectedQty,
        Integer lineNumber,
        String notes
) {
}
