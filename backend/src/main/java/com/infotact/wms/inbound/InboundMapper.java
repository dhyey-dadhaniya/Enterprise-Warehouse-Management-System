package com.infotact.wms.inbound;

import com.infotact.wms.inbound.dto.InboundDocumentResponse;
import com.infotact.wms.inbound.dto.InboundLineResponse;

import java.util.List;

final class InboundMapper {

    private InboundMapper() {
    }

    static InboundLineResponse toLine(InboundDocumentLine line) {
        return new InboundLineResponse(
                line.getId(),
                line.getLineNumber(),
                line.getItem().getId(),
                line.getItem().getSku(),
                line.getItem().getName(),
                line.getExpectedQty(),
                line.getReceivedQty(),
                line.getNotes()
        );
    }

    static InboundDocumentResponse toDetail(InboundDocument d) {
        List<InboundLineResponse> lines = d.getLines().stream().map(InboundMapper::toLine).toList();
        return new InboundDocumentResponse(
                d.getId(),
                d.getDocumentNumber(),
                d.getDocumentType(),
                d.getWarehouse().getId(),
                d.getWarehouse().getCode(),
                d.getStatus(),
                d.getSupplierName(),
                d.getReference(),
                d.getExpectedDeliveryDate(),
                d.getNotes(),
                d.getCreatedAt(),
                d.getUpdatedAt(),
                lines.size(),
                lines
        );
    }

    static InboundDocumentResponse toSummary(InboundDocument d, long lineCount) {
        return new InboundDocumentResponse(
                d.getId(),
                d.getDocumentNumber(),
                d.getDocumentType(),
                d.getWarehouse().getId(),
                d.getWarehouse().getCode(),
                d.getStatus(),
                d.getSupplierName(),
                d.getReference(),
                d.getExpectedDeliveryDate(),
                d.getNotes(),
                d.getCreatedAt(),
                d.getUpdatedAt(),
                lineCount,
                List.of()
        );
    }
}
