package com.infotact.wms.inbound.dto;

import com.infotact.wms.inbound.InboundDocumentStatus;
import jakarta.validation.constraints.NotNull;

public record InboundStatusUpdateRequest(@NotNull InboundDocumentStatus status) {
}
