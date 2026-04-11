package com.infotact.wms.master.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ItemRequest(
        @NotBlank @Size(max = 128) String sku,
        @NotBlank @Size(max = 255) String name,
        @Size(max = 1024) String description,
        @Size(max = 32) String baseUom,
        Boolean active
) {
}
