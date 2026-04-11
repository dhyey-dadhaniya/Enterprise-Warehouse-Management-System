package com.infotact.wms.inbound;

public enum InboundDocumentStatus {
    /** Editable header and lines */
    DRAFT,
    /** Confirmed; receiving can start */
    OPEN,
    /** Actively receiving */
    RECEIVING,
    /** Some lines received but not completed */
    PARTIALLY_RECEIVED,
    /** All receiving done for this document */
    COMPLETED,
    /** Cancelled */
    CANCELLED
}
