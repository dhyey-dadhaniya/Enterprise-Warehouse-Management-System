package com.infotact.wms.outbound.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record SalesOrderLineRequest(
        @NotNull Long itemId,
        @NotNull @Positive BigDecimal quantityOrdered
) {
}
