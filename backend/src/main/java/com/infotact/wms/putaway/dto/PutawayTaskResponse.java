package com.infotact.wms.putaway.dto;

import com.infotact.wms.putaway.PutawayRule;
import com.infotact.wms.putaway.PutawayTaskStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PutawayTaskResponse(
        Long id,
        Long warehouseId,
        PutawayTaskStatus status,
        Long fromBinId,
        String fromBinCode,
        Long suggestedToBinId,
        String suggestedToBinCode,
        Long confirmedToBinId,
        String confirmedToBinCode,
        Long assignedUserId,
        String assignedUsername,
        Long itemId,
        String sku,
        BigDecimal quantity,
        PutawayRule suggestionRule,
        Long inboundDocumentLineId,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
