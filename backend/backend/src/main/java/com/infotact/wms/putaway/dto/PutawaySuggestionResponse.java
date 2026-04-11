package com.infotact.wms.putaway.dto;

import com.infotact.wms.putaway.PutawayRule;

public record PutawaySuggestionResponse(
        Long warehouseId,
        Long itemId,
        Long fromBinId,
        Long suggestedBinId,
        PutawayRule rule
) {
}
