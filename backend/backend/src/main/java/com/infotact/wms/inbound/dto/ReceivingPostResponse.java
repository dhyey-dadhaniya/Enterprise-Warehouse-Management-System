package com.infotact.wms.inbound.dto;

import com.infotact.wms.inbound.InboundDocumentStatus;

import java.math.BigDecimal;

public record ReceivingPostResponse(
        Long inboundDocumentId,
        Long lineId,
        BigDecimal quantityPostedThisRequest,
        BigDecimal postedQty,
        BigDecimal receivedQty,
        BigDecimal expectedQty,
        boolean receivedVersusExpectedMismatch,
        Long stagingBinId,
        Long inventoryLedgerEntryId,
        InboundDocumentStatus documentStatus,
        boolean replayed
) {
}
