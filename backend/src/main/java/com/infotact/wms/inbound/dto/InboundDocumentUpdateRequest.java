package com.infotact.wms.inbound.dto;

import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record InboundDocumentUpdateRequest(
        @Size(max = 255) String supplierName,
        @Size(max = 128) String reference,
        LocalDate expectedDeliveryDate,
        @Size(max = 2000) String notes
) {
}
