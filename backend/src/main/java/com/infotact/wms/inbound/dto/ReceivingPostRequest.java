package com.infotact.wms.inbound.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record ReceivingPostRequest(
        @NotNull Long stagingBinId,
        @NotNull @Positive BigDecimal quantity,
        @Size(max = 512) String note
) {
}
