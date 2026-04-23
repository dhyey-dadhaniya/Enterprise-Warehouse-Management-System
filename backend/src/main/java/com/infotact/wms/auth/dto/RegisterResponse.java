package com.infotact.wms.auth.dto;

public record RegisterResponse(
        String message
) {
    public static RegisterResponse created() {
        return new RegisterResponse("User registered successfully");
    }
}

