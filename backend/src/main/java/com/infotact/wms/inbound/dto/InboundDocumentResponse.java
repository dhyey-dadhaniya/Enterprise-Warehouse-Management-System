package com.infotact.wms.inbound.dto;

import com.infotact.wms.inbound.InboundDocumentStatus;
import com.infotact.wms.inbound.InboundDocumentType;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record InboundDocumentResponse(
        Long id,
        String documentNumber,
        InboundDocumentType documentType,
        Long warehouseId,
        String warehouseCode,
        InboundDocumentStatus status,
        String supplierName,
        String reference,
        LocalDate expectedDeliveryDate,
        String notes,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        long lineCount,
        List<InboundLineResponse> lines
) {
}
