package com.infotact.wms.master.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AisleRequest(
        @NotBlank @Size(max = 64) String code,
        @NotBlank @Size(max = 255) String name
) {
}

