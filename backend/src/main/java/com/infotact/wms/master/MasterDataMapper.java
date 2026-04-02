package com.infotact.wms.master;

import com.infotact.wms.master.dto.BinResponse;
import com.infotact.wms.master.dto.ItemResponse;
import com.infotact.wms.master.dto.WarehouseResponse;
import com.infotact.wms.master.dto.ZoneResponse;

final class MasterDataMapper {

    private MasterDataMapper() {
    }

    static WarehouseResponse toResponse(Warehouse w) {
        return new WarehouseResponse(
                w.getId(),
                w.getCode(),
                w.getName(),
                w.getAddressLine(),
                w.getCreatedAt(),
                w.getUpdatedAt()
        );
    }

    static ZoneResponse toResponse(Zone z) {
        return new ZoneResponse(
                z.getId(),
                z.getWarehouse().getId(),
                z.getCode(),
                z.getName(),
                z.getCreatedAt(),
                z.getUpdatedAt()
        );
    }

    static BinResponse toResponse(Bin b) {
        return new BinResponse(
                b.getId(),
                b.getZone().getId(),
                b.getZone().getWarehouse().getId(),
                b.getCode(),
                b.getDescription(),
                b.isActive(),
                b.getCreatedAt(),
                b.getUpdatedAt()
        );
    }

    static ItemResponse toResponse(Item i) {
        return new ItemResponse(
                i.getId(),
                i.getSku(),
                i.getName(),
                i.getDescription(),
                i.getBaseUom(),
                i.isActive(),
                i.getCreatedAt(),
                i.getUpdatedAt()
        );
    }
}
