package com.infotact.wms.auth.dto;

public record AuthResponse(
        String accessToken,
        String tokenType,
        long expiresInMs
) {
}
