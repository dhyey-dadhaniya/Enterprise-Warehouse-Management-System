package com.infotact.wms.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank @Size(min = 3, max = 128) String username,
        @NotBlank @Size(min = 6, max = 128) String password,
        @NotBlank @Size(min = 3, max = 64) String role
) {
}

