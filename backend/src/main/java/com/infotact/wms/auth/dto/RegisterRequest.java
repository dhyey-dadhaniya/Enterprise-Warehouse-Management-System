package com.infotact.wms.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank
        @Size(min = 3, max = 128)
        @Pattern(regexp = "^[a-zA-Z0-9._-]+$", message = "username may contain letters, numbers, dot, underscore, dash")
        String username,

        @NotBlank
        @Size(min = 6, max = 128)
        String password,

        @NotBlank
        @Pattern(regexp = "^(ADMIN|OPERATOR)$", message = "role must be ADMIN or OPERATOR")
        String role
) {
}

