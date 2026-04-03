package com.infotact.wms.inbound.dto;

import com.infotact.wms.inbound.InboundDocumentType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

public record InboundDocumentCreateRequest(
        @NotBlank @Size(max = 64) String documentNumber,
        @NotNull InboundDocumentType documentType,
        @NotNull Long warehouseId,
        @Size(max = 255) String supplierName,
        @Size(max = 128) String reference,
        LocalDate expectedDeliveryDate,
        @Size(max = 2000) String notes,
        @Valid List<InboundLineCreateRequest> lines
) {
}
