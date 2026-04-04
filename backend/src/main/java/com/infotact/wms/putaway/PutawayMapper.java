package com.infotact.wms.putaway;

import com.infotact.wms.putaway.dto.PutawayTaskResponse;

final class PutawayMapper {

    private PutawayMapper() {
    }

    static PutawayTaskResponse toResponse(PutawayTask t) {
        Long lineId = t.getInboundLine() != null ? t.getInboundLine().getId() : null;
        return new PutawayTaskResponse(
                t.getId(),
                t.getWarehouse().getId(),
                t.getStatus(),
                t.getFromBin().getId(),
                t.getFromBin().getCode(),
                t.getSuggestedToBin().getId(),
                t.getSuggestedToBin().getCode(),
                t.getItem().getId(),
                t.getItem().getSku(),
                t.getQuantity(),
                t.getSuggestionRule(),
                lineId,
                t.getCreatedAt(),
                t.getUpdatedAt()
        );
    }
}
