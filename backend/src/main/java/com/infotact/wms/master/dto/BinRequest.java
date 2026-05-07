package com.infotact.wms.master.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record BinRequest(
        @NotBlank @Size(max = 64) String code,
        @Size(max = 512) String description,
        Long aisleId,
        @Positive Integer capacityUnits,
        Boolean active
) {
}
