package com.infotact.wms.putaway;

import com.infotact.wms.putaway.dto.PutawayTaskResponse;

final class PutawayMapper {

    private PutawayMapper() {
    }

    static PutawayTaskResponse toResponse(PutawayTask t) {
        Long lineId = t.getInboundLine() != null ? t.getInboundLine().getId() : null;
        Long assignedId = t.getAssignedUser() != null ? t.getAssignedUser().getId() : null;
        String assignedName = t.getAssignedUser() != null ? t.getAssignedUser().getUsername() : null;
        Long confirmedBinId = t.getConfirmedToBin() != null ? t.getConfirmedToBin().getId() : null;
        String confirmedBinCode = t.getConfirmedToBin() != null ? t.getConfirmedToBin().getCode() : null;
        return new PutawayTaskResponse(
                t.getId(),
                t.getWarehouse().getId(),
                t.getStatus(),
                t.getFromBin().getId(),
                t.getFromBin().getCode(),
                t.getSuggestedToBin().getId(),
                t.getSuggestedToBin().getCode(),
                confirmedBinId,
                confirmedBinCode,
                assignedId,
                assignedName,
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
