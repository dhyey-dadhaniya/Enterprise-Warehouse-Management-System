package com.infotact.wms.putaway.dto;

import jakarta.validation.constraints.Size;

public record PutawayConfirmRequest(
        Long toBinId,
        @Size(max = 512) String note
) {
}
