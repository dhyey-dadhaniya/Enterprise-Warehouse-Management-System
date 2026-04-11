package com.infotact.wms.auth.dto;

import java.util.List;

public record MeResponse(
        String username,
        List<String> roles
) {
}
