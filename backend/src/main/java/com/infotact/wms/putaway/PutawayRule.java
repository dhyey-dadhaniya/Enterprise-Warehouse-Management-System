package com.infotact.wms.putaway;

public enum PutawayRule {
    /** Prefer bin that already holds the same SKU (consolidation). */
    CONSOLIDATE,
    /** Prefer an empty location for this SKU in the warehouse. */
    EMPTY_BIN,
    /** Any other active bin in the warehouse (excluding staging). */
    FALLBACK
}
